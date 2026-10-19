#!/usr/bin/env python3
"""Небесный: вещи по слотам на манекене (Джессика 20.10: «отойдём от 3D… попробуем 2D-кастомизацию»).

Вход: handoff/hero-celestial/items/items-*.jpg (листы вещей из архива Джессики, порядок — бриф, раздел 6),
      handoff/hero-celestial/bodies/base-adult.jpg (манекен: взрослая девушка справа),
      source/tools/celestial-fit-adult-f.json (подгонка каждой вещи на манекен, правится руками).
Выход: source/hero/celestial/wear/*.webp (манекен, рука, вещи) и source/js/hero-celestial.js
      (где лежит каждая вещь на холсте манекена, слой, родной цвет для перекраски).
Вещь — бумажная кукла: картинка из листа, растянутая в рамку на теле. Перчатки — две половинки, на каждую кисть.
Предмет в руке рисуется под пальцами манекена (слой «рука»), чтобы держал, а не «входил в руку».
Запуск: python3 -I source/tools/gen-celestial-wear.py   (нужны numpy, Pillow, scipy)
"""
import colorsys, json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHEETS = os.path.join(ROOT, 'handoff', 'hero-celestial', 'items')
BODIES = os.path.join(ROOT, 'handoff', 'hero-celestial', 'bodies')
FIT = os.path.join(ROOT, 'source', 'tools', 'celestial-fit-adult-f.json')
OUT = os.path.join(ROOT, 'source', 'hero', 'celestial', 'wear')
JS = os.path.join(ROOT, 'source', 'js', 'hero-celestial.js')
# Манекены: точки тела на своих картинках. Вещи подогнаны на взрослую девушку (af), остальным они
# переносятся по этим точкам: по высоте — кусочно между макушкой, глазами, подбородком, плечами, пахом и стопой,
# по ширине — своим коэффициентом для головы, корпуса и ног; предмет в руке — от кисти.
B = {
 'af': dict(src='base-adult.jpg', name='Девушка', cx=428, pts=[48, 105, 135, 162, 355, 697], hand=(352, 385), hand2=(502, 385), kh=1, kt=1, kl=1, teen=0),
 'am': dict(src='base-adult.jpg', name='Парень', cx=120, pts=[18, 64, 100, 125, 345, 695], hand=(40, 382), hand2=(200, 382), kh=1.1, kt=1.23, kl=1.05, teen=0),
 'tf': dict(src='base-teen.jpg', name='Девочка', cx=540, pts=[25, 98, 135, 162, 360, 682], hand=(466, 392), hand2=(612, 392), kh=1.3, kt=1.06, kl=.95, teen=1, hdy=8),
 'tm': dict(src='base-teen.jpg', name='Мальчик', cx=110, pts=[20, 92, 130, 160, 360, 682], hand=(38, 390), hand2=(182, 390), kh=1.3, kt=1.09, kl=.95, teen=1, hdy=8),
}
HAND = (-22, -30, 23, 25)          # кисть вокруг точки hand: рамка слоя «рука» (пальцы поверх предмета)
SLOTK = {'head': 'kh', 'pet': 'kt', 'cloak': 'kt', 'top': 'kt', 'acc': 'kt', 'bottom': 'kl', 'shoes': 'kl'}
SCALE = 1.5                        # вещи режутся крупнее холста: чётче на телефоне

# id, лист:номер (или особый ключ), слот приложения, название
CAT = [
 ('cw-hat', 'headwear:1', 'head', 'Шляпа астролога'), ('cw-diadem', 'headwear:2', 'head', 'Диадема-полумесяц'),
 ('cw-beret', 'headwear:3', 'head', 'Белый берет со звездой'), ('cw-nightcap', 'headwear:4', 'head', 'Ночной колпак'),
 ('cw-crown', 'headwear:5', 'head', 'Корона со звёздным камнем'), ('cw-hood', 'headwear:6', 'head', 'Капюшон индиго'),
 ('cw-goggles', 'headwear:7', 'head', 'Латунные гогглы'), ('cw-sun', 'headwear:8a', 'head', 'Венец-солнце'),
 ('cw-straw', 'headwear:8b', 'head', 'Соломенная шляпа'), ('cw-rose', 'headwear:9', 'head', 'Берет с пером и розой'),
 ('cc-pelerine', 'capes:1', 'cloak', 'Фиолетовая пелерина'), ('cc-night', 'capes:2', 'cloak', 'Плащ «ночное небо»'),
 ('cc-orange', 'capes:3', 'cloak', 'Оранжевая полунакидка'), ('cc-grey', 'capes:4', 'cloak', 'Серая мантия'),
 ('cc-glass', 'capes:5', 'cloak', 'Голубая мантия'), ('cc-torn', 'capes:6', 'cloak', 'Рваный плащ индиго'),
 ('cc-paladin', 'capes:7', 'cloak', 'Белый плащ с наплечниками'), ('cc-scarf', 'capes:8', 'cloak', 'Шарф-палантин'),
 ('ct-corset', 'tops:1', 'top', 'Фиолетовый корсаж'), ('ct-armor', 'tops:4a', 'top', 'Бело-золотой доспех'),
 ('ct-maps', 'tops:2', 'top', 'Пальто-жилет с картами'), ('ct-fencer', 'tops:3', 'top', 'Фехтовальный жакет'),
 ('ct-frock', 'tops:5', 'top', 'Синий фрак'), ('ct-pajama', 'tops:4b', 'top', 'Пижамная рубашка'),
 ('ct-apron', 'tops:6', 'top', 'Фартук на рубашке'), ('ct-librarian', 'tops:7', 'top', 'Сюртук библиотекаря'),
 ('cb-frills', 'bottoms:1', 'bottom', 'Юбка с воланами'), ('cb-pleat', 'bottoms:2', 'bottom', 'Белая плиссе'),
 ('cb-slit', 'bottoms:3', 'bottom', 'Голубая юбка с разрезами'), ('cb-shorts', 'bottoms:4', 'bottom', 'Тёмно-синие шорты'),
 ('cb-prince', 'bottoms:5', 'bottom', 'Белые брюки'), ('cb-pajama', 'bottoms:6', 'bottom', 'Пижамные брюки'),
 ('cb-cargo', 'bottoms:7', 'bottom', 'Карго'), ('cb-straps', 'bottoms:8', 'bottom', 'Шорты с ремнями'),
 ('cg-white', 'gloves:1', 'gloves', 'Длинные белые перчатки'), ('cg-gold', 'gloves:2', 'gloves', 'Латные перчатки'),
 ('cg-rivet', 'gloves:3', 'gloves', 'Кожаные с заклёпками'), ('cg-fencer', 'gloves:4', 'gloves', 'Фехтовальные с крагами'),
 ('cg-mitts', 'gloves:5', 'gloves', 'Чёрные митенки'), ('cg-stars', 'gloves:6', 'gloves', 'Синие со звёздами'),
 ('cg-bracers', 'gloves:7+8', 'gloves', 'Кожаные наручи'), ('cg-garden', 'gloves:9', 'gloves', 'Садовые перчатки'),
 ('cs-heels', 'boots:1', 'shoes', 'Фиолетовые на каблуке'), ('cs-thigh', 'boots:2', 'shoes', 'Белые ботфорты'),
 ('cs-navy', 'boots:3', 'shoes', 'Тёмно-синие сапоги'), ('cs-plate', 'boots:4', 'shoes', 'Латные сапоги'),
 ('cs-work', 'boots:5', 'shoes', 'Рабочие ботинки'), ('cs-slippers', 'boots:6', 'shoes', 'Тапки-сапожки'),
 ('cs-rubber', 'boots:7', 'shoes', 'Резиновые сапоги с лозой'), ('cs-scout', 'boots:8', 'shoes', 'Ботинки разведчика'),
 ('cx-quill', 'weapons:1', 'hand', 'Перо-посох'), ('cx-bookshield', 'weapons:2', 'hand', 'Книга-щит'),
 ('cx-lantern', 'weapons:3', 'hand', 'Фонарь-компас'), ('cx-rapier', 'weapons:4', 'hand', 'Рапира'),
 ('cx-astrolabe', 'weapons:5', 'hand', 'Астролябия'), ('cx-lyre', 'weapons:6', 'hand', 'Лира-звезда'),
 ('cx-dagger', 'weapons:7', 'hand', 'Кинжал-закладка'), ('cx-can', 'weapons:8', 'hand', 'Лейка'),
 ('cx-mace', 'weapons:9', 'hand', 'Булава-солнце'), ('cx-ink', 'weapons:10', 'hand', 'Колба с чернилами'),
 ('ca-moon', 'accessories:1', 'acc', 'Кулон «лунный камень»'), ('ca-amstar', 'accessories:2', 'acc', 'Аметистовая звезда'),
 ('ca-brooch', 'accessories:3', 'acc', 'Брошь с синей звездой'), ('ca-compass', 'accessories:4', 'acc', 'Брошь-компас'),
 ('ca-amber', 'accessories:5', 'acc', 'Янтарная серьга'), ('ca-ruby', 'accessories:6', 'acc', 'Рубиновая серьга'),
 ('ca-hairpin', 'accessories:7', 'acc', 'Заколка с аметистом'), ('ca-jade', 'accessories:8', 'acc', 'Нефрит на ленте'),
 ('ca-belt', 'accessories:9', 'acc', 'Пояс с флаконами'), ('ca-keys', 'accessories:10', 'acc', 'Связка ключей'),
 ('cp-owl', 'companions:1', 'pet', 'Звёздная сова'), ('cp-moth', 'companions:5', 'pet', 'Бумажный мотылёк'),
 ('cp-fox', 'companions:7', 'pet', 'Лис-комета'), ('cp-cat', 'companions:8', 'pet', 'Облачный кот'),
 ('cp-jelly', 'companions:14', 'pet', 'Чернильная медуза'), ('cp-dragon', 'companions:11', 'pet', 'Книжный дракон'),
]
ORDER = ['shoes', 'bottom', 'top', 'gloves', 'acc', 'cloak', 'head', 'hand', 'pet']
DEF = {  # рамка вещи на теле по умолчанию; a: t — y верх, b — y низ, c — y центр
 'head': dict(cx=428, y=98, w=150, a='b'), 'cloak': dict(cx=428, y=148, w=190, a='t'),
 'top': dict(cx=428, y=152, w=118, a='t'), 'bottom': dict(cx=428, y=268, w=112, a='t'),
 'shoes': dict(cx=428, y=697, w=104, a='b'), 'gloves': dict(lx=356, rx=500, y=400, gw=42),
 'hand': dict(cx=352, y=380, w=60, a='c'), 'acc': dict(cx=428, y=175, w=40, a='c'), 'pet': dict(cx=515, y=150, w=80, a='c'),
}


def white_bg(im):
    a = np.asarray(im.convert('RGB')).astype(int)
    mn, mx = a.min(2), a.max(2)
    return (mn >= 236) & (mx - mn <= 16)


def cut_sheet(path):
    """Вещи листа слева направо, сверху вниз (фон — белое, связанное с краем кадра)."""
    im = Image.open(path).convert('RGB'); white = white_bg(im)
    wl, _ = ndimage.label(white)
    border = set(np.unique(np.concatenate([wl[0], wl[-1], wl[:, 0], wl[:, -1]]))) - {0}
    fg = ~np.isin(wl, list(border))
    lab, _ = ndimage.label(ndimage.binary_dilation(fg, iterations=6))
    boxes = [s for s in ndimage.find_objects(lab) if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) >= 1500]
    boxes.sort(key=lambda s: (s[0].start + s[0].stop) / 2)
    rows = []
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


def tidy(im, keep=0.02):
    """Убрать крошки от соседних вещей (меньше keep от самой крупной части)."""
    a = np.array(im); m = a[:, :, 3] > 20
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=2))
    if n > 1:
        sz = ndimage.sum(m, lab, range(1, n + 1))
        a[~np.isin(lab, [i + 1 for i, s in enumerate(sz) if s >= keep * sz.max()]), 3] = 0
    im = Image.fromarray(a); return im.crop(im.getbbox())


def split(im, axis):
    a = np.asarray(im)[:, :, 3] > 20; pr = a.sum(0) if axis == 1 else a.sum(1)
    n = len(pr); cut = int(n * .3) + int(np.argmin(pr[int(n * .3):int(n * .7)]))
    p = [im.crop((0, 0, cut, im.height)), im.crop((cut, 0, im.width, im.height))] if axis == 1 else \
        [im.crop((0, 0, im.width, cut)), im.crop((0, cut, im.width, im.height))]
    return [x.crop(x.getbbox()) for x in p]


def native_hex(im):
    """Родной цвет вещи: средний цвет самых насыщенных пикселей (для палитры и перекраски)."""
    a = np.asarray(im.convert('RGBA')).astype(float) / 255
    m = a[:, :, 3] > .5; px = a[m][:, :3]
    if not len(px): return '#888888'
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in px[::max(1, len(px) // 4000)]])
    sat = hsv[hsv[:, 1] >= np.percentile(hsv[:, 1], 70)]
    ang = sat[:, 0] * 2 * np.pi; h = (np.arctan2(np.sin(ang).mean(), np.cos(ang).mean()) / (2 * np.pi)) % 1
    r, g, b = colorsys.hsv_to_rgb(h, float(np.median(sat[:, 1])), float(np.median(sat[:, 2])))
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))


def save(im, name):
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=84, method=6)
    return os.path.getsize(os.path.join(OUT, name + '.webp'))


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
    fit = json.load(open(FIT, encoding='utf-8'))
    sheets = {f[6:-4]: cut_sheet(os.path.join(SHEETS, f)) for f in sorted(os.listdir(SHEETS)) if f.startswith('items-')}
    def src(key):
        sh, n = key.split(':'); L = sheets[sh]
        if n == '7+8':
            a, b = L[6], L[7]; h = max(a.height, b.height)
            c = Image.new('RGBA', (a.width + b.width + 10, h)); c.paste(a, (0, h - a.height)); c.paste(b, (a.width + 10, h - b.height)); return c
        if n[-1] in 'ab':
            parts = split(L[int(n[:-1]) - 1], 1 if sh == 'headwear' else 0); return parts['ab'.index(n[-1])]
        im = L[int(n) - 1]
        return im if sh in ('companions',) else tidy(im, 0.005 if key in ('tops:6', 'headwear:2', 'accessories:10', 'accessories:9') else 0.02)
    total = 0; F = B['af']
    rects = {}
    for iid, key, slot, name in CAT:   # 1) рамки вещей на af и картинки (общие для всех манекенов)
        p = dict(DEF[slot]); p.update(fit.get(iid, {})); it = src(key)
        if p.get('flip'): it = it.transpose(Image.FLIP_LEFT_RIGHT)
        if p.get('rot'): it = it.rotate(p['rot'], expand=True, resample=Image.BICUBIC); it = it.crop(it.getbbox())
        parts = []
        if slot == 'gloves':
            for half, hx in zip(split(it, 1), (p['lx'], p['rx'])):
                w = p['gw']; h = round(half.height * w / half.width)
                parts.append((half, hx - w / 2, p['y'] - h + p.get('dy', 0), w, h, 'hand2' if hx > F['cx'] else 'hand'))
        else:
            w = p['w']; h = p.get('h') or round(it.height * w / it.width)
            y = {'t': p['y'], 'b': p['y'] - h, 'c': p['y'] - h / 2}[p['a']]
            parts.append((it, p['cx'] - w / 2, y, w, h, 'hand' if slot == 'hand' else None))
        rec = []
        for k, (im, x, y, w, h, anchor) in enumerate(parts):
            nm = iid + ('' if len(parts) == 1 else '-' + 'lr'[k])
            total += save(im.resize((round(w * SCALE * 1.4), round(h * SCALE * 1.4)), Image.LANCZOS), nm)
            rec.append((nm, x, y, w, h, anchor))
        rects[iid] = dict(rec=rec, slot=slot, c=native_hex(it), back=p.get('back'), hand=slot == 'hand' and not p.get('nohand'))
    bodies = {}
    for bid, b in B.items():           # 2) каждый манекен: картинка, рука, рамки вещей
        img = Image.open(os.path.join(BODIES, b['src'])).convert('RGBA'); bg = white_bg(img)
        img.putalpha(Image.fromarray(np.where(bg, 0, 255).astype(np.uint8)))
        fy, by = F['pts'], b['pts']
        def mapy(y):
            for i in range(len(fy) - 1):
                if y <= fy[i + 1] or i == len(fy) - 2:
                    return by[i] + (y - fy[i]) * (by[i + 1] - by[i]) / (fy[i + 1] - fy[i])
        crop = (round(b['cx'] - 140 * b['kt']), round(by[0] - 110 * b['kh']), round(b['cx'] + 150 * b['kt']), by[5] + 12)
        W, H = crop[2] - crop[0], crop[3] - crop[1]
        fig = Image.new('RGBA', (W, H)); fig.alpha_composite(img, (-crop[0], -crop[1]))
        # соседний манекен на той же картинке не должен попасть в холст
        a = np.array(fig); lab, n = ndimage.label(a[:, :, 3] > 0)
        if n > 1:
            sz = ndimage.sum(a[:, :, 3] > 0, lab, range(1, n + 1)); keep = int(np.argmax(sz)) + 1
            cx0 = b['cx'] - crop[0]; cols = [ndimage.find_objects(lab)[i] for i in range(n)]
            for i, sl in enumerate(cols):
                mid = (sl[1].start + sl[1].stop) / 2
                if abs(mid - cx0) > W * .45: a[lab == i + 1, 3] = 0
            fig = Image.fromarray(a)
        total += save(fig.resize((round(W * SCALE), round(H * SCALE)), Image.LANCZOS), 'base-' + bid)
        hx, hy = b['hand']; hk = b['kt']
        hb = (round(hx + HAND[0] * hk), round(hy + HAND[1] * hk), round(hx + HAND[2] * hk), round(hy + HAND[3] * hk))
        hand = img.crop(hb); ha = np.asarray(hand).astype(int)
        hand.putalpha(Image.fromarray(np.where((ha[:, :, 0] - ha[:, :, 2] > 14) & (ha[:, :, 3] > 0), 255, 0).astype(np.uint8)))
        total += save(hand.resize((round(hand.width * SCALE), round(hand.height * SCALE)), Image.LANCZOS), 'hand-' + bid)
        items = {}
        for iid, r in rects.items():
            k = b[SLOTK.get(r['slot'], 'kt')]
            if r['slot'] == 'acc' and r['rec'][0][2] < F['pts'][3]: k = b['kh']   # серьги и заколка — на голове
            out = []
            for nm, x, y, w, h, anchor in r['rec']:
                if anchor:  # от кисти (предмет в руке, перчатки)
                    ax, ay = F[anchor]; bx, bby = b[anchor]; kk = b['kt']
                    nx, ny, nw, nh = bx + (x - ax) * kk, bby + (y - ay) * kk, w * kk, h * kk
                else:
                    c = x + w / 2; nw = w * k; ny = mapy(y); nh = mapy(y + h) - ny
                    nx = b['cx'] + (c - F['cx']) * k - nw / 2
                    if k == b['kh'] and r['slot'] != 'pet': ny += b.get('hdy', 0)
                out.append([nm, round(nx - crop[0], 1), round(ny - crop[1], 1), round(nw, 1), round(nh, 1)])
            items[iid] = out
        figh = (by[5] - by[0]) * (0.88 if b['teen'] else 1)
        sc = 82 * (0.88 if b['teen'] else 1) / (by[5] - by[0])
        bodies[bid] = {'name': b['name'], 'w': W, 'h': H, 'sc': round(sc, 5), 'x0': round(39 - (b['cx'] - crop[0]) * sc, 2), 'y0': round(99 - (by[5] - crop[1]) * sc, 2),
                       'hand': [hb[0] - crop[0], hb[1] - crop[1], hb[2] - hb[0], hb[3] - hb[1]], 'items': items}
    meta = {iid: dict({'c': r['c']}, **({'back': 1} if r['back'] else {}), **({'hand': 1} if r['hand'] else {})) for iid, r in rects.items()}
    data = {'order': ORDER, 'meta': meta, 'bodies': bodies}
    items = [{'id': i, 'slot': s, 'name': n} for i, _, s, n in CAT]
    with open(JS, 'w', encoding='utf-8') as f:
        f.write("'use strict';\n/* Сгенерировано source/tools/gen-celestial-wear.py из handoff/hero-celestial (листы вещей Джессики, 20.10). Не править руками. */\n")
        f.write('const HERO_CEL_ART=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
        f.write('const HERO_CEL_ITEMS=' + json.dumps(items, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('items', len(rects), 'bodies', len(bodies), 'webp total', total // 1000, 'KB')


if __name__ == '__main__':
    sys.exit(main())
