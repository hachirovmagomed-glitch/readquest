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
const COV_SRC=1000;
async function covSrcBlob(blob){const L=await covLoadImg(blob);
  try{const w=L.im.naturalWidth||300,h=L.im.naturalHeight||400,k=Math.min(1,COV_SRC/Math.max(w,h));
    if(k===1&&/^image\/(jpeg|png|webp)$/.test(blob.type||'')&&blob.size<1.5e6)return blob;
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(L.im,0,0,c.width,c.height);return covCanvasBlob(c,0.88);
  }finally{URL.revokeObjectURL(L.u);}}
/* «Обрезать и сдвинуть» (10.11, улучшение 1). Crop = {x, y, z}: the window's centre as a share of the picture (0…1) and the zoom over
   «fill the 3:4 frame» (1…4). Result: the sharp copy 420×560 and the small one 88×116 cut exactly as the frame showed. */
const COV_AR=3/4;
function covCropRect(w,h,c){ /* the window in picture pixels */
  const z=Math.max(1,Math.min(4,c&&c.z||1)),fw0=Math.min(w,h*COV_AR),ww=fw0/z,wh=ww/COV_AR;
  let cx=(c&&c.x!=null?c.x:0.5)*w,cy=(c&&c.y!=null?c.y:0.5)*h;
  cx=Math.max(ww/2,Math.min(w-ww/2,cx));cy=Math.max(wh/2,Math.min(h-wh/2,cy));
  return {sx:cx-ww/2,sy:cy-wh/2,sw:ww,sh:wh,cx:cx,cy:cy};}
async function covCropApply(id,src,c){
  const L=await covLoadImg(src);
  try{
    const im=L.im,w=im.naturalWidth||300,h=im.naturalHeight||400,r=covCropRect(w,h,c);
    const draw=function(W,H){const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);
      /* the 88×116 copy is a hair taller than 3:4 → cover-fit of the window */
      const k=Math.max(W/r.sw,H/r.sh),dw=r.sw*k,dh=r.sh*k;x.drawImage(im,r.sx,r.sy,r.sw,r.sh,(W-dw)/2,(H-dh)/2,dw,dh);return cv;};
    const hi=await covCanvasBlob(draw(420,560),0.86),th=draw(COV_W,COV_H).toDataURL('image/jpeg',0.72);
    try{await idbPut('cov:'+id,hi);}catch(e){}
    if(COV_HI[id])try{URL.revokeObjectURL(COV_HI[id]);}catch(e){}
    COV_HI[id]=URL.createObjectURL(hi);S.covers[id]=th;
    if(!S.covCrop)S.covCrop={};S.covCrop[id]={x:+(r.cx/w).toFixed(4),y:+(r.cy/h).toFixed(4),z:+Math.max(1,Math.min(4,c&&c.z||1)).toFixed(3)};
    save();covRefresh(id);
  }finally{URL.revokeObjectURL(L.u);}
}
async function covCropOpen(id){
  const b=allBooks().find(function(x){return x.id===id;});if(!b)return;
  let src=null;try{src=await idbGet('covsrc:'+id)||await idbGet('cov:'+id);}catch(e){}
  if(!(src instanceof Blob)){if(S.covers[id]&&S.covers[id].indexOf('data:')===0)src=await (await fetch(S.covers[id])).blob();else{flashMsg('Сначала поставьте обложку');return;}}
  covOpen(id,'Обрезать и сдвинуть',
    '<p class="cov-p">Двигайте картинку пальцем, двумя пальцами или ползунком меняйте размер.</p>'+
    '<div class="cov-crop" id="covCrop"><img id="covCropImg" alt="" draggable="false"></div>'+
    '<label class="cov-zoom">'+rqIcon('zoom-in',20)+'<input type="range" id="covZoom" min="1" max="4" step="0.01" value="1" aria-label="Размер"></label>'+
    '<div class="cov-btns"><button type="button" class="ghostbtn" id="covCropReset">Как было</button><button type="button" class="cta" id="covCropOk">Готово</button></div>'+
    '<div id="covStat" class="cov-stat" role="status" hidden></div>');
  const u=URL.createObjectURL(src);COVS.urls.push(u);
  const fr=el('covCrop'),img=el('covCropImg'),zm=el('covZoom');
  img.src=u;try{await img.decode();}catch(e){covStatus('Не удалось прочитать картинку',true);return;}
  const w=img.naturalWidth,h=img.naturalHeight,saved=(S.covCrop||{})[id];
  const st={x:saved?saved.x:0.5,y:saved?saved.y:0.5,z:saved?saved.z:1};
  const paint=function(){const FW=fr.clientWidth,r=covCropRect(w,h,st),k=FW/r.sw;st.x=r.cx/w;st.y=r.cy/h;
    img.style.width=(w*k)+'px';img.style.height=(h*k)+'px';img.style.transform='translate('+(-r.sx*k)+'px,'+(-r.sy*k)+'px)';zm.value=st.z;};
  paint();
  const P=new Map();let pinch=null;
  const scale=function(){return fr.clientWidth/covCropRect(w,h,st).sw;};
  fr.addEventListener('pointerdown',function(e){fr.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(P.size===2){const a=[...P.values()];pinch={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),z:st.z};}e.preventDefault();});
  fr.addEventListener('pointermove',function(e){const p=P.get(e.pointerId);if(!p)return;
    if(P.size===2&&pinch){P.set(e.pointerId,{x:e.clientX,y:e.clientY});const a=[...P.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
      st.z=Math.max(1,Math.min(4,pinch.z*d/(pinch.d||1)));paint();return;}
    const k=scale();st.x-=(e.clientX-p.x)/k/w;st.y-=(e.clientY-p.y)/k/h;P.set(e.pointerId,{x:e.clientX,y:e.clientY});paint();});
  const up=function(e){P.delete(e.pointerId);if(P.size<2)pinch=null;};
  fr.addEventListener('pointerup',up);fr.addEventListener('pointercancel',up);
  fr.addEventListener('wheel',function(e){e.preventDefault();st.z=Math.max(1,Math.min(4,st.z*(e.deltaY<0?1.08:1/1.08)));paint();},{passive:false});
  zm.oninput=function(){st.z=+zm.value;paint();};
  el('covCropReset').onclick=function(){st.x=0.5;st.y=0.5;st.z=1;paint();};
  el('covCropOk').onclick=async function(){this.disabled=true;try{await covCropApply(id,src,st);covClose();flashMsg('Обложка обрезана');}catch(err){covStatus('Не получилось: '+(err&&err.message||err),true);this.disabled=false;}};
}
function covMayWrite(){return !(window.__rqWriter&&!window.__rqWriter.mayWrite());}
function covRefresh(id){try{renderLibrary();}catch(e){}if(el('bookSheet')&&!el('bookSheet').classList.contains('hidden'))bookInfo(id);}
/* o.quiet: no redraw / toast (import, the start-up pass) */
async function covSetBlob(id,blob,o){
  o=o||{};
  if(!covMayWrite())throw new Error('книга открыта в другом окне');
  const r=await covMake(blob);
  try{await idbPut('cov:'+id,r.hi);}catch(e){console.warn('[rq] cover idb',e);}
  /* 10.11 (улучшение 1): the picture itself (≤ 1000 px) stays as «covsrc:<id>», so «Обрезать и сдвинуть» can be redone any time */
  try{await idbPut('covsrc:'+id,await covSrcBlob(blob));}catch(e){console.warn('[rq] cover src',e);}
  if(S.covCrop)delete S.covCrop[id];
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
  idbDel('covsrc:'+id).catch(function(){});
  if(S.covCrop)delete S.covCrop[id];
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
        try{const bl=await covPdfPage(COVS.doc,+t.dataset.i);await covSetBlob(id,bl);covCropOpen(id);}catch(err){covStatus('Не получилось: '+(err&&err.message||err),true);}covBusy(false);};
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
/* 10.11 (улучшение 3): Википедия — у неё есть обложки и первые издания русских книг (картинка статьи), и она открыта без ключа
   (origin=* → CORS; картинки upload.wikimedia.org копируются на телефон). Русский запрос — ru.wikipedia первой. */
async function covSearchWiki(q,lang){
  const j=await covFetchJson('https://'+lang+'.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=0&gsrlimit=12&gsrsearch='+
    encodeURIComponent(q)+'&prop=pageimages&piprop=thumbnail&pithumbsize=480&pilicense=any');
  const pg=Object.values((j.query&&j.query.pages)||{}).sort(function(a,b){return (a.index||0)-(b.index||0);});
  return pg.filter(function(p){const t=p.thumbnail&&p.thumbnail.source;return t&&!/\.svg/i.test(t)&&!/(flag|logo|signature|подпись|герб)/i.test(t);})
    .map(function(p){const t=p.thumbnail.source;return {thumb:t,full:t,t:p.title||'',a:'',src:'Википедия'};}); /* the 480 px thumbnail is sharp enough for 420×600 */
}
function covIsRu(q){return /[а-яё]/i.test(q);}
async function covSearchAll(q){
  const ru=covIsRu(q),jobs=ru?[covSearchWiki(q,'ru'),covSearchGB(q),covSearchOL(q)]:[covSearchGB(q),covSearchOL(q),covSearchWiki(q,'en')];
  const rs=await Promise.allSettled(jobs),seen={},items=[];
  rs.forEach(function(r){if(r.status==='fulfilled')r.value.forEach(function(x){if(!seen[x.thumb]){seen[x.thumb]=1;items.push(x);}});});
  return {items:items,off:rs.every(function(r){return r.status==='rejected';}),errs:rs.map(function(r){return r.reason;})};
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
  const inp=el('covQIn');let q=(inp&&inp.value||'').trim();if(!q)return;
  const seq=++COVS.seq,g=el('covGrid');g.innerHTML='';g.onclick=null;covStatus('Ищу обложки…');covBusy(true);
  let r=await covSearchAll(q);
  /* nothing for «название автор» → once more with the title alone (Russian books are often listed without the author's first name) */
  const b=allBooks().find(function(x){return x.id===id;}),t=b?String(b.title||'').trim():'';
  if(!r.items.length&&!r.off&&t&&t!==q&&seq===COVS.seq){q=t;if(inp)inp.value=t;r=await covSearchAll(t);}
  if(seq!==COVS.seq)return;covBusy(false);
  const items=r.items;
  if(!items.length){
    if(r.off)console.warn('[rq] cover search',r.errs);
    covStatus(r.off?'Не получилось связаться с сервисами обложек. Проверьте интернет или поищите в Яндекс Картинках.':'Ничего не нашлось. Попробуйте только название или только автора.',r.off);return;
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
async function covSetFromUrl(id,x,o){
  o=o||{};
  for(const u of [x.full,x.thumb]){try{const bl=await covGetBlob(u);await covSetBlob(id,bl,o);return;}catch(e){}}
  if(!covMayWrite())throw new Error('книга открыта в другом окне');
  covDrop(id);S.covers[id]=x.full;save();
  if(!o.quiet){covRefresh(id);flashMsg('Обложка поставлена. Сайт не дал сохранить копию, поэтому она видна, когда есть интернет');}
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

/* --- 10.11 (улучшение 4): «Подобрать обложки» в меню библиотеки (⋮) — все свои книги без обложки за один раз.
   PDF → страница 1; EPUB / FB2 → первая высокая картинка книги; остальные → поиск в интернете, ставится только находка,
   чьё название совпадает с названием книги (иначе книга остаётся как есть и попадает в список «не нашлось»). --- */
function covNorm(t){return String(t||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();}
function covTitleOk(book,found){const a=covNorm(book),b=covNorm(found);if(!a||!b)return false;
  return a===b||(a.length>=4&&b.length>=4&&(b.indexOf(a)===0||a.indexOf(b)===0));}
async function covTallImg(id){const im=(await covBookImgs(id,1))[0];if(!im)return null;const L=await covLoadImg(im);const w=L.im.naturalWidth,h=L.im.naturalHeight;URL.revokeObjectURL(L.u);return w>=160&&h>=w*1.2?im:null;}
async function covAll(){
  const list=(S.userBooks||[]).filter(function(b){return b&&b.id&&!S.covers[b.id];});
  const seq=covOpen(null,'Подобрать обложки','<div id="covStat" class="cov-stat" role="status"></div><div id="covAllList" class="cov-all"></div>'+
    '<div class="cov-btns"><button type="button" class="cta" id="covAllStop">Остановить</button></div>');
  const stop=el('covAllStop');stop.onclick=function(){covClose();};
  if(!list.length){covStatus('У всех ваших книг уже есть обложки.');stop.textContent='Закрыть';return;}
  if(!covMayWrite()){covStatus('Книга открыта в другом окне.',true);return;}
  let n=0;const miss=[];
  for(let i=0;i<list.length;i++){
    if(seq!==COVS.seq)break;
    const b=list[i];covStatus('Подбираю: '+(i+1)+' из '+list.length+' · «'+b.title+'»');
    let ok=false;
    try{
      if(b.type==='pdf'){const doc=await covPdfOpen(b.id);let bl;try{bl=await covPdfPage(doc,1);}finally{try{doc.destroy();}catch(e){}}if(bl){await covSetBlob(b.id,bl,{quiet:true});ok=true;}}
      else{const im=await covTallImg(b.id);if(im){await covSetBlob(b.id,im,{quiet:true});ok=true;}}
      if(!ok&&navigator.onLine!==false){
        const r=await covSearchAll(covQuery(b));let x=r.items.find(function(it){return covTitleOk(b.title,it.t);});
        if(!x&&bookAuthor(b)){const r2=await covSearchAll(String(b.title||''));x=r2.items.find(function(it){return covTitleOk(b.title,it.t);});}
        if(x&&seq===COVS.seq){await covSetFromUrl(b.id,x,{quiet:true});ok=true;}
      }
    }catch(e){console.warn('[rq] cover all',b.id,e);}
    if(ok)n++;else miss.push(b.title);
    if(S.covAuto)S.covAuto[b.id]=1;
  }
  save();try{renderLibrary();}catch(e){}
  if(seq!==COVS.seq){flashMsg('Обложки поставлены: '+n);return;}
  covStatus('Готово. Поставлено обложек: '+n+' из '+list.length+'.');
  if(miss.length)el('covAllList').innerHTML='<div class="bk-note">Не нашлось ('+miss.length+'), для них откройте ⓘ книги → «Найти в интернете» или «Выбрать картинку с телефона»:</div><ul>'+miss.slice(0,40).map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul>';
  stop.textContent='Закрыть';
}
