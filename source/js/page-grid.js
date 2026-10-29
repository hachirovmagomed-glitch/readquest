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
  rqGridPreviewClose();
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
/* 29.10 вечер (Джессика: «есть ещё варианты?» → «давай все»): 1 read pages dimmed + a progress line, 2 2/3/5 in a row (pinch or the
   button; SET.gridCols), 3 filter «Все / Закладки / Цитаты / Главы» (+ «Найдено» after a search), 4 long press → the page large with
   «Открыть» / «Закладка», 5 search hits marked, 6 the current page in the skin's frame (skins.css), 7 a chapter folds on a tap on its
   title, 8 the corner ribbon sets / removes a bookmark in place. */
const GRID_COLS=[2,3,5];
function rqGridCols(){return GRID_COLS.indexOf(SET.gridCols)>=0?SET.gridCols:3;}
/** the farthest page read (R.maxRatio, or the page now if further) */
function rqGridReadTo(){const N=Math.max(1,R.pageCount),r=Math.max(R.maxRatio||0,N>1?R.page/(N-1):0);return Math.round(Math.min(1,r)*(N-1));}
/** pages with search hits (the magnifier search of this book), page → count */
function rqGridHits(b){const o={};try{if(typeof BF==='undefined'||!BF.q||BF.q.length<2||BF.book!==b.id||!BF.hits.length)return null;
  BF.hits.forEach(function(h){const p=bfHitPage(h);if(p>=0)o[p]=(o[p]||0)+1;});}catch(e){return null;}return o;}
function rqGridTile(i,cur,m,o){
  let ov='';const bm=!!(m&&m.bm),hit=o.hits&&o.hits[i];
  if(m&&(m.c.length||m.note))ov+='<span class="pgqs">'+m.c.slice(0,4).map(function(k){return '<i style="--d:'+hlDot(k)+';--d2:'+hlDot2(k)+'"></i>';}).join('')+
    (m.note?'<span class="pgnote">'+rqIcon('file-text',12)+'</span>':'')+'</span>';
  if(hit)ov+='<span class="pghit" aria-hidden="true">'+rqIcon('search',11)+hit+'</span>';
  const lab='Страница '+(i+1)+(bm?', закладка':'')+(m&&m.c.length?', цитаты':'')+(m&&m.note?', заметка':'')+(hit?', найдено '+hit:'')+(i<o.readTo?', прочитана':'');
  const cls='pgt'+(cur?' cur':'')+(i<o.readTo&&!cur?' rd':'')+(bm?' hbm':'')+(m&&(m.c.length||m.note)?' hq':'')+(hit?' hfind':'')+(o.chStart[i]?' hch':'');
  return '<div class="'+cls+'" data-n="'+i+'"><button type="button" class="pgopen" aria-label="'+lab+'"'+(cur?' aria-current="page"':'')+'><span class="pgfr"><span class="pgth"></span>'+ov+'</span><span class="pgn">'+(i+1)+'</span></button>'+
    '<button type="button" class="pgbmb'+(bm?' on':'')+'" aria-pressed="'+bm+'" aria-label="'+(bm?'Убрать закладку со страницы ':'Закладка на страницу ')+(i+1)+'">'+rqIcon('bookmark',14)+'</button></div>';
}
const GRID_FLT=[['all','Все'],['bm','Закладки'],['q','Цитаты'],['ch','Главы'],['find','Найдено']];
function rqGridRender(body){
  rqGridStop();
  const b=R.book,n=R.pageCount,mk=rqGridMarks(b),chs=rqGridChapters(b),hits=rqGridHits(b),readTo=rqGridReadTo(),chStart={};chs.forEach(function(c){chStart[c.p]=1;});
  if(GRID.bid!==b.id){GRID.bid=b.id;GRID.flt='all';GRID.fold={};}
  if(GRID.flt==='find'&&!hits)GRID.flt='all';
  const asp=rqGridAspect(),o={readTo:readTo,hits:hits,chStart:chStart},pct=Math.round(readTo/Math.max(1,n-1)*100);
  let html='<div class="pgbar"><form class="pgrow" onsubmit="return false"><label class="pggo"><span>Стр.</span><input id="pgGoN" type="number" inputmode="numeric" enterkeyhint="go" min="1" max="'+n+'" placeholder="1–'+n+'" aria-label="Номер страницы, от 1 до '+n+'"></label>'+
    '<button type="submit" class="pgbtn" data-go>Перейти</button><span class="spacer"></span><button type="button" class="pgbtn pgcurb" data-cur>'+rqIcon(typeof tocNowIcon==='function'?tocNowIcon():'book-open',16)+'К текущей</button></form>'+
    '<div class="pgrow"><div class="pgflt" role="group" aria-label="Показать страницы">'+GRID_FLT.filter(function(f){return f[0]!=='find'||hits;}).map(function(f){
      return '<button type="button" class="fchip'+(GRID.flt===f[0]?' on':'')+'" data-flt="'+f[0]+'" aria-pressed="'+(GRID.flt===f[0])+'">'+(f[0]==='find'?rqIcon('search',13)+'Найдено':f[1])+'</button>';}).join('')+
    '</div><button type="button" class="pgbtn pgsz" data-cols aria-label="Размер миниатюр: '+rqGridCols()+' в ряд" title="Размер миниатюр">'+rqIcon('layers',16)+'<b>'+rqGridCols()+'</b></button></div>'+
    '<div class="pgprog" role="progressbar" aria-label="Прочитано" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'" title="Прочитано '+pct+'%"><i style="width:'+pct+'%"></i></div></div>';
  html+='<div class="pgsecs pgc'+rqGridCols()+'" data-f="'+GRID.flt+'" style="--pg-asp:'+(1/asp).toFixed(4)+'">';
  let ci=0,open=false;
  const sec=function(t,p,k,end){if(open)html+='</div></section>';open=true;const f=t!=null&&GRID.fold[p];
    html+='<section class="pgsec'+(f?' fold':'')+'">'+(t!=null?'<h4 class="pgch" data-ch="'+k+'" data-p="'+p+'"><button type="button" class="pgchb" aria-expanded="'+!f+'"><span class="pgcht">'+esc(t)+'</span><span class="pgchp">'+(f?(end-p+1)+' стр. · ':'')+'стр. '+(p+1)+'</span>'+rqIcon('chevron-down',16)+'</button></h4>':'')+'<div class="pgrid2">';};
  if(!chs.length||chs[0].p>0)sec(null);
  for(let i=0;i<n;i++){
    while(ci<chs.length&&chs[ci].p===i){sec(chs[ci].t,i,ci,(ci+1<chs.length?chs[ci+1].p:n)-1);ci++;}
    html+=rqGridTile(i,i===R.page,mk[i],o);
  }
  if(open)html+='</div></section>';
  body.innerHTML=html+'<div class="pgnone pempty" hidden></div></div>';
  const secs=body.querySelector('.pgsecs'),bar=body.querySelector('.pgbar'),seq=GRID.seq;
  body.style.setProperty('--pgbar-h',bar.offsetHeight+'px');
  rqGridFilterApply(body);
  secs.addEventListener('click',function(e){
    if(GRID.lp&&Date.now()-GRID.lp<700){GRID.lp=0;return;} /* the click after a long press */
    const bb=e.target.closest('.pgbmb');if(bb){rqGridMarkToggle(+bb.closest('.pgt').dataset.n);return;}
    const ch=e.target.closest('.pgch');if(ch){rqGridFold(+ch.dataset.p);return;}
    const t=e.target.closest('.pgt');if(t)rqGridGo(+t.dataset.n);});
  bar.querySelector('form').addEventListener('submit',function(e){e.preventDefault();rqGridGoTyped();});
  bar.querySelector('[data-cur]').onclick=function(){rqGridShowCur(true);};
  bar.querySelector('[data-cols]').onclick=function(){rqGridSetCols(GRID_COLS[(GRID_COLS.indexOf(rqGridCols())+1)%GRID_COLS.length]);};
  bar.querySelector('.pgflt').addEventListener('click',function(e){const c=e.target.closest('[data-flt]');if(!c)return;GRID.flt=c.dataset.flt;
    bar.querySelectorAll('[data-flt]').forEach(function(x){const on=x===c;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on);});
    secs.dataset.f=GRID.flt;rqGridFilterApply(body);body.scrollTop=0;});
  rqGridLongPress(secs);rqGridPinch(body);
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
/** re-draw the grid where it was (after a bookmark, a fold, another size) */
function rqGridRedo(){const B=el('panelBody');if(!B||panelTab!=='grid')return;const y=B.scrollTop;rqGridRender(B);GRID.keepY=true;B.scrollTop=y;
  requestAnimationFrame(function(){B.scrollTop=y;});}
/** 3: hide the pages the filter leaves out; a section without pages left goes too; nothing at all → a line why */
function rqGridFilterApply(body){
  const f=GRID.flt||'all',cls={bm:'hbm',q:'hq',ch:'hch',find:'hfind'}[f];let any=false;
  body.querySelectorAll('.pgsec').forEach(function(s){let k=0;s.querySelectorAll('.pgt').forEach(function(t){const on=!cls||t.classList.contains(cls);t.hidden=!on;if(on)k++;});s.hidden=!!cls&&!k;if(k)any=true;});
  const no=body.querySelector('.pgnone');if(no){no.hidden=any;if(!any)no.innerHTML=rqIcon(f==='bm'?'bookmark':f==='q'?'quote':'list',28)+'<div>'+(f==='bm'?'В этой книге пока нет закладок':f==='q'?'В этой книге пока нет цитат':f==='ch'?'У этой книги нет оглавления':'Ничего не найдено')+'</div>';}
}
/** 2: 2 / 3 / 5 in a row, kept in SET.gridCols (arch.md 29.10) */
function rqGridSetCols(c){if(GRID_COLS.indexOf(c)<0||c===rqGridCols())return;SET.gridCols=c;saveSet();
  const B=el('panelBody'),t=B&&rqGridTopPage(B);rqGridRender(B);GRID.keepY=true;
  requestAnimationFrame(function(){const x=B.querySelector('.pgt[data-n="'+t+'"]');if(x){const br=B.getBoundingClientRect(),r=x.getBoundingClientRect();B.scrollTop+=r.top-br.top-(parseFloat(B.style.getPropertyValue('--pgbar-h'))||0)-44;}});}
/** 2: pinch on the grid — apart = bigger pictures (fewer in a row), together = smaller */
function rqGridPinch(secs){
  if(secs.__pgPinch)return;secs.__pgPinch=1; /* #panelBody lives on: wired once, works only while «Обзор» is shown */
  let d0=0;const dist=function(e){const a=e.touches[0],b=e.touches[1];return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);};
  secs.addEventListener('touchstart',function(e){d0=e.touches.length===2&&panelTab==='grid'&&GRID.io?dist(e):0;},{passive:true});
  secs.addEventListener('touchmove',function(e){if(!d0||e.touches.length!==2)return;const r=dist(e)/d0,i=GRID_COLS.indexOf(rqGridCols());
    if(r>1.3&&i>0){d0=0;rqGridSetCols(GRID_COLS[i-1]);}else if(r<0.77&&i<GRID_COLS.length-1){d0=0;rqGridSetCols(GRID_COLS[i+1]);}},{passive:true});
  secs.addEventListener('touchend',function(e){if(e.touches.length<2)d0=0;},{passive:true});
}
/** 7: fold / unfold a chapter (memory only, for this book while it is open) */
function rqGridFold(p){GRID.fold[p]=!GRID.fold[p];rqGridRedo();}
/** 8: the corner ribbon — a bookmark on that page, or off; stored the same way as «Закладка на текущей странице» */
function rqGridMarkToggle(i){
  const b=R.book;if(!b)return;const arr=(S.marks[b.id]=S.marks[b.id]||[]),has=arr.some(function(m){return m&&m.page===i+1;});
  if(has){S.marks[b.id]=arr.filter(function(m){return !(m&&m.page===i+1);});flashMsg('Закладка снята: стр. '+(i+1));}
  else{arr.push({ratio:R.pageCount>1?i/(R.pageCount-1):0,page:i+1,date:today()});if(typeof diaryAuto==='function')diaryAuto(b.id);flashMsg('Закладка: стр. '+(i+1));}
  save();const pv=GRID.pv&&GRID.pv.n===i;rqGridRedo();if(pv)rqGridPreview(i);
}
/** 4: hold a page ~half a second → it opens large over the grid */
function rqGridLongPress(secs){
  let tm=null,x0=0,y0=0;const stop=function(){clearTimeout(tm);tm=null;};
  secs.addEventListener('pointerdown',function(e){const t=e.target.closest('.pgt');if(!t||e.target.closest('.pgbmb,.pgch'))return;x0=e.clientX;y0=e.clientY;stop();
    tm=setTimeout(function(){tm=null;GRID.lp=Date.now();try{if(navigator.vibrate)navigator.vibrate(12);}catch(_){}rqGridPreview(+t.dataset.n);},480);});
  secs.addEventListener('pointermove',function(e){if(tm&&Math.hypot(e.clientX-x0,e.clientY-y0)>10)stop();});
  ['pointerup','pointercancel','pointerleave'].forEach(function(k){secs.addEventListener(k,stop);});
  secs.addEventListener('contextmenu',function(e){if(e.target.closest('.pgt'))e.preventDefault();});
}
function rqGridPreviewClose(){const v=GRID.pv;GRID.pv=null;if(!v)return;const t=v.el.querySelector('.pgt');if(t){rqGridEmpty(t);GRID.live.delete(t);}v.el.remove();}
function rqGridPreview(i){
  rqGridPreviewClose();const panel=el('panel'),b=R.book;if(!panel||!b)return;
  const bm=(S.marks[b.id]||[]).some(function(m){return m&&m.page===i+1;}),asp=rqGridAspect(),ch=rqGridChapterOf(i);
  const w=document.createElement('div');w.className='pgpv';w.setAttribute('role','dialog');w.setAttribute('aria-label','Страница '+(i+1));
  w.innerHTML='<div class="pgpvc" style="--pg-asp:'+(1/asp).toFixed(4)+'"><div class="pgpvh"><b>Стр. '+(i+1)+'</b>'+(ch?'<span>'+esc(ch)+'</span>':'')+'<button type="button" class="closes" data-x aria-label="Закрыть">'+rqIcon('x',20)+'</button></div>'+
    '<div class="pgt pgpvt" data-n="'+i+'"><span class="pgfr"><span class="pgth"></span></span></div>'+
    '<div class="pgpva"><button type="button" class="pgbtn" data-bm aria-pressed="'+bm+'">'+rqIcon('bookmark',16)+(bm?'Снять закладку':'Закладка')+'</button><button type="button" class="pgbtn pgpvgo" data-open>'+rqIcon('book-open',16)+'Открыть</button></div></div>';
  panel.appendChild(w);GRID.pv={el:w,n:i};
  const fr=w.querySelector('.pgfr'),H=Math.max(120,panel.clientHeight-200),W=Math.max(120,panel.clientWidth-64);fr.style.width=Math.floor(Math.min(W,H/asp))+'px';
  w.addEventListener('click',function(e){if(e.target===w||e.target.closest('[data-x]')){rqGridPreviewClose();return;}
    if(e.target.closest('[data-open]')){rqGridPreviewClose();rqGridGo(i);return;}
    if(e.target.closest('[data-bm]'))rqGridMarkToggle(i);});
  const t=w.querySelector('.pgt'),seq=GRID.seq;
  requestAnimationFrame(function(){if(!t.isConnected)return;if(R.mode==='pdf')rqGridPdf(t,seq);else try{rqGridText(t);}catch(e){}});
  try{w.querySelector('[data-open]').focus({preventScroll:true});}catch(e){}
}
/** scroll the grid so the page being read is in the middle (under the sticky bar and chapter title) */
function rqGridShowCur(smooth){
  if(GRID.keepY){GRID.keepY=false;return;} /* a re-draw keeps its place */
  const body=el('panelBody');let c=body&&body.querySelector('.pgt.cur');if(!c)return;
  if(c.closest('.pgsec.fold')||c.hidden){const s=c.closest('.pgsec').querySelector('.pgch');if(s)GRID.fold[+s.dataset.p]=false;GRID.flt='all';rqGridRender(body);return;}
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
