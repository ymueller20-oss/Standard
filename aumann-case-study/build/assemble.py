"""Build every scene segment and concatenate them into the final video.

usage: assemble.py <script.json> <srcDir> <assetsDir> <voDir> <renderDir> <out.mp4>
"""
import json, os, subprocess, sys

script, SRC, ASSETS, VO, REN, OUT = sys.argv[1:7]
FPS = 25
ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]
REEL_X, REEL_Y, REEL_W, REEL_H = 1250, 60, 540, 960


def ff(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def clip(s, out):
    dur = s["end"] - s["start"]
    panel = os.path.join(REN, s["id"] + "_panel", "%04d.png")
    fc = (
        f"[0:v]split=2[a][b];"
        f"[a]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=40:2,eq=brightness=-0.28:saturation=0.75[bg];"
        f"[b]scale={REEL_W}:{REEL_H}[fg0];[fg0][1:v]alphamerge[fg];"
        f"[bg][2:v]overlay=0:0[b1];[b1][3:v]overlay=0:0[b2];[b2][fg]overlay={REEL_X}:{REEL_Y}[b3];"
        f"[4:v]format=rgba[pn];[b3][pn]overlay=0:0:eof_action=repeat,fade=in:st=0:d=0.2,fps={FPS},trim=duration={dur:.3f}[v];"
        f"[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,afade=in:st=0:d=0.06,afade=out:st={max(dur - 0.2, 0):.3f}:d=0.2,"
        f"aresample=48000,apad,atrim=duration={dur:.3f}[a]"
    )
    ff("-ss", f"{s['start']:.3f}", "-t", f"{dur:.3f}", "-i", os.path.join(SRC, s["src"]),
       "-loop", "1", "-i", os.path.join(ASSETS, "reel_mask.png"),
       "-loop", "1", "-i", os.path.join(ASSETS, "left_grad.png"),
       "-loop", "1", "-i", os.path.join(ASSETS, "reel_shadow.png"),
       "-framerate", str(FPS), "-i", panel,
       "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-t", f"{dur:.3f}", *ENC, out)


def vo(s, out):
    ff("-i", os.path.join(REN, s["id"] + ".mp4"), "-i", os.path.join(VO, s["id"] + ".wav"),
       "-filter_complex", "[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad[a]",
       "-map", "0:v", "-map", "[a]", "-shortest", *ENC, out)


def end(s, out):
    ff("-i", os.path.join(REN, s["id"] + ".mp4"), "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
       "-map", "0:v", "-map", "1:a", "-shortest", *ENC, out)


scenes = json.load(open(script))["scenes"]
seg_dir = os.path.join(REN, "segments")
os.makedirs(seg_dir, exist_ok=True)
segs = []
for s in scenes:
    out = os.path.join(seg_dir, s["id"] + ".mp4")
    {"clip": clip, "vo": vo, "end": end}[s["type"]](s, out)
    segs.append(out)
    print("segment", s["id"])

lst = os.path.join(seg_dir, "list.txt")
with open(lst, "w") as f:
    f.writelines(f"file '{p}'\n" for p in segs)
ff("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", OUT)
print("wrote", OUT)
