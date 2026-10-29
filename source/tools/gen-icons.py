#!/usr/bin/env python3
"""1в: Lucide sprite (lucide-static 1.52.0, ISC) → inlined into app.html between <!--RQ-ICONS--> markers.
Usage: python3 tools/gen-icons.py [ICONS_DIR]  (default /tmp/lucide-icons = npm pack lucide-static@1.52.0 → package/icons;
handoff/stage1-final/src/icons is used first when it has the icon). One set, stroke currentColor; use rqIcon(name) in JS."""
import re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HAND = os.path.join(ROOT, '..', 'handoff', 'stage1-final', 'src', 'icons')
EXT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/lucide-icons'
NAMES = '''menu x coins book-open library notebook-pen pencil list type a-large-small palette sun-moon settings volume-2 square
play pause timer clock search highlighter target flame trophy medal star gift shopping-bag chart-column trending-up calendar
archive clipboard copy file-text rotate-cw languages compass sparkles shield heart moon sun focus arrow-left chevron-right
chevron-left bookmark info circle-alert download zoom-in vibrate smartphone check minus plus user-round lock
align-justify book-marked circle circle-check
pin circle-minus circle-plus chevron-up share-2 trash-2 image folder
amphora notebook quote layers chevron-down flower flower-2 map castle scroll-text
footprints sunrise zap flag package ellipsis-vertical message-circle send scan-text
maximize minimize undo-2 redo-2 underline strikethrough list-ordered list-checks heading align-left'''.split()
out = []
for n in NAMES:
    p = os.path.join(HAND, n + '.svg')
    if not os.path.exists(p): p = os.path.join(EXT, n + '.svg')
    s = open(p).read()
    body = re.search(r'<svg[^>]*>(.*)</svg>', s, re.S).group(1)
    body = re.sub(r'<!--.*?-->', '', body, flags=re.S)
    body = re.sub(r'\s*\n\s*', '', body).replace(' />', '/>')
    out.append('<symbol id="i-%s" viewBox="0 0 24 24">%s</symbol>' % (n, body))
sprite = ('<!--RQ-ICONS--><svg id="rqSprite" xmlns="http://www.w3.org/2000/svg" style="display:none" fill="none" stroke="currentColor" '
          'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ''.join(out) + '</svg><!--/RQ-ICONS-->')
f = os.path.join(ROOT, 'app.html'); h = open(f).read()
if '<!--RQ-ICONS-->' in h: h = re.sub(r'<!--RQ-ICONS-->.*?<!--/RQ-ICONS-->', lambda m: sprite, h, flags=re.S)
else: h = h.replace('<body>', '<body>\n' + sprite, 1) if '<body>' in h else re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + '\n' + sprite, h, count=1)
open(f, 'w').write(h); print(len(NAMES), 'icons')
