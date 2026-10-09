// Round-trip tests: chart a known case with the model, then check the matcher recovers it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../engine.js';
import { CASE_BY_ID } from '../cases.js';
import { chartFromState, rankPatterns, describeFindings, KEYS } from '../diagnose.js';

const chartOf = (id, side, fixing = side === 'R' ? 'L' : 'R') => {
  const s = defaultState(); CASE_BY_ID[id].apply(s, side); return chartFromState(s, fixing);
};
// Simulate a clinician's imprecise reading: ±2° jitter, deterministic
const jitter = (chart) => {
  let i = 0; const out = {};
  for (const k of KEYS) out[k] = {
    R: { h: chart[k].R.h + Math.sin(i++ * 1.7) * 2, v: chart[k].R.v + Math.cos(i++ * 2.3) * 2 },
    L: { h: chart[k].L.h + Math.sin(i++ * 3.1) * 2, v: chart[k].L.v + Math.cos(i++ * 0.9) * 2 },
  };
  return out;
};

const CASES = [
  ['cn6', 'R'], ['cn6', 'L'], ['cn4', 'R'], ['cn4', 'L'], ['cn3', 'R'], ['cn3', 'L'],
  ['ino', 'R'], ['ino', 'L'], ['ted', 'R'], ['blowout', 'L'], ['brown', 'R'], ['duane', 'L'],
  ['skew', 'R'], ['cavsinus', 'L'], ['cn6', 'B'], ['normal', 'B'],
];

for (const [id, side] of CASES) {
  test(`recovers ${side} ${id} from a slightly imprecise chart`, () => {
    const ranked = rankPatterns(jitter(chartOf(id, side)));
    const top = ranked[0];
    assert.equal(`${top.caseId}|${top.side}`, `${id}|${side}`, `top was ${top.label} (${(top.probability * 100).toFixed(0)}%), then ${ranked[1].label}`);
    assert.ok(top.probability > 0.4, `confidence ${top.probability}`);
  });
}

test('findings describe an abduction deficit for a right sixth nerve palsy', () => {
  const f = describeFindings(chartOf('cn6', 'R'));
  assert.ok(f.some((l) => /Right eye: abduction limited/.test(l)), f.join(' | '));
  assert.ok(f.some((l) => /Straight ahead: esotropia/.test(l)), f.join(' | '));
});
