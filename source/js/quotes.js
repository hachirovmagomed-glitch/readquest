'use strict';
/* ===== Цитаты: фильтр, поиск, карточка, цитата дня, экспорт, ИИ, дневник =====
   28.10 (Джессика: «Какие ещё прикольные штуки можно добавить в раздел цитаты?» → «давай реализуем все, кроме пятого»):
   - «Навигация → Цитаты» и «Цитаты и заметки»: поиск по словам цитат и заметок, фильтр по цвету, порядок (по книге / новые / старые);
   - карточка-картинка цитаты в оформлении скина (его узоры из skins.css, день или ночь как сейчас): поделиться или сохранить PNG;
   - цитата дня на главной (одна на день из всех цитат, тап открывает это место; ✕ прячет до завтра);
   - экспорт цитат книги (или всех) в TXT / Markdown: поделиться или сохранить файл;
   - «Объясни» и «Обсудить» по цитате из списка (тот же ИИ со своим ключом, js/content.js);
   - «В дневник»: запись в дневник книги с цитатой (появляется вместе с «Дневниками», js/diary.js). */

/* --- список --- */
const QL={bid:null,q:'',c:''}; /* поиск и цвет в «Навигации» — на время чтения книги; порядок — SET.qSort */
const QL_SORTS=[['book','По книге'],['new','Сначала новые'],['old','Сначала старые']];
function qlSort(){return QL_SORTS.some(x=>x[0]===SET.qSort)?SET.qSort:'book';}
function qlNorm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ');}
function qlHit(q,s){return !s||qlNorm(q.text+' '+(q.note||'')).indexOf(s)>=0;}
/** the quotes of a book as rows {q, i (index in S.quotes), p (page now or -1)}, filtered and sorted */
function qlRows(b,f){
  let a=(S.quotes[b.id]||[]).map((q,i)=>({q,i,p:-1}));
  const here=R&&R.book&&R.book.id===b.id;
  if(here)a.forEach(x=>{try{x.p=quotePage(b,x.q);}catch(e){}});
  const s=qlNorm(f.q).trim();
  a=a.filter(x=>(!f.c||hlKey(x.q.c)===f.c)&&qlHit(x.q,s));
  const srt=f.sort||qlSort(),d=x=>String(x.q.date||'');
  if(srt==='new')a.sort((x,y)=>d(y).localeCompare(d(x))||y.i-x.i);
  else if(srt==='old')a.sort((x,y)=>d(x).localeCompare(d(y))||x.i-y.i);
  else if(here)a.sort((x,y)=>(x.p<0?1e9:x.p)-(y.p<0?1e9:y.p)||x.i-y.i);
  return a;
}
/** colour chips: «Все» + every colour that has quotes (shown when there are 2+ colours) */
function qlChips(qs,cur,act){
  const n={};qs.forEach(q=>{const k=hlKey(q&&q.c);n[k]=(n[k]||0)+1;});const ks=Object.keys(n);
  if(ks.length<2)return '';
  return '<div class="qlchips" role="group" aria-label="Цвет цитат"><button type="button" class="qlc'+(cur?'':' on')+'" data-'+act+'="" aria-pressed="'+!cur+'">Все</button>'+
    ks.map(k=>'<button type="button" class="qlc'+(cur===k?' on':'')+'" data-'+act+'="'+esc(k)+'" aria-pressed="'+(cur===k)+'" aria-label="'+esc(k[0]==='#'?'Свой цвет':hlName(k))+', '+n[k]+'"><i style="--d:'+hlDot(k)+';--d2:'+hlDot2(k)+'"></i>'+n[k]+'</button>').join('')+'</div>';
}
function qlTools(act,q,ph){
  return '<div class="qltools"><label class="qlfind">'+rqIcon('search',16)+'<input type="search" data-'+act+'-find value="'+esc(q)+'" placeholder="'+ph+'" aria-label="Поиск по цитатам и заметкам" autocomplete="off"></label>'+
    '<button type="button" class="qlbtn" data-'+act+'-sort aria-label="Порядок: '+QL_SORTS.find(x=>x[0]===qlSort())[1]+'">'+rqIcon('list',16)+'<span>'+QL_SORTS.find(x=>x[0]===qlSort())[1]+'</span></button>'+
    '<button type="button" class="qlbtn qlico" data-'+act+'-exp aria-label="Экспорт цитат" title="Экспорт цитат">'+rqIcon('download',18)+'</button></div>';
}
function qlSortNext(){const i=QL_SORTS.findIndex(x=>x[0]===qlSort());SET.qSort=QL_SORTS[(i+1)%QL_SORTS.length][0];saveSet();}

/* --- «Навигация → Цитаты» (reader-ui.js renderPanel) --- */
function qlPanel(body,b){
  if(QL.bid!==b.id){QL.bid=b.id;QL.q='';QL.c='';}
  const qs=S.quotes[b.id]||[];if(QL.c&&!qs.some(q=>hlKey(q&&q.c)===QL.c))QL.c='';
  const dy=typeof diaryQuickNote==='function'?'<button class="prow add" onclick="diaryQuickNote()">'+rqIcon('notebook-pen',16)+'Запись в дневник на этой странице</button>':''; /* 25.10 «Дневники» */
  if(!qs.length){body.innerHTML=dy+'<div class="pempty">'+rqIcon('quote',32)+'<div>Пока нет цитат — выделите текст в книге</div></div>';return;}
  body.innerHTML=dy+qlTools('pq',QL.q,'Поиск')+qlChips(qs,QL.c,'pqc')+'<div id="pqList"></div>';
  qlPanelList(b);
}
function qlPanelList(b){
  const box=el('pqList');if(!box)return;const rows=qlRows(b,QL);
  box.innerHTML=rows.length?rows.map(x=>qlRow(b,x)).join(''):'<div class="pempty">'+rqIcon('search',28)+'<div>Ничего не нашлось</div></div>';
}
function qlRow(b,x){
  const q=x.q,i=x.i,on=i===qOpen.i,t=String(q.text).replace(/\s*\n\s*/g,on?'\n':' '),p=x.p;
  const ai=typeof aiOn==='function';
  return '<div class="prow pq'+(on?' on':'')+'"><div class="pqh"><button class="pqt" aria-expanded="'+on+'" onclick="quoteToggle('+i+')"><i class="pqd" aria-hidden="true" style="--d:'+hlDot(q.c)+';--d2:'+hlDot2(q.c)+'"></i><span class="ptt">«'+esc(on||t.length<=60?t:t.slice(0,60)+'…')+'»'+
    (on&&q.note?'<span class="pqn">'+esc(q.note)+'</span>':'')+(p>=0?'<span class="pqp">стр. '+esc(quotePageLabel(p))+'</span>':'')+'</span></button>'+
    '<button class="pqdel" onclick="quoteDelAt('+i+')" aria-label="Удалить цитату" title="Удалить цитату">'+rqIcon('trash-2',18)+'</button></div>'+
    (on?'<div class="pqacts"><button class="pqgo" onclick="quoteGo('+i+')">'+rqIcon('book-open',16)+' Открыть в книге</button>'+
      '<button class="pqa" onclick="qCardOpen(R.book.id,'+i+')">'+rqIcon('image',16)+' Карточка</button>'+
      (ai?'<button class="pqa" onclick="qAiExplain(R.book.id,'+i+')">'+rqIcon('sparkles',16)+' Объясни</button>'+
        '<button class="pqa" onclick="qAiDiscuss('+i+')">'+rqIcon('message-circle',16)+' Обсудить</button>':'')+
      (qDiaryOn()?'<button class="pqa" onclick="qToDiary(R.book.id,'+i+')">'+rqIcon('notebook-pen',16)+' В дневник</button>':'')+'</div>':'')+'</div>';
}
if(el('panelBody')){
  el('panelBody').addEventListener('input',e=>{const t=e.target;if(!t.matches||!t.matches('[data-pq-find]')||!R.book)return;QL.q=t.value.slice(0,100);qOpen.i=-1;qlPanelList(R.book);});
  el('panelBody').addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-pqc],[data-pq-sort],[data-pq-exp]');if(!t||!R.book)return;
    if(t.hasAttribute('data-pq-sort')){qlSortNext();renderPanel('qts',{keep:true});return;}
    if(t.hasAttribute('data-pq-exp')){qExportAsk([R.book.id],qlRows(R.book,QL).map(x=>x.q));return;}
    QL.c=t.dataset.pqc;qOpen.i=-1;renderPanel('qts',{keep:true});});
}

/* --- «Цитаты и заметки» (all books, content.js renderQuotes) --- */
const QA={q:'',c:''};
function qaRows(){
  const s=qlNorm(QA.q).trim(),out=[];
  allBooks().forEach(b=>{const qs=S.quotes[b.id]||[];if(!qs.length)return;
    const rows=qlRows(b,{q:QA.q,c:QA.c}).map(x=>Object.assign(x,{b}));if(rows.length)out.push({b,rows});});
  return out;
}
function qaToolsHtml(){
  const all=[];allBooks().forEach(b=>(S.quotes[b.id]||[]).forEach(q=>all.push(q)));if(!all.length)return '';
  if(QA.c&&!all.some(q=>hlKey(q&&q.c)===QA.c))QA.c='';
  return qlTools('qa',QA.q,'Поиск')+qlChips(all,QA.c,'qac');
}
if(el('quoteBox')){
  const host=el('quoteBox').parentNode;
  host.addEventListener('input',e=>{const t=e.target;if(!t.matches||!t.matches('[data-qa-find]'))return;QA.q=t.value.slice(0,100);renderQuotes({list:true});});
  host.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-qac],[data-qa-sort],[data-qa-exp],[data-qact]');if(!t)return;
    if(t.hasAttribute('data-qa-sort')){qlSortNext();renderQuotes();return;}
    if(t.hasAttribute('data-qa-exp')){const g=qaRows();qExportAsk(g.map(x=>x.b.id),[].concat(...g.map(x=>x.rows.map(r=>r.q))));return;}
    if(t.hasAttribute('data-qact')){const bid=t.dataset.bid,i=+t.dataset.i,a=t.dataset.qact;
      if(a==='card')qCardOpen(bid,i);else if(a==='ai')qAiExplain(bid,i);else if(a==='dy')qToDiary(bid,i);else if(a==='copy')copyQuote(bid,i);else if(a==='del')delQuote(bid,i);
      return;}
    QA.c=t.dataset.qac;renderQuotes();});
}

/* --- поделиться / сохранить --- */
function qFileName(s){return String(s||'цитаты').replace(/[\\/:*?"<>|\n\r]+/g,' ').replace(/\s+/g,' ').trim().slice(0,60)||'цитаты';}
function qCanShare(f){try{return !!(navigator.canShare&&navigator.share&&navigator.canShare({files:[f]}));}catch(e){return false;}}
function qSave(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),20000);}
async function qShare(blob,name,title){const f=new File([blob],name,{type:blob.type});
  if(!qCanShare(f)){qSave(blob,name);flashMsg('Файл сохранён',{kind:'info',icon:'download'});return;}
  try{await navigator.share({files:[f],title:title||name});}catch(e){if(e&&e.name!=='AbortError'){qSave(blob,name);flashMsg('Файл сохранён',{kind:'info',icon:'download'});}}}
/** a bottom sheet like rqAsk: h = inner HTML; returns the sheet element. Closed by the scrim, ✕ or Escape */
function qSheet(h,label){
  let sc=el('qSheetScrim'),d=el('qSheet');
  if(!d){sc=document.createElement('div');sc.id='qSheetScrim';d=document.createElement('div');d.id='qSheet';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');document.body.appendChild(sc);document.body.appendChild(d);
    sc.onclick=qSheetClose;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!d.hidden){e.preventDefault();e.stopPropagation();qSheetClose();}},true);}
  d.setAttribute('aria-label',label||'');
  d.innerHTML='<div class="grab" aria-hidden="true"></div><button type="button" class="qsx" aria-label="Закрыть" onclick="qSheetClose()">'+rqIcon('x',20)+'</button>'+h;
  sc.hidden=false;d.hidden=false;return d;
}
function qSheetClose(){const d=el('qSheet'),sc=el('qSheetScrim');if(d){d.hidden=true;const im=d.querySelector('img[src^="blob:"]');if(im)URL.revokeObjectURL(im.src);}if(sc)sc.hidden=true;}

/* --- экспорт --- */
function qExportText(bids,list,md){
  const L=[],one=bids.length===1;
  if(!one)L.push(md?'# Мои цитаты':'Мои цитаты','');
  bids.forEach(bid=>{const b=allBooks().find(x=>x.id===bid);if(!b)return;const qs=(S.quotes[bid]||[]).filter(q=>list.indexOf(q)>=0);if(!qs.length)return;
    qs.sort((x,y)=>list.indexOf(x)-list.indexOf(y));
    const head=b.title+(bookAuthor(b)?' — '+bookAuthor(b):'');
    L.push(md?(one?'# ':'## ')+b.title:head);if(md&&bookAuthor(b))L.push('*'+bookAuthor(b)+'*');L.push('');
    const here=R&&R.book&&R.book.id===bid;
    qs.forEach(q=>{let p=-1;if(here)try{p=quotePage(b,q);}catch(e){}
      const meta=[p>=0?'стр. '+quotePageLabel(p):'',q.date?rqDayRu(q.date):''].filter(Boolean).join(' · ');
      const t=String(q.text).replace(/\s*\n\s*/g,md?'\n> ':'\n');
      if(md){L.push('> '+t);if(meta)L.push('>','> — '+meta);if(q.note)L.push('','**Заметка:** '+q.note);}
      else{L.push('«'+t+'»');if(meta)L.push('— '+meta);if(q.note)L.push('Заметка: '+q.note);}
      L.push('');});
  });
  return L.join('\n').replace(/\n{3,}/g,'\n\n').trim()+'\n';
}
function qExportAsk(bids,list){
  if(!list.length){rqAlert('Здесь нет цитат для экспорта');return;}
  const one=bids.length===1&&allBooks().find(x=>x.id===bids[0]),n=list.length;
  const d=qSheet('<h3>Экспорт цитат</h3><p>'+(one?'«'+esc(one.title)+'», ':'')+n+' '+plural(n,'цитата','цитаты','цитат')+(n<qExportAll(bids)?' (как сейчас в списке)':'')+'</p>'+
    '<div class="qfmt" role="radiogroup" aria-label="Формат"><button type="button" role="radio" aria-checked="true" data-f="txt" class="on">'+rqIcon('file-text',16)+' Текст</button><button type="button" role="radio" aria-checked="false" data-f="md">'+rqIcon('notebook',16)+' Markdown</button></div>'+
    '<div class="rqaskb"><button type="button" class="ghostbtn" data-x="save">'+rqIcon('download',18)+' Сохранить</button><button type="button" class="cta" data-x="share">'+rqIcon('share-2',18)+' Поделиться</button></div>','Экспорт цитат');
  let f='txt';
  d.querySelectorAll('.qfmt button').forEach(b=>b.onclick=()=>{f=b.dataset.f;d.querySelectorAll('.qfmt button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-checked',x===b);});});
  const make=()=>{const md=f==='md',name=qFileName(one?one.title:'Мои цитаты')+(md?'.md':'.txt');return {blob:new Blob([qExportText(bids,list,md)],{type:md?'text/markdown':'text/plain'}),name};};
  d.querySelector('[data-x="save"]').onclick=()=>{const m=make();qSave(m.blob,m.name);qSheetClose();flashMsg('Файл сохранён',{kind:'info',icon:'download'});};
  d.querySelector('[data-x="share"]').onclick=()=>{const m=make();qSheetClose();qShare(m.blob,m.name,'Цитаты');};
}
function qExportAll(bids){return bids.reduce((n,id)=>n+(S.quotes[id]||[]).length,0);}

/* --- ИИ --- */
function qAiExplain(bid,i){
  const b=allBooks().find(x=>x.id===bid),q=b&&(S.quotes[bid]||[])[i];if(!q)return;
  if(!aiOn()){aiNoKey();return;}
  if(bid===(R.book||{}).id)el('panel').classList.add('hidden');
  aiExplain({text:String(q.text).replace(/\s+/g,' ').slice(0,600),ctx:'',title:String(b.title||'').slice(0,200),author:String(bookAuthor(b)||'').slice(0,120)});
}
/** «Обсудить»: the book's chat with the quote already typed — the reader adds a question or just sends */
function qAiDiscuss(i){
  const q=R.book&&(S.quotes[R.book.id]||[])[i];if(!q)return;
  if(!aiOn()){aiNoKey();return;}
  el('panel').classList.add('hidden');openAiChat();
  const t=String(q.text).replace(/\s+/g,' '),inp=el('aiChatIn');
  inp.value='Давай обсудим это место: «'+(t.length>600?t.slice(0,600)+'…':t)+'». ';
  inp.dispatchEvent(new Event('input'));try{inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);}catch(e){}
}

/* --- дневник (js/diary.js, «Дневники») --- */
function qDiaryOn(){return typeof diaryNew==='function'&&typeof dyNewEntry==='function'&&typeof diaryOf==='function';}
function qToDiary(bid,i){
  const b=allBooks().find(x=>x.id===bid),q=b&&(S.quotes[bid]||[])[i];if(!q||!qDiaryOn())return;
  const t=String(q.text).replace(/\s*\n\s*/g,' ');let p=-1;if(R.book&&R.book.id===bid)try{p=quotePage(b,q);}catch(e){}
  return rqAsk({t:'Запись в дневник',p:'«'+t.slice(0,140)+(t.length>140?'…':'')+'» — ваша мысль о цитате',ok:'Записать',input:''}).then(v=>{
    if(v===null||v===false)return;const y=diaryOf(bid)||diaryNew({b:bid});
    const n=dyNewEntry(y,'',p>=0?{pg:p+1,r:R.pageCount>1?p/(R.pageCount-1):0}:null);
    n.x=('> '+String(q.text).replace(/\s*\n\s*/g,'\n> ')+(v?'\n\n'+v:'')).slice(0,20000);dyTouch(y);
    flashMsg('Записано в дневник',{kind:'info',icon:'notebook-pen'});
  });
}

/* --- карточка-картинка --- */
/* the skin's own ornaments are the SVGs skins.css already has (data: URLs in CSS variables); a night variant (-n) when the app is at night */
const QC_ORN={
  ellada:{band:'--el-meander',mark:'--el-laurel'},
  celestial:{corners:['--cl-ctl','--cl-ctr','--cl-cbl','--cl-cbr'],div:'--cl-div',scatter:'--cl-spark',mark:'--cl-stars3'},
  babochkovyi:{scatter:'--bb-fly',mark:'--bb-flyers'},
  pencil:{spiral:'--pc-spiral',under:'--pc-under',mark:'--pc-star'}
};
function qcVar(name){const cs=getComputedStyle(document.documentElement);let night=false;try{night=appIsNight();}catch(e){}
  const v=(night&&cs.getPropertyValue(name+'-n').trim())||cs.getPropertyValue(name).trim();const m=/^url\(\s*(["']?)([\s\S]*)\1\s*\)$/.exec(v);return m?m[2]:'';}
function qcImg(url){return new Promise(res=>{if(!url)return res(null);const im=new Image();im.onload=()=>res(im.naturalWidth?im:null);im.onerror=()=>res(null);im.src=url;});}
function qcWrap(c,t,w){const out=[];String(t).split(/\n/).forEach(par=>{let line='';par.split(/\s+/).filter(Boolean).forEach(word=>{const s=line?line+' '+word:word;
  if(c.measureText(s).width<=w||!line)line=s;else{out.push(line);line=word;}});out.push(line);});return out;}
/** PNG of the quote: 1080×1350, the colours and ornaments of the skin now on (or the app theme) */
async function qCardBlob(b,q,pg){
  const W=1080,H=1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
  const cs=getComputedStyle(document.documentElement),v=n=>cs.getPropertyValue(n).trim();
  const skin=document.documentElement.dataset.skin||'',bg=v('--bg'),txt=v('--txt')||'#222',mut=v('--muted')||'#777',acc=v('--accent')||'#2bb3c0';
  const ink=hlDot(q.c),dot=ink.startsWith('var(')?(v(/--[\w-]+/.exec(ink)[0])||(HL_COLORS.find(x=>x.k===hlKey(q.c))||HL_COLORS[0]).d):ink;
  try{await document.fonts.ready;}catch(e){}
  const serif=(FONTS[SET.font]||FONTS[0]).v,sans=getComputedStyle(document.body).fontFamily||'system-ui,sans-serif';
  c.fillStyle=bg||'#f6efe2';c.fillRect(0,0,W,H);
  const o=QC_ORN[skin]||{};const pad=110;
  /* ornaments */
  if(o.band){const im=await qcImg(qcVar(o.band));if(im){const s=36,p=c.createPattern(qcScale(im,s),'repeat-x');c.save();c.fillStyle=p;c.translate(0,44);c.fillRect(0,0,W,s);c.translate(0,H-88-s);c.fillRect(0,0,W,s);c.restore();}}
  if(o.corners){const ims=await Promise.all(o.corners.map(n=>qcImg(qcVar(n))));const s=150;ims.forEach((im,k)=>{if(!im)return;c.drawImage(im,k%2?W-40-s:40,k<2?40:H-40-s,s,s);});
    c.strokeStyle=acc;c.globalAlpha=.55;c.lineWidth=2;c.strokeRect(58,58,W-116,H-116);c.globalAlpha=1;}
  if(o.scatter){const im=await qcImg(qcVar(o.scatter));if(im){const r=qcRand(String(q.text).length+7);for(let k=0;k<9;k++){const s=34+r()*40,x=60+r()*(W-120),y=70+r()*170;c.globalAlpha=.5+r()*.4;c.drawImage(im,x-s/2,y-s/2,s,s*im.naturalHeight/im.naturalWidth);}c.globalAlpha=1;}}
  if(o.spiral){const im=await qcImg(qcVar(o.spiral));c.strokeStyle=v('--pc-rule')||'rgba(70,110,200,.22)';c.lineWidth=2;for(let y=250;y<H-120;y+=62){c.beginPath();c.moveTo(70,y);c.lineTo(W-40,y);c.stroke();}
    c.strokeStyle='rgba(220,70,70,.45)';c.beginPath();c.moveTo(150,0);c.lineTo(150,H);c.stroke();if(im){for(let y=90;y<H-60;y+=110)c.drawImage(im,8,y,64,64*im.naturalHeight/im.naturalWidth);}}
  /* the quote */
  const left=o.spiral?190:pad,width=W-left-pad;
  let t=String(q.text).replace(/[ \t]+/g,' ').trim();if(t.length>700)t=t.slice(0,700).replace(/\s+\S*$/,'')+'…';
  const top=300,room=H-top-420;let fs=88,lines=[];for(;fs>=30;fs-=2){c.font=fs+'px '+serif;lines=qcWrap(c,t,width);if(lines.length*fs*1.38<=room)break;}
  if(lines.length*fs*1.38>room){const max=Math.floor(room/(fs*1.38));lines=lines.slice(0,max);lines[max-1]=lines[max-1].replace(/\s*\S*$/,'')+'…';}
  const lh=fs*1.38,bh=lines.length*lh;let y=top+Math.max(0,(room-bh)/2)+fs; /* the words in the middle of the card */
  c.fillStyle=dot;c.font='700 '+Math.round(fs*2.4)+'px '+serif;c.textBaseline='alphabetic';c.globalAlpha=.9;c.fillText('«',left-10,y-fs*1.05);c.globalAlpha=1;
  c.fillStyle=txt;c.font=fs+'px '+serif;lines.forEach(l=>{c.fillText(l,left,y);y+=lh;});
  /* the book */
  y=Math.max(y+40,H-300);
  if(o.under){const im=await qcImg(qcVar(o.under));if(im)c.drawImage(im,left,y-34,260,260*im.naturalHeight/im.naturalWidth);else{c.fillStyle=dot;c.fillRect(left,y-24,120,6);}}
  else if(o.div){const im=await qcImg(qcVar(o.div));if(im){const w=420;c.drawImage(im,(W-w)/2,y-44,w,w*im.naturalHeight/im.naturalWidth);}else{c.fillStyle=dot;c.fillRect(left,y-24,120,6);}}
  else{c.fillStyle=dot;c.fillRect(left,y-24,120,6);}
  c.fillStyle=txt;c.font='700 40px '+sans;const tl=qcWrap(c,b.title,width).slice(0,2);tl.forEach(l=>{y+=50;c.fillText(l,left,y);});
  c.fillStyle=mut;c.font='34px '+sans;const sub=[bookAuthor(b),pg].filter(Boolean).join(' · ');if(sub){y+=50;c.fillText(qcWrap(c,sub,width)[0],left,y);}
  if(o.mark){const im=await qcImg(qcVar(o.mark));if(im){const s=110;c.globalAlpha=.85;c.drawImage(im,W-pad-s,H-pad-s*im.naturalHeight/im.naturalWidth-10,s,s*im.naturalHeight/im.naturalWidth);c.globalAlpha=1;}}
  c.fillStyle=mut;c.globalAlpha=.7;c.font='26px '+sans;if(o.corners){c.textAlign='center';c.fillText('ReadQuest',W/2,H-108);c.textAlign='left';}else c.fillText('ReadQuest',left,H-108);c.globalAlpha=1;
  return new Promise(res=>cv.toBlob(res,'image/png'));
}
function qcScale(im,h){const w=Math.max(1,Math.round(im.naturalWidth*h/im.naturalHeight)),cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(im,0,0,w,h);return cv;}
function qcRand(s){let x=s*9301+49297;return ()=>{x=(x*9301+49297)%233280;return x/233280;};}
async function qCardOpen(bid,i){
  const b=allBooks().find(x=>x.id===bid),q=b&&(S.quotes[bid]||[])[i];if(!q)return;
  let p=-1;if(R.book&&R.book.id===bid)try{p=quotePage(b,q);}catch(e){}
  const d=qSheet('<h3>Карточка цитаты</h3><div class="qcprev" role="status">Рисую…</div><div class="rqaskb"><button type="button" class="ghostbtn" data-x="save" disabled>'+rqIcon('download',18)+' Сохранить</button><button type="button" class="cta" data-x="share" disabled>'+rqIcon('share-2',18)+' Поделиться</button></div>','Карточка цитаты');
  let blob=null;try{blob=await qCardBlob(b,q,p>=0?'стр. '+quotePageLabel(p):'');}catch(e){console.warn('[rq] card',e);}
  if(el('qSheet')!==d||d.hidden)return;
  if(!blob){d.querySelector('.qcprev').textContent='Не получилось нарисовать карточку';return;}
  const name=qFileName('Цитата — '+b.title)+'.png';
  d.querySelector('.qcprev').innerHTML='<img alt="Карточка: «'+esc(String(q.text).slice(0,80))+'»" src="'+URL.createObjectURL(blob)+'">';
  d.querySelectorAll('[data-x]').forEach(x=>x.disabled=false);
  d.querySelector('[data-x="save"]').onclick=()=>{qSave(blob,name);flashMsg('Картинка сохранена',{kind:'info',icon:'image'});};
  d.querySelector('[data-x="share"]').onclick=()=>qShare(blob,name,b.title);
}

/* --- цитата дня (главная, renderLibrary) --- */
function qDayPick(){
  const all=[];allBooks().forEach(b=>(S.quotes[b.id]||[]).forEach((q,i)=>{if(q&&String(q.text||'').trim())all.push({b,q,i});}));
  if(!all.length)return null;const d=today();let h=0;for(let k=0;k<d.length;k++)h=(h*31+d.charCodeAt(k))>>>0;
  return all[h%all.length];
}
function qDayRender(){
  const box=el('qdayCard');if(!box)return;const x=S.qdayOff===today()?null:qDayPick();
  if(!x){box.innerHTML='';return;}
  const t=String(x.q.text).replace(/\s*\n\s*/g,' '),short=t.length>220?t.slice(0,220).replace(/\s+\S*$/,'')+'…':t;
  box.innerHTML='<div class="qcard qday" style="--d:'+hlDot(x.q.c)+';--d2:'+hlDot2(x.q.c)+'"><div class="qdayh"><i class="qdayd" aria-hidden="true"></i><span>Цитата дня</span><span class="spacer"></span>'+
    '<button type="button" class="qdayb" data-qday="card" aria-label="Карточка цитаты">'+rqIcon('share-2',18)+'</button><button type="button" class="qdayb" data-qday="off" aria-label="Скрыть до завтра" title="Скрыть до завтра">'+rqIcon('x',18)+'</button></div>'+
    '<button type="button" class="qdayt" data-qday="go"><span class="qtext">«'+esc(short)+'»</span><span class="qdaym">'+esc(x.b.title)+(bookAuthor(x.b)?' · '+esc(bookAuthor(x.b)):'')+'</span></button></div>';
  box.dataset.bid=x.b.id;box.dataset.i=x.i;
}
async function qDayGo(bid,i){
  const q=(S.quotes[bid]||[])[i];if(!q)return;
  await openBook(bid);if(!R.book||R.book.id!==bid)return;
  for(let k=0;k<40&&R.mode==='pdf'&&!R.pdf;k++)await new Promise(r=>setTimeout(r,200));
  let p=-1;try{p=quotePage(R.book,q);}catch(e){}
  if(p<0){quoteGo(i);return;}
  if(p!==R.page)jumpTo(p);setTimeout(()=>{try{hlFlash(bid,q);}catch(e){}},400);
}
if(el('qdayCard'))el('qdayCard').addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-qday]');if(!t)return;const box=el('qdayCard'),bid=box.dataset.bid,i=+box.dataset.i,a=t.dataset.qday;
  if(a==='off'){S.qdayOff=today();save();qDayRender();flashMsg('Цитата дня вернётся завтра',{kind:'info',icon:'quote'});}
  else if(a==='card')qCardOpen(bid,i);else qDayGo(bid,i);});
