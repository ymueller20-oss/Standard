'use strict';
/* ASCHENTHRON — Poker + Battlegrounds.
   Poker: Hold'em mit Opfer-Runde, Einsätze in Gold. Showdown: 5 von 7 Karten werden zum Team, die Pokerkombo ist die Formation.
   Battlegrounds: Teams kämpfen automatisch, Verlierer verlieren Thron-Leben. Zwischen den Händen kaufst du mit dem Gold permanente Siegel.
   Die Kampf-Engine (eval5, mkTeam, battle, pickTeam) steht in engine.js. Stil: Rußdruck, siehe style.css. */

const NAME={2:'Ratte',3:'Krähe',4:'Keiler',5:'Wolf',6:'Ghul',7:'Greif',8:'Troll',9:'Lindwurm',10:'Riese',11:'Mantikor',12:'Nachtmahr',13:'Wyvern',14:'Drache'};
const RL={2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'B',12:'D',13:'K',14:'A'};
const ABIL={2:['Schwarm','+1/+1 für jede andere Karte mit Stärke 5 oder weniger im Team.'],3:['Aasfresser','+1 Angriff, wann immer ein Gegner stirbt.'],
  4:['Sturmangriff','Sein erster Angriff verursacht doppelten Schaden.'],5:['Rudeljäger','+1 Angriff für jede andere Karte aus seinem Reich im Team.'],
  6:['Zäh','Erleidet aus jeder Quelle 1 Schaden weniger.'],7:['Sturzflug','Greift immer den Gegner mit den wenigsten Leben an.'],
  8:['Regeneration','Heilt am Ende jeder Runde 2 Leben.'],9:['Gift','Wen er verletzt, der verliert am Ende jeder Runde 1 Leben.'],
  10:['Bollwerk','Seine Nachbarn erleiden 1 Schaden weniger.'],11:['Stachel','Trifft zusätzlich die Nachbarn seines Ziels mit 2 Schaden.'],
  12:['Grauen','Der Gegner gegenüber kämpft mit −2 Angriff.'],13:['Erstschlag','Schlägt jede Runde zu, bevor die anderen zuschlagen.'],
  14:['Feueratem','Zu Kampfbeginn 2 Schaden an allen Gegnern.']};
const SHORT={2:'+1/+1 je Teamkarte mit Stärke 5 oder weniger.',3:'+1 Angriff, wenn ein Gegner fällt.',4:'Erster Angriff macht doppelten Schaden.',5:'+1 Angriff je Teamkarte seines Reichs.',
  6:'Nimmt immer 1 Schaden weniger.',7:'Greift den Gegner mit den wenigsten Leben an.',8:'Heilt jede Runde 2 Leben.',9:'Getroffene verlieren jede Runde 1 Leben.',
  10:'Nachbarn nehmen 1 Schaden weniger.',11:'Trifft auch die Nachbarn seines Ziels mit 2.',12:'Gegner gegenüber kämpft mit −2 Angriff.',13:'Schlägt jede Runde als Erster zu.',
  14:'Kampfbeginn: 2 Schaden an allen Gegnern.'};
const FLAV={2:'In den Gräben fressen sie zuerst die Augen.',3:'Sie zählt die Gehenkten. Sie verzählt sich nie.',4:'Der Jäger kam mit drei Hunden. Der Keiler ging mit allen.',5:'Wenn der Winter kommt, gehört der Wald dem Rudel.',6:'Er gräbt nicht nach Gold.',7:'Ein Ritter ohne Pferd ist ein Mahl ohne Teller.',8:'Brich ihm die Knochen. Am Morgen sind sie heil. Deine nicht.',9:'Erst wollte er eine Jungfrau im Jahr. Dann zwei.',10:'Die Burg war sein Spielzeug. Er hat damit gespielt.',11:'Drei Reihen Zähne, ein Stachel und kein Mitleid.',12:'Wer sie reiten hört, wacht nicht mehr auf.',13:'Sie kommt aus der Sonne. Man sieht nur ihren Schatten.',14:'Könige knien. Drachen nicht.'};
/* Reichseigene Unterstützer: Stärke 2–5 hat in jedem Reich einen eigenen Effekt */
const SUPTX={
  knappe:['Knappe','Gibt der stärksten anderen Teamkarte Gottesschild.','Stärkste Teamkarte erhält Gottesschild.'],
  herold:['Herold','Bricht ein Gottesschild deines Teams, erhalten alle deine Karten +3 Angriff.','Bricht ein Schild: Team +3 Angriff.'],
  banner:['Bannerträger','Deine Karten mit Gottesschild erhalten +5/+5.','Karten mit Gottesschild +5/+5.'],
  waechter:['Leibwächter','Fängt jeden Angriff auf deine stärkste Karte ab.','Fängt Angriffe auf deine stärkste Karte ab.'],
  funke:['Funke','Kampfbeginn: 8 Schaden an der stärksten Gegnerkarte.','Kampfbeginn: 8 Schaden an die stärkste Gegnerkarte.'],
  zunder:['Zunder','Jeder Schaden deines Teams zu Kampfbeginn (Glut, Funke, Drache) +2.','Kampfbeginn-Schaden deines Teams +2.'],
  brand:['Flächenbrand','Fällt eine Gegnerkarte, nehmen ihre Nachbarn 8 Schaden.','Fällt ein Gegner: 8 an seine Nachbarn.'],
  schmied:['Kettenschmied','Alle anderen Karten deiner Stärkenkette +3 Angriff.','Deine Kettenglieder +3 Angriff.'],
  frostbiss:['Frostbiss','Kampfbeginn: Die stärkste Gegnerkarte erstarrt und setzt einen Angriff aus.','Kampfbeginn: stärkster Gegner erstarrt.'],
  rune:['Runenträger','Alle deine Karten +0/+2.','Alle deine Karten +0/+2.'],
  wall:['Schildwall','Deine Karten nehmen aus jedem Treffer 2 Schaden weniger.','Dein Team nimmt je Treffer 2 weniger.'],
  winterwolf:['Winterwolf','Alle deine Karten frieren mit ihren Treffern ein.','Alle deine Treffer frieren ein.'],
  pest:['Pestratte','Kampfbeginn: Alle Gegner sind verseucht und verlieren jede Runde 3 Leben.','Alle Gegner verlieren jede Runde 3.'],
  aas:['Aaskrähe','+3/+3, wann immer irgendeine Karte fällt.','+3/+3 je gefallener Karte.'],
  priester:['Blutpriester','Deine erste gefallene Karte kehrt mit halbem Leben zurück.','Erste Gefallene kehrt zurück.'],
  moorwolf:['Moorwolf','Seine Nachbarn erhalten Blutrausch +3.','Nachbarn: Blutrausch +3.']};
const abil=c=>{const k=supOf(c);return k?SUPTX[k]:[ABIL[c.r][0],ABIL[c.r][1],SHORT[c.r]]};
const CAT=['Einzelgänger','Paar','Zwei Paare','Rudel','Jagdkette','Banner','Horde','Plage','Kriegszug','Drachenkrone'];
const CATX=['Höchste Karte','zwei gleiche Stärken','zweimal zwei gleiche Stärken','drei gleiche Stärken','fünf Stärken in Folge','fünf Karten aus einem Reich','Rudel plus Paar','vier gleiche Stärken','Jagdkette aus einem Reich','Jagdkette bis zum Drachen aus einem Reich'];
/* Wertigkeit: je höher der Rang, desto aufwendiger der Druck */
const tier=r=>r<=5?1:r<=8?2:r<=10?3:r<=13?4:5;
const TIERN=['Gemein','Ungewöhnlich','Selten','Mythisch','Mythisch · Folie'];
const CORN='<img class="corner tl" src="orn/corner.svg" alt=""><img class="corner tr" src="orn/corner.svg" alt=""><img class="corner bl" src="orn/corner.svg" alt=""><img class="corner br" src="orn/corner.svg" alt=""><div class="candle"></div>';
const SY='<svg class="sy" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M2 16V5l5 4 3-6 3 6 5-4v11zM2 17h16v2H2z"/></svg>';
const I=(v,b)=>`<svg viewBox="${v}" aria-hidden="true">${b}</svg>`;
const IC={
  sun:I('0 0 16 16','<g fill="currentColor"><path d="M8 4.2L11.8 8 8 11.8 4.2 8z"/><path d="M8 .4l1.3 3H6.7zM8 15.6l-1.3-3h2.6zM.4 8l3-1.3v2.6zM15.6 8l-3 1.3V6.7z"/></g>'),
  fire:I('0 0 16 16','<path fill="currentColor" d="M8 .6l3 4.2 1.8 1.6-.4 4.2L8 15.4 3.6 10.6l-.4-4.2L5 4.8z"/>'),
  ice:I('0 0 16 16','<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="miter"><path d="M8 1v14M1.9 4.5l12.2 7M1.9 11.5l12.2-7"/></g>'),
  blood:I('0 0 16 16','<path fill="currentColor" d="M8 .6l5 7.6-2 7.2H5L3 8.2z"/>'),
  thron:I('0 0 20 20','<path fill="currentColor" d="M2 16V5l5 4 3-6 3 6 5-4v11zM2 17h16v2H2z"/>'),
  gold:I('0 0 20 20','<circle cx="10" cy="10" r="9" fill="#e0b84a" stroke="#6a4c10" stroke-width="1.5"/><circle cx="10" cy="10" r="5.6" fill="none" stroke="#8a6a22" stroke-width="1.5"/><path d="M6 6.4a5.6 5.6 0 0 1 5-2" stroke="#fff3b0" stroke-width="1.2" fill="none"/>'),
  book:I('0 0 24 24','<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="miter" d="M4 3h15v15H7l-3 3zM8 8h7M8 12h7"/>'),
  snd:I('0 0 24 24','<path fill="currentColor" d="M3 9h4l5-4v14l-5-4H3z"/><path fill="none" stroke="currentColor" stroke-width="2.4" d="M15 8l3 4-3 4M18 5l3 7-3 7"/>'),
  mute:I('0 0 24 24','<path fill="currentColor" d="M3 9h4l5-4v14l-5-4H3z"/><path fill="none" stroke="currentColor" stroke-width="2.6" d="M15 9l6 6M21 9l-6 6"/>'),
  fold:I('0 0 24 24','<path fill="currentColor" d="M5 2h2v20H5zM8 3h12l-4 4.5L20 12H8z"/>'),
  call:I('0 0 24 24','<path fill="currentColor" d="M4 8l8-4 8 4v3l-8 4-8-4zM4 14l8 4 8-4v3l-8 4-8-4z"/>'),
  raise:I('0 0 24 24','<path fill="currentColor" d="M12 2l9 9h-5.5V22h-7V11H3zM6 20h12v2H6z" transform="translate(0 -1)"/>'),
  bowl:`<svg viewBox="0 0 48 48" aria-hidden="true"><g stroke="#2b1d12" stroke-width="1.3" fill="#e2c062"><ellipse cx="15" cy="40" rx="11" ry="4"/><path d="M4 40v-4"/><ellipse cx="15" cy="35.5" rx="11" ry="4"/><ellipse cx="15" cy="31" rx="11" ry="4"/><ellipse cx="15" cy="26.5" rx="11" ry="4"/><ellipse cx="34" cy="40" rx="11" ry="4"/><ellipse cx="34" cy="35.5" rx="11" ry="4"/><ellipse cx="34" cy="31" rx="11" ry="4"/><ellipse cx="25" cy="22" rx="9" ry="3.4"/><ellipse cx="25" cy="18.5" rx="9" ry="3.4"/></g><g stroke="#2b1d12" stroke-width=".8" fill="none" opacity=".6"><path d="M9 26.5h12M28 31h12M19 18.5h12"/></g></svg>`
};
const RIC={
  drum:I('0 0 24 24','<g fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="9" rx="8" ry="3"/><path d="M4 9v7c0 1.7 3.6 3 8 3s8-1.3 8-3V9M6 11.5l3 6M18 11.5l-3 6M10 11.9l2 6.6 2-6.6"/><path d="M5 2l5 6M19 2l-5 6" stroke-linecap="round"/></g>'),
  shield:I('0 0 24 24','<path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z"/><path fill="none" stroke="currentColor" stroke-width="1.6" d="M12 6v12M7.5 11h9"/>'),
  fourth:I('0 0 24 24','<g fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="9" height="13" rx="1.5" transform="rotate(-12 7 12)"/><rect x="8" y="4" width="9" height="13" rx="1.5"/><rect x="12" y="6" width="9" height="13" rx="1.5" transform="rotate(12 16 12)"/></g>'),
  bounty:I('0 0 24 24','<g fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3h6l-2 4h-2z"/><path d="M11 7c-5 2-7 6-7 9 0 3 3 5 8 5s8-2 8-5c0-3-2-7-7-9"/><path d="M12 11v7M10 13c0-1 4-1 4 .5S10 15 10 16.5s4 1.5 4 0"/></g>'),
  raven:I('0 0 24 24','<g fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/></g><circle cx="12" cy="12" r="1.3" fill="currentColor"/>')};
const REALM=[
  {n:'Sonnenwacht',fr:'#d6cfbd',pl:'#f1eee3',tb:'#f4f1e8',mc:'#f6efc0',col:'#d8bf6e',ic:IC.sun,pn:'Gottesschild',ptx:'Hat eine Sonnenwacht-Karte einen Zwilling gleicher Stärke im Team, trägt sie Gottesschild (der erste Treffer prallt ab), +2/+2 je Zwilling. +1/+1 je weiterer Sonnenwacht-Karte. Ab vier Sonnenwacht-Karten trägt die stärkste den Schild, bei fünf alle.',strat:'Paare, Schilde, Unverwundbarkeit',
   lore:'Die Ritter der Sonnenwacht schwören auf das letzte Licht über den Zinnen. Wer ihren Schwur bricht, dessen Name wird aus jeder Chronik gekratzt.'},
  {n:'Aschelande',fr:'#c4472e',pl:'#f2dacb',tb:'#f3e1d5',mc:'#f0a08a',col:'#b3382a',ic:IC.fire,pn:'Glut',ptx:'Zu Kampfbeginn brennt jede Aschelande-Karte ihren Gegner für so viel Schaden, wie ihre Stärkenkette lang ist. +3/+2 je Kettenglied, +2/+2 je weiterer Aschelande-Karte.',strat:'Jagdketten, Schaden vor dem ersten Schlag',
   lore:'Seit der Vulkan den alten Thron verschlang, brennt das Land. Seine Fürsten sind Schmiede, Jäger und Brandstifter in einem.'},
  {n:'Nordmark',fr:'#2f72ad',pl:'#d3e3f1',tb:'#dfe9f3',mc:'#a9d2ee',col:'#2f6a9a',ic:IC.ice,pn:'Frost',ptx:'+3/+2 je weiterer Nordmark-Karte. Ab drei Nordmark-Karten lassen ihre Treffer das Ziel erstarren: es setzt seinen nächsten Angriff aus.',strat:'Banner, Kontrolle',
   lore:'Im ewigen Winter der Nordmark überlebt nur, wer zusammensteht. Ihre Wälle aus Eis hat noch keine Armee gebrochen.'},
  {n:'Blutmoor',fr:'#3c3633',pl:'#d3cdc7',tb:'#ddd7d0',mc:'#c8bdb8',col:'#5b2a48',ic:IC.blood,pn:'Blutrausch',ptx:'Jede Kampfrunde +3 Angriff, +1 mehr je weiterer Blutmoor-Karte. Fällt sie, schlägt sie noch einmal mit vollem Angriff zu.',strat:'Lange Kämpfe, Rache',
   lore:'Das Blutmoor vergisst niemanden, der in ihm starb. Was dort fällt, steht noch einmal auf und schlägt ein letztes Mal zu.'}];
const OPP=[
  {name:'Vargo Rotzahn',short:'Vargo',tag:'Söldner',col:'#a8321f',fr:'#c4472e',pl:'#f2dacb',art:'4-1',st:{aggr:.75,bluff:.16,tight:0},
   q:{raise:['Gold klingt besser als Eisen.','Ich kauf dir die Hand ab.'],allin:['Alles oder der Strick!'],fold:['Heute nicht, Krämer.'],win:['Der Söldner nimmt, was ihm zusteht.'],lose:['Pah. Glück.']}},
  {name:'Mutter Grauweid',short:'Grauweid',tag:'Hexe',col:'#2f6a9a',fr:'#2f72ad',pl:'#d3e3f1',art:'3-2',st:{aggr:.5,bluff:.05,tight:.5},
   q:{raise:['Die Krähen flüstern: setz mehr.','Ich sah es in den Knochen.'],allin:['Die Knochen haben gesprochen.'],fold:['Die Zeichen stehen schlecht.'],win:['Ich sagte es doch, Kind.'],lose:['Alte Hexen sterben nicht an einer Hand.']}},
  {name:'Die stumme Ysa',short:'Ysa',tag:'Meuchlerin',col:'#6b2f58',fr:'#3c3633',pl:'#d3cdc7',art:'12-3',st:{aggr:.65,bluff:.22,tight:-.1},
   q:{raise:['Mehr.','Du zögerst.'],allin:['Alles.'],fold:['...'],win:['Still.'],lose:['Dein Glück ist geborgt.']}}];
const RANKS=[[0,'Bettler'],[100,'Tagelöhner'],[300,'Söldner'],[700,'Hauptmann'],[1400,'Ritter'],[2500,'Fürst'],[4000,'Aschenkönig']];
let FAME=0,SEEN=new Set();
try{FAME=+localStorage.getItem('at-fame')||0;SEEN=new Set(JSON.parse(localStorage.getItem('at-seen')||'[]'))}catch(e){}
const rankOf=f=>{let r=RANKS[0][1];for(const[t,n]of RANKS)if(f>=t)r=n;return r};
const saveMeta=()=>{try{localStorage.setItem('at-fame',FAME);localStorage.setItem('at-seen',JSON.stringify([...SEEN]))}catch(e){}};
const BLINDS=[10,15,20,30,40,60,80];
const ZOLL=1,ANTE_F=0;  // Kriegszoll (Blinds): kleiner = ZOLL/2, großer = ZOLL Einsätze; Ante-Anteil am Einsatz
const START_GOLD=250,START_THRON=30,HAND_EVERY=3,MAX_HANDS=12,DMG_EVERY=3;  // Format per Simulation geprüft: siehe README

/* ---------- Helfer ---------- */
const $=s=>document.querySelector(s);
const rnd=n=>Math.floor(Math.random()*n);
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
let G=null;
const QA=/[?&]qa\b/.test(location.search);
const sleep=ms=>new Promise(r=>setTimeout(r,QA?ms*.04:G&&G.fast?ms*.3:ms));
const cardById={};FULL.forEach(c=>cardById[c.id]=c);

/* ---------- Ton (synthetisch, kein Asset) ---------- */
const SND={on:true,ctx:null};
try{SND.on=localStorage.getItem('at-snd')!=='0'}catch(e){}
function ac(){if(!SND.ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;SND.ctx=new A()}if(SND.ctx.state==='suspended')SND.ctx.resume();return SND.ctx}
function tone(f0,f1,d,type='sine',v=.2,at=0){const a=ac();if(!a)return;const t=a.currentTime+at,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+d);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(a.destination);o.start(t);o.stop(t+d+.02)}
function noise(d,v=.2,f=2000,type='highpass',at=0){const a=ac();if(!a)return;const t=a.currentTime+at,n=Math.floor(a.sampleRate*d),b=a.createBuffer(1,n,a.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=(Math.random()*2-1)*(1-i/n);
  const s=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();s.buffer=b;fl.type=type;fl.frequency.value=f;g.gain.value=v;s.connect(fl).connect(g).connect(a.destination);s.start(t)}
function snd(k){if(!SND.on)return;try{
  if(k==='tick')noise(.05,.16,3500);
  else if(k==='chip'){tone(2100,1900,.07,'square',.06);tone(2900,2600,.09,'square',.05,.05)}
  else if(k==='thud'){tone(130,38,.34,'sine',.5);noise(.09,.2,600,'lowpass')}
  else if(k==='hit'){noise(.12,.3,900,'lowpass');tone(110,50,.16,'sawtooth',.2)}
  else if(k==='die'){tone(90,28,.55,'sawtooth',.25);noise(.25,.2,400,'lowpass')}
  else if(k==='win'){[0,.1,.2,.32].forEach((d,i)=>tone([392,494,587,784][i],[392,494,587,784][i],.3,'triangle',.14,d))}
  else if(k==='lose'){[0,.18,.36].forEach((d,i)=>tone([392,330,220][i],[380,320,200][i],.4,'sawtooth',.12,d))}
  else if(k==='click')tone(300,200,.05,'square',.07)}catch(e){}}

/* ---------- Hausbanner der Gegner ---------- */
function plateHTML(p){return `<div class="hero"><div class="pf"><img src="cards/pk-${p.art}.jpg" alt="" draggable="false"></div><b class="hg gem">${p.thron}</b><span class="hn">${p.short}</span></div>`}

/* ---------- Karten-HTML (Magic-Aufbau, Wertigkeit als Stufe) ---------- */
const cardNo=c=>String(c.s*13+c.r-1).padStart(3,'0');
const RAR=['C','U','R','M','M'];
function cardHTML(c,o={}){
  if(o.back)return `<div class="card back ${o.cls||''}" style="${o.style||''}"></div>`;
  const R=REALM[c.s],t=tier(c.r),up=o.up||0,team=o.st;
  const bA=PST[c.r][0]+up,bH=PST[c.r][1]+up,st=team||[bA,bH];
  return `<div class="card t${t} ${o.cls||''}" data-id="${c.id}" style="--fr:${R.fr};--pl:${R.pl};--tb:${R.tb};--mc:${R.mc};${o.style||''}">
    <div class="frm">
      <div class="plate ttl"><b class="nm">${NAME[c.r]}</b><span class="cost"><i>${RL[c.r]}</i><i class="cm">${R.ic}</i></span></div>
      <div class="art"><img src="cards/pk-${c.r}-${c.s}.jpg" alt="${NAME[c.r]}" draggable="false">${up?`<i class="plate upb">+${up}/+${up}</i>`:''}</div>
      <div class="plate typ"><span>${R.n}</span>${SY}</div>
      <div class="tx"><b>${abil(c)[0]}</b> · ${abil(c)[2]}</div>
      <div class="plate pt"><i class="at ${team&&st[0]>bA?'up':''}">${st[0]}</i>/<i class="hpb ${team&&st[1]>bH?'up':''}">${st[1]}</i></div>
    </div>
    <span class="col">${cardNo(c)}/052 ${RAR[t-1]} · ASH · DE</span>
    <i class="xrk">${RL[c.r]}</i><i class="crown"></i><i class="stamp"></i><i class="foil"></i><i class="glare"></i><i class="cvr"></i></div>`}
const upOf=(p,c)=>(p.up.rank[c.r]||0)+(p.up.realm[c.s]||0);
function seenCls(key){if(!G.seen)G.seen=new Set();if(G.seen.has(key))return '';G.seen.add(key);G.dealt=(G.dealt||0)+1;return 'deal'}

/* ---------- Kombo-Beschreibung ---------- */
const RN=r=>NAME[r];
function comboLabel(b){if(!b)return'';const t=b.tb,f=b.five;switch(b.cat){
  case 0:return`Einzelgänger · ${RN(t[0])}`;case 1:return`Paar · ${RN(t[0])}`;case 2:return`Zwei Paare · ${RN(t[0])} & ${RN(t[1])}`;
  case 3:return`Rudel · ${RN(t[0])}`;case 4:return`Jagdkette bis ${RN(t[0])}`;case 5:return`Banner · ${REALM[f[0].s].n}`;
  case 6:return`Horde · ${RN(t[0])} über ${RN(t[1])}`;case 7:return`Plage · ${RN(t[0])}`;case 8:return`Kriegszug bis ${RN(t[0])}`;case 9:return`Drachenkrone · ${REALM[f[0].s].n}`}}
function partLabel(cs){if(!cs.length)return'';const r=cs.map(c=>c.r).sort((a,b)=>b-a);const cnt={};r.forEach(x=>cnt[x]=(cnt[x]||0)+1);const m=Math.max(...Object.values(cnt));
  if(m>=4)return'Plage';if(m===3)return'Rudel · '+RN(+Object.keys(cnt).find(k=>cnt[k]===3));if(m===2)return'Paar · '+RN(+Object.keys(cnt).find(k=>cnt[k]===2));return'Höchste: '+RN(r[0])}
function handLabel(cs){return cs.length>=5?comboLabel(bestFive(cs)):partLabel(cs)}

/* ---------- Gewinnchance (Monte-Carlo über echte Kämpfe) ---------- */
function equity(p,samples){
  const known=[...p.hole,...G.board,...G.players.flatMap(q=>q.sac)];
  const opps=G.players.filter(q=>q!==p&&q.inHand&&!q.folded).map(q=>({n:q.hole.length,up:q.up}));
  return battleEquity({hole:p.hole,up:p.up},G.board,opps,known,samples)}

/* ---------- Spielzustand ---------- */
function newGame(){
  document.body.classList.remove('intro');
  const P=[{name:'Du',short:'Du',human:true,col:'#efe6cf',art:'14-0'}].concat(OPP.map(o=>({...o})));
  G={players:P.map((p,i)=>({i,...p,stack:START_GOLD,thron:START_THRON,hole:[],sac:[],up:{rank:{},realm:{}},folded:false,inHand:false,out:false,bet:0,say:'',rage:false})),
    hand:0,dealer:3,board:[],pot:0,bb:10,ante:2,curBet:0,minRaise:10,ui:null,seen:new Set(),turn:null,fast:false,lastPot:0,stats:{won:0,best:-1,bestName:''}};
  return runGame()}

async function runGame(){
  const me=G.players[0];
  while(true){
    await playHand();
    for(const p of G.players)if(!p.out&&(p.stack<=0||p.thron<=0)){p.out=true;p.inHand=false}
    render();
    const alive=G.players.filter(p=>!p.out);
    if(me.out||alive.length===1||G.hand>=MAX_HANDS)break;
    await tavern();
  }
  await gameOver()}

const live=()=>G.players.filter(p=>p.inHand&&!p.folded);
function seatOrderFrom(i){const n=G.players.length,o=[];for(let k=1;k<=n;k++){const p=G.players[(i+k)%n];if(!p.out)o.push(p)}return o}

async function playHand(){
  G.hand++;G.fast=false;G.board=[];G.pot=0;G.seen=new Set();
  const lvl=Math.min(BLINDS.length-1,Math.floor((G.hand-1)/HAND_EVERY));G.bb=BLINDS[lvl];G.ante=Math.round(G.bb*ANTE_F);
  do{G.dealer=(G.dealer+1)%G.players.length}while(G.players[G.dealer].out);
  const deck=shuffle(FULL.slice());
  for(const p of G.players){p.hole=[];p.sac=[];p.folded=false;p.bet=0;p.say='';p.team=null;p.peek=null;p.loot=0;p.inHand=!p.out;
    if(p.inHand&&G.ante){const a=Math.min(p.stack,G.ante);p.stack-=a;G.pot+=a}}
  for(const p of G.players)if(p.inHand){p.hole=deck.splice(0,p.fourth?4:3);p.fourth=0}
  G.deck=deck;
  const me=G.players[0];if(me.raven&&me.inHand){for(const p of G.players.slice(1))if(p.inHand)p.peek=p.hole[rnd(p.hole.length)];me.raven=0}
  render();await sleep(900);
  await betRound();if(await soleWinner())return;
  await banner('Der Flop','',G.fast?0:800);
  G.board.push(...G.deck.splice(0,3));render();await sleep(600);
  await betRound();if(await soleWinner())return;
  await sacrifice();
  await banner('Die Wende','Turn und River',G.fast?0:900);
  G.board.push(...G.deck.splice(0,2));render();await sleep(600);
  await betRound();if(await soleWinner())return;
  await showdown()}

async function soleWinner(){
  const l=live();if(l.length>1)return false;
  const w=l[0];w.stack+=G.pot;const got=G.pot;G.pot=0;G.turn=null;
  if(w.human)G.stats.won++;
  w.say='Alle flohen';render();snd('chip');await sleep(1100);return true}

/* ---------- Einsatzrunde ---------- */
async function betRound(){
  const act=live();if(act.length<2)return;
  G.players.forEach(p=>{p.bet=0;p.say=''});G.curBet=0;G.minRaise=G.bb;G.raises=0;G.step=(G.board.length>=4?2:1)*G.bb;
  const order=seatOrderFrom(G.dealer).filter(p=>p.inHand&&!p.folded);
  /* Kriegszoll: vor dem Flop zahlen die beiden Plätze nach dem Geber Pflichteinsätze – niemand sieht den Flop umsonst */
  if(!G.board.length&&order.length>=2){
    const post=(p,x,t)=>{const a=Math.min(p.stack,x);p.stack-=a;p.bet+=a;G.pot+=a;p.say=t+' '+a;p.zoll=t};
    post(order[0],Math.round(G.bb*ZOLL/2),'Kl. Zoll');post(order[1],Math.round(G.bb*ZOLL),'Gr. Zoll');G.curBet=order[1].bet;
    order.push(...order.splice(0,order.length>2?2:0));render();await sleep(500)}
  const need=new Set(order.filter(p=>p.stack>0));
  const cap=()=>Math.min(...live().map(p=>p.stack+p.bet));
  let i=0,guard=0;
  while(need.size&&guard++<200){
    const p=order[i++%order.length];
    if(!need.has(p))continue;
    if(p.folded||p.stack<=0){need.delete(p);continue}
    if(live().length<2)break;
    const toCall=G.curBet-p.bet,capT=cap();
    const others=live().filter(q=>q!==p);
    if(toCall<=0&&others.every(q=>q.stack<=0)){need.delete(p);continue}
    G.turn=p;render();
    const minTo=Math.min(capT,G.curBet+G.step);
    const canRaise=capT>G.curBet&&p.stack>toCall&&G.raises<3;
    const a=p.human?await humanAct(toCall,minTo,capT,canRaise):await aiAct(p,toCall,minTo,capT,canRaise);
    p.say='';
    if(a.t==='fold'){p.folded=true;p.say='Flieht';need.delete(p);if(p.human)G.fast=true;snd('click')}
    else if(a.t==='call'){const amt=Math.min(toCall,p.stack);p.stack-=amt;p.bet+=amt;G.pot+=amt;need.delete(p);p.say=toCall<=0?'Schiebt':(p.stack<=0?'Alles!':'Geht mit');if(amt)snd('chip')}
    else{const to=minTo,amt=to-p.bet;G.raises++;
      G.minRaise=Math.max(G.minRaise,to-G.curBet);p.stack-=amt;p.bet=to;G.pot+=amt;G.curBet=to;
      need.clear();live().forEach(q=>{if(q!==p&&q.stack>0)need.add(q)});
      if(p.stack<=0){pulse('rgba(232,80,44,.75)');snd('thud')}else snd('chip');
      p.rage=true;setTimeout(()=>{p.rage=false;render()},700);
      p.say=p.stack<=0?'Alles! '+to:(toCall<=0?'Setzt ':'Erhöht auf ')+to}
    G.turn=null;render();await sleep(p.human?250:700);
  }
  G.turn=null;G.players.forEach(p=>{if(!p.folded)p.say=''});
  render()}

/* ---------- KI ---------- */
async function aiAct(p,toCall,minTo,capT,canRaise){
  await sleep(650+rnd(700));
  const n=live().length,eq=equity(p,p.st.n||24),fair=1/n,st=p.st,bb=G.bb;
  const po=toCall/(G.pot+toCall||1),e=eq+(Math.random()-.5)*.08,bluff=Math.random()<st.bluff;
  const size=()=>minTo;
  if(toCall<=0){
    if(canRaise&&((e>fair*1.45&&Math.random()<st.aggr+.2)||(bluff&&Math.random()<.5)))return{t:'raise',to:size()};
    return{t:'call'}}
  const need=po*(1.08+st.tight*.45);
  if(canRaise&&e>need+.22&&Math.random()<st.aggr+.1)return{t:'raise',to:size()};
  if(e>=need||(bluff&&Math.random()<.3)||(toCall<=bb*.5&&e>fair*.7))return{t:'call'};
  return{t:'fold'}}

/* ---------- Mensch: Einsatz ---------- */
function humanAct(toCall,minTo,capT,canRaise){
  const p=G.players[0];
  const eq=equity(p,36),n=live().length;
  G.eq={eq,n,toCall,po:toCall/(G.pot+toCall||1)};
  return ask('bet',{toCall,minTo,capT,canRaise,raising:false,val:minTo})}

/* ---------- Opfer ---------- */
async function sacrifice(){
  for(const p of live()){
    if(p.human){const c=await ask('sac',{sel:null});p.hole=p.hole.filter(x=>x!==c);p.sac.push(c);snd('thud')}
    else{let bestI=0,bs=-1;p.hole.forEach((c,i)=>{const rest=p.hole.filter((_,j)=>j!==i).concat(G.board);const sc=bestScore(rest);if(sc>bs||(sc===bs&&c.r<p.hole[bestI].r)){bs=sc;bestI=i}});
      p.say='Opfert';const c=p.hole.splice(bestI,1)[0];p.sac.push(c);G.turn=p;render();snd('thud');await sleep(700);p.say=''}}
  G.turn=null;render();await sleep(500)}

/* ---------- Showdown ---------- */
async function showdown(){
  const L=live(),me=G.players[0];
  await banner('Showdown','',G.fast?0:900);
  for(const p of L){
    const seven=p.hole.concat(G.board);
    let five;
    if(p.human)five=await ask('lineup',{cards:seven.slice().sort((a,b)=>b.r-a.r||a.s-b.s),sel:bestFive(seven).five.map(c=>c.id)});
    else five=pickTeam(seven,p.up).five;
    p.team=mkTeam(five,p.up);
    if(p.drum){const b=p.team.b,add=K.FB[Math.min(9,b.cat+1)]-K.FB[b.cat];p.team.team.forEach(f=>{f.atk+=add;f.hp+=add;f.max+=add});p.team.drum=add;p.drum=0}}
  const wins=new Map(L.map(p=>[p,0])),dmg=new Map(),pairs=[];
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
    const A=L[i],B=L[j],r=battle(A.team.team,B.team.team,true),last=r.snaps[r.snaps.length-1];
    const aliveA=last.st[0].filter(x=>x.alive).length,aliveB=last.st[1].filter(x=>x.alive).length;
    const rec={A,B,r,w:r.w};pairs.push(rec);const bonus=Math.floor((G.hand-1)/DMG_EVERY);
    const hit=(Wn,Lo,alive)=>{wins.set(Wn,wins.get(Wn)+1);rec.dmg=1+alive+bonus;if(Lo.shield){rec.dmg=0;rec.shield=true;Lo.shield=0}
      dmg.set(Lo,(dmg.get(Lo)||0)+rec.dmg);const loot=Math.round(G.bb/2)*(1+(Wn.bounty||0));Wn.stack+=loot;Wn.loot=(Wn.loot||0)+loot};
    if(r.w===0)hit(A,B,aliveA);else if(r.w===1)hit(B,A,aliveB)}
  const mine=pairs.filter(x=>x.A===me||x.B===me);
  for(const x of mine){const skip=await playBattle(x);if(skip==='all')break}
  const top=Math.max(...wins.values());
  let W=L.filter(p=>wins.get(p)===top);
  if(W.length>1){const m=Math.max(...W.map(p=>p.team.b.score));W=W.filter(p=>p.team.b.score===m)}
  const share=Math.floor(G.pot/W.length);W.forEach(p=>p.stack+=share);W[0].stack+=G.pot-share*W.length;
  if(W.includes(me)){G.stats.won++;const sc=me.team.b.cat;if(sc>=G.stats.best){G.stats.best=sc;G.stats.bestName=comboLabel(me.team.b)}}
  for(const[p,d]of dmg)p.thron=Math.max(0,p.thron-d);
  if(dmg.get(me)){pulse();snd('lose')}else if(W.includes(me))snd('win');
  await showSheet('result',{L,W,dmg,wins});
  G.pot=0;render()}

/* ---------- Aschenschmiede ---------- */
const PF=()=>Math.max(1,G.bb/10*.6),price=b=>Math.max(1,Math.round(b*PF()));
const RELIC={
  heal:{t:'Thron flicken',d:'+8 Thron-Leben.',c:30},
  drum:{t:'Kriegstrommel',d:'Deine nächste Formation zählt eine Stufe höher.',c:25},
  shield:{t:'Ahnenschild',d:'Der nächste verlorene Kampf kostet dich keinen Thron.',c:24},
  fourth:{t:'Vierte Karte',d:'Nächste Hand bekommst du 4 Handkarten.',c:40},
  bounty:{t:'Kopfgeld',d:'Jeder gewonnene Kampf bringt dauerhaft mehr Beute.',c:30},
  raven:{t:'Rabenauge',d:'Nächste Hand siehst du von jedem Gegner eine Handkarte.',c:18}};
function mkOffers(){
  const a=[],r1=2+rnd(13);
  a.push({k:'forge',r:r1,cost:price(10+r1*2),t:`Schmiede: ${NAME[r1]}`,d:`Alle ${NAME[r1]}-Karten dauerhaft +2/+2.`});
  const s=rnd(4);a.push({k:'oath',s,cost:price(46),t:`Schwur: ${REALM[s].n}`,d:`Alle Karten dieses Reichs dauerhaft +1/+1.`});
  const ks=Object.keys(RELIC),k=ks[rnd(ks.length)];a.push({k,cost:price(RELIC[k].c),t:RELIC[k].t,d:RELIC[k].d});
  return a}
function applyOffer(p,o){
  if(o.k==='forge')p.up.rank[o.r]=(p.up.rank[o.r]||0)+2;
  else if(o.k==='oath')p.up.realm[o.s]=(p.up.realm[o.s]||0)+1;
  else if(o.k==='heal')p.thron=Math.min(START_THRON,p.thron+8);
  else if(o.k==='bounty')p.bounty=(p.bounty||0)+1;
  else p[o.k]=1;
  p.stack-=o.cost}
function aiShop(p){const offers=mkOffers(),reserve=G.bb*10;let best=null,bv=0;
  for(const o of offers){if(o.cost>p.stack-reserve)continue;let v=0;
    if(o.k==='heal')v=p.thron<START_THRON*.5?3:0;else if(o.k==='oath')v=2;else if(o.k==='forge')v=o.r>=9?2.2:1.2;else if(o.k==='drum')v=1.5;
    else if(o.k==='shield')v=p.thron<START_THRON*.6?2:1;else if(o.k==='fourth')v=2.4;else if(o.k==='bounty')v=G.hand<MAX_HANDS-3?1.6:0;
    v=v/o.cost*40*(.8+Math.random()*.4);if(v>bv){bv=v;best=o}}
  if(bv>.9)applyOffer(p,best)}
async function tavern(){
  for(const p of G.players.slice(1))if(!p.out)aiShop(p);
  const me=G.players[0];let offers=mkOffers();
  while(true){
    const c=await showSheet('tavern',{offers});
    if(c.t==='done')return;
    if(c.t==='reroll'){me.stack-=price(6);offers=mkOffers();continue}
    if(c.t==='buy'){const o=offers[c.i];if(!o.sold&&me.stack-o.cost>=1){applyOffer(me,o);o.sold=true;snd('chip')}}}}

async function gameOver(){
  const me=G.players[0];
  const score=p=>p.out?-1:p.stack+10*p.thron;
  const rank=G.players.slice().sort((a,b)=>score(b)-score(a));
  const won=rank[0]===me;const place=rank.indexOf(me)+1;
  const gain=(won?150:0)+[0,60,30,15,0][place]+G.stats.won*10;const before=rankOf(FAME);FAME+=gain;saveMeta();
  snd(won?'win':'lose');
  await showSheet('over',{won,rank,score,gain,place,up:rankOf(FAME)!==before});
  return newGame()}

/* ================== UI ================== */
function ask(mode,data){return new Promise(res=>{G.ui={mode,...data,res};render()})}
function done(v){const u=G.ui;if(!u)return;G.ui=null;u.res(v)}
function pulse(c){const d=document.createElement('div');d.className='pulse';if(c)d.style.setProperty('--pc',c);document.body.appendChild(d);setTimeout(()=>d.remove(),900)}
function banner(t,s,ms){if(ms===0)return Promise.resolve();snd('thud');const d=document.createElement('div');d.className='banner';d.innerHTML=`<div>${t}${s?`<span>${s}</span>`:''}</div>`;document.body.appendChild(d);
  return new Promise(r=>setTimeout(()=>{d.remove();r()},QA?40:ms||(G.fast?500:1500)))}

function render(){
  if(!G)return;
  rHud();rOpps();rTable();rHand();rCtrl();
  if(G.dealt){snd('tick');G.dealt=0}}

function rHud(){
  const me=G.players[0];
  $('#hud').innerHTML=`<div class="hbtns"><button class="sq" data-a="book" aria-label="Regeln">${IC.book}</button><button class="sq ${SND.on?'':'off'}" data-a="snd" aria-label="Ton ${SND.on?'aus':'an'}">${SND.on?IC.snd:IC.mute}</button></div>
   <div class="hud-c"><b><span class="ini">N</span>acht ${G.hand}</b><span>von ${MAX_HANDS} · Einsatz ${G.bb}</span></div>
   <div class="hud-r">${G.players[G.dealer]===me?'<span class="tag">Geber</span>':''}</div>`;
  $('#meh').innerHTML=`${plateHTML(me)}`;
  const rel=[me.drum&&'Trommel',me.shield&&'Schild',me.fourth&&'4. Karte',me.raven&&'Rabenauge',me.bounty&&('Kopfgeld '+me.bounty)].filter(Boolean);
  $('#meh').insertAdjacentHTML('beforeend',`<div class="who"><b>Du</b><span class="gold">${IC.gold}${me.stack}</span>${rel.length?`<span class="rel">${rel.map(r=>`<i>${r}</i>`).join('')}</span>`:''}</div>`)}

function rOpps(){
  $('#opps').innerHTML=G.players.slice(1).map(p=>{const ticks=Math.ceil(p.thron/2);
    return `<div class="opp ${p.rage?'rage':''} ${p.out?'out':''} ${p.folded?'fold':''} ${G.turn===p?'act':''}">
    <div class="saywrap">${p.say?`<span class="say">${p.say}</span>`:''}</div>
    ${plateHTML(p)}
    ${G.players[G.dealer]===p?'<span class="tag dtag">Geber</span>':''}
    <div class="ost">${IC.gold}${p.stack}</div>
    ${p.bet&&!p.folded?`<div class="obet chip num">${p.bet}</div>`:''}
    ${p.sac.length?`<div class="osac" data-z="${p.sac[0].id}">${cardHTML(p.sac[0],{cls:'xs'})}</div>`:''}
    ${p.peek&&p.hole.includes(p.peek)&&!p.folded?`<div class="opeek" data-z="${p.peek.id}">${cardHTML(p.peek,{cls:'xs'})}<span>Rabenauge</span></div>`:''}
  </div>`}).join('')}

function rTable(){
  const pe=$('#pot');pe.style.setProperty('--fs',(1+Math.min(.9,G.pot/(START_GOLD*2.5))).toFixed(2));
  pe.innerHTML=`${IC.bowl}<div class="num">${G.pot}<small>Pot</small></div>`;
  if(G.pot>G.lastPot){pe.classList.remove('bump');void pe.offsetWidth;pe.classList.add('bump')}G.lastPot=G.pot;
  const ZN=['Flop','Flop','Flop','Turn','River'];let h='';
  const u=G.ui,lu=u&&u.mode==='lineup',me0=G.players[0];
  const tm=lu&&u.sel.length===5?mkTeam(u.sel.map(id=>cardById[id]),me0.up):null;
  for(let i=0;i<5;i++){const c=G.board[i];let o=c?{cls:'xs '+seenCls('b'+c.id)}:{};
    if(c&&lu){const sel=u.sel.includes(c.id),f=tm&&tm.team.find(x=>x.c===c);o={cls:'xs pick '+(sel?'sel':'off'),up:upOf(me0,c),st:f?[f.atk,f.hp]:null}}
    h+=`<div class="zone">${c?cardHTML(c,o):'<div class="slot"></div>'}<span>${ZN[i]}</span></div>`}
  $('#board').innerHTML=h;
  const left=G.deck?G.deck.length:52;$('#deck').innerHTML=left?cardHTML(null,{back:1})+(left>8?cardHTML(null,{back:1}):'')+(left>16?cardHTML(null,{back:1}):''):'';
  const me=G.players[0];let r='';
  if(!me.out&&me.inHand&&!me.folded&&me.hole.length){
    const cs=me.hole.concat(G.board);r=`<b>${handLabel(cs)}</b>`;
    if(G.eq&&G.ui&&G.ui.mode==='bet'){r+=` · Chance <span class="${G.eq.eq>=1/G.eq.n?'g':'r'}">${Math.round(G.eq.eq*100)}%</span>`;
      if(G.eq.toCall>0)r+=` · nötig ${Math.round(G.eq.po*100)}%`}}
  else if(me.folded)r='Du hast geflohen';
  if(u&&u.mode==='sac')r='<b>Opfere eine Karte</b>Sie liegt danach offen auf dem Tisch.';
  if(u&&u.mode==='lineup'){const ch=u.sel.map(id=>cardById[id]);
    if(ch.length===5){const t=mkTeam(ch,me.up),A=t.team.reduce((s,f)=>s+f.atk,0),H=t.team.reduce((s,f)=>s+f.hp,0);r=`<b>${comboLabel(t.b)}</b>alle +${K.FB[t.b.cat]}/+${K.FB[t.b.cat]} · ${A} Angriff · ${H} Leben`}
    else r=`<b>Wähle 5 Karten</b>vom Tisch und aus deiner Hand`}
  $('#read').innerHTML=r}

function rHand(){
  const me=G.players[0],u=G.ui,el=$('#hand');
  if(u&&u.mode==='lineup'){
    const sel=u.sel,tm=sel.length===5?mkTeam(sel.map(id=>cardById[id]),me.up):null;
    el.innerHTML=`<div class="fan n${me.hole.length}">${me.hole.map(c=>{const f=tm&&tm.team.find(x=>x.c===c);
      return cardHTML(c,{cls:'pick '+(sel.includes(c.id)?'sel':'off'),up:upOf(me,c),st:f?[f.atk,f.hp]:null})}).join('')}</div>`;return}
  const cs=me.inHand&&!me.out?me.hole:[];
  if(!cs.length){el.innerHTML='';return}
  const n=cs.length;
  el.innerHTML=`<div class="fan n${n}">${cs.map(c=>{const sel=u&&u.mode==='sac'&&u.sel===c.id;
    return cardHTML(c,{cls:(me.folded?'dim ':'')+(sel?'kill ':'')+seenCls('h'+c.id),up:upOf(me,c)})}).join('')}</div>`}

function rCtrl(){
  const u=G.ui,el=$('#ctrl'),me=G.players[0];
  if(!u){const L=G.line;el.innerHTML=`<div class="waiting">${me.out?'Dein Thron ist gefallen.':L?`<span><b>${L.who}:</b> »${L.text}«</span>`:G.turn&&!G.turn.human?G.turn.short+' überlegt …':''}</div>`;return}
  if(u.mode==='bet'){
    if(u.raising){
      const v=u.val;
      el.innerHTML=`<div class="raisep"><div class="bigv num">${v}<small>${v>=u.capT?'alles':(u.toCall>0?'erhöhen auf':'setzen')}</small></div>
       <input type="range" id="rng" min="${u.minTo}" max="${u.capT}" step="1" value="${v}" aria-label="Betrag">
       <div class="chips"><button class="btn ghost" data-a="pre" data-v="half">½ Pot</button><button class="btn ghost" data-a="pre" data-v="pot">Pot</button><button class="btn ghost" data-a="pre" data-v="all">Alles</button></div></div>
       <div class="row"><button class="btn ghost" data-a="unraise">Zurück</button><button class="btn raise" data-a="doraise">${u.toCall>0?'Erhöhen':'Setzen'}<small>${v>=u.capT?'alles':v+' Gold'}</small></button></div>`;return}
    const cs=u.toCall>0?`Mitgehen<small>${Math.min(u.toCall,me.stack)} Gold</small>`:`Schieben<small>kostenlos</small>`;
    el.innerHTML=`<div class="row"><button class="btn fold" data-a="fold">Fliehen<small>${u.toCall>0?'Einsatz verloren':'unnötig'}</small></button>
      <button class="btn" data-a="call">${cs}</button>
      <button class="btn raise" data-a="raise" ${u.canRaise?'':'disabled'}>${u.toCall>0?'Erhöhen':'Setzen'}<small>${u.canRaise?(u.toCall>0?'auf '+u.minTo:u.minTo+' Gold'):(G.raises>=3?'Limit erreicht':'nicht möglich')}</small></button></div>`;return}
  if(u.mode==='sac'){
    el.innerHTML=`<div class="row"><button class="btn fold" data-a="dosac" ${u.sel?'':'disabled'}>Opfern<small>${u.sel?NAME[cardById[u.sel].r]+' opfern':'Tippe eine Handkarte an'}</small></button></div>`;return}
  if(u.mode==='lineup'){
    const ok=u.sel.length===5;
    el.innerHTML=`<div class="row"><button class="btn ghost" data-a="luauto">Stärkstes<small>Team</small></button><button class="btn ghost" data-a="lupoker">Beste<small>Kombo</small></button><button class="btn raise" data-a="dolu" ${ok?'':'disabled'}>Kämpfen<small>${ok?'5 von 5':u.sel.length+' von 5'}</small></button></div>`;return}
  el.innerHTML=''}

/* ---------- Events ---------- */
document.addEventListener('click',e=>{
  const z=e.target.closest('[data-z]');
  const b=e.target.closest('[data-a]');
  const cd=e.target.closest('#hand .card, #board .card');
  const u=G&&G.ui;
  if(b){const a=b.dataset.a;
    if(a==='book')return showSheet('book',{});
    if(a==='snd'){SND.on=!SND.on;try{localStorage.setItem('at-snd',SND.on?'1':'0')}catch(x){}if(SND.on)snd('click');return render()}
    if(!u)return;
    if(a==='fold')return done({t:'fold'});
    if(a==='call')return done({t:'call'});
    if(a==='raise')return done({t:'raise',to:u.minTo});
    if(a==='unraise'){u.raising=false;return render()}
    if(a==='pre'){const pot=G.pot+u.toCall;const v=b.dataset.v==='all'?u.capT:Math.round(G.curBet+(b.dataset.v==='half'?pot/2:pot));u.val=Math.max(u.minTo,Math.min(u.capT,v));return render()}
    if(a==='doraise')return done({t:'raise',to:u.val});
    if(a==='dosac'&&u.sel)return done(cardById[u.sel]);
    if(a==='luauto'){u.sel=pickTeam(u.cards,G.players[0].up).five.map(c=>c.id);return render()}
    if(a==='lupoker'){u.sel=bestFive(u.cards).five.map(c=>c.id);return render()}
    if(a==='dolu'&&u.sel.length===5)return done(u.sel.map(id=>cardById[id]));
    return}
  if(cd&&u){
    const id=cd.dataset.id;
    if(u.mode==='sac'&&cd.closest('#hand')){u.sel=u.sel===id?null:id;snd('click');return render()}
    if(u.mode==='lineup'){const i=u.sel.indexOf(id);if(i>=0)u.sel.splice(i,1);else if(u.sel.length<5)u.sel.push(id);else{u.sel.shift();u.sel.push(id)}snd('click');return render()}}
  if(cd)return zoom(cd.dataset.id);
  if(z)return zoom(z.dataset.z)});
document.addEventListener('input',e=>{if(e.target.id==='rng'&&G.ui){G.ui.val=+e.target.value;const bv=$('#ctrl .bigv');if(bv)bv.firstChild.textContent=G.ui.val}});
let pressT=null;
document.addEventListener('pointerdown',e=>{const c=e.target.closest('#hand .card');if(!c||!c.dataset.id)return;clearTimeout(pressT);pressT=setTimeout(()=>{pressT=null;zoom(c.dataset.id)},450)});
['pointerup','pointercancel','pointerleave'].forEach(t=>document.addEventListener(t,()=>clearTimeout(pressT)));

/* ---------- Overlays ---------- */
function showOv(html,clear){const o=$('#ov');o.className=clear==='title'?'titlebg':clear?'clear':'';o.innerHTML=html;o.hidden=false}
function hideOv(){const o=$('#ov');o.hidden=true;o.innerHTML='';o.onclick=null}
function zoom(id){
  const c=cardById[id];if(!c||!G)return;const R=REALM[c.s],me=G.players[0],t=tier(c.r);
  showOv(`<div class="zoom"><div>${cardHTML(c,{up:upOf(me,c)})}</div>
    <div class="fl">»${FLAV[c.r]}«</div>
    <div class="lore"><b>${R.n} · ${TIERN[t-1]}</b>${R.lore}<br><i>${R.pn}: ${R.ptx}</i></div></div>`,true);
  const t0=Date.now();
  $('#ov').onclick=()=>{if(Date.now()-t0<350)return;hideOv()}}

function bindOnce(fn){const o=$('#ov');o.onclick=e=>fn(e)}
function showSheet(kind,d){
  return new Promise(res=>{
    const me=G.players[0];
    const fin=v=>{hideOv();res(v)};
    if(kind==='book'){
      const rows=CAT.map((c,i)=>i).reverse().map(i=>`<li><b class="n">${i+1}</b><div><b>${CAT[i]}</b> · ${CATX[i]}<br><i>Formation: alle +${K.FB[i]}/+${K.FB[i]}</i></div></li>`).join('');
      const cr=Object.keys(PST).reverse().map(r=>+r>5?`<li><b class="n">${RL[r]}</b><div><b>${NAME[r]}</b> ${PST[r][0]}/${PST[r][1]} · ${TIERN[tier(+r)-1]}<br><i>${ABIL[r][0]}: ${ABIL[r][1]}</i></div></li>`:`<li><b class="n">${RL[r]}</b><div><b>${NAME[r]}</b> ${PST[r][0]}/${PST[r][1]} · Unterstützer, je Reich anders<br>${REALM.map((R,si)=>{const a=SUPTX[SUP[si][r]];return `<i>${R.n} · ${a[0]}: ${a[1]}</i>`}).join('<br>')}</div></li>`).join('');
      const rl=REALM.map(r=>`<li><b class="n" style="display:flex;justify-content:center;align-items:flex-start;padding-top:2px"><span style="display:block;width:26px;height:26px;background:${r.col};color:#16110f;padding:3px">${r.ic}</span></b><div><b>${r.n}</b> · ${r.strat}<br><i>${r.pn}: ${r.ptx}</i></div></li>`).join('');
      const ups=Object.entries(me.up.rank).map(([r,v])=>`<li><b class="n">+${v}</b><div>${NAME[r]}-Karten</div></li>`).concat(Object.entries(me.up.realm).map(([s,v])=>`<li><b class="n">+${v}</b><div>Reich ${REALM[s].n}</div></li>`)).join('')||'<li><div><i>Noch keine Siegel gekauft.</i></div></li>';
      showOv(`<div class="sheet paper"><h2>Grimoire</h2><p class="k">Poker auf dem Aschenthron</p>
       <details open><summary>So läuft eine Hand</summary>
        <p><b>Ziel.</b> Eine Partie dauert <b>12 Nächte</b>. Wer am Ende den meisten <b>Ruhm</b> hat (Gold + 10 je Thron-Leben), gewinnt. Wer vorher als Einziger übrig ist, gewinnt sofort.</p>
        <p><b>1. Teilen und Kriegszoll.</b> Jeder bekommt <b>3 Kreaturenkarten</b>. Die beiden Plätze nach dem Geber zahlen vorher den <b>Kriegszoll</b>: einen halben und einen ganzen Einsatz. Wer den Flop sehen will, muss mitgehen, umsonst geht es nicht. Gesetzt wird mit <b>festen Beträgen</b>: Erhöhen geht immer um einen Einsatz, ab der Wende um zwei, höchstens dreimal pro Runde. Der Einsatz steigt alle drei Nächte.</p>
        <p><b>2. Flop, Opfer, Wende.</b> Nach dem Flop opfert jeder eine Handkarte, offen für alle. In der Wende kommen Turn und River zusammen, dann wird ein letztes Mal gesetzt.</p>
        <p><b>3. Der Showdown ist ein Kampf.</b> Du wählst 5 deiner 7 Karten. Ihre Pokerkombo ist die <b>Formation</b> und gibt allen fünf Karten einen Bonus. Die Teams schlagen sich automatisch, ohne Würfel. Wer mehr Kämpfe gewinnt, holt den Pot.</p>
        <p><b>4. Thron und Beute.</b> Wer einen Kampf verliert, verliert Thron-Leben: 1 plus die überlebenden Karten des Siegers, alle drei Nächte einer mehr. Jeder gewonnene Kampf bringt <b>Beute</b> in Gold, auch ohne Pot. Wer flieht, bleibt unversehrt, zahlt aber mit Gold.</p>
        <p><b>5. Aschenschmiede.</b> Zwischen den Händen kaufst du Verstärkungen: Schmiede (+2/+2 für eine Kreatur), Schwur (+1/+1 für ein Reich), Thron flicken, Kriegstrommel (Formation eine Stufe höher), Ahnenschild (nächste Niederlage ohne Thron-Verlust), Vierte Karte, Kopfgeld (mehr Beute) und Rabenauge (je eine Gegnerkarte sehen). Gold in der Schmiede fehlt dir am Tisch. Fällt Thron oder Gold auf 0, bist du raus.</p>
        <p><b>Seltenheit.</b> Das Kronen-Symbol in der Typzeile zeigt sie: schwarz gemein, silber ungewöhnlich, gold selten, orange mythisch. Ab Selten trägt die Karte den Holo-Stempel, Könige und Drachen die Legendenkrone, der Drache ist Folie.</p></details>
       <details><summary>Kombos &amp; Formation</summary><ul>${rows}</ul></details>
       <details><summary>Kreaturen</summary><ul>${cr}</ul></details>
       <details><summary>Reiche</summary><ul>${rl}</ul></details>
       <details><summary>Deine Siegel</summary><ul>${ups}</ul></details>
       <div class="row" style="margin-top:18px"><button class="plate btn dk" data-x="close">Schließen</button></div></div>`);
      bindOnce(e=>{if(e.target.closest('[data-x=close]'))fin()});return}
    if(kind==='tavern'){
      const{offers}=d;
      showOv(`<div class="sheet"><h2>Aschenschmiede</h2><p class="k">Gold wird hier zu Macht, und fehlt dir am Tisch.</p>
        <div class="offers">${offers.map((o,i)=>{const R=o.k==='oath'?REALM[o.s]:null;
          const pic=o.k==='forge'?`<img src="cards/pk-${o.r}-${rnd(4)}.jpg" alt=""><b>+2</b>`:o.k==='oath'?`${R.ic}<b>+1</b>`:(RIC[o.k]||IC.thron)+(o.k==='heal'?'<b>+8</b>':'');
          return `<button class="offer ${o.sold?'sold':''}" data-i="${i}" ${(o.sold||me.stack-o.cost<1)?'disabled':''} style="--oc:${R?R.col:'#efe6cf'}"><span class="pic">${pic}</span><span class="tx"><strong>${o.t}</strong><span>${o.d}</span></span><span class="pr">${IC.gold}${o.cost}</span></button>`}).join('')}</div>
        <p class="k">Du hast ${me.stack} Gold · Thron ${me.thron}</p>
        <div class="row"><button class="plate btn ghost" data-x="reroll" ${me.stack>price(6)+1?'':'disabled'}>Neu würfeln<small>${price(6)} Gold</small></button><button class="plate btn" data-x="done">Nächste Hand</button></div></div>`);
      bindOnce(e=>{const o=e.target.closest('.offer'),x=e.target.closest('[data-x]');
        if(o)fin({t:'buy',i:+o.dataset.i});else if(x&&x.dataset.x==='reroll')fin({t:'reroll'});else if(x&&x.dataset.x==='done')fin({t:'done'})});return}
    if(kind==='over'){
      const s=G.stats;
      showOv(`<div class="title canvas page" style="justify-content:center;gap:12px">${CORN}<h1>${d.won?'Der Thron ist dein':'Asche'}</h1>
        <p>${d.won?'Nach '+G.hand+' Nächten führt dein Banner.':d.place===2?'Knapp. Platz 2 nach '+G.hand+' Nächten.':'Platz '+d.place+' nach '+G.hand+' Nächten.'}</p>
        <div class="res" style="width:100%">${d.rank.map((p,k)=>`<div class="rrow ${k===0?'win':''}"><b class="pl">${k+1}</b>${plateHTML(p)}<b>${p.short}<small>${p.out?'gefallen':'Thron '+p.thron+' · Gold '+p.stack}</small></b><div class="d">${p.out?'—':d.score(p)}<small>Ruhm</small></div></div>`).join('')}</div>
        <p class="rang">+${d.gain} Ruhm · Rang ${rankOf(FAME)}${d.up?' (aufgestiegen)':''}${s.bestName?'<br>Stärkste Formation: '+s.bestName:''}</p>
        <div class="row"><button class="plate btn raise" data-x="again">Neue Partie</button></div></div>`);
      bindOnce(e=>{if(e.target.closest('[data-x]'))fin()});return}
    if(kind==='result'){
      const{L,W,dmg,wins}=d,share=Math.floor(G.pot/W.length);
      showOv(`<div class="sheet"><h2>${W.includes(me)?'Der Pot ist dein':W[0].short+' nimmt den Pot'}</h2><p class="k">${G.pot} Gold · ${W.map(p=>comboLabel(p.team.b)).join(' / ')}</p>
        <div class="res">${L.map(p=>`<div class="rrow ${W.includes(p)?'win':''}">${plateHTML(p)}<b>${p.short}<small>${comboLabel(p.team.b)}${p.team.drum?' + Trommel':''} · ${wins.get(p)} Siege${p.loot?' · +'+p.loot+' Beute':''}</small></b>
          <div class="d ${W.includes(p)?'g':'r'}">${W.includes(p)?'+'+share:(dmg.get(p)?'−'+dmg.get(p)+' Thron':'—')}<small>${W.includes(p)?'Gold':'Thron '+p.thron}</small></div></div>`).join('')}</div>
        <div class="row"><button class="plate btn" data-x="ok">Weiter</button></div></div>`);
      bindOnce(e=>{if(e.target.closest('[data-x]'))fin()});return}
    res()})}

/* ---------- Kampf ---------- */
async function playBattle(x){
  const me=G.players[0],mineA=x.A===me,Pm=mineA?x.A:x.B,Pe=mineA?x.B:x.A;
  const myIdx=mineA?0:1,enIdx=1-myIdx,snaps=x.r.snaps;
  await banner(comboLabel(Pm.team.b),`Formation: alle +${K.FB[Pm.team.b.cat]}/+${K.FB[Pm.team.b.cat]}`,G.fast?400:1500);
  const mk=(P,cls)=>`<div class="lanes ${cls}" id="${cls==='me'?'bp':'be'}">${P.team.team.map(f=>cardHTML(f.c,{cls:'xs'+(f.shield?' shd':'')+(f.sup?' sup':''),st:[f.atk,f.hp],up:f.up||0})).join('')}</div>`;
  showOv(`<div id="battle" class="canvas page">${CORN}
    <div class="bhero e">${plateHTML(Pe)}<div class="bt"><b>${Pe.name}</b><span>${comboLabel(Pe.team.b)} · alle +${K.FB[Pe.team.b.cat]}</span></div></div>
    <div class="sp"></div>
    ${mk(Pe,'en')}
    <div class="bmid"><div class="blbl" id="bl">Aufstellung</div><div class="bnote" id="bn"></div><div class="bres" id="br"></div></div>
    ${mk(Pm,'me')}
    <div class="sp"></div>
    <div class="bhero m">${plateHTML(me)}<div class="bt"><b>Du</b><span>${comboLabel(Pm.team.b)} · alle +${K.FB[Pm.team.b.cat]}</span></div></div>
    <div class="bfoot"><button class="plate btn ghost" data-x="fast">Schneller</button><button class="plate btn ghost" data-x="skip">Überspringen</button></div></div>`);
  const sh=sleepable(),ov=$('#ov');
  let speed=QA?60:1100,skip=false,all=false;
  ov.onclick=e=>{const b=e.target.closest('[data-x]');if(!b)return;
    if(b.dataset.x==='fast'){speed=speed>500?420:1100;b.textContent=speed>500?'Schneller':'Normal'}
    if(b.dataset.x==='skip'){skip=true;sh.wake()}
    if(b.dataset.x==='all'){all=true;skip=true;sh.wake()}
    if(b.dataset.x==='next'){sh.wake()}};
  const rowCards=id=>[...document.querySelectorAll('#'+id+' .card')];
  const sidesCards=side=>rowCards((side===myIdx)?'bp':'be');
  const prevAlive=[[],[]];
  const burst=(el,col,n)=>{const r=el.getBoundingClientRect();spark(r.left+r.width/2,r.top+r.height/2,col,n)};
  const paint=(s,quiet)=>{
    for(const side of[0,1])sidesCards(side).forEach((c,i)=>{const st=s.st[side][i];if(!st)return;
      c.querySelector('.at').textContent=st.atk;c.querySelector('.hpb').textContent=Math.max(0,st.hp);
      if(prevAlive[side][i]!==false&&!st.alive&&!quiet){burst(c,'#6e170f',9);snd('die');if(navigator.vibrate)navigator.vibrate(40)}
      prevAlive[side][i]=st.alive;c.classList.toggle('dead',!st.alive);c.classList.toggle('shd',!!st.sh&&st.alive);c.classList.toggle('frz',!!st.fz&&st.alive)});
    if(quiet)return;
    s.hits.forEach(h=>{const c=sidesCards(h.s)[h.i];if(!c)return;if(h.sh){const f=document.createElement('div');f.className='fl num shf';f.textContent='Schild';c.appendChild(f);setTimeout(()=>f.remove(),950);snd('click');return}c.classList.remove('hit');void c.offsetWidth;c.classList.add('hit');
      const al=sidesCards(1-h.s)[h.i];if(al){al.classList.remove('lunge');void al.offsetWidth;al.classList.add('lunge')}
      burst(c,'#a3261b',h.d>=6?6:3);snd('hit');
      if(h.d>=6){const b=$('#battle');b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake')}
      const f=document.createElement('div');f.className='fl num';f.textContent='−'+h.d;c.appendChild(f);setTimeout(()=>f.remove(),950)})};
  for(let k=0;k<snaps.length;k++){
    const s=snaps[k];$('#bl').textContent=s.label;
    $('#bn').innerHTML=s.notes.slice(-2).join('<br>');paint(s,skip);
    if(skip)continue;
    await sh.wait(speed);
    if(skip){const l=snaps[snaps.length-1];$('#bl').textContent=l.label;paint({st:l.st,hits:[]},true)}}
  if(skip){const l=snaps[snaps.length-1];$('#bl').textContent=l.label;paint({st:l.st,hits:[]},true)}
  const win=x.w===-1?'d':(x.w===myIdx?'w':'l');
  $('#br').className='bres '+win;$('#br').textContent=win==='w'?'Sieg':win==='l'?'Niederlage':'Unentschieden';
  $('#bn').textContent=win==='l'?`Du verlierst ${x.dmg} Thron`:win==='w'?`${Pe.short} verliert ${x.dmg} Thron`:'Kein Schaden';
  snd(win==='w'?'win':win==='l'?'lose':'click');
  document.querySelector('.bfoot').innerHTML=`<button class="plate btn" data-x="next">Weiter</button><button class="plate btn ghost" data-x="all">Alle überspringen</button>`;
  await sh.wait(1e9);
  hideOv();return all?'all':''}
function sleepable(){let r=null,t=null;return{wait(ms){return new Promise(res=>{r=res;t=setTimeout(()=>{r=null;res()},ms)})},wake(){clearTimeout(t);if(r){const f=r;r=null;f()}}}}

/* ---------- Titel ---------- */
function title(){
  document.body.classList.add('intro');
  showOv(`<div class="title canvas page">${CORN}<h1><span class="ini">A</span>schenthron</h1><h2>Das Rote Buch der zwölf Nächte</h2>
    <div class="cards">${cardHTML(cardById['7-0'])}${cardHTML(cardById['12-3'])}${cardHTML(cardById['14-1'])}</div>
    <p>Poker um Gold. Der Showdown ist eine Schlacht. Wer fällt, dessen Banner brennt.</p>
    <div class="rang">Rang: ${rankOf(FAME)} · Ruhm ${FAME}</div>
    <div class="row"><button class="plate btn raise" data-x="go">Den Thronsaal betreten</button><button class="plate btn ghost" data-x="book">Regeln lesen</button></div></div>`,'title');
  $('#ov').onclick=e=>{const b=e.target.closest('[data-x]');if(!b)return;
    if(b.dataset.x==='book'){G={players:[{up:{rank:{},realm:{}}}],dealer:0};return showSheet('book',{}).then(()=>{G=null;title()})}
    hideOv();snd('thud');newGame()}}

/* ---------- Asche & Funken (Canvas): eckige Flocken, kein Leuchten ---------- */
let spark=()=>{};
(function(){
  const cv=$('#fx'),ctx=cv.getContext('2d');let w,h;const P=[],S=[];
  const fit=()=>{const r=devicePixelRatio||1;w=cv.width=innerWidth*r;h=cv.height=innerHeight*r;ctx.setTransform(r,0,0,r,0,0);w=innerWidth;h=innerHeight};fit();addEventListener('resize',fit);
  const mk=()=>({x:Math.random()*w,y:Math.random()*h,s:1.5+Math.random()*2.5,v:.2+Math.random()*.5,a:Math.random()*6.28,c:Math.random()<.25?'#e8502c':'#efe6cf',o:.12+Math.random()*.3});
  /* keine Ascheflocken auf Pergament */
  spark=(x,y,col,n=10)=>{for(let i=0;i<n;i++){const a=Math.random()*6.28,v=2+Math.random()*5;S.push({x,y,vx:Math.cos(a)*v*.7,vy:Math.sin(a)*v*.7-1.2,s:1.5+Math.random()*1.8,l:1,c:Math.random()<.3?'#2b1d12':col})}};
  (function tick(){ctx.clearRect(0,0,w,h);
    for(const p of P){p.a+=.012;p.x+=Math.sin(p.a)*.35;p.y+=p.v;if(p.y>h+8){Object.assign(p,mk());p.y=-6}
      ctx.globalAlpha=p.o*.6;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.s*.45,0,6.28);ctx.fill()}
    for(let i=S.length-1;i>=0;i--){const s=S[i];s.x+=s.vx;s.y+=s.vy;s.vy+=.35;s.vx*=.97;s.l-=.035;if(s.l<=0){S.splice(i,1);continue}
      ctx.globalAlpha=Math.min(1,s.l*1.4);ctx.fillStyle=s.c;ctx.beginPath();ctx.arc(s.x,s.y,s.s,0,6.28);ctx.fill()}
    requestAnimationFrame(tick)})()})();

/* ---------- Feste Spielfläche: 400 breit, 700 bis 900 hoch, als Ganzes auf das Gerät skaliert ---------- */
function fit(){const vw=innerWidth,vh=innerHeight,s=Math.min(vw/400,vh/740),H=Math.round(Math.max(740,Math.min(vh/s,900)));
  const r=document.documentElement.style;r.setProperty('--s',s.toFixed(4));r.setProperty('--H',H+'px')}
fit();addEventListener('resize',fit);addEventListener('orientationchange',()=>setTimeout(fit,200));

title();
