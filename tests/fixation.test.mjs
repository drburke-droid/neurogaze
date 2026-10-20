// Tests for the fixation disparity teaching model.  Run:  node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pdToDeg, NEAR_CONVERGENCE, TYPICAL, POSTURE_STEPS, describePosture, postureFor, LANDING,
  landingOffset, coveredOffset, correctingMuscle, THRESHOLD, addCorrection, relaxLoad, loadFloor,
} from '../fixation.js';

const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;

test('units and labels', () => {
  assert.ok(near(pdToDeg(100), 45) && near(pdToDeg(0), 0) && near(pdToDeg(-4), -pdToDeg(4)));
  assert.ok(NEAR_CONVERGENCE > 4 && NEAR_CONVERGENCE < 5, `about 4.6° per eye at 40 cm (${NEAR_CONVERGENCE})`);
  assert.equal(POSTURE_STEPS.length, 41);
  assert.equal(POSTURE_STEPS[0], -10);
  assert.equal(describePosture(-4), '4Δ exo');
  assert.equal(describePosture(2.5), '2.5Δ eso');
  assert.equal(describePosture(0), 'Aligned (0Δ)');
});

test('known postures are used; unknown ones fall back to typical exo or eso', () => {
  assert.equal(postureFor({ D: -2, N: 3, type: 'exo' }, 'N'), 3);
  assert.equal(postureFor({ D: null, N: null, type: 'exo' }, 'N'), TYPICAL.exo.N);
  assert.equal(postureFor({ D: null, N: -6, type: 'eso' }, 'D'), TYPICAL.eso.D);
  assert.ok(TYPICAL.exo.N < 0 && TYPICAL.exo.D < 0 && TYPICAL.eso.N > 0 && TYPICAL.eso.D > 0);
});

test('exo lands outward, eso inward; a covered eye drifts the whole posture', () => {
  assert.ok(landingOffset(-4) > 0 && landingOffset(4) < 0);
  assert.ok(near(landingOffset(-4) * 2, pdToDeg(4) * LANDING), 'the two eyes share the landing error');
  assert.ok(near(coveredOffset(-4), pdToDeg(4)));
  assert.ok(Math.abs(coveredOffset(-4)) > Math.abs(landingOffset(-4)) * 2);
  assert.ok(near(landingOffset(0), 0) && near(coveredOffset(0), 0), 'aligned eyes have nothing to correct');
  assert.equal(correctingMuscle(-3), 'MR');
  assert.equal(correctingMuscle(3), 'LR');
});

// Reading: one correction per word, about 0.57 s per word in the demo
function readFor(seconds, pd, s) {
  let load = 0;
  for (let t = 0; t < seconds; t += 0.57) load = relaxLoad(addCorrection(load, pd * LANDING, s), 0.57, s);
  return load;
}

test('trigeminal load: grows with corrections, recovers at rest, and stressors push it past the threshold', () => {
  const none = {}, all = { weather: true, stress: true, sleep: true };
  assert.equal(readFor(60, 0, none), 0, 'no misalignment, no load');
  const typical = readFor(60, TYPICAL.exo.N, none);
  assert.ok(typical > 0.3 && typical < THRESHOLD, `typical near exo stays below the threshold (${typical})`);
  assert.ok(readFor(60, TYPICAL.exo.N, all) > THRESHOLD, 'with stressors it crosses it');
  assert.ok(readFor(60, -8, none) > typical, 'larger posture, more load');
  assert.ok(readFor(60, -1, none) < typical, 'smaller posture, less load');
  // rest: decays to the stressors' floor
  assert.ok(near(relaxLoad(0.9, 120, none), 0, 1e-3));
  assert.ok(near(relaxLoad(0.9, 120, all), loadFloor(all), 1e-3));
  assert.ok(relaxLoad(0, 120, all) > 0, 'stressors alone raise the load');
});
