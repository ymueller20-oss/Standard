// Frame-steps engine.html over timeline.json and encodes it in parallel chunks.
// usage: node render.js <v2Dir> <out.mp4> [fromSec toSec]
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const [dir, out, fromS, toS] = process.argv.slice(2);
const FPS = 25, WORKERS = 3;
const tl = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
const f0 = Math.round((+fromS || 0) * FPS), f1 = Math.round((toS ? +toS : tl.duration) * FPS);

async function chunk(browser, a, b, file) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'engine.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(([t, fr]) => window.setup(t, fr), [tl, 'file://' + path.join(dir, 'frames')]);
  await page.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
  for (let f = a; f < b; f++) {
    await page.evaluate(t => window.renderFrame(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 250 === 0) console.log(`chunk ${a}: frame ${f - a}/${b - a}`);
  }
  ff.stdin.end(); await done; await page.close();
}

(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const n = f1 - f0, size = Math.ceil(n / WORKERS), parts = [];
  for (let i = 0; i < WORKERS; i++) {
    const a = f0 + i * size, b = Math.min(f1, a + size);
    if (a < b) parts.push({ a, b, file: path.join(dir, `part${i}.mp4`) });
  }
  await Promise.all(parts.map(p => chunk(browser, p.a, p.b, p.file)));
  await browser.close();
  fs.writeFileSync(path.join(dir, 'parts.txt'), parts.map(p => `file '${p.file}'`).join('\n'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'parts.txt'), '-c', 'copy', out]);
  console.log('video', out);
})().catch(e => { console.error(e); process.exit(1); });
