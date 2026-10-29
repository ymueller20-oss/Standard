'use strict';
/* QA Spielablauf und Spielspaß: ganze Partien im echten Spiel (Browser, ?qa = 25-fach schneller).
   Ein Bot übernimmt den Platz des Menschen. Gemessen wird, was Spaß ausmacht oder bremst:
   Showdowns, knappe Kämpfe, Führungswechsel, Wendepunkte, Leerlauf, Einfluss des Könnens.
   Varianten ändern Regelwerte in game.js beim Laden, um Alternativen zu vergleichen.
   Aufruf: node qa/spiel.js [partien je lauf]  → schreibt qa/spiel.json */
const http=require('http'),fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),N=+process.argv[2]||40,ONLY=process.argv[3]?process.argv[3].split(','):null,WORKERS=6,OUT=path.join(__dirname,'spiel.json');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ogg':'audio/ogg','.m4a':'audio/mp4','.woff2':'font/woff2','.json':'application/json'};

/* Läufe: Strategie des Bots auf Platz 1 und Regelvariante */
const RUNS=[
  {id:'ki',strat:'ki',v:'Standard'},
  {id:'profi',strat:'profi',v:'Standard'},
  {id:'passiv',strat:'passiv',v:'Standard'},
  {id:'zufall',strat:'zufall',v:'Standard'},
];

function bot(strat){
  const Q={hands:[],battles:[],bt:[],dec:{bet:0,betReal:0,sac:0,lineup:0,order:0,tavern:0,buy:0},buys:{},t0:Date.now(),res:null};
  window.__Q=Q;let pend=[];
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const me=()=>G.players[0];
  const score=p=>p.out?-1:p.stack+10*p.thron;
  const ob=battle;battle=function(A,B,rec){const r=ob(A,B,rec);if(rec)pend.push(r);return r};
  const oh=playHand;playHand=async function(){
    const h={n:G.hand+1};pend=[];await oh();
    const p0=me();h.in=p0.inHand;h.fold=p0.folded;h.board=G.board.length;
    h.sd=!!G._sd;h.sdMe=!!G._sdMe;h.nSd=G._nSd||0;G._sd=G._sdMe=false;G._nSd=0;
    h.sc=G.players.map(score);h.th=G.players.map(p=>p.out?0:p.thron);Q.hands.push(h)};
  coach=()=>Promise.resolve();
  /* Kampfanimation läuft echt mit; am Ende tippt der Bot auf »Weiter«. Gemessen wird die Zuschauzeit. */
  const opb=playBattle;playBattle=function(x){const t=Date.now(),pr=opb(x);if(x.skirm)Q.skirm=(Q.skirm||0)+1;
    const iv=setInterval(()=>{const b=document.querySelector('#ov [data-x="next"]');if(b){if(!x._t){x._t=1;Q.bt.push((Date.now()-t)/0.04)}b.click()}},20);
    return pr.then(v=>{clearInterval(iv);return v})};
  ask=function(mode,d){const p=me();
    if(mode==='bet'){Q.dec.bet++;if(d.toCall>0)Q.dec.betReal++;
      if(strat==='passiv')return Promise.resolve({t:'call'});
      if(strat==='zufall'){const o=['call','call'];if(d.toCall>0)o.push('fold');if(d.canRaise)o.push('raise');return Promise.resolve({t:pick(o)})}
      let e=G.eq.eq;if(strat==='profi'){e=equity(p,40)}
      const n=G.eq.n,fair=1/n,po=d.toCall/(G.pot+d.toCall||1),st=strat==='profi'?{aggr:.6,bluff:.06,tight:.25}:{aggr:.55,bluff:.1,tight:.3};
      e+=(strat==='profi'?0:(Math.random()-.5)*.08);const bl=Math.random()<st.bluff;
      if(d.toCall<=0){if(d.canRaise&&((e>fair*1.45&&Math.random()<st.aggr+.2)||(bl&&Math.random()<.5)))return Promise.resolve({t:'raise'});return Promise.resolve({t:'call'})}
      const need=po*(1.08+st.tight*.45);
      if(d.canRaise&&e>need+.22&&Math.random()<st.aggr+.1)return Promise.resolve({t:'raise'});
      if(e>=need||(bl&&Math.random()<.3)||(d.toCall<=G.bb*.5&&e>fair*.7))return Promise.resolve({t:'call'});
      return Promise.resolve({t:'fold'})}
    if(mode==='sac'){Q.dec.sac++;
      if(strat==='zufall')return Promise.resolve(pick(p.hole));
      let bi=0,bs=-1;p.hole.forEach((c,i)=>{const sc=bestScore(p.hole.filter((_,j)=>j!==i).concat(G.board));if(sc>bs||(sc===bs&&c.r<p.hole[bi].r)){bs=sc;bi=i}});
      return Promise.resolve(p.hole[bi])}
    if(mode==='draft'){Q.dec.draft=(Q.dec.draft||0)+1;
      if(strat==='zufall')return Promise.resolve(pick(d.offer));if(strat==='passiv')return Promise.resolve(d.offer[0]);return Promise.resolve(aiDraft(p,d.offer))}
    if(mode==='lineup'){Q.dec.lineup++;G._sdMe=true;
      if(strat==='zufall'){const a=d.cards.slice().sort(()=>Math.random()-.5);return Promise.resolve(a.slice(0,5))}
      if(strat==='passiv')return Promise.resolve(d.cards.filter(c=>d.sel.includes(c.id)));
      return Promise.resolve(pickTeam(d.cards,p.up).five)}
    throw new Error('ask '+mode)};
  orderLineup=function(five,p){Q.dec.order++;
    if(strat==='zufall')return Promise.resolve(five.slice().sort(()=>Math.random()-.5));
    if(strat==='profi')return Promise.resolve(aiOrder(p,five,live()));
    return Promise.resolve(five)};
  showSheet=function(kind,d){const p=me();
    if(kind==='result'){G._sd=true;G._nSd=d.L.length;let k=0;
      for(let i=0;i<d.L.length;i++)for(let j=i+1;j<d.L.length;j++){const r=pend[k++];if(!r)continue;const A=d.L[i],B=d.L[j];
        let lead=0,lc=0,behindW=false;
        for(const s of r.snaps){const a=s.st[0].filter(x=>x.alive).length,b=s.st[1].filter(x=>x.alive).length,
          ha=s.st[0].reduce((t,x)=>t+(x.alive?Math.max(0,x.hp):0),0),hb=s.st[1].reduce((t,x)=>t+(x.alive?Math.max(0,x.hp):0),0);
          const l=Math.sign((a-b)*1000+(ha-hb));if(l&&lead&&l!==lead)lc++;if(l)lead=l;
          if(r.w===0&&l<0||r.w===1&&l>0)behindW=true}
        const last=r.snaps[r.snaps.length-1],surv=r.w<0?0:last.st[r.w].filter(x=>x.alive).length;
        const ca=A.team.b.cat,cb=B.team.b.cat;
        Q.battles.push({me:A.human||B.human,w:r.w,rounds:r.snaps.length,lc,comeback:behindW,surv,
          upset:r.w>=0&&ca!==cb&&((r.w===0)!==(ca>cb)),cats:[ca,cb],meWon:r.w>=0&&(r.w===0?A:B).human,meLost:r.w>=0&&(r.w===0?B:A).human})}
      pend=[];return Promise.resolve()}
    if(kind==='tavern'){if(!d.__seen){d.__seen=1;Q.dec.tavern++}
      if(strat==='passiv')return Promise.resolve({t:'done'});
      /* ki kauft wie die Gegner: höchstens ein Angebot, 10 Zoll Rücklage. profi kauft mehr, mit 6 Zoll Rücklage. */
      if(strat==='ki'&&d.offers.some(o=>o.sold))return Promise.resolve({t:'done'});
      const ok=d.offers.map((o,i)=>({o,i})).filter(x=>!x.o.sold&&p.stack-x.o.cost>=Math.max(1,G.bb*(strat==='zufall'?0:strat==='ki'?10:6)));
      let c=null;
      if(strat==='zufall'){if(ok.length&&Math.random()<.5)c=pick(ok)}
      else{let bv=.5;for(const x of ok){const v=offerValue(p,x.o).v;if(v>bv){bv=v;c=x}}}
      if(!c)return Promise.resolve({t:'done'});
      Q.dec.buy++;Q.buys[c.o.k]=(Q.buys[c.o.k]||0)+1;return Promise.resolve({t:'buy',i:c.i})}
    return Promise.resolve()};
  gameOver=async function(){const p=me(),rank=G.players.slice().sort((a,b)=>score(b)-score(a));
    const alive=G.players.filter(q=>!q.out).length;
    Q.res={place:rank.indexOf(p)+1,won:rank[0]===p,end:p.out?'raus':alive===1?'allein':'zeit',hands:G.hand,alive,
      winner:rank[0].short,ms:(Date.now()-Q.t0)/0.04};
    return Q};
  return true}

async function main(){
    const srv=http.createServer((q,s)=>{const u=decodeURIComponent(q.url.split('?')[0]);let f=path.join(ROOT,u==='/'?'index.html':u);
    if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end()}
    const body=fs.readFileSync(f);
    s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});s.end(body)}).listen(0);
  const port=srv.address().port,br=await chromium.launch(),out={};
  const runs=RUNS.filter(R=>!ONLY||ONLY.includes(R.id)),jobs=[];for(const R of runs)for(let g=0;g<N;g++)jobs.push(R);
  const src=fs.readFileSync(path.join(ROOT,'game.js'),'utf8');
  for(const R of runs){if(R.rep)for(const[a]of R.rep)if(!src.includes(a))throw new Error('Variante '+R.id+': '+a+' nicht gefunden');out[R.id]={...R,games:[],errors:[]}}
  let next=0;const t0=Date.now();
  async function worker(){
    const ctx=await br.newContext({viewport:{width:390,height:844}});
    while(next<jobs.length){const R=jobs[next++],page=await ctx.newPage();const errs=[];
      page.on('pageerror',e=>errs.push(String(e.message||e)));
      if(R.rep)await page.route('**/game.js',async rt=>{let s=src;for(const[a,b]of R.rep)s=s.replace(a,b);rt.fulfill({contentType:'text/javascript',body:s})});
      try{await page.goto(`http://localhost:${port}/?qa`);await page.waitForFunction(()=>typeof newGame==='function');
        await page.evaluate(`(${bot})(${JSON.stringify(R.strat)})`);
        const q=await page.evaluate(()=>newGame().then(()=>window.__Q),{timeout:0});
        out[R.id].games.push(q)}
      catch(e){errs.push('lauf: '+String(e.message||e).slice(0,200))}
      if(errs.length)out[R.id].errors.push(...errs.slice(0,3));
      await page.close();
      if(next%20===0)process.stderr.write(`${next}/${jobs.length} ${((Date.now()-t0)/1000)|0}s\n`)}
    await ctx.close()}
  await Promise.all(Array.from({length:WORKERS},worker));
  await br.close();srv.close();
  const prev=ONLY&&fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT,'utf8')):{};fs.writeFileSync(OUT,JSON.stringify({...prev,...out}));
  console.log('fertig',((Date.now()-t0)/1000|0)+'s')}
main().catch(e=>{console.error(e);process.exit(1)});
