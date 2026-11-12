'use strict';
/* Public publishable key only. Authorization is enforced in Supabase RLS. */
(()=>{
  const endpoint='https://fhpbijphwfsejmdklcdt.supabase.co';
  const publicKey='sb_publishable_V3zIK8kZUZ4E4wJ2TnUi8A_2jv-Qty4';
  const sdk=window.supabase;
  const client=sdk?.createClient?.(endpoint,publicKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
  if(!client){window.UnboxedCloud={error:'Supabase library could not load. Check network and reload.'};return}
  const table='unboxed_crm_leads';
  const requireUser=async()=>{
    const {data:{user},error}=await client.auth.getUser();
    if(error||!user)throw new Error('Please sign in again.');
    return user;
  };
  async function load(){
    const user=await requireUser();const result=[];
    for(let from=0;;from+=500){
      const {data,error}=await client.from(table).select('dedup_key,payload').eq('user_id',user.id).neq('dedup_key','__crm_settings__').order('created_at',{ascending:true}).range(from,from+499);
      if(error)throw error;result.push(...(data||[]).map(x=>x.payload).filter(x=>x&&typeof x==='object'));
      if(!data||data.length<500)break;
      if(from>=50000)throw new Error('Too many leads to load in one session.');
    }
    return result;
  }
  async function put(changed){
    if(!changed.length)return;
    const user=await requireUser();
    for(let i=0;i<changed.length;i+=100){
      const slice=changed.slice(i,i+100);
      const rows=slice.map(x=>({
        user_id:user.id,
        dedup_key:String(x.Phone||'').replace(/\D/g,'')+'|'+String(x['Business Name']||'').toLowerCase().replace(/\s+/g,' ').trim(),
        payload:x,updated_at:new Date().toISOString()
      }));
      const {error}=await client.from(table).upsert(rows,{onConflict:'user_id,dedup_key'});
      if(error)throw error;
    }
  }
  async function loadSettings(){
    const user=await requireUser();
    const {data,error}=await client.from(table).select('payload').eq('user_id',user.id).eq('dedup_key','__crm_settings__').maybeSingle();
    if(error)throw error;
    return data?.payload?.messageTemplates||null;
  }
  async function saveSettings(messageTemplates){
    const user=await requireUser();
    const row={user_id:user.id,dedup_key:'__crm_settings__',payload:{__crmSettings:true,messageTemplates,updated_at:new Date().toISOString()},updated_at:new Date().toISOString()};
    const {error}=await client.from(table).upsert(row,{onConflict:'user_id,dedup_key'});
    if(error)throw error;
  }
  async function removeKeys(keys){
    if(!Array.isArray(keys)||!keys.length)return 0;
    const user=await requireUser();
    let removed=0;
    for(let i=0;i<keys.length;i+=80){
      const batch=keys.slice(i,i+80);
      const {data,error}=await client.from(table).delete().eq('user_id',user.id).in('dedup_key',batch).select('dedup_key');
      if(error)throw error;
      removed+=(data||[]).length;
    }
    return removed;
  }
  async function clear(){
    const user=await requireUser();
    const {error}=await client.from(table).delete().eq('user_id',user.id).gte('created_at','2000-01-01T00:00:00Z');
    if(error)throw error;
  }
  window.UnboxedCloud={
    signIn:async(email,password)=>{const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;return data},
    session:async()=>{const {data,error}=await client.auth.getSession();if(error)throw error;return data.session},
    signOut:async()=>{const {error}=await client.auth.signOut();if(error)throw error},
    load,put,loadSettings,saveSettings,clear,removeKeys
  };
})();
