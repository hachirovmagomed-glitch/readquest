'use strict';
/* 1в: ONE icon set — Lucide sprite <svg id="rqSprite"> in app.html (tools/gen-icons.py). Stroke = currentColor (CSS .ic). */
function rqIcon(n,sz){sz=sz||22;return '<svg class="ic" width="'+sz+'" height="'+sz+'" aria-hidden="true" focusable="false"><use href="#i-'+n+'"/></svg>';}
/* 1в: elements that can never be hidden by rq_set.uiHidden (stage 2). Settings screen and import check read THIS list. */
/* keys: btnBack, rTitle, btnTimer = element ids; dayRing = кольцо дня (#dayBar в читалке, #ringFg в библиотеке);
   readCounter = счётчик «N / 10 мин» (#focusCount); coinToasts = тосты монет (flashMsg kind:'game'). */
const UI_LOCKED=Object.freeze(['btnBack','rTitle','btnTimer','dayRing','readCounter','coinToasts']);
/** stage 1г (rq_set.uiHidden, default []): drop locked ids on load and import — one rule for the settings screen and the import check. */
function uiHiddenClean(h){return Array.isArray(h)?h.filter(function(k,i){return typeof k==='string'&&UI_LOCKED.indexOf(k)<0&&h.indexOf(k)===i;}):[];}

/* ================= MVP helpers ================= */
const REWARD_TIERS={small:100,mid:250,big:500};
const REWARD_TIER_LABELS={small:'Мелочь · 100',mid:'Приятное · 250',big:'Крупное · 500'};
const RQ_BUILD='20261029-1207'; /* replaced by build-dist.sh (visible in Настройки → Данные) */
function isMvp(){return SET.mvp!==false;}
/** audit 19.10 LIB-04: the author as shown — '' for the import placeholders («Моя книга», «PDF», «Неизвестен»), same list as ach-core NOT_AUTHOR */
function bookAuthor(b){const a=String((b&&b.author)||'').trim();return /^(моя книга|pdf|неизвестен|неизвестный автор)$/i.test(a)?'':a;}
/* MVP: daily goal 10 min, 12 s/page, 3 min/page cap are fixed in code (saved / imported values ignored). Outside MVP: v6 (S.goal / S.anti). */
const MVP_GOAL=10, MVP_ANTI={minSec:12,maxMin:3};
function goalMin(){return isMvp()?MVP_GOAL:(S.goal||10);}
function antiCfg(){return isMvp()?{minSec:MVP_ANTI.minSec,maxMin:MVP_ANTI.maxMin}:(S.anti||{minSec:12,maxMin:3});}
/** Boot/import only: a backup with settings.mvp=false must not disable MVP lock-downs.
 *  ?dev=1 can still flip MVP off in-session via #mvpTgl; the next reload forces it back on. */
function mvpForceOn(){
  if(SET.mvp!==false)return false;
  SET.mvp=true;return true;
}
/** MVP: overwrite persisted goal / anti / devMoney with the fixed values. true if S changed. */
function mvpEnforce(){
  if(!isMvp())return false;
  let ch=false;
  if(S.goal!==MVP_GOAL){S.goal=MVP_GOAL;ch=true;}
  if(!S.anti||typeof S.anti!=='object'){S.anti={minSec:12,maxMin:3,v:2};ch=true;}
  if(S.anti.minSec!==MVP_ANTI.minSec){S.anti.minSec=MVP_ANTI.minSec;ch=true;}
  if(S.anti.maxMin!==MVP_ANTI.maxMin){S.anti.maxMin=MVP_ANTI.maxMin;ch=true;}
  if(S.devMoney!==false){S.devMoney=false;ch=true;} /* field kept (contract: old fields are never deleted), ∞ money is gone */
  return ch;
}
/* ?dev=1 shows the MVP switch and «Тест-режим» (body.dev; .dev-only is hidden otherwise) */
const RQ_DEV=/[?&]dev=1(?:&|$)/.test(location.search);
document.body.classList.toggle('dev',RQ_DEV);
function applyMvpChrome(){
  document.body.classList.toggle('mvp', isMvp());
  const bn=el('botnav');
  if(bn){
    /* 20.10 (Джессика: «нажимаю на Путь, а внизу не меняется»): one tab lit = the tab that owns the visible screen.
       Was: «Библиотека» lit on every screen but «Профиль», and «Путь»/«Приключения» had no screens listed. */
    const onRew=!!(el('rewardsSheet')&&el('rewardsSheet').classList.contains('open'));
    const OWN={library:'library',path:'path',adv:'adv',diary:'diary',profile:'profile',stats:'profile',quests:'quests', /* 18.10: statistics belong to «Профиль» */
      quotes:'diary',vocab:'diary',calendar:'profile',achievements:'profile',shelfScreen:'profile',look:'look'}; /* 26.10: «Инвентарь» = вкладки «Дневников» */ /* settings is not a tab → nothing lit (14.10) */
    const cur=(typeof SCREENS!=='undefined'?SCREENS:[]).find(function(s){return el(s)&&!el(s).classList.contains('hidden');});
    const tab=onRew?'rewards':(OWN[cur]||'');
    bn.querySelectorAll('.botnav-btn').forEach(function(b){const id=b.dataset.nav||{bnLib:'library',bnRew:'rewards',bnProf:'profile'}[b.id];b.classList.toggle('on',!!id&&id===tab);});
  }
  /* tiny avatar on library streak */
  const ava=el('streakAva');
  if(ava){
    if(isMvp()){
      ava.style.display='inline-flex';
      try{
        if(typeof isPencil==='function'&&isPencil())ava.innerHTML=rqIcon('user-round',18);
        else if(S.useChar!==false&&typeof avatarSvg==='function')ava.innerHTML=avatarSvg();
        else if(S.avatar)ava.textContent=S.avatar;else ava.innerHTML=rqIcon('user-round',18);
      }catch(e){ava.innerHTML=rqIcon('user-round',18);}
    }else ava.style.display='none';
  }
  rqNavFade();
}
/* 25.10 (Джессика: «квадратики налезают на щит»): page content fades out just above the bottom bar, so no card runs into the raised «Читать»
   (щит, звезда, бабочка). The band = bar top + bump + a soft edge, measured here: skins move the bar (Небесный floats) and size the bump. */
let rqNavFadeOn=false;
function rqNavFade(){
  const bn=el('botnav'),root=document.documentElement;
  if(!bn)return;
  if(!rqNavFadeOn){rqNavFadeOn=true;
    const again=function(){requestAnimationFrame(rqNavFade);};
    try{new ResizeObserver(again).observe(bn);}catch(e){}
    try{new MutationObserver(again).observe(root,{attributes:true,attributeFilter:['data-skin','data-theme']});}catch(e){}
    window.addEventListener('resize',again);}
  const d=bn.querySelector('.brd'),r=bn.getBoundingClientRect();
  if(getComputedStyle(bn).display==='none'||!r.height){root.style.setProperty('--rq-bnfade','0px');root.style.setProperty('--rq-bnsoft','0px');return;}
  const bump=d?Math.max(0,r.top-d.getBoundingClientRect().top):0;
  root.style.setProperty('--rq-bnfade',Math.round(innerHeight-r.top+(bump?bump+6:0))+'px');
  root.style.setProperty('--rq-bnsoft','22px');
}
function weekKey(d){
  if(window.__rqGame&&window.__rqGame.weekStartOf)return window.__rqGame.weekStartOf(d||today());
  const x=new Date((d||today())+'T12:00:00');
  const day=(x.getDay()+6)%7; // Mon=0
  const mon=new Date(x);mon.setDate(x.getDate()-day);
  const y=mon.getFullYear(),m=String(mon.getMonth()+1).padStart(2,'0'),dd=String(mon.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+dd;
}
/* ===== sessions[] = single source of truth for minutes / XP / daily / weekly =====
   SESS mirrors IDB sessions[] (loaded at boot, appended by closeReader). */
let SESS=[];
/* whole minutes of a local day — game-awards dayMinutes (Math.floor of the sum), the ONE rule for streak, «N / 10»,
   week, gold, quests. `live` = counted minutes of the running session (day bar), counted as one more row. */
function dayMin(key,live){const G=window.__rqGame;if(!G||!G.dayMinutes)return 0;return G.dayMinutes(live?SESS.concat([{date:key,minutes:live}]):SESS,key);}
function minTodaySess(){return dayMin(today());}
function daysInWeekAtGoal(minNeed,wk){
  const need=minNeed!=null?minNeed:goalMin();
  wk=wk||weekKey(today());
  const days=window.__rqGame?window.__rqGame.daysAtGoalInWeek(SESS,wk,need):[];
  return {count:days.length,days:days,need:need,week:wk};
}
/** Award every sessions[] row not yet in game.awardedSessionIds (idempotent):
    XP = 10 × (dayMinutes after − before) per row (game-awards xpForSession, stored as row.xp), and AUTO daily +30 / weekly +120 for the (local) days of exactly
    these rows (game.dailyPaidDays / game.weeklyPaidWeeks). No claim button. */
/* ===== Сложность книги (Джессика 19.10; game-awards.js LEVELS, arch.md) =====
   Only on the test site for now (like achievements v2): RQ_LVL_NS. Off → no level is passed to the tracker, rows carry no lvl,
   so XP and coins are exactly the old ones. */
const RQ_LVL_NS=['rqt'];
/* ===== Честное чтение (Джессика 25.10 «Давай все кроме 3 и 6»; game-awards.js, reader-session.js honest, arch.md) =====
   Test site only for now (RQ_HONEST_NS). Off → the tracker gets no `honest`, the 12 s floor stays, rows carry no fl/ct/rr/hon. */
const RQ_HONEST_NS=['rqt'];
function honestOn(){return isMvp()&&RQ_HONEST_NS.indexOf(window.RQ_NS)>=0&&!!window.__rqGame;}
/** span [from, to] of page p of the open book (0…1); null while the page count is unknown */
function honestSpan(p){const n=R&&R.pageCount;if(!(n>1)||!(p>=0)||p>=n)return null;return [p/n,(p+1)/n];}
/** tracker options of the honest rules for book b: own floor (s), tail (s), spans read before, honesty factor */
function honestOpts(b){
  const G=window.__rqGame,rows=SESS||[],id=b&&b.id,hi=G.honestyIndex(rows,today());
  return {floorSec:G.paceFloorSec(rows,id),honest:{tailMs:G.tailSec(rows,id)*1000,span:honestSpan,seen:(S.readSpans||{})[id]||[],hon:hi.f}};
}
function lvlOn(){return isMvp()&&RQ_LVL_NS.indexOf(window.RQ_NS)>=0&&!!window.__rqGame;}
/* 25.10 «Фокус» (помодоро, тихий режим, звуки, вызовы недели — js/focus.js): only on the test site for now, like the book level */
const RQ_FOCUS_NS=['rqt'];
function focusOn(){return isMvp()&&RQ_FOCUS_NS.indexOf(window.RQ_NS)>=0&&!!window.__rqGame;}
const __lvlAuto={}; /* id → {k, l}: automatic level, recomputed only when the text changes (length as the key) */
function bookLvlAuto(b){
  if(!b||!window.__rqGame)return 0;
  const ai=((S.bookLvlAi||{})[b.id]||{}).l;
  const k=(b.text?b.text.length:0)+'|'+(b.author||'')+'|'+(b.genre||'')+'|'+(b.title||'')+'|'+b.lvlText+'|'+SESS.length+'|'+ai,c=__lvlAuto[b.id];
  if(c&&c.k===k)return c.l;
  const G=window.__rqGame;let l=0,r=0;
  try{l=G.autoLevel(b);r=bookPaceRatio(b);l=Math.max(l,G.paceAutoLevel(r),Number.isInteger(ai)?ai:0);}catch(e){console.warn('[rq] level',e);}
  __lvlAuto[b.id]={k:k,l:l,r:r};return l;
}
/* 22.10: the reader's pace on this book against their other books of the same kind (game-awards.js paceRatio) */
function bookPaceRatio(b){
  const pdf={};BOOKS.concat(S.userBooks||[]).forEach(function(x){pdf[x.id]=x.type==='pdf';});
  const me=b.type==='pdf',mine=[],base=[];
  (SESS||[]).forEach(function(r){if(!r)return;if(r.bookId===b.id)mine.push(r);else if(r.bookId in pdf&&pdf[r.bookId]===me)base.push(r);});
  return window.__rqGame.paceRatio(mine,base);
}
/** why the automatic level is what it is (card note): pace ratio and the neural network's verdict */
function bookLvlWhy(b){bookLvlAuto(b);const c=__lvlAuto[b.id]||{};return {r:c.r||0,pace:window.__rqGame.paceAutoLevel(c.r||0),ai:(S.bookLvlAi||{})[b.id]||null};}
/** PDF (Джессика 19.10 «Давай чтение по ПДФ»): text of up to 12 pages → level 0…LVL_MAX (game-awards textLevel); scans → 0. */
async function pdfTextLevel(doc,alive){
  const G=window.__rqGame,parts=[];
  for(const n of G.pdfSamplePages(doc.numPages,12)){
    if(alive&&!alive())return null; /* book closed: its document is gone, an empty sample would read as «Обычная» */
    try{const pg=await doc.getPage(n);const tc=await pg.getTextContent();parts.push(tc.items.map(function(x){return x.str||'';}).join(' '));}catch(e){}
  }
  if(alive&&!alive())return null;
  const txt=parts.join('\n'),withText=parts.filter(function(p){return p.replace(/\s+/g,'').length>200;}),
    cpp=withText.length?withText.reduce(function(a,p){return a+p.replace(/\s+/g,' ').length;},0)/withText.length:0;
  /* 22.10 (Джессика: Деррида-скан вышел «Обычной»): a scan has no text layer, so the PDF's own author/title/subject/keywords count too */
  let md=0;try{const m=await doc.getMetadata(),i=(m&&m.info)||{};md=Math.max(G.authorLevel(i.Author),G.titleLevel([i.Title,i.Subject,i.Keywords].filter(Boolean).join(' ')));}catch(e){}
  if(alive&&!alive())return null;
  /* 23.10: {l, w}: w = words in the sample (≈ 0 → a scan without text; the card says so, «признаки спорят») */
  return {l:Math.max(G.textLevel(txt,{cpp:cpp}),md),w:(txt.match(/\p{L}+/gu)||[]).length};
}
/** once per PDF card (and once more per new LVL_ALGO): store lvlText + lvlV (arch.md), one save(); then the open session (if this book) gets the new level */
async function pdfLvlCheck(b,doc){
  if(!b||b.type!=='pdf'||!lvlOn())return;
  const V=window.__rqGame.LVL_ALGO;
  if(Number.isInteger(b.lvlText)&&b.lvlV===V)return; /* 21.10: an older rule's result is re-checked once */
  await new Promise(function(r){setTimeout(r,1500);}); /* after the first page is drawn */
  let r=null;try{r=await pdfTextLevel(doc,function(){return R.book===b&&R.pdf===doc;});}catch(e){console.warn('[rq] pdf level',e);return;}
  if(r==null||(Number.isInteger(b.lvlText)&&b.lvlV===V))return;
  b.lvlText=r.l;b.lvlWords=r.w;b.lvlV=V;save();
  if(R&&R.book===b&&__tracker&&__tracker.setLevel){const o=trackerOpts();__tracker.setLevel(o.level,o.capMs);}
}
/** level that pays: automatic, lowered by the reader's choice; 0 while the feature is off */
function bookLvlOf(b){if(!b||!lvlOn())return 0;return window.__rqGame.effLevel(bookLvlAuto(b),(S.bookLvl||{})[b.id]);}
/* 21.10 (Джессика: «название которых в каждом скине разное»): the level names of a shop skin, LEVELS order; no skin → LEVELS[i].n */
const LVL_SKIN_NAMES={
  pencil:['Набросок','Этюд','Штудия','Мастер-класс','Шедевр'],
  ellada:['Смертный','Герой','Полубог','Титан','Олимп'],
  babochkovyi:['Гусеница','Куколка','Бабочка','Махаон','Монарх'],
  celestial:['Звезда','Созвездие','Туманность','Галактика','Вселенная']
};
function lvlName(i){const L=window.__rqGame&&window.__rqGame.LEVELS;if(!L||!L[i])return '';const a=LVL_SKIN_NAMES[document.documentElement.dataset.skin||''];return (a&&a[i])||L[i].n;}
function awardPendingSessions(){
  if(!window.__rqGame)return {xp:0,byId:{},ids:[],gold:0,daily:[],weekly:[],lvlGold:0};
  const G=window.__rqGame;
  const res=G.applySessionAwards(S,SESS); /* XP per row = 10 × whole-minute step of its day (xpForSession), stored as row.xp */
  const fresh=SESS.filter(function(r){return r&&res.ids.indexOf(r.id)>=0;});
  if(__rq&&__rq.setSessionXp)fresh.forEach(function(r){__rq.setSessionXp(r.id,r.xp).catch(function(e){console.warn('[rq] setSessionXp',e);});});
  const q=G.applyQuestAwards(S,SESS,fresh,{goal:goalMin()});
  res.gold=q.gold;res.daily=q.daily;res.weekly=q.weekly;
  /* level bonus: rows carry lvl only when lvlOn() was true at the session start, so no gate is needed here */
  const lv=G.applyLevelAwards?G.applyLevelAwards(S,SESS,fresh):{gold:0};
  res.lvlGold=lv.gold;res.gold+=lv.gold;
  /* 25.10 «Фокус»: rows carry pomo only when focusOn() was true while reading */
  const fc=G.applyFocusAwards?G.applyFocusAwards(S,SESS,fresh):{gold:0,pomoGold:0,chalGold:0,chal:[]};
  res.pomoGold=fc.pomoGold;res.chalGold=fc.chalGold;res.chal=fc.chal;res.gold+=fc.gold;
  if(res.ids.length||res.gold)save();
  return res;
}
function dailyPaid(day){return (S.dailyPaidDays||[]).indexOf(day||today())>=0;}
function weeklyPaid(wk){return (S.weeklyPaidWeeks||[]).indexOf(wk||weekKey(today()))>=0;}
function mvpDailyProg(day){const g=goalMin();return Math.min(1,dayMin(day||today())/g);}
/** ONE function for whole counted minutes of a day (summary, quests, reader counter «7 / 10 мин»). */
function dayMinFloor(day,live){return Math.floor(dayMin(day||today(),live));}
/** Streak soft floor (Маня 15.10: 3 min, was 2): a day keeps the streak at ≥ 3 counted minutes; the daily goal (10) is separate.
    atRisk + hint use the same number. */
const STREAK_MIN=3;
function streakAtRisk(day){const k=day||today();const m=isMvp()?dayMin(k):(((S.hist||{})[k]||{}).min||0);return S.streak>0&&m<STREAK_MIN;}
function mvpDailyInfo(day,live){return dayMinFloor(day,live)+' / '+goalMin()+' мин';} /* floor: never «10 / 10» before the goal is met */
function mvpWeeklyProg(wk){const w=daysInWeekAtGoal(goalMin(),wk);return Math.min(1,w.count/4);}
function mvpWeeklyInfo(wk){const w=daysInWeekAtGoal(goalMin(),wk);return Math.min(4,w.count)+' / 4 дня';}
function renderMvpQuests(){
  /* Status only — daily/weekly gold is paid automatically on the session summary */
  const box=el('mvpQuestBox');if(!box)return;
  const dDone=dailyPaid(), dP=dDone?1:mvpDailyProg();
  const wDone=weeklyPaid(), wP=wDone?1:mvpWeeklyProg();
  box.innerHTML=
    '<div class="pcard mvp-quest" id="mvpDailyCard"><div class="row"><span style="font-size:14px"><span>Ежедневка +'+coinsP(30)+'</span></span><div class="spacer"></div>'+
      '<span class="chip" style="white-space:nowrap">'+(dDone?'✓ выполнено сегодня':mvpDailyInfo())+'</span>'+
    '</div><div class="pbar"><i style="width:'+Math.round(dP*100)+'%"></i></div></div>'+
    '<div class="pcard mvp-quest" id="mvpWeeklyCard"><div class="row"><span style="font-size:14px"><span>Неделя +'+coinsP(120)+'</span></span><div class="spacer"></div>'+
      '<span class="chip" style="white-space:nowrap">'+mvpWeeklyInfo()+'</span>'+
    '</div><div class="pbar"><i style="width:'+Math.round(wP*100)+'%"></i></div>'+
      '<div class="mvp-qsub">'+(wDone?'✓ неделя выполнена':('4 дня по '+goalMin()+' мин за пн–вс'))+'</div></div>';
}
function renderMvpProfile(){
  if(el('mvpGold')){el('mvpGold').textContent=goldDisp();const gl=el('mvpGoldLbl');if(gl)gl.textContent=coinsP(goldDisp()).replace(/^\S+ /,'');}
  if(el('mvpStreak'))el('mvpStreak').textContent=S.streak||0;
  if(el('mvpMinToday'))el('mvpMinToday').textContent=Math.floor(minTodaySess());
  renderMvpQuests();
}
function clearConfetti(){
  document.querySelectorAll('.confetti').forEach(function(n){try{n.remove();}catch(e){}});
}
function clearToasts(){
  document.querySelectorAll('.rq-toast').forEach(function(n){try{n.remove();}catch(e){}});
}
/* 17.10: «Награды» = «Из жизни» only; the skin shop lives on «Внешний вид». 'shop' → that screen */
function setRewardsTab(t){if(t==='shop'){closeRewardsSheet();openLook(true);return;}renderRewardsSheet();}
function openRewardsSheet(tab){
  if(tab==='shop'){openLook(true);return;}
  clearConfetti();clearToasts();
  renderRewardsSheet();
  {const sc=document.querySelector('#rewardsSheet .rewscroll');if(sc)sc.scrollTop=0;} /* always opens at the top */
  el('rewardsSheet').classList.add('open');document.body.classList.add('rew-open');
  applyMvpChrome(); /* bottom nav: «Награды» selected */
}
function closeRewardsSheet(){
  try{closeShopDetail();}catch(e){} /* примерка ends when the shop closes */
  el('rewardsSheet').classList.remove('open');document.body.classList.remove('rew-open');
  applyMvpChrome();
}
function ensureMvpRewards(){
  if(!S.rewards||!S.rewards.length){
    S.rewards=[
      {name:'Кофе',tier:'small',cost:100,bought:0},
      {name:'Серия сериала',tier:'small',cost:100,bought:0},
      {name:'',tier:'small',cost:100,bought:0,placeholder:true}
    ];
  }
  S.rewards.forEach(function(r){
    if(!r.tier)r.tier=(r.cost>=500?'big':(r.cost>=250?'mid':'small'));
    r.cost=REWARD_TIERS[r.tier]||100;
  });
  S.rewardPurchases=S.rewardPurchases||[];
}
function renderRewardsSheet(){
  ensureMvpRewards();
  if(el('rewBalance'))el('rewBalance').textContent=coinsP(S.gold); /* one balance for both tabs, text only */
  try{renderShopPane();}catch(e){console.warn('[rq] shop',e);}
  const box=el('rewSlots');if(!box)return;
  box.innerHTML=S.rewards.map(function(r,i){
    const label=r.name&&r.name.trim()?esc(r.name):(r.placeholder?'Назови награду…':'Без названия');
    const tiers=['small','mid','big'].map(function(t){
      return '<button type="button" class="'+(r.tier===t?'on':'')+'" onclick="setRewardTier('+i+',\''+t+'\')">'+REWARD_TIER_LABELS[t]+'</button>';
    }).join('');
    return '<div class="pcard" style="margin-bottom:10px">'+
      '<div class="row" style="gap:8px;align-items:center">'+
        '<input class="searchinp" style="flex:1;margin:0" value="'+esc(r.name||'')+'" placeholder="Название" onchange="renameRewardSlot('+i+',this.value)">'+
        '<button class="buy" '+(canAfford(r.cost)&&r.name&&r.name.trim()?'':'disabled')+' onclick="buyRewardTier('+i+')">'+coinsP(r.cost)+'</button>'+
      '</div>'+
      '<div class="tierseg">'+tiers+'</div>'+
      '<div class="row" style="font-size:12px;color:var(--muted)"><span>получено: '+(r.bought||0)+'</span><div class="spacer"></div>'+
        (S.rewards.length>1?'<button class="lnk danger" onclick="delRewardSlot('+i+')">удалить</button>':'')+
      '</div></div>';
  }).join('');
  const hist=el('rewHist');
  if(hist){
    const rows=(S.rewardPurchases||[]).slice().reverse().slice(0,12);
    hist.innerHTML=rows.length?rows.map(function(h){
      const when=h.at?localDay(h.at):''; /* stored ISO stamp, shown as the local day */
      return '<li>'+esc(when)+' · '+esc(h.title||'')+' −'+coinsP(h.price||0)+'</li>';
    }).join(''):'<li>Пока пусто — купите награду за монеты с квестов</li>';
  }
}
function setRewardTier(i,t){
  ensureMvpRewards();const r=S.rewards[i];if(!r||!REWARD_TIERS[t])return;
  r.tier=t;r.cost=REWARD_TIERS[t];save();renderRewardsSheet();
}
function renameRewardSlot(i,name){
  ensureMvpRewards();const r=S.rewards[i];if(!r)return;
  r.name=(name||'').trim().slice(0,60);r.placeholder=!r.name;save();renderRewardsSheet();
}
async function delRewardSlot(i){
  ensureMvpRewards();if(S.rewards.length<=1)return;
  const nm=(S.rewards[i]&&S.rewards[i].name)||'';
  if(!await rqAsk({t:nm?'Удалить награду «'+nm+'»?':'Удалить пустой слот?',ok:'Удалить',danger:true}))return;S.rewards.splice(i,1);save();renderRewardsSheet();
}
function buyRewardTier(i){
  ensureMvpRewards();const r=S.rewards[i];if(!r||!r.name||!r.name.trim()){flashMsg('Сначала назовите награду');return;}
  r.cost=REWARD_TIERS[r.tier]||r.cost;if(!canAfford(r.cost))return;
  spend(r.cost);r.bought=(r.bought||0)+1;
  S.rewardPurchases=S.rewardPurchases||[];
  S.rewardPurchases.push({id:'rp_'+Date.now()+'_'+i, title:r.name, price:r.cost, at:new Date().toISOString()});
  save();try{confettiReward();}catch(e){}flashMsg('«'+r.name+'» — ваша!');renderRewardsSheet();renderMvpProfile();
  if(!isMvp())renderShop();
}
function addRewardSlot(){
  ensureMvpRewards();
  if(S.rewards.length>=5){flashMsg('Максимум 5 слотов');return;}
  S.rewards.push({name:'',tier:'small',cost:100,bought:0,placeholder:true});save();renderRewardsSheet();
}

/* Collapsible option list (14.10): one 52px row «label · current value ⌄»; tap expands inline; picking an option applies it and collapses.
   Open state lives in memory only (RQ_EXP), nothing is written. valueFn reads the current value from the list itself. */
const RQ_EXP={};
function rqCollapse(boxId,label,valueFn,rowId,opt){
  const box=el(boxId);if(!box)return;rowId=rowId||(boxId+'X');box.dataset.xrow=rowId;let row=el(rowId);
  if(!row){row=document.createElement('button');row.type='button';row.id=rowId;row.className='xrow';row.setAttribute('aria-controls',boxId);
    box.parentNode.insertBefore(row,box);
    row.onclick=function(){RQ_EXP[boxId]=!RQ_EXP[boxId];rqCollapseSync(boxId);};
    box.addEventListener('click',function(e){if(e.target.closest('button')&&RQ_EXP[boxId]){RQ_EXP[boxId]=false;setTimeout(function(){rqCollapseSync(boxId);},0);}});
    row._label=label;row._val=valueFn;row._opt=opt||{};}
  rqCollapseSync(boxId);
}
function rqCollapseSync(boxId){const box=el(boxId),row=box&&el(box.dataset.xrow||boxId+'X');if(!box||!row)return;const open=!!RQ_EXP[boxId];
  let v='';try{v=row._val()||'';}catch(e){}
  const o=row._opt||{};let dot='';try{dot=o.dot?o.dot():'';}catch(e){}
  const ic=o.icon?rqIcon(o.icon,22):'';let sub='';try{sub=o.sub?o.sub():'';}catch(e){}
  let di='';try{di=o.dotIcon?o.dotIcon():'';}catch(e){}
  const dotH=dot?'<span class="xdot'+(di?' xdot-skin':'')+'" aria-hidden="true" style="background:'+dot+'">'+(di?rqIcon(di,14):'')+'</span>':'';
  const head=o.title?'<span class="xlab"><span class="xt">'+esc(o.title)+'</span>'+(sub?'<span class="xsub">'+esc(sub)+'</span>':'')+'</span>':'';
  const sample=o.sample?'<span class="xs" aria-hidden="true">'+esc(o.sample)+'</span>':'';
  /* layout (Интерфейс 14.10): [icon | sample] [title+sub | label] … [dot] value ⌄ */
  /* opt.pill (20.10, «Настройки чтения»): value + chevron in their own plaque on the right, like the steppers' «− 14 +» */
  const tail='<span class="xv">'+esc(v)+'</span>'+rqIcon(open?'chevron-up':'chevron-down',20);
  row.innerHTML=ic+sample+head+(row._label?'<span class="xl">'+esc(row._label)+'</span>':'')+(o.title?'':dotH)+(o.pill?'<span class="xpill">'+tail+'</span>':tail);
  if(o.title&&dot){row.querySelector('.xv').insertAdjacentHTML('beforebegin',dotH);}
  try{if(o.font){const ff=o.font();row.querySelector('.xv').style.fontFamily=ff;const xs=row.querySelector('.xs');if(xs)xs.style.fontFamily=ff;}}catch(e){}
  row.setAttribute('aria-expanded',open?'true':'false');box.hidden=!open;box.classList.add('xlist');}
