/* Taverne messen: node sim/taverne.js [Anzahl]. Zeigt, wie viele Prozentpunkte Siegchance je Kampf jeder Kauf bringt (gegen einen Gegner ohne Käufe). Die Werte stehen in game.js unter MERC_GAIN und GAIN. */
const E=require('../engine.js');const N=+process.argv[2]||2500;
function run(mk){let s=4242;const rnd=()=>(s=(s*1103515245+12345)%2147483648)/2147483648;const sh=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 let w=0,n=0;for(let t=0;t<N;t++){const d=sh(E.FULL.slice()),bd=d.slice(0,5);const o=mk(rnd);
  const A=E.pickTeam(d.slice(5,5+(o.holes||2)).concat(bd,o.merc||[]),o.up||{rank:{},realm:{}}),B=E.pickTeam(d.slice(10,12).concat(bd),{rank:{},realm:{}});
  if(o.drum){const add=Math.max(1,E.K.FB[Math.min(9,A.b.cat+1)]-E.K.FB[A.b.cat]);A.team.forEach(f=>{f.atk+=add;f.hp+=add;f.max+=add})}
  const r=E.battle(A.team,B.team,false);if(r.w>=0){n++;if(r.w===0)w++}}return 100*w/n}
const base=run(()=>({}));const g=f=>(run(f)-base).toFixed(1);
console.log('Basis',base.toFixed(1));
let line='Söldner: ';for(let r=2;r<=14;r++)line+=r+':'+g(rnd=>({merc:[{r,s:Math.floor(rnd()*4),id:'M'}]}))+' ';console.log(line);
for(const v of[2,4,6,8]){let l='Schmiede +'+v+': ';for(const r of[2,5,8,11,14])l+=r+':'+g(()=>({up:{rank:{[r]:v},realm:{}}}))+' ';console.log(l)}
for(const v of[1,2,3,4])console.log('Schwur +'+v,g(rnd=>({up:{rank:{},realm:{[Math.floor(rnd()*4)]:v}}})));
console.log('Vierte Karte',g(()=>({holes:3})),'Trommel',g(()=>({drum:1})));
