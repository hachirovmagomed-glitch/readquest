#!/usr/bin/env python3
"""Ужать VRM из VRoid Studio для приложения (3D-герой Небесного).

Что убирается: морфы (VRoid кладёт ~500 форм лица — это 20 МБ из 29), выражения и lookAt, которые на них
ссылаются; текстуры больше --max сжимаются, без прозрачности — в JPEG; миниатюра — до 256 px.
--clothes: файл наряда, из сеток остаются только одежда (*_Tops_*, *_Bottoms_*, *_Shoes_*, *_Accessory_*) —
голову, волосы и тело берём у базы (hero/hero-vrm.mjs).
Запуск: python3 -I source/tools/slim-vrm.py IN.vrm OUT.vrm [--max 1024] [--clothes]
"""
import io, json, re, struct, sys
from PIL import Image

CLOTH = re.compile(r'_(Tops|Bottoms|Shoes|Accessory)_')


def read_glb(p):
    d = open(p, 'rb').read()
    assert d[:4] == b'glTF', 'not a GLB'
    n = struct.unpack('<I', d[12:16])[0]
    j = json.loads(d[20:20 + n])
    o = 20 + n
    bn = struct.unpack('<I', d[o:o + 4])[0]
    return j, d[o + 8:o + 8 + bn]


def write_glb(p, j, blob):
    js = json.dumps(j, ensure_ascii=False, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    blob += b'\0' * (-len(blob) % 4)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob))
    out += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + blob
    open(p, 'wb').write(out)


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    src, dst = args[0], args[1]
    mx = int(argv[argv.index('--max') + 1]) if '--max' in argv else 1024
    if '--max' in argv:
        args.remove(str(mx))
    clothes = '--clothes' in argv
    j, b = read_glb(src)
    vrm = j.get('extensions', {}).get('VRMC_vrm')
    assert vrm, 'VRM 1.0 only (VRoid Studio exports VRM 1.0)'

    # 1. морфы и всё, что на них держится
    for m in j['meshes']:
        m.pop('weights', None)
        (m.get('extras') or {}).pop('targetNames', None)
        for pr in m['primitives']:
            pr.pop('targets', None)
            (pr.get('extras') or {}).pop('targetNames', None)
    vrm.pop('expressions', None)
    vrm.pop('lookAt', None)

    # 2. наряд: только одежда
    if clothes:
        matname = lambda i: j['materials'][i].get('name', '') if i is not None else ''
        keep_mesh = {i for i, m in enumerate(j['meshes']) if any(CLOTH.search(matname(p.get('material'))) for p in m['primitives'])}
        for nd in j['nodes']:
            if 'mesh' in nd and nd['mesh'] not in keep_mesh:
                nd.pop('mesh'); nd.pop('skin', None)
        vrm.pop('firstPerson', None)

    # 3. что ещё используется
    used_mesh = sorted({nd['mesh'] for nd in j['nodes'] if 'mesh' in nd})
    mesh_map = {o: n for n, o in enumerate(used_mesh)}
    j['meshes'] = [j['meshes'][i] for i in used_mesh]
    for nd in j['nodes']:
        if 'mesh' in nd:
            nd['mesh'] = mesh_map[nd['mesh']]
    used_skin = sorted({nd['skin'] for nd in j['nodes'] if 'skin' in nd})
    skin_map = {o: n for n, o in enumerate(used_skin)}
    j['skins'] = [j['skins'][i] for i in used_skin]
    for nd in j['nodes']:
        if 'skin' in nd:
            nd['skin'] = skin_map[nd['skin']]
    used_mat = sorted({p['material'] for m in j['meshes'] for p in m['primitives'] if 'material' in p})
    mat_map = {o: n for n, o in enumerate(used_mat)}
    j['materials'] = [j['materials'][i] for i in used_mat]
    for m in j['meshes']:
        for p in m['primitives']:
            if 'material' in p:
                p['material'] = mat_map[p['material']]

    def tex_refs(o, acc):  # все {"index": N} внутри *Texture / *Texture-подобных объектов материалов
        if isinstance(o, dict):
            for k, v in o.items():
                if isinstance(v, dict) and 'index' in v and ('texture' in k.lower() or k.lower().endswith('map')):
                    acc.append(v)
                tex_refs(v, acc)
        elif isinstance(o, list):
            for v in o:
                tex_refs(v, acc)
        return acc
    refs = tex_refs(j['materials'], [])
    used_tex = sorted({r['index'] for r in refs})
    tex_map = {o: n for n, o in enumerate(used_tex)}
    for r in refs:
        r['index'] = tex_map[r['index']]
    j['textures'] = [j['textures'][i] for i in used_tex]
    thumb = vrm['meta'].get('thumbnailImage')
    used_img = sorted({t['source'] for t in j['textures']} | ({thumb} if thumb is not None else set()))
    img_map = {o: n for n, o in enumerate(used_img)}
    for t in j['textures']:
        t['source'] = img_map[t['source']]
    if thumb is not None:
        vrm['meta']['thumbnailImage'] = img_map[thumb]
    imgs = [j['images'][i] for i in used_img]
    used_samplers = sorted({t['sampler'] for t in j['textures'] if 'sampler' in t})
    smp_map = {o: n for n, o in enumerate(used_samplers)}
    for t in j['textures']:
        if 'sampler' in t:
            t['sampler'] = smp_map[t['sampler']]
    if 'samplers' in j:
        j['samplers'] = [j['samplers'][i] for i in used_samplers]

    acc_ids = set()
    for m in j['meshes']:
        for p in m['primitives']:
            acc_ids |= set(p['attributes'].values())
            if 'indices' in p:
                acc_ids.add(p['indices'])
    for s in j['skins']:
        if 'inverseBindMatrices' in s:
            acc_ids.add(s['inverseBindMatrices'])
    assert not j.get('animations'), 'animations not handled'
    used_acc = sorted(acc_ids)
    acc_map = {o: n for n, o in enumerate(used_acc)}
    accs = [j['accessors'][i] for i in used_acc]
    for m in j['meshes']:
        for p in m['primitives']:
            p['attributes'] = {k: acc_map[v] for k, v in p['attributes'].items()}
            if 'indices' in p:
                p['indices'] = acc_map[p['indices']]
    for s in j['skins']:
        if 'inverseBindMatrices' in s:
            s['inverseBindMatrices'] = acc_map[s['inverseBindMatrices']]

    # 4. новый буфер: нужные куски геометрии + пережатые картинки
    blob = bytearray(); views = []
    def put(data, extra):
        while len(blob) % 4:
            blob.append(0)
        views.append(dict(buffer=0, byteOffset=len(blob), byteLength=len(data), **extra)); blob.extend(data)
        return len(views) - 1
    vmap = {}
    for a in accs:
        if 'bufferView' in a:
            ov = a['bufferView']
            if ov not in vmap:
                v = j['bufferViews'][ov]; s = v.get('byteOffset', 0)
                vmap[ov] = put(b[s:s + v['byteLength']], {k: v[k] for k in ('byteStride', 'target') if k in v})
            a['bufferView'] = vmap[ov]
    for n, im in enumerate(imgs):
        v = j['bufferViews'][im['bufferView']]; s = v.get('byteOffset', 0)
        raw = b[s:s + v['byteLength']]
        pic = Image.open(io.BytesIO(raw)); pic.load()
        lim = 256 if n == vrm['meta'].get('thumbnailImage') else mx
        if max(pic.size) > lim:
            k = lim / max(pic.size)
            pic = pic.resize((max(1, round(pic.width * k)), max(1, round(pic.height * k))), Image.LANCZOS)
        has_alpha = pic.mode in ('RGBA', 'LA', 'P') and pic.convert('RGBA').getextrema()[3][0] < 255
        out = io.BytesIO()
        if has_alpha or max(pic.size) <= 64:
            pic.save(out, 'PNG', optimize=True); mime = 'image/png'
        else:
            pic.convert('RGB').save(out, 'JPEG', quality=86, optimize=True); mime = 'image/jpeg'
        data = out.getvalue()
        if len(data) >= len(raw) and pic.size == Image.open(io.BytesIO(raw)).size:
            data, mime = raw, im.get('mimeType', 'image/png')
        im['bufferView'] = put(data, {}); im['mimeType'] = mime
    j['accessors'] = accs; j['images'] = imgs; j['bufferViews'] = views
    j['buffers'] = [{'byteLength': len(blob)}]
    write_glb(dst, j, bytes(blob))
    print(dst, len(blob) // 1000, 'KB;', len(j['meshes']), 'meshes,', len(imgs), 'images')


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
