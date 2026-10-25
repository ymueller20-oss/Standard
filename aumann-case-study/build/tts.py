"""Synthesise the voiceover for every `vo` scene with Piper.

Writes per scene: <out>/<id>.wav and <out>/<id>.timing.json, where the timing
file lists each line's start/end so captions and beats can be aligned.
"""
import json, re, subprocess, sys, wave, os

SCRIPT, VOICE, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
LENGTH_SCALE = sys.argv[4] if len(sys.argv) > 4 else "0.88"   # <1 speaks faster
GAP = float(sys.argv[5]) if len(sys.argv) > 5 else 0.32       # pause between lines
RATE = 22050
LEAD, TAIL = 0.45, 0.55

# Piper reads English loanwords with German rules; respell them phonetically.
RESPELL = {
    "YouTube": "Juhtjub", "Playbook": "Pleh-buck", "Short": "Schoort",
    "Hooks": "Hucks", "Reels": "Riels", "Reel": "Riel", "Likes": "Leiks",
    "Like-Rate": "Leik-Rate", "Familien-Reel": "Familien-Riel",
    "Aufreger-Reels": "Aufreger-Riels", "Talk": "Tohk",
}

def respell(text):
    for k in sorted(RESPELL, key=len, reverse=True):
        text = re.sub(rf"(?<![\w-]){re.escape(k)}(?![\w-])", RESPELL[k], text)
    return text

def synth(text, path):
    subprocess.run([sys.executable, "-m", "piper", "-m", VOICE, "-f", path,
                    "--length-scale", LENGTH_SCALE, "--sentence-silence", "0.15"],
                   input=text.encode(), check=True, capture_output=True)
    with wave.open(path) as w:
        return w.readframes(w.getnframes())

def silence(sec):
    return b"\x00\x00" * int(RATE * sec)

os.makedirs(OUT, exist_ok=True)
for scene in json.load(open(SCRIPT))["scenes"]:
    if scene["type"] != "vo":
        continue
    pcm, t, timing = silence(LEAD), LEAD, []
    for bi, beat in enumerate(scene["beats"]):
        for li, line in enumerate(beat["lines"]):
            tmp = os.path.join(OUT, f"_{scene['id']}_{bi}_{li}.wav")
            data = synth(respell(line["say"]), tmp)
            os.remove(tmp)
            dur = len(data) / 2 / RATE
            timing.append({"beat": bi, "show": line["show"], "start": t, "end": t + dur})
            pcm += data + silence(GAP)
            t += dur + GAP
    pcm += silence(TAIL - GAP)
    t += TAIL - GAP
    with wave.open(os.path.join(OUT, scene["id"] + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm)
    json.dump({"duration": t, "lines": timing}, open(os.path.join(OUT, scene["id"] + ".timing.json"), "w"),
              ensure_ascii=False, indent=1)
    print(f"{scene['id']}: {t:.1f}s")
