// ═══════════════════════════════════════════════════════════════
// Fixation disparity: a teaching model (pure functions)
// ═══════════════════════════════════════════════════════════════
//
// Each pair of eyes has a resting position (posture, or phoria). When the eyes
// are not being held together they drift toward it:
//   • behind a cover, the covered eye drifts all the way to its posture;
//   • during a saccade, both eyes slip part of the way, so they land slightly
//     out of line (a transient fixation disparity) and fusion pulls them back.
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

/** Typical near postures shown: eyes that rest outward (the more common) or inward. */
export const RESTING = { exo: -4, eso: 3 };

// Fraction of the posture by which the eyes land out of line after a saccade (illustrative)
export const LANDING = 0.5;

/** Per-eye offset (deg, + outward) when both eyes land `fraction` of the way to their posture. */
export const landingOffset = (pd, fraction = LANDING) => (-pdToDeg(pd) * fraction) / 2;

/** Offset (deg, + outward) of an eye behind a cover: it drifts to the full posture. */
export const coveredOffset = (pd) => -pdToDeg(pd);
