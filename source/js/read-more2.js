'use strict';
/* ===== «Ещё идеи для чтения» (05.11, Джессика: «давай реализуем все»). Data: SET.rm (dlg, hard, chEnd, chQ, rsvp, oneh, edge, roles) — arch.md 05.11.
   1 «Кто это?» (меню выделения → «Действия», карточка книги «Герои книги») · 2 трудные слова (словарь старинных слов ниже, без ИИ) ·
   3 итог главы в дневник · 4 вопрос после главы · 5 подсветка диалогов (CSS Highlight API, DOM не трогаем) · 6 «слово за словом» ·
   7 подбор оформления за минуту · 8 одной рукой · 9 листание по краю (= ползунок страниц) · 10 голоса по ролям · 11 «слушать на ходу» ·
   12 поделиться набором (код RQSET:) · 13 «как было» у образца в «Настройках чтения».
   Loaded AFTER js/sel-tools.js (wraps stMenu / ST_ACT) and js/read-more.js. No coins, no XP: «слово за словом» returns to the page with jumpTo (honest reading). */
const R2_WORDS=`аршин*|мера длины, около 71 см
вершок,вершка,вершков,вершком|мера длины, около 4,4 см
сажень,сажени,саженей,саженях,саженью|мера длины, около 2,13 м
верста,версты,версту,верст,верстой,верстах,верстами|мера расстояния, около 1,07 км
пуд,пуда,пудов,пудом,пуду|мера веса, около 16 кг
золотник*|мелкая мера веса, около 4,3 г
штоф*|бутыль водки, около 1,2 л
полушк*|мелкая монета, четверть копейки
алтын*|старая монета, три копейки
гривенник*|монета в десять копеек
двугривенн*|монета в двадцать копеек
пятиалтынн*|монета в пятнадцать копеек
целков*|рубль, особенно серебряный
ассигнаци*|бумажные деньги в России до 1849 года
червонц*|золотая монета; позже десять рублей
империал*|золотая монета в 10 или 15 рублей
кафтан*|длинная мужская верхняя одежда
армяк*|крестьянский кафтан из грубого сукна
зипун*|крестьянский кафтан без воротника
кушак*|широкий пояс из ткани
картуз*|мужская фуражка с козырьком
сюртук*|длинный двубортный мужской пиджак
шинел*|форменное пальто военных и чиновников
салоп*|старинное женское пальто-накидка
лорнет*|очки на ручке, которые держат у глаз
бричк*|лёгкая повозка, часто с откидным верхом
дрожк*|лёгкий открытый экипаж
тарантас*|дорожная повозка на длинных дрогах
кибитк*|крытая повозка
ямщик*|кучер почтовой повозки
извозчик*|человек, который возил седоков за плату
кучер*|человек, который правит лошадьми
форейтор*|верховой, едет на передней лошади упряжки
облучок,облучке,облучка|сиденье кучера в повозке
околоточн*|полицейский, отвечал за участок города
околот*|полицейский участок города
городов*|полицейский низшего чина
урядник*|полицейский чин в уезде
исправник*|начальник уездной полиции
становой,станового,становому|полицейский начальник в уезде (стан)
надзирател*|полицейский чиновник, смотрел за порядком
квартальн*|полицейский надзиратель квартала
будочник*|городовой, стоял в будке на улице
помещик*|владелец земли и поместья
барин*|господин, помещик
барын*|госпожа, жена барина
барчук*|сын барина
приказчик*|управляющий у помещика; продавец у купца
лакей*|слуга в барском доме
челяд*|домашние слуги
оброк*|плата крестьянина помещику деньгами или продуктами
барщин*|бесплатная работа крестьянина на помещика
десятин*|мера земли, около 1,1 гектара
горниц*|чистая, парадная комната в избе
сенях,сени,сеней,сенях|прихожая в деревенском доме
светлиц*|светлая комната в верхней части дома
полат*|широкая полка для сна у печи
ухват*|рогатина, чтобы ставить горшки в печь
кринк*|глиняный кувшин для молока
кадк*|деревянная бочка
лучин*|тонкая щепка, ею освещали избу
сермяг*|грубое некрашеное сукно; кафтан из него
лапт*|плетёная обувь из лыка
онуч*|обмотка для ноги под лаптем
кокошник*|старинный женский головной убор
сарафан*|длинное платье без рукавов
душегре*|тёплая короткая кофта без рукавов
коробейник*|бродячий торговец мелким товаром
целовальник*|продавец в кабаке
кабак*|питейное заведение
трактир*|недорогой ресторан с гостиницей
стряпух*|кухарка
приживал*|человек, живёт в чужом доме из милости
мещан*|сословие небогатых горожан
разночин*|образованный человек не из дворян
однодворц*|мелкий землевладелец из бывших служилых людей
титулярн*|гражданский чин 9-го класса
коллежск*|относится к гражданскому чину (асессор, советник)
статск*|относится к гражданскому чину (статский советник)
столоначальник*|начальник отделения в канцелярии
канцеляри*|отдел для ведения дел и бумаг
ассессор*,асессор*|чиновник, член суда или палаты
губерни*|область в старой России
уезд*|часть губернии, район
волост*|часть уезда, несколько деревень
острог*|тюрьма
кандал*|цепи на ногах заключённого
каторг*|тяжёлые работы для осуждённых
рекрут*|новобранец, взятый в армию
унтер*|младший командир в армии
вахмистр*|старший унтер-офицер в кавалерии
корнет*|младший офицер кавалерии
есаул*|казачий офицер
гусар*|лёгкая кавалерия в нарядной форме
улан*|лёгкая кавалерия с пиками
кирасир*|тяжёлая кавалерия в латах
ментик*|короткая куртка гусара с мехом
эполет*|наплечный знак офицера
ташка,ташку,ташкой|сумка гусара на поясе
ботфорт*|высокие сапоги с раструбом
треуголк*|шляпа с тремя углами
кивер*|высокий военный головной убор
пищаль,пищали,пищалью|старинное ружьё
бердыш*|топор на длинном древке
кистен*|гирька на ремне, оружие
кольчуг*|доспех из колец
шишак*|старинный шлем
гридниц*|палата князя для дружины
терем*|высокий дом знати
вотчин*|наследственное имение
боярин*,бояр*|знатный человек в Древней Руси
дьяк,дьяка,дьяку,дьяком,дьяки|чиновник, ведал делами
подьяч*|помощник дьяка, писарь
стрелец*,стрельц*|солдат стрелецкого войска
опричник*|служил в войске Ивана Грозного
холоп*|зависимый человек, слуга
смерд*|крестьянин в Древней Руси
тиун*|управляющий у князя или боярина
вече,веча,вечу|народное собрание
перст,перста,персты,перстом,перстами,перстов|палец
длан*|ладонь
ланит*|щёки
очи,очей,очами,очам|глаза
уста,устами,устах|губы, рот
рамен*|плечи
десниц*|правая рука
шуйц*|левая рука
выя,выю|шея
глас,гласа,гласом|голос
злато,злата,златом|золото
брег,брега,брегу|берег
древо,древа,древом|дерево (старинное)
врата,вратами|ворота
персты,перстами,перстов|пальцы
лобзань*|поцелуй
отрок*|подросток, юноша
отроковиц*|девочка-подросток
вотще|напрасно
доколе|до каких пор
дабы|чтобы
паки|снова
токмо|только
аки|как, словно
внемл*|слушать, прислушиваться
зрит,зреть,зрю,зрим|видит, смотрит
мнит,мнить,мню|думает, считает
давеча|недавно, только что
намедни|на днях
надысь|недавно
давешн*|недавний
покамест|пока
ужо|потом; а ещё угроза: «вот я тебе!»
эвон|вон там
кручин*|печаль
чело,челом,челе|лоб
поприщ*|здесь: мера пути или поле деятельности
стезя,стези,стезю|путь, дорога
бразд*|борозда; «бразды правления» = власть
вексел*|долговая расписка
закладн*|залог, бумага о залоге
процентщиц*|та, кто даёт деньги в долг под проценты
приданое,приданого,приданым|имущество невесты при свадьбе
сватовств*|просьба о браке через сватов
гувернёр*,гувернер*|домашний воспитатель
гувернантк*|домашняя воспитательница
бонн*|няня-иностранка для детей
камердинер*|личный слуга барина
дворецк*|старший слуга в доме
мажордом*|управляющий домом
камергер*|придворное звание
фрейлин*|придворная дама
флигел*|боковая пристройка к дому
антресол*|верхний полуэтаж
мезонин*|надстройка над серединой дома
бельэтаж*|второй, парадный этаж
бельведер*|башенка с видом на окрестности
будуар*|комната хозяйки дома
кабриолет*|лёгкая двуколка
ландо|четырёхместная карета с откидным верхом
фаэтон*|лёгкий открытый экипаж
ридикюл*|женская сумочка
кринолин*|пышная юбка на каркасе
турнюр*|подушечка сзади под юбкой
манишк*|накрахмаленная грудь рубашки
жабо|кружевная оборка на груди
фуляр*|лёгкий шёлковый платок
шандал*|подсвечник
кенкет*|настенная масляная лампа
кивот*,киот*|полка или шкафчик для икон
лампадк*,лампад*|маленький светильник перед иконой
просвир*|маленький церковный хлебец
заутрен*|утренняя церковная служба
обедн*|утренняя служба, литургия
всенощн*|вечерняя служба
пономар*|церковный служитель
дьячок*,дьячк*|младший церковный служитель
скит,скита,скиту,скиты,скитах|уединённое жилище монахов
схимник*|монах строгого обета
юродив*|человек, нарочно живший как безумный ради веры`;

const R2={cb:'',ci:-1,cp:-1,vo:null,pos:-1,offT:0,offP:-1,offAt:0,cs:null,cps:50,cmp:null};
const R2_AI={};
const R2_ONEH=['night','bars','mark','prev','next','next','prev','next','next']; /* 8: one hand — the whole lower part turns pages */

/* ---------- common ---------- */
function r2Rm(){return rqRm();}
/** book text offset of the current place (text: the first character of the page; PDF / closed: the saved position) */
function r2Off(b){b=b||(rmOpen()&&R.book);if(!b||!b.text)return 0;
  if(rmOpen()&&R.book.id===b.id&&R.mode==='text'){try{const a=readingAnchor();if(a&&a.node){const T=rmNodes(),o=rmOffOf(T,a.node,a.offset);if(o>=0)return Math.floor(o/Math.max(1,T.len)*b.text.length);}}catch(e){}
    return Math.floor((R.pageCount>1?R.page/(R.pageCount-1):0)*b.text.length);}
  return Math.floor(rqPos(b.id)*b.text.length);}
async function r2Text(b){if(!b.text&&typeof __rq!=='undefined'&&__rq&&__rq.idb){try{const t=await __rq.idb.getText(b.id);if(typeof t==='string')b.text=t;}catch(e){}}return b.text||'';}
function r2Ai(title,icon){const h=document.querySelector('#aiSheet > h3');if(!h)return;if(!h.dataset.rm0)h.dataset.rm0=h.innerHTML;h.innerHTML=rqIcon(icon,18)+' '+esc(title);}
/** the AI sheet with own title: o = {title, icon, q, wait, key, sys, user, max, render(out) → html, after(out)} */
async function r2Ask(o){
  if(!aiOn()){aiNoKey();return;}
  const box=el('aiBody');aiCur=null;aiSeq++;const my=aiSeq;r2Ai(o.title,o.icon);
  const draw=function(h){box.innerHTML=(o.q?'<div class="ai-q">'+esc(o.q)+'</div>':'')+h;};
  el('aiSheet').classList.remove('hidden');
  if(navigator.onLine===false){draw('<div class="ai-a" role="alert">Нужен интернет. Включите сеть и попробуйте ещё раз.</div>');return;}
  let out=R2_AI[o.key]||'',err='';
  if(!out){draw('<div class="ai-a ai-wait" role="status">'+esc(o.wait||'Думаю…')+'</div>');
    try{out=await aiViaKey({system:o.sys,user:o.user},o.max||600);if(out)R2_AI[o.key]=out;}catch(e){err=e&&e.message||'ошибка';}}
  if(my!==aiSeq||el('aiSheet').classList.contains('hidden'))return;
  if(!out){draw('<div class="ai-a" role="alert">Не получилось: '+esc(err||'пустой ответ')+'.</div><button class="ghostbtn" id="r2Again">'+rqIcon('rotate-cw',16)+' Ещё раз</button>');
    el('r2Again').onclick=function(){delete R2_AI[o.key];r2Ask(o);};return;}
  draw(o.render?o.render(out):'<div class="ai-a">'+esc(out).replace(/\n+/g,'<br>')+'</div><div class="ai-note">Ответ ИИ, может ошибаться</div>');
  if(o.after)o.after(out);
}
function r2Note(icon,title,html,x,y){
  const d=el('rmNote');if(!d)return;
  d.innerHTML='<div class="rmnh">'+rqIcon(icon,16)+'<b>'+esc(title)+'</b><button type="button" class="closes" id="rmNoteX" aria-label="Закрыть">'+rqIcon('x',20)+'</button></div><div class="rmnb">'+html+'</div>';
  d.hidden=false;const H=innerHeight,h=d.offsetHeight;d.style.top=(y>H*0.55?Math.max(8,y-h-18):Math.min(H-h-8,y+22))+'px';
  el('rmNoteX').onclick=function(e){e.stopPropagation();rmFnHide();};
}
/** a small card on top of the page (chapter end); goes away by itself.
 *  08.11 (Джессика: подруге «вылезает и мешает, крестик не нажимается»): закрывается и по pointerup (не только click),
 *  тапом по самой карточке и смахиванием вверх; уходит при следующем перелистывании; по умолчанию 7 с. */
function r2Offer(html,ms){
  const d=el('r2Offer');if(!d)return null;clearTimeout(R2.offT);d.innerHTML=html;
  const hd=el('reader').querySelector('.rhead'),bo=el('reader').classList.contains('barsoff');
  d.style.top=((!bo&&hd&&!r2Rm().oneh?hd.getBoundingClientRect().bottom:8)+8)+'px';d.style.transform='';d.hidden=false;R2.offP=R.page;
  R2.offT=setTimeout(r2OfferHide,ms||7000);
  if(!d.dataset.w){d.dataset.w='1';let y0=null;
    d.addEventListener('pointerdown',function(e){y0=e.clientY;clearTimeout(R2.offT);},{passive:true});
    d.addEventListener('pointermove',function(e){if(y0!==null&&e.clientY<y0)d.style.transform='translateY('+(e.clientY-y0)+'px)';},{passive:true});
    d.addEventListener('pointerup',function(e){const dy=y0===null?0:e.clientY-y0;y0=null;d.style.transform='';
      const b=e.target&&e.target.closest&&e.target.closest('button');
      if(dy<-24||!b||b.classList.contains('closes')){e.stopPropagation();r2OfferHide();return;}
      R2.offT=setTimeout(r2OfferHide,7000);});
    d.addEventListener('pointercancel',function(){y0=null;d.style.transform='';R2.offT=setTimeout(r2OfferHide,7000);},{passive:true});}
  return d;}
function r2OfferHide(){const d=el('r2Offer');if(d){d.hidden=true;d.style.transform='';}clearTimeout(R2.offT);}

/* ---------- 5: dialogues ---------- */
/** the spoken parts of one paragraph: [[from, to], …]. «— Реплика, — сказал он. — Ещё реплика»; «…» after a colon or at the start; “…” and "…" */
function r2DlgSpans(s){
  const out=[],m=/^(\s*)([—–]|-(?=\s))\s*/.exec(s);
  if(m){let i=m[0].length,sp=true;const re=/\s[—–]\s/g;re.lastIndex=i;let x;
    while((x=re.exec(s))){if(sp)out.push([i,x.index]);i=x.index+x[0].length;sp=!sp;}
    if(sp)out.push([i,s.length]);return out.filter(function(r){return /\p{L}/u.test(s.slice(r[0],r[1]));});}
  const q=/(?:^|:)\s*«([^»]{2,})»|“([^”]{2,})”|(?<![\p{L}\d])"([^"]{2,})"/gu;let x;
  while((x=q.exec(s))){const body=x[1]||x[2]||x[3],st=x.index+x[0].lastIndexOf(body);out.push([st,st+body.length]);}
  return out;
}
function r2Hl(){return !!(window.CSS&&CSS.highlights&&window.Highlight);}
function r2DlgApply(){
  if(!r2Hl())return;try{CSS.highlights.delete('rm-dlg');}catch(e){}
  if(!r2Rm().dlg||!rmText())return;
  const c=el('content'),hl=new Highlight();
  c.querySelectorAll('p').forEach(function(p){if(p.matches('.meta,.rq-h,.rq-img,.rq-bitr'))return;const s=p.textContent;if(!/[—–"“«-]/.test(s))return;
    const sp=r2DlgSpans(s);if(!sp.length)return;const T=rmNodes(p);
    sp.forEach(function(r){const a=rmAt(T,r[0]),z=rmAt(T,r[1]);if(!a||!z)return;try{const rg=document.createRange();rg.setStart(a.node,a.offset);rg.setEnd(z.node,z.offset);hl.add(rg);}catch(e){}});});
  try{CSS.highlights.set('rm-dlg',hl);}catch(e){}r2DlgColor();
}
/* the colour: the page text pulled towards the skin's accent (readable on light and dark pages) */
function r2DlgColor(){const c=el('content'),r=el('reader');if(!c||!r)return;
  const tx=getComputedStyle(c).color,ac=getComputedStyle(document.documentElement).getPropertyValue('--rq-accent').trim()||'#2f7fb8';
  r.style.setProperty('--rm-dlg','color-mix(in srgb,'+ac+' 58%,'+tx+')');r.style.setProperty('--rm-hard','color-mix(in srgb,'+ac+' 70%,'+tx+')');}

/* ---------- 2: hard words (old and rare words of the classics: a short meaning on a tap, no AI) ---------- */
const R2_HW=(function(){const ex=new Map(),st=new Map();
  R2_WORDS.split('\n').forEach(function(l){const i=l.indexOf('|');if(i<0)return;const m=l.slice(i+1).trim();
    l.slice(0,i).split(',').forEach(function(k){k=k.trim().toLowerCase().replace(/ё/g,'е');if(!k)return;if(k.slice(-1)==='*')st.set(k.slice(0,-1),m);else ex.set(k,m);});});
  return {ex:ex,st:st};})();
function r2Hard(w){w=String(w||'').toLowerCase().replace(/ё/g,'е').replace(/[́]/g,'');if(w.length<3)return null;const e=R2_HW.ex.get(w);if(e)return e;
  for(let k=w.length;k>=Math.max(4,w.length-3);k--){const m=R2_HW.st.get(w.slice(0,k));if(m)return m;}return null;}
function r2HardApply(){
  if(!r2Hl())return;try{CSS.highlights.delete('rm-hard');}catch(e){}
  if(!r2Rm().hard||!rmText())return;
  const T=rmNodes(),all=T.a.map(function(x){return x.n.nodeValue;}).join(''),hl=new Highlight(),re=/[а-яё́]+/giu;let m,n=0;
  while((m=re.exec(all))&&n<4000){if(m[0].length<3||!r2Hard(m[0]))continue;const a=rmAt(T,m.index),z=rmAt(T,m.index+m[0].length);if(!a||!z)continue;
    const p=a.node.parentNode;if(p&&p.closest&&p.closest('.meta,.rq-h,h3'))continue;
    try{const rg=document.createRange();rg.setStart(a.node,a.offset);rg.setEnd(z.node,z.offset);hl.add(rg);n++;}catch(e){}}
  try{CSS.highlights.set('rm-hard',hl);}catch(e){}r2DlgColor();
}
/** the word under a finger in the book text: {w, x, y} */
function r2WordAt(cx,cy){
  const r=document.caretRangeFromPoint&&document.caretRangeFromPoint(cx,cy);if(!r)return null;const n=r.startContainer;
  if(!n||n.nodeType!==3||!el('content').contains(n))return null;const p=n.parentNode&&n.parentNode.closest('p,li,blockquote,div');if(!p||p.closest('.meta,.rq-h'))return null;
  const T=rmNodes(p),o=rmOffOf(T,n,r.startOffset),s=p.textContent;if(o<0)return null;
  let a=o,z=o;const L=/[\p{L}́-]/u;while(a>0&&L.test(s[a-1]))a--;while(z<s.length&&L.test(s[z]))z++;
  if(z<=a)return null;
  /* the finger is really on the word, not beside it */
  const A=rmAt(T,a),Z=rmAt(T,z);try{const rg=document.createRange();rg.setStart(A.node,A.offset);rg.setEnd(Z.node,Z.offset);
    if(![...rg.getClientRects()].some(function(q){return cx>=q.left-4&&cx<=q.right+4&&cy>=q.top-4&&cy<=q.bottom+4;}))return null;}catch(e){return null;}
  return {w:s.slice(a,z).replace(/^-+|-+$/g,'')};
}

/* ---------- 1: «Кто это?» ---------- */
function r2Esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
/** pieces of the read text around a name (first 4 + last 8 meetings), never past `until` */
function r2Snips(t,name,until){
  const w=name.split(/\s+/).filter(Boolean),last=w[w.length-1]||name,stem=last.length>4?last.replace(/[аяоеыиуюьй]+$/i,''):last;
  const re=new RegExp('(?<![\\p{L}])'+r2Esc(stem.length>=3?stem:last),'giu'),src=t.slice(0,until),at=[];let m;
  while((m=re.exec(src))&&at.length<400)at.push(m.index);
  const pick=at.length<=12?at:at.slice(0,4).concat(at.slice(-8));
  return pick.map(function(i){return src.slice(Math.max(0,i-170),i+220).replace(/\s+/g,' ').trim();});
}
async function r2Who(name,b){
  name=String(name||'').replace(/[«»"“”.,!?:;()\[\]]+/g,' ').replace(/\s+/g,' ').trim().slice(0,60);b=b||(rmOpen()&&R.book);if(!name||!b)return;
  if(!aiOn()){aiNoKey();return;}
  const t=await r2Text(b),at=r2Off(b);let ctx=[];
  if(t&&b.type!=='pdf')ctx=r2Snips(t,name,Math.min(t.length,at+1500));else{const x=await rmRecapText(b);if(x)ctx=[x.slice(-6000)];}
  r2Ask({title:'Кто это?',icon:'user-round',q:'«'+name+'»',wait:'Вспоминаю, где это встречалось…',key:'who|'+b.id+'|'+name.toLowerCase()+'|'+Math.round(at/3000),max:500,
    sys:'Ты помощник в приложении для чтения. Человек спрашивает, кто это (персонаж, место, предмет) в книге, которую читает. Отвечай по-русски, 2–4 предложения: кто это, кем приходится другим героям, чем запомнился. '+
      'Строго без спойлеров: опирайся только на отрывки, они взяты из уже прочитанного. Ничего о том, что будет дальше. Если по отрывкам не понять, так и скажи. Без вступлений.',
    user:'Книга: «'+b.title+'»'+(bookAuthor(b)?', '+bookAuthor(b):'')+'\nКто это: '+name+'\nОтрывки из прочитанного, где это встречается:\n'+(ctx.length?ctx.map(function(x,i){return (i+1)+') '+x;}).join('\n'):'(не нашлось)'),
    render:function(out){return '<div class="ai-a">'+esc(out).replace(/\n+/g,'<br>')+'</div><div class="ai-note">Ответ ИИ по прочитанному, может ошибаться</div><button class="ghostbtn" id="r2Heroes">'+rqIcon('users',16)+' Все герои до этого места</button>';},
    after:function(){el('r2Heroes').onclick=function(){r2Heroes(b);};}});
}
/** names in the read part: capitalised words not at a sentence start, seldom written small */
function r2Names(t){
  const cnt=new Map(),low=new Set(),re=/(^|[\s«(„"“—–-]+)(\p{Lu}\p{Ll}{2,})/gu;let m;
  (t.toLowerCase().match(/\p{L}{3,}/gu)||[]).forEach(function(w){low.add(w);});
  while((m=re.exec(t))){const i=m.index,pre=t.slice(Math.max(0,i-3),i+m[1].length);if(/[.!?…]\s*[«"“—–-]?\s*$/.test(pre)||/\n\s*[—–-]?\s*$/.test(pre)||i===0)continue;
    const w=m[2],k=w.length>5?w.slice(0,5):w;const c=cnt.get(k)||{n:0,f:new Map()};c.n++;c.f.set(w,(c.f.get(w)||0)+1);cnt.set(k,c);}
  return [...cnt.entries()].filter(function(e){const top=[...e[1].f.entries()].sort(function(a,c){return c[1]-a[1];})[0][0];return e[1].n>=3&&!(low.has(top.toLowerCase())&&e[1].n<8);})
    .sort(function(a,c){return c[1].n-a[1].n;}).slice(0,30).map(function(e){return [...e[1].f.entries()].sort(function(a,c){return c[1]-a[1];})[0][0];});
}
async function r2Heroes(b){
  b=b||(rmOpen()&&R.book);if(!b)return;if(!aiOn()){aiNoKey();return;}
  const t=await r2Text(b),at=r2Off(b),read=t.slice(0,Math.min(t.length,at+1500)),names=b.type==='pdf'?[]:r2Names(read),tail=b.type==='pdf'?await rmRecapText(b):read.slice(-6000);
  r2Ask({title:'Герои книги',icon:'users',q:'«'+b.title+'» · до этого места',wait:'Собираю героев…',key:'heroes|'+b.id+'|'+Math.round(at/5000),max:900,
    sys:'Ты помощник в приложении для чтения. Составь список героев книги, которые уже встретились человеку. По одному в строке: «Имя — кто это, одной фразой». До 15 строк, главные первыми. '+
      'Строго без спойлеров: только то, что известно к этому месту книги. Без вступлений и без нумерации.',
    user:'Книга: «'+b.title+'»'+(bookAuthor(b)?', '+bookAuthor(b):'')+(names.length?'\nСлова с большой буквы из прочитанного (среди них имена): '+names.join(', '):'')+'\nПоследний прочитанный отрывок:\n'+tail,
    render:function(out){const L=out.split(/\n+/).map(function(x){return x.replace(/^[\s*•\-\d.)]+/,'').trim();}).filter(Boolean);
      return '<ul class="r2list">'+L.map(function(x){const k=x.search(/\s[—–-]\s/);return '<li>'+(k>0?'<b>'+esc(x.slice(0,k))+'</b>'+esc(x.slice(k)):esc(x))+'</li>';}).join('')+'</ul><div class="ai-note">Ответ ИИ по прочитанному, может ошибаться</div>';}});
}
/* the selection menu «Действия»: «Кто это?» for a short selection (a name) */
{const m0=stMenu;stMenu=function(on){m0.apply(this,arguments);const m=el('ssMenu');if(!on||!m||m.hidden||!R.book)return;
  const t=stText();if(!t||t.length>50||stWords(t)>4)return;
  m.insertAdjacentHTML('afterbegin','<button type="button" role="menuitem" data-a="who">'+rqIcon('user-round',18)+'<span>Кто это?</span></button>');stBranch(m,el('ssMore'));};}
ST_ACT.who=function(){const t=stText();selDone();r2Who(t);};

/* ---------- 3 + 4: the end of a chapter ---------- */
function r2Toc(b){return (tocOf(b)||[]).filter(function(x){return typeof x.off==='number';}).sort(function(a,c){return a.off-c.off;});}
function r2ChapAt(b,off){const t=r2Toc(b);let i=-1;t.forEach(function(x,k){if(x.off<=off)i=k;});return i;}
function r2ChapText(b,i){const t=r2Toc(b),a=t[i]?t[i].off:0,z=t[i+1]?t[i+1].off:(b.text||'').length,s=(b.text||'').slice(a,z).replace(/￼img:\d+/g,'');
  return s.length>16000?s.slice(0,8000)+'\n…\n'+s.slice(-8000):s;}
/** 08.11: служебные главы (оглавление, обложка, примечания…) — без карточки */
const R2_CH_SKIP=/^\s*(?:\d+[.)]?\s*)?(?:contents|table of contents|toc|cover|title page|title|copyright|dedication|epigraph|annotation|abstract|about the author|about this (?:book|e-?book)|also by|acknowledg|notes|endnotes|footnotes|index|imprint|colophon|front ?matter|back ?matter|оглавление|содержание|обложка|титул|аннотация|посвящение|эпиграф|об авторе|от автора|от издательства|благодарности|примечания|сноски|комментарии|указатель|выходные данные)\b/i;
const R2_CH_MIN=3000; /* chars: shorter chapters (≈1–2 phone pages) get no card */
const R2_CH_GAP=10*60000; /* not more often than once in 10 minutes */
function r2ChapWorth(b,i){const t=r2Toc(b),x=t[i];if(!x)return false;
  if(R2_CH_SKIP.test(String(x.t||'')))return false;
  const z=t[i+1]?t[i+1].off:(b.text||'').length;return z-x.off>=R2_CH_MIN;}
/** 08.11 (Джессика: «выходит, даже когда я просто листаю книгу»): глава считается прочитанной, только если её листали по порядку
 *  (без прыжков) и на неё ушло не меньше времени, чем на чтение очень быстрым читателем: R2.cps знаков в секунду (50 ≈ 3000 в минуту) */
function r2ChapEnter(b,ci,ok){const t=r2Toc(b);R2.cs={i:ci,t:Date.now(),off:t[ci]?t[ci].off:0,ok:ok};}
function r2ChapRead(b,i){const c=R2.cs,t=r2Toc(b);if(!c||c.i!==i||!c.ok||!t[i])return false;
  const z=t[i+1]?t[i+1].off:(b.text||'').length,n=z-c.off;return n>=R2_CH_MIN&&Date.now()-c.t>=n/R2.cps*1000;}
function r2ChapWatch(){
  if(!rmText()||!R.book||!R.book.text)return;const b=R.book;
  if(typeof ttsOn!=='undefined'&&ttsOn){R2.cb='';return;}
  const ci=r2ChapAt(b,r2Off(b)),p=R.page;
  if(R2.cb!==b.id){R2.cb=b.id;R2.ci=ci;R2.cp=p;r2ChapEnter(b,ci,true);R2.cs.off=r2Off(b);return;} /* opened in the middle: only the rest counts */
  const fin=R2.ci;R2.ci=ci;const step=p-R2.cp;R2.cp=p;
  const d=el('r2Offer');if(d&&!d.hidden&&p!==R2.offP)r2OfferHide(); /* the next page turn takes the card away */
  if(ci!==fin){const read=ci===fin+1&&fin>=0&&step===1&&r2ChapRead(b,fin);r2ChapEnter(b,ci,step===1&&ci===fin+1);
    if(read&&r2Rm().chEnd&&Date.now()-(R2.offAt||0)>=R2_CH_GAP&&r2ChapWorth(b,fin))r2ChapOffer(b,fin);return;}
  if(R2.cs&&step!==0&&Math.abs(step)!==1)R2.cs.ok=false; /* a jump inside the chapter: not read through */
}
function r2ChapOffer(b,i){
  const t=r2Toc(b)[i];if(!t)return;const ai=aiOn(),q=ai&&r2Rm().chQ;R2.offAt=Date.now();
  r2Offer('<span class="r2ot">'+rqIcon('check',18)+'<span><b>Глава прочитана</b><small>«'+esc(String(t.t||'').slice(0,60))+'»</small></span></span>'+
    '<button type="button" class="ghostbtn" id="r2ChSum" aria-label="Итог главы в дневник">'+rqIcon('notebook-pen',16)+' Итог</button>'+
    (q?'<button type="button" class="ghostbtn r2oi" id="r2ChQ" aria-label="Вопрос по главе">'+rqIcon('circle-help',18)+'</button>':'')+
    '<button type="button" class="closes" id="r2OffX" aria-label="Закрыть">'+rqIcon('x',20)+'</button>');
  el('r2Offer').classList.add('r2och');
  el('r2ChSum').onclick=function(e){e.stopPropagation();r2OfferHide();r2ChapSum(b,i);};
  if(q)el('r2ChQ').onclick=function(e){e.stopPropagation();r2OfferHide();r2ChapQuiz(b,i);};
  el('r2OffX').onclick=function(e){e.stopPropagation();r2OfferHide();};
}
function r2DiarySave(b,ch,txt){
  if(typeof qDiaryOn!=='function'||!qDiaryOn()){flashMsg('Дневник недоступен');return;}
  const y=diaryOf(b.id)||diaryNew({b:b.id}),p=R&&R.book&&R.book.id===b.id?R.page:0;
  const n=dyNewEntry(y,'',{ch:ch,pg:p+1,r:R.pageCount>1?p/(R.pageCount-1):0});n.t='Итог главы';n.x=String(txt).slice(0,20000);dyTouch(y);
  flashMsg('Итог главы записан в дневник',{kind:'info',icon:'notebook-pen'});
}
async function r2ChapSum(b,i){
  const t=r2Toc(b)[i],ch=String((t&&t.t)||'').slice(0,120),own=function(v){
    return rqAsk({t:'Итог главы «'+ch.slice(0,40)+'»',p:'Что было в этой главе, своими словами. Запись попадёт в дневник книги',ok:'Записать',input:v||''}).then(function(x){if(x===null||x===false||!String(x).trim())return;r2DiarySave(b,ch,x);});};
  if(!aiOn()){own('');return;}
  r2Ask({title:'Итог главы',icon:'notebook-pen',q:'«'+ch+'»',wait:'Читаю главу…',key:'sum|'+b.id+'|'+i,max:400,
    sys:'Ты помощник в приложении для чтения. Перескажи главу книги в трёх коротких строках по-русски: главное событие, что поменялось у героев, деталь, которую стоит запомнить. Без спойлеров к следующим главам, без вступлений, без нумерации.',
    user:'Книга: «'+b.title+'»'+(bookAuthor(b)?', '+bookAuthor(b):'')+'\nГлава: '+ch+'\nТекст главы:\n'+r2ChapText(b,i),
    render:function(out){return '<div class="ai-a">'+esc(out).replace(/\n+/g,'<br>')+'</div><div class="ai-note">Ответ ИИ, может ошибаться</div>'+
      '<button class="ghostbtn" id="r2SumSave">'+rqIcon('notebook-pen',16)+' Записать в дневник</button><button class="ghostbtn" id="r2SumOwn">'+rqIcon('pencil',16)+' Поправить и записать</button>';},
    after:function(out){el('r2SumSave').onclick=function(){el('aiSheet').classList.add('hidden');r2DiarySave(b,ch,out);};
      el('r2SumOwn').onclick=function(){el('aiSheet').classList.add('hidden');own(out.replace(/\s*\n+\s*/g,' '));};}});
}
function r2QuizParse(out){
  try{const j=JSON.parse(out.slice(out.indexOf('['),out.lastIndexOf(']')+1));if(Array.isArray(j))return j.filter(function(x){return x&&x.q;}).slice(0,3);}catch(e){}
  const L=[],re=/(?:^|\n)\s*(?:\d+[.)]|Вопрос[^:]*:)\s*(.+?)\s*\n+\s*(?:Ответ[^:]*:)\s*(.+)/g;let m;while((m=re.exec(out)))L.push({q:m[1],a:m[2]});return L;
}
function r2ChapQuiz(b,i){
  const t=r2Toc(b)[i],ch=String((t&&t.t)||'').slice(0,120);
  r2Ask({title:'Вопрос по главе',icon:'circle-help',q:'«'+ch+'»',wait:'Придумываю вопросы…',key:'quiz|'+b.id+'|'+i,max:500,
    sys:'Ты помощник в приложении для чтения. Придумай 2 коротких вопроса по главе, чтобы человек лучше запомнил прочитанное: про событие и про героя. На каждый короткий ответ из текста главы. '+
      'Ответь только JSON-массивом: [{"q":"вопрос","a":"ответ"}]. По-русски, без спойлеров к следующим главам.',
    user:'Книга: «'+b.title+'»\nГлава: '+ch+'\nТекст главы:\n'+r2ChapText(b,i),
    render:function(out){const Q=r2QuizParse(out);if(!Q.length)return '<div class="ai-a">'+esc(out).replace(/\n+/g,'<br>')+'</div>';
      return Q.map(function(x,k){return '<div class="r2q"><b>'+(k+1)+'. '+esc(String(x.q))+'</b><details><summary>Показать ответ</summary><p>'+esc(String(x.a||''))+'</p></details></div>';}).join('')+
        '<div class="ai-note">Для себя: без баллов и без штрафов. Вопросы от ИИ, могут ошибаться</div>';}});
}

/* ---------- 6: word after word ---------- */
const RS={on:false,run:false,toks:[],i:0,tm:0,T:null};
function rsOrp(n){return n<=1?0:n<=5?1:n<=9?2:n<=13?3:4;}
function rsOpen(){
  if(!rmText()){flashMsg('«Слово за словом» работает в книгах, не в PDF');return;}
  if(RM.auto.on)rmAutoStop();if(typeof ttsOn!=='undefined'&&ttsOn)ttsStop();
  el('sheet').classList.add('hidden');el('panel').classList.add('hidden');rmFnHide();
  const T=rmNodes(),all=T.a.map(function(x){return x.n.nodeValue;}).join(''),cut=new Set();let pb=null;
  T.a.forEach(function(x){const p=x.n.parentNode,bl=p&&p.closest?p.closest('p,h1,h2,h3,h4,li,blockquote,div'):null;if(bl!==pb){cut.add(x.s);pb=bl;}});
  const toks=[],re=/\S+/g;let m;
  while((m=re.exec(all))){let a=m.index;const z=a+m[0].length;for(let k=a+1;k<z;k++)if(cut.has(k)){toks.push([a,k]);a=k;}toks.push([a,z]);}
  const an=readingAnchor();let off=an?rmOffOf(T,an.node,an.offset):-1;if(off<0)off=r2PageOff(T);
  let i=toks.findIndex(function(t){return t[1]>off;});if(i<0)i=0;
  Object.assign(RS,{on:true,run:false,toks:toks,i:i,i0:i,T:T,all:all,cut:cut});
  el('r2Rs').style.setProperty('--rm-font',(FONTS[SET.font]||FONTS[0]).v);el('r2Rs').hidden=false;el('reader').classList.add('r2rson');rsShow();rsPlay(true);
}
/** the first text offset on the page shown (binary search by the page of a character) */
function r2PageOff(T){const pgOf=function(o0){for(let o=o0;o<Math.min(T.len,o0+60);o++){const g=pg1(o);if(g>=0)return g;}return -1;},pg1=function(o){const p=rmAt(T,o);if(!p)return -1;try{const rg=document.createRange();rg.setStart(p.node,p.offset);rg.setEnd(p.node,Math.min(p.node.nodeValue.length,p.offset+1));
    const r=[...rg.getClientRects()].find(function(x){return x.width;});return r?selPageAt(r):-1;}catch(e){return -1;}};
  let lo=0,hi=T.len-1;while(lo<hi){const m=(lo+hi)>>1,pg=pgOf(m);if(pg>=0&&pg<R.page)lo=m+1;else hi=m;}return lo;}
function rsWord(i){const t=RS.toks[i];return t?RS.all.slice(t[0],t[1]):'';}
function rsShow(){
  const w=rsWord(RS.i),core=w.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu,''),lead=w.indexOf(core),k=core?lead+rsOrp(core.length):0;
  el('r2RsW').innerHTML='<span class="a">'+esc(w.slice(0,k))+'</span><b>'+esc(w.charAt(k))+'</b><span class="z">'+esc(w.slice(k+1))+'</span>';
  const n=RS.toks.length;el('r2RsInfo').textContent=Math.round(RS.i/Math.max(1,n-1)*100)+' % книги · '+r2Rm().rsvp+' слов в минуту';
  el('r2RsV').textContent=r2Rm().rsvp+' сл/мин';el('r2RsPP').innerHTML=rqIcon(RS.run?'pause':'play',26);el('r2RsPP').setAttribute('aria-label',RS.run?'Пауза':'Дальше');
}
function rsDelay(w){let d=60000/r2Rm().rsvp;if(/[.!?…]["»”)]*$/.test(w))d*=2.2;else if(/[,;:—–]["»”)]*$/.test(w))d*=1.5;if(w.length>9)d*=1.3;
  const t=RS.toks[RS.i+1];if(t&&RS.cut.has(t[0]))d*=1.6;return d;}
function rsTick(){if(!RS.on||!RS.run)return;if(document.hidden){rsPlay(false);return;}
  if(RS.i>=RS.toks.length-1){rsPlay(false);flashMsg('Конец книги');return;}
  const w=rsWord(RS.i);RS.tm=setTimeout(function(){RS.i++;rsShow();rsTick();},rsDelay(w));}
function rsPlay(on){clearTimeout(RS.tm);RS.run=!!on;rsShow();if(on)RS.tm=setTimeout(rsTick,300);}
function rsBack(){let i=Math.max(0,RS.i-1);while(i>0&&!/[.!?…]["»”)]*$/.test(rsWord(i-1)))i--;if(i===RS.i-1&&i>0){i--;while(i>0&&!/[.!?…]["»”)]*$/.test(rsWord(i-1)))i--;}RS.i=i;rsShow();}
function rsStep(d){const s=rmS();s.rsvp=Math.max(100,Math.min(1000,s.rsvp+d*50));saveSet();rsShow();rmRenderSheet();}
function rsClose(){
  if(!RS.on)return;clearTimeout(RS.tm);RS.on=false;RS.run=false;el('r2Rs').hidden=true;el('reader').classList.remove('r2rson');
  const t=RS.toks[RS.i];if(!t||!rmOpen())return;const p=rmAt(rmNodes(),t[0]);if(!p)return;
  try{const rg=document.createRange();rg.setStart(p.node,p.offset);rg.setEnd(p.node,Math.min(p.node.nodeValue.length,p.offset+1));const r=[...rg.getClientRects()].find(function(x){return x.width;})||p.node.parentElement.getBoundingClientRect();
    const pg=Math.max(0,Math.min(R.pageCount-1,selPageAt(r)));if(pg!==R.page)jumpTo(pg);}catch(e){}
}
document.addEventListener('keydown',function(e){if(!RS.on)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();rsClose();}else if(e.key===' '){e.preventDefault();e.stopPropagation();rsPlay(!RS.run);}},true);

/* ---------- 7: pick the look in a minute ---------- */
const R2_WIZ=[
  {t:'Какой шрифт читать легче?',o:[{l:'С засечками',v:{font:11}},{l:'Без засечек',v:{font:10}},{l:'Классический',v:{font:0}}]},
  {t:'Какой размер удобнее?',o:[{l:'Мельче',v:{size:17}},{l:'Средний',v:{size:20}},{l:'Крупнее',v:{size:23}}]},
  {t:'Сколько воздуха между строками?',o:[{l:'Плотно',v:{lh:1.35,wsp:0,psp:0}},{l:'Обычно',v:{lh:1.55,wsp:0,psp:0.25}},{l:'Просторно',v:{lh:1.8,wsp:2,psp:0.5}}]}];
function r2WizOpen(){
  const d=el('r2Wiz');if(!d)return;const pick={};let k=0;
  let sample=rmPrevText().join(' ');if(/^[a-zа-яё]/.test(sample)){const k=sample.search(/[.!?…]\s+\S/);sample=k>0?sample.slice(k+1).trim():'';}
  sample=(sample||'Через базарную площадь идёт полицейский надзиратель Очумелов в новой шинели и с узелком в руке.').slice(0,170);
  const draw=function(){const s=R2_WIZ[k];
    d.innerHTML='<div class="r2wz"><div class="r2wzh"><b>'+esc(s.t)+'</b><span>'+(k+1)+' из '+R2_WIZ.length+'</span><button type="button" class="closes" id="r2WizX" aria-label="Закрыть">'+rqIcon('x',20)+'</button></div>'+
      s.o.map(function(o,i){const v=Object.assign({font:SET.font,size:SET.size,lh:SET.lh,wsp:SET.wsp||0,psp:SET.psp||0},pick,o.v),f=(FONTS[v.font]||FONTS[0]);
        return '<button type="button" class="r2wzo" data-i="'+i+'"><span class="r2wzl">'+esc(o.l)+(k===0?' · '+esc(f.label):'')+'</span><span class="r2wzs" style="font-family:'+esc(f.v)+';font-size:'+v.size+'px;line-height:'+v.lh+';word-spacing:'+v.wsp+'px">'+esc(sample)+'</span></button>';}).join('')+
      '<div class="r2wzf">Потом всё можно поменять в «Настройках чтения»</div></div>';
    el('r2WizX').onclick=function(){d.hidden=true;};
    d.querySelectorAll('.r2wzo').forEach(function(b){b.onclick=function(){Object.assign(pick,s.o[+b.dataset.i].v);k++;if(k<R2_WIZ.length){draw();return;}
      d.hidden=true;const an=rmText()?readingAnchor():null;Object.assign(SET,rqTypoPick(pick,RQ_PRESET_KEYS));saveSet();applySet();if(rmText())relayout({force:true,anchor:an||undefined});
      try{rqCollapseSync('fontSeg');}catch(e){}if(typeof renderSheet==='function')try{renderSheet();}catch(e){}rmRenderSheet();flashMsg('Готово: шрифт, размер и интервалы подобраны',{kind:'info',icon:'check'});};});};
  el('sheet').classList.add('hidden');draw();d.hidden=false;
}

/* ---------- 8: one hand ---------- */
{const z0=rmZoneAt;rmZoneAt=function(x,y){const r=z0.apply(this,arguments);if(r)return r;const m=r2Rm();if(!m.oneh||m.zones||flipGet().tap===false)return null;
  return R2_ONEH[Math.min(2,Math.max(0,Math.floor(y*3)))*3+Math.min(2,Math.max(0,Math.floor(x*3)))];};}
function r2OneH(){const on=!!r2Rm().oneh,rd=el('reader'),hd=rd&&rd.querySelector('.rhead'),bot=rd&&rd.querySelector('.rbot');if(!hd||!bot)return;
  rd.classList.toggle('rmoneh',on);
  if(on&&hd.parentNode!==bot)bot.insertBefore(hd,bot.firstChild);
  else if(!on&&hd.parentNode===bot)rd.insertBefore(hd,rd.firstChild);}

/* ---------- 9: run a finger along the right edge = the page slider ---------- */
function r2EdgeSync(){const e=el('r2Edge');if(!e)return;e.hidden=!r2Rm().edge||!rmOpen()||rqScrollMode()||(R.mode==='pdf'&&typeof PS!=='undefined'&&PS.on)||R.pageCount<3;}
(function(){
  const rd=el('reader');if(!rd)return;
  rd.insertAdjacentHTML('beforeend','<div id="r2Edge" hidden aria-hidden="true"></div><div id="r2EdgeTip" hidden aria-live="polite"></div><div id="r2Offer" class="rmcardpop rmoffer" role="status" hidden></div>'+
    '<div id="r2Rs" role="dialog" aria-label="Слово за словом" hidden><div class="r2rst"><span id="r2RsInfo"></span><button type="button" class="closes" id="r2RsX" aria-label="Закрыть">'+rqIcon('x',22)+'</button></div>'+
    '<div class="r2rsm"><i></i><div id="r2RsW"></div><i></i></div><div class="r2rsb"><button type="button" id="r2RsBack" aria-label="К началу предложения">'+rqIcon('undo-2',22)+'</button>'+
    '<button type="button" id="r2RsPP" aria-label="Пауза"></button><span class="stepgrp"><button type="button" class="stepbtn" id="r2RsSlow" aria-label="Медленнее">'+rqIcon('minus',18)+'</button><b id="r2RsV"></b><button type="button" class="stepbtn" id="r2RsFast" aria-label="Быстрее">'+rqIcon('plus',18)+'</button></span></div>'+
    '<div class="r2rsn">Тап по слову — пауза. Страница книги останется там, где вы остановились</div></div>'+
    '<div id="r2Walk" role="dialog" aria-label="Слушать на ходу" hidden><div class="r2wt"><b id="r2WT"></b><span id="r2WP"></span></div><div id="r2WS"></div>'+
    '<div class="r2wb"><span id="r2WSl"></span><button type="button" id="r2WPP" aria-label="Пауза"></button><button type="button" class="ghostbtn" id="r2WX">'+rqIcon('book-open',18)+' К тексту</button></div></div>');
  document.body.insertAdjacentHTML('beforeend','<div id="r2Wiz" role="dialog" aria-label="Подобрать оформление" hidden></div>');
  el('r2RsX').onclick=function(e){e.stopPropagation();rsClose();};el('r2RsPP').onclick=function(e){e.stopPropagation();rsPlay(!RS.run);};
  el('r2RsW').onclick=function(e){e.stopPropagation();rsPlay(!RS.run);};el('r2RsBack').onclick=function(e){e.stopPropagation();rsBack();};
  el('r2RsSlow').onclick=function(e){e.stopPropagation();rsStep(-1);};el('r2RsFast').onclick=function(e){e.stopPropagation();rsStep(1);};
  ['pointerdown','click','touchstart'].forEach(function(t){el('r2Rs').addEventListener(t,function(e){e.stopPropagation();});el('r2Walk').addEventListener(t,function(e){e.stopPropagation();});});
  el('r2WPP').onclick=function(){if(typeof ttsOn!=='undefined'&&ttsOn)ttsStop();else el('btnTts').click();r2WalkUi();};
  el('r2WX').onclick=r2WalkClose;
  /* the edge strip */
  const g=el('r2Edge'),tip=el('r2EdgeTip');let id=null,y0=0,x0=0,p0=0,mv=false,t0=0,last=-1;
  const pg=function(){return R.mode==='pdf'&&typeof P!=='undefined'&&P.shown>=0?P.shown:R.page;};
  const lab=function(p){const b=R.book,ch=b&&R.mode==='text'&&b.text?r2Toc(b)[r2ChapAt(b,Math.floor(p/Math.max(1,R.pageCount-1)*b.text.length))]:null;
    return 'стр. '+(R.mode==='pdf'&&typeof pdfLabel==='function'?pdfLabel(p):p+1)+' из '+R.pageCount+(ch&&ch.t?'<small>'+esc(String(ch.t).slice(0,40))+'</small>':'');};
  g.addEventListener('pointerdown',function(e){id=e.pointerId;y0=e.clientY;x0=e.clientX;p0=pg();mv=false;t0=Date.now();last=-1;try{g.setPointerCapture(id);}catch(_){}e.stopPropagation();});
  g.addEventListener('pointermove',function(e){if(e.pointerId!==id)return;const dy=e.clientY-y0;if(!mv&&Math.abs(dy)<10)return;if(!mv&&Math.abs(e.clientX-x0)>Math.abs(dy))return;mv=true;e.preventDefault();
    const n=Math.max(0,Math.min(R.pageCount-1,p0+Math.round(dy/14)));tip.innerHTML=lab(n);tip.hidden=false;tip.style.top=Math.max(60,Math.min(innerHeight-90,e.clientY-20))+'px';g.classList.add('on');
    if(n!==last){last=n;const s=el('pgSlider');s.value=n;s.dispatchEvent(new Event('input',{bubbles:true}));}});
  const up=function(e){if(e.pointerId!==id)return;id=null;g.classList.remove('on');tip.hidden=true;
    if(mv){if(last>=0){const s=el('pgSlider');s.value=last;s.dispatchEvent(new Event('change',{bubbles:true}));}return;}
    const dx=e.clientX-x0;if(Math.abs(dx)>40){goPage(pg()+(dx<0?1:-1),true);return;}
    if(Date.now()-t0<500&&e.type==='pointerup'){if(R.mode==='pdf')pdfSingleTap((e.clientX-el('viewer').getBoundingClientRect().left)/el('viewer').getBoundingClientRect().width,(e.clientY-el('viewer').getBoundingClientRect().top)/el('viewer').getBoundingClientRect().height);else viewerTap(e.clientX,e.clientY);}};
  g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up);g.addEventListener('click',function(e){e.stopPropagation();});
})();

/* ---------- 10: voices by role · 11: listen on the go ---------- */
{const c0=nttsCfg;nttsCfg=function(){const c=c0.apply(this,arguments);if(R2.vo)c.voice=R2.vo;return c;};}
/** narration / dialogue pieces of a chunk the voice reads: [{a, z, d}] covering the whole text */
function r2Segs(t){
  const out=[],push=function(a,z,d){if(z<=a)return;const l=out[out.length-1];if(l&&(l.d===d||!/\p{L}/u.test(t.slice(a,z)))){l.z=z;return;}if(l&&!/\p{L}/u.test(t.slice(l.a,l.z))){l.z=z;l.d=d;return;}out.push({a:a,z:z,d:d});};
  let i=0;t.split(/(\n)/).forEach(function(par){const sp=par==='\n'?[]:r2DlgSpans(par);let k=0;sp.forEach(function(r){push(i+k,i+r[0],false);push(i+r[0],i+r[1],true);k=r[1];});push(i+k,i+par.length,false);i+=par.length;});
  return out;
}
function r2With(voice,fn){
  if(!voice){fn();return;}
  if(nttsOn()){R2.vo=voice;try{fn();}finally{R2.vo=null;}return;}
  const x=rqRx().tts,old=x.voice;x.voice=voice;try{fn();}finally{x.voice=old;}
}
{const s0=ttsSay;ttsSay=function(t,onend,onstart,onpos,next){
  const ro=r2Rm().roles,v=nttsOn()?ro.v:ro.sv;
  if(!ro.on||!v||!t||!/[—–"“«]/.test(t))return s0.apply(this,arguments);
  const segs=r2Segs(t);if(!segs.some(function(g){return g.d;}))return s0.apply(this,arguments);
  let i=0;const say=function(){
    if(typeof ttsOn!=='undefined'&&!ttsOn)return;if(i>=segs.length){if(onend)onend();return;}
    const g=segs[i],first=i===0;
    r2With(g.d?v:null,function(){s0(t.slice(g.a,g.z),function(){i++;say();},first?onstart:function(){if(onpos)onpos(g.a);},function(ci){if(onpos)onpos(g.a+ci);},'');});
    const n=segs[i+1];if(n&&nttsOn())r2With(n.d?v:null,function(){nttsGet(t.slice(n.a,n.z));});};
  say();};}
function r2Sentence(pos){const t=R.book&&R.book.text||'';if(!t)return '';let a=pos,z=pos;
  while(a>0&&!/[.!?…\n]/.test(t[a-1]))a--;while(z<t.length&&!/[.!?…\n]/.test(t[z]))z++;while(z<t.length&&/[.!?…»”")]/.test(t[z]))z++;
  return t.slice(a,z).replace(/￼img:\d+/g,'').replace(/^[\s»”")\]]+/,'').trim();}
{const p0=ttsPageAt;ttsPageAt=function(pos){R2.pos=pos;const r=p0.apply(this,arguments);if(!el('r2Walk').hidden)r2WalkUi();return r;};}
function r2WalkOpen(){if(!rmOpen())return;el('r2Walk').hidden=false;el('reader').classList.add('r2walk');r2WalkUi();}
function r2WalkClose(){el('r2Walk').hidden=true;el('reader').classList.remove('r2walk');
  if(rmText()&&R2.pos>=0&&R.book&&R.book.text&&R.pageCount>1&&!rqRx().tts.follow){const np=Math.round(R2.pos/R.book.text.length*(R.pageCount-1));if(np!==R.page)jumpTo(np);}}
function r2WalkUi(){if(el('r2Walk').hidden||!R.book)return;const on=typeof ttsOn!=='undefined'&&ttsOn;
  el('r2WT').textContent=R.book.title||'';el('r2WP').textContent='стр. '+(rmPage()+1)+' из '+R.pageCount;
  const s=R.mode==='text'&&R2.pos>=0?r2Sentence(R2.pos):'';el('r2WS').textContent=s||(on?'Читаю…':'Пауза');
  el('r2WPP').innerHTML=rqIcon(on?'pause':'play',34);el('r2WPP').setAttribute('aria-label',on?'Пауза':'Слушать');
  const c=el('rmSleep');el('r2WSl').textContent=c?c.textContent:'';}
setInterval(function(){if(!el('r2Walk').hidden)r2WalkUi();},1000);
{const b0=ttsBtn;ttsBtn=function(on){b0.apply(this,arguments);const w=el('btnWalk');if(w)w.hidden=!on;if(!on)R2.pos=-1;r2WalkUi();
  try{if('mediaSession' in navigator){const ms=navigator.mediaSession;
    if(on&&R.book){if(window.MediaMetadata)ms.metadata=new MediaMetadata({title:R.book.title||'',artist:bookAuthor(R.book)||'',album:'Читалка'});
      ms.setActionHandler('pause',function(){if(ttsOn)ttsStop();});ms.setActionHandler('stop',function(){if(ttsOn)ttsStop();});
      ms.setActionHandler('play',function(){if(!ttsOn&&rmOpen())el('btnTts').click();});}
    ms.playbackState=on?'playing':'paused';}}catch(e){}};}
(function(){const s=el('btnSleep')||el('btnTts');if(!s)return;
  s.insertAdjacentHTML('afterend','<button id="btnWalk" type="button" hidden title="Слушать на ходу" aria-label="Слушать на ходу: крупно, тёмный экран">'+rqIcon('footprints',22)+'</button>');
  el('btnWalk').onclick=function(e){e.stopPropagation();r2WalkOpen();};})();

/* ---------- 12: share a preset · 13: compare with the look before ---------- */
function r2Code(p){return 'RQSET:'+btoa(unescape(encodeURIComponent(JSON.stringify({n:p.n,v:p.v}))));}
function r2Uncode(s){const m=/RQSET:([A-Za-z0-9+/=]+)/.exec(String(s||''));if(!m)return null;
  try{const o=JSON.parse(decodeURIComponent(escape(atob(m[1]))));const v=rqTypoPick(o&&o.v,RQ_PRESET_KEYS);if(!Object.keys(v).length)return null;
    return {n:String(o.n||'Набор').trim().slice(0,24)||'Набор',v:v};}catch(e){return null;}}
async function r2Share(){
  const on=(SET.presets||[]).find(gsPresetOn),p=on||{n:'Мой набор',v:rqTypoPick(SET,RQ_PRESET_KEYS)},code=r2Code(p),
    txt='Набор для чтения «'+p.n+'» для Читалки. Вставьте в «Мои наборы» → «Добавить по коду»:\n'+code;
  try{if(navigator.share){await navigator.share({title:'Набор «'+p.n+'»',text:txt});return;}}catch(e){if(e&&e.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(txt);flashMsg('Код набора «'+p.n+'» скопирован',{kind:'info',icon:'copy'});}
  catch(e){rqAsk({t:'Код набора «'+p.n+'»',p:'Скопируйте и отправьте',input:code,ok:'Готово'});}
}
async function r2AddCode(){
  const s=await rqAsk({t:'Добавить набор по коду',p:'Вставьте код, который вам прислали (начинается с RQSET:)',input:'',ok:'Добавить'});if(s==null||s===false)return;
  const p=r2Uncode(s);if(!p){flashMsg('Это не код набора');return;}
  const ps=SET.presets||[];if(ps.length>=8){flashMsg('Уже 8 наборов: удалите один, чтобы добавить');return;}
  let n=p.n,k=2;while(ps.some(function(x){return x.n===n;}))n=(p.n.slice(0,20)+' '+(k++));
  SET.presets=ps.concat([{n:n,v:p.v}]);saveSet();gsPresetsSync();flashMsg('Набор «'+n+'» добавлен. Нажмите на него, чтобы включить',{kind:'info',icon:'check'});
}
{const g0=gsPresetsRender;gsPresetsRender=function(box){g0.apply(this,arguments);if(!box)return;
  const mk=function(ic,t,fn){const b=document.createElement('button');b.type='button';b.className='fchip padd r2pc';b.innerHTML=rqIcon(ic,16)+'<span>'+t+'</span>';b.onclick=fn;box.appendChild(b);};
  mk('share-2','Поделиться',r2Share);if((SET.presets||[]).length<8)mk('download','По коду',r2AddCode);};}
/* 13: «Как было» under the sample: hold to see the page as it was when the sheet opened */
function r2Snap(){return {s:rqTypoPick(SET,RQ_PRESET_KEYS),m:JSON.parse(JSON.stringify(rqRm()))};}
function r2CmpSync(){const b=el('r2Cmp');if(!b)return;const c=R2.cmp;const diff=!!c&&JSON.stringify(c)!==JSON.stringify(r2Snap());el('sheet').classList.toggle('r2diff',diff&&el('sheet').classList.contains('rmprev'));}
function r2CmpShow(on){const c=R2.cmp;if(!c)return;const p=el('gsPrev');if(!p)return;
  if(!on){p.classList.remove('r2old');gsPrevApply();return;}
  const keep={s:rqTypoPick(SET,RQ_PRESET_KEYS),m:SET.rm};try{Object.assign(SET,c.s);SET.rm=c.m;gsPrevApply();}finally{Object.assign(SET,keep.s);SET.rm=keep.m;}p.classList.add('r2old');}
(function(){const p=el('gsPrev');if(!p)return;
  p.insertAdjacentHTML('afterend','<button type="button" id="r2Cmp" aria-label="Удерживайте, чтобы увидеть, как было до изменений">'+rqIcon('git-compare',16)+' Удерживайте: как было</button>');
  const b=el('r2Cmp');b.addEventListener('pointerdown',function(e){e.preventDefault();r2CmpShow(true);});
  ['pointerup','pointerleave','pointercancel'].forEach(function(t){b.addEventListener(t,function(){r2CmpShow(false);});});
  b.addEventListener('keydown',function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();r2CmpShow(true);}});b.addEventListener('keyup',function(){r2CmpShow(false);});
  b.addEventListener('contextmenu',function(e){e.preventDefault();});})();
{let shown=false;new MutationObserver(function(){const on=!el('sheet').classList.contains('hidden');if(on&&!shown)R2.cmp=r2Snap();if(!on)R2.cmp=null;shown=on;r2CmpSync();}).observe(el('sheet'),{attributes:true,attributeFilter:['class']});}

/* ---------- hooks: look changes, book open / close, the text tap ---------- */
{const a0=applySet;applySet=function(){a0.apply(this,arguments);try{r2DlgColor();r2OneH();r2EdgeSync();r2CmpSync();}catch(e){}};}
{const b0=rmSetBion;rmSetBion=function(){const r=b0.apply(this,arguments);r2DlgApply();r2HardApply();return r;};}
{const o0=openBook;openBook=async function(id){const r=await o0.apply(this,arguments);try{R2.cb='';r2DlgApply();r2HardApply();r2OneH();r2EdgeSync();r2ChapWatch();}catch(e){}return r;};}
{let was=false;new MutationObserver(function(){const open=!el('reader').classList.contains('hidden');if(open===was)return;was=open;
  if(!open){rsClose();el('r2Walk').hidden=true;el('reader').classList.remove('r2walk');r2OfferHide();R2.cb='';try{CSS.highlights.delete('rm-dlg');CSS.highlights.delete('rm-hard');}catch(e){}}
  r2EdgeSync();}).observe(el('reader'),{attributes:true,attributeFilter:['class']});}
new MutationObserver(function(){try{r2ChapWatch();r2EdgeSync();}catch(e){}}).observe(el('pgNum'),{childList:true,characterData:true,subtree:true});
{const v0=viewerTap;viewerTap=function(cx,cy){
  if(RM.fnClosedAt&&Date.now()-RM.fnClosedAt<350)return;
  if(r2Rm().hard&&R.mode==='text'&&!(typeof SM!=='undefined'&&SM.on)&&!selText()&&!RM.auto.on){const w=r2WordAt(cx,cy),m=w&&r2Hard(w.w);
    if(m){r2Note('book-open',w.w,esc(m)+'<div class="r2nn">Короткое значение из словаря старинных слов. Подробнее — выделите слово и нажмите «Объясни»</div>',cx,cy);return;}}
  return v0.apply(this,arguments);};}

/* ---------- «Настройки чтения»: rows ---------- */
(function(){
  const after=function(id,html){const n=el(id);const r=n&&n.closest('.rrow,.srow');if(r)r.insertAdjacentHTML('afterend',html);};
  const gt=el('grpText');if(gt)gt.insertAdjacentHTML('afterbegin','<div class="rrow" id="r2WizRow"><span class="rl" id="r2WizL">Подобрать за минуту<small>три вопроса с примерами: шрифт, размер, интервалы</small></span><button type="button" class="ghostbtn" id="r2WizGo">Подобрать</button></div>');
  after('rmBion',rmSwRow('r2Dlg','Подсветка диалогов','реплики героев чуть другим цветом','txtonly')+rmSwRow('r2Hard','Трудные слова','старинные слова подчёркнуты; тап — короткое значение','txtonly'));
  after('rmAutoGo','<div class="rrow stack txtonly" id="r2RsRow"><span class="rl" id="r2RsL">Слово за словом<small>слова по одному в центре экрана, с вашей скоростью</small></span>'+
    '<div class="rmautoset"><button type="button" class="ghostbtn" id="r2RsGo">Начать</button><span class="stepgrp"><button type="button" class="stepbtn" id="r2RsSlow2" aria-label="Медленнее">'+rqIcon('minus',18)+'</button><b id="r2RsV2"></b><button type="button" class="stepbtn" id="r2RsFast2" aria-label="Быстрее">'+rqIcon('plus',18)+'</button></span></div></div>'+
    rmSwRow('r2OneH','Одной рукой','панели внизу, под большим пальцем; листать тапом по нижней части экрана')+rmSwRow('r2EdgeOn','Листание по краю','проведите пальцем вверх-вниз по правому краю, чтобы быстро пролистать'));
  const tg=function(id,fn){const b=el(id);if(b)b.onclick=function(){fn();saveSet();applySet();rmRenderSheet();if(typeof rxRender==='function')rxRender();};};
  tg('r2Dlg',function(){rmS().dlg=!rmS().dlg;r2DlgApply();});tg('r2Hard',function(){rmS().hard=!rmS().hard;r2HardApply();});
  tg('r2OneH',function(){rmS().oneh=!rmS().oneh;});tg('r2EdgeOn',function(){rmS().edge=!rmS().edge;});
  el('r2WizGo').onclick=r2WizOpen;el('r2RsGo').onclick=function(){rsOpen();};
  el('r2RsSlow2').onclick=function(){rsStep(-1);};el('r2RsFast2').onclick=function(){rsStep(1);};
})();
{const r0=rmRenderSheet;rmRenderSheet=function(){r0.apply(this,arguments);if(!el('r2Dlg'))return;const m=rqRm();
  const sw=function(id,on){const b=el(id);if(b){b.classList.toggle('on',!!on);b.setAttribute('aria-checked',on?'true':'false');}};
  sw('r2Dlg',m.dlg);sw('r2Hard',m.hard);sw('r2OneH',m.oneh);sw('r2EdgeOn',m.edge);el('r2RsV2').textContent=m.rsvp+' сл/мин';el('r2RsGo').disabled=!rmText();r2CmpSync();};}

/* ---------- «Общие настройки → Чтение» ---------- */
{const t0=rmRxTtsRows;rmRxTtsRows=function(){return t0.apply(this,arguments)+
  rxRow('','users','Голоса по ролям','Реплики героев читает другой голос. С нейроголосом это больше запросов к сервису',rxSwHtml('r2Roles'))+
  rxRow('r2RolesVRow','user-round','Голос героев','','<select id="r2RolesSel" class="rxsel" aria-label="Голос для реплик героев" hidden></select><input id="r2RolesIn" class="rxsel" type="text" maxlength="80" aria-label="Голос для реплик героев" hidden>','setstack')+
  rxRow('','footprints','Слушать на ходу','Во время озвучки рядом с «Слушать» кнопка со следами: крупный текст на тёмном экране, пауза с экрана блокировки',null);};}
{const c0=rmRxCards;rmRxCards=function(){return c0.apply(this,arguments)+rxCardHtml('rch','check','Когда глава прочитана',
  '<div class="aisub">Небольшая строка сверху страницы. Пропадает сама через несколько секунд или при перелистывании, закрывается тапом или смахиванием вверх. Только если главу читали по порядку, а не пролистали. Не чаще раза в 10 минут; оглавление, примечания и совсем короткие главы пропускаются.</div>'+
  rxRow('','notebook-pen','Предлагать итог главы','Три строки от ИИ или свои слова, запись в дневник книги',rxSwHtml('r2ChEnd'))+
  rxRow('r2ChQRow','circle-help','Вопрос по главе','Два вопроса, чтобы лучше запомнить. Без баллов и штрафов, нужен ключ ИИ',rxSwHtml('r2ChQ')));};}
{const w0=rmRxWire;rmRxWire=function(){w0.apply(this,arguments);
  const sw=function(id,fn){const b=el(id);if(b)b.onclick=function(){fn();rxSave();};};
  sw('r2Roles',function(){const r=rmS().roles;r.on=!r.on;});sw('r2ChEnd',function(){rmS().chEnd=!rmS().chEnd;});sw('r2ChQ',function(){rmS().chQ=!rmS().chQ;});
  const s=el('r2RolesSel'),i=el('r2RolesIn');if(s)s.onchange=function(){rmS().roles.sv=this.value;rxSave();};if(i)i.onchange=function(){rmS().roles.v=this.value.trim().slice(0,80);rxSave();};};}
{const r0=rmRxRender;rmRxRender=function(x){r0.apply(this,arguments);if(!el('r2Roles'))return;const m=rqRm(),ro=m.roles;
  rxSw('r2Roles',ro.on);rxSw('r2ChEnd',m.chEnd);rxSw('r2ChQ',m.chQ);el('r2ChQRow').hidden=!m.chEnd;
  rxHead('rch',!m.chEnd?'Выкл':'Итог в дневник'+(m.chQ?', вопрос':''));
  el('r2RolesVRow').hidden=!ro.on;const nt=nttsOn(),s=el('r2RolesSel'),i=el('r2RolesIn');s.hidden=nt;i.hidden=!nt;
  if(nt){const c=nttsCfg(),p=TTS_PROV[c.prov]||{};i.placeholder='например: '+String(p.voices||'').split(',').map(function(x){return x.trim();}).filter(function(x){return x&&x!==c.voice;})[0]||'';if(document.activeElement!==i)i.value=ro.v;
    el('r2RolesVRowS').textContent='Голос сервиса для реплик (у автора сейчас «'+c.voice+'»). Варианты: '+(p.voices||'');}
  else{const vs=typeof ttsVoices==='function'?ttsVoices():[];s.innerHTML='<option value="">Выберите голос</option>'+vs.map(function(v){return '<option value="'+esc(v.voiceURI)+'"'+(v.voiceURI===ro.sv?' selected':'')+'>'+esc(v.name)+'</option>';}).join('');
    el('r2RolesVRowS').textContent=vs.length>1?'Другой голос телефона для реплик':'На телефоне один русский голос: роли не различить. Можно подключить нейроголос в «Нейросетях»';}};}
/* the cards were built by read-extras.js before this file: build them again with the new rows */
(function(){const c=el('rxCard');if(c&&c.childNodes.length){c.innerHTML='';try{rxRender();}catch(e){console.warn('[rq] rx rebuild',e);}}})();

rmRenderSheet();
