# ReadQuest skin «Речной» (rechnoy): calm river. Cool water blues + teal, wet-sand / pebble warm neutrals,
# soft light like sun on water. Night = deep river at dusk.
# One decoration style only: thin monoline current lines (ripples), reeds and pebbles, drawn as plain SVG strokes
# in --rq-skin-ripple/reed/pebble/glint. Decoration lives ONLY in empty bands (header divider, nav edge, empty bottoms),
# never under text or tap zones (checked by audit_rechnoy.py). Reader page: no decoration, book font from settings.
# Screens use the CANONICAL stage1-final tokens (--rq-*) + skin extras (--rq-skin-*): the mockups are built on the very
# tokens.rq.css that goes into the app (inlined into each HTML, after stage1-final tokens.css).
# Run: python3 gen_rechnoy.py            -> tokens, HTML, PNG 1x/@2x, overview
#      python3 audit_rechnoy.py          -> contrast.tsv (token pairs + DOM text), decor overlap, tap sizes
import os, re, json, math, sys, shutil, subprocess
from concurrent.futures import ThreadPoolExecutor
SRC = os.path.dirname(os.path.abspath(__file__)); PACK = os.path.abspath(SRC + '/../..'); OUT = PACK + '/12-rechnoy'
sys.path.insert(0, PACK + '/src/tokens-rq'); import build_rq as B
ICONS = '/workspace/readquest/handoff-notes/ui-files/stage1-gaps/src/icons'
CHROME = '/usr/bin/google-chrome'

# ---------------- palette (skin source, same "themes" structure as other skins) ----------------
COV = {'cover-1': '#1f5a6e', 'cover-2': '#3b5878', 'cover-3': '#46664a', 'cover-4': '#75553a', 'cover-5': '#4b4c70', 'cover-6': '#4f6469'}
T = {
 'day': {'bg': '#edf4f3', 'bg-top': '#f9f7ef', 'surface': '#fbfcfb', 'surface-2': '#e9e3d6',
         'text': '#10303a', 'text-muted': '#435c64', 'accent': '#1c5d78', 'on-accent': '#ffffff',
         'border': '#d3dedc', 'rule': '#d3dedc', 'border-strong': '#6c8389', 'scrim': 'rgba(10,32,40,.45)',
         'page-bg': '#f7f7f3', 'page-text': '#1c2427', 'page-number': '#5a6568',
         'ripple': '#86afb6', 'ripple-2': '#b3cdca', 'reed': '#7d9a80', 'pebble': '#ab9f8a', 'glint': '#e0b664',
         'sun': 'rgba(255,248,225,.75)', 'daybar': '#1c5d78', 'daybar-track': '#d7e2e0', 'cover-ink': '#ffffff', **COV},
 'night': {'bg': '#0d1c25', 'bg-top': '#1b2340', 'surface': '#142833', 'surface-2': '#1d3742',
         'text': '#e2edf0', 'text-muted': '#a0b7bd', 'accent': '#7fc3d6', 'on-accent': '#08202a',
         'border': '#24414c', 'rule': '#24414c', 'border-strong': '#6f909a', 'scrim': 'rgba(2,8,12,.62)',
         'page-bg': '#11191d', 'page-text': '#dde3e2', 'page-number': '#97a3a5',
         'ripple': '#3f707c', 'ripple-2': '#2b5561', 'reed': '#557a69', 'pebble': '#6a665b', 'glint': '#d89c55',
         'sun': 'rgba(216,156,85,.10)', 'daybar': '#7fc3d6', 'daybar-track': '#24363d', 'cover-ink': '#ffffff', **COV},
}
NOTES = {'bg-top': 'верх фонового градиента (солнечный свет днём, сумеречное небо ночью); текст проверен и на нём',
         'surface-2': 'мокрый песок / галька: подложки KPI, дорожки прогресса',
         'ripple / ripple-2 / reed / pebble / glint': 'только декор: линии течения, камыш, камешки, блики (не несут смысла, не под текстом)',
         'sun': 'мягкий блик солнца (день) / последний свет заката (ночь), CSS radial-gradient в шапке',
         'daybar / daybar-track': 'дневная полоса 3px в читалке (≥3:1 к дорожке и странице)',
         'cover-N': 'плоские обложки-заглушки, текст cover-ink (белый)'}

def write_tokens():
    json.dump({'name': 'Речной', 'id': 'rechnoy',
               'fonts': {'ui': 'Manrope 400–800 (SIL OFL 1.1)', 'headings': 'Lora 500–700 (SIL OFL 1.1)', 'page': 'из настроек (Georgia / Noto Serif)'},
               'notes': NOTES, 'themes': T}, open(OUT + '/tokens.json', 'w'), ensure_ascii=False, indent=2)
    r = B.build('12-rechnoy', 'rechnoy', 'Речной', 'rechnoy')
    css = open(OUT + '/tokens.rq.css').read()
    open(OUT + '/tokens.css', 'w').write('/* tokens.css = tokens.rq.css (одинаковые файлы; имя tokens.css — для единообразия папки). */\n' + css)
    return r

# ---------------- helpers ----------------
IC = {f[:-4]: re.search(r'<svg[^>]*>(.*)</svg>', open(f'{ICONS}/{f}').read(), re.S).group(1) for f in os.listdir(ICONS) if f.endswith('.svg')}
def ic(n, sz=22, c='currentColor', sw=1.8, fill='none'):
    return f'<svg class="i" width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="{fill}" stroke="{c}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{IC[n]}</svg>'
def plural(n, one, few, many):
    m, k = n % 100, n % 10
    return one if (k == 1 and m != 11) else few if (2 <= k <= 4 and not 12 <= m <= 14) else many
def nb(n): return f'{n:,}'.replace(',', '\u202f')
def mon(n): return f'{nb(n)} {plural(n, "монета", "монеты", "монет")}'
assert [plural(n, 'монета', 'монеты', 'монет') for n in (1, 3, 11, 21, 110, 390, 504, 1002)] == ['монета', 'монеты', 'монет', 'монета', 'монет', 'монет', 'монеты', 'монеты']

# ---------------- decoration: one style (monoline 1.4px, round caps, faded ends) ----------------
_gid = [0]
def _wave(x0, x1, y, amp, wl, ph=0):
    x = x0 - ph * wl; d = f'M{x:.1f} {y:.1f} Q{x + wl / 4:.1f} {y - amp:.1f} {x + wl / 2:.1f} {y:.1f}'; x += wl / 2
    while x < x1: d += f' T{x + wl / 2:.1f} {y:.1f}'; x += wl / 2
    return d
def _fade(x0, x1, color, css):
    _gid[0] += 1; g = f'rqf{_gid[0]}'
    return g, (f'<linearGradient id="{g}" style="color:{css}" gradientUnits="userSpaceOnUse" x1="{x0}" y1="0" x2="{x1}" y2="0">'
               f'<stop offset="0" stop-color="{color}" stop-opacity="0"/><stop offset=".18" stop-color="{color}"/>'
               f'<stop offset=".82" stop-color="{color}"/><stop offset="1" stop-color="{color}" stop-opacity="0"/></linearGradient>')
def current(x0, x1, y, amp=2, wl=60, ph=0, color='var(--rq-skin-ripple)', w=1.4):
    # SVG gradients can't take CSS vars in stop-color on all engines -> use currentColor via style on <stop>
    g, d = _fade(x0, x1, 'currentColor', color)
    return f'<defs>{d}</defs><path d="{_wave(x0, x1, y, amp, wl, ph)}" fill="none" stroke="url(#{g})" stroke-width="{w}" stroke-linecap="round"/>'
def glints(pts):
    return ''.join(f'<path d="M{x} {y}h{l}" stroke="var(--rq-skin-glint)" stroke-opacity=".8" stroke-width="1.6" stroke-linecap="round"/>' for x, y, l in pts)
def reeds(x, base, s=1.0, flip=False):
    k = -1 if flip else 1
    st = [(0, 34, 3), (7, 27, -2), (13, 22, 4), (-5, 18, -4)]
    p = ''
    for dx, h, lean in st:
        h *= s; X = x + k * dx * s
        p += f'<path d="M{X:.1f} {base} Q{X + k * lean * .3:.1f} {base - h * .55:.1f} {X + k * lean:.1f} {base - h:.1f}"/>'
    X = x + k * 0; h = 34 * s
    cat = f'<path d="M{X + k * 2.4:.1f} {base - h + 3:.1f} L{X + k * 3:.1f} {base - h - 6 * s:.1f}" stroke-width="3.6"/>'
    leaf = f'<path d="M{x + k * 4 * s:.1f} {base} Q{x + k * 16 * s:.1f} {base - 12 * s:.1f} {x + k * 22 * s:.1f} {base - 24 * s:.1f}"/>'
    return f'<g fill="none" stroke="var(--rq-skin-reed)" stroke-width="1.4" stroke-linecap="round">{p}{cat}{leaf}</g>'
def pebbles(x, y, s=1.0):
    e = [(0, 0, 9, 5.5, -6), (17, 2, 6, 4, 8), (29, -1, 4.5, 3, 0)]
    return ''.join(f'<ellipse cx="{x + dx * s:.1f}" cy="{y + dy * s:.1f}" rx="{rx * s:.1f}" ry="{ry * s:.1f}" transform="rotate({r} {x + dx * s:.1f} {y + dy * s:.1f})" '
                   f'fill="none" stroke="var(--rq-skin-pebble)" stroke-width="1.4"/>' for dx, dy, rx, ry, r in e)
def deco(x, y, w, h, inner, name):
    return (f'<svg class="deco" data-deco="{name}" aria-hidden="true" style="position:absolute;left:{x}px;top:{y}px;pointer-events:none" '
            f'width="{w}" height="{h}" viewBox="0 0 {w} {h}">{inner}</svg>')
def divider(y, reeds_right=True):
    """header divider band (empty space between header and content): 2 long current lines + a short one, light glints sitting on
    the water line, reeds and pebbles at the right bank"""
    inner = (current(10, 330, 12, 2.3, 112, .15) + current(60, 300, 21, 1.7, 92, .55, 'var(--rq-skin-ripple-2)') + current(150, 250, 28, .8, 70, .3, 'var(--rq-skin-ripple-2)', 1.2)
             + glints([(104, 10.6, 9), (118, 11.2, 3), (232, 19.8, 6)]))
    if reeds_right: inner += pebbles(322, 30, .62) + reeds(364, 33, .78)
    return deco(0, y, 390, 36, inner, 'divider')

# ---------------- CSS ----------------
CANON_CSS = open(PACK + '/src/tokens-rq/stage1-final-tokens.css').read()
CSS = '''*{box-sizing:border-box;margin:0;padding:0}
html,body{width:390px;height:844px}
body{overflow:hidden;position:relative;font-family:var(--rq-font-ui);font-size:15px;line-height:1.35;color:var(--rq-text);
 background:radial-gradient(260px 150px at 86% -30px,var(--rq-skin-sun),transparent 70%),linear-gradient(180deg,var(--rq-skin-bg-top) 0,var(--rq-bg) 260px) no-repeat,var(--rq-bg);
 -webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.i{flex:none;display:block}
.mut{color:var(--rq-text-2)}
.hdr{position:absolute;top:44px;left:16px;right:16px;height:56px;display:flex;align-items:center;gap:10px}
.hdr h1{flex:1;font-family:var(--rq-skin-font-heading);font-weight:600;font-size:30px;letter-spacing:-.005em;line-height:1.1}
.coinchip{display:flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-radius:18px;background:var(--rq-coin-tint);color:var(--rq-coin);font-weight:700;font-size:14px}
.ib{width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:22px;color:var(--rq-text)}
.card{background:var(--rq-surface);border:1px solid var(--rq-line);border-radius:var(--rq-radius-lg);padding:14px}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:26px;font-size:16px;font-weight:700;background:var(--rq-accent);color:var(--rq-on-accent)}
.btn.sec{background:transparent;color:var(--rq-accent-text);border:1.5px solid var(--rq-accent);height:48px}
.sbtn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:44px;padding:0 16px;border-radius:22px;font-size:14px;font-weight:700;border:1.5px solid var(--rq-accent);color:var(--rq-accent-text);white-space:nowrap}
.sbtn.fill{background:var(--rq-accent);color:var(--rq-on-accent)}
.sbtn.dis{border-color:var(--rq-line);color:var(--rq-text-disabled)}
.pbar{height:6px;background:var(--rq-surface-2);border-radius:3px;overflow:hidden}.pbar i{display:block;height:100%;background:var(--rq-accent);border-radius:3px}
.dots{display:flex;gap:6px}.dots i{width:14px;height:14px;border-radius:50%;background:transparent;border:1.5px solid var(--rq-border-strong)}.dots i.f{background:var(--rq-accent);border-color:var(--rq-accent)}
.ring{position:relative;flex:none}.ring .rt{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.ring .rt b{font-size:20px;font-weight:800}.ring .rt span{font-size:11px;color:var(--rq-text-2);margin-top:2px}
.cap{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--rq-text-2)}
/* bottom nav: surface with a soft wavy top edge (decor = edge shape only) */
.bnav{position:absolute;left:0;right:0;bottom:0;height:84px;background:var(--rq-surface);display:flex;padding:8px 0 20px}
.bnav>div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:12px;font-weight:600;color:var(--rq-text-2)}
.bnav i{display:flex;align-items:center;justify-content:center;width:60px;height:30px;border-radius:15px}
.bnav .on{color:var(--rq-accent-text);font-weight:800}.bnav .on i{background:var(--rq-accent-tint)}
.navedge{position:absolute;left:0;bottom:83px;pointer-events:none}
/* reader */
#reader{position:absolute;inset:0;background:var(--r-bg);color:var(--r-txt);display:flex;flex-direction:column}
.viewer{flex:1;overflow:hidden;padding:54px 24px 0;font-family:var(--rq-font-read);font-size:19px;line-height:1.65;text-align:justify;hyphens:manual}
.viewer p{text-indent:1.4em}
.pgline{height:26px;display:flex;align-items:center;justify-content:flex-end;padding:0 16px}
.pgnum{font-family:var(--rq-font-ui);font-size:11px;color:var(--r-txt-2);font-variant-numeric:tabular-nums}
.daybar{height:3px;background:var(--rq-skin-daybar-track)}.daybar i{display:block;height:3px;background:var(--rq-skin-daybar)}
.scrim{position:absolute;inset:0;background:var(--rq-scrim)}
'''
def nav(a):
    it = [('library', 'Библиотека'), ('gift', 'Награды'), ('user', 'Профиль')]
    edge = ('<svg class="navedge deco" data-deco="navedge" aria-hidden="true" width="390" height="8" viewBox="0 0 390 8">'
            f'<path d="{_wave(-30, 420, 5, 2.2, 130, .2)} V8 H-30Z" fill="var(--rq-surface)"/>'
            f'<path d="{_wave(-30, 420, 5, 2.2, 130, .2)}" fill="none" stroke="var(--rq-line)" stroke-width="1"/></svg>')
    return edge + '<div class="bnav" role="tablist">' + ''.join(
        f'<div class="{"on" if k == a else ""}" data-tap role="tab"><i>{ic(i)}</i>{t}</div>' for k, (i, t) in enumerate(it)) + '</div>'
def ring(p, sz, inner, sw=7):
    r = (sz - sw) / 2 - 1; L = 2 * math.pi * r; c = sz / 2
    return (f'<div class="ring" style="width:{sz}px;height:{sz}px"><svg width="{sz}" height="{sz}" viewBox="0 0 {sz} {sz}" aria-hidden="true">'
            f'<circle cx="{c}" cy="{c}" r="{r:.1f}" fill="none" stroke="var(--rq-surface-2)" stroke-width="{sw}"/>'
            f'<circle cx="{c}" cy="{c}" r="{r:.1f}" fill="none" stroke="var(--rq-accent)" stroke-width="{sw}" stroke-linecap="round" '
            f'stroke-dasharray="{L:.2f}" stroke-dashoffset="{L * (1 - p):.2f}" transform="rotate(-90 {c} {c})"/></svg><div class="rt">{inner}</div></div>')

def doc(body, theme, css='', title=''):
    skin = open(OUT + '/tokens.rq.css').read()
    th = ' data-theme="night"' if theme == 'night' else ''
    return (f'<!doctype html><html lang="ru" data-skin="rechnoy"{th}><head><meta charset="utf-8"><title>{title}</title>'
            f'<style>{CANON_CSS}\n{skin}\n{CSS}{css}</style></head><body>{body}</body></html>')

# ---------------- reader (clean: no decoration, book font from settings) ----------------
P1 = ("Он долго стоял у окна, глядя, как над крышами медленно светлеет небо. Город просыпался неохотно: где-то хлопнула дверь, "
      "внизу прогрохотала первая телега, и снова всё стихло. Мысли путались, возвращаясь к вчерашнему разговору, к словам, "
      "которые так и не были сказаны вслух.")
P2 = ("Чайник на плите давно остыл. На столе лежала раскрытая тетрадь, и последняя строчка обрывалась на середине, будто "
      "рука устала раньше, чем голова. Он перечитал её дважды, усмехнулся и закрыл тетрадь. Всё, что нужно было решить, "
      "решится само, стоит только выйти на улицу и пройти до конца переулка.")
P3 = ("Внизу, во дворе, дворник уже мёл листья, и мерный шорох метлы почему-то успокаивал. Он накинул пальто, нащупал в "
      "кармане ключи и на секунду задержался у двери, прислушиваясь к тишине пустой квартиры.")
V = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ'
def hy(w):
    if len(w) < 5: return w
    lw = w.lower(); n = len(w); cut = set()
    for i in range(1, n - 2):
        a, b, c = lw[i], lw[i + 1], lw[i + 2]
        if a in V and b not in V and c in V and b not in 'ьъй': cut.add(i)
        elif a not in V and b not in V and lw[i - 1] in V and c in V and b not in 'ьъй' and a != 'ь': cut.add(i)
        elif a in 'йьъ' and b not in V and c in V: cut.add(i)
    return ''.join(ch + ('\u00ad' if i in cut and 1 <= i <= n - 3 else '') for i, ch in enumerate(w))
def H(t): return re.sub(r'[А-Яа-яЁё]+', lambda m: hy(m.group(0)), t)
TOT = 185
def reader_doc(theme, inner='', n=98, daypct=60, under=False):
    pg = 'night' if theme == 'night' else 'day'
    hid = ' style="visibility:hidden"' if 'rbot' in inner else ''
    u = ' data-under="1"' if under else ''
    return (f'<div id="reader" data-page="{pg}"{u}><div class="viewer"><p>{H(P1)}</p><p>{H(P2)}</p><p>{H(P3)}</p><p>{H(P1)}</p></div>'
            f'<div class="pgline"><span class="pgnum"{hid}>{n} / {TOT}</span></div><div class="daybar"><i style="width:{daypct}%"></i></div></div>{inner}')
RP_CSS = '''.rtop{position:absolute;top:0;left:0;right:0;padding:44px 8px 0;height:100px;display:flex;align-items:center;gap:4px;background:var(--rq-surface);border-bottom:1px solid var(--rq-line)}
.rtop .t{flex:1;min-width:0}.rtop .t b{display:block;font-size:17px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rtop .t span{font-size:13px;color:var(--rq-text-2)}
.rbot{position:absolute;left:0;right:0;bottom:0;background:var(--rq-surface);border-top:1px solid var(--rq-line);padding:12px 12px 22px}
.plate{margin:0 auto;width:max-content;background:var(--rq-badge-bg);color:var(--rq-badge-text);font-size:14px;font-weight:700;padding:5px 12px;border-radius:999px}
.slider{position:relative;height:44px;margin:2px 10px}.slider .tr{position:absolute;left:0;right:0;top:20px;height:4px;border-radius:2px;background:var(--rq-surface-2)}
.slider .fi{position:absolute;left:0;top:20px;height:4px;border-radius:2px;background:var(--rq-accent)}
.slider .th{position:absolute;top:12px;width:20px;height:20px;margin-left:-10px;border-radius:50%;background:var(--rq-accent);border:3px solid var(--rq-surface);box-shadow:0 0 0 1px var(--rq-accent)}
.rbtns{display:flex}.rb{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-height:52px;justify-content:center;font-size:11px;font-weight:600;color:var(--rq-text-2)}
.rb .aa{font-family:var(--rq-font-read);font-size:18px;font-weight:700;line-height:22px;color:var(--rq-text)}.rb svg{color:var(--rq-text)}'''
def reader_panels(theme):
    night = theme == 'night'; pct = (98 - 1) / (TOT - 1) * 100
    nbt = ('sun', 'День') if night else ('moon', 'Ночь')
    btns = [(ic('list'), 'Оглавление'), (ic(nbt[0]), nbt[1]), ('<div class="aa">Aa</div>', 'Шрифт'), (ic('focus'), 'Фокус'), (ic('maximize'), 'Весь экран')]
    top = f'<div class="rtop"><div class="ib" data-tap aria-label="Назад">{ic("arrow-left")}</div><div class="t"><b>Мастер и Маргарита</b><span>Михаил Булгаков · FB2</span></div></div>'
    bot = (f'<div class="rbot"><div class="plate">98 из {TOT}</div><div class="slider" data-tap><div class="tr"></div><div class="fi" style="width:{pct:.1f}%"></div>'
           f'<div class="th" style="left:{pct:.1f}%"></div></div><div class="rbtns">' + ''.join(f'<div class="rb" data-tap>{i}<span>{t}</span></div>' for i, t in btns) + '</div></div>')
    return doc(reader_doc(theme, top + bot), theme, RP_CSS, 'reader-panels')
def reader(theme): return doc(reader_doc(theme), theme, '', 'reader')

# ---------------- library ----------------
BOOKS = [('Мастер и Маргарита', 'М. Булгаков', 'FB2', 53, 1), ('Преступление и наказание', 'Ф. Достоевский', 'FB2', 12, 2),
         ('Хамелеон', 'А. П. Чехов', 'TXT', 100, 3), ('Атомные привычки', 'Джеймс Клир', 'PDF', 0, 4),
         ('Война и мир', 'Л. Толстой', 'EPUB', 4, 5), ('Sapiens', 'Ю. Н. Харари', 'PDF', 22, 6)]
LIB_CSS = '''.goal{position:absolute;top:140px;left:16px;right:16px;display:flex;align-items:center;gap:14px}
.goal b.t{font-size:17px;font-weight:800}.meta{display:flex;gap:14px;margin-top:6px;font-size:13px;font-weight:700}.meta span{display:flex;align-items:center;gap:5px}
.srow{position:absolute;top:248px;left:16px;right:16px;display:flex;gap:10px}
.search{flex:1;height:44px;border-radius:22px;background:var(--rq-surface);border:1px solid var(--rq-border-strong);display:flex;align-items:center;gap:8px;padding:0 14px;color:var(--rq-text-2);font-size:14.5px}
.add{width:44px;height:44px;border-radius:22px;background:var(--rq-accent);color:var(--rq-on-accent);display:flex;align-items:center;justify-content:center}
.chips{position:absolute;top:304px;left:16px;right:0;display:flex;gap:8px}
.chips span{height:44px;padding:0 16px;border-radius:22px;display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600;border:1px solid var(--rq-border-strong);color:var(--rq-text)}
.chips .on{background:var(--rq-accent);border-color:var(--rq-accent);color:var(--rq-on-accent);font-weight:800}
.cont{position:absolute;top:360px;left:16px;right:16px;display:flex;align-items:center;gap:12px;padding:10px 12px}
.mini{width:42px;height:56px;border-radius:6px;flex:none}
.grid{position:absolute;top:448px;left:16px;right:16px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px 12px}
.cv{aspect-ratio:3/4;border-radius:10px;position:relative;color:var(--rq-skin-cover-ink);display:flex;align-items:center;justify-content:center;font-family:var(--rq-skin-font-heading);font-size:40px;font-weight:600}
.cv .fmt{position:absolute;left:7px;top:7px;font-family:var(--rq-font-ui);font-size:10px;font-weight:800;letter-spacing:.05em;padding:2px 6px;border-radius:6px;background:rgba(0,0,0,.28)}
.bk .ti{font-size:13px;font-weight:700;margin-top:7px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bk .au{font-size:12px;color:var(--rq-text-2)}
.bk .pbar{height:4px;margin-top:5px}'''
def library(theme):
    covers = ''.join(f'<div class="bk" data-tap><div class="cv" style="background:var(--rq-skin-cover-{c})"><span class="fmt">{f}</span>{t[0]}</div>'
                     f'<div class="ti">{t}</div><div class="au">{a}</div><div class="pbar"><i style="width:{p}%"></i></div></div>' for t, a, f, p, c in BOOKS)
    body = (f'<div class="hdr"><h1>Библиотека</h1><div class="coinchip">{ic("coins", 18)}{mon(390)}</div></div>{divider(100)}'
            f'<div class="goal card">{ring(.6, 68, "<b>6</b><span>из 10</span>")}<div style="flex:1"><b class="t">Цель 10 мин</b>'
            f'<div class="mut" style="font-size:14px;margin-top:2px">Сегодня 6 мин · ещё 4 до +30 монет</div>'
            f'<div class="meta"><span style="color:var(--rq-coin)">{ic("flame", 18)}3 {plural(3, "день", "дня", "дней")} подряд</span>'
            f'<span style="color:var(--rq-accent-text)">{ic("star", 18)}Уровень 4</span></div></div></div>'
            f'<div class="srow"><div class="search" data-tap>{ic("search", 20)}Поиск по названию и автору</div><div class="add" data-tap aria-label="Добавить книги">{ic("plus", 24, sw=2.2)}</div></div>'
            f'<div class="chips"><span class="on" data-tap>{ic("check", 16, sw=2.6)}Все</span><span data-tap>Читаю</span><span data-tap>Хочу</span><span data-tap>Прочитано</span></div>'
            f'<div class="cont card"><div class="mini" style="background:var(--rq-skin-cover-1)"></div><div style="flex:1;min-width:0">'
            f'<div class="cap" style="font-size:11px">Продолжить</div><div style="font-weight:700;font-size:15px">Мастер и Маргарита</div>'
            f'<div class="mut" style="font-size:13px">Стр. 98 из 185 · 53%</div></div><div class="sbtn fill" data-tap>{ic("book-open", 18)}Читать</div></div>'
            f'<div class="grid">{covers}</div>{nav(0)}')
    return doc(body, theme, LIB_CSS, 'library')

# ---------------- rewards tab ----------------
RW_CSS = '''.task{position:absolute;left:16px;right:16px;display:flex;align-items:center;gap:14px}
.task b.t{font-size:16px;font-weight:800}.price{display:flex;align-items:center;gap:4px;height:32px;padding:0 10px;border-radius:16px;background:var(--rq-coin-tint);color:var(--rq-coin);font-weight:800;font-size:14px}
.rwcap{position:absolute;top:346px;left:16px;right:16px;display:flex;justify-content:space-between;align-items:baseline}
.rwl{position:absolute;top:372px;left:16px;right:16px;padding:0 14px}
.rw{display:flex;align-items:center;gap:12px;min-height:68px;border-bottom:1px solid var(--rq-line)}.rw:last-child{border-bottom:0}
.rw .n{flex:1;min-width:0;font-size:15px;font-weight:600}.rw .c{display:flex;align-items:center;gap:4px;font-size:13px;font-weight:700;color:var(--rq-coin);margin-top:2px}'''
def rewards(theme):
    rw = [('Серия любимого сериала', 100, True), ('Кофе в любимой кофейне', 250, True), ('Новая книга', 500, False)]
    rows = ''.join(f'<div class="rw"><span class="mut">{ic("gift", 22)}</span><div class="n">{n}<div class="c">{ic("coins", 16)}{mon(p)}</div></div>'
                   + (f'<div class="sbtn" data-tap>Обменять</div>' if ok else
                      f'<div style="text-align:right"><div class="sbtn dis" data-tap aria-disabled="true">Обменять</div><div class="mut" style="font-size:12px;margin-top:3px">не хватает {mon(p - 390)}</div></div>')
                   + '</div>' for n, p, ok in rw)
    body = (f'<div class="hdr"><h1>Награды</h1><div class="coinchip">{ic("coins", 18)}{mon(390)}</div></div>{divider(100)}'
            f'<div class="task card" style="top:140px">{ring(.6, 56, "<b style=font-size:17px>6</b>", 6)}<div style="flex:1"><b class="t">Задание дня</b>'
            f'<div class="mut" style="font-size:13px;margin-top:2px">Читать 10 мин · 6 из 10 мин</div></div><div class="price">{ic("coins", 16)}+30</div></div>'
            f'<div class="task card" style="top:236px"><div style="flex:1"><b class="t">Задание недели</b>'
            f'<div class="mut" style="font-size:13px;margin:2px 0 8px">4 дня по 10 мин · 2 из 4 дней</div><div class="dots"><i class="f"></i><i class="f"></i><i></i><i></i></div></div>'
            f'<div class="price">{ic("coins", 16)}+120</div></div>'
            f'<div class="rwcap"><span class="cap">Награды из жизни</span><span class="mut" style="font-size:13px;font-weight:600">3 из 5</span></div>'
            f'<div class="rwl card">{rows}</div>'
            f'<div style="position:absolute;top:590px;left:16px;right:16px"><div class="btn sec" data-tap>{ic("plus", 20)}Добавить награду</div>'
            f'<div class="mut" style="font-size:13px;margin-top:12px;line-height:1.45">Монеты приходят только за чтение: 30 за цель дня и ещё 120, когда наберётся 4 таких дня за неделю.</div></div>'
            + deco(0, 712, 390, 40, current(150, 330, 32, 1.1, 92, .3, 'var(--rq-skin-ripple-2)') + glints([(214, 31, 6)]) + pebbles(300, 30, .8) + reeds(354, 38, .85), 'bank')
            + nav(1))
    return doc(body, theme, RW_CSS, 'rewards')

# ---------------- profile ----------------
PR_CSS = '''.kpis{position:absolute;top:296px;left:16px;right:16px;display:flex;gap:10px}
.kpi{flex:1;background:var(--rq-surface-2);border-radius:var(--rq-radius-md);padding:10px 8px;text-align:center}
.kpi b{display:block;font-size:24px;line-height:1.2;margin-top:4px;font-weight:800}.kpi span{font-size:12px;color:var(--rq-text-2);font-weight:600}
.row{display:flex;align-items:center;min-height:52px;padding:0 4px 0 16px;border-radius:var(--rq-radius-lg);background:var(--rq-surface);border:1px solid var(--rq-line);font-size:16px;font-weight:600}'''
def profile(theme):
    days = [('Пн', 0), ('Вт', 13), ('Ср', 11), ('Чт', 6), ('Пт', None), ('Сб', None), ('Вс', None)]
    mx, Hh = 16, 76; cols = ''
    for d, m in days:
        h = 0 if not m else round(m / mx * Hh)
        bar = (f'<div style="height:{h}px;background:var(--rq-accent);border-radius:4px 4px 0 0"></div>' if m else
               '<div style="height:3px;background:var(--rq-surface-2);border-radius:2px"></div>')
        lbl = f'<div style="font-size:12px;font-weight:700;height:16px;line-height:16px">{m if m is not None else ""}</div>'
        cols += (f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">'
                 f'<div style="width:28px;height:{Hh + 20}px;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch;text-align:center;gap:4px">{lbl}{bar}</div>'
                 f'<div style="font-size:12px;{"font-weight:800;color:var(--rq-accent-text)" if d == "Чт" else "color:var(--rq-text-2)"}">{d}</div></div>')
    goal_y = Hh + 20 - round(10 / mx * Hh)
    kpi = lambda icn, col, v, l: f'<div class="kpi"><div style="display:flex;justify-content:center;color:{col}">{ic(icn, 20)}</div><b>{v}</b><span>{l}</span></div>'
    body = (f'<div class="hdr"><h1>Профиль</h1><div class="ib" data-tap aria-label="Настройки">{ic("settings", 24)}</div></div>{divider(100)}'
            f'<div class="card" style="position:absolute;top:140px;left:16px;right:16px"><div style="display:flex;align-items:center;gap:14px">'
            f'<div style="width:56px;height:56px;border-radius:50%;background:var(--rq-accent-tint);color:var(--rq-accent-text);display:flex;align-items:center;justify-content:center;font-family:var(--rq-skin-font-heading);font-size:26px;font-weight:600;flex:none">Ч</div>'
            f'<div style="flex:1;min-width:0"><b style="font-size:18px">Читатель</b><div style="font-size:14px;font-weight:700;color:var(--rq-accent-text);margin-top:1px">Уровень 4</div></div></div>'
            f'<div style="display:flex;justify-content:space-between;font-size:13px;margin:12px 0 6px"><span class="mut">Опыт</span><b>{nb(1240)} / {nb(1600)} XP</b></div>'
            f'<div class="pbar" style="height:8px"><i style="width:{(1240 - 900) / 700 * 100:.0f}%"></i></div>'
            f'<div class="mut" style="font-size:13px;margin-top:6px">Ещё 360 XP до уровня 5 · это 36 {plural(36, "минута", "минуты", "минут")} чтения</div></div>'
            f'<div class="kpis">{kpi("coins", "var(--rq-coin)", 390, plural(390, "монета", "монеты", "монет"))}{kpi("flame", "var(--rq-coin)", 3, plural(3, "день", "дня", "дней") + " подряд")}{kpi("clock", "var(--rq-accent-text)", 30, "мин за неделю")}</div>'
            f'<div class="card" style="position:absolute;top:402px;left:16px;right:16px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:16px">Эта неделя</b><span class="mut" style="font-size:13px">цель дня — 10 мин</span></div>'
            f'<div style="position:relative;display:flex;margin-top:8px">{cols}<div style="position:absolute;left:0;right:0;top:{goal_y}px;border-top:1.5px dashed var(--rq-border-strong)"></div></div>'
            f'<div class="mut" style="font-size:13px;margin-top:8px">Дней с целью: 2 из 4 · ещё 2 — и&nbsp;+120&nbsp;монет</div></div>'
            f'<div style="position:absolute;top:622px;left:16px;right:16px"><div class="row" data-tap><span style="flex:1">Создать героя</span><span class="ib" style="color:var(--rq-text-2)">{ic("chevron-right", 20)}</span></div>'
            f'<div class="mut" style="font-size:13px;margin:10px 4px 0">Всего прочитано 124 мин · дочитано книг: 1</div></div>'
            + deco(0, 712, 390, 40, current(150, 330, 33, 1.1, 92, .3, 'var(--rq-skin-ripple-2)') + glints([(214, 32, 6)]) + pebbles(300, 31, .8) + reeds(354, 39, .85), 'bank')
            + nav(2))
    return doc(body, theme, PR_CSS, 'profile')

# ---------------- session summary (modal over the clean reader) ----------------
SU_CSS = '''.modal{position:absolute;left:16px;right:16px;top:50%;transform:translateY(-50%);background:var(--rq-sheet);color:var(--rq-text);border-radius:24px;box-shadow:var(--rq-shadow-3);padding:22px 20px 20px}
.modal .bt{text-align:center;font-size:13px;color:var(--rq-text-2)}
.modal h2{text-align:center;font-family:var(--rq-skin-font-heading);font-size:26px;font-weight:600;line-height:1.25;margin-top:2px}
.band{position:relative;height:26px;margin:4px -20px 0}
.hl{display:flex;align-items:center;gap:10px;border-radius:var(--rq-radius-md);padding:12px;font-weight:800;font-size:15px;background:var(--rq-coin-tint);color:var(--rq-coin)}
.sr{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--rq-line);font-size:15px;min-height:46px}
.sr .n{flex:1;min-width:0}.sr b.v{font-size:16px;white-space:nowrap}.sr small{display:block;font-size:13px;color:var(--rq-text-2);margin-top:1px;line-height:1.35}'''
def summary(theme):
    m, today, wk, x0 = 12, 12, 2, 1240; xp = m * 10; x1 = x0 + xp
    mins = f'{m} {plural(m, "минута", "минуты", "минут")}'
    modal = (f'<div class="modal" role="dialog"><div class="bt">Мастер и Маргарита</div><h2>Сессия завершена</h2><div class="bt">Сегодняшняя цель закрыта</div>'
             f'<div class="band">' + deco(0, 0, 350, 26, current(50, 300, 10, 1.4, 104, .2) + current(100, 250, 18, 1.0, 86, .55, 'var(--rq-skin-ripple-2)') + glints([(150, 8.7, 8), (162, 9.2, 3)]), 'band') + '</div>'
             f'<div class="hl">{ic("coins", 22)}<span style="flex:1">Цель дня</span><span>+30 монет</span></div>'
             f'<div style="margin-top:6px"><div class="sr">{ic("clock", 22, "var(--rq-text-2)")}<span class="n">Время чтения</span><b class="v">{mins}</b></div>'
             f'<div class="sr">{ic("file-text", 22, "var(--rq-text-2)")}<span class="n">Страницы</span><b class="v">14</b></div>'
             f'<div class="sr" style="display:block"><div style="display:flex;justify-content:space-between;align-items:baseline"><span>Опыт · <b>Уровень 4</b></span>'
             f'<b class="v" style="color:var(--rq-accent-text)">+{xp} XP</b></div><div class="pbar" style="height:8px;margin:8px 0 5px"><i style="width:{(x1 - 900) / 700 * 100:.0f}%"></i></div>'
             f'<small>{nb(x1)} / {nb(1600)} XP · до уровня 5 ещё {nb(1600 - x1)} XP</small></div>'
             f'<div class="sr">{ring(1, 46, ic("check", 22, "var(--rq-accent-text)", 2.6), 5)}<div class="n"><b>Цель дня выполнена</b><small>Цель 10 мин · сегодня {today} мин</small></div></div>'
             f'<div class="sr" style="border:0">{ic("calendar-check", 22, "var(--rq-text-2)")}<span class="n">Неделя: {wk} из 4 дней</span>'
             f'<div class="dots">{"".join("<i class=f></i>" if k < wk else "<i></i>" for k in range(4))}</div></div></div>'
             f'<div class="btn" data-tap style="margin-top:12px">В библиотеку</div></div>')
    return doc(reader_doc(theme, '<div class="scrim"></div>' + modal, daypct=100, under=True), theme, SU_CSS, 'session-summary')

SCREENS = [('library', library, 'Библиотека'), ('reader', reader, 'Читалка (чистая)'), ('session-summary', summary, 'Итог сессии'),
           ('rewards', rewards, 'Награды'), ('profile', profile, 'Профиль'), ('reader-panels', reader_panels, 'Читалка: панели (доп.)')]

def shot(html, png, scale, w=390, h=844):
    subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', f'--force-device-scale-factor={scale}',
                    f'--window-size={w},{h}', '--virtual-time-budget=2000', f'--screenshot={png}', 'file://' + html], capture_output=True, timeout=120)

def overview():
    D = T['day']
    def col(th):
        return ''.join(f"<div style='width:390px'><img src='../../12-rechnoy/rechnoy-{k}-{th}.png' style='width:390px;height:844px;border-radius:18px;display:block;box-shadow:0 2px 14px rgba(16,48,58,.18)'>"
                       f"<div style='margin-top:10px;font:700 18px Manrope'>{cap}</div><div style='font:13px monospace;color:{D['text-muted']};margin-top:2px'>rechnoy-{k}-{th}.png</div></div>" for k, _, cap in SCREENS)
    W = 40 + 120 + 6 * 390 + 5 * 34 + 40
    band = deco(0, 0, W, 34, current(40, W * .55, 12, 2.2, 90, .1) + current(W * .25, W - 60, 22, 1.8, 76, .4, 'var(--rq-skin-ripple-2)') + glints([(300, 7, 9), (330, 6, 4), (1500, 18, 8)])
                + reeds(W - 70, 33, 1) + pebbles(W - 140, 28, 1), 'ov')
    html = (f"<!doctype html><html lang=ru data-skin=rechnoy><head><meta charset=utf-8><style>{CANON_CSS}{open(OUT + '/tokens.rq.css').read()}"
            f"body{{margin:0;width:{W}px;font-family:Manrope,sans-serif;color:var(--rq-text);background:linear-gradient(180deg,var(--rq-skin-bg-top),var(--rq-bg) 400px);padding:34px 40px 30px;box-sizing:border-box}}"
            f".r{{display:flex;gap:34px;align-items:flex-start}}.lab{{width:120px;flex:none;font:600 26px Lora;padding-top:380px}}</style></head><body>"
            f"<div style='font:600 44px Lora'>ReadQuest — скин «Речной»</div>"
            f"<div style='font-size:18px;color:var(--rq-text-2);margin:8px 0 6px'>Спокойная река: вода и бирюза, мокрый песок и галька, мягкий свет на воде. Ночь — глубокая река в сумерках. "
            f"Декор — только линии течения, камыш и камешки в пустых местах; лист книги чистый. data-skin=\"rechnoy\" · токены stage1-final · 390×844</div>"
            f"<div style='position:relative;height:40px'>{band}</div>"
            f"<div class=r><div class=lab>День</div>{col('day')}</div><div style='height:34px'></div>"
            f"<div class=r><div class=lab>Ночь</div>{col('night')}</div></body></html>")
    f = SRC + '/rechnoy-overview.html'; open(f, 'w').write(html)
    shot(f, OUT + '/rechnoy-overview.png', 1, W, 34 + 54 + 52 + 40 + 2 * (844 + 54) + 34 + 40)

if __name__ == '__main__':
    r = write_tokens(); print('tokens.rq: pairs', r['pairs'], 'FAILS', r['fails'])
    jobs = []
    for th in ('day', 'night'):
        for k, fn, cap in SCREENS:
            f = f'{SRC}/rechnoy-{k}-{th}.html'; open(f, 'w').write(fn(th))
            jobs += [(f, f'{OUT}/rechnoy-{k}-{th}.png', 1), (f, f'{OUT}/rechnoy-{k}-{th}@2x.png', 2)]
    with ThreadPoolExecutor(6) as ex: list(ex.map(lambda j: shot(*j), jobs))
    overview(); print('ok', len(jobs))
