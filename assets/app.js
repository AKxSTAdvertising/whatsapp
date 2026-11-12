'use strict';
/* UnboxedThinking CRM — browser-local MVP. Never auto-sends messages or uploads lead data. */
(()=> {
 const KEY='unboxedthinking.crm.v1';
 const STATUS=['New','Contacted','Interested','Follow-up','Meeting booked','Won','Not interested'];
 const HEADERS=['Business Name','Niche','Founder','Phone','Email','Address','Website','Rating','Reviews','Website Status','Digital Score','Lead Priority'];
 let leads=[],page=1,activeId=null,toastTimer=null;
 const $=id=>document.getElementById(id);
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const val=(o,k)=>String(o?.[k]??'').trim();
 const day=()=>new Date().toLocaleDateString('en-CA');
 const stamp=()=>new Date().toISOString();
 const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
 function notify(msg){const e=$('toast');e.textContent=msg;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),3700)}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(leads));return true}catch(err){notify('Storage full or disabled. Export a backup, then use a supported browser.');return false}}
 function load(){try{let parsed=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(parsed))leads=parsed.filter(x=>x&&typeof x==='object'&&x.id).slice(0,50000)}catch(e){notify('Could not read saved data. No changes made.')}}
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
 function normalize(o){const d={};for(const k of HEADERS)d[k]=val(o,k);return {...d,id:String(o.id||uid()),status:STATUS.includes(o.status)?o.status:'New',followup:String(o.followup||''),notes:String(o.notes||''),consent:o.consent===true,updated:String(o.updated||stamp())}}
 function importCSV(text){const rows=parseCSV(text);if(rows.length<2)throw new Error('CSV does not contain any lead rows.');
  const header=rows.shift().map(h=>h.trim().toLowerCase().replace(/[^a-z0-9]/g,''));
  const idx=header.indexOf('phone');if(idx<0)throw new Error('The CSV needs a Phone column.');
  let added=0,skipped=0,duplicates=0;
  const existing=new Set(leads.map(l=>dedupKey(l)));
  for(const row of rows){const raw={};HEADERS.forEach(k=>{const j=header.indexOf(k.toLowerCase().replace(/[^a-z0-9]/g,''));raw[k]=j>=0?String(row[j]??'').trim():''});
   if(!truthyPhone(raw.Phone)){skipped++;continue}
   const key=dedupKey(raw);if(existing.has(key)){duplicates++;continue}
   const lead=normalize(raw);leads.push(lead);existing.add(key);added++}
  save();page=1;render();notify('Imported '+added+' leads. '+duplicates+' duplicates, '+skipped+' missing phones skipped.');return added
 }
 function dedupKey(o){return (val(o,'Phone').replace(/\D/g,'')+'|'+val(o,'Business Name').toLowerCase().replace(/\s+/g,' '))}
 function handleJSON(text){const parsed=JSON.parse(text);const arr=Array.isArray(parsed)?parsed:parsed.leads;if(!Array.isArray(arr))throw new Error('Not a valid lead backup.');
  if(!confirm('Restore '+arr.length+' leads? This will replace your current browser data. Export a backup first.'))return;
  const restored=arr.filter(o=>o&&typeof o==='object'&&truthyPhone(o.Phone)).map(normalize);
  const old=leads;leads=restored;if(!save()){leads=old;return}page=1;render();notify('Restored '+restored.length+' leads.')}
 function csvCell(x){let s=String(x??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
 function download(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 function exportCSV(){if(!leads.length){notify('Import leads first.');return}
  const cols=[...HEADERS,'Status','Follow-up Date','Notes','Contact Permission','Updated'];
  const out=[cols.map(csvCell).join(',')];for(const l of leads){out.push([...HEADERS.map(k=>l[k]),l.status,l.followup,l.notes,l.consent?'Yes':'No',l.updated].map(csvCell).join(','))}
  download('unboxedthinking-leads-'+day()+'.csv',new Blob(['\uFEFF'+out.join('\r\n')],{type:'text/csv;charset=utf-8'}));notify('CSV exported.')}
 function backup(){if(!leads.length){notify('No leads to back up.');return}download('unboxedthinking-full-backup-'+day()+'.json',new Blob([JSON.stringify({version:1,exportedAt:stamp(),leads},null,2)],{type:'application/json'}));notify('Full backup downloaded.')}
 function filtered(){const q=$('search').value.trim().toLowerCase(),st=$('statusFilter').value,pr=$('priorityFilter').value,web=$('websiteFilter').value,sort=$('sort').value;
  let result=leads.filter(l=>(!q||[l['Business Name'],l.Niche,l.Founder,l.Phone,l.Address,l.Email].some(v=>String(v||'').toLowerCase().includes(q)))&&(!st||l.status===st)&&(!pr||l['Lead Priority']===pr)&&(!web||l['Website Status']===web));
  result.sort((a,b)=>sort==='name'?val(a,'Business Name').localeCompare(val(b,'Business Name')):sort==='recent'?val(b,'updated').localeCompare(val(a,'updated')):sort==='followup'?(a.followup||'9999').localeCompare(b.followup||'9999'):priorityRank(b['Lead Priority'])-priorityRank(a['Lead Priority']));
  return result
 }
 function options(select,values,label){const keep=select.value;select.innerHTML='<option value="">All '+safe(label)+'</option>'+[...new Set(values.filter(Boolean))].sort().map(v=>'<option value="'+safe(v)+'">'+safe(v)+'</option>').join('');select.value=keep}
 function render(){let today=day(),contacted=leads.filter(x=>x.status!=='New'&&x.status!=='Not interested').length,interested=leads.filter(x=>['Interested','Meeting booked','Won'].includes(x.status)).length,due=leads.filter(x=>x.followup&&x.followup<=today&&!['Won','Not interested'].includes(x.status));
  $('statTotal').textContent=leads.length.toLocaleString('en-IN');$('statContacted').textContent=contacted.toLocaleString('en-IN');$('statInterested').textContent=interested.toLocaleString('en-IN');$('statDue').textContent=due.length.toLocaleString('en-IN');$('leadCount').textContent=leads.length.toLocaleString('en-IN');
  options($('priorityFilter'),leads.map(l=>l['Lead Priority']),'priorities');options($('websiteFilter'),leads.map(l=>l['Website Status']),'website statuses');
  const list=filtered(),per=15,pages=Math.max(1,Math.ceil(list.length/per));page=Math.min(page,pages);const slice=list.slice((page-1)*per,page*per);
  $('leadRows').innerHTML=slice.map(l=>'<tr><td><strong>'+safe(l['Business Name']||'Unnamed business')+'</strong><small>'+safe(l.Niche||'Uncategorised')+'</small></td><td>'+safe(l.Phone)+'</td><td>'+badge(l['Lead Priority'],'priority')+'</td><td>'+safe(l['Website Status']||'Unknown')+'</td><td>'+badge(l.status,'status')+'</td><td>'+safe(l.followup||'—')+'</td><td><div class="row-actions"><button class="mini-btn" data-open="'+safe(l.id)+'">View / outreach</button></div></td></tr>').join('');
  $('emptyState').hidden=list.length!==0;$('emptyMessage').textContent=leads.length?'No matching leads. Change the filters to see more.':'Import your cleaned CSV to start your outreach workspace.';$('importEmpty').hidden=leads.length>0;
  $('pageSummary').textContent=list.length?((page-1)*per+1)+'–'+Math.min(page*per,list.length)+' of '+list.length+' leads':'0 leads';$('pageNumber').textContent=page+' / '+pages;$('prevPage').disabled=page===1;$('nextPage').disabled=page===pages;
  due.sort((a,b)=>a.followup.localeCompare(b.followup));$('dueList').innerHTML=due.length?due.slice(0,5).map(l=>'<div class="due-item"><div><strong>'+safe(l['Business Name']||'Business')+'</strong><small>'+safe(l.followup)+' · '+safe(l.Niche||'Follow-up')+'</small></div><button class="mini-btn" data-open="'+safe(l.id)+'">Open →</button></div>').join(''):'<p class="due-none">No follow-ups due. Set a follow-up date on a lead to see it here.</p>';
 }
 function guessPitch(l){const name=l['Business Name']||'your business',niche=(l.Niche||'business').toLowerCase(),noWebsite=/no|missing|not|none/i.test(l['Website Status']||'');
  return 'Hi, I came across '+name+' and liked what you are doing in '+niche+'. I am reaching out from UnboxedThinking. '+(noWebsite?'We help growing businesses build clean, mobile-friendly websites that turn visitors into enquiries.':'We help businesses improve their website experience and digital presence to generate more enquiries.')+' Would you be open to a quick conversation? If not, no worries — I will not follow up.'}
 function websiteLink(raw){try{let x=String(raw||'').trim();if(!x)return '';if(!/^https?:\/\//i.test(x))x='https://'+x;const u=new URL(x);return ['https:','http:'].includes(u.protocol)?u.href:''}catch(e){return ''}}
 function openLead(id){const l=leads.find(x=>x.id===id);if(!l)return;activeId=l.id;$('detailTitle').textContent=l['Business Name']||'Business';
  const link=websiteLink(l.Website);$('detailContent').innerHTML='<div class="detail-meta">'+
   '<div><span>Phone</span><strong>'+safe(l.Phone)+'</strong></div><div><span>Niche</span><strong>'+safe(l.Niche||'—')+'</strong></div>'+
   '<div><span>Website</span><strong>'+(link?'<a href="'+safe(link)+'" target="_blank" rel="noopener noreferrer">View website ↗</a>':safe(l['Website Status']||'—'))+'</strong></div><div><span>Priority</span><strong>'+safe(l['Lead Priority']||'—')+'</strong></div>'+
   '<div><span>Founder</span><strong>'+safe(l.Founder||'—')+'</strong></div><div><span>Digital score</span><strong>'+safe(l['Digital Score']||'—')+'</strong></div></div>'+
   '<div class="detail-fields"><div class="field"><label for="detailStatus">Lead status</label><select id="detailStatus">'+STATUS.map(s=>'<option '+(l.status===s?'selected':'')+'>'+safe(s)+'</option>').join('')+'</select></div>'+
   '<div class="field"><label for="detailDate">Next follow-up</label><input type="date" id="detailDate" value="'+safe(l.followup)+'"></div>'+
   '<div class="field wide"><label for="detailNotes">Notes & conversation summary</label><textarea id="detailNotes" maxlength="10000" placeholder="What did you discuss?">'+safe(l.notes)+'</textarea></div>'+
   '<div class="field wide"><label class="consent"><input type="checkbox" id="detailConsent" '+(l.consent?'checked':'')+'><span>I have verified this business has agreed to receive WhatsApp outreach from us. I will respect opt-outs.</span></label></div></div>'+
   '<div class="message-box"><p>PERSONALIZED INTRO — REVIEW BEFORE SENDING</p><textarea id="detailPitch" maxlength="1800">'+safe(guessPitch(l))+'</textarea></div>'+
   '<div class="modal-actions"><button class="btn btn-primary" id="saveLead">Save changes</button><button class="btn btn-outline" id="copyPitch">Copy message</button><button class="btn btn-outline" id="waLead">Open WhatsApp ↗</button><button class="btn btn-outline" id="callLead">Call</button></div>';
  $('detailBackdrop').hidden=false;document.body.style.overflow='hidden';$('closeDetail').focus()
 }
 function closeLead(){activeId=null;$('detailBackdrop').hidden=true;document.body.style.overflow=''}
 function persistModal(){const l=leads.find(x=>x.id===activeId);if(!l)return null;l.status=$('detailStatus').value;l.followup=$('detailDate').value;l.notes=$('detailNotes').value;l.consent=$('detailConsent').checked;l.updated=stamp();save();render();return l}
 function pitchText(){return $('detailPitch')?.value.trim()||''}
 function openWhatsApp(){const l=persistModal();if(!l)return;if(!l.consent){notify('Confirm permission to contact before opening WhatsApp.');return}
 const phone=cleanNumber(l.Phone);if(!phone){notify('Check the phone number. WhatsApp needs an international-format number.');return}
 if(!pitchText()){notify('Write a message first.');return}
 const url='https://wa.me/'+phone+'?text='+encodeURIComponent(pitchText());window.open(url,'_blank','noopener,noreferrer');notify('WhatsApp draft opened. Review and send manually; mark status after sending.')}
 function callLead(){const l=persistModal();if(!l)return;const d=String(l.Phone).replace(/[^\d+]/g,'');if(!d){notify('Phone number missing.');return}window.location.href='tel:'+encodeURIComponent(d)}
 function bind(){for(const id of ['importTop','importEmpty','importSettings'])$(id).addEventListener('click',()=>$('fileInput').click());
  $('fileInput').addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;if(f.size>10*1024*1024){notify('File is too large (limit: 10 MB).');return}try{const t=await f.text();if(f.name.toLowerCase().endsWith('.json'))handleJSON(t);else importCSV(t)}catch(err){notify('Import failed: '+err.message)}});
  $('exportBtn').addEventListener('click',exportCSV);$('backupBtn').addEventListener('click',backup);
  $('restoreInfo').addEventListener('click',()=>notify('Full backup saves status, notes and permissions. Import that JSON to restore them. CSV export is for spreadsheet use.'));
  $('clearBtn').addEventListener('click',()=>{if(confirm('Permanently delete all leads and progress stored in this browser? Export a backup first.')){leads=[];localStorage.removeItem(KEY);page=1;render();notify('Browser data cleared.')}});
  for(const id of ['search','statusFilter','priorityFilter','websiteFilter','sort'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=1;render()});
  $('prevPage').addEventListener('click',()=>{page--;render()});$('nextPage').addEventListener('click',()=>{page++;render()});
  document.addEventListener('click',e=>{const target=e.target.closest('[data-open]');if(target)openLead(target.dataset.open)});
  $('closeDetail').addEventListener('click',closeLead);$('detailBackdrop').addEventListener('click',e=>{if(e.target===$('detailBackdrop'))closeLead()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('detailBackdrop').hidden)closeLead()});
  $('detailContent').addEventListener('click',async e=>{const id=e.target.id;if(id==='saveLead'){persistModal();notify('Lead updated.')}if(id==='copyPitch'){try{await navigator.clipboard.writeText(pitchText());notify('Message copied.')}catch(err){$('detailPitch').select();notify('Select and copy the message.')}}if(id==='waLead')openWhatsApp();if(id==='callLead')callLead()});
  $('openFirst').addEventListener('click',()=>{const l=filtered()[0];if(l)openLead(l.id);else notify('Import leads first.')});
  $('mobileMenu').addEventListener('click',()=>$('mobileMenu').closest('.app-shell').querySelector('.sidebar').classList.toggle('is-open'));
  document.querySelectorAll('.nav-link').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));a.classList.add('active');document.querySelector('.sidebar').classList.remove('is-open')}));
 }
 load();bind();render();
})();
