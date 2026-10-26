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
 'babochkovyi-night':{name:'Бабочковый',bg:'#0e1019',txt:'#e4e6ef',skin:'babochkovyi',shop:'skin-babochkovyi',icon:'flower-2',night:true,base:'babochkovyi'},
 celestial:{name:'Небесный',bg:'#fbf6ea',txt:'#2b2742',skin:'celestial',shop:'skin-celestial',icon:'moon'},
 'celestial-night':{name:'Небесный',bg:'#14172a',txt:'#e7dcc6',skin:'celestial',shop:'skin-celestial',icon:'moon',night:true,base:'celestial'}
};
function themeBase(k){const v=THEME_VARIANTS[k]||SKIN_THEMES[k];return v&&v.base?v.base:k;}
/** owned shop skin theme for a saved key, else null (unknown / not bought / not styled yet) */
function skinTheme(k){const t=SKIN_THEMES[k];return t&&typeof shopOwns==='function'&&shopOwns(t.shop)&&shopReady(t.shop)?t:null;}
/** day/night key of the same skin: 'pencil' ↔ 'pencil-night', 'ellada' ↔ 'ellada-night' */
function skinThemeKey(skin,night){return night?skin+'-night':skin;}
/** audit 19.10 SK-02: putting a skin on keeps the time of day — at night (what is on screen now) the skin's night key */
function skinWearKey(skin){let nt=false;try{const t=activeTheme();nt=t.skin?!!t.night:(S.appTheme==='dark'||(S.appTheme==='auto'&&resolveAppTheme()==='dark'));}catch(e){} /* night = «Ночной режим» on (dark / auto-at-night), or a night skin now; the default teal stays day */const k=skinThemeKey(skin,nt);return (SKIN_THEMES[k]||THEME_VARIANTS[k])?k:skin;}
/** old (formerly paid) theme saved in rq_set — free since the shop build */
function ownedShopTheme(k){return (typeof OLD_THEMES!=='undefined'&&OLD_THEMES.find(x=>x.id===k))||null;} /* shop build: the 9 old themes are free */
/** theme actually rendered. 1в: a saved paid theme that is NOT owned renders the base theme (sepia); rq_set is NOT rewritten until the user picks another */
/** 1в: «Карандашный» is an APP-WIDE skin: all tokens.rq.css (--rq-*) on :root (html[data-skin=pencil], night: data-theme=night);
    any other reader theme removes both → app back to its own palette. Called at boot and from applySet. */
/* the browser bar = the paper under the page: body, else the root (skins paint the root and keep body transparent), else the --rq-bg token */
function rqPaperColor(){const clear=function(c){return !c||/^rgba\(.*,\s*0\)$/.test(c)||c==='transparent';};
  let c=getComputedStyle(document.body).backgroundColor;if(clear(c))c=getComputedStyle(document.documentElement).backgroundColor;
  if(clear(c)){const t=getComputedStyle(document.documentElement).getPropertyValue('--rq-bg').trim();if(t){const d=document.createElement('i');d.style.color=t;document.body.appendChild(d);c=getComputedStyle(d).color;d.remove();}}
  return c;}
function syncThemeColor(){try{const c=rqPaperColor(),m=c.match(/\d+/g),mt=document.querySelector('meta[name=theme-color]');if(mt&&m&&m.length>=3)mt.content='#'+m.slice(0,3).map(function(x){return (+x).toString(16).padStart(2,'0');}).join('');}catch(e){}}
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
/* читалка (Джессика 17.10: «иконки настроек не меняются»): назад = крыло-стрелка, «Слушать» = динамик и вылетающая бабочка, оглавление = листочки,
   ночь = месяц с мотыльком, день = цветок, фокус = рамка с бабочкой, настройки = цветок-шестерёнка. data-bb — метка набора для теста */
Object.assign(SKIN_ICONS_BB,{
 'arrow-left':'<path data-bb="" d="M21 12H9"/><path d="M9 12C7.5 8 5 6.5 3 7c.3 2.8 2.5 5 6 5zM9 12c-1.5 4-4 5.5-6 5 .3-2.8 2.5-5 6-5z"/>',
 'volume-2':'<path data-bb="" d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="M14.5 9.5q1.2 2.5 0 5"/><path d="M18.5 12c-.6-3 .6-5.2 2.3-4.8 1.3.5.4 3.4-2.3 4.8zm0 0c-.6 3 .6 5.2 2.3 4.8 1.3-.5.4-3.4-2.3-4.8z"/>',
 'list':'<path data-bb="" d="M10 6h11M10 12h11M10 18h11"/><path d="M3 7.5c0-2 1.3-3 3.5-3 0 2-1.3 3-3.5 3zM3 13.5c0-2 1.3-3 3.5-3 0 2-1.3 3-3.5 3zM3 19.5c0-2 1.3-3 3.5-3 0 2-1.3 3-3.5 3z"/>',
 'moon':'<path data-bb="" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M18 6c.8-2.2 2.8-2.6 3.2-1.6.3 1-1.3 1.6-3.2 1.6zm0 0c-.8-2.2-2.8-2.6-3.2-1.6-.3 1 1.3 1.6 3.2 1.6z"/>',
 'sun':'<circle data-bb="" cx="12" cy="12" r="2.5"/><path d="M12 9.5C9.5 7 10 3 12 3s2.5 4 0 6.5zM14.5 12C17 9.5 21 10 21 12s-4 2.5-6.5 0zM12 14.5c2.5 2.5 2 6.5 0 6.5s-2.5-4 0-6.5zM9.5 12C7 14.5 3 14 3 12s4-2.5 6.5 0z"/>',
 'focus':'<path data-bb="" d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M12 12c-1-3-3.5-4-4.5-3-.8 1 .5 3 4.5 3zm0 0c1-3 3.5-4 4.5-3 .8 1-.5 3-4.5 3zm0 0c-1 2-3 3-3.7 2.3-.5-.7.8-2.3 3.7-2.3zm0 0c1 2 3 3 3.7 2.3.5-.7-.8-2.3-3.7-2.3z"/>',
 'settings':'<path data-bb="" d="M12 4.8A2.9 2.9 0 0 1 17.1 6.9A2.9 2.9 0 0 1 19.2 12A2.9 2.9 0 0 1 17.1 17.1A2.9 2.9 0 0 1 12 19.2A2.9 2.9 0 0 1 6.9 17.1A2.9 2.9 0 0 1 4.8 12A2.9 2.9 0 0 1 6.9 6.9A2.9 2.9 0 0 1 12 4.8z"/><circle cx="12" cy="12" r="2.6"/>'
});
/* читалка у Эллады и Карандашного (Джессика 17.10: «во всех скинах»): Эллада — меандр (оглавление, фокус), лавр у «Слушать»;
   Карандашный — штрихованные линии: назад = карандаш остриём влево, шестерёнка из штрихов, луна и динамик со штриховкой */
Object.assign(SKIN_ICONS.ellada,{
 'list':'<path d="M10 6h11M10 12h11M10 18h11"/><path d="M3 7.5V4.5h4v3H5V6M3 13.5v-3h4v3H5V12M3 19.5v-3h4v3H5V18"/>',
 'focus':'<path d="M3 8V3h5v3H6M16 3h5v5h-3V6M21 16v5h-5v-3h2M8 21H3v-5h3v2"/><circle cx="12" cy="12" r="3"/>',
 'volume-2':'<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/><path d="M20.2 8.5c1.2-.3 1.8-1 2-2M20.2 15.5c1.2.3 1.8 1 2 2"/>'
});
SKIN_ICONS.pencil={
 'arrow-left':'<path d="M21 9.5H9.5L4 12l5.5 2.5H21z"/><path d="M9.5 9.5v5M18 9.5v5"/><path d="M4 12h2.2"/>',
 'volume-2':'<path d="M3 9h3.5L11 5v14l-4.5-4H3z"/><path d="M4.5 13.5l3-3M5.5 15.5l4-4"/><path d="M15 9a4.5 4.5 0 0 1 .2 6.2M18 6a8.5 8.5 0 0 1 .3 12.2"/>',
 'list':'<path d="M9 6.2h11.5M8.6 12h12M9 17.8h11.2"/><path d="M3.5 5.5l2 1M3.5 11.5l2 1M3.5 17.5l2 1"/>',
 'moon':'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M6 15.5l3-3M7.5 18l4-4M10.5 19.5l3-3"/>',
 'sun':'<circle cx="12" cy="12" r="4"/><path d="M10 13.5l3.5-3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M5 19l2.1-2.1M16.9 7.1 19 5"/>',
 'focus':'<path d="M3 7.5V3.2h4.5M16.5 3h4.5v4.5M21 16.5V21h-4.3M7.5 21H3v-4.5"/><circle cx="12" cy="12" r="3"/><path d="M10.6 12.8l2-2"/>',
 'settings':'<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'
};
/* «Небесный» (17.10): читалка — назад с искрой, «Слушать» с полумесяцем-волной, оглавление звёздочками, ночь = месяц со звездой, день = солнце-лучи,
   фокус = рамка со звездой, настройки = солнце-шестерёнка; награды = подарок со звездой, серия = солнце, уровень = звезда, профиль = лунный серп */
SKIN_ICONS.celestial={
 'arrow-left':'<path d="M20 12H5"/><path d="M11 6l-6 6 6 6"/><path d="M19 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
 'volume-2':'<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19.5 4.5q1 .2 1.4 1.1.4-.9 1.4-1.1-1-.2-1.4-1.1-.4.9-1.4 1.1z"/><path d="M18.5 7.5a8 8 0 0 1 0 9"/>',
 'list':'<path d="M10 6h11M10 12h11M10 18h11"/><path d="M5 3.8l.8 1.4 1.5.3-1.1 1.1.3 1.5L5 7.4l-1.5.7.3-1.5-1.1-1.1 1.5-.3zM5 9.8l.8 1.4 1.5.3-1.1 1.1.3 1.5L5 13.4l-1.5.7.3-1.5-1.1-1.1 1.5-.3zM5 15.8l.8 1.4 1.5.3-1.1 1.1.3 1.5L5 19.4l-1.5.7.3-1.5-1.1-1.1 1.5-.3z"/>',
 'moon':'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 2.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z"/>',
 'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><path d="M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" stroke-dasharray="1 1.6"/>',
 'focus':'<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M12 7.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z"/>',
 'settings':'<circle cx="12" cy="12" r="3"/><path d="M12 2.5l1.6 3.1 3.4-.9-.9 3.4 3.1 1.6-3.1 1.6.9 3.4-3.4-.9L12 21.5l-1.6-3.1-3.4.9.9-3.4L4.8 14.3l3.1-1.6-.9-3.4 3.4.9z"/>',
 'gift':'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M12 8C10.5 4 7.5 3.5 7 5.5S9 8 12 8zM12 8c1.5-4 4.5-4.5 5-2.5S15 8 12 8z"/><path d="M20 2l.5 1.2 1.2.5-1.2.5L20 5.4l-.5-1.2-1.2-.5 1.2-.5z"/>',
 'user-round':'<path d="M15 3a8 8 0 1 0 6 11.5A6.5 6.5 0 1 1 15 3z"/><path d="M8.5 9.5v.01M11 13.5q-1.5 1-3 0"/>'
};
SKIN_ICONS.babochkovyi=SKIN_ICONS_BB; /* «Бабочковый»: цветник, цветок, бабочка, кокон, шелкопряд (flower/flower-2 = Lucide, the rest our drawings) */
/* 21.10 (Джессика: «чтобы иконки в разных скинах сильнее отличались, но оставляли дух скина»): v2 — у каждого скина своя манера,
   а не Lucide с наклейкой. Карандашный: всё обведено дважды, штриховка; Эллада: прямые углы (skins.css: square/miter), стела, Селена, Вергина, лабиринт;
   Небесный: тонкая линия, золотые искры (--ic-fill); Бабочковый: круглое, лепестки и крылья с заливкой (--ic-soft). Поверх наборов выше. */
const icN=n=>Math.round(n*100)/100;
/* filled accent piece: --ic-fill per skin (gold / wing colour), currentColor elsewhere */
const IC_FILL=' style="fill:var(--ic-fill,currentColor);stroke:none"';
const IC_SOFT=' style="fill:var(--ic-soft,currentColor);fill-opacity:var(--ic-soft-o,.22)"';
/* 4-point sparkle */
function icSpark(x,y,r){return 'M'+icN(x)+' '+icN(y-r)+'Q'+icN(x)+' '+icN(y)+' '+icN(x+r)+' '+icN(y)+'Q'+icN(x)+' '+icN(y)+' '+icN(x)+' '+icN(y+r)+'Q'+icN(x)+' '+icN(y)+' '+icN(x-r)+' '+icN(y)+'Q'+icN(x)+' '+icN(y)+' '+icN(x)+' '+icN(y-r)+'Z';}
function icStar(n,ro,ri,cx,cy,rot){cx=cx||12;cy=cy||12;rot=rot||-90;let d='';for(let i=0;i<n*2;i++){const r=i%2?ri:ro,a=(rot+i*180/n)*Math.PI/180;d+=(i?'L':'M')+icN(cx+r*Math.cos(a))+' '+icN(cy+r*Math.sin(a));}return d+'Z';}
function icVergina(){let d='';for(let i=0;i<8;i++){const a=i*45*Math.PI/180,b=0.32;
  d+='M'+icN(12+4*Math.cos(a-b))+' '+icN(12+4*Math.sin(a-b))+'L'+icN(12+10*Math.cos(a))+' '+icN(12+10*Math.sin(a))+'L'+icN(12+4*Math.cos(a+b))+' '+icN(12+4*Math.sin(a+b));
  const c=a+Math.PI/8;d+='M'+icN(12+4.6*Math.cos(c))+' '+icN(12+4.6*Math.sin(c))+'L'+icN(12+7.6*Math.cos(c))+' '+icN(12+7.6*Math.sin(c));}
  return '<circle cx="12" cy="12" r="2.4"/><path d="'+d+'"/>';}
function icTicks(n,r1,r2,off){let d='';for(let i=0;i<n;i++){const a=(off+i*360/n)*Math.PI/180;d+='M'+icN(12+r1*Math.cos(a))+' '+icN(12+r1*Math.sin(a))+'L'+icN(12+r2*Math.cos(a))+' '+icN(12+r2*Math.sin(a));}return d;}
/* «Карандашный»: every icon drawn twice, the second pass a hair off and lighter = a pencil sketch; hatching instead of fills */
function icSketch(b){return '<g>'+b+'</g><g transform="translate(.25 .15) rotate(-3.4 12 12)" opacity=".55">'+b+'</g>';}

const SKIN_ICONS_V2={
pencil:{ /* тетрадь: оглавление в тетради на пружине, библиотека = стопка тетрадей, путь = карта сокровищ с крестиком */
 'list':icSketch('<path d="M7 3h13v18H7z"/><path d="M4.5 6h4M4.5 10h4M4.5 14h4M4.5 18h4"/><path d="M10.5 8h6.5M10.5 12h6.5M10.5 16h4"/>'),
 'moon':icSketch('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M5 14.5l3.5-3.5M6 17.5l4.5-4.5M8.5 19.5l4-4M12 20.5l3-3"/>'),
 'sun':icSketch('<circle cx="12" cy="12" r="4.3"/><path d="M10 14l4-4M9.5 12l2.5-2.5"/><path d="M12 2.5v3M12.3 18.5l-.3 3M2.5 11.7l3 .3M18.5 12h3M5 5.3l2.1 2M17 17l2 2.2M5.2 19l2-2.2M16.8 7.1 19 5"/>'),
 'focus':icSketch('<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5"/><path d="M9 15l1-3.5 4.5-4.5 2.5 2.5-4.5 4.5z"/><path d="M14 7.5l2.5 2.5"/>'),
 'settings':icSketch('<path d="M10.3 2.5h3.4l.5 2.6 1.8.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.8 2.6.5v3.4l-2.6.5-.8 1.8 1.5 2.2-2.4 2.4-2.2-1.5-1.8.8-.5 2.6h-3.4l-.5-2.6-1.8-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.8-2.6-.5v-3.4l2.6-.5.8-1.8-1.5-2.2 2.4-2.4 2.2 1.5 1.8-.8z"/><circle cx="12" cy="12" r="3"/>'),
 'book-open':icSketch('<path d="M3 16.5h17v4H3zM4.5 11h15v5.5h-15zM3.5 5.5h16V11h-16z"/><path d="M6 18.5h4M7 13.5h3M6 8h4"/>'),
 'map':icSketch('<path d="M3 6l6-2.5 6 2.5 6-2.5v15L15 21l-6-2.5L3 21z"/><path d="M5.5 16c1.5-1 2.5-3 4.5-3.5" stroke-dasharray="1.6 1.6"/><path d="M13 9.5l3.5 3.5M16.5 9.5 13 13"/>'),
 'gift':icSketch('<path d="M4 10h16v11H4zM3 7h18v3H3z"/><path d="M12 7v14"/><path d="M12 7C10 3 6.5 3.5 7.5 6M12 7c2-4 5.5-3.5 4.5-1"/><path d="M5.5 13l2-2M5.5 17l5-5M7 20l3.5-3.5"/>'),
 'user-round':icSketch('<circle cx="12" cy="13" r="7.5"/><path d="M5.5 9.5 7 7l1.5 1.5L10 5.5l1.5 2L13 5l1.5 2.5L16 6l1 2.5L18.5 9"/><path d="M9.5 12.5v.5M14.5 12.5v.5M9.5 16q2.5 2 5 0"/>')
},
ellada:{ /* камень и бронза: прямые углы, меандр, стела, монета Селены, солнце Вергины, лабиринт */
 'list':'<path d="M3 8.5 12 3l9 5.5z"/><path d="M5 8.5V21M19 8.5V21M3 21h18"/><path d="M8 12h8M8 15h8M8 18h5"/>',
 'moon':'<circle cx="12" cy="12" r="9.5"/><path d="M13.5 6.8A5.4 5.4 0 1 0 13.5 17.2A6.6 6.6 0 0 1 13.5 6.8Z"/><path d="M17 9.5h.01M18 13h.01M16.5 16h.01"/>',
 'sun':icVergina(),
 'focus':'<path d="M3 8V3h5v3H6M16 3h5v5h-3V6M21 16v5h-5v-3h2M8 21H3v-5h3v2"/><path d="M12 8.5 15.5 12 12 15.5 8.5 12z"/>',
 'settings':'<path d="M6 21h12"/><path d="M7.5 21C4.5 16 4.5 10 7 6.5 8 5 7.6 3.6 6 3M16.5 21c3-5 3-11 .5-14.5-1-1.5-.6-2.9 1-3.5"/><path d="M6.8 7.5h10.4"/><path d="M10 7.5V19M12 7.5V19M14 7.5V19"/>',
 'map':'<path d="M12 12h2v3H9V9h8v10H5V5h16v16h-4"/>',
 'gift':'<path d="M9 2.5h6M10 2.5v4C7 8 6 11 6.5 14c.5 3.5 3 6 5.5 7.5M14 2.5v4c3 1.5 4 4.5 3.5 7.5-.5 3.5-3 6-5.5 7.5"/><path d="M10 4.5H8a2 2 0 0 0 0 4M14 4.5h2a2 2 0 0 1 0 4"/><path d="M7 12.5h10M7 15h10"/><path d="M9 21.5h6"/>'
},
celestial:{ /* астролябия: тонкая линия, золотые искры-звёзды, круги и ромбы */
 'list':'<path d="M10 6h11M10 12h11M10 18h11"/><path d="'+icSpark(5,6,2.8)+icSpark(5,12,2.8)+icSpark(5,18,2.8)+'"'+IC_FILL+'/>',
 'moon':'<path d="M14.5 3.2A9 9 0 1 0 20.8 15.6 7 7 0 0 1 14.5 3.2Z"/><path d="M3.5 17.5c4 2.5 13 2.5 17-4" stroke-dasharray="1 1.8"/><path d="'+icSpark(18.5,6.5,3)+'"'+IC_FILL+'/>',
 'sun':'<path d="'+icStar(8,10,4.6,12,12,-90)+'"/><circle cx="12" cy="12" r="2.1"'+IC_FILL+'/>',
 'focus':'<path d="M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4"/><circle cx="12" cy="12" r="5"/><path d="M12 5v1.5M12 17.5V19M5 12h1.5M17.5 12H19"/><path d="'+icSpark(12,12,2.6)+'"'+IC_FILL+'/>',
 'settings':'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5"/><path d="'+icTicks(8,8,10.5,0)+'"/><path d="'+icTicks(8,8,9,22.5)+'"/><path d="'+icSpark(12,12,3.2)+'"'+IC_FILL+'/>',
 'book-open':'<path d="M2 19c3-1.4 7-1.4 10 0 3-1.4 7-1.4 10 0V9c-3-1.4-7-1.4-10 0-3-1.4-7-1.4-10 0z"/><path d="M12 9v10"/><path d="'+icSpark(12,3.8,2.6)+icSpark(5.5,4.8,1.5)+icSpark(18.5,4.8,1.5)+'"'+IC_FILL+'/>',
 'map':'<path d="M4 19.5 9 15 8 9 13.5 7.5 18 4.8"/><circle cx="4" cy="19.5" r="1.4"'+IC_FILL+'/><circle cx="9" cy="15" r="1.4"'+IC_FILL+'/><circle cx="8" cy="9" r="1.4"'+IC_FILL+'/><circle cx="13.5" cy="7.5" r="1.4"'+IC_FILL+'/><path d="'+icSpark(19.2,4.2,3.4)+'"'+IC_FILL+'/>',
 'gift':'<path d="M3 9.5h18v3.5H3zM5 13v8h14v-8M12 9.5V21"/><path d="M12 9.5C10.5 5.5 7.5 5 7 7s2 2.5 5 2.5zM12 9.5c1.5-4 4.5-4.5 5-2.5s-2 2.5-5 2.5z"/><path d="'+icSpark(19.5,3.5,2.6)+icSpark(4,4.5,1.6)+'"'+IC_FILL+'/>',
 'user-round':'<path d="M15 3a8 8 0 1 0 6 11.5A6.5 6.5 0 1 1 15 3z"/><path d="M8.5 9.5v.01M11 13.5q-1.5 1-3 0"/><path d="'+icSpark(19,5,2.6)+'"'+IC_FILL+'/>'
},
babochkovyi:{ /* луг: всё мягкое и круглое, крылья и лепестки с полупрозрачной заливкой */
 'list':'<path data-bb="" d="M10 6q2.75-1.6 5.5 0t5.5 0M10 12q2.75-1.6 5.5 0t5.5 0M10 18q2.75-1.6 5.5 0t5.5 0"/><path d="M3 7.5c0-2 1.3-3 3.5-3 0 2-1.3 3-3.5 3zM3 13.5c0-2 1.3-3 3.5-3 0 2-1.3 3-3.5 3zM3 19.5c0-2 1.3-3 3.5-3 0 2-1.3 3-3.5 3z"'+IC_SOFT+'/>',
 'moon':'<path data-bb="" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"'+IC_SOFT+'/><path d="M18 6c.8-2.2 2.8-2.6 3.2-1.6.3 1-1.3 1.6-3.2 1.6zm0 0c-.8-2.2-2.8-2.6-3.2-1.6-.3 1 1.3 1.6 3.2 1.6z"/>',
 'sun':'<path data-bb="" d="M12 9.5C9.5 7 10 3 12 3s2.5 4 0 6.5zM14.5 12C17 9.5 21 10 21 12s-4 2.5-6.5 0zM12 14.5c2.5 2.5 2 6.5 0 6.5s-2.5-4 0-6.5zM9.5 12C7 14.5 3 14 3 12s4-2.5 6.5 0z"'+IC_SOFT+'/><path d="M10.2 10.2C8 8 5.5 7 5.3 5.3 7 5.5 8 8 10.2 10.2zM13.8 10.2C16 8 18.5 7 18.7 5.3 17 5.5 16 8 13.8 10.2zM13.8 13.8C16 16 18.5 17 18.7 18.7 17 18.5 16 16 13.8 13.8zM10.2 13.8C8 16 5.5 17 5.3 18.7 7 18.5 8 16 10.2 13.8z"/><circle cx="12" cy="12" r="2.3"'+IC_FILL+'/>',
 'focus':'<path data-bb="" d="M3 8c0-3 2-5 5-5M16 3c3 0 5 2 5 5M21 16c0 3-2 5-5 5M8 21c-3 0-5-2-5-5"/><path d="M12 12c-1.2-3.5-4.5-5-5.6-3.8-1 1.2.6 3.8 5.6 3.8zm0 0c1.2-3.5 4.5-5 5.6-3.8 1 1.2-.6 3.8-5.6 3.8zm0 0c-1.2 2.4-3.6 3.6-4.4 2.8-.6-.8 1-2.8 4.4-2.8zm0 0c1.2 2.4 3.6 3.6 4.4 2.8.6-.8-1-2.8-4.4-2.8z"'+IC_SOFT+'/>',
 'settings':'<path data-bb="" d="M12 4.8A2.9 2.9 0 0 1 17.1 6.9A2.9 2.9 0 0 1 19.2 12A2.9 2.9 0 0 1 17.1 17.1A2.9 2.9 0 0 1 12 19.2A2.9 2.9 0 0 1 6.9 17.1A2.9 2.9 0 0 1 4.8 12A2.9 2.9 0 0 1 6.9 6.9A2.9 2.9 0 0 1 12 4.8z"'+IC_SOFT+'/><circle cx="12" cy="12" r="2.6"/>',
 'book-open':'<path d="M12 7.5C9.5 4.5 5 4 2.5 5.5V18c3-1.5 7-.8 9.5 2C14.5 17.2 18.5 16.5 21.5 18V5.5C19 4 14.5 4.5 12 7.5z"'+IC_SOFT+'/><path d="M12 7.5v12.5"/><path d="M12 7.5c-.3-2-1.2-3.3-2.6-4M12 7.5c.3-2 1.2-3.3 2.6-4"/>',
 'map':'<path d="M5.5 21.5c-1.5-4 1.5-6.5 5-8s6-3.5 5-8.5"/><path d="M8 15C4.8 14.4 3.4 11.6 4.2 9.2 6.8 9.6 8.6 12.2 8 15zM13.2 11.6c.8-3 3.8-4.4 6.4-3.6-.3 2.7-3.3 4.2-6.4 3.6z"'+IC_SOFT+'/><circle cx="15.5" cy="4.5" r="2.2"'+IC_FILL+'/>',
 'gift':'<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"/><circle cx="12" cy="8" r="2"'+IC_FILL+'/><path d="M12 10v12"/><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"'+IC_SOFT+'/><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"'+IC_SOFT+'/>',
 'user-round':'<circle cx="12" cy="14" r="6"'+IC_SOFT+'/><path d="M10 8.5 7.5 3.5M14 8.5l2.5-5"/><path d="M6.5 3.5h2M15.5 3.5h2"/><path d="M4 12c-2-1-2.5-4 0-5 1.5.5 2.5 2 2.8 3.5M20 12c2-1 2.5-4 0-5-1.5.5-2.5 2-2.8 3.5"/><path d="M10 13.5v.01M14 13.5v.01M10.5 16.5q1.5 1 3 0"/>'
}};
Object.keys(SKIN_ICONS_V2).forEach(function(k){Object.assign(SKIN_ICONS[k],SKIN_ICONS_V2[k]);});
/* Confetti per skin (Джессика 17.10): sprite symbol names; unknown skin / no skin → default. A new skin adds its line here.
   «Эллада»: амфора, свиток, Гелиос, венок; «Бабочковый»: бабочка, цветы, кокон; «Карандашный»: карандаш, тетрадь. */
const CONFETTI_SKIN={'':['sparkles','star','book-open','check'],pencil:['pencil','notebook-pen','star','sparkles'],
 }; /* «Эллада», «Бабочковый» — свои фигуры, CONFETTI_ART ниже */
function confettiIcons(){const k=document.documentElement.dataset.skin||'';return CONFETTI_SKIN[k]||CONFETTI_SKIN[''];}
/* Свои конфетти-фигуры скина (Джессика 17.10, листы-образцы): залитые фигуры вместо значков. {F} — заливка куска.
   Цвета только токены скина: var(--…) или градиент из токенов (grads → <linearGradient id> в #rqConfettiDefs). */
const CONFETTI_ART={
 babochkovyi:{ /* бабочки (сверху, сбоку, маленькие) и кружки в шести заливках крыла; машут крыльями */
  seq:['butterfly','butterfly','butterfly','side','small','small','butterfly','side','small','dot'],
  fills:{blue:'var(--bb-iri-1)',lilac:'var(--bb-iri-2)',pink:'var(--bb-iri-3)',pearl:'url(#rqcPearl)',gold:'url(#rqcGold)',silver:'url(#rqcSilver)'},
  grads:{rqcPearl:['--bb-iri-1','--bb-iri-2','--bb-iri-3'],rqcGold:['--bb-pollen','--rq-coin','--bb-pollen'],rqcSilver:['--rq-surface-2','--rq-border-strong','--rq-line']},
  shapes:{
   butterfly:{sz:24,svg:'<path d="M12 7.5C10.6 3.8 6.6 1.6 3.6 2.6 1.2 3.5 1.4 7.4 3.6 9.4c1.2 1.1 2.7 1.6 4.1 1.8-2.1.7-3.6 2.4-3.3 4.4.4 2.5 3.4 3.4 5.4 1.8 1.1-.9 1.8-2.9 2.2-4.8.4 1.9 1.1 3.9 2.2 4.8 2 1.6 5 .7 5.4-1.8.3-2-1.2-3.7-3.3-4.4 1.4-.2 2.9-.7 4.1-1.8 2.2-2 2.4-5.9 0-6.8-3-1-7 1.2-8.4 4.9Z"/>'},
   side:{sz:20,svg:'<path d="M10.5 15.5C8.6 10.6 9.6 4.2 15.6 2c-.3 4.3-1.7 9.1-4.3 13.5Z"/><path d="M10.9 15.6C7.2 13.9 3.9 10 4.4 5.6c3.2 1.7 5.7 5.3 6.9 9.6Z" opacity=".8"/><path d="M4 16.6c3.4-.9 9.4-1.4 15.6-.4-.1.6-.4.9-.9.9-4.6-.3-9.8-.1-14.4.4Z"/>'},
   small:{sz:16,svg:'<path d="M12 9.5C11 6.8 8 5.3 5.9 6c-1.7.6-1.5 3.4 0 4.8.9.8 1.9 1.1 2.9 1.3-1.5.5-2.5 1.7-2.3 3.1.3 1.8 2.4 2.4 3.8 1.3.8-.7 1.3-2.1 1.7-3.4.4 1.3.9 2.7 1.7 3.4 1.4 1.1 3.5.5 3.8-1.3.2-1.4-.8-2.6-2.3-3.1 1-.2 2-.5 2.9-1.3 1.5-1.4 1.7-4.2 0-4.8-2.1-.7-5.1.8-6.1 3.5Z"/>'},
   dot:{sz:8,svg:'<circle cx="12" cy="12" r="3.2"/>'}}},
 ellada:{ /* лавр, олива, звезда, ромб, меандр, молния Зевса, лента, кружок — золото, Эгейский синий, олива; медленно кружатся */
  seq:['laurel','star','leaf','diamond','ribbon','laurel','meander','bolt','star','dot','diamond','leaf'],
  fills:{gold:'var(--el-gold)',goldg:'url(#rqcElGold)',blue:'var(--el-blue)',olive:'var(--el-olive)'},
  grads:{rqcElGold:['--el-gold-l','--el-gold','--el-gold-l']},
  shapes:{
   laurel:{sz:30,f:['goldg','gold','olive'],svg:'<path d="M6 21C9 15 12 9 18 3" style="fill:none;stroke:{F}" stroke-width="1.4" stroke-linecap="round"/><path transform="translate(7.2 17.6) rotate(-150)" d="M0 0q2.6-1.7 5.2 0q-2.6 1.7-5.2 0z"/><path transform="translate(7.6 17) rotate(-30)" d="M0 0q2.6-1.7 5.2 0q-2.6 1.7-5.2 0z"/><path transform="translate(9.6 13.4) rotate(-150)" d="M0 0q2.6-1.7 5.2 0q-2.6 1.7-5.2 0z"/><path transform="translate(10.2 12.8) rotate(-30)" d="M0 0q2.6-1.7 5.2 0q-2.6 1.7-5.2 0z"/><path transform="translate(12.2 9.6) rotate(-150)" d="M0 0q2.6-1.7 5.2 0q-2.6 1.7-5.2 0z"/><path transform="translate(13 9) rotate(-30)" d="M0 0q2.6-1.7 5.2 0q-2.6 1.7-5.2 0z"/><path transform="translate(15 6.2) rotate(-140)" d="M0 0q2.6-1.7 5.2 0q-2.6 1.7-5.2 0z"/><path transform="translate(15.8 5.6) rotate(-40)" d="M0 0q2.6-1.7 5.2 0q-2.6 1.7-5.2 0z"/>'},
   leaf:{sz:20,f:['olive','gold'],svg:'<path d="M4 20C4 11 11 4 20 4c0 9-7 16-16 16Z"/><path d="M6 18 17.5 6.5" style="fill:none;stroke:var(--rq-surface)" stroke-width="1"/>'},
   star:{sz:22,f:['goldg','gold','blue'],svg:'<polygon points="12.0 2.0 13.3 8.9 19.1 4.9 15.1 10.7 22.0 12.0 15.1 13.3 19.1 19.1 13.3 15.1 12.0 22.0 10.7 15.1 4.9 19.1 8.9 13.3 2.0 12.0 8.9 10.7 4.9 4.9 10.7 8.9"/>'},
   diamond:{sz:14,f:['gold','blue'],svg:'<path d="M12 2 18 12 12 22 6 12Z"/>'},
   meander:{sz:18,f:['blue'],svg:'<rect x="2" y="2" width="20" height="20" rx="1"/><path d="M6.5 17.5v-11h11v11h-7v-7h3.5v3.5" style="fill:none;stroke:var(--el-gold-l)" stroke-width="1.8"/>'},
   bolt:{sz:24,f:['goldg','gold'],svg:'<path d="M14 2 5 13.5h6L9 22l10-12.5h-6.2Z"/>'},
   ribbon:{sz:28,f:['blue'],svg:'<path d="M2 9c4-4 7 2 11-1s6-4 9-2v6c-3-2-5-1-9 2s-7-3-11 1Z"/>'},
   dot:{sz:7,f:['gold','blue'],svg:'<circle cx="12" cy="12" r="3.2"/>'}}},
 celestial:{ /* «Небесный»: звёзды, искры, месяц, солнце, кружки — золото, чернильная синева, сирень заката */
  seq:['star','spark','moon','star','dot','sun','spark','star','dot','moon'],
  fills:{gold:'var(--cl-gold)',goldg:'url(#rqcClGold)',ink:'var(--rq-accent)',lilac:'var(--cl-lilac)'},
  grads:{rqcClGold:['--cl-gold-l','--cl-gold','--cl-gold-l']},
  shapes:{
   star:{sz:22,f:['goldg','gold','lilac'],svg:'<path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/>'},
   spark:{sz:18,f:['goldg','lilac','ink'],svg:'<path d="M12 1Q13.6 10.4 23 12Q13.6 13.6 12 23Q10.4 13.6 1 12Q10.4 10.4 12 1z"/>'},
   moon:{sz:22,f:['goldg','gold'],svg:'<path d="M15 3a9 9 0 1 0 6 14A7.5 7.5 0 1 1 15 3z"/>'},
   sun:{sz:22,f:['goldg','gold'],svg:'<circle cx="12" cy="12" r="5"/><path d="M12 1l1.4 4h-2.8zM12 23l1.4-4h-2.8zM1 12l4 1.4v-2.8zM23 12l-4 1.4v-2.8z"/>'},
   dot:{sz:7,f:['gold','ink','lilac'],svg:'<circle cx="12" cy="12" r="3.2"/>'}}}
};
function confettiDefs(){if(document.getElementById('rqConfettiDefs'))return;
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.id='rqConfettiDefs';svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');svg.style.position='absolute';
  let g='';Object.keys(CONFETTI_ART).forEach(function(k){const gr=CONFETTI_ART[k].grads||{};Object.keys(gr).forEach(function(id){const st=gr[id];
    g+='<linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1">'+st.map(function(t,i){return '<stop offset="'+(i/(st.length-1))+'" style="stop-color:var('+t+')"/>';}).join('')+'</linearGradient>';});});
  svg.innerHTML='<defs>'+g+'</defs>';document.body.appendChild(svg);}
/** one confetti piece for the current skin: {html, c (shape, '' for icon pieces), f (fill name)} */
function confettiPiece(i){
  const art=CONFETTI_ART[document.documentElement.dataset.skin||''];
  if(art){confettiDefs();
    const c=art.seq[i%art.seq.length],sh=art.shapes[c],fl=sh.f||Object.keys(art.fills),f=fl[(i*5+Math.floor(i/6))%fl.length],fv=art.fills[f];
    return {c:c,f:f,html:'<svg class="skc" width="'+sh.sz+'" height="'+sh.sz+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="fill:'+fv+';stroke:none">'+sh.svg.split('{F}').join(fv)+'</svg>'};}
  const ic=confettiIcons();return {c:'',f:'',html:rqIcon(ic[i%ic.length],16)};}
const SKIN_ICONS_ORIG={};
function applySkinIcons(skin){
  const set=SKIN_ICONS[skin]||{};
  Object.keys(SKIN_ICONS).forEach(function(k){Object.keys(SKIN_ICONS[k]).forEach(function(n){
    const sym=document.getElementById('i-'+n);if(!sym)return;
    if(!(n in SKIN_ICONS_ORIG))SKIN_ICONS_ORIG[n]=sym.innerHTML;
    const want=set[n]||SKIN_ICONS_ORIG[n];if(sym.innerHTML!==want)sym.innerHTML=want;});});
}
function applySkin(){if(typeof rqThemeSwitchFrame==='function')rqThemeSwitchFrame();setTimeout(syncThemeColor,0);
  const t=activeTheme(),h=document.documentElement;
  if(t.skin){h.dataset.skin=t.skin;if(t.night)h.dataset.theme='night';else delete h.dataset.theme;}
  else if(h.dataset.skin){delete h.dataset.skin;delete h.dataset.theme;}
  applySkinIcons(t.skin||'');
  if(typeof libTitleSync==='function')libTitleSync(); /* 18.10: the title names the active filter («Библиотека» for all books) */
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
 planned:{},customQuests:[],customStats:[],bookImp:{},notif:null,awardedSessionIds:[],dailyPaidDays:[],weeklyPaidWeeks:[],paidMigrated:false,bookLvl:{},bookLvlAi:{},bookLvlRep:{},lvlPaid:{},readSpans:{},quizPaid:{},pomoPaid:{},chalPaid:{}};
/* Single-writer: state lives in rq_v1 + IDB after bootStorage(). Never write legacy `readquest`. */
let S=Object.assign({},DEF);
let __rq=null;          // storage API from module boot
let __tracker=null;     // reader-session tracker
const DEFAULT_SKILLS=['Концентрация','Дисциплина','Аналитика','Скорочтение'];
const DEFAULT_SKILL_LINKS={Концентрация:{Воля:100,Интеллект:30},Дисциплина:{Воля:100},Аналитика:{Интеллект:100,Мудрость:40},Скорочтение:{Интеллект:60}};
/** 19.10 (arch.md): {key: whole number 0…max} — anything else dropped */
function lvlRepMap(o){ /* 23.10 «Оценка неверная» (arch.md): id → {w, d, t, au, k, a, tx, s, tm, m, au2, ti, p, ai}, ≤ 200 */
  const out={},lv=function(v){return Number.isInteger(v)&&v>=0&&v<=4?v:null;},num=function(v){return typeof v==='number'&&isFinite(v)?Math.round(v*10)/10:null;};
  if(o&&typeof o==='object'&&!Array.isArray(o))Object.keys(o).slice(-200).forEach(function(k){const v=o[k];
    if(!v||lv(v.w)==null||typeof v.d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.d))return;
    out[k]={w:v.w,d:v.d,t:typeof v.t==='string'?v.t.slice(0,120):'',au:typeof v.au==='string'?v.au.slice(0,80):'',k:v.k==='pdf'?'pdf':'text',
      a:lv(v.a),tx:lv(v.tx),s:num(v.s),tm:num(v.tm),m:num(v.m),au2:lv(v.au2),ti:lv(v.ti),p:num(v.p),ai:lv(v.ai)};});
  return out;
}
function spansMap(o){const out={};if(o&&typeof o==='object'&&!Array.isArray(o))Object.keys(o).slice(-500).forEach(function(k){if(!Array.isArray(o[k]))return;let end=-1;
  const l=o[k].filter(function(x){if(!Array.isArray(x)||x.length!==2||typeof x[0]!=='number'||typeof x[1]!=='number')return false;if(!(x[0]>=0&&x[1]<=1&&x[0]<x[1]&&x[0]>end))return false;end=x[1];return true;}).slice(0,300).map(function(x){return [x[0],x[1]];});
  if(l.length)out[k]=l;});return out;}
function lvlAiMap(o){const out={};if(o&&typeof o==='object'&&!Array.isArray(o))Object.keys(o).forEach(function(k){const v=o[k];if(v&&Number.isInteger(v.l)&&v.l>=0&&v.l<=4)out[k]={l:v.l,w:typeof v.w==='string'?v.w.slice(0,160):''};});return out;}
function lvlMap(o,max,keyRe){const out={};if(o&&typeof o==='object'&&!Array.isArray(o))Object.keys(o).forEach(function(k){const v=o[k];if(Number.isInteger(v)&&v>=0&&v<=max&&(!keyRe||keyRe.test(k)))out[k]=v;});return out;}
function hydrateS(raw){
  S=Object.assign({},DEF,raw||{});
  S.stats=Object.assign({},DEF.stats,S.stats||{});
  S.quotes=S.quotes||{};S.hl=S.hl||{};S.owned=S.owned||[];S.claimed=S.claimed||{};S.stickers=S.stickers||{};S.marks=S.marks||{};
  S.favs=S.favs||[];S.hidden=S.hidden||[];S.hist=S.hist||{};S.status=S.status||{};S.vocab=S.vocab||[];if(S.lastRead===undefined)S.lastRead=null;S.petXp=S.petXp||0;if(S.dailyClaim===undefined)S.dailyClaim=null;S.boss=S.boss||null;S.hourHist=(S.hourHist&&S.hourHist.length===24)?S.hourHist:new Array(24).fill(0);S.finishDates=S.finishDates||{};S.talents=S.talents||{};
  if(!S.anti)S.anti={minSec:12,maxMin:3,v:2};
  else if(!S.anti.v){S.anti.v=2;if(S.anti.maxMin===4)S.anti.maxMin=3;} /* Product: 3 min/page cap by default */
  S.awardedSessionIds=Array.isArray(S.awardedSessionIds)?S.awardedSessionIds:[];
  S.dailyPaidDays=Array.isArray(S.dailyPaidDays)?S.dailyPaidDays:[];S.weeklyPaidWeeks=Array.isArray(S.weeklyPaidWeeks)?S.weeklyPaidWeeks:[];
  S.readSpans=spansMap(S.readSpans);S.quizPaid=lvlMap(S.quizPaid,1000,/^\d{4}-\d{2}-\d{2}$/); /* 25.10 честное чтение (arch.md) = storage/schema.js spansMap */
  S.bookLvl=lvlMap(S.bookLvl,4);S.bookLvlAi=lvlAiMap(S.bookLvlAi);S.bookLvlRep=lvlRepMap(S.bookLvlRep); /* 22.10 = storage/schema.js lvlAiMap */S.lvlPaid=lvlMap(S.lvlPaid,1e6,/^\d{4}-\d{2}-\d{2}$/);S.pomoPaid=lvlMap(S.pomoPaid,1e6,/^\d{4}-\d{2}-\d{2}$/);S.chalPaid=lvlMap(S.chalPaid,1e6,/^\d{4}-\d{2}-\d{2}$/); /* 25.10 «Фокус» */ /* 19.10 book level (arch.md) */
  if(!S.skills)S.skills={Концентрация:0,Дисциплина:0,Аналитика:0,Скорочтение:0};
  if(!S.ux)S.ux={anim:true,wake:false,vibe:true,scale:100};
  S.bookDiff=S.bookDiff||{};S.bookStat=S.bookStat||{};S.covers=S.covers||{};
  if(S.autoDiff===undefined)S.autoDiff=true;
  if(!S.ai||typeof S.ai!=='object')S.ai={key:'',model:'',prov:'deepseek',base:''};
  aiNorm(S.ai);if(Array.isArray(S.vocab))S.vocab.forEach(vocabNorm);S.aiChat=aiChatNorm(S.aiChat);S.diaries=diaryNorm(S.diaries);if(typeof S.diaryAuto!=='boolean')S.diaryAuto=true;S.tts=ttsNorm(S.tts); /* 20.10 ИИ: arch.md */
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
/* one balance everywhere (bug 17.10: header 1800 while «Награды» said 600): every visible coin count is redrawn from S.gold
   on every save(), so no spend / gain path can leave the library header or the profile behind. Display only, no writes. */
function goldSync(){
  try{if(typeof libGoldRender==='function')libGoldRender();}catch(e){}
  const t=coinsP(goldDisp());[['rewBalance',t],['shopGold',t],['dGold',t]].forEach(function(x){const e=el(x[0]);if(e)e.textContent=x[1];});
  const mg=el('mvpGold');if(mg){mg.textContent=goldDisp();const gl=el('mvpGoldLbl');if(gl)gl.textContent=t.replace(/^\S+ /,'');}
  const q=el('qstGold');if(q)q.textContent=goldDisp()+' монет';
  const k=el('kGold');if(k)k.textContent=goldDisp();
}
function save(){
  goldSync();
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


/* 20.10 ИИ «Объясни» (arch.md): S.ai.prov/base добавлены; старые данные без prov: с ключом — это OpenAI (v6), без ключа — DeepSeek по умолчанию.
   vocab[].ex — объяснение ИИ, строка до 600 символов, иначе поле отбрасывается. */
function aiNorm(a){
  ['key','model','base'].forEach(function(k){if(typeof a[k]!=='string')a[k]='';});
  if(['deepseek','openrouter','openai','anthropic','custom'].indexOf(a.prov)<0){if(a.key)a.prov='openai';else{a.prov='deepseek';a.model='';}}
  a.base=a.base.slice(0,300);return a;
}
function vocabNorm(v){
  if(!v||typeof v!=='object')return;
  if('ex' in v&&typeof v.ex!=='string')delete v.ex;else if(typeof v.ex==='string')v.ex=v.ex.slice(0,600);
}
function diaryNorm(a){ /* = storage/schema.js diaryList; 25.10 «Дневники» (arch.md): [{id,t,b,bt,ba,cv,cc,pp,fn,fs,ink,rb,so,d,u,e:[{id,t,x,tp,ch,pg,r,d,u,pin}]}] ≤ 200, записей ≤ 1000 */
  const out=[],seen={},str=function(v,n){return typeof v==='string'?v.slice(0,n):'';},one=function(v,l,d){return l.indexOf(v)>=0?v:d;},
    day=function(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:'';},ms=function(v){return typeof v==='number'&&isFinite(v)&&v>=0?Math.floor(v):0;},
    key=function(v){return typeof v==='string'&&/^[a-z0-9-]{1,24}$/.test(v)?v:'';};
  if(!Array.isArray(a))return out;
  a.forEach(function(y){
    if(!y||typeof y!=='object'||typeof y.id!=='string'||!/^dy[a-z0-9]{1,22}$/.test(y.id)||seen[y.id]||out.length>=200)return;seen[y.id]=1;
    const es=[],eseen={};
    (Array.isArray(y.e)?y.e:[]).forEach(function(n){
      if(!n||typeof n!=='object'||typeof n.id!=='string'||!/^e[a-z0-9]{1,22}$/.test(n.id)||eseen[n.id]||es.length>=1000)return;
      const t=str(n.t,120),x=str(n.x,20000);if(!t&&!x)return;eseen[n.id]=1;
      es.push({id:n.id,t:t,x:x,tp:key(n.tp),ch:str(n.ch,120),pg:Number.isInteger(n.pg)&&n.pg>=0?n.pg:0,r:typeof n.r==='number'&&n.r>=0&&n.r<=1?n.r:null,d:day(n.d),u:ms(n.u),pin:n.pin===true});});
    out.push({id:y.id,t:str(y.t,80),b:str(y.b,200),bt:str(y.bt,120),ba:str(y.ba,80),cv:key(y.cv)||'school',cc:key(y.cc),
      pp:one(y.pp,['lines','grid','dots','plain','old'],'lines'),fn:one(y.fn,['hand','book','ui'],'hand'),fs:Number.isInteger(y.fs)&&y.fs>=14&&y.fs<=24?y.fs:17,
      ink:one(y.ink,['ink','blue','brown','green','violet'],'ink'),rb:one(y.rb,['red','blue','green','gold','black'],'red'),so:one(y.so,['book','date'],'book'),
      d:day(y.d),u:ms(y.u),e:es});});
  return out;
}
function aiChatNorm(o){ /* = storage/schema.js aiChatMap */
  const out={};
  if(o&&typeof o==='object'&&!Array.isArray(o))Object.keys(o).forEach(function(k){
    if(!Array.isArray(o[k]))return;
    const l=o[k].filter(function(m){return m&&(m.r==='u'||m.r==='a')&&typeof m.t==='string'&&m.t;})
      .map(function(m){return {r:m.r,t:m.t.slice(0,1500),d:typeof m.d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(m.d)?m.d:''};}).slice(-20);
    if(l.length)out[k]=l;});
  return out;
}
/* 20.10 нейросетевая озвучка (arch.md): prov system|openai|elevenlabs|google|custom, остальное строки */
function ttsNorm(t){
  if(!t||typeof t!=='object')t={};
  ['key','voice','base'].forEach(function(k){if(typeof t[k]!=='string')t[k]='';});
  if(['system','openai','elevenlabs','google','custom'].indexOf(t.prov)<0)t.prov='system';
  t.base=t.base.slice(0,300);t.voice=t.voice.slice(0,100);return t;
}
