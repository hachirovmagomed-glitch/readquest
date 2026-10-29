'use strict';
/* ===== «Общие настройки» разделами (29.10, Джессика: «разные секции настроек, чтобы они не были смешаны в одну кучу… шведский стол»).
   The screen is a list of sections (#gsList); a section opens as its own page inside the same #settings screen (#settings.gs-in,
   title in #setTitle, system «назад» = back to the list). Search (#setSearch) finds any row here and in «Настройки чтения».
   «Чтение» opens the reader settings sheet without a book (#sheet moves to <body>, a sample paragraph on top).
   Data: S.notif.days, S.backupNag/backupNagAt, S.ux.uiSize, SET.presets, SET.bookSet (arch.md 29.10). No coins, no XP. */
const GS_SECS={read:'Чтение',ai:'Нейросети',goal:'Цель и напоминание',lang:'Язык и удобство',data:'Данные',about:'О приложении'};
const GS_TABS={grpText:'Текст',grpPage:'Страница',grpNav:'Листание',grpFocus:'Фокус'};
const GS_DAYS=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const GS_UISIZE=[['sm','Мелкий'],['md','Обычный'],['lg','Крупный']];
/* «Что нового»: the last builds on /test/, newest first (one line each, words of the person who asked for it where possible) */
const GS_NEWS=[
  ['29.10','Раздел «Чтение»: строка внизу страницы (часы, процент, до конца главы), скорость и голос озвучки, ночь по расписанию, жесты, кнопки меню выделения, поворот и две страницы, набор для новых книг, «осталось ≈» по вашей скорости'],
  ['29.10','Боковое меню выделения: быстрый цвет, «Найти в книге», «Озвучить выделенное», «Герои книги» и другое под «⋯»'],
  ['29.10','«Приключения»: 30 писательниц в портретах авторов'],
  ['29.10','Настройки разделами: поиск, свои наборы оформления, «только к этой книге», дни напоминания, дата резервной копии, «Что нового»'],
  ['29.10','Пауза в верхней панели вместо круга; «Фокус» начинает круг без вопроса'],
  ['29.10','Вкладка «Обзор»: главы в сетке, метки, бегунок, «Перейти» и «К текущей»'],
  ['29.10','Боковое меню при выделении: узкое, у края экрана'],
  ['29.10','Дневники читателя'],
  ['29.10','Удаление цитат и номер страницы у цитаты'],
  ['29.10','Копирование текста из PDF, распознавание сканов и таблиц'],
  ['28.10','Мягкая граница панелей читалки'],
  ['28.10','Солнышки у «Яркости» стали кнопками']
];
let gsSheetHome=null; /* where #sheet lives in the reader: {p: parent, n: next sibling} while it is shown from settings */
function gsPushed(){const g=el('settings');return !!(g&&g.dataset.gsp);}
function gsCur(){const g=el('settings');return (g&&g.dataset.sec)||'';}
function gsSec(k){return document.querySelector('#settings .gsec[data-sec="'+k+'"]');}
function gsAgo(d){if(!d)return null;const t=new Date(d+'T00:00:00').getTime();if(!isFinite(t))return null;return Math.max(0,Math.round((new Date(today()+'T00:00:00').getTime()-t)/864e5));}
function gsAgoText(n){return n===0?'сегодня':n===1?'вчера':n+' '+plural(n,'день','дня','дней')+' назад';}
function gsDotHtml(c){return '<i class="gsdot '+c+'" aria-hidden="true"></i>';}

/* ---------- list of sections ---------- */
function gsSubs(){
  const set=function(id,t,dot){const s=el(id);if(!s)return;s.innerHTML=(dot?gsDotHtml(dot):'')+esc(t);};
  const f=(FONTS[SET.font]||FONTS[0]).label;
  set('gsSubRead',f+', '+SET.size+' · '+(flipGet().mode==='scroll'?'прокрутка':'страницы')+(S.ux&&S.ux.wake?' · экран не гаснет':''));
  {const sk=document.querySelector('#appSkinBox .apptile.on small'),th=document.querySelector('#appThemeBox .apptile.on small');
   set('gsSubLook',activeTheme().skin&&sk?'Скин «'+sk.textContent+'»':'Тема «'+(th?th.textContent:'Авто')+'»');}
  {const ai=aiOwnKey(),tp=TTS_PROV[S.tts&&S.tts.prov]?S.tts.prov:'system',tts=tp==='system'||nttsOn(),tr=typeof trHave==='number'?trHave:0;
   set('gsSubAi','ИИ: '+(ai?'готов':'нет ключа')+' · озвучка: '+(tp==='system'?'телефон':tts?'нейросеть':'нет ключа')+' · перевод: '+(tr?tr+' '+plural(tr,'язык','языка','языков'):'нет'),ai&&tts?'ok':'no');}
  set('gsSubGoal','Цель '+goalMin()+' мин · '+(S.notif&&S.notif.on?'напоминание в '+S.notif.time:'без напоминания'));
  {const k=typeof navShown==='function'?navShown().length:0,u=GS_UISIZE.find(function(x){return x[0]===((S.ux&&S.ux.uiSize)||'md');});
   set('gsSubLang',(S.lang==='en'?'English':'Русский')+(gsUiSizeOn()?' · размер «'+u[1].toLowerCase()+'»':'')+' · '+k+' '+plural(k,'вкладка','вкладки','вкладок')+' внизу');}
  {const n=gsAgo(S.lastBackup);set('gsSubData',n==null?'Резервной копии ещё не было':'Копия: '+gsAgoText(n),n==null||n>=7?'warn':'ok');}
  set('gsSubAbout','Сборка '+(String(RQ_BUILD).indexOf('__')===0?'—':RQ_BUILD));
  const lk=document.querySelector('#gsList [data-sec="look"]');if(lk)lk.hidden=generalOverReader(); /* over the reader: «Внешний вид» is its own screen, the book stays open */
}
function gsOpen(k,o){
  const g=el('settings'),s=gsSec(k);if(!s)return;
  document.querySelectorAll('#settings .gsec').forEach(function(x){x.hidden=x!==s;});
  g.classList.add('gs-in');g.dataset.sec=k;el('setTitle').textContent=GS_SECS[k];
  if(o&&o.noPush)delete g.dataset.gsp;else g.dataset.gsp='1'; /* opened from the list → «назад» returns to the list; a jump from elsewhere → «назад» leaves the settings */
  gsSearchClear();gsRender();
  const sc=g.querySelector('.scroll');if(sc)sc.scrollTop=0;
  if(!(o&&o.noPush))navPush('gsec');
}
function gsClose(){
  const g=el('settings');if(!g.dataset.sec)return;
  document.querySelectorAll('#settings .gsec').forEach(function(x){x.hidden=true;});
  g.classList.remove('gs-in');delete g.dataset.sec;delete g.dataset.gsp;el('setTitle').textContent='Общие настройки';
  gsRender();const sc=g.querySelector('.scroll');if(sc)sc.scrollTop=0;
}
document.querySelectorAll('#gsList [data-sec]').forEach(function(b){b.onclick=function(){const k=b.dataset.sec;if(k==='look'){gsOpenLook();return;}gsOpen(k);};});

/* ---------- section pages ---------- */
function gsRender(){
  gsSubs();
  const k=gsCur();
  if(k==='read')gsRenderRead();
  if(k==='goal')gsRenderGoal();
  if(k==='lang')gsRenderLang();
  if(k==='data')gsRenderData();
  if(k==='about')gsRenderAbout();
}
function gsRenderRead(){
  const set=function(id,t){if(el(id))el(id).textContent=t;};
  set('gsSubText',(FONTS[SET.font]||FONTS[0]).label+', '+SET.size+', интервал '+SET.lh.toFixed(2));
  {const t=activeTheme(),nm=SET.cBg||SET.cTxt?'свои цвета':(t&&t.name)||'Сепия';set('gsSubPage',nm+', поля '+SET.margin+', яркость '+Math.round((SET.bright==null?1:SET.bright)*100)+' %');}
  {const f=flipGet(),an={none:'без анимации',slide:'сдвиг',fade:'плавно',curl:'загиб'};set('gsSubNav',(f.mode==='scroll'?'Прокрутка':'Страницы')+', '+(an[f.anim]||'без анимации'));}
  set('gsSubFocus',{off:'Выключен',button:'Кнопкой',auto:'Сам после листания'}[SET.focus]||'Кнопкой');
  gsPresetsRender(el('gsPresets'));
  const n=Object.keys(SET.bookSet||{}).length,row=el('gsBookSetRow');
  if(row){row.hidden=!n;el('gsBookSetSub').textContent=n+' '+plural(n,'книга','книги','книг')+' со своим шрифтом и полями';}
}
document.querySelectorAll('#settings [data-rtab]').forEach(function(b){b.onclick=function(){gsReaderTab(b.dataset.rtab);};});
el('gsBookSetReset').onclick=async function(){
  if(!await rqAsk({t:'Сбросить оформление книг?',p:'Все книги снова будут с общим шрифтом, размером и полями.',ok:'Сбросить'}))return;
  if(RQ_OWN)rqOwnSet(false);SET.bookSet={};saveSet();applySet();relayout({force:true});gsRender();flashMsg('Книги снова с общим оформлением');
};

/* «Мои наборы» — the same chips in the section «Чтение» and in the reader sheet (tab «Текст») */
function gsPresetOn(p){return Object.keys(p.v).length>0&&Object.keys(p.v).every(function(k){return SET[k]===p.v[k];});}
function gsPresetsRender(box){
  if(!box)return;const ps=SET.presets||[];box.innerHTML='';
  ps.forEach(function(p,i){const b=document.createElement('button');b.type='button';b.className='fchip'+(gsPresetOn(p)?' on':'');b.textContent=p.n;
    b.setAttribute('aria-pressed',gsPresetOn(p)?'true':'false');b.onclick=function(){gsPresetTap(i);};box.appendChild(b);});
  if(ps.length<8){const a=document.createElement('button');a.type='button';a.className='fchip padd';a.innerHTML=rqIcon('plus',16)+'<span>Сохранить текущий</span>';a.onclick=gsPresetAdd;box.appendChild(a);}
  if(!ps.length){const e=document.createElement('span');e.className='pempty';e.textContent='Пока нет наборов';box.insertBefore(e,box.firstChild);}
}
function gsPresetsSync(){gsPresetsRender(el('rPresets'));if(gsCur()==='read')gsRenderRead();}
async function gsPresetAdd(){
  const ps=SET.presets||[];
  const n=await rqAsk({t:'Название набора',p:'Сохранится шрифт, размер, интервалы, поля и яркость, как сейчас.',input:'Набор '+(ps.length+1),ok:'Сохранить'});
  if(n==null)return;const nm=String(n).trim().slice(0,24)||('Набор '+(ps.length+1));
  SET.presets=ps.concat([{n:nm,v:rqTypoPick(SET,RQ_PRESET_KEYS)}]).slice(0,8);saveSet();gsPresetsSync();flashMsg('Набор «'+nm+'» сохранён');
}
async function gsPresetTap(i){
  const p=(SET.presets||[])[i];if(!p)return;
  if(gsPresetOn(p)){ /* the chip that is already on: a second tap offers to delete it */
    if(!await rqAsk({t:'Удалить набор «'+p.n+'»?',p:'Оформление книги не изменится.',ok:'Удалить',danger:true}))return;
    SET.presets=SET.presets.filter(function(x,j){return j!==i;});saveSet();gsPresetsSync();return;}
  const anchor=typeof readingAnchor==='function'&&R&&R.book&&R.mode!=='pdf'?readingAnchor():null;
  Object.assign(SET,p.v);saveSet();applySet();try{relayout({force:true,anchor:anchor||undefined});}catch(e){}
  try{rqCollapseSync('fontSeg');}catch(e){}
  gsPresetsSync();
}
/* «Ко всем книгам / Только к этой» in the reader sheet; shown only with an open book */
function gsBookOnlySync(){
  const row=el('rBookOnlyRow');if(!row)return;const b=R&&R.book;row.hidden=!b||el('sheet').classList.contains('gsalone');
  el('rBookOnly').querySelectorAll('button').forEach(function(x){const on=(x.dataset.v==='one')===!!RQ_OWN;x.classList.toggle('on',on);x.setAttribute('aria-checked',on?'true':'false');});
  el('rBookOnlyS').textContent=RQ_OWN?'у этой книги свои шрифт, размер, интервалы и поля':'шрифт, размер, интервалы и поля';
}
el('rBookOnly').querySelectorAll('button').forEach(function(x){x.onclick=function(){const one=x.dataset.v==='one';if(one===!!RQ_OWN)return;
  rqOwnSet(one);applySet();relayout({force:true});gsBookOnlySync();flashMsg(one?'Это оформление теперь только у этой книги':'Книга снова с общим оформлением');};});

/* ---------- «Настройки чтения» from the settings ---------- */
function gsReaderTab(g){
  if(generalOverReader()&&R&&R.book){closeGeneralSettings();openReaderSettings(g);return;} /* the book is right under: its own sheet */
  const sh=el('sheet');
  if(!gsSheetHome)gsSheetHome={p:sh.parentNode,n:sh.nextSibling};
  let sc=el('gsSheetScrim');if(!sc){sc=document.createElement('div');sc.id='gsSheetScrim';sc.onclick=gsSheetHide;document.body.appendChild(sc);}
  document.body.appendChild(sc);document.body.appendChild(sh);sh.classList.add('gsalone');sc.hidden=false;
  renderThemeSeg();renderSettings();openSetTab(g);sh.classList.remove('hidden');sh.scrollTop=0;
  applySet();navPush('gsheet');
}
function gsSheetOpen(){const sh=el('sheet');return sh.classList.contains('gsalone')&&!sh.classList.contains('hidden');}
function gsSheetHide(){
  const sh=el('sheet');sh.classList.add('hidden');
  if(!sh.classList.contains('gsalone'))return;
  sh.classList.remove('gsalone');sh.style.transform='';
  if(el('gsSheetScrim'))el('gsSheetScrim').hidden=true;
  if(gsSheetHome){gsSheetHome.p.insertBefore(sh,gsSheetHome.n&&gsSheetHome.n.parentNode===gsSheetHome.p?gsSheetHome.n:null);gsSheetHome=null;}
  if(navState()==='gsheet')try{history.back();}catch(e){}
  gsRender();
}
/* the sheet's own «×» and swipe-down only add .hidden → put it back into the reader */
new MutationObserver(function(){const sh=el('sheet');if(sh.classList.contains('gsalone')&&sh.classList.contains('hidden'))gsSheetHide();gsBookOnlySync();}).observe(el('sheet'),{attributes:true,attributeFilter:['class']});
/* sample paragraph = the page with the current look (the book itself is not open) */
function gsPrevApply(){
  const p=el('gsPrev');if(!p)return;const t=activeTheme();
  p.style.background=SET.cBg||t.bg;p.style.color=SET.cTxt||t.txt;
  p.style.fontFamily=(FONTS[SET.font]||FONTS[0]).v;p.style.fontSize=SET.size+'px';p.style.lineHeight=SET.lh;
  p.style.letterSpacing=(SET.ls||0)+'px';p.style.fontWeight=SET.weight||400;p.style.textAlign=SET.align==='l'?'left':'justify';
  p.style.hyphens=p.style.webkitHyphens=SET.hyph===false?'none':'auto';p.classList.toggle('noind',SET.indent===false);
  p.style.paddingLeft=p.style.paddingRight=Math.min(SET.margin,40)+'px';
  p.style.filter='brightness('+(SET.bright==null?1:SET.bright)+')'+(SET.warm?' sepia('+Math.min(0.6,SET.warm)+')':'');
}

/* ---------- Цель и напоминание ---------- */
function gsRenderGoal(){
  el('gsGoalVal').textContent=goalMin()+' мин';
  el('gsGoalSub').textContent=isMvp()?'За 10 минут в день +30 монет, четыре таких дня за неделю дают ещё +120':'Меняется в профиле';
  const on=!!(S.notif&&S.notif.on);el('calNotifTimeRow').hidden=!on;el('calNotifDaysRow').hidden=!on;
  el('calNotifTimeIn').value=S.notif.time;
  const d=S.notif.days||[],box=el('calNotifDays');box.innerHTML='';
  GS_DAYS.forEach(function(n,i){const b=document.createElement('button');b.type='button';b.textContent=n;b.setAttribute('aria-pressed',d[i]!==false?'true':'false');
    b.onclick=function(){const nd=GS_DAYS.map(function(x,j){return d[j]!==false;});nd[i]=!nd[i];if(!nd.some(Boolean)){flashMsg('Хотя бы один день');return;}
      S.notif.days=nd;save();gsRender();};box.appendChild(b);});
  const on7=d.filter(function(x){return x!==false;}).length;
  el('calNotifDaysSub').textContent=on7===7?'Каждый день':on7===5&&d[5]===false&&d[6]===false?'По будням':on7===2&&d[5]!==false&&d[6]!==false?'По выходным':GS_DAYS.filter(function(x,i){return d[i]!==false;}).join(', ');
}
el('calNotifTimeIn').onchange=function(){const v=this.value;if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))return;S.notif.time=v;save();try{renderCalendar();}catch(e){}renderSettings();};

/* ---------- Язык и удобство: «Размер интерфейса» = html font-size 90 / 100 / 115 % of the phone's own size (arch.md ux.uiSize) ---------- */
const GS_UISIZE_ON=false; /* 29.10: ждёт ответа Джессики на карточке (Маня 07.10 просил не возвращать); false = строки нет, значение не применяется */
function gsUiSizeOn(){return GS_UISIZE_ON;}
function applyUiSize(){const v=gsUiSizeOn()&&S&&S.ux?S.ux.uiSize:'md',h=document.documentElement;if(v==='sm'||v==='lg')h.dataset.uisize=v;else delete h.dataset.uisize;}
if(!GS_UISIZE_ON&&el('uiSizeRow'))el('uiSizeRow').remove(); /* off: the row is not in the page at all (search, Маня 15.10) */
function gsRenderLang(){
  const row=el('uiSizeRow');if(!row)return;row.hidden=!gsUiSizeOn();if(row.hidden)return;
  const box=el('uiSizeSeg'),cur=(S.ux&&S.ux.uiSize)||'md';box.innerHTML='';
  GS_UISIZE.forEach(function(o){const b=document.createElement('button');b.type='button';b.textContent=o[1];b.className=o[0]===cur?'on':'';b.setAttribute('role','radio');b.setAttribute('aria-checked',o[0]===cur?'true':'false');
    b.onclick=function(){S.ux.uiSize=o[0];save();applyUiSize();gsRender();};box.appendChild(b);});
}

/* ---------- Данные ---------- */
function gsRenderData(){
  const n=gsAgo(S.lastBackup),s=el('backupSub');
  s.innerHTML=n==null?gsDotHtml('warn')+'Ещё не было. Сохраните, чтобы не потерять книги и прогресс':gsDotHtml(n>=7?'warn':'ok')+'Последняя: '+gsAgoText(n);
  el('backupNagTgl').textContent=S.backupNag!==false?'Вкл':'Выкл';rqSyncSwitches();
}
el('backupNagTgl').onclick=function(){S.backupNag=S.backupNag===false;save();gsRender();};
{const ex=el('btnExport').onclick;el('btnExport').onclick=async function(){await ex.apply(this,arguments);gsRender();};}
{const rs=el('btnReset2').onclick;el('btnReset2').onclick=async function(){
  if(gsAgo(S.lastBackup)!==0&&await rqAsk({t:'Сначала сохранить копию?',p:'Сброс обнулит минуты, опыт, монеты, серию и награды. Из копии их можно вернуть.',ok:'Сохранить копию'}))await el('btnExport').onclick();
  return rs.apply(this,arguments);};}

/* ---------- О приложении ---------- */
const GS_EXP={wn:false};
function gsRenderAbout(){
  nnRow('wnX','sparkles','Что нового','Изменения последних сборок',GS_NEWS[0][1],GS_EXP.wn);
  el('wnBox').hidden=!GS_EXP.wn;
  if(GS_EXP.wn&&!el('wnBox').childNodes.length){let h='',d='';GS_NEWS.forEach(function(x){if(x[0]!==d){if(d)h+='</ul>';d=x[0];h+='<h4>'+esc(d)+'</h4><ul>';}h+='<li>'+esc(x[1])+'</li>';});el('wnBox').innerHTML=h+'</ul>';}
}
el('wnX').onclick=function(){GS_EXP.wn=!GS_EXP.wn;gsRenderAbout();};
el('btnUpdate').onclick=async function(){
  const s=el('updSub'),b=this;
  if(!('serviceWorker' in navigator)){s.textContent='Обновите страницу браузера';return;}
  if(navigator.onLine===false){s.textContent='Нет интернета';return;}
  b.disabled=true;s.textContent='Проверяю…';
  try{const reg=await navigator.serviceWorker.getRegistration();if(!reg){s.textContent='Обновите страницу браузера';return;}
    await reg.update();
    const w=reg.installing||reg.waiting;
    s.textContent=w?'Новая версия скачана. Закройте все окна приложения и откройте снова':'У вас последняя версия';}
  catch(e){s.textContent='Не получилось проверить: '+((e&&e.message)||'ошибка');}
  finally{b.disabled=false;}
};

/* ---------- «Внешний вид» from the settings: its own screen, «назад» comes back here ---------- */
function gsLookFrom(on){const b=el('lookBack'),m=el('menuLook');if(b)b.hidden=!on;if(m)m.hidden=!!on;}
function gsOpenLook(){openLook(false);gsLookFrom(true);}
el('lookBack').onclick=function(){openGeneralSettings(false);};

/* ---------- search ---------- */
function gsIndex(){
  const out=[],txt=function(n){if(!n)return '';const c=n.cloneNode(true);c.querySelectorAll('.sub,small,svg,.rv,.xv').forEach(function(x){x.remove();});return c.textContent.replace(/\s+/g,' ').trim();};
  document.querySelectorAll('#settings .gsec').forEach(function(s){const k=s.dataset.sec;
    s.querySelectorAll('.setrow,.xrow:not(.xpick)').forEach(function(r){if((r.closest('[hidden]:not(.gsec)')&&!r.closest('.nnbox'))||r.closest('#nnSum'))return; /* the summary repeats the rows below */
      const t=r.classList.contains('xrow')?txt(r.querySelector('.xt')):txt(r.querySelector('.lab'));if(!t)return;
      const sub=r.querySelector('.sub,.xsub'),box=r.nextElementSibling&&r.nextElementSibling.classList.contains('nnbox')?r.nextElementSibling.textContent:'';
      out.push({t:t,w:GS_SECS[k],k:(t+' '+(sub?sub.textContent:'')+' '+(r.title||'')+' '+box).toLowerCase(),ic:(r.querySelector('use')||{getAttribute:function(){return '';}}).getAttribute('href').replace('#i-',''),go:function(){gsGoRow(k,r);}});});});
  document.querySelectorAll('#sheet .setgrp').forEach(function(g){
    g.querySelectorAll('.rrow,.srow').forEach(function(r){if(r.classList.contains('pdfonly')||r.id==='rBookOnlyRow')return;
      const l=r.querySelector('.rl,label,.xl');const t=txt(l);if(!t)return;
      out.push({t:t,w:'Чтение → '+GS_TABS[g.id],k:(t+' '+(l.querySelector('small')?l.querySelector('small').textContent:'')).toLowerCase(),ic:'book-open',go:function(){gsGoSheet(g.id,r);}});});});
  return out;
}
function gsFlash(r){if(!r)return;r.classList.remove('gsflash');void r.offsetWidth;r.classList.add('gsflash');setTimeout(function(){r.classList.remove('gsflash');},1700);}
function gsGoRow(k,r){
  gsOpen(k);
  const box=r.closest('.nnbox'),x=r.classList.contains('xrow')?r:box&&box.previousElementSibling;if(x&&x.getAttribute('aria-expanded')==='false')x.click(); /* a collapsed row (ИИ, Озвучка…) opens */
  const sc=el('settings').querySelector('.scroll'),hd=el('settings').querySelector('.wrap > .row');
  requestAnimationFrame(function(){sc.scrollTop+=r.getBoundingClientRect().top-sc.getBoundingClientRect().top-((hd&&hd.offsetHeight)||0)-24;gsFlash(r);});
}
function gsGoSheet(g,r){gsReaderTab(g);requestAnimationFrame(function(){const sh=el('sheet');if(!sh.contains(r))return;const hd=el('sheetHd');sh.scrollTop+=r.getBoundingClientRect().top-sh.getBoundingClientRect().top-((hd&&hd.offsetHeight)||0)-12;gsFlash(r);});}
function gsSearch(){
  const q=el('setSearch').value.trim().toLowerCase(),res=el('setSearchRes'),list=el('gsList');
  el('setSearchX').hidden=!q;
  if(!q){res.hidden=true;res.innerHTML='';list.hidden=false;return;}
  const words=q.split(/\s+/),res0=words.map(function(w){return new RegExp('(^|[^0-9a-zа-яё])'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));}); /* a word start: «ключ» finds «Ключ API», not «включить» */
  const hits=gsIndex().filter(function(x){return res0.every(function(r){return r.test(x.k);});})
    .sort(function(a,b){return (b.t.toLowerCase().indexOf(words[0])===0)-(a.t.toLowerCase().indexOf(words[0])===0);}).slice(0,14);
  list.hidden=true;res.hidden=false;res.innerHTML='';
  if(!hits.length){res.innerHTML='<div class="gsnone">Ничего не нашлось. Попробуйте другое слово: «шрифт», «ключ», «копия»</div>';return;}
  hits.forEach(function(h){const b=document.createElement('button');b.type='button';b.className='gsres';b.setAttribute('role','listitem');
    const i=h.t.toLowerCase().indexOf(words[0]),tt=i>=0?esc(h.t.slice(0,i))+'<mark>'+esc(h.t.slice(i,i+words[0].length))+'</mark>'+esc(h.t.slice(i+words[0].length)):esc(h.t);
    b.innerHTML=rqIcon(h.ic||'settings',20)+'<span><b>'+tt+'</b><small>'+esc(h.w)+'</small></span>'+rqIcon('chevron-right',18);
    b.onclick=function(){h.go();};res.appendChild(b);});
}
function gsSearchClear(){const i=el('setSearch');if(i&&i.value){i.value='';gsSearch();}}
el('setSearch').oninput=gsSearch;
el('setSearchX').onclick=function(){gsSearchClear();el('setSearch').focus();};

/* ---------- wiring into the existing settings code ---------- */
{const o0=openGeneralSettings;openGeneralSettings=function(over,sec){gsClose();gsSearchClear();o0(over);applyUiSize();gsRender();if(sec)gsOpen(sec);};}
/* «Открыть настройки» from the AI sheet etc. jump to a row: open its section first */
{const s0=settingsScrollTo;settingsScrollTo=function(id){const t=el(id),s=t&&t.closest('.gsec');if(s&&gsCur()!==s.dataset.sec)gsOpen(s.dataset.sec,{noPush:true});s0(id);};}
{const r0=renderSettings;renderSettings=function(){r0.apply(this,arguments);if(el('gsList'))gsRender();};}
{const n0=nnRow;nnRow=function(id){n0.apply(this,arguments);const v=el(id)&&el(id).querySelector('.xv');if(!v||id==='wnX')return;
  const ok=id==='aiX'?aiOwnKey():id==='ttsHead'?(!TTS_PROV[S.tts&&S.tts.prov]||S.tts.prov==='system'||nttsOn()):(typeof trHave==='number'&&trHave>0);
  v.insertAdjacentHTML('afterbegin',gsDotHtml(ok?'ok':id==='trX'?'warn':'no'));};}
{const a0=applySet;applySet=function(){a0.apply(this,arguments);gsPrevApply();if(el('sheet')&&!el('sheet').classList.contains('hidden')){gsPresetsRender(el('rPresets'));gsBookOnlySync();}};}
{const s0=applyScale;applyScale=function(){s0.apply(this,arguments);applyUiSize();};}
{const l0=openLook;openLook=function(){gsLookFrom(false);return l0.apply(this,arguments);};}
{const b0=el('setBack').onclick;el('setBack').onclick=function(){if(gsCur()&&gsPushed()){if(navState()==='gsec')try{history.back();}catch(e){gsClose();}else gsClose();return;}return b0.apply(this,arguments);};}
/* system «назад»: the standalone reader sheet closes first, then a section goes back to the list (over the reader see reader-ui.js popstate) */
window.addEventListener('popstate',function(e){const st=(e.state&&e.state.rq)||null;
  if(gsSheetOpen()&&st!=='gsheet'){gsSheetHide();return;}
  if(gsCur()&&gsPushed()&&st!=='gsec'&&!readerIsOpen())gsClose();});
