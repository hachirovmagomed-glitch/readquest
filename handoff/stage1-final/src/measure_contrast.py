# Контраст: (1) пары токенов, (2) по пикселям готовых @2x PNG (основа — mockups/drawn/src/measure_contrast.py).
# Для каждой надписи: цвет текста из computed style, фон — пиксели @2x вокруг текста без самих букв (типичный = медиана, худший = 5-й перцентиль).
import json, subprocess, os, re, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokens import COLORS, PAGE
from gen import SCREENS
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(D)
def lum(c):
    c = np.asarray(c, dtype=float)/255; c = np.where(c <= .04045, c/12.92, ((c+.055)/1.055)**2.4); return c[..., 0]*.2126+c[..., 1]*.7152+c[..., 2]*.0722
def cr(a, b): a, b = max(a, b), min(a, b); return (a+.05)/(b+.05)
def hx(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def crh(a, b): return round(cr(float(lum(np.array(hx(a)))), float(lum(np.array(hx(b))))), 2)
C = {n: (d, nv) for n, d, nv, _ in COLORS}
rows = []
# ---------- 1. пары токенов ----------
PAIRS = [  # (текст/элемент, фон, порог, что)
 ('text','bg',4.5,'основной текст'),('text','surface',4.5,'текст на карточке'),('text','surface-2',4.5,'текст в чипе/сегменте'),('text','sheet',4.5,'текст в шторке'),
 ('text-2','bg',4.5,'вторичный на фоне'),('text-2','surface',4.5,'вторичный на карточке'),('text-2','surface-2',4.5,'вторичный в KPI/сегменте'),('text-2','sheet',4.5,'вторичный в шторке'),
 ('accent-text','bg',4.5,'акцентный текст на фоне'),('accent-text','surface',4.5,'акцентный текст на карточке'),('accent-text','accent-tint',4.5,'«вы здесь», меню активное'),('accent-text','control-on',4.5,'выбранный сегмент'),('accent-text','sheet',4.5,'акцентный текст в шторке'),
 ('on-accent','accent',4.5,'текст на главной кнопке'),('on-accent','accent-pressed',4.5,'текст на нажатой кнопке'),
 ('coin','coin-tint',4.5,'цифры в чипе монет'),('coin','bg',4.5,'монеты на фоне'),('coin','surface',4.5,'монеты на карточке'),('coin','sheet',4.5,'монеты в итоге'),
 ('success','success-tint',4.5,'плашка «выполнено»'),('danger','surface',4.5,'«Сбросить весь прогресс»'),('danger','bg',4.5,'ошибка на фоне'),
 ('badge-text','badge-bg',4.5,'плашка «N из M»'),
 ('toast-game-fg','toast-game-bg',4.5,"тост game"),('toast-info-fg','toast-info-bg',4.5,"тост info"),('toast-info-icon','toast-info-bg',3.0,"иконка тоста info (графика)"),('toast-error-fg','toast-error-bg',4.5,"тост error"),
 ('accent','bg',3.0,'граница главной кнопки/слайдера к фону (1.4.11)'),('accent','surface',3.0,'слайдер, кольцо на карточке'),('accent','sheet',3.0,'кнопка в итоге/шторке'),
 ('border-strong','bg',3.0,'контур поля поиска/переключателя'),('border-strong','surface',3.0,'контур переключателя на карточке'),('focus','bg',3.0,'кольцо фокуса'),
]
for th_i, th in enumerate(('day', 'night')):
    for a, b, thr, what in PAIRS:
        v = crh(C[a][th_i], C[b][th_i]); rows.append(('tokens', th, f'--rq-{a} на --rq-{b}', what, '', C[a][th_i], C[b][th_i], thr, v, v, 'ok' if v >= thr else 'FAIL'))
for p, vals in PAGE.items():
    for a, thr, what in (('r-txt', 4.5, 'текст книги'), ('r-txt-2', 4.5, 'номер страницы в углу')):
        v = crh(vals[a], vals['r-bg']); rows.append(('tokens', 'page-'+p, f'--{a} на --r-bg', what, '', vals[a], vals['r-bg'], thr, v, v, 'ok' if v >= thr else 'FAIL'))
# PDF ночью: чёрный текст на белой странице под слоем .35
wl = float(lum(np.array([255*.65]*3))); v = round(cr(wl, 0.0), 2)
rows.append(('tokens', 'night', 'PDF: #000 на #fff под слоем rgba(0,0,0,.35)', 'текст PDF ночью (страница ≈ #a6a6a6)', '', '#000000', '#a6a6a6', 4.5, v, v, 'ok'))
# ---------- 2. по пикселям ----------
JS = '''<script>addEventListener('load',()=>{const o=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
while(n=w.nextNode()){if(!n.textContent.trim())continue;const el=n.parentElement;if(el.closest('svg,style,script,[data-nocheck]'))continue;const r=document.createRange();r.selectNodeContents(n);
const ex=el.closest('[data-under]')?'exempt: под затемнением':(el.closest('.dis')?'exempt: disabled':'');if(getComputedStyle(el).visibility==='hidden')continue;const rr=r.getBoundingClientRect();const hit=document.elementFromPoint(rr.left+Math.min(rr.width/2,8),rr.top+rr.height/2);if(!hit||!(el.contains(hit)||hit.contains(el)))continue;const cs=getComputedStyle(el);for(const b of r.getClientRects()){if(b.width<2)continue;o.push({t:n.textContent.trim().slice(0,46),x:b.left,y:b.top,w:b.width,h:b.height,c:cs.color,fs:parseFloat(cs.fontSize),fw:parseInt(cs.fontWeight),ex:ex})}}
const p=document.createElement('pre');p.id='OUT';p.textContent=JSON.stringify(o);document.body.appendChild(p)})</script>'''
from gen import ADAPTIVE
TARGETS = [(f'{k}-{th}', f'{k}-{th}', 390, 844, f'{OUT}/{k}-{th}@2x.png') for k, *_ in SCREENS for th in ('day', 'night')]
TARGETS += [(f'adaptive/{k}-{w}x{h}-{th}', f'{k}-{th}', w, h, f'{OUT}/adaptive/{k}-{w}x{h}-{th}@2x.png') for k, w, h, ths in ADAPTIVE for th in ths]
import autoscroll as _as
TARGETS += [(f'autoscroll/{k}-{th}', f'{k}-{th}', 390, 844, f'{OUT}/autoscroll/{k}-{th}@2x.png') for k, *_ in _as.AS for th in ('day', 'night')]
TARGETS += [(f'autoscroll/{k}-{w}x{h}-{th}', f'{k}-{th}', w, h, f'{OUT}/autoscroll/{k}-{w}x{h}-{th}@2x.png') for k, w, h, ths in _as.LAND for th in ths]
for n, src, VW, VH, png in TARGETS:
    if True:
        h = open(f'{D}/{src}.html').read().replace('</body>', JS+'</body>'); tp = f'{D}/_m_{src}_{VW}.html'; open(tp, 'w').write(h)
        # --dump-dom не учитывает --window-size (вьюпорт 500×757), а вёрстка резиновая: меряем страницу в iframe точного размера.
        wp = tp[:-5]+'_wrap.html'
        open(wp, 'w').write(f'<html><body style="margin:0"><iframe id="F" src="{os.path.basename(tp)}" style="border:0;width:{VW}px;height:{VH}px;display:block"></iframe><pre id="OUT"></pre>'
            '<script>F.addEventListener("load",()=>setTimeout(()=>{const p=F.contentDocument.getElementById("OUT");document.getElementById("OUT").textContent=p?p.textContent:"[]"},300))</script></body></html>')
        dom = subprocess.run(['/usr/bin/google-chrome', '--headless=new', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files', '--window-size=1200,1200', '--virtual-time-budget=4000', '--dump-dom', 'file://'+wp], capture_output=True, text=True).stdout
        os.remove(tp); os.remove(wp)
        js = json.loads(re.search(r'<pre id="OUT">(.*?)</pre>', dom, re.S).group(1).replace('&quot;', '"').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>'))
        im = np.asarray(Image.open(png).convert('RGB')); L = lum(im); H, W = L.shape
        seen = set()
        for e in js:
            x0, y0, x1, y1 = [int(round(v*2)) for v in (e['x']-3, e['y']-2, e['x']+e['w']+3, e['y']+e['h']+2)]
            x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, W), min(y1, H)
            if x1-x0 < 8 or y1-y0 < 8 or y0 >= H: continue
            m = re.match(r'rgba?\(([\d.]+), ([\d.]+), ([\d.]+)', e['c']); tc = tuple(float(v) for v in m.groups()); Lt = float(lum(np.array(tc)))
            R = L[y0:y1, x0:x1]; med = float(np.median(R))
            tm = np.abs(R-Lt) < .8*abs(med-Lt)
            dm = tm.copy()
            for dy in range(-3, 4):
                for dx in range(-3, 4): dm |= np.roll(np.roll(tm, dy, 0), dx, 1)
            bg = R[~dm]
            if len(bg) < 30: continue
            worst = float(np.percentile(bg, 5 if med > Lt else 95)); typ = float(np.median(bg))
            large = e['fs'] >= 24 or (e['fs'] >= 18.66 and e['fw'] >= 700)
            thr = 3.0 if large else 4.5
            k = (e['t'], e['c'])
            if k in seen: continue
            seen.add(k)
            ct, cw = round(cr(Lt, typ), 2), round(cr(Lt, worst), 2)
            col = '#%02x%02x%02x' % tuple(int(v) for v in tc)
            rows.append(('pixels', n, e['t'], f"{e['fs']:g}px/{e['fw']}", '', col, '', thr, ct, cw, e['ex'] or ('ok' if ct >= thr else 'FAIL')))
with open(f'{OUT}/contrast.tsv', 'w') as f:
    f.write('method\tscreen_or_theme\ttext_or_pair\tnote_or_font\t_\tfg\tbg\tthreshold\tcontrast_typical\tcontrast_worst_bg\tstatus\n')
    for r in rows: f.write('\t'.join(map(str, r))+'\n')
tok = [r for r in rows if r[0] == 'tokens']; px = [r for r in rows if r[0] == 'pixels']
print('tokens', len(tok), 'fail', [r[2]+' '+r[1]+' '+str(r[8]) for r in tok if r[10] == 'FAIL'])
print('pixels', len(px), 'fail(typical)', len([r for r in px if r[10] == 'FAIL']))
px = [r for r in px if not r[10].startswith('exempt')]
print('exempt rows', len([r for r in rows if r[0]=='pixels' and r[10].startswith('exempt')]))
for r in sorted(px, key=lambda r: r[8]/r[7])[:25]: print(r[1], '|', r[2], '|', r[3], r[5], 'thr', r[7], 'typ', r[8], 'worst', r[9])
for th in ('day', 'night'):
    t = [r for r in tok if r[1] == th and r[7] == 4.5]; p = [r for r in px if r[1].endswith(th)]
    pa = [r for r in px if r[1].startswith('adaptive/') and r[1].endswith(th)]
    if pa: print(th, 'adaptive rows', len(pa), 'min', min(r[8] for r in pa))
    pz = [r for r in px if r[1].startswith('autoscroll/') and r[1].endswith(th)]
    if pz: print(th, 'autoscroll rows', len(pz), 'min', min(r[8] for r in pz), 'fails', [r[1]+' '+r[2] for r in pz if r[10]=='FAIL'])
    print(th, 'min token text', min(r[8] for r in t), 'min pixel typical', min(r[8] for r in p), 'min pixel worst', min(r[9] for r in p))
