"""Aumann case study, 2-min cut (v3): story edit -> timeline.json + audio.json.

A fictional example customer ("Jens") climbs Aumann's four-step staircase
(Stoppen, Verbinden, Vertrauen, Anfragen). Every VO line gets its own shot,
cuts land on beats, chapter changes land on bar downbeats, and no source
moment is shown twice.

usage: edit.py <scratch>
"""
import hashlib, json, math, os, re, subprocess, sys, wave
import numpy as np

SCR = sys.argv[1]
OUT = os.path.join(SCR, "v4")
os.makedirs(OUT, exist_ok=True)
SRC = os.path.join(SCR, "src")
CUTS = json.load(open(os.path.join(SCR, "work", "cuts_all.json")))
BEAT, OFF = 0.5, 0.3146          # "Hustle" (Kevin MacLeod), 120 BPM; bar = 4 beats from OFF


def snap(t, eps=0.06):
    k = math.ceil((t - OFF - eps) / BEAT)
    return OFF + max(k, 0) * BEAT


def snap_bar(t, eps=0.06):
    k = math.ceil((t - OFF - eps) / (4 * BEAT))
    return OFF + max(k, 0) * 4 * BEAT


# ---------------------------------------------------------------- footage
def S(src, at, cy=0.32, layout="full", **fx):
    return {"src": "ig_" + src + ".mp4", "at": at, "cy": cy, "layout": layout, "fx": fx}

V = {
    # De1BJeFuHx0: his "first video" story montage (captions sit at ~62 % height)
    "studio_desk": S("De1BJeFuHx0", 15.9, .42), "video_wall": S("De1BJeFuHx0", 20.2, .40),
    "phone_hand": S("De1BJeFuHx0", 9.2, .40), "seminar_purple": S("De1BJeFuHx0", 25.65, .42),
    "team_green": S("De1BJeFuHx0", 28.45, .40), "team_green2": S("De1BJeFuHx0", 30.0, .40),
    "excavator": S("De1BJeFuHx0", 31.65, .36), "clapping": S("De1BJeFuHx0", 33.9, .42),
    "audience": S("De1BJeFuHx0", 45.7, .40), "audience2": S("De1BJeFuHx0", 49.2, .40),
    "laptop_man": S("De1BJeFuHx0", 22.35, .40), "ads_phone": S("De6xJOeuT8g", 9.5, .50), "stage_wide": S("Deyc5vHu2Ar", 30.0, .40), "ig_posts": S("De1BJeFuHx0", 54.85, .5, layout="phone"),
    "ig_posts2": S("De1BJeFuHx0", 57.35, .5, layout="phone"), "award1": S("De1BJeFuHx0", 61.65, .38),
    "award_stage": S("De1BJeFuHx0", 64.25, .40), "award2": S("De1BJeFuHx0", 67.05, .38),
    "seminar_rows": S("De1BJeFuHx0", 70.1, .42), "aumann_stage": S("De1BJeFuHx0", 71.45, .33),
    "award3": S("De1BJeFuHx0", 75.5, .36),
    # DeuNw9HsmNo: "you can build a house" sales talk (cap, captions low)
    "cap_face": S("DeuNw9HsmNo", 20.5, layout="cardtop"), "cap_face2": S("DeuNw9HsmNo", 54.0, layout="cardtop"),
    "cap_face3": S("DeuNw9HsmNo", 62.0, layout="cardtop"), "garden_table": S("DeuNw9HsmNo", 18.3, .40),
    # stage talk / office talk / craftsman / crowd (DerRZ captions at ~66 %)
    "stage_close": S("Dej5DVIuApa", 3.2, .30), "stage_close2": S("Dej5DVIuApa", 32.0, .30),
    "office_talk": S("DerRZgEMHxO", 6.2, .30), "office_talk2": S("DerRZgEMHxO", 47.0, .30),
    "crowd": S("DerRZgEMHxO", 13.75, .38), "crowd2": S("DerRZgEMHxO", 19.0, .46),
    "craftsman": S("DerRZgEMHxO", 39.25, .48), "laptop": S("DerRZgEMHxO", 39.9, .42),
    # family, gym, senate, vlog, Umsetzer der Woche
    "family1": S("Dew3vNxudcE", 12.9, .45), "family2": S("Dew3vNxudcE", 43.3, .45), "family3": S("Dew3vNxudcE", 56.0, .45),
    "gym": S("DetSFfbOdpF", 22.0, .45), "plaque": S("De6xJOeuT8g", 0.6, .55), "cert": S("DerzEfquEpP", 8.0, .45),
    "plate": S("De6xJOeuT8g", 33.4, .66), "senat_talk": S("DerzEfquEpP", 64.0, .37),
    "umsetzer": S("Dev9szIubYA", 1.0, layout="card"),
    "blur_stage": S("Dej5DVIuApa", 50.0, .30, layout="blur"), "blur_office2": S("DerRZgEMHxO", 63.0, .30, layout="blur"),
    "title_bg": S("DetSFfbOdpF", 45.0, .45), "stage_close3": S("Dej5DVIuApa", 56.0, .30), "blur_office": S("DerRZgEMHxO", 60.0, .30, layout="blur"),
    "blur_seminar": S("De1BJeFuHx0", 46.5, .40, layout="blur", again=True), "blur_cap": S("DeuNw9HsmNo", 80.0, .36, layout="blur"),
    "phone_scroll": S("Dej5DVIuApa", 9.45, .30, layout="phone"),
}

BITES = {
    "haus": ("DeuNw9HsmNo", 0.00, 5.32, S("DeuNw9HsmNo", 0.0, layout="cardtop", punch=[4.45])),
    "bloedsinn": ("DerRZgEMHxO", 0.00, 3.40, S("DerRZgEMHxO", 0.0, .30, layout="phone", punch=[2.7])),
    "garten": ("DeuNw9HsmNo", 5.86, 14.76, S("DeuNw9HsmNo", 5.86, layout="cardtop", punch=[14.05])),
    "haende": ("De1BJeFuHx0", 0.00, 6.05, S("De1BJeFuHx0", 0.0, .36)),
    "gewinn": ("Dev9szIubYA", 67.39, 70.17, S("Dev9szIubYA", 67.39, layout="card")),
    "senat": ("DerzEfquEpP", 11.76, 14.80, S("DerzEfquEpP", 11.76, .37, punch=[13.15])),
    "stark": ("DerzEfquEpP", 119.80, 120.95, S("DerzEfquEpP", 119.80, .37, punch=[120.5])),
}
CAPFIX = {"Eine": "Meine"}

# ---------------------------------------------------------------- script
STAGES = ["Stoppen", "Verbinden", "Vertrauen", "Anfragen"]
STAGE_SUBS = ["ein Satz, der trifft", "einer von ihnen sein", "Bühnen und Beweise", "ein klarer nächster Schritt"]
STATES = ["FREMDER", "ZUSCHAUER", "FAN", "ÜBERZEUGT", "KUNDE"]


def L(show, *shots, ov=None, state=None, say=None, **opts):
    return dict({"line": show, "shots": list(shots), "ov": ov or [], "state": state, "say": say}, **opts)


def stamp(text, at=0.0, beats=3, **kw):
    return dict(type="stamp", text=text, at=at, beats=beats, **kw)


def P(*lines):
    return ("para", list(lines))


SCRIPT = [
    ("bite", "haus", [stamp("Wake-up-Call", at=3.4, beats=4, size=150, pos=dict(x=960, y=250), style="boxed")]),
    ("hype", [(V["audience2"], stamp("67.700", sub="Follower", size=230)),
              (V["award_stage"], stamp("6.000+", sub="Betriebe", size=230)),
              (V["plate"], stamp("1 Gärtner", sub="aus Cloppenburg", size=200, style="boxed"))]),
    ("title", V["title_bg"]),

    P(L("Das ist Matthias Aumann. Gärtner aus *Cloppenburg*.", V["team_green"]),
      L("Heute zahlen ihm Handwerker Geld, damit er ihnen zeigt, wie man eine Firma *führt*.", V["seminar_purple"], V["audience"]),
      L("Und seine Kunden? Die findet er auf *Instagram*.", V["phone_hand"]),
      L("Wie das funktioniert, zeige ich dir an *Jens*.", V["blur_office"], ov=[dict(type="persona_big")], capY=930),
      L("Jens ist Dachdecker, hat zwölf Leute und kennt Aumann *noch nicht*.", V["blur_office2"], state=0, capY=930)),

    ("stage", 1),
    P(L("Abends, nach der Baustelle, scrollt Jens durch Instagram. Und dann kommt *das*:", V["phone_scroll"])),
    ("bite", "bloedsinn", []),
    P(L("Jens sucht seit Monaten einen *Gesellen*. Der Satz sitzt.", V["craftsman"]),
      L("Und genau das ist der Trick: Aumann regt sich nicht über *Politik* auf.", V["stage_close"],
        ov=[stamp("Politik ✕", word="Politik", beats=4, size=150, pos=dict(x=960, y=300), style="outline", rot=-5)]),
      L("Er regt sich über die *Fehler von Chefs* auf.", V["cap_face"],
        ov=[stamp("Fehler von Chefs ✓", word="Fehler", beats=4, size=130, pos=dict(x=960, y=300), style="boxed")]),
      L("Wer sich da ertappt fühlt, ist selbst Chef. Also genau sein *Kunde*.", V["crowd"], V["crowd2"]),
      L("Und das wirkt: bis zu dreimal so viele *Likes* wie seine Tipps.", V["blur_stage"], capY=880,
        ov=[dict(type="bars", at=0.2, title="Likes pro 1.000 Aufrufe · seine 12 neuesten Reels", max=20, pos=dict(x=960, y=440),
                 items=[dict(label="Aufreger", display="14–18", value=18.4, accent=True), dict(label="Tipps", display="3–10", value=9.6)])]),
      L("Jens bleibt hängen. Aus dem Fremden wird ein *Zuschauer*.", V["cap_face2"], state=1)),

    ("stage", 2),
    P(L("Jens schaut weiter und merkt: Moment, der ist ja einer von *uns*.", V["excavator"])),
    ("bite", "garten", []),
    P(L("Kein Berater im Anzug, sondern ein Gärtner, der mit einem Transporter angefangen hat.", V["office_talk2"]),
      L("Heute hat er über *200* Leute.", V["clapping"],
        say="Heute hat er über zweihundert Leute.",
        ov=[dict(type="counter", word="200", value=200, frm=0, suffix="+", label="Mitarbeiter (eigene Angabe)", pos=dict(x=960, y=360))]),
      L("Und er zeigt, was andere verstecken: seine Familie und seine *Zweifel*.", V["family1"], V["family2"])),
    ("bite", "haende", []),
    P(L("Jens fühlt sich verstanden. Aus dem Zuschauer wird ein *Fan*.", V["family3"], state=2)),

    ("stage", 3),
    P(L("Aber bevor Jens Geld ausgibt, will er *Beweise*.", V["cap_face3"]),
      L("Also zeigt Aumann sich mit Leuten, denen Jens vertraut:", V["ig_posts"], V["ig_posts2"]),
      L("Wolfgang Grupp. Ralf Dümmel.", V["blur_seminar"], noCaps=True,
        ov=[dict(type="card", word="Grupp", src="assets/yt_WQgCsmlzw3k.jpg", w=760, h=428, tilt=-5, pos=dict(x=560, y=430), label="Wolfgang Grupp"),
            dict(type="card", word="Dümmel", src="assets/yt_Q-uYtW-o5b0.jpg", w=760, h=428, tilt=4, pos=dict(x=1360, y=560), label="Ralf Dümmel")]),
      L("Dazu Zahlen: über *6.000* begleitete Betriebe.", V["stage_wide"], say="Dazu Zahlen: über sechstausend begleitete Betriebe.",
        ov=[dict(type="counter", word="6.000", value=6000, frm=0, suffix="+", label="Betriebe seit 2017 (eigene Angabe)", pos=dict(x=960, y=360))]),
      L("Und jede Woche ein echter Kunde: der *Umsetzer der Woche*.", V["umsetzer"])),
    ("bite", "gewinn", []),
    P(L("Und dann noch das:", V["plaque"])),
    ("bite", "senat", []),
    P(L("Jetzt glaubt Jens: Der kann das *wirklich*.", V["award3"], state=3)),

    ("stage", 4),
    P(L("Und jetzt? Kein Rabatt. Kein *Verkaufsdruck*.", V["aumann_stage"]),
      L("Jeder Kanal führt zu genau einem Knopf: *Erstgespräch* buchen.", V["blur_cap"], noCaps=True,
        ov=[dict(type="browser", at=0.0, src="assets/web_ms_home.png", url="mission-mittelstand.de", pos=dict(x=960, y=500), scroll=0,
                 cursor={"from": [900, 620], "to": [200, 450], "t0": 0.6, "t1": 1.6, "click": 2.0})]),
      L("Und da steht nicht kaufen, sondern *bewerben*.", V["laptop_man"], V["ads_phone"],
        ov=[stamp("Bewerben.", word="bewerben", beats=5, size=230, style="boxed")]),
      L("Jens muss sich qualifizieren. Das macht das Angebot *wertvoll*.", V["award1"], V["award2"]),
      L("Jens bewirbt sich. Aus dem Fremden ist ein *Kunde* geworden.", V["video_wall"], state=4)),

    ("recap",),
    ("bite", "stark", []),
    ("end", V["senat_talk"]),
]

RESPELL = {}


def say_text(s):
    s = s.replace("*", "").replace("„", "").replace("“", "")
    for k, v in RESPELL.items():
        s = s.replace(k, v)
    return s


# ---------------------------------------------------------------- TTS + word timing
TTS = os.path.join(OUT, "tts"); os.makedirs(TTS, exist_ok=True)
CB_PY = os.path.join(SCR, "cbenv", "bin", "python")
CB_MODEL = os.path.join(SCR, "models", "chatterbox_de")
_whisper = None


def _key(text):
    return hashlib.md5(("cb3|" + text).encode()).hexdigest()[:12]


REF = os.path.join(SCR, "refs", "ref_lively.wav")   # CC0 Thorsten-Voice "amused/surprised" takes


def _take_ok(path, text):
    """Reject takes where Whisper can't find (almost) every scripted word."""
    import difflib
    said = [_norm(w[0]) for w in spoken_words(path)]
    want = [_norm(w) for w in text.split() if _norm(w)]
    m = sum(b.size for b in difflib.SequenceMatcher(None, want, said, autojunk=False).get_matching_blocks())
    return m / max(len(want), 1) >= 0.93 and len(said) <= len(want) + 2


def clean_take(raw):
    out = raw.replace("_raw.wav", ".wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
                    "silenceremove=start_periods=1:start_threshold=-55dB:stop_periods=-1:stop_threshold=-50dB:stop_duration=0.45,"
                    "areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse,"
                    "highpass=f=80,equalizer=f=3200:t=q:w=1:g=2.5,acompressor=threshold=-20dB:ratio=3:attack=4:release=80,"
                    "aresample=48000,adelay=90", "-ac", "1", out], check=True)
    if os.path.exists(out + ".words2.json"):
        os.remove(out + ".words2.json")
    return out


def tts_batch(texts):
    """Synthesise every uncached text in one model load, verify each take, retry bad ones with a new seed."""
    texts = list(dict.fromkeys(say_text(x) for x in texts))
    for text in texts:   # raw take exists but no cleaned version yet
        raw = os.path.join(TTS, _key(text) + "_raw.wav")
        if os.path.exists(raw) and not os.path.exists(raw.replace("_raw.wav", ".wav")):
            clean_take(raw)
    todo = [t for t in texts if not os.path.exists(os.path.join(TTS, _key(t) + ".wav"))]
    for attempt in range(3):
        if not todo:
            return
        jobs = [{"text": text, "out": os.path.join(TTS, _key(text) + "_raw.wav"), "exaggeration": 0.6, "cfg": 0.5, "temp": 0.7,
                 "prompt": REF, "seed": 7 + attempt * 101} for text in todo]
        jf = os.path.join(TTS, "jobs.json"); json.dump(jobs, open(jf, "w"), ensure_ascii=False)
        subprocess.run([CB_PY, os.path.join(os.path.dirname(os.path.abspath(__file__)), "tts_cb.py"), CB_MODEL, jf],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        failed = []
        for j in jobs:
            clean = clean_take(j["out"])
            if attempt < 2 and not _take_ok(clean, j["text"]):
                print("   retry take:", j["text"][:50]); failed.append(j["text"]); os.remove(clean)
        todo = failed


TEMPO = 1.12


def tts(text):
    base = os.path.join(TTS, _key(say_text(text)) + ".wav")
    if not os.path.exists(base):
        tts_batch([text])
    path = base.replace(".wav", f"_x{TEMPO}.wav")
    if not os.path.exists(path):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", base, "-af", f"atempo={TEMPO}", path], check=True)
    with wave.open(path) as w:
        return path, w.getnframes() / w.getframerate()


def _norm(w):
    return re.sub(r"[^\wäöüß]", "", w.lower().replace(".", ""))


def spoken_words(path):
    """Whisper word timings for what was actually said."""
    global _whisper
    cache = path + ".words2.json"
    if os.path.exists(cache):
        return json.load(open(cache))
    from faster_whisper import WhisperModel
    if _whisper is None:
        _whisper = WhisperModel("medium", device="cpu", compute_type="int8")
    a = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                                     capture_output=True).stdout, np.float32)
    segs, _ = _whisper.transcribe(a, language="de", word_timestamps=True, vad_filter=False)
    got = [[w.word.strip(), w.start, w.end] for s in segs for w in s.words]
    json.dump(got, open(cache, "w"), ensure_ascii=False)
    return got


def aligned_words(path, show):
    """Captions follow the audio: script spelling (names, numbers, *key*) wherever it lines up with what Whisper heard."""
    import difflib
    said = spoken_words(path)
    script = show.split()
    key = [("*" in w) for w in script]
    inkey = False
    for i, w in enumerate(script):   # *multi word key*
        if w.startswith("*"):
            inkey = True
        key[i] = key[i] or inkey
        if w.rstrip(".,:;!?“").endswith("*"):
            inkey = False
    a = [_norm(w[0]) for w in said]; b = [_norm(w) for w in script]
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == "equal" or (op == "replace" and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                sw, ok = script[j1 + k], True
                if op == "replace":
                    ok = difflib.SequenceMatcher(None, a[i1 + k], b[j1 + k]).ratio() >= 0.5 or a[i1 + k].isdigit()
                out.append([sw.replace("*", "") if ok else said[i1 + k][0], said[i1 + k][1], said[i1 + k][2], key[j1 + k] and ok])
        elif op == "delete":
            out += [[said[k][0], said[k][1], said[k][2], False] for k in range(i1, i2)]
        else:   # script words Whisper didn't catch (takes are verified, so they were spoken): spread them into the gap
            t_a = said[i1 - 1][2] if i1 > 0 else 0.0
            t_b = said[i2][1] if i2 < len(said) else t_a + 0.3 * (j2 - j1)
            if op == "replace":
                t_a, t_b = said[i1][1], said[i2 - 1][2]
            n = j2 - j1; step = max((t_b - t_a) / n, 0.01)
            out += [[script[j1 + k].replace("*", ""), t_a + k * step, t_a + (k + 1) * step, key[j1 + k]] for k in range(n)]
    return [tuple(w) for w in out]


def chunk_caps(words, kind, y):
    chunks, cur = [], []
    for w in words:
        if cur and (len(cur) >= 4 or sum(len(x[0]) + 1 for x in cur) + len(w[0]) > 22):
            chunks.append(cur); cur = []
        cur.append(w)
        if re.search(r"[.,:;!?]\**$", w[0]):
            chunks.append(cur); cur = []
    if cur:
        chunks.append(cur)
    caps = []
    for i, ch in enumerate(chunks):
        nxt = chunks[i + 1][0][1] if i + 1 < len(chunks) else ch[-1][2] + 0.35
        caps.append({"kind": kind, "y": y, "t0": ch[0][1], "t1": min(nxt, ch[-1][2] + 0.5),
                     "words": [{"w": x[0].replace("*", ""), "t": x[1], "d": x[2] - x[1], "k": x[3]} for x in ch]})
    return caps


# ---------------------------------------------------------------- sequencing
shots, overlays, captions, audio, flashes, shakes = [], [], [], [], [], []
used = {}


def add_shot(spec, t0, t1, extra=None, src_at=None, bite=False):
    at = spec["at"] if src_at is None else src_at
    key = spec["src"]
    for a, b in used.get(key, []):
        if at < b - 0.05 and at + (t1 - t0) > a + 0.05 and not spec["fx"].get("again"):
            print(f"  ! reuse {key} {at:.1f}-{at + t1 - t0:.1f} overlaps {a:.1f}-{b:.1f}")
    dur = t1 - t0
    cuts = CUTS.get(key, [])
    nxt = min([c for c in cuts if c > at + 0.15] or [1e9])
    slow = None
    if spec["layout"] not in ("card", "blur", "cardtop") and not bite and nxt - at < dur:
        avail = nxt - at - 0.04
        if dur / max(avail, 0.01) <= 1.7:
            slow = dur / avail
        else:
            print(f"  ~ {key} {at:.1f}: {dur:.1f}s needed, {avail:.1f}s in source shot (runs into next)")
    used.setdefault(key, []).append((at, at + (dur / slow if slow else dur)))
    fx = dict(spec["fx"]); fx.update(extra or {})
    if "punch" in fx:
        fx["punch"] = [t0 + (p - at) for p in fx["punch"]]
    d = {"id": f"s{len(shots):03d}", "src": spec["src"], "at": at, "t0": t0, "t1": t1,
         "layout": spec["layout"], "cy": spec["cy"], "fx": fx}
    if slow:
        d["slow"] = slow
    shots.append(d)


def to_bar(t):
    nt = snap_bar(t)
    if shots and nt > t:
        shots[-1]["t1"] = nt
    return nt


def add_overlay(o, t0, t1):
    o = dict(o); o["t0"], o["t1"] = t0, t1
    typ = o["type"]
    if typ == "counter":
        o["from"] = o.pop("frm", 0); audio.append(("sfx", "pop", t0, 0.5))
    elif typ == "stamp":
        audio.append(("sfx", "hit", t0, 0.5)); shakes.append(t0)
    elif typ == "card":
        audio.append(("sfx", "swish", t0 - 0.05, 0.6))
    elif typ == "bars":
        audio.append(("sfx", "whoosh", t0 - 0.2, 0.35))
    elif typ == "browser":
        audio.append(("sfx", "whoosh", t0 - 0.2, 0.45)); audio.append(("sfx", "click", t0 + o["cursor"]["click"], 0.9))
    overlays.append(o)
    return o


LOOPS = [0]
persona = {"type": "persona", "initial": "J", "name": "Jens", "role": "Dachdecker · Beispiel", "states": [], "noOut": True}
# synthesise the whole voiceover in one model load
_all = [ln["say"] or ln["line"] for it in SCRIPT if it[0] == "para" for ln in it[1]]
_all += [f"Stufe {w}: {STAGES[i]}!" for i, w in enumerate(["eins", "zwei", "drei", "vier"])]
_all += ["Das ist das Playbook."] + [f"{STAGES[i]}: {STAGE_SUBS[i]}." for i in range(4)]
tts_batch(_all)

t = 0.0
for item in SCRIPT:
    kind = item[0] if isinstance(item, tuple) else "line"
    if kind == "bite":
        f, a, b, spec = BITES[item[1]]
        t0 = t; t1 = snap(t0 + (b - a) + 0.12)
        if item[1] == "haende":
            mid = snap(t0 + 2.6)
            add_shot(S("De1BJeFuHx0", 36.15, .35), t0, mid)
            add_shot(S("De1BJeFuHx0", 4.5, .33), mid, t1)
        else:
            add_shot(spec, t0, t1, bite=True)
        audio.append(("bite", "ig_" + f + ".mp4", t0, a, b))
        ws = [w for s in json.load(open(os.path.join(SRC, "ig_" + f + ".json"))) for w in s["words"] if a - 0.05 <= w["s"] < b]
        captions += chunk_caps([(CAPFIX.get(w["w"], w["w"]), t0 + w["s"] - a, t0 + w["e"] - a, False) for w in ws], "bite", 830)
        for o in item[2]:
            o = dict(o); st = t0 + o.pop("at", 0)
            add_overlay(o, st, min(st + o.pop("beats", 3) * BEAT, t1))
        if item[1] in ("haus",):
            add_overlay({"type": "lower", "text": "Matthias Aumann · @matthiasaumann"}, t0 + 0.2, t1)
        t = t1
    elif kind == "hype":
        for spec, ov in item[1]:
            t1 = t + 2 * BEAT
            add_shot(spec, t, t1)
            add_overlay(dict(ov, pos=dict(x=960, y=470), beats=None), t, t1)
            t = t1
        audio.append(("sfx", "riser", t - 2.0, 0.6))
    elif kind == "title":
        t = to_bar(t)
        t1 = t + 6 * BEAT
        add_shot(item[1], t, t1, {"push": 0.08})
        add_overlay({"type": "title", "a": "Case Study", "b": "Das Aumann", "c": "*Playbook*", "pos": dict(x=960, y=520)}, t, t1)
        flashes.append(t); shakes.append(t); audio += [("sfx", "hit", t, 0.9), ("sfx", "shutter", t, 0.4)]
        t = t1
    elif kind == "stage":
        n = item[1]
        t1 = t + 5 * BEAT
        add_shot(V["gym"] if n == 1 else [V["stage_close2"], V["office_talk"], V["stage_close3"]][n - 2], t, t1, {"bw": True, "push": 0.05})
        add_overlay({"type": "stairs", "labels": STAGES, "subs": STAGE_SUBS, "active": n, "initial": "J",
                     "before": STATES[n - 1], "after": STATES[n - 1]}, t, t1)
        flashes.append(t); shakes.append(t)
        audio += [("sfx", "whoosh", t - 0.35, 0.6), ("sfx", "hit", t, 0.85)]
        path, dur = tts(f"Stufe {['eins', 'zwei', 'drei', 'vier'][n - 1]}: {STAGES[n - 1]}!")
        audio.append(("vo", path, t + 0.25))
        t = t1
    elif kind == "recap":
        t = to_bar(t)
        t0 = t
        lines = ["Das ist das Playbook."] + [f"{STAGES[i]}: {STAGE_SUBS[i]}." for i in range(4)]
        tts_batch(lines)
        at = []
        for i, show in enumerate(lines):
            path, dur = tts(show)
            audio.append(("vo", path, t))
            if i:
                at.append(t - t0); audio.append(("sfx", "hit", t, 0.45)); shakes.append(t)
            t = t + dur + 0.35
        t = snap(t)
        # music: outro starts at 112.31 s + 8 s per inserted 4-bar loop; hold the full staircase until
        # the closing bite so that bite + end card sit on the outro
        bite_len = snap(t + 1.27) - t
        global_loops = max(0, math.ceil((t + bite_len - 112.31) / 2.0))
        LOOPS[0] = global_loops
        t = 112.3146 + 2.0 * global_loops - bite_len
        add_shot(dict(V["blur_seminar"], at=50.0, fx={"again": True}), t0, t)
        add_overlay({"type": "stairs", "mode": "recap", "labels": STAGES, "subs": STAGE_SUBS, "at": at, "initial": "J"}, t0, t)
    elif kind == "end":
        t1 = t + 16 * BEAT
        add_shot(item[1], t, t1, {"push": 0.05, "bw": True})
        add_overlay({"type": "end", "a": "Case Study", "b": "Das Aumann *Playbook*",
                     "s": "Jens ist ein erfundenes Beispiel. Zahlen: Instagram/YouTube via vidIQ, Stand 25.10.2026; Firmenangaben laut matthias-aumann.de.<br>"
                          "Clips: @matthiasaumann · Musik: „Hustle“ Kevin MacLeod (incompetech.com), CC BY 4.0",
                     "pos": dict(x=960, y=540)}, t, t1)
        flashes.append(t); audio.append(("sfx", "hit", t, 0.7))
        t = t1
    elif kind == "para":
        lines = item[1]
        tts_batch([ln["say"] or ln["line"] for ln in lines])
        p0 = t; cursor = t; spans = []
        for li, ln in enumerate(lines):
            path, dur = tts(ln["say"] or ln["line"])
            gap = 0.0 if li == 0 else (0.32 if re.search(r"[?:]\**$", lines[li - 1]["line"]) else 0.22)
            l0 = cursor + gap
            audio.append(("vo", path, l0))
            words = aligned_words(path, ln["line"])
            spans.append((l0, l0 + dur, words))
            if not ln.get("noCaps"):
                captions += chunk_caps([(w, l0 + a, l0 + b, k) for w, a, b, k in words], "vo", ln.get("capY", 790))
            cursor = l0 + dur
        p1 = snap(cursor + 0.15)
        # one cut per sentence (and per extra shot), each on the beat nearest the sentence start
        cuts = []
        for li, (l0, l1, _) in enumerate(spans):
            k = len(lines[li]["shots"])
            end = spans[li + 1][0] if li + 1 < len(spans) else p1
            for j in range(k):
                ct = l0 + (end - l0) * j / k
                c = p0 if (li == 0 and j == 0) else OFF + round((ct - OFF) / BEAT) * BEAT
                c = max(c, cuts[-1][0] + BEAT) if cuts else c
                cuts.append((c, lines[li]["shots"][j]))
        for j, (c, spec) in enumerate(cuts):
            add_shot(spec, c, cuts[j + 1][0] if j + 1 < len(cuts) else p1)
        for li, ln in enumerate(lines):
            l0, l1, words = spans[li]
            lend = spans[li + 1][0] if li + 1 < len(spans) else p1
            for o in ln["ov"]:
                o = dict(o)
                if o["type"] == "persona_big":
                    add_overlay({"type": "personaCard", "initial": "J", "name": "Jens", "lines": ["Dachdecker", "12 Mitarbeiter", "kennt Aumann nicht"],
                                 "note": "Beispiel-Kunde", "pos": dict(x=960, y=450)}, l0 + 0.6, spans[li + 1][1] + 0.3)
                    persona["t0"] = spans[li + 1][1] + 0.3
                    continue
                if "word" in o:
                    wkey = _norm(o.pop("word"))
                    hit = next((l0 + a for w, a, b, k in words if _norm(w).startswith(wkey)), l0)
                    st = hit - 0.05
                else:
                    st = l0 + o.pop("at", 0)
                add_overlay(o, st, min(st + o.pop("beats", 99) * BEAT, lend))
            if ln["state"] is not None:
                persona["states"].append({"t": l0 + 0.4, "label": STATES[ln["state"]]})
        t = p1

# persona HUD: visible from its intro until the recap, hidden behind the full-screen stage slams
end = next(o["t0"] for o in overlays if o["type"] == "stairs" and o.get("mode") == "recap")
cur = persona["t0"]
for o in sorted([o for o in overlays if o["type"] == "stairs" and o.get("mode") != "recap"], key=lambda o: o["t0"]) + [{"t0": end, "t1": end}]:
    if o["t0"] > cur:
        overlays.append(dict(persona, t0=cur, t1=o["t0"]))
    cur = o["t1"]
DUR = t
print(f"duration {DUR:.2f}s  shots {len(shots)}  overlays {len(overlays)}  captions {len(captions)}")
json.dump({"duration": DUR, "musicLoops": LOOPS[0], "shots": shots, "overlays": overlays, "captions": captions, "flashes": flashes, "shakes": shakes},
          open(os.path.join(OUT, "timeline.json"), "w"), ensure_ascii=False, indent=1)
json.dump(audio, open(os.path.join(OUT, "audio.json"), "w"), indent=1)
