"""Baut audio/index.json neu aus den Ordnern: Musik-Schleifenlängen (musik/*.txt, von render_music.py), Geräusch-Varianten, Stimmen (stimmen/stimmen.json von voices.py).
Kreaturenlaute (brull, grollen, schrei, fauchen) erzeugt voices.py, sie gehören aber zu den Geräuschen: dieses Skript verschiebt sie."""
import json, os, re, glob, shutil
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'audio'))
old = json.load(open('index.json')) if os.path.exists('index.json') else {'musik': {}, 'stimmen': {}}
for f in ('brull', 'grollen', 'schrei', 'fauchen'):
    if os.path.exists(f'stimmen/{f}.mp3'): shutil.move(f'stimmen/{f}.mp3', f'sfx/{f}.mp3')
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
st = old['stimmen']
if os.path.exists('stimmen/stimmen.json'):
    st = {k: [x['t'], x['d']] for k, x in json.load(open('stimmen/stimmen.json')).items() if x['w'] != 'kreatur'}; os.remove('stimmen/stimmen.json')
json.dump(dict(musik=m, sfx=sfx, stimmen=st), open('index.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(m), 'Musik', len(sfx), 'Geräusche', len(st), 'Stimmen')
