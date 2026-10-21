// Neurolens page: a click-through story of resting position, saccades and fixation disparity
// Created by Dr Robert Burke
import { createHead } from './head3d.js';
import { NEAR_CONVERGENCE, RESTING, landingOffset, coveredOffset } from './fixation.js';
import { createNerves } from './nerves.js';

const $ = (id) => document.getElementById(id);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const DEG = Math.PI / 180;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
const EYES = ['R', 'L'];
const other = (e) => (e === 'R' ? 'L' : 'R');
const MAG = 8;            // drifting eyes and slow motion are magnified so they can be seen
const MAX_TURN = 18;      // degrees: the most an eye is shown turned away
const SLOW = 0.15;        // slow motion plays at this fraction of real time

// Embed mode: ?embed=1&parent=<page URL>. The host page sizes the iframe from our reported height.
const QS = new URLSearchParams(location.search);
const EMBED = QS.has('embed');
const PARENT = (() => {
  try { const u = new URL(QS.get('parent') || ''); return u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1' ? u : null; } catch { return null; }
})();
const toParent = (msg) => { if (EMBED && window.parent !== window) window.parent.postMessage(msg, PARENT ? PARENT.origin : '*'); };

// ═══════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════
const st = {
  step: 0,
  drift: 'exo',          // which way the eyes rest: 'exo' outward, 'eso' inward
  cover: null,           // eye behind the paddle
  firstEye: null,        // the eye the visitor covered first
  peek: false,           // X-ray window open
  slow: false,           // eye movements in slow motion
  speedChosen: false,    // the visitor picked a reading speed
  seq: null,             // running eye movements: { kind, i, ph, t, from, to, err, count, pause }
};
const drift = { R: 0, L: 0 }; // each eye's drift toward rest, degrees outward (true size)
let peekShown = 0;            // 0..1, how far the X-ray window has opened
let sleepT = 0;               // seconds into the sleep step: lids close, then the X-ray view appears
let wakeT = 0, fromSleep = false; // seconds into the waking step: the lids open, then the eyes straighten
let turnK = 0;                // 0..1: the head turning from facing us to its profile, for the steps inside the head
let sideBox = null;           // how the camera frames the profile (eases between steps)
let nerveMode = null;         // draw the nerve this way instead of as the step says (for rendering the still diagram)
let nerveT = 0, nerveShow = 0, nerveOn = false, frameDt = 0; // seconds into a step inside the head; the nerve drawing fading in
let selfShow = 0;             // 0..1: the face dimmed behind the red dot, for the visitor's own cover test
let pullT = 0, pull = 1;      // the target pulling back from the face toward the viewer (step 2): 0 near the face, 1 far
let convShown = 0;            // degrees each eye is shown turned in for a near target (eases between steps)
const NEAR_SHOWN = 2 * NEAR_CONVERGENCE; // turned in for the reading card: doubled, so it can be seen
const NEAR_EXO = 1.4;         // eyes that rest outward miss by more up close, where they turn in the furthest
const STICK_NEAR = 12;        // degrees each eye turns in for the target close to the face
const STICK_DROP = 0.42;      // once pulled back toward us, the ball sits this far below the eyes (× geo.u), out of our line of sight
const lids = { close: 0, xray: 0 };
const posture = () => RESTING[st.drift];
const way = () => (st.drift === 'exo' ? 'outward' : 'inward');

// ═══════════════════════════════════════════════════════════════
// The story
// ═══════════════════════════════════════════════════════════════
// scene: what the eyes do. still = looking straight ahead (at a fixation stick held out toward us);
// self = the visitor tries a cover test on themselves, looking at a red dot;
// sleep = lids close, then an X-ray view shows both eyes at rest; wake = lids open and the eyes straighten;
// saccades, mirror, reading = repeated jumps; nerve = the head in profile, with the trigeminal nerve drawn in
// (nerve: what it shows, see nerves.js).
// task: what the visitor is asked to do.
const STEPS = [
  { say: () => 'This is what your eyes might look like in the mirror. They look straight, right?', scene: 'still' },
  { say: () => 'When both eyes are in use, your brain keeps them straight. It is constantly working to keep the two streams of information, one from each eye, lined up on top of each other.', scene: 'still', rings: true, stick: true, labels: true },
  { say: () => "But when an eye isn't being used, for example when it's covered, the information from that eye stops. The brain gives that eye a break and lets it drift to its resting position.", scene: 'still', rings: true, stick: true, paddle: true },
  { say: () => 'Where that resting position is, and how well your brain and eye muscles cope with it, is the essence of binocular vision dysfunction (BVD).', scene: 'still', rings: true, stick: true, paddle: true },
  { say: () => 'Go ahead: grab the paddle in the corner and cover one of the eyes. Once it is covered, click the paddle to peek behind it and see where the eye went.', scene: 'still', rings: true, stick: true, paddle: true, task: 'peek' },
  { say: () => `See how it drifted ${way()}? This person is ${st.drift === 'exo' ? 'exophoric' : 'esophoric'}: their eyes rest slightly ${way()}.`, scene: 'still', rings: true, stick: true, paddle: true, need: 'peek' },
  { say: () => "Let's keep the paddle in X-ray mode to see what happens when we cover the other eye. Go ahead, move the paddle over the other eye.", scene: 'still', rings: true, stick: true, paddle: true, need: 'peek', task: 'other' },
  { say: () => `Now the eye that isn't being used has drifted ${way()}, and the other eye, which the brain is calling on again, has straightened out.`, scene: 'still', rings: true, stick: true, paddle: true, need: 'other' },
  { say: () => 'Now try it on yourself. Look at the red dot and keep looking at it. Cover one eye with your hand, then quickly move your hand across to cover the other eye. Go back and forth a few times.', scene: 'self' },
  { say: () => "Did the dot jump a little as you switched? If it did, you've just discovered that your eye's resting position, while it was behind your hand, wasn't exactly straight. When you uncovered it, your brain had to pull it back onto the dot. A small jump is common.", scene: 'self' },
  { say: () => "So when an eye isn't being used, it moves to its resting position. When you sleep and neither eye is being used, both go to their resting position.", scene: 'sleep' },
  { say: () => "But when both eyes are open and your brain is paying attention to both of them, they're straight again, lined up on the same target.", scene: 'wake', rings: true, stick: true },
  { say: () => "Here's what most people don't realize: when you make a fast eye movement, called a saccade, your brain briefly switches off the input from your eyes to avoid a smeared, jittery view, then switches it back on once you reach your target.", scene: 'saccades', slow: true, mag: 1, input: true, rings: true },
  { say: () => "Try it yourself: look at something across the room, then quickly look at something on the other side. Notice you don't see a streak of blur, like you would if you swung a video camera too fast?", scene: 'saccades', input: true, rings: true },
  { say: () => "To really drive this home, look at yourself in a mirror and glance from one of your eyes to the other, and back. Notice you can't see your eyes move?", scene: 'mirror', input: true },
  { say: () => "Now try it while filming yourself with your phone's front camera. You'll definitely see your eyes move. In the mirror you don't, because your brain switches off your eyes' input during saccades.", scene: 'mirror', input: true },
  { say: () => `And remember: an eye whose input is switched off heads for its resting position. So during every saccade both eyes start to drift ${way()}, and they land slightly out of line until the brain switches them back on and pulls them together.`, scene: 'saccades', slow: true, input: true, rings: true },
  { say: () => 'Reading is a long chain of saccades: word, to word, to word, with both eyes turned in to meet on the page. Here is someone reading at full speed, about 150 words a minute. Looks normal.', scene: 'reading', input: true, rings: true },
  { say: () => `Now the same reading, slowed down and magnified. After each jump the eyes land slightly out of line, and the brain has to pull them back together. That small miss is called fixation disparity${st.drift === 'exo' ? ". For eyes that rest outward it's usually bigger up close, where they have to turn in the furthest from where they'd rest" : ". For eyes that rest inward, focusing up close can pull them in further still"}.`, scene: 'reading', slow: true, input: true, rings: true },
  { say: () => "It happens with every word, thousands of times a day. And the eye muscles don't just move the eyes: they also report back to the brain. Let's look inside.", scene: 'reading', alternate: true, input: true, rings: true },
  { say: () => 'Your brain keeps track of where each eye is pointing, and tiny sensors in the eye muscles, called proprioceptors, help it: many times a second, they report how stretched each muscle is and how hard it is working.', scene: 'nerve', nerve: 'sense' },
  { say: () => 'Those answers travel to the brain along the trigeminal nerve, the main sensory nerve of the face.', scene: 'nerve', nerve: 'route' },
  { say: () => 'The same nerve carries feeling from the forehead, the cheeks and the jaw, controls the chewing muscles, and supplies the covering of the brain. In the brainstem, it also meets the nerves from the back of the head and neck.', scene: 'nerve', nerve: 'map' },
  { say: () => "Now picture reading. Every jump from word to word sends signals along that nerve; that's true for everyone. But when the eyes land out of line, each correction is extra muscle work, and it adds an extra burst on top. Over a long stretch of reading, the extra bursts pile up, and the nerve almost pulses with them.", scene: 'nerve', nerve: 'reading' },
  { say: () => "Here's something surprising. Each eye weighs only about 7.5 grams, about the same as one and a half plastic credit cards, and the muscles that move it are far stronger than they need to be to move something that light.", scene: 'nerve', nerve: 'weight' },
  { say: () => "They're also built differently from other muscles: their own special kind of myosin (the protein that makes muscle contract), packed with energy-producing mitochondria, and a rich blood supply. That makes them very hard to tire. So when your eyes feel tired, it probably isn't the muscles giving out.", scene: 'nerve', nerve: 'built' },
  { say: () => "So what does get overloaded? The information. Everyone's eye muscle sensors report with every eye movement; that's normal traffic. But eyes that rest out of line have to be held in line all day and pulled back into line after every jump. That extra work means extra reports, on top of the normal traffic, all funnelled into one nerve.", scene: 'nerve', nerve: 'stream' },
  { say: () => "And that nerve isn't a private line. The trigeminal nerve also carries feeling from the forehead, face and jaw and from the covering of the brain, and it meets the neck nerves in the brainstem. They all share the same bandwidth.", scene: 'nerve', nerve: 'shared' },
  { say: () => 'Think of your home internet. Video calls work fine, until someone starts a download that never stops; then everything on the connection starts to struggle. When the eyes rest out of line, the extra reports from holding and correcting them can be that download.', scene: 'nerve', nerve: 'analogy' },
  { say: () => 'When the trigeminal nerve has had too much, the brain is thought to start registering the overload as discomfort or pain, felt in the places this nerve looks after.', scene: 'nerve', nerve: 'overload' },
  { say: () => 'That can mean headaches, often across the forehead or temples, and eye strain: eyes that feel tired, sore or dry by the end of the day.', scene: 'nerve', nerve: 'symHead' },
  { say: () => 'It can mean jaw tension or clenching, through the chewing muscles this nerve controls.', scene: 'nerve', nerve: 'symJaw' },
  { say: () => 'And it can mean neck and shoulder pain, because the trigeminal nerve meets the neck nerves at the top of the spinal cord.', scene: 'nerve', nerve: 'symNeck' },
  { say: () => "That's the idea behind Neurolens: if the eyes need less holding and correcting, there's less extra traffic on the trigeminal nerve, and less to set off these symptoms. The normal traffic carries on as it should. Read on to see how it works.", scene: 'nerve', nerve: 'calm' },
];
const step = () => STEPS[st.step];

function taskDone(s = step()) {
  if (s.task === 'peek') return !!st.cover && st.peek;
  if (s.task === 'other') return !!st.cover && st.cover !== st.firstEye && st.peek;
  return true;
}

// Do the task for the visitor ("Show me")
let showTimer = 0;
function showMe() {
  const s = step();
  clearTimeout(showTimer);
  if (s.task === 'peek') {
    const wait = st.cover ? 0 : 900; // let the paddle arrive before the window opens
    if (!st.cover) paddleOver(st.firstEye || 'R');
    showTimer = setTimeout(() => { st.peek = true; refresh(); request(); }, wait);
  }
  if (s.task === 'other') { st.peek = true; paddleOver(other(st.firstEye || 'R')); }
  refresh();
}

function goStep(n) {
  const back = n < st.step;
  st.step = clamp(n, 0, STEPS.length - 1);
  const s = step();
  clearTimeout(showTimer);
  if (st.step === 1) pullT = 0; // the target starts close to the face and pulls back toward the viewer
  nerveT = 0;
  if (s.scene === 'wake') { // waking up: start with the lids shut and both eyes at rest
    fromSleep = STEPS[st.step - 1]?.scene === 'sleep' && back === false && lids.xray > 0.5;
    wakeT = 0;
    drift.R = drift.L = coveredOffset(posture());
  }
  // Put the paddle where this part of the story needs it
  if (st.step < 4 || (st.step === 4 && back)) { st.peek = false; st.firstEye = null; parkPaddle(); }
  if (s.need === 'peek' && !(st.cover && st.peek)) { st.peek = true; paddleOver(st.cover || st.firstEye || 'R'); }
  if (s.need === 'other' && !(st.cover && st.cover !== st.firstEye)) { st.peek = true; paddleOver(other(st.firstEye || 'R')); }
  // Eye movements for this step (shown after refresh, so the card is on screen before the eyes aim at its words)
  const moving = s.scene === 'saccades' || s.scene === 'mirror' || s.scene === 'reading';
  if (moving && (!st.speedChosen || s.scene !== 'reading')) st.slow = !!s.slow;
  refresh();
  if (!moving) st.seq = null;
  else if (st.seq?.kind !== s.scene) startSeq(s.scene);
  request();
}

function next() {
  if (!geo) return;
  if (!taskDone()) { showMe(); return; }
  if (st.step === STEPS.length - 1) { restart(); return; }
  goStep(st.step + 1);
}
function restart() {
  st.peek = false; st.firstEye = null; st.speedChosen = false;
  goStep(0);
}
$('next').addEventListener('click', next);
$('back').addEventListener('click', () => goStep(st.step - 1));
document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); goStep(st.step - 1); }
});
$('drift').addEventListener('click', () => {
  st.drift = st.drift === 'exo' ? 'eso' : 'exo';
  $('drift').textContent = st.drift === 'exo' ? 'Show eyes that drift inward' : 'Show eyes that drift outward';
  refresh();
  request();
});
$('speed').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-slow]'); if (!b) return;
  st.speedChosen = true;
  st.slow = b.dataset.slow === '1';
  refresh();
});

// Text and controls for the current step
function refresh() {
  const s = step();
  $('story-text').textContent = s.say();
  $('progress').textContent = `${st.step + 1} / ${STEPS.length}`;
  $('back').disabled = st.step === 0;
  const done = taskDone();
  $('next').textContent = !done ? 'Show me' : st.step === STEPS.length - 1 ? 'Start again' : 'Next ›';
  $('next').classList.toggle('ready', done && !!s.task);
  $('speed').hidden = s.scene !== 'reading';
  for (const b of $('speed').children) b.setAttribute('aria-pressed', String((b.dataset.slow === '1') === st.slow));
  paddle.hidden = !s.paddle;
  card.hidden = s.scene !== 'reading';
  $('input-chip').hidden = !s.input;
  storyLayout();
}

// ═══════════════════════════════════════════════════════════════
// 3D head and stage geometry
// ═══════════════════════════════════════════════════════════════
const stage = $('stage');
const nerves = createNerves($('nerves'), stage);
let head = null, geo = null;
try {
  head = createHead($('view'), stage, {
    onProgress: (e) => { if (e.lengthComputable) $('load-pct').textContent = `${Math.round((100 * e.loaded) / e.total)}%`; },
  });
  head.setView('story');
  head.ready.then(() => { $('loader').hidden = true; layout(); parkPaddle(false); goStep(0); })
    .catch(() => { $('loader').textContent = 'The 3D model could not be loaded. Please reload the page.'; });
} catch {
  $('loader').textContent = 'This browser could not start 3D graphics, so the demonstration is not available.';
}

// Eye centres on screen, their midpoint o, and u = half the distance between the eyes (pixels)
function layout() {
  if (!head?.loaded) return;
  head.setView('story');
  storyLayout();
  head.setTurn(0); // the stage geometry comes from the face-on view
  const R = head.project('R'), L = head.project('L');
  head.setTurn(ease(turnK));
  const u = (L.x - R.x) / 2;
  // The card spans most of a narrow stage; gaze angles scale with it so the eyes turn as far as on a wide one
  const W = stage.clientWidth, cardW = W < 600 ? 0.94 * W : Math.min(3.6 * u, 0.94 * W);
  geo = { R, L, o: { x: (R.x + L.x) / 2, y: (R.y + L.y) / 2 }, u, cardW, D: Math.max(3.2 * u, 0.9 * cardW) };
  placeCard();
  if (!dragging && paddleAt) { if (st.cover) paddleOver(st.cover, false); else parkPaddle(false); }
  lastAim = '';
  draw();
}
new ResizeObserver(() => { if (head?.loaded) { head.resize(); layout(); } }).observe(stage);

// In profile: the region to show (head units), fitted into the stage beside the story (wide stages) or below it.
// The eye steps close in on the eye socket.
const ROI = { full: { z: [-1.0, 0.72], y: [-0.85, 0.62] }, eye: { z: [-0.32, 0.56], y: [-0.3, 0.3] } };
function sideFrame(mode) {
  const W = stage.clientWidth, H = stage.clientHeight, story = $('story');
  const wide = stage.classList.contains('inside-wide');
  const left = wide ? story.offsetWidth : 0, top = wide ? 0 : story.offsetHeight;
  const r = ROI[['sense', 'weight', 'built'].includes(mode) ? 'eye' : 'full'];
  const s = 0.94 * Math.min((W - left) / (r.z[1] - r.z[0]), (H - top) / (r.y[1] - r.y[0])); // pixels per head unit
  // Centre the region in the space the story leaves (the face looks left, so screen right is toward the back of the head)
  return { w: W / s, h: H / s, z: (r.z[0] + r.z[1]) / 2 + left / 2 / s, y: (r.y[0] + r.y[1]) / 2 + top / 2 / s };
}
// Wide stages put the story in a column beside the head while inside it
function storyLayout() { stage.classList.toggle('inside-wide', step().scene === 'nerve' && stage.clientWidth >= 560); }

// Gaze (degrees, + = patient's right / up) ↔ stage pixels, in a stylised geometry that makes movements easy to see
const gazeToScreen = (H, V) => ({ x: geo.o.x - Math.tan(H * DEG) * geo.D, y: geo.o.y - Math.tan(V * DEG) * geo.D });
const screenToGaze = (x, y) => ({ H: -Math.atan2(x - geo.o.x, geo.D) / DEG, V: -Math.atan2(y - geo.o.y, geo.D) / DEG });
const AHEAD = { H: 0, V: 0 };

// ═══════════════════════════════════════════════════════════════
// The see-through reading card
// ═══════════════════════════════════════════════════════════════
const card = $('card');
const PASSAGE = 'Every time your eyes jump to the next word, they need to land together. If they land slightly out of line, the brain pulls them back. This happens with every word you read.';
const words = PASSAGE.split(' ').map((w) => { const s = document.createElement('span'); s.textContent = w; return s; });
words.forEach((s, i) => $('card-text').append(s, i < words.length - 1 ? ' ' : ''));

function placeCard() {
  const w = geo.cardW;
  Object.assign(card.style, {
    width: `${w}px`, left: `${geo.o.x - w / 2}px`, top: `${geo.o.y + 0.62 * geo.u}px`,
    padding: `${0.1 * geo.u}px ${0.16 * geo.u}px`, fontSize: `${clamp(0.17 * geo.u, 11.5, 22)}px`,
  });
}

function wordGaze(i) {
  const r = words[i].getBoundingClientRect(), s = stage.getBoundingClientRect();
  return screenToGaze(r.left + r.width / 2 - s.left, r.top + r.height / 2 - s.top);
}

// ═══════════════════════════════════════════════════════════════
// Repeated eye movements: across the room, between your eyes in a mirror, and reading
// ═══════════════════════════════════════════════════════════════
// Real seconds at full speed; reading at 0.4 s a word is 150 words a minute
const PHASES = ['saccade', 'land', 'correct', 'fixate'];
const DUR = { saccade: 0.035, land: 0.05, correct: 0.1 };
const FIXATE = { saccades: 0.6, mirror: 0.9, reading: 0.215 };
const REACH = { saccades: 30, mirror: 3 }; // degrees either side: across the room, or between your eyes in a mirror

function startSeq(kind) {
  st.seq = { kind, i: 0, ph: 0, t: 0, from: AHEAD, count: 0, pause: 0 };
  aimNext(st.seq);
}
function targetOf(q, i) { return q.kind === 'reading' ? wordGaze(i % words.length) : { H: (i % 2 ? -1 : 1) * REACH[q.kind], V: 0 }; }
function aimNext(q) {
  q.ph = 0; q.t = 0;
  q.to = targetOf(q, q.i);
  q.err = landingOffset(posture(), 0.5 * (0.85 + 0.3 * Math.random())) * (q.kind === 'reading' && st.drift === 'exo' ? NEAR_EXO : 1); // each eye, degrees outward
  for (const w of words) w.classList.remove('cur');
}
const phaseDur = (q) => (PHASES[q.ph] === 'fixate' ? FIXATE[q.kind] : DUR[PHASES[q.ph]]);

function stepSeq(dt) {
  const q = st.seq;
  if (q.pause > 0) { // end of the paragraph: read it again, switching speed if the story says so
    q.pause -= dt;
    if (q.pause <= 0) { if (step().alternate && !st.speedChosen) { st.slow = !st.slow; refresh(); } q.i = 0; q.count = 0; q.from = q.to; aimNext(q); }
    return;
  }
  q.t += dt * (st.slow ? SLOW : 1);
  while (q.t >= phaseDur(q)) {
    q.t -= phaseDur(q);
    q.ph++;
    if (q.ph === 1) { q.count++; if (q.kind === 'reading') words[q.i].classList.add('cur'); }
    if (q.ph === PHASES.length) {
      q.from = q.to;
      q.i++;
      if (q.kind === 'reading' && q.i >= words.length) { q.i = words.length - 1; q.ph = PHASES.length - 1; q.pause = st.slow ? 4.5 : 3; return; }
      aimNext(q);
    }
  }
}

// How far each eye has slipped toward rest during the current jump (degrees outward, true size)
function landingError() {
  const q = st.seq;
  if (!q || q.pause > 0) return 0;
  const id = PHASES[q.ph], p = q.t / phaseDur(q);
  if (id === 'saccade') return q.err * ease(p);
  if (id === 'land') return q.err;
  if (id === 'correct') return q.err * (1 - ease(p));
  return 0;
}
const inputOff = () => !!st.seq && st.seq.pause <= 0 && PHASES[st.seq.ph] === 'saccade';

function gazeNow() {
  const q = st.seq;
  if (!q) return AHEAD;
  if (q.pause > 0 || PHASES[q.ph] !== 'saccade') return q.to;
  const p = ease(q.t / DUR.saccade);
  return { H: q.from.H + (q.to.H - q.from.H) * p, V: q.from.V + (q.to.V - q.from.V) * p };
}

// ═══════════════════════════════════════════════════════════════
// The cover paddle: solid, with an X-ray window to peek behind it
// ═══════════════════════════════════════════════════════════════
const paddle = $('paddle');
let dragging = null, paddleAt = null; // paddleAt: centre of the paddle's head, stage pixels

const paddleWidth = () => Math.min(1.25 * geo.u, 0.3 * stage.clientWidth);
function setPaddle(x, y, animate) {
  const w = paddleWidth(), h = w * 2;
  paddleAt = { x, y };
  paddle.classList.toggle('dragging', !animate);
  Object.assign(paddle.style, { width: `${w}px`, height: `${h}px`, left: `${x - w / 2}px`, top: `${y - 0.22 * h}px` });
  request();
}
// Parked in the bottom-left corner (the credit is bottom-right)
function parkPaddle(animate = true) { if (geo) { const w = paddleWidth(); setPaddle(0.62 * w, stage.clientHeight - 0.62 * w, animate); } }
function paddleOver(eye, animate = true) { if (!geo) return; if (eye) setPaddle(geo[eye].x, geo[eye].y, animate); else parkPaddle(animate); }

// Which eye the paddle covers, from where it is drawn now (it glides between positions)
function paddleHead() {
  const r = paddle.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return { x: r.left + r.width / 2 - s.left, y: r.top + 0.22 * r.height - s.top, w: r.width };
}
function coveredEye() {
  if (!geo || paddle.hidden) return null;
  const p = paddleHead();
  for (const e of EYES) if (Math.hypot(p.x - geo[e].x, p.y - geo[e].y) < 0.55 * geo.u) return e;
  return null;
}

// Drag to move it; a click without dragging opens or closes the X-ray window
paddle.addEventListener('pointerdown', (e) => {
  if (!geo || !e.isPrimary) return;
  paddle.setPointerCapture(e.pointerId);
  dragging = { x: e.clientX, y: e.clientY, from: { ...paddleAt }, moved: false };
});
paddle.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
  if (!dragging.moved && Math.hypot(dx, dy) < 5) return;
  dragging.moved = true;
  setPaddle(dragging.from.x + dx, dragging.from.y + dy, false);
});
paddle.addEventListener('pointerup', () => {
  if (dragging && !dragging.moved) togglePeek();
  dragging = null;
  paddle.classList.remove('dragging');
});
paddle.addEventListener('pointercancel', () => { dragging = null; paddle.classList.remove('dragging'); });
paddle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePeek(); return; }
  const move = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[e.key];
  if (move) { e.preventDefault(); e.stopPropagation(); setPaddle(paddleAt.x + move[0], paddleAt.y + move[1], false); }
});
function togglePeek() { st.peek = !st.peek; refresh(); request(); }

// ═══════════════════════════════════════════════════════════════
// Frame loop (runs only while something moves and the stage is on screen)
// ═══════════════════════════════════════════════════════════════
let rafId = 0, last = 0, lastAim = '', inView = true;
function request() { if (!rafId) rafId = requestAnimationFrame(tick); }
new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) request(); }, { threshold: 0.1 }).observe(stage);

function tick(now) {
  rafId = 0;
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
  last = now;
  if (!geo) return;
  let active = !!st.seq || !!dragging || isGliding();
  if (st.seq) stepSeq(dt);

  // Behind the paddle an eye drifts to rest; uncovered, it is pulled back into line.
  // Asleep, neither eye is in use, so both drift and share the misalignment.
  const covered = coveredEye();
  if (covered !== st.cover) {
    st.cover = covered;
    if (covered && step().task === 'peek' && !st.firstEye) st.firstEye = covered;
    refresh();
  }
  // Step 2: the target starts close to the face (eyes converged), then pulls back toward the viewer
  // and grows as it nears us, while the eyes relax to straight ahead
  pullT = st.step === 1 ? pullT + dt : 0;
  pull = st.step === 1 ? ease(clamp((pullT - 0.9) / 2.4, 0, 1)) : 1;
  if (st.step === 1 && pullT < 3.4) active = true;

  // Near targets: the eyes turn in (the stick close to the face, the reading card), easing between steps
  const s = step(), convGoal = s.scene === 'reading' ? NEAR_SHOWN : s.stick ? STICK_NEAR * (1 - pull) : 0;
  if (Math.abs(convGoal - convShown) > 0.01) { convShown += (convGoal - convShown) * (1 - Math.exp(-dt / 0.15)); active = true; } else convShown = convGoal;

  // Asleep: the lids close, then turn see-through (X-ray) to show both eyes turned to rest.
  // Waking: the X-ray view fades, the lids open, then the brain pulls both eyes straight.
  const sleeping = step().scene === 'sleep', waking = step().scene === 'wake';
  sleepT = sleeping ? sleepT + dt : 0;
  wakeT = waking ? wakeT + dt : 0;
  let close = 0, xray = 0;
  if (sleeping) { close = ease(clamp((sleepT - 0.3) / 0.8, 0, 1)); xray = ease(clamp((sleepT - 1.6) / 0.6, 0, 1)); }
  if (waking) { close = 1 - ease(clamp((wakeT - 0.5) / 0.6, 0, 1)); xray = fromSleep ? 1 - ease(clamp(wakeT / 0.5, 0, 1)) : 0; }
  if (close !== lids.close || xray !== lids.xray) { lids.close = close; lids.xray = xray; head.setLids(lids); lastAim = ''; }
  if ((sleeping && sleepT < 2.4) || (waking && wakeT < 2.6)) active = true;

  // Inside the head: swing round to the profile (framed beside or below the story), then draw the nerve in
  const side = step().scene === 'nerve';
  let moved = false;
  if (side) {
    const goal = sideFrame(step().nerve);
    if (!sideBox || turnK === 0) sideBox = goal;
    for (const c of ['w', 'h', 'y', 'z']) {
      const d = goal[c] - sideBox[c];
      if (Math.abs(d) > 1e-4) { sideBox[c] += d * (1 - Math.exp(-dt / 0.4)); moved = true; } else sideBox[c] = goal[c];
    }
  }
  if (turnK !== (side ? 1 : 0)) { turnK = side ? Math.min(1, turnK + dt / 1.3) : Math.max(0, turnK - dt / 1); moved = true; }
  if (moved) { head.setTurn(ease(turnK), sideBox); lastAim = ''; active = true; }
  nerveT = side ? nerveT + dt : 0;
  nerveShow = side && turnK === 1 ? Math.min(1, nerveShow + dt / 0.45) : 0;
  if (side) active = true; // the signals keep moving
  const selfGoal = step().scene === 'self' ? 1 : 0;
  if (selfShow !== selfGoal) { selfShow = Math.abs(selfGoal - selfShow) < 0.01 ? selfGoal : selfShow + (selfGoal - selfShow) * (1 - Math.exp(-dt / 0.25)); active = true; }
  frameDt = dt;
  for (const e of EYES) {
    const goal = st.cover === e || (sleeping && sleepT > 0.5) || (waking && wakeT < 1.5) ? coveredOffset(posture()) : 0;
    drift[e] += (goal - drift[e]) * (1 - Math.exp(-dt / (goal ? 0.6 : 0.3)));
    if (Math.abs(goal - drift[e]) > 1e-3) active = true;
  }
  const peekGoal = st.peek && !paddle.hidden ? 1 : 0;
  peekShown += (peekGoal - peekShown) * (1 - Math.exp(-dt / 0.15));
  if (Math.abs(peekGoal - peekShown) > 0.005) active = true; else peekShown = peekGoal;

  draw();
  if (active && inView) request(); else last = 0;
}

function isGliding() {
  if (!paddleAt || paddle.hidden) return false;
  const p = paddleHead();
  return Math.abs(p.x - paddleAt.x) > 0.5 || Math.abs(p.y - paddleAt.y) > 0.5;
}

function draw() {
  if (!geo) return;
  const s = step();
  const g = gazeNow();
  const reading = s.scene === 'reading';
  // Covered and sleeping eyes are magnified; jumps are magnified only in slow motion
  const magJump = s.mag ?? (st.slow ? MAG : 1);
  const land = landingError();
  const turn = (e) => clamp(drift[e] * MAG + land * magJump, -MAX_TURN, MAX_TURN);
  const conv = convShown;
  // As the ball comes toward us it drops a little below our sightline, and the eyes follow it slightly down
  const V = s.stick ? g.V - Math.atan((STICK_DROP * geo.u * pull) / geo.D) / DEG : g.V;
  const aimR = g.H - conv + turn('R'), aimL = -g.H - conv + turn('L');
  head.aim('R', aimR, V);
  head.aim('L', aimL, V);
  const box = sideBox ? `${sideBox.w.toFixed(4)},${sideBox.h.toFixed(4)},${sideBox.y.toFixed(4)},${sideBox.z.toFixed(4)}` : '';
  const key = `${aimR.toFixed(3)}|${aimL.toFixed(3)}|${V.toFixed(3)}|${lids.close.toFixed(3)}|${lids.xray.toFixed(3)}|${turnK.toFixed(4)}|${box}`;
  if (key !== lastAim) { head.render(); lastAim = key; }

  // The target, and where each eye is aiming relative to it
  const p = gazeToScreen(g.H, V);
  const tgt = $('target'), tgtB = $('target-b');
  const discR = geo.u * (0.13 + 0.07 * pull); // a little larger as it nears us
  $('fixstick').toggleAttribute('hidden', !s.stick); // an SVG element has no .hidden property
  if (s.stick) drawStick(p, discR);
  const tag = $('stick-tag');
  tag.hidden = !s.labels;
  if (s.labels) {
    tag.textContent = pull < 1 ? 'The target pulls back, away from the face and toward you' : 'Far from the face now, so the eyes look straight ahead';
    Object.assign(tag.style, { left: `${p.x}px`, top: `${geo.o.y - 0.13 * geo.u - 12}px`, transform: 'translate(-50%, -100%)' }); // stays above the eyes
  }
  tgt.hidden = !s.rings || reading || !!s.stick;
  Object.assign(tgt.style, { left: `${p.x}px`, top: `${p.y}px` });
  tgtB.hidden = !st.seq || reading || !s.rings;
  if (!tgtB.hidden) { const b = gazeToScreen(targetOf(st.seq, st.seq.i + 1).H, 0); Object.assign(tgtB.style, { left: `${b.x}px`, top: `${b.y}px` }); }
  const off = inputOff();
  for (const e of EYES) {
    const ring = $(`ring-${e}`), label = $(`label-${e}`);
    ring.hidden = !s.rings;
    const dx = Math.tan(turn(e) * DEG) * geo.D * (e === 'R' ? -1 : 1); // outward = toward that eye's own side
    Object.assign(ring.style, { left: `${p.x + dx}px`, top: `${p.y}px`, opacity: (off ? 0.25 : 1) * (1 - lids.close) });
    label.hidden = !s.labels;
    Object.assign(label.style, { left: `${p.x}px`, top: `${p.y + discR + 6}px` }); // either side of the stick, below the ball
  }
  const xr = $('xray');
  xr.hidden = lids.xray < 0.02;
  Object.assign(xr.style, { top: `${geo.o.y - 0.42 * geo.u}px`, height: `${0.84 * geo.u}px`, opacity: lids.xray });
  // Inside the head: the trigeminal nerve over the profile, with the head dimmed behind it
  const veil = $('veil'), veiled = Math.max(nerveShow, 0.85 * selfShow);
  veil.hidden = veiled < 0.01;
  veil.style.opacity = veiled.toFixed(3);
  veil.classList.toggle('deep', selfShow > nerveShow); // for the red dot, dim the face right down
  // The visitor's own cover test: a red dot to look at, in the space below the story
  const dot = $('selfdot');
  dot.hidden = selfShow < 0.01;
  if (!dot.hidden) Object.assign(dot.style, { opacity: selfShow.toFixed(3), left: `${stage.clientWidth / 2}px`, top: `${(stage.clientHeight + $('story').offsetHeight) / 2}px` });
  if (nerveShow > 0) {
    const XP = 0.17; // the drawing lies in the plane of the near eye
    const project = ([z, y]) => head.projectXYZ(XP, y, z);
    const a = project([0, 0]), b = project([0, 0.1]);
    nerves.draw({ project, k: Math.hypot(b.x - a.x, b.y - a.y) / 0.1, mode: nerveMode || s.nerve, t: nerveT, dt: frameDt, show: nerveShow });
    nerveOn = true;
  } else if (nerveOn) { nerves.hide(); nerveOn = false; }
  frameDt = 0;
  const chip = $('input-chip');
  chip.classList.toggle('off', off);
  chip.lastChild.textContent = off ? 'Input switched off during the jump' : 'Both eyes switched on';

  // The paddle's X-ray window, and what the callout invites
  const r = (33 * peekShown).toFixed(2); // the window's rim stays clear of the X-RAY label above it
  for (const id of ['peek-cut', 'peek-glass', 'peek-rim']) $(id).setAttribute('r', r);
  paddle.classList.toggle('peeking', peekShown > 0.5);
  const call = $('callout');
  const text = paddle.hidden ? '' : st.cover && !st.peek ? 'Click to peek behind the paddle' : !st.cover && s.task ? 'Drag me over an eye' : '';
  call.hidden = !text;
  if (text) {
    call.textContent = text;
    const h = paddleHead();
    Object.assign(call.style, { left: `${clamp(h.x, 110, stage.clientWidth - 110)}px`, top: `${h.y - 0.5 * h.w}px` });
  }
}

// The fixation target: a white ball on a vertical stick, held up from below the frame
function drawStick(p, r) {
  const w = 0.24 * r;
  const rod = $('stick-rod'), ball = $('stick-ball'), shadow = $('stick-shadow');
  // Close to the face the ball casts a soft shadow on it; the shadow fades as the ball pulls away
  shadow.setAttribute('cx', p.x + 0.12 * geo.u); shadow.setAttribute('cy', p.y + 0.3 * geo.u);
  shadow.setAttribute('rx', 1.3 * r); shadow.setAttribute('ry', 0.8 * r);
  shadow.setAttribute('opacity', (1 - pull).toFixed(3));
  rod.setAttribute('x', p.x - w / 2); rod.setAttribute('y', p.y);
  rod.setAttribute('width', w); rod.setAttribute('height', Math.max(0, stage.clientHeight + 20 - p.y));
  ball.setAttribute('cx', p.x); ball.setAttribute('cy', p.y); ball.setAttribute('r', r);
}

// Booking and phone links: let the host page record the conversion
for (const a of document.querySelectorAll('[data-conversion]')) a.addEventListener('click', () => toParent({ type: 'cvc-conversion', href: a.href }));

// In an embed, report our height so the host page sizes the iframe and does all the scrolling
if (EMBED) {
  document.documentElement.style.overflow = 'hidden';
  let lastH = 0;
  const report = () => {
    const h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (Math.abs(h - lastH) > 1) { lastH = h; toParent({ type: 'gaze-height', height: h }); }
  };
  new ResizeObserver(report).observe(document.body);
  report();
}

refresh();

// Small hook for automated checks
window.__nl = { st, drift, goStep, next, paddleOver, get geo() { return geo; }, get peek() { return peekShown; }, set nerveMode(m) { nerveMode = m; request(); }, goNerve: (m) => goStep(STEPS.findIndex((s) => s.nerve === m)) };
