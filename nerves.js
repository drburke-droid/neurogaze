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
const EXTRA = '#ffa630'; // extra signals, from holding misaligned eyes in line and correcting them
// Moving dots glow with a soft gradient (a blur filter on each is too slow to draw): colour → gradient id.
// A dot's circle is HALO times its core radius.
const DOT_GLOWS = { '#fff6cf': 'n', [EXTRA]: 'x', '#dcecff': 'b', '#ff4d5e': 'r', '#fff1b0': 's' };
const HALO = 2.6;
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

// The main branches (also the paths that the face's own signals travel along)
const V1_MAIN = [APEX, [0.06, 0.058], [0.17, 0.082], [0.235, 0.092], [0.272, 0.18], [0.238, 0.32], [0.15, 0.43], [0.02, 0.5]];
const V2_MAIN = [[-0.215, -0.095], [-0.12, -0.078], [-0.04, -0.095], [0.08, -0.082], [0.18, -0.098], [0.25, -0.125]];
const V3_MAIN = [[-0.2, -0.21], [-0.172, -0.3], [-0.12, -0.415], [-0.02, -0.478], [0.12, -0.5], [0.262, -0.52], [0.34, -0.55]];
const MENING_MAIN = [[-0.214, -0.18], [-0.25, -0.12], [-0.245, 0.0], [-0.2, 0.18], [-0.13, 0.36], [-0.06, 0.45]];
const C2_MAIN = [[-0.372, -0.4], [-0.47, -0.43], [-0.54, -0.36], [-0.62, -0.2], [-0.668, -0.03], [-0.65, 0.15], [-0.57, 0.32]];
const DOWN = [PONS, [-0.34, -0.2], [-0.365, -0.33], JUNCTION]; // the trigeminal nucleus, down to the top of the spinal cord
const rev = (a) => [...a].reverse();
// Everything else the nerve carries, travelling in from the face, the covering of the brain and the neck
const BRANCH_ROUTES = [
  [...rev(V1_MAIN), ...TRUNK.slice(1)],
  [...rev(V2_MAIN), ...DOWN],
  [...rev(V3_MAIN), [-0.212, -0.17], GANGLION, ...DOWN],
  [...rev(MENING_MAIN), GANGLION, ...DOWN],
  [...rev(C2_MAIN), JUNCTION],
];

// Nerves: group, relative width, points
const NERVES = [
  // Ophthalmic branch (V1): the eye, the forehead and the front of the scalp
  { g: 'route', w: 1.5, pts: [GANGLION, [-0.13, -0.03], APEX] },
  { g: 'v1', w: 1, pts: V1_MAIN },
  { g: 'v1', w: 0.7, pts: [[0.235, 0.092], [0.255, 0.14], [0.212, 0.245], [0.13, 0.36], [0.0, 0.445]] },
  { g: 'v1', w: 0.55, pts: [[0.06, 0.058], [0.13, 0.05], [0.2, 0.035]] },
  // Maxillary branch (V2): the cheek, side of the nose, upper lip and upper teeth
  { g: 'v2', w: 1.2, pts: V2_MAIN },
  { g: 'v2', w: 0.7, pts: [[0.25, -0.125], [0.3, -0.105], [0.33, -0.12]] },
  { g: 'v2', w: 0.7, pts: [[0.25, -0.125], [0.31, -0.18], [0.345, -0.245]] },
  { g: 'v2', w: 0.7, pts: [[0.25, -0.125], [0.29, -0.24], [0.33, -0.33], [0.37, -0.37]] },
  { g: 'v2', w: 0.6, pts: [[-0.04, -0.095], [0.0, -0.2], [0.08, -0.31], [0.2, -0.345], [0.27, -0.35]] },
  // Mandibular branch (V3): the lower jaw, chin, lower lip, tongue, and the chewing muscles
  { g: 'v3', w: 1.4, pts: [[-0.225, -0.1], [-0.212, -0.17], [-0.2, -0.21]] },
  { g: 'v3', w: 1, pts: V3_MAIN },
  { g: 'v3', w: 0.6, pts: [[0.262, -0.52], [0.31, -0.49], [0.37, -0.465]] },
  { g: 'v3', w: 0.6, pts: [[-0.2, -0.21], [-0.12, -0.33], [0.0, -0.405], [0.14, -0.42]] },
  { g: 'v3', w: 0.7, pts: [[-0.2, -0.21], [-0.14, -0.235], [-0.09, -0.3]] },
  { g: 'v3', w: 0.6, pts: [[-0.205, -0.2], [-0.27, -0.22], [-0.29, -0.13], [-0.27, 0.05], [-0.22, 0.24]] },
  // Branches to the covering of the brain (meninges)
  { g: 'mening', w: 0.6, pts: MENING_MAIN },
  { g: 'mening', w: 0.45, pts: [[-0.245, 0.0], [-0.33, 0.12], [-0.43, 0.27], [-0.5, 0.37]] },
  { g: 'mening', w: 0.45, pts: [[-0.2, 0.18], [-0.29, 0.3], [-0.33, 0.42]] },
  { g: 'mening', w: 0.5, pts: [[-0.16, -0.045], [-0.3, -0.05], [-0.45, -0.04], [-0.6, -0.02]] },
  // Brainstem: the trigeminal nerve's root, and its long nucleus running down into the top of the spinal cord
  { g: 'route', w: 1.5, pts: [GANGLION, PONS] },
  { g: 'route', w: 1, pts: [...DOWN, [-0.37, -0.5]] },
  // Upper neck nerves (C2, C3): the back of the head and the neck muscles
  { g: 'neck', w: 0.9, pts: C2_MAIN },
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

// Where symptoms are felt, by area: a small bright spot with a soft halo and a slowly pulsing ring
const GLOWS = [
  { g: 'gHead', at: [0.2, 0.25] },    // forehead
  { g: 'gHead', at: [-0.03, 0.17] },  // temple
  { g: 'gEye', at: [0.2, 0.02] },     // the eye
  { g: 'gJaw', at: [-0.09, -0.3] },   // jaw muscles
  { g: 'gNeck', at: [-0.55, -0.43] }, // back of the neck
];

// ── What each step shows ────────────────────────────────────────
// Intensity per part: 0 hidden, about .3 in the background, 1 lit
const BASE = { brain: 0.45, mening: 0, eye: 0, route: 0, v1: 0, v2: 0, v3: 0, neck: 0, jaw: 0, built: 0, gHead: 0, gEye: 0, gJaw: 0, gNeck: 0, meter: 0 };
const BUSY = { eye: 0.8, route: 1, v1: 0.7, v2: 0.7, v3: 0.7, mening: 0.7, neck: 0.7, jaw: 0.3 };
const REVEAL = [['v1', 0.4], ['v2', 1.1], ['v3', 1.8], ['jaw', 1.8], ['mening', 2.6], ['neck', 3.4]]; // the map step, seconds
const MODES = {
  sense: { eye: 1, brain: 0.35 },
  route: { eye: 0.8, route: 1, brain: 0.4 },
  map: (t) => ({ eye: 0.55, route: 0.7, ...Object.fromEntries(REVEAL.map(([g, at]) => [g, t > at ? 1 : 0])) }),
  reading: { eye: 0.7, route: 0.8, v1: 0.35, v2: 0.35, v3: 0.35, mening: 0.35, neck: 0.35, jaw: 0.12 },
  figure: { eye: 1, route: 1, v1: 1, v2: 1, v3: 1, jaw: 0.7, mening: 1, neck: 1, brain: 0.5 }, // the still diagram on the page
  // The eye muscles, close up: light eyes, strong muscles that are built not to tire
  weight: { eye: 1, route: 0.3, v1: 0.2, v2: 0.2, v3: 0.2, mening: 0.2, neck: 0.2, brain: 0.3 },
  built: { eye: 1, route: 0.3, v1: 0.2, v2: 0.2, v3: 0.2, mening: 0.2, neck: 0.2, brain: 0.3, built: 1 },
  // Bandwidth: normal traffic plus extra from holding and correcting misaligned eyes, into one nerve that
  // everything else shares (meter: how busy it is; up to NORMAL is normal traffic)
  stream: { ...BUSY, v1: 0.3, v2: 0.3, v3: 0.3, mening: 0.3, neck: 0.3, meter: 0.62 },
  shared: { ...BUSY, meter: 0.82 },
  analogy: { ...BUSY, meter: 0.97 },
  // Too much: felt in the places the nerve looks after, first all together, then one area at a time
  overload: (t) => { const w = 0.75 * clamp((t - 0.6) / 2.5, 0, 1); return { ...BUSY, meter: 1, gHead: w, gEye: w, gJaw: w, gNeck: w }; },
  symHead: { ...BUSY, v1: 1, meter: 1, gHead: 1, gEye: 1, gJaw: 0.15, gNeck: 0.15 },
  symJaw: { ...BUSY, v3: 1, jaw: 0.9, meter: 1, gHead: 0.15, gEye: 0.15, gJaw: 1, gNeck: 0.15 },
  symNeck: { ...BUSY, neck: 1, meter: 1, gHead: 0.15, gEye: 0.15, gJaw: 0.15, gNeck: 1 },
  // Less correcting, less traffic
  calm: { eye: 0.7, route: 0.7, v1: 0.35, v2: 0.35, v3: 0.35, mening: 0.35, neck: 0.35, jaw: 0.15, meter: 0.38 },
  // For the video's opening: only the places it hurts, each appearing as it's mentioned (reveal: seconds)
  pain: (t, reveal = {}) => {
    const at = { gEye: 0.4, gHead: 1.2, gJaw: 2.0, gNeck: 2.8, ...reveal };
    return { brain: 0, ...Object.fromEntries(Object.entries(at).map(([g, s]) => [g, t > s ? 1 : 0])) };
  },
};
const NORMAL = 0.38;
// Signals a second along the eye muscle routes: normal traffic (with every eye movement, for everyone), and the
// extra from holding misaligned eyes in line and correcting them; and along the face's own branches
const RATES = { sense: 7, route: 6, map: 6, figure: 6, weight: 2, built: 2, stream: 10, shared: 10, analogy: 10, overload: 10, symHead: 10, symJaw: 10, symNeck: 10, calm: 10 };
const EXTRA_RATES = { stream: 22, shared: 22, analogy: 32, overload: 32, symHead: 24, symJaw: 24, symNeck: 24 };
const BRANCH_RATES = { shared: 10, analogy: 10, overload: 10, symHead: 8, symJaw: 8, symNeck: 8, calm: 4 }; // calm: the face still reports in, all day
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
  weight: [{ text: 'Each eye: about 7.5 grams', at: [0.22, 0.05], side: 'l', hot: true }, { text: 'Far stronger than they need to be', at: [0.05, -0.08], side: 'b' }],
  built: [
    { text: 'Their own special myosin', at: [0.05, 0.075], side: 't', g: 'built' },
    { text: 'Packed with mitochondria', at: [0.05, -0.075], side: 'b', g: 'built' },
    { text: 'Rich blood supply', at: [-0.045, 0.0], side: 'r', g: 'built' },
  ],
  stream: [{ text: 'Normal: every eye movement', at: [-0.13, -0.03], side: 't' }, { text: 'Extra: holding and correcting', at: [-0.08, -0.06], side: 'b', extra: true }],
  shared: [
    { text: 'One shared nerve', at: [-0.2, -0.06], side: 't', hot: true },
    { text: 'Forehead and eyes', at: [0.255, 0.3], side: 'l' },
    { text: 'Face and jaw', at: [0.24, -0.53], side: 'l' },
    { text: 'Covering of the brain', at: [-0.5, 0.37], side: 'r' },
    { text: 'Back of the head and neck', at: [-0.6, -0.45], side: 'r' },
  ],
  analogy: [{ text: 'A download that never stops', at: [-0.13, -0.03], side: 't', hot: true }],
  overload: [{ text: 'Too much', at: [-0.355, -0.24], side: 'r', sym: true }],
  symHead: [{ text: 'Headaches', at: [0.12, 0.33], side: 'l', sym: true }, { text: 'Eye strain', at: [0.22, 0.0], side: 'l', sym: true }],
  symJaw: [{ text: 'Jaw tension', at: [0.0, -0.36], side: 'l', sym: true }],
  symNeck: [{ text: 'Neck and shoulder pain', at: [-0.56, -0.5], side: 'r', sym: true }],
  calm: [{ text: 'Less extra traffic', at: [-0.13, -0.03], side: 't', hot: true }],
  pain: [
    { text: 'Sore, strained eyes', at: [0.22, 0.0], side: 'l', sym: true, g: 'gEye' },
    { text: 'Headaches', at: [0.23, 0.31], side: 'l', sym: true, g: 'gHead' },
    { text: 'Tight jaw', at: [-0.09, -0.36], side: 'b', sym: true, g: 'gJaw' },
    { text: 'Stiff neck', at: [-0.58, -0.43], side: 'r', sym: true, g: 'gNeck' },
  ],
  // Numbered for the still diagram, with a key beside it on the page
  figure: [[0.1, -0.075, 'b'], [-0.14, -0.035, 't'], [0.255, 0.3, 'l'], [0.33, -0.21, 'l'], [0.24, -0.53, 'l'], [-0.5, 0.37, 'r'], [-0.6, -0.45, 'r']]
    .map(([z, y, side], i) => ({ text: String(i + 1), at: [z, y], side, num: true })),
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
 *     mode: a key of MODES, or 'reading'; t: seconds into this step; show: 0..1
 *   overlay.hide()
 */
export function createNerves(svg, host) {
  // Static structure: drawn once, reshaped when the view changes
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <filter id="nv-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    ${Object.entries(DOT_GLOWS).map(([color, id]) => `<radialGradient id="nv-dot-${id}"><stop offset=".36" stop-color="${color}"/><stop offset=".55" stop-color="${color}" stop-opacity=".45"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`).join('')}
    <filter id="nv-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <radialGradient id="nv-brain" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#f3c9cf" stop-opacity=".2"/><stop offset="1" stop-color="#c98c99" stop-opacity=".1"/></radialGradient>
    <radialGradient id="nv-hot" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff4a32" stop-opacity=".7"/><stop offset=".45" stop-color="#ff6a3c" stop-opacity=".25"/><stop offset="1" stop-color="#ff6a3c" stop-opacity="0"/></radialGradient>
    <pattern id="nv-scan" width="6" height="3" patternUnits="userSpaceOnUse"><rect width="6" height="1" fill="rgba(92, 255, 138, .32)"/></pattern>`;
  // Two layers: a still one (brain, muscles, the blurred nerves), redrawn only as parts fade in and out,
  // and a live one on top for everything that moves, so the blurred nerves aren't redrawn every frame
  const live = el('svg', { class: svg.getAttribute('class'), 'aria-hidden': 'true', hidden: '' });
  svg.after(live);
  const layer = (cls, parent = svg) => el('g', { class: cls }, parent);
  const L = {
    brain: layer('nv-brain'), jaw: layer('nv-jaw'), neckm: layer('nv-neckm'), stem: layer('nv-stem'), nerves: layer('nv-nerves'),
    glow: layer('nv-glows', live), hot: layer('nv-hot', live), marks: layer('nv-marks', live), eye: layer('nv-eye', live), dots: layer('nv-dots', live),
  };
  const brain = { fill: el('path', { fill: 'url(#nv-brain)' }, L.brain), sulci: SULCI.map(() => el('path', { fill: 'none', stroke: 'rgba(255, 235, 240, .22)', 'stroke-linecap': 'round' }, L.brain)), dura: el('path', { fill: 'none', 'stroke-linejoin': 'round' }, L.brain) };
  // Muscles: a translucent body with its fibres drawn in
  const muscle = (pts, fib, layer) => ({
    pts, fib,
    body: el('path', { fill: 'rgba(200, 70, 82, .24)', stroke: 'rgba(255, 140, 140, .4)', 'stroke-width': 1 }, layer),
    fibres: el('path', { fill: 'none', stroke: 'rgba(255, 150, 155, .32)', 'stroke-width': 1, 'stroke-linecap': 'round' }, layer),
  });
  const muscles = [muscle(TEMPORALIS, FIBRES.temporalis, L.jaw), muscle(MASSETER, FIBRES.masseter, L.jaw), muscle(NECK_MUSCLES, FIBRES.neck, L.neckm)];
  const glows = GLOWS.map((g, i) => {
    const e = el('g', {}, L.glow);
    return { ...g, i, e, halo: el('circle', { fill: 'url(#nv-hot)' }, e), ring: el('circle', { fill: 'none', stroke: '#ff7a5c', 'stroke-width': 2 }, e), core: el('circle', { fill: '#ff5a3c' }, e) };
  });
  const stem = { tube: el('path', { fill: 'none', stroke: 'rgba(190, 205, 225, .26)', 'stroke-linecap': 'round' }, L.stem), pons: el('ellipse', { fill: 'rgba(190, 205, 225, .3)' }, L.stem) };
  const groups = {};
  for (const g of ['mening', 'neck', 'v3', 'v2', 'v1', 'route']) groups[g] = el('g', { class: `nv-${g}`, filter: 'url(#nv-glow)' }, L.nerves);
  const nerves = NERVES.map((n) => ({ ...n, path: el('path', { fill: 'none', stroke: n.g === 'neck' ? NECK : n.g === 'mening' ? DURA : TRIG, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, groups[n.g]) }));
  const ganglion = el('ellipse', { fill: TRIG }, groups.route);
  // Live highlights: the eye-signal route brightening with each burst, and the covering of the brain pulsing
  const routeHot = el('path', { fill: 'none', stroke: '#ffe6a0', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.hot);
  const duraHot = el('path', { fill: 'none', stroke: TRIG, 'stroke-linejoin': 'round' }, L.hot);
  const junction = el('circle', { fill: 'none', stroke: TRIG, 'stroke-width': 2 }, L.marks);
  const eye = {
    optic: el('path', { fill: 'none', stroke: 'rgba(235, 225, 200, .6)', 'stroke-linecap': 'round' }, L.eye),
    globe: el('circle', { fill: 'rgba(8, 20, 12, .55)', stroke: '#5cff8a', 'stroke-width': 1.5 }, L.eye),
    scan: el('circle', { fill: 'url(#nv-scan)' }, L.eye),
    cornea: el('path', { fill: 'none', stroke: '#5cff8a', 'stroke-width': 1.5 }, L.eye),
    muscles: MUSCLES.map((m) => ({ ...m, path: el('path', { fill: 'rgba(222, 82, 92, .72)', stroke: 'rgba(255, 160, 160, .8)', 'stroke-width': 0.8 }, L.eye) })),
    sensors: MUSCLES.flatMap((m) => m.sensors.map((at) => ({ at, e: el('circle', { fill: 'url(#nv-dot-s)' }, L.eye) }))),
    mito: el('g', {}, L.eye), // energy-producing mitochondria, scattered through the muscles
  };
  const mito = MUSCLES.flatMap((m) => Array.from({ length: 9 }, (_, i) => ({ m, t: 0.14 + 0.09 * i, side: (i % 2 ? 1 : -1) * (0.15 + 0.2 * ((i * 7) % 3) / 2), e: el('circle', { fill: '#ffb347' }, eye.mito) })));
  // Hidden paths that the signals travel along: eye muscle sensors to the brainstem (eye), sensor to the back of
  // the socket (short), the face's own branches in to the brainstem (branch), and blood along each eye muscle (blood)
  const ROUTE_KINDS = { eye: { secs: 1.25, fill: '#fff6cf' }, short: { secs: 0.55, fill: '#fff6cf' }, branch: { secs: 1.7, fill: '#dcecff' }, blood: { secs: 0.8, fill: '#ff4d5e' } };
  const route = (pts, kind) => ({ pts, kind, path: el('path', { fill: 'none', stroke: 'none' }, svg), len: 1 });
  const routes = [...ROUTES.map((p) => route(p, 'eye')), ...SHORT.map((p) => route(p, 'short')), ...BRANCH_ROUTES.map((p) => route(p, 'branch')), ...MUSCLES.map((m) => route([m.from, m.to], 'blood'))];
  const byKind = (kind) => routes.filter((r) => r.kind === kind);
  const POOL = 140;
  const dots = Array.from({ length: POOL }, () => ({ e: el('circle', { fill: 'url(#nv-dot-n)', r: 0 }, L.dots), on: false, s: 0, r: null, v: 1 }));

  // Labels (HTML, so they stay crisp and readable) and the reading clock
  const labelBox = document.createElement('div');
  labelBox.className = 'nv-labels';
  host.appendChild(labelBox);
  const labels = new Map();
  const clock = document.createElement('div');
  clock.className = 'nv-clock';
  clock.hidden = true;
  host.appendChild(clock);
  const meter = document.createElement('div');
  meter.className = 'nv-meter';
  meter.hidden = true;
  meter.innerHTML = '<span>Trigeminal traffic</span><i><b class="n"></b><b class="x"></b></i><small><em class="n"></em>normal <em class="x"></em>extra</small>';
  host.appendChild(meter);

  const level = { ...BASE };
  let key = '', spawnDebt = 0, extraDebt = 0, branchDebt = 0, bloodDebt = 0, burstAt = 0, buzz = 0, readT = 0, lastMode = '', flexed = 0;
  let proj = null, k = 1, W = 0, H = 0;

  function reshape() {
    const P = (pts) => pts.map(proj);
    brain.fill.setAttribute('d', smooth(P(BRAIN), true));
    brain.dura.setAttribute('d', smooth(P(BRAIN), true));
    duraHot.setAttribute('d', brain.dura.getAttribute('d'));
    routeHot.setAttribute('d', smooth(P(TRUNK)));
    routeHot.setAttribute('stroke-width', f(clamp(0.0085 * k * 1.5, 1.1, 9)));
    SULCI.forEach((s, i) => { brain.sulci[i].setAttribute('d', smooth(P(s))); brain.sulci[i].setAttribute('stroke-width', f(Math.max(0.8, 0.005 * k))); });
    for (const m of muscles) {
      m.body.setAttribute('d', smooth(P(m.pts), true));
      // Fibres: straight lines from points along the origin to matching points along the insertion
      const along = (line, t) => { const x = t * (line.length - 1), i = Math.min(line.length - 2, Math.floor(x)), u = x - i; return [line[i][0] + (line[i + 1][0] - line[i][0]) * u, line[i][1] + (line[i + 1][1] - line[i][1]) * u]; };
      let d = '';
      for (let t = 0.08; t < 0.95; t += 0.12) { const a = proj(along(m.fib[0], t)), b = proj(along(m.fib[1], t)); d += `M${f(a.x)},${f(a.y)}L${f(b.x)},${f(b.y)}`; }
      m.fibres.setAttribute('d', d);
    }
    for (const g of glows) {
      const c = proj(g.at);
      for (const e of [g.halo, g.ring, g.core]) { e.setAttribute('cx', f(c.x)); e.setAttribute('cy', f(c.y)); }
      g.halo.setAttribute('r', f(0.075 * k));
    }
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
    shapeMuscles(flexed);
    for (const s of eye.sensors) { const c = proj(s.at); s.e.setAttribute('cx', f(c.x)); s.e.setAttribute('cy', f(c.y)); }
    for (const d of mito) {
      const a = proj(d.m.from), b = proj(d.m.to), L2 = Math.hypot(b.x - a.x, b.y - a.y) || 1, w = d.m.w[1] * k * d.side;
      d.e.setAttribute('cx', f(a.x + (b.x - a.x) * d.t - ((b.y - a.y) / L2) * w)); d.e.setAttribute('cy', f(a.y + (b.y - a.y) * d.t + ((b.x - a.x) / L2) * w));
      d.e.setAttribute('r', f(clamp(0.0035 * k, 1, 3.2)));
    }
    for (const r of routes) { r.path.setAttribute('d', smooth(P(r.pts))); r.len = r.path.getTotalLength(); }
    for (const [, lab] of labels) place(lab);
  }

  // The eye muscles; flex (0..1) thickens their bellies as they contract
  function shapeMuscles(flex) {
    for (const m of eye.muscles) m.path.setAttribute('d', spindle(proj(m.from), proj(m.to), [m.w[0], m.w[1] * (1 + 0.28 * flex), m.w[2]], k));
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
      e.className = `nv-label${l.hot ? ' hot' : ''}${l.sym ? ' sym' : ''}${l.num ? ' num' : ''}${l.extra ? ' extra' : ''}`;
      e.textContent = l.text;
      const dot = document.createElement('i');
      dot.className = `nv-dot${l.sym ? ' sym' : ''}`;
      labelBox.append(dot, e);
      const lab = { ...l, e, dot };
      labels.set(l.text, lab);
      if (proj) place(lab);
    }
  }

  function spawn(route, v = 1, fill = ROUTE_KINDS[route.kind].fill) {
    const d = dots.find((p) => !p.on);
    if (!d) return;
    Object.assign(d, { on: true, s: 0, r: route, v });
    d.e.setAttribute('fill', `url(#nv-dot-${DOT_GLOWS[fill]})`);
  }
  const pickOf = (list) => list[Math.floor(Math.random() * list.length)];
  const roundish = (n) => (n < 1000 ? Math.round(n) : Math.round(n / 100) * 100); // a count that reads well as it climbs

  return {
    draw({ project, k: scale, mode, t, dt, show, reveal }) {
      proj = project; k = scale;
      svg.toggleAttribute('hidden', false); // an SVG element has no .hidden property
      live.toggleAttribute('hidden', false);
      labelBox.hidden = false;
      const o = show.toFixed(3);
      if (svg.style.opacity !== o) svg.style.opacity = live.style.opacity = labelBox.style.opacity = o;
      // Reshape when the view moves or resizes
      const a = project([0, 0]), b = project([0.3, 0.3]);
      const nk = `${f(a.x)},${f(a.y)},${f(b.x)},${f(b.y)},${host.clientWidth}`;
      if (nk !== key) { key = nk; W = host.clientWidth; H = host.clientHeight; reshape(); }
      if (mode !== lastMode) { lastMode = mode; readT = 0; setLabels(LABELS[mode] || []); }

      // Fade each part toward what this step shows
      const goal = { ...BASE, ...(typeof MODES[mode] === 'function' ? MODES[mode](t, reveal || undefined) : MODES[mode]) };
      for (const g of Object.keys(level)) level[g] += (goal[g] - level[g]) * (1 - Math.exp(-dt / 0.25));

      // Signals: a steady stream, bursts with every word while reading, or normal traffic plus extra
      let rate = RATES[mode] || 0, extra = EXTRA_RATES[mode] || 0;
      const busy = extra >= 20;
      let clockText = '';
      if (mode === 'reading') {
        // Real time for the first few words, then a time-lapse to an hour of reading (250 words a minute)
        readT += dt;
        const lapse = readT < 2.6 ? 1 : Math.min(2 ** ((readT - 2.6) * 4.2), 4000);
        const sim = (rt) => (rt < 2.6 ? rt : 2.6 + (2 ** ((rt - 2.6) * 4.2) - 1) / (4.2 * Math.LN2));
        const secs = Math.min(3600, sim(readT));
        if (secs < 3600) {
          burstAt -= dt;
          while (burstAt <= 0) {
            burstAt += Math.max(0.24 / lapse, 1 / 30); // every word: the normal report of the jump, plus extra for the correction
            buzz = Math.min(1.6, buzz + 0.6);
            spawn(pickOf(byKind('eye')), 1);
            for (let i = 0; i < 2; i++) spawn(pickOf(byKind('eye')), 1, EXTRA);
          }
        } else {
          // After a long stretch of reading the signals arrive in waves: the nerve almost pulses
          const throb = (0.5 + 0.5 * Math.sin(readT * 2 * Math.PI * 1.3)) ** 2;
          buzz = Math.max(buzz, 1.4 * throb);
          rate = 16 * throb;
          extra = 34 * throb;
        }
        const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
        clockText = `<b>${secs >= 3600 ? '1 hour' : `${m}:${String(s).padStart(2, '0')}`}</b> of reading · about ${roundish((secs * 250) / 60).toLocaleString('en-CA')} corrections`;
      }
      buzz *= Math.exp(-dt / 0.18);
      spawnDebt += rate * dt;
      for (; spawnDebt >= 1; spawnDebt -= 1) spawn(pickOf(byKind(mode === 'sense' ? 'short' : 'eye')), busy ? 1.3 : 1);
      extraDebt += extra * dt;
      for (; extraDebt >= 1; extraDebt -= 1) spawn(pickOf(byKind('eye')), busy ? 1.3 : 1, EXTRA);
      branchDebt += (BRANCH_RATES[mode] || 0) * dt;
      for (; branchDebt >= 1; branchDebt -= 1) spawn(pickOf(byKind('branch')), 1);
      bloodDebt += (mode === 'built' ? 14 : 0) * dt;
      for (; bloodDebt >= 1; bloodDebt -= 1) spawn(pickOf(byKind('blood')), 0.8 + 0.4 * Math.random());
      clock.hidden = !clockText;
      if (clockText && clock.innerHTML !== clockText) clock.innerHTML = clockText;

      // How busy the nerve is
      meter.hidden = !(goal.meter > 0 || level.meter > 0.02);
      if (!meter.hidden) {
        const v = clamp(level.meter * (busy ? 0.97 + 0.03 * Math.sin(t * 23) : 1), 0, 1);
        meter.querySelector('b.n').style.width = `${(100 * Math.min(v, NORMAL)).toFixed(1)}%`;
        const x = meter.querySelector('b.x');
        x.style.width = `${(100 * Math.max(0, v - NORMAL)).toFixed(1)}%`;
        x.style.background = v > 0.85 ? '#ff6a4d' : EXTRA;
      }

      // The eye muscles flex easily: they are far stronger than they need to be
      const flex = mode === 'weight' ? Math.sin(t * 2.4) ** 2 : 0;
      if (Math.abs(flex - flexed) > 0.002) { flexed = flex; shapeMuscles(flex); }

      // Apply
      const vis = (e, v) => { const o = v.toFixed(2); if (e._o !== o) { e._o = o; e.style.opacity = o; e.style.display = v < 0.01 ? 'none' : ''; } };
      const attr = (e, name, value) => { if (e.getAttribute(name) !== value) e.setAttribute(name, value); };
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      vis(L.brain, level.brain + 0.25 * level.mening);
      attr(brain.dura, 'stroke', level.mening > 0.05 ? TRIG : 'rgba(255, 235, 240, .45)');
      attr(brain.dura, 'stroke-width', f(1 + 1.6 * level.mening));
      vis(duraHot, level.gHead * clamp(level.mening / 0.5, 0, 1)); // only once the covering of the brain is shown
      if (level.gHead > 0.01) duraHot.setAttribute('stroke-width', f(1 + 1.6 * level.mening + 1.5 * level.gHead * pulse));
      vis(L.jaw, level.jaw); vis(L.neckm, Math.max(level.neck, level.jaw) * 0.6);
      for (const g of glows) {
        vis(g.e, level[g.g]);
        if (level[g.g] < 0.01) continue;
        const ph = (t * 0.7 + g.i * 0.23) % 1; // each ring pulses outward and fades, a little out of step with the others
        g.ring.setAttribute('r', f((0.02 + 0.07 * ph) * k));
        g.ring.setAttribute('opacity', (0.9 * (1 - ph)).toFixed(3));
        g.core.setAttribute('r', f(clamp((0.011 + 0.003 * pulse) * k, 2.5, 9)));
      }
      vis(eye.mito, level.built);
      vis(L.stem, Math.max(level.route, level.neck, 0.15 * level.brain));
      for (const g of Object.keys(groups)) vis(groups[g], level[g]);
      routeHot.style.opacity = clamp(0.5 * buzz * level.route, 0, 0.7).toFixed(3);
      attr(ganglion, 'filter', buzz > 0.3 || busy ? 'url(#nv-glow)' : '');
      junction.setAttribute('r', f(clamp((0.02 + 0.012 * pulse) * k, 4, 14)));
      vis(junction, level.neck);
      vis(L.eye, Math.max(level.eye, 0.25 * level.route));
      const blink = mode === 'sense' || busy ? 0.5 + 0.5 * Math.sin(t * 9) : 0.6;
      for (const [i, s] of eye.sensors.entries()) s.e.setAttribute('r', f(HALO * clamp((0.006 + 0.004 * (i % 2 ? 1 - blink : blink)) * k, 1.5, 7)));
      for (const [, lab] of labels) { vis(lab.e, lab.g ? level[lab.g] : 1); vis(lab.dot, lab.g ? level[lab.g] : 1); }

      // Move the signals
      const speed = busy ? 1.4 : 1;
      for (const d of dots) {
        if (!d.on) { if (d.e.getAttribute('r') !== '0') d.e.setAttribute('r', 0); continue; }
        const kind = d.r.kind;
        d.s += (dt * speed * d.v) / ROUTE_KINDS[kind].secs;
        if (d.s >= 1) { d.on = false; d.e.setAttribute('r', 0); continue; }
        const p = d.r.path.getPointAtLength(d.s * d.r.len);
        d.e.setAttribute('cx', f(p.x)); d.e.setAttribute('cy', f(p.y));
        const fade = kind === 'short' ? 1 - d.s : d.s > 0.9 ? (1 - d.s) * 10 : d.s < 0.1 ? d.s * 10 : 1;
        d.e.setAttribute('r', f(HALO * clamp((kind === 'blood' ? 0.006 : 0.011) * k, 1.2, 5) * (0.4 + 0.6 * fade)));
      }
    },
    hide() {
      svg.toggleAttribute('hidden', true);
      live.toggleAttribute('hidden', true);
      labelBox.hidden = clock.hidden = meter.hidden = true;
      lastMode = '';
      for (const d of dots) { d.on = false; d.e.setAttribute('r', 0); }
      Object.assign(level, BASE);
    },
  };
}
