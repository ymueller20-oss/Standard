import json, os, sys, urllib.request
o = urllib.request.build_opener(); o.addheaders = [("User-Agent", "scene-builder/1.0")]; urllib.request.install_opener(o)
out = sys.argv[1]
def get(u): return json.load(urllib.request.urlopen(u))
def dl(u, p):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    if not os.path.exists(p): urllib.request.urlretrieve(u, p)
dl(get("https://api.polyhaven.com/files/cobblestone_street_night")["hdri"]["4k"]["hdr"]["url"], os.path.join(out, "night.hdr"))
t = get("https://api.polyhaven.com/files/cobblestone_floor_08")
for k, n in [("Diffuse","diff"),("nor_gl","nor"),("Rough","rough"),("Displacement","disp")]:
    dl(t[k]["2k"]["jpg"]["url"] if "jpg" in t[k]["2k"] else t[k]["2k"]["png"]["url"], os.path.join(out, "cobble", n + ".jpg"))
print("ok")
