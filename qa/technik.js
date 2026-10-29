'use strict';
/* QA Technik: Syntax, Build-Zip vollständig, keine fremden Server, Tonliste, Layout und Tippflächen auf drei Handygrößen.
   Lädt das gebaute Spiel aus dist/game, damit fehlende Dateien im Zip auffallen. Bilder landen in qa/bilder/.
   Aufruf: node qa/technik.js → gibt {checks} zurück bzw. schreibt qa/technik.json */
const http=require('http'),fs=require('fs'),path=require('path'),{execSync}=require('child_process'),{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),DIST=path.join(ROOT,'dist/game'),SHOT=path.join(__dirname,'bilder');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json','.mp3':'audio/mpeg','.ogg':'audio/ogg','.m4a':'audio/mp4'};
const checks=[],ck=(bereich,name,ok,wert,ziel,detail)=>checks.push({bereich,name,status:ok===true?'ok':ok===false?'fail':ok,wert,ziel,detail:detail||''});

async function main(){
  /* Syntax */
  for(const f of['engine.js','game.js','battle.js','audio.js']){let ok=true,e='';try{execSync(`node --check ${f}`,{cwd:ROOT,stdio:'pipe'})}catch(x){ok=false;e=String(x.stderr).slice(0,200)}
    ck('Technik',`Syntax ${f}`,ok,ok?'fehlerfrei':'Fehler','fehlerfrei',e)}
  /* Tonliste: jede Datei im Index vorhanden, keine verwaisten Dateien */
  const idx=JSON.parse(fs.readFileSync(path.join(ROOT,'audio/index.json'),'utf8')),need=[];
  for(const k in idx.musik)need.push(`musik/${k}.mp3`);
  for(const[k,n]of Object.entries(idx.sfx))(n?Array.from({length:n},(_,i)=>k+(i+1)):[k]).forEach(f=>need.push(`sfx/${f}.mp3`));
  const miss=need.filter(f=>!fs.existsSync(path.join(ROOT,'audio',f)));
  const files=execSync('find musik sfx -type f',{cwd:path.join(ROOT,'audio')}).toString().trim().split('\n'),orphan=files.filter(f=>!need.includes(f));
  ck('Ton','Tonliste vollständig',miss.length===0,`${need.length} Dateien, ${miss.length} fehlen`,'0 fehlen',miss.slice(0,5).join(', '));
  ck('Ton','Keine ungenutzten Tondateien',orphan.length===0?true:'warn',`${orphan.length} ungenutzt`,'0',orphan.slice(0,5).join(', '));
  /* Jeder im Code aufgerufene Klang steht in der Liste */
  const code=['game.js','battle.js'].map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n'),used=new Set(),unk=[];
  for(const m of code.matchAll(/au\('(sfx|music|sting)','([a-z]+)'/g)){used.add(m[1]+':'+m[2]);if(!(m[1]==='sfx'?idx.sfx:idx.musik).hasOwnProperty(m[2]))unk.push(m[2])}
  for(const m of code.matchAll(/P\('([a-z]+)'/g)){used.add('sfx:'+m[1]);if(!idx.sfx.hasOwnProperty(m[1]))unk.push(m[1])}
  ck('Ton','Alle aufgerufenen Klänge vorhanden',unk.length===0,`${used.size} Aufrufe, ${unk.length} unbekannt`,'0',[...new Set(unk)].join(', '));
  /* Lautstärke: keine übersteuerten Dateien */
  let clip=[];try{for(const f of need){const o=execSync(`ffmpeg -hide_banner -nostats -i "${f}" -af volumedetect -f null - 2>&1`,{cwd:path.join(ROOT,'audio')}).toString();
    const mx=+(o.match(/max_volume: (-?[\d.]+)/)||[])[1];if(mx>-0.05)clip.push(`${f} ${mx} dB`)}
    ck('Ton','Keine Übersteuerung',clip.length===0?true:'warn',`${clip.length} Dateien bei 0 dB`,'Spitze unter 0 dB',clip.slice(0,4).join(', '))}catch(e){ck('Ton','Keine Übersteuerung','warn','nicht geprüft','ffmpeg',String(e.message).slice(0,80))}
  /* Build */
  execSync('sh build.sh',{cwd:ROOT,stdio:'pipe'});
  const zip=fs.statSync(path.join(ROOT,'dist/krug-und-krone.zip')).size/1048576;
  ck('Technik','Zip-Größe',zip<50?true:'warn',zip.toFixed(1)+' MB','unter 50 MB (itch.io, CrazyGames)');

  const req=new Set(),bad=new Set();
  const srv=http.createServer((q,s)=>{const u=decodeURIComponent(q.url.split('?')[0]),f=path.join(DIST,u==='/'?'index.html':u);req.add(u);
    if(!f.startsWith(DIST)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){bad.add(u);s.writeHead(404);return s.end()}
    s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});s.end(fs.readFileSync(f))}).listen(0);
  const port=srv.address().port,br=await chromium.launch(),ext=new Set(),errs=[];
  fs.mkdirSync(SHOT,{recursive:true});
  const sizes=[[360,640],[390,844],[412,915]];let small=[],over=[],load=[];
  for(const[w,h]of sizes){
    const ctx=await br.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,hasTouch:true,isMobile:true}),p=await ctx.newPage();
    p.on('pageerror',e=>errs.push(`${w}×${h}: ${e.message}`));
    p.on('request',r=>{const u=r.url();if(!u.startsWith(`http://localhost:${port}`)&&!u.startsWith('data:')&&!u.startsWith('blob:'))ext.add(u)});
    const t0=Date.now();await p.goto(`http://localhost:${port}/?qa`,{waitUntil:'load'});load.push(Date.now()-t0);
    await p.waitForTimeout(400);await p.screenshot({path:path.join(SHOT,`titel-${w}.jpg`),quality:70,type:'jpeg'});
    await p.click('[data-x="go"]');
    await p.waitForFunction(()=>G&&G.ui&&G.ui.mode==='bet',null,{timeout:30000});await p.waitForTimeout(300);
    await p.screenshot({path:path.join(SHOT,`tisch-${w}.jpg`),quality:70,type:'jpeg'});
    const m=await p.evaluate(()=>{const W=innerWidth,H=innerHeight,r=[];
      for(const b of document.querySelectorAll('button,[data-x],.card')){const q=b.getBoundingClientRect();if(!q.width||getComputedStyle(b).visibility==='hidden')continue;
        r.push({t:(b.textContent||b.className).trim().slice(0,24),w:q.width,h:q.height,out:q.left<-1||q.right>W+1||q.top<-1||q.bottom>H+1,btn:b.tagName==='BUTTON'})}
      return{r,scroll:document.documentElement.scrollWidth>W+1||document.documentElement.scrollHeight>H+1}});
    small.push(...m.r.filter(x=>x.btn&&Math.min(x.w,x.h)<40).map(x=>`${w}: »${x.t}« ${x.w|0}×${x.h|0}`));
    over.push(...m.r.filter(x=>x.out).map(x=>`${w}: ${x.t}`));if(m.scroll)over.push(`${w}: Seite scrollt`);
    /* Bildrate während Kampfanimation */
    await ctx.close()}
  ck('Layout','Nichts ragt aus dem Bild (Tisch)',over.length===0?true:'warn',`${over.length} Stellen`,'0',over.slice(0,6).join(' · '));
  ck('Layout','Tippflächen mindestens 40 px',small.length===0?true:'warn',`${small.length} zu klein`,'0',[...new Set(small)].slice(0,6).join(' · '));
  ck('Technik','Keine Skriptfehler',errs.length===0,`${errs.length}`,'0',errs.slice(0,3).join(' · '));
  ck('Technik','Alle Dateien im Zip',bad.size===0,`${bad.size} fehlen`,'0',[...bad].slice(0,6).join(', '));
  ck('Technik','Keine fremden Server',ext.size===0,`${ext.size}`,'0',[...ext].slice(0,3).join(', '));
  ck('Technik','Ladezeit lokal',Math.max(...load)<3000?true:'warn',Math.max(...load)+' ms','unter 3 s');
  /* Gewicht der geladenen Dateien beim Start */
  let kb=0;for(const u of req){const f=path.join(DIST,u==='/'?'index.html':u);if(fs.existsSync(f)&&fs.statSync(f).isFile())kb+=fs.statSync(f).size/1024}
  ck('Technik','Startgewicht',kb<8000?true:'warn',(kb/1024).toFixed(1)+' MB','unter 8 MB für Mobilfunk');
  await br.close();srv.close();
  return{checks}}
if(require.main===module)main().then(r=>{fs.writeFileSync(path.join(__dirname,'technik.json'),JSON.stringify(r,null,1));for(const c of r.checks)console.log(c.status.padEnd(4),c.name,'|',c.wert,c.detail?'| '+c.detail:'')}).catch(e=>{console.error(e);process.exit(1)});
module.exports=main;
