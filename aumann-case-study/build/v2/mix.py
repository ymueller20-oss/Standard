"""Mix music (ducked under speech), voiceover, sound bites and SFX into one stereo track."""
import json, os, subprocess, sys
import numpy as np

SCR = sys.argv[1]
V2 = os.path.join(SCR, "v2")
SR = 48000
tl = json.load(open(os.path.join(V2, "timeline.json")))
events = json.load(open(os.path.join(V2, "audio.json")))
N = int((tl["duration"] + 0.5) * SR)


def load(path, ss=None, to=None, norm=None):
    cmd = ["ffmpeg", "-v", "error"] + (["-ss", f"{ss:.3f}", "-to", f"{to:.3f}"] if ss is not None else []) + ["-i", path]
    af = ["aresample=48000"] + ([f"loudnorm=I={norm}:TP=-1.5:LRA=11"] if norm else [])
    out = subprocess.run(cmd + ["-af", ",".join(af), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).copy()


def place(buf, x, t, gain=1.0, fade_in=0.0, fade_out=0.0):
    i = int(t * SR)
    if i < 0:
        x = x[-i:]; i = 0
    x = x[: max(0, len(buf) - i)] * gain
    if fade_in:
        k = min(len(x), int(fade_in * SR)); x[:k] *= np.linspace(0, 1, k)
    if fade_out:
        k = min(len(x), int(fade_out * SR)); x[len(x) - k:] *= np.linspace(1, 0, k)
    buf[i:i + len(x)] += x
    return i, i + len(x)


speech = np.zeros(N, np.float32); sfx = np.zeros(N, np.float32)
speech_spans = []
for ev in events:
    kind = ev[0]
    if kind == "vo":
        a, b = place(speech, load(ev[1], norm=-16), ev[2], 1.0, 0.005, 0.03)
        speech_spans.append((a, b))
    elif kind == "bite":
        _, f, t, s0, s1 = ev
        a, b = place(speech, load(os.path.join(SCR, "src", f), s0, s1 + 0.05, norm=-16), t, 1.0, 0.02, 0.08)
        speech_spans.append((a, b))
    elif kind == "sfx":
        _, name, t, g = ev
        place(sfx, load(os.path.join(SCR, "sfx", name + ".wav")), t, g * 0.55)

music = load(os.path.join(SCR, "music", "Hustle.mp3"), norm=-14)[:N]
music = np.pad(music, (0, N - len(music)))
# ducking envelope: 1.0 normally, 0.28 under speech, 0.12 s ramps
duck = np.ones(N, np.float32)
for a, b in speech_spans:
    duck[max(0, a - int(0.08 * SR)):b + int(0.15 * SR)] = 0.28
k = int(0.12 * SR); kern = np.ones(k) / k
duck = np.convolve(duck, kern, mode="same").astype(np.float32)
fade = np.ones(N, np.float32); fl = int(2.5 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
mix = music * 0.8 * duck * fade + speech * 1.0 + sfx
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
raw = os.path.join(V2, "mix_raw.f32")
mix.astype(np.float32).tofile(raw)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", raw,
                "-af", "loudnorm=I=-14:TP=-1.0:LRA=9", "-ar", str(SR), "-ac", "2", os.path.join(V2, "mix.wav")], check=True)
os.remove(raw)
print("mix ok", len(speech_spans), "speech spans")
