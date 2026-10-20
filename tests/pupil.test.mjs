// Clinical-direction tests for the pupil model.  Run:  node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../engine.js';
import { CASES, CASE_BY_ID } from '../cases.js';
import { steadyPupils, createPupilKinetics, pupilKind } from '../pupil.js';

const pupils = (id, side = 'R') => { const s = defaultState(); CASE_BY_ID[id].apply(s, side); return s.pupil; };
const at = (id, exam, side) => steadyPupils(pupils(id, side), { room: 'bright', light: null, near: false, drop: null, ...exam });
const aniso = (d) => d.R - d.L;
// Run the kinetics from one exam to another and sample the right eye's diameter over time
function trace(p, from, to, seconds, dt = 0.02) {
  const k = createPupilKinetics();
  k.snap(p, from);
  const out = [];
  for (let t = dt; t <= seconds + 1e-9; t += dt) out.push({ t, ...k.step(p, to, dt) });
  return out;
}

test('normal: equal pupils, larger in dim light, constrict to light (direct and consensual) and near', () => {
  const bright = at('normal'), dim = at('normal', { room: 'dim' });
  assert.ok(Math.abs(aniso(bright)) < 0.01 && Math.abs(aniso(dim)) < 0.01);
  assert.ok(bright.R > 3 && bright.R < 5 && dim.R > 6, `bright ${bright.R}, dim ${dim.R}`);
  const pen = at('normal', { room: 'dim', light: 'R' });
  assert.ok(dim.R - pen.R > 2.5 && dim.L - pen.L > 2.5, 'both constrict to a penlight in one eye');
  assert.ok(pen.R <= pen.L && pen.L - pen.R < 0.2, 'direct response equal to or slightly larger than consensual');
  assert.ok(bright.R - at('normal', { near: true }).R > 1, 'near response');
});

test('light reflex has a latency and partly escapes under a steady light', () => {
  const p = defaultState().pupil;
  const tr = trace(p, { room: 'dim' }, { room: 'dim', light: 'R' }, 8);
  const d0 = steadyPupils(p, { room: 'dim' }).R;
  assert.ok(Math.abs(tr.find((x) => x.t >= 0.1).R.mm - d0) < 0.01, 'no change within 100 ms');
  const min = Math.min(...tr.map((x) => x.R.mm));
  assert.ok(d0 - min > 3, 'brisk constriction');
  const end = tr[tr.length - 1].R.mm;
  assert.ok(end - min > 0.15 && end - min < 1, `pupillary escape ${end - min}`);
});

test('RAPD: pupils equal, but both dilate when the light swings to the affected eye', () => {
  for (const room of ['bright', 'dim']) assert.ok(Math.abs(aniso(at('rapd', { room }, 'L'))) < 0.1);
  const good = at('rapd', { room: 'dim', light: 'R' }, 'L'), bad = at('rapd', { room: 'dim', light: 'L' }, 'L');
  assert.ok(bad.R - good.R > 0.8 && bad.L - good.L > 0.8, `swing dilation ${bad.R - good.R}`);
});

test('Horner: small pupil, anisocoria larger in dim light, dilation lag, reversed by apraclonidine', () => {
  const bright = at('horner'), dim = at('horner', { room: 'dim' });
  assert.ok(aniso(bright) < -0.3, 'right pupil smaller');
  assert.ok(aniso(dim) < aniso(bright) - 0.5, `worse in dim light (${aniso(bright)} → ${aniso(dim)})`);
  assert.ok(at('horner', { room: 'dim', light: 'R' }).R < dim.R - 1, 'light reaction preserved');
  const tr = trace(pupils('horner'), { room: 'bright' }, { room: 'dim' }, 3);
  const frac = (eye) => (tr[tr.length - 1][eye].mm - bright[eye]) / (dim[eye] - bright[eye]);
  assert.ok(frac('L') > 0.85 && frac('R') < 0.6, `dilation lag: normal ${frac('L')}, Horner ${frac('R')}`);
  assert.ok(aniso(at('horner', { room: 'dim', drop: 'apra' })) > 0.2, 'apraclonidine reversal');
});

test('third nerve palsy: fixed dilated pupil, consensual response intact, constricts to pilocarpine 1%', () => {
  const bright = at('cn3'), dim = at('cn3', { room: 'dim' });
  assert.ok(bright.R > 7 && aniso(bright) > aniso(dim), 'large, anisocoria worse in bright light');
  const direct = at('cn3', { room: 'dim', light: 'R' });
  assert.ok(Math.abs(direct.R - dim.R) < 0.05, 'no direct reaction');
  assert.ok(dim.L - direct.L > 2, 'consensual reaction in the fellow eye');
  assert.ok(at('cn3', { near: true }).R > 7, 'no near reaction');
  assert.ok(at('cn3', { drop: 'pilo1' }).R < 3, 'pilocarpine 1% constricts');
});

test('pharmacological dilation: fixed and large, pilocarpine 1% fails', () => {
  const d = at('pharm');
  assert.ok(d.R > at('cn3').R, 'larger than a third nerve palsy pupil');
  assert.ok(at('pharm', { light: 'R', room: 'dim' }).R === at('pharm', { room: 'dim' }).R);
  const pilo = at('pharm', { drop: 'pilo1' });
  assert.ok(pilo.R > 8 && pilo.L < 2.5, 'only the normal pupil constricts');
});

test('Adie: larger in bright light, poor light but strong slow near response, supersensitive to dilute pilocarpine', () => {
  const bright = at('adie'), dim = at('adie', { room: 'dim' });
  assert.ok(aniso(bright) > 1, 'larger in bright light');
  assert.ok(aniso(dim) < aniso(bright) - 1, 'difference smaller in dim light');
  assert.ok(dim.R - at('adie', { room: 'dim', light: 'R' }).R < 0.7, 'poor light reaction');
  const near = at('adie', { near: true });
  assert.ok(bright.R - near.R > 2, 'strong near response');
  const tr = trace(pupils('adie'), { room: 'bright' }, { room: 'bright', near: true }, 1);
  const end = tr[tr.length - 1];
  assert.ok((bright.R - end.R.mm) / (bright.R - near.R) < 0.45, 'tonic eye constricts slowly');
  assert.ok((bright.L - end.L.mm) / (bright.L - near.L) > 0.6, 'normal eye constricts promptly');
  const pilo = at('adie', { drop: 'pilo01' });
  assert.ok(bright.R - pilo.R > 2 && bright.L - pilo.L < 0.5, 'dilute pilocarpine constricts only the tonic pupil');
});

test('Argyll Robertson: small, no light reaction, brisk near reaction', () => {
  const bright = at('argyll'), dim = at('argyll', { room: 'dim' });
  for (const e of ['R', 'L']) {
    assert.ok(bright[e] < 3.5 && Math.abs(dim[e] - bright[e]) < 0.01, 'small and unaffected by light');
    assert.ok(Math.abs(at('argyll', { room: 'dim', light: e })[e] - dim[e]) < 0.01, 'no light reaction');
    assert.ok(bright[e] - at('argyll', { near: true })[e] > 0.6, 'near reaction');
  }
});

test('physiological anisocoria: same difference in bright and dim light', () => {
  const b = aniso(at('physaniso')), d = aniso(at('physaniso', { room: 'dim' }));
  assert.ok(b > 0.5 && b < 1.1 && Math.abs(b - d) < 0.15, `${b} vs ${d}`);
});

test('cavernous sinus: fixed, mid-dilated pupil; skew deviation carries an ipsilateral Horner', () => {
  const d = at('cavsinus'), dim = at('cavsinus', { room: 'dim', light: 'R' });
  assert.ok(d.R > 5 && d.R < 7 && Math.abs(dim.R - d.R) < 0.01);
  assert.equal(pupilKind(pupils('skew', 'L').L), 'small');
});

test('every case gives valid pupils, and its key test is well formed', () => {
  for (const c of CASES) for (const side of c.sides) {
    const d = at(c.id, {}, side);
    for (const e of ['R', 'L']) assert.ok(d[e] >= 1.2 && d[e] <= 9.5, `${c.id} ${side}`);
    if (!c.demo) continue;
    const steps = c.demo(side);
    assert.equal(steps[0].at, 0);
    for (let i = 1; i < steps.length; i++) assert.ok(steps[i].at > steps[i - 1].at, `${c.id} step order`);
    for (const st of steps) {
      assert.ok(typeof st.say === 'string' && st.say.length > 0);
      for (const [k, v] of Object.entries(st.exam || {})) {
        const ok = { room: ['bright', 'dim'], pen: ['off', 'R', 'L', 'swing'], near: [true, false], drop: [null, 'pilo01', 'pilo1', 'apra'] }[k];
        assert.ok(ok && ok.includes(v), `${c.id}: ${k}=${v}`);
      }
    }
  }
});
