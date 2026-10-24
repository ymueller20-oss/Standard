'use strict';
/* ASCHENTHRON — Poker + Battlegrounds.
   Poker: Hold'em mit Opfer-Runde, Einsätze in Gold. Showdown: 5 von 7 Karten werden zum Team, die Pokerkombo ist die Formation.
   Battlegrounds: Teams kämpfen automatisch, Verlierer verlieren Thron-Leben. Zwischen den Händen kaufst du mit dem Gold permanente Siegel.
   Die Kampf-Engine (eval5, mkTeam, battle, pickTeam) steht in engine.js. */

const NAME={2:'Ratte',3:'Krähe',4:'Keiler',5:'Wolf',6:'Ghul',7:'Greif',8:'Troll',9:'Lindwurm',10:'Riese',11:'Mantikor',12:'Nachtmahr',13:'Wyvern',14:'Drache'};
const RL={2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'B',12:'D',13:'K',14:'A'};
const ABIL={2:['Schwarm','+1/+1 für jede andere Karte mit Stärke 5 oder weniger im Team.'],3:['Aasfresser','+1 Angriff, wann immer ein Gegner stirbt.'],
  4:['Sturmangriff','Sein erster Angriff verursacht doppelten Schaden.'],5:['Rudeljäger','+1 Angriff für jede andere Karte aus seinem Reich im Team.'],
  6:['Zäh','Erleidet aus jeder Quelle 1 Schaden weniger.'],7:['Sturzflug','Greift immer den Gegner mit den wenigsten Leben an.'],
  8:['Regeneration','Heilt am Ende jeder Runde 2 Leben.'],9:['Gift','Wen er verletzt, der verliert am Ende jeder Runde 1 Leben.'],
  10:['Bollwerk','Seine Nachbarn erleiden 1 Schaden weniger.'],11:['Stachel','Trifft zusätzlich die Nachbarn seines Ziels mit 2 Schaden.'],
  12:['Grauen','Der Gegner gegenüber kämpft mit −2 Angriff.'],13:['Erstschlag','Schlägt jede Runde zu, bevor die anderen zuschlagen.'],
  14:['Feueratem','Zu Kampfbeginn 2 Schaden an allen Gegnern.']};
const FLAV={2:'In den Gräben fressen sie zuerst die Augen.',3:'Sie zählt die Gehenkten. Sie verzählt sich nie.',4:'Der Jäger kam mit drei Hunden. Der Keiler ging mit allen.',5:'Wenn der Winter kommt, gehört der Wald dem Rudel.',6:'Er gräbt nicht nach Gold.',7:'Ein Ritter ohne Pferd ist ein Mahl ohne Teller.',8:'Brich ihm die Knochen. Am Morgen sind sie heil. Deine nicht.',9:'Erst wollte er eine Jungfrau im Jahr. Dann zwei.',10:'Die Burg war sein Spielzeug. Er hat damit gespielt.',11:'Drei Reihen Zähne, ein Stachel und kein Mitleid.',12:'Wer sie reiten hört, wacht nicht mehr auf.',13:'Sie kommt aus der Sonne. Man sieht nur ihren Schatten.',14:'Könige knien. Drachen nicht.'};
const CAT=['Einzelgänger','Paar','Zwei Paare','Rudel','Jagdkette','Banner','Horde','Plage','Kriegszug','Drachenkrone'];
const CATX=['Höchste Karte','zwei gleiche Stärken','zweimal zwei gleiche Stärken','drei gleiche Stärken','fünf Stärken in Folge','fünf Karten aus einem Reich','Rudel plus Paar','vier gleiche Stärken','Jagdkette aus einem Reich','Jagdkette bis zum Drachen aus einem Reich'];
const IC={
  sun:'<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="3.4"/><path d="M8 .5v3M8 12.5v3M.5 8h3M12.5 8h3M2.7 2.7l2.1 2.1M11.2 11.2l2.1 2.1M2.7 13.3l2.1-2.1M11.2 4.8l2.1-2.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  fire:'<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 .8c.9 3 4.4 4.3 4.4 8.6a4.4 4.4 0 0 1-8.8 0c0-2.2 1.1-3.4 2.1-4.3 0 2 .9 3.1 2 3.3-.9-3 .3-5.4.3-7.6z"/></svg>',
  ice:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 1v14M1.9 4.5l12.2 7M1.9 11.5l12.2-7M5.8 2.2 8 3.8l2.2-1.6M5.8 13.8 8 12.2l2.2 1.6"/></svg>',
  blood:'<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 .8c3 5 5.2 7.2 5.2 10.2a5.2 5.2 0 0 1-10.4 0C2.8 8 5 5.8 8 .8z"/></svg>',
  thron:'<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 16V6l4.5 4L10 3l3.5 7L18 6v10z"/><rect x="2" y="17" width="16" height="2"/></svg>',
  gold:'<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="#c9a45a" stroke="#6e5a34" stroke-width="1.5"/><circle cx="10" cy="10" r="4.6" stroke="#6e5a34" stroke-width="1.3"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 4.5C4 3.7 4.7 3 5.5 3H19v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V4.5M9 7.5h6M9 11h6"/></svg>',
  brazier:'<svg viewBox="0 0 48 48"><path d="M10 24h28l-4 12H14z" fill="#2a1d14" stroke="#c9a45a" stroke-width="1.6"/><path d="M18 36l-3 8M30 36l3 8M24 36v8" stroke="#c9a45a" stroke-width="1.6" fill="none"/><path d="M24 4c2 6 10 8 10 16 0 5-4 8-10 8s-10-3-10-8c0-4 2-6 4-8 0 4 2 6 4 6-2-6 0-10 2-14z" fill="#e0873a"/><path d="M24 14c1 4 6 5 6 9 0 3-2 5-6 5s-6-2-6-5c0-2 1-4 3-5 0 2 1 3 2 3-1-3 0-5 1-7z" fill="#ffd27a"/></svg>'
};
const REALM=[
  {n:'Sonnenwacht',col:'#e8c66a',ic:IC.sun,pn:'Schwur',ptx:'+16/+16 je weiterer Teamkarte gleicher Stärke.',strat:'Paare, Rudel, Plagen'},
  {n:'Aschelande',col:'#ee7a32',ic:IC.fire,pn:'Feuerkette',ptx:'+8/+8 je weiterem Glied ihrer Stärkenkette im Team.',strat:'Jagdketten'},
  {n:'Nordmark',col:'#9cc8f0',ic:IC.ice,pn:'Eiswall',ptx:'+5/+5 je weiterer Nordmark-Karte im Team.',strat:'Banner (alle fünf aus einem Reich)'},
  {n:'Blutmoor',col:'#e0404e',ic:IC.blood,pn:'Blutrausch',ptx:'Jede Kampfrunde +3 Angriff. Fällt sie, schlägt sie noch einmal mit vollem Angriff zu.',strat:'Langer Kampf'}];
const OPP=[
  {name:'Vargo Rotzahn',short:'Vargo',tag:'Söldner',col:'#ff9040',st:{aggr:.75,bluff:.16,tight:0},look:'horns'},
  {name:'Mutter Grauweid',short:'Grauweid',tag:'Hexe',col:'#b6f070',st:{aggr:.5,bluff:.05,tight:.5},look:'hat'},
  {name:'Die stumme Ysa',short:'Ysa',tag:'Meuchlerin',col:'#ff60c0',st:{aggr:.65,bluff:.22,tight:-.1},look:'veil'}];
const BLINDS=[10,15,20,30,40,60,80,120];
const START_GOLD=250,START_THRON=40,HAND_EVERY=5;

/* ---------- Helfer ---------- */
const $=s=>document.querySelector(s);
const rnd=n=>Math.floor(Math.random()*n);
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
let G=null;
const sleep=ms=>new Promise(r=>setTimeout(r,G&&G.fast?ms*.3:ms));
const cardById={};FULL.forEach(c=>cardById[c.id]=c);
const icon=(k,c)=>`<span style="display:inline-flex;color:${c||'inherit'}">${IC[k]}</span>`;

function hood(look,col){
  const extra={horns:`<path d="M26 34C14 28 10 14 12 4c8 6 14 14 20 22zM74 34c12-6 16-20 14-30-8 6-14 14-20 22z" fill="#0b0809" stroke="${col}" stroke-opacity=".5"/>`,
    hat:`<path d="M50 -6L30 40h40z" fill="#0b0809" stroke="${col}" stroke-opacity=".5"/><path d="M22 42h56" stroke="${col}" stroke-opacity=".6" stroke-width="3"/>`,
    veil:`<path d="M30 58c6 10 34 10 40 0v26c-10 6-30 6-40 0z" fill="#0b0809" stroke="${col}" stroke-opacity=".4"/>`}[look]||'';
  return `<svg viewBox="0 0 100 120" aria-hidden="true">${extra}
    <path d="M50 10C26 12 15 42 13 72L5 120h90L87 72C85 42 74 12 50 10z" fill="#0b0809" stroke="${col}" stroke-opacity=".35" stroke-width="1.5"/>
    <ellipse cx="50" cy="54" rx="21" ry="27" fill="#010101"/>
    <g style="filter:drop-shadow(0 0 5px ${col}) drop-shadow(0 0 10px ${col})" fill="${col}"><ellipse cx="41" cy="52" rx="4.6" ry="2.4"/><ellipse cx="59" cy="52" rx="4.6" ry="2.4"/></g>
    <path d="M30 100c8 6 32 6 40 0" stroke="${col}" stroke-opacity=".25" fill="none"/></svg>`}

/* ---------- Karten-HTML ---------- */
function cardHTML(c,o={}){
  if(o.back)return `<div class="card back ${o.cls||''}"></div>`;
  const R=REALM[c.s],team=o.st;
  const stats=team||[PST[c.r][0]+(o.up||0),PST[c.r][1]+(o.up||0)];
  const upb=o.up?`<i class="upb">+${o.up}</i>`:'';
  return `<div class="card ${o.cls||''} st" data-id="${c.id}" style="--rc:${R.col};${o.style||''}">
    <img src="cards/pk-${c.r}-${c.s}.jpg" alt="${NAME[c.r]}" draggable="false" loading="eager">
    <i class="rk">${RL[c.r]}</i><span class="sg">${R.ic}</span>${upb}
    <b class="nm">${NAME[c.r]}</b>
    <i class="at ${team&&team[0]>PST[c.r][0]+(o.up||0)?'up':''}">${stats[0]}</i><i class="hpb ${team&&team[1]>PST[c.r][1]+(o.up||0)?'up':''}">${stats[1]}</i></div>`}
const upOf=(p,c)=>(p.up.rank[c.r]||0)+(p.up.realm[c.s]||0);
function seenCls(key){if(!G.seen)G.seen=new Set();if(G.seen.has(key))return '';G.seen.add(key);return 'deal'}

/* ---------- Kombo-Beschreibung ---------- */
const RN=r=>NAME[r];
function comboLabel(b){if(!b)return'';const t=b.tb,f=b.five;switch(b.cat){
  case 0:return`Einzelgänger · ${RN(t[0])}`;case 1:return`Paar · ${RN(t[0])}`;case 2:return`Zwei Paare · ${RN(t[0])} & ${RN(t[1])}`;
  case 3:return`Rudel · ${RN(t[0])}`;case 4:return`Jagdkette bis ${RN(t[0])}`;case 5:return`Banner · ${REALM[f[0].s].n}`;
  case 6:return`Horde · ${RN(t[0])} über ${RN(t[1])}`;case 7:return`Plage · ${RN(t[0])}`;case 8:return`Kriegszug bis ${RN(t[0])}`;case 9:return`Drachenkrone · ${REALM[f[0].s].n}`}}
function partLabel(cs){if(!cs.length)return'';const r=cs.map(c=>c.r).sort((a,b)=>b-a);const cnt={};r.forEach(x=>cnt[x]=(cnt[x]||0)+1);const m=Math.max(...Object.values(cnt));
  if(m>=4)return'Plage';if(m===3)return'Rudel · '+RN(+Object.keys(cnt).find(k=>cnt[k]===3));if(m===2)return'Paar · '+RN(+Object.keys(cnt).find(k=>cnt[k]===2));return'Höchste: '+RN(r[0])}
function handLabel(cs){return cs.length>=5?comboLabel(bestFive(cs)):partLabel(cs)}

/* ---------- Gewinnchance (Monte-Carlo, nur Pokerkombo) ---------- */
function equity(p,samples){
  const known=new Set([...p.hole,...G.board,...G.players.flatMap(q=>q.sac)].map(c=>c.id));
  const deck=FULL.filter(c=>!known.has(c.id));
  const opps=G.players.filter(q=>q!==p&&q.inHand&&!q.folded);
  let w=0;
  for(let s=0;s<samples;s++){
    const d=shuffle(deck.slice());let k=0;
    const bd=G.board.concat(d.slice(k,k+5-G.board.length));k+=5-G.board.length;
    const mine=bestScore(p.hole.concat(bd));let beat=true,tie=0;
    for(const q of opps){const h=d.slice(k,k+q.hole.length);k+=q.hole.length;const sc=bestScore(h.concat(bd));if(sc>mine){beat=false;break}if(sc===mine)tie++}
    if(beat)w+=1/(1+tie)}
  return w/samples}

/* ---------- Spielzustand ---------- */
function newGame(){
  const P=[{name:'Du',short:'Du',human:true,col:'#c9a45a'}].concat(OPP.map(o=>({...o})));
  G={players:P.map((p,i)=>({i,...p,stack:START_GOLD,thron:START_THRON,hole:[],sac:[],up:{rank:{},realm:{}},folded:false,inHand:false,out:false,bet:0,say:'',wins:0})),
    hand:0,dealer:3,board:[],pot:0,bb:10,ante:2,curBet:0,minRaise:10,ui:null,seen:new Set(),turn:null,fast:false,log:'',stats:{won:0,best:0,bestName:''}};
  return runGame()}

async function runGame(){
  const me=G.players[0];
  while(true){
    await playHand();
    for(const p of G.players)if(!p.out&&(p.stack<=0||p.thron<=0)){p.out=true;p.inHand=false}
    render();
    const alive=G.players.filter(p=>!p.out);
    if(me.out||alive.length===1)break;
    await tavern();
  }
  await gameOver()}

const live=()=>G.players.filter(p=>p.inHand&&!p.folded);
function seatOrderFrom(i){const n=G.players.length,o=[];for(let k=1;k<=n;k++){const p=G.players[(i+k)%n];if(!p.out)o.push(p)}return o}

async function playHand(){
  G.hand++;G.fast=false;G.board=[];G.pot=0;G.seen=new Set();
  const lvl=Math.min(BLINDS.length-1,Math.floor((G.hand-1)/HAND_EVERY));G.bb=BLINDS[lvl];G.ante=Math.max(2,Math.round(G.bb/5));
  do{G.dealer=(G.dealer+1)%G.players.length}while(G.players[G.dealer].out);
  const deck=shuffle(FULL.slice());
  for(const p of G.players){p.hole=[];p.sac=[];p.folded=false;p.bet=0;p.say='';p.team=null;p.inHand=!p.out;
    if(p.inHand){const a=Math.min(p.stack,G.ante);p.stack-=a;G.pot+=a}}
  for(const p of G.players)if(p.inHand)p.hole=deck.splice(0,3);
  G.deck=deck;
  G.log=`Hand ${G.hand} · Einsatz ${G.bb} · Ante ${G.ante}`;render();await sleep(900);
  // Vor dem Flop
  await betRound();if(await soleWinner())return;
  G.board.push(...G.deck.splice(0,3));G.log='Der Flop';render();await sleep(700);
  await betRound();if(await soleWinner())return;
  await sacrifice();
  G.board.push(...G.deck.splice(0,1));G.log='Der Turn';render();await sleep(600);
  await betRound();if(await soleWinner())return;
  G.board.push(...G.deck.splice(0,1));G.log='Der River';render();await sleep(600);
  await betRound();if(await soleWinner())return;
  await showdown()}

async function soleWinner(){
  const l=live();if(l.length>1)return false;
  const w=l[0];w.stack+=G.pot;const got=G.pot;G.pot=0;G.turn=null;
  if(w.human){G.stats.won++}
  G.log=`${w.short} gewinnt ${got} Gold`;w.say='Alle flohen';render();await sleep(1100);return true}

/* ---------- Einsatzrunde ---------- */
async function betRound(){
  const act=live();if(act.length<2)return;
  G.players.forEach(p=>{p.bet=0;p.say=''});G.curBet=0;G.minRaise=G.bb;
  const order=seatOrderFrom(G.dealer).filter(p=>p.inHand&&!p.folded);
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
    const minTo=Math.min(capT,G.curBet+G.minRaise);
    const canRaise=capT>G.curBet&&p.stack>toCall;
    const a=p.human?await humanAct(toCall,minTo,capT,canRaise):await aiAct(p,toCall,minTo,capT,canRaise);
    p.say='';
    if(a.t==='fold'){p.folded=true;p.say='Flieht';need.delete(p);if(p.human)G.fast=true}
    else if(a.t==='call'){const amt=Math.min(toCall,p.stack);p.stack-=amt;p.bet+=amt;G.pot+=amt;need.delete(p);p.say=toCall<=0?'Schiebt':(p.stack<=0?'Alles!':'Geht mit')}
    else{const to=Math.max(minTo,Math.min(capT,a.to)),amt=to-p.bet;
      G.minRaise=Math.max(G.minRaise,to-G.curBet);p.stack-=amt;p.bet=to;G.pot+=amt;G.curBet=to;
      need.clear();live().forEach(q=>{if(q!==p&&q.stack>0)need.add(q)});if(p.stack<=0)pulse('rgba(200,60,10,.75)');p.rage=true;setTimeout(()=>p.rage=false,800);p.say=p.stack<=0?'Alles! '+to:(toCall<=0?'Setzt ':'Erhöht auf ')+to}
    G.turn=null;render();await sleep(p.human?250:700);
  }
  G.turn=null;G.players.forEach(p=>{if(!p.folded)p.say=''});
  render()}

/* ---------- KI ---------- */
async function aiAct(p,toCall,minTo,capT,canRaise){
  await sleep(650+rnd(700));
  const n=live().length,eq=equity(p,70),fair=1/n,st=p.st,bb=G.bb;
  const po=toCall/(G.pot+toCall||1),e=eq+(Math.random()-.5)*.08,bluff=Math.random()<st.bluff;
  const size=()=>{const f=.35+Math.random()*.5+Math.max(0,e-fair)*.8;let to=G.curBet+Math.max(G.minRaise,Math.round(G.pot*f/5)*5);return Math.min(capT,Math.max(minTo,to))};
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
  const eq=equity(p,160),n=live().length;
  G.eq={eq,n,toCall,po:toCall/(G.pot+toCall||1)};
  return ask('bet',{toCall,minTo,capT,canRaise,raising:false,val:minTo})}

/* ---------- Opfer ---------- */
async function sacrifice(){
  G.log='Opfere eine Handkarte. Sie liegt offen.';
  for(const p of live()){
    if(p.human){const c=await ask('sac',{sel:null});p.hole=p.hole.filter(x=>x!==c);p.sac.push(c)}
    else{let bestI=0,bs=-1;p.hole.forEach((c,i)=>{const rest=p.hole.filter((_,j)=>j!==i).concat(G.board);const sc=bestScore(rest)*100+(14-c.r)*0.0;if(sc>bs||(sc===bs&&c.r<p.hole[bestI].r)){bs=sc;bestI=i}});
      p.say='Opfert';const c=p.hole.splice(bestI,1)[0];p.sac.push(c);G.turn=p;render();await sleep(700);p.say=''}}
  G.turn=null;G.log='Geopferte Karten liegen offen';render();await sleep(500)}

/* ---------- Showdown ---------- */
async function showdown(){
  const L=live(),me=G.players[0];G.log='Showdown';render();await sleep(500);
  for(const p of L){
    const seven=p.hole.concat(G.board);
    let five;
    if(p.human)five=await ask('lineup',{cards:seven.slice().sort((a,b)=>b.r-a.r||a.s-b.s),sel:bestFive(seven).five.map(c=>c.id)});
    else five=pickTeam(seven,p.up).five;
    p.team=mkTeam(five,p.up)}
  const wins=new Map(L.map(p=>[p,0])),dmg=new Map(),pairs=[];
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
    const A=L[i],B=L[j],r=battle(A.team.team,B.team.team,true),last=r.snaps[r.snaps.length-1];
    const aliveA=last.st[0].filter(x=>x.alive).length,aliveB=last.st[1].filter(x=>x.alive).length;
    const rec={A,B,r,w:r.w};pairs.push(rec);
    if(r.w===0){wins.set(A,wins.get(A)+1);dmg.set(B,(dmg.get(B)||0)+1+aliveA+Math.floor((G.hand-1)/6));rec.dmg=1+aliveA+Math.floor((G.hand-1)/6)}
    else if(r.w===1){wins.set(B,wins.get(B)+1);dmg.set(A,(dmg.get(A)||0)+1+aliveB+Math.floor((G.hand-1)/6));rec.dmg=1+aliveB+Math.floor((G.hand-1)/6)}}
  // Kämpfe zeigen, an denen du beteiligt bist
  const mine=pairs.filter(x=>x.A===me||x.B===me);
  for(const x of mine){const skip=await playBattle(x);if(skip==='all')break}
  // Sieger
  const top=Math.max(...wins.values());
  let W=L.filter(p=>wins.get(p)===top);
  if(W.length>1){const m=Math.max(...W.map(p=>p.team.b.score));W=W.filter(p=>p.team.b.score===m)}
  const share=Math.floor(G.pot/W.length);W.forEach(p=>p.stack+=share);W[0].stack+=G.pot-share*W.length;
  if(W.includes(me)){G.stats.won++;const sc=me.team.b.cat;if(sc>=G.stats.best){G.stats.best=sc;G.stats.bestName=comboLabel(me.team.b)}}
  for(const[p,d]of dmg)p.thron=Math.max(0,p.thron-d);
  if(dmg.get(me))pulse();
  await resultSheet(L,W,dmg,wins);
  G.pot=0}

/* ---------- Tavern ---------- */
function mkOffers(){
  const a=[];
  const r1=2+rnd(13),r2=2+rnd(13);
  a.push({k:'forge',r:r1,cost:10+r1*2,t:`Schmiede: ${NAME[r1]}`,d:`Alle ${NAME[r1]}-Karten dauerhaft +2/+2.`});
  const s=rnd(4);a.push({k:'oath',s,cost:46,t:`Schwur: ${REALM[s].n}`,d:`Alle Karten dieses Reichs dauerhaft +1/+1.`});
  a.push(Math.random()<.5?{k:'heal',cost:30,t:'Thron flicken',d:'+8 Thron-Leben.'}:{k:'forge',r:r2===r1?(r2%13)+2:r2,cost:0,t:'',d:''});
  a.forEach(o=>{if(o.k==='forge'&&!o.t){o.t=`Schmiede: ${NAME[o.r]}`;o.d=`Alle ${NAME[o.r]}-Karten dauerhaft +2/+2.`;o.cost=10+o.r*2}});
  return a}
function applyOffer(p,o){
  if(o.k==='forge')p.up.rank[o.r]=(p.up.rank[o.r]||0)+2;
  else if(o.k==='oath')p.up.realm[o.s]=(p.up.realm[o.s]||0)+1;
  else p.thron=Math.min(START_THRON,p.thron+8);
  p.stack-=o.cost}
async function tavern(){
  for(const p of G.players.slice(1)){if(p.out)continue;
    const o=mkOffers().filter(x=>x.cost<=p.stack-G.bb*8);
    if(o.length&&Math.random()<.55)applyOffer(p,o[rnd(o.length)])}
  const me=G.players[0];let offers=mkOffers(),rerolls=0;
  while(true){
    const c=await showSheet('tavern',{offers,rerolls});
    if(c.t==='done')return;
    if(c.t==='reroll'){me.stack-=6;rerolls++;offers=mkOffers();continue}
    if(c.t==='buy'){const o=offers[c.i];if(!o.sold&&me.stack-o.cost>=1){applyOffer(me,o);o.sold=true}}}}

/* ---------- Ende ---------- */
async function gameOver(){
  const me=G.players[0],won=!me.out;
  await showSheet('over',{won});
  return newGame()}

/* ================== UI ================== */
function pulse(c){const d=document.createElement('div');d.className='pulse';if(c)d.style.setProperty('--pc',c);document.body.appendChild(d);setTimeout(()=>d.remove(),1000)}
function banner(t,s){const d=document.createElement('div');d.className='banner';d.innerHTML=`<div>${t}${s?`<span>${s}</span>`:''}</div>`;document.body.appendChild(d);return new Promise(r=>setTimeout(()=>{d.remove();r()},G.fast?500:1600))}
function ask(mode,data){return new Promise(res=>{G.ui={mode,...data,res};render()})}
function done(v){const u=G.ui;if(!u)return;G.ui=null;u.res(v)}

function render(){
  if(!G)return;
  rHud();rOpps();rTable();rHand();rCtrl()}

function rHud(){
  const me=G.players[0];
  $('#hud').innerHTML=`<button class="ibtn" data-a="book" aria-label="Grimoire">${IC.book}</button>
   <div class="hud-c"><b>Hand ${G.hand}</b><span>Einsatz ${G.bb} · Ante ${G.ante}${G.players[G.dealer]===me?' · <span class="dealer">GEBER</span>':''}</span></div>
   <div class="me"><span class="th">${icon('thron')}${me.thron}</span><span class="gd">${IC.gold}${me.stack}</span></div>`}

function rOpps(){
  $('#opps').innerHTML=G.players.slice(1).map(p=>`<div class="opp ${p.rage?'rage':''} ${p.out?'out':''} ${p.folded?'fold':''} ${G.turn===p?'act':''}" style="--oc:${p.col}">
    <div class="saywrap">${p.say?`<span class="say">${p.say}</span>`:''}</div>
    ${G.players[G.dealer]===p?'<span class="dealer dtag">GEBER</span>':''}
    <div class="hood">${hood(p.look,p.col)}</div>
    <div class="onm">${p.short}</div>
    <div class="ost"><span class="th">${icon('thron')}${p.thron}</span><span class="gd">${IC.gold}${p.stack}</span></div>
    ${p.bet&&!p.folded?`<div class="obet">${p.bet}</div>`:''}
    ${p.sac.length?`<div class="osac" data-z="${p.sac[0].id}">${cardHTML(p.sac[0],{cls:'xs',style:''})}</div>`:''}
  </div>`).join('')}

function rTable(){
  $('#pot').style.setProperty('--fs',(1+Math.min(.9,G.pot/(START_GOLD*2.5))).toFixed(2));
  $('#pot').innerHTML=`${IC.brazier}<div>${G.pot}<small>Pot</small></div>`;
  let h='';
  for(let i=0;i<5;i++){const c=G.board[i];h+=c?cardHTML(c,{cls:'xs '+seenCls('b'+c.id)}):'<div class="slot"></div>'}
  $('#board').innerHTML=h;
  const me=G.players[0];let r='';
  if(!me.out&&me.inHand&&!me.folded&&me.hole.length){
    const cs=me.hole.concat(G.board);r=`<b>${handLabel(cs)}</b>`;
    if(G.eq&&G.ui&&G.ui.mode==='bet'){r+=` · Chance <span class="${G.eq.eq>=1/G.eq.n?'g':'r'}">${Math.round(G.eq.eq*100)}%</span>`;
      if(G.eq.toCall>0)r+=` · Du brauchst ${Math.round(G.eq.po*100)}%`}}
  else if(me.folded)r='Du hast geflohen';
  $('#read').innerHTML=r;
  $('#say').textContent=(G.ui&&(G.ui.mode==='sac'||G.ui.mode==='lineup'))?'':(G.log||'')}

function handCards(){const me=G.players[0];return me.inHand&&!me.out?me.hole:[]}
function rHand(){
  const me=G.players[0],u=G.ui,el=$('#hand');
  if(u&&u.mode==='lineup'){
    const sel=u.sel,chosen=sel.map(id=>cardById[id]);
    const tm=sel.length===5?mkTeam(chosen,me.up):null;
    el.innerHTML=`<div class="strip">${u.cards.map(c=>{const i=sel.indexOf(c.id),f=tm&&tm.team.find(x=>x.c===c);
      return cardHTML(c,{cls:(i>=0?'sel ':'')+seenCls('l'+c.id),up:upOf(me,c),st:f?[f.atk,f.hp]:null})}).join('')}</div>`;return}
  const cs=handCards();
  if(!cs.length){el.innerHTML='';return}
  const n=cs.length;
  el.innerHTML=`<div class="fan n${n}">${cs.map((c,i)=>{const k=i-(n-1)/2;
    const sel=u&&u.mode==='sac'&&u.sel===c.id;
    return cardHTML(c,{cls:(me.folded?'dim ':'')+(sel?'kill ':'')+seenCls('h'+c.id),up:upOf(me,c),style:`--rot:${(k*7).toFixed(1)}deg;--ty:${Math.abs(k)*Math.abs(k)*9}px`})}).join('')}</div>`}

function rCtrl(){
  const u=G.ui,el=$('#ctrl'),me=G.players[0];
  if(!u){el.innerHTML=`<div class="waiting">${me.out?'Dein Thron ist gefallen.':G.turn&&!G.turn.human?G.turn.short+' überlegt …':'…'}</div>`;return}
  if(u.mode==='bet'){
    if(u.raising){
      const v=u.val;
      el.innerHTML=`<div class="bigv">${v}<small>${v>=u.capT?'ALLES':(u.toCall>0?'ERHÖHEN AUF':'SETZEN')}</small></div>
       <input type="range" id="rng" min="${u.minTo}" max="${u.capT}" step="1" value="${v}" aria-label="Betrag">
       <div class="chips"><button class="btn" data-a="pre" data-v="half">½ Pot</button><button class="btn" data-a="pre" data-v="pot">Pot</button><button class="btn" data-a="pre" data-v="all">Alles</button></div>
       <div class="row"><button class="btn" data-a="unraise">Zurück</button><button class="btn go" data-a="doraise">${u.toCall>0?'Erhöhen':'Setzen'}</button></div>`;return}
    const cs=u.toCall>0?`Mitgehen<small>${Math.min(u.toCall,me.stack)} Gold</small>`:'Schieben<small>kostenlos</small>';
    el.innerHTML=`<div class="row"><button class="btn red" data-a="fold">Fliehen${u.toCall>0?'<small>verliert den Pot</small>':'<small>unnötig</small>'}</button>
      <button class="btn" data-a="call">${cs}</button>
      <button class="btn go" data-a="raise" ${u.canRaise?'':'disabled'}>${u.toCall>0?'Erhöhen':'Setzen'}<small>${u.canRaise?'ab '+u.minTo:'nicht möglich'}</small></button></div>`;return}
  if(u.mode==='sac'){
    el.innerHTML=`<div class="prompt">Opfere eine Karte<em>Sie liegt danach offen für alle auf dem Tisch.</em></div>
      <div class="row"><button class="btn go" data-a="dosac" ${u.sel?'':'disabled'}>Opfern</button></div>`;return}
  if(u.mode==='lineup'){
    const chosen=u.sel.map(id=>cardById[id]),ok=chosen.length===5;
    let sum='';
    if(ok){const t=mkTeam(chosen,me.up),b=t.b;const A=t.team.reduce((s,f)=>s+f.atk,0),H=t.team.reduce((s,f)=>s+f.hp,0);
      sum=`<div class="prompt">${comboLabel(b)}<em>alle +${K.FB[b.cat]}/+${K.FB[b.cat]} · ${A} Angriff · ${H} Leben</em></div>`}
    else sum=`<div class="prompt">Wähle 5 Karten<em>${chosen.length} von 5</em></div>`;
    el.innerHTML=sum+`<div class="row"><button class="btn" data-a="luauto">Stärkstes</button><button class="btn" data-a="lupoker">Beste Kombo</button><button class="btn go" data-a="dolu" ${ok?'':'disabled'}>Kämpfen</button></div>`;return}
  el.innerHTML=''}

/* ---------- Events ---------- */
document.addEventListener('click',async e=>{
  const z=e.target.closest('[data-z]');
  const b=e.target.closest('[data-a]');
  const cd=e.target.closest('#hand .card, #board .card');
  const u=G&&G.ui;
  if(b){const a=b.dataset.a;
    if(a==='book')return showSheet('book',{},true);
    if(!u)return;
    if(a==='fold')return done({t:'fold'});
    if(a==='call')return done({t:'call'});
    if(a==='raise'){u.raising=true;u.val=u.minTo;return render()}
    if(a==='unraise'){u.raising=false;return render()}
    if(a==='pre'){const pot=G.pot+u.toCall;const v=b.dataset.v==='all'?u.capT:Math.round((G.curBet+(b.dataset.v==='half'?pot/2:pot))/1);u.val=Math.max(u.minTo,Math.min(u.capT,v));return render()}
    if(a==='doraise')return done({t:'raise',to:u.val});
    if(a==='dosac'&&u.sel){const c=cardById[u.sel];return done(c)}
    if(a==='luauto'){u.sel=pickTeam(u.cards,G.players[0].up).five.map(c=>c.id);return render()}
    if(a==='lupoker'){u.sel=bestFive(u.cards).five.map(c=>c.id);return render()}
    if(a==='dolu'&&u.sel.length===5)return done(u.sel.map(id=>cardById[id]));
    return}
  if(cd&&u){
    const id=cd.dataset.id;
    if(cd.closest('#hand')){
      if(u.mode==='sac'){u.sel=u.sel===id?null:id;return render()}
      if(u.mode==='lineup'){const i=u.sel.indexOf(id);if(i>=0)u.sel.splice(i,1);else if(u.sel.length<5)u.sel.push(id);else{u.sel.shift();u.sel.push(id)}return render()}}}
  if(cd&&!(u&&u.mode!=='bet'&&cd.closest('#hand')))return zoom(cd.dataset.id);
  if(z)return zoom(z.dataset.z)});
document.addEventListener('input',e=>{if(e.target.id==='rng'&&G.ui){G.ui.val=+e.target.value;const bv=$('#ctrl .bigv');if(bv)bv.firstChild.textContent=G.ui.val}});
let pressT=null;
document.addEventListener('pointerdown',e=>{const c=e.target.closest('#hand .card');if(!c||!c.dataset.id)return;clearTimeout(pressT);pressT=setTimeout(()=>{pressT=null;c.dataset.long=1;zoom(c.dataset.id)},450)});
['pointerup','pointercancel','pointerleave'].forEach(t=>document.addEventListener(t,()=>clearTimeout(pressT)));

/* ---------- Overlays ---------- */
let ovRes=null;
function showOv(html,clear){const o=$('#ov');o.className=clear?'clear':'';o.innerHTML=html;o.hidden=false}
function hideOv(){const o=$('#ov');o.hidden=true;o.innerHTML=''}
function zoom(id){
  const c=cardById[id];if(!c)return;const R=REALM[c.s],me=G.players[0];
  showOv(`<div class="zoom" data-close><div style="--rc:${R.col}">${cardHTML(c,{up:upOf(me,c)})}</div>
    <div class="ab">${ABIL[c.r][0]}<span>${ABIL[c.r][1]}</span></div>
    <div class="rl" style="--rc:${R.col}"><b>${R.n} · ${R.pn}:</b> ${R.ptx}</div>
    <div class="fl">${FLAV[c.r]}</div></div>`,true);
  const t0=Date.now();
  $('#ov').onclick=()=>{if(Date.now()-t0<350)return;hideOv();$('#ov').onclick=null}}

function showSheet(kind,d,peek){
  return new Promise(res=>{
    const me=G.players[0];
    if(kind==='book'){
      const rows=CAT.map((c,i)=>i).reverse().map(i=>`<li><b class="n">${i+1}</b><div><b>${CAT[i]}</b> · ${CATX[i]}<br><i>Formation: alle +${K.FB[i]}/+${K.FB[i]}</i></div></li>`).join('');
      const cr=Object.keys(PST).reverse().map(r=>`<li><b class="n">${RL[r]}</b><div><b>${NAME[r]}</b> ${PST[r][0]}/${PST[r][1]}<br><i>${ABIL[r][0]}: ${ABIL[r][1]}</i></div></li>`).join('');
      const rl=REALM.map(r=>`<li><b class="n" style="color:${r.col};padding-top:2px">${r.ic.replace('<svg','<svg width="26" height="26"')}</b><div><b>${r.n}</b> · ${r.strat}<br><i>${r.pn}: ${r.ptx}</i></div></li>`).join('');
      const ups=Object.entries(me.up.rank).map(([r,v])=>`<li><b class="n">+${v}</b><div>${NAME[r]}-Karten</div></li>`).concat(Object.entries(me.up.realm).map(([s,v])=>`<li><b class="n">+${v}</b><div>Reich ${REALM[s].n}</div></li>`)).join('')||'<li><div><i>Noch keine Siegel gekauft.</i></div></li>';
      showOv(`<div class="sheet"><h2>Grimoire</h2><p class="k">Poker auf dem Aschenthron</p>
       <details open><summary>So läuft eine Hand</summary>
        <p><b>1. Teilen.</b> Jeder zahlt Ante und bekommt <b>3 Kreaturenkarten</b>. Setzen, mitgehen oder fliehen — in Gold.</p>
        <p><b>2. Flop, Opfer, Turn, River.</b> Nach dem Flop opfert jeder eine Handkarte, offen für alle. Dann kommen Turn und River.</p>
        <p><b>3. Showdown ist ein Kampf.</b> Du wählst 5 deiner 7 Karten. Ihre Pokerkombo ist die <b>Formation</b> und gibt allen fünf Karten einen Bonus. Die Teams schlagen sich automatisch, ohne Würfel. Wer mehr Kämpfe gewinnt, holt den Pot.</p>
        <p><b>4. Thron.</b> Wer einen Kampf verliert, verliert Thron-Leben: 1 + überlebende Karten des Siegers. Wer flieht, bleibt unversehrt, aber zahlt mit Gold.</p>
        <p><b>5. Siegel.</b> Zwischen den Händen gibst du Gold für <b>dauerhafte Verstärkungen</b> aus. Gold im Siegel fehlt dir am Pokertisch. Fällt Thron oder Gold auf 0, bist du raus.</p></details>
       <details><summary>Kombos &amp; Formation</summary><ul>${rows}</ul></details>
       <details><summary>Kreaturen</summary><ul>${cr}</ul></details>
       <details><summary>Reiche</summary><ul>${rl}</ul></details>
       <details><summary>Deine Siegel</summary><ul>${ups}</ul></details>
       <div class="row" style="margin-top:18px"><button class="btn go" data-x="close">Schließen</button></div></div>`);
      $('#ov').onclick=e=>{if(e.target.closest('[data-x=close]')){hideOv();$('#ov').onclick=null;res()}};return}
    if(kind==='tavern'){
      const{offers,rerolls}=d;
      showOv(`<div class="sheet"><h2>Die Aschenschmiede</h2><p class="k">Gold wird hier zu Macht — und fehlt dir am Tisch.</p>
        <div class="offers">${offers.map((o,i)=>{const R=o.k==='oath'?REALM[o.s]:null;
          const pic=o.k==='forge'?`<img src="cards/pk-${o.r}-${rnd(4)}.jpg" alt=""><b>+2</b>`:o.k==='oath'?`${R.ic}<b>+1</b>`:`${IC.thron.replace('<svg','<svg style="color:#ff8a7a"')}<b>+8</b>`;
          return `<button class="offer ${o.sold?'sold':''}" data-i="${i}" ${(o.sold||me.stack-o.cost<1)?'disabled':''} style="--rc:${R?R.col:'#c9a45a'}"><span class="pic">${pic}</span><span class="tx"><strong>${o.t}</strong><span>${o.d}</span></span><span class="pr">${IC.gold}${o.cost}</span></button>`}).join('')}</div>
        <p class="k">Du hast ${me.stack} Gold · Thron ${me.thron}</p>
        <div class="row"><button class="btn" data-x="reroll" ${me.stack>7?'':'disabled'}>Neu würfeln<small>6 Gold</small></button><button class="btn go" data-x="done">Nächste Hand</button></div></div>`);
      $('#ov').onclick=e=>{const o=e.target.closest('.offer'),x=e.target.closest('[data-x]');
        if(o){hideOv();$('#ov').onclick=null;res({t:'buy',i:+o.dataset.i})}
        else if(x&&x.dataset.x==='reroll'){hideOv();$('#ov').onclick=null;res({t:'reroll'})}
        else if(x&&x.dataset.x==='done'){hideOv();$('#ov').onclick=null;res({t:'done'})}};return}
    if(kind==='over'){
      const s=G.stats;
      showOv(`<div class="title"><h1>${d.won?'Der Thron ist dein':'Asche'}</h1>
        <p>${d.won?'Alle anderen Banner sind gefallen.':'Dein Banner brennt. Der Thron bleibt leer — für den Nächsten.'}</p>
        <p>${G.hand} Hände · ${s.won} Pots gewonnen${s.bestName?'<br>Stärkste Formation: '+s.bestName:''}</p>
        <button class="btn go" data-x="again">Neue Runde</button></div>`);
      $('#ov').onclick=e=>{if(e.target.closest('[data-x]')){hideOv();$('#ov').onclick=null;res()}};return}
    if(kind==='result'){
      const{L,W,dmg,wins}=d;
      showOv(`<div class="sheet"><h2>${W.includes(me)?'Du gewinnst den Pot':W[0].short+' gewinnt den Pot'}</h2><p class="k">${G.pot} Gold · ${W.map(p=>comboLabel(p.team.b)).join(' / ')}</p>
        <div class="res">${L.map(p=>`<div class="rrow ${W.includes(p)?'win':''}" ><div class="hood" style="--oc:${p.col}">${hood(p.look||'veil',p.col)}</div><b>${p.short}<br><small style="font:700 1rem var(--f2);color:var(--bone2)">${comboLabel(p.team.b)} · ${wins.get(p)} Siege</small></b>
          <div class="d ${W.includes(p)?'g':'r'}">${W.includes(p)?'+'+Math.floor(G.pot/W.length):(dmg.get(p)?'−'+dmg.get(p)+' Thron':'—')}<small>${W.includes(p)?'Gold':'Thron '+p.thron}</small></div></div>`).join('')}</div>
        <div class="row"><button class="btn go" data-x="ok">Weiter</button></div></div>`);
      $('#ov').onclick=e=>{if(e.target.closest('[data-x]')){hideOv();$('#ov').onclick=null;res()}};return}
    res()})}

async function resultSheet(L,W,dmg,wins){
  const potShown=G.pot;
  await showSheet('result',{L,W,dmg,wins});
  G.log=`${W.map(p=>p.short).join(' & ')} ${W.length>1?'teilen':'gewinnt'} ${potShown} Gold`;render()}

/* ---------- Kampf ---------- */
async function playBattle(x){
  const me=G.players[0],mineA=x.A===me,Pm=mineA?x.A:x.B,Pe=mineA?x.B:x.A;
  // Engine: Seite 0 = A, Seite 1 = B. Gezeigt: Gegner oben, du unten.
  const myIdx=mineA?0:1,enIdx=1-myIdx,snaps=x.r.snaps;
  const mk=(P,idx,cls)=>`<div class="lanes ${cls}" id="${cls==='me'?'bp':'be'}">${P.team.team.map((f,i)=>cardHTML(f.c,{cls:'xs ',st:[f.atk,f.hp],up:f.up||0,style:`--rc:${REALM[f.s].col}`})).join('')}</div>`;
  await banner(comboLabel(Pm.team.b).toUpperCase(),`Formation: alle +${K.FB[Pm.team.b.cat]}/+${K.FB[Pm.team.b.cat]}`);
  showOv(`<div id="battle">
    <div class="bhead"><div class="hood" style="--oc:${Pe.col}">${hood(Pe.look,Pe.col)}</div><div><b>${Pe.name}</b><span>${comboLabel(Pe.team.b)} · alle +${K.FB[Pe.team.b.cat]}</span></div></div>
    ${mk(Pe,enIdx,'en')}
    <div class="bmid"><div class="blbl" id="bl">Aufstellung</div><div class="bnote" id="bn"></div><div class="bres" id="br"></div></div>
    ${mk(Pm,myIdx,'me')}
    <div class="bfoot"><button class="btn" data-x="fast">Schneller</button><button class="btn" data-x="skip">Überspringen</button></div></div>`);
  const sh=sleepable();
  const ov=$('#ov');
  let speed=1100,skip=false,all=false;
  ov.onclick=e=>{const b=e.target.closest('[data-x]');if(!b)return;
    if(b.dataset.x==='fast'){speed=speed>500?420:1100;b.textContent=speed>500?'Schneller':'Normal'}
    if(b.dataset.x==='skip'){skip=true;sh.wake()}
    if(b.dataset.x==='all'){all=true;skip=true;sh.wake()}
    if(b.dataset.x==='next'){sh.wake()}};
  const rowCards=id=>[...document.querySelectorAll('#'+id+' .card')];
  const paint=(s)=>{
    const sides=[[rowCards(myIdx===0?'bp':'be'),0],[rowCards(myIdx===0?'be':'bp'),1]];
    for(const[cards,side]of sides)cards.forEach((c,i)=>{const st=s.st[side][i];if(!st)return;
      c.querySelector('.at').textContent=st.atk;c.querySelector('.hpb').textContent=Math.max(0,st.hp);c.classList.toggle('dead',!st.alive)});
    s.hits.forEach(h=>{const c=sidesCards(h.s)[h.i];if(!c)return;c.classList.remove('hit');void c.offsetWidth;c.classList.add('hit');const al=sidesCards(1-h.s)[h.i];if(al){al.classList.remove('lunge');void al.offsetWidth;al.classList.add('lunge')}if(h.d>=6){const b=$('#battle');b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake')}
      const f=document.createElement('div');f.className='fl';f.textContent='−'+h.d;c.appendChild(f);setTimeout(()=>f.remove(),950)})};
  const sidesCards=side=>rowCards((side===myIdx)?'bp':'be');
  for(let k=0;k<snaps.length;k++){
    const s=snaps[k];$('#bl').textContent=s.label;
    $('#bn').innerHTML=s.notes.slice(-2).join('<br>');paint(s);
    if(skip)continue;
    await sh.wait(speed);
    if(skip){const l=snaps[snaps.length-1];$('#bl').textContent=l.label;$('#bn').textContent='';paint({st:l.st,hits:[]})}}
  if(skip){const l=snaps[snaps.length-1];paint({st:l.st,hits:[]});$('#bn').textContent=''}
  const win=x.w===-1?'d':(x.w===myIdx?'w':'l');
  $('#br').className='bres '+win;$('#br').textContent=win==='w'?'Sieg':win==='l'?'Niederlage':'Unentschieden';
  const foot=document.querySelector('.bfoot');
  const rest=win==='l'?`Du verlierst ${x.dmg} Thron`:win==='w'?`${Pe.short} verliert ${x.dmg} Thron`:'Kein Schaden';
  $('#bn').textContent=rest;
  foot.innerHTML=`<button class="btn go" data-x="next">Weiter</button><button class="btn" data-x="all">Alle überspringen</button>`;
  await sh.wait(1e9);
  hideOv();ov.onclick=null;return all?'all':''}
function sleepable(){let r=null,t=null;return{wait(ms){return new Promise(res=>{r=res;t=setTimeout(()=>{r=null;res()},ms)})},wake(){clearTimeout(t);if(r){const f=r;r=null;f()}}}}

/* ---------- Start & Hintergrund ---------- */
function title(){
  showOv(`<div class="title">${IC.thron}<h1>Aschenthron</h1>
    <p>Poker um Gold. Showdown als Schlacht. Wer fällt, dessen Banner brennt.</p>
    <button class="btn go" data-x="go">Den Thronsaal betreten</button>
    <button class="btn sm" data-x="book">Regeln lesen</button></div>`);
  $('#ov').onclick=e=>{const b=e.target.closest('[data-x]');if(!b)return;
    if(b.dataset.x==='book'){return showSheet('book',{}).then(()=>title())}
    hideOv();$('#ov').onclick=null;newGame()}}

(function fx(){
  const cv=$('#fx'),ctx=cv.getContext('2d');let w,h,P=[];
  const fit=()=>{w=cv.width=innerWidth;h=cv.height=innerHeight};fit();addEventListener('resize',fit);
  const mk=()=>({x:Math.random()*w,y:Math.random()*h,r:.6+Math.random()*1.8,v:.15+Math.random()*.5,a:Math.random()*6.28,e:Math.random()<.35,s:Math.random()*.6+.2});
  for(let i=0;i<70;i++)P.push(mk());
  (function tick(){ctx.clearRect(0,0,w,h);
    for(const p of P){p.a+=.01;p.x+=Math.sin(p.a)*.4;p.y+=p.e?-p.v*1.2:p.v;
      if(p.y<-10||p.y>h+10){Object.assign(p,mk());p.y=p.e?h+5:-5}
      ctx.globalAlpha=p.s*(p.e?.9:.55);ctx.fillStyle=p.e?'#ff9a4a':'#8d8279';
      ctx.shadowColor=p.e?'#ff7a2a':'transparent';ctx.shadowBlur=p.e?8:0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.28);ctx.fill()}
    requestAnimationFrame(tick)})()})();

title();
