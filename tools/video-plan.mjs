// Prints the BVD video's narration as JSON, sentence by sentence, for tools/voiceover.py:
// [{ i, sentences: [{ text, speak }] }], where speak is how the voice should say it.
// --short <name> prints one of the vertical Shorts instead.
import { shotList, sentences, speakable } from '../video-script.js';

const i = process.argv.indexOf('--short');
const short = i > 0 ? process.argv[i + 1] : null;
console.log(JSON.stringify(shotList(short).map((s, n) => ({ i: n, sentences: sentences(s.vo).map((p) => ({ text: p.text, speak: speakable(p.text) })) }))));
