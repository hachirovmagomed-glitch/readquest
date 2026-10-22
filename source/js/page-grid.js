'use strict';
/* ===== «Обзор»: page grid with real thumbnails (Джессика 18.10, «все 4 по очереди», пункт 3) ===============================
   Every page is a tile; only tiles near the screen hold a picture (IntersectionObserver), the rest are empty boxes, so a
   2000-page book costs the same as a 20-page one. Text: a scaled copy of the page (rqTextPageCopy, js/page-curl.js).
   PDF: a small pdf.js render, one at a time, nearest first. Tap = jump to that page (tracker: jumped, as the slider). */
const GRID={io:null,seq:0,busy:false,want:[],live:new Set(),renders:0};
window.__rqGrid=GRID; /* test hook */
function rqGridStop(){
  GRID.seq++;GRID.want=[];
  if(GRID.io){GRID.io.disconnect();GRID.io=null;}
  GRID.live.forEach(function(t){rqGridEmpty(t);});GRID.live.clear();
}
function rqGridEmpty(t){const b=t.querySelector('.pgth');if(!b)return;b.querySelectorAll('canvas').forEach(function(c){c.width=0;c.height=0;});b.textContent='';t.classList.remove('done');}
/** the page size the tiles copy: the reading screen for text, page 1 for PDF */
function rqGridAspect(){
  if(R.mode==='pdf'&&P.baseW)return P.baseH/P.baseW;
  const v=el('viewer');return v.clientWidth>8?v.clientHeight/(v.clientWidth+2*(SET.margin||0)):1.5; /* text tiles keep the side fields */
}
function rqGridRender(body){
  rqGridStop();
  const b=R.book,n=R.pageCount,mk={};(S.marks[b.id]||[]).forEach(function(m){mk[m.page-1]=1;});
  const asp=rqGridAspect();
  let html='<div class="pgrid2" style="--pg-asp:'+(1/asp).toFixed(4)+'">';
  for(let i=0;i<n;i++)html+='<button class="pgt'+(i===R.page?' cur':'')+'" data-n="'+i+'" aria-label="Страница '+(i+1)+'"><span class="pgth"></span><span class="pgn">'+(i+1)+(mk[i]?'<span class="m">'+rqIcon('bookmark',10)+'</span>':'')+'</span></button>';
  body.innerHTML=html+'</div>';
  const grid=body.firstChild,seq=GRID.seq;
  grid.onclick=function(e){const t=e.target.closest('.pgt');if(t)rqGridGo(+t.dataset.n);};
  GRID.io=new IntersectionObserver(function(es){
    if(seq!==GRID.seq)return;
    es.forEach(function(e){const t=e.target;
      if(e.isIntersecting){if(!t.classList.contains('done')&&GRID.want.indexOf(t)<0)GRID.want.push(t);}
      else{const k=GRID.want.indexOf(t);if(k>=0)GRID.want.splice(k,1);if(GRID.live.has(t)){rqGridEmpty(t);GRID.live.delete(t);}}});
    rqGridPump(seq);
  },{rootMargin:'300px 0px'});
  grid.querySelectorAll('.pgt').forEach(function(t){GRID.io.observe(t);});
  requestAnimationFrame(function(){const c=grid.querySelector('.pgt.cur');if(c&&seq===GRID.seq)c.scrollIntoView({block:'center'});});
}
function rqGridGo(n){rqGridStop();jumpTo(n);el('panel').classList.add('hidden');}
/** fill the wanted tiles one by one (text copies in small batches, PDF renders strictly one at a time) */
function rqGridPump(seq){
  if(GRID.busy||seq!==GRID.seq)return;
  const t=GRID.want.shift();if(!t)return;
  if(!t.isConnected||t.classList.contains('done')){rqGridPump(seq);return;}
  GRID.busy=true;
  const fin=function(){GRID.busy=false;if(seq===GRID.seq)setTimeout(function(){rqGridPump(seq);},0);};
  if(R.mode==='pdf'){rqGridPdf(t,seq).then(fin,fin);return;}
  try{rqGridText(t);}catch(e){}
  fin();
}
function rqGridText(t){
  const box=t.querySelector('.pgth'),v=el('viewer'),W=v.clientWidth,H=v.clientHeight,w=box.clientWidth;
  if(!w||!W)return;
  const sheet=rqScrollMode()?rqGridScrollCopy(+t.dataset.n):rqTextPageCopy(+t.dataset.n);if(!sheet)return;
  const m=SET.margin||0,sc=document.createElement('div'),pg=document.createElement('div');sc.className='pgsc';pg.className='pgtx';
  sc.style.width=(W+2*m)+'px';sc.style.height=H+'px';sc.style.transform='scale('+(w/(W+2*m)).toFixed(5)+')';
  pg.style.left=m+'px';pg.style.width=W+'px';pg.style.height=H+'px';pg.appendChild(sheet);sc.appendChild(pg);box.appendChild(sc);t.classList.add('done');GRID.live.add(t);GRID.renders++;
}
async function rqGridPdf(t,seq){
  const box=t.querySelector('.pgth'),w=box.clientWidth;if(!w||!R.pdf)return;
  const pdf=R.pdf,page=await pdf.getPage(+t.dataset.n+1);if(seq!==GRID.seq||pdf!==R.pdf)return;
  const v1=page.getViewport({scale:1}),dpr=Math.max(1,window.devicePixelRatio||1),vp=page.getViewport({scale:w*dpr/v1.width});
  const cv=document.createElement('canvas');cv.width=Math.max(1,Math.floor(vp.width));cv.height=Math.max(1,Math.floor(vp.height));
  const g=cv.getContext('2d',{alpha:false});g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);
  await page.render({canvasContext:g,viewport:vp}).promise;
  if(seq!==GRID.seq||!t.isConnected||!GRID.io){cv.width=0;cv.height=0;return;}
  box.textContent='';box.appendChild(cv);t.classList.add('done');GRID.live.add(t);GRID.renders++;
}
/** 22.10 (Джессика: «Обзор» in a TXT is empty): «Прокрутка» has no columns, so rqTextPageCopy gives nothing. A «page» there is
    one screen of the scroll (R.step high, page n starts at n·R.step): copy the blocks that cross it, shifted so the screen's
    first line sits at the top, like the paged copy. */
function rqGridScrollCopy(n){
  try{
    const v=el('viewer'),c=el('content'),h=R.step,kids=c.children,cnt=kids.length;if(!h||!cnt)return null;
    const ct=c.getBoundingClientRect().top,Y=n*h,W=v.clientWidth;
    const top=function(e){return e.getBoundingClientRect().top-ct;},bot=function(e){return e.getBoundingClientRect().bottom-ct;};
    let lo=0,hi=cnt-1;while(lo<hi){const m=(lo+hi)>>1;if(bot(kids[m])<=Y)lo=m+1;else hi=m;}
    const first=lo;let last=first;while(last+1<cnt&&top(kids[last+1])<Y+h)last++;
    const sheet=document.createElement('div');sheet.className='rqCurlSheet';sheet.style.visibility='hidden';
    const clip=document.createElement('div');clip.className='rqCurlClip';clip.style.width=W+'px';clip.style.height=h+'px';
    const t=document.createElement('div');t.className='rqCurlTxt'+(c.classList.contains('noind')?' noind':'');t.lang=c.lang;
    t.style.cssText=c.style.cssText;t.style.columnWidth='auto';t.style.height='auto';t.style.width=W+'px';t.style.transform='none';
    for(let i=first;i<=last;i++)t.appendChild(kids[i].cloneNode(true));
    clip.appendChild(t);sheet.appendChild(clip);v.appendChild(sheet);
    const off=t.firstChild.getBoundingClientRect().top-sheet.getBoundingClientRect().top; /* where the first block lands in the copy */
    t.style.marginTop=(top(kids[first])-Y-off).toFixed(3)+'px';
    sheet.remove();sheet.style.visibility='';return sheet;
  }catch(e){return null;}
}
