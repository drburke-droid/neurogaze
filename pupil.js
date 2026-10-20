// ═══════════════════════════════════════════════════════════════
// Pupil teaching model (pure functions, no three.js)
// ═══════════════════════════════════════════════════════════════
//
// A qualitative model of the pupil pathways, tuned to get the clinical
// directions right rather than exact millimetres:
//   • each eye's light signal reaches both Edinger–Westphal nuclei, so both
//     pupils respond to light in either eye (direct and consensual), and
//     a weak optic nerve (RAPD) makes both pupils respond less;
//   • the iris sphincter (parasympathetic, CN III) constricts the pupil for
//     light and near; the dilator (sympathetic) sets how wide it can open;
//   • reactions have a latency, constrict faster than they dilate, and
//     partly wear off under a steady light (pupillary escape).
//
// Diameters are in millimetres. Light reaches each eye from the room and,
// optionally, a penlight held in front of one eye.

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const other = (eye) => (eye === 'R' ? 'L' : 'R');

/** Per-eye pupil pathway settings. 1 = intact. */
export function normalPupil() {
  return {
    afferent: 1,  // light signal carried by this eye's optic nerve (RAPD < 1)
    para: 1,      // parasympathetic supply to the sphincter (CN III)
    symp: 1,      // sympathetic supply to the dilator (Horner = 0)
    light: 1,     // light-reflex input to this eye's Edinger–Westphal nucleus (Argyll Robertson = 0)
    tonic: 0,     // Adie: sphincter reinnervated by accommodative fibres
    block: 0,     // anticholinergic drug occupying the sphincter's receptors
    tone: 0,      // extra resting sphincter tone (constriction), arbitrary units
    offset: 0,    // fixed size difference (physiological anisocoria), mm
    irregular: 0, // irregular pupil outline, 0..1 (drawing only)
  };
}

export const ROOM = { bright: 1, dim: 0.06 };
const PEN = 12;            // penlight luminance relative to a bright room
const NEAR = 0.85;         // sphincter drive of the near response
const LATENCY = 0.22;      // s, light/near reflex latency
const DMIN = 1.5, SPAN = 6.7; // mm: fully constricted, and the range a normal iris can open beyond it

export const DROPS = {
  pilo01: 'Pilocarpine 0.1%',
  pilo1: 'Pilocarpine 1%',
  apra: 'Apraclonidine 0.5%',
};

// Pupillomotor response to retinal illuminance (log-like, 1 for a bright room)
const lum = (L) => Math.log10(1 + 9 * L);

/** Light falling on one eye: room light plus the penlight if it points at that eye. */
export function illuminance(exam, eye) {
  return (ROOM[exam.room] ?? ROOM.bright) + (exam.light === eye ? PEN : 0);
}

// Pretectal light signal reaching one Edinger–Westphal nucleus. Input from the
// two eyes sums only partly (binocular summation is incomplete), and the direct
// eye counts slightly more than the fellow eye.
function pretectal(pupil, exam, eye) {
  const o = other(eye);
  const fe = lum(pupil[eye].afferent * illuminance(exam, eye));
  const fo = lum(pupil[o].afferent * illuminance(exam, o));
  return 0.6 * Math.max(fe, fo) + 0.4 * (0.51 * fe + 0.49 * fo);
}

/**
 * Instantaneous drives for both eyes, before any latency or kinetics.
 * exam = { room: 'bright'|'dim', light: 'R'|'L'|null, near: bool, drop: null|'pilo01'|'pilo1'|'apra' }
 */
export function pupilDrive(pupil, exam) {
  const out = {};
  const roomOnly = { ...exam, light: null };
  for (const eye of ['R', 'L']) {
    const p = pupil[eye];
    const sphincter = p.para * (1 - p.block);       // can the nerve drive the sphincter?
    const lightGain = sphincter * p.light * (p.tonic ? 0.08 : 1);
    const P = pretectal(pupil, exam, eye);
    let drugC = 0, drugD = 0;
    if (exam.drop === 'pilo01') drugC = (1 - p.block) * (p.tonic ? 1.6 : 0.12); // denervation supersensitivity
    if (exam.drop === 'pilo1') drugC = (1 - p.block) * 2.2;
    if (exam.drop === 'apra') drugD = 2.2 * (1 - p.symp) - 0.6 * p.symp; // supersensitive dilator in Horner; slight miosis otherwise
    out[eye] = {
      light: lightGain * P,
      excess: lightGain * Math.max(0, P - pretectal(pupil, roomOnly, eye)), // penlight above room light
      near: exam.near ? sphincter * NEAR * (p.tonic ? 1.4 : 1) : 0,
      tone: p.tone * (1 - p.block),
      drugC, drugD,
    };
  }
  return out;
}

/** Diameter (mm) for a sphincter activation c and extra dilator drive. */
export function diameter(p, c, dilate = 0) {
  const dmax = DMIN + SPAN * (0.7 + 0.3 * p.symp) + 0.6 * p.block + dilate;
  return clamp(DMIN + (dmax - DMIN) * Math.exp(-c) + p.offset, 1.2, 9.5);
}

/** Steady-state diameters (after reactions settle, before pupillary escape). */
export function steadyPupils(pupil, exam) {
  const d = pupilDrive(pupil, exam);
  const out = {};
  for (const eye of ['R', 'L']) {
    const x = d[eye];
    out[eye] = diameter(pupil[eye], x.light + x.near + x.tone + x.drugC, x.drugD);
  }
  return out;
}

/** Upper-lid lift from apraclonidine in Horner syndrome (Müller's muscle), 0..0.2. */
export const lidLift = (p, apra) => 0.2 * apra * (1 - p.symp);

/**
 * Time course of both pupils. step() advances by dt seconds and returns
 * { R: { mm, lift }, L: { mm, lift } }; snap() jumps straight to steady state.
 */
export function createPupilKinetics() {
  let now = 0;
  let queue = [];
  const s = { R: null, L: null };
  let moving = false;

  const approach = (cur, target, tau, dt) => cur + (target - cur) * (1 - Math.exp(-dt / tau));

  function output(pupil, d) {
    const out = {};
    for (const eye of ['R', 'L']) {
      const p = pupil[eye], k = s[eye];
      out[eye] = {
        mm: diameter(p, k.light + k.near + d[eye].tone + k.drugC, k.drugD),
        lift: lidLift(p, k.apra),
      };
    }
    return out;
  }

  function snap(pupil, exam) {
    const d = pupilDrive(pupil, exam);
    queue = [{ t: now - LATENCY, d }];
    for (const eye of ['R', 'L']) {
      const x = d[eye];
      const h = clamp(x.excess / 1.2, 0, 1);
      s[eye] = { light: x.light * (1 - 0.2 * h), near: x.near, drugC: x.drugC, drugD: x.drugD, apra: exam.drop === 'apra' ? 1 : 0, h };
    }
    moving = false;
    return output(pupil, d);
  }

  function step(pupil, exam, dt) {
    if (!s.R) return snap(pupil, exam);
    now += dt;
    queue.push({ t: now, d: pupilDrive(pupil, exam) });
    while (queue.length > 1 && queue[1].t <= now - LATENCY) queue.shift();
    const d = queue[0].d; // what the pupils are responding to, one latency ago
    moving = queue.length > 1 && JSON.stringify(queue[0].d) !== JSON.stringify(queue[queue.length - 1].d);
    for (const eye of ['R', 'L']) {
      const p = pupil[eye], k = s[eye], x = d[eye];
      const tonic = p.tonic > 0;
      const dilTau = 1.2 + 3 * (1 - p.symp); // redilation is slower than constriction, slower still with a weak dilator (dilation lag)
      const hTarget = clamp(x.excess / 1.2, 0, 1);
      k.h = approach(k.h, hTarget, hTarget > k.h ? 2.5 : 1.5, dt);
      const lt = x.light * (1 - 0.2 * k.h); // pupillary escape under a steady light
      k.light = approach(k.light, lt, lt > k.light ? (tonic ? 2 : 0.25) : (tonic ? 4 : dilTau), dt);
      k.near = approach(k.near, x.near, x.near > k.near ? (tonic ? 3 : 0.5) : (tonic ? 8 : dilTau + 0.2), dt);
      k.drugC = approach(k.drugC, x.drugC, 1.5, dt);
      k.drugD = approach(k.drugD, x.drugD, 1.5, dt);
      k.apra = approach(k.apra, exam.drop === 'apra' ? 1 : 0, 1.5, dt);
      if (Math.abs(k.light - lt) > 0.002 || Math.abs(k.near - x.near) > 0.002 || Math.abs(k.h - hTarget) > 0.01
        || Math.abs(k.drugC - x.drugC) > 0.002 || Math.abs(k.drugD - x.drugD) > 0.002 || Math.abs(k.apra - (exam.drop === 'apra' ? 1 : 0)) > 0.002) moving = true;
    }
    return output(pupil, d);
  }

  return { step, snap, get moving() { return moving; } };
}

/** Short label for one eye's pupil settings. */
export function pupilKind(p) {
  if (p.block > 0.5) return 'drug';
  if (p.para < 0.5 && p.symp < 0.5) return 'fixed-mid';
  if (p.para < 0.5) return 'dilated';
  if (p.tonic) return 'tonic';
  if (p.symp < 0.5) return 'small';
  if (p.light < 0.5) return 'light-near';
  if (p.afferent < 0.5) return 'rapd';
  if (Math.abs(p.offset) > 0.05) return p.offset < 0 ? 'smaller' : 'larger';
  return 'normal';
}

/** True if two pupil settings are the same. */
export const samePupil = (a, b) => Object.keys(a).every((k) => Math.abs(a[k] - b[k]) < 1e-6);
