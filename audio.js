'use strict';
/* KLANG — Musik, Stimmen und Geräusche aus audio/ (Liste in audio/index.json).
   Alles läuft über den AudioContext aus game.js (ac). Musik wird überblendet, bei Sprache abgesenkt.
   Fehlt eine Datei oder ist sie noch nicht geladen, bleibt es still bzw. game.js/battle.js nutzen ihre erzeugten Klänge. */
const AU=(function(){
  const A={ready:false,idx:null,buf:new Map(),wait:new Map(),g:null,mus:null,cur:null,curName:'',voice:null,vq:0,said:new Set(),
    opt:{mus:true,voc:true,sfx:true}};
  try{const o=JSON.parse(localStorage.getItem('kk-ton')||'null');if(o)Object.assign(A.opt,o)}catch(e){}
  const save=()=>{try{localStorage.setItem('kk-ton',JSON.stringify(A.opt))}catch(e){}};
  const ctx=()=>{const a=ac();if(!a)return null;if(!A.g){const c=a.createDynamicsCompressor();c.threshold.value=-10;c.ratio.value=3;c.connect(a.destination);
      const mk=v=>{const g=a.createGain();g.gain.value=v;g.connect(c);return g};A.g={out:c,mus:mk(.42),sfx:mk(.95),voc:mk(1.05),duck:a.createGain()};
      A.g.duck.connect(A.g.mus);A.g.duck.gain.value=1}return a};
  async function init(){if(A.idx)return;try{A.idx=await (await fetch('audio/index.json')).json();A.ready=true;
      /* Geräusche gleich vorladen, Musik und Stimmen bei Bedarf */
      for(const[k,n]of Object.entries(A.idx.sfx))(n?Array.from({length:n},(_,i)=>k+(i+1)):[k]).forEach(f=>load('sfx/'+f))}catch(e){}}
  function load(p){if(A.buf.has(p))return Promise.resolve(A.buf.get(p));if(A.wait.has(p))return A.wait.get(p);const a=ctx();if(!a)return Promise.resolve(null);
    const pr=fetch('audio/'+p+'.mp3').then(r=>r.arrayBuffer()).then(b=>new Promise((res,rej)=>a.decodeAudioData(b,res,rej))).then(b=>{A.buf.set(p,b);A.wait.delete(p);return b}).catch(()=>{A.wait.delete(p);return null});
    A.wait.set(p,pr);return pr}
  /* Geräusch: Name ohne Nummer wählt eine zufällige Variante. Liefert false, wenn (noch) nicht da. */
  function sfx(name,o={}){if(!SND.on||!A.opt.sfx||!A.ready)return false;const n=A.idx.sfx[name];if(n===undefined)return false;
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
  /* Stimme: eine zur Zeit; prio entscheidet, ob eine laufende unterbrochen wird. Liefert die Dauer (s) oder 0. */
  function say(id,o={}){if(!SND.on||!A.opt.voc||!A.ready||!A.idx.stimmen[id])return 0;const prio=o.prio||1;
    if(A.voice&&A.voice.end>performance.now()){if(prio<=A.voice.prio)return 0;try{A.voice.s.stop()}catch(e){}}
    const b=A.buf.get('stimmen/'+id),go=b=>{const a=ctx(),s=a.createBufferSource(),g=a.createGain();s.buffer=b;g.gain.value=o.vol||1;s.connect(g);g.connect(A.g.voc);
      s.start(a.currentTime+(o.at||0));duck(.32,b.duration+(o.at||0));A.voice={s,prio,end:performance.now()+(b.duration+(o.at||0))*1000}};
    if(b){go(b);return b.duration}
    const tok=++A.vq;load('stimmen/'+id).then(b=>{if(b&&tok===A.vq&&!o.now)go(b)});return A.idx.stimmen[id][1]}
  function hush(){if(A.voice){try{A.voice.s.stop()}catch(e){}A.voice=null}}
  const text=id=>A.ready&&A.idx.stimmen[id]?A.idx.stimmen[id][0]:'';
  const has=id=>!!(A.ready&&A.idx.stimmen[id]);
  /* einmal je Partie */
  const once=(key,fn)=>{if(A.said.has(key))return;A.said.add(key);fn()};
  function setOpt(k,v){A.opt[k]=v;save();if(k==='mus'){if(!v)music('',0.4);else{const n=A.want||'';A.curName='';music(n)}}if(k==='voc'&&!v)hush()}
  function want(name){A.want=name;return music(name)}
  /* Erste Berührung schaltet den Ton frei (Pflicht auf iOS) */
  const unlock=()=>{if(!ctx())return;init().then(()=>{if(A.want&&!A.cur)A.curName='',music(A.want)})};
  ['pointerdown','keydown'].forEach(e=>addEventListener(e,unlock,{passive:true}));
  return{sfx,music:want,sting,say,hush,text,has,once,setOpt,opt:A.opt,load,reset:()=>A.said.clear(),get ready(){return A.ready}}
})();
