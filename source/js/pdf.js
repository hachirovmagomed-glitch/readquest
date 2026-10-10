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
  sliding:false,rsRaf:0,rsAt:0,lastSz:'',stableN:0,redo:false,lastVS:null,lastVR:null,stall:null,reqWhy:'',tapT:null,tapAt:0,tapX:0,tapY:0,g:null,applyRaf:0,swaps:0,renders:0,cancels:0,wheelAt:0,log:[]};
window.__rqPdf=P; /* diagnostics for tests (read-only) */
function pdfLabel(n){const l=P.labels&&P.labels[n];return (l!=null&&String(l).trim()!=='')?String(l):String(n+1);}
function pdfViewSize(){const v=el('viewer'),s={w:v.clientWidth,h:v.clientHeight};if(s.w>8&&s.h>8)P.lastVS=s;return s;}
/* gestures: during a transient 0/1-px viewport (fullscreen / resize in progress) use the last real size */
function pdfVR(){const r=el('viewer').getBoundingClientRect();if(r.width>8&&r.height>8){P.lastVR=r;return r;}return P.lastVR||r;}
function pdfAct(kind,info){if(__tracker&&__tracker.userActive)__tracker.userActive(kind,info||{});}
async function openPdf(b){
  try{
    await loadPdfJs();
    const buf=await idbGet('pdf:'+b.id);
    if(!buf)throw new Error('файл не найден на этом устройстве');
    pdfReset();
    const doc=await window.pdfjsLib.getDocument({data:buf}).promise;
    if(R.book!==b){try{doc.destroy();}catch(e){}return;} /* closed while loading */
    R.pdf=doc;R.pageCount=doc.numPages;
    try{const L=await doc.getPageLabels();P.labels=(Array.isArray(L)&&L.length===R.pageCount)?L:null;}catch(e){P.labels=null;}
    const p=Math.max(0,Math.min(R.pageCount-1,Math.round((((S.progress[b.id]||{}).ratio)||0)*(R.pageCount-1))));
    R.page=p;P.target=p;
    if(__tracker)__tracker.begin(b.id, p, trackerOpts());
    pdfNumbers(p);
    pdfRender('open');pdfWatch();
  }catch(e2){alert('Не удалось открыть PDF: '+e2.message);show('library');}
}
function pdfCancel(){if(P.task){try{P.task.cancel();P.cancels++;}catch(e){}P.task=null;}}
function pdfReset(){
  P.seq++;pdfCancel();
  const sh=el('pdfSheet');
  sh.querySelectorAll('canvas').forEach(c=>{c.remove();c.width=0;c.height=0;});
  el('pdfText').textContent='';
  P.front=null;P.frontSc=0;P.shown=-1;P.target=0;P.z=1;P.k=1;P.tx=0;P.ty=0;P.baseW=0;P.baseH=0;P.bw=0;P.labels=null;P.g=null;P.sliding=false;P.redo=false;P.stall=null;
  clearTimeout(P.tapT);P.tapT=null;clearInterval(P.watch);P.watch=0;P.retry=0;
  const st=el('pdfStage');st.style.transform='';st.style.visibility='hidden';
}
function pdfClose(){pdfReset();if(R.pdf){try{R.pdf.destroy();}catch(e){}}R.pdf=null;}
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
  const task=page.render({canvasContext:ctx,viewport:vp});P.task=task;P.renders++;
  try{await task.promise;}catch(e){if(P.task===task)P.task=null;cv.width=0;cv.height=0;pdfRenderFailed(seq,e);return;} /* cancelled: only the back buffer is dropped */
  if(P.task===task)P.task=null;
  if(seq!==P.seq){cv.width=0;cv.height=0;return;}
  const baseW=sz.w,baseH=vp1.height*s0;
  let tl=null;
  if(!same||Math.abs(baseW-P.bw)>0.5)tl=await pdfTextLayer(page,s0);
  if(seq!==P.seq){cv.width=0;cv.height=0;return;}
  requestAnimationFrame(function(){
    if(seq!==P.seq){cv.width=0;cv.height=0;return;}
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
  if(old&&old!==cv){old.remove();old.width=0;old.height=0;}
  P.front=cv;P.frontSc=sc;P.swaps++;P.retry=0;
  if(tl){const t=el('pdfText');t.textContent='';t.appendChild(tl);}
  el('pdfText').style.width=baseW+'px';el('pdfText').style.height=baseH+'px';
  if(isNew){P.z=1;P.tx=0;P.ty=0;}
  P.bw=baseW;P.baseW=baseW;P.baseH=baseH;P.k=1;
  pdfApply();
  el('pdfStage').style.visibility='';
  if(isNew){
    P.shown=n;R.page=n;
    const ratio=R.pageCount>1?n/(R.pageCount-1):1;
    R.maxRatio=Math.max(R.maxRatio,ratio);
    pdfNumbers(P.sliding?P.target:n);
    if(P.jump){if(!P.sliding){P.jump=false;if(__tracker&&__tracker.jumped)__tracker.jumped(n);}} /* mid-drag pages are not written */
    else if(__tracker&&__tracker.pageShown)__tracker.pageShown(n); /* the page is on screen now */
    updDayBar();persistPage();
  }
  if(P.stall)pdfStallLog(n);
}
/** Corner number + bar number + slider: printed label / total (same frame as the swap). */
function pdfNumbers(n,fromSlider){
  const t=pdfLabel(n)+' / '+R.pageCount;
  if(el('rPage').textContent!==t)el('rPage').textContent=t;
  if(el('pgNum').textContent!==t)el('pgNum').textContent=t;
  const ratio=R.pageCount>1?n/(R.pageCount-1):1;
  el('rPct').textContent=Math.round(ratio*100)+'%';
  const sl=el('pgSlider');sl.max=Math.max(0,R.pageCount-1);if(!fromSlider)sl.value=n;
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
async function pdfTextLayer(page,s0){
  const frag=document.createDocumentFragment();
  try{
    const tc=await page.getTextContent();
    const vp=page.getViewport({scale:s0});
    const U=window.pdfjsLib.Util;
    if(!pdfMeasure)pdfMeasure=document.createElement('canvas').getContext('2d');
    tc.items.forEach(function(it){
      if(!it.str)return;
      const tx=U.transform(vp.transform,it.transform);
      const fh=Math.hypot(tx[2],tx[3])||12;
      const ang=Math.atan2(tx[1],tx[0]);
      const st=tc.styles&&tc.styles[it.fontName];
      const fam=(st&&st.fontFamily)||'sans-serif';
      const sp=document.createElement('span');
      sp.textContent=it.str;
      sp.style.left=tx[4].toFixed(2)+'px';sp.style.top=(tx[5]-fh).toFixed(2)+'px';
      sp.style.fontSize=fh.toFixed(2)+'px';sp.style.fontFamily=fam;
      let tr=Math.abs(ang)>0.01?'rotate('+ang.toFixed(4)+'rad) ':'';
      if(it.str.trim()&&it.width>0){pdfMeasure.font=fh.toFixed(2)+'px '+fam;const mw=pdfMeasure.measureText(it.str).width;if(mw>0)tr+='scaleX('+(it.width*s0/mw).toFixed(4)+')';}
      if(tr)sp.style.transform=tr;
      frag.appendChild(sp);
    });
  }catch(e){/* scans have no text layer */}
  return frag;
}
/** Navigation (tap / swipe / slider / TOC / keys): request a page; it is shown at the swap. */
function pdfGo(np,why){
  if(window.__rqWriter&&!__rqWriter.mayWrite())return;
  if(!R.pdf)return;
  np=Math.max(0,Math.min(R.pageCount-1,np));
  if(np===P.target){if(why==='slider')pdfNumbers(np,true);return;}
  const fwd=np>P.target;
  if(why==='slider'||why==='nav'){P.jump=true;} /* 1б: jump ≠ page flip (no turn, no fast-flip count); reported once on release */
  else{
    P.jump=false;
    if(__tracker&&__tracker.pageTurned)__tracker.pageTurned(fwd);
    if(fwd){R.turned++;R.lastTurn=Date.now();if(!isMvp()&&!R.timerOn)timerNudge();}
  }
  P.target=np;
  if(why==='slider')pdfNumbers(np,true); /* slider shows the TARGET label while dragging */
  pdfRender(why||'flip');
}
function pdfFlip(d){pdfGo(P.target+d,'flip');}
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
  if(sel)return;
  const now=performance.now();
  if(P.tapT&&now-P.tapAt<=PDF_DBL_MS&&Math.hypot(cx-P.tapX,cy-P.tapY)<60){clearTimeout(P.tapT);P.tapT=null;pdfDoubleTap(cx,cy);return;}
  const r=pdfVR(),x=(cx-r.left)/r.width,y=(cy-r.top)/r.height;
  const zoomed=P.z>1.01;
  if(!zoomed&&(x<0.3||x>0.7)){pdfSingleTap(x,y);return;}
  if(P.tapT){clearTimeout(P.tapT);P.tapT=null;}
  P.tapAt=now;P.tapX=cx;P.tapY=cy;
  P.tapT=setTimeout(function(){P.tapT=null;pdfSingleTap(x,y);},PDF_DBL_MS);
}
function pdfSingleTap(x,y){
  if(el('reader').classList.contains('hidden'))return;
  if(y<0.12&&x<0.3){toggleDayNight();return;}
  if(y<0.12&&x>0.7){addBookmark();return;}
  const tapOn=!SET.nav||SET.nav.tap!==false;
  const inv=(SET.nav&&SET.nav.invert)?-1:1;
  if(tapOn&&x<0.3){fsResume();pdfFlip(-inv);}
  else if(tapOn&&x>0.7){fsResume();pdfFlip(inv);}
  else toggleChrome(); /* same as text: one centre tap = bars + leave fullscreen */
}
function pdfDoubleTap(cx,cy){
  if(P.z>1.01){P.z=1;P.k=P.k||1;pdfApply();}   /* back to width */
  else pdfZoomAt(2,cx,cy);                      /* ×2 at the tap point */
  pdfAct('zoom');pdfHiRes();
}
function pdfShowPct(){showPinchHint(Math.round(P.z*P.k*100)+'%');}
/* --- touch: pinch = zoom of the whole sheet around the midpoint; one finger = pan when zoomed, swipe = flip --- */
function pdfTouchStart(e){
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
    bright:(t.clientX-r.left<28&&!G.pannable)?{y0:t.clientY,d0:SET.dim||0}:null};
}
function pdfTouchMove(e){
  const g=P.g;if(!g)return;
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
  if(g.bright){SET.dim=Math.max(0,Math.min(0.7,g.bright.d0+dy/400));el('dimmer').style.opacity=SET.dim;return;}
  if(g.pannable&&g.moved){P.tx=g.tx0+dx;P.ty=g.ty0+dy;pdfApplySoon();}
}
function pdfLog(o){P.log.push(o);if(P.log.length>40)P.log.shift();} /* gesture decisions (tests / diagnostics) */
function pdfTouchEnd(e){
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
  if(g.bright&&g.moved){saveSet();flashMsg('Яркость '+Math.round((1-SET.dim)*100)+'%',{kind:'info',icon:'sun'});return;}
  const swipeOn=!SET.nav||SET.nav.swipe!==false;
  const inv=(SET.nav&&SET.nav.invert)?-1:1;
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
  e.preventDefault();
  if(e.ctrlKey){pdfZoomAt(P.z*(e.deltaY<0?1.15:0.87),e.clientX,e.clientY);if(P.z<1.02){P.z=1;pdfApply();}pdfAct('zoom');clearTimeout(P.wheelT);P.wheelT=setTimeout(pdfHiRes,200);return;}
  const G=pdfGeom();
  if(G.pannable){P.tx-=e.deltaX;P.ty-=e.deltaY;pdfApply();return;}
  const now=performance.now();if(now-P.wheelAt<250)return;P.wheelAt=now;
  pdfFlip(e.deltaY>0?1:-1);
}
window.__rqLayoutCount=0; /* test hook: number of full column reflows */
function layoutKey(w,h){return [w,h,SET.font,SET.size,SET.lh,SET.ls,SET.weight,SET.align,SET.hyph,SET.indent,SET.margin].join('|');}
function layout(){
  if(R.mode==='pdf'){pdfOnResize();return;}
  const v=el('viewer'),c=el('content');
  const w=v.clientWidth,h=v.clientHeight,gap=48;
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
    const x=r.left-c.getBoundingClientRect().left;
    return Math.max(0,Math.floor((x+2)/R.step));
  }catch(e){return -1;}
}
/** Re-measure only when geometry/typography really changed; keep the reading position. */
function relayout(opts){
  const o=opts||{};
  if(el('reader').classList.contains('hidden'))return;
  if(R.mode==='pdf'){pdfOnResize();return;} /* CSS-scale now, one re-render when the size is stable */
  const v=el('viewer');
  if(!o.force&&R.layoutKey===layoutKey(v.clientWidth,v.clientHeight))return; /* nothing changed → no reflow, no jump */
  const anchor=o.anchor||readingAnchor();
  const ratio=R.pageCount>1?R.page/(R.pageCount-1):0;
  layout();
  let p=anchor?pageOfAnchor(anchor):-1;
  if(p<0)p=Math.round(ratio*(R.pageCount-1));
  goPage(p,false);
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
function persistPage(){
  const b=R.book;if(!b||!__rq||!__rq.loadEnvelope||!__rq.saveEnvelope)return;
  if(window.__rqWriter&&!__rqWriter.mayWrite())return;
  const cur=(S.progress[b.id]||{}).ratio||0;if(!(R.maxRatio>cur))return;
  S.progress[b.id]={ratio:R.maxRatio};
  try{const e=__rq.loadEnvelope();const pr=e.progress.progress||(e.progress.progress={});
    if(!((pr[b.id]||{}).ratio>=R.maxRatio)){pr[b.id]=Object.assign({},pr[b.id],{ratio:R.maxRatio});__rq.saveEnvelope(e);}}catch(err){console.warn('[rq] persistPage',err);}
}
function goPage(p,turn){
  if(window.__rqWriter&&!__rqWriter.mayWrite())return; /* passive: page stays put under the overlay */
  if(R.mode==='pdf'){ /* PDF: the page is shown (and counted) at the swap; ±1 turns chain from the pending target */
    if(turn&&Math.abs(p-R.page)===1)pdfFlip(p-R.page);else pdfGo(p,turn?'flip':'nav');
    return;
  }
  const prev=R.page;
  const np=Math.max(0,Math.min(R.pageCount-1,p));
  const forwardTurn=!!(turn&&np>prev);
  if(forwardTurn){
    R.turned++;
    /* counted minutes / pages: reader-session tracker (per-page cap, visible time only) */
    if(!isMvp()&&!R.timerOn)timerNudge();
    R.lastTurn=Date.now();
  }
  if(np!==prev)R.anc=null;
  R.page=np;
  el('content').style.transform='translateX('+(-np*R.step)+'px)';
  const ratio=R.pageCount>1?np/(R.pageCount-1):1;
  R.maxRatio=Math.max(R.maxRatio,ratio);
  /* page number + book progress: same task as the transform → same frame as the new text */
  el('rPage').textContent=(np+1)+' / '+R.pageCount;
  el('pgNum').textContent=(np+1)+' / '+R.pageCount; /* always-visible number, same frame */
  el('rPct').textContent=Math.round(ratio*100)+'%';
  const sl=el('pgSlider');sl.max=Math.max(0,R.pageCount-1);sl.value=np;
  /* Architect: reader writes pageVisibleMs on page change */
  /* the reading mode only REPORTS events; reader-session.js does all the accounting */
  if(__tracker&&(np!==prev||forwardTurn)){
    if(R.jumping){if(np!==prev)__tracker.jumped(np);}       /* 1б: TOC / bookmark / search / slider release */
    else if(!R.sliding){if(forwardTurn)__tracker.pageTurned(true);__tracker.pageShown(np);}
  }
  if(np!==prev){updDayBar();persistPage();}
}
el('pgSlider').oninput=e=>{const v=parseInt(e.target.value,10)||0;if(R.mode==='pdf'){P.sliding=true;pdfGo(v,'slider');}else{R.sliding=true;goPage(v,false);}};
el('pgSlider').onchange=e=>{
  const v=parseInt(e.target.value,10)||0;
  if(R.mode==='pdf'){P.sliding=false;pdfGo(v,'slider');if(P.target===P.shown){pdfNumbers(P.shown);if(P.jump){P.jump=false;if(__tracker&&__tracker.jumped)__tracker.jumped(P.shown);}}}
  else{R.sliding=false;jumpTo(v);}
};
/** 1б: jump (slider release, TOC, bookmark, search) — not a page flip. */
function jumpTo(p){
  if(R.mode==='pdf'){pdfGo(p,'nav');return;}
  R.jumping=true;try{goPage(p,false);}finally{R.jumping=false;}
  if(__tracker&&__tracker.isRunning&&__tracker.isRunning()&&__tracker.snapshot().page!==R.page)__tracker.jumped(R.page); /* slider: page already moved while dragging */
}
let touchTapAt=0;
el('viewer').addEventListener('click',e=>{
  if(suppressClick){suppressClick=false;return;}
  if(Date.now()<pinchQuietUntil)return; /* trailing click right after a two-finger gesture */
  if(Date.now()-touchTapAt<800)return;   /* already handled as a touch tap (see touchend) */
  if(R.mode==='pdf'){pdfTap(e.clientX,e.clientY);return;}
  viewerTap(e.clientX,e.clientY);
});
/* Tap zones. Touch taps are handled directly on touchend (Chrome may swallow the synthetic
   click right after a swipe), mouse/keyboard clicks via 'click'. */
function viewerTap(cx,cy){
  if(selText())return; // идёт выделение текста — не листаем
  const r=el('viewer').getBoundingClientRect();
  const x=(cx-r.left)/r.width;
  const y=(cy-r.top)/r.height;
  if(y<0.12&&x<0.3){toggleDayNight();return;}   // угол: день/ночь (как в ReadEra)
  if(y<0.12&&x>0.7){addBookmark();return;}       // угол: закладка
  const tapOn=!SET.nav||SET.nav.tap!==false;
  const inv=(SET.nav&&SET.nav.invert)?-1:1;
  if(tapOn&&x<0.3){fsResume();goPage(R.page-1*inv,true);}
  else if(tapOn&&x>0.7){fsResume();goPage(R.page+1*inv,true);}
  else toggleChrome(); // centre: ONE tap shows our bars AND leaves fullscreen; next centre tap hides both
}
