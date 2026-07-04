# Headless Blender export: ~/sailboatBLACK.blend -> public/boat/sailboat.glb
#
#   npm run boat:export
#   (= Blender --background ~/sailboatBLACK.blend --python scripts/export-boat.py -- --out public/boat/sailboat.glb)
#
# Normalizes the sculpture for the /boat scene: hull length = 1.0 unit, origin at
# the waterline mid-hull, meshes renamed Hull/Sail so runtime code can address
# them, glTF's default Z-up -> Y-up conversion left on. Keeps the two meshes and
# their material slots separate (chromeSweepMaterial replaces materials at load,
# but hull-vs-sail identity drives the choreography).
import bpy
import sys
from mathutils import Vector

# Fraction of the hull's height (from its bottom) treated as the waterline.
# Tuned by eye against the sculpture's proportions; scene code assumes y=0 here.
WATERLINE_FRAC = 0.15

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out_path = argv[argv.index('--out') + 1] if '--out' in argv else 'public/boat/sailboat.glb'

meshes = [o for o in bpy.data.objects if o.type == 'MESH']
assert len(meshes) == 2, f'expected 2 meshes, found {[o.name for o in meshes]}'

for o in bpy.data.objects:
    o.select_set(o.type == 'MESH')
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def world_bounds(objs):
    lo = Vector((1e18,) * 3)
    hi = Vector((-1e18,) * 3)
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    return lo, hi


# The hull is the low, flat mesh; the sail is the tall blade.
meshes.sort(key=lambda o: (world_bounds([o])[1].z - world_bounds([o])[0].z))
hull, sail = meshes
hull.name = hull.data.name = 'Hull'
sail.name = sail.data.name = 'Sail'

h_lo, h_hi = world_bounds([hull])
scale = 1.0 / (h_hi.y - h_lo.y)  # hull length (Blender Y) becomes 1.0
for o in (hull, sail):
    o.scale = (scale, scale, scale)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

h_lo, h_hi = world_bounds([hull])
waterline_z = h_lo.z + WATERLINE_FRAC * (h_hi.z - h_lo.z)
offset = Vector(((h_lo.x + h_hi.x) / 2, (h_lo.y + h_hi.y) / 2, waterline_z))
for o in (hull, sail):
    o.location -= offset
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

j_lo, j_hi = world_bounds([hull, sail])
print(f'BOAT hull_len=1.0 joint_bounds=({tuple(round(v, 3) for v in j_lo)}, '
      f'{tuple(round(v, 3) for v in j_hi)}) waterline=z0')
for o in (hull, sail):
    lo, hi = world_bounds([o])
    print(f'BOAT {o.name}: verts={len(o.data.vertices)} '
          f'size=({round(hi.x - lo.x, 3)}, {round(hi.y - lo.y, 3)}, {round(hi.z - lo.z, 3)})')

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=True,  # meshes only — not the .blend's camera/light
    export_apply=True,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
    export_normals=True,
)
print(f'BOAT exported {out_path}')
