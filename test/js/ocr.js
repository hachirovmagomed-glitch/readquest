/* --- «Текст страницы»: распознавание сканов (28.10, Джессика: «чтобы система более умно сканировала текст»; выбор «Офлайн + „Через ИИ“») ---
   У скана PDF текста может не быть вовсе (только картинки страниц) или он распознан с ошибками. Здесь страница распознаётся
   ЗАНОВО по картинке:
   • на телефоне, без интернета — Tesseract (tesseract.js 7, Apache-2.0: API и воркер в vendor/tesseract, движок wasm и языки rus+eng
     лежат один раз на весь сайт в main /ocr/, tools/gen-ocr-pack.py). Пакет (~10 МБ: один вариант движка под этот телефон + 2 языка)
     скачивается по кнопке в Cache Storage RQ_NS+'_ocr' (смена сборки его не стирает). Слова с их местами сохраняются в IDB «ocr:<книга>»
     ({p: {<стр.>: {w, items:[{s,x,b,h,w}]}}} в пунктах PDF), и текстовый слой этой страницы строится из них (js/pdf.js pdfTextLayer):
     текст выделяется, копируется, цитируется и ищется как обычный, в порядке чтения (pdfReadOrder).
   • «Через ИИ» — картинка страницы уходит в сервис ИИ человека по его ключу (content.js aiViaKey); ответ — только текст в окне.
   Окно «Текст страницы» показывает весь текст страницы (из файла или распознанный) с «Копировать». Ни опыта, ни монет, в S ничего. */
const OCR_CACHE=(window.RQ_NS||'rq')+'_ocr';
const OCR_BASE=window.RQ_OCR_BASE||new URL((window.RQ_NS==='rqt'?'../':'./')+'ocr/',location.href).href;
const OCR_MEM={}; /* book id → {p:{…}} */
let ocrReg=null,ocrWk=null,ocrSeq=0,ocrCur=null,ocrDl=null,ocrProg=null;
async function ocrRegistry(){
  if(ocrReg)return ocrReg;
  const c=await caches.open(OCR_CACHE);const u=OCR_BASE+'index.json';
  let r=null;try{r=await fetch(u,{cache:'no-cache'});if(!r.ok)r=null;}catch(e){}
  if(r){try{await c.put(u,r.clone());}catch(e){}}else r=await c.match(u);
  if(!r)throw new Error('нет связи');
  ocrReg=await r.json();return ocrReg;
}
/* какой движок пойдёт на этом телефоне (как wasm-feature-detect в tesseract.js): relaxed SIMD → SIMD → обычный */
function ocrVariant(reg){
  const ok=function(b){try{return WebAssembly.validate(new Uint8Array(b));}catch(e){return false;}};
  if(reg.core.relaxedsimd&&ok([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,15,1,13,0,65,1,253,15,65,2,253,15,253,128,2,11]))return 'relaxedsimd';
  if(reg.core.simd&&ok([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]))return 'simd';
  return 'plain';
}
function ocrFiles(reg){return [reg.core[ocrVariant(reg)],reg.langs.rus,reg.langs.eng];}
async function ocrState(){ /* {have, mb} */
  const reg=await ocrRegistry(),c=await caches.open(OCR_CACHE);let need=0;
  for(const f of ocrFiles(reg))if(!await c.match(OCR_BASE+f.name))need+=f.size||0;
  return {have:!need,mb:Math.max(1,Math.round(need/1048576))};
}
async function ocrDownload(onp,signal){
  const reg=await ocrRegistry(),c=await caches.open(OCR_CACHE),jobs=[];
  for(const f of ocrFiles(reg))if(!await c.match(OCR_BASE+f.name))jobs.push(f);
  const total=jobs.reduce(function(a,f){return a+(f.size||1);},0)||1;let done=0;
  for(const f of jobs){
    const r=await fetch(OCR_BASE+f.name,{cache:'no-cache',signal});
    if(!r.ok)throw new Error('сервер ответил '+r.status);
    const rd=r.body.getReader(),parts=[];let got=0;
    for(;;){const x=await rd.read();if(x.done)break;parts.push(x.value);got+=x.value.length;onp(Math.min(1,(done+Math.min(got,f.size||got))/total));}
    const blob=new Blob(parts);
    if(f.sha256&&typeof trSha==='function'&&await trSha(await blob.arrayBuffer())!==f.sha256)throw new Error('файл пришёл с ошибкой, попробуйте ещё раз');
    await c.put(OCR_BASE+f.name,new Response(blob,{headers:{'Content-Type':/\.js$/.test(f.name)?'text/javascript':'application/octet-stream'}}));
    done+=f.size||got;onp(Math.min(1,done/total));
  }
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
}
function ocrLoadScript(src){return new Promise(function(ok,no){if(window.Tesseract)return ok();const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=function(){no(new Error('не загрузился модуль распознавания'));};document.head.appendChild(s);});}
/* движок: воркер с нашего сайта (vendor/tesseract, в precache), движок и языки — из кэша пакета (blob, без сети: /ocr/ вне области SW /test/) */
async function ocrWorker(){
  if(ocrWk)return ocrWk;
  ocrWk=(async function(){
    await ocrLoadScript(new URL('vendor/tesseract/tesseract.min.js',document.baseURI).href);
    const reg=await ocrRegistry(),c=await caches.open(OCR_CACHE),fs=ocrFiles(reg),rs=[];
    for(const f of fs){const r=await c.match(OCR_BASE+f.name);if(!r)throw new Error('пакет не скачан');rs.push(r);}
    const blob=async function(r,t){return URL.createObjectURL(new Blob([await r.arrayBuffer()],{type:t}));};
    const core=await blob(rs[0],'text/javascript'),fake='https://rq-ocr.invalid',map={};
    map[fake+'/rus.traineddata.gz']=await blob(rs[1],'application/octet-stream');map[fake+'/eng.traineddata.gz']=await blob(rs[2],'application/octet-stream');
    /* the languages come from the cache through the worker's own fetch (tesseract.js 7 cannot take them as bytes: its init joins l.data) */
    const wsrc='const M='+JSON.stringify(map)+',F=self.fetch.bind(self);self.fetch=function(u,o){const k=String(u&&u.url||u);return F(M[k]||u,o);};importScripts('+JSON.stringify(new URL('vendor/tesseract/worker.min.js',document.baseURI).href)+');';
    return await Tesseract.createWorker(['rus','eng'],1,{workerPath:URL.createObjectURL(new Blob([wsrc],{type:'text/javascript'})),corePath:core+'#tesseract-core.wasm.js',
      langPath:fake,workerBlobURL:false,cacheMethod:'none',logger:function(m){if(ocrProg&&m&&m.status==='recognizing text')ocrProg(m.progress||0);}});
  })();
  ocrWk.catch(function(){ocrWk=null;});
  return ocrWk;
}
/* картинка страницы n (0…) для распознавания: ~2200 px по ширине (≈ 300 dpi для книжной страницы), без «шрифта читалки» */
async function ocrPageCanvas(n,maxW){
  const pg=await R.pdf.getPage(n+1),v1=pg.getViewport({scale:1}),sc=Math.max(1,Math.min(4,(maxW||2200)/v1.width)),vp=pg.getViewport({scale:sc});
  const cv=document.createElement('canvas');cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
  const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);
  await pg.render({canvasContext:cx,viewport:vp}).promise;
  return {cv:cv,sc:sc,w:v1.width,h:v1.height};
}
/* tesseract → слова в пунктах PDF: x слева, b базовая линия строки под словом, h кегль (высота строки tesseract), w ширина */
function ocrItems(data,sc){
  const out=[];
  (data.blocks||[]).forEach(function(bl){(bl.paragraphs||[]).forEach(function(pa){(pa.lines||[]).forEach(function(ln){
    const bs=ln.baseline||{},lb=ln.bbox||{};
    const at=function(x){return bs.x1>bs.x0?bs.y0+(bs.y1-bs.y0)*(x-bs.x0)/(bs.x1-bs.x0):(bs.y0!=null?bs.y0:lb.y1);};
    (ln.words||[]).forEach(function(w){const t=String(w.text||'').trim(),b=w.bbox;if(!t||!b||(w.confidence!=null&&w.confidence<20&&!/[\wА-Яа-яЁё]/.test(t)))return;
      const base=at((b.x0+b.x1)/2),ra=ln.rowAttributes||{},h=Math.max(4,ra.rowHeight>0?ra.rowHeight:(base-Math.min(lb.y0,b.y0))/0.75); /* rowHeight ≈ the type size */
      out.push({s:t,x:+(b.x0/sc).toFixed(2),b:+(base/sc).toFixed(2),h:+(h/sc).toFixed(2),w:+((b.x1-b.x0)/sc).toFixed(2)});});
  });});});
  return out;
}
async function ocrBook(id){
  if(OCR_MEM[id])return OCR_MEM[id];
  let v=null;try{v=typeof idbGet==='function'?await idbGet('ocr:'+id):null;}catch(e){}
  return (OCR_MEM[id]=v&&v.p?v:{p:{}});
}
/** js/pdf.js, book-find.js: the recognised words of page n of the open book, or null */
async function ocrPage(n){if(!R||!R.book||R.mode!=='pdf')return null;const b=await ocrBook(R.book.id);return b.p[n]||null;}
async function ocrSave(id,n,rec){const b=await ocrBook(id);b.p[n]=rec;try{await idbPut('ocr:'+id,b);}catch(e){console.warn('[rq] ocr save',e);}}
/* весь текст страницы по словам (файла или распознанным) в порядке чтения, как копия выделения */
function ocrPlain(g,W,H){
  const O=pdfReadOrder(g,W,H);let s='';
  O.seq.forEach(function(e){const j=e.j;if(j==='w'||j==='s')s+=' ';else if(j==='t')s+='\t';else if(j==='y')s=s.replace(/[-\u2010\u00AD]\s*$/,'');else if(j==='h')s+='\n';else if(j==='p')s+='\n\n';if(!e.nc)s+=g[e.i].str;}); /* a line number carries its line's break */
  return rqPlainFix(s,true);
}
async function ocrFileText(n){
  const pg=await R.pdf.getPage(n+1),vp=pg.getViewport({scale:1}),U=pdfjsLib.Util;
  const oc=await ocrPage(n);if(oc)return {t:ocrPlain(oc.items.map(function(q){return {str:q.s,x:q.x,base:q.b,fh:q.h,w:q.w};}),vp.width,vp.height),ocr:true};
  const tc=await pg.getTextContent(),g=[];
  tc.items.forEach(function(it){if(!it.str)return;const t=U.transform(vp.transform,it.transform);g.push({str:it.str,x:t[4],base:t[5],fh:Math.hypot(t[2],t[3])||12,w:it.width||0,rot:Math.abs(Math.atan2(t[1],t[0]))>0.01});});
  return {t:ocrPlain(g,vp.width,vp.height),ocr:false};
}
function ocrCurPage(){return PS&&PS.on?R.page:(P&&P.shown>=0?P.shown:R.page);}

/* ---------- окно «Текст страницы» ---------- */
function ocrRender(q,state,x){
  if(ocrCur!==q)return;
  el('ocrHT').textContent=state==='all'?'Распознавание книги':'Текст страницы '+(typeof pdfLabel==='function'?pdfLabel(q.n):q.n+1);
  const aiB=typeof aiOn==='function'&&aiOn()?'<button type="button" class="ghostbtn" id="ocrAi">'+rqIcon('sparkles',16)+' Через ИИ</button>':'';
  const big=state==='file'&&x&&!x.t,lab=x&&x.ocr?'Распознать заново':state==='file'&&!big?'Распознать по картинке':'Распознать на телефоне';
  const allB=OA&&OA.bid===q.bid?'':R&&R.pdf&&R.pdf.numPages>1&&!(x&&x.ai)?'<button type="button" class="ghostbtn" id="ocrAll">'+rqIcon('book-open',16)+' Распознать всю книгу</button>':'';
  const reB='<button type="button" class="'+(big?'btn tr-dl':'ghostbtn')+'" id="ocrGo">'+rqIcon('scan-text',big?18:16)+' '+lab+'</button>';
  let h='';
  if(state==='need')h='<div class="tr-need">'+rqIcon('download',22)+'<div><b>Пакет распознавания</b><span>'+x.mb+' МБ, скачивается один раз. Дальше страницы распознаются прямо на телефоне, без интернета.</span></div></div>'+
    '<button type="button" class="btn tr-dl" id="ocrDlB">'+rqIcon('download',18)+' Скачать '+x.mb+' МБ</button><div class="tr-alt">'+aiB+'</div>';
  else if(state==='dl')h='<div class="tr-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(x*100)+'"><i style="width:'+Math.round(x*100)+'%"></i></div>'+
    '<div class="ai-a ai-wait" role="status">Скачиваю пакет… '+Math.round(x*100)+'%</div><button type="button" class="ghostbtn" id="ocrDlStop">Отменить</button>';
  else if(state==='wait')h='<div class="tr-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round((x||0)*100)+'"><i style="width:'+Math.round((x||0)*100)+'%"></i></div><div class="ai-a ai-wait" role="status">Распознаю страницу…'+(x?' '+Math.round(x*100)+'%':'')+'</div>';
  else if(state==='all')h='<div class="tr-prog" role="progressbar" aria-valuemin="0" aria-valuemax="'+x.total+'" aria-valuenow="'+x.done+'"><i style="width:'+Math.round(x.done/Math.max(1,x.total)*100)+'%"></i></div>'+
    '<div class="ai-a ai-wait" role="status">Распознаю книгу: страница '+Math.min(x.total,x.done+1)+' из '+x.total+(x.left?', осталось около '+x.left:'')+'</div>'+
    '<div class="ai-note">Можно закрыть окно и читать дальше: распознавание идёт само. Готовые страницы сразу выделяются, копируются и ищутся. Если закрыть книгу, распознавание остановится, а при следующем запуске продолжится с того же места.</div>'+
    '<div class="tr-alt"><button type="button" class="ghostbtn" id="ocrAllStop">'+rqIcon('x',16)+' Остановить</button></div>';
  else if(state==='aiwait')h='<div class="ai-a ai-wait" role="status">ИИ читает страницу…</div>';
  else if(state==='err')h='<div class="ai-a" role="alert">'+esc(x)+'</div><div class="tr-alt">'+reB+allB+aiB+'</div>';
  else{
    const empty=!x.t;
    h=(empty?'<div class="ai-a">'+(x.ai?'ИИ не нашёл текста на странице.':x.ocr?'На странице не нашлось текста.':'В файле у этой страницы нет текста, только картинка. Распознайте её — текст станет выделяться и копироваться.')+'</div>':
      '<div class="ocr-out" id="ocrOut" lang="ru">'+esc(x.t)+'</div><div class="tr-acts"><button type="button" class="ghostbtn" id="ocrCopy">'+rqIcon('copy',16)+' Копировать всё</button></div>')+
      '<div class="ai-note">'+(x.ai?'Распознано ИИ, может ошибаться. На странице текст не выделяется: скопируйте его отсюда.':x.ocr?'Распознано на телефоне, без интернета. Текст на странице теперь выделяется и копируется.':empty?'':'Текст из файла.')+'</div>'+
      '<div class="tr-alt">'+(x.ai?'':reB)+allB+aiB+'</div>';
  }
  el('ocrBody').innerHTML=h;
  if(el('ocrDlB'))el('ocrDlB').onclick=function(){ocrGet(q);};
  if(el('ocrDlStop'))el('ocrDlStop').onclick=function(){if(ocrDl)ocrDl.abort();};
  if(el('ocrGo'))el('ocrGo').onclick=function(){ocrStart(q);};
  if(el('ocrAll'))el('ocrAll').onclick=function(){q.all=true;ocrStart(q);};
  if(el('ocrAllStop'))el('ocrAllStop').onclick=function(){if(OA)OA.stop=true;};
  if(el('ocrAi'))el('ocrAi').onclick=function(){ocrViaAi(q);};
  if(el('ocrCopy'))el('ocrCopy').onclick=function(){copyText(x.t);flashMsg('Текст страницы скопирован');};
}
async function ocrOpen(n,run){
  if(!R||!R.pdf)return;
  const q={n:n,bid:R.book.id};ocrCur=q;const my=++ocrSeq;
  el('ocrSheet').classList.remove('hidden');ocrChipUpd();
  if(OA&&OA.bid===q.bid){ocrRender(q,'all',OA);return;}
  ocrRender(q,'wait',0);
  let f={t:'',ocr:false};try{f=await ocrFileText(n);}catch(e){}
  if(my!==ocrSeq)return;
  if(run&&!f.t){ocrStart(q);return;}
  ocrRender(q,f.ocr?'ok':'file',f);
}
async function ocrStart(q){
  const my=++ocrSeq;ocrRender(q,'wait',0);
  let st;
  try{st=await ocrState();}catch(e){if(my===ocrSeq)ocrRender(q,'err',navigator.onLine===false?'Пакет распознавания ещё не скачан, а интернета нет. Подключитесь к сети, чтобы скачать его один раз.':'Не получилось узнать о пакете: '+(e&&e.message||'ошибка')+'.');return;}
  if(my!==ocrSeq)return;
  if(!st.have){ocrRender(q,'need',st);return;}
  if(q.all)ocrAll(q);else ocrRun(q,my);
}
async function ocrRun(q,my){
  ocrRender(q,'wait',0);
  let last=0;ocrProg=function(p){if(my===ocrSeq&&p-last>=0.05){last=p;ocrRender(q,'wait',p);}};
  try{
    const w=await ocrWorker();
    if(!R||!R.book||R.book.id!==q.bid)return;
    const pc=await ocrPageCanvas(q.n);
    const r=await Promise.race([w.recognize(pc.cv,{},{blocks:true,text:true}),new Promise(function(a,b){setTimeout(function(){b(new Error('распознавание не уложилось в 2 минуты'));},120000);})]);
    const rec={w:pc.w,items:ocrItems(r.data||{},pc.sc)};
    await ocrSave(q.bid,q.n,rec);
    try{if(typeof BF!=='undefined'&&BF.pdfTxt)BF.pdfTxt[q.n]=null;}catch(e){} /* book search reads the page again */
    ocrProg=null;
    if(R&&R.book&&R.book.id===q.bid&&typeof pdfRestyle==='function')pdfRestyle(); /* the page's text layer from the recognised words */
    const t=ocrPlain(rec.items.map(function(x){return {str:x.s,x:x.x,base:x.b,fh:x.h,w:x.w};}),pc.w,pc.h);
    if(my===ocrSeq)ocrRender(q,'ok',{t:t,ocr:true});
    ocrChipUpd();
  }catch(e){ocrProg=null;if(my===ocrSeq)ocrRender(q,'err','Не получилось распознать'+(e&&e.message?': '+e.message:'')+'.');}
}
async function ocrGet(q){
  if(navigator.onLine===false){ocrRender(q,'err','Нужен интернет, чтобы скачать пакет.');return;}
  const my=++ocrSeq;ocrDl=typeof AbortController==='function'?new AbortController():null;
  ocrRender(q,'dl',0);let last=0;
  try{await ocrDownload(function(p){if(my===ocrSeq&&(p-last>=0.01||p===1)){last=p;ocrRender(q,'dl',p);}},ocrDl&&ocrDl.signal);}
  catch(e){ocrDl=null;if(my===ocrSeq)ocrRender(q,'err',e&&e.name==='AbortError'?'Скачивание отменено.':'Пакет не скачался: '+(e&&e.message||'ошибка')+'.');return;}
  ocrDl=null;
  if(my===ocrSeq){if(q.all)ocrAll(q);else ocrRun(q,my);}
}
/* 28.10 «Распознать всю книгу»: страницы без текста по очереди, в фоне (окно можно закрыть и читать); готовые сохраняются сразу,
   так что остановка или закрытие книги ничего не теряют, а следующий запуск пропускает уже распознанное */
let OA=null;
async function ocrPageNeeds(n){
  if(await ocrPage(n))return false;
  const tc=await (await R.pdf.getPage(n+1)).getTextContent();
  return !tc.items.some(function(it){return /\S/.test(it.str||'');});
}
async function ocrAll(q){
  if(OA)return;
  const bid=q.bid,N=R.pdf.numPages,a=OA={bid:bid,done:0,total:N,left:'',stop:false};
  const same=function(){return R&&R.book&&R.book.id===bid&&R.pdf;};
  const show=function(){if(ocrCur&&ocrCur.bid===bid&&!el('ocrSheet').classList.contains('hidden'))ocrRender(ocrCur,'all',a);ocrChipUpd();};
  show();
  let made=0,err=null;const t0=Date.now();
  try{
    const w=await ocrWorker();
    for(let n=0;n<N;n++){
      if(a.stop||!same())break;
      a.done=n;show();
      if(!(await ocrPageNeeds(n)))continue;
      const pc=await ocrPageCanvas(n);
      const r=await w.recognize(pc.cv,{},{blocks:true,text:true});
      if(!same())break;
      await ocrSave(bid,n,{w:pc.w,items:ocrItems(r.data||{},pc.sc)});made++;
      try{if(typeof BF!=='undefined'&&BF.pdfTxt)BF.pdfTxt[n]=null;}catch(e){}
      const m=Math.round((Date.now()-t0)/made*(N-n-1)/60000);a.left=m<1?'минуты':m+' мин';
      if(typeof pdfRestyle==='function'&&(PS&&PS.on?Math.abs(n-ocrCurPage())<=2:n===ocrCurPage()))pdfRestyle(); /* the page on screen gets its text now */
    }
  }catch(e){err=e;}
  if(!err&&!a.stop&&same())a.done=N;
  OA=null;ocrChipUpd();
  const done=!a.stop&&!err&&same();
  if(ocrCur&&ocrCur.bid===bid&&!el('ocrSheet').classList.contains('hidden')){
    if(err)ocrRender(ocrCur,'err','Не получилось распознать'+(err.message?': '+err.message:'')+'. Готовые страницы сохранены.');else{ocrCur.all=false;ocrOpen(ocrCur.n);}
  }
  if(done)flashMsg(made?'Книга распознана: '+made+' стр.':Object.keys((await ocrBook(bid)).p).length?'Книга уже распознана':'В книге нет страниц без текста');
  else if(a.stop)flashMsg('Распознавание остановлено. Готовые страницы сохранены.');
}
const OCR_AI_SYS='Ты переписываешь текст со скана страницы книги. Перепиши весь текст страницы точно, как напечатано, ничего не добавляя от себя и не исправляя. Если колонок несколько, сначала вся левая колонка, потом правая. Строки стихов — каждая с новой строки, между строфами пустая строка; абзацы прозы — одной строкой каждый. Не пиши номера строк на полях, номер страницы и колонтитулы. Ответь только текстом страницы.';
async function ocrViaAi(q){
  if(typeof aiOn!=='function'||!aiOn()){el('ocrSheet').classList.add('hidden');if(typeof aiNoKey==='function')aiNoKey();return;}
  if(aiProv()==='deepseek'){ocrRender(q,'err','DeepSeek не читает картинки. Для распознавания выберите в «Нейросетях» OpenAI, Claude или OpenRouter с моделью, которая видит картинки.');return;}
  if(navigator.onLine===false){ocrRender(q,'err','Для ИИ нужен интернет.');return;}
  const my=++ocrSeq;ocrRender(q,'aiwait');
  try{
    const pc=await ocrPageCanvas(q.n,1600),url=pc.cv.toDataURL('image/jpeg',0.85),b64=url.slice(url.indexOf(',')+1);
    const txt='Перепиши текст этой страницы.';
    const content=aiProv()==='anthropic'?[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}},{type:'text',text:txt}]:[{type:'image_url',image_url:{url:url}},{type:'text',text:txt}];
    const t=await aiViaKey({system:OCR_AI_SYS,messages:[{role:'user',content:content}],cap:20000},4000);
    if(my===ocrSeq)ocrRender(q,'ok',{t:rqPlainFix(t,false),ai:true});
  }catch(e){if(my===ocrSeq)ocrRender(q,'err','ИИ не прочитал страницу'+(e&&e.message?': '+e.message:'')+'.');}
}
el('ocrSheetClose').onclick=function(){el('ocrSheet').classList.add('hidden');ocrSeq++;ocrChipUpd();};
document.addEventListener('pointerdown',function(e){const sh=el('ocrSheet');if(sh.classList.contains('hidden')||sh.contains(e.target))return;
  if(ocrDl)return; /* идёт скачивание — не терять его случайным тапом */
  sh.classList.add('hidden');ocrSeq++;ocrChipUpd();},true);
el('ocrRowB').onclick=function(){el('sheet').classList.add('hidden');ocrOpen(ocrCurPage());};

/* ---------- плашка «На странице нет текста · Распознать» над страницей PDF без текста (только при открытых панелях) ---------- */
let ocrChipT=null;
function ocrChipUpd(){
  clearTimeout(ocrChipT);ocrChipT=setTimeout(function(){
    const c=el('ocrChip');if(!c)return;
    let show=false;const ct=el('ocrChipT');
    if(OA&&R&&R.book&&R.book.id===OA.bid&&R.mode==='pdf'&&!el('reader').classList.contains('hidden')&&el('ocrSheet').classList.contains('hidden')){
      if(ct)ct.textContent='Распознаю книгу · '+Math.min(OA.total,OA.done+1)+' из '+OA.total;
      c.classList.remove('hidden');const bot=document.querySelector('#reader .rbot');c.style.bottom=((bot?bot.offsetHeight:0)+12)+'px';return;
    }
    if(ct)ct.textContent='На странице нет текста · Распознать';
    if(R&&R.mode==='pdf'&&R.pdf&&!el('reader').classList.contains('hidden')&&el('ocrSheet').classList.contains('hidden')){
      const n=ocrCurPage(),tl=PS&&PS.on?document.querySelector('#pdfScroll .psl[data-n="'+n+'"] .textLayer'):el('pdfText');
      if(tl&&tl.querySelector('.endOfContent'))show=![...tl.querySelectorAll('span')].some(function(s){return /\S/.test(s.textContent);});
    }
    c.classList.toggle('hidden',!show);
    if(show){const rd=el('reader'),bot=document.querySelector('#reader .rbot');c.style.bottom=((bot?bot.offsetHeight:0)+12)+'px';}
  },120);
}
el('ocrChip').onclick=function(){ocrOpen(ocrCurPage(),!OA);};
if(window.MutationObserver){
  const mo=new MutationObserver(ocrChipUpd);
  ['pdfText','pdfScroll'].forEach(function(id){const x=el(id);if(x)mo.observe(x,{childList:true,subtree:id==='pdfScroll'});});
  mo.observe(el('reader'),{attributes:true,attributeFilter:['class']});
}
