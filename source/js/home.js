'use strict';
/* ===== «Домик читателя» (10.11, Джессика: «отдельная система с питомцами и домиком как в симс», выбран вариант Б).
   Своя система: домик в разрезе (2D) и питомец, которые оживают от чтения. Домик не выдаёт ни монет, ни опыта и ничего не
   показывает в самой книге: новости — одной плашкой в итоге сессии (#sumHome).
   Где: экран #homePage поверх приложения; вход — карточка #homeCard в профиле, вкладка «Домик» в магазине.
   Данные (arch.md 10.11): S.home (домен game, storage/schema.js normHome = homeNorm ниже).
   Лакомства: одно за каждые 10 засчитанных минут дня (row.minutes строк, уже прошедших честное чтение), не больше 6 в день,
   в запасе не больше 12. Рост питомца — от всех засчитанных минут, прочитанных с ним. Настроение — от минут за сегодня.
   Наказаний нет: без чтения питомец просто спит. */
const HM_TREAT_MIN=10,HM_TREAT_DAY=6,HM_TREAT_MAX=12;
const HM_STAGES=[['Малыш',0],['Подросток',120],['Взрослый',600],['Легенда',2400]];
const HM_BOND=[0,3,8,15,25,40];
const HM_BOND_N=['Знакомый','Приятель','Друг','Близкий друг','Лучший друг','Родная душа'];
const HM_BOND_GIFT=['','Радуется, когда вы заходите','Шарфик','Приносит закладку','Сердечко','Золотая звезда'];
const HM_MOODS=[['sleep','Спит'],['awake','Проснулся'],['glad','Доволен'],['happy','Счастлив']];
const HM_SKIN_NAME={pencil:'Карандашный',ellada:'Эллада',babochkovyi:'Бабочковый',celestial:'Небесный',alisa:'Страна чудес'};

/* ---------- палитры домика: скин переодевает домик так же, как остальное приложение ---------- */
const HM_PAL={
  '':{wall:'#e9efe6',wall2:'#dfe7dc',floor:'#c9a57a',floor2:'#b98f63',trim:'#f8f6ee',wood:'#8a5f3c',tex:'#4f9c86',tex2:'#3d7f6d',rug:'#e8b96a',sky:'#bfe3f2',sun:'#ffd766',lamp:'#ffd98a',line:'#3a3f3b',gold:'#d9a520',leaf:'#3f9a5a',pot:'#b8623e',grass:'#9ccc7a',grass2:'#86b964',sp:['#c45745','#3f7fa6','#e0b23e','#4c8f63','#8a5fa8','#d77f3f','#3b5c7a']},
  pencil:{wall:'#fbfaf6',wall2:'#f1efe8',floor:'#efece3',floor2:'#d9d5c8',trim:'#ffffff',wood:'#e6e2d6',tex:'#d8d4c8',tex2:'#c4c0b3',rug:'#e9e5da',sky:'#f4f6f7',sun:'#e3e0d6',lamp:'#f3edd2',line:'#4a4a4a',gold:'#d8d2bd',leaf:'#cfd6c6',pot:'#e0dbcf',grass:'#eef0e6',grass2:'#dfe2d4',sp:['#dedad0','#cfcbc0','#e9e6dc','#c4c0b6','#d6d2c7','#ebe8df','#bdb9af']},
  ellada:{wall:'#f3ecdd',wall2:'#e9dfc9',floor:'#d8c7a5',floor2:'#c4b08a',trim:'#fbf7ec',wood:'#9a6a3f',tex:'#2f5f8f',tex2:'#244b73',rug:'#b5532f',sky:'#9fd0e8',sun:'#ffe08a',lamp:'#ffdf9a',line:'#4a3a28',gold:'#c9a227',leaf:'#6f8f4a',pot:'#b5532f',grass:'#b7c98a',grass2:'#a2b575',sp:['#b5532f','#2f5f8f','#c9a227','#6f8f4a','#7a4a2c','#d9c7a0','#244b73'],col:1},
  celestial:{wall:'#262b55',wall2:'#2e3466',floor:'#3b3f73',floor2:'#31356a',trim:'#d9c58a',wood:'#4a3f7a',tex:'#7b6fd0',tex2:'#5e52b0',rug:'#d9c58a',sky:'#12163a',sun:'#f6efcf',lamp:'#ffe9a8',line:'#11142e',gold:'#f0d577',leaf:'#7fd0c0',pot:'#7b6fd0',grass:'#2f4a66',grass2:'#27405a',sp:['#f0d577','#7b6fd0','#7fd0c0','#e58fb0','#cdd6ff','#5e52b0','#d9c58a'],stars:1},
  babochkovyi:{wall:'#f6eef3',wall2:'#eedfe9',floor:'#b9d59a',floor2:'#a3c481',trim:'#fffaf2',wood:'#a47a55',tex:'#d77aa6',tex2:'#b95f8b',rug:'#f2c94c',sky:'#c9ecf5',sun:'#fff0a8',lamp:'#ffe6a3',line:'#4a3b45',gold:'#e8b93a',leaf:'#5fa64a',pot:'#d77aa6',grass:'#a9d688',grass2:'#93c470',sp:['#d77aa6','#8fc46a','#f2c94c','#7a5aa0','#6fb7d0','#e58a5a','#b95f8b'],fly:1},
  alisa:{wall:'#f3e9e4',wall2:'#ead9d2',floor:'#f7f2ea',floor2:'#2a2530',trim:'#ffffff',wood:'#5a3a3a',tex:'#b3262e',tex2:'#8f1d24',rug:'#d4a82a',sky:'#bfd9e8',sun:'#fff1b0',lamp:'#ffe2a0',line:'#2a2530',gold:'#d4a82a',leaf:'#4f8a55',pot:'#b3262e',grass:'#a8cf8e',grass2:'#8fbb74',sp:['#b3262e','#2a2530','#d4a82a','#3f6fa8','#f7f2ea','#8f1d24','#4f8a55'],chess:1}
};
function hmSkin(){const s=document.documentElement.dataset.skin||'';return HM_PAL[s]?s:'';}
function hmPal(){return HM_PAL[hmSkin()];}
function hmL(p,w){return ' stroke="'+p.line+'" stroke-width="'+(w||0.9)+'" stroke-linejoin="round" stroke-linecap="round"';}
const hR=function(p,x,y,w,h,rx,f){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(rx||0)+'" fill="'+f+'"'+hmL(p)+'/>';};
const hE=function(p,cx,cy,rx,ry,f){return '<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="'+ry+'" fill="'+f+'"'+hmL(p)+'/>';};
const hP=function(p,d,f){return '<path d="'+d+'" fill="'+f+'"'+hmL(p)+'/>';};
const hS=function(d,c,w){return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+(w||1.5)+'" stroke-linecap="round" stroke-linejoin="round"/>';};

/* ---------- каталог вещей. Начало координат: у пола — низ по центру, у стены и ковра — центр ---------- */
const HM_ITEMS=[
  {id:'armchair',n:'Кресло',t:'chair',price:0,d:function(p){return hR(p,-28,-62,56,52,12,p.tex)+hR(p,-34,-34,68,34,9,p.tex2)+hR(p,-22,-34,44,14,5,p.tex);}},
  {id:'rocker',n:'Кресло-качалка',t:'chair',price:160,d:function(p){return hR(p,-22,-66,44,44,10,p.rug)+hR(p,-28,-36,56,18,7,p.pot)+hS('M-22 -18v12M22 -18v12',p.wood,3)+hS('M-34 -5q34 12 68 0',p.wood,4);}},
  {id:'pouf',n:'Кресло-мешок',t:'chair',price:120,d:function(p){return hP(p,'M-32 0q-8 -30 14 -44q26 -10 44 12q12 22 -6 32z',p.tex)+hS('M-10 -26q12 8 26 0',p.tex2,2);}},
  {id:'bench',n:'Скамейка',t:'chair',price:140,d:function(p){return hS('M-28 -12v12M28 -12v12M-28 -44v24M28 -44v24',p.line,2.4)+hR(p,-34,-46,68,8,2,p.wood)+hR(p,-34,-34,68,8,2,p.wood)+hR(p,-36,-20,72,8,2,p.wood);}},
  {id:'lamp',n:'Торшер',t:'small',price:80,glow:1,d:function(p){return hS('M0 -56V0M-10 0h20',p.line,2)+hP(p,'M-10 -56h20l-5 -20h-10z',p.lamp);}},
  {id:'globe',n:'Глобус',t:'small',price:120,d:function(p){return hS('M0 -12V0M-9 0h18',p.line,2)+'<circle cx="0" cy="-26" r="14" fill="'+p.sky+'"'+hmL(p)+'/>'+hS('M-8 -32q8 4 6 12M4 -38q-4 10 6 16',p.leaf,2.4);}},
  {id:'ficus',n:'Фикус',t:'small',price:60,d:function(p){return hS('M0 -16V-52',p.leaf,2.4)+[[-8,-30,-30],[8,-36,30],[-7,-44,-40],[7,-50,35],[0,-57,90]].map(function(a){return '<ellipse cx="'+a[0]+'" cy="'+a[1]+'" rx="8" ry="4.4" fill="'+p.leaf+'"'+hmL(p,.7)+' transform="rotate('+a[2]+' '+a[0]+' '+a[1]+')"/>';}).join('')+hP(p,'M-10 -18h20l-3 18h-14z',p.pot);}},
  {id:'teatable',n:'Столик с чаем',t:'small',price:100,d:function(p){return hS('M0 -22V0M-10 0h20',p.wood,3)+hE(p,0,-24,18,5,p.wood)+hP(p,'M-6 -37h10v6q0 4 -5 4t-5 -4z',p.trim)+hS('M4 -35q5 0 4 4q-1 2 -4 2',p.line,1)+hS('M-3 -41q2 -3 0 -6M1 -41q2 -3 0 -6',p.line,.8);}},
  {id:'aquarium',n:'Аквариум',t:'small',price:200,d:function(p){return hR(p,-16,-22,32,22,2,p.wood)+hR(p,-18,-50,36,28,3,p.sky)+hP(p,'M-8 -36q6 -6 12 0q-6 6 -12 0zM4 -36l5 -4v8z',p.rug)+hS('M-12 -24q2 -8 0 -14M11 -24q-2 -6 1 -10',p.leaf,1.6);}},
  {id:'bookstack',n:'Стопка книг',t:'small',price:40,d:function(p){return [0,1,2,3].map(function(i){return hR(p,-14+(i%2)*3,-7-i*7,26-(i%2)*4,7,1,p.sp[i]);}).join('');}},
  {id:'picture',n:'Картина',t:'wall',price:60,d:function(p){return hR(p,-17,-14,34,28,2,p.trim)+hR(p,-13,-10,26,20,0,p.sky)+hP(p,'M-13 10l8 -12 6 7 5 -5 7 10z',p.leaf)+'<circle cx="7" cy="-4" r="2.6" fill="'+p.sun+'"/>';}},
  {id:'clock',n:'Часы',t:'wall',price:70,d:function(p){return '<circle r="14" fill="'+p.trim+'"'+hmL(p)+'/><circle r="11" fill="none" stroke="'+p.wood+'" stroke-width="1.6"/>'+hS('M0 0V-7M0 0h5',p.line,1.6);}},
  {id:'shelf',n:'Полочка',t:'wall',price:80,d:function(p){return hR(p,-19,6,38,4,1,p.wood)+hR(p,-15,-9,5,15,.6,p.sp[0])+hR(p,-10,-6,4,12,.6,p.sp[1])+hR(p,-6,-10,5,16,.6,p.sp[2])+hP(p,'M6 6h10l-2 -8h-6z',p.pot)+hS('M11 -2v-8M11 -6q-5 -3 -5 -7M11 -7q5 -2 5 -6',p.leaf,1.6);}},
  {id:'garland',n:'Гирлянда',t:'wall',price:90,d:function(p){return hS('M-20 -10q20 18 40 0',p.line,1)+[[-15,-4],[-8,1],[0,3],[8,1],[15,-4]].map(function(a,i){return '<circle cx="'+a[0]+'" cy="'+(a[1]+3)+'" r="3" fill="'+p.sp[i]+'"'+hmL(p,.6)+'/>';}).join('');}},
  {id:'rug',n:'Круглый ковёр',t:'rug',price:0,d:function(p){return hE(p,0,0,78,15,p.rug)+'<ellipse cx="0" cy="0" rx="62" ry="10" fill="none" stroke="'+p.line+'" stroke-width=".7" opacity=".5"/>';}},
  {id:'rug2',n:'Полосатый ковёр',t:'rug',price:60,d:function(p){return hE(p,0,0,78,15,p.tex)+'<ellipse cx="0" cy="0" rx="60" ry="10.5" fill="'+p.trim+'"/><ellipse cx="0" cy="0" rx="42" ry="7" fill="'+p.tex+'"/><ellipse cx="0" cy="0" rx="22" ry="3.6" fill="'+p.trim+'"/>';}},
  {id:'rug3',n:'Плед',t:'rug',price:60,d:function(p){let s=hP(p,'M-70 -12h130l12 24h-152z',p.pot);for(let i=-3;i<=3;i++)s+=hS('M'+(i*18-4)+' -12l'+(i*2-2)+' 24',p.trim,1.6);return s;}},
  {id:'bed',n:'Лежанка',t:'pet',price:120,d:function(p){return hE(p,0,-7,24,8,p.tex2)+hE(p,0,-9,17,5,p.trim);}},
  {id:'pethouse',n:'Домик питомца',t:'pet',price:200,d:function(p){return hR(p,-18,-22,36,22,2,p.wood)+hP(p,'M-22 -22l22 -16 22 16z',p.pot)+hP(p,'M-7 0v-10q0 -7 7 -7t7 7v10z',p.line);}},
  {id:'ball',n:'Мячик',t:'pet',price:40,d:function(p){return '<circle cx="0" cy="-8" r="8" fill="'+p.rug+'"'+hmL(p)+'/>'+hS('M-8 -8q8 -5 16 0M-6 -3q6 -4 12 0',p.pot,1.6);}},
  {id:'w-stripe',n:'В полоску',t:'wallp',price:0},{id:'w-dots',n:'В горошек',t:'wallp',price:150},{id:'w-plain',n:'Гладкие',t:'wallp',price:150},{id:'w-panel',n:'С панелями',t:'wallp',price:150},
  {id:'f-plank',n:'Доски',t:'floor',price:0},{id:'f-herring',n:'Ёлочка',t:'floor',price:150},{id:'f-tile',n:'Плитка',t:'floor',price:150},
  /* наборы скинов: вещи живут только в своём скине, как вещи героя */
  {id:'el-amphora',n:'Амфора',t:'small',set:'set-ellada',d:function(p){return hP(p,'M-5 -44h10v6q10 8 8 22q-2 12 -9 16h-8q-7 -4 -9 -16q-2 -14 8 -22z',p.pot)+hS('M-5 -40q-9 2 -7 12M5 -40q9 2 7 12',p.line,1.4)+hS('M-11 -20h22',p.line,1.2);}},
  {id:'el-bust',n:'Бюст мудреца',t:'small',set:'set-ellada',d:function(p){return hR(p,-9,-28,18,28,1,p.trim)+hR(p,-12,-31,24,4,1,p.trim)+hP(p,'M-10 -31q0 -9 10 -10q10 1 10 10z',p.wall2)+'<circle cx="0" cy="-48" r="8" fill="'+p.wall2+'"'+hmL(p)+'/>'+hS('M-7 -52q7 -6 14 0',p.gold,2);}},
  {id:'el-klismos',n:'Клисмос',t:'chair',set:'set-ellada',d:function(p){return hS('M-20 -30q-8 16 -10 30M20 -30q8 16 10 30',p.wood,3.4)+hS('M20 -30q4 -18 -2 -34',p.wood,3.4)+hR(p,8,-66,16,12,3,p.wood)+hR(p,-24,-36,48,9,3,p.tex);}},
  {id:'el-shield',n:'Щит гоплита',t:'wall',set:'set-ellada',d:function(p){return '<circle r="15" fill="'+p.gold+'"'+hmL(p)+'/><circle r="11" fill="'+p.pot+'"'+hmL(p,.7)+'/>'+hS('M-6 4v-8h12v8M-6 0h12',p.trim,1.6);}},
  {id:'pc-easel',n:'Мольберт',t:'small',set:'set-pencil',d:function(p){return hS('M-12 0l8 -54M12 0l-8 -54M0 -8V-54',p.line,1.8)+hR(p,-14,-50,28,30,1,p.trim)+hS('M-9 -28q5 -12 9 -4t9 -8',p.line,1.2)+hS('M-15 -18h30',p.line,2);}},
  {id:'pc-lantern',n:'Бумажный фонарик',t:'small',set:'set-pencil',d:function(p){return hS('M0 -62v10',p.line,1)+hE(p,0,-38,12,15,p.lamp)+hS('M-7 -50q-4 12 0 24M7 -50q4 12 0 24M0 -53v30',p.line,.8)+hS('M0 -23v8',p.line,1.4);}},
  {id:'pc-stool',n:'Табурет художника',t:'chair',set:'set-pencil',d:function(p){return hS('M-16 -30l-6 30M16 -30l6 30M-18 -12h36',p.line,2.2)+hE(p,0,-32,22,6,p.wood);}},
  {id:'pc-sketch',n:'Набросок',t:'wall',set:'set-pencil',d:function(p){return hR(p,-15,-18,30,36,1,p.trim)+'<circle cx="0" cy="-6" r="6" fill="none"'+hmL(p,1)+'/>'+hS('M-9 14q9 -16 18 0',p.line,1)+hS('M-15 -18l4 4',p.line,1);}},
  {id:'cl-telescope',n:'Телескоп',t:'small',set:'set-celestial',d:function(p){return hS('M0 -30l-12 30M0 -30l12 30M0 -30v30',p.trim,2)+hP(p,'M-20 -34l34 -18 5 10 -34 18z',p.gold)+hP(p,'M14 -52l6 -3 5 10 -6 3z',p.tex);}},
  {id:'cl-sphere',n:'Небесная сфера',t:'small',set:'set-celestial',d:function(p){return hS('M0 -14V0M-9 0h18',p.trim,2)+'<circle cx="0" cy="-30" r="15" fill="none" stroke="'+p.gold+'" stroke-width="2"/>'+'<ellipse cx="0" cy="-30" rx="15" ry="5" fill="none" stroke="'+p.gold+'" stroke-width="1.4"/><ellipse cx="0" cy="-30" rx="5" ry="15" fill="none" stroke="'+p.gold+'" stroke-width="1.4"/><circle cx="0" cy="-30" r="3.4" fill="'+p.leaf+'"/>';}},
  {id:'cl-moonchair',n:'Кресло-полумесяц',t:'chair',set:'set-celestial',d:function(p){return hP(p,'M22 -66q-46 6 -46 40q0 24 30 26q26 0 30 -18q-30 12 -40 -12q-6 -22 26 -36z',p.gold)+hE(p,6,-18,18,7,p.tex);}},
  {id:'cl-starmap',n:'Карта созвездий',t:'wall',set:'set-celestial',d:function(p){return hR(p,-18,-14,36,28,2,p.sky)+hS('M-12 6l6 -10 8 4 8 -10',p.gold,.9)+[[-12,6],[-6,-4],[2,0],[10,-10],[8,7]].map(function(a){return '<circle cx="'+a[0]+'" cy="'+a[1]+'" r="1.7" fill="'+p.gold+'"/>';}).join('');}},
  {id:'bb-mushroom',n:'Гриб-столик',t:'small',set:'set-babochkovyi',d:function(p){return hP(p,'M-7 0q2 -12 -1 -24h16q-3 12 -1 24z',p.trim)+hP(p,'M-22 -22q2 -22 22 -22t22 22z',p.tex)+'<circle cx="-8" cy="-32" r="3" fill="'+p.trim+'"/><circle cx="6" cy="-36" r="3.6" fill="'+p.trim+'"/><circle cx="12" cy="-27" r="2" fill="'+p.trim+'"/>';}},
  {id:'bb-jar',n:'Банка светлячков',t:'small',set:'set-babochkovyi',glow:1,d:function(p){return hR(p,-11,-30,22,30,6,p.sky)+hR(p,-8,-35,16,6,1,p.wood)+[[-4,-10],[3,-18],[-2,-23],[5,-8]].map(function(a){return '<circle cx="'+a[0]+'" cy="'+a[1]+'" r="2" fill="'+p.sun+'"/>';}).join('');}},
  {id:'bb-flowerchair',n:'Кресло-цветок',t:'chair',set:'set-babochkovyi',d:function(p){return [-24,-8,8,24].map(function(x,i){return hE(p,x,-46-(i===1||i===2?8:0),13,20,p.tex);}).join('')+hE(p,0,-22,30,12,p.rug)+hS('M0 -10V0M-14 0h28',p.leaf,3);}},
  {id:'bb-herbarium',n:'Гербарий',t:'wall',set:'set-babochkovyi',d:function(p){return hR(p,-15,-18,30,36,2,p.trim)+hS('M0 14V-8',p.leaf,1.4)+hE(p,-5,0,5,2.6,p.leaf)+hE(p,5,-5,5,2.6,p.leaf)+'<circle cx="0" cy="-10" r="4" fill="'+p.tex+'"'+hmL(p,.7)+'/>';}},
  {id:'al-teatable',n:'Чайный стол',t:'small',set:'set-alisa',d:function(p){return hS('M0 -22V0M-10 0h20',p.wood,3)+hP(p,'M-20 -26h40l-4 10h-32z',p.trim)+hP(p,'M-8 -40h12v8q0 5 -6 5t-6 -5z',p.tex)+hS('M4 -38q6 0 5 5q-1 3 -5 2',p.line,1)+hP(p,'M-14 -30h8l-1 4h-6z',p.gold);}},
  {id:'al-hatstand',n:'Шляпа на вешалке',t:'small',set:'set-alisa',d:function(p){return hS('M0 -50V0M-10 0h20M0 -40l-10 -6M0 -40l10 -6',p.wood,2.4)+hR(p,-8,-70,16,16,1,p.line)+hE(p,0,-54,14,3.4,p.line)+hR(p,-8,-60,16,4,0,p.tex);}},
  {id:'al-throne',n:'Трон червей',t:'chair',set:'set-alisa',d:function(p){return hR(p,-24,-70,48,64,6,p.tex)+hP(p,'M0 -42q-10 -12 -10 -4q0 6 10 14q10 -8 10 -14q0 -8 -10 4z',p.trim)+hR(p,-30,-32,60,32,6,p.tex2)+hR(p,-20,-32,40,12,4,p.gold);}},
  {id:'al-clock',n:'Карманные часы',t:'wall',set:'set-alisa',d:function(p){return hS('M0 -14v-6',p.gold,2)+'<circle cx="0" cy="-20" r="3" fill="none" stroke="'+p.gold+'" stroke-width="1.6"/><circle cy="2" r="14" fill="'+p.gold+'"'+hmL(p)+'/><circle cy="2" r="10.5" fill="'+p.trim+'"/>'+hS('M0 2V-5M0 2h6',p.line,1.5);}},
  {id:'set-ellada',n:'Набор «Эллада»',t:'set',skin:'ellada',price:600},{id:'set-pencil',n:'Набор «Карандашный»',t:'set',skin:'pencil',price:600},
  {id:'set-celestial',n:'Набор «Небесный»',t:'set',skin:'celestial',price:600},{id:'set-babochkovyi',n:'Набор «Бабочковый»',t:'set',skin:'babochkovyi',price:600},
  {id:'set-alisa',n:'Набор «Страна чудес»',t:'set',skin:'alisa',price:600}
];
HM_ITEMS.forEach(function(it){if(it.set){it.skin=it.set.slice(4);it.price=0;}});
const HM_TYPE_N={chair:'Кресло',small:'Мебель',wall:'На стену',rug:'Ковёр',pet:'Питомцу',wallp:'Обои',floor:'Пол'};
function hmItem(id){return HM_ITEMS.find(function(x){return x.id===id;})||null;}

/* ---------- питомцы ---------- */
const HM_PETS=[
  {id:'fox',n:'Лисёнок',kind:'fox',price:0,c:['#e2853a','#fff3e2']},
  {id:'owlet',n:'Совёнок',kind:'owl',price:350,c:['#9a7650','#f4e6cd']},
  {id:'cat',n:'Кот-библиотекарь',kind:'cat',price:350,c:['#8e9399','#eef0f2']},
  {id:'dragon',n:'Книжный дракончик',kind:'dragon',price:350,c:['#58b06a','#e6f3c9']},
  {id:'gr-owl',n:'Сова Афины',kind:'owl',skin:'ellada',hero:1,c:['#8a6b4a','#f1e4cc']},
  {id:'pc-paper-cat',n:'Бумажный кот',kind:'cat',skin:'pencil',hero:1,c:['#f4f1e8','#ffffff']},
  {id:'pc-crane',n:'Журавлик',kind:'crane',skin:'pencil',hero:1,c:['#f7f5ee','#e2ded2']},
  {id:'cl-starfox',n:'Звёздный лис',kind:'fox',skin:'celestial',price:350,c:['#cdd6ff','#ffffff']},
  {id:'bb-cater',n:'Гусеница',kind:'cater',skin:'babochkovyi',price:350,c:['#8fc46a','#f2c94c']},
  {id:'al-mouse',n:'Соня',kind:'mouse',skin:'alisa',price:350,c:['#b89a7a','#f5ead9']}
];
function hmPetDef(id){return HM_PETS.find(function(x){return x.id===id;})||null;}
function hmPetPrice(pd){if(!pd)return 0;if(pd.hero){const g=typeof heroItem==='function'?heroItem(pd.id):null;return g?g.price:350;}return pd.price;}

/* ---------- state (= storage/schema.js normHome) ---------- */
function homeNorm(o){
  o=o&&typeof o==='object'&&!Array.isArray(o)?o:{};
  const DAY=/^\d{4}-\d{2}-\d{2}$/,ID=/^[a-z0-9-]{1,24}$/,map=function(x){return x&&typeof x==='object'&&!Array.isArray(x)?x:{};};
  const str=function(v,n){return typeof v==='string'?v.slice(0,n):'';};
  const h={pet:{},pets:{},gm:{},bond:{},nm:{},treats:0,tr:null,own:{},put:{},fin:[],q:[]};
  Object.keys(map(o.pet)).slice(0,20).forEach(function(k){if(/^[a-z]{0,14}$/.test(k)&&typeof o.pet[k]==='string'&&ID.test(o.pet[k]))h.pet[k]=o.pet[k];});
  Object.keys(map(o.pets)).slice(0,60).forEach(function(k){if(ID.test(k)&&o.pets[k])h.pets[k]=1;});
  Object.keys(map(o.gm)).slice(0,60).forEach(function(k){const v=o.gm[k];if(ID.test(k)&&typeof v==='number'&&Number.isFinite(v)&&v>0)h.gm[k]=Math.min(1e7,Math.round(v*1000)/1000);});
  Object.keys(map(o.bond)).slice(0,60).forEach(function(k){const v=o.bond[k];if(ID.test(k)&&Number.isInteger(v)&&v>0)h.bond[k]=Math.min(v,100000);});
  Object.keys(map(o.nm)).slice(0,60).forEach(function(k){const v=str(o.nm[k],16).trim();if(ID.test(k)&&v)h.nm[k]=v;});
  if(Number.isInteger(o.treats)&&o.treats>0)h.treats=Math.min(o.treats,12);
  const t=map(o.tr);if(DAY.test(t.d)&&Number.isInteger(t.k)&&t.k>=0&&t.k<=6&&typeof t.m==='number'&&t.m>=0&&t.m<1440)h.tr={d:t.d,k:t.k,m:Math.round(t.m*1000)/1000};
  Object.keys(map(o.own)).slice(0,300).forEach(function(k){if(ID.test(k)&&o.own[k])h.own[k]=1;});
  Object.keys(map(o.put)).slice(0,100).forEach(function(k){const v=o.put[k];if(/^[a-z]{1,10}:[a-z0-9]{1,8}$/.test(k)&&typeof v==='string'&&(v==='-'||ID.test(v)))h.put[k]=v;});
  const seen={};(Array.isArray(o.fin)?o.fin:[]).slice(0,1000).forEach(function(x){if(!x||typeof x!=='object')return;const id=str(x.id,120);if(!id||seen[id])return;seen[id]=1;
    h.fin.push({id:id,t:str(x.t,80),a:str(x.a,60),d:DAY.test(x.d)?x.d:''});});
  (Array.isArray(o.q)?o.q:[]).slice(0,3).forEach(function(x){if(!x||typeof x!=='object')return;const tx=str(x.t,240).trim();if(tx)h.q.push({t:tx,a:str(x.a,80)});});
  return h;
}
const HOME_OK=new WeakSet();
function HS(){if(!S.home||!HOME_OK.has(S.home)){S.home=homeNorm(S.home);HOME_OK.add(S.home);}return S.home;}
function hmWriteOk(){if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне');return false;}return true;}

/* ---------- питомец: кто, сколько вырос, настроение, привязанность ---------- */
function hmPetOwned(id){const pd=hmPetDef(id);if(!pd)return false;if(pd.hero)return (S.ownedGear||[]).indexOf(id)>=0;return pd.price===0||!!HS().pets[id];}
function hmPetHere(pd){return !!pd&&(!pd.skin||pd.skin===hmSkin());}
/** выбранный питомец этого скина; питомец чужого скина здесь не виден — тогда общий, иначе лисёнок */
function hmPetId(){const H=HS(),sk=hmSkin(),ok=function(id){const pd=hmPetDef(id);return hmPetHere(pd)&&hmPetOwned(id);};
  if(sk&&ok(H.pet[sk]))return H.pet[sk];if(ok(H.pet['']))return H.pet[''];return 'fox';}
function hmPetName(id){id=id||hmPetId();return HS().nm[id]||hmPetDef(id).n;}
function hmStage(id){const m=HS().gm[id||hmPetId()]||0;let st=0;for(let i=0;i<HM_STAGES.length;i++)if(m>=HM_STAGES[i][1])st=i;return st;}
function hmMoodOf(min){return min>=30?3:min>=10?2:min>0?1:0;}
function hmMood(){let m=0;try{m=dayMin(today());}catch(e){}return hmMoodOf(m);}
function hmBondLvl(id){const b=HS().bond[id||hmPetId()]||0;let l=0;for(let i=0;i<HM_BOND.length;i++)if(b>=HM_BOND[i])l=i;return l;}
function hmMinText(m){m=Math.max(0,Math.round(m));const h=Math.floor(m/60),r=m%60;return h?(h+' ч'+(r?' '+r+' мин':'')):(r+' мин');}

/* рисунок питомца: начало координат — низ по центру, смотрит влево */
function hmPetSvg(id,o){
  o=o||{};const pd=hmPetDef(id)||HM_PETS[0],p=hmPal(),st=o.stage==null?hmStage(id):o.stage,bl=o.bond==null?hmBondLvl(id):o.bond;
  const b=pd.c[0],l=pd.c[1],k=p.line,sc=(o.s||1)*[0.72,0.9,1.08,1.08][st],L=' stroke="'+k+'" stroke-width="'+(0.9/sc).toFixed(2)+'" stroke-linejoin="round" stroke-linecap="round"';
  const eyes=function(x1,x2,y,r){return o.sleep?'<path d="M'+(x1-1.4)+' '+y+'q1.4 1.3 2.8 0M'+(x2-1.4)+' '+y+'q1.4 1.3 2.8 0" fill="none"'+L+'/>':'<circle cx="'+x1+'" cy="'+y+'" r="'+(r||1.25)+'" fill="'+k+'"/><circle cx="'+x2+'" cy="'+y+'" r="'+(r||1.25)+'" fill="'+k+'"/>';};
  let s='',top=-30,hx=-9;
  if(pd.kind==='owl'){hx=-1;top=-28;
    s='<ellipse cx="-1" cy="-12" rx="10.5" ry="12" fill="'+b+'"'+L+'/><ellipse cx="-1" cy="-8" rx="6.4" ry="7.4" fill="'+l+'"/><path d="M-10.5 -21l1 -6.5 4.5 4.4zM8.5 -21l-1 -6.5 -4.5 4.4z" fill="'+b+'"'+L+'/>'+
      (o.sleep?'':'<circle cx="-5" cy="-17" r="3.3" fill="#fff"'+L+'/><circle cx="3" cy="-17" r="3.3" fill="#fff"'+L+'/>')+eyes(-5,3,-17,1.3)+'<path d="M-2 -14l1 2.6 1 -2.6z" fill="'+p.gold+'"/>'+
      '<path d="M-5 0v-2M3 0v-2" fill="none"'+L+'/>';}
  else if(pd.kind==='crane'){hx=-14;top=-30;
    s='<path d="M-6 -8l18 -12 2 14z" fill="'+l+'"'+L+'/><path d="M-10 -6l14 -6 12 10 -14 2z" fill="'+b+'"'+L+'/><path d="M-10 -6l-5 -20 6 14z" fill="'+b+'"'+L+'/><path d="M-15 -26l-7 3 6 1z" fill="'+p.gold+'"'+L+'/>'+
      '<path d="M16 -2l8 -6 -4 8z" fill="'+b+'"'+L+'/><path d="M0 -2v2M5 -2v2" fill="none"'+L+'/>'+(o.sleep?'':'<circle cx="-14.6" cy="-23.6" r=".9" fill="'+k+'"/>');}
  else if(pd.kind==='cater'){
    if(st<2){hx=-14;top=-20;s=[10,3,-4].map(function(x,i){return '<circle cx="'+x+'" cy="'+(-6-(i%2))+'" r="6" fill="'+(i%2?l:b)+'"'+L+'/>';}).join('')+'<circle cx="-12" cy="-9" r="7.4" fill="'+b+'"'+L+'/>'+
      '<path d="M-15 -16q-2 -5 -5 -5M-10 -16q1 -5 4 -5" fill="none"'+L+'/>'+eyes(-15,-10,-10,1.1);}
    else{hx=0;top=-34;s='<path d="M0 -14q-22 -22 -24 -4q0 10 24 6q-16 4 -14 12q8 6 14 -10z" fill="'+b+'"'+L+'/><path d="M0 -14q22 -22 24 -4q0 10 -24 6q16 4 14 12q-8 6 -14 -10z" fill="'+b+'"'+L+'/>'+
      '<circle cx="-14" cy="-16" r="3" fill="'+l+'"/><circle cx="14" cy="-16" r="3" fill="'+l+'"/><ellipse cx="0" cy="-12" rx="2.4" ry="10" fill="'+k+'"/><path d="M-1 -22q-3 -6 -6 -6M1 -22q3 -6 6 -6" fill="none"'+L+'/>';}}
  else{ /* fox, cat, dragon, mouse: общее тело */
    const fox=pd.kind==='fox',cat=pd.kind==='cat',dr=pd.kind==='dragon',ms=pd.kind==='mouse';
    if(fox)s+='<path d="M9 -5c12 -1 15 -11 11 -20c-7 3 -12 9 -14 16z" fill="'+b+'"'+L+'/><path d="M20 -25c2 4 2 7 0 10c-2 -2 -3 -5 -2.6 -8.6z" fill="'+l+'"/>';
    if(cat)s+='<path d="M11 -6q12 -2 9 -18" fill="none" stroke="'+k+'" stroke-width="'+(4.6/1).toFixed(1)+'" stroke-linecap="round"/><path d="M11 -6q12 -2 9 -18" fill="none" stroke="'+b+'" stroke-width="3" stroke-linecap="round"/>';
    if(ms)s+='<path d="M12 -5q12 2 10 -8q-2 -6 -8 -2" fill="none"'+L+'/>';
    if(dr)s+='<path d="M10 -6q10 0 16 -8l-3 9q-6 4 -13 3z" fill="'+b+'"'+L+'/><path d="M2 -14q4 -16 16 -14q-2 6 -8 8q4 2 2 6z" fill="'+l+'"'+L+'/>';
    s+='<ellipse cx="1" cy="-8" rx="12" ry="8.5" fill="'+b+'"'+L+'/>'+(dr?'<ellipse cx="0" cy="-5" rx="7" ry="4.6" fill="'+l+'"/>':'')+
      '<rect x="-7" y="-4" width="4" height="5" rx="1.6" fill="'+b+'"'+L+'/><rect x="5" y="-4" width="4" height="5" rx="1.6" fill="'+b+'"'+L+'/>';
    if(ms)s+='<circle cx="-15" cy="-25" r="5" fill="'+b+'"'+L+'/><circle cx="-3" cy="-25" r="5" fill="'+b+'"'+L+'/><circle cx="-15" cy="-25" r="2.6" fill="'+l+'"/><circle cx="-3" cy="-25" r="2.6" fill="'+l+'"/>';
    else if(dr)s+='<path d="M-14 -25l-1 -7 4 4zM-4 -25l1 -7 -4 4z" fill="'+l+'"'+L+'/>';
    else s+='<path d="M-16 -23l'+(cat?'1 -8 6 4':'0.5 -10 6.5 6')+'zM-2 -23l'+(cat?'-1 -8 -6 4':'-0.5 -10 -6.5 6')+'z" fill="'+b+'"'+L+'/>';
    s+='<circle cx="-9" cy="-18" r="8.6" fill="'+b+'"'+L+'/>'+(cat?'':'<ellipse cx="-9" cy="-14.6" rx="5" ry="3.6" fill="'+l+'"/>')+eyes(-12.2,-5.8,-19)+
      '<circle cx="-9" cy="-15.6" r="1.1" fill="'+k+'"/>'+(cat||ms?'<path d="M-13 -15h-6M-13 -13.6l-5 1.6M-5 -15h6M-5 -13.6l5 1.6" fill="none" stroke="'+k+'" stroke-width=".5"/>':'');
    top=ms?-31:-33;}
  /* подарки привязанности: шарфик, закладка, сердечко, звезда */
  if(bl>=2&&pd.kind!=='cater'&&pd.kind!=='crane')s+='<path d="M'+(hx-6)+' -11q6 3 12 0v3q-6 3 -12 0z" fill="'+p.tex+'"'+L+'/><path d="M'+(hx+4)+' -9l3 7h-4z" fill="'+p.tex+'"'+L+'/>';
  if(bl>=3&&!o.sleep&&!o.bare)s+='<path d="M-24 -1v-13h7v13l-3.5 -3z" fill="'+p.pot+'"'+L+'/>';
  if(bl>=4&&!o.sleep&&!o.bare)s+='<path d="M'+(hx+12)+' '+(top+2)+'q-4 -5 -4 -1.6q0 2.4 4 5.6q4 -3.2 4 -5.6q0 -3.4 -4 1.6z" fill="'+p.tex+'"'+L+'/>';
  if(st>=3)s+='<path d="M'+(hx-5.5)+' '+(top+6)+'l1.2 -6 2.4 3.6 1.9 -4.6 1.9 4.6 2.4 -3.6 1.2 6z" fill="'+p.gold+'"'+L+'/>';
  if(bl>=5)s+='<path d="M'+(hx-13)+' '+(top+3)+'l1.2 2.6 2.8 .3 -2.1 1.9 .6 2.8 -2.5 -1.4 -2.5 1.4 .6 -2.8 -2.1 -1.9 2.8 -.3z" fill="'+p.gold+'"'+L+'/>';
  if(o.sleep)s+='<text x="'+(hx+10)+'" y="'+(top+2)+'" font-size="7" font-weight="700" fill="'+k+'" opacity=".6" style="font-family:sans-serif">z z</text>';
  return '<g class="hmpet'+(o.cls?' '+o.cls:'')+'" transform="translate('+(o.x||0)+' '+(o.y||0)+') scale('+sc.toFixed(3)+')">'+s+'</g>';
}
function hmPetIcon(id,o){return '<svg class="hmpetic" viewBox="-30 -42 60 46" aria-hidden="true" focusable="false">'+hmPetSvg(id,Object.assign({bare:1},o||{}))+'</svg>';}

/* ---------- комнаты и места ---------- */
const HM_ROOMS=[
  {id:'main',n:'Комната',lvl:1,pet:[150,204],hero:[196,188],slots:[{id:'w1',t:'wall',x:296,y:52},{id:'rug',t:'rug',x:150,y:204,def:'rug'},{id:'chair',t:'chair',x:250,y:176,def:'armchair'},{id:'s1',t:'small',x:299,y:170},{id:'s2',t:'small',x:108,y:170},{id:'pet',t:'pet',x:38,y:218}]},
  {id:'attic',n:'Чердак',lvl:5,pet:[160,206],hero:[118,188],slots:[{id:'w1',t:'wall',x:88,y:96},{id:'w2',t:'wall',x:232,y:96},{id:'rug',t:'rug',x:160,y:206},{id:'chair',t:'chair',x:232,y:176},{id:'s1',t:'small',x:288,y:170},{id:'s2',t:'small',x:176,y:170},{id:'pet',t:'pet',x:60,y:218}]},
  {id:'garden',n:'Сад',lvl:10,pet:[150,206],hero:[190,190],slots:[{id:'rug',t:'rug',x:150,y:208},{id:'chair',t:'chair',x:246,y:178},{id:'s1',t:'small',x:300,y:172},{id:'s2',t:'small',x:128,y:172},{id:'pet',t:'pet',x:40,y:218}]}
];
function hmRoom(id){return HM_ROOMS.find(function(r){return r.id===id;})||HM_ROOMS[0];}
function hmLevel(){try{return level(Number(S.xp)||0);}catch(e){return 1;}}
function hmRoomOpen(r){return hmLevel()>=r.lvl;}
function hmOwns(id){const it=hmItem(id);if(!it)return false;if(it.set)return !!HS().own[it.set];return it.price===0||!!HS().own[id];}
function hmHere(it){return !!it&&(!it.skin||it.skin===hmSkin());}
/** что стоит на месте: выбранная вещь (если она куплена и видна в этом скине), иначе вещь по умолчанию, иначе пусто */
function hmPutItem(rid,sl){const v=HS().put[rid+':'+sl.id];if(v==='-')return null;const it=hmItem(v);
  if(it&&it.t===sl.t&&hmOwns(v)&&hmHere(it))return it;return sl.def?hmItem(sl.def):null;}
function hmCover(rid,t){const it=hmItem(HS().put[rid+':'+t]);return it&&it.t===t&&hmOwns(it.id)?it.id:(t==='wallp'?'w-stripe':'f-plank');}

/* ---------- сцена ---------- */
function hmWallSvg(p,id,x,y,w,h){let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+p.wall+'"/>';
  if(id==='w-stripe')for(let i=0;i*20<w;i++)s+='<rect x="'+(x+i*20)+'" y="'+y+'" width="'+Math.min(10,w-i*20)+'" height="'+h+'" fill="'+p.wall2+'" opacity=".6"/>';
  if(id==='w-dots')for(let r=0;r*14<h-4;r++)for(let c=0;c*16<w-4;c++)s+='<circle cx="'+(x+8+c*16+(r%2?8:0))+'" cy="'+(y+8+r*14)+'" r="2.2" fill="'+p.wall2+'"/>';
  if(id==='w-panel'){s+='<rect x="'+x+'" y="'+(y+h*0.58)+'" width="'+w+'" height="'+(h*0.42)+'" fill="'+p.wall2+'"/>';for(let i=0;i*32<w;i++)s+='<rect x="'+(x+i*32+5)+'" y="'+(y+h*0.58+6)+'" width="22" height="'+Math.max(4,h*0.42-14)+'" fill="none" stroke="'+p.line+'" stroke-width=".6" opacity=".35"/>';s+='<path d="M'+x+' '+(y+h*0.58)+'h'+w+'" stroke="'+p.line+'" stroke-width=".8" opacity=".5"/>';}
  return s;}
function hmFloorSvg(p,id,x,y,w,h){let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+p.floor+'"/>';
  if(p.chess&&id==='f-plank')id='f-tile'; /* Страна чудес: пол шахматный, пока не выбран свой */
  if(id==='f-tile'){const q=h/3;for(let r=0;r<3;r++)for(let c=0;c*q<w;c++)if((r+c)%2)s+='<rect x="'+(x+c*q)+'" y="'+(y+r*q)+'" width="'+Math.min(q,w-c*q)+'" height="'+q+'" fill="'+p.floor2+'"/>';}
  else if(id==='f-herring'){for(let c=0;c*14<w+14;c++)s+='<path d="M'+(x+c*14)+' '+y+'l7 '+(h/4)+'l-7 '+(h/4)+'l7 '+(h/4)+'l-7 '+(h/4)+'" fill="none" stroke="'+p.floor2+'" stroke-width="1.1"/>';}
  else{const q=h/4;for(let i=1;i<4;i++)s+='<path d="M'+x+' '+(y+i*q)+'h'+w+'" stroke="'+p.floor2+'" stroke-width="1.2"/>';for(let i=0;i*40<w;i++)s+='<path d="M'+(x+i*40+(i%2?14:0))+' '+(y+(i%4)*q)+'v'+q+'" stroke="'+p.floor2+'" stroke-width="1.2"/>';}
  return s;}
function hmSpines(p,x,y,w,from,n,seed){let s='',cx=x,i=0;while(cx<x+w-5&&i<n){const k=from+i,bw=4+((k*7+seed)%3),bh=16+((k*5+seed)%7);s+='<rect x="'+cx+'" y="'+(y-bh)+'" width="'+bw+'" height="'+bh+'" rx=".6" fill="'+p.sp[(k+seed)%p.sp.length]+'" stroke="'+p.line+'" stroke-width=".5"/>';cx+=bw+0.8;i++;}return [s,i];}
function hmFlower(p,x,y,st){const n=Math.max(0,Math.min(7,st|0));let s='<path d="M'+x+' '+y+'V'+(y-5-n*3)+'" stroke="'+p.leaf+'" stroke-width="2"/>';
  for(let i=0;i<Math.min(n,6);i++){const lx=x+(i%2?5:-5),ly=y-6-i*3.2;s+='<ellipse cx="'+lx+'" cy="'+ly+'" rx="4.5" ry="2.2" fill="'+p.leaf+'" transform="rotate('+(i%2?-25:25)+' '+lx+' '+ly+')"/>';}
  if(n>=7)s+='<circle cx="'+x+'" cy="'+(y-8-n*3)+'" r="4.2" fill="'+p.rug+'"'+hmL(p)+'/><circle cx="'+x+'" cy="'+(y-8-n*3)+'" r="1.5" fill="'+p.pot+'"/>';
  else if(n>=4)s+='<circle cx="'+x+'" cy="'+(y-7-n*3)+'" r="2.6" fill="'+p.rug+'"'+hmL(p,.7)+'/>';
  return s+hP(p,'M'+(x-6)+' '+(y-8)+'h12l-2 9h-8z',p.pot);}
function hmWindow(p,x,y,w,h,o){let s=hR(p,x-6,y-6,w+12,h+12,3,p.trim)+hR(p,x,y,w,h,0,o.dim&&!p.stars?'#8fa3c2':p.sky)+'<circle cx="'+(x+w-16)+'" cy="'+(y+16)+'" r="8" fill="'+(o.dim&&!p.stars?'#eef0f6':p.sun)+'"/>';
  if(p.stars||o.dim)s+='<circle cx="'+(x+12)+'" cy="'+(y+12)+'" r="1.3" fill="#fff"/><circle cx="'+(x+26)+'" cy="'+(y+30)+'" r="1" fill="#fff"/><circle cx="'+(x+18)+'" cy="'+(y+48)+'" r="1.2" fill="#fff"/>';
  if(p.fly&&!o.dim)s+='<path d="M'+(x+16)+' '+(y+26)+'q-6 -7 -8 0q2 5 8 0q6 5 8 0q-2 -7 -8 0z" fill="'+p.tex+'"'+hmL(p)+'/>';
  return s+'<path d="M'+(x+w/2)+' '+y+'v'+h+'M'+x+' '+(y+h/2)+'h'+w+'" stroke="'+p.trim+'" stroke-width="3"/>';}
function hmMem(){ /* что домик помнит о чтении: всё считается на лету */
  const H=HS();let cups=0,souv=[];
  try{const d=(S.achDates&&typeof S.achDates==='object')?S.achDates:{};cups=Object.keys(d).length;}catch(e){}
  try{if(typeof PATH_CHAPTERS!=='undefined')PATH_CHAPTERS.forEach(function(c){if(c.books.every(function(b){return pathState(b.id).done;}))souv.push(c);});}catch(e){}
  return {fin:H.fin,cups:cups,souv:souv,q:H.q,streak:Math.max(0,Number(S.streak)||0)};}
function hmMainBase(p,o,M){let s='';
  if(p.stars)for(let i=0;i<22;i++)s+='<circle cx="'+((i*53)%312+4)+'" cy="'+((i*37)%150+6)+'" r="'+(i%3?0.9:1.6)+'" fill="'+p.gold+'" opacity=".8"/>';
  s+=hR(p,0,165,320,6,0,p.trim)+hmWindow(p,130,32,64,62,o)+hR(p,120,98,84,6,2,p.trim)+hP(p,'M124 26h16q2 34 -14 70h-2z',p.tex)+hP(p,'M200 26h-16q-2 34 14 70h2z',p.tex)+hmFlower(p,141,98,M.streak);
  if(p.col)[2,302].forEach(function(x){s+=hR(p,x,14,16,152,0,p.trim)+hS('M'+(x+5)+' 16v148M'+(x+11)+' 16v148',p.wall2,1.2)+hR(p,x-3,8,22,7,1,p.trim);});
  const bx=p.col?24:14;s+=hR(p,bx,48,74,118,2,p.wood);[0,1,2,3].forEach(function(i){s+=hR(p,bx+4,53+i*28,66,25,0,p.wall2);});
  let from=0;[78,106,134].forEach(function(y,i){const r=hmSpines(p,bx+6,y,62,from,Math.max(0,M.fin.length-from),i*2+1);s+=r[0];from+=r[1];});
  if(M.cups)s+=hP(p,'M'+(bx+50)+' 150h10v4q0 5 -5 5t-5 -5z',p.gold)+hR(p,bx+52,159,6,3,0,p.gold);
  if(M.souv.length)s+=hP(p,'M'+(bx+10)+' 162q-5 -7 -1 -12h-1.500v-2.500h7v2.500h-1.500q4 5 -1 12z',p.pot);
  s+=hR(p,220,34,50,34,2,p.trim)+(M.q.length?hS('M227 44h36M227 50h30M227 56h34',p.line,1.2).replace('fill="none"','fill="none" opacity=".55"'):'');
  return s;}
function hmAtticBase(p,o,M){let s=hR(p,0,165,320,6,0,p.trim);
  s+=hP(p,'M0 0h120L0 120z',p.wood)+hP(p,'M320 0h-120L320 120z',p.wood)+hS('M0 120L120 0M320 120L200 0',p.line,2);
  s+=hR(p,128,22,64,64,32,p.trim)+'<circle cx="160" cy="54" r="26" fill="'+(o.dim&&!p.stars?'#8fa3c2':p.sky)+'"'+hmL(p)+'/><circle cx="170" cy="46" r="7" fill="'+(o.dim&&!p.stars?'#eef0f6':p.sun)+'"/>'+hS('M160 28v52M134 54h52',p.trim,3);
  s+=hR(p,96,112,128,54,2,p.wood)+hR(p,100,116,120,22,0,p.wall2)+hR(p,100,141,120,22,0,p.wall2);
  let from=27;[137,162].forEach(function(y,i){const r=hmSpines(p,102,y,116,from,Math.max(0,M.fin.length-from),i*2+2);s+=r[0];from+=r[1];});
  s+=hR(p,14,138,50,30,3,p.pot)+hP(p,'M14 146q25 -14 50 0v-6q-25 -14 -50 0z',p.pot)+hR(p,35,148,8,7,1,p.gold);
  return s;}
function hmGardenBase(p,o,M){const night=p.stars||o.dim;let s='<rect width="320" height="232" fill="'+(o.dim&&!p.stars?'#7f93b5':p.sky)+'"/><circle cx="262" cy="40" r="15" fill="'+(o.dim&&!p.stars?'#eef0f6':p.sun)+'"/>';
  if(night)for(let i=0;i<16;i++)s+='<circle cx="'+((i*61)%310+5)+'" cy="'+((i*29)%96+6)+'" r="'+(i%3?0.9:1.4)+'" fill="#fff" opacity=".85"/>';
  else s+='<path d="M40 44q4 -12 18 -8q8 -10 20 0q14 -2 14 8z" fill="#fff" opacity=".85"/><path d="M150 30q4 -9 14 -6q8 -8 18 2q10 0 8 6z" fill="#fff" opacity=".7"/>';
  s+='<path d="M0 150q80 -34 170 -8t150 -6v96H0z" fill="'+p.grass2+'"/><rect y="166" width="320" height="66" fill="'+p.grass+'"/>';
  for(let i=0;i<17;i++)s+=hP(p,'M'+(i*20-2)+' 170v-26l5 -6 5 6v26z',p.trim);s+=hS('M0 152h320M0 164h320',p.line,1);
  s+=hR(p,52,96,12,76,2,p.wood)+hE(p,58,74,42,36,p.leaf)+hE(p,36,92,20,16,p.leaf)+hE(p,82,94,20,16,p.leaf);
  const n=Math.min(7,M.streak);for(let i=0;i<7;i++){const x=196+i*13,y=226-(i%2)*4;s+=hS('M'+x+' '+y+'v-10',p.leaf,1.6)+(i<n?'<circle cx="'+x+'" cy="'+(y-12)+'" r="3.6" fill="'+p.sp[i%p.sp.length]+'"'+hmL(p,.7)+'/>':'<circle cx="'+x+'" cy="'+(y-11)+'" r="1.6" fill="'+p.leaf+'"/>');}
  if(p.fly&&!o.dim)s+='<path d="M120 60q-6 -7 -8 0q2 5 8 0q6 5 8 0q-2 -7 -8 0z" fill="'+p.tex+'"'+hmL(p)+'/>';
  return s;}
const HM_BOX={chair:[-36,-70,72,72],small:[-21,-62,42,64],wall:[-21,-19,42,38],rug:[-80,-17,160,34],pet:[-24,-30,48,32]};
function hmScene(rid,o){
  o=o||{};const p=hmPal(),room=hmRoom(rid),M=o.mem||hmMem(),lit=!o.dim;let s='',glow='';
  if(rid==='garden')s+=hmGardenBase(p,o,M);
  else s+=hmWallSvg(p,hmCover(rid,'wallp'),0,0,320,170)+hmFloorSvg(p,hmCover(rid,'floor'),0,170,320,62)+(rid==='attic'?hmAtticBase(p,o,M):hmMainBase(p,o,M));
  room.slots.forEach(function(sl){const it=hmPutItem(rid,sl);if(!it)return;
    if(it.glow&&lit)glow+='<circle cx="'+sl.x+'" cy="'+(sl.y-(it.id==='lamp'?70:20))+'" r="32" fill="'+p.lamp+'" opacity=".38"/>';
    s+='<g transform="translate('+sl.x+' '+sl.y+')">'+it.d(p)+'</g>';});
  s=s+glow;
  const bx=room.pet[0]-52,by=room.pet[1]+8;s+=hP(p,'M'+(bx-11)+' '+(by-3)+'h22l-3 9h-16z',p.pot)+hE(p,bx,by-3,11,2.6,HS().treats>0?p.rug:p.trim);
  if(!o.noPet)s+=hmPetSvg(hmPetId(),{x:room.pet[0],y:room.pet[1],s:1.1,sleep:!!o.sleep,cls:o.petCls||''});
  if(o.dim)s+='<rect width="320" height="232" fill="#0d1230" opacity=".3" pointer-events="none"/>';
  if(o.edit)room.slots.slice().sort(function(a,b){return (a.t==='rug'?0:1)-(b.t==='rug'?0:1);}).forEach(function(sl){const b=HM_BOX[sl.t],x=sl.x+b[0],y=sl.y+b[1];
    s+='<g class="hmslot'+(o.sel===sl.id?' on':'')+'" data-slot="'+sl.id+'" onclick="homeSlot(\''+sl.id+'\')"><rect x="'+x+'" y="'+y+'" width="'+b[2]+'" height="'+b[3]+'" rx="6"/>'+
      (hmPutItem(rid,sl)?'':'<path d="M'+(x+b[2]/2-5)+' '+(y+b[3]/2)+'h10M'+(x+b[2]/2)+' '+(y+b[3]/2-5)+'v10"/>')+'</g>';});
  return '<svg class="hmscene" viewBox="0 0 320 232" role="img" aria-label="'+esc(room.n)+'">'+s+'</svg>';
}
function hmItemIcon(it){const p=hmPal();
  if(it.t==='wallp')return '<svg class="hmic" viewBox="0 0 80 44" aria-hidden="true">'+hmWallSvg(p,it.id,0,0,80,44)+'</svg>';
  if(it.t==='floor')return '<svg class="hmic" viewBox="0 0 80 44" aria-hidden="true">'+hmFloorSvg(Object.assign({},p,{chess:0}),it.id,0,0,80,44)+'</svg>';
  if(it.t==='set')return '<svg class="hmic" viewBox="-80 -76 160 80" aria-hidden="true">'+HM_ITEMS.filter(function(x){return x.set===it.id;}).map(function(x,i){return '<g transform="translate('+(-58+i*38)+' '+(x.t==='wall'?-30:0)+') scale(.62)">'+x.d(p)+'</g>';}).join('')+'</svg>';
  const vb=it.t==='wall'?'-26 -26 52 52':it.t==='rug'?'-84 -24 168 48':it.t==='pet'?'-30 -42 60 46':'-42 -80 84 84';
  return '<svg class="hmic" viewBox="'+vb+'" aria-hidden="true">'+it.d(p)+'</svg>';}

/* ---------- покупки: монеты списываются один раз ---------- */
/** → {ok, reason?, price?}: вещь, набор скина или питомец */
function homeBuy(id){
  if(window.__rqWriter&&!window.__rqWriter.mayWrite())return {ok:false,reason:'passive'};
  const H=HS(),it=hmItem(id),pd=hmPetDef(id);
  if(pd){if(hmPetOwned(id))return {ok:false,reason:'owned'};if(pd.skin&&!shopOwns('skin-'+pd.skin))return {ok:false,reason:'skin'};
    const price=hmPetPrice(pd);if(!(typeof S.gold==='number'&&S.gold>=price))return {ok:false,reason:'gold'};
    S.gold-=price;if(pd.hero)S.ownedGear=(S.ownedGear||[]).concat(id);else H.pets[id]=1;H.pet[pd.skin||'']=id;save();return {ok:true,price:price};}
  if(!it||it.set)return {ok:false,reason:'unknown'};if(hmOwns(id))return {ok:false,reason:'owned'};
  if(it.skin&&!shopOwns('skin-'+it.skin))return {ok:false,reason:'skin'};
  if(!(typeof S.gold==='number'&&S.gold>=it.price))return {ok:false,reason:'gold'};
  S.gold-=it.price;H.own[id]=1;save();return {ok:true,price:it.price};
}
function homeBuyAsk(id){
  if(!hmWriteOk())return;const it=hmItem(id),pd=hmPetDef(id),nm=pd?pd.n:it?it.n:'',price=pd?hmPetPrice(pd):it?it.price:0;if(!nm)return;
  const sk=(pd||it).skin;if(sk&&!shopOwns('skin-'+sk)){flashMsg('Сначала нужен скин «'+HM_SKIN_NAME[sk]+'»');return;}
  if(S.gold<price){flashMsg('Не хватает '+coinsP(price-S.gold));return;}
  rqAsk({t:'Купить «'+nm+'» за '+coinsP(price)+'?',p:'Останется '+coinsP(S.gold-price)+'.'+(pd?' Питомец сразу поселится в домике, прежний никуда не денется.':it.t==='set'?' В наборе четыре вещи для этого скина.':''),ok:'Купить'}).then(function(v){
    if(!v)return;const r=homeBuy(id);if(!r.ok){if(r.reason==='gold')flashMsg('Не хватает монет');return;}
    flashMsg('Куплено: «'+nm+'»',{kind:'game',icon:pd?'paw-print':'armchair'});
    if(it&&HV.tab==='edit'&&HV.slot){const sl=hmRoom(HV.room).slots.find(function(s){return s.id===HV.slot;});if((sl&&sl.t===it.t)||HV.slot===it.t)homePut(id,true);}
    homeRefresh();});
}
/** поставить вещь на выбранное место (или снять); вещь стоит только в одном месте, обои и пол — в каждой комнате свои */
function homePut(id,keep){
  if(!hmWriteOk())return;const H=HS(),rid=HV.room,room=hmRoom(rid),it=hmItem(id);if(!HV.slot)return;
  if(HV.slot==='wallp'||HV.slot==='floor'){if(!it||it.t!==HV.slot||!hmOwns(id))return;H.put[rid+':'+HV.slot]=id;save();if(!keep)homeRefresh();return;}
  const sl=room.slots.find(function(s){return s.id===HV.slot;});if(!sl)return;const key=rid+':'+sl.id,cur=hmPutItem(rid,sl);
  if(!it||(cur&&cur.id===id)){if(sl.def)H.put[key]='-';else delete H.put[key];}
  else{if(it.t!==sl.t||!hmOwns(id)||!hmHere(it))return;
    Object.keys(H.put).forEach(function(k){if(H.put[k]===id)delete H.put[k];});
    HM_ROOMS.forEach(function(r){r.slots.forEach(function(s){if(s.def===id&&!(r.id===rid&&s.id===sl.id)&&!H.put[r.id+':'+s.id])H.put[r.id+':'+s.id]='-';});});
    H.put[key]=id;}
  save();if(!keep)homeRefresh();
}

/* ---------- лакомства и питомец ---------- */
function homeFeed(){
  if(!hmWriteOk())return;const H=HS(),id=hmPetId();
  if(!H.treats){flashMsg('Лакомств нет. Одно дают за каждые '+HM_TREAT_MIN+' минут чтения');return;}
  if(hmMood()===0){flashMsg(hmPetName()+' спит. Почитайте, и он проснётся');return;}
  const was=hmBondLvl(id);H.treats--;H.bond[id]=(H.bond[id]||0)+1;save();const now=hmBondLvl(id);
  HV.petCls='eat';homeRefresh();setTimeout(function(){HV.petCls='';},900);
  if(now>was)flashMsg(hmPetName()+': '+HM_BOND_N[now].toLowerCase()+'. '+HM_BOND_GIFT[now],{kind:'game',icon:'heart'});
}
function homeRename(){
  if(!hmWriteOk())return;const id=hmPetId();
  rqAsk({t:'Как зовут питомца?',p:'До 16 знаков.',ok:'Сохранить',input:HS().nm[id]||''}).then(function(v){if(v===null||v===undefined||v===false)return;
    v=String(v).replace(/\s+/g,' ').trim().slice(0,16);const H=HS();if(v)H.nm[id]=v;else delete H.nm[id];save();homeRefresh();});
}
function homePick(id){if(!hmWriteOk())return;const pd=hmPetDef(id);if(!pd||!hmPetOwned(id)||!hmPetHere(pd))return;HS().pet[pd.skin||'']=id;if(!pd.skin)delete HS().pet[hmSkin()];save();homeRefresh();}

/* ---------- после начисления сессий: лакомства, рост, корешки ---------- */
let HOME_LAST={ids:[],treats:0,full:false,stage:-1,mood:-1,fin:[]};
function hmSyncFin(){const H=HS(),have={};H.fin.forEach(function(x){have[x.id]=1;});const add=[];let books=[];try{books=allBooks();}catch(e){}
  (S.finished||[]).forEach(function(id){if(have[id]||typeof id!=='string')return;const b=books.find(function(x){return x&&x.id===id;});if(!b)return;
    const row={id:id.slice(0,120),t:String(b.title||b.t||'Книга').slice(0,80),a:String(b.author||b.a||'').slice(0,60),d:''};H.fin.push(row);have[id]=1;add.push(row);});
  if(H.fin.length>1000)H.fin=H.fin.slice(-1000);return add;}
function homeAfterAward(res){
  const ids=(res&&res.ids)||[],last={ids:ids.slice(),treats:0,full:false,stage:-1,mood:-1,fin:[]};HOME_LAST=last;
  const H=HS(),first=!H.fin.length&&!Object.keys(H.gm).length,add=hmSyncFin();let ch=add.length>0;
  if(ids.length){
    const fresh=(typeof SESS!=='undefined'&&SESS||[]).filter(function(r){return r&&ids.indexOf(r.id)>=0&&r.ck!==1;}),d=today(),id=hmPetId();let all=0,day=0;
    fresh.forEach(function(r){const m=Number(r.minutes)||0;if(!(m>0))return;all+=m;if(String(r.date).slice(0,10)===d)day+=m;});
    if(all>0){const st0=hmStage(id);H.gm[id]=Math.round(((H.gm[id]||0)+all)*1000)/1000;const st1=hmStage(id);if(st1>st0)last.stage=st1;ch=true;}
    if(day>0){
      if(!H.tr||H.tr.d!==d)H.tr={d:d,k:0,m:0};H.tr.m+=day;
      while(H.tr.m>=HM_TREAT_MIN&&H.tr.k<HM_TREAT_DAY){H.tr.m-=HM_TREAT_MIN;H.tr.k++;if(H.treats<HM_TREAT_MAX){H.treats++;last.treats++;}else last.full=true;}
      if(H.tr.k>=HM_TREAT_DAY)H.tr.m=0;H.tr.m=Math.round(H.tr.m*1000)/1000;ch=true;
      let tot=0;try{tot=dayMin(d);}catch(e){}const m1=hmMoodOf(tot),m0=hmMoodOf(Math.max(0,tot-day));if(m1>m0)last.mood=m1;}
    if(!first)add.forEach(function(x){x.d=d;last.fin.push(x);});
  }
  if(ch)save();
  try{homeProfRender();}catch(e){}
}
{const a0=awardPendingSessions;awardPendingSessions=function(){const r=a0.apply(this,arguments);try{homeAfterAward(r);}catch(e){console.warn('[rq] home award',e);}return r;};}
/** строки итога сессии (#sumHome) */
function homeSummaryHtml(row){
  const L=HOME_LAST;if(!row||L.ids.indexOf(row.id)<0)return '';const out=[],nm=hmPetName();
  if(L.stage>0)out.push(['sparkles',nm+' вырос: теперь '+HM_STAGES[L.stage][0].toLowerCase()]);
  if(L.mood===1)out.push(['sun',nm+' проснулся']);
  if(L.mood===2)out.push(['heart',nm+' доволен: сегодня вы читали больше 10 минут']);
  if(L.mood===3)out.push(['heart',nm+' счастлив: сегодня вы читали больше 30 минут']);
  if(L.treats)out.push(['cookie',L.treats+' '+plural(L.treats,'лакомство ждёт','лакомства ждут','лакомств ждут')+' в миске']);
  else if(L.full)out.push(['cookie','Миска полна: угостите питомца, чтобы получать новые лакомства']);
  L.fin.forEach(function(x){out.push(['book-marked','«'+x.t+'» дочитана: корешок уже на полке в домике']);});
  if(!out.length)return '';
  return '<div class="hmsumh"><span class="hmsump">'+hmPetIcon(hmPetId(),{sleep:false})+'</span><b>В домике</b><button type="button" class="hmsumgo" onclick="openHome()">Заглянуть</button></div>'+
    out.map(function(x){return '<div>'+rqIcon(x[0],14)+'<span>'+esc(x[1])+'</span></div>';}).join('');
}

/* ---------- экран ---------- */
const HV={room:'main',tab:'home',slot:'',petCls:'',pickQ:false};
function homePageOpen(){const p=el('homePage');return !!(p&&!p.hidden);}
function openHome(tab){const p=el('homePage');if(!p)return;try{if(hmSyncFin().length)save();}catch(e){}
  HV.tab=tab||'home';HV.slot='';HV.pickQ=false;if(!hmRoomOpen(hmRoom(HV.room)))HV.room='main';
  HV.petCls=hmBondLvl()>=1&&hmMood()>0?'hi':'';homeRender();p.hidden=false;const b=el('hmBody');if(b)b.scrollTop=0;navPush('home');setTimeout(function(){HV.petCls='';},1200);}
function closeHome(){const p=el('homePage');if(p)p.hidden=true;}
function homeBack(){const was=homePageOpen();closeHome();if(was&&navState()==='home')try{history.back();}catch(e){}}
window.addEventListener('popstate',function(e){const st=(e.state&&e.state.rq)||null;if(homePageOpen()&&st!=='home')closeHome();});
function homeTab(t){HV.tab=t;HV.slot='';HV.pickQ=false;homeRender();}
function homeRoom(id){const r=hmRoom(id);if(!hmRoomOpen(r)){flashMsg('«'+r.n+'» откроется на уровне '+r.lvl+'. Сейчас уровень '+hmLevel());return;}HV.room=r.id;HV.slot='';homeRender();}
function homeSlot(id){HV.slot=HV.slot===id?'':id;homeRender();}
function homeRefresh(){try{if(homePageOpen())homeRender();}catch(e){console.warn('[rq] home',e);}try{homeProfRender();}catch(e){}try{homeShopRender();}catch(e){}
  try{if(el('lookBalance'))el('lookBalance').textContent=coinsP(S.gold);}catch(e){}try{if(typeof renderHeroShop==='function'&&el('look')&&!el('look').classList.contains('hidden'))renderHeroShop();}catch(e){}}
function hmCard(it,slotT){
  const own=hmOwns(it.id),here=hmHere(it),sk=it.skin&&!shopOwns('skin-'+it.skin);let on=false;
  if(slotT){if(slotT==='wallp'||slotT==='floor')on=hmCover(HV.room,slotT)===it.id;else{const sl=hmRoom(HV.room).slots.find(function(s){return s.id===HV.slot;});const c=sl&&hmPutItem(HV.room,sl);on=!!c&&c.id===it.id;}}
  let btn;
  if(own&&slotT)btn=on?(slotT==='wallp'||slotT==='floor'?'<button type="button" class="buy owned hmbtn" disabled>Выбрано</button>':'<button type="button" class="buy owned hmbtn" onclick="homePut(\'\')">Убрать</button>')
    :'<button type="button" class="buy hmbtn" onclick="homePut(\''+it.id+'\')">'+(slotT==='wallp'||slotT==='floor'?'Выбрать':'Поставить')+'</button>';
  else if(own)btn='<button type="button" class="buy owned hmbtn" disabled>'+rqIcon('check',14)+'Есть</button>';
  else if(it.set)btn='<span class="hmnote">Из набора</span>';
  else if(sk)btn='<span class="hmnote">Нужен скин</span>';
  else btn='<button type="button" class="buy hmbtn" onclick="homeBuyAsk(\''+it.id+'\')"'+(S.gold<it.price?' disabled':'')+'>'+(S.gold<it.price?'Не хватает '+(it.price-S.gold):coinsP(it.price))+'</button>';
  return '<div class="hmitem'+(on?' on':'')+'" data-id="'+it.id+'" data-own="'+(own?1:0)+'">'+hmItemIcon(it)+'<span class="hmin">'+esc(it.n)+'</span>'+
    (it.skin&&!it.set&&it.t!=='set'?'':'')+(it.t==='set'||it.set?'<span class="hmsk">'+esc(HM_SKIN_NAME[it.skin])+'</span>':'')+btn+'</div>';
}
function hmEditHtml(){
  const room=hmRoom(HV.room),chips=room.slots.map(function(sl){const n=room.slots.filter(function(x){return x.t===sl.t;}),i=n.indexOf(sl);return [sl.id,HM_TYPE_N[sl.t]+(n.length>1?' '+(i+1):'')];});
  if(room.id!=='garden'){chips.push(['wallp','Обои']);chips.push(['floor','Пол']);}
  let h='<div class="hmchips" role="group" aria-label="Место">'+chips.map(function(c){return '<button type="button" class="fchip'+(HV.slot===c[0]?' on':'')+'" data-slot="'+c[0]+'" onclick="homeSlot(\''+c[0]+'\')">'+c[1]+'</button>';}).join('')+'</div>';
  if(!HV.slot)return h+'<p class="hmhint">Коснитесь места в комнате или выберите его в списке. Купленную вещь можно убрать и вернуть бесплатно.</p>';
  const t=HV.slot==='wallp'||HV.slot==='floor'?HV.slot:(room.slots.find(function(s){return s.id===HV.slot;})||{}).t;
  const list=HM_ITEMS.filter(function(it){return it.t===t&&hmHere(it);}).sort(function(a,b){return (hmOwns(b.id)?1:0)-(hmOwns(a.id)?1:0);});
  const sets=HM_ITEMS.filter(function(it){return it.t==='set'&&hmHere(it)&&!hmOwns(HM_ITEMS.find(function(x){return x.set===it.id;}).id);});
  return h+'<div class="hmgrid">'+list.map(function(it){return hmCard(it,t);}).join('')+'</div>'+
    (sets.length&&t!=='wallp'&&t!=='floor'?'<div class="hmgrid one">'+sets.map(function(it){return hmCard(it,'');}).join('')+'</div>':'');
}
function hmPetHtml(){
  const H=HS(),id=hmPetId(),st=hmStage(id),m=H.gm[id]||0,nx=HM_STAGES[st+1],mood=hmMood(),bl=hmBondLvl(id),bn=H.bond[id]||0,bx=HM_BOND[bl+1];
  const prog=nx?Math.round((m-HM_STAGES[st][1])/(nx[1]-HM_STAGES[st][1])*100):100,left=H.tr&&H.tr.d===today()?HM_TREAT_DAY-H.tr.k:HM_TREAT_DAY;
  let h='<div class="pcard hmc"><div class="hmrow"><b class="hmt">'+esc(hmPetName(id))+'</b><button type="button" class="hmlink" onclick="homeRename()">'+rqIcon('pencil',14)+'Имя</button></div>'+
    '<div class="hmstages">'+HM_STAGES.map(function(s,i){return '<div class="'+(i===st?'cur':i<st?'was':'')+'">'+hmPetIcon(id,{stage:i,bond:0})+'<span>'+s[0]+'</span></div>';}).join('')+'</div>'+
    '<div class="pbar"><i style="width:'+prog+'%"></i></div><div class="hms">'+(nx?'Прочитано вместе '+hmMinText(m)+' из '+hmMinText(nx[1])+' до «'+nx[0].toLowerCase()+'»':'Прочитано вместе '+hmMinText(m)+'. Выше уже некуда')+'</div></div>';
  h+='<div class="pcard hmc"><b class="hmt">Настроение сегодня</b><div class="hmmoods">'+HM_MOODS.map(function(x,i){return '<span class="chip'+(i===mood?' on':'')+'">'+x[1]+'</span>';}).join('')+'</div>'+
    '<div class="hms">Зависит только от чтения за день: от 10 минут доволен, от 30 счастлив. Без чтения он просто спит, наказаний нет.</div></div>';
  h+='<div class="pcard hmc"><div class="hmrow"><span><b class="hmt">'+HM_BOND_N[bl]+'</b><span class="hms"> · лакомств в миске: '+H.treats+'</span></span><button type="button" class="buy hmbtn" id="hmFeed2" onclick="homeFeed()"'+(H.treats?'':' disabled')+'>Угостить</button></div>'+
    (bx?'<div class="pbar"><i style="width:'+Math.round((bn-HM_BOND[bl])/(bx-HM_BOND[bl])*100)+'%"></i></div><div class="hms">Ещё '+(bx-bn)+' '+plural(bx-bn,'лакомство','лакомства','лакомств')+' до «'+HM_BOND_N[bl+1].toLowerCase()+'»: '+HM_BOND_GIFT[bl+1].toLowerCase()+'.</div>':'<div class="hms">Ближе уже не бывает.</div>')+
    '<div class="hms">Лакомство дают за каждые '+HM_TREAT_MIN+' минут чтения, сегодня можно получить ещё '+left+'.</div></div>';
  const pets=HM_PETS.filter(hmPetHere);
  h+='<div class="pcard hmc"><b class="hmt">Питомцы</b><div class="hmgrid">'+pets.map(function(pd){const own=hmPetOwned(pd.id),cur=pd.id===id,price=hmPetPrice(pd),sk=pd.skin&&!shopOwns('skin-'+pd.skin);
    const btn=cur?'<button type="button" class="buy owned hmbtn" disabled>Живёт здесь</button>':own?'<button type="button" class="buy hmbtn" onclick="homePick(\''+pd.id+'\')">Позвать</button>'
      :sk?'<span class="hmnote">Нужен скин</span>':'<button type="button" class="buy hmbtn" onclick="homeBuyAsk(\''+pd.id+'\')"'+(S.gold<price?' disabled':'')+'>'+(S.gold<price?'Не хватает '+(price-S.gold):coinsP(price))+'</button>';
    return '<div class="hmitem'+(cur?' on':'')+'" data-id="'+pd.id+'" data-own="'+(own?1:0)+'">'+hmPetIcon(pd.id,{stage:own?hmStage(pd.id):1,bond:0})+'<span class="hmin">'+esc(H.nm[pd.id]||pd.n)+'</span>'+(pd.skin?'<span class="hmsk">'+esc(HM_SKIN_NAME[pd.skin])+'</span>':'')+btn+'</div>';}).join('')+'</div>'+
    '<div class="hms">У каждого питомца свой рост и своя привязанность. Питомцы скина живут только в своём скине.</div></div>';
  return h;
}
function hmSpineColor(i){const p=hmPal();return p.sp[i%p.sp.length];}
function hmQuotesAll(){const out=[];try{allBooks().forEach(function(b){(S.quotes[b.id]||[]).forEach(function(q){const t=q&&String(q.t||q.text||'').replace(/\s+/g,' ').trim();if(t)out.push({t:t.slice(0,240),a:String(b.title||'').slice(0,80)});});});}catch(e){}return out.slice(-40).reverse();}
function homeQuoteToggle(i){if(!hmWriteOk())return;const all=hmQuotesAll(),x=all[i],H=HS();if(!x)return;const k=H.q.findIndex(function(y){return y.t===x.t;});
  if(k>=0)H.q.splice(k,1);else{if(H.q.length>=3){flashMsg('На стене помещаются три цитаты. Сначала снимите одну');return;}H.q.push(x);}save();homeRender();}
function homeSpine(i){const x=HS().fin[i],b=el('hmSpineInfo');if(!x||!b)return;let min=0;try{min=Number(((S.bookStats||{})[x.id]||{}).min)||0;}catch(e){}
  document.querySelectorAll('#hmBody .hmspine').forEach(function(s,k){s.classList.toggle('on',k===i);});
  b.innerHTML='<b>'+esc(x.t)+'</b>'+(x.a?'<span>'+esc(x.a)+'</span>':'')+'<span>'+[x.d?'Дочитана '+x.d.split('-').reverse().join('.'):'',min>=1?'читали '+hmMinText(min):''].filter(Boolean).join(' · ')+'</span>';}
function hmMemHtml(){
  const M=hmMem(),H=HS();
  let h='<div class="pcard hmc"><div class="hmrow"><b class="hmt">Прочитанные книги</b><span class="hms">'+M.fin.length+'</span></div>'+
    (M.fin.length?'<div class="hmshelf">'+M.fin.map(function(x,i){return '<button type="button" class="hmspine" style="background:'+hmSpineColor(i)+';height:'+(52+(i*7)%20)+'px" onclick="homeSpine('+i+')" aria-label="'+esc(x.t)+'"><span>'+esc(x.t)+'</span></button>';}).join('')+'</div><div class="hms" id="hmSpineInfo">Коснитесь корешка, чтобы вспомнить книгу.</div>'
      :'<div class="hms">Здесь встанет корешок каждой дочитанной книги. За монеты они не продаются.</div>')+'</div>';
  h+='<div class="pcard hmc"><div class="hmrow"><b class="hmt">Кубки и сувениры</b><span class="hms">'+(M.cups+M.souv.length)+'</span></div><div class="hmtroph">'+
    (M.cups?'<span>'+rqIcon('trophy',18)+M.cups+' '+plural(M.cups,'достижение','достижения','достижений')+'</span>':'')+
    M.souv.map(function(c){return '<span>'+rqIcon('amphora',18)+'Глава «'+esc(c.t)+'»</span>';}).join('')+'</div>'+
    '<div class="hms">'+(M.cups||M.souv.length?'Кубок появляется за достижения, сувенир за каждую пройденную главу «Пути читателя».':'Кубок появится за первое достижение, сувенир за пройденную главу «Пути читателя».')+'</div></div>';
  h+='<div class="pcard hmc"><div class="hmrow"><b class="hmt">Цитаты в рамках</b><button type="button" class="hmlink" onclick="HV.pickQ=!HV.pickQ;homeRender()">'+(HV.pickQ?'Готово':'Выбрать')+'</button></div>'+
    (H.q.length?H.q.map(function(x){return '<blockquote class="hmq">'+esc(x.t)+(x.a?'<cite>'+esc(x.a)+'</cite>':'')+'</blockquote>';}).join(''):'<div class="hms">До трёх любимых цитат на стене домика.</div>');
  if(HV.pickQ){const all=hmQuotesAll();h+=all.length?'<div class="hmqlist">'+all.map(function(x,i){const on=H.q.some(function(y){return y.t===x.t;});return '<button type="button" class="hmqpick'+(on?' on':'')+'" onclick="homeQuoteToggle('+i+')">'+rqIcon(on?'circle-check':'circle',16)+'<span>'+esc(x.t.slice(0,110))+(x.t.length>110?'…':'')+'</span></button>';}).join('')+'</div>'
    :'<div class="hms">Цитат пока нет. Выделите строчку в книге и сохраните её.</div>';}
  h+='</div><div class="pcard hmc"><div class="hmrow"><b class="hmt">Цветок серии</b><span class="hms">'+M.streak+' '+plural(M.streak,'день','дня','дней')+' подряд</span></div>'+
    '<div class="hms">Растёт вместе с серией и зацветает на седьмой день. Если серия прервётся, цветок не погибнет, а начнёт расти заново.</div></div>';
  return h;
}
function hmHomeHtml(){
  const H=HS(),id=hmPetId(),st=hmStage(id),m=H.gm[id]||0,nx=HM_STAGES[st+1],mood=hmMood();let min=0;try{min=Math.floor(dayMin(today()));}catch(e){}
  const moodTx=mood===0?'Спит. Почитайте, и он проснётся':mood===1?'Проснулся: сегодня вы читали '+hmMinText(min):HM_MOODS[mood][1]+': сегодня вы читали '+hmMinText(min);
  const prog=nx?Math.round((m-HM_STAGES[st][1])/(nx[1]-HM_STAGES[st][1])*100):100,M=hmMem();
  const got=H.tr&&H.tr.d===today()?H.tr.k:0,toNext=got>=HM_TREAT_DAY?0:Math.max(1,Math.ceil(HM_TREAT_MIN-((H.tr&&H.tr.d===today())?H.tr.m:0)));
  return '<div class="pcard hmc"><div class="hmrow"><span class="hmtx"><b class="hmt">'+esc(hmPetName(id))+' · '+HM_STAGES[st][0].toLowerCase()+'</b><span class="hms" id="hmMood">'+esc(moodTx)+'</span></span>'+
      '<button type="button" class="buy hmbtn" id="hmFeed" onclick="homeFeed()"'+(H.treats?'':' disabled')+'>Угостить · '+H.treats+'</button></div>'+
      '<div class="pbar"><i style="width:'+prog+'%"></i></div><div class="hms">'+(nx?'До «'+nx[0].toLowerCase()+'» осталось '+hmMinText(nx[1]-m)+' чтения':'Вырос полностью')+'</div></div>'+
    '<div class="pcard hmc"><div class="hmrow"><span class="hmtx"><b class="hmt">Лакомства</b><span class="hms">'+(got>=HM_TREAT_DAY?'Сегодня получены все '+HM_TREAT_DAY+'. Завтра будут новые':'Сегодня '+got+' из '+HM_TREAT_DAY+'. Следующее через '+toNext+' мин чтения')+'</span></span></div></div>'+
    '<div class="pcard hmc"><div class="hmrow"><span class="hmtx"><b class="hmt">Цветок серии</b><span class="hms">'+(M.streak>=7?M.streak+' '+plural(M.streak,'день','дня','дней')+' подряд, цветёт':M.streak>0?M.streak+' '+plural(M.streak,'день','дня','дней')+' подряд, до цветка '+(7-M.streak):'Вырастет, когда начнётся серия дней')+'</span></span>'+
      '<span class="hms">книг на полке: '+M.fin.length+'</span></div></div>';
}
function homeRender(){
  const body=el('hmBody');if(!body)return;const mood=hmMood(),edit=HV.tab==='edit';
  if(el('hmGold'))el('hmGold').textContent=coinsP(S.gold);
  const rooms='<div class="hmrooms" role="group" aria-label="Комнаты">'+HM_ROOMS.map(function(r){const op=hmRoomOpen(r);return '<button type="button" class="fchip'+(HV.room===r.id?' on':'')+(op?'':' lock')+'" data-room="'+r.id+'" onclick="homeRoom(\''+r.id+'\')">'+(op?'':rqIcon('lock',12))+r.n+(op?'':' · ур. '+r.lvl)+'</button>';}).join('')+'</div>';
  const room=hmRoom(HV.room),hero=room.hero;let heroH='';
  try{if(!edit&&typeof heroFigure==='function')heroH='<div class="hmhero heroframe" style="left:'+(hero[0]/320*100).toFixed(2)+'%;bottom:'+((232-hero[1])/232*100).toFixed(2)+'%;--hero-bg:'+(HV.room==='garden'?hmPal().grass:hmPal().wall)+(hmPal().stars?'':';--txt:'+hmPal().line)+'">'+heroFigure()+'</div>';}catch(e){}
  const scene='<div class="hmstage'+(mood===0?' dim':'')+'" data-room="'+HV.room+'" data-mood="'+HM_MOODS[mood][0]+'">'+hmScene(HV.room,{edit:edit,sel:HV.slot,dim:mood===0&&!edit,sleep:mood===0,petCls:HV.petCls})+heroH+'</div>';
  const tabs='<div class="hmtabs" role="tablist">'+[['home','Домик'],['edit','Обставить'],['pet','Питомец'],['mem','Память']].map(function(t){return '<button type="button" role="tab" aria-selected="'+(HV.tab===t[0])+'" class="'+(HV.tab===t[0]?'on':'')+'" data-tab="'+t[0]+'" onclick="homeTab(\''+t[0]+'\')">'+t[1]+'</button>';}).join('')+'</div>';
  const st=body.scrollTop;
  body.innerHTML=rooms+scene+tabs+'<div class="hmpane" data-tab="'+HV.tab+'">'+(HV.tab==='edit'?hmEditHtml():HV.tab==='pet'?hmPetHtml():HV.tab==='mem'?hmMemHtml():hmHomeHtml())+'</div>';
  body.scrollTop=st;
}

/* ---------- профиль и магазин ---------- */
function homeProfRender(){const s=el('homeCardSub');if(!s)return;const id=hmPetId();s.textContent=hmPetName(id)+' · '+HM_MOODS[hmMood()][1].toLowerCase();}
/* вкладка «Домик» в магазине (js/hero.js renderHeroShop): всё, что продаётся для домика, одним списком */
function homeShopRender(){
  const box=el('homeShop');if(!box||box.hidden)return;
  const grp=function(t,list){return list.length?'<h3 class="hmh">'+t+'</h3><div class="hmgrid">'+list.join('')+'</div>':'';};
  const pets=HM_PETS.filter(function(pd){return hmPetHere(pd)&&hmPetPrice(pd)>0;}).map(function(pd){const own=hmPetOwned(pd.id),price=hmPetPrice(pd);
    return '<div class="hmitem" data-id="'+pd.id+'" data-own="'+(own?1:0)+'">'+hmPetIcon(pd.id,{stage:1,bond:0})+'<span class="hmin">'+esc(pd.n)+'</span>'+(pd.skin?'<span class="hmsk">'+esc(HM_SKIN_NAME[pd.skin])+'</span>':'')+
      (own?'<button type="button" class="buy owned hmbtn" disabled>'+rqIcon('check',14)+'Есть</button>':'<button type="button" class="buy hmbtn" onclick="homeBuyAsk(\''+pd.id+'\')"'+(S.gold<price?' disabled':'')+'>'+(S.gold<price?'Не хватает '+(price-S.gold):coinsP(price))+'</button>')+'</div>';});
  const by=function(ts){return HM_ITEMS.filter(function(it){return ts.indexOf(it.t)>=0&&it.price>0&&hmHere(it);}).map(function(it){return hmCard(it,'');});};
  box.innerHTML='<p class="tlintro">Домик и питомец оживают от чтения. Здесь всё, что можно купить для домика: только украшения, без бонусов к опыту. Корешки книг, кубки и сувениры не продаются.</p>'+
    '<button type="button" class="buy hmopen" onclick="openHome()">'+rqIcon('house',16)+'Открыть домик</button>'+
    grp('Питомцы',pets)+grp('Наборы скина',by(['set']))+grp('Мебель',by(['chair','small']))+grp('На стену и на пол',by(['wall','rug']))+grp('Питомцу',by(['pet']))+grp('Обои и пол',by(['wallp','floor']));
}
function homeOpenShop(){openLook(true);if(typeof heroShopTab==='function')heroShopTab('home');}
try{document.addEventListener('DOMContentLoaded',function(){try{homeProfRender();}catch(e){}});}catch(e){}
{const rp0=renderProfile;renderProfile=function(){const r=rp0.apply(this,arguments);try{homeProfRender();}catch(e){}return r;};}
