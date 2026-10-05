const $=s=>document.querySelector(s);
const v=$('#v'),cv=$('#c'),ctx=cv.getContext('2d');
let model,facing='environment',stream,preds=[],sel=null,frozen=false,last=0,thr=.5,tick=0,fpsT=performance.now(),seen=new Set(),dp=null;
let hist=[];try{hist=JSON.parse(localStorage.getItem('wii-hist')||'[]')}catch(e){}
let W={};try{W=JSON.parse(localStorage.getItem('wii-wiki')||'{}')}catch(e){}
let deep=false,auto=false,mob=null;
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function wk(n){if(W[n])return W[n];W[n]=['Looking this up…',''];
  fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(n.split(',')[0].trim().replace(/ /g,'_')))
   .then(r=>r.json()).then(j=>{const s=(j.extract||'').split('. ').slice(0,2).join('. ');
     if(!s&&!j.description){delete W[n];W[n]=['No description found for this one.','','Details'];return}
     W[n]=[j.description?cap(j.description)+'.':'',s,'Details'];try{localStorage.setItem('wii-wiki',JSON.stringify(W))}catch(e){}render()})
   .catch(()=>{delete W[n]});return W[n]}
const info=n=>K[n]||wk(n);
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),1800)};
async function cam(){
  if(stream)stream.getTracks().forEach(t=>t.stop());
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}},audio:false});
  v.srcObject=stream;await v.play();
}
async function load(backend){
  try{await tf.setBackend(backend);await tf.ready();
    model=await cocoSsd.load({base:'lite_mobilenet_v2'});
    await model.detect(tf.zeros([64,64,3],'int32')); // warm-up proves the backend works
    return true}catch(e){return false}
}
$('#go').onclick=async()=>{
  const m=$('#msg');m.textContent='';
  try{
    if(!navigator.mediaDevices)throw new Error('Camera needs HTTPS. Open the GitHub Pages link.');
    await cam();$('#gate').style.display='none';$('#st').textContent='loading AI';
    for(const b of ['webgpu','webgl','cpu'])if(await load(b)){$('#st').textContent=tf.getBackend();break}
    if(!model)throw new Error('Model failed to load. Check your internet and retry.');
    loop();
  }catch(e){m.textContent=e.name==='NotAllowedError'?'Camera permission denied. Allow it in browser settings.':e.message;$('#gate').style.display='flex'}
};
$('#flip').onclick=async()=>{facing=facing==='environment'?'user':'environment';try{await cam()}catch(e){}};
const cur=()=>preds.find(p=>p===sel)||preds[0];
function fit(){const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;cv.width=r.width*d;cv.height=r.height*d;ctx.setTransform(d,0,0,d,0,0);return r}
function map(p,r){const s=Math.max(r.width/v.videoWidth,r.height/v.videoHeight),ox=(r.width-v.videoWidth*s)/2,oy=(r.height-v.videoHeight*s)/2,[x,y,w,h]=p.bbox;return[x*s+ox,y*s+oy,w*s,h*s]}
function bracket(x,y,w,h,col,lw){const L=Math.min(22,w/3,h/3);ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.beginPath();
  [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([a,b,dx,dy])=>{ctx.moveTo(a+dx*L,b);ctx.lineTo(a,b);ctx.lineTo(a,b+dy*L)});ctx.stroke()}
function draw(){
  const r=fit(),c=cur(),t=performance.now()/1000;
  if(!frozen){const y=((t*.6)%1)*r.height;const g=ctx.createLinearGradient(0,y-30,0,y);g.addColorStop(0,'#2ef2ff00');g.addColorStop(1,'#2ef2ff33');ctx.fillStyle=g;ctx.fillRect(0,y-30,r.width,30)}
  preds.forEach(p=>{const[x,y,w,h]=map(p,r),on=p===c;
    ctx.fillStyle=on?'#2ef2ff14':'transparent';ctx.fillRect(x,y,w,h);bracket(x,y,w,h,on?'#2ef2ff':'#ffffffb0',on?4:2);
    const s=p.class+' '+Math.round(p.score*100);ctx.font='600 13px ui-monospace,monospace';const tw=ctx.measureText(s).width+12;
    ctx.fillStyle=on?'#2ef2ff':'#05080dcc';ctx.fillRect(x,Math.max(0,y-22),tw,22);ctx.fillStyle=on?'#02161a':'#fff';ctx.fillText(s,x+6,Math.max(15,y-6))});
}
function dom(p){const[x,y,w,h]=p.bbox,t=document.createElement('canvas');t.width=t.height=8;const g=t.getContext('2d');
  g.drawImage(v,x,y,w,h,0,0,8,8);const d=g.getImageData(0,0,8,8).data;let a=[0,0,0];for(let i=0;i<d.length;i+=4){a[0]+=d[i];a[1]+=d[i+1];a[2]+=d[i+2]}
  return'#'+a.map(n=>Math.round(n/(d.length/4)).toString(16).padStart(2,'0')).join('')}
function render(){
  const c=cur();$('#chips').innerHTML='';
  const cn={},sh=new Set();preds.forEach(p=>cn[p.class]=(cn[p.class]||0)+1);
  preds.forEach(p=>{if(sh.has(p.class))return;sh.add(p.class);const b=document.createElement('button');b.className='chip'+(p.class===(c&&c.class)?' on':'');b.textContent=p.class+(cn[p.class]>1?' x'+cn[p.class]:'');b.onclick=()=>{sel=p;render()};$('#chips').appendChild(b)});
  if(!c){$('#info').innerHTML='<p style="color:var(--mute)">Scanning. Hold steady, add light, keep the object centred. Tap a chip to choose one.</p>';return}
  const d=info(c.class),col=dom(c);
  $('#info').innerHTML=`<h1><span class="sw" style="background:${col}"></span>${c.class}</h1><div class="meter"><i style="width:${Math.round(c.score*100)}%"></i></div><small style="color:var(--mute)">${Math.round(c.score*100)}% confidence, dominant colour ${col}</small><div class="k">What it is</div><p>${d[0]}</p><div class="k">${d[2]||'What it is used for'}</div><p>${d[1]}</p>${d[2]?'<div class="src">Source: Wikipedia</div>':''}`;
}
function log(p){if(seen.has(p.class))return;seen.add(p.class);if(auto)setTimeout(say,300);navigator.vibrate&&navigator.vibrate(25);
  hist.unshift({c:p.class,t:Date.now(),col:dom(p)});hist=hist.slice(0,40);try{localStorage.setItem('wii-hist',JSON.stringify(hist))}catch(e){}}
async function loop(){
  requestAnimationFrame(loop);
  if(frozen||!model||v.readyState<2)return;
  const n=performance.now();if(n-last<120)return;last=n;
  const r=await model.detect(v,8);preds=r.filter(p=>p.score>=thr);
  if(deep&&mob&&!preds.length){const k=await mob.classify(v,3),t=k[0];
    if(t&&t.probability>.2){const w=v.videoWidth,h=v.videoHeight;preds=[{class:t.className.split(',')[0].trim(),score:t.probability,bbox:[w*.2,h*.2,w*.6,h*.6]}]}}
  if(sel)sel=preds.find(p=>p.class===sel.class)||null;
  preds.forEach(log);draw();render();
  if(++tick%5===0){$('#fps').textContent=Math.round(5000/(performance.now()-fpsT))+' fps';fpsT=performance.now()}
}
cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;
  const h=preds.find(p=>{const[x,y,w,hh]=map(p,r);return px>=x&&px<=x+w&&py>=y&&py<=y+hh});if(h){sel=h;render()}});
const freeze=()=>{frozen=!frozen;$('#freeze').textContent=frozen?'Resume':'Freeze';frozen?v.pause():v.play();$('#st').textContent=frozen?'frozen':tf.getBackend()};
const say=()=>{const c=cur();if(!c||!speechSynthesis)return toast('Nothing to read');const d=info(c.class);speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(`${c.class}. ${d[0]} ${d[1]}`))};
$('#freeze').onclick=freeze;$('#say').onclick=say;
$('#share').onclick=async()=>{const c=cur();if(!c)return toast('Nothing to share');const d=info(c.class),t=`${c.class}: ${d[0]} ${d[1]}`;
  try{navigator.share?await navigator.share({title:'WhatIsIt',text:t}):(await navigator.clipboard.writeText(t),toast('Copied'))}catch(e){}};
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
$('#mic').onclick=()=>{if(!SR)return toast('Voice not supported here');const r=new SR();r.lang='en-IN';
  r.onresult=e=>{const t=e.results[0][0].transcript.toLowerCase();/freeze|stop|resume/.test(t)?freeze():say()};r.onerror=()=>toast('Voice failed');r.start();toast('Say: what is this / freeze')};
$('#thr').oninput=e=>{thr=e.target.value/100;$('#tv').textContent=e.target.value+'%'};
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('#sheet>section').forEach(s=>s.hidden=s.id!==b.dataset.t);if(b.dataset.t==='hist')showHist()});
function showHist(){$('#hl').innerHTML=hist.length?hist.map(h=>`<div class="hi"><span class="sw" style="background:${h.col}"></span>${h.c}<small>${new Date(h.t).toLocaleString()}</small></div>`).join(''):'<p style="color:var(--mute)">No scans yet.</p>'}
$('#clr').onclick=()=>{hist=[];localStorage.removeItem('wii-hist');showHist()};
addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;$('#inst').hidden=false});
$('#inst').onclick=async()=>{if(dp){dp.prompt();dp=null;$('#inst').hidden=true}};
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));

const flip=(id,on)=>$(id).classList.toggle('on',on);
$('#deep').onclick=async()=>{deep=!deep;flip('#deep',deep);
  if(deep&&!mob){toast('Loading Deep ID (1000 objects)…');try{mob=await mobilenet.load({version:2,alpha:1.0});toast('Deep ID ready')}catch(e){deep=false;flip('#deep',false);toast('Deep ID failed to load')}}
  else toast(deep?'Deep ID on':'Deep ID off')};
$('#auto').onclick=()=>{auto=!auto;flip('#auto',auto);toast(auto?'Auto read on':'Auto read off')};
$('#snap').onclick=()=>{if(!v.videoWidth)return;const o=document.createElement('canvas');o.width=cv.width;o.height=cv.height;const g=o.getContext('2d'),s=Math.max(o.width/v.videoWidth,o.height/v.videoHeight);
  g.drawImage(v,(o.width-v.videoWidth*s)/2,(o.height-v.videoHeight*s)/2,v.videoWidth*s,v.videoHeight*s);g.drawImage(cv,0,0);
  o.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='whatisit-'+Date.now()+'.png';a.click();toast('Snapshot saved')})};
