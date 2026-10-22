'use strict';
/* ===== PDF vertical scroll (Джессика 18.10, «Как листать: Прокрутка» for PDF too) =========================
   SET.flip.mode==='scroll' && R.mode==='pdf' → #pdfScroll (a native vertical scroller) replaces #pdfWrap.
   One slot per page, fit to width, laid out at once from the first page's proportions (a page with other
   proportions corrects its own slot when it is rendered; content above the screen keeps the reading place).
   Only the pages on screen ±1 have a canvas (≤ 6 MP each); farther canvases are freed. No zoom in this mode
   (pinch / double tap do nothing; zoom = «Страницы»). The page on screen = the page under the upper third.
   Tracker: the same rule as text scroll — a settled user scroll to the next/previous page = a turn, farther = a jump;
   slider / contents = a jump on release; read-aloud = via:'tts'. Programmatic scrolls are never reported twice. */
const PS_MAX_PX=6e6, PS_GAP=8, PS_KEEP=1;
const PS={on:false,seq:0,aspect:1.414,asp:[],tops:[],w:0,cv:new Map(),busy:false,want:[],progTop:null,settleT:0,rsT:0,g:null,renders:0};
window.__rqPdfScroll=PS; /* diagnostics for tests (read-only) */
function psOn(){return typeof R!=='undefined'&&R&&R.mode==='pdf'&&flipGet().mode==='scroll';}
function psBox(){return el('pdfScroll');}
/** slot tops from the per-page proportions (fit to the scroller width) */
function psMeasure(){
  const b=psBox(),w=b.clientWidth;PS.w=w;let y=PS_GAP;PS.tops=[];
  for(let i=0;i<R.pageCount;i++){PS.tops.push(y);y+=Math.round(w*(PS.asp[i]||PS.aspect))+PS_GAP;}
  PS.tops.push(y);
}
function psBuild(){
  const b=psBox();b.textContent='';psMeasure();
  const frag=document.createDocumentFragment();
  for(let i=0;i<R.pageCount;i++){
    const s=document.createElement('div');s.className='psl';s.dataset.n=i;
    s.style.top=PS.tops[i]+'px';s.style.height=(PS.tops[i+1]-PS.tops[i]-PS_GAP)+'px';
    const l=document.createElement('span');l.className='psn';l.textContent=pdfLabel(i);s.appendChild(l);
    frag.appendChild(s);
  }
  const end=document.createElement('div');end.className='psend';end.style.top=PS.tops[R.pageCount]+'px';frag.appendChild(end);
  b.appendChild(frag);
}
function psRelayoutSlots(){
  const b=psBox();psMeasure();
  b.querySelectorAll('.psl').forEach(function(s){const i=+s.dataset.n;s.style.top=PS.tops[i]+'px';s.style.height=(PS.tops[i+1]-PS.tops[i]-PS_GAP)+'px';});
  const e=b.querySelector('.psend');if(e)e.style.top=PS.tops[R.pageCount]+'px';
}
/** page under the upper third of the screen; the very end of the document = the last page */
function psPageAt(top){
  const b=psBox(),y=(top==null?b.scrollTop:top)+b.clientHeight/3;
  if(b.scrollTop>=b.scrollHeight-b.clientHeight-2&&top==null)return R.pageCount-1;
  let lo=0,hi=R.pageCount-1;
  while(lo<hi){const m=(lo+hi+1)>>1;if(PS.tops[m]<=y)lo=m;else hi=m-1;}
  return lo;
}
function psScrollTo(top,smooth){
  const b=psBox(),t=Math.max(0,Math.min(b.scrollHeight-b.clientHeight,Math.round(top)));
  if(smooth&&rqAnimKind()&&b.scrollTo){PS.progTop=null;b.scrollTo({top:t,behavior:'smooth'});return;}
  b.scrollTop=t;PS.progTop=b.scrollTop;
}
/** open the document in scroll mode at page p (tracker.begin and the numbers are already done by openPdf) */
async function psOpen(p){
  const seq=++PS.seq;PS.on=true;
  el('pdfWrap').classList.add('hidden');const b=psBox();b.classList.remove('hidden');
  try{const pg=await R.pdf.getPage(1);const v=pg.getViewport({scale:1});PS.aspect=v.height/v.width||1.414;}catch(e){}
  if(seq!==PS.seq||!R.pdf)return;
  PS.asp=[];psBuild();
  P.target=p;P.shown=p;R.page=p;
  psScrollTo(PS.tops[p]-PS_GAP,false);
  pdfBackdrop(null);pdfNumbers(p);
  if(__tracker&&__tracker.pageShown)__tracker.pageShown(p);
  psUpdate();
}
function psReset(){
  PS.seq++;PS.on=false;clearTimeout(PS.settleT);clearTimeout(PS.rsT);PS.want=[];PS.g=null;
  PS.cv.forEach(function(cv){cv.width=0;cv.height=0;});PS.cv.clear();
  const b=psBox();if(b){b.textContent='';b.classList.add('hidden');b.scrollTop=0;}
}
/** canvases for the pages on screen ±1; free the rest; render the nearest first */
/** a page's canvas leaves the strip: its bitmap and its text layer go with it */
function psFree(cv){cv.remove();cv.width=0;cv.height=0;if(cv._tl){cv._tl.remove();cv._tl=null;}}
function psUpdate(){
  if(!PS.on||!R.pdf)return;
  const b=psBox(),top=b.scrollTop,bot=top+b.clientHeight;
  let a=psPageAt(top),z=a;while(z<R.pageCount-1&&PS.tops[z+1]<bot)z++;
  a=Math.max(0,a-PS_KEEP);z=Math.min(R.pageCount-1,z+PS_KEEP);
  PS.cv.forEach(function(cv,n){if(n<a-1||n>z+1){psFree(cv);PS.cv.delete(n);}});
  const cur=psPageAt(),list=[];for(let i=a;i<=z;i++)if(!PS.cv.has(i)||PS.cv.get(i)._w!==PS.w)list.push(i);
  list.sort(function(x,y){return Math.abs(x-cur)-Math.abs(y-cur);});
  PS.want=list;psPump();
}
async function psPump(){
  if(PS.busy||!PS.want.length||!PS.on)return;
  PS.busy=true;const seq=PS.seq;
  try{
    while(PS.want.length&&seq===PS.seq){
      const n=PS.want.shift();
      try{await psRender(n,seq);}catch(e){pdfLog({ev:'ps-render-error',page:n,msg:String(e&&e.message||e).slice(0,80)});}
    }
  }finally{PS.busy=false;}
  if(seq===PS.seq&&PS.want.length)psPump();
}
async function psRender(n,seq){
  const page=await R.pdf.getPage(n+1);if(seq!==PS.seq)return;
  const v1=page.getViewport({scale:1}),asp=v1.height/v1.width;
  if(Math.abs(asp-(PS.asp[n]||PS.aspect))>0.005)psFixAspect(n,asp);
  const w=PS.w,dpr=Math.max(1,window.devicePixelRatio||1);
  let sc=w/v1.width*dpr;if(v1.width*sc*v1.height*sc>PS_MAX_PX)sc=Math.sqrt(PS_MAX_PX/(v1.width*v1.height));
  const vp=page.getViewport({scale:sc}),cv=document.createElement('canvas');
  cv.width=Math.max(1,Math.floor(vp.width));cv.height=Math.max(1,Math.floor(vp.height));
  const ctx=cv.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
  const gl=pdfMuteText(ctx); /* 20.10 SET.pdfFont */
  await page.render({canvasContext:ctx,viewport:vp}).promise;PS.renders++;
  if(seq!==PS.seq){cv.width=0;cv.height=0;return;}
  const s=psBox().querySelector('.psl[data-n="'+n+'"]');if(!s){cv.width=0;cv.height=0;return;}
  /* 19.10: a text layer per page, so text can be selected / quoted / copied in «Прокрутка» too (same builder as «Страницы») */
  const tl=document.createElement('div');tl.className='textLayer';tl.appendChild(await pdfTextLayer(page,w/v1.width,gl&&{g:gl,k:w/v1.width/sc}));
  if(seq!==PS.seq||!s.isConnected){cv.width=0;cv.height=0;return;}
  cv._w=w;cv._tl=tl;const old=PS.cv.get(n);s.appendChild(cv);s.appendChild(tl);if(typeof pdfHlPaint==='function')pdfHlPaint(tl,n);PS.cv.set(n,cv);s.classList.add('done');
  if(old&&old!==cv)psFree(old);
}
/** a page with other proportions than page 1: resize its slot; when it is above the reading place, keep the place */
function psFixAspect(n,asp){
  const b=psBox(),before=PS.tops[n+1],cur=b.scrollTop;
  PS.asp[n]=asp;psRelayoutSlots();
  if(before<=cur+1){b.scrollTop=cur+(PS.tops[n+1]-before);PS.progTop=b.scrollTop;}
}
/** viewport width changed (rotation, margins, bars): same page and the same place inside it */
function psResize(){
  if(!PS.on)return;
  clearTimeout(PS.rsT);PS.rsT=setTimeout(function(){
    const b=psBox();if(!b||b.clientWidth<8||b.clientWidth===PS.w){psUpdate();return;}
    const p=psPageAt(b.scrollTop),f=(b.scrollTop-PS.tops[p])/Math.max(1,PS.tops[p+1]-PS.tops[p]);
    psRelayoutSlots();psScrollTo(PS.tops[p]+f*(PS.tops[p+1]-PS.tops[p]),false);psUpdate();
  },150);
}
/** report a page (same rules as pdfGo/pdfSwap): kind 'turn' | 'jump' | 'tts' | 'slide' (slider preview, nothing written) */
function psReport(np,kind){
  const prev=P.shown;if(np===prev&&kind!=='jump')return;
  P.target=np;P.shown=np;R.page=np;
  if(kind==='slide'){pdfNumbers(np,true);return;}
  pdfNumbers(np);
  if(kind==='tts'){R.pos=R.pageCount>1?np/(R.pageCount-1):1;persistPage();if(__tracker&&__tracker.pageShown)__tracker.pageShown(np,'tts');updDayBar();return;}
  pdfReach(np);
  if(kind==='turn'){
    const fwd=np>prev;
    if(__tracker&&__tracker.pageTurned)__tracker.pageTurned(fwd);
    if(fwd){R.turned++;R.lastTurn=Date.now();if(!isMvp()&&!R.timerOn)timerNudge();}
    if(__tracker&&__tracker.pageShown)__tracker.pageShown(np);
  }else if(__tracker&&__tracker.jumped)__tracker.jumped(np);
  updDayBar();
}
/** navigation while scrolling (pdfGo): slider / contents / bookmarks / read-aloud scroll to the page top */
function psGo(np,why){
  np=Math.max(0,Math.min(R.pageCount-1,np));
  if(why==='tts'||why==='slider'||why==='nav'){
    psScrollTo(PS.tops[np]-PS_GAP,false);psUpdate();
    if(why==='tts')psReport(np,'tts');
    else if(why==='slider'&&P.sliding)psReport(np,'slide');
    else{P.jump=false;psReport(np,'jump');}
    return;
  }
  psStep(np>P.shown?1:-1);
}
/** taps on the edges, swipes, keys, ‹ › — one screen minus a strip, like text scroll; reported when the scroll stops */
function psStep(d){
  const b=psBox();psScrollTo(b.scrollTop+d*Math.max(b.clientHeight*0.5,b.clientHeight-48),true);PS.progTop=null;psSoon(); /* a user turn: reported when it stops */
}
function psSoon(){clearTimeout(PS.settleT);PS.settleT=setTimeout(psSettle,180);}
function psSettle(){
  if(!PS.on||!R.book||el('reader').classList.contains('hidden')||P.sliding)return;
  const b=psBox();
  if(PS.progTop!=null&&Math.abs(b.scrollTop-PS.progTop)<2)return;
  PS.progTop=null;
  const np=psPageAt(),d=np-P.shown;if(!d)return;
  psReport(np,Math.abs(d)===1?'turn':'jump');
}
/* touch: the browser scrolls; we only read taps and horizontal swipes. Pinch does nothing here. */
function psTouchStart(e){
  if(e.touches.length>=2){PS.g={pinch:true};return;}
  if(PS.g&&PS.g.pinch)return;
  const t=e.touches[0];PS.g={x0:t.clientX,y0:t.clientY,t0:performance.now(),top0:psBox().scrollTop};
}
function psTouchMove(e){if(PS.g&&PS.g.pinch&&e.cancelable)e.preventDefault();} /* no page zoom by the browser */
function psTouchEnd(e){
  const g=PS.g;if(!g)return;
  if(g.pinch){if(!e.touches.length)PS.g=null;pinchQuietUntil=Date.now()+450;return;}
  if(e.touches.length)return;
  PS.g=null;
  const ct=e.changedTouches[0],dx=ct.clientX-g.x0,dy=ct.clientY-g.y0,moved=Math.abs(psBox().scrollTop-g.top0);
  if(pdfSelecting())return; /* 22.10: the end of a selection drag is not a swipe / tap */
  if(flipGet().swipe!==false&&Math.abs(dx)>PDF_SWIPE&&Math.abs(dx)>Math.abs(dy)*1.5&&moved<8){fsResume();pdfFlip((dx<0?1:-1)*(flipGet().invert?-1:1));return;}
  if(Math.abs(dx)<12&&Math.abs(dy)<12&&moved<4&&performance.now()-g.t0<450&&!(e.target&&e.target.closest&&e.target.closest('button,a,input,#selpop'))){
    touchTapAt=Date.now();pdfTap(ct.clientX,ct.clientY);
  }
}
/* a returned app may have lost canvas bitmaps (Android): redraw the ones that are gone */
function psCheck(){
  if(!PS.on||document.visibilityState==='hidden')return;
  let bad=false;PS.cv.forEach(function(cv,n){if(pdfCanvasBad(cv,true)){psFree(cv);PS.cv.delete(n);bad=true;}});
  if(bad)psUpdate();
}
/** «Как листать» switched while a PDF is open: same page in the other mode */
function psSwitch(){
  if(R.mode!=='pdf'||!R.pdf)return;
  const p=P.shown>=0?P.shown:R.page;
  if(psOn()){
    pdfCancel();P.seq++;const sh=el('pdfSheet');sh.querySelectorAll('canvas').forEach(function(c){c.remove();c.width=0;c.height=0;});
    P.front=null;P.z=1;P.k=1;psOpen(p);
  }else{
    psReset();el('pdfWrap').classList.remove('hidden');
    P.shown=-1;P.target=p;P.z=1;pdfRender('mode');pdfWatch();
  }
}
psBox().addEventListener('scroll',function(){if(!PS.on)return;psSoon();if(!PS.raf)PS.raf=requestAnimationFrame(function(){PS.raf=0;psUpdate();if(!P.sliding)pdfNumbers(psPageAt());});},{passive:true});
document.addEventListener('visibilitychange',function(){if(document.visibilityState!=='hidden')setTimeout(psCheck,60);});
window.addEventListener('pageshow',function(){setTimeout(psCheck,60);});
window.addEventListener('focus',function(){setTimeout(psCheck,60);});
