/* 05.11 (Джессика: «первое, третье, пятое» — список улучшений для сканов и PDF):
   1. «Читать текстом»: PDF или распознанный скан открывается как обычная книга — текст страниц (файла или распознанный, js/ocr.js)
      в порядке чтения (pdfReadOrder) собирается в один текст: абзацы прозы, строки стихов, без номеров строк, страниц и колонтитулов;
      абзац, перенесённый на следующую страницу, склеивается. Свой шрифт, размер, скины и листание — как у любой книги. Закладки PDF —
      главы. Текст хранится в IDB «ptxt:<книга>», флаг книги b.asText; переключение назад — «Как в файле», на ту же страницу.
   3. Сноски в PDF: маленькая цифра или * над концом слова (pdfReadOrder → span.pnote) по тапу показывает текст сноски в окне
      (то же окно, что у книг, js/read-more.js): внизу этой страницы, по ссылке PDF или на следующей странице.
   5. Старая орфография при копировании — js/reader-ui.js rqOrth, переключатель здесь (SET.rm.orth). */

/* ---------- 1: «Читать текстом» ---------- */
const PT_V=1;
/* page texts → one book text: paragraphs apart by a blank line, verse keeps its lines; the page offsets for the way back */
function ptxtCompose(pages){
  let t='',pend=[];const off=[];
  const flush=function(){if(pend.length){t+='\n\n'+pend.join('\n\n');pend=[];}};
  pages.forEach(function(s,n){
    const blocks=String(s||'').split(/\n{2,}/).map(function(b){b=b.trim();if(!b)return '';return rqVerse(b.replace(/\uE000/g,''))?b:b.split('\n').join('\n\n');}).filter(Boolean).join('\n\n').split('\n\n');
    const notes=[],body=[];blocks.forEach(function(b){if(b.charCodeAt(0)===0xE000)notes.push(b.slice(1));else if(b.trim())body.push(b.replace(/\uE000/g,''));}); /* the notes at the foot of a page go after the paragraph they cut */
    if(!body.length){off.push(t.length);pend=pend.concat(notes);return;}
    if(t){
      const goOn=!/[.!?…:;»"”)]$/.test(t)&&/^[«"„(]?[a-zа-яё]/.test(body[0])&&!rqVerse(body[0]);
      if(goOn&&/[a-zа-яё][-‐]$/i.test(t))t=t.replace(/[-‐]$/,''); /* a word hyphenated over the page break */
      else t+=goOn?' ':(pend.length?'':'\n\n');
      if(!goOn&&pend.length){flush();t+='\n\n';}
    }
    off.push(t.length);t+=body[0];flush();
    if(body.length>1)t+='\n\n'+body.slice(1).join('\n\n');
    pend=notes;
  });
  flush();
  return {t:t.replace(/^\n+/,''),off:off};
}
async function ptxtBuild(onp){
  const N=R.pdf.numPages,pages=[],empty=[];let ocrN=0;
  for(let n=0;n<N;n++){
    let f={t:'',ocr:false};try{f=await ocrFileText(n,'book');}catch(e){}
    if(f.ocr)ocrN++;if(!f.t.trim())empty.push(n);
    pages.push(f.t);if(onp)onp(n+1,N);
  }
  const c=ptxtCompose(pages),toc=[];
  ((R.pdfToc||[]).slice().sort(function(a,z){return a.page-z.page;})).forEach(function(x){if(typeof x.page==='number'&&x.page>=0&&x.page<N)toc.push({t:String(x.t||'').slice(0,120),off:c.off[x.page]});});
  return {v:PT_V,t:c.t,off:c.off,toc:toc.length>=2?toc:[],n:N,ocrN:ocrN,empty:empty};
}
/** reader.js openBook: a PDF read as text → a text-book copy of it (R.book), or null (the file is shown) */
async function ptxtLoad(b0){
  let rec=null;try{rec=await idbGet('ptxt:'+b0.id);}catch(e){}
  if(!rec||rec.v!==PT_V||typeof rec.t!=='string'||!rec.t){b0.asText=false;save();return null;}
  return Object.assign({},b0,{type:'ptxt',text:rec.t,toc:rec.toc||[],ptxt:rec});
}
function ptxtBookOf(){return R&&R.book?allBooks().find(function(x){return x.id===R.book.id;}):null;}
let ptxtBusy=false;
async function ptxtToggle(){
  const b0=ptxtBookOf();if(!b0||b0.type!=='pdf'||ptxtBusy)return;
  const id=b0.id,sub=el('ptxtTglS'),sub0=sub?sub.textContent:'';
  ptxtBusy=true;
  try{
    if(R.mode==='pdf'){
      if(!R.pdf)return;
      const p=ocrCurPage();
      const rec=await ptxtBuild(function(k,N){if(sub)sub.textContent='собираю текст: страница '+k+' из '+N;});
      if(!R.book||R.book.id!==id)return;
      if(!rec.t.trim()||rec.empty.length>rec.n*0.5){
        el('sheet').classList.add('hidden');
        flashMsg(rec.n>1?'Это скан: сначала распознайте его — «Распознать всю книгу»':'На странице нет текста: сначала распознайте её','info');
        ocrOpen(p);return;
      }
      await idbPut('ptxt:'+id,rec);
      b0.asText=true;save();
      el('sheet').classList.add('hidden');
      await closeReader({quiet:true});
      S.progress[id]=Object.assign({},S.progress[id],{pos:Math.min(1,rec.off[p]/Math.max(1,rec.t.length))});save();
      await openBook(id);
      flashMsg(rec.empty.length?'Книга открыта текстом. Страниц без текста: '+rec.empty.length:'Книга открыта текстом','info');
    }else if(R.book.type==='ptxt'){
      const rec=R.book.ptxt,at=(R.pageCount>1?R.page/(R.pageCount-1):0)*rec.t.length;let p=0;
      rec.off.forEach(function(o,k){if(o<=at)p=k;});
      b0.asText=false;save();
      el('sheet').classList.add('hidden');
      await closeReader({quiet:true});
      S.progress[id]=Object.assign({},S.progress[id],{pos:rec.n>1?p/(rec.n-1):0});save();
      await openBook(id);
    }
  }finally{ptxtBusy=false;if(sub)sub.textContent=sub0;ptxtRowUpd();}
}
function ptxtRowUpd(){
  const b0=ptxtBookOf(),on=!!(R&&R.book&&R.book.type==='ptxt');
  el('reader').classList.toggle('pdfbook',!!(b0&&b0.type==='pdf'));
  rqSw('ptxtTgl',on);
}
el('ptxtTgl').onclick=ptxtToggle;
{const o0=openBook;openBook=async function(){const r=await o0.apply(this,arguments);ptxtRowUpd();return r;};}
{const s0=openReaderSettings;openReaderSettings=function(){const r=s0.apply(this,arguments);ptxtRowUpd();return r;};}

/* ---------- 3: footnotes in PDF ---------- */
/* the note's text: a line of page n that starts with the mark (the last one on the page: notes are at the bottom), up to the next note */
function pfnPick(t,key){
  const k=key.replace(/\*/g,'\\*'),re=new RegExp('(?:^|\\n)\\s*[\\[(]?'+k+'[\\])]?[.)]?\\s*(\\S[^\\n]*(?:\\n(?!\\s*[\\[(]?(?:\\d{1,3}|\\*{1,3})[\\])]?[.)]?\\s*\\S)[^\\n]+)*)','g');
  let m,last='';while((m=re.exec(t)))last=m[1];
  return last.replace(/\s*\n\s*/g,' ').trim().slice(0,1500);
}
async function pfnFind(sp){
  const key=sp.dataset.fn,n=+sp.dataset.pg;if(!R.pdf||!key||!(n>=0))return '';
  const txt=async function(k){try{return (await ocrFileText(k,true)).t;}catch(e){return '';}};
  let s=pfnPick(await txt(n),key);if(s)return s;
  /* a link from the mark (a PDF made with notes linked) → the page it leads to */
  try{
    const pg=await R.pdf.getPage(n+1),an=await pg.getAnnotations(),pp=(sp.dataset.pp||'').split(',').map(Number);
    for(const a of an){
      if(a.subtype!=='Link'||!a.dest||!a.rect)continue;const r=a.rect;
      if(!(pp[0]>=Math.min(r[0],r[2])-3&&pp[0]<=Math.max(r[0],r[2])+3&&pp[1]>=Math.min(r[1],r[3])-6&&pp[1]<=Math.max(r[1],r[3])+6))continue;
      const d=typeof a.dest==='string'?await R.pdf.getDestination(a.dest):a.dest;if(!d||!d[0])continue;
      const k=typeof d[0]==='object'?await R.pdf.getPageIndex(d[0]):d[0];
      s=pfnPick(await txt(k),key);if(s)return s;
    }
  }catch(e){}
  if(n+1<R.pdf.numPages){s=pfnPick(await txt(n+1),key);if(s)return s;} /* a note carried over to the next page */
  return '';
}
function pfnAt(cx,cy){
  let best=null,bd=Infinity;
  document.querySelectorAll('#pdfText span.pnote,#pdfScroll span.pnote').forEach(function(s){
    const r=s.getBoundingClientRect();if(!r.width&&!r.height)return;
    const dx=Math.max(r.left-cx,0,cx-r.right),dy=Math.max(r.top-cy,0,cy-r.bottom),d=Math.hypot(dx,dy);
    if(d<=14&&d<bd){bd=d;best=s;}});
  return best;
}
{const t0=pdfTap;pdfTap=function(cx,cy){
  if(rqRm().fn&&!(typeof SM!=='undefined'&&SM.on)&&!selText()){
    const sp=pfnAt(cx,cy);
    if(sp){pfnFind(sp).then(function(s){if(s)rmFnShow(sp.dataset.fn,s,cx,cy);else flashMsg('Текст сноски '+sp.dataset.fn+' не нашёлся на этой странице','info');});return;}
  }
  return t0.apply(this,arguments);};}

/* ---------- 5: old spelling in copies ---------- */
function orthRowUpd(){rqSw('orthTgl',rqRm().orth);}
el('orthTgl').onclick=function(){SET.rm=Object.assign({},rqRm(),{orth:!rqRm().orth});rqSaveSetGated();orthRowUpd();
  flashMsg(rqRm().orth?'Старая орфография при копировании станет современной':'Копируется как напечатано','info');};
{const s0=openReaderSettings;openReaderSettings=function(){const r=s0.apply(this,arguments);orthRowUpd();return r;};}
orthRowUpd();
