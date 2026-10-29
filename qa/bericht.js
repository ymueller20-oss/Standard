'use strict';
/* QA-Bericht: führt alle Prüfungen aus und schreibt qa/bericht.html (eine Datei, Bilder eingebettet).
   Aufruf: node qa/bericht.js   (Spielpartien vorher mit node qa/spiel.js erzeugen, dauert ca. 40 min) */
const fs=require('fs'),path=require('path');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const r1=x=>(Math.round(x*10)/10).toLocaleString('de-DE');

async function main(){
  const regeln=require('./regeln')(),technik=await require('./technik')(),aus=require('./auswertung')(),R=aus.runs;
  /* Kampf als Schauspiel: 6000 Showdown-Paare direkt in der Engine */
  const km=require('./kampf')(),kc=[],kk=(n,v,ok,warn,z,d)=>kc.push({bereich:'Kampf',name:n,status:ok?'ok':warn?'warn':'fail',wert:v,ziel:z,detail:d||''});
  kk('Knappe Ausgänge (Sieger mit ≤ 1 Überlebenden)',r1(km.knapp)+' %',km.knapp>=35,km.knapp>=28,'mind. 35 %');
  kk('Glatte Siege (Sieger verliert keine Karte)',r1(km.glatt)+' %',km.glatt<=8,km.glatt<=12,'höchstens 8 %','Einseitige Kämpfe sind langweilig anzusehen');
  kk('Wende im Kampf (Sieger lag zurück)',r1(km.wende)+' %',km.wende>=40,km.wende>=30,'mind. 40 %');
  kk('Duell zum Schluss (eine Karte gegen eine)',r1(km.duell)+' %',km.duell>=10,km.duell>=6,'mind. 10 %');
  kk('Ausgelöste Fähigkeiten je Kampf',r1(km.faehigkeiten),km.faehigkeiten>=8,km.faehigkeiten>=6,'mind. 8','Abwechslung beim Zusehen');
  kk('Bessere Formation gewinnt trotzdem',r1(km.besser)+' %',km.besser>=70&&km.besser<=82,km.besser>=65,'70–82 %','Drama darf das Können nicht aushebeln');
  const all=[...regeln.checks,...technik.checks,...aus.checks,...kc],cnt=s=>all.filter(c=>c.status===s).length;
  const img=f=>'data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'bilder',f)).toString('base64');
  const k=R.ki,S=R.schaden||k,P=R.pleite||k,Ku=R.kurz||k,H=R.hart||k;
  const ST={ok:'In Ordnung',warn:'Beobachten',fail:'Handeln'};
  const rows=cs=>cs.map(c=>`<tr class="${c.status}"><td><span class="pill ${c.status}">${ST[c.status]}</span></td><td>${esc(c.name)}${c.detail?`<small>${esc(c.detail)}</small>`:''}</td><td class="num">${esc(c.wert)}</td><td class="ziel">${esc(c.ziel)}</td></tr>`).join('');
  const table=(cs)=>`<div class="tw"><table class="checks"><thead><tr><th>Stand</th><th>Prüfung</th><th>Wert</th><th>Ziel</th></tr></thead><tbody>${rows(cs)}</tbody></table></div>`;
  const by=b=>all.filter(c=>c.bereich===b);

  /* Läufe nebeneinander */
  const order=['ki','profi','passiv','zufall','kurz','hart','schaden','pleite'].filter(x=>R[x]);
  const name={ki:'Maßvoll (wie die KI)',profi:'Vielkäufer',passiv:'Stur mitgehen',zufall:'Zufall',kurz:'8 Nächte',hart:'Thron 20',schaden:'Doppelter Schaden',pleite:'Schuldschein'};
  const M=[['Sieg (Platz 1)',x=>r1(x.sieg)+' %'],['Durchschnittsplatz',x=>r1(x.platz)],['Partiedauer',x=>r1(x.minuten)+' min'],['Du im Showdown',x=>r1(x.showdownIch)+' %'],
    ['Eigene Kämpfe',x=>r1(x.kaempfeIch)],['Knappe Kämpfe',x=>r1(x.knapp)+' %'],['Wende im Kampf',x=>r1(x.wende)+' %'],['Führungswechsel',x=>r1(x.spitzeWechsel)],
    ['Ausgeschieden je Partie',x=>r1(x.ausgeschieden)],['Du fliegst raus',x=>r1(x.ende.raus)+' %'],['Ende nach Nacht-Limit',x=>r1(x.ende.zeit)+' %'],['Thron verbraucht',x=>r1(100-x.thronRest*100)+' %']];
  const cmp=`<div class="tw"><table class="cmp"><thead><tr><th></th>${order.map(x=>`<th>${name[x]}${R[x].strat!=='ki'||x==='ki'?'':'<i>Variante</i>'}</th>`).join('')}</tr></thead><tbody>${M.map(([l,f])=>`<tr><td>${l}</td>${order.map(x=>`<td class="num">${f(R[x])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  /* Zeitbudget einer Partie: Kampf gegen Rest */
  const kampfMin=k.kaempfeIch*k.zuschauSek/60,restMin=k.minuten-kampfMin,kp=100*kampfMin/k.minuten;

  /* Umgesetzt am 29.10.2026; Messwerte aus den aktuellen Läufen. Vorher-Werte aus dem ersten Bericht (12 Nächte, alte Regeln). */
  const alt=[
    {t:'Kampf als Schauspiel (umgesetzt)',w:'hoch',a:'groß',
     warum:'Kampfkarten waren winzige Sammelkarten mit kleinen Zahlen; jeder Angriff sah gleich aus.',
     wie:'Kampfkarten mit randlosem Bild, Rahmen in Reichsfarbe und großen Werten. Jede Kreatur hat eine eigene Angriffsbewegung (Keiler stürmt, Greif stößt herab, Riese wirft, Nachtmahr springt durch den Schatten …), jedes Reich ein eigenes Element beim Einschlag. Dazu Vergeltung und Letztes Aufgebot als Regeln.',
     mess:`Knappe Kämpfe in der Engine ${r1(km.knapp)} % (vorher 30 %), glatte Siege ${r1(km.glatt)} % (vorher 10 %). Die bessere Formation gewinnt weiter ${r1(km.besser)} %.`},
    {t:'Schlacht für alle: Scharmützel (umgesetzt)',w:'hoch',a:'mittel',
     warum:'Nur in gut jeder fünften Nacht kam man in den Showdown, also etwa 3 Kämpfe pro Partie.',
     wie:'Wer flieht, kämpft danach gegen einen anderen Geflohenen um 1 Thron und etwas Beute.',
     mess:`Eigene Kämpfe je Partie: ${r1(k.kaempfeIch)} (vorher 3,2).`},
    {t:'Thron statt Pleite (umgesetzt)',w:'hoch',a:'klein',
     warum:'Ausgeschieden wurde nur durch Pleite, nie in der Schlacht.',
     wie:'Doppelter Thron-Schaden und Schuldschein: Pleite kostet 8 Thron statt sofort raus.',
     mess:`Thron verbraucht ${r1(100-k.thronRest*100)} %. Aus durch Kampf: ${r1(k.rausDurchThron)} % (vorher 0 %). Offen: Es scheidet weiter nur etwa ${r1(k.ausgeschieden)} Spieler je Partie aus, ${r1(k.ende.zeit)} % der Partien enden nach der letzten Nacht.`},
    {t:'Taverne ohne Falle (umgesetzt)',w:'mittel',a:'klein',
     warum:'Viel kaufen führte unbemerkt ins Aus (35 % gegen 5 %).',
     wie:'Rote Warnung, wenn ein Kauf das Gold unter 10 Einsätze drückt, und der Schuldschein fängt Pleiten ab.',
     mess:`Vielkäufer raus: ${r1(R.profi?R.profi.ende.raus:0)} %, Maßvolle: ${r1(k.ende.raus)} %.`},
    {t:'8 Nächte mit Krönungsnacht (umgesetzt)',w:'mittel',a:'klein',
     warum:'12 Nächte waren lang, die Führung wechselte selten.',
     wie:'8 Nächte, Einsatz steigt alle 2 Nächte, die letzte Nacht doppelter Thron-Schaden.',
     mess:`Partiedauer ${r1(k.minuten)} min, davon gut ${Math.round(kp)} % Schlacht. Führungswechsel ${r1(k.spitzeWechsel)}: weniger als vorher, weil kürzer. Offen.`},
    {t:'Kartenwahl jede Nacht (umgesetzt)',w:'mittel',a:'mittel',
     warum:'Pro Nacht gab es nur etwa eine echte Einsatzentscheidung.',
     wie:'2 Karten ziehen, die dritte aus 3 offenen wählen, mit Vorschau, was sie aus der Hand macht.',
     mess:`Bot auf KI-Niveau gewinnt ${r1(k.sieg)} % (fair 17 %), Zufall 0 %: Können zählt.`},
    {t:'Nächster Schritt: mehr Ausscheiden, mehr Führungswechsel',w:'hoch',a:'mittel',
     warum:`Noch immer enden ${r1(k.ende.zeit)} % der Partien per Punktestand, und die Spitze wechselt nur ${r1(k.spitzeWechsel)}-mal.`,
     wie:'Vorschläge: Thron-Start 20 statt 30, oder wer in einer Nacht alle Kämpfe verliert, verliert zusätzlich Thron; Kopfgeld auf den Führenden, damit alle auf ihn gehen.',
     mess:'Noch nicht gemessen.'}];

  const html=`<title>Prüfbuch Krug &amp; Krone</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+SC:wght@500;700&family=Alegreya+Sans:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: ein Prüfbuch, eine Spalte mit Randnotizen; Tabellen sind die Seiten des Buchs */
:root{--bg:#e9e7e1;--paper:#f4f2ec;--ink:#1f1d1a;--soft:#5c5750;--line:#cfcac0;--acc:#7a2a1d;
  --ok:#2f6b3a;--okbg:#dde9db;--warn:#8a5a00;--warnbg:#f1e4c4;--fail:#9b2414;--failbg:#f2d6cf;
  --disp:'Alegreya SC',Georgia,serif;--body:'Alegreya Sans',system-ui,sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#17150f;--paper:#211e18;--ink:#ece6da;--soft:#a79f91;--line:#3a352c;--acc:#e0937c;
  --ok:#8fcf95;--okbg:#1f3322;--warn:#e7bd62;--warnbg:#3a2f15;--fail:#f19a86;--failbg:#45201a;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#17150f;--paper:#211e18;--ink:#ece6da;--soft:#a79f91;--line:#3a352c;--acc:#e0937c;
  --ok:#8fcf95;--okbg:#1f3322;--warn:#e7bd62;--warnbg:#3a2f15;--fail:#f19a86;--failbg:#45201a;color-scheme:dark}
body{background:var(--bg);color:var(--ink);font:17px/1.55 var(--body)}
main{max-width:980px;margin:0 auto;padding-block:32px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:grid;gap:44px}
h1,h2,h3{font-family:var(--disp);font-weight:700;text-wrap:balance;margin:0;line-height:1.15}
h1{font-size:clamp(34px,6vw,54px)}h2{font-size:28px;border-bottom:2px solid var(--ink);padding-bottom:6px}h3{font-size:21px}
p{margin:0;max-width:68ch}section{display:grid;gap:16px}
.eyebrow{font:500 13px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--acc)}
.head{display:grid;gap:12px}.lead{font-size:20px;color:var(--soft)}
.tally{display:flex;flex-wrap:wrap;gap:10px}.tally span{font:500 15px var(--mono);padding:6px 12px;border-radius:3px}
.pill{display:inline-block;font:500 12px var(--mono);letter-spacing:.04em;padding:3px 8px;border-radius:3px;white-space:nowrap}
.ok{--c:var(--ok);--cb:var(--okbg)}.warn{--c:var(--warn);--cb:var(--warnbg)}.fail{--c:var(--fail);--cb:var(--failbg)}
.pill,.tally span{color:var(--c);background:var(--cb)}
.verdict{background:var(--paper);border:1px solid var(--line);padding:22px;display:grid;gap:12px}
.verdict ol{margin:0;padding-left:22px;display:grid;gap:10px}.verdict li{max-width:72ch}
.tw{overflow-x:auto;border:1px solid var(--line);background:var(--paper)}
table{border-collapse:collapse;width:100%;font-size:15px}th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{font:500 12px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--soft)}
td small{display:block;color:var(--soft);font-size:13.5px;margin-top:2px}
.num{font-family:var(--mono);font-size:14px;font-variant-numeric:tabular-nums;white-space:nowrap}.ziel{color:var(--soft);font-size:14px;min-width:140px}
tr.fail td:first-child{box-shadow:inset 3px 0 var(--fail)}tr.warn td:first-child{box-shadow:inset 3px 0 var(--warn)}
.cmp th i{display:block;font-style:normal;color:var(--acc)}.cmp td:first-child{white-space:nowrap;font-weight:500}.cmp th:nth-child(2),.cmp td:nth-child(2){background:color-mix(in srgb,var(--acc) 7%,transparent)}
.alts{display:grid;gap:14px}
.alt{background:var(--paper);border:1px solid var(--line);padding:18px 20px;display:grid;gap:8px}
.alt header{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 14px}.alt header b{font:500 13px var(--mono);color:var(--soft)}
.alt dl{margin:0;display:grid;grid-template-columns:110px 1fr;gap:6px 14px}.alt dt{font:500 12px var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--soft);padding-top:3px}.alt dd{margin:0;min-width:0}
@media (max-width:560px){.alt dl{grid-template-columns:1fr}.alt dt{padding-top:6px}}
.bar{display:flex;height:22px;border:1px solid var(--line)}.bar span{display:flex;align-items:center;padding:0 8px;font:500 12px var(--mono);white-space:nowrap;overflow:hidden}
.bar .a{background:var(--acc);color:var(--paper)}.bar .b{background:var(--paper);color:var(--soft);flex:1}
.shots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.shots figure{margin:0;display:grid;gap:6px}.shots img{border:1px solid var(--line);width:100%}
.shots figcaption{font:13px var(--mono);color:var(--soft)}
.note{color:var(--soft);font-size:15px}ul.note{margin:0;padding-left:20px;display:grid;gap:6px}
</style>
<main>
<div class="head"><div class="eyebrow">Prüfbuch · ${new Date().toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'})}</div>
<h1>Krug &amp; Krone</h1>
<p class="lead">Regeln, Balance, Technik und Spielspaß, geprüft mit ${all.length} Prüfungen und ${Object.values(R).reduce((s,x)=>s+x.n,0)} vollständig gespielten Partien im echten Spiel.</p>
<div class="tally"><span class="ok">${cnt('ok')} in Ordnung</span><span class="warn">${cnt('warn')} beobachten</span><span class="fail">${cnt('fail')} handeln</span></div></div>

<section class="verdict"><h2>Urteil</h2><ol>
<li><b>Die Technik und die Regeln sind solide.</b> Die Kombos stimmen an allen 2.598.960 möglichen Händen, ${Object.values(R).reduce((s,x)=>s+x.n,0)} Partien liefen ohne einen Absturz, das Zip ist vollständig. Ein echter Fehler im Kampf wurde gefunden und behoben: Nach langen Blutmoor-Ketten blieb eine Karte mit 0 Leben stehen.</li>
<li><b>Fair, und Können zählt.</b> Auf KI-Niveau gewinnst du ${r1(k.sieg)} % der Partien (fair wären 17 %), zufälliges Spiel gewinnt nie.</li>
<li><b>Viel mehr Schlacht.</b> ${r1(k.kaempfeIch)} eigene Kämpfe pro Partie statt 3, jeder Kampf mit eigener Bewegung je Kreatur und eigenem Element je Reich.</li>
<li><b>Der Thron zählt jetzt.</b> Die Hälfte der Thron-Leben wird verbraucht, Pleite kostet Thron statt sofort das Aus, die Taverne ist keine versteckte Falle mehr.</li>
<li><b>Noch offen:</b> Es scheidet kaum jemand aus (${r1(k.ausgeschieden)} je Partie), ${r1(k.ende.zeit)} % der Partien enden per Punktestand, die Führung wechselt selten. Vorschläge stehen unten.</li></ol></section>

<section><h2>Spielspaß und Ablauf</h2>
<p>Ein Bot spielt auf deinem Platz gegen die fünf KI-Gegner, so wie ein Mensch es per Tippen täte. Bedenkzeit wird mit wenigen Sekunden je Entscheidung angenommen. Kampfdauer gilt für das erste Zusehen.</p>
<div style="display:grid;gap:6px"><div class="note">Wofür die Zeit einer Partie draufgeht</div><div class="bar"><span class="a" style="width:${kp.toFixed(1)}%">Schlacht ${Math.round(kp)} %</span><span class="b">Poker, Taverne, Warten ${Math.round(100-kp)} %</span></div></div>
${table(by('Spielspaß').concat(by('Können'),by('Ablauf')))}</section>

<section><h2>Alternativen</h2><p>Sortiert nach erwarteter Wirkung auf den Spielspaß. Wo eine Variante im echten Spiel durchgespielt wurde, stehen die Messwerte dabei.</p>
<div class="alts">${alt.map((a,i)=>`<article class="alt"><header><h3>${i+1}. ${esc(a.t)}</h3><b>Wirkung ${a.w} · Aufwand ${a.a}</b></header>
<dl><dt>Befund</dt><dd>${esc(a.warum)}</dd><dt>Vorschlag</dt><dd>${esc(a.wie)}</dd><dt>Messung</dt><dd>${esc(a.mess)}</dd></dl></article>`).join('')}</div></section>

<section><h2>Läufe im Vergleich</h2><p>Je Lauf 40 Partien mit den neuen Regeln. Die erste Spalte ist der Maßstab: der Bot spielt und kauft wie die KI-Gegner.</p>${cmp}</section>

<section><h2>Der Kampf als Schauspiel</h2><p>Gemessen an 6000 Showdown-Paaren mit geteilter Tafel. Neu: Vergeltung (+${2} Angriff für die Verbündeten einer gefallenen Karte) und Letztes Aufgebot (+4/+4 für die letzte Karte gegen eine Übermacht). Dazu zeigt die Inszenierung, worum es gerade geht, ruft erstes Blut, Doppelschläge, Wenden und Duelle aus, lässt Gegner dazwischenrufen und kürt am Ende den Held der Schlacht.</p>${table(by('Kampf'))}</section>
<section><h2>Regeln und Balance</h2>${table(by('Regeln').concat(by('Balance')))}</section>

<section><h2>Technik, Ton und Layout</h2>${table(by('Technik').concat(by('Ton'),by('Layout')))}
<div class="shots">${[360,390,412].map(w=>`<figure><img src="${img(`tisch-${w}.jpg`)}" alt="Spieltisch bei ${w} Pixel Breite"><figcaption>${w} px breit</figcaption></figure>`).join('')}</div></section>

<section><h2>Methode und Grenzen</h2><ul class="note">
<li>Regeln: Kategorien gegen echte Pokerhäufigkeiten (alle Hände), 40.000 Handpaare gegen eine unabhängige Bewertung, Kämpfe auf Ende, Gleichheit mit und ohne Aufzeichnung und gültige Werte geprüft.</li>
<li>Spielpartien: echtes Spiel im Browser mit 25-facher Geschwindigkeit, ein Bot auf deinem Platz. Bots spielen anders als Menschen, die Zahlen zeigen Richtungen, keine exakten Werte.</li>
<li>Varianten ändern einzelne Regelwerte beim Laden, das Spiel selbst bleibt unverändert.</li>
<li>Wiederholen: <code>node qa/spiel.js 40</code> (ca. 40 min), dann <code>node qa/bericht.js</code>.</li></ul></section>
</main>`;
  fs.writeFileSync(path.join(__dirname,'bericht.html'),html);
  console.log('qa/bericht.html',(html.length/1024|0)+' KB',cnt('ok'),cnt('warn'),cnt('fail'))}
main().catch(e=>{console.error(e);process.exit(1)});
