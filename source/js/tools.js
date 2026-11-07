'use strict';
/* ===== «Инструменты читателя» (06.11, Джессика: «внедрить в магазин инструменты, которые читатель будет собирать и может ими
   пользоваться во время чтения», «Реализуй всё это»; список из 12 — Claude Doc «Инструменты читателя в магазине»).
   Где: магазин «Внешний вид» → вкладка «Инструменты» (toolsShopRender), в книге — «Сумка» в нижней панели (#btnBag) и до 3
   закреплённых инструментов рядом (#toolPins). Всё, что уже было бесплатно (линейка, словари, ИИ, закладки, выделения, Фокус),
   остаётся бесплатным: инструменты — новое, красивые версии и расходники.
   Данные (arch.md 06.11): S.tools (домен game, storage/schema.js normTools = toolsNorm ниже), S.ink (перо, домен progress, normInk),
   S.stk (стикеры, домен progress, normStickers; старое поле `stickers` не трогается).
   Чертежи: за каждые 30 засчитанных минут — часть чертежа (не больше 3 в день), 5 частей = инструмент. Считаются только минуты строк
   сессий, которые уже прошли честное чтение (row.minutes), так что пауза, фон и быстрое листание ничего не дают.
   Песочные часы: опыт строки ×1,5 за следующие 30 засчитанных минут, одни в день; щит серии: сам спасает серию за пропущенный день. */
const TOOL_PARTS=5,TOOL_DROP_MS=30*60000,TOOL_DROP_DAY=3,TOOL_HG_MIN=30,TOOL_HG_MUL=0.5;
const TOOLS=[
  {id:'lupa',n:'Лупа',ic:'zoom-in',price:250,k:'new',d:'Увеличивает кусок страницы под пальцем: мелкий шрифт PDF, сноски, сканы.'},
  {id:'pen',n:'Перо для полей',ic:'pen-tool',price:400,k:'new',d:'Рисуйте и пишите прямо на странице. Пометки сохраняются и видны в «Компасе книги».'},
  {id:'shield',n:'Щит серии',ic:'shield-check',price:200,k:'use',max:2,d:'Сам спасает серию, если пропущен день. Держать можно не больше двух.'},
  {id:'hg',n:'Песочные часы',ic:'hourglass',price:60,k:'use',max:9,d:'Следующие 30 минут чтения дают опыт ×1,5. Одни часы в день, пауза и быстрое листание время не тратят.'},
  {id:'compass',n:'Компас книги',ic:'compass',price:300,k:'new',d:'Карта книги: главы, где вы сейчас, цитаты, закладки и пометки по главам, герои из прочитанного.'},
  {id:'markers',n:'Пенал маркеров',ic:'highlighter',price:150,k:'look',d:'Новые стили выделения: волна, рамка, неон, акварель. Цвета остаются ваши.'},
  {id:'rulers',n:'Линейки',ic:'ruler',price:100,k:'look',d:'Деревянная, стеклянная, цветная и «Свеча» для ночи. Обычная линейка остаётся бесплатной.'},
  {id:'marks',n:'Закладки-предметы',ic:'feather',price:80,k:'look',d:'Закладка видна на углу страницы: лента, перо, цветок, игральная карта.'},
  {id:'stickers',n:'Наборы стикеров',ic:'sticker',price:120,k:'look',d:'Стикеры на поля книги: реакции и наборы ваших скинов.'},
  {id:'qtpl',n:'Шаблоны цитат',ic:'image',price:150,k:'new',d:'Новые оформления карточки цитаты: минимал, полароид, ночь, газета.'},
  {id:'lamp',n:'Фонарь следопыта',ic:'flashlight',price:300,k:'new',d:'Подсвечивает на странице имена героев и слова из вашего словаря, чтобы не терять нить.'},
  {id:'words',n:'Записная книжка слов',ic:'notebook',price:100,k:'look',d:'Проверка слов из словаря в любой момент, карточки в стиле скина.'}
];
const TOOL_IDS=TOOLS.map(function(t){return t.id;}),TOOL_USE=['shield','hg'];
const TOOL_KIND={new:'Новое',look:'Оформление',use:'Расходник'};
/* 06.11: «у каждого скина свои версии инструментов» — свои названия (вид берёт цвета скина) */
const TOOL_SKIN={
  ellada:{bag:'Сундук',lupa:'Бронзовая лупа',pen:'Перо-стилос',hg:'Клепсидра',compass:'Компас Одиссея',lamp:'Светильник Диогена'},
  babochkovyi:{bag:'Корзинка',lupa:'Лупа натуралиста',lamp:'Фонарь светлячков',words:'Гербарий слов'},
  celestial:{bag:'Звёздный ларец',lupa:'Звёздная лупа',compass:'Астролябия',lamp:'Свет звезды',hg:'Звёздные часы'},
  alisa:{bag:'Шляпная коробка',hg:'Карманные часы',compass:'Карта Страны чудес',lupa:'Лупа Гусеницы'},
  pencil:{bag:'Пенал',pen:'Карандаш для полей',words:'Тетрадь слов'}
};
function toolSkin(){return document.documentElement.dataset.skin||'';}
function tool(id){return TOOLS.find(function(t){return t.id===id;})||null;}
const TOOL_BAG_SHORT={'Звёздный ларец':'Ларец','Шляпная коробка':'Коробка'};
function toolName(id){const m=TOOL_SKIN[toolSkin()];if(id==='bag')return (m&&m.bag)||'Сумка';if(id==='bagShort'){const b=toolName('bag');return TOOL_BAG_SHORT[b]||b;}return (m&&m[id])||(tool(id)||{}).n||id;}
function toolPartPrice(t){return Math.ceil(t.price/TOOL_PARTS);}

/* ---------- state (= storage/schema.js normTools) ---------- */
function toolsNorm(o){
  o=o&&typeof o==='object'&&!Array.isArray(o)?o:{};
  const DAY=/^\d{4}-\d{2}-\d{2}$/,int=function(v,lo,hi){return Number.isInteger(v)&&v>=lo&&v<=hi?v:null;},map=function(x){return x&&typeof x==='object'&&!Array.isArray(x)?x:{};};
  const t={own:{},n:{},parts:{},pf:0,drop:null,hg:null,sh:[],sel:{},pin:[],on:{},rw:{}};if(int(o.pf,0,1e6)!=null)t.pf=o.pf;
  Object.keys(map(o.own)).forEach(function(k){if(TOOL_IDS.indexOf(k)>=0&&TOOL_USE.indexOf(k)<0&&o.own[k])t.own[k]=1;});
  Object.keys(map(o.n)).forEach(function(k){const v=int(o.n[k],1,99);if(TOOL_USE.indexOf(k)>=0&&v)t.n[k]=Math.min(v,k==='shield'?2:99);});
  Object.keys(map(o.parts)).forEach(function(k){const v=int(o.parts[k],1,4);if(TOOL_IDS.indexOf(k)>=0&&v)t.parts[k]=v;});
  const d=map(o.drop);if(DAY.test(d.d)&&int(d.k,0,9)!=null&&int(d.ms,0,864e5)!=null)t.drop={d:d.d,k:d.k,ms:d.ms};
  const h=map(o.hg);if(DAY.test(h.d)&&typeof h.left==='number'&&h.left>=0&&h.left<=30&&typeof h.at==='number'&&h.at>0)t.hg={d:h.d,at:h.at,left:Math.round(h.left*1000)/1000};
  t.sh=Array.isArray(o.sh)?o.sh.filter(function(x){return DAY.test(x);}).slice(-50):[];
  const sel=map(o.sel);['ruler','mark','hls','qtpl','stk','pen'].forEach(function(k){if(typeof sel[k]==='string'&&/^[a-z0-9#-]{1,12}$/.test(sel[k]))t.sel[k]=sel[k];});
  t.pin=Array.isArray(o.pin)?o.pin.filter(function(x,i,a){return TOOL_IDS.indexOf(x)>=0&&a.indexOf(x)===i;}).slice(0,3):[];
  if(map(o.on).lamp===true)t.on.lamp=true;
  Object.keys(map(o.rw)).slice(0,100).forEach(function(k){if(/^[\w:-]{1,40}$/.test(k)&&o.rw[k])t.rw[k]=1;});
  return t;
}
const TOOLS_OK=new WeakSet();
function TS(){if(!S.tools||!TOOLS_OK.has(S.tools)){S.tools=toolsNorm(S.tools);TOOLS_OK.add(S.tools);}return S.tools;}
function toolOwns(id){return TOOL_USE.indexOf(id)>=0?(TS().n[id]||0)>0:!!TS().own[id];}
function toolCount(id){return TS().n[id]||0;}
function toolsOwnCount(){const T=TS();return TOOL_IDS.filter(function(id){return TOOL_USE.indexOf(id)<0&&T.own[id];}).length+TOOL_USE.filter(function(id){return T.n[id]>0||(id==='shield'&&T.sh.length)||(id==='hg'&&T.hg);}).length;}
function toolsPartsFound(){return TS().pf||0;}
function toolsWriteOk(){if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне');return false;}return true;}

/* ---------- buying ---------- */
function toolPrice(id){const t=tool(id);if(!t)return 0;if(TOOL_USE.indexOf(id)>=0)return t.price;const p=TS().parts[id]||0;return p?Math.min(t.price,(TOOL_PARTS-p)*toolPartPrice(t)):t.price;}
/** → {ok, reason?}: one write; consumables up to max, a tool once (the missing parts of its blueprint are bought at the part price) */
function toolBuy(id){
  if(window.__rqWriter&&!window.__rqWriter.mayWrite())return {ok:false,reason:'passive'};
  const t=tool(id);if(!t)return {ok:false,reason:'unknown'};const T=TS();
  if(TOOL_USE.indexOf(id)>=0){if((T.n[id]||0)>=t.max)return {ok:false,reason:'max'};}else if(T.own[id])return {ok:false,reason:'owned'};
  const price=toolPrice(id);if(!(typeof S.gold==='number'&&S.gold>=price))return {ok:false,reason:'gold'};
  S.gold-=price;if(TOOL_USE.indexOf(id)>=0)T.n[id]=(T.n[id]||0)+1;else{T.own[id]=1;delete T.parts[id];}
  save();return {ok:true,price:price};
}
function toolBuyAsk(id){
  const t=tool(id);if(!t||!toolsWriteOk())return;const price=toolPrice(id),T=TS();
  if(TOOL_USE.indexOf(id)>=0&&(T.n[id]||0)>=t.max){flashMsg(id==='shield'?'Щитов уже два, больше держать нельзя':'Часов уже '+t.max);return;}
  if(S.gold<price){flashMsg('Не хватает '+coinsP(price-S.gold));return;}
  const part=TOOL_USE.indexOf(id)<0&&T.parts[id];
  rqAsk({t:(part?'Докупить чертёж «':'Купить «')+toolName(id)+'» за '+coinsP(price)+'?',p:(part?'У вас '+T.parts[id]+' из '+TOOL_PARTS+' частей. ':'')+'Останется '+coinsP(S.gold-price)+'.',ok:'Купить'}).then(function(v){
    if(!v)return;const r=toolBuy(id);if(!r.ok){if(r.reason==='gold')flashMsg('Не хватает монет');return;}
    flashMsg(TOOL_USE.indexOf(id)>=0?'«'+toolName(id)+'»: теперь '+toolCount(id):'«'+toolName(id)+'» — в '+toolsBagIn(),{kind:'game',icon:t.ic});
    toolsRefresh();});
}
function toolsRefresh(){try{toolsShopRender();}catch(e){}try{toolsPinsRender();}catch(e){}try{toolsProfRender();}catch(e){}try{toolsApply();}catch(e){}
  try{if(TL.bagOpen&&el('qSheet')&&!el('qSheet').hidden&&el('qSheet').querySelector('.tlbag'))toolsBagOpen(true);}catch(e){}
  try{if(el('lookBalance'))el('lookBalance').textContent=coinsP(S.gold);}catch(e){}}

/* ---------- blueprints, hourglass, rewards: after every award of new session rows ---------- */
let TOOLS_LAST={ids:[],hgXp:0,parts:[],done:[],shield:0,rw:[]};
function toolsAfterAward(res){
  const T=TS(),ids=(res&&res.ids)||[];const last={ids:ids.slice(),hgXp:0,parts:[],done:[],shield:0,rw:[]};TOOLS_LAST=last;
  if(!ids.length)return;
  const fresh=(typeof SESS!=='undefined'&&SESS||[]).filter(function(r){return r&&ids.indexOf(r.id)>=0;}),d=today();let ch=false;
  /* hourglass: ×1,5 of the row's own XP for the minutes inside the 30 (never more than the time since it was turned) */
  if(T.hg&&T.hg.left>0)fresh.forEach(function(r){
    if(String(r.date).slice(0,10)!==T.hg.d||!(T.hg.left>0))return;const m=Number(r.minutes)||0,x=Number(r.xp)||0;if(m<=0||x<=0)return;
    const use=Math.min(m,T.hg.left,Math.max(0,(Date.now()-T.hg.at)/60000));if(use<=0)return;
    const bonus=Math.round(x*TOOL_HG_MUL*use/m);T.hg.left=Math.max(0,Math.round((T.hg.left-use)*1000)/1000);ch=true;
    if(bonus>0){S.xp=(Number(S.xp)||0)+bonus;r.xp=x+bonus;last.hgXp+=bonus;if(__rq&&__rq.setSessionXp)__rq.setSessionXp(r.id,r.xp).catch(function(){});}});
  /* blueprint parts: every 30 counted minutes of today, at most 3 a day */
  fresh.forEach(function(r){if(String(r.date).slice(0,10)!==d)return;if(!T.drop||T.drop.d!==d)T.drop={d:d,k:0,ms:0};
    T.drop.ms=Math.min(TOOL_DROP_MS*TOOL_DROP_DAY,T.drop.ms+Math.round((Number(r.minutes)||0)*60000));ch=true;});
  while(T.drop&&T.drop.d===d&&T.drop.ms>=TOOL_DROP_MS&&T.drop.k<TOOL_DROP_DAY){
    const id=toolsPickPart();if(!id)break;T.drop.ms-=TOOL_DROP_MS;T.drop.k++;T.pf=(T.pf||0)+1;T.parts[id]=(T.parts[id]||0)+1;
    if(T.parts[id]>=TOOL_PARTS){delete T.parts[id];T.own[id]=1;T.rw['bp:'+id]=1;last.done.push(id);}else last.parts.push(id);}
  if(T.drop&&T.drop.k>=TOOL_DROP_DAY)T.drop.ms=0;
  if(toolsRewards(last))ch=true;
  if(ch)save();
  if(last.done.length||last.rw.length)toolsRefresh();
}
/** the part that drops: a tool not owned yet; the one closest to done first, ties at random */
function toolsPickPart(){const T=TS(),L=TOOL_IDS.filter(function(id){return TOOL_USE.indexOf(id)<0&&!T.own[id];});if(!L.length)return null;
  const mx=Math.max.apply(null,L.map(function(id){return T.parts[id]||0;}));const top=mx>0?L.filter(function(id){return (T.parts[id]||0)===mx;}):L;
  return top[Math.floor(Math.random()*top.length)];}
/* awards for the reading itself (each once, T.rw): first finished PDF → lupa, a finished book of 500+ pages → lamp,
   the first adventure challenge → compass, a weekly «Фокус» challenge → +1 shield (while fewer than two) */
function toolsRewards(last){
  const T=TS();let ch=false;const give=function(key,id,why){if(T.rw[key])return;T.rw[key]=1;ch=true;
    if(TOOL_USE.indexOf(id)>=0){const t=tool(id);if((T.n[id]||0)<t.max){T.n[id]=(T.n[id]||0)+1;if(last)last.rw.push({id:id,why:why});}}
    else if(!T.own[id]){T.own[id]=1;delete T.parts[id];if(last)last.rw.push({id:id,why:why});}};
  const fin=S.finished||[],books=typeof allBooks==='function'?allBooks():[];
  const byId=function(id){return books.find(function(b){return b&&b.id===id;});};
  if(fin.some(function(id){const b=byId(id);return b&&b.type==='pdf';}))give('pdf1','lupa','первая прочитанная PDF-книга');
  if(fin.some(function(id){const b=byId(id);return b&&((+b.pages||0)>=500||(+b.textLen||0)>=900000||(b.text&&b.text.length>=900000));}))give('big500','lamp','роман длиннее 500 страниц');
  if(typeof advQuestsClaimed==='function'&&advQuestsClaimed()>=1)give('adv1','compass','испытание месяца в «Приключениях»');
  const cp=S.chalPaid||{},lim=addLocalDays(today(),-14);
  Object.keys(cp).forEach(function(w){if(cp[w]>0&&w>=lim)give('ch:'+w,'shield','вызов недели в «Фокусе»');});
  return ch;
}
/** 06.11 щит серии: called by closeReader when the streak would break; true = the missed days are covered */
function toolsShieldUse(sd){
  const T=TS(),n=T.n.shield||0;if(!n||!S.lastDay||!sd)return false;const miss=daysBetween(S.lastDay,sd)-1;if(miss<1||miss>n)return false;
  T.n.shield=n-miss;if(!T.n.shield)delete T.n.shield;for(let i=1;i<=miss;i++)T.sh.push(addLocalDays(S.lastDay,i));T.sh=T.sh.slice(-50);
  TOOLS_LAST.shield=miss;return true;
}
/** the session summary lines (#sumTools) */
function toolsSummaryHtml(row){
  const L=TOOLS_LAST;if(!row||L.ids.indexOf(row.id)<0)return '';const out=[];
  if(L.hgXp>0)out.push([toolsIc('hg'),'+'+L.hgXp+' XP — '+toolName('hg').toLowerCase()+(TS().hg&&TS().hg.left>0?' (ещё '+Math.ceil(TS().hg.left)+' мин)':'')]);
  if(L.shield)out.push([toolsIc('shield'),toolName('shield')+' спас серию'+(L.shield>1?' за '+L.shield+' дня':'')]);
  L.parts.forEach(function(id){out.push(['puzzle','Часть чертежа «'+toolName(id)+'»: '+(TS().parts[id]||0)+' из '+TOOL_PARTS]);});
  L.done.forEach(function(id){out.push([toolsIc(id),'Чертёж собран: «'+toolName(id)+'» теперь в '+toolsBagIn()]);});
  L.rw.forEach(function(x){out.push([toolsIc(x.id),'«'+toolName(x.id)+'» в награду: '+x.why]);});
  return out.map(function(x){return '<div>'+rqIcon(x[0],14)+'<span>'+esc(x[1])+'</span></div>';}).join('');
}
function toolsIc(id){return (tool(id)||{ic:'backpack'}).ic;}
function toolsBagIn(){const n=toolName('bag');return {'Сумка':'сумке','Сундук':'сундуке','Корзинка':'корзинке','Звёздный ларец':'звёздном ларце','Шляпная коробка':'шляпной коробке','Пенал':'пенале'}[n]||'сумке';}
{const a0=awardPendingSessions;awardPendingSessions=function(){const r=a0.apply(this,arguments);try{toolsAfterAward(r);}catch(e){console.warn('[rq] tools award',e);}return r;};}

/* ---------- shop tab («Внешний вид» → Магазин → Инструменты) ---------- */
/* the tab lives in the shop's tab row («Скины · Инструменты · Персонажи…», js/hero.js renderHeroShop) */
function toolsShopKind(k){if(typeof heroShopTab==='function'){if(k==='tools'&&toolsRewards(null))save();heroShopTab(k==='tools'?'tools':'skins');return;}
  const t=k==='tools';document.querySelectorAll('.shopkinds [data-k]').forEach(function(b){b.classList.toggle('on',b.dataset.k===(t?'tools':'skins'));});
  if(el('shopList'))el('shopList').hidden=t;if(el('toolShop'))el('toolShop').hidden=!t;if(t)toolsShopRender();}
function toolsShopRender(){
  const box=el('toolShop');if(!box)return;const T=TS();
  const dropLeft=T.drop&&T.drop.d===today()?TOOL_DROP_DAY-T.drop.k:TOOL_DROP_DAY;
  box.innerHTML='<p class="tlintro">Инструменты берёте с собой в книгу: <b>«'+esc(toolName('bag'))+'»</b> в нижней панели чтения. '+
    'Собрать можно и без монет: за каждые 30 минут чтения — часть чертежа'+(dropLeft<TOOL_DROP_DAY?' (сегодня ещё '+dropLeft+')':' (до 3 в день)')+', 5 частей — инструмент.</p>'+
    TOOLS.map(function(t){
      const use=TOOL_USE.indexOf(t.id)>=0,own=use?toolCount(t.id):!!T.own[t.id],parts=T.parts[t.id]||0,price=toolPrice(t.id);
      let st='',btn='';
      if(use){st='<span class="tlst">'+(own?'В '+toolsBagIn()+': '+own+' из '+t.max:'Нет в '+toolsBagIn())+'</span>';
        btn=own>=t.max?'<button type="button" class="buy tlbuy st-worn" disabled>'+rqIcon('check',16)+'Полно</button>':'<button type="button" class="buy tlbuy" onclick="toolBuyAsk(\''+t.id+'\')"'+(S.gold<price?' disabled':'')+'>'+coinsP(price)+'</button>';}
      else if(own){st='<span class="tlst">В '+toolsBagIn()+'</span>';btn='<button type="button" class="buy tlbuy st-worn" disabled>'+rqIcon('check',16)+'Есть</button>';}
      else{st=parts?'<span class="tlparts" aria-label="Чертёж: '+parts+' из '+TOOL_PARTS+'">'+'<i class="on"></i>'.repeat(parts)+'<i></i>'.repeat(TOOL_PARTS-parts)+'<span>'+parts+' из '+TOOL_PARTS+'</span></span>':'<span class="tlst">Чертёж: 0 из '+TOOL_PARTS+'</span>';
        btn='<button type="button" class="buy tlbuy" onclick="toolBuyAsk(\''+t.id+'\')"'+(S.gold<price?' disabled':'')+'>'+(parts?'Докупить · ':'')+coinsP(price)+'</button>';}
      return '<div class="tlcard" data-id="'+t.id+'" data-own="'+(own?1:0)+'"><span class="tlic" aria-hidden="true">'+rqIcon(t.ic,26)+'</span>'+
        '<span class="tlbody"><span class="tlname">'+esc(toolName(t.id))+'<span class="tlkind">'+TOOL_KIND[t.k]+'</span></span><span class="tldesc">'+esc(t.d)+'</span>'+st+'</span>'+btn+'</div>';
    }).join('')+
    '<p class="tlintro tlhow">Ещё инструменты дают в награду: лупу — за первую прочитанную PDF-книгу, фонарь — за роман длиннее 500 страниц, компас — за испытание месяца в «Приключениях», щит серии — за вызов недели в «Фокусе». Со скином приходит его закладка.</p>';
}
function toolsOpenShop(){openLook(true);toolsShopKind('tools');}

/* ---------- profile: the collection ---------- */
function toolsProfRender(){const s=el('toolCardSub');if(!s)return;const n=toolsOwnCount(),T=TS(),p=Object.keys(T.parts).reduce(function(a,k){return a+T.parts[k];},0);
  s.textContent=n+' из '+TOOLS.length+(p?' · '+p+' '+plural(p,'часть','части','частей')+' чертежей':'');
  const nm=el('toolCardName');if(nm)nm.textContent='Инструменты';}
{const p0=renderProfile;renderProfile=function(){const r=p0.apply(this,arguments);try{toolsProfRender();}catch(e){}return r;};}

/* ---------- in the book: the bag ---------- */
const TL={bagOpen:false,mode:'',stroke:null,pen:{c:'#2b2b2b',w:3},stk:'heart',lamp:{key:'',names:[],t:0},hgSnap:null};
const TL_PEN_COLORS=['#2b2b2b','#2f6fdd','#2e9e6b','#d1495b','#b8860b'];
const TL_PEN_W=[[2,'Тонко'],[4,'Средне'],[12,'Маркер']];
const TL_HLS=[['','Обычный'],['wave','Волна'],['frame','Рамка'],['neon','Неон'],['water','Акварель']];
const TL_RULERS=[['','Обычная'],['wood','Деревянная'],['glass','Стеклянная'],['color','Цветная'],['candle','Свеча']];
const TL_QTPL=[['','Скин'],['mini','Минимал'],['polaroid','Полароид'],['night','Ночь'],['paper','Газета']];
const TL_MARKS=[['','Без предмета'],['ribbon','Лента'],['feather','Перо'],['flower','Цветок'],['card','Карта']];
/* the skin's own bookmark comes with the skin (Карандашный is free) */
const TL_SKIN_MARK={pencil:['sk-pencil','Карандаш','pencil'],ellada:['sk-ellada','Амфора','amphora'],babochkovyi:['sk-babochkovyi','Крыло','flower-2'],celestial:['sk-celestial','Звезда','sparkle'],alisa:['sk-alisa','Туз червей','heart']};
const TL_STK_REACT=['heart','star','flame','sparkles','circle-help','zap','check','quote'];
const TL_STK_SKIN={pencil:['pencil','pen-tool','ruler','notebook-pen'],ellada:['amphora','castle','scroll-text','shield'],babochkovyi:['flower','flower-2','sun','feather'],celestial:['star','sparkle','moon','sunrise'],alisa:['heart','clock','timer','gift']};
const TL_SKIN_NAME={pencil:'Карандашный',ellada:'Эллада',babochkovyi:'Бабочковый',celestial:'Небесный',alisa:'Страна чудес'};
function tlSkinOwned(sk){try{return typeof shopOwns==='function'&&shopOwns('skin-'+sk);}catch(e){return false;}}
function tlMarkChoices(){const T=TS(),L=[];if(T.own.marks)TL_MARKS.forEach(function(m){L.push(m);});else L.push(TL_MARKS[0]);
  Object.keys(TL_SKIN_MARK).forEach(function(sk){if(tlSkinOwned(sk))L.push([TL_SKIN_MARK[sk][0],TL_SKIN_MARK[sk][1]+' · '+TL_SKIN_NAME[sk]]);});return L;}
function tlMarkOk(v){return !!v&&tlMarkChoices().some(function(m){return m[0]===v;});}
function tlChips(key,list,cur){return '<div class="tlchips" role="group">'+list.map(function(x){return '<button type="button" class="fchip'+(x[0]===(cur||'')?' on':'')+'" data-sel="'+key+'" data-v="'+x[0]+'" aria-pressed="'+(x[0]===(cur||''))+'">'+esc(x[1])+'</button>';}).join('')+'</div>';}
function toolsBagOpen(keep){
  if(!R||!R.book)return;if(!keep){toolsRewards(null)&&save();}const T=TS();TL.bagOpen=true;
  const row=function(t,body,acts){const own=toolOwns(t.id)||(t.id==='marks'&&tlMarkChoices().length>1),pin=T.pin.indexOf(t.id)>=0;
    return '<div class="tlrow" data-id="'+t.id+'" data-own="'+(own?1:0)+'"><span class="tlic" aria-hidden="true">'+rqIcon(t.ic,22)+'</span><div class="tlbody"><span class="tlname">'+esc(toolName(t.id))+'</span>'+
      (own?body:'<span class="tldesc">'+esc(t.d)+'</span><span class="tlst">'+(T.parts[t.id]?'Чертёж '+T.parts[t.id]+' из '+TOOL_PARTS+' · ':'')+'В магазине: '+coinsP(toolPrice(t.id))+' · «Внешний вид» → Магазин → Инструменты</span>')+'</div>'+
      (own?'<div class="tlacts">'+(acts||'')+(TOOL_USE.indexOf(t.id)<0||t.id==='hg'?'<button type="button" class="tlpin'+(pin?' on':'')+'" data-pin="'+t.id+'" aria-pressed="'+pin+'" aria-label="'+(pin?'Открепить':'Закрепить в панели')+'" title="'+(pin?'Открепить':'Закрепить в панели')+'">'+rqIcon('pin',18)+'</button>':'')+'</div>':'')+'</div>';};
  const act=function(id,txt,dis){return '<button type="button" class="cta tlgo" data-go="'+id+'"'+(dis?' disabled':'')+'>'+esc(txt)+'</button>';};
  const scroll=!tlPaged();
  const hgA=T.hg&&T.hg.d===today()&&T.hg.left>0,hgUsed=T.hg&&T.hg.d===today();
  const H={
    lupa:['<span class="tldesc">Ведите пальцем по странице — под ним крупнее.</span>',act('lupa','Взять')],
    pen:['<span class="tldesc">'+(scroll?'Перо работает в режиме «Страницы».':'Пишите и рисуйте на этой странице.')+'</span>',act('pen','Рисовать',scroll)],
    shield:['<span class="tldesc">Щитов: '+toolCount('shield')+' из 2. Срабатывает сам, если пропущен день.'+(T.sh.length?' Уже спас: '+T.sh.length+' '+plural(T.sh.length,'день','дня','дней')+'.':'')+'</span>',''],
    hg:['<span class="tldesc">'+(hgA?'Идут: ещё '+tlHgLeft()+' мин чтения с опытом ×1,5.':hgUsed?'Сегодня часы уже были. Завтра можно снова.':'Часов: '+toolCount('hg')+'. 30 минут чтения с опытом ×1,5.')+'</span>',hgA||hgUsed?'':act('hg','Перевернуть',!toolCount('hg'))],
    compass:['<span class="tldesc">Главы, где вы сейчас, цитаты и герои.</span>',act('compass','Открыть')],
    markers:['<span class="tldesc">Стиль новых цитат:</span>'+tlChips('hls',TL_HLS,T.sel.hls),''],
    rulers:['<span class="tldesc">Вид линейки'+(rqRm().ruler.on?'':' (сама линейка сейчас выключена)')+':</span>'+tlChips('ruler',TL_RULERS,T.sel.ruler),R.mode==='text'?act('ruler',rqRm().ruler.on?'Убрать линейку':'Включить линейку'):''],
    marks:['<span class="tldesc">Предмет на углу страницы с закладкой:</span>'+tlChips('mark',tlMarkChoices(),tlMarkOk(T.sel.mark)?T.sel.mark:''),''],
    stickers:['<span class="tldesc">'+(scroll?'Стикеры клеятся в режиме «Страницы».':'Наклейте стикер на эту страницу.')+'</span>',act('stickers','Наклеить',scroll)],
    qtpl:['<span class="tldesc">Оформление карточки цитаты:</span>'+tlChips('qtpl',TL_QTPL,T.sel.qtpl),''],
    lamp:['<span class="tldesc">'+(T.on.lamp?'Горит: имена героев и слова из словаря подсвечены.':'Подсветит имена героев и слова из словаря.')+'</span>',act('lamp',T.on.lamp?'Погасить':'Зажечь')],
    words:['<span class="tldesc">Слов в словаре: '+(S.vocab||[]).length+'.</span>',act('words','Проверить слово',!(S.vocab||[]).length)]
  };
  const ownN=toolsOwnCount();
  const d=qSheet('<h3 class="tlbagh">'+rqIcon('backpack',22)+' '+esc(toolName('bag'))+'</h3><p>'+(ownN?'Инструментов: '+ownN+' из '+TOOLS.length+'. Закреплённые (до 3) стоят в верхней панели, рядом с яркостью.':'Пока пусто. Инструменты собираются из чертежей за чтение или покупаются в магазине.')+'</p>'+
    '<div class="tlbag">'+TOOLS.slice().sort(function(a,b){return (toolOwns(b.id)?1:0)-(toolOwns(a.id)?1:0);}).map(function(t){const h=H[t.id];return row(t,h[0],h[1]);}).join('')+'</div>',toolName('bag'));
  d.querySelector('.tlbag').onclick=function(e){
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.pin){toolsPin(b.dataset.pin);return;}
    if(b.dataset.sel){const k=b.dataset.sel;T.sel[k]=b.dataset.v;if(!T.sel[k])delete T.sel[k];save();toolsApply();toolsBagOpen(true);return;}
    if(b.dataset.go)toolsGo(b.dataset.go);};
  el('qSheetScrim').onclick=function(){TL.bagOpen=false;qSheetClose();};
}
function toolsPin(id){const T=TS(),i=T.pin.indexOf(id);if(i>=0)T.pin.splice(i,1);else{if(T.pin.length>=3){flashMsg('Закрепить можно не больше трёх');return;}T.pin.push(id);}save();toolsPinsRender();if(TL.bagOpen)toolsBagOpen(true);}
/** the main action of a tool (the bag button and a pinned button) */
function toolsGo(id){
  if(!R||!R.book)return;
  const own=toolOwns(id)||(id==='marks'&&tlMarkChoices().length>1);if(!own){toolsBagOpen();return;}
  const close=function(){TL.bagOpen=false;qSheetClose();};
  if(id==='lupa'){close();toolsMode(TL.mode==='lupa'?'':'lupa');return;}
  if(id==='pen'){close();toolsMode(TL.mode==='pen'?'':'pen');return;}
  if(id==='stickers'){close();toolsMode(TL.mode==='stk'?'':'stk');return;}
  if(id==='compass'){toolsCompass();return;}
  if(id==='hg'){toolsHgStart();return;}
  if(id==='lamp'){const T=TS();if(T.on.lamp)delete T.on.lamp;else T.on.lamp=true;save();TL.lamp.key='';toolsLamp();flashMsg(T.on.lamp?toolName('lamp')+' горит':toolName('lamp')+' погас',{kind:'info',icon:'flashlight'});if(TL.bagOpen)toolsBagOpen(true);toolsPinsRender();return;}
  if(id==='words'){close();if(typeof dkQuizShow!=='function'||!dkQuizShow())flashMsg('В словаре пока нет слов для проверки');return;}
  if(id==='ruler'){const x=rqRm().ruler;x.on=!x.on;saveSet();try{rmRulerTop();}catch(e){}if(TL.bagOpen)toolsBagOpen(true);return;}
  toolsBagOpen();
}
function toolsPinsRender(){
  const box=el('toolPins');if(!box)return;const T=TS();
  box.innerHTML=T.pin.filter(function(id){return toolOwns(id);}).map(function(id){
    const on=(id==='lupa'&&TL.mode==='lupa')||(id==='pen'&&TL.mode==='pen')||(id==='stickers'&&TL.mode==='stk')||(id==='lamp'&&T.on.lamp)||(id==='hg'&&T.hg&&T.hg.d===today()&&T.hg.left>0);
    return '<button type="button" class="tlpinb'+(on?' on':'')+'" data-tool="'+id+'" aria-label="'+esc(toolName(id))+'" title="'+esc(toolName(id))+'" aria-pressed="'+on+'">'+rqIcon(tool(id).ic,20)+'</button>';}).join('');
}

/* ---------- hourglass ---------- */
function tlHgLeft(){const T=TS();if(!T.hg||T.hg.d!==today())return 0;let left=T.hg.left;
  const s=TL.hgSnap,sn=(typeof __tracker!=='undefined'&&__tracker&&__tracker.isRunning&&__tracker.isRunning()&&__tracker.snapshot)?__tracker.snapshot():null;
  if(s&&sn&&__tracker.sessionId&&__tracker.sessionId()===s.sid)left-=Math.max(0,((sn.sureMs||0)-s.ms)/60000);
  return Math.max(0,Math.ceil(left));}
function toolsHgStart(){
  if(!toolsWriteOk())return;const T=TS();
  if(T.hg&&T.hg.d===today()){flashMsg(T.hg.left>0?'Часы уже идут':'Сегодня часы уже были');return;}
  if(!toolCount('hg')){flashMsg('Песочных часов нет — они в магазине');return;}
  T.n.hg--;if(!T.n.hg)delete T.n.hg;T.hg={d:today(),at:Date.now(),left:TOOL_HG_MIN};
  const sn=(typeof __tracker!=='undefined'&&__tracker&&__tracker.isRunning&&__tracker.isRunning())?__tracker.snapshot():null;
  TL.hgSnap=sn&&__tracker.sessionId?{sid:__tracker.sessionId(),ms:sn.sureMs||0}:null;
  save();flashMsg(toolName('hg')+': 30 минут чтения с опытом ×1,5',{kind:'game',icon:'hourglass'});TL.bagOpen=false;qSheetClose();toolsHgChip();toolsPinsRender();
}
function toolsHgChip(){const c=el('hgChip');if(!c)return;const T=TS(),on=T.hg&&T.hg.d===today()&&T.hg.left>0;c.hidden=!on;if(on)c.innerHTML=rqIcon('hourglass',12)+'<span>ещё '+tlHgLeft()+' мин</span>';}
setInterval(function(){try{if(R&&R.book)toolsHgChip();}catch(e){}},15000);

/* ---------- the page layer: ink, stickers, the bookmark item ---------- */
function tlPageKey(){return R&&R.book?String((R.page|0)+1):'';}
function tlTarget(){if(R.mode==='pdf'){const s=el('pdfSheet');if(s&&el('pdfWrap')&&!el('pdfWrap').classList.contains('hidden')){const b=s.getBoundingClientRect();if(b.width>20&&b.height>20)return b;}}return el('viewer').getBoundingClientRect();}
function tlPaged(){return !rqScrollMode()&&!(R.mode==='pdf'&&el('pdfScroll')&&!el('pdfScroll').classList.contains('hidden'));}
function tlLayer(){let L=el('tlLayer');if(L)return L;L=document.createElement('div');L.id='tlLayer';L.dataset.mode='';L.innerHTML='<canvas id="tlInk"></canvas><div id="tlStk"></div><span id="tlMark" hidden></span>';
  el('reader').appendChild(L);
  L.addEventListener('pointerdown',tlDown);L.addEventListener('pointermove',tlMove);L.addEventListener('pointerup',tlUp);L.addEventListener('pointercancel',tlUp);
  return L;}
function toolsLayerDraw(){
  const rd=el('reader');if(!rd||rd.classList.contains('hidden')||!R||!R.book){const L0=el('tlLayer');if(L0)L0.hidden=true;return;}
  const L=tlLayer(),b=R.book,k=tlPageKey(),paged=tlPaged();
  const ink=paged&&S.ink&&S.ink[b.id]&&S.ink[b.id][k]||[],stk=paged?(S.stk&&S.stk[b.id]||[]).filter(function(x){return String(x.p)===k;}):[];
  const T=TS(),mk=tlMarkOk(T.sel.mark)?T.sel.mark:'',bm=paged&&mk&&(S.marks[b.id]||[]).some(function(m){return m&&m.page===(R.page|0)+1;});
  const any=ink.length||stk.length||bm||TL.mode||(TL.stroke);L.hidden=!any;if(!any)return;
  const r=tlTarget();L.style.left=r.left+'px';L.style.top=r.top+'px';L.style.width=r.width+'px';L.style.height=r.height+'px';L.dataset.mode=TL.mode;
  const cv=el('tlInk'),dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);cv.style.width=r.width+'px';cv.style.height=r.height+'px';
  const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);
  ink.concat(TL.stroke?[TL.stroke]:[]).forEach(function(s){tlStroke(c,s,r.width,r.height);});
  el('tlStk').innerHTML=stk.map(function(x,i){return '<span class="tlstk" data-i="'+i+'" style="left:'+(x.x/10)+'%;top:'+(x.y/10)+'%">'+tlStkHtml(x.s)+'</span>';}).join('');
  const m=el('tlMark');m.hidden=!bm;if(bm){m.dataset.v=mk;m.innerHTML=tlMarkSvg(mk);}
}
function tlStroke(c,s,W,H){const p=s.p,sc=W/400;if(!p||p.length<2)return;c.save();c.strokeStyle=s.c;c.lineWidth=Math.max(1,s.w*sc);c.lineCap='round';c.lineJoin='round';if(s.w>=10)c.globalAlpha=.35;
  c.beginPath();c.moveTo(p[0]*W/1000,p[1]*H/1000);if(p.length===2)c.lineTo(p[0]*W/1000+.1,p[1]*H/1000);for(let i=2;i<p.length;i+=2)c.lineTo(p[i]*W/1000,p[i+1]*H/1000);c.stroke();c.restore();}
function tlStkHtml(s){const sk=/^sk-([a-z]+)-(.+)$/.exec(s);return '<i class="'+(sk?'sk':'re')+'">'+rqIcon(sk?sk[2]:s,26)+'</i>';}
function tlMarkSvg(v){
  if(v==='ribbon')return '<svg viewBox="0 0 24 40" aria-hidden="true"><path d="M4 0h16v38l-8-7-8 7z" fill="var(--rq-accent,#c9a227)"/><path d="M4 0h16v4H4z" fill="rgba(0,0,0,.18)"/></svg>';
  if(v==='card')return '<svg viewBox="0 0 30 42" aria-hidden="true"><rect x="1" y="1" width="28" height="40" rx="4" fill="#fffdf6" stroke="rgba(0,0,0,.35)"/><path d="M15 29s-8-5-8-10a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-8 10-8 10z" fill="#c8323c"/><text x="5" y="11" font-size="8" font-family="Georgia,serif" fill="#c8323c">A</text></svg>';
  const ic={feather:'feather',flower:'flower','sk-pencil':'pencil','sk-ellada':'amphora','sk-babochkovyi':'flower-2','sk-celestial':'sparkle','sk-alisa':'heart'}[v]||'bookmark';
  return '<i class="tlmi">'+rqIcon(ic,30)+'</i>';
}
/* modes: lupa / pen / stk — a bar at the bottom (no floating buttons on the page) */
function toolsMode(m){
  if(m&&!tlPaged()&&m!=='lupa'){flashMsg('Работает в режиме «Страницы»');return;}
  if(TL.mode==='pen'&&m!=='pen')save();
  TL.mode=m||'';TL.stroke=null;tlLensHide();
  let bar=el('tlBar');if(!bar){bar=document.createElement('div');bar.id='tlBar';bar.setAttribute('role','toolbar');el('reader').appendChild(bar);bar.onclick=tlBarClick;}
  bar.hidden=!TL.mode;el('reader').classList.toggle('tlmode',!!TL.mode);
  if(TL.mode==='lupa')bar.innerHTML='<div class="tlbrow"><span class="tlbt">'+rqIcon('zoom-in',18)+' '+esc(toolName('lupa'))+': ведите пальцем по странице</span><button type="button" class="cta" data-b="done">Готово</button></div>';
  else if(TL.mode==='pen')bar.innerHTML='<div class="tlbrow">'+TL_PEN_COLORS.map(function(c){return '<button type="button" class="tlcol'+(TL.pen.c===c?' on':'')+'" data-c="'+c+'" style="--d:'+c+'" aria-label="Цвет"></button>';}).join('')+
    TL_PEN_W.map(function(w){return '<button type="button" class="fchip'+(TL.pen.w===w[0]?' on':'')+'" data-w="'+w[0]+'">'+w[1]+'</button>';}).join('')+'</div>'+
    '<div class="tlbrow"><button type="button" class="ghostbtn" data-b="undo">'+rqIcon('undo-2',18)+' Назад</button><button type="button" class="ghostbtn" data-b="clear">'+rqIcon('trash-2',18)+' Стереть</button><button type="button" class="cta" data-b="done">Готово</button></div>';
  else if(TL.mode==='stk'){const own=Object.keys(TL_STK_SKIN).filter(tlSkinOwned);
    bar.innerHTML='<div class="tlbrow tlstks">'+TL_STK_REACT.map(function(s){return '<button type="button" class="tlsb'+(TL.stk===s?' on':'')+'" data-s="'+s+'" aria-label="Стикер">'+tlStkHtml(s)+'</button>';}).join('')+
      own.map(function(sk){return TL_STK_SKIN[sk].map(function(i){const s='sk-'+sk+'-'+i;return '<button type="button" class="tlsb'+(TL.stk===s?' on':'')+'" data-s="'+s+'" aria-label="Стикер «'+TL_SKIN_NAME[sk]+'»">'+tlStkHtml(s)+'</button>';}).join('');}).join('')+'</div>'+
      '<div class="tlbrow"><span class="tlbt">Нажмите на страницу — стикер встанет там. Нажмите на стикер — уберётся.</span><button type="button" class="cta" data-b="done">Готово</button></div>';}
  toolsLayerDraw();toolsPinsRender();
}
function tlBarClick(e){const b=e.target.closest('button');if(!b)return;e.stopPropagation();
  if(b.dataset.b==='done'){toolsMode('');return;}
  if(b.dataset.c){TL.pen.c=b.dataset.c;toolsMode('pen');return;}
  if(b.dataset.w){TL.pen.w=+b.dataset.w;toolsMode('pen');return;}
  if(b.dataset.s){TL.stk=b.dataset.s;toolsMode('stk');return;}
  const bid=R.book&&R.book.id,k=tlPageKey(),pg=S.ink[bid]&&S.ink[bid][k];
  if(b.dataset.b==='undo'){if(pg&&pg.length){pg.pop();if(!pg.length)delete S.ink[bid][k];save();toolsLayerDraw();}return;}
  if(b.dataset.b==='clear'){if(!pg||!pg.length)return;rqAsk({t:'Стереть пометки на этой странице?',ok:'Стереть',danger:true}).then(function(v){if(!v)return;delete S.ink[bid][k];if(!Object.keys(S.ink[bid]).length)delete S.ink[bid];save();toolsLayerDraw();});}
}
function tlPt(e){const r=el('tlLayer').getBoundingClientRect();return [Math.max(0,Math.min(1000,Math.round((e.clientX-r.left)/r.width*1000))),Math.max(0,Math.min(1000,Math.round((e.clientY-r.top)/r.height*1000)))];}
function tlDown(e){if(!TL.mode)return;e.preventDefault();e.stopPropagation();try{e.currentTarget.setPointerCapture(e.pointerId);}catch(x){}
  if(TL.mode==='lupa'){tlLens(e.clientX,e.clientY);return;}
  if(TL.mode==='pen'){TL.stroke={c:TL.pen.c,w:TL.pen.w,p:tlPt(e)};toolsLayerDraw();return;}
  if(TL.mode==='stk'){const hit=e.target.closest&&e.target.closest('.tlstk');const bid=R.book.id,k=+tlPageKey();S.stk[bid]=S.stk[bid]||[];
    if(hit){const mine=S.stk[bid].filter(function(x){return x.p===k;})[+hit.dataset.i];S.stk[bid]=S.stk[bid].filter(function(x){return x!==mine;});if(!S.stk[bid].length)delete S.stk[bid];}
    else{if(S.stk[bid].length>=400){flashMsg('В этой книге уже 400 стикеров');return;}const p=tlPt(e);S.stk[bid].push({p:k,s:TL.stk,x:p[0],y:p[1]});}
    save();toolsLayerDraw();}}
function tlMove(e){if(!TL.mode)return;e.preventDefault();
  if(TL.mode==='lupa'&&e.buttons){tlLens(e.clientX,e.clientY);return;}
  if(TL.mode==='pen'&&TL.stroke){const p=tlPt(e),s=TL.stroke.p,lx=s[s.length-2],ly=s[s.length-1];if(Math.abs(p[0]-lx)+Math.abs(p[1]-ly)<4||s.length>=1200)return;s.push(p[0],p[1]);toolsLayerDraw();}}
function tlUp(e){if(!TL.mode)return;
  if(TL.mode==='lupa'){tlLensHide();return;}
  if(TL.mode==='pen'&&TL.stroke){const s=TL.stroke;TL.stroke=null;const bid=R.book.id,k=tlPageKey();S.ink[bid]=S.ink[bid]||{};const pg=(S.ink[bid][k]=S.ink[bid][k]||[]);
    if(pg.length>=80){flashMsg('На странице уже 80 штрихов');toolsLayerDraw();return;}pg.push(s);save();toolsLayerDraw();}}
/* the lens: a PDF page is magnified from its canvas; a text page shows the line under the finger in big letters */
function tlLens(x,y){
  let ln=el('tlLens');if(!ln){ln=document.createElement('div');ln.id='tlLens';ln.setAttribute('aria-hidden','true');document.body.appendChild(ln);}
  const L=el('tlLayer');L.style.pointerEvents='none';let hit=[];try{hit=document.elementsFromPoint(x,y);}finally{L.style.pointerEvents='';}
  const cvs=hit.find(function(n){return n.tagName==='CANVAS'&&n.id!=='tlInk'&&n.width>0;});
  ln.hidden=false;
  if(cvs){ln.className='pdf';const D=160,Z=2.5,b=cvs.getBoundingClientRect(),kx=cvs.width/b.width,ky=cvs.height/b.height;let c=ln.querySelector('canvas');if(!c){ln.innerHTML='<canvas width="320" height="320"></canvas>';c=ln.querySelector('canvas');}
    const g=c.getContext('2d'),sw=D/Z*kx,sh=D/Z*ky;g.fillStyle=getComputedStyle(el('reader')).backgroundColor||'#fff';g.fillRect(0,0,320,320);
    try{g.drawImage(cvs,(x-b.left)*kx-sw/2,(y-b.top)*ky-sh/2,sw,sh,0,0,320,320);}catch(err){}
    ln.style.left=(x-D/2)+'px';ln.style.top=Math.max(4,y-D-40)+'px';return;}
  ln.className='txt';let txt='',at=0;
  try{let node=null,off=0;if(document.caretPositionFromPoint){L.style.pointerEvents='none';const p=document.caretPositionFromPoint(x,y);L.style.pointerEvents='';if(p){node=p.offsetNode;off=p.offset;}}
    else if(document.caretRangeFromPoint){L.style.pointerEvents='none';const r=document.caretRangeFromPoint(x,y);L.style.pointerEvents='';if(r){node=r.startContainer;off=r.startOffset;}}
    if(node&&node.nodeType===3&&el('viewer').contains(node)){const blk=node.parentElement.closest('p,div,li,h1,h2,h3,h4,blockquote,span')||node.parentElement;
      const w=document.createTreeWalker(blk,NodeFilter.SHOW_TEXT);let pos=0,t;while((t=w.nextNode())){if(t===node){at=pos+off;}pos+=t.nodeValue.length;}
      const all=blk.textContent;const a=Math.max(0,at-28),z=Math.min(all.length,at+28);txt=(a>0?'…':'')+all.slice(a,z).replace(/\s+/g,' ')+(z<all.length?'…':'');at=at-a+(a>0?1:0);}}catch(err){}
  ln.innerHTML='<span>'+(txt?esc(txt):'&nbsp;')+'</span>';
  ln.style.left=Math.max(4,Math.min(innerWidth-284,x-140))+'px';ln.style.top=Math.max(4,y-120)+'px';
}
function tlLensHide(){const ln=el('tlLens');if(ln)ln.hidden=true;}

/* ---------- markers: a quote's style (q.hs), drawn on its marks ---------- */
function toolsHlDecorate(){
  if(!R||!R.book)return;const bid=R.book.id,all=S.quotes[bid]||[];
  document.querySelectorAll('#content mark').forEach(function(m){let q=null;try{q=quoteOfMark(bid,m);}catch(e){}const v=q&&q.hs;if(v)m.dataset.hs=v;else delete m.dataset.hs;});
  document.querySelectorAll('.pdfhls i[data-q]').forEach(function(i){const q=all[+i.dataset.q],v=q&&q.hs;if(v)i.dataset.hs=v;else delete i.dataset.hs;});
}
{const a0=addQuote;addQuote=function(){const bid=R&&R.book&&R.book.id,before=bid?(S.quotes[bid]||[]).slice():[];const r=a0.apply(this,arguments);
  try{const T=TS(),st=T.own.markers&&T.sel.hls;if(bid&&st){let ch=false;(S.quotes[bid]||[]).forEach(function(q){if(q&&before.indexOf(q)<0&&!q.hs){q.hs=st;ch=true;}});if(ch){save();toolsHlDecorate();}}}catch(e){}
  return r;};}

/* ---------- lamp: CSS Custom Highlight API, the DOM is not touched ---------- */
async function toolsLamp(){
  const on=!!(TS().on.lamp&&toolOwns('lamp')&&R&&R.book&&window.CSS&&CSS.highlights&&typeof Highlight==='function');
  if(!on){try{CSS.highlights.delete('rq-lamp-n');CSS.highlights.delete('rq-lamp-w');}catch(e){}return;}
  const b=R.book,key=b.id+'|'+(b.type==='pdf'?'':Math.round(r2Off(b)/20000));
  if(TL.lamp.key!==key){TL.lamp.key=key;let names=[];try{if(b.type!=='pdf'){const t=await r2Text(b);names=r2Names(t.slice(0,Math.min(t.length,r2Off(b)+1500)));}}catch(e){}TL.lamp.names=names;}
  const words=(S.vocab||[]).map(function(v){return v&&String(v.w||'').trim();}).filter(function(w){return w&&w.length>=3&&w.length<=40;}).slice(-200);
  const re=function(L){if(!L.length)return null;return new RegExp('(?<![\\p{L}])('+L.map(function(w){const s=w.length>5?w.slice(0,w.length-2):w;return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).sort(function(a,c){return c.length-a.length;}).join('|')+')\\p{L}{0,3}(?![\\p{L}])','giu');};
  const rN=re(TL.lamp.names),rW=re(words),hn=new Highlight(),hw=new Highlight();let n=0;
  const roots=R.mode==='pdf'?[...document.querySelectorAll('#pdfText, #pdfScroll .textLayer')]:[el('content')];
  roots.forEach(function(root){if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let t;
    while((t=w.nextNode())&&n<6000){const s=t.nodeValue;if(!s||s.length<3)continue;[[rN,hn],[rW,hw]].forEach(function(p){if(!p[0])return;p[0].lastIndex=0;let m;
      while((m=p[0].exec(s))&&n<6000){const rg=new Range();rg.setStart(t,m.index);rg.setEnd(t,m.index+m[0].length);p[1].add(rg);n++;}});}});
  try{CSS.highlights.set('rq-lamp-n',hn);CSS.highlights.set('rq-lamp-w',hw);}catch(e){}
}

/* ---------- compass ---------- */
function toolsCompass(){
  const b=R.book;if(!b)return;const N=Math.max(1,R.pageCount),cur=R.page|0,readTo=typeof rqGridReadTo==='function'?rqGridReadTo():cur;
  let chs=[];try{chs=rqGridChapters(b);}catch(e){}
  if(!chs.length){const step=Math.max(1,Math.ceil(N/10));for(let p=0,i=1;p<N;p+=step,i++)chs.push({p:p,t:'Часть '+i});}
  const qp={},mp={},ip={};(S.quotes[b.id]||[]).forEach(function(q){let p=-1;try{p=quotePage(b,q);}catch(e){}if(p>=0)qp[p]=(qp[p]||0)+1;});
  (S.marks[b.id]||[]).forEach(function(m){if(m&&m.page>0)mp[m.page-1]=(mp[m.page-1]||0)+1;});
  Object.keys((S.ink||{})[b.id]||{}).forEach(function(k){ip[+k-1]=1;});(S.stk[b.id]||[]).forEach(function(x){ip[x.p-1]=1;});
  const sum=function(o,a,z){let n=0;Object.keys(o).forEach(function(k){if(+k>=a&&+k<z)n+=o[k];});return n;};
  const lab=function(p){return typeof tocPgLabel==='function'?tocPgLabel(p):String(p+1);};
  const pct=Math.round(Math.min(1,(readTo+1)/N)*100);
  const rows=chs.map(function(c,i){const a=c.p,z=i+1<chs.length?chs[i+1].p:N,here=cur>=a&&cur<z,st=here?'here':readTo>=z-1?'read':a>readTo?'ahead':'part';
    const q=sum(qp,a,z),m=sum(mp,a,z),k=sum(ip,a,z);
    return '<button type="button" class="tlch '+st+'" data-p="'+a+'"><i class="tldot" aria-hidden="true"></i><span class="tlcht"><b>'+esc(c.t)+'</b><small>стр. '+lab(a)+(here?' · вы здесь, стр. '+lab(cur):'')+'</small></span>'+
      '<span class="tlchn">'+(q?'<span title="Цитаты">'+rqIcon('quote',14)+q+'</span>':'')+(m?'<span title="Закладки">'+rqIcon('bookmark',14)+m+'</span>':'')+(k?'<span title="Пометки">'+rqIcon('pen-tool',14)+k+'</span>':'')+'</span></button>';}).join('');
  const d=qSheet('<h3>'+rqIcon('compass',22)+' '+esc(toolName('compass'))+'</h3><p>«'+esc(b.title)+'» · прочитано '+pct+'% · стр. '+lab(cur)+' из '+lab(N-1)+'</p>'+
    '<div class="tlbar"><i style="width:'+pct+'%"></i><b style="left:'+Math.round(cur/Math.max(1,N-1)*100)+'%"></b></div>'+
    '<div class="tlheroes" id="tlHeroes"></div><div class="tlchs">'+rows+'</div>',toolName('compass'));
  d.querySelector('.tlchs').onclick=function(e){const x=e.target.closest('[data-p]');if(!x)return;qSheetClose();TL.bagOpen=false;jumpTo(+x.dataset.p);};
  if(b.type!=='pdf'&&typeof r2Names==='function')r2Text(b).then(function(t){const box=el('tlHeroes');if(!box||!d.contains(box))return;const L=r2Names(t.slice(0,Math.min(t.length,r2Off(b)+1500))).slice(0,14);
    if(!L.length)return;box.innerHTML='<div class="tlsh">Встречались в прочитанном</div><div class="tlchips">'+L.map(function(n){return '<button type="button" class="fchip" data-who="'+esc(n)+'">'+esc(n)+'</button>';}).join('')+'</div>';
    box.onclick=function(e){const x=e.target.closest('[data-who]');if(!x)return;qSheetClose();if(typeof r2Who==='function')r2Who(x.dataset.who,b);};}).catch(function(){});
}

/* ---------- quote card templates ---------- */
{const c0=qCardBlob;qCardBlob=async function(b,q,pg){const T=TS(),t=T.own.qtpl&&T.sel.qtpl;if(!t)return c0.apply(this,arguments);return toolsCardBlob(b,q,pg,t);};}
{const o0=qCardOpen;qCardOpen=function(bid,i){const r=o0.apply(this,arguments);try{
  const T=TS(),d=el('qSheet');if(T.own.qtpl&&d&&!d.hidden&&d.querySelector('.qcprev')&&!d.querySelector('.tlqt')){const w=document.createElement('div');w.className='tlqt';w.innerHTML=tlChips('qtpl',TL_QTPL,T.sel.qtpl);
    d.querySelector('.qcprev').before(w);w.onclick=function(e){const x=e.target.closest('[data-v]');if(!x)return;T.sel.qtpl=x.dataset.v;if(!T.sel.qtpl)delete T.sel.qtpl;save();qCardOpen(bid,i);};}}catch(e){}return r;};}
async function toolsCardBlob(b,q,pg,tpl){
  const W=1080,H=1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
  const cs=getComputedStyle(document.documentElement),v=function(n){return cs.getPropertyValue(n).trim();},acc=v('--accent')||'#2bb3c0';
  try{await document.fonts.ready;}catch(e){}
  const serif=(FONTS[SET.font]||FONTS[0]).v,sans=getComputedStyle(document.body).fontFamily||'system-ui,sans-serif';
  const P={mini:{bg:'#fbfaf7',tx:'#1f1f1f',mu:'#777',ac:acc},polaroid:{bg:'#e9e6df',tx:'#2a2a2a',mu:'#6d6a63',ac:'#2a2a2a'},night:{bg:'#0f1630',tx:'#eef1ff',mu:'#a9b2d6',ac:'#f2c94c'},paper:{bg:'#f1ead8',tx:'#191714',mu:'#5d564a',ac:'#191714'}}[tpl]||{bg:'#fff',tx:'#222',mu:'#777',ac:acc};
  c.fillStyle=P.bg;c.fillRect(0,0,W,H);let left=120,width=W-240,top=300,room=H-top-420;
  if(tpl==='night'){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b1029');g.addColorStop(1,'#283a74');c.fillStyle=g;c.fillRect(0,0,W,H);
    const r=qcRand(String(q.text).length+3);for(let k=0;k<90;k++){c.globalAlpha=.3+r()*.7;c.fillStyle='#fff';const s=r()*2.6+.6;c.beginPath();c.arc(r()*W,r()*H*.9,s,0,7);c.fill();}c.globalAlpha=1;}
  if(tpl==='polaroid'){c.save();c.shadowColor='rgba(0,0,0,.25)';c.shadowBlur=40;c.shadowOffsetY=12;c.fillStyle='#fff';c.fillRect(110,120,W-220,H-240);c.restore();
    c.fillStyle='#f3efe6';c.fillRect(150,160,W-300,H-520);left=200;width=W-400;top=230;room=H-760;}
  if(tpl==='paper'){c.fillStyle=P.tx;c.font='900 64px '+serif;c.textAlign='center';c.fillText('ЧИТАТЕЛЬСКИЙ ВЕСТНИК',W/2,150);c.textAlign='left';
    c.fillRect(80,180,W-160,6);c.fillRect(80,194,W-160,2);c.font='26px '+sans;c.fillStyle=P.mu;c.fillText(today().split('-').reverse().join('.'),80,236);c.textAlign='right';c.fillText('Цитата номера',W-80,236);c.textAlign='left';
    c.fillStyle=P.tx;c.fillRect(80,H-200,W-160,2);left=110;width=W-220;top=310;}
  if(tpl==='mini'){c.fillStyle=P.ac;c.fillRect(left,top-60,90,6);}
  let t=String(q.text).replace(/[ \t]+/g,' ').trim();if(t.length>700)t=t.slice(0,700).replace(/\s+\S*$/,'')+'…';
  let fs=tpl==='mini'?84:76,lines=[];const fnt=function(s){return (tpl==='paper'?'italic ':'')+s+'px '+serif;};
  for(;fs>=30;fs-=2){c.font=fnt(fs);lines=qcWrap(c,t,width);if(lines.length*fs*1.36<=room)break;}
  if(lines.length*fs*1.36>room){const mx=Math.max(1,Math.floor(room/(fs*1.36)));lines=lines.slice(0,mx);lines[mx-1]=lines[mx-1].replace(/\s*\S*$/,'')+'…';}
  const lh=fs*1.36;let y=top+Math.max(0,(room-lines.length*lh)/2)+fs;
  if(tpl==='paper'){c.fillStyle=P.tx;c.font='900 '+Math.round(fs*2.2)+'px '+serif;c.fillText('“',left-20,y-fs*.8);}
  c.fillStyle=P.tx;c.font=fnt(fs);c.textAlign=tpl==='night'||tpl==='polaroid'?'center':'left';const x0=c.textAlign==='center'?W/2:left;
  lines.forEach(function(l){c.fillText(l,x0,y);y+=lh;});
  y=tpl==='polaroid'?H-300:Math.max(y+40,H-290);
  if(tpl==='night'){c.fillStyle=P.ac;c.beginPath();c.arc(W/2,y-30,6,0,7);c.fill();}
  c.fillStyle=P.tx;c.font=(tpl==='polaroid'?'italic 44px ':'700 40px ')+(tpl==='polaroid'?serif:sans);qcWrap(c,b.title,width).slice(0,2).forEach(function(l){y+=50;c.fillText(l,x0,y);});
  c.fillStyle=P.mu;c.font='32px '+sans;const sub=[bookAuthor(b),pg].filter(Boolean).join(' · ');if(sub){y+=46;c.fillText(qcWrap(c,sub,width)[0],x0,y);}
  c.globalAlpha=.7;c.font='26px '+sans;c.fillText('ReadQuest',x0,H-(tpl==='polaroid'?150:100));c.globalAlpha=1;c.textAlign='left';
  return new Promise(function(res){cv.toBlob(res,'image/png');});
}

/* ---------- words notebook: the quiz card in the skin's notebook look ---------- */
{const d0=dkQuizShow;dkQuizShow=function(){const r=d0.apply(this,arguments);try{const n=el('rmNote');if(n)n.classList.toggle('tlwb',!!(r&&toolOwns('words')));}catch(e){}return r;};}

/* ---------- apply looks + wiring ---------- */
function toolsApply(){
  const T=TS(),h=document.documentElement;
  if(T.own.rulers&&T.sel.ruler)h.dataset.rs=T.sel.ruler;else delete h.dataset.rs;
  if(T.own.words)h.dataset.tlwords='1';else delete h.dataset.tlwords;
  toolsHgChip();toolsLayerDraw();toolsHlDecorate();toolsLamp();
  const bl=el('btnBagL');if(bl)bl.textContent=toolName('bagShort');
}
(function(){
  const bag=el('btnBag');if(bag)bag.onclick=function(e){e.stopPropagation();toolsBagOpen();};
  const pins=el('toolPins');if(pins)pins.onclick=function(e){const b=e.target.closest('[data-tool]');if(!b)return;e.stopPropagation();toolsGo(b.dataset.tool);};
  let raf=0;const later=function(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;try{toolsLayerDraw();toolsHlDecorate();}catch(e){}});};
  let lt=0;const lampLater=function(){clearTimeout(lt);lt=setTimeout(function(){try{toolsLamp();}catch(e){}},400);};
  if(el('pgNum'))new MutationObserver(function(){later();setTimeout(later,300);lampLater();toolsHgChip();}).observe(el('pgNum'),{childList:true,characterData:true,subtree:true});
  if(el('viewer'))new MutationObserver(function(ms){if(ms.some(function(m){return !(m.target&&m.target.closest&&m.target.closest('#tlLayer'));})){later();if(TS().on.lamp)lampLater();}}).observe(el('viewer'),{childList:true,subtree:true});
  const rd=el('reader');if(rd)new MutationObserver(function(){if(rd.classList.contains('hidden')){if(TL.mode)toolsMode('');TL.lamp.key='';TL.hgSnap=null;}later();lampLater();toolsPinsRender();}).observe(rd,{attributes:true,attributeFilter:['class']});
  addEventListener('resize',later);
  new MutationObserver(function(){try{toolsApply();toolsPinsRender();}catch(e){}}).observe(document.documentElement,{attributes:true,attributeFilter:['data-skin']});
  addEventListener('keydown',function(e){if(e.key==='Escape'&&TL.mode){e.preventDefault();toolsMode('');}},true);
  const go=function(){try{toolsApply();toolsPinsRender();toolsProfRender();}catch(e){}};
  if(window.__rqReady)go();else{let n=0;const iv=setInterval(function(){if(window.__rqReady||++n>40){clearInterval(iv);go();}},250);}
})();
