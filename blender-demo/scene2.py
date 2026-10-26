# Night alley: a man walks over wet cobblestones past streetlamps and a neon sign, through light fog.
# Usage: blender -b --factory-startup -P scene2.py -- <assets_dir> <out_path> <mode: still|anim> [samples] [still_frame] [frame_step] [res_percent]
import bpy, sys, os, math, mathutils
args = sys.argv[sys.argv.index("--") + 1:]
A, OUT, MODE = args[0], args[1], args[2]
SAMPLES = int(args[3]) if len(args) > 3 else 64
STILL_FRAME = int(args[4]) if len(args) > 4 else 36
STEP = int(args[5]) if len(args) > 5 else 1
RES = int(args[6]) if len(args) > 6 else 100

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.fps = 24
sc.frame_start, sc.frame_end = 1, 72
SPEED = 0.071  # m per frame, measured from the stance foot of the Walk cycle so the feet don't slide
X0 = -2.5

# Character: in-place walk cycle, looped via NLA and moved along +X at the cycle's own speed
bpy.ops.import_scene.gltf(filepath=os.path.join(A, "Soldier.glb"))
arm = bpy.data.objects["Character"]
walk = bpy.data.actions["Walk"]
arm.animation_data.action = None
for tr in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(tr)
strip = arm.animation_data.nla_tracks.new().strips.new("walk", 1, walk)
strip.repeat = 4
root = bpy.data.objects.new("walker", None); sc.collection.objects.link(root)
arm.parent = root
root.rotation_euler.z = math.radians(-90)  # cycle walks along local +Y; turn it to world +X
for f in (1, 72):
    root.location = (X0 + SPEED * (f - 1), 0, 0); root.keyframe_insert("location", frame=f)
for fc in root.animation_data.action.fcurves:
    for k in fc.keyframe_points: k.interpolation = 'LINEAR'
for o in arm.children:
    if o.type == 'MESH':
        for m in o.data.materials:
            if m and m.use_nodes and "Principled BSDF" in m.node_tree.nodes:
                m.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.6

# Ground: wet cobblestones with puddles (noise mask drives roughness and darkening)
bpy.ops.mesh.primitive_plane_add(size=1); ground = bpy.context.object
ground.scale = (30, 30, 1); bpy.ops.object.transform_apply(scale=True)
mat = bpy.data.materials.new("cobble"); mat.use_nodes = True
nt = mat.node_tree; N, L = nt.nodes, nt.links; bsdf = N["Principled BSDF"]
mapn = N.new("ShaderNodeMapping"); mapn.inputs["Scale"].default_value = (15, 15, 1)
L.new(N.new("ShaderNodeTexCoord").outputs["UV"], mapn.inputs["Vector"])
def tex(fn, non_color):
    t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.join(A, "cobble", fn))
    if non_color: t.image.colorspace_settings.name = "Non-Color"
    L.new(mapn.outputs["Vector"], t.inputs["Vector"]); return t
noise = N.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 0.35; noise.inputs["Detail"].default_value = 6
ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = 0.48; ramp.color_ramp.elements[1].position = 0.56
L.new(noise.outputs["Fac"], ramp.inputs["Fac"])
puddle = ramp.outputs["Color"]
dark = N.new("ShaderNodeMix"); dark.data_type = 'RGBA'; dark.blend_type = 'MULTIPLY'
dark.inputs["B"].default_value = (0.35, 0.35, 0.37, 1)
L.new(puddle, dark.inputs["Factor"]); L.new(tex("diff.jpg", False).outputs["Color"], dark.inputs["A"])
L.new(dark.outputs["Result"], bsdf.inputs["Base Color"])
rough = N.new("ShaderNodeMix"); rough.data_type = 'FLOAT'
L.new(puddle, rough.inputs["Factor"])
rmul = N.new("ShaderNodeMath"); rmul.operation = 'MULTIPLY'; rmul.inputs[1].default_value = 0.45  # damp stone overall
L.new(tex("rough.jpg", True).outputs["Color"], rmul.inputs[0]); L.new(rmul.outputs["Value"], rough.inputs["A"])
rough.inputs["B"].default_value = 0.02
L.new(rough.outputs["Result"], bsdf.inputs["Roughness"])
nm = N.new("ShaderNodeNormalMap"); L.new(tex("nor.jpg", True).outputs["Color"], nm.inputs["Color"])
flat = N.new("ShaderNodeMix"); flat.data_type = 'FLOAT'; flat.inputs["A"].default_value = 1.0; flat.inputs["B"].default_value = 0.0
L.new(puddle, flat.inputs["Factor"]); L.new(flat.outputs["Result"], nm.inputs["Strength"])  # puddles are flat mirrors
L.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
ground.data.materials.append(mat)

# World: night street HDRI as dim fill and background
w = bpy.data.worlds.new("night"); sc.world = w; w.use_nodes = True
wn = w.node_tree; bg = wn.nodes["Background"]
env = wn.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(os.path.join(A, "night.hdr"))
wmap = wn.nodes.new("ShaderNodeMapping"); wmap.inputs["Rotation"].default_value = (0, 0, math.radians(200))
wn.links.new(wn.nodes.new("ShaderNodeTexCoord").outputs["Generated"], wmap.inputs["Vector"])
wn.links.new(wmap.outputs["Vector"], env.inputs["Vector"]); wn.links.new(env.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 0.35

def aim(obj, target):
    obj.rotation_euler = (mathutils.Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

# Streetlamps: warm sodium spots with visible bulbs, placed so he walks under one and out of it
for x, y in [(-1.2, 1.4), (3.2, 1.6)]:
    bpy.ops.object.light_add(type='SPOT', location=(x, y, 3.6)); l = bpy.context.object
    l.data.energy = 450; l.data.color = (1.0, 0.62, 0.3); l.data.spot_size = math.radians(85)
    l.data.spot_blend = 0.6; l.data.shadow_soft_size = 0.08
    aim(l, (x, y - 0.6, 0))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.07, location=(x, y, 3.62)); bulb = bpy.context.object
    em = bpy.data.materials.new("bulb"); em.use_nodes = True
    e = em.node_tree.nodes.new("ShaderNodeEmission"); e.inputs["Color"].default_value = (1, 0.65, 0.35, 1); e.inputs["Strength"].default_value = 60
    em.node_tree.links.new(e.outputs[0], em.node_tree.nodes["Material Output"].inputs["Surface"])
    bulb.data.materials.append(em); bulb.visible_shadow = False

# Neon sign: magenta emissive tube on the far side, plus a cyan neon spill from camera-left
def neon(name, loc, size, color, strength, rot):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc); p = bpy.context.object; p.name = name
    p.scale = (size[0], size[1], 1); p.rotation_euler = rot
    m = bpy.data.materials.new(name); m.use_nodes = True
    e = m.node_tree.nodes.new("ShaderNodeEmission"); e.inputs["Color"].default_value = color; e.inputs["Strength"].default_value = strength
    m.node_tree.links.new(e.outputs[0], m.node_tree.nodes["Material Output"].inputs["Surface"]); p.data.materials.append(m)
neon("neon_magenta", (1.4, 3.2, 2.4), (1.6, 0.12), (1.0, 0.08, 0.5, 1), 40, (math.radians(90), 0, 0))
bpy.ops.object.light_add(type='AREA', location=(1.4, 3.0, 2.4)); nl = bpy.context.object
nl.data.shape = 'RECTANGLE'; nl.data.size, nl.data.size_y = 1.6, 0.12; nl.data.energy = 400; nl.data.color = (1.0, 0.1, 0.55)
aim(nl, (1.4, 0, 1.0))
bpy.ops.object.light_add(type='AREA', location=(-3.5, -1.5, 1.8)); cy = bpy.context.object
cy.data.size = 0.6; cy.data.energy = 250; cy.data.color = (0.1, 0.75, 1.0); aim(cy, (0.5, 0, 1.0))

# Cool moonlight rim from behind
bpy.ops.object.light_add(type='SUN', location=(0, 5, 5)); sun = bpy.context.object
sun.data.energy = 0.25; sun.data.color = (0.6, 0.7, 1.0); sun.data.angle = math.radians(2)
sun.rotation_euler = (math.radians(-55), 0, math.radians(160))

# Light fog so the lamps throw visible cones
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.5, 0.5, 2.5)); fog = bpy.context.object
fog.scale = (14, 10, 5); fog.visible_shadow = False
fm = bpy.data.materials.new("fog"); fm.use_nodes = True
fn = fm.node_tree.nodes; fn.remove(fn["Principled BSDF"])
vol = fn.new("ShaderNodeVolumePrincipled"); vol.inputs["Density"].default_value = 0.01; vol.inputs["Anisotropy"].default_value = 0.5
fm.node_tree.links.new(vol.outputs[0], fn["Material Output"].inputs["Volume"]); fog.data.materials.append(fm)

# Camera: low 3/4 front, slow lateral track that keeps him framed, shallow depth of field
bpy.ops.object.empty_add(); tgt = bpy.context.object
tgt.parent = root; tgt.location = (0, 0, 1.15)
bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam
cam.data.lens = 40; cam.data.dof.use_dof = True; cam.data.dof.focus_object = tgt; cam.data.dof.aperture_fstop = 2.0
cam.constraints.new('TRACK_TO').target = tgt
for f, x in [(1, -0.2), (72, 1.9)]:
    cam.location = (x, -4.6, 0.75); cam.keyframe_insert("location", frame=f)

# Render
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.03
sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPENIMAGEDENOISE'
sc.cycles.max_bounces = 6; sc.cycles.volume_bounces = 1; sc.cycles.volume_step_rate = 4 if SAMPLES >= 32 else 10
sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 0.5
sc.render.resolution_x, sc.render.resolution_y = 1280, 720
sc.render.resolution_percentage = RES
sc.frame_step = STEP
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - High Contrast'
sc.render.use_persistent_data = True
sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = OUT
if MODE == "anim":
    bpy.ops.render.render(animation=True)
else:
    sc.frame_set(STILL_FRAME); bpy.ops.render.render(write_still=True)
