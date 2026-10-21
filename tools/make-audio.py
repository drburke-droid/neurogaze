"""Scores and mixes the BVD video's sound: original music that follows the story, with the narration over it.

    python tools/make-audio.py --timeline build/bvd-voice.timeline.json --voice build/vo --video build/bvd-voice.mp4 --out build/bvd-voice-final.mp4
    python tools/make-audio.py --timeline build/bvd-text.timeline.json --video build/bvd-text.mp4 --out build/bvd-text-final.mp4

--timeline is written by tools/record-video.mjs next to the video; --voice is tools/voiceover.py's folder (leave it
out for the version without a voice). The music is generated here from scratch (pads, a plucked arpeggio, bass, light
percussion and reverb), so there is nothing to license. Each part of the story has its own mood, all at an easy
walking pace: hook (curious), explain (warm and moving along), tense (darker, for the symptoms) and resolve
(brighter, for what helps).
The music dips under the voice, and the mix is evened out to YouTube's loudness (-14 LUFS).
Needs Python 3.10+ with numpy, scipy and soundfile, and ffmpeg. --wav saves the mix as a WAV as well.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, oaconvolve, resample_poly, sosfilt

RATE = 48000
BEAT = 60 / 92          # 92 beats a minute: moving along, not sleepy
BAR = 4 * BEAT
rng = np.random.default_rng(7)  # the same music every time

# Chords as MIDI notes (pad voicing), each mood's progression one bar a chord, and how it is played
D3, E3, Fs3, G3, A3, Bb3, B3, Cs4, D4, E4, Fs4, G4, A4 = 50, 52, 54, 55, 57, 58, 59, 61, 62, 64, 66, 67, 69
CH = {
    'Bm9': [B3 - 12, Fs3, A3, Cs4, D4], 'Gmaj7': [G3 - 12, D4, Fs4, B3], 'Em9': [E3 - 12, G3, B3, D4, Fs4],
    'Fs7sus': [Fs3 - 12, B3, Cs4, E4], 'Dmaj9': [D3 - 12, A3, Cs4, Fs4, E4], 'Bm7': [B3 - 12, A3, D4, Fs4],
    'Gmaj9': [G3 - 12, B3, D4, Fs4, A4], 'A6sus': [A3 - 12, D4, E4, Fs4], 'Gm6': [G3 - 12, Bb3, D4, E4],
    'Asus': [A3 - 12, D4, E4, A4], 'D/Fs': [Fs3 - 12, A3, D4, Fs4], 'Em7': [E3 - 12, B3, D4, G4],
}
# kick: a soft kick on beats 1 and 3; shaker: eighth notes, the off-beats a little louder; snap: beats 2 and 4
MOODS = {
    'hook':    dict(chords=['Bm9', 'Gmaj7', 'Em9', 'Fs7sus'], cutoff=1500, arp=0.35, bell=0.5, bass=0.8, pad=0.9, kick=0.6, shaker=0.25, snap=0.0, attack=0.8),
    'explain': dict(chords=['Dmaj9', 'A6sus', 'Bm7', 'Gmaj9'], cutoff=2600, arp=0.75, bell=0.2, bass=1.0, pad=0.7, kick=0.75, shaker=0.5, snap=0.3, attack=0.4),
    'tense':   dict(chords=['Bm9', 'Gm6', 'Em9', 'Fs7sus'], cutoff=1300, arp=0.55, bell=0.0, bass=1.1, pad=0.85, kick=0.85, shaker=0.35, snap=0.2, attack=0.5, low=True),
    'resolve': dict(chords=['D/Fs', 'Gmaj9', 'Em7', 'Asus', 'Dmaj9'], cutoff=3200, arp=0.8, bell=0.4, bass=0.9, pad=0.8, kick=0.6, shaker=0.45, snap=0.3, attack=0.4, high=True),
}

hz = lambda m: 440 * 2 ** ((m - 69) / 12)


def pad_note(m, secs, cutoff, att=1.4):
    """A soft, slightly detuned saw-like pad note that swells in over `att` seconds."""
    n = int(secs * RATE)
    t = np.arange(n) / RATE
    out = np.zeros(n)
    for cents in (-7, 0, 6):
        f = hz(m) * 2 ** (cents / 1200)
        for h in range(1, 9):
            if f * h > cutoff * 2.5:
                break
            out += np.sin(2 * np.pi * f * h * t + rng.uniform(0, 2 * np.pi)) / h ** 1.15
    rel = 1.2
    env = np.minimum(1, t / att) * np.clip((secs - t) / rel, 0, 1)
    return out * env / 3


def bass_note(m, secs):
    n = int(secs * RATE)
    t = np.arange(n) / RATE
    f = hz(m)
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.minimum(1, t / 0.6) * np.clip((secs - t) / 1.2, 0, 1)


def thump(secs=0.5):
    """A soft, round kick."""
    t = np.arange(int(secs * RATE)) / RATE
    f = 70 * np.exp(-t / 0.05) + 46  # a quick drop in pitch
    return np.sin(2 * np.pi * np.cumsum(f) / RATE) * np.minimum(1, t / 0.003) * np.exp(-t / 0.13)


def noise_hit(lo, hi, decay, secs):
    t = np.arange(int(secs * RATE)) / RATE
    n = sosfilt(butter(2, [lo, hi], 'band', fs=RATE, output='sos'), rng.standard_normal(len(t)))
    return n / np.abs(n).max() * np.minimum(1, t / 0.004) * np.exp(-t / decay)


SHAKERS = [noise_hit(5000, 12000, 0.028, 0.12) for _ in range(4)]  # a few, so it doesn't sound mechanical
SNAPS = [noise_hit(1200, 4500, 0.045, 0.2) for _ in range(3)]


def pluck(m, secs=1.6, bright=1.0):
    n = int(secs * RATE)
    t = np.arange(n) / RATE
    f = hz(m)
    tone = np.sin(2 * np.pi * f * t) + 0.35 * bright * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.15) + 0.12 * np.sin(6 * np.pi * f * t) * np.exp(-t / 0.08)
    return tone * np.minimum(1, t / 0.006) * np.exp(-t / 0.42)


def bell(m, secs=3.5):
    n = int(secs * RATE)
    t = np.arange(n) / RATE
    f = hz(m)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.5)) * np.minimum(1, t / 0.004) * np.exp(-t / 1.3)


def add(buf, at, sig, gain=1.0, pan=0.0):
    i = int(at * RATE)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i:i + len(sig), 0] += sig * gain * np.sqrt(0.5 * (1 - pan))
    buf[i:i + len(sig), 1] += sig * gain * np.sqrt(0.5 * (1 + pan))


def reverb(x, secs=3.0, wet=0.32):
    """A big soft room: convolution with decaying, darkened stereo noise."""
    n = int(secs * RATE)
    t = np.arange(n) / RATE
    ir = rng.standard_normal((n, 2)) * np.exp(-t / (secs / 6.9))[:, None]
    ir = sosfilt(butter(2, 7000, 'low', fs=RATE, output='sos'), ir, axis=0)
    ir[: int(0.012 * RATE)] = 0  # a short gap before the reflections
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    wetsig = np.stack([oaconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - wet) + wetsig * wet * 1.6


def score(timeline):
    """The music, section by section: a new section starts where the mood changes."""
    length = timeline['length'] + 0.5
    buf = {k: np.zeros((int(length * RATE) + 1, 2)) for k in ('pad', 'arp', 'bass', 'bell', 'drums')}
    starts = []  # (start, mood) where the mood changes
    for s in timeline['shots']:
        if not starts or s['mood'] != starts[-1][1]:
            starts.append((s['start'], s['mood']))
    sections = [(a, starts[i + 1][0] if i + 1 < len(starts) else length, m) for i, (a, m) in enumerate(starts)]

    for start, end, mood in sections:
        p = MOODS[mood]
        bars = max(1, int(np.ceil((end - start) / BAR)))
        for b in range(bars):
            at = start + b * BAR
            final = mood == 'resolve' and at + BAR >= end
            name = p['chords'][-1] if final else p['chords'][b % len(p['chords'])]
            notes = CH[name]
            hold = (end - at + 0.5) if final else BAR + 1.0  # the last chord rings out to the end
            cutoff = p['cutoff'] * (1 + 0.2 * np.sin(2 * np.pi * at / 45))
            pad = sum(pad_note(m, hold, cutoff, 1.4 if final else p['attack']) for m in notes[1:])
            pad = sosfilt(butter(2, cutoff, 'low', fs=RATE, output='sos'), pad)
            add(buf['pad'], at, pad, 0.11 * p['pad'], pan=0.0)
            add(buf['bass'], at, bass_note(notes[0], hold), 0.06 * p['bass'])
            if not final:  # the beat
                for k in (0, 2):
                    add(buf['drums'], at + k * BEAT, thump(), 0.16 * p['kick'] * (1 if k == 0 else 0.8))
                for k in (1, 3):
                    if p['snap']:
                        add(buf['drums'], at + k * BEAT, SNAPS[rng.integers(len(SNAPS))], 0.08 * p['snap'], pan=0.1)
                for k in range(8):
                    add(buf['drums'], at + k * BEAT / 2, SHAKERS[rng.integers(len(SHAKERS))], 0.16 * p['shaker'] * (1 if k % 2 else 0.55) * rng.uniform(0.85, 1.1), pan=0.3)
            # Arpeggio: eighth notes up and down the chord, with a few rests so it breathes
            if p['arp'] and not final:
                tones = sorted(n + (12 if not p.get('low') else 0) for n in notes[1:])
                if p.get('high'):
                    tones += [tones[1] + 12]
                order = tones + tones[-2:0:-1]
                for k in range(8):
                    if rng.random() < 0.1 and k % 2:
                        continue
                    m = order[(b * 8 + k) % len(order)]
                    vel = (0.75 if k % 2 == 0 else 0.55) * rng.uniform(0.85, 1.05)
                    add(buf['arp'], at + k * BEAT / 2, pluck(m, bright=0.6 if p.get('low') else 1.0), 0.11 * p['arp'] * vel, pan=0.35 * np.sin(k * 1.3))
            # Now and then a high bell
            if p['bell'] and rng.random() < p['bell']:
                m = notes[rng.integers(1, len(notes))] + 24
                add(buf['bell'], at + BEAT * rng.choice([0, 1, 2]), bell(m), 0.045, pan=rng.uniform(-0.5, 0.5))

    # The arpeggio echoes (dotted eighths, left then right)
    dry, arp = buf['arp'], buf['arp'].copy()
    for k, g in ((1, 0.32), (2, 0.14), (3, 0.06)):
        d = int(k * 0.75 * BEAT * RATE)
        arp[d:] += (dry[:-d, ::-1] if k % 2 else dry[:-d]) * g
    music = buf['pad'] + arp + buf['bell'] + buf['bass']
    music = reverb(music) + buf['drums'] + 0.15 * reverb(buf['drums'], secs=1.2, wet=1.0)  # the beat stays crisp, in a small room
    music = sosfilt(butter(1, 40, 'high', fs=RATE, output='sos'), music, axis=0)  # no rumble
    # Fade in, and out at the very end
    t = np.arange(len(music)) / RATE
    music *= (np.minimum(1, t / 2.5) * np.clip((timeline['length'] - t) / 3.0, 0, 1))[:, None]
    return music[: int(timeline['length'] * RATE)]


def narration(timeline, folder, n):
    """The voice clips placed where each shot's narration starts, and how loud the voice is at each moment."""
    info = json.loads((folder / 'voice.json').read_text())
    voice = np.zeros(n)
    for s in timeline['shots']:
        clip, rate = sf.read(folder / info['shots'][s['i']]['file'], dtype='float64')
        clip = resample_poly(clip, RATE, rate)
        i = int(s['voice'] * RATE)
        clip = clip[: max(0, n - i)]
        voice[i:i + len(clip)] += clip
    return voice


def duck(voice, depth=0.6):
    """How much to turn the music down: by `depth` while the voice speaks, easing in and out."""
    win = int(0.03 * RATE)
    level = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode='same'))
    on = (level > 0.01).astype(float)
    env = np.zeros_like(on)
    a, r = 1 - np.exp(-1 / (0.08 * RATE)), 1 - np.exp(-1 / (0.6 * RATE))
    # A smoothed on/off: quick to dip, slow to come back (in blocks, for speed)
    step = 64
    e = 0.0
    for i in range(0, len(on), step):
        target = on[i:i + step].max()
        k = a if target > e else r
        e += (target - e) * (1 - (1 - k) ** step)
        env[i:i + step] = e
    return 1 - depth * env


def loudness(path):
    """Measures the mix with ffmpeg's loudnorm, for the second, exact pass."""
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True, check=True)
    return json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr).group(0))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--timeline', required=True)
    ap.add_argument('--voice', help="tools/voiceover.py's folder; leave out for music only")
    ap.add_argument('--video', required=True, help='the silent video from tools/record-video.mjs')
    ap.add_argument('--out', required=True, help='the finished video')
    ap.add_argument('--music', type=float, default=None, help='music level under the voice, in dB (default -17 with a voice, 0 without)')
    ap.add_argument('--wav', help='also save the mix here')
    args = ap.parse_args()

    timeline = json.loads(Path(args.timeline).read_text())
    music = score(timeline)
    n = len(music)
    if args.voice:
        voice = narration(timeline, Path(args.voice), n)
        speaking = np.abs(voice) > 1e-3
        vrms = np.sqrt((voice[speaking] ** 2).mean())
        mrms = np.sqrt((music ** 2).mean())
        gain = vrms / mrms * 10 ** ((-17 if args.music is None else args.music) / 20)
        mix = music * gain * duck(voice)[:, None] + voice[:, None]
    else:
        mix = music * 10 ** ((args.music or 0) / 20)
    mix /= max(1e-9, np.abs(mix).max()) / 0.9
    tmp = Path(args.out).with_suffix('.mix.wav')
    sf.write(tmp, mix.astype(np.float32), RATE, subtype='FLOAT')
    if args.wav:
        sf.write(args.wav, mix.astype(np.float32), RATE, subtype='PCM_24')

    m = loudness(tmp)
    norm = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', args.video, '-i', str(tmp), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-af', f'{norm},aresample=48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', args.out], check=True)
    tmp.unlink()
    print(f"Saved {args.out} ({len(mix) / RATE / 60:.1f} min, {'voice and music' if args.voice else 'music only'}; mix was {m['input_i']} LUFS, now -14)")


if __name__ == '__main__':
    main()
