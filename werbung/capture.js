// Nimmt echtes Spielmaterial im Hochformat 1080x1920 auf (CDP-Screencast, Einzelbilder mit Zeitstempel).
// Abschnitte: titel, tisch (Flop mit Drachen), schlacht (erster Showdown-Kampf).
// Zeitlupe beim Aufnehmen: CSS/WAAPI laufen mit RATE, die JS-Uhr (Timer, rAF, performance.now) wird im selben Takt vorgestellt.
const RATE=0.25,STEP=30;
const {chromium}=require('playwright');const fs=require('fs');
const OUT=process.argv[2];fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:1080,height:1920},deviceScaleFactor:1,hasTouch:true});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('kk-tut','1');localStorage.setItem('kk-ton',JSON.stringify({mus:false,sfx:false}))});
  const cdp=await ctx.newCDPSession(p);let seg=null,GT=0;const log={};
  cdp.on('Page.screencastFrame',async f=>{cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});
    if(!seg)return;const L=log[seg]=log[seg]||[];const name=`${seg}_${String(L.length).padStart(5,'0')}.jpg`;
    fs.writeFileSync(`${OUT}/${name}`,Buffer.from(f.data,'base64'));L.push([name,GT/1000])});
  /* Uhr anhalten: Spielzeit läuft nur noch in den Schritten unten */
  const T0=Date.now();await p.clock.install({time:T0});await p.clock.pauseAt(T0+50);
  await p.goto('http://localhost:8766/index.html');
  await cdp.send('Animation.enable');await cdp.send('Animation.setPlaybackRate',{playbackRate:RATE});
  let ticking=true;(async()=>{while(ticking){const t=Date.now();await p.clock.runFor(STEP).catch(()=>{});GT+=STEP;const w=STEP/RATE-(Date.now()-t);if(w>0)await new Promise(r=>setTimeout(r,w))}})();
  await p.waitForTimeout(1500/RATE);
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:1080,maxHeight:1920,everyNthFrame:1});
  seg='titel';await p.waitForTimeout(2600/RATE);seg=null;
  /* Gegner gehen immer mit, damit alle im Showdown stehen */
  await p.click('[data-x=go]');
  await p.evaluate(()=>{window.aiAct=async()=>{await new Promise(r=>setTimeout(r,260));return{t:'call'}}});
  await p.waitForFunction(()=>G&&G.ui&&G.ui.mode==='bet',null,{timeout:200000});
  /* Kartenverteilung für den Dreh: zwei Drachen auf der Hand, zwei kommen über den Tisch */
  await p.evaluate(()=>{const id=x=>cardById[x],me=G.players[0];
    const hole=['14-0','14-1','13-1'].map(id),flop=['14-2','9-1','11-3'].map(id),tr=['14-3','6-0'].map(id),want=new Set([...hole,...flop,...tr]);
    const pool=G.deck.filter(c=>!want.has(c));
    for(const q of G.players.slice(1))q.hole=q.hole.map(c=>want.has(c)?pool.shift():c);
    const used=new Set(G.players.flatMap(q=>q.hole));me.hole=hole;
    G.deck=[...flop,...tr,...FULL.filter(c=>!want.has(c)&&!used.has(c))];render()});
  await p.click('[data-a=call]');
  /* Flop: Aufnahme ab dem Banner */
  await p.waitForFunction(()=>document.querySelector('.banner'),null,{timeout:300000});seg='tisch';
  await p.waitForFunction(()=>G.ui&&G.ui.mode==='bet'&&G.board.length===3,null,{timeout:300000});await p.waitForTimeout(1600/RATE);seg=null;
  await p.click('[data-a=call]');
  await p.waitForFunction(()=>G.ui&&G.ui.mode==='sac',null,{timeout:300000});
  await p.evaluate(()=>{G.ui.sel='13-1';render()});await p.click('[data-a=dosac]');
  await p.waitForFunction(()=>G.ui&&G.ui.mode==='bet'&&G.board.length===5,null,{timeout:300000});seg='wende';await p.waitForTimeout(1400/RATE);seg=null;
  await p.click('[data-a=call]');
  await p.waitForFunction(()=>G.ui&&G.ui.mode==='lineup',null,{timeout:300000});
  await p.click('[data-a=lupoker]');await p.waitForTimeout(300/RATE);seg='team';await p.waitForTimeout(1400/RATE);seg=null;await p.click('[data-a=dolu]');
  await p.waitForSelector('.sheet.order',{timeout:300000});await p.click('[data-x=go]');
  /* Erster Kampf komplett */
  await p.waitForSelector('#battle',{timeout:300000});seg='schlacht';
  await p.waitForSelector('[data-x=next]',{timeout:600000});await p.waitForTimeout(3200/RATE);seg=null;
  await cdp.send('Page.stopScreencast');ticking=false;
  fs.writeFileSync(`${OUT}/log.json`,JSON.stringify({rate:RATE,log}));
  console.log(Object.fromEntries(Object.entries(log).map(([k,v])=>[k,[v.length,(v[v.length-1][1]-v[0][1]).toFixed(1)+'s Spielzeit',new Set(v.map(x=>x[1])).size+' Zeitschritte']])),'Fehler',errs);
  await b.close()})();
