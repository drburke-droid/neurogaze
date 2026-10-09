// ═══════════════════════════════════════════════════════════════
// Oculomotor teaching model (pure functions, no three.js)
// ═══════════════════════════════════════════════════════════════
//
// A qualitative model, not a biomechanical simulation. It aims to get the
// clinically important directions right:
//   • ductions are limited to physiological ranges;
//   • paresis (weak muscle) and restriction (tight muscle) are different;
//   • paralytic deviations are incomitant (largest in the paretic field);
//   • Hering's law: both eyes receive the same command, set by the fixing eye,
//     so a paretic fixing eye produces a larger (secondary) deviation;
//   • vertical action shifts from the recti (abduction) to the obliques (adduction);
//   • supranuclear lesions (MLF, skew) act on commands, not on muscles.
//
// Conventions
//   eye        'R' | 'L'
//   gaze H     degrees, + = patient looks to THEIR right
//   gaze V     degrees, + = up
//   per-eye h  degrees, + = abduction (temporal), − = adduction (nasal)

export const MUSCLES = ['LR', 'MR', 'SR', 'IR', 'SO', 'IO'];
export const EYES = ['R', 'L'];
export const NERVE_OF = { LR: 6, MR: 3, SR: 3, IR: 3, IO: 3, SO: 4 };
export const MUSCLE_NAMES = {
  LR: 'Lateral rectus', MR: 'Medial rectus', SR: 'Superior rectus',
  IR: 'Inferior rectus', SO: 'Superior oblique', IO: 'Inferior oblique',
};
// Monocular duction limits (degrees)
export const RANGE = { abd: 50, add: 45, up: 40, down: 55 };
const PARALYSED_LIMIT = -12; // a muscle with no force cannot pull the eye past this

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const each = (fn) => Object.fromEntries(MUSCLES.map((m) => [m, fn(m)]));

export function defaultState() {
  return {
    nerves: { R: { 3: 1, 4: 1, 6: 1 }, L: { 3: 1, 4: 1, 6: 1 } }, // 1 normal, 0.5 paresis, 0 palsy
    muscles: { R: each(() => 1), L: each(() => 1) },               // contractile strength
    tight: { R: each(() => 0), L: each(() => 0) },                 // restriction 0..1
    brown: { R: 0, L: 0 },     // SO tendon restriction: limits elevation in adduction
    mlf: { R: 0, L: 0 },       // MLF lesion: ipsilateral adduction fails on versions only
    skew: { R: 0, L: 0 },      // supranuclear vertical offset (deg, + up), comitant
    duane: { R: 0, L: 0 },     // Duane type I: no abduction, retraction on adduction
    fatigue: null,             // myasthenia: { severity, f: { R: {...}, L: {...} } }
    lid: { R: 0, L: 0 },       // ptosis: 0 none … 1 complete
    pupil: { R: 1, L: 1 },     // pupil size relative to normal: 2 dilated, 0.55 small
  };
}

export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }

/** Effective contractile strength of one muscle (0..1). */
export function strength(state, eye, m) {
  let s = state.nerves[eye][NERVE_OF[m]] * state.muscles[eye][m];
  if (state.fatigue) s *= 1 - state.fatigue.severity * state.fatigue.f[eye][m];
  return clamp(s, 0, 1);
}

/** How much of vertical action is carried by the obliques, given adduction (deg). */
export function obliqueShare(add) { return 0.1 + 0.75 * smoothstep(-10, 40, add); }

// Gain of the plant for a given muscle strength. A healthy muscle follows the
// command 1:1; a paretic one under-acts, more so the weaker it is.
const gain = (s) => 0.15 + 0.85 * s;
// Furthest the eye can be pulled in a muscle's field of action.
const reach = (range, s) => lerp(PARALYSED_LIMIT, range, Math.pow(s, 0.6));

function eyeParams(state, eye) {
  const s = Object.fromEntries(MUSCLES.map((m) => [m, strength(state, eye, m)]));
  const t = state.tight[eye];
  return { s, t, mlf: state.mlf[eye], brown: state.brown[eye], skew: state.skew[eye], duane: state.duane[eye] };
}

function horizontalLimits(p) {
  let abd = reach(RANGE.abd, p.s.LR);
  let add = reach(RANGE.add, p.s.MR);
  abd = Math.min(abd, lerp(RANGE.abd, -2, p.t.MR));  // tight MR: abduction restricted
  add = Math.min(add, lerp(RANGE.add, -2, p.t.LR));  // tight LR: adduction restricted
  if (p.duane) abd = Math.min(abd, 2);
  return { abd, add };
}

function horizontalBias(p) {
  // Tonic imbalance pulls toward the stronger / tighter muscle (+ = abduction)
  let b = -(1 - p.s.LR) * 6 + (1 - p.s.MR) * 6 - p.t.MR * 5 + p.t.LR * 5;
  if (p.duane) b = -2; // type I: small esotropia (or ortho) in primary despite absent abduction
  return b;
}

function verticalTerms(p, add) {
  const w = obliqueShare(add);
  const eUp = (1 - w) * p.s.SR + w * p.s.IO;
  const eDown = (1 - w) * p.s.IR + w * p.s.SO;
  const kr = 1.5 + 3 * (1 - w), ko = 2.5 + 5 * w;
  let bias = (1 - p.s.IR) * kr - (1 - p.s.SR) * kr + (1 - p.s.SO) * ko - (1 - p.s.IO) * ko
    - p.t.IR * 5 + p.t.SR * 5 + p.skew;
  let up = reach(RANGE.up, eUp);
  let down = reach(RANGE.down, eDown);
  up = Math.min(up, lerp(RANGE.up, -3, p.t.IR));        // tight IR: elevation restricted
  down = Math.min(down, lerp(RANGE.down, -3, p.t.SR));  // tight SR: depression restricted
  if (p.brown) up = Math.min(up, lerp(RANGE.up, -2, p.brown * smoothstep(-5, 25, add)));
  return { w, eUp, eDown, bias, up, down };
}

/** Position of one eye for a given (yoked) command. Returns per-eye h (abd +) and v. */
export function eyePosition(state, eye, cmdH, cmdV, conv = 0) {
  const p = eyeParams(state, eye);
  const abdCmd = eye === 'R' ? cmdH : -cmdH;
  const gAbd = gain(p.s.LR) * (p.duane ? 0 : 1);
  const gAdd = gain(p.s.MR) * (1 - 0.85 * p.mlf);      // MLF: versions only
  const version = abdCmd >= 0 ? abdCmd * gAbd : abdCmd * gAdd;
  const vergence = -conv * gain(p.s.MR);               // convergence spared by MLF lesions
  const lim = horizontalLimits(p);
  const h = clamp(horizontalBias(p) + version + vergence, -lim.add, lim.abd);
  const vt = verticalTerms(p, -h);
  const g = cmdV >= 0 ? gain(vt.eUp) : gain(vt.eDown);
  const v = clamp(vt.bias + cmdV * g, -vt.down, vt.up);
  return { h, v, w: vt.w };
}

/**
 * Solve both eyes for a gaze target.
 * Hering: the fixing eye sets the innervation; both eyes receive it.
 */
export function solve(state, gazeH, gazeV, { fixing = 'L', near = false } = {}) {
  const conv = near ? 6 : 0; // ≈ 33 cm, per eye
  const p = eyeParams(state, fixing);
  const sign = fixing === 'R' ? 1 : -1;

  // Horizontal command needed by the fixing eye (desired h = gaze − convergence)
  const desiredH = sign * gazeH - conv;
  const verg = -conv * gain(p.s.MR);
  let need = desiredH - horizontalBias(p) - verg;
  const g = need >= 0 ? gain(p.s.LR) * (p.duane ? 0 : 1) : gain(p.s.MR) * (1 - 0.85 * p.mlf);
  let abdCmd = g > 0.01 ? need / g : need;
  abdCmd = clamp(abdCmd, sign * gazeH - 25, sign * gazeH + 25) ; // effort is finite
  abdCmd = clamp(abdCmd, -70, 70);
  const cmdH = sign * abdCmd;

  // Vertical command needed by the fixing eye, given where it ends up horizontally
  const fixPos = eyePosition(state, fixing, cmdH, 0, conv);
  const vt = verticalTerms(p, -fixPos.h);
  const gv = gazeV - vt.bias >= 0 ? gain(vt.eUp) : gain(vt.eDown);
  let cmdV = (gazeV - vt.bias) / Math.max(gv, 0.01);
  cmdV = clamp(cmdV, gazeV - 20, gazeV + 20);

  const out = { cmdH, cmdV, conv, fixing };
  for (const eye of EYES) {
    const pos = eyePosition(state, eye, cmdH, cmdV, conv);
    out[eye] = { ...pos, activity: activity(state, eye, cmdH, cmdV, conv, pos) };
  }
  // Deviation relative to where each eye should point for this target.
  // + horizontal = eso (eyes more adducted than needed), + vertical = right eye higher.
  const idealR = gazeH - conv, idealL = -gazeH - conv;
  out.deviation = {
    horizontal: (idealR - out.R.h) + (idealL - out.L.h),
    vertical: out.R.v - out.L.v,
  };
  return out;
}

/**
 * Innervation ("effort") sent to each muscle, identical for yoke muscles (Hering),
 * with reciprocal inhibition of the antagonist (Sherrington), and the force the
 * muscle actually delivers (effort × strength). Both 0..1.5, rest ≈ 0.
 */
export function activity(state, eye, cmdH, cmdV, conv, pos) {
  const abdCmd = eye === 'R' ? cmdH : -cmdH;
  const w = pos.w;
  const e = {
    LR: Math.max(0, abdCmd) / RANGE.abd,
    MR: (Math.max(0, -abdCmd) + conv) / RANGE.add,
    SR: (Math.max(0, cmdV) * (1 - w)) / RANGE.up,
    IO: (Math.max(0, cmdV) * w) / RANGE.up,
    IR: (Math.max(0, -cmdV) * (1 - w)) / RANGE.down,
    SO: (Math.max(0, -cmdV) * w) / RANGE.down,
  };
  if (state.duane[eye]) e.LR = Math.max(e.LR, 0.6 * Math.max(0, -pos.h) / RANGE.add); // co-contraction
  const out = {};
  for (const m of MUSCLES) {
    const effort = clamp(e[m], 0, 1.5);
    out[m] = { effort, force: effort * strength(state, eye, m) };
  }
  return out;
}

/** Myasthenic fatigue: muscles tire while working and recover at rest. */
export function stepFatigue(state, solution, dt) {
  if (!state.fatigue) return false;
  let changing = false;
  for (const eye of EYES) {
    for (const m of MUSCLES) {
      const work = solution[eye].activity[m].effort;
      const f0 = state.fatigue.f[eye][m];
      const f1 = work > 0.3 ? f0 + dt * work / 7 : f0 - dt / 12;
      state.fatigue.f[eye][m] = clamp(f1, 0, 1);
      if (Math.abs(f1 - f0) > 1e-4 && f1 > 0 && f1 < 1) changing = true;
    }
  }
  return changing;
}

/** Health class of a muscle for display. */
export function muscleState(state, eye, m) {
  const s = state.nerves[eye][NERVE_OF[m]] * state.muscles[eye][m];
  if (state.tight[eye][m] > 0 || (m === 'SO' && state.brown[eye] > 0)) return 'restricted';
  if (s <= 0.001) return 'palsy';
  if (s < 0.999 || state.fatigue) return 'paresis';
  return 'normal';
}

/** Prism dioptres from degrees. */
/** Upper-lid ptosis actually shown, including myasthenic fatigue of the elevators. */
export function lidDroop(state, eye) {
  let p = state.lid[eye];
  if (state.fatigue) p += 0.6 * Math.max(state.fatigue.f[eye].SR, state.fatigue.f[eye].IO);
  return Math.min(1, p);
}

export const PUPIL = { normal: 1, dilated: 2, small: 0.55 };

export const prism = (deg) => Math.round(100 * Math.tan((Math.abs(deg) * Math.PI) / 180));

/** Plain-language deviation, e.g. "ET 14° (25Δ) · R hyper 4° (7Δ)". */
export function describeDeviation(dev, near) {
  const parts = [];
  const H = dev.horizontal, V = dev.vertical;
  if (Math.abs(H) >= 1) parts.push(`${H > 0 ? (near ? 'ET′' : 'ET') : (near ? 'XT′' : 'XT')} ${Math.abs(H).toFixed(0)}° (${prism(H)}Δ)`);
  if (Math.abs(V) >= 1) parts.push(`${V > 0 ? 'R/L' : 'L/R'} ${Math.abs(V).toFixed(0)}° (${prism(V)}Δ)`);
  return parts.length ? parts.join(' · ') : 'Orthotropic';
}

export const GAZE_POSITIONS = {
  // key: [H (+ patient's right), V (+ up)], laid out as the examiner sees the patient
  7: [30, 25], 8: [0, 25], 9: [-30, 25],
  4: [30, 0], 5: [0, 0], 6: [-30, 0],
  1: [30, -25], 2: [0, -25], 3: [-30, -25],
};
export const GAZE_NAMES = {
  7: 'up and to the right', 8: 'up', 9: 'up and to the left',
  4: 'right', 5: 'straight ahead', 6: 'left',
  1: 'down and to the right', 2: 'down', 3: 'down and to the left',
};
