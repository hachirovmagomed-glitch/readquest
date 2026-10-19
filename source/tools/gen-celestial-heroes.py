#!/usr/bin/env python3
"""Герои скина «Небесный»: классы из handoff/hero-celestial/classes/*.jpg → source/hero/celestial/*.webp.

Белый фон убирается заливкой от краёв кадра (белое внутри фигуры остаётся), край смягчается,
фигура обрезается по рамке и сжимается до высоты H. Классы с предметом в левой руке (⚠ в брифе)
отзеркаливаются целиком, чтобы предмет был в правой руке героя.
Запуск: python3 -I source/tools/gen-celestial-heroes.py
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'handoff', 'hero-celestial', 'classes')
OUT = os.path.join(ROOT, 'source', 'hero', 'celestial')
H = 480
MIRROR = {'lunnaya-zhritsa', 'sonny-chtets', 'alkhimik', 'zvezdny-bard', 'solnechny-paladin'}


def cutout(path):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    mn, mx = a.min(axis=2), a.max(axis=2)
    white = (mn >= 232) & (mx - mn <= 18)
    reach = np.zeros_like(white)
    reach[0, :] = white[0, :]; reach[-1, :] = white[-1, :]
    reach[:, 0] = white[:, 0]; reach[:, -1] = white[:, -1]
    while True:  # заливка от краёв: растим по белым пикселям, пока растёт
        g = reach.copy()
        g[1:, :] |= reach[:-1, :]; g[:-1, :] |= reach[1:, :]
        g[:, 1:] |= reach[:, :-1]; g[:, :-1] |= reach[:, 1:]
        g &= white
        if (g == reach).all():
            break
        reach = g
    alpha = Image.fromarray(np.where(reach, 0, 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    # полупрозрачный ореол: светлые пиксели у края делаем прозрачнее
    al = np.asarray(alpha).astype(np.float32)
    light = np.clip((mn.astype(np.float32) - 200) / 55, 0, 1)
    edge = (al > 0) & (al < 255)
    al[edge] *= (1 - 0.6 * light[edge])
    rgba = im.convert('RGBA')
    rgba.putalpha(Image.fromarray(al.astype(np.uint8)))
    return rgba.crop(rgba.getbbox())


def main():
    os.makedirs(OUT, exist_ok=True)
    names = sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.jpg'))
    total = 0
    for n in names:
        im = cutout(os.path.join(SRC, n + '.jpg'))
        if n in MIRROR:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        w = round(im.width * H / im.height)
        im = im.resize((w, H), Image.LANCZOS)
        dst = os.path.join(OUT, n + '.webp')
        im.save(dst, 'WEBP', quality=82, method=6)
        total += os.path.getsize(dst)
        print(n, im.size, os.path.getsize(dst))
    print('total', total)


if __name__ == '__main__':
    sys.exit(main())
