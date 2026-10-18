'use strict';
/* ===== Герой-стикмен и вещи из Эллады (Джессика 18.10: «персонажа основного заменить на стикмена»).
   Силуэт в цвете текста скина, одежда в акценте скина, щели между деталями = цвет фона рамки (--hero-bg),
   поэтому герой одинаково читается во всех скинах, днём и ночью. Лица и глаз нет.
   Вещи хранятся в S.ownedGear / S.equipped (поля уже в схеме) с id «gr-…»; старые вещи v6 стикмен не рисует. */
const HERO_SLOTS={head:'Голова',body:'Одежда',cloak:'Плащ',hand:'В руке',shield:'Щит',pet:'Спутник',bg:'Фон'};
const HERO_GEAR=[
 {id:'gr-helm',slot:'head',kind:'wear',name:'Коринфский шлем',price:300,desc:'Бронзовый шлем с гребнем'},
 {id:'gr-laurel',slot:'head',kind:'wear',name:'Лавровый венок',price:150,desc:'Награда победителю'},
 {id:'gr-chiton',slot:'body',kind:'wear',name:'Хитон',price:150,desc:'Туника с поясом'},
 {id:'gr-chlamys',slot:'cloak',kind:'wear',name:'Хламида',price:200,desc:'Плащ с фибулой на плече'},
 {id:'gr-dory',slot:'hand',kind:'gear',name:'Копьё',price:200,desc:'Дори гоплита'},
 {id:'gr-scroll',slot:'hand',kind:'gear',name:'Свиток',price:100,desc:'Для того, кто читает'},
 {id:'gr-hoplon',slot:'shield',kind:'gear',name:'Гоплон',price:250,desc:'Круглый щит с лямбдой'},
 {id:'gr-owl',slot:'pet',kind:'gear',name:'Сова Афины',price:350,desc:'Спутник мудрых'},
 {id:'gr-temple',slot:'bg',kind:'gear',name:'Акрополь',price:400,desc:'Храм за спиной героя'}
];
function heroItem(id){return HERO_GEAR.find(function(g){return g.id===id;})||null;}
function heroOn(){const eq=S.equipped||{},on={};Object.keys(HERO_SLOTS).forEach(function(k){if(heroItem(eq[k]))on[k]=eq[k];});return on;}
const HI='var(--txt)',HB='var(--hero-bg)'; /* --txt: и скины, и тема по умолчанию */
/* цвет вещи выбирает игрок (Джессика 18.10); по умолчанию бронза */
const HERO_COLORS=[['bronze','Бронза','#c8952f'],['skin','Цвет скина','var(--accent)'],['purple','Пурпур','#8e3363'],['azure','Лазурь','#2f74b5'],['olive','Олива','#7d8a2a']];
let heroTryCol={}; /* примерка цвета — только в памяти */
function heroColKey(id){const k=heroTryCol[id]||(S.char&&S.char.gearColor&&S.char.gearColor[id]);return HERO_COLORS.some(function(c){return c[0]===k;})?k:'bronze';}
function heroCol(id){const k=heroColKey(id);return HERO_COLORS.find(function(c){return c[0]===k;})[2];}
/** heroSvg(on): on = {slot:id}; без аргумента — то, что надето. viewBox 0 -6 72 84: сверху место под гребень шлема */
function heroSvg(on){
  on=on||heroOn();const has=function(id){return Object.keys(on).some(function(k){return on[k]===id;});};
  const gap=function(w){return ' stroke="'+HB+'" stroke-width="'+(w||1.2)+'" stroke-linejoin="round"';};
  const A=function(id){return heroCol(id);},D=function(id){return 'color-mix(in srgb,'+heroCol(id)+' 62%,#000)';};
  let s='';
  if(has('gr-temple')){const T='color-mix(in srgb,'+HI+' 17%,'+HB+')',T2='color-mix(in srgb,'+heroCol('gr-temple')+' 30%,'+HB+')';
    s+='<g fill="'+T+'"><path d="M5 25.5 L36 12 L67 25.5 Z"/><rect x="4" y="26" width="64" height="4.6" rx=".6"/><rect x="6" y="31.2" width="60" height="1.8"/>'+
      [9.5,19.5,29.5,38.5,48.5,58.5].map(function(x){return '<rect x="'+(x-0.6)+'" y="33.6" width="5.2" height="1.6"/><rect x="'+x+'" y="35.2" width="4" height="25.6"/><rect x="'+(x-0.6)+'" y="60.6" width="5.2" height="1.4"/>';}).join('')+
      '<rect x="5" y="62.4" width="62" height="2.6"/><rect x="3" y="65.4" width="66" height="2.6"/><rect x="1" y="68.4" width="70" height="2.6"/></g>'+
      '<path d="M14 24.4 L36 15 L58 24.4 Z" fill="'+T2+'"/>';}
  s+='<ellipse cx="36" cy="74.5" rx="17" ry="2.2" fill="'+HI+'" opacity=".12"/>';
  if(has('gr-dory')){const c=A('gr-dory');s+='<rect x="18.7" y="8" width="1.9" height="66" rx=".9" fill="'+HI+'"/><path d="M19.65 -5 Q23 2 19.65 9 Q16.3 2 19.65 -5 Z" fill="'+c+'"'+gap(0.7)+'/><path d="M19.65 -2.5 V7" stroke="'+D('gr-dory')+'" stroke-width=".6"/><rect x="18.2" y="8.6" width="2.9" height="1.8" rx=".5" fill="'+c+'"/><path d="M18.5 72 H20.8 L19.65 77 Z" fill="'+c+'"/>';}
  /* стикмен: голова, руки, корпус, ноги; щели между ними — фон */
  s+='<g fill="'+HI+'"'+gap(0.9)+'>'+
    '<rect x="29" y="46" width="6.6" height="27" rx="3.3"/><rect x="36.4" y="46" width="6.6" height="27" rx="3.3"/>'+
    '<rect x="23" y="22" width="4.8" height="24.5" rx="2.4"/><rect x="44.2" y="22" width="4.8" height="24.5" rx="2.4"/>'+
    '<rect x="28.2" y="21" width="15.6" height="28" rx="4.5"/>'+
    '<circle cx="36" cy="12" r="7"/></g>';
  if(has('gr-chiton')){const c=A('gr-chiton'),d=D('gr-chiton');
    s+='<path d="M28.4 22.4 L31.4 21 L36 26 L40.6 21 L43.6 22.4 L44.1 33.4 L47.6 61 Q36 63.4 24.4 61 L27.9 33.4 Z" fill="'+c+'"'+gap(1.1)+'/>'+
      '<rect x="27.7" y="33" width="16.6" height="2.8" rx=".8" fill="'+d+'"/>'+
      '<path d="M31 37.5 L29.4 60.5 M34.2 37.5 L33.6 61.6 M37.8 37.5 L38.4 61.6 M41 37.5 L42.6 60.5 M32.6 24.5 L33.4 32.4 M39.4 24.5 L38.6 32.4" stroke="'+d+'" stroke-width=".8" fill="none" stroke-linecap="round"/>';}
  if(has('gr-chlamys')){const c=A('gr-chlamys'),d=D('gr-chlamys');
    s+='<path d="M27.4 22.6 Q30 20.4 36.5 20.8 Q46.5 21 49.6 24.2 L51.8 40 L53 63 Q49.8 65 46.6 63 L45.6 47.4 Q37.6 40.6 29.6 27 Z" fill="'+c+'"'+gap(1.1)+'/>'+
      '<path d="M32.4 26.6 Q39 36 45.4 41 M35.6 24.2 Q42 31 46.6 33.6 M48.6 30 L49.6 61.6 M50.8 44 L51.4 62" stroke="'+d+'" stroke-width=".8" fill="none" stroke-linecap="round"/>'+
      '<circle cx="29.8" cy="24.4" r="2.4" fill="'+c+'" stroke="'+d+'" stroke-width=".9"/><circle cx="29.8" cy="24.4" r=".9" fill="'+d+'"/>';}
  if(has('gr-dory'))s+='<circle cx="22.2" cy="45" r="3.1" fill="'+HI+'"'+gap(0.9)+'/>';
  if(has('gr-scroll')){const c=A('gr-scroll'),d=D('gr-scroll');
    s+='<g transform="rotate(-24 22 44)"><rect x="19.6" y="34.4" width="4.8" height="16.4" rx="2" fill="'+c+'"'+gap(0.8)+'/><path d="M21 36.6 V48.6 M23 36.6 V48.6" stroke="'+d+'" stroke-width=".6"/>'+
      '<rect x="20.6" y="32.4" width="2.8" height="2.4" rx=".8" fill="'+d+'"/><rect x="20.6" y="50.4" width="2.8" height="2.4" rx=".8" fill="'+d+'"/></g>'+
      '<circle cx="24.6" cy="45.2" r="3" fill="'+HI+'"'+gap(0.9)+'/>';}
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
    s+='<circle cx="50.5" cy="42" r="12.6" fill="'+c+'"'+gap(1.4)+'/><circle cx="50.5" cy="42" r="10.2" fill="'+HI+'"/>'+
      '<circle cx="50.5" cy="42" r="8.3" fill="none" stroke="'+c+'" stroke-width="1.7" stroke-dasharray="1.6 1"/><circle cx="50.5" cy="42" r="2.8" fill="'+c+'"/><circle cx="50.5" cy="42" r="1.1" fill="'+d+'"/>';}
  if(has('gr-owl')){const c=A('gr-owl');
    s+='<path d="M53 75.4 Q51 67 54.5 62 L53.8 57.4 L56.6 59.9 Q58.2 59.3 59.8 59.9 L62.6 57.4 L61.9 62 Q65.4 67 63.4 75.4 Z" fill="'+HI+'"'+gap(0.9)+'/>'+
      '<circle cx="56.4" cy="62.6" r="1.5" fill="none" stroke="'+c+'" stroke-width=".9"/><circle cx="60" cy="62.6" r="1.5" fill="none" stroke="'+c+'" stroke-width=".9"/><path d="M57.6 64.4 L58.2 65.8 L58.8 64.4 Z" fill="'+c+'"/>'+
      '<path d="M54.6 66.6 Q55.6 71 58.2 73.4 M61.8 66.6 Q62 70 61 73" stroke="'+c+'" stroke-width=".8" fill="none" stroke-linecap="round"/><path d="M55.4 75.4 V77 M57 75.4 V77 M59.6 75.4 V77 M61.2 75.4 V77" stroke="'+c+'" stroke-width=".8" stroke-linecap="round"/>';}
  return '<svg class="herosvg" viewBox="0 -6 72 84" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+s+'</svg>';
}
/* герой стоит прямо на плашке: щели силуэта = цвет плашки под ним (первый непрозрачный фон вверх по дереву) */
function heroBgFix(root){if(document.documentElement.dataset.skin==='pencil'){(root||document).querySelectorAll('#avatarFrame,.heroframe').forEach(function(f){f.style.removeProperty('--hero-bg');});return;} /* у карандаша бумага плашки в ::before */
  (root||document).querySelectorAll('#avatarFrame,.heroframe').forEach(function(f){
  let n=f,c='';while(n&&n.nodeType===1){const b=getComputedStyle(n).backgroundColor;if(b&&!/rgba\([^)]*,\s*0\)|transparent/.test(b)){c=b;break;}n=n.parentElement;}
  if(c)f.style.setProperty('--hero-bg',c);});}
const _renderProfile=renderProfile;renderProfile=function(){_renderProfile.apply(this,arguments);try{heroBgFix(el('profile'));}catch(e){}};
/* профиль и мини-аватар в библиотеке рисуют героя через avatarSvg() — подменяем на стикмена */
avatarSvg=function(){return heroSvg();};
if(el('avatar'))el('avatar').onclick=function(){try{openLook(true);}catch(e){}heroShopTab('wear');};

/* ===== Магазин: «Внешний вид» → Скины / Одежда / Снаряжение ===== */
let heroTab='skins',heroTry=null; /* примерка — только в памяти */
function heroShopTab(t){heroTab=t;heroTry=null;heroTryCol={};renderHeroShop();}
/* цвет вещи: купленной — сохраняется сразу (бесплатно), некупленной — только примерка */
function heroSetCol(id,k){if(!heroItem(id))return;
  if(!heroOwns(id)){heroTryCol[id]=k;heroTry=id;renderHeroShop();return;}
  if(window.__rqWriter&&!window.__rqWriter.mayWrite())return;
  S.char=S.char||{};S.char.gearColor=S.char.gearColor||{};S.char.gearColor[id]=k;delete heroTryCol[id];save();renderHeroShop();try{renderProfile();}catch(e){}}
function heroTryOn(id){heroTry=heroTry===id?null:id;renderHeroShop();}
function heroOwns(id){return (S.ownedGear||[]).indexOf(id)>=0;}
function heroWear(id){const g=heroItem(id);if(!g||!heroOwns(id))return;if(window.__rqWriter&&!window.__rqWriter.mayWrite())return;
  S.equipped=S.equipped||{};S.equipped[g.slot]=S.equipped[g.slot]===id?null:id;heroTry=null;save();renderHeroShop();try{renderProfile();}catch(e){}}
let heroPending=null;
function heroBuyAsk(id){const g=heroItem(id);if(!g||heroOwns(id))return;
  if(S.gold<g.price){flashMsg('Не хватает '+coinsP(g.price-S.gold));return;}
  heroPending=id;el('scTitle').textContent='Купить «'+g.name+'» за '+coinsP(g.price)+'?';
  el('scText').textContent='Останется '+coinsP(S.gold-g.price)+'. Вещь сразу наденется на героя.';
  el('shopConfirmScrim').hidden=false;el('shopConfirm').hidden=false;}
const _shopConfirmOk=shopConfirmOk,_shopConfirmClose=shopConfirmClose;
shopConfirmClose=function(){heroPending=null;_shopConfirmClose();};
shopConfirmOk=function(){
  const id=heroPending;if(!id)return _shopConfirmOk();
  shopConfirmClose();const g=heroItem(id);
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне');return;}
  if(!g||heroOwns(id)||!(S.gold>=g.price))return;
  S.gold-=g.price;S.ownedGear=(S.ownedGear||[]).concat(id);S.equipped=S.equipped||{};S.equipped[g.slot]=id;heroTry=null;save();
  try{confettiReward();}catch(e){}flashMsg('Куплено: «'+g.name+'»');renderHeroShop();try{renderProfile();}catch(e){}
};
function renderHeroShop(){
  const kinds=document.querySelector('#look .shopkinds');if(!kinds)return;
  kinds.innerHTML=[['skins','Скины'],['wear','Одежда'],['gear','Снаряжение']].map(function(k){
    return '<button type="button" class="fchip'+(heroTab===k[0]?' on':'')+'" onclick="heroShopTab(\''+k[0]+'\')">'+k[1]+'</button>';}).join('');
  const list=el('shopList');let box=el('heroShop');
  if(!box){box=document.createElement('div');box.id='heroShop';list.parentNode.insertBefore(box,list.nextSibling);}
  const skins=heroTab==='skins';list.hidden=!skins;box.hidden=skins;
  const tb=el('btnTestGold');if(tb)tb.hidden=false;
  if(skins)return;
  const on=heroOn(),tr=heroItem(heroTry);if(tr)on[tr.slot]=tr.id;
  const items=HERO_GEAR.filter(function(g){return g.kind===heroTab;});
  box.innerHTML='<div class="heroprev"><div class="heroframe big">'+heroSvg(on)+'</div><div class="heroprevtx"><b>'+esc(S.heroName||'Читатель')+'</b>'+
      '<span>'+(tr?'Примерка: '+esc(tr.name):'Нажмите на вещь, чтобы примерить')+'</span></div></div>'+
    '<div class="herogrid">'+items.map(function(g){
      const own=heroOwns(g.id),worn=(S.equipped||{})[g.slot]===g.id,one={};one[g.slot]=g.id;
      const cta=worn?'<button type="button" class="buy owned shopcta" onclick="event.stopPropagation();heroWear(\''+g.id+'\')">Снять</button>'
        :own?'<button type="button" class="buy owned shopcta" onclick="event.stopPropagation();heroWear(\''+g.id+'\')">Надеть</button>'
        :'<button type="button" class="buy shopcta"'+(S.gold>=g.price?'':' disabled')+' onclick="event.stopPropagation();heroBuyAsk(\''+g.id+'\')">'+(S.gold>=g.price?'Купить':'Не хватает '+(g.price-S.gold))+'</button>';
      return '<div role="button" tabindex="0" class="shopcard herocard'+(heroTry===g.id?' trying':'')+'" onclick="heroTryOn(\''+g.id+'\')">'+
        '<span class="heroframe">'+heroSvg(one)+'</span><span class="shopname">'+esc(g.name)+'</span>'+
        '<span class="shopprice">'+(own?(worn?'Надето':'Куплено'):coinsP(g.price))+' · '+HERO_SLOTS[g.slot].toLowerCase()+'</span>'+
        '<span class="herocols">'+HERO_COLORS.map(function(c){return '<button type="button" class="herocol'+(heroColKey(g.id)===c[0]?' on':'')+'" style="background:'+c[2]+'" aria-label="'+c[1]+'" title="'+c[1]+'" onclick="event.stopPropagation();heroSetCol(\''+g.id+'\',\''+c[0]+'\')"></button>';}).join('')+'</span>'+cta+'</div>';
    }).join('')+'</div>';
  heroBgFix(box);
}
const _renderShopPane=renderShopPane;
renderShopPane=function(){_renderShopPane.apply(this,arguments);try{renderHeroShop();}catch(e){console.warn('[rq] hero shop',e);}};
