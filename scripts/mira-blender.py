import bpy, bmesh, math, sys
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)

def arc(cx, cz, r, a0, a1, n):
    return [(cx + r*math.cos(a0+(a1-a0)*i/n), cz + r*math.sin(a0+(a1-a0)*i/n)) for i in range(n+1)]

def lathe(name, prof, seg=128, close_axis=True):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    rings = []
    for r, z in prof:
        ring = []
        for k in range(seg):
            a = 2*math.pi*k/seg
            ring.append(bm.verts.new((r*math.cos(a), r*math.sin(a), z)))
        rings.append(ring)
    for i in range(len(rings)-1):
        for k in range(seg):
            a, b = rings[i][k], rings[i][(k+1)%seg]; c, d = rings[i+1][(k+1)%seg], rings[i+1][k]
            if prof[i][0] < 1e-6 and prof[i+1][0] < 1e-6: continue
            try: bm.faces.new((a, b, c, d) if prof[i][0] > 1e-6 and prof[i+1][0] > 1e-6 else ((a, c, d) if prof[i][0] < 1e-6 else (a, b, d)))
            except ValueError: pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    for p in me.polygons: p.use_smooth = True
    return o

# vidrio: cuerpo grueso con borde redondeado y plato cóncavo al frente (eje Z mira a la cámara)
RO, T = 1.0, .22
prof = [(0, -T)]
prof += arc(RO-.16, -T+.14, .14, -math.pi/2, 0, 10)[0:]          # esquina trasera
prof += arc(RO-.16, T-.16, .16, 0, math.pi/2, 12)[1:]             # esquina delantera -> borde del plato
prof += [(.88, T), (.84, T-.02), (.80, T-.06)]
prof += [(.70, T-.095), (.40, T-.115), (.20, T-.125), (0, T-.127)]
glass = lathe('MIRA_vidrio', prof)
glass.name = 'MIRA_vidrio'

# disco metálico cepillado, apoyado en el fondo del plato (cúpula suave)
mp = [(0, .115)] + [(r, .115 - .022*(r/.78)**2) for r in [.12, .25, .4, .55, .7, .78]] + [(.78, .04), (0, .04)]
metal = lathe('MIRA_metal', mp, 96); metal.name = 'MIRA_metal'

# LED
bpy.ops.mesh.primitive_uv_sphere_add(radius=.042, location=(0, 0, .125), segments=24, ring_count=16)
led = bpy.context.object; led.name = 'MIRA_led'; bpy.ops.object.shade_smooth()

# argolla de vidrio (eje X: el cordón la atraviesa de lado a lado)
bpy.ops.mesh.primitive_torus_add(major_radius=.15, minor_radius=.055, major_segments=48, minor_segments=24, location=(0, 1.1, 0), rotation=(0, math.pi/2, 0))
bail = bpy.context.object; bail.name = 'MIRA_argolla'; bpy.ops.object.shade_smooth()
# cuello: une la argolla con el cuerpo
bpy.ops.mesh.primitive_cylinder_add(radius=.075, depth=.2, location=(0, .98, 0), rotation=(0, math.pi/2, 0), vertices=32)
neck = bpy.context.object; neck.name = 'MIRA_cuello'; bpy.ops.object.shade_smooth()
neck.rotation_euler = (0, 0, 0)

def mat(name, base, metallic=0, rough=.3, trans=0, ior=1.45, emis=None, es=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = base; b.inputs['Metallic'].default_value = metallic; b.inputs['Roughness'].default_value = rough
    b.inputs['IOR'].default_value = ior
    if trans: b.inputs['Transmission Weight'].default_value = trans
    if emis: b.inputs['Emission Color'].default_value = emis; b.inputs['Emission Strength'].default_value = es
    return m
glassm = mat('MIRA_vidrio_mat', (.55, .65, .82, 1), 0, .04, 1.0, 1.5)
metalm = mat('MIRA_metal_mat', (.10, .105, .115, 1), 1, .5)
ledm = mat('MIRA_led_mat', (.6, .8, 1, 1), 0, .2, 0, 1.45, (.25, .55, 1, 1), 40)
for o, m in ((glass, glassm), (bail, glassm), (neck, glassm), (metal, metalm), (led, ledm)):
    o.data.materials.append(m)

# exportar solo el colgante
bpy.ops.object.select_all(action='DESELECT')
for o in (glass, metal, led, bail, neck): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=sys.argv[5], use_selection=True, export_format='GLB', export_apply=True, export_yup=False, export_materials='EXPORT', export_cameras=False, export_lights=False)

# prueba de render en Blender para comparar con el concepto
if len(sys.argv) > 6:
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.device = 'CPU'
    sc.render.resolution_x = sc.render.resolution_y = 700
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.85, .9, .97, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.2
    for loc, e in (((-3, -3, 4), 400), ((4, -2, 2), 250)):
        bpy.ops.object.light_add(type='AREA', location=loc); L = bpy.context.object; L.data.energy = e; L.data.size = 3
        d = Vector((0, 0, 0)) - L.location; L.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.camera_add(location=(0, .15, 6.2)); cam = bpy.context.object; cam.data.lens = 85; sc.camera = cam
    cam.rotation_euler = (math.radians(90), 0, 0); cam.location = (0, -6.2, .25)
    # Blender: Z arriba; el colgante está en XY con eje Z hacia el frente => giramos para mirarlo desde +Z
    cam.location = (0, .25, 6.2); cam.rotation_euler = (0, 0, 0)
    sc.render.filepath = sys.argv[6]; bpy.ops.render.render(write_still=True)
