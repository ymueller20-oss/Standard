'use strict';
/* QA Kampf: wie unterhaltsam ist eine Schlacht zum Zuschauen? Misst an echten Showdown-Paaren (geteilte Tafel, je 2 Handkarten):
   Länge, Wenden, Führungswechsel, knappe Ausgänge, Duelle Karte gegen Karte, glatte Siege, ausgelöste Fähigkeiten, Fairness.
   Varianten patchen engine.js im Speicher, um Regeländerungen zu vergleichen.
   Aufruf: node qa/kampf.js [kämpfe]   ·   require('./kampf')(engineModul, n) liefert die Kennzahlen */
const fs=require('fs'),path=require('path');

function load(rep){let s=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
  for(const[a,b]of rep||[]){if(!s.includes(a))throw new Error('Patch nicht gefunden: '+a.slice(0,60));s=s.replace(a,b)}
  const m={exports:{}};new Function('module','exports','require',s)(m,m.exports,require);return m.exports}

function measure(E,N=6000){
  let seed=777;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const up={rank:{},realm:{}},F=E.FULL;
  const m={n:0,runden:0,schlaege:0,wende:0,wechsel:0,knapp:0,duell:0,glatt:0,frueh:0,faeh:0,besser:0,bn:0,patt:0,ueberlebt:0,letzter:0};
  for(let k=0;k<N;k++){const d=shuffle(F.slice()),bd=d.slice(0,5);
    const A=E.pickTeam(d.slice(5,7).concat(bd),up),B=E.pickTeam(d.slice(7,9).concat(bd),up),r=E.battle(A.team,B.team,true);m.n++;
    if(r.w<0){m.patt++;continue}
    if(A.b.cat!==B.b.cat){m.bn++;if((r.w===0)===(A.b.cat>B.b.cat))m.besser++}
    let lead=0,lc=0,behind=false,duel=false,firstLead=0,hits=0;const notes=new Set();
    for(const s of r.snaps){const a=s.st[0].filter(x=>x.alive).length,b=s.st[1].filter(x=>x.alive).length;
      const ha=s.st[0].reduce((t,x)=>t+(x.alive?x.hp:0),0),hb=s.st[1].reduce((t,x)=>t+(x.alive?x.hp:0),0);
      /* Führung: wer anteilig mehr Leben übrig hat (Anteil am eigenen Start), das sieht man am Tauziehen-Balken */
      const l=Math.sign(ha/(r.snaps[0].st[0].reduce((t,x)=>t+x.hp,0)||1)-hb/(r.snaps[0].st[1].reduce((t,x)=>t+x.hp,0)||1));
      if(l&&lead&&l!==lead)lc++;if(l)lead=l;if(l&&!firstLead&&s!==r.snaps[0])firstLead=l;
      if((r.w===0&&l<0)||(r.w===1&&l>0))behind=true;if(a===1&&b===1)duel=true;hits+=s.hits.length;
      for(const t of s.notes)if(!/^Stärkste|Karten? f|Eine Karte/.test(t))notes.add(t.split(':')[0])}
    const last=r.snaps[r.snaps.length-1],surv=last.st[r.w].filter(x=>x.alive).length;
    m.runden+=r.rounds;m.schlaege+=hits;m.wende+=behind;m.wechsel+=lc;m.knapp+=surv<=1;m.duell+=duel;m.glatt+=surv===5;
    m.frueh+=lc===0&&!behind;m.faeh+=notes.size;m.ueberlebt+=surv;m.letzter+=r.rounds>=8}
  const w=m.n-m.patt,p=x=>100*x/w;
  return{kaempfe:m.n,runden:m.runden/w,schlaege:m.schlaege/w,wende:p(m.wende),wechsel:m.wechsel/w,knapp:p(m.knapp),duell:p(m.duell),glatt:p(m.glatt),
    vorhersehbar:p(m.frueh),faehigkeiten:m.faeh/w,ueberlebende:m.ueberlebt/w,besser:100*m.besser/m.bn,patt:100*m.patt/m.n,zeitlimit:p(m.letzter)}}

module.exports=(E,N)=>measure(E||require('../engine.js'),N);module.exports.load=load;
if(require.main===module){const N=+process.argv[2]||6000,r=measure(load(),N);
  for(const[k,v]of Object.entries(r))console.log(k.padEnd(14),typeof v==='number'?Math.round(v*10)/10:v)}
