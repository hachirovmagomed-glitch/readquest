#!/usr/bin/env python3
"""«Небесный» decor (skins.css block): star dust, coin, sparkle, divider, three stars, cloud-moon for empty hints.
Our own drawings after the prototype /mnt/project-files/skins/rannie/mockups/celestial. Prints CSS vars; paste into skins.css."""
import random, urllib.parse
def u(svg): return 'url("data:image/svg+xml,' + urllib.parse.quote(svg, safe=" =:/,.'-#()") .replace('#', '%23').replace('"', "'") + '")'
def svg(w, h, body, vb=None): return f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='{vb or f'0 0 {w} {h}'}'>{body}</svg>"
def spark(x, y, r, fill, op=1): return f"<path d='M{x} {y-r}Q{x+r*.18} {y-r*.18} {x+r} {y}Q{x+r*.18} {y+r*.18} {x} {y+r}Q{x-r*.18} {y+r*.18} {x-r} {y}Q{x-r*.18} {y-r*.18} {x} {y-r}z' fill='{fill}' opacity='{op}'/>"
def dust(seed, n, cols, sp):
    rnd = random.Random(seed); b = ''
    for _ in range(n):
        b += f"<circle cx='{rnd.uniform(2,198):.1f}' cy='{rnd.uniform(2,198):.1f}' r='{rnd.uniform(.5,1.4):.2f}' fill='{rnd.choice(cols)}' opacity='{rnd.uniform(.4,.9):.2f}'/>"
    for _ in range(sp): b += spark(round(rnd.uniform(10,190),1), round(rnd.uniform(10,190),1), round(rnd.uniform(3,5),1), cols[0], .8)
    return svg(200, 200, b)
coin = svg(40, 40, "<defs><radialGradient id='c' cx='.35' cy='.3' r='.9'><stop offset='0' stop-color='#fff3c9'/><stop offset='.6' stop-color='#e9b949'/><stop offset='1' stop-color='#b07a26'/></radialGradient></defs>"
           "<circle cx='20' cy='20' r='18' fill='url(#c)' stroke='#8f6220' stroke-width='1.6'/><circle cx='20' cy='20' r='13.5' fill='none' stroke='#fff3c4' stroke-width='1' opacity='.8'/>"
           "<path d='M20 9.5l2.6 7.2 7.6.3-6 4.7 2.1 7.3-6.3-4.3-6.3 4.3 2.1-7.3-6-4.7 7.6-.3z' fill='#fffbe8' stroke='#a8741f' stroke-width='.9'/>")
sparkle = svg(24, 24, spark(12, 12, 11, '#d7a94b') + spark(12, 12, 5, '#fff6d6'))
sparkle_n = svg(24, 24, spark(12, 12, 11, '#efcf86') + spark(12, 12, 5, '#fffbe8'))
div = lambda c: svg(160, 10, f"<path d='M0 5H70M90 5H160' stroke='{c}' stroke-width='1'/><path d='M80 1L84 5 80 9 76 5z' fill='{c}'/><circle cx='66' cy='5' r='1.2' fill='{c}'/><circle cx='94' cy='5' r='1.2' fill='{c}'/>")
star5 = lambda x, s, c: f"<path transform='translate({x} 2) scale({s})' d='M10 0l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L0 7.2l7.1-.6z' fill='{c}'/>"
stars3 = lambda c: svg(76, 22, star5(0, .9, c) + star5(27, 1, c) + star5(57, .9, c))
cloudmoon = lambda m, cl, st: svg(96, 96, f"<path d='M58 14a26 26 0 1 0 22 40A21 21 0 1 1 58 14z' fill='{m}'/>"
    f"<path d='M18 72a12 12 0 0 1 12-12 15 15 0 0 1 28-2 11 11 0 0 1 16 10 8 8 0 0 1-2 16H24a10 10 0 0 1-6-12z' fill='{cl}'/>" + spark(80, 22, 5, st) + spark(26, 30, 3.5, st))
def corner(c, rot):
    # gold bracket after the prototype's .cn: an outer and an inner arc with a small diamond; rot mirrors it into each corner
    t = {'tl': '', 'tr': "transform='matrix(-1 0 0 1 22 0)'", 'br': "transform='matrix(-1 0 0 -1 22 22)'", 'bl': "transform='matrix(1 0 0 -1 0 22)'"}[rot]
    return svg(22, 22, f"<g {t}><path d='M1 21V7Q1 1 7 1H21' fill='none' stroke='{c}' stroke-width='1.2'/><path d='M5 21V9Q5 5 9 5H21' fill='none' stroke='{c}' stroke-width='.6'/>"
               f"<path d='M9.25 7.5l1.75 1.75-1.75 1.75-1.75-1.75z' fill='{c}'/></g>")
thumb = lambda hi, lo, rim: svg(24, 24, f"<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='{hi}'/><stop offset='1' stop-color='{lo}'/></linearGradient></defs>"
    f"<path d='M12 2.5L21.5 12 12 21.5 2.5 12z' fill='url(#g)' stroke='{rim}' stroke-width='1.5'/><path d='M12 7.5L16.5 12 12 16.5 7.5 12z' fill='#fffbe8' opacity='.55'/>")
dia = lambda c: svg(10, 10, f"<path d='M5 .5L9.5 5 5 9.5 .5 5z' fill='{c}'/>")
rar = lambda n, c: svg(n * 12, 12, ''.join(f"<path transform='translate({i*12+1} 1) scale(.5)' d='M10 0l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L0 7.2l7.1-.6z' fill='{c}'/>" for i in range(n)))
V = {
 'cl-dust': u(dust(7, 26, ['#ffffff', '#fff6d6'], 3)),
 'cl-dust-n': u(dust(11, 46, ['#fff3c4', '#ffffff', '#c9d4ff'], 4)),
 'cl-coin': u(coin), 'cl-spark': u(sparkle), 'cl-spark-n': u(sparkle_n),
 'cl-div': u(div('#c9a14e')), 'cl-div-n': u(div('#b08a3e')),
 'cl-stars3': u(stars3('#d7a94b')), 'cl-stars3-n': u(stars3('#efcf86')),
 **{f'cl-c{r}': u(corner('#c9a14e', r)) for r in ('tl', 'tr', 'br', 'bl')},
 **{f'cl-c{r}-n': u(corner('#b08a3e', r)) for r in ('tl', 'tr', 'br', 'bl')},
 'cl-thumb': u(thumb('#fff3c8', '#d7a94b', '#9a6d22')), 'cl-thumb-n': u(thumb('#fff6d6', '#e2b85e', '#efcf86')),
 'cl-dia': u(dia('#c9a14e')), 'cl-dia-n': u(dia('#efcf86')),
 'cl-r3': u(rar(3, '#fff3c4')), 'cl-r4': u(rar(4, '#fff3c4')), 'cl-r5': u(rar(5, '#fff3c4')),
 'cl-empty': u(cloudmoon('#e9c46a', '#ffffff', '#d7a94b')), 'cl-empty-n': u(cloudmoon('#efcf86', '#2c3360', '#fff3c4')),
}
print('html[data-skin="celestial"]{')
for k, v in V.items(): print(f'  --{k}:{v};')
print('}')
