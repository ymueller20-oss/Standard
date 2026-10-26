# Creates a ~35-year-old office worker with MPFB (MakeHuman) and a Mixamo-compatible rig, saves it as a .blend.
# Usage: blender -b -P build_human.py -- <out.blend>
# (run without --factory-startup so the installed MPFB extension is loaded)
import bpy, sys
out = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_homefile(use_empty=True)
from bl_ext.user_default.mpfb.services import HumanService
info = HumanService._create_default_human_info_dict()
info["phenotype"].update({"gender": 1.0, "age": 0.55, "muscle": 0.5, "weight": 0.55, "height": 0.55, "proportions": 0.6,
                          "race": {"caucasian": 0.9, "asian": 0.05, "african": 0.05}})
info.update({
    "name": "officeguy",
    "rig": "mixamo",
    "eyes": "high-poly/high-poly.mhclo", "eyes_material_type": "PROCEDURAL_EYES",
    "eyebrows": "eyebrow001/eyebrow001.mhclo", "eyelashes": "eyelashes02/eyelashes02.mhclo",
    "hair": "short02/short02.mhclo",
    "clothes": ["male_elegantsuit01/male_elegantsuit01.mhclo", "shoes04/shoes04.mhclo"],
    "skin_mhmat": "middleage_caucasian_male/middleage_caucasian_male.mhmat",
    "skin_material_type": "ENHANCED_SSS",
})
settings = HumanService.get_default_deserialization_settings()
settings["subdiv_levels"] = 1
HumanService.deserialize_from_dict(info, settings)
for o in bpy.data.objects:
    print("HUMAN", o.name, o.type, tuple(round(v, 3) for v in o.dimensions), o.parent.name if o.parent else None)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
print("BONES", [b.name for b in arm.data.bones][:70])
bpy.ops.wm.save_as_mainfile(filepath=out)
