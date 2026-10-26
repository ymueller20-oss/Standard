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
  FB:[0,3,6,9,12,16,20,24,28,33],      // Formationsbonus je Kombo für alle 5 Teamkarten
  son:2, sonR:1, sonSh1:4, sonSh2:5,                      // Sonnenwacht · Schwur: Karten mit gleicher Stärke im Team tragen Gottesschild, +3/+3 je Zwilling; +1/+1 je weitere Sonnenwacht-Karte
  ashA:3, ashH:2, ashN:2, ashNH:2, glutN:0,                     // Aschelande · Feuerkette: +2/+1 je weiteres Kettenglied; Glut zu Kampfbeginn = Kettenlänge
  norH:2, norA:3, norFrost:3,                 // Nordmark · Eiswall: +0/+3 je weitere Nordmark-Karte; ab 3 Nordmark frieren ihre Treffer ein
  blut:3, blutPer:1, blutF:0, rw:0.01,                  // Blutmoor · Blutrausch: jede Runde +2 Angriff, +1 je weitere Blutmoor-Karte; Todesstoß im Fallen
  knappe:1, herold:3, banner:5,       // Sonnenwacht-Unterstützer
  funke:8, zunder:2, brand:8, schmied:3,  // Aschelande-Unterstützer
  rune:2, wall:2,                     // Nordmark-Unterstützer
  pest:3, aas:3, moor:3               // Blutmoor-Unterstützer
};
/* Reichseigene Unterstützer (Stärke 2–5): [Reich][Stärke] = Schlüssel */
const SUP=[{2:'knappe',3:'herold',4:'banner',5:'waechter'},{2:'funke',3:'zunder',4:'brand',5:'schmied'},{2:'frostbiss',3:'rune',4:'wall',5:'winterwolf'},{2:'pest',3:'aas',4:'priester',5:'moorwolf'}];
const supOf=c=>c.r<=5?SUP[c.s][c.r]||null:null;
function chainLen(rs,r){const has=x=>rs.has(x)||(x===1&&rs.has(14));let lo=r,hi=r;while(has(lo-1))lo--;while(has(hi+1))hi++;
  let L=hi-lo+1;if(r===14){let h2=1;while(has(1+h2))h2++;L=Math.max(L,h2)}return L}
function mkTeam(five,up){up=up||{rank:{},realm:{}};const b=eval5(five),cnt={};five.forEach(c=>cnt[c.r]=(cnt[c.r]||0)+1);const rs=new Set(five.map(c=>c.r));
  const F=five.slice().sort((x,y)=>y.r-x.r||x.s-y.s).map(c=>{const st=PST[c.r],u=(up.rank[c.r]||0)+(up.realm[c.s]||0);
    return{c,r:c.r,s:c.s,up:u,atk:st[0]+u,hp:st[1]+u,form:0,realm:[0,0],rage:0,sup:supOf(c),shield:false,glut:0,frost:false,taunt:false}});
  const n=[0,0,0,0];F.forEach(f=>n[f.s]++);const has=k=>F.filter(f=>f.sup===k);
  F.forEach(f=>{const bo=K.FB[b.cat];f.form=bo;f.atk+=bo;f.hp+=bo;let ra=0,rh=0;
    if(f.s===0){const tw=cnt[f.r]-1;ra=rh=K.son*tw+K.sonR*(n[0]-1);if(tw>0||n[0]>=K.sonSh2)f.shield=true}
    else if(f.s===1){const L=chainLen(rs,f.r);if(L>=2){ra=K.ashA*(L-1);rh=K.ashH*(L-1)}ra+=K.ashN*(n[1]-1);rh+=K.ashNH*(n[1]-1);f.glut=L+K.glutN*(n[1]-1);f.chain=L}
    else if(f.s===2){rh=K.norH*(n[2]-1);ra=K.norA*(n[2]-1);if(n[2]>=K.norFrost)f.frost=true}
    else if(f.s===3){f.rage=K.blut+K.blutPer*(n[3]-1);ra=rh=K.blutF*(n[3]-1)}
    f.realm=[ra,rh];f.atk+=ra;f.hp+=rh});
  if(n[0]>=K.sonSh1){const t=F.filter(f=>f.s===0&&!f.shield).sort((x,y)=>y.atk*y.hp-x.atk*x.hp)[0];if(t)t.shield=true}
  /* Unterstützer */
  has('knappe').forEach(k=>{const t=F.filter(o=>o!==k&&!o.shield).sort((x,y)=>y.atk*y.hp-x.atk*x.hp)[0];if(t){t.shield=true;t.blessed=true}});
  has('waechter').forEach(k=>{const t=F.filter(o=>o!==k).sort((x,y)=>y.atk*y.hp-x.atk*x.hp)[0];if(t){t.guard=k;k.taunt=true}});
  if(has('banner').length)F.forEach(f=>{if(f.shield){const v=K.banner*has('banner').length;f.atk+=v;f.hp+=v}});
  has('schmied').forEach(k=>F.forEach(f=>{if(f!==k&&chainLen(rs,f.r)>=2)f.atk+=K.schmied}));
  has('rune').forEach(()=>F.forEach(f=>{f.hp+=K.rune}));
  has('winterwolf').forEach(k=>F.forEach(f=>{f.frost=true}));
  has('moorwolf').forEach(k=>{const i=F.indexOf(k);[F[i-1],F[i+1]].forEach(f=>{if(f)f.rage+=K.moor})});
  F.forEach(f=>f.max=f.hp);b.five=five;return{team:F,b,five}}
function battle(A0,B0,rec){
  const T=[A0.map(f=>({...f,alive:true,psn:0,first:true,frz:0})),B0.map(f=>({...f,alive:true,psn:0,first:true,frz:0}))];const snaps=rec?[]:null;let hits=[],notes=[];
  const note=t=>{if(rec&&!notes.includes(t))notes.push(t)};
  const snap=label=>{if(rec)snaps.push({label,notes,st:T.map(t=>t.map(f=>({atk:f.atk,hp:Math.max(0,f.hp),alive:f.alive,sh:f.shield,fz:f.frz>0}))),hits});hits=[];notes=[]};
  const hasSup=(s,k)=>T[s].filter(f=>f.alive&&f.sup===k).length;
  const hurt=(s,i,n,src,kind)=>{const f=T[s][i];if(!f||!f.alive||n<=0)return;let d=n;
    if(f.shield){f.shield=false;hits.push({s,i,d:0,sh:1});note('Gottesschild bricht');
      const h=hasSup(s,'herold');if(h){T[s].forEach(o=>{if(o.alive)o.atk+=K.herold*h});note('Herold: Verbündete +'+K.herold*h+' Angriff')}return}
    if(f.r===6){d--;note('Ghul ist zäh: 1 Schaden weniger')}
    if(T[s].some((o,j)=>o.alive&&o.r===10&&Math.abs(j-i)===1)){d--;note('Riese schützt seine Nachbarn')}
    if(kind!=='psn'&&T[s].some(o=>o.alive&&o.sup==='wall')){d-=K.wall;note('Schildwall: alle nehmen weniger Schaden')}
    d=Math.max(0,d);if(!d)return;f.hp-=d;hits.push({s,i,d});if(kind==='psn')note('Gift wirkt');
    if(src&&src.f.r===9&&!f.psn){f.psn=1;note('Lindwurm vergiftet sein Ziel')}
    if(src&&src.f.frost&&kind==='atk'&&f.hp>0){f.frz=1;note('Frost: das Ziel erstarrt')}};
  let reborn=[false,false];
  const deaths=()=>{let guard=0;while(guard++<6){const died=[],last=[];
    for(const s of[0,1])T[s].forEach((f,i)=>{if(f.alive&&f.hp<=0){f.alive=false;died.push({s,i,f});if(f.rage)last.push({s,i,f})}});
    if(!died.length)break;
    last.forEach(a=>{const j=target(a.s,a.i,a.f);if(j>=0){note('Blutmoor: Todesstoß im Fallen');hurt(1-a.s,j,a.f.atk,{s:a.s,i:a.i,f:a.f},'last')}});
    note(died.length===1?'Eine Karte fällt':died.length+' Karten fallen');
    died.forEach(({s,i,f})=>{
      const br=hasSup(1-s,'brand');if(br){[i-1,i+1].forEach(k=>hurt(s,k,K.brand*br,null,'fire'));note('Flächenbrand greift über')}
      T[1-s].forEach(o=>{if(o.alive&&o.r===3&&!o.sup)o.atk+=1});
      for(const t of[0,1])T[t].forEach(o=>{if(o.alive&&o.sup==='aas'){o.atk+=K.aas;o.hp+=K.aas;o.max+=K.aas;note('Aaskrähe frisst: +'+K.aas+'/+'+K.aas)}});
      if(!reborn[s]&&f.sup!=='priester'&&T[s].some(o=>o.alive&&o.sup==='priester')){reborn[s]=true;f.alive=true;f.hp=Math.ceil(f.max/2);f.rage=f.rage;note('Blutpriester: die Gefallene kehrt zurück')}})}};
  const live=s=>T[s].some(f=>f.alive);
  const target=(s,i,f)=>{const E=T[1-s],al=[];let pick;E.forEach((o,j)=>{if(o.alive)al.push(j)});if(!al.length)return-1;
    pick=j=>{const g=E[j].guard;if(g&&g.alive!==false){const gi=E.findIndex(o=>o.c===g.c);if(gi>=0&&E[gi].alive&&gi!==j){note('Wächter fängt den Schlag ab');return gi}}return j};
    if(f.r===7){note('Greif stürzt sich auf den schwächsten Gegner');return pick(al.reduce((a,j)=>E[j].hp<E[a].hp?j:a,al[0]))}
    if(E[i]&&E[i].alive)return pick(i);return pick(al.reduce((a,j)=>Math.abs(j-i)<Math.abs(a-i)?j:a,al[0]))};
  const strongest=s=>{let b=-1;T[s].forEach((o,j)=>{if(o.alive&&(b<0||o.atk*o.hp>T[s][b].atk*T[s][b].hp))b=j});return b};
  const strike=sel=>{const acts=[];for(const s of[0,1])T[s].forEach((f,i)=>{if(f.alive&&sel(f)){if(f.frz>0){f.frz--;note('Eingefroren: setzt aus');return}const j=target(s,i,f);if(j>=0)acts.push({s,i,f,j,atk:f.atk*(f.r===4&&!f.sup&&f.first?2:1)})}});
    acts.forEach(a=>{if(a.f.r===13)note('Wyvern schlägt zuerst zu');if(a.f.r===11)note('Mantikor-Stachel trifft die Nachbarn');
      a.f.first=false;hurt(1-a.s,a.j,a.atk,{s:a.s,i:a.i,f:a.f},'atk');if(a.f.r===11)[a.j-1,a.j+1].forEach(k=>hurt(1-a.s,k,2,null,'splash'))});return acts.length};
  for(const s of[0,1])T[s].forEach((f,i)=>{if(f.r===12&&T[1-s][i]){T[1-s][i].atk=Math.max(0,T[1-s][i].atk-2);note('Nachtmahr: Gegner gegenüber −2 Angriff')}});
  note('Stärkste Karte links. Jede kämpft gegen die gegenüber.');snap('Aufstellung');
  /* Kampfbeginn */
  for(const s of[0,1]){const z=hasSup(s,'zunder')*K.zunder;
    if(hasSup(s,'pest')){T[1-s].forEach(o=>{o.psn=Math.max(o.psn,K.pest*hasSup(s,'pest'))});note('Pestratte: alle Gegner sind verseucht')}
    T[s].forEach((f,i)=>{if(f.sup==='frostbiss'){const j=strongest(1-s);if(j>=0){T[1-s][j].frz=1;note('Frostbiss: die stärkste Gegnerkarte erstarrt')}}});
    T[s].forEach((f,i)=>{
      if(f.glut){const j=target(s,i,{r:0});if(j>=0){hurt(1-s,j,f.glut+z,null,'fire');note('Glut: Aschelande brennt zu Kampfbeginn')}}
      if(f.sup==='funke'){const j=strongest(1-s);if(j>=0){hurt(1-s,j,K.funke+z,null,'fire');note('Funke trifft die stärkste Gegnerkarte')}}
      if(f.r===14){note('Drache speit Feuer: 2 an alle Gegner');T[1-s].forEach((o,j)=>hurt(1-s,j,2+z,null,'fire'))}})}
  if(hits.length){deaths();snap('Kampfbeginn')}else{hits=[];notes=notes.filter(x=>x.startsWith('Frostbiss'));if(notes.length)snap('Kampfbeginn')}
  let round=0;
  while(live(0)&&live(1)&&round<8){round++;
    let any=false;for(const s of[0,1])T[s].forEach(f=>{if(f.alive&&f.rage){f.atk+=f.rage;any=true}});if(any){note('Blutrausch: Blutmoor-Karten werden stärker');snap(`Runde ${round} · Blutrausch`)}
    if(strike(f=>f.r===13)){deaths();snap(`Runde ${round} · Erstschlag`)}
    if(!live(0)||!live(1))break;
    strike(f=>f.r!==13);deaths();snap(`Runde ${round}`);
    for(const s of[0,1])T[s].forEach((f,i)=>{if(!f.alive)return;if(f.r===8&&f.hp<f.max){f.hp=Math.min(f.max,f.hp+2);note('Troll regeneriert 2 Leben')}if(f.psn)hurt(s,i,f.psn,null,'psn')});
    if(hits.length||notes.length){deaths();snap(`Runde ${round} · Rundenende`)}else{hits=[];notes=[]}}
  const a0=T[0].filter(f=>f.alive),a1=T[1].filter(f=>f.alive);let w=-1;
  if(a0.length&&!a1.length)w=0;else if(a1.length&&!a0.length)w=1;else if(a0.length&&a1.length){const h0=a0.reduce((x,f)=>x+f.hp,0),h1=a1.reduce((x,f)=>x+f.hp,0);w=h0>h1?0:h1>h0?1:-1}
  return{w,snaps,rounds:round}}
/* Teamstärke-Schätzung für Vorschlag/KI */
function power(t){let A=0,H=0;for(const f of t.team){A+=f.atk+f.rage*(K.rw||1)+f.glut+(f.r===14?3:0)+(f.r===13?1.5:0)+(f.r===11?1.5:0)+(f.frost?2:0)+(f.sup==='funke'?3:0)+(f.sup==='pest'?4:0)+(f.sup==='brand'?2:0);
  H+=f.hp+(f.shield?Math.max(4,f.hp*.6):0)+(f.r===6?2:0)+(f.r===8?3:0)+(f.r===10?2:0)+(f.taunt?3:0)+(f.sup==='aas'?4:0)+(f.sup==='priester'?6:0)+(f.sup==='wall'?4:0)}
  return A*H+t.b.score/Math.pow(15,5)*0.01}
function pickTeam(cards,up){if(cards.length<5)return null;let best=null,bp=-1;for(const ix of combos(cards.length)){const t=mkTeam(ix.map(i=>cards[i]),up);const p=power(t);if(p>bp){bp=p;best=t}}best.pw=bp;return best}
function bestScore(cards){let m=-1;for(const ix of combos(cards.length)){const e=eval5(ix.map(i=>cards[i]));if(e.score>m)m=e.score}return m}
function bestFive(cards){let b=null;for(const ix of combos(cards.length)){const f=ix.map(i=>cards[i]),e=eval5(f);if(!b||e.score>b.score){b=e;b.five=f}}return b}

/* Kampf-Gewinnchance: Restkarten auslosen, jeder stellt sein bestes Team, Rundenturnier wie beim Showdown.
   me={hole,up}, opps=[{n,up}], known=Karten, die nicht mehr im Stapel sind, rand=()=>[0,1) */
function battleEquity(me,board,opps,known,samples,rand){rand=rand||Math.random;const ks=new Set(known.map(c=>c.id));const deck=FULL.filter(c=>!ks.has(c.id));let w=0;
  for(let s=0;s<samples;s++){const d=deck.slice();for(let i=d.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));const t=d[i];d[i]=d[j];d[j]=t}
    let k=0;const bd=board.concat(d.slice(0,5-board.length));k=5-board.length;
    const all=[pickTeam(me.hole.concat(bd),me.up)];for(const o of opps){all.push(pickTeam(d.slice(k,k+o.n).concat(bd),o.up));k+=o.n}
    const wins=all.map(()=>0);for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const r=battle(all[i].team,all[j].team,false);if(r.w===0)wins[i]++;else if(r.w===1)wins[j]++}
    const top=Math.max(...wins);const W=wins.filter(x=>x===top).length;if(wins[0]===top)w+=1/W}
  return w/samples}
if(typeof module!=='undefined')module.exports={bestScore,bestFive,K,FULL,eval5,mkTeam,battle,pickTeam,power,combos,PST,chainLen,SUP,supOf,battleEquity};
