# 05.11 pdfmore.test.mjs: a 3-page PDF with its own text.
# Page 1: a running header, a chapter bookmark, prose with a note mark «слово¹» (small raised 1) and the note at the foot of the page;
#   the last paragraph goes on to page 2. Page 2: the end of that paragraph, then pre-1918 spelling. Page 3 (bookmark): verse.
# Run: python3 gen-pdfmore.py [out dir]   (default /workspace/rqtest/pdf/)
import sys, os
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
OUT = (sys.argv[1] if len(sys.argv) > 1 else '/workspace/rqtest/pdf/').rstrip('/') + '/'
os.makedirs(OUT, exist_ok=True)
pdfmetrics.registerFont(TTFont('DJS', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
W, H = 420, 595
c = canvas.Canvas(OUT + 'pdfmore.pdf', pagesize=(W, H))
def head(s):
    c.setFont('DJS', 8); c.drawCentredString(W / 2, H - 35, s)
def lines(y, ls, fs=10.5, x=40, ind=None):
    for k, s in enumerate(ls):
        c.setFont('DJS', fs); c.drawString(x + (14 if ind and k in ind else 0), y, s); y -= 14
    return y
# page 1
head('СТАРАЯ КНИГА'); c.bookmarkPage('p1'); c.addOutlineEntry('Глава первая', 'p1', level=0)
c.setFont('DJS', 14); c.drawString(40, H - 80, 'Глава первая')
y = lines(H - 110, ['Первый абзац рассказывает о море и о старом', 'капитане, который знал все острова.'], ind={0})
c.setFont('DJS', 10.5); s = 'Однажды он увидел маяк'; c.drawString(54, y, s); x = 54 + pdfmetrics.stringWidth(s, 'DJS', 10.5)
c.setFont('DJS', 6.5); c.drawString(x + 0.5, y + 4, '1'); c.setFont('DJS', 10.5); c.drawString(x + 5, y, ' на скале.'); y -= 14
y = lines(y, ['Второй абзац начинается здесь и продолжается до самого', 'конца страницы, а потом переходит на'], ind={0})
c.setFont('DJS', 7); c.drawString(40, 70, '1'); c.drawString(46, 70, 'Маяк стоял на этой скале двести лет.')
c.setFont('DJS', 9); c.drawCentredString(W / 2, 40, '5'); c.showPage()
# page 2
head('СТАРАЯ КНИГА')
y = lines(H - 80, ['следующую страницу и кончается.', 'Въ домѣ новаго капитана было тихо, и міръ казался', 'добрымъ.'], ind={1})
c.setFont('DJS', 9); c.drawCentredString(W / 2, 40, '6'); c.showPage()
# page 3
head('СТАРАЯ КНИГА'); c.bookmarkPage('p3'); c.addOutlineEntry('Глава вторая', 'p3', level=0)
c.setFont('DJS', 14); c.drawString(40, H - 80, 'Глава вторая')
lines(H - 110, ['Волна идёт,', 'маяк горит,', 'старик не спит.'])
c.setFont('DJS', 9); c.drawCentredString(W / 2, 40, '7'); c.showPage()
c.save()
print(OUT + 'pdfmore.pdf')
