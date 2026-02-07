import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const MUSCLES = ["LR", "MR", "SR", "IR", "SO", "IO"];
const MUSCLE_NAMES = {
  LR: "Lateral Rectus",
  MR: "Medial Rectus",
  SR: "Superior Rectus",
  IR: "Inferior Rectus",
  SO: "Superior Oblique",
  IO: "Inferior Oblique"
};

const APP_STATE = {
  ready: false,
  hasPointer: false,
  target: new THREE.Vector3(),
  smoothTarget: new THREE.Vector3(),
  performance: {
    fps: 0,
    frameCount: 0,
    lastTime: performance.now()
  }
};

const uiCache = { left: {}, right: {} };
const gazeDot = document.getElementById('gaze-dot');
const startPrompt = document.getElementById('start-prompt');

const SYSTEM_STATE = {
  nerves: {
    "R-CN3": 1, "R-CN4": 1, "R-CN6": 1,
    "L-CN3": 1, "L-CN4": 1, "L-CN6": 1
  },
  muscles: {
    right: { LR: 1, MR: 1, SR: 1, IR: 1, SO: 1, IO: 1 },
    left: { LR: 1, MR: 1, SR: 1, IR: 1, SO: 1, IO: 1 }
  },
  history: [] // State history for undo/redo
};

// ═══════════════════════════════════════════════════════════════
// ENHANCED PATHOLOGY LIBRARY
// ═══════════════════════════════════════════════════════════════

const PATHOLOGIES = {
  "CN III Palsy": {
    s: ['R', 'L', 'B'],
    desc: "Oculomotor nerve palsy",
    f: (side) => setNerve(side, 3, 0)
  },
  "CN IV Palsy": {
    s: ['R', 'L', 'B'],
    desc: "Trochlear nerve palsy",
    f: (side) => setNerve(side, 4, 0)
  },
  "CN VI Palsy": {
    s: ['R', 'L', 'B'],
    desc: "Abducens nerve palsy",
    f: (side) => setNerve(side, 6, 0)
  },
  "INO (MLF)": {
    s: ['R', 'L', 'B'],
    desc: "Internuclear ophthalmoplegia",
    f: (side) => {
      if (side === 'right' || side === 'both') SYSTEM_STATE.muscles.right.MR = 0;
      if (side === 'left' || side === 'both') SYSTEM_STATE.muscles.left.MR = 0;
    }
  },
  "Graves (TED)": {
    s: ['R', 'L', 'B'],
    desc: "Thyroid eye disease",
    f: (side) => {
      const targets = side === 'both' ? ['right', 'left'] : [side];
      targets.forEach(s => {
        SYSTEM_STATE.muscles[s].IR = 0.3;
        SYSTEM_STATE.muscles[s].MR = 0.5;
      });
    }
  },
  "Blowout Fx": {
    s: ['R', 'L'],
    desc: "Orbital floor fracture",
    f: (side) => {
      SYSTEM_STATE.muscles[side].IR = 0;
    }
  },
  "Brown Syn.": {
    s: ['R', 'L'],
    desc: "Brown syndrome",
    f: (side) => {
      SYSTEM_STATE.muscles[side].IO = 0;
    }
  },
  "Miller Fisher": {
    s: ['B'],
    desc: "Miller Fisher syndrome",
    f: () => {
      Object.keys(SYSTEM_STATE.nerves).forEach(k => SYSTEM_STATE.nerves[k] = 0.1);
    }
  },
  "Wallenberg": {
    s: ['R', 'L'],
    desc: "Lateral medullary syndrome",
    f: (side) => {
      const isR = side === 'right';
      SYSTEM_STATE.muscles[isR ? 'right' : 'left'].IR = 0.5;
      SYSTEM_STATE.muscles[isR ? 'left' : 'right'].SR = 0.5;
    }
  },
  "Duane Syn.": {
    s: ['R', 'L'],
    desc: "Duane retraction syndrome",
    f: (side) => {
      SYSTEM_STATE.muscles[side].LR = 0.2;
      SYSTEM_STATE.muscles[side].MR = 0.8;
    }
  },
  "Myasthenia": {
    s: ['B'],
    desc: "Myasthenia gravis",
    f: () => {
      ['right', 'left'].forEach(side => {
        MUSCLES.forEach(m => {
          SYSTEM_STATE.muscles[side][m] = 0.6;
        });
      });
    }
  }
};

let activePathName = null;

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function setNerve(side, num, val) {
  if (side === 'both') {
    SYSTEM_STATE.nerves['R-CN' + num] = val;
    SYSTEM_STATE.nerves['L-CN' + num] = val;
  } else {
    SYSTEM_STATE.nerves[(side === 'right' ? 'R' : 'L') + '-CN' + num] = val;
  }
}

function saveState() {
  const state = JSON.parse(JSON.stringify(SYSTEM_STATE));
  SYSTEM_STATE.history.push(state);
  if (SYSTEM_STATE.history.length > 50) {
    SYSTEM_STATE.history.shift();
  }
}

window.resetSystem = () => {
  saveState();
  Object.keys(SYSTEM_STATE.nerves).forEach(k => SYSTEM_STATE.nerves[k] = 1);
  ['right', 'left'].forEach(s => MUSCLES.forEach(m => SYSTEM_STATE.muscles[s][m] = 1));
  document.querySelectorAll('.path-btn').forEach(b => b.classList.remove('active-path'));
  activePathName = null;
  updateUIStyles();
};

window.toggleState = (id, side = null, m = null) => {
  saveState();
  let cur = m ? SYSTEM_STATE.muscles[side][m] : SYSTEM_STATE.nerves[id];
  let next = cur === 1 ? 0.5 : (cur === 0.5 ? 0 : 1);
  if (m) SYSTEM_STATE.muscles[side][m] = next;
  else SYSTEM_STATE.nerves[id] = next;
  updateUIStyles();
};

window.applyPathology = (side) => {
  saveState();
  resetSystem();
  PATHOLOGIES[activePathName].f(side);
  document.querySelectorAll('.path-btn').forEach(b => {
    if (b.innerText === activePathName) b.classList.add('active-path');
  });
  updateUIStyles();
  document.getElementById('side-modal').style.display = 'none';
  if (window.collapseAllMenus) window.collapseAllMenus();
};

function updateUIStyles() {
  // Update nerve pills
  Object.entries(SYSTEM_STATE.nerves).forEach(([id, v]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'pill' + (v === 0.5 ? ' paresis' : (v === 0 ? ' paralysis' : ''));
  });

  // Update muscle labels
  ['left', 'right'].forEach(s => {
    const sideKey = s === 'left' ? 'L' : 'R';
    MUSCLES.forEach(m => {
      const v = SYSTEM_STATE.muscles[s][m];
      const el = document.querySelector(`#muscles${sideKey} .m-label-${m}`);
      if (el) {
        el.className = `m-label m-label-${m}` +
          (v === 0.5 ? ' paresis' : (v === 0 ? ' paralysis' : ''));
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// UI INITIALIZATION
// ═══════════════════════════════════════════════════════════════

function initUI() {
  const sides = [
    { id: "musclesR", key: "right", label: "Right Eye (OD)" },
    { id: "musclesL", key: "left", label: "Left Eye (OS)" }
  ];

  sides.forEach(s => {
    const el = document.getElementById(s.id);
    if (!el) return;
    el.innerHTML = `<div class="panel-title">${s.label}</div>`;

    MUSCLES.forEach(m => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <div class="m-label m-label-${m}" onclick="toggleState(null, '${s.key}', '${m}')" title="${MUSCLE_NAMES[m]}">
          ${m}
        </div>
        <div class="barWrap">
          <div class="bar"></div>
        </div>
        <div class="pct">0%</div>
      `;
      el.appendChild(row);
      uiCache[s.key][m] = {
        bar: row.querySelector(".bar"),
        pct: row.querySelector(".pct")
      };
    });
  });

  // Initialize pathology grid
  const grid = document.getElementById('pathology-grid');
  if (!grid) return;

  Object.keys(PATHOLOGIES).forEach(name => {
    const btn = document.createElement('div');
    btn.className = 'pill path-btn';
    btn.innerText = name;
    btn.title = PATHOLOGIES[name].desc;
    btn.onclick = () => {
      activePathName = name;
      const modal = document.getElementById('side-modal');
      document.getElementById('modal-disease-name').innerText = name.toUpperCase();
      modal.style.display = 'flex';
    };
    grid.appendChild(btn);
  });
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED MUSCLE RECRUITMENT ALGORITHM
// ═══════════════════════════════════════════════════════════════

function getRecruitment(isRight, targetYaw, targetPitch) {
  const side = isRight ? 'right' : 'left';
  const prefix = isRight ? 'R-' : 'L-';

  // Calculate effective muscle strength
  const health = {
    LR: SYSTEM_STATE.nerves[prefix + 'CN6'] * SYSTEM_STATE.muscles[side].LR,
    MR: SYSTEM_STATE.nerves[prefix + 'CN3'] * SYSTEM_STATE.muscles[side].MR,
    SR: SYSTEM_STATE.nerves[prefix + 'CN3'] * SYSTEM_STATE.muscles[side].SR,
    IR: SYSTEM_STATE.nerves[prefix + 'CN3'] * SYSTEM_STATE.muscles[side].IR,
    IO: SYSTEM_STATE.nerves[prefix + 'CN3'] * SYSTEM_STATE.muscles[side].IO,
    SO: SYSTEM_STATE.nerves[prefix + 'CN4'] * SYSTEM_STATE.muscles[side].SO
  };

  // Calculate drift from impaired muscles
  const driftX = (1 - health.LR) * -0.4 + (1 - health.MR) * 0.4;
  const driftY = (1 - health.SR) * -0.1 + (1 - health.IR) * 0.1 +
    (health.SR === 0 && health.IR === 0 ? -0.25 : 0);

  // Enhanced responsive rotation with smooth falloff
  let rotationYaw = isRight ?
    (targetYaw < 0 ? targetYaw * health.LR * 1.5 : targetYaw * health.MR * 1.5) :
    (targetYaw > 0 ? targetYaw * health.LR * 1.5 : targetYaw * health.MR * 1.5);

  // Smooth blend between primary and oblique muscles
  const nasalYaw = isRight ? targetYaw : -targetYaw;
  const blend = 1 / (1 + Math.exp(-(nasalYaw + 0.15) * 7));

  // Vertical rotation with muscle blending
  let rotationPitch;
  if (targetPitch > 0) {
    rotationPitch = (targetPitch * 1.4) * ((1 - blend) * health.SR + blend * health.IO);
  } else {
    rotationPitch = (targetPitch * 2.8) * ((1 - blend) * health.IR + blend * health.SO);
  }

  const finalYaw = rotationYaw + (isRight ? -driftX : driftX);
  const finalPitch = rotationPitch + driftY;

  // Calculate realistic muscle activation
  const effortY = Math.abs(targetPitch);
  const abduction = isRight ? -finalYaw : finalYaw;
  const adduction = -abduction;

  return {
    rotation: { y: finalYaw, x: finalPitch },
    activations: {
      LR: (0.2 + Math.max(0, abduction) * 1.8) * health.LR,
      MR: (0.2 + Math.max(0, adduction) * 1.8) * health.MR,
      SR: (0.2 + (targetPitch > 0 ? effortY : 0) * 2.2 * (1 - blend)) * health.SR,
      IR: (0.2 + (targetPitch < 0 ? effortY : 0) * 2.2 * (1 - blend)) * health.IR,
      IO: (0.2 + (targetPitch > 0 ? effortY : 0) * 2.0 * blend) * health.IO,
      SO: (0.2 + (targetPitch < 0 ? effortY : 0) * 2.0 * blend + (health.IR === 0 ? 0.3 : 0)) * health.SO
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// THREE.JS SCENE SETUP WITH ENHANCED RENDERING
// ═══════════════════════════════════════════════════════════════

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a0a0f, 5, 15);

const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 6.5;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.getElementById("app").appendChild(renderer.domElement);

// Enhanced lighting setup
const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x080820, 0.6);
scene.add(hemisphereLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
keyLight.position.set(2, 3, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x4cc9f0, 0.3);
fillLight.position.set(-2, 1, -2);
scene.add(fillLight);

const penlight = new THREE.PointLight(0xffffff, 100, 12);
penlight.castShadow = false;
scene.add(penlight);

// Add rim light for depth
const rimLight = new THREE.DirectionalLight(0x4cc9f0, 0.5);
rimLight.position.set(0, 0, -5);
scene.add(rimLight);

// Post-processing (optional, can be disabled for better performance)
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.3,  // strength
  0.4,  // radius
  0.85  // threshold
);
composer.addPass(bloomPass);

// ═══════════════════════════════════════════════════════════════
// INPUT HANDLING WITH SMOOTHING
// ═══════════════════════════════════════════════════════════════

let lastInputTime = 0;
const INPUT_THROTTLE = 16; // ~60fps max

const handleInput = (x, y) => {
  const now = performance.now();
  if (now - lastInputTime < INPUT_THROTTLE) return;
  lastInputTime = now;

  if (startPrompt && startPrompt.style.opacity !== '0') {
    startPrompt.style.opacity = '0';
    setTimeout(() => startPrompt.style.display = 'none', 600);
  }

  const mouse = {
    x: (x / window.innerWidth) * 2 - 1,
    y: -(y / window.innerHeight) * 2 + 1
  };

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.5);
  raycaster.ray.intersectPlane(plane, APP_STATE.target);

  APP_STATE.hasPointer = true;

  if (gazeDot) {
    gazeDot.style.display = 'block';
    gazeDot.style.left = x + 'px';
    gazeDot.style.top = y + 'px';
  }
};

// Mouse events for desktop
window.addEventListener("mousemove", (e) => handleInput(e.clientX, e.clientY));

// Pointer events for all devices
window.addEventListener("pointermove", (e) => handleInput(e.clientX, e.clientY));

// Touch events for mobile
window.addEventListener("touchmove", (e) => {
  if (e.touches.length > 0) {
    e.preventDefault();
    handleInput(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: false });

// Handle pointer/mouse leave
window.addEventListener("pointerleave", () => {
  if (gazeDot) gazeDot.style.display = 'none';
});

window.addEventListener("mouseleave", () => {
  if (gazeDot) gazeDot.style.display = 'none';
});

// ═══════════════════════════════════════════════════════════════
// WINDOW RESIZE HANDLER
// ═══════════════════════════════════════════════════════════════

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ═══════════════════════════════════════════════════════════════
// MODEL LOADING & ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════

new GLTFLoader().load("./head_eyes_v1.glb", (gltf) => {
  const model = gltf.scene;
  model.position.y = -0.6;

  // Auto-scale model
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = 1.8 / size.y;
  model.scale.setScalar(scale);

  let eyeL, eyeR;

  model.traverse(o => {
    if (o.name === "Eye_L") eyeL = o;
    if (o.name === "Eye_R") eyeR = o;

    // Enhanced cornea material
    if (o.name.toLowerCase().includes("cornea")) {
      o.material = new THREE.MeshPhysicalMaterial({
        transmission: 1,
        roughness: 0,
        metalness: 0,
        ior: 1.45,
        thickness: 0.5,
        envMapIntensity: 1,
        clearcoat: 1,
        clearcoatRoughness: 0
      });
    }

    // Enhance other materials
    if (o.isMesh && o.material) {
      o.material.needsUpdate = true;
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });

  scene.add(model);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  APP_STATE.ready = true;

  // ═══════════════════════════════════════════════════════════════
  // MAIN ANIMATION LOOP
  // ═══════════════════════════════════════════════════════════════

  function animate() {
    requestAnimationFrame(animate);

    if (!APP_STATE.ready || !APP_STATE.hasPointer) return;

    // Smooth target following
    APP_STATE.smoothTarget.lerp(APP_STATE.target, 0.15);

    // Update penlight position
    penlight.position.set(
      APP_STATE.smoothTarget.x,
      APP_STATE.smoothTarget.y,
      APP_STATE.smoothTarget.z + 0.6
    );

    // Process each eye
    [
      { mesh: eyeL, isR: false, s: "left" },
      { mesh: eyeR, isR: true, s: "right" }
    ].forEach(eye => {
      const eyePos = new THREE.Vector3();
      eye.mesh.getWorldPosition(eyePos);

      const targetYaw = Math.atan2(
        APP_STATE.smoothTarget.x - eyePos.x,
        APP_STATE.smoothTarget.z - eyePos.z
      );

      const targetPitch = Math.atan2(
        APP_STATE.smoothTarget.y - eyePos.y,
        APP_STATE.smoothTarget.z - eyePos.z
      );

      const result = getRecruitment(eye.isR, targetYaw, targetPitch);

      // Apply rotation with smooth interpolation
      const targetRotation = new THREE.Euler(-result.rotation.x, result.rotation.y, 0, 'YXZ');
      eye.mesh.rotation.x += (targetRotation.x - eye.mesh.rotation.x) * 0.2;
      eye.mesh.rotation.y += (targetRotation.y - eye.mesh.rotation.y) * 0.2;

      // Update muscle activity bars
      MUSCLES.forEach(m => {
        const cache = uiCache[eye.s][m];
        const activation = result.activations[m];
        const displayValue = Math.min(100, Math.round((activation / 0.7) * 100));

        cache.bar.style.width = displayValue + "%";
        cache.pct.innerText = displayValue + "%";

        // Dynamic color based on activation level
        if (activation < 0.05) {
          cache.bar.style.background = "#ff4d6d";
        } else if (activation < 0.25) {
          cache.bar.style.background = "#ffb703";
        } else {
          cache.bar.style.background = "#4cc9f0";
        }
      });
    });

    // Render with post-processing
    composer.render();

    // Performance monitoring
    APP_STATE.performance.frameCount++;
    const currentTime = performance.now();
    if (currentTime >= APP_STATE.performance.lastTime + 1000) {
      APP_STATE.performance.fps = APP_STATE.performance.frameCount;
      APP_STATE.performance.frameCount = 0;
      APP_STATE.performance.lastTime = currentTime;
    }
  }

  animate();
}, undefined, (error) => {
  console.error('Error loading model:', error);
});
