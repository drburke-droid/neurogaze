// Fixation disparity and the trigeminal nerve — created by Dr Robert Burke
import { createHead } from './head3d.js';
import {
  NEAR_CONVERGENCE, POSTURE_STEPS, describePosture, postureFor, landingOffset, coveredOffset,
  correctingMuscle, LANDING, THRESHOLD, addCorrection, relaxLoad, loadFloor,
} from './fixation.js';

const $ = (id) => document.getElementById(id);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const DEG = Math.PI / 180;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
const SVGNS = 'http://www.w3.org/2000/svg';
const EYES = ['R', 'L'];

// Embed mode: ?embed=1&parent=<page URL>. The host page sizes the iframe from our reported height.
const QS = new URLSearchParams(location.search);
const EMBED = QS.has('embed');
const PARENT = (() => {
  try { const u = new URL(QS.get('parent') || ''); return u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1' ? u : null; } catch { return null; }
})();
if (EMBED) document.documentElement.classList.add('embed');

// ═══════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════
const st = {
  choice: { D: null, N: null, type: 'exo' }, // measured postures (Δ, − = exo) or null if not known
  target: 'N',          // 'D' distance | 'N' near
  view: 'face',
  mag: 10,              // how much the misalignments are magnified on screen
  speed: 0.2,           // simulated seconds per real second
  cover: null,          // 'R' | 'L' | null
  stressors: {},
  load: 0,
  corrections: 0,
  demo: null,           // { kind: 'saccades'|'reading', i, ph, t, from, to, err, errPd }
};
const coverOff = { R: 0, L: 0 };      // drift of each eye behind the cover, degrees outward (true size)
const recovering = { R: null, L: null }; // an eye moving back after the cover comes off: { from, ph, t, pd }
const posture = () => postureFor(st.choice, st.target);

// One fixation, in seconds of simulated time. Stylised: in reality the steps overlap.
const PHASES = [
  { id: 'saccade', dur: 0.05 },
  { id: 'land', dur: 0.06 },
  { id: 'report', dur: 0.15 },
  { id: 'correct', dur: 0.12 },
  { id: 'fixate', dur: 0.19 },
];
const FUSION = new Set(['land', 'report', 'correct']);
const SAY = {
  saccade: 'Saccade: both eyes jump to the next target.',
  land: 'Landing: the eyes come to rest slightly out of line. This is fixation disparity.',
  report: 'Stretch sensors in the eye muscles report the error, by a proposed route through the trigeminal nerve.',
  correct: 'The brain sends a small vergence correction and the eyes realign.',
  fixate: { saccades: 'Aligned. Ready for the next saccade.', reading: 'Aligned: the word is seen singly and clearly.' },
};

const PASSAGE = 'Each time your eyes jump to the next word, they have to land together on the same spot. When they land slightly out of line, the eye muscles report the error and the brain pulls them back into line.';

// ═══════════════════════════════════════════════════════════════
// 3D head and stage geometry
// ═══════════════════════════════════════════════════════════════
const stage = $('stage');
let head = null;
try {
  head = createHead($('view'), stage, {
    onProgress: (e) => { if (e.lengthComputable) $('load-pct').textContent = `${Math.round((100 * e.loaded) / e.total)}%`; },
  });
  head.ready.then(() => { $('loader').hidden = true; layout(); request(); })
    .catch(() => { $('loader').textContent = 'The 3D model could not be loaded. Check your connection and reload.'; });
} catch {
  $('loader').textContent = 'This device or browser could not start 3D graphics (WebGL).';
}

// Screen geometry, in stage pixels: eye centres, their midpoint o, and u = half the distance between the eyes
let geo = null;
function layout() {
  if (!head?.loaded) return;
  head.setView(st.view);
  const R = head.project('R'), L = head.project('L');
  const u = (L.x - R.x) / 2;
  geo = { R, L, o: { x: (R.x + L.x) / 2, y: (R.y + L.y) / 2 }, u, D: 3.2 * u };
  buildNerves();
  placePassage();
  if (!st.cover && !drag) paddlePos = paddleHome(); // re-park it for the new framing
  placePaddle(false);
  draw(true);
}
new ResizeObserver(() => { if (head?.loaded) { head.resize(); layout(); } }).observe(stage);

// Gaze (degrees, + = patient's right / up) ↔ stage pixels. A stylised geometry, so eye movements are easy to see.
function gazeToScreen(H, V) { return { x: geo.o.x - Math.tan(H * DEG) * geo.D, y: geo.o.y - Math.tan(V * DEG) * geo.D }; }
function screenToGaze(x, y) { return { H: -Math.atan2(x - geo.o.x, geo.D) / DEG, V: -Math.atan2(y - geo.o.y, geo.D) / DEG }; }
const restingGaze = () => ({ H: 0, V: st.target === 'N' ? -12 : 0 });

// ═══════════════════════════════════════════════════════════════
// Demos: saccades and reading
// ═══════════════════════════════════════════════════════════════
const passage = $('passage');
const words = PASSAGE.split(' ').map((w) => { const s = document.createElement('span'); s.textContent = w; return s; });
words.forEach((s, i) => passage.append(s, i < words.length - 1 ? ' ' : ''));

function placePassage() {
  const w = Math.min(4.4 * geo.u, 0.62 * stage.clientWidth);
  passage.style.width = `${w}px`;
  passage.style.left = `${geo.o.x - w / 2}px`;
  passage.style.top = `${geo.o.y + 0.55 * geo.u}px`;
  passage.style.fontSize = `${clamp(0.19 * geo.u, 11, 22)}px`;
}

function wordGaze(i) {
  const r = words[i].getBoundingClientRect(), s = stage.getBoundingClientRect();
  return screenToGaze(r.left + r.width / 2 - s.left, r.top + r.height / 2 - s.top);
}

function nextTarget(d) {
  if (d.kind === 'reading') return wordGaze(d.i % words.length);
  return { H: d.i % 2 ? -28 : 28, V: restingGaze().V }; // out past the eyes, toward the temples
}

function newFixation(d) {
  const pd = posture(), r = 0.8 + 0.4 * Math.random();
  d.errPd = Math.abs(pd) * LANDING * r;          // landing error to be corrected, Δ
  d.err = landingOffset(pd, LANDING * r);        // per eye, degrees outward
  d.ph = 0; d.t = 0;
  d.to = nextTarget(d);
}

function startDemo(kind) {
  if (!geo) return; // the model is still loading
  stopDemo();
  if (kind === 'reading') st.target = 'N'; // reading is a near task
  passage.hidden = kind !== 'reading';
  const d = { kind, i: 0, from: st.demo?.to || restingGaze() };
  st.demo = d;
  newFixation(d);
  refreshUI();
  status(kind === 'reading' ? 'Reading demonstration started.' : 'Saccade demonstration started.');
  request();
}

function stopDemo() {
  if (!st.demo) return;
  st.demo = null;
  passage.hidden = true;
  for (const w of words) w.classList.remove('cur');
  refreshUI();
}

// Phases that need fusion are skipped while one eye is covered, or when there is nothing to correct
const phaseDur = (d, k) => (FUSION.has(PHASES[k].id) && (st.cover || d.errPd < 0.05) ? 0 : PHASES[k].dur);

function stepDemo(dt) {
  const d = st.demo;
  d.t += dt;
  for (let guard = 0; d.t >= phaseDur(d, d.ph) && guard < 20; guard++) {
    d.t -= phaseDur(d, d.ph);
    if (PHASES[d.ph].id === 'report' && phaseDur(d, d.ph) > 0) countCorrection(d.errPd);
    d.ph++;
    if (d.ph === 1 && d.kind === 'reading') { // landed on a word
      for (const w of words) w.classList.remove('cur');
      words[d.i % words.length].classList.add('cur');
    }
    if (d.ph >= PHASES.length) {
      d.from = d.to;
      d.i++;
      newFixation(d);
    }
  }
}

// Each eye's landing error now (degrees outward, true size)
function demoError() {
  const d = st.demo;
  if (!d || st.cover) return 0;
  const id = PHASES[d.ph].id, p = phaseDur(d, d.ph) ? d.t / phaseDur(d, d.ph) : 1;
  if (id === 'saccade') return d.err * ease(p);
  if (id === 'land' || id === 'report') return d.err;
  if (id === 'correct') return d.err * (1 - ease(p));
  return 0;
}

function currentGaze() {
  const d = st.demo;
  if (!d) return restingGaze();
  if (PHASES[d.ph].id !== 'saccade') return d.to;
  const p = ease(d.t / PHASES[0].dur);
  return { H: d.from.H + (d.to.H - d.from.H) * p, V: d.from.V + (d.to.V - d.from.V) * p };
}

// ═══════════════════════════════════════════════════════════════
// Cover test
// ═══════════════════════════════════════════════════════════════
const paddle = $('paddle');
let paddlePos = null;   // head of the paddle, in u relative to the eyes' midpoint
let drag = null;

const paddleWidth = () => Math.min(1.25 * geo.u, 0.3 * stage.clientWidth);
// Parked in the bottom-left corner, partly off the stage
function paddleHome() {
  const w = paddleWidth();
  return { x: (0.42 * w - geo.o.x) / geo.u, y: (stage.clientHeight - 0.45 * w - geo.o.y) / geo.u };
}

function placePaddle(animate = true) {
  if (!geo) return;
  paddlePos ||= paddleHome();
  const w = paddleWidth(), h = w * 1.9;
  paddle.style.width = `${w}px`;
  paddle.style.height = `${h}px`;
  paddle.classList.toggle('dragging', !animate);
  // The paddle's head is centred at (50, 45) of its 100 × 190 drawing
  paddle.style.left = `${geo.o.x + paddlePos.x * geo.u - 0.5 * w}px`;
  paddle.style.top = `${geo.o.y + paddlePos.y * geo.u - (45 / 190) * h}px`;
  updateCover();
}

function moveCover(eye) {
  if (!geo) return;
  paddlePos = eye ? { x: eye === 'R' ? -1 : 1, y: 0 } : paddleHome();
  placePaddle(true);
}

function updateCover() {
  let eye = null;
  for (const e of EYES) {
    const dx = paddlePos.x - (e === 'R' ? -1 : 1), dy = paddlePos.y;
    if (Math.hypot(dx, dy) < 0.6) eye = e;
  }
  if (eye === st.cover) return;
  const was = st.cover;
  st.cover = eye;
  paddle.classList.toggle('covering', !!eye);
  if (eye) recovering[eye] = null; // covered again: it drifts from where it is
  if (was) startRecovery(was);
  if (eye) status(`${eye === 'R' ? 'Right' : 'Left'} eye covered.`);
  refreshUI();
  request();
}

paddle.addEventListener('pointerdown', (e) => {
  if (!geo || !e.isPrimary) return;
  paddle.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, from: { ...paddlePos } };
  paddle.classList.add('dragging');
});
paddle.addEventListener('pointermove', (e) => {
  if (!drag) return;
  paddlePos = { x: drag.from.x + (e.clientX - drag.x) / geo.u, y: drag.from.y + (e.clientY - drag.y) / geo.u };
  placePaddle(false);
});
const endDrag = () => { drag = null; paddle.classList.remove('dragging'); };
paddle.addEventListener('pointerup', endDrag);
paddle.addEventListener('pointercancel', endDrag);
paddle.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  moveCover(st.cover === 'R' ? 'L' : st.cover === 'L' ? null : 'R'); // right → left → off
});
document.querySelectorAll('[data-cover]').forEach((b) => b.addEventListener('click', () => moveCover(b.dataset.cover || null)));
$('see-through').addEventListener('click', () => {
  const on = !paddle.classList.contains('see-through');
  paddle.classList.toggle('see-through', on);
  $('see-through').setAttribute('aria-pressed', String(on));
});

// After the cover comes off, the eye holds its drift for a moment, the error is reported, then it realigns
function startRecovery(eye) {
  recovering[eye] = Math.abs(coverOff[eye]) > 0.01 ? { from: coverOff[eye], ph: 1, t: 0, pd: Math.abs(posture()) } : null;
  if (!recovering[eye]) coverOff[eye] = 0;
}

function stepRecovery(eye, dt) {
  const r = recovering[eye];
  r.t += dt;
  while (r.t >= PHASES[r.ph].dur) {
    r.t -= PHASES[r.ph].dur;
    if (PHASES[r.ph].id === 'report') countCorrection(r.pd);
    r.ph++;
    if (PHASES[r.ph].id === 'fixate') { coverOff[eye] = 0; recovering[eye] = null; return; }
  }
  coverOff[eye] = PHASES[r.ph].id === 'correct' ? r.from * (1 - ease(r.t / PHASES[r.ph].dur)) : r.from;
}
const anyRecovering = () => recovering.R || recovering.L;

// ═══════════════════════════════════════════════════════════════
// Trigeminal load
// ═══════════════════════════════════════════════════════════════
function countCorrection(pd) {
  st.corrections++;
  st.load = addCorrection(st.load, pd, st.stressors);
}
document.querySelectorAll('[data-stressor]').forEach((c) => c.addEventListener('change', () => {
  st.stressors[c.dataset.stressor] = c.checked;
  request();
}));
$('reset-load').addEventListener('click', () => {
  st.load = loadFloor(st.stressors);
  st.corrections = 0;
  request();
});
$('meter-threshold').style.left = `${THRESHOLD * 100}%`;

// ═══════════════════════════════════════════════════════════════
// Drawing
// ═══════════════════════════════════════════════════════════════
const nerves = $('nerves');
const svg = (tag, attrs = {}, parent) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.append(el);
  return el;
};

// Smooth path through points (Catmull–Rom as cubic Béziers)
function smooth(pts) {
  const f = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  let d = `M${f(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${f([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${f([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${f(p2)}`;
  }
  return d;
}

// The trigeminal nerve drawn on the face, in units of u from the eyes' midpoint (x toward each side, y down)
const GANGLION = [1.85, 0.55];
const ROUTES = {
  route: [[1, 0], [1.45, 0.12], GANGLION],                 // from the eye muscles: proprioception (proposed)
  V1: [GANGLION, [1.7, -0.1], [1.4, -0.5], [0.8, -0.62], [0.75, -1.2], [0.7, -1.9]],   // ophthalmic: eye, forehead
  V2: [GANGLION, [1.5, 0.75], [0.85, 0.75], [0.6, 1.3], [0.45, 1.75]],                  // maxillary: cheek
  V3: [GANGLION, [1.85, 1.3], [1.6, 2.4], [1.1, 3.0], [0.45, 3.3]],                     // mandibular: jaw
};
const SYMPTOMS = [['Headache', 0, -1.2], ['Eye strain', 2.45, -0.25], ['Jaw and neck tension', 2.3, 2.75]];
let face = null;

function buildNerves() {
  nerves.innerHTML = '';
  nerves.setAttribute('viewBox', `0 0 ${stage.clientWidth} ${stage.clientHeight}`);
  const P = (side, [x, y]) => [geo.o.x + (side === 'R' ? -x : x) * geo.u, geo.o.y + y * geo.u];
  face = { branches: [], routes: {}, pulses: {}, rings: {}, ganglia: [], symptoms: [] };
  for (const side of EYES) {
    for (const b of ['V1', 'V2', 'V3']) face.branches.push(svg('path', { class: 'branch', d: smooth(ROUTES[b].map((p) => P(side, p))) }, nerves));
    face.routes[side] = svg('path', { class: 'route', d: smooth(ROUTES.route.map((p) => P(side, p))) }, nerves);
    const g = P(side, GANGLION);
    face.ganglia.push(svg('circle', { class: 'ganglion', cx: g[0], cy: g[1], r: 0.09 * geo.u }, nerves));
    face.pulses[side] = svg('circle', { class: 'pulse', r: 0.07 * geo.u, visibility: 'hidden' }, nerves);
    const e = P(side, [1, 0]);
    face.rings[side] = svg('circle', { class: 'ring', cx: e[0], cy: e[1], r: 0.45 * geo.u, 'stroke-width': 3, visibility: 'hidden' }, nerves);
  }
  const g = P('R', GANGLION);
  svg('text', { class: 'nerve-label', x: clamp(g[0], 56, stage.clientWidth - 56), y: g[1] + 0.3 * geo.u + 8, 'text-anchor': 'middle' }, nerves).textContent = 'Trigeminal nerve';
  for (const [text, x, y] of SYMPTOMS) {
    const px = clamp(geo.o.x + x * geo.u, 60, stage.clientWidth - 60), py = clamp(geo.o.y + y * geo.u, 20, stage.clientHeight - 40);
    const t = svg('text', { class: 'symptom', x: px, y: py, 'text-anchor': 'middle', visibility: 'hidden' }, nerves);
    t.textContent = text;
    face.symptoms.push(t);
  }
}

// Where the "report" and "correct" signals are, if anywhere: { kind, p }
function signal() {
  const r = anyRecovering(), d = st.demo;
  if (r && (PHASES[r.ph].id === 'report' || PHASES[r.ph].id === 'correct')) return { kind: PHASES[r.ph].id, p: r.t / PHASES[r.ph].dur };
  if (d && !st.cover && d.errPd >= 0.05 && (PHASES[d.ph].id === 'report' || PHASES[d.ph].id === 'correct')) return { kind: PHASES[d.ph].id, p: d.t / PHASES[d.ph].dur };
  return null;
}

const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
let lastAim = '';

function draw(force = false) {
  if (!geo) return;
  const g = currentGaze();
  const err = demoError();
  const off = { R: err + coverOff.R, L: err + coverOff.L };
  const shown = (x) => clamp(x * st.mag, -20, 20);
  const conv = st.target === 'N' ? NEAR_CONVERGENCE : 0;
  const aimR = g.H - conv + shown(off.R), aimL = -g.H - conv + shown(off.L);
  head.aim('R', aimR, g.V);
  head.aim('L', aimL, g.V);
  const key = `${aimR.toFixed(3)}|${aimL.toFixed(3)}|${g.V.toFixed(3)}|${st.view}`;
  if (force || key !== lastAim) { head.render(); lastAim = key; }

  // Fixation target, and where each eye's line of sight falls
  const fp = gazeToScreen(g.H, g.V);
  const tgt = $('target');
  tgt.hidden = st.demo?.kind === 'reading';
  tgt.style.left = `${fp.x}px`; tgt.style.top = `${fp.y}px`;
  const other = $('target-b');
  other.hidden = st.demo?.kind !== 'saccades';
  if (!other.hidden) { const o = gazeToScreen(-st.demo.to.H, st.demo.to.V); other.style.left = `${o.x}px`; other.style.top = `${o.y}px`; }
  const showMarks = !!(st.demo || st.cover || anyRecovering());
  for (const eye of EYES) {
    const m = $(`mark-${eye}`);
    m.hidden = !showMarks;
    const dx = Math.tan(shown(off[eye]) * DEG) * geo.D * (eye === 'R' ? -1 : 1); // outward = toward that eye's side
    m.style.left = `${fp.x + dx}px`; m.style.top = `${fp.y}px`;
  }

  // Trigeminal nerve: glows with the load, flashes as each report arrives
  const sig = signal();
  const heat = clamp(st.load, 0, 1.2);
  const flash = sig?.kind === 'report' ? Math.sin(Math.PI * sig.p) : 0;
  const col = mix([255, 183, 3], [255, 77, 109], clamp((heat - 0.3) / 0.6, 0, 1));
  for (const b of face.branches) {
    b.setAttribute('stroke', `rgb(${col})`);
    b.setAttribute('stroke-opacity', String(clamp(0.22 + 0.6 * Math.min(1, heat) + 0.4 * flash, 0, 1)));
    b.setAttribute('stroke-width', String((1.5 + 2.5 * Math.min(1, heat) + 2 * flash) * Math.max(0.6, geo.u / 95)));
  }
  for (const c of face.ganglia) { c.setAttribute('fill', `rgb(${col})`); c.setAttribute('fill-opacity', String(clamp(0.4 + 0.5 * heat + flash, 0, 1))); }
  for (const eye of EYES) {
    const pulse = face.pulses[eye], ring = face.rings[eye], path = face.routes[eye];
    if (sig?.kind === 'report') {
      const pt = path.getPointAtLength(sig.p * path.getTotalLength());
      pulse.setAttribute('cx', pt.x); pulse.setAttribute('cy', pt.y);
      pulse.setAttribute('visibility', 'visible');
    } else pulse.setAttribute('visibility', 'hidden');
    const ringOn = sig?.kind === 'correct' && (!anyRecovering() || recovering[eye]);
    ring.setAttribute('visibility', ringOn ? 'visible' : 'hidden');
    if (ringOn) { ring.setAttribute('r', String((0.3 + 0.35 * sig.p) * geo.u)); ring.setAttribute('stroke-opacity', String(1 - sig.p)); }
  }
  const over = st.load > THRESHOLD;
  for (const t of face.symptoms) t.setAttribute('visibility', over ? 'visible' : 'hidden');

  drawTopView(g, off, shown, sig);
  drawMeter(over);
  drawCaption(sig);
}

// ── Seen from above: eyes, lines of sight, horizontal recti, and the proposed loop ──
const top = $('topview');
const TV = { R: { x: 110 }, L: { x: 190 }, y: 118, r: 22, nearY: 226, brain: [150, 26] };
const tv = {};
(function buildTopView() {
  const apex = (e) => [TV[e].x + (e === 'R' ? 8 : -8), 80];
  const gang = (e) => (e === 'R' ? [48, 60] : [252, 60]);
  svg('rect', { class: 'node', x: 118, y: 12, width: 64, height: 22, rx: 6 }, top);
  svg('text', { x: 150, y: 27, 'text-anchor': 'middle' }, top).textContent = 'Brainstem';
  svg('text', { x: 4, y: 80 }, top).textContent = 'Trigeminal';
  svg('text', { x: 4, y: 92 }, top).textContent = 'ganglion';
  tv.nerves = {}; tv.motor = {}; tv.muscles = {}; tv.pulse = {}; tv.motorPulse = {}; tv.eye = {}; tv.iris = {}; tv.sight = {};
  for (const e of EYES) {
    const x = TV[e].x, s = e === 'R' ? 1 : -1; // s: toward the midline
    const a = apex(e), gg = gang(e);
    tv.nerves[e] = svg('path', { class: 'nerve', d: `M${a[0]},${a[1]} Q${(a[0] + gg[0]) / 2},${a[1] - 2} ${gg[0]},${gg[1]} Q${(gg[0] + 150) / 2},${18} ${150 - s * 32},${23}` }, top);
    svg('circle', { class: 'node', cx: gg[0], cy: gg[1], r: 6 }, top);
    tv.muscles[e] = {
      MR: svg('line', { class: 'muscle', x1: x + s * 19, y1: TV.y - 6, x2: a[0] + s * 2, y2: a[1] }, top),
      LR: svg('line', { class: 'muscle', x1: x - s * 19, y1: TV.y - 6, x2: a[0] - s * 2, y2: a[1] }, top),
    };
    tv.motor[e] = svg('path', { class: 'motor' }, top);
    tv.eye[e] = svg('circle', { class: 'eyeball', cx: x, cy: TV.y, r: TV.r }, top);
    tv.iris[e] = svg('line', { class: 'iris' }, top);
    tv.sight[e] = svg('line', { class: `sight ${e === 'R' ? 'od' : 'os'}` }, top);
    tv.pulse[e] = svg('circle', { r: 4, fill: '#fff6d6', visibility: 'hidden' }, top);
    tv.motorPulse[e] = svg('circle', { r: 4, fill: '#d9f6ff', visibility: 'hidden' }, top);
    svg('text', { x, y: TV.y + 4, 'text-anchor': 'middle', style: 'fill:#1b1f27' }, top).textContent = e === 'R' ? 'OD' : 'OS';
  }
  tv.target = svg('g', {}, top);
  svg('circle', { r: 4, fill: '#fff4e0' }, tv.target);
  tv.targetLabel = svg('text', { 'text-anchor': 'middle', y: 18 }, tv.target);
  tv.far = svg('text', { x: 150, y: 246, 'text-anchor': 'middle' }, top);
  tv.far.textContent = '↓ to the distance target ↓';
})();

function drawTopView(g, off, shown, sig) {
  const near = st.target === 'N';
  const T = { x: 150 - Math.tan(g.H * DEG) * (TV.nearY - TV.y), y: TV.nearY };
  tv.target.setAttribute('transform', `translate(${T.x.toFixed(1)},${T.y})`);
  tv.target.style.display = near ? '' : 'none';
  tv.targetLabel.textContent = st.demo?.kind === 'reading' ? 'Word' : 'Near target';
  tv.far.style.display = near ? 'none' : '';
  const muscle = correctingMuscle(posture());
  for (const e of EYES) {
    const x = TV[e].x, s = e === 'R' ? 1 : -1;
    // Aligned direction, then turned outward by the (magnified) misalignment
    let az = near ? Math.atan2(T.x - x, T.y - TV.y) : -g.H * DEG;
    az += (e === 'R' ? -1 : 1) * shown(off[e]) * DEG;
    const dx = Math.sin(az), dy = Math.cos(az);
    const len = near ? (T.y - TV.y) / Math.max(0.3, dy) + 22 : 140;
    tv.sight[e].setAttribute('x1', x + dx * TV.r); tv.sight[e].setAttribute('y1', TV.y + dy * TV.r);
    tv.sight[e].setAttribute('x2', x + dx * len); tv.sight[e].setAttribute('y2', TV.y + dy * len);
    tv.iris[e].setAttribute('x1', x + dx * (TV.r - 3) - dy * 9); tv.iris[e].setAttribute('y1', TV.y + dy * (TV.r - 3) + dx * 9);
    tv.iris[e].setAttribute('x2', x + dx * (TV.r - 3) + dy * 9); tv.iris[e].setAttribute('y2', TV.y + dy * (TV.r - 3) - dx * 9);
    // The correcting muscle: medial rectus (CN III) for exo, lateral rectus (CN VI) for eso
    const m = tv.muscles[e][muscle];
    tv.motor[e].setAttribute('d', `M150,34 Q${150 - s * 10},70 ${(+m.getAttribute('x1') + +m.getAttribute('x2')) / 2},${(+m.getAttribute('y1') + +m.getAttribute('y2')) / 2}`);
    for (const k of ['MR', 'LR']) {
      const active = (sig?.kind === 'report') || (sig?.kind === 'correct' && k === muscle);
      tv.muscles[e][k].style.stroke = active ? (sig.kind === 'report' ? '#ffb703' : '#4cc9f0') : '';
    }
    const along = (path, p, dot) => {
      const pt = path.getPointAtLength(p * path.getTotalLength());
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); dot.setAttribute('visibility', 'visible');
    };
    if (sig?.kind === 'report') along(tv.nerves[e], sig.p, tv.pulse[e]); else tv.pulse[e].setAttribute('visibility', 'hidden');
    if (sig?.kind === 'correct') along(tv.motor[e], sig.p, tv.motorPulse[e]); else tv.motorPulse[e].setAttribute('visibility', 'hidden');
  }
}

function drawMeter(over) {
  const pct = Math.round(clamp(st.load, 0, 1) * 100);
  $('meter-fill').style.width = `${pct}%`;
  $('meter').setAttribute('aria-valuenow', String(pct));
  $('meter').setAttribute('aria-valuetext', `${pct}%${over ? ', above the level where symptoms may appear' : ''}`);
  $('load-panel').classList.toggle('over', over);
  $('count').textContent = String(st.corrections);
}

let captionText = '';
function drawCaption(sig) {
  const d = st.demo, r = anyRecovering();
  let text = '';
  if (r) text = sig?.kind === 'report' ? 'Uncovered: the eye is out of line, and the eye muscles report the error.' : 'Uncovered: the eye moves back in line with the other.';
  else if (st.cover) {
    const pd = posture();
    text = `${st.cover === 'R' ? 'Right' : 'Left'} eye covered: with nothing to keep it aligned, it drifts ${pd < 0 ? 'outward' : pd > 0 ? 'inward' : 'nowhere'} to its resting position.`;
  } else if (d && Math.abs(posture()) * LANDING < 0.05) text = 'Aligned posture: the eyes land together, so there is nothing to correct.';
  else if (d && st.speed >= 1) text = 'Sped up: every landing brings another small correction.';
  else if (d) {
    const id = PHASES[d.ph].id;
    text = `${d.ph + 1}/5 ${typeof SAY[id] === 'string' ? SAY[id] : SAY[id][d.kind]}`;
  }
  if (text === captionText) return;
  captionText = text;
  const c = $('caption');
  c.hidden = !text;
  const m = /^(\d\/5) (.*)$/.exec(text);
  c.innerHTML = '';
  if (m) { const n = document.createElement('span'); n.className = 'n'; n.textContent = m[1]; c.append(n, m[2]); } else c.textContent = text;
}

// ═══════════════════════════════════════════════════════════════
// Frame loop (runs only while something is moving)
// ═══════════════════════════════════════════════════════════════
let rafId = 0, last = 0;
function request() { if (!rafId) rafId = requestAnimationFrame(tick); }
function tick(now) {
  rafId = 0;
  const dt = (last ? Math.min(0.1, (now - last) / 1000) : 1 / 60) * st.speed;
  last = now;
  let active = false;
  if (st.demo) { stepDemo(dt); active = true; }
  for (const e of EYES) if (recovering[e]) { stepRecovery(e, dt); active = true; }
  const pd = posture();
  for (const e of EYES) {
    if (recovering[e]) continue;
    const goal = st.cover === e ? coveredOffset(pd) : 0;
    coverOff[e] += (goal - coverOff[e]) * (1 - Math.exp(-dt / 0.15)); // drift behind the cover
    if (Math.abs(goal - coverOff[e]) > 1e-4) active = true; else coverOff[e] = goal;
  }
  const floor = loadFloor(st.stressors);
  st.load = relaxLoad(st.load, dt, st.stressors);
  if (Math.abs(st.load - floor) > 0.002) active = true;
  draw();
  if (active) request(); else last = 0;
}

// ═══════════════════════════════════════════════════════════════
// Controls
// ═══════════════════════════════════════════════════════════════
for (const t of ['D', 'N']) {
  const sel = $(`post-${t}`);
  sel.add(new Option("I don't know", ''));
  for (const v of POSTURE_STEPS) sel.add(new Option(describePosture(v), String(v)));
  sel.addEventListener('change', () => { st.choice[t] = sel.value === '' ? null : +sel.value; refreshUI(); request(); });
}
const pick = (id, attr, fn) => $(id).addEventListener('click', (e) => { const b = e.target.closest(`button[data-${attr}]`); if (b && !b.disabled) fn(b.dataset[attr]); });
pick('type-picker', 'type', (v) => { st.choice.type = v; refreshUI(); request(); });
pick('target-picker', 'target', (v) => { if (st.demo?.kind === 'reading' && v === 'D') stopDemo(); st.target = v; refreshUI(); request(); });
pick('speed-picker', 'speed', (v) => { st.speed = +v; refreshUI(); });
pick('mag-picker', 'mag', (v) => { st.mag = +v; refreshUI(); request(); });
pick('view-picker', 'view', (v) => { st.view = v; layout(); refreshUI(); });
$('run-saccades').addEventListener('click', () => (st.demo?.kind === 'saccades' ? stopDemo() : startDemo('saccades')));
$('run-reading').addEventListener('click', () => (st.demo?.kind === 'reading' ? stopDemo() : startDemo('reading')));

function refreshUI() {
  const pressed = (id, attr, val) => { for (const b of $(id).children) b.setAttribute('aria-pressed', String(b.dataset[attr] === String(val))); };
  pressed('type-picker', 'type', st.choice.type);
  pressed('target-picker', 'target', st.target);
  pressed('speed-picker', 'speed', st.speed);
  pressed('mag-picker', 'mag', st.mag);
  pressed('view-picker', 'view', st.view);
  const known = st.choice.D !== null && st.choice.N !== null;
  for (const b of $('type-picker').children) b.disabled = known;
  for (const [id, kind, label] of [['run-saccades', 'saccades', 'Saccades'], ['run-reading', 'reading', 'Reading']]) {
    const on = st.demo?.kind === kind;
    $(id).setAttribute('aria-pressed', String(on));
    $(id).textContent = on ? `Stop ${label.toLowerCase()}` : label;
  }
  const pd = posture(), measured = st.choice[st.target] !== null;
  const chip = $('posture-chip');
  chip.textContent = `${st.target === 'N' ? 'Near' : 'Distance'} posture: ${describePosture(pd)}`;
  const small = document.createElement('small');
  small.textContent = measured ? 'your measurement' : `typical ${st.choice.type}, not measured`;
  chip.append(small);
  for (const b of document.querySelectorAll('[data-cover]')) b.setAttribute('aria-pressed', String((b.dataset.cover || null) === st.cover));
}

function status(msg) {
  const s = $('status');
  if (!s) return;
  s.textContent = '';
  setTimeout(() => { s.textContent = msg; }, 30);
}

refreshUI();

// In an embed, report our height so the host page sizes the iframe and does all the scrolling
if (EMBED && window.parent !== window) {
  let lastH = 0;
  const report = () => {
    const h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (Math.abs(h - lastH) > 1) { lastH = h; window.parent.postMessage({ type: 'gaze-height', height: h }, PARENT ? PARENT.origin : '*'); }
  };
  new ResizeObserver(report).observe(document.body);
  report();
}

// Small hook for automated checks
window.__fd = { st, coverOff, recovering, startDemo, stopDemo, moveCover, get geo() { return geo; } };
