"""The 2-minute cut: beat-quantised edit decision list -> timeline.json + audio mix.

usage: edit.py <scratch>   (expects scratch/src, scratch/music, scratch/sfx, scratch/voices, scratch/assets)
Outputs scratch/v2/{timeline.json, mix.wav, frames/<shot>/*.jpg}
"""
import hashlib, json, math, os, re, subprocess, sys, wave
import numpy as np

SCR = sys.argv[1]
OUT = os.path.join(SCR, "v2")
FR = os.path.join(OUT, "frames")
os.makedirs(FR, exist_ok=True)
SRC = os.path.join(SCR, "src")
ASSETS = os.path.join(SCR, "assets")
SR = 48000
FPS = 25
BEAT, OFF = 0.5, 0.3146          # Hustle (Kevin MacLeod) at 120 BPM
MUSIC = os.path.join(SCR, "music", "Hustle.mp3")


def beat_at(k):
    return OFF + k * BEAT


def snap(t, eps=0.06):
    """First beat at or after t (tolerating eps of overshoot)."""
    k = math.ceil((t - OFF - eps) / BEAT)
    return beat_at(max(k, 0))


# ---------------------------------------------------------------- shots
def S(src, at, cy=0.32, layout="full", **fx):
    return {"src": "ig_" + src + ".mp4", "at": at, "cy": cy, "layout": layout, "fx": fx}

# stage talk / office talk / outdoor senate / family / gym / vlog / craftsman
STAGE = [S("Dej5DVIuApa", 4.0, .30), S("Dej5DVIuApa", 32.0, .30), S("Dej5DVIuApa", 50.0, .29), S("Dej5DVIuApa", 56.0, .30)]
TALK = [S("DerRZgEMHxO", 6.2, .30), S("DerRZgEMHxO", 21.0, .30), S("DerRZgEMHxO", 47.0, .30), S("DerRZgEMHxO", 60.0, .30)]
CROWD = [S("DerRZgEMHxO", 13.75, .38, span=1.4), S("DerRZgEMHxO", 19.0, .46, span=1.45), S("DerRZgEMHxO", 19.25, .44, span=1.2), S("DerRZgEMHxO", 19.5, .45, span=0.95), S("DerRZgEMHxO", 13.9, .38, span=1.25)]
CRAFT = [S("DerRZgEMHxO", 39.25, .48, span=1.5), S("DerRZgEMHxO", 39.5, .42, span=1.25)]
SENAT = [S("DerzEfquEpP", 20.0, .37), S("DerzEfquEpP", 40.0, .37), S("DerzEfquEpP", 64.0, .37)]
CERT = S("DerzEfquEpP", 8.0, .45)
PLAQUE = S("De6xJOeuT8g", 0.6, .55)
PLATE = S("De6xJOeuT8g", 33.4, .66)
CAP = S("De6xJOeuT8g", 16.4, .42)
GYM = [S("DetSFfbOdpF", 5.0, .45), S("DetSFfbOdpF", 22.0, .45), S("DetSFfbOdpF", 40.0, .45)]
FAMILY = [S("Dew3vNxudcE", t, cy) for t, cy in [(1.0, .45), (12.9, .45), (14.0, .45), (31.6, .45), (37.6, .4), (43.3, .45), (45.4, .45), (51.8, .5), (56.0, .45), (64.0, .4)]]
UMSETZER = S("Dev9szIubYA", 10.0, layout="card")


# ---------------------------------------------------------------- the edit
def stamp(text, line=0, beats=2, **kw):
    return dict(type="stamp", text=text, line=line, beats=beats, **kw)


EDIT = [
    # ---- cold open: his strongest line, then a beat-cut montage of numbers
    {"bite": ("Dej5DVIuApa", 0.0, 2.85), "shot": S("Dej5DVIuApa", 0.0, .30, punch=[1.95]), "lower": "Matthias Aumann · @matthiasaumann"},
    {"montage": [
        (CROWD[1], stamp("67.700", sub="Follower", size=230, shake=True)),
        (STAGE[0], stamp("9 Mio.", sub="Views", size=230, shake=True)),
        (CRAFT[0], stamp("6.000+", sub="Betriebe", size=230, shake=True)),
        (PLATE, stamp("1 Gärtner", sub="aus Cloppenburg", size=200, shake=True, style="boxed")),
    ], "beats": 2, "riserInto": True},
    {"title": True, "shots": [GYM[0]], "beats": 6},

    # ---- set-up
    {"lines": [("Gärtner aus *Cloppenburg*.", None), ("Kein Studium. Kein *Anzug*.", None),
               ("Und trotzdem rennen ihm die *Kunden* die Bude ein.", None), ("Wie? *Sechs* Schritte.", None)],
     "shots": [PLATE, TALK[0], STAGE[1], CROWD[0], CROWD[2], TALK[3], GYM[1]], "cut": 2,
     "ov": [stamp("Kein Studium", line=1, beats=1, size=120, pos=dict(x=960, y=330), rot=-6, style="outline"),
            stamp("Kein Anzug", line=1, dbeat=1.0, beats=2, size=120, pos=dict(x=960, y=470), rot=4, style="boxed")]},

    {"montage": [
        (GYM[2], stamp("6 Schritte", size=200, shake=True)),
        (CROWD[3], stamp("2 Minuten", size=200, shake=True, style="outline")),
        (STAGE[3], stamp("Los.", size=260, shake=True, style="boxed")),
        (GYM[1], None),
    ], "beats": 2},

    # ---- 01
    {"step": (1, "Herkunft als [Beweis]"), "shots": [CRAFT[0]]},
    {"lines": [("*2012*: ein Transporter.", None), ("Heute: über *200* Mitarbeiter.", None),
               ("Er verkauft keine Theorie. Er zeigt seinen *Betrieb*.", None)],
     "shots": [CRAFT[1], CROWD[3], CROWD[4], CROWD[1], TALK[1], CROWD[2]], "cut": 2,
     "ov": [dict(type="counter", line=0, until=0, value=2012, frm=1990, fmt="year", label="ein Transporter", pos=dict(x=960, y=380)),
            dict(type="counter", line=1, until=1, value=200, frm=0, suffix="+", label="Mitarbeiter*", pos=dict(x=960, y=380))]},
    {"bite": ("DerRZgEMHxO", 30.15, 33.72), "shot": S("DerRZgEMHxO", 30.15, .30, punch=[31.0])},

    # ---- 02
    {"step": (2, "Aufreger, die [filtern]"), "shots": [STAGE[2]]},
    {"bite": ("DerRZgEMHxO", 0.0, 3.40), "shot": S("DerRZgEMHxO", 0.0, .30, punch=[2.5])},
    {"lines": [("Seine Hooks tun *weh*.", None), ("„Die meisten Unternehmer sind viel zu *weich*.“", None), ("Fast eine *Million* Aufrufe.", None)],
     "shots": [S("Dej5DVIuApa", 32.0, .30, layout="blur"), S("Dej5DVIuApa", 50.0, .30, layout="blur")], "cut": 2,
     "shotLines": True,
     "ov": [dict(type="card", line=1, src="assets/yt_5bneZLj7qi4_c.jpg", w=480, h=600, tilt=-5, pos=dict(x=960, y=460),
                 label="YouTube Short", badge=dict(value=968596, fmt="dots", label="AUFRUFE", at=1.2))]},
    {"lines": [("Aufreger holen bis zu *dreimal* so viele Likes wie Tipps.", None)],
     "shots": [TALK[2], STAGE[3]], "cut": 2, "capY": 860,
     "ov": [dict(type="bars", line=0, title="Likes pro 1.000 Aufrufe · Instagram", max=20, pos=dict(x=960, y=420),
                 items=[dict(label="Aufreger", display="14–18", value=18.4, accent=True), dict(label="Tipps", display="3–10", value=9.6)])]},
    {"lines": [("Aber nie über *Politik*.", None), ("Immer über die Fehler seiner *Kunden*.", None), ("Wer sich ertappt fühlt, ist *Unternehmer*.", None)],
     "shots": [STAGE[0], TALK[1], STAGE[2], TALK[3], CROWD[0]], "cut": 2,
     "ov": [stamp("Politik ✕", line=0, beats=2, size=150, pos=dict(x=960, y=380), style="outline", rot=-5),
            stamp("Du bist gemeint", line=1, dbeat=1.0, beats=3, size=140, pos=dict(x=960, y=380), style="boxed", shake=True)]},

    # ---- 03
    {"step": (3, "Wir statt [Zielgruppe]"), "shots": [CROWD[2]]},
    {"bite": ("Dej5DVIuApa", 41.85, 44.55), "shot": S("Dej5DVIuApa", 41.85, .30, punch=[43.7])},
    {"lines": [("Er gibt Unternehmern eine *Identität*.", None), ("Und sein stärkstes Reel? Die *Familie*.", None)],
     "shots": [CROWD[1], CROWD[3]] + FAMILY[:6], "cut": 1,
     "ov": [dict(type="counter", line=1, dbeat=1.5, beats=5, value=27.0, frm=0, fmt="dec1", label="Likes pro 1.000 Aufrufe", pos=dict(x=960, y=380))]},
    {"montage": [(f, None) for f in FAMILY[6:10]], "beats": 1},

    # ---- 04
    {"step": (4, "Geliehene [Bühnen]"), "shots": [STAGE[1]]},
    {"lines": [("Grupp.", 2), ("Dümmel.", 2), ("Hopf.", 2)],
     "shots": [S("Dej5DVIuApa", 55.0, .3, layout="blur")], "cut": 8, "noCaps": True,
     "ov": [dict(type="card", line=0, src="assets/yt_WQgCsmlzw3k.jpg", w=720, h=405, tilt=-6, pos=dict(x=520, y=300), label="Wolfgang Grupp"),
            dict(type="card", line=1, src="assets/yt_Q-uYtW-o5b0.jpg", w=720, h=405, tilt=4, pos=dict(x=1380, y=470), label="Ralf Dümmel"),
            dict(type="card", line=2, src="assets/yt_7hYRo7QtOsI.jpg", w=720, h=405, tilt=-3, pos=dict(x=700, y=760), label="Philip Hopf")]},
    {"lines": [("Imagefilm: *0,02* Prozent Likes.", None), ("Echtes Gespräch: *3,4*.", None)],
     "shots": [TALK[0], STAGE[3]], "cut": 2, "capY": 880,
     "ov": [dict(type="compare", line=0, pos=dict(x=960, y=430), items=[
         dict(k="Imagefilm", value=0.02, fmt="pct2", d="1,55 Mio. Views · 298 Likes", at=0.0),
         dict(k="Talk mit Hopf", value=3.4, fmt="pct1", d="124k Views · 4.172 Likes", hot=True, atLine=1)])]},
    {"lines": [("Und dann das Siegel von *ganz oben*:", None)], "shots": [PLAQUE, CERT], "cut": 2},
    {"bite": ("DerzEfquEpP", 11.76, 14.80), "shot": S("DerzEfquEpP", 11.76, .37, punch=[13.2])},
    {"bite": ("DerzEfquEpP", 15.15, 20.05), "shot": S("DerzEfquEpP", 15.15, .37, punch=[16.2]),
     "ov": [stamp("~350", sub="Mitglieder · bundesweit", size=220, pos=dict(x=960, y=360), shake=True)]},

    # ---- 05
    {"step": (5, "Beweise in [Serie]"), "shots": [CROWD[4]]},
    {"lines": [("*6.000* Betriebe.", None), ("*700* Bewertungen.", None), ("Jede Woche ein *Umsetzer* der Woche.", None)],
     "shots": [CROWD[0], CROWD[3], UMSETZER], "shotLines": True,
     "ov": [stamp("6.000+", line=0, beats=2, size=260, shake=True, sub="Betriebe"),
            stamp("700+", line=1, beats=2, size=260, shake=True, sub="Bewertungen")]},
    {"bite": ("DerzEfquEpP", 87.30, 92.40), "shot": S("DerzEfquEpP", 87.30, .37, punch=[90.3])},

    # ---- 06
    {"step": (6, "Ein Ziel: das [Gespräch]"), "shots": [TALK[2]]},
    {"lines": [("Jeder Kanal endet bei *einem* Knopf:", None), ("*Erstgespräch* buchen.", None)],
     "shots": [S("DerRZgEMHxO", 50.0, .3, layout="blur")], "cut": 16, "noCaps": True,
     "ov": [dict(type="browser", line=0, src="assets/web_ms_home.png", url="mission-mittelstand.de", pos=dict(x=960, y=520), scroll=0,
                 cursor=dict(**{"from": [900, 620], "to": [200, 450]}, t0=0.6, t1=1.5, click=1.7))]},
    {"lines": [("Und der Kunde kauft *nicht*.", None), ("Er *bewirbt* sich.", None)],
     "shots": [CRAFT[1], CRAFT[0]], "shotLines": True,
     "ov": [stamp("Bewerben.", line=1, beats=3, size=230, style="boxed", shake=True)]},

    # ---- recap: one step per two beats
    {"lines": [("Herkunft.", 2), ("Aufreger.", 2), ("Wir.", 2), ("Bühnen.", 2), ("Beweise.", 2), ("Gespräch.", 2)],
     "shots": [CRAFT[0], STAGE[0], FAMILY[3], CERT, CROWD[1], S("DerRZgEMHxO", 6.5, .30)], "shotLines": True, "noCaps": True, "recap": True},
    {"lines": [("Das ist kein *Zufall*.", None), ("Das ist ein *System*.", None), ("Und du kannst es *kopieren*.", None)],
     "shots": [GYM[0], CROWD[2], STAGE[2], FAMILY[5], SENAT[0], CROWD[4]], "cut": 1},
    {"bite": ("DerzEfquEpP", 119.80, 120.95), "shot": S("DerzEfquEpP", 119.80, .37, punch=[120.5])},
    {"end": True, "shots": [S("DerzEfquEpP", 121.5, .37, bw=True)], "beats": 14},
]

RESPELL = {"YouTube": "Juhtjub", "Hooks": "Hucks", "Reel": "Riel", "Likes": "Leiks", "Grupp.": "Grupp!",
           "2012": "Zweitausendzwölf", "200": "zweihundert", "6.000": "Sechstausend", "700": "Siebenhundert",
           "0,02": "null Komma null zwei", "3,4": "drei Komma vier", "Imagefilm": "Imätschfilm"}


def say_text(show):
    s = show.replace("*", "").replace("„", "").replace("“", "")
    for k, v in RESPELL.items():
        s = s.replace(k, v)
    return s


# ---------------------------------------------------------------- TTS + word timing
VOICE = os.path.join(SCR, "voices", "de_DE-thorsten-high.onnx")
TTS = os.path.join(OUT, "tts"); os.makedirs(TTS, exist_ok=True)
_whisper = None


def tts(show):
    text = say_text(show)
    h = hashlib.md5(text.encode()).hexdigest()[:10]
    raw, path = os.path.join(TTS, h + "_raw.wav"), os.path.join(TTS, h + ".wav")
    if not os.path.exists(path):
        subprocess.run([sys.executable, "-m", "piper", "-m", VOICE, "-f", raw, "--length-scale", "0.80",
                        "--sentence-silence", "0.05"], input=text.encode(), check=True, capture_output=True)
        # punchier read: trim silence, slight pitch-neutral speed-up, EQ + compression, 48k
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
                        "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=1:stop_threshold=-45dB:stop_duration=0.15,"
                        "atempo=1.06,highpass=f=90,equalizer=f=3000:t=q:w=1:g=3,equalizer=f=200:t=q:w=1:g=2,"
                        "acompressor=threshold=-18dB:ratio=3:attack=5:release=60,aresample=48000",
                        "-ac", "1", path], check=True)
    with wave.open(path) as w:
        dur = w.getnframes() / w.getframerate()
    return path, dur


def word_times(path, show):
    """Whisper word timings mapped onto the displayed words (index-aligned, proportional fallback)."""
    global _whisper
    words = show.split()
    cache = path + ".words.json"
    if os.path.exists(cache):
        got = json.load(open(cache))
    else:
        from faster_whisper import WhisperModel
        if _whisper is None:
            _whisper = WhisperModel("small", device="cpu", compute_type="int8")
        a = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                                         capture_output=True).stdout, np.float32)
        segs, _ = _whisper.transcribe(a, language="de", word_timestamps=True)
        got = [[w.start, w.end] for s in segs for w in s.words]
        json.dump(got, open(cache, "w"))
    with wave.open(path) as w:
        dur = w.getnframes() / w.getframerate()
    if len(got) == len(words):
        return [(g[0], g[1]) for g in got]
    tot = sum(len(w) + 1 for w in words); t = 0; res = []
    for w in words:
        d = dur * (len(w) + 1) / tot; res.append((t, t + d)); t += d
    return res


def chunk_caps(words, kind, y):
    """words: [(text, t0, t1, key)] -> caption chunks of <= 3 words."""
    chunks, cur = [], []
    for w in words:
        if cur and (len(cur) >= 3 or sum(len(x[0]) for x in cur) + len(w[0]) > 16):
            chunks.append(cur); cur = []
        cur.append(w)
        if re.search(r"[.,:;!?]$", w[0]) and len(cur) >= 1:
            chunks.append(cur); cur = []
    if cur:
        chunks.append(cur)
    caps = []
    for i, ch in enumerate(chunks):
        t1 = chunks[i + 1][0][1] if i + 1 < len(chunks) else ch[-1][2] + 0.3
        caps.append({"kind": kind, "y": y, "t0": ch[0][1], "t1": min(t1, ch[-1][2] + 0.6),
                     "words": [{"w": x[0].replace("*", ""), "t": x[1], "d": x[2] - x[1], "k": x[3]} for x in ch]})
    return caps


# ---------------------------------------------------------------- sequencing
shots, overlays, captions, audio, flashes, shakes = [], [], [], [], [], []
src_cursor = {}            # continue a reused shot where it left off


def add_shot(spec, t0, t1, extra=None):
    key = (spec["src"], spec["at"], spec["layout"])
    at = src_cursor.get(key, spec["at"])
    if "span" in spec["fx"]:
        at = spec["at"] + (at - spec["at"]) % max(spec["fx"]["span"] - (t1 - t0), 0.05)
    src_cursor[key] = at + (t1 - t0)
    fx = dict(spec["fx"]); fx.update(extra or {})
    if "punch" in fx:
        fx["punch"] = [t0 + (p - spec["at"]) for p in fx["punch"]]
    d = {"id": f"s{len(shots):03d}", "src": spec["src"], "at": at, "t0": t0, "t1": t1, "layout": spec["layout"],
         "cy": spec["cy"], "fx": fx}
    if "span" in spec["fx"] and (t1 - t0) > spec["fx"]["span"] - 0.05:
        d["at"] = spec["at"]; d["slow"] = (t1 - t0) / (spec["fx"]["span"] - 0.05)
    if "cardX" in spec["fx"]:
        d["cardX"] = spec["fx"]["cardX"]
    shots.append(d)


def add_overlay(o, t0, t1):
    o = dict(o); o["t0"], o["t1"] = t0, t1
    if o["type"] == "counter":
        o["from"] = o.pop("frm", 0)
        audio.append(("sfx", "pop", t0, 0.5))
    if o["type"] == "stamp":
        audio.append(("sfx", "hit", t0, 0.55))
        if o.get("shake"):
            shakes.append(t0)
    if o["type"] == "card":
        audio.append(("sfx", "swish", t0 - 0.05, 0.6))
    if o["type"] == "browser":
        audio.append(("sfx", "whoosh", t0 - 0.2, 0.5))
        audio.append(("sfx", "click", t0 + o["cursor"]["click"], 0.9))
    overlays.append(o)


t = 0.0
for ev in EDIT:
    if "bite" in ev:
        f, a, b = ev["bite"]
        t0 = t; t1 = snap(t0 + (b - a) + 0.05)
        add_shot(ev["shot"], t0, t1)
        audio.append(("bite", "ig_" + f + ".mp4", t0, a, b))
        ws = [w for s in json.load(open(os.path.join(SRC, "ig_" + f + ".json"))) for w in s["words"] if a - 0.05 <= w["s"] < b]
        captions += chunk_caps([(w["w"], t0 + w["s"] - a, t0 + w["e"] - a, False) for w in ws], "bite", 820)
        for o in ev.get("ov", []):
            o = dict(o); st = t0 + o.pop("dbeat", 0) * BEAT; o.pop("line", None)
            add_overlay(o, st, st + o.pop("beats", 2) * BEAT)
        if ev.get("lower"):
            add_overlay({"type": "lower", "text": ev["lower"]}, t0 + 0.2, t1)
        t = t1
    elif "montage" in ev:
        if ev.get("riserInto"):
            pass
        for spec, ov in ev["montage"]:
            t1 = t + ev["beats"] * BEAT
            add_shot(spec, t, t1)
            if ov:
                add_overlay(dict(ov, pos=ov.get("pos", dict(x=960, y=470))), t, t1)
            t = t1
        if ev.get("riserInto"):
            audio.append(("sfx", "riser", t - 2.0, 0.6))
    elif "title" in ev:
        t1 = t + ev["beats"] * BEAT
        add_shot(ev["shots"][0], t, t1, {"push": 0.08})
        add_overlay({"type": "title", "a": "Case Study", "b": "Das Aumann", "c": "*Playbook*", "pos": dict(x=960, y=520)}, t, t1)
        flashes.append(t); shakes.append(t); audio.append(("sfx", "hit", t, 0.9)); audio.append(("sfx", "shutter", t, 0.4))
        t = t1
    elif "step" in ev:
        num, title = ev["step"]
        t1 = t + 4 * BEAT
        add_shot(ev["shots"][0], t, t1, {"bw": True, "push": 0.1})
        add_overlay({"type": "stepSlam", "num": f"0{num}", "title": title}, t, t1)
        flashes.append(t); shakes.append(t)
        audio += [("sfx", "whoosh", t - 0.35, 0.6), ("sfx", "hit", t, 0.85)]
        step_t0 = t
        # VO reads the step title over the slam
        path, dur = tts(["Eins", "Zwei", "Drei", "Vier", "Fünf", "Sechs"][num - 1] + ": " + title.replace("[", "").replace("]", ""))
        audio.append(("vo", path, t + 0.1))
        # persistent corner tag + progress until the next step / recap
        for o in overlays:
            if o["type"] in ("tag", "progress") and o["t1"] > t:
                o["t1"] = t
        add_overlay({"type": "tag", "num": f"0{num}", "title": title.replace("[", "").replace("]", ""), "noOut": True}, t1, 9999)
        add_overlay({"type": "progress", "step": num, "noOut": True}, t1, 9999)
        t = t1
    elif "lines" in ev:
        block_t0 = t
        line_spans = []
        for show, min_beats in ev["lines"]:
            path, dur = tts(show)
            l0 = t
            audio.append(("vo", path, l0))
            if not ev.get("noCaps"):
                wt = word_times(path, show)
                ws = [(w, l0 + a, l0 + b, w.startswith("*") or w.rstrip(".,:;!?“").endswith("*")) for w, (a, b) in zip(show.split(), wt)]
                captions += chunk_caps(ws, "vo", ev.get("capY", 780))
            l1 = snap(l0 + dur + 0.08)
            if min_beats:
                l1 = max(l1, l0 + min_beats * BEAT)
            line_spans.append((l0, l1))
            t = l1
        block_t1 = t
        # base shots
        if ev.get("shotLines"):
            for i, (l0, l1) in enumerate(line_spans):
                add_shot(ev["shots"][i % len(ev["shots"])], l0, l1)
        else:
            cut = ev.get("cut", 2) * BEAT; k = 0; c = block_t0
            while c < block_t1 - 1e-6:
                add_shot(ev["shots"][k % len(ev["shots"])], c, min(c + cut, block_t1)); c += cut; k += 1
        for o in ev.get("ov", []):
            o = dict(o)
            l0, l1 = line_spans[o.pop("line", 0)]
            st = l0 + o.pop("dbeat", 0) * BEAT
            if "until" in o:
                en = line_spans[o.pop("until")][1]
            elif "beats" in o:
                en = st + o.pop("beats") * BEAT
            else:
                en = block_t1
            if o["type"] == "compare":
                for it in o["items"]:
                    if "atLine" in it:
                        it["at"] = line_spans[it.pop("atLine")][0] - st
            add_overlay(o, st, min(en, block_t1))
        if ev.get("recap"):
            for o in overlays:
                if o["type"] in ("tag", "progress") and o["t1"] > block_t0:
                    o["t1"] = block_t0
            add_overlay({"type": "check", "items": ["Herkunft als Beweis", "Aufreger, die filtern", "Wir statt Zielgruppe",
                                                     "Geliehene Bühnen", "Beweise in Serie", "Ein Ziel: das Gespräch"],
                         "at": [l0 - block_t0 for l0, _ in line_spans], "pos": dict(x=600, y=540)}, block_t0, block_t1 + 2 * BEAT)
            for l0, _ in line_spans:
                audio.append(("sfx", "hit", l0, 0.45)); shakes.append(l0)
        t = block_t1
    elif "end" in ev:
        t1 = t + ev["beats"] * BEAT
        add_shot(ev["shots"][0], t, t1, {"push": 0.06})
        add_overlay({"type": "end", "a": "Case Study", "b": "Das Aumann *Playbook*",
                     "s": "Quellen: @matthiasaumann (Instagram, YouTube), mission-mittelstand.de, matthias-aumann.de, vidIQ · Stand 25.10.2026<br>"
                          "Musik: „Hustle“ Kevin MacLeod (incompetech.com), lizenziert unter CC BY 4.0",
                     "pos": dict(x=960, y=540)}, t, t1)
        flashes.append(t); audio.append(("sfx", "hit", t, 0.7))
        t = t1

DUR = t
for o in overlays:
    o["t1"] = min(o["t1"], DUR)
# every hard cut that isn't covered by another effect gets a soft swish on some beats
print(f"duration {DUR:.2f}s  shots {len(shots)}  overlays {len(overlays)}  captions {len(captions)}")
json.dump({"duration": DUR, "shots": shots, "overlays": overlays, "captions": captions, "flashes": flashes, "shakes": shakes},
          open(os.path.join(OUT, "timeline.json"), "w"), ensure_ascii=False, indent=1)
json.dump(audio, open(os.path.join(OUT, "audio.json"), "w"), indent=1)
