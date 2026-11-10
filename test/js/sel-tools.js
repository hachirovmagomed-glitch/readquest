/* 29.10 (Джессика: «что мы можем добавить в боковое меню, чтобы оно было максимально крутым и полезным?» → «давай 1 2 3 5 7», «с 8-11 тоже»;
   потом «поиск, озвучку убираем из бокового меню. Вместо них … перевод, "объяснить" от нейронки», «в одном боковом меню на две разные кнопки
   открывались разные ветки», нижняя плашка при выделении убрана — «Убрать, всё в меню»; «копирование в боковое меню… убери герой книги и отметить героя»):
   the tools of the side menu of a selection (#selSide, js/reader-ui.js ssEl/ssUpd).
   In the column: «Цвета» (a branch with the skin's colours and «свой цвет»: the real #spColors moves in, so every skin draws its own drops),
   «Копировать», «Перевести», «Объясни», «Действия» (a branch: «Заметка», «В словарь», «Предложение, потом абзац», «В дневник», «Закладка здесь»,
   «Википедия», «До конца абзаца», «До конца страницы»), the count of words.
   «Копировать», «Перевести», «Объясни», «Заметка», «В словарь», «Предложение…» are the buttons of the bar (#selpop) — the same code.
   S.chars (heroes, 29.10) stays in the data, its buttons are gone.
   04.11: five looks of the menu (ssLook in js/reader-ui.js); in the row looks «Заметка» is in the row, the branches open above it. */
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
  el('ssNote').onclick=stBar('spNote');
  el('ssCopy').onclick=stBar('spCopy');
  el('ssCnt').onclick=function(){if(typeof selView==='function')selView();};
  el('ssDict').onclick=stBar('spDict');
  el('ssAI').onclick=stBar('spAI');
  if(el('ssAsk'))el('ssAsk').onclick=stAsk;
  el('ssMore').onclick=function(){const on=el('ssMenu').hidden;stCol(false);stMenu(on);};
  el('ssMenu').onclick=function(e){const b=e.target.closest&&e.target.closest('button[data-a]');if(!b)return;const f=ST_ACT[b.dataset.a];stMenu(false);if(f)f();};
}
function stUpd(){
  const q=el('ssCol');if(!q)return;const k=hlKey(typeof SQ!=='undefined'&&SQ?SQ.q.c:SET.hlc); /* 07.11: a tapped quote — its own colour */
  q.style.setProperty('--d',hlDot(k));q.style.setProperty('--d2',hlDot2(k));
  q.hidden=stOff('spColors');el('ssNote').hidden=stOff('spNote');el('ssCopy').hidden=stOff('spCopy');el('ssDict').hidden=stOff('spDict');el('ssAI').hidden=stOff('spAI');
  const n=stWords(stText()),c=el('ssCnt'),pg=typeof selStats==='function'?selStats().pages:1;
  /* 28.10 (Джессика: «непонятно, что я скопировал»): the count also says over how many pages; a tap shows the whole selected text */
  c.innerHTML='<b>'+n+'</b><span>'+plural(n,'слово','слова','слов')+'</span>'+(pg>1?'<span>'+pg+' стр.</span>':'');
  c.setAttribute('aria-label','Выделено '+n+' '+plural(n,'слово','слова','слов')+(pg>1?' на '+pg+' '+plural(pg,'странице','страницах','страницах'):'')+' — показать текст');
}
/** a branch next to the column, at the height of its button, whole on screen */
function stBranch(m,b){
  const sd=el('selSide').getBoundingClientRect(),br=b.getBoundingClientRect(),h=m.getBoundingClientRect().height;
  if(ssLook()!=='side'){ /* 04.11 the row looks: the branch above the row (under it when the row is at the top), at its button, whole on screen */
    m.style.left='0px';const mr=m.getBoundingClientRect(),w=mr.width,mh=mr.height,x=Math.max(8,Math.min(innerWidth-8-w,br.left+br.width/2-w/2)); /* 08.11: measured from one start, not from where it stood last time */
    m.style.left=Math.round(x-sd.left)+'px';m.style.top=Math.round(sd.top-mh-6>=8?-mh-6:sd.height+6)+'px';return;}
  m.style.left='';
  const top=Math.max(8-sd.top,Math.min(innerHeight-8-h-sd.top,br.top-sd.top-h/2+br.height/2));m.style.top=Math.round(top)+'px';
}
/* «Цвета»: the bar's own colour buttons (#spColors, its click = a quote in that colour, «свой цвет» = the picker) move into the branch
   and go back to the bar when the branch closes (a tapped saved quote still recolours in the bar) */
function stCol(on){
  const m=el('ssColBox'),b=el('ssCol'),c=el('spColors');if(!m||!c)return;
  const lk0=ssLook();if(!on&&SS.open&&lk0==='big'&&!el('selSide').hidden)return; /* the card keeps its colours while it is shown */
  if(!on){if(c.parentNode!==el('selpop'))el('selpop').insertBefore(c,el('spNote'));m.hidden=true;if(b)b.setAttribute('aria-expanded','false');return;}
  if(typeof renderSpColors==='function')renderSpColors(typeof SQ!=='undefined'&&SQ?hlKey(SQ.q.c):undefined);
  m.appendChild(c);m.hidden=false;b.setAttribute('aria-expanded','true');
  const lk=ssLook();if(lk==='big'){m.style.left=m.style.top='';return;} /* on the card the colours are its top row */
  stBranch(m,b);
}

/* «Действия»: a labelled list next to the column (on the side of the text) */
function stMenu(on){
  const m=el('ssMenu'),b=el('ssMore');if(!m)return;
  if(!on){m.hidden=true;if(b)b.setAttribute('aria-expanded','false');return;}
  const nb=el('ssNote'),own=nb&&getComputedStyle(nb).display!=='none'; /* «Заметка» has its own button in the row looks */
  const sq=typeof SQ!=='undefined'&&!!SQ&&window.getSelection().isCollapsed;
  const lk=ssLook(),tl=lk==='bar',sv=lk==='side'||lk==='bar'; /* 10.11 «Плашка»: «Ещё» as tiles with short captions, «Вид меню» in it */
  const it=(sq?[ /* 07.11: a tapped saved quote — what its old bar had */
    !own&&!stOff('spNote')&&['note','pencil','Заметка'],
    !stOff('spEdit')&&['qedit','highlighter','Изменить границы'],
    !stOff('spDel')&&['qdel','trash-2','Удалить цитату'],
    !stOff('spAll')&&['qall','quote','Все цитаты'],
    !stOff('spWord')&&['word','book-open','В словарь'],
    sv&&['view','menu','Вид меню'],
    ['wiki','info','Википедия'],
  ]:[
    !own&&!stOff('spNote')&&['note','pencil','Заметка'],
    !stOff('spWord')&&['word','book-open','В словарь'],
    typeof qDiaryOn==='function'&&qDiaryOn()&&['diary','notebook-pen','В дневник'],
    ['mark','bookmark','Закладка здесь'],
    sv&&['view','menu','Вид меню'], /* 06.11: the look of this menu, switched right here («Сбоку» has no own button: it stays compact; 10.11 «Плашка» neither) */
    ['wiki','info','Википедия'],
    /* 10.11 (Джессика про «Выделить больше»: «можно удалить эти функции … они просто перегружают интерфейс»): «Предложение, потом абзац»,
       «+ предложение», «+ абзац», «До конца абзаца», «До конца страницы» are no longer in this list (ST_ACT keeps their code) */
  ]).filter(Boolean);
  m.classList.toggle('tiles',tl);
  const n=tl&&!sq?stWords(stText()):0,head=n?'<div class="stHead"><b>'+n+'</b><span>'+plural(n,'слово','слова','слов')+'</span><button type="button" data-a="seltext">показать текст</button></div>':'';
  m.innerHTML=head+it.map(x=>'<button type="button" role="menuitem" data-a="'+x[0]+'">'+rqIcon(x[1],tl?22:18)+'<span>'+esc(tl&&ST_SHORT[x[0]]||x[2])+'</span></button>').join('');
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

/* 05.11 Джессика: читаю на половине экрана и спрашиваю ChatGPT рядом — выделенное вместе с вопросом в буфер, дальше только вставить.
   Это отдельная кнопка в меню (#ssAsk), видна только на половине экрана (#reader.half); на полном — «Объясни» → «Спросить в…». */
async function stAsk(){
  const t=stText();if(!t)return;const b=R.book||{},au=typeof bookAuthor==='function'?bookAuthor(b):'';
  const q='Книга: «'+(b.title||'')+'»'+(au?', '+au:'')+'\nФрагмент: «'+t.slice(0,1500)+'»\n\nОбъясни простым языком, что здесь происходит и что значат непонятные слова. Без спойлеров.';
  if(typeof aiBackArm==='function'){aiBackCtx({frag:t.slice(0,1500),n:typeof hlSelN==='function'?hlSelN(t):0});aiBackArm({q:q});}
  let ok=false;try{await navigator.clipboard.writeText(q);ok=true;}catch(e){}
  if(!ok&&typeof copyText==='function'){try{copyText(q);ok=true;}catch(e){}}
  if(typeof selDone==='function')selDone();
  flashMsg(ok?'Вопрос скопирован. Вставьте его в нейросеть рядом долгим нажатием':'Телефон не дал скопировать',{kind:'info',icon:'clipboard'});
}
const ST_SHORT={word:'Словарь',diary:'Дневник',mark:'Закладка',qedit:'Границы',qdel:'Удалить',say:'Слушать'}; /* 10.11 the tiles of «Плашка» */
const ST_ACT={qedit:stBar('spEdit'),qdel:stBar('spDel'),qall:stBar('spAll'),ask:stAsk,note:stBar('spNote'),word:stBar('spWord'),grow:stBar('spGrow'),sent:function(){smQuick('s+');},parn:function(){smQuick('p+');},diary:stDiary,mark:stMark,wiki:stWiki,para:stPara,page:stPageEnd,view:function(){if(typeof ssLooksMenu==='function')ssLooksMenu(el('ssMore'));},seltext:function(){if(typeof selView==='function')selView();}};
