# 10.11 обложки своих книг (js/covers.js): EPUB 3 with properties="cover-image", EPUB 2 with <meta name="cover">, FB2 with <coverpage>,
# a PDF whose page 1 is a coloured cover, and an EPUB without any cover. Out: $RQ_COV_OUT (default /workspace/rqtest/covers/).
import io, os, zipfile, base64
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
OUT = os.environ.get('RQ_COV_OUT', '/workspace/rqtest/covers/'); os.makedirs(OUT, exist_ok=True)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
def cover(title, bg, w=600, h=900):
    im = Image.new('RGB', (w, h), bg); d = ImageDraw.Draw(im); f = ImageFont.truetype(FONT, 54)
    d.rectangle([30, 30, w - 30, h - 30], outline=(255, 255, 255), width=8)
    y = 300
    for line in title.split('\n'):
        tw = d.textlength(line, font=f); d.text(((w - tw) / 2, y), line, fill=(255, 255, 255), font=f); y += 80
    b = io.BytesIO(); im.save(b, 'JPEG', quality=88); return b.getvalue()
TEXT = ''.join('<p>Абзац %d. Это текст тестовой книги про обложки, в нём достаточно слов, чтобы книга открылась и легла на полку.</p>' % i for i in range(40))
def epub(path, opf_meta, items, cover_bytes, cover_name='images/cover.jpg', props=''):
    z = zipfile.ZipFile(path, 'w'); z.writestr('mimetype', 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
    z.writestr('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
    man = '<item id="ch1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>' + items
    if cover_bytes: man += '<item id="cov-img" href="%s" media-type="image/jpeg"%s/>' % (cover_name, props); z.writestr('OEBPS/' + cover_name, cover_bytes)
    z.writestr('OEBPS/content.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>%s</dc:title><dc:creator>Тест Обложкин</dc:creator><dc:language>ru</dc:language>%s</metadata><manifest>%s</manifest><spine><itemref idref="ch1"/></spine></package>' % (os.path.basename(path)[:-5], opf_meta, man))
    z.writestr('OEBPS/text/ch1.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Глава 1</h1>%s</body></html>' % TEXT); z.close()
epub(OUT + 'Обложка EPUB3.epub', '', '', cover('EPUB 3\nобложка', (40, 90, 160)), props=' properties="cover-image"')
epub(OUT + 'Обложка EPUB2.epub', '<meta name="cover" content="cov-img"/>', '', cover('EPUB 2\nобложка', (150, 40, 60)), cover_name='img/front.jpg')
epub(OUT + 'Без обложки.epub', '', '', None)
c64 = base64.b64encode(cover('FB2\nобложка', (30, 120, 70))).decode()
fb2 = ('<?xml version="1.0" encoding="utf-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink"><description><title-info>'
       '<author><first-name>Тест</first-name><last-name>Обложкин</last-name></author><book-title>Обложка FB2</book-title><coverpage><image l:href="#cover.jpg"/></coverpage><lang>ru</lang></title-info></description>'
       '<body><section><title><p>Глава 1</p></title>%s</section></body><binary id="cover.jpg" content-type="image/jpeg">%s</binary></FictionBook>') % (TEXT, c64)
open(OUT + 'Обложка FB2.fb2', 'w', encoding='utf-8').write(fb2)
cv = canvas.Canvas(OUT + 'Обложка PDF.pdf', pagesize=(420, 595))
cv.setFillColorRGB(0.85, 0.45, 0.10); cv.rect(0, 0, 420, 595, stroke=0, fill=1); cv.showPage()
for i in range(3): cv.setFillColorRGB(1, 1, 1); cv.rect(0, 0, 420, 595, stroke=0, fill=1); cv.setFillColorRGB(0, 0, 0); cv.drawString(60, 500, 'Page %d text' % (i + 2)); cv.showPage()
cv.save()
print('ok', sorted(os.listdir(OUT)))
