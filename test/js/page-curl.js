'use strict';
/* ===== «Загиб» page turn (Джессика 18.10, «все 4 по очереди», пункт 2; arch.md SET.flip.anim) ======================
   The new page is put in place AT ONCE (same as «Нет»: the column strip jumps, never animated — Android blank-page bug);
   over it lies a screen-sized copy of the OLD page that peels away from the edge with a folded strip and a shadow.
   Text: rqTextPageCopy (below). PDF: the old canvas itself, in a copy of the stage with the same transform.
   Main-thread rAF on that small layer only (clip-path + one strip); scroll mode / failures → no curl. */
const CURL_MS=340;
let rqCurlNow=null;
window.__rqCurl={n:0,frame0:null}; /* test hook */
function rqCurlStop(){if(!rqCurlNow)return;cancelAnimationFrame(rqCurlNow.raf);const w=rqCurlNow.wrap;rqCurlNow=null;w.remove();
  w.querySelectorAll('canvas').forEach(function(c){c.width=0;c.height=0;});} /* a PDF copy holds the old page's canvas: free it */
/** A copy of text page `pg` as it looks on screen (1 or 2 columns), or null. Used by «Загиб» (the page now on screen, taken
    before the strip jumps) and by the page grid («Обзор»). Per column: a clone of only the paragraphs on it, laid out at the
    column width with the same type, no column layout, moved so its first character sits where it sits on the page,
    clipped at the page's last line. Positions come from the strip's real place (#content rect), not from R.page. */
function rqTextPageCopy(pg){const m=rqTextPageCopies([pg]);return m[pg]||null;}
/** 04.11 (Джессика: «Обзор» «чутка подтормаживает в начале»): many pages at once. Measuring the strip is cheap while nothing
    changed, but each copy put into the viewer to be measured made the browser lay out the whole book again (~25 ms on a phone ×4).
    So: first plan every page (reads only; the copies are built detached), then put all copies in at once, measure, take them out:
    one re-layout per batch instead of one or two per page. → {page: sheet} for the pages that gave a copy. */
function rqTextPageCopies(pgs){
  const out={};
  try{
    const v=el('viewer'),c=el('content'),vr=v.getBoundingClientRect(),cr=c.getBoundingClientRect();
    if(rqScrollMode()||!R.step)return out;
    const kids=c.children,n=kids.length;if(!n)return out;
    const cols=vr.width>=860?2:1,gap=48,cw=(vr.width-gap*(cols-1))/cols;
    const fr=function(e){return Array.prototype.slice.call(e.getClientRects());};
    const lines=function(e){const rg=document.createRange();rg.selectNodeContents(e);return Array.prototype.slice.call(rg.getClientRects());};
    const rg=document.createRange(),cr1=function(node,o){rg.setStart(node,o);rg.setEnd(node,o+1);return rg.getClientRects()[0]||null;};
    const plans=[];
    pgs.forEach(function(pg){
      const sheet=document.createElement('div');sheet.className='rqCurlSheet';sheet.style.visibility='hidden';
      const parts=[];
      for(let j=0;j<cols;j++){
        const L=cr.left+pg*R.step+j*(cw+gap),Rt=L+cw;
        const inView=function(r){return r.width>0&&r.left<Rt-1&&r.right>L+1;};
        /* first child with a fragment in this column: binary search over the column order (fragments move right with the index) */
        let lo=0,hi=n-1;
        while(lo<hi){const m=(lo+hi)>>1,rs=fr(kids[m]);const last=rs[rs.length-1];if(last&&last.right<=L+1)lo=m+1;else hi=m;}
        const first=lo;if(!fr(kids[first]).some(inView))continue;
        let last=first;while(last+1<n&&fr(kids[last+1]).some(inView))last++;
        /* the column ends at the bottom of its last line of text */
        let bottom=0;for(let i=first;i<=last;i++)lines(kids[i]).forEach(function(r){if(inView(r))bottom=Math.max(bottom,r.bottom-vr.top);});
        /* its first character: the text node (as a child-index path inside kids[first]), the offset and its top */
        const tw=document.createTreeWalker(kids[first],NodeFilter.SHOW_TEXT);let tn=null,off=0,top=null;
        while(top==null&&(tn=tw.nextNode())){
          rg.selectNodeContents(tn);if(!Array.prototype.some.call(rg.getClientRects(),inView))continue;
          let a=0,z=tn.nodeValue.length-1; /* characters move right with the offset */
          while(a<z){const m=(a+z)>>1,r=cr1(tn,m);if(r&&r.right<=L+1)a=m+1;else z=m;}
          off=a;const r=cr1(tn,a);if(r)top=r.top-vr.top;
        }
        if(top==null)continue;
        const path=[];for(let x=tn;x!==kids[first];x=x.parentNode)path.unshift(Array.prototype.indexOf.call(x.parentNode.childNodes,x));
        const clip=document.createElement('div');clip.className='rqCurlClip';
        clip.style.left=(j*(cw+gap)).toFixed(2)+'px';clip.style.width=cw.toFixed(2)+'px';clip.style.height=Math.ceil(bottom)+'px';
        const t=document.createElement('div');t.className='rqCurlTxt'+(c.classList.contains('noind')?' noind':'');t.lang=c.lang;
        t.style.cssText=c.style.cssText;
        t.style.columnWidth='auto';t.style.columnGap='normal';t.style.height='auto';t.style.width=cw.toFixed(2)+'px';t.style.transform='none';
        for(let i=first;i<=last;i++)t.appendChild(kids[i].cloneNode(true));
        clip.appendChild(t);sheet.appendChild(clip);parts.push({t:t,path:path,off:off,top:top});
      }
      if(parts.length)plans.push({pg:pg,sheet:sheet,parts:parts});
    });
    if(!plans.length)return out;
    plans.forEach(function(q){v.appendChild(q.sheet);}); /* laid out at the same width to find the same characters */
    plans.forEach(function(q){q.sr=q.sheet.getBoundingClientRect();q.ok=true;
      q.parts.forEach(function(x){let cn=x.t.firstChild;x.path.forEach(function(i){cn=cn&&cn.childNodes[i];});
        x.r=cn?cr1(cn,x.off):null;if(!x.r)q.ok=false;});});
    plans.forEach(function(q){q.parts.forEach(function(x){if(x.r)x.t.style.marginTop=(x.top-(x.r.top-q.sr.top)).toFixed(3)+'px';}); /* layout offset, not a transform: same line rasterising */
      q.sheet.remove();q.sheet.style.visibility='';if(q.ok)out[q.pg]=q.sheet;});
  }catch(e){}
  return out;
}
/** the old PDF page as it is on screen: the old canvas itself (not freed yet) in a copy of #pdfStage / #pdfSheet with the
    same transform and size, so frame 0 is the same raster. The canvas is freed when the curl ends (rqCurlStop). */
function rqCurlSnapPdf(old){
  try{
    const st0=el('pdfStage'),sh0=el('pdfSheet'),cs=getComputedStyle(sh0);if(!old||!old.width)return null;
    const sheet=document.createElement('div');sheet.className='rqCurlSheet';
    const stg=document.createElement('div');stg.className='rqCurlStage';stg.style.transform=st0.style.transform;
    const pg=document.createElement('div');pg.className='rqCurlPg';
    pg.style.width=sh0.style.width;pg.style.height=sh0.style.height;pg.style.background=cs.backgroundColor;pg.style.boxShadow=cs.boxShadow;
    old.className='rqCurlCv';pg.appendChild(old);
    const t0=el('pdfText');if(t0.querySelector('span.v')){const tc=t0.cloneNode(true);tc.removeAttribute('id');pg.appendChild(tc);} /* 20.10 SET.pdfFont: the old page's text is in its text layer */
    stg.appendChild(pg);sheet.appendChild(stg);
    return sheet;
  }catch(e){return null;}
}
/** peel `sheet` (a copy of the old page) off `host`: dir 1 = forward (from the right edge), -1 = back (from the left edge) */
function rqPeel(host,sheet,dir){
  rqCurlStop();
  const wrap=document.createElement('div');wrap.className='rqCurl';wrap.setAttribute('aria-hidden','true');
  const fold=document.createElement('div');fold.className='rqFold'+(dir<0?' back':'');
  wrap.appendChild(sheet);wrap.appendChild(fold);host.appendChild(wrap);
  const w=host.clientWidth,t0=performance.now(),st={wrap:wrap,raf:0};rqCurlNow=st;
  __rqCurl.n++;__rqAnim.n++;__rqAnim.last='curl';
  const draw=function(k){
    const e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2,x=dir>0?w*(1-e):w*e,f=Math.min(56,w*e*0.6);
    if(dir>0){sheet.style.clipPath='inset(0 '+(w-x).toFixed(1)+'px 0 0)';fold.style.left=(x-f).toFixed(1)+'px';}
    else{sheet.style.clipPath='inset(0 0 0 '+x.toFixed(1)+'px)';fold.style.left=x.toFixed(1)+'px';}
    fold.style.width=f.toFixed(1)+'px';fold.style.display=f<0.5?'none':''; /* frame 0 = exactly the old page, no shadow yet */
  };
  draw(0);__rqCurl.frame0=performance.now();
  const step=function(t){if(rqCurlNow!==st)return;const k=Math.min(1,(t-t0)/CURL_MS);
    if(k>=1){rqCurlStop();return;}draw(k);st.raf=requestAnimationFrame(step);};
  st.raf=requestAnimationFrame(step);
}
/* ===== 10.11 (тестер: «сворачиваешь приложение и заходишь назад — страница на время слетает») =====================
   Leaving the app ends the browser fullscreen, and coming back re-lays out the WHOLE book (the strip of all its pages:
   seconds on a phone for a long book). Android has dropped the screen's tiles in the background, so the first frame waits
   for that layout → an empty page. Now, when the app goes to the background, a copy of the page on screen (rqTextPageCopy,
   same as «Загиб») is put over the text and the strip itself is taken out of the layout (display:none). The first frame
   back is that light copy — the page is there at once. Two frames later the strip comes back (one layout; a changed screen
   size is measured before, so the book is laid out once at the new size, the reading place kept) and the copy goes.
   Not with read-aloud (it turns pages in the background), «Прокрутка», a selection, the search screen or PDF. Writes nothing. */
const BGS={on:false,sheet:null,anchor:null,due:false,tok:0,takes:0,backs:0};
window.__rqBgSnap=BGS; /* test hook */
function rqBgSnapOk(){
  const r=el('reader');
  if(!R||!R.book||R.mode==='pdf'||!r||r.classList.contains('hidden')||rqScrollMode()||!R.step)return false;
  if((typeof ttsOn!=='undefined'&&ttsOn)||(typeof speaking!=='undefined'&&speaking))return false;
  if(window.__rqFindOpen||(typeof SM!=='undefined'&&SM&&SM.on))return false;
  try{const s=window.getSelection&&getSelection();if(s&&!s.isCollapsed&&String(s).length)return false;}catch(e){}
  return true;
}
function rqBgSnapTake(){
  if(BGS.on||!rqBgSnapOk())return;
  try{
    rqCurlStop();
    const anchor=readingAnchor(),sh=rqTextPageCopy(R.page);if(!sh)return;
    sh.classList.add('rqBgSnap');sh.setAttribute('aria-hidden','true');
    el('viewer').appendChild(sh);
    el('content').style.display='none';
    BGS.on=true;BGS.sheet=sh;BGS.anchor=anchor;BGS.due=false;BGS.takes++;
  }catch(e){console.warn('[rq] bg snap',e);}
}
/** the strip back (idempotent). quiet: the reader is closing — no re-layout. */
function rqBgSnapRestore(quiet){
  if(!BGS.on)return;
  BGS.on=false;BGS.tok++;
  const sh=BGS.sheet,anchor=BGS.anchor;BGS.sheet=null;BGS.anchor=null;BGS.due=false;
  const v=el('viewer'),c=el('content');
  try{
    let sz=null;
    if(!quiet&&R.mode!=='pdf'&&!el('reader').classList.contains('hidden')){
      if(typeof rqHalfSync==='function'&&rqHalfSync())applySet();
      rqTextMargin();sz={w:v.clientWidth,h:v.clientHeight}; /* cheap: the strip is still out of the layout */
    }
    if(sh)sh.remove();
    c.style.display='';
    if(sz&&R.layoutKey!==layoutKey(sz.w,sz.h)&&!window.__rqFindOpen)relayout({force:true,size:sz,anchor:anchor&&anchor.node&&anchor.node.isConnected?anchor:null});
    BGS.backs++;
  }catch(e){c.style.display='';if(sh)sh.remove();console.warn('[rq] bg snap back',e);}
}
document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='hidden'){rqBgSnapTake();return;}
  if(!BGS.on)return;
  const t=++BGS.tok;
  const go=function(){if(t===BGS.tok&&document.visibilityState!=='hidden')rqBgSnapRestore();};
  requestAnimationFrame(function(){requestAnimationFrame(go);}); /* the copy is on screen first, then the long layout */
  setTimeout(go,700); /* no frames (yet) → the book comes back anyway */
});
