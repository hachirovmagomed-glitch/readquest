'use strict';
/* ===== Bars + fullscreen as ONE state (Интерфейс, build 4) =====
   reading : .barsoff (our bars hidden)  + browser fullscreen (if wanted: phone / ⛶)
   chrome  : bars shown                  + fullscreen exited (system bars back)
   Centre tap toggles both in the same handler/frame. Bars auto-hide after 3.2 s; fullscreen is re-requested
   from that timer — Chrome still accepts it while the tap's transient user activation is alive (~5 s; exit
   does not consume it). If the browser refuses, the next reading gesture in the reader (edge tap / swipe)
   re-enters fullscreen inside its own handler before the flip. Viewport resizes → relayout() with the kept
   reading anchor (no jump, page number recomputed in the same goPage). */
let chromeTimer=null;
let FSW=false;          // fullscreen wanted while reading (phone / ⛶ button)
let fsPending=false;    // timer re-entry was refused → retry on the next reading gesture
window.__rqFsLog=[];    // diagnostics (tests): {how, ok, t}
function fsActive(){return !!(document.fullscreenElement||document.webkitFullscreenElement);}
function fsRequest(how){
  if(!FSW||fsActive()){fsPending=false;return;}
  const d=document.documentElement;
  const fn=d.requestFullscreen||d.webkitRequestFullscreen||d.webkitRequestFullScreen||d.msRequestFullscreen;
  if(!fn){fsPending=false;return;}
  const ua=navigator.userActivation;
  if(how==='timer'&&ua&&!ua.isActive){fsPending=true;window.__rqFsLog.push({how:how,ok:false,why:'no-activation',t:Date.now()});return;}
  const done=function(ok,why){if(!ok&&FSW)fsPending=true;else fsPending=false;window.__rqFsLog.push({how:how,ok:ok,why:why||'',t:Date.now()});};
  try{
    const pr=fn.call(d,{navigationUI:'hide'});
    if(pr&&typeof pr.then==='function')pr.then(function(){done(true);},function(e){done(false,e&&e.name||'rejected');});
    else setTimeout(function(){done(fsActive(),'legacy');},0);
  }catch(e){done(false,e&&e.name||'throw');}
}
/** Next reading gesture: re-enter fullscreen if the timer could not (call inside the gesture handler). */
function fsResume(){if(fsPending&&FSW&&!el('reader').classList.contains('hidden')&&el('reader').classList.contains('barsoff'))fsRequest('gesture');}
function exitFullscreenSafe(){
  const fn=document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen;
  if(fn&&fsActive()){try{const pr=fn.call(document);if(pr&&pr.catch)pr.catch(function(){});}catch(e){}}
}
function armChromeHide(){clearTimeout(chromeTimer);chromeTimer=setTimeout(function(){const r=el('reader');if(!r||r.classList.contains('hidden'))return;if(window.__rqWriter&&__rqWriter.passive)return; /* passive window under the overlay: no relayout / fullscreen */if(!el('sheet').classList.contains('hidden')||!el('panel').classList.contains('hidden'))return;if(selText&&selText())return;concealChrome('timer');},3200);}
/** reading state: hide our bars + (re)enter fullscreen */
function concealChrome(how){
  const r=el('reader');if(!r)return;clearTimeout(chromeTimer);
  if(!r.classList.contains('barsoff')){r.classList.add('barsoff');if(how!=='open')relayout();} /* open: the book is laid out right after */
  fsRequest(how||'tap');
  placeJumpBack();
  armFocusAuto();
}
/** chrome state: show our bars + leave fullscreen — same handler, same frame */
function revealChrome(){
  const r=el('reader');if(!r||r.classList.contains('hidden'))return;
  fsPending=false;
  exitFullscreenSafe();
  if(r.classList.contains('focus'))setFocus(false); /* panels visible ⇒ never focus */
  if(r.classList.contains('barsoff')){r.classList.remove('barsoff');relayout();}
  placeJumpBack();
  armChromeHide();
}
function showChrome(){revealChrome();}
function hideChrome(){concealChrome('tap');}
function toggleChrome(){const r=el('reader');if(r&&r.classList.contains('barsoff'))revealChrome();else concealChrome('tap');}
function stopChrome(){clearTimeout(chromeTimer);clearTimeout(focusAutoT);hideJumpBack();FSW=false;fsPending=false;const r=el('reader');if(r)r.classList.remove('barsoff','focus');exitFullscreenSafe();}
/* ===== 1б: focus mode (README «Режим фокуса»). Class .focus on #reader on top of .barsoff: no panels, no corner
   number, no day bar, no game counters; only the text and (SET.readCounter) «7 / 10 мин». Accounting is untouched.
   Enter: «Фокус» button (SET.focus 'button') or 10 s of reading without touching the panels ('auto').
   Leave: ONLY a centre tap (it shows the panels); side taps / swipes / corners keep focus. ===== */
let focusAutoT=null;
const FOCUS_AUTO_MS=10000; /* --rq-focus-auto-delay */
function isFocusOn(){const r=el('reader');return !!(r&&r.classList.contains('focus'));}
function setFocus(on){
  const r=el('reader');if(!r)return;
  if(on&&(SET.focus==='off'||r.classList.contains('hidden')))return;
  r.classList.toggle('focus',!!on);
  if(on){clearTimeout(focusAutoT);updFocusCount();concealChrome('tap');}
}
function armFocusAuto(){
  clearTimeout(focusAutoT);
  if(SET.focus!=='auto')return;
  focusAutoT=setTimeout(function(){
    const r=el('reader');if(!r||r.classList.contains('hidden')||!r.classList.contains('barsoff')||r.classList.contains('focus'))return;
    if(window.__rqWriter&&__rqWriter.passive)return;
    if(!el('sheet').classList.contains('hidden')||!el('panel').classList.contains('hidden')||(selText&&selText()))return armFocusAuto();
    setFocus(true);
  },FOCUS_AUTO_MS);
}
/** SET.focus / SET.readCounter → reader classes (called by applySet and the settings screen). */
function applyFocusSet(){
  const r=el('reader');if(!r)return;
  r.classList.toggle('nofocusbtn',SET.focus==='off');
  r.classList.toggle('rcnt',SET.readCounter!==false);
  if(SET.focus==='off'&&r.classList.contains('focus'))r.classList.remove('focus');
  if(SET.focus==='auto')armFocusAuto();else clearTimeout(focusAutoT);
}
/** Reader counter «7 / 10 мин»: the SAME whole minutes as the daily payout (dayMinFloor ← mvpDailyInfo).
 *  Ring = min(1, floor(dayMinutes)/goal). At the goal: check icon, accent text, no toast, no animation. */
function updFocusCount(day,live){
  const c=el('focusCount');if(!c)return;
  if(day==null){const run=!!(__tracker&&__tracker.isRunning&&__tracker.isRunning());live=run?__tracker.snapshot().minutes:0;day=(run&&__tracker.getSessionDay&&__tracker.getSessionDay())||today();}
  const g=goalMin(),m=dayMinFloor(day,live),done=m>=g,p=Math.min(1,m/g);
  const key=m+'/'+g;if(c.dataset.k===key)return;c.dataset.k=key;
  c.classList.toggle('done',done);
  c.setAttribute('aria-label',done?('Цель дня выполнена: '+m+' из '+g+' минут'):('Чтение засчитывается: '+m+' из '+g+' минут'));
  const C=40.84; /* 2π·6.5 */
  const icon=done?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
    :'<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-opacity=".3" stroke-width="2.2"/><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="'+C+'" stroke-dashoffset="'+(C*(1-p)).toFixed(2)+'" transform="rotate(-90 8 8)"/></svg>';
  c.innerHTML=icon+'<span>'+mvpDailyInfo(day,live)+'</span>';
}
el('btnFocus').onclick=function(e){e.stopPropagation();setFocus(true);};
['.rhead','.rfoot'].forEach(function(s){const n=document.querySelector('#reader '+s);if(n)n.addEventListener('pointerdown',function(){armFocusAuto();},{passive:true});});
let IMM=false; /* legacy name kept for old callers: true ⇔ fullscreen wanted */
function goFullscreen(){FSW=true;IMM=true;fsRequest('open');}
function enterImmersive(){FSW=true;IMM=true;concealChrome('open');}
function exitImmersive(){FSW=false;IMM=false;revealChrome();}
document.addEventListener('fullscreenchange',function(){window.__rqFsLog.push({how:'change',ok:fsActive(),t:Date.now()});if(R.mode==='pdf')pdfOnResize();
  /* 1б: the SYSTEM left fullscreen (Android back / swipe) while we want it → show our panels (no separate «back» step) */
  /* not in a window that lost the writer role (thawed / background tab: mayWrite() demotes it first) — no relayout under the overlay */
  const r=el('reader');if(!fsActive()&&FSW&&r&&!r.classList.contains('hidden')&&r.classList.contains('barsoff')&&document.visibilityState!=='hidden'&&!(window.__rqWriter&&!__rqWriter.mayWrite()))revealChrome();});
el('btnFull').onclick=()=>{enterImmersive();flashMsg('Весь экран · тап по центру — панели',{kind:'info',icon:'maximize'});};
function isLightBg(bg){
  const c=String(bg).replace('#','');
  const n=parseInt(c.length===3?c.split('').map(ch=>ch+ch).join(''):c,16);
  return (((n>>16)&255)+((n>>8)&255)+(n&255))>380;
}
function toggleDayNight(){
  const t=THEMES[SET.theme]||SHOP_THEMES.find(x=>x.id===SET.theme)||THEMES.sepia;
  SET.theme=isLightBg(SET.cBg||t.bg)?'dark':'sepia';
  SET.cBg=null;SET.cTxt=null;saveSet();applySet();
  {const lt=isLightBg((THEMES[SET.theme]||{}).bg||'#000');flashMsg(lt?'Дневной режим':'Ночной режим',{kind:'info',icon:lt?'sun':'moon'});}
}
function addBookmark(){
  if(!R.book)return;
  const arr=(S.marks[R.book.id]=S.marks[R.book.id]||[]);
  const ratio=R.pageCount>1?R.page/(R.pageCount-1):0;
  arr.push({ratio:ratio,page:R.page+1,date:today()});
  save();
  flashMsg('Закладка на стр. '+(R.mode==='pdf'?pdfLabel(R.page):(R.page+1)),{kind:'info',icon:'bookmark'});
}
/* Lucide icons (lucide-static, ISC) for toasts */
const RQ_ICO={
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  'circle-alert':'<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  bookmark:'<path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon:'<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
  maximize:'<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>'
};
function rqIcon(n,sz){return '<svg width="'+(sz||20)+'" height="'+(sz||20)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(RQ_ICO[n]||'')+'</svg>';}
/* legacy calls without {kind}: game wording ⇒ game */
const RQ_GAME_RE=/XP|🪙|монет|босс|квест|талант|золот|награда|Удача|питом|опыт/i;
/** flashMsg(text, ms) or flashMsg(text, {kind:'game'|'info'|'error', icon, ms}).
 *  In the reader `game` toasts are NEVER shown (focus or not); `info`/`error` are allowed. */
function flashMsg(t,o){
  const opt=(o&&typeof o==='object')?o:{ms:o};
  const kind=opt.kind||(RQ_GAME_RE.test(String(t||''))?'game':'info');
  const inReader=!!(el('reader')&&!el('reader').classList.contains('hidden'));
  if(inReader&&kind==='game')return;
  const ms=opt.ms;
  document.querySelectorAll('.rq-toast').forEach(function(x){x.remove();}); /* one toast at a time */
  const d=document.createElement('div');
  d.className='rq-toast';
  d.setAttribute('role',kind==='error'?'alert':'status');
  if(opt.icon){d.innerHTML=rqIcon(opt.icon,20)+'<span></span>';d.lastChild.textContent=t;}else d.textContent=t;
  d.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--sheet);color:#fff;padding:8px 16px;border-radius:99px;z-index:95;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.4)';
  if(inReader){const pg=el('reader').dataset.page;d.classList.add('rd',pg==='night'?'n':'d');}
  d.onclick=function(){d.remove();};
  document.body.appendChild(d);
  const dur=ms!=null?ms:(inReader?3000:1600);
  setTimeout(function(){try{d.remove();}catch(e){}},dur);
}

/* --- выделение текста → цитаты --- */
function selText(){
  const s=window.getSelection&&window.getSelection();
  if(!s||s.isCollapsed)return '';
  const t=String(s).trim();
  return t.length>2?t:'';
}
function updSelPop(){
  el('selpop').classList.toggle('hidden',!selText()||el('reader').classList.contains('hidden'));
}
let selT=null;
document.addEventListener('selectionchange',()=>{if(selT)clearTimeout(selT);selT=setTimeout(updSelPop,200);});
function markInContent(t){
  const c=el('content');const k=esc(t);
  if(c.innerHTML.includes(k))c.innerHTML=c.innerHTML.replace(k,'<mark>'+k+'</mark>');
}
function addQuote(withNote){
  const t=selText();if(!t||!R.book)return;
  let note='';
  if(withNote)note=prompt('Заметка к цитате:')||'';
  (S.quotes[R.book.id]=S.quotes[R.book.id]||[]).push({text:t,note,date:today()});
  (S.hl[R.book.id]=S.hl[R.book.id]||[]).push(t);
  if(!(window.__rqWriter&&__rqWriter.noLocks)){
    if(!isMvp()){S.gold+=2;S.goldAllTime=(S.goldAllTime||0)+2;} /* MVP: no coins for quotes (not in the MVP economy); quote is still saved */
    addSkillXp('Аналитика',1);checkAchievements();
  } /* no locks → no coins */
  save();
  markInContent(t);
  if(window.getSelection)window.getSelection().removeAllRanges();
  el('selpop').classList.add('hidden');
}
function copyText(t){
  try{navigator.clipboard.writeText(t);}
  catch(e){
    const ta=document.createElement('textarea');ta.value=t;
    document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');}catch(_){/* ignore */}
    ta.remove();
  }
}
el('spHl').onclick=()=>addQuote(false);
el('spNote').onclick=()=>addQuote(true);

/* --- словарь по выделению --- */
el('spDict').onclick=()=>{
  const t=selText();if(!t)return;
  window.open('https://translate.google.com/?sl=auto&tl=ru&text='+encodeURIComponent(t.slice(0,200)),'_blank');
};
function addWord(){
  const t=selText();if(!t)return;
  const word=t.trim().replace(/\s+/g,' ').slice(0,60);if(!word)return;
  let ctx='';
  try{const sel=window.getSelection();const full=(sel&&sel.anchorNode&&sel.anchorNode.textContent)||'';const i=full.indexOf(word);
    if(i>=0){let a=Math.max(full.lastIndexOf('.',i),full.lastIndexOf('!',i),full.lastIndexOf('?',i));let b=full.indexOf('.',i+word.length);ctx=full.slice(a+1,(b>0?b+1:i+word.length+80)).trim().slice(0,160);}}catch(e){}
  S.vocab=S.vocab||[];
  if(!S.vocab.some(v=>v.w.toLowerCase()===word.toLowerCase())){S.vocab.push({w:word,ctx:ctx,book:(R.book||{}).title||'',date:today(),box:0});save();flashMsg('📖 «'+word+'» — в словарь');}
  else flashMsg('Уже в словаре');
  if(window.getSelection)window.getSelection().removeAllRanges();
  el('selpop').classList.add('hidden');
}
if(el('spWord'))el('spWord').onclick=addWord;
el('spCopy').onclick=()=>{
  const t=selText();
  if(t&&R.book)copyText('«'+t+'» — '+R.book.title+', '+R.book.author);
  if(window.getSelection)window.getSelection().removeAllRanges();
  el('selpop').classList.add('hidden');
};
document.addEventListener('keydown',e=>{
  if(el('reader').classList.contains('hidden'))return;
  if(e.key==='ArrowRight'||e.key===' ')goPage(R.page+1,true);
  if(e.key==='ArrowLeft')goPage(R.page-1,true);
  if(e.key==='Escape')readerBack();
});
/* --- жесты: свайп, щипок-зум, панорамирование --- */
let tx0=null,pinch0=null,zoom0=1,panStart=null,suppressClick=false,mdrag=null,bright=null;
/* Text pinch = font size (Интерфейс): the text layer is NEVER scaled. During the gesture only a tiny
   «Aa N» hint changes; on the first finger up → ONE reflow via setFontSizeKeepPos. */
let pinchSize0=19,pinchTarget=0,pinchQuietUntil=0;
function tDist(e){const a=e.touches[0],b=e.touches[1];return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);}
function pinchSizeFor(k){if(Math.abs(k-1)<0.08)return pinchSize0;return Math.max(14,Math.min(30,Math.round(pinchSize0*k)));}
function showPinchHint(n){
  const h=el('pinchHint'),v=el('pinchHintN');if(!h)return;
  if(v&&v.textContent!==String(n))v.textContent=n;
  h.classList.toggle('pct',R.mode==='pdf'); /* pdf: «150%», text: «Aa 21» */
  if(h.classList.contains('hidden'))h.classList.remove('hidden');
}
function hidePinchHint(){const h=el('pinchHint');if(h&&!h.classList.contains('hidden'))h.classList.add('hidden');}
function endTextPinch(){
  hidePinchHint();
  const t=pinchTarget;pinchTarget=0;pinchQuietUntil=Date.now()+450;
  if(t&&t!==SET.size)setFontSizeKeepPos(t);
}
el('viewer').addEventListener('gesturestart',e=>{e.preventDefault();}); /* iOS Safari: no native page zoom in the reader */
let ty0=null,tt0=0;
el('viewer').addEventListener('touchstart',e=>{
  if(R.mode==='pdf'){pdfTouchStart(e);return;}
  if(e.touches.length===2){pinch0=tDist(e);zoom0=R.zoom||1;tx0=null;bright=null;pinchSize0=SET.size;pinchTarget=SET.size;if(R.mode!=='pdf')showPinchHint(SET.size);return;}
  if(pinch0||e.touches.length>2)return;
  ty0=e.touches[0].clientY;tt0=Date.now();
  if(e.touches[0].clientX<28){bright={y0:e.touches[0].clientY,d0:SET.dim||0};tx0=null;return;} // жест яркости у левого края
  tx0=e.touches[0].clientX;
},{passive:true});
el('viewer').addEventListener('touchmove',e=>{
  if(R.mode==='pdf'){pdfTouchMove(e);return;}
  if(bright&&e.touches.length===1){
    SET.dim=Math.max(0,Math.min(0.7,bright.d0+(e.touches[0].clientY-bright.y0)/400));
    el('dimmer').style.opacity=SET.dim;
    return;
  }
  if(e.touches.length===2&&pinch0){
    if(R.mode!=='pdf'){
      if(e.cancelable)e.preventDefault(); /* belt & braces with touch-action:none — browser must not zoom the page */
      const t=pinchSizeFor(tDist(e)/pinch0);
      if(t!==pinchTarget){pinchTarget=t;showPinchHint(t);} /* «Aa N» follows the fingers; text reflows once on touchend */
      return;
    }
    return;
  }
},{passive:false});
el('viewer').addEventListener('touchend',e=>{
  if(R.mode==='pdf'){pdfTouchEnd(e);return;}
  if(bright){saveSet();flashMsg('Яркость '+Math.round((1-SET.dim)*100)+'%',{kind:'info',icon:'sun'});bright=null;return;}
  if(pinch0){
    pinch0=null;tx0=null;
    endTextPinch(); // текст: щипок = размер шрифта, один рефлоу после жеста
    return;
  }
  if(Date.now()<pinchQuietUntil){tx0=null;return;} /* second finger lifting after a pinch is not a swipe */
  if(tx0===null)return;
  const ct=e.changedTouches[0];
  const dx=ct.clientX-tx0,dy=ct.clientY-(ty0==null?ct.clientY:ty0);tx0=null;
  if((!SET.nav||SET.nav.swipe!==false)&&Math.abs(dx)>50){const inv=(SET.nav&&SET.nav.invert)?-1:1;fsResume();goPage(R.page+(dx<0?1:-1)*inv,true);return;}
  /* short, still touch = tap (not on buttons / selection popup) */
  if(Math.abs(dx)<12&&Math.abs(dy)<12&&Date.now()-tt0<450&&e.touches.length===0&&
     !(e.target&&e.target.closest&&e.target.closest('button,a,input,#selpop'))){
    touchTapAt=Date.now();viewerTap(ct.clientX,ct.clientY);
  }
},{passive:true});
el('viewer').addEventListener('touchcancel',()=>{if(R.mode==='pdf'){P.g=null;hidePinchHint();pdfApply();return;}if(pinch0){pinch0=null;tx0=null;if(R.mode!=='pdf')endTextPinch();}},{passive:true});
/* мышь: Ctrl+колесо — зум, колесо — листание, перетаскивание — панорама */
el('viewer').addEventListener('wheel',e=>{
  if(el('reader').classList.contains('hidden'))return;
  if(R.mode==='pdf'){pdfWheel(e);return;}
  if(e.ctrlKey){e.preventDefault();setFontSizeKeepPos(SET.size+(e.deltaY<0?1:-1));return;}
  e.preventDefault();
  goPage(R.page+(e.deltaY>0?1:-1),true);
},{passive:false});
window.addEventListener('resize',relayout);
el('btnBack').onclick=function(){readerBack();}; /* ← = one history step; popstate closes the book */

/* --- панель: оглавление / закладки / цитаты --- */
let panelTab='toc';
el('btnPanel').onclick=()=>{renderPanel(panelTab);el('panel').classList.toggle('hidden');el('sheet').classList.add('hidden');};
el('panelClose').onclick=()=>el('panel').classList.add('hidden');
el('tabToc').onclick=()=>renderPanel('toc');
el('tabMarks').onclick=()=>renderPanel('marks');
el('tabQts').onclick=()=>renderPanel('qts');
el('tabFind').onclick=()=>renderPanel('find');
el('tabGrid').onclick=()=>renderPanel('grid');
function jumpRatio(fr){jumpTo(Math.round(fr*(R.pageCount-1)));el('panel').classList.add('hidden');}
function jumpToc(i){
  const b=R.book;if(!b||!b.toc||!b.toc[i])return;
  jumpRatio(b.text&&b.text.length?b.toc[i].off/b.text.length:0);
}
function delMark(i){const ms=S.marks[(R.book||{}).id]||[];ms.splice(i,1);save();renderPanel('marks');}
let FINDQ='';
let FINDTOKEN=0;
function doFind(){
  const res=el('findRes');if(!res)return;
  const b=R.book;
  if(!FINDQ||FINDQ.trim().length<2){res.innerHTML='<div class="pempty">Введите минимум 2 символа</div>';return;}
  const q=FINDQ.trim().toLowerCase();
  if(b&&b.text){
    const tl=b.text.toLowerCase();const out=[];let i=0;
    while(out.length<40){
      const p=tl.indexOf(q,i);if(p<0)break;
      const fr=p/b.text.length;
      const ctx=b.text.slice(Math.max(0,p-40),p+q.length+40).replace(/\n+/g,' ');
      out.push('<button class="prow" onclick="jumpRatio('+fr.toFixed(4)+')">…'+esc(ctx)+'…</button>');
      i=p+q.length;
    }
    res.innerHTML=out.length?out.join(''):'<div class="pempty">Не найдено</div>';return;
  }
  if(R.mode==='pdf'&&R.pdf){pdfFind(q,res);return;}
  res.innerHTML='<div class="pempty">Поиск недоступен</div>';
}
async function pdfFind(q,res){
  const token=++FINDTOKEN;
  res.innerHTML='<div class="pempty">🔍 Ищу по страницам…</div>';
  const out=[];
  for(let n=0;n<R.pageCount;n++){
    if(token!==FINDTOKEN)return;
    try{
      const page=await R.pdf.getPage(n+1);
      const tc=await page.getTextContent();
      const txt=tc.items.map(it=>it.str).join(' ');
      const pos=txt.toLowerCase().indexOf(q);
      if(pos>=0){
        const ctx=txt.slice(Math.max(0,pos-40),pos+q.length+50).replace(/\s+/g,' ');
        out.push('<button class="prow" onclick="findGo('+n+')">стр. '+(n+1)+': …'+esc(ctx)+'…</button>');
        if(token===FINDTOKEN)res.innerHTML=out.join('')+'<div class="pempty">ищу дальше…</div>';
      }
    }catch(e){}
    if(out.length>=60)break;
  }
  if(token===FINDTOKEN)res.innerHTML=out.length?out.join(''):'<div class="pempty">Не найдено</div>';
}
function findGo(n){jumpTo(n);el('panel').classList.add('hidden');}
function renderPanel(tab){
  panelTab=tab;
  [['tabToc','toc'],['tabMarks','marks'],['tabQts','qts'],['tabFind','find'],['tabGrid','grid']]
    .forEach(([bid,t])=>el(bid).classList.toggle('on',t===tab));
  const body=el('panelBody');const b=R.book;
  if(!b){body.innerHTML='<div class="pempty">Откройте книгу</div>';return;}
  if(tab==='find'){
    body.innerHTML='<input id="bookFind" class="searchinp" placeholder="🔍 Найти в книге..." value="'+esc(FINDQ)+'"><div id="findRes" style="margin-top:10px"></div>';
    el('bookFind').oninput=e=>{FINDQ=e.target.value;doFind();};
    doFind();return;
  }
  if(tab==='grid'){
    const n=Math.min(R.pageCount,400);
    const mk={};(S.marks[b.id]||[]).forEach(m=>mk[m.page-1]=1);
    let html='<div class="pgrid">';
    for(let i=0;i<n;i++){
      html+='<button class="'+(i===R.page?'cur':'')+'" onclick="jumpRatio('+(R.pageCount>1?(i/(R.pageCount-1)).toFixed(4):0)+')">'+(i+1)+(mk[i]?'<span class="m">🔖</span>':'')+'</button>';
    }
    body.innerHTML=html+'</div>'+(R.pageCount>400?'<div class="pempty">Показаны первые 400 страниц</div>':'');
    return;
  }
  if(tab==='toc'){
    const toc=b.toc||[];
    body.innerHTML=toc.length
      ?toc.map((ch,i)=>'<button class="prow" onclick="jumpToc('+i+')">'+esc(ch.t)+'</button>').join('')
      :'<div class="pempty">У этой книги нет оглавления</div>';
  }else if(tab==='marks'){
    const ms=S.marks[b.id]||[];
    body.innerHTML='<button class="prow add" onclick="addBookmark();renderPanel(\'marks\')">＋ Закладка на текущей странице</button>'+
      ms.map((m,i)=>'<div class="prow"><button style="flex:1;text-align:left" onclick="jumpRatio('+m.ratio.toFixed(4)+')">🔖 Стр. '+m.page+'</button><span style="font-size:11px;color:var(--muted)">'+m.date+'</span><button onclick="delMark('+i+')" style="color:var(--muted)">✕</button></div>').join('');
  }else{
    const qs=S.quotes[b.id]||[];
    body.innerHTML=qs.length
      ?qs.map(q=>{
        const fr=b.text?Math.max(0,b.text.indexOf(q.text))/Math.max(1,b.text.length):0;
        return '<button class="prow" onclick="jumpRatio('+fr.toFixed(4)+')">«'+esc(q.text.slice(0,60))+(q.text.length>60?'…':'')+'»</button>';
      }).join('')
      :'<div class="pempty">Пока нет цитат — выделите текст в книге</div>';
  }
}

/* --- озвучка (TTS): непрерывная, с авто-переходом по страницам --- */
let speaking=false,ttsOn=false;
function ttsStop(){ttsOn=false;speaking=false;try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}var b=el('btnTts');if(b)b.textContent='🔊';}
function ttsSay(t,onend){
  const u=new SpeechSynthesisUtterance(t);u.lang='ru-RU';
  u.onend=function(){if(ttsOn&&onend)onend();};
  u.onerror=function(){if(ttsOn&&onend)onend();};
  speaking=true;speechSynthesis.speak(u);
}
function ttsTextNext(){
  if(!ttsOn||!R.book||R.mode==='pdf')return;
  const b=R.book;
  if((R.ttsPos||0)>=b.text.length){ttsStop();flashMsg('🔊 Книга озвучена до конца');return;}
  let end=Math.min(b.text.length,(R.ttsPos||0)+1500);
  const tail=b.text.slice(end,end+220).search(/[.!?…\n]/);
  if(tail>=0)end+=tail+1;
  const chunk=b.text.slice(R.ttsPos||0,end);
  if(R.pageCount>1)goPage(Math.round((end/b.text.length)*(R.pageCount-1)),false);
  ttsSay(chunk,function(){R.ttsPos=end;if(ttsOn)setTimeout(ttsTextNext,100);});
}
function ttsPdfNext(){
  if(!ttsOn||!R.book||R.mode!=='pdf'||!R.pdf)return;
  R.pdf.getPage(R.page+1).then(p=>p.getTextContent()).then(tc=>{
    if(!ttsOn)return;
    const t=tc.items.map(i=>i.str).join(' ').trim();
    const advance=function(){if(ttsOn&&R.page<R.pageCount-1){goPage(R.page+1,false);setTimeout(ttsPdfNext,120);}else{ttsStop();flashMsg('🔊 Конец документа');}};
    if(t)ttsSay(t,advance);else advance();
  }).catch(()=>ttsStop());
}
el('btnTts').onclick=()=>{
  if(ttsOn||speaking){ttsStop();return;}
  if(!R.book)return;
  if(!window.speechSynthesis){alert('Озвучка не поддерживается этим браузером');return;}
  ttsOn=true;el('btnTts').textContent='⏹';
  if(R.mode==='pdf'){ttsPdfNext();}
  else{const fr=R.pageCount>1?R.page/(R.pageCount-1):0;R.ttsPos=Math.floor(fr*R.book.text.length);ttsTextNext();}
};

/* ================= СЕССИЯ И НАГРАДЫ ================= */
/* Idempotent close (Архитектор, 1б): header ←, popstate and the pwa-lock handover may fire almost together →
   ONE tracker.end (one sessions[] row, one id), one payout, one summary. Concurrent callers get the same promise;
   a caller after the close finished (reader already hidden, no book) is a no-op — it must not repaint summary → library. */
let __closingReader=null;
function closeReader(opts){
  if(window.__rqWriter&&!__rqWriter.mayWrite())return Promise.resolve(); /* passive/stolen window: no summary, no payout, no write */
  if(__closingReader)return __closingReader;
  const r=el('reader');
  const quietRun=opts&&opts.quiet&&__tracker&&__tracker.isRunning&&__tracker.isRunning();
  if(!R.book&&r&&r.classList.contains('hidden')&&!quietRun)return Promise.resolve();
  __closingReader=(async function(){try{await closeReaderImpl(opts);}finally{__closingReader=null;}})();
  return __closingReader;
}
async function closeReaderImpl(opts){
  const o=opts||{};
  if(R.mode==='pdf')pdfClose(); /* cancel renders, free canvases + worker document */
  stopChrome();stopDayBar();el('sheet').classList.add('hidden');el('panel').classList.add('hidden');relWake();
  if(window.speechSynthesis){speechSynthesis.cancel();speaking=false;el('btnTts').textContent='🔊';}
  const b=R.book;if(!b){if(__tracker&&o.quiet){try{await stalePaid(__tracker.end());}catch(e){}}else if(!o.quiet){show('library');navAfterClose(false);}return;}
  R.book=null;
  S.progress[b.id]={ratio:R.maxRatio};
  const a=antiCfg();
  stopTimerTick();
  rollDay();
  /* Single source of truth: the reader-session tracker computes counted minutes (per-page cap,
     visible time only, last page capped too) and writes ONE sessions[] row with a reader-generated UUID id. */
  const lvBefore=level(S.xp);
  let row=null;
  if(__tracker){
    try{row=await __tracker.end();}catch(e){console.warn('[rq] session end',e);} /* row.date = LOCAL day the session started */
  }
  if(!row){save();if(!o.quiet){renderLibrary();show('library');navAfterClose(false);}return;} /* empty session (or write failed → draft recovered on next boot) */
  SESS.push(row);
  const sd=String(row.date||today()).slice(0,10); /* session day: 23:50–00:15 belongs entirely to the first day */
  const min=row.minutes;        // время сверх лимита на странице не идёт в опыт
  const pages=row.pageTurns||0; // пролистанные быстрее минимума страницы не в счёт
  // статистика по книге (накопительная, только честные минуты/страницы)
  const bs=(S.bookStats[b.id]=S.bookStats[b.id]||{min:0,pages:0});
  bs.min+=min;bs.pages+=pages;
  // честный финиш: бонус только если прочитано ≈70% страниц по анти-чит таймеру
  const fullRead=bs.pages>=Math.ceil(Math.max(1,R.pageCount-1)*0.7)&&bs.min*60>=Math.max(a.minSec,(R.pageCount-1)*a.minSec*0.5);
  const justFinished=R.maxRatio>=0.999&&fullRead&&!S.finished.includes(b.id);
  const cheatFinish=R.maxRatio>=0.999&&!fullRead&&!S.finished.includes(b.id);
  if(justFinished){S.finished.push(b.id);S.shelfOrder=S.shelfOrder||[];if(S.shelfOrder.indexOf(b.id)<0)S.shelfOrder.push(b.id);shelfJustAdded=b.id;S.finishDates=S.finishDates||{};S.finishDates[b.id]=today();}
  const dIdx=diffOf(b.id);const dmul=DIFFS[dIdx].m; // множитель сложности книги
  const imMul=impMulOf(b.id);                       // важность книги → больше валюты
  let xp, gold, mult=1, questPaid={gold:0,daily:[],weekly:[]};
  if(isMvp()){
    /* MVP: XP only from reading — +10 per counted minute, derived by game from sessions[]
       and awarded once per sessionId (game.awardedSessionIds). */
    const res=awardPendingSessions();
    xp=Number(row.xp)||0; /* the paid value stored in the row (decision B) — the summary never recomputes it */
    gold=0; /* daily/weekly gold already added to S.gold inside awardPendingSessions */
    questPaid={gold:res.gold||0,daily:res.daily||[],weekly:res.weekly||[]};
  }else{
    xp=Math.round((pages*5+min*10)*dmul)+(justFinished?Math.round(200*dmul):0);
    gold=Math.round((pages*2+min)*dmul*imMul)+(justFinished?Math.round(100*dmul*imMul):0);
    const luck=Math.random();mult=luck<0.02?3:luck<0.08?2:1;
    xp=Math.round(xp*mult*(S.xpMult||1)*talVal('xp'));gold=Math.round(gold*mult*talVal('gold'));
  }
  const stN=statOf(b);
  const statGain=Math.max(1,Math.round((Math.round(min)+pages)*dmul*talVal('stat')));
  if(!isMvp()){S.xp+=xp;if(window.__rqGame)window.__rqGame.markAwarded(S,[row.id]);}
  S.gold+=gold;S.goldAllTime=(S.goldAllTime||0)+gold;
  S.stats[stN]=(S.stats[stN]||0)+statGain;
  if(sd===today())S.minToday+=min;S.totalMin+=min;S.totalPages+=pages;S.sessions++;
  S.hp=Math.min(S.hpMax,(S.hp==null?S.hpMax:S.hp)+15);if(justFinished)S.hp=S.hpMax; // чтение восстанавливает здоровье
  dealBossDamage(min,pages,justFinished);S.petXp=(S.petXp||0)+min; // урон боссу + рост питомца
  /* Soft streak ≥2 min (Boss/Product): preserve streak when day's total minutes ≥2.
     Daily quest / north-star still require goal minutes (default 10) — not changed here. */
  if((isMvp()?dayMin(sd):(sd===today()?S.minToday:min))>=STREAK_MIN){
    if(!S.lastDay||sd>String(S.lastDay)){
      S.streak=(S.lastDay===addLocalDays(sd,-1))?S.streak+1:1;
      S.lastDay=sd;
    }
  }
  const hour=new Date().getHours();
  S.hourHist=S.hourHist||new Array(24).fill(0);S.hourHist[hour]=(S.hourHist[hour]||0)+min; // учёт «когда читаю»
  // история по дням и навыки
  const dkey=sd;
  const h=(S.hist[dkey]=S.hist[dkey]||{min:0,pages:0,xp:0,gold:0});
  h.min+=min;h.pages+=pages;h.xp+=xp;h.gold+=gold+questPaid.gold;
  h.books=h.books||{};if(b&&min>0)h.books[b.id]=(h.books[b.id]||0)+min;
  addSkillXp('Концентрация',Math.floor(min/10));
  if(hour<9&&min>=5)addSkillXp('Дисциплина',1);
  if(min>0&&pages>=3&&pages/min>=0.8)addSkillXp('Скорочтение',1);
  const newB=[];
  const earn=id=>{if(!S.badges.includes(id)){S.badges.push(id);newB.push(BADGES.find(x=>x.id===id));}};
  earn('first');
  if(hour>=23)earn('owl');
  if(hour<8)earn('lark');
  if(min>=30)earn('marathon');
  if(S.streak>=3)earn('streak3');
  if(S.streak>=7)earn('streak7');
  if(justFinished)earn('finisher');
  if(level(S.xp)>=5)earn('lvl5');
  const newAch=checkAchievements();
  save();
  /* sessions[] row already written above by __tracker.end (one row, UUID id) */
  const _sumArgs={xp,gold,pages,min,stat:stN,statGain,newB,lvBefore,justFinished,mult,flipped:R.turned,cheatFinish,dName:DIFFS[dIdx].n,dmul:dmul,newAch:newAch,day:sd,quest:questPaid};
  if(o.quiet)return; /* closed in passing (begin() over a stale session): counted + paid, no summary, screen untouched */
  if(!summaryWanted(_sumArgs)){renderLibrary();show('library');navAfterClose(false);return;}
  renderSummary(_sumArgs);
  show('summary');navAfterClose(true);
  if(isMvp())confettiSummary();
  else if(_sumArgs.newB.length||(_sumArgs.newAch&&_sumArgs.newAch.length)||level(S.xp)>_sumArgs.lvBefore||_sumArgs.justFinished||_sumArgs.mult>1)confetti();
}
function countUp(elm,to,fmt){
  const t0=performance.now(),dur=900;
  function f(t){const k=Math.min(1,(t-t0)/dur);elm.textContent=fmt(Math.round(to*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(f);}
  requestAnimationFrame(f);
}
function renderSummary(r){
  countUp(el('sumXp'),r.xp,n=>'+'+n+' XP');
  countUp(el('sumPages'),r.pages,n=>n);
  /* whole minutes (floor, the dayMinutes rule); under one minute → «меньше минуты» (decision D) */
  const wm=Math.floor((Number(r.min)||0)+1e-9);
  el('sumMin').textContent=wm<1?'меньше минуты':wm;el('sumMin').style.fontSize=wm<1?'15px':'';
  if(el('sumMinLbl'))el('sumMinLbl').classList.toggle('hidden',wm<1);
  const hl=summaryHeadline(r.quest),hd=el('sumHead');
  if(hd){hd.textContent=hl||'Сессия завершена';hd.style.color=hl?'var(--accent2)':'';hd.style.fontWeight=hl?'600':'';}
  countUp(el('sumGold'),r.gold,n=>'+'+n);
  el('sumGoldLbl').textContent=curI()+' '+S.cur.name;
  el('sumStat').textContent='+'+r.statGain;
  el('sumStatName').textContent=r.stat;
  const notes=[];
  if(r.flipped>r.pages)notes.push('🛡️ '+(r.flipped-r.pages)+' стр. пролистаны быстрее лимита и не засчитаны');
  if(r.cheatFinish)notes.push('📵 Финиш не засчитан: для бонуса нужно честно прочитать ~70% страниц');
  el('sumNote').textContent=notes.join(' · ');
  if(S.ux&&S.ux.vibe!==false&&navigator.vibrate){try{navigator.vibrate(r.mult>1||r.newB.length?[60,40,60]:40);}catch(e){}}
  el('luckLbl').classList.toggle('hidden',!(r.mult>1));
  if(r.mult>1)el('luckLbl').textContent='🍀 Удача! Все награды ×'+r.mult;
  const lvNow=level(S.xp);
  el('lvlUp').classList.toggle('hidden',lvNow<=r.lvBefore);
  if(lvNow>r.lvBefore)el('lvlUp').textContent='🎉 Новый уровень: '+lvNow+'!';
  el('sumStreak').textContent='🔥 Стрик: '+S.streak+' '+plural(S.streak,'день','дня','дней')+
    (r.dmul>1&&!isMvp()?' · ⚔️ '+r.dName+' ×'+r.dmul:'')+
    (r.justFinished?' · 🏁 Книга прочитана, бонус!':'');
  const bb=el('sumBadges');bb.innerHTML='';
  r.newB.forEach(b=>{const d=document.createElement('div');d.className='newbadge pop';d.textContent=b.icon+' Новый бейдж: «'+b.name+'»';bb.appendChild(d);});
  (r.newAch||[]).forEach(a=>{const d=document.createElement('div');d.className='newbadge pop';d.textContent='🏆 Достижение: «'+a.title+'»'+(a.prize?' — '+a.prize:'');bb.appendChild(d);});
  /* day of THIS session (local start day), not "now": 23:50–00:15 shows the first day */
  const sday=r.day||today();
  if(el('sumDailyInfo'))el('sumDailyInfo').textContent=(dailyPaid(sday)?'✓ ':'')+mvpDailyInfo(sday)+(sday!==today()?' (вчера)':'');
  if(el('sumDailyBar'))el('sumDailyBar').style.width=Math.round(mvpDailyProg(sday)*100)+'%';
  if(el('sumWeeklyInfo'))el('sumWeeklyInfo').textContent='Неделя: '+mvpWeeklyInfo(weekKey(sday))+(weeklyPaid(weekKey(sday))?' · ✓ неделя выполнена':'');
  /* gold lines ONLY for what was paid by THIS session (re-render with no `quest` → no lines) */
  const qp=r.quest||{daily:[],weekly:[]},ql=[];
  if(qp.daily&&qp.daily.length)ql.push('+'+(30*qp.daily.length)+' 🪙 ежедневка выполнена');
  if(qp.weekly&&qp.weekly.length)ql.push('+'+(120*qp.weekly.length)+' 🪙 неделя выполнена');
  const qb=el('sumQuestGold');if(qb){qb.innerHTML=ql.map(function(t){return '<div>'+t+'</div>';}).join('');qb.classList.toggle('hidden',!ql.length);}
  if(el('btnDone'))el('btnDone').textContent=isMvp()?'В библиотеку':'Продолжить';
  applyMvpChrome();
}

function confetti(opts){
  opts=opts||{};
  const count=opts.count!=null?opts.count:26;
  const avoidTop=!!opts.avoidTop; /* keep clear of summary heading */
  const em=['🎉','✨','⭐','🪙','📖'];
  for(let i=0;i<count;i++){
    const s=document.createElement('div');s.className='confetti';
    s.textContent=em[i%em.length];
    s.style.left=(8+Math.random()*84)+'vw';
    /* start well below heading when avoidTop */
    s.style.top=avoidTop?((32+Math.random()*40)+'vh'):'-30px';
    s.style.left=avoidTop?( (5+Math.random()*40)*(i%2?1:1.4)+'vw' ): ((8+Math.random()*84)+'vw');
    if(avoidTop){ /* bias to sides */
      s.style.left=(i%2===0?(4+Math.random()*22):(74+Math.random()*22))+'vw';
    }
    s.style.animationDelay=(Math.random()*0.45)+'s';
    s.style.fontSize=(12+Math.random()*8)+'px';
    if(avoidTop)s.style.zIndex='40';
    document.body.appendChild(s);
    setTimeout(function(n){return function(){try{n.remove();}catch(e){};};}(s),2800);
  }
}
function confettiSummary(){confetti({count:10,avoidTop:true});}
function confettiReward(){confetti({count:14});}
function maybeConfetti(){if(isMvp())return;confetti();}
/* «В библиотеку» = the same as «назад» on the summary: show the library now, then drop the summary history entry
   (its popstate finds nothing open → no-op), so back from the library leaves the app. */
el('btnDone').onclick=()=>{renderLibrary();show('library');if(navState()==='summary'){try{history.back();}catch(e){}}};

/** A session row written outside closeReader (tracker.begin safety net / quiet close without a book): into SESS + paid. */
async function stalePaid(p){
  const row=await p;if(!row)return null;
  if(!SESS.some(function(x){return x.id===row.id;}))SESS.push(row);
  if(isMvp())awardPendingSessions();
  save();return row;
}

/* ===== «Назад» через историю браузера (1б; порядок — Интерфейс, контракт — Архитектор) =====
   Адрес не меняется: pushState({rq:…},'',location.href), без '#', так что SW/scope видят тот же URL.
   Открыта книга: [ … , {rq:'reader'}]. Back → popstate (state уже НЕ reader):
     1) открыта шторка (Aa / оглавление) → закрыть её, вернуть {rq:'reader'};
     2) панели на экране → спрятать их, вернуть {rq:'reader'};
     3) иначе closeReader() → итог; запись reader заменяется на {rq:'summary'}.
   На итоге back → библиотека (как «В библиотеку»). Из библиотеки back уходит из приложения.
   Кнопка ← в шапке и Escape: сразу шаг 3, запись reader заменяется на summary (см. readerBack).
   popstate при закрытой читалке и без итога (после F5 и т. п.) ничего не делает. */
function navState(){try{return (history.state&&history.state.rq)||null;}catch(e){return null;}}
function navPush(tag){try{if(navState()!==tag)history.pushState({rq:tag},'',location.href);}catch(e){}}
function readerIsOpen(){const r=el('reader');return !!(r&&!r.classList.contains('hidden')&&R.book);}
function summaryIsOpen(){const s=el('summary');return !!(s&&!s.classList.contains('hidden'));}
/** ONE place that decides whether a closed session gets the summary screen (1б, team decision D):
    shown iff the session has ≥ 1 whole minute OR it awarded something (XP > 0, daily +30, weekly +120).
    Otherwise «назад»/«закрыть» go straight to the library (the row is in sessions[] as usual). */
function summaryWanted(r){
  if(Math.floor((Number(r.min)||0)+1e-9)>=1)return true;
  if((Number(r.xp)||0)>0)return true;
  const q=r.quest||{};
  return !!((q.daily&&q.daily.length)||(q.weekly&&q.weekly.length));
}
/** headline: the coin reward of THIS session if any (decision D), else «Сессия завершена» */
function summaryHeadline(q){
  q=q||{};const d=(q.daily||[]).length,w=(q.weekly||[]).length;
  if(!d&&!w)return '';
  const coins=30*d+120*w;
  return (d&&w?'Цель дня и недели выполнены':d?'Цель дня выполнена':'Цель недели выполнена')+' · +'+coins+' '+plural(coins,'монета','монеты','монет');
}
/** after closeReader: summary → this entry becomes {rq:'summary'}; no summary → drop a still-current reader entry */
function navAfterClose(summary){
  try{
    if(summary){if(navState()==='reader')history.replaceState({rq:'summary'},'',location.href);else navPush('summary');}
    else if(navState()==='reader')history.back(); /* its popstate: nothing open → no-op */
  }catch(e){}
}
/* header ← / Escape. Deviation from «← = history.back()» (Архитектор): history.back() is async, and a system back
   right after it (double back) went back TWO entries and left the app (back.test). Closing directly and REPLACING the
   reader entry with {rq:'summary'} (navAfterClose) leaves no stale entry either, and a back that lands mid-close finds
   nothing open (R.book already null) → no-op, then navAfterClose pushes the summary entry. */
function readerBack(){return closeReader();}
window.addEventListener('popstate',function(e){
  const st=(e.state&&e.state.rq)||null;
  if(window.__rqWriter&&__rqWriter.passive)return;
  if(readerIsOpen()){
    if(st==='reader')return;
    const sh=el('sheet'),pn=el('panel');
    if(!sh.classList.contains('hidden')||!pn.classList.contains('hidden')){sh.classList.add('hidden');pn.classList.add('hidden');navPush('reader');armChromeHide();return;}
    if(!el('reader').classList.contains('barsoff')){concealChrome('back');navPush('reader');return;}
    closeReader();
    return;
  }
  if(summaryIsOpen()&&st!=='summary'){renderLibrary();show('library');}
});
/* boot (F5 inside the reader / on the summary): the entry still says reader/summary, nothing is open → neutral entry */
if(navState())try{history.replaceState(null,'',location.href);}catch(e){}

