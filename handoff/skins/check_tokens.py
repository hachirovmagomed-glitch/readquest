#!/usr/bin/env python3
"""Check skin tokens.json against canonical stage1-final/tokens.json.
Missing canonical name in a skin = ERROR (exit 1). Extra name = WARNING (skin extras must live in skin_extras with prefix skin-).
Usage: python3 check_tokens.py [--canon PATH] [SKIN_DIR_OR_TOKENS_JSON ...]
Defaults: canon = ../stage1-final/tokens.json (repo layout handoff/skins/) or ./_canon/stage1-final-tokens.json;
          skins = every subfolder next to this script that has tokens.json."""
import json,os,sys
HERE=os.path.dirname(os.path.abspath(__file__))
def names(J):
    N=set()
    for k,v in J.get('color',{}).items():
        N.add('color.'+k)
        for th in J.get('meta',{}).get('themes',['day','night']):
            if not (isinstance(v,dict) and th in v): N.add(f'!color.{k} has no {th}')
    for pv,d in J.get('page',{}).items(): N|={f'page.{pv}.{k}' for k in d}
    for sec in ('shadow','scalar','aliases'): N|={f'{sec}.{k}' for k in J.get(sec,{})}
    return N
def main(a):
    canon=None;skins=[]
    while a:
        x=a.pop(0)
        if x=='--canon': canon=a.pop(0)
        else: skins.append(x)
    if not canon:
        for c in (os.path.join(HERE,'..','stage1-final','tokens.json'),os.path.join(HERE,'_canon','stage1-final-tokens.json')):
            if os.path.exists(c): canon=c;break
    C={n for n in names(json.load(open(canon))) if not n.startswith('!')}
    if not skins: skins=sorted(os.path.join(HERE,d) for d in os.listdir(HERE) if not d.startswith('_') and os.path.isfile(os.path.join(HERE,d,'tokens.json')))
    print(f'canon: {os.path.relpath(canon)} ({len(C)} names)');bad=0
    for s in skins:
        p=s if s.endswith('.json') else os.path.join(s,'tokens.json');J=json.load(open(p));N=names(J)
        miss=sorted(C-N);extra=sorted(n for n in N-C if not n.startswith('!'));broken=sorted(n[1:] for n in N if n.startswith('!'))
        X=J.get('skin_extras',{});badx=[k for k in X if not k.startswith('skin-')]
        st='OK' if not (miss or broken) else 'FAIL';bad+=st=='FAIL'
        print(f'{st:4} {os.path.relpath(p,HERE):40} missing={len(miss)} extra={len(extra)} skin_extras={len(X)}'+(f' bad_extra_names={badx}' if badx else ''))
        for n in miss: print('   ERROR missing',n)
        for n in broken: print('   ERROR',n)
        for n in extra: print('   WARN extra',n)
    return 1 if bad else 0
if __name__=='__main__': sys.exit(main(sys.argv[1:]))
