"""Baut audio/index.json neu: Musik-Schleifenlängen (musik/*.txt von render_music.py) und Geräusch-Varianten."""
import json, os, re, glob
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'audio'))
old = json.load(open('index.json')) if os.path.exists('index.json') else {'musik': {}}
m = {}
for f in glob.glob('musik/*.mp3'):
    n = os.path.basename(f)[:-4]; t = f'musik/{n}.txt'
    m[n] = float(open(t).read()) if os.path.exists(t) else old['musik'].get(n, 0)
    if os.path.exists(t): os.remove(t)
sfx = {}
for f in sorted(os.listdir('sfx')):
    n = f[:-4]; b = re.sub(r'\d+$', '', n)
    if b != n: sfx[b] = sfx.get(b, 0)+1
    else: sfx[n] = 0
json.dump(dict(musik=m, sfx=sfx), open('index.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(m), 'Musik', len(sfx), 'Geräusche')
