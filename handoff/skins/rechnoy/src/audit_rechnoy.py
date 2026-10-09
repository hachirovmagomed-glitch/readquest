# Audit for «Речной»: (1) skin token pairs incl. gradient top stop, covers, day bar; (2) DOM: every visible text node and icon
# on the rendered mockups against its real background (body gradient interpolated at the element's y + sun glow, cards, chips);
# (3) decoration never overlaps text or tap zones (the wavy nav edge is part of the opaque nav, not checked), no decoration inside #reader; (4) every [data-tap] >= 44x44.
# Writes ../../12-rechnoy/contrast.tsv and prints a summary. Run after gen_rechnoy.py.
import os, json, re, subprocess, html as H
from concurrent.futures import ThreadPoolExecutor
import gen_rechnoy as G
cr, blend = G.B.cr, G.B.blend
OUT = G.OUT; SRC = G.SRC
JS = r'''
<script>
(function(){
const R=document.documentElement, cs=getComputedStyle(R);
const v=n=>cs.getPropertyValue(n).trim();
function p(c){const m=c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const a=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [a[0],a[1],a[2],a.length>3?a[3]:1];}
function hx(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),1];}
function over(f,b){const a=f[3];return [f[0]*a+b[0]*(1-a),f[1]*a+b[1]*(1-a),f[2]*a+b[2]*(1-a),1];}
function hex(c){return '#'+c.slice(0,3).map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');}
const top=hx(v('--rq-skin-bg-top')), bot=hx(v('--rq-bg')), sun=p(v('--rq-skin-sun'))||[0,0,0,0];
function bodyBg(x,y){const t=Math.max(0,Math.min(1,y/260));let c=[top[0]+(bot[0]-top[0])*t,top[1]+(bot[1]-top[1])*t,top[2]+(bot[2]-top[2])*t,1];
  const dx=(x-0.86*390)/260, dy=(y+30)/150; if(dx*dx+dy*dy<1) c=over(sun,c); return c;}
function bgOf(el,x,y){const layers=[];let e=el,grad=false;
  while(e&&e!==document.body&&e!==R){const s=getComputedStyle(e);const c=p(s.backgroundColor);if(s.backgroundImage&&s.backgroundImage!=='none')grad=true;
    if(c&&c[3]>0){layers.push(c);if(c[3]>=1)break;} e=e.parentElement;}
  let base=(layers.length&&layers[layers.length-1][3]>=1)?layers.pop():bodyBg(x,y);
  for(let i=layers.length-1;i>=0;i--) base=over(layers[i],base); return [base,grad];}
const out={text:[],icons:[],tap:[],overlap:[],readerDeco:0,decoCount:0};
const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const texts=[];
while(tw.nextNode()){const n=tw.currentNode;if(!n.textContent.trim())continue;const el=n.parentElement;
  if(el.closest('svg,[data-under],style,script,pre'))continue;const s=getComputedStyle(el);if(s.visibility==='hidden'||s.display==='none')continue;
  const r=document.createRange();r.selectNodeContents(n);const rects=[...r.getClientRects()].filter(q=>q.width>0&&q.bottom>0&&q.top<844&&q.left<390&&q.right>0);
  if(!rects.length)continue;
  // skip text covered by the bottom nav (cover titles under the floating nav)
  const q=rects[0];const cx=q.left+q.width/2,cy=q.top+q.height/2;const hit=document.elementFromPoint(Math.min(389,cx),Math.min(843,cy));
  if(hit&&!el.contains(hit)&&!hit.contains(el)&&!(hit.closest&&hit.closest('.deco'))){continue;}
  rects.forEach(q=>texts.push(q));
  const [bg,grad]=bgOf(el,cx,cy);const fg=over(p(s.color),bg);const fs=parseFloat(s.fontSize),fw=parseInt(s.fontWeight);
  out.text.push({t:n.textContent.trim().slice(0,40),fg:hex(fg),bg:hex(bg),fs,fw,grad,dis:!!el.closest('[aria-disabled]')});}
document.querySelectorAll('svg.i').forEach(sv=>{if(sv.closest('[data-under]'))return;const s=getComputedStyle(sv);if(s.visibility==='hidden')return;
  const q=sv.getBoundingClientRect();if(q.top>844||q.bottom<0)return;const hit=document.elementFromPoint(q.left+q.width/2,Math.min(843,q.top+q.height/2));
  if(hit&&!sv.contains(hit)&&!hit.contains(sv)&&!(hit.closest&&hit.closest('svg.i')===sv))return;
  const st=sv.getAttribute('stroke');const col=(st&&st!=='currentColor'&&!st.startsWith('var'))?st:(st&&st.startsWith('var')?getComputedStyle(sv).getPropertyValue(st.slice(4,-1)).trim():s.color);
  const c=col.startsWith('#')?hx(col):p(col);const [bg]=bgOf(sv.parentElement,q.left+q.width/2,q.top+q.height/2);
  out.icons.push({t:(sv.parentElement.textContent.trim()||sv.parentElement.className||'icon').slice(0,30),fg:hex(over(c,bg)),bg:hex(bg),dis:!!sv.closest('[aria-disabled]')});});
document.querySelectorAll('[data-tap]').forEach(e=>{const q=e.getBoundingClientRect();out.tap.push({t:(e.textContent.trim()||e.getAttribute('aria-label')||e.className).slice(0,30),w:Math.round(q.width),h:Math.round(q.height),r:[q.left,q.top,q.right,q.bottom]});});
document.querySelectorAll('.deco').forEach(d=>{out.decoCount++;if(d.dataset.deco==='navedge'){return;} /* wavy top edge of the opaque nav itself: covers scrolled content like the nav does */if(d.closest('#reader'))out.readerDeco++;
  [...d.querySelectorAll('path,ellipse')].forEach(g=>{const q=g.getBoundingClientRect();if(!q.width&&!q.height)return;
    const hitT=texts.filter(t=>q.left<t.right+2&&q.right>t.left-2&&q.top<t.bottom+2&&q.bottom>t.top-2);
    const hitA=out.tap.filter(a=>q.left<a.r[2]&&q.right>a.r[0]&&q.top<a.r[3]&&q.bottom>a.r[1]);
    if(hitT.length||hitA.length)out.overlap.push({deco:d.dataset.deco,box:[q.left,q.top,q.right,q.bottom].map(Math.round),text:hitT.length,tap:hitA.length});});});
const pre=document.createElement('pre');pre.id='audit';pre.textContent=JSON.stringify(out);document.body.appendChild(pre);
})();
</script>'''
def run(f):
    a = f'/tmp/audit-{os.path.basename(f)}'
    open(a, 'w').write(open(f).read().replace('</body>', JS + '</body>'))
    r = subprocess.run([G.CHROME, '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--window-size=390,844', '--virtual-time-budget=3000', '--dump-dom', 'file://' + a],
                       capture_output=True, text=True, timeout=120)
    m = re.search(r'<pre id="audit">(.*?)</pre>', r.stdout, re.S)
    return os.path.basename(f)[8:-5], json.loads(H.unescape(m.group(1)))
if __name__ == '__main__':
    files = [f'{SRC}/rechnoy-{k}-{th}.html' for th in ('day', 'night') for k, _, _ in G.SCREENS]
    with ThreadPoolExecutor(6) as ex: res = list(ex.map(run, files))
    rows = ['method\ttheme\tscreen\telement\tfg\tbg\tratio\tneed\tresult']; fails = 0; mins = {}
    def add(method, th, scr, el, fg, bg, need):
        global fails
        r = cr(fg, bg); ok = r >= need - 1e-9; fails += not ok
        k = (th, need); mins[k] = min(mins.get(k, (99, '')), (round(r, 2), f'{scr}: {el}'))
        rows.append(f'{method}\t{th}\t{scr}\t{el}\t{fg}\t{bg}\t{r:.2f}\t{need}\t{"OK" if ok else "FAIL"}')
    # (1) skin-specific token pairs (canonical 73 pairs are in contrast.rq.tsv)
    J = json.load(open(OUT + '/tokens.rq.json')); C = J['color']; X = J['skin_extras']; PG = J['page']
    for th in ('day', 'night'):
        c = {k: v[th] for k, v in C.items()}; x = {k[5:]: v[th] for k, v in X.items() if th in v}
        for f in ('text', 'text-2', 'accent-text', 'coin'): add('tokens', th, 'all', f'{f} на skin-bg-top (верх градиента фона)', c[f], x['bg-top'], 4.5)
        add('tokens', th, 'all', 'border-strong (поиск, фильтры) на skin-bg-top', c['border-strong'], x['bg-top'], 3)
        add('tokens', th, 'all', 'text-2 на surface-2 (мокрый песок: KPI, подписи)', c['text-2'], c['surface-2'], 4.5)
        add('tokens', th, 'all', 'coin на coin-tint (чип монет, «+30»)', c['coin'], c['coin-tint'], 4.5)
        add('tokens', th, 'all', 'accent (прогресс, кольцо) на surface-2 (дорожка)', c['accent'], c['surface-2'], 3)
        add('tokens', th, 'nav', 'accent-text (активная вкладка) на accent-tint (пилюля)', c['accent-text'], c['accent-tint'], 4.5)
        pg = PG[th if th == 'night' else 'day']
        add('tokens', th, 'reader', 'daybar на daybar-track', x['daybar'], x['daybar-track'], 3)
        add('tokens', th, 'reader', 'daybar на странице (--r-bg)', x['daybar'], pg['r-bg'], 3)
        add('tokens', th, 'reader', 'текст книги --r-txt на --r-bg', pg['r-txt'], pg['r-bg'], 4.5)
        add('tokens', th, 'reader', 'номер «98 / 185» --r-txt-2 на --r-bg', pg['r-txt-2'], pg['r-bg'], 4.5)
        for i in range(1, 7):
            cv = x[f'cover-{i}']
            add('tokens', th, 'library', f'cover-{i}: буква на обложке (40px)', x['cover-ink'], cv, 3)
            add('tokens', th, 'library', f'cover-{i}: ярлык формата 10px на чёрном 28%', x['cover-ink'], blend('#000000', .28, cv), 4.5)
    # (2) DOM text / icons
    seen = set(); tapbad = []; ov = []; rdeco = 0; ndeco = 0; dis = 0
    for name, a in res:
        scr, th = name.rsplit('-', 1)
        for t in a['text']:
            if t['dis']: dis += 1; continue
            need = 3 if (t['fs'] >= 24 or (t['fs'] >= 18.66 and t['fw'] >= 700)) else 4.5
            k = (th, scr, t['fg'], t['bg'], need)
            if k in seen: continue
            seen.add(k); add('dom', th, scr, f'«{t["t"]}» {t["fs"]:g}px/{t["fw"]}' + (' (градиент)' if t['grad'] else ''), t['fg'], t['bg'], need)
        for t in a['icons']:
            if t['dis']: continue
            k = (th, scr, t['fg'], t['bg'], 3)
            if k in seen: continue
            seen.add(k); add('dom', th, scr, f'иконка ({t["t"]})', t['fg'], t['bg'], 3)
        tapbad += [(name, t) for t in a['tap'] if t['w'] < 44 or t['h'] < 44]
        ov += [(name, o) for o in a['overlap']]; rdeco += a['readerDeco']; ndeco += a['decoCount']
    open(OUT + '/contrast.tsv', 'w').write('\n'.join(rows) + '\n')
    for r in rows:
        if r.endswith('FAIL'): print(r)
    print('pairs', len(rows) - 1, 'FAILS', fails, '| tokens', sum(r.startswith('tokens') for r in rows), 'dom', sum(r.startswith('dom') for r in rows), '| disabled skipped', dis)
    for k, v in sorted(mins.items()): print(k, v)
    print('tap <44:', len(tapbad), tapbad[:10]); print('tap targets total:', sum(len(a['tap']) for _, a in res))
    print('deco overlaps:', len(ov), ov[:10]); print('deco elements:', ndeco, 'inside #reader:', rdeco)
    json.dump({'fails': fails, 'pairs': len(rows) - 1, 'mins': {f'{k[0]} {k[1]}': v for k, v in mins.items()}, 'tap_bad': len(tapbad), 'overlaps': len(ov), 'reader_deco': rdeco},
              open('/tmp/rechnoy-audit.json', 'w'), ensure_ascii=False, indent=1)
