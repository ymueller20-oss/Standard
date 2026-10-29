'use strict';
/* Wertet qa/spiel.json aus: Kennzahlen je Lauf und Prüfungen für Spielablauf und Spielspaß.
   Spielzeit = gemessene Wartezeit im Spiel (KI, Animationen, Kämpfe) plus angenommene Bedenkzeit des Menschen. */
const fs=require('fs'),path=require('path');
const THINK={bet:4,sac:6,lineup:6,order:5,tavern:12,buy:3};  // Sekunden Bedenkzeit je Entscheidung (Annahme)
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0,pct=(a,f)=>a.length?100*a.filter(f).length/a.length:0;

function run(R){const G=R.games,B=G.flatMap(g=>g.battles),H=G.flatMap(g=>g.hands);
  const lead=g=>{let ch=0,prev=-1,fin=0;g.hands.forEach((h,i)=>{const m=Math.max(...h.sc),l=h.sc.indexOf(m);if(prev>=0&&l!==prev)ch++;if(l!==prev)fin=i;prev=l});return{ch,fin:(fin+1)/g.hands.length}};
  const L=G.map(lead);
  const mins=G.map(g=>(g.res.ms/1000+Object.entries(g.dec).reduce((s,[k,n])=>s+(k==='betReal'?0:n*(THINK[k]||0)),0))/60);
  const per=G.map(g=>g.hands.length);
  return{id:R.id,v:R.v,strat:R.strat,n:G.length,fehler:R.errors.length,
    sieg:pct(G,g=>g.res.won),platz:avg(G.map(g=>g.res.place)),
    ende:{raus:pct(G,g=>g.res.end==='raus'),allein:pct(G,g=>g.res.end==='allein'),zeit:pct(G,g=>g.res.end==='zeit')},
    naechte:avg(per),minuten:avg(mins),minMin:Math.min(...mins),maxMin:Math.max(...mins),
    showdownTisch:pct(H,h=>h.sd),showdownIch:pct(H,h=>h.sdMe),gegnerImShowdown:avg(H.filter(h=>h.sd).map(h=>h.nSd)),
    kaempfeIch:avg(G.map(g=>g.battles.filter(b=>b.me).length)),kaempfeJeNacht:avg(G.map(g=>g.battles.filter(b=>b.me).length/g.hands.length)),
    runden:avg(B.map(b=>b.rounds)),knapp:pct(B.filter(b=>b.w>=0),b=>b.surv<=1),wende:pct(B.filter(b=>b.w>=0),b=>b.comeback),
    fuehrungswechsel:avg(B.map(b=>b.lc)),ueberraschung:pct(B.filter(b=>b.cats[0]!==b.cats[1]),b=>b.upset),patt:pct(B,b=>b.w<0),
    zuschauSek:avg(G.flatMap(g=>g.bt))/1000,
    spitzeWechsel:avg(L.map(x=>x.ch)),entschieden:avg(L.map(x=>x.fin)),
    thronRest:avg(G.flatMap(g=>{const l=g.hands[g.hands.length-1],s0=Math.max(...g.hands[0].th)+5;return l.th.filter(t=>t>0).map(t=>t/Math.max(20,Math.round(s0/10)*10))})),
    rausDurchThron:pct(G.filter(g=>g.res.end==='raus'),g=>{const h=g.hands[g.hands.length-2]||g.hands[0];return h.th[0]<=8}),
    ausgeschieden:avg(G.map(g=>6-g.res.alive)),
    entscheidungen:avg(G.map(g=>g.dec.bet+g.dec.sac+g.dec.lineup+g.dec.order+g.dec.tavern+g.dec.buy)),
    echteEinsatzEntscheidungen:avg(G.map(g=>g.dec.betReal/g.hands.length)),
    kaeufe:avg(G.map(g=>g.dec.buy/Math.max(1,g.dec.tavern))),
    kaufArten:G.reduce((o,g)=>{for(const[k,n]of Object.entries(g.buys))o[k]=(o[k]||0)+n;return o},{}),
    sieger:G.reduce((o,g)=>{o[g.res.winner]=(o[g.res.winner]||0)+1;return o},{})}}

function main(){const S=JSON.parse(fs.readFileSync(path.join(__dirname,'spiel.json'),'utf8')),runs={};for(const k in S)runs[k]=run(S[k]);
  const k=runs.ki,checks=[],ck=(bereich,name,st,wert,ziel,detail)=>checks.push({bereich,name,status:st,wert,ziel,detail:detail||''}),r1=x=>Math.round(x*10)/10;
  const band=(x,lo,hi,wl,wh)=>x>=lo&&x<=hi?'ok':x>=wl&&x<=wh?'warn':'fail';
  const err=Object.values(runs).reduce((s,r)=>s+r.fehler,0);
  ck('Ablauf','Partien ohne Absturz',err===0?'ok':'fail',`${Object.values(runs).reduce((s,r)=>s+r.n,0)} Partien, ${err} Fehler`,'0 Fehler');
  ck('Spielspaß','Partiedauer',band(k.minuten,15,30,10,40),`${r1(k.minuten)} min (${r1(k.minMin)}–${r1(k.maxMin)})`,'15–30 min für Handy','inkl. angenommener Bedenkzeit');
  ck('Spielspaß','Du erreichst den Showdown',band(k.showdownIch,40,70,30,80),`${r1(k.showdownIch)} % der Nächte`,'40–70 %','Der Kampf ist der Kern; zu selten = zu viel Poker-Warten');
  ck('Spielspaß','Eigene Kämpfe je Partie',band(k.kaempfeIch,12,30,8,40),r1(k.kaempfeIch),'12–30');
  ck('Spielspaß','Knappe Kämpfe (Sieger mit ≤ 1 Überlebenden)',band(k.knapp,35,65,25,75),`${r1(k.knapp)} %`,'35–65 %');
  ck('Spielspaß','Wende im Kampf (Sieger lag zurück)',band(k.wende,20,45,12,55),`${r1(k.wende)} %`,'20–45 %');
  ck('Spielspaß','Überraschungen (schwächere Formation siegt)',band(k.ueberraschung,15,30,10,35),`${r1(k.ueberraschung)} %`,'15–30 %','Zu wenig = vorhersehbar, zu viel = Glücksspiel');
  ck('Spielspaß','Führungswechsel je Partie',band(k.spitzeWechsel,3,8,2,10),r1(k.spitzeWechsel),'3–8');
  ck('Spielspaß','Spiel bleibt offen (Sieger übernimmt die Führung endgültig)',band(k.entschieden*100,55,100,40,100),`nach ${r1(k.entschieden*100)} % der Partie`,'spät, ab 55 %');
  ck('Spielspaß','Gegner scheiden aus',band(k.ausgeschieden,1.5,4,.8,5),`${r1(k.ausgeschieden)} von 6 je Partie`,'1,5–4','Ausscheiden erzeugt Drama; keiner = Punktezählen am Ende');
  ck('Spielspaß','Thron-Leben werden gebraucht',band(100-k.thronRest*100,40,80,25,90),`${r1(100-k.thronRest*100)} % verbraucht`,'40–80 % bis zum Ende','Thron ist das Leben der Schlacht; bleibt er voll, zählen Kämpfe kaum');
  ck('Spielspaß','Ausscheiden durch Kampf statt Pleite',band(k.rausDurchThron,30,100,10,100),`${r1(k.rausDurchThron)} % der Aus`,'mind. 30 %','Wer fällt, soll in der Schlacht fallen, nicht beim Setzen');
  ck('Können','Taverne ist keine Falle',runs.profi.ende.raus<=k.ende.raus+10?'ok':'warn',`Vielkäufer raus: ${r1(runs.profi.ende.raus)} %, Maßvolle: ${r1(k.ende.raus)} %`,'Kaufen darf nicht ins Aus führen');
  ck('Spielspaß','Partie endet durch Zeitlimit',band(k.ende.zeit,0,40,0,60),`${r1(k.ende.zeit)} %`,'unter 40 %','Ende nach Nacht 12 per Punktestand ist der schwächste Abschluss');
  ck('Können','Guter Bot schlägt Zufall',k.sieg-runs.zufall.sieg>=8?'ok':k.sieg-runs.zufall.sieg>=4?'warn':'fail',`${r1(k.sieg)} % gegen ${r1(runs.zufall.sieg)} %`,'mind. 8 Punkte Abstand');
  ck('Können','Profi schlägt KI-Niveau',runs.profi.platz<k.platz?'ok':'warn',`Platz ${r1(runs.profi.platz)} gegen ${r1(k.platz)}`,'besserer Durchschnittsplatz');
  ck('Können','Stur mitgehen wird bestraft',runs.passiv.platz>k.platz+.3?'ok':'warn',`Platz ${r1(runs.passiv.platz)} gegen ${r1(k.platz)}`,'deutlich schlechter');
  ck('Können','Sieganteil auf KI-Niveau',band(k.sieg,12,25,8,30),`${r1(k.sieg)} %`,'12–25 % (6 Spieler: fair 17 %)');
  return{runs,checks}}
if(require.main===module){const r=main();fs.writeFileSync(path.join(__dirname,'auswertung.json'),JSON.stringify(r,null,1));
  for(const c of r.checks)console.log(String(c.status).padEnd(4),c.name,'|',c.wert);
  for(const x of Object.values(r.runs))console.log(x.id,JSON.stringify({sieg:x.sieg|0,platz:x.platz.toFixed(2),ende:x.ende,min:x.minuten.toFixed(1),sdIch:x.showdownIch|0,kampf:x.kaempfeIch.toFixed(1),knapp:x.knapp|0,wende:x.wende|0,upset:x.ueberraschung|0,lc:x.spitzeWechsel.toFixed(1),ent:x.entschieden.toFixed(2),aus:x.ausgeschieden.toFixed(1),zus:x.zuschauSek.toFixed(1),kauf:x.kaeufe.toFixed(2),echte:x.echteEinsatzEntscheidungen.toFixed(1),arten:x.kaufArten,sieger:x.sieger}))}
module.exports=main;
