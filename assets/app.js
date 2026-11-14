'use strict';
/* UnboxedThinking CRM — browser-local MVP. Never auto-sends messages or uploads lead data. */
(()=> {
 const KEY='unboxedthinking.crm.v1';
 const STATUS=['New','Contacted','Connected','Replied','Interested','Follow-up','Meeting booked','Won','Not interested'];
 const HEADERS=['Business Name','Niche','Founder','Phone','Email','Address','Website','Rating','Reviews','Website Status','Digital Score','Lead Priority'];
 let leads=[],page=1,activeId=null,toastTimer=null,pendingWhatsAppId=localStorage.getItem('unboxedthinking.pendingWhatsAppLead')||'',cloudReady=false,syncQueue=Promise.resolve(),synced=new Map(),syncPending=0,selected=new Set(),bulkBusy=false,activeView='new',messageTemplates={general:'Hi {{business_name}}, I came across your business and wanted to connect. We help businesses improve their online presence and generate more enquiries. Would you be open to a quick conversation?',followup:'Hi {{business_name}}, just following up on my earlier message. I wanted to check if you had a chance to review it. Happy to share more details if useful.'},previewType='general';
 const formatGeneralPitch=message=>{const greeting="Hello Sir/Ma'am,";if(!message.startsWith(greeting))return message;const body=message.slice(greeting.length).trim();return greeting+"\n\n"+body.replace(/\s+(Would you|May I|Is this|Open to|Interested in|Worth a|Happy to|If you share|If so|Either answer|I can tailor|I’d be glad|I'd be glad|Would that|Would this|Which of these)\b/g,"\n\n$1");};
 const DEFAULT_GENERAL_VARIANTS=["Hello Sir/Ma'am, I came across [Business Name] and had a quick thought about how customers might be discovering you online. There may be an opportunity worth exploring. Would you be open to hearing the idea?","Hello Sir/Ma'am, may I ask—are you fully satisfied with the enquiries [Business Name] receives from its online presence? We noticed a few areas businesses often overlook. Would a quick exchange be useful?","Hello Sir/Ma'am, I’m reaching out from UnboxedThinking. We help businesses make their digital presence work harder. I have one practical thought that may be relevant to [Business Name]. May I share it?","Hello Sir/Ma'am, when someone searches for a business like [Business Name], the first impression can make a real difference. We work on that customer journey. Would you be interested in one idea to review?","Hello Sir/Ma'am, quick question: is [Business Name] currently focusing more on visibility, better-quality enquiries, or converting website visitors? We may have a useful perspective. Which of these is most relevant?","Hello Sir/Ma'am, I was looking at businesses in your space and wanted to introduce UnboxedThinking. There are often small digital improvements that can make the next customer step clearer. Would you like to know what I mean?","Hello Sir/Ma'am, does [Business Name] have a clear plan to turn online interest into actual enquiries? That gap is where we often help with websites, SEO and campaigns. Open to a short conversation?","Hello Sir/Ma'am, I have a simple question about [Business Name]: are your website and social channels bringing customers towards one clear action? If you'd like, I can share a quick checklist we use.","Hello Sir/Ma'am, many businesses invest in digital marketing but find it difficult to see which activity is bringing genuine enquiries. UnboxedThinking helps make that journey clearer. Is this something you are reviewing?","Hello Sir/Ma'am, I’m with UnboxedThinking. Rather than send a long company introduction, I wanted to ask what [Business Name] is trying to improve online this quarter. I may be able to suggest a relevant next step.","Hello Sir/Ma'am, have you ever checked how [Business Name] appears to a first-time customer on Google and mobile? A few details can influence whether someone calls or moves on. Would a brief review be useful?","Hello Sir/Ma'am, one area worth checking for many businesses is the journey between seeing an ad and making an enquiry. We work on campaigns and landing pages together. Would you be open to exploring this for [Business Name]?","Hello Sir/Ma'am, if someone visits [Business Name]'s website today, is it immediately clear what makes your service worth enquiring about? We help businesses improve that experience. May I share a thought?","Hello Sir/Ma'am, I wanted to connect because UnboxedThinking works with businesses on SEO, Google Ads, Meta Ads and websites. There may be one service that fits [Business Name]'s current goals. May I ask what you're prioritising?","Hello Sir/Ma'am, are you looking to attract more local customers, reach a wider audience, or improve the enquiries you already receive? The right digital approach depends on the goal. Happy to share a few ideas for [Business Name].","Hello Sir/Ma'am, a strong online presence is not only about posting regularly—it is also about helping the right people find you and take the next step. Is [Business Name] working on this currently?","Hello Sir/Ma'am, I’m from UnboxedThinking. We help businesses connect their website, search presence and paid campaigns. I’d be glad to share how these pieces can work together for [Business Name]. Would that interest you?","Hello Sir/Ma'am, can I ask who looks after digital marketing for [Business Name]? I have a relevant idea around online visibility and enquiries and would be happy to share it with the right person.","Hello Sir/Ma'am, have you reviewed [Business Name]'s Google Business Profile recently? Accurate details, useful updates and local visibility can influence customer decisions. Would a quick set of improvement pointers be helpful?","Hello Sir/Ma'am, sometimes the issue is not getting more traffic, but making it easier for interested visitors to contact the business. UnboxedThinking works on that part too. Is improving conversions on your radar?","Hello Sir/Ma'am, I noticed [Business Name] operates in a competitive space. A clear digital message can help customers understand why they should choose you. Would you be open to one idea on how to communicate that online?","Hello Sir/Ma'am, if you could improve one thing in [Business Name]'s online marketing right now, would it be reach, enquiries, website experience or tracking? Your answer will help me share something relevant rather than a generic pitch.","Hello Sir/Ma'am, I’m reaching out with a thought, not a long sales pitch. UnboxedThinking helps businesses identify practical improvements across SEO, advertising and websites. Would you be comfortable if I shared one suggestion for [Business Name]?","Hello Sir/Ma'am, do you currently know which online channel brings [Business Name] its most valuable enquiries? We help businesses set up campaigns and tracking to make that clearer. Would this be useful to discuss?","Hello Sir/Ma'am, customers often compare a few businesses online before making contact. We help make a brand's information and next steps clearer during that decision. Would you like to explore a few ideas for [Business Name]?","Hello Sir/Ma'am, I wanted to ask whether [Business Name] is planning any website or marketing improvements in the coming months. If so, I can share how UnboxedThinking approaches the work. Would that be helpful?","Hello Sir/Ma'am, one quick thought: are your digital campaigns reaching the people most likely to need your services, or simply generating clicks? We work on audience, landing pages and measurement. Worth a brief chat?","Hello Sir/Ma'am, UnboxedThinking supports businesses with digital strategy and execution. Before suggesting anything, I'd like to understand what matters most to [Business Name]. Would you be open to a quick question or two?","Hello Sir/Ma'am, does [Business Name] have separate plans for SEO and paid ads, or are both working towards the same business goal? Aligning them can make the customer journey more consistent. May I share our approach?","Hello Sir/Ma'am, I’m contacting you from UnboxedThinking. We help businesses present their services clearly online and make it easier for potential customers to enquire. Would you like a short example of the kind of improvements we look at?","Hello Sir/Ma'am, when was the last time [Business Name] checked its website on a mobile phone from a customer's point of view? That small exercise can reveal useful opportunities. Would you like our quick review checklist?","Hello Sir/Ma'am, are social media efforts for [Business Name] mainly focused on posting, or are they also designed to start customer conversations? We help plan content and campaigns around business objectives. Interested in discussing?","Hello Sir/Ma'am, I’m with UnboxedThinking. We help businesses make their online marketing more structured, from the first click to the enquiry. Is this an area [Business Name] would like to improve?","Hello Sir/Ma'am, I have a question that may help us avoid wasting your time: is digital growth a current priority for [Business Name], or is your focus elsewhere at the moment? Either answer is absolutely fine.","Hello Sir/Ma'am, a useful marketing plan starts with understanding the customer, not choosing an ad platform first. That's how we approach projects at UnboxedThinking. Would you be interested in a short introduction?","Hello Sir/Ma'am, if [Business Name] is considering Google Ads, the landing page and enquiry tracking matter just as much as the campaign. We help bring these pieces together. Would you like to know what to check before spending?","Hello Sir/Ma'am, are potential customers able to understand [Business Name]'s key services within a few seconds of finding you online? We work on website structure and messaging that makes this easier. May I share an idea?","Hello Sir/Ma'am, I wanted to introduce UnboxedThinking as a possible digital partner for [Business Name]. We can first understand your goals and then see whether SEO, ads or website support makes sense. Would a brief chat suit you?","Hello Sir/Ma'am, have you set a specific online marketing goal for the next few months—more calls, enquiries, bookings or stronger brand visibility? If you share the priority, I can suggest which area may deserve attention.","Hello Sir/Ma'am, I’m reaching out because businesses sometimes miss opportunities when their website, Google presence and social pages communicate different things. We help bring that experience together. Would you like to explore this?","Hello Sir/Ma'am, would it be useful to see a simple breakdown of where a business can improve online visibility, customer trust and enquiry flow? That's the kind of practical discussion we offer at UnboxedThinking.","Hello Sir/Ma'am, I don't want to assume what [Business Name] needs. Are you currently handling digital marketing in-house, working with an agency, or considering additional support? I can tailor the information accordingly.","Hello Sir/Ma'am, one thing we often recommend is reviewing the complete enquiry path—not just ad performance. If [Business Name] is investing in online promotion, would you be open to discussing how that path can be measured?","Hello Sir/Ma'am, if a potential customer searches for the service you provide, what would you want them to notice first about [Business Name]? We help businesses shape that online first impression. May I share a few thoughts?","Hello Sir/Ma'am, UnboxedThinking works across website development, SEO and digital advertising. Rather than send every service detail, may I ask which area—if any—[Business Name] is looking to improve?","Hello Sir/Ma'am, would you be open to a no-pressure exchange of ideas about [Business Name]'s online presence? If I understand your current goal, I can share one relevant suggestion and you can decide whether it is useful.","Hello Sir/Ma'am, I know you may already have a marketing partner. If you ever want a second perspective on your website, search visibility or campaigns, UnboxedThinking would be happy to share a few practical observations. Would that be welcome?","Hello Sir/Ma'am, is there a particular service or location that [Business Name] wants more people to discover? We can discuss how search, social campaigns and a focused landing page may support that objective. Interested?","Hello Sir/Ma'am, I’m from UnboxedThinking. We believe good marketing should be clear about the goal, the work involved and how results are measured. If [Business Name] is reviewing its digital plans, may I send a concise introduction?","Hello Sir/Ma'am, if improving [Business Name]'s online presence is on your agenda, I’d be glad to understand what you want to achieve before recommending anything. Would a short conversation sometime this week be convenient?"]].map(formatGeneralPitch);
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
  text=String(text||'').replace(/^\uFEFF/,'');
  let delimiter=',',counts={',':0,';':0,'\t':0},quoted=false;
  for(let i=0;i<text.length&&text[i]!=='\n'&&text[i]!=='\r';i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"')i++;else quoted=!quoted}else if(!quoted&&Object.prototype.hasOwnProperty.call(counts,ch))counts[ch]++}
  delimiter=Object.keys(counts).sort((x,y)=>counts[y]-counts[x])[0];
  const rows=[];let row=[],field='';quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++}else if(ch==='"')quoted=false;else field+=ch}
   else if(ch==='"')quoted=true;else if(ch===delimiter){row.push(field);field=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);field='';if(row.some(v=>v.trim()))rows.push(row);row=[]}else field+=ch}
  if(quoted)throw new Error('CSV has an unclosed quotation mark.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);return rows
 }
 const CSV_ALIASES={
  'Business Name':['businessname','business','companyname','companybusinessname','businesscompanyname','company','organization','organisation','firmname','brandname','brand','name'],
  'Phone':['phone','phonenumber','mobile','mobilenumber','contactnumber','contact','whatsappnumber','whatsapp','telephone','tel'],
  'Niche':['niche','industry','category','businesscategory','type','categories'],
  'Founder':['founder','owner','contactperson','personname','decisionmaker'],
  'Email':['email','emailaddress','mail'],
  'Address':['address','location','fulladdress','businessaddress'],
  'Website':['website','websiteurl','url','domain','web'],
  'Rating':['rating','googlerating','reviewrating'],
  'Reviews':['reviews','reviewcount','numberofreviews'],
  'Website Status':['websitestatus','websiteavailability','haswebsite'],
  'Digital Score':['digitalscore','score'],
  'Lead Priority':['leadpriority','priority']
 };
 function csvHeaderIndex(header,key){
  const aliases=CSV_ALIASES[key]||[key.toLowerCase().replace(/[^a-z0-9]/g,'')];
  for(const alias of aliases){const i=header.indexOf(alias);if(i>=0)return i}
  // Accept exported labels such as "Business Name (Required)" or "Company / Business Name".
  if(key==='Business Name'){
   const i=header.findIndex(h=>/^(business|company|organization|organisation|firm|brand)(name)?/.test(h)&&!/(owner|founder|contact|person)/.test(h));
   if(i>=0)return i;
  }
  if(key==='Phone'){
   const i=header.findIndex(h=>/^(phone|mobile|whatsapp|contactnumber|telephone|tel)/.test(h));
   if(i>=0)return i;
  }
  return -1
 }
 function normalize(o){const d={};for(const k of HEADERS)d[k]=val(o,k);d.Niche=String(d.Niche||'').trim()||'Uncategorized';return {...d,id:String(o.id||uid()),status:STATUS.includes(o.status)?o.status:'New',followup:String(o.followup||''),followupTime:String(o.followupTime||''),notes:String(o.notes||''),consent:o.consent===true,updated:String(o.updated||stamp()),firstDraft:String(o.firstDraft||''),followupDraft:String(o.followupDraft||''),sentAt:String(o.sentAt||''),repliedAt:String(o.repliedAt||''),followupSentAt:String(o.followupSentAt||'')}}
 function importCSV(text){const rows=parseCSV(text);if(rows.length<2)throw new Error('CSV does not contain any lead rows.');
  const header=rows.shift().map(h=>String(h||'').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[^a-z0-9]/g,''));
  const phoneIndex=csvHeaderIndex(header,'Phone');if(phoneIndex<0)throw new Error('Phone column not found. Use Phone, Mobile, Mobile Number or Contact Number.');
  const businessIndex=csvHeaderIndex(header,'Business Name');
  if(businessIndex<0)throw new Error('Business name column not found. Use Business Name, Company Name, Business, Company or Name.');
  let added=0,skipped=0,duplicates=0;
  const existing=new Set(leads.map(l=>dedupKey(l)));
  for(const row of rows){const raw={};HEADERS.forEach(k=>{const j=csvHeaderIndex(header,k);raw[k]=j>=0?String(row[j]??'').trim():''});
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
 function downloadCSVTemplate(){
  const out=[HEADERS.map(k=>csvCell(k==='Niche'?'Category':k)).join(',')];
  download('unboxedthinking-leads-template.csv',new Blob(['\uFEFF'+out.join('\r\n')],{type:'text/csv;charset=utf-8'}));
  notify('CSV template downloaded. Fill Business Name, Phone and Category; blank categories will go to Uncategorized.');
 }
 function exportCSV(){if(!leads.length){notify('Import leads first.');return}
  const cols=[...HEADERS,'Status','Follow-up Date','Follow-up Time','Notes','Contact Permission','First Draft','Followup Draft','Sent At','Replied At','Followup Sent At','Updated'];
  const out=[cols.map(csvCell).join(',')];for(const l of leads){out.push([...HEADERS.map(k=>l[k]),l.status,l.followup,l.followupTime,l.notes,l.consent?'Yes':'No',l.firstDraft,l.followupDraft,l.sentAt,l.repliedAt,l.followupSentAt,l.updated].map(csvCell).join(','))}
  download('unboxedthinking-leads-'+day()+'.csv',new Blob(['\uFEFF'+out.join('\r\n')],{type:'text/csv;charset=utf-8'}));notify('CSV exported.')}
 function backup(){if(!leads.length){notify('No leads to back up.');return}download('unboxedthinking-full-backup-'+day()+'.json',new Blob([JSON.stringify({version:1,exportedAt:stamp(),leads},null,2)],{type:'application/json'}));notify('Full backup downloaded.')}
 function filtered(){const q=$('search').value.trim().toLowerCase(),st=$('statusFilter').value,niche=$('nicheFilter').value,pr=$('priorityFilter').value,web=$('websiteFilter').value,sort=$('sort').value;
  let result=leads.filter(l=>(activeView==='all'||(activeView==='new'?l.status==='New':activeView==='contacted'?l.status==='Connected':activeView==='interested'?l.status==='Interested':activeView==='messageSent'?l.status==='Contacted':activeView==='followups'?l.status==='Follow-up':activeView==='notinterested'?l.status==='Not interested':l.status!=='New'))&&(!q||[l['Business Name'],l.Niche,l.Founder,l.Phone,l.Address,l.Email].some(v=>String(v||'').toLowerCase().includes(q)))&&(!st||l.status===st)&&(!niche||String(l.Niche||'').trim().toLocaleLowerCase()===niche.toLocaleLowerCase())&&(!pr||l['Lead Priority']===pr)&&(!web||l['Website Status']===web));
  result.sort((a,b)=>sort==='name'?val(a,'Business Name').localeCompare(val(b,'Business Name')):sort==='recent'?val(b,'updated').localeCompare(val(a,'updated')):sort==='followup'?(a.followup||'9999').localeCompare(b.followup||'9999'):priorityRank(b['Lead Priority'])-priorityRank(a['Lead Priority']));
  return result
 }
 function options(select,values,label){const keep=select.value;const unique=new Map();values.map(v=>String(v||'').trim()).filter(Boolean).forEach(v=>{const key=v.toLocaleLowerCase();if(!unique.has(key))unique.set(key,v)});const items=[...unique.values()].sort((a,b)=>a.localeCompare(b));select.innerHTML='<option value="">All '+safe(label)+'</option>'+items.map(v=>'<option value="'+safe(v)+'">'+safe(v)+'</option>').join('');select.value=[...select.options].some(o=>o.value.toLocaleLowerCase()===keep.toLocaleLowerCase())?keep:''}
 function render(){let contacted=leads.filter(x=>x.status==='Connected').length,interested=leads.filter(x=>x.status==='Interested').length,due=leads.filter(x=>x.status==='Follow-up').length;
  $('statTotal').textContent=leads.length.toLocaleString('en-IN');$('statContacted').textContent=contacted.toLocaleString('en-IN');$('statInterested').textContent=interested.toLocaleString('en-IN');$('statDue').textContent=due.toLocaleString('en-IN');$('leadCount').textContent=leads.length.toLocaleString('en-IN');
  $('overviewLeadRows').innerHTML=leads.slice().sort((a,b)=>val(b,'updated').localeCompare(val(a,'updated'))).map(l=>'<tr><td><strong>'+safe(l['Business Name']||'Unnamed business')+'</strong><small>'+safe(l.Niche||'Uncategorised')+'</small></td><td>'+safe(l.Phone||'—')+'</td><td>'+badge(l.status||'New','status')+'</td><td>'+safe(l.updated?new Date(l.updated).toLocaleDateString('en-IN'):'—')+'</td><td><button class="mini-btn" data-open="'+safe(l.id)+'">Manage</button></td></tr>').join('');
  $('overviewLeadTotal').textContent=leads.length.toLocaleString('en-IN');
  $('contactedNavCount').textContent=contacted.toLocaleString('en-IN');
  $('interestedNavCount').textContent=interested.toLocaleString('en-IN');
  $('directoryHeading').textContent={new:'New leads',contacted:'Connected leads',interested:'Interested',all:'All leads',notinterested:'Not Interested',messageSent:'Message Sent',followups:'Follow-ups'}[activeView]||'Leads';
  $('directoryHint').textContent={new:'Write your first message; after sending, update the lead status.',contacted:'Only leads marked Connected appear here.',interested:'Leads marked Interested appear here. Manage each lead to update its status.',all:'Your entire pipeline.',notinterested:'Leads marked Not Interested. Select any lead and use Delete selected to remove it permanently.',messageSent:'Leads whose first message has been marked as sent.',followups:'Only leads with an active Follow-up status and a saved date and time appear here.'}[activeView]||'Your lead pipeline.';
  options($('nicheFilter'),['Uncategorized',...leads.map(l=>String(l.Niche||'').trim()||'Uncategorized')],'categories');options($('priorityFilter'),leads.map(l=>l['Lead Priority']),'priorities');options($('websiteFilter'),leads.map(l=>l['Website Status']),'website statuses');
  const list=filtered(),per=15,pages=Math.max(1,Math.ceil(list.length/per));page=Math.min(page,pages);const slice=list.slice((page-1)*per,page*per);
  $('leadRows').innerHTML=slice.map(l=>'<tr><td><input class="lead-select" type="checkbox" data-select="'+safe(l.id)+'" aria-label="Select '+safe(l['Business Name']||'lead')+'" '+(selected.has(l.id)?'checked':'')+'></td><td><strong>'+safe(l['Business Name']||'Unnamed business')+'</strong><small>'+safe(l.Niche||'Uncategorised')+'</small></td><td>'+safe(l.Phone)+'</td><td>'+badge(l['Lead Priority'],'priority')+'</td><td>'+safe(l['Website Status']||'Unknown')+'</td><td>'+badge(l.status,'status')+'</td><td>'+safe(l.followup||'—')+'</td><td><div class="row-actions"><button class="mini-btn mini-wa" data-whatsapp="'+safe(l.id)+'">WhatsApp ↗</button>'+(pendingWhatsAppId===l.id?connectionSelect(l):'')+'<button class="mini-btn" data-open="'+safe(l.id)+'">Manage</button></div></td></tr>').join('');
  updateSelectionControls(list,slice);
  $('emptyState').hidden=list.length!==0;$('emptyMessage').textContent=leads.length?'No matching leads. Change the filters to see more.':'Import your cleaned CSV to start your outreach workspace.';$('importEmpty').hidden=leads.length>0;
  $('pageSummary').textContent=list.length?((page-1)*per+1)+'–'+Math.min(page*per,list.length)+' of '+list.length+' leads':'0 leads';$('pageNumber').textContent=page+' / '+pages;$('prevPage').disabled=page===1;$('nextPage').disabled=page===pages;
  const followupLeads=leads.filter(l=>l.status==='Follow-up');
  followupLeads.sort((a,b)=>(a.followup||'9999').localeCompare(b.followup||'9999')||val(b,'updated').localeCompare(val(a,'updated')));
  $('dueList').innerHTML=followupLeads.length?followupLeads.map(l=>'<div class="due-item"><div><strong>'+safe(l['Business Name']||'Business')+'</strong><small>'+safe(l.status||'Follow-up')+' · '+safe(l.followup||'No date set')+(l.followupTime?' at '+safe(l.followupTime):'')+' · '+safe(l.Niche||'Lead')+'</small></div><button class="mini-btn" data-open="'+safe(l.id)+'">Manage / Move</button></div>').join(''):'<p class="due-none">No follow-up leads yet. Mark a lead as Follow-up or set its next follow-up date.</p>';
 }
 function whatsappFiltered(){
  const q=$('waSearch').value.trim().toLowerCase(),st=$('waStatusFilter').value,permission=$('waPermissionFilter').value;
  return leads.filter(l=>(!q||[l['Business Name'],l.Phone,l.Niche].some(v=>String(v||'').toLowerCase().includes(q)))&&(!st||l.status===st)&&(permission===''||(permission==='yes'&&l.consent)||(permission==='no'&&!l.consent)));
 }
 function renderWhatsAppPage(){
  const list=whatsappFiltered();
  $('waRows').innerHTML=list.map(l=>'<tr><td><input type="checkbox" data-wa-select="'+safe(l.id)+'" '+(selected.has(l.id)?'checked':'')+'></td><td><strong>'+safe(l['Business Name']||'Unnamed business')+'</strong><small>'+safe(l.Niche||'Uncategorised')+'</small></td><td>'+safe(l.Phone)+'</td><td>'+badge(l.status,'status')+'</td><td>'+ (l.consent?'<span class="chip interested">Confirmed</span>':'<span class="chip new">Not confirmed</span>') +'</td><td>'+ (isNew(l)?'First message':'Follow-up') +'</td><td><button class="mini-btn mini-wa" data-whatsapp="'+safe(l.id)+'" '+(!l.consent?'title="Confirm permission for this lead first"':'')+'>Open WhatsApp ↗</button>'+(pendingWhatsAppId===l.id?connectionSelect(l):'')+'</td></tr>').join('');
  const count=list.filter(l=>selected.has(l.id)).length;
  $('waSelectedCount').textContent=selected.size+' selected';
  $('waBulkConsent').disabled=!cloudReady||selected.size===0;
  $('waSelectAll').checked=list.length>0&&count===list.length;
  $('waSelectAll').indeterminate=count>0&&count<list.length;
  $('waSelectPage').checked=list.length>0&&count===list.length;
  $('waSelectPage').indeterminate=count>0&&count<list.length;
  $('waEmpty').hidden=list.length!==0;
 }
 function ensureGeneralVariants(){
  let variants=messageTemplates.generalVariantsVersion===5&&Array.isArray(messageTemplates.generalVariants)&&messageTemplates.generalVariants.length===50?messageTemplates.generalVariants.slice():DEFAULT_GENERAL_VARIANTS.slice();
  messageTemplates.generalVariantsVersion=5;
  messageTemplates.generalVariants=variants;
  messageTemplates.general=variants[0];
  return variants;
 }
 function renderMessageManager(){
  $('generalAudienceCount').textContent=leads.filter(isNew).length.toLocaleString('en-IN');
  $('followupAudienceCount').textContent=leads.filter(l=>!isNew(l)).length.toLocaleString('en-IN');
  const variants=ensureGeneralVariants(),grid=$('generalVariantsGrid'),previewSelect=$('generalPreviewVariant');
  const previewIndex=previewSelect.value||'0';
  previewSelect.innerHTML=variants.map((v,i)=>'<option value="'+i+'">Message '+(i+1)+'</option>').join('');
  previewSelect.value=Number(previewIndex)<variants.length?previewIndex:'0';
  if(document.activeElement?.dataset?.generalVariant===undefined){
   grid.innerHTML=variants.map((v,i)=>'<article class="template-card variant-card"><div class="template-head"><div><span class="template-kicker">FIRST TOUCH / '+String(i+1).padStart(2,'0')+'</span><h3>Message '+(i+1)+'</h3><p>Natural, personalized introduction</p></div><span class="template-tag">VARIANT '+(i+1)+'</span></div><textarea data-general-variant="'+i+'" maxlength="3000" rows="5" aria-label="First message variant '+(i+1)+'">'+safe(v)+'</textarea><div class="template-foot"><span>{{business_name}} · {{niche}} · {{founder}}</span><span data-variant-length="'+i+'">'+v.length+' / 3000</span></div></article>').join('');
  }
  if(document.activeElement!==$('followupMessageTemplate'))$('followupMessageTemplate').value=messageTemplates.followup;
  $('followupTemplateLength').textContent=$('followupMessageTemplate').value.length+' / 3000';
  renderMessagePreview();
 }
 function renderMessagePreview(){
  const sample={'Business Name':'Sample Business','Niche':'Retail','Founder':'Alex'};
  const variants=ensureGeneralVariants();
  const general=variants[Number($('generalPreviewVariant')?.value||0)]||variants[0],followup=$('followupMessageTemplate').value;
  $('messagePreview').textContent=fillTemplate(previewType==='general'?general:followup,sample)||'Write a message above to see the preview.';
  $('previewGeneral').classList.toggle('btn-primary',previewType==='general');
  $('previewFollowup').classList.toggle('btn-primary',previewType==='followup');
 }
 async function saveMessageTemplates(){
  if(!cloudReady){notify('Sign in before saving message templates.');return}
  const variants=Array.from(document.querySelectorAll('[data-general-variant]')).map(el=>el.value.trim());
  if(variants.length!==50){notify('All 50 first-message variants must be available.');return}
  if(variants.some(v=>!v)){notify('Please complete all 50 first-message variants before saving.');return}
  const next={general:variants[0],generalVariants:variants,generalVariantsVersion:4,followup:$('followupMessageTemplate').value.trim()};
  if(!next.followup){notify('Please keep a shared follow-up message.');return}
  const btn=$('saveMessageTemplates');btn.disabled=true;btn.textContent='Saving…';
  try{await window.UnboxedCloud.saveSettings(next);messageTemplates=next;renderMessageManager();notify('Shared message templates saved to your private cloud account.')}
  catch(e){notify('Could not save message templates: '+e.message)}
  finally{btn.disabled=false;btn.textContent='Save both messages'}
 }
 function confirmBulkPermission(){
  const chosen=leads.filter(l=>selected.has(l.id));
  if(!chosen.length){notify('Select contacts first.');return}
  if(!confirm('Confirm WhatsApp permission for '+chosen.length+' selected contact(s)? Continue only if EACH selected contact has agreed to receive messages.'))return;
  chosen.forEach(l=>{l.consent=true;l.updated=stamp()});
  save();render();renderWhatsAppPage();notify('Permission recorded for '+chosen.length+' selected contacts.');
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
 function connectionSelect(l){return '<select class="connect-select" data-connect-status="'+safe(l.id)+'" aria-label="Mark '+safe(l['Business Name']||'lead')+' as connected"><option value="">Mark as Connected</option><option value="Connected">Connected</option></select>';}
 function fillTemplate(template,l){
  return String(template||'').replace(/\{\{\s*(business_name|niche|founder)\s*\}\}|\[(Business Name|Name)\]/gi,(_,key,bracketKey)=>{
   const field=(key||bracketKey||'').toLowerCase();
   const map={'business_name':l['Business Name']||'there','business name':l['Business Name']||'there','niche':l.Niche||'your industry','founder':l.Founder||'there','name':l.Founder||'there'};
   return map[field]||'';
  }).trim();
 }
 function currentDraft(l){
  if(!isNew(l))return fillTemplate(messageTemplates.followup,l);
  if(l.firstMessageDraft)return l.firstMessageDraft;
  const variants=ensureGeneralVariants(),cacheKey='unboxedthinking.messageVariantAssignments';
  let assignments={};try{assignments=JSON.parse(localStorage.getItem(cacheKey)||'{}')||{}}catch(e){}
  const cached=Number(assignments[l.id]);
  const index=Number.isInteger(cached)&&cached>=1&&cached<=50?cached-1:Math.floor(Math.random()*variants.length);
  l.firstMessageVariant=index+1;
  l.firstMessageDraft=fillTemplate(variants[index],l);
  assignments[l.id]=index+1;try{localStorage.setItem(cacheKey,JSON.stringify(assignments))}catch(e){}
  l.updated=stamp();save();
  return l.firstMessageDraft;
 }
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
   '<div class="detail-fields"><div class="field"><label for="detailStatus">Move to section / Lead status</label><select id="detailStatus">'+STATUS.map(st=>'<option '+(l.status===st?'selected':'')+'>'+safe(st)+'</option>').join('')+'</select></div>'+
   '<div class="field"><label for="detailDate">Follow-up date</label><input type="date" id="detailDate" value="'+safe(l.followup)+'" '+(l.status==='Follow-up'?'required':'')+' ></div>'+
    '<div class="field" id="followupTimeField" '+(l.status==='Follow-up'?'':'hidden')+'><label for="detailTime">Follow-up time</label><input type="time" id="detailTime" value="'+safe(l.followupTime)+'" '+(l.status==='Follow-up'?'required':'')+'></div>'+
   '<div class="field wide"><label for="detailNotes">Notes</label><textarea id="detailNotes" maxlength="10000" placeholder="Conversation notes...">'+safe(l.notes)+'</textarea></div>'+
   '<div class="field wide"><label class="consent"><input type="checkbox" id="detailConsent" '+(l.consent?'checked':'')+'><span>I confirm this business has permitted WhatsApp outreach; I will respect opt-outs.</span></label></div></div>'+
   '<div class="message-box"><p>'+(isNew(l)?'GENERAL MESSAGE':'FOLLOW-UP MESSAGE')+' · SHARED TEMPLATE</p><div class="shared-message-preview">'+safe(currentDraft(l)||'No message saved yet. Open Message Manager to add one.')+'</div><div class="draft-actions"><span>Managed centrally in Message Manager</span><button class="btn btn-outline btn-small" id="goMessageManager">Edit shared message →</button></div></div>'+
   '<p class="workflow-hint">'+(isNew(l)?'After you press Send in WhatsApp, click <b>Mark as Sent</b> to move this business to <b>Contacted Leads</b>.':'This lead is in <b>Contacted Leads</b>. The WhatsApp button uses the second message.')+'</p>'+
   '<div class="modal-actions"><button class="btn btn-primary" id="saveLead">Save changes</button><button class="btn btn-outline" id="copyPitch">Copy active message</button><button class="btn btn-whatsapp" id="waLead">WhatsApp App ↗</button><button class="btn btn-outline" id="callLead">Call</button></div>'+
   '<div class="whatsapp-fallback"><a id="waWebFallback" href="#" target="_blank" rel="noopener noreferrer" hidden>App unavailable? Open WhatsApp Web directly ↗</a></div>'+
   '<div class="modal-actions workflow-actions"><button class="btn btn-outline" id="markSent">✓ Message Sent</button><button class="btn btn-outline" id="moveToNew">↶ Move to New Leads</button><button class="btn btn-outline" id="markFollowup" '+(isNew(l)?'disabled':'')+'>◷ Follow-up Sent</button></div>';
  const statusSelect=$('detailStatus');
  let previousStatus=l.status||'New';
  const syncFollowupFields=()=>{
   const show=statusSelect.value==='Follow-up';
   $('followupTimeField').hidden=!show;
   $('detailDate').required=show;
   $('detailTime').required=show;
  };
  statusSelect.addEventListener('change',()=>{
   const next=statusSelect.value;
   if(next==='Follow-up'&&previousStatus!=='Follow-up'){openFollowupSchedule(previousStatus);return}
   previousStatus=next;syncFollowupFields();
  });
  syncFollowupFields();
  $('detailBackdrop').hidden=false;document.body.style.overflow='hidden';$('closeDetail').focus()
 }
 function closeLead(){activeId=null;$('detailBackdrop').hidden=true;document.body.style.overflow=''}
 function openFollowupSchedule(previousStatus){
  const backdrop=$('followupScheduleBackdrop');
  $('scheduleFollowupDate').value=$('detailDate')?.value||day();
  $('scheduleFollowupTime').value=$('detailTime')?.value||'';
  backdrop.dataset.previousStatus=previousStatus||'New';
  backdrop.hidden=false;
  $('scheduleFollowupDate').focus();
 }
 function closeFollowupSchedule(saveSchedule){
  const backdrop=$('followupScheduleBackdrop');
  const date=$('scheduleFollowupDate').value,time=$('scheduleFollowupTime').value;
  if(saveSchedule&&(!date||!time)){
   notify('Follow-up ke liye date aur time dono select karna mandatory hai.');
   (!date?$('scheduleFollowupDate'):$('scheduleFollowupTime')).focus();
   return;
  }
  if(saveSchedule){
   $('detailDate').value=date;$('detailTime').value=time;
   $('detailStatus').value='Follow-up';$('followupTimeField').hidden=false;
   $('detailDate').required=true;$('detailTime').required=true;
   backdrop.hidden=true;
   const saved=persistModal();
   if(saved){closeLead();notify('Follow-up saved. Lead Follow-ups module mein move ho gayi hai.')}
   return;
  }
  const previous=backdrop.dataset.previousStatus||'New';
  $('detailStatus').value=previous;
  $('followupTimeField').hidden=previous!=='Follow-up';
  $('detailDate').required=previous==='Follow-up';$('detailTime').required=previous==='Follow-up';
  backdrop.hidden=true;
 }
 function persistModal(){
  const l=leads.find(x=>x.id===activeId);if(!l)return null;
  const nextStatus=$('detailStatus').value,nextDate=$('detailDate').value,nextTime=$('detailTime').value;
   if(nextStatus==='Follow-up'&&(!nextDate||!nextTime)){notify('Follow-up ke liye date aur time dono bharna mandatory hai.');$('followupTimeField').hidden=false;$('detailDate').required=true;$('detailTime').required=true;(!nextDate?$('detailDate'):$('detailTime')).focus();return null}
   l.status=nextStatus;l.followup=nextDate;l.followupTime=nextTime;l.notes=$('detailNotes').value;
  l.consent=$('detailConsent').checked;
  l.updated=stamp();save();render();return l
 }
 function activeMessage(l){return currentDraft(l)}
 function directWhatsApp(l,message){
  const phone=cleanNumber(l.Phone);if(!phone){notify('Please enter a valid phone number.');return}
  if(!l.consent){notify("Confirm this contact's permission in WhatsApp Outreach first.");return}
  // Pick a fresh random first-touch message on every WhatsApp open; do not lock a lead to one variant.
  if(isNew(l)){
   const variants=ensureGeneralVariants();
   const previous=Number(l.firstMessageVariant)-1;
   let index=Math.floor(Math.random()*variants.length);
   if(variants.length>1&&index===previous)index=(index+1+Math.floor(Math.random()*(variants.length-1)))%variants.length;
   l.firstMessageVariant=index+1;
   l.firstMessageDraft=fillTemplate(variants[index],l);
   l.updated=stamp();message=l.firstMessageDraft;save();
  }
  const suffix=message?'&text='+encodeURIComponent(message):'';
  const nativeUrl='whatsapp://send?phone='+phone+suffix;
  const webUrl='https://web.whatsapp.com/send?phone='+phone+suffix;
  const fallback=$('waWebFallback');if(fallback){fallback.href=webUrl;fallback.hidden=false}
  pendingWhatsAppId=l.id;
  try{
   sessionStorage.setItem('unboxedthinking.whatsappSourceView',activeView);
   localStorage.setItem('unboxedthinking.pendingWhatsAppLead',l.id);
   // Set before opening WhatsApp; Android may not fire visibilitychange reliably.
   sessionStorage.setItem('unboxedthinking.whatsappAway','1');
  }catch(e){}
  render();if($('waRows'))renderWhatsAppPage();
  window.location.href=nativeUrl;
  notify('Opening WhatsApp app. If unavailable, use the direct Web link in Manage.')
 }
 function clearWhatsAppReturn(){pendingWhatsAppId='';try{localStorage.removeItem('unboxedthinking.pendingWhatsAppLead');sessionStorage.removeItem('unboxedthinking.whatsappAway');sessionStorage.removeItem('unboxedthinking.whatsappSourceView')}catch(e){}}
 function showWhatsAppReturn(){
  if(!pendingWhatsAppId||!cloudReady||$('whatsappReturnBackdrop').dataset.shown==='1')return;
  let away=false;try{away=sessionStorage.getItem('unboxedthinking.whatsappAway')==='1'}catch(e){}
  if(!away)return;
  const l=leads.find(x=>x.id===pendingWhatsAppId);
  if(!l){clearWhatsAppReturn();return}
  let sourceView='';try{sourceView=sessionStorage.getItem('unboxedthinking.whatsappSourceView')||''}catch(e){}
  const interestedChoice=$('whatsappReturnChoices').querySelector('[data-return-status="Interested"]');
  if(interestedChoice)interestedChoice.hidden=sourceView!=='contacted';
  const messageSentChoice=$('whatsappReturnChoices').querySelector('[data-return-status="Contacted"]');
  if(messageSentChoice)messageSentChoice.hidden=false;
  $('whatsappReturnName').textContent=l['Business Name']||'Unnamed business';
  $('whatsappReturnPhone').textContent=l.Phone||'';
  $('whatsappReturnBackdrop').dataset.shown='1';$('whatsappReturnBackdrop').hidden=false;
 }
 function finishWhatsAppReturn(status){
  const l=leads.find(x=>x.id===pendingWhatsAppId);
  if(l&&status==='Follow-up'){clearWhatsAppReturn();$('whatsappReturnBackdrop').hidden=true;$('whatsappReturnBackdrop').dataset.shown='';openLead(l.id);$('detailStatus').value='Follow-up';openFollowupSchedule(l.status||'New');notify('Follow-up ki date aur time select karein, phir Save changes dabayein.');return}
  if(l&&status){
   l.status=status;l.updated=stamp();
   if(status==='Contacted'||status==='Connected')l.sentAt=l.sentAt||stamp();
   if(status==='Replied')l.repliedAt=stamp();
   if(status==='Follow-up')l.followupSentAt=stamp();
   save();
  }
  const wasConnected=status==='Connected';
  clearWhatsAppReturn();$('whatsappReturnBackdrop').hidden=true;$('whatsappReturnBackdrop').dataset.shown='';
  render();if($('waRows'))renderWhatsAppPage();
  if(wasConnected){activeView='contacted';updateNavigation();location.hash='leads'}
  if(status==='Interested'){activeView='interested';updateNavigation();location.hash='leads'}
  // Keep the current module open; the lead moves out of New Leads by status filtering.
  if(status)notify('Lead status updated: '+status+'.');
 }
 function openWhatsApp(){const l=persistModal();if(l)directWhatsApp(l,activeMessage(l))}
 function quickWhatsApp(id){const l=leads.find(x=>x.id===id);if(l)directWhatsApp(l,currentDraft(l)||'')}
 function callLead(){const l=persistModal();if(!l)return;const d=String(l.Phone).replace(/[^\d+]/g,'');if(!d){notify('Phone number missing.');return}window.location.href='tel:'+encodeURIComponent(d)}
 function markConnected(id){
  const l=leads.find(x=>x.id===id);if(!l)return;
  l.status='Connected';l.sentAt=l.sentAt||stamp();l.updated=stamp();
  pendingWhatsAppId='';try{localStorage.removeItem('unboxedthinking.pendingWhatsAppLead')}catch(e){}
  save();activeView='contacted';updateNavigation();location.hash='leads';
  notify('Lead marked as Connected and moved to Connected Leads.');
 }
 function markAction(kind){
  if(kind==='new'){
   const l=leads.find(x=>x.id===activeId);if(!l)return;
   l.status='New';l.followup='';l.followupTime='';l.updated=stamp();
   save();closeLead();activeView='new';updateNavigation();location.hash='leads';
   notify('Lead moved back to New Leads.');return;
  }
  const l=persistModal();if(!l)return;
  if(kind==='sent'){l.status='Contacted';l.sentAt=l.sentAt||stamp()}
  if(kind==='followup'){if(!l.followup||!l.followupTime){notify('Set follow-up date and time before marking it.');openFollowupSchedule(l.status||'New');return}l.status='Follow-up';l.followupSentAt=stamp()}
  l.updated=stamp();save();render();closeLead();
  // Keep the current module open; Message Sent is updated by status filtering.
  notify(kind==='sent'?'Moved to Message Sent module.':'Follow-up recorded manually.')
 }
 function updateNavigation(){
  document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active',a.dataset.nav===activeView));
  const shell=document.querySelector('.app-shell');
  if(shell)shell.dataset.page=['new','contacted','interested','all','notinterested','messageSent'].includes(activeView)?'leads':activeView;
  selected.clear();page=1;render();
  if(activeView==='whatsapp')renderWhatsAppPage();
  if(activeView==='messages')renderMessageManager();
 }
 function openImportChooser(){ $('importBackdrop').hidden=false; }
 function closeImportChooser(){ $('importBackdrop').hidden=true; }
 async function readImportFile(e,isJSON){const f=e.target.files?.[0];e.target.value='';if(!f)return;closeImportChooser();if(f.size>10*1024*1024){notify('File is too large (limit: 10 MB).');return}try{const t=await f.text();if(isJSON)await handleJSON(t);else importCSV(t)}catch(err){notify('Import failed: '+err.message)}}

 async function refreshModule(button){
  if(!cloudReady){notify('Sign in before refreshing this module.');return}
  const module=button.dataset.moduleRefresh,original=button.innerHTML;
  button.disabled=true;button.classList.add('is-refreshing');
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/></svg><span>Refreshing…</span>';
  try{
   await syncQueue;
   const fresh=await window.UnboxedCloud.load();
   leads=fresh.map(normalize);
   selected=new Set([...selected].filter(id=>leads.some(l=>l.id===id)));
   if(module==='messages'){
    const saved=await window.UnboxedCloud.loadSettings();
    if(saved&&typeof saved==='object')messageTemplates={...messageTemplates,...saved};
    ensureGeneralVariants();
   }
   markSynced();page=1;render();
   if(module==='whatsapp')renderWhatsAppPage();
   if(module==='messages')renderMessageManager();
   notify(module==='messages'?'Message Manager refreshed from cloud.':module==='followups'?'Follow-ups refreshed from cloud.':module==='settings'?'Data module refreshed from cloud.':module==='overview'?'Overview refreshed from cloud.':module==='whatsapp'?'WhatsApp module refreshed from cloud.':'Lead module refreshed from cloud.');
  }catch(error){notify('Refresh failed: '+error.message);console.error('Module refresh failed',module,error)}
  finally{button.disabled=false;button.classList.remove('is-refreshing');button.innerHTML=original}
 }

 function bind(){for(const id of ['importTop','importEmpty','importSettings'])$(id).addEventListener('click',openImportChooser);
  $('uploadCsvBtn').addEventListener('click',()=>$('fileInput').click());
  $('restoreJsonBtn').addEventListener('click',()=>$('jsonInput').click());
  $('downloadImportTemplateBtn').addEventListener('click',downloadCSVTemplate);
  $('closeImportChooser').addEventListener('click',closeImportChooser);
  $('importBackdrop').addEventListener('click',e=>{if(e.target===$('importBackdrop'))closeImportChooser()});
  $('fileInput').addEventListener('change',e=>readImportFile(e,false));
  $('whatsappReturnChoices').addEventListener('click',e=>{const b=e.target.closest('[data-return-status]');if(b)finishWhatsAppReturn(b.dataset.returnStatus)});
  $('whatsappReturnSkip').addEventListener('click',()=>finishWhatsAppReturn(''));
  $('scheduleFollowupSave').addEventListener('click',()=>closeFollowupSchedule(true));
  $('scheduleFollowupCancel').addEventListener('click',()=>closeFollowupSchedule(false));
  $('followupScheduleBackdrop').addEventListener('click',e=>{if(e.target===$('followupScheduleBackdrop'))closeFollowupSchedule(false)});
  $('whatsappReturnBackdrop').addEventListener('click',e=>{if(e.target===$('whatsappReturnBackdrop'))finishWhatsAppReturn('')});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(pendingWhatsAppId)try{sessionStorage.setItem('unboxedthinking.whatsappAway','1')}catch(e){}}else showWhatsAppReturn()});
  window.addEventListener('focus',showWhatsAppReturn);
  window.addEventListener('pageshow',showWhatsAppReturn);
  $('jsonInput').addEventListener('change',e=>readImportFile(e,true));
  $('addSingleTop').addEventListener('click',openSingle);
  $('closeSingle').addEventListener('click',closeSingle);
  $('singleCancel').addEventListener('click',closeSingle);
  $('singleBackdrop').addEventListener('click',e=>{if(e.target===$('singleBackdrop'))closeSingle()});
  $('singleForm').addEventListener('submit',saveSingle);
  $('bulkDeleteBtn').addEventListener('click',bulkDelete);
  $('waBulkConsent').addEventListener('click',confirmBulkPermission);
  $('waSelectAll').addEventListener('change',e=>{for(const l of whatsappFiltered()){if(e.target.checked)selected.add(l.id);else selected.delete(l.id)}renderWhatsAppPage()});
  $('waSelectPage').addEventListener('change',e=>{for(const l of whatsappFiltered()){if(e.target.checked)selected.add(l.id);else selected.delete(l.id)}renderWhatsAppPage()});
  $('waRows').addEventListener('change',e=>{if(!e.target.matches('[data-wa-select]'))return;if(e.target.checked)selected.add(e.target.dataset.waSelect);else selected.delete(e.target.dataset.waSelect);renderWhatsAppPage()});
  $('saveMessageTemplates').addEventListener('click',saveMessageTemplates);
  $('followupMessageTemplate').addEventListener('input',()=>{$('followupTemplateLength').textContent=$('followupMessageTemplate').value.length+' / 3000';renderMessagePreview()});
  $('generalVariantsGrid').addEventListener('input',e=>{const field=e.target.closest('[data-general-variant]');if(!field)return;const counter=$('[data-variant-length="'+field.dataset.generalVariant+'"]');if(counter)counter.textContent=field.value.length+' / 3000';});
  $('generalPreviewVariant').addEventListener('change',renderMessagePreview);
  $('previewGeneral').addEventListener('click',()=>{previewType='general';renderMessagePreview()});
  $('previewFollowup').addEventListener('click',()=>{previewType='followup';renderMessagePreview()});
  for(const id of ['waSearch','waStatusFilter','waPermissionFilter'])$(id).addEventListener(id==='waSearch'?'input':'change',renderWhatsAppPage);
  $('selectPage').addEventListener('change',e=>{const list=filtered().slice((page-1)*15,page*15);for(const l of list){if(e.target.checked)selected.add(l.id);else selected.delete(l.id)}render()});
  $('selectAllMatching').addEventListener('change',e=>{for(const l of filtered()){if(e.target.checked)selected.add(l.id);else selected.delete(l.id)}render()});
  $('leadRows').addEventListener('change',e=>{if(!e.target.matches('[data-select]'))return;if(e.target.checked)selected.add(e.target.dataset.select);else selected.delete(e.target.dataset.select);render()});
  $('exportBtn').addEventListener('click',exportCSV);$('backupBtn').addEventListener('click',backup);$('downloadTemplateBtn').addEventListener('click',downloadCSVTemplate);
  $('restoreInfo').addEventListener('click',()=>notify('Full backup saves status, notes and permissions. Import that JSON to restore them. CSV export is for spreadsheet use.'));
  $('clearBtn').addEventListener('click',async()=>{if(confirm('Permanently delete ALL CRM leads from your Supabase account? Your shared message templates will be preserved. This cannot be undone.')){try{await syncQueue;const removed=await window.UnboxedCloud.clear();leads=[];selected.clear();markSynced();page=1;render();notify('Deleted '+removed+' leads from your cloud CRM.')}catch(e){notify('Could not delete leads: '+e.message)}}});
  for(const id of ['search','statusFilter','nicheFilter','priorityFilter','websiteFilter','sort'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=1;render()});
  $('prevPage').addEventListener('click',()=>{page--;render()});$('nextPage').addEventListener('click',()=>{page++;render()});

  document.addEventListener('change',e=>{const connect=e.target.closest('[data-connect-status]');if(connect&&connect.value==='Connected')markConnected(connect.dataset.connectStatus)});
  $('closeDetail').addEventListener('click',closeLead);$('detailBackdrop').addEventListener('click',e=>{if(e.target===$('detailBackdrop'))closeLead()});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('singleBackdrop').hidden)closeSingle();else if(!$('detailBackdrop').hidden)closeLead()}});

  $('openFirst').addEventListener('click',()=>{const l=filtered()[0];if(l)openLead(l.id);else notify('Import leads first.')});
  $('mobileMenu').addEventListener('click',()=>$('mobileMenu').closest('.app-shell').querySelector('.sidebar').classList.toggle('is-open'));
  document.querySelectorAll('.nav-link').forEach(a=>a.addEventListener('click',()=>{activeView=a.dataset.nav;updateNavigation();document.querySelector('.sidebar').classList.remove('is-open')}));
  document.querySelectorAll('[data-module-refresh]').forEach(button=>button.addEventListener('click',()=>refreshModule(button)));
 }
  async function enterCloud(){
  if(!window.UnboxedCloud||window.UnboxedCloud.error){$('loginError').textContent=window.UnboxedCloud?.error||'Could not load Supabase library.';return}
  $('loginError').textContent='Loading private leads…';
  try{
    const data=await window.UnboxedCloud.load();
    leads=data.map(normalize);
    let savedTemplates=null,settingsLoadError=null;
    try{savedTemplates=await window.UnboxedCloud.loadSettings()}catch(settingsError){settingsLoadError=settingsError;console.warn('Message settings unavailable; opening lead workspace with local defaults.',settingsError)}
    if(savedTemplates&&typeof savedTemplates==='object')messageTemplates={...messageTemplates,...savedTemplates};
    const needsGeneralMigration=savedTemplates?.generalVariantsVersion!==3||!Array.isArray(savedTemplates?.generalVariants)||savedTemplates.generalVariants.length!==50;
    ensureGeneralVariants();
    if(needsGeneralMigration){try{await window.UnboxedCloud.saveSettings({general:messageTemplates.general,generalVariants:messageTemplates.generalVariants,generalVariantsVersion:3,followup:messageTemplates.followup});}catch(migrationError){console.warn('Could not auto-save 50-message migration; use Save both messages in Message Manager.',migrationError)}}
    $('whatsappReturnBackdrop').dataset.shown='';
    selected.clear();cloudReady=true;markSynced();page=1;render();renderMessageManager();
    document.body.classList.remove('auth-locked');$('authGate').hidden=true;
    showWhatsAppReturn();
    $('loginError').textContent='';
    if(settingsLoadError)notify('CRM leads loaded. Message settings cloud sync issue: '+(settingsLoadError.message||'settings unavailable'));
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
  // Attach authentication first. A later CRM UI initialization error must never
  // prevent the login form from receiving its submit handler.
  $('loginForm').dataset.loginBound='1';
  $('loginForm').addEventListener('submit',async e=>{
   e.preventDefault();const b=$('loginButton');b.disabled=true;b.textContent='Signing in…';$('loginError').textContent='';
   try{
    if(!window.UnboxedCloud||typeof window.UnboxedCloud.signIn!=='function'){
     await window.UnboxedCloud?.ready?.();
    }
    if(!window.UnboxedCloud||typeof window.UnboxedCloud.signIn!=='function')throw new Error(window.UnboxedCloud?.error||'Supabase login service is unavailable. Check your connection and refresh.');
    await window.UnboxedCloud.signIn($('loginEmail').value.trim(),$('loginPassword').value);
    $('loginPassword').value='';await enterCloud();
   }catch(err){$('loginError').textContent=err.message||'Sign-in failed';console.error('Login failed:',err)}
   finally{b.disabled=false;b.textContent='Sign in securely →'}
  });
  // Install core CRM click actions before optional UI bindings, so one missing
  // control cannot disable Manage / WhatsApp actions across the whole workspace.
  if(!document.documentElement.dataset.crmCoreClicks){
   document.documentElement.dataset.crmCoreClicks='1';
   document.addEventListener('click',e=>{
    const overviewNav=e.target.closest('[data-overview-nav]');
    if(overviewNav){activeView=overviewNav.dataset.overviewNav;updateNavigation();document.querySelector('.sidebar')?.classList.remove('is-open');return}
    const target=e.target.closest('[data-open]');if(target){openLead(target.dataset.open);return}
    const wa=e.target.closest('[data-whatsapp]');if(wa){quickWhatsApp(wa.dataset.whatsapp);return}
   });
   $('detailContent').addEventListener('click',async e=>{
    const id=e.target.id;
    if(id==='saveLead'){const saved=persistModal();if(saved){notify('Changes queued for Supabase sync.');if(leads.find(x=>x.id===activeId)?.status==='Interested'){closeLead();activeView='interested';updateNavigation();location.hash='leads';}}}
    if(id==='copyPitch'){const l=leads.find(x=>x.id===activeId);try{await navigator.clipboard.writeText(activeMessage(l));notify('Active message copied.')}catch(err){const field=$(isNew(l)?'detailPitch':'detailFollowupPitch');field?.select();notify('Select and copy your message.')}}
    if(id==='waLead')openWhatsApp();if(id==='callLead')callLead();if(id==='markSent')markAction('sent');if(id==='moveToNew')markAction('new');if(id==='markFollowup')markAction('followup');if(id==='goMessageManager'){closeLead();activeView='messages';updateNavigation()}
   });
  }
  try{bind();updateNavigation();render()}catch(uiError){
   $('loginError').textContent='CRM interface setup failed: '+(uiError?.message||String(uiError));
   console.error('CRM interface initialization failed:',uiError);
  }
  try{await window.UnboxedCloud?.ready?.()}catch(e){
   $('loginError').textContent='Supabase connection setup failed: '+(e?.message||String(e));
   console.error('Supabase startup failed:',e);
  }
  $('logoutBtn').addEventListener('click',async()=>{
   if(syncPending>0){notify('Finish syncing your leads before signing out.');return}
   try{await window.UnboxedCloud.signOut();leads=[];selected.clear();synced.clear();cloudReady=false;render();document.body.classList.add('auth-locked');$('authGate').hidden=false;notify('Signed out.')}catch(e){notify('Sign out failed: '+e.message)}
  });
  if(!window.UnboxedCloud||window.UnboxedCloud.error){$('loginError').textContent=window.UnboxedCloud?.error||'Supabase unavailable.';return}
  try{const sess=await window.UnboxedCloud.session();if(sess?.user)await enterCloud()}catch(e){$('loginError').textContent='Session error: '+e.message}
 }
 bootstrap();
})();
