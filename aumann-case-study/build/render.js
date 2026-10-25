// Renders the graphics scenes of script.json to silent MP4s (and the clip
// side panels to transparent PNG sequences) by stepping graphics.html frame by frame.
// Usage: node render.js <script.json> <voDir> <outDir> [sceneId ...]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const [scriptPath, voDir, outDir, ...only] = process.argv.slice(2);
const FPS = 25;
const PANEL_SECONDS = 1.6;
const page_url = 'file://' + path.join(__dirname, 'graphics.html');
const scenes = JSON.parse(fs.readFileSync(scriptPath, 'utf8')).scenes
  .filter(s => !only.length || only.includes(s.id));
fs.mkdirSync(outDir, { recursive: true });

function ffmpegSink(args) {
  const p = spawn('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
  return { stdin: p.stdin, done };
}

async function renderScene(browser, s) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(page_url);
  await page.evaluate(() => document.fonts.ready);
  let job;
  if (s.type === 'clip') {
    const panel = { visual: { kind: 'panel', kicker: s.kicker, headline: s.headline, source: s.source } };
    await page.evaluate(([sc]) => window.setup(sc, null, { panel: true }), [panel]);
    const dir = path.join(outDir, s.id + '_panel');
    fs.mkdirSync(dir, { recursive: true });
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
    const n = Math.round(PANEL_SECONDS * FPS);
    for (let f = 0; f < n; f++) {
      await page.evaluate(t => window.render(t), f / FPS);
      await page.screenshot({ path: path.join(dir, String(f).padStart(4, '0') + '.png'), omitBackground: true });
    }
  } else {
    const timing = s.type === 'vo' ? JSON.parse(fs.readFileSync(path.join(voDir, s.id + '.timing.json'), 'utf8')) : null;
    const scene = s.type === 'end' ? { duration: s.duration, visual: { kind: 'end', title: s.title, sources: s.sources } } : s;
    const dur = await page.evaluate(([sc, tm]) => window.setup(sc, tm), [scene, timing]);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
    const out = path.join(outDir, s.id + '.mp4');
    const sink = ffmpegSink(['-f', 'image2pipe', '-c:v', 'mjpeg', '-r', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), out]);
    const n = Math.ceil(dur * FPS);
    for (let f = 0; f < n; f++) {
      await page.evaluate(t => window.render(t), f / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!sink.stdin.write(buf)) await new Promise(r => sink.stdin.once('drain', r));
    }
    sink.stdin.end();
    await sink.done;
  }
  await page.close();
  console.log('rendered', s.id);
}

(async () => {
  const browser = await chromium.launch();
  const queue = [...scenes];
  const worker = async () => { while (queue.length) await renderScene(browser, queue.shift()); };
  await Promise.all([worker(), worker(), worker()]);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
