# "After work": an office worker walks home through a golden-hour street, backlit by the low sun.
# The street is a real HDRI photo; a fixed (pan-only) camera keeps it perspective-correct, and a
# shadow-catcher ground composites his real shadow onto the photographed cobblestones.
# Usage: blender -b -P scene3.py -- <human.blend> <assets_dir> <out_path> <still|anim> [samples] [still_frame] [frame_step] [res_percent]
import bpy, sys, os, math, mathutils
from mathutils import Vector, Matrix
args = sys.argv[sys.argv.index("--") + 1:]
HUMAN, A, OUT, MODE = args[0], args[1], args[2], args[3]
SAMPLES = int(args[4]) if len(args) > 4 else 32
STILL_FRAME = int(args[5]) if len(args) > 5 else 36
STEP = int(args[6]) if len(args) > 6 else 1
RES = int(args[7]) if len(args) > 7 else 100
F0, F1 = 1, 72

bpy.ops.wm.open_mainfile(filepath=HUMAN)
sc = bpy.context.scene
sc.render.fps = 24; sc.frame_start, sc.frame_end = F0, F1
tgt = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for o in tgt.children: o.hide_viewport = True  # skip mesh evaluation while baking

# --- Retarget the Mixamo walk cycle (from the Soldier sample) onto the MPFB rig -------------
bpy.ops.import_scene.gltf(filepath=os.path.join(A, "Soldier.glb"))
src = bpy.data.objects["Character"]
src_root = bpy.data.objects.new("src_root", None); sc.collection.objects.link(src_root)
src.parent = src_root; src_root.rotation_euler.z = math.pi  # Soldier walks toward +Y; MPFB faces -Y
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.parent and o.parent.name == "Character": o.hide_viewport = True
src.animation_data.action = bpy.data.actions["Walk"]
bpy.context.view_layer.update()

def wpos(arm, bone, tail=False):
    pb = arm.pose.bones[bone]; return arm.matrix_world @ (pb.tail if tail else pb.head)

def hips_frame(up, side):
    z = up.normalized(); x = (side - side.project(z)).normalized(); y = z.cross(x)
    return Matrix((x, y, z)).transposed()

def src_hips_frame():
    return hips_frame(wpos(src, "mixamorig:Spine") - wpos(src, "mixamorig:Hips"),
                      wpos(src, "mixamorig:RightUpLeg") - wpos(src, "mixamorig:LeftUpLeg"))

sc.frame_set(0)
for pb in src.pose.bones: pb.matrix_basis = Matrix()  # read source rest pose
src.animation_data.action = None; bpy.context.view_layer.update()
src_rest_hips = wpos(src, "mixamorig:Hips"); src_rest_frame = src_hips_frame()
src.animation_data.action = bpy.data.actions["Walk"]

tw = tgt.matrix_world; tw_inv = tw.inverted(); tw_rot_inv = tw_inv.to_3x3()
bones = tgt.data.bones
tgt_rest_hips_w = tw @ bones["mixamorig:Hips"].head_local
tgt_rest_frame = tw.to_3x3() @ hips_frame(bones["mixamorig:Spine"].head_local - bones["mixamorig:Hips"].head_local,
                                          bones["mixamorig:RightUpLeg"].head_local - bones["mixamorig:LeftUpLeg"].head_local)
RATIO = tgt_rest_hips_w.z / src_rest_hips.z
names = [b.name for b in bones]
skip = ("Hand", "Thumb", "Index", "Middle", "Ring", "Pinky")  # fingers stay relaxed in rest
order = [b for b in bones if b.name in src.pose.bones and not any(s in b.name for s in skip[1:])]
for pb in tgt.pose.bones: pb.rotation_mode = 'QUATERNION'
CHILD = {}
for side in ("Left", "Right"):
    for a_, b_ in [("Shoulder", "Arm"), ("Arm", "ForeArm"), ("ForeArm", "Hand"), ("Hand", "HandMiddle1"),
                   ("UpLeg", "Leg"), ("Leg", "Foot"), ("Foot", "ToeBase")]:
        CHILD["mixamorig:" + side + a_] = "mixamorig:" + side + b_
for a_, b_ in [("Spine", "Spine1"), ("Spine1", "Spine2"), ("Spine2", "Neck"), ("Neck", "Head")]:
    CHILD["mixamorig:" + a_] = "mixamorig:" + b_
CHILD = {k: v for k, v in CHILD.items() if k in names and v in names and k in src.pose.bones and v in src.pose.bones}
print("RETARGET bones:", len(order), "aimed:", len(CHILD))
CYCLE = 24.8
for f in range(F0, F1 + 1):
    t = ((f - F0) % CYCLE)
    sc.frame_set(int(t), subframe=t - int(t))
    pose = {}
    for b in order:  # parents come before children in bones[]
        rest = b.matrix_local
        if b.parent and b.parent.name in pose:
            U = pose[b.parent.name] @ b.parent.matrix_local.inverted() @ rest
        else:
            U = rest.copy()
        if b.name == "mixamorig:Hips":
            delta = src_hips_frame() @ src_rest_frame.inverted()
            rot = tw_rot_inv @ delta @ tw.to_3x3() @ rest.to_3x3()
            off = (wpos(src, "mixamorig:Hips") - src_rest_hips) * RATIO
            loc = tw_inv @ (tgt_rest_hips_w + off)
            M = Matrix.Translation(loc) @ rot.to_4x4()
        elif b.name in CHILD:
            # aim the bone at its child joint like the source does (glTF bone tails are only guesses)
            c = CHILD[b.name]
            d = tw_rot_inv @ (wpos(src, c) - wpos(src, b.name))
            r = bones[c].head_local - b.head_local
            y = U.to_3x3() @ rest.to_3x3().inverted() @ r
            q = y.rotation_difference(d)
            M = Matrix.Translation(U.translation) @ (q.to_matrix() @ U.to_3x3()).to_4x4()
        else:
            M = U
        pose[b.name] = M
        tpb = tgt.pose.bones[b.name]
        tpb.matrix_basis = U.inverted() @ M
        tpb.keyframe_insert("rotation_quaternion", frame=f)
        if b.name == "mixamorig:Hips": tpb.keyframe_insert("location", frame=f)
for o in [src, src_root] + [o for o in bpy.data.objects if o.parent == src]:
    bpy.data.objects.remove(o, do_unlink=True)
for o in tgt.children: o.hide_viewport = False

# --- Walk path: from the far end of the street toward the camera, sun at his back -----------
SPEED = 0.071 * RATIO  # metres per frame, scaled from the source cycle's stride
end = Vector((0.35, 0.4, 0)); heading = Vector((0.28, -1, 0)).normalized()
start = end - heading * SPEED * (F1 - F0)
walker = bpy.data.objects.new("walker", None); sc.collection.objects.link(walker)
tgt.parent = walker; tgt.location = (0, 0, 0)
walker.rotation_euler.z = math.atan2(heading.y, heading.x) + math.pi / 2  # rig faces -Y
for f, p in [(F0, start), (F1, end)]:
    walker.location = p; walker.keyframe_insert("location", frame=f)
for fc in walker.animation_data.action.fcurves:
    for k in fc.keyframe_points: k.interpolation = 'LINEAR'

# --- World: golden-hour HDRI, rotated so the sun sits behind him -------------------------------
w = bpy.data.worlds.new("sunset"); sc.world = w; w.use_nodes = True
wn = w.node_tree; bg = wn.nodes["Background"]
env = wn.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(os.path.join(A, "sunset.hdr"))
wmap = wn.nodes.new("ShaderNodeMapping"); wmap.inputs["Rotation"].default_value = (0, 0, math.radians(-115))  # sun (az -30deg in the file) ends up at az 85deg, behind him
wn.links.new(wn.nodes.new("ShaderNodeTexCoord").outputs["Generated"], wmap.inputs["Vector"])
wn.links.new(wmap.outputs["Vector"], env.inputs["Vector"]); wn.links.new(env.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 1.0

# Ground: shadow catcher shows the photographed cobblestones with his shadow and bounce light
bpy.ops.mesh.primitive_plane_add(size=60); ground = bpy.context.object
ground.is_shadow_catcher = True

# Golden rim: a sun lamp exactly along the HDRI sun (az 85deg, el 18deg) to make the backlight read on hair and shoulders
bpy.ops.object.light_add(type='SUN'); rim = bpy.context.object
rim.data.energy = 3.0; rim.data.color = (1.0, 0.72, 0.42); rim.data.angle = math.radians(1.5)
rim.data.use_shadow = False  # the HDRI sun already casts the shadow; a second one would double it
sun_dir = Vector((math.cos(math.radians(85)) * math.cos(math.radians(18)), math.sin(math.radians(85)) * math.cos(math.radians(18)), math.sin(math.radians(18))))
rim.rotation_euler = (-sun_dir).to_track_quat('-Z', 'Y').to_euler()

# Soft warm bounce from the sunlit pavement in front of him, so his face isn't pitch black
bpy.ops.object.light_add(type='AREA', location=(0.6, -1.5, 0.3)); fill = bpy.context.object
fill.data.size = 2.5; fill.data.energy = 60; fill.data.color = (1.0, 0.78, 0.55)
fill.rotation_euler = (Vector((0.3, 1.5, 1.4)) - fill.location).to_track_quat('-Z', 'Y').to_euler()
fill.visible_camera = False

# --- Camera: tripod at eye height, pans to follow him; long lens, shallow focus ---------------
bpy.ops.object.empty_add(); aim = bpy.context.object
aim.parent = walker; aim.location = (0, 0, 1.05)
bpy.ops.object.camera_add(location=(1.1, -3.4, 1.62)); cam = bpy.context.object; sc.camera = cam
cam.data.lens = 40; cam.data.dof.use_dof = True; cam.data.dof.focus_object = aim; cam.data.dof.aperture_fstop = 2.8
cam.constraints.new('TRACK_TO').target = aim

# --- Render ------------------------------------------------------------------------------------
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.03
sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPENIMAGEDENOISE'
sc.cycles.max_bounces = 6; sc.cycles.transparent_max_bounces = 12  # hair cards need a few transparency hits
sc.render.film_transparent = False
sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 0.5
sc.render.resolution_x, sc.render.resolution_y = 1280, 720; sc.render.resolution_percentage = RES
sc.frame_step = STEP
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.view_settings.exposure = 0.7
sc.render.use_persistent_data = True
# Bloom around the sun-lit highlights, like a real lens
sc.use_nodes = True
ct = sc.node_tree; rl = ct.nodes["Render Layers"]; comp = ct.nodes["Composite"]
glare = ct.nodes.new("CompositorNodeGlare"); glare.glare_type = 'FOG_GLOW'; glare.quality = 'MEDIUM'
glare.threshold = 1.2; glare.mix = -0.75; glare.size = 8
ct.links.new(rl.outputs["Image"], glare.inputs["Image"]); ct.links.new(glare.outputs["Image"], comp.inputs["Image"])
sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = OUT
if MODE == "anim":
    bpy.ops.render.render(animation=True)
else:
    sc.frame_set(STILL_FRAME); bpy.ops.render.render(write_still=True)
