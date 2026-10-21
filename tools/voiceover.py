"""Makes the narration for the BVD video with Kokoro, an open text-to-speech model (Apache 2.0) that runs offline.

    python tools/voiceover.py --models DIR --out build/vo [--voice af_heart] [--speed 1.0]

DIR holds kokoro-v1.0.onnx and voices-v1.0.bin, from
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
Needs Python 3.10+ with kokoro-onnx, soundfile and numpy (pip install kokoro-onnx soundfile), and Node to read
the script. Writes shot-NN.wav (24 kHz mono) for each shot, and voice.json: how long each shot's narration is
and when each sentence starts and ends, which tools/record-video.mjs uses to time the video to the voice.
Voices to try: af_heart, af_bella (American, female), am_michael, am_fenrir (American, male), bf_emma (British).
"""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent

# Words the voice gets wrong, fixed in its phonemes: SACK-ade -> sa-KAHD (American, then British), and brain-stem
PHONEME_FIXES = [('sˈækeɪd', 'sækˈɑːd'), ('sˈakeɪd', 'sakˈɑːd'), ('bɹˈeɪnstəm', 'bɹˈeɪnstˌɛm')]


def pause_after(text):
    """Seconds of silence after a sentence: a little longer after a question, or a short punchy one."""
    pause = 0.42 if text.rstrip('"”\'').endswith(('?', '!')) else 0.32
    return pause + (0.15 if len(text.split()) <= 3 else 0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--models', required=True, help='folder with kokoro-v1.0.onnx and voices-v1.0.bin')
    ap.add_argument('--out', required=True, help='folder for the narration')
    ap.add_argument('--voice', default='af_heart')
    ap.add_argument('--speed', type=float, default=1.0)
    args = ap.parse_args()

    plan = json.loads(subprocess.run(['node', str(ROOT / 'tools' / 'video-plan.mjs')], check=True, capture_output=True, text=True).stdout)
    models = Path(args.models)
    model = models / 'kokoro-v1.0.onnx'
    if not model.exists():
        model = models / 'kokoro-v1.0.int8.onnx'  # the smaller model, if that's the one downloaded
    tts = Kokoro(str(model), str(models / 'voices-v1.0.bin'))
    lang = 'en-gb' if args.voice.startswith('b') else 'en-us'
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    shots = []
    for shot in plan:
        audio, timing, t, rate = [], [], 0.0, 24000
        for k, s in enumerate(shot['sentences']):
            phonemes = tts.tokenizer.phonemize(s['speak'], lang)
            for wrong, right in PHONEME_FIXES:
                phonemes = phonemes.replace(wrong, right)
            said, rate = tts.create(phonemes, voice=args.voice, speed=args.speed, lang=lang, is_phonemes=True)
            timing.append({'start': round(t, 3), 'end': round(t + len(said) / rate, 3)})
            audio.append(said)
            t += len(said) / rate
            if k < len(shot['sentences']) - 1:
                gap = np.zeros(int(pause_after(s['text']) * rate), dtype=np.float32)
                audio.append(gap)
                t += len(gap) / rate
        clip = np.concatenate(audio)
        name = f"shot-{shot['i']:02d}.wav"
        sf.write(out / name, clip, rate)
        shots.append({'file': name, 'secs': round(len(clip) / rate, 3), 'sentences': timing})
        print(f"{name}  {len(clip) / rate:5.1f} s  {' '.join(s['text'] for s in shot['sentences'])[:70]}")

    (out / 'voice.json').write_text(json.dumps({'voice': args.voice, 'speed': args.speed, 'sampleRate': rate, 'shots': shots}, indent=1))
    print(f"Saved {len(shots)} clips, {sum(s['secs'] for s in shots) / 60:.1f} min of narration, to {out}")


if __name__ == '__main__':
    main()
