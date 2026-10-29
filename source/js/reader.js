'use strict';
/* ================= НАСТРОЙКИ ЧТЕНИЯ ================= */
let SET;
const SETDEF={font:0,size:19,lh:1.65,theme:'sepia',margin:24,cTxt:null,cBg:null,align:'j',hyph:true,indent:true,ls:0,weight:400,nav:null,mvp:true,focus:'button',pdfDim:0.35,readCounter:true,bright:1,warm:0,pdfFont:false,pdfTheme:false,flip:null,hlc:'y',hlx:null,pauseBtn:true,pauseXY:null};
try{SET=Object.assign({},SETDEF,JSON.parse(localStorage.getItem(RQ_K.set)||'{}'));}catch(e){SET=Object.assign({},SETDEF);}
/* SET.flip (Архитектор 15.10, arch.md): page-turn settings, separate from SET.nav (bottom-bar tabs). Additive, default FLIP_DEF.
   Not an object → dropped (default). Once at load: no flip + nav is the OLD flip object (not a tab list) → copied to flip.
   SET.nav is never deleted or rewritten here; flipping already wiped by the old bug is not restored. Writes: rqSaveSetGated only. */
const FLIP_DEF={btns:false,tap:true,invert:false,swipe:true,mode:'page',anim:'none'},FLIP_KEYS=['btns','tap','invert','swipe'];
/* 16.10 (arch.md «SET.flip.mode и SET.flip.anim»): whitelisted strings in the same object; junk → default */
const FLIP_STR={mode:['page','scroll'],anim:['none','slide','fade','curl']};
function flipFrom(o){const f={};FLIP_KEYS.forEach(function(k){f[k]=typeof o[k]==='boolean'?o[k]:FLIP_DEF[k];});
  Object.keys(FLIP_STR).forEach(function(k){f[k]=FLIP_STR[k].indexOf(o[k])>=0?o[k]:FLIP_DEF[k];});return f;}
function flipNorm(s){
  if(s.flip!=null&&(typeof s.flip!=='object'||Array.isArray(s.flip)))s.flip=null;
  if(s.flip)s.flip=flipFrom(s.flip);
  else if(s.nav&&typeof s.nav==='object'&&!Array.isArray(s.nav)&&FLIP_KEYS.some(function(k){return k in s.nav;})){s.flip=flipFrom(s.nav);return true;}
  return false;}
function flipGet(){return SET&&SET.flip?SET.flip:FLIP_DEF;}
/** 25.10: {x, y} = centre of the pause circle as a share of the screen (0…1, 3 places), else null (default corner) */
function pauseXYNorm(v){if(!v||typeof v!=='object'||typeof v.x!=='number'||typeof v.y!=='number'||!isFinite(v.x)||!isFinite(v.y))return null;
  const c=function(n){return Math.round(Math.max(0,Math.min(1,n))*1000)/1000;};return {x:c(v.x),y:c(v.y)};}
/** Vertical scroll is for text only; PDF stays paged (arch.md). */
function rqScrollMode(){return typeof R!=='undefined'&&R&&R.mode==='text'&&flipGet().mode==='scroll';}
/** The page-turn animation that may run now: null when «Нет», when «Анимации» are off in general settings, or with prefers-reduced-motion. */
function rqAnimKind(){const a=flipGet().anim;if(!a||a==='none')return null;
  if(typeof rqStill==='function'&&rqStill())return null; /* wave 2: «Анимации» off or prefers-reduced-motion */
  return a;}
/* 1б settings contract (same rules as storage/schema.js hydrateSettings) */
function normSet(s){delete s.focusMode;if(['off','button','auto'].indexOf(s.focus)<0)s.focus='button';
  s.pdfDim=(typeof s.pdfDim==='number'&&isFinite(s.pdfDim))?Math.round(Math.max(0,Math.min(0.5,s.pdfDim))*20)/20:0.35;
  if(typeof s.readCounter!=='boolean')s.readCounter=true;
  if(typeof s.pauseBtn!=='boolean')s.pauseBtn=true; /* 25.10 arch.md SET.pauseBtn / SET.pauseXY: the floating pause circle */
  s.pauseXY=pauseXYNorm(s.pauseXY);
  const st=function(v,lo,hi,d){return (typeof v==='number'&&isFinite(v))?Math.round(Math.max(lo,Math.min(hi,v))*20)/20:d;}; /* 18.10 SET.bright / SET.warm */
  s.bright=st(s.bright,0.3,1,1);s.warm=st(s.warm,0,0.6,0);
  /* 20.10 (Джессика): «Затемнение» and «Тёплый только ночью» removed. An old SET.dim is folded into «Яркость» once (same screen:
     1 − (1 − dim)·bright), the warm tint now follows «Тёплый оттенок» on every page; both old keys are dropped */
  if(typeof s.dim==='number'&&isFinite(s.dim)&&s.dim>0)s.bright=st((1-Math.min(0.7,s.dim))*s.bright,0.3,1,1);
  delete s.dim;delete s.warmNight;
  if(typeof s.pdfFont!=='boolean')s.pdfFont=false;if(typeof s.pdfTheme!=='boolean')s.pdfTheme=false; /* 20.10 arch.md SET.pdfFont / SET.pdfTheme */
  s.fz=fzNorm(s.fz); /* 25.10 «Фокус» (arch.md SET.fz) */
  s.presets=rqPresetsNorm(s.presets);s.bookSet=rqBookSetNorm(s.bookSet); /* 29.10 arch.md SET.presets / SET.bookSet */
  s.rx=rqRxNorm(s.rx); /* 29.10 arch.md SET.rx (раздел «Чтение») */
  flipNorm(s);return s;}
/** 25.10 SET.fz (arch.md) = storage/schema.js normFz: pomo on/off, round 15/25/45, rest 3/5/10, quiet, sound slot 0…3 (0 = off; the
 *  slot is the skin's own sound №N), volume 0.05…1, focus words, warning on leaving. Junk → default, unknown keys dropped. */
const FZ_DEF={pomo:false,len:25,rest:5,quiet:false,snd:0,vol:0.5,words:true,warn:true};
function fzNorm(o){const d=FZ_DEF,f={};o=(o&&typeof o==='object'&&!Array.isArray(o))?o:{};
  ['pomo','quiet','words','warn'].forEach(function(k){f[k]=typeof o[k]==='boolean'?o[k]:d[k];});
  f.len=[15,25,45].indexOf(o.len)>=0?o.len:d.len;f.rest=[3,5,10].indexOf(o.rest)>=0?o.rest:d.rest;
  f.snd=[0,1,2,3].indexOf(o.snd)>=0?o.snd:d.snd;
  f.vol=(typeof o.vol==='number'&&isFinite(o.vol))?Math.round(Math.max(0.05,Math.min(1,o.vol))*20)/20:d.vol;return f;}
/* 29.10 (arch.md SET.presets / SET.bookSet): «Мои наборы» and «Только к этой книге» keep only these keys, each checked like the controls clamp it */
const RQ_BOOK_KEYS=['font','size','lh','ls','weight','align','hyph','indent','margin'],RQ_PRESET_KEYS=RQ_BOOK_KEYS.concat(['bright','warm']);
function rqTypoPick(o,keys){const n=function(v,lo,hi,st){return (typeof v==='number'&&isFinite(v))?Math.round(Math.max(lo,Math.min(hi,v))/st)*st:undefined;},r={};
  if(!o||typeof o!=='object'||Array.isArray(o))return r;
  keys.forEach(function(k){const v=o[k];let x;
    if(k==='font')x=(typeof v==='number'&&v>=0&&v<64&&Math.floor(v)===v)?v:undefined;
    else if(k==='size')x=n(v,14,30,1);else if(k==="lh")x=n(v,1.2,2.4,0.05);else if(k==='ls')x=n(v,-1,3,0.5);else if(k==='margin')x=n(v,10,80,1);
    else if(k==='weight')x=[300,400,600].indexOf(v)>=0?v:undefined;else if(k==='align')x=(v==='j'||v==='l')?v:undefined;
    else if(k==='hyph'||k==='indent')x=typeof v==='boolean'?v:undefined;
    else if(k==='bright')x=n(v,0.3,1,0.05);else if(k==='warm')x=n(v,0,0.6,0.05);
    if(x!==undefined)r[k]=(k==='lh'||k==='bright'||k==='warm')?+x.toFixed(2):x;});
  return r;}
function rqPresetsNorm(a){return Array.isArray(a)?a.filter(function(p){return p&&typeof p==='object'&&typeof p.n==='string'&&p.n.trim();}).slice(0,8).map(function(p){return {n:p.n.trim().slice(0,24),v:rqTypoPick(p.v,RQ_PRESET_KEYS)};}):[];}
function rqBookSetNorm(o){const r={};if(!o||typeof o!=='object'||Array.isArray(o))return r;
  Object.keys(o).filter(function(k){return k&&k.length<=200;}).slice(-200).forEach(function(k){const v=rqTypoPick(o[k],RQ_BOOK_KEYS);if(Object.keys(v).length)r[k]=v;});return r;}
/* While a book with its own look is open, SET holds that book's values in memory; rqSetForSave() gives the common values back to
   rq_set / export and puts the book's own into bookSet[id]. RQ_OWN = {id, glob} or null. */
/** 29.10 SET.rx (arch.md «раздел Чтение»): строка внизу, чтение вслух, ночь по расписанию, жесты, меню выделения, экран, новые книги,
 *  выученная скорость. Same rules as storage/schema.js normRx: junk → default, unknown keys dropped. */
const RX_SEL=['colors','note','word','dict','ai','grow','copy'];
function rqRxNorm(o){
  const ob=function(v){return (v&&typeof v==='object'&&!Array.isArray(v))?v:{};},bo=function(v,d){return typeof v==='boolean'?v:d;},
    en=function(v,a){return a.indexOf(v)>=0?v:a[0];},hm=function(v,d){return (typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v))?v:d;},
    nm=function(v){return typeof v==='string'?v.trim().slice(0,24):'';},
    num=function(v,lo,hi){return (typeof v==='number'&&isFinite(v)&&v>=lo&&v<=hi)?Math.round(v*10)/10:null;},
    ids=function(a){return Array.isArray(a)?a.filter(function(x,i){return RX_SEL.indexOf(x)>=0&&a.indexOf(x)===i;}):[];};
  o=ob(o);const f=ob(o.foot),t=ob(o.tts),n=ob(o.night),g=ob(o.gest),s=ob(o.sel),sc=ob(o.screen),fr=ob(o.fresh),sp=ob(o.spd);
  return {
    foot:{page:bo(f.page,true),pct:bo(f.pct,false),clock:bo(f.clock,false),chap:bo(f.chap,false)},
    tts:{rate:(typeof t.rate==='number'&&isFinite(t.rate))?Math.round(Math.max(0.5,Math.min(2,t.rate))*20)/20:1,voice:typeof t.voice==='string'?t.voice.slice(0,200):'',follow:bo(t.follow,true)},
    night:{on:bo(n.on,false),from:hm(n.from,'22:00'),to:hm(n.to,'07:00'),day:(typeof n.day==='string'&&n.day.length<=32)?n.day:''},
    gest:{bright:bo(g.bright,true),pinch:bo(g.pinch,true),dbl:en(g.dbl,['off','night','mark','bars'])},
    sel:{off:ids(s.off),order:ids(s.order),color:['y','g','b','p','o'].indexOf(s.color)>=0?s.color:''},
    screen:{orient:en(sc.orient,['auto','portrait','landscape']),spread:en(sc.spread,['auto','land','off'])},
    fresh:{set:nm(fr.set),pdf:nm(fr.pdf),toc:bo(fr.toc,false)},
    spd:{cpm:num(sp.cpm,100,6000),spp:num(sp.spp,5,1200),n:(typeof sp.n==='number'&&isFinite(sp.n))?Math.max(0,Math.min(1e6,Math.floor(sp.n))):0}
  };
}
function rqRx(){return (SET&&SET.rx)||rqRxNorm(null);}
let RQ_OWN=null;
function rqSetForSave(){if(!RQ_OWN)return SET;const o=Object.assign({},SET,RQ_OWN.glob);o.bookSet=Object.assign({},SET.bookSet);o.bookSet[RQ_OWN.id]=rqTypoPick(SET,RQ_BOOK_KEYS);return o;}
function rqOwnEnter(id){rqOwnLeave();const v=SET.bookSet&&SET.bookSet[id];if(!v||!Object.keys(v).length)return;RQ_OWN={id:id,glob:rqTypoPick(SET,RQ_BOOK_KEYS)};Object.assign(SET,v);}
function rqOwnLeave(){if(!RQ_OWN)return;SET.bookSet=Object.assign({},SET.bookSet);SET.bookSet[RQ_OWN.id]=rqTypoPick(SET,RQ_BOOK_KEYS);Object.assign(SET,RQ_OWN.glob);RQ_OWN=null;}
/** «Только к этой» on: the book keeps the current look, the common one stays as it is; off: the book follows the common look again */
function rqOwnSet(on){const b=typeof R!=='undefined'&&R&&R.book;if(!b)return;
  if(on){if(RQ_OWN)return;RQ_OWN={id:b.id,glob:rqTypoPick(SET,RQ_BOOK_KEYS)};SET.bookSet=Object.assign({},SET.bookSet);SET.bookSet[b.id]=rqTypoPick(SET,RQ_BOOK_KEYS);}
  else{if(RQ_OWN)Object.assign(SET,RQ_OWN.glob);RQ_OWN=null;if(SET.bookSet&&SET.bookSet[b.id]){SET.bookSet=Object.assign({},SET.bookSet);delete SET.bookSet[b.id];}}
  saveSet();}
normSet(SET);
/* the ONE raw NS_set write; called only by the gate below (arch.md 15.10, wave 2) */
function saveSetRaw(){try{localStorage.setItem(RQ_K.set,JSON.stringify(rqSetForSave()));}catch(e){}}
/* user pick → NS_set only through the gate (Архитектор 14.10): writer must exist AND allow. Before __rqReady: applied in memory,
   one flag (no queue); on ready start.js does exactly ONE write with the current SET, again only if the gate allows. */
function rqSaveSetGated(){if(!window.__rqReady){window.__rqSetPending=true;return;}if(window.__rqWriter&&__rqWriter.mayWrite())saveSetRaw();}
function rqFlushSetPending(){if(!window.__rqSetPending)return;window.__rqSetPending=false;if(window.__rqWriter&&__rqWriter.mayWrite())saveSetRaw();}
/* wave 2: saveSet() IS the gate — every settings control (reader, pdf, reader-ui, settings, start, content, library) goes through it */
function saveSet(){rqSaveSetGated();}
/* book language: FB2 <lang> → else Cyrillic in the text → 'ru', else 'en' */
function bookLang(b){if(b&&b.lang&&/^[a-z]{2,3}(-|$)/i.test(b.lang))return b.lang;const t=((b&&b.text)||'').slice(0,4000);const cy=(t.match(/[\u0400-\u04FF]/g)||[]).length,la=(t.match(/[A-Za-z]/g)||[]).length;return cy>=la?'ru':'en';}
const R_TXT2_MAIN=['kraft']; /* «Крафт» #4a3b22 on #e8d9b5 = 7.7 (≥ 4.5 UI, ≥ 7 book; contrast.tsv) */
function applySet(){
  const t=activeTheme();
  const bg=SET.cBg||t.bg, tx=SET.cTxt||t.txt;
  const r=el('reader');
  applySkin(); /* app-wide skin on :root */
  r.style.setProperty('--r-bg',bg);r.style.setProperty('--r-txt',tx);
  r.style.background=bg;r.style.color=tx;
  {const hx=function(v){return /^#[0-9a-f]{6}$/i.test(v||'')?v.toLowerCase():null;},ct=el('cTxt'),cb=el('cBg'); /* 28.10: «Свои цвета» show the colours on the page (day/night drops own colours) */
   if(ct&&hx(tx)&&ct.value!==hx(tx))ct.value=hx(tx);if(cb&&hx(bg)&&cb.value!==hx(bg))cb.value=hx(bg);}
  r.style.setProperty('--r-margin',SET.margin+'px');r.classList.toggle('narrowm',SET.margin<44||R.mode==='pdf');
  if(R.mode==='pdf')el('viewer').style.margin='0';else{el('viewer')._mw=null;rqTextMargin();} /* PDF: full width, no side fields; text: SET.margin, wider on a portrait tablet (audit 19.10 RD-TAB-01) */
  r.dataset.page=!isLightBg(bg)?'night':(t===THEMES.sepia&&!SET.cBg?'sepia':'day'); /* tokens: --r-txt-2, night PDF layer */
  rqLightApply();
  if(typeof rqPdfLook==='function')rqPdfLook(); /* 20.10 SET.pdfFont / SET.pdfTheme */
  /* audit 15.10 (Маня, вариант А): on these page themes the day/night --r-txt-2 is < 4.5 → page number and «автор · жанр» use the theme's own text colour */
  if(R_TXT2_MAIN.indexOf(SET.theme)>=0&&!SET.cBg&&!SET.cTxt)r.style.setProperty('--r-txt-2',t.txt);else r.style.removeProperty('--r-txt-2');
  applyFocusSet();
  {const bp=Math.round((SET.bright==null?1:SET.bright)*100),wp=Math.round((SET.warm||0)*100);
   if(el('brightRange')){el('brightRange').value=bp;el('brightVal').textContent=bp+' %';el('warmRange').value=wp;el('warmVal').textContent=wp+' %';
     /* 22.10: the drawn sliders fill up to the thumb (--p 0…1, app.html #brightRange) */
     el('brightRange').style.setProperty('--p',((bp-30)/70).toFixed(3));el('warmRange').style.setProperty('--p',(wp/60).toFixed(3));}
   const bb=el('barBright');if(bb){bb.value=bp;bb.style.setProperty('--v',Math.round((bp-30)/70*100)+'%');}}
  {const nt=r.dataset.page==='night';el('btnDayNight').querySelector('use').setAttribute('href',nt?'#i-sun':'#i-moon');el('btnDayNightL').textContent=nt?'День':'Ночь';
   el('btnAaL').textContent=R.mode==='pdf'?'Вид':'Шрифт';rqSyncSwitches();}
  const c=el('content');
  c.style.fontFamily=(FONTS[SET.font]||FONTS[0]).v; /* audit 19.10 SK-01: the book face never comes from the skin (skins dress the chrome only) */
  rqFontWait();
  c.style.fontSize=SET.size+'px';
  c.style.lineHeight=SET.lh;
  rqTextAlign();
  c.style.letterSpacing=(SET.ls||0)+'px';
  c.style.fontWeight=SET.weight||400;
  c.style.hyphens=SET.hyph===false?'none':'auto';
  c.style.webkitHyphens=SET.hyph===false?'none':'auto';
  c.classList.toggle('noind',SET.indent===false);
  c.style.transition='none'; /* Android: never animate the giant column strip (blank-page bug) */
  el('szVal').textContent=SET.size;
  el('lhVal').textContent=SET.lh.toFixed(2);
  el('lsVal').textContent=(SET.ls||0);
  if(el('mgVal'))el('mgVal').textContent=SET.margin;
  el('alignJ').classList.toggle('on',SET.align!=='l');
  el('alignL').classList.toggle('on',SET.align==='l');
  rqSw('hyphTgl',SET.hyph!==false);
  rqSw('indTgl',SET.indent!==false);
  el('wLight').classList.toggle('on',SET.weight===300);
  el('wNorm').classList.toggle('on',!SET.weight||SET.weight===400);
  el('wBold').classList.toggle('on',SET.weight===600);
  document.querySelectorAll('#fontSeg button').forEach((b,i)=>b.classList.toggle('on',i===SET.font));
  try{rqCollapseSync('fontSeg');}catch(e){}
  document.querySelectorAll('#themeSeg .swatch').forEach(b=>b.classList.toggle('on',b.dataset.t===themeBase(SET.theme)&&!SET.cBg&&!SET.cTxt));
  const nv=flipGet();
  rqSw('navBtns',!!nv.btns);
  rqSw('navTap',nv.tap!==false);
  rqSw('navInvert',!!nv.invert);
  rqSw('navSwipe',nv.swipe!==false);
  {const pdf=R&&R.mode==='pdf';
   document.querySelectorAll('#flipModeSeg button').forEach(function(b){b.classList.toggle('on',b.dataset.v===nv.mode);b.disabled=false;});
   const mn=el('flipModeNote');if(mn){const t=pdf&&nv.mode==='scroll'?'В PDF при прокрутке масштаб не меняется; чтобы приблизить страницу, выберите «Страницы».':'';mn.hidden=!t;mn.textContent=t;}
   document.querySelectorAll('#flipAnimSeg button').forEach(function(b){b.classList.toggle('on',b.dataset.v===nv.anim);});
   const an=el('flipAnimNote');if(an){let t='';if(nv.anim!=='none'&&!rqAnimKind())t=(S.ux&&S.ux.anim===false)?'Сейчас не видно: анимации выключены в общих настройках.':'Сейчас не видно: в телефоне включено «Убрать анимацию».';
     else if(nv.anim!=='none'&&nv.mode==='scroll'&&!pdf)t='В прокрутке тап по краю прокручивает плавно.';an.hidden=!t;an.textContent=t;}
   el('reader').classList.toggle('scrollmode',rqScrollMode());}
  el('navPrev').classList.toggle('hidden',!nv.btns);
  el('navNext').classList.toggle('hidden',!nv.btns);
  if(typeof hlPaintCustom==='function')hlPaintCustom(); /* 20.10: own quote colours follow the page theme */
}
/* 28.10: a bundled reading font (fonts/, Lora, Nunito…) loads lazily — the first layout would use the fallback face and the pages
   would not match the text drawn a moment later. Once it is loaded: ONE re-layout that keeps the reading position (anchor). */
function rqFontWait(){
  const f=(FONTS[SET.font]||FONTS[0]).v,sp=(SET.weight||400)+' 20px '+f;if(rqFontWait.k===sp)return;rqFontWait.k=sp;
  if(!document.fonts||!document.fonts.load)return;let ok=true;try{ok=document.fonts.check(sp,'Аб');}catch(e){}if(ok)return;
  document.fonts.load(sp,'Аб').then(function(){if(rqFontWait.k!==sp||!R||R.mode==='pdf'||el('reader').classList.contains('hidden'))return;relayout({force:true});}).catch(function(){});
}
/* switch rows in «Настройки чтения» (16.10): state = aria-checked (+ class on for older code) */
function rqSw(id,on){const b=el(id);if(!b)return;b.classList.toggle('on',!!on);b.setAttribute('aria-checked',on?'true':'false');}
FONTS.forEach((f,i)=>{
  /* list row (mockup sf-1g-fonts): sample + name in that font, check on the current one; ≥44px */
  const b=document.createElement('button');b.type='button';b.className='xopt';b.dataset.k=String(i);
  b.innerHTML='<span class="xs" aria-hidden="true">Аа</span><span class="xn">'+esc(f.label)+'</span><span class="xm" aria-hidden="true">'+rqIcon('check',20)+'</span>';
  b.querySelector('.xs').style.fontFamily=f.v;b.querySelector('.xn').style.fontFamily=f.v;
  b.onclick=()=>{SET.font=i;rqSaveSetGated();applySet();relayout();}; /* one saveSet, through the write gate (deferred until ready) */
  el('fontSeg').appendChild(b);
});
rqCollapse('fontSeg','Шрифт',function(){return (FONTS[SET.font]||FONTS[0]).label;},null,{pill:true,font:function(){return (FONTS[SET.font]||FONTS[0]).v;}}); /* 20.10 (Джессика): a row like its neighbours — label left, no «Aa», value in a plaque */
function renderThemeSeg(){
  const seg=el('themeSeg');seg.innerHTML='';
  const add=(key,bg,name,locked,yours)=>{
    const b=document.createElement('button');
    b.className='swatch';b.dataset.t=key;b.title=name;
    b.style.background=bg;b.style.boxShadow='inset 0 0 0 1px rgba(255,255,255,.15)';
    if(locked){b.style.opacity=.35;b.innerHTML=rqIcon('lock',14);}
    if(THEMES[key]&&THEMES[key].skin==='pencil'){b.classList.add('sw-pencil');b.innerHTML=rqIcon('pencil',15);b.setAttribute('aria-label',name);} /* tells it apart from «Светлая» */
    else if(SKIN_THEMES[key]){b.classList.add('sw-pencil');b.style.color=SKIN_THEMES[key].txt;b.innerHTML=rqIcon(SKIN_THEMES[key].icon,15);b.setAttribute('aria-label',name);} /* bought shop skin */
    b.onclick=()=>{
      if(locked){rqAlert('Тема «'+name+'» покупается в Магазине за '+'монетах');return;}
      const from=skinOf(activeTheme());
      SET.theme=key;SET.cBg=null;SET.cTxt=null;saveSet();applySet();logSkinChange(from);
    };
    if(yours){b.classList.add('yours');b.title='Ваша тема: '+name;const w=document.createElement('span');w.className='yourwrap';w.appendChild(b);
      const c=document.createElement('small');c.textContent='Ваша тема';w.appendChild(c);seg.appendChild(w);return;}
    /* audit 19.10 RD-SET-02: a caption under every swatch and a tick on the picked one (not told by colour alone) */
    const w=document.createElement('span');w.className='swwrap';w.appendChild(b);
    const k=document.createElement('span');k.className='swchk';k.setAttribute('aria-hidden','true');k.innerHTML=rqIcon('check',12);w.appendChild(k);
    const c=document.createElement('small');c.textContent=name;w.appendChild(c);w.onclick=function(e){if(e.target!==b&&!b.contains(e.target))b.click();};
    seg.appendChild(w);
  };
  Object.keys(THEMES).forEach(k=>add(k,THEMES[k].bg,THEMES[k].name,false));
  Object.keys(SKIN_THEMES).filter(k=>!SKIN_THEMES[k].night&&skinTheme(k)).forEach(k=>add(k,SKIN_THEMES[k].bg,SKIN_THEMES[k].name,false)); /* bought shop skins */
  /* 1в: a bought paid theme that is saved as the current one stays, as a highlighted «Ваша тема» swatch */
  {const o=ownedShopTheme(SET.theme);if(o)add(o.id,o.bg,o.name,false,true);}
  seg.querySelectorAll('.swatch').forEach(b=>b.classList.toggle('on',b.dataset.t===themeBase(SET.theme)&&!SET.cBg&&!SET.cTxt)); /* rebuilt swatches keep the current mark */
  /* shop build: the 9 old themes (OLD_THEMES) are free; a saved one shows as «Ваша тема»;
     «Карандашный» (free skin) will be added here when it lands (product.md: after 1в). */
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
/* 1в: «Настройки чтения» — Aa opens «Текст» (PDF: «Страница»), the gear opens the last tab; «Общие настройки» = the settings screen over the reader */
let setTab='grpText';
function openSetTab(g){setTab=g;Array.from(el('setCats').children).forEach(b=>{const on=b.dataset.g===g;b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false');});
  ['grpText','grpPage','grpNav','grpFocus'].forEach(id=>el(id).classList.toggle('on',id===g));
  if(g==='grpFocus'&&typeof fzRenderTab==='function')fzRenderTab();}
function openReaderSettings(g){
  const sh=el('sheet');
  if(!sh.classList.contains('hidden')&&(!g||g===setTab)){sh.classList.add('hidden');return;}
  renderThemeSeg();renderSettings();openSetTab(g||setTab);el('panel').classList.add('hidden');sh.classList.remove('hidden');
}
el('btnAa').onclick=()=>openReaderSettings(R.mode==='pdf'?'grpPage':'grpText');
el('btnSet').onclick=()=>openReaderSettings(null);
el('btnDayNight').onclick=()=>toggleDayNight();
/* «Общие настройки» row removed (14.10): general settings are reached only from the drawer's «Настройки» */
/* 18.10 (arch.md SET.bright / SET.warm): «Яркость» = the #dimmer layer, warm tint layer #warmer on every page (20.10: no «Затемнение», no «только ночью») */
function rqLightApply(){
  const b=SET.bright==null?1:SET.bright;
  el('dimmer').style.opacity=+(1-b).toFixed(3);
  const w=el('warmer');if(w)w.style.opacity=SET.warm||0;
}
el('brightRange').oninput=e=>{SET.bright=Math.max(0.3,Math.min(1,(parseInt(e.target.value,10)||100)/100));applySet();};
el('brightRange').onchange=()=>saveSet();
/* 20.10: the same «Яркость» under the top bar (ReadEra-like); the bars stay up while it is dragged */
el('barBright').oninput=e=>{SET.bright=Math.max(0.3,Math.min(1,(parseInt(e.target.value,10)||100)/100));applySet();if(typeof armChromeHide==='function')armChromeHide();};
el('barBright').onchange=()=>saveSet();
/* 28.10 (Джессика): the suns at the ends of the bar slider step «Яркость» by 10 % (left darker, right brighter), with the same «Яркость N %» note as the edge drag */
['barBrightLo','barBrightHi'].forEach(function(id,i){const b=el(id);if(!b)return;b.onclick=function(){const v=SET.bright==null?1:SET.bright;
  SET.bright=Math.round(Math.max(0.3,Math.min(1,v+(i?0.1:-0.1)))*20)/20;saveSet();applySet();if(typeof armChromeHide==='function')armChromeHide();
  const p=Math.round(SET.bright*100);flashMsg('Яркость '+p+'%'+(p>=100&&i?' — максимум':p<=30&&!i?' — минимум':''),{kind:'info',icon:'sun'});
  b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump');setTimeout(function(){b.classList.remove('bump');},160);};});
el('warmRange').oninput=e=>{SET.warm=Math.max(0,Math.min(0.6,(parseInt(e.target.value,10)||0)/100));applySet();};
el('warmRange').onchange=()=>saveSet();
el('pdfFontTgl').onclick=()=>{SET.pdfFont=!SET.pdfFont;saveSet();applySet();}; /* 20.10 arch.md SET.pdfFont / SET.pdfTheme */
el('pdfThemeTgl').onclick=()=>{SET.pdfTheme=!SET.pdfTheme;saveSet();applySet();};
el('sheetClose').onclick=()=>el('sheet').classList.add('hidden');
/* 20.10 (Джессика): swipe down closes «Настройки чтения» — from the head (grab, title, tabs) any time, from the rows when the sheet is
   scrolled to the very top; sliders keep their own drag. Past 90 px or a quick flick → closed, else it springs back */
(function(){const sh=el('sheet');let y0=0,t0=0,dy=0,on=false;
  const end=function(){if(!on)return;on=false;sh.classList.remove('drag');
    if(dy>90||(dy>30&&Date.now()-t0<250)){sh.classList.add('hidden');sh.style.transform='';}
    else{sh.classList.add('snap');sh.style.transform='';setTimeout(function(){sh.classList.remove('snap');},200);}dy=0;};
  sh.addEventListener('touchstart',function(e){on=false;dy=0;if(e.touches.length!==1)return;const t=e.target;
    if(t.closest&&t.closest('input[type=range],select,textarea'))return;
    if(!(t.closest&&t.closest('#sheetHd'))&&sh.scrollTop>0)return;
    y0=e.touches[0].clientY;t0=Date.now();on=true;},{passive:true});
  sh.addEventListener('touchmove',function(e){if(!on)return;const d=e.touches[0].clientY-y0;
    if(d<=0){if(dy>0){dy=0;sh.style.transform='';}if(!e.target.closest('#sheetHd'))on=false;return;}
    dy=d;sh.classList.add('drag');sh.style.transform='translateY('+d+'px)';if(e.cancelable)e.preventDefault();},{passive:false});
  sh.addEventListener('touchend',end);sh.addEventListener('touchcancel',end);
})();
/* категории панели оформления — открываем по одной группе */
Array.from(el('setCats').children).forEach(btn=>{btn.onclick=()=>openSetTab(btn.dataset.g);});
/* навигация при чтении */
function navTurn(d){goPage(R.page+d,true);} /* 28.10: ‹ › всегда назад/вперёд; «Поменять стороны» — только тапы */
el('navPrev').onclick=()=>navTurn(-1);
el('navNext').onclick=()=>navTurn(1);
/* page-turn switches → SET.flip, written only through the gate (Архитектор 15.10) */
function flipSet(k){SET.flip=Object.assign({},flipGet());SET.flip[k]=!SET.flip[k];rqSaveSetGated();applySet();}
el('navBtns').onclick=()=>flipSet('btns');
el('navTap').onclick=()=>flipSet('tap');
el('navInvert').onclick=()=>flipSet('invert');
el('navSwipe').onclick=()=>flipSet('swipe');
/* 16.10: «Как листать» / «Анимация» — strings in SET.flip, through the gate; switching the mode re-lays the text at the same place */
function flipPick(k,v){if(flipGet()[k]===v)return;const anchor=(k==='mode'&&R&&R.mode==='text'&&R.book)?readingAnchor():null;
  SET.flip=Object.assign({},flipGet());SET.flip[k]=v;rqSaveSetGated();applySet();
  if(anchor||(k==='mode'&&R&&R.book&&R.mode==='text'))relayout({force:true,anchor:anchor});
  if(k==='mode'&&R&&R.book&&R.mode==='pdf'&&typeof psSwitch==='function')psSwitch();}
document.querySelectorAll('#flipModeSeg button').forEach(function(b){b.onclick=function(){if(!b.disabled)flipPick('mode',b.dataset.v);};});
document.querySelectorAll('#flipAnimSeg button').forEach(function(b){b.onclick=function(){flipPick('anim',b.dataset.v);};});

/* ================= ЧИТАЛКА ================= */
let R={book:null,page:0,pageCount:1,step:0,start:0,turned:0,maxRatio:0,mode:'text',pdf:null,zoom:1,rzoom:1,panX:0,panY:0};
/** 1б-144: progress entry = {ratio: farthest SETTLED page (monotonic; finish / stats), pos: current settled position (reopen, card %)}.
    Old entries without pos (schemaVersion 1, no repair) reopen at ratio as before. */
function rqPos(id){const p=S.progress[id]||{};return typeof p.pos==='number'&&isFinite(p.pos)?p.pos:(p.ratio||0);}
async function openBook(id){
  const b0=allBooks().find(x=>x.id===id);if(!b0)return;
  /* Hydrate text body from IDB (single-writer: bodies not in rq_v1 / LS) */
  let b=b0;
  if(b.type!=='pdf'&&!b.text&&__rq&&__rq.idb){
    try{const t=await __rq.idb.getText(b.id);if(typeof t==='string'){b.text=t;b0.text=t;}}catch(e){console.warn(e);}
  }
  if(b.type!=='pdf'&&!b.text&&typeof b.pathId==='string'&&typeof pathFind==='function'&&pathFind(b.pathId)){pathRead(b.pathId);return;} /* «Путь читателя»: text was deleted from the phone → download it again */
  if(b.type!=='pdf'&&!b.text){rqAlert('Текст книги не найден в IndexedDB. Импортируйте файл снова.');return;}
  /* 1б: a session still running (reader left without closing, double open) is closed the normal way FIRST —
     one row, its minutes kept, paid — just without the summary (closeReader quiet path, idempotent). */
  if(R.book||(__tracker&&__tracker.isRunning&&__tracker.isRunning())){try{await closeReader({quiet:true});}catch(e){console.warn('[rq] close stale session',e);}}
  const fresh=!S.progress[id]&&!(S.lastOpen&&S.lastOpen[id]); /* 29.10 SET.rx.fresh: the first open of this book */
  S.lastRead=id;S.lastOpen=S.lastOpen||{};S.lastOpen[id]=Date.now();save();
  R={book:b,page:0,pageCount:1,step:0,start:Date.now(),turned:0,maxRatio:(S.progress[id]||{}).ratio||0,pos:rqPos(id),mode:b.type==='pdf'?'pdf':'text',pdf:null,zoom:1,rzoom:1,panX:0,panY:0,lastTurn:Date.now(),timerOn:false,timerAccum:0,timerOnAt:0};
  el('rTitle').textContent=bookAuthor(b)?b.title+' — '+bookAuthor(b):b.title;
  const c=el('content');
  el('pdfWrap').classList.toggle('hidden',R.mode!=='pdf');
  c.classList.toggle('hidden',R.mode==='pdf');
  el('reader').classList.toggle('pdfmode',R.mode==='pdf');
  c.style.transform='translateX(0)'; /* never show the previous book's offset (blank first frame) */
  el('viewer').scrollTop=0;el('reader').classList.toggle('scrollmode',rqScrollMode());
  hideJumpBack(); /* 1б-fix #1: plaque never survives into another open */
  if(fresh&&typeof rxFresh==='function')rxFresh(b);
  rqOwnEnter(b.id); /* 29.10: the book's own look (SET.bookSet) */
  show('reader');navPush('reader');applySet();reqWake();resetTimer();armChromeHide();
  if(window.innerWidth<700){enterImmersive();if(!isMvp())flashMsg('Полный экран · тап по центру — показать панель');}
  startDayBar();
  if(R.mode==='pdf'){openPdf(b);return;}
  let body=rqBodyHtml(b); /* 28.10: paragraphs of any TXT (Windows line breaks, a paragraph per line), chapter titles, pictures */
  {const seen={};(S.hl[b.id]||[]).forEach(t=>{const k=esc(t),j=seen[t]=(seen[t]||0)+1,q=hlSame(b.id,t)[j-1];
    if(hlHas(body,hlPieces(t)[0]))body=hlPutQ(body,t,q&&q.n,quoteColor(b.id,t,j-1));});} /* 20.10: in the quote's colour; 21.10: at its own occurrence (q.n) */
  c.innerHTML='<h3>'+esc(b.title)+'</h3><p class="meta">'+[bookAuthor(b),b.genre].filter(Boolean).map(esc).join(' · ')+'</p>'+body;
  c.lang=bookLang(b); /* hyphens:auto needs a language on the text block */
  hlPaintCustom(); /* own quote colours on this page */
  rqBookImgs(b);
  /* measure + position synchronously in the same task: the first painted frame is already the right page */
  const hy=hyphWaitStart(c,b);
  layout();
  const p=Math.round(rqPos(id)*(R.pageCount-1)); /* reopen at the current position, not the farthest page */
  if(__tracker)__tracker.begin(id,p,trackerOpts());
  pauseReset(); /* 25.10: a new book starts counting, the circle shows if it is on */
  if(typeof fzOnOpen==='function')fzOnOpen(); /* 25.10 «Фокус»: new session = no rounds yet; the chosen sound */
  goPage(p,false);
  if(hy)hyphWaitRun(hy,p);
}
/* 28.10 (ревизия чтения): text → paragraphs with their offsets in b.text.
   A blank line splits paragraphs (also «\r\n\r\n» from Windows and lines of spaces). A text with (almost) no blank lines is either
   «one paragraph per line» or hard-wrapped lines whose paragraphs start with an indent (lib.ru): then an indented line starts one. */
function rqParas(t){
  t=String(t||'');const L=[];let i=0;
  while(i<=t.length){let j=t.indexOf('\n',i);if(j<0)j=t.length;let e=j;if(e>i&&t.charCodeAt(e-1)===13)e--;L.push({off:i,s:t.slice(i,e)});i=j+1;}
  let blank=0,full=0,ind=0;L.forEach(function(l){if(!l.s.trim())blank++;else{full++;if(/^[ \t 　]/.test(l.s))ind++;}});
  const mode=full<3||blank>=full*0.2?'blank':(ind>=full*0.1&&ind<=full*0.85?'indent':'line');
  const out=[];let cur=null;
  L.forEach(function(l){const s=l.s.trim();if(!s){cur=null;return;}
    if(!cur||mode==='line'||(mode==='indent'&&/^[ \t 　]/.test(l.s))){cur={off:l.off+l.s.indexOf(s.charAt(0)),s:s};out.push(cur);}
    else cur.s+='\n'+s;});
  return out;
}
/** the book body as HTML: <p> per paragraph; a paragraph where a chapter of tocOf starts is its title (.rq-h, data-toc);
    «￼img:N» (FB2 / EPUB picture, js/content.js) → an <img> filled from IDB after the layout */
function rqBodyHtml(b){
  const toc=(typeof tocOf==='function'?tocOf(b):[])||[],heads={};toc.forEach(function(x,i){if(typeof x.off==='number'&&!(x.off in heads))heads[x.off]=i;});
  const ps=rqParas(b.text),hs=Object.keys(heads).map(Number).sort(function(a,z){return a-z;});let k=0;
  return ps.map(function(p,n){
    if(p.s.charCodeAt(0)===0x2063)return '<p class="rq-bitr" lang="ru">'+esc(p.s)+'</p>'; /* 25.10: translation under each paragraph (adv.js, «с переводом») */
    const im=/^￼img:(\d+)$/.exec(p.s);if(im)return '<p class="rq-img"><img data-img="'+im[1]+'" alt=""></p>';
    const end=n+1<ps.length?ps[n+1].off:Infinity;let h=-1;
    while(k<hs.length&&hs[k]<end){if(hs[k]>=p.off-2&&h<0)h=heads[hs[k]];k++;}
    return h>=0?'<p class="rq-h" data-toc="'+h+'">'+esc(p.s)+'</p>':'<p'+(rqVerse(p.s)?' class="rq-vs"':'')+'>'+esc(p.s)+'</p>';}).join('');
}
/* 28.10 (Джессика: копирование «во всех форматах»): a TXT stanza — short lines of a paragraph (≤ 55 letters, ~40 on average) — keeps its
   lines on the page and in the copy (white-space:pre-line); longer lines are a hard-wrapped paragraph and flow as before */
function rqVerse(s){const ls=String(s).split('\n');if(ls.length<2)return false;let mx=0,sum=0;ls.forEach(function(x){mx=Math.max(mx,x.length);sum+=x.length;});return mx<=55&&sum/ls.length<=40;}
/* pictures of this book: blobs in IDB «img:<book>:<n>» (written once on import); a missing one hides its paragraph.
   Their size is known only once loaded → ONE re-layout that keeps the reading position. */
function rqBookImgs(b){
  const c=el('content'),ims=[...c.querySelectorAll('img[data-img]')];if(!ims.length||typeof idbGet!=='function')return;
  Promise.all(ims.map(function(im){return idbGet('img:'+b.id+':'+im.dataset.img).then(function(v){
      if(!v||!R.book||R.book.id!==b.id){im.parentNode.classList.add('gone');return;}
      return new Promise(function(res){im.onload=im.onerror=function(){if(!im.naturalWidth)im.parentNode.classList.add('gone');res();};im.src=URL.createObjectURL(v instanceof Blob?v:new Blob([v]));});
    }).catch(function(){im.parentNode.classList.add('gone');});}))
  .then(function(){if(R.book&&R.book.id===b.id&&!el('reader').classList.contains('hidden'))relayout({force:true});});
}
/* 1в: hyphenation dictionaries load lazily — the first layout of a cold start is unhyphenated.
   A hidden probe (same lang, hyphens:auto, narrow) tells when the dictionary is applied; then ONE silent
   relayout keeps the same text line. Silent = no goPage: R.pos / R.maxRatio / persistPage / tracker untouched.
   The page stays under «Открываем страницу N» until then (safety timeout HYPH_MAX_MS). */
/* HY: survives `R=` on every open; relayouts/fallbacks are cumulative counters (tests, diag) */
const HY=window.__rqHyph={tok:0,relayouts:0,fallbacks:0,off:-1};
const HYPH_MAX_MS=3000; /* no dictionary by then → drop the placeholder WITHOUT relayout */
/* text offset ↔ page: global char offset over the non-blank text nodes of #content (no hit-testing, so it
   works under the placeholder). Page of an offset is monotonic → binary search for the first char of a page. */
function txtNodes(){const c=el('content'),w=document.createTreeWalker(c,NodeFilter.SHOW_TEXT,{acceptNode:n=>/\S/.test(n.nodeValue)?1:3});const a=[];let n,o=0;while((n=w.nextNode())){a.push({n:n,s:o});o+=n.nodeValue.length;}return {a:a,len:o};}
function txtAt(T,off){let lo=0,hi=T.a.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(T.a[m].s<=off)lo=m;else hi=m-1;}const x=T.a[lo];return x?{node:x.n,offset:Math.min(off-x.s,x.n.nodeValue.length-1)}:null;}
function pageOfOffset(T,off){return pageOfAnchor(txtAt(T,off));}
function firstOffsetOfPage(pg){const T=txtNodes();let lo=0,hi=Math.max(0,T.len-1);while(lo<hi){const m=(lo+hi)>>1;if(pageOfOffset(T,m)>=pg)hi=m;else lo=m+1;}return lo;}
function hyphProbe(lang,word,mode){const d=document.createElement('div');d.lang=lang;d.setAttribute('aria-hidden','true');
  d.style.cssText='position:absolute;left:-9999px;top:0;visibility:hidden;width:3ch;font:16px serif;hyphens:'+mode+';-webkit-hyphens:'+mode;
  d.textContent=word;document.body.appendChild(d);return d;}
/* Маня 15.10 + arch.md: justified only once the hyphenation dictionary for the book's language really works — class rq-hyph-<lang> on <html>,
   set from the probe (@supports cannot tell). Without it (or with hyphenation off) the text is left-aligned: no rivers of spaces.
   The class lives only in the DOM (never in S / localStorage / export). */
function hyphOk(lang){return !!lang&&document.documentElement.classList.contains('rq-hyph-'+lang);}
function rqTextAlign(){const c=el('content');c.style.textAlign=(SET.align!=='l'&&SET.hyph!==false&&hyphOk(c.lang))?'justify':'left';}
function hyphMark(lang){if(lang)document.documentElement.classList.add('rq-hyph-'+lang);rqTextAlign();}
function hyphWaitStart(c,b){
  rqTextAlign(); /* this book's language: justified only if its dictionary is already known to work */
  if(SET.hyph===false)return null;
  const w=((b.text||'').slice(0,4000).match(/[\p{L}]{12,}/u)||[])[0]||(c.lang==='ru'?'конфискованными':'representatives');
  const on=hyphProbe(c.lang,w,'auto'),off=hyphProbe(c.lang,w,'none');
  /* test hooks: __rqHyphNoDict = dictionary never arrives; __rqHyphDelay = N ms = dictionary arrives late
     (the text is laid out unhyphenated until then, as on a cold start without the dictionary) */
  const t0=Date.now(),late=+window.__rqHyphDelay||0;
  if(late){c.style.hyphens=c.style.webkitHyphens='none';}
  const ready=()=>!window.__rqHyphNoDict&&(late?Date.now()-t0>=late:on.offsetHeight>off.offsetHeight);
  if(ready()){on.remove();off.remove();hyphMark(c.lang);return null;} /* dictionary already applied → justified, the first layout is final */
  const t=el('txtBack');if(t){el('txtBackN').textContent='Открываем страницу '+((R.page||0)+1);t.classList.remove('hidden');}
  return {on:on,off:off,ready:ready,book:b,t0:t0,late:late,done:false,tok:(++HY.tok)};
}
function hyphWaitRun(h,p){
  const t=el('txtBack');if(t)el('txtBackN').textContent='Открываем страницу '+(p+1);
  setTimeout(function(){if(!h.done&&HY.tok===h.tok&&t&&!t.classList.contains('hidden'))el('txtBackN').textContent='Готовим вёрстку… большая книга';},5000); /* audit 19.10 RD-LOAD-01 */
  const fin=(relay)=>{if(h.done)return;h.done=true;h.on.remove();h.off.remove(); /* once per open, whatever fires first */
    if(HY.tok!==h.tok)return; /* a newer open owns the placeholder */
    if(!R.book||R.book.id!==h.book.id||R.mode==='pdf'||el('reader').classList.contains('hidden')){if(t)t.classList.add('hidden');return;}
    if(relay){
      const off=firstOffsetOfPage(R.page); /* char offset of the first visible line */
      if(h.late){const c=el('content');c.style.hyphens=c.style.webkitHyphens='auto';}
      hyphMark(el('content').lang); /* dictionary works now → justify, in the same silent re-layout */
      layout();
      let np=pageOfOffset(txtNodes(),off);if(np<0)np=R.page;
      np=Math.max(0,Math.min(R.pageCount-1,np));R.page=np;R.anc=null;
      rqShowPage(np,null);
      el('rPage').textContent=el('pgNum').textContent=(np+1)+' / '+R.pageCount;
      const sl=el('pgSlider');sl.max=Math.max(0,R.pageCount-1);sl.value=np;if(typeof pgArtSync==='function')pgArtSync();
      HY.off=off;HY.relayouts++; /* silent: no goPage → R.pos / R.maxRatio / persist / tracker untouched */
    }
    else HY.fallbacks++;
    if(t)t.classList.add('hidden');
  };
  let fontsOk=false;
  const tick=()=>{if(h.done)return;if(HY.tok!==h.tok){fin(false);return;}
    if(fontsOk&&h.ready())return fin(true);
    if(Date.now()-h.t0>=HYPH_MAX_MS)return fin(false);
    setTimeout(tick,50);};
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(()=>{fontsOk=true;});
  setTimeout(tick,50);
}
/** Anti-cheat params for the session tracker (single source of counted minutes). */
function trackerOpts(){
  const a=antiCfg();
  const capMin=isMvp()?MVP_ANTI.maxMin:(a.maxMin||3);
  /* PDF only: active work with the page (pan > 20 % of the screen / zoom change) extends THIS page's cap
     by +1 min, at most once per 60 s, hard ceiling 8 min. Text: flat 3 min. Accounting lives in reader-session.js. */
  /* 19.10: a hard book gets a longer page cap (LEVELS capMin: 3 / 5 / 7 min) and its level goes into the session row */
  const lvl=bookLvlOf(R.book),cap=Math.max(capMin,lvl?window.__rqGame.LEVELS[lvl].capMin:0);
  const extend=R.mode==='pdf'?{stepMs:60000,everyMs:60000,maxMs:Math.max(8,cap)*60000,minFraction:0.2}:null;
  const o={capMs:cap*60000,minSecMs:(a.minSec||12)*1000,counting:isMvp()||!!R.timerOn,extend:extend,level:lvl};
  /* 25.10 честное чтение: own pace floor instead of a flat 12 s, live-screen tail, re-read pages, honesty factor */
  if(honestOn()&&R.book){const h=honestOpts(R.book);o.minSecMs=h.floorSec*1000;o.honest=h.honest;R.floorSec=h.floorSec;}else R.floorSec=0;
  return o;
}
/* thin day-progress bar (MVP): today's sessions[] minutes + live counted minutes of this session */
let dayBarIv=null;
function updDayBar(){
  const bar=el('dayBar');if(!bar||!isMvp())return;
  const run=!!(__tracker&&__tracker.isRunning&&__tracker.isRunning());
  const live=run?__tracker.snapshot().minutes:0;
  const day=(run&&__tracker.getSessionDay&&__tracker.getSessionDay())||today(); /* session day = day it started */
  const pct=Math.max(0,Math.min(1,dayMin(day,live)/goalMin())); /* same whole-minute rule as «N / 10» */
  const w=Math.round(pct*1000)/10+'%';
  const i=bar.firstElementChild;if(i&&i.style.width!==w)i.style.width=w;
  updFocusCount(day,live); /* same 15 s tick + page change as the day bar */
  placeJumpBack();
}
function startDayBar(){clearInterval(dayBarIv);updDayBar();dayBarIv=setInterval(updDayBar,15000);}
function stopDayBar(){clearInterval(dayBarIv);dayBarIv=null;}
