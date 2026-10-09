// Interactive Gaze Simulator — created by Dr Robert Burke
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  MUSCLES, MUSCLE_NAMES, NERVE_OF, defaultState, solve, stepFatigue, muscleState,
  describeDeviation, GAZE_POSITIONS, GAZE_NAMES, strength,
} from './engine.js';
import { CASES, CASE_BY_ID, SIDE_LABEL } from './cases.js';

const VERSION = 'v3.0';
const MODEL_URL = './head_eyes_v2.glb';
const DEG = Math.PI / 180;
const $ = (id) => document.getElementById(id);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// ═══════════════════════════════════════════════════════════════
// Simulation state
// ═══════════════════════════════════════════════════════════════
const sim = {
  state: defaultState(),
  caseId: 'normal',
  side: 'B',
  custom: false,          // nerves edited by hand after (or instead of) a case
  gazeH: 0, gazeV: 0,     // degrees, + = patient's right / up
  fixing: 'L',
  near: false,
  view: 'face',
  locked: false,
  comparing: false,
  solution: null,
};
// Eased eye angles actually drawn (per eye: h = abduction +, v = up +)
const shown = { R: { h: 0, v: 0 }, L: { h: 0, v: 0 } };

function currentState() { return sim.comparing ? defaultState() : sim.state; }

function resolve() {
  sim.solution = solve(currentState(), sim.gazeH, sim.gazeV, { fixing: sim.fixing, near: sim.near });
}

// ═══════════════════════════════════════════════════════════════
// Rendering
// ═══════════════════════════════════════════════════════════════
const stage = $('stage');
const canvas = $('view');
const targetDot = $('target');
let renderer = null, scene, camera, penlight, eyes = null, eyeMid = new THREE.Vector3();
let rafId = 0, lastT = 0;

function initRenderer() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    showLoaderMessage('This device or browser could not start 3D graphics (WebGL). The muscle readouts and case cards still work.');
    return false;
  }
  const coarse = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x0b0d12, 0); // transparent: the stage gradient shows through

  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
  camera.position.set(0, 0, 4);

  scene.add(new THREE.HemisphereLight(0xf2f4ff, 0x2a2420, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(1.5, 2.2, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45);
  fill.position.set(-2.5, 0.5, 3);
  scene.add(fill);
  // The penlight follows the fixation target and puts a corneal reflex in each eye
  penlight = new THREE.PointLight(0xfff4e0, 2.2, 0, 2);
  scene.add(penlight);

  new ResizeObserver(resize).observe(stage);
  resize();
  return true;
}

function resize() {
  if (!renderer) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  frameCamera();
  requestFrame();
}

// Frame the face (or a close-up of the eyes) for any stage aspect ratio
function frameCamera() {
  if (!camera) return;
  if (!eyes) { camera.updateProjectionMatrix(); return; }
  const box = sim.view === 'eyes'
    ? { w: 0.95, h: 0.55, y: eyeMid.y - 0.02 }
    : { w: 1.05, h: 1.0, y: eyeMid.y - 0.14 };
  const t = Math.tan((camera.fov * DEG) / 2);
  const dist = Math.max(box.h / 2 / t, box.w / 2 / (t * camera.aspect)) + 0.1;
  camera.position.set(0, box.y + 0.05, eyeMid.z + dist);
  camera.lookAt(0, box.y, eyeMid.z);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  positionTargetDot();
}

function loadModel() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  loader.load(MODEL_URL, onModel, (e) => {
    if (e.lengthComputable) $('load-pct').textContent = `${Math.round((100 * e.loaded) / e.total)}%`;
  }, (err) => {
    console.error(err);
    showLoaderMessage('The 3D model could not be loaded. Check your connection and reload. The case cards and muscle readouts still work.', true);
  });
}

function showLoaderMessage(msg, retry = false) {
  const el = $('loader');
  el.hidden = false;
  el.textContent = msg;
  if (retry) {
    const b = document.createElement('button');
    b.className = 'btn'; b.type = 'button'; b.textContent = 'Retry';
    b.style.marginTop = '12px';
    b.onclick = () => { el.textContent = 'Loading the 3D model…'; loadModel(); };
    el.append(document.createElement('br'), b);
  }
}

function onModel(gltf) {
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  model.scale.setScalar(1.8 / box.getSize(new THREE.Vector3()).y);
  let eyeL = null, eyeR = null;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  model.traverse((o) => {
    if (o.name === 'Eye_L') eyeL = o;
    if (o.name === 'Eye_R') eyeR = o;
    if (!o.isMesh) return;
    const m = o.material;
    if (m.map) m.map.anisotropy = Math.min(8, maxAniso);
    m.envMapIntensity = 0.35;
    if (m.transmission > 0) {
      // The cornea: a thin glossy shell. Transmission would cost an extra render pass per frame.
      m.transmission = 0;
      m.transparent = true;
      m.opacity = 0.18;
      m.depthWrite = false;
      m.roughness = 0.02;
      m.clearcoat = 1;
      m.envMapIntensity = 1.2;
    }
  });
  if (!eyeL || !eyeR) { showLoaderMessage('The 3D model is missing its eyes (Eye_L / Eye_R).'); return; }
  scene.add(model);
  model.updateMatrixWorld(true);
  const pR = eyeR.getWorldPosition(new THREE.Vector3());
  const pL = eyeL.getWorldPosition(new THREE.Vector3());
  // Centre the face on the eyes so straight ahead is the middle of the view
  model.position.y -= (pR.y + pL.y) / 2;
  model.updateMatrixWorld(true);
  eyeR.getWorldPosition(pR); eyeL.getWorldPosition(pL);
  eyeMid.copy(pR).add(pL).multiplyScalar(0.5);
  for (const e of [eyeR, eyeL]) { e.rotation.order = 'YXZ'; e.userData.z0 = e.position.z; }
  eyes = { R: eyeR, L: eyeL };
  $('loader').hidden = true;
  frameCamera();
  requestFrame();
}

function requestFrame() {
  if (!rafId) rafId = requestAnimationFrame(frame);
}

function frame(t) {
  rafId = 0;
  const elapsed = lastT ? Math.min(0.5, (t - lastT) / 1000) : 1 / 60;
  const dt = Math.min(0.05, elapsed);
  lastT = t;
  let active = false;

  // Myasthenic fatigue evolves with time
  if (!sim.comparing && sim.state.fatigue && sim.solution) {
    stepFatigue(sim.state, sim.solution, elapsed);
    resolve();
    updateReadouts();
    active = true;
  }
  if (!sim.solution) resolve();

  // Ease each eye toward its solution; weak agonists move slowly
  const st = currentState();
  for (const eye of ['R', 'L']) {
    const goal = sim.solution[eye];
    const cur = shown[eye];
    const towardAbd = goal.h > cur.h;
    const sH = towardAbd ? strength(st, eye, 'LR') * (st.duane[eye] ? 0 : 1)
      : strength(st, eye, 'MR') * (1 - 0.8 * st.mlf[eye]);
    const kH = 1 - Math.exp(-dt * (3 + 11 * sH));
    const kV = 1 - Math.exp(-dt * 12);
    cur.h += (goal.h - cur.h) * kH;
    cur.v += (goal.v - cur.v) * kV;
    if (Math.abs(goal.h - cur.h) > 0.05 || Math.abs(goal.v - cur.v) > 0.05) active = true;
  }

  if (eyes) {
    const sec = t / 1000;
    for (const eye of ['R', 'L']) {
      let h = shown[eye].h;
      // Abducting nystagmus of the fellow eye in INO
      const lesion = st.mlf[eye === 'R' ? 'L' : 'R'];
      if (lesion && h > 8) {
        const amp = 3 * Math.min(1, (h - 8) / 15);
        h += amp * (1 - ((sec * 2.6) % 1));
        active = true;
      }
      const sign = eye === 'R' ? -1 : 1; // rotation.y is + toward the patient's left
      eyes[eye].rotation.y = sign * h * DEG;
      eyes[eye].rotation.x = -shown[eye].v * DEG;
      // Duane: globe retraction on adduction
      const retract = st.duane[eye] ? Math.max(0, -h) / 45 : 0;
      eyes[eye].position.z = eyes[eye].userData.z0 - 0.035 * retract;
    }
    // Penlight sits on the fixation target, ~1.6 units in front of the eyes
    const H = sim.gazeH * DEG, V = sim.gazeV * DEG;
    penlight.position.set(eyeMid.x - Math.sin(H) * Math.cos(V) * 1.6, eyeMid.y + Math.sin(V) * 1.6, eyeMid.z + Math.cos(H) * Math.cos(V) * 1.6);
    renderer.render(scene, camera);
  }
  if (active) requestFrame(); else lastT = 0;
}

// ═══════════════════════════════════════════════════════════════
// Pointer → gaze
// ═══════════════════════════════════════════════════════════════
function eyesOnStage() {
  // Screen position of the midpoint between the eyes, and the virtual target distance
  const w = stage.clientWidth, h = stage.clientHeight;
  let x = w / 2, y = h / 2;
  if (eyes && camera) {
    const p = eyeMid.clone().project(camera);
    x = (p.x * 0.5 + 0.5) * w;
    y = (-p.y * 0.5 + 0.5) * h;
  }
  return { x, y, d: 0.5 * Math.min(w, h) + 40 };
}

function setGaze(H, V, { fromPointer = false } = {}) {
  sim.gazeH = clamp(H, -50, 50);
  sim.gazeV = clamp(V, -45, 45);
  resolve();
  positionTargetDot();
  updateReadouts();
  if (!fromPointer) scheduleHash();
  else scheduleHash(400);
  requestFrame();
}

function positionTargetDot() {
  const e = eyesOnStage();
  const x = e.x - Math.tan(sim.gazeH * DEG) * e.d;
  const y = e.y - Math.tan(sim.gazeV * DEG) * e.d;
  targetDot.style.left = `${clamp(x, 8, stage.clientWidth - 8)}px`;
  targetDot.style.top = `${clamp(y, 8, stage.clientHeight - 8)}px`;
}

function onPointer(e) {
  if (sim.locked || !e.isPrimary) return;
  if (e.pointerType !== 'mouse' && e.type === 'pointermove' && e.buttons === 0) return;
  const r = stage.getBoundingClientRect();
  const o = eyesOnStage();
  const dx = e.clientX - r.left - o.x, dy = e.clientY - r.top - o.y;
  setGaze(-Math.atan2(dx, o.d) / DEG, -Math.atan2(dy, o.d) / DEG, { fromPointer: true });
}
stage.addEventListener('pointermove', onPointer);
stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') stage.setPointerCapture(e.pointerId); onPointer(e); });

// ═══════════════════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════════════════
const caseList = $('case-list');
for (const c of CASES) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'case-btn';
  b.dataset.case = c.id;
  b.innerHTML = '<span class="name"></span><span class="sub"></span>';
  b.querySelector('.name').textContent = c.name;
  b.querySelector('.sub').textContent = c.sub;
  b.addEventListener('click', () => {
    const keep = sim.caseId !== 'normal' && c.sides.includes(sim.side);
    applyCase(c.id, keep ? sim.side : (c.sides.includes('R') ? 'R' : c.sides[0]));
  });
  caseList.append(b);
}

$('side-picker').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-side]');
  if (b && !b.disabled) applyCase(sim.caseId === 'custom' ? 'normal' : sim.caseId, b.dataset.side);
});

function applyCase(id, side, { keepGaze = false, announce: say = true } = {}) {
  const c = CASE_BY_ID[id] || CASE_BY_ID.normal;
  if (!c.sides.includes(side)) side = c.sides[0];
  sim.state = defaultState();
  c.apply(sim.state, side);
  sim.caseId = c.id;
  sim.side = side;
  sim.custom = false;
  sim.fixing = side === 'R' ? 'L' : 'R';
  if (!keepGaze) { const [H, V] = GAZE_POSITIONS[c.worst(side)]; sim.gazeH = H; sim.gazeV = V; }
  resolve();
  refreshAll();
  if (say) announce(`${caseTitle()}. ${c.card.look}`);
  requestFrame();
}

document.querySelectorAll('.nerve-btn').forEach((b) => {
  b.addEventListener('click', () => {
    const { eye, nerve } = b.dataset;
    const cur = sim.state.nerves[eye][nerve];
    sim.state.nerves[eye][nerve] = cur > 0.75 ? 0.5 : cur > 0.25 ? 0 : 1;
    if (NERVE_ONLY.has(sim.caseId)) sim.caseId = 'normal'; // the nerve grid now describes the whole state
    sim.custom = true;
    resolve();
    refreshAll();
    announce(`${eye === 'R' ? 'Right' : 'Left'} cranial nerve ${['', '', '', 'three', 'four', '', 'six'][nerve]}: ${nerveStateName(sim.state.nerves[eye][nerve])}.`);
    requestFrame();
  });
});
$('reset').addEventListener('click', () => applyCase('normal', 'B', { keepGaze: true }));

const NERVE_ONLY = new Set(['normal', 'cn3', 'cn4', 'cn6', 'mfs']);
const nerveStateName = (v) => (v >= 0.999 ? 'normal' : v <= 0.001 ? 'palsy' : 'paresis');

// Gaze pad (laid out as the examiner sees the patient)
const pad = $('pad');
const ARROWS = { 7: '↖', 8: '↑', 9: '↗', 4: '←', 5: '•', 6: '→', 1: '↙', 2: '↓', 3: '↘' };
for (const k of [7, 8, 9, 4, 5, 6, 1, 2, 3]) {
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.key = k; b.textContent = ARROWS[k];
  b.setAttribute('aria-label', `Patient looks ${GAZE_NAMES[k]} (key ${k})`);
  b.addEventListener('click', () => { const [H, V] = GAZE_POSITIONS[k]; setGaze(H, V); });
  pad.append(b);
}

$('fix-picker').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-fix]'); if (!b) return;
  sim.fixing = b.dataset.fix; resolve(); refreshAll(); requestFrame();
  announce(`${sim.fixing === 'R' ? 'Right' : 'Left'} eye fixing.`);
});
$('near-picker').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-near]'); if (!b) return;
  sim.near = b.dataset.near === '1'; resolve(); refreshAll(); requestFrame();
});
$('view-picker').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-view]'); if (!b) return;
  sim.view = b.dataset.view; frameCamera(); refreshAll(); requestFrame();
});
$('lock').addEventListener('click', () => { sim.locked = !sim.locked; refreshAll(); });

function setComparing(on) {
  if (sim.comparing === on) return;
  sim.comparing = on; resolve(); updateReadouts(); requestFrame();
}
const cmp = $('compare');
cmp.addEventListener('pointerdown', () => setComparing(true));
for (const ev of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) cmp.addEventListener(ev, () => setComparing(false));
cmp.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setComparing(true); } });
cmp.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') setComparing(false); });

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^[1-9]$/.test(e.key)) { const [H, V] = GAZE_POSITIONS[e.key]; setGaze(H, V); return; }
  const nudge = { ArrowLeft: [5, 0], ArrowRight: [-5, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[e.key];
  if (nudge && document.activeElement === stage) { e.preventDefault(); setGaze(sim.gazeH + nudge[0], sim.gazeV + nudge[1]); return; }
  if (e.key === 'n' || e.key === 'N') setComparing(true);
  if (e.key === 'l' || e.key === 'L') { sim.locked = !sim.locked; refreshAll(); }
});
document.addEventListener('keyup', (e) => { if (e.key === 'n' || e.key === 'N') setComparing(false); });

// Muscle tables
const muscleRows = { R: {}, L: {} };
(function buildMuscleTables() {
  const host = $('muscle-tables');
  for (const eye of ['R', 'L']) {
    const t = document.createElement('table');
    t.className = 'eye-table';
    t.innerHTML = `<caption>${eye === 'R' ? 'Right eye (OD)' : 'Left eye (OS)'}</caption><tbody></tbody>`;
    for (const m of MUSCLES) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<th scope="row">${m}<small>${MUSCLE_NAMES[m]} · CN ${['', '', '', 'III', 'IV', '', 'VI'][NERVE_OF[m]]}</small></th>
        <td><div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-label="${eye === 'R' ? 'Right' : 'Left'} ${MUSCLE_NAMES[m]} force"><div class="force"></div><div class="effort"></div></div></td>
        <td class="val"></td><td class="st"></td>`;
      t.tBodies[0].append(tr);
      muscleRows[eye][m] = { tr, meter: tr.querySelector('.meter'), force: tr.querySelector('.force'), effort: tr.querySelector('.effort'), val: tr.querySelector('.val'), st: tr.querySelector('.st'), last: '' };
    }
    host.append(t);
  }
})();

const STATE_LABEL = { normal: 'Normal', paresis: 'Paresis', palsy: 'Palsy', restricted: 'Restricted' };

function updateReadouts() {
  if (!sim.solution) return;
  const st = currentState();
  for (const eye of ['R', 'L']) {
    for (const m of MUSCLES) {
      const row = muscleRows[eye][m];
      const a = sim.solution[eye].activity[m];
      const f = Math.round(Math.min(1, a.force) * 100), ef = Math.round(Math.min(1, a.effort) * 100);
      let state = muscleState(st, eye, m);
      if (st.fatigue && state !== 'palsy') state = 'paresis';
      const key = `${f}|${ef}|${state}`;
      if (key === row.last) continue;
      row.last = key;
      row.force.style.width = `${f}%`;
      row.effort.style.width = `${ef}%`;
      row.val.textContent = `${f}%`;
      row.tr.dataset.state = state;
      row.st.textContent = st.fatigue && state === 'paresis' ? 'Fatigable' : STATE_LABEL[state];
      row.meter.setAttribute('aria-valuenow', String(f));
      row.meter.setAttribute('aria-valuetext', `force ${f}%, effort ${ef}%, ${row.st.textContent}`);
    }
  }
  const dev = describeDeviation(sim.solution.deviation, sim.near);
  $('dev-chip').textContent = `${dev} · ${sim.fixing === 'R' ? 'OD' : 'OS'} fixing${sim.near ? ' · near' : ''}${sim.comparing ? ' · NORMAL' : ''}`;
  const chip = $('case-chip');
  chip.innerHTML = '';
  chip.append(sim.comparing ? 'Normal (comparison)' : caseTitle());
  const gz = document.createElement('span');
  gz.className = 'gz';
  gz.textContent = `Patient looking ${gazeName()}`;
  chip.append(gz);
  canvas.setAttribute('aria-label', `${caseTitle()}. Patient looking ${gazeName()}. ${dev}.`);
  for (const b of pad.children) {
    const [H, V] = GAZE_POSITIONS[b.dataset.key];
    b.setAttribute('aria-pressed', String(Math.abs(H - sim.gazeH) < 0.5 && Math.abs(V - sim.gazeV) < 0.5));
  }
}

function gazeName() {
  for (const [k, [H, V]] of Object.entries(GAZE_POSITIONS)) {
    if (Math.abs(H - sim.gazeH) < 3 && Math.abs(V - sim.gazeV) < 3) return GAZE_NAMES[k];
  }
  const h = Math.abs(sim.gazeH) < 4 ? '' : sim.gazeH > 0 ? 'right' : 'left';
  const v = Math.abs(sim.gazeV) < 4 ? '' : sim.gazeV > 0 ? 'up' : 'down';
  return [v, h].filter(Boolean).join(' and to the ') || 'straight ahead';
}

function caseTitle() {
  if (sim.custom) {
    const parts = [];
    const base = defaultState();
    CASE_BY_ID[sim.caseId].apply(base, sim.side);
    for (const eye of ['R', 'L']) for (const n of [3, 4, 6]) {
      const v = sim.state.nerves[eye][n];
      if (Math.abs(v - base.nerves[eye][n]) > 0.001) parts.push(`${eye === 'R' ? 'Right' : 'Left'} CN ${{ 3: 'III', 4: 'IV', 6: 'VI' }[n]} ${nerveStateName(v)}`);
    }
    const prefix = sim.caseId !== 'normal' ? `${SIDE_LABEL[sim.side]} ${CASE_BY_ID[sim.caseId].name.toLowerCase()} + ` : '';
    return parts.length ? `${prefix}${parts.join(', ')}` : (prefix ? prefix.slice(0, -3) : 'Normal');
  }
  const c = CASE_BY_ID[sim.caseId];
  if (c.id === 'normal') return 'Normal';
  if (c.sides.length === 1 && c.sides[0] === 'B') return c.name;
  return `${SIDE_LABEL[sim.side]} ${c.name.charAt(0).toLowerCase()}${c.name.slice(1)}`;
}

function renderCard() {
  const c = CASE_BY_ID[sim.caseId];
  const card = $('card');
  card.innerHTML = '';
  const h = document.createElement('h2'); h.textContent = sim.custom ? 'Custom' : caseTitle();
  const badge = document.createElement('span'); badge.className = 'badge'; badge.dataset.mech = c.mechanism; badge.textContent = sim.custom ? 'Manual nerve settings' : c.mechanism;
  card.append(h, badge);
  if (sim.custom) {
    const p = document.createElement('p');
    p.textContent = `${caseTitle()}. Move through the nine positions to see where the deviation is largest. Paresis = 50% strength, palsy = no strength.`;
    card.append(p);
    return;
  }
  const add = (tag, text, cls) => { const el = document.createElement(tag); el.textContent = text; if (cls) el.className = cls; card.append(el); return el; };
  add('p', c.card.summary);
  add('h3', 'What to look for');
  add('p', c.card.look);
  add('h3', 'Clinical signs');
  const ul = document.createElement('ul');
  for (const s of c.card.signs) { const li = document.createElement('li'); li.textContent = s; ul.append(li); }
  card.append(ul);
  if (c.card.redFlags) { add('h3', 'Red flags'); add('p', c.card.redFlags, 'redflag'); }
  add('h3', 'Not shown in the model');
  add('p', c.card.notModelled);
  const go = document.createElement('button');
  go.type = 'button'; go.className = 'btn go';
  const k = c.worst(sim.side);
  go.textContent = `Show the key position: ${GAZE_NAMES[k]}`;
  go.addEventListener('click', () => { const [H, V] = GAZE_POSITIONS[k]; setGaze(H, V); });
  card.append(go);
}

function refreshAll() {
  const c = CASE_BY_ID[sim.caseId];
  for (const b of caseList.children) b.setAttribute('aria-pressed', String(!sim.custom && b.dataset.case === sim.caseId));
  for (const b of $('side-picker').children) {
    b.disabled = !c.sides.includes(b.dataset.side);
    b.setAttribute('aria-pressed', String(!sim.custom && b.dataset.side === sim.side && c.id !== 'normal'));
  }
  $('side-row').hidden = c.id === 'normal' || sim.custom;
  document.querySelectorAll('.nerve-btn').forEach((b) => {
    const v = sim.state.nerves[b.dataset.eye][b.dataset.nerve];
    const s = nerveStateName(v);
    b.dataset.state = s;
    b.innerHTML = `${b.dataset.eye === 'R' ? 'OD' : 'OS'}<span class="st">${s === 'paresis' ? `Paresis ${Math.round(v * 100)}%` : s === 'palsy' ? 'Palsy' : 'Normal'}</span>`;
    b.setAttribute('aria-label', `${b.dataset.eye === 'R' ? 'Right' : 'Left'} cranial nerve ${b.closest('tr').querySelector('th').textContent.replace('CN ', '')}: ${s}`);
  });
  for (const b of $('fix-picker').children) b.setAttribute('aria-pressed', String(b.dataset.fix === sim.fixing));
  for (const b of $('near-picker').children) b.setAttribute('aria-pressed', String((b.dataset.near === '1') === sim.near));
  for (const b of $('view-picker').children) b.setAttribute('aria-pressed', String(b.dataset.view === sim.view));
  $('lock').setAttribute('aria-pressed', String(sim.locked));
  renderCard();
  positionTargetDot();
  updateReadouts();
  document.title = sim.caseId === 'normal' && !sim.custom
    ? 'Interactive Gaze Simulator: Cranial Nerve Palsies and Eye Movement Disorders'
    : `${caseTitle()} · Interactive Gaze Simulator`;
  scheduleHash();
}

function announce(msg) {
  const s = $('status');
  s.textContent = '';
  setTimeout(() => { s.textContent = msg; }, 30);
}

let toastTimer = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

// ═══════════════════════════════════════════════════════════════
// Deep links: #case=cn6&side=R&h=30&v=0&fix=L&near=1&view=eyes&n=R6:0,L3:50
// ═══════════════════════════════════════════════════════════════
let hashTimer = 0;
function scheduleHash(delay = 0) {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(writeHash, delay);
}
function writeHash() {
  const p = new URLSearchParams();
  p.set('case', sim.caseId);
  if (sim.caseId !== 'normal') p.set('side', sim.side);
  const key = Object.entries(GAZE_POSITIONS).find(([, [H, V]]) => Math.abs(H - sim.gazeH) < 0.5 && Math.abs(V - sim.gazeV) < 0.5);
  if (key) p.set('gaze', key[0]); else { p.set('h', Math.round(sim.gazeH)); p.set('v', Math.round(sim.gazeV)); }
  const defaultFix = sim.side === 'R' ? 'L' : 'R';
  if (sim.fixing !== defaultFix) p.set('fix', sim.fixing);
  if (sim.near) p.set('near', '1');
  if (sim.view !== 'face') p.set('view', sim.view);
  if (sim.custom) {
    const n = [];
    for (const eye of ['R', 'L']) for (const k of [3, 4, 6]) { const v = sim.state.nerves[eye][k]; if (v < 0.999) n.push(`${eye}${k}:${Math.round(v * 100)}`); }
    if (n.length) p.set('n', n.join(','));
  }
  const hash = `#${p.toString().replace(/%3A/g, ':').replace(/%2C/g, ',')}`;
  if (hash !== location.hash) history.replaceState(null, '', hash);
}
function readHash() {
  const raw = location.hash.slice(1);
  if (!raw.includes('=')) return false;
  const p = new URLSearchParams(raw);
  const id = CASE_BY_ID[p.get('case')] ? p.get('case') : 'normal';
  applyCase(id, p.get('side') || CASE_BY_ID[id].sides[0], { announce: false });
  if (p.get('gaze') && GAZE_POSITIONS[p.get('gaze')]) { [sim.gazeH, sim.gazeV] = GAZE_POSITIONS[p.get('gaze')]; }
  else if (p.has('h') || p.has('v')) { sim.gazeH = clamp(+p.get('h') || 0, -50, 50); sim.gazeV = clamp(+p.get('v') || 0, -45, 45); }
  if (p.get('fix') === 'R' || p.get('fix') === 'L') sim.fixing = p.get('fix');
  sim.near = p.get('near') === '1';
  sim.view = p.get('view') === 'eyes' ? 'eyes' : 'face';
  if (p.get('n')) {
    for (const part of p.get('n').split(',')) {
      const m = /^([RL])([346]):(\d{1,3})$/.exec(part);
      if (m) { sim.state.nerves[m[1]][m[2]] = clamp(+m[3] / 100, 0, 1); sim.custom = true; }
    }
  }
  resolve(); frameCamera(); refreshAll(); requestFrame();
  return true;
}
window.addEventListener('hashchange', () => {
  if (readHash()) stage.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
});

// ═══════════════════════════════════════════════════════════════
// Share: copy link, save a labelled image
// ═══════════════════════════════════════════════════════════════
$('copy-link').addEventListener('click', async () => {
  writeHash();
  try { await navigator.clipboard.writeText(location.href); toast('Link copied'); }
  catch { prompt('Copy this link:', location.href); }
});

function exportImage() {
  // Render now and read the canvas in the same task (no preserveDrawingBuffer needed)
  if (renderer && eyes) renderer.render(scene, camera);
  const W = 1200, H = 630, out = document.createElement('canvas');
  out.width = W; out.height = H;
  const g = out.getContext('2d');
  const bg = g.createRadialGradient(380, 300, 40, 380, 300, 520);
  bg.addColorStop(0, '#1a1f2b'); bg.addColorStop(1, '#0b0d12');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (renderer && eyes) {
    // Cover-fit the 3D view into the left 760 px
    const sw = canvas.width, sh = canvas.height, tw = 760, th = H;
    const s = Math.max(tw / sw, th / sh);
    const cw = tw / s, ch = th / s;
    g.drawImage(canvas, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, tw, th);
  }
  g.fillStyle = '#12151c'; g.fillRect(760, 0, 440, H);
  g.fillStyle = '#4cc9f0'; g.fillRect(760, 0, 4, H);
  const text = (str, x, y, font, color, maxW = 390) => {
    g.font = font; g.fillStyle = color;
    const lh = parseInt(/(\d+)px/.exec(font)[1], 10) * 1.25;
    const words = String(str).split(' '); let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = test;
    }
    g.fillText(line, x, y);
    return y + lh;
  };
  const sans = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  let y = 80;
  y = text('INTERACTIVE GAZE SIMULATOR', 800, y, `600 16px ${sans}`, '#a9b2c3');
  y = text(caseTitle(), 800, y + 34, `700 38px ${sans}`, '#e9edf4');
  y = text(`Patient looking ${gazeName()}`, 800, y + 6, `400 22px ${sans}`, '#a9b2c3');
  y = text(describeDeviation(sim.solution.deviation, sim.near), 800, y + 18, `600 22px ${sans}`, '#4cc9f0');
  if (!sim.custom && sim.caseId !== 'normal') text(CASE_BY_ID[sim.caseId].card.look, 800, y + 16, `400 18px ${sans}`, '#d3d9e4');
  text('Created by Dr Robert Burke', 800, H - 74, `700 20px ${sans}`, '#e9edf4');
  text('calgaryvisioncentre.com · educational use only', 800, H - 44, `400 16px ${sans}`, '#a9b2c3');
  return out.toDataURL('image/png');
}

$('save-image').addEventListener('click', async () => {
  const url = exportImage();
  const name = `gaze-${sim.caseId}${sim.caseId !== 'normal' ? `-${sim.side}` : ''}.png`;
  try {
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], name, { type: 'image/png' });
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: caseTitle(), text: location.href });
      return;
    }
  } catch { /* fall through to download */ }
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  toast('Image saved');
});

// ═══════════════════════════════════════════════════════════════
// Start
// ═══════════════════════════════════════════════════════════════
$('version').textContent = VERSION;
if (!readHash()) { sim.gazeH = 0; sim.gazeV = 0; applyCase('normal', 'B', { keepGaze: true, announce: false }); }
for (const eye of ['R', 'L']) { shown[eye].h = sim.solution[eye].h; shown[eye].v = sim.solution[eye].v; }
if (initRenderer()) loadModel();

// Small hook for automated checks and the preview-image build
window.__gaze = { sim, applyCase, setGaze, exportImage, readHash };
