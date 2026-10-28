# 28.10 «Корректное копирование»: a scan-like PDF (page picture + an invisible OCR text layer, as ABBYY makes it) for copy.test.mjs.
# Page 1: two columns of verse with small line numbers (as in Джессика's «Старшая Эдда»); the OCR text goes across BOTH columns line
#   by line (the worst file order), some Russian words carry Latin look-alike letters (OCR noise), a page number at the bottom.
# Both pages carry a running header «Старшая Эдда» on top (not copied).
# Page 2: one column of justified prose: a word hyphenated over a line break, paragraphs by indent, a page number.
# copy-scan.pdf (28.10, ocr.test.mjs): the same verse page as a bare picture — no text layer at all, as a scan without OCR.
# copy-scan3.pdf: three pages for «Распознать всю книгу» (picture, own text, picture).
# Run: python3 gen-copy.py [out dir]   (default /workspace/rqtest/pdf/)
import sys, io, os
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageDraw, ImageFont

OUT = (sys.argv[1] if len(sys.argv) > 1 else '/workspace/rqtest/pdf/').rstrip('/') + '/'
os.makedirs(OUT, exist_ok=True)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
pdfmetrics.registerFont(TTFont('DJS', FONT))
W, H = 420, 595
K = 4  # picture px per pt

LEFT = [(147, ['Знаю второе, —', 'оно врачеванью', 'пользу приносит.']),
        (148, ['Знаю и третье, —', 'оно защитит', 'в битве с врагами,', 'клинки их туплю,']),
        (149, ['Четвертое знаю, —', 'коль свяжут мне члены', 'оковами крепкими,']),
        (153, ['Знаю восьмое, —', 'это бы всем', 'помнить полезно:', 'где ссора начнется'])]
RIGHT = [(None, ['средь воинов смелых,', 'могу помирить их.']),
         (154, ['Знаю девятое, —', 'если ладья', 'борется с бурей,']),
         (155, ['Знаю десятое, —', 'если замечу,', 'что ведьмы взлетели,']),
         (156, ['Одиннадцатым', 'друзей оберечь', 'в битве берусь я,'])]
NOISE = {'оно врачеванью': 'oнo врачеванью', 'пользу приносит.': 'пoльзу пpинocит.'}  # Latin o, p, c inside Russian words

def verse_items():
    out = []
    for x0, nx, col in ((70, 50, LEFT), (245, 225, RIGHT)):
        y = H - 70
        for n, lines in col:
            for k, s in enumerate(lines):
                out.append((x0, y, 10.5, s, NOISE.get(s, s)))
                if k == 0 and n: out.append((nx, y + 2, 6, str(n), str(n)))
                y -= 13.5
            y -= 11
    out.append((W / 2 - 8, 40, 9, '203', '203'))
    out.append((W / 2 - 34, H - 35, 8, 'СТАРШАЯ ЭДДА', 'СТАРШАЯ ЭДДА'))  # running header: small capitals
    return out

PROSE = [('  Первый абзац текста идёт по всей ширине до самого края', True, 'пере-'),
         ('носится на новую строку и спокойно идёт до самого конца', True, ''),
         ('и кончается здесь.', False, ''),
         ('  Второй абзац начинается с отступа и тоже идёт до', True, ''),
         ('самого конца страницы.', False, '')]

def prose_items():
    out, y = [], H - 80
    for s, full, tail in PROSE:
        t = s.strip() + ((' ' + tail) if tail else '')
        out.append((40 + (14 if s.startswith('  ') else 0), y, 9.5, t, t, full))
        y -= 13
    out.append((W / 2 - 6, 40, 9, '204', '204', False))
    out.append((W / 2 - 30, H - 35, 9.5, 'Старшая Эдда', 'Старшая Эдда', False))  # the same header in body type: known from page 1
    return out

def picture(items):
    im = Image.new('L', (W * K, H * K), 245); d = ImageDraw.Draw(im)
    for it in items:
        x, y, fs, shown = it[0], it[1], it[2], it[3]
        f = ImageFont.truetype(FONT, int(fs * K))
        full = len(it) > 5 and it[5]
        if full:  # justified: spread the words to the right edge (380 pt)
            ws = shown.split(' '); tw = sum(d.textlength(w, font=f) for w in ws); gap = ((380 - x) * K - tw) / max(1, len(ws) - 1); cx = x * K
            for w in ws: d.text((cx, (H - y) * K), w, font=f, fill=20, anchor='ls'); cx += d.textlength(w, font=f) + gap
        else:
            d.text((x * K, (H - y) * K), shown, font=f, fill=20, anchor='ls')
    b = io.BytesIO(); im.save(b, 'PNG'); b.seek(0); return ImageReader(b)

c = canvas.Canvas(OUT + 'copy-edda.pdf', pagesize=(W, H))
for items in (verse_items(), prose_items()):
    c.drawImage(picture(items), 0, 0, W, H)
    t = c.beginText(); t.setTextRenderMode(3)
    for it in sorted(items, key=lambda q: (-round(q[1]), q[0])):  # OCR order: across the page, top line first
        x, y, fs, ocr = it[0], it[1], it[2], it[4]
        full = len(it) > 5 and it[5]
        t.setFont('DJS', fs)
        if full:  # the OCR words are placed one by one where the picture has them (spread to the right edge)
            ws = ocr.split(' '); tw = sum(pdfmetrics.stringWidth(w, 'DJS', fs) for w in ws); gap = ((380 - x) - tw) / max(1, len(ws) - 1); cx = x
            for k, w in enumerate(ws):
                t.setTextOrigin(cx, y); t.textOut(w + (' ' if k < len(ws) - 1 else '')); cx += pdfmetrics.stringWidth(w, 'DJS', fs) + gap
        else:
            t.setTextOrigin(x, y); t.textOut(ocr)
    c.drawText(t); c.showPage()
c.save()
c = canvas.Canvas(OUT + 'copy-scan.pdf', pagesize=(W, H))
c.drawImage(picture(verse_items()), 0, 0, W, H); c.showPage()
c.save()
# copy-scan3.pdf (28.10, «Распознать всю книгу»): a picture of prose, a page with its own text, a picture of verse
c = canvas.Canvas(OUT + 'copy-scan3.pdf', pagesize=(W, H))
c.drawImage(picture(prose_items()), 0, 0, W, H); c.showPage()
c.setFont('DJS', 11); c.drawString(40, H - 80, 'Страница с текстом файла.'); c.showPage()
c.drawImage(picture(verse_items()), 0, 0, W, H); c.showPage()
c.save()
print(OUT + 'copy-edda.pdf', OUT + 'copy-scan.pdf', OUT + 'copy-scan3.pdf')
