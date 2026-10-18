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
const HI='var(--txt)',HB='var(--hero-bg)',HA='var(--accent)',HC='color-mix(in srgb,var(--accent) 60%,var(--txt))'; /* --txt/--accent: и скины, и тема по умолчанию */
/** heroSvg(on): on = {slot:id}; без аргумента — то, что надето */
function heroSvg(on){
  on=on||heroOn();const has=function(id){return Object.keys(on).some(function(k){return on[k]===id;});};
  const gap=function(w){return ' stroke="'+HB+'" stroke-width="'+(w||1.2)+'" stroke-linejoin="round"';};
  let s='';
  if(has('gr-temple'))s+='<g fill="'+HI+'" opacity=".16"><path d="M5 29 L36 17 L67 29 Z"/><rect x="5" y="29.5" width="62" height="4.5"/>'+
    [8,19.5,31,42.5,54,62].map(function(x){return '<rect x="'+(x-0.5)+'" y="35" width="4.5" height="24"/>';}).join('')+
    '<rect x="6" y="59.5" width="60" height="3"/><rect x="3" y="63" width="66" height="3"/></g>';
  s+='<ellipse cx="36" cy="74.5" rx="17" ry="2.2" fill="'+HI+'" opacity=".12"/>';
  if(has('gr-chlamys'))s+='<path d="M25 23 Q36 19 47 23 L54 69 Q36 65 18 69 Z" fill="'+HC+'"'+gap()+'/>';
  if(has('gr-dory'))s+='<path d="M51 1 Q54 5.5 51 10.5 Q48 5.5 51 1 Z" fill="'+HI+'"/><rect x="50" y="9" width="2" height="64" rx="1" fill="'+HI+'"/>';
  /* стикмен: голова, плечи-руки, корпус, ноги; щели между ними — фон */
  s+='<g fill="'+HI+'"'+gap(0.9)+'>'+
    '<rect x="29" y="46" width="6.6" height="27" rx="3.3"/><rect x="36.4" y="46" width="6.6" height="27" rx="3.3"/>'+
    '<rect x="23" y="22" width="4.8" height="24.5" rx="2.4"/><rect x="44.2" y="22" width="4.8" height="24.5" rx="2.4"/>'+
    '<rect x="28.2" y="21" width="15.6" height="28" rx="4.5"/>'+
    '<circle cx="36" cy="12" r="7"/></g>';
  if(has('gr-chiton'))s+='<path d="M28.2 25.5 Q28.2 21 32.7 21 H39.3 Q43.8 21 43.8 25.5 L47.6 59.5 Q36 62.5 24.4 59.5 Z" fill="'+HA+'"'+gap()+'/>'+
    '<path d="M28.6 34 H43.4 M30 21.6 L41 33.6 M31.5 49 L31 60 M36 49 V61 M40.5 49 L41 60" stroke="'+HB+'" stroke-width="1" fill="none" stroke-linecap="round"/>';
  if(has('gr-chlamys'))s+='<circle cx="43" cy="24" r="1.9" fill="var(--rq-coin,'+HA+')"'+gap(0.8)+'/>';
  if(has('gr-helm'))s+='<path d="M25.6 8 Q36 -7.5 46.4 8 L43.6 9 Q36 -1 28.4 9 Z" fill="'+HA+'"'+gap(0.8)+'/>'+
    '<path d="M28.3 13 Q28.3 3.6 36 3.6 Q43.7 3.6 43.7 13 L43.7 20.4 L39.6 20.4 L39.6 15.6 L32.4 15.6 L32.4 20.4 L28.3 20.4 Z" fill="'+HI+'"'+gap()+'/>'+
    '<path d="M31 11.4 H41 V13 H36.8 V18.6 H35.2 V13 H31 Z" fill="'+HB+'"/>';
  if(has('gr-laurel')){let l='<path d="M30.3 5.6 A8.6 8.6 0 0 0 28.4 17.2 M41.7 5.6 A8.6 8.6 0 0 1 43.6 17.2" fill="none" stroke="'+HA+'" stroke-width="1.1"/>';
    [-1,1].forEach(function(side){[28,58,88,116].forEach(function(t){const r=t*Math.PI/180,x=36+side*Math.sin(r)*9.2,y=12-Math.cos(r)*9.2;
      l+='<ellipse cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" rx="2.9" ry="1.25" transform="rotate('+(side*t-side*20).toFixed(1)+' '+x.toFixed(2)+' '+y.toFixed(2)+')"/>';});});
    s+='<g fill="'+HA+'"'+gap(0.7)+'>'+l+'</g>';}
  if(has('gr-scroll'))s+='<rect x="47.6" y="39.5" width="10.4" height="9" fill="'+HA+'"'+gap(0.8)+'/><path d="M49.6 42.3 H56 M49.6 44.5 H56 M49.6 46.7 H54" stroke="'+HB+'" stroke-width=".8"/>'+
    '<rect x="45.6" y="37.6" width="2.8" height="12.8" rx="1.4" fill="'+HI+'"'+gap(0.8)+'/><rect x="57.2" y="37.6" width="2.8" height="12.8" rx="1.4" fill="'+HI+'"'+gap(0.8)+'/>';
  if(has('gr-hoplon'))s+='<circle cx="22" cy="41" r="11" fill="'+HI+'"'+gap(1.6)+'/><circle cx="22" cy="41" r="8.2" fill="none" stroke="'+HB+'" stroke-width="1.1"/>'+
    '<path d="M18.4 45.4 L22 36.4 L25.6 45.4" fill="none" stroke="'+HA+'" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
  if(has('gr-owl'))s+='<path d="M8.4 74 Q5.6 65 8.8 59.6 L8.2 55 L11 57.6 Q12.6 57 14.2 57.6 L17 55 L16.4 59.6 Q19.6 65 16.8 74 Z" fill="'+HI+'"'+gap(0.9)+'/>'+
    '<path d="M10 63 Q11.2 69 14.6 71.6 M15 63.4 Q16 67 15.4 70" stroke="'+HB+'" stroke-width=".9" fill="none" stroke-linecap="round"/>';
  return '<svg class="herosvg" viewBox="0 0 72 78" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+s+'</svg>';
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
function heroShopTab(t){heroTab=t;heroTry=null;renderHeroShop();}
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
        '<span class="shopprice">'+(own?(worn?'Надето':'Куплено'):coinsP(g.price))+' · '+HERO_SLOTS[g.slot].toLowerCase()+'</span>'+cta+'</div>';
    }).join('')+'</div>';
  heroBgFix(box);
}
const _renderShopPane=renderShopPane;
renderShopPane=function(){_renderShopPane.apply(this,arguments);try{renderHeroShop();}catch(e){console.warn('[rq] hero shop',e);}};
