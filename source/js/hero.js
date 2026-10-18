'use strict';
/* ===== Герой-стикмен и вещи из Эллады (Джессика 18.10: «персонажа основного заменить на стикмена»).
   Силуэт в цвете текста скина, одежда в акценте скина, щели между деталями = цвет фона рамки (--hero-bg),
   поэтому герой одинаково читается во всех скинах, днём и ночью. Лица и глаз нет.
   Вещи хранятся в S.ownedGear / S.equipped (поля уже в схеме) с id «gr-…»; старые вещи v6 стикмен не рисует. */
const HERO_SLOTS={head:'Голова',body:'Одежда',cloak:'Плащ',hand:'В руке',shield:'Щит',pet:'Спутник',bg:'Фон'};
const HERO_GEAR=[
 {id:'gr-helm',slot:'head',kind:'wear',name:'Коринфский шлем',skin:'ellada',price:300,desc:'Бронзовый шлем с гребнем'},
 {id:'gr-laurel',slot:'head',kind:'wear',name:'Лавровый венок',skin:'ellada',price:150,desc:'Награда победителю'},
 {id:'gr-chiton',slot:'body',kind:'wear',name:'Хитон',skin:'ellada',price:150,desc:'Туника с поясом'},
 {id:'gr-chlamys',slot:'cloak',kind:'wear',name:'Хламида',skin:'ellada',price:200,desc:'Плащ с фибулой на плече'},
 {id:'gr-dory',slot:'hand',kind:'gear',name:'Копьё',skin:'ellada',price:200,desc:'Дори гоплита'},
 {id:'gr-scroll',slot:'hand',kind:'gear',name:'Свиток',skin:'ellada',price:100,desc:'Для того, кто читает'},
 {id:'gr-hoplon',slot:'shield',kind:'gear',name:'Гоплон',skin:'ellada',price:250,desc:'Круглый щит с лямбдой'},
 {id:'gr-owl',slot:'pet',kind:'gear',name:'Сова Афины',skin:'ellada',price:350,desc:'Спутник мудрых'},
 {id:'gr-temple',slot:'bg',kind:'gear',name:'Акрополь',skin:'ellada',price:400,desc:'Храм за спиной героя'}
];
function heroItem(id){return HERO_GEAR.find(function(g){return g.id===id;})||null;}
/* вещи привязаны к скину (Джессика 18.10): купить можно, только если куплен скин; на герое видны только в этом скине */
const HERO_SKIN_NAME={ellada:'Эллада'};
function heroSkin(){try{return activeTheme().skin||'';}catch(e){return document.documentElement.dataset.skin||'';}}
function heroFits(g){return !!g&&(!g.skin||g.skin===heroSkin());}
function heroSkinOwned(g){return !g.skin||shopOwns('skin-'+g.skin);}
function heroOn(){const eq=S.equipped||{},on={};Object.keys(HERO_SLOTS).forEach(function(k){const g=heroItem(eq[k]);if(g&&heroFits(g))on[k]=eq[k];});return on;}
const HI='var(--txt)',HB='var(--hero-bg)'; /* --txt: и скины, и тема по умолчанию */
/* цвет вещи игрок выбирает сам, любой (Джессика 18.10: «дать человеку выбрать и настроить цвет самому»); по умолчанию бронза */
const HERO_BRONZE='#b5822a'; /* темнее, чтобы не сливаться с кремовыми плашками */
let heroTryCol={}; /* примерка цвета — только в памяти */
function heroHex(v){return typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():null;}
function heroCol(id){return heroHex(heroTryCol[id])||heroHex(S.char&&S.char.gearColor&&S.char.gearColor[id])||HERO_BRONZE;}
/** heroSvg(on): on = {slot:id}; без аргумента — то, что надето. viewBox 0 -6 72 92: сверху место под гребень шлема */
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
  /* постамент, как у статуи (Джессика 18.10: «чего-то не хватает») */
  const P='color-mix(in srgb,'+HI+' 16%,'+HB+')',P2='color-mix(in srgb,'+HI+' 30%,'+HB+')';
  s+='<rect x="14" y="73.4" width="44" height="2.4" rx=".6" fill="'+P2+'"/><rect x="16.5" y="76.2" width="39" height="6.2" fill="'+P+'"/>'+
    '<path d="M19 80.6 V78 H22 V80.6 H25 V78 H28 V80.6 H31 V78 H34 V80.6 H37 V78 H40 V80.6 H43 V78 H46 V80.6 H49 V78 H52 V80.6" fill="none" stroke="'+P2+'" stroke-width=".8"/>'+
    '<rect x="14" y="82.8" width="44" height="2.2" rx=".6" fill="'+P2+'"/>';
  if(has('gr-dory')){const c=A('gr-dory');s+='<rect x="19.65" y="8" width="1.9" height="65.4" rx=".9" fill="'+HI+'"/><path d="M20.6 -5 Q23.95 2 20.6 9 Q17.25 2 20.6 -5 Z" fill="'+c+'"'+gap(0.7)+'/><path d="M20.6 -2.5 V7" stroke="'+D('gr-dory')+'" stroke-width=".6"/><rect x="19.15" y="8.6" width="2.9" height="1.8" rx=".5" fill="'+c+'"/>';}
  /* поза зависит от того, что в руке (Джессика 18.10): копьё — рука отведена к древку, свиток — рука у груди, читает */
  const pose=has('gr-dory')?'spear':has('gr-scroll')?'scroll':'down';
  const limb=function(d){return '<path d="'+d+'" fill="none" stroke="'+HB+'" stroke-width="6.6" stroke-linecap="round" stroke-linejoin="round"/><path d="'+d+'" fill="none" stroke="'+HI+'" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round"/>';};
  if(pose==='spear')s+=limb('M25.4 24.4 L21 43.6');
  if(pose==='scroll')s+=limb('M25.4 24.4 L25.2 37.6');
  /* стикмен: голова, руки, корпус, ноги; щели между ними — фон */
  s+='<g fill="'+HI+'"'+gap(0.9)+'>'+
    '<rect x="29" y="46" width="6.6" height="27" rx="3.3"/><rect x="36.4" y="46" width="6.6" height="27" rx="3.3"/>'+
    (pose==='down'?'<rect x="23" y="22" width="4.8" height="24.5" rx="2.4"/>':'')+'<rect x="44.2" y="22" width="4.8" height="24.5" rx="2.4"/>'+
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
  if(has('gr-scroll')){const c=A('gr-scroll'),d=D('gr-scroll');
    s+=limb('M25.2 37.6 L31 33.4')+
      '<rect x="31" y="27.4" width="9.6" height="8.4" fill="'+c+'"'+gap(0.8)+'/><path d="M33 30 H38.6 M33 32 H38.6 M33 34 H37" stroke="'+d+'" stroke-width=".6"/>'+
      '<rect x="29.4" y="25.6" width="2.8" height="12" rx="1.4" fill="'+d+'"'+gap(0.6)+'/><rect x="39.4" y="25.6" width="2.8" height="12" rx="1.4" fill="'+d+'"'+gap(0.6)+'/>';}
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
function heroTryOn(id){heroTry=heroTry===id?null:id;renderHeroShop();}
/* палитра: пока крутят — только примерка (перерисовываются картинки, не магазин); отпустили — купленной вещи цвет сохраняется */
function heroColLive(id,v){v=heroHex(v);if(!v)return;heroTryCol[id]=v;heroTry=heroOwns(id)?heroTry:id;
  const box=el('heroShop');if(!box)return;const on=heroOn(),tr=heroItem(heroTry);if(tr)on[tr.slot]=tr.id;
  const big=box.querySelector('.heroprev .heroframe');if(big)big.innerHTML=heroSvg(on);
  const card=box.querySelector('.heroitem[data-id="'+id+'"]');if(card){const one={};one[heroItem(id).slot]=id;card.querySelector('.heroframe').innerHTML=heroSvg(one);card.querySelector('.herocolpick').style.background=v;}}
function heroSetCol(id,v){v=heroHex(v);if(!v||!heroItem(id))return;
  if(!heroOwns(id)){heroTryCol[id]=v;heroTry=id;renderHeroShop();return;}
  if(window.__rqWriter&&!window.__rqWriter.mayWrite())return;
  S.char=S.char||{};S.char.gearColor=S.char.gearColor||{};S.char.gearColor[id]=v;delete heroTryCol[id];save();renderHeroShop();try{renderProfile();}catch(e){}}
function heroOwns(id){return (S.ownedGear||[]).indexOf(id)>=0;}
function heroWear(id){const g=heroItem(id);if(!g||!heroOwns(id)||!heroFits(g))return;if(window.__rqWriter&&!window.__rqWriter.mayWrite())return;
  S.equipped=S.equipped||{};S.equipped[g.slot]=S.equipped[g.slot]===id?null:id;heroTry=null;save();renderHeroShop();try{renderProfile();}catch(e){}}
/* в чужом скине кнопка вещи надевает её скин */
function heroWearSkin(id){const g=heroItem(id);if(!g||!g.skin)return;wear('skin-'+g.skin);try{renderShopPane();}catch(e){}try{renderProfile();}catch(e){}}
let heroPending=null;
function heroBuyAsk(id){const g=heroItem(id);if(!g||heroOwns(id))return;
  if(!heroSkinOwned(g)){flashMsg('Сначала купите скин «'+HERO_SKIN_NAME[g.skin]+'»');return;}
  if(S.gold<g.price){flashMsg('Не хватает '+coinsP(g.price-S.gold));return;}
  heroPending=id;el('scTitle').textContent='Купить «'+g.name+'» за '+coinsP(g.price)+'?';
  el('scText').textContent='Останется '+coinsP(S.gold-g.price)+'. '+(heroFits(g)?'Вещь сразу наденется на героя.':'Вещь видна на герое только в скине «'+HERO_SKIN_NAME[g.skin]+'».');
  el('shopConfirmScrim').hidden=false;el('shopConfirm').hidden=false;}
const _shopConfirmOk=shopConfirmOk,_shopConfirmClose=shopConfirmClose;
shopConfirmClose=function(){heroPending=null;_shopConfirmClose();};
shopConfirmOk=function(){
  const id=heroPending;if(!id)return _shopConfirmOk();
  shopConfirmClose();const g=heroItem(id);
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне');return;}
  if(!g||heroOwns(id)||!heroSkinOwned(g)||!(S.gold>=g.price))return;
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
  const sk=(items[0]||{}).skin,skName=HERO_SKIN_NAME[sk]||'',skOn=sk===heroSkin(),skOwn=!sk||shopOwns('skin-'+sk);
  const note=sk?'<p class="heroskinnote">Вещи скина «'+skName+'»: '+(skOn?'видны на герое только в этом скине.':skOwn?'на герое они видны, только когда надет этот скин.':'купить их можно после покупки скина.')+'</p>':'';
  box.innerHTML='<div class="heroprev"><div class="heroframe big">'+heroSvg(on)+'</div><div class="heroprevtx"><b>'+esc(S.heroName||'Читатель')+'</b>'+
      '<span>'+(tr?'Примерка: '+esc(tr.name):'Нажмите на вещь, чтобы примерить')+'</span></div></div>'+note+
    '<div class="herogrid">'+items.map(function(g){
      const own=heroOwns(g.id),worn=heroFits(g)&&(S.equipped||{})[g.slot]===g.id,one={};one[g.slot]=g.id;
      const fits=heroFits(g),skinOwn=heroSkinOwned(g);
      const cta=!skinOwn?'<button type="button" class="buy shopcta" onclick="event.stopPropagation();heroShopTab(\'skins\')">Нужен скин</button>'
        :own&&!fits?'<button type="button" class="buy owned shopcta" onclick="event.stopPropagation();heroWearSkin(\''+g.id+'\')">Надеть скин</button>'
        :worn?'<button type="button" class="buy owned shopcta" onclick="event.stopPropagation();heroWear(\''+g.id+'\')">Снять</button>'
        :own?'<button type="button" class="buy owned shopcta" onclick="event.stopPropagation();heroWear(\''+g.id+'\')">Надеть</button>'
        :'<button type="button" class="buy shopcta"'+(S.gold>=g.price?'':' disabled')+' onclick="event.stopPropagation();heroBuyAsk(\''+g.id+'\')">'+(S.gold>=g.price?'Купить':'Не хватает '+(g.price-S.gold))+'</button>';
      return '<div role="button" tabindex="0" class="shopcard heroitem'+(heroTry===g.id?' trying':'')+'" data-id="'+g.id+'" onclick="heroTryOn(\''+g.id+'\')">'+
        '<span class="heroframe">'+heroSvg(one)+'</span><span class="shopname">'+esc(g.name)+'</span>'+
        '<span class="shopprice">'+(own?(worn?'Надето':'Куплено'):coinsP(g.price))+' · '+HERO_SLOTS[g.slot].toLowerCase()+'</span>'+
        '<label class="herocolrow" onclick="event.stopPropagation()"><span class="herocolpick" style="background:'+heroCol(g.id)+'"><input type="color" value="'+heroCol(g.id)+'" aria-label="Цвет: '+esc(g.name)+'" oninput="heroColLive(\''+g.id+'\',this.value)" onchange="heroSetCol(\''+g.id+'\',this.value)"></span>Цвет</label>'+cta+'</div>';
    }).join('')+'</div>';
  heroBgFix(box);
}
const _renderShopPane=renderShopPane;
renderShopPane=function(){_renderShopPane.apply(this,arguments);try{renderHeroShop();}catch(e){console.warn('[rq] hero shop',e);}};
