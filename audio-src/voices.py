"""Krug & Krone – Sprachaufnahmen. Piper-Stimmen (Thorsten und Kerstin, beide CC0) plus Nachbearbeitung mit sox je Figur.
Aufruf: python3 voices.py <modell-ordner> <arbeitsordner> <ziel-ordner>  → MP3s und stimmen.json (id → Text, Dauer)."""
import json, os, re, sys, wave, subprocess as sp
from piper import PiperVoice
from piper.config import SynthesisConfig
MD, WK, DST = sys.argv[1:4]; os.makedirs(WK, exist_ok=True); os.makedirs(DST, exist_ok=True)
V = {k: PiperVoice.load(f'{MD}/{f}.onnx') for k, f in dict(th='de_DE-thorsten-high', emo='de_DE-thorsten_emotional-medium', ke='de_DE-kerstin-low').items()}
EMO = {'amused': 0, 'angry': 1, 'drunk': 3, 'neutral': 4, 'surprised': 6, 'whisper': 7}
# Figuren: Stimme, Sprecher, Tempo, Klangkette (sox)
CAST = {
  'wirt':     dict(v='th', ls=1.08, fx='pitch -170 bass +4 110 treble -2 reverb 22 50 60'),
  'wirt_laut':dict(v='emo', sp='surprised', ls=1.0, fx='pitch -200 bass +4 110 reverb 30 50 70'),
  'erzaehler':dict(v='th', ls=1.2, ns=.5, fx='pitch -330 bass +5 100 treble -3 reverb 65 40 100 echo 0.8 0.7 60 0.15'),
  'vargo':    dict(v='emo', sp='angry', ls=1.0, fx='pitch -260 overdrive 5 bass +3 140 reverb 18 50 50'),
  'grauweid': dict(v='ke', ls=1.15, fx='pitch -230 tremolo 5.5 15 treble +3 reverb 50 50 80 echo 0.8 0.6 90 0.18'),
  'ysa':      dict(v='emo', sp='whisper', ls=1.05, fx='pitch +380 highpass 200 treble +2 reverb 15 30 30'),
  'anselm':   dict(v='th', ls=1.22, fx='pitch -480 bass +3 120 reverb 85 30 100 echo 0.8 0.6 140 0.2'),
  'kalla':    dict(v='ke', ls=0.92, fx='pitch -110 overdrive 3 treble +3 bass +2 160 reverb 22 50 60'),
}
def synth(text, c, out):
    voice = V[c['v']]; sid = c.get('sp'); sid = EMO.get(sid, sid) if isinstance(sid, str) else sid
    cfg = SynthesisConfig(speaker_id=sid, length_scale=c.get('ls', 1.0), noise_scale=c.get('ns', .6), noise_w_scale=.8)
    with wave.open(out, 'wb') as w: voice.synthesize_wav(text, w, syn_config=cfg)
def sox(*a): sp.run(['sox', *a], check=True, capture_output=True)
def finish(src, fx, out):
    sox(src, '-r', '44100', f'{WK}/u.wav', 'pad', '0', '0.6', *fx.split(), 'channels', '1')
    sox(f'{WK}/u.wav', f'{WK}/v.wav', 'silence', '1', '0.02', '0.3%', 'reverse', 'silence', '1', '0.05', '0.3%', 'reverse')
    sox(f'{WK}/v.wav', f'{WK}/t.wav', 'compand', '0.01,0.2', '-60,-60,-30,-16,-10,-6,0,-3', '-3', '0', '0.01', 'gain', '-n', '-1.5', 'reverse', 'fade', '0.08', 'reverse', 'fade', '0.01')
    sp.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{WK}/t.wav', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k', out], check=True)
    return float(sp.run(['soxi', '-D', f'{WK}/t.wav'], capture_output=True, text=True).stdout)
L = []
def say(id, who, text): L.append((id, who, text))
# Wirt: Ansagen
say('willkommen', 'wirt', 'Willkommen im Krug und Krone. Setz dich, Fremder. Heute Nacht wird um Gold gespielt.')
ZAHL = ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf']
for i, z in enumerate(ZAHL): say(f'nacht{i+1}', 'wirt', f'Nacht {z}.')
say('letzte', 'wirt', 'Die letzte Nacht. Alles oder nichts.')
say('flop', 'wirt', 'Der Flop.'); say('opfer', 'wirt', 'Zeit für ein Opfer.'); say('wende', 'wirt', 'Die Wende.')
say('showdown', 'wirt_laut', 'Showdown!'); say('kampf', 'wirt_laut', 'Zu den Waffen!')
for i, z in enumerate(['Erste', 'Zweite', 'Dritte', 'Vierte', 'Fünfte', 'Sechste', 'Siebte', 'Achte']): say(f'runde{i+1}', 'wirt', f'{z} Runde!')
say('sieg', 'wirt_laut', 'Sieg!'); say('niederlage', 'wirt', 'Niederlage.'); say('patt', 'wirt', 'Patt. Keiner weicht.')
say('pot', 'wirt', 'Der Pot gehört dir.'); say('krone', 'wirt_laut', 'Die Krone ist dein!'); say('aus', 'wirt', 'Ausgenommen. Komm wieder, wenn du Gold hast.')
say('taverne', 'wirt', 'Die Schmiede hat geöffnet. Gold wird hier zu Macht.'); say('thron', 'wirt', 'Vorsicht. Dein Thron wankt.')
say('allin', 'wirt_laut', 'Alles auf eine Karte!'); say('zeitlupe', 'erzaehler', 'Jetzt entscheidet es sich.')
# Lehrstunde: Texte direkt aus game.js
G = open(os.path.join(os.path.dirname(__file__), '..', 'game.js'), encoding='utf8').read()
for k, title, text in re.findall(r"\n  (\w+):\[(?:'[^']*'|null),'([^']*)','([^']*)'\]", G[G.index('const TIPS='):G.index('function tutDone')]):
    say('tut_'+k, 'wirt', text.replace('–', ',').replace('»', '').replace('«', ''))
# Erzähler: die Sprüche der Kreaturen
FLAV = dict(re.findall(r"(\d+):'([^']*)'", G[G.index('const FLAV='):G.index('\n', G.index('const FLAV='))]))
for r, t in FLAV.items(): say(f'karte{r}', 'erzaehler', t)
# Gegner: Sprüche aus OPP, dazu ein Satz für den Gegen-Bildschirm
VS = {'Vargo': 'Ich zähl schon mal dein Gold.', 'Grauweid': 'Die Krähen haben deinen Namen gerufen.', 'Ysa': 'Leise jetzt.', 'Anselm': 'Möge das Licht dir gnädig sein.', 'Kalla': 'Ich schmiede dich in Form.'}
WHO = {'Vargo': 'vargo', 'Grauweid': 'grauweid', 'Ysa': 'ysa', 'Anselm': 'anselm', 'Kalla': 'kalla'}
opp = G[G.index('const OPP=['):G.index('const RANKS')]
for blk in re.findall(r"short:'(\w+)'.*?q:\{(.*?)\}\}", opp, re.S):
    short, q = blk; who = WHO[short]; say(f'{who}_vs', who, VS[short])
    for kind, arr in re.findall(r"(\w+):\[([^\]]*)\]", q):
        for i, t in enumerate(re.findall(r"'([^']*)'", arr)):
            if t.strip('. '): say(f'{who}_{kind}{i}', who, t)
J = {}
for id, who, text in L:
    c = CAST[who]; synth(text, c, f'{WK}/{id}.wav'); d = finish(f'{WK}/{id}.wav', c['fx'], f'{DST}/{id}.mp3'); J[id] = dict(t=text, d=round(d, 2), w=who)
# Kriegsrufe: drei Stimmen übereinander, wie ein Heer
RUF = ['Für das letzte Licht!', 'Asche zu Asche!', 'Der Winter holt euch alle!', 'Blut für das Moor!']
for i, t in enumerate(RUF):
    parts = []
    for k, (pt, dl) in enumerate([(-150, 0), (-380, .035), (-620, .07), (-60, .05)]):
        synth(t, dict(v='emo', sp='angry', ls=1.05+k*.03), f'{WK}/r{k}.wav'); sox(f'{WK}/r{k}.wav', '-r', '44100', f'{WK}/rp{k}.wav', 'pitch', str(pt), 'pad', str(dl), '0'); parts.append(f'{WK}/rp{k}.wav')
    sox('-m', *parts, f'{WK}/ruf.wav'); d = finish(f'{WK}/ruf.wav', 'overdrive 4 bass +4 120 reverb 70 50 100', f'{DST}/ruf{i}.mp3'); J[f'ruf{i}'] = dict(t=t, d=round(d, 2), w='heer')
# Kreaturenlaute aus der menschlichen Stimme, tief gepitcht und angezerrt
for id, t, pt, fx in [('brull', 'Rrrooaaaaaaarrrhh!', -1100, 'overdrive 14 lowpass 2600 bass +6 90 reverb 70 50 100'),
                      ('grollen', 'Grrrrrraaaaah!', -800, 'overdrive 10 lowpass 3000 bass +5 100 reverb 45 50 80'),
                      ('schrei', 'Kraaaah!', 500, 'overdrive 6 highpass 400 reverb 50 50 90 echo 0.8 0.6 120 0.25'),
                      ('fauchen', 'Hhhhssssshhh!', -300, 'highpass 800 reverb 30 50 60')]:
    synth(t, dict(v='emo', sp='angry', ls=1.3), f'{WK}/{id}.wav'); sox(f'{WK}/{id}.wav', '-r', '44100', f'{WK}/{id}p.wav', 'pitch', str(pt))
    d = finish(f'{WK}/{id}p.wav', fx, f'{DST}/{id}.mp3'); J[id] = dict(t='', d=round(d, 2), w='kreatur')
json.dump(J, open(f'{DST}/stimmen.json', 'w'), ensure_ascii=False, indent=0)
print(len(J), 'Aufnahmen')
