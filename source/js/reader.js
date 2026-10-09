'use strict';
/* ================= НАСТРОЙКИ ЧТЕНИЯ ================= */
let SET;
const SETDEF={font:0,size:19,lh:1.65,theme:'sepia',margin:24,cTxt:null,cBg:null,align:'j',hyph:true,indent:true,ls:0,weight:400,dim:0,nav:null,mvp:true,focusMode:true};
try{SET=Object.assign({},SETDEF,JSON.parse(localStorage.getItem(RQ_K.set)||'{}'));}catch(e){SET=Object.assign({},SETDEF);}
if(!SET.nav)SET.nav={btns:false,tap:true,invert:false,swipe:true};
function saveSet(){try{localStorage.setItem(RQ_K.set,JSON.stringify(SET));}catch(e){}}
function applySet(){
  const t=THEMES[SET.theme]||SHOP_THEMES.find(x=>x.id===SET.theme)||THEMES.sepia;
  const bg=SET.cBg||t.bg, tx=SET.cTxt||t.txt;
  const r=el('reader');
  r.style.setProperty('--r-bg',bg);r.style.setProperty('--r-txt',tx);
  r.style.background=bg;r.style.color=tx;
  r.style.setProperty('--r-margin',SET.margin+'px');
  el('viewer').style.margin=R.mode==='pdf'?'0':'0 '+SET.margin+'px'; /* PDF: full width, no side fields */
  el('dimmer').style.opacity=SET.dim||0;
  const c=el('content');
  c.style.fontFamily=FONTS[SET.font].v;
  c.style.fontSize=SET.size+'px';
  c.style.lineHeight=SET.lh;
  c.style.textAlign=SET.align==='l'?'left':'justify';
  c.style.letterSpacing=(SET.ls||0)+'px';
  c.style.fontWeight=SET.weight||400;
  c.style.hyphens=SET.hyph===false?'none':'auto';
  c.style.webkitHyphens=SET.hyph===false?'none':'auto';
  c.classList.toggle('noind',SET.indent===false);
  c.style.transition='none'; /* Android: never animate the giant column strip (blank-page bug) */
  el('szVal').textContent=SET.size+'px';
  el('lhVal').textContent=SET.lh.toFixed(2);
  el('lsVal').textContent=(SET.ls||0)+'px';
  el('alignJ').classList.toggle('on',SET.align!=='l');
  el('alignL').classList.toggle('on',SET.align==='l');
  el('hyphTgl').classList.toggle('on',SET.hyph!==false);
  el('indTgl').classList.toggle('on',SET.indent!==false);
  el('wLight').classList.toggle('on',SET.weight===300);
  el('wNorm').classList.toggle('on',!SET.weight||SET.weight===400);
  el('wBold').classList.toggle('on',SET.weight===600);
  document.querySelectorAll('#fontSeg button').forEach((b,i)=>b.classList.toggle('on',i===SET.font));
  document.querySelectorAll('#themeSeg .swatch').forEach(b=>b.classList.toggle('on',b.dataset.t===SET.theme&&!SET.cBg&&!SET.cTxt));
  const nv=SET.nav||{};
  el('navBtns').classList.toggle('on',!!nv.btns);
  el('navTap').classList.toggle('on',nv.tap!==false);
  el('navInvert').classList.toggle('on',!!nv.invert);
  el('navSwipe').classList.toggle('on',nv.swipe!==false);
  el('navPrev').classList.toggle('hidden',!nv.btns);
  el('navNext').classList.toggle('hidden',!nv.btns);
}
FONTS.forEach((f,i)=>{
  const b=document.createElement('button');b.textContent=f.label;b.style.fontFamily=f.v;
  b.onclick=()=>{SET.font=i;saveSet();applySet();relayout();};
  el('fontSeg').appendChild(b);
});
function renderThemeSeg(){
  const seg=el('themeSeg');seg.innerHTML='';
  const add=(key,bg,name,locked)=>{
    const b=document.createElement('button');
    b.className='swatch';b.dataset.t=key;b.title=name;
    b.style.background=bg;b.style.boxShadow='inset 0 0 0 1px rgba(255,255,255,.15)';
    if(locked){b.style.opacity=.35;b.textContent='🔒';b.style.fontSize='12px';}
    b.onclick=()=>{
      if(locked){alert('Тема «'+name+'» покупается в Магазине за '+S.cur.name+' '+curI());return;}
      SET.theme=key;SET.cBg=null;SET.cTxt=null;saveSet();applySet();
    };
    seg.appendChild(b);
  };
  Object.keys(THEMES).forEach(k=>add(k,THEMES[k].bg,THEMES[k].name,false));
  SHOP_THEMES.forEach(t=>add(t.id,t.bg,t.name,!S.owned.includes(t.id)));
}
el('szMinus').onclick=()=>{setFontSizeKeepPos(SET.size-1);};
el('szPlus').onclick=()=>{setFontSizeKeepPos(SET.size+1);};
el('lhMinus').onclick=()=>{SET.lh=Math.max(1.2,+(SET.lh-0.1).toFixed(2));saveSet();applySet();relayout();};
el('lhPlus').onclick=()=>{SET.lh=Math.min(2.4,+(SET.lh+0.1).toFixed(2));saveSet();applySet();relayout();};
el('mgMinus').onclick=()=>{SET.margin=Math.max(10,SET.margin-6);saveSet();applySet();relayout();};
el('mgPlus').onclick=()=>{SET.margin=Math.min(80,SET.margin+6);saveSet();applySet();relayout();};
el('lsMinus').onclick=()=>{SET.ls=Math.max(-1,+(((SET.ls||0)-0.5)).toFixed(1));saveSet();applySet();relayout();};
el('lsPlus').onclick=()=>{SET.ls=Math.min(3,+(((SET.ls||0)+0.5)).toFixed(1));saveSet();applySet();relayout();};
el('alignJ').onclick=()=>{SET.align='j';saveSet();applySet();};
el('alignL').onclick=()=>{SET.align='l';saveSet();applySet();};
el('hyphTgl').onclick=()=>{SET.hyph=SET.hyph===false;saveSet();applySet();relayout();};
el('indTgl').onclick=()=>{SET.indent=SET.indent===false;saveSet();applySet();relayout();};
el('wLight').onclick=()=>{SET.weight=300;saveSet();applySet();relayout();};
el('wNorm').onclick=()=>{SET.weight=400;saveSet();applySet();relayout();};
el('wBold').onclick=()=>{SET.weight=600;saveSet();applySet();relayout();};
el('cTxt').oninput=e=>{SET.cTxt=e.target.value;saveSet();applySet();};
el('cBg').oninput=e=>{SET.cBg=e.target.value;saveSet();applySet();};
el('cReset').onclick=()=>{SET.cTxt=null;SET.cBg=null;saveSet();applySet();};
el('btnAa').onclick=()=>{renderThemeSeg();el('sheet').classList.toggle('hidden');};
el('sheetClose').onclick=()=>el('sheet').classList.add('hidden');
/* категории панели оформления — открываем по одной группе */
Array.from(el('setCats').children).forEach(btn=>{
  btn.onclick=()=>{
    const g=btn.dataset.g;
    Array.from(el('setCats').children).forEach(b=>b.classList.toggle('on',b===btn));
    ['grpFont','grpSize','grpText','grpTheme','grpColor','grpNav'].forEach(id=>el(id).classList.toggle('on',id===g));
  };
});
/* навигация при чтении */
function navTurn(d){const inv=(SET.nav&&SET.nav.invert)?-1:1;goPage(R.page+d*inv,true);}
el('navPrev').onclick=()=>navTurn(-1);
el('navNext').onclick=()=>navTurn(1);
el('navBtns').onclick=()=>{SET.nav.btns=!SET.nav.btns;saveSet();applySet();};
el('navTap').onclick=()=>{SET.nav.tap=!(SET.nav.tap!==false);saveSet();applySet();};
el('navInvert').onclick=()=>{SET.nav.invert=!SET.nav.invert;saveSet();applySet();};
el('navSwipe').onclick=()=>{SET.nav.swipe=!(SET.nav.swipe!==false);saveSet();applySet();};

/* ================= ЧИТАЛКА ================= */
let R={book:null,page:0,pageCount:1,step:0,start:0,turned:0,maxRatio:0,mode:'text',pdf:null,zoom:1,rzoom:1,panX:0,panY:0};
async function openBook(id){
  const b0=allBooks().find(x=>x.id===id);if(!b0)return;
  /* Hydrate text body from IDB (single-writer: bodies not in rq_v1 / LS) */
  let b=b0;
  if(b.type!=='pdf'&&!b.text&&__rq&&__rq.idb){
    try{const t=await __rq.idb.getText(b.id);if(typeof t==='string'){b.text=t;b0.text=t;}}catch(e){console.warn(e);}
  }
  if(b.type!=='pdf'&&!b.text){alert('Текст книги не найден в IndexedDB. Импортируйте файл снова.');return;}
  /* 1б: a session still running (reader left without closing, double open) is closed the normal way FIRST —
     one row, its minutes kept, paid — just without the summary (closeReader quiet path, idempotent). */
  if(R.book||(__tracker&&__tracker.isRunning&&__tracker.isRunning())){try{await closeReader({quiet:true});}catch(e){console.warn('[rq] close stale session',e);}}
  S.lastRead=id;S.lastOpen=S.lastOpen||{};S.lastOpen[id]=Date.now();save();
  R={book:b,page:0,pageCount:1,step:0,start:Date.now(),turned:0,maxRatio:(S.progress[id]||{}).ratio||0,mode:b.type==='pdf'?'pdf':'text',pdf:null,zoom:1,rzoom:1,panX:0,panY:0,lastTurn:Date.now(),timerOn:false,timerAccum:0,timerOnAt:0};
  el('rTitle').textContent=b.title+' — '+b.author;
  const c=el('content');
  el('pdfWrap').classList.toggle('hidden',R.mode!=='pdf');
  c.classList.toggle('hidden',R.mode==='pdf');
  el('reader').classList.toggle('pdfmode',R.mode==='pdf');
  c.style.transform='translateX(0)'; /* never show the previous book's offset (blank first frame) */
  show('reader');navPush('reader');applySet();reqWake();resetTimer();armChromeHide();
  if(window.innerWidth<700){enterImmersive();if(!isMvp())flashMsg('📖 Полный экран · тап по центру — показать панель');}
  startDayBar();
  if(R.mode==='pdf'){openPdf(b);return;}
  let body=b.text.split(/\n\n+/).map(p=>'<p>'+esc(p)+'</p>').join('');
  (S.hl[b.id]||[]).forEach(t=>{const k=esc(t);if(body.includes(k))body=body.replace(k,'<mark>'+k+'</mark>');});
  c.innerHTML='<h3>'+esc(b.title)+'</h3><p class="meta">'+esc(b.author)+' · '+esc(b.genre)+'</p>'+body;
  /* measure + position synchronously in the same task: the first painted frame is already the right page */
  layout();
  const p=Math.round(((S.progress[id]||{}).ratio||0)*(R.pageCount-1));
  if(__tracker)__tracker.begin(id,p,trackerOpts());
  goPage(p,false);
}
/** Anti-cheat params for the session tracker (single source of counted minutes). */
function trackerOpts(){
  const a=antiCfg();
  const capMin=isMvp()?MVP_ANTI.maxMin:(a.maxMin||3);
  /* PDF only: active work with the page (pan > 20 % of the screen / zoom change) extends THIS page's cap
     by +1 min, at most once per 60 s, hard ceiling 8 min. Text: flat 3 min. Accounting lives in reader-session.js. */
  const extend=R.mode==='pdf'?{stepMs:60000,everyMs:60000,maxMs:8*60000,minFraction:0.2}:null;
  return {capMs:capMin*60000,minSecMs:(a.minSec||12)*1000,counting:isMvp()||!!R.timerOn,extend:extend};
}
/* thin day-progress bar (MVP): today's sessions[] minutes + live counted minutes of this session */
let dayBarIv=null;
function updDayBar(){
  const bar=el('dayBar');if(!bar||!isMvp())return;
  const run=!!(__tracker&&__tracker.isRunning&&__tracker.isRunning());
  const live=run?__tracker.snapshot().minutes:0;
  const day=(run&&__tracker.getSessionDay&&__tracker.getSessionDay())||today(); /* session day = day it started */
  const pct=Math.max(0,Math.min(1,(dayMin(day)+live)/goalMin()));
  const w=Math.round(pct*1000)/10+'%';
  const i=bar.firstElementChild;if(i&&i.style.width!==w)i.style.width=w;
}
function startDayBar(){clearInterval(dayBarIv);updDayBar();dayBarIv=setInterval(updDayBar,15000);}
function stopDayBar(){clearInterval(dayBarIv);dayBarIv=null;}
