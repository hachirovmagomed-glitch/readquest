# Stage 1a step 3: cut lines A..B (1-based, inclusive) of source/app.html = the current TAIL of the strict block 1085
# (the line after B must be that block's </script>) into source/js/<name>, first line 'use strict'; (the block's own mode),
# and put <script src="js/<name>"></script> right after the block's </script> (before the tags of earlier cut pieces).
# usage (from repo root): python3 source/test/cut-tail.py A B name.js   — then: scriptv (split), names, full run
import sys
a,b,name=int(sys.argv[1]),int(sys.argv[2]),sys.argv[3]
import os
SRC=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
p=os.path.join(SRC,'app.html')
L=open(p,encoding='utf-8').read().split('\n')
assert L[1084]=='<script>' and L[1085]=="'use strict';", 'block 1085 moved'
assert L[b]=='</script>', ('line after B must close the block', L[b][:60])
assert '</script>' not in '\n'.join(L[1085:a-1]) , 'A..B not inside block 1085'
piece=L[a-1:b]
body="'use strict';\n"+'\n'.join(piece)+'\n'
open(os.path.join(SRC,'js',name),'w',encoding='utf-8').write(body)
tag=f'<script src="js/{name}"></script>'
# remove A..B, keep the block's </script>, put the tag right after it (before the tags of later pieces)
L=L[:a-1]+[L[b]]+[tag]+L[b+1:]
open(p,'w',encoding='utf-8').write('\n'.join(L))
print(f'cut {a}-{b} ({len(piece)} lines) -> js/{name}; first: {piece[0][:60]!r}; last: {piece[-1][:60]!r}')
