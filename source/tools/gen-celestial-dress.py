#!/usr/bin/env python3
"""Небесный: одежда героя слоями на четырёх манекенах (Джессика 20.10, «перерисовать на манекене»).

Вход: handoff/hero-celestial/dress/<тело>/ — maneken.png, layers/layer-<слот>.png, anchors.json
      (примерочная Джессики: каждая вещь нарисована прямо на манекене и вырезана на общем холсте 864×1152,
      см. dress/INSTRUKTSIYA-dlya-Claude.md); питомцы — из листа handoff/hero-celestial/items/items-companions.jpg.
Выход: source/hero/celestial/dress/*.webp и source/js/hero-celestial.js.
Слой обрезается по своей рамке, но лежит в координатах холста, поэтому сборка — это просто стопка картинок.
Золото и камни (оттенок 35–60°, насыщенность > 0.35) вынесены в отдельную картинку «-t»: она не перекрашивается.
Запуск: python3 -I source/tools/gen-celestial-dress.py   (нужны numpy, Pillow, scipy)
"""
import colorsys, json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DRESS = os.path.join(ROOT, 'handoff', 'hero-celestial', 'dress')
PETS = os.path.join(ROOT, 'handoff', 'hero-celestial', 'items', 'items-companions.jpg')
OUT = os.path.join(ROOT, 'source', 'hero', 'celestial', 'dress')
JS = os.path.join(ROOT, 'source', 'js', 'hero-celestial.js')
SCALE = 0.6                       # картинки в 0.6 от холста: герой в профиле ~300 px на телефоне
# тело → (id в приложении, подпись); подростки стоят в 0.88 от взрослых
BODIES = [('devushka', 'af', 'Девушка'), ('paren', 'am', 'Парень'), ('devochka', 'tf', 'Девочка'), ('malchik', 'tm', 'Мальчик')]
SLOT = {'headwear': 'head', 'cape': 'cloak', 'top': 'top', 'bottom': 'bottom', 'gloves': 'gloves',
        'boots': 'shoes', 'main-hand': 'hand', 'accessory': 'acc'}
NAMES = {
    'af': {'headwear': 'Диадема-полумесяц', 'cape': 'Голубой плащ с капюшоном', 'top': 'Фиолетовый корсаж', 'bottom': 'Белая плиссе',
           'gloves': 'Длинные белые перчатки', 'boots': 'Белые ботфорты', 'main-hand': 'Фонарь-компас', 'accessory': 'Кулон «лунный камень»'},
    'am': {'headwear': 'Корона со звёздным камнем', 'cape': 'Плащ «ночное небо»', 'top': 'Синий фрак', 'bottom': 'Белые брюки',
           'gloves': 'Синие перчатки со звёздами', 'boots': 'Тёмно-синие сапоги', 'main-hand': 'Рапира', 'accessory': 'Брошь с синей звездой'},
    'tf': {'headwear': 'Белый берет со звездой', 'cape': 'Оранжевая накидка', 'top': 'Белый жакет', 'bottom': 'Тёмно-синие шорты',
           'gloves': 'Перчатки с оранжевыми крагами', 'boots': 'Фиолетовые сапоги', 'main-hand': 'Колба с чернилами', 'accessory': 'Аметистовая звезда'},
    'tm': {'headwear': 'Ночной колпак', 'cape': 'Серая мантия', 'top': 'Пижамная рубашка', 'bottom': 'Пижамные брюки',
           'gloves': 'Кожаные перчатки', 'boots': 'Тапки-сапожки', 'main-hand': 'Лира-звезда', 'accessory': 'Нефрит на ленте'},
}
KEEP = {'accessory': 0.08}        # у украшений в слой попадают обрывки воротника
PETS_CAT = [('cp-owl', 1, 'Звёздная сова'), ('cp-moth', 5, 'Бумажный мотылёк'), ('cp-fox', 7, 'Лис-комета'),
            ('cp-cat', 8, 'Облачный кот'), ('cp-jelly', 14, 'Чернильная медуза'), ('cp-dragon', 11, 'Книжный дракон')]
PET_BOX = (650, 270, 130)         # питомец у плеча: центр и ширина на холсте


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


def trim_mask(a):
    """Золото и камни: тёплый жёлтый высокой насыщенности (не перекрашивать)."""
    rgb = a[:, :, :3].astype(float) / 255; mx, mn = rgb.max(2), rgb.min(2); d = mx - mn + 1e-6
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return (h >= 35) & (h <= 60) & (s > 0.35) & (a[:, :, 3] > 0)


def native_hex(a):
    m = a[:, :, 3] > 128; px = a[m][:, :3].astype(float) / 255
    if not len(px): return '#888888'
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in px[::max(1, len(px) // 4000)]])
    sat = hsv[hsv[:, 1] >= np.percentile(hsv[:, 1], 70)]
    ang = sat[:, 0] * 2 * np.pi; h = (np.arctan2(np.sin(ang).mean(), np.cos(ang).mean()) / (2 * np.pi)) % 1
    r, g, b = colorsys.hsv_to_rgb(h, float(np.median(sat[:, 1])), float(np.median(sat[:, 2])))
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))


def save(a, name, box=None):
    im = Image.fromarray(a); box = box or im.getbbox()
    if not box: return None
    c = im.crop(box); c.resize((max(1, round(c.width * SCALE)), max(1, round(c.height * SCALE))), Image.LANCZOS) \
        .save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=86, method=6)
    return [name, box[0], box[1], box[2] - box[0], box[3] - box[1]]


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
    bodies, meta, items, order = {}, {}, [], None
    for folder, bid, title in BODIES:
        d = os.path.join(DRESS, folder); anc = json.load(open(os.path.join(d, 'anchors.json'), encoding='utf-8'))
        order = order or anc['draw_order']; z = {k: i for i, k in enumerate(anc['draw_order'])}
        W, H = anc['canvas']; fx0, fy0, fx1, fy1 = anc['figure_bbox']
        man = Image.open(os.path.join(d, anc['maneken'])).convert('RGBA'); a = np.array(man)
        a[:, :, 3] = np.where(ndimage.binary_fill_holes(~outside(white_bg(man))), 255, 0)
        parts = {'base': [save(a, 'base-' + bid) + [z['body']]]}
        for slot, app in SLOT.items():
            iid = 'cd-' + bid + '-' + slot.replace('main-', '')
            split = os.path.exists(os.path.join(d, 'layers', 'layer-cape-front.png')) and slot == 'cape'
            layers = [('cape-back', 'b'), ('cape-front', 'f')] if split else [(slot, '')]
            rec, natives = [], []
            for lay, suf in layers:
                la = tidy(np.array(Image.open(os.path.join(d, 'layers', 'layer-' + lay + '.png')).convert('RGBA')), KEEP.get(slot, 0.02))
                zz = z['cape-front' if lay == 'cape' else lay]; box = Image.fromarray(la).getbbox()
                tm = trim_mask(la); main_, trim = la.copy(), la.copy(); main_[tm, 3] = 0; trim[~tm, 3] = 0
                if tm.sum() < 0.9 * (la[:, :, 3] > 0).sum(): natives.append(main_)
                for arr, t in ((main_, ''), (trim, 't')):
                    if (arr[:, :, 3] > 0).sum() < 30: continue
                    r = save(arr, iid + ('-' + suf if suf else '') + ('-t' if t else ''), box)
                    rec.append(r + [zz, 1 if t else 0])
            parts[iid] = rec
            nat = np.concatenate([n.reshape(-1, 4) for n in natives])[None] if natives else np.zeros((1, 1, 4), np.uint8)
            meta[iid] = {'c': native_hex(nat)}
            items.append({'id': iid, 'slot': app, 'name': NAMES[bid][slot], 'body': bid})
        k = anc.get('engine_scale', 1.0); sc = 82 * k / (fy1 - fy0)
        bodies[bid] = {'name': title, 'sc': round(sc, 6), 'x0': round(39 - W / 2 * sc, 3), 'y0': round(99 - fy1 * sc, 3), 'p': parts}
    sheet = cut_sheet(PETS); pz = len(order)
    for iid, n, name in PETS_CAT:
        im = tidy(np.array(sheet[n - 1]), 0.02); h = round(im.shape[0] * PET_BOX[2] / im.shape[1])
        x, y = PET_BOX[0] - PET_BOX[2] // 2, PET_BOX[1] - h // 2
        Image.fromarray(im).resize((round(PET_BOX[2] * SCALE * 1.4), round(h * SCALE * 1.4)), Image.LANCZOS) \
            .save(os.path.join(OUT, iid + '.webp'), 'WEBP', quality=86, method=6)
        meta[iid] = {'c': native_hex(im), 'pet': [iid, x, y, PET_BOX[2], h, pz, 0]}
        items.append({'id': iid, 'slot': 'pet', 'name': name})
    data = {'meta': meta, 'bodies': bodies}
    with open(JS, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n/* Сгенерировано source/tools/gen-celestial-dress.py из handoff/hero-celestial/dress (примерочная Джессики, 20.10). Не править руками.\n"
                "   bodies.<тело>.p.<вещь> = [[картинка, x, y, w, h, слой, золото]] на холсте 864×1152; meta.<вещь>.c — родной цвет. */\n")
        f.write('const HERO_CEL_ART=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
        f.write('const HERO_CEL_ITEMS=' + json.dumps(items, ensure_ascii=False, separators=(',', ':')) + ';\n')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print('items', len(items), 'files', len(os.listdir(OUT)), 'KB', total // 1000)


if __name__ == '__main__':
    sys.exit(main())
