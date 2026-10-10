'use strict';
/* ================= ЭКРАНЫ ================= */
const SCREENS=['library','quotes','vocab','shop','profile','quests','stats','calendar','achievements','shelfScreen','settings','reader','summary'];
const DRAWER={library:'dLib',quotes:'dJournal',vocab:'dJournal',shop:'dShop',profile:'dProf',quests:'dJournal',stats:'dProg',calendar:'dProg',achievements:'dProg',shelfScreen:'dProg',settings:'dSet'};
function show(id){
  /* Keep confetti on summary; clear on every other screen change */
  clearToasts();
  if(id!=='summary')clearConfetti();
  try{hidePinchHint();if(id!=='reader'){pinch0=null;pinchTarget=0;}}catch(e){} /* «Aa N» never survives a screen change */
  if(id!=='library'&&__bootGold){__bootGold=0;const gl=el('libGoldLine');if(gl)gl.classList.add('hidden');}
  if(isMvp() && ['quotes','vocab','shop','quests','stats','calendar','achievements','shelfScreen'].indexOf(id)>=0){
    id = 'library';
  }
  SCREENS.forEach(s=>el(s).classList.toggle('hidden',s!==id));
  const tgt=DRAWER[id];
  Array.from(new Set(Object.values(DRAWER))).forEach(di=>{const e=el(di);if(e)e.classList.toggle('on',di===tgt);});
  const hideNav = (id==='reader'||id==='summary');
  if(el('botnav'))el('botnav').style.display = (isMvp()&&!hideNav)?'flex':'none';
  applyMvpChrome();
}
function openDrawer(){el('drawer').classList.add('open');el('scrim').classList.remove('hidden');}
function closeDrawer(){el('drawer').classList.remove('open');el('scrim').classList.add('hidden');}
el('scrim').onclick=closeDrawer;
['menuLib','menuQuotes','menuVocab','menuShop','menuProf','menuQst','menuStats','menuCal','menuShelf','menuSet'].forEach(m=>{if(el(m))el(m).onclick=openDrawer;});
el('dLib').onclick=()=>{renderLibrary();show('library');closeDrawer();};
let jrnLast='quotes';
function openJournal(sub){
  if(sub==='quests'){renderQuests();}else if(sub==='vocab'){renderVocab();}else{sub='quotes';renderQuotes();}
  jrnLast=sub;show(sub);
  document.querySelectorAll('.jtab').forEach(b=>b.classList.toggle('on',b.dataset.sub===sub));
  closeDrawer();
}
el('dJournal').onclick=()=>openJournal(jrnLast);
/* ===== Словарь-копилка + флешкарты ===== */
let vocabMode='list',vcIdx=0,vcFlip=false;
function renderVocab(){
  if(el('btnVocabCards'))el('btnVocabCards').textContent=(vocabMode==='cards')?'📃 Список':'🃏 Карточки';
  const box=el('vocabBody');if(!box)return;
  const list=S.vocab||[];
  if(!list.length){vocabMode='list';box.innerHTML='<div style="color:var(--muted);text-align:center;padding:46px 0">Пока пусто.<br>Выделите слово в книге и нажмите «📖» — оно попадёт сюда.<br><br>Потом повторяйте карточками 🃏</div>';return;}
  if(vocabMode==='cards'){renderVocabCards();return;}
  const known=list.filter(v=>(v.box||0)>=4).length;
  box.innerHTML='<div style="font-size:13px;color:var(--muted);margin-bottom:10px">Слов: <b>'+list.length+'</b> · выучено: <b>'+known+'</b></div>'+
    list.map(function(v,i){return '<div class="qcard"><div class="row"><b style="font-size:15px">'+esc(v.w)+'</b><div class="spacer"></div><span class="chip">'+(((v.box||0)>=4)?'✅':'🔁 '+(v.box||0)+'/4')+'</span><button class="lnk danger" style="margin-left:8px" onclick="delWord('+i+')">✕</button></div>'+
      (v.ctx?'<div class="qnote">«'+esc(v.ctx)+'»</div>':'')+
      '<div class="qmeta"><span>'+esc(v.book||'')+'</span><div class="spacer"></div><span>'+(v.date||'')+'</span></div></div>';}).join('');
}
function delWord(i){if(!S.vocab||!S.vocab[i])return;S.vocab.splice(i,1);save();renderVocab();}
function dueCards(){return (S.vocab||[]).map(function(v,i){return {v:v,i:i};}).filter(function(o){return (o.v.box||0)<5;});}
function renderVocabCards(){
  const box=el('vocabBody');const due=dueCards();
  if(!due.length){box.innerHTML='<div style="text-align:center;padding:50px 0">🎉 Все карточки повторены!<br><br><button class="buy" onclick="vocabMode=\'list\';renderVocab()">К списку</button></div>';return;}
  if(vcIdx>=due.length)vcIdx=0;
  const o=due[vcIdx],v=o.v;
  box.innerHTML='<div style="text-align:center;font-size:12px;color:var(--muted);margin:6px 0 12px">Карточка '+(vcIdx+1)+' из '+due.length+'</div>'+
    '<div class="flashcard" onclick="vcFlip=!vcFlip;renderVocabCards()">'+
    (vcFlip?'<div class="fc-back">'+(v.ctx?'«'+esc(v.ctx)+'»':'<span style="color:var(--muted)">нет контекста — добавьте перевод сами</span>')+'<div style="font-size:12px;color:var(--muted);margin-top:12px">'+esc(v.book||'')+'</div></div>'
           :'<div class="fc-front">'+esc(v.w)+'<div style="font-size:12px;color:var(--muted);font-weight:400;margin-top:12px">тап — показать контекст</div></div>')+
    '</div>'+
    '<div class="row" style="gap:10px;margin-top:14px"><button class="buy" style="flex:1;background:#e0445b" onclick="gradeCard('+o.i+',false)">🔁 Повторить</button><button class="buy owned" style="flex:1" onclick="gradeCard('+o.i+',true)">✅ Знаю</button></div>';
}
function gradeCard(i,known){const v=(S.vocab||[])[i];if(!v)return;v.box=known?Math.min(5,(v.box||0)+1):0;save();vcFlip=false;vcIdx++;renderVocabCards();}
if(el('btnVocabCards'))el('btnVocabCards').onclick=function(){vocabMode=(vocabMode==='cards')?'list':'cards';vcIdx=0;vcFlip=false;renderVocab();};
el('dShop').onclick=()=>{renderShop();show('shop');closeDrawer();};
el('dProf').onclick=()=>{renderProfile();show('profile');closeDrawer();};
/* Квесты живут во вкладке «Дневник» (openJournal) */
let progLast='calendar';
function openProgress(sub){
  if(sub==='stats')renderStats();else if(sub==='achievements')renderAchievements();else if(sub==='shelf')renderShelf();else{sub='calendar';renderCalendar();}
  progLast=sub;show(sub==='shelf'?'shelfScreen':sub);
  document.querySelectorAll('.progtab').forEach(b=>b.classList.toggle('on',b.dataset.sub===sub));
  closeDrawer();
}
el('dProg').onclick=()=>openProgress(progLast);
el('dSet').onclick=()=>{renderSettings();show('settings');closeDrawer();};

/* ================= БИБЛИОТЕКА ================= */
/* gold auto-paid at boot for a session recovered after a kill: one quiet line on the library, once
   (runtime only — gone after any screen change or reload; never shown in the reader) */
let __bootGold=0;
function renderLibrary(){
  rollDay();
  if(!renderLibrary._bk){renderLibrary._bk=true;
    const ub=(S.userBooks||[]).length;
    const stale=!S.lastBackup||((Date.now()-new Date(S.lastBackup).getTime())>14*86400000);
    if(ub>0&&stale)setTimeout(()=>{if(!el('library').classList.contains('hidden'))flashMsg('Совет: сделайте резервную копию своих книг (Настройки → Данные → Экспорт)',{kind:'info',icon:'info'});},1400); /* 1б: library tip only on the library, never over the text */
  }
  el('goldChip').textContent=curI()+' '+goldDisp();
  el('goalTitle').textContent=isMvp()?('Цель '+goalMin()+' мин'):('Цель дня: '+S.goal+' мин');
  const _mt=isMvp()?minTodaySess():S.minToday;
  el('goalSub').textContent='Сегодня: '+Math.floor(_mt)+' мин';
  const gl=el('libGoldLine');if(gl){gl.textContent=__bootGold?('+'+__bootGold+' 🪙 за прошлую сессию'):'';gl.classList.toggle('hidden',!__bootGold);}
  el('streakTxt').textContent='🔥 '+S.streak+' '+plural(S.streak,'день','дня','дней');
  el('lvlTxt').textContent='⭐ Ур. '+level(S.xp);
  const pct=Math.min(1,_mt/goalMin());
  el('ringFg').style.strokeDashoffset=207*(1-pct);
  el('ringFg').style.stroke=pct>=1?'#4cd97b':'#2bb3c0';
  el('ringTxt').textContent=Math.floor(pct*100)+'%';
  renderLibChips();
  // карточка «Продолжить чтение»
  const cc=el('continueCard');
  if(cc){const lid=S.lastRead,lb=lid&&allBooks().find(x=>x.id===lid);
    if(lb&&!S.finished.includes(lid)){const pr=Math.round(rqPos(lid)*100);
      cc.innerHTML='<button class="continuecard" onclick="openBook(\''+lid+'\')"><div class="cover">'+coverHtml(lb)+'</div><div style="flex:1;min-width:0;text-align:left"><div style="font-size:11px;color:var(--muted)">▶ ПРОДОЛЖИТЬ ЧТЕНИЕ</div><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(lb.title)+'</b><div class="pbar" style="margin-top:6px"><i style="width:'+pr+'%"></i></div></div><span style="font-size:22px;opacity:.6">›</span></button>';}
    else cc.innerHTML='';}
  const dc=el('dailyCard');
  if(dc){if(S.dailyClaim!==today()){const rew=dailyReward();dc.innerHTML='<button class="dailycard" onclick="claimDaily()">🎁<b style="margin:0 4px">Ежедневный бонус</b>+'+rew+' '+curI()+'<span style="margin-left:auto;font-size:12px">забрать ›</span></button>';}else dc.innerHTML='';}
  const shelf=el('shelf');shelf.innerHTML='';
  let list=allBooks();
  if(LIB.q)list=list.filter(b=>(b.title+' '+b.author).toLowerCase().includes(LIB.q));
  if(LIB.f==='fav')list=list.filter(b=>S.favs.includes(b.id));
  else if(LIB.f!=='all')list=list.filter(b=>bookStatus(b.id)===LIB.f);
  if(LIB.author)list=list.filter(b=>b.author===LIB.author);
  if(LIB.sort==='title')list.sort((a,b)=>a.title.localeCompare(b.title));
  else if(LIB.sort==='progress')list.sort((a,b)=>rqPos(b.id)-rqPos(a.id)); /* 1б-144: by current position */
  else{const lo=S.lastOpen||{};list.sort((a,b)=>(lo[b.id]||0)-(lo[a.id]||0));}
  if(!list.length)shelf.innerHTML='<div class="pempty" style="grid-column:1/-1">Ничего не найдено</div>';
  list.forEach(b=>{
    const p={ratio:rqPos(b.id)}; /* card % = current position (farthest stays for finish / stats) */
    const done=S.finished.includes(b.id);
    const card=document.createElement('button');card.className='bookcard';
    card.innerHTML='<div class="cover">'+coverHtml(b)+'</div><div class="bmeta">'+
      '<div class="btitle">'+(S.favs.includes(b.id)?'<span style="color:var(--accent2)">★</span> ':'')+esc(b.title)+'</div><div class="bauthor">'+esc(b.author)+'</div>'+
      '<div class="pbar"><i style="width:'+Math.round((done?1:p.ratio)*100)+'%;'+(done?'background:#4cd97b':'')+'"></i></div>'+
      '<div class="bpct">'+(done?'✅ Прочитано':Math.round(p.ratio*100)+'%')+' · качает '+statOf(b)+'</div></div>'+
      '<span class="infobtn" onclick="event.stopPropagation();bookInfo(\''+b.id+'\')">ⓘ</span>';
    card.onclick=()=>openBook(b.id);
    shelf.appendChild(card);
  });
  if(isMvp()){
    document.querySelectorAll('#shelf .bpct').forEach(function(n){
      n.textContent=n.textContent.replace(/\s·\sкачает.*$/,'');
    });
  }
  applyMvpChrome();
}
function plural(n,a,b,c){const m=n%10,h=n%100;if(h>=11&&h<=14)return c;if(m===1)return a;if(m>=2&&m<=4)return b;return c;}
/* --- поиск и фильтры библиотеки --- */
let LIB={q:'',f:'all',author:null,sort:'recent'};
el('libSearch').oninput=e=>{LIB.q=e.target.value.toLowerCase().trim();renderLibrary();};
if(el('libSort'))el('libSort').onchange=e=>{LIB.sort=e.target.value;renderLibrary();};
function bookStatus(id){
  if(S.finished.includes(id))return 'done';
  if(S.status[id]==='want')return 'want';
  if(((S.progress[id]||{}).ratio||0)>0)return 'reading';
  return 'new';
}
/* --- сложность книг и привязка характеристик --- */
const DIFFS=[{n:'На вечер',m:1},{n:'Лёгкая',m:1.2},{n:'Средняя',m:1.5},{n:'Сложная',m:2},{n:'Демоническая',m:3}];
function diffOf(id){
  const man=S.bookDiff[id];
  if(man>0)return man-1;
  if(S.autoDiff===false)return 2;
  const b=allBooks().find(x=>x.id===id);if(!b)return 2;
  const len=b.text&&b.text.length?b.text.length:(b.pages||60)*1800;
  let lvl=0;
  if(len>30000)lvl++;
  if(len>100000)lvl++;
  if(len>250000)lvl++;
  if(len>500000)lvl++;
  if(/нон-фикшн|наук|учеб|справ|филос/i.test(b.genre))lvl++; // прикладная литература ценнее
  if(/юмор|рассказ/i.test(b.genre))lvl--;
  return Math.max(0,Math.min(4,lvl));
}
function statOf(b){return S.bookStat[b.id]||b.stat;}
function coverHtml(b){
  const cv=S.covers[b.id];
  if(cv&&cv.indexOf('data:')===0)return '<img src="'+cv+'" alt="">';
  if(cv)return cv;
  return b.cover;
}
function renderLibChips(){
  const box=el('libChips');box.innerHTML='';
  [['all','Все'],['reading','📖 Читаю'],['want','📌 Хочу'],['done','✅ Прочитано'],['fav','★ Избранное']].forEach(([k,t])=>{
    const b=document.createElement('button');
    b.className='fchip'+(LIB.f===k&&!LIB.author?' on':'');b.textContent=t;
    b.onclick=()=>{LIB.f=k;LIB.author=null;renderLibrary();};
    box.appendChild(b);
  });
  Array.from(new Set(allBooks().map(b=>b.author))).forEach(a=>{
    const b=document.createElement('button');
    b.className='fchip'+(LIB.author===a?' on':'');b.textContent='👤 '+a;
    b.onclick=()=>{LIB.author=LIB.author===a?null:a;renderLibrary();};
    box.appendChild(b);
  });
}
function esc(s){return String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}

el('btnAdd').onclick=()=>el('fileInp').click();
el('fileInp').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;e.target.value='';
  const btn=el('btnAdd');
  try{
    let b;
    if(/\.pdf$/i.test(f.name)){
      btn.textContent='⏳ Загружаю PDF...';
      await loadPdfJs();
      const buf=await f.arrayBuffer();
      const doc=await window.pdfjsLib.getDocument({data:buf.slice(0)}).promise;
      const nPages=doc.numPages;try{doc.destroy();}catch(_){} /* only the page count is needed here */
      const id='u'+Date.now();
      await idbPut('pdf:'+id,buf);
      b={id:id,title:f.name.replace(/\.pdf$/i,''),author:'PDF',genre:'PDF',stat:'Воля',cover:'📄',type:'pdf',pages:nPages,text:'',fname:f.name,size:f.size};
    }else if(/\.fb2$/i.test(f.name)){
      btn.textContent='⏳ Разбираю FB2...';
      const r=await parseFb2(f);
      b={id:'u'+Date.now(),title:r.title,author:r.author,genre:'FB2',stat:'Воображение',cover:'📕',text:r.text,toc:r.toc,fname:f.name,size:f.size};
    }else if(/\.epub$/i.test(f.name)){
      btn.textContent='⏳ Распаковываю EPUB...';
      const r=await parseEpub(f);
      b={id:'u'+Date.now(),title:r.title,author:r.author,genre:'EPUB',stat:'Воля',cover:'📘',text:r.text,toc:r.toc,fname:f.name,size:f.size};
    }else{
      const txt=await f.text();
      b={id:'u'+Date.now(),title:f.name.replace(/\.txt$/i,''),author:'Моя книга',genre:'Своя книга',stat:'Воля',cover:'📜',text:txt,fname:f.name,size:f.size};
    }
    if(b.type!=='pdf'&&(!b.text||b.text.length<20))throw new Error('текст пустой');
    /* the text body goes to IDB once, here (saveFlat writes only the envelope) — before the book appears on the shelf */
    if(b.type!=='pdf'){
      if(window.__rqWriter&&!window.__rqWriter.mayWrite())throw new Error('книга открыта в другом окне');
      if(!__rq||!__rq.upsertUserBook)throw new Error('хранилище ещё не готово — обновите страницу');
      await __rq.upsertUserBook(null,b,{text:b.text});
    }
    S.userBooks.push(b);
    if(!S.badges.includes('collector'))S.badges.push('collector');
    save();renderLibrary();
  }catch(err){alert('Не удалось загрузить книгу: '+err.message);}
  btn.textContent='＋ Добавить';
};

