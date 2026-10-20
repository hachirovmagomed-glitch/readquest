# 20.10 bookfind.test.mjs: a 30-page A5 PDF with 6 bookmarks («Глава N», pages 1, 6, 11 …) and «маяк Персея» on pages 1, 4, 7 … 28
from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import glob
f=glob.glob('/usr/share/fonts/**/DejaVuSerif.ttf',recursive=True)
pdfmetrics.registerFont(TTFont('DV',f[0]))
c=canvas.Canvas('/workspace/rqtest/pdf/f-outline-30.pdf',pagesize=A5)
W,H=A5
words='слово лампа фонарь город улица море ветер книга страница читатель дорога'.split()
for i in range(30):
    if i%5==0:
        ch=i//5+1;key='ch%d'%ch
        c.bookmarkPage(key);c.addOutlineEntry('Глава %d. Путь фонарщика номер %d'%(ch,ch),key,level=0)
        c.setFont('DV',16);c.drawString(40,H-60,'Глава %d'%ch)
    c.setFont('DV',11)
    for l in range(22):
        t=' '.join(words[(i*7+l*3+k)%len(words)] for k in range(5))
        if l==10 and i%3==0:t='маяк Персея '+' '.join(t.split()[:3])
        c.drawString(40,H-100-l*18,t)
    c.showPage()
c.save()
