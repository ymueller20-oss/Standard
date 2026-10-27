"""Krug & Krone – Geräusche. Aufruf: python3 sfx.py <kenney-ordner> <arbeitsordner> <ziel-ordner>
1) Auswahl aus den Kenney-Paketen (CC0): Karten, Chips, Münzen, Würfel, Klingen, Treffer, Glas, Glocke, Holz, Stein, Buch, Tür
2) Mit FluidR3 eingespielt: Pauke, Paukenwirbel, Taiko, Orchesterschlag, Röhrenglocke, Beckenschwell
Selbst erzeugte Klänge (Rauschen, Oszillatoren) klangen billig und wurden entfernt."""
import os, sys, glob, subprocess as sp, wave, mido
KN, WK, DST = sys.argv[1:4]; os.makedirs(WK, exist_ok=True); os.makedirs(DST, exist_ok=True)
SR = 44100
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
HEAVY = {'schlag': ('pitch', '-250', 'bass', '+6', '90', 'reverb', '28', '50', '70'), 'metall': ('pitch', '-150', 'reverb', '35', '50', '80'), 'klinge': ('reverb', '20'), 'glocke': ('reverb', '45', '50', '90'), 'glas': ('reverb', '30')}
for name, pat, n in PICK:
    fs = kn(pat)
    for i, f in enumerate(fs[:n]): enc(f, f'{name}{i+1}' if n > 1 else name, HEAVY.get(name, ()))
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
print(len(os.listdir(DST)), 'Geräusche')
