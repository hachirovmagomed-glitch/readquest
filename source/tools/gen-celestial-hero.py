#!/usr/bin/env python3
"""Небесный: герои (девушка и парень) и их одежда (Джессика 20.10: «вот они будут основными персонажами»).

Вход: handoff/hero-celestial/outfits — пакет Джессики (INSTRUCTION.md): базы bases/base-<who>.trim.png,
      вещи items/<вещь>/<вещь>-<who>.gray.trim.png (серый слой: R — затенение, A — маска) и .details.trim.png
      (маска швов и шнурков), смещения *.trim.json на общем холсте 4096×6144, палитра palette.json;
      питомцы — из листа handoff/hero-celestial/items/items-companions.jpg.
Выход: source/hero/celestial/hero/*.webp и source/js/hero-celestial.js.
Перекраска — в приложении на canvas по формуле пакета (web/recolor.js), один раз на цвет, с кешем.
Запуск: python3 -I source/tools/gen-celestial-hero.py   (нужны numpy, Pillow, scipy)
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PKG = os.path.join(ROOT, 'handoff', 'hero-celestial', 'outfits')
PETS = os.path.join(ROOT, 'handoff', 'hero-celestial', 'items', 'items-companions.jpg')
OUT = os.path.join(ROOT, 'source', 'hero', 'celestial', 'hero')
JS = os.path.join(ROOT, 'source', 'js', 'hero-celestial.js')
SCALE = 0.2                    # от холста 4096×6144: герой ~1200 px в высоту, в профиле хватает с запасом
HEROES = [('girl', 'Девушка'), ('boy', 'Парень')]
ITEMS = [('hoodie', 'top', 'Толстовка с капюшоном')]
PETS_CAT = [('cp-owl', 1, 'Звёздная сова'), ('cp-moth', 5, 'Бумажный мотылёк'), ('cp-fox', 7, 'Лис-комета'),
            ('cp-cat', 8, 'Облачный кот'), ('cp-jelly', 14, 'Чернильная медуза'), ('cp-dragon', 11, 'Книжный дракон')]
PET_BOX = (3450, 1500, 700)    # питомец у плеча: центр и ширина на холсте


def white_bg(im):
    a = np.asarray(im.convert('RGB')).astype(int); mn, mx = a.min(2), a.max(2)
    return (mn >= 236) & (mx - mn <= 16)


def outside(white):
    lab, _ = ndimage.label(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    return np.isin(lab, list(border))


def cut_sheet(path):
    """Вещи листа слева направо, сверху вниз."""
    im = Image.open(path).convert('RGB'); fg = ~outside(white_bg(im))
    lab, _ = ndimage.label(ndimage.binary_dilation(fg, iterations=6))
    boxes = [s for s in ndimage.find_objects(lab) if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) >= 1500]
    boxes.sort(key=lambda s: (s[0].start + s[0].stop) / 2); rows = []
    for s in boxes:
        cy = (s[0].start + s[0].stop) / 2
        if rows and abs(cy - rows[-1][0]) < im.height * 0.15: rows[-1][1].append(s)
        else: rows.append([cy, [s]])
    rgba = im.convert('RGBA'); rgba.putalpha(Image.fromarray(np.where(fg, 255, 0).astype(np.uint8)))
    out = []
    for _, r in rows:
        for s in sorted(r, key=lambda s: s[1].start):
            c = rgba.crop((s[1].start, s[0].start, s[1].stop, s[0].stop)); out.append(c.crop(c.getbbox()))
    return out


def tidy(a, keep):
    m = a[:, :, 3] > 20; lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=2))
    if n > 1:
        sz = ndimage.sum(m, lab, range(1, n + 1))
        a[~np.isin(lab, [i + 1 for i, s in enumerate(sz) if s >= keep * sz.max()]), 3] = 0
    return a


def put(path, name, lossless=False):
    im = Image.open(path); w, h = im.size
    im.resize((max(1, round(w * SCALE)), max(1, round(h * SCALE))), Image.LANCZOS) \
        .save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6, lossless=lossless)


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
    pal = json.load(open(os.path.join(PKG, 'palette.json'), encoding='utf-8'))
    bodies, items = {}, {}
    for who, title in HEROES:
        t = json.load(open(os.path.join(PKG, 'bases', 'base-%s.trim.json' % who)))
        put(os.path.join(PKG, 'bases', 'base-%s.trim.png' % who), 'base-' + who)
        bodies[who] = {'name': title, 'base': ['base-' + who, t['x'], t['y'], t['w'], t['h']]}
    canvas = t['canvas']
    for iid, slot, name in ITEMS:
        lay = {}
        for who, _ in HEROES:
            d = os.path.join(PKG, 'items', iid); t = json.load(open(os.path.join(d, '%s-%s.trim.json' % (iid, who))))
            put(os.path.join(d, '%s-%s.gray.trim.png' % (iid, who)), '%s-%s-g' % (iid, who))
            put(os.path.join(d, '%s-%s.details.trim.png' % (iid, who)), '%s-%s-d' % (iid, who))
            lay[who] = ['%s-%s' % (iid, who), t['x'], t['y'], t['w'], t['h']]
        items['cw-' + iid] = {'slot': slot, 'name': name, 'l': lay}
    sheet = cut_sheet(PETS); pets = {}
    for iid, n, name in PETS_CAT:
        im = tidy(np.array(sheet[n - 1]), 0.02); h = round(im.shape[0] * PET_BOX[2] / im.shape[1])
        Image.fromarray(im).resize((round(PET_BOX[2] * SCALE * 1.2), round(h * SCALE * 1.2)), Image.LANCZOS) \
            .save(os.path.join(OUT, iid + '.webp'), 'WEBP', quality=86, method=6)
        pets[iid] = {'name': name, 'p': [iid, PET_BOX[0] - PET_BOX[2] // 2, PET_BOX[1] - h // 2, PET_BOX[2], h]}
    top = min(b['base'][2] for b in bodies.values()); bot = max(b['base'][2] + b['base'][4] for b in bodies.values())
    sc = 86 / (bot - top)
    data = {'canvas': canvas, 'sc': round(sc, 7), 'x0': round(39 - canvas[0] / 2 * sc, 3), 'y0': round(99 - bot * sc, 3),
            'mid': pal['mid'], 'palette': pal['colors'], 'bodies': bodies, 'items': items, 'pets': pets}
    with open(JS, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n/* Сгенерировано source/tools/gen-celestial-hero.py из handoff/hero-celestial/outfits (пакет Джессики, 20.10). Не править руками.\n"
                "   Слой [картинка, x, y, w, h] на холсте 4096×6144; вещь — серый слой «-g» и маска деталей «-d», цвет считается в приложении. */\n")
        f.write('const HERO_CEL_ART=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print('files', len(os.listdir(OUT)), 'KB', total // 1000)


if __name__ == '__main__':
    sys.exit(main())
