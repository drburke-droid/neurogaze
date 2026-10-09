// ═══════════════════════════════════════════════════════════════
// Motility chart → most likely patterns
// ═══════════════════════════════════════════════════════════════
// The user records where each eye points in the nine cardinal positions.
// Every candidate (condition × side × severity × fixing eye) is run through the
// same teaching model and scored by how well it reproduces the chart.
// This is pattern matching against a simplified model, not a diagnosis.

import { defaultState, solve, GAZE_POSITIONS, EYES } from './engine.js';
import { CASE_BY_ID, sidedName } from './cases.js';

export const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];
const SIGMA = 4; // degrees: how closely a chart is expected to be read
// Rough relative base rates, so a common condition beats a rare one when the chart fits both
const PRIOR = { normal: 6, cn6: 1.5, cn4: 1.2, cn3: 1.2, ted: 1.2, ino: 1, blowout: 0.8, skew: 0.7, mfs: 0.5, brown: 0.5, duane: 0.5, cavsinus: 0.5 };
const UNTOUCHED_WEIGHT = 0.1; // a box the user did not edit counts as weak evidence of "normal"

/** Model prediction of both eyes in the nine positions. */
export function chartFromState(state, fixing = 'L') {
  const out = {};
  for (const k of KEYS) {
    const [H, V] = GAZE_POSITIONS[k];
    const r = solve(state, H, V, { fixing });
    out[k] = { R: { h: r.R.h, v: r.R.v }, L: { h: r.L.h, v: r.L.v } };
  }
  return out;
}

export function normalChart() { return chartFromState(defaultState()); }

// ── Candidate generation ────────────────────────────────────────
const sidesOf = (side) => (side === 'B' ? EYES : [side]);
const SEV = { complete: 'complete', marked: 'marked', partial: 'partial', mild: 'mild' };

function nerveCandidates(caseId, nerve) {
  const out = [];
  for (const side of ['R', 'L', 'B']) {
    for (const [value, sev] of [[0, SEV.complete], [0.3, SEV.marked], [0.6, SEV.partial]]) {
      out.push({ caseId, side, severity: sev, build(s) { for (const e of sidesOf(side)) s.nerves[e][nerve] = value; } });
    }
  }
  return out;
}

export function candidates() {
  const c = [{ caseId: 'normal', side: 'B', severity: '', build() {} }];
  c.push(...nerveCandidates('cn3', 3), ...nerveCandidates('cn4', 4), ...nerveCandidates('cn6', 6));
  for (const side of ['R', 'L']) {
    for (const [v, sev] of [[0, SEV.complete], [0.4, SEV.partial]]) {
      c.push({ caseId: 'cavsinus', side, severity: sev, build(s) { for (const n of [3, 4, 6]) s.nerves[side][n] = v; } });
    }
  }
  for (const side of ['R', 'L', 'B']) {
    for (const [m, sev] of [[1, SEV.complete], [0.6, SEV.partial]]) {
      c.push({ caseId: 'ino', side, severity: sev, build(s) { for (const e of sidesOf(side)) s.mlf[e] = m; } });
    }
    for (const [k, sev] of [[1, SEV.marked], [0.55, SEV.mild]]) {
      c.push({ caseId: 'ted', side, severity: sev, build(s) { for (const e of sidesOf(side)) { s.tight[e].IR = 0.7 * k; s.tight[e].MR = 0.45 * k; } } });
    }
  }
  for (const side of ['R', 'L']) {
    for (const [k, sev] of [[1, SEV.marked], [0.6, SEV.mild]]) {
      c.push({ caseId: 'blowout', side, severity: sev, build(s) { s.tight[side].IR = 0.85 * k; s.muscles[side].IR = 1 - 0.25 * k; } });
    }
    c.push({ caseId: 'brown', side, severity: '', build(s) { s.brown[side] = 1; } });
    c.push({ caseId: 'duane', side, severity: '', build(s) { s.duane[side] = 1; } });
    for (const [d, sev] of [[2.5, 'small'], [5, 'large']]) {
      c.push({ caseId: 'skew', side, severity: sev, build(s) { s.skew[side] = -d; s.skew[side === 'R' ? 'L' : 'R'] = d; } });
    }
  }
  c.push({ caseId: 'mfs', side: 'B', severity: '', build(s) { CASE_BY_ID.mfs.apply(s, 'B'); } });
  return c;
}

// ── Scoring ─────────────────────────────────────────────────────
function sse(a, b, weights) {
  let e = 0;
  for (const k of KEYS) for (const eye of EYES) {
    const dh = a[k][eye].h - b[k][eye].h, dv = a[k][eye].v - b[k][eye].v;
    e += (weights ? weights[k] : 1) * (dh * dh + dv * dv);
  }
  return e;
}

/**
 * Rank conditions for an observed chart.
 * Returns [{ caseId, side, label, probability, severity, fixing, rms }] best first,
 * pooled by condition + side (severities and fixing eye are folded in).
 */
export function rankPatterns(observed, edited = null) {
  // Positions the user did not touch count as a soft "probably normal"
  const weights = edited && edited.size ? Object.fromEntries(KEYS.map((k) => [k, edited.has(k) ? 1 : UNTOUCHED_WEIGHT])) : null;
  const wsum = weights ? KEYS.reduce((a, k) => a + weights[k], 0) : KEYS.length;
  const scored = [];
  for (const cand of candidates()) {
    const s = defaultState();
    cand.build(s);
    for (const fixing of EYES) {
      const pred = chartFromState(s, fixing);
      const err = sse(observed, pred, weights);
      // Fit quality judged on the positions actually charted
      const fitErr = weights ? sse(observed, pred, Object.fromEntries(KEYS.map((k) => [k, edited.has(k) ? 1 : 0]))) / (edited.size * 4) : err / (KEYS.length * 4);
      scored.push({ cand, fixing, err, fitErr });
    }
  }
  const best = Math.min(...scored.map((x) => x.err));
  // Priors: each condition + side counts once however many severities it has;
  // "normal" starts ahead so a pathology must be supported by the chart.
  const perGroup = new Map();
  for (const x of scored) { const k = `${x.cand.caseId}|${x.cand.side}`; perGroup.set(k, (perGroup.get(k) || 0) + 1); }
  // Likelihood with Gaussian reading error; subtract best for numerical stability
  for (const x of scored) {
    const k = `${x.cand.caseId}|${x.cand.side}`;
    const prior = (PRIOR[x.cand.caseId] ?? 1) / perGroup.get(k);
    x.w = prior * Math.exp(-((x.err - best) * KEYS.length / wsum) / (2 * SIGMA * SIGMA));
  }
  const total = scored.reduce((a, x) => a + x.w, 0);
  const groups = new Map();
  for (const x of scored) {
    const key = `${x.cand.caseId}|${x.cand.side}`;
    const g = groups.get(key) || { caseId: x.cand.caseId, side: x.cand.side, probability: 0, top: null };
    g.probability += x.w / total;
    if (!g.top || x.err < g.top.err) g.top = x;
    groups.set(key, g);
  }
  return [...groups.values()]
    .sort((a, b) => b.probability - a.probability)
    .map((g) => ({
      caseId: g.caseId,
      side: g.side,
      label: labelFor(g.caseId, g.side),
      probability: g.probability,
      severity: g.top.cand.severity,
      fixing: g.top.fixing,
      rms: Math.sqrt(g.top.fitErr),
    }));
}

export function labelFor(caseId, side) {
  return caseId === 'normal' ? 'Normal motility' : sidedName(caseId, side);
}

// ── Plain-language findings from the chart itself ───────────────
// Compares each eye with where a healthy eye would be in that position.
export function describeFindings(observed) {
  const normal = normalChart();
  const out = [];
  const eyeName = { R: 'Right eye', L: 'Left eye' };
  const check = (eye, key, comp, sign, what) => {
    const d = (observed[key][eye][comp] - normal[key][eye][comp]) * sign;
    return d < -6 ? `${what} limited by about ${Math.round(-d)}°` : d > 6 ? `${what} overshoots by about ${Math.round(d)}°` : null;
  };
  for (const eye of EYES) {
    const abdKey = eye === 'R' ? '4' : '6', addKey = eye === 'R' ? '6' : '4';
    const items = [
      check(eye, abdKey, 'h', 1, 'abduction'),
      check(eye, addKey, 'h', -1, 'adduction'),
      check(eye, '8', 'v', 1, 'elevation'),
      check(eye, '2', 'v', -1, 'depression'),
      check(eye, eye === 'R' ? '9' : '7', 'v', 1, 'elevation in adduction'),
      check(eye, eye === 'R' ? '3' : '1', 'v', -1, 'depression in adduction'),
    ].filter(Boolean);
    if (items.length) out.push(`${eyeName[eye]}: ${items.join('; ')}.`);
  }
  // Straight-ahead alignment
  const p = observed['5'];
  const H = -(p.R.h + p.L.h), V = p.R.v - p.L.v;
  const align = [];
  if (Math.abs(H) >= 2) align.push(`${H > 0 ? 'esotropia' : 'exotropia'} about ${Math.round(Math.abs(H))}°`);
  if (Math.abs(V) >= 2) align.push(`${V > 0 ? 'right' : 'left'} hypertropia about ${Math.round(Math.abs(V))}°`);
  out.push(align.length ? `Straight ahead: ${align.join(', ')}.` : 'Straight ahead: eyes aligned.');
  return out;
}
