/* Balance-Messung: node sim/balance.js [Anzahl]
   Zieht zufällige Hände (2 Handkarten + 5 Tisch), stellt für beide Seiten das stärkste Team und lässt sie kämpfen.
   Zielwerte: bessere Kombo gewinnt etwa 3 von 4 Kämpfen, ab dem Rudel fast immer, Kämpfe 3–4 Runden, kaum Remis, jedes Reich mit 3+ Karten 55–63 %. */
const E=require('../engine.js');
const N=+process.argv[2]||3000;let s=12345;const rnd=()=>(s=(s*1103515245+12345)%2147483648)/2147483648;
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const up={rank:{},realm:{}},realm=[[0,0],[0,0],[0,0],[0,0]],card={};let hw=0,hn=0,rounds=0,r1=0,draw=0,flip=0;
for(let t=0;t<N;t++){const d=shuffle(E.FULL.slice()),bd=d.slice(0,5);
  const A=E.pickTeam(d.slice(5,7).concat(bd),up),B=E.pickTeam(d.slice(7,9).concat(bd),up),r=E.battle(A.team,B.team,false);
  rounds+=r.rounds;if(r.rounds<=1)r1++;if(r.w<0)draw++;
  if(A.b.cat!==B.b.cat&&r.w>=0){hn++;if((A.b.cat>B.b.cat)===(r.w===0))hw++}
  /* Reihenfolge: dreht ein Tausch zweier Karten eine Niederlage? */
  if(r.w!==0){const f=A.team.map(x=>x.c);let ok=false;for(let i=0;i<5&&!ok;i++)for(let j=i+1;j<5&&!ok;j++){const o=f.slice();[o[i],o[j]]=[o[j],o[i]];ok=E.battle(E.mkTeam(o,up,true).team,B.team,false).w===0}if(ok)flip++}
  if(A.b.cat!==B.b.cat||r.w<0)continue;
  for(const[T,won]of[[A,r.w===0],[B,r.w===1]]){const n=[0,0,0,0];T.team.forEach(f=>n[f.s]++);n.forEach((c,i)=>{if(c>=3){realm[i][0]++;if(won)realm[i][1]++}});
    T.team.forEach(f=>{const k=f.sup||'Rang '+f.r;(card[k]=card[k]||[0,0])[0]++;if(won)card[k][1]++})}}
const pc=(a,b)=>(100*a/b).toFixed(0)+' %';
console.log('Bessere Kombo gewinnt:',pc(hw,hn));
console.log('Runden im Schnitt:',(rounds/N).toFixed(2),'· nach Runde 1 entschieden:',pc(r1,N),'· Remis:',pc(draw,N));
console.log('Niederlagen, die ein Tausch in der Schlachtreihe dreht:',pc(flip,N));
console.log('Reiche (3+ Karten, gleiche Kombo):',['Sonnenwacht','Aschelande','Nordmark','Blutmoor'].map((n,i)=>n+' '+pc(realm[i][1],realm[i][0])).join(' · '));
console.log('Karten (gleiche Kombo):',Object.entries(card).filter(([,v])=>v[0]>=40).sort((a,b)=>b[1][1]/b[1][0]-a[1][1]/a[1][0]).map(([k,v])=>k+' '+pc(v[1],v[0])).join(' · '));
