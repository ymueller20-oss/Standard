"""Extract per-shot JPEG frame sequences, pre-cropped for their layout."""
import json, math, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

SCR = sys.argv[1]
OUT = os.path.join(SCR, "v3")
tl = json.load(open(os.path.join(OUT, "timeline.json")))
FPS = 25


def dur_of(p, _c={}):
    if p not in _c:
        _c[p] = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p],
                                     capture_output=True, text=True).stdout)
    return _c[p]


def job(sh):
    d = os.path.join(OUT, "frames", sh["id"])
    n = math.ceil((sh["t1"] - sh["t0"]) * FPS) + 1
    if os.path.isdir(d) and len(os.listdir(d)) >= n:
        return sh["id"], n
    os.makedirs(d, exist_ok=True)
    src = os.path.join(SCR, "src", sh["src"])
    at = min(sh["at"], max(0, dur_of(src) - n / FPS - 0.1))
    if sh["layout"] == "full":
        y = int(min(max(sh["cy"] * 1920 - 304, 0), 1920 - 608))
        vf = f"crop=1080:608:0:{y},scale=1920:1080:flags=lanczos,unsharp=5:5:0.7"
    elif sh["layout"] == "cardtop":   # top 68 % of the reel: whole face, burned-in captions cut off
        vf = "crop=1080:1306:0:0,scale=810:980:flags=lanczos"
    else:
        vf = "scale=720:1280:flags=lanczos"
    if sh.get("slow"):
        vf = f"setpts={sh['slow']:.4f}*PTS," + vf
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", src, "-frames:v", str(n), "-vf", vf + f",fps={FPS}",
                    "-q:v", "3", os.path.join(d, "%05d.jpg")], check=True)
    return sh["id"], len(os.listdir(d))


with ThreadPoolExecutor(4) as ex:
    res = list(ex.map(job, tl["shots"]))
for sh, (i, n) in zip(tl["shots"], res):
    sh["n"] = n
json.dump(tl, open(os.path.join(OUT, "timeline.json"), "w"), ensure_ascii=False, indent=1)
print("frames:", sum(n for _, n in res))
