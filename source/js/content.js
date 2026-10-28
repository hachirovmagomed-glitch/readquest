'use strict';
/* ================= ЦИТАТЫ ================= */
function renderQuotes(o){
  /* 28.10: search, colour, order, export (js/quotes.js); a card, «Объясни», «В дневник» on every quote */
  if(!(o&&o.list)&&el('qaTools'))el('qaTools').innerHTML=qaToolsHtml();
  const parts=[],any=allBooks().some(b=>(S.quotes[b.id]||[]).length),dy=qDiaryOn();
  qaRows().forEach(g=>{const b=g.b;
    parts.push('<h2>'+esc(b.title)+'</h2>');
    g.rows.forEach(x=>{const q=x.q,i=x.i,a=(k,ic,t)=>'<button type="button" data-qact="'+k+'" data-bid="'+esc(b.id)+'" data-i="'+i+'">'+rqIcon(ic,14)+' '+t+'</button>';
      parts.push('<div class="qcard" data-c="'+hlKey(q.c)+'" style="--d:'+hlDot(q.c)+'"><div class="qtext">«'+esc(q.text)+'»</div>'+
        (q.note?'<div class="qnote">'+rqIcon('notebook-pen',14)+' '+esc(q.note)+'</div>':'')+
        '<div class="qmeta"><span>'+esc(rqDayRu(q.date))+'</span><div class="spacer"></div>'+
        a('card','image','карточка')+a('ai','sparkles','объясни')+(dy?a('dy','notebook-pen','в дневник'):'')+a('copy','copy','копировать')+a('del','trash-2','удалить')+'</div></div>');
    });
  });
  el('quoteBox').innerHTML=parts.length?parts.join(''):any?'<div class="emptyhint" style="color:var(--muted);text-align:center;padding:40px 0">Ничего не нашлось</div>':
    '<div class="emptyhint" style="color:var(--muted);text-align:center;padding:50px 0">Выделите текст в книге и нажмите цвет&nbsp;— '+rqIcon('highlighter',14)+'&nbsp;цитата появится здесь.'+(isMvp()?'':'<br><br>Каждая цитата приносит +2 '+curI())+'</div>'; /* MVP: quotes give no coins → no promise */
}
function copyQuote(bid,i){
  const b=allBooks().find(x=>x.id===bid);const q=(S.quotes[bid]||[])[i];if(!b||!q)return;
  copyText('«'+q.text+'»'+(q.note?'\n'+q.note:'')+'\n— '+b.title+', '+b.author);
}
async function delQuote(bid,i){
  const q0=(S.quotes[bid]||[])[i];if(!q0)return;const t0=String(q0.text).replace(/\s+/g,' ');
  if(!await rqAsk({t:'Удалить цитату?',p:'«'+t0.slice(0,140)+(t0.length>140?'…':'')+'»'+(q0.note?' — и заметку к ней':''),ok:'Удалить',danger:true}))return; /* 28.10: as in «Навигация» */
  const qs=S.quotes[bid]||[];if(qs.indexOf(q0)<0)return;i=qs.indexOf(q0);const rm=qs.splice(i,1)[0];
  if(rm){const h=S.hl[bid]||[];const j=h.indexOf(rm.text);if(j>-1)h.splice(j,1);}
  save();renderQuotes();
}
el('btnCopyAll').onclick=()=>{
  const parts=[];
  allBooks().forEach(b=>(S.quotes[b.id]||[]).forEach(q=>
    parts.push('«'+q.text+'»'+(q.note?' — '+q.note:'')+' ('+b.title+')')));
  if(parts.length){copyText(parts.join('\n\n'));rqAlert('Скопировано цитат: '+parts.length);}
  else rqAlert('Пока нет ни одной цитаты');
};

/* ================= МАГАЗИН ================= */
/* 9 old themes that used to be locked: FREE since the shop build (14.10). Picking one = SET.theme=id; activeTheme() renders it, no ownership. */
const OLD_THEMES=[
 {id:'midnight',name:'Полночь',bg:'#0e1a2b',txt:'#a9c5e8'},
 {id:'kraft',name:'Крафт',bg:'#e8d9b5',txt:'#4a3b22'},
 {id:'forest',name:'Лес',bg:'#16241c',txt:'#b9d8c2'},
 {id:'lavender',name:'Лаванда',bg:'#f0eaff',txt:'#4a3b6b'},
 {id:'mint',name:'Мята',bg:'#eafff4',txt:'#1f4a38'},
 {id:'rose',name:'Роза',bg:'#2b0e1f',txt:'#e8a9c5'},
 {id:'ocean',name:'Океан',bg:'#0b2230',txt:'#9fd4e8'},
 {id:'coffee',name:'Кофе',bg:'#2a1f17',txt:'#d8c4a9'},
 {id:'matrix',name:'Матрица',bg:'#061206',txt:'#54d854'}
];
/* ================= МАГАЗИН (скины и расцветки) — контракт Архитектора «Магазин» 14.10 =================
   Каталог только в коде, цена из хранилища не читается. id: skin-<имя>, color-<скин>-<имя> (поле skin, флаг bundled).
   Комплектная расцветка не продаётся и не пишется в купленные. Купленное = S.owned (NS_v1.game). Надетое = SET.skin / SET.color (NS_set). */
const SHOP_CATALOG=(function(){
  const L=[];
  const sk=(id,name,price,desc,cols)=>{L.push({id:'skin-'+id,type:'skin',name:name,price:price,desc:desc});
    cols.forEach((c,i)=>L.push({id:'color-'+id+'-'+c[0],type:'color',skin:'skin-'+id,name:c[1],price:i===0?0:150,bundled:i===0,sw:c[2]}));};
  sk('pencil','Карандашный',0,'Графит на тёплой бумаге',[['graphite','Графит','#f3f0e7']]);
  sk('pergament','Пергамент',500,'Пиксельный свиток, перо и чернильница',[['classic','Классика','#e9d8a6'],['candle','Ночная свеча','#2a2118'],['sea','Морской','#cfe3e6']]);
  sk('gravyura','Гравюра',500,'Книжная гравюра: ельник, лиса, облака',[['day','День','#e8e4d6'],['night','Ночь','#1d2a26'],['autumn','Осень','#e9d2b0']]);
  sk('starry','Звёздный',500,'Ночное небо и созвездия',[['base','Звёздный','#121a33'],['chart','Карта неба','#1c2440'],['dawn','Рассвет','#f1d9c8']]);
  sk('dungeon','Подземелье',800,'Каменные своды и факелы',[['base','Подземелье','#1b1a1f'],['emerald','Изумруд','#10261f'],['ice','Лёд','#1a2630']]);
  sk('celestial','Небесный',800,'Небо на закате, золотые рамки и звёздная ночь',[['base','Небесный','#f6efe2']]); /* handoff/skins/celestial (17.10, прототип rannie/mockups/celestial); день и ночь внутри скина */
  sk('krik','Крик',800,'Экспрессия: закат и мост',[['base','Крик','#f0a35b'],['night','Ночь','#1f2340']]);
  sk('ellada','Эллада',500,'Вазопись, белый мрамор и Эгейское море',[['base','Эллада','#f4f0e8']]); /* handoff/skins/ellada (Джессика 15.10) */
  sk('babochkovyi','Бабочковый',500,'Перламутровые крылья, летний луг и мотыльки',[['base','Бабочковый','#f4f2f8']]); /* handoff/skins/babochkovyi (16.10) */
  const seen={};L.forEach(x=>{if(seen[x.id])throw new Error('SHOP_CATALOG: duplicate id '+x.id);seen[x.id]=1;});
  return Object.freeze(L.map(Object.freeze));
})();
const SHOP_OLD_IDS={'skin-les':'skin-gravyura','skin-forest':'skin-gravyura'}; /* «Лес» → «Гравюра» */
function shopMigrateId(id){if(typeof id!=='string')return id;if(SHOP_OLD_IDS[id])return SHOP_OLD_IDS[id];const m=/^color-(les|forest)-(.+)$/.exec(id);return m?'color-gravyura-'+m[2]:id;}
function shopItem(id){return SHOP_CATALOG.find(x=>x.id===id)||null;}
/* audit 15.10 (Маня): a skin without its app styling yet is «Скоро» — no «Купить», buy() refuses. Already bought on /test/: stays owned, no refund.
   A skin joins this list in the build that ships its styling (tests may push ids to exercise the buy contract). */
const SHOP_READY=['skin-pencil','skin-ellada','skin-babochkovyi','skin-celestial'];
function shopReady(id){const it=shopItem(id);if(!it)return false;const sid=it.type==='skin'?it.id:it.skin;
  return SHOP_READY.indexOf(sid)>=0;}
/** owned: bought (S.owned) or free (price 0 skin) or bundled colour of an owned skin */
function shopOwns(id){const it=shopItem(id);if(!it)return false;
  if(it.type==='skin')return it.price===0||(S.owned||[]).indexOf(id)>=0;
  if(it.bundled)return shopOwns(it.skin);
  return (S.owned||[]).indexOf(id)>=0;}
function shopBundled(skinId){return (SHOP_CATALOG.find(x=>x.type==='color'&&x.skin===skinId&&x.bundled)||{}).id||null;}
/** buy(id): one function, one NS_v1 write, idempotent; devMoney has no effect. → {ok, reason?} */
function buy(id){
  if(window.__rqWriter&&!window.__rqWriter.mayWrite())return {ok:false,reason:'passive'};
  const it=shopItem(id);if(!it)return {ok:false,reason:'unknown'};
  if(it.price<=0||it.bundled)return {ok:false,reason:'free'};
  if(!shopReady(id))return {ok:false,reason:'soon'};
  if((S.owned||[]).indexOf(id)>=0)return {ok:false,reason:'owned'};
  if(it.type==='color'&&!shopOwns(it.skin))return {ok:false,reason:'skin'};
  if(!(typeof S.gold==='number'&&S.gold>=it.price))return {ok:false,reason:'gold'};
  S.gold-=it.price;S.owned=(S.owned||[]).concat(id);save();
  try{if(__rq&&__rq.logAnalyticsEvent)__rq.logAnalyticsEvent({type:'purchase',id:id,price:it.price}).catch(function(){});}catch(e){}
  return {ok:true};
}
/** wear a skin / colour (NS_set {skin,color}); «Карандашный» also switches the app-wide skin */
function wear(id){
  const it=shopItem(id);if(!it||!shopOwns(id)||!shopReady(id))return false;
  const skin=it.type==='skin'?it.id:it.skin, color=it.type==='color'?it.id:shopBundled(it.id);
  const from=skinOf(activeTheme());
  SET.skin=skin;SET.color=color;
  /* a styled skin = its own reader theme (day kept if already in this skin's night); an unstyled one leaves any skin theme */
  const key=skin.replace(/^skin-/,''), cur=activeTheme();
  if(key==='pencil'||SKIN_THEMES[key]){if(cur.skin!==key)SET.theme=skinWearKey(key);}
  else if(cur.skin)SET.theme='sepia';
  saveSet();applySet();logSkinChange(from);return true;
}
/** worn skin id (validated): not owned / unknown → default, in memory only */
function shopWorn(){
  const t=activeTheme();if(t.skin)return 'skin-'+t.skin; /* the skin on screen (pencil, or an owned styled shop skin) */
  return SET.skin&&SET.skin!=='skin-pencil'&&!SKIN_THEMES[SET.skin.replace(/^skin-/,'')]&&shopOwns(SET.skin)?SET.skin:null;
}
/** load/import: migrate «Лес» ids, drop a worn skin/colour that is not owned (memory only, NS_set not rewritten here) */
function shopFixState(){
  if(Array.isArray(S.owned))S.owned=S.owned.map(shopMigrateId).filter((x,i,a)=>a.indexOf(x)===i);
  SET.skin=shopMigrateId(SET.skin);SET.color=shopMigrateId(SET.color);
  if(SET.skin&&!shopOwns(SET.skin)){SET.skin=null;SET.color=null;}
  if(SET.color){const c=shopItem(SET.color);if(!c||c.skin!==SET.skin||!shopOwns(SET.color))SET.color=SET.skin?shopBundled(SET.skin):null;}
}
/* примерка: memory only; cleared on leaving the shop, closing, сворачивание */
let shopTrying=null;
function shopTryOn(id){shopTrying=shopItem(id)?id:null;renderShopPane();}
function shopTry(){return shopTrying;}
function shopTryClear(){if(shopTrying!==null){shopTrying=null;try{renderShopPane();}catch(e){}}}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')shopTryClear();});
let shopOpen=null; /* skin id shown in the detail */
function shopState(it){
  if(it.type==='skin'){
    if(!shopReady(it.id))return {k:'soon',t:'Скоро'};
    if(shopWorn()===it.id)return {k:'worn',t:'Надето'};
    if(shopOwns(it.id))return {k:'owned',t:it.price?'Куплено':'Бесплатно'};
    if(S.gold>=it.price)return {k:'buy',t:'Купить'};
    return {k:'short',t:'Не хватает '+(it.price-S.gold)};
  }
  return null;
}
function renderShopPane(){
  const box=el('shopList');if(!box)return;
  if(el('lookBalance'))el('lookBalance').textContent=coinsP(S.gold); /* balance as text next to «Магазин скинов» */
  box.innerHTML=SHOP_CATALOG.filter(x=>x.type==='skin').map(function(it){
    const st=shopState(it), sw=(SHOP_CATALOG.find(x=>x.skin===it.id&&x.bundled)||{}).sw||'#ccc';
    const cta=st.k==='buy'?'<button type="button" class="buy shopcta" onclick="event.stopPropagation();shopBuyAsk(\''+it.id+'\')">Купить</button>'
      :st.k==='owned'?'<button type="button" class="buy shopcta" onclick="event.stopPropagation();wear(\''+it.id+'\');shopRefresh()">Надеть</button>'
      :st.k==='worn'?'<button type="button" class="buy shopcta st-worn" disabled>'+rqIcon('check',16)+'Надето</button>' /* audit 19.10 SHOP-02: on = outline + tick, off = dashed */
      :'<button type="button" class="buy shopcta st-off" disabled>'+esc(st.t)+'</button>';
    return '<div role="button" tabindex="0" class="shopcard" data-id="'+it.id+'" data-st="'+st.k+'" onclick="openShopDetail(\''+it.id+'\')">'+
      '<span class="shopcov" style="background:'+sw+'"></span><span class="shopname">'+esc(it.name)+'</span>'+
      '<span class="shopprice">'+(it.price?coinsP(it.price):'Бесплатно')+'</span>'+(st.k==='owned'&&it.price?'<span class="shopst">'+esc(st.t)+'</span>':'')+cta+'</div>';
  }).join('');
  /* test build only (namespace rqt, not URL): +1000 coins through the normal write gate */
  if(window.RQ_NS==='rqt'&&!el('btnTestGold')){const b=document.createElement('button');b.type='button';b.id='btnTestGold';b.className='ghostbtn';b.textContent='+1000 монет для теста';b.onclick=shopTestGold;box.parentNode.insertBefore(b,box);}
  renderShopDetail();
}
let shopListScroll=0; /* list scroll position: memory only, never stored */
/* skin page: full screen over the shop; try-on lives in memory; ← / system back / сворачивание reset it and write nothing */
/* the shop list scrolls with «Внешний вид» (17.10); after wearing, the «Скин» row above it follows */
function shopScroller(){const l=el('look');return l&&l.querySelector('.scroll');}
function shopRefresh(){renderShopPane();try{renderSettings();}catch(e){}}
function openShopDetail(id){const rs=shopScroller();if(shopOpen===null&&rs)shopListScroll=rs.scrollTop;
  shopOpen=id;shopTrying=null;renderShopDetail();const d=el('shopDetail');if(d){d.hidden=false;const b=d.querySelector('.spbody');if(b)b.scrollTop=0;}
  navPush('shopskin');}
function shopBack(){const was=shopOpen!==null;closeShopDetail();if(was&&navState()==='shopskin')try{history.back();}catch(e){}}
window.addEventListener('popstate',function(e){const st=(e.state&&e.state.rq)||null;if(shopOpen!==null&&st!=='shopskin')closeShopDetail();});
function closeShopDetail(){const was=shopOpen!==null;shopOpen=null;shopTryClear();const d=el('shopDetail');if(d)d.hidden=true;const sc=el('shopDetailScrim');if(sc)sc.hidden=true;try{shopConfirmClose();}catch(e){}
  if(was){const rs=shopScroller();if(rs)rs.scrollTop=shopListScroll;}}
function renderShopDetail(){
  const d=el('shopDetail');if(!d)return;const it=shopItem(shopOpen);if(!it){d.hidden=true;const sc=el('shopDetailScrim');if(sc)sc.hidden=true;return;}
  const owned=shopOwns(it.id), worn=shopWorn()===it.id;
  const cols=SHOP_CATALOG.filter(x=>x.type==='color'&&x.skin===it.id);
  const sel=shopTrying&&shopItem(shopTrying)&&shopItem(shopTrying).skin===it.id?shopTrying:(worn&&SET.color)||shopBundled(it.id);
  const selIt=shopItem(sel);
  let btn,act;const ready=shopReady(it.id);
  if(!ready){btn='Скоро';act='';} /* audit 15.10: no styling yet → nothing to buy or wear */
  else if(!owned){btn='Купить скин за '+coinsP(it.price);act='shopBuyAsk(\''+it.id+'\')';}
  else if(selIt&&!selIt.bundled&&!shopOwns(sel)){btn='Купить расцветку за '+coinsP(selIt.price);act='shopBuyAsk(\''+sel+'\')';}
  else if(worn&&(!selIt||SET.color===sel)){btn='Надето';act='';}
  else {btn='Надеть';act='wear(\''+(selIt?sel:it.id)+'\');shopRefresh()';}
  const state=worn?'<span class="spst on">Надето</span>':owned?'<span class="spst">'+(it.price?'Куплено':'Бесплатно')+'</span>':'<span class="spst">'+coinsP(it.price)+'</span>';
  const prev=(selIt&&selIt.sw)||'#ccc';
  d.innerHTML='<div class="sphead"><button type="button" id="shopBack" class="spback" onclick="shopBack()" aria-label="Назад">'+rqIcon('arrow-left',22)+'</button>'+
      '<b class="shopdh">'+esc(it.name)+'</b><div class="spacer"></div><span class="chip">'+coinsP(S.gold)+'</span></div>'+
    '<div class="spbody"><div class="spprev"><span class="spphone" style="background:'+prev+'"></span><span class="spphone" style="background:'+prev+'"></span></div>'+
    '<div class="row sptitle"><b>'+esc(it.name)+'</b><div class="spacer"></div>'+state+'</div>'+
    '<div class="spdesc">'+esc(it.desc||'')+'</div>'+
    '<div class="row shopcols-h"><span>Расцветки</span><div class="spacer"></div><small>'+(owned?'первая — со скином':'сначала купите скин')+'</small></div><div class="shopcols">'+
    cols.map(function(c){return '<button type="button" class="shopcol'+(c.id===sel?' on':'')+'" data-id="'+c.id+'" onclick="shopTryOn(\''+c.id+'\')">'+
      '<span class="shopcov" style="background:'+c.sw+'"></span><small>'+esc(c.name)+'</small><small class="shopcp">'+(c.bundled?'Со скином':shopOwns(c.id)?'Куплено':coinsP(c.price))+'</small></button>';}).join('')+'</div>'+
    '<div class="spdesc" style="font-size:12px">'+(!ready?'Оформление этого скина появится в одной из следующих сборок.':owned?'Нажмите на расцветку, чтобы примерить её на экранах выше.':'Расцветки можно примерить сейчас, купить — после покупки скина.')+'</div></div>'+
    '<div class="spfoot"><button type="button" class="buy shopbuy"'+(act?' onclick="'+act+'"':' disabled')+(ready&&!owned&&S.gold<it.price?' disabled':'')+'>'+btn+'</button>'+
    '<div class="spcap">'+(!ready?(owned?'Куплено · наденете, когда выйдет оформление':'Купить можно будет, когда выйдет оформление'):worn?'Этот скин сейчас на вас':owned?'Куплено · можно сменить в любой момент':'Монеты дают квесты за чтение')+'</div></div>';
}
let shopPending=null; /* id waiting in the confirm dialog; buy() runs only from «Купить», once */
function shopBuyAsk(id){
  const it=shopItem(id);if(!it||!shopReady(id))return;
  if(S.gold<it.price){flashMsg('Не хватает '+coinsP(it.price-S.gold));return;}
  const nm=it.type==='color'?it.name+' ('+(shopItem(it.skin)||{}).name+')':it.name;
  shopPending=id;
  el('scTitle').textContent='Купить «'+nm+'» за '+coinsP(it.price)+'?';
  el('scText').textContent='Останется '+coinsP(S.gold-it.price)+'.'+(it.type==='skin'?' Скин можно будет сразу надеть.':'');
  el('shopConfirmScrim').hidden=false;el('shopConfirm').hidden=false;
}
function shopConfirmClose(){shopPending=null;el('shopConfirm').hidden=true;el('shopConfirmScrim').hidden=true;}
function shopConfirmOk(){
  const id=shopPending;if(!id)return;shopConfirmClose();
  const it=shopItem(id),nm=it.type==='color'?it.name+' ('+(shopItem(it.skin)||{}).name+')':it.name;
  const r=buy(id);
  if(r.ok){try{confettiReward();}catch(e){}flashMsg('Куплено: «'+nm+'»');}
  else if(r.reason==='passive')flashMsg('Приложение открыто в другом окне');
  shopTrying=null;renderRewardsSheet();try{renderSettings();}catch(e){}
}
function shopTestGold(){
  if(window.RQ_NS!=='rqt')return;
  if(window.__rqWriter&&!window.__rqWriter.mayWrite())return;
  S.gold=(S.gold||0)+1000;save();renderRewardsSheet();try{renderSettings();}catch(e){}
  try{if(window.__rq&&__rq.logAnalyticsEvent)__rq.logAnalyticsEvent({type:'test_gold',amount:1000}).catch(function(){});}catch(e){} /* arch.md 16.10: test coins are marked in events */
}
function rqNavH(){const n=el('botnav');return n&&getComputedStyle(n).display!=='none'?n.offsetHeight:0;}
let shopLast='game';
function openShopTab(sub){
  if(sub!=='real')sub='game';
  shopLast=sub;
  if(el('shopGame'))el('shopGame').classList.toggle('hidden',sub!=='game');
  if(el('shopReal'))el('shopReal').classList.toggle('hidden',sub!=='real');
  document.querySelectorAll('.shtab').forEach(b=>b.classList.toggle('on',b.dataset.sub===sub));
}
function gearShopHtml(){
  return GEAR_CATS.map(function(cat){
    const items=SHOP_GEAR.filter(function(g){return catOf(g.slot)===cat[0];});
    if(!items.length)return '';
    return '<div class="gearsec-h">'+cat[1]+'</div>'+items.map(function(g){
      const owned=S.ownedGear.indexOf(g.id)>=0,on=S.equipped[g.slot]===g.id;
      return '<div class="shopitem"><div class="tprev gearprev">'+g.icon+'</div>'+
        '<div style="flex:1;min-width:0"><b>'+esc(g.name)+'</b><div style="font-size:12px;color:var(--muted)">'+esc(g.desc)+'</div></div>'+
        (owned?'<button class="buy owned" onclick="equipGear(\''+g.id+'\')">'+(on?'Снять':'Надеть')+'</button>'
              :'<button class="buy" '+(canAfford(g.cost)?'':'disabled')+' onclick="buyGear(\''+g.id+'\')">'+coinsP(g.cost)+'</button>')+
        '</div>';
    }).join('');
  }).join('');
}
function renderShop(){
  el('shopGold').textContent=coinsP(S.gold);
  el('shopGear').innerHTML=gearShopHtml();
  el('shopPixel').innerHTML=pixelShopHtml();
  el('shopThemes').innerHTML=OLD_THEMES.map(t=>'<div class="shopitem"><div class="tprev" style="background:'+t.bg+';color:'+t.txt+'">Aa</div>'+
      '<div style="flex:1;min-width:0"><b>'+t.name+'</b><div style="font-size:12px;color:var(--muted)">тема читалки · бесплатно</div></div>'+
      '<button class="buy owned" onclick="useTheme(\''+t.id+'\')">Применить</button></div>').join('');
  renderRewards();
  openShopTab(shopLast);
}
function useTheme(id){
  SET.theme=id;SET.cBg=null;SET.cTxt=null;saveSet();applySet();
  rqAlert('Тема применена! Откройте любую книгу');
}
function renderRewards(){
  el('shopRewards').innerHTML=S.rewards.map((r,i)=>({r:r,i:i}))
    .sort((a,b)=>(b.r.fav?1:0)-(a.r.fav?1:0))
    .map(function(o){
      const r=o.r,i=o.i;
      const infinite=(r.qty==null);
      const remain=infinite?'∞':Math.max(0,(r.qty||0)-(r.bought||0));
      const sold=!infinite&&remain<=0;
      const canBuy=canAfford(r.cost)&&!sold;
      return '<div class="shopitem"><div class="tprev">'+rqIcon('gift',22)+'</div>'+
        '<div style="flex:1;min-width:0"><b>'+(r.fav?rqIcon('star',14)+' ':'')+esc(r.name)+'</b>'+
        '<div style="font-size:12px;color:var(--muted)">'+
          (infinite?'∞ · получено '+(r.bought||0):'осталось '+remain+' · получено '+(r.bought||0))+
          ' · <button class="lnk" onclick="toggleRewardFav('+i+')">'+(r.fav?'★':'☆')+'</button>'+
          ' · <button class="lnk" onclick="editReward('+i+')">изм.</button>'+
          (r.bought>0?' · <button class="lnk" onclick="undoRewardClaim('+i+')">отмена</button>':'')+
          ' · <button class="lnk danger" onclick="delReward('+i+')">удалить</button>'+
        '</div></div>'+
        '<button class="buy" '+(canBuy?'':'disabled')+' onclick="buyReward('+i+')">'+coinsP(r.cost)+'</button></div>';
    }).join('');
}
function buyReward(i){
  const r=S.rewards[i];if(!r||!canAfford(r.cost))return;
  const infinite=(r.qty==null);
  if(!infinite&&((r.qty||0)-(r.bought||0))<=0){rqAlert('Награда закончилась');return;}
  spend(r.cost);r.bought=(r.bought||0)+1;
  S.rewardPurchases=S.rewardPurchases||[];S.rewardPurchases.push({id:'rp_'+Date.now(),title:r.name,price:r.cost,at:new Date().toISOString()});
  save();confetti();renderShop();
  rqAlert('Награда ваша: «'+r.name+'»! Вы заслужили её чтением.');
}
function undoRewardClaim(i){
  const r=S.rewards[i];if(!r||!(r.bought>0))return;
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне');return;}
  if(!confirm('Отменить последнее получение «'+r.name+'» и вернуть '+r.cost+' монет'+'?'))return;
  r.bought--;S.gold+=r.cost;
  /* arch.md 16.10: refund record next to the purchase (metrics.py: buys = purchases − refunds) */
  S.rewardPurchases=S.rewardPurchases||[];S.rewardRefunds=S.rewardRefunds||[];
  const done={};S.rewardRefunds.forEach(function(x){if(x&&x.purchaseId)done[x.purchaseId]=1;});
  let pid=null;for(let k=S.rewardPurchases.length-1;k>=0;k--){const pp=S.rewardPurchases[k];if(pp&&pp.title===r.name&&!done[pp.id]){pid=pp.id;break;}}
  S.rewardRefunds.push({id:'rr_'+Date.now(),purchaseId:pid,title:r.name,price:r.cost,at:new Date().toISOString()});
  save();renderShop();
}
function toggleRewardFav(i){const r=S.rewards[i];if(!r)return;r.fav=!r.fav;save();renderShop();}
function editReward(i){
  const r=S.rewards[i];if(!r)return;
  const name=prompt('Название награды:',r.name);if(name===null)return;if(name.trim())r.name=name.trim().slice(0,60);
  const cost=parseInt(prompt('Цена в '+'монет'+':',r.cost),10);if(cost&&cost>0)r.cost=Math.min(999,cost);
  const q=prompt('Количество (пусто или 0 — бесконечно):',r.qty==null?'':r.qty);
  if(q!==null){const qn=parseInt(q,10);r.qty=(!qn||qn<=0)?null:qn;}
  save();renderShop();
}
function delReward(i){if(!confirm('Удалить награду?'))return;S.rewards.splice(i,1);save();renderShop();}
el('btnAddReward').onclick=()=>{
  const name=prompt('Название награды (например, «Эпизод сериала»):');if(!name||!name.trim())return;
  const cost=parseInt(prompt('Цена в '+'монет'+':','100'),10);
  if(!cost||cost<1)return;
  const q=parseInt(prompt('Количество (пусто/0 — бесконечно):','0'),10);
  S.rewards.push({name:name.trim().slice(0,60),cost:Math.min(999,cost),bought:0,qty:(!q||q<=0)?null:q,fav:false,item:null});
  save();renderShop();
};

/* ================= КВЕСТЫ ================= */
function distinctStats(){return allStats().filter(s=>(S.stats[s]||0)>0).length;}
const QUESTS=[
 {id:'daily30',name:'Прочитать 30 минут за день',reward:50,period:()=>today(),prog:()=>Math.min(1,S.minToday/30),info:()=>Math.round(S.minToday)+' / 30 мин'},
 {id:'genre3',name:'Качнуть 3 разные характеристики',reward:100,period:()=>'once',prog:()=>Math.min(1,distinctStats()/3),info:()=>distinctStats()+' / 3'},
 {id:'finish2',name:'Дочитать 2 книги',reward:200,period:()=>'once',prog:()=>Math.min(1,S.finished.length/2),info:()=>S.finished.length+' / 2'},
 {id:'streak7q',name:'Удержать стрик 7 дней',reward:150,period:()=>'once',prog:()=>Math.min(1,S.streak/7),info:()=>S.streak+' / 7'},
 {id:'chain1',name:'Путь читателя I: дочитать книгу',reward:100,period:()=>'once',prog:()=>Math.min(1,S.finished.length/1),info:()=>S.finished.length+' / 1'},
 {id:'chain2',name:'Путь читателя II: 3 книги',reward:250,period:()=>'once',prog:()=>Math.min(1,S.finished.length/3),info:()=>S.finished.length+' / 3',need:'chain1'},
 {id:'chain3',name:'Путь читателя III: 5 книг',reward:500,period:()=>'once',prog:()=>Math.min(1,S.finished.length/5),info:()=>S.finished.length+' / 5',need:'chain2'},
 {id:'month10',name:'Сезонный: 10 дней чтения в этом месяце',reward:300,period:()=>today().slice(0,7),prog:()=>Math.min(1,monthDays()/10),info:()=>monthDays()+' / 10'}
];
function monthDays(){
  const m=today().slice(0,7);
  return Object.keys(S.hist).filter(d=>d.startsWith(m)&&(S.hist[d].min||0)>=1).length;
}
/* ONE code constant for quest payouts (separate from RQ_MVP_DRAWER_EXTRAS). MVP economy = 10 XP/min, +30/day, +120/week only:
   while false, MVP quests pay nothing and cards show no reward line. Never stored in NS_set or exports. Outside MVP quests pay as before. */
const RQ_MVP_QUEST_PAYOUTS=false;
function questPays(){return !isMvp()||RQ_MVP_QUEST_PAYOUTS;}
function renderQuests(){
  if(el('qstHint'))el('qstHint').textContent=questPays()?'Выполняйте цели и забирайте награды. Создавайте свои квесты под любые читательские задачи.':'Цели для чтения. Создавайте свои под любые задачи'; /* tied to RQ_MVP_QUEST_PAYOUTS */
  if(el('qstGold'))el('qstGold').textContent=goldDisp()+' монет';
  el('questBox').innerHTML=allQuests().map(q=>{
    const key=q.id+':'+q.period();
    const done=!!S.claimed[key];
    const locked=q.need&&!S.claimed[q.need+':once'];
    const p=locked?0:q.prog();
    const edit=q.custom?'<button style="color:var(--muted);text-decoration:underline;font-size:11px;padding:0 6px" onclick="editCustomQuest(\''+q.id+'\')">изм.</button><button class="x" onclick="delCustomQuest(\''+q.id+'\')">✕</button>':'';
    return '<div class="pcard quest'+(locked?' locked':'')+'"><div class="row"><span style="font-size:14px">'+q.name+'</span><div class="spacer"></div>'+
      (locked?'<span class="chip" aria-label="Закрыто">'+rqIcon('lock',14)+'</span>'
        :done?'<span class="chip">'+rqIcon('check',14)+' получено</span>'
        :p>=1?(questPays()?'<button class="buy" onclick="claimQuest(\''+q.id+'\')">Забрать +'+q.reward+' монет'+'</button>':'<span class="chip">Выполнено</span>')
        :'<span class="chip">'+q.info()+'</span>')+
      edit+
      '</div><div class="pbar"><i style="width:'+Math.round(p*100)+'%"></i></div></div>';
  }).join('')+'<button class="miniadd" onclick="addCustomQuest()">'+rqIcon('plus',16)+'Добавить свой квест</button>';
}
function claimQuest(id){
  if(!questPays())return; /* RQ_MVP_QUEST_PAYOUTS off: no payout, nothing written */
  const q=allQuests().find(x=>x.id===id);if(!q)return;
  const key=q.id+':'+q.period();
  if(S.claimed[key]||q.prog()<1)return;
  S.claimed[key]=true;S.gold+=q.reward;S.goldAllTime=(S.goldAllTime||0)+q.reward;save();confetti();renderQuests();
}

/* ================= PDF ================= */
function loadPdfJs(){
  return new Promise(function(res,rej){
    if(window.pdfjsLib)return res();
    const s=document.createElement('script');
    /* vendored with the build (vendor/pdfjs, pdf.js 3.11.174) — works offline / without a CDN */
    s.src='vendor/pdfjs/pdf.min.js';
    s.onload=function(){
      window.pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdfjs/pdf.worker.min.js';
      res();
    };
    s.onerror=function(){rej(new Error('не загрузился PDF-модуль (vendor/pdfjs)'));};
    document.head.appendChild(s);
  });
}
function idb(){
  /* Same DB as storage/idb.js (v3: files + sessions + events). Prefer __rq.idb when booted. */
  if(__rq&&__rq.idb&&__rq.idb.openDb)return __rq.idb.openDb();
  return new Promise(function(res,rej){
    const r=indexedDB.open(RQ_K.idb,3);
    r.onupgradeneeded=function(){
      const db=r.result;
      if(!db.objectStoreNames.contains('files'))db.createObjectStore('files');
      if(!db.objectStoreNames.contains('sessions')){
        const s=db.createObjectStore('sessions',{keyPath:'id',autoIncrement:true});
        s.createIndex('byDate','date',{unique:false});
        s.createIndex('byBookId','bookId',{unique:false});
      }
      if(!db.objectStoreNames.contains('events')){
        const e=db.createObjectStore('events',{keyPath:'id',autoIncrement:true});
        e.createIndex('byDate','date',{unique:false});
        e.createIndex('byBookId','bookId',{unique:false});
      }
    };
    r.onsuccess=function(){res(r.result);};
    r.onerror=function(){rej(r.error);};
  });
}
async function idbPut(k,v){
  if(__rq&&__rq.idb&&__rq.idb.put)return __rq.idb.put(k,v);
  const d=await idb();
  return new Promise(function(res,rej){
    const t=d.transaction('files','readwrite');
    t.objectStore('files').put(v,k);
    t.oncomplete=res;t.onerror=function(){rej(t.error);};
  });
}
async function idbGet(k){
  if(__rq&&__rq.idb&&__rq.idb.get)return __rq.idb.get(k);
  const d=await idb();
  return new Promise(function(res,rej){
    const g=d.transaction('files').objectStore('files').get(k);
    g.onsuccess=function(){res(g.result);};
    g.onerror=function(){rej(g.error);};
  });
}

/* ================= EPUB ================= */
function loadJSZip(){
  return new Promise(function(res,rej){
    if(window.JSZip)return res();
    const s=document.createElement('script');
    s.src='vendor/jszip/jszip.min.js'; /* 28.10: vendored with the build (precached) — EPUB opens offline, no CDN */
    s.onload=function(){res();};
    s.onerror=function(){rej(new Error('не загрузился модуль EPUB (vendor/jszip)'));};
    document.head.appendChild(s);
  });
}
function decodeEntities(s){
  return s.replace(/&#(\d+);/g,(m,n)=>String.fromCodePoint(+n||32)).replace(/&#x([0-9a-f]+);/gi,(m,n)=>String.fromCodePoint(parseInt(n,16)||32)) /* 28.10: hex too (&#x2014;) */
    .replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
}
function htmlToText(s){
  s=s.replace(/<head[\s\S]*?<\/head>/gi,'')
     .replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'');
  s=s.replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi,'\n\n').replace(/<br[^>]*\/?>/gi,'\n');
  s=s.replace(/<[^>]+>/g,'');
  s=decodeEntities(s);
  return s.split(/\n+/).map(x=>x.trim()).filter(Boolean).join('\n\n');
}
/* 28.10 (ревизия чтения): FB2 / EPUB markup → paragraphs separated by a blank line.
   Every block-level tag ends a paragraph: also FB2 verse lines <v>, <text-author>, <subtitle>, <title>, <empty-line/> (they were glued
   to the next paragraph). Line breaks of the source file inside a paragraph are spaces. o.heads: <h1-3> start a chapter → heads [{off,t,lvl}].
   o.img(src) → a marker «￼img:N» (its own paragraph) or ''. */
function bookHtmlText(s,o){
  o=o||{};
  s=String(s||'').replace(/<head[\s\S]*?<\/head>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<!--[\s\S]*?-->/g,'');
  s=s.replace(/\s*[\r\n]+\s*/g,' ');
  if(o.heads)s=s.replace(/<h([1-3])\b[^>]*>/gi,function(m,l){return '\n\n\u0001'+l;});
  if(o.img)s=s.replace(/<(?:img|image)\b[^>]*>/gi,function(tag){const m=/\s(?:src|(?:xlink|l):href|href)\s*=\s*["']([^"']+)["']/i.exec(tag);const mk=m?o.img(decodeEntities(m[1])):'';return mk?'\n\n'+mk+'\n\n':'';});
  s=s.replace(/<\/(p|div|h[1-6]|li|blockquote|tr|dt|dd|figcaption|pre|table|section|v|text-author|subtitle|title|stanza|poem|epigraph|cite|annotation)\s*>/gi,'\n\n')
     .replace(/<(empty-line|hr)\b[^>]*\/?>/gi,'\n\n').replace(/<br\b[^>]*\/?>/gi,'\n');
  s=s.replace(/<[^>]+>/g,'');
  s=decodeEntities(s).replace(/ /g,' ');
  const ps=s.split(/\n+/).map(function(x){return x.replace(/[ \t]+/g,' ').trim();}).filter(Boolean);
  const heads=[];let text='';
  ps.forEach(function(x){
    const h=/^\u0001([1-3])\s*/.exec(x);if(h){x=x.slice(h[0].length);if(!x)return;heads.push({off:text.length+(text?2:0),t:x.slice(0,80),lvl:+h[1]-1});}
    x=x.replace(/\u0001[1-3]/g,'');if(!x)return;text+=(text?'\n\n':'')+x;});
  return {text:text,heads:heads};
}
/* 28.10: pictures of an imported book are kept apart from the text: parse → r.imgs [{data: Uint8Array, type}], the text holds
   «￼img:N» as a paragraph; importBookFile writes them to IDB «img:<book id>:<N>» (js/reader.js rqBookImgs shows them). */
const BOOK_IMG_MAX=3*1024*1024,BOOK_IMG_N=300;
function bookImgType(n,t){t=String(t||'').toLowerCase();if(/^image\//.test(t))return t;const e=(/\.(\w+)$/.exec(String(n||''))||[])[1]||'';
  return {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml'}[e.toLowerCase()]||'image/jpeg';}
function zipPath(dir,href){const out=[];(dir+href.split('#')[0]).split('/').forEach(function(x){if(x==='..')out.pop();else if(x&&x!=='.')out.push(x);});return out.join('/');}
async function parseEpub(file,opts){
  const withImg=!(opts&&opts.images===false);
  await loadJSZip();
  const zip=await window.JSZip.loadAsync(file);
  const contFile=zip.file('META-INF/container.xml');
  if(!contFile)throw new Error('это не EPUB');
  const cont=await contFile.async('string');
  const opfPath=(cont.match(/full-path="([^"]+)"/)||[])[1];
  if(!opfPath)throw new Error('повреждённый EPUB');
  const opf=await zip.file(opfPath).async('string');
  const dir=opfPath.replace(/[^\/]*$/,'');
  const title=decodeEntities((opf.match(/<dc:title[^>]*>([^<]+)/)||[])[1]||file.name.replace(/\.epub$/i,''));
  const author=decodeEntities((opf.match(/<dc:creator[^>]*>([^<]+)/)||[])[1]||'EPUB');
  const man={};
  (opf.match(/<item\b[^>]*>/g)||[]).forEach(tag=>{
    const id=(tag.match(/\bid="([^"]+)"/)||[])[1];
    const href=(tag.match(/href="([^"]+)"/)||[])[1];
    if(id&&href)man[id]=href;
  });
  const spine=[];
  (opf.match(/<itemref\b[^>]*idref="([^"]+)"/g)||[]).forEach(s=>{
    spine.push(s.match(/idref="([^"]+)"/)[1]);
  });
  let text='';const toc=[],files=[],imgs=[],seen={};
  for(const id of spine){
    const href=man[id];if(!href)continue;
    const fp=dir+decodeURIComponent(href);
    const f=zip.file(fp)||zip.file(dir+href);
    if(!f)continue;
    const xhtml=await f.async('string'),fdir=fp.replace(/[^\/]*$/,''),want=[];
    const r=bookHtmlText(xhtml,{heads:true,img:withImg?function(src){
      if(/^(data|https?):/i.test(src)||imgs.length+want.length>=BOOK_IMG_N)return '';
      const pth=zipPath(fdir,decodeURIComponent(src));if(!zip.file(pth))return '';
      if(!(pth in seen)){seen[pth]=imgs.length+want.length;want.push(pth);}return '￼img:'+seen[pth];}:null});
    for(const pth of want){const data=await zip.file(pth).async('uint8array');imgs.push(data.length<=BOOK_IMG_MAX?{data:data,type:bookImgType(pth)}:null);}
    if(!r.text)continue;
    const base=text.length;
    r.heads.forEach(function(h){toc.push({t:h.t,off:base+h.off,lvl:h.lvl});});
    files.push({off:base,t:r.text});
    text+=r.text+'\n\n';
  }
  if(!text.trim())throw new Error('не удалось извлечь текст');
  /* a book without any <h1-3>: one chapter per file of the spine, named by its first words (the old way) */
  if(!toc.length)files.forEach(function(x,i){const t=x.t.replace(/^￼img:\d+\s*/,'');if(t)toc.push({t:t.slice(0,60),off:x.off});});
  /* the outermost heading level present is level 0 */
  const top=toc.reduce(function(m,x){return Math.min(m,x.lvl||0);},9);toc.forEach(function(x){if(x.lvl!=null)x.lvl=Math.max(0,x.lvl-top);});
  const lang=((opf.match(/<dc:language[^>]*>\s*([A-Za-z]{2,3})/)||[])[1]||'').toLowerCase(); /* 19.10: was the FB2 line (xml is not defined here), so every EPUB import threw */
  return {title:title,author:author,text:text.trim(),toc:toc,lang:lang,imgs:imgs};
}

async function idbDel(k){
  const d=await idb();
  return new Promise(function(res,rej){
    const t=d.transaction('files','readwrite');
    t.objectStore('files').delete(k);
    t.oncomplete=res;t.onerror=function(){rej(t.error);};
  });
}

/* ================= О КНИГЕ ================= */
function fmtSize(n){
  if(!n&&n!==0)return '—';
  if(n<1024)return n+' Б';
  if(n<1048576)return (n/1024).toFixed(1).replace('.',',')+' КБ'; /* audit 19.10 GL-10: decimal comma */
  return (n/1048576).toFixed(2).replace('.',',')+' МБ';
}
/** audit 19.10 GL-10: 12 288 — digit groups with a narrow no-break space (U+202F) */
function fmtInt(n){return String(Math.round(Number(n)||0)).replace(/\B(?=(\d{3})+(?!\d))/g,'\u202F');}
function bkIc(n){return '<svg class="ic" width="20" height="20" aria-hidden="true" focusable="false"><use href="#i-'+n+'"/></svg>';}
/* 19.10 «Сложность» (Джессика): automatic level, the reader may pick a LOWER one (S.bookLvl); levels above the automatic one are disabled.
   One save() per tap; opening the card writes nothing. Shown only while lvlOn() (test site). */
function bookLvlHtml(b){
  if(typeof lvlOn!=='function'||!lvlOn())return '';
  const G=window.__rqGame,L=G.LEVELS,auto=bookLvlAuto(b),cur=bookLvlOf(b),m=function(x){return String(L[x].xp).replace('.',',');};
  return '<div class="bk-h">Сложность</div><div class="chips bk-shelves" role="radiogroup" aria-label="Сложность книги">'+
    L.map(function(x,i){const on=i===cur,off=i>auto;
      const nm=lvlName(i);
      return '<button type="button" class="fchip'+(on?' on':'')+'" role="radio" aria-checked="'+on+'"'+(off?' disabled aria-disabled="true" title="Повысить сложность нельзя"':nm!==x.n?' title="'+esc(x.n)+'"':'')+' onclick="setBookLvl(\''+b.id+'\','+i+')">'+(on?rqIcon('check',14):off?rqIcon('lock',14):'')+esc(nm)+(i?' ×'+m(i):'')+'</button>';}).join('')+
    '</div>'+bookLvlWhyHtml(b)+'<div class="bk-note">'+(auto?'Определена по тексту, терминам, автору и названию, твоему темпу и оценке нейросети. ':'')+'Чем сложнее книга, тем больше опыта (до ×'+m(L.length-1)+') и бонус +'+L[1].coins+'…+'+L[L.length-1].coins+' монет за каждые 10 минут, не больше +'+G.LVL_DAY_CAP+' в день. Понизить можно, повысить нельзя.</div>';
}
/* 22.10 (Джессика: «Давай первое. И четвертое»): what raised the level — the reader's pace and the neural network (own key) */
function bookLvlWhyHtml(b){
  const w=bookLvlWhy(b),out=[];
  if(w.pace>0)out.push('<div class="bk-note" id="bkLvlPace">'+rqIcon('clock',14)+' Твой темп: на странице в '+String(Math.round(w.r*10)/10).replace('.',',')+' раза дольше, чем в других твоих книгах, это «'+esc(lvlName(w.pace))+'».</div>');
  if(w.ai)out.push('<div class="bk-note" id="bkLvlAiRes">'+rqIcon('sparkles',14)+' Нейросеть: «'+esc(lvlName(w.ai.l))+'»'+(w.ai.w?'. '+esc(w.ai.w):'')+'</div>');
  /* 23.10 «признаки спорят»: the sources of the level disagree by 3+ steps, or a PDF without text (a scan) */
  const dg=bookLvlDiag(b),scan=b.type==='pdf'&&Number.isInteger(b.lvlWords)&&b.lvlWords<300,op=[];
  if(dg.tx!=null&&!scan)op.push(['текст',dg.tx]);if(dg.au2>0)op.push(['автор',dg.au2]);if(dg.ti>0)op.push(['название',dg.ti]);
  if(w.pace>0)op.push(['твой темп',w.pace]);if(w.ai)op.push(['нейросеть',w.ai.l]);
  const lo=op.reduce(function(a,x){return x[1]<a[1]?x:a;},op[0]||['',0]),hi=op.reduce(function(a,x){return x[1]>a[1]?x:a;},op[0]||['',0]);
  const ask=(aiOn()&&!w.ai?' Проверь нейросетью или':'')+' Если уровень не тот, отметь «Оценка неверная».';
  if(scan)out.push('<div class="bk-note" id="bkLvlScan">'+rqIcon('circle-alert',14)+' В PDF нет текста (скан): сложность только по автору, названию'+(w.pace>0?', темпу':'')+(w.ai?' и нейросети':'')+'.'+(aiOn()&&!w.ai?' Проверь нейросетью.':'')+'</div>');
  else if(op.length>1&&hi[1]-lo[1]>=3)out.push('<div class="bk-note" id="bkLvlSpor">'+rqIcon('circle-alert',14)+' Признаки спорят: '+esc(lo[0])+' говорит «'+esc(lvlName(lo[1]))+'», '+esc(hi[0])+' «'+esc(lvlName(hi[1]))+'».'+ask+'</div>');
  const rep=(S.bookLvlRep||{})[b.id];
  out.push('<div class="bk-lvlbtns">'+(aiOn()?'<button type="button" class="ghostbtn" id="bkLvlAiBtn" onclick="bookLvlAiRun(\''+b.id+'\')">'+rqIcon('sparkles',16)+' '+(w.ai?'Оценить нейросетью ещё раз':'Оценить нейросетью')+'</button>':'')+
    '<button type="button" class="ghostbtn" id="bkLvlRepBtn" aria-expanded="false" onclick="bookLvlRepOpen(\''+b.id+'\')">'+rqIcon('flag',16)+' '+(rep?'Отмечено: «'+esc(lvlName(rep.w))+'»':'Оценка неверная?')+'</button></div>'+
    '<div id="bkLvlRep" class="hidden"></div>'+
    (aiOn()?'':'<div class="bk-note" id="bkLvlAiHint">Нейросеть может оценить сложность, если вписать свой ключ в «Нейросети» в настройках.</div>'));
  return out.join('');
}
/* 23.10 (Джессика: «чтобы не облажаться», кнопка «Оценка неверная»): the reader marks which level the book should have. Nothing changes in
   the rewards (raising stays impossible); the marks with the numbers behind the level (progress.bookLvlRep, arch.md) are copied and sent to us. */
function bookLvlDiag(b){
  const G=window.__rqGame,w=bookLvlWhy(b);let st=null;try{if(b.text)st=G.textStats(b.text);}catch(e){}
  const r1=function(x){return Math.round(x*10)/10;};
  return {t:String(b.title||'').slice(0,120),au:String(b.author||'').slice(0,80),k:b.type==='pdf'?'pdf':'text',a:bookLvlAuto(b),
    tx:st?(st.words<1500?0:G.textLevel(b.text)):(Number.isInteger(b.lvlText)?b.lvlText:null),s:st?r1(st.score):null,tm:st?r1(st.terms):null,m:st?r1(st.math):null,
    au2:G.authorLevel(b.author),ti:G.titleLevel(b.title),p:r1(w.r||0),ai:w.ai?w.ai.l:null};
}
function bookLvlRepOpen(id){
  const box=el('bkLvlRep'),btn=el('bkLvlRepBtn');if(!box)return;
  if(!box.classList.contains('hidden')){box.classList.add('hidden');if(btn)btn.setAttribute('aria-expanded','false');return;}
  const b=allBooks().find(function(x){return x.id===id;});if(!b)return;
  const L=window.__rqGame.LEVELS,rep=(S.bookLvlRep||{})[id],n=Object.keys(S.bookLvlRep||{}).length;
  box.innerHTML='<div class="bk-note">Какая сложность у этой книги на самом деле? Награда не изменится, отметка поможет нам поправить подсчёт.</div>'+
    '<div class="chips bk-shelves" role="radiogroup" aria-label="Какая должна быть сложность">'+L.map(function(x,i){const on=!!rep&&rep.w===i;
      return '<button type="button" class="fchip'+(on?' on':'')+'" role="radio" aria-checked="'+on+'" onclick="bookLvlRepSet(\''+id+'\','+i+')">'+(on?rqIcon('check',14):'')+esc(lvlName(i))+'</button>';}).join('')+'</div>'+
    (n?'<div class="bk-lvlbtns"><button type="button" class="ghostbtn" id="bkLvlRepCopy" onclick="bookLvlRepCopy()">'+rqIcon('copy',16)+' Скопировать отметки ('+n+')</button>'+
      (rep?'<button type="button" class="ghostbtn" id="bkLvlRepDel" onclick="bookLvlRepSet(\''+id+'\',-1)">'+rqIcon('x',16)+' Убрать отметку</button>':'')+'</div>'+
      '<div class="bk-note">Скопируй и пришли нам в чат: в отметках название, автор и цифры подсчёта, без текста книги.</div>':'');
  box.classList.remove('hidden');if(btn)btn.setAttribute('aria-expanded','true');
}
function bookLvlRepSet(id,l){
  const b=allBooks().find(function(x){return x.id===id;});if(!b)return;
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Книга открыта в другом окне','info');return;}
  S.bookLvlRep=S.bookLvlRep||{};
  if(l<0)delete S.bookLvlRep[id];
  else{const ks=Object.keys(S.bookLvlRep);if(!(id in S.bookLvlRep)&&ks.length>=200)delete S.bookLvlRep[ks[0]];
    S.bookLvlRep[id]=Object.assign(bookLvlDiag(b),{w:l,d:today()});}
  save();bookInfo(id);bookLvlRepOpen(id);
  if(l>=0)flashMsg('Отмечено: «'+lvlName(l)+'». Спасибо!');
}
function bookLvlRepCopy(){
  const r=S.bookLvlRep||{},ks=Object.keys(r);if(!ks.length)return;
  copyText('Отметки сложности ReadQuest ('+ks.length+'), сборка '+RQ_BUILD+':\n'+JSON.stringify(ks.map(function(k){return r[k];})));
  flashMsg('Скопировано, пришли в чат');
}
const LVL_AI_SYS='Ты оцениваешь, насколько трудно читать книгу. Шкала: 0 — обычная (художественная проза, детские книги, лёгкий нон-фикшн); '+
  '1 — сложная (плотная классика, серьёзный научпоп); 2 — очень сложная (философия, учебники, научные книги); '+
  '3 — экспертная (академические монографии, тяжёлая философия уровня Канта); 4 — запредельная (Гегель, Хайдеггер, Деррида, Лакан, плотная математика). '+
  'Учитывай язык, термины, абстрактность, формулы. Ответь только JSON без пояснений вокруг: {"level": число 0–4, "why": "почему, по-русски, до 120 знаков"}.';
async function bookLvlAiSample(b){
  try{
    if(b.text){const t=String(b.text),L=t.length;return [0.15,0.45,0.75].map(function(p){const a=Math.floor(L*p);return t.slice(a,a+1200);}).join('\n…\n').replace(/\uFFFCimg:\d+/g,' ');}
    if(b.type==='pdf'&&typeof loadPdfJs==='function'&&typeof idbGet==='function'){
      const buf=await idbGet('pdf:'+b.id);if(!buf)return '';await loadPdfJs();
      const doc=await window.pdfjsLib.getDocument({data:buf.slice(0)}).promise,parts=[];
      try{for(const n of window.__rqGame.pdfSamplePages(doc.numPages,4)){const pg=await doc.getPage(n);const tc=await pg.getTextContent();parts.push(tc.items.map(function(x){return x.str||'';}).join(' ').slice(0,1000));}}
      finally{try{doc.destroy();}catch(_){}}
      return parts.join('\n…\n').replace(/[ \t]+/g,' ').trim();
    }
  }catch(e){console.warn('[rq] ai sample',e);}
  return '';
}
let lvlAiBusy=false;
async function bookLvlAiRun(id){
  const b=allBooks().find(function(x){return x.id===id;});if(!b||!lvlOn()||!aiOn()||lvlAiBusy)return;
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Книга открыта в другом окне','info');return;}
  if(navigator.onLine===false){flashMsg('Нужен интернет','info');return;}
  const btn=el('bkLvlAiBtn');lvlAiBusy=true;if(btn){btn.disabled=true;btn.textContent='Оцениваю…';}
  let res=null,err='';
  try{const smp=await bookLvlAiSample(b);
    const out=await aiViaKey({system:LVL_AI_SYS,user:'Книга: «'+(b.title||'')+'»'+(b.author&&b.author!=='PDF'&&b.author!=='Моя книга'?', автор: '+b.author:'')+
      (smp?'\nОтрывки из книги:\n'+smp:'\nТекста нет (скан), оцени по названию и автору.')},200);
    res=window.__rqGame.parseAiLevel(out);if(!res)err='непонятный ответ';}
  catch(e){err=e&&e.message||'ошибка';}
  lvlAiBusy=false;
  if(res){S.bookLvlAi=S.bookLvlAi||{};S.bookLvlAi[id]=res;save();flashMsg('Нейросеть: «'+lvlName(res.l)+'»');}
  else flashMsg('Не получилось оценить'+(err?': '+err:''),'info');
  if(el('bookSheet')&&!el('bookSheet').classList.contains('hidden'))bookInfo(id);
}
function setBookLvl(id,l){
  const b=allBooks().find(x=>x.id===id);if(!b||!lvlOn())return;
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Книга открыта в другом окне','info');return;}
  const auto=bookLvlAuto(b);l=Math.max(0,Math.min(auto,l|0));
  S.bookLvl=S.bookLvl||{};if(l===auto)delete S.bookLvl[id];else S.bookLvl[id]=l;
  save();bookInfo(id);
}
/* 20.10 (Джессика: «полоска сверху съезжает»): the compact header is shorter, so the card below jumped up and the sheet flickered between the two states;
   the height it loses goes back as margin, the content stays put */
function bkStick(sh,on){const h=sh.querySelector('.bk-head'),n=h&&h.nextElementSibling;sh.classList.remove('stuck');if(n)n.style.marginTop='';
  const h0=h?h.offsetHeight:0,m=n?parseFloat(getComputedStyle(n).marginTop)||0:0;sh.classList.toggle('stuck',on);
  if(n&&on)n.style.marginTop=(m+Math.max(0,h0-h.offsetHeight))+'px';} /* on the next block: a margin on the header would collapse with it */
if(el('bookSheet'))el('bookSheet').addEventListener('scroll',function(){const on=this.scrollTop>24;if(on!==this.classList.contains('stuck'))bkStick(this,on);},{passive:true});
function bookInfo(id){
  const b=allBooks().find(x=>x.id===id);if(!b)return;
  const builtin=!!BOOKS.find(x=>x.id===id);
  const p=Math.round(rqPos(id)*100); /* 1б-144: current position */
  const done=S.finished.includes(id);
  const size=fmtSize(b.size!=null?b.size:(b.text?b.text.length*2:null));
  const words=b.text?b.text.split(/\s+/).length:null;
  const nq=(S.quotes[id]||[]).length,nm=(S.marks[id]||[]).length;
  const fav=S.favs.includes(id),want=S.status[id]==='want';
  const rmin=Math.floor(((S.bookStats[id]||{}).min)||0); /* counted reading minutes for this book (same ones that give XP) */
  const rtime=rmin>=60?Math.floor(rmin/60)+' ч'+(rmin%60?' '+(rmin%60)+' мин':''):rmin+' мин';
  const fmt=b.type==='pdf'?'PDF · '+(b.pages||'?')+' стр.':(b.genre==='EPUB'?'EPUB':'Текст');
  const sub=(bookAuthor(b)?[bookAuthor(b),b.genre]:[b.genre||'Автор не указан']).filter((x,i,a)=>x&&a.indexOf(x)===i).map(esc).join(' · '); /* «PDF · PDF» → «PDF»; audit 19.10 LIB-04: no «Моя книга» as an author */
  const place=builtin?'Встроена в приложение':(b.type==='pdf'?'На этом устройстве, в браузере':'На этом устройстве, в приложении');
  const row=(k,v,cls)=>'<div class="bk-row'+(cls?' '+cls:'')+'"><span class="bk-k">'+k+'</span><span class="bk-v">'+v+'</span></div>';
  const act=(ic,label,fn,on)=>'<button type="button" class="bk-act'+(on?' on':'')+'" onclick="'+fn+'(\''+id+'\')"'+(on!=null?' aria-pressed="'+!!on+'"':'')+'>'+bkIc(ic)+'<span>'+label+'</span></button>';
  const line=(ic,label,fn,cls,arg)=>'<button type="button" class="bk-line'+(cls?' '+cls:'')+'" onclick="'+fn+'(\''+id+'\''+(arg!=null?','+arg:'')+')">'+bkIc(ic)+'<span>'+label+'</span></button>';
  el('bookSheetBody').innerHTML=
    '<div class="bk-head"><div class="cover">'+coverHtml(b)+'</div><div class="bk-ttl"><b>'+esc(b.title)+'</b>'+
    (sub?'<div class="bk-sub">'+sub+'</div>':'')+'</div></div>'+
    '<div class="bk-prog" data-rq="prog"><div class="bk-bar"><i style="width:'+(done?100:p)+'%"></i></div>'+
    '<div class="bk-pl"><span><b data-rq="pct">'+(done?'Прочитано':p+'%')+'</b>'+(done?'':' прочитано')+'</span>'+
    '<span><b data-rq="time">'+rtime+'</b> за чтением</span></div>'+
    '<div class="bk-pn">'+nq+' '+plural(nq,'цитата','цитаты','цитат')+' · '+nm+' '+plural(nm,'закладка','закладки','закладок')+'</div></div>'+
    '<div class="bk-acts">'+
    act('star',fav?'В избранном':'В избранное','toggleFav',fav)+
    act('bookmark',want?'В «Хочу»':'Хочу прочитать','toggleWant',want)+
    act('share-2','Поделиться','shareBook',null)+
    '</div>'+
    '<div class="bk-h">Мои полки</div><div class="chips bk-shelves">'+ /* 18.10: свои полки (library.js shelf*) */
    shelvesGet().map(sh=>'<button type="button" class="fchip'+(sh.b.indexOf(id)>=0?' on':'')+'" aria-pressed="'+(sh.b.indexOf(id)>=0)+'" onclick="shelfToggle(\''+id+'\',\''+sh.id+'\')">'+(sh.b.indexOf(id)>=0?rqIcon('check',14):'')+esc(sh.n)+'</button>').join('')+
    '<button type="button" class="fchip fshelfadd" onclick="shelfNew(\''+id+'\')">'+rqIcon('plus',14)+'Новая полка</button></div>'+
    bookLvlHtml(b)+
    '<div class="bk-h">О файле</div><div class="bk-list">'+
    row('Формат',fmt)+row('Размер',size+(words?' · '+fmtInt(words)+' '+plural(words,'слово','слова','слов'):''))+
    (builtin?'':row('Файл',esc(b.fname||'файл'),'wrap'))+row('Хранится',place)+
    '</div>'+
    (isMvp()?'': /* MVP: XP only per minute, coins only per day/week → difficulty, importance and stat change nothing there; shown outside MVP only */
    '<div class="bk-h">Игра</div><div class="bk-list">'+
    '<div class="bset-row"><div class="bset-lab">Сложность<span class="val" id="bsetDiffName">'+(S.bookDiff[id]>0?'':'авто · ')+DIFFS[diffOf(id)].n+' ×'+DIFFS[diffOf(id)].m+'</span></div>'+
    '<input type="range" class="bslider" id="bsetDiff" min="0" max="5" step="1" value="'+(S.bookDiff[id]||0)+'" oninput="onDiffSlide(\''+id+'\',this.value)" aria-label="Сложность">'+
    '<div class="bk-note">0 — авто по объёму и жанру. Сложнее книга — больше опыта и монет.</div></div>'+
    '<div class="bset-row"><div class="bset-lab">Важность<span class="val" id="bsetImpVal">'+(S.bookImp[id]!=null?S.bookImp[id]:50)+'%</span></div>'+
    '<input type="range" class="bslider" id="bsetImp" min="0" max="100" step="10" value="'+(S.bookImp[id]!=null?S.bookImp[id]:50)+'" oninput="onImpSlide(\''+id+'\',this.value)" aria-label="Важность">'+
    '<div class="bk-note">Личная важность книги повышает награду в монетах.</div></div>'+
    '<div class="bset-row"><div class="bset-lab">Качает характеристику<span class="val">'+esc(statOf(b))+'</span></div>'+
    '<div class="chips" style="padding:4px 0">'+
    allStats().map(s2=>'<button class="fchip'+(statOf(b)===s2?' on':'')+'" onclick="setBookStat(\''+id+'\',\''+esc(s2)+'\')">'+esc(s2)+'</button>').join('')+
    '</div></div>'+
    '<div class="bset-reward" id="bsetReward">'+bookRewardPreview(b)+'</div></div>')+
    '<div class="bk-h">Обложка</div><div class="bk-list">'+
    line('image','Выбрать картинку','pickCover')+
    (S.covers[id]?line('rotate-cw','Вернуть стандартную','resetCover'):'')+
    '</div>'+
    '<div class="bk-list bk-danger">'+
    line('x',builtin?'Скрыть из библиотеки':'Убрать из библиотеки','removeBook','danger','false')+
    (b.type==='pdf'?line('trash-2','Удалить файл с устройства','removeBook','danger','true'):'')+
    '</div>'+
    (b.type==='pdf'?'<div class="bk-note">«Удалить файл» стирает копию из хранилища браузера. Исходник в папке загрузок останется на месте.</div>':'');
  el('bookSheet').classList.remove('hidden');
  {const sh=el('bookSheet');bkStick(sh,sh.scrollTop>24);} /* a re-render (star, shelf) keeps the compact header's spacer */
}
el('bookSheetClose').onclick=()=>el('bookSheet').classList.add('hidden');
function toggleFav(id){
  const i=S.favs.indexOf(id);
  if(i>-1)S.favs.splice(i,1);else S.favs.push(id);
  save();bookInfo(id);renderLibrary();
}
function toggleWant(id){
  S.status[id]=S.status[id]==='want'?null:'want';
  save();bookInfo(id);renderLibrary();
}
function setDiff(id,v){
  if(v===0)delete S.bookDiff[id];else S.bookDiff[id]=v;
  save();bookInfo(id);renderLibrary();
}
function setBookStat(id,s2){S.bookStat[id]=s2;save();bookInfo(id);renderLibrary();}
function impMulOf(id){return 0.5+((S.bookImp[id]!=null?S.bookImp[id]:50)/100);}
function bookRewardPreview(b){
  const d=DIFFS[diffOf(b.id)];const im=impMulOf(b.id);
  const xpPage=Math.round(5*d.m),goldPage=Math.max(1,Math.round(2*d.m*im));
  return '<div class="rwd"><b>+'+xpPage+'</b><span>XP за страницу</span></div>'+
         '<div class="rwd"><b>+'+goldPage+'</b><span>монет за страницу</span></div>'+
         '<div class="rwd"><b>×'+d.m+'</b><span>множитель сложности</span></div>';
}
function onDiffSlide(id,v){
  v=+v;if(v===0)delete S.bookDiff[id];else S.bookDiff[id]=v;save();
  const b=allBooks().find(x=>x.id===id);if(!b)return;
  el('bsetDiffName').textContent=(S.bookDiff[id]>0?'':'авто · ')+DIFFS[diffOf(id)].n+' ×'+DIFFS[diffOf(id)].m;
  el('bsetReward').innerHTML=bookRewardPreview(b);renderLibrary();
}
function onImpSlide(id,v){
  S.bookImp[id]=+v;save();
  const b=allBooks().find(x=>x.id===id);if(!b)return;
  el('bsetImpVal').textContent=(+v)+'%';
  el('bsetReward').innerHTML=bookRewardPreview(b);
}
let COVID=null;
function pickCover(id){COVID=id;el('covInp').click();}
el('covInp').onchange=e=>{
  const f=e.target.files[0];if(!f||!COVID)return;e.target.value='';
  const img=new Image();
  img.onload=()=>{
    const cv=document.createElement('canvas');cv.width=88;cv.height=116;
    const ctx=cv.getContext('2d');
    const s2=Math.max(88/img.width,116/img.height);
    ctx.drawImage(img,(88-img.width*s2)/2,(116-img.height*s2)/2,img.width*s2,img.height*s2);
    try{
      S.covers[COVID]=cv.toDataURL('image/jpeg',0.72);
      save();renderLibrary();bookInfo(COVID);
    }catch(e2){rqAlert('Не удалось сохранить обложку: '+e2.message);}
  };
  img.onerror=()=>rqAlert('Не удалось прочитать изображение');
  img.src=URL.createObjectURL(f);
};
function resetCover(id){delete S.covers[id];save();renderLibrary();bookInfo(id);}

/* --- ИИ «Объясни» (20.10): выделение → объяснение по смыслу книги ---
   Только на своём ключе человека (Джессика 20.10: «делай так, чтобы люди ставили свои ключи»). Настройки → ИИ-помощник:
   сервис, ключ, модель. Запрос идёт с телефона прямо в выбранный сервис; ключ хранится только на устройстве и не уходит
   в экспорт (arch.md 15.10 и 20.10). Ни опыта, ни монет: подсказка, не награда. В словарь — поле vocab[].ex. */
const AI_PROV={
  deepseek:{name:'DeepSeek',base:'https://api.deepseek.com',model:'deepseek-chat'},
  openrouter:{name:'OpenRouter',base:'https://openrouter.ai/api/v1',model:'deepseek/deepseek-chat'},
  openai:{name:'OpenAI',base:'https://api.openai.com/v1',model:'gpt-4o-mini'},
  anthropic:{name:'Claude (Anthropic)',base:'https://api.anthropic.com/v1',model:'claude-haiku-5-5'},
  custom:{name:'Другой, совместимый с OpenAI',base:'',model:''}
};
/* 20.10 Джессика: «инструкцию как этот ключ подключить, если пользователь не знает» — шаги по сервису в «Как получить ключ» (ИИ и озвучка) */
const KEY_SAFE='Ключ — как пароль: никому его не показывайте. В кабинете сервиса можно поставить лимит трат в месяц.';
const KEY_HOW={
  deepseek:{url:'https://platform.deepseek.com/api_keys',steps:['Откройте сайт DeepSeek Platform по ссылке ниже и войдите (почта или телефон).','Слева «API keys» → «Create new API key», придумайте имя.','Скопируйте ключ (начинается с sk-): он показывается один раз.','Пополните баланс («Top up»): без денег на счёте ключ не работает. Объяснения стоят копейки.','Вставьте ключ сюда и нажмите «Проверить ключ».'],note:'Сайт открывается из России без VPN. Пополнить можно зарубежной картой или через сервисы-посредники.'},
  openrouter:{url:'https://openrouter.ai/settings/keys',steps:['Откройте OpenRouter по ссылке ниже и войдите (Google или почта).','«Keys» → «Create Key», скопируйте ключ (sk-or-…).','Пополните «Credits». Модель по умолчанию — DeepSeek, её можно поменять в поле «Модель».','Вставьте ключ сюда и нажмите «Проверить ключ».'],note:'Один ключ на много разных нейросетей.'},
  openai:{url:'https://platform.openai.com/api-keys',steps:['Откройте OpenAI Platform по ссылке ниже и войдите.','«Create new secret key», скопируйте ключ (sk-…): он показывается один раз.','В «Billing» пополните баланс.','Вставьте ключ сюда и нажмите «Проверить».'],note:'Из России без VPN и зарубежной карты не работает.'},
  anthropic:{url:'https://console.anthropic.com/settings/keys',steps:['Откройте консоль Anthropic по ссылке ниже и войдите.','«Create Key», скопируйте ключ (sk-ant-…).','В «Billing» пополните баланс.','Вставьте ключ сюда и нажмите «Проверить ключ».'],note:'Из России без VPN и зарубежной карты не работает.'},
  custom:{steps:['Возьмите у своего сервиса адрес API (обычно оканчивается на /v1), ключ и название модели.','Сервис должен понимать запросы как у OpenAI и пускать запросы из браузера.','Заполните три поля и нажмите «Проверить».'],note:'Для тех, кто знает, что это.'},
  elevenlabs:{url:'https://elevenlabs.io/app/settings/api-keys',steps:['Откройте ElevenLabs по ссылке ниже и войдите.','«Create API key», скопируйте ключ.','Голос по желанию: «Voices» → выберите голос → скопируйте его Voice ID в поле «Голос».','Вставьте ключ сюда и нажмите «Послушать».'],note:'Очень живые голоса, в том числе русские. На бесплатном тарифе немного знаков в месяц, потом подписка. Из России без VPN и зарубежной карты не работает.'},
  google:{url:'https://console.cloud.google.com/apis/library/texttospeech.googleapis.com',steps:['Откройте Google Cloud по ссылке ниже, войдите и создайте проект.','Нажмите «Enable» у Cloud Text-to-Speech API (попросит привязать карту).','«APIs & Services» → «Credentials» → «Create credentials» → «API key», скопируйте ключ.','Лучше сразу ограничить ключ: только Text-to-Speech API.','Вставьте ключ сюда и нажмите «Послушать».'],note:'Каждый месяц часть знаков бесплатно. Из России без VPN и зарубежной карты не работает.'}
};
function keyHowHtml(k,tts){
  const h=KEY_HOW[k];if(!h)return '';
  const steps=h.steps.map(t=>t.replace('«Проверить»',tts?'«Послушать»':'«Проверить ключ»'));
  return '<ol>'+steps.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ol>'+
    (h.url?'<a href="'+esc(h.url)+'" target="_blank" rel="noopener noreferrer">'+esc(h.url.replace(/^https:\/\//,''))+'</a>':'')+
    (h.note?'<div class="kh-note">'+esc(h.note)+'</div>':'')+'<div class="kh-note">'+esc(KEY_SAFE)+'</div>';
}
function aiProv(){const p=S.ai&&S.ai.prov;return AI_PROV[p]?p:'openai';} /* старые данные без prov — это OpenAI (v6) */
function aiModel(){return (S.ai&&S.ai.model)||AI_PROV[aiProv()].model;}
function aiBase(){const p=aiProv();return String((p==='custom'?(S.ai&&S.ai.base):AI_PROV[p].base)||'').replace(/\/+$/,'');}
function aiOwnKey(){return !!(S.ai&&S.ai.key)&&!!aiBase();}
function aiOn(){return aiOwnKey();}
const AI_CACHE={};let aiCur=null,aiSeq=0;
function selCtx(word){ /* предложение вокруг выделения (как у «В словарь») */
  try{const sel=window.getSelection();const full=(sel&&sel.anchorNode&&sel.anchorNode.textContent)||'';const i=full.indexOf(word);
    if(i<0)return '';
    const a=Math.max(full.lastIndexOf('.',i),full.lastIndexOf('!',i),full.lastIndexOf('?',i));const b=full.indexOf('.',i+word.length);
    return full.slice(a+1,(b>0?b+1:i+word.length+80)).trim().slice(0,400);}catch(e){return '';}
}
el('spAI').onclick=()=>{
  const t=selText();if(!t)return;
  if(!aiOn()){selDone();aiNoKey();return;}
  const q={text:t.replace(/\s+/g,' ').slice(0,600),ctx:selCtx(t.trim()),title:((R.book||{}).title||'').slice(0,200),author:(bookAuthor(R.book||{})||'').slice(0,120)};
  selDone();
  aiExplain(q);
};
function aiNoKey(){ /* ключа нет: объясняем, где его вставить (кнопка видна всем — иначе про функцию никто не узнает) */
  aiCur=null;aiSeq++;
  el('aiBody').innerHTML='<div class="ai-a">Чтобы ИИ объяснял слова и фразы из книги, вставьте свой ключ от сервиса ИИ (например, DeepSeek) в Настройках, раздел «ИИ-помощник». Там же написано, как его получить.</div>'+
    '<button class="ghostbtn" id="aiOpenSet">'+rqIcon('settings',16)+' Открыть настройки</button>';
  el('aiSheet').classList.remove('hidden');
  el('aiOpenSet').onclick=()=>{el('aiSheet').classList.add('hidden');NN_EXP.ai=true;openGeneralSettings(true);el('aiHow').open=true;settingsScrollTo('aiHead');};
}
function aiRender(state,txt){
  const q=aiCur;if(!q)return;
  const word=q.text.length<=60;
  el('aiBody').innerHTML='<div class="ai-q">«'+esc(q.text.length>160?q.text.slice(0,160)+'…':q.text)+'»</div>'+
    (state==='wait'?'<div class="ai-a ai-wait" role="status">Думаю…</div>'
     :state==='err'?'<div class="ai-a" role="alert">'+esc(txt)+'</div><button class="ghostbtn" id="aiRetry">'+rqIcon('rotate-cw',16)+' Ещё раз</button>'
     :'<div class="ai-a">'+esc(txt)+'</div>'+
      (word&&R.book?'<button class="ghostbtn" id="aiToVocab">'+rqIcon('book-open',16)+' В словарь с объяснением</button>':'')+
      '<div class="ai-note">Ответ ИИ, может ошибаться</div>');
  if(el('aiRetry'))el('aiRetry').onclick=()=>aiExplain(q,true);
  if(el('aiToVocab'))el('aiToVocab').onclick=()=>aiToVocab(q,txt);
}
async function aiExplain(q,again){
  aiCur=q;const my=++aiSeq;const k=q.title+'\n'+q.text;
  el('aiSheet').classList.remove('hidden');
  if(AI_CACHE[k]&&!again){aiRender('ok',AI_CACHE[k]);return;}
  if(navigator.onLine===false){aiRender('err','Нужен интернет. Включите сеть и нажмите «Ещё раз».');return;}
  aiRender('wait');
  let out='',err='';
  try{out=await aiViaKey(aiMsgs(q));}
  catch(e){err=e&&e.message||'ошибка';}
  if(my!==aiSeq||el('aiSheet').classList.contains('hidden'))return; /* закрыли или спросили другое */
  if(out){AI_CACHE[k]=out;aiRender('ok',out);}else aiRender('err','Не получилось ответить'+(err?': '+err:'')+'.');
}
const AI_SYS='Ты помощник в приложении для чтения книг. Человек выделил фрагмент текста и просит объяснить его. Отвечай по-русски, простым языком, 2–4 предложения, без вступлений. '+
  'Если выделено слово или выражение, объясни, что оно значит именно здесь. Если это имя, место, бог, обычай или историческое событие, коротко скажи, кто или что это. '+
  'Если это сложная фраза, перескажи её смысл проще. Не рассказывай, что будет дальше в книге, без спойлеров. Если не уверен, так и скажи.';
function aiMsgs(q){
  return {system:AI_SYS,user:'Книга: «'+q.title+'»'+(q.author?', '+q.author:'')+'\nФрагмент: «'+q.text+'»'+(q.ctx&&q.ctx!==q.text?'\nПредложение вокруг: «'+q.ctx+'»':'')};
}
async function aiFetch(url,opt){
  const ac=typeof AbortController==='function'?new AbortController():null;const tm=setTimeout(()=>{if(ac)ac.abort();},25000);
  try{return await fetch(url,Object.assign({},opt,ac?{signal:ac.signal}:{}));}
  catch(e){throw new Error(e&&e.name==='AbortError'?'долго нет ответа':(navigator.onLine===false?'нет интернета':'нет связи с сервисом (или он не пускает запросы из браузера)'));}
  finally{clearTimeout(tm);}
}
async function aiViaKey(m,maxTok){ /* свой ключ: запрос прямо с телефона в выбранный сервис. m = {system, user} или {system, messages:[{role,content}]} */
  const p=aiProv(),key=S.ai.key,model=aiModel();let r;
  const msgs=m.messages||[{role:'user',content:m.user}];
  if(p==='anthropic'){
    r=await aiFetch(aiBase()+'/messages',{method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:model,max_tokens:maxTok||500,system:m.system,messages:msgs})});
  }else{
    r=await aiFetch(aiBase()+'/chat/completions',{method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model:model,max_tokens:maxTok||500,messages:[{role:'system',content:m.system}].concat(msgs)})});
  }
  let d=null;try{d=await r.json();}catch(e){}
  if(r.status===401||r.status===403)throw new Error('сервис не принял ключ');
  if(r.status===402)throw new Error('на счёте сервиса нет денег');
  if(r.status===429)throw new Error('слишком много запросов, попробуйте позже');
  const em=d&&d.error&&(d.error.message||(typeof d.error==='string'?d.error:''));
  if(!r.ok||em)throw new Error(em||('сервис ответил '+r.status));
  const t=p==='anthropic'?((d&&d.content||[]).filter(c=>c&&c.type==='text').map(c=>c.text).join('')):
    ((d&&d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||'');
  return String(t).trim().slice(0,2000);
}
function aiToVocab(q,ex){
  const word=q.text.trim().slice(0,60);if(!word)return;
  S.vocab=S.vocab||[];
  const v=S.vocab.find(x=>x.w.toLowerCase()===word.toLowerCase());
  if(v){v.ex=String(ex).slice(0,600);save();flashMsg('Объяснение добавлено к «'+word+'»');}
  else{S.vocab.push({w:word,ctx:(q.ctx||'').slice(0,160),book:q.title,date:today(),box:0,ex:String(ex).slice(0,600)});save();flashMsg('«'+word+'» — в словарь');}
  el('aiSheet').classList.add('hidden');
}
/* --- «Обсудить книгу» (20.10, Джессика: «мини-чат с ИИшкой, когда обсуждаешь книгу») ---
   Кнопка в шапке читалки. ИИ получает название, автора и текст книги до конца текущей страницы (последние ~8000 знаков; PDF —
   до 4 страниц), дальше не видит и просит не спойлерить. Переписка — S.aiChat[bookId], ≤ 20 сообщений (arch.md 20.10). Ни опыта, ни монет. */
const CHAT_MAX=20,CHAT_CTX=8000;let chatBusy=false,chatSeq=0,chatErr=null;
async function chatBookText(){
  try{
    if(R.mode==='pdf'&&R.pdf){const to=R.page+1,from=Math.max(1,to-3),parts=[];
      for(let n=from;n<=to;n++){try{const pg=await R.pdf.getPage(n);const tc=await pg.getTextContent();parts.push(tc.items.map(x=>x.str||'').join(' '));}catch(e){}}
      return parts.join('\n').replace(/\s+/g,' ').slice(-CHAT_CTX);}
    const t=(el('content').textContent||'').replace(/\s+/g,' ');
    const end=Math.min(t.length,Math.ceil(t.length*Math.min(1,(R.page+1)/Math.max(1,R.pageCount))));
    return t.slice(Math.max(0,end-CHAT_CTX),end);
  }catch(e){return '';}
}
function chatList(){const id=R.book&&R.book.id;if(!id)return [];S.aiChat=S.aiChat||{};return S.aiChat[id]||[];}
function chatPush(r,t){const id=R.book&&R.book.id;if(!id)return;S.aiChat=S.aiChat||{};const l=(S.aiChat[id]||[]).concat([{r:r,t:String(t).slice(0,1500),d:today()}]).slice(-CHAT_MAX);S.aiChat[id]=l;save();}
function chatRender(wait){
  const l=chatList(),log=el('aiChatLog');
  el('aiChatSub').textContent=R.book?('«'+R.book.title+'»'+(bookAuthor(R.book)?', '+bookAuthor(R.book):'')+' · ИИ знает текст до этой страницы'):'';
  log.innerHTML=(l.length?'':'<div class="chat0">Спросите о прочитанном: о героях, непонятных местах, о чём глава. Дальше этой страницы ИИ текста не видит и спойлерить не будет.</div>')+
    l.map(m=>'<div class="cm '+m.r+'">'+esc(m.t)+'</div>').join('')+
    (wait?'<div class="cm a w" role="status">Думаю…</div>':'')+
    (chatErr&&!wait?'<div class="cm e" role="alert">'+esc(chatErr)+' <button type="button" id="aiChatRetry">Ещё раз</button></div>':'');
  el('aiChatChips').innerHTML=l.length||wait?'':['Напомни, что было','Кто главные герои?','О чём эта часть?'].map(t=>'<button type="button">'+esc(t)+'</button>').join('');
  el('aiChatChips').querySelectorAll('button').forEach(b=>b.onclick=()=>chatSend(b.textContent));
  if(el('aiChatRetry'))el('aiChatRetry').onclick=()=>chatAsk();
  el('aiChatSend').disabled=!!wait;el('aiChatClear').hidden=!l.length;
  log.scrollTop=log.scrollHeight;
}
function openAiChat(){
  if(!R.book)return;
  if(!aiOn()){aiNoKey();return;}
  chatErr=null;el('aiChat').classList.remove('hidden');chatRender(chatBusy);
}
async function chatSend(txt){
  const t=String(txt||'').trim().slice(0,1000);if(!t||chatBusy||!R.book)return;
  chatPush('u',t);el('aiChatIn').value='';el('aiChatIn').style.height='';
  await chatAsk();
}
async function chatAsk(){
  if(chatBusy||!R.book)return;
  const book=R.book,my=++chatSeq;chatErr=null;
  if(navigator.onLine===false){chatErr='Нужен интернет.';chatRender();return;}
  chatBusy=true;chatRender(true);
  const ctx=await chatBookText();
  const sys='Ты собеседник читателя в приложении для чтения. Обсуждаете книгу «'+book.title+'»'+(bookAuthor(book)?' ('+bookAuthor(book)+')':'')+'. '+
    'Отвечай по-русски, живо и по делу, обычно 2–6 предложений. Опирайся на текст ниже: это всё, что человек прочитал к этому моменту. '+
    'Не рассказывай, что будет дальше, даже если знаешь книгу: никаких спойлеров. Если спрашивают о будущем сюжете, мягко откажись. Если не уверен, так и скажи.'+
    (ctx?'\n\nТекст до текущего места (конец фрагмента — где читатель сейчас):\n«…'+ctx+'»':'');
  const msgs=[];chatList().slice(-12).forEach(m=>{const role=m.r==='u'?'user':'assistant';const last=msgs[msgs.length-1];
    if(last&&last.role===role)last.content+='\n\n'+m.t;else msgs.push({role:role,content:m.t});});
  while(msgs.length&&msgs[0].role!=='user')msgs.shift();
  let out='',err='';
  try{if(!msgs.length)throw new Error('нет вопроса');out=await aiViaKey({system:sys,messages:msgs},700);}catch(e){err=e&&e.message||'ошибка';}
  chatBusy=false;
  if(my!==chatSeq||R.book!==book)return; /* переписку очистили или книгу закрыли — ответ не нужен */
  if(out)chatPush('a',out);else chatErr='Не получилось ответить'+(err?': '+err:'')+'.';
  if(!el('aiChat').classList.contains('hidden'))chatRender();
}
el('btnAiChat').onclick=openAiChat;
el('aiChatClose').onclick=()=>el('aiChat').classList.add('hidden');
el('aiChatForm').onsubmit=e=>{e.preventDefault();chatSend(el('aiChatIn').value);};
el('aiChatIn').oninput=e=>{const t=e.target;t.style.height='';t.style.height=Math.min(120,t.scrollHeight)+'px';};
el('aiChatIn').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();chatSend(el('aiChatIn').value);}};
el('aiChatClear').onclick=async()=>{
  if(!R.book||!await rqAsk({t:'Очистить переписку?',p:'Разговор об этой книге удалится с этого устройства.',ok:'Очистить',danger:true}))return;
  chatSeq++;chatBusy=false;chatErr=null;if(S.aiChat)delete S.aiChat[R.book.id];save();chatRender();
};
el('aiSheetClose').onclick=()=>{aiSeq++;el('aiSheet').classList.add('hidden');};
function shareBook(id){
  const b=allBooks().find(x=>x.id===id);if(!b)return;
  const p=Math.round(rqPos(id)*100); /* 1б-144: current position */
  const txt='Читаю «'+b.title+'»'+(bookAuthor(b)?' ('+bookAuthor(b)+')':'')+' в ReadQuest — прогресс '+p+'%';
  if(navigator.share){navigator.share({title:b.title,text:txt}).catch(function(){});}
  else{copyText(txt);rqAlert('Текст для шаринга скопирован в буфер');}
}
async function removeBook(id,wipeFile){
  const b=allBooks().find(x=>x.id===id);if(!b)return;
  const builtin=!!BOOKS.find(x=>x.id===id);
  if(!await rqAsk(wipeFile?{t:'Удалить «'+b.title+'» и файл?',p:'Книга, прогресс, цитаты и файл удалятся с этого устройства.',ok:'Удалить',danger:true}
    :{t:'Убрать «'+b.title+'»?',p:'Прогресс и цитаты по этой книге удалятся. Файл на устройстве останется.',ok:'Убрать',danger:true}))return;
  if(builtin){if(!S.hidden.includes(id))S.hidden.push(id);}
  else{S.userBooks=S.userBooks.filter(x=>x.id!==id);}
  delete S.progress[id];delete S.quotes[id];if(S.aiChat)delete S.aiChat[id];delete S.hl[id];delete S.stickers[id];delete S.marks[id];
  const fi=S.favs.indexOf(id);if(fi>-1)S.favs.splice(fi,1);
  if(wipeFile&&b.type==='pdf'){try{await idbDel('pdf:'+id);}catch(e){}}
  if(wipeFile&&b.text){const n=(String(b.text).match(/\uFFFCimg:\d+/g)||[]).reduce(function(m,x){return Math.max(m,+x.slice(5)+1);},0);for(let i=0;i<n;i++){try{await idbDel('img:'+id+':'+i);}catch(e){}}} /* 28.10: its pictures */
  save();el('bookSheet').classList.add('hidden');renderLibrary();
  flashMsg(wipeFile?'Книга и файл удалены':'Книга убрана из библиотеки');
}

/* ================= СТАТИСТИКА ================= */
let statPeriod=7;
function histDays(n){
  const out=[];
  for(let i=n-1;i>=0;i--){
    const d=addLocalDays(today(),-i);
    out.push({d:d,v:S.hist[d]||{min:0,pages:0,xp:0,gold:0}});
  }
  return out;
}
function renderChart(id,days,key,color){
  const mx=Math.max(1,...days.map(x=>x.v[key]||0));
  el(id).innerHTML=days.map((x,i)=>{
    const val=Math.round(x.v[key]||0);
    const showLbl=days.length<=7||i%5===0;
    return '<div class="bar" style="height:'+Math.max(2,Math.round((x.v[key]||0)/mx*100))+'%;background:'+color+'" title="'+x.d+': '+val+'">'+
      (days.length<=7&&val?'<span>'+val+'</span>':'')+
      (showLbl?'<i>'+x.d.slice(8)+'</i>':'')+'</div>';
  }).join('');
}
function renderAnaHours(){
  const box=el('anaHours');if(!box)return;const hh=S.hourHist||[];const max=Math.max(1,...hh);
  if(!hh.some(v=>v>0)){box.innerHTML='<div style="color:var(--muted);font-size:12px;margin-top:8px">Читайте — здесь появится ваше «время чтения» по часам.</div>';return;}
  let peak=0;for(let h=0;h<24;h++)if((hh[h]||0)>(hh[peak]||0))peak=h;
  let bars='';for(let h=0;h<24;h++){const v=hh[h]||0;bars+='<div class="hbar" title="'+h+':00 — '+Math.round(v)+' мин"><i style="height:'+(Math.round(v/max*46)+2)+'px;background:'+(h===peak?'var(--accent2)':'var(--accent)')+'"></i></div>';}
  box.innerHTML='<div class="hours">'+bars+'</div><div class="hoursax"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div><div style="font-size:12px;color:var(--muted);margin-top:6px">Чаще всего читаешь около <b>'+peak+':00</b></div>';
}
function genreMin(){const m={};allBooks().forEach(b=>{const s=S.bookStats[b.id];if(s&&s.min>0){const g=b.genre||'Без жанра';m[g]=(m[g]||0)+s.min;}});return m;}
function renderAnaGenre(){
  const box=el('anaGenre');if(!box)return;const m=genreMin();const arr=Object.keys(m).map(g=>[g,m[g]]).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!arr.length){box.innerHTML='<div style="color:var(--muted);font-size:12px;margin-top:8px">Пока нет данных по жанрам.</div>';return;}
  const max=arr[0][1];
  box.innerHTML=arr.map(x=>'<div class="gbar"><span class="gbl">'+esc(x[0])+'</span><div class="gbt"><i style="width:'+Math.round(x[1]/max*100)+'%"></i></div><span class="gbv">'+Math.round(x[1])+'м</span></div>').join('');
}
function renderAnaMonths(){
  const box=el('anaMonths');if(!box)return;const y=new Date().getFullYear();const cnt=new Array(12).fill(0);
  Object.keys(S.finishDates||{}).forEach(id=>{const d=S.finishDates[id];if(d&&d.slice(0,4)===String(y)){const mi=parseInt(d.slice(5,7),10)-1;if(mi>=0&&mi<12)cnt[mi]++;}});
  const max=Math.max(1,...cnt),names=['Я','Ф','М','А','М','И','И','А','С','О','Н','Д'],total=cnt.reduce((a,b)=>a+b,0);
  box.innerHTML='<div style="font-size:12px;color:var(--muted);margin:2px 0 6px">'+y+' · дочитано книг: <b>'+total+'</b></div><div class="months">'+cnt.map((v,i)=>'<div class="mbar" title="'+v+' книг"><i style="height:'+(Math.round(v/max*46)+2)+'px"></i><span>'+names[i]+'</span></div>').join('')+'</div>';
}
function renderYearReview(){
  const box=el('yearReview');if(!box)return;
  if(box._open){box._open=false;box.innerHTML='';return;}box._open=true;
  const y=new Date().getFullYear(),ys=String(y);let min=0,days=0;
  Object.keys(S.hist||{}).forEach(d=>{if(d.slice(0,4)===ys){const h=S.hist[d];min+=h.min||0;if((h.min||0)>=1)days++;}});
  const books=Object.keys(S.finishDates||{}).filter(id=>(S.finishDates[id]||'').slice(0,4)===ys).length;
  const gm=genreMin();let favG='—',fv=0;Object.keys(gm).forEach(g=>{if(gm[g]>fv){fv=gm[g];favG=g;}});
  const hh=S.hourHist||[];let peak=0;for(let h=0;h<24;h++)if((hh[h]||0)>(hh[peak]||0))peak=h;
  let topB='—',tv=0;allBooks().forEach(b=>{const s=S.bookStats[b.id];if(s&&s.min>tv){tv=s.min;topB=b.title;}});
  box.innerHTML='<div class="yreview"><div class="yr-h">Год в чтении · '+y+'</div><div class="yr-grid">'+
    '<div class="yr-cell"><b>'+Math.round(min)+'</b><span>'+plural(Math.round(min),'минута','минуты','минут')+'</span></div>'+
    '<div class="yr-cell"><b>'+books+'</b><span>'+plural(books,'книга дочитана','книги дочитано','книг дочитано')+'</span></div>'+
    '<div class="yr-cell"><b>'+days+'</b><span>'+plural(days,'день','дня','дней')+' с чтением</span></div>'+
    '<div class="yr-cell"><b>'+(S.streak||0)+'</b><span>стрик сейчас</span></div></div>'+
    '<div class="yr-line">Любимый жанр: <b>'+esc(favG)+'</b></div>'+
    '<div class="yr-line">Любимое время: <b>'+peak+':00</b></div>'+
    '<div class="yr-line">Больше всего читал(а): <b>'+esc(topB)+'</b></div></div>';
}
if(el('btnYearReview'))el('btnYearReview').onclick=renderYearReview;
function renderStats(){
  const days=histDays(statPeriod);
  el('statCounters').innerHTML=statCountersHtml();
  el('stP7').classList.toggle('on',statPeriod===7);
  el('stP30').classList.toggle('on',statPeriod===30);
  el('stkMin').textContent=Math.round(S.totalMin);
  el('stkPages').textContent=S.totalPages;
  el('stkSpeed').textContent=S.totalMin>0?(S.totalPages/(S.totalMin/60)).toFixed(1):'0';
  el('chGoldLbl').textContent='Монеты';
  renderChart('chMin',days,'min','var(--accent)');
  renderChart('chPages',days,'pages','var(--accent2)');
  renderChart('chXp',days,'xp','#7fd8e0');
  renderChart('chGold',days,'gold','#ffd54f');
  if(typeof fzRenderStats==='function')fzRenderStats(statPeriod); /* 25.10 «Фокус и концентрация» */
  renderAnaHours();renderAnaGenre();renderAnaMonths();
  const rows=allBooks().map(b=>({b:b,s:S.bookStats[b.id]})).filter(x=>x.s&&(x.s.min>0.2||x.s.pages>0));
  el('bookStatBox').innerHTML=rows.length
    ?rows.sort((x,y)=>y.s.min-x.s.min).map(x=>{
      const pr=Math.round((((S.progress[x.b.id]||{}).ratio)||0)*100);
      return '<div class="shopitem"><div class="cover">'+coverHtml(x.b)+'</div>'+
        '<div style="flex:1;min-width:0"><b style="font-size:14px">'+esc(x.b.title)+'</b>'+
        '<div style="font-size:12px;color:var(--muted)">'+Math.round(x.s.min)+' мин · '+x.s.pages+' стр · '+(S.finished.includes(x.b.id)?'прочитано':pr+'%')+'</div>'+
        '<div class="pbar" style="margin-top:6px"><i style="width:'+pr+'%"></i></div></div></div>';
    }).join('')
    :'<div class="pempty">Почитайте — здесь появится разбивка по книгам</div>';
}
el('stP7').onclick=()=>{statPeriod=7;renderStats();};
el('stP30').onclick=()=>{statPeriod=30;renderStats();};

/* ================= FB2 ================= */
/* 28.10 (ревизия чтения): the encoding is read from the XML header in either quotes (encoding='windows-1251' gave «������»), a UTF-16 BOM is
   honoured; verse lines, epigraph authors, subtitles and empty lines are paragraphs of their own (bookHtmlText); the text before the first
   <section> (an epigraph) is kept, the book title is not repeated; pictures (<image l:href="#id"> → <binary>) are kept; the notes body
   comes last as «Примечания». */
async function parseFb2(f){
  const buf=await f.arrayBuffer(),u8=new Uint8Array(buf);
  let enc='utf-8';
  if(u8[0]===0xFF&&u8[1]===0xFE)enc='utf-16le';else if(u8[0]===0xFE&&u8[1]===0xFF)enc='utf-16be';
  else{const head=new TextDecoder('latin1').decode(u8.subarray(0,300)),m=/encoding\s*=\s*["']\s*([\w.:-]+)\s*["']/i.exec(head);if(m)enc=m[1].toLowerCase();}
  let xml;try{xml=new TextDecoder(enc).decode(buf);}catch(e){xml=new TextDecoder('utf-8').decode(buf);}
  if(enc==='utf-8'&&!looksLikeText(xml)){try{const x2=new TextDecoder('windows-1251').decode(buf);if(looksLikeText(x2))xml=x2;}catch(e){}} /* no header, old Russian file */
  const first=function(re){const m=re.exec(xml);return m?decodeEntities(m[1].trim()):'';};
  const ti=(/<title-info>([\s\S]*?)<\/title-info>/.exec(xml)||[])[1]||xml;
  const title=first(/<book-title>([^<]+)/)||f.name.replace(/\.fb2(\.zip)?$/i,'');
  const am=/<author>([\s\S]*?)<\/author>/.exec(ti),ap=am?am[1]:'';
  const pick=function(tag){const m=new RegExp('<'+tag+'>([^<]*)</'+tag+'>').exec(ap);return m?decodeEntities(m[1].trim()):'';};
  const author=[pick('first-name'),pick('last-name')].filter(Boolean).join(' ')||pick('nickname')||'FB2';
  const bins={};let bm;const bre=/<binary\b([^>]*)>([\s\S]*?)<\/binary>/g;
  while((bm=bre.exec(xml))){const id=(/\bid\s*=\s*["']([^"']+)["']/.exec(bm[1])||[])[1],ct=(/content-type\s*=\s*["']([^"']+)["']/.exec(bm[1])||[])[1];if(id)bins[id]={b64:bm[2],type:ct};}
  const bodies=[];let m;const re=/<body\b([^>]*)>([\s\S]*?)<\/body>/g;while((m=re.exec(xml)))bodies.push({name:(/name\s*=\s*["']([^"']+)["']/.exec(m[1])||[])[1]||'',x:m[2]});
  const main=bodies.find(function(b){return !b.name;})||bodies[0];
  if(!main)throw new Error('не найден текст FB2');
  const imgs=[],seen={};
  const img=function(src){const id=String(src).replace(/^#/,'');const bn=bins[id];if(!bn||imgs.length>=BOOK_IMG_N)return '';
    if(!(id in seen)){let data=null;try{const raw=atob(bn.b64.replace(/\s+/g,''));if(raw.length<=BOOK_IMG_MAX){data=new Uint8Array(raw.length);for(let k=0;k<raw.length;k++)data[k]=raw.charCodeAt(k);}}catch(e){}
      seen[id]=imgs.length;imgs.push(data?{data:data,type:bookImgType(id,bn.type)}:null);}
    return '￼img:'+seen[id];};
  const toc=[];let text='';
  const add=function(piece,chT,lvl){const r=bookHtmlText(piece,{img:img});if(!r.text)return;
    if(chT!=null)toc.push({t:chT||('Глава '+(toc.length+1)),off:text.length+(text?2:0),lvl:lvl||0});
    text+=(text?'\n\n':'')+r.text;};
  const parts=main.x.split(/<section\b[^>]*>/);
  add(parts[0].replace(/<title>[\s\S]*?<\/title>/,''),null); /* epigraph / annotation before the first section; the book title is on the title page */
  let depth=0;
  parts.slice(1).forEach(function(sec){
    const tm=sec.match(/^\s*(?:<[^>]+>\s*)*?<title>([\s\S]*?)<\/title>/)||sec.match(/<title>([\s\S]*?)<\/title>/);
    const chT=tm?bookHtmlText(tm[1]).text.replace(/\n+/g,'. ').slice(0,80):'';
    const r0=bookHtmlText(sec).text;
    if(r0)add(sec,chT||r0.replace(/^￼img:\d+\s*/,'').slice(0,60),Math.min(3,depth));
    depth+=1-((sec.match(/<\/section>/g)||[]).length);if(depth<0)depth=0;
  });
  const notes=bodies.find(function(b){return /^notes$/i.test(b.name);});
  if(notes){const r=bookHtmlText(notes.x.replace(/<title>([\s\S]*?)<\/title>/g,'<p>$1</p>'));if(r.text){toc.push({t:'Примечания',off:text.length+(text?2:0),lvl:0});text+=(text?'\n\n':'')+r.text;}}
  if(!text.trim())throw new Error('пустой FB2');
  const lang=((/<lang>\s*([A-Za-z]{2,3})/.exec(ti)||[])[1]||'').toLowerCase();
  return {title:title,author:author,text:text.trim(),toc:toc,lang:lang||undefined,imgs:imgs};
}


/* ===== Мини-проверка (25.10, Джессика «Давай все кроме 3 и 6», пункт 5; arch.md «Честное чтение») =====
   After a long session (≥ QUIZ_MIN counted minutes and ≥ QUIZ_PAGES pages) the summary offers ONE optional question about what was
   just read, made and checked by the reader's own AI key. Right → +QUIZ_XP XP once a local day (game.quizPaid); wrong or skipped →
   nothing is taken away. The passage goes only to the reader's own AI service, nothing is stored but the paid day. */
const QUIZ_SYS_Q='Ты помогаешь читателю проверить, понял ли он отрывок, который только что прочитал. Придумай ОДИН простой вопрос по содержанию отрывка (кто, что сделал, почему, чем закончилось), на который внимательный читатель ответит одной фразой. Не спрашивай про числа, даты, точные слова и мелкие детали. Вопрос на языке отрывка. Ответь только JSON: {"q":"вопрос","a":"короткий правильный ответ"}';
const QUIZ_SYS_A='Проверь ответ читателя на вопрос по отрывку книги. Будь доброжелателен: засчитывай ответ, если смысл верный, даже если он неполный, своими словами или с опечатками. Ответь только JSON: {"ok":true или false,"why":"одно короткое предложение по-русски"}';
let QZ=null; /* {src, st: offer|wait|ask|check|ok|no|err|nokey, q, a, why, err, txt} */
async function quizPassage(src){
  const b=src.book;
  try{
    if(b.text){const t=String(b.text),L=t.length,per=Math.ceil(L/Math.max(1,src.pages||1)),end=Math.min(L,Math.floor(L*Math.max(0,Math.min(1,src.pos)))+per);
      return t.slice(Math.max(0,end-3000),end).replace(/\uFFFCimg:\d+/g,' ').replace(/\s+/g,' ').trim();}
    if(b.type==='pdf'&&typeof loadPdfJs==='function'&&typeof idbGet==='function'){
      const buf=await idbGet('pdf:'+b.id);if(!buf)return '';await loadPdfJs();
      const doc=await window.pdfjsLib.getDocument({data:buf.slice(0)}).promise,parts=[];
      try{for(let n=Math.max(1,src.page-1);n<=Math.min(doc.numPages,src.page+1);n++){const pg=await doc.getPage(n);const tc=await pg.getTextContent();parts.push(tc.items.map(function(x){return x.str||'';}).join(' '));}}
      finally{try{doc.destroy();}catch(_){}}
      return parts.join('\n').replace(/\s+/g,' ').trim().slice(-3000);
    }
  }catch(e){console.warn('[rq] quiz passage',e);}
  return '';
}
function quizRender(r){
  const box=el('sumQuiz');if(!box)return;
  if(r){QZ=r.quiz?{src:r.quiz,st:'offer'}:null;}
  if(!QZ){box.classList.add('hidden');box.innerHTML='';return;}
  const G=window.__rqGame,xp=G.QUIZ_XP,s=QZ.st,btn=function(id,ic,t){return '<button type="button" class="ghostbtn" id="'+id+'">'+rqIcon(ic,16)+' '+t+'</button>';};
  let h='<div class="qz-h">'+rqIcon('message-circle',16)+'<b>Вопрос по прочитанному</b></div>';
  if(s==='offer')h+='<div class="qz-t">Необязательно. Ответишь верно: +'+xp+' XP. Неверно: ничего не теряешь.</div><div class="qz-b">'+btn('qzGo','sparkles','Получить вопрос')+'</div>';
  else if(s==='nokey')h+='<div class="qz-t">Вопрос задаёт нейросеть на твоём ключе. Вставь ключ в Настройках, раздел «ИИ-помощник».</div><div class="qz-b">'+btn('qzSet','settings','Открыть настройки')+'</div>';
  else if(s==='wait'||s==='check')h+='<div class="qz-t" role="status">'+(s==='wait'?'Готовлю вопрос…':'Проверяю…')+'</div>';
  else if(s==='ask')h+='<div class="qz-q">'+esc(QZ.q)+'</div><textarea id="qzA" rows="2" maxlength="400" aria-label="Твой ответ" placeholder="Твой ответ своими словами">'+esc(QZ.txt||'')+'</textarea>'+
    '<div class="qz-b">'+btn('qzCheck','check','Проверить')+btn('qzSkip','x','Пропустить')+'</div>';
  else if(s==='ok')h+='<div class="qz-q">'+esc(QZ.q)+'</div><div class="qz-t qz-ok">'+rqIcon('circle-check',16)+'<span>Верно'+(QZ.paid?', +'+QZ.paid+' XP':'')+'. '+esc(QZ.why||'')+'</span></div>';
  else if(s==='no')h+='<div class="qz-q">'+esc(QZ.q)+'</div><div class="qz-t">Не совсем. '+esc(QZ.why||'')+(QZ.a?' Ответ: '+esc(QZ.a):'')+' Опыт за чтение остаётся.</div>';
  else if(s==='err')h+='<div class="qz-t" role="alert">Не получилось: '+esc(QZ.err||'ошибка')+'</div><div class="qz-b">'+btn('qzGo','rotate-cw','Ещё раз')+btn('qzSkip','x','Пропустить')+'</div>';
  box.innerHTML=h;box.classList.remove('hidden');
  if(el('qzGo'))el('qzGo').onclick=quizAsk;
  if(el('qzCheck'))el('qzCheck').onclick=quizCheck;
  if(el('qzSkip'))el('qzSkip').onclick=function(){QZ=null;quizRender();};
  if(el('qzSet'))el('qzSet').onclick=function(){NN_EXP.ai=true;openGeneralSettings(true);if(el('aiHow'))el('aiHow').open=true;settingsScrollTo('aiHead');};
  if(el('qzA'))el('qzA').oninput=function(){QZ.txt=this.value;};
}
async function quizAsk(){
  if(!QZ)return;
  if(!aiOn()){QZ.st='nokey';quizRender();return;}
  if(navigator.onLine===false){QZ.st='err';QZ.err='нужен интернет';quizRender();return;}
  const me=QZ;me.st='wait';quizRender();
  try{
    me.passage=me.passage||await quizPassage(me.src);
    if(me.passage.length<300)throw new Error('здесь слишком мало текста для вопроса');
    const q=window.__rqGame.parseQuizQ(await aiViaKey({system:QUIZ_SYS_Q,user:'Книга: «'+(me.src.book.title||'')+'»\nОтрывок:\n'+me.passage},300));
    if(!q)throw new Error('непонятный ответ нейросети');
    me.q=q.q;me.a=q.a;me.st='ask';
  }catch(e){me.st='err';me.err=e&&e.message||'ошибка';}
  if(QZ===me)quizRender();
}
async function quizCheck(){
  if(!QZ||QZ.st!=='ask')return;
  const me=QZ,ans=String(me.txt||'').trim();if(!ans){const a=el('qzA');if(a)a.focus();return;}
  me.st='check';quizRender();
  let g=null;
  try{g=window.__rqGame.parseQuizGrade(await aiViaKey({system:QUIZ_SYS_A,user:'Отрывок:\n'+me.passage+'\n\nВопрос: '+me.q+'\nОжидаемый ответ: '+me.a+'\nОтвет читателя: '+ans.slice(0,400)},200));
    if(!g)throw new Error('непонятный ответ нейросети');}
  catch(e){me.st='ask';if(QZ===me){quizRender();flashMsg('Не получилось проверить: '+(e&&e.message||'ошибка'),'info');}return;}
  me.why=g.why;me.st=g.ok?'ok':'no';
  if(g.ok)me.paid=quizPay(me.src.day);
  if(QZ===me)quizRender();
}
/** +QUIZ_XP once per local day (game.quizPaid); returns the XP paid now (0 when the day is already paid or the window may not write) */
function quizPay(day){
  if(window.__rqWriter&&!window.__rqWriter.mayWrite())return 0;
  S.quizPaid=S.quizPaid||{};if(S.quizPaid[day])return 0;
  const xp=window.__rqGame.QUIZ_XP,before=S.xp||0,lv=level(before);
  S.quizPaid[day]=xp;S.xp=before+xp;
  const h=S.hist&&S.hist[day];if(h)h.xp=(h.xp||0)+xp;
  save();
  const sx=el('sumXp');if(sx){const to=(Number(sx.dataset.xp)||0)+xp;sx.dataset.xp=to;countUp(sx,to,n=>'+'+n+' XP');}
  sumLevel(level(S.xp),lv,before);
  return xp;
}
