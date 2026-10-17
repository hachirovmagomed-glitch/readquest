'use strict';
/* ================= ЭКРАНЫ ================= */
const SCREENS=['library','path','quotes','vocab','shop','profile','quests','stats','calendar','achievements','shelfScreen','settings','look','reader','summary'];
const DRAWER={library:'dLib',path:'dPath',quotes:'dStats',vocab:'dStats',profile:'dProf',quests:'dQuests',stats:'dStats',calendar:'dStats',achievements:'dStats',shelfScreen:'dStats',look:'dLook',settings:'dSet'};
let __navAllow=false; /* drawer / bottom bar may open sections that MVP otherwise folds into the library */
function show(id){
  /* Keep confetti on summary; clear on every other screen change */
  clearToasts();
  if(id!=='summary')clearConfetti();
  try{hidePinchHint();if(id!=='reader'){pinch0=null;pinchTarget=0;}}catch(e){} /* «Aa N» never survives a screen change */
  if(id==='library'){try{libGoldRender();}catch(e){}} /* balance is a pure read of S.gold on every visit */
  if(id!=='library'&&__bootGold){__bootGold=0;const gl=el('libGoldLine');if(gl)gl.classList.add('hidden');}
  if(isMvp() && !__navAllow && ['quotes','vocab','shop','quests','stats','calendar','achievements','shelfScreen'].indexOf(id)>=0){
    id = 'library';
  }
  SCREENS.forEach(s=>el(s).classList.toggle('hidden',s!==id));
  const tgt=DRAWER[id];
  Array.from(new Set(Object.values(DRAWER))).forEach(di=>{const e=el(di);if(e)e.classList.toggle('on',di===tgt);});
  if(el('dRew'))el('dRew').classList.remove('on');
  const hideNav = (id==='reader'||id==='summary');
  if(el('botnav'))el('botnav').style.display = (isMvp()&&!hideNav)?'flex':'none';
  applyMvpChrome();
}
/* ===== Нижняя панель и боковое меню: NS_set.nav (контракт Архитектора 14.10) =====
   One catalog for the drawer and the bottom bar; nav = ids from it, order = display order, 1..5, library first.
   Read is forgiving and NEVER writes back; write = one saveSet() through the write gate (passive window refused). */
const NAV_CATALOG=[
  {id:'library',t:'Библиотека',ic:'book-open',sub:'Главный экран'},
  {id:'rewards',t:'Награды',ic:'gift'},
  {id:'profile',t:'Профиль',ic:'user-round'},
  {id:'path',t:'Путь читателя',s:'Путь',ic:'map'},
  {id:'quests',t:'Квесты',ic:'target'},
  {id:'stats',t:'Инвентарь',ic:'package'}, /* Джессика 17.10: «всё, что игрок собрал в путешествии по книгам» — статистика, цитаты и заметки, словарь: one item, tabs inside */
  {id:'look',t:'Внешний вид',s:'Вид',ic:'palette'}]; /* Джессика 17.10: тема, скин, анимации — own item (was a block in «Общие настройки») */
const NAV_ALIAS={notes:'stats',vocab:'stats'}; /* stored NS_set.nav from before 17.10 */
const NAV_DEF=['library','rewards','profile'], NAV_MAX=5;
/* ONE flag: in MVP mode, show the extra sections (quests, «Инвентарь», «Внешний вид») in the drawer, bottom bar and «Нижняя панель».
   false → MVP shows only library/rewards/profile (+ settings); stored NS_set.nav is never rewritten by this. Outside MVP they always show. */
const RQ_MVP_DRAWER_EXTRAS=true;
function navAvail(id){return !isMvp()||RQ_MVP_DRAWER_EXTRAS||NAV_DEF.indexOf(id)>=0||id==='settings';}
function navShown(){return navGet().filter(navAvail);} /* view only: what the bar shows now */
const NAV_BN={library:'bnLib',path:'bnPath',rewards:'bnRew',profile:'bnProf',quests:'bnQuests',stats:'bnStats',look:'bnLook'};
const NAV_DI={library:'dLib',path:'dPath',rewards:'dRew',profile:'dProf',quests:'dQuests',stats:'dStats',look:'dLook'};
function navItem(id){return NAV_CATALOG.find(function(x){return x.id===id;})||null;}
function navRead(v){
  if(!Array.isArray(v))return NAV_DEF.slice();
  const out=[];v.forEach(function(x){if(typeof x==='string'&&NAV_ALIAS[x])x=NAV_ALIAS[x];if(typeof x==='string'&&navItem(x)&&out.indexOf(x)<0)out.push(x);});
  if(!out.length)return NAV_DEF.slice();
  const i=out.indexOf('library');if(i>0)out.splice(i,1);if(i!==0)out.unshift('library');
  return out.slice(0,NAV_MAX);
}
function navGet(){return navRead(typeof SET!=='undefined'&&SET?SET.nav:null);}
function navSave(arr){
  if(window.__rqWriter&&!window.__rqWriter.mayWrite())return false; /* passive window: never write */
  SET.nav=navRead(arr);saveSet();renderNav();return true;
}
function navGo(id){
  closeDrawer();if(!navAvail(id))id='library';
  if(id==='rewards'){openRewardsSheet();return;}
  try{closeRewardsSheet();}catch(e){}
  __navAllow=true;
  try{
    if(id==='library'){renderLibrary();show('library');}
    else if(id==='profile'){renderProfile();show('profile');}
    else if(id==='path'){show('path');renderPath();}
    else if(id==='quests')openJournal('quests');
    else if(id==='notes')openProgress('quotes');
    else if(id==='vocab')openProgress('vocab');
    else if(id==='stats')openProgress('stats');
    else if(id==='look')openLook();
    else if(id==='settings'){renderSettings();show('settings');}
  }finally{__navAllow=false;}
}
function renderNav(){
  const nav=navShown();
  const bn=el('botnav');
  if(bn){bn.innerHTML=nav.map(function(id){const it=navItem(id);
      return '<button class="botnav-btn" id="'+NAV_BN[id]+'" data-nav="'+id+'" type="button">'+rqIcon(it.ic,22)+'<span>'+esc(it.s||it.t)+'</span></button>';}).join('');
    bn.dataset.n=nav.length;
    bn.querySelectorAll('.botnav-btn').forEach(function(b){b.onclick=function(){navGo(b.dataset.nav);};});
    try{applyMvpChrome();}catch(e){}}
  const list=el('dList');
  if(list){
    list.innerHTML=NAV_CATALOG.filter(function(it){return navAvail(it.id);}).map(function(it){return '<button class="ditem" type="button" id="'+NAV_DI[it.id]+'" data-nav="'+it.id+'">'+rqIcon(it.ic,22)+'<span class="dlab">'+esc(it.t)+'</span>'+(nav.indexOf(it.id)>=0?'<span class="dpin" title="В нижней панели">'+rqIcon('pin',16)+'</span>':'')+'</button>';}).join('')+
      '<div class="dsep"></div><button class="ditem" type="button" id="dSet" data-nav="settings">'+rqIcon('settings',22)+'<span class="dlab">Настройки</span></button>';
    list.querySelectorAll('.ditem').forEach(function(b){b.onclick=function(){navGo(b.dataset.nav);};});
    const cur=SCREENS.find(function(s){return el(s)&&!el(s).classList.contains('hidden');});const tgt=DRAWER[cur];if(tgt&&el(tgt))el(tgt).classList.add('on');
  }
}
/* drawer header: read-only view of the SAME sources as «Награды» and toasts — S.gold (coinsP) and S.xp (10 × floor dayMinutes via applySessionAwards), level()/lvlBounds(). No own counter, no save(). */
function drawerStats(){const xp=S.xp||0,lv=level(xp),b=lvlBounds(lv);return {lv:lv,xp:xp,lo:b[0],hi:b[1],gold:goldDisp(S.gold)};}
function renderDrawerHead(){const d=drawerStats();if(!el('dLvl'))return d;const nm=(S.heroName||'Читатель');el('dName').textContent=nm;el('dAva').textContent=nm.trim().charAt(0).toUpperCase()||'Ч';
  el('dLvl').textContent='Уровень '+d.lv;el('dXp').textContent=(d.xp-d.lo)+' / '+(d.hi-d.lo)+' XP';el('dXpBar').style.width=Math.max(0,Math.min(100,(d.xp-d.lo)/(d.hi-d.lo)*100))+'%';el('dGold').textContent=coinsP(d.gold);try{libGoldRender();}catch(e){}return d;}
function openDrawer(){try{renderDrawerHead();renderNav();}catch(e){console.warn('[rq] drawer',e);}el('drawer').classList.add('open');el('scrim').classList.remove('hidden');}
function closeDrawer(){el('drawer').classList.remove('open');el('scrim').classList.add('hidden');}
el('scrim').onclick=closeDrawer;
['menuLib','menuQuotes','menuVocab','menuShop','menuProf','menuQst','menuStats','menuCal','menuShelf','menuSet','menuPath','menuLook'].forEach(m=>{if(el(m))el(m).onclick=openDrawer;});

let jrnLast='quests';
/* tabs inside a drawer section: same MVP pass as the drawer item itself (the tabs used to bounce to the library in MVP) */
function navShowSub(id){const own={quotes:'stats',stats:'stats',vocab:'stats',quests:'quests'}[id];const prev=__navAllow;__navAllow=prev||!own||navAvail(own);try{show(id);}finally{__navAllow=prev;}}
function openLook(toShop){try{closeRewardsSheet();}catch(e){}renderSettings();try{renderShopPane();}catch(e){}__navAllow=true;try{show('look');}finally{__navAllow=false;}closeDrawer();
  if(toShop===true){const h=el('rewPaneShop');if(h)h.scrollIntoView({block:'start'});}}
function openJournal(sub){
  if(sub!=='quests'){openProgress(sub==='vocab'?'vocab':'quotes');return;} /* 17.10: quotes and vocab live in «Инвентарь» */
  renderQuests();
  jrnLast=sub;navShowSub(sub);
  closeDrawer();
}
if(el('dJournal'))el('dJournal').onclick=()=>openJournal(jrnLast);
/* ===== Словарь-копилка + флешкарты ===== */
let vocabMode='list',vcIdx=0,vcFlip=false;
function renderVocab(){
  if(el('btnVocabCards'))el('btnVocabCards').innerHTML=(vocabMode==='cards')?rqIcon('list',16)+' Список':rqIcon('layers',16)+' Карточки';
  const box=el('vocabBody');if(!box)return;
  const list=S.vocab||[];
  if(!list.length){vocabMode='list';box.innerHTML='<div style="color:var(--muted);text-align:center;padding:46px 0">Пока пусто.<br>Выделите слово в книге и нажмите '+rqIcon('book-open',16)+' «В словарь» — оно попадёт сюда.<br><br>Потом повторяйте карточками</div>';return;}
  if(vocabMode==='cards'){renderVocabCards();return;}
  const known=list.filter(v=>(v.box||0)>=4).length;
  box.innerHTML='<div style="font-size:13px;color:var(--muted);margin-bottom:10px">Слов: <b>'+list.length+'</b> · выучено: <b>'+known+'</b></div>'+
    list.map(function(v,i){return '<div class="qcard"><div class="row"><b style="font-size:15px">'+esc(v.w)+'</b><div class="spacer"></div><span class="chip">'+(((v.box||0)>=4)?rqIcon('check',14):(v.box||0)+'/4')+'</span><button class="lnk danger" style="margin-left:8px" onclick="delWord('+i+')">✕</button></div>'+
      (v.ctx?'<div class="qnote">«'+esc(v.ctx)+'»</div>':'')+
      '<div class="qmeta"><span>'+esc(v.book||'')+'</span><div class="spacer"></div><span>'+(v.date||'')+'</span></div></div>';}).join('');
}
function delWord(i){if(!S.vocab||!S.vocab[i])return;S.vocab.splice(i,1);save();renderVocab();}
function dueCards(){return (S.vocab||[]).map(function(v,i){return {v:v,i:i};}).filter(function(o){return (o.v.box||0)<5;});}
function renderVocabCards(){
  const box=el('vocabBody');const due=dueCards();
  if(!due.length){box.innerHTML='<div style="text-align:center;padding:50px 0">Все карточки повторены!<br><br><button class="buy" onclick="vocabMode=\'list\';renderVocab()">К списку</button></div>';return;}
  if(vcIdx>=due.length)vcIdx=0;
  const o=due[vcIdx],v=o.v;
  box.innerHTML='<div style="text-align:center;font-size:12px;color:var(--muted);margin:6px 0 12px">Карточка '+(vcIdx+1)+' из '+due.length+'</div>'+
    '<div class="flashcard" onclick="vcFlip=!vcFlip;renderVocabCards()">'+
    (vcFlip?'<div class="fc-back">'+(v.ctx?'«'+esc(v.ctx)+'»':'<span style="color:var(--muted)">нет контекста — добавьте перевод сами</span>')+'<div style="font-size:12px;color:var(--muted);margin-top:12px">'+esc(v.book||'')+'</div></div>'
           :'<div class="fc-front">'+esc(v.w)+'<div style="font-size:12px;color:var(--muted);font-weight:400;margin-top:12px">тап — показать контекст</div></div>')+
    '</div>'+
    '<div class="row" style="gap:10px;margin-top:14px"><button class="buy" style="flex:1;background:#e0445b" onclick="gradeCard('+o.i+',false)">Повторить</button><button class="buy owned" style="flex:1" onclick="gradeCard('+o.i+',true)">Знаю</button></div>';
}
function gradeCard(i,known){const v=(S.vocab||[])[i];if(!v)return;v.box=known?Math.min(5,(v.box||0)+1):0;save();vcFlip=false;vcIdx++;renderVocabCards();}
if(el('btnVocabCards'))el('btnVocabCards').onclick=function(){vocabMode=(vocabMode==='cards')?'list':'cards';vcIdx=0;vcFlip=false;renderVocab();};
if(el('dShop'))el('dShop').onclick=()=>{renderShop();show('shop');closeDrawer();};

/* Квесты живут на экране «Квесты» (openJournal) */
let progLast='calendar';
function openProgress(sub){
  if(isMvp()&&!__navAllow&&['calendar','achievements','shelf'].indexOf(sub)>=0)sub='stats'; /* MVP folds these into the library; their tabs are hidden there */
  if(sub==='stats')renderStats();else if(sub==='quotes')renderQuotes();else if(sub==='vocab')renderVocab();else if(sub==='achievements')renderAchievements();else if(sub==='shelf')renderShelf();else{sub='calendar';renderCalendar();}
  progLast=sub;navShowSub(sub==='shelf'?'shelfScreen':sub);
  document.querySelectorAll('.progtab').forEach(b=>b.classList.toggle('on',b.dataset.sub===sub));
  closeDrawer();
}
if(el('dProg'))el('dProg').onclick=()=>openProgress(progLast);


/* ================= БИБЛИОТЕКА ================= */
/* gold auto-paid at boot for a session recovered after a kill: one quiet line on the library, once
   (runtime only — gone after any screen change or reload; never shown in the reader) */
let __bootGold=0;
function renderLibrary(){
  rollDay();
  if(!renderLibrary._bk){renderLibrary._bk=true;
    const ub=(S.userBooks||[]).length;
    const stale=!S.lastBackup||((Date.now()-new Date(S.lastBackup).getTime())>14*86400000);
    if(ub>0&&stale)setTimeout(()=>{if(!el('library').classList.contains('hidden'))flashMsg('Совет: сделайте резервную копию своих книг (Настройки → Данные → Экспорт)',{kind:'info',icon:'info'});},1400); /* 1б: library tip only on the library, never over the text */
  }
  libSortSync();libGoldRender(); /* balance as text, floor(S.gold), same source as the drawer; no writes */
  el('goalTitle').textContent=isMvp()?('Цель '+goalMin()+' мин'):('Цель дня: '+S.goal+' мин');
  const _mt=isMvp()?minTodaySess():S.minToday;
  el('goalSub').textContent='Сегодня: '+Math.floor(_mt)+' мин';
  const gl=el('libGoldLine');if(gl){gl.textContent='';if(__bootGold)gl.textContent='+'+coinsP(__bootGold)+' за прошлую сессию';gl.classList.toggle('hidden',!__bootGold);}
  el('streakTxt').innerHTML=rqIcon('flame',16)+'<span></span>';el('streakTxt').lastChild.textContent=S.streak+' '+plural(S.streak,'день','дня','дней');
  el('lvlTxt').innerHTML=rqIcon('star',16)+'<span></span>';el('lvlTxt').lastChild.textContent='Ур. '+level(S.xp);
  const pct=Math.min(1,_mt/goalMin());
  el('ringFg').style.strokeDashoffset=207*(1-pct);
  el('ringFg').style.stroke=pct>=1?'var(--good)':'var(--accent)';
  el('ringTxt').textContent=Math.floor(pct*100)+'%';
  bbHatchRender(pct);
  renderLibChips();
  // карточка «Продолжить чтение»
  const cc=el('continueCard');
  if(cc){const lid=S.lastRead,lb=lid&&allBooks().find(x=>x.id===lid);
    if(lb&&!S.finished.includes(lid)){const pr=Math.round(rqPos(lid)*100);
      cc.innerHTML='<button class="continuecard" onclick="openBook(\''+lid+'\')"><div class="cover">'+coverHtml(lb)+'</div><div style="flex:1;min-width:0;text-align:left"><div style="font-size:11px;color:var(--muted)">ПРОДОЛЖИТЬ ЧТЕНИЕ</div><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(lb.title)+'</b><div class="pbar" style="margin-top:6px"><i style="width:'+pr+'%"></i></div></div><span style="font-size:22px;opacity:.6">›</span></button>';}
    else cc.innerHTML='';}
  const dc=el('dailyCard');
  if(dc){if(S.dailyClaim!==today()){const rew=dailyReward();dc.innerHTML='<button class="dailycard" onclick="claimDaily()">'+rqIcon('gift',18)+'<b style="margin:0 4px">Ежедневный бонус</b>+'+rew+' монет'+'<span style="margin-left:auto;font-size:12px">забрать ›</span></button>';}else dc.innerHTML='';}
  const shelf=el('shelf');shelf.innerHTML='';
  let list=allBooks();
  if(LIB.q)list=list.filter(b=>(b.title+' '+b.author).toLowerCase().includes(LIB.q));
  if(LIB.f==='fav')list=list.filter(b=>S.favs.includes(b.id));
  else if(LIB.f!=='all')list=list.filter(b=>bookStatus(b.id)===LIB.f);
  if(LIB.author)list=list.filter(b=>b.author===LIB.author);
  LIB.sort=libSortGet();
  if(LIB.sort==='title')list.sort((a,b)=>a.title.localeCompare(b.title));
  else if(LIB.sort==='progress')list.sort((a,b)=>rqPos(b.id)-rqPos(a.id)); /* 1б-144: by current position */
  else{const lo=S.lastOpen||{};list.sort((a,b)=>(lo[b.id]||0)-(lo[a.id]||0));}
  if(!list.length)shelf.innerHTML='<div class="pempty" style="grid-column:1/-1">Ничего не найдено</div>';
  list.forEach(b=>{
    const p={ratio:rqPos(b.id)}; /* card % = current position (farthest stays for finish / stats) */
    const done=S.finished.includes(b.id);
    const card=document.createElement('button');card.className='bookcard';
    card.innerHTML='<div class="cover">'+coverHtml(b)+'</div><div class="bmeta">'+
      '<div class="btitle">'+(S.favs.includes(b.id)?'<span style="color:var(--accent2)">★</span> ':'')+esc(b.title)+'</div><div class="bauthor">'+esc(b.author)+'</div>'+
      '<div class="pbar"><i style="width:'+Math.round((done?1:p.ratio)*100)+'%;'+(done?'background:#4cd97b':'')+'"></i></div>'+
      '<div class="bpct">'+(done?'Прочитано':Math.round(p.ratio*100)+'%')+' · качает '+statOf(b)+'</div></div>'+
      '<span class="infobtn" onclick="event.stopPropagation();bookInfo(\''+b.id+'\')">ⓘ</span>';
    card.onclick=()=>openBook(b.id);
    shelf.appendChild(card);
  });
  if(isMvp()){
    document.querySelectorAll('#shelf .bpct').forEach(function(n){
      n.textContent=n.textContent.replace(/\s·\sкачает.*$/,'');
    });
  }
  applyMvpChrome();
}
/* 1в: «N монет» — число и слово из одного n; '∞' (devMoney) → «монет» */
function coinsP(n){return n+' '+(typeof n==='number'?plural(n,'монета','монеты','монет'):'монет');}
/* «Бабочковый» goal row: 10 cocoons, each tenth of the goal wakes a butterfly; newly woken ones play bb-hatch once (off with reduced motion) */
let __bbHatched=-1;
/** «Бабочковый» goal row: 10 cocoons, each tenth of pct hatches a butterfly. id 'bbHatch' = library goal card (new ones animate), 'sumHatch' = session summary (static) */
function bbHatchRender(pct,id){const lib=!id||id==='bbHatch',h=el(id||'bbHatch');if(!h)return;
  if(document.documentElement.dataset.skin!=='babochkovyi'){if(h.firstChild)h.innerHTML='';if(lib)__bbHatched=-1;return;}
  const n=Math.min(10,Math.floor(pct*10+1e-9)),was=!lib||__bbHatched<0?n:__bbHatched;let s='';
  for(let k=0;k<10;k++)s+='<i class="'+(k<n?'on'+(k>=was?' new':''):'')+'"></i>';
  h.innerHTML=s;if(!lib)return;__bbHatched=n;
  if(n>=10)el('goalSub').textContent='Все бабочки проснулись';}
function plural(n,a,b,c){const m=n%10,h=n%100;if(h>=11&&h<=14)return c;if(m===1)return a;if(m>=2&&m<=4)return b;return c;}
/* --- поиск и фильтры библиотеки --- */
let LIB={q:'',f:'all',author:null,sort:'recent'};
el('libSearch').oninput=e=>{LIB.q=e.target.value.toLowerCase().trim();renderLibrary();};
/* balance: «N монет»; if the header overflows, the number alone */
function libGoldRender(){const c=el('goldChip');if(!c)return;const g=goldDisp();c.textContent=coinsP(g);
  const h=el('libHead');if(h&&h.offsetParent&&h.scrollWidth>h.clientWidth+1)c.textContent=String(g);} /* only a real header overflow; a squeezed title is the skin's job (16.10: «104» bare on other fonts) */
addEventListener('resize',function(){if(!el('library').classList.contains('hidden'))libGoldRender();});
if(document.fonts&&document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',function(){libGoldRender();}); /* skin fonts arrive later and widen the header */
/* sort (15.10): NS_set.libSort = string id from LIB_SORTS. Read is forgiving and never writes; a DIFFERENT pick → one gated saveSet
   (rqSaveSetGated: deferred until __rqReady, only if the gate allows). Opening / closing / re-picking the current one writes nothing. */
const LIB_SORTS=[{k:'recent',t:'Недавние'},{k:'title',t:'По названию'},{k:'progress',t:'По прогрессу'}];
function libSortRead(v){return (typeof v==='string'&&LIB_SORTS.some(function(o){return o.k===v;}))?v:'recent';}
function libSortGet(){return libSortRead(typeof SET!=='undefined'&&SET?SET.libSort:null);}
function libSortLabel(k){return (LIB_SORTS.find(function(o){return o.k===k;})||LIB_SORTS[0]).t;}
function libSortPick(k){k=libSortRead(k);libSortMenu(false);if(k===libSortGet()){LIB.sort=k;return false;}
  SET.libSort=k;LIB.sort=k;rqSaveSetGated();try{renderLibrary();}catch(e){}return true;}
function libSortSync(){const b=el('libSortBtn');if(!b)return;const k=libSortGet();b.querySelector('.lsl').textContent=libSortLabel(k);
  const m=el('libSortMenu');if(m)m.querySelectorAll('.lso').forEach(function(o){o.setAttribute('aria-checked',o.dataset.k===k?'true':'false');});}
function libSortMenu(open){const m=el('libSortMenu'),b=el('libSortBtn');if(!m||!b)return;m.hidden=!open;b.setAttribute('aria-expanded',open?'true':'false');if(open)libSortSync();}
(function(){const m=el('libSortMenu'),b=el('libSortBtn');if(!m||!b)return;
  m.innerHTML=LIB_SORTS.map(function(o){return '<button type="button" class="lso" role="menuitemradio" data-k="'+o.k+'" aria-checked="false"><span>'+esc(o.t)+'</span>'+rqIcon('check',20)+'</button>';}).join('');
  m.addEventListener('click',function(e){const o=e.target.closest('.lso');if(o){e.stopPropagation();libSortPick(o.dataset.k);}});
  b.onclick=function(e){e.stopPropagation();libSortMenu(m.hidden);};
  document.addEventListener('click',function(e){if(!m.hidden&&!m.contains(e.target)&&e.target!==b)libSortMenu(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!m.hidden)libSortMenu(false);});})();
/* search: hidden by default; the icon swaps the header for the field (focus); ✕ closes and clears */
function libSearchOpen(open){const bar=el('libSearchBar'),h=el('libHead'),i=el('libSearch');if(!bar||!h)return;bar.hidden=!open;h.hidden=!!open;el('libSearchBtn').setAttribute('aria-expanded',open?'true':'false');
  if(open){i.focus();}else{i.value='';LIB.q='';renderLibrary();}}
if(el('libSearchBtn'))el('libSearchBtn').onclick=function(){libSearchOpen(true);};
if(el('libSearchClose'))el('libSearchClose').onclick=function(){libSearchOpen(false);};
function bookStatus(id){
  if(S.finished.includes(id))return 'done';
  if(S.status[id]==='want')return 'want';
  if(((S.progress[id]||{}).ratio||0)>0)return 'reading';
  return 'new';
}
/* --- сложность книг и привязка характеристик --- */
const DIFFS=[{n:'На вечер',m:1},{n:'Лёгкая',m:1.2},{n:'Средняя',m:1.5},{n:'Сложная',m:2},{n:'Демоническая',m:3}];
function diffOf(id){
  const man=S.bookDiff[id];
  if(man>0)return man-1;
  if(S.autoDiff===false)return 2;
  const b=allBooks().find(x=>x.id===id);if(!b)return 2;
  const len=b.text&&b.text.length?b.text.length:(b.pages||60)*1800;
  let lvl=0;
  if(len>30000)lvl++;
  if(len>100000)lvl++;
  if(len>250000)lvl++;
  if(len>500000)lvl++;
  if(/нон-фикшн|наук|учеб|справ|филос/i.test(b.genre))lvl++; // прикладная литература ценнее
  if(/юмор|рассказ/i.test(b.genre))lvl--;
  return Math.max(0,Math.min(4,lvl));
}
/* «Карандашный»: emoji cover → hatched tile with a Lucide icon and the format on a clean plate (picture covers stay pictures) */
const PC_COVER_ICONS=['book-open','moon','star','heart','compass','sparkles','flame','gift'];
function pencilCover(b){return lucideCover(b,'pc-cover');}
function lucideCover(b,cls){
  const fmt=b.type==='pdf'?'PDF':(/\.fb2$/i.test(b.fname||'')||b.genre==='FB2'?'FB2':(/\.epub$/i.test(b.fname||'')?'EPUB':'TXT'));
  let ic=fmt==='PDF'?'file-text':fmt==='FB2'?'book-marked':null;
  if(!ic){let h=0;const k=String(b.id||b.title||'');for(let i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))>>>0;ic=PC_COVER_ICONS[h%PC_COVER_ICONS.length];}
  return '<span class="'+cls+'">'+rqIcon(ic,20)+'<i>'+fmt+'</i></span>';
}
/* «Эллада»: emoji cover → vase-painting tile (handoff/skins/ellada, our own profile figures). Kind and figure by a hash of the id.
   red = black glaze + terracotta figure, black = light label over a terracotta field with a black figure, marble, aegean.
   The format label never sits on terracotta (README «Правило терракоты»). Picture covers stay pictures. */
const EL_FIG={
 ship:'<path d="M6 34H54L48 42H14z"/><path d="M30 34V8M30 10L46 30H30zM30 12L16 30H30z"/>',
 dolphin:'<path d="M8 32Q14 14 34 16Q48 17 54 26Q46 24 40 28Q46 34 44 40Q38 32 30 32Q20 34 14 40Q14 34 8 32z"/><path d="M30 17l4-8 3 9z"/>',
 runner:'<circle cx="34" cy="9" r="5"/><path d="M33 14L28 28 18 34 22 37 31 31 34 40 26 48 29 50 38 41 36 29 44 22 48 26 51 24 44 16z"/>',
 horse:'<path d="M14 46Q18 30 26 22Q24 14 30 8L34 14Q44 14 50 24L46 28Q40 24 38 28Q42 38 40 46z"/>',
 owl:'<path d="M20 14L24 8 28 12Q30 11 32 12L36 8 40 14Q44 24 40 36Q36 46 30 46Q24 46 20 36Q16 24 20 14z"/>',
 vine:'<circle cx="20" cy="36" r="4"/><circle cx="26" cy="38" r="4"/><circle cx="23" cy="43" r="4"/><circle cx="42" cy="22" r="4"/><circle cx="47" cy="27" r="4"/><path d="M10 44Q20 20 30 30T50 14" fill="none" stroke-width="2.6"/>'};
const EL_KINDS=['red','black','marble','aegean'];
function bookFmt(b){return b.type==='pdf'?'PDF':(/\.fb2$/i.test(b.fname||'')||b.genre==='FB2'?'FB2':(/\.epub$/i.test(b.fname||'')?'EPUB':'TXT'));}
function elladaCover(b){
  let h=0;const k=String(b.id||b.title||'');for(let i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))>>>0;
  const kind=EL_KINDS[h%EL_KINDS.length],figs=Object.keys(EL_FIG),fig=figs[(h>>3)%figs.length];
  return '<span class="el-cover el-'+kind+'"><i>'+bookFmt(b)+'</i><svg viewBox="0 0 60 52" aria-hidden="true" focusable="false"><g>'+EL_FIG[fig]+'</g></svg></span>';
}
/* «Бабочковый»: emoji cover → pastel iridescent tile with a butterfly (handoff/skins/babochkovyi; our curves, no real species);
   «moon» = night cover with a pale moth and the moon, «cocoon» = a cocoon. Kind by a hash of the id; format label in ink on the pastel. */
const BB_KINDS=[['a','#8fd3d8','#b9a7ec'],['b','#f3b4cf','#c5b3f1'],['moon'],['cocoon'],['c','#8fd3d8','#b5e3c4'],['d','#a996e6','#f3b4cf']];
/* 17.10 (Джессика: «большее разнообразие бабочек»): 5 wing shapes × 8 palettes, same drawings as tools/bb_species.py (python3 tools/gen-bb-decor.py --js) */
const BB_SP={"morpho":{"up":"M20 19C23 8 33 3 37 8C40 14 33 20 21 21z","lo":"M21 22C29 22 35 27 32 33C29 37 23 32 21 24z","spot":[31,11,2.2]},"swallow":{"up":"M20 18C23 7 34 3 38 6C39 11 33 19 21 21z","lo":"M21 22C28 21 33 25 31 30L33 38 28.5 32.5C25 31 22 27 21 24z","spot":[32,9,1.8]},"round":{"up":"M20 19C20 10 29 6 34 10C37 15 31 20 21 21z","lo":"M21 22C28 21 33 26 30 31C27 34 22 29 21 24z","spot":[29,12,2.4]},"long":{"up":"M20 19C25 12 35 8 39 10C39 15 30 19 21 21z","lo":"M21 22C26 22 31 25 29 29C26 31 22 27 21 24z","spot":[34,11,1.6]},"scallop":{"up":"M20 19C22 9 30 4 35 6Q38 8 37 11Q39 14 36 16Q35 19 21 21z","lo":"M21 22C27 21 33 24 33 28Q33 31 30 31Q29 35 25 33C23 31 21 27 21 24z","spot":[30,10,2]}};
const BB_PAL=[["#8fd3d8","#b9a7ec","#ffffff","#3a3f6a"],["#f3b4cf","#c5b3f1","#ffffff","#5b4f7a"],["#f6e27a","#f9f0b8","#f2a65a","#6b5a2a"],["#8ec5f2","#cfe6fb","#ffffff","#2f4f7a"],["#9fdcb6","#d6f2c8","#ffffff","#2f5a44"],["#f7c39b","#fbe0c8","#ffffff","#7a4a2a"],["#f0a04b","#f6c27a","#5b3a1e","#5b3a1e"],["#a996e6","#e2dbf7","#8fd3d8","#3a3f6a"]];
function bbWings(shape,pal){const S=BB_SP[shape]||BB_SP.morpho,P=BB_PAL[pal]||BB_PAL[0],sp=S.spot;
  const half='<path d="'+S.up+'" fill="'+P[0]+'" stroke="'+P[3]+'" stroke-width=".9"/><path d="'+S.lo+'" fill="'+P[1]+'" stroke="'+P[3]+'" stroke-width=".9"/><circle cx="'+sp[0]+'" cy="'+sp[1]+'" r="'+sp[2]+'" fill="'+P[2]+'" opacity=".85"/>';
  return half+'<g transform="translate(40 0) scale(-1 1)">'+half+'</g><path d="M20 15Q18 9 15 7M20 15Q22 9 25 7" fill="none" stroke="#2b2f4f" stroke-width=".9"/><ellipse cx="20" cy="22" rx="1.6" ry="7" fill="#2b2f4f"/>';}
function bbCover(b){
  let h=0;const k=String(b.id||b.title||'');for(let i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))>>>0;
  const K=BB_KINDS[h%BB_KINDS.length];let art;
  if(K[0]==='moon')art='<circle cx="30" cy="9" r="6" fill="#f1ecd2"/><g transform="translate(4 8) scale(.9)"><path d="M20 19C24 10 34 8 37 12C38 17 31 21 21 21zM21 22C27 23 31 28 30 33L33 39 28 34C25 31 22 27 21 24z" fill="#dfeee4" stroke="#8fb7a0" stroke-width=".9"/><g transform="translate(40 0) scale(-1 1)"><path d="M20 19C24 10 34 8 37 12C38 17 31 21 21 21zM21 22C27 23 31 28 30 33L33 39 28 34C25 31 22 27 21 24z" fill="#dfeee4" stroke="#8fb7a0" stroke-width=".9"/></g><ellipse cx="20" cy="22" rx="2" ry="6.5" fill="#f3f6ee"/></g>';
  else if(K[0]==='cocoon')art='<path d="M20 2V9" stroke="#6b5a3e"/><path d="M20 9C11 15 12 33 20 40C28 33 29 15 20 9z" fill="#e7d9a6" stroke="#8a6a2c" stroke-width="1.2"/><path d="M14 18Q20 21 26 18M13 25Q20 28 27 25M14 32Q20 35 26 32" stroke="#b39a5a" fill="none" stroke-width=".8"/>';
  else{const sh=Object.keys(BB_SP),m=Math.imul(h^(h>>>15),2654435761)>>>0; /* mixed: similar ids still get different kinds */
    art='<g transform="translate(0 2) rotate('+((h>>4)%21-10)+' 20 20)">'+bbWings(sh[m%sh.length],(m>>>8)%BB_PAL.length)+'</g>';}
  return '<span class="bb-cover bb-'+K[0]+'"><i>'+bookFmt(b)+'</i><svg viewBox="0 0 40 42" aria-hidden="true" focusable="false">'+art+'</svg></span>';
}
/* «Небесный»: emoji cover → night-sky tile in one of five inks with a gold emblem (sun, crescent, star, cloud, comet); light gold format label
   on the dark ink (contrast ≥ 7). Ink by the id hash (consecutive ids get neighbouring inks), emblem by a mixed hash. */
const CL_INKS=['plum','blue','green','gold','brick','sky'];
const CL_EMB={
 sun:'<circle cx="15" cy="15" r="5.5" fill="#f1d28a"/><path d="M15 3v4M15 23v4M3 15h4M23 15h4M6.5 6.5l2.8 2.8M20.7 20.7l2.8 2.8M6.5 23.5l2.8-2.8M20.7 9.3l2.8-2.8" stroke="#f1d28a" stroke-width="1.6" stroke-linecap="round"/>',
 moon:'<path d="M18 4a11 11 0 1 0 8 17.5A9 9 0 1 1 18 4z" fill="#f1d28a"/><path d="M24 6l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill="#fff3c4"/>',
 star:'<path d="M15 3l3.5 8 8.5.7-6.5 5.6 2 8.4L15 21.2l-7.5 4.5 2-8.4L3 11.7l8.5-.7z" fill="#f1d28a"/>',
 cloud:'<circle cx="21" cy="9" r="4.5" fill="#f1d28a"/><path d="M6 24a5 5 0 0 1 1-9.9A7 7 0 0 1 20 13a5 5 0 0 1 4 9.5V24z" fill="#fff3d1"/>',
 comet:'<circle cx="21" cy="9" r="4" fill="#f1d28a"/><path d="M18 12L5 25M19.5 14.5L9 25M15.5 10.5L5 21" stroke="#f1d28a" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>'};
function celCover(b){
  let h=0;const k=String(b.id||b.title||'');for(let i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))>>>0;
  const m=Math.imul(h^(h>>>15),2654435761)>>>0,em=Object.keys(CL_EMB);
  /* the title and author are printed on the cover (the shelf grid shows them, small covers hide them) */
  return '<span class="cl-cover cl-'+CL_INKS[h%CL_INKS.length]+'"><i>'+bookFmt(b)+'</i><b class="cl-t">'+esc(b.title||'')+'</b><small class="cl-a">'+esc(b.author||'')+'</small><svg viewBox="0 0 30 30" aria-hidden="true" focusable="false">'+CL_EMB[em[(m>>>8)%em.length]]+'</svg></span>';
}
function statOf(b){return S.bookStat[b.id]||b.stat;}
function coverHtml(b){
  const cv=S.covers[b.id];
  if(cv&&cv.indexOf('data:')===0)return '<img src="'+cv+'" alt="">';
  if(typeof isPencil==='function'&&isPencil())return pencilCover(b);
  if(document.documentElement.dataset.skin==='ellada')return elladaCover(b);
  if(document.documentElement.dataset.skin==='babochkovyi')return bbCover(b);
  if(document.documentElement.dataset.skin==='celestial')return celCover(b);
  return lucideCover(b,'rq-cover'); /* no emoji covers in any theme (old emoji / emoji picks in S.covers are ignored) → Lucide + format */
}
function renderLibChips(){
  const box=el('libChips');box.innerHTML='';
  [['all','Все'],['reading','Читаю'],['want','Хочу'],['done','Прочитано'],['fav','Избранное']].forEach(([k,t])=>{
    const b=document.createElement('button');
    b.className='fchip'+(LIB.f===k&&!LIB.author?' on':'');b.textContent=t;
    b.onclick=()=>{LIB.f=k;LIB.author=null;renderLibrary();};
    box.appendChild(b);
  });
  Array.from(new Set(allBooks().map(b=>b.author))).forEach(a=>{
    const b=document.createElement('button');
    b.className='fchip'+(LIB.author===a?' on':'');b.textContent=a;
    b.onclick=()=>{LIB.author=LIB.author===a?null:a;renderLibrary();};
    box.appendChild(b);
  });
}
function esc(s){return String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}

/* Добавление книг (Джессика 15.10): несколько файлов за раз, папка (Android Chrome), «Поделиться → ReadQuest» (share target в sw.js).
   One path for all: files go one by one through importBookFile (same book card and IDB writes as a single add). In a batch (2+ files)
   a file already on the shelf (same fname + size) is skipped, so picking the same folder twice adds nothing; a single picked file is
   added as before (savetext contract). Unsupported extensions are ignored, a broken file does not stop the rest, the batch result is one
   toast (arch.md «1в: импорт пачкой»); a single file keeps its old alert. */
const BOOK_EXT=/\.(txt|epub|fb2|pdf)$/i;
let bookIdN=0;
function newBookId(){try{if(crypto&&crypto.randomUUID)return 'u'+crypto.randomUUID();}catch(e){}return 'u'+Date.now()+'-'+(++bookIdN);} /* arch.md 1в: id is never parsed as time */
function importToast(t,err){flashMsg(t,{kind:err?'error':'info',ms:6000});const d=document.querySelector('.rq-toast');if(d)d.classList.add('imp');}
/* binary check (bug 16.10, an .mp3 on the shelf): NUL bytes or many U+FFFD / control chars in the first 64K = not text */
function looksLikeText(t){const h=String(t||'').slice(0,65536);if(!h)return true;let bad=0;
  for(let i=0;i<h.length;i++){const c=h.charCodeAt(i);if(c===0)return false;if(c===0xFFFD||(c<32&&c!==9&&c!==10&&c!==13&&c!==12))bad++;}
  return bad/h.length<0.02;}
async function importBookFile(f,setBusy){
  let b;
  if(/\.pdf$/i.test(f.name)){
    setBusy('Загружаю PDF...');
    await loadPdfJs();
    const buf=await f.arrayBuffer();
    const doc=await window.pdfjsLib.getDocument({data:buf.slice(0)}).promise;
    const nPages=doc.numPages;try{doc.destroy();}catch(_){} /* only the page count is needed here */
    const id=newBookId();
    await idbPut('pdf:'+id,buf);
    b={id:id,title:f.name.replace(/\.pdf$/i,''),author:'PDF',genre:'PDF',stat:'Воля',cover:'📄',type:'pdf',pages:nPages,text:'',fname:f.name,size:f.size};
  }else if(/\.fb2$/i.test(f.name)){
    setBusy('Разбираю FB2...');
    const r=await parseFb2(f);
    b={id:newBookId(),title:r.title,author:r.author,genre:'FB2',stat:'Воображение',cover:'📕',text:r.text,toc:r.toc,lang:r.lang||undefined,fname:f.name,size:f.size};
  }else if(/\.epub$/i.test(f.name)){
    setBusy('Распаковываю EPUB...');
    const r=await parseEpub(f);
    b={id:newBookId(),title:r.title,author:r.author,genre:'EPUB',stat:'Воля',cover:'📘',text:r.text,toc:r.toc,fname:f.name,size:f.size};
  }else{
    let txt=await f.text();
    if(!looksLikeText(txt)&&txt.indexOf('\u0000')<0){try{const t2=new TextDecoder('windows-1251').decode(await f.arrayBuffer());if(looksLikeText(t2))txt=t2;}catch(e){}} /* old Russian .txt in cp1251 */
    if(!looksLikeText(txt))throw new Error('это не текстовый файл'); /* 16.10: music / binary under .txt never becomes a book */
    b={id:newBookId(),title:f.name.replace(/\.txt$/i,''),author:'Моя книга',genre:'Своя книга',stat:'Воля',cover:'📜',text:txt,fname:f.name,size:f.size};
  }
  if(b.type!=='pdf'&&(!b.text||b.text.length<20))throw new Error('текст пустой');
  /* the text body goes to IDB once, here (saveFlat writes only the envelope) — before the book appears on the shelf */
  return rqAddBook(b);
}
/* one way a new book reaches the shelf (file import and «Путь читателя»): text body to IDB once, then the card, then save() */
async function rqAddBook(b){
  if(b.type!=='pdf'){
    if(window.__rqWriter&&!window.__rqWriter.mayWrite())throw new Error('книга открыта в другом окне');
    if(!__rq||!__rq.upsertUserBook)throw new Error('хранилище ещё не готово — обновите страницу');
    await __rq.upsertUserBook(null,b,{text:b.text});
  }
  S.userBooks.push(b);
  if(!(typeof achV2==='function'&&achV2())&&!S.badges.includes('collector'))S.badges.push('collector'); /* v2: «Коллекционер» needs 10 min in the book */
  save();
  return b;
}
let bookImportBusy=false;
async function importBookFiles(list){
  const all=Array.from(list||[]);
  const files=all.filter(function(f){return BOOK_EXT.test(f.name);});
  if(!files.length){if(all.length)importToast('Здесь нет книг: подходят .txt, .epub, .fb2 и .pdf',true);return {added:0};}
  if(bookImportBusy){importToast('Подождите, предыдущие книги ещё добавляются');return {added:0};}
  bookImportBusy=true;
  const btn=el('btnAdd'),many=files.length>1;
  let added=0,skipped=0;const failed=[];
  for(let i=0;i<files.length;i++){
    const f=files[i];
    const setBusy=function(t){btn.setAttribute('aria-busy','true');btn.setAttribute('aria-label',many?('Добавляю '+(i+1)+' из '+files.length+'...'):t);};
    setBusy('Добавляю...');
    if(many&&S.userBooks.some(function(b){return b&&b.fname===f.name&&b.size===f.size;})){skipped++;continue;}
    try{await importBookFile(f,setBusy);added++;}catch(err){failed.push({n:f.name,m:String(err&&err.message||err)});}
  }
  btn.removeAttribute('aria-busy');btn.setAttribute('aria-label','Добавить книгу'); /* icon button: progress via aria-label, icon stays */
  bookImportBusy=false;
  if(added)renderLibrary();
  if(!many){if(failed.length)alert('Не удалось загрузить книгу: '+failed[0].m);}
  else{
    const m=['Добавлено книг: '+added+' из '+files.length+'.'];
    if(skipped)m.push('Уже были в библиотеке: '+skipped+'.');
    if(failed.length)m.push('Не открылись: '+failed.slice(0,2).map(function(x){return x.n;}).join(', ')+(failed.length>2?' и ещё '+(failed.length-2):'')+'.');
    if(failed.length)console.warn('[rq] import',failed);
    importToast(m.join(' '),failed.length>0);
  }
  return {added:added,skipped:skipped,failed:failed.length};
}
el('fileInp').onchange=function(e){const fs=Array.from(e.target.files||[]);e.target.value='';if(fs.length)importBookFiles(fs);};
if(el('dirInp'))el('dirInp').onchange=function(e){const fs=Array.from(e.target.files||[]);e.target.value='';if(fs.length)importBookFiles(fs);};
/* «+»: a menu «Выбрать файлы» / «Выбрать папку». The folder row only where a folder can be picked (not on iPhone / iPad). */
function addFolderOk(){const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  return !ios&&('webkitdirectory' in document.createElement('input'));}
function addMenu(open){const m=el('addMenu'),b=el('btnAdd');if(!m||!b)return;m.hidden=!open;b.setAttribute('aria-expanded',open?'true':'false');}
(function(){const m=el('addMenu'),b=el('btnAdd');
  if(!m){b.onclick=function(){el('fileInp').click();};return;}
  const rows=[{k:'files',t:'Выбрать файлы',i:'file-text'}];if(addFolderOk())rows.push({k:'folder',t:'Выбрать папку',i:'folder'});
  m.innerHTML=rows.map(function(o){return '<button type="button" class="lso" role="menuitem" data-k="'+o.k+'">'+rqIcon(o.i,20)+'<span>'+esc(o.t)+'</span></button>';}).join('');
  m.addEventListener('click',function(e){const o=e.target.closest('.lso');if(!o)return;e.stopPropagation();addMenu(false);el(o.dataset.k==='folder'?'dirInp':'fileInp').click();});
  b.onclick=function(e){e.stopPropagation();if(b.getAttribute('aria-busy')==='true')return;if(rows.length===1){el('fileInp').click();return;}addMenu(m.hidden);};
  document.addEventListener('click',function(e){if(!m.hidden&&!m.contains(e.target)&&e.target!==b)addMenu(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!m.hidden)addMenu(false);});})();
/* «Поделиться → ReadQuest» (Android, installed app): sw.js keeps the POSTed files in the cache `<ns>_share` and opens `?share=1`.
   Called once after boot: take the files, empty the cache, clean the URL, add them through the same path. */
async function importSharedBooks(){
  if(!/[?&]share=1(&|$)/.test(location.search))return;
  try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
  if(!('caches' in window))return;
  const name=(window.RQ_NS||'rq')+'_share';let files=[];
  try{const c=await caches.open(name);const reqs=await c.keys();
    for(const r of reqs){const res=await c.match(r);if(!res)continue;const blob=await res.blob();
      let fn='';try{fn=decodeURIComponent(res.headers.get('X-RQ-Name')||'');}catch(e){}
      if(!BOOK_EXT.test(fn)){const t=blob.type||'';const ext=/pdf/.test(t)?'.pdf':/epub/.test(t)?'.epub':/fictionbook/.test(t)?'.fb2':/^text\/plain/.test(t)?'.txt':'';
        if(ext)fn=(fn||'Книга')+ext;} /* a shared file may come without its extension: the type tells which */
      files.push(new File([blob],fn||'book',{type:blob.type}));}
    await caches.delete(name);
  }catch(e){console.warn('[rq] share',e);}
  if(files.length){try{show('library');}catch(e){}await importBookFiles(files);}
}

/* drawer gestures (spec): swipe right from the left edge (20px) opens it — not in the reader (edge = page turns); swipe left on the drawer closes it. Nothing is written. */
(function(){let sx=null,sy=0,mode='';
  document.addEventListener('touchstart',function(e){const t=e.touches[0];if(!t)return;const open=el('drawer').classList.contains('open');
    const inReader=!el('reader').classList.contains('hidden')||!el('summary').classList.contains('hidden');
    if(open){sx=t.clientX;sy=t.clientY;mode='close';}else if(t.clientX<=20&&!inReader&&!(el('rewardsSheet')&&el('rewardsSheet').classList.contains('open'))&&(!el('navCfg')||el('navCfg').hidden)){sx=t.clientX;sy=t.clientY;mode='open';}else sx=null;},{passive:true});
  document.addEventListener('touchend',function(e){if(sx===null)return;const t=e.changedTouches[0];const dx=t.clientX-sx,dy=Math.abs(t.clientY-sy);sx=null;
    if(dy>60)return;if(mode==='open'&&dx>50)openDrawer();else if(mode==='close'&&dx<-50)closeDrawer();},{passive:true});})();
