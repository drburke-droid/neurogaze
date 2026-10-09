// Clinical-direction tests for the teaching model.  Run:  node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, solve, RANGE, stepFatigue } from '../engine.js';
import { CASE_BY_ID } from '../cases.js';

const make = (id, side = 'R') => { const s = defaultState(); CASE_BY_ID[id].apply(s, side); return s; };
// Gaze helpers (+H = patient's right)
const at = (s, h, v, opts = { fixing: 'L' }) => solve(s, h, v, opts);

test('normal: orthotropic in all nine positions, ductions within physiological range', () => {
  const s = defaultState();
  for (const h of [-30, 0, 30]) for (const v of [-25, 0, 25]) {
    const r = at(s, h, v);
    assert.ok(Math.abs(r.deviation.horizontal) < 0.5, `H dev at ${h},${v}`);
    assert.ok(Math.abs(r.deviation.vertical) < 0.5, `V dev at ${h},${v}`);
  }
  const ext = at(s, 80, -80);
  assert.ok(ext.R.h <= RANGE.abd + 1e-6 && -ext.L.h <= RANGE.add + 1e-6 && -ext.R.v <= RANGE.down + 1e-6);
});

test('right CN VI: ET largest in right gaze, small in left gaze; abduction limited', () => {
  const s = make('cn6');
  const right = at(s, 30, 0).deviation.horizontal;
  const primary = at(s, 0, 0).deviation.horizontal;
  const left = at(s, -30, 0).deviation.horizontal;
  assert.ok(primary > 5, `ET in primary (${primary})`);
  assert.ok(right > primary + 15, `ET larger in right gaze (${right})`);
  assert.ok(left < primary, `ET smaller in left gaze (${left})`);
  assert.ok(at(s, 30, 0).R.h < 0, 'right eye cannot abduct past midline');
});

test('Hering: secondary deviation (paretic eye fixing) exceeds primary deviation', () => {
  const s = make('cn6');
  const primary = at(s, 15, 0, { fixing: 'L' }).deviation.horizontal;
  const secondary = at(s, 15, 0, { fixing: 'R' }).deviation.horizontal;
  assert.ok(secondary > primary, `secondary ${secondary} > primary ${primary}`);
});

test('right CN III: down and out, adduction and elevation limited', () => {
  const s = make('cn3');
  const r = at(s, 0, 0);
  assert.ok(r.R.h > 5, 'exotropic (abducted)');
  assert.ok(r.R.v < -3, 'hypotropic');
  assert.ok(at(s, -30, 0).R.h > 0, 'cannot adduct past midline');
  assert.ok(at(s, 0, 25).R.v < 0, 'cannot elevate');
});

test('right CN IV: R hyper in primary, larger in left gaze and down-left', () => {
  const s = make('cn4');
  const p = at(s, 0, 0).deviation.vertical;
  const left = at(s, -30, 0).deviation.vertical;
  const downLeft = at(s, -30, -25).deviation.vertical;
  const right = at(s, 30, 0).deviation.vertical;
  assert.ok(p > 1.5, `R hyper in primary (${p})`);
  assert.ok(left > p && downLeft > left, `incomitant: ${p} < ${left} < ${downLeft}`);
  assert.ok(right < p, 'smaller in right gaze');
});

test('right INO: adduction fails on version but convergence is spared; no primary deviation', () => {
  const s = make('ino');
  assert.ok(Math.abs(at(s, 0, 0).deviation.horizontal) < 1, 'ortho in primary');
  const left = at(s, -30, 0);
  assert.ok(-left.R.h < 10, `R adduction on left gaze is poor (${-left.R.h})`);
  const near = solve(s, 0, 0, { fixing: 'L', near: true });
  assert.ok(Math.abs(near.deviation.horizontal) < 1, 'converges normally at near');
});

test('right TED: hypotropia in primary, elevation and abduction restricted', () => {
  const s = make('ted');
  const p = at(s, 0, 0);
  assert.ok(p.deviation.vertical < -2, `R hypo in primary (${p.deviation.vertical})`);
  assert.ok(p.deviation.horizontal > 1, 'small ET in primary');
  const up = at(s, 0, 25);
  assert.ok(up.R.v < 15 && up.deviation.vertical < p.deviation.vertical, 'elevation restricted, hypo grows on upgaze');
  assert.ok(at(s, 40, 0).R.h < 30, 'abduction restricted');
});

test('right blowout: elevation restricted, eye not hypertropic', () => {
  const s = make('blowout');
  assert.ok(at(s, 0, 0).deviation.vertical <= 0.5, 'no hypertropia');
  const up = at(s, 0, 25);
  assert.ok(up.R.v < 8 && up.deviation.vertical < -15, `elevation markedly limited (${up.R.v})`);
});

test('right Brown: elevation limited in adduction, near normal in abduction', () => {
  const s = make('brown');
  const upLeft = at(s, -30, 25), upRight = at(s, 30, 25), up = at(s, 0, 25);
  assert.ok(upLeft.R.v < 5, `no elevation in adduction (${upLeft.R.v})`);
  assert.ok(upRight.R.v > 20, `elevation in abduction preserved (${upRight.R.v})`);
  assert.ok(up.R.v > 15, `straight up mostly preserved (${up.R.v})`);
});

test('right Duane I: no abduction, small or no deviation in primary', () => {
  const s = make('duane');
  assert.ok(at(s, 30, 0).R.h < 3, 'no abduction');
  assert.ok(Math.abs(at(s, 0, 0).deviation.horizontal) < 5, 'little deviation in primary');
  assert.ok(-at(s, -30, 0).R.h > 25, 'adducts');
});

test('right skew deviation: right eye lower, comitant, full ductions', () => {
  const s = make('skew');
  const devs = [];
  for (const h of [-30, 0, 30]) for (const v of [-25, 0, 25]) devs.push(at(s, h, v).deviation.vertical);
  assert.ok(devs.every((d) => d < -3), 'right hypotropia everywhere');
  assert.ok(Math.max(...devs) - Math.min(...devs) < 1, 'comitant');
  assert.ok(at(s, 40, 0).R.h > 35, 'full ductions');
});

test('myasthenia: sustained upgaze fatigues and elevation fades, rest recovers', () => {
  const s = make('mg', 'B');
  const before = at(s, 0, 25).R.v;
  for (let i = 0; i < 150; i++) stepFatigue(s, at(s, 0, 25), 0.1); // 15 s holding upgaze
  const after = at(s, 0, 25).R.v;
  assert.ok(after < before - 5, `elevation fades (${before.toFixed(1)} → ${after.toFixed(1)})`);
  for (let i = 0; i < 300; i++) stepFatigue(s, at(s, 0, 0), 0.1);
  assert.ok(at(s, 0, 25).R.v > after + 4, 'recovers with rest');
});
