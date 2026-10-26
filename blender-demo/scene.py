# Builds a photoreal breakfast still life from Poly Haven CC0 assets and renders it with Cycles.
# Usage: blender -b --factory-startup -P scene.py -- <assets_dir> <out_path> <mode: still|anim> [samples] [frame_step]
import bpy, sys, os, math, mathutils
args = sys.argv[sys.argv.index("--") + 1:]
A, OUT, MODE = args[0], args[1], args[2]
SAMPLES = int(args[3]) if len(args) > 3 else 128
STEP = int(args[4]) if len(args) > 4 else 1

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def place(name, keep, loc, rot_z=0.0, scale=1.0, z_extra=0.0):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.import_scene.gltf(filepath=os.path.join(A, name, name + "_2k.gltf"))
    objs = [o for o in bpy.context.selected_objects if o.type == 'MESH']
    if keep:
        drop = [o for o in objs if o.name not in keep]
        objs = [o for o in objs if o.name in keep]
        for o in drop: bpy.data.objects.remove(o)
    root = bpy.data.objects.new(name + "_root", None)
    sc.collection.objects.link(root)
    pts = [o.matrix_world @ mathutils.Vector(c) for o in objs for c in o.bound_box]
    cx = sum(p.x for p in pts) / len(pts); cy = sum(p.y for p in pts) / len(pts); mz = min(p.z for p in pts)
    for o in objs:
        o.parent = None
        o.location -= mathutils.Vector((cx, cy, mz))
        o.parent = root
    root.location = (loc[0], loc[1], z_extra)
    root.rotation_euler.z = math.radians(rot_z)
    root.scale = (scale,) * 3
    return root

# Assets
place("carved_wooden_plate", None, (0.0, 0.0))
place("croissant", None, (0.0, 0.01), rot_z=25, z_extra=0.012)
place("lemon", None, (0.19, -0.07), rot_z=40)
lem2 = place("lemon", None, (0.255, 0.02), rot_z=-70)
lem2.rotation_euler.x = math.radians(90)  # second lemon lying on its side
lem2.location.z = 0.0
place("jug_01", None, (-0.30, 0.20), rot_z=-30)
place("brass_goblets", {"brass_goblet_01"}, (0.30, 0.26), rot_z=10)

# Table top: oak veneer
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
table = bpy.context.object
table.scale = (6.0, 4.0, 1)
bpy.ops.object.transform_apply(scale=True)
mat = bpy.data.materials.new("oak"); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]
coord = nt.nodes.new("ShaderNodeTexCoord"); mapn = nt.nodes.new("ShaderNodeMapping")
mapn.inputs["Scale"].default_value = (6.0, 4.0, 1)
nt.links.new(coord.outputs["UV"], mapn.inputs["Vector"])
def tex(fn, non_color):
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.join(A, "wood", fn))
    if non_color: t.image.colorspace_settings.name = "Non-Color"
    nt.links.new(mapn.outputs["Vector"], t.inputs["Vector"]); return t
tint = nt.nodes.new("ShaderNodeMix"); tint.data_type = 'RGBA'; tint.blend_type = 'MULTIPLY'
tint.inputs["Factor"].default_value = 1.0; tint.inputs["B"].default_value = (0.55, 0.42, 0.32, 1)
nt.links.new(tex("diff.jpg", False).outputs["Color"], tint.inputs["A"])
nt.links.new(tint.outputs["Result"], bsdf.inputs["Base Color"])
rmap = nt.nodes.new("ShaderNodeMapRange"); rmap.inputs["To Min"].default_value = 0.25; rmap.inputs["To Max"].default_value = 0.6
nt.links.new(tex("rough.jpg", True).outputs["Color"], rmap.inputs["Value"])
nt.links.new(rmap.outputs["Result"], bsdf.inputs["Roughness"])
nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.6
nt.links.new(tex("nor.jpg", True).outputs["Color"], nm.inputs["Color"])
nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
table.data.materials.append(mat)

# World: cafe HDRI
w = bpy.data.worlds.new("cafe"); sc.world = w; w.use_nodes = True
wn = w.node_tree; bg = wn.nodes["Background"]
env = wn.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(os.path.join(A, "hdri.hdr"))
wmap = wn.nodes.new("ShaderNodeMapping"); wmap.inputs["Rotation"].default_value = (0, 0, math.radians(110))
wn.links.new(wn.nodes.new("ShaderNodeTexCoord").outputs["Generated"], wmap.inputs["Vector"])
wn.links.new(wmap.outputs["Vector"], env.inputs["Vector"])
wn.links.new(env.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 0.45

# Warm window key light, large and soft
bpy.ops.object.light_add(type='AREA', location=(-1.2, -0.6, 0.9))
key = bpy.context.object; key.data.energy = 320; key.data.size = 1.2
key.data.color = (1.0, 0.86, 0.7)
key.rotation_euler = (mathutils.Vector((0.05, 0.05, 0.05)) - key.location).to_track_quat('-Z', 'Y').to_euler()

# Camera with shallow depth of field, focused on the croissant
bpy.ops.object.empty_add(location=(0.0, 0.01, 0.035)); focus = bpy.context.object
bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam
cam.data.lens = 55; cam.data.sensor_width = 36
cam.data.dof.use_dof = True; cam.data.dof.focus_object = focus; cam.data.dof.aperture_fstop = 2.2
track = cam.constraints.new('TRACK_TO'); track.target = focus
def cam_at(angle_deg, dist, height):
    a = math.radians(angle_deg); return (dist * math.sin(a), -dist * math.cos(a), height)

sc.render.fps = 24
if MODE == "anim":
    sc.frame_start, sc.frame_end = 1, 72  # 3 s slow orbit + push-in
    sc.frame_step = STEP  # skipped frames are filled in later by motion interpolation
    for f, ang, d, h in [(1, -20, 1.0, 0.24), (72, 6, 0.85, 0.20)]:
        cam.location = cam_at(ang, d, h); cam.keyframe_insert("location", frame=f)
    for fc in cam.animation_data.action.fcurves:
        for k in fc.keyframe_points: k.interpolation = 'BEZIER'
else:
    cam.location = cam_at(-12, 1.0, 0.22)

# Render settings
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.02
sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPENIMAGEDENOISE'
sc.cycles.max_bounces = 8 if SAMPLES >= 64 else 4
sc.render.resolution_x, sc.render.resolution_y = 1280, 720
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.use_persistent_data = True
sc.render.filepath = OUT
if MODE == "anim":
    sc.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(animation=True)
else:
    sc.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)
