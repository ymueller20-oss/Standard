/* RABENBLATT-ENGINE (geteilt von Seite und Simulation) */
const PST={2:[1,2],3:[2,2],4:[3,3],5:[3,4],6:[3,5],7:[5,4],8:[4,7],9:[6,5],10:[5,9],11:[7,6],12:[7,8],13:[8,8],14:[10,11]};
const FULL=[];for(let s=0;s<4;s++)for(let r=2;r<=14;r++)FULL.push({r,s,id:r+'-'+s});
const COMB={};function combos(n,k=5){const key=n+'/'+k;if(COMB[key])return COMB[key];const out=[];const rec=(st,a)=>{if(a.length===k){out.push(a.slice());return}for(let i=st;i<n;i++){a.push(i);rec(i+1,a);a.pop()}};rec(0,[]);return COMB[key]=out}
function eval5(cs){const r=cs.map(c=>c.r).sort((a,b)=>b-a),s0=cs[0].s;const fl=cs[1].s===s0&&cs[2].s===s0&&cs[3].s===s0&&cs[4].s===s0;
  let st=0;if(r[0]!==r[1]&&r[1]!==r[2]&&r[2]!==r[3]&&r[3]!==r[4]){if(r[0]-r[4]===4)st=r[0];else if(r[0]===14&&r[1]===5)st=5}
  const cnt={};for(const x of r)cnt[x]=(cnt[x]||0)+1;const g=Object.keys(cnt).map(k=>[cnt[k],+k]).sort((a,b)=>b[0]-a[0]||b[1]-a[1]);let cat,tb;
  if(st&&fl){cat=st===14?9:8;tb=[st]}else if(g[0][0]===4){cat=7;tb=[g[0][1],g[1][1]]}else if(g[0][0]===3&&g[1][0]===2){cat=6;tb=[g[0][1],g[1][1]]}
  else if(fl){cat=5;tb=r}else if(st){cat=4;tb=[st]}else if(g[0][0]===3){cat=3;tb=g.map(x=>x[1])}else if(g[0][0]===2&&g[1][0]===2){cat=2;tb=g.map(x=>x[1])}
  else if(g[0][0]===2){cat=1;tb=g.map(x=>x[1])}else{cat=0;tb=r}
  let sc=cat;for(let i=0;i<5;i++)sc=sc*15+(tb[i]||0);return{score:sc,cat,tb}}

/* Balance-Parameter */
const K={
  FB:[0,5,9,14,18,25,34,42,50,55],                  // Formationsbonus je Kombo, gilt für alle 5 Teamkarten
  son:16,                                            // Sonnenwacht · Schwur: +16/+16 je weitere Teamkarte gleicher Stärke
  ashA:8, ashH:8,                                   // Aschelande · Feuerkette: +8/+8 je weiteres Glied der Stärkenkette
  norA:5, norH:5,                                   // Nordmark · Eiswall: +5/+5 je weitere Nordmark-Karte im Team
  blut:3, blutFrom:1, blutLast:1, off:-1            // Blutmoor · Blutrausch: jede Runde +3 Angriff, Todesstoß mit vollem Angriff
};
function chainLen(rs,r){const has=x=>rs.has(x)||(x===1&&rs.has(14));let lo=r,hi=r;while(has(lo-1))lo--;while(has(hi+1))hi++;
  let L=hi-lo+1;if(r===14){let h2=1;while(has(1+h2))h2++;L=Math.max(L,h2)}return L}
function mkTeam(five,up){up=up||{rank:{},realm:{}};const b=eval5(five),cnt={};five.forEach(c=>cnt[c.r]=(cnt[c.r]||0)+1);const rs=new Set(five.map(c=>c.r));
  const F=five.slice().sort((x,y)=>y.r-x.r||x.s-y.s).map(c=>{const st=PST[c.r],u=(up.rank[c.r]||0)+(up.realm[c.s]||0);return{c,r:c.r,s:c.s,up:u,atk:st[0]+u,hp:st[1]+u,form:0,realm:[0,0],rage:0}});
  const nNor=F.filter(f=>f.s===2).length;
  F.forEach(f=>{const bo=K.FB[b.cat];
    f.form=bo;f.atk+=bo;f.hp+=bo;
    let ra=0,rh=0;if(K.off===f.s){f.realm=[0,0];return}
    if(f.s===0){const n=cnt[f.r]-1;ra=K.son*n;rh=K.son*n}
    else if(f.s===1){const L=chainLen(rs,f.r);if(L>=2){ra=K.ashA*(L-1);rh=K.ashH*(L-1)}}
    else if(f.s===2){const m=nNor-1;ra=K.norA*m;rh=K.norH*m}
    else if(f.s===3){f.rage=K.blut}
    f.realm=[ra,rh];f.atk+=ra;f.hp+=rh});
  F.forEach(f=>{if(f.r===2){const k=F.filter(o=>o!==f&&o.r<=5).length;f.atk+=k;f.hp+=k;f.sw=k}if(f.r===5){const k=F.filter(o=>o!==f&&o.s===f.s).length;f.atk+=k;f.wolf=k}});
  F.forEach(f=>f.max=f.hp);b.five=five;return{team:F,b,five}}
function battle(A0,B0,rec){
  const T=[A0.map(f=>({...f,alive:true,psn:0,first:true})),B0.map(f=>({...f,alive:true,psn:0,first:true}))];const snaps=rec?[]:null;let hits=[],notes=[];
  const note=t=>{if(rec&&!notes.includes(t))notes.push(t)};
  const snap=label=>{if(rec)snaps.push({label,notes,st:T.map(t=>t.map(f=>({atk:f.atk,hp:Math.max(0,f.hp),alive:f.alive}))),hits});hits=[];notes=[]};
  const hurt=(s,i,n,src,kind)=>{const f=T[s][i];if(!f||!f.alive||n<=0)return;let d=n;
    if(f.r===6){d--;note('Ghul ist zäh: 1 Schaden weniger')}
    if(T[s].some((o,j)=>o.alive&&o.r===10&&Math.abs(j-i)===1)){d--;note('Riese schützt seine Nachbarn')}
    d=Math.max(0,d);if(!d)return;f.hp-=d;hits.push({s,i,d});if(kind==='psn')note('Gift wirkt: 1 Schaden');
    if(src&&src.f.r===9&&!f.psn){f.psn=1;note('Lindwurm vergiftet sein Ziel')}};
  const deaths=()=>{const died=[0,0],last=[];for(const s of[0,1])T[s].forEach((f,i)=>{if(f.alive&&f.hp<=0){f.alive=false;died[s]++;if(K.blutLast&&f.rage)last.push({s,i,f})}});
    last.forEach(a=>{const j=target(a.s,a.i,a.f);if(j>=0){note('Blutmoor: Todesstoß im Fallen');hurt(1-a.s,j,Math.ceil(a.f.atk*K.blutLast),{s:a.s,i:a.i,f:a.f},'atk')}});
    if(last.length)for(const s of[0,1])T[s].forEach(f=>{if(f.alive&&f.hp<=0){f.alive=false;died[s]++}});const dn=died[0]+died[1];
    if(dn)note(dn===1?'Eine Karte fällt':dn+' Karten fallen');for(const s of[0,1])if(died[s])T[1-s].forEach(f=>{if(f.alive&&f.r===3){f.atk+=died[s];note('Krähe frisst Aas: mehr Angriff')}})};
  const live=s=>T[s].some(f=>f.alive);
  const target=(s,i,f)=>{const E=T[1-s],al=[];E.forEach((o,j)=>{if(o.alive)al.push(j)});if(!al.length)return-1;
    if(f.r===7){note('Greif stürzt sich auf den schwächsten Gegner');return al.reduce((a,j)=>E[j].hp<E[a].hp?j:a,al[0])}
    if(E[i]&&E[i].alive)return i;return al.reduce((a,j)=>Math.abs(j-i)<Math.abs(a-i)?j:a,al[0])};
  const strike=sel=>{const acts=[];for(const s of[0,1])T[s].forEach((f,i)=>{if(f.alive&&sel(f)){const j=target(s,i,f);if(j>=0)acts.push({s,i,f,j,atk:f.atk*(f.r===4&&f.first?2:1)})}});
    acts.forEach(a=>{if(a.f.r===4&&a.f.first)note('Keiler: Ansturm, doppelter Schaden');if(a.f.r===13)note('Wyvern schlägt zuerst zu');if(a.f.r===11)note('Mantikor-Stachel trifft die Nachbarn');
      a.f.first=false;hurt(1-a.s,a.j,a.atk,{s:a.s,i:a.i,f:a.f},'atk');if(a.f.r===11)[a.j-1,a.j+1].forEach(k=>hurt(1-a.s,k,2,null,'splash'))});return acts.length};
  for(const s of[0,1])T[s].forEach((f,i)=>{if(f.r===12&&T[1-s][i]){T[1-s][i].atk=Math.max(0,T[1-s][i].atk-2);note('Nachtmahr: Gegner gegenüber −2 Angriff')}});
  note('Stärkste Karte links. Jede kämpft gegen die gegenüber.');snap('Aufstellung');
  for(const s of[0,1])T[s].forEach(f=>{if(f.r===14){note('Drache speit Feuer: 2 an alle Gegner');T[1-s].forEach((o,j)=>hurt(1-s,j,2,null,'fire'))}});
  if(hits.length){deaths();snap('Feueratem')}
  let round=0;
  while(live(0)&&live(1)&&round<8){round++;
    if(round>=K.blutFrom){let any=false;for(const s of[0,1])T[s].forEach(f=>{if(f.alive&&f.rage){f.atk+=f.rage;any=true}});if(any){note('Blutrausch: Blutmoor-Karten +'+K.blut+' Angriff');snap(`Runde ${round} · Blutrausch`)}}
    if(strike(f=>f.r===13)){deaths();snap(`Runde ${round} · Erstschlag`)}
    if(!live(0)||!live(1))break;
    strike(f=>f.r!==13);deaths();snap(`Runde ${round}`);
    for(const s of[0,1])T[s].forEach((f,i)=>{if(!f.alive)return;if(f.r===8&&f.hp<f.max){f.hp=Math.min(f.max,f.hp+2);note('Troll regeneriert 2 Leben')}if(f.psn)hurt(s,i,1,null,'psn')});
    if(hits.length||notes.length){deaths();snap(`Runde ${round} · Rundenende`)}else{hits=[];notes=[]}}
  const a0=T[0].filter(f=>f.alive),a1=T[1].filter(f=>f.alive);let w=-1;
  if(a0.length&&!a1.length)w=0;else if(a1.length&&!a0.length)w=1;else if(a0.length&&a1.length){const h0=a0.reduce((x,f)=>x+f.hp,0),h1=a1.reduce((x,f)=>x+f.hp,0);w=h0>h1?0:h1>h0?1:-1}
  return{w,snaps,rounds:round}}
/* Teamstärke-Schätzung für Vorschlag/KI: Angriff x Leben, Blutrausch mit erwarteten Runden */
function power(t){let A=0,H=0;for(const f of t.team){A+=f.atk+f.rage*1.2+(f.r===14?2:0)+(f.r===13?1.5:0)+(f.r===11?1.5:0);H+=f.hp+(f.r===6?2:0)+(f.r===8?3:0)+(f.r===10?2:0)}return A*H+t.b.score/Math.pow(15,5)*0.01}
function pickTeam(cards,up){if(cards.length<5)return null;let best=null,bp=-1;for(const ix of combos(cards.length)){const t=mkTeam(ix.map(i=>cards[i]),up);const p=power(t);if(p>bp){bp=p;best=t}}best.pw=bp;return best}
function bestScore(cards){let m=-1;for(const ix of combos(cards.length)){const e=eval5(ix.map(i=>cards[i]));if(e.score>m)m=e.score}return m}
function bestFive(cards){let b=null;for(const ix of combos(cards.length)){const f=ix.map(i=>cards[i]),e=eval5(f);if(!b||e.score>b.score){b=e;b.five=f}}return b}
if(typeof module!=='undefined')module.exports={bestScore,bestFive,K,FULL,eval5,mkTeam,battle,pickTeam,power,combos,PST,chainLen};
