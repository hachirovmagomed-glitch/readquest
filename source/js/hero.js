'use strict';
/* ===== Герой-стикмен и вещи из Эллады (Джессика 18.10: «персонажа основного заменить на стикмена»).
   Силуэт в цвете текста скина, одежда в акценте скина, щели между деталями = цвет фона рамки (--hero-bg),
   поэтому герой одинаково читается во всех скинах, днём и ночью. Лица и глаз нет.
   Вещи хранятся в S.ownedGear / S.equipped (поля уже в схеме) с id «gr-…»; старые вещи v6 стикмен не рисует. */
const HERO_SLOTS={char:'Персонаж',head:'Голова',face:'Лицо',neck:'Шея',body:'Одежда',top:'Верх',bottom:'Низ',shoes:'Обувь',cloak:'Плащ',back:'Спина',belt:'Пояс',hand:'В руке',offhand:'Вторая рука',shield:'Щит',pet:'Спутник',bg:'Фон'};
const HERO_GEAR=[
 {id:'gr-helm',slot:'head',kind:'wear',name:'Коринфский шлем',skin:'ellada',price:300,desc:'Бронзовый шлем с гребнем'},
 {id:'gr-laurel',slot:'head',kind:'wear',name:'Лавровый венок',skin:'ellada',price:150,desc:'Награда победителю'},
 {id:'gr-chiton',slot:'body',kind:'wear',name:'Хитон',skin:'ellada',price:150,desc:'Туника с поясом'},
 {id:'gr-chlamys',slot:'cloak',kind:'wear',name:'Хламида',skin:'ellada',price:200,desc:'Плащ с фибулой на плече'},
 {id:'gr-dory',slot:'hand',kind:'gear',name:'Копьё',skin:'ellada',price:200,desc:'Дори гоплита'},
 {id:'gr-scroll',slot:'hand',kind:'gear',name:'Свиток',skin:'ellada',price:100,desc:'Для того, кто читает'},
 {id:'gr-hoplon',slot:'shield',kind:'gear',name:'Гоплон',skin:'ellada',price:250,desc:'Круглый щит с лямбдой'},
 {id:'gr-owl',slot:'pet',kind:'gear',name:'Сова Афины',skin:'ellada',price:350,desc:'Спутник мудрых'},
 /* персонажи Эллады (Джессика 18.10: «продавать персонажей… Пифагор, Аристотель»): слот char, вещи надеваются поверх */
 {id:'ch-reader',slot:'char',kind:'chars',name:'Читатель',skin:'ellada',price:0,desc:'Ваш герой'},
 {id:'ch-pythagoras',slot:'char',kind:'chars',name:'Пифагор',skin:'ellada',price:600,desc:'Борода, повязка, табличка с треугольником'},
 {id:'ch-aristotle',slot:'char',kind:'chars',name:'Аристотель',skin:'ellada',price:600,desc:'Кудри, гиматий, свиток'},
 /* Небесный (классы из архива Джессики, handoff/hero-celestial, 19.10): цельные персонажи, первый бесплатный; вещей по слотам пока нет */
 {id:'cl-sonny-chtets',slot:'char',kind:'chars',name:'Сонный чтец',skin:'celestial',price:0,fig:'teen',desc:'Ночной колпак, книга-подушка'},
 {id:'cl-kartograf',slot:'char',kind:'chars',name:'Картограф созвездий',skin:'celestial',price:600,fig:'adult',desc:'Пальто с картами, астролябия'},
 {id:'cl-lunnaya-zhritsa',slot:'char',kind:'chars',name:'Лунная жрица',skin:'celestial',price:600,fig:'adult',desc:'Диадема-полумесяц, посох'},
 {id:'cl-kometa',slot:'char',kind:'chars',name:'Комета',skin:'celestial',price:600,fig:'teen',desc:'Берет со звездой, рапира'},
 {id:'cl-perepletchik',slot:'char',kind:'chars',name:'Переплётчица',skin:'celestial',price:600,fig:'adult',desc:'Фартук, молот-пресс'},
 {id:'cl-zvezdny-prints',slot:'char',kind:'chars',name:'Звёздный принц',skin:'celestial',price:600,fig:'adult',desc:'Корона, плащ «ночное небо»'},
 {id:'cl-alkhimik',slot:'char',kind:'chars',name:'Алхимик чернил',skin:'celestial',price:600,fig:'teen',desc:'Гогглы, колба с чернилами'},
 {id:'cl-strazh-tishiny',slot:'char',kind:'chars',name:'Страж тишины',skin:'celestial',price:600,fig:'adult',desc:'Серая мантия, фонарь-посох'},
 {id:'cl-zvezdny-bard',slot:'char',kind:'chars',name:'Звёздный бард',skin:'celestial',price:600,fig:'teen',desc:'Берет с пером, лира'},
 {id:'cl-solnechny-paladin',slot:'char',kind:'chars',name:'Солнечный паладин',skin:'celestial',price:600,fig:'adult',desc:'Венец-солнце, булава'},
 {id:'cl-tenevoy-chtets',slot:'char',kind:'chars',name:'Теневой чтец',skin:'celestial',price:600,fig:'teen',desc:'Капюшон индиго, кинжал-закладка'},
 {id:'cl-sadovnik',slot:'char',kind:'chars',name:'Садовник звёздных цветов',skin:'celestial',price:600,fig:'teen',desc:'Соломенная шляпа, лейка'},
 /* Карандашный (рисунок Грока, handoff/hero-pencil, 19.10): 30 вещей, видны только в Карандашном */
 {id:'pc-cap',slot:'head',kind:'wear',name:'Кепка',skin:'pencil',price:120},
 {id:'pc-beret',slot:'head',kind:'wear',name:'Берет',skin:'pencil',price:150},
 {id:'pc-paperhat',slot:'head',kind:'wear',name:'Бумажная шапка',skin:'pencil',price:80},
 {id:'pc-headphones',slot:'head',kind:'wear',name:'Наушники',skin:'pencil',price:200},
 {id:'pc-glasses',slot:'face',kind:'wear',name:'Очки',skin:'pencil',price:100},
 {id:'pc-scarf',slot:'neck',kind:'wear',name:'Шарф',skin:'pencil',price:100},
 {id:'pc-hoodie',slot:'top',kind:'wear',name:'Худи',skin:'pencil',price:200},
 {id:'pc-sweater',slot:'top',kind:'wear',name:'Свитер',skin:'pencil',price:180},
 {id:'pc-shirt-tie',slot:'top',kind:'wear',name:'Рубашка с галстуком',skin:'pencil',price:160},
 {id:'pc-jacket',slot:'top',kind:'wear',name:'Пиджак',skin:'pencil',price:220},
 {id:'pc-uniform',slot:'top',kind:'wear',name:'Школьная форма',skin:'pencil',price:250},
 {id:'pc-raincoat',slot:'top',kind:'wear',name:'Дождевик',skin:'pencil',price:220},
 {id:'pc-jeans',slot:'bottom',kind:'wear',name:'Джинсы',skin:'pencil',price:150},
 {id:'pc-school-trousers',slot:'bottom',kind:'wear',name:'Школьные брюки',skin:'pencil',price:140},
 {id:'pc-shorts',slot:'bottom',kind:'wear',name:'Шорты',skin:'pencil',price:100},
 {id:'pc-kilt',slot:'bottom',kind:'wear',name:'Юбка в клетку',skin:'pencil',price:140},
 {id:'pc-sneakers',slot:'shoes',kind:'wear',name:'Кеды',skin:'pencil',price:120},
 {id:'pc-boots',slot:'shoes',kind:'wear',name:'Ботинки',skin:'pencil',price:150},
 {id:'pc-rubber-boots',slot:'shoes',kind:'wear',name:'Резиновые сапоги',skin:'pencil',price:130},
 {id:'pc-pencil-sword',slot:'hand',kind:'gear',name:'Меч-карандаш',skin:'pencil',price:300},
 {id:'pc-umbrella',slot:'hand',kind:'gear',name:'Зонт',skin:'pencil',price:180},
 {id:'pc-lantern',slot:'hand',kind:'gear',name:'Фонарик',skin:'pencil',price:160},
 {id:'pc-book',slot:'offhand',kind:'gear',name:'Книга',skin:'pencil',price:120},
 {id:'pc-eraser-shield',slot:'offhand',kind:'gear',name:'Щит-ластик',skin:'pencil',price:250},
 {id:'pc-paper-airplane',slot:'offhand',kind:'gear',name:'Самолётик',skin:'pencil',price:90},
 {id:'pc-backpack',slot:'back',kind:'gear',name:'Рюкзак',skin:'pencil',price:200},
 {id:'pc-paper-cape',slot:'back',kind:'gear',name:'Плащ из листка',skin:'pencil',price:260},
 {id:'pc-pencil-case',slot:'belt',kind:'gear',name:'Пенал',skin:'pencil',price:110},
 {id:'pc-crane',slot:'pet',kind:'gear',name:'Журавлик',skin:'pencil',price:220},
 {id:'pc-paper-cat',slot:'pet',kind:'gear',name:'Бумажный кот',skin:'pencil',price:280},
 {id:'gr-temple',slot:'bg',kind:'gear',name:'Акрополь',skin:'ellada',price:400,desc:'Храм за спиной героя'}
];
function heroItem(id){return HERO_GEAR.find(function(g){return g.id===id;})||null;}
/* вещи привязаны к скину (Джессика 18.10): купить можно, только если куплен скин; на герое видны только в этом скине */
const HERO_SKIN_NAME={ellada:'Эллада',pencil:'Карандашный',celestial:'Небесный'};
/* бесплатный персонаж скина = герой по умолчанию (в Элладе Читатель) */
function heroCharDefault(sk){const g=HERO_GEAR.find(function(x){return x.slot==='char'&&x.price===0&&x.skin===(sk||heroSkin());});return g?g.id:'';}
function heroSkin(){try{return activeTheme().skin||'';}catch(e){return document.documentElement.dataset.skin||'';}}
function heroFits(g){return !!g&&(!g.skin||g.skin===heroSkin());}
function heroSkinOwned(g){return !g.skin||shopOwns('skin-'+g.skin);}
/* вещи текущего скина; в чужом скине чужих вещей не видно нигде (Джессика 18.10: «вообще нельзя было там увидеть») */
function heroGearHere(){return HERO_GEAR.filter(heroFits);}
/* у каждого скина свои надетые вещи: Эллада в старых ключах слотов, остальные — «скин:слот» (кепка Карандашного не снимает шлем Эллады) */
function heroKey(g){return g.skin&&g.skin!=='ellada'?g.skin+':'+g.slot:g.slot;}
function heroOn(){const eq=S.equipped||{},on={},sk=heroSkin();Object.keys(HERO_SLOTS).forEach(function(k){[k,sk+':'+k].forEach(function(key){const g=heroItem(eq[key]);if(g&&heroFits(g)&&heroKey(g)===key)on[k]=eq[key];});});return on;}
const HI='var(--txt)',HB='var(--hero-bg)'; /* --txt: и скины, и тема по умолчанию */
/* цвет вещи игрок выбирает сам, любой (Джессика 18.10: «дать человеку выбрать и настроить цвет самому»); по умолчанию бронза */
const HERO_BRONZE='#b5822a'; /* темнее, чтобы не сливаться с кремовыми плашками */
let heroTryCol={}; /* примерка цвета — только в памяти */
function heroHex(v){return typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():null;}
/* цвет вещи свой у каждого персонажа: ключ «персонаж:вещь», без персонажа — просто id */
let heroColCh='';
function heroColKey(id,ch){ch=ch===undefined?heroColCh:ch;return ch&&ch!=='ch-reader'?ch+':'+id:id;}
function heroCol(id){const gc=(S.char&&S.char.gearColor)||{};return heroHex(heroTryCol[id])||heroHex(gc[heroColKey(id)])||heroHex(gc[id])||(/^pc-/.test(id)?heroPcDefault(id):HERO_BRONZE);}
/* вещь Карандашного без своего цвета: синий или красный карандаш — какого в рисунке больше */
function heroPcDefault(id){const it=(typeof HERO_PENCIL_ART!=='undefined'&&HERO_PENCIL_ART.items[id])||{},t=(it.back||'')+(it.front||'');
  return (t.split('--pc-red').length>t.split('--pc-blue').length)?'#d0443c':'#2f55b8';}
/** heroSvg(on): on = {slot:id}; без аргумента — то, что надето. viewBox 0 -6 72 92: сверху место под гребень шлема */
function heroSvg(on,colCh){
  on=on||heroOn();heroColCh=colCh===undefined?(on.char||''):colCh;const ch=on.char||'';const has=function(id){return Object.keys(on).some(function(k){return on[k]===id;});};
  const gap=function(w){return ' stroke="'+HB+'" stroke-width="'+(w||1.2)+'" stroke-linejoin="round"';};
  const A=function(id){return heroCol(id);},D=function(id){return 'color-mix(in srgb,'+heroCol(id)+' 62%,#000)';};
  let s='';
  if(has('gr-temple')){const T='color-mix(in srgb,'+HI+' 17%,'+HB+')',T2='color-mix(in srgb,'+heroCol('gr-temple')+' 30%,'+HB+')';
    s+='<g fill="'+T+'"><path d="M5 25.5 L36 12 L67 25.5 Z"/><rect x="4" y="26" width="64" height="4.6" rx=".6"/><rect x="6" y="31.2" width="60" height="1.8"/>'+
      [9.5,19.5,29.5,38.5,48.5,58.5].map(function(x){return '<rect x="'+(x-0.6)+'" y="33.6" width="5.2" height="1.6"/><rect x="'+x+'" y="35.2" width="4" height="25.6"/><rect x="'+(x-0.6)+'" y="60.6" width="5.2" height="1.4"/>';}).join('')+
      '<rect x="5" y="62.4" width="62" height="2.6"/><rect x="3" y="65.4" width="66" height="2.6"/><rect x="1" y="68.4" width="70" height="2.6"/></g>'+
      '<path d="M14 24.4 L36 15 L58 24.4 Z" fill="'+T2+'"/>';}
  /* постамент, как у статуи (Джессика 18.10: «чего-то не хватает») */
  const P='color-mix(in srgb,'+HI+' 16%,'+HB+')',P2='color-mix(in srgb,'+HI+' 30%,'+HB+')';
  s+='<rect x="14" y="73.4" width="44" height="2.4" rx=".6" fill="'+P2+'"/><rect x="16.5" y="76.2" width="39" height="6.2" fill="'+P+'"/>'+
    '<path d="M19 80.6 V78 H22 V80.6 H25 V78 H28 V80.6 H31 V78 H34 V80.6 H37 V78 H40 V80.6 H43 V78 H46 V80.6 H49 V78 H52 V80.6" fill="none" stroke="'+P2+'" stroke-width=".8"/>'+
    '<rect x="14" y="82.8" width="44" height="2.2" rx=".6" fill="'+P2+'"/>';
  if(has('gr-dory')){const c=A('gr-dory');s+='<rect x="19.65" y="8" width="1.9" height="65.4" rx=".9" fill="'+HI+'"/><path d="M20.6 -5 Q23.95 2 20.6 9 Q17.25 2 20.6 -5 Z" fill="'+c+'"'+gap(0.7)+'/><path d="M20.6 -2.5 V7" stroke="'+D('gr-dory')+'" stroke-width=".6"/><rect x="19.15" y="8.6" width="2.9" height="1.8" rx=".5" fill="'+c+'"/>';}
  /* поза зависит от того, что в руке (Джессика 18.10): копьё — рука отведена к древку, свиток — рука у груди, читает */
  const handFree=!on.hand,robe=!on.body&&!on.cloak;
  const pose=has('gr-dory')?'spear':has('gr-scroll')?'scroll':(ch==='ch-pythagoras'&&handFree)?'tablet':'down';
  const limb=function(d){return '<path d="'+d+'" fill="none" stroke="'+HB+'" stroke-width="6.6" stroke-linecap="round" stroke-linejoin="round"/><path d="'+d+'" fill="none" stroke="'+HI+'" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round"/>';};
  if(pose==='spear')s+=limb('M25.4 24.4 L21 43.6');
  if(pose==='scroll')s+=limb('M25.4 24.4 L25.2 37.6');
  if(pose==='tablet')s+=limb('M25.4 24.4 L23.6 37.6');
  /* стикмен: голова, руки, корпус, ноги; щели между ними — фон */
  s+='<g fill="'+HI+'"'+gap(0.9)+'>'+
    '<rect x="29" y="46" width="6.6" height="27" rx="3.3"/><rect x="36.4" y="46" width="6.6" height="27" rx="3.3"/>'+
    (pose==='down'?'<rect x="23" y="22" width="4.8" height="24.5" rx="2.4"/>':'')+'<rect x="44.2" y="22" width="4.8" height="24.5" rx="2.4"/>'+
    '<rect x="28.2" y="21" width="15.6" height="28" rx="4.5"/>'+
    '<circle cx="36" cy="12" r="7"/></g>';
  /* одеяние персонажа, пока на нём нет своей одежды */
  if(ch==='ch-pythagoras'&&robe)s+='<path d="M28.4 22.4 Q36 20 43.6 22.4 L46 66 Q36 68.6 26 66 Z" fill="#f4efe4"'+gap(1)+'/><path d="M28.6 23 Q38 34 45 40 L46 46 Q36 38 28 27 Z" fill="#dcd2bf"/><path d="M26.2 63.4 Q36 66 45.8 63.4" stroke="#3f6fb0" stroke-width="1.4" fill="none"/>';
  if(ch==='ch-aristotle'&&robe)s+='<path d="M28.2 22.4 Q36 20 43.8 22.4 L47 66 Q36 68.6 25 66 Z" fill="#b5532f"'+gap(1)+'/><path d="M30 23 Q36 32 44 34 M28 30 Q36 42 46 44 M27 44 L28 64 M33 46 L32.4 66" stroke="#8a3b20" stroke-width=".8" fill="none"/>';
  if(has('gr-chiton')){const c=A('gr-chiton'),d=D('gr-chiton');
    s+='<path d="M28.4 22.4 L31.4 21 L36 26 L40.6 21 L43.6 22.4 L44.1 33.4 L47.6 61 Q36 63.4 24.4 61 L27.9 33.4 Z" fill="'+c+'"'+gap(1.1)+'/>'+
      '<rect x="27.7" y="33" width="16.6" height="2.8" rx=".8" fill="'+d+'"/>'+
      '<path d="M31 37.5 L29.4 60.5 M34.2 37.5 L33.6 61.6 M37.8 37.5 L38.4 61.6 M41 37.5 L42.6 60.5 M32.6 24.5 L33.4 32.4 M39.4 24.5 L38.6 32.4" stroke="'+d+'" stroke-width=".8" fill="none" stroke-linecap="round"/>';}
  if(has('gr-chlamys')){const c=A('gr-chlamys'),d=D('gr-chlamys');
    s+='<path d="M27.4 22.6 Q30 20.4 36.5 20.8 Q46.5 21 49.6 24.2 L51.8 40 L53 63 Q49.8 65 46.6 63 L45.6 47.4 Q37.6 40.6 29.6 27 Z" fill="'+c+'"'+gap(1.1)+'/>'+
      '<path d="M32.4 26.6 Q39 36 45.4 41 M35.6 24.2 Q42 31 46.6 33.6 M48.6 30 L49.6 61.6 M50.8 44 L51.4 62" stroke="'+d+'" stroke-width=".8" fill="none" stroke-linecap="round"/>'+
      '<circle cx="29.8" cy="24.4" r="2.4" fill="'+c+'" stroke="'+d+'" stroke-width=".9"/><circle cx="29.8" cy="24.4" r=".9" fill="'+d+'"/>';}
  if(has('gr-scroll')){const c=A('gr-scroll'),d=D('gr-scroll');
    s+=limb('M25.2 37.6 L31 33.4')+
      '<rect x="31" y="27.4" width="9.6" height="8.4" fill="'+c+'"'+gap(0.8)+'/><path d="M33 30 H38.6 M33 32 H38.6 M33 34 H37" stroke="'+d+'" stroke-width=".6"/>'+
      '<rect x="29.4" y="25.6" width="2.8" height="12" rx="1.4" fill="'+d+'"'+gap(0.6)+'/><rect x="39.4" y="25.6" width="2.8" height="12" rx="1.4" fill="'+d+'"'+gap(0.6)+'/>';}
  /* черты персонажа: борода, волосы; знак в свободной руке */
  if(ch==='ch-pythagoras'){
    if(pose==='tablet')s+=limb('M23.6 37.6 L29 36')+'<rect x="14" y="27" width="15" height="12.4" rx="1" fill="#c8a46a"'+gap(0.8)+'/><path d="M17 37 L26.4 37 L17 29.6 Z" fill="none" stroke="#2a3550" stroke-width=".8"/><rect x="17" y="35.2" width="1.8" height="1.8" fill="none" stroke="#2a3550" stroke-width=".5"/>';
    s+='<path d="M29.6 14 Q30 23 36 25.6 Q42 23 42.4 14 Q39 17 36 17 Q33 17 29.6 14 Z" fill="#8a8a8a"'+gap(0.7)+'/>'+(on.head?'':'<path d="M29 9.6 Q36 6.6 43 9.6" stroke="#f4efe4" stroke-width="1.6" fill="none"/>');}
  if(ch==='ch-aristotle'){
    if(!on.head)s+='<g fill="#5a4636"'+gap(0.5)+'><circle cx="30.4" cy="7.6" r="2.2"/><circle cx="33.4" cy="5.4" r="2.2"/><circle cx="36.8" cy="4.8" r="2.2"/><circle cx="40" cy="5.6" r="2.2"/><circle cx="42" cy="8.2" r="2.2"/></g>';
    s+='<path d="M30 14.6 Q31 21.4 36 22.4 Q41 21.4 42 14.6 Q39 16.6 36 16.6 Q33 16.6 30 14.6 Z" fill="#5a4636"'+gap(0.7)+'/>';
    if(handFree)s+='<rect x="40.4" y="43.2" width="13" height="3.4" rx="1.7" fill="#e8dcc0"'+gap(0.7)+'/><rect x="40.4" y="43.2" width="3.4" height="3.4" rx="1.7" fill="#c8a46a"/><rect x="50" y="43.2" width="3.4" height="3.4" rx="1.7" fill="#c8a46a"/>';}
  if(has('gr-helm')){const c=A('gr-helm'),d=D('gr-helm');
    s+='<g transform="translate(0 2.6)"><rect x="34.9" y="-0.6" width="2.2" height="3.6" fill="'+d+'"/>'+
      '<path d="M26.6 0.2 Q36 -9.4 45.4 0.2 Q41 2 36 2 Q31 2 26.6 0.2 Z" fill="'+c+'"'+gap(0.8)+'/>'+
      '<path d="M29.6 -0.6 L28.6 -2.2 M32.4 0.6 L31.8 -4.4 M36 1 V-5.6 M39.6 0.6 L40.2 -4.4 M42.4 -0.6 L43.4 -2.2" stroke="'+d+'" stroke-width=".7" stroke-linecap="round"/></g>'+
      '<path d="M27.4 14.2 Q27.4 2.2 36 2.2 Q44.6 2.2 44.6 14.2 L44.6 20 Q44.6 21.6 42.6 21.6 L40.8 21.6 Q39.4 17.6 38.4 15.2 L38.4 14.8 L33.6 14.8 L33.6 15.2 Q32.6 17.6 31.2 21.6 L29.4 21.6 Q27.4 21.6 27.4 20 Z" fill="'+c+'"'+gap(0.8)+'/>'+
      '<path d="M29.4 10.2 H34.9 V12.4 Q32.4 12.6 31 14.6 Q29.4 14 29.4 12 Z M42.6 10.2 H37.1 V12.4 Q39.6 12.6 41 14.6 Q42.6 14 42.6 12 Z" fill="'+HI+'"/>'+
      '<path d="M28.6 7.4 Q36 5 43.4 7.4" stroke="'+d+'" stroke-width=".8" fill="none"/><path d="M34.9 10.2 H37.1 V14.8 H34.9 Z" fill="'+c+'"/>';}
  if(has('gr-laurel')){const c=A('gr-laurel'),d=D('gr-laurel');let l='<path d="M33.4 5.4 Q28 6.4 28.4 12.8 M38.6 5.4 Q44 6.4 43.6 12.8" stroke="'+d+'" stroke-width=".8" fill="none" stroke-linecap="round"/>';
    [-1,1].forEach(function(side){[22,44,66,88].forEach(function(t,i){const r=t*Math.PI/180,x=36+side*Math.sin(r)*7.6,y=12.6-Math.cos(r)*7.6;
      [-1,1].forEach(function(o){const a=side*(t-90)+o*34+(side<0?180:0),ox=x+Math.cos((a)*Math.PI/180)*1.9,oy=y+Math.sin((a)*Math.PI/180)*1.9;
        l+='<ellipse cx="'+ox.toFixed(2)+'" cy="'+oy.toFixed(2)+'" rx="2.1" ry=".95" transform="rotate('+a.toFixed(1)+' '+ox.toFixed(2)+' '+oy.toFixed(2)+')"/>';});});});
    s+='<g fill="'+c+'"'+gap(0.5)+'>'+l+'</g>';}
  if(has('gr-hoplon')){const c=A('gr-hoplon'),d=D('gr-hoplon');
    s+='<circle cx="50.5" cy="42" r="12.6" fill="'+c+'"'+gap(0.9)+'/><circle cx="50.5" cy="42" r="10.2" fill="'+HI+'"/>'+
      '<circle cx="50.5" cy="42" r="8.3" fill="none" stroke="'+c+'" stroke-width="1.7" stroke-dasharray="1.6 1"/><circle cx="50.5" cy="42" r="2.8" fill="'+c+'"/><circle cx="50.5" cy="42" r="1.1" fill="'+d+'"/>';}
  if(has('gr-owl')){const c=A('gr-owl');
    s+='<g transform="translate(0 -2)"><path d="M53 75.4 Q51 67 54.5 62 L53.8 57.4 L56.6 59.9 Q58.2 59.3 59.8 59.9 L62.6 57.4 L61.9 62 Q65.4 67 63.4 75.4 Z" fill="'+HI+'"'+gap(0.9)+'/>'+
      '<circle cx="56.4" cy="62.6" r="1.5" fill="none" stroke="'+c+'" stroke-width=".9"/><circle cx="60" cy="62.6" r="1.5" fill="none" stroke="'+c+'" stroke-width=".9"/><path d="M57.6 64.4 L58.2 65.8 L58.8 64.4 Z" fill="'+c+'"/>'+
      '<path d="M54.6 66.6 Q55.6 71 58.2 73.4 M61.8 66.6 Q62 70 61 73" stroke="'+c+'" stroke-width=".8" fill="none" stroke-linecap="round"/><path d="M55.4 75.4 V77 M57 75.4 V77 M59.6 75.4 V77 M61.2 75.4 V77" stroke="'+c+'" stroke-width=".8" stroke-linecap="round"/>'+'</g>';}
  return '<svg class="herosvg" viewBox="0 -6 72 92" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+s+'</svg>';
}
/* ===== Карандашный: свой герой — манекен карандашом (рисунок Грока, js/hero-pencil.js) и его вещи.
   Холст Грока 0 0 120 240; по бокам поле, чтобы пропорции рамки (72:92) совпадали. Порядок слоёв — из его README. */
const HERO_PC_ORDER=['bottom','shoes','top','neck','belt','back','face','head','hand','offhand','pet'];
function heroPcVars(id){const v=heroHex(heroTryCol[id])||heroHex(((S.char&&S.char.gearColor)||{})[id]);if(!v)return '';
  return ' style="--pc-blue:'+v+';--pc-red:'+v+';--pc-f1:color-mix(in srgb,'+v+' 22%,var(--hero-bg));--pc-f2:color-mix(in srgb,'+v+' 42%,var(--hero-bg))"';}
function heroPencilSvg(on){
  on=on||heroOn();const A=(typeof HERO_PENCIL_ART!=='undefined')?HERO_PENCIL_ART:{hero:'',items:{}};
  const art=function(slot,part){const id=on[slot],it=id&&A.items[id];return it&&it[part]?'<g'+heroPcVars(id)+'>'+it[part]+'</g>':'';};
  let s='';Object.keys(HERO_SLOTS).forEach(function(k){s+=art(k,'back');});
  s+=A.hero;HERO_PC_ORDER.forEach(function(k){s+=art(k,'front');});
  return '<svg class="herosvg heropencil" viewBox="-34 0 188 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+s+'</svg>';
}
/* Небесный: персонаж целиком картинкой (hero/celestial/*.webp, режет source/tools/gen-celestial-heroes.py); подросток ростом 0.88 от взрослого (бриф) */
function heroCelestialSvg(on){on=on||heroOn();const g=heroItem(on.char)||heroItem(heroCharDefault('celestial'));if(!g)return '';
  const h=g.fig==='teen'?84.5:96;
  return '<svg class="herosvg herocel" viewBox="0 0 78 100" aria-hidden="true" focusable="false"><image href="hero/celestial/'+g.id.slice(3)+'.webp" x="0" y="'+(98-h)+'" width="78" height="'+h+'" preserveAspectRatio="xMidYMax meet"/></svg>';}
const HERO_FIGURES={pencil:heroPencilSvg,celestial:heroCelestialSvg}; /* свой герой скина; без записи — стикмен */
function heroFigure(on){const f=HERO_FIGURES[heroSkin()];return f?f(on):heroSvg(on);}
/* превью в магазине: герой текущего скина (у Эллады — с персонажем и его цветами) */
function heroRender(on,colCh){return HERO_FIGURES[heroSkin()]?heroFigure(on):heroSvg(on,colCh);}
/* герой стоит прямо на плашке: щели силуэта = цвет плашки под ним (первый непрозрачный фон вверх по дереву) */
function heroBgFix(root){if(document.documentElement.dataset.skin==='pencil'){(root||document).querySelectorAll('#avatarFrame,.heroframe').forEach(function(f){f.style.removeProperty('--hero-bg');});return;} /* у карандаша бумага плашки в ::before */
  (root||document).querySelectorAll('#avatarFrame,.heroframe').forEach(function(f){
  let n=f,c='';while(n&&n.nodeType===1){const b=getComputedStyle(n).backgroundColor;if(b&&!/rgba\([^)]*,\s*0\)|transparent/.test(b)){c=b;break;}n=n.parentElement;}
  if(c)f.style.setProperty('--hero-bg',c);});}
const _renderProfile=renderProfile;renderProfile=function(){_renderProfile.apply(this,arguments);try{heroBgFix(el('profile'));}catch(e){}};
/* профиль и мини-аватар в библиотеке рисуют героя через avatarSvg() — подменяем на стикмена */
avatarSvg=function(){return heroFigure();};
if(el('avatar'))el('avatar').onclick=function(){try{openLook(true);}catch(e){}const hk=heroGearHere().map(function(g){return g.kind;});heroShopTab(hk.indexOf('wear')>=0?'wear':hk.length?hk[0]:'skins');};

/* ===== Магазин: «Внешний вид» → Скины / Одежда / Снаряжение ===== */
let heroTab='skins',heroTry=null; /* примерка — только в памяти */
function heroShopTab(t){heroTab=t;heroTry=null;heroTryCol={};renderHeroShop();}
function heroTryOn(id){if(!heroFits(heroItem(id)))return;heroTry=heroTry===id?null:id;renderHeroShop();}
/* палитра: пока крутят — только примерка (перерисовываются картинки, не магазин); отпустили — купленной вещи цвет сохраняется */
function heroColLive(id,v){v=heroHex(v);if(!v||!heroFits(heroItem(id)))return;heroTryCol[id]=v;heroTry=heroOwns(id)?heroTry:id;
  const box=el('heroShop');if(!box)return;const on=heroOn(),tr=heroItem(heroTry);if(tr)on[tr.slot]=tr.id;
  const big=box.querySelector('.heroprev .heroframe');if(big)big.innerHTML=heroRender(on);
  const card=box.querySelector('.heroitem[data-id="'+id+'"]');if(card){const one={};one[heroItem(id).slot]=id;card.querySelector('.heroframe').innerHTML=heroRender(one,heroOn().char||'');card.querySelector('.herocolpick').style.background=v;}}
function heroSetCol(id,v){v=heroHex(v);if(!v||!heroFits(heroItem(id)))return;
  if(!heroOwns(id)){heroTryCol[id]=v;heroTry=id;renderHeroShop();return;}
  if(window.__rqWriter&&!window.__rqWriter.mayWrite())return;
  S.char=S.char||{};S.char.gearColor=S.char.gearColor||{};S.char.gearColor[heroColKey(id,heroOn().char||'')]=v;delete heroTryCol[id];save();renderHeroShop();try{renderProfile();}catch(e){}}
function heroOwns(id){const g=heroItem(id);return (!!g&&g.price===0)||(S.ownedGear||[]).indexOf(id)>=0;}
function heroWear(id){const g=heroItem(id);if(!g||!heroOwns(id)||!heroFits(g))return;if(window.__rqWriter&&!window.__rqWriter.mayWrite())return;
  S.equipped=S.equipped||{};const key=heroKey(g);S.equipped[key]=g.slot==='char'?(id===heroCharDefault(g.skin)?null:id):(S.equipped[key]===id?null:id);heroTry=null;save();renderHeroShop();try{renderProfile();}catch(e){}}
let heroPending=null;
function heroBuyAsk(id){const g=heroItem(id);if(!g||heroOwns(id)||!heroFits(g)||!heroSkinOwned(g))return;
  if(S.gold<g.price){flashMsg('Не хватает '+coinsP(g.price-S.gold));return;}
  heroPending=id;el('scTitle').textContent='Купить «'+g.name+'» за '+coinsP(g.price)+'?';
  el('scText').textContent='Останется '+coinsP(S.gold-g.price)+'. '+(g.slot==='char'?'Персонаж сразу станет вашим героем, одежда останется на нём.':'Вещь сразу наденется на героя.');
  el('shopConfirmScrim').hidden=false;el('shopConfirm').hidden=false;}
const _shopConfirmOk=shopConfirmOk,_shopConfirmClose=shopConfirmClose;
shopConfirmClose=function(){heroPending=null;_shopConfirmClose();};
shopConfirmOk=function(){
  const id=heroPending;if(!id)return _shopConfirmOk();
  shopConfirmClose();const g=heroItem(id);
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне');return;}
  if(!g||heroOwns(id)||!heroFits(g)||!heroSkinOwned(g)||!(S.gold>=g.price))return;
  S.gold-=g.price;S.ownedGear=(S.ownedGear||[]).concat(id);S.equipped=S.equipped||{};S.equipped[heroKey(g)]=id;heroTry=null;save();
  try{confettiReward();}catch(e){}flashMsg('Куплено: «'+g.name+'»');renderHeroShop();try{renderProfile();}catch(e){}
};
function renderHeroShop(){
  const kinds=document.querySelector('#look .shopkinds');if(!kinds)return;
  const here=heroGearHere();if(heroTab!=='skins'&&!here.some(function(g){return g.kind===heroTab;}))heroTab='skins';
  kinds.innerHTML=[['skins','Скины'],['chars','Персонажи'],['wear','Одежда'],['gear','Снаряжение']].filter(function(k){return k[0]==='skins'||here.some(function(g){return g.kind===k[0];});}).map(function(k){
    return '<button type="button" class="fchip'+(heroTab===k[0]?' on':'')+'" onclick="heroShopTab(\''+k[0]+'\')">'+k[1]+'</button>';}).join('');
  const list=el('shopList');let box=el('heroShop');
  if(!box){box=document.createElement('div');box.id='heroShop';list.parentNode.insertBefore(box,list.nextSibling);}
  const skins=heroTab==='skins';list.hidden=!skins;box.hidden=skins;
  const tb=el('btnTestGold');if(tb)tb.hidden=false;
  if(skins)return;
  const on=heroOn(),tr=heroItem(heroTry);if(tr)on[tr.slot]=tr.id;
  const items=here.filter(function(g){return g.kind===heroTab;});
  const sk=(items[0]||{}).skin,chars=heroTab==='chars',curCh=heroOn().char||'',note=sk?'<p class="heroskinnote">'+(chars?'Персонажи':'Вещи')+' скина «'+HERO_SKIN_NAME[sk]+'» есть только в этом скине.</p>':'';
  box.innerHTML='<div class="heroprev"><div class="heroframe big">'+heroRender(on)+'</div><div class="heroprevtx"><b>'+esc(S.heroName||'Читатель')+'</b>'+
      '<span>'+(tr?'Примерка: '+esc(tr.name):(chars?'Нажмите на персонажа, чтобы примерить':'Нажмите на вещь, чтобы примерить'))+'</span></div></div>'+note+
    '<div class="herogrid">'+items.map(function(g){
      const own=heroOwns(g.id),worn=g.slot==='char'?(curCh||heroCharDefault(g.skin))===g.id:(S.equipped||{})[heroKey(g)]===g.id,one={};one[g.slot]=g.id;
      const cta=chars&&worn?'<button type="button" class="buy owned shopcta" disabled>Выбран</button>'
        :chars&&own?'<button type="button" class="buy owned shopcta" onclick="event.stopPropagation();heroWear(\''+g.id+'\')">Выбрать</button>'
        :worn?'<button type="button" class="buy owned shopcta" onclick="event.stopPropagation();heroWear(\''+g.id+'\')">Снять</button>'
        :own?'<button type="button" class="buy owned shopcta" onclick="event.stopPropagation();heroWear(\''+g.id+'\')">Надеть</button>'
        :'<button type="button" class="buy shopcta"'+(S.gold>=g.price?'':' disabled')+' onclick="event.stopPropagation();heroBuyAsk(\''+g.id+'\')">'+(S.gold>=g.price?'Купить':'Не хватает '+(g.price-S.gold))+'</button>';
      return '<div role="button" tabindex="0" class="shopcard heroitem'+(heroTry===g.id?' trying':'')+'" data-id="'+g.id+'" onclick="heroTryOn(\''+g.id+'\')">'+
        '<span class="heroframe">'+heroRender(one,curCh)+'</span><span class="shopname">'+esc(g.name)+'</span>'+
        '<span class="shopprice">'+(chars?(own?(g.price?'Куплен':'Бесплатно'):coinsP(g.price)):(own?(worn?'Надето':'Куплено'):coinsP(g.price))+' · '+HERO_SLOTS[g.slot].toLowerCase())+'</span>'+(chars?'':
        '<label class="herocolrow" onclick="event.stopPropagation()"><span class="herocolpick" style="background:'+heroCol(g.id)+'"><input type="color" value="'+heroCol(g.id)+'" aria-label="Цвет: '+esc(g.name)+'" oninput="heroColLive(\''+g.id+'\',this.value)" onchange="heroSetCol(\''+g.id+'\',this.value)"></span>Цвет</label>')+cta+'</div>';
    }).join('')+'</div>';
  heroBgFix(box);
}
const _renderShopPane=renderShopPane;
renderShopPane=function(){_renderShopPane.apply(this,arguments);try{renderHeroShop();}catch(e){console.warn('[rq] hero shop',e);}};
