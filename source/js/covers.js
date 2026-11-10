/* ===== Обложки своих книг (10.11, Джессика: «Сделай так, чтобы можно было подгрузить обложки книг, которые ты сам загружаешь») =====
   A new EPUB / FB2 / PDF comes onto the shelf with its own cover (library.js importBookFile: EPUB cover image, FB2 <coverpage>,
   PDF page 1). For any book, the ⓘ card → «Обложка»: «Выбрать картинку с телефона», «Картинка из книги» / «Страница из PDF»
   (pictures already stored for the book, or the same file picked again), «Найти в интернете» (Open Library + Google Книги by
   title and author, only on a tap; a link to Яндекс Картинки for what they do not have), «Вернуть стандартную».
   Books added before 10.11 get their cover once, quietly, after start: a PDF its page 1, an EPUB its first picture when that one
   is a tall picture (a cover, not an illustration). A cover the reader removed or chose stays as it is (S.covAuto marks done books).
   Storage: S.covers[id] = 88×116 JPEG data: URL (instant draw, export); IDB «cov:<id>» = the sharp copy (library.js covHiSrc). */

const COV_W=88,COV_H=116,COV_HI_W=420,COV_HI_H=600;
function covLoadImg(blob){return new Promise(function(res,rej){const u=URL.createObjectURL(blob),im=new Image();
  im.onload=function(){res({im:im,u:u});};im.onerror=function(){URL.revokeObjectURL(u);rej(new Error('не удалось прочитать изображение'));};im.src=u;});}
function covCanvasBlob(cv,q){return new Promise(function(res,rej){cv.toBlob(function(b){b?res(b):rej(new Error('не удалось сжать картинку'));},'image/jpeg',q);});}
/* picture → {thumb: data URL 88×116 (cropped like the shelf crops), hi: JPEG blob ≤ 420×600 in its own proportions} */
async function covMake(blob){
  const L=await covLoadImg(blob);
  try{
    const im=L.im,w=im.naturalWidth||300,h=im.naturalHeight||400;
    if(w<8||h<8)throw new Error('картинка слишком маленькая');
    const t=document.createElement('canvas');t.width=COV_W;t.height=COV_H;
    const tc=t.getContext('2d');tc.fillStyle='#fff';tc.fillRect(0,0,COV_W,COV_H);
    const s=Math.max(COV_W/w,COV_H/h);tc.drawImage(im,(COV_W-w*s)/2,(COV_H-h*s)/2,w*s,h*s);
    const k=Math.min(1,COV_HI_W/w,COV_HI_H/h),hw=Math.max(1,Math.round(w*k)),hh=Math.max(1,Math.round(h*k));
    const c=document.createElement('canvas');c.width=hw;c.height=hh;
    const cc=c.getContext('2d');cc.fillStyle='#fff';cc.fillRect(0,0,hw,hh);cc.drawImage(im,0,0,hw,hh);
    return {thumb:t.toDataURL('image/jpeg',0.72),hi:await covCanvasBlob(c,0.85),w:w,h:h};
  }finally{URL.revokeObjectURL(L.u);}
}
function covMayWrite(){return !(window.__rqWriter&&!window.__rqWriter.mayWrite());}
function covRefresh(id){try{renderLibrary();}catch(e){}if(el('bookSheet')&&!el('bookSheet').classList.contains('hidden'))bookInfo(id);}
/* o.quiet: no redraw / toast (import, the start-up pass) */
async function covSetBlob(id,blob,o){
  o=o||{};
  if(!covMayWrite())throw new Error('книга открыта в другом окне');
  const r=await covMake(blob);
  try{await idbPut('cov:'+id,r.hi);}catch(e){console.warn('[rq] cover idb',e);}
  if(COV_HI[id])try{URL.revokeObjectURL(COV_HI[id]);}catch(e){}
  COV_HI[id]=URL.createObjectURL(r.hi);
  S.covers[id]=r.thumb;
  if(S.covAuto)S.covAuto[id]=1;
  save();
  if(!o.quiet){covRefresh(id);flashMsg(o.msg||'Обложка поставлена');}
  return true;
}
function covDrop(id){
  delete S.covers[id];
  if(COV_HI[id])try{URL.revokeObjectURL(COV_HI[id]);}catch(e){}
  delete COV_HI[id];
  idbDel('cov:'+id).catch(function(){});
  if(!S.covAuto)S.covAuto={};S.covAuto[id]=1; /* «Вернуть стандартную» is a choice too: the start-up pass never brings it back */
}
/* page n of an open pdf.js document → JPEG blob ~600 px tall */
async function covPdfPage(doc,n,hpx){
  const pg=await doc.getPage(n),v1=pg.getViewport({scale:1}),sc=Math.min(4,(hpx||COV_HI_H)/v1.height),vp=pg.getViewport({scale:sc});
  const c=document.createElement('canvas');c.width=Math.max(1,Math.floor(vp.width));c.height=Math.max(1,Math.floor(vp.height));
  const cx=c.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,c.width,c.height);
  await pg.render({canvasContext:cx,viewport:vp}).promise;
  try{pg.cleanup();}catch(e){}
  return covCanvasBlob(c,0.85);
}
async function covPdfOpen(id){
  await loadPdfJs();
  const buf=await idbGet('pdf:'+id);if(!buf)throw new Error('файла PDF нет на этом устройстве');
  return window.pdfjsLib.getDocument({data:buf instanceof ArrayBuffer?buf.slice(0):buf}).promise;
}
/* pictures stored for a book on import (IDB «img:<id>:<n>»), in book order */
async function covBookImgs(id,max){
  const out=[];let miss=0;
  for(let i=0;i<80&&out.length<(max||40)&&miss<3;i++){
    let v=null;try{v=await idbGet('img:'+id+':'+i);}catch(e){}
    if(v){miss=0;out.push(v instanceof Blob?v:new Blob([v]));}else miss++;
  }
  return out;
}

/* --- the «Обложка» sheet (over the book card) --- */
const COVS={id:null,seq:0,urls:[],doc:null};
function covSheetEl(){
  let d=el('covSheet');if(d)return d;
  d=document.createElement('div');d.id='covSheet';d.className='sheet hidden';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','covSheetT');
  d.innerHTML='<button class="closes" type="button" id="covSheetClose" aria-label="Закрыть">'+rqIcon('x',22)+'</button><div id="covSheetBody"></div>';
  document.body.appendChild(d);
  el('covSheetClose').onclick=covClose;
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!d.classList.contains('hidden')){e.stopPropagation();covClose();}},true);
  return d;
}
function covFree(){COVS.urls.forEach(function(u){try{URL.revokeObjectURL(u);}catch(e){}});COVS.urls=[];
  if(COVS.doc){try{COVS.doc.destroy();}catch(e){}COVS.doc=null;}}
function covClose(){COVS.seq++;covFree();const d=el('covSheet');if(d)d.classList.add('hidden');}
function covOpen(id,title,inner){
  covFree();COVS.id=id;const d=covSheetEl();
  el('covSheetBody').innerHTML='<h3 id="covSheetT" class="cov-h">'+esc(title)+'</h3>'+inner;
  d.classList.remove('hidden');d.scrollTop=0;
  return ++COVS.seq;
}
function covStatus(t,err){const s=el('covStat');if(!s)return;s.textContent=t||'';s.hidden=!t;s.classList.toggle('err',!!err);}
function covBusy(on){const g=el('covGrid');if(g)g.setAttribute('aria-busy',on?'true':'false');}
function covTile(src,label,i){return '<button type="button" class="cov-tile" data-i="'+i+'"><img src="'+esc(src)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest(\'.cov-tile\').remove()">'+(label?'<span>'+esc(label)+'</span>':'')+'</button>';}

/* «Картинка из книги» / «Страница из PDF» */
async function covFromBook(id){
  const b=allBooks().find(function(x){return x.id===id;});if(!b)return;
  const pdf=b.type==='pdf';
  const seq=covOpen(id,pdf?'Обложка из PDF':'Обложка из книги',
    '<p class="cov-p">'+(pdf?'Нажмите на страницу, которая станет обложкой.':'Нажмите на картинку, которая станет обложкой.')+'</p>'+
    '<div id="covStat" class="cov-stat" role="status">Загружаю…</div><div id="covGrid" class="cov-grid"></div>'+
    (pdf?'':'<div class="cov-alt"><button type="button" class="bk-line" id="covReFile">'+rqIcon('file-text',20)+'<span>Взять обложку из файла книги</span></button>'+
      '<input type="file" id="covReInp" accept=".epub,.fb2,.zip,application/epub+zip" hidden>'+
      '<div class="bk-note">Если книга добавлена раньше 10 ноября, обложки из файла у неё нет: выберите тот же файл ещё раз, книга останется как есть, возьмётся только обложка.</div></div>'));
  if(!pdf){el('covReFile').onclick=function(){el('covReInp').click();};el('covReInp').onchange=function(e){const f=e.target.files[0];e.target.value='';if(f)covFromFile(id,f);};}
  const g=el('covGrid');
  try{
    if(pdf){
      const doc=await covPdfOpen(id);if(seq!==COVS.seq){try{doc.destroy();}catch(e){}return;}
      COVS.doc=doc;const n=Math.min(doc.numPages,8);
      for(let p=1;p<=n;p++){
        const bl=await covPdfPage(doc,p,220);if(seq!==COVS.seq)return;
        const u=URL.createObjectURL(bl);COVS.urls.push(u);g.insertAdjacentHTML('beforeend',covTile(u,'Стр. '+p,p));
        if(p===1)covStatus('');
      }
      g.onclick=async function(e){const t=e.target.closest('.cov-tile');if(!t||!COVS.doc)return;covBusy(true);
        try{const bl=await covPdfPage(COVS.doc,+t.dataset.i);await covSetBlob(id,bl);covClose();}catch(err){covStatus('Не получилось: '+(err&&err.message||err),true);}covBusy(false);};
    }else{
      const ims=await covBookImgs(id,40);if(seq!==COVS.seq)return;
      if(!ims.length){covStatus('В тексте этой книги нет картинок. Возьмите обложку из файла книги или найдите в интернете.');return;}
      covStatus('');
      ims.forEach(function(bl,i){const u=URL.createObjectURL(bl);COVS.urls.push(u);g.insertAdjacentHTML('beforeend',covTile(u,'',i));});
      g.onclick=async function(e){const t=e.target.closest('.cov-tile');if(!t)return;covBusy(true);
        try{await covSetBlob(id,ims[+t.dataset.i]);covClose();}catch(err){covStatus('Не получилось: '+(err&&err.message||err),true);}covBusy(false);};
    }
  }catch(err){if(seq===COVS.seq)covStatus('Не получилось: '+(err&&err.message||err),true);}
}
/* the same EPUB / FB2 picked again: only its cover is taken, the book on the shelf is not touched */
async function covFromFile(id,f){
  covStatus('Ищу обложку в файле…');
  try{
    let r;
    if(/\.epub$/i.test(f.name))r=await parseEpub(f,{images:false});
    else if(/\.(fb2|zip)$/i.test(f.name))r=await parseFb2(/\.zip$/i.test(f.name)?await fb2FromZip(f):f);
    else throw new Error('нужен файл EPUB или FB2');
    if(!r.cover){covStatus('В этом файле обложки нет. Попробуйте найти её в интернете.',true);return;}
    await covSetBlob(id,new Blob([r.cover.data],{type:r.cover.type}));covClose();
  }catch(err){covStatus('Не получилось: '+(err&&err.message||err),true);}
}

/* «Найти в интернете»: Open Library and Google Книги, both free and without a key; the request goes from the phone, only on a tap */
function covQuery(b){return [String(b.title||'').replace(/[_]+/g,' ').replace(/\s+/g,' ').trim(),bookAuthor(b)].filter(Boolean).join(' ');}
function covFetchJson(u,ms){const ac=typeof AbortController==='function'?new AbortController():null,t=setTimeout(function(){if(ac)ac.abort();},ms||12000);
  return fetch(u,ac?{signal:ac.signal}:{}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).finally(function(){clearTimeout(t);});}
async function covSearchOL(q){
  const j=await covFetchJson('https://openlibrary.org/search.json?q='+encodeURIComponent(q)+'&fields=title,author_name,cover_i,first_publish_year&limit=24');
  return (j.docs||[]).filter(function(d){return d.cover_i;}).map(function(d){const u='https://covers.openlibrary.org/b/id/'+d.cover_i;
    return {thumb:u+'-M.jpg',full:u+'-L.jpg',t:d.title||'',a:(d.author_name||[])[0]||'',src:'Open Library'};});
}
async function covSearchGB(q){
  const j=await covFetchJson('https://www.googleapis.com/books/v1/volumes?q='+encodeURIComponent(q)+'&maxResults=24&printType=books');
  return (j.items||[]).map(function(it){const v=it.volumeInfo||{},l=v.imageLinks||{},t=l.thumbnail||l.smallThumbnail;if(!t)return null;
    const th=t.replace(/^http:/,'https:').replace(/&edge=curl/,'');
    return {thumb:th,full:th.replace(/([?&])zoom=\d/,'$1zoom=1')+'&fife=w480-h720',t:v.title||'',a:(v.authors||[])[0]||'',src:'Google Книги'};}).filter(Boolean);
}
function covFromWeb(id){
  const b=allBooks().find(function(x){return x.id===id;});if(!b)return;
  covOpen(id,'Обложка из интернета',
    '<form class="cov-q" id="covQ"><input type="search" id="covQIn" class="searchinp" autocomplete="off" aria-label="Название и автор"><button type="submit" class="cta" id="covQGo">Найти</button></form>'+
    '<div id="covStat" class="cov-stat" role="status" hidden></div><div id="covGrid" class="cov-grid"></div>'+
    '<div class="cov-alt"><a class="bk-line" id="covYa" target="_blank" rel="noopener noreferrer">'+rqIcon('search',20)+'<span>Искать в Яндекс Картинках</span></a>'+
    '<div class="bk-note">Нашли картинку там: сохраните её на телефон и поставьте через «Выбрать картинку с телефона».</div>'+
    '<button type="button" class="bk-line" id="covPhone">'+rqIcon('image',20)+'<span>Выбрать картинку с телефона</span></button></div>');
  const inp=el('covQIn');inp.value=covQuery(b);
  const ya=function(){el('covYa').href='https://yandex.ru/images/search?text='+encodeURIComponent((inp.value.trim()||covQuery(b))+' обложка книги');};ya();inp.oninput=ya;
  el('covPhone').onclick=function(){covClose();pickCover(id);};
  el('covQ').onsubmit=function(e){e.preventDefault();covWebSearch(id);};
  covWebSearch(id);
}
async function covWebSearch(id){
  const q=(el('covQIn')&&el('covQIn').value||'').trim();if(!q)return;
  const seq=++COVS.seq,g=el('covGrid');g.innerHTML='';g.onclick=null;covStatus('Ищу обложки…');covBusy(true);
  const rs=await Promise.allSettled([covSearchGB(q),covSearchOL(q)]);
  if(seq!==COVS.seq)return;covBusy(false);
  const seen={},items=[];
  rs.forEach(function(r){if(r.status==='fulfilled')r.value.forEach(function(x){if(!seen[x.thumb]){seen[x.thumb]=1;items.push(x);}});});
  if(!items.length){
    const off=rs.every(function(r){return r.status==='rejected';});
    if(off)console.warn('[rq] cover search',rs.map(function(r){return r.reason;}));
    covStatus(off?'Не получилось связаться с сервисами обложек. Проверьте интернет или поищите в Яндекс Картинках.':'Ничего не нашлось. Попробуйте только название или только автора.',off);return;
  }
  covStatus('Нажмите на обложку, чтобы поставить её. Найдено: '+items.length+'.');
  g.innerHTML=items.slice(0,36).map(function(x,i){return covTile(x.thumb,x.src,i);}).join('');
  g.onclick=async function(e){const t=e.target.closest('.cov-tile');if(!t)return;const x=items[+t.dataset.i];if(!x)return;
    covBusy(true);covStatus('Ставлю обложку…');
    try{await covSetFromUrl(id,x);covClose();}catch(err){covStatus('Не получилось: '+(err&&err.message||err),true);}
    covBusy(false);};
}
async function covGetBlob(u){const r=await fetch(u,{mode:'cors',referrerPolicy:'no-referrer'});if(!r.ok)throw new Error('HTTP '+r.status);const bl=await r.blob();
  if(!/^image\//.test(bl.type)||bl.size<600)throw new Error('не картинка');return bl;}
/* a web cover: a copy on the phone if the site allows it (works offline), else its address (shown only online) */
async function covSetFromUrl(id,x){
  for(const u of [x.full,x.thumb]){try{const bl=await covGetBlob(u);await covSetBlob(id,bl);return;}catch(e){}}
  if(!covMayWrite())throw new Error('книга открыта в другом окне');
  covDrop(id);S.covers[id]=x.full;save();covRefresh(id);
  flashMsg('Обложка поставлена. Сайт не дал сохранить копию, поэтому она видна, когда есть интернет');
}

/* --- once after start: covers for books added before 10.11 (PDF page 1; EPUB first picture if it is a tall one) --- */
async function covAutoPass(){
  if(!S||!Array.isArray(S.userBooks)||!covMayWrite())return;
  if(!S.covAuto||typeof S.covAuto!=='object')S.covAuto={};
  const todo=S.userBooks.filter(function(b){return b&&b.id&&!S.covers[b.id]&&!S.covAuto[b.id]&&(b.type==='pdf'||/\.epub$/i.test(b.fname||''));});
  let n=0;
  for(const b of todo){
    if(!covMayWrite())return;
    if(R&&R.book&&!el('reader').classList.contains('hidden')){setTimeout(covAutoPass,20000);return;} /* not while reading: next try later */
    try{
      let bl=null;
      if(b.type==='pdf'){const doc=await covPdfOpen(b.id);try{bl=await covPdfPage(doc,1);}finally{try{doc.destroy();}catch(e){}}}
      else{const im=(await covBookImgs(b.id,1))[0];if(im){const L=await covLoadImg(im);const w=L.im.naturalWidth,h=L.im.naturalHeight;URL.revokeObjectURL(L.u);if(w>=160&&h>=w*1.2)bl=im;}}
      if(bl&&!S.covers[b.id]){await covSetBlob(b.id,bl,{quiet:true});n++;}
    }catch(e){console.warn('[rq] cover auto',b.id,e);}
    S.covAuto[b.id]=1;
  }
  if(todo.length)save();
  if(n){try{renderLibrary();}catch(e){}}
}
window.addEventListener('load',function(){setTimeout(function(){covAutoPass().catch(function(e){console.warn('[rq] cover auto',e);});},6000);});
