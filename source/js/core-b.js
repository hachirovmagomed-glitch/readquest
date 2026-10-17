'use strict';
const STATS_BASE=['Интеллект','Мудрость','Харизма','Воображение','Воля'];
const BADGES=[
 {id:'first',icon:'👣',ic:'footprints',name:'Первые шаги',desc:'Первая сессия чтения'},
 {id:'owl',icon:'🦉',ic:'moon',name:'Ночная сова',desc:'Чтение после 23:00'},
 {id:'lark',icon:'🐦',ic:'sunrise',name:'Жаворонок',desc:'Чтение до 8:00'},
 {id:'marathon',icon:'🏃',ic:'timer',name:'Марафонец',desc:'Сессия 30+ минут'},
 {id:'streak3',icon:'🔥',ic:'flame',name:'Огонёк',desc:'Стрик 3 дня'},
 {id:'streak7',icon:'⚡',ic:'zap',name:'Неделя силы',desc:'Стрик 7 дней'},
 {id:'finisher',icon:'🏁',ic:'flag',name:'Финишер',desc:'Дочитать книгу до конца'},
 {id:'lvl5',icon:'🛡️',ic:'shield',name:'Ветеран',desc:'Достичь 5 уровня'},
 {id:'collector',icon:'📦',ic:'package',name:'Коллекционер',desc:'Добавить свою книгу'}
];
const THEMES={
 light:{name:'Светлая',bg:'#f7f5f0',txt:'#26241f'},
 sepia:{name:'Сепия',bg:'#f4ecd8',txt:'#5b4636'},
 dark:{name:'Тёмная',bg:'#1e1e24',txt:'#cfcfd8'},
 black:{name:'AMOLED',bg:'#000000',txt:'#9a9aa3'},
 pencil:{name:'Карандашный',bg:'#fbfaf6',txt:'#24231f',skin:'pencil'} /* 1в: 5th free theme, handoff/skins/karandashny (tokens.rq.css); the page stays flat */
};
/* day/night variants that have no swatch of their own (toggleDayNight swaps within the skin) */
const THEME_VARIANTS={'pencil-night':{name:'Карандашный',bg:'#262a31',txt:'#e3e0d8',skin:'pencil',night:true,base:'pencil'}};
/* shop skins with app styling (handoff/skins/<dir>/tokens.css → tokens.css, decor → skins/skins.css). Theme key = skin key, night = key+'-night'.
   bg/txt = the clean book page of the skin ([data-page] tokens). Rendered only while the skin is owned (else sepia, rq_set not rewritten). */
const SKIN_THEMES={
 ellada:{name:'Эллада',bg:'#fcf9f3',txt:'#1a1410',skin:'ellada',shop:'skin-ellada',icon:'amphora'},
 'ellada-night':{name:'Эллада',bg:'#100d0b',txt:'#ebe0d2',skin:'ellada',shop:'skin-ellada',icon:'amphora',night:true,base:'ellada'},
 babochkovyi:{name:'Бабочковый',bg:'#fcfbf8',txt:'#1d2140',skin:'babochkovyi',shop:'skin-babochkovyi',icon:'flower-2'},
 'babochkovyi-night':{name:'Бабочковый',bg:'#0e1019',txt:'#e4e6ef',skin:'babochkovyi',shop:'skin-babochkovyi',icon:'flower-2',night:true,base:'babochkovyi'}
};
function themeBase(k){const v=THEME_VARIANTS[k]||SKIN_THEMES[k];return v&&v.base?v.base:k;}
/** owned shop skin theme for a saved key, else null (unknown / not bought / not styled yet) */
function skinTheme(k){const t=SKIN_THEMES[k];return t&&typeof shopOwns==='function'&&shopOwns(t.shop)&&shopReady(t.shop)?t:null;}
/** day/night key of the same skin: 'pencil' ↔ 'pencil-night', 'ellada' ↔ 'ellada-night' */
function skinThemeKey(skin,night){return night?skin+'-night':skin;}
/** old (formerly paid) theme saved in rq_set — free since the shop build */
function ownedShopTheme(k){return (typeof OLD_THEMES!=='undefined'&&OLD_THEMES.find(x=>x.id===k))||null;} /* shop build: the 9 old themes are free */
/** theme actually rendered. 1в: a saved paid theme that is NOT owned renders the base theme (sepia); rq_set is NOT rewritten until the user picks another */
/** 1в: «Карандашный» is an APP-WIDE skin: all tokens.rq.css (--rq-*) on :root (html[data-skin=pencil], night: data-theme=night);
    any other reader theme removes both → app back to its own palette. Called at boot and from applySet. */
function syncThemeColor(){try{const c=getComputedStyle(document.body).backgroundColor,m=c.match(/\d+/g),mt=document.querySelector('meta[name=theme-color]');if(mt&&m&&m.length>=3)mt.content='#'+m.slice(0,3).map(function(x){return (+x).toString(16).padStart(2,'0');}).join('');}catch(e){}}
/* skin icon sets: the sprite symbols (#i-*) are redrawn for the worn skin, so every rqIcon/<use> on every screen follows it;
   leaving the skin restores the Lucide originals (cached on first swap). Same names = same meaning, layout untouched.
   «Эллада»: свиток, амфора, шлем, лира (настройки), копьё (назад), факел (серия), венок, Гелиос / Селена — our drawings, 24×24 stroke like Lucide. */
const SKIN_ICONS={ellada:{
 'book-open':'<path d="M6 4v16M18 4v16"/><path d="M4 4h4M4 20h4M16 4h4M16 20h4"/><path d="M6 7h12M6 17h12"/><path d="M9 10.5h6M9 13.5h4"/>',
 'library':'<path d="M6 4v16M18 4v16"/><path d="M4 4h4M4 20h4M16 4h4M16 20h4"/><path d="M6 7h12M6 17h12"/><path d="M9 10.5h6M9 13.5h4"/>',
 'gift':'<path d="M10 2v5.632c0 .424-.272.795-.653.982A6 6 0 0 0 6 14c.006 4 3 7 5 8"/><path d="M10 5H8a2 2 0 0 0 0 4h.68"/><path d="M14 2v5.632c0 .424.272.795.652.982A6 6 0 0 1 18 14c0 4-3 7-5 8"/><path d="M14 5h2a2 2 0 0 1 0 4h-.68"/><path d="M18 22H6"/><path d="M9 2h6"/>',
 'user-round':'<path d="M5 20v-8a7 7 0 0 1 14 0v2h-5v6"/><path d="M14 14v-2.5"/><path d="M7 5.5c2.5-3 7.5-3 10 0"/><path d="M5 20h9"/>',
 'settings':'<path d="M7 21h10"/><path d="M8 21c-3-4-3-9-1-13 .6-1.3.3-2.6-1-3.5"/><path d="M16 21c3-4 3-9 1-13-.6-1.3-.3-2.6 1-3.5"/><path d="M7 8h10"/><path d="M10 8v11M12 8v11M14 8v11"/>',
 'menu':'<path d="M4 6h16M4 12h16M4 18h16"/><path d="M4 4.5v3M20 4.5v3M4 16.5v3M20 16.5v3"/>',
 'search':'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 13h5v-4H9.5v2"/>',
 'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 1.5l1.3 3h-2.6zM12 22.5l1.3-3h-2.6zM1.5 12l3 1.3v-2.6zM22.5 12l-3 1.3v-2.6z"/><path d="M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
 'moon':'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 2.5v4M17 4.5h4"/>',
 'bookmark':'<path d="M6 3h12v18l-6-4-6 4z"/><path d="M12 6.5c2 1.2 2 4 0 6-2-2-2-4.8 0-6z"/>',
 'list':'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 4.5h3v3h-3zM3.5 10.5h3v3h-3zM3.5 16.5h3v3h-3z"/>',
 'flame':'<path d="M12 2c3 3 3.5 5.5 2.5 7.5h-5C8.5 7.5 9 5 12 2z"/><path d="M8.5 9.5h7"/><path d="M9.5 9.5 11 22h2l1.5-12.5"/>',
 'trophy':'<path d="M12 21c-5 0-8-4-8-9 0-2 .5-4 1.5-5.5M12 21c5 0 8-4 8-9 0-2-.5-4-1.5-5.5"/><path d="M5 12 3 11M5.5 16l-2 .5M19 12l2-1M18.5 16l2 .5M6 8.5 4.2 7M18 8.5 19.8 7"/><path d="M10 21l2 2 2-2"/>',
 'arrow-left':'<path d="M21 12H8"/><path d="M3 12l5-3.5c-.7 2.3-.7 4.7 0 7z"/>'
}};
const SKIN_ICONS_BB={
 'gift':'<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"/><circle cx="12" cy="8" r="2"/><path d="M12 10v12"/><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"/><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"/>', /* «Цветник» */
 'trophy':'<circle cx="12" cy="12" r="3"/><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"/><path d="M12 7.5V9"/><path d="M7.5 12H9"/><path d="M16.5 12H15"/><path d="M12 16.5V15"/><path d="m8 8 1.88 1.88"/><path d="M14.12 9.88 16 8"/><path d="m8 16 1.88-1.88"/><path d="M14.12 14.12 16 16"/>',
 'flame':'<path d="M12 8v12"/><path d="M12 9C10 5 6.5 3 4.5 4.5 2.8 6 3.6 10 7 11.5 4.6 12.6 4.2 16 6.6 17.4 9 18.8 11 16 12 13"/><path d="M12 9c2-4 5.5-6 7.5-4.5 1.7 1.5.9 5.5-2.5 7 2.4 1.1 2.8 4.5.4 5.9-2.4 1.4-4.4-1.4-5.4-4.4"/><path d="M12 8 10.5 4.5M12 8l1.5-3.5"/>', /* серия = бабочка */
 'star':'<path d="M12 2v3"/><path d="M12 5c-4 2-4.5 11 0 17 4.5-6 4-15 0-17z"/><path d="M9.2 10.5Q12 12 14.8 10.5M8.8 14.5Q12 16 15.2 14.5"/>', /* уровень = кокон */
 'user-round':'<circle cx="12" cy="14" r="6"/><path d="M10 8.5 7.5 3.5M14 8.5l2.5-5"/><path d="M6.5 3.5h2M15.5 3.5h2"/><path d="M4 12c-2-1-2.5-4 0-5 1.5.5 2.5 2 2.8 3.5M20 12c2-1 2.5-4 0-5-1.5.5-2.5 2-2.8 3.5"/>' /* маскот «Пыльца» */
};
SKIN_ICONS.babochkovyi=SKIN_ICONS_BB; /* «Бабочковый»: цветник, цветок, бабочка, кокон, шелкопряд (flower/flower-2 = Lucide, the rest our drawings) */
const SKIN_ICONS_ORIG={};
function applySkinIcons(skin){
  const set=SKIN_ICONS[skin]||{};
  Object.keys(SKIN_ICONS).forEach(function(k){Object.keys(SKIN_ICONS[k]).forEach(function(n){
    const sym=document.getElementById('i-'+n);if(!sym)return;
    if(!(n in SKIN_ICONS_ORIG))SKIN_ICONS_ORIG[n]=sym.innerHTML;
    const want=set[n]||SKIN_ICONS_ORIG[n];if(sym.innerHTML!==want)sym.innerHTML=want;});});
}
function applySkin(){setTimeout(syncThemeColor,0);
  const t=activeTheme(),h=document.documentElement;
  if(t.skin){h.dataset.skin=t.skin;if(t.night)h.dataset.theme='night';else delete h.dataset.theme;}
  else if(h.dataset.skin){delete h.dataset.skin;delete h.dataset.theme;}
  applySkinIcons(t.skin||'');
  const lt=document.getElementById('libTitle');if(lt)lt.textContent='Библиотека'; /* «Карандашный»: mockup title */
  const sk=t.skin||'';if(applySkin._last!==undefined&&applySkin._last!==sk){try{if(typeof renderLibrary==='function')renderLibrary();}catch(e){} /* covers are skin-drawn: re-render even when the library is behind settings / the reader */}
  applySkin._last=sk;
  if(typeof pgArtSync==='function'){const a=document.getElementById('pgArt');if(a)a._w=0;try{pgArtSync();}catch(e){}}
}
/** «Карандашный» active (app-wide skin) — UI only: covers / avatar / summary / confetti draw Lucide instead of emoji */
function isPencil(){return document.documentElement.dataset.skin==='pencil';}
function skinOf(t){return (t&&t.skin)||'default';}
/** theme_changed {from,to} — only when the SKIN changes (day/night inside a skin, or between plain page themes, does not emit) */
function logSkinChange(from){const to=skinOf(activeTheme());if(from===to)return;try{if(__rq&&__rq.logAnalyticsEvent&&window.__rqWriter&&__rqWriter.mayWrite())__rq.logAnalyticsEvent({type:'theme_changed',from:from,to:to}).catch(function(){});}catch(e){}}
function activeTheme(){return THEMES[SET.theme]||THEME_VARIANTS[SET.theme]||skinTheme(SET.theme)||ownedShopTheme(SET.theme)||THEMES.sepia;}
const FONTS=[
 {label:'Georgia',v:'Georgia, serif'},
 {label:'Times',v:'"Times New Roman", Times, serif'},
 {label:'Palatino',v:'"Palatino Linotype","Book Antiqua",Palatino,serif'},
 {label:'Garamond',v:'Garamond,"Times New Roman",serif'},
 {label:'Sans',v:'system-ui,"Segoe UI",Roboto,sans-serif'},
 {label:'Verdana',v:'Verdana,Geneva,sans-serif'},
 {label:'Trebuchet',v:'"Trebuchet MS",sans-serif'},
 {label:'Tahoma',v:'Tahoma,sans-serif'},
 {label:'Comic',v:'"Comic Sans MS","Comic Neue","Segoe UI",system-ui,sans-serif'}, /* 16.10: no «cursive» — on Android it is a Latin-only face: punctuation from it, Cyrillic from another font */
 {label:'Mono',v:'"Courier New",monospace'}
];

/* ================= СОСТОЯНИЕ ================= */
const DEF={xp:0,gold:0,streak:0,lastDay:null,goal:10,dayKey:null,minToday:0,sessions:0,totalMin:0,totalPages:0,
 stats:{Интеллект:0,Мудрость:0,Харизма:0,Воображение:0,Воля:0},badges:[],finished:[],progress:{},userBooks:[],
 quotes:{},hl:{},owned:[],claimed:{},rewards:null,stickers:{},cur:null,marks:{},favs:[],hidden:[],anti:null,
 hist:{},status:{},skills:null,avatar:null,ux:null,appTheme:'teal',bookStats:{},
 bookDiff:{},bookStat:{},covers:{},autoDiff:true,ai:null,
 planned:{},customQuests:[],customStats:[],bookImp:{},notif:null,awardedSessionIds:[],dailyPaidDays:[],weeklyPaidWeeks:[],paidMigrated:false};
/* Single-writer: state lives in rq_v1 + IDB after bootStorage(). Never write legacy `readquest`. */
let S=Object.assign({},DEF);
let __rq=null;          // storage API from module boot
let __tracker=null;     // reader-session tracker
const DEFAULT_SKILLS=['Концентрация','Дисциплина','Аналитика','Скорочтение'];
const DEFAULT_SKILL_LINKS={Концентрация:{Воля:100,Интеллект:30},Дисциплина:{Воля:100},Аналитика:{Интеллект:100,Мудрость:40},Скорочтение:{Интеллект:60}};
function hydrateS(raw){
  S=Object.assign({},DEF,raw||{});
  S.stats=Object.assign({},DEF.stats,S.stats||{});
  S.quotes=S.quotes||{};S.hl=S.hl||{};S.owned=S.owned||[];S.claimed=S.claimed||{};S.stickers=S.stickers||{};S.marks=S.marks||{};
  S.favs=S.favs||[];S.hidden=S.hidden||[];S.hist=S.hist||{};S.status=S.status||{};S.vocab=S.vocab||[];if(S.lastRead===undefined)S.lastRead=null;S.petXp=S.petXp||0;if(S.dailyClaim===undefined)S.dailyClaim=null;S.boss=S.boss||null;S.hourHist=(S.hourHist&&S.hourHist.length===24)?S.hourHist:new Array(24).fill(0);S.finishDates=S.finishDates||{};S.talents=S.talents||{};
  if(!S.anti)S.anti={minSec:12,maxMin:3,v:2};
  else if(!S.anti.v){S.anti.v=2;if(S.anti.maxMin===4)S.anti.maxMin=3;} /* Product: 3 min/page cap by default */
  S.awardedSessionIds=Array.isArray(S.awardedSessionIds)?S.awardedSessionIds:[];
  S.dailyPaidDays=Array.isArray(S.dailyPaidDays)?S.dailyPaidDays:[];S.weeklyPaidWeeks=Array.isArray(S.weeklyPaidWeeks)?S.weeklyPaidWeeks:[];
  if(!S.skills)S.skills={Концентрация:0,Дисциплина:0,Аналитика:0,Скорочтение:0};
  if(!S.ux)S.ux={anim:true,wake:false,vibe:true,scale:100};
  S.bookDiff=S.bookDiff||{};S.bookStat=S.bookStat||{};S.covers=S.covers||{};
  if(S.autoDiff===undefined)S.autoDiff=true;
  if(!S.ai)S.ai={key:'',model:'gpt-4o-mini'};
  if(!S.appTheme)S.appTheme='teal';
  S.bookStats=S.bookStats||{};
  /* S.cur (old currency picker) is kept as stored and unused — old fields are never deleted (audit 15.10) */
  if(!S.rewards||!S.rewards.length)S.rewards=[
    {name:'Кофе',tier:'small',cost:100,bought:0},
    {name:'Серия сериала',tier:'small',cost:100,bought:0},
    {name:'',tier:'small',cost:100,bought:0,placeholder:true}
  ];
  S.rewards.forEach(function(r){if(!r.tier){r.tier=r.cost>=500?'big':(r.cost>=250?'mid':'small');r.cost=REWARD_TIERS[r.tier]||r.cost;}});

  S.planned=S.planned||{};S.bookImp=S.bookImp||{};
  S.customQuests=S.customQuests||[];S.customStats=S.customStats||[];
  if(!S.notif)S.notif={on:false,time:'20:00'};
  S.customStats.forEach(s=>{if(S.stats[s]===undefined)S.stats[s]=0;});
  S.skillMeta=S.skillMeta||{};
  DEFAULT_SKILLS.forEach(k=>{if(S.skills[k]===undefined)S.skills[k]=0;if(!S.skillMeta[k])S.skillMeta[k]={links:Object.assign({},DEFAULT_SKILL_LINKS[k]||{})};});
  Object.keys(S.skills).forEach(k=>{if(!S.skillMeta[k])S.skillMeta[k]={links:{}};});
  S.customAch=S.customAch||[];S.achUnlocked=S.achUnlocked||[];
  if(S.xpMult===undefined)S.xpMult=1;
  S.goldAllTime=S.goldAllTime||0;
  S.inventory=S.inventory||[];S.invHist=S.invHist||[];
  S.rewardPurchases=S.rewardPurchases||[];
  S.rewardHist=S.rewardHist||[];
  if(S.rewardHist.length&&!S.rewardPurchases.length){
    S.rewardPurchases=S.rewardHist.map(function(h,i){return {id:h.id||('rp_legacy_'+i),title:h.title||h.name||'Награда',price:h.price!=null?h.price:(h.cost||0),at:h.at||(h.date?h.date+'T12:00:00.000Z':new Date().toISOString())};});
  }
  if(S.dailyClaimed==null&&S.dailyClaim)S.dailyClaimed=S.dailyClaim;
  if(S.weeklyClaimed===undefined)S.weeklyClaimed=null;

  if(!S.statuses)S.statuses=[[1,'Новичок'],[3,'Читатель'],[5,'Книжный странник'],[8,'Магистр'],[12,'Архимаг чтения']];
  if(!S.heroName)S.heroName='Читатель';
  if(S.pixelOwned===undefined)S.pixelOwned=false;
  if(S.pixelOn===undefined)S.pixelOn=false;
  if(!S.lang)S.lang='ru';
  if(S.hpMax===undefined)S.hpMax=50;
  if(S.hp===undefined||S.hp===null)S.hp=S.hpMax;
  S.ownedGear=S.ownedGear||[];
  S.equipped=S.equipped||{};
  S.devMoney=false; /* shop build: ∞ money removed; the field stays (old fields are never deleted) */
  S.shelfOrder=S.shelfOrder||[];
  if(S.useChar===undefined)S.useChar=true;
  S.char=S.char||{};
  /* Team lock: defaultMinutes 10 for fresh installs; keep user's stored goal otherwise */
  if(S.goal==null||S.goal===undefined)S.goal=10;
}
hydrateS({});
let saveWarned=false;
/** Single writer → rq_v1 via saveFlat (envelope only; book bodies are written once on add/import/migration). Never touches legacy `readquest`. */
function save(){
  if(window.__rqWriter&&!window.__rqWriter.mayWrite())return; /* passive window: never write */
  if(!__rq||!__rq.saveFlat){
    console.warn('[rq] save() before boot — skipped');
    return;
  }
  __rq.saveFlat(S).then(function(r){
    if(r&&r.ok===false){
      if(!saveWarned){saveWarned=true;try{alert('Не удалось сохранить прогресс (rq_v1). Сделайте экспорт в Настройках.');}catch(_){}}
    }else{saveWarned=false;}
  }).catch(function(e){
    console.warn('[rq] saveFlat failed',e);
    if(!saveWarned){saveWarned=true;try{alert('Не удалось сохранить прогресс.');}catch(_){}}
  });
}
function allStats(){return STATS_BASE.concat((S.customStats||[]).filter(s=>!STATS_BASE.includes(s)));}
/* === валюта (тест-режим) === */
function canAfford(c){return S.gold>=c;}
function spend(c){S.gold=Math.max(0,S.gold-c);}
function goldDisp(g){return Math.floor(Number(g===undefined?S.gold:g)||0);} /* one balance view: library header, drawer, profile — whole coins */
/* === экипировка героя === */
const GEAR_SLOTS={head:'Головной убор',body:'Костюм',weapon:'Оружие',feet:'Ботинки',pet:'Питомец',aura:'Аура',face:'Аксессуар',bg:'Фон'};
const GEAR_CATS=[['body','🥋 Костюмы'],['weapon','⚔️ Оружие'],['head','🎩 Головные уборы'],['feet','👢 Ботинки'],['deco','✨ Декорации'],['bg','🏞 Задний план']];
function catOf(slot){return (slot==='pet'||slot==='aura'||slot==='face')?'deco':slot;}
const SHOP_GEAR=[
 {id:'cape',name:'Плащ героя',icon:'🦸',slot:'body',cost:150,desc:'Развевается эпично'},
 {id:'armor',name:'Доспех воли',icon:'🛡️',slot:'body',cost:130,desc:'Латы против лени'},
 {id:'robe',name:'Мантия мага',icon:'🧙',slot:'body',cost:160,desc:'Фиолетовая, с золотом'},
 {id:'vest',name:'Зелёная туника',icon:'🥋',slot:'body',cost:90,desc:'Лёгкая и удобная'},
 {id:'sword',name:'Меч знаний',icon:'🗡️',slot:'weapon',cost:90,desc:'Рубит незнание'},
 {id:'staff',name:'Посох мудреца',icon:'🪄',slot:'weapon',cost:120,desc:'Магия чтения'},
 {id:'bow',name:'Лук пытливости',icon:'🏹',slot:'weapon',cost:110,desc:'Бьёт точно в суть'},
 {id:'hat',name:'Шляпа волшебника',icon:'🎩',slot:'head',cost:70,desc:'Стиль мудреца'},
 {id:'crown',name:'Корона прилежания',icon:'👑',slot:'head',cost:200,desc:'Для королей чтения'},
 {id:'helm',name:'Шлем фокуса',icon:'⛑️',slot:'head',cost:80,desc:'Защита концентрации'},
 {id:'cap',name:'Кепка',icon:'🧢',slot:'head',cost:50,desc:'Повседневный вид'},
 {id:'circlet',name:'Обруч эрудита',icon:'💫',slot:'head',cost:120,desc:'Тонкий золотой венец'},
 {id:'boots',name:'Кожаные сапоги',icon:'👢',slot:'feet',cost:50,desc:'Удобные в пути'},
 {id:'ironboots',name:'Латные сапоги',icon:'🥾',slot:'feet',cost:90,desc:'Тяжёлые, стальные'},
 {id:'sneakers',name:'Кеды',icon:'👟',slot:'feet',cost:60,desc:'Лёгкий шаг'},
 {id:'cat',name:'Кот-компаньон',icon:'🐱',slot:'pet',cost:60,desc:'Мурчит за чтение'},
 {id:'owl',name:'Сова-наставник',icon:'🦉',slot:'pet',cost:90,desc:'Символ мудрости'},
 {id:'dragon',name:'Дракончик',icon:'🐉',slot:'pet',cost:220,desc:'Хранитель книг'},
 {id:'fire',name:'Аура пламени',icon:'🔥',slot:'aura',cost:110,desc:'Горящий интерес'},
 {id:'stars',name:'Аура звёзд',icon:'✨',slot:'aura',cost:110,desc:'Звёздное сияние'},
 {id:'hearts',name:'Аура любви к книгам',icon:'💗',slot:'aura',cost:120,desc:'Парящие сердечки'},
 {id:'glasses',name:'Очки эрудита',icon:'👓',slot:'face',cost:60,desc:'Умный вид +10'},
 {id:'library',name:'Библиотека',icon:'📚',slot:'bg',cost:90,desc:'Тёплые стеллажи с книгами'},
 {id:'forest',name:'Лес',icon:'🌲',slot:'bg',cost:90,desc:'Зелёная роща'},
 {id:'night',name:'Ночное небо',icon:'🌙',slot:'bg',cost:90,desc:'Луна и звёзды'},
 {id:'sunset',name:'Закат',icon:'🌇',slot:'bg',cost:90,desc:'Тёплое небо'},
 {id:'castle',name:'Замок',icon:'🏰',slot:'bg',cost:130,desc:'Каменные стены'}
];
function gearById(id){return SHOP_GEAR.find(g=>g.id===id);}
function buyGear(id){const g=gearById(id);if(!g||S.ownedGear.indexOf(id)>=0||!canAfford(g.cost))return;spend(g.cost);S.ownedGear.push(id);S.equipped[g.slot]=id;save();confetti();renderShop();}
function equipGear(id){const g=gearById(id);if(!g)return;S.equipped[g.slot]=(S.equipped[g.slot]===id?null:id);save();renderProfile();if(el('shop')&&!el('shop').classList.contains('hidden'))renderShop();}
function gearLayerHtml(){let h='';['aura','body','head','weapon','pet'].forEach(s=>{const id=S.equipped[s],g=id&&gearById(id);if(g)h+='<span class="g-'+s+'">'+g.icon+'</span>';});return h;}
function renderEquip(){
  const box=el('equipBox');if(!box)return;
  if(!S.ownedGear.length){box.innerHTML='<div style="color:var(--muted);font-size:13px">Пока ничего не куплено. Магазин → «Игровое» → разделы с предметами</div>';return;}
  box.innerHTML=GEAR_CATS.map(function(cat){
    const items=S.ownedGear.map(gearById).filter(function(g){return g&&catOf(g.slot)===cat[0];});
    if(!items.length)return '';
    return '<div class="gearsec-h">'+cat[1]+'</div>'+items.map(function(g){const on=S.equipped[g.slot]===g.id;
      return '<div class="gearitem"><span class="gi">'+g.icon+'</span><div style="flex:1;min-width:0"><b>'+esc(g.name)+'</b><div style="font-size:11px;color:var(--muted)">'+GEAR_SLOTS[g.slot]+'</div></div><button class="buy'+(on?' owned':'')+'" onclick="equipGear(\''+g.id+'\')">'+(on?'Снять':'Надеть')+'</button></div>';
    }).join('');
  }).join('');
}
function el(id){return document.getElementById(id);}
/* Reading day = LOCAL device day (Product 2026-10-06), never the UTC day.
   Same code as storage/sessions.js localDay(); module boot replaces these globals with the
   storage exports, so at runtime there is ONE implementation. */
var localDay=function(ts){const x=ts instanceof Date?ts:new Date(ts==null||ts===''?Date.now():ts);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');};
var addLocalDays=function(day,n){const p=String(day).slice(0,10).split('-').map(Number);return localDay(new Date(p[0],p[1]-1,p[2]+(n||0),12,0,0));};
function today(){return localDay(Date.now());}
function yesterday(){return addLocalDays(today(),-1);}
function allBooks(){return BOOKS.filter(b=>!S.hidden.includes(b.id)).concat(S.userBooks||[]);}
function level(xp){return Math.floor(Math.sqrt(xp/100))+1;}
function lvlBounds(lv){return [100*(lv-1)*(lv-1),100*lv*lv];}
function daysBetween(a,b){if(!a||!b)return 0;const d1=new Date(a+'T00:00:00'),d2=new Date(b+'T00:00:00');return Math.round((d2-d1)/86400000);}
function rollDay(){if(S.dayKey!==today()){S.dayKey=today();S.minToday=0;
  // здоровье героя убывает, если не читать (сюжетно: знания тускнеют без практики)
  const gap=daysBetween(S.lastDay,today());
  if(gap>1)S.hp=Math.max(0,(S.hp==null?S.hpMax:S.hp)-Math.round((gap-1)*10*talentDecay()));
  save();}}
function curI(){return '';} /* currency icon removed (coins are text) */

