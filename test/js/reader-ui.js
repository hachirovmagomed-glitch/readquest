'use strict';
/* ===== Bars + fullscreen as ONE state (Интерфейс, build 4) =====
   reading : .barsoff (our bars hidden)  + browser fullscreen (if wanted: phone / ⛶)
   chrome  : bars shown OVER the text    + fullscreen kept (16.10, Джессика «как в ReadEra»; it ends when the reader closes)
   Centre tap toggles the bars (slide/fade, the text never moves). Bars auto-hide after 3.2 s; fullscreen is re-requested
   from that timer — Chrome still accepts it while the tap's transient user activation is alive (~5 s; exit
   does not consume it). If the browser refuses, the next reading gesture in the reader (edge tap / swipe)
   re-enters fullscreen inside its own handler before the flip. Viewport resizes → relayout() with the kept
   reading anchor (no jump, page number recomputed in the same goPage). */
let chromeTimer=null;
let FSW=false;          // fullscreen wanted while reading (phone); 1в: the ⛶ button is gone, pinch zoom stays
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
function armChromeHide(){clearTimeout(chromeTimer);chromeTimer=setTimeout(function(){const r=el('reader');if(!r||r.classList.contains('hidden'))return;if(window.__rqWriter&&__rqWriter.passive)return; /* passive window under the overlay: no relayout / fullscreen */if(!el('sheet').classList.contains('hidden')||!el('panel').classList.contains('hidden'))return;if(selText&&selText())return;if(PG.id!=null||R.slideFrom!=null)return armChromeHide(); /* 21.10: finger still on the page slider (looking through chapters) → keep the bars */concealChrome('timer');},3200);}
/** reading state: hide our bars + (re)enter fullscreen */
function concealChrome(how){
  const r=el('reader');if(!r)return;clearTimeout(chromeTimer);
  if(!r.classList.contains('barsoff')){r.classList.toggle('nobaranim',rqBarsStill());r.classList.add('barsoff');} /* 16.10: bars overlay the text → no relayout */
  fsRequest(how||'tap');
  placeJumpBack();
  armFocusAuto();
}
/** chrome state: show our bars + leave fullscreen — same handler, same frame */
function revealChrome(){if(typeof pgArtSync==='function')requestAnimationFrame(pgArtSync);
  const r=el('reader');if(!r||r.classList.contains('hidden'))return;
  fsPending=false;
  /* 16.10 (Джессика, «как в ReadEra»): fullscreen STAYS while the bars are shown — no status bar popping in, no black
     frame, no Chrome «выйти из полноэкранного режима» toast on every tap. Fullscreen ends when the reader closes (stopChrome). */
  if(r.classList.contains('focus'))setFocus(false); /* panels visible ⇒ never focus */
  if(r.classList.contains('barsoff')){r.classList.toggle('nobaranim',rqBarsStill());r.classList.remove('barsoff');if(lastUp&&Date.now()-lastUp.t<300){chromeShownAt=Date.now();chromeShownXY={x:lastUp.x,y:lastUp.y};}}
  placeJumpBack();setTimeout(placeJumpBack,300); /* again once the bottom bars have slid in */
  armChromeHide();
}
/* 1в: the tap that REVEALS the bars must not also click the button that appears under the finger
   (ghost click: touchend reveals, the synthesized click lands on e.g. «Слушать» in the top-right corner).
   Only THAT click is swallowed: same point as the revealing touch (±12 px), ≤ 450 ms, once. Any other tap
   on the bars — including a fast real tap on ← right after — goes through. */
let chromeShownAt=0,chromeShownXY=null,lastUp=null;
document.addEventListener('pointerup',function(e){lastUp={x:e.clientX,y:e.clientY,t:Date.now()};},true);
document.addEventListener('click',function(e){
  if(!chromeShownAt||!chromeShownXY)return;
  const fresh=Date.now()-chromeShownAt<=450,near=Math.abs(e.clientX-chromeShownXY.x)<=12&&Math.abs(e.clientY-chromeShownXY.y)<=12;
  if(!fresh){chromeShownAt=0;chromeShownXY=null;return;}
  if(!near)return;
  chromeShownAt=0;chromeShownXY=null; /* once */
  const tg=e.target&&e.target.closest&&e.target.closest('#reader .rhead, #reader .rfoot');
  if(tg){e.preventDefault();e.stopPropagation();}
},true);
function showChrome(){revealChrome();}
function hideChrome(){concealChrome('tap');}
/* 16.10: the bars slide in/out over the text (CSS transitions on .barsoff). Off with «Анимации» off or prefers-reduced-motion. */
function rqBarsStill(){return typeof rqStill==='function'&&rqStill();}
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
function isLightBg(bg){
  const c=String(bg).replace('#','');
  const n=parseInt(c.length===3?c.split('').map(ch=>ch+ch).join(''):c,16);
  return (((n>>16)&255)+((n>>8)&255)+(n&255))>380;
}
function toggleDayNight(){
  const t=activeTheme();
  if(t.skin&&!SET.cBg)SET.theme=skinThemeKey(t.skin,!t.night); /* a skin keeps its own night («Карандашный», shop skins) */
  else SET.theme=isLightBg(SET.cBg||t.bg)?'dark':'sepia';
  SET.cBg=null;SET.cTxt=null;saveSet();applySet();
  {const lt=isLightBg(activeTheme().bg);flashMsg(lt?'Дневной режим':'Ночной режим',{kind:'info',icon:lt?'sun':'moon'});}
}
function addBookmark(){
  if(!R.book)return;
  const arr=(S.marks[R.book.id]=S.marks[R.book.id]||[]);
  const ratio=R.pageCount>1?R.page/(R.pageCount-1):0;
  arr.push({ratio:ratio,page:R.page+1,date:today()});
  save();
  flashMsg('Закладка на стр. '+(R.mode==='pdf'?pdfLabel(R.page):(R.page+1)),{kind:'info',icon:'bookmark'});
}
/* top-right corner tap: bookmark. While read-aloud is on (Джессика 16.10) the bars hide after a few seconds and the finger goes
   to where «Слушать» was — that tap shows the bars (so the pause button can be pressed) instead of dropping a bookmark. */
function cornerTR(){if(ttsOn||speaking){const r=el('reader');if(r&&r.classList.contains('barsoff')){revealChrome();return;}}addBookmark();}
/* toast icons: rqIcon() (js/core-a.js, one Lucide sprite in app.html) */
/* legacy calls without {kind}: game wording ⇒ game */
const RQ_GAME_RE=/XP|🪙|монет|босс|квест|талант|золот|награда|Удача|питом|опыт/i;
/** flashMsg(text, ms) or flashMsg(text, {kind:'game'|'info'|'error', icon, ms}).
 *  In the reader `game` toasts are NEVER shown (focus or not); `info`/`error` are allowed. */
function flashMsg(t,o){
  const opt=(o&&typeof o==='object')?o:{ms:o};
  const kind=opt.kind||(RQ_GAME_RE.test(String(t||''))?'game':'info');
  const inReader=!!(el('reader')&&!el('reader').classList.contains('hidden'));
  if(inReader&&kind==='game')return;
  if(inReader&&kind!=='error'&&el('selpop')&&!el('selpop').classList.contains('hidden'))return; /* audit 19.10 RD-SEL-02: nothing over the selection bar */
  const ms=opt.ms;
  document.querySelectorAll('.rq-toast').forEach(function(x){x.remove();}); /* one toast at a time */
  const d=document.createElement('div');
  d.className='rq-toast';
  d.setAttribute('role',kind==='error'?'alert':'status');
  if(opt.icon){d.innerHTML=rqIcon(opt.icon,20)+'<span></span>';d.lastChild.textContent=t;}else d.textContent=t;
  d.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--sheet);color:var(--txt);padding:8px 16px;border-radius:99px;z-index:95;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.4)';
  if(inReader){const pg=el('reader').dataset.page;d.classList.add('rd',pg==='night'?'n':'d');if(pg==='night')d.dataset.theme='night';} /* night page → night toast tokens */
  d.onclick=function(){d.remove();};
  document.body.appendChild(d);
  if(!inReader){const nb=typeof rqNavH==='function'?rqNavH():0;d.style.top='auto';d.style.bottom=nb?(nb+12+(el('bnRead')?32:0))+'px':'calc(24px + env(safe-area-inset-bottom))';} /* audit 19.10 LIB-ERR-02: above the bottom bar, never over a title; 20.10: and over the «Читать» bump */
  if(inReader){const rb=el('reader').querySelector('.rbot');if(rb&&!el('reader').classList.contains('barsoff')){const h=window.innerHeight-rb.getBoundingClientRect().top;if(rb.offsetHeight&&h>40&&h<window.innerHeight/2)d.style.setProperty('bottom',Math.round(h+12)+'px','important');}} /* audit 19.10: over the panel, not on it */
  if(d.scrollWidth>d.clientWidth+1)d.classList.add('imp'); /* long text wraps instead of running off the screen */
  const dur=ms!=null?ms:(inReader?3000:1600);
  setTimeout(function(){try{d.remove();}catch(e){}},dur);
}

/* audit 19.10 GL-04 / LIB-02: no system dialogs. rqAlert = a toast; rqAsk = a bottom sheet with «Отмена» (focused, Esc, tap outside) and the action.
   rqAsk({t,p,ok,danger}) → Promise<boolean>; with input:'text' a text field → Promise<string|null> (null = «Отмена») */
function rqAlert(t){flashMsg(String(t||''),{ms:4000,kind:/^Не удал|^Не хватает|не поддерж|запрещен/i.test(String(t||''))?'error':'info'});}
function rqAsk(o){return new Promise(function(res){
  let sc=el('rqAskScrim'),d=el('rqAsk');
  if(!d){sc=document.createElement('div');sc.id='rqAskScrim';d=document.createElement('div');d.id='rqAsk';d.setAttribute('role','alertdialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','rqAskT');document.body.appendChild(sc);document.body.appendChild(d);}
  const inp=o.input!=null;
  d.innerHTML='<div class="grab" aria-hidden="true"></div><h3 id="rqAskT"></h3><p id="rqAskP"></p>'+(inp?'<textarea id="rqAskIn" rows="3" maxlength="1000" aria-labelledby="rqAskT"></textarea>':'')+'<div class="rqaskb"><button type="button" class="ghostbtn" id="rqAskNo">Отмена</button><button type="button" id="rqAskOk"></button></div>';
  el('rqAskT').textContent=o.t||'';el('rqAskP').textContent=o.p||'';el('rqAskP').hidden=!o.p;el('rqAskOk').textContent=o.ok||'Да';el('rqAskOk').className=o.danger?'danger':'cta';
  const kd=function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(false);}};
  if(inp)el('rqAskIn').value=String(o.input);
  const done=function(v){const tv=inp?(v?el('rqAskIn').value.trim().slice(0,1000):null):v;sc.hidden=true;d.hidden=true;document.removeEventListener('keydown',kd,true);res(tv);};
  el('rqAskNo').onclick=function(){done(false);};el('rqAskOk').onclick=function(){done(true);};sc.onclick=function(){done(false);};
  sc.hidden=false;d.hidden=false;document.addEventListener('keydown',kd,true);try{el(inp?'rqAskIn':'rqAskNo').focus({preventScroll:true});}catch(e){}
});}

/* --- выделение текста → цитаты --- */
function selText(){
  const s=window.getSelection&&window.getSelection();
  if(!s||s.isCollapsed)return '';
  const t=String(s).trim();
  return t.length>2?t:'';
}
function updSelPop(){
  const off=!selText()||el('reader').classList.contains('hidden');
  if(!off&&el('selpop').classList.contains('hidden'))renderSpColors(); /* ring on the last colour */
  el('selpop').classList.toggle('hidden',off);
}
let selT=null;
document.addEventListener('selectionchange',()=>{if(selT)clearTimeout(selT);selT=setTimeout(updSelPop,200);});
/* 20.10 цвета цитат (Джессика, как в ReadEra): цвет — поле q.c у цитаты (нет поля или кривое = жёлтый), последний выбор — SET.hlc.
   Свой цвет (Джессика: «кастомным цветом») — q.c = '#rrggbb', последний свой — SET.hlx; прозрачность подбирается под страницу, текст книги ≥ 7:1 */
const HL_COLORS=[{k:'y',n:'Жёлтый',d:'#f5c518'},{k:'g',n:'Зелёный',d:'#5cb85c'},{k:'b',n:'Голубой',d:'#4aa3ec'},{k:'p',n:'Сиреневый',d:'#a97be0'},{k:'o',n:'Оранжевый',d:'#f39237'}];
const HL_HEX=/^#[0-9a-f]{6}$/;
function hlKey(c){if(typeof c==='string'&&HL_HEX.test(c.toLowerCase()))return c.toLowerCase();return HL_COLORS.some(x=>x.k===c)?c:'y';}
function hlDot(c){const k=hlKey(c);return k[0]==='#'?k:HL_COLORS.find(x=>x.k===k).d;}
/** colour of a highlighted string = the colour of its quote (S.hl keeps plain strings, as before) */
function quoteColor(bid,t){const q=(S.quotes[bid]||[]).find(x=>x&&x.text===t);return hlKey(q&&q.c);}
function markHtml(k,c){return c&&c[0]==='#'?'<mark data-hc="'+c+'">'+k+'</mark>':'<mark'+(c&&c!=='y'?' class="hl-'+c+'"':'')+'>'+k+'</mark>';}
function hlSetMark(m,c){m.className=c[0]==='#'||c==='y'?'':'hl-'+c;if(c[0]==='#')m.dataset.hc=c;else delete m.dataset.hc;m.style.background='';hlPaintCustom();}
/** own colours: the strongest alpha (day ≤ .45, night ≤ .30) at which the book text over it stays ≥ 7:1 on this page */
function hlPaintCustom(){
  const ms=document.querySelectorAll('#content mark[data-hc]');if(!ms.length)return;
  const rgb=(s)=>{const v=(String(s).match(/[\d.]+/g)||[0,0,0]).map(Number);return /^color\(srgb/.test(s)?v.map((x,i)=>i<3?x*255:x):v;};
  const lum=(c)=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);};
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
  const r=el('reader'),page=rgb(getComputedStyle(r).backgroundColor),night=r.dataset.page==='night',memo={};
  ms.forEach(m=>{const hc=hlKey(m.dataset.hc);if(hc[0]!=='#')return;const tx=rgb(getComputedStyle(m).color);
    const key=hc+tx.join();if(!(key in memo)){const c=[1,3,5].map(i=>parseInt(hc.slice(i,i+2),16));let a=night?0.30:0.45;
      while(a>0.03&&cr(tx,c.map((v,i)=>v*a+page[i]*(1-a)))<7.05)a-=0.01;memo[key]='rgba('+c.join(',')+','+a.toFixed(2)+')';}
    m.style.background=memo[key];});
}
/* 21.10 (Джессика: «выделяю в PDF, жму цвет — ничего не происходит»): in a PDF the quote also keeps where it is —
   q.pdf = {p: page index, r: [[x,y,w,h],…] in 0…1 of the page's text layer}; the highlight is drawn as boxes in that layer */
function pdfSelGeo(){
  try{if(R.mode!=='pdf')return null;const s=window.getSelection();if(!s||!s.rangeCount)return null;const rg=s.getRangeAt(0);
    let n0=rg.startContainer;if(n0&&n0.nodeType===3)n0=n0.parentNode;const tl=n0&&n0.closest&&n0.closest('.textLayer');if(!tl)return null;
    const sl=tl.closest('.psl'),p=sl?+sl.dataset.n:R.page;const b=tl.getBoundingClientRect();if(!b.width||!b.height)return null;
    const r=[];Array.prototype.forEach.call(rg.getClientRects(),q=>{const x0=Math.max(q.left,b.left),x1=Math.min(q.right,b.right),y0=Math.max(q.top,b.top),y1=Math.min(q.bottom,b.bottom);
      if(x1-x0<1||y1-y0<1)return;const k=[(x0-b.left)/b.width,(y0-b.top)/b.height,(x1-x0)/b.width,(y1-y0)/b.height].map(v=>Math.round(v*1e4)/1e4);
      if(!r.some(o=>Math.abs(o[0]-k[0])<.002&&Math.abs(o[1]-k[1])<.002&&Math.abs(o[2]-k[2])<.002))r.push(k);});
    return r.length?{p:p,r:r.slice(0,200)}:null;}catch(e){return null;}
}
function pdfHlPaint(tl,p){
  if(!tl||!R.book)return;const old=tl.querySelector(':scope > .pdfhls');if(old)old.remove();
  const qs=(S.quotes[R.book.id]||[]).filter(q=>q&&q.pdf&&q.pdf.p===p&&Array.isArray(q.pdf.r));if(!qs.length)return;
  const box=document.createElement('div');box.className='pdfhls';box.setAttribute('aria-hidden','true');
  qs.forEach(q=>{const c=hlKey(q.c),bg=c[0]==='#'?'rgba('+[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)).join(',')+',.35)':'var(--hl-'+c+')';
    q.pdf.r.forEach(k=>{if(!Array.isArray(k)||k.length!==4||!k.every(v=>typeof v==='number'&&isFinite(v)))return;const d=document.createElement('i');
      d.style.cssText='left:'+k[0]*100+'%;top:'+k[1]*100+'%;width:'+k[2]*100+'%;height:'+k[3]*100+'%;background:'+bg;box.appendChild(d);});});
  tl.insertBefore(box,tl.firstChild);
}
function pdfHlRefresh(){
  if(!R.book||R.mode!=='pdf')return;
  document.querySelectorAll('#pdfScroll .psl .textLayer').forEach(tl=>pdfHlPaint(tl,+tl.closest('.psl').dataset.n));
  const t=el('pdfText');if(t&&t.childNodes.length)pdfHlPaint(t,R.page);
}
function markInContent(t,c){
  const c0=el('content');const k=esc(t);
  if(c0.innerHTML.includes(k)){c0.innerHTML=c0.innerHTML.replace(k,markHtml(k,hlKey(c)));hlPaintCustom();}
}
function renderSpColors(){
  const box=el('spColors');if(!box)return;const cur=hlKey(SET.hlc),own=hlKey(SET.hlx)[0]==='#'?hlKey(SET.hlx):'';
  box.innerHTML=HL_COLORS.map(x=>'<button type="button" data-c="'+x.k+'"'+(x.k===cur?' class="on"':'')+' aria-label="Цитата, '+x.n.toLowerCase()+'" title="'+x.n+'" style="--d:'+x.d+'"><i aria-hidden="true"></i></button>').join('')+
    '<button type="button" id="spOwn"'+(cur[0]==='#'?' class="on"':'')+' aria-label="Цитата, свой цвет" title="Свой цвет"'+(own?' style="--d:'+own+'"':'')+'><i class="own'+(own?' set':'')+'" aria-hidden="true"></i></button>';
}
/* own colour: the system colour picker (input type=color outside the bar, so hiding the bar never closes it); the selection is taken BEFORE it opens */
let hlPick=null;
function hlOwnInput(){let i=el('hlOwnIn');if(!i){i=document.createElement('input');i.type='color';i.id='hlOwnIn';i.tabIndex=-1;i.setAttribute('aria-hidden','true');
  i.style.cssText='position:fixed;left:50%;bottom:120px;width:1px;height:1px;opacity:0;border:0;padding:0;pointer-events:none';document.body.appendChild(i);
  i.addEventListener('change',()=>{const v=hlKey(i.value),pk=hlPick;hlPick=null;if(v[0]!=='#'||!pk)return;SET.hlx=v;addQuote(false,v,pk);});}
  return i;}
function hlOwnOpen(){
  const m=selMark(),t=m?m.textContent:selText();if(!t||!R.book)return;hlPick={m,t,bid:R.book.id,geo:pdfSelGeo()};
  const i=hlOwnInput();i.value=hlKey(SET.hlx)[0]==='#'?hlKey(SET.hlx):'#e86fb0';
  try{if(i.showPicker)i.showPicker();else i.click();}catch(e){i.click();}
}
/** an already highlighted quote the selection sits in (then a colour recolours it instead of adding a copy) */
function selMark(){
  try{const s=window.getSelection();if(!s||!s.rangeCount)return null;let n=s.getRangeAt(0).commonAncestorContainer;if(n&&n.nodeType===3)n=n.parentNode;
    const m=n&&n.closest&&n.closest('mark');return m&&el('content').contains(m)?m:null;}catch(e){return null;}
}
function selDone(){if(window.getSelection)window.getSelection().removeAllRanges();el('selpop').classList.add('hidden');}
function addQuote(withNote,color,pick){ /* pick = {m,t,bid} taken before the colour picker opened */
  const m=pick?pick.m:selMark(),t=pick?pick.t:(m?m.textContent:selText());if(!t||!R.book||(pick&&pick.bid!==R.book.id))return;
  const geo=pick?pick.geo:pdfSelGeo();
  if(m&&!m.isConnected)return;
  const bid=R.book.id,c=hlKey(color||SET.hlc);
  if(color&&SET.hlc!==c){SET.hlc=c;saveSet();}
  const old=m?(S.quotes[bid]||[]).find(x=>x&&x.text===t):null;
  if(old){ /* recolour / re-note the quote under the selection */
    const put=(note)=>{old.c=c;if(note!=null)old.note=note;save();hlSetMark(m,c);};
    if(withNote){selDone();return rqAsk({t:'Заметка к цитате',p:'«'+t.slice(0,140)+(t.length>140?'…':'')+'»',ok:'Сохранить',input:old.note||''}).then(v=>{if(v!==null)put(v);});}
    put(null);selDone();return;
  }
  const commit=(note)=>{
    const q={text:t,note,date:today(),c};if(geo)q.pdf=geo;
    (S.quotes[bid]=S.quotes[bid]||[]).push(q);
    (S.hl[bid]=S.hl[bid]||[]).push(t);
    if(!(window.__rqWriter&&__rqWriter.noLocks)){
      if(!isMvp()){S.gold+=2;S.goldAllTime=(S.goldAllTime||0)+2;} /* MVP: no coins for quotes (not in the MVP economy); quote is still saved */
      addSkillXp('Аналитика',1);checkAchievements();
    } /* no locks → no coins */
    save();
    if(!R.book||R.book.id!==bid)return;
    markInContent(t,c);if(geo)pdfHlRefresh();
  };
  if(withNote){ /* 20.10: our sheet instead of the system prompt; «Отмена» saves nothing */
    selDone();
    return rqAsk({t:'Заметка к цитате',p:'«'+t.slice(0,140)+(t.length>140?'…':'')+'»',ok:'Сохранить',input:''}).then(v=>{if(v!==null)commit(v);});
  }
  commit('');selDone();
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
el('spColors').onclick=(e)=>{const b=e.target.closest&&e.target.closest('button');if(!b)return;if(b.id==='spOwn')hlOwnOpen();else if(b.dataset.c)addQuote(false,b.dataset.c);};
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
  if(!S.vocab.some(v=>v.w.toLowerCase()===word.toLowerCase())){S.vocab.push({w:word,ctx:ctx,book:(R.book||{}).title||'',date:today(),box:0});save();flashMsg('«'+word+'» — в словарь');}
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
  if(e.target&&e.target.closest&&e.target.closest('input,textarea,[contenteditable]'))return; /* 20.10: typing a note never turns the page */
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
  if(e.touches[0].clientX-el('viewer').getBoundingClientRect().left<28&&!rqScrollMode()){bright={y0:e.touches[0].clientY,d0:SET.bright==null?1:SET.bright};tx0=null;return;} // жест яркости у левого края (в прокрутке палец у края прокручивает)
  tx0=e.touches[0].clientX;
},{passive:true});
el('viewer').addEventListener('touchmove',e=>{
  if(R.mode==='pdf'){pdfTouchMove(e);return;}
  if(bright&&e.touches.length===1){
    const dy=e.touches[0].clientY-bright.y0;if(Math.abs(dy)>6)bright.mv=true;
    SET.bright=Math.round(Math.max(0.3,Math.min(1,bright.d0-dy/400))*100)/100; /* 18.10: own brightness (the edge is the text column's) */
    rqLightApply();
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
  if(bright){const mv=bright.mv;bright=null;if(mv){SET.bright=Math.round(SET.bright*20)/20;saveSet();applySet();flashMsg('Яркость '+Math.round(SET.bright*100)+'%',{kind:'info',icon:'sun'});return;}}
  if(pinch0){
    pinch0=null;tx0=null;
    endTextPinch(); // текст: щипок = размер шрифта, один рефлоу после жеста
    return;
  }
  if(Date.now()<pinchQuietUntil){tx0=null;return;} /* second finger lifting after a pinch is not a swipe */
  if(tx0===null)return;
  const ct=e.changedTouches[0];
  const dx=ct.clientX-tx0,dy=ct.clientY-(ty0==null?ct.clientY:ty0);tx0=null;
  if((flipGet().swipe!==false)&&Math.abs(dx)>50&&(!rqScrollMode()||Math.abs(dx)>Math.abs(dy)*1.5)){const inv=flipGet().invert?-1:1;fsResume();goPage(R.page+(dx<0?1:-1)*inv,true);return;}
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
  if(rqScrollMode())return; /* scroll mode: the wheel scrolls natively */
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
el('tabFind').onclick=()=>bfOpen(); /* 20.10: the one search screen (js/book-find.js), the same as the magnifier in the header */
el('btnFind').onclick=()=>bfOpen();
el('tabGrid').onclick=()=>renderPanel('grid');
function jumpRatio(fr){jumpTo(Math.round(fr*(R.pageCount-1)));el('panel').classList.add('hidden');}
/* audit 19.10 FR-03: a TXT without a stored toc gets one from its «Глава N» / «Часть N» lines (memory only, never written) */
let __txtToc={id:null,toc:[]};
function tocOf(b){if(!b)return [];if(b.toc&&b.toc.length)return b.toc;
  if(b.type==='pdf')return (R&&R.book===b&&R.pdfToc)||[]; /* 20.10: PDF bookmarks [{t,page}], memory only (bfPdfOutline) */
  if(!b.text)return [];if(__txtToc.id===b.id)return __txtToc.toc;
  const out=[],re=/(^|\n)[ \t]*((?:Глава|ГЛАВА|Часть|ЧАСТЬ)[ \t]+[^\n]{1,60})/g;let m;
  while((m=re.exec(b.text))&&out.length<400)out.push({t:m[2].trim(),off:m.index+m[1].length});
  __txtToc={id:b.id,toc:out.length>=2?out:[]};return __txtToc.toc;}
/* 21.10: the chapter being read is marked in «Главы» (the last one that starts on or before the current page) */
function tocCur(b,toc){if(tocCur._k===b.id+'|'+R.page+'|'+R.pageCount)return tocCur._v;const N=Math.max(1,R.pageCount),len=b.text&&b.text.length||0,pg=R.mode==='pdf'&&typeof P!=='undefined'&&P.shown>=0?P.shown:R.page;let c=-1;
  toc.forEach(function(x,i){const p=x.page!=null?x.page:(len?Math.round(x.off/len*(N-1)):0);if(p<=pg&&(c<0||p>=(toc[c].page!=null?toc[c].page:Math.round(toc[c].off/len*(N-1)))))c=i;});
  tocCur._k=b.id+'|'+R.page+'|'+R.pageCount;tocCur._v=c;return c;}
/* 21.10 (Джессика: «вместо слова "читаете" значок»): each skin its own mark (Бабочковый / Небесный draw theirs in skins.css) */
function tocNowIcon(){const k=document.documentElement.dataset.skin||'';return k==='ellada'?'amphora':k==='pencil'?'pencil':'book-open';}
function jumpToc(i){
  const b=R.book,toc=tocOf(b);if(!toc[i])return;
  if(toc[i].page!=null){jumpTo(toc[i].page);el('panel').classList.add('hidden');return;}
  jumpRatio(b.text&&b.text.length?toc[i].off/b.text.length:0);
}
function delMark(i){const ms=S.marks[(R.book||{}).id]||[];ms.splice(i,1);save();renderPanel('marks');}
function renderPanel(tab){
  panelTab=tab;rqGridStop();
  [['tabToc','toc'],['tabMarks','marks'],['tabQts','qts'],['tabGrid','grid']]
    .forEach(([bid,t])=>el(bid).classList.toggle('on',t===tab));
  const body=el('panelBody');const b=R.book;
  if(!b){body.innerHTML='<div class="pempty">Откройте книгу</div>';return;}
  if(tab==='grid'){rqGridRender(body);return;} /* 18.10: real page thumbnails, js/page-grid.js */
  if(tab==='toc'){
    const toc=tocOf(b);
    body.innerHTML=toc.length
      ?toc.map((ch,i)=>i===tocCur(b,toc)
        ?'<button class="prow on" aria-current="true" onclick="jumpToc('+i+')"><span class="ptt">'+esc(ch.t)+'</span><span class="pnow" role="img" aria-label="Читаете" title="Читаете">'+rqIcon(tocNowIcon(),18)+'</span></button>'
        :'<button class="prow" onclick="jumpToc('+i+')">'+esc(ch.t)+'</button>').join('')
      :'<div class="pempty">'+rqIcon('list',32)+'<div>У этой книги нет оглавления</div></div>';
    const on=body.querySelector('.prow.on');if(on)requestAnimationFrame(function(){try{on.scrollIntoView({block:'center'});}catch(e){}}); /* 21.10: a long contents opens at the chapter being read */
  }else if(tab==='marks'){
    const ms=S.marks[b.id]||[];
    body.innerHTML='<button class="prow add" onclick="addBookmark();renderPanel(\'marks\')">'+rqIcon('plus',16)+'Закладка на текущей странице</button>'+
      ms.map((m,i)=>'<div class="prow"><button style="flex:1;text-align:left" onclick="jumpRatio('+m.ratio.toFixed(4)+')">'+rqIcon('bookmark',14)+' Стр. '+m.page+'</button><span style="font-size:11px;color:var(--muted)">'+m.date+'</span><button onclick="delMark('+i+')" style="color:var(--muted)">✕</button></div>').join('');
  }else{
    const qs=S.quotes[b.id]||[];
    body.innerHTML=qs.length
      ?qs.map(q=>{
        const fr=b.text?Math.max(0,b.text.indexOf(q.text))/Math.max(1,b.text.length):0;
        return '<button class="prow" onclick="jumpRatio('+fr.toFixed(4)+')">«'+esc(q.text.slice(0,60))+(q.text.length>60?'…':'')+'»</button>';
      }).join('')
      :'<div class="pempty">'+rqIcon('quote',32)+'<div>Пока нет цитат — выделите текст в книге</div></div>';
  }
}

/* --- озвучка (TTS): непрерывная, с авто-переходом по страницам --- */
let speaking=false,ttsOn=false;
/* audit 15.10 (Маня): listening is not reading — while read-aloud is on, the tracker counts no minutes (no ring, XP, coins, streak).
   Stop → counting back to the normal rule (MVP always; full UI only with the timer on). */
function ttsCount(on){if(typeof __tracker!=='undefined'&&__tracker&&__tracker.isRunning&&__tracker.isRunning())__tracker.setCounting(on?(isMvp()||!!R.timerOn):false);}
/* Джессика 16.10: the bare «stop» square read as a glitch. Listening = a pause icon on a highlighted button (aria-pressed), stop = the speaker again. */
function ttsBtn(on){const b=el('btnTts');if(!b)return;b.innerHTML=rqIcon(on?'pause':'volume-2');b.classList.toggle('on',!!on);b.setAttribute('aria-pressed',on?'true':'false');
  const l=on?'Остановить озвучку':'Озвучка';b.setAttribute('aria-label',l);b.title=l;}
function ttsStop(){ttsOn=false;speaking=false;ttsCount(true);try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}nttsHalt();ttsBtn(false);}
/* audit 19.10 RD-TTS-01 (R4): no voice → the position never moves. A Russian voice is checked first (voiceschanged, up to 800 ms);
   none → the button looks inactive (aria-disabled) and a toast above the panel says so. The page turns when the speech STARTS
   (onstart / onboundary), never before speak(); a real error (not interrupted / canceled) or an end without a start stops the reading
   and puts the page back where listening began. */
function ttsVoices(){try{return (speechSynthesis.getVoices()||[]).filter(function(v){return /^ru/i.test(v.lang||'');});}catch(e){return [];}}
function ttsVoiceReady(){
  if(!window.speechSynthesis)return Promise.resolve(false);
  if(ttsVoices().length)return Promise.resolve(true);
  return new Promise(function(res){let done=false;const fin=function(){if(done)return;done=true;try{speechSynthesis.removeEventListener('voiceschanged',fin);}catch(e){}res(ttsVoices().length>0);};
    try{speechSynthesis.addEventListener('voiceschanged',fin);}catch(e){}setTimeout(fin,800);});
}
function ttsMarkVoice(ok){const b=el('btnTts');if(!b)return;if(ok||nttsOn())b.removeAttribute('aria-disabled');else b.setAttribute('aria-disabled','true');}
const TTS_NO_VOICE='Голос для чтения не найден. Установите его в настройках телефона';
function ttsFail(msg){if(!ttsOn)return;const p=R.ttsStartPage;ttsStop();
  if(typeof p==='number'&&p!==R.page&&R.book){R.ttsAdv=true;try{goPage(p,false);}finally{R.ttsAdv=false;}}
  flashMsg(msg?'Озвучка остановилась: '+msg:'Озвучка остановилась',msg?{ms:4000}:undefined);}

/* --- нейросетевая озвучка на своём ключе (Джессика 20.10: «нейросетевую озвучку… пользователи подключают свои ключи») ---
   Настройки → «Озвучка». Тот же ttsSay/ttsTextNext/ttsPdfNext, но кусок текста (≤ ~1700 знаков) уходит с телефона прямо в сервис,
   приходит mp3 и играет через <audio>; следующий кусок заказывается, пока играет текущий. Ключ только на устройстве, не в экспорте
   (arch.md 20.10). «Слушать» по-прежнему не считается чтением. */
const TTS_PROV={
  system:{name:'Телефон'},
  openai:{name:'OpenAI',voice:'nova',voices:'alloy, ash, coral, echo, fable, nova, onyx, sage, shimmer'},
  elevenlabs:{name:'ElevenLabs',voice:'JBFqnCBsd6RMkjVDRZzb',voices:'ID голоса из библиотеки ElevenLabs'},
  google:{name:'Google',voice:'ru-RU-Wavenet-D',voices:'ru-RU-Wavenet-A…E, ru-RU-Standard-A…E'},
  custom:{name:'Другой, как OpenAI',voice:'alloy',voices:'имя голоса сервиса'}
};
function nttsCfg(){const t=S.tts||{};const p=TTS_PROV[t.prov]?t.prov:'system';
  let key=t.key||'';if(!key&&p==='openai'&&S.ai&&S.ai.prov==='openai'&&S.ai.key)key=S.ai.key; /* тот же ключ OpenAI, что у ИИ-помощника */
  return {prov:p,key:key,voice:t.voice||(TTS_PROV[p].voice||''),base:String(t.base||'').replace(/\/+$/,'')};}
function nttsOn(){try{const c=nttsCfg();return c.prov!=='system'&&!!c.key&&(c.prov!=='custom'||!!c.base);}catch(e){return false;}}
let nttsAudio=null,nttsUrl=null,nttsGen=0;const NTTS_CACHE=new Map();
function nttsHalt(){nttsGen++;if(nttsAudio){try{nttsAudio.pause();nttsAudio.removeAttribute('src');nttsAudio.load();}catch(e){}}
  if(nttsUrl){try{URL.revokeObjectURL(nttsUrl);}catch(e){}nttsUrl=null;}}
async function nttsFetch(text){ /* → Blob mp3; ошибки понятным русским */
  const c=nttsCfg();let r;
  const net=async(u,o)=>{try{return await fetch(u,o);}catch(e){throw new Error(navigator.onLine===false?'нет интернета':'нет связи с сервисом');}};
  if(c.prov==='elevenlabs'){
    r=await net('https://api.elevenlabs.io/v1/text-to-speech/'+encodeURIComponent(c.voice)+'?output_format=mp3_44100_64',{method:'POST',
      headers:{'Content-Type':'application/json','xi-api-key':c.key},body:JSON.stringify({text:text,model_id:'eleven_multilingual_v2'})});
  }else if(c.prov==='google'){
    r=await net('https://texttospeech.googleapis.com/v1/text:synthesize?key='+encodeURIComponent(c.key),{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({input:{text:text},voice:{languageCode:'ru-RU',name:c.voice},audioConfig:{audioEncoding:'MP3'}})});
  }else{
    const base=c.prov==='custom'?c.base:'https://api.openai.com/v1';
    r=await net(base+'/audio/speech',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.key},
      body:JSON.stringify(Object.assign({model:c.prov==='openai'?'gpt-4o-mini-tts':'tts-1',voice:c.voice,input:text,response_format:'mp3'},
        c.prov==='openai'?{instructions:'Читай по-русски спокойно и выразительно, как аудиокнигу.'}:{}))});
  }
  if(r.status===401||r.status===403)throw new Error('сервис не принял ключ');
  if(r.status===402)throw new Error('на счёте сервиса нет денег');
  if(r.status===429)throw new Error('слишком много запросов или кончился лимит');
  if(!r.ok){let m='';try{const d=await r.json();m=(d&&d.error&&(d.error.message||d.error))||(d&&d.detail&&(d.detail.message||d.detail))||'';}catch(e){}
    throw new Error((typeof m==='string'&&m?m.slice(0,120):'сервис ответил '+r.status));}
  if(c.prov==='google'){const d=await r.json();if(!d||!d.audioContent)throw new Error('пустой ответ');
    const bin=atob(d.audioContent),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return new Blob([u8],{type:'audio/mpeg'});}
  const b=await r.blob();if(!b||!b.size)throw new Error('пустой ответ');return b;
}
function nttsGet(text){ /* один запрос на кусок; держим текущий и следующий */
  if(!NTTS_CACHE.has(text)){const pr=nttsFetch(text);pr.catch(()=>{});NTTS_CACHE.set(text,pr);while(NTTS_CACHE.size>3)NTTS_CACHE.delete(NTTS_CACHE.keys().next().value);}
  return NTTS_CACHE.get(text);
}
function nttsSay(t,onend,onstart,onpos,next){
  const gen=++nttsGen;speaking=true;
  nttsGet(t).then(function(blob){
    if(gen!==nttsGen||!ttsOn)return;
    if(!nttsAudio){nttsAudio=new Audio();nttsAudio.preload='auto';}
    if(nttsUrl)try{URL.revokeObjectURL(nttsUrl);}catch(e){}
    nttsUrl=URL.createObjectURL(blob);const a=nttsAudio;let started=false;
    a.onplaying=function(){if(gen!==nttsGen||started)return;started=true;if(ttsOn&&onstart)onstart();if(next)nttsGet(next);};
    a.ontimeupdate=function(){if(gen!==nttsGen||!ttsOn||!onpos||!a.duration||!isFinite(a.duration))return;onpos(Math.floor(t.length*a.currentTime/a.duration));};
    a.onended=function(){if(gen!==nttsGen||!ttsOn)return;NTTS_CACHE.delete(t);if(onend)onend();};
    a.onerror=function(){if(gen!==nttsGen)return;ttsFail('телефон не смог проиграть звук');};
    a.src=nttsUrl;const pp=a.play();if(pp&&pp.catch)pp.catch(function(e){if(gen===nttsGen&&ttsOn)ttsFail(e&&e.name==='NotAllowedError'?'нажмите «Слушать» ещё раз':'звук не запустился');});
  },function(e){if(gen!==nttsGen||!ttsOn)return;NTTS_CACHE.delete(t);ttsFail(e&&e.message);});
}
function ttsSay(t,onend,onstart,onpos,next){
  if(nttsOn()){nttsSay(t,onend,onstart,onpos,next);return;}
  const u=new SpeechSynthesisUtterance(t);u.lang='ru-RU';
  const v=ttsVoices();if(v.length)try{u.voice=v[0];}catch(e){}
  let started=false;const t0=Date.now();
  u.onstart=function(){started=true;if(ttsOn&&onstart)onstart();};
  u.onboundary=function(e){if(!started){started=true;if(ttsOn&&onstart)onstart();}if(ttsOn&&onpos&&typeof e.charIndex==='number')onpos(e.charIndex);};
  u.onend=function(){if(!ttsOn)return;if(!started&&Date.now()-t0<1500){ttsFail();return;}if(onend)onend();}; /* an end with no start, at once = no voice */
  u.onerror=function(e){const k=e&&e.error;if(k==='interrupted'||k==='canceled')return;ttsFail();};
  speaking=true;speechSynthesis.speak(u);
}
function ttsPageAt(pos){const b=R.book;if(!b||!b.text||R.pageCount<=1)return;const np=Math.round((pos/b.text.length)*(R.pageCount-1));
  if(np>R.page){R.ttsAdv=true;try{goPage(np,false);}finally{R.ttsAdv=false;}}} /* 1в: via:'tts', not «reached»; forward only */
function ttsChunkEnd(text,st){let end=Math.min(text.length,st+1500);const tail=text.slice(end,end+220).search(/[.!?…\n]/);if(tail>=0)end+=tail+1;return end;}
function ttsTextNext(){
  if(!ttsOn||!R.book||R.mode==='pdf')return;
  const b=R.book;
  if((R.ttsPos||0)>=b.text.length){ttsStop();flashMsg('Книга озвучена до конца');return;}
  const st=R.ttsPos||0;
  const end=ttsChunkEnd(b.text,st),chunk=b.text.slice(st,end);
  const nx=end<b.text.length?b.text.slice(end,ttsChunkEnd(b.text,end)):''; /* нейроголос: следующий кусок заказывается заранее */
  ttsSay(chunk,function(){R.ttsPos=end;if(ttsOn)setTimeout(ttsTextNext,100);},function(){ttsPageAt(st);},function(ci){ttsPageAt(st+ci);},nx);
}
function ttsPdfNext(){
  if(!ttsOn||!R.book||R.mode!=='pdf'||!R.pdf)return;
  R.pdf.getPage(R.page+1).then(p=>p.getTextContent()).then(tc=>{
    if(!ttsOn)return;
    const t=tc.items.map(i=>i.str).join(' ').trim();
    const advance=function(){if(ttsOn&&R.page<R.pageCount-1){pdfGo(R.page+1,'tts');setTimeout(ttsPdfNext,120);}else{ttsStop();flashMsg('Конец документа');}};
    if(!t){advance();return;}
    const parts=[];let st=0;while(st<t.length){const e=nttsOn()?ttsChunkEnd(t,st):t.length;parts.push(t.slice(st,e));st=e;} /* нейроголос: страница кусками ≤ ~1700 */
    const sayPart=function(i){if(!ttsOn)return;if(i>=parts.length){advance();return;}ttsSay(parts[i],function(){sayPart(i+1);},null,null,parts[i+1]||'');};
    sayPart(0);
  }).catch(()=>ttsStop());
}
if(window.speechSynthesis){ttsVoiceReady().then(ttsMarkVoice);try{speechSynthesis.addEventListener('voiceschanged',function(){ttsMarkVoice(ttsVoices().length>0);});}catch(e){}}else ttsMarkVoice(false);
el('btnTts').onclick=()=>{
  if(ttsOn||speaking){ttsStop();return;}
  if(!R.book)return;
  if(!nttsOn()&&!window.speechSynthesis){ttsMarkVoice(false);flashMsg('Озвучка не поддерживается этим браузером');return;}
  (nttsOn()?Promise.resolve(true):ttsVoiceReady()).then(function(ok){
    ttsMarkVoice(ok);
    if(!ok){flashMsg(TTS_NO_VOICE,{ms:4000});return;}
    if(!R.book||ttsOn)return;
    ttsOn=true;ttsCount(false);ttsBtn(true);R.ttsStartPage=R.page;
    if(R.mode==='pdf'){ttsPdfNext();}
    else{const fr=R.pageCount>1?R.page/(R.pageCount-1):0;R.ttsPos=Math.floor(fr*R.book.text.length);ttsTextNext();}
  });
};

/* ================= СЕССИЯ И НАГРАДЫ ================= */
/* Idempotent close (Архитектор, 1б): header ←, popstate and the pwa-lock handover may fire almost together →
   ONE tracker.end (one sessions[] row, one id), one payout, one summary. Concurrent callers get the same promise;
   a caller after the close finished (reader already hidden, no book) is a no-op — it must not repaint summary → library. */
let __closingReader=null;
function closeReader(opts){
  HY.tok++;if(el('txtBack'))el('txtBack').classList.add('hidden'); /* 1в: drop a pending hyphenation relayout */
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
  if(typeof bfReset==='function'){bfReset();const fo=el('bookFind');if(fo)fo.hidden=true;} /* 20.10: the search lives with the open book only */
  stopChrome();stopDayBar();el('sheet').classList.add('hidden');el('panel').classList.add('hidden');el('aiChat').classList.add('hidden');el('aiSheet').classList.add('hidden');relWake();
  try{const sl=window.getSelection&&getSelection();if(sl)sl.removeAllRanges();}catch(e){}el('selpop').classList.add('hidden'); /* audit 19.10 RD-SEL-01: no selection bar over the library */
  if(window.speechSynthesis){speechSynthesis.cancel();speaking=false;}nttsHalt();speaking=false;ttsOn=false;ttsBtn(false);
  const b=R.book;if(!b){if(__tracker&&o.quiet){try{await stalePaid(__tracker.end());}catch(e){}}else if(!o.quiet){show('library');navAfterClose(false);}return;}
  const bLvl=bookLvlOf(b); /* 19.10: level the session was read at (for the summary lines) */
  R.book=null;
  S.progress[b.id]=Object.assign({},S.progress[b.id],{ratio:R.maxRatio},typeof R.pos==='number'?{pos:R.pos}:{});
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
    questPaid={gold:res.gold||0,daily:res.daily||[],weekly:res.weekly||[],lvlGold:res.lvlGold||0,lvl:bLvl,rowLvl:(window.__rqGame&&window.__rqGame.rowLevel(row))||0};
  }else{
    xp=Math.round((pages*5+min*10)*dmul)+(justFinished?Math.round(200*dmul):0);
    gold=Math.round((pages*2+min)*dmul*imMul)+(justFinished?Math.round(100*dmul*imMul):0);
    const luck=Math.random();mult=luck<0.02?3:luck<0.08?2:1;
    xp=Math.round(xp*mult*xpMultEff()*talVal('xp'));gold=Math.round(gold*mult*talVal('gold'));
  }
  const stN=statOf(b);
  const statGain=Math.max(1,Math.round((Math.round(min)+pages)*dmul*talVal('stat')));
  if(!isMvp()){S.xp+=xp;if(window.__rqGame)window.__rqGame.markAwarded(S,[row.id]);}
  S.gold+=gold;S.goldAllTime=(S.goldAllTime||0)+gold;
  S.stats[stN]=(S.stats[stN]||0)+statGain;
  if(sd===today())S.minToday+=min;S.totalMin+=min;S.totalPages+=pages;S.sessions++;
  S.hp=Math.min(S.hpMax,(S.hp==null?S.hpMax:S.hp)+15);if(justFinished)S.hp=S.hpMax; // чтение восстанавливает здоровье
  dealBossDamage(min,pages,justFinished);S.petXp=(S.petXp||0)+min; // урон боссу + рост питомца
  /* Soft streak ≥ STREAK_MIN (3 min, Маня 15.10): preserve streak when day's total minutes ≥ 3.
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
  const earn=id=>{if(typeof achV2==='function'&&achV2())return; /* v2: old badges are not earned any more (their ids live in the catalog) */
    if(!S.badges.includes(id)){S.badges.push(id);newB.push(BADGES.find(x=>x.id===id));}};
  earn('first');
  if(hour>=23)earn('owl');
  if(hour<8)earn('lark');
  if(min>=30)earn('marathon');
  if(S.streak>=3)earn('streak3');
  if(S.streak>=7)earn('streak7');
  if(justFinished)earn('finisher');
  if(level(S.xp)>=5)earn('lvl5');
  const newAch=checkAchievements();
  const achNew=typeof achRun==='function'?achRun():[]; /* v2: recorded once, shown only on the summary (no toast in the reader) */
  save();
  /* sessions[] row already written above by __tracker.end (one row, UUID id) */
  const _sumArgs={xp,gold,pages,min,stat:stN,statGain,newB,lvBefore,justFinished,mult,flipped:R.turned,cheatFinish,dName:DIFFS[dIdx].n,dmul:dmul,newAch:newAch,achNew:achNew,day:sd,quest:questPaid,title:(b&&b.title)||''};
  if(o.quiet)return; /* closed in passing (begin() over a stale session): counted + paid, no summary, screen untouched */
  if(!summaryWanted(_sumArgs)){renderLibrary();show('library');navAfterClose(false);
    /* audit 19.10 SUM-03: a short session no longer closes silently (a blink-open, under 5 s, stays quiet) */
    if((Number(min)||0)*60>=5)flashMsg('Меньше минуты — не засчитано');return;}
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
/* audit 19.10 SUM-01 (R3, решение 09.10): the level is in every summary — «Уровень N · ещё K XP до N+1-го» and a 6 px bar from before to now;
   a level-up fills the bar and reads «Новый уровень: N!». level(xp)=floor(sqrt(xp/100))+1 → level L starts at 100·(L−1)² XP. */
function lvlFloor(L){return 100*(L-1)*(L-1);}
function sumLevel(lvNow,lvBefore,xpBefore){
  const t=el('sumLvlT'),bar=el('sumLvlBar');if(!t||!bar)return;
  const fr=function(x,L){return Math.max(0,Math.min(1,(x-lvlFloor(L))/(lvlFloor(L+1)-lvlFloor(L))));};
  const xp=S.xp||0,up=lvNow>lvBefore;
  t.textContent=up?'Новый уровень: '+lvNow+'!':'Уровень '+lvNow+' · ещё '+Math.max(0,lvlFloor(lvNow+1)-xp)+' XP до '+(lvNow+1)+'-го';
  t.classList.toggle('up',up);
  bar.style.transition='none';bar.style.width=Math.round(fr(Number(xpBefore)||0,up?lvBefore:lvNow)*100)+'%'; /* start: where the session began */
  void bar.offsetWidth;bar.style.transition='';
  requestAnimationFrame(function(){bar.style.width=Math.round((up?1:fr(xp,lvNow))*100)+'%';});
}
function renderSummary(r){
  countUp(el('sumXp'),r.xp,n=>'+'+n+' XP');
  countUp(el('sumPages'),r.pages,n=>n);
  if(el('sumPagesLbl'))el('sumPagesLbl').textContent=plural(r.pages,'страница','страницы','страниц'); /* audit 19.10 SUM-02 */
  /* whole minutes (floor, the dayMinutes rule); under one minute → «меньше минуты» (decision D) */
  const wm=Math.floor((Number(r.min)||0)+1e-9);
  el('sumMin').textContent=wm<1?'меньше минуты':wm;el('sumMin').style.fontSize=wm<1?'15px':'';
  if(el('sumMinLbl'))el('sumMinLbl').classList.toggle('hidden',wm<1);
  const hl=summaryHeadline(r.quest),hd=el('sumHead');
  if(hd){hd.textContent=hl||'Сессия завершена';hd.style.color=hl?'var(--accent2)':'';hd.style.fontWeight=hl?'600':'';}
  countUp(el('sumGold'),r.gold,n=>'+'+n);
  el('sumGoldLbl').textContent=plural(r.gold,'монета','монеты','монет');
  el('sumStat').textContent='+'+r.statGain;
  el('sumStatName').textContent=r.stat;
  const notes=[];
  if(r.flipped>r.pages)notes.push(''+(r.flipped-r.pages)+' стр. пролистаны быстрее лимита и не засчитаны');
  if(r.cheatFinish)notes.push('Финиш не засчитан: для бонуса нужно честно прочитать ~70% страниц');
  el('sumNote').textContent=notes.join(' · ');
  if(S.ux&&S.ux.vibe!==false&&navigator.vibrate){try{navigator.vibrate(r.mult>1||r.newB.length?[60,40,60]:40);}catch(e){}}
  el('luckLbl').classList.toggle('hidden',!(r.mult>1));
  if(r.mult>1)el('luckLbl').textContent='Удача! Все награды ×'+r.mult;
  const lvNow=level(S.xp);
  el('lvlUp').classList.toggle('hidden',lvNow<=r.lvBefore);
  if(lvNow>r.lvBefore)el('lvlUp').textContent='Новый уровень: '+lvNow+'!';
  sumLevel(lvNow,r.lvBefore,S.xp-(Number(r.xp)||0));
  el('sumStreak').textContent='Стрик: '+S.streak+' '+plural(S.streak,'день','дня','дней')+
    (r.dmul>1&&!isMvp()?' · '+r.dName+' ×'+r.dmul:'')+
    '';
  /* audit 19.10 SUM-04: «Книга прочитана» is its own badge line, not glued to the streak */
  const sf=el('sumFin');if(sf){sf.classList.toggle('hidden',!r.justFinished);sf.innerHTML=r.justFinished?rqIcon('book-open',16)+'<span>Книга прочитана, бонус!</span>':'';}
  const bb=el('sumBadges');bb.innerHTML='';
  r.newB.forEach(b=>{const d=document.createElement('div');d.className='newbadge pop';d.textContent='Новый бейдж: «'+b.name+'»';bb.appendChild(d);});
  (r.newAch||[]).forEach(a=>{const d=document.createElement('div');d.className='newbadge pop';d.textContent='Достижение: «'+a.title+'»'+(a.prize?' — '+a.prize:'');bb.appendChild(d);});
  /* achievements v2: at most two lines + «и ещё N»; visible in MVP (#sumBadges is not) */
  const sa=el('sumAch');if(sa){const an=r.achNew||[];sa.innerHTML=an.slice(0,2).map(function(a){return '<div>'+rqIcon('trophy',14)+'<span>Новое достижение: «'+esc(a.name)+'»</span></div>';}).join('')+(an.length>2?'<div class="more">и ещё '+(an.length-2)+'</div>':'');sa.classList.toggle('hidden',!an.length);}
  /* day of THIS session (local start day), not "now": 23:50–00:15 shows the first day */
  const sday=r.day||today();
  if(el('sumDailyInfo'))el('sumDailyInfo').textContent=(dailyPaid(sday)?'✓ ':'')+mvpDailyInfo(sday)+(sday!==today()?' (вчера)':'');
  if(el('sumDailyBar'))el('sumDailyBar').style.width=Math.round(mvpDailyProg(sday)*100)+'%';
  if(typeof bbHatchRender==='function')bbHatchRender(mvpDailyProg(sday),'sumHatch');
  if(el('sumWeeklyInfo'))el('sumWeeklyInfo').textContent='Неделя: '+mvpWeeklyInfo(weekKey(sday))+(weeklyPaid(weekKey(sday))?' · ✓ неделя выполнена':'');
  /* gold lines ONLY for what was paid by THIS session (re-render with no `quest` → no lines) */
  const qp=r.quest||{daily:[],weekly:[]},ql=[];
  if(qp.daily&&qp.daily.length)ql.push('+'+coinsP(30*qp.daily.length)+' — ежедневка выполнена');
  if(qp.weekly&&qp.weekly.length)ql.push('+'+coinsP(120*qp.weekly.length)+' — неделя выполнена');
  if(qp.lvlGold>0)ql.push('+'+coinsP(qp.lvlGold)+' — бонус за сложность книги');
  const qh=ql.map(function(t){return '<div>'+rqIcon('coins',14)+'<span>'+t+'</span></div>';});
  const lt=summaryLevelLine(qp);if(lt)qh.push('<div>'+rqIcon(lt.ic,14)+'<span>'+lt.t+'</span></div>');
  const qb=el('sumQuestGold');if(qb){qb.innerHTML=qh.join('');qb.classList.toggle('hidden',!qh.length);}
  if(el('btnDone'))el('btnDone').textContent=isMvp()?'В библиотеку':'Продолжить';
  /* «Карандашный»: subtitle «книга», «минут чтения», 4 week dots (filled = goal days), emoji stripped from the text lines */
  const pc=typeof isPencil==='function'&&isPencil();
  if(el('sumSub'))el('sumSub').textContent=r.title||'';
  if(el('sumMinLbl'))el('sumMinLbl').textContent=plural(wm,'минута','минуты','минут')+(pc?' чтения':''); /* audit 19.10 SUM-02 */
  if(el('sumWeekDots')){const n=Math.min(4,daysInWeekAtGoal(goalMin(),weekKey(sday)).count);let h='';for(let i=0;i<4;i++)h+=i<n?rqIcon('circle-check',18):rqIcon('circle',18);el('sumWeekDots').innerHTML=h;}
  if(pc){const de=t=>String(t).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\u200D]+\s*/gu,'');
    ['sumNote','lvlUp','luckLbl'].forEach(function(k){const e=el(k);if(e)e.textContent=de(e.textContent);});
    bb.querySelectorAll('.newbadge').forEach(function(d){d.textContent=de(d.textContent);});
    if(el('sumGoldLbl'))el('sumGoldLbl').textContent=plural(r.gold,'монета','монеты','монет');}
  applyMvpChrome();
}

function confetti(opts){
  if(rqStill())return; /* «Анимации» off / prefers-reduced-motion */
  opts=opts||{};
  const count=opts.count!=null?opts.count:26;
  const avoidTop=!!opts.avoidTop; /* keep clear of summary heading */
  for(let i=0;i<count;i++){ /* own pieces per skin (CONFETTI_SKIN / confettiPiece, js/core-b.js), no emoji; colours = theme tokens */
    const s=document.createElement('div');s.className='confetti';
    const pc=confettiPiece(i);s.innerHTML=pc.html;if(pc.c){s.dataset.c=pc.c;s.dataset.f=pc.f;}
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
/** 19.10: one line about the book level of THIS session (XP multiplier, or why it was not applied); null = ordinary book */
function summaryLevelLine(q){
  const L=window.__rqGame&&window.__rqGame.LEVELS;if(!L||!q||!(q.lvl>0))return null;
  const r=q.rowLvl||0,m=function(x){return String(L[x].xp).replace('.',',');};
  if(r>=q.lvl)return {ic:'trending-up',t:L[r].n+' книга: опыт ×'+m(r)};
  return {ic:'info',t:'Листали быстрее, чем читается '+L[q.lvl].n.toLowerCase()+' книга: '+(r>0?'опыт ×'+m(r):'бонус за сложность не начислен')};
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
    if(generalOverReader()){closeGeneralSettings();if(st!=='reader')navPush('reader');return;}
    if(st==='reader')return;
    const ac=el('aiChat'),as=el('aiSheet'); /* 20.10: системный «назад» сначала закрывает окна ИИ */
    if(!ac.classList.contains('hidden')||!as.classList.contains('hidden')){ac.classList.add('hidden');as.classList.add('hidden');navPush('reader');return;}
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

