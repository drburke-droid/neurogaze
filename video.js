// The BVD video: plays the shot list (video-script.js) over the story, on a timeline.
// Open video.html and press Play to watch it in real time; tools/record-video.mjs records it frame by frame.
// ?mode=text shows the full narration on screen (the version without a voice); ?format=9x16 for vertical;
// ?from=N&to=M plays shots N to M-1 only. The recorder passes the voice timings in window.__VIDEO_OPTS.
// Created by Dr Robert Burke
import { timeline } from './video-script.js';

const $ = (id) => document.getElementById(id);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
const QS = new URLSearchParams(location.search);
const OPTS = window.__VIDEO_OPTS || {};
const MODE = OPTS.mode || (QS.get('mode') === 'text' ? 'text' : 'voice');
const { shots } = timeline({ mode: MODE, voice: OPTS.voice });
const int = (v, lo, hi, d) => (v === null || v === '' || Number.isNaN(+v) ? d : clamp(Math.round(+v), lo, hi));
const FROM = int(QS.get('from'), 0, shots.length - 1, 0);
const TO = int(QS.get('to'), FROM + 1, shots.length, shots.length); // plays shots FROM .. TO-1
const START = shots[FROM].start, END = shots[TO - 1].start + shots[TO - 1].secs;

let nl = null, stage = null, story = null, t0 = 0, current = -1, done = false;
const fired = new Set();
const ov = {}; // overlay elements by name

window.__video = {
  ready: false,
  start,
  get done() { return done; },
  get time() { return done ? END : current < 0 ? START : START + (performance.now() - t0) / 1000; },
  start_s: START,
  end_s: END,
  mode: MODE,
};

// Wait for the story to load (the 3D head sets geo)
await new Promise((resolve) => { const wait = () => (window.__nl?.geo ? resolve() : requestAnimationFrame(wait)); wait(); });
nl = window.__nl;
stage = $('stage');
story = $('story');
document.documentElement.classList.toggle('text-mode', MODE === 'text');
buildOverlays();
setUp(FROM);
await new Promise((resolve) => setTimeout(resolve, 2500)); // let the head turn and the drawing settle before playing
window.__video.ready = true;
if (!window.__REC) { const b = $('play'); b.hidden = false; b.onclick = () => { b.hidden = true; start(); }; }

// ── Playback ────────────────────────────────────────────────────────────────
function start() {
  $('play').hidden = true;
  t0 = performance.now();
  current = -1;
  done = false;
  fired.clear();
  requestAnimationFrame(frame);
}

function frame() {
  if (done) return;
  const t = START + (performance.now() - t0) / 1000;
  if (t >= END) { done = true; return; }
  while (current < TO - 1 && (current < FROM || t >= shots[current + 1].start)) enter(current < FROM ? FROM : current + 1);
  const s = shots[current], local = t - s.start;
  s.at.forEach(([at, action, value], k) => {
    const key = `${current}:${k}`;
    if (local >= at && !fired.has(key)) { fired.add(key); act(action, value, true); }
  });
  drawOverlays(s, local);
  requestAnimationFrame(frame);
}

function enter(i) {
  current = i;
  show(shots[i]);
  caption(shots[i]);
}

// Frame the face, go to the shot's card and draw the nerve its way
function show(s) {
  if (s.view) nl.view = s.view;
  if (s.step) nl.go(s.step);
  nl.nerveReveal = s.reveal || null;
  nl.nerveMode = s.nerve || null;
  if (s.cut) nl.snap();
}

// The voice version shows a short caption; the text version shows the whole narration
function caption(s) {
  const text = s.overlay === 'end' || (s.overlay === 'title' && MODE === 'text') ? '' : MODE === 'text' ? s.vo : s.cap; // those cards have their own words
  nl.caption = text;
  story.classList.toggle('empty', !text);
  if (s.overlay === 'title') ov.title.querySelector('p').textContent = MODE === 'text' ? s.vo : 'How it works, and a 10-second test you can try';
}

function act(action, value, animate) {
  if (action === 'cover') nl.paddleOver(value, animate);
  if (action === 'peek') nl.setPeek(value);
  if (action === 'slow') nl.setSlow(value);
}

// Starting part-way through: show the story as it would be at that shot
function setUp(from) {
  let k = from, v = from;
  while (v > 0 && !shots[v].view) v--;
  nl.view = shots[v].view || 'story';
  while (k > 0 && !shots[k].step) k--;
  show({ ...shots[from], step: shots[k].step || 'mirror', cut: true });
  for (let j = k; j < from; j++) for (const [, action, value] of shots[j].at) act(action, value, false);
  caption(shots[from]);
}

// ── Overlays: the 20/20 chart, the title and the end card ───────────────────
function el(cls, html = '') {
  const e = document.createElement('div');
  e.className = `ov ${cls}`;
  e.innerHTML = html;
  stage.appendChild(e);
  return e;
}

function buildOverlays() {
  ov.chart = el('chart', `
    <div style="font-size:64px">E</div><div style="font-size:40px">F P</div><div style="font-size:28px">T O Z</div>
    <div style="font-size:20px">L P E D</div><div style="font-size:14px">P E C F D</div>
    <div class="ok">20/20 ✓</div><div class="ok">Healthy eyes ✓</div>`);
  ov.title = el('title', '<h1>Binocular Vision<br>Dysfunction <span>(BVD)</span></h1><p></p>');
  ov.end = el('end', `<h2>Have your eye alignment measured, far and near.</h2>
    <p>If this sounds like you, an eye exam that measures how your eyes line up is the way to find out.</p>
    <span class="url">calgaryvisioncentre.com/bvd</span>
    <small>Calgary Vision Centre · The animation is a simplified illustration.</small>`);
}

function drawOverlays(s, local) {
  const secs = s.secs, fadeOut = (d = 0.4) => clamp((secs - local) / d, 0, 1), fadeIn = (d) => ease(clamp((local - s.overlayAt) / d, 0, 1));
  const set = (e, o, tf = '') => { e.style.opacity = o.toFixed(3); if (tf) e.style.transform = tf; };
  set(ov.chart, s.overlay === 'chart' ? Math.min(fadeIn(0.5), fadeOut()) : 0, `translate(${(-40 * (1 - fadeIn(0.5))).toFixed(1)}px, -50%)`);
  const title = s.overlay === 'title' ? Math.min(fadeIn(0.5), fadeOut(0.5)) : 0;
  set(ov.title, title);
  story.style.opacity = title ? (1 - title).toFixed(3) : ''; // the caption gives way to the title
  ov.title.style.scale = s.overlay === 'title' ? (0.96 + 0.04 * fadeIn(0.6)).toFixed(3) : '1';
  set(ov.end, s.overlay === 'end' ? fadeIn(0.6) : 0);
}
