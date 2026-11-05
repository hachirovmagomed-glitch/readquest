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
  if(GRID.sb){GRID.sb.remove();GRID.sb=null;}
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
/** page → {bm, name, c:[colour keys], note, r:[[x,y,w,h,colour]], dy} for the marks on the pictures */
function rqGridMarks(b){
  const out={},at=function(i){return out[i]||(out[i]={bm:false,name:'',c:[],note:false,r:[],dy:false});};
  (S.marks[b.id]||[]).forEach(function(m){if(m&&m.page>0){const o=at(m.page-1);o.bm=true;if(m.t&&!o.name)o.name=String(m.t);}});
  (S.quotes[b.id]||[]).forEach(function(q){if(!q)return;let p=-1;try{p=quotePage(b,q);}catch(e){}if(p<0)return;
    const o=at(p),k=typeof hlKey==='function'?hlKey(q.c):q.c;if(o.c.indexOf(k)<0)o.c.push(k);if(q.note)o.note=true;
    try{rqGridQuoteRects(b,q,k).forEach(function(x){const t=at(x.p);if(t.r.length<40)t.r.push([x.x,x.y,x.w,x.h,k]);});}catch(e){}});
  try{const y=typeof diaryOf==='function'&&diaryOf(b.id);if(y&&Array.isArray(y.e))y.e.forEach(function(e){if(e&&e.pg>0&&e.pg<=R.pageCount)at(e.pg-1).dy=true;});}catch(e){}
  return out;
}
/** 04.11 пункт 4: where a quote's highlight lies on its page, as shares of the picture — PDF from its saved boxes, a text book from
    its marks in #content (columns: page = x / step; «Прокрутка»: page = y / step). The picture keeps the side fields (rqGridText). */
function rqGridQuoteRects(b,q,k){
  const out=[];
  if(R.mode==='pdf'){if(typeof pdfParts!=='function'||!q.pdf||!Array.isArray(q.pdf.r))return out;
    pdfParts(q).forEach(function(x){(typeof hlLines==='function'?hlLines(x.r):x.r).forEach(function(r){out.push({p:x.p,x:r[0],y:r[1]+(x.v===2?0:r[3]*0.23),w:r[2],h:r[3]});});});return out;}
  if(typeof quoteMarksOf!=='function'||!R.step)return out;
  const v=el('viewer'),c=el('content'),W=v.clientWidth,H=v.clientHeight,m=SET.margin||0,cr=c.getBoundingClientRect(),sc=rqScrollMode();if(!W||!H)return out;
  quoteMarksOf(b,q).forEach(function(mk){[...mk.getClientRects()].forEach(function(r){if(r.width<1)return;
    const dx=r.left-cr.left,dy=r.top-cr.top,p=Math.floor((sc?dy:dx)/R.step),x=sc?dx:dx-p*R.step,y=sc?dy-p*R.step:dy;
    if(p<0||p>=R.pageCount)return;out.push({p:p,x:(m+x)/(W+2*m),y:y/H,w:r.width/(W+2*m),h:r.height/H});});});
  return out;
}
/** 04.11 пункт 6: the page's own number in a PDF (page labels: «xii», «245»), '' when it is just the order number */
function rqGridLabel(i){if(R.mode!=='pdf'||typeof pdfLabel!=='function')return '';const l=pdfLabel(i);return l!==String(i+1)?l:'';}
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
  if(m&&m.r.length)ov+='<span class="pghl" aria-hidden="true">'+m.r.map(function(r){const pc=function(v){return (Math.max(0,Math.min(1,v))*100).toFixed(2)+'%';};
    return '<i style="left:'+pc(r[0])+';top:'+pc(r[1])+';width:'+pc(r[2])+';height:'+pc(Math.max(r[3],0.012))+';--d:'+hlDot(r[4])+'"></i>';}).join('')+'</span>';
  if(m&&m.dy)ov+='<span class="pgdy" role="img" aria-label="Запись в дневнике">'+rqIcon('notebook-pen',12)+'</span>';
  if(o.sel)ov+='<span class="pgck" aria-hidden="true">'+rqIcon('check',14)+'</span>';
  const lb=rqGridLabel(i),num=lb?'<b>'+esc(lb)+'</b><small> · '+(i+1)+'</small>':String(i+1);
  const lab='Страница '+(lb?lb+' ('+(i+1)+')':i+1)+(bm?', закладка'+(m.name?' «'+m.name+'»':''):'')+(m&&m.c.length?', цитаты':'')+(m&&m.note?', заметка':'')+(hit?', найдено '+hit:'')+(i<o.readTo?', прочитана':'');
  const cls='pgt'+(cur?' cur':'')+(i<o.readTo&&!cur?' rd':'')+(bm?' hbm':'')+(m&&(m.c.length||m.note)?' hq':'')+(hit?' hfind':'')+(o.chStart[i]?' hch':'')+(o.sel&&o.sel.has(i)?' sel':'');
  return '<div class="'+cls+'" data-n="'+i+'"><button type="button" class="pgopen" aria-label="'+lab+'"'+(cur?' aria-current="page"':'')+'><span class="pgfr"><span class="pgth"></span>'+ov+'</span><span class="pgn">'+num+'</span>'+(m&&m.name?'<span class="pgbmn">'+esc(m.name)+'</span>':'')+'</button>'+
    '<button type="button" class="pgbmb'+(bm?' on':'')+'" aria-pressed="'+bm+'" aria-label="'+(bm?'Убрать закладку со страницы ':'Закладка на страницу ')+(i+1)+'. Долгое нажатие — название">'+rqIcon('bookmark',14)+'</button></div>';
}
const GRID_FLT=[['all','Все'],['bm','Закладки'],['q','Цитаты'],['ch','Главы'],['find','Найдено']];
function rqGridRender(body){
  rqGridStop();
  const b=R.book,n=R.pageCount,mk=rqGridMarks(b),chs=rqGridChapters(b),hits=rqGridHits(b),readTo=rqGridReadTo(),chStart={};chs.forEach(function(c){chStart[c.p]=1;});
  if(GRID.bid!==b.id){GRID.bid=b.id;GRID.flt='all';GRID.fold={};GRID.sel=null;GRID.sOpen=false;}
  if(GRID.flt==='find'&&!hits&&!(GRID.sOpen&&rqGridFindQ().length>=2))GRID.flt='all'; /* an open search with nothing found keeps «Ничего не найдено» */
  const asp=rqGridAspect(),o={readTo:readTo,hits:hits,chStart:chStart,sel:GRID.sel},pct=Math.round(readTo/Math.max(1,n-1)*100);
  let html='<form class="pgrow pgtop" onsubmit="return false"><label class="pggo"><span>Стр.</span><input id="pgGoN" type="number" inputmode="numeric" enterkeyhint="go" min="1" max="'+n+'" placeholder="1–'+n+'" aria-label="Номер страницы, от 1 до '+n+'"></label>'+
    '<button type="submit" class="pgbtn" data-go>Перейти</button><span class="spacer"></span><button type="button" class="pgbtn pgcurb" data-cur>'+rqIcon(typeof tocNowIcon==='function'?tocNowIcon():'book-open',16)+'К текущей</button></form><div class="pgbar">'+
    '<div class="pgrow"><div class="pgflt" role="group" aria-label="Показать страницы">'+GRID_FLT.filter(function(f){return f[0]!=='find'||hits;}).map(function(f){
      return '<button type="button" class="fchip'+(GRID.flt===f[0]?' on':'')+'" data-flt="'+f[0]+'" aria-pressed="'+(GRID.flt===f[0])+'">'+(f[0]==='find'?rqIcon('search',13)+'Найдено':f[1])+'</button>';}).join('')+
    '</div><button type="button" class="pgbtn pgico'+(GRID.sOpen?' on':'')+'" data-find aria-pressed="'+!!GRID.sOpen+'" aria-label="Поиск по книге" title="Поиск по книге">'+rqIcon('search',16)+'</button>'+
    '<button type="button" class="pgbtn pgico'+(GRID.sel?' on':'')+'" data-sel aria-pressed="'+!!GRID.sel+'" aria-label="Выбрать страницы" title="Выбрать страницы">'+rqIcon('circle-check',16)+'</button>'+
    '<button type="button" class="pgbtn pgsz" data-cols aria-label="Размер миниатюр: '+rqGridCols()+' в ряд" title="Размер миниатюр">'+rqIcon('layers',16)+'<b>'+rqGridCols()+'</b></button></div>'+
    (GRID.sOpen?'<form class="pgrow pgfind" onsubmit="return false"><label class="pgfq">'+rqIcon('search',16)+'<input id="pgFindQ" type="search" enterkeyhint="search" autocomplete="off" placeholder="Слово или фраза в книге" aria-label="Найти в книге" value="'+esc(rqGridFindQ())+'"></label><span class="pgfn" aria-live="polite"></span></form>':'')+
    rqGridRecentRow()+
    '<div class="pgprog" role="progressbar" aria-label="Прочитано" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'" title="Прочитано '+pct+'%"><i style="width:'+pct+'%"></i></div></div>';
  html+='<div class="pgsecs pgc'+rqGridCols()+(GRID.sel?' selmode':'')+'" data-f="'+GRID.flt+'" style="--pg-asp:'+(1/asp).toFixed(4)+'">';
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
  const secs=body.querySelector('.pgsecs'),bar=body.querySelector('.pgbar'),top=body.querySelector('.pgtop'),seq=GRID.seq;
  rqGridTileH(secs);
  body.style.setProperty('--pgbar-h',top.offsetHeight+'px'); /* 04.11: only «Стр. · Перейти · К текущей» stays on top, the rows under it scroll away */
  rqGridFilterApply(body);
  secs.addEventListener('click',function(e){
    const ch=e.target.closest('.pgch');if(ch){rqGridFold(+ch.dataset.p);return;}
    const t=e.target.closest('.pgt');if(!t)return;
    if(GRID.sel){rqGridSelToggle(t);return;}
    if(e.target.closest('.pgbmb')){rqGridMarkToggle(+t.dataset.n);return;}
    rqGridGo(+t.dataset.n);});
  top.addEventListener('submit',function(e){e.preventDefault();rqGridGoTyped();});
  top.querySelector('[data-cur]').onclick=function(){rqGridShowCur(true);};
  bar.querySelector('[data-cols]').onclick=function(){rqGridSetCols(GRID_COLS[(GRID_COLS.indexOf(rqGridCols())+1)%GRID_COLS.length]);};
  bar.querySelector('[data-find]').onclick=function(){GRID.sOpen=!GRID.sOpen;if(!GRID.sOpen&&GRID.flt==='find')GRID.flt='all';rqGridRedo();if(GRID.sOpen)setTimeout(function(){const q=el('pgFindQ');if(q)try{q.focus();}catch(e){}},0);};
  bar.querySelector('[data-sel]').onclick=function(){GRID.sel=GRID.sel?null:new Set();rqGridRedo();};
  const fq=bar.querySelector('#pgFindQ');if(fq){let tm=null;fq.addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(function(){rqGridFind(fq.value);},350);});
    bar.querySelector('.pgfind').addEventListener('submit',function(e){e.preventDefault();clearTimeout(tm);rqGridFind(fq.value);try{fq.blur();}catch(_){}});rqGridFindCount();}
  bar.querySelectorAll('[data-rec]').forEach(function(x){x.onclick=function(){rqGridGo(+x.dataset.rec);};});
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
  },{rootMargin:'500px 0px'});
  secs.querySelectorAll('.pgt').forEach(function(t){GRID.io.observe(t);});
  GRID.fly=null;body.addEventListener('scroll',function fl(){if(seq!==GRID.seq){body.removeEventListener('scroll',fl);return;}
    const now=performance.now(),y=body.scrollTop,f=GRID.fly;GRID.fly={t:now,y:y,v:f&&now>f.t?Math.abs(y-f.y)/(now-f.t):0};},{passive:true});
  GRID.chs=chs;GRID.mk=mk;GRID.hitsNow=hits;GRID.readTo=readTo;rqGridScroller(body,seq);rqGridSelBar();
  requestAnimationFrame(function(){if(seq===GRID.seq)rqGridShowCur(false);});
}
/** the height a far-away tile keeps (its content is skipped): one real tile, measured */
function rqGridTileH(secs,again){
  const t=secs.querySelector('.pgt:not([hidden]):not(.cur)')||secs.querySelector('.pgt'),o=t&&t.querySelector('.pgopen');if(!o)return;
  const h=o.offsetHeight; /* the inside is measured: a skipped tile itself reports its stand-in height; offsetHeight: the panel may still be scaling in */
  if(h>0)secs.style.setProperty('--pgt-h',h+'px'); /* contain-intrinsic-size is the content box: the padding comes on top by itself */
  else if(!again)requestAnimationFrame(function(){if(secs.isConnected)rqGridTileH(secs,true);});
}
/** re-draw the grid where it was (after a bookmark, a fold, another size) */
function rqGridRedo(y0){const B=el('panelBody');if(!B||panelTab!=='grid')return;const y=y0>=0?y0:B.scrollTop;rqGridRender(B);GRID.keepY=true;B.scrollTop=y;
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
/* the click a finger makes when it lets go after a long press would land on what the press opened (the large view, the name box) */
document.addEventListener('click',function(e){if(GRID.lp&&Date.now()-GRID.lp<900){GRID.lp=0;e.preventDefault();e.stopPropagation();}},true);
/** 4: hold a page ~half a second → it opens large over the grid */
function rqGridLongPress(secs){
  let tm=null,x0=0,y0=0;const stop=function(){clearTimeout(tm);tm=null;};
  secs.addEventListener('pointerdown',function(e){const t=e.target.closest('.pgt');if(!t||e.target.closest('.pgch'))return;const rib=!GRID.sel&&!!e.target.closest('.pgbmb');x0=e.clientX;y0=e.clientY;stop();
    tm=setTimeout(function(){tm=null;GRID.lp=Date.now();try{if(navigator.vibrate)navigator.vibrate(12);}catch(_){}if(rib)rqGridMarkName(+t.dataset.n);else rqGridPreview(+t.dataset.n);},480);});
  secs.addEventListener('pointermove',function(e){if(tm&&Math.hypot(e.clientX-x0,e.clientY-y0)>10)stop();});
  ['pointerup','pointercancel','pointerleave'].forEach(function(k){secs.addEventListener(k,stop);});
  secs.addEventListener('contextmenu',function(e){if(e.target.closest('.pgt'))e.preventDefault();});
}
function rqGridPreviewClose(){const v=GRID.pv;GRID.pv=null;if(!v)return;const t=v.el.querySelector('.pgt');if(t){rqGridEmpty(t);GRID.live.delete(t);}v.el.remove();}
function rqGridPreview(i){
  rqGridPreviewClose();const panel=el('panel'),b=R.book;if(!panel||!b)return;
  const mm=(S.marks[b.id]||[]).find(function(m){return m&&m.page===i+1;}),bm=!!mm,asp=rqGridAspect(),ch=rqGridChapterOf(i),lb=rqGridLabel(i);
  const dy=typeof diaryQuickNote==='function'&&(typeof qDiaryOn!=='function'||qDiaryOn());
  const w=document.createElement('div');w.className='pgpv';w.setAttribute('role','dialog');w.setAttribute('aria-label','Страница '+(i+1));
  w.innerHTML='<div class="pgpvc" style="--pg-asp:'+(1/asp).toFixed(4)+'"><div class="pgpvh"><b>Стр. '+esc(lb||String(i+1))+'</b>'+(lb?'<small>'+(i+1)+'-я</small>':'')+(ch?'<span>'+esc(ch)+'</span>':'')+'<button type="button" class="closes" data-x aria-label="Закрыть">'+rqIcon('x',20)+'</button></div>'+
    '<div class="pgt pgpvt" data-n="'+i+'"><span class="pgfr"><span class="pgth"></span></span></div>'+
    (mm&&mm.t?'<button type="button" class="pgpvn" data-name>'+rqIcon('bookmark',14)+'<span>'+esc(mm.t)+'</span>'+rqIcon('pencil',14)+'</button>':'')+
    '<div class="pgpva"><button type="button" class="pgbtn" data-bm aria-pressed="'+bm+'">'+rqIcon('bookmark',16)+(bm?'Снять закладку':'Закладка')+'</button>'+
    (dy?'<button type="button" class="pgbtn" data-note>'+rqIcon('notebook-pen',16)+'Заметка</button>':'')+'<button type="button" class="pgbtn pgpvgo" data-open>'+rqIcon('book-open',16)+'Открыть</button></div></div>';
  panel.appendChild(w);GRID.pv={el:w,n:i};
  const fr=w.querySelector('.pgfr'),H=Math.max(120,panel.clientHeight-200),W=Math.max(120,panel.clientWidth-64);fr.style.width=Math.floor(Math.min(W,H/asp))+'px';
  w.addEventListener('click',function(e){if(e.target===w||e.target.closest('[data-x]')){rqGridPreviewClose();return;}
    if(e.target.closest('[data-open]')){rqGridPreviewClose();rqGridGo(i);return;}
    if(e.target.closest('[data-name]')){rqGridMarkName(i);return;}
    if(e.target.closest('[data-note]')){rqGridNote(i);return;}
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
  const s=document.createElement('div');s.className='pgscr';s.innerHTML=rqGridMapHtml()+'<span class="pgscr-tip" aria-hidden="true"></span><span class="pgscr-th" role="scrollbar" aria-label="Быстрая прокрутка страниц" aria-orientation="vertical" aria-controls="panelBody" tabindex="-1"><i></i></span>';
  panel.appendChild(s);GRID.scr=s;
  const th=s.querySelector('.pgscr-th'),tip=s.querySelector('.pgscr-tip');
  const max=function(){return Math.max(1,body.scrollHeight-body.clientHeight);};
  const place=function(){if(seq!==GRID.seq)return;
    const bar=body.querySelector('.pgbar'),bt=body.getBoundingClientRect().top,under=bar?bar.getBoundingClientRect().bottom-bt:0; /* below the rows that scroll away, never over their buttons */
    const top=body.offsetTop+Math.max(parseFloat(body.style.getPropertyValue('--pgbar-h'))||0,under),h=body.clientHeight-(top-body.offsetTop);
    s.style.top=top+'px';s.style.height=Math.max(0,h-8)+'px';
    th.hidden=body.scrollHeight<body.clientHeight*3;s.classList.toggle('nomap',R.pageCount<8);
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
  /* 04.11 пункт 1: the book map — a tap or a drag on it brings that place of the book into view */
  const mp=s.querySelector('.pgmap');let md=null;
  const mapAt=function(e){const r=mp.getBoundingClientRect(),f=Math.max(0,Math.min(1,(e.clientY-r.top)/Math.max(1,r.height)));return Math.round(f*(R.pageCount-1));};
  const mapTip=function(p){const c=rqGridChapterOf(p),lb=rqGridLabel(p);tip.innerHTML='<b>стр. '+esc(lb||String(p+1))+'</b>'+(c?'<span>'+esc(c)+'</span>':'');
    const r=mp.getBoundingClientRect();tip.style.transform='translateY('+((p/Math.max(1,R.pageCount-1))*r.height).toFixed(1)+'px) translateY(-50%)';};
  if(mp){mp.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();md={id:e.pointerId};s.classList.add('on','onmap');try{mp.setPointerCapture(e.pointerId);}catch(_){}const p=mapAt(e);mapTip(p);rqGridReveal(p,false);});
    mp.addEventListener('pointermove',function(e){if(!md||e.pointerId!==md.id)return;e.preventDefault();const p=mapAt(e);mapTip(p);rqGridReveal(p,false);});
    const mup=function(e){if(!md||e.pointerId!==md.id)return;md=null;s.classList.remove('on','onmap');try{mp.releasePointerCapture(e.pointerId);}catch(_){}};
    mp.addEventListener('pointerup',mup);mp.addEventListener('pointercancel',mup);}
  body.addEventListener('scroll',function sc(){if(seq!==GRID.seq){body.removeEventListener('scroll',sc);return;}place();if(d)tipShow();},{passive:true});
  requestAnimationFrame(place);setTimeout(place,350);
}
function rqGridGo(n){const from=R.mode==='pdf'&&typeof P!=='undefined'&&P.shown>=0?P.shown:R.page;rqGridStop();rqGridSelClose();jumpTo(n);el('panel').classList.add('hidden');if(n!==from&&typeof showJumpBack==='function')showJumpBack(from);}
/** fill the wanted tiles, nearest to the middle of the screen first. PDF: strictly one render at a time.
    04.11 (Джессика: «чутка подтормаживает в начале»): text pages come in batches (rqTextPageCopies: one re-layout per batch, not
    one per page), a copy once made is kept (GRID_TC, ~160 pages) so scrolling back costs only a clone, and nothing new is made
    while the grid flies fast under the finger: a frame is never held up mid-fling, the pictures come in as it slows down. */
const GRID_TC={key:'',m:new Map()};
function rqGridTcKey(){const v=el('viewer'),c=el('content');
  return [R.book&&R.book.id,R.step,R.pageCount,v.clientWidth,v.clientHeight,SET.margin||0,rqScrollMode()?1:0,c.children.length,c.style.cssText].join('|');}
function rqGridTcGet(n){const m=GRID_TC.m,s=m.get(n);if(s){m.delete(n);m.set(n,s);}return s||null;}
function rqGridTcPut(n,s){const m=GRID_TC.m;m.set(n,s);while(m.size>160)m.delete(m.keys().next().value);}
function rqGridTcCheck(){const k=rqGridTcKey();if(k!==GRID_TC.key){GRID_TC.key=k;GRID_TC.m.clear();}}
function rqGridFast(){const f=GRID.fly;return !!f&&performance.now()-f.t<110&&f.v>1.1;} /* px per ms */
function rqGridNear(){
  const body=el('panelBody');if(!body||GRID.want.length<2)return;
  const br=body.getBoundingClientRect(),mid=br.top+br.height/2;
  GRID.want.sort(function(a,b){const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
    return Math.abs(ra.top+ra.height/2-mid)-Math.abs(rb.top+rb.height/2-mid)||(+a.dataset.n)-(+b.dataset.n);});
}
function rqGridPump(seq){
  if(GRID.busy||seq!==GRID.seq)return;
  GRID.want=GRID.want.filter(function(t){return t.isConnected&&!t.classList.contains('done');});
  if(!GRID.want.length)return;
  if(rqGridFast()){clearTimeout(GRID.flyT);GRID.flyT=setTimeout(function(){rqGridPump(seq);},120);return;}
  rqGridNear();
  GRID.busy=true;
  const fin=function(){GRID.busy=false;if(seq===GRID.seq)setTimeout(function(){rqGridPump(seq);},0);};
  if(R.mode==='pdf'){const t=GRID.want.shift();rqGridPdf(t,seq).then(fin,fin);return;}
  try{
    rqGridTcCheck();
    const take=GRID.want.splice(0,12),need=[],sz=rqGridSz(take[0]);sz.ok=true;
    take.forEach(function(t){const n=+t.dataset.n;if(!GRID_TC.m.has(n))need.push(n);});
    if(need.length){
      if(rqScrollMode())need.forEach(function(n){const s=rqGridScrollCopy(n);if(s)rqGridTcPut(n,s);});
      else{const got=rqTextPageCopies(need);Object.keys(got).forEach(function(n){rqGridTcPut(+n,got[n]);});}
    }
    take.forEach(function(t){try{rqGridText(t,sz);}catch(e){}});
  }catch(e){}
  fin();
}
/** sz: the sizes read once for a whole batch (reading a size after a picture went in would lay the page out again each time) */
function rqGridSz(t){const v=el('viewer'),b=t&&t.querySelector('.pgth');return {W:v.clientWidth,H:v.clientHeight,w:b?b.clientWidth:0};}
function rqGridText(t,sz){
  const box=t.querySelector('.pgth');sz=sz||rqGridSz(t);const W=sz.W,H=sz.H,w=sz.w;
  if(!w||!W)return;
  const n=+t.dataset.n;if(!sz.ok)rqGridTcCheck();
  let src=rqGridTcGet(n);
  if(!src){src=rqScrollMode()?rqGridScrollCopy(n):rqTextPageCopy(n);if(!src)return;rqGridTcPut(n,src);}
  const sheet=src.cloneNode(true);
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

/* ===== 04.11 (Джессика: «как ещё удобнее?» → «первое, третье, четыре … девять, реализуй это все») =====
   1 the book map on the right edge, 3 search right in «Обзор», 4 highlights drawn on the pictures, 5 recent places, 6 a PDF's own page
   numbers, 7 a diary note to a page from the large view, 8 pick several pages → copy their text / recognise the scans, 9 a bookmark's name. */
/** 1: the map: read part, bookmarks, quotes, search hits and «you are here», each at its share of the book */
function rqGridMapHtml(){
  const N=Math.max(1,R.pageCount),f=function(p){return (p/Math.max(1,N-1)*100).toFixed(2)+'%';},mk=GRID.mk||{},h=GRID.hitsNow||{};let t='';
  Object.keys(mk).forEach(function(k){const m=mk[k],p=+k;if(m.bm)t+='<i class="mbm" style="top:'+f(p)+'"></i>';if(m.c.length)t+='<i class="mq" style="top:'+f(p)+';--d:'+hlDot(m.c[0])+'"></i>';});
  Object.keys(h).forEach(function(k){t+='<i class="mf" style="top:'+f(+k)+'"></i>';});
  return '<span class="pgmap" aria-hidden="true"><span class="mrd" style="height:'+f(GRID.readTo||0)+'"></span>'+t+'<i class="mnow" style="top:'+f(R.page)+'"></i></span>';
}
/** bring page p into view in the grid (a filter or a folded chapter that hides it gives way) */
function rqGridReveal(p,smooth){
  const B=el('panelBody');if(!B)return;let t=B.querySelector('.pgt[data-n="'+p+'"]');if(!t)return;
  if(t.hidden||t.closest('.pgsec.fold')){const h=t.closest('.pgsec').querySelector('.pgch');if(h)GRID.fold[+h.dataset.p]=false;if(t.hidden)GRID.flt='all';rqGridRedo();t=B.querySelector('.pgt[data-n="'+p+'"]');if(!t)return;}
  const br=B.getBoundingClientRect(),r=t.getBoundingClientRect(),top=B.scrollTop+r.top-br.top-(B.clientHeight-r.height)/2;
  try{B.scrollTo({top:Math.max(0,top),behavior:smooth&&!(typeof rqStill==='function'&&rqStill())?'smooth':'auto'});}catch(e){B.scrollTop=Math.max(0,top);}
}
/** 3: the search field in «Обзор» runs the book search (js/book-find.js, the same as the magnifier) and shows «Найдено» */
function rqGridFindQ(){try{return typeof BF!=='undefined'&&BF.book===R.book.id?BF.q:'';}catch(e){return '';}}
function rqGridFind(v){
  if(typeof bfSet!=='function'||!R.book)return;
  BF.book=R.book.id;BF.rid=R;bfSet(v);const q=BF.q;GRID.flt=q.length>=2?'find':'all';
  clearInterval(GRID.fiv);const fin=function(){if(BF.q!==q||panelTab!=='grid'||el('panel').classList.contains('hidden')){clearInterval(GRID.fiv);return;}
    if(!BF.busy){clearInterval(GRID.fiv);GRID.flt=q.length>=2?'find':'all';rqGridRedoFind();}else rqGridFindCount();};
  if(BF.busy)GRID.fiv=setInterval(fin,400);
  rqGridRedoFind();
}
function rqGridRedoFind(){const B=el('panelBody');if(!B||panelTab!=='grid')return;const f=el('pgFindQ'),foc=f&&document.activeElement===f,pos=f?f.selectionStart:0;
  rqGridRedo(0);const g=el('pgFindQ');if(g&&foc){try{g.focus({preventScroll:true});g.setSelectionRange(pos,pos);}catch(e){}}
  if(GRID.flt==='find'&&!GRID.hitsNow){const no=B.querySelector('.pgnone');B.querySelectorAll('.pgsec').forEach(function(x){x.hidden=true;});
    if(no){no.hidden=false;no.innerHTML=rqIcon('search',28)+'<div>'+(BF.busy?'Ищу…':BF.noText?'В этом PDF нет текста, искать не по чему':'Ничего не найдено')+'</div>';}}
  rqGridFindCount();}
function rqGridFindCount(){const n=document.querySelector('#panelBody .pgfn');if(!n)return;
  const q=rqGridFindQ();if(!q||q.length<2){n.textContent='';return;}
  const pages=GRID.hitsNow?Object.keys(GRID.hitsNow).length:0;
  n.textContent=BF.busy?'Ищу… '+(BF.prog||0)+' из '+R.pageCount:BF.hits.length?BF.hits.length+(BF.hits.length>=BF_MAX?'+':'')+' на '+pages+' стр.':'нет';}
/** 5: recent places — pages left by a jump (slider, contents, search, «Обзор» …), newest first; memory only, while the book is open */
function rqRecentNote(from,to){
  if(!R||!R.book||!(from>=0)||from===to)return;const a=R.rqRecent=(R.rqRecent||[]).filter(function(p){return p!==from&&p!==to;});a.unshift(from);if(a.length>6)a.length=6;
}
function rqGridRecentRow(){
  const a=(R.rqRecent||[]).filter(function(p){return p!==R.page&&p>=0&&p<R.pageCount;}).slice(0,5);if(!a.length)return '';
  return '<div class="pgrow pgrec"><span class="pgrecl">'+rqIcon('rotate-cw',14)+'Был на</span>'+a.map(function(p){const lb=rqGridLabel(p);
    return '<button type="button" class="fchip" data-rec="'+p+'" aria-label="Вернуться на страницу '+esc(lb||String(p+1))+'">стр. '+esc(lb||String(p+1))+'</button>';}).join('')+'</div>';
}
/** 7: a diary note to page i (js/diary.js diaryQuickNote) */
function rqGridNote(i){if(typeof diaryQuickNote!=='function')return;const r=diaryQuickNote(i);if(r&&r.then)r.then(function(){const pv=GRID.pv&&GRID.pv.n===i;rqGridRedo();if(pv)rqGridPreview(i);});}
/** 9: a bookmark's name (marks[].t, the same field as «Закладка здесь»); no bookmark yet → it is made first */
function rqGridMarkName(i){
  const b=R.book;if(!b)return;let arr=(S.marks[b.id]=S.marks[b.id]||[]),m=arr.find(function(x){return x&&x.page===i+1;});
  rqAsk({t:'Название закладки',p:'стр. '+(rqGridLabel(i)||String(i+1)),ok:'Сохранить',input:m&&m.t||''}).then(function(v){
    if(v==null||v===false)return;v=String(v).replace(/\s+/g,' ').trim().slice(0,60);
    arr=(S.marks[b.id]=S.marks[b.id]||[]);m=arr.find(function(x){return x&&x.page===i+1;});
    if(!m){m={ratio:R.pageCount>1?i/(R.pageCount-1):0,page:i+1,date:today()};arr.push(m);if(typeof diaryAuto==='function')diaryAuto(b.id);}
    if(v)m.t=v;else delete m.t;save();flashMsg(v?'Закладка «'+v+'»':'Закладка без названия');
    const pv=GRID.pv&&GRID.pv.n===i;rqGridRedo();if(pv)rqGridPreview(i);});
}
/** 8: pick several pages */
function rqGridSelToggle(t){const n=+t.dataset.n;if(GRID.sel.has(n))GRID.sel.delete(n);else GRID.sel.add(n);
  t.classList.toggle('sel',GRID.sel.has(n));let c=t.querySelector('.pgck');if(!c){t.querySelector('.pgfr').insertAdjacentHTML('beforeend','<span class="pgck" aria-hidden="true">'+rqIcon('check',14)+'</span>');}
  t.querySelector('.pgopen').setAttribute('aria-pressed',String(GRID.sel.has(n)));rqGridSelBar();}
function rqGridSelClose(){GRID.sel=null;if(GRID.sb){GRID.sb.remove();GRID.sb=null;}}
function rqGridSelBar(){
  const panel=el('panel');if(GRID.sb){GRID.sb.remove();GRID.sb=null;}if(!GRID.sel||!panel)return;
  const n=GRID.sel.size,pdf=R.mode==='pdf',d=document.createElement('div');d.className='pgselbar';d.setAttribute('role','toolbar');d.setAttribute('aria-label','Выбранные страницы');
  d.innerHTML='<span class="pgseln">'+(n?'Выбрано: '+n:'Нажимайте на страницы')+'</span>'+
    '<button type="button" class="pgbtn" data-scopy'+(n?'':' disabled')+'>'+rqIcon('copy',16)+'Копировать текст</button>'+
    (pdf?'<button type="button" class="pgbtn" data-socr'+(n?'':' disabled')+'>'+rqIcon('scan-text',16)+'Распознать</button>':'')+
    '<button type="button" class="closes" data-sx aria-label="Отменить выбор">'+rqIcon('x',18)+'</button>';
  panel.appendChild(d);GRID.sb=d;
  d.addEventListener('click',function(e){if(e.target.closest('[data-sx]')){rqGridSelClose();rqGridRedo();return;}
    if(e.target.closest('[data-scopy]'))rqGridSelCopy();else if(e.target.closest('[data-socr]'))rqGridSelOcr();});
}
/** the text of page n: PDF — the same text as the search (recognised words for a scan), text book — the page's copy */
async function rqGridPageText(n){
  if(R.mode==='pdf')return typeof bfPdfText==='function'?await bfPdfText(n):'';
  const sh=rqScrollMode()?rqGridScrollCopy(n):rqTextPageCopy(n);if(!sh)return '';
  const t=sh.querySelector('.rqCurlTxt')||sh;return String(t.innerText||t.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
}
async function rqGridSelCopy(){
  const ps=[...(GRID.sel||[])].sort(function(a,b){return a-b;});if(!ps.length)return;const doc=R.pdf,bk=R.book;
  flashMsg('Собираю текст '+ps.length+' стр.…');const out=[];let empty=0;
  for(const n of ps){const t=await rqGridPageText(n);if(R.book!==bk||R.pdf!==doc)return;if(!t.trim())empty++;out.push('— стр. '+(rqGridLabel(n)||String(n+1))+' —\n'+t.trim());}
  copyText(out.join('\n\n'));GRID.lastCopy=out.join('\n\n');
  flashMsg(empty===ps.length?'На этих страницах нет текста: распознайте их':'Скопирован текст '+ps.length+' стр.'+(empty?' (без текста: '+empty+')':''));
}
async function rqGridSelOcr(){
  const ps=[...(GRID.sel||[])].sort(function(a,b){return a-b;});if(!ps.length||R.mode!=='pdf'||typeof ocrState!=='function')return;
  let st=null;try{st=await ocrState();}catch(e){}
  if(!st||!st.have){if(typeof ocrOpen==='function')ocrOpen(ps[0],true);return;} /* the sheet offers the one-time download */
  const bid=R.book.id,doc=R.pdf;let made=0,skip=0;
  try{const w=await ocrWorker();
    for(let k=0;k<ps.length;k++){const n=ps[k];if(!R.book||R.book.id!==bid||R.pdf!==doc)return;
      flashMsg('Распознаю стр. '+(n+1)+' ('+(k+1)+' из '+ps.length+')…');
      if(!(await ocrPageNeeds(n))){skip++;continue;}
      const pc=await ocrPageCanvas(n),r=await w.recognize(pc.cv,{},{blocks:true,text:true});
      await ocrSave(bid,n,{w:pc.w,items:ocrItems(r.data||{},pc.sc)});made++;
      try{if(typeof BF!=='undefined'&&BF.pdfTxt)BF.pdfTxt[n]=null;}catch(e){}
      if(typeof pdfRestyle==='function'&&n===(P.shown>=0?P.shown:R.page))pdfRestyle();}
  }catch(e){flashMsg('Не получилось распознать'+(e&&e.message?': '+e.message:''));return;}
  if(typeof ocrChipUpd==='function')ocrChipUpd();
  flashMsg(made?'Распознано: '+made+' стр.'+(skip?', уже с текстом: '+skip:''):'На этих страницах уже есть текст');
}
