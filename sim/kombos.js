/* Siegquote je Kombo gegen zufällige Gegner: node sim/kombos.js ['[FB-Werte als JSON]'] */
const E=require('../engine.js');const FB=JSON.parse(process.argv[2]||'null');if(FB)E.K.FB.splice(0,10,...FB);
let s=77;const rnd=()=>(s=(s*1103515245+12345)%2147483648)/2147483648;const sh=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const up={rank:{},realm:{}},w=Array(10).fill(0),n=Array(10).fill(0);let hw=0,hn=0;
/* Teams jeder Kombo gezielt erzeugen: so lange ziehen, bis Kategorie passt (für seltene Kombos mit gebauten Händen) */
function teamOfCat(c){for(let k=0;k<20000;k++){const d=sh(E.FULL.slice());const t=E.pickTeam(d.slice(0,7),up);if(t.b.cat===c)return t}return null}
const build={7:()=>{const r=2+Math.floor(rnd()*13);const four=[0,1,2,3].map(x=>({r,s:x,id:r+'-'+x}));const d=sh(E.FULL.filter(c=>c.r!==r));return E.mkTeam(four.concat(d[0]),up)},
 8:()=>{const s0=Math.floor(rnd()*4),top=6+Math.floor(rnd()*8);return E.mkTeam([0,1,2,3,4].map(k=>({r:top-k,s:s0,id:(top-k)+'-'+s0})),up)}};
for(let c=1;c<=8;c++){for(let t=0;t<600;t++){const A=build[c]?build[c]():teamOfCat(c);const d=sh(E.FULL.slice());const B=E.pickTeam(d.slice(0,7),up);const r=E.battle(A.team,B.team,false);if(r.w>=0){n[c]++;if(r.w===0)w[c]++}}}
const CAT=['Einzel','Paar','2Paare','Rudel','Kette','Banner','Horde','Plage(4er)','Kriegszug'];
console.log(CAT.map((x,c)=>c?x+' '+(100*w[c]/n[c]).toFixed(0)+'%':'').filter(Boolean).join(' | '));
for(let t=0;t<2500;t++){const d=sh(E.FULL.slice()),bd=d.slice(0,5);const A=E.pickTeam(d.slice(5,7).concat(bd),up),B=E.pickTeam(d.slice(7,9).concat(bd),up);if(A.b.cat!==B.b.cat){const r=E.battle(A.team,B.team,false);if(r.w>=0){hn++;if((A.b.cat>B.b.cat)===(r.w===0))hw++}}}
console.log('bessere Kombo gewinnt (am Tisch):',(100*hw/hn).toFixed(0)+'%');
