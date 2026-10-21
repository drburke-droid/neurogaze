// Records the BVD video (video.html, from video-script.js) frame by frame to a silent MP4, and writes its
// captions (.srt), YouTube chapters (.chapters.txt) and timing (.timeline.json, for the audio) next to it.
//
// Serve the repository locally, then for example:
//   node tools/record-video.mjs --url http://localhost:8080/video.html --mode voice --voice build/vo/voice.json --out build/bvd-voice.mp4
//   node tools/record-video.mjs --url ... --mode text --out build/bvd-text.mp4      (narration on screen, no voice)
//   node tools/record-video.mjs --url ... --out hook.mp4 --from 0 --to 4             (shots 0 to 3 only)
//   node tools/record-video.mjs --url ... --out short.mp4 --format 9x16
// --voice is the measurements file from tools/voiceover.py; without it the voice timing is estimated.
// Needs Playwright with Chromium (set PLAYWRIGHT_MODULE to its path if it isn't installed here; set
// CHROMIUM to a Chromium binary, and SWIFTSHADER=1 on machines without a GPU) and ffmpeg.
//
// How it works: once the page is ready, its clock stops following real time. For each frame the recorder
// moves the clock on exactly 1/30 of a second, runs the page's animation callbacks and timers, sets every
// CSS transition to the same moment, and takes a screenshot. So every frame is evenly spaced, however long
// the drawing takes.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { LEAD, timeline } from '../video-script.js';

const arg = (name, d) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg('url', 'http://localhost:8080/video.html');
const OUT = resolve(arg('out', 'bvd-video.mp4'));
const FORMAT = arg('format', '16x9');
const MODE = arg('mode', 'voice');
const VOICE = arg('voice', null) ? JSON.parse(readFileSync(arg('voice'), 'utf8')).shots : null;
const FPS = 30;
const { shots } = timeline({ mode: MODE, voice: VOICE });
const FROM = Number(arg('from', 0)), TO = Number(arg('to', shots.length));
const vertical = FORMAT === '9x16';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: ['--ignore-gpu-blocklist', ...(process.env.SWIFTSHADER ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])],
});
const page = await browser.newPage({ viewport: vertical ? { width: 720, height: 1280 } : { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
page.on('pageerror', (e) => console.error('Page error:', e.message));

// The page's clock: real time while it loads, then moved on only by __clock.tick(ms)
await page.addInitScript((opts) => {
  window.__REC = true;
  window.__VIDEO_OPTS = opts;
  const realNow = performance.now.bind(performance), realDate = Date.now.bind(Date);
  const realRaf = window.requestAnimationFrame.bind(window), realCancelRaf = window.cancelAnimationFrame.bind(window);
  const realTimeout = window.setTimeout.bind(window), realClearTimeout = window.clearTimeout.bind(window);
  const realInterval = window.setInterval.bind(window), realClearInterval = window.clearInterval.bind(window);
  let manual = false, now = 0, dateAt = 0, nextId = 1e9;
  let frames = new Map();   // animation frame callbacks waiting for the next tick
  const timers = new Map(); // id → { due, f, args, every }
  const started = new Map(); // CSS animation → the clock time it started

  performance.now = () => (manual ? now : realNow());
  Date.now = () => (manual ? dateAt + now : realDate());
  window.requestAnimationFrame = (cb) => { if (!manual) return realRaf(() => cb(performance.now())); const id = nextId++; frames.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => (frames.delete(id) || realCancelRaf(id));
  const later = (every) => (f, ms = 0, ...args) => {
    if (!manual) return (every ? realInterval : realTimeout)(f, ms, ...args);
    const id = nextId++;
    timers.set(id, { due: now + Math.max(every ? 1 : 0, ms), f, args, every: every ? Math.max(1, ms) : 0 });
    return id;
  };
  window.setTimeout = later(false);
  window.setInterval = later(true);
  window.clearTimeout = (id) => (timers.delete(id) || realClearTimeout(id));
  window.clearInterval = (id) => (timers.delete(id) || realClearInterval(id));

  // Hold every CSS transition and animation at the clock's time
  const holdAnimations = () => {
    for (const a of document.getAnimations()) {
      if (!started.has(a)) { started.set(a, now - (a.currentTime || 0)); a.pause(); }
      const t = now - started.get(a), end = a.effect.getComputedTiming().endTime;
      if (t >= end && end !== Infinity) { a.finish(); started.delete(a); } else a.currentTime = t;
    }
  };

  window.__clock = {
    manual() { now = realNow(); dateAt = realDate() - now; manual = true; holdAnimations(); },
    tick(ms) {
      now += ms;
      for (;;) { // timers due by now, in order
        let next = null;
        for (const [id, x] of timers) if (x.due <= now && (!next || x.due < next[1].due)) next = [id, x];
        if (!next) break;
        const [id, x] = next;
        if (x.every) x.due += x.every; else timers.delete(id);
        x.f(...x.args);
      }
      const due = frames;
      frames = new Map();
      // Run the frame callbacks inside a real frame, so the browser paints what they drew
      return new Promise((done) => realRaf(() => { for (const cb of due.values()) cb(now); holdAnimations(); done(); }));
    },
  };
}, { mode: MODE, voice: VOICE });

await page.goto(`${URL_}?format=${FORMAT}&from=${FROM}&to=${TO}`);
await page.waitForFunction(() => window.__video?.ready, null, { timeout: 180000 });
const { start_s: START, end_s: END } = await page.evaluate(() => window.__video);
const cdp = await page.context().newCDPSession(page);

// One frame at a time: move the clock on, then take the picture
const dir = `${OUT}.frames`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
await page.evaluate(() => { window.__clock.manual(); window.__video.start(); });
const frames = Math.round((END - START) * FPS), began = Date.now();
for (let k = 0; k < frames; k++) {
  await page.evaluate((ms) => window.__clock.tick(ms), k === 0 ? 0 : 1000 / FPS);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
  writeFileSync(join(dir, `${String(k).padStart(6, '0')}.jpg`), Buffer.from(data, 'base64'));
  if (k % 60 === 0) process.stdout.write(`\r${(k / FPS).toFixed(0)} / ${(frames / FPS).toFixed(0)} s of video, ${((Date.now() - began) / 60000).toFixed(1)} min`);
}
await browser.close();
console.log(`\nCaptured ${frames} frames`);
const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, '%06d.jpg'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
if (ff.status !== 0) process.exit(ff.status || 1);
rmSync(dir, { recursive: true, force: true });

// Captions (one per sentence, timed by the voice or the reading pace), chapters, and the timing for the audio
const part = shots.slice(FROM, TO);
const stamp = (t, sep) => { const ms = Math.round(t * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`; };
const cues = part.flatMap((s) => s.parts.map((p) => [s.start - START + p.start, s.start - START + Math.max(p.end, p.start + 1.2), p.text]));
cues.forEach((c, i) => { if (cues[i + 1]) c[1] = Math.min(c[1], cues[i + 1][0] - 0.05); }); // each caption off before the next
writeFileSync(OUT.replace(/\.mp4$/, '.srt'), cues.map(([a, b, x], i) => `${i + 1}\n${stamp(a, ',')} --> ${stamp(b, ',')}\n${x}\n`).join('\n'));
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
writeFileSync(OUT.replace(/\.mp4$/, '.chapters.txt'), part.filter((s) => s.ch).map((s) => `${mmss(s.start - START)} ${s.ch}`).join('\n') + '\n');
let mood = 'hook';
const moods = shots.map((s) => (mood = s.mood || mood)); // each shot's music, carried on from the last shot that set it
writeFileSync(OUT.replace(/\.mp4$/, '.timeline.json'), JSON.stringify({
  mode: MODE, length: END - START,
  shots: part.map((s) => ({ i: s.i, start: s.start - START, secs: s.secs, voice: s.start - START + LEAD, mood: moods[s.i], ch: s.ch || null })),
}, null, 1));
console.log(`Saved ${OUT}, with captions, chapters and timing`);
