'use strict';
/* ===== Раздел «Чтение»: восемь дополнений (29.10, Джессика: «давай реализуем все»). Data: SET.rx (arch.md 29.10, rqRxNorm in reader.js).
   1 строка внизу страницы (номер, процент, часы, минуты до конца главы) · 2 чтение вслух (скорость, голос, листание за голосом) ·
   3 ночь по расписанию · 4 жесты (яркость у края, щипок, двойной тап) · 5 меню выделения (кнопки, порядок, цвет заметки) ·
   6 экран (поворот, две страницы в альбомной) · 7 новые книги (набор для книг и для PDF, оглавление) · 8 «сколько осталось» по своей скорости.
   The settings live in «Общие настройки → Чтение → Удобство чтения» (#rxCard), one collapsible card per group. No coins, no XP. */
const RX_CPM0=1000,RX_SPP0=90; /* before the speed is learned: 1000 знаков в минуту, 90 секунд на страницу PDF */
const RX_SEL_N={colors:['Цвета','highlighter'],note:['Заметка','pencil'],word:['В словарь','book-open'],dict:['Перевести','languages'],ai:['Объясни','sparkles'],grow:['Предложение','align-justify'],copy:['Копировать','copy']};
const RX_SEL_ID={colors:'spColors',note:'spNote',word:'spWord',dict:'spDict',ai:'spAI',grow:'spGrow',copy:'spCopy'};
const RX_DBL=[['off','Ничего'],['night','День и ночь'],['mark','Закладка'],['bars','Панели']];
const RX_ORIENT=[['auto','Как у телефона'],['portrait','Книжный'],['landscape','Альбомный']];
const RX_SPREAD=[['auto','На планшете'],['land','И в альбомной'],['off','Никогда']];
const RX_EXP={};
function rxS(){if(!SET.rx)SET.rx=rqRxNorm(null);return SET.rx;}
function rxSave(){saveSet();rxApply();rxRender();}

/* ---------- 8: how long is left, from the reader's own speed ---------- */
function rxCpm(){const s=rqRx().spd;return s.cpm||RX_CPM0;}
function rxSpp(){const s=rqRx().spd;return s.spp||RX_SPP0;}
/** minutes to read `pages` pages of the open book (text: by characters, PDF: by pages) */
function rxMinPages(pages){if(!R||!R.book||pages<=0)return 0;
  if(R.mode==='pdf')return pages*rxSpp()/60;
  const len=R.book.text?R.book.text.length:0;return len?pages*(len/Math.max(1,R.pageCount))/rxCpm():0;}
function rxDur(min){min=Math.round(min);if(min<1)return 'меньше минуты';if(min<60)return min+' мин';const h=Math.floor(min/60),m=min%60;return h+' ч'+(m?' '+m+' мин':'');}
function rxCurPage(){return R.mode==='pdf'&&typeof P!=='undefined'&&P.shown>=0?P.shown:R.page;}
function rxChapLeft(){
  const pg=rxCurPage(),ch=typeof bfChapters==='function'?bfChapters():[];
  let to=R.pageCount,inCh=false;for(let i=0;i<ch.length;i++){if(ch[i].page>pg){to=ch[i].page;inCh=true;break;}}
  return {min:rxMinPages(to-pg),ch:inCh};
}
/* learning: a forward turn by one page after 4 s … 6 min on the page, the voice not reading, the app on screen */
const RX_SP={id:null,pg:-1,t:0,k:0};
function rxSpeedSeen(){
  if(!R||!R.book)return;const pg=rxCurPage(),now=Date.now(),id=R.book.id;
  if(RX_SP.id===id&&pg===RX_SP.pg+1&&!R.ttsAdv&&!(typeof ttsOn!=='undefined'&&ttsOn)&&!R.sliding&&!R.jumping&&document.visibilityState==='visible'){
    const dt=(now-RX_SP.t)/1000;
    if(dt>=4&&dt<=360){const sp=rxS().spd,w=sp.n<5?1/(sp.n+1):0.15;
      if(R.mode==='pdf'){sp.spp=Math.round((sp.spp==null?dt:sp.spp+(dt-sp.spp)*w)*10)/10;sp.spp=Math.max(5,Math.min(1200,sp.spp));}
      else{const len=R.book.text?R.book.text.length:0,cpm=len?(len/Math.max(1,R.pageCount))/(dt/60):0;
        if(cpm>=100&&cpm<=6000){sp.cpm=Math.round((sp.cpm==null?cpm:sp.cpm+(cpm-sp.cpm)*w)*10)/10;sp.cpm=Math.max(100,Math.min(6000,sp.cpm));}else{RX_SP.pg=pg;RX_SP.t=now;return;}}
      sp.n=Math.min(1e6,sp.n+1);if(++RX_SP.k%3===0)saveSet();}
  }
  if(RX_SP.id!==id||pg!==RX_SP.pg){RX_SP.id=id;RX_SP.pg=pg;RX_SP.t=now;}
}

/* ---------- 1: the line under the page ---------- */
function rxClockText(){const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function rxFoot(){
  const r=el('reader');if(!r||r.classList.contains('hidden')||!R||!R.book)return;
  const f=rqRx().foot;r.classList.toggle('rxnopg',!f.page);
  const ck=f.clock?rxClockText():'';if(el('rxClock').textContent!==ck)el('rxClock').textContent=ck;
  const parts=[];
  if(f.chap){const c=rxChapLeft();parts.push(rxDur(c.min)+(c.ch?' до конца главы':' до конца книги'));}
  if(f.pct){const pg=rxCurPage(),p=R.pageCount>1?Math.round(pg/(R.pageCount-1)*100):100;parts.push(p+' %');}
  const t=parts.join(' · ');if(el('rxInfo').textContent!==t)el('rxInfo').textContent=t;
}
new MutationObserver(function(){rxSpeedSeen();rxFoot();}).observe(el('pgNum'),{childList:true,characterData:true,subtree:true});
setInterval(function(){rxFoot();rxNightTick();},20000);

/* ---------- 3: night on a schedule ---------- */
let rxNightLast=null; /* the last state the schedule set ('n' / 'd'); a hand switch holds until the next change */
function rxMin(hm){const a=String(hm).split(':');return (+a[0])*60+(+a[1]);}
function rxIsNight(){const n=rqRx().night,d=new Date(),m=d.getHours()*60+d.getMinutes(),a=rxMin(n.from),b=rxMin(n.to);return a===b?false:a<b?(m>=a&&m<b):(m>=a||m<b);}
function rxPageDark(){return !isLightBg(SET.cBg||activeTheme().bg);}
function rxSetNight(want,quiet){
  if(rxPageDark()===want)return;
  const t=activeTheme(),n=rxS().night;
  if(t.skin&&!SET.cBg)SET.theme=skinThemeKey(t.skin,want);
  else if(want){n.day=SET.theme&&SET.theme!=='dark'?SET.theme:n.day;SET.theme='dark';}
  else SET.theme=n.day&&n.day!=='dark'?n.day:'sepia';
  SET.cBg=null;SET.cTxt=null;saveSet();applySet();
  if(!quiet)flashMsg(want?'Ночной режим по расписанию':'Дневной режим по расписанию',{kind:'info',icon:want?'moon':'sun'});
}
function rxNightTick(){
  if(!rqRx().night.on){rxNightLast=null;return;}
  const r=el('reader');if(!r||r.classList.contains('hidden')||!R||!R.book)return;
  const w=rxIsNight()?'n':'d';if(w===rxNightLast)return;rxNightLast=w;rxSetNight(w==='n');
}

/* ---------- 6: rotation lock ---------- */
let rxLocked=false;
function rxOrient(){
  const o=rqRx().screen.orient,so=screen.orientation,open=!el('reader').classList.contains('hidden');
  if(!so||!so.lock)return;
  if(open&&o!=='auto'){try{const p=so.lock(o==='portrait'?'portrait':'landscape');rxLocked=true;if(p&&p.catch)p.catch(function(){rxLocked=false;});}catch(e){rxLocked=false;}}
  else if(rxLocked){try{so.unlock();}catch(e){}rxLocked=false;}
}

/* ---------- 4: double tap (text books; in a PDF a double tap zooms) ---------- */
function rxDbl(a){if(a==='night')toggleDayNight();else if(a==='mark')addBookmark();else if(a==='bars')toggleChrome();}
{const v0=viewerTap;let pend=null;
  viewerTap=function(cx,cy){
    const a=rqRx().gest.dbl;if(a==='off'||R.mode==='pdf'){if(pend){clearTimeout(pend.tm);pend=null;}return v0.apply(this,arguments);}
    const now=Date.now();
    if(pend&&now-pend.t<320&&Math.hypot(cx-pend.x,cy-pend.y)<48){clearTimeout(pend.tm);pend=null;rxDbl(a);return;}
    if(pend){clearTimeout(pend.tm);const p=pend;pend=null;v0(p.x,p.y);}
    const p={t:now,x:cx,y:cy};p.tm=setTimeout(function(){if(pend===p){pend=null;v0(p.x,p.y);}},300);pend=p;
  };}

/* ---------- 5: the selection menu ---------- */
function rxSelOrder(){const s=rqRx().sel,o=s.order.slice();RX_SEL.forEach(function(k){if(o.indexOf(k)<0)o.push(k);});return o;}
function rxSelApply(){
  const s=rqRx().sel,o=rxSelOrder();
  o.forEach(function(k,i){const b=el(RX_SEL_ID[k]);if(!b)return;b.style.order=String(i+1);b.classList.toggle('rxoff',s.off.indexOf(k)>=0);});
  document.querySelectorAll('#selpop>.spq').forEach(function(b){b.style.order='20';});if(el('spFold'))el('spFold').style.order='30'; /* a tapped quote: its buttons stay at the end */
}
{const r0=renderSpColors;renderSpColors=function(on){const c=rqRx().sel.color;if(c&&!on)SET.hlc=c;return r0.apply(this,arguments);};}

/* ---------- 7: a book opened for the first time ---------- */
function rxFresh(b){
  const fr=rqRx().fresh,nm=b.type==='pdf'?fr.pdf:fr.set,p=nm&&(SET.presets||[]).find(function(x){return x.n===nm;});
  if(p&&!(SET.bookSet&&SET.bookSet[b.id])){const v=rqTypoPick(p.v,RQ_BOOK_KEYS),g=rqTypoPick(SET,RQ_BOOK_KEYS);
    if(Object.keys(v).length&&Object.keys(v).some(function(k){return v[k]!==g[k];})){SET.bookSet=Object.assign({},SET.bookSet);SET.bookSet[b.id]=v;saveSet();}}
  if(fr.toc){const id=b.id,tryToc=function(n){setTimeout(function(){
      if(!R||!R.book||R.book.id!==id||el('reader').classList.contains('hidden'))return;
      const ch=typeof bfChapters==='function'?bfChapters():[];
      if(ch.length>1){if(el('panel').classList.contains('hidden')){panelTab='toc';renderPanel('toc');el('panel').classList.remove('hidden');}return;}
      if(n<3)tryToc(n+1);},n?1500:700);};tryToc(0);}
}

/* ---------- book card: «осталось ≈ …» ---------- */
function rxBookLeft(b,pos){
  if(b.type==='pdf'){const n=+b.pages||0;return n?(1-pos)*n*rxSpp()/60:0;}
  return b.text?(1-pos)*b.text.length/rxCpm():0;
}
{const b0=bookInfo;bookInfo=function(id){
  const r=b0.apply(this,arguments);
  const b=allBooks().find(function(x){return x.id===id;});if(!b||S.finished.includes(id))return r;
  const put=function(){const pn=document.querySelector('#bookSheetBody .bk-pn');if(!pn||pn.querySelector('.rxleft'))return;
    const pos=rqPos(id);if(pos>=0.999)return;const m=rxBookLeft(b,pos);if(!(m>0))return;
    pn.insertAdjacentHTML('beforeend','<span class="rxleft"> · осталось ≈ '+esc(rxDur(m))+'</span>');};
  if(b.type!=='pdf'&&!b.text&&typeof __rq!=='undefined'&&__rq&&__rq.idb){__rq.idb.getText(b.id).then(function(t){if(typeof t==='string'&&!b.text){b.text=t;put();}}).catch(function(){});}
  else put();
  return r;};}

/* ---------- reader open / close ---------- */
{let wasOpen=false;new MutationObserver(function(){const open=!el('reader').classList.contains('hidden');if(open===wasOpen)return;wasOpen=open;
  rxOrient();if(open){RX_SP.id=null;setTimeout(function(){rxFoot();rxNightTick();},0);}else if(RX_SP.k%3)saveSet();}).observe(el('reader'),{attributes:true,attributeFilter:['class']});}
function rxApply(){rxSelApply();rxFoot();rxOrient();rxNightTick();}

/* ---------- settings: «Чтение → Удобство чтения» ---------- */
function rxSw(id,on){const b=el(id);if(!b)return;b.textContent=on?'Вкл':'Выкл';b.setAttribute('aria-checked',on?'true':'false');}
function rxRow(id,ic,lab,sub,ctrl,cls){return '<div class="setrow'+(cls?' '+cls:'')+'"'+(id?' id="'+id+'"':'')+'>'+rqIcon(ic,22)+'<div class="lab">'+lab+(sub!=null?'<div class="sub"'+(id?' id="'+id+'S"':'')+'>'+sub+'</div>':'')+'</div>'+(ctrl||'')+'</div>';}
function rxSwHtml(id){return '<button class="ghostbtn sw" id="'+id+'" role="switch">Выкл</button>';}
function rxSegHtml(id,lab){return '<div class="seg rxfull" id="'+id+'" role="radiogroup" aria-label="'+lab+'"></div>';}
function rxTimeHtml(id,lab){return '<label class="gstime"><b id="'+id+'V"></b><input type="time" id="'+id+'" aria-label="'+lab+'"></label>';}
function rxCardHtml(k,ic,t,body){return '<button type="button" class="xrow" id="rxX'+k+'" data-ic="'+ic+'" data-t="'+t+'" aria-controls="rxB'+k+'" aria-expanded="false"></button><div class="nnbox rxbox" id="rxB'+k+'" hidden>'+body+'</div>';}
function rxBuild(){
  const c=el('rxCard');if(!c||c.childNodes.length)return;
  c.innerHTML=
  rxCardHtml('foot','clock','Строка внизу страницы',
    '<div class="aisub">Видна, когда панели скрыты.</div>'+
    rxRow('','file-text','Номер страницы',null,rxSwHtml('rxFootPage'))+
    rxRow('','chart-column','Процент книги',null,rxSwHtml('rxFootPct'))+
    rxRow('','clock','Часы',null,rxSwHtml('rxFootClock'))+
    rxRow('','timer','Сколько до конца главы','По вашей скорости чтения',rxSwHtml('rxFootChap'))+
    rxRow('rxSpeed','trending-up','Ваша скорость чтения','',' <button class="ghostbtn" id="rxSpeedReset">Сбросить</button>'))+
  rxCardHtml('tts','volume-2','Чтение вслух',
    '<div class="aisub">Кнопка «Слушать» в книге. Чем читать (телефон или нейросеть) — в разделе «Нейросети».</div>'+
    rxRow('','timer','Скорость голоса','',' <span class="stepgrp"><button class="stepbtn" id="rxRateMinus" aria-label="Медленнее">−</button><b class="rxv" id="rxRateV"></b><button class="stepbtn" id="rxRatePlus" aria-label="Быстрее">+</button></span>')+
    rxRow('rxVoiceRow','smartphone','Голос телефона','','<div class="presets rxfull" id="rxVoices" role="radiogroup" aria-label="Голос телефона"></div>','setstack')+
    rxRow('','book-open','Листать за голосом','В книгах; PDF листается всегда',rxSwHtml('rxFollow'))+
    '<div class="row rxtest"><button class="ghostbtn" id="rxTtsTest">'+rqIcon('play',18)+'<span>Послушать</span></button></div>')+
  rxCardHtml('night','moon','Ночь по расписанию',
    rxRow('','moon','Включать ночную тему','Сама вечером и утром. Вручную можно переключить в любой момент.',rxSwHtml('rxNightOn'))+
    rxRow('rxNightFromRow','sunrise','Ночь с',null,rxTimeHtml('rxNightFrom','Начало ночи'))+
    rxRow('rxNightToRow','sun','До',null,rxTimeHtml('rxNightTo','Конец ночи')))+
  rxCardHtml('gest','smartphone','Жесты',
    rxRow('','sun','Яркость у левого края','Ведите пальцем вверх и вниз у края',rxSwHtml('rxGBright'))+
    rxRow('','a-large-small','Щипок меняет размер текста','В PDF щипок всегда увеличивает',rxSwHtml('rxGPinch'))+
    rxRow('','circle-plus','Двойной тап','В книгах; в PDF он увеличивает страницу',rxSegHtml('rxGDbl','Двойной тап'),'setstack'))+
  rxCardHtml('sel','highlighter','Меню выделения',
    '<div class="aisub">Какие кнопки показывать и в каком порядке.</div><div id="rxSelList"></div>'+
    rxRow('','pencil','Цвет для «Заметки»','И отмеченный цвет при выделении','<div class="presets rxfull" id="rxSelColor" role="radiogroup" aria-label="Цвет для заметки"></div>','setstack'))+
  rxCardHtml('screen','rotate-cw','Экран',
    rxRow('','rotate-cw','Поворот экрана','Работает в установленном приложении и в полном экране',rxSegHtml('rxOrient','Поворот экрана'),'setstack')+
    rxRow('','book-open','Две страницы рядом','Для книг, не PDF',rxSegHtml('rxSpread','Две страницы рядом'),'setstack'))+
  rxCardHtml('fresh','book-marked','Новые книги',
    '<div class="aisub">Как открывать книгу в первый раз. Набор станет своим оформлением этой книги.</div>'+
    rxRow('','type','Набор для книг','',' <div class="presets rxfull" id="rxFreshSet" role="radiogroup" aria-label="Набор для книг"></div>','setstack')+
    rxRow('','file-text','Набор для PDF','Шрифт и поля, когда PDF показан текстом',' <div class="presets rxfull" id="rxFreshPdf" role="radiogroup" aria-label="Набор для PDF"></div>','setstack')+
    rxRow('','list','Оглавление при первом открытии','Если в книге больше одной главы',rxSwHtml('rxFreshToc')));
  c.querySelectorAll('.xrow').forEach(function(x){x.onclick=function(){const k=x.id.slice(3);RX_EXP[k]=!RX_EXP[k];rxRender();};});
  const sw=function(id,fn){el(id).onclick=function(){fn();rxSave();};};
  sw('rxFootPage',function(){const f=rxS().foot;f.page=!f.page;});
  sw('rxFootPct',function(){const f=rxS().foot;f.pct=!f.pct;});
  sw('rxFootClock',function(){const f=rxS().foot;f.clock=!f.clock;});
  sw('rxFootChap',function(){const f=rxS().foot;f.chap=!f.chap;});
  el('rxSpeedReset').onclick=function(){rxS().spd={cpm:null,spp:null,n:0};rxSave();flashMsg('Скорость будет считаться заново');};
  const rate=function(d){const t=rxS().tts;t.rate=Math.round(Math.max(0.5,Math.min(2,t.rate+d))*20)/20;rxSave();};
  el('rxRateMinus').onclick=function(){rate(-0.1);};el('rxRatePlus').onclick=function(){rate(0.1);};
  sw('rxFollow',function(){const t=rxS().tts;t.follow=!t.follow;});
  el('rxTtsTest').onclick=rxTtsTest;
  sw('rxNightOn',function(){const n=rxS().night;n.on=!n.on;rxNightLast=null;});
  ['rxNightFrom','rxNightTo'].forEach(function(id){el(id).onchange=function(){const v=this.value;if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))return;rxS().night[id==='rxNightFrom'?'from':'to']=v;rxNightLast=null;rxSave();};});
  sw('rxGBright',function(){const g=rxS().gest;g.bright=!g.bright;});
  sw('rxGPinch',function(){const g=rxS().gest;g.pinch=!g.pinch;});
  sw('rxFreshToc',function(){const f=rxS().fresh;f.toc=!f.toc;});
  if(window.speechSynthesis)try{speechSynthesis.addEventListener('voiceschanged',function(){if(RX_EXP.tts)rxRender();});}catch(e){}
}
function rxSeg(id,opts,cur,pick){const box=el(id);box.innerHTML='';opts.forEach(function(o){const b=document.createElement('button');b.type='button';b.textContent=o[1];
  b.className=o[0]===cur?'on':'';b.setAttribute('role','radio');b.setAttribute('aria-checked',o[0]===cur?'true':'false');b.onclick=function(){if(o[0]!==cur)pick(o[0]);};box.appendChild(b);});}
function rxChips(id,opts,cur,pick){const box=el(id);box.innerHTML='';opts.forEach(function(o){const b=document.createElement('button');b.type='button';b.className='fchip'+(o[0]===cur?' on':'');
  b.setAttribute('role','radio');b.setAttribute('aria-checked',o[0]===cur?'true':'false');if(o[2])b.innerHTML=o[2];else b.textContent=o[1];if(o[2])b.setAttribute('aria-label',o[1]);b.onclick=function(){pick(o[0]);};box.appendChild(b);});}
function rxHead(k,val){const x=el('rxX'+k),open=!!RX_EXP[k];
  x.innerHTML=rqIcon(x.dataset.ic,22)+'<span class="xlab"><span class="xt">'+esc(x.dataset.t)+'</span><span class="xsub xv">'+esc(val)+'</span></span>'+rqIcon(open?'chevron-up':'chevron-down',20);
  x.setAttribute('aria-expanded',open?'true':'false');el('rxB'+k).hidden=!open;}
function rxRate(v){return String(v).replace('.',',')+'×';}
function rxRender(){
  if(!el('rxCard'))return;rxBuild();const x=rqRx();
  /* 1 + 8 */
  {const f=x.foot,on=[f.page&&'номер',f.pct&&'процент',f.clock&&'часы',f.chap&&'до конца главы'].filter(Boolean);
   rxHead('foot',on.length?on.join(', ').replace(/^./,function(c){return c.toUpperCase();}):'Пусто');
   rxSw('rxFootPage',f.page);rxSw('rxFootPct',f.pct);rxSw('rxFootClock',f.clock);rxSw('rxFootChap',f.chap);
   const sp=x.spd,parts=[];if(sp.cpm)parts.push('≈ '+fmtInt(Math.round(sp.cpm))+' знаков в минуту');if(sp.spp)parts.push('PDF ≈ '+rxDur(sp.spp/60).replace('меньше минуты',Math.round(sp.spp)+' с')+' на страницу');
   el('rxSpeedS').textContent=parts.length?parts.join(', '):'Пока считаем: листайте как обычно, через несколько страниц появится';el('rxSpeedReset').hidden=!sp.n;}
  /* 2 */
  {const t=x.tts,vs=typeof ttsVoices==='function'?ttsVoices():[],cur=vs.find(function(v){return v.voiceURI===t.voice;});
   rxHead('tts',rxRate(t.rate)+' · '+(nttsOn()?'нейросеть':cur?cur.name:'голос телефона'));
   el('rxRateV').textContent=rxRate(t.rate);el('rxRateMinus').disabled=t.rate<=0.5;el('rxRatePlus').disabled=t.rate>=2;
   el('rxVoiceRowS').textContent=vs.length?(nttsOn()?'Сейчас читает нейросеть; этот голос — когда выбран «Телефон»':'Русские голоса этого телефона'):'На этом телефоне нет русского голоса';
   rxChips('rxVoices',[['','По умолчанию']].concat(vs.map(function(v){return [v.voiceURI,v.name.replace(/^(Microsoft|Google)\s+/,'').replace(/\s*\(.*\)$/,'').slice(0,28)];})),cur?t.voice:'',function(v){rxS().tts.voice=v;rxSave();});
   rxSw('rxFollow',t.follow);}
  /* 3 */
  {const n=x.night;rxHead('night',n.on?n.from+' – '+n.to:'Выкл');rxSw('rxNightOn',n.on);
   el('rxNightFromRow').hidden=el('rxNightToRow').hidden=!n.on;el('rxNightFrom').value=n.from;el('rxNightTo').value=n.to;el('rxNightFromV').textContent=n.from;el('rxNightToV').textContent=n.to;}
  /* 4 */
  {const g=x.gest,on=[g.bright&&'яркость',g.pinch&&'щипок'].filter(Boolean),d=RX_DBL.find(function(o){return o[0]===g.dbl;});
   rxHead('gest',(on.length?on.join(', ').replace(/^./,function(c){return c.toUpperCase();}):'Без яркости и щипка')+(g.dbl!=='off'?' · двойной тап: '+d[1].toLowerCase():''));
   rxSw('rxGBright',g.bright);rxSw('rxGPinch',g.pinch);rxSeg('rxGDbl',RX_DBL,g.dbl,function(v){rxS().gest.dbl=v;rxSave();});}
  /* 5 */
  {const s=x.sel,o=rxSelOrder(),n=o.length-s.off.length;rxHead('sel',n===o.length?'Все кнопки':n+' из '+o.length+' кнопок');
   const box=el('rxSelList');box.innerHTML='';
   o.forEach(function(k,i){const on=s.off.indexOf(k)<0,nm=RX_SEL_N[k];const d=document.createElement('div');d.className='setrow rxsel';d.dataset.k=k;
     d.innerHTML=rqIcon(nm[1],22)+'<div class="lab">'+esc(nm[0])+'</div><span class="rxmv"><button type="button" class="stepbtn" data-d="-1" aria-label="Выше"'+(i?'':' disabled')+'>'+rqIcon('chevron-up',18)+'</button><button type="button" class="stepbtn" data-d="1" aria-label="Ниже"'+(i<o.length-1?'':' disabled')+'>'+rqIcon('chevron-down',18)+'</button></span>'+rxSwHtml('rxSel_'+k);
     box.appendChild(d);rxSw('rxSel_'+k,on);
     d.querySelector('.sw').onclick=function(){const z=rxS().sel;if(on){if(o.length-z.off.length<=1){flashMsg('Хотя бы одна кнопка');return;}z.off=z.off.concat([k]);}else z.off=z.off.filter(function(q){return q!==k;});rxSave();};
     d.querySelectorAll('.rxmv button').forEach(function(b){b.onclick=function(){const j=i+(+b.dataset.d);if(j<0||j>=o.length)return;const a=o.slice();a[i]=a[j];a[j]=k;rxS().sel.order=a;rxSave();
       requestAnimationFrame(function(){const r=document.querySelector('#rxSelList [data-k="'+k+'"] .rxmv button[data-d="'+b.dataset.d+'"]');if(r&&!r.disabled)r.focus();});};});});
   rxChips('rxSelColor',[['','Последний']].concat(HL_COLORS.map(function(c){return [c.k,hlName(c.k),'<i class="rxdot" style="--d:'+hlDot(c.k)+';--d2:'+hlDot2(c.k)+'" aria-hidden="true"></i>'];})),s.color,function(v){rxS().sel.color=v;rxSave();});}
  /* 6 */
  {const sc=x.screen;rxHead('screen',RX_ORIENT.find(function(o){return o[0]===sc.orient;})[1]+' · две страницы: '+RX_SPREAD.find(function(o){return o[0]===sc.spread;})[1].toLowerCase());
   rxSeg('rxOrient',RX_ORIENT,sc.orient,function(v){rxS().screen.orient=v;rxSave();});
   rxSeg('rxSpread',RX_SPREAD,sc.spread,function(v){rxS().screen.spread=v;rxSave();try{relayout();}catch(e){}});}
  /* 7 */
  {const fr=x.fresh,ps=(SET.presets||[]).map(function(p){return [p.n,p.n];}),has=function(n){return !!n&&ps.some(function(p){return p[0]===n;});};
   const opts=[['','Как сейчас']].concat(ps);
   rxHead('fresh',(has(fr.set)?'«'+fr.set+'»':'Как сейчас')+(has(fr.pdf)?', PDF «'+fr.pdf+'»':'')+(fr.toc?' · оглавление':''));
   rxChips('rxFreshSet',opts,has(fr.set)?fr.set:'',function(v){rxS().fresh.set=v;rxSave();});
   rxChips('rxFreshPdf',opts,has(fr.pdf)?fr.pdf:'',function(v){rxS().fresh.pdf=v;rxSave();});
   if(!ps.length){['rxFreshSet','rxFreshPdf'].forEach(function(id){el(id).insertAdjacentHTML('beforeend','<span class="pempty">Наборы сохраняются выше, в «Мои наборы»</span>');});}
   rxSw('rxFreshToc',fr.toc);}
}
function rxTtsTest(){
  if(!window.speechSynthesis){flashMsg('Озвучка не поддерживается этим браузером');return;}
  if(typeof ttsOn!=='undefined'&&ttsOn){flashMsg('Сейчас читается книга');return;}
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance('Так будет звучать книга. Можно сделать медленнее или быстрее.');u.lang='ru-RU';
    const vs=ttsVoices(),t=rqRx().tts;if(vs.length)u.voice=vs.find(function(v){return v.voiceURI===t.voice;})||vs[0];u.rate=t.rate;speechSynthesis.speak(u);}catch(e){}
}

/* ---------- wiring ---------- */
{const g0=gsRenderRead;gsRenderRead=function(){g0.apply(this,arguments);rxRender();};}
rxBuild();rxRender();rxSelApply();
