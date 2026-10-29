'use strict';
/* SHOWDOWN — die Schlacht als Inszenierung.
   Die Engine (engine.js) rechnet den Kampf vorab und liefert Schnappschüsse mit Treffern (wer trifft wen, welche Art)
   und Ereignissen (Blutrausch, Frost, Heilung …). Hier wird daraus ein Film: Intro, Aufdecken, einzelne Angriffe mit
   Kamera, Partikeln und Klang, Herzschlag, wenn es knapp wird, Zeitlupe beim letzten Schlag und ein großes Finale.
   Braucht aus game.js: G, QA, SND, ac, cardHTML, plateHTML, comboLabel, fbTx, K, REALM, showOv, hideOv. */
(function(){
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scaleOf=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s'))||1;
const vib=p=>{try{if(navigator.vibrate)navigator.vibrate(p)}catch(e){}};
const R=(a,b)=>a+Math.random()*(b-a);

/* ================= Klang: alles live erzeugt, über einen Kompressor für Wucht ================= */
const A={bus:null,nb:null};
function bus(){const a=ac();if(!a)return null;if(!A.bus){const c=a.createDynamicsCompressor();c.threshold.value=-14;c.knee.value=8;c.ratio.value=5;c.attack.value=.002;c.release.value=.18;
  const g=a.createGain();g.gain.value=.9;c.connect(g).connect(a.destination);A.bus=c}return a}
function nbuf(a){if(!A.nb){const n=a.sampleRate*2,b=a.createBuffer(1,n,a.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=Math.random()*2-1;A.nb=b}return A.nb}
function osc(type,f0,f1,dur,vol,at=0,att=.004){const a=bus();if(!a)return;const t=a.currentTime+at,o=a.createOscillator(),g=a.createGain();o.type=type;
  o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g).connect(A.bus);o.start(t);o.stop(t+dur+.05)}
function nz(dur,vol,ftype,f0,f1,at=0,q=.8,att=.003){const a=bus();if(!a)return;const t=a.currentTime+at,s=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();
  s.buffer=nbuf(a);s.playbackRate.value=R(.9,1.1);fl.type=ftype;fl.Q.value=q;fl.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)fl.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(.0008,t+dur);s.connect(fl).connect(g).connect(A.bus);s.start(t,R(0,1));s.stop(t+dur+.05)}
const S={
  whoosh(p=1){if(!SND.on)return;nz(.24,.22*p,'bandpass',500,2600,0,1.4,.09)},
  impact(p){if(!SND.on)return;p=Math.min(1,p);osc('sine',150,42,.28+.25*p,.55+.35*p);nz(.07,.35+.3*p,'highpass',1800,1800);nz(.18+.2*p,.3+.3*p,'lowpass',900,240);
    if(p>.6){osc('square',1300,700,.12,.06);nz(.6,.25,'lowpass',260,60,.02)}},
  clang(){if(!SND.on)return;[523,1307,2093,2960].forEach((f,i)=>osc('sine',f,f*.995,.9-i*.15,.16/(i+1)));nz(.05,.3,'highpass',3000,3000)},
  fire(p=1){if(!SND.on)return;nz(.7,.32*p,'bandpass',700,1800,0,.6,.05);osc('sine',90,40,.45,.4*p);for(let i=0;i<6;i++)nz(.03,.18*p,'highpass',2500,2500,R(.05,.5))},
  roar(){if(!SND.on)return;osc('sawtooth',95,55,1.1,.2,0,.12);osc('sawtooth',142,70,1.1,.12,0,.12);nz(1.1,.35,'bandpass',420,180,0,.7,.15)},
  ice(){if(!SND.on)return;[2637,3520,4186,3136].forEach((f,i)=>osc('sine',f,f,.35,.07,i*.045));nz(.3,.22,'highpass',5000,7000)},
  poison(){if(!SND.on)return;for(let i=0;i<5;i++){const f=R(260,520);osc('sine',f,f*2.2,.09,.12,i*.07)}},
  heal(){if(!SND.on)return;[660,880,1320].forEach((f,i)=>osc('triangle',f,f,.4,.09,i*.07,.02))},
  rage(){if(!SND.on)return;osc('sawtooth',80,150,.5,.16,0,.05);nz(.4,.22,'lowpass',500,1200,0,.7,.05)},
  death(){if(!SND.on)return;osc('sawtooth',200,36,.9,.22,0,.01);nz(.35,.4,'lowpass',1400,200);nz(.08,.3,'highpass',2400,2400,.02)},
  heart(){if(!SND.on)return;osc('sine',62,40,.16,.75);osc('sine',58,38,.18,.55,.19)},
  drum(p=1){if(!SND.on)return;osc('sine',120,52,.45,.6*p);nz(.12,.25*p,'lowpass',1200,300)},
  flip(){if(!SND.on)return;nz(.09,.2,'bandpass',1600,3200,0,1.2,.01);osc('sine',220,110,.08,.15)},
  slam(){if(!SND.on)return;osc('sine',110,40,.35,.7);nz(.18,.4,'lowpass',700,150);nz(.04,.25,'highpass',2000,2000)},
  roll(){if(!SND.on)return;for(let i=0;i<14;i++)nz(.06,.06+i*.012,'lowpass',900,500,i*.055)},
  boom(){if(!SND.on)return;osc('sine',70,26,1.6,.9,0,.01);nz(1.4,.45,'lowpass',300,40,0,.7,.01);nz(.1,.4,'highpass',1500,1500)},
  rise(){if(!SND.on)return;nz(1,.25,'bandpass',300,2400,0,2,.6);osc('sine',220,440,1,.08,0,.5)},
  win(){if(!SND.on)return;const ch=[[261.6,329.6,392],[349.2,440,523.3],[392,493.9,587.3],[523.3,659.3,784,1046.5]],tt=[0,.22,.44,.7];
    ch.forEach((c,k)=>c.forEach(f=>{osc('sawtooth',f,f,k===3?1.6:.32,.07,tt[k],.03);osc('triangle',f*2,f*2,k===3?1.4:.25,.03,tt[k],.03)}));
    [0,.44,.7].forEach(t=>{osc('sine',98,45,.6,.55,t);nz(.4,.2,'lowpass',400,100,t)})},
  lose(){if(!SND.on)return;const ch=[[220,261.6,329.6],[174.6,220,261.6],[146.8,174.6,220]];ch.forEach((c,k)=>c.forEach(f=>osc('sawtooth',f,f*.98,k===2?2:.6,.06,k*.55,.12)));S.boom()}
};

/* Sobald audio/ geladen ist, klingen nur noch Aufnahmen und Orchesterschläge; die erzeugten Töne oben sind nur der Rückfall davor */
{const P=(n,o)=>{AU.sfx(n,o);return true},M={
  whoosh:(p=1)=>P('klinge',{vol:.35*p}),
  impact:p=>{P('schlag',{vol:.5+.4*Math.min(1,p)});if(p>.7)P('metall',{vol:.35});return true},
  clang:()=>P('glocke',{vol:.7}),
  fire:(p=1)=>p<.8?P('schwell',{vol:.35}):P('taiko',{vol:.55}),
  roar:()=>P('schwell',{vol:.6})&&P('taiko',{vol:.7,at:.5}),
  ice:()=>P('glas',{vol:.55,rate:1.2}),
  poison:()=>true,heal:()=>P('roehrenglocke',{vol:.3}),rage:()=>true,
  death:()=>P('pauketief',{vol:.55})&&P('stein',{vol:.45}),
  heart:()=>P('pauketief',{vol:.5,rate:1.25,vary:false}),
  drum:(p=1)=>P('pauke',{vol:.6*p}),flip:()=>P('karte',{vol:.6}),slam:()=>P('karte',{vol:.7}),
  roll:()=>P('paukenwirbel',{vol:.7}),boom:()=>P('pauketief',{vol:.8}),rise:()=>P('schwell',{vol:.45}),
  win:()=>(AU.sting('sieg'),true),lose:()=>(AU.sting('niederlage'),true)};
 for(const k of Object.keys(M)){const f=S[k];S[k]=(...a)=>{if(!SND.on)return;if(typeof AU!=='undefined'&&AU.ready){M[k](...a);return}f(...a)}}}
/* Kriegsruf eines Reichs, wenn ein Team aus mindestens drei seiner Karten besteht */
const VS={vargo:'Ich zähl schon mal dein Gold.',grauweid:'Die Krähen haben deinen Namen gerufen.',ysa:'Leise jetzt.',anselm:'Möge das Licht dir gnädig sein.',kalla:'Ich schmiede dich in Form.'};
/* Zwischenrufe der Gegner während der Schlacht: autsch = sie verlieren eine Karte, treffer = deine fällt */
const MID={vargo:{autsch:['Die war eh billig.','Das zahlst du mir!'],treffer:['Ha! Eine weniger.','Sauber getroffen.']},
  grauweid:{autsch:['Die Krähen lachen nicht mehr.','Ein Zeichen. Ein schlechtes.'],treffer:['Ich sah es kommen.','Die Knochen lügen nie.']},
  ysa:{autsch:['…','Hm.'],treffer:['Eins.','Weiter.']},
  anselm:{autsch:['Herr, steh mir bei!','Eine Prüfung, gewiss.'],treffer:['Das Licht richtet.','Gesegnet sei der Schlag.']},
  kalla:{autsch:['Verbogenes Eisen!','Nachschmieden!'],treffer:['Hart wie mein Amboss!','Funken fliegen!']}};
const RUF=['Für das letzte Licht!','Asche zu Asche!','Der Winter holt euch alle!','Blut für das Moor!'];

/* ================= Partikel: eigene Leinwand über dem Kampf ================= */
const FX={cv:null,ctx:null,P:[],on:false,w:0,h:0};
function fxStart(){if(FX.on)return;const cv=document.createElement('canvas');cv.id='bfx';document.body.appendChild(cv);FX.cv=cv;FX.ctx=cv.getContext('2d');
  const fit=()=>{const r=Math.min(2,devicePixelRatio||1);FX.w=innerWidth;FX.h=innerHeight;cv.width=FX.w*r;cv.height=FX.h*r;FX.ctx.setTransform(r,0,0,r,0,0)};fit();FX.fit=fit;addEventListener('resize',fit);
  FX.on=true;FX.P=[];let last=performance.now();
  (function tick(now){if(!FX.on)return;const dt=Math.min(3,(now-last)/16.67);last=now;const c=FX.ctx;c.clearRect(0,0,FX.w,FX.h);
    for(let i=FX.P.length-1;i>=0;i--){const p=FX.P[i];p.t+=dt;if(p.t>=p.life){FX.P.splice(i,1);continue}
      if(p.upd)p.upd(p,dt);p.vx+=(p.ax||0)*dt;p.vy+=(p.ay||0)*dt;const dr=Math.pow(p.drag||1,dt);p.vx*=dr;p.vy*=dr;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot=(p.rot||0)+(p.vr||0)*dt;
      const k=p.t/p.life,al=p.fade===false?1:(k<.1&&p.fin?k/.1:1-k*k);drawP(c,p,k,al)}
    requestAnimationFrame(tick)})(last)}
function fxStop(){FX.on=false;if(FX.cv){removeEventListener('resize',FX.fit);FX.cv.remove();FX.cv=null}FX.P=[]}
function add(p){if(RM&&FX.P.length>120)return;if(FX.P.length>520)FX.P.splice(0,40);p.t=0;FX.P.push(p);return p}
/* Leuchtpunkte einmal vorrechnen und dann nur noch kopieren: hält das Handy flüssig */
const SPR=new Map();
function sprite(c1,c2){const key=c1+'|'+(c2||'');let cv=SPR.get(key);if(cv)return cv;cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,c1);if(c2)g.addColorStop(.35,c2);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);SPR.set(key,cv);return cv}
function drawP(c,p,k,al){c.globalAlpha=Math.max(0,al)*(p.a||1);
  const sz=p.size*(p.grow?1+p.grow*k:1)*(p.shrink?1-k*.85:1);
  switch(p.type){
    case'glow':{c.globalCompositeOperation='lighter';c.drawImage(sprite(p.c,p.c2),p.x-sz,p.y-sz,sz*2,sz*2);c.globalCompositeOperation='source-over';break}
    case'smoke':{c.drawImage(sprite(p.c),p.x-sz,p.y-sz,sz*2,sz*2);break}
    case'shard':{c.save();c.translate(p.x,p.y);c.rotate(p.rot);c.fillStyle=p.c;c.beginPath();c.moveTo(0,-sz);c.lineTo(sz*.45,sz*.6);c.lineTo(-sz*.45,sz*.6);c.closePath();c.fill();
      if(p.edge){c.strokeStyle=p.edge;c.lineWidth=.8;c.stroke()}c.restore();break}
    case'ring':{c.globalCompositeOperation='lighter';c.strokeStyle=p.c;c.lineWidth=Math.max(.5,(p.lw||4)*(1-k));c.beginPath();c.ellipse(p.x,p.y,sz,sz*(p.flat||1),0,0,6.283);c.stroke();c.globalCompositeOperation='source-over';break}
    case'slash':{c.globalCompositeOperation='lighter';c.save();c.translate(p.x,p.y);c.rotate(p.rot);const L=p.len*(k<.25?k/.25:1),w=(p.lw||6)*(1-k);
      const g=c.createLinearGradient(-L/2,0,L/2,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,p.c);g.addColorStop(1,'rgba(255,255,255,0)');
      c.fillStyle=g;c.beginPath();c.moveTo(-L/2,0);c.quadraticCurveTo(0,-w,L/2,0);c.quadraticCurveTo(0,w*.4,-L/2,0);c.fill();c.restore();c.globalCompositeOperation='source-over';break}
    case'coin':{c.save();c.translate(p.x,p.y);c.scale(Math.max(.08,Math.abs(Math.cos(p.rot))),1);c.fillStyle='#e8b94a';c.strokeStyle='#6a4610';c.lineWidth=1.2;c.beginPath();c.arc(0,0,sz,0,6.283);c.fill();c.stroke();
      c.fillStyle='#fff1b0';c.globalAlpha*=.8;c.beginPath();c.arc(-sz*.3,-sz*.3,sz*.3,0,6.283);c.fill();c.restore();break}
    case'line':{c.globalCompositeOperation='lighter';c.strokeStyle=p.c;c.lineWidth=sz;c.lineCap='round';c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*(p.tail||3),p.y-p.vy*(p.tail||3));c.stroke();c.globalCompositeOperation='source-over';break}
    default:{c.fillStyle=p.c;c.beginPath();c.arc(p.x,p.y,sz,0,6.283);c.fill()}}
  c.globalAlpha=1}
/* Effekt-Bausteine (Bildschirmkoordinaten) */
const ctr=el=>{const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,r}};
const fx={
  sparks(x,y,col,n,pow=1){for(let i=0;i<n;i++){const a=R(0,6.283),v=R(2,7)*pow;add({type:'line',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,ay:.25,drag:.93,life:R(14,26),size:R(1.2,2.4),c:Math.random()<.5?'#fff3c0':col,tail:2.2})}},
  glow(x,y,col,size,life=18,c2){add({type:'glow',x,y,vx:0,vy:0,life,size,c:col,c2,grow:.4})},
  ring(x,y,col,size,life=20,flat=1,lw=5){add({type:'ring',x,y,vx:0,vy:0,life,size:size*.2,grow:4,c:col,flat,lw})},
  slash(x,y,ang,len,col='rgba(255,250,235,.95)'){add({type:'slash',x,y,vx:0,vy:0,rot:ang,len,c:col,life:14,lw:7,fade:true})},
  embers(x,y,n,spread=20){for(let i=0;i<n;i++)add({type:'glow',x:x+R(-spread,spread),y:y+R(-spread*.5,spread*.5),vx:R(-.6,.6),vy:R(-2.4,-.6),ay:-.02,drag:.98,life:R(30,60),size:R(2,5),c:'rgba(255,200,90,1)',c2:'rgba(255,90,20,.6)',fin:1})},
  fire(x,y,s=1){fx.glow(x,y,'rgba(255,220,150,.7)',40*s,14,'rgba(200,60,10,.25)');for(let i=0;i<34*s;i++){const a=R(0,6.283),v=R(1,5.5)*s;
      add({type:'glow',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1.2,ay:-.07,drag:.93,life:R(16,36),size:R(3,8)*s,c:Math.random()<.4?'rgba(255,245,200,.9)':'rgba(255,160,60,.85)',c2:'rgba(200,40,5,.25)',shrink:1})}
    for(let i=0;i<10*s;i++)add({type:'smoke',x:x+R(-12,12),y:y+R(-8,8),vx:R(-.5,.5),vy:R(-1.4,-.4),drag:.98,life:R(40,70),size:R(14,26)*s,grow:1,c:'rgba(40,25,15,.35)'});fx.embers(x,y,10*s)},
  ice(x,y){fx.glow(x,y,'rgba(225,245,255,1)',46,14,'rgba(120,190,255,.6)');for(let i=0;i<18;i++){const a=R(0,6.283),v=R(2,6);
      add({type:'shard',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,ay:.18,drag:.95,life:R(22,40),size:R(3,7),rot:R(0,6),vr:R(-.3,.3),c:'rgba(215,240,255,.95)',edge:'rgba(120,180,240,.9)'})}fx.ring(x,y,'rgba(190,230,255,.9)',40,18)},
  poison(x,y){for(let i=0;i<14;i++)add({type:'glow',x:x+R(-18,18),y:y+R(-10,14),vx:R(-.3,.3),vy:R(-1.8,-.5),drag:.98,life:R(24,46),size:R(3,7),c:'rgba(190,255,120,1)',c2:'rgba(60,160,40,.6)',fin:1});
    for(let i=0;i<5;i++)add({type:'smoke',x:x+R(-14,14),y:y+R(-6,6),vx:0,vy:-.4,life:50,size:R(14,22),grow:.8,c:'rgba(90,170,60,.28)'})},
  heal(x,y){for(let i=0;i<12;i++)add({type:'glow',x:x+R(-18,18),y:y+R(-6,16),vx:0,vy:R(-1.6,-.7),life:R(30,50),size:R(3,6),c:'rgba(210,255,190,1)',c2:'rgba(90,200,90,.6)',fin:1})},
  rage(x,y,w=60,h=84){for(let i=0;i<22;i++)add({type:'glow',x:x+R(-w/2,w/2),y:y+R(-h/3,h/2),vx:R(-.2,.2),vy:R(-2.6,-1),life:R(18,34),size:R(2.5,5),c:'rgba(255,90,70,.95)',c2:'rgba(140,0,0,.25)',fin:1});
    for(let i=0;i<4;i++)add({type:'smoke',x:x+R(-w/3,w/3),y:y+R(-h/4,h/4),vx:0,vy:-.6,life:40,size:R(16,24),grow:.6,c:'rgba(150,10,10,.3)'})},
  gold(x,y,w,h){fx.glow(x,y,'rgba(255,240,180,1)',w*.9,20,'rgba(255,190,60,.6)');for(let i=0;i<24;i++){const a=R(0,6.283),v=R(2,6);
      add({type:'shard',x:x+R(-w/3,w/3),y:y+R(-h/3,h/3),vx:Math.cos(a)*v,vy:Math.sin(a)*v,ay:.2,drag:.95,life:R(24,44),size:R(3,6),rot:R(0,6),vr:R(-.3,.3),c:'rgba(255,225,130,.95)',edge:'rgba(150,100,20,.9)'})}fx.ring(x,y,'rgba(255,220,120,.95)',w*.7,20)},
  ash(r){for(let i=0;i<46;i++)add({type:Math.random()<.3?'glow':'dot',x:R(r.left,r.right),y:R(r.top,r.bottom),vx:R(-1,1),vy:R(-2.2,.4),ay:.05,drag:.97,life:R(30,70),size:R(1.2,3.2),
      c:Math.random()<.3?'rgba(255,150,60,1)':Math.random()<.5?'#2a221c':'#5a4c40',c2:'rgba(200,60,10,.5)'});
    for(let i=0;i<6;i++)add({type:'smoke',x:R(r.left,r.right),y:R(r.top,r.bottom),vx:R(-.4,.4),vy:R(-1,-.2),life:R(50,80),size:R(18,30),grow:1.2,c:'rgba(30,20,14,.45)'})},
  column(x,top,bottom,col){for(let i=0;i<30;i++)add({type:'glow',x:x+R(-14,14),y:R(top,bottom),vx:0,vy:R(-3,-1),life:R(20,40),size:R(4,9),c:col,c2:'rgba(160,20,30,.5)',fin:1});fx.glow(x,(top+bottom)/2,col,90,26)},
  coins(x,y,n){for(let i=0;i<n;i++){const a=R(-2.6,-.5);add({type:'coin',x,y,vx:Math.cos(a)*R(2,7),vy:Math.sin(a)*R(5,11),ay:.38,drag:.99,life:R(50,80),size:R(4,7),rot:R(0,6),vr:R(.15,.4),fade:false})}},
  smokeRow(r,col){for(let i=0;i<16;i++)add({type:'smoke',x:R(r.left,r.right),y:R(r.top,r.bottom),vx:R(-.4,.4),vy:R(-.6,.1),life:R(50,80),size:R(20,36),grow:.8,c:col})},
  bolt(from,to,col,dur,onHit){const steps=Math.max(1,dur/16.67);const p=add({type:'glow',x:from.x,y:from.y,vx:(to.x-from.x)/steps,vy:(to.y-from.y)/steps,life:steps,size:9,c:'rgba(255,250,230,1)',c2:col,fade:false,
      upd:(q)=>{for(let k=0;k<2;k++)add({type:'glow',x:q.x+R(-3,3),y:q.y+R(-3,3),vx:R(-.5,.5),vy:R(-.5,.5)-.3,life:R(10,20),size:R(2.5,5),c:col,c2:'rgba(120,20,0,.2)',shrink:1})}});setTimeout(onHit,dur)}
};

/* ================= Showdown ================= */
let lastHand=-1,nInHand=0;
async function playBattle(x){
  const me=G.players[0],mineA=x.A===me,Pm=mineA?x.A:x.B,Pe=mineA?x.B:x.A;
  const opp=(Pe.short||'').toLowerCase(),myIdx=mineA?0:1,enIdx=1-myIdx,snaps=x.r.snaps,teams=[x.A.team.team,x.B.team.team];
  if(lastHand!==G.hand){lastHand=G.hand;nInHand=0}nInHand++;
  const first=nInHand===1;let speed=first?1:1.6,skip=false,all=false;
  /* Zeit: alles läuft über wait(), Überspringen weckt sofort */
  let wk=null,wt=null;const wake=()=>{clearTimeout(wt);if(wk){const f=wk;wk=null;f()}};
  const D=ms=>QA?ms*.04:ms/speed;
  const wait=ms=>skip?Promise.resolve():new Promise(r=>{wk=r;wt=setTimeout(()=>{wk=null;r()},D(ms))});
  const later=(ms,fn)=>skip?fn():setTimeout(fn,D(ms));

  const lane=(P,cls,idx)=>`<div class="lanes ${cls}" id="${cls==='me'?'bp':'be'}">${P.team.team.map((f,i)=>`<div class="slotc" data-i="${i}">${cardHTML(f.c,{cls:'xs'+(f.sup?' sup':''),st:[f.atk,f.hp],up:f.up||0,fx:f})}<i class="hpb2"><b class="g"></b><b class="v"></b></i></div>`).join('')}</div>`;
  const heroBox=(P,cls,name)=>`<div class="bhero ${cls}">${plateHTML(P)}<div class="bt"><b>${name}</b><span>${comboLabel(P.team.b)} · ${fbTx(P.team.b.cat)}</span></div></div>`;
  showOv(`<div id="battle" class="canvas page sd${first?' intro':''}">
    <div class="arena">
      ${heroBox(Pe,'e',Pe.name)}<div class="sp"></div>
      ${lane(Pe,'en')}
      <div class="bmid"><div class="blbl" id="bl">&nbsp;</div><div class="tug" aria-hidden="true"><i class="tm"></i><i class="te"></i><b class="tk"></b></div><div class="bstake" id="bs"></div><div class="bnote" id="bn"></div></div>
      ${lane(Pm,'me')}
      <div class="sp"></div>${heroBox(Pm,'m','Du')}
      <div class="bfoot"><button class="plate btn ghost" data-x="fast">${speed>1?'Normal':'Schneller'}</button><button class="plate btn ghost" data-x="skip">Überspringen</button></div>
    </div>
    <div class="lbox t"></div><div class="lbox b"></div><div class="vig"></div><div class="bflash"></div><div id="bfl"></div></div>`,true);
  const B=$('#battle'),arena=B.querySelector('.arena'),fl=$('#bfl'),ov=$('#ov');
  fxStart();
  ov.onclick=e=>{const b=e.target.closest('[data-x]');if(!b)return;
    if(b.dataset.x==='fast'){speed=speed>1?1:1.8;b.textContent=speed>1?'Normal':'Schneller'}
    if(b.dataset.x==='skip'){skip=true;wake()}
    if(b.dataset.x==='all'){all=true;skip=true;wake()}
    if(b.dataset.x==='next')wake()};

  const slots=side=>[...B.querySelectorAll('#'+(side===myIdx?'bp':'be')+' .slotc')];
  const cardEl=(s,i)=>{const sl=slots(s)[i];return sl&&sl.querySelector('.card')};
  const maxHp=(s,i)=>Math.max(1,teams[s][i].max);
  const cur=[snaps[0].st[0].map(o=>o.hp),snaps[0].st[1].map(o=>o.hp)],atk=[snaps[0].st[0].map(o=>o.atk),snaps[0].st[1].map(o=>o.atk)];
  const startTot=[0,1].map(s=>cur[s].reduce((a,b)=>a+b,0)||1);
  /* Erzählung: wer liegt vorn, wer trifft wie oft, wer ist der Held der Schlacht */
  const bonus=Math.floor((G.hand-1)/DMG_EVERY),kills=new Map(),dealt=new Map(),said=new Set();let leadBy=0,turned=0,blood=false,duel=false,midN=0,fought=false,streaks=0;
  const key=a=>a[0]+':'+a[1];
  let alive=[snaps[0].st[0].map(o=>o.alive),snaps[0].st[1].map(o=>o.alive)];

  /* Anzeige der Werte */
  const setStat=(s,i,pop)=>{const c=cardEl(s,i);if(!c)return;const sl=c.parentNode,h=Math.max(0,cur[s][i]);
    const hp=c.querySelector('.hpb'),at=c.querySelector('.at');if(hp.textContent!=String(h)){hp.textContent=h;if(pop)bump(hp)}if(at.textContent!=String(atk[s][i])){at.textContent=atk[s][i];if(pop)bump(at)}
    const pct=Math.max(0,Math.min(1,h/maxHp(s,i)));const v=sl.querySelector('.hpb2 .v'),g=sl.querySelector('.hpb2 .g');v.style.width=pct*100+'%';
    v.style.background=pct>.5?'linear-gradient(#9be06a,#3f9a2a)':pct>.25?'linear-gradient(#f4d36a,#c48a16)':'linear-gradient(#ff8a6a,#b3200f)';
    clearTimeout(g._t);g._t=setTimeout(()=>{g.style.width=pct*100+'%'},skip?0:D(380))};
  const bump=el=>{el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')};
  const tug=()=>{const t=[0,1].map(s=>cur[s].reduce((a,b,i)=>a+(alive[s][i]?Math.max(0,b):0),0)),m=t[myIdx],e=t[enIdx],sh=m+e?m/(m+e):.5;
    B.querySelector('.tug .tm').style.width=sh*100+'%';B.querySelector('.tug .tk').style.left=sh*100+'%';
    /* Worum es gerade geht: Thron-Schaden, falls der Kampf jetzt endete (1 + Überlebende des Führenden + Nacht-Zuschlag) */
    const n=[0,1].map(s=>alive[s].filter((v,i)=>v&&cur[s][i]>0).length),ld=n[myIdx]!==n[enIdx]?(n[myIdx]>n[enIdx]?myIdx:enIdx):(sh>.5?myIdx:sh<.5?enIdx:-1),bs=$('#bs');
    if(bs){if(!fought){bs.className='bstake';bs.innerHTML=`Es geht um bis zu <b>${6+bonus}</b> Thron`}else if(ld<0)bs.innerHTML='Ausgeglichen';else{const d=1+n[ld]+bonus;bs.className='bstake '+(ld===myIdx?'up':'dn');bs.innerHTML=ld===myIdx?`${Pe.short} verliert <b>${d}</b> Thron`:`Du verlierst <b>${d}</b> Thron`}}
    return{m:m/startTot[myIdx],e:e/startTot[enIdx],ld}};
  for(const s of[0,1])for(let i=0;i<5;i++)setStat(s,i,false);tug();

  /* Kamera und Bildschirm */
  const shake=(p)=>{if(RM||skip)return;const m=4+14*Math.min(1,p);arena.animate([{transform:'translate(0,0)'},{transform:`translate(${R(-m,m)}px,${R(-m,m)}px) rotate(${R(-.6,.6)*p}deg)`},
      {transform:`translate(${R(-m,m)*.6}px,${R(-m,m)*.6}px)`},{transform:`translate(${R(-m,m)*.3}px,${R(-m,m)*.3}px)`},{transform:'translate(0,0)'}],{duration:D(300+200*p),easing:'ease-out'})};
  const flash=(col='#fff',a=.8,ms=260)=>{if(skip)return;const f=B.querySelector('.bflash');f.style.background=col;f.animate([{opacity:a},{opacity:0}],{duration:D(ms),easing:'ease-out'})};
  const callout=(el,txt,cls='')=>{if(skip||!el)return;const bR=B.getBoundingClientRect(),r=el.getBoundingClientRect(),s=scaleOf(),d=document.createElement('div');
    d.className='bcall '+cls;d.textContent=txt;d.style.left=((r.left+r.width/2-bR.left)/s)+'px';d.style.top=((r.top-bR.top)/s)+'px';fl.appendChild(d);setTimeout(()=>d.remove(),D(1300)+200)};
  const dmgNum=(el,d,{crit,cls}={})=>{if(skip||!el)return;const bR=B.getBoundingClientRect(),r=el.getBoundingClientRect(),s=scaleOf(),n=document.createElement('div');
    n.className='bdmg '+(crit?'crit ':'')+(cls||'');n.textContent=d===0?'0':'−'+d;n.style.left=((r.left+r.width/2-bR.left)/s+R(-8,8))+'px';n.style.top=((r.top+r.height*.35-bR.top)/s)+'px';
    n.style.setProperty('--fs',(1.5+Math.min(1.6,d/12))+'rem');fl.appendChild(n);setTimeout(()=>n.remove(),D(1100)+200)};
  const stamp=(big,small,cls='')=>{if(skip)return;const d=document.createElement('div');d.className='bstamp '+cls;d.innerHTML=`${small?`<span>${small}</span>`:''}<b>${big}</b>`;B.appendChild(d);setTimeout(()=>d.remove(),D(1250)+100)};
  const label=t=>{$('#bl').textContent=t};
  const note=s=>{$('#bn').innerHTML=(s.notes||[]).filter(n=>!/^Stärkste Karte|Karten? fall/.test(n)).slice(-2).join('<br>')};

  /* ---------- 1. Intro: Kinobalken, Gegner gegen dich ---------- */
  B.classList.add('cine');
  if(!skip){
    if(first){
      const it=document.createElement('div');it.className='bintro';
      it.innerHTML=`<div class="bi e">${plateHTML(Pe)}<b>${Pe.name}</b><span>${comboLabel(Pe.team.b)}</span>${VS[opp]?`<i class="bq">»${VS[opp]}«</i>`:''}</div><div class="bivs"><i></i><b>gegen</b><i></i></div><div class="bi m">${plateHTML(Pm)}<b>Du</b><span>${comboLabel(Pm.team.b)}</span></div>`;
      B.appendChild(it);au('sting','duell');au('sfx','schwert',{vol:.6,at:.15});S.roll();await wait(520);S.slam();shake(.5);vib(30);await wait(380);
      const vs=it.querySelector('.bivs').getBoundingClientRect();fx.sparks(vs.left+vs.width/2,vs.top+vs.height/2,'#ffcf6a',36,1.4);fx.ring(vs.left+vs.width/2,vs.top+vs.height/2,'rgba(255,210,120,.9)',90,24,.5);S.clang();flash('#ffe9b0',.35);
      await wait(1150);it.classList.add('out');await wait(380);it.remove()}
    else{stamp(Pe.short,'Nächster Gegner','nx');S.drum();au('sfx','schwert',{vol:.5});await wait(700)}
  }else B.querySelector('.bintro')&&B.querySelector('.bintro').remove();

  /* ---------- 2. Aufdecken: Gegner umdrehen, deine Karten aufschlagen ---------- */
  const enC=slots(enIdx).map(sl=>sl.querySelector('.card')),myC=slots(myIdx).map(sl=>sl.querySelector('.card'));
  if(!skip){
    enC.forEach(c=>c.classList.add('fd'));myC.forEach(c=>c.parentNode.classList.add('pre'));B.classList.add('revealing');
    label('Aufstellung');
    for(let i=0;i<5;i++){const c=enC[i];S.flip();c.animate([{transform:'perspective(600px) rotateY(0)'},{transform:'perspective(600px) rotateY(90deg)',offset:.5},{transform:'perspective(600px) rotateY(0)'}],{duration:D(360),easing:'ease-in-out'});
      later(180,()=>c.classList.remove('fd'));await wait(first?170:90)}
    await wait(160);
    for(let i=0;i<5;i++){const sl=myC[i].parentNode;sl.classList.remove('pre');S.slam();vib(15);
      sl.animate([{transform:'translateY(110px) scale(1.35)',opacity:0},{transform:'translateY(-6px) scale(1.04)',opacity:1,offset:.7},{transform:'none'}],{duration:D(300),easing:'cubic-bezier(.2,.9,.3,1.2)'});
      later(200,()=>{const p=ctr(myC[i]);fx.sparks(p.x,p.y+p.h/2,'#c8a060',8,.6);add({type:'smoke',x:p.x,y:p.y+p.h/2,vx:0,vy:-.3,life:30,size:30,grow:1,c:'rgba(60,40,25,.35)'})});await wait(first?150:80)}
    B.classList.remove('revealing');await wait(250);
    /* Formation: Glanz läuft über die Reihe */
    for(const[side,P]of[[enIdx,Pe],[myIdx,Pm]]){const bo=K.FB[P.team.b.cat];if(!bo)continue;
      const L=B.querySelector(side===myIdx?'#bp':'#be');L.classList.remove('aura');void L.offsetWidth;L.classList.add('aura');S.rise();
      callout(L.children[2].querySelector('.card'),`${comboLabel(P.team.b).split(' · ')[0]}: alle +${bo}/+${bo}`,'form');await wait(520)}
    /* Kriegsruf, wenn ein Team aus mindestens drei Karten eines Reichs besteht */
    for(const[side,P]of[[myIdx,Pm],[enIdx,Pe]]){const n=[0,0,0,0];P.team.team.forEach(f=>n[f.s]++);const r=n.findIndex(v=>v>=3);
      if(r>=0){callout(B.querySelector(side===myIdx?'#bp':'#be').children[2].querySelector('.card'),RUF[r],'blood');await wait(900);break}}
  }else enC.forEach(c=>c.classList.remove('fd'));
  B.classList.remove('cine');

  /* ---------- 3. Runden ---------- */
  const lastIdx=snaps.length-1,endSt=snaps[lastIdx].st,endAlive=[endSt[0].some(o=>o.alive),endSt[1].some(o=>o.alive)];
  const decisive=endAlive[0]!==endAlive[1]||(!endAlive[0]&&!endAlive[1]);
  let round=0,clutch=false,hb=null,killer=0;const cried=new Set();
  const startClutch=()=>{if(clutch||skip)return;clutch=true;B.classList.add('clutch');S.heart();hb=setInterval(()=>{if(!skip)S.heart()},Math.max(500,D(950)))};
  const sideName=s=>s===myIdx?'Du':Pe.short;

  /* Aktionen eines Schnappschusses bauen: Angriff, Feuerball, Feueratem, Ticks */
  const actionsOf=s=>{const acts=[];
    for(const h of s.hits){const k=h.k;
      if(k==='splash'){const m=[...acts].reverse().find(a=>a.type==='atk'&&a.a&&h.a&&a.a[0]===h.a[0]&&a.a[1]===h.a[1]);if(m){m.extra.push(h);continue}}
      if(k==='breath'){let m=acts.find(a=>a.type==='breath'&&a.a[0]===h.a[0]&&a.a[1]===h.a[1]);if(!m){m={type:'breath',a:h.a,hits:[],pr:0};acts.push(m)}m.hits.push(h);continue}
      if((k==='atk'||k==='last')&&h.a){acts.push({type:'atk',a:h.a,main:h,extra:[],pr:k==='last'?2:1,last:k==='last'});continue}
      if(k==='fire'&&h.a){acts.push({type:'bolt',a:h.a,hits:[h],pr:0});continue}
      acts.push({type:'tick',hits:[h],pr:3,k})}
    /* Abwechselnd: deine Bahn 1, Gegner Bahn 1, deine Bahn 2 … */
    return acts.map((a,n)=>({a,n})).sort((p,q)=>p.a.pr-q.a.pr||(p.a.pr===1?(p.a.a[1]-q.a.a[1])||((p.a.a[0]===myIdx?0:1)-(q.a.a[0]===myIdx?0:1)):p.n-q.n)).map(p=>p.a)};

  const applyHit=(h,{crit}={})=>{const c=cardEl(h.s,h.i);if(!c)return;const p=ctr(c);fought=true;
    if(h.sh){S.clang();fx.gold(p.x,p.y,p.w,p.h);callout(c,'Gottesschild bricht!','gold');c.classList.remove('shd');vib(20);return}
    cur[h.s][h.i]-=h.d;setStat(h.s,h.i,true);
    const big=h.d/maxHp(h.s,h.i),kill=cur[h.s][h.i]<=0;crit=crit||big>=.45||kill;
    dmgNum(c,h.d,{crit,cls:h.k==='psn'?'psn':h.k==='fire'||h.k==='breath'?'fire':''});
    c.classList.remove('hit');void c.offsetWidth;c.classList.add('hit');
    if(kill){c.classList.add('doom')}
    if(h.a&&h.a[0]!==h.s){const k=key(h.a);dealt.set(k,(dealt.get(k)||0)+Math.max(0,h.d+Math.min(0,cur[h.s][h.i])));
      if(kill){const n=(kills.get(k)||0)+1;kills.set(k,n);if(n>=2&&streaks++<2){const a=cardEl(h.a[0],h.a[1]);later(250,()=>callout(a,n===2?'Doppelschlag!':n===3?'Gemetzel!':'Unaufhaltsam!','gold'));S.clang()}}}
    if(!kill&&cur[h.s][h.i]===1&&!said.has('1:'+key([h.s,h.i]))){said.add('1:'+key([h.s,h.i]));later(300,()=>callout(c,'Mit 1 Leben!','gold'))}
    tug()};

  const doAttack=async(act,slow)=>{const {a,main}=act,att=cardEl(a[0],a[1]),tgt=cardEl(main.s,main.i);if(!att||!tgt)return;
    const s=scaleOf(),A0=ctr(att),T0=ctr(tgt),dx=(T0.x-A0.x)/s,dy=(T0.y-A0.y)/s,dist=Math.hypot(dx,dy)||1,ux=dx/dist,uy=dy/dist;
    const reach=Math.max(0,dist-(A0.h/s)*.62),tot=slow?1500:520,hitAt=.6;
    att.parentNode.classList.add('act');
    const fin=att.animate([{transform:'translate(0,0) scale(1) rotate(0)'},{transform:`translate(${-ux*14}px,${-uy*14}px) scale(1.14) rotate(${ux*-4}deg)`,offset:.32},
      {transform:`translate(${ux*reach}px,${uy*reach}px) scale(1.2) rotate(${ux*3}deg)`,offset:hitAt},{transform:`translate(${ux*reach*.82}px,${uy*reach*.82}px) scale(1.12)`,offset:.72},
      {transform:'translate(0,0) scale(1) rotate(0)'}],{duration:D(tot),easing:'cubic-bezier(.45,0,.25,1)'});
    later(tot*.3,()=>S.whoosh(slow?1.4:1));
    await wait(tot*hitAt);
    /* Treffer */
    const p=ctr(tgt),col=REALM[teams[a[0]][a[1]].s].col,dmg=main.sh?0:main.d,pw=Math.min(1,dmg/Math.max(8,maxHp(main.s,main.i)*.5));
    if(!skip){fx.slash(p.x,p.y,Math.atan2(uy,ux)+R(-.5,.5)+Math.PI/2,p.w*1.5);fx.sparks(p.x,p.y,col,10+pw*18,.8+pw);fx.glow(p.x,p.y,'rgba(255,245,220,.8)',18+pw*26,10,'rgba(255,200,140,.15)');
      if(pw>.5)fx.ring(p.x,p.y,'rgba(255,230,190,.9)',p.w*.9,18,.6);if(teams[a[0]][a[1]].frost&&!main.sh)fx.ice(p.x,p.y)}
    if(!main.sh)S.impact(slow?1:pw);shake(slow?1:pw*.8);vib(slow?[60,30,90]:Math.round(15+pw*40));
    applyHit(main,{crit:slow});for(const h of act.extra){applyHit(h);const q=ctr(cardEl(h.s,h.i)||tgt);if(!skip)fx.sparks(q.x,q.y,'#ffb070',8,.7)}
    if(act.last)callout(att,'Todesstoß!','blood');
    if(slow&&!skip){flash(`radial-gradient(circle at ${(p.x/innerWidth*100).toFixed(0)}% ${(p.y/innerHeight*100).toFixed(0)}%,rgba(255,255,255,.95),rgba(255,230,190,.25) 35%,transparent 70%)`,.85,600);fx.ring(p.x,p.y,'rgba(255,255,255,.95)',p.w*2.2,30,.7,8);fx.sparks(p.x,p.y,'#fff',40,1.8)}
    /* Trefferstopp: bei großen Treffern friert das Bild kurz ein */
    if(pw>.55&&!skip){fin.pause();await wait(slow?260:90);fin.play()}
    later(tot*(1-hitAt),()=>att.parentNode.classList.remove('act'))};

  const doBolt=async act=>{const att=cardEl(act.a[0],act.a[1]),h=act.hits[0],tgt=cardEl(h.s,h.i);if(!att||!tgt)return;
    const f=teams[act.a[0]][act.a[1]],from=ctr(att),to=ctr(tgt);bump(att);
    callout(att,f.sup==='funke'?'Funke':'Glut','fire');S.fire(.6);
    if(!skip)await new Promise(r=>fx.bolt(from,to,'rgba(255,120,30,.8)',D(380),r));
    if(!skip)fx.fire(to.x,to.y,.8);S.fire(1);shake(.4);applyHit(h);await wait(160)};

  const doBreath=async act=>{const att=cardEl(act.a[0],act.a[1]);if(!att)return;const from=ctr(att);
    callout(att,'Feueratem!','fire');S.roar();att.animate([{transform:'scale(1)'},{transform:'scale(1.25) translateY(-6px)'},{transform:'scale(1)'}],{duration:D(900)});
    await wait(380);const L=B.querySelector(act.hits[0].s===myIdx?'#bp':'#be').getBoundingClientRect();
    if(!skip)for(let i=0;i<140;i++){const t=(i%60)/60;add({type:'glow',x:from.x+R(-10,10),y:from.y,vx:(L.left+t*L.width-from.x)/26+R(-1.2,1.2),vy:(L.top+L.height/2-from.y)/26+R(-1.2,1.2),drag:.99,life:R(24,36),size:R(4,9),c:Math.random()<.35?'rgba(255,245,200,.95)':'rgba(255,150,50,.85)',c2:'rgba(200,40,5,.2)',grow:1.2})}
    S.fire(1.3);flash('rgba(255,140,40,1)',.35,500);shake(.8);vib([40,20,40]);await wait(330);
    for(const h of act.hits){applyHit(h);const c=cardEl(h.s,h.i);if(c&&!skip){const p=ctr(c);fx.fire(p.x,p.y,.55)}await wait(70)}await wait(250)};

  const doTicks=async list=>{if(!list.length)return;
    for(const act of list)for(const h of act.hits){const c=cardEl(h.s,h.i);if(!c)continue;const p=ctr(c);
      if(h.k==='psn'){if(!skip)fx.poison(p.x,p.y);S.poison()}else if(h.k==='fire'){if(!skip)fx.fire(p.x,p.y,.7);S.fire(.8);callout(c,'Flächenbrand','fire')}else{if(!skip)fx.sparks(p.x,p.y,'#ffb070',8)}
      applyHit(h);await wait(140)}
    await wait(200)};

  const doEvents=async(evs,phase)=>{for(const e of evs){const c=e.i!=null?cardEl(e.s,e.i):null,p=c&&ctr(c);
    if(phase==='pre'){
      if(e.t==='rage'&&c){if(!skip)fx.rage(p.x,p.y,p.w,p.h);S.rage();callout(c,'Blutrausch +'+e.n,'blood');await wait(120)}
      else if(e.t==='fear'&&c){if(!skip)fx.smokeRow(p.r,'rgba(80,30,110,.45)');callout(c,'Grauen −2','dark');await wait(200)}
      else if(e.t==='pest'){const L=B.querySelector(e.s===myIdx?'#bp':'#be');if(!skip)fx.smokeRow(L.getBoundingClientRect(),'rgba(110,170,60,.35)');S.poison();callout(L.children[2].querySelector('.card'),'Pest!','psn');await wait(450)}
      else if(e.t==='frz'&&e.by&&c){const a=cardEl(e.by[0],e.by[1]);if(a&&!skip){const q=ctr(a);await new Promise(r=>fx.bolt(q,p,'rgba(140,200,255,.8)',D(340),r))}if(!skip)fx.ice(p.x,p.y);S.ice();callout(c,'Erstarrt','ice');c.classList.add('frz');await wait(200)}
      else if(e.t==='stand'&&c){const r=c.getBoundingClientRect();B.classList.add('stamping');stamp('Letztes Aufgebot',e.s===myIdx?'Deine letzte Karte':'Die letzte Gegnerkarte','sm');
        if(!skip)fx.column(r.left+r.width/2,r.top-50,r.bottom,'rgba(255,200,90,1)');S.roar();vib([40,30,80]);await wait(700);B.classList.remove('stamping');
        atk[e.s][e.i]+=e.n;cur[e.s][e.i]+=e.n;setStat(e.s,e.i,true);c.classList.add('lastst');callout(c,'+'+e.n+'/+'+e.n,'gold');await wait(500)}
      else if(e.t==='skip'&&c){c.animate([{transform:'translateX(0)'},{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}],{duration:D(260)});callout(c,'Erstarrt – setzt aus','ice');S.ice();await wait(220)}}
    else if(phase==='after'){
      if(e.t==='rache'&&!skip){const L=slots(e.s).filter((sl,i)=>alive[e.s][i]);if(!L.length)continue;S.rage();
        L.forEach(sl=>{const q=ctr(sl.querySelector('.card'));fx.glow(q.x,q.y,'rgba(255,90,60,.8)',34,18,'rgba(160,20,10,.3)')});
        callout(L[Math.floor(L.length/2)].querySelector('.card'),'Vergeltung +'+e.n,'blood');await wait(380)}}
    else{
      if(e.t==='heal'&&c){if(!skip)fx.heal(p.x,p.y);S.heal();cur[e.s][e.i]+=e.n;setStat(e.s,e.i,true);dmgNum(c,0,{cls:'heal'});const n=fl.lastChild;if(n)n.textContent='+'+e.n;await wait(160)}
      else if(e.t==='frz'&&!e.by&&c){if(!skip)fx.ice(p.x,p.y);S.ice();callout(c,'Erstarrt','ice');c.classList.add('frz');await wait(140)}
      else if(e.t==='psn'&&c){if(!skip)fx.poison(p.x,p.y);callout(c,'Vergiftet','psn');await wait(120)}
      else if(e.t==='grow'&&c){callout(c,'+'+e.n+'/+'+e.n,'dark');await wait(100)}
      else if(e.t==='buff'){S.rage();slots(e.s).forEach((sl,i)=>{if(alive[e.s][i]){const q=ctr(sl.querySelector('.card'));if(!skip)fx.glow(q.x,q.y,'rgba(255,230,150,.9)',40,20)}});callout(slots(e.s)[2].querySelector('.card'),'Herold: alle +'+e.n+' Angriff','gold');await wait(260)}}}};

  const mid=kind=>{const L=MID[opp];if(skip||!L||midN>=2||Math.random()<.4)return;midN++;const h=B.querySelector('.bhero.e');if(!h)return;
    const d=document.createElement('div');d.className='bsay';d.textContent='»'+L[kind][Math.floor(Math.random()*L[kind].length)]+'«';h.appendChild(d);setTimeout(()=>d.remove(),D(2200)+100)};
  /* Nach jedem Schlagabtausch: erstes Blut, Wende, Duell */
  const story=async fell=>{if(skip)return;
    if(fell.length&&!blood){blood=true;const[s,i]=fell[0];callout(cardEl(s,i),'Erstes Blut!','blood');await wait(300)}
    if(fell.some(([s])=>s===enIdx))mid('autsch');else if(fell.some(([s])=>s===myIdx))mid('treffer');
    const t=tug();if(t.ld>=0){if(leadBy&&t.ld!==leadBy&&turned<2){turned++;stamp(t.ld===myIdx?'Das Blatt wendet sich':'Der Gegner dreht es','','sm wende');S.rise();await wait(900)}leadBy=t.ld}
    const n=[0,1].map(s=>alive[s].filter(Boolean).length);
    if(!duel&&n[0]===1&&n[1]===1){duel=true;B.classList.add('duel');stamp('Duell','Mann gegen Mann','sm');S.drum(1.2);startClutch();await wait(1000)}};
  const syncTo=async(st,quiet)=>{const fell=[],back=[];
    for(const s of[0,1])for(let i=0;i<5;i++){const o=st[s][i],c=cardEl(s,i);if(!c)continue;
      if(alive[s][i]&&!o.alive)fell.push([s,i]);if(!alive[s][i]&&o.alive)back.push([s,i]);
      cur[s][i]=o.hp;atk[s][i]=o.atk;setStat(s,i,!quiet);c.classList.toggle('shd',!!o.sh&&o.alive);c.classList.toggle('frz',!!o.fz&&o.alive);c.classList.toggle('psnd',!!o.psn&&o.alive)}
    if(fell.length&&!quiet){S.death();vib([30,40,60]);shake(.5)}
    for(const[s,i]of fell){const c=cardEl(s,i);alive[s][i]=false;c.classList.remove('doom');
      if(!quiet&&!skip){const r=c.getBoundingClientRect();fx.ash(r);fx.embers(r.left+r.width/2,r.top+r.height/2,8,r.width/2);
        c.animate([{transform:'none',filter:'none'},{transform:`translateY(-4px) rotate(${R(-3,3)}deg) scale(1.05)`,filter:'brightness(2) saturate(0)',offset:.15},{transform:`translateY(8px) rotate(${R(-9,9)}deg) scale(.9)`,filter:'grayscale(1) brightness(.4)'}],{duration:D(650),easing:'ease-in'})}
      c.classList.add('dead');c.parentNode.classList.add('down')}
    for(const[s,i]of back){const c=cardEl(s,i);alive[s][i]=true;c.classList.remove('dead','doom');c.parentNode.classList.remove('down');
      if(!quiet&&!skip){const r=c.getBoundingClientRect();fx.column(r.left+r.width/2,r.top-40,r.bottom,'rgba(255,90,90,1)');S.rise();callout(c,'Kehrt zurück!','blood')}}
    if(fell.length&&!quiet)await wait(520);
    if(!quiet)await story(fell);
    const t=tug();if(!clutch&&t.m>0&&t.e>0&&t.m<=.35&&t.e<=.35)startClutch()};

  for(let k=1;k<snaps.length&&!skip;k++){
    const s=snaps[k],m=/^Runde (\d+)/.exec(s.label),rd=m?+m[1]:0,isLast=k===lastIdx;
    if(rd&&rd!==round){round=rd;label('Runde '+rd);B.classList.add('stamping');stamp(rd,'Runde');S.drum(1);await wait(440);later(500,()=>B.classList.remove('stamping'))}
    else if(!rd){label(s.label);if(s.label==='Kampfbeginn'){B.classList.add('stamping');stamp('Kampfbeginn','','sm');S.drum(.8);au('sfx','taiko',{vol:.6});await wait(500);later(500,()=>B.classList.remove('stamping'))}}
    if(rd)label(s.label);note(s);
    await doEvents(s.ev||[],'pre');
    const acts=actionsOf(s);
    /* Zeitlupe für den letzten, entscheidenden Schlag */
    const killActs=isLast&&decisive?acts.filter(a=>a.type==='atk'):[];const finisher=killActs[killActs.length-1];
    if(finisher&&!skip){B.classList.add('finale');S.heart();await wait(420);S.heart();await wait(420)}
    const ticks=[];
    /* Beide Karten einer Bahn schlagen gleichzeitig zu und prallen aufeinander */
    const pend=[];
    for(let n=0;n<acts.length&&!skip;){const a=acts[n];
      if(a.type==='atk'){const grp=[a];
        while(!a.last&&acts[n+grp.length]&&acts[n+grp.length].type==='atk'&&!acts[n+grp.length].last&&acts[n+grp.length].a[1]===a.a[1])grp.push(acts[n+grp.length]);
        n+=grp.length;const fin=grp.includes(finisher)?finisher:null,rest=grp.filter(g=>g!==fin);
        if(rest.length){pend.push(...rest.map(g=>doAttack(g,false)));await wait(fin?520:(acts[n]&&acts[n].type==='atk'?310:500))}
        if(fin){await Promise.all(pend);killer=teams[fin.a[0]][fin.a[1]].r;const pr=doAttack(fin,true);au('sfx','orchester',{vol:.8,at:D(900)/1000});await wait(1700);await pr}}
      else{n++;await Promise.all(pend);if(a.type==='bolt')await doBolt(a);else if(a.type==='breath')await doBreath(a);else ticks.push(a)}}
    await Promise.all(pend);
    await doTicks(ticks);
    await doEvents(s.ev||[],'post');
    await syncTo(s.st,false);
    /* Vergeltung erst zeigen, wenn die Gefallenen liegen; mehrere in einem Schlag zusammenfassen */
    {const rv=[0,1].map(t=>(s.ev||[]).filter(e=>e.t==='rache'&&e.s===t).reduce((a,e)=>a+e.n,0));await doEvents(rv.map((n,t)=>n?{t:'rache',s:t,n}:null).filter(Boolean),'after')}
    await wait(rd?220:300)}
  /* Endstand sicher übernehmen (auch nach Überspringen) */
  await syncTo(endSt,skip);
  /* Nach dem letzten Schlag steht der Spruch der Kreatur, die ihn geführt hat */
  if(killer&&!skip){$('#bn').textContent='»'+FLAV[killer]+'«';await wait(2400)}
  clearInterval(hb);B.classList.remove('clutch','finale');

  /* ---------- 4. Finale ---------- */
  const win=x.w===-1?'d':(x.w===myIdx?'w':'l');
  const loser=win==='w'?Pe:win==='l'?Pm:null;
  const sub=win==='d'?'Kein Schaden':x.shield?(win==='w'?`Ahnenschild schützt ${Pe.short}`:'Dein Ahnenschild hält'):win==='w'?`${Pe.short} verliert ${x.dmg} Thron`:`Du verlierst ${x.dmg} Thron`;
  label(win==='w'?'Sieg':win==='l'?'Niederlage':'Unentschieden');$('#bn').textContent='';
  const end=document.createElement('div');end.className='bend '+win;
  const qq=Pe.q&&Pe.q[win==='w'?'lose':'win'],qt=win!=='d'&&qq?qq[0]:'';
  /* Held der Schlacht: die Karte des Siegers mit den meisten Kills, dann dem meisten Schaden */
  let hero=null;{const ws=win==='w'?myIdx:win==='l'?enIdx:-1;if(ws>=0)for(let i=0;i<5;i++){const k=key([ws,i]),v=(kills.get(k)||0)*100+(dealt.get(k)||0);if(v>0&&(!hero||v>hero.v))hero={v,i,k:kills.get(k)||0,d:dealt.get(k)||0,c:teams[ws][i].c}}}
  const sens=win!=='d'&&Pm.team.b.cat!==Pe.team.b.cat&&(win==='w')===(Pm.team.b.cat<Pe.team.b.cat);
  end.innerHTML=`${win==='w'?'<div class="rays"></div>':''}${sens?'<em class="sens">Sensation!</em>':''}<b>${win==='w'?'Sieg':win==='l'?'Niederlage':'Patt'}</b><span>${sub}</span>${hero?`<small class="mvp">Held der Schlacht: <b>${NAME[hero.c.r]}</b> · ${hero.k} Gegner besiegt · ${hero.d} Schaden</small>`:''}${qt?`<i class="bq">${Pe.short}: »${qt}«</i>`:''}`;B.appendChild(end);
  if(win==='w'){S.win();vib([50,50,50,50,120]);if(!QA){const h=ctr(B.querySelector('.bhero.m .hero'));fx.coins(h.x,h.y,40);const e2=ctr(B.querySelector('.bhero.e .hero'));fx.gold(e2.x,e2.y,60,60)}}
  else if(win==='l'){S.lose();vib([120,60,200]);B.classList.add('lost');if(!QA)for(let i=0;i<40;i++)add({type:'glow',x:R(0,innerWidth),y:R(-40,0),vx:R(-.5,.5),vy:R(.6,1.6),life:R(90,150),size:R(2,4),c:'rgba(255,140,60,1)',c2:'rgba(160,30,10,.5)'})}
  else S.drum(.7);
  /* Thron-Edelstein des Verlierers zählt herunter */
  if(loser&&x.dmg&&!x.shield){const gem=B.querySelector(loser===Pm?'.bhero.m .hg':'.bhero.e .hg');if(gem){const from=loser.thron,to=Math.max(0,from-x.dmg);let v=from;
    later(500,()=>{gem.classList.add('hurt');const iv=setInterval(()=>{v--;gem.textContent=v;if(v<=to)clearInterval(iv)},QA?1:70)})}}
  B.querySelector('.bfoot').innerHTML=`<button class="plate btn" data-x="next">Weiter</button><button class="plate btn ghost" data-x="all">Alle überspringen</button>`;
  skip=false;if(all){fxStop();hideOv();return'all'}
  await new Promise(r=>{wk=r});
  clearTimeout(wt);fxStop();hideOv();return all?'all':''}
window.playBattle=playBattle;
})();
