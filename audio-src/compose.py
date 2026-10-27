"""Krug & Krone – Musik als Noten. Erzeugt MIDI-Dateien, die render.sh mit dem FluidR3-Soundfont einspielt.
Stil: Italo-Western (Pfeifen, Twang-Gitarre, Trompete, Chor, Pauken) trifft Irish Folk (Fiddle, Whistle, Bodhrán, Harfe).
Notation: "A4:1.5 E5:.5 r:1" = Ton:Dauer in Vierteln, r = Pause."""
import mido, random, sys, os
TPB = 480
PC = {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def midi(n):
    p = PC[n[0]]; i = 1
    while i < len(n) and n[i] in '#b': p += 1 if n[i] == '#' else -1; i += 1
    return 12*(int(n[i:])+1)+p

class Song:
    def __init__(s, bpm, seed=1):
        s.bpm = bpm; s.tr = {}; random.seed(seed)
    def ch(s, c, prog, vol=100, pan=64, rev=40, cho=0, drum=False):
        s.tr[c] = dict(prog=prog, vol=vol, pan=pan, rev=rev, cho=cho, ev=[], cc=[], drum=drum); return c
    def note(s, c, t, d, n, v=90, hum=True):
        if isinstance(n, str): n = midi(n)
        j = random.randint(-8, 8)/TPB if hum else 0
        vv = max(1, min(127, v + (random.randint(-7, 7) if hum else 0)))
        s.tr[c]['ev'].append((max(0, t+j), max(.02, d*.97), n, vv))
    def line(s, c, t, txt, v=90, oct=0, leg=1.0):
        for tok in txt.split():
            n, d = tok.split(':'); d = float(d)
            if n != 'r': s.note(c, t, d*leg, midi(n)+12*oct, v)
            t += d
        return t
    def chord(s, c, t, d, notes, v=70):
        for n in notes.split(): s.note(c, t, d, n, v)
    def cc(s, c, t, num, val): s.tr[c]['cc'].append((t, num, val))
    def save(s, path):
        mf = mido.MidiFile(ticks_per_beat=TPB); meta = mido.MidiTrack(); mf.tracks.append(meta)
        meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(s.bpm)))
        for c, t in s.tr.items():
            tr = mido.MidiTrack(); mf.tracks.append(tr); msgs = []
            if not t['drum']: msgs.append((0, mido.Message('program_change', channel=c, program=t['prog'])))
            for num, val in ((7, t['vol']), (10, t['pan']), (91, t['rev']), (93, t['cho'])): msgs.append((0, mido.Message('control_change', channel=c, control=num, value=val)))
            for tt, num, val in t['cc']: msgs.append((int(tt*TPB), mido.Message('control_change', channel=c, control=num, value=val)))
            for (st, d, n, v) in t['ev']:
                msgs.append((int(st*TPB), mido.Message('note_on', channel=c, note=n, velocity=v)))
                msgs.append((int((st+d)*TPB), mido.Message('note_off', channel=c, note=n, velocity=0)))
            msgs.sort(key=lambda m: (m[0], 0 if m[1].type in ('program_change', 'control_change') else (1 if m[1].type == 'note_off' else 2)))
            last = 0
            for tt, m in msgs: tr.append(m.copy(time=tt-last)); last = tt
        mf.save(path)

# Akkorde
CH = {'Am':'A2 E3 A3 C4 E4','G':'G2 D3 G3 B3 D4','F':'F2 C3 F3 A3 C4','Em':'E2 B2 E3 G3 B3','E':'E2 B2 E3 G#3 B3','C':'C3 G3 C4 E4 G4',
      'Dm':'D3 A3 D4 F4 A4','Bb':'Bb2 F3 Bb3 D4 F4','A':'A2 E3 A3 C#4 E4','D':'D3 A3 D4 F#4 A4','Bm':'B2 F#3 B3 D4 F#4'}
def tones(c): return CH[c].split()
DR = dict(kick=36, lowtom=41, midtom=45, hitom=48, rim=37, tamb=54, clap=39, crash=49, ride=51, claves=75, shaker=70, tri=81, cym=57)

def arp16(s, c, t, chord, beats, v=58, pat=(1, 2, 3, 2)):
    tn = tones(chord)
    for k in range(int(beats*4)): s.note(c, t+k*.25, .3, tn[pat[k % len(pat)]], v-(0 if k % 4 == 0 else 10))
def bodhran(s, c, t, bars, beats=4, v=80):
    for b in range(bars):
        for k in range(beats*2):
            tt = t+b*beats+k*.5
            s.note(c, tt, .2, DR['lowtom'] if k % 2 == 0 else DR['midtom'], v if k % 4 == 0 else v-25)
            if k % 2 == 1: s.note(c, tt+.25, .1, DR['midtom'], v-38)

# ---------------- Titel: Pfeifen, Twang, Chor, dann irischer Reel ----------------
def titel(loops=1):
    s = Song(80, 11)
    WH = s.ch(0, 78, 96, 64, 85); GT = s.ch(1, 27, 70, 44, 80, 30); CHO = s.ch(2, 52, 78, 64, 90); TP = s.ch(3, 56, 88, 76, 70)
    FI = s.ch(4, 110, 92, 56, 60); BA = s.ch(5, 32, 92, 64, 20); TI = s.ch(6, 47, 100, 64, 60); RC = s.ch(7, 74, 64, 84, 70)
    SG = s.ch(8, 25, 72, 36, 50); HM = s.ch(10, 22, 76, 90, 70); D = s.ch(9, 0, 92, 64, 40, drum=True)
    prog = ['Am', 'Am', 'G', 'Am', 'F', 'G', 'Em', 'Am', 'Am', 'G', 'Am', 'Em', 'F', 'G', 'E', 'Am']
    for L in range(loops):
        o = L*64
        for b, c in enumerate(prog):
            t = o+b*4
            arp16(s, GT, t, c, 4, 54 if b < 8 else 44)
            s.note(BA, t, 2, tones(c)[0], 88); s.note(BA, t+2, 2, tones(c)[0] if b % 2 else tones(c)[1], 80)
            if 4 <= b < 8 or b >= 12:
                for n in tones(c)[2:]: s.note(CHO, t, 4, n, 70 if b < 12 else 84)
            if b >= 8:
                for k in range(8): s.chord(SG, t+k*.5, .4, ' '.join(tones(c)[1:]), 62 if k in (0, 3, 6) else 44)
        s.line(WH, o, 'E4:.5 A4:.5 E5:3  D5:.5 E5:.5 F5:1 E5:1 D5:1  D5:1.5 B4:.5 G4:2  A4:4  C5:.5 F5:.5 A5:3  G5:.5 F5:.5 E5:1 D5:1 B4:1  E5:1.5 G5:.5 B5:2  A5:3 r:1', 96)
        s.line(HM, o+12, 'r:2 E5:.5 D5:.5 C5:.5 B4:.5', 70)
        s.line(TP, o+20, 'r:3 E4:.25 G4:.25 r:.5  r:3 E4:.5  A4:.5 C5:.5 E5:1 r:1', 76)
        s.line(FI, o+32, ' '.join(f'{n}:.5' for n in 'A4 B4 C5 A4 E5 A4 C5 A4 B4 G4 D5 G4 B4 D5 G5 D5 E5 A5 G5 E5 D5 E5 C5 A4 B4 E5 E5 D5 B4 G4 E4 G4 A4 C5 F5 C5 A5 F5 C5 A4 B4 D5 G5 D5 B5 G5 D5 B4 G#4 B4 E5 B4 G#5 E5 D5 B4 C5 B4 A4 G#4'.split())+' A4:2', 86)
        s.line(RC, o+40, ' '.join(f'{n}:.5' for n in 'E5 A5 G5 E5 D5 E5 C5 A4 B4 E5 E5 D5 B4 G4 E4 G4'.split()), 60, oct=1)
        s.line(TP, o+48, 'C5:.5 F5:.5 A5:3  G5:.5 F5:.5 E5:1 D5:1 B4:1  G#4:1 B4:1 E5:2  A4:3 r:1', 94)
        bodhran(s, D, o+32, 8, v=78)
        for b in (0, 4, 8, 12): s.note(TI, o+b*4, 1.5, 'A2', 112)
        for k in range(16): s.note(TI, o+62+k*.125, .12, 'E2', 50+k*4, hum=False)
        s.note(D, o, 3, DR['crash'], 70); s.note(D, o+32, 3, DR['crash'], 80); s.note(D, o+48, 3, DR['crash'], 90)
        for b in range(8, 16):
            for q in (1, 3): s.note(D, o+b*4+q, .2, DR['tamb'], 50)
    return s, 64

# ---------------- Tisch: ruhige irische Weise mit Mundharmonika ----------------
def tisch(loops=1):
    s = Song(96, 21)
    HP = s.ch(0, 46, 84, 50, 70); FI = s.ch(1, 40, 74, 72, 80); HM = s.ch(2, 22, 70, 58, 70); AC = s.ch(3, 21, 46, 64, 60)
    BA = s.ch(4, 32, 70, 64, 30); RC = s.ch(5, 74, 58, 80, 80); D = s.ch(9, 0, 60, 64, 50, drum=True); GT = s.ch(6, 24, 66, 40, 60)
    prog = ['Dm', 'C', 'Dm', 'Am', 'Bb', 'C', 'Dm', 'Dm', 'F', 'C', 'Dm', 'Am', 'Bb', 'C', 'A', 'Dm', 'Dm', 'C', 'Dm', 'Am', 'Bb', 'C', 'Dm', 'Dm']
    for L in range(loops):
        o = L*72
        for b, c in enumerate(prog):
            t = o+b*3; tn = tones(c)
            for k, i in enumerate((0, 2, 3, 4, 3, 2)): s.note(HP, t+k*.5, .9, tn[i], 64 if k == 0 else 50)
            s.note(BA, t, 3, tn[0], 70)
            for n in tn[2:]: s.note(AC, t, 3, n, 46)
            if b >= 8:
                s.note(GT, t, .4, tn[1], 52); s.chord(GT, t+1, .4, ' '.join(tn[2:]), 40); s.chord(GT, t+2, .4, ' '.join(tn[2:]), 36)
            if b >= 8 and b % 2 == 0: s.note(D, t, .3, DR['lowtom'], 58)
            if b >= 8: s.note(D, t+1.5, .2, DR['shaker'], 30)
        mel = 'A4:1 D5:1 E5:1 F5:2 E5:1 D5:1 C5:1 A4:1 C5:1.5 B4:.5 A4:1 D5:1 F5:1 D5:1 E5:2 G5:1 F5:1 E5:1 D5:1 D5:3'
        s.line(FI, o, mel, 72, leg=1.04)
        s.line(HM, o+24, 'A4:1 C5:1 F5:1 E5:1.5 D5:.5 C5:1 D5:2 A4:1 C5:1 B4:1 A4:1 Bb4:1 D5:1 F5:1 G5:2 E5:1 C#5:1 E5:1 A5:1 D5:3', 74)
        s.line(FI, o+48, 'A4:.75 C5:.25 D5:1 E5:1 F5:1.5 G5:.5 E5:1 D5:1 C5:1 A4:1 C5:1.5 B4:.5 A4:1 D5:1 F5:1 A5:1 G5:2 E5:1 F5:1 E5:1 D5:1 D5:3', 72, leg=1.04)
        s.line(RC, o+60, 'r:1 A5:1 G5:1 F5:2 E5:1 r:3 r:3', 48)
    return s, 72

# ---------------- Taverne: flotter Jig in D ----------------
def taverne(loops=1):
    s = Song(168, 31)
    FI = s.ch(0, 110, 90, 56, 60); BJ = s.ch(1, 105, 70, 82, 40); AC = s.ch(2, 21, 64, 44, 50); SG = s.ch(3, 25, 70, 30, 40)
    BA = s.ch(4, 32, 80, 64, 20); RC = s.ch(5, 74, 64, 90, 60); D = s.ch(9, 0, 74, 64, 30, drum=True)
    A = 'F#4 A4 A4 D5 A4 F#4 G4 B4 B4 D5 B4 G4 F#4 A4 A4 D5 E5 F#5 E5 D5 C#5 B4 A4 G4 F#4 A4 A4 D5 A4 F#4 G4 B4 D5 G5 F#5 E5 D5 F#5 E5 D5 C#5 E5 D5 D5 D5 A4 B4 C#5'
    B = 'F#5 E5 F#5 A5 F#5 D5 G5 F#5 G5 B5 G5 D5 F#5 E5 F#5 A5 F#5 D5 E5 F#5 E5 C#5 B4 A4 B4 D5 F#5 B5 F#5 D5 G5 B5 G5 D5 B4 G4 A4 C#5 E5 A5 G5 E5 D5 D5 D5 D5 E5 F#5'
    pa = ['D', 'G', 'D', 'A', 'D', 'G', 'A', 'D']; pb = ['D', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D']
    for L in range(loops):
        o = L*96
        for part, (mel, prog) in enumerate(((A, pa), (A, pa), (B, pb), (B, pb))):
            t0 = o+part*24
            s.line(FI, t0, ' '.join(f'{n}:.5' for n in mel.split()), 90)
            if part in (1, 3): s.line(BJ, t0, ' '.join(f'{n}:.5' for n in mel.split()), 62)
            if part == 3: s.line(RC, t0, ' '.join(f'{n}:.5' for n in mel.split()), 52, oct=1)
            for b, c in enumerate(prog):
                t = t0+b*3; tn = tones(c)
                s.note(BA, t, 1.4, tn[0], 84); s.note(BA, t+1.5, 1.4, tn[1], 70)
                s.chord(SG, t+1, .4, ' '.join(tn[2:]), 56); s.chord(SG, t+2.5, .4, ' '.join(tn[2:]), 50)
                for n in tn[2:]: s.note(AC, t, 2.9, n, 44 if part < 2 else 54)
                for k in range(6): s.note(D, t+k*.5, .2, DR['lowtom'] if k in (0, 3) else DR['midtom'], 76 if k in (0, 3) else 44)
                s.note(D, t+1, .1, DR['claves'], 40); s.note(D, t+2.5, .1, DR['claves'], 40)
    return s, 96

# ---------------- Showdown: Spannung, Trompete, dann Schlacht-Reel ----------------
def showdown(loops=1):
    s = Song(138, 41)
    CE = s.ch(0, 42, 92, 50, 40); GT = s.ch(1, 27, 78, 30, 70, 30); CHO = s.ch(2, 52, 84, 64, 90); TP = s.ch(3, 56, 96, 76, 60)
    FI = s.ch(4, 110, 92, 56, 50); BP = s.ch(5, 109, 54, 70, 60); TI = s.ch(6, 47, 104, 64, 50); TK = s.ch(7, 116, 100, 64, 40)
    ST = s.ch(8, 48, 70, 64, 70); WH = s.ch(10, 78, 84, 84, 90); D = s.ch(9, 0, 90, 64, 30, drum=True); BA = s.ch(11, 33, 90, 64, 20)
    prog = ['Am', 'Am', 'F', 'E', 'Am', 'Am', 'F', 'E', 'Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E', 'Am', 'Am', 'G', 'G', 'F', 'G', 'E', 'E']
    for L in range(loops):
        o = L*96
        for b, c in enumerate(prog):
            t = o+b*4; tn = tones(c); r = midi(tn[0])
            for k in range(8): s.note(CE, t+k*.5, .42, r-12+(0 if k % 4 != 3 else 7), 92 if k % 2 == 0 else 74)
            s.note(BA, t, .9, r-12, 90); s.note(BA, t+1.5, .4, r-12, 70); s.note(BA, t+2, .9, r-12, 86); s.note(BA, t+3.5, .4, r-5, 72)
            s.note(TK, t, .5, 'C3', 104); s.note(TK, t+1.5, .5, 'C3', 86); s.note(TK, t+2.5, .3, 'C3', 70)
            s.note(D, t+1, .1, DR['rim'], 54); s.note(D, t+3, .1, DR['rim'], 60)
            if b < 8:
                riff = [0, 3, 5, 7, 10, 7, 5, 3]
                for k, iv in enumerate(riff): s.note(GT, t+k*.5, .45, r+iv, 74 if k == 0 else 62)
            if b >= 4:
                for n in tn[2:]: s.note(CHO, t, 4, n, 66 if b < 16 else 80)
            if b >= 8:
                for n in tn[1:4]: s.note(ST, t, 4, midi(n)+12, 60)
            if b >= 16:
                s.note(BP, t, 4, 'A3', 50); s.note(BP, t, 4, 'E4', 44)
                for k in range(8): s.note(D, t+k*.5, .2, DR['lowtom'] if k % 2 == 0 else DR['midtom'], 84 if k % 4 == 0 else 58)
            if b in (0, 8, 16): s.note(D, t, 3, DR['crash'], 96); s.note(TI, t, 1, 'A2', 120)
        s.line(WH, o+16, 'E5:.5 A5:3.5 G5:.5 E5:.5 D5:3', 90)
        s.line(TP, o+32, 'E4:.5 A4:.5 E5:3  D5:.5 E5:.5 F5:1 E5:1 D5:1  C5:.5 D5:.5 E5:3  B4:1 G#4:1 E4:2  A4:.5 C5:.5 E5:1 A5:2  G5:.5 F5:.5 E5:1 D5:1 C5:1  F5:1 E5:1 D5:1 C5:1  B4:2 E5:2', 100)
        reel = 'A4 B4 C5 A4 E5 A4 C5 A4 A4 B4 C5 D5 E5 G5 E5 D5 G4 A4 B4 G4 D5 G4 B4 G4 G4 A4 B4 C5 D5 E5 D5 B4 A4 C5 F5 C5 A5 F5 C5 A4 B4 D5 G5 D5 B5 G5 D5 B4 G#4 B4 E5 B4 G#5 E5 D5 B4 E5 D5 C5 B4 A4 G#4 A4 B4'
        s.line(FI, o+64, ' '.join(f'{n}:.5' for n in reel.split()), 92)
        s.line(WH, o+80, 'E5:1 G5:1 A5:2 B5:1 G5:1 E5:2', 70)
        for k in range(16): s.note(TI, o+92+k*.25, .2, 'E2', 60+k*3, hum=False)
    return s, 96

# ---------------- Kurze Stücke ----------------
def duell():
    s = Song(72, 51); WH = s.ch(0, 78, 110, 64, 100); GT = s.ch(1, 27, 90, 40, 90, 40); TI = s.ch(2, 47, 110, 64, 80); CHO = s.ch(3, 52, 80, 64, 100); D = s.ch(9, 0, 100, 64, 60, drum=True)
    s.line(WH, .25, 'A4:.25 D5:.25 A4:2.5', 110, leg=1.0)
    for k in range(24): s.note(GT, k*.125, .14, 'E2', 70 if k % 4 == 0 else 54, hum=False)
    s.note(GT, 3, 3, 'E2', 90); s.note(GT, 3, 3, 'B2', 80); s.note(TI, 0, 2, 'A2', 120); s.note(TI, 3, 2, 'E2', 110)
    for n in ('A3', 'E4', 'A4', 'C5'): s.note(CHO, 2.8, 3.2, n, 70)
    s.note(D, 0, 3, DR['crash'], 90)
    return s, 6
def sieg():
    s = Song(112, 61); TP = s.ch(0, 56, 110, 70, 80); CHO = s.ch(1, 52, 90, 64, 100); TI = s.ch(2, 47, 110, 64, 70); FI = s.ch(3, 110, 90, 50, 70); ST = s.ch(4, 48, 84, 64, 80); D = s.ch(9, 0, 100, 64, 60, drum=True)
    s.line(TP, 0, 'A4:.333 C#5:.333 E5:.333 A5:1.5 G#5:.25 A5:.25 B5:.5 C#6:3', 110)
    s.line(TP, 0, 'E4:.333 A4:.333 C#5:.333 E5:1.5 r:.5 E5:.5 E5:3', 92)
    s.line(FI, 0, ' '.join(f'{n}:.125' for n in 'A4 B4 C#5 D5 E5 F#5 G#5 A5'.split())+' r:1 E5:.25 F#5:.25 G#5:.25 A5:3', 80)
    for k in range(12): s.note(TI, k*.125, .12, 'E2', 60+k*5, hum=False)
    s.note(TI, 1.5, 2, 'A2', 124); s.note(TI, 3, 3, 'A2', 120)
    for n in ('A3', 'C#4', 'E4', 'A4'): s.note(CHO, 1.5, 4.5, n, 86); s.note(ST, 1.5, 4.5, n, 74)
    s.note(D, 1.5, 3, DR['crash'], 110); s.note(D, 3, 3, DR['crash'], 100)
    return s, 7
def niederlage():
    s = Song(60, 71); HM = s.ch(0, 22, 100, 70, 80); CE = s.ch(1, 42, 90, 50, 80); ST = s.ch(2, 48, 70, 64, 90); TI = s.ch(3, 47, 100, 64, 80); GT = s.ch(4, 27, 70, 40, 90)
    s.line(HM, 0, 'E5:1 D5:.5 C5:.5 B4:1 A4:.5 G#4:.5 A4:3', 96)
    for n in ('A2', 'E3'): s.note(CE, 0, 6, n, 84)
    for n in ('A3', 'C4', 'E4'): s.note(ST, 2, 4.5, n, 60)
    s.note(TI, 0, 2, 'A1', 110); s.note(GT, 3.5, 3, 'A2', 70); s.note(GT, 3.5, 3, 'E3', 60)
    return s, 7
def spielsieg():
    s, _ = sieg(); s.bpm = 96
    WH = s.ch(5, 78, 100, 84, 100); BA = s.ch(6, 32, 90, 64, 30)
    s.line(WH, 6, 'C#5:.5 E5:.5 A5:3  B5:.5 A5:.5 G#5:1 F#5:1 E5:1  F#5:1 G#5:1 A5:4', 100)
    for b, c in enumerate(['A', 'D', 'E', 'A']):
        for n in tones(c)[1:]: s.note(4, 6+b*3, 3, n, 70)
        s.note(BA, 6+b*3, 3, tones(c)[0], 90)
    s.note(2, 17, 3, 'A2', 124); s.note(9, 17, 4, DR['crash'], 110)
    return s, 21
def spielende():
    s = Song(70, 81); WH = s.ch(0, 78, 90, 64, 100); GT = s.ch(1, 27, 70, 40, 90, 30); CE = s.ch(2, 42, 84, 50, 80); CHO = s.ch(3, 52, 64, 64, 100); TI = s.ch(4, 47, 100, 64, 80)
    s.line(WH, 0, 'E4:.5 A4:.5 E5:3 D5:.5 C5:.5 B4:1 G4:1 E4:1 A4:6', 88)
    for k, c in enumerate(['Am', 'G', 'F', 'E', 'Am']): arp16(s, GT, k*2.4, c, 2.4, 50)
    for n in ('A2', 'E3'): s.note(CE, 0, 12, n, 70)
    for n in ('A3', 'C4', 'E4'): s.note(CHO, 6, 7, n, 56)
    s.note(TI, 12, 3, 'A1', 110)
    return s, 15
def nacht():
    s = Song(100, 91); RC = s.ch(0, 74, 90, 64, 90); HP = s.ch(1, 46, 80, 50, 90); D = s.ch(9, 0, 90, 64, 60, drum=True)
    s.line(RC, 0, 'D5:.5 F5:.5 A5:1.5 G5:.5 A5:2', 84)
    for k, n in enumerate('D3 A3 D4 F4 A4 D5'.split()): s.note(HP, k*.2, 3, n, 64)
    s.note(D, 0, .3, DR['lowtom'], 100); s.note(D, .5, .3, DR['lowtom'], 70); s.note(D, 1, .3, DR['lowtom'], 90)
    return s, 5

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for name, fn in [('titel', titel), ('tisch', tisch), ('taverne', taverne), ('showdown', showdown)]:
        s, L = fn(3); s.save(f'{out}/{name}.mid'); open(f'{out}/{name}.loop', 'w').write(f'{L} {s.bpm}')
    for name, fn in [('duell', duell), ('sieg', sieg), ('niederlage', niederlage), ('spielsieg', spielsieg), ('spielende', spielende), ('nacht', nacht)]:
        s, L = fn(); s.save(f'{out}/{name}.mid'); open(f'{out}/{name}.len', 'w').write(f'{L} {s.bpm}')
    print('ok')
