// The BVD video: shot list with voiceover, on-screen captions and what the story does in each shot.
// Read by the recording page (video.js) and by tools/record-video.mjs, which writes captions and chapters.
// Created by Dr Robert Burke
//
// Each shot:  ch       chapter title (on the first shot of a chapter)
//             step     story card to show (its id in neurolens.js), if it changes
//             vo       voiceover, as Dr Burke would say it
//             cap      short on-screen caption
//             min      shortest the shot can be (seconds), so its animation can finish
//             view     how the face is framed from this shot on: 'story' (the default) or 'eyes' (closer)
//             overlay  'chart' | 'symptoms' | 'title' | 'end': a picture laid over the story for this shot
//             at       timed actions within the shot: [seconds, action, value]
//                      actions: cover (eye or null), peek (true/false), slow (true/false)

export const WORDS_PER_SECOND = 2.5; // about 150 words a minute, an easy speaking pace

export const SHOTS = [
  // ── Hook: symptoms first, then the drifting eye ────────────────────────────
  { ch: 'Your eyes are "fine". So why do they hurt?', step: 'mirror', overlay: 'chart', min: 4,
    vo: 'You can see twenty-twenty, and your eyes are healthy.',
    cap: '20/20 vision. Healthy eyes.' },
  { overlay: 'symptoms', min: 8,
    vo: 'So why are they sore and strained by the end of every day? Why the headaches, the stiff neck, that wiped-out feeling?',
    cap: 'So why do your eyes hurt by the end of the day?' },
  { step: 'peek', view: 'eyes', min: 5, at: [[0.2, 'cover', 'R'], [1.2, 'peek', true]],
    vo: "Watch this eye when it's covered. It drifts out of line.",
    cap: 'Watch the eye behind the paddle.' },
  { overlay: 'title', min: 6,
    vo: "That's binocular vision dysfunction, or BVD. Here's how it works, and a ten-second test you can try yourself.",
    cap: '' },

  // ── How your eyes stay straight ──────────────────────────────────────────
  { ch: 'How your eyes stay straight', step: 'mirror', view: 'story', min: 3,
    vo: 'In the mirror, your eyes look straight.',
    cap: 'Your eyes look straight…' },
  { step: 'pull', min: 6,
    vo: 'When both eyes are in use, your brain keeps them lined up, so the picture from each eye lands right on top of the other. As this target moves away, both eyes straighten to follow it.',
    cap: '…because your brain keeps them lined up.' },
  { step: 'rest', min: 4,
    vo: "But when an eye isn't being used, for example when it's covered, the brain lets it relax to its resting position.",
    cap: 'Not in use? It relaxes to its resting position.' },
  { step: 'bvd', min: 4,
    vo: 'Where that resting position is, and how well you cope with it, is what BVD is about.',
    cap: 'Where it rests is what BVD is about.' },

  // ── The cover test ───────────────────────────────────────────────────────
  { ch: 'The cover test', step: 'peek', min: 6, at: [[0.2, 'cover', 'R'], [1.2, 'peek', true]],
    vo: "Let's cover this eye and look behind the paddle, in X-ray. See how it has drifted outward? These eyes rest slightly out of line.",
    cap: 'Covered, it drifts outward.' },
  { step: 'other', min: 5, at: [[0.4, 'cover', 'L']],
    vo: 'Cover the other eye, and they swap: the covered eye drifts, and the uncovered one straightens out.',
    cap: 'Cover the other eye: they swap.' },
  { step: 'sleep', min: 4,
    vo: 'Asleep, neither eye is in use, so both drift to rest.',
    cap: 'Asleep, both eyes rest.' },
  { step: 'wake', min: 4,
    vo: 'Open both eyes, and the brain pulls them straight again.',
    cap: 'Awake, the brain pulls them straight.' },

  // ── Try it yourself ──────────────────────────────────────────────────────
  { ch: 'Try it yourself', step: 'self', min: 6,
    vo: 'Now try it yourself. Look at the red dot. Cover one eye with your hand, then quickly move your hand across to the other eye. Go back and forth a few times. Pause the video if you need to.',
    cap: 'Look at the red dot. Cover one eye, then the other.' },
  { step: 'selfJump', min: 4,
    vo: "Did the dot jump? If it did, your eye wasn't quite straight while it was behind your hand, and your brain had to pull it back. A small jump is common.",
    cap: 'Did the dot jump?' },

  // ── The switch-off you never notice ──────────────────────────────────────
  { ch: 'The switch-off you never notice', step: 'saccade', min: 6,
    vo: "Here's something most people don't know. Every time your eyes jump, called a saccade, your brain switches off their input for a split second, so you don't see a blur.",
    cap: 'During every jump, the brain switches off the input.' },
  { step: 'mirrorEyes', min: 4,
    vo: "Try it in a mirror: glance from one of your eyes to the other. You can't see them move.",
    cap: "In a mirror, you can't see your eyes move…" },
  { step: 'camera', min: 3,
    vo: "On your phone's front camera, you can.",
    cap: '…on a phone camera, you can.' },
  { step: 'landing', min: 6,
    vo: 'And while the input is off, each eye heads for its resting position. So after every jump, the eyes land slightly out of line, and the brain pulls them back together.',
    cap: 'After every jump, the eyes land slightly out of line.' },

  // ── Reading ──────────────────────────────────────────────────────────────
  { ch: 'Reading', step: 'read', min: 5, at: [[0, 'slow', false]],
    vo: 'Reading is jump after jump, with both eyes turned in to the page. At full speed, it looks normal.',
    cap: 'Reading at full speed looks normal…' },
  { step: 'readSlow', min: 8, at: [[0, 'slow', true]],
    vo: "Slow it down, and you can see the miss after every word. That's called fixation disparity, and for eyes that rest outward, it's usually bigger up close.",
    cap: '…slowed down, you can see the miss: fixation disparity.' },
  { step: 'report', min: 4, at: [[0, 'slow', false]],
    vo: "It happens thousands of times a day. And your eye muscles don't just move your eyes. They report back.",
    cap: 'Thousands of times a day.' },

  // ── Inside your head ─────────────────────────────────────────────────────
  { ch: 'Inside your head', step: 'sense', min: 6,
    vo: "Tiny sensors in the eye muscles, called proprioceptors, tell your brain how stretched each muscle is and how hard it's working, many times a second.",
    cap: 'Eye muscle sensors report back, many times a second.' },
  { step: 'route', min: 4,
    vo: 'Those reports travel along the trigeminal nerve.',
    cap: 'They travel along the trigeminal nerve.' },
  { step: 'map', min: 6,
    vo: 'The same nerve carries feeling from your forehead, face and jaw, works your chewing muscles, supplies the covering of your brain, and meets the nerves from the back of your head and neck.',
    cap: 'The same nerve serves your face, jaw, brain covering and neck.' },
  { step: 'pulse', min: 9,
    vo: 'Every jump sends normal signals. When the eyes land out of line, each correction adds extra. Over an hour of reading, the extras pile up: about nine thousand of them.',
    cap: 'An hour of reading: about 9,000 extra corrections.' },

  // ── It's not tired muscles ───────────────────────────────────────────────
  { ch: "It's not tired muscles", step: 'weight', min: 5,
    vo: 'Your eye weighs about seven and a half grams, about one and a half credit cards, and the muscles that move it are far stronger than they need to be.',
    cap: 'Each eye: about 7.5 grams.' },
  { step: 'built', min: 5,
    vo: "They're built not to tire, with their own kind of myosin, packed with mitochondria, and a rich blood supply. So it probably isn't the muscles giving out.",
    cap: 'Built not to tire.' },

  // ── A bandwidth problem ──────────────────────────────────────────────────
  { ch: 'A bandwidth problem', step: 'stream', min: 6,
    vo: "What gets overloaded is the information. Everyone's eye sensors send normal traffic. Eyes that rest out of line add extra, from being held in line all day and corrected after every jump.",
    cap: 'Normal traffic, plus extra.' },
  { step: 'shared', min: 6,
    vo: 'And it all runs through one shared nerve.',
    cap: 'One shared nerve.' },
  { step: 'analogy', min: 5,
    vo: 'Think of your home internet. Video calls work fine, until someone starts a download that never stops.',
    cap: 'A download that never stops.' },

  // ── When the nerve has had too much ──────────────────────────────────────
  { ch: 'When the nerve has had too much', step: 'overload', min: 5,
    vo: 'When the trigeminal nerve has had too much, the brain is thought to start registering it as discomfort, or pain.',
    cap: 'Too much traffic…' },
  { step: 'symHead', min: 4,
    vo: 'Headaches, often across the forehead or temples. Sore, tired or dry-feeling eyes.',
    cap: 'Headaches. Eye strain.' },
  { step: 'symJaw', min: 3.5,
    vo: 'Jaw tension, or clenching.',
    cap: 'Jaw tension.' },
  { step: 'symNeck', min: 3.5,
    vo: 'Neck and shoulder pain.',
    cap: 'Neck and shoulder pain.' },

  // ── What helps ───────────────────────────────────────────────────────────
  { ch: 'What helps', step: 'calm', min: 6,
    vo: "Treating BVD aims to help the eyes line up with less holding and correcting, for example with prism glasses, so there's less extra traffic, and less to set off these symptoms.",
    cap: 'Less correcting, less extra traffic.' },
  { overlay: 'end', min: 15,
    vo: 'If this sounds like you, have your eye alignment measured, far and near. You can find out more at calgaryvisioncentre.com slash B V D.',
    cap: '' },
];

// How long each shot lasts: long enough to say its voiceover at an easy pace, and for its animation
export function shotSeconds(shot) {
  const words = shot.vo.trim().split(/\s+/).length;
  return Math.max(shot.min || 0, words / WORDS_PER_SECOND + 0.8);
}

// Start time of every shot, and the total length
export function timeline() {
  let t = 0;
  const shots = SHOTS.map((s, i) => { const at = t; t += shotSeconds(s); return { ...s, i, start: at, secs: shotSeconds(s) }; });
  return { shots, total: t };
}
