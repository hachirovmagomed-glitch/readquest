'use strict';
const STATS_BASE=['Интеллект','Мудрость','Харизма','Воображение','Воля'];
const BADGES=[
 {id:'first',icon:'👣',name:'Первые шаги',desc:'Первая сессия чтения'},
 {id:'owl',icon:'🦉',name:'Ночная сова',desc:'Чтение после 23:00'},
 {id:'lark',icon:'🐦',name:'Жаворонок',desc:'Чтение до 8:00'},
 {id:'marathon',icon:'🏃',name:'Марафонец',desc:'Сессия 30+ минут'},
 {id:'streak3',icon:'🔥',name:'Огонёк',desc:'Стрик 3 дня'},
 {id:'streak7',icon:'⚡',name:'Неделя силы',desc:'Стрик 7 дней'},
 {id:'finisher',icon:'🏁',name:'Финишер',desc:'Дочитать книгу до конца'},
 {id:'lvl5',icon:'🛡️',name:'Ветеран',desc:'Достичь 5 уровня'},
 {id:'collector',icon:'📦',name:'Коллекционер',desc:'Добавить свою книгу'}
];
const THEMES={
 light:{name:'Светлая',bg:'#f7f5f0',txt:'#26241f'},
 sepia:{name:'Сепия',bg:'#f4ecd8',txt:'#5b4636'},
 dark:{name:'Тёмная',bg:'#1e1e24',txt:'#cfcfd8'},
 black:{name:'AMOLED',bg:'#000000',txt:'#9a9aa3'}
};
const FONTS=[
 {label:'Georgia',v:'Georgia, serif'},
 {label:'Times',v:'"Times New Roman", Times, serif'},
 {label:'Palatino',v:'"Palatino Linotype","Book Antiqua",Palatino,serif'},
 {label:'Garamond',v:'Garamond,"Times New Roman",serif'},
 {label:'Sans',v:'system-ui,"Segoe UI",Roboto,sans-serif'},
 {label:'Verdana',v:'Verdana,Geneva,sans-serif'},
 {label:'Trebuchet',v:'"Trebuchet MS",sans-serif'},
 {label:'Tahoma',v:'Tahoma,sans-serif'},
 {label:'Comic',v:'"Comic Sans MS","Segoe UI",cursive'},
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
  if(!S.cur||!S.cur.icon)S.cur={icon:'🪙',name:'золото'};
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
  if(S.devMoney===undefined)S.devMoney=false;
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
      if(!saveWarned){saveWarned=true;try{alert('⚠️ Не удалось сохранить прогресс (rq_v1). Сделайте экспорт в Настройках.');}catch(_){}}
    }else{saveWarned=false;}
  }).catch(function(e){
    console.warn('[rq] saveFlat failed',e);
    if(!saveWarned){saveWarned=true;try{alert('⚠️ Не удалось сохранить прогресс.');}catch(_){}}
  });
}
function allStats(){return STATS_BASE.concat((S.customStats||[]).filter(s=>!STATS_BASE.includes(s)));}
/* === валюта (тест-режим) === */
function canAfford(c){return !!S.devMoney||S.gold>=c;}
function spend(c){if(!S.devMoney)S.gold=Math.max(0,S.gold-c);}
function goldDisp(){return S.devMoney?'∞':S.gold;}
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
  if(!S.ownedGear.length){box.innerHTML='<div style="color:var(--muted);font-size:13px">Пока ничего не куплено. Магазин → «Игровое» → разделы с предметами 🛍</div>';return;}
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
function curI(){return S.cur.icon;}

