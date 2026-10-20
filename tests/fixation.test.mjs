// Tests for the fixation disparity teaching model.  Run:  node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pdToDeg, NEAR_CONVERGENCE, RESTING, LANDING, landingOffset, coveredOffset } from '../fixation.js';

const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;

test('units', () => {
  assert.ok(near(pdToDeg(100), 45) && near(pdToDeg(0), 0) && near(pdToDeg(-4), -pdToDeg(4)));
  assert.ok(NEAR_CONVERGENCE > 4 && NEAR_CONVERGENCE < 5, `about 4.6° per eye at 40 cm (${NEAR_CONVERGENCE})`);
  assert.ok(RESTING.exo < 0 && RESTING.eso > 0);
});

test('exo rests outward, eso inward; a covered eye drifts further than a landing error', () => {
  assert.ok(coveredOffset(RESTING.exo) > 0 && coveredOffset(RESTING.eso) < 0);
  assert.ok(landingOffset(RESTING.exo) > 0 && landingOffset(RESTING.eso) < 0);
  assert.ok(near(landingOffset(-4) * 2, pdToDeg(4) * LANDING), 'the two eyes share the landing error');
  assert.ok(Math.abs(coveredOffset(-4)) > 2 * Math.abs(landingOffset(-4)), 'landing is only part of the way to rest');
  assert.ok(near(landingOffset(0), 0) && near(coveredOffset(0), 0), 'eyes that rest aligned have nothing to correct');
});
