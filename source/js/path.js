'use strict';
/* ================= ПУТЬ ЧИТАТЕЛЯ (сюжетный режим) =================
   Open map of world classics (decision 16.10: everything open, any order, no locks, no fog).
   The catalog lives in code. Progress is a pure read of the library: a path book is the library book whose pathId
   equals the catalog id; «done» = S.finished, percent = rqPos (same as the shelf). Opening the map writes nothing.
   Rewards: chapter titles only (cosmetic, no coins and no extra XP), shown as «звание за главу». */
const PATH_CHAPTERS=[
  /* Джессика 18.10: глава I = греческая литература по хронологии (эпос, лирика, басня, трагедия, философия, роман).
     e = эпоха, y = время, note = пометка в карточке (спорное авторство, примерная дата) */
  {id:'ch1',n:'I',t:'Древняя Греция',rank:'Слушатель рапсодов',books:[
    {id:'iliad',t:'Илиада',a:'Гомер',tr:'пер. Н. И. Гнедича',kb:1397,e:'Эпос',y:'VIII в. до н. э.'},
    {id:'odyssey',t:'Одиссея',a:'Гомер',tr:'пер. В. А. Жуковского',kb:1100,kind:'boss',e:'Эпос',y:'VIII в. до н. э.'},
    {id:'hesiod',t:'Труды и дни',a:'Гесиод',tr:'пер. В. В. Вересаева',kb:74,e:'Эпос',y:'ок. 700 до н. э.'},
    {id:'lyrics',t:'Греческие лирики',a:'Сапфо, Алкей, Анакреонт',tr:'пер. Вяч. Иванова, Л. А. Мея, В. В. Вересаева',kb:27,kind:'side',tag:'Стихи',e:'Лирика',y:'VII–VI в. до н. э.'},
    {id:'aesop',t:'Басни',a:'Эзоп',tr:'пересказ Л. Н. Толстого',kb:21,kind:'side',tag:'Басни',e:'Басня',y:'VI в. до н. э.',note:'Эзоп для историков полулегенда, а сборник его басен собран намного позже.'},
    {id:'prometheus',t:'Скованный Прометей',a:'Эсхил',tr:'пер. Д. С. Мережковского',kb:64,e:'Трагедия',y:'ок. 460 до н. э.',note:'Авторство спорное: многие филологи считают пьесу более поздней, чем Эсхил. Дата примерная.'},
    {id:'antigone',t:'Антигона',a:'Софокл',tr:'пер. Д. С. Мережковского',kb:85,e:'Трагедия',y:'ок. 442 до н. э.',note:'Дата примерная.'},
    {id:'medea',t:'Медея',a:'Еврипид',tr:'пер. И. Ф. Анненского',kb:103,e:'Трагедия',y:'431 до н. э.'},
    {id:'oedipus',t:'Царь Эдип',a:'Софокл',tr:'пер. Д. С. Мережковского',kb:104,e:'Трагедия',y:'ок. 429 до н. э.',note:'Дата примерная.'},
    {id:'apology',t:'Апология Сократа',a:'Платон',tr:'пер. М. С. Соловьёва',kb:104,e:'Философия',y:'после 399 до н. э.'},
    {id:'poetics',t:'Поэтика',a:'Аристотель',tr:'пер. Н. И. Новосадского',kb:133,e:'Философия',y:'ок. 335 до н. э.'},
    {id:'daphnis',t:'Дафнис и Хлоя',a:'Лонг',tr:'пер. Д. С. Мережковского',kb:243,e:'Роман',y:'II–III в. н. э.'}]},
  {id:'ch2',n:'II',t:'Странники и рыцари',rank:'Странствующий рыцарь',books:[
    {id:'inferno',t:'Ад',a:'Данте Алигьери',tr:'пер. Д. Е. Мина',kb:358},
    {id:'hamlet',t:'Гамлет',a:'Уильям Шекспир',tr:'пер. К. Р.',kb:283},
    {id:'quixote',t:'Дон Кихот',a:'Мигель де Сервантес',tr:'пер. В. А. Карелина',kb:3320,kind:'boss'}]},
  {id:'ch3',n:'III',t:'Век романа',rank:'Знаток века',books:[
    {id:'overcoat',t:'Шинель',a:'Н. В. Гоголь',kb:115,kind:'side'},
    {id:'captain',t:'Капитанская дочка',a:'А. С. Пушкин',kb:374},
    {id:'carol',t:'Рождественская песнь',a:'Чарльз Диккенс',tr:'пер. Н. А. Пушешникова',kb:254,kind:'side'},
    {id:'crime',t:'Преступление и наказание',a:'Ф. М. Достоевский',kb:1886,kind:'boss'}]},
  {id:'ch4',n:'IV',t:'На пороге нового века',rank:'Хранитель классики',books:[
    {id:'lapdog',t:'Дама с собачкой',a:'А. П. Чехов',kb:54,kind:'side'},
    {id:'timemachine',t:'Машина времени',a:'Герберт Уэллс',tr:'пер. К. А. Морозовой',kb:313},
    {id:'dorian',t:'Портрет Дориана Грея',a:'Оскар Уайльд',tr:'пер. М. Ф. Ликиардопуло',kb:752},
    {id:'karenina',t:'Анна Каренина',a:'Л. Н. Толстой',kb:3002,kind:'boss'}]}
];
function pathAll(){const out=[];PATH_CHAPTERS.forEach(function(c){c.books.forEach(function(b){out.push(b);});});return out;}
function pathFind(id){let r=null;PATH_CHAPTERS.forEach(function(c){c.books.forEach(function(b){if(b.id===id)r={ch:c,b:b};});});return r;}
/* Anti-cheat (Джессика 17.10: «пробежал книгу на 70% за несколько минут»): the map credits a book only as far as the counted
   reading minutes allow. Counted minutes = S.bookStats[id].min (reader tracker: visible time, per-page cap, fast flips give ~0).
   Even a very fast reader needs kb*1024/PATH_FAST_BPM minutes for the whole book (3× the ~2400 bytes/min average).
   Credited part = min(position, minutes / needed); «прочитано» on the map also needs ≥70 % of that time. Pure read, nothing stored. */
const PATH_FAST_BPM=7200;
function pathCredit(lib,kb){const bs=(S.bookStats||{})[lib.id]||{},m=Number(bs.min)||0;return Math.max(0,Math.min(1,m/Math.max(1,kb*1024/PATH_FAST_BPM)));}
/* read-only view of one path book: {lib, pct, done, pos} */
function pathState(pid){
  const lib=allBooks().find(function(x){return x&&typeof x.pathId==='string'&&x.pathId===pid;})||null; /* unknown or broken pathId = an ordinary book */
  if(!lib)return {lib:null,pct:0,done:false,pos:0};
  const f=pathFind(pid),cr=pathCredit(lib,f?f.b.kb:0),pos=rqPos(lib.id);
  const done=S.finished.includes(lib.id)&&cr>=0.7;
  return {lib:lib,pct:done?100:Math.round(Math.min(pos,cr)*100),done:done,pos:Math.round(pos*100)};
}
/* reading time is an estimate from the file size: ~2400 bytes of Russian UTF-8 per minute */
function pathHours(kb){const m=Math.max(5,Math.round(kb*1024/2400/5)*5);if(m<60)return '≈ '+m+' мин';const h=Math.round(m/60);return '≈ '+h+' '+plural(h,'час','часа','часов');}
function pathSize(kb){return kb<1024?kb+' КБ':(kb/1024).toFixed(1).replace('.',',')+' МБ';}
function pathRank(){let r='';PATH_CHAPTERS.forEach(function(c){if(c.books.every(function(b){return pathState(b.id).done;}))r=c.rank;});return r;}

function renderPath(){
  const all=pathAll(),done=all.filter(function(b){return pathState(b.id).done;}).length;
  const rank=pathRank();
  let h='<div class="pathsum"><div class="pathsum-t"><b>'+done+' из '+all.length+'</b> '+plural(all.length,'книга','книги','книг')+' прочитано</div>'+
    '<div class="bk-bar"><i style="width:'+Math.round(done/all.length*100)+'%"></i></div>'+
    '<div class="pathsum-s">'+(rank?'Звание: <b>'+esc(rank)+'</b>':'Читайте в любом порядке. Карта отмечает то, что вы дочитали.')+'</div></div>';
  h+='<div class="pathsea"><svg class="pathline pathsea-line" aria-hidden="true"></svg>'; /* one sheet for skins that join the chapters (--path-joined:1, Эллада) */
  PATH_CHAPTERS.forEach(function(c){
    const cd=c.books.filter(function(b){return pathState(b.id).done;}).length,full=cd===c.books.length;
    h+='<section class="pathch'+(full?' full':'')+'" data-ch="'+c.id+'">'+
      '<div class="pathch-h"><span class="pathch-n">'+c.n+'</span><div><b>'+esc(c.t)+'</b>'+
      '<div class="pathch-s">'+cd+' из '+c.books.length+' · звание «'+esc(c.rank)+'»</div></div></div>'+
      '<div class="pathmap"><svg class="pathline" aria-hidden="true"></svg>';
    c.books.forEach(function(b,i){
      const st=pathState(b.id),side=i%2?'r':'l';
      const r=b.kind==='boss'?30:(b.kind==='side'?20:25),C=2*Math.PI*r;
      const ic=st.done?'circle-check':(b.kind==='boss'?'castle':(b.kind==='side'?'scroll-text':'book-open'));
      const tag=b.kind==='boss'?'Главная книга главы':(b.kind==='side'?(b.tag||'Рассказ'):'');
      h+='<button type="button" class="pathnode '+side+(b.kind?' '+b.kind:'')+(st.done?' done':(st.lib?' started':''))+'" data-pid="'+b.id+'" onclick="pathOpen(\''+b.id+'\')">'+
        '<span class="pn-dot"><svg viewBox="0 0 '+(2*r+8)+' '+(2*r+8)+'" class="pn-ring"><circle cx="'+(r+4)+'" cy="'+(r+4)+'" r="'+r+'" class="pn-bg"/>'+
        (st.pct&&!st.done?'<circle cx="'+(r+4)+'" cy="'+(r+4)+'" r="'+r+'" class="pn-fg" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+(C*(1-st.pct/100)).toFixed(1)+'" transform="rotate(-90 '+(r+4)+' '+(r+4)+')"/>':'')+
        '</svg>'+rqIcon(ic,b.kind==='boss'?26:(b.kind==='side'?18:22))+
        (st.done?'<i class="pn-ok">'+rqIcon('check',12)+'</i>':(st.lib?'<i class="pn-bar"><b style="width:'+st.pct+'%"></b></i>':''))+'</span>'+ /* status by shape, not only colour: skins may show these */
        '<span class="pn-lab">'+(tag?'<span class="pn-tag">'+tag+'</span>':'')+'<b>'+esc(b.t)+'</b><span class="pn-a">'+esc(b.a)+'</span>'+
        '<span class="pn-p">'+(st.done?'Прочитано':(st.lib?st.pct+'%':pathHours(b.kb)))+'</span></span></button>';
    });
    h+='</div></section>';
  });
  h+='</div>';
  el('pathBox').innerHTML=h;
  requestAnimationFrame(pathLines);
}
/* the road between nodes: one smooth S-curve per pair, drawn after layout (view only).
   A skin may join the chapters into one sheet (--path-joined:1 on #pathBox): then one road runs through the whole map
   and passes under the chapter cartouches; otherwise each chapter card has its own road. */
function pathRoad(box,svg,list){
  const W=box.clientWidth,H=box.clientHeight,br=box.getBoundingClientRect();
  const nodes=list.map(function(n){const d=n.querySelector('.pn-dot').getBoundingClientRect(),r=n.getBoundingClientRect();
    return {x:d.left-br.left+d.width/2,y:d.top-br.top+d.height/2,top:r.top-br.top,bot:r.bottom-br.top,done:n.classList.contains('done'),ch:n.closest('.pathch')};});
  svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('width',W);svg.setAttribute('height',H);
  let s='';
  /* road: down from a dot, across in the gap between rows (never through a label), down into the next dot;
     between chapters it turns right under the last book, above the next chapter's cartouche */
  for(let i=1;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],my=a.ch===b.ch?(a.bot+b.top)/2:a.bot+22,dir=b.x>a.x?1:-1,R=Math.max(0,Math.min(18,Math.abs(b.x-a.x)/2,(my-a.y),(b.y-my)));
    s+='<path d="M'+a.x+' '+a.y+' V'+(my-R)+' Q'+a.x+' '+my+' '+(a.x+dir*R)+' '+my+' H'+(b.x-dir*R)+' Q'+b.x+' '+my+' '+b.x+' '+(my+R)+' V'+b.y+'" class="'+(a.done&&b.done?'on':'')+'"/>';}
  svg.innerHTML=s;
}
function pathLines(){
  const sea=document.querySelector('#pathBox .pathsea');if(!sea)return;
  const joined=getComputedStyle(el('pathBox')).getPropertyValue('--path-joined').trim()==='1';
  sea.querySelector('.pathsea-line').innerHTML='';
  sea.querySelectorAll('.pathmap').forEach(function(m){const svg=m.querySelector('.pathline');if(joined)svg.innerHTML='';else pathRoad(m,svg,Array.from(m.querySelectorAll('.pathnode')));});
  if(joined)pathRoad(sea,sea.querySelector('.pathsea-line'),Array.from(sea.querySelectorAll('.pathnode')));
}
window.addEventListener('resize',function(){if(el('path')&&!el('path').classList.contains('hidden'))pathLines();});

function pathOpen(pid){
  const f=pathFind(pid);if(!f)return;const b=f.b,c=f.ch,st=pathState(pid),has=!!(st.lib&&st.lib.text);
  const tag=b.kind==='boss'?'Главная книга главы':(b.kind==='side'?(b.tag||'Рассказ'):'Книга главы');
  el('bookSheetBody').innerHTML=
    '<div class="bk-head"><div class="cover">'+rqIcon(b.kind==='boss'?'castle':(b.kind==='side'?'scroll-text':'book-open'),28)+'</div><div class="bk-ttl"><b>'+esc(b.t)+'</b>'+
    '<div class="bk-sub">'+esc(b.a)+(b.tr?' · '+esc(b.tr):'')+'</div></div></div>'+
    (st.lib&&!st.done&&st.pos>st.pct?'<div class="bk-note">Открыто на '+st.pos+'%, засчитано '+st.pct+'%. На карте засчитываются только минуты чтения, пролистанные страницы не в счёт.</div>':'')+
    (st.lib?'<div class="bk-prog"><div class="bk-bar"><i style="width:'+st.pct+'%"></i></div><div class="bk-pl"><span><b>'+(st.done?'Прочитано':st.pct+'%')+'</b>'+(st.done?'':' прочитано')+'</span></div></div>':'')+
    '<div class="bk-h">На карте</div><div class="bk-list">'+
    '<div class="bk-row"><span class="bk-k">Глава</span><span class="bk-v">'+c.n+' · '+esc(c.t)+'</span></div>'+
    (b.e?'<div class="bk-row"><span class="bk-k">Эпоха</span><span class="bk-v">'+esc(b.e)+'</span></div>':'')+
    (b.y?'<div class="bk-row"><span class="bk-k">Время</span><span class="bk-v">'+esc(b.y)+'</span></div>':'')+
    '<div class="bk-row"><span class="bk-k">Место</span><span class="bk-v">'+tag+'</span></div>'+
    '<div class="bk-row"><span class="bk-k">Объём</span><span class="bk-v">'+pathHours(b.kb)+' чтения</span></div>'+
    '<div class="bk-row"><span class="bk-k">Звание за главу</span><span class="bk-v">«'+esc(c.rank)+'»</span></div></div>'+
    (b.note?'<div class="bk-note">'+esc(b.note)+'</div>':'')+
    '<div class="bk-note">'+(has?'Книга лежит на телефоне и читается без интернета. Её можно удалить, прогресс останется.':
      (st.lib?'Текст удалён с телефона, прогресс сохранён. Скачайте книгу снова, чтобы продолжить.':
      'Книга бесплатная, из общественного достояния. Скачивается один раз и дальше читается без интернета. Минуты, опыт и серия считаются как у любой книги.'))+'</div>'+
    '<button type="button" class="cta" onclick="pathRead(\''+pid+'\')">'+(has?(st.done?'Открыть':'Продолжить'):(st.lib?'Скачать снова · ':'Скачать на телефон и читать · ')+pathSize(b.kb))+'</button>'+
    (has?'<button type="button" class="pathdel" onclick="pathDrop(\''+pid+'\')">Удалить с телефона · '+pathSize(b.kb)+'</button>':'');
  el('bookSheet').classList.remove('hidden');
}
/* Download on demand (Джессика 16.10): nothing is fetched until the button. The text comes once from books/<id>.txt
   (same origin, not precached, no-store so the browser keeps no second copy) and lives only in IDB, like an imported book.
   The book card carries one extra field pathId (arch.md 16.10). A second tap never adds a second copy.
   «Удалить с телефона» drops only the text body (IDB + memory): the card, progress and «прочитано» stay, so the map is unchanged;
   «Скачать снова» or opening it from the shelf fetches the text again into the same book. */
let pathBusy=false;
async function pathFetch(pid){
  let txt='';
  try{const r=await fetch('books/'+pid+'.txt',{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));txt=await r.text();}
  catch(e){flashMsg(navigator.onLine===false?'Нет сети. Книга скачается один раз, дальше читается без интернета':'Текст этой книги ещё не добавлен','info');return '';}
  if(!txt||txt.length<20){flashMsg('Текст этой книги ещё не добавлен','info');return '';}
  return txt;
}
async function pathRead(pid){
  const f=pathFind(pid);if(!f||pathBusy)return;
  const st=pathState(pid);
  if(st.lib&&st.lib.text){el('bookSheet').classList.add('hidden');openBook(st.lib.id);return;}
  pathBusy=true;
  try{
    if(st.lib){ /* card is on the shelf, its text was deleted from the phone: download into the same book */
      if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Книга открыта в другом окне','info');return;}
      const txt=await pathFetch(pid);if(!txt)return;
      try{await __rq.idb.putText(st.lib.id,txt);}catch(e){flashMsg('Не удалось сохранить книгу: '+(e&&e.message||e),'info');return;}
      st.lib.text=txt;
      el('bookSheet').classList.add('hidden');
      openBook(st.lib.id);return;
    }
    const txt=await pathFetch(pid);if(!txt)return;
    const b={id:newBookId(),title:f.b.t,author:f.b.a,genre:'Путь читателя',stat:'Воображение',cover:'',text:txt,pathId:pid,fname:pid+'.txt',size:txt.length};
    try{await rqAddBook(b);}catch(e){flashMsg('Не удалось добавить книгу: '+(e&&e.message||e),'info');return;}
    el('bookSheet').classList.add('hidden');
    try{renderLibrary();}catch(e){}
    openBook(b.id);
  }finally{pathBusy=false;}
}
async function pathDrop(pid){
  const st=pathState(pid);if(!st.lib||!st.lib.text||pathBusy)return;
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Книга открыта в другом окне','info');return;}
  if(R&&R.book&&R.book.id===st.lib.id)return; /* never under an open reader */
  try{await __rq.idb.delText(st.lib.id);}catch(e){flashMsg('Не удалось удалить: '+(e&&e.message||e),'info');return;}
  delete st.lib.text;
  flashMsg('Книга удалена с телефона. Прогресс сохранён','info');
  pathOpen(pid);
}
