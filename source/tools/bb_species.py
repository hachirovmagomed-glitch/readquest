# «Бабочковый» species (17.10, Джессика: «большее разнообразие бабочек»): five wing shapes × eight palettes, our drawings from simple curves (not real species).
# Box 40×40, centre 20,20; the right half is drawn, the left mirrored. The same shapes are ported to js/library.js (BB_SP) for the covers.
SHAPES={
 'morpho':  dict(up='M20 19C23 8 33 3 37 8C40 14 33 20 21 21z', lo='M21 22C29 22 35 27 32 33C29 37 23 32 21 24z', spot=(31,11,2.2)),
 'swallow': dict(up='M20 18C23 7 34 3 38 6C39 11 33 19 21 21z', lo='M21 22C28 21 33 25 31 30L33 38 28.5 32.5C25 31 22 27 21 24z', spot=(32,9,1.8)),
 'round':   dict(up='M20 19C20 10 29 6 34 10C37 15 31 20 21 21z', lo='M21 22C28 21 33 26 30 31C27 34 22 29 21 24z', spot=(29,12,2.4)),
 'long':    dict(up='M20 19C25 12 35 8 39 10C39 15 30 19 21 21z', lo='M21 22C26 22 31 25 29 29C26 31 22 27 21 24z', spot=(34,11,1.6)),
 'scallop': dict(up='M20 19C22 9 30 4 35 6Q38 8 37 11Q39 14 36 16Q35 19 21 21z', lo='M21 22C27 21 33 24 33 28Q33 31 30 31Q29 35 25 33C23 31 21 27 21 24z', spot=(30,10,2)),
}
# (upper, lower, accent band, edge) — pastel and warm, no red (README: «Красного в скине нет»)
PAL=[('#8fd3d8','#b9a7ec','#ffffff','#3a3f6a'),   # бирюза → сирень
     ('#f3b4cf','#c5b3f1','#ffffff','#5b4f7a'),   # розовая
     ('#f6e27a','#f9f0b8','#f2a65a','#6b5a2a'),   # лимонница с оранжевым кончиком
     ('#8ec5f2','#cfe6fb','#ffffff','#2f4f7a'),   # голубянка
     ('#9fdcb6','#d6f2c8','#ffffff','#2f5a44'),   # мятная
     ('#f7c39b','#fbe0c8','#ffffff','#7a4a2a'),   # персиковая
     ('#f0a04b','#f6c27a','#5b3a1e','#5b3a1e'),   # оранжевая с тёмными жилками
     ('#a996e6','#e2dbf7','#8fd3d8','#3a3f6a')]   # тёмная сирень
def bf(shape,pal,body='#2b2f4f',ant=True):
    S=SHAPES[shape];c1,c2,ac,ed=PAL[pal];x,y,r=S['spot']
    deco=f'<circle cx="{x}" cy="{y}" r="{r}" fill="{ac}" opacity=".85"/>'
    if shape=='swallow': deco+=f'<path d="M23 20Q30 14 36 8" stroke="{ed}" stroke-width=".6" fill="none" opacity=".7"/>'
    if shape=='long': deco+=f'<path d="M24 19Q30 15 37 11" stroke="{ac}" stroke-width="1.6" fill="none" opacity=".9"/>'
    if shape=='round': deco+=''.join(f'<circle cx="{cx}" cy="{cy}" r=".9" fill="{ed}" opacity=".6"/>' for cx,cy in ((33,13),(31,17),(29,29)))
    if shape=='scallop': deco+=''.join(f'<circle cx="{cx}" cy="{cy}" r="1" fill="#fff" opacity=".8"/>' for cx,cy in ((35,8),(36,13),(31,30)))
    if pal==6: deco+=f'<path d="M22 20Q28 13 34 8M22 20Q30 18 36 15M22 23Q27 27 30 31" stroke="{ed}" stroke-width=".7" fill="none"/>'
    half=f'<path d="{S["up"]}" fill="{c1}" stroke="{ed}" stroke-width=".9"/><path d="{S["lo"]}" fill="{c2}" stroke="{ed}" stroke-width=".9"/>{deco}'
    a=f'<path d="M20 15Q18 9 15 7M20 15Q22 9 25 7" fill="none" stroke="{body}" stroke-width=".9"/><circle cx="15" cy="7" r=".9" fill="{body}"/><circle cx="25" cy="7" r=".9" fill="{body}"/>' if ant else ''
    return f'{half}<g transform="translate(40 0) scale(-1 1)">{half}</g>{a}<ellipse cx="20" cy="22" rx="1.6" ry="7" fill="{body}"/>'
def place(shape,pal,x,y,s,rot=0,op=1,**k): return f'<g transform="translate({x} {y}) rotate({rot}) scale({s}) translate(-20 -20)" opacity="{op}">{bf(shape,pal,**k)}</g>'
# night: moths in pale tints (mint, lilac, blue, cream)
NPAL=[('#dfeee4','#8fb7a0'),('#e4ddf6','#9a8fc4'),('#dbe8f6','#8ca3c4'),('#f3edd8','#b3a57a')]
def moth(x,y,s,rot,op,i):
    c,e=NPAL[i%4];up='M20 19C24 10 34 8 37 12C38 17 31 21 21 21z';lo='M21 22C27 23 31 28 30 33L33 39 28 34C25 31 22 27 21 24z'
    if i%4==2: up='M20 19C22 10 31 7 35 11C37 16 31 20 21 21z'; lo='M21 22C28 22 32 27 29 31C26 33 22 28 21 24z'
    half=f'<path d="{up}" fill="{c}" stroke="{e}" stroke-width=".9"/><path d="{lo}" fill="{c}" stroke="{e}" stroke-width=".9"/><circle cx="30" cy="15" r="1.8" fill="none" stroke="{e}" stroke-width=".8"/>'
    return f'<g transform="translate({x} {y}) rotate({rot}) scale({s}) translate(-20 -20)" opacity="{op}">{half}<g transform="translate(40 0) scale(-1 1)">{half}</g><path d="M20 15Q17 10 14 9M20 15Q23 10 26 9" stroke="#f3f6ee" stroke-width=".9" fill="none"/><ellipse cx="20" cy="22" rx="2" ry="6.5" fill="#f3f6ee"/></g>'
