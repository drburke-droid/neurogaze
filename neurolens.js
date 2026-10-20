// Neurolens page demo: eyes drift to their resting position — created by Dr Robert Burke
import { createHead } from './head3d.js';
import { NEAR_CONVERGENCE, RESTING, landingOffset, coveredOffset } from './fixation.js';

const $ = (id) => document.getElementById(id);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const DEG = Math.PI / 180;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
const EYES = ['R', 'L'];
const MAG = 8;            // eye movements are exaggerated so they can be seen
const MAX_TURN = 18;      // degrees: the most an eye is shown turned away
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Embed mode: ?embed=1&parent=<page URL>. The host page sizes the iframe from our reported height.
const QS = new URLSearchParams(location.search);
const EMBED = QS.has('embed');
const PARENT = (() => {
  try { const u = new URL(QS.get('parent') || ''); return u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1' ? u : null; } catch { return null; }
})();
const toParent = (msg) => { if (EMBED && window.parent !== window) window.parent.postMessage(msg, PARENT ? PARENT.origin : '*'); };

// ═══════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════
const st = {
  mode: 'cover',        // 'cover' | 'reading'
  playing: false,
  userPaused: REDUCED,  // don't start on our own if the visitor paused (or prefers less motion)
  drift: 'exo',         // which way the eyes rest: 'exo' outward, 'eso' inward
  t: 0, step: -1,       // position in the cover-test script, seconds
  cover: null,          // eye currently behind the paddle
  read: null,           // reading: { i, ph, t, from, to, err, count, pause }
  manual: false,        // the visitor has moved the paddle themselves
};
let inView = false;
const drift = { R: 0, L: 0 }; // each eye's drift toward rest, degrees outward (true size)
const posture = () => RESTING[st.drift];
const way = () => (st.drift === 'exo' ? 'outward' : 'inward');

// The cover test, as a looping script (seconds)
const COVER = [
  { at: 0, cover: null, say: () => 'Both eyes are aiming at the dot together.' },
  { at: 2.2, cover: 'R', say: () => 'A clear paddle covers the right eye. We can still see the eye, but it can no longer see the dot.' },
  { at: 4.6, say: () => `With nothing to line up with, it drifts ${way()} to where it naturally rests.` },
  { at: 7.8, cover: null, say: () => 'When the paddle comes away, the eye has to pull back into line.' },
  { at: 10.6, cover: 'L', say: () => `The same happens with the left eye: covered, it drifts ${way()}.` },
  { at: 14, cover: null, say: () => 'Back in line. Your brain makes corrections like this all day, without you noticing.' },
  { at: 18, loop: true },
];

// Reading: one fixation per word, in seconds of slowed-down time
const READ_SPEED = 0.4;
const PHASES = [['saccade', 0.05], ['land', 0.12], ['correct', 0.15], ['fixate', 0.2]];
const PASSAGE = 'Every time your eyes jump to the next word, they need to land together. If they land slightly out of line, the brain pulls them back. This happens with every word you read.';
const READ_SAY = [
  [0, () => 'Watch the eyes jump from word to word across the clear card.'],
  [4, () => `During each jump the eyes aren't held together, so they slip ${way()} toward their resting position and land slightly out of line. Watch the rings come apart.`],
  [13, () => 'The brain notices and pulls them back together. That small miss and correction is called fixation disparity.'],
  [22, () => 'It happens with every word you read, thousands of times a day.'],
];

// ═══════════════════════════════════════════════════════════════
// 3D head and stage geometry
// ═══════════════════════════════════════════════════════════════
const stage = $('stage');
let head = null, geo = null;
try {
  head = createHead($('view'), stage, {
    onProgress: (e) => { if (e.lengthComputable) $('load-pct').textContent = `${Math.round((100 * e.loaded) / e.total)}%`; },
  });
  head.setView('mid');
  head.ready.then(() => { $('loader').hidden = true; layout(); if (inView && !st.userPaused) play(); else request(); })
    .catch(() => { $('loader').textContent = 'The 3D model could not be loaded. Please reload the page.'; });
} catch {
  $('loader').textContent = 'This browser could not start 3D graphics, so the demonstration is not available.';
}

// Eye centres on screen, their midpoint o, and u = half the distance between the eyes (pixels)
function layout() {
  if (!head?.loaded) return;
  head.setView('mid');
  const R = head.project('R'), L = head.project('L');
  const u = (L.x - R.x) / 2;
  geo = { R, L, o: { x: (R.x + L.x) / 2, y: (R.y + L.y) / 2 }, u, D: 3.2 * u };
  placeCard();
  if (!dragging) parkPaddle(false);
  lastAim = '';
  draw();
}
new ResizeObserver(() => { if (head?.loaded) { head.resize(); layout(); } }).observe(stage);

// Gaze (degrees, + = patient's right / up) ↔ stage pixels, in a stylised geometry that makes movements easy to see
const gazeToScreen = (H, V) => ({ x: geo.o.x - Math.tan(H * DEG) * geo.D, y: geo.o.y - Math.tan(V * DEG) * geo.D });
const screenToGaze = (x, y) => ({ H: -Math.atan2(x - geo.o.x, geo.D) / DEG, V: -Math.atan2(y - geo.o.y, geo.D) / DEG });
const DOT = { H: 0, V: -10 }; // the near target for the cover test

// ═══════════════════════════════════════════════════════════════
// The clear reading card
// ═══════════════════════════════════════════════════════════════
const card = $('card');
const words = PASSAGE.split(' ').map((w) => { const s = document.createElement('span'); s.textContent = w; return s; });
words.forEach((s, i) => $('card-text').append(s, i < words.length - 1 ? ' ' : ''));

function placeCard() {
  const w = Math.min(3.6 * geo.u, 0.86 * stage.clientWidth);
  Object.assign(card.style, {
    width: `${w}px`, left: `${geo.o.x - w / 2}px`, top: `${geo.o.y + 0.62 * geo.u}px`,
    padding: `${0.12 * geo.u}px ${0.2 * geo.u}px`, fontSize: `${clamp(0.19 * geo.u, 13, 22)}px`,
  });
}

function wordGaze(i) {
  const r = words[i].getBoundingClientRect(), s = stage.getBoundingClientRect();
  return screenToGaze(r.left + r.width / 2 - s.left, r.top + r.height / 2 - s.top);
}

function nextWord(r) {
  r.ph = 0; r.t = 0;
  r.to = wordGaze(r.i);
  r.err = landingOffset(posture(), 0.5 * (0.85 + 0.3 * Math.random())); // each eye, degrees outward
  for (const w of words) w.classList.remove('cur');
}

function stepReading(dt) {
  const r = st.read;
  if (r.pause > 0) { // end of the paragraph
    r.pause -= dt / READ_SPEED;
    if (r.pause <= 0) { r.i = 0; r.count = 0; r.from = r.to; nextWord(r); }
    return;
  }
  r.t += dt;
  while (r.t >= PHASES[r.ph][1]) {
    r.t -= PHASES[r.ph][1];
    r.ph++;
    if (r.ph === 1) { words[r.i].classList.add('cur'); if (Math.abs(posture()) > 0) r.count++; }
    if (r.ph === PHASES.length) {
      r.from = r.to;
      if (++r.i >= words.length) { r.i = words.length - 1; r.ph = PHASES.length - 1; r.pause = 3.5; return; }
      nextWord(r);
    }
  }
}

// How far each eye has slipped toward rest right now (degrees outward, true size)
function landingError() {
  const r = st.read;
  if (st.mode !== 'reading' || !r || r.pause > 0) return 0;
  const [id, dur] = PHASES[r.ph], p = r.t / dur;
  if (id === 'saccade') return r.err * ease(p);
  if (id === 'land') return r.err;
  if (id === 'correct') return r.err * (1 - ease(p));
  return 0;
}

function gazeNow() {
  const r = st.read;
  if (st.mode !== 'reading' || !r) return DOT;
  if (r.pause > 0 || PHASES[r.ph][0] !== 'saccade') return r.to;
  const p = ease(r.t / PHASES[0][1]);
  return { H: r.from.H + (r.to.H - r.from.H) * p, V: r.from.V + (r.to.V - r.from.V) * p };
}

// ═══════════════════════════════════════════════════════════════
// The clear paddle
// ═══════════════════════════════════════════════════════════════
const paddle = $('paddle');
let dragging = null, paddleAt = null; // paddleAt: centre of the paddle's head, stage pixels

const paddleWidth = () => Math.min(1.25 * geo.u, 0.3 * stage.clientWidth);
function setPaddle(x, y, animate) {
  const w = paddleWidth(), h = w * 2;
  paddleAt = { x, y };
  paddle.classList.toggle('dragging', !animate);
  Object.assign(paddle.style, { width: `${w}px`, height: `${h}px`, left: `${x - w / 2}px`, top: `${y - 0.22 * h}px` });
  request();
}
function parkPaddle(animate = true) { const w = paddleWidth(); setPaddle(0.62 * w, stage.clientHeight - 0.5 * w, animate); }
function paddleOver(eye, animate = true) { if (eye) setPaddle(geo[eye].x, geo[eye].y, animate); else parkPaddle(animate); }

// Which eye the paddle covers, from where it is drawn now (it glides between positions)
function coveredEye() {
  if (!geo || st.mode !== 'cover') return null;
  const r = paddle.getBoundingClientRect(), s = stage.getBoundingClientRect();
  const x = r.left + r.width / 2 - s.left, y = r.top + 0.22 * r.height - s.top;
  for (const e of EYES) if (Math.hypot(x - geo[e].x, y - geo[e].y) < 0.55 * geo.u) return e;
  return null;
}

paddle.addEventListener('pointerdown', (e) => {
  if (!geo || !e.isPrimary || st.mode !== 'cover') return;
  paddle.setPointerCapture(e.pointerId);
  dragging = { x: e.clientX, y: e.clientY, from: { ...paddleAt } };
  st.manual = true;
  pause(true);
});
paddle.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  setPaddle(dragging.from.x + e.clientX - dragging.x, dragging.from.y + e.clientY - dragging.y, false);
});
const endDrag = () => { dragging = null; paddle.classList.remove('dragging'); };
paddle.addEventListener('pointerup', endDrag);
paddle.addEventListener('pointercancel', endDrag);
paddle.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  st.manual = true;
  pause(true);
  paddleOver(st.cover === 'R' ? 'L' : st.cover === 'L' ? null : 'R'); // right → left → away
});

// ═══════════════════════════════════════════════════════════════
// Playing, pausing and switching
// ═══════════════════════════════════════════════════════════════
function setMode(mode) {
  st.mode = mode;
  st.t = 0; st.step = -1; st.manual = false;
  card.hidden = mode !== 'reading';
  paddle.hidden = mode !== 'cover';
  $('target').hidden = mode !== 'cover';
  for (const b of document.querySelectorAll('[role="tab"]')) b.setAttribute('aria-selected', String(b.dataset.mode === mode));
  $('mode-label').textContent = mode === 'cover' ? 'Cover test' : 'Reading';
  if (mode === 'reading' && geo) { st.read = { i: 0, count: 0, from: DOT, pause: 0 }; nextWord(st.read); }
  if (mode === 'cover' && geo) parkPaddle();
  caption(mode === 'cover' ? COVER[0].say() : READ_SAY[0][1]());
  status(mode === 'cover' ? 'Cover test.' : 'Reading demonstration.');
  play();
}

function play() {
  if (!geo) return;
  if (st.mode === 'reading' && !st.read) { st.read = { i: 0, count: 0, from: DOT, pause: 0 }; nextWord(st.read); }
  st.playing = true; st.userPaused = false;
  $('play').textContent = 'Pause';
  request();
}
function pause(byUser) {
  st.playing = false;
  if (byUser) st.userPaused = true;
  $('play').textContent = 'Play';
}

$('play').addEventListener('click', () => {
  if (st.playing) { pause(true); status('Paused.'); return; }
  if (st.mode === 'cover' && (st.step < 0 || st.manual)) { st.t = 0; st.step = -1; st.manual = false; parkPaddle(); } // start the script again
  play();
  status('Playing.');
});
for (const b of document.querySelectorAll('[role="tab"]')) b.addEventListener('click', () => setMode(b.dataset.mode));
$('drift').addEventListener('click', () => {
  st.drift = st.drift === 'exo' ? 'eso' : 'exo';
  $('drift').textContent = st.drift === 'exo' ? 'Show eyes that drift inward' : 'Show eyes that drift outward';
  setMode(st.mode);
});

// Start when the demonstration scrolls into view; stop when it scrolls away
new IntersectionObserver(([e]) => {
  inView = e.isIntersecting;
  if (inView && !st.userPaused && !st.playing) play();
  else if (!inView && st.playing) pause(false);
}, { threshold: 0.35 }).observe(stage);

// ═══════════════════════════════════════════════════════════════
// Frame loop (runs only while something moves)
// ═══════════════════════════════════════════════════════════════
let rafId = 0, last = 0, lastAim = '', captionText = '';
function request() { if (!rafId) rafId = requestAnimationFrame(tick); }

function tick(now) {
  rafId = 0;
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
  last = now;
  if (!geo) return;
  let active = st.playing || !!dragging || isGliding();

  if (st.playing && st.mode === 'cover') {
    st.t += dt;
    while (st.step + 1 < COVER.length && COVER[st.step + 1].at <= st.t) {
      const s = COVER[++st.step];
      if (s.loop) { st.t = 0; st.step = -1; continue; }
      if ('cover' in s) paddleOver(s.cover);
      caption(s.say());
    }
  }
  if (st.playing && st.mode === 'reading') {
    stepReading(dt * READ_SPEED);
    const r = st.read;
    if (r.pause > 0) caption(`That was one short paragraph: ${r.count} small corrections.`);
    else caption(READ_SAY.filter(([from]) => from <= r.i).pop()[1]());
  }

  // Behind the paddle an eye drifts to rest; uncovered, it pulls back into line
  const covered = coveredEye();
  if (covered !== st.cover) {
    st.cover = covered;
    if (dragging || !st.playing) caption(covered ? `Covered, the ${covered === 'R' ? 'right' : 'left'} eye drifts ${way()} to where it naturally rests.` : 'Uncovered, the eye pulls back into line. Drag the clear paddle over either eye.');
  }
  for (const e of EYES) {
    const goal = st.cover === e ? coveredOffset(posture()) : 0;
    const tau = goal ? 0.6 : 0.3;
    drift[e] += (goal - drift[e]) * (1 - Math.exp(-dt / tau));
    if (Math.abs(goal - drift[e]) > 1e-3) active = true;
  }

  draw();
  if (active) request(); else last = 0;
}

// Is the paddle still gliding to where it was sent?
function isGliding() {
  if (!paddleAt || paddle.hidden) return false;
  const r = paddle.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return Math.abs(r.left + r.width / 2 - s.left - paddleAt.x) > 0.5 || Math.abs(r.top + 0.22 * r.height - s.top - paddleAt.y) > 0.5;
}

function draw() {
  if (!geo) return;
  const g = gazeNow();
  const land = landingError();
  const turn = (e) => clamp((drift[e] + land) * MAG, -MAX_TURN, MAX_TURN);
  const aimR = g.H - NEAR_CONVERGENCE + turn('R'), aimL = -g.H - NEAR_CONVERGENCE + turn('L');
  head.aim('R', aimR, g.V);
  head.aim('L', aimL, g.V);
  const key = `${aimR.toFixed(3)}|${aimL.toFixed(3)}|${g.V.toFixed(3)}`;
  if (key !== lastAim) { head.render(); lastAim = key; }

  // The dot (cover test) or word (reading), and where each eye is aiming relative to it
  const p = gazeToScreen(g.H, g.V);
  Object.assign($('target').style, { left: `${p.x}px`, top: `${p.y}px` });
  for (const e of EYES) {
    const ring = $(`ring-${e}`);
    ring.hidden = false;
    const dx = Math.tan(turn(e) * DEG) * geo.D * (e === 'R' ? -1 : 1); // outward = toward that eye's own side
    Object.assign(ring.style, { left: `${p.x + dx}px`, top: `${p.y}px` });
  }
}

function caption(text) {
  if (text === captionText) return;
  captionText = text;
  $('caption').textContent = text;
}

function status(msg) {
  const s = $('status');
  s.textContent = '';
  setTimeout(() => { s.textContent = msg; }, 30);
}

// Booking and phone links: let the host page record the conversion
for (const a of document.querySelectorAll('[data-conversion]')) a.addEventListener('click', () => toParent({ type: 'cvc-conversion', href: a.href }));

// In an embed, report our height so the host page sizes the iframe and does all the scrolling
if (EMBED) {
  document.documentElement.style.overflow = 'hidden';
  let lastH = 0;
  const report = () => {
    const h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (Math.abs(h - lastH) > 1) { lastH = h; toParent({ type: 'gaze-height', height: h }); }
  };
  new ResizeObserver(report).observe(document.body);
  report();
}

// Small hook for automated checks
window.__nl = { st, drift, setMode, play, pause, paddleOver, get geo() { return geo; } };
