(()=>{
const L={en:['English','en-IN'],hi:['Hindi','hi-IN'],te:['Telugu','te-IN'],ta:['Tamil','ta-IN'],kn:['Kannada','kn-IN'],bn:['Bengali','bn-IN'],es:['Spanish','es-ES']};
const D={p:'groq',k:'',gT:'llama-3.3-70b-versatile',gV:'meta-llama/llama-4-scout-17b-16e-instruct',mT:'gemini-2.5-flash',mV:'gemini-2.5-flash',lang:'en',spk:false,ctx:true};
let cfg={...D},chat=[];
try{cfg={...D,...JSON.parse(localStorage.getItem('wii-cfg')||'{}')};chat=JSON.parse(localStorage.getItem('wii-chat')||'[]')}catch(e){}
const store=()=>{try{localStorage.setItem('wii-cfg',JSON.stringify(cfg));localStorage.setItem('wii-chat',JSON.stringify(chat.slice(-30)))}catch(e){}};
const kT=()=>cfg.p==='groq'?'gT':'mT',kV=()=>cfg.p==='groq'?'gV':'mV';
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const fmt=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
const box=$('#msgs');
function add(r,t){const d=document.createElement('div');d.className='m '+r;d.innerHTML=r==='err'?esc(t):fmt(t);box.appendChild(d);box.scrollTop=box.scrollHeight;return d}
function sys(){const o=[...new Set(preds.map(p=>p.class))];
  return `You are WhatIsIt, a friendly AI inside a phone camera app. ${cfg.ctx&&o.length?'The camera currently detects: '+o.join(', ')+'.':''} Reply in ${L[cfg.lang][0]}, under 120 words, in simple words with practical tips. If unsure, say so.`}
async function ask(msgs,img){
  if(!cfg.k)throw new Error('Add your API key in Settings first.');
  while(msgs.length&&msgs[0].r!=='user')msgs.shift();
  const last=msgs.length-1;
  if(cfg.p==='groq'){
    const m=[{role:'system',content:sys()},...msgs.map((x,i)=>({role:x.r,content:img&&i===last?[{type:'text',text:x.t},{type:'image_url',image_url:{url:img}}]:x.t}))];
    const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+cfg.k},body:JSON.stringify({model:img?cfg.gV:cfg.gT,messages:m,temperature:.5,max_tokens:500})});
    const j=await r.json();if(!r.ok)throw new Error(j.error?.message||'Error '+r.status);return j.choices[0].message.content;
  }
  const c=msgs.map((x,i)=>({role:x.r==='user'?'user':'model',parts:[{text:x.t},...(img&&i===last?[{inline_data:{mime_type:'image/jpeg',data:img.split(',')[1]}}]:[])]}));
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${img?cfg.mV:cfg.mT}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':cfg.k},body:JSON.stringify({systemInstruction:{parts:[{text:sys()}]},contents:c,generationConfig:{temperature:.5,maxOutputTokens:700}})});
  const j=await r.json();if(!r.ok)throw new Error(j.error?.message||'Error '+r.status);
  return(j.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('')||'(empty reply)';
}
function speak(t){if(!window.speechSynthesis)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t.replace(/\*/g,''));u.lang=L[cfg.lang][1];speechSynthesis.speak(u)}
async function send(t,img){
  t=(t||'').trim();if(!t)return;add('user',t);chat.push({r:'user',t});
  const d=add('dots','thinking…');
  try{const a=await ask(chat.slice(-10),img);chat.push({r:'assistant',t:a});d.remove();add('assistant',a);store();if(cfg.spk)speak(a)}
  catch(e){d.remove();chat.pop();add('err',e.message+(/model|not found|decommission|deprecat/i.test(e.message)?' Open Settings > Load models and pick another.':''))}
}
function frame(){const w=Math.min(768,v.videoWidth),o=document.createElement('canvas');o.width=w;o.height=Math.round(w*v.videoHeight/v.videoWidth);o.getContext('2d').drawImage(v,0,0,o.width,o.height);return o.toDataURL('image/jpeg',.7)}
const name=()=>{const c=cur();return c?c.class:'the object in view'};
['Explain simply','Safety tips','How is it made','Fun facts','Price in India','Alternatives'].forEach(q=>{
  const b=document.createElement('button');b.className='chip';b.textContent=q;b.onclick=()=>send(q+' about '+name());$('#qs').appendChild(b)});
$('#csend').onclick=()=>{const i=$('#cin');send(i.value);i.value=''};
$('#cin').onkeydown=e=>{if(e.key==='Enter')$('#csend').click()};
const SRC=window.SpeechRecognition||window.webkitSpeechRecognition;
$('#cmic').onclick=()=>{if(!SRC)return toast('Voice not supported here');const r=new SRC();r.lang=L[cfg.lang][1];r.onresult=e=>send(e.results[0][0].transcript);r.onerror=()=>toast('Voice failed');r.start();toast('Listening…')};
$('#aiv').onclick=()=>{if(!v.videoWidth)return toast('Start the camera first');
  document.querySelector('.tab[data-t=chat]').click();
  send('Look at this camera frame. Name the main objects, what each is used for, and one useful tip.',frame())};
// settings
Object.entries(L).forEach(([k,a])=>$('#lang').add(new Option(a[0],k)));
function paint(){$('#prov').value=cfg.p;$('#key').value=cfg.k;$('#tm').value=cfg[kT()];$('#vm').value=cfg[kV()];$('#lang').value=cfg.lang;$('#ctx').checked=cfg.ctx;$('#spk').checked=cfg.spk}
$('#prov').onchange=e=>{cfg.p=e.target.value;paint();store()};
$('#key').oninput=e=>{cfg.k=e.target.value.trim();store()};
$('#tm').oninput=e=>{cfg[kT()]=e.target.value.trim();store()};
$('#vm').oninput=e=>{cfg[kV()]=e.target.value.trim();store()};
$('#lang').onchange=e=>{cfg.lang=e.target.value;store()};
$('#ctx').onchange=e=>{cfg.ctx=e.target.checked;store()};
$('#spk').onchange=e=>{cfg.spk=e.target.checked;store()};
$('#clc').onclick=()=>{chat=[];box.innerHTML='';store();toast('Chat cleared')};
$('#lm').onclick=async()=>{
  if(!cfg.k)return toast('Add your key first');
  try{let ids;
    if(cfg.p==='groq'){const j=await(await fetch('https://api.groq.com/openai/v1/models',{headers:{Authorization:'Bearer '+cfg.k}})).json();ids=j.data.map(m=>m.id)}
    else{const j=await(await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100',{headers:{'x-goog-api-key':cfg.k}})).json();ids=j.models.filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>m.name.replace('models/',''))}
    $('#ml').innerHTML=ids.map(i=>`<option value="${i}">`).join('');toast(ids.length+' models loaded. Tap a model field.')
  }catch(e){toast('Could not load models. Check the key.')}};
$('#tst').onclick=async()=>{try{toast('Testing…');await ask([{r:'user',t:'Reply with the single word: ready'}]);toast('Key works')}catch(e){toast(e.message.slice(0,60))}};
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{const t=!['scan','hist'].includes(b.dataset.t);$('#sheet').classList.toggle('tall',t);$('#stage').classList.toggle('small',t)}));
paint();chat.forEach(m=>add(m.r,m.t));
if(!chat.length)add('assistant','Hi! Open Settings, add a free Groq or Gemini key, then ask me about anything the camera sees. Try AI Vision for a full-scene breakdown.');
})();
