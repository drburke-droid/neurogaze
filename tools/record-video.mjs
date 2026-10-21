// Records the BVD video (video.html, from video-script.js) frame by frame to an MP4, and writes its
// captions (.srt) and YouTube chapters (.chapters.txt) next to it.
//
// Serve the repository locally, then for example:
//   node tools/record-video.mjs --url http://localhost:8080/video.html --out bvd-video.mp4
//   node tools/record-video.mjs --url ... --out hook.mp4 --from 0 --to 4        (shots 0 to 3 only)
//   node tools/record-video.mjs --url ... --out short.mp4 --format 9x16
// Options: --rate (default 0.08) slows the page down while recording; lower it if the video stutters.
// Needs Playwright with Chromium (set PLAYWRIGHT_MODULE to its path if it isn't installed here; set
// CHROMIUM to a Chromium binary, and SWIFTSHADER=1 on machines without a GPU) and ffmpeg.
//
// How it works: the page's clock (and its CSS animations) run at `rate` times real time, so every
// screenshot can be stamped with the page's own time. Afterwards an even 30 frames a second are picked
// from the screenshots and encoded with ffmpeg.
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { timeline } from '../video-script.js';

const arg = (name, d) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg('url', 'http://localhost:8080/video.html');
const OUT = resolve(arg('out', 'bvd-video.mp4'));
const FORMAT = arg('format', '16x9');
const RATE = Number(arg('rate', 0.08));
const FPS = 30;
const { shots } = timeline();
const FROM = Number(arg('from', 0)), TO = Number(arg('to', shots.length));
const vertical = FORMAT === '9x16';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ['--ignore-gpu-blocklist', ...(process.env.SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])],
});
const page = await browser.newPage({ viewport: vertical ? { width: 720, height: 1280 } : { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
page.on('pageerror', (e) => console.error('Page error:', e.message));

// Slow the page's clock down to RATE × real time
await page.addInitScript((rate) => {
  window.__REC = true;
  const realNow = performance.now.bind(performance), start = realNow();
  const now = () => start + (realNow() - start) * rate;
  performance.now = now;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf(() => cb(now()));
  const timeout = window.setTimeout.bind(window), interval = window.setInterval.bind(window);
  window.setTimeout = (f, ms = 0, ...a) => timeout(f, ms / rate, ...a);
  window.setInterval = (f, ms = 0, ...a) => interval(f, ms / rate, ...a);
}, RATE);

await page.goto(`${URL_}?format=${FORMAT}&from=${FROM}&to=${TO}`);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Animation.enable');
await cdp.send('Animation.setPlaybackRate', { playbackRate: RATE }); // CSS transitions and animations too
await page.waitForFunction(() => window.__video?.ready, null, { timeout: 180000 });
await page.waitForTimeout(1500);

// Capture until the video ends, stamping each screenshot with the page's time
const dir = `${OUT}.frames`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(join(dir, 'seq'), { recursive: true });
const shotsTaken = [];
const { start_s: START, end_s: END } = await page.evaluate(() => window.__video);
await page.evaluate(() => window.__video.start());
const began = Date.now();
for (let n = 0; ; n++) {
  const a = await page.evaluate(() => window.__video.time);
  const file = join(dir, `c${String(n).padStart(6, '0')}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
  const { time: b, done } = await page.evaluate(() => ({ time: window.__video.time, done: window.__video.done }));
  shotsTaken.push({ file, t: (a + b) / 2 });
  if (n % 50 === 0) process.stdout.write(`\r${(a - START).toFixed(1)} / ${(END - START).toFixed(1)} s of video, ${((Date.now() - began) / 60000).toFixed(1)} min`);
  if (done) break;
}
await browser.close();
console.log(`\nCaptured ${shotsTaken.length} screenshots`);

// An even 30 frames a second: for each, the screenshot taken closest to its time
const frames = Math.round((END - START) * FPS);
let j = 0;
for (let k = 0; k < frames; k++) {
  const t = START + k / FPS;
  while (j < shotsTaken.length - 1 && Math.abs(shotsTaken[j + 1].t - t) <= Math.abs(shotsTaken[j].t - t)) j++;
  symlinkSync(resolve(shotsTaken[j].file), join(dir, 'seq', `${String(k).padStart(6, '0')}.jpg`));
}
const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, 'seq', '%06d.jpg'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
if (ff.status !== 0) process.exit(ff.status || 1);
rmSync(dir, { recursive: true, force: true });

// Captions (one per sentence, timed by words) and chapters, from the script
const stamp = (t, sep) => { const ms = Math.round(t * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`; };
const cues = [];
for (const s of shots.slice(FROM, TO)) {
  const sentences = s.vo.match(/[^.?!]+[.?!]+["”']?/g) || [s.vo];
  const words = sentences.map((x) => x.trim().split(/\s+/).length), sum = words.reduce((p, c) => p + c, 0);
  let t = s.start - START;
  const speak = Math.min(s.secs - 0.4, sum / 2.5);
  sentences.forEach((x, i) => { const d = (speak * words[i]) / sum; cues.push([t, t + d, x.trim()]); t += d; });
}
writeFileSync(OUT.replace(/\.mp4$/, '.srt'), cues.map(([a, b, x], i) => `${i + 1}\n${stamp(a, ',')} --> ${stamp(b, ',')}\n${x}\n`).join('\n'));
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
writeFileSync(OUT.replace(/\.mp4$/, '.chapters.txt'), shots.slice(FROM, TO).filter((s) => s.ch).map((s) => `${mmss(s.start - START)} ${s.ch}`).join('\n') + '\n');
console.log(`Saved ${OUT}, with captions and chapters`);
