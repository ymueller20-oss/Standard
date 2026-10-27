'use strict';
/* KLANG — Musik und Geräusche aus audio/ (Liste in audio/index.json).
   Alles läuft über den AudioContext aus game.js (ac). Musik wird überblendet und bei Jingles abgesenkt.
   Fehlt eine Datei oder ist sie noch nicht geladen, bleibt es still bzw. game.js/battle.js nutzen ihre erzeugten Klänge. */
const AU=(function(){
  const A={ready:false,idx:null,buf:new Map(),wait:new Map(),g:null,cur:null,curName:'',last:new Map(),
    opt:{mus:true,sfx:true}};
  try{const o=JSON.parse(localStorage.getItem('kk-ton')||'null');if(o){A.opt.mus=o.mus!==false;A.opt.sfx=o.sfx!==false}}catch(e){}
  const save=()=>{try{localStorage.setItem('kk-ton',JSON.stringify(A.opt))}catch(e){}};
  const ctx=()=>{const a=ac();if(!a)return null;if(!A.g){const c=a.createDynamicsCompressor();c.threshold.value=-10;c.ratio.value=3;c.connect(a.destination);
      const mk=v=>{const g=a.createGain();g.gain.value=v;g.connect(c);return g};A.g={out:c,mus:mk(.45),sfx:mk(.8),duck:a.createGain()};
      A.g.duck.connect(A.g.mus);A.g.duck.gain.value=1}return a};
  async function init(){if(A.idx)return;try{A.idx=await (await fetch('audio/index.json')).json();A.ready=true;
      /* Geräusche gleich vorladen, Musik und Stimmen bei Bedarf */
      for(const[k,n]of Object.entries(A.idx.sfx))(n?Array.from({length:n},(_,i)=>k+(i+1)):[k]).forEach(f=>load('sfx/'+f))}catch(e){}}
  function load(p){if(A.buf.has(p))return Promise.resolve(A.buf.get(p));if(A.wait.has(p))return A.wait.get(p);const a=ctx();if(!a)return Promise.resolve(null);
    const pr=fetch('audio/'+p+'.mp3').then(r=>r.arrayBuffer()).then(b=>new Promise((res,rej)=>a.decodeAudioData(b,res,rej))).then(b=>{A.buf.set(p,b);A.wait.delete(p);return b}).catch(()=>{A.wait.delete(p);return null});
    A.wait.set(p,pr);return pr}
  /* Geräusch: Name ohne Nummer wählt eine zufällige Variante. Liefert false, wenn (noch) nicht da. */
  function sfx(name,o={}){if(!SND.on||!A.opt.sfx||!A.ready)return false;const n=A.idx.sfx[name];if(n===undefined)return false;
    /* derselbe Klang nicht zweimal kurz hintereinander, sonst doppelt er sich */
    const now=performance.now()+(o.at||0)*1000;if(now-(A.last.get(name)||-1e9)<90)return true;A.last.set(name,now);
    const key='sfx/'+(n?name+(1+Math.floor(Math.random()*n)):name),b=A.buf.get(key);if(!b){load(key);return false}
    const a=ctx(),s=a.createBufferSource(),g=a.createGain();s.buffer=b;s.playbackRate.value=(o.rate||1)*(o.vary===false?1:.94+Math.random()*.12);g.gain.value=o.vol==null?1:o.vol;
    let node=g;if(o.pan&&a.createStereoPanner){const p=a.createStereoPanner();p.pan.value=o.pan;g.connect(p);node=p}
    s.connect(g);node.connect(A.g.sfx);s.start(a.currentTime+(o.at||0));return true}
  /* Musik: Schleifen laufen nahtlos, Wechsel mit Überblendung */
  async function music(name,fade=1.4){if(A.curName===name)return;A.curName=name;const a=ctx();if(!a||!A.ready)return;
    const old=A.cur;A.cur=null;if(old){const t=a.currentTime;old.g.gain.cancelScheduledValues(t);old.g.gain.setValueAtTime(old.g.gain.value,t);old.g.gain.linearRampToValueAtTime(0,t+fade);old.s.stop(t+fade+.05)}
    if(!name||!SND.on||!A.opt.mus)return;const b=await load('musik/'+name);if(!b||A.curName!==name)return;
    const s=a.createBufferSource(),g=a.createGain(),L=A.idx.musik[name];s.buffer=b;if(L){s.loop=true;s.loopStart=0;s.loopEnd=Math.min(L,b.duration)}
    s.connect(g);g.connect(A.g.duck);const t=a.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+fade);s.start(t);A.cur={s,g,name}}
  /* Kurzes Musikstück über der laufenden Musik, die solange leiser wird */
  async function sting(name,vol=1){if(!SND.on||!A.opt.mus||!A.ready)return;const b=await load('musik/'+name);if(!b)return;const a=ctx(),s=a.createBufferSource(),g=a.createGain();
    s.buffer=b;g.gain.value=vol*1.5;s.connect(g);g.connect(A.g.mus);duck(.2,b.duration);s.start()}
  function duck(to,dur){const a=ctx();if(!a)return;const d=A.g.duck.gain,t=a.currentTime;d.cancelScheduledValues(t);d.setValueAtTime(d.value,t);d.linearRampToValueAtTime(to,t+.15);d.setValueAtTime(to,t+Math.max(.2,dur));d.linearRampToValueAtTime(1,t+dur+.8)}
  /* einmal je Partie */
  function setOpt(k,v){A.opt[k]=v;save();if(k==='mus'){if(!v)music('',0.4);else{const n=A.want||'';A.curName='';music(n)}}}
  function want(name){A.want=name;return music(name)}
  /* Erste Berührung schaltet den Ton frei (Pflicht auf iOS) */
  const unlock=()=>{if(!ctx())return;init().then(()=>{if(A.want&&!A.cur)A.curName='',music(A.want)})};
  ['pointerdown','keydown'].forEach(e=>addEventListener(e,unlock,{passive:true}));
  return{sfx,music:want,sting,setOpt,opt:A.opt,load,reset:()=>{},get ready(){return A.ready}}
})();
