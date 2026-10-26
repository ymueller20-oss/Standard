"""Synthesise the sound-effect kit (48 kHz mono WAVs) used by the mix."""
import sys, os, wave
import numpy as np

SR = 48000
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def save(name, x):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def t(sec):
    return np.arange(int(SR * sec)) / SR


def lowpass(x, cutoff):
    # one-pole, cutoff may be an array (time-varying)
    a = np.exp(-2 * np.pi * np.asarray(cutoff) / SR) * np.ones_like(x)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def bandsweep(n, f0, f1):
    x = rng.standard_normal(n)
    cut = np.geomspace(f0, f1, n)
    lp = lowpass(x, cut)
    return lp - lowpass(lp, cut * 0.25)


# whoosh: band-passed noise sweeping up then down, swelling into the cut
n = int(SR * 0.45)
w = bandsweep(n, 400, 6000)
env = np.sin(np.linspace(0, np.pi, n)) ** 2 * np.linspace(0.4, 1, n)
save("whoosh", w * env)

# hit: sub drop + noise burst
tt = t(0.9)
sub = np.sin(2 * np.pi * (55 * tt + 60 * (1 - np.exp(-tt * 18)) / 18)) * np.exp(-tt * 4.5)
burst = rng.standard_normal(len(tt)) * np.exp(-tt * 30) * 0.6
save("hit", sub + lowpass(burst, 3000))

# riser: noise + tone sweeping up over 2 s
tt = t(2.0)
r = bandsweep(len(tt), 300, 9000) * (tt / 2) ** 2
tone = np.sin(2 * np.pi * np.cumsum(np.geomspace(200, 1200, len(tt))) / SR) * (tt / 2) ** 3 * 0.3
save("riser", r + tone)

# pop: short sine blip for text pops
tt = t(0.12)
save("pop", np.sin(2 * np.pi * (900 - 2500 * tt) * tt) * np.exp(-tt * 45))

# click: mouse click
tt = t(0.05)
save("click", rng.standard_normal(len(tt)) * np.exp(-tt * 300) + np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 200))

# tick: counter tick
tt = t(0.03)
save("tick", np.sin(2 * np.pi * 3200 * tt) * np.exp(-tt * 250))

# swish: short whoosh for whip pans
n = int(SR * 0.22)
save("swish", bandsweep(n, 1500, 9000) * np.sin(np.linspace(0, np.pi, n)) ** 2)

# camera shutter for flashes
tt = t(0.12)
c = rng.standard_normal(len(tt)) * (np.exp(-tt * 120) + 0.5 * np.exp(-np.maximum(tt - 0.06, 0) * 150) * (tt > 0.06))
save("shutter", lowpass(c, 6000))
print("sfx ok")
