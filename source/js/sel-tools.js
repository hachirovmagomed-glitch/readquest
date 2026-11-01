/* 29.10 (Джессика: «что мы можем добавить в боковое меню, чтобы оно было максимально крутым и полезным?» → «давай 1 2 3 5 7», «с 8-11 тоже»;
   потом «поиск, озвучку убираем из бокового меню. Вместо них … перевод, "объяснить" от нейронки», «в одном боковом меню на две разные кнопки
   открывались разные ветки», нижняя плашка при выделении убрана — «Убрать, всё в меню»; «копирование в боковое меню… убери герой книги и отметить героя»):
   the tools of the side menu of a selection (#selSide, js/reader-ui.js ssEl/ssUpd).
   In the column: «Цвета» (a branch with the skin's colours and «свой цвет»: the real #spColors moves in, so every skin draws its own drops),
   «Копировать», «Перевести», «Объясни», «Действия» (a branch: «Заметка», «В словарь», «Предложение, потом абзац», «В дневник», «Закладка здесь»,
   «Википедия», «До конца абзаца», «До конца страницы»), the count of words.
   «Копировать», «Перевести», «Объясни», «Заметка», «В словарь», «Предложение…» are the buttons of the bar (#selpop) — the same code.
   S.chars (heroes, 29.10) stays in the data, its buttons are gone. */
const ST={};
function stText(){let t=(typeof selText==='function'&&selText())||'';
  if(typeof PQ!=='undefined'&&PQ&&R.book&&PQ.bid===R.book.id&&PQ.text)t=PQ.text+' '+t;
  return String(t).replace(/\s+/g,' ').trim();}
function stWords(t){return (String(t||'').match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)||[]).length;}
/** the page where the selection begins (0-based) */
function stPage(){
  if(typeof PQ!=='undefined'&&PQ&&R.book&&PQ.bid===R.book.id&&PQ.parts&&PQ.parts.length)return PQ.parts[0].p;
  const s=window.getSelection();if(R.mode==='pdf'||!s||!s.rangeCount||!selPagesOn())return R.page;
  const r=[...s.getRangeAt(0).getClientRects()].find(x=>x.width);return r?Math.max(0,Math.min(R.pageCount-1,selPageAt(r))):R.page;}
function stLab(p){return R.mode==='pdf'&&typeof pdfLabel==='function'?pdfLabel(p):String(p+1);}
function stBar(id){return function(){const b=el(id);if(b)b.click();};}
/** a bar button the reader switched off in «Чтение → Кнопки меню выделения» (js/read-extras.js, .rxoff) is off here too */
function stOff(id){const b=el(id);return !b||b.classList.contains('rxoff');}

function stBind(){
  el('ssCol').onclick=function(){const on=el('ssColBox').hidden;stMenu(false);stCol(on);};
  el('ssCopy').onclick=stBar('spCopy');
  el('ssCnt').onclick=function(){if(typeof selView==='function')selView();};
  el('ssDict').onclick=stBar('spDict');
  el('ssAI').onclick=stBar('spAI');
  el('ssMore').onclick=function(){const on=el('ssMenu').hidden;stCol(false);stMenu(on);};
  el('ssMenu').onclick=function(e){const b=e.target.closest&&e.target.closest('button[data-a]');if(!b)return;const f=ST_ACT[b.dataset.a];stMenu(false);if(f)f();};
}
function stUpd(){
  const q=el('ssCol');if(!q)return;const k=hlKey(SET.hlc);
  q.style.setProperty('--d',hlDot(k));q.style.setProperty('--d2',hlDot2(k));
  q.hidden=stOff('spColors');el('ssCopy').hidden=stOff('spCopy');el('ssDict').hidden=stOff('spDict');el('ssAI').hidden=stOff('spAI');
  const n=stWords(stText()),c=el('ssCnt'),pg=typeof selStats==='function'?selStats().pages:1;
  /* 28.10 (Джессика: «непонятно, что я скопировал»): the count also says over how many pages; a tap shows the whole selected text */
  c.innerHTML='<b>'+n+'</b><span>'+plural(n,'слово','слова','слов')+'</span>'+(pg>1?'<span>'+pg+' стр.</span>':'');
  c.setAttribute('aria-label','Выделено '+n+' '+plural(n,'слово','слова','слов')+(pg>1?' на '+pg+' '+plural(pg,'странице','страницах','страницах'):'')+' — показать текст');
}
/** a branch next to the column, at the height of its button, whole on screen */
function stBranch(m,b){
  const sd=el('selSide').getBoundingClientRect(),br=b.getBoundingClientRect(),h=m.getBoundingClientRect().height;
  const top=Math.max(8-sd.top,Math.min(innerHeight-8-h-sd.top,br.top-sd.top-h/2+br.height/2));m.style.top=Math.round(top)+'px';
}
/* «Цвета»: the bar's own colour buttons (#spColors, its click = a quote in that colour, «свой цвет» = the picker) move into the branch
   and go back to the bar when the branch closes (a tapped saved quote still recolours in the bar) */
function stCol(on){
  const m=el('ssColBox'),b=el('ssCol'),c=el('spColors');if(!m||!c)return;
  if(!on){if(c.parentNode!==el('selpop'))el('selpop').insertBefore(c,el('spNote'));m.hidden=true;if(b)b.setAttribute('aria-expanded','false');return;}
  if(typeof renderSpColors==='function')renderSpColors();
  m.appendChild(c);m.hidden=false;b.setAttribute('aria-expanded','true');stBranch(m,b);
}

/* «Действия»: a labelled list next to the column (on the side of the text) */
function stMenu(on){
  const m=el('ssMenu'),b=el('ssMore');if(!m)return;
  if(!on){m.hidden=true;if(b)b.setAttribute('aria-expanded','false');return;}
  const it=[
    !stOff('spNote')&&['note','pencil','Заметка'],
    !stOff('spWord')&&['word','book-open','В словарь'],
    R.mode!=='pdf'&&!stOff('spGrow')&&['grow','align-justify','Предложение, потом абзац'],
    R.mode!=='pdf'&&!stOff('spGrow')&&['sent','plus','+ предложение'], /* 28.10 (Джессика: «кнопки быстрого выделения»): the next one, also onto the next page */
    R.mode!=='pdf'&&!stOff('spGrow')&&['parn','plus','+ абзац'],
    typeof qDiaryOn==='function'&&qDiaryOn()&&['diary','notebook-pen','В дневник'],
    ['mark','bookmark','Закладка здесь'],
    ['wiki','info','Википедия'],
    R.mode!=='pdf'&&['para','align-left','До конца абзаца'],
    selPagesOn()&&['page','chevron-down','До конца страницы'],
  ].filter(Boolean);
  m.innerHTML=it.map(x=>'<button type="button" role="menuitem" data-a="'+x[0]+'">'+rqIcon(x[1],18)+'<span>'+esc(x[2])+'</span></button>').join('');
  m.hidden=false;b.setAttribute('aria-expanded','true');stBranch(m,b);
}

function stDiary(){
  const t=stText(),bid=R.book&&R.book.id;if(!t||!bid||!qDiaryOn())return;const p=stPage();
  return rqAsk({t:'Запись в дневник',p:'«'+t.slice(0,140)+(t.length>140?'…':'')+'» — ваша мысль',ok:'Записать',input:''}).then(function(v){
    if(v===null||v===false)return;const y=diaryOf(bid)||diaryNew({b:bid});
    const n=dyNewEntry(y,'',{pg:p+1,r:R.pageCount>1?p/(R.pageCount-1):0});
    n.x=('> '+t+(v?'\n\n'+v:'')).slice(0,20000);dyTouch(y);
    flashMsg('Записано в дневник',{kind:'info',icon:'notebook-pen'});
  });
}
function stMark(){
  if(!R.book)return;const p=stPage(),t=stText(),w=t.length>60?t.slice(0,60).replace(/\s+\S*$/,'')+'…':t;
  (S.marks[R.book.id]=S.marks[R.book.id]||[]).push({ratio:R.pageCount>1?p/(R.pageCount-1):0,page:p+1,date:today(),t:w});
  if(typeof diaryAuto==='function')diaryAuto(R.book.id);save();
  flashMsg('Закладка на стр. '+stLab(p),{kind:'info',icon:'bookmark'});
}
/* the end of the selection goes to the end of its paragraph / of this page; the start stays */
function stEndTo(n,o){const s=window.getSelection();if(!s||!s.rangeCount||!n)return;const rg=s.getRangeAt(0);
  try{s.setBaseAndExtent(rg.startContainer,rg.startOffset,n,o);}catch(e){}}
function stLastText(box){const w=document.createTreeWalker(box,NodeFilter.SHOW_TEXT);let n,l=null;while((n=w.nextNode()))if(/\S/.test(n.nodeValue))l=n;return l;}
function stPara(){
  const s=window.getSelection();if(!s||!s.rangeCount)return;let e=s.getRangeAt(0).endContainer;if(e.nodeType===3)e=e.parentElement;
  const b=e&&e.closest('p,li,blockquote,h1,h2,h3,h4,h5,h6,pre,div');if(!b||!el('content').contains(b))return;
  const l=stLastText(b);if(l)stEndTo(l,l.nodeValue.replace(/\s+$/,'').length);
}
function stPageEnd(){
  const s=window.getSelection();if(!s||!s.rangeCount)return;
  if(R.mode==='pdf'){const l=stLastText(el('pdfText'));if(l)stEndTo(l,l.nodeValue.replace(/\s+$/,'').length);return;}
  const rg=s.getRangeAt(0);let last=null;
  selWalk(rg.endContainer,rg.endOffset,1,function(x,k,r){if(selPageAt(r)!==R.page)return true;last=[x,k+1];return false;});
  if(last)stEndTo(last[0],last[1]);
}

/* «Википедия»: a short note about the selected name or place, without leaving the book (the summary of the article; when there is no
   article with exactly this title, the first one Wikipedia's own search finds). Russian text → ru.wikipedia, other → en.wikipedia. */
function stSheet(title,html){
  let o=el('stSheet');
  if(!o){o=document.createElement('div');o.id='stSheet';o.setAttribute('role','dialog');o.setAttribute('aria-modal','false');
    o.innerHTML='<div class="sthead"><b id="stSheetH"></b><button type="button" class="closes" id="stSheetX" aria-label="Закрыть">'+rqIcon('x',22)+'</button></div><div id="stSheetB"></div>';
    el('reader').appendChild(o);o.addEventListener('mousedown',function(e){if(!e.target.closest('a'))e.preventDefault();});
    el('stSheetX').onclick=stSheetClose;o.setAttribute('aria-labelledby','stSheetH');}
  el('stSheetH').textContent=title;el('stSheetB').innerHTML=html;o.hidden=false;return el('stSheetB');
}
function stSheetClose(){const o=el('stSheet');if(o)o.hidden=true;ST.wiki=0;}
async function stWikiGet(lang,t){
  const ac=typeof AbortController!=='undefined'?new AbortController():null,tm=setTimeout(function(){if(ac)ac.abort();},9000);
  const get=async function(u){const r=await fetch(u,ac?{signal:ac.signal}:{});if(r.status===404)return null;if(!r.ok)throw new Error('http '+r.status);return r.json();};
  try{
    const sum=function(x){return get('https://'+lang+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(x.replace(/ /g,'_')));};
    let j=await sum(t);
    if(!j||!j.extract){const f=await get('https://'+lang+'.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&origin=*&search='+encodeURIComponent(t));
      const n=f&&f[1]&&f[1][0];j=n?await sum(n):null;}
    return j&&j.extract?j:null;
  }finally{clearTimeout(tm);}
}
function stWiki(){
  const t=stText().slice(0,80).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,'');if(!t)return;
  const lang=/[а-яё]/i.test(t)?'ru':'en',me=ST.wiki=(ST.wiki||0)+1;
  stSheet('Википедия','<p class="stmuted">Ищу «'+esc(t)+'»…</p>');
  stWikiGet(lang,t).then(function(j){if(ST.wiki!==me)return;
    if(!j){stSheet('Википедия','<p class="stmuted">В Википедии ничего не нашлось по «'+esc(t)+'»</p>');return;}
    const u=(j.content_urls&&(j.content_urls.mobile||j.content_urls.desktop)||{}).page||('https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(j.title));
    stSheet(j.title||t,(j.description?'<p class="stmuted">'+esc(j.description)+'</p>':'')+'<p class="stwiki">'+esc(j.extract)+'</p>'+
      '<a class="stlink" href="'+esc(u)+'" target="_blank" rel="noopener">Открыть статью в Википедии</a>');
  },function(){if(ST.wiki!==me)return;stSheet('Википедия','<p class="stmuted">Нет связи с Википедией. Проверьте интернет и попробуйте ещё раз</p>');});
}

const ST_ACT={note:stBar('spNote'),word:stBar('spWord'),grow:stBar('spGrow'),sent:function(){smQuick('s+');},parn:function(){smQuick('p+');},diary:stDiary,mark:stMark,wiki:stWiki,para:stPara,page:stPageEnd};
