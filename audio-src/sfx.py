"""Krug & Krone – Geräusche. Aufruf: python3 sfx.py <kenney-ordner> <arbeitsordner> <ziel-ordner>
1) Auswahl aus den Kenney-Paketen (CC0): Karten, Chips, Münzen, Würfel, Klingen, Treffer, Glas, Glocke, Holz, Stein, Buch, Tür
2) Mit FluidR3 eingespielt: Pauke, Paukenwirbel, Taiko, Orchesterschlag, Röhrenglocke, Beckenschwell
3) Selbst gebaut (numpy): Zischen, Feuer, Feuerball, Feueratem, Gift, Heilung, Herzschlag, Peitsche, Zerfall"""
import numpy as np, os, sys, glob, subprocess as sp, wave, mido
from scipy.signal import butter, sosfilt
KN, WK, DST = sys.argv[1:4]; os.makedirs(WK, exist_ok=True); os.makedirs(DST, exist_ok=True)
SR = 44100; rng = np.random.default_rng(7)
def run(*a): sp.run(a, check=True, capture_output=True)
def enc(src, name, fx=()):
    run('sox', src, '-r', str(SR), '-c', '1', f'{WK}/e.wav', *fx, 'gain', '-n', '-2')
    run('ffmpeg', '-y', '-loglevel', 'error', '-i', f'{WK}/e.wav', '-codec:a', 'libmp3lame', '-b:a', '96k', f'{DST}/{name}.mp3')
def kn(pat): return sorted(glob.glob(f'{KN}/**/{pat}', recursive=True))
# 1) Kenney
PICK = [('karte', 'card-place-*.ogg', 4), ('schub', 'card-slide-*.ogg', 4), ('mischen', 'card-shuffle.ogg', 1), ('faecher', 'card-fan-*.ogg', 2),
        ('chips', 'chips-stack-*.ogg', 4), ('chip', 'chip-lay-*.ogg', 3), ('pot', 'chips-collide-*.ogg', 2), ('muenzen', 'handleCoins*.ogg', 2),
        ('wuerfel', 'dice-throw-*.ogg', 2), ('schwert', 'drawKnife*.ogg', 2), ('klinge', 'knifeSlice*.ogg', 2), ('hieb', 'chop.ogg', 1),
        ('schlag', 'impactPunch_heavy_*.ogg', 3), ('metall', 'impactMetal_heavy_*.ogg', 3), ('glas', 'impactGlass_heavy_*.ogg', 2), ('glocke', 'impactBell_heavy_*.ogg', 1),
        ('holz', 'impactWood_heavy_*.ogg', 2), ('klick', 'impactWood_light_*.ogg', 2), ('stein', 'impactMining_*.ogg', 2), ('buch', 'bookFlip*.ogg', 2), ('tuer', 'doorOpen_1.ogg', 1)]
for name, pat, n in PICK:
    fs = kn(pat)
    for i, f in enumerate(fs[:n]): enc(f, f'{name}{i+1}' if n > 1 else name)
# 2) FluidR3-Einzelschläge
def one(name, prog, notes, dur, ch=0, vel=118, roll=None):
    mf = mido.MidiFile(ticks_per_beat=480); t = mido.MidiTrack(); mf.tracks.append(t)
    t.append(mido.MetaMessage('set_tempo', tempo=500000))
    if ch != 9: t.append(mido.Message('program_change', channel=ch, program=prog))
    t.append(mido.Message('control_change', channel=ch, control=91, value=60))
    ev = []
    if roll:
        k = 0
        while k*roll[0] < roll[1]: ev += [(int(k*roll[0]*480), 'on', notes[0], min(127, 40+k*4)), (int((k*roll[0]+.1)*480), 'off', notes[0], 0)]; k += 1
        ev += [(int(roll[1]*480), 'on', notes[0], 127), (int((roll[1]+dur)*480), 'off', notes[0], 0)]
    else:
        for n in notes: ev += [(0, 'on', n, vel), (int(dur*480), 'off', n, 0)]
    ev.sort(key=lambda e: e[0]); last = 0
    for tt, k, n, v in ev:
        t.append(mido.Message('note_on' if k == 'on' else 'note_off', channel=ch, note=n, velocity=v, time=tt-last)); last = tt
    mf.save(f'{WK}/{name}.mid')
    run('fluidsynth', '-ni', '-g', '0.8', '-r', str(SR), '-o', 'synth.reverb.level=0.7', '-o', 'synth.reverb.room-size=0.8', '-F', f'{WK}/{name}.wav', '/usr/share/sounds/sf2/FluidR3_GM.sf2', f'{WK}/{name}.mid')
    enc(f'{WK}/{name}.wav', name, ('silence', '1', '0.005', '0.2%', 'reverse', 'silence', '1', '0.05', '0.1%', 'reverse'))
one('pauke', 47, [45], 2.5); one('pauketief', 47, [38], 3); one('paukenwirbel', 47, [40], 2, roll=(.06, 1.4))
one('taiko', 116, [48, 36], 2); one('orchester', 55, [57, 64, 69, 72], 2); one('roehrenglocke', 14, [64, 76], 4, vel=100); one('schwell', 119, [60], 2.2, vel=110)
# 3) selbst gebaut
def lp(x, f): return sosfilt(butter(2, f/(SR/2), 'low', output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f/(SR/2), 'high', output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo/(SR/2), hi/(SR/2)], 'band', output='sos'), x)
def env(n, a, d, curve=3):
    t = np.linspace(0, 1, n); e = np.minimum(1, t/max(a, 1e-4)); return e*np.exp(-curve*np.maximum(0, t-a)/max(d, 1e-4))
def save(name, x, fx=()):
    x = x/ (np.abs(x).max()+1e-9)*.9
    with wave.open(f'{WK}/{name}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x*32767).astype(np.int16).tobytes())
    enc(f'{WK}/{name}.wav', name, fx)
def sweep_noise(n, f0, f1, q=1.2):
    x = rng.standard_normal(n); out = np.zeros(n); seg = 512
    for i in range(0, n, seg):
        f = f0*(f1/f0)**(i/n); lo, hi = f/q, min(SR/2-100, f*q); out[i:i+seg] = bp(x[i:i+seg+2048], lo, hi)[:len(out[i:i+seg])]
    return out
def whoosh(dur, f0, f1):
    n = int(dur*SR); x = sweep_noise(n, f0, f1, 1.6); t = np.linspace(0, 1, n); return x*np.sin(np.pi*t)**1.5
save('wusch1', whoosh(.32, 300, 2200), ('reverb', '20')); save('wusch2', whoosh(.42, 220, 1600), ('reverb', '25'))
def crackle(n, dens):
    x = np.zeros(n); idx = rng.integers(0, n, int(dens*n/SR))
    for i in idx:
        L = rng.integers(20, 160); x[i:i+L] += rng.standard_normal(min(L, n-i))*np.exp(-np.arange(min(L, n-i))/30)*rng.uniform(.2, 1)
    return hp(x, 1500)
def fire(dur, body=1.0, dens=120):
    n = int(dur*SR); roar = lp(rng.standard_normal(n), 700)*body; roar *= 1+.5*lp(rng.standard_normal(n), 6)
    e = env(n, .08, .6, 2.5); return (roar*.8+crackle(n, dens)*.6)*e
save('feuer', fire(1.2), ('reverb', '35')); save('feuerball', np.concatenate([whoosh(.35, 200, 900)*.6+fire(.35, .3, 60)*.5, fire(.7, 1.2, 160)]), ('reverb', '30'))
n = int(2.2*SR); x = lp(rng.standard_normal(n), 1100)*(1+.7*lp(rng.standard_normal(n), 4)); x = x*env(n, .25, .7, 1.6)+crackle(n, 200)*.5*env(n, .2, .8, 1.5)
save('feuersturm', x, ('reverb', '50', 'bass', '+4'))
def bubble(f, d):
    n = int(d*SR); t = np.arange(n)/SR; fr = f*(1+ 3*t/d); return np.sin(2*np.pi*np.cumsum(fr)/SR)*np.exp(-t/(d/3))
x = np.zeros(int(1.0*SR))
for k in range(9):
    s = int(rng.uniform(0, .8)*SR); b = bubble(rng.uniform(250, 700), rng.uniform(.04, .09)); x[s:s+len(b)] += b*rng.uniform(.4, 1)
save('gift', x+lp(rng.standard_normal(len(x)), 300)*.05, ('reverb', '30'))
def bell(f, d, partials=((1, 1), (2.76, .4), (5.4, .2), (8.9, .1))):
    n = int(d*SR); t = np.arange(n)/SR; return sum(a*np.sin(2*np.pi*f*m*t)*np.exp(-t*(1.5+m)) for m, a in partials)
x = np.zeros(int(1.9*SR))
for k, f in enumerate((1046.5, 1318.5, 1568, 2093)):
    s = int(k*.09*SR); b = bell(f, 1.4); x[s:s+len(b)] += b*(.8-.12*k)
save('heilung', x, ('reverb', '60'))
def thump(f, d):
    n = int(d*SR); t = np.arange(n)/SR; fr = f*np.exp(-t*8)+f*.6; return np.sin(2*np.pi*np.cumsum(fr)/SR)*np.exp(-t*14)
h = np.zeros(int(.75*SR)); a = thump(70, .3); b = thump(62, .3); h[:len(a)] += a; s = int(.2*SR); h[s:s+len(b)] += b*.75
save('herz', lp(h, 300), ())
n = int(.35*SR); t = np.arange(n)/SR; w = np.sin(2*np.pi*np.cumsum(400+5000*t/0.35)/SR)*np.exp(-((t-.06)/.05)**2)*.4
crack = np.zeros(n); c0 = int(.07*SR); crack[c0:c0+600] = rng.standard_normal(600)*np.exp(-np.arange(600)/90)
save('peitsche', hp(w+crack*1.6, 300), ('reverb', '30'))
n = int(1.4*SR); t = np.arange(n)/SR; boom = np.sin(2*np.pi*np.cumsum(60*np.exp(-t*2)+28)/SR)*np.exp(-t*3)
crumble = crackle(n, 400)*np.exp(-t*2.2)*.7+lp(rng.standard_normal(n), 900)*np.exp(-t*4)*.4
save('zerfall', boom+crumble, ('reverb', '40'))
print(len(os.listdir(DST)), 'Geräusche')
