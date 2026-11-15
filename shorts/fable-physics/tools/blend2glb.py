"""Convert a downloaded game model (.blend/.fbx/.obj/.gltf) to one .glb with its animations, for three.js.
  blender -b -P blend2glb.py -- <in> <out.glb>        (a .blend is opened directly; other formats are imported)
Prints the animation names so scenes can call them (Idle, Walk, Fly, Attack ...)."""
import sys, os, bpy
src, out = sys.argv[sys.argv.index('--') + 1:][:2]
ext = os.path.splitext(src)[1].lower()
if ext == '.blend':
    bpy.ops.wm.open_mainfile(filepath=src)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    {'.fbx': lambda: bpy.ops.import_scene.fbx(filepath=src),
     '.obj': lambda: bpy.ops.wm.obj_import(filepath=src),
     '.gltf': lambda: bpy.ops.import_scene.gltf(filepath=src),
     '.glb': lambda: bpy.ops.import_scene.gltf(filepath=src)}[ext]()
for o in list(bpy.data.objects):          # drop scene cameras/lights: our shots bring their own
    if o.type in ('CAMERA', 'LIGHT'): bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True,
                          export_animation_mode='ACTIONS', export_apply=False)
print('ANIMS', [a.name for a in bpy.data.actions])
