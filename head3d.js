// ═══════════════════════════════════════════════════════════════
// 3D head for the companion pages (fixation disparity demo)
// ═══════════════════════════════════════════════════════════════
// Loads the same face model as the simulator, aims each eye, adds upper lids
// that follow the eyes down, and projects points to the host element.
// The main simulator (main.js) has its own copy of this setup with pupils,
// ptosis and the motility chart.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const DEG = Math.PI / 180;
const LID_COLS = 36, LID_ROWS = 14;
const LID_OPEN_DEG = 6; // lid margin (ends) at rest; matches the face model's own lids

/**
 * createHead(canvas, host) → head
 *   head.ready            Promise, resolves once the model is loaded
 *   head.aim(eye, h, v)   degrees; h + = abduction, v + = up
 *   head.setView(v)       'face' | 'eyes'
 *   head.project(eye)     { x, y } in host pixels of the eye centre (also accepts a world Vector3)
 *   head.render()
 */
export function createHead(canvas, host, { url = './head_eyes_v2.glb', onProgress } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x0b0d12, 0);

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
  scene.add(new THREE.HemisphereLight(0xf2f4ff, 0x2a2420, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(1.5, 2.2, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45);
  fill.position.set(-2.5, 0.5, 3);
  scene.add(fill);
  const glint = new THREE.PointLight(0xfff4e0, 2.2, 0, 2); // corneal reflex from a light in front of the face
  scene.add(glint);

  let eyes = null, view = 'face';
  const eyeMid = new THREE.Vector3();
  const lids = {};
  const shown = { R: { h: 0, v: 0 }, L: { h: 0, v: 0 } };

  function frame() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (eyes) {
      const box = view === 'eyes' ? { w: 0.62, h: 0.55, y: eyeMid.y - 0.02 } : { w: 1.05, h: 1.0, y: eyeMid.y - 0.14 };
      const t = Math.tan((camera.fov * DEG) / 2);
      const dist = Math.max(box.h / 2 / t, box.w / 2 / (t * camera.aspect)) + 0.1;
      camera.position.set(0, box.y + 0.05, eyeMid.z + dist);
      camera.lookAt(0, box.y, eyeMid.z);
      glint.position.set(eyeMid.x, eyeMid.y, eyeMid.z + 1.6);
    }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  const ready = new Promise((resolve, reject) => {
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(url, (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      model.scale.setScalar(1.8 / box.getSize(new THREE.Vector3()).y);
      let eyeL = null, eyeR = null;
      model.traverse((o) => {
        if (o.name === 'Eye_L') eyeL = o;
        if (o.name === 'Eye_R') eyeR = o;
        if (!o.isMesh) return;
        const m = o.material;
        if (m.map) m.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        m.envMapIntensity = 0.35;
        if (m.transmission > 0) { // the cornea: a cheap glossy shell instead of a transmission pass
          Object.assign(m, { transmission: 0, transparent: true, opacity: 0.18, depthWrite: false, roughness: 0.02, clearcoat: 1, envMapIntensity: 1.2 });
        }
      });
      if (!eyeL || !eyeR) { reject(new Error('The 3D model is missing its eyes.')); return; }
      scene.add(model);
      model.updateMatrixWorld(true);
      const pR = eyeR.getWorldPosition(new THREE.Vector3()), pL = eyeL.getWorldPosition(new THREE.Vector3());
      model.position.y -= (pR.y + pL.y) / 2; // centre the face on the eyes
      model.updateMatrixWorld(true);
      eyeR.getWorldPosition(pR); eyeL.getWorldPosition(pL);
      eyeMid.copy(pR).add(pL).multiplyScalar(0.5);
      for (const e of [eyeR, eyeL]) e.rotation.order = 'YXZ';
      eyes = { R: eyeR, L: eyeL };
      setupLids(model);
      frame();
      resolve(api);
    }, (e) => onProgress?.(e), reject);
  });

  // ── Upper lids: skin shells that follow the eyes in downgaze (as in main.js) ──
  function setupLids(model) {
    let radius = 0;
    eyes.L.traverse((o) => { if (o.isMesh) { const b = new THREE.Box3().setFromObject(o); radius = Math.max(radius, (b.max.x - b.min.x) / 2); } });
    const skin = sampleSkin(model);
    for (const eye of ['R', 'L']) {
      const geo = new THREE.BufferGeometry();
      const n = (LID_COLS + 1) * (LID_ROWS + 1);
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const col = new Float32Array(n * 3);
      for (let j = 0; j <= LID_ROWS; j++) for (let i = 0; i <= LID_COLS; i++) {
        const t = j / LID_ROWS, k = (j * (LID_COLS + 1) + i) * 3;
        const c = skin.clone().multiplyScalar(1.18 - 0.12 * t ** 3).lerp(new THREE.Color(0x120c0a), t > 0.92 ? (t - 0.92) / 0.08 : 0);
        col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const idx = [];
      for (let j = 0; j < LID_ROWS; j++) for (let i = 0; i < LID_COLS; i++) {
        const a = j * (LID_COLS + 1) + i, b = a + 1, c = a + LID_COLS + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
      geo.setIndex(idx);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0, envMapIntensity: 0.35 }));
      mesh.visible = false;
      eyes[eye].getWorldPosition(mesh.position);
      scene.add(mesh);
      lids[eye] = { mesh, radius: (radius || 0.067) * 1.06, margin: null };
    }
  }

  function sampleSkin(model) {
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
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const g = cv.getContext('2d');
      g.drawImage(head.material.map.image, 0, 0, 64, 64);
      const data = g.getImageData(Math.max(0, Math.floor(uv.getX(best) * 63) - 1), Math.max(0, Math.floor(uv.getY(best) * 63) - 1), 3, 3).data;
      let r = 0, gg = 0, b = 0;
      for (let i = 0; i < data.length; i += 4) { r += data[i]; gg += data[i + 1]; b += data[i + 2]; }
      const nPx = data.length / 4;
      return new THREE.Color().setRGB(r / nPx / 255, gg / nPx / 255, b / nPx / 255, THREE.SRGBColorSpace);
    } catch { return fallback; }
  }

  function shapeLid(eye, marginDeg) {
    const L = lids[eye];
    if (L.margin !== null && Math.abs(L.margin - marginDeg) < 0.05) return;
    L.margin = marginDeg;
    const pos = L.mesh.geometry.attributes.position, nor = L.mesh.geometry.attributes.normal;
    const span = 75 * DEG, top = 80 * DEG;
    for (let j = 0; j <= LID_ROWS; j++) for (let i = 0; i <= LID_COLS; i++) {
      const a = -span + (2 * span * i) / LID_COLS;
      const arch = 9 * Math.cos(a * 1.1) - 9 * Math.cos(span * 1.1);
      const e = top + ((marginDeg + arch) * DEG - top) * (j / LID_ROWS);
      const x = Math.cos(e) * Math.sin(a), y = Math.sin(e), z = Math.cos(e) * Math.cos(a);
      const k = j * (LID_COLS + 1) + i;
      pos.setXYZ(k, x * L.radius, y * L.radius, z * L.radius);
      nor.setXYZ(k, x, y, z);
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
    L.mesh.geometry.computeBoundingSphere();
  }

  const api = {
    ready,
    renderer, scene, camera,
    get loaded() { return !!eyes; },
    eyeMid,
    aim(eye, h, v) {
      shown[eye].h = h; shown[eye].v = v;
      if (!eyes) return;
      eyes[eye].rotation.y = (eye === 'R' ? -1 : 1) * h * DEG; // rotation.y is + toward the patient's left
      eyes[eye].rotation.x = -v * DEG;
      const margin = LID_OPEN_DEG + (v < 0 ? 0.75 * v : 0);
      if (margin > LID_OPEN_DEG - 2) lids[eye].mesh.visible = false;
      else { shapeLid(eye, margin); lids[eye].mesh.visible = true; }
    },
    setView(v) { view = v; frame(); },
    resize: frame,
    project(p) {
      const v = typeof p === 'string' ? eyes[p].getWorldPosition(new THREE.Vector3()) : p.clone();
      v.project(camera);
      return { x: (v.x * 0.5 + 0.5) * host.clientWidth, y: (-v.y * 0.5 + 0.5) * host.clientHeight };
    },
    render() { renderer.render(scene, camera); },
  };
  return api;
}
