'use strict';
/* ===== Дневники читателя (25.10, Джессика: «дневник, куда пользователи будут добавлять заметки, у каждого дневника под книгу свой скин»).
   Раздел только в левом меню (её выбор 25.10), в «Нижнюю панель» его можно поставить самому. Данные: S.diaries, S.diaryAuto (arch.md 25.10).
   Цитаты, заметки к ним и закладки книги не копируются: дневник показывает S.quotes[b] и S.marks[b] как есть.
   Без монет и XP. Обложки — косметика; этап 1 = две бесплатные, магазин обложек — этап 2.
   26.10 (Джессика: «у каждого скина уникальные дневники»): у скина своя обложка, бумага и чернила (поле sk); открываются вместе со скином,
   без скина видны с замком и ведут в магазин. Новый дневник берёт оформление надетого скина. «Инвентарь» (цитаты, словарь) — вкладки раздела. */
const DIARY_COVERS={
  school:{n:'Школьная тетрадь',d:'Клетка, поля и синие чернила',pp:'grid',ink:'blue',cols:[['green','Зелёная','#3f7d5a'],['blue','Синяя','#35598f'],['red','Вишнёвая','#9a3f45'],['ochre','Охра','#b5832c'],['violet','Сиреневая','#62508f']]},
  pencil:{n:'Карандашный блокнот',d:'Крафт, пружина и графит',sk:'pencil',pp:'plain',ink:'ink',cols:[['kraft','Крафт','#c7a677'],['graphite','Графит','#8e8d88'],['black','Чёрный','#33312e']]},
  amphora:{n:'Амфора',d:'Вазопись, меандр и папирус',sk:'ellada',pp:'papyrus',ink:'terracotta',cols:[['terra','Терракота','#b65a2c'],['black','Чернолаковая','#2b2521'],['marble','Мрамор','#e9e4d8']]},
  herbarium:{n:'Гербарий',d:'Перламутр, веточка и бабочка',sk:'babochkovyi',pp:'pearl',ink:'violet',cols:[['lilac','Сирень','#b7a3d9'],['mint','Мята','#9fd1bd'],['peach','Персик','#efbfa3']]},
  atlas:{n:'Звёздный атлас',d:'Созвездия, золотая рамка и звёздная бумага',sk:'celestial',pp:'stars',ink:'gold',cols:[['night','Ночь','#1c244f'],['dawn','Закат','#6a4a7f'],['ivory','Слоновая кость','#efe5cf']]}};
const DIARY_PAPERS=[['lines','В линейку'],['grid','В клетку'],['dots','В точку'],['plain','Чистая'],['old','Старая бумага'],['papyrus','Папирус','ellada'],['pearl','Перламутр','babochkovyi'],['stars','Звёздная','celestial']];
const DIARY_FONTS=[['hand','Рукописный'],['book','Книжный'],['ui','Обычный']];
const DIARY_INKS=[['ink','Тёмные'],['blue','Синие'],['brown','Коричневые'],['green','Зелёные'],['violet','Фиолетовые'],['terracotta','Терракота','ellada'],['gold','Золото','celestial']];
const DIARY_LH=[['tight','Плотно'],['normal','Обычно'],['wide','Свободно']];
const DIARY_AL=[['left','По левому краю'],['justify','По ширине']];
const DIARY_TAGS=[['','Без метки'],['red','Красная'],['orange','Оранжевая'],['yellow','Жёлтая'],['green','Зелёная'],['blue','Синяя'],['violet','Фиолетовая']];
const DIARY_RIBBONS=[['red','Красная'],['blue','Синяя'],['green','Зелёная'],['gold','Золотая'],['black','Чёрная']];
const DIARY_TPL=[
  {k:'impr',n:'Впечатления',t:'Впечатления',x:'Что понравилось:\n- \n\nЧто не понравилось:\n- \n\nО чём думаю после прочитанного:\n'},
  {k:'chars',n:'Персонажи',t:'Персонажи',x:'# Главные\n- Имя — кто это, что о нём думаю\n\n# Второстепенные\n- \n'},
  {k:'quest',n:'Вопросы к книге',t:'Вопросы к книге',x:'- Почему…\n- Что будет, если…\n- \n'},
  {k:'scene',n:'Любимая сцена',t:'Любимая сцена',x:'Где это: \n\n> \n\nПочему запомнилась:\n'},
  {k:'final',n:'Итог книги',t:'Итог книги',x:'Оценка: из 5\n\nВ трёх словах: \n\nГлавная мысль:\n\nКому посоветую:\n'}];
const DY={view:'shelf',id:null,eid:null,tab:'all',q:'',shelf:'all',sheet:null,full:false,stab:'cover',aa:false};
const DYH={u:[],r:[],last:0}; /* undo / redo of the open entry, runtime only */
let __dyTimer=null;
function dyMkId(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function dyList(){if(!Array.isArray(S.diaries))S.diaries=[];return S.diaries;}
function dyGet(id){return dyList().find(function(y){return y.id===id;})||null;}
function dyBook(y){return y&&y.b?allBooks().find(function(x){return x.id===y.b;})||null:null;}
function diaryOf(bid){return bid?dyList().find(function(y){return y.b===bid;})||null:null;}
function dyCover(y){const c=DIARY_COVERS[y.cv]||DIARY_COVERS.school;return c.cols.find(function(x){return x[0]===y.cc;})||c.cols[0];}
function dyTitle(y){if(y.t)return y.t;const b=dyBook(y);return (b&&b.title)||y.bt||'Блокнот';}
function dyQuotes(y){return y.b?(S.quotes[y.b]||[]):[];}
function dyMarks(y){return y.b?(S.marks[y.b]||[]):[];}
function dyTouch(y){y.u=Date.now();save();}
/* skin-bound looks: open with the skin (free «Карандашный» always); an already chosen one stays even without it */
function dySkinOwned(sk){if(!sk)return true;try{return shopOwns('skin-'+sk);}catch(e){return false;}}
function dySkinName(sk){try{const it=shopItem('skin-'+sk);return it?it.name:sk;}catch(e){return sk;}}
function dySkinNow(){try{const t=activeTheme();return t&&t.skin?String(t.skin):'';}catch(e){return '';}}
function dySkinCover(sk){return sk?Object.keys(DIARY_COVERS).find(function(k){return DIARY_COVERS[k].sk===sk;})||'':'';}
function diaryNew(o){
  const b=o.b?allBooks().find(function(x){return x.id===o.b;}):null;
  const y={id:dyMkId('dy'),t:String(o.t||'').slice(0,80),b:b?b.id:'',bt:b?String(b.title||'').slice(0,120):'',ba:b?String(bookAuthor(b)||'').slice(0,80):'',
    cv:b?'school':'pencil',cc:'',pp:'lines',fn:'hand',fs:17,ink:'ink',rb:'red',so:'book',lh:'normal',al:'left',d:today(),u:Date.now(),e:[]};
  if(!b){y.pp='plain';}
  const k=dySkinCover(dySkinNow());if(k&&dySkinOwned(DIARY_COVERS[k].sk)){const c=DIARY_COVERS[k];y.cv=k;y.pp=c.pp;y.ink=c.ink;if(k==='atlas')y.rb='gold';}
  dyList().unshift(y);save();return y;
}
/* a book gets its diary by itself on the first quote or bookmark (S.diaryAuto); quiet — no toast in the reader */
function diaryAuto(bid){try{if(S.diaryAuto===false||!bid||diaryOf(bid))return null;return diaryNew({b:bid});}catch(e){console.warn('[rq] diaryAuto',e);return null;}}
function dyStats(y){const n=y.e.length,q=dyQuotes(y).length,m=dyMarks(y).length;const p=[];
  p.push(n+' '+plural(n,'запись','записи','записей'));if(y.b){p.push(q+' '+plural(q,'цитата','цитаты','цитат'));if(m)p.push(m+' '+plural(m,'закладка','закладки','закладок'));}
  return p.join(' · ');}
/* --- простая разметка записи: «# »/«## » заголовки, «- », «1. », «- [ ] » списки, «> » цитата, «---» черта,
   **жирный**, *курсив*, __подчёркнутый__, ~~зачёркнутый~~, ==маркер== (arch.md 26.10) --- */
function dyInline(s){return esc(s).replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>').replace(/__([^_\n]+)__/g,'<u>$1</u>').replace(/~~([^~\n]+)~~/g,'<s>$1</s>')
  .replace(/==([^=\n]+)==/g,'<mark>$1</mark>').replace(/\*([^*\n]+)\*/g,'<i>$1</i>');}
/* eid given → checklist boxes are live (tap = [ ] ↔ [x] in the stored text) */
function dyMd(x,eid){
  const out=[];let ls='';
  const close=function(){if(ls){out.push('</'+ls+'>');ls='';}};
  String(x||'').split('\n').forEach(function(l,i){
    let m=/^\s*[-•]\s+\[([ xX])\]\s?(.*)$/.exec(l);
    if(m){if(ls!=='ul'){close();out.push('<ul>');ls='ul';}const on=m[1]!==' ';
      out.push('<li class="dyck'+(on?' on':'')+'">'+(eid?'<button type="button" class="dyckb" role="checkbox" aria-checked="'+on+'" aria-label="Отметить пункт" data-act="ck" data-e="'+eid+'" data-ln="'+i+'"></button>':'<i class="dyckb" aria-hidden="true"></i>')+'<span>'+dyInline(m[2])+'</span></li>');return;}
    m=/^\s*[-•]\s+(.*)$/.exec(l);
    if(m){if(ls!=='ul'){close();out.push('<ul>');ls='ul';}out.push('<li>'+dyInline(m[1])+'</li>');return;}
    m=/^\s*(\d{1,3})[.)]\s+(.*)$/.exec(l);
    if(m){if(ls!=='ol'){close();out.push('<ol start="'+(+m[1])+'">');ls='ol';}out.push('<li>'+dyInline(m[2])+'</li>');return;}
    close();
    if(/^\s*---+\s*$/.test(l))out.push('<hr>');
    else if(/^##\s+/.test(l))out.push('<h5>'+dyInline(l.replace(/^##\s+/,''))+'</h5>');
    else if(/^#\s+/.test(l))out.push('<h4>'+dyInline(l.replace(/^#\s+/,''))+'</h4>');
    else if(/^>\s?/.test(l))out.push('<blockquote>'+dyInline(l.replace(/^>\s?/,''))+'</blockquote>');
    else if(!l.trim())out.push('<p class="dygap"></p>');
    else out.push('<p>'+dyInline(l)+'</p>');});
  close();
  return out.join('');
}
function dyPlain(x){return String(x||'').replace(/\*\*|__|~~|==|^#{1,2}\s+|^>\s?|^\s*[-•]\s+(?!\[)/gm,'').replace(/\*([^*\n]+)\*/g,'$1');}
/* where an item sits in its book, 0…1 (null = unknown → after the placed ones, by date) */
function dyQPos(b,q){
  if(!b||!q)return null;
  if(q.pdf&&Number.isInteger(q.pdf.p)){const n=b.pages||(R&&R.book&&R.book.id===b.id?R.pageCount:0);return n>1?Math.min(1,q.pdf.p/(n-1)):null;}
  if(b.text&&b.text.length){const i=b.text.indexOf(String(q.text).split(/\s*\n\s*/)[0].slice(0,40));return i>=0?i/b.text.length:null;}
  return null;
}
function dyItems(y){
  const b=dyBook(y),its=[];
  if(DY.tab==='all'||DY.tab==='notes')y.e.forEach(function(n){its.push({k:'e',o:n,pos:n.r,d:n.d,u:n.u,pin:n.pin});});
  if(DY.tab==='all'||DY.tab==='quotes')dyQuotes(y).forEach(function(q,i){its.push({k:'q',o:q,i:i,pos:dyQPos(b,q),d:q.date||'',u:0});});
  if(DY.tab==='all'||DY.tab==='marks')dyMarks(y).forEach(function(m,i){its.push({k:'m',o:m,i:i,pos:typeof m.ratio==='number'?m.ratio:null,d:m.date||'',u:0});});
  const q=DY.q.trim().toLowerCase();
  const hit=function(it){if(!q)return true;const o=it.o;return (it.k==='e'?(o.t+' '+o.x+' '+o.ch):it.k==='q'?(o.text+' '+(o.note||'')):'стр. '+o.page).toLowerCase().indexOf(q)>=0;};
  const by=function(a,b){
    if(!!a.pin!==!!b.pin)return a.pin?-1:1;
    if(y.so==='book'&&y.b){const pa=a.pos!=null,pb=b.pos!=null;if(pa&&pb&&a.pos!==b.pos)return a.pos-b.pos;if(pa!==pb)return pa?-1:1;}
    if(a.d!==b.d)return a.d<b.d?1:-1;return (b.u||0)-(a.u||0);};
  return its.filter(hit).sort(by);
}
function dyFmtDay(d){if(!d)return '';const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d);if(!m)return d;
  const M=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  return (+m[3])+' '+M[+m[2]-1]+(m[1]!==String(new Date().getFullYear())?' '+m[1]:'');}
/* --- обложка: CSS, без картинок; title on a label, ribbon from the bottom edge --- */
function dyCoverHtml(y,big){
  const c=dyCover(y);
  return '<div class="dycov'+(big?' big':'')+'" data-cv="'+esc(DIARY_COVERS[y.cv]?y.cv:'school')+'" data-cc="'+esc(c[0])+'" data-rb="'+esc(y.rb)+'" style="--cv:'+c[2]+'">'+
    '<span class="dylab"><span class="dylt">'+esc(dyTitle(y))+'</span>'+(y.b&&(y.ba||y.bt)?'<span class="dyla">'+esc(y.ba||'')+'</span>':'')+'</span><i class="dyrb" aria-hidden="true"></i></div>';
}
/* 25.10 (Джессика: «можно открывать дневники на весь экран»): открытый дневник всегда без нижней панели (CSS по data-view),
   а «На весь экран» оставляет только лист, от края до края, и прячет строку состояния телефона; выйти — кнопкой в углу */
function dyFullBtn(){return '<button type="button" class="dyhbtn" data-act="full" aria-label="На весь экран" title="На весь экран">'+rqIcon('maximize',20)+'</button>';}
function dyFullBar(){
  return '<div class="dyfbar">'+(DY.view==='edit'?'<button type="button" data-act="back" aria-label="Готово">'+rqIcon('check',22)+'</button>':'')+
    '<button type="button" data-act="full" aria-label="Обычный вид" title="Обычный вид">'+rqIcon('minimize',22)+'</button></div>'+
    (DY.view==='book'?'<button type="button" class="dyfab" data-act="newe" aria-label="Новая запись">'+rqIcon('notebook-pen',24)+'</button>':'');
}
function dyFsSet(on){
  try{
    const d=document.documentElement,act=!!(document.fullscreenElement||document.webkitFullscreenElement);
    if(on&&!act){const fn=d.requestFullscreen||d.webkitRequestFullscreen;if(fn){const pr=fn.call(d,{navigationUI:'hide'});if(pr&&pr.catch)pr.catch(function(){});}}
    else if(!on&&act){const fn=document.exitFullscreen||document.webkitExitFullscreen;if(fn){const pr=fn.call(document);if(pr&&pr.catch)pr.catch(function(){});}}
  }catch(e){}
}
function dyFull(on){DY.full=!!on;dyFsSet(DY.full);dyRender();const s=el('diary').querySelector('.scroll');if(s&&DY.full)s.scrollTop=0;}
function dyNight(){try{return appIsNight();}catch(e){return false;}}
function dyHead(back,title,extra){
  return '<div class="row libhead dyhead">'+(back?'<button type="button" class="menubtn" data-act="back" aria-label="Назад">'+rqIcon('arrow-left',22)+'</button>':
    '<button type="button" class="menubtn" id="menuDiary" aria-label="Меню">'+rqIcon('menu',22)+'</button>')+
    '<h1>'+esc(title)+'</h1><div class="spacer"></div>'+(extra||'')+'</div>';
}
/* ===== полка ===== */
function dyShelfHtml(){
  const L=dyList(),q=DY.q.trim().toLowerCase();
  let h=dyHead(false,'Дневники','<button type="button" class="dyhbtn" data-act="new" aria-label="Новый дневник">'+rqIcon('plus',22)+'</button>')+dyInvTabs();
  h+='<input id="dyQ" class="searchinp" type="search" enterkeyhint="search" placeholder="Поиск по всем записям и цитатам" aria-label="Поиск по дневникам" value="'+esc(DY.q)+'">';
  if(q)return h+dySearchHtml(q);
  const nb=L.filter(function(y){return y.b;}).length,nf=L.length-nb;
  h+='<div class="chips dychips" role="tablist">'+[['all','Все',L.length],['book','К книгам',nb],['free','Блокноты',nf]].map(function(x){
    return '<button type="button" class="fchip'+(DY.shelf===x[0]?' on':'')+'" role="tab" aria-selected="'+(DY.shelf===x[0])+'" data-act="shelf" data-v="'+x[0]+'">'+x[1]+' '+x[2]+'</button>';}).join('')+'</div>';
  const show=L.filter(function(y){return DY.shelf==='all'||(DY.shelf==='book'?!!y.b:!y.b);}).slice().sort(function(a,b){return (b.u||0)-(a.u||0);});
  if(!L.length)h+='<div class="emptyhint dyempty">'+rqIcon('notebook',40)+'<p>Здесь будут ваши дневники.</p><p>У каждой книги может быть свой дневник: записи по главам, цитаты и закладки в одном месте. А блокнот подойдёт для всего остального.</p>'+
    '<button type="button" class="buy" data-act="new">Завести дневник</button></div>';
  else if(!show.length)h+='<div class="emptyhint dyempty"><p>'+(DY.shelf==='free'?'Блокнотов пока нет.':'Дневников к книгам пока нет.')+'</p><button type="button" class="buy" data-act="new">Завести</button></div>';
  else{h+='<div class="dyshelf">';
    show.forEach(function(y){h+='<button type="button" class="dynb" data-act="open" data-id="'+y.id+'">'+dyCoverHtml(y)+'<i class="dypl" aria-hidden="true"></i><span class="dynm">'+esc(dyTitle(y))+'</span><span class="dyst">'+esc(dyStats(y))+'</span></button>';});
    h+='</div>';}
  /* books with quotes or bookmarks but no diary yet (e.g. from before diaries existed) */
  const lone=allBooks().filter(function(b){return !diaryOf(b.id)&&((S.quotes[b.id]||[]).length||(S.marks[b.id]||[]).length);});
  if(lone.length)h+='<h2>Книги с цитатами без дневника</h2><div class="dylone">'+lone.slice(0,12).map(function(b){const n=(S.quotes[b.id]||[]).length;
    return '<div class="qcard dylrow"><div class="dylt2"><b>'+esc(b.title)+'</b><small>'+n+' '+plural(n,'цитата','цитаты','цитат')+'</small></div><button type="button" class="buy" data-act="mkbook" data-b="'+esc(b.id)+'">Завести дневник</button></div>';}).join('')+'</div>';
  h+='<div class="dyauto"><span id="dyAutoL">Заводить дневник книги сам<small>при первой цитате или закладке</small></span><button type="button" class="rsw" id="dyAuto" role="switch" aria-labelledby="dyAutoL" aria-checked="'+(S.diaryAuto!==false)+'" data-act="auto"></button></div>';
  return h;
}
/* 26.10 (Джессика: «вкладку "Инвентарь" слить с дневниками»): цитаты и словарь — соседние вкладки раздела; их экраны те же (quotes, vocab) */
function dyInvTabs(){
  return '<div class="ptabs progtabs dyinv" role="tablist" aria-label="Разделы дневников"><button type="button" class="progtab on" role="tab" aria-selected="true" data-sub="diary">'+rqIcon('notebook',16)+' Дневники</button>'+
    '<button type="button" class="progtab" role="tab" aria-selected="false" data-sub="quotes" onclick="openProgress(\'quotes\')">'+rqIcon('quote',16)+' Цитаты и заметки</button>'+
    '<button type="button" class="progtab" role="tab" aria-selected="false" data-sub="vocab" onclick="openProgress(\'vocab\')">'+rqIcon('book-marked',16)+' Словарь</button></div>';
}
function dySearchHtml(q){
  const rows=[];
  dyList().forEach(function(y){
    y.e.forEach(function(n){if((n.t+' '+n.x+' '+n.ch).toLowerCase().indexOf(q)>=0)rows.push('<button type="button" class="qcard dyres" data-act="opene" data-id="'+y.id+'" data-e="'+n.id+'"><small>'+esc(dyTitle(y))+'</small><b>'+esc(n.t||dyPlain(n.x).slice(0,60))+'</b><span>'+esc(dyPlain(n.x).slice(0,140))+'</span></button>');});
    dyQuotes(y).forEach(function(qq){if((qq.text+' '+(qq.note||'')).toLowerCase().indexOf(q)>=0)rows.push('<button type="button" class="qcard dyres" data-act="open" data-id="'+y.id+'" data-tab="quotes"><small>'+esc(dyTitle(y))+' · цитата</small><span>«'+esc(String(qq.text).slice(0,160))+'»</span>'+(qq.note?'<span class="qnote">'+esc(qq.note)+'</span>':'')+'</button>');});});
  return rows.length?'<div class="dyresl">'+rows.slice(0,100).join('')+'</div>':'<div class="emptyhint dyempty"><p>Ничего не нашлось</p></div>';
}
/* ===== дневник ===== */
function dyPaperAttrs(y){return ' data-pp="'+y.pp+'" data-fn="'+y.fn+'" data-ink="'+y.ink+'" data-lh="'+(y.lh||'normal')+'" data-al="'+(y.al||'left')+'" style="--dyfs:'+y.fs+'px"';}
/* look changes without re-rendering: the editor keeps its text, caret and keyboard */
function dyApplyPaper(y){
  document.querySelectorAll('#dyBox .dypaper,#dySheet .dypaper').forEach(function(p){p.dataset.pp=y.pp;p.dataset.fn=y.fn;p.dataset.ink=y.ink;p.dataset.lh=y.lh||'normal';p.dataset.al=y.al||'left';p.style.setProperty('--dyfs',y.fs+'px');});
  dyGrow();
}
function dyBookHtml(y){
  const b=dyBook(y);
  let h=dyHead(true,dyTitle(y),dyFullBtn()+'<button type="button" class="dyhbtn" data-act="cfg" aria-label="Оформление дневника">'+rqIcon('palette',22)+'</button>');
  h+='<div class="dytop">'+dyCoverHtml(y,true)+'<div class="dytopr">'+(y.b?'<b>'+esc((b&&b.title)||y.bt)+'</b>'+((b?bookAuthor(b):y.ba)?'<span>'+esc(b?bookAuthor(b):y.ba)+'</span>':'')+
    (b?'<button type="button" class="buy dygo" data-act="read">'+rqIcon('book-open',16)+' Открыть книгу</button>':'<small class="dygone">Книги больше нет на полке, записи остались</small>'):'<b>Блокнот</b><span>Заведён '+esc(dyFmtDay(y.d))+'</span>')+
    '<small class="dyst2">'+esc(dyStats(y))+'</small></div></div>';
  if(y.b){h+='<div class="chips dychips" role="tablist">'+[['all','Всё'],['notes','Записи'],['quotes','Цитаты'],['marks','Закладки']].map(function(x){
      return '<button type="button" class="fchip'+(DY.tab===x[0]?' on':'')+'" role="tab" aria-selected="'+(DY.tab===x[0])+'" data-act="tab" data-v="'+x[0]+'">'+x[1]+'</button>';}).join('')+
      '<span class="dysep" aria-hidden="true"></span><button type="button" class="fchip dyso" data-act="sort" aria-label="Порядок">'+rqIcon(y.so==='book'?'list':'calendar',14)+(y.so==='book'?'По книге':'По датам')+'</button></div>';}
  h+='<button type="button" class="addbtn dyadd" data-act="newe">'+rqIcon('notebook-pen',18)+' Новая запись</button>';
  h+='<div class="chips dytpl">'+DIARY_TPL.map(function(t){return '<button type="button" class="fchip" data-act="tpl" data-v="'+t.k+'">'+rqIcon('plus',14)+esc(t.n)+'</button>';}).join('')+'</div>';
  const its=dyItems(y);
  h+='<div class="dypaper"'+dyPaperAttrs(y)+'>';
  if(!its.length)h+='<div class="dype">'+(DY.tab==='quotes'?'Цитат пока нет. Выделите текст в книге, и цитата появится здесь.':DY.tab==='marks'?'Закладок пока нет.':'Пока пусто. Напишите первую запись или начните с шаблона.')+'</div>';
  its.forEach(function(it){
    const o=it.o;
    if(it.k==='e'){const where=[o.ch,o.pg?'стр. '+o.pg:''].filter(Boolean).join(' · ');
      h+='<article class="dyent'+(o.pin?' pin':'')+'" data-act="edit" data-e="'+o.id+'"'+(o.cl?' data-cl="'+esc(o.cl)+'"':'')+' tabindex="0">'+(o.pin?'<span class="dypin" role="img" aria-label="Закреплена">'+rqIcon('pin',14)+'</span>':'')+
        (o.t?'<h3>'+esc(o.t)+'</h3>':'')+'<div class="dymd">'+dyMd(o.x,o.id)+'</div><div class="dymeta">'+(where?'<span>'+esc(where)+'</span>':'')+'<span>'+esc(dyFmtDay(o.d))+'</span></div></article>';}
    else if(it.k==='q'){
      h+='<div class="dyq" style="--d:'+hlDot(o.c)+'"><blockquote>«'+esc(o.text)+'»</blockquote>'+(o.note?'<div class="dyqn">'+rqIcon('notebook-pen',14)+' '+esc(o.note)+'</div>':'')+
        '<div class="dymeta"><span>'+esc(dyFmtDay(o.date))+'</span><div class="spacer"></div><button type="button" data-act="qnote" data-i="'+it.i+'">'+(o.note?'Изменить заметку':'Заметка')+'</button>'+
        (b?'<button type="button" data-act="qgo" data-i="'+it.i+'">В книге</button>':'')+'</div></div>';}
    else h+='<div class="dymk">'+rqIcon('bookmark',16)+'<span>Закладка · стр. '+esc(o.page)+'</span><span class="dymd2">'+esc(dyFmtDay(o.date))+'</span>'+(b?'<button type="button" data-act="mgo" data-i="'+it.i+'">Открыть</button>':'')+'</div>';
  });
  h+='</div>';
  if(y.b||y.e.length>3)h+='<input id="dyQ" class="searchinp dyq2" type="search" enterkeyhint="search" placeholder="Найти в этом дневнике" aria-label="Поиск в дневнике" value="'+esc(DY.q)+'">';
  return h;
}
/* ===== запись ===== */
function dyEditHtml(y,n){
  const where=[n.ch,n.pg?'стр. '+n.pg:''].filter(Boolean).join(' · ');
  let h=dyHead(true,n.t||'Запись',dyFullBtn()+'<button type="button" class="dyhbtn'+(n.pin?' on':'')+'" data-act="pin" aria-pressed="'+n.pin+'" aria-label="Закрепить">'+rqIcon('pin',20)+'</button>'+
    '<button type="button" class="dyhbtn" data-act="dele" aria-label="Удалить запись">'+rqIcon('trash-2',20)+'</button>');
  h+='<div class="dyedmeta">'+esc(dyTitle(y))+(where?' · '+esc(where):'')+' · '+esc(dyFmtDay(n.d))+'</div>';
  /* 26.10 (Джессика: «широкие настройки, но удобные»): one scrolling row of tools; «Аа» opens the look of the diary and the entry's colour right here */
  const tb=function(v,l,ic){return '<button type="button" data-act="fmt" data-v="'+v+'" aria-label="'+l+'" title="'+l+'">'+(ic.length<=2?'<span class="dytbt dytb-'+v+'">'+ic+'</span>':rqIcon(ic,18))+'</button>';};
  h+='<div class="dytb" role="toolbar" aria-label="Оформление текста">'+tb('undo','Отменить','undo-2')+tb('redo','Вернуть','redo-2')+'<i class="dytbs" aria-hidden="true"></i>'+
    '<button type="button" class="dytbaa'+(DY.aa?' on':'')+'" data-act="aa" aria-expanded="'+DY.aa+'" aria-controls="dyAa" aria-label="Шрифт, лист и метка" title="Шрифт, лист и метка"><span class="dytbt">Аа</span></button><i class="dytbs" aria-hidden="true"></i>'+
    tb('h','Заголовок','heading')+tb('b','Жирный','B')+tb('i','Курсив','I')+tb('u','Подчёркнутый','underline')+tb('s','Зачёркнутый','strikethrough')+tb('mk','Маркер','highlighter')+'<i class="dytbs" aria-hidden="true"></i>'+
    tb('ul','Список','list')+tb('ol','Нумерованный список','list-ordered')+tb('ck','Чек-лист','list-checks')+tb('q','Цитата','quote')+tb('hr','Черта','minus')+'</div>'+dyAaHtml(y,n);
  h+='<div class="dypaper dyed"'+dyPaperAttrs(y)+(n.cl?' data-cl="'+esc(n.cl)+'"':'')+'><input id="dyET" class="dyet" type="text" maxlength="120" placeholder="Заголовок" aria-label="Заголовок" value="'+esc(n.t)+'">'+
    '<textarea id="dyEX" class="dyex" maxlength="20000" placeholder="Пишите здесь" aria-label="Текст записи">'+esc(n.x)+'</textarea></div>';
  h+='<div class="dyedf"><span id="dySaved" aria-live="polite"></span><div class="spacer"></div>'+(dyBook(y)&&n.r!=null?'<button type="button" class="buy dygo" data-act="ego">'+rqIcon('book-open',16)+' К этому месту</button>':'')+'<button type="button" class="buy" data-act="back">Готово</button></div>';
  return h;
}
/* «Аа» in the editor: the diary's look (whole diary) and this entry's colour tag */
function dyPick(act,list,cur,sw){
  return '<div class="dypick" role="radiogroup">'+list.map(function(x){const on=x[0]===cur,lk=x[2]&&!dySkinOwned(x[2]);
    return '<button type="button" class="dyp'+(on?' on':'')+(lk?' lk':'')+'" role="radio" aria-checked="'+on+'" data-act="'+(lk?'lock':act)+'" data-v="'+esc(x[0])+'"'+(lk?' data-sk="'+x[2]+'" aria-label="'+esc(x[1]+', со скином «'+dySkinName(x[2])+'»')+'"':'')+'>'+
      (sw?'<i class="dysw" data-'+sw+'="'+esc(x[0])+'"></i>':'')+'<span>'+esc(x[1])+'</span>'+(lk?rqIcon('lock',14):'')+'</button>';}).join('')+'</div>';}
function dyTagPick(cur){return '<div class="dypick dytags" role="radiogroup" aria-label="Метка записи">'+DIARY_TAGS.map(function(x){const on=x[0]===cur;
  return '<button type="button" class="dytag'+(on?' on':'')+'" role="radio" aria-checked="'+on+'" data-act="cl" data-v="'+x[0]+'" aria-label="'+esc(x[1])+'" title="'+esc(x[1])+'"><i data-cl="'+x[0]+'">'+(x[0]?'':rqIcon('x',14))+'</i></button>';}).join('')+'</div>';}
function dyFsStep(y){return '<div class="dystep"><button type="button" data-act="fs" data-v="-1" aria-label="Мельче"'+(y.fs<=14?' disabled':'')+'>'+rqIcon('minus',18)+'</button><output id="dyFsO" aria-live="polite">'+y.fs+'</output><button type="button" data-act="fs" data-v="1" aria-label="Крупнее"'+(y.fs>=24?' disabled':'')+'>'+rqIcon('plus',18)+'</button></div>';}
function dyAaHtml(y,n){
  const row=function(l,c){return '<div class="dyaar"><span class="dyaal">'+l+'</span>'+c+'</div>';};
  return '<div class="dyaa" id="dyAa"'+(DY.aa?'':' hidden')+'><div class="dysh">Эта запись</div>'+row('Метка',dyTagPick(n.cl||''))+
    '<div class="dysh">Весь дневник</div>'+row('Шрифт',dyPick('fn',DIARY_FONTS,y.fn,'fn'))+row('Размер',dyFsStep(y))+row('Интервал',dyPick('lh',DIARY_LH,y.lh||'normal'))+
    row('Края',dyPick('al',DIARY_AL,y.al||'left'))+row('Чернила',dyPick('ink',DIARY_INKS,y.ink,'ink'))+row('Бумага',dyPick('pp',DIARY_PAPERS,y.pp,'pp'))+'</div>';}
function dyAaRefresh(y,n){const a=el('dyAa');if(a&&n)a.outerHTML=dyAaHtml(y,n);}
/* a skin-bound look without the skin: say where it comes from, offer the shop (nothing is hidden) */
function dyLockAsk(sk){
  const nm=dySkinName(sk);
  return rqAsk({t:'Со скином «'+nm+'»',p:'Обложка, бумага и чернила «'+nm+'» открываются вместе со скином. Он есть в магазине.',ok:'В магазин'}).then(function(ok){
    if(!ok)return;DY.sheet=null;dySheetRender();if(DY.full){DY.full=false;dyFsSet(false);}openLook(true);});
}
/* ===== листы (новый дневник, оформление) ===== */
function dySheetHtml(){
  if(DY.sheet==='new'){
    const books=allBooks().filter(function(b){return !diaryOf(b.id);});
    return '<h3>Новый дневник</h3><button type="button" class="dyopt" data-act="mkfree">'+rqIcon('notebook',22)+'<span><b>Свободный блокнот</b><small>Для мыслей, списков и планов, без книги</small></span></button>'+
      '<div class="dysh">Дневник к книге</div>'+(books.length?'<div class="dybl">'+books.map(function(b){return '<button type="button" class="dyopt" data-act="mkbook" data-b="'+esc(b.id)+'">'+rqIcon('book-open',20)+'<span><b>'+esc(b.title)+'</b>'+(bookAuthor(b)?'<small>'+esc(bookAuthor(b))+'</small>':'')+'</span></button>';}).join('')+'</div>':
      '<p class="dyshp">У всех книг на полке уже есть дневники.</p>');
  }
  const y=dyGet(DY.id);if(!y)return '';
  const cur=DIARY_COVERS[y.cv]||DIARY_COVERS.school;
  /* live preview on top, then four short tabs instead of one long list */
  let h='<h3>Оформление</h3><div class="dyprev" aria-hidden="true">'+dyCoverHtml(y)+'<div class="dypaper dyprevp"'+dyPaperAttrs(y)+'><h4>Глава первая</h4><p>Так будут выглядеть <b>записи</b> и <mark>пометки</mark> в этом дневнике.</p></div></div>';
  h+='<div class="chips dystabs" role="tablist">'+[['cover','Обложка'],['page','Лист'],['text','Текст'],['more','Ещё']].map(function(x){const on=DY.stab===x[0];
    return '<button type="button" class="fchip'+(on?' on':'')+'" role="tab" aria-selected="'+on+'" data-act="stab" data-v="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';
  if(DY.stab==='cover'){
    h+='<label class="dysh" for="dyName">Название</label><input id="dyName" class="searchinp" maxlength="80" placeholder="'+esc(dyTitle(y))+'" value="'+esc(y.t)+'">';
    Object.keys(DIARY_COVERS).forEach(function(k){const c=DIARY_COVERS[k],lk=!dySkinOwned(c.sk);
      h+='<div class="dycvh"><b>'+esc(c.n)+'</b><small>'+(c.sk?(lk?rqIcon('lock',12)+' Со скином «'+esc(dySkinName(c.sk))+'»':'Скин «'+esc(dySkinName(c.sk))+'»'):'Для всех')+'</small></div><div class="dycvs">'+
        c.cols.map(function(col){const on=y.cv===k&&dyCover(y)[0]===col[0];
          return '<button type="button" class="dycvb'+(on?' on':'')+(lk?' lk':'')+'" aria-pressed="'+on+'" data-act="'+(lk?'lock':'cv')+'" data-v="'+k+'" data-c="'+col[0]+'"'+(lk?' data-sk="'+c.sk+'"':'')+' aria-label="'+esc(c.n+', '+col[1]+(lk?', со скином «'+dySkinName(c.sk)+'»':''))+'">'+
            dyCoverHtml(Object.assign({},y,{cv:k,cc:col[0]}))+(lk?'<span class="dylk">'+rqIcon('lock',16)+'</span>':'')+'<small>'+esc(col[1])+'</small></button>';}).join('')+'</div>';});
    h+='<p class="dyshp">'+esc(cur.n)+': '+esc(cur.d)+'.</p>';
    h+='<div class="dysh">Ленточка-закладка</div>'+dyPick('rb',DIARY_RIBBONS,y.rb,'rb');
  }else if(DY.stab==='page'){
    h+='<div class="dysh">Бумага</div>'+dyPick('pp',DIARY_PAPERS,y.pp,'pp');
    h+='<div class="dysh">Чернила</div>'+dyPick('ink',DIARY_INKS,y.ink,'ink');
  }else if(DY.stab==='text'){
    h+='<div class="dysh">Шрифт записей</div>'+dyPick('fn',DIARY_FONTS,y.fn,'fn');
    h+='<div class="dysh"><label for="dyFs">Размер</label> <span id="dyFsV">'+y.fs+'</span></div><input id="dyFs" class="bslider" type="range" min="14" max="24" step="1" value="'+y.fs+'" aria-label="Размер шрифта записей">';
    h+='<div class="dysh">Межстрочный интервал</div>'+dyPick('lh',DIARY_LH,y.lh||'normal');
    h+='<div class="dysh">Края текста</div>'+dyPick('al',DIARY_AL,y.al||'left');
    h+='<p class="dyshp">То же самое есть прямо в записи, под кнопкой «Аа».</p>';
  }else{
    if(y.b)h+='<div class="dysh">Порядок записей</div>'+dyPick('so',[['book','По книге'],['date','По датам']],y.so);
    h+='<div class="dysh">Действия</div><button type="button" class="dyopt" data-act="export">'+rqIcon('share-2',20)+'<span><b>Поделиться дневником</b><small>Текстом: записи, цитаты и заметки</small></span></button>'+
      '<button type="button" class="dyopt danger" data-act="dely">'+rqIcon('trash-2',20)+'<span><b>Удалить дневник</b><small>'+(y.b?'Записи пропадут, цитаты и закладки останутся в книге':'Блокнот и все записи пропадут')+'</small></span></button>';
  }
  return h;
}
/* ===== отрисовка ===== */
function dyRender(){
  const box=el('dyBox');if(!box)return;
  const y=DY.id?dyGet(DY.id):null;
  if(DY.view!=='shelf'&&!y){DY.view='shelf';DY.id=null;}
  const n=DY.view==='edit'&&y?y.e.find(function(x){return x.id===DY.eid;}):null;
  if(DY.view==='edit'&&!n)DY.view='book';
  if(DY.view==='shelf'&&DY.full){DY.full=false;dyFsSet(false);}
  const sc=el('diary');if(sc){sc.dataset.view=DY.view;sc.classList.toggle('dyn',dyNight());if(el('dySheet'))el('dySheet').classList.toggle('dyn',dyNight());sc.classList.toggle('dyfull',DY.full);}
  box.innerHTML=(DY.view==='shelf'?dyShelfHtml():DY.view==='book'?dyBookHtml(y):dyEditHtml(y,n))+(DY.full?dyFullBar():'');
  const m=el('menuDiary');if(m)m.onclick=openDrawer;
  const q=el('dyQ');if(q)q.oninput=function(){DY.q=q.value;const pos=q.selectionStart;dyRender();const q2=el('dyQ');if(q2){q2.focus();try{q2.setSelectionRange(pos,pos);}catch(e){}}};
  if(DY.view==='edit')dyEditBind(y,n);
  dySheetRender();
}
function dySheetRender(){
  const sh=el('dySheet'),sc=el('dyScrim');if(!sh)return;
  if(!DY.sheet){sh.hidden=true;sc.hidden=true;return;}
  const top=sh.scrollTop;sh.innerHTML='<div class="grab" aria-hidden="true"></div><button type="button" class="dyx" data-act="shx" aria-label="Закрыть">'+rqIcon('x',22)+'</button>'+dySheetHtml();
  sh.hidden=false;sc.hidden=false;sh.scrollTop=top;
  const nm=el('dyName'),y=dyGet(DY.id);
  if(nm&&y)nm.onchange=nm.onblur=function(){const v=nm.value.trim().slice(0,80);if(v!==y.t){y.t=v;dyTouch(y);dyRenderKeepSheet();}};
  const fs=el('dyFs');if(fs&&y)fs.oninput=function(){y.fs=Math.max(14,Math.min(24,+fs.value||17));el('dyFsV').textContent=y.fs;dyApplyPaper(y);clearTimeout(__dyTimer);__dyTimer=setTimeout(function(){dyTouch(y);},300);};
}
function dyRenderKeepSheet(){const s=DY.sheet;dyRender();DY.sheet=s;}
function dyGrow(){const x=el('dyEX');if(!x)return;x.style.height='auto';x.style.height=Math.max(220,x.scrollHeight+4)+'px';}
function dyEditBind(y,n){
  const t=el('dyET'),x=el('dyEX');dyGrow();
  DYH.u=[];DYH.r=[];DYH.last=0;dyHistUi();
  const put=function(){clearTimeout(__dyTimer);__dyTimer=setTimeout(function(){dyEditSave(y,n);},500);const s=el('dySaved');if(s)s.textContent='';};
  t.oninput=put;x.oninput=function(){dyGrow();put();};
  /* typing is undone in bursts; Enter inside a list starts the next item (an empty item ends the list) */
  x.addEventListener('beforeinput',function(e){
    if(e.inputType==='historyUndo'||e.inputType==='historyRedo'){e.preventDefault();dyUndo(e.inputType==='historyRedo');return;}
    if((e.inputType==='insertLineBreak'||e.inputType==='insertParagraph')&&dyListEnter(x)){e.preventDefault();return;}
    dyHistPush(x,false);
  });
  const bar=document.querySelector('#dyBox .dytb');if(bar)bar.addEventListener('mousedown',function(e){if(e.target.closest('button'))e.preventDefault();}); /* keep the caret in the text */
}
function dyHistPush(x,force){
  const now=Date.now(),top=DYH.u[DYH.u.length-1];
  if(!force&&now-DYH.last<1000&&top)return;DYH.last=force?0:now;
  if(top&&top.v===x.value)return;
  DYH.u.push({v:x.value,a:x.selectionStart,z:x.selectionEnd});if(DYH.u.length>100)DYH.u.shift();DYH.r=[];dyHistUi();
}
function dyUndo(redo){
  const x=el('dyEX');if(!x)return;const from=redo?DYH.r:DYH.u,to=redo?DYH.u:DYH.r;if(!from.length)return;
  to.push({v:x.value,a:x.selectionStart,z:x.selectionEnd});const st=from.pop();
  x.value=st.v;x.focus();try{x.setSelectionRange(st.a,st.z);}catch(e){}DYH.last=0;x.dispatchEvent(new Event('input'));dyHistUi();
}
function dyHistUi(){const u=document.querySelector('#dyBox [data-v="undo"]'),r=document.querySelector('#dyBox [data-v="redo"]');if(u)u.disabled=!DYH.u.length;if(r)r.disabled=!DYH.r.length;}
function dyListEnter(x){
  const a=x.selectionStart;if(a!==x.selectionEnd)return false;
  const s=x.value,ls=s.lastIndexOf('\n',a-1)+1,line=s.slice(ls,a);
  const m=/^(\s*)([-•]\s+\[[ xX]\]\s?|[-•]\s+|(\d{1,3})([.)])\s+|>\s?)/.exec(line);if(!m)return false;
  dyHistPush(x,true);
  let c;
  if(line.length===m[0].length&&!s.slice(a).split('\n')[0].trim()){x.value=s.slice(0,ls)+s.slice(a);c=ls;}
  else{const p=m[1]+(m[3]?(+m[3]+1)+m[4]+' ':/\[/.test(m[2])?'- [ ] ':m[2]);x.value=(s.slice(0,a)+'\n'+p+s.slice(a)).slice(0,20000);c=a+1+p.length;}
  try{x.setSelectionRange(c,c);}catch(e){}x.dispatchEvent(new Event('input'));return true;
}
function dyEditSave(y,n){
  clearTimeout(__dyTimer);const t=el('dyET'),x=el('dyEX');if(!t||!x||!n)return;
  const nt=t.value.slice(0,120),nx=x.value.slice(0,20000);if(nt===n.t&&nx===n.x)return;
  n.t=nt;n.x=nx;n.u=Date.now();dyTouch(y);const s=el('dySaved');if(s)s.textContent='Сохранено';
  const h=document.querySelector('#dyBox .dyhead h1');if(h)h.textContent=nt||'Запись';
}
/* leaving the editor: an entry with no title and no text is dropped */
function dyEditClose(){
  const y=dyGet(DY.id),n=y&&y.e.find(function(x){return x.id===DY.eid;});
  if(n){dyEditSave(y,n);if(!n.t.trim()&&!n.x.trim()){y.e.splice(y.e.indexOf(n),1);save();}}
  DY.view='book';DY.eid=null;
}
function dyFmt(v){
  if(v==='undo'||v==='redo')return dyUndo(v==='redo');
  const x=el('dyEX');if(!x)return;const a=x.selectionStart,z=x.selectionEnd,s=x.value,sel=s.slice(a,z);
  const ls=s.lastIndexOf('\n',a-1)+1;let le=s.indexOf('\n',z>a&&s[z-1]==='\n'?z-1:z);if(le<0)le=s.length;
  const wrap={b:'**',i:'*',u:'__',s:'~~',mk:'=='}[v];let ins,ca,cz;
  if(wrap){const w=wrap.length,round=s.slice(a-w,a)===wrap&&s.slice(z,z+w)===wrap&&!(v==='i'&&(s[a-2]==='*'||s[z+1]==='*'));
    if(round){ins=s.slice(0,a-w)+sel+s.slice(z+w);ca=a-w;cz=ca+sel.length;} /* tapped again → off */
    else{ins=s.slice(0,a)+wrap+sel+wrap+s.slice(z);ca=a+w;cz=ca+sel.length;}}
  else if(v==='hr'){const pre=(a>0&&s[a-1]!=='\n'?'\n':'')+'---\n';ins=s.slice(0,a)+pre+s.slice(z);ca=cz=a+pre.length;}
  else{
    /* line tools work on every selected line; tapping again takes the mark off; heading goes # → ## → plain */
    const L=s.slice(ls,le).split('\n');
    const strip=function(l){return l.replace(/^(#{1,2}\s+|>\s?|\s*[-•]\s+\[[ xX]\]\s?|\s*[-•]\s+|\s*\d{1,3}[.)]\s+)/,'');};
    const has={h:/^#{1,2}\s+/,ul:/^\s*[-•]\s+(?!\[[ xX]\])/,ol:/^\s*\d{1,3}[.)]\s+/,ck:/^\s*[-•]\s+\[[ xX]\]/,q:/^>\s?/}[v];if(!has)return;
    let out;
    if(v==='h'){const nx=/^##\s+/.test(L[0])?'':/^#\s+/.test(L[0])?'## ':'# ';out=L.map(function(l){return l.trim()||L.length===1?nx+strip(l):l;});}
    else{const off=L.every(function(l){return !l.trim()||has.test(l);})&&L.some(function(l){return l.trim();});let k=0;
      out=L.map(function(l){if(off)return strip(l);if(!l.trim()&&L.length>1)return l;k++;return (v==='ul'?'- ':v==='ol'?k+'. ':v==='ck'?'- [ ] ':'> ')+strip(l);});}
    const r=out.join('\n');ins=s.slice(0,ls)+r+s.slice(le);
    if(L.length===1){const d=r.length-(le-ls);ca=Math.max(ls,a+d);cz=Math.max(ls,z+d);}else{ca=ls;cz=ls+r.length;}
  }
  dyHistPush(x,true);
  x.value=ins.slice(0,20000);x.focus();try{x.setSelectionRange(Math.max(0,ca),Math.max(0,cz));}catch(e){}x.dispatchEvent(new Event('input'));
}
/* the diary's look changes in place in the editor (text and caret stay), elsewhere a re-render */
function dySetLook(y,k,v){
  y[k]=v;dyTouch(y);
  if(DY.view==='edit'){dyApplyPaper(y);dyAaRefresh(y,y.e.find(function(x){return x.id===DY.eid;}));}
  else dyRenderKeepSheet();
}
/* ===== навигация (системный «назад»: лист → запись → дневник → полка) ===== */
function openDiary(){DY.full=false;DY.view='shelf';DY.id=null;DY.eid=null;DY.q='';DY.sheet=null;dyRender();show('diary');const s=el('diary').querySelector('.scroll');if(s)s.scrollTop=0;}
function dyOpen(id,tab){DY.id=id;DY.view='book';DY.tab=tab||'all';DY.q='';dyRender();navPush('diary');const s=el('diary').querySelector('.scroll');if(s)s.scrollTop=0;}
function dyOpenEntry(id,eid){DY.id=id;DY.eid=eid;DY.view='edit';DY.q='';dyRender();navPush('diaryEd');const s=el('diary').querySelector('.scroll');if(s)s.scrollTop=0;}
function dySheet(k){DY.sheet=k;dySheetRender();navPush('diarySh');}
function dySheetClose(){DY.sheet=null;dySheetRender();}
function dyBack(){
  if(DY.sheet){if(navState()==='diarySh')history.back();else dySheetClose();return;}
  if(DY.view==='edit'){if(navState()==='diaryEd')history.back();else{dyEditClose();dyRender();}return;}
  if(DY.view==='book'){if(navState()==='diary')history.back();else{DY.view='shelf';DY.id=null;DY.q='';dyRender();}}
}
function diaryIsOpen(){const d=el('diary');return !!d&&!d.classList.contains('hidden');}
window.addEventListener('popstate',function(e){
  if(!diaryIsOpen())return;const st=(e.state&&e.state.rq)||null;
  if(DY.sheet&&st!=='diarySh'){dySheetClose();if(st==='diaryEd'||st==='diary')return;}
  if(DY.view==='edit'&&st!=='diaryEd'){dyEditClose();if(st==='diary'){dyRender();return;}}
  if(DY.view==='book'&&st!=='diary'&&st!=='diaryEd'){DY.view='shelf';DY.id=null;DY.q='';}
  dyRender();
});
/* ===== действия ===== */
function dyNewEntry(y,tpl,at){
  const t=tpl?DIARY_TPL.find(function(x){return x.k===tpl;}):null;
  const n={id:dyMkId('e'),t:t?t.t:'',x:t?t.x:'',tp:t?t.k:'',ch:'',pg:0,r:null,d:today(),u:Date.now(),pin:false};
  if(at){n.ch=String(at.ch||'').slice(0,120);n.pg=at.pg|0;n.r=at.r;}
  y.e.unshift(n);dyTouch(y);return n;
}
function dyExportText(y){
  const b=dyBook(y),L=[dyTitle(y)];if(y.b)L.push([(b&&b.title)||y.bt,b?bookAuthor(b):y.ba].filter(Boolean).join(' — '));
  y.e.slice().sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:0;}).forEach(function(n){L.push('');L.push((n.t?n.t+' · ':'')+dyFmtDay(n.d)+(n.ch?' · '+n.ch:'')+(n.pg?' · стр. '+n.pg:''));L.push(dyPlain(n.x).trim());});
  const qs=dyQuotes(y);if(qs.length){L.push('');L.push('Цитаты');qs.forEach(function(q){L.push('«'+q.text+'»'+(q.note?'\n  '+q.note:''));});}
  return L.join('\n');
}
async function dyGoBook(y,fn){
  const b=dyBook(y);if(!b)return;
  if(DY.full){DY.full=false;dyFsSet(false);}
  try{await openBook(b.id);}catch(e){console.warn('[rq] diary open',e);return;}
  if(!R.book||R.book.id!==b.id)return;
  setTimeout(function(){try{fn();}catch(e){console.warn('[rq] diary go',e);}},250);
}
function dyClick(e){
  const t=e.target.closest('[data-act]');if(!t||!(el('diary').contains(t)||el('dySheet').contains(t)))return;
  const a=t.dataset.act,y=DY.id?dyGet(DY.id):null;
  if(a==='back')return dyBack();
  if(a==='new')return dySheet('new');
  if(a==='full')return dyFull(!DY.full);
  if(a==='shx')return dyBack();
  if(a==='shelf'){DY.shelf=t.dataset.v;return dyRender();}
  if(a==='open')return dyOpen(t.dataset.id,t.dataset.tab);
  if(a==='opene'){DY.id=t.dataset.id;DY.view='book';navPush('diary');return dyOpenEntry(t.dataset.id,t.dataset.e);}
  if(a==='auto'){S.diaryAuto=S.diaryAuto===false;save();t.setAttribute('aria-checked',String(S.diaryAuto));return;}
  if(a==='mkfree'){const ny=diaryNew({});DY.sheet=null;dySheetRender();if(navState()==='diarySh')history.replaceState({rq:'diary'},'',location.href);else navPush('diary');DY.id=ny.id;DY.view='book';DY.tab='all';dyRender();DY.sheet='cfg';dySheetRender();navPush('diarySh');return;}
  if(a==='mkbook'){const ex=diaryOf(t.dataset.b);const ny=ex||diaryNew({b:t.dataset.b});DY.sheet=null;dySheetRender();if(navState()==='diarySh')history.replaceState({rq:'diary'},'',location.href);else navPush('diary');DY.id=ny.id;DY.view='book';DY.tab='all';dyRender();return;}
  if(!y)return;
  if(a==='cfg'){DY.stab='cover';return dySheet('cfg');}
  if(a==='tab'){DY.tab=t.dataset.v;return dyRender();}
  if(a==='sort'){y.so=y.so==='book'?'date':'book';dyTouch(y);return dyRender();}
  if(a==='newe'||a==='tpl'){const n=dyNewEntry(y,a==='tpl'?t.dataset.v:'');return dyOpenEntry(y.id,n.id);}
  if(a==='edit')return dyOpenEntry(y.id,t.dataset.e);
  if(a==='read')return dyGoBook(y,function(){});
  if(a==='qgo'){const i=+t.dataset.i;return dyGoBook(y,function(){quoteGo(i);});}
  if(a==='mgo'){const m=dyMarks(y)[+t.dataset.i];if(m)return dyGoBook(y,function(){jumpRatio(m.ratio);});return;}
  if(a==='qnote'){const q=dyQuotes(y)[+t.dataset.i];if(!q)return;
    return rqAsk({t:'Заметка к цитате',p:'«'+String(q.text).slice(0,140)+(q.text.length>140?'…':'')+'»',ok:'Сохранить',input:q.note||''}).then(function(v){if(v===null||v===false)return;q.note=v;dyTouch(y);dyRender();});}
  if(a==='fmt')return dyFmt(t.dataset.v);
  if(a==='lock')return dyLockAsk(t.dataset.sk);
  if(a==='stab'){DY.stab=t.dataset.v;el('dySheet').scrollTop=0;return dySheetRender();}
  if(a==='aa'){DY.aa=!DY.aa;const p=el('dyAa');if(p)p.hidden=!DY.aa;t.classList.toggle('on',DY.aa);t.setAttribute('aria-expanded',String(DY.aa));return;}
  if(a==='fs'){const v=Math.max(14,Math.min(24,y.fs+(+t.dataset.v||0)));if(v!==y.fs)dySetLook(y,'fs',v);return;}
  if(a==='ck'){const n=y.e.find(function(x){return x.id===t.dataset.e;});if(!n)return;const L=n.x.split('\n'),i=+t.dataset.ln;
    if(L[i]==null)return;L[i]=L[i].replace(/\[([ xX])\]/,function(m,c){return c===' '?'[x]':'[ ]';});n.x=L.join('\n');n.u=Date.now();dyTouch(y);return dyRender();}
  if(a==='cl'){const n=y.e.find(function(x){return x.id===DY.eid;});if(!n)return;dyEditSave(y,n);n.cl=t.dataset.v;n.u=Date.now();dyTouch(y);
    const p=document.querySelector('#dyBox .dyed');if(p){if(n.cl)p.dataset.cl=n.cl;else delete p.dataset.cl;}return dyAaRefresh(y,n);}
  if(a==='pin'||a==='dele'||a==='ego'){const n=y.e.find(function(x){return x.id===DY.eid;});if(!n)return;
    if(a==='pin'){n.pin=!n.pin;dyEditSave(y,n);dyTouch(y);t.classList.toggle('on',n.pin);t.setAttribute('aria-pressed',String(n.pin));return;}
    if(a==='ego'){dyEditSave(y,n);const r=n.r;return dyGoBook(y,function(){jumpRatio(r);});}
    return rqAsk({t:'Удалить запись?',p:n.t||dyPlain(n.x).slice(0,80),ok:'Удалить',danger:true}).then(function(ok){if(!ok)return;y.e.splice(y.e.indexOf(n),1);save();n.t='';n.x='';dyBack();});}
  if(['pp','fn','ink','rb','lh','al','so'].indexOf(a)>=0)return dySetLook(y,a,t.dataset.v);
  if(a==='cv'){y.cv=t.dataset.v;y.cc=t.dataset.c;dyTouch(y);return dyRenderKeepSheet();}
  if(a==='export'){const txt=dyExportText(y);
    if(navigator.share)return navigator.share({title:dyTitle(y),text:txt}).catch(function(){});
    copyText(txt);return;}
  if(a==='dely')return rqAsk({t:'Удалить дневник «'+dyTitle(y)+'»?',p:y.b?'Записи пропадут. Цитаты и закладки останутся в книге.':'Блокнот и все записи пропадут.',ok:'Удалить',danger:true}).then(function(ok){
    if(!ok)return;S.diaries=dyList().filter(function(x){return x!==y;});save();DY.sheet=null;DY.view='shelf';DY.id=null;
    if(navState()==='diarySh'||navState()==='diary')history.go(navState()==='diarySh'?-2:-1);dyRender();flashMsg('Дневник удалён',{kind:'info',icon:'trash-2'});});
}
if(el('diary'))el('diary').addEventListener('click',dyClick);
if(el('dySheet'))el('dySheet').addEventListener('click',dyClick);
if(el('dyScrim'))el('dyScrim').onclick=function(){dyBack();};
if(el('diary'))el('diary').addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('dyent')){e.preventDefault();dyClick(e);}});
/* night / skin switch while the section is open → paper and covers follow */
if(window.MutationObserver)new MutationObserver(function(){if(diaryIsOpen()){const d=el('diary');d.classList.toggle('dyn',dyNight());if(el('dySheet'))el('dySheet').classList.toggle('dyn',dyNight());}}).observe(document.documentElement,{attributes:true,attributeFilter:['data-skin','data-theme','style']});
/* ===== из книги ===== */
/* book card: «Дневник книги» opens it (and makes it if there is none) */
function diaryFromBook(bid){
  const y=diaryOf(bid)||diaryNew({b:bid});
  try{el('bookSheet').classList.add('hidden');}catch(e){}
  __navAllow=true;try{openDiary();}finally{__navAllow=false;}dyOpen(y.id);
}
/* reader «Навигация → Цитаты»: a quick entry tied to the chapter and page being read; the diary is made if needed */
function diaryQuickNote(){
  if(!R.book)return;const b=R.book;
  let ch='';try{const toc=tocOf(b),i=tocCur(b,toc);if(i>=0&&toc[i])ch=String(toc[i].t||'');}catch(e){}
  const pg=(R.mode==='pdf'&&typeof P!=='undefined'&&P.shown>=0?P.shown:R.page)+1,r=R.pageCount>1?Math.min(1,(pg-1)/(R.pageCount-1)):0;
  const lab=R.mode==='pdf'&&typeof pdfLabel==='function'?pdfLabel(pg-1):pg;
  return rqAsk({t:'Запись в дневник',p:[ch,'стр. '+lab].filter(Boolean).join(' · '),ok:'Сохранить',input:''}).then(function(v){
    if(!v)return;const y=diaryOf(b.id)||diaryNew({b:b.id});
    const n=dyNewEntry(y,'',{ch:ch,pg:pg,r:r});n.x=String(v).slice(0,20000);dyTouch(y);
    flashMsg('Записано в дневник',{kind:'info',icon:'notebook-pen'});
    try{if(panelTab==='qts')renderPanel('qts');}catch(e){}
  });
}
