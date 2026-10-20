/* 20.10 Джессика: «наверх лупу, чтобы быстро ориентироваться в документе» (как в ReadEra) + черточки глав на ползунке.
   1) Лупа в шапке читалки → экран поиска поверх книги: ← · строка · ✕, ниже совпадения с кусочком текста и номером страницы.
      TXT / FB2 / EPUB: ищем в тексте, разложенном по страницам (#content), номер страницы — настоящий (pageOfAnchor).
      PDF: по текстовому слою страниц (getTextContent), по мере поиска; PDF из картинок честно говорит, что текста нет.
      Тап по совпадению → страница, найденное подсвечено (CSS Highlight API), внизу плашка «‹ 3 из 57 › ✕»,
      слева обычная плашка «< на стр. N» — вернуться туда, откуда начали искать.
   2) Черточки глав на ползунке страниц (#pgTicks): по оглавлению книги (у PDF — по его закладкам), свои в каждом скине
      (CSS: app.html для обычных тем, skins.css для скинов). Пока тащишь ползунок, в подсказке над ним название главы.
   Ничего не пишет в S / localStorage / экспорт: запрос, найденное и оглавление PDF живут только в памяти открытой книги. */
const BF={q:'',hits:[],cur:-1,from:null,book:null,rid:null,tok:0,busy:false,done:true,idx:null,shown:0,pdfTxt:null,pdfDoc:null,noText:false,mo:null};
const BF_MAX=2000,BF_STEP=60;
function bfNorm(s){return s.toLowerCase().replace(/ё/g,'е').replace(/\s/g,' ');}
/* same length as the source string (offsets stay valid): a char whose lower case is longer (İ) stays as it is */
function bfLow(s){const l=bfNorm(s);if(l.length===s.length)return l;
  let o='';for(let i=0;i<s.length;i++){const c=s[i],x=bfNorm(c);o+=x.length===1?x:c;}return o;}
function bfQuery(q){return bfNorm(String(q||'').trim()).replace(/ {2,}/g,' ');}
function bfIsPdf(){return R&&R.mode==='pdf'&&!!R.pdf;}
function bfOpenNow(){const o=el('bookFind');return !!(o&&!o.hidden);}

/* ---------- DOM ---------- */
function bfBuild(){
  if(el('bookFind'))return;
  const o=document.createElement('div');o.id='bookFind';o.className='bfind';o.hidden=true;
  o.setAttribute('role','dialog');o.setAttribute('aria-label','Поиск по книге');
  o.innerHTML='<header class="rhead bfhead"><button id="bfBack" type="button" aria-label="Назад">'+rqIcon('arrow-left')+'</button>'+
    '<input id="bfQ" type="text" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Поиск по тексту" aria-label="Поиск по тексту">'+
    '<button id="bfClr" type="button" aria-label="Очистить">'+rqIcon('x')+'</button></header>'+
    '<div id="bfStat" class="bfstat" aria-live="polite"></div><div id="bfList" class="bflist"></div>';
  document.body.appendChild(o);
  const p=document.createElement('div');p.id='bfPill';p.className='bfpill hidden';
  p.innerHTML='<button id="bfPrev" type="button" aria-label="Предыдущее совпадение">'+rqIcon('chevron-left',20)+'</button>'+
    '<button id="bfNum" type="button" aria-label="Список совпадений"></button>'+
    '<button id="bfNext" type="button" aria-label="Следующее совпадение">'+rqIcon('chevron-right',20)+'</button>'+
    '<button id="bfEnd" type="button" aria-label="Закончить поиск">'+rqIcon('x',18)+'</button>';
  el('reader').appendChild(p);
  el('bfBack').onclick=bfBack;
  el('bfClr').onclick=function(){const i=el('bfQ');i.value='';bfSet('');i.focus();};
  let t=null;
  el('bfQ').addEventListener('input',function(e){clearTimeout(t);const v=e.target.value;t=setTimeout(function(){bfSet(v);},220);});
  el('bfQ').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();clearTimeout(t);bfSet(e.target.value);e.target.blur();}
    else if(e.key==='Escape'){e.preventDefault();bfBack();}});
  el('bfList').addEventListener('click',function(e){const b=e.target.closest&&e.target.closest('.bfrow');if(b)bfPick(+b.dataset.i);});
  el('bfList').addEventListener('scroll',function(){const l=el('bfList');if(l.scrollTop+l.clientHeight>l.scrollHeight-400)bfMore();},{passive:true});
  el('bfPrev').onclick=function(e){e.stopPropagation();bfStep(-1);};
  el('bfNext').onclick=function(e){e.stopPropagation();bfStep(1);};
  el('bfNum').onclick=function(e){e.stopPropagation();bfOpen();};
  el('bfEnd').onclick=function(e){e.stopPropagation();bfReset();};
}

/* ---------- open / close (system «назад» closes the search first: history entry {rq:'find'}) ---------- */
function bfOpen(){
  if(!R||!R.book)return;bfBuild();
  if(BF.book!==R.book.id||BF.rid!==R)bfReset();
  BF.book=R.book.id;BF.rid=R;
  el('panel').classList.add('hidden');el('sheet').classList.add('hidden');el('selpop').classList.add('hidden');
  const o=el('bookFind');o.hidden=false;el('bfPill').classList.add('hidden');
  navPush('find');
  const i=el('bfQ');i.value=BF.q;
  bfRender(true);
  if(!BF.q)setTimeout(function(){try{i.focus();}catch(e){}},0);
}
function bfHide(){const o=el('bookFind');if(o)o.hidden=true;try{const i=el('bfQ');if(i)i.blur();}catch(e){}bfPillSync();}
function bfBack(){const was=bfOpenNow();bfHide();if(was&&navState()==='find')try{history.back();}catch(e){}}
window.addEventListener('popstate',function(e){const st=(e.state&&e.state.rq)||null;if(bfOpenNow()&&st!=='find')bfHide();});
/** forget the search (✕ on the pill, another book, the book closed); the return plaque «< на стр. N» stays as it is */
function bfReset(){
  BF.tok++;BF.q='';BF.hits=[];BF.cur=-1;BF.from=null;BF.idx=null;BF.shown=0;BF.busy=false;BF.done=true;BF.noText=false;
  if(BF.rid!==R){BF.pdfTxt=null;BF.pdfDoc=null;}
  bfPaint();bfPillSync();const i=el('bfQ');if(i)i.value='';
  if(BF.mo){BF.mo.disconnect();BF.mo=null;}
}

/* ---------- search ---------- */
function bfSet(v){
  const q=bfQuery(v);if(q===BF.q&&(BF.hits.length||BF.busy))return;
  BF.tok++;BF.q=q;BF.hits=[];BF.cur=-1;BF.shown=0;BF.noText=false;BF.done=true;BF.busy=false;
  if(q.length<2){bfRender(true);bfPaint();return;}
  if(bfIsPdf())bfPdfRun(q);else bfTextRun(q);
  bfPaint();
}
/* the laid-out text of the book: text nodes of #content, a space between blocks (paragraphs, the title) */
function bfTextIndex(){
  const c=el('content');if(BF.idx&&BF.idx.c===c&&BF.idx.html===c.childElementCount&&BF.idx.first===c.firstChild)return BF.idx;
  const w=document.createTreeWalker(c,NodeFilter.SHOW_TEXT);let s='',n,blk=null;const a=[];
  while((n=w.nextNode())){const v=n.nodeValue;if(!v)continue;
    const b=n.parentNode&&n.parentNode.closest?n.parentNode.closest('p,h1,h2,h3,h4,div,li'):null;
    if(blk&&b!==blk&&s&&!/\s$/.test(s))s+=' ';blk=b;a.push({n:n,s:s.length});s+=v;}
  BF.idx={c:c,html:c.childElementCount,first:c.firstChild,s:s,low:bfLow(s),a:a};return BF.idx;
}
function bfNodeAt(T,off,end){let lo=0,hi=T.a.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(T.a[m].s<=off)lo=m;else hi=m-1;}
  const x=T.a[lo];if(!x)return null;let o=off-x.s;const L=x.n.nodeValue.length;
  if(o>L||(!end&&o===L)){const y=T.a[lo+1];if(y)return {node:y.n,offset:0};o=L;}
  return {node:x.n,offset:Math.min(o,L)};}
function bfSnip(s,p,len){
  let a=Math.max(0,p-48),b=Math.min(s.length,p+len+72);
  if(a>0){const sp=s.indexOf(' ',a);if(sp>=0&&sp<p)a=sp+1;}
  if(b<s.length){const sp=s.lastIndexOf(' ',b);if(sp>p+len)b=sp;}
  const pre=s.slice(a,p).replace(/\s+/g,' '),mid=s.slice(p,p+len).replace(/\s+/g,' '),post=s.slice(p+len,b).replace(/\s+/g,' ');
  return (a>0?'…':'')+esc(pre)+'<mark class="bfm">'+esc(mid)+'</mark>'+esc(post)+(b<s.length?'…':'');
}
function bfTextRun(q){
  const T=bfTextIndex();let i=0;const out=[];
  while(out.length<BF_MAX){const p=T.low.indexOf(q,i);if(p<0)break;out.push({o:p,len:q.length,page:-1,lk:null});i=p+q.length;}
  BF.hits=out;BF.done=true;bfRender(true);
}
function bfTextPage(h){
  if(h.lk===R.layoutKey&&h.page>=0)return h.page;
  const T=bfTextIndex(),a=bfNodeAt(T,h.o,false);h.page=a?Math.max(0,pageOfAnchor(a)):0;h.lk=R.layoutKey;return h.page;
}
/* PDF page text built like the text layer (js/pdf.js pdfTextLayer): a new line → a space, a gap on the same line → a space */
function bfPdfPageText(items){
  let s='',prev=null;
  items.forEach(function(it){if(!it.str)return;const t=it.transform||[1,0,0,1,0,0],fh=Math.hypot(t[2],t[3])||12,base=t[5],x=t[4];
    if(prev){if(Math.abs(base-prev.base)>Math.max(fh,prev.fh)*0.5){if(!/\s$/.test(s))s+=' ';}
      else if(x-prev.right>fh*0.15&&!/\s$/.test(prev.str)&&!/^\s/.test(it.str))s+=' ';}
    prev={base:base,fh:fh,right:x+(it.width||0),str:it.str};s+=it.str;});
  return s;
}
async function bfPdfText(n){
  if(BF.pdfDoc!==R.pdf){BF.pdfDoc=R.pdf;BF.pdfTxt=[];}
  if(BF.pdfTxt[n]!=null)return BF.pdfTxt[n];
  let s='';try{const pg=await R.pdf.getPage(n+1);const tc=await pg.getTextContent();s=bfPdfPageText(tc.items);}catch(e){s='';}
  if(BF.pdfDoc===R.pdf)BF.pdfTxt[n]=s;return s;
}
async function bfPdfRun(q){
  const tok=BF.tok,doc=R.pdf,N=R.pageCount;BF.busy=true;BF.done=false;bfRender(true);
  let any=false,last=0;
  for(let n=0;n<N;n++){
    const s=await bfPdfText(n);
    if(tok!==BF.tok||doc!==R.pdf)return;
    if(s.trim())any=true;
    const low=bfLow(s);let i=0,k=0;
    while(BF.hits.length<BF_MAX){const p=low.indexOf(q,i);if(p<0)break;BF.hits.push({pg:n,k:k++,o:p,len:q.length});i=p+q.length;}
    BF.prog=n+1;
    if(BF.hits.length>=BF_MAX)break;
    const now=Date.now();if(now-last>250){last=now;bfRender(false);}
  }
  BF.busy=false;BF.done=true;BF.noText=!any;bfRender(false);bfPaint();
}

/* ---------- results list ---------- */
function bfRender(reset){
  const L=el('bfList'),st=el('bfStat');if(!L)return;
  const n=BF.hits.length,q=BF.q;
  if(q.length<2){st.textContent=q?'Введите хотя бы 2 буквы':'';L.innerHTML=q?'':'<div class="bfempty">'+rqIcon('search',32)+'<div>Найдём слово или фразу во всей книге</div></div>';BF.shown=0;return;}
  const more=n>=BF_MAX?'+':'';
  st.textContent=BF.busy?('Ищу… стр. '+(BF.prog||0)+' из '+R.pageCount+(n?' · найдено '+n:''))
    :BF.noText&&!n?'':n?('Найдено: '+n+more):'';
  if(!n&&!BF.busy){L.innerHTML='<div class="bfempty">'+rqIcon('search',32)+'<div>'+(BF.noText?'В этом PDF нет текста — только картинки страниц, искать не по чему':'Ничего не найдено')+'</div></div>';BF.shown=0;return;}
  if(reset){L.innerHTML='';BF.shown=0;}
  if(BF.shown<Math.min(n,BF_STEP))bfMore(); /* while a PDF is searched the first screen fills up; further rows come on scroll */
  if(reset&&BF.cur>=0){const r=L.querySelector('.bfrow[data-i="'+BF.cur+'"]');if(r)r.scrollIntoView({block:'center'});}
}
function bfMore(){
  const L=el('bfList'),n=BF.hits.length;if(!L||BF.shown>=n)return;
  const to=Math.min(n,Math.max(BF.shown+BF_STEP,BF.cur+20));let h='';
  const T=bfIsPdf()?null:bfTextIndex();
  for(let i=BF.shown;i<to;i++){const x=BF.hits[i];let sn,pl;
    if(T){sn=bfSnip(T.s,x.o,x.len);pl=String(bfTextPage(x)+1);}
    else{sn=bfSnip(BF.pdfTxt[x.pg]||'',x.o,x.len);pl=pdfLabel(x.pg);}
    h+='<button class="bfrow'+(i===BF.cur?' on':'')+'" type="button" data-i="'+i+'"><span class="bfsn">'+sn+'</span><span class="bfpg" aria-label="страница '+esc(pl)+'">'+esc(pl)+'</span></button>';}
  L.insertAdjacentHTML('beforeend',h);BF.shown=to;
}

/* ---------- go to a match ---------- */
function bfHitPage(h){return bfIsPdf()?h.pg:bfTextPage(h);}
function bfCurPage(){return bfIsPdf()?(P.shown>=0?P.shown:R.page):R.page;}
function bfPick(i){
  const h=BF.hits[i];if(!h)return;
  if(BF.from==null)BF.from=bfCurPage();
  BF.cur=i;bfHide();if(navState()==='find')try{history.back();}catch(e){}
  bfGo(h);
}
function bfGo(h){
  const p=bfHitPage(h);
  if(p!==bfCurPage())jumpTo(p);
  if(BF.from!=null&&BF.from!==p)showJumpBack(BF.from);else hideJumpBack();
  bfPaint();bfPillSync();
}
function bfStep(d){const n=BF.hits.length;if(!n)return;BF.cur=((BF.cur<0?0:BF.cur+d)%n+n)%n;bfGo(BF.hits[BF.cur]);}
function bfPillSync(){
  const p=el('bfPill');if(!p)return;
  const on=!!(R&&R.book&&BF.book===R.book.id&&BF.cur>=0&&BF.hits.length&&!bfOpenNow());
  p.classList.toggle('hidden',!on);if(!on)return;
  el('bfNum').textContent=(BF.cur+1)+' из '+BF.hits.length+(BF.hits.length>=BF_MAX?'+':'');
  bfPlacePill();
}
function bfPlacePill(){
  const p=el('bfPill');if(!p||p.classList.contains('hidden'))return;
  const rd=el('reader'),bot=document.querySelector('#reader .rbot'),pl=el('pgLine').getBoundingClientRect();
  p.style.bottom=(rd&&bot&&!rd.classList.contains('barsoff')?bot.offsetHeight:Math.max(0,innerHeight-pl.top))+'px';
}
addEventListener('resize',bfPlacePill);
if(window.MutationObserver)new MutationObserver(bfPlacePill).observe(el('reader'),{attributes:true,attributeFilter:['class']});

/* ---------- highlight on the page (CSS Custom Highlight API; no DOM change, nothing stored) ---------- */
function bfRangesIn(root,q,curK){
  /* text of a PDF text layer: span texts in order, <br> = a space */
  const a=[];let s='';
  root.childNodes.forEach(function(nd){if(nd.nodeName==='BR'){if(!/\s$/.test(s))s+=' ';return;}const t=nd.firstChild;
    if(t&&t.nodeType===3&&t.nodeValue){a.push({n:t,s:s.length});s+=t.nodeValue;}});
  const T={a:a},low=bfLow(s),all=[];let cur=null,i=0,k=0;
  while(all.length<400){const p=low.indexOf(q,i);if(p<0)break;const r=bfRange(T,p,q.length);if(r){all.push(r);if(k===curK)cur=r;}k++;i=p+q.length;}
  return {all:all,cur:cur};
}
function bfRange(T,p,len){const A=bfNodeAt(T,p,false),B=bfNodeAt(T,p+len,true);if(!A||!B)return null;
  try{const r=document.createRange();r.setStart(A.node,A.offset);r.setEnd(B.node,B.offset);return r;}catch(e){return null;}}
function bfPaint(){
  if(!(window.CSS&&CSS.highlights&&window.Highlight))return;
  CSS.highlights.delete('rq-find');CSS.highlights.delete('rq-find-cur');
  if(!R||!R.book||BF.q.length<2||!BF.hits.length||BF.book!==R.book.id)return;
  const all=[];let cur=null;const ch=BF.hits[BF.cur];
  if(bfIsPdf()){
    const layers=[];const pt=el('pdfText');if(pt&&P.shown>=0)layers.push([pt,P.shown]);
    document.querySelectorAll('#pdfScroll .psl').forEach(function(s){const tl=s.querySelector('.textLayer');if(tl)layers.push([tl,+s.dataset.n]);});
    layers.forEach(function(x){const r=bfRangesIn(x[0],BF.q,ch&&ch.pg===x[1]?ch.k:-1);all.push.apply(all,r.all);if(r.cur)cur=r.cur;});
    bfWatchPdf();
  }else{
    const T=bfTextIndex();BF.hits.forEach(function(h,i){const r=bfRange(T,h.o,h.len);if(!r)return;if(i===BF.cur)cur=r;else all.push(r);});
  }
  if(all.length)CSS.highlights.set('rq-find',new Highlight(...all));
  if(cur)CSS.highlights.set('rq-find-cur',new Highlight(cur));
}
/* PDF text layers are rebuilt on every page change → paint again when they change */
function bfWatchPdf(){
  if(BF.mo||!window.MutationObserver)return;let t=null;
  BF.mo=new MutationObserver(function(){clearTimeout(t);t=setTimeout(function(){if(BF.q&&bfIsPdf())bfPaint();},60);});
  ['pdfText','pdfScroll'].forEach(function(id){const x=el(id);if(x)BF.mo.observe(x,{childList:true,subtree:id==='pdfScroll'});});
}

/* ---------- chapters: PDF outline, ticks on the page slider, the chapter name over the thumb ---------- */
/** PDF bookmarks → R.pdfToc [{t, page}] (memory of the open book only); two levels, at most 400 */
async function bfPdfOutline(b,doc){
  let ol=null;try{ol=await doc.getOutline();}catch(e){}
  if(!ol||!ol.length||R.book!==b||R.pdf!==doc)return;
  const out=[];
  async function walk(list,lvl){for(const it of list){if(out.length>=400||R.pdf!==doc)return;
    let pg=-1;try{let d=it.dest;if(typeof d==='string')d=await doc.getDestination(d);
      if(Array.isArray(d)&&d[0]!=null){pg=typeof d[0]==='object'?await doc.getPageIndex(d[0]):(Number.isInteger(d[0])?d[0]:-1);}}catch(e){}
    const t=String(it.title||'').replace(/\s+/g,' ').trim();
    if(pg>=0&&t)out.push({t:t,page:pg,lvl:lvl});
    if(lvl<1&&it.items&&it.items.length)await walk(it.items,lvl+1);}}
  await walk(ol,0);
  if(R.book!==b||R.pdf!==doc||out.length<1)return;
  R.pdfToc=out;bfTicksSync(true);
}
/** chapters as pages of the current layout: [{t, page}] sorted by page */
function bfChapters(){
  if(!R||!R.book||typeof tocOf!=='function')return [];
  const b=R.book,toc=tocOf(b),N=Math.max(1,R.pageCount);if(!toc||!toc.length)return [];
  const len=b.text&&b.text.length?b.text.length:0;
  return toc.map(function(c){const pg=c.page!=null?c.page:(len?Math.round((c.off/len)*(N-1)):0);return {t:c.t,page:Math.max(0,Math.min(N-1,pg))};})
    .sort(function(x,y){return x.page-y.page;});
}
function bfChapterAt(v){const ch=bfChapters();let r=null;for(let i=0;i<ch.length;i++){if(ch[i].page<=v)r=ch[i];else break;}return r;}
let bfTickKey='';
function bfTicksSync(force){
  const t=el('pgTicks'),sl=el('pgSlider');if(!t||!sl)return;
  const W=sl.offsetWidth,mx=+sl.max||0;
  const key=(R&&R.book?R.book.id:'')+'|'+mx+'|'+W+'|'+sl.offsetLeft+'|'+sl.offsetTop+'|'+(R&&R.pdfToc?R.pdfToc.length:0)+'|'+(R?R.layoutKey:'');
  if(!force&&key===bfTickKey)return;bfTickKey=key;
  if(!W||!mx||!R||!R.book){t.innerHTML='';return;}
  const ch=bfChapters();
  t.style.left=(sl.offsetLeft+PG_TH/2)+'px';t.style.width=Math.max(0,W-PG_TH)+'px';t.style.top=(sl.offsetTop+sl.offsetHeight/2)+'px';
  const w=Math.max(1,W-PG_TH);let h='',lastX=-9;
  ch.forEach(function(c){if(c.page<=0)return;const x=c.page/mx*w;if(x-lastX<3)return;lastX=x;h+='<i style="left:'+(c.page/mx*100).toFixed(3)+'%"></i>';});
  t.innerHTML=h;
}
if(window.ResizeObserver)new ResizeObserver(function(){bfTicksSync();}).observe(el('pgSlider'));
addEventListener('resize',function(){bfTicksSync();});
