'use strict';
/* ===== PDF reader (build PDF-blocker) =====================================================
   ONE transform parent: #pdfStage > #pdfSheet > [front canvas, #pdfText]. Pinch / pan / interim resize
   move the whole sheet (backing + bitmap + text layer) through one CSS transform — they can never drift apart.
   Double buffer: every render goes into a fresh off-DOM canvas; the visible (front) canvas is never resized,
   cleared or cancelled. Swap = canvas + text layer + sheet size + page number + transform, in ONE rAF after
   render().promise resolved. A newer request cancels only the back render.
   Rotation: getViewport() without a rotation argument = page.rotate (the file's /Rotate) — nothing else rotates.
   Viewport changes (bars / fullscreen / rotation): the old frame is CSS-scaled at once, the re-render waits for a
   stable non-zero size (2 equal rAF samples + 120 ms). Labels: pdf.getPageLabels(), else the 1-based file number. */
const PDF_MAX_PX=16e6, PDF_ZMAX=4, PDF_DBL_MS=250, PDF_SWIPE=50;
const P={seq:0,task:null,front:null,frontSc:0,shown:-1,target:0,baseW:0,baseH:0,bw:0,k:1,z:1,tx:0,ty:0,labels:null,
  sliding:false,rsRaf:0,rsAt:0,lastSz:'',stableN:0,redo:false,lastVS:null,lastVR:null,stall:null,reqWhy:'',tapT:null,tapAt:0,tapX:0,tapY:0,g:null,applyRaf:0,swaps:0,renders:0,cancels:0,wheelAt:0,chk:0,log:[]};
window.__rqPdf=P; /* diagnostics for tests (read-only) */
function pdfLabel(n){const l=P.labels&&P.labels[n];return (l!=null&&String(l).trim()!=='')?String(l):String(n+1);}
function pdfViewSize(){const v=el('viewer'),s={w:v.clientWidth,h:v.clientHeight};if(s.w>8&&s.h>8)P.lastVS=s;return s;}
/* gestures: during a transient 0/1-px viewport (fullscreen / resize in progress) use the last real size */
function pdfVR(){const r=el('viewer').getBoundingClientRect();if(r.width>8&&r.height>8){P.lastVR=r;return r;}return P.lastVR||r;}
function pdfAct(kind,info){if(__tracker&&__tracker.userActive)__tracker.userActive(kind,info||{});}
function pdfBackdrop(txt){const d=el('pdfBack');if(!d)return;if(txt==null){d.classList.add('hidden');return;}el('pdfBackN').textContent=txt;d.classList.remove('hidden');}
async function openPdf(b){
  try{
    pdfReset();pdfBackdrop(''); /* before any await: the previous book's canvas is gone, the page colour shows at once */
    await loadPdfJs();
    const buf=await idbGet('pdf:'+b.id);
    if(!buf)throw new Error('файл не найден на этом устройстве');
    pdfReset();
    const doc=await window.pdfjsLib.getDocument({data:buf}).promise;
    if(R.book!==b){try{doc.destroy();}catch(e){}return;} /* closed while loading */
    R.pdf=doc;R.pageCount=doc.numPages;
    try{const L=await doc.getPageLabels();P.labels=(Array.isArray(L)&&L.length===R.pageCount)?L:null;}catch(e){P.labels=null;}
    if(typeof bfPdfOutline==='function')bfPdfOutline(b,doc); /* 20.10: PDF bookmarks → «Главы», ticks on the slider (js/book-find.js), in the background */
    const p=Math.max(0,Math.min(R.pageCount-1,Math.round(rqPos(b.id)*(R.pageCount-1))));
    R.page=p;P.target=p;
    if(__tracker)__tracker.begin(b.id, p, trackerOpts());
    pauseReset();
    if(typeof fzOnOpen==='function')fzOnOpen(); /* 25.10 «Фокус» */
    pdfLvlCheck(b,doc); /* 19.10: level by the PDF's own text, in the background (once per book) */
    pdfNumbers(p);pdfBackdrop('Открываем страницу '+pdfLabel(p)); /* EN via I18N_RE: «Opening page N» */
    if(psOn()){psOpen(p);return;} /* 18.10: «Прокрутка» — js/pdf-scroll.js */
    pdfRender('open');pdfWatch();
  }catch(e2){pdfBackdrop(null);rqAlert('Не удалось открыть PDF: '+e2.message);show('library');}
}
function pdfCancel(){if(P.task){try{P.task.cancel();P.cancels++;}catch(e){}P.task=null;}}
function pdfReset(){
  P.seq++;pdfCancel();if(typeof psReset==='function')psReset();if(typeof rqCurlStop==='function')rqCurlStop();
  const sh=el('pdfSheet');
  sh.querySelectorAll('canvas').forEach(c=>{c.remove();c.width=0;c.height=0;});
  el('pdfText').textContent='';
  P.front=null;P.frontSc=0;P.shown=-1;P.target=0;P.z=1;P.k=1;P.tx=0;P.ty=0;P.baseW=0;P.baseH=0;P.bw=0;P.labels=null;P.g=null;P.sliding=false;P.redo=false;P.stall=null;
  clearTimeout(P.tapT);P.tapT=null;clearInterval(P.watch);P.watch=0;P.retry=0;pdfResumeDone();
  const st=el('pdfStage');st.style.transform='';st.style.visibility='hidden';
}
function pdfClose(){pdfReset();pdfBackdrop(null);if(R.pdf){try{R.pdf.destroy();}catch(e){}}R.pdf=null;}
/** Render P.target into a back canvas; swap in the next frame. */
async function pdfRender(why){
  if(!R.pdf)return;
  const n=P.target;
  const seq=++P.seq;pdfCancel();P.reqAt=performance.now();P.reqWhy=why||'';
  let page;try{page=await R.pdf.getPage(n+1);}catch(e){pdfRenderFailed(seq,e);return;}
  if(seq!==P.seq||!R.pdf)return;
  const sz=pdfViewSize();
  if(!(sz.w>8&&sz.h>8)){P.redo=true;pdfOnResize();return;} /* never lay out against a 0-size viewport; re-render P.target once the size is stable */
  P.redo=false;
  const vp1=page.getViewport({scale:1});        /* rotation = page.rotate (/Rotate) */
  const s0=sz.w/vp1.width;                       /* fit to width */
  const same=(n===P.shown);
  const zr=same?P.z:1;                           /* a flip always opens at width */
  const dpr=Math.max(1,window.devicePixelRatio||1);
  let sc=s0*zr*dpr;
  if(vp1.width*sc*vp1.height*sc>PDF_MAX_PX)sc=Math.sqrt(PDF_MAX_PX/(vp1.width*vp1.height)); /* ≤ 16 MP */
  const vp=page.getViewport({scale:sc});
  const cv=document.createElement('canvas');
  cv.width=Math.max(1,Math.floor(vp.width));cv.height=Math.max(1,Math.floor(vp.height));
  const ctx=cv.getContext('2d',{alpha:false});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
  const gl=pdfMuteText(ctx); /* 20.10 SET.pdfFont: the text is drawn by the text layer */
  const task=page.render({canvasContext:ctx,viewport:vp});P.task=task;P.renders++;
  try{await task.promise;}catch(e){if(P.task===task)P.task=null;cv.width=0;cv.height=0;pdfRenderFailed(seq,e);return;} /* cancelled: only the back buffer is dropped */
  if(P.task===task)P.task=null;
  if(seq!==P.seq){cv.width=0;cv.height=0;return;}
  const baseW=sz.w,baseH=vp1.height*s0;
  let tl=null;
  if(!same||Math.abs(baseW-P.bw)>0.5)tl=await pdfTextLayer(page,s0,gl&&{g:gl,k:s0/sc});
  if(seq!==P.seq){cv.width=0;cv.height=0;return;}
  requestAnimationFrame(function(){
    if(seq!==P.seq){cv.width=0;cv.height=0;return;}
    /* 1в-black-2: right after a return the GPU/backing may not be back yet → the fresh bitmap can itself be lost/black.
       Re-render after a frame (≤ 3 tries; a genuinely black page is shown after that). */
    if(pdfCtxLost(cv)){ /* backing not back yet: never swap it in; page colour + spinner stay, clock stays held */
      cv.width=0;cv.height=0;P.badTry=(P.badTry||0)+1;pdfLog({ev:'ctx-lost-after-render',why:why,try:P.badTry});
      if(P.shown>=0){el('pdfStage').style.visibility='hidden';pdfBackdrop('');pdfHold();}
      setTimeout(function(){requestAnimationFrame(function(){if(seq===P.seq&&R.pdf&&document.visibilityState!=='hidden')pdfRender(why);});},Math.min(1000,150*P.badTry));return;
    }
    if(/^(resume|restored|check)/.test(why||'')&&pdfCanvasBad(cv)&&(P.badTry=(P.badTry||0)+1)<=3){
      pdfLog({ev:'canvas-bad-after-render',why:why,try:P.badTry});cv.width=0;cv.height=0;
      setTimeout(function(){requestAnimationFrame(function(){if(seq===P.seq&&R.pdf)pdfRender(why);});},80*P.badTry);return;
    }
    pdfSwap(n,cv,sc,baseW,baseH,tl,sz);
  });
}
/** A render that failed for another reason than our own cancel() is retried (the front frame stays meanwhile). */
function pdfRenderFailed(seq,e){
  if(e&&e.name==='RenderingCancelledException')return;
  pdfLog({ev:'render-error',msg:String(e&&e.message||e).slice(0,120),t:Math.round(performance.now())});
  if(seq!==P.seq||!R.pdf)return;
  P.retry=(P.retry||0)+1;
  if(P.retry<=3)setTimeout(function(){if(seq===P.seq&&R.pdf)pdfRender('retry');},120*P.retry);
  else pdfResumeDone(); /* 1в-black: giving up → never keep the session held */
}
/** Watchdog recovery → one analytics event in the `events` store (never sessions[]). */
function pdfStallLog(n){
  const st=P.stall;P.stall=null;if(!st)return;
  const ev={type:'pdf_stall_recovered',bookId:R.book&&R.book.id,page:n,label:pdfLabel(n),stalledMs:Math.round(performance.now()-st.t0),reason:st.why};
  pdfLog({ev:'stall-recovered',page:n,ms:ev.stalledMs,why:st.why});
  try{if(__rq&&__rq.logAnalyticsEvent)__rq.logAnalyticsEvent(ev).catch(function(e){console.warn(e);});}catch(e){}
}
/** Safety net: a requested page that is neither rendering nor shown after 1.5 s is requested again. */
function pdfWatch(){
  clearInterval(P.watch);
  P.watch=setInterval(function(){
    if(!R.pdf||R.mode!=='pdf'){clearInterval(P.watch);P.watch=0;return;}
    if(P.target===P.shown&&!P.task&&!P.rsRaf&&++P.chk%3===0)pdfCheck('watch'); /* ~2 s: a dropped backing with no event at all */
    if(P.target!==P.shown&&!P.task&&!P.rsRaf&&performance.now()-(P.reqAt||0)>1500){
      pdfLog({ev:'watchdog',target:P.target,shown:P.shown});
      if(!P.stall)P.stall={t0:P.reqAt||performance.now(),why:P.reqWhy||'',page:P.target}; /* logged as pdf_stall_recovered once the page is on screen */
      pdfRender('watchdog');
    }
  },700);
}
function pdfSwap(n,cv,sc,baseW,baseH,tl,sz){
  const sh=el('pdfSheet'),old=P.front,isNew=(n!==P.shown);
  sh.style.width=baseW+'px';sh.style.height=baseH+'px';
  cv.className='pdfc';sh.insertBefore(cv,sh.firstChild);
  /* 1в-black-2: Chrome (Android) drops 2D canvas backings in the background and fires contextlost / contextrestored */
  cv.addEventListener('contextlost',function(e){if(P.front===cv)pdfLost('contextlost');});
  cv.addEventListener('contextrestored',function(){if(P.front===cv)pdfResume('restored');});
  P.badTry=0;pdfRemember(cv);
  /* «Загиб»: the old page is copied while its canvas still exists (same conditions as pdfTurnAnim below) */
  const curl=(isNew&&P.flipDir&&n===P.target&&!P.sliding&&old&&old!==cv&&rqAnimKind()==='curl')?rqCurlSnapPdf(old):null;
  if(old&&old!==cv&&!curl){old.remove();old.width=0;old.height=0;} /* «Загиб» moved it into its copy; freed when the peel ends */
  P.front=cv;P.frontSc=sc;P.swaps++;P.retry=0;
  if(tl){const t=el('pdfText');t.textContent='';t.appendChild(tl);}
  el('pdfText').style.width=baseW+'px';el('pdfText').style.height=baseH+'px';
  if(typeof pdfHlPaint==='function')pdfHlPaint(el('pdfText'),n); /* 21.10: quote colours on the PDF page */
  if(isNew){P.z=1;P.tx=0;P.ty=0;}
  P.bw=baseW;P.baseW=baseW;P.baseH=baseH;P.k=1;
  pdfApply();
  el('pdfStage').style.visibility='';
  pdfBackdrop(null);
  if(isNew){
    P.shown=n;R.page=n;
    const tts=P.tts&&n===P.target;if(tts)P.tts=false;
    if(tts){R.pos=R.pageCount>1?n/(R.pageCount-1):1;persistPage();} /* 1в: a read-aloud page moves the position, never «reached» */
    else if(!P.sliding)pdfReach(n); /* 1б-144: a slider preview page is not «reached»; only the settled page counts */
    pdfNumbers(P.sliding?P.target:n);
    const fd=P.flipDir;P.flipDir=0;
    if(fd&&n===P.target&&!P.sliding&&P.z===1){if(curl)rqPeel(el('pdfWrap'),curl,fd);else pdfTurnAnim(fd);}
    if(P.jump){if(!P.sliding){P.jump=false;if(__tracker&&__tracker.jumped)__tracker.jumped(n);}} /* mid-drag pages are not written */
    else if(__tracker&&__tracker.pageShown)__tracker.pageShown(n,tts?'tts':undefined); /* the page is on screen now */
    updDayBar();
  }
  if(P.stall)pdfStallLog(n);
  pdfResumeDone(); /* 1в-black: the page is on screen → release the held clock */
}
/* 16.10: PDF turn animation — only the screen-sized #pdfWrap moves / fades, AFTER the new page is already drawn (never an empty frame) */
function pdfTurnAnim(d){const k=rqAnimKind(),w=el('pdfWrap');if(!k||!w.animate)return;
  __rqAnim.n++;__rqAnim.last='pdf-'+k;
  try{if(P.anim)P.anim.finish();}catch(e){}
  try{P.anim=k==='slide'?w.animate([{transform:'translateX('+(d*18)+'%)',opacity:0.6},{transform:'none',opacity:1}],{duration:220,easing:'cubic-bezier(.2,.7,.3,1)'})
    :w.animate([{opacity:0.45},{opacity:1}],{duration:180,easing:'ease-out'});}catch(e){}}
/** Corner number + bar number + slider: printed label / total (same frame as the swap). */
function pdfReach(n){const r=R.pageCount>1?n/(R.pageCount-1):1;R.maxRatio=Math.max(R.maxRatio,r);R.pos=r;persistPage();}
function pdfNumbers(n,fromSlider){
  const t=pdfLabel(n)+' / '+R.pageCount;
  if(el('rPage').textContent!==t)el('rPage').textContent=t;
  if(el('pgNum').textContent!==t)el('pgNum').textContent=t;
  const ratio=R.pageCount>1?n/(R.pageCount-1):1;
  el('rPct').textContent=Math.round(ratio*100)+'%';
  const sl=el('pgSlider');sl.max=Math.max(0,R.pageCount-1);if(!fromSlider)sl.value=n;pgArtSync();
}
/** Clamp the pan to the page edges and write the ONE transform. */
function pdfApply(){
  const s=pdfViewSize();if(!(s.w>8&&s.h>8)||!P.baseW)return;
  const zz=P.z*P.k,W=P.baseW*zz,H=P.baseH*zz;
  P.tx=W<=s.w+0.5?(s.w-W)/2:Math.min(0,Math.max(s.w-W,P.tx));
  P.ty=H<=s.h+0.5?(s.h-H)/2:Math.min(0,Math.max(s.h-H,P.ty));
  el('pdfStage').style.transform='translate3d('+P.tx.toFixed(2)+'px,'+P.ty.toFixed(2)+'px,0) scale('+zz.toFixed(5)+')';
}
function pdfApplySoon(){if(!P.applyRaf)P.applyRaf=requestAnimationFrame(function(){P.applyRaf=0;pdfApply();});}
function pdfGeom(){const s0=pdfViewSize(),s=(s0.w>8&&s0.h>8)?s0:(P.lastVS||s0),zz=P.z*P.k,W=P.baseW*zz,H=P.baseH*zz;return {s:s,W:W,H:H,atL:P.tx>=-0.5,atR:P.tx<=s.w-W+0.5,pannable:W>s.w+1||H>s.h+1};}
/** Viewport changed: CSS-scale the old frame now, re-render once the size is stable and non-zero. */
function pdfOnResize(){
  if(R.mode!=='pdf'||!R.pdf)return;
  if(PS.on){psResize();return;}
  pdfVR(); /* refresh the cached viewer rect (P.lastVR) as soon as the new size is real */
  pdfInterim();
  P.rsAt=performance.now();P.stableN=0;P.lastSz='';
  if(!P.rsRaf)P.rsRaf=requestAnimationFrame(pdfRsTick);
}
function pdfInterim(){
  const s=pdfViewSize();
  if(s.w>8&&s.h>8&&P.bw){const kn=s.w/P.bw;if(kn!==P.k){P.tx*=kn/P.k;P.ty*=kn/P.k;P.k=kn;}pdfApply();}
}
function pdfRsTick(){
  P.rsRaf=0;
  if(R.mode!=='pdf'||!R.pdf)return;
  pdfVR(); /* keep P.lastVR current while the size settles (top changes on fullscreen enter/exit) */
  const s=pdfViewSize(),key=s.w+'x'+s.h;
  if(key===P.lastSz&&s.w>8&&s.h>8)P.stableN++;else{P.stableN=0;P.lastSz=key;pdfInterim();}
  if(P.stableN>=2&&performance.now()-P.rsAt>=120){
    if(P.redo||!P.bw||Math.abs(s.w-P.bw)>0.5)pdfRender('resize'); /* new fit width, or a render that bailed on a 0-size viewport → one re-render */
    else pdfApply();
    return;
  }
  P.rsRaf=requestAnimationFrame(pdfRsTick);
}
/** Text layer in BASE (fit-width) coordinates; widths fitted with canvas measureText (no layout). */
let pdfMeasure=null;
async function pdfTextLayer(page,s0,look){
  const frag=document.createDocumentFragment();
  try{
    const tc=await page.getTextContent();
    const vp=page.getViewport({scale:s0});
    const U=window.pdfjsLib.Util;
    if(!pdfMeasure)pdfMeasure=document.createElement('canvas').getContext('2d');
    const lf=look?await pdfLookFont():null; /* 20.10 SET.pdfFont: the reader font, loaded before measuring */
    let prev=null,line=null;const lines=[];
    tc.items.forEach(function(it){
      if(!it.str)return;
      const tx=U.transform(vp.transform,it.transform);
      const fh=Math.hypot(tx[2],tx[3])||12;
      const ang=Math.atan2(tx[1],tx[0]);
      const st=tc.styles&&tc.styles[it.fontName];
      const fam=(st&&st.fontFamily)||'sans-serif';
      const sp=document.createElement('span');
      sp.textContent=it.str;
      const base=tx[5],wd=(it.width||0)*s0;
      /* 20.10 SET.pdfFont: an item whose glyphs were muted on the canvas is shown here in the reader font, in its own colour */
      const ink=lf?pdfInkAt(look,tx[4],base,ang,fh,wd):null;
      let fnt=fh.toFixed(2)+'px '+fam,top=base-fh;
      if(ink!=null){
        const fo=pdfFontObj(page,it.fontName),fs=fo.it?'italic':'normal',fw=fo.b?lf.wb:lf.w,m=pdfAscent(fs+' '+fw+' 100px '+lf.fam);
        fnt=fs+' '+fw+' '+fh.toFixed(2)+'px '+lf.fam;top=base-((fh-(m[0]+m[1])*fh)/2+m[0]*fh); /* the reader font's baseline on the line's baseline */
        sp.className='v';sp.style.fontFamily=lf.fam;sp.style.fontWeight=fw;sp.style.fontStyle=fs;
        const c=rqRgb(ink);sp.style.setProperty('--ink','rgb('+c.join(',')+')');sp.style.setProperty('--l',((0.299*c[0]+0.587*c[1]+0.114*c[2])/255).toFixed(3));
      }else sp.style.fontFamily=fam;
      sp.style.left=tx[4].toFixed(2)+'px';sp.style.top=top.toFixed(2)+'px';
      sp.style.fontSize=fh.toFixed(2)+'px';
      let tr=Math.abs(ang)>0.01?'rotate('+ang.toFixed(4)+'rad) ':'';
      if(it.str.trim()&&it.width>0){pdfMeasure.font=fnt;const mw=pdfMeasure.measureText(it.str).width;if(mw>0)tr+='scaleX('+(it.width*s0/mw).toFixed(4)+')';}
      if(tr)sp.style.transform=tr;
      const sx=/scaleX\(([\d.]+)\)/.exec(tr);
      /* 19.10 (Джессика: «не работает нормальное выделение»): the copied / quoted text keeps its words and lines apart —
         a new line of the page → a line break, a gap on the same line → a space (spans are absolute, the DOM has neither) */
      if(prev){
        if(Math.abs(base-prev.base)>Math.max(fh,prev.fh)*0.5){frag.appendChild(document.createElement('br'));line=null;}
        else if(tx[4]-prev.right>fh*0.15&&!/\s$/.test(prev.str)&&!/^\s/.test(it.str)){
          const g=document.createElement('span');g.textContent=' ';g.style.left=prev.right.toFixed(2)+'px';g.style.top=(base-fh).toFixed(2)+'px';g.style.fontSize=fh.toFixed(2)+'px';frag.appendChild(g);}
      }
      prev={base:base,fh:fh,right:tx[4]+wd,str:it.str};
      if(!line){line=[];lines.push(line);}
      line.push({sp:sp,left:tx[4],top:top,bot:top+fh,right:tx[4]+wd,sx:sx?+sx[1]:1,rot:Math.abs(ang)>0.01});
      frag.appendChild(sp);
    });
    /* no dead gaps between and around the lines: each span reaches down to the next line, the first one of a line out to
       the left edge, the last one out to the right edge (padding, so the glyphs stay put). A finger or a selection handle
       in a gap, in the margin or under the text then lands on the nearest line of text, not on the page header. */
    lines.forEach(function(ln){
      if(ln.some(function(q){return q.rot;}))return;
      const bot=Math.max.apply(null,ln.map(function(q){return q.bot;}));let nt=vp.height; /* the nearest line BELOW (item order is not page order) */
      lines.forEach(function(o){if(o===ln)return;const t=Math.min.apply(null,o.map(function(q){return q.top;}));if(t>=bot-1&&t<nt)nt=t;});
      ln.forEach(function(q){const pb=Math.max(0,nt-q.bot);if(pb>0)q.sp.style.paddingBottom=pb.toFixed(2)+'px';});
      const f=ln.reduce(function(a,q){return q.left<a.left?q:a;}),l=ln.reduce(function(a,q){return q.right>a.right?q:a;});
      if(f.left>0){f.sp.style.left='0px';f.sp.style.paddingLeft=(f.left/f.sx).toFixed(2)+'px';}
      if(l.right<vp.width)l.sp.style.paddingRight=((vp.width-l.right)/l.sx).toFixed(2)+'px';
    });
  }catch(e){/* scans have no text layer */}
  const end=document.createElement('div');end.className='endOfContent';frag.appendChild(end); /* keeps a drag in a gap near the finger (selectionchange below) */
  return frag;
}
/* ===== 20.10 «Шрифт читалки в PDF» (SET.pdfFont) and «Цвета темы для PDF» (SET.pdfTheme), as in ReadEra — arch.md ===== */
/** SET.pdfFont: pdf.js draws the page text with fillText / strokeText on this context → muted. Every muted glyph is kept
    (canvas px + colour), so the text layer shows exactly those items: hidden OCR text of a scan, Type3 glyphs and text drawn
    on pdf.js's own scratch canvases stay on the page bitmap as they are (never twice, never lost). null = font mode off.
    21.10 (Джессика, видео: «безумие»): a scanned book keeps its OCR text UNDER the page picture (ABBYY «текст под изображением»),
    so a glyph that a later opaque picture paints over was never visible → not shown either (colour null), the scan stays alone. */
function pdfMuteText(ctx){
  if(!SET.pdfFont)return null;
  const g=[],rec=function(st){return function(s,x,y){const m=this.getTransform(),c=st?this.strokeStyle:this.fillStyle;g.push(m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f,typeof c==='string'?c:'#000');};};
  ctx.fillText=rec(false);ctx.strokeText=rec(true);
  const di=ctx.drawImage;
  ctx.drawImage=function(im){
    const a=arguments,n=a.length;
    if(g.length&&this.globalAlpha>=1&&this.globalCompositeOperation==='source-over'){
      const r=n>=9?[a[5],a[6],a[7],a[8]]:n>=5?[a[1],a[2],a[3],a[4]]:[a[1],a[2],im.width,im.height],m=this.getTransform();
      const xs=[],ys=[];[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0],r[1]+r[3]],[r[0]+r[2],r[1]+r[3]]].forEach(function(p){xs.push(m.a*p[0]+m.c*p[1]+m.e);ys.push(m.b*p[0]+m.d*p[1]+m.f);});
      const x0=Math.min.apply(null,xs),x1=Math.max.apply(null,xs),y0=Math.min.apply(null,ys),y1=Math.max.apply(null,ys);
      for(let i=0;i<g.length;i+=3)if(g[i]>=x0&&g[i]<=x1&&g[i+1]>=y0&&g[i+1]<=y1)g[i+2]=null;
    }
    return di.apply(this,a);
  };
  return g;
}
/** colour of the first muted glyph inside this item's box (base px; k = canvas px → base px), or null when none was muted */
function pdfInkAt(look,x0,y0,ang,fh,wd){
  const g=look.g,k=look.k,c=Math.cos(ang),s=Math.sin(ang);
  for(let i=0;i<g.length;i+=3){const dx=g[i]*k-x0,dy=g[i+1]*k-y0,u=dx*c+dy*s,v=dy*c-dx*s;
    if(g[i+2]!=null&&u>=-1&&u<=wd+1&&v>=-fh*0.6&&v<=fh*0.3)return g[i+2];}
  return null;
}
/** bold / italic of the file's font (pdf.js font object: flags, else its name) */
function pdfFontObj(page,id){
  let f=null;try{if(page.commonObjs.has(id))f=page.commonObjs.get(id);}catch(e){}
  const n=String((f&&f.name)||'');
  return {b:!!(f&&(f.bold||f.black))||/bold|black|heavy|semibold|demi/i.test(n),it:!!(f&&f.italic)||/italic|oblique/i.test(n)};
}
const pdfAsc={};
/** [ascent, descent] of a font as a share of its size (layout box of a line-height:1 span) */
function pdfAscent(f){
  if(pdfAsc[f])return pdfAsc[f];
  pdfMeasure.font=f;const m=pdfMeasure.measureText('Hg'),a=m.fontBoundingBoxAscent,d=m.fontBoundingBoxDescent;
  return (pdfAsc[f]=(a>0&&d>=0)?[a/100,d/100]:[0.8,0.2]);
}
/** the reader font (as the text: SET.font, SET.weight; bold = heavier), its faces loaded (≤ 1.5 s) */
async function pdfLookFont(){
  const fam=(FONTS[SET.font]||FONTS[0]).v,w=SET.weight||400,wb=w>=600?800:700;
  if(document.fonts&&document.fonts.load){
    const all=['normal '+w,'normal '+wb,'italic '+w,'italic '+wb].map(function(x){return document.fonts.load(x+' 16px '+fam).catch(function(){});});
    await Promise.race([Promise.all(all),new Promise(function(r){setTimeout(r,1500);})]);
  }
  return {fam:fam,w:w,wb:wb};
}
let rqRgbCx=null;
/** any CSS colour → [r,g,b] 0..255 (the browser parses it) */
function rqRgb(v){
  if(!rqRgbCx)rqRgbCx=document.createElement('canvas').getContext('2d');
  rqRgbCx.fillStyle='#000';rqRgbCx.fillStyle=v||'#000';const s=rqRgbCx.fillStyle;
  if(s[0]==='#')return [1,3,5].map(function(i){return parseInt(s.substr(i,2),16);});
  const m=s.match(/[\d.]+/g)||[0,0,0];return [+m[0],+m[1],+m[2]];
}
/** applySet → #reader classes, the tone filter matrix (text colour ↔ background by pixel brightness), the switches;
    a new font / weight / mode for the PDF on screen → it is drawn again (page or strip) */
function rqPdfLook(){
  const r=el('reader');if(!r)return;
  r.classList.toggle('pdffont',!!SET.pdfFont);r.classList.toggle('pdftone',!!SET.pdfTheme);
  if(SET.pdfTheme){
    const cs=r.style,bg=rqRgb(cs.getPropertyValue('--r-bg')),tx=rqRgb(cs.getPropertyValue('--r-txt')),row=function(i){const d=(bg[i]-tx[i])/255;return [d*0.299,d*0.587,d*0.114,0,tx[i]/255].map(function(x){return +x.toFixed(4);}).join(' ');};
    const m=el('rqPdfToneM');if(m)m.setAttribute('values',row(0)+' '+row(1)+' '+row(2)+' 0 0 0 1 0');
  }
  if(el('pdfFontTgl')){rqSw('pdfFontTgl',!!SET.pdfFont);rqSw('pdfThemeTgl',!!SET.pdfTheme);}
  const k=SET.pdfFont?'f'+SET.font+'|'+(SET.weight||400):'file';
  if(rqPdfLook.k!=null&&k!==rqPdfLook.k&&R.mode==='pdf'&&R.pdf)pdfRestyle();
  rqPdfLook.k=k;
}
function pdfRestyle(){
  if(PS.on){PS.cv.forEach(function(cv){cv._w=-1;});psUpdate();return;} /* stale → drawn again in place, the old one freed after */
  P.bw=-1;pdfRender('look');
}
/* Selection inside a PDF text layer (pdf.js 3/4 way): while selecting, .endOfContent covers the layer and sits right after
   the moving end of the selection, so a finger / mouse / handle in a gap between lines resolves next to it instead of
   jumping to the page start or end. Back at the end of the layer when nothing is selected. */
let pdfSelPrev=null;
function pdfSelReset(tl){const e=tl.querySelector(':scope > .endOfContent')||tl.querySelector('.endOfContent');if(e){tl.appendChild(e);}tl.classList.remove('selecting');}
document.addEventListener('selectionchange',function(){
  const s=window.getSelection&&window.getSelection();
  if(!s||!s.rangeCount||s.isCollapsed){document.querySelectorAll('.textLayer.selecting').forEach(pdfSelReset);pdfSelPrev=null;return;}
  const rg=s.getRangeAt(0),prevR=pdfSelPrev;pdfSelPrev=rg.cloneRange();
  const modStart=!!(prevR&&rg.compareBoundaryPoints(Range.END_TO_END,prevR)===0&&rg.compareBoundaryPoints(Range.START_TO_START,prevR)!==0);
  let a=modStart?rg.startContainer:rg.endContainer;if(a&&a.nodeType===3)a=a.parentNode;
  const tl=a&&a.closest&&a.closest('.textLayer');
  document.querySelectorAll('.textLayer.selecting').forEach(function(x){if(x!==tl)pdfSelReset(x);});
  if(!tl||a===tl)return;
  const end=tl.querySelector('.endOfContent');if(!end)return;
  tl.classList.add('selecting');
  if(a.parentNode===tl)tl.insertBefore(end,modStart?a:a.nextSibling);
});
document.addEventListener('mousedown',function(e){const tl=e.target&&e.target.closest&&e.target.closest('.textLayer');if(tl)tl.classList.add('selecting');});
document.addEventListener('mouseup',function(){const s=window.getSelection&&window.getSelection();if(!s||s.isCollapsed)document.querySelectorAll('.textLayer.selecting').forEach(pdfSelReset);});
/** Navigation (tap / swipe / slider / TOC / keys): request a page; it is shown at the swap. */
function pdfGo(np,why){
  if(window.__rqWriter&&!__rqWriter.mayWrite())return;
  if(!R.pdf)return;
  np=Math.max(0,Math.min(R.pageCount-1,np));
  if(PS.on){psGo(np,why);return;} /* 18.10: scroll mode navigates by scrolling */
  if(np===P.target){if(why==='slider')pdfNumbers(np,true);return;}
  const fwd=np>P.target;
  P.tts=why==='tts';
  if(why==='tts'){P.jump=false;} /* 1в: read-aloud auto-advance: no turn, no jump; reported via:'tts' at the swap */
  else if(why==='slider'||why==='nav'){P.jump=true;} /* 1б: jump ≠ page flip (no turn, no fast-flip count); reported once on release */
  else{
    P.jump=false;P.flipDir=fwd?1:-1; /* 16.10: a real turn may be animated at the swap */
    if(__tracker&&__tracker.pageTurned)__tracker.pageTurned(fwd);
    if(fwd){R.turned++;R.lastTurn=Date.now();if(!isMvp()&&!R.timerOn)timerNudge();}
  }
  if(why==='tts'||why==='slider'||why==='nav')P.flipDir=0;
  P.target=np;
  if(why==='slider')pdfNumbers(np,true); /* slider shows the TARGET label while dragging */
  pdfRender(why||'flip');
}
function pdfFlip(d){hideJumpBack();if(PS.on){psStep(d);return;}pdfGo(P.target+d,'flip');}
/** Re-render the shown page at the current zoom when the bitmap would be visibly soft (after pinch / double tap). */
function pdfHiRes(){
  if(!R.pdf||P.target!==P.shown||!P.front)return;
  const dpr=Math.max(1,window.devicePixelRatio||1);
  const pw=P.front.width/P.frontSc; /* page width in pt */
  const ph=P.front.height/P.frontSc;
  let want=(P.bw/pw)*P.z*dpr;
  if(pw*want*ph*want>PDF_MAX_PX)want=Math.sqrt(PDF_MAX_PX/(pw*ph));
  if(Math.abs(want/P.frontSc-1)>0.12)pdfRender('zoom');
}
function pdfZoomAt(z,cx,cy){
  const r=pdfVR(),mx=cx-r.left,my=cy-r.top,zz=P.z*P.k;
  const px=(mx-P.tx)/zz,py=(my-P.ty)/zz;
  P.z=Math.max(1,Math.min(PDF_ZMAX,z));
  P.tx=mx-px*P.z*P.k;P.ty=my-py*P.z*P.k;
  pdfApply();
}
/* --- taps: edges flip at once at width; centre waits ≤250 ms for a double tap; when zoomed every tap waits --- */
function pdfTap(cx,cy){
  const sel=selText();
  pdfLog({ev:'tap',x:Math.round(cx),y:Math.round(cy),sel:sel?sel.slice(0,20):'',z:P.z,dbl:!!P.tapT,t:Math.round(performance.now())});
  if(quoteTapAt(cx,cy))return; /* 22.10: a saved highlight → its bar (no double-tap wait) */
  if(sel)return;
  const now=performance.now();
  if(P.tapT&&now-P.tapAt<=PDF_DBL_MS&&Math.hypot(cx-P.tapX,cy-P.tapY)<60){clearTimeout(P.tapT);P.tapT=null;pdfDoubleTap(cx,cy);return;}
  const r=pdfVR(),x=(cx-r.left)/r.width,y=(cy-r.top)/r.height;
  const zoomed=P.z>1.01;
  if(!zoomed&&(x<0.3||x>0.7||PS.on)){pdfSingleTap(x,y);return;} /* scroll mode: no double-tap zoom → no wait */
  if(P.tapT){clearTimeout(P.tapT);P.tapT=null;}
  P.tapAt=now;P.tapX=cx;P.tapY=cy;
  P.tapT=setTimeout(function(){P.tapT=null;pdfSingleTap(x,y);},PDF_DBL_MS);
}
function pdfSingleTap(x,y){
  if(el('reader').classList.contains('hidden'))return;
  const z=tapZone(x,y);
  const zoomed=P.z>1.01; /* contract 1б: zoomed PDF — no top corners, the centre does not leave focus */
  const inv=flipGet().invert?-1:1;
  if(z==='tl'){if(zoomed)return;toggleDayNight();return;}
  if(z==='tr'){if(zoomed)return;cornerTR();return;}
  if(z==='l'){fsResume();pdfFlip(-inv);}
  else if(z==='r'){fsResume();pdfFlip(inv);}
  else if(!(zoomed&&isFocusOn()))toggleChrome(); /* same as text: one centre tap = bars + leave fullscreen (+ focus) */
}
function pdfDoubleTap(cx,cy){
  if(P.z>1.01){P.z=1;P.k=P.k||1;pdfApply();}   /* back to width */
  else pdfZoomAt(2,cx,cy);                      /* ×2 at the tap point */
  pdfAct('zoom');pdfHiRes();
}
function pdfShowPct(){showPinchHint(Math.round(P.z*P.k*100)+'%');}
/* --- touch: pinch = zoom of the whole sheet around the midpoint; one finger = pan when zoomed, swipe = flip --- */
function pdfTouchStart(e){
  if(PS.on){psTouchStart(e);return;}
  const r=pdfVR();
  if(e.touches.length>=2){
    if(P.tapT){clearTimeout(P.tapT);P.tapT=null;}
    const a=e.touches[0],b=e.touches[1];
    const mx=(a.clientX+b.clientX)/2-r.left,my=(a.clientY+b.clientY)/2-r.top,zz=P.z*P.k;
    P.g={type:'pinch',d0:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)),z0:P.z,px:(mx-P.tx)/zz,py:(my-P.ty)/zz,moved:false};
    return;
  }
  if(P.g&&(P.g.type==='pinch'||P.g.type==='quiet')){pdfLog({ev:'start-blocked',g:P.g.type,n:e.touches.length});return;}
  const t=e.touches[0],G=pdfGeom();
  P.g={type:'one',x0:t.clientX,y0:t.clientY,t0:performance.now(),tx0:P.tx,ty0:P.ty,atL:G.atL,atR:G.atR,pannable:G.pannable,moved:false,
    bright:(t.clientX-r.left<28&&!G.pannable)?{y0:t.clientY,d0:SET.bright==null?1:SET.bright}:null};
}
/* 22.10 (Джессика: «PDF более отзывчивы к выделению текста»): while text is being selected (a long press made a selection, or the finger
   has rested on the page), one finger belongs to the selection — no pan, no swipe flip, no blocked move, so the selection follows the finger */
function pdfSelecting(){const g=window.getSelection&&window.getSelection();if(!g||g.isCollapsed||!g.anchorNode)return false;
  const n=g.anchorNode.nodeType===3?g.anchorNode.parentNode:g.anchorNode;return !!(n&&n.closest&&n.closest('.textLayer'));}
function pdfTouchMove(e){
  if(PS.on){psTouchMove(e);return;}
  const g=P.g;if(!g)return;
  if(g.type==='one'&&e.touches.length===1&&(g.sel||(g.sel=pdfSelecting()||(!g.moved&&!g.bright&&performance.now()-g.t0>450))))return; /* selecting */
  if(e.cancelable)e.preventDefault(); /* the browser must never zoom/scroll the page itself */
  const r=pdfVR();
  if(g.type==='pinch'&&e.touches.length>=2){
    const a=e.touches[0],b=e.touches[1];
    const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    if(!g.moved&&Math.abs(d-g.d0)<10)return;
    g.moved=true;
    const mx=(a.clientX+b.clientX)/2-r.left,my=(a.clientY+b.clientY)/2-r.top;
    P.z=Math.max(1,Math.min(PDF_ZMAX,g.z0*d/g.d0));
    P.tx=mx-g.px*P.z*P.k;P.ty=my-g.py*P.z*P.k;
    pdfApplySoon();pdfShowPct();
    return;
  }
  if(g.type!=='one'||e.touches.length!==1)return;
  const t=e.touches[0],dx=t.clientX-g.x0,dy=t.clientY-g.y0;
  if(!g.moved&&Math.hypot(dx,dy)>10)g.moved=true;
  if(g.bright){SET.bright=Math.round(Math.max(0.3,Math.min(1,g.bright.d0-dy/400))*100)/100;rqLightApply();return;}
  if(g.pannable&&g.moved){P.tx=g.tx0+dx;P.ty=g.ty0+dy;pdfApplySoon();}
}
function pdfLog(o){P.log.push(o);if(P.log.length>40)P.log.shift();} /* gesture decisions (tests / diagnostics) */
function pdfTouchEnd(e){
  if(PS.on){psTouchEnd(e);return;}
  const g=P.g;if(!g){pdfLog({ev:'end-no-g',n:e.touches.length,t:Math.round(performance.now())});return;}
  if(g.type==='pinch'){
    if(e.touches.length<2){
      P.g=e.touches.length?{type:'quiet'}:null;
      hidePinchHint();pinchQuietUntil=Date.now()+450;
      if(P.z<1.04)P.z=1;
      pdfApply();
      if(Math.abs(P.z-g.z0)>0.02){pdfAct('zoom');pdfHiRes();}
    }
    return;
  }
  if(g.type==='quiet'){if(!e.touches.length)P.g=null;return;}
  if(e.touches.length)return;
  P.g=null;
  const ct=e.changedTouches[0],dx=ct.clientX-g.x0,dy=ct.clientY-g.y0;
  if(g.bright&&g.moved){SET.bright=Math.round(SET.bright*20)/20;saveSet();applySet();flashMsg('Яркость '+Math.round(SET.bright*100)+'%',{kind:'info',icon:'sun'});return;}
  if(g.sel||pdfSelecting()){if(g.pannable&&g.moved)pdfApply();return;} /* 22.10: the end of a selection drag is not a swipe / tap */
  const swipeOn=flipGet().swipe!==false;
  const inv=flipGet().invert?-1:1;
  const horiz=Math.abs(dx)>PDF_SWIPE&&Math.abs(dx)>Math.abs(dy)*1.2;
  pdfLog({ev:'end',dx:Math.round(dx),dy:Math.round(dy),horiz:horiz,pan:g.pannable,moved:g.moved,ms:Math.round(performance.now()-g.t0),t:Math.round(performance.now())});
  if(g.pannable&&g.moved){
    pdfApply();
    const s=pdfViewSize();
    const movedX=Math.abs(P.tx-g.tx0)/s.w,moved=Math.max(movedX,Math.abs(P.ty-g.ty0)/s.h);
    /* zoomed: a swipe flips only if the page edge on that side already touched the screen edge */
    if(swipeOn&&horiz&&((dx<0&&g.atR)||(dx>0&&g.atL))&&movedX<0.02){fsResume();pdfFlip((dx<0?1:-1)*inv);return;}
    if(moved>0)pdfAct('pan',{fraction:moved});
    return;
  }
  if(swipeOn&&horiz){fsResume();pdfFlip((dx<0?1:-1)*inv);return;}
  if(Math.abs(dx)<12&&Math.abs(dy)<12&&performance.now()-g.t0<450&&
     !(e.target&&e.target.closest&&e.target.closest('button,a,input,#selpop'))){
    touchTapAt=Date.now();pdfTap(ct.clientX,ct.clientY);
  }else if(!g.moved)pdfLog({ev:'tap-rejected',tgt:e.target&&e.target.tagName,id:e.target&&e.target.id,ms:Math.round(performance.now()-g.t0)});
}
function pdfWheel(e){
  if(PS.on)return; /* the scroller scrolls itself */
  e.preventDefault();
  if(e.ctrlKey){pdfZoomAt(P.z*(e.deltaY<0?1.15:0.87),e.clientX,e.clientY);if(P.z<1.02){P.z=1;pdfApply();}pdfAct('zoom');clearTimeout(P.wheelT);P.wheelT=setTimeout(pdfHiRes,200);return;}
  const G=pdfGeom();
  if(G.pannable){P.tx-=e.deltaX;P.ty-=e.deltaY;pdfApply();return;}
  const now=performance.now();if(now-P.wheelAt<250)return;P.wheelAt=now;
  pdfFlip(e.deltaY>0?1:-1);
}
window.__rqLayoutCount=0; /* test hook: number of full column reflows */
function layoutKey(w,h){return [w,h,SET.font,SET.size,SET.lh,SET.ls,SET.weight,SET.align,SET.hyph,SET.indent,SET.margin].join('|')+(rqScrollMode()?'|s':'');}
/* audit 19.10 RD-TAB-01: on a tablet in portrait (600–859 px) the line stays ≈ 36 em (60–75 characters): the side fields grow; 860+ is two columns */
function rqTextMargin(){const v=el('viewer');if(!v||R.mode==='pdf')return;const W=window.innerWidth,m=SET.margin;
  const mw=(W>=600&&W<860)?Math.max(m,Math.floor((W-SET.size*36)/2)):m;
  if(v._mw!==mw){v._mw=mw;v.style.margin='0 '+mw+'px';el('reader').style.setProperty('--r-margin',mw+'px');}}
function layout(){
  if(R.mode==='pdf'){pdfOnResize();return;}
  rqTextMargin();
  const v=el('viewer'),c=el('content');
  const w=v.clientWidth,h=v.clientHeight,gap=48;
  if(rqScrollMode()){ /* 16.10: one vertical strip; «page» = one screen, the last page = the end of the text */
    c.style.columnWidth='auto';c.style.columnGap='normal';c.style.height='auto';c.style.width=w+'px';c.style.transform='none';
    R.step=h;const max=Math.max(0,v.scrollHeight-h);R.scrollMax=max;
    R.pageCount=max>0?1+Math.ceil(max/h-0.001):1;
    R.layoutKey=layoutKey(w,h)+'|s';window.__rqLayoutCount++;return;
  }
  if(v.scrollTop)v.scrollTop=0; /* back from the scroll mode */
  const cols=w>=860?2:1;
  const cw=(w-gap*(cols-1))/cols;
  c.style.columnWidth=cw+'px';c.style.columnGap=gap+'px';
  c.style.height=h+'px';c.style.width=w+'px';
  R.step=w+gap;
  R.pageCount=Math.max(1,Math.ceil((c.scrollWidth+gap)/R.step));
  R.layoutKey=layoutKey(w,h);
  window.__rqLayoutCount++;
}
/* Reading-position anchor: the first character visible on the current page.
   Survives font-size / viewport changes better than a page ratio. */
function captureAnchor(){
  if(R.mode==='pdf')return null;
  const v=el('viewer'),c=el('content');
  const vr=v.getBoundingClientRect();
  const cr=document.caretRangeFromPoint?function(x,y){return document.caretRangeFromPoint(x,y);}:
    (document.caretPositionFromPoint?function(x,y){const p=document.caretPositionFromPoint(x,y);if(!p)return null;const r=document.createRange();r.setStart(p.offsetNode,p.offset);return r;}:null);
  if(!cr)return null;
  const xs=[4,vr.width*0.33,vr.width*0.66],ys=[4,16,32,56,90];
  for(let j=0;j<ys.length;j++)for(let i=0;i<xs.length;i++){
    const rg=cr(vr.left+xs[i],vr.top+ys[j]);
    if(rg&&rg.startContainer&&rg.startContainer.nodeType===3&&c.contains(rg.startContainer)){
      return {node:rg.startContainer,offset:rg.startOffset};
    }
  }
  return null;
}
function pageOfAnchor(a){
  try{
    if(!a||!a.node||!a.node.isConnected)return -1;
    const c=el('content');const len=a.node.nodeValue.length;
    const rg=document.createRange();
    const o=Math.min(a.offset,Math.max(0,len-1));
    rg.setStart(a.node,o);rg.setEnd(a.node,Math.min(len,o+1));
    const rects=rg.getClientRects();const r=rects.length?rects[0]:rg.getBoundingClientRect();
    if(rqScrollMode()){const y=r.top-c.getBoundingClientRect().top;return Math.max(0,Math.min(R.pageCount-1,Math.floor((y+2)/R.step)));}
    const x=r.left-c.getBoundingClientRect().left;
    return Math.max(0,Math.floor((x+2)/R.step));
  }catch(e){return -1;}
}
/** Re-measure only when geometry/typography really changed; keep the reading position. */
function relayout(opts){
  const o=opts||{};
  if(el('reader').classList.contains('hidden'))return;
  if(window.__rqFindOpen&&!o.force){R.relayDue=true;return;} /* 22.10: the keyboard of the search screen shrinks the viewport — no re-pagination of the whole book under it (black screen); done once on close */
  if(R.mode==='pdf'){pdfOnResize();return;} /* CSS-scale now, one re-render when the size is stable */
  const v=el('viewer');
  if(!o.force&&R.layoutKey===layoutKey(v.clientWidth,v.clientHeight))return; /* nothing changed → no reflow, no jump */
  const anchor=o.anchor||readingAnchor();
  const ratio=R.pageCount>1?R.page/(R.pageCount-1):0;
  layout();
  let p=anchor?pageOfAnchor(anchor):-1;
  if(p<0)p=Math.round(ratio*(R.pageCount-1));
  R.relay=true;try{goPage(p,false);}finally{R.relay=false;} /* 1в: a re-layout keeps the text in view; it never grows «reached» (e.g. after read-aloud) */
  if(rqScrollMode()&&anchor)rqScrollToAnchor(anchor); /* scroll: the anchor's line at the top, not just its screen */
  R.anc=anchor?{a:anchor,page:R.page}:null; /* keep THIS anchor for the next relayout on the same page */
}
/* The reading position survives chains of relayouts (bars ↔ fullscreen ↔ rotation): while the reader
   has not turned the page, every relayout re-uses the anchor captured before the first one, so the
   position never drifts page by page. A real page change (goPage with another page) drops it. */
function readingAnchor(){
  if(R.anc&&R.anc.page===R.page&&R.anc.a&&R.anc.a.node&&R.anc.a.node.isConnected)return R.anc.a;
  return captureAnchor();
}
/** Font size change (Aa / pinch / Ctrl+wheel): exactly one reflow, position kept. */
function setFontSizeKeepPos(size){
  size=Math.max(14,Math.min(30,Math.round(size)));
  if(size===SET.size)return false;
  const anchor=readingAnchor();
  SET.size=size;saveSet();applySet();
  relayout({force:true,anchor:anchor});
  return true;
}
/* Page is saved while reading (not only on close): a frozen phone tab that gets stolen can't write later,
   so the farthest page must already be in NS_v1. Sync, progress-only, monotonic (ratio only grows), writer only.
   Session time is saved the same way by reader-session.js (NS_session_draft). */
function persistPage(posOverride){
  const b=R.book;if(!b||!__rq||!__rq.loadEnvelope||!__rq.saveEnvelope)return;
  if(window.__rqWriter&&!__rqWriter.mayWrite())return;
  const c=S.progress[b.id]||{},cur=c.ratio||0,pos=typeof posOverride==='number'?posOverride:typeof R.pos==='number'?R.pos:rqPos(b.id);
  if(!(R.maxRatio>cur)&&c.pos===pos)return; /* farthest only grows; pos = current settled position (may go back) */
  S.progress[b.id]=Object.assign({},c,{ratio:Math.max(cur,R.maxRatio),pos:pos});
  try{const e=__rq.loadEnvelope();const pr=e.progress.progress||(e.progress.progress={});const o=pr[b.id]||{};
    pr[b.id]=Object.assign({},o,{ratio:Math.max(o.ratio||0,R.maxRatio),pos:pos});__rq.saveEnvelope(e);}catch(err){console.warn('[rq] persistPage',err);}
}
/* pos in the background (Архитектор 15.10, arch.md): hidden / pagehide write the current pos — after a re-layout it only lived in memory.
   While the slider is dragged, the pos saved before the drag is written (R.posPreSlide); a preview page is never written.
   persistPage keeps the gate (writer only), never touches the tracker / maxRatio / events; nothing changed → nothing written. */
function persistPageBg(){
  if(!R||!R.book||el('reader').classList.contains('hidden'))return;
  const sliding=!!(R.sliding||(typeof P!=='undefined'&&P.sliding));
  if(sliding){if(typeof R.posPreSlide==='number')persistPage(R.posPreSlide);return;}
  persistPage();
}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')persistPageBg();});
window.addEventListener('pagehide',persistPageBg);
/* ===== 16.10 reading modes (arch.md «SET.flip.mode и SET.flip.anim») ===== */
window.__rqAnim={n:0,last:null}; /* test hook: page-turn animations started */
/** Put page np on screen: column strip offset, or the scroll position in the scroll mode. `anim` = 'slide'|'fade'|null. */
function rqShowPage(np,anim,prev){
  const c=el('content'),v=el('viewer');
  if(rqScrollMode()){if(!R.fromScroll){const t=Math.min(np*R.step,R.scrollMax||0);v.scrollTop=t;R.progTop=v.scrollTop;}return;}
  rqAnimStop();
  const x=-np*R.step;
  if(anim==='slide'&&prev!=null){rqSlide(-prev*R.step,x);return;}
  const curl=anim==='curl'&&prev!=null&&np!==prev?rqTextPageCopy(prev):null; /* the old page, copied before the strip jumps */
  c.style.transform='translateX('+x+'px)';
  if(curl)rqPeel(v,curl,np>prev?1:-1);
  if(anim==='fade'&&v.animate){__rqAnim.n++;__rqAnim.last='fade';
    try{R.anim=v.animate([{opacity:0.45},{opacity:1}],{duration:180,easing:'ease-out'});}catch(e){}}
}
/* «Сдвиг»: the strip moves on the MAIN thread, frame by frame, with no transition / will-change — the strip is never promoted to one
   giant GPU layer (Android blank-page bug 06.10). Both pages are real text all the way, the last frame is the exact page offset. */
function rqSlide(from,to){
  const c=el('content'),d=Math.min(260,Math.max(160,Math.abs(to-from)*0.6)),t0=performance.now();
  __rqAnim.n++;__rqAnim.last='slide';
  const st={to:to,raf:0};
  const f=function(t){if(R.slide!==st)return;const k=Math.min(1,(t-t0)/d),e=1-Math.pow(1-k,3);
    c.style.transform='translateX('+(k<1?(from+(to-from)*e).toFixed(1):to)+'px)';
    if(k<1)st.raf=requestAnimationFrame(f);else if(R.slide===st)R.slide=null;};
  R.slide=st;c.style.transform='translateX('+from+'px)';st.raf=requestAnimationFrame(f);
}
/** A running animation is finished at once (next turn, relayout, close): the strip lands on its target. */
function rqAnimStop(){
  if(R.slide){cancelAnimationFrame(R.slide.raf);el('content').style.transform='translateX('+R.slide.to+'px)';R.slide=null;}
  if(R.anim){try{R.anim.finish();}catch(e){}R.anim=null;}
  rqCurlStop();
}
/** Scroll mode: one screen minus a line (taps, keys, swipe, ‹ › buttons). Smooth only when animations are allowed. */
function rqScrollStep(d){
  const v=el('viewer'),lh=parseFloat(getComputedStyle(el('content')).lineHeight)||SET.size*SET.lh;
  const top=Math.max(0,Math.min(R.scrollMax||0,v.scrollTop+d*Math.max(R.step*0.5,R.step-lh)));
  R.progTop=null;
  if(rqAnimKind()&&v.scrollTo)v.scrollTo({top:top,behavior:'smooth'});else v.scrollTop=top;
  rqScrollSoon();
}
function rqScrollToAnchor(a){
  try{const v=el('viewer'),c=el('content');const rg=document.createRange();const len=a.node.nodeValue.length,o=Math.min(a.offset,Math.max(0,len-1));
    rg.setStart(a.node,o);rg.setEnd(a.node,Math.min(len,o+1));const r=rg.getClientRects()[0]||rg.getBoundingClientRect();
    v.scrollTop=Math.max(0,Math.min(R.scrollMax||0,r.top-c.getBoundingClientRect().top));R.progTop=v.scrollTop;}catch(e){}
}
/** Screen index of the current scroll position: nearest screen, the end of the text = the last page. */
function rqScrollPage(){const v=el('viewer');if(v.scrollTop>=(R.scrollMax||0)-2)return R.pageCount-1;return Math.max(0,Math.min(R.pageCount-1,Math.round(v.scrollTop/R.step)));}
let rqScrT=0;
function rqScrollSoon(){clearTimeout(rqScrT);rqScrT=setTimeout(rqScrollSettle,180);}
/** The scroll stopped: report it like a page change. Next / previous screen = a turn; farther = a jump (as the slider). Programmatic scrolls are ignored. */
function rqScrollSettle(){
  if(!rqScrollMode()||!R.book||el('reader').classList.contains('hidden')||R.sliding)return;
  const v=el('viewer');
  if(R.progTop!=null&&Math.abs(v.scrollTop-R.progTop)<2)return;
  R.progTop=null;
  const np=rqScrollPage(),d=np-R.page;if(!d)return;
  R.fromScroll=true;
  try{if(Math.abs(d)===1)goPage(np,true);else{R.jumping=true;try{goPage(np,false);}finally{R.jumping=false;}}}
  finally{R.fromScroll=false;}
}
el('viewer').addEventListener('scroll',function(){if(rqScrollMode()){rqScrollSoon();if(__tracker&&__tracker.userActive)__tracker.userActive('scroll');}},{passive:true}); /* 25.10: scrolling = a sign of life */
function goPage(p,turn){
  if(window.__rqWriter&&!__rqWriter.mayWrite())return; /* passive: page stays put under the overlay */
  if(R.mode==='pdf'){ /* PDF: the page is shown (and counted) at the swap; ±1 turns chain from the pending target */
    if(turn&&Math.abs(p-R.page)===1)pdfFlip(p-R.page);else pdfGo(p,turn?'flip':'nav');
    return;
  }
  const prev=R.page;
  const np=Math.max(0,Math.min(R.pageCount-1,p));
  /* scroll mode: a tap / key / swipe / button turn scrolls one screen minus a line; the tracker hears about it when the scroll stops */
  if(rqScrollMode()&&turn&&!R.fromScroll&&!R.sliding&&Math.abs(np-prev)===1){rqScrollStep(np-prev);return;}
  const forwardTurn=!!(turn&&np>prev);
  if(forwardTurn){
    R.turned++;
    /* counted minutes / pages: reader-session tracker (per-page cap, visible time only) */
    if(!isMvp()&&!R.timerOn)timerNudge();
    R.lastTurn=Date.now();
  }
  if(turn&&np!==prev)hideJumpBack(); /* 1б-fix #1: first normal flip hides «< на стр. N» */
  if(np!==prev)R.anc=null;
  R.page=np;
  const ak=(turn&&!R.sliding&&!R.relay&&!R.jumping&&Math.abs(np-prev)===1&&!rqScrollMode())?rqAnimKind():null;
  rqShowPage(np,ak,prev);
  const ratio=R.pageCount>1?np/(R.pageCount-1):1;
  if(!R.sliding){if(!R.ttsAdv&&!R.relay)R.maxRatio=Math.max(R.maxRatio,ratio);R.pos=ratio;} /* 1б-144: slider preview is not «reached»; 1в: nor is a read-aloud page */
  /* page number + book progress: same task as the transform → same frame as the new text */
  el('rPage').textContent=(np+1)+' / '+R.pageCount;
  el('pgNum').textContent=(np+1)+' / '+R.pageCount; /* always-visible number, same frame */
  el('rPct').textContent=Math.round(ratio*100)+'%';
  const sl=el('pgSlider');sl.max=Math.max(0,R.pageCount-1);sl.value=np;pgArtSync();
  /* Architect: reader writes pageVisibleMs on page change */
  /* the reading mode only REPORTS events; reader-session.js does all the accounting */
  if(__tracker&&(np!==prev||forwardTurn)){
    if(R.relay){if(np!==prev&&__tracker.relaid)__tracker.relaid(np);} /* re-pagination of the SAME text: not a page change (no event, cap kept) */
    else if(R.jumping){if(np!==prev)__tracker.jumped(np);}       /* 1б: TOC / bookmark / search / slider release */
    else if(!R.sliding){if(forwardTurn)__tracker.pageTurned(true);__tracker.pageShown(np,R.ttsAdv?'tts':undefined);}
  }
  if(np!==prev)updDayBar();
  if(!R.sliding&&!R.relay)persistPage(); /* monotonic no-op unless maxRatio grew; also covers release on the previewed page.
     Not on a re-pagination (R.relay): same text, only the layout fraction differs → R.pos stays in memory until the next real move / close */
}
el('pgSlider').oninput=e=>{const v=parseInt(e.target.value,10)||0;if(R.slideFrom==null){R.slideFrom=R.mode==='pdf'?P.shown:R.page;R.posPreSlide=typeof R.pos==='number'?R.pos:rqPos(R.book.id);}if(R.mode==='pdf'){P.sliding=true;pdfGo(v,'slider');}else{R.sliding=true;goPage(v,false);}};
el('pgSlider').onchange=e=>{
  const v=parseInt(e.target.value,10)||0;
  if(R.mode==='pdf'){P.sliding=false;pdfGo(v,'slider');if(P.target===P.shown){pdfNumbers(P.shown);pdfReach(P.shown);if(P.jump){P.jump=false;if(__tracker&&__tracker.jumped)__tracker.jumped(P.shown);}}}
  else{R.sliding=false;jumpTo(v);}
  const from=R.slideFrom;R.slideFrom=null;R.posPreSlide=null;
  if(from!=null&&from>=0&&from!==v)showJumpBack(from);
};
/* «Карандашный»: hand-drawn page slider. LOOK ONLY — the <input> under it keeps every behaviour (thumb-only drag,
   44 px hit, via:'jump'); #pgArt is pointer-events:none. Track = the header's wobbly line (same points), 2px --rq-slider-track;
   fill = the SAME path in --rq-accent clipped to the value; knob 18px --rq-page-bg with an uneven 2px --rq-accent outline.
   Colours are CSS vars → night tokens apply by themselves. Other themes: #pgArt hidden, plain slider. */
const PG_WOB=[2.5,2.1,3.4,1.9,3.1,2.7,1.9,3.0,1.8,2.8,1.9,1.9,2.8,3.8,2.0,2.3,3.3,4.2,3.2,2.7,4.2,1.8,3.9,2.5,2.1,2.0,2.5,3.8,2.2,3.2,3.4,2.7,3.1,1.9]; /* = .rhead::after polyline y (viewBox 0..400 × 0..6) */
const PG_KNOB=[8.3,7.7,8.4,7.9,8.2,7.6,8.1,8.3,7.8,8.2,7.7,8.4]; /* uneven radius → 18 px knob, hand-drawn outline */
function pgArtSync(){
  const a=el('pgArt'),sl=el('pgSlider');if(!a||!sl)return;
  if(!(typeof isPencil==='function'&&isPencil())||!sl.offsetWidth){if(a.childNodes.length)a.textContent='';a._w=0;return;}
  const W=sl.offsetWidth,H=sl.offsetHeight||44,cy=H/2,x0=PG_TH/2,x1=W-PG_TH/2;
  a.style.left=sl.offsetLeft+'px';a.style.top=sl.offsetTop+'px';a.setAttribute('width',W);a.setAttribute('height',H);a.setAttribute('viewBox','0 0 '+W+' '+H);
  if(a._w!==W){a._w=W;
    const n=PG_WOB.length-1,d='M'+PG_WOB.map(function(y,i){return (x0+(x1-x0)*i/n).toFixed(1)+','+(cy+(y-3)*0.9).toFixed(2);}).join(' L');
    /* smooth closed pencil loop: quadratic curves through the midpoints of the uneven-radius points, + a short overshoot */
    const N=PG_KNOB.length,P=[];for(let i=0;i<=N+1;i++){const t=i/N*Math.PI*2-1.2,r=PG_KNOB[i%N]+(i>N?0.6:0);P.push([r*Math.cos(t),r*Math.sin(t)]);}
    const M=(p,q)=>((p[0]+q[0])/2).toFixed(2)+','+((p[1]+q[1])/2).toFixed(2);
    let k='M'+M(P[0],P[1]);for(let i=1;i<=N;i++)k+=' Q'+P[i][0].toFixed(2)+','+P[i][1].toFixed(2)+' '+M(P[i],P[i+1]);
    a.innerHTML='<defs><clipPath id="pgArtClip"><rect id="pgArtFillR" x="0" y="0" width="0" height="'+H+'"/></clipPath></defs>'+
      '<path class="pga-track" d="'+d+'" fill="none" style="stroke:var(--rq-slider-track)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'+
      '<path class="pga-fill" d="'+d+'" fill="none" clip-path="url(#pgArtClip)" style="stroke:var(--rq-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'+
      '<g class="pga-knob"><path d="'+k+'" style="fill:var(--rq-page-bg);stroke:var(--rq-accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></g>';}
  const mn=+sl.min||0,mx=+sl.max||0,f=mx>mn?(+sl.value-mn)/(mx-mn):0,cx=x0+f*(x1-x0);
  a.querySelector('#pgArtFillR').setAttribute('width',cx.toFixed(1));a.querySelector('.pga-knob').setAttribute('transform','translate('+cx.toFixed(1)+' '+cy+')');
}
el('pgSlider').addEventListener('input',pgArtSync);
if(window.ResizeObserver)new ResizeObserver(function(){const a=el('pgArt');if(a)a._w=0;pgArtSync();}).observe(el('pgSlider')); /* footer shown / rotated / resized */
else addEventListener('resize',function(){const a=el('pgArt');if(a)a._w=0;pgArtSync();});
/* 1б-144: thumb-only drag. Hit = 44 px around the 20 px thumb, cut off above the bottom gesture strip; a press elsewhere
   on the footer / track does nothing. While held: tooltip «стр. N» (printed label) above the thumb. Release → the usual onchange. */
const PG_TH=20,PG_HIT=44;
function pgThumbGeom(){const sl=el('pgSlider'),r=sl.getBoundingClientRect(),mn=+sl.min||0,mx=+sl.max||0,f=mx>mn?(+sl.value-mn)/(mx-mn):0;
  return {r:r,mn:mn,mx:mx,cx:r.left+PG_TH/2+f*(r.width-PG_TH),cy:r.top+r.height/2};}
function pgSafeBottom(){const s=el('pgSafe');return s?s.getBoundingClientRect().height:0;}
function pgHit(x,y){const g=pgThumbGeom();if(!(g.r.width>0))return null;const yMax=Math.min(g.cy+PG_HIT/2,window.innerHeight-pgSafeBottom());
  return (Math.abs(x-g.cx)<=PG_HIT/2&&y>=g.cy-PG_HIT/2&&y<=yMax)?g:null;}
function pgValAt(x,g){const w=Math.max(1,g.r.width-PG_TH);const f=Math.max(0,Math.min(1,(x-g.r.left-PG_TH/2)/w));return Math.round(g.mn+f*(g.mx-g.mn));}
function pgTipShow(){const g=pgThumbGeom(),t=el('pgTip'),v=+el('pgSlider').value,pg='стр. '+(R.mode==='pdf'?pdfLabel(v):(v+1));
  /* 20.10 (Джессика, как в ReadEra): over the thumb also the name of the chapter at this place (js/book-find.js) */
  const ch=typeof bfChapterAt==='function'?bfChapterAt(v):null;
  if(ch){if(t._ch!==ch.t||t._pg!==pg){t._ch=ch.t;t._pg=pg;t.innerHTML='<span class="pgch">'+esc(ch.t)+'</span><span class="pgpn">'+pg+'</span>';}t.classList.add('withch');}
  else{t._ch=null;t._pg=null;t.textContent=pg;t.classList.remove('withch');}
  t.classList.remove('hidden');const hw=t.offsetWidth/2,m=8;
  t.style.left=Math.max(m+hw,Math.min(innerWidth-m-hw,g.cx))+'px';t.style.top=(g.cy-PG_TH/2-8)+'px';}
const PG={id:null,off:0,g:null};
(function(){const ft=el('pgSlider').closest('footer');if(!ft)return;
  ft.addEventListener('pointerdown',function(e){if(PG.id!=null)return;const g=pgHit(e.clientX,e.clientY);if(!g)return;
    e.preventDefault();e.stopPropagation();PG.id=e.pointerId;PG.g=g;PG.off=e.clientX-g.cx;armChromeHide();try{ft.setPointerCapture(e.pointerId);}catch(_){}pgTipShow();},true);
  ft.addEventListener('pointermove',function(e){if(e.pointerId!==PG.id)return;e.preventDefault();const sl=el('pgSlider'),v=pgValAt(e.clientX-PG.off,PG.g);
    if(v!==+sl.value){sl.value=v;sl.dispatchEvent(new Event('input',{bubbles:true}));}pgTipShow();},true);
  const up=function(e){if(e.pointerId!==PG.id)return;PG.id=null;el('pgTip').classList.add('hidden');try{ft.releasePointerCapture(e.pointerId);}catch(_){}
    if(R.slideFrom!=null)el('pgSlider').dispatchEvent(new Event('change',{bubbles:true}));armChromeHide(); /* 3.2 s of bars after letting go */};
  ft.addEventListener('pointerup',up,true);ft.addEventListener('pointercancel',up,true);})();
/* 1б-fix #1: return plaque. The old page lives ONLY in R (memory of the open book): never in S, backup or export;
   openBook resets R → gone on close. Hidden after the first normal flip or a tap on it (the return is a jump too). */
function showJumpBack(from){
  R.jumpFrom=from;
  el('jumpBackN').textContent='на стр. '+(R.mode==='pdf'?pdfLabel(from):(from+1));
  el('jumpBack').setAttribute('aria-label','Вернуться на страницу '+el('jumpBackN').textContent.slice(7));
  el('jumpBack').classList.remove('hidden');el('jumpMark').classList.remove('hidden');placeJumpBack();
}
function hideJumpBack(){if(R)R.jumpFrom=null;const b=el('jumpBack');if(b&&!b.classList.contains('hidden')){b.classList.add('hidden');el('jumpMark').classList.add('hidden');}}
function placeJumpBack(){
  if(!R||R.jumpFrom==null)return;
  const pl=el('pgLine').getBoundingClientRect(),b=el('jumpBack'),rd=el('reader'),bot=document.querySelector('#reader .rbot');
  b.style.left=(pl.left+parseFloat(getComputedStyle(el('pgLine')).paddingLeft||0)-6)+'px';
  /* 16.10: the bottom bars overlay the page-number line → while they are shown the pill sits above them */
  b.style.bottom=(rd&&bot&&!rd.classList.contains('barsoff')?bot.offsetHeight:Math.max(0,innerHeight-pl.top))+'px';
  const s=el('pgSlider').getBoundingClientRect(),mx=Math.max(1,+el('pgSlider').max||1),th=16,m=el('jumpMark');
  m.style.left=(s.left+th/2+(s.width-th)*(R.jumpFrom/mx)-1)+'px';m.style.top=(s.top+s.height/2-6)+'px';
}
el('jumpBack').onclick=function(e){e.stopPropagation();const f=R.jumpFrom;hideJumpBack();if(f!=null)jumpTo(f);};
window.addEventListener('resize',function(){placeJumpBack();});
/** 1б: jump (slider release, TOC, bookmark, search) — not a page flip. */
function jumpTo(p){
  if(R.mode==='pdf'){pdfGo(p,'nav');return;}
  R.jumping=true;try{goPage(p,false);}finally{R.jumping=false;}
  if(__tracker&&__tracker.isRunning&&__tracker.isRunning()&&__tracker.snapshot().page!==R.page)__tracker.jumped(R.page); /* slider: page already moved while dragging */
}
let touchTapAt=0;
el('viewer').addEventListener('click',e=>{
  if(e.target&&e.target.closest&&e.target.closest('#selpop'))return; /* a tap on the selection bar (a colour on the right / left; keyboard Enter = click at 0,0) is not a page turn */
  if(suppressClick){suppressClick=false;return;}
  if(Date.now()<pinchQuietUntil)return; /* trailing click right after a two-finger gesture */
  if(Date.now()-touchTapAt<800)return;   /* already handled as a touch tap (see touchend) */
  if(R.mode==='pdf'){pdfTap(e.clientX,e.clientY);return;}
  viewerTap(e.clientX,e.clientY);
});
/* Tap zones. Touch taps are handled directly on touchend (Chrome may swallow the synthetic
   click right after a swipe), mouse/keyboard clicks via 'click'. */
function viewerTap(cx,cy){
  if(quoteTapAt(cx,cy))return; /* 22.10: a tap on a saved highlight opens its bar; with the bar open the tap only closes it */
  if(selText())return; // идёт выделение текста — не листаем
  const r=el('viewer').getBoundingClientRect();
  const x=(cx-r.left)/r.width;
  const y=(cy-r.top)/r.height;
  const z=tapZone(x,y);
  const inv=flipGet().invert?-1:1;
  if(z==='tl'){toggleDayNight();return;}   // угол: день/ночь (как в ReadEra); фокус не трогает
  if(z==='tr'){cornerTR();return;}      // угол: закладка; фокус не трогает
  if(z==='l'){fsResume();goPage(R.page-1*inv,true);}
  else if(z==='r'){fsResume();goPage(R.page+1*inv,true);}
  else toggleChrome(); // centre: ONE tap shows our bars AND leaves fullscreen (and focus); next centre tap hides both
}
/** 1б tap zones (reader-focus-zones): top 12 % — corners 30 % (tl day/night, tr bookmark); below 30 / 40 / 30.
 *  SET.flip.tap === false → the whole screen is the centre (no corners, no flips by tap). */
function tapZone(x,y){
  if(flipGet().tap===false)return 'c';
  if(y<0.12&&x<0.3)return 'tl';
  if(y<0.12&&x>0.7)return 'tr';
  if(y>=0.12&&x<0.3)return 'l';
  if(y>=0.12&&x>0.7)return 'r';
  return 'c';
}
/* 1в-black: Android may drop canvas bitmaps while the app is in the background → a black page on return.
   On return re-render the SAME page (n===P.shown → isNew=false in pdfSwap): no pdfReach, no tracker page call,
   nothing is written to pos/ratio. The counted clock is HELD (__tracker.holdResume) until the page is on screen
   (pdfSwap → pdfResumeDone) so no minute is counted on a blank canvas. visibilitychange + pageshow(persisted)
   may both fire → one resume render only (P.resuming). */
function pdfResumeDone(){
  if(!P.resuming)return;
  P.resuming=false;clearTimeout(P.resumeT);P.resumeT=0;
  if(__tracker&&__tracker.releaseResume)__tracker.releaseResume();
}
function pdfCtxLost(cv){try{const c=cv.getContext('2d',{alpha:false});return !!((c.isContextLost&&c.isContextLost())||(window.__rqLoseCanvas&&window.__rqLoseCanvas(cv)));}catch(e){return false;}}
const PDF_PTS=[[.5,.5],[.2,.2],[.8,.2],[.2,.8],[.8,.8],[.03,.03],[.97,.97]];
function pdfSample(cv,cheap){
  const c=cv.getContext('2d',{alpha:false}),w=cv.width,h=cv.height,out=[];
  const pts=cheap?[PDF_PTS[0],PDF_PTS[1],PDF_PTS[4]]:PDF_PTS;
  for(let i=0;i<pts.length;i++){const d=c.getImageData(Math.floor(pts[i][0]*(w-1)),Math.floor(pts[i][1]*(h-1)),1,1).data;out.push([d[0],d[1],d[2],d[3]]);}
  return out;
}
/** remember what the page really looks like right after a good render (dark / blank pages included) */
function pdfRemember(cv){setTimeout(function(){if(P.front!==cv||!cv.width)return;try{P.ref=pdfSample(cv);P.refCv=cv;}catch(e){P.ref=null;}},0);}
/** bitmap gone: context lost, 0-size, all sampled pixels alpha 0, or all pure black while the same page sampled right
    after its render was NOT all black. Blank white and genuinely dark pages are normal (night/dim are CSS layers, not pixels). */
function pdfCanvasBad(cv,cheap){
  if(!cv||!cv.width||!cv.height)return true;
  if(pdfCtxLost(cv))return true;
  try{
    const px=pdfSample(cv,cheap);
    if(px.every(function(d){return d[3]===0;}))return true;
    const black=px.every(function(d){return d[0]===0&&d[1]===0&&d[2]===0;});
    if(!black)return false;
    const ref=(P.refCv===cv||(cv===P.front&&P.ref))?P.ref:null;
    return !!(ref&&!ref.every(function(d){return d[0]===0&&d[1]===0&&d[2]===0;}));
  }catch(e){return false;}
}
/** safety net (Интерфейс): a lost/empty bitmap never shows black — page colour (var(--r-bg)) + quiet spinner, then the page is redrawn */
function pdfLost(src){
  if(!R.pdf||R.mode!=='pdf'||P.shown<0)return;
  P.lost=(P.lost||0)+1;pdfLog({ev:'canvas-lost',src:src,page:P.shown});
  el('pdfStage').style.visibility='hidden';pdfBackdrop('');
  pdfHold(); /* no minute is counted while the page is not on screen */
}
/** hold the counted clock until the page is on screen again (pdfSwap → pdfResumeDone). The 8 s safety releases it
    ONLY with the placeholder showing (never over a black bitmap). Holding writes nothing. */
function pdfHold(){
  if(P.resuming)return false;
  P.resuming=true;P.resumes=(P.resumes||0)+1;
  if(__tracker&&__tracker.holdResume)__tracker.holdResume();
  clearTimeout(P.resumeT);P.resumeT=setTimeout(function(){
    if(pdfCanvasBad(P.front)){el('pdfStage').style.visibility='hidden';pdfBackdrop('');P.lostGiveUp=(P.lostGiveUp||0)+1;}
    pdfResumeDone();
  },8000);
  return true;
}
/** cheap check on every way back (focus / resume / periodic): redraw only if the bitmap is really gone */
function pdfCheck(src){
  if(PS.on){psCheck();return;}
  if(document.visibilityState==='hidden'||!R.pdf||R.mode!=='pdf'||P.shown<0||P.sliding||P.resuming||P.task)return;
  if(pdfCanvasBad(P.front,src==='watch')){pdfLost(src);pdfResume('check-'+src);}
}
function pdfResume(src){
  if(PS.on){psCheck();return;}
  if(document.visibilityState==='hidden'||!R.pdf||R.mode!=='pdf'||P.shown<0||P.sliding)return;
  if(P.resuming&&!/^(restored|check)/.test(src)){P.resumeDup=(P.resumeDup||0)+1;return;} /* second event of the same return */
  pdfHold();
  if(pdfCanvasBad(P.front))pdfLost(src); /* black/empty already → page colour + spinner instead of black until the swap */
  pdfRender(/^(restored|check)/.test(src)?src:'resume');
}
document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='hidden'){pdfResumeDone();return;}
  pdfResume('vis');
});
window.addEventListener('pageshow',function(e){if(e.persisted)pdfResume('pageshow');else pdfCheck('pageshow');});
document.addEventListener('resume',function(){pdfCheck('resume');}); /* Page Lifecycle: frozen → resumed without a visibility change */
window.addEventListener('focus',function(){pdfCheck('focus');}); /* unlock: focus comes back */
window.addEventListener('resize',function(){setTimeout(function(){pdfCheck('resize');},300);});
