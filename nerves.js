// ═══════════════════════════════════════════════════════════════
// The trigeminal nerve, drawn over the 3D head in profile
// ═══════════════════════════════════════════════════════════════
// Anatomy points are [z, y] in head units: the eyes are 0.355 apart (about 63 mm), so 1 unit is
// about 177 mm. y = 0 at the eyes, + up; z + toward the face (nose tip 0.44, ear canal -0.33,
// back of the head -0.70). The profile shows the patient's left side, facing the left of the screen.
// Created by Dr Robert Burke

const NS = 'http://www.w3.org/2000/svg';
const TRIG = '#ffcf5a'; // the trigeminal nerve
const NECK = '#7cc4ff'; // the upper neck nerves
const DURA = '#ffe39a'; // the trigeminal nerve's branches over the covering of the brain
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const f = (v) => v.toFixed(1);

// ── Anatomy ─────────────────────────────────────────────────────
const EYE = [0.156, 0];        // centre of the eyeball
const EYE_R = 0.068;           // eyeball radius (12 mm)
const APEX = [-0.05, 0.01];    // back of the eye socket, where the eye muscles start
const GANGLION = [-0.225, -0.085];
const PONS = [-0.315, -0.07];
const JUNCTION = [-0.37, -0.42]; // top of the spinal cord, where the trigeminal and upper neck nerves meet

// The eye muscles: from the back of the socket to the eyeball, with position sensors near the eyeball
const MUSCLES = [
  { id: 'sr', from: [-0.045, 0.024], to: [0.16, 0.064], w: [0.012, 0.024, 0.016], sensors: [[0.095, 0.052], [0.115, 0.057]] },
  { id: 'ir', from: [-0.045, -0.016], to: [0.16, -0.064], w: [0.012, 0.022, 0.015], sensors: [[0.095, -0.05], [0.115, -0.055]] },
  { id: 'lr', from: [-0.05, 0.004], to: [0.175, 0.0], w: [0.012, 0.026, 0.017], sensors: [[0.1, 0.002], [0.122, 0.001]] },
];

// Signals from the eye muscle sensors to the brainstem and down to the top of the spinal cord
const TRUNK = [APEX, [-0.13, -0.03], GANGLION, PONS, [-0.34, -0.2], [-0.365, -0.33], JUNCTION];
const ROUTES = MUSCLES.map((m) => [m.sensors[0], ...TRUNK]);
const SHORT = MUSCLES.map((m) => [m.sensors[1], m.from]); // sensor to the back of the socket

// Nerves: group, relative width, points
const NERVES = [
  // Ophthalmic branch (V1): the eye, the forehead and the front of the scalp
  { g: 'route', w: 1.5, pts: [GANGLION, [-0.13, -0.03], APEX] },
  { g: 'v1', w: 1, pts: [APEX, [0.06, 0.058], [0.17, 0.082], [0.235, 0.092], [0.272, 0.18], [0.238, 0.32], [0.15, 0.43], [0.02, 0.5]] },
  { g: 'v1', w: 0.7, pts: [[0.235, 0.092], [0.255, 0.14], [0.212, 0.245], [0.13, 0.36], [0.0, 0.445]] },
  { g: 'v1', w: 0.55, pts: [[0.06, 0.058], [0.13, 0.05], [0.2, 0.035]] },
  // Maxillary branch (V2): the cheek, side of the nose, upper lip and upper teeth
  { g: 'v2', w: 1.2, pts: [[-0.215, -0.095], [-0.12, -0.078], [-0.04, -0.095], [0.08, -0.082], [0.18, -0.098], [0.25, -0.125]] },
  { g: 'v2', w: 0.7, pts: [[0.25, -0.125], [0.3, -0.105], [0.33, -0.12]] },
  { g: 'v2', w: 0.7, pts: [[0.25, -0.125], [0.31, -0.18], [0.345, -0.245]] },
  { g: 'v2', w: 0.7, pts: [[0.25, -0.125], [0.29, -0.24], [0.33, -0.33], [0.37, -0.37]] },
  { g: 'v2', w: 0.6, pts: [[-0.04, -0.095], [0.0, -0.2], [0.08, -0.31], [0.2, -0.345], [0.27, -0.35]] },
  // Mandibular branch (V3): the lower jaw, chin, lower lip, tongue, and the chewing muscles
  { g: 'v3', w: 1.4, pts: [[-0.225, -0.1], [-0.212, -0.17], [-0.2, -0.21]] },
  { g: 'v3', w: 1, pts: [[-0.2, -0.21], [-0.172, -0.3], [-0.12, -0.415], [-0.02, -0.478], [0.12, -0.5], [0.262, -0.52], [0.34, -0.55]] },
  { g: 'v3', w: 0.6, pts: [[0.262, -0.52], [0.31, -0.49], [0.37, -0.465]] },
  { g: 'v3', w: 0.6, pts: [[-0.2, -0.21], [-0.12, -0.33], [0.0, -0.405], [0.14, -0.42]] },
  { g: 'v3', w: 0.7, pts: [[-0.2, -0.21], [-0.14, -0.235], [-0.09, -0.3]] },
  { g: 'v3', w: 0.6, pts: [[-0.205, -0.2], [-0.27, -0.22], [-0.29, -0.13], [-0.27, 0.05], [-0.22, 0.24]] },
  // Branches to the covering of the brain (meninges)
  { g: 'mening', w: 0.6, pts: [[-0.214, -0.18], [-0.25, -0.12], [-0.245, 0.0], [-0.2, 0.18], [-0.13, 0.36], [-0.06, 0.45]] },
  { g: 'mening', w: 0.45, pts: [[-0.245, 0.0], [-0.33, 0.12], [-0.43, 0.27], [-0.5, 0.37]] },
  { g: 'mening', w: 0.45, pts: [[-0.2, 0.18], [-0.29, 0.3], [-0.33, 0.42]] },
  { g: 'mening', w: 0.5, pts: [[-0.16, -0.045], [-0.3, -0.05], [-0.45, -0.04], [-0.6, -0.02]] },
  // Brainstem: the trigeminal nerve's root, and its long nucleus running down into the top of the spinal cord
  { g: 'route', w: 1.5, pts: [GANGLION, PONS] },
  { g: 'route', w: 1, pts: [PONS, [-0.34, -0.2], [-0.365, -0.33], JUNCTION, [-0.37, -0.5]] },
  // Upper neck nerves (C2, C3): the back of the head and the neck muscles
  { g: 'neck', w: 0.9, pts: [[-0.372, -0.4], [-0.47, -0.43], [-0.54, -0.36], [-0.62, -0.2], [-0.668, -0.03], [-0.65, 0.15], [-0.57, 0.32]] },
  { g: 'neck', w: 0.7, pts: [[-0.372, -0.46], [-0.46, -0.49], [-0.5, -0.36], [-0.49, -0.2]] },
  { g: 'neck', w: 0.7, pts: [[-0.372, -0.52], [-0.46, -0.58], [-0.54, -0.68]] },
];

const BRAIN = [[0.235, 0.17], [0.2, 0.3], [0.12, 0.42], [0, 0.48], [-0.15, 0.505], [-0.3, 0.49], [-0.45, 0.43], [-0.57, 0.32], [-0.635, 0.18], [-0.655, 0.06],
  [-0.64, -0.04], [-0.6, -0.14], [-0.52, -0.205], [-0.43, -0.225], [-0.37, -0.19], [-0.3, -0.115], [-0.18, -0.1], [-0.06, -0.075], [0.0, -0.03], [0.02, 0.03], [0.08, 0.065], [0.17, 0.085]];
const SULCI = [
  [[0.0, 0.03], [-0.12, 0.1], [-0.28, 0.17], [-0.36, 0.22]],      // lateral fissure
  [[-0.1, 0.5], [-0.19, 0.33], [-0.16, 0.16], [-0.13, 0.11]],       // central sulcus
  [[0.12, 0.38], [0.06, 0.27], [0.1, 0.17]],
  [[-0.32, 0.48], [-0.33, 0.34], [-0.42, 0.26]],
  [[-0.5, 0.38], [-0.52, 0.24], [-0.6, 0.15]],
  [[-0.1, 0.0], [-0.22, 0.06], [-0.32, 0.06]],
  [[-0.4, -0.1], [-0.52, -0.06], [-0.645, -0.02]],                  // tentorium: above it the brain, below it the cerebellum
  [[-0.43, -0.15], [-0.53, -0.12], [-0.62, -0.08]],
  [[-0.45, -0.19], [-0.54, -0.17], [-0.6, -0.13]],
];
const STEM = [[-0.3, 0.04], PONS, [-0.34, -0.2], [-0.36, -0.28], [-0.37, -0.42], [-0.37, -0.62], [-0.36, -0.88]];
// Muscles: outline, and the lines their fibres run between (origin → insertion)
const MASSETER = [[-0.17, -0.125], [0.02, -0.115], [0.045, -0.24], [0.0, -0.44], [-0.15, -0.495], [-0.225, -0.4], [-0.21, -0.25]];
const TEMPORALIS = [[0.07, 0.02], [0.09, 0.12], [0.02, 0.2], [-0.12, 0.245], [-0.28, 0.225], [-0.38, 0.14], [-0.4, 0.04], [-0.33, -0.02], [-0.2, -0.08], [-0.08, -0.19], [-0.02, -0.17], [0.04, -0.06]];
const FIBRES = {
  temporalis: [[[0.07, 0.1], [0.03, 0.18], [-0.08, 0.225], [-0.2, 0.23], [-0.3, 0.2], [-0.37, 0.12]], [[-0.03, -0.16], [-0.06, -0.17]]],
  masseter: [[[-0.15, -0.135], [0.01, -0.125]], [[-0.19, -0.44], [-0.01, -0.43]]],
  neck: [[[-0.46, -0.26], [-0.56, -0.24]], [[-0.455, -1.0], [-0.54, -1.0]]],
};
const NECK_MUSCLES = [[-0.44, -0.27], [-0.52, -0.2], [-0.58, -0.28], [-0.57, -0.45], [-0.555, -0.62], [-0.545, -0.8], [-0.54, -1.0], [-0.49, -1.05],
  [-0.455, -1.0], [-0.45, -0.8], [-0.445, -0.62], [-0.435, -0.45]];

// Where symptoms are felt (glows) in the last step
const GLOWS = [
  { at: [0.12, 0.27], r: 0.14 },  // forehead and temple
  { at: [0.17, 0.0], r: 0.09 },   // around the eye
  { at: [-0.08, -0.33], r: 0.12 }, // jaw muscles
  { at: [-0.52, -0.42], r: 0.13 }, // back of the neck
  { at: [-0.4, 0.3], r: 0.14 },   // side of the head
];

// ── What each step shows ────────────────────────────────────────
// Intensity per part: 0 hidden, about .3 in the background, 1 lit
const BASE = { brain: 0.45, mening: 0, eye: 0, route: 0, v1: 0, v2: 0, v3: 0, neck: 0, jaw: 0, glow: 0 };
const REVEAL = [['v1', 0.4], ['v2', 1.1], ['v3', 1.8], ['jaw', 1.8], ['mening', 2.6], ['neck', 3.4]]; // the map step, seconds
const MODES = {
  sense: { eye: 1, brain: 0.35 },
  route: { eye: 0.8, route: 1, brain: 0.4 },
  map: (t) => ({ eye: 0.55, route: 0.7, ...Object.fromEntries(REVEAL.map(([g, at]) => [g, t > at ? 1 : 0])) }),
  reading: { eye: 0.7, route: 0.8, v1: 0.35, v2: 0.35, v3: 0.35, mening: 0.35, neck: 0.35, jaw: 0.12 },
  weight: { eye: 1, route: 0.3, v1: 0.2, v2: 0.2, v3: 0.2, mening: 0.2, neck: 0.2, brain: 0.3 },
  figure: { eye: 1, route: 1, v1: 1, v2: 1, v3: 1, jaw: 0.7, mening: 1, neck: 1, brain: 0.5 }, // the still diagram on the page
  flood: { eye: 0.85, route: 1, v1: 0.6, v2: 0.5, v3: 0.7, mening: 0.8, neck: 0.8, jaw: 0.8, glow: 1 },
};
const LABELS = {
  sense: [{ text: 'Eye muscles', at: [0.05, 0.075], side: 't' }, { text: 'Position sensors (proprioceptors)', at: [0.11, -0.06], side: 'b', hot: true }],
  route: [{ text: 'Trigeminal nerve', at: [-0.15, -0.04], side: 't', hot: true }, { text: 'Brainstem', at: [-0.355, -0.24], side: 'r' }],
  map: [
    { text: 'Forehead and eyes', at: [0.255, 0.3], side: 'l', g: 'v1' },
    { text: 'Cheeks and upper teeth', at: [0.33, -0.21], side: 'l', g: 'v2' },
    { text: 'Jaw and chewing muscles', at: [0.24, -0.53], side: 'l', g: 'v3' },
    { text: 'Covering of the brain', at: [-0.5, 0.37], side: 'r', g: 'mening' },
    { text: 'Back of the head and neck', at: [-0.6, -0.45], side: 'r', g: 'neck' },
  ],
  weight: [{ text: 'Each eye: about 7.5 grams', at: [0.22, 0.05], side: 'l', hot: true }, { text: 'Eye muscles: strong, built not to tire', at: [0.05, -0.08], side: 'b' }],
  // Numbered for the still diagram, with a key beside it on the page
  figure: [[0.1, -0.075, 'b'], [-0.14, -0.035, 't'], [0.255, 0.3, 'l'], [0.33, -0.21, 'l'], [0.24, -0.53, 'l'], [-0.5, 0.37, 'r'], [-0.6, -0.45, 'r']]
    .map(([z, y, side], i) => ({ text: String(i + 1), at: [z, y], side, num: true })),
  flood: [
    { text: 'Headaches', at: [0.12, 0.33], side: 'l', sym: true },
    { text: 'Eye strain', at: [0.22, 0.0], side: 'l', sym: true },
    { text: 'Jaw tension', at: [0.0, -0.36], side: 'l', sym: true },
    { text: 'Neck pain', at: [-0.56, -0.5], side: 'r', sym: true },
  ],
};

// ── Drawing helpers ─────────────────────────────────────────────
function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
// A smooth curve through screen points (Catmull-Rom)
function smooth(p, closed = false) {
  const n = p.length;
  const P = (i) => (closed ? p[(i + n) % n] : p[clamp(i, 0, n - 1)]);
  let d = `M${f(p[0].x)},${f(p[0].y)}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = P(i - 1), b = P(i), c = P(i + 1), e = P(i + 2);
    d += `C${f(b.x + (c.x - a.x) / 6)},${f(b.y + (c.y - a.y) / 6)} ${f(c.x - (e.x - b.x) / 6)},${f(c.y - (e.y - b.y) / 6)} ${f(c.x)},${f(c.y)}`;
  }
  return closed ? `${d}Z` : d;
}
// A muscle: a spindle from one end to the other, widths [start, belly, end] in head units
function spindle(a, b, w, k) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const at = (t, s) => ({ x: a.x + dx * t + nx * s * k, y: a.y + dy * t + ny * s * k });
  return smooth([at(0, w[0] / 2), at(0.5, w[1] / 2), at(1, w[2] / 2), at(1, -w[2] / 2), at(0.5, -w[1] / 2), at(0, -w[0] / 2)], true);
}

/**
 * createNerves(svg, host) → overlay
 *   overlay.draw({ project, k, mode, t, dt, show })  project: [z, y] → stage pixels; k: pixels per head unit;
 *     mode: 'sense' | 'route' | 'map' | 'reading' | 'weight' | 'flood'; t: seconds into this step; show: 0..1
 *   overlay.hide()
 */
export function createNerves(svg, host) {
  // Static structure: drawn once, reshaped when the view changes
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <filter id="nv-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="nv-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <radialGradient id="nv-brain" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#f3c9cf" stop-opacity=".2"/><stop offset="1" stop-color="#c98c99" stop-opacity=".1"/></radialGradient>
    <radialGradient id="nv-hot" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff5a3c" stop-opacity=".75"/><stop offset=".55" stop-color="#ff7a3c" stop-opacity=".28"/><stop offset="1" stop-color="#ff7a3c" stop-opacity="0"/></radialGradient>
    <pattern id="nv-scan" width="6" height="3" patternUnits="userSpaceOnUse"><rect width="6" height="1" fill="rgba(92, 255, 138, .32)"/></pattern>`;
  const layer = (cls) => el('g', { class: cls }, svg);
  const L = {
    brain: layer('nv-brain'), jaw: layer('nv-jaw'), neckm: layer('nv-neckm'), glow: layer('nv-glows'), stem: layer('nv-stem'),
    nerves: layer('nv-nerves'), eye: layer('nv-eye'), dots: layer('nv-dots'),
  };
  const brain = { fill: el('path', { fill: 'url(#nv-brain)' }, L.brain), sulci: SULCI.map(() => el('path', { fill: 'none', stroke: 'rgba(255, 235, 240, .22)', 'stroke-linecap': 'round' }, L.brain)), dura: el('path', { fill: 'none', 'stroke-linejoin': 'round' }, L.brain) };
  // Muscles: a translucent body with its fibres drawn in
  const muscle = (pts, fib, layer) => ({
    pts, fib,
    body: el('path', { fill: 'rgba(200, 70, 82, .24)', stroke: 'rgba(255, 140, 140, .4)', 'stroke-width': 1 }, layer),
    fibres: el('path', { fill: 'none', stroke: 'rgba(255, 150, 155, .32)', 'stroke-width': 1, 'stroke-linecap': 'round' }, layer),
  });
  const muscles = [muscle(TEMPORALIS, FIBRES.temporalis, L.jaw), muscle(MASSETER, FIBRES.masseter, L.jaw), muscle(NECK_MUSCLES, FIBRES.neck, L.neckm)];
  const glows = GLOWS.map((g) => ({ ...g, e: el('ellipse', { fill: 'url(#nv-hot)' }, L.glow) }));
  const stem = { tube: el('path', { fill: 'none', stroke: 'rgba(190, 205, 225, .26)', 'stroke-linecap': 'round' }, L.stem), pons: el('ellipse', { fill: 'rgba(190, 205, 225, .3)' }, L.stem) };
  const groups = {};
  for (const g of ['mening', 'neck', 'v3', 'v2', 'v1', 'route']) groups[g] = el('g', { class: `nv-${g}`, filter: 'url(#nv-glow)' }, L.nerves);
  const nerves = NERVES.map((n) => ({ ...n, path: el('path', { fill: 'none', stroke: n.g === 'neck' ? NECK : n.g === 'mening' ? DURA : TRIG, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, groups[n.g]) }));
  const ganglion = el('ellipse', { fill: TRIG }, groups.route);
  const junction = el('circle', { fill: 'none', stroke: TRIG, 'stroke-width': 2 }, groups.neck);
  const eye = {
    optic: el('path', { fill: 'none', stroke: 'rgba(235, 225, 200, .6)', 'stroke-linecap': 'round' }, L.eye),
    globe: el('circle', { fill: 'rgba(8, 20, 12, .55)', stroke: '#5cff8a', 'stroke-width': 1.5 }, L.eye),
    scan: el('circle', { fill: 'url(#nv-scan)' }, L.eye),
    cornea: el('path', { fill: 'none', stroke: '#5cff8a', 'stroke-width': 1.5 }, L.eye),
    muscles: MUSCLES.map((m) => ({ ...m, path: el('path', { fill: 'rgba(222, 82, 92, .72)', stroke: 'rgba(255, 160, 160, .8)', 'stroke-width': 0.8 }, L.eye) })),
    sensors: MUSCLES.flatMap((m) => m.sensors.map((at) => ({ at, e: el('circle', { fill: '#fff1b0', filter: 'url(#nv-glow)' }, L.eye) }))),
  };
  // Hidden paths that the signals travel along
  const routes = [...ROUTES, ...SHORT].map((pts, i) => ({ pts, short: i >= ROUTES.length, path: el('path', { fill: 'none', stroke: 'none' }, svg), len: 1 }));
  const POOL = 90;
  const dots = Array.from({ length: POOL }, () => ({ e: el('circle', { fill: '#fff6cf', filter: 'url(#nv-glow)', r: 0 }, L.dots), on: false, s: 0, r: null, v: 1 }));

  // Labels (HTML, so they stay crisp and readable) and the reading clock
  const labelBox = document.createElement('div');
  labelBox.className = 'nv-labels';
  host.appendChild(labelBox);
  const labels = new Map();
  const clock = document.createElement('div');
  clock.className = 'nv-clock';
  clock.hidden = true;
  host.appendChild(clock);

  const level = { ...BASE };
  let key = '', spawnDebt = 0, burstAt = 0, buzz = 0, readT = 0, lastMode = '';
  let proj = null, k = 1, W = 0, H = 0;

  function reshape() {
    const P = (pts) => pts.map(proj);
    brain.fill.setAttribute('d', smooth(P(BRAIN), true));
    brain.dura.setAttribute('d', smooth(P(BRAIN), true));
    SULCI.forEach((s, i) => { brain.sulci[i].setAttribute('d', smooth(P(s))); brain.sulci[i].setAttribute('stroke-width', f(Math.max(0.8, 0.005 * k))); });
    for (const m of muscles) {
      m.body.setAttribute('d', smooth(P(m.pts), true));
      // Fibres: straight lines from points along the origin to matching points along the insertion
      const along = (line, t) => { const x = t * (line.length - 1), i = Math.min(line.length - 2, Math.floor(x)), u = x - i; return [line[i][0] + (line[i + 1][0] - line[i][0]) * u, line[i][1] + (line[i + 1][1] - line[i][1]) * u]; };
      let d = '';
      for (let t = 0.08; t < 0.95; t += 0.12) { const a = proj(along(m.fib[0], t)), b = proj(along(m.fib[1], t)); d += `M${f(a.x)},${f(a.y)}L${f(b.x)},${f(b.y)}`; }
      m.fibres.setAttribute('d', d);
    }
    for (const g of glows) { const c = proj(g.at); g.e.setAttribute('cx', f(c.x)); g.e.setAttribute('cy', f(c.y)); g.e.setAttribute('rx', f(g.r * k)); g.e.setAttribute('ry', f(g.r * k * 0.85)); }
    stem.tube.setAttribute('d', smooth(P(STEM)));
    stem.tube.setAttribute('stroke-width', f(0.032 * k));
    const pc = proj([-0.31, -0.06]);
    Object.entries({ cx: pc.x, cy: pc.y, rx: 0.036 * k, ry: 0.055 * k }).forEach(([a, v]) => stem.pons.setAttribute(a, f(v)));
    for (const n of nerves) { n.path.setAttribute('d', smooth(P(n.pts))); n.path.setAttribute('stroke-width', f(clamp(0.0085 * k * n.w, 1.1, 6 * n.w))); }
    const gc = proj(GANGLION);
    Object.entries({ cx: gc.x, cy: gc.y, rx: 0.03 * k, ry: 0.017 * k }).forEach(([a, v]) => ganglion.setAttribute(a, f(v)));
    ganglion.setAttribute('transform', `rotate(-18 ${f(gc.x)} ${f(gc.y)})`);
    const jc = proj(JUNCTION);
    junction.setAttribute('cx', f(jc.x)); junction.setAttribute('cy', f(jc.y));
    // The eye: globe, cornea toward the front, optic nerve and muscles to the back of the socket
    const ec = proj(EYE), fr = proj([EYE[0] + 0.1, EYE[1]]), fx = (fr.x - ec.x) / Math.hypot(fr.x - ec.x, fr.y - ec.y), fy = (fr.y - ec.y) / Math.hypot(fr.x - ec.x, fr.y - ec.y);
    for (const c of [eye.globe, eye.scan]) { c.setAttribute('cx', f(ec.x)); c.setAttribute('cy', f(ec.y)); c.setAttribute('r', f(EYE_R * k)); }
    const cc = { x: ec.x + fx * 0.032 * k, y: ec.y + fy * 0.032 * k }, cr = 0.046 * k, a0 = Math.atan2(fy, fx);
    const arc = (a) => `${f(cc.x + Math.cos(a) * cr)},${f(cc.y + Math.sin(a) * cr)}`;
    eye.cornea.setAttribute('d', `M${arc(a0 - 0.95)}A${f(cr)},${f(cr)} 0 0 1 ${arc(a0 + 0.95)}`);
    eye.optic.setAttribute('d', smooth(P([[EYE[0] - EYE_R, -0.004], [0.03, -0.004], APEX])));
    eye.optic.setAttribute('stroke-width', f(0.02 * k));
    for (const m of eye.muscles) m.path.setAttribute('d', spindle(proj(m.from), proj(m.to), m.w, k));
    for (const s of eye.sensors) { const c = proj(s.at); s.e.setAttribute('cx', f(c.x)); s.e.setAttribute('cy', f(c.y)); }
    for (const r of routes) { r.path.setAttribute('d', smooth(P(r.pts))); r.len = r.path.getTotalLength(); }
    for (const [, lab] of labels) place(lab);
  }

  function place(lab) {
    const c = proj(lab.at), gap = 8;
    const t = { l: `translate(calc(-100% - ${gap}px), -50%)`, r: `translate(${gap}px, -50%)`, t: `translate(-50%, calc(-100% - ${gap}px))`, b: `translate(-50%, ${gap}px)` }[lab.side];
    Object.assign(lab.e.style, { left: `${f(c.x)}px`, top: `${f(c.y)}px`, transform: t });
    Object.assign(lab.dot.style, { left: `${f(c.x)}px`, top: `${f(c.y)}px` });
    // Keep it on the stage
    const r = lab.e.getBoundingClientRect(), s = host.getBoundingClientRect();
    const dx = r.left < s.left + 6 ? s.left + 6 - r.left : r.right > s.right - 6 ? s.right - 6 - r.right : 0;
    if (dx) lab.e.style.left = `${f(c.x + dx)}px`;
  }

  function setLabels(list) {
    const want = new Set(list.map((l) => l.text));
    for (const [text, lab] of labels) if (!want.has(text)) { lab.e.remove(); lab.dot.remove(); labels.delete(text); }
    for (const l of list) {
      if (labels.has(l.text)) continue;
      const e = document.createElement('span');
      e.className = `nv-label${l.hot ? ' hot' : ''}${l.sym ? ' sym' : ''}${l.num ? ' num' : ''}`;
      e.textContent = l.text;
      const dot = document.createElement('i');
      dot.className = `nv-dot${l.sym ? ' sym' : ''}`;
      labelBox.append(dot, e);
      const lab = { ...l, e, dot };
      labels.set(l.text, lab);
      if (proj) place(lab);
    }
  }

  function spawn(route, v = 1) {
    const d = dots.find((p) => !p.on);
    if (!d) return;
    Object.assign(d, { on: true, s: 0, r: route, v });
  }

  return {
    draw({ project, k: scale, mode, t, dt, show }) {
      proj = project; k = scale;
      svg.toggleAttribute('hidden', false); // an SVG element has no .hidden property
      labelBox.hidden = false;
      svg.style.opacity = labelBox.style.opacity = show.toFixed(3);
      // Reshape when the view moves or resizes
      const a = project([0, 0]), b = project([0.3, 0.3]);
      const nk = `${f(a.x)},${f(a.y)},${f(b.x)},${f(b.y)},${host.clientWidth}`;
      if (nk !== key) { key = nk; W = host.clientWidth; H = host.clientHeight; reshape(); }
      if (mode !== lastMode) { lastMode = mode; readT = 0; setLabels(LABELS[mode] || []); }

      // Fade each part toward what this step shows
      const goal = { ...BASE, ...(typeof MODES[mode] === 'function' ? MODES[mode](t) : MODES[mode]) };
      for (const g of Object.keys(level)) level[g] += (goal[g] - level[g]) * (1 - Math.exp(-dt / 0.25));

      // Signals: a steady stream, bursts with every word while reading, or a flood
      let rate = 0;
      if (mode === 'sense') rate = 7;
      if (mode === 'route' || mode === 'map' || mode === 'figure') rate = 6;
      if (mode === 'weight') rate = 2;
      if (mode === 'flood') rate = 42;
      let clockText = '';
      if (mode === 'reading') {
        // Real time for the first few words, then a time-lapse to an hour of reading (150 words a minute)
        readT += dt;
        const lapse = readT < 2.6 ? 1 : Math.min(2 ** ((readT - 2.6) * 4.2), 4000);
        const sim = (rt) => (rt < 2.6 ? rt : 2.6 + (2 ** ((rt - 2.6) * 4.2) - 1) / (4.2 * Math.LN2));
        const secs = Math.min(3600, sim(readT));
        if (secs < 3600) {
          burstAt -= dt;
          while (burstAt <= 0) {
            burstAt += Math.max(0.4 / lapse, 1 / 30); // one burst of signals per word
            buzz = Math.min(1.6, buzz + 0.6);
            for (const r of routes.slice(0, 3)) if (Math.random() < 0.8) spawn(r, 1);
          }
        } else {
          // After a long stretch of reading the signals arrive in waves: the nerve almost pulses
          const throb = (0.5 + 0.5 * Math.sin(readT * 2 * Math.PI * 1.3)) ** 2;
          buzz = Math.max(buzz, 1.4 * throb);
          rate = 50 * throb;
        }
        const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
        clockText = `<b>${secs >= 3600 ? '1 hour' : `${m}:${String(s).padStart(2, '0')}`}</b> of reading · about ${Math.round(secs * 2.5).toLocaleString('en-CA')} corrections`;
      }
      buzz *= Math.exp(-dt / 0.18);
      spawnDebt += rate * dt;
      while (spawnDebt >= 1) {
        spawnDebt -= 1;
        const pick = mode === 'sense' ? routes.slice(3) : routes.slice(0, 3);
        spawn(pick[Math.floor(Math.random() * pick.length)], mode === 'flood' ? 1.4 : 1);
      }
      clock.hidden = !clockText;
      if (clockText && clock.innerHTML !== clockText) clock.innerHTML = clockText;

      // Apply
      const vis = (e, v) => { e.style.opacity = v.toFixed(3); e.style.display = v < 0.01 ? 'none' : ''; };
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      vis(L.brain, level.brain + 0.25 * level.mening);
      brain.dura.setAttribute('stroke', level.mening > 0.05 ? TRIG : 'rgba(255, 235, 240, .45)');
      brain.dura.setAttribute('stroke-width', f(1 + 1.6 * level.mening + 1.5 * level.glow * pulse));
      vis(L.jaw, level.jaw); vis(L.neckm, Math.max(level.neck, level.jaw) * 0.6);
      vis(L.glow, level.glow * (0.55 + 0.45 * pulse));
      vis(L.stem, Math.max(level.route, level.neck, 0.15 * level.brain));
      for (const g of Object.keys(groups)) vis(groups[g], g === 'route' ? Math.min(1, level.route + 0.45 * buzz) : level[g]);
      ganglion.setAttribute('filter', buzz > 0.3 ? 'url(#nv-glow)' : '');
      junction.setAttribute('r', f(clamp((0.02 + 0.012 * pulse) * k, 4, 14)));
      vis(junction, level.neck);
      vis(L.eye, Math.max(level.eye, 0.25 * level.route));
      const blink = mode === 'sense' || mode === 'flood' ? 0.5 + 0.5 * Math.sin(t * 9) : 0.6;
      for (const [i, s] of eye.sensors.entries()) s.e.setAttribute('r', f(clamp((0.006 + 0.004 * (i % 2 ? 1 - blink : blink)) * k, 1.5, 7)));
      for (const [, lab] of labels) {
        const v = lab.g ? level[lab.g] : 1;
        lab.e.style.opacity = lab.dot.style.opacity = v.toFixed(3);
      }

      // Move the signals
      const speed = mode === 'flood' ? 1.7 : 1;
      for (const d of dots) {
        if (!d.on) { if (d.e.getAttribute('r') !== '0') d.e.setAttribute('r', 0); continue; }
        d.s += (dt * speed * d.v) / (d.r.short ? 0.55 : 1.25);
        if (d.s >= 1) { d.on = false; d.e.setAttribute('r', 0); continue; }
        const p = d.r.path.getPointAtLength(d.s * d.r.len);
        d.e.setAttribute('cx', f(p.x)); d.e.setAttribute('cy', f(p.y));
        const fade = d.r.short ? 1 - d.s : d.s > 0.9 ? (1 - d.s) * 10 : 1;
        d.e.setAttribute('r', f(clamp(0.011 * k, 1.4, 5) * (0.4 + 0.6 * fade)));
      }
    },
    hide() {
      svg.toggleAttribute('hidden', true);
      labelBox.hidden = clock.hidden = true;
      lastMode = '';
      for (const d of dots) { d.on = false; d.e.setAttribute('r', 0); }
      Object.assign(level, BASE);
    },
  };
}
