'use strict';
/* Supabase client loader with a CDN fallback. Public publishable key only; RLS protects user data. */
(()=>{
 const endpoint='https://fhpbijphwfsejmdklcdt.supabase.co';
 const publicKey='sb_publishable_V3zIK8kZUZ4E4wJ2TnUi8A_2jv-Qty4';
 const table='unboxed_crm_leads';
 let client=null;
 const loadScript=url=>new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=url;script.async=true;
  script.onload=()=>resolve();script.onerror=()=>{script.remove();reject(new Error('Could not load '+url));};
  document.head.appendChild(script);
 });
 const clientReady=(async()=>{
  let sdk=window.supabase;
  if(!sdk||typeof sdk.createClient!=='function'){
   const cdns=['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/dist/umd/supabase.js','https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'];
   let lastError;
   for(const url of cdns){try{await loadScript(url);sdk=window.supabase;if(sdk&&typeof sdk.createClient==='function')break;}catch(e){lastError=e;}}
   if(!sdk||typeof sdk.createClient!=='function')throw new Error('Supabase SDK unavailable. CDN loading failed: '+(lastError?.message||'SDK global missing'));
  }
  client=sdk.createClient(endpoint,publicKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
  return client;
 })();
 const getClient=async()=>{await clientReady;return client};
 const requireUser=async()=>{
  const c=await getClient();
  const {data:{user},error}=await c.auth.getUser();
  if(error||!user)throw new Error('Please sign in again.');
  return user;
 };
 async function load(){
  const user=await requireUser(),c=await getClient(),result=[];
  for(let from=0;;from+=500){
   const {data,error}=await c.from(table).select('dedup_key,payload').eq('user_id',user.id).neq('dedup_key','__crm_settings__').order('created_at',{ascending:true}).range(from,from+499);
   if(error)throw error;result.push(...(data||[]).map(x=>x.payload).filter(x=>x&&typeof x==='object'));
   if(!data||data.length<500)break;
   if(from>=50000)throw new Error('Too many leads to load in one session.');
  }
  return result;
 }
 async function put(changed){
  if(!changed.length)return;
  const user=await requireUser(),c=await getClient();
  for(let i=0;i<changed.length;i+=100){
   const slice=changed.slice(i,i+100);
   const rows=slice.map(x=>({user_id:user.id,dedup_key:String(x.Phone||'').replace(/\D/g,'')+'|'+String(x['Business Name']||'').toLowerCase().replace(/\s+/g,' ').trim(),payload:x,updated_at:new Date().toISOString()}));
   const {error}=await c.from(table).upsert(rows,{onConflict:'user_id,dedup_key'});
   if(error)throw error;
  }
 }
 async function loadSettings(){
  const user=await requireUser(),c=await getClient();
  const {data,error}=await c.from(table).select('payload').eq('user_id',user.id).eq('dedup_key','__crm_settings__').maybeSingle();
  if(error)throw error;return data?.payload?.messageTemplates||null;
 }
 async function saveSettings(messageTemplates){
  const user=await requireUser(),c=await getClient(),now=new Date().toISOString();
  const row={user_id:user.id,dedup_key:'__crm_settings__',payload:{__crmSettings:true,messageTemplates,updated_at:now},updated_at:now};
  const {error}=await c.from(table).upsert(row,{onConflict:'user_id,dedup_key'});
  if(error)throw error;
 }
 const payloadKey=x=>String(x?.Phone||'').replace(/\D/g,'')+'|'+String(x?.['Business Name']||'').toLowerCase().replace(/\s+/g,' ').trim();
 async function removeKeys(keys){
  if(!Array.isArray(keys)||!keys.length)return 0;
  const user=await requireUser(),c=await getClient(),wanted=new Set(keys.map(String)),storedKeys=[];
  for(let from=0;;from+=500){
   const {data,error}=await c.from(table).select('dedup_key,payload').eq('user_id',user.id).neq('dedup_key','__crm_settings__').order('created_at',{ascending:true}).range(from,from+499);
   if(error)throw error;
   for(const row of data||[]){
    const p=payloadKey(row.payload);
    if(wanted.has(String(row.dedup_key))||wanted.has(p))storedKeys.push(String(row.dedup_key));
   }
   if(!data||data.length<500)break;
   if(from>=50000)throw new Error('Too many leads to process in one delete operation.');
  }
  const unique=[...new Set(storedKeys)];
  for(let i=0;i<unique.length;i+=80){
   const {error}=await c.from(table).delete().eq('user_id',user.id).in('dedup_key',unique.slice(i,i+80));
   if(error)throw error;
  }
  const remaining=await load();
  const stillThere=remaining.filter(x=>wanted.has(payloadKey(x))).length;
  if(stillThere)throw new Error(stillThere+' selected leads are still in Supabase. Check DELETE permissions/RLS policy.');
  return unique.length;
 }
 async function clear(){
  const user=await requireUser(),c=await getClient(),keys=[];
  for(let from=0;;from+=500){
   const {data,error}=await c.from(table).select('dedup_key').eq('user_id',user.id).neq('dedup_key','__crm_settings__').order('created_at',{ascending:true}).range(from,from+499);
   if(error)throw error;
   keys.push(...(data||[]).map(x=>String(x.dedup_key)));
   if(!data||data.length<500)break;
   if(from>=50000)throw new Error('Too many leads to clear in one operation.');
  }
  for(let i=0;i<keys.length;i+=80){
   const {error}=await c.from(table).delete().eq('user_id',user.id).in('dedup_key',keys.slice(i,i+80));
   if(error)throw error;
  }
  const remaining=await load();
  if(remaining.length)throw new Error(remaining.length+' leads remain. Check Supabase DELETE policy for this user.');
  return keys.length;
 }
 window.UnboxedCloud={
  ready:()=>clientReady,
  signIn:async(email,password)=>{const c=await getClient();const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;return data},
  session:async()=>{const c=await getClient();const {data,error}=await c.auth.getSession();if(error)throw error;return data.session},
  signOut:async()=>{const c=await getClient();const {error}=await c.auth.signOut();if(error)throw error},
  load,put,loadSettings,saveSettings,clear,removeKeys
 };
 clientReady.catch(error=>{window.UnboxedCloud.error=error.message;console.error('Supabase initialization failed:',error)});
})();