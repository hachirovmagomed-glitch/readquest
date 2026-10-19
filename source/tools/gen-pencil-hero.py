#!/usr/bin/env python3
"""Карандашный герой и 30 вещей (рисунок Грока, handoff/hero-pencil) → source/js/hero-pencil.js.
Цвета заменяются на переменные: линия = --txt, бумага = --hero-bg, остальные = --pc-* (день/ночь в app.html).
Запуск: python3 source/tools/gen-pencil-hero.py"""
import json, os, re, xml.etree.ElementTree as ET
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'handoff', 'hero-pencil')
OUT = os.path.join(ROOT, 'source', 'js', 'hero-pencil.js')
NS = '{http://www.w3.org/2000/svg}'
COL = {'#2b2f3a': 'var(--txt)', '#fbf8f0': 'var(--hero-bg)', '#e5e9f1': 'var(--pc-f1)', '#ccd3e0': 'var(--pc-f2)', '#2f55b8': 'var(--pc-blue)', '#d0443c': 'var(--pc-red)'}
def ser(el):
    s = ET.tostring(el, encoding='unicode').replace(' xmlns="http://www.w3.org/2000/svg"', '').replace('ns0:', '').replace(':ns0', '')
    s = re.sub(r'#[0-9a-fA-F]{6}', lambda m: COL.get(m.group().lower(), m.group()), s)
    left = set(re.findall(r'#[0-9a-fA-F]{6}', s))
    assert not left, left
    return re.sub(r'>\s+<', '><', s).replace(' />', '/>').replace('"', "'")
ET.register_namespace('', 'http://www.w3.org/2000/svg')
hero = ET.parse(os.path.join(SRC, 'hero-A.svg')).getroot()
hero_s = ''.join(ser(c) for c in hero)
items = {}
for g in ET.parse(os.path.join(SRC, 'items-day.svg')).getroot():
    gid = g.get('id'); inner = ''.join(ser(c) for c in g)
    m = re.match(r'(pc-.+?)-(back|front)$', gid)
    if m: items.setdefault(m.group(1), {})[m.group(2)] = inner
    else: items.setdefault(gid, {})['front'] = inner
js = ('\'use strict\';\n/* Сгенерировано source/tools/gen-pencil-hero.py из handoff/hero-pencil (рисунок Грока, 19.10). Не править руками. */\n'
      'const HERO_PENCIL_ART=' + json.dumps({'hero': hero_s, 'items': items}, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(OUT, 'w').write(js)
print(OUT, len(js), 'bytes,', len(items), 'items')
