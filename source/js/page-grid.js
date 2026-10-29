'use strict';
/* ===== «Обзор»: page grid with real thumbnails (Джессика 18.10, «все 4 по очереди», пункт 3) ===============================
   Every page is a tile; only tiles near the screen hold a picture (IntersectionObserver), the rest are empty boxes, so a
   2000-page book costs the same as a 20-page one. Text: a scaled copy of the page (rqTextPageCopy, js/page-curl.js).
   PDF: a small pdf.js render, one at a time, nearest first. Tap = jump to that page (tracker: jumped, as the slider). */
const GRID={io:null,seq:0,busy:false,want:[],live:new Set(),renders:0,scr:null};
window.__rqGrid=GRID; /* test hook */
function rqGridStop(){
  GRID.seq++;GRID.want=[];
  if(GRID.io){GRID.io.disconnect();GRID.io=null;}
  GRID.live.forEach(function(t){rqGridEmpty(t);});GRID.live.clear();
  if(GRID.scr){GRID.scr.remove();GRID.scr=null;}
}
function rqGridEmpty(t){const b=t.querySelector('.pgth');if(!b)return;b.querySelectorAll('canvas').forEach(function(c){c.width=0;c.height=0;});b.textContent='';t.classList.remove('done');}
/** the page size the tiles copy: the reading screen for text, page 1 for PDF */
function rqGridAspect(){
  if(R.mode==='pdf'&&P.baseW)return P.baseH/P.baseW;
  const v=el('viewer');return v.clientWidth>8?v.clientHeight/(v.clientWidth+2*(SET.margin||0)):1.5; /* text tiles keep the side fields */
}
/* 29.10 (Джессика: «как сделать "Обзор" удобнее» → пункты 1, 2, 4, 7):
   1 — the grid is cut by the book's chapters: a title row before a chapter's first page, sticky while its pages scroll by;
   2 — marks on the picture itself: a bookmark ribbon, the colours of the page's quotes, a sign for a quote with a note;
   4 — a thumb on the right edge, as in a phone gallery: drag it, a tip says the page and the chapter;
   7 — a row on top «Стр. [__] Перейти» and «К текущей» (only scrolls the grid back to the page being read). */
/** chapter starts for the grid: [{p, t}] by page, top level only (PDF sub-bookmarks would cut it too fine); same page → one title */
function rqGridChapters(b){
  const toc=typeof tocOf==='function'?tocOf(b):[];if(!toc.length)return [];
  const top=toc.some(function(x){return x.lvl>0;})?toc.filter(function(x){return !(x.lvl>0);}):toc;
  const by={};top.forEach(function(x){const p=tocPg(b,x),t=String(x.t||'').trim();if(!t)return;(by[p]=by[p]||[]).push(t);});
  return Object.keys(by).map(Number).sort(function(a,c){return a-c;}).map(function(p){return {p:p,t:by[p].join(' · ')};});
}
/** page → {bm, c:[colour keys], note} for the marks on the pictures */
function rqGridMarks(b){
  const out={},at=function(i){return out[i]||(out[i]={bm:false,c:[],note:false});};
  (S.marks[b.id]||[]).forEach(function(m){if(m&&m.page>0)at(m.page-1).bm=true;});
  (S.quotes[b.id]||[]).forEach(function(q){if(!q)return;let p=-1;try{p=quotePage(b,q);}catch(e){}if(p<0)return;
    const o=at(p),k=typeof hlKey==='function'?hlKey(q.c):q.c;if(o.c.indexOf(k)<0)o.c.push(k);if(q.note)o.note=true;});
  return out;
}
function rqGridTile(i,cur,m){
  let ov='';
  if(m){
    if(m.bm)ov+='<span class="pgbm" role="img" aria-label="Закладка">'+rqIcon('bookmark',14)+'</span>';
    if(m.c.length||m.note)ov+='<span class="pgqs">'+m.c.slice(0,4).map(function(k){return '<i style="--d:'+hlDot(k)+';--d2:'+hlDot2(k)+'"></i>';}).join('')+
      (m.note?'<span class="pgnote">'+rqIcon('file-text',12)+'</span>':'')+'</span>';
  }
  const lab='Страница '+(i+1)+(m&&m.bm?', закладка':'')+(m&&m.c.length?', цитаты':'')+(m&&m.note?', заметка':'');
  return '<button class="pgt'+(cur?' cur':'')+'" data-n="'+i+'" aria-label="'+lab+'"'+(cur?' aria-current="page"':'')+'><span class="pgfr"><span class="pgth"></span>'+ov+'</span><span class="pgn">'+(i+1)+'</span></button>';
}
function rqGridRender(body){
  rqGridStop();
  const b=R.book,n=R.pageCount,mk=rqGridMarks(b),chs=rqGridChapters(b);
  const asp=rqGridAspect();
  let html='<form class="pgbar" onsubmit="return false"><label class="pggo"><span>Стр.</span><input id="pgGoN" type="number" inputmode="numeric" enterkeyhint="go" min="1" max="'+n+'" placeholder="1–'+n+'" aria-label="Номер страницы, от 1 до '+n+'"></label>'+
    '<button type="submit" class="pgbtn" data-go>Перейти</button><span class="spacer"></span><button type="button" class="pgbtn pgcurb" data-cur>'+rqIcon(typeof tocNowIcon==='function'?tocNowIcon():'book-open',16)+'К текущей</button></form>';
  html+='<div class="pgsecs" style="--pg-asp:'+(1/asp).toFixed(4)+'">';
  let ci=0,open=false;
  const sec=function(t,p,k){if(open)html+='</div></section>';open=true;
    html+='<section class="pgsec">'+(t!=null?'<h4 class="pgch" data-ch="'+k+'"><span class="pgcht">'+esc(t)+'</span><span class="pgchp">стр. '+(p+1)+'</span></h4>':'')+'<div class="pgrid2">';};
  if(!chs.length||chs[0].p>0)sec(null);
  for(let i=0;i<n;i++){
    while(ci<chs.length&&chs[ci].p===i){sec(chs[ci].t,i,ci);ci++;}
    html+=rqGridTile(i,i===R.page,mk[i]);
  }
  if(open)html+='</div></section>';
  body.innerHTML=html+'</div>';
  const secs=body.querySelector('.pgsecs'),bar=body.querySelector('.pgbar'),seq=GRID.seq;
  body.style.setProperty('--pgbar-h',bar.offsetHeight+'px');
  secs.onclick=function(e){const t=e.target.closest('.pgt');if(t)rqGridGo(+t.dataset.n);};
  bar.addEventListener('submit',function(e){e.preventDefault();rqGridGoTyped();});
  bar.querySelector('[data-cur]').onclick=function(){rqGridShowCur(true);};
  GRID.io=new IntersectionObserver(function(es){
    if(seq!==GRID.seq)return;
    es.forEach(function(e){const t=e.target;
      if(e.isIntersecting){if(!t.classList.contains('done')&&GRID.want.indexOf(t)<0)GRID.want.push(t);}
      else{const k=GRID.want.indexOf(t);if(k>=0)GRID.want.splice(k,1);if(GRID.live.has(t)){rqGridEmpty(t);GRID.live.delete(t);}}});
    rqGridPump(seq);
  },{rootMargin:'300px 0px'});
  secs.querySelectorAll('.pgt').forEach(function(t){GRID.io.observe(t);});
  GRID.chs=chs;rqGridScroller(body,seq);
  requestAnimationFrame(function(){if(seq===GRID.seq)rqGridShowCur(false);});
}
/** scroll the grid so the page being read is in the middle (under the sticky bar and chapter title) */
function rqGridShowCur(smooth){
  const body=el('panelBody'),c=body&&body.querySelector('.pgt.cur');if(!c)return;
  const br=body.getBoundingClientRect(),r=c.getBoundingClientRect(),top=body.scrollTop+r.top-br.top-(body.clientHeight-r.height)/2;
  const st=typeof rqStill==='function'&&rqStill();
  try{body.scrollTo({top:Math.max(0,top),behavior:smooth&&!st?'smooth':'auto'});}catch(e){body.scrollTop=Math.max(0,top);}
}
/** «Перейти»: the typed page, 1…N; anything else → a hint, the grid stays */
function rqGridGoTyped(){
  const i=el('pgGoN'),v=String(i&&i.value||'').trim(),n=+v;
  if(!/^\d+$/.test(v)||n<1||n>R.pageCount){flashMsg(v?'Нет такой страницы: в книге '+R.pageCount+' стр.':'Введите номер страницы');if(i)i.focus();return;}
  if(i)i.blur();rqGridGo(n-1);
}
/** the chapter a page belongs to (title or '') */
function rqGridChapterOf(p){const chs=GRID.chs||[];let t='';for(let k=0;k<chs.length&&chs[k].p<=p;k++)t=chs[k].t;return t;}
/** the first page tile seen under the sticky bar / chapter title */
function rqGridTopPage(body){
  const ts=body.querySelectorAll('.pgt');if(!ts.length)return 0;
  const y=body.getBoundingClientRect().top+(parseFloat(body.style.getPropertyValue('--pgbar-h'))||0)+40;
  let lo=0,hi=ts.length-1;while(lo<hi){const m=(lo+hi)>>1;if(ts[m].getBoundingClientRect().bottom<y)lo=m+1;else hi=m;}
  return +ts[lo].dataset.n;
}
/** 4: the thumb on the right edge (only when the grid is longer than three screens) */
function rqGridScroller(body,seq){
  const panel=el('panel');if(!panel)return;
  const s=document.createElement('div');s.className='pgscr';s.innerHTML='<span class="pgscr-tip" aria-hidden="true"></span><span class="pgscr-th" role="scrollbar" aria-label="Быстрая прокрутка страниц" aria-orientation="vertical" aria-controls="panelBody" tabindex="-1"><i></i></span>';
  panel.appendChild(s);GRID.scr=s;
  const th=s.querySelector('.pgscr-th'),tip=s.querySelector('.pgscr-tip');
  const max=function(){return Math.max(1,body.scrollHeight-body.clientHeight);};
  const place=function(){if(seq!==GRID.seq)return;
    const top=body.offsetTop+(parseFloat(body.style.getPropertyValue('--pgbar-h'))||0),h=body.clientHeight-(top-body.offsetTop);
    s.style.top=top+'px';s.style.height=Math.max(0,h-8)+'px';
    s.hidden=body.scrollHeight<body.clientHeight*3;
    const room=Math.max(0,s.clientHeight-th.offsetHeight);th.style.transform='translateY('+(room*body.scrollTop/max()).toFixed(1)+'px)';
    th.setAttribute('aria-valuenow',String(rqGridTopPage(body)+1));th.setAttribute('aria-valuemin','1');th.setAttribute('aria-valuemax',String(R.pageCount));
  };
  const tipShow=function(){const p=rqGridTopPage(body),c=rqGridChapterOf(p);tip.innerHTML='<b>стр. '+(p+1)+'</b>'+(c?'<span>'+esc(c)+'</span>':'');
    const room=Math.max(0,s.clientHeight-th.offsetHeight);tip.style.transform='translateY('+(room*body.scrollTop/max()+th.offsetHeight/2).toFixed(1)+'px) translateY(-50%)';};
  let d=null;
  th.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();d={id:e.pointerId,y0:e.clientY,t0:body.scrollTop};s.classList.add('on');try{th.setPointerCapture(e.pointerId);}catch(_){}tipShow();});
  th.addEventListener('pointermove',function(e){if(!d||e.pointerId!==d.id)return;e.preventDefault();
    const room=Math.max(1,s.clientHeight-th.offsetHeight);body.scrollTop=Math.max(0,Math.min(max(),d.t0+(e.clientY-d.y0)/room*max()));place();tipShow();});
  const up=function(e){if(!d||e.pointerId!==d.id)return;d=null;s.classList.remove('on');try{th.releasePointerCapture(e.pointerId);}catch(_){}};
  th.addEventListener('pointerup',up);th.addEventListener('pointercancel',up);
  body.addEventListener('scroll',function sc(){if(seq!==GRID.seq){body.removeEventListener('scroll',sc);return;}place();if(d)tipShow();},{passive:true});
  requestAnimationFrame(place);setTimeout(place,350);
}
function rqGridGo(n){const from=R.mode==='pdf'&&typeof P!=='undefined'&&P.shown>=0?P.shown:R.page;rqGridStop();jumpTo(n);el('panel').classList.add('hidden');if(n!==from&&typeof showJumpBack==='function')showJumpBack(from);}
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
