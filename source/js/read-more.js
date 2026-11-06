'use strict';
/* ===== «Ещё для чтения» (05.11, Джессика: «давай все кроме заботы о глазах»). Data: SET.wsp, SET.psp, SET.rm (arch.md 05.11, rqRmNorm in reader.js).
   1 между словами и абзацами · 2 свой шрифт из файла · 3 шрифты Andika / Literata (core-b.js FONTS) · 4 жирное начало слова · 5 ширина строки ·
   6 буквица в начале главы · 7 автолистание · 8 сноски в окне · 9 свои зоны тапа · 10 назад и вперёд по прыжкам · 11 таймер сна ·
   12 подсветка читаемого предложения · 13 «Что было раньше» · 14 книга с переводом рядом · 16 линейка строки · 17 режим e-ink ·
   18 образец текста в «Настройках чтения» · 19 наборы по времени суток.
   Loaded BEFORE js/read-extras.js: its double tap wraps our viewerTap. No coins, no XP: the autoscroll turns pages like a finger, the honest-reading
   rules (min / max time on a page) still decide what counts; it stops by itself after RM_AUTO_IDLE without a touch. */
const RM={uf:false,auto:{on:false,paused:false,t0:0,raf:0,acc:0,last:0,lastIn:0,line:null},sleep:{until:0,chap:-1,chapPg:-1,iv:0,fade:false},
  hl:{key:'',range:null},jb:{back:[],fwd:[]},todLast:'',ruler:{y:0,ivAt:0},eink:0,recapOffer:null};
const RM_AUTO_STEPS=[5,8,10,12,15,20,25,30,40,50,60,75,90,120,150,180,240,300,420,600];
const RM_AUTO_IDLE=30*60000; /* 30 min without a touch → the autoscroll stops (a dozing reader is not reading) */
const RM_ZONE_N={none:'Ничего',prev:'Назад',next:'Вперёд',bars:'Панели',night:'День / ночь',mark:'Закладка',auto:'Автолистание',tts:'Слушать',rsvp:'Слово за словом'};
const RM_ZONE_DEF=['night','bars','mark','prev','bars','next','prev','bars','next'];
const RM_SLEEP=[[0,'Выкл'],[15,'15 мин'],[30,'30 мин'],[45,'45 мин'],[60,'1 час'],[-1,'До конца главы']];
const RM_MAXW=[[0,'Нет'],[55,'55'],[65,'65'],[75,'75']];
function rmS(){if(!SET.rm)SET.rm=rqRmNorm(null);return SET.rm;}
function rmOpen(){const r=el('reader');return !!(r&&!r.classList.contains('hidden')&&typeof R!=='undefined'&&R&&R.book);}
function rmText(){return rmOpen()&&R.mode==='text';}
function rmPage(){return R.mode==='pdf'&&typeof P!=='undefined'&&P.shown>=0?P.shown:R.page;}

/* ---------- text offsets over ALL text nodes of #content (the bold word starts split nodes; the joined text stays the same) ---------- */
function rmNodes(root){const w=document.createTreeWalker(root||el('content'),NodeFilter.SHOW_TEXT);const a=[];let n,o=0;while((n=w.nextNode())){a.push({n:n,s:o});o+=n.nodeValue.length;}return {a:a,len:o};}
function rmOffOf(T,node,off){for(let i=0;i<T.a.length;i++)if(T.a[i].n===node)return T.a[i].s+off;return -1;}
function rmAt(T,off){let lo=0,hi=T.a.length-1;if(hi<0)return null;while(lo<hi){const m=(lo+hi+1)>>1;if(T.a[m].s<=off)lo=m;else hi=m-1;}const x=T.a[lo];return {node:x.n,offset:Math.max(0,Math.min(off-x.s,x.n.nodeValue.length))};}
/** keep the reading place while the DOM of the text changes: the first character of the page as a text offset */
function rmKeep(fn){
  if(!rmText()){fn();return;}
  const a=typeof readingAnchor==='function'?readingAnchor():null,T=rmNodes();const off=a?rmOffOf(T,a.node,a.offset):-1;
  fn();
  const T2=rmNodes(),p=off>=0?rmAt(T2,off):null;R.anc=null;
  relayout(p?{force:true,anchor:{node:p.node,offset:Math.min(p.offset,Math.max(0,p.node.nodeValue.length-1))}}:{force:true});
}

/* ---------- 1, 5, 6: word / paragraph spacing, line width, drop cap ---------- */
function rmApplyText(){
  const c=el('content'),r=el('reader');if(!c||!r)return;const m=rqRm();
  c.style.wordSpacing=SET.wsp?SET.wsp+'px':'';
  c.style.setProperty('--rm-psp',(SET.psp||0)+'em');c.classList.toggle('rmpsp',!!SET.psp);
  c.classList.toggle('rmcap',!!m.cap);
  r.classList.toggle('rmeink',!!m.eink);
  rmRenderSheet();
}
{const a0=applySet;applySet=function(){a0.apply(this,arguments);rmApplyText();};}
{const k0=layoutKey;layoutKey=function(){const m=rqRm();return k0.apply(this,arguments)+'|'+(SET.wsp||0)+'|'+(SET.psp||0)+'|'+(m.cap?1:0)+(m.bion?1:0)+'|'+m.maxw;};}
/* average letter width of the book font now (for «Ширина строки»), measured once per look */
function rmCharW(){const k=[SET.font,SET.size,SET.ls,SET.wsp,SET.weight].join('|');if(rmCharW.k===k)return rmCharW.v;
  const s=document.createElement('span');s.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0';
  s.style.fontFamily=(FONTS[SET.font]||FONTS[0]).v;s.style.fontSize=SET.size+'px';s.style.letterSpacing=(SET.ls||0)+'px';s.style.wordSpacing=(SET.wsp||0)+'px';s.style.fontWeight=SET.weight||400;
  s.textContent='Через базарную площадь идёт полицейский надзиратель Очумелов в новой шинели и с узелком.';document.body.appendChild(s);
  const v=s.getBoundingClientRect().width/s.textContent.length;s.remove();rmCharW.k=k;rmCharW.v=v||SET.size*0.5;return rmCharW.v;}
{const m0=rqTextMargin;rqTextMargin=function(){
  m0.apply(this,arguments);const mx=rqRm().maxw,v=el('viewer');if(!mx||!v||!R||R.mode==='pdf')return;
  const W=window.innerWidth;if(rqCols(W-2*SET.margin)>1)return; /* two pages side by side: each is narrow already */
  const mw=Math.max(v._mw||SET.margin,Math.floor((W-mx*rmCharW())/2));
  if(mw!==v._mw){v._mw=mw;v.style.margin='0 '+mw+'px';el('reader').style.setProperty('--r-margin',mw+'px');}
};}

/* ---------- 4: bold start of a word ---------- */
const RM_BI_RE=/\p{L}[\p{L}\p{M}'’́-]*/gu;
function rmBiN(w){const n=w.length;return n<=3?1:n<=5?2:Math.ceil(n*0.42);}
function rmBionOn(root){
  if(!root||root.dataset.rmbi)return;root.dataset.rmbi='1';
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){const p=n.parentNode;return p&&(p.closest('.meta,.rq-h,h3,b.rmbi'))?2:1;}});
  const list=[];let n;while((n=w.nextNode()))if(/\p{L}/u.test(n.nodeValue))list.push(n);
  list.forEach(function(t){const s=t.nodeValue,f=document.createDocumentFragment();let i=0,m;RM_BI_RE.lastIndex=0;
    while((m=RM_BI_RE.exec(s))){const k=rmBiN(m[0]);if(m.index>i)f.appendChild(document.createTextNode(s.slice(i,m.index)));
      const b=document.createElement('b');b.className='rmbi';b.textContent=m[0].slice(0,k);f.appendChild(b);
      if(k<m[0].length)f.appendChild(document.createTextNode(m[0].slice(k)));i=m.index+m[0].length;}
    if(i<s.length)f.appendChild(document.createTextNode(s.slice(i)));t.parentNode.replaceChild(f,t);});
}
function rmBionOff(root){if(!root||!root.dataset.rmbi)return;delete root.dataset.rmbi;
  root.querySelectorAll('b.rmbi').forEach(function(b){b.replaceWith(document.createTextNode(b.textContent));});root.normalize();}
/* the book is put into #content by openBook; rqBookImgs runs right after, before the first layout */
{const i0=rqBookImgs;rqBookImgs=function(b){const c=el('content');delete c.dataset.rmbi;if(rqRm().bion&&b&&b.type!=='pdf')rmBionOn(c);return i0.apply(this,arguments);};}
/* a long press selects the whole word, not only its bold start */
{const w0=smWord;smWord=function(p){const r=w0.apply(this,arguments);if(!r||!el('content').dataset.rmbi)return r;let lo=r[0],hi=r[1];
  if(hi[1]===hi[0].nodeValue.length){const par=hi[0].parentNode,s=par&&par.classList&&par.classList.contains('rmbi')?par.nextSibling:null;
    if(s&&s.nodeType===3){let z=0;while(z<s.nodeValue.length&&SM_W.test(s.nodeValue[z]))z++;if(z)hi=[s,z];}}
  if(lo[1]===0){const s=lo[0].previousSibling;if(s&&s.nodeType===1&&s.classList.contains('rmbi')&&s.firstChild){const t=s.firstChild;lo=[t,0];}}
  return [lo,hi];};}
function rmSetBion(on){rmS().bion=on;saveSet();if(rmText())rmKeep(function(){if(on)rmBionOn(el('content'));else rmBionOff(el('content'));});rmRenderSheet();}

/* ---------- 2: own font file ---------- */
function rmUfIdx(){return FONTS.findIndex(function(f){return f.user;});}
function rmUfSync(){
  const i=rmUfIdx(),m=rqRm();if(i<0)return;FONTS[i].label=RM.uf&&m.ufont?m.ufont:'Свой шрифт';
  const b=document.querySelector('#fontSeg .xopt[data-k="'+i+'"]');if(b){b.hidden=!RM.uf;const n=b.querySelector('.xn');if(n)n.textContent=FONTS[i].label;}
  try{rqCollapseSync('fontSeg');}catch(e){}
  const s=el('rmUfS'),go=el('rmUfGo'),rm=el('rmUfDel');if(s){s.textContent=RM.uf&&m.ufont?'«'+m.ufont+'» есть в списке шрифтов':'Файл TTF, OTF или WOFF с телефона';go.textContent=RM.uf?'Другой':'Выбрать файл';rm.hidden=!RM.uf;}
}
async function rmUfLoad(buf){
  const ff=new FontFace('RQ User Font',buf);await ff.load();
  try{document.fonts.forEach(function(f){if(f.family.replace(/"/g,'')==='RQ User Font')document.fonts.delete(f);});}catch(e){}
  document.fonts.add(ff);RM.uf=true;
}
async function rmUfBoot(){
  if(!rqRm().ufont||typeof idbGet!=='function'){rmUfSync();return;}
  try{const v=await idbGet('ufont');if(v){await rmUfLoad(v instanceof Blob?await v.arrayBuffer():v);if(rmOpen()&&SET.font===rmUfIdx())relayout({force:true});}}catch(e){console.warn('[rq] own font',e);RM.uf=false;}
  rmUfSync();
}
async function rmUfPick(f){
  if(!f)return;if(f.size>15*1048576){flashMsg('Файл шрифта больше 15 МБ');return;}
  let buf;try{buf=await f.arrayBuffer();await rmUfLoad(buf.slice(0));}catch(e){flashMsg('Этот файл не похож на шрифт. Нужен TTF, OTF или WOFF');return;}
  try{await idbPut('ufont',buf);}catch(e){flashMsg('Не получилось сохранить шрифт на телефоне');return;}
  const nm=String(f.name||'Свой шрифт').replace(/\.(ttf|otf|woff2?)$/i,'').replace(/[-_]+/g,' ').trim().slice(0,40)||'Свой шрифт';
  rmS().ufont=nm;SET.font=rmUfIdx();saveSet();rmUfSync();applySet();if(rmText())relayout({force:true});flashMsg('Шрифт «'+nm+'» включён');
}
async function rmUfDel(){
  const i=rmUfIdx();RM.uf=false;rmS().ufont='';if(SET.font===i)SET.font=0;saveSet();
  try{await idbDel('ufont');}catch(e){}
  try{document.fonts.forEach(function(f){if(f.family.replace(/"/g,'')==='RQ User Font')document.fonts.delete(f);});}catch(e){}
  rmUfSync();applySet();if(rmText())relayout({force:true});flashMsg('Свой шрифт убран');
}

/* ---------- 7: autoscroll ---------- */
function rmAutoSec(){const s=rqRm().auto.sec;if(s)return s;
  const v=R.mode==='pdf'?(typeof rxSpp==='function'?rxSpp():90):(typeof rxMinPages==='function'?rxMinPages(1)*60:60);
  return Math.max(10,Math.min(600,Math.round(v||60)));}
function rmAutoLabel(){const s=rmAutoSec();return (rqRm().auto.sec?'':'≈ ')+(s<60?s+' с':Math.floor(s/60)+' мин'+(s%60?' '+(s%60)+' с':''))+(rqScrollMode()?' на экран':' на страницу');}
function rmAutoTr(on){if(typeof __tracker!=='undefined'&&__tracker&&__tracker.setAuto)__tracker.setAuto(on);} /* 06.11: autoscroll pages follow the honest autoscroll rule */
function rmAutoStart(){
  if(!rmOpen())return;
  if(typeof ttsOn!=='undefined'&&ttsOn){flashMsg('Сначала остановите озвучку');return;}
  const a=RM.auto;a.on=true;a.paused=false;a.t0=performance.now();a.acc=0;a.last=a.t0;a.lastIn=Date.now();
  el('sheet').classList.add('hidden');el('panel').classList.add('hidden');
  concealChrome('tap');rmAutoUi();cancelAnimationFrame(a.raf);a.raf=requestAnimationFrame(rmAutoLoop);rmAutoTr(true);
  flashMsg('Автолистание: '+rmAutoLabel()+'. Тап в центр — пауза',{kind:'info',icon:'play'});
}
function rmAutoStop(msg){const a=RM.auto;if(!a.on)return;a.on=false;a.paused=false;rmAutoTr(false);cancelAnimationFrame(a.raf);rmAutoUi();if(msg)flashMsg(msg,{kind:'info',icon:'pause'});}
function rmAutoPause(p){const a=RM.auto;if(!a.on)return;a.paused=p;rmAutoTr(!p);if(!p){a.t0=performance.now()-a.acc;a.last=performance.now();a.lastIn=Date.now();concealChrome('tap');}else revealChrome();rmAutoUi();}
function rmAutoToggle(){if(RM.auto.on)rmAutoStop('Автолистание выключено');else rmAutoStart();}
function rmAutoHold(){return document.hidden||!el('sheet').classList.contains('hidden')||!el('panel').classList.contains('hidden')||(typeof SM!=='undefined'&&SM.on)||!!(typeof selText==='function'&&selText())||
  !!document.querySelector('#aiSheet:not(.hidden),#trSheet:not(.hidden),#bookFind:not(.hidden),#rmNote:not([hidden])');}
function rmAutoLoop(now){
  const a=RM.auto;if(!a.on)return;a.raf=requestAnimationFrame(rmAutoLoop);
  const dt=Math.min(250,now-a.last);a.last=now;
  if(!rmOpen()){rmAutoStop();return;}
  if(Date.now()-a.lastIn>RM_AUTO_IDLE){rmAutoStop('Автолистание остановлено: полчаса без касаний');return;}
  if(a.paused||rmAutoHold()){a.t0+=dt;rmAutoLine();return;}
  const sec=rmAutoSec();
  if(rqScrollMode()){const v=el('viewer');a.acc+=dt*R.step/(sec*1000);const d=Math.floor(a.acc);
    if(d>=1){a.acc-=d;if(v.scrollTop>=(R.scrollMax||0)-1){rmAutoStop('Конец книги');return;}v.scrollTop+=d;rqScrollSoon();}return;}
  a.acc=now-a.t0;rmAutoLine();
  if(a.acc>=sec*1000){const p=rmPage();
    if(p>=R.pageCount-1){rmAutoStop('Конец книги');return;}
    a.t0=now;a.acc=0;goPage(p+1,true);}
}
function rmAutoLine(){const l=el('rmAutoLine');if(!l)return;const a=RM.auto;l.hidden=!a.on||rqScrollMode();if(a.on)l.style.transform='scaleX('+Math.min(1,a.acc/(rmAutoSec()*1000)).toFixed(4)+')';}
function rmAutoUi(){
  const a=RM.auto,b=el('rmAuto');if(!b)return;b.hidden=!a.on;el('reader').classList.toggle('rmauto',a.on);
  el('rmAutoPP').innerHTML=rqIcon(a.paused?'play':'pause',20);el('rmAutoPP').setAttribute('aria-label',a.paused?'Продолжить':'Пауза');
  el('rmAutoV').textContent=rmAutoLabel();rmAutoLine();
  const s=el('rmAutoGo');if(s)s.textContent=a.on?'Остановить':'Начать';
}
function rmAutoStep(d){const cur=rmAutoSec();let i=RM_AUTO_STEPS.findIndex(function(x){return x>=cur;});if(i<0)i=RM_AUTO_STEPS.length-1;
  if(RM_AUTO_STEPS[i]!==cur&&d<0)i++; /* «быстрее» = fewer seconds */
  i=Math.max(0,Math.min(RM_AUTO_STEPS.length-1,i-d));rmS().auto.sec=RM_AUTO_STEPS[i];saveSet();rmAutoUi();rmRenderSheet();}
['pointerdown','keydown'].forEach(function(t){document.addEventListener(t,function(){RM.auto.lastIn=Date.now();},true);});
/* a manual turn while the autoscroll runs starts the page's time again */
new MutationObserver(function(){if(RM.auto.on){RM.auto.t0=performance.now();RM.auto.acc=0;}rmRulerTop();rmEinkTurn();}).observe(el('pgNum'),{childList:true,characterData:true,subtree:true});

/* ---------- 8: footnotes in a window ---------- */
const RM_FN=[/\[(\d{1,4})\]|\{(\d{1,4})\}/g,/(?<=[\p{L}.,;:!?»”)])(\d{1,3}|\*{1,3})(?=[\s.,;:!?»”)\]—–-]|$)/gu,/([¹²³⁴⁵⁶⁷⁸⁹⁰]+)/g];
const RM_SUP='⁰¹²³⁴⁵⁶⁷⁸⁹';
/** the note mark under a finger: {key, node} or null. A plain number counts only right after a word («слово1», «конец.12») */
function rmFnAt(cx,cy){
  const r=document.caretRangeFromPoint&&document.caretRangeFromPoint(cx,cy);if(!r)return null;const n=r.startContainer;
  if(!n||n.nodeType!==3||!el('content').contains(n)||(n.parentNode&&n.parentNode.closest('.meta,.rq-h')))return null;
  const t=n.nodeValue,o=r.startOffset;
  for(let k=0;k<RM_FN.length;k++){const re=RM_FN[k];re.lastIndex=0;let m;
    while((m=re.exec(t))){const s=m.index,e=s+m[0].length;if(o>=s-1&&o<=e+1){let key=m[1]||m[2]||m[0];
        if(k===2)key=key.split('').map(function(c){return RM_SUP.indexOf(c);}).join('');
        return {key:key,mark:m[0],node:n,s:s,e:e};}
      if(s>o+2)break;}}
  return null;
}
function rmFnClean(s){return String(s).replace(/\s+\n/g,'\n').trim();}
/** the note's text in the book: the notes part (FB2 «Примечания», a «Notes» chapter), else after the mark in the same part, else the last 40 % */
function rmFnFind(b,key,at){
  const t=b.text||'';if(!t)return '';
  const toc=(tocOf(b)||[]).filter(function(x){return typeof x.off==='number';});
  const nt=toc.filter(function(x){return /примечани|комментари|сноск|^notes?$|endnotes|footnotes/i.test(x.t);}).pop();
  const regions=[];if(nt)regions.push(t.slice(nt.off));
  regions.push(t.slice(at,at+60000));regions.push(t.slice(Math.floor(t.length*0.6)));
  const num=/^\d+$/.test(key),head=function(p){const m=/^[\[{(]?(\d{1,4}|\*{1,3})[\]})]?[.)]?$/.exec(p);return m?m[1]:null;};
  for(let g=0;g<regions.length;g++){
    const ps=regions[g].split(/\n[ \t]*\n/);
    for(let i=0;i<ps.length;i++){const p=ps[i].trim();if(!p)continue;
      if(head(p)===key){const out=[];for(let j=i+1;j<ps.length&&out.length<4;j++){const q=ps[j].trim();if(!q)continue;if(head(q)!=null)break;out.push(q);if(!num)break;}
        if(out.length)return rmFnClean(out.join('\n\n')).slice(0,1500);}
      const m=/^[\[{(]?(\d{1,4}|\*{1,3})[\]})]?[.)]?\s+(\S[\s\S]*)$/.exec(p);
      if(m&&m[1]===key&&(g!==1||i>0))return rmFnClean(m[2]).slice(0,1500);}}
  return '';
}
function rmFnShow(key,txt,x,y){
  const d=el('rmNote');if(!d)return;
  d.innerHTML='<div class="rmnh">'+rqIcon('notebook-pen',16)+'<b>Сноска '+esc(/^\d+$/.test(key)?key:'')+'</b><button type="button" class="closes" id="rmNoteX" aria-label="Закрыть">'+rqIcon('x',20)+'</button></div><div class="rmnb">'+esc(txt).replace(/\n\n/g,'<br><br>')+'</div>';
  d.hidden=false;const H=innerHeight,h=d.offsetHeight;
  d.style.top=(y>H*0.55?Math.max(8,y-h-18):Math.min(H-h-8,y+22))+'px';
  el('rmNoteX').onclick=function(e){e.stopPropagation();rmFnHide();};
}
function rmFnHide(){const d=el('rmNote');if(d&&!d.hidden){d.hidden=true;return true;}return false;}
document.addEventListener('pointerdown',function(e){const d=el('rmNote');if(d&&!d.hidden&&!d.contains(e.target)){rmFnHide();RM.fnClosedAt=Date.now();}},true);

/* ---------- 9: own tap zones ---------- */
function rmZoneAt(x,y){const z=rqRm().zones;if(!z||flipGet().tap===false)return null;return z[Math.min(2,Math.max(0,Math.floor(y*3)))*3+Math.min(2,Math.max(0,Math.floor(x*3)))];}
{const z0=tapZone;tapZone=function(x,y){const a=rmZoneAt(x,y);if(!a)return z0.apply(this,arguments);
  const inv=flipGet().invert; /* the callers turn «l» into page −1·inv: undo it, own zones mean what they say */
  return a==='prev'?(inv?'r':'l'):a==='next'?(inv?'l':'r'):a==='night'?'tl':a==='mark'?'tr':a==='bars'?'c':'x';};}
function rmZoneAct(a){
  if(a==='auto'){rmAutoToggle();return true;}
  if(a==='tts'){const b=el('btnTts');if(b)b.click();return true;}
  if(a==='rsvp'){if(typeof rsOpen==='function')rsOpen();return true;}
  if(a==='none')return true;
  return false;
}
{const p0=pdfSingleTap;pdfSingleTap=function(x,y){
  if(RM.auto.on&&x>=0.3&&x<=0.7&&y>=0.12){rmAutoPause(!RM.auto.paused);return;}
  const a=rmZoneAt(x,y);if(a&&rmZoneAct(a))return;return p0.apply(this,arguments);};}

/* ---------- the text tap: footnote → autoscroll pause → own zones → the usual ---------- */
{const v0=viewerTap;viewerTap=function(cx,cy){
  if(RM.fnClosedAt&&Date.now()-RM.fnClosedAt<350)return; /* the tap that closed the note window */
  if(R.mode==='text'&&!(typeof SM!=='undefined'&&SM.on)&&!selText()){
    if(rqRm().fn&&R.book){const f=rmFnAt(cx,cy);if(f){const T=rmNodes(),dom=rmOffOf(T,f.node,f.s),at=Math.floor(dom/Math.max(1,T.len)*R.book.text.length);
      const txt=rmFnFind(R.book,f.key,at);if(txt){rmFnShow(f.key,txt,cx,cy);return;}}}
    const r=el('viewer').getBoundingClientRect(),x=(cx-r.left)/r.width,y=(cy-r.top)/r.height;
    if(RM.auto.on&&x>=0.3&&x<=0.7&&y>=0.12&&!quoteHit(cx,cy)){rmAutoPause(!RM.auto.paused);return;}
    const a=rmZoneAt(x,y);if(a&&['auto','tts','none','rsvp'].indexOf(a)>=0){if(quoteTapAt(cx,cy))return;rmZoneAct(a);return;}
  }
  return v0.apply(this,arguments);};}

/* ---------- 10: back and forward through jumps ---------- */
{const s0=showJumpBack;showJumpBack=function(from){
  if(!RM.jb.nav){const b=RM.jb.back;if(b[b.length-1]!==from)b.push(from);if(b.length>20)b.shift();RM.jb.fwd=[];}
  s0.apply(this,arguments);rmJbFwd();};}
{const h0=hideJumpBack;hideJumpBack=function(){h0.apply(this,arguments);if(!RM.jb.nav){RM.jb.fwd=[];const f=el('rmJbFwd');if(f)f.hidden=true;}};}
function rmJbFwd(){const f=el('rmJbFwd');if(!f)return;const n=RM.jb.fwd[RM.jb.fwd.length-1];f.hidden=n==null||!rmOpen();if(f.hidden)return;
  el('rmJbFwdN').textContent='на стр. '+(R.mode==='pdf'&&typeof pdfLabel==='function'?pdfLabel(n):(n+1));
  const jbv=!el('jumpBack').classList.contains('hidden'),pl=el('pgLine').getBoundingClientRect(),rd=el('reader'),bot=rd.querySelector('.rbot');
  f.style.left=(jbv?el('jumpBack').getBoundingClientRect().right+8:pl.left+parseFloat(getComputedStyle(el('pgLine')).paddingLeft||0)-6)+'px';
  f.style.bottom=((bot&&!rd.classList.contains('barsoff')?bot.offsetHeight:Math.max(0,innerHeight-pl.top))+6)+'px';}
function rmJbGo(to,push,pop){const cur=rmPage();pop.pop();push.push(cur);RM.jb.nav=true;
  try{hideJumpBack();jumpTo(to);const b=RM.jb.back[RM.jb.back.length-1];if(b!=null)showJumpBack(b);}finally{RM.jb.nav=false;}
  rmJbFwd();}
el('jumpBack').onclick=function(e){e.stopPropagation();const b=RM.jb.back,f=R.jumpFrom;
  if(!b.length||b[b.length-1]!==f){hideJumpBack();if(f!=null)jumpTo(f);return;}
  rmJbGo(f,RM.jb.fwd,b);};
function rmJbFwdGo(e){if(e)e.stopPropagation();const f=RM.jb.fwd;if(!f.length)return;const to=f[f.length-1],cur=rmPage();
  f.pop();RM.jb.back.push(cur);RM.jb.nav=true;try{hideJumpBack();jumpTo(to);showJumpBack(cur);}finally{RM.jb.nav=false;}rmJbFwd();}

/* ---------- 11: sleep timer · 12: the sentence being read ---------- */
{const b0=ttsBtn;ttsBtn=function(on){b0.apply(this,arguments);if(on)rmSleepStart();else{rmSleepClear();rmHlClear();}const s=el('btnSleep');if(s)s.hidden=!on;};}
function rmSleepStart(){
  const z=RM.sleep,m=rqRm().sleep;rmSleepClear();if(!m||!rmOpen())return;
  if(m>0){z.until=Date.now()+m*60000;}
  else{const b=R.book;if(R.mode==='pdf'){const ch=typeof bfChapters==='function'?bfChapters():[],p=rmPage(),nx=ch.find(function(c){return c.page>p;});z.chapPg=nx?nx.page:-1;}
    else{const st=R.ttsPos||Math.floor((R.pageCount>1?R.page/(R.pageCount-1):0)*b.text.length),nx=(tocOf(b)||[]).filter(function(x){return typeof x.off==='number'&&x.off>st+40;}).sort(function(a,c){return a.off-c.off;})[0];z.chap=nx?nx.off:-1;}
    if(z.chap<0&&z.chapPg<0){z.until=Date.now()+30*60000;flashMsg('Глав не нашлось: озвучка остановится через 30 минут',{kind:'info',icon:'moon'});}}
  z.iv=setInterval(rmSleepTick,1000);rmSleepTick();
}
function rmSleepClear(){const z=RM.sleep;clearInterval(z.iv);z.iv=0;z.until=0;z.chap=-1;z.chapPg=-1;z.fade=false;try{if(typeof nttsAudio!=='undefined'&&nttsAudio)nttsAudio.volume=1;}catch(e){}rmSleepChip();}
function rmSleepTick(){
  const z=RM.sleep;if(!(typeof ttsOn!=='undefined'&&ttsOn)){rmSleepClear();return;}
  if(z.until){const left=z.until-Date.now();
    if(left<=12000&&typeof nttsAudio!=='undefined'&&nttsAudio){z.fade=true;try{nttsAudio.volume=Math.max(0,Math.min(1,left/12000));}catch(e){}}
    if(left<=0){rmSleepEnd('Таймер сна: озвучка остановлена');return;}}
  if(z.chapPg>=0&&rmPage()>=z.chapPg){rmSleepEnd('Глава дослушана, озвучка остановлена');return;}
  rmSleepChip();
}
function rmSleepEnd(msg){rmSleepClear();if(typeof ttsStop==='function')ttsStop();flashMsg(msg,{kind:'info',icon:'moon',ms:4000});}
function rmSleepChip(){const c=el('rmSleep');if(!c)return;const z=RM.sleep;let t='';
  if(z.until){const m=Math.max(0,Math.ceil((z.until-Date.now())/60000));t='сон через '+m+' мин';}else if(z.chap>=0||z.chapPg>=0)t='сон в конце главы';
  if(c.textContent!==t)c.textContent=t;const b=el('btnSleep');if(b){b.classList.toggle('on',!!t);b.setAttribute('aria-label','Таймер сна: '+(t||'выключен'));}}
/* the chunk the voice reads never runs past the chapter end the timer waits for */
{const c0=ttsChunkEnd;ttsChunkEnd=function(text,st){let e=c0.apply(this,arguments);const z=RM.sleep.chap;if(z>st&&e>z)e=z;return e;};}
{const n0=ttsTextNext;ttsTextNext=function(){if(typeof ttsOn!=='undefined'&&ttsOn&&RM.sleep.chap>=0&&(R.ttsPos||0)>=RM.sleep.chap){rmSleepEnd('Глава дослушана, озвучка остановлена');return;}return n0.apply(this,arguments);};}
function rmSleepCycle(){const m=rqRm().sleep,i=RM_SLEEP.findIndex(function(x){return x[0]===m;}),nx=RM_SLEEP[(i+1)%RM_SLEEP.length];
  rmS().sleep=nx[0];saveSet();if(typeof ttsOn!=='undefined'&&ttsOn)rmSleepStart();flashMsg(nx[0]?'Таймер сна: '+nx[1].toLowerCase():'Таймер сна выключен',{kind:'info',icon:'moon'});
  if(typeof rxRender==='function')rxRender();}
/* 12: the voice is at b.text offset pos → the sentence around it is painted on the page (CSS Highlight API, nothing in the DOM) */
function rmHlClear(){RM.hl.key='';try{if(window.CSS&&CSS.highlights)CSS.highlights.delete('rm-tts');}catch(e){}}
function rmHlAt(pos){
  if(!rqRm().ttsHl||!rmText()||!(window.CSS&&CSS.highlights&&window.Highlight))return;
  const t=R.book.text;let a=pos,z=pos;
  while(a>0&&!/[.!?…\n]/.test(t[a-1]))a--;while(z<t.length&&!/[.!?…\n]/.test(t[z]))z++;while(z<t.length&&/[.!?…»”")]/.test(t[z]))z++;
  const sen=t.slice(a,z).replace(/￼img:\d+/g,'').trim();if(sen.length<2)return;
  const key=a+'|'+sen.length;if(RM.hl.key===key)return;RM.hl.key=key;
  const T=rmNodes(),all=T.a.map(function(x){return x.n.nodeValue;}).join(''),guess=Math.floor(a/Math.max(1,t.length)*T.len);
  const probe=sen.slice(0,60);let best=-1,from=Math.max(0,guess-6000);
  for(;;){const i=all.indexOf(probe,from);if(i<0||i>guess+6000)break;if(best<0||Math.abs(i-guess)<Math.abs(best-guess))best=i;from=i+1;}
  if(best<0){CSS.highlights.delete('rm-tts');return;}
  const s=rmAt(T,best),e=rmAt(T,Math.min(T.len,best+sen.length));if(!s||!e)return;
  try{const rg=document.createRange();rg.setStart(s.node,s.offset);rg.setEnd(e.node,e.offset);CSS.highlights.set('rm-tts',new Highlight(rg));}catch(err){}
}
{const p0=ttsPageAt;ttsPageAt=function(pos){const r=p0.apply(this,arguments);try{rmHlAt(pos);}catch(e){}return r;};}

/* ---------- 13: «Что было раньше» ---------- */
async function rmRecapText(b){
  if(b.type==='pdf'){if(!rmOpen()||R.book.id!==b.id||!R.pdf)return '';const p=rmPage(),out=[];
    for(let i=Math.max(0,p-8);i<=p;i++){try{const tc=await (await R.pdf.getPage(i+1)).getTextContent();out.push(tc.items.map(function(x){return x.str;}).join(' '));}catch(e){}}
    return out.join('\n').replace(/\s+\n/g,'\n').slice(-12000);}
  if(!b.text&&typeof __rq!=='undefined'&&__rq&&__rq.idb){try{const t=await __rq.idb.getText(b.id);if(typeof t==='string')b.text=t;}catch(e){}}
  const t=b.text||'',pos=rmOpen()&&R.book.id===b.id&&R.pageCount>1?R.page/(R.pageCount-1):rqPos(b.id),at=Math.floor(pos*t.length);
  rmRecapText.at=at;return t.slice(Math.max(0,at-12000),at).replace(/￼img:\d+/g,'');
}
async function rmRecap(b){
  b=b||(rmOpen()&&R.book);if(!b)return;
  if(!aiOn()){aiNoKey();return;}
  const box=el('aiBody');aiCur=null;aiSeq++;const my=aiSeq;rmAiHead(true);
  const draw=function(h){box.innerHTML='<div class="ai-q">«'+esc(b.title)+'»</div>'+h;};
  el('aiSheet').classList.remove('hidden');
  if(navigator.onLine===false){draw('<div class="ai-a" role="alert">Нужен интернет. Включите сеть и попробуйте ещё раз.</div>');return;}
  draw('<div class="ai-a ai-wait" role="status">Вспоминаю…</div>');
  const k='recap|'+b.id+'|'+Math.round(rqPos(b.id)*1000);
  let out=RM_RECAP[k]||'',err='';
  if(!out){try{const tx=await rmRecapText(b);if(!tx.trim())throw new Error('нет текста до этого места');
      const at=b.type==='pdf'?-1:rmRecapText.at,ch=at<0?[]:(tocOf(b)||[]).filter(function(x){return typeof x.off==='number'&&x.off<=at;}).map(function(x){return x.t;}).slice(-30);
      out=await aiViaKey({system:'Ты помощник в приложении для чтения. Человек вернулся к книге после перерыва и хочет вспомнить, что было. '+
        'Напомни по-русски, простым языком, 5–8 предложений: где мы остановились, что происходило в последних главах, кто главные герои и что их сейчас волнует. '+
        'Строго без спойлеров: ничего о том, что будет после последнего отрывка. Если чего-то не видно в отрывке, можешь опираться на то, что знаешь о книге, но только до этого места. Без вступлений.',
        user:'Книга: «'+b.title+'»'+(bookAuthor(b)?', '+bookAuthor(b):'')+(ch.length?'\nГлавы до этого места: '+ch.join('; '):'')+'\nПоследний прочитанный отрывок (конец = место, где человек остановился):\n'+tx,cap:3000},800);
      RM_RECAP[k]=out;}catch(e){err=e&&e.message||'ошибка';}}
  if(my!==aiSeq||el('aiSheet').classList.contains('hidden'))return;
  if(out)draw('<div class="ai-a">'+esc(out).replace(/\n+/g,'<br>')+'</div><div class="ai-note">Ответ ИИ, может ошибаться. Дальше этого места он не заглядывал</div>'+
    (rmOpen()&&R.book.id===b.id?'<button class="ghostbtn" id="rmRecapGo">'+rqIcon('book-open',16)+' Читать дальше</button>':'<button class="ghostbtn" id="rmRecapGo">'+rqIcon('book-open',16)+' Открыть книгу</button>'));
  else{draw('<div class="ai-a" role="alert">Не получилось вспомнить: '+esc(err)+'.</div><button class="ghostbtn" id="rmRecapAgain">'+rqIcon('rotate-cw',16)+' Ещё раз</button>');el('rmRecapAgain').onclick=function(){rmRecap(b);};return;}
  el('rmRecapGo').onclick=function(){el('aiSheet').classList.add('hidden');if(!(rmOpen()&&R.book.id===b.id)){el('bookSheet').classList.add('hidden');openBook(b.id);}};
}
const RM_RECAP={};
/* the AI sheet's title is «Объясни»; for the recap it says «Что было раньше» until the sheet closes */
function rmAiHead(on){const h=document.querySelector('#aiSheet > h3');if(!h)return;if(!h.dataset.rm0)h.dataset.rm0=h.innerHTML;
  h.innerHTML=on?rqIcon('history',18)+' Что было раньше':h.dataset.rm0;}
new MutationObserver(function(){if(el('aiSheet').classList.contains('hidden'))rmAiHead(false);}).observe(el('aiSheet'),{attributes:true,attributeFilter:['class']});
/* after ≥ 3 days away: a small offer on top of the page (only with an AI key; it goes away by itself) */
{const o0=openBook;openBook=async function(id){const prev=(S.lastOpen||{})[id];const r=await o0.apply(this,arguments);
  try{if(rqRm().recap&&prev&&Date.now()-prev>=3*864e5&&rqPos(id)>0.02&&aiOn()&&rmOpen()&&R.book.id===id)rmRecapOffer(Math.floor((Date.now()-prev)/864e5));}catch(e){}
  try{rmTodTick(true);}catch(e){}
  return r;};}
function rmRecapOffer(days){
  const d=el('rmRecapOffer');if(!d)return;clearTimeout(RM.recapOffer);
  d.innerHTML='<span>'+rqIcon('history',18)+' Книга не открывалась '+days+' '+plural(days,'день','дня','дней')+'. Напомнить, что было?</span><button type="button" class="ghostbtn" id="rmRecapYes">Напомнить</button><button type="button" class="closes" id="rmRecapNo" aria-label="Не надо">'+rqIcon('x',18)+'</button>';
  const hd=el('reader').querySelector('.rhead'),bo=el('reader').classList.contains('barsoff');d.style.top=((!bo&&hd&&!rqRm().oneh?hd.getBoundingClientRect().bottom:8)+8)+'px';
  d.hidden=false;el('rmRecapYes').onclick=function(e){e.stopPropagation();d.hidden=true;rmRecap();};el('rmRecapNo').onclick=function(e){e.stopPropagation();d.hidden=true;};
  RM.recapOffer=setTimeout(function(){d.hidden=true;},15000);
}

/* ---------- 14: a book with the translation under each paragraph (own books in another language) ---------- */
const RM_TRL=/\b(the|and|of|to|was|that|with|his|her|you|not|have|which|he|she|it|in|on|but|would|this|by)\b/g;
function rmBookLang(b){if(b.lang&&/^[a-z]{2}/i.test(b.lang))return b.lang.slice(0,2).toLowerCase();const t=(b.text||'').slice(0,6000);
  const cy=(t.match(/[Ѐ-ӿ]/g)||[]).length,la=(t.match(/[A-Za-zÀ-ɏ]/g)||[]).length;if(cy>=la)return 'ru';
  let best='en',bs=-1;if(typeof TR_SW==='object')Object.keys(TR_SW).forEach(function(k){const n=(t.toLowerCase().match(TR_SW[k])||[]).length;if(n>bs){bs=n;best=k;}});return best;}
function rmBiOk(b){return b&&b.type!=='pdf'&&!/#bi$/.test(b.srcId||'')&&typeof advBilingual==='function'&&typeof TR_LANGS==='object';}
let rmBiBusy=false;
async function rmBiMake(id){
  if(rmBiBusy)return;const b=allBooks().find(function(x){return x.id===id;});if(!b)return;
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне');return;}
  const sid=(b.srcId||('own:'+b.id))+'#bi',have=allBooks().find(function(x){return x.srcId===sid;});if(have){el('bookSheet').classList.add('hidden');openBook(have.id);return;}
  rmBiBusy=true;const btn=el('rmBiGo'),prog=function(t){if(btn){btn.disabled=true;btn.querySelector('.rmbl>span').textContent=t;}};
  try{
    if(!b.text&&__rq&&__rq.idb){const t=await __rq.idb.getText(b.id);if(typeof t==='string')b.text=t;}
    const from=rmBookLang(b);if(from==='ru'||!TR_LANGS[from]){flashMsg('Книга на русском, переводить нечего');return;}
    prog('Проверяю пакет языка…');const st=await trState(from,'ru');if(!st.path){flashMsg('Для этого языка пока нет пакета перевода');return;}
    if(!st.have)await trDownload(st.path,function(x){prog('Пакет языка · '+Math.round(x*100)+' %');});
    const r={text:b.text,toc:(tocOf(b)||[]).filter(function(x){return typeof x.off==='number';}).map(function(x){return Object.assign({},x);})};
    prog('Перевожу…');await advBilingual(r,from,function(pc){prog('Перевожу · '+pc+' %');});
    const nb={id:newBookId(),title:b.title+' · с переводом',author:b.author,genre:b.genre,stat:b.stat||'Воображение',cover:'',text:r.text,toc:r.toc,lang:from,srcId:sid,
      fname:String(b.fname||b.title).replace(/\.[a-z0-9]+$/i,'')+'-bi.txt',size:r.text.length};
    await rqAddBook(nb);el('bookSheet').classList.add('hidden');openBook(nb.id);
    if(r.bi==='part')flashMsg('Переведены первые '+(ADV_BI_MAX/1000)+' тысяч слов, дальше книга в оригинале');
  }catch(e){console.warn('[rq] bilingual',e);flashMsg(navigator.onLine===false?'Нужен интернет, чтобы один раз скачать пакет языка':'Не получилось сделать книгу с переводом: '+(e&&e.message||e));}
  finally{rmBiBusy=false;if(btn){btn.disabled=false;btn.querySelector('.rmbl>span').textContent='Книга с переводом рядом';}}
}
/* the book card: «Что было раньше» and «Книга с переводом рядом» */
{const b0=bookInfo;bookInfo=function(id){
  const r=b0.apply(this,arguments);const b=allBooks().find(function(x){return x.id===id;});if(!b)return r;
  const put=function(){const body=el('bookSheetBody');if(!body||body.querySelector('.rmcard'))return;const rows=[];
    if(rqPos(id)>0.02&&b.type!=='pdf')rows.push('<button type="button" class="bk-line" id="rmRecapCard">'+rqIcon('history',18)+'<span class="rmbl"><span>Что было раньше</span><small>короткий пересказ без спойлеров, через ИИ</small></span></button>');
    if(rmBiOk(b)&&rmBookLang(b)!=='ru'&&TR_LANGS[rmBookLang(b)])rows.push('<button type="button" class="bk-line" id="rmBiGo">'+rqIcon('languages',18)+'<span class="rmbl"><span>Книга с переводом рядом</span><small>'+esc(TR_LANGS[rmBookLang(b)])+' → русский: абзац, под ним перевод. Отдельной книгой, на телефоне, без интернета</small></span></button>');
    if(rqPos(id)>0.02&&typeof r2Heroes==='function')rows.push('<button type="button" class="bk-line" id="r2HeroGo">'+rqIcon('users',18)+'<span class="rmbl"><span>Герои книги</span><small>кто уже встретился, без спойлеров (нужен ключ ИИ)</small></span></button>');
    if(!rows.length)return;
    const host=body.querySelector('.bk-list')||body;host.insertAdjacentHTML(host===body?'beforeend':'beforebegin','<div class="bk-list rmcard">'+rows.join('')+'</div>');
    if(el('rmRecapCard'))el('rmRecapCard').onclick=function(){rmRecap(b);};
    if(el('rmBiGo'))el('rmBiGo').onclick=function(){rmBiMake(id);};
    if(el('r2HeroGo'))el('r2HeroGo').onclick=function(){r2Heroes(b);};};
  if(b.type!=='pdf'&&!b.text&&typeof __rq!=='undefined'&&__rq&&__rq.idb)__rq.idb.getText(b.id).then(function(t){if(typeof t==='string'&&!b.text)b.text=t;put();}).catch(put);else put();
  return r;};}

/* ---------- 16: the reading ruler ---------- */
function rmRulerOn(){const x=rqRm().ruler;return x.on&&rmText();}
function rmRulerLh(){return parseFloat(getComputedStyle(el('content')).lineHeight)||SET.size*SET.lh;}
function rmRulerTop(){if(!rqScrollMode()){RM.ruler.y=0;RM.ruler.ivAt=Date.now();}rmRulerDraw();}
function rmRulerDraw(){
  const t=el('rmRulerT'),b=el('rmRulerB'),g=el('rmRulerG');if(!t)return;const on=rmRulerOn();t.hidden=b.hidden=g.hidden=!on;if(!on)return;
  const v=el('viewer').getBoundingClientRect(),lh=rmRulerLh(),h=lh*rqRm().ruler.n;
  RM.ruler.y=Math.max(0,Math.min(v.height-h,RM.ruler.y));const y0=v.top+RM.ruler.y-2;
  t.style.top=v.top+'px';t.style.height=Math.max(0,y0-v.top)+'px';t.style.left=b.style.left=v.left+'px';t.style.width=b.style.width=v.width+'px';
  b.style.top=(y0+h+4)+'px';b.style.height=Math.max(0,v.bottom-(y0+h+4))+'px';
  g.style.top=(y0+h/2-22)+'px';g.style.left=(v.right-6)+'px';
}
function rmRulerTick(){if(!rmRulerOn()||!rqRm().ruler.auto||RM.auto.on)return;if(rmAutoHold())return;
  const lh=rmRulerLh(),v=el('viewer').getBoundingClientRect(),lines=Math.max(1,Math.floor(v.height/lh)),per=rmAutoSec()*1000/lines;
  if(Date.now()-RM.ruler.ivAt>=per){RM.ruler.ivAt=Date.now();if(RM.ruler.y+lh*rqRm().ruler.n<v.height-lh*0.5){RM.ruler.y+=lh;rmRulerDraw();}}}
setInterval(rmRulerTick,250);
(function(){const g=el('rmRulerG');if(!g)return;let id=null,dy=0;
  g.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();id=e.pointerId;dy=e.clientY-(el('viewer').getBoundingClientRect().top+RM.ruler.y);try{g.setPointerCapture(id);}catch(_){}});
  g.addEventListener('pointermove',function(e){if(e.pointerId!==id)return;e.preventDefault();RM.ruler.y=e.clientY-dy-el('viewer').getBoundingClientRect().top;RM.ruler.ivAt=Date.now();rmRulerDraw();});
  const up=function(e){if(e.pointerId!==id)return;id=null;const lh=rmRulerLh();RM.ruler.y=Math.round(RM.ruler.y/lh)*lh;rmRulerDraw();};
  g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up);g.addEventListener('click',function(e){e.stopPropagation();});})();
addEventListener('resize',function(){rmRulerDraw();});

/* ---------- 17: e-ink ---------- */
{const k0=rqAnimKind;rqAnimKind=function(){if(rqRm().eink)return null;return k0.apply(this,arguments);};}
function rmEinkTurn(){if(!rqRm().eink||!rmOpen())return;if(++RM.eink%8)return;const f=el('rmFlash');if(!f)return;f.hidden=false;setTimeout(function(){f.hidden=true;},90);} /* a full refresh every 8 pages */

/* ---------- 19: presets by the time of day ---------- */
function rmTodEve(){const t=rqRm().tod,d=new Date(),m=d.getHours()*60+d.getMinutes(),mn=function(s){const a=s.split(':');return +a[0]*60+(+a[1]);},a=mn(t.from),z=mn(t.to);return a===z?false:a<z?(m>=a&&m<z):(m>=a||m<z);}
function rmTodTick(open){
  const t=rqRm().tod;if(!t.on||!rmOpen()){RM.todLast='';return;}
  const w=rmTodEve()?'eve':'day';if(w===RM.todLast&&!open)return;const was=RM.todLast;RM.todLast=w;
  const nm=t[w],p=nm&&(SET.presets||[]).find(function(x){return x.n===nm;});if(!p||RQ_OWN)return;
  const v=rqTypoPick(p.v,RQ_PRESET_KEYS),g=rqTypoPick(SET,RQ_PRESET_KEYS);if(!Object.keys(v).some(function(k){return v[k]!==g[k];}))return;
  const a=typeof readingAnchor==='function'&&R.mode==='text'?readingAnchor():null;Object.assign(SET,v);saveSet();applySet();if(R.mode==='text')relayout({force:true,anchor:a});
  if(was||open)flashMsg((w==='eve'?'Вечерний':'Дневной')+' набор «'+nm+'»',{kind:'info',icon:w==='eve'?'moon':'sun'});
}
setInterval(function(){rmTodTick(false);},30000);

/* ---------- reader open / close ---------- */
{let was=false;new MutationObserver(function(){const open=!el('reader').classList.contains('hidden');if(open===was)return;was=open;
  if(!open){rmAutoStop();rmFnHide();RM.jb.back=[];RM.jb.fwd=[];RM.todLast='';const d=el('rmRecapOffer');if(d)d.hidden=true;rmHlClear();}
  else{RM.ruler.y=0;setTimeout(rmRulerDraw,50);}}).observe(el('reader'),{attributes:true,attributeFilter:['class']});}

/* ---------- the reader's own elements ---------- */
(function(){const rd=el('reader');if(!rd)return;
  rd.insertAdjacentHTML('beforeend',
    '<div id="rmNote" class="rmcardpop" role="dialog" aria-label="Сноска" hidden></div>'+
    '<div id="rmRecapOffer" class="rmcardpop rmoffer" role="status" hidden></div>'+
    '<i id="rmRulerT" class="rmrul" hidden></i><i id="rmRulerB" class="rmrul" hidden></i><button type="button" id="rmRulerG" aria-label="Линейка: потяните вверх или вниз" hidden></button>'+
    '<button id="rmJbFwd" class="hidden-x" type="button" hidden><span id="rmJbFwdN"></span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>'+
    '<i id="rmAutoLine" hidden></i><div id="rmFlash" hidden></div>');
  el('rmJbFwd').onclick=rmJbFwdGo;
  const bot=rd.querySelector('.rbot');if(bot)bot.insertAdjacentHTML('afterbegin','<div id="rmAuto" hidden role="group" aria-label="Автолистание">'+
    '<button type="button" id="rmAutoPP" aria-label="Пауза"></button>'+
    '<span class="stepgrp"><button type="button" class="stepbtn" id="rmAutoSlow" aria-label="Медленнее">'+rqIcon('minus',18)+'</button><b id="rmAutoV"></b><button type="button" class="stepbtn" id="rmAutoFast" aria-label="Быстрее">'+rqIcon('plus',18)+'</button></span>'+
    '<button type="button" id="rmAutoX" aria-label="Выключить автолистание">'+rqIcon('x',20)+'</button></div>');
  el('rmAutoPP').onclick=function(e){e.stopPropagation();rmAutoPause(!RM.auto.paused);};
  el('rmAutoSlow').onclick=function(e){e.stopPropagation();rmAutoStep(-1);};el('rmAutoFast').onclick=function(e){e.stopPropagation();rmAutoStep(1);};
  el('rmAutoX').onclick=function(e){e.stopPropagation();rmAutoStop('Автолистание выключено');};
  const pl=el('pgLine'),ri=el('rxInfo');if(pl)pl.insertBefore(Object.assign(document.createElement('span'),{id:'rmSleep'}),ri||pl.firstChild);
  const tts=el('btnTts');if(tts){tts.insertAdjacentHTML('afterend','<button id="btnSleep" type="button" hidden title="Таймер сна" aria-label="Таймер сна">'+rqIcon('moon',22)+'</button>');el('btnSleep').onclick=function(e){e.stopPropagation();rmSleepCycle();};}
})();

/* ---------- «Настройки чтения»: new rows in Текст / Страница / Листание ---------- */
function rmStep(id,lab,sub){return '<div class="rrow txtonly" id="'+id+'Row"><span class="rl" id="'+id+'L">'+lab+(sub?'<small>'+sub+'</small>':'')+'</span><div class="rstep" role="group" aria-labelledby="'+id+'L"><button id="'+id+'Minus" aria-label="Меньше">'+rqIcon('minus',18)+'</button><span class="rv" id="'+id+'Val" aria-live="polite"></span><button id="'+id+'Plus" aria-label="Больше">'+rqIcon('plus',18)+'</button></div></div>';}
function rmSwRow(id,lab,sub,cls){return '<div class="rrow'+(cls?' '+cls:'')+'" id="'+id+'Row"><span class="rl" id="'+id+'L">'+lab+(sub?'<small>'+sub+'</small>':'')+'</span><button class="rsw" id="'+id+'" role="switch" aria-checked="false" aria-labelledby="'+id+'L"></button></div>';}
function rmSegRow(id,lab,sub,cls){return '<div class="rrow stack'+(cls?' '+cls:'')+'" id="'+id+'Row"><span class="rl" id="'+id+'L">'+lab+(sub?'<small id="'+id+'S">'+sub+'</small>':'')+'</span><div class="rseg" id="'+id+'" role="radiogroup" aria-labelledby="'+id+'L"></div></div>';}
(function(){
  const after=function(id,html){const n=el(id);const r=n&&n.closest('.rrow,.srow');if(r)r.insertAdjacentHTML('afterend',html);};
  after('lsMinus',rmStep('rmWsp','Между словами')+rmStep('rmPsp','Между абзацами'));
  after('fontSeg','<div class="rrow txtonly" id="rmUfRow"><span class="rl" id="rmUfL">Свой шрифт<small id="rmUfS"></small></span><span class="rmufb"><button type="button" class="ghostbtn" id="rmUfGo">Выбрать файл</button><button type="button" class="ghostbtn" id="rmUfDel" hidden>Убрать</button></span><input type="file" id="rmUfIn" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" hidden></div>');
  after('indTgl',rmSegRow('rmMaxw','Ширина строки','не больше стольких знаков в строке; заметно на планшете и в альбомной','txtonly')+rmSwRow('rmCap','Красивое начало главы','большая первая буква и отступ над главой','txtonly')+rmSwRow('rmBion','Жирное начало слова','первые буквы каждого слова чуть жирнее: глазу легче бежать по строке','txtonly'));
  const pg=el('grpPage');if(pg)pg.insertAdjacentHTML('beforeend',rmSwRow('rmRuler','Линейка строки','подсвечивает строки, остальное приглушает; тяните за ручку справа','txtonly')+
    rmSegRow('rmRulerN','Сколько строк','','txtonly')+rmSwRow('rmRulerAuto','Линейка идёт сама','по вашей скорости чтения','txtonly')+
    rmSwRow('rmEink','Режим для e-ink','для читалок с электронными чернилами: чёрное на белом, без анимаций, полная перерисовка раз в 8 страниц'));
  const nv=el('grpNav'),note=nv&&nv.querySelector(':scope > .rnote:last-child');
  const navHtml='<div class="rrow stack" id="rmAutoRow"><span class="rl" id="rmAutoL">Автолистание<small>страница листается сама; тап в центр — пауза. Полчаса без касаний — выключится</small></span>'+
    '<div class="rmautoset"><button type="button" class="ghostbtn" id="rmAutoGo">Начать</button><span class="stepgrp"><button type="button" class="stepbtn" id="rmAutoSlow2" aria-label="Медленнее">'+rqIcon('minus',18)+'</button><b id="rmAutoV2"></b><button type="button" class="stepbtn" id="rmAutoFast2" aria-label="Быстрее">'+rqIcon('plus',18)+'</button></span><button type="button" class="ghostbtn" id="rmAutoOwn" hidden>По моей скорости</button></div></div>'+
    rmSwRow('rmZones','Свои зоны тапа','экран делится на 9 частей, у каждой своё действие')+'<div class="rmzones" id="rmZoneGrid" role="group" aria-label="Зоны тапа" hidden></div>';
  if(note)note.insertAdjacentHTML('beforebegin',navHtml);else if(nv)nv.insertAdjacentHTML('beforeend',navHtml);
  const st=function(id,fn){el(id).onclick=fn;};
  const typo=function(k,d,lo,hi,st0){const a=readingAnchor&&rmText()?readingAnchor():null;SET[k]=Math.round(Math.max(lo,Math.min(hi,(SET[k]||0)+d))/st0)*st0;saveSet();applySet();if(rmText())relayout({force:true,anchor:a});};
  st('rmWspMinus',function(){typo('wsp',-1,0,8,1);});st('rmWspPlus',function(){typo('wsp',1,0,8,1);});
  st('rmPspMinus',function(){typo('psp',-0.25,0,1.5,0.25);});st('rmPspPlus',function(){typo('psp',0.25,0,1.5,0.25);});
  st('rmUfGo',function(){el('rmUfIn').click();});st('rmUfDel',rmUfDel);el('rmUfIn').onchange=function(){const f=this.files&&this.files[0];this.value='';rmUfPick(f);};
  const tg=function(id,fn){el(id).onclick=function(){fn();saveSet();applySet();if(rmText())relayout({force:true});rmRenderSheet();if(typeof rxRender==='function')rxRender();};};
  tg('rmCap',function(){rmS().cap=!rmS().cap;});
  el('rmBion').onclick=function(){rmSetBion(!rqRm().bion);};
  tg('rmRuler',function(){const x=rmS().ruler;x.on=!x.on;RM.ruler.y=0;setTimeout(rmRulerDraw,0);});
  tg('rmRulerAuto',function(){const x=rmS().ruler;x.auto=!x.auto;RM.ruler.ivAt=Date.now();});
  tg('rmEink',function(){rmS().eink=!rmS().eink;});
  st('rmAutoGo',function(){rmAutoToggle();rmRenderSheet();});st('rmAutoSlow2',function(){rmAutoStep(-1);});st('rmAutoFast2',function(){rmAutoStep(1);});
  st('rmAutoOwn',function(){rmS().auto.sec=0;saveSet();rmAutoUi();rmRenderSheet();});
  st('rmZones',function(){const s=rmS();s.zones=s.zones?null:RM_ZONE_DEF.slice();saveSet();rmRenderSheet();});
})();
function rmRenderSheet(){
  if(!el('rmWspVal'))return;const m=rqRm();
  el('rmWspVal').textContent=String(SET.wsp||0);el('rmPspVal').textContent=String(SET.psp||0).replace('.',',');
  el('rmWspMinus').disabled=!SET.wsp;el('rmWspPlus').disabled=SET.wsp>=8;el('rmPspMinus').disabled=!SET.psp;el('rmPspPlus').disabled=SET.psp>=1.5;
  const sw=function(id,on){const b=el(id);if(b){b.classList.toggle('on',!!on);b.setAttribute('aria-checked',on?'true':'false');}};
  sw('rmCap',m.cap);sw('rmBion',m.bion);sw('rmRuler',m.ruler.on);sw('rmRulerAuto',m.ruler.auto);sw('rmEink',m.eink);sw('rmZones',!!m.zones);
  el('rmRulerNRow').hidden=el('rmRulerAutoRow').hidden=!m.ruler.on;
  const seg=function(id,opts,cur,pick){const box=el(id);if(!box)return;box.innerHTML='';opts.forEach(function(o){const b=document.createElement('button');b.type='button';b.textContent=o[1];b.className=o[0]===cur?'on':'';
    b.setAttribute('role','radio');b.setAttribute('aria-checked',o[0]===cur?'true':'false');b.onclick=function(){pick(o[0]);};box.appendChild(b);});};
  seg('rmMaxw',RM_MAXW,m.maxw,function(v){rmS().maxw=v;saveSet();applySet();if(rmText())relayout({force:true});rmRenderSheet();});
  seg('rmRulerN',[[1,'Одна'],[2,'Две'],[3,'Три']],m.ruler.n,function(v){rmS().ruler.n=v;saveSet();rmRenderSheet();rmRulerDraw();});
  el('rmAutoV2').textContent=rmOpen()?rmAutoLabel():(m.auto.sec?m.auto.sec+' с на страницу':'по вашей скорости');el('rmAutoOwn').hidden=!m.auto.sec;
  el('rmAutoGo').textContent=RM.auto.on?'Остановить':'Начать';el('rmAutoGo').disabled=!rmOpen();
  const g=el('rmZoneGrid');g.hidden=!m.zones;
  if(m.zones){g.innerHTML='';m.zones.forEach(function(a,i){const b=document.createElement('button');b.type='button';b.textContent=RM_ZONE_N[a];b.className='z-'+a;
    b.setAttribute('aria-label','Зона '+(i+1)+': '+RM_ZONE_N[a]+'. Нажмите, чтобы сменить');
    b.onclick=function(){const z=rmS().zones,k=RM_ZONE.indexOf(z[i]);z[i]=RM_ZONE[(k+1)%RM_ZONE.length];saveSet();rmRenderSheet();requestAnimationFrame(function(){const n=g.children[i];if(n)n.focus();});};g.appendChild(b);});
    g.insertAdjacentHTML('beforeend','<button type="button" class="rmzreset" id="rmZoneReset">Вернуть как было</button>');el('rmZoneReset').onclick=function(){rmS().zones=RM_ZONE_DEF.slice();saveSet();rmRenderSheet();};}
  rmUfSync();rmPrev();
}
/* 18: the sample text on top of «Настройки чтения» in a book: the current page's own words, with the look being changed */
function rmPrevText(){if(!rmText())return [];try{const a=typeof readingAnchor==='function'?readingAnchor():null,c=el('content');
  let p=a&&a.node&&a.node.parentNode&&a.node.parentNode.closest('p,h3');if(!p||!c.contains(p))p=c.querySelector('p');
  const out=[];let n=0,off=a&&p&&p.contains(a.node)?a.offset:0;
  for(;p&&n<320;p=p.nextElementSibling){if(p.tagName!=='P'||p.matches('.meta,.rq-h,.rq-img,.rq-bitr')){off=0;continue;}
    let t=p.textContent;if(off&&p.firstChild===a.node)t=t.slice(off);off=0;t=t.trim();if(!t)continue;
    if(n+t.length>320){t=t.slice(0,Math.max(60,320-n));const k=t.lastIndexOf(' ');if(k>40)t=t.slice(0,k);t+='…';}
    out.push(t);n+=t.length;}
  return out;}catch(e){return [];}}
function rmPrev(){
  const sh=el('sheet'),p=el('gsPrev');if(!sh||!p)return;const on=rmText()&&!sh.classList.contains('gsalone')&&!sh.classList.contains('hidden')&&(typeof setTab==='undefined'||setTab==='grpText'||setTab==='grpPage');
  sh.classList.toggle('rmprev',on);if(!on)return;
  const t=rmPrevText(),k=t.join('\n');if(t.length&&p._t!==k){p._t=k;p.innerHTML=t.map(function(x){return '<p>'+esc(x)+'</p>';}).join('');delete p.dataset.rmbi;}
  if(typeof gsPrevApply==='function')gsPrevApply();
}
{const g0=gsPrevApply;gsPrevApply=function(){g0.apply(this,arguments);const p=el('gsPrev');if(!p)return;const m=rqRm();
  p.style.wordSpacing=SET.wsp?SET.wsp+'px':'';p.style.fontFamily=(FONTS[SET.font]||FONTS[0]).v;
  p.querySelectorAll('p').forEach(function(x){x.style.marginBottom=SET.psp?SET.psp+'em':'';});
  if(m.bion)rmBionOn(p);else rmBionOff(p);
  if(m.eink){p.style.background='#fff';p.style.color='#000';p.style.filter='none';}};}
{const o0=openSetTab;openSetTab=function(){const r=o0.apply(this,arguments);rmPrev();return r;};}
{let shown=false;new MutationObserver(function(){const on=!el('sheet').classList.contains('hidden');if(on&&!shown)rmRenderSheet();else rmPrev();shown=on;}).observe(el('sheet'),{attributes:true,attributeFilter:['class']});}

/* ---------- «Общие настройки → Чтение»: rows in read-extras cards (read-extras.js calls these) ---------- */
function rmRxTtsRows(){return rxRow('','moon','Таймер сна','Озвучка остановится сама. В книге — кнопка с луной рядом с «Слушать»',rxSegHtml('rmSleepSeg','Таймер сна'),'setstack')+
  rxRow('','highlighter','Подсвечивать читаемое предложение','В книгах, не в PDF',rxSwHtml('rmTtsHl'));}
function rmRxCards(){return rxCardHtml('rmore','notebook-pen','Сноски и возвращение к книге',
    rxRow('','notebook-pen','Сноски в окне','Тап по номеру сноски показывает её текст прямо на странице',rxSwHtml('rmFn'))+
    rxRow('','history','«Что было раньше»','Если книга не открывалась 3 дня и больше, предложить короткий пересказ без спойлеров (нужен ключ ИИ)',rxSwHtml('rmRecap')))+
  rxCardHtml('rtod','sun-moon','Наборы по времени суток',
    '<div class="aisub">Днём один набор оформления, вечером другой (например, крупнее и теплее). Наборы сохраняются в «Мои наборы».</div>'+
    rxRow('','sun-moon','Менять набор сам',null,rxSwHtml('rmTodOn'))+
    rxRow('rmTodDayRow','sun','Днём','','<div class="presets rxfull" id="rmTodDay" role="radiogroup" aria-label="Набор днём"></div>','setstack')+
    rxRow('rmTodEveRow','moon','Вечером','','<div class="presets rxfull" id="rmTodEve" role="radiogroup" aria-label="Набор вечером"></div>','setstack')+
    rxRow('rmTodFromRow','sunset','Вечер с',null,rxTimeHtml('rmTodFrom','Начало вечера'))+
    rxRow('rmTodToRow','sunrise','До',null,rxTimeHtml('rmTodTo','Конец вечера')));}
function rmRxWire(){
  const sw=function(id,fn){const b=el(id);if(b)b.onclick=function(){fn();rxSave();};};
  sw('rmTtsHl',function(){const m=rmS();m.ttsHl=!m.ttsHl;if(!m.ttsHl)rmHlClear();});
  sw('rmFn',function(){const m=rmS();m.fn=!m.fn;});sw('rmRecap',function(){const m=rmS();m.recap=!m.recap;});
  sw('rmTodOn',function(){const t=rmS().tod;t.on=!t.on;RM.todLast='';rmTodTick(true);});
  ['rmTodFrom','rmTodTo'].forEach(function(id){const i=el(id);if(i)i.onchange=function(){const v=this.value;if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))return;rmS().tod[id==='rmTodFrom'?'from':'to']=v;RM.todLast='';rxSave();rmTodTick(true);};});
}
function rmRxRender(x){
  const m=rqRm();
  rxSeg('rmSleepSeg',RM_SLEEP,m.sleep,function(v){rmS().sleep=v;rxSave();if(typeof ttsOn!=='undefined'&&ttsOn)rmSleepStart();});
  rxSw('rmTtsHl',m.ttsHl);rxSw('rmFn',m.fn);rxSw('rmRecap',m.recap);
  rxHead('rmore',[m.fn?'сноски в окне':'',m.recap?'«Что было раньше»':''].filter(Boolean).join(', ').replace(/^./,function(c){return c.toUpperCase();})||'Выкл');
  const t=m.tod,ps=(SET.presets||[]).map(function(p){return [p.n,p.n];}),has=function(n){return !!n&&ps.some(function(p){return p[0]===n;});};
  rxHead('rtod',!t.on?'Выкл':!has(t.day)&&!has(t.eve)?'Наборы не выбраны':[has(t.day)?'днём «'+t.day+'»':'',has(t.eve)?'вечером «'+t.eve+'» ('+t.from+'–'+t.to+')':''].filter(Boolean).join(', ').replace(/^./,function(c){return c.toUpperCase();}));
  rxSw('rmTodOn',t.on);['rmTodDayRow','rmTodEveRow','rmTodFromRow','rmTodToRow'].forEach(function(id){el(id).hidden=!t.on;});
  const opts=[['','Не менять']].concat(ps);
  rxChips('rmTodDay',opts,has(t.day)?t.day:'',function(v){rmS().tod.day=v;RM.todLast='';rxSave();});
  rxChips('rmTodEve',opts,has(t.eve)?t.eve:'',function(v){rmS().tod.eve=v;RM.todLast='';rxSave();});
  if(!ps.length)['rmTodDay','rmTodEve'].forEach(function(id){el(id).insertAdjacentHTML('beforeend','<span class="pempty">Сначала сохраните наборы выше, в «Мои наборы»</span>');});
  el('rmTodFrom').value=t.from;el('rmTodTo').value=t.to;el('rmTodFromV').textContent=t.from;el('rmTodToV').textContent=t.to;
}

/* boot */
rmUfBoot();rmRenderSheet();
