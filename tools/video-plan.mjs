// Prints the BVD video's narration as JSON, sentence by sentence, for tools/voiceover.py:
// [{ i, sentences: [{ text, speak }] }], where speak is how the voice should say it.
import { SHOTS, sentences, speakable } from '../video-script.js';

console.log(JSON.stringify(SHOTS.map((s, i) => ({ i, sentences: sentences(s.vo).map((p) => ({ text: p.text, speak: speakable(p.text) })) }))));
