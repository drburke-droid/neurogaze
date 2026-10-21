// The BVD video: shot list with narration, on-screen captions and what the story does in each shot.
// Read by the recording page (video.js), by tools/record-video.mjs (timing, captions and chapters) and,
// through tools/video-plan.mjs, by the voiceover and music tools.
// Created by Dr Robert Burke
//
// Each shot:  ch       chapter title (on the first shot of a chapter)
//             mood     the music from this shot on: 'hook' | 'explain' | 'tense' | 'resolve'
//             step     story card to show (its id in neurolens.js), if it changes
//             view     how the face is framed from this shot on: 'story' (the default) or 'eyes' (closer)
//             cut      true: jump straight to how the step looks, without the head turning
//             nerve    draw the nerve this way for the shot (a mode in nerves.js), in place of the step's own
//             reveal   with nerve 'pain': when each spot appears, { gEye, gHead, gJaw, gNeck: time }
//             vo       narration: spoken in the voice version, shown in full in the text version
//             cap      short caption, shown in the voice version
//             min      shortest the shot can be (seconds), so its animation can finish
//             overlay  'chart' | 'title' | 'end': a picture laid over the story for this shot
//             overlayAt  when the overlay comes in (a time, as below), if not at the start
//             at       timed actions within the shot: [time, action, value]
//                      actions: cover (eye, or null to park the paddle), peek (true/false), slow (true/false)
// A time is seconds into the shot, or a word in the narration, '@word' or '@word+0.5', for the moment it is said.

export const SPEAK_WPS = 2.6;  // words a second, to estimate the voice before it is made (tools/voiceover.py measures it)
export const READ_WPS = 2.7;   // words a second for reading the text version on screen (about 160 a minute) while watching
export const LEAD = 0.4;       // seconds into a shot before the voice starts
export const TAIL = 0.7;       // seconds after the voice ends before the next shot

export const SHOTS = [
  // ── Hook: the symptoms, then the eye behind the paddle ─────────────────────
  { ch: 'Sore eyes, headaches, a stiff neck?', mood: 'hook', step: 'route', nerve: 'pain', cut: true, min: 6.5,
    reveal: { gEye: '@Sore', gHead: '@Headaches', gJaw: '@A tight', gNeck: '@A stiff' },
    vo: 'Sore… strained… tired eyes by the end of the day. Headaches. A tight jaw. A stiff neck.',
    cap: 'Sore, strained, tired eyes by the end of the day?' },
  { step: 'mirror', overlay: 'chart', min: 4.5,
    vo: 'Yet you see 20/20, and your eyes are healthy.',
    cap: '20/20 vision. Healthy eyes.' },
  { step: 'peek', view: 'eyes', min: 5.5, at: [[0.3, 'cover', 'R'], ['@behind+0.2', 'peek', true]],
    vo: 'Cover one eye, and look behind the paddle. It has drifted out of line.',
    cap: 'Look behind the paddle.' },
  { overlay: 'title', overlayAt: '@binocular', min: 6,
    vo: "When eyes rest out of line like this and it causes symptoms, it's often called binocular vision dysfunction, or BVD. Here's how it works, and a ten-second test you can try yourself.",
    cap: 'When eyes rest out of line…' },

  // ── How your eyes stay straight ──────────────────────────────────────────
  { ch: 'How your eyes stay straight', mood: 'explain', step: 'mirror', view: 'story', min: 3.5,
    vo: 'In the mirror, your eyes look straight ahead.',
    cap: 'They look straight ahead.' },
  { step: 'pull', min: 7,
    vo: 'When both eyes are in use, your brain keeps them lined up, so the picture from each eye lands right on top of the other… As this target pulls back toward you, both eyes straighten to follow it.',
    cap: 'Your brain keeps them lined up.' },
  { step: 'rest', min: 4,
    vo: "But when an eye isn't being used, for example when it's covered, the brain lets it relax to its resting position.",
    cap: 'Not in use? It relaxes to its resting position.' },
  { step: 'bvd', min: 4,
    vo: 'Where that resting position is, and how well you cope with it, is what BVD is about.',
    cap: 'Where it rests is what BVD is about.' },

  // ── The cover test: an ordinary paddle first, then see-through ───────────
  { ch: 'The cover test', step: 'peek', view: 'eyes', min: 10,
    at: [[0.4, 'cover', 'R'], [2.3, 'cover', 'L'], [4.2, 'cover', 'R'], [6.1, 'cover', 'L'], [8.0, 'cover', 'R']],
    vo: 'This is called the cover test. The paddle moves from eye to eye. Watch each eye just as the paddle leaves it: it makes a small movement back into line.',
    cap: 'Watch each eye as the paddle leaves it.' },
  { min: 5.5, at: [['@see-through', 'peek', true]],
    vo: "So where was the eye? Let's make the paddle see-through and look behind it. The covered eye has drifted outward, to its resting position.",
    cap: 'Behind the paddle, it drifts outward.' },
  { min: 7, at: [['@other', 'cover', 'L']],
    vo: 'Now move it to the other eye. The newly covered eye drifts out, and the uncovered eye straightens. These eyes rest slightly outward, which is called exophoria.',
    cap: 'Cover the other eye: they swap.' },
  { step: 'sleep', min: 6.5,
    vo: 'When you sleep, neither eye is in use. The eyelids close, and behind them, both eyes drift to rest.',
    cap: 'Asleep, both eyes drift to rest.' },
  { step: 'wake', min: 4.5,
    vo: 'Open both eyes, and the brain pulls them straight again.',
    cap: 'Awake, the brain pulls them straight.' },

  // ── Try it yourself ──────────────────────────────────────────────────────
  { ch: 'Try it yourself', step: 'self', view: 'story', min: 9,
    vo: 'Now try it yourself. Look at the red dot. Cover one eye with your hand, then quickly move your hand across to the other eye… Go back and forth a few times. Pause the video if you need to.',
    cap: 'Look at the red dot. Cover one eye, then the other.' },
  { step: 'selfJump', min: 5,
    vo: "Did the dot jump? If it did, your eye wasn't quite straight while it was behind your hand, and your brain had to pull it back onto the dot. A small jump is common.",
    cap: 'Did the dot jump?' },

  // ── The switch-off you never notice ──────────────────────────────────────
  { ch: 'The switch-off you never notice', step: 'saccade', min: 6,
    vo: "What most people don't realize is that every time your eyes jump, which is called a saccade, your brain switches off their input for a split second, so you don't see a blur.",
    cap: 'During every jump, the brain switches off the input.' },
  { step: 'mirrorEyes', min: 4.5,
    vo: "Try it in a mirror… glance from one of your eyes to the other. You can't see them move.",
    cap: "In a mirror, you can't see your eyes move…" },
  { step: 'camera', min: 3.5,
    vo: "However, on your phone's front camera, you can see the movement.",
    cap: '…on a phone camera, you can.' },
  { step: 'landing', min: 6,
    vo: "And remember, while the eye's input is turned off, each eye heads for its resting position. So after every jump, the eyes land slightly out of line, and the brain pulls them back together.",
    cap: 'After every jump, the eyes land slightly out of line.' },

  // ── Reading ──────────────────────────────────────────────────────────────
  { ch: 'Reading', step: 'read', min: 6, at: [[0, 'slow', false]],
    vo: 'Reading is jump after jump, with both eyes slightly turned in to see the closely held page. This is a typical reading speed, about 250 words a minute. It looks normal.',
    cap: 'Reading at 250 words a minute looks normal…' },
  { step: 'readSlow', min: 9, at: [[0, 'slow', true]],
    vo: "Slow it down and magnify it, and you can see the miss after every word. That's called fixation disparity. For eyes that tend to rest outward, this disparity is usually larger when looking at things up close.",
    cap: '…slowed down, you can see the miss: fixation disparity.' },
  { step: 'report', min: 4.5, at: [[0, 'slow', false]],
    vo: "It happens with every word, thousands of times a day. And your eye muscles don't just move your eyes, they also report position updates back to the brain.",
    cap: 'Thousands of times a day.' },

  // ── Inside your head ─────────────────────────────────────────────────────
  { ch: 'Inside your head', step: 'sense', min: 6,
    vo: "Tiny sensors in the eye muscles, called proprioceptors, tell your brain how stretched each muscle is and how hard it's working, many times a second.",
    cap: 'Eye muscle sensors report back, many times a second.' },
  { step: 'route', min: 4.5,
    vo: 'Those reports travel along the trigeminal nerve.',
    cap: 'They travel along the trigeminal nerve.' },
  { step: 'map', min: 7,
    vo: 'The same nerve carries feeling from your forehead, face and jaw, works your chewing muscles, supplies the covering of your brain, and meets the nerves from the back of your head and neck.',
    cap: 'The same nerve serves your face, jaw, brain covering and neck.' },
  { step: 'pulse', min: 10,
    vo: "Every jump sends signals; that's normal and happens for everyone. When the eyes land out of line, each correction adds an extra burst. An hour of reading is about 15,000 jumps, and therefore 15,000 extra bursts.",
    cap: 'An hour of reading: about 15,000 extra bursts.' },

  // ── It's not tired muscles ───────────────────────────────────────────────
  { ch: "It's not tired muscles", step: 'weight', min: 5.5,
    vo: 'Your eye weighs about 7.5 grams, about one and a half credit cards, and the muscles that move it are far stronger than they need to be.',
    cap: 'Each eye: about 7.5 grams.' },
  { step: 'built', min: 5.5,
    vo: "They're built not to tire, with their own kind of myosin, packed with mitochondria, and a rich blood supply… So it probably isn't the muscles giving out when your eyes feel tired.",
    cap: 'Built not to tire.' },

  // ── A bandwidth problem ──────────────────────────────────────────────────
  { ch: 'A bandwidth problem', step: 'stream', min: 6.5,
    vo: "What does get overloaded is the information… Everyone's eye sensors send normal traffic. Eyes that rest out of line add extra, from being held in line all day and corrected after every jump.",
    cap: 'Normal traffic, plus extra.' },
  { step: 'shared', min: 6,
    vo: 'And it all runs through one shared nerve.',
    cap: 'One shared nerve.' },
  { step: 'analogy', min: 5.5,
    vo: 'Think of your home internet. Video calls work fine, until someone starts a download that never stops.',
    cap: 'A download that never stops.' },

  // ── When the nerve has had too much ──────────────────────────────────────
  { ch: 'When the nerve has had too much', mood: 'tense', step: 'overload', min: 6,
    vo: 'When the trigeminal nerve has had too much, the brain is thought to start registering it as discomfort, or pain.',
    cap: 'Too much traffic…' },
  { step: 'symHead', min: 5,
    vo: 'Headaches, often across the forehead or temples. Sore, tired or dry-feeling eyes.',
    cap: 'Headaches. Eye strain.' },
  { step: 'symJaw', min: 4,
    vo: 'Jaw tension, or clenching.',
    cap: 'Jaw tension.' },
  { step: 'symNeck', min: 4,
    vo: 'Neck and shoulder pain.',
    cap: 'Neck and shoulder pain.' },

  // ── What helps ───────────────────────────────────────────────────────────
  { ch: 'What helps', mood: 'resolve', step: 'calm', min: 9,
    vo: "Treating BVD aims to help the eyes line up with less holding and correcting, for example with prism glasses. That means less extra traffic, and less to set off these symptoms. The normal signals keep flowing all day, as they should.",
    cap: 'Less correcting, less extra traffic.' },
  { overlay: 'end', min: 12,
    vo: 'If this sounds like you, have your eye alignment measured, far and near. You can find out more at calgaryvisioncentre.com/bvd.',
    cap: '' },
];

// How the voice says what the screen shows
export const SAY = [
  ['calgaryvisioncentre.com/bvd', 'Calgary Vision Centre dot com, slash B V D'],
  ['20/20', 'twenty twenty'],
  ['15,000', 'fifteen thousand'],
  ['7.5', 'seven and a half'],
  ['250', 'two hundred and fifty'],
];
export const speakable = (text) => SAY.reduce((t, [a, b]) => t.split(a).join(b), text);

// The narration split into sentences, each with where it starts and ends in the text
export function sentences(text) {
  const out = [], re = /\S.*?(?:[.?!…]+["”']?(?=\s|$)|$)/g; // ends at . ? ! or … before a space (so not in "7.5" or ".com")
  let m;
  while ((m = re.exec(text))) out.push({ text: m[0], from: m.index, to: m.index + m[0].length });
  return out;
}
const words = (t) => t.trim().split(/\s+/).length;

// When each sentence is said or read, in seconds into the shot.
// voice: what tools/voiceover.py measured for this shot ({ secs, sentences: [{ start, end }] }), if made.
function speech(shot, mode, voice) {
  const parts = sentences(shot.vo);
  if (mode === 'voice' && voice) return { secs: voice.secs, parts: parts.map((p, i) => ({ ...p, start: LEAD + voice.sentences[i].start, end: LEAD + voice.sentences[i].end })) };
  const rate = mode === 'text' ? READ_WPS : SPEAK_WPS, gap = mode === 'text' ? 0 : 0.3;
  let t = LEAD;
  const timed = parts.map((p) => { const d = words(p.text) / rate, q = { ...p, start: t, end: t + d }; t += d + gap; return q; });
  return { secs: t - gap - LEAD, parts: timed };
}

// The time of '@word' or '@word+0.5' in a shot: proportional through the sentence that says it
function wordTime(spec, parts, text) {
  const [, word, off] = /^@([^+]+)(?:\+([\d.]+))?$/.exec(spec);
  const at = text.toLowerCase().indexOf(word.toLowerCase());
  if (at < 0) throw new Error(`"${word}" isn't in the narration: ${text}`);
  const p = parts.find((q) => at >= q.from && at < q.to);
  return p.start + ((at - p.from) / (p.to - p.from)) * (p.end - p.start) + Number(off || 0);
}
const when = (t, parts, text) => (typeof t === 'number' ? t : wordTime(t, parts, text));

// How long each shot lasts, when each starts, and every timed action resolved to seconds.
// mode 'voice': the narration is spoken (voice: tools/voiceover.py's measurements, indexed by shot);
// mode 'text': it is shown on screen to read, with music only.
export function timeline({ mode = 'voice', voice = null } = {}) {
  let t = 0;
  const shots = SHOTS.map((s, i) => {
    const { secs: said, parts } = speech(s, mode, voice?.[i]);
    const secs = Math.max(s.min || 0, LEAD + said + (mode === 'text' ? 1.2 : TAIL));
    const shot = {
      ...s, i, start: t, secs, parts,
      at: (s.at || []).map(([w, action, value]) => [when(w, parts, s.vo), action, value]),
      reveal: s.reveal && Object.fromEntries(Object.entries(s.reveal).map(([g, w]) => [g, when(w, parts, s.vo)])),
      overlayAt: when(s.overlayAt || 0, parts, s.vo),
    };
    t += secs;
    return shot;
  });
  return { shots, total: t };
}
