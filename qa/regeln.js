/* QM · Regeln und Balance. Prüft die Kampf-Engine ohne Browser.
   Liefert eine Liste von Prüfungen {bereich,name,status,wert,ziel,detail}. status: ok | warn | fail */
const path = require('path');
const E = require(path.join(__dirname, '..', 'engine.js'));

let seed = 20261029;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a };
const C = (r, s) => ({ r, s, id: r + '-' + s });
const pc = x => Math.round(100 * x) + ' %';
const NM = {6: 'Ghul', 7: 'Greif', 8: 'Troll', 9: 'Lindwurm', 10: 'Riese', 11: 'Mantikor', 12: 'Nachtmahr', 13: 'Wyvern', 14: 'Drache'};
const CAT = ['Einzelgänger', 'Paar', 'Zwei Paare', 'Rudel', 'Jagdkette', 'Banner', 'Horde', 'Plage', 'Kriegszug', 'Drachenkrone'];

/* Unabhängige Pokerbewertung als Vergleich für eval5 */
function refCat(cs) {
  const rs = cs.map(c => c.r).sort((a, b) => b - a), cnt = {};
  rs.forEach(r => cnt[r] = (cnt[r] || 0) + 1);
  const n = Object.values(cnt).sort((a, b) => b - a);
  const flush = cs.every(c => c.s === cs[0].s);
  const u = [...new Set(rs)];
  let high = 0;
  if (u.length === 5) { if (u[0] - u[4] === 4) high = u[0]; else if (u.join() === '14,5,4,3,2') high = 5 }
  if (high && flush) return high === 14 ? 9 : 8;
  if (n[0] === 4) return 7;
  if (n[0] === 3 && n[1] === 2) return 6;
  if (flush) return 5;
  if (high) return 4;
  if (n[0] === 3) return 3;
  if (n[0] === 2 && n[1] === 2) return 2;
  if (n[0] === 2) return 1;
  return 0;
}

module.exports = function regeln() {
  const out = [];
  const add = (bereich, name, status, wert, ziel, detail) => out.push({ bereich, name, status, wert, ziel, detail: detail || '' });

  /* 1. Pokerkombos: Beispielhände */
  const cases = [
    ['Einzelgänger', [C(14, 0), C(11, 1), C(8, 2), C(5, 3), C(3, 0)], 0],
    ['Paar', [C(9, 0), C(9, 1), C(2, 2), C(5, 3), C(13, 0)], 1],
    ['Zwei Paare', [C(9, 0), C(9, 1), C(4, 2), C(4, 3), C(13, 0)], 2],
    ['Rudel', [C(7, 0), C(7, 1), C(7, 2), C(4, 3), C(13, 0)], 3],
    ['Jagdkette', [C(6, 0), C(7, 1), C(8, 2), C(9, 3), C(10, 0)], 4],
    ['Jagdkette mit Drache unten (A-2-3-4-5)', [C(14, 0), C(2, 1), C(3, 2), C(4, 3), C(5, 0)], 4],
    ['Banner', [C(2, 1), C(7, 1), C(9, 1), C(11, 1), C(13, 1)], 5],
    ['Horde', [C(12, 0), C(12, 1), C(12, 2), C(3, 3), C(3, 0)], 6],
    ['Plage', [C(7, 0), C(7, 1), C(7, 2), C(7, 3), C(2, 0)], 7],
    ['Kriegszug', [C(5, 2), C(6, 2), C(7, 2), C(8, 2), C(9, 2)], 8],
    ['Kriegszug A-2-3-4-5', [C(14, 3), C(2, 3), C(3, 3), C(4, 3), C(5, 3)], 8],
    ['Drachenkrone', [C(10, 0), C(11, 0), C(12, 0), C(13, 0), C(14, 0)], 9]];
  const bad = cases.filter(([, cs, cat]) => E.eval5(cs).cat !== cat).map(([n, cs]) => `${n} ergibt ${CAT[E.eval5(cs).cat]}`);
  add('Regeln', 'Kombos an Beispielhänden', bad.length ? 'fail' : 'ok', `${cases.length - bad.length}/${cases.length}`, 'alle richtig', bad.join('; '));

  /* 2. Alle 2.598.960 möglichen 5er-Hände zählen und mit den bekannten Poker-Häufigkeiten vergleichen */
  const want = [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 36, 4], got = Array(10).fill(0);
  const F = E.FULL, n = F.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++)
    got[E.eval5([F[a], F[b], F[c], F[d], F[e]]).cat]++;
  const diff = got.map((g, i) => g !== want[i] ? `${CAT[i]} ${g} statt ${want[i]}` : '').filter(Boolean);
  add('Regeln', 'Häufigkeit aller 2,6 Mio. Hände', diff.length ? 'fail' : 'ok', diff.length ? `${diff.length} falsch` : 'exakt', 'wie echtes Poker', diff.join('; '));

  /* 3. Rangfolge: höhere Kombo hat immer die höhere Wertung, gleiche Kombo wie die Vergleichsbewertung */
  let order = 0, mism = 0;
  for (let t = 0; t < 40000; t++) {
    const d = shuffle(F.slice()), x = d.slice(0, 5), y = d.slice(5, 10), ex = E.eval5(x), ey = E.eval5(y);
    if (ex.cat !== refCat(x) || ey.cat !== refCat(y)) mism++;
    if (ex.cat !== ey.cat && (ex.cat > ey.cat) !== (ex.score > ey.score)) order++;
  }
  add('Regeln', 'Rangfolge der Kombos (40.000 Paare)', order || mism ? 'fail' : 'ok', `${order + mism} Fehler`, '0', mism ? `${mism} Hände anders bewertet als die Vergleichsbewertung` : '');

  /* 4. Teamwahl: 5 verschiedene Karten aus den eigenen 7 */
  let teamBad = 0;
  for (let t = 0; t < 3000; t++) {
    const seven = shuffle(F.slice()).slice(0, 7), T = E.pickTeam(seven, { rank: {}, realm: {} });
    const ids = T.team.map(f => f.c.id);
    if (ids.length !== 5 || new Set(ids).size !== 5 || !ids.every(id => seven.some(c => c.id === id))) teamBad++;
  }
  add('Regeln', 'Aufstellung nutzt nur eigene Karten', teamBad ? 'fail' : 'ok', `${teamBad} Fehler`, '0', '3.000 zufällige Blätter');

  /* 5. Kampf: Ende, Werte, Wiederholbarkeit, Remis-Regel */
  const up = { rank: {}, realm: {} };
  let nan = 0, rounds = 0, det = 0, wrongDraw = 0, recDiff = 0, snapBad = 0, maxR = 0;
  for (let t = 0; t < 4000; t++) {
    const d = shuffle(F.slice()), bd = d.slice(0, 5);
    const A = E.pickTeam(d.slice(5, 7).concat(bd), up), B = E.pickTeam(d.slice(7, 9).concat(bd), up);
    const r = E.battle(A.team, B.team, false), r2 = E.battle(A.team, B.team, false), rr = E.battle(A.team, B.team, true);
    if (![-1, 0, 1].includes(r.w) || !(r.rounds >= 1 && r.rounds <= 8)) nan++;
    maxR = Math.max(maxR, r.rounds); rounds += r.rounds;
    if (r.w !== r2.w || r.rounds !== r2.rounds) det++;
    if (rr.w !== r.w || rr.rounds !== r.rounds) recDiff++;
    for (const s of rr.snaps) for (const side of s.st) for (const f of side)
      if (!Number.isFinite(f.atk) || !Number.isFinite(f.hp) || f.hp < 0 || (f.alive && f.hp <= 0 && !f.sh)) snapBad++;
    if (r.w === -1 && A.b.score !== B.b.score) {
      /* Remis nur, wenn beide Formationen gleich sind oder nach 8 Runden beide gleich viel Leben haben */
      const last = rr.snaps[rr.snaps.length - 1];
      const hp = last ? last.st.map(side => side.filter(f => f.alive).reduce((x, f) => x + f.hp, 0)) : [0, 0];
      if (!(hp[0] > 0 && hp[0] === hp[1])) wrongDraw++;
    }
  }
  add('Regeln', 'Kämpfe enden sauber (4.000 Kämpfe)', nan ? 'fail' : 'ok', `${nan} Fehler`, '0', `längster Kampf ${maxR} Runden, Grenze 8`);
  add('Regeln', 'Gleicher Kampf, gleiches Ergebnis', det || recDiff ? 'fail' : 'ok', `${det + recDiff} Abweichungen`, '0', 'mit und ohne Aufzeichnung für die Darstellung');
  add('Regeln', 'Keine kaputten Werte im Kampfverlauf', snapBad ? 'fail' : 'ok', `${snapBad} Fehler`, '0', 'Angriff und Leben immer Zahlen, Leben nie unter 0');
  add('Regeln', 'Gegenseitige Auslöschung: bessere Formation gewinnt', wrongDraw ? 'fail' : 'ok', `${wrongDraw} Fehler`, '0');

  /* 6. Balance am Tisch (wie sim/balance.js) */
  let hw = 0, hn = 0, draw = 0, flip = 0, losses = 0, r1 = 0; const realm = [[0, 0], [0, 0], [0, 0], [0, 0]], card = {};
  const N = 3000; rounds = 0;
  for (let t = 0; t < N; t++) {
    const d = shuffle(F.slice()), bd = d.slice(0, 5);
    const A = E.pickTeam(d.slice(5, 7).concat(bd), up), B = E.pickTeam(d.slice(7, 9).concat(bd), up), r = E.battle(A.team, B.team, false);
    rounds += r.rounds; if (r.rounds <= 1) r1++; if (r.w < 0) draw++;
    if (A.b.cat !== B.b.cat && r.w >= 0) { hn++; if ((A.b.cat > B.b.cat) === (r.w === 0)) hw++ }
    if (r.w === 1) {
      losses++; const f = A.team.map(x => x.c); let ok = false;
      for (let i = 0; i < 5 && !ok; i++) for (let j = i + 1; j < 5 && !ok; j++) { const o = f.slice();[o[i], o[j]] = [o[j], o[i]]; ok = E.battle(E.mkTeam(o, up, true).team, B.team, false).w === 0 }
      if (ok) flip++;
    }
    if (A.b.cat !== B.b.cat || r.w < 0) continue;
    for (const [T, won] of [[A, r.w === 0], [B, r.w === 1]]) {
      const cnt = [0, 0, 0, 0]; T.team.forEach(f => cnt[f.s]++); cnt.forEach((c, i) => { if (c >= 3) { realm[i][0]++; if (won) realm[i][1]++ } });
      T.team.forEach(f => { const k = f.sup || NM[f.r]; (card[k] = card[k] || [0, 0])[0]++; if (won) card[k][1]++ });
    }
  }
  const range = (v, lo, hi) => v >= lo && v <= hi ? 'ok' : 'warn';
  const better = hw / hn;
  add('Balance', 'Bessere Kombo gewinnt', range(better, .70, .82), pc(better), '70–82 % (Ziel etwa 75 %)', `${N} Kämpfe am Tisch`);
  const avgR = rounds / N;
  add('Balance', 'Rundenzahl im Schnitt', range(avgR, 3, 4), avgR.toFixed(2), '3–4 Runden', `nach Runde 1 entschieden: ${pc(r1 / N)}`);
  add('Balance', 'Remis', draw / N <= .03 ? 'ok' : 'warn', pc(draw / N), 'höchstens 3 %');
  add('Balance', 'Reihenfolge dreht Niederlagen', range(flip / losses, .15, .45), pc(flip / losses), '15–45 %', `Anteil der Niederlagen, die ein einziger Tausch in der Schlachtreihe in einen Sieg dreht (${pc(flip / N)} aller Kämpfe)`);
  /* Reiche brauchen mehr Kämpfe, Blutmoor-Teams sind selten */
  for (let t = 0; t < 15000; t++) {
    const d = shuffle(F.slice()), bd = d.slice(0, 5);
    const A = E.pickTeam(d.slice(5, 7).concat(bd), up), B = E.pickTeam(d.slice(7, 9).concat(bd), up);
    if (A.b.cat !== B.b.cat) continue;
    const r = E.battle(A.team, B.team, false); if (r.w < 0) continue;
    for (const [T, won] of [[A, r.w === 0], [B, r.w === 1]]) { const cnt = [0, 0, 0, 0]; T.team.forEach(f => cnt[f.s]++); cnt.forEach((c, i) => { if (c >= 3) { realm[i][0]++; if (won) realm[i][1]++ } }) }
  }
  const RN = ['Sonnenwacht', 'Aschelande', 'Nordmark', 'Blutmoor'];
  realm.forEach(([nn, w], i) => add('Balance', `Reich ${RN[i]} (3+ Karten, gleiche Kombo)`, range(w / nn, .55, .63), pc(w / nn), '55–63 %', `${nn} Teams`));
  const cards = Object.entries(card).filter(([, v]) => v[0] >= 40).map(([k, v]) => [k, v[1] / v[0]]).sort((a, b) => b[1] - a[1]);
  const outl = cards.filter(([, q]) => q < .4 || q > .6);
  add('Balance', 'Einzelne Karten (gleiche Kombo)', outl.length ? 'warn' : 'ok', `${pc(cards[cards.length - 1][1])} bis ${pc(cards[0][1])}`, 'jede Karte 40–60 %',
    outl.length ? 'außerhalb: ' + outl.map(([k, q]) => `${k} ${pc(q)}`).join(', ') : `stärkste: ${cards[0][0]}, schwächste: ${cards[cards.length - 1][0]}`);

  /* 7. Siegquote je Kombo gegen zufällige Gegner (wie sim/kombos.js) */
  function teamOfCat(c) { for (let k = 0; k < 20000; k++) { const t = E.pickTeam(shuffle(F.slice()).slice(0, 7), up); if (t.b.cat === c) return t } return null }
  const build = {
    7: () => { const r = 2 + Math.floor(rnd() * 13); const four = [0, 1, 2, 3].map(x => C(r, x)); return E.mkTeam(four.concat(shuffle(F.filter(c => c.r !== r))[0]), up) },
    8: () => { const s0 = Math.floor(rnd() * 4), top = 6 + Math.floor(rnd() * 8); return E.mkTeam([0, 1, 2, 3, 4].map(k => C(top - k, s0)), up) }
  };
  const targets = { 3: [.75, 'Rudel (Drilling)'], 4: [.85, 'Jagdkette (Straße)'], 6: [.9, 'Horde (Full House)'], 7: [.95, 'Plage (Vierling)'], 8: [.95, 'Kriegszug (Straight Flush)'] };
  const combo = {};
  for (let c = 1; c <= 8; c++) {
    let w = 0, nn = 0;
    for (let t = 0; t < 500; t++) { const A = build[c] ? build[c]() : teamOfCat(c); const B = E.pickTeam(shuffle(F.slice()).slice(0, 7), up); const r = E.battle(A.team, B.team, false); if (r.w >= 0) { nn++; if (r.w === 0) w++ } }
    combo[c] = w / nn;
    if (targets[c]) add('Balance', `${targets[c][1]} gewinnt`, combo[c] >= targets[c][0] ? 'ok' : 'warn', pc(combo[c]), `mindestens ${pc(targets[c][0])}`, '500 Kämpfe gegen zufällige Gegner');
  }
  /* Kleiner Vierling: der Nutzer hat ausdrücklich verlangt, dass auch ein Vierling aus kleinen Karten gewinnt */
  let sw = 0, sn = 0;
  for (let t = 0; t < 600; t++) {
    const r = 2 + Math.floor(rnd() * 6), A = E.mkTeam([0, 1, 2, 3].map(x => C(r, x)).concat(shuffle(F.filter(c => c.r !== r))[0]), up);
    const res = E.battle(A.team, E.pickTeam(shuffle(F.filter(c => c.r !== r)).slice(0, 7), up).team, false);
    if (res.w >= 0) { sn++; if (res.w === 0) sw++ }
  }
  add('Balance', 'Plage aus kleinen Karten (2 bis 7)', sw / sn >= .95 ? 'ok' : 'warn', pc(sw / sn), 'mindestens 95 %', 'Wunsch des Spielers: ein Vierling muss sich immer lohnen');

  return { checks: out, combo };
};
