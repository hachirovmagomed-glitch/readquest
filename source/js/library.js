'use strict';
/* ================= ЭКРАНЫ ================= */
const SCREENS=['library','path','quotes','vocab','shop','profile','quests','stats','calendar','achievements','shelfScreen','settings','reader','summary'];
const DRAWER={library:'dLib',path:'dPath',quotes:'dNotes',vocab:'dVocab',profile:'dProf',quests:'dQuests',stats:'dStats',settings:'dSet'};
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
  {id:'notes',t:'Цитаты и заметки',s:'Цитаты',ic:'notebook-pen'},
  {id:'vocab',t:'Словарь',ic:'book-marked'},
  {id:'stats',t:'Статистика',ic:'chart-column'}];
const NAV_DEF=['library','rewards','profile'], NAV_MAX=5;
/* ONE flag: in MVP mode, show the extra sections (quests, «Цитаты и заметки», «Словарь», «Статистика») in the drawer, bottom bar and «Нижняя панель».
   false → MVP shows only library/rewards/profile (+ settings); stored NS_set.nav is never rewritten by this. Outside MVP they always show. */
const RQ_MVP_DRAWER_EXTRAS=true;
function navAvail(id){return !isMvp()||RQ_MVP_DRAWER_EXTRAS||NAV_DEF.indexOf(id)>=0||id==='settings';}
function navShown(){return navGet().filter(navAvail);} /* view only: what the bar shows now */
const NAV_BN={library:'bnLib',path:'bnPath',rewards:'bnRew',profile:'bnProf',quests:'bnQuests',notes:'bnNotes',vocab:'bnVocab',stats:'bnStats'};
const NAV_DI={library:'dLib',path:'dPath',rewards:'dRew',profile:'dProf',quests:'dQuests',notes:'dNotes',vocab:'dVocab',stats:'dStats'};
function navItem(id){return NAV_CATALOG.find(function(x){return x.id===id;})||null;}
function navRead(v){
  if(!Array.isArray(v))return NAV_DEF.slice();
  const out=[];v.forEach(function(x){if(typeof x==='string'&&navItem(x)&&out.indexOf(x)<0)out.push(x);});
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
    else if(id==='notes')openJournal('quotes');
    else if(id==='vocab')openJournal('vocab');
    else if(id==='stats')openProgress('stats');
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
['menuLib','menuQuotes','menuVocab','menuShop','menuProf','menuQst','menuStats','menuCal','menuShelf','menuSet','menuPath'].forEach(m=>{if(el(m))el(m).onclick=openDrawer;});

let jrnLast='quotes';
function openJournal(sub){
  if(sub==='quests'){renderQuests();}else if(sub==='vocab'){renderVocab();}else{sub='quotes';renderQuotes();}
  jrnLast=sub;show(sub);
  document.querySelectorAll('.jtab').forEach(b=>b.classList.toggle('on',b.dataset.sub===sub));
  closeDrawer();
}
if(el('dJournal'))el('dJournal').onclick=()=>openJournal(jrnLast);
/* ===== Словарь-копилка + флешкарты ===== */
let vocabMode='list',vcIdx=0,vcFlip=false;
function renderVocab(){
  if(el('btnVocabCards'))el('btnVocabCards').textContent=(vocabMode==='cards')?'📃 Список':'🃏 Карточки';
  const box=el('vocabBody');if(!box)return;
  const list=S.vocab||[];
  if(!list.length){vocabMode='list';box.innerHTML='<div style="color:var(--muted);text-align:center;padding:46px 0">Пока пусто.<br>Выделите слово в книге и нажмите «📖» — оно попадёт сюда.<br><br>Потом повторяйте карточками 🃏</div>';return;}
  if(vocabMode==='cards'){renderVocabCards();return;}
  const known=list.filter(v=>(v.box||0)>=4).length;
  box.innerHTML='<div style="font-size:13px;color:var(--muted);margin-bottom:10px">Слов: <b>'+list.length+'</b> · выучено: <b>'+known+'</b></div>'+
    list.map(function(v,i){return '<div class="qcard"><div class="row"><b style="font-size:15px">'+esc(v.w)+'</b><div class="spacer"></div><span class="chip">'+(((v.box||0)>=4)?'✅':'🔁 '+(v.box||0)+'/4')+'</span><button class="lnk danger" style="margin-left:8px" onclick="delWord('+i+')">✕</button></div>'+
      (v.ctx?'<div class="qnote">«'+esc(v.ctx)+'»</div>':'')+
      '<div class="qmeta"><span>'+esc(v.book||'')+'</span><div class="spacer"></div><span>'+(v.date||'')+'</span></div></div>';}).join('');
}
function delWord(i){if(!S.vocab||!S.vocab[i])return;S.vocab.splice(i,1);save();renderVocab();}
function dueCards(){return (S.vocab||[]).map(function(v,i){return {v:v,i:i};}).filter(function(o){return (o.v.box||0)<5;});}
function renderVocabCards(){
  const box=el('vocabBody');const due=dueCards();
  if(!due.length){box.innerHTML='<div style="text-align:center;padding:50px 0">🎉 Все карточки повторены!<br><br><button class="buy" onclick="vocabMode=\'list\';renderVocab()">К списку</button></div>';return;}
  if(vcIdx>=due.length)vcIdx=0;
  const o=due[vcIdx],v=o.v;
  box.innerHTML='<div style="text-align:center;font-size:12px;color:var(--muted);margin:6px 0 12px">Карточка '+(vcIdx+1)+' из '+due.length+'</div>'+
    '<div class="flashcard" onclick="vcFlip=!vcFlip;renderVocabCards()">'+
    (vcFlip?'<div class="fc-back">'+(v.ctx?'«'+esc(v.ctx)+'»':'<span style="color:var(--muted)">нет контекста — добавьте перевод сами</span>')+'<div style="font-size:12px;color:var(--muted);margin-top:12px">'+esc(v.book||'')+'</div></div>'
           :'<div class="fc-front">'+esc(v.w)+'<div style="font-size:12px;color:var(--muted);font-weight:400;margin-top:12px">тап — показать контекст</div></div>')+
    '</div>'+
    '<div class="row" style="gap:10px;margin-top:14px"><button class="buy" style="flex:1;background:#e0445b" onclick="gradeCard('+o.i+',false)">🔁 Повторить</button><button class="buy owned" style="flex:1" onclick="gradeCard('+o.i+',true)">✅ Знаю</button></div>';
}
function gradeCard(i,known){const v=(S.vocab||[])[i];if(!v)return;v.box=known?Math.min(5,(v.box||0)+1):0;save();vcFlip=false;vcIdx++;renderVocabCards();}
if(el('btnVocabCards'))el('btnVocabCards').onclick=function(){vocabMode=(vocabMode==='cards')?'list':'cards';vcIdx=0;vcFlip=false;renderVocab();};
if(el('dShop'))el('dShop').onclick=()=>{renderShop();show('shop');closeDrawer();};

/* Квесты живут во вкладке «Дневник» (openJournal) */
let progLast='calendar';
function openProgress(sub){
  if(sub==='stats')renderStats();else if(sub==='achievements')renderAchievements();else if(sub==='shelf')renderShelf();else{sub='calendar';renderCalendar();}
  progLast=sub;show(sub==='shelf'?'shelfScreen':sub);
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
  renderLibChips();
  // карточка «Продолжить чтение»
  const cc=el('continueCard');
  if(cc){const lid=S.lastRead,lb=lid&&allBooks().find(x=>x.id===lid);
    if(lb&&!S.finished.includes(lid)){const pr=Math.round(rqPos(lid)*100);
      cc.innerHTML='<button class="continuecard" onclick="openBook(\''+lid+'\')"><div class="cover">'+coverHtml(lb)+'</div><div style="flex:1;min-width:0;text-align:left"><div style="font-size:11px;color:var(--muted)">▶ ПРОДОЛЖИТЬ ЧТЕНИЕ</div><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(lb.title)+'</b><div class="pbar" style="margin-top:6px"><i style="width:'+pr+'%"></i></div></div><span style="font-size:22px;opacity:.6">›</span></button>';}
    else cc.innerHTML='';}
  const dc=el('dailyCard');
  if(dc){if(S.dailyClaim!==today()){const rew=dailyReward();dc.innerHTML='<button class="dailycard" onclick="claimDaily()">🎁<b style="margin:0 4px">Ежедневный бонус</b>+'+rew+' монет'+'<span style="margin-left:auto;font-size:12px">забрать ›</span></button>';}else dc.innerHTML='';}
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
      '<div class="bpct">'+(done?'✅ Прочитано':Math.round(p.ratio*100)+'%')+' · качает '+statOf(b)+'</div></div>'+
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
function plural(n,a,b,c){const m=n%10,h=n%100;if(h>=11&&h<=14)return c;if(m===1)return a;if(m>=2&&m<=4)return b;return c;}
/* --- поиск и фильтры библиотеки --- */
let LIB={q:'',f:'all',author:null,sort:'recent'};
el('libSearch').oninput=e=>{LIB.q=e.target.value.toLowerCase().trim();renderLibrary();};
/* balance: «N монет»; if the header overflows, the number alone */
function libGoldRender(){const c=el('goldChip');if(!c)return;const g=goldDisp();c.textContent=coinsP(g);
  const h=el('libHead');if(h&&h.offsetParent&&h.scrollWidth>h.clientWidth+1)c.textContent=String(g);}
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
function pencilCover(b){
  const fmt=b.type==='pdf'?'PDF':(/\.fb2$/i.test(b.fname||'')||b.genre==='FB2'?'FB2':(/\.epub$/i.test(b.fname||'')?'EPUB':'TXT'));
  let ic=fmt==='PDF'?'file-text':fmt==='FB2'?'book-marked':null;
  if(!ic){let h=0;const k=String(b.id||b.title||'');for(let i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))>>>0;ic=PC_COVER_ICONS[h%PC_COVER_ICONS.length];}
  return '<span class="pc-cover">'+rqIcon(ic,20)+'<i>'+fmt+'</i></span>';
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
function statOf(b){return S.bookStat[b.id]||b.stat;}
function coverHtml(b){
  const cv=S.covers[b.id];
  if(cv&&cv.indexOf('data:')===0)return '<img src="'+cv+'" alt="">';
  if(typeof isPencil==='function'&&isPencil())return pencilCover(b);
  if(document.documentElement.dataset.skin==='ellada')return elladaCover(b);
  if(cv)return cv;
  return b.cover||rqIcon('book-open',22); /* no emoji cover (path books) → Lucide */
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
