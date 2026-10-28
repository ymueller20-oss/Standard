"""Schneidet den 15-Sekunden-Werbeclip aus den Spielaufnahmen (frames/) und mischt Musik und Geräusche aus dem Spiel."""
import os, shutil, subprocess as sp, tl
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
A = '/home/user/kk/audio'; FPS = 30
T = tl.timeline()
# (Abschnitt, Start, Ende in Spielzeit, Tempo, Text oben)
SHOTS = [('tisch', .4, 2.2, 1.0, 'Poker um Gold.'),
         ('wende', 0, 1.3, 1.0, 'Vier Drachen.'),
         ('team', 0, 1.2, 1.0, 'Dein Blatt wird zur Armee.'),
         ('schlacht', .6, 2.2, 1.0, ''),
         ('schlacht', 5.6, 6.8, 1.0, 'Der Showdown ist eine Schlacht.'),
         ('schlacht', 9.8, 11.3, 1.25, ''),
         ('schlacht', 17.6, 21.24, 1.3, ''),
         ('schlacht', 21.8, 24.0, 1.1, ''),
         ('titel', .3, 2.2, 1.0, 'END')]
if os.path.exists('seq'): shutil.rmtree('seq')
os.makedirs('seq'); n = 0; cuts = []
for seg, a, b, sp_, txt in SHOTS:
    dur = (b-a)/sp_; k = int(round(dur*FPS)); cuts.append((n/FPS, (n+k)/FPS, txt))
    for i in range(k):
        os.symlink(os.path.abspath('frames/'+tl.at(T[seg], a+i/FPS*sp_)), f'seq/{n:05d}.jpg'); n += 1
print('Bilder', n, 'Länge', n/FPS, [(round(x, 2), round(y, 2)) for x, y, _ in cuts])
F = HERE+'/fonts'
def esc(t): return t.replace(':', r'\:').replace("'", r"\'")
vf = []
for x, y, txt in cuts:
    if not txt: continue
    if txt == 'END':
        vf += [f"drawbox=x=0:y=1380:w=1080:h=540:color=black@0.72:t=fill:enable='between(t,{x},{y})'",
               f"drawtext=fontfile={F}/GrenzeGotisch-latin.ttf:text='Poker trifft Kartenschlacht':fontsize=86:fontcolor=0xffd76a:borderw=5:bordercolor=black:x=(w-text_w)/2:y=1460:enable='between(t,{x},{y})'",
               f"drawtext=fontfile={F}/IMFellEnglishSC-latin.ttf:text='Bald für Android':fontsize=72:fontcolor=0xf6e7c4:borderw=4:bordercolor=black:x=(w-text_w)/2:y=1620:enable='between(t,{x+.25},{y})'",
               f"drawtext=fontfile={F}/IMFellEnglishi-latin.ttf:text='Echte Spielszenen':fontsize=40:fontcolor=0xcbb48a:x=(w-text_w)/2:y=1790:enable='between(t,{x+.25},{y})'"]
    else:
        fs = 118 if len(txt) < 16 else 92 if len(txt) < 28 else 78
        vf += [f"drawbox=x=0:y=110:w=1080:h=230:color=black@0.62:t=fill:enable='between(t,{x},{y})'",
               f"drawtext=fontfile={F}/GrenzeGotisch-latin.ttf:text='{esc(txt)}':fontsize={fs}:fontcolor=0xffd76a:borderw=6:bordercolor=black:shadowx=0:shadowy=4:shadowcolor=black@0.8:x=(w-text_w)/2:y=225-text_h/2:enable='between(t,{x},{y})'"]
L = n/FPS
vf += [f"fade=t=in:st=0:d=0.15", f"fade=t=out:st={L-.35}:d=0.35"]
# Ton: Titelthema, ab dem Duell Showdown-Musik, Siegesfanfare; Geräusche an den Schnittpunkten
c = {k: v[0] for k, v in zip(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], cuts)}
def g(seg, t, sp_, out0, a): return out0+(t-a)/sp_
sfx = [('sfx/karte1', .55, .8), ('sfx/karte2', .7, .8), ('sfx/karte3', .85, .8), ('sfx/karte4', c['B']+.1, .9), ('sfx/roehrenglocke', c['C']+.05, .5),
       ('sfx/schwert1', c['D'], .8), ('sfx/pauke', c['D']+.4, 1), ('sfx/taiko', c['E']+.05, 1), ('sfx/schwell', c['F'], .7), ('sfx/taiko', c['F']+.5, .8),
       ('sfx/schlag1', g('s', 18.5, 1.3, c['G'], 17.6), 1), ('sfx/metall1', g('s', 18.5, 1.3, c['G'], 17.6), .6), ('sfx/schlag2', g('s', 18.95, 1.3, c['G'], 17.6), 1),
       ('sfx/schlag3', g('s', 19.4, 1.3, c['G'], 17.6), 1), ('sfx/metall2', g('s', 19.8, 1.3, c['G'], 17.6), .7), ('sfx/orchester', g('s', 20.3, 1.3, c['G'], 17.6), 1),
       ('sfx/muenzen1', c['H']+.35, .9), ('sfx/pot1', c['H']+.55, .9)]
ins = ['-i', f'{A}/musik/titel.mp3', '-i', f'{A}/musik/duell.mp3', '-i', f'{A}/musik/showdown.mp3', '-i', f'{A}/musik/sieg.mp3']
fc = [f"[1]atrim=0:{c['D']+.3},afade=t=out:st={c['D']-.1}:d=0.4,volume=0.9[m0]",
      f"[2]adelay={int(c['D']*1000)}|{int(c['D']*1000)},volume=1.0[m1]",
      f"[3]atrim=0:{c['H']-c['D']+.4},afade=t=in:st=0:d=0.6,afade=t=out:st={c['H']-c['D']-.2}:d=0.6,adelay={int((c['D']+.6)*1000)}|{int((c['D']+.6)*1000)},volume=0.85[m2]",
      f"[4]adelay={int((c['H']-.15)*1000)}|{int((c['H']-.15)*1000)},volume=1.0[m3]"]
lab = ['[m0]', '[m1]', '[m2]', '[m3]']
for i, (f, t, v) in enumerate(sfx):
    ins += ['-i', f'{A}/{f}.mp3']; j = 5+i
    fc.append(f"[{j}]adelay={int(t*1000)}|{int(t*1000)},volume={v}[s{i}]"); lab.append(f'[s{i}]')
fc.append(''.join(lab)+f"amix=inputs={len(lab)}:normalize=0,alimiter=limit=0.89,afade=t=out:st={L-.5}:d=0.5,atrim=0:{L}[aout]")
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', 'seq/%05d.jpg', *ins, '-filter_complex', ';'.join(fc), '-vf', ','.join(vf),
       '-map', '0:v', '-map', '[aout]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', str(FPS),
       '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', 'krug-und-krone-15s.mp4']
r = sp.run(cmd, capture_output=True, text=True); print(r.stderr[-1500:] or 'ok')
