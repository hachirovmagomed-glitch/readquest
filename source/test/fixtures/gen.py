# Test PDFs for the ReadQuest PDF reader (reportlab + pikepdf)
import random, io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A5
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import pikepdf
from PIL import Image, ImageDraw, ImageFont, ImageFilter

pdfmetrics.registerFont(TTFont('DJS', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('DJSB', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'))
OUT = '/workspace/rqtest/pdf/'
W, H = A5  # 420 x 595 pt
random.seed(7)
WORDS = ('капитализм реализм культура будущее время общество желание рынок система тревога память '
         'город работа долг смысл образ вещь власть голос история сознание мир бюрократия кризис '
         'политика депрессия музыка экран товар фильм призрак ностальгия свобода').split()
def para(n):
    return ' '.join(random.choice(WORDS) for _ in range(n)).capitalize() + '.'
BEIGE = (0.953, 0.914, 0.824); INK = (0.23, 0.16, 0.10)
BLUE = (0.12, 0.31, 0.78); RED = (0.80, 0.16, 0.16)

GREEN = (0.10, 0.62, 0.25)
def draw_page(c, label, chapter=None, running='М. Фишер · Капиталистический реализм', idx=None):
    c.setFillColorRGB(*BEIGE); c.rect(0, 0, W, H, stroke=0, fill=1)
    if idx is not None:  # machine-readable FILE index for the tests: upper row = idx//12, lower row = idx%12
        c.setFillColorRGB(*GREEN)
        c.rect(30 + 30 * (idx // 12) + 10, 14, 10, 5, stroke=0, fill=1)
        c.rect(30 + 30 * (idx % 12) + 10, 6, 10, 5, stroke=0, fill=1)
    # header band (blue) at TOP + running head; footer red mark + printed number at BOTTOM
    c.setFillColorRGB(*BLUE); c.rect(28, H - 34, W - 56, 6, stroke=0, fill=1)
    c.setFillColorRGB(*INK); c.setFont('DJS', 8); c.drawString(30, H - 24, running)
    c.setFillColorRGB(*RED); c.rect(W / 2 - 20, 22, 40, 4, stroke=0, fill=1)
    c.setFillColorRGB(*INK); c.setFont('DJS', 9); c.drawCentredString(W / 2, 32, label)
    if chapter:
        c.setFont('DJSB', 22); c.drawCentredString(W / 2, H * 0.62, chapter)
        c.setFont('DJS', 11); c.drawCentredString(W / 2, H * 0.62 - 30, para(4))
        return
    c.setFont('DJS', 10.5)
    y = H - 60; x0 = 30; maxw = W - 60
    while y > 60:
        line = ''
        while True:
            w = random.choice(WORDS)
            cand = (line + ' ' + w).strip()
            if pdfmetrics.stringWidth(cand, 'DJS', 10.5) > maxw: break
            line = cand
        c.drawString(x0, y, line); y -= 14.2

def roman(n):
    return ['i', 'ii', 'iii', 'iv', 'v', 'vi'][n - 1]

def book(path, n=144, labels=True):
    c = canvas.Canvas(path, pagesize=A5)
    chapters = {4: 'Глава 1', 20: 'Глава 2', 38: 'Глава 3', 57: 'Глава 4', 76: 'Глава 5', 95: 'Глава 6', 114: 'Глава 7', 130: 'Глава 8'}
    for i in range(n):
        lab = (roman(i + 1) if i < 4 else str(i - 4 + 2)) if labels else str(i + 1)  # arabic starts at 2 on file page 5
        draw_page(c, lab, chapters.get(i), idx=i)
        c.showPage()
    c.save()
    if labels:
        pdf = pikepdf.open(path, allow_overwriting_input=True)
        pdf.Root.PageLabels = pikepdf.Dictionary(Nums=pikepdf.Array([
            0, pikepdf.Dictionary(S=pikepdf.Name('/r')),
            4, pikepdf.Dictionary(S=pikepdf.Name('/D'), St=2)]))
        pdf.save(path)

book(OUT + 'a-labels-144.pdf', 144, True)
book(OUT + 'b-nolabels-40.pdf', 40, False)

# (в) rotated pages: content pre-rotated so that the CORRECT render (with /Rotate) is upright
c = canvas.Canvas(OUT + 'c-rotate.pdf')
rots = []
for i in range(12):
    r = [0, 90, 180, 0, 270, 0, 180, 90, 0, 0, 180, 0][i]
    rots.append(r)
    if r in (90, 270): c.setPageSize((H, W))
    else: c.setPageSize((W, H))
    c.saveState()
    if r == 90: c.transform(0, 1, -1, 0, H, 0)       # upright after clockwise /Rotate 90
    elif r == 270: c.transform(0, -1, 1, 0, 0, W)
    elif r == 180: c.transform(-1, 0, 0, -1, W, H)
    draw_page(c, str(i + 1), idx=i)
    c.restoreState(); c.showPage()
c.save()
pdf = pikepdf.open(OUT + 'c-rotate.pdf', allow_overwriting_input=True)
for p, r in zip(pdf.pages, rots):
    if r: p.Rotate = r
pdf.save(OUT + 'c-rotate.pdf')

# (г) scan: page images (no text layer), heavy (2480x3508 JPEG ~ A4 @300dpi)
fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 46)
c = canvas.Canvas(OUT + 'd-scan.pdf', pagesize=A5)
for i in range(16):
    im = Image.new('RGB', (2480, 3508), (240, 232, 214))
    d = ImageDraw.Draw(im)
    d.rectangle([160, 150, 2320, 180], fill=(30, 80, 200))
    y = 260
    while y < 3250:
        d.text((170, y), ' '.join(random.choice(WORDS) for _ in range(7)), fill=(60, 45, 30), font=fnt); y += 64
    d.rectangle([1140, 3360, 1340, 3380], fill=(204, 40, 40))
    d.text((1210, 3400), str(i + 1), fill=(60, 45, 30), font=fnt)
    im = im.filter(ImageFilter.GaussianBlur(0.6))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=85); b.seek(0)
    from reportlab.lib.utils import ImageReader
    c.drawImage(ImageReader(b), 0, 0, W, H); c.showPage()
c.save()
print('ok')
