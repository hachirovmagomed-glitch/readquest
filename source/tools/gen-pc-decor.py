#!/usr/bin/env python3
"""«Карандашный» v2 (Джессика 17.10: «невзрачный — клеточки, как в тетради, больше деталей»): doodles as MASKS (black strokes, the colour comes
from a token via background-color), so day/night recolour by tokens only. Prints CSS vars for skins.css §5. Our own drawings after
handoff/skins/karandashny-tetrad (вариант B: каракули, звёзды, стрелки, гусеница с книгой)."""
import urllib.parse
def u(svg): return 'url("data:image/svg+xml,' + urllib.parse.quote(svg, safe=" =:/,.'-()").replace('"', "'") + '")'
def svg(w, h, body, sw=1.6): return (f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}'><g fill='none' stroke='%23000' "
                                    f"stroke-width='{sw}' stroke-linecap='round' stroke-linejoin='round'>{body}</g></svg>").replace('%23', '#')
star = lambda x, y, s: f"<path transform='translate({x} {y}) scale({s})' d='M10 1.5l2.4 6 6.4.4-5 4.1 1.7 6.3L10 14.8l-5.5 3.5 1.7-6.3-5-4.1 6.4-.4z M9.6 1.9l2.6 6.3'/>"
V = {
 # pencil ellipse drawn twice (the second pass slightly off): the active chip / tab is circled, not filled
 'pc-ring': svg(100, 44, "<path d='M14 8C34 2 72 2 90 9C99 13 99 31 88 36C70 43 30 43 12 36C2 32 1 15 13 9'/><path d='M20 6C44 1 80 4 93 12' opacity='.7'/>", 1.8),
 # wobbly underline under screen titles
 'pc-under': svg(160, 10, "<path d='M2 6C20 3 38 8 58 5S98 3 118 6 150 7 158 4'/><path d='M10 8C40 6 80 9 120 7' opacity='.55'/>", 1.6),
 # caterpillar reading an open book (empty corner of the library and the summary)
 'pc-worm': svg(96, 70, "<path d='M14 60C26 54 38 54 48 60C58 54 70 54 82 60V66C70 60 58 60 48 66C38 60 26 60 14 66z'/><path d='M48 60V66'/>"
                "<circle cx='34' cy='48' r='6'/><circle cx='44' cy='42' r='6'/><circle cx='54' cy='37' r='6'/><circle cx='65' cy='33' r='7.5'/>"
                "<path d='M62 26L59 19M69 26L72 19'/><circle cx='58.5' cy='18' r='1.4'/><circle cx='72.5' cy='18' r='1.4'/><path d='M62 34Q65 37 68 34'/>"
                "<path d='M28 51l-3 5M40 46l-2 6M51 41l-1 6' opacity='.7'/>", 1.5),
 'pc-star': svg(22, 22, star(1, 1, 1), 1.4),
 'pc-arrow': svg(40, 40, "<path d='M6 6C20 4 32 12 30 28'/><path d='M24 23L30 30 35 22'/>", 1.6),
 'pc-spiral': svg(30, 30, "<path d='M15 15c1-2 4-1 4 1 0 3-4 5-7 4-4-1-5-6-3-9 3-4 9-4 12 0 3 4 2 10-2 13-5 4-12 2-15-3'/>", 1.4),
}
print('html[data-skin="pencil"]{')
for k, v in V.items(): print(f'  --{k}:{u(v)};')
print('}')
