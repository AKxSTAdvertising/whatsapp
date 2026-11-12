'use strict';
/* UnboxedThinking CRM — browser-local MVP. Never auto-sends messages or uploads lead data. */
(()=> {
 const KEY='unboxedthinking.crm.v1';
 const STATUS=['New','Contacted','Replied','Interested','Follow-up','Meeting booked','Won','Not interested'];
 const HEADERS=['Business Name','Niche','Founder','Phone','Email','Address','Website','Rating','Reviews','Website Status','Digital Score','Lead Priority'];
 let leads=[],page=1,activeId=null,toastTimer=null,cloudReady=false,syncQueue=Promise.resolve(),synced=new Map(),syncPending=0,selected=new Set(),bulkBusy=false,activeView='new';
 const $=id=>document.getElementById(id);
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const val=(o,k)=>String(o?.[k]??'').trim();
 const day=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const stamp=()=>new Date().toISOString();
 const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
 function notify(msg){const e=$('toast');e.textContent=msg;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),3700)}
 function snapshot(l){return JSON.stringify(l)}
 function markSynced(){synced=new Map(leads.map(l=>[dedupKey(l),snapshot(l)]))}
 function save(){
   if(!cloudReady){notify('Please sign in to save your leads.');return false}
   const changed=leads.filter(l=>synced.get(dedupKey(l))!==snapshot(l)).map(l=>structuredClone(l));
   if(!changed.length)return true;
   syncPending++;const pill=document.querySelector('.local-pill');if(pill)pill.textContent='● Syncing '+changed.length+' leads…';
   syncQueue=syncQueue.catch(()=>{}).then(async()=>{
     await window.UnboxedCloud.put(changed);
     for(const l of changed)synced.set(dedupKey(l),snapshot(l));
     notify('Cloud sync complete ('+changed.length+' updated).');
   }).catch(err=>{notify('Cloud sync FAILED: '+err.message+' — do not close this tab; export a backup.');console.error('Cloud sync error',err)}).finally(()=>{
     syncPending--;if(pill&&syncPending===0)pill.textContent='● Supabase cloud sync';
   });
   return true;
 }
 function cleanNumber(phone){let d=String(phone||'').replace(/[^\d]/g,'');if(d.length===10)d='91'+d;return d.length>=10&&d.length<=15?d:''}
 function truthyPhone(p){return !!String(p||'').trim()&&!/^(n\/?a|na|none|null|nan|undefined|[-–])$/i.test(String(p).trim())}
 function priorityRank(p){const x=String(p||'').toLowerCase();if(x.includes('high')||x==='hot'||x==='1')return 3;if(x.includes('medium')||x==='warm'||x==='2')return 2;return 1}
 function badge(s,kind){const cl=kind==='priority'?(priorityRank(s)===3?'high':priorityRank(s)===2?'medium':'low'):String(s).toLowerCase().replace(/\s+/g,'-');return '<span class="chip '+safe(cl)+'">'+safe(s||'—')+'</span>'}
 function parseCSV(text){
  text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++}else if(ch==='"')quoted=false;else field+=ch}
   else if(ch==='"')quoted=true;else if(ch===','){row.push(field);field=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);field='';if(row.some(v=>v.trim()))rows.push(row);row=[]}else field+=ch}
  if(quoted)throw new Error('CSV has an unclosed quotation mark.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);return rows
 }
 function normalize(o){const d={};for(const k of HEADERS)d[k]=val(o,k);return {...d,id:String(o.id||uid()),status:STATUS.includes(o.status)?o.status:'New',followup:String(o.followup||''),notes:String(o.notes||''),consent:o.consent===true,updated:String(o.updated||stamp()),firstDraft:String(o.firstDraft||''),followupDraft:String(o.followupDraft||''),sentAt:String(o.sentAt||''),repliedAt:String(o.repliedAt||''),followupSentAt:String(o.followupSentAt||'')}}
 function importCSV(text){const rows=parseCSV(text);if(rows.length<2)throw new Error('CSV does not contain any lead rows.');
  const header=rows.shift().map(h=>h.trim().toLowerCase().replace(/[^a-z0-9]/g,''));
  const idx=header.indexOf('phone');if(idx<0)throw new Error('The CSV needs a Phone column.');
  let added=0,skipped=0,duplicates=0;
  const existing=new Set(leads.map(l=>dedupKey(l)));
  for(const row of rows){const raw={};HEADERS.forEach(k=>{const j=header.indexOf(k.toLowerCase().replace(/[^a-z0-9]/g,''));raw[k]=j>=0?String(row[j]??'').trim():''});
   if(!truthyPhone(raw.Phone)){skipped++;continue}
   const key=dedupKey(raw);if(existing.has(key)){duplicates++;continue}
   const lead=normalize(raw);leads.push(lead);existing.add(key);added++}
  save();page=1;render();notify('Import queued: '+added+' leads. '+duplicates+' duplicates, '+skipped+' missing phones skipped. Keep this tab open until sync finishes.');return added
 }
 function dedupKey(o){return (val(o,'Phone').replace(/\D/g,'')+'|'+val(o,'Business Name').toLowerCase().replace(/\s+/g,' '))}
 async function handleJSON(text){const parsed=JSON.parse(text);const arr=Array.isArray(parsed)?parsed:parsed.leads;if(!Array.isArray(arr))throw new Error('Not a valid lead backup.');
  if(!confirm('Restore '+arr.length+' leads? This will REPLACE your existing cloud CRM leads. Export a full backup first.'))return;
  const restored=arr.filter(o=>o&&typeof o==='object'&&truthyPhone(o.Phone)).map(normalize);
  await syncQueue;await window.UnboxedCloud.clear();await window.UnboxedCloud.put(restored);
  leads=restored;selected.clear();markSynced();page=1;render();notify('Restored '+restored.length+' leads to Supabase.')}
 function csvCell(x){let s=String(x??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
 function download(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 function exportCSV(){if(!leads.length){notify('Import leads first.');return}
  const cols=[...HEADERS,'Status','Follow-up Date','Notes','Contact Permission','First Draft','Followup Draft','Sent At','Replied At','Followup Sent At','Updated'];
  const out=[cols.map(csvCell).join(',')];for(const l of leads){out.push([...HEADERS.map(k=>l[k]),l.status,l.followup,l.notes,l.consent?'Yes':'No',l.firstDraft,l.followupDraft,l.sentAt,l.repliedAt,l.followupSentAt,l.updated].map(csvCell).join(','))}
  download('unboxedthinking-leads-'+day()+'.csv',new Blob(['\uFEFF'+out.join('\r\n')],{type:'text/csv;charset=utf-8'}));notify('CSV exported.')}
 function backup(){if(!leads.length){notify('No leads to back up.');return}download('unboxedthinking-full-backup-'+day()+'.json',new Blob([JSON.stringify({version:1,exportedAt:stamp(),leads},null,2)],{type:'application/json'}));notify('Full backup downloaded.')}
 function filtered(){const q=$('search').value.trim().toLowerCase(),st=$('statusFilter').value,pr=$('priorityFilter').value,web=$('websiteFilter').value,sort=$('sort').value;
  let result=leads.filter(l=>(activeView==='all'||(activeView==='new'?l.status==='New':l.status!=='New'))&&(!q||[l['Business Name'],l.Niche,l.Founder,l.Phone,l.Address,l.Email].some(v=>String(v||'').toLowerCase().includes(q)))&&(!st||l.status===st)&&(!pr||l['Lead Priority']===pr)&&(!web||l['Website Status']===web));
  result.sort((a,b)=>sort==='name'?val(a,'Business Name').localeCompare(val(b,'Business Name')):sort==='recent'?val(b,'updated').localeCompare(val(a,'updated')):sort==='followup'?(a.followup||'9999').localeCompare(b.followup||'9999'):priorityRank(b['Lead Priority'])-priorityRank(a['Lead Priority']));
  return result
 }
 function options(select,values,label){const keep=select.value;select.innerHTML='<option value="">All '+safe(label)+'</option>'+[...new Set(values.filter(Boolean))].sort().map(v=>'<option value="'+safe(v)+'">'+safe(v)+'</option>').join('');select.value=keep}
 function render(){let today=day(),contacted=leads.filter(x=>x.status!=='New').length,interested=leads.filter(x=>['Interested','Meeting booked','Won'].includes(x.status)).length,due=leads.filter(x=>x.followup&&x.followup<=today&&!['Won','Not interested'].includes(x.status));
  $('statTotal').textContent=leads.length.toLocaleString('en-IN');$('statContacted').textContent=contacted.toLocaleString('en-IN');$('statInterested').textContent=interested.toLocaleString('en-IN');$('statDue').textContent=due.length.toLocaleString('en-IN');$('leadCount').textContent=leads.length.toLocaleString('en-IN');
  $('contactedNavCount').textContent=contacted.toLocaleString('en-IN');
  $('directoryHeading').textContent={new:'New leads',contacted:'Contacted leads',all:'All leads'}[activeView];
  $('directoryHint').textContent={new:'Write your first message; after sending, click Mark as Sent.',contacted:'Use a separate second message and manually record replies.',all:'Your entire pipeline.'}[activeView];
  options($('priorityFilter'),leads.map(l=>l['Lead Priority']),'priorities');options($('websiteFilter'),leads.map(l=>l['Website Status']),'website statuses');
  const list=filtered(),per=15,pages=Math.max(1,Math.ceil(list.length/per));page=Math.min(page,pages);const slice=list.slice((page-1)*per,page*per);
  $('leadRows').innerHTML=slice.map(l=>'<tr><td><input class="lead-select" type="checkbox" data-select="'+safe(l.id)+'" aria-label="Select '+safe(l['Business Name']||'lead')+'" '+(selected.has(l.id)?'checked':'')+'></td><td><strong>'+safe(l['Business Name']||'Unnamed business')+'</strong><small>'+safe(l.Niche||'Uncategorised')+'</small></td><td>'+safe(l.Phone)+'</td><td>'+badge(l['Lead Priority'],'priority')+'</td><td>'+safe(l['Website Status']||'Unknown')+'</td><td>'+badge(l.status,'status')+'</td><td>'+safe(l.followup||'—')+'</td><td><div class="row-actions"><button class="mini-btn mini-wa" data-whatsapp="'+safe(l.id)+'">WhatsApp ↗</button><button class="mini-btn" data-open="'+safe(l.id)+'">Manage</button></div></td></tr>').join('');
  updateSelectionControls(list,slice);
  $('emptyState').hidden=list.length!==0;$('emptyMessage').textContent=leads.length?'No matching leads. Change the filters to see more.':'Import your cleaned CSV to start your outreach workspace.';$('importEmpty').hidden=leads.length>0;
  $('pageSummary').textContent=list.length?((page-1)*per+1)+'–'+Math.min(page*per,list.length)+' of '+list.length+' leads':'0 leads';$('pageNumber').textContent=page+' / '+pages;$('prevPage').disabled=page===1;$('nextPage').disabled=page===pages;
  due.sort((a,b)=>a.followup.localeCompare(b.followup));$('dueList').innerHTML=due.length?due.slice(0,5).map(l=>'<div class="due-item"><div><strong>'+safe(l['Business Name']||'Business')+'</strong><small>'+safe(l.followup)+' · '+safe(l.Niche||'Follow-up')+'</small></div><button class="mini-btn" data-open="'+safe(l.id)+'">Open →</button></div>').join(''):'<p class="due-none">No follow-ups due. Set a follow-up date on a lead to see it here.</p>';
 }
 function updateSelectionControls(list,visible){
   const matching=new Set(list.map(x=>x.id));
   const selectedMatching=list.filter(x=>selected.has(x.id)).length;
   $('selectedCount').textContent=selected.size+' selected'+(selectedMatching!==selected.size?' ('+selectedMatching+' match filters)':'');
   $('bulkDeleteBtn').disabled=!cloudReady||bulkBusy||selected.size===0;
   const pageCount=visible.filter(x=>selected.has(x.id)).length;
   $('selectPage').checked=visible.length>0&&pageCount===visible.length;
   $('selectPage').indeterminate=pageCount>0&&pageCount<visible.length;
   $('selectPage').disabled=visible.length===0||bulkBusy;
   $('selectAllMatching').checked=list.length>0&&selectedMatching===list.length;
   $('selectAllMatching').indeterminate=selectedMatching>0&&selectedMatching<list.length;
   $('selectAllMatching').disabled=list.length===0||bulkBusy;
 }
 function openSingle(){
   if(!cloudReady){notify('Sign in before adding leads.');return}
   $('singleForm').reset();$('singleError').textContent='';$('singleBackdrop').hidden=false;document.body.style.overflow='hidden';$('singleName').focus();
 }
 function closeSingle(){
   $('singleBackdrop').hidden=true;document.body.style.overflow='';
 }
 async function saveSingle(evt){
   evt.preventDefault();if(!cloudReady)return;
   const name=$('singleName').value.trim(),phone=$('singlePhone').value.trim();
   if(!name){$('singleError').textContent='Business name is required.';return}
   if(!cleanNumber(phone)){$('singleError').textContent='Enter a valid 10-digit Indian or international phone number.';return}
   const o=normalize({'Business Name':name,Phone:phone,Niche:$('singleNiche').value.trim(),'Lead Priority':$('singlePriority').value,'Website Status':$('singleWebsiteStatus').value,Website:$('singleWebsite').value.trim()});
   o.notes=$('singleNotes').value.trim();
   if(leads.some(l=>dedupKey(l)===dedupKey(o))){$('singleError').textContent='This business and phone number already exist.';return}
   const btn=$('singleSave');btn.disabled=true;btn.textContent='Saving…';$('singleError').textContent='';
   try{
     await syncQueue;
     await window.UnboxedCloud.put([o]);
     leads.push(o);synced.set(dedupKey(o),snapshot(o));page=1;render();
     closeSingle();notify('Lead added and saved to Supabase.');openLead(o.id);
   }catch(e){$('singleError').textContent='Could not save lead: '+e.message}
   finally{btn.disabled=false;btn.textContent='Save lead to Supabase'}
 }
 async function bulkDelete(){
   if(bulkBusy||!cloudReady||selected.size===0)return;
   const targets=leads.filter(l=>selected.has(l.id));
   if(!targets.length){selected.clear();render();return}
   const count=targets.length;
   if(!confirm('Permanently delete '+count+' selected lead'+(count===1?'':'s')+' from your Supabase account? This cannot be undone. Export a backup first.'))return;
   bulkBusy=true;render();
   try{
     await syncQueue;
     const keys=targets.map(dedupKey);
     const deleted=await window.UnboxedCloud.removeKeys(keys);
     // Reload the authoritative cloud state to handle partial deletes or cross-device edits safely.
     const refreshed=await window.UnboxedCloud.load();
     leads=refreshed.map(normalize);markSynced();
     selected.clear();page=1;render();
     notify('Deleted '+deleted+' lead'+(deleted===1?'':'s')+' from Supabase.');
   }catch(e){
     try{leads=(await window.UnboxedCloud.load()).map(normalize);markSynced();selected.clear()}catch(_){}
     notify('Bulk delete incomplete: '+e.message+'. Refresh before retrying.');
   }finally{bulkBusy=false;render()}
 }
 function guessPitch(l){const name=l['Business Name']||'your business',niche=(l.Niche||'business').toLowerCase(),noWebsite=/no|missing|not|none/i.test(l['Website Status']||'');
  return 'Hi, I came across '+name+' and liked what you are doing in '+niche+'. I am reaching out from UnboxedThinking. '+(noWebsite?'We help growing businesses build clean, mobile-friendly websites that turn visitors into enquiries.':'We help businesses improve their website experience and digital presence to generate more enquiries.')+' Would you be open to a quick conversation? If not, no worries — I will not follow up.'}
 function websiteLink(raw){try{let x=String(raw||'').trim();if(!x)return '';if(!/^https?:\/\//i.test(x))x='https://'+x;const u=new URL(x);return ['https:','http:'].includes(u.protocol)?u.href:''}catch(e){return ''}}

 function followupSuggestion(l){return 'Hi, I wanted to follow up on my earlier message about '+(l['Business Name']||'your business')+'. Would you be open to a short conversation? No worries if not.'}
 function isNew(l){return l.status==='New'}
 function currentDraft(l){return isNew(l)?l.firstDraft:l.followupDraft}
 function openLead(id){
  const l=leads.find(x=>x.id===id);if(!l)return;activeId=l.id;
  $('detailTitle').textContent=l['Business Name']||'Business';
  const link=websiteLink(l.Website);
  $('detailContent').innerHTML='<div class="detail-meta">'+
   '<div><span>Phone</span><strong>'+safe(l.Phone)+'</strong></div><div><span>Niche</span><strong>'+safe(l.Niche||'—')+'</strong></div>'+
   '<div><span>Website</span><strong>'+(link?'<a href="'+safe(link)+'" target="_blank" rel="noopener noreferrer">View website ↗</a>':safe(l['Website Status']||'—'))+'</strong></div>'+
   '<div><span>Priority</span><strong>'+safe(l['Lead Priority']||'—')+'</strong></div>'+
   '<div><span>First sent</span><strong>'+safe(l.sentAt?new Date(l.sentAt).toLocaleString():'Not marked')+'</strong></div>'+
   '<div><span>Reply received</span><strong>'+safe(l.repliedAt?new Date(l.repliedAt).toLocaleString():'Not marked')+'</strong></div></div>'+
   '<div class="detail-fields"><div class="field"><label for="detailStatus">Lead status</label><select id="detailStatus">'+STATUS.map(st=>'<option '+(l.status===st?'selected':'')+'>'+safe(st)+'</option>').join('')+'</select></div>'+
   '<div class="field"><label for="detailDate">Next follow-up</label><input type="date" id="detailDate" value="'+safe(l.followup)+'"></div>'+
   '<div class="field wide"><label for="detailNotes">Notes</label><textarea id="detailNotes" maxlength="10000" placeholder="Conversation notes...">'+safe(l.notes)+'</textarea></div>'+
   '<div class="field wide"><label class="consent"><input type="checkbox" id="detailConsent" '+(l.consent?'checked':'')+'><span>I confirm this business has permitted WhatsApp outreach; I will respect opt-outs.</span></label></div></div>'+
   '<div class="message-box"><p>1 · YOUR FIRST MESSAGE</p><textarea id="detailPitch" maxlength="3000" placeholder="Write your own first message...">'+safe(l.firstDraft)+'</textarea><div class="draft-actions"><button class="btn btn-outline btn-small" id="suggestFirst">Use suggested intro</button><span>Fully editable · saved in Supabase</span></div></div>'+
   '<div class="message-box"><p>2 · SECOND / FOLLOW-UP MESSAGE</p><textarea id="detailFollowupPitch" maxlength="3000" placeholder="Write a different message for later...">'+safe(l.followupDraft)+'</textarea><div class="draft-actions"><button class="btn btn-outline btn-small" id="suggestSecond">Use suggested follow-up</button><span>Saved separately from first message</span></div></div>'+
   '<p class="workflow-hint">'+(isNew(l)?'After you press Send in WhatsApp, click <b>Mark as Sent</b> to move this business to <b>Contacted Leads</b>.':'This lead is in <b>Contacted Leads</b>. The WhatsApp button uses the second message.')+'</p>'+
   '<div class="modal-actions"><button class="btn btn-primary" id="saveLead">Save changes</button><button class="btn btn-outline" id="copyPitch">Copy active message</button><button class="btn btn-whatsapp" id="waLead">WhatsApp App ↗</button><button class="btn btn-outline" id="callLead">Call</button></div>'+
   '<div class="whatsapp-fallback"><a id="waWebFallback" href="#" target="_blank" rel="noopener noreferrer" hidden>App unavailable? Open WhatsApp Web directly ↗</a></div>'+
   '<div class="modal-actions workflow-actions"><button class="btn btn-outline" id="markSent" '+(!isNew(l)?'disabled':'')+'>✓ Mark as Sent</button><button class="btn btn-outline" id="markReplied" '+(isNew(l)?'disabled':'')+'>✓ Mark as Replied</button><button class="btn btn-outline" id="markFollowup" '+(isNew(l)?'disabled':'')+'>◷ Follow-up Sent</button></div>';
  $('detailBackdrop').hidden=false;document.body.style.overflow='hidden';$('closeDetail').focus()
 }
 function closeLead(){activeId=null;$('detailBackdrop').hidden=true;document.body.style.overflow=''}
 function persistModal(){
  const l=leads.find(x=>x.id===activeId);if(!l)return null;
  l.status=$('detailStatus').value;l.followup=$('detailDate').value;l.notes=$('detailNotes').value;
  l.consent=$('detailConsent').checked;l.firstDraft=$('detailPitch').value;l.followupDraft=$('detailFollowupPitch').value;
  l.updated=stamp();save();render();return l
 }
 function activeMessage(l){return (isNew(l)?$('detailPitch').value:$('detailFollowupPitch').value).trim()}
 function directWhatsApp(l,message){
  const phone=cleanNumber(l.Phone);if(!phone){notify('Please enter a valid phone number.');return}
  if(!l.consent){openLead(l.id);notify('Please confirm WhatsApp contact permission in Manage first.');return}
  const suffix=message?'&text='+encodeURIComponent(message):'';
  const nativeUrl='whatsapp://send?phone='+phone+suffix;
  const webUrl='https://web.whatsapp.com/send?phone='+phone+suffix;
  const fallback=$('waWebFallback');if(fallback){fallback.href=webUrl;fallback.hidden=false}
  // Opens installed app directly, subject to browser/OS protocol approval.
  window.location.href=nativeUrl;
  notify('Opening WhatsApp app. If unavailable, use the direct Web link in Manage.')
 }
 function openWhatsApp(){const l=persistModal();if(l)directWhatsApp(l,activeMessage(l))}
 function quickWhatsApp(id){const l=leads.find(x=>x.id===id);if(l)directWhatsApp(l,currentDraft(l)||'')}
 function callLead(){const l=persistModal();if(!l)return;const d=String(l.Phone).replace(/[^\d+]/g,'');if(!d){notify('Phone number missing.');return}window.location.href='tel:'+encodeURIComponent(d)}
 function markAction(kind){
  const l=persistModal();if(!l)return;
  if(kind==='sent'){l.status='Contacted';l.sentAt=l.sentAt||stamp()}
  if(kind==='replied'){l.status='Replied';l.repliedAt=stamp()}
  if(kind==='followup'){l.status='Follow-up';l.followupSentAt=stamp()}
  l.updated=stamp();save();render();closeLead();
  if(kind==='sent'){activeView='contacted';updateNavigation();location.hash='leads'}
  notify(kind==='sent'?'Moved to Contacted Leads.':kind==='replied'?'Reply recorded manually.':'Follow-up recorded manually.')
 }
 function updateNavigation(){
  document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active',a.dataset.nav===activeView));
  selected.clear();page=1;render()
 }
 function bind(){for(const id of ['importTop','importEmpty','importSettings'])$(id).addEventListener('click',()=>$('fileInput').click());
  $('fileInput').addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;if(f.size>10*1024*1024){notify('File is too large (limit: 10 MB).');return}try{const t=await f.text();if(f.name.toLowerCase().endsWith('.json'))await handleJSON(t);else importCSV(t)}catch(err){notify('Import failed: '+err.message)}});
  $('addSingleTop').addEventListener('click',openSingle);
  $('closeSingle').addEventListener('click',closeSingle);
  $('singleCancel').addEventListener('click',closeSingle);
  $('singleBackdrop').addEventListener('click',e=>{if(e.target===$('singleBackdrop'))closeSingle()});
  $('singleForm').addEventListener('submit',saveSingle);
  $('bulkDeleteBtn').addEventListener('click',bulkDelete);
  $('selectPage').addEventListener('change',e=>{const list=filtered().slice((page-1)*15,page*15);for(const l of list){if(e.target.checked)selected.add(l.id);else selected.delete(l.id)}render()});
  $('selectAllMatching').addEventListener('change',e=>{for(const l of filtered()){if(e.target.checked)selected.add(l.id);else selected.delete(l.id)}render()});
  $('leadRows').addEventListener('change',e=>{if(!e.target.matches('[data-select]'))return;if(e.target.checked)selected.add(e.target.dataset.select);else selected.delete(e.target.dataset.select);render()});
  $('exportBtn').addEventListener('click',exportCSV);$('backupBtn').addEventListener('click',backup);
  $('restoreInfo').addEventListener('click',()=>notify('Full backup saves status, notes and permissions. Import that JSON to restore them. CSV export is for spreadsheet use.'));
  $('clearBtn').addEventListener('click',async()=>{if(confirm('Permanently delete all CRM leads from your Supabase account? Export a backup first. This cannot be undone.')){try{await syncQueue;await window.UnboxedCloud.clear();leads=[];selected.clear();markSynced();page=1;render();notify('Cloud CRM leads deleted.')}catch(e){notify('Could not delete leads: '+e.message)}}});
  for(const id of ['search','statusFilter','priorityFilter','websiteFilter','sort'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=1;render()});
  $('prevPage').addEventListener('click',()=>{page--;render()});$('nextPage').addEventListener('click',()=>{page++;render()});
  document.addEventListener('click',e=>{const target=e.target.closest('[data-open]');if(target)openLead(target.dataset.open);const wa=e.target.closest('[data-whatsapp]');if(wa)quickWhatsApp(wa.dataset.whatsapp)});
  $('closeDetail').addEventListener('click',closeLead);$('detailBackdrop').addEventListener('click',e=>{if(e.target===$('detailBackdrop'))closeLead()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('singleBackdrop').hidden)closeSingle();else if(!$('detailBackdrop').hidden)closeLead()}});
  $('detailContent').addEventListener('click',async e=>{const id=e.target.id;if(id==='saveLead'){persistModal();notify('Changes queued for Supabase sync.')}if(id==='copyPitch'){const l=leads.find(x=>x.id===activeId);try{await navigator.clipboard.writeText(activeMessage(l));notify('Active message copied.')}catch(err){$(isNew(l)?'detailPitch':'detailFollowupPitch').select();notify('Select and copy your message.')}}if(id==='waLead')openWhatsApp();if(id==='callLead')callLead();if(id==='markSent')markAction('sent');if(id==='markReplied')markAction('replied');if(id==='markFollowup')markAction('followup');if(id==='suggestFirst')$('detailPitch').value=guessPitch(leads.find(x=>x.id===activeId));if(id==='suggestSecond')$('detailFollowupPitch').value=followupSuggestion(leads.find(x=>x.id===activeId))});
  $('openFirst').addEventListener('click',()=>{const l=filtered()[0];if(l)openLead(l.id);else notify('Import leads first.')});
  $('mobileMenu').addEventListener('click',()=>$('mobileMenu').closest('.app-shell').querySelector('.sidebar').classList.toggle('is-open'));
  document.querySelectorAll('.nav-link').forEach(a=>a.addEventListener('click',()=>{const nav=a.dataset.nav;if(['new','contacted','all'].includes(nav)){activeView=nav;updateNavigation()}else{document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));a.classList.add('active')}document.querySelector('.sidebar').classList.remove('is-open')}));
 }
  async function enterCloud(){
  if(!window.UnboxedCloud||window.UnboxedCloud.error){$('loginError').textContent=window.UnboxedCloud?.error||'Could not load Supabase library.';return}
  $('loginError').textContent='Loading private leads…';
  try{
    const data=await window.UnboxedCloud.load();
    leads=data.map(normalize);
    selected.clear();cloudReady=true;markSynced();page=1;render();
    document.body.classList.remove('auth-locked');$('authGate').hidden=true;
    $('loginError').textContent='';
    const previous=JSON.parse(localStorage.getItem(KEY)||'[]');
    if(Array.isArray(previous)&&previous.length&&confirm('Found '+previous.length+' leads from your earlier browser-only version. Merge these into your private Supabase account?')){
      const existing=new Set(leads.map(dedupKey));let total=0;
      for(const old of previous){if(!old||!truthyPhone(old.Phone))continue;const normalized=normalize(old);const key=dedupKey(normalized);if(!existing.has(key)){leads.push(normalized);existing.add(key);total++}}
      if(total){save();render();notify(total+' old browser leads queued for cloud sync.')}else notify('Existing browser leads already present in cloud.');
      // Keep the original browser copy until you export a backup and verify cloud sync.
    }
  }catch(e){cloudReady=false;document.body.classList.add('auth-locked');$('authGate').hidden=false;$('loginError').textContent='Unable to load private leads: '+e.message;}
 }
 async function bootstrap(){
  bind();updateNavigation();render();
  $('loginForm').addEventListener('submit',async e=>{
   e.preventDefault();const b=$('loginButton');b.disabled=true;b.textContent='Signing in…';$('loginError').textContent='';
   try{await window.UnboxedCloud.signIn($('loginEmail').value.trim(),$('loginPassword').value);$('loginPassword').value='';await enterCloud()}
   catch(err){$('loginError').textContent=err.message||'Sign-in failed';}finally{b.disabled=false;b.textContent='Sign in securely →'}
  });
  $('logoutBtn').addEventListener('click',async()=>{
   if(syncPending>0){notify('Finish syncing your leads before signing out.');return}
   try{await window.UnboxedCloud.signOut();leads=[];selected.clear();synced.clear();cloudReady=false;render();document.body.classList.add('auth-locked');$('authGate').hidden=false;notify('Signed out.')}catch(e){notify('Sign out failed: '+e.message)}
  });
  if(!window.UnboxedCloud||window.UnboxedCloud.error){$('loginError').textContent=window.UnboxedCloud?.error||'Supabase unavailable.';return}
  try{const sess=await window.UnboxedCloud.session();if(sess?.user)await enterCloud()}catch(e){$('loginError').textContent='Session error: '+e.message}
 }
 bootstrap();
})();
