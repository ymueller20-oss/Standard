/* RABENBLATT-ENGINE (geteilt von Seite und Simulation) */
/* Grundwerte [Angriff, Leben]: Leben dreifach, damit Kämpfe 3–4 Runden dauern und Fähigkeiten zum Zug kommen */
const PST={2:[1,6],3:[2,6],4:[3,9],5:[3,12],6:[3,15],7:[5,12],8:[4,21],9:[6,15],10:[5,27],11:[7,18],12:[7,24],13:[8,24],14:[10,33]};
const FULL=[];for(let s=0;s<4;s++)for(let r=2;r<=14;r++)FULL.push({r,s,id:r+'-'+s});
const COMB={};function combos(n,k=5){const key=n+'/'+k;if(COMB[key])return COMB[key];const out=[];const rec=(st,a)=>{if(a.length===k){out.push(a.slice());return}for(let i=st;i<n;i++){a.push(i);rec(i+1,a);a.pop()}};rec(0,[]);return COMB[key]=out}
function eval5(cs){const r=cs.map(c=>c.r).sort((a,b)=>b-a),s0=cs[0].s;const fl=cs[1].s===s0&&cs[2].s===s0&&cs[3].s===s0&&cs[4].s===s0;
  let st=0;if(r[0]!==r[1]&&r[1]!==r[2]&&r[2]!==r[3]&&r[3]!==r[4]){if(r[0]-r[4]===4)st=r[0];else if(r[0]===14&&r[1]===5)st=5}
  const cnt={};for(const x of r)cnt[x]=(cnt[x]||0)+1;const g=Object.keys(cnt).map(k=>[cnt[k],+k]).sort((a,b)=>b[0]-a[0]||b[1]-a[1]);let cat,tb;
  if(st&&fl){cat=st===14?9:8;tb=[st]}else if(g[0][0]>=4){cat=7;tb=[g[0][1],g[1]?g[1][1]:g[0][1]]}  /* Fünfling (nur mit Söldnern möglich) zählt als Plage */else if(g[0][0]===3&&g[1][0]===2){cat=6;tb=[g[0][1],g[1][1]]}
  else if(fl){cat=5;tb=r}else if(st){cat=4;tb=[st]}else if(g[0][0]===3){cat=3;tb=g.map(x=>x[1])}else if(g[0][0]===2&&g[1][0]===2){cat=2;tb=g.map(x=>x[1])}
  else if(g[0][0]===2){cat=1;tb=g.map(x=>x[1])}else{cat=0;tb=r}
  let sc=cat;for(let i=0;i<5;i++)sc=sc*15+(tb[i]||0);return{score:sc,cat,tb}}

/* Balance-Parameter */
const K={
  rache:2, stand:4,                    // Vergeltung: fällt eine Karte, erhalten ihre Verbündeten +2 Angriff · Letztes Aufgebot: die letzte Karte gegen eine Übermacht +4/+4 (qa/kampf.js: mehr knappe Kämpfe, weniger glatte Siege)
  FB:[0,0,2,7,9,11,14,24,28,36],       // Formationsbonus je Kombo für alle 5 Teamkarten: Paare helfen wenig, ab dem Rudel (Drilling, ~5 % der Hände) entscheidet die Kombo meist (Rudel ~82 %, Plage ~99 %)
  fa:1, fh:1,                          // Anteil des Formationsbonus auf Angriff / Leben
  son:4, sonR:4, sonSh1:4, sonSh2:5,  // Sonnenwacht · Gottesschild: Zwillinge gleicher Stärke tragen Schild, +4/+4 je Zwilling; +4/+4 je weitere Sonnenwacht-Karte; ab 4 Karten die stärkste, ab 5 alle mit Schild
  ashA:3, ashH:2, ashN:2, ashNH:5, glutN:0,  // Aschelande · Glut: +3/+2 je Kettenglied, +2/+5 je weitere Aschelande-Karte; Glut zu Kampfbeginn = Kettenlänge
  norH:1, norA:1, norFrost:3,  // Nordmark · Frost: +1/+1 je weitere Nordmark-Karte; ab 3 Karten frieren ihre Treffer ein
  blut:2, blutPer:1, blutF:0, rw:0.01,  // Blutmoor · Blutrausch: jede Runde +2 Angriff, +1 je weitere Blutmoor-Karte; Todesstoß im Fallen. rw: Blutrausch-Gewicht der KI-Schätzung
  knappe:1, herold:5, banner:8,       // Sonnenwacht-Unterstützer
  funke:8, zunder:2, brand:8, schmied:3,  // Aschelande-Unterstützer
  rune:5, wall:1,                     // Nordmark-Unterstützer
  pest:3, aas:3, moor:3               // Blutmoor-Unterstützer
};
/* Reichseigene Unterstützer (Stärke 2–5): [Reich][Stärke] = Schlüssel */
const SUP=[{2:'knappe',3:'herold',4:'banner',5:'waechter'},{2:'funke',3:'zunder',4:'brand',5:'schmied'},{2:'frostbiss',3:'rune',4:'wall',5:'winterwolf'},{2:'pest',3:'aas',4:'priester',5:'moorwolf'}];
const supOf=c=>c.r<=5?SUP[c.s][c.r]||null:null;
function chainLen(rs,r){const has=x=>rs.has(x)||(x===1&&rs.has(14));let lo=r,hi=r;while(has(lo-1))lo--;while(has(hi+1))hi++;
  let L=hi-lo+1;if(r===14){let h2=1;while(has(1+h2))h2++;L=Math.max(L,h2)}return L}
function mkTeam(five,up,ordered){up=up||{rank:{},realm:{}};const b=eval5(five),cnt={};five.forEach(c=>cnt[c.r]=(cnt[c.r]||0)+1);const rs=new Set(five.map(c=>c.r));
  const F=(ordered?five.slice():five.slice().sort((x,y)=>y.r-x.r||x.s-y.s)).map(c=>{const st=PST[c.r],u=(up.rank[c.r]||0)+(up.realm[c.s]||0);
    return{c,r:c.r,s:c.s,up:u,atk:st[0]+u,hp:st[1]+u,form:0,realm:[0,0],rage:0,sup:supOf(c),shield:false,glut:0,frost:false,taunt:false}});
  const n=[0,0,0,0];F.forEach(f=>n[f.s]++);const has=k=>F.filter(f=>f.sup===k);
  F.forEach(f=>{const bo=K.FB[b.cat];f.form=bo;f.atk+=Math.round(bo*K.fa);f.hp+=Math.round(bo*K.fh);let ra=0,rh=0;
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
  has('winterwolf').forEach(k=>{const i=F.indexOf(k);[k,F[i-1],F[i+1]].forEach(f=>{if(f)f.frost=true})});
  has('moorwolf').forEach(k=>{const i=F.indexOf(k);[F[i-1],F[i+1]].forEach(f=>{if(f)f.rage+=K.moor})});
  F.forEach(f=>f.max=f.hp);b.five=five;return{team:F,b,five}}
function battle(A0,B0,rec){
  const T=[A0.map(f=>({...f,alive:true,psn:0,first:true,frz:0})),B0.map(f=>({...f,alive:true,psn:0,first:true,frz:0}))];const snaps=rec?[]:null;let hits=[],notes=[],evs=[];
  const note=t=>{if(rec&&!notes.includes(t))notes.push(t)};
  /* Ereignisse nur für die Darstellung (rec): wer trifft wen, was leuchtet auf */
  const ev=o=>{if(rec)evs.push(o)};
  const snap=label=>{if(rec)snaps.push({label,notes,st:T.map(t=>t.map(f=>({atk:f.atk,hp:Math.max(0,f.hp),alive:f.alive,sh:f.shield,fz:f.frz>0,psn:f.psn>0}))),hits,ev:evs});hits=[];notes=[];evs=[]};
  const hasSup=(s,k)=>T[s].filter(f=>f.alive&&f.sup===k).length;
  const hurt=(s,i,n,src,kind,by)=>{const f=T[s][i];if(!f||!f.alive||n<=0)return;let d=n;const a=by||(src?[src.s,src.i]:null);
    if(f.shield){f.shield=false;hits.push({s,i,d:0,sh:1,a,k:kind});note('Gottesschild bricht');
      const h=hasSup(s,'herold');if(h){T[s].forEach(o=>{if(o.alive)o.atk+=K.herold*h});ev({t:'buff',s,n:K.herold*h});note('Herold: Verbündete +'+K.herold*h+' Angriff')}return}
    if(f.r===6){d--;note('Ghul ist zäh: 1 Schaden weniger')}
    if(T[s].some((o,j)=>o.alive&&o.r===10&&Math.abs(j-i)===1)){d--;note('Riese schützt seine Nachbarn')}
    if(kind!=='psn'&&T[s].some(o=>o.alive&&o.sup==='wall')){d-=K.wall;note('Schildwall: alle nehmen weniger Schaden')}
    d=Math.max(0,d);if(!d)return;f.hp-=d;hits.push({s,i,d,a,k:kind});if(kind==='psn')note('Gift wirkt');
    if(src&&src.f.r===9&&!f.psn){f.psn=1;ev({t:'psn',s,i});note('Lindwurm vergiftet sein Ziel')}
    if(src&&src.f.frost&&kind==='atk'&&f.hp>0){f.frz=1;ev({t:'frz',s,i});note('Frost: das Ziel erstarrt')}};
  let reborn=[false,false];
  const deaths=()=>{let guard=0;while(guard++<20){const died=[],last=[];
    for(const s of[0,1])T[s].forEach((f,i)=>{if(f.alive&&f.hp<=0){f.alive=false;died.push({s,i,f});if(f.rage)last.push({s,i,f})}});
    if(!died.length)break;
    last.forEach(a=>{const j=target(a.s,a.i,a.f);if(j>=0){note('Blutmoor: Todesstoß im Fallen');hurt(1-a.s,j,a.f.atk,{s:a.s,i:a.i,f:a.f},'last');ev({t:'last',s:a.s,i:a.i})}});
    note(died.length===1?'Eine Karte fällt':died.length+' Karten fallen');
    died.forEach(({s,i,f})=>{
      if(T[s].some(o=>o.alive)){T[s].forEach(o=>{if(o.alive)o.atk+=K.rache});ev({t:'rache',s,n:K.rache});note('Vergeltung: Verbündete +'+K.rache+' Angriff')}
      const br=hasSup(1-s,'brand');if(br){[i-1,i+1].forEach(k=>hurt(s,k,K.brand*br,null,'fire'));note('Flächenbrand greift über')}
      T[1-s].forEach(o=>{if(o.alive&&o.r===3&&!o.sup)o.atk+=1});
      for(const t of[0,1])T[t].forEach((o,oi)=>{if(o.alive&&o.sup==='aas'){o.atk+=K.aas;o.hp+=K.aas;o.max+=K.aas;ev({t:'grow',s:t,i:oi,n:K.aas});note('Aaskrähe frisst: +'+K.aas+'/+'+K.aas)}});
      if(!reborn[s]&&f.sup!=='priester'&&T[s].some(o=>o.alive&&o.sup==='priester')){reborn[s]=true;f.alive=true;f.hp=Math.ceil(f.max/2);f.rage=f.rage;ev({t:'rev',s,i});note('Blutpriester: die Gefallene kehrt zurück')}})}
    /* Notbremse: wer nach einer langen Kette von Todesstößen noch ohne Leben steht, fällt ohne weiteren Schlag */
    for(const s of[0,1])T[s].forEach(f=>{if(f.alive&&f.hp<=0)f.alive=false})};
  const live=s=>T[s].some(f=>f.alive);
  const target=(s,i,f)=>{const E=T[1-s],al=[];let pick;E.forEach((o,j)=>{if(o.alive)al.push(j)});if(!al.length)return-1;
    pick=j=>{const g=E[j].guard;if(g&&g.alive!==false){const gi=E.findIndex(o=>o.c===g.c);if(gi>=0&&E[gi].alive&&gi!==j){note('Wächter fängt den Schlag ab');return gi}}return j};
    if(f.r===7){note('Greif stürzt sich auf den schwächsten Gegner');return pick(al.reduce((a,j)=>E[j].hp<E[a].hp?j:a,al[0]))}
    if(E[i]&&E[i].alive)return pick(i);return pick(al.reduce((a,j)=>Math.abs(j-i)<Math.abs(a-i)?j:a,al[0]))};
  const strongest=s=>{let b=-1;T[s].forEach((o,j)=>{if(o.alive&&(b<0||o.atk*o.hp>T[s][b].atk*T[s][b].hp))b=j});return b};
  const strike=sel=>{const acts=[];for(const s of[0,1])T[s].forEach((f,i)=>{if(f.alive&&sel(f)){if(f.frz>0){f.frz--;ev({t:'skip',s,i});note('Eingefroren: setzt aus');return}const j=target(s,i,f);if(j>=0)acts.push({s,i,f,j,atk:f.atk*(f.r===4&&!f.sup&&f.first?2:1)})}});
    acts.forEach(a=>{if(a.f.r===13)note('Wyvern schlägt zuerst zu');if(a.f.r===11)note('Mantikor-Stachel trifft die Nachbarn');
      a.f.first=false;hurt(1-a.s,a.j,a.atk,{s:a.s,i:a.i,f:a.f},'atk');if(a.f.r===11)[a.j-1,a.j+1].forEach(k=>hurt(1-a.s,k,2,null,'splash',[a.s,a.i]))});return acts.length};
  for(const s of[0,1])T[s].forEach((f,i)=>{if(f.r===12&&T[1-s][i]){T[1-s][i].atk=Math.max(0,T[1-s][i].atk-2);ev({t:'fear',s:1-s,i,by:[s,i]});note('Nachtmahr: Gegner gegenüber −2 Angriff')}});
  note('Stärkste Karte links. Jede kämpft gegen die gegenüber.');snap('Aufstellung');
  /* Kampfbeginn */
  for(const s of[0,1]){const z=hasSup(s,'zunder')*K.zunder;
    if(hasSup(s,'pest')){T[1-s].forEach(o=>{o.psn=Math.max(o.psn,K.pest*hasSup(s,'pest'))});ev({t:'pest',s:1-s});note('Pestratte: alle Gegner sind verseucht')}
    T[s].forEach((f,i)=>{if(f.sup==='frostbiss'){const j=strongest(1-s);if(j>=0){T[1-s][j].frz=1;ev({t:'frz',s:1-s,i:j,by:[s,i]});note('Frostbiss: die stärkste Gegnerkarte erstarrt')}}});
    T[s].forEach((f,i)=>{
      if(f.glut){const j=target(s,i,{r:0});if(j>=0){hurt(1-s,j,f.glut+z,null,'fire',[s,i]);note('Glut: Aschelande brennt zu Kampfbeginn')}}
      if(f.sup==='funke'){const j=strongest(1-s);if(j>=0){hurt(1-s,j,K.funke+z,null,'fire',[s,i]);note('Funke trifft die stärkste Gegnerkarte')}}
      if(f.r===14){note('Drache speit Feuer: 2 an alle Gegner');ev({t:'breath',s,i});T[1-s].forEach((o,j)=>hurt(1-s,j,2+z,null,'breath',[s,i]))}})}
  if(hits.length){deaths();snap('Kampfbeginn')}else{hits=[];notes=notes.filter(x=>x.startsWith('Frostbiss'));evs=evs.filter(e=>e.t==='frz');if(notes.length)snap('Kampfbeginn')}
  let round=0;
  while(live(0)&&live(1)&&round<8){round++;
    for(const s of[0,1]){const al=T[s].filter(f=>f.alive);if(al.length===1&&T[1-s].filter(f=>f.alive).length>=2&&!T[s].stood){T[s].stood=1;const f=al[0];f.atk+=K.stand;f.hp+=K.stand;f.max+=K.stand;ev({t:'stand',s,i:T[s].indexOf(f),n:K.stand});note('Letztes Aufgebot: +'+K.stand+'/+'+K.stand)}}
    let any=false;for(const s of[0,1])T[s].forEach((f,i)=>{if(f.alive&&f.rage){f.atk+=f.rage;any=true;ev({t:'rage',s,i,n:f.rage})}});if(any){note('Blutrausch: Blutmoor-Karten werden stärker');snap(`Runde ${round} · Blutrausch`)}
    if(strike(f=>f.r===13)){deaths();snap(`Runde ${round} · Erstschlag`)}
    if(!live(0)||!live(1))break;
    strike(f=>f.r!==13);deaths();snap(`Runde ${round}`);
    for(const s of[0,1])T[s].forEach((f,i)=>{if(!f.alive)return;if(f.r===8&&f.hp<f.max){f.hp=Math.min(f.max,f.hp+2);ev({t:'heal',s,i,n:2});note('Troll regeneriert 2 Leben')}if(f.psn)hurt(s,i,f.psn,null,'psn')});
    if(hits.length||notes.length){deaths();snap(`Runde ${round} · Rundenende`)}else{hits=[];notes=[];evs=[]}}
  const a0=T[0].filter(f=>f.alive),a1=T[1].filter(f=>f.alive);let w=-1;
  /* Fallen beide Teams im selben Schlag, behält die bessere Formation das Feld */
  if(!a0.length&&!a1.length){const s0=eval5(A0.map(f=>f.c)).score,s1=eval5(B0.map(f=>f.c)).score;w=s0>s1?0:s1>s0?1:-1}
  else if(a0.length&&!a1.length)w=0;else if(a1.length&&!a0.length)w=1;else if(a0.length&&a1.length){const h0=a0.reduce((x,f)=>x+f.hp,0),h1=a1.reduce((x,f)=>x+f.hp,0);w=h0>h1?0:h1>h0?1:-1}
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
    const all=[pickTeam(me.hole.concat(bd,me.heer||[]),me.up)];for(const o of opps){all.push(pickTeam(d.slice(k,k+o.n).concat(bd,o.heer||[]),o.up));k+=o.n}
    const wins=all.map(()=>0);for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const r=battle(all[i].team,all[j].team,false);if(r.w===0)wins[i]++;else if(r.w===1)wins[j]++}
    const top=Math.max(...wins);const W=wins.filter(x=>x===top).length;if(wins[0]===top)w+=1/W}
  return w/samples}
if(typeof module!=='undefined')module.exports={bestScore,bestFive,K,FULL,eval5,mkTeam,battle,pickTeam,power,combos,PST,chainLen,SUP,supOf,battleEquity};
