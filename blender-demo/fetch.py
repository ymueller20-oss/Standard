import json, os, sys, urllib.request
o = urllib.request.build_opener(); o.addheaders = [("User-Agent", "scene-builder/1.0")]; urllib.request.install_opener(o)
out = sys.argv[1]
def get(u): return json.load(urllib.request.urlopen(u))
def dl(u, p):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    if not os.path.exists(p): urllib.request.urlretrieve(u, p)
for m in ["croissant", "carved_wooden_plate", "food_lemon_01" if False else "lemon", "jug_01", "brass_goblets"]:
    f = get(f"https://api.polyhaven.com/files/{m}")["gltf"]["2k"]["gltf"]
    d = os.path.join(out, m)
    dl(f["url"], os.path.join(d, os.path.basename(f["url"])))
    for rel, inc in f["include"].items(): dl(inc["url"], os.path.join(d, rel))
    print("model", m)
h = get("https://api.polyhaven.com/files/comfy_cafe")["hdri"]["4k"]["hdr"]["url"]
dl(h, os.path.join(out, "hdri.hdr")); print("hdri")
t = get("https://api.polyhaven.com/files/oak_veneer_01")
for k, n in [("Diffuse","diff"),("nor_gl","nor"),("Rough","rough")]:
    dl(t[k]["2k"]["jpg"]["url"], os.path.join(out, "wood", n + ".jpg"))
print("wood")
