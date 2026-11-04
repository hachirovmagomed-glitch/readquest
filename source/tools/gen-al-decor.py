#!/usr/bin/env python3
"""«Страна чудес» (skin key alisa, 04.11.2026; pack handoff/skins/strana-chudes): writes the skin's section of skins/skins.css
between the markers /* ===== AL-BEGIN … */ and /* ===== AL-END ===== */. All decor is our own drawing in the manner of Tenniel's
engravings (thin ink line, hatching, double frames): playing cards and suits, the chessboard, the pocket watch, the golden key,
the teapot, «Выпей меня», painted roses. No characters on app screens, nothing on the book page.
Run: python3 tools/gen-al-decor.py   (from source/)"""
import re, pathlib, urllib.parse, math

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = ROOT / 'skins' / 'skins.css'

INK, RED, RED_D, GOLD, GOLD_D, PAPER, EXL, PARCH, GARDEN = '#1c1a17', '#a3202a', '#7e1820', '#c9a24e', '#8a6a24', '#f4ecd9', '#fbf6ea', '#e9dcbe', '#1f5a4e'
N_INK, N_RED, N_BLUE, N_SURF, N_GOLD = '#ece4d2', '#ff6b6b', '#a9bcff', '#161a2e', '#d9b86a'


def uri(svg):
    svg = re.sub(r'\s+', ' ', svg.strip())
    return 'url("data:image/svg+xml,' + urllib.parse.quote(svg, safe=" =:/;,'()-.") .replace('%20', ' ') + '")'


def svg(w, h, body, extra=''):
    return f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}'{extra}>{body}</svg>"


def n(v):
    return f'{round(v, 2):g}'


def heart(x, y, s):
    return (f'M{n(x)} {n(y+s*.9)}C{n(x-s*1.35)} {n(y+s*.05)} {n(x-s*.95)} {n(y-s*1.15)} {n(x)} {n(y-s*.4)}'
            f'C{n(x+s*.95)} {n(y-s*1.15)} {n(x+s*1.35)} {n(y+s*.05)} {n(x)} {n(y+s*.9)}Z')


def diam(x, y, s):
    return f'M{n(x)} {n(y-s)}L{n(x+s*.72)} {n(y)}L{n(x)} {n(y+s)}L{n(x-s*.72)} {n(y)}Z'


def spade(x, y, s):
    return (f'M{n(x)} {n(y-s*1.05)}C{n(x-s*1.35)} {n(y-s*.15)} {n(x-s*.95)} {n(y+s*.95)} {n(x)} {n(y+s*.3)}'
            f'C{n(x+s*.95)} {n(y+s*.95)} {n(x+s*1.35)} {n(y-s*.15)} {n(x)} {n(y-s*1.05)}Z'
            f'M{n(x)} {n(y+s*.2)}L{n(x-s*.45)} {n(y+s*1.05)}H{n(x+s*.45)}Z')


def club(x, y, s):
    r = s * .43
    c = lambda cx, cy: f'M{n(cx-r)} {n(cy)}a{n(r)} {n(r)} 0 1 0 {n(2*r)} 0a{n(r)} {n(r)} 0 1 0 {n(-2*r)} 0'
    return c(x, y-s*.5) + c(x-s*.5, y+s*.18) + c(x+s*.5, y+s*.18) + f'M{n(x)} {n(y)}L{n(x-s*.42)} {n(y+s*1.05)}H{n(x+s*.42)}Z'


def key(x, y, s, fill, stroke):
    """golden key, bow = a heart, lying to the right from (x, y)"""
    return (f"<path d='{heart(x, y, s*.9)}' fill='{fill}' stroke='{stroke}' stroke-width='1'/>"
            f"<path d='{heart(x, y, s*.38)}' fill='{EXL}'/>"
            f"<path d='M{n(x+s*.95)} {n(y-s*.28)}h{n(s*3.1)}v{n(s*.56)}h-{n(s*.3)}v{n(s*.85)}h-{n(s*.5)}v-{n(s*.85)}h-{n(s*.35)}v{n(s*.6)}h-{n(s*.5)}v-{n(s*.6)}H{n(x+s*.95)}z' fill='{fill}' stroke='{stroke}' stroke-width='1'/>")


def watch(cx, cy, r, face, ink, hand, crown=True):
    t = ''.join(f"M{n(cx+r*.72*math.cos(a))} {n(cy+r*.72*math.sin(a))}L{n(cx+r*.86*math.cos(a))} {n(cy+r*.86*math.sin(a))}"
                for a in [i*math.pi/6 for i in range(12)])
    c = (f"<circle cx='{n(cx)}' cy='{n(cy-r-2.6)}' r='{n(r*.16)}' fill='none' stroke='{ink}' stroke-width='1.2'/>"
         f"<rect x='{n(cx-r*.16)}' y='{n(cy-r-1.6)}' width='{n(r*.32)}' height='2.2' fill='{ink}'/>") if crown else ''
    return (c + f"<circle cx='{n(cx)}' cy='{n(cy)}' r='{n(r)}' fill='{face}' stroke='{ink}' stroke-width='1.6'/>"
            f"<circle cx='{n(cx)}' cy='{n(cy)}' r='{n(r-2.2)}' fill='none' stroke='{ink}' stroke-width='.6'/>"
            f"<path d='{t}' stroke='{ink}' stroke-width='1'/>"
            f"<path d='M{n(cx)} {n(cy)}V{n(cy-r*.55)}M{n(cx)} {n(cy)}L{n(cx+r*.36)} {n(cy+r*.22)}' stroke='{hand}' stroke-width='1.5' stroke-linecap='round'/>"
            f"<circle cx='{n(cx)}' cy='{n(cy)}' r='1.2' fill='{hand}'/>")


def teapot(x, y, s, ink, fill, accent):
    """teapot, (x, y) = middle of the base, s = scale (1 ≈ 24 px wide)"""
    g = (f"<g transform='translate({n(x)} {n(y)}) scale({n(s)})' fill='none' stroke='{ink}' stroke-width='{n(1.3/s)}' stroke-linecap='round' stroke-linejoin='round'>"
         f"<path d='M-7 -9c-.8 5.4 1.4 9 7 9s7.8-3.6 7-9z' fill='{fill}'/><path d='M-7.8 -9h15.6'/><path d='M-3 -9c.2-2 1.4-3 3-3s2.8 1 3 3' fill='{fill}'/>"
         f"<path d='M0 -12v-1.4'/><path d='M7 -6.6c2.4-.2 3.6-2 4.2-4.2'/><path d='M-6.8 -6.6c-3 -.2-3.8-3.4-1.6-4.8'/>"
         f"<path d='{heart(0, -4.6, 2)}' fill='{accent}' stroke='none'/></g>")
    return g


def bottle(x, y, s, ink, fill, label):
    """«Выпей меня»: a small bottle with a tag; (x, y) = middle of the base"""
    return (f"<g transform='translate({n(x)} {n(y)}) scale({n(s)})' fill='none' stroke='{ink}' stroke-width='{n(1.3/s)}' stroke-linejoin='round'>"
            f"<path d='M-2.4 -22v5.2c-4.6 1.6-6.6 4.8-6.6 9.2V-2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5.6c0-4.4-2-7.6-6.6-9.2V-22z' fill='{fill}'/>"
            f"<path d='M-3.2 -24h6.4v2.2h-6.4z' fill='{ink}'/><path d='M-5.6 -10.6h11.2v6h-11.2z' fill='{label}'/>"
            f"<path d='M-3.8 -8.4h7.6M-2.8 -6.6h5.6' stroke-width='{n(.7/s)}'/></g>")


def rose(x, y, s, petal, ink):
    return (f"<g transform='translate({n(x)} {n(y)}) scale({n(s)})' stroke='{ink}' stroke-width='{n(1/s)}' stroke-linecap='round'>"
            f"<path d='M0 4v12M0 10c-2.4-1-4-.6-5 .8 1.6 1 3.4 1 5-.8z' fill='{GARDEN}'/>"
            f"<circle r='4.4' fill='{petal}'/><path d='M-1.6 -.4a1.8 1.8 0 1 1 2.2 1.8M-3 1.4c1.6 1.8 4.4 1.8 6 0' fill='none'/></g>")


def card(x, y, w, h, rot, face, ink, suit, suitc, sw=1):
    sx, sy = w/2, h/2
    return (f"<g transform='translate({n(x)} {n(y)}) rotate({rot})'><rect x='{n(-sx)}' y='{n(-sy)}' width='{n(w)}' height='{n(h)}' rx='{n(w*.1)}' fill='{face}' stroke='{ink}' stroke-width='{sw}'/>"
            f"<path d='{suit(0, 0, w*.22)}' fill='{suitc}'/></g>")


out = {}
# ---- textures ----
# falling things (static, pale) on app screens: «как в кроличьей норе». day = ink at 13%, night = blue at 25 % (README pack)
def fall(ink, red, op):
    b = (card(36, 40, 20, 28, -18, 'none', ink, heart, red, 1.1) + key(150, 70, 6, 'none', ink) +
         f"<path d='{heart(100, 150, 6)}' fill='{red}'/>" + watch(40, 230, 10, 'none', ink, ink) +
         teapot(160, 250, .9, ink, 'none', red) + card(110, 330, 18, 25, 22, 'none', ink, spade, ink, 1.1) +
         f"<path d='{diam(30, 350, 6)}' fill='{red}'/>" + f"<path d='{club(180, 380, 7)}' fill='none' stroke='{ink}' stroke-width='1'/>" +
         bottle(80, 100, .55, ink, 'none', 'none'))
    return svg(200, 400, f"<g opacity='{op}'>{b}</g>")
out['--al-fall'] = uri(fall(INK, RED, .13))
out['--al-fall-n'] = uri(fall(N_BLUE, N_RED, .25))
# double ink rule with a heart in the middle (under screen titles)
def div(ink, red):
    return svg(160, 12, f"<path d='M0 4H66M94 4H160M0 8H66M94 8H160' stroke='{ink}' stroke-width='.8'/><path d='{heart(80, 6.3, 4.4)}' fill='{red}'/>"
               f"<path d='{diam(70, 6, 2.2)}{diam(90, 6, 2.2)}' fill='{ink}'/>")
out['--al-div'] = uri(div(INK, RED))
out['--al-div-n'] = uri(div(N_BLUE, N_RED))
# ex-libris corner curl (top-left), the others are mirrored with transforms
def corner(ink, tf=''):
    return svg(22, 22, f"<g{tf} fill='none' stroke='{ink}' stroke-width='1' stroke-linecap='round'><path d='M2 20V6.5Q2 2 6.5 2H20'/>"
               f"<path d='M5 14c0-5 2.6-8.4 8-9'/><path d='M5 14c1.8 0 3-1 3-2.4S6.8 9.6 5.6 10.6'/><path d='M13 5c0 1.8 1 3 2.4 3s2-1.2 1-2.4'/></g>")
TF = {'tl': '', 'tr': " transform='matrix(-1 0 0 1 22 0)'", 'br': " transform='matrix(-1 0 0 -1 22 22)'", 'bl': " transform='matrix(1 0 0 -1 0 22)'"}
for k, t in TF.items():
    out['--al-c' + k] = uri(corner(INK, t))
    out['--al-c' + k + '-n'] = uri(corner(N_BLUE, t))
# golden key for the balance chip
out['--al-key'] = uri(svg(34, 20, key(7, 10, 6, GOLD, GOLD_D)))
# empty hint: teapot, cup and «Выпей меня» on a checked cloth
def empty(ink, fill, red, label):
    cloth = ''.join(f"<rect x='{8+i*8}' y='78' width='8' height='6' fill='{red if i % 2 == 0 else 'none'}'/>" for i in range(10))
    return svg(96, 96, f"{cloth}<path d='M8 78H88M8 84H88' stroke='{ink}' stroke-width='.8'/>" + teapot(34, 76, 1.5, ink, fill, red) +
               bottle(72, 76, .95, ink, fill, label) + f"<path d='M50 72h12' stroke='{ink}' stroke-width='1' opacity='.0'/>")
out['--al-empty'] = uri(empty(INK, EXL, RED, PARCH))
out['--al-empty-n'] = uri(empty(N_BLUE, N_SURF, N_RED, '#1f2440'))
# «Читать»: the ace of hearts, double frame, hearts in the corners (night: the same card, dimmer face)
def ace(face, ink, red, inner):
    return svg(52, 70, f"<rect x='1.5' y='1.5' width='49' height='67' rx='5' fill='{face}' stroke='{ink}' stroke-width='1.6'/>"
               f"<rect x='5' y='5' width='42' height='60' rx='3' fill='none' stroke='{inner}' stroke-width='.8'/>"
               f"<path d='{heart(10.5, 12, 3)}{heart(41.5, 58, 3)}' fill='{red}'/>"
               f"<path d='{heart(26, 35, 11)}' fill='{red}' stroke='{ink}' stroke-width='.8'/>"
               f"<path d='M20.5 31.5c1-2 2.6-3 4.2-3' stroke='{face}' stroke-width='1.6' stroke-linecap='round' fill='none' opacity='.7'/>")
out['--al-ace'] = uri(ace(EXL, INK, RED, RED))
out['--al-ace-n'] = uri(ace('#ece4d2', '#0d0f1c', '#c0303a', '#c0303a'))
# page slider thumb: the pocket watch; brightness thumbs: a heart (bar) / a sun-rose and a teacup (settings)
out['--al-watch'] = uri(svg(26, 30, watch(13, 17, 11, EXL, INK, RED)))
out['--al-watch-n'] = uri(svg(26, 30, watch(13, 17, 11, '#1f2440', N_BLUE, N_RED)))
out['--al-heart'] = uri(svg(18, 18, f"<path d='{heart(9, 9.4, 7.4)}' fill='{RED}' stroke='{EXL}' stroke-width='1.2'/>"))
out['--al-heart-n'] = uri(svg(18, 18, f"<path d='{heart(9, 9.4, 7.4)}' fill='{N_RED}' stroke='{N_SURF}' stroke-width='1.2'/>"))
def rose_th(petal, ink, bg):
    return svg(28, 28, f"<circle cx='14' cy='14' r='12.6' fill='{bg}' stroke='{ink}' stroke-width='1.2'/>"
               f"<g transform='translate(14 14)'><path d='{''.join(f'M0 0Q{n(7*math.cos(a-.5))} {n(7*math.sin(a-.5))} {n(9*math.cos(a))} {n(9*math.sin(a))}Q{n(7*math.cos(a+.5))} {n(7*math.sin(a+.5))} 0 0' for a in [i*2*math.pi/5-math.pi/2 for i in range(5)])}' fill='{petal}' stroke='{ink}' stroke-width='.7'/>"
               f"<circle r='2.4' fill='{GOLD}' stroke='{ink}' stroke-width='.6'/></g>")
out['--al-sl-b'] = uri(rose_th('#f4d8c8', INK, EXL))
out['--al-sl-w'] = uri(svg(28, 28, f"<circle cx='14' cy='14' r='12.6' fill='{EXL}' stroke='{INK}' stroke-width='1.2'/>"
                                    f"<g fill='none' stroke='{INK}' stroke-width='1.1' stroke-linecap='round'><path d='M7.5 12h11c0 4.4-2.4 6.6-5.5 6.6S7.5 16.4 7.5 12z' fill='#f4d8c8'/>"
                                    f"<path d='M18.5 13.4c1.8 0 2.6.6 2.6 1.6s-1.2 1.8-3.4 1.8'/><path d='M7 20h12'/><path d='M11 9.5c-.6-1 .6-1.6 0-2.6M14.4 9.5c-.6-1 .6-1.6 0-2.6' stroke='{RED}'/></g>"))
# chapter marks on the page slider: tiny hearts; PDF page divider: a row of suits
out['--al-tick'] = uri(svg(10, 10, f"<path d='{heart(5, 5.2, 4)}' fill='#000'/>"))
out['--al-suits'] = uri(svg(64, 10, f"<path d='M0 5H18M46 5H64' stroke='{INK}' stroke-width='.8'/><path d='{heart(22, 5.2, 3)}{diam(38, 5, 3.4)}' fill='{RED}'/>"
                                    f"<path d='{spade(30, 4.8, 3)}' fill='{INK}'/>"))
out['--al-suits-n'] = uri(svg(64, 10, f"<path d='M0 5H18M46 5H64' stroke='{N_BLUE}' stroke-width='.8'/><path d='{heart(22, 5.2, 3)}{diam(38, 5, 3.4)}' fill='{N_RED}'/>"
                                      f"<path d='{spade(30, 4.8, 3)}' fill='{N_BLUE}'/>"))
# summary: two roses «painted red» flanking the title, for the quote card a scatter of suits
out['--al-roses'] = uri(svg(76, 22, rose(9, 8, .9, RED, INK) + rose(67, 8, .9, RED, INK) +
                                    f"<path d='{heart(38, 9, 5)}' fill='{RED}'/><path d='M20 9H31M45 9H56' stroke='{INK}' stroke-width='.8'/>"))
out['--al-roses-n'] = uri(svg(76, 22, rose(9, 8, .9, N_RED, N_BLUE) + rose(67, 8, .9, N_RED, N_BLUE) +
                                      f"<path d='{heart(38, 9, 5)}' fill='{N_RED}'/><path d='M20 9H31M45 9H56' stroke='{N_BLUE}' stroke-width='.8'/>"))
out['--al-scatter'] = uri(svg(24, 24, f"<path d='{heart(12, 12.4, 8)}' fill='{RED}'/>"))

vars_css = 'html[data-skin="alisa"]{\n' + ''.join(f'  {k}:{v};\n' for k, v in out.items()) + '}\n'

RULES = r'''
@font-face{font-family:"Playfair Display SC";src:url(../fonts/alisa-playfairsc-bold.woff2) format("woff2");font-weight:700;font-display:swap}
@font-face{font-family:"Fira Sans";src:url(../fonts/alisa-firasans-medium.woff2) format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"Fira Sans";src:url(../fonts/alisa-firasans-bold.woff2) format("woff2");font-weight:700 800;font-display:swap}
/* paper with an engraver's hatch and pale falling things on the root; screens transparent over it; the book page stays flat paper */
html[data-skin="alisa"]{background:var(--al-fall) 0 0/200px 400px repeat fixed,var(--sc-hatch) fixed,var(--rq-bg)}
html[data-skin="alisa"][data-theme="night"]{background:var(--al-fall-n) 0 0/200px 400px repeat fixed,var(--sc-hatch) fixed,var(--rq-bg)}
html[data-skin="alisa"] body{font-weight:500;background:transparent}
html[data-skin="alisa"] .screen:not(#reader),html[data-skin="alisa"] #summary{background:transparent}
html[data-skin="alisa"] #reader{background:var(--r-bg)}
html[data-skin="alisa"]{--rq-icon-stroke:1.5;--ic-fill:var(--sc-red);--ic-soft:var(--sc-ink);--ic-soft-o:.85}
html[data-skin="alisa"][data-theme="night"]{--ic-fill:var(--rq-accent);--ic-soft:var(--sc-blue);--ic-soft-o:.5}
/* titles: Playfair Display SC 700 in ink */
html[data-skin="alisa"] :is(#libTitle,.wrap > .row > h1,#rewardsSheet h1,#sumHead,.shopname){font-family:var(--rq-font-display);font-weight:700;letter-spacing:.01em;color:var(--rq-text)}
html[data-skin="alisa"] #libTitle{font-size:1.875rem;line-height:1.1;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
html[data-skin="alisa"] #goldChip{flex:none}
html[data-skin="alisa"] .wrap > .row > h1{font-size:1.75rem;line-height:1.1}
html[data-skin="alisa"] :is(.libgold,.bigxp,#ringTxt,.shopprice){font-family:var(--rq-font-num);font-weight:700}
html[data-skin="alisa"] #libHead :is(h1,.libgold,button,.iconbtn44){color:var(--rq-text)}
/* balance: a golden key in an ex-libris pill (double ink rule) */
html[data-skin="alisa"] #goldChip{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:4px 12px 4px 6px;border-radius:999px;background:var(--rq-surface);box-shadow:0 0 0 1.5px var(--rq-border-strong),0 0 0 3.5px var(--rq-surface),0 0 0 4.5px var(--rq-border-strong)}
html[data-skin="alisa"] #goldChip::before{content:"";flex:none;width:30px;height:18px;background:var(--al-key) center/contain no-repeat}
/* panels: ex-libris = ink frame, a paper gap and a hairline; curls in the corners of the big ones */
html[data-skin="alisa"] :is(.bookcard,.goalcard,.continuecard,.kpi,.qcard,.pcard,.shopcard,.herocard){border-radius:var(--rq-radius-sm);border:1.5px solid var(--rq-border-strong);box-shadow:0 0 0 3px var(--rq-surface),0 0 0 4px var(--rq-border-strong),0 6px 14px rgba(60,40,10,.10)}
html[data-skin="alisa"][data-theme="night"] :is(.bookcard,.goalcard,.continuecard,.kpi,.qcard,.pcard,.shopcard,.herocard){box-shadow:0 0 0 3px var(--rq-surface),0 0 0 4px var(--rq-border-strong),0 6px 18px rgba(0,0,0,.4)}
html[data-skin="alisa"] :is(.goalcard,.qcard,#summary .sumbox,#sumDailyBox){background-image:var(--al-ctl),var(--al-ctr),var(--al-cbr),var(--al-cbl);background-position:left 3px top 3px,right 3px top 3px,right 3px bottom 3px,left 3px bottom 3px;background-size:22px 22px;background-repeat:no-repeat}
html[data-skin="alisa"][data-theme="night"] :is(.goalcard,.qcard,#summary .sumbox,#sumDailyBox){background-image:var(--al-ctl-n),var(--al-ctr-n),var(--al-cbr-n),var(--al-cbl-n)}
html[data-skin="alisa"] .goalcard{margin-bottom:14px}
html[data-skin="alisa"] .bookcard{margin-bottom:8px}
html[data-skin="alisa"] .sheet{border-radius:var(--rq-radius-lg) var(--rq-radius-lg) 0 0;box-shadow:0 -1.5px 0 var(--rq-border-strong),0 -4px 0 var(--rq-surface),0 -5px 0 var(--rq-border-strong),var(--rq-shadow-3)}
/* chips and buttons: ink outlines, the chosen one is a red label */
html[data-skin="alisa"] :is(.fchip,.lsortbtn,#btnAdd.addicon,.stepbtn,.ghostbtn){border-radius:999px}
html[data-skin="alisa"] .fchip{background:var(--rq-surface);box-shadow:inset 0 0 0 1.5px var(--rq-border-strong)}
html[data-skin="alisa"] .fchip.on{background:var(--rq-text);color:var(--rq-surface);box-shadow:none}
html[data-skin="alisa"] :is(.lsortbtn,#btnAdd.addicon){background:var(--rq-surface);box-shadow:inset 0 0 0 1.5px var(--rq-border-strong)}
html[data-skin="alisa"] .cta{font-family:var(--rq-font-display);font-weight:700;letter-spacing:.04em;background:var(--rq-accent);color:var(--rq-on-accent);border:0;border-radius:var(--rq-radius-sm);box-shadow:0 0 0 2px var(--rq-surface),0 0 0 3.5px var(--rq-accent-pressed),0 4px 10px rgba(60,20,10,.18)}
/* progress: a red line on a hairline track, the end ticked like a watch face */
html[data-skin="alisa"] .pbar{background:var(--rq-surface-2);box-shadow:inset 0 0 0 1px var(--rq-line)}
html[data-skin="alisa"] .pbar i{background:var(--rq-accent)}
/* goal of the day: a pocket-watch face — the ring is the dial, ticks round it */
html[data-skin="alisa"] .goalcard .ring{position:relative;border-radius:50%;box-shadow:0 0 0 1.5px var(--rq-border-strong),0 0 0 3px var(--rq-surface),0 0 0 3.8px var(--rq-border-strong);background:repeating-conic-gradient(var(--rq-border-strong) 0 1.4deg,transparent 1.4deg 30deg) center/100% 100%;-webkit-mask:radial-gradient(circle,#000 0 58%,transparent 58.5% 62%,#000 62.5%);mask:radial-gradient(circle,#000 0 58%,transparent 58.5% 62%,#000 62.5%)}
html[data-skin="alisa"] .goalcard .ring::before{content:"";position:absolute;left:50%;top:-11px;width:10px;height:8px;margin-left:-5px;border-radius:2px 2px 1px 1px;background:var(--rq-border-strong)}
/* screen headers: a double ink rule with a red heart under the title */
html[data-skin="alisa"] .screen:not(#reader):not(#library) .wrap > .row:first-child:has(> h1){position:relative;padding-bottom:16px;margin-bottom:6px}
html[data-skin="alisa"] .screen:not(#reader):not(#library) .wrap > .row:first-child:has(> h1)::after{content:"";position:absolute;left:0;right:0;bottom:2px;height:12px;background:var(--al-div) center/160px 12px no-repeat,linear-gradient(var(--rq-border-strong),var(--rq-border-strong)) 0 6px/100% .8px no-repeat;pointer-events:none}
html[data-skin="alisa"][data-theme="night"] .screen:not(#reader):not(#library) .wrap > .row:first-child:has(> h1)::after{background-image:var(--al-div-n),linear-gradient(var(--sc-blue),var(--sc-blue))}
/* empty hints: the tea table — teapot and «Выпей меня» on the checked cloth */
html[data-skin="alisa"] .emptyhint::before{content:"";display:block;width:96px;height:96px;margin:0 auto 12px;background:var(--al-empty) center/contain no-repeat}
html[data-skin="alisa"][data-theme="night"] .emptyhint::before{background-image:var(--al-empty-n)}
/* session summary: an ex-libris certificate, a chessboard band on top, roses over the title */
html[data-skin="alisa"] #summary .sumbox{position:relative;background-color:var(--rq-surface);border:1.5px solid var(--rq-border-strong);border-radius:var(--rq-radius-md);box-shadow:0 0 0 4px var(--rq-surface),0 0 0 5px var(--rq-border-strong),var(--rq-shadow-3);padding-top:30px}
html[data-skin="alisa"] #summary .sumbox::after{content:"";position:absolute;left:30px;right:30px;top:10px;height:8px;background:var(--sc-checks);background-size:8px 8px;opacity:.85;pointer-events:none}
html[data-skin="alisa"][data-theme="night"] #summary .sumbox::after{background:conic-gradient(var(--sc-blue) 25%,transparent 0 50%,var(--sc-blue) 0 75%,transparent 0) 0 0/8px 8px;opacity:.6}
html[data-skin="alisa"] #summary #sumHead{font-size:1.75rem!important;color:var(--rq-text)!important;margin-top:4px}
html[data-skin="alisa"] #summary #sumHead::before{content:"";display:block;height:22px;margin:0 auto 8px;width:76px;background:var(--al-roses) center/contain no-repeat}
html[data-skin="alisa"][data-theme="night"] #summary #sumHead::before{background-image:var(--al-roses-n)}
html[data-skin="alisa"] #summary .sumcell,html[data-skin="alisa"] #sumDailyBox{background-color:var(--rq-surface-2)!important;border-radius:var(--rq-radius-sm);box-shadow:inset 0 0 0 1px var(--rq-border-strong)}
html[data-skin="alisa"] #summary .sumcell b{font-family:var(--rq-font-num);font-weight:700;font-size:1.375rem}
html[data-skin="alisa"] #summary .bigxp{color:var(--rq-accent-text);font-family:var(--rq-font-num);font-weight:700;font-size:2.125rem}
html[data-skin="alisa"] #summary #sumGoldCell b{color:var(--rq-coin)}
/* reader chrome (not the page): parchment bars, the title in Playfair SC */
html[data-skin="alisa"] #rTitle{font-family:var(--rq-font-display);font-weight:700;font-size:1.0625rem;letter-spacing:.02em}
html[data-skin="alisa"] #rPage{font-family:var(--rq-font-num);font-weight:700}
html[data-skin="alisa"][data-skin] #pgSlider::-webkit-slider-runnable-track{background:linear-gradient(var(--rq-border-strong),var(--rq-border-strong)) 0 50%/100% 1.5px no-repeat;height:12px}
html[data-skin="alisa"][data-skin] #pgSlider::-moz-range-track{background:linear-gradient(var(--rq-border-strong),var(--rq-border-strong)) 0 50%/100% 1.5px no-repeat;height:12px}
html[data-skin="alisa"][data-skin] #pgSlider::-webkit-slider-thumb{width:22px;height:26px;margin-top:-8px;border:0;border-radius:0;background:var(--al-watch) center/contain no-repeat;box-shadow:none;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.25))}
html[data-skin="alisa"][data-skin] #pgSlider::-moz-range-thumb{width:22px;height:26px;border:0;border-radius:0;background:var(--al-watch) center/contain no-repeat}
html[data-skin="alisa"][data-theme="night"][data-skin] #pgSlider::-webkit-slider-thumb{background-image:var(--al-watch-n)}
html[data-skin="alisa"][data-theme="night"][data-skin] #pgSlider::-moz-range-thumb{background-image:var(--al-watch-n)}
/* covers (alisaCover in js/library.js): playing cards — paper, red, garden, burrow blue, chessboard; corner index; title in Playfair SC */
html[data-skin="alisa"] .cover{border-radius:6px;background:none;box-shadow:0 0 0 1.2px var(--rq-border-strong)}
.al-cover{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden;text-align:center;color:#1c1a17;background:#fbf6ea;border-radius:inherit}
.al-cover::after{content:"";position:absolute;inset:3px;border:1px solid currentColor;border-radius:4px;opacity:.55;pointer-events:none}
.al-cover > i{position:absolute;top:5px;left:0;right:0;font:700 7px/1 "Fira Sans",var(--rq-font-ui,sans-serif);font-style:normal;letter-spacing:.12em}
.al-cover .al-ix{position:absolute;left:4px;top:4px;display:flex;flex-direction:column;align-items:center;line-height:1}
.al-cover .al-ix2{left:auto;top:auto;right:4px;bottom:4px;transform:rotate(180deg)}
.al-cover .al-r{font:700 9px/1 "Playfair Display SC",Georgia,serif}
.al-cover .al-ix svg{width:7px;height:7px;fill:currentColor}
.al-cover.al-redsuit .al-ix,.al-cover.al-redsuit .al-big{color:#a3202a}
.al-cover .al-big{width:42%;height:42%;fill:currentColor;margin-top:6px}
.al-cover .al-t,.al-cover .al-a,.al-cover > i{display:none}
html[data-skin="alisa"] #shelf .al-cover > i{display:block}
.al-red{background:#a3202a;color:#fff8ee}.al-red.al-redsuit .al-ix,.al-red.al-redsuit .al-big{color:#fff8ee}
.al-garden{background:#1f5a4e;color:#f6efdc}.al-garden.al-redsuit .al-ix,.al-garden.al-redsuit .al-big{color:#ffd0c8}
.al-night{background:#1d2142;color:#ece4d2}.al-night.al-redsuit .al-ix,.al-night.al-redsuit .al-big{color:#ff8f8f}
.al-chess{background:conic-gradient(#1c1a17 25%,#fbf6ea 0 50%,#1c1a17 0 75%,#fbf6ea 0) 0 0/16px 16px}
.al-chess .al-ix,.al-chess > i{display:none}
.al-chess .al-big{position:relative;z-index:1;padding:5px;background:#fbf6ea;border:1.2px solid #1c1a17;border-radius:3px;box-sizing:content-box;width:36%;height:36%;margin:0}
html[data-skin="alisa"] #shelf{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:16px 12px;padding-top:4px}
html[data-skin="alisa"] #shelf .bookcard{position:relative;flex-direction:column;align-items:stretch;gap:0;padding:0;margin:0;background:transparent;border:0;border-radius:0;box-shadow:none;min-width:0}
html[data-skin="alisa"] #shelf .cover{width:100%;height:auto;aspect-ratio:5/7;border-radius:7px;box-shadow:0 0 0 1.5px var(--rq-border-strong),0 0 0 3px var(--rq-surface),0 0 0 3.8px var(--rq-border-strong),0 6px 12px rgba(40,25,10,.22)}
html[data-skin="alisa"] #shelf .al-cover{justify-content:flex-start;padding:0 9px}
html[data-skin="alisa"] #shelf .al-cover > i{top:7px}
html[data-skin="alisa"] #shelf .al-cover .al-t{display:block;margin-top:36px;font:700 15px/1.08 "Playfair Display SC",Georgia,serif;overflow-wrap:anywhere;hyphens:auto}
html[data-skin="alisa"] #shelf .al-cover .al-a{display:block;margin-top:6px;font:500 0.6875rem/1.2 "Fira Sans",sans-serif;opacity:.9}
html[data-skin="alisa"] #shelf .al-cover .al-big{display:none}
html[data-skin="alisa"] #shelf .al-chess .al-t{position:relative;z-index:1;margin-top:auto;margin-bottom:auto;padding:6px 4px;background:#fbf6ea;color:#1c1a17;border:1.2px solid #1c1a17;border-radius:3px}
html[data-skin="alisa"] #shelf .al-chess :is(.al-a,.al-r){display:none}
html[data-skin="alisa"] #shelf .al-chess > i{display:none}
html[data-skin="alisa"] #shelf .bmeta{min-width:0;margin-top:10px}
html[data-skin="alisa"] #shelf :is(.btitle,.bauthor,.bpct){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
html[data-skin="alisa"] #shelf .btitle{font-size:0.8125rem;font-weight:700;line-height:1.3}
html[data-skin="alisa"] #shelf .bauthor{font-size:0.6875rem;color:var(--rq-text-2)}
html[data-skin="alisa"] #shelf .pbar{height:5px;margin-top:6px;border-radius:0}
html[data-skin="alisa"] #shelf .bpct{font-size:0.6875rem;color:var(--rq-text-2);margin-top:3px}
html[data-skin="alisa"] #shelf .infobtn{position:absolute;top:0;right:0;margin:0;width:32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center;color:inherit}
/* bottom nav: an ex-libris panel (double ink frame, curls in the corners); the active tab is a red label with a white hairline */
html[data-skin="alisa"] #botnav{left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));padding:6px 8px;border:1.5px solid var(--rq-border-strong);border-radius:6px;background-color:var(--rq-surface);box-shadow:0 0 0 3px var(--rq-surface),0 0 0 4px var(--rq-border-strong),0 8px 22px rgba(40,25,10,.18);
  background-image:var(--al-ctl),var(--al-ctr),var(--al-cbr),var(--al-cbl);background-position:left 2px top 2px,right 2px top 2px,right 2px bottom 2px,left 2px bottom 2px;background-size:18px 18px;background-repeat:no-repeat}
html[data-skin="alisa"][data-theme="night"] #botnav#botnav{background:var(--al-ctl-n) left 2px top 2px/18px 18px no-repeat,var(--al-ctr-n) right 2px top 2px/18px 18px no-repeat,var(--al-cbr-n) right 2px bottom 2px/18px 18px no-repeat,var(--al-cbl-n) left 2px bottom 2px/18px 18px no-repeat,var(--rq-surface)}
html[data-skin="alisa"] .botnav-btn{border-radius:var(--rq-radius-sm);font-weight:700}
html[data-skin="alisa"] #botnav .botnav-btn.on{background:var(--rq-accent);color:var(--rq-on-accent);box-shadow:inset 0 0 0 1.5px var(--rq-accent),inset 0 0 0 2.5px var(--rq-on-accent)}
html[data-skin="alisa"] body.mvp .screen > .scroll{padding-bottom:136px}
/* «Читать»: the ace of hearts, tilted a little, as if just dealt */
html[data-skin="alisa"] #botnav .botnav-read .brd{width:46px;height:62px;margin-left:-23px;top:-40px;border-radius:5px;background:var(--al-ace) center/contain no-repeat;box-shadow:0 0 0 3px var(--rq-surface),0 6px 12px rgba(40,25,10,.28);transform:rotate(-7deg)}
html[data-skin="alisa"][data-theme="night"] #botnav .botnav-read .brd{background-image:var(--al-ace-n)}
html[data-skin="alisa"] #botnav .botnav-read:active .brd{transform:rotate(-7deg) scale(.94)}
html[data-skin="alisa"] #botnav .botnav-read .brd .ic{display:none}
/* chapter marks on the page slider: small hearts above the track */
html[data-skin="alisa"] #pgTicks i{top:-4px;width:8px;height:8px;margin-left:-4px;border-radius:0;background:var(--rq-accent);opacity:.6;transform:none;-webkit-mask:var(--al-tick) center/contain no-repeat;mask:var(--al-tick) center/contain no-repeat}
html[data-skin="alisa"] .bfrow{box-shadow:0 0 0 1px var(--rq-border-strong)}
html[data-skin="alisa"] .bfrow.on{box-shadow:0 0 0 1px var(--rq-border-strong),inset 3px 0 0 var(--rq-accent)}
/* «Яркость» under the reader's top bar: a thin ink line, the filled part red, a heart for the thumb */
html[data-skin="alisa"] #barBright::-webkit-slider-runnable-track{height:2px;border-radius:0;background:linear-gradient(90deg,var(--rq-accent) var(--v),var(--rq-border-strong) var(--v))}
html[data-skin="alisa"] #barBright::-moz-range-track{height:2px;background:linear-gradient(90deg,var(--rq-accent) var(--v),var(--rq-border-strong) var(--v))}
html[data-skin="alisa"] #barBright::-webkit-slider-thumb{width:18px;height:18px;margin-top:-8px;border:0;border-radius:0;box-shadow:none;background:var(--al-heart) center/contain no-repeat}
html[data-skin="alisa"] #barBright::-moz-range-thumb{width:18px;height:18px;border:0;border-radius:0;background:var(--al-heart) center/contain no-repeat}
html[data-skin="alisa"][data-theme="night"] #barBright::-webkit-slider-thumb{background-image:var(--al-heart-n)}
html[data-skin="alisa"][data-theme="night"] #barBright::-moz-range-thumb{background-image:var(--al-heart-n)}
/* «Настройки чтения → Страница»: a band in a double ink frame, chessboard fill; a rose (brightness) and a teacup (warmth) */
html[data-skin="alisa"] #sheet :is(#brightRange,#warmRange){--sl-h:8px;--sl-ts:30px;--sl-r:0;--sl-tr:0;--sl-tsh:0 1px 3px rgba(0,0,0,.3);--sl-b-th:var(--al-sl-b);--sl-w-th:var(--al-sl-w);
  --sl-rest:var(--rq-surface-2);--sl-b-fill:linear-gradient(90deg,#e9dcbe,#a3202a);--sl-w-fill:linear-gradient(90deg,#e9dcbe,#c9a24e)}
/* the chapter being read: a red label in a double frame, a heart instead of the marker */
html[data-skin="alisa"] #panelBody .prow.on{background:var(--rq-accent);color:var(--rq-on-accent);border-radius:var(--rq-radius-sm);box-shadow:inset 0 0 0 2px var(--rq-accent),inset 0 0 0 3px var(--rq-on-accent)}
html[data-skin="alisa"] #panelBody .prow.on .pnow{background:none;box-shadow:inset 0 0 0 1px currentColor}
html[data-skin="alisa"] #panelBody .prow.on .pnow .ic{display:none}
html[data-skin="alisa"] #panelBody .prow.on .pnow::before{content:"";width:14px;height:14px;background:currentColor;-webkit-mask:var(--al-tick) center/contain no-repeat;mask:var(--al-tick) center/contain no-repeat}
/* «Обзор»: the page being read framed like a card */
html[data-skin="alisa"] .pgt.cur .pgth{border-radius:var(--rq-radius-xs);box-shadow:0 0 0 2px var(--rq-accent),0 0 0 4px var(--rq-surface,transparent),0 0 0 5px var(--rq-border-strong)}
/* icons: Playfair «Aa» on the font button */
html[data-skin="alisa"] .rbar .aa{font:700 21px/22px var(--rq-font-display)}
/* PDF «Прокрутка»: a row of suits between pages */
html[data-skin="alisa"] #pdfScroll{--ps-gap:10px}
html[data-skin="alisa"] #pdfScroll .psd{background:var(--al-suits) center/64px 10px no-repeat}
html[data-skin="alisa"][data-theme="night"] #pdfScroll .psd{background-image:var(--al-suits-n)}
/* diaries: the shelf is a chessboard band */
html[data-skin="alisa"] #diary .dypl{height:8px;background:var(--sc-checks);background-size:8px 8px;box-shadow:0 2px 0 var(--rq-border-strong);border-radius:0;opacity:.85}
html[data-skin="alisa"] #diary .dypaper{border-radius:var(--rq-radius-sm);box-shadow:0 0 0 1.5px var(--rq-border-strong),0 0 0 4px var(--rq-surface),0 0 0 5px var(--rq-border-strong)}
/* «Настройки чтения»: the sheet title with the screen-header rule */
html[data-skin="alisa"] #sheet #sheetH::after{content:"";position:absolute;left:0;right:-48px;bottom:0;height:12px;background:var(--al-div) center/160px 12px no-repeat,linear-gradient(var(--rq-border-strong),var(--rq-border-strong)) 0 6px/100% .8px no-repeat;pointer-events:none}
html[data-skin="alisa"][data-theme="night"] #sheet #sheetH::after{background-image:var(--al-div-n),linear-gradient(var(--sc-blue),var(--sc-blue))}
@media (max-width:374px){html[data-skin="alisa"] #libTitle{font-size:1.625rem}html[data-skin="alisa"] #libHead{gap:4px}html[data-skin="alisa"] #goldChip{padding:4px 8px 4px 4px;gap:4px}}
'''

block = ('/* ===== AL-BEGIN «Страна чудес» (alisa) — generated by tools/gen-al-decor.py, edit there ===== */\n' + vars_css + RULES.lstrip('\n') +
         '/* ===== AL-END ===== */\n')
css = CSS.read_text()
if 'AL-BEGIN' in css:
    css = re.sub(r'/\* ===== AL-BEGIN.*?/\* ===== AL-END ===== \*/\n', lambda m: block, css, flags=re.S)
else:
    css = css.rstrip('\n') + '\n\n' + block
CSS.write_text(css)
print('skins.css: alisa block', len(block), 'bytes')
