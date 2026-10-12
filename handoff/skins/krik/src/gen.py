import random,math
random.seed(7)
W,H=390,844
def wavy(y0,amp,ph,col,w,op,x0=-20,x1=410,slope=0,freq=0.02):
    pts=[];x=x0
    while x<=x1:
        y=y0+slope*(x-x0)+amp*math.sin(x*freq+ph)+random.uniform(-.8,.8)
        pts.append(f"{x:.0f},{y:.1f}");x+=14
    return f'<polyline points="{" ".join(pts)}" stroke="{col}" stroke-width="{w}" opacity="{op}" fill="none"/>'
FILT='''<filter id="cr" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.9 1.35"/><feComposite in="SourceGraphic" operator="in" result="g"/><feTurbulence baseFrequency=".035" numOctaves="2" seed="5" result="n"/><feDisplacementMap in="g" in2="n" scale="5"/></filter>
<filter id="wob"><feTurbulence baseFrequency=".03" numOctaves="2" seed="9"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter>
<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" seed="2"/><feColorMatrix values="0 0 0 0 .45 0 0 0 0 .35 0 0 0 0 .2 0 0 0 .22 0"/></filter>'''
def sky(top,bot,n=70):
    cols=["#f0a08a","#f4b39a","#f7c548","#f2d06b","#9cc8e0","#e8957d","#f5d78a","#f39a5e"]
    s=[]
    for i in range(n):
        y=top+(bot-top)*i/n+random.uniform(-4,4)
        s.append(wavy(y,random.uniform(4,12),random.uniform(0,6),random.choice(cols),random.uniform(3,7),random.uniform(.55,.9),freq=random.uniform(.012,.03)))
    return "".join(s)
def fjord(top,bot,n=50):
    cols=["#1b4fa8","#2a63c2","#163a8a","#3b7bd0","#0f2f78","#4a8ad8"]
    s=[]
    for i in range(n):
        y=top+(bot-top)*i/n+random.uniform(-3,3)
        s.append(wavy(y,random.uniform(5,14),random.uniform(0,6),random.choice(cols),random.uniform(3,6),random.uniform(.6,.95),freq=random.uniform(.02,.05)))
    return "".join(s)
def bridge(xs,ys,xe,ye,n=40,spread=260):
    # strokes fanning diagonally
    cols=["#c98b4a","#a8692f","#e0b070","#8a5226","#d9a05a","#f2c97a","#5a7fc0"]
    s=[]
    for i in range(n):
        t=i/n
        x0=xs+random.uniform(-10,10);y0=ys+t*spread
        x1=xe;y1=ye+t*spread*2.2
        mx=(x0+x1)/2+random.uniform(-15,15);my=(y0+y1)/2
        s.append(f'<path d="M{x0:.0f} {y0:.0f}Q{mx:.0f} {my:.0f} {x1:.0f} {y1:.0f}" stroke="{random.choice(cols)}" stroke-width="{random.uniform(3,7):.1f}" opacity="{random.uniform(.6,.9):.2f}" fill="none"/>')
    return "".join(s)
def figures(x,y,sc=1):
    g=f'<g transform="translate({x} {y}) scale({sc})">'
    for dx,h in ((0,0),(26,3)):
        g+=f'<path d="M{dx+12} {h+74} L{dx-60} {h+96} L{dx-48} {h+98} L{dx+22} {h+74}z" fill="#3b1f0f" opacity=".28"/>'
        g+=f'<g filter="url(#cr)" fill="#14306e" stroke="#0a1840" stroke-width="1.5"><rect x="{dx+5}" y="{h-16}" width="12" height="15" rx="1"/><rect x="{dx}" y="{h-2}" width="22" height="3" rx="1.5"/><circle cx="{dx+11}" cy="{h+8}" r="6.5" fill="#d9c7a0"/><path d="M{dx+3} {h+16} q8-4 16 0 l4 50 h-24z"/><path d="M{dx+6} {h+66}v8M{dx+16} {h+66}v8" stroke-width="3"/></g>'
    return g+'</g>'
def scream(x,y,s=1):
    return f'''<g transform="translate({x} {y}) scale({s})" filter="url(#cr)">
<path d="M-30 120 q-6-60 10-80 q-14-20-6-48 q8-28 26-30 q22 0 28 26 q6 28-6 48 q20 24 12 84z" fill="#2a63c2"/>
<path d="M-18 14 q-6-30 18-34 q24 4 18 34 q-2 26-18 28 q-16-2-18-28z" fill="#d6e6b0" stroke="#5a7a5a" stroke-width="2"/>
<ellipse cx="-7" cy="6" rx="4" ry="6" fill="#3a4a3a"/><ellipse cx="9" cy="6" rx="4" ry="6" fill="#3a4a3a"/>
<ellipse cx="1" cy="26" rx="4.5" ry="7" fill="#20304a"/>
<path d="M-24 0 q-8 20 2 34 M26 0 q8 20-2 34" stroke="#1b4fa8" stroke-width="6" fill="none" stroke-linecap="round"/></g>'''
