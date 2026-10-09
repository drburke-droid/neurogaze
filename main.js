// Interactive Gaze Simulator — created by Dr Robert Burke
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  MUSCLES, MUSCLE_NAMES, NERVE_OF, defaultState, solve, stepFatigue, muscleState,
  describeDeviation, GAZE_POSITIONS, GAZE_NAMES, strength, prism, lidDroop, PUPIL,
} from './engine.js';
import { CASES, CASE_BY_ID, SIDE_LABEL, CAUSES, sidedName } from './cases.js';
import { KEYS as CHART_KEYS, chartFromState, normalChart, rankPatterns, describeFindings } from './diagnose.js';

const VERSION = 'v3.0';
const MODEL_URL = './head_eyes_v2.glb';
const DEG = Math.PI / 180;
const $ = (id) => document.getElementById(id);

// Embed mode: ?embed=1&parent=<page URL>. The host page forwards its #hash into the
// iframe and receives hash updates back, so shared links point at the host page.
const QS = new URLSearchParams(location.search);
const EMBED = QS.has('embed');
const PARENT = (() => {
  try { const u = new URL(QS.get('parent') || ''); return u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1' ? u : null; } catch { return null; }
})();
if (EMBED) document.documentElement.classList.add('embed');
const shareUrl = () => (PARENT ? `${PARENT.origin}${PARENT.pathname}${location.hash}` : location.href);
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
let mode = 'sim'; // 'sim' | 'chart'

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

  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  ro.observe($('chart-grid'));
  resize();
  return true;
}

function resize() {
  if (!renderer) return;
  const host = mode === 'chart' ? $('chart-grid') : stage;
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  if (mode === 'sim') { camera.aspect = w / h; frameCamera(); }
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
  setupPupils();
  setupLids(model);
  $('loader').hidden = true;
  frameCamera();
  requestFrame();
}

// ── Pupils: enlarge or shrink the pupil painted in the iris texture ──────────
// The iris is a disc whose texture has the pupil centred at uv (0.4955, 0.4961),
// radius 0.14, inside an iris of radius 0.42. Remap radially in the shader.
function setupPupils() {
  for (const eye of ['R', 'L']) {
    eyes[eye].traverse((o) => {
      if (!o.isMesh || !o.material.map || o.material.transmission > 0) return;
      const box = new THREE.Box3().setFromObject(o);
      const size = box.getSize(new THREE.Vector3());
      if (size.z > size.x * 0.2) return; // the iris is the flat disc; the sclera is a sphere
      const m = o.material.clone();
      const u = { value: 1 };
      m.onBeforeCompile = (shader) => {
        shader.uniforms.pupilScale = u;
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float pupilScale;')
          .replace('#include <map_fragment>', `
            #ifdef USE_MAP
              vec2 pc = vec2(0.4955, 0.4961);
              vec2 d = vMapUv - pc;
              float r = length(d);
              float rp0 = 0.14, R = 0.42, rp = clamp(rp0 * pupilScale, 0.04, 0.36);
              float r2 = r < rp ? r * rp0 / rp : (r < R ? rp0 + (r - rp) * (R - rp0) / (R - rp) : r);
              vec2 uv2 = pc + (r > 1e-5 ? d / r * r2 : vec2(0.0));
              diffuseColor *= texture2D(map, uv2);
            #endif`);
      };
      m.customProgramCacheKey = () => 'pupil';
      o.material = m;
      eyes[eye].userData.pupil = u;
    });
  }
}

// ── Eyelids: a thin skin shell around each globe, lowered for ptosis ─────────
// Hidden by the face everywhere except inside the eye opening, like a real lid.
const LID_COLS = 36, LID_ROWS = 14;
const lids = {};
function setupLids(model) {
  // Globe radius in world units, from the widest eye mesh (the sclera) while the eyes look straight ahead
  let radius = 0;
  eyes.L.traverse((o) => {
    if (o.isMesh) { const b = new THREE.Box3().setFromObject(o); radius = Math.max(radius, (b.max.x - b.min.x) / 2); }
  });
  if (!radius) radius = 0.067;
  const skin = sampleLidSkin(model);
  for (const eye of ['R', 'L']) {
    const geo = new THREE.BufferGeometry();
    const n = (LID_COLS + 1) * (LID_ROWS + 1);
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const col = new Float32Array(n * 3);
    for (let j = 0; j <= LID_ROWS; j++) for (let i = 0; i <= LID_COLS; i++) {
      const t = j / LID_ROWS, k = (j * (LID_COLS + 1) + i) * 3;
      // Skin, darkening to a lash line at the margin
      const lash = t > 0.92 ? (t - 0.92) / 0.08 : 0;
      const shade = 1.18 - 0.12 * Math.pow(t, 3);
      const c = skin.clone().multiplyScalar(shade).lerp(new THREE.Color(0x120c0a), lash);
      col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const idx = [];
    for (let j = 0; j < LID_ROWS; j++) for (let i = 0; i < LID_COLS; i++) {
      const a = j * (LID_COLS + 1) + i, b = a + 1, c = a + LID_COLS + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    geo.setIndex(idx);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0, envMapIntensity: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    eyes[eye].getWorldPosition(mesh.position); // the eye node sits at the centre of the globe
    scene.add(mesh);
    lids[eye] = { mesh, radius: radius * 1.06, margin: null };
  }
}

// Average skin colour just above the eye, read from the face texture
function sampleLidSkin(model) {
  const fallback = new THREE.Color(0x7a5a4a);
  try {
    let head = null;
    model.traverse((o) => { if (o.isMesh && o.material.map && !eyes.R.getObjectById(o.id) && !eyes.L.getObjectById(o.id)) head = head || o; });
    if (!head || !head.geometry.attributes.uv) return fallback;
    const target = eyes.R.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.05, 0.05));
    const pos = head.geometry.attributes.position, uv = head.geometry.attributes.uv, v = new THREE.Vector3();
    let best = -1, bestD = Infinity;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); head.localToWorld(v);
      const d = v.distanceToSquared(target);
      if (d < bestD) { bestD = d; best = i; }
    }
    const img = head.material.map.image;
    const w = 64, h = 64, cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0, w, h);
    const px = Math.floor(uv.getX(best) * (w - 1)), py = Math.floor(uv.getY(best) * (h - 1));
    const data = g.getImageData(Math.max(0, px - 1), Math.max(0, py - 1), 3, 3).data;
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; gg += data[i + 1]; b += data[i + 2]; }
    const nPx = data.length / 4;
    return new THREE.Color().setRGB(r / nPx / 255, gg / nPx / 255, b / nPx / 255, THREE.SRGBColorSpace);
  } catch { return fallback; }
}

// Shape the lid for a given margin elevation (degrees, + up). The margin is arched.
function shapeLid(eye, marginDeg) {
  const L = lids[eye];
  if (L.margin !== null && Math.abs(L.margin - marginDeg) < 0.05) return;
  L.margin = marginDeg;
  const pos = L.mesh.geometry.attributes.position, nor = L.mesh.geometry.attributes.normal;
  const span = 75 * DEG, top = 80 * DEG;
  for (let j = 0; j <= LID_ROWS; j++) for (let i = 0; i <= LID_COLS; i++) {
    const a = -span + (2 * span * i) / LID_COLS;                 // azimuth, 0 = straight ahead
    const arch = 9 * Math.cos(a * 1.1) - 9 * Math.cos(span * 1.1); // centre of the margin sits higher
    const em = (marginDeg + arch) * DEG;
    const e = top + (em - top) * (j / LID_ROWS);                 // from above the globe down to the margin
    const x = Math.cos(e) * Math.sin(a), y = Math.sin(e), z = Math.cos(e) * Math.cos(a);
    const k = j * (LID_COLS + 1) + i;
    pos.setXYZ(k, x * L.radius, y * L.radius, z * L.radius);
    nor.setXYZ(k, x, y, z);
  }
  pos.needsUpdate = true; nor.needsUpdate = true;
  L.mesh.geometry.computeBoundingSphere();
}

// Margin elevation: the model's own lid sits near +26°; a complete ptosis reaches about −38°.
// Lids also follow the eye down, as real lids do (the face model's own lids cannot).
const LID_OPEN_DEG = 26, LID_CLOSED_DEG = -38;
function updateLidsAndPupils(st, chartView = false, chartV = null) {
  if (!eyes || !lids.R) return;
  for (const eye of ['R', 'L']) {
    const droop = chartView ? 0 : lidDroop(st, eye);
    const L = lids[eye];
    const v = chartV ? chartV[eye] : shown[eye].v;
    const follow = v < 0 ? 0.85 * v : 0;
    const margin = LID_OPEN_DEG + (LID_CLOSED_DEG - LID_OPEN_DEG) * droop + follow * (1 - 0.4 * droop);
    if (margin > LID_OPEN_DEG - 2) { L.mesh.visible = false; }
    else {
      shapeLid(eye, margin);
      L.mesh.visible = true;
    }
    if (eyes[eye].userData.pupil) eyes[eye].userData.pupil.value = chartView ? 1 : st.pupil[eye];
  }
}

function requestFrame() {
  if (!rafId) rafId = requestAnimationFrame(frame);
}

function frame(t) {
  rafId = 0;
  if (mode === 'chart') { renderChart(); lastT = 0; return; }
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
    updateLidsAndPupils(st);
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
  const tipEl = document.getElementById('target-tip');
  if (tipEl) { tipEl.style.left = targetDot.style.left; tipEl.style.top = targetDot.style.top; }
}

function aimAt(e) {
  const r = stage.getBoundingClientRect();
  const o = eyesOnStage();
  const dx = e.clientX - r.left - o.x, dy = e.clientY - r.top - o.y;
  setGaze(-Math.atan2(dx, o.d) / DEG, -Math.atan2(dy, o.d) / DEG, { fromPointer: true });
}

// On the face itself:
//   mouse  — hover aims the eyes; click locks / unlocks the gaze; press and hold compares with normal
//   touch  — tap or drag aims the eyes; press and hold (without moving) compares with normal
const HOLD_MS = 350, MOVE_PX = 8;
const COARSE = matchMedia('(pointer: coarse)').matches;
const tip = $('target-tip');
let hovering = false;
// Show the "Click to lock" label by the target until the visitor has used the lock twice
let lockUses = 0;
try { lockUses = +localStorage.getItem('gazeLockUses') || 0; } catch { /* storage unavailable */ }

function updateLockHint() {
  const chip = $('lock-chip');
  chip.classList.toggle('is-locked', sim.locked);
  if (sim.locked) {
    chip.textContent = COARSE ? '🔒 Gaze locked · tap "Unlock gaze" below' : '🔒 Gaze locked · click the face to unlock';
  } else if (COARSE) {
    chip.textContent = 'Press and hold the face to compare with normal';
  } else {
    chip.innerHTML = '<span class="key">Click</span> lock gaze · <span class="key">Hold</span> compare with normal';
  }
  chip.hidden = false;
  tip.hidden = COARSE || sim.locked || !hovering || lockUses >= 2;
  tip.style.left = targetDot.style.left;
  tip.style.top = targetDot.style.top;
}
stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovering = true; updateLockHint(); } });
stage.addEventListener('pointerleave', () => { hovering = false; updateLockHint(); });
let press = null;

function setLocked(on) {
  sim.locked = on;
  if (on) { lockUses++; try { localStorage.setItem('gazeLockUses', String(lockUses)); } catch { /* ignore */ } }
  refreshAll();
  announce(on ? 'Gaze locked.' : 'Gaze unlocked.');
}

stage.addEventListener('pointerdown', (e) => {
  if (!e.isPrimary || e.button !== 0) return;
  if (e.target.closest('a, button')) return; // the credit link
  press = { x: e.clientX, y: e.clientY, moved: false, holding: false, mouse: e.pointerType === 'mouse' };
  press.timer = setTimeout(() => { if (press && !press.moved) { press.holding = true; setComparing(true); } }, HOLD_MS);
  if (!press.mouse) { stage.setPointerCapture(e.pointerId); if (!sim.locked) aimAt(e); }
});

stage.addEventListener('pointermove', (e) => {
  if (!e.isPrimary) return;
  if (e.pointerType === 'mouse' && !hovering) { hovering = true; updateLockHint(); }
  if (press && !press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > MOVE_PX) {
    press.moved = true;
    clearTimeout(press.timer);
  }
  if (sim.locked || (press && press.holding)) return;
  if (e.pointerType !== 'mouse' && e.buttons === 0) return;
  aimAt(e);
});

function endPress(e, cancelled) {
  if (!press) return;
  clearTimeout(press.timer);
  if (press.holding) setComparing(false);
  else if (!cancelled && press.mouse && !press.moved) {
    if (!sim.locked) aimAt(e);   // lock exactly where the click happened
    setLocked(!sim.locked);
  }
  press = null;
}
stage.addEventListener('pointerup', (e) => endPress(e, false));
stage.addEventListener('pointercancel', (e) => endPress(e, true));
stage.addEventListener('contextmenu', (e) => { if (press) e.preventDefault(); });

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
  b.title = c.sub;
  b.addEventListener('click', () => {
    const keep = sim.caseId !== 'normal' && c.sides.includes(sim.side);
    applyCase(c.id, keep ? sim.side : (c.sides.includes('R') ? 'R' : c.sides[0]));
  });
  caseList.append(b);
}

const caseSelect = $('case-select');
for (const c of CASES) caseSelect.add(new Option(`${c.name} (${c.sub})`, c.id));
caseSelect.add(new Option('Custom nerve settings', 'custom'));
caseSelect.options[caseSelect.options.length - 1].hidden = true;
caseSelect.addEventListener('change', () => {
  const c = CASE_BY_ID[caseSelect.value]; if (!c) return;
  const keep = sim.caseId !== 'normal' && c.sides.includes(sim.side);
  applyCase(c.id, keep ? sim.side : (c.sides.includes('R') ? 'R' : c.sides[0]));
});

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

document.querySelectorAll('.nerve-btn:not(.sign-btn)').forEach((b) => {
  b.addEventListener('click', () => {
    const { eye, nerve } = b.dataset;
    const cur = sim.state.nerves[eye][nerve];
    const next = cur > 0.75 ? 0.5 : cur > 0.25 ? 0 : 1;
    sim.state.nerves[eye][nerve] = next;
    if (nerve === '3') { // the third nerve also lifts the lid and constricts the pupil
      sim.state.lid[eye] = next === 0 ? 0.55 : next === 0.5 ? 0.25 : 0;
      sim.state.pupil[eye] = next === 0 ? PUPIL.dilated : PUPIL.normal;
    }
    if (NERVE_ONLY.has(sim.caseId)) sim.caseId = 'normal'; // the nerve grid now describes the whole state
    sim.custom = true;
    resolve();
    refreshAll();
    announce(`${eye === 'R' ? 'Right' : 'Left'} cranial nerve ${['', '', '', 'three', 'four', '', 'six'][nerve]}: ${nerveStateName(sim.state.nerves[eye][nerve])}.`);
    requestFrame();
  });
});
const LID_STEPS = [0, 0.25, 0.55, 1];
const LID_NAMES = ['None', 'Mild ptosis', 'Marked ptosis', 'Complete ptosis'];
const lidIndex = (v) => LID_STEPS.reduce((best, x, i) => (Math.abs(x - v) < Math.abs(LID_STEPS[best] - v) ? i : best), 0);
const PUPIL_STEPS = [PUPIL.normal, PUPIL.small, PUPIL.dilated]; // from dilated, one tap gives a normal (spared) pupil
const pupilName = (v) => (v > 1.2 ? 'Dilated' : v < 0.8 ? 'Small' : 'Normal');
document.querySelectorAll('.sign-btn').forEach((b) => {
  b.addEventListener('click', () => {
    const { eye, sign } = b.dataset;
    if (sign === 'lid') sim.state.lid[eye] = LID_STEPS[(lidIndex(sim.state.lid[eye]) + 1) % LID_STEPS.length];
    else {
      const i = PUPIL_STEPS.findIndex((x) => Math.abs(x - sim.state.pupil[eye]) < 0.05);
      sim.state.pupil[eye] = PUPIL_STEPS[(i + 1) % PUPIL_STEPS.length];
    }
    sim.custom = true;
    refreshAll();
    announce(`${eye === 'R' ? 'Right' : 'Left'} ${sign}: ${sign === 'lid' ? LID_NAMES[lidIndex(sim.state.lid[eye])] : pupilName(sim.state.pupil[eye])}.`);
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
$('lock').addEventListener('click', () => setLocked(!sim.locked));

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
  if (mode === 'chart') { chartKey(e); return; }
  if (/^[1-9]$/.test(e.key)) { const [H, V] = GAZE_POSITIONS[e.key]; setGaze(H, V); return; }
  const nudge = { ArrowLeft: [5, 0], ArrowRight: [-5, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[e.key];
  if (nudge && document.activeElement === stage) { e.preventDefault(); setGaze(sim.gazeH + nudge[0], sim.gazeV + nudge[1]); return; }
  if (e.key === 'n' || e.key === 'N') setComparing(true);
  if (e.key === 'l' || e.key === 'L') setLocked(!sim.locked);
});
document.addEventListener('keyup', (e) => { if (e.key === 'n' || e.key === 'N') setComparing(false); });

// ═══════════════════════════════════════════════════════════════
// Motility chart: record the nine positions, then match them to the model
// ═══════════════════════════════════════════════════════════════
const chartGrid = $('chart-grid');
const chartCells = $('chart-cells');
const CELL_NAME = { 7: 'Up-right', 8: 'Up', 9: 'Up-left', 4: 'Right', 5: 'Primary', 6: 'Left', 1: 'Down-right', 2: 'Down', 3: 'Down-left' };
const chart = { obs: normalChart(), edited: new Set(), sel: '5', eye: 'R', suggested: false };
let chartCam = null;
const cellEls = {};

function compactDev(k) {
  const o = chart.obs[k];
  const [H] = GAZE_POSITIONS[k];
  const hz = (H - o.R.h) + (-H - o.L.h), vt = o.R.v - o.L.v;
  const parts = [];
  if (Math.abs(hz) >= 1.5) parts.push(`${hz > 0 ? 'ET' : 'XT'} ${prism(hz)}Δ`);
  if (Math.abs(vt) >= 1.5) parts.push(`${vt > 0 ? 'R/L' : 'L/R'} ${prism(vt)}Δ`);
  return parts.join(' · ');
}

for (const k of CHART_KEYS) {
  const el = document.createElement('div');
  el.className = 'cell';
  el.dataset.key = k;
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.innerHTML = `<span class="pos">${CELL_NAME[k]}</span><span class="dev"></span><span class="eyetag od">OD</span><span class="eyetag os">OS</span>`;
  let drag = null;
  el.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    const r = el.getBoundingClientRect();
    const eye = e.clientX - r.left < r.width / 2 ? 'R' : 'L'; // viewer's left half = patient's right eye
    selectCell(k, eye);
    drag = { x: e.clientX, y: e.clientY, deg: 100 / r.width, h0: chart.obs[k][eye].h, v0: chart.obs[k][eye].v, eye };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.x) * drag.deg, dy = (e.clientY - drag.y) * drag.deg;
    // Dragging toward the viewer's left turns the eye toward the patient's right
    setObs(k, drag.eye, drag.h0 + (drag.eye === 'R' ? -dx : dx), drag.v0 - dy, false);
  });
  const end = () => { if (drag) { drag = null; chartChanged(); } };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('focus', () => { if (chart.sel !== k) selectCell(k, chart.eye); });
  chartCells.append(el);
  cellEls[k] = el;
}

function selectCell(k, eye) {
  chart.sel = k;
  chart.eye = eye;
  updateChartUI();
}

function setObs(k, eye, h, v, commit = true) {
  chart.obs[k][eye] = { h: clamp(h, -55, 55), v: clamp(v, -55, 50) };
  const n = normalChart()[k];
  const same = ['R', 'L'].every((e) => Math.abs(chart.obs[k][e].h - n[e].h) < 0.5 && Math.abs(chart.obs[k][e].v - n[e].v) < 0.5);
  if (same) chart.edited.delete(k); else chart.edited.add(k);
  updateChartUI();
  requestFrame();
  if (commit) chartChanged();
}

function chartChanged() {
  scheduleHash(300);
  if (chart.suggested) suggest(false);
}

function nudge(dir) {
  const k = chart.sel, eye = chart.eye, o = chart.obs[k][eye], step = 2;
  // "left" = toward the viewer's left = the patient's right
  const towardPatientRight = dir === 'left' ? step : dir === 'right' ? -step : 0;
  const dh = eye === 'R' ? towardPatientRight : -towardPatientRight;
  const dv = dir === 'up' ? step : dir === 'down' ? -step : 0;
  setObs(k, eye, o.h + dh, o.v + dv);
}

function updateChartUI() {
  for (const k of CHART_KEYS) {
    const el = cellEls[k];
    el.classList.toggle('selected', k === chart.sel);
    el.classList.toggle('edited', chart.edited.has(k));
    el.querySelector('.dev').textContent = compactDev(k);
    el.querySelector('.eyetag.od').classList.toggle('active', chart.eye === 'R');
    el.querySelector('.eyetag.os').classList.toggle('active', chart.eye === 'L');
    el.setAttribute('aria-pressed', String(k === chart.sel));
    el.setAttribute('aria-label', `Patient looking ${GAZE_NAMES[k]}. ${compactDev(k) || 'Eyes aligned'}.${chart.edited.has(k) ? ' Edited.' : ''}`);
  }
  for (const b of $('eye-picker').children) b.setAttribute('aria-pressed', String(b.dataset.eye === chart.eye));
  $('chart-from-sim').textContent = `Fill from simulator: ${caseTitle()}`;
}

function frameChartCam(cw, ch) {
  chartCam ||= new THREE.PerspectiveCamera(22, 1, 0.05, 50);
  chartCam.aspect = cw / ch;
  const box = { w: 0.7, h: 0.3, y: eyeMid.y - 0.005 };
  const t = Math.tan((chartCam.fov * DEG) / 2);
  const dist = Math.max(box.h / 2 / t, box.w / 2 / (t * chartCam.aspect));
  chartCam.position.set(0, box.y + 0.02, eyeMid.z + dist);
  chartCam.lookAt(0, box.y, eyeMid.z);
  chartCam.updateProjectionMatrix();
}

function renderChart() {
  if (!renderer || !eyes) return;
  const W = chartGrid.clientWidth, H = chartGrid.clientHeight;
  if (!W || !H) return;
  const cw = W / 3, ch = H / 3;
  frameChartCam(cw, ch);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W, H);
  renderer.clear();
  renderer.setScissorTest(true);
  CHART_KEYS.forEach((k, i) => {
    const row = Math.floor(i / 3), col = i % 3;
    for (const eye of ['R', 'L']) {
      const o = chart.obs[k][eye];
      eyes[eye].rotation.y = (eye === 'R' ? -1 : 1) * o.h * DEG;
      eyes[eye].rotation.x = -o.v * DEG;
      eyes[eye].position.z = eyes[eye].userData.z0;
    }
    updateLidsAndPupils(null, true, { R: chart.obs[k].R.v, L: chart.obs[k].L.v });
    const [gh, gv] = GAZE_POSITIONS[k];
    const Hr = gh * DEG, Vr = gv * DEG;
    penlight.position.set(eyeMid.x - Math.sin(Hr) * Math.cos(Vr) * 1.6, eyeMid.y + Math.sin(Vr) * 1.6, eyeMid.z + Math.cos(Hr) * Math.cos(Vr) * 1.6);
    const x = col * cw, y = H - (row + 1) * ch;
    renderer.setViewport(x, y, cw, ch);
    renderer.setScissor(x, y, cw, ch);
    renderer.render(scene, chartCam);
  });
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W, H);
}

function suggest(say = true) {
  chart.suggested = true;
  const ranked = rankPatterns(chart.obs, chart.edited);
  const box = $('results');
  box.innerHTML = '';
  const add = (tag, text, cls) => { const el = document.createElement(tag); if (text != null) el.textContent = text; if (cls) el.className = cls; box.append(el); return el; };
  add('h2', 'Most likely patterns');
  add('p', 'Your chart compared with every condition in the model, at several severities and with either eye fixing.', 'hint');
  const best = ranked[0];
  if (best.rms > 6) add('p', `Nothing in the model reproduces this chart closely (closest fit is off by about ${Math.round(best.rms)}° per eye per position). Consider combined lesions, a restrictive process, myasthenia, or re-checking the chart.`, 'warn');
  const ol = add('ol');
  const shown = ranked.filter((r) => r.probability >= 0.02).slice(0, 5);
  shown.forEach((r, i) => {
    const li = document.createElement('li');
    const name = document.createElement('div');
    name.className = 'dx';
    name.textContent = r.label;
    if (r.severity) { const sv = document.createElement('span'); sv.className = 'sev'; sv.textContent = ` · ${r.severity}`; name.append(sv); }
    const fit = document.createElement('div');
    fit.className = 'fit';
    const pct = Math.round(r.probability * 100);
    fit.innerHTML = `<div class="bar"><i style="width:${pct}%"></i></div><span class="pct">${pct}%</span>`;
    li.append(name, fit);
    const causes = (CAUSES[r.caseId] || []).slice(0, i === 0 ? 6 : 3);
    if (causes.length) {
      const ul = document.createElement('ul'); ul.className = 'causes';
      for (const c of causes) { const it = document.createElement('li'); it.textContent = c; ul.append(it); }
      li.append(ul);
    }
    if (r.caseId !== 'normal') {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn open';
      b.textContent = 'Open in simulator';
      b.addEventListener('click', () => { setMode('sim'); applyCase(r.caseId, r.side); });
      li.append(b);
    }
    ol.append(li);
  });
  add('h3', 'What you charted');
  const ul = add('ul', null, 'findings');
  for (const f of describeFindings(chart.obs)) { const li = document.createElement('li'); li.textContent = f; ul.append(li); }
  add('p', 'Myasthenia gravis can mimic any of these patterns: ask about variability, fatigue and ptosis. Pupil involvement, pain, or other neurological signs need urgent assessment.', 'redflag');
  add('p', 'Pattern matching against a simplified teaching model. Not a diagnosis.', 'hint');
  if (say) announce(`Most likely: ${best.label}, ${Math.round(best.probability * 100)} percent.`);
  scheduleHash(300);
}

function showChartIntro() {
  const box = $('results');
  box.innerHTML = `<h2>Chart what you see</h2>
    <ol class="findings" style="padding-left:18px">
      <li>Each box shows the eyes in one cardinal position, as you face the patient. They start out normal.</li>
      <li>For every position where something looks off, drag that eye (or select it and use the arrows) to where you saw it.</li>
      <li>Press <strong>Enter</strong> or <strong>Suggest diagnosis</strong>. The ranking updates as you keep adjusting.</li>
    </ol>
    <p class="hint">To see how it works, set up a case in the Simulator, come back and press <em>Fill from simulator</em>.</p>`;
}

function chartKey(e) {
  const tag = document.activeElement?.tagName;
  if (/^[1-9]$/.test(e.key)) { selectCell(e.key, chart.eye); cellEls[e.key].focus(); return; }
  const dir = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key];
  if (dir) { e.preventDefault(); nudge(dir); return; }
  if (e.key === 'o' || e.key === 'O') { chart.eye = chart.eye === 'R' ? 'L' : 'R'; updateChartUI(); return; }
  if (e.key === 'Enter' && tag !== 'BUTTON' && tag !== 'A') { e.preventDefault(); suggest(); }
}

$('eye-picker').addEventListener('click', (e) => { const b = e.target.closest('button[data-eye]'); if (b) { chart.eye = b.dataset.eye; updateChartUI(); } });
document.querySelectorAll('[data-nudge]').forEach((b) => b.addEventListener('click', () => nudge(b.dataset.nudge)));
$('chart-reset-cell').addEventListener('click', () => {
  const n = normalChart()[chart.sel];
  chart.obs[chart.sel] = { R: { ...n.R }, L: { ...n.L } };
  chart.edited.delete(chart.sel); updateChartUI(); requestFrame(); chartChanged();
});
$('chart-reset').addEventListener('click', () => {
  chart.obs = normalChart(); chart.edited.clear(); chart.suggested = false;
  showChartIntro(); updateChartUI(); requestFrame(); scheduleHash();
});
$('chart-from-sim').addEventListener('click', () => {
  chart.obs = chartFromState(sim.state, sim.fixing);
  const n = normalChart();
  chart.edited = new Set(CHART_KEYS.filter((k) => ['R', 'L'].some((e) => Math.abs(chart.obs[k][e].h - n[k][e].h) > 0.5 || Math.abs(chart.obs[k][e].v - n[k][e].v) > 0.5)));
  updateChartUI(); requestFrame(); chartChanged();
  announce(`Chart filled from ${caseTitle()}.`);
});
$('chart-suggest').addEventListener('click', () => suggest());

function setMode(m) {
  mode = m === 'chart' ? 'chart' : 'sim';
  document.body.classList.toggle('chart-mode', mode === 'chart');
  $('chart').hidden = mode !== 'chart';
  $('results').hidden = mode !== 'chart';
  (mode === 'chart' ? chartGrid : stage).prepend(canvas);
  for (const b of $('mode-picker').children) { b.setAttribute('aria-selected', String(b.dataset.mode === mode)); b.tabIndex = b.dataset.mode === mode ? 0 : -1; }
  if (mode === 'chart') { updateChartUI(); if (!chart.suggested) showChartIntro(); }
  resize();
  requestFrame();
  scheduleHash();
}
$('mode-picker').addEventListener('click', (e) => { const b = e.target.closest('button[data-mode]'); if (b) setMode(b.dataset.mode); });
// Arrow keys move between the two tabs (standard tab pattern)
$('mode-picker').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault(); e.stopPropagation();
  const next = mode === 'sim' ? 'chart' : 'sim';
  setMode(next);
  $('mode-picker').querySelector(`[data-mode="${next}"]`).focus();
});
document.querySelectorAll('[data-mode-jump]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.modeJump)));

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
    for (const eye of ['R', 'L']) {
      if (Math.abs(sim.state.lid[eye] - base.lid[eye]) > 0.01) parts.push(`${eye === 'R' ? 'Right' : 'Left'} ${LID_NAMES[lidIndex(sim.state.lid[eye])].toLowerCase().replace('none', 'no ptosis')}`);
      if (Math.abs(sim.state.pupil[eye] - base.pupil[eye]) > 0.05) parts.push(`${eye === 'R' ? 'Right' : 'Left'} pupil ${pupilName(sim.state.pupil[eye]).toLowerCase()}`);
    }
    const prefix = sim.caseId !== 'normal' ? `${SIDE_LABEL[sim.side]} ${CASE_BY_ID[sim.caseId].name.toLowerCase()} + ` : '';
    return parts.length ? `${prefix}${parts.join(', ')}` : (prefix ? prefix.slice(0, -3) : 'Normal');
  }
  return sidedName(sim.caseId, sim.side);
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
  caseSelect.value = sim.custom ? 'custom' : sim.caseId;
  for (const b of $('side-picker').children) {
    b.disabled = !c.sides.includes(b.dataset.side);
    b.setAttribute('aria-pressed', String(!sim.custom && b.dataset.side === sim.side && c.id !== 'normal'));
  }
  $('side-row').hidden = c.id === 'normal' || sim.custom;
  document.querySelectorAll('.sign-btn').forEach((b) => {
    const { eye, sign } = b.dataset;
    const label = sign === 'lid' ? LID_NAMES[lidIndex(sim.state.lid[eye])] : pupilName(sim.state.pupil[eye]);
    const abnormal = sign === 'lid' ? sim.state.lid[eye] > 0.01 : Math.abs(sim.state.pupil[eye] - 1) > 0.05;
    b.dataset.state = abnormal ? 'paresis' : 'normal';
    b.innerHTML = `${eye === 'R' ? 'OD' : 'OS'}<span class="st">${label}</span>`;
    b.setAttribute('aria-label', `${eye === 'R' ? 'Right' : 'Left'} ${sign}: ${label}`);
  });
  document.querySelectorAll('.nerve-btn:not(.sign-btn)').forEach((b) => {
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
  $('lock').textContent = sim.locked ? 'Unlock gaze' : 'Lock gaze';
  updateLockHint();
  targetDot.classList.toggle('locked', sim.locked);
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
  if (mode === 'chart') {
    p.set('mode', 'chart');
    const c = [];
    for (const k of chart.edited) for (const e of ['R', 'L']) c.push(`${k}${e}${Math.round(chart.obs[k][e].h)}_${Math.round(chart.obs[k][e].v)}`);
    if (c.length) p.set('c', c.join(','));
    if (chart.suggested) p.set('s', '1');
    const hash = `#${p.toString().replace(/%2C/g, ',')}`;
    if (hash !== location.hash) history.replaceState(null, '', hash);
    if (PARENT && window.parent !== window) window.parent.postMessage({ type: 'gaze-hash', hash }, PARENT.origin);
    return;
  }
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
    const base = defaultState(); CASE_BY_ID[sim.caseId].apply(base, sim.side);
    const lp = [];
    for (const eye of ['R', 'L']) {
      if (Math.abs(sim.state.lid[eye] - base.lid[eye]) > 0.01) lp.push(`${eye}lid:${Math.round(sim.state.lid[eye] * 100)}`);
      if (Math.abs(sim.state.pupil[eye] - base.pupil[eye]) > 0.05) lp.push(`${eye}pup:${Math.round(sim.state.pupil[eye] * 100)}`);
    }
    if (lp.length) p.set('lp', lp.join(','));
  }
  const hash = `#${p.toString().replace(/%3A/g, ':').replace(/%2C/g, ',')}`;
  if (hash !== location.hash) history.replaceState(null, '', hash);
  if (PARENT && window.parent !== window) window.parent.postMessage({ type: 'gaze-hash', hash }, PARENT.origin);
}
function readHash() {
  const raw = location.hash.slice(1);
  if (!raw.includes('=')) return false;
  const p = new URLSearchParams(raw);
  if (p.get('mode') === 'chart') {
    if (!sim.solution) applyCase('normal', 'B', { keepGaze: true, announce: false });
    chart.obs = normalChart(); chart.edited.clear();
    for (const part of (p.get('c') || '').split(',')) {
      const m = /^([1-9])([RL])(-?\d{1,2})_(-?\d{1,2})$/.exec(part);
      if (m) { chart.obs[m[1]][m[2]] = { h: clamp(+m[3], -55, 55), v: clamp(+m[4], -55, 50) }; chart.edited.add(m[1]); }
    }
    setMode('chart');
    if (p.get('s') === '1') suggest(false);
    return true;
  }
  if (mode === 'chart') setMode('sim');
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
  if (p.get('lp')) {
    for (const part of p.get('lp').split(',')) {
      const m = /^([RL])(lid|pup):(\d{1,3})$/.exec(part);
      if (!m) continue;
      if (m[2] === 'lid') sim.state.lid[m[1]] = clamp(+m[3] / 100, 0, 1); else sim.state.pupil[m[1]] = clamp(+m[3] / 100, 0.4, 2.2);
      sim.custom = true;
    }
  }
  resolve(); frameCamera(); refreshAll(); requestFrame();
  return true;
}
window.addEventListener('hashchange', () => {
  if (readHash() && !EMBED) stage.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
});

// ═══════════════════════════════════════════════════════════════
// Share: copy link, save a labelled image
// ═══════════════════════════════════════════════════════════════
$('copy-link').addEventListener('click', async () => {
  writeHash();
  try { await navigator.clipboard.writeText(shareUrl()); toast('Link copied'); }
  catch { prompt('Copy this link:', shareUrl()); }
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
      await navigator.share({ files: [file], title: caseTitle(), text: shareUrl() });
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
for (const b of $('mode-picker').children) { b.setAttribute('aria-selected', String(b.dataset.mode === mode)); b.tabIndex = b.dataset.mode === mode ? 0 : -1; }
if (!readHash()) { sim.gazeH = 0; sim.gazeV = 0; applyCase('normal', 'B', { keepGaze: true, announce: false }); }
for (const eye of ['R', 'L']) { shown[eye].h = sim.solution[eye].h; shown[eye].v = sim.solution[eye].v; }
if (initRenderer()) loadModel();

// In an embed, report our height so the host page sizes the iframe and does all the scrolling
if (EMBED && window.parent !== window) {
  let lastH = 0;
  const report = () => {
    const h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (Math.abs(h - lastH) > 1) { lastH = h; window.parent.postMessage({ type: 'gaze-height', height: h }, PARENT ? PARENT.origin : '*'); }
  };
  new ResizeObserver(report).observe(document.body);
  report();
}

// Small hook for automated checks and the preview-image build
window.__gaze = { sim, applyCase, setGaze, exportImage, readHash, shareUrl, chart, setMode, suggest, nudge, selectCell };
