// ═══════════════════════════════════════════════════════════════
// Fixation disparity and trigeminal load: a teaching model (pure functions)
// ═══════════════════════════════════════════════════════════════
//
// Illustrates a proposed mechanism, not established physiology:
//   • each eye pair has a resting posture (phoria) at distance and at near;
//   • after every saccade the eyes land part of the way toward that posture,
//     slightly out of line (a transient fixation disparity);
//   • proprioceptors in the eye muscles report the error, by a proposed route
//     through the trigeminal nerve, and fusional vergence realigns the eyes;
//   • each correction adds to a "trigeminal load" that recovers slowly, and
//     other stressors raise its floor and the cost of each correction.
//
// Conventions
//   posture   prism dioptres (Δ), − = exo (eyes rest outward), + = eso (inward)
//   offsets   degrees per eye, + = abduction (outward)

const DEG = Math.PI / 180;

/** Prism dioptres to degrees. */
export const pdToDeg = (pd) => Math.atan(pd / 100) / DEG;

export const NEAR_CM = 40, PD_MM = 64;
/** Convergence of each eye for a near target, degrees of adduction. */
export const NEAR_CONVERGENCE = Math.atan(PD_MM / 20 / NEAR_CM) / DEG; // half the PD (cm) over the distance

/** Typical postures used when a visitor does not know their own. */
export const TYPICAL = { exo: { D: -1, N: -4 }, eso: { D: 2, N: 2 } };

/** Choices offered in the drop-downs: 10Δ exo to 10Δ eso in 0.5Δ steps. */
export const POSTURE_STEPS = Array.from({ length: 41 }, (_, i) => (i - 20) / 2);

export function describePosture(pd) {
  if (Math.abs(pd) < 0.01) return 'Aligned (0Δ)';
  return `${Math.abs(pd).toFixed(Math.abs(pd) % 1 ? 1 : 0)}Δ ${pd < 0 ? 'exo' : 'eso'}`;
}

/**
 * The posture to use. choice = { D: number|null, N: number|null, type: 'exo'|'eso' };
 * a null value (not known) falls back to the typical posture for `type`.
 */
export function postureFor(choice, target) {
  const v = choice[target];
  return v === null || v === undefined ? TYPICAL[choice.type === 'eso' ? 'eso' : 'exo'][target] : v;
}

// Fraction of the posture by which the eyes land out of line after a saccade (illustrative)
export const LANDING = 0.5;

/** Per-eye offset (deg, + outward) when both eyes land `fraction` of the way to their posture. */
export const landingOffset = (pd, fraction = LANDING) => (-pdToDeg(pd) * fraction) / 2;

/** Offset (deg, + outward) of an eye behind a cover: it drifts to the full posture. */
export const coveredOffset = (pd) => -pdToDeg(pd);

/** Which muscle realigns the eyes: exo needs convergence (medial rectus), eso divergence (lateral rectus). */
export const correctingMuscle = (pd) => (pd < 0 ? 'MR' : 'LR');

// ── Trigeminal load (proposed, arbitrary units; 1 = high) ──────────
export const STRESSORS = { weather: 'Weather change', stress: 'Stress', sleep: 'Poor sleep' };
export const THRESHOLD = 0.7;   // where symptoms may appear (illustrative)
const GAIN = 0.03;              // load per prism dioptre corrected
const TAU = 6;                  // s, recovery time constant

/** How much more each correction costs with other stressors present. */
export const stressMultiplier = (s) => 1 + 0.5 * !!s.weather + 0.6 * !!s.stress + 0.4 * !!s.sleep;

/** Load that stressors alone keep up, even without corrections. */
export const loadFloor = (s) => 0.1 * !!s.weather + 0.15 * !!s.stress + 0.1 * !!s.sleep;

/** Load after one correction of `correctedPd` prism dioptres. */
export const addCorrection = (load, correctedPd, s) => load + GAIN * Math.abs(correctedPd) * stressMultiplier(s);

/** Load after dt seconds of recovery. */
export function relaxLoad(load, dt, s) {
  const floor = loadFloor(s);
  return floor + (load - floor) * Math.exp(-dt / TAU);
}
