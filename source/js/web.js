/* ---------- «Страница сайта» (Джессика 13.11): читать сайт как книгу ----------
   Страница превращается в обычную книгу на полке (genre 'Сайт', srcId 'web:<адрес>'), дальше чтение считается как у любой книги:
   страницы, минуты, опыт, ежедневное задание, честное чтение. Своего сервера нет, поэтому текст попадает в приложение так:
   1) ссылка: Википедия через её API (открыт для всех), любой другой сайт напрямую, если он это разрешает (CORS);
      если не разрешает, приложение спрашивает и берёт текст через Jina Reader (r.jina.ai) — решение Джессики 13.11 «да, запасным путём»;
   2) вставленный текст (или «Поделиться» выделенным текстом из браузера);
   3) сохранённая страница: .html / .htm, .mhtml / .mht («Скачать» в Chrome на Android) через «+ → Выбрать файлы».
   Новых полей в хранилище нет: книга — обычная карточка rqAddBook, srcId уже есть (arch.md 13.11). */
const WEB_JINA='https://r.jina.ai/';
const WEB_MIN=200; /* меньше 200 знаков текста — это не статья, а меню или ошибка */
const WEB_DROP='script,style,noscript,template,iframe,object,embed,svg,canvas,video,audio,form,button,input,select,textarea,nav,header,footer,aside,'+
  '[role=navigation],[role=banner],[role=contentinfo],[role=complementary],[aria-hidden=true],[hidden],'+
  '.mw-editsection,.ws-noexport,#headertemplate,.headertemplate,.ws-summary,.reference,sup.reference,.mw-cite-backlink,.navbox,.vertical-navbox,.infobox,.metadata,.ambox,.hatnote,.mw-empty-elt,.noprint,.toc,#toc,.mw-jump-link,.thumb,figure,.sidebar,.catlinks,'+
  '.share,.social,.comments,#comments,.related,.advert,.ads,.ad,.cookie,.breadcrumbs,.breadcrumb,.pagination,.subscribe,.newsletter';
const WEB_BLOCK=/^(P|H[1-6]|LI|BLOCKQUOTE|PRE|DD|DT|FIGCAPTION|TR|DIV|SECTION|ARTICLE|MAIN|UL|OL|DL|TABLE|TBODY|THEAD|HR|BR|CENTER|ADDRESS|DETAILS|SUMMARY)$/;

function webNorm(u){u=String(u||'').trim();if(!u)return '';if(!/^https?:\/\//i.test(u))u='https://'+u.replace(/^\/+/,'');
  try{const x=new URL(u);x.hash='';return x.href;}catch(e){return '';}}
function webHost(u){try{return new URL(u).hostname.replace(/^www\.|^m\./,'');}catch(e){return '';}}
function webOnShelf(u){return (S.userBooks||[]).find(function(b){return b&&b.srcId==='web:'+u;});}
function webClean(s){return String(s||'').replace(/[   ]/g,' ').replace(/[ \t\r\f\v]+/g,' ').replace(/ *\n */g,'\n').trim();}

/* html (строка) → {title, author, text, toc, lang}. Своя «Readability» на коротком поводке: берём <article>/<main> или блок,
   где больше всего текста в абзацах, и проходим его по блокам; заголовки становятся оглавлением. */
function webHtmlToBook(html,url,opt){
  opt=opt||{};
  const doc=new DOMParser().parseFromString(String(html||''),'text/html');
  const meta=function(k){const m=doc.querySelector('meta[property="'+k+'"],meta[name="'+k+'"]');return m?webClean(m.getAttribute('content')):'';};
  let title=opt.title||meta('og:title')||webClean(doc.title)||'';
  const h1=doc.querySelector('h1');if(!title&&h1)title=webClean(h1.textContent);
  const site=meta('og:site_name')||webHost(url)||'Сайт';
  const lang=String(doc.documentElement.getAttribute('lang')||'').slice(0,2).toLowerCase();
  doc.querySelectorAll(WEB_DROP).forEach(function(n){n.remove();});
  let root=opt.root?doc.querySelector(opt.root):null;
  if(!root){
    const arts=Array.from(doc.querySelectorAll('article,main,[role=main],[itemprop=articleBody],.mw-parser-output,.post-content,.entry-content,.article-body,.article__text'));
    let best=null,bl=0;arts.forEach(function(a){const l=webClean(a.textContent).length;if(l>bl){bl=l;best=a;}});
    /* очки по абзацам: родителю весь текст абзаца, деду половину (как в Readability) */
    const sc=new Map();let top=null,tv=0;
    doc.querySelectorAll('p,pre,blockquote').forEach(function(p){const l=webClean(p.textContent).length;if(l<40)return;
      const a=p.parentElement,b=a&&a.parentElement;
      [[a,l],[b,l/2]].forEach(function(x){if(!x[0])return;const v=(sc.get(x[0])||0)+x[1];sc.set(x[0],v);if(v>tv){tv=v;top=x[0];}});});
    root=best&&(!top||bl>=tv*0.8)?best:(top||doc.body);
  }
  if(!root)root=doc.body||doc.documentElement;
  const out=[],toc=[];let buf='',len=0;
  const flush=function(){const t=webClean(buf);buf='';if(t){out.push(t);len+=t.length+2;}};
  const walk=function(n,pre){
    for(let c=n.firstChild;c;c=c.nextSibling){
      if(c.nodeType===3){buf+=pre?c.nodeValue:c.nodeValue.replace(/\s+/g,' ');continue;}
      if(c.nodeType!==1)continue;
      const tg=c.tagName;
      if(tg==='BR'){if(pre)buf+='\n';else flush();continue;}
      if(tg==='IMG')continue;
      if(!WEB_BLOCK.test(tg)){walk(c,pre);continue;}
      flush();
      if(/^H[1-6]$/.test(tg)){const t=webClean(c.textContent);if(t){if(!(out.length===0&&t===title))toc.push({t:t.slice(0,80),off:len});out.push(t);len+=t.length+2;}continue;}
      if(tg==='LI'){walk(c,pre);const t=webClean(buf);buf='';if(t){out.push('• '+t);len+=t.length+4;}continue;}
      if(tg==='TR'){const cells=Array.from(c.children).map(function(x){return webClean(x.textContent);}).filter(Boolean);if(cells.length){const t=cells.join(' · ');out.push(t);len+=t.length+2;}continue;}
      if(tg==='PRE'){walk(c,true);const t=String(buf).replace(/\s+$/,'');buf='';if(t.trim()){out.push(t);len+=t.length+2;}continue;}
      walk(c,pre);flush();
    }
  };
  walk(root,false);flush();
  /* статья начинается с заголовка — он и есть название («Статья — Сайт» в <title>, <h1>Статья</h1>) */
  if(!opt.title&&toc.length&&toc[0].off===0&&out[0]&&out[0].length>3&&out[0].length<=200)title=out[0];
  else if(out.length&&out[0].length>3&&title&&title!==out[0]&&title.indexOf(out[0])>=0)title=out[0];
  if(toc.length&&toc[0].off===0&&toc[0].t===title.slice(0,80))toc.shift();
  let text=out.join('\n\n');
  if(title&&text.indexOf(title)!==0){text=title+'\n\n'+text;toc.forEach(function(x){x.off+=title.length+2;});}
  return {title:(title||site).slice(0,200),author:site,text:text,toc:toc.length>1?toc:undefined,lang:lang||undefined};
}

/* MHTML («Скачать страницу» в Chrome на Android): письмо из частей, берём первую text/html; quoted-printable или base64 */
function webBin(buf){const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return s;}
function webBytes(s){const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i)&255;return u;}
function webDecode(bytes,cs){try{return new TextDecoder(cs||'utf-8').decode(bytes);}catch(e){return new TextDecoder('utf-8').decode(bytes);}}
function webMhtml(bin){
  const head=bin.slice(0,4000),bm=/boundary="?([^";\r\n]+)"?/i.exec(head),loc=/Snapshot-Content-Location:\s*(\S+)/i.exec(head);
  const url=loc?loc[1]:'';
  if(!bm)throw new Error('файл страницы повреждён');
  const parts=bin.split('--'+bm[1]);
  for(const p of parts){
    const i=p.search(/\r?\n\r?\n/);if(i<0)continue;
    const h=p.slice(0,i);if(!/Content-Type:\s*text\/html/i.test(h))continue;
    let body=p.slice(i).replace(/^\r?\n\r?\n/,'');
    const enc=(/Content-Transfer-Encoding:\s*([\w-]+)/i.exec(h)||[])[1]||'',cs=(/charset="?([\w-]+)/i.exec(h)||[])[1]||'utf-8';
    let bytes;
    if(/quoted-printable/i.test(enc)){body=body.replace(/=\r?\n/g,'');bytes=webBytes(body.replace(/=([0-9A-F]{2})/gi,function(m,x){return String.fromCharCode(parseInt(x,16));}));}
    else if(/base64/i.test(enc))bytes=webBytes(atob(body.replace(/\s+/g,'')));
    else bytes=webBytes(body);
    return {html:webDecode(bytes,cs),url:url};
  }
  throw new Error('в файле нет страницы');
}
/* .html/.htm/.mhtml/.mht → книга (вызывается из importBookFile в library.js) */
async function webFileBook(f){
  const bin=webBin(await f.arrayBuffer());
  let html,url='';
  if(/\.mht(ml)?$/i.test(f.name)){const r=webMhtml(bin);html=r.html;url=r.url;}
  else{const cs=(/<meta[^>]+charset=["']?([\w-]+)/i.exec(bin.slice(0,4096))||[])[1]||'utf-8';html=webDecode(webBytes(bin),cs);
    const sv=/<!-- saved from url=\(\d+\)(\S+) -->/.exec(bin.slice(0,600))||/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i.exec(html.slice(0,20000));if(sv)url=sv[1];}
  const r=webHtmlToBook(html,url);
  if(!r.title||r.title===webHost(url))r.title=f.name.replace(/\.(html?|mht(ml)?)$/i,'');
  return webMakeBook(r,webNorm(url),f.name,f.size);
}
function webMakeBook(r,url,fname,size){
  /* название читалка сама пишет над текстом — в самом тексте его не повторяем */
  if(r.title&&r.text&&r.text.indexOf(r.title+'\n\n')===0){const d=r.title.length+2;r.text=r.text.slice(d);if(r.toc){r.toc=r.toc.map(function(x){return {t:x.t,off:Math.max(0,x.off-d)};});}}
  if(!r.text||r.text.length<WEB_MIN)throw new Error('на странице почти нет текста');
  const b={id:newBookId(),title:r.title,author:r.author||'Сайт',genre:'Сайт',stat:'Воля',cover:'',text:r.text,toc:r.toc,lang:r.lang||undefined,
    fname:fname||((webHost(url)||'sait')+'-'+String(r.title).replace(/[^\p{L}\p{N}]+/gu,'-').slice(0,60)+'.txt'),size:size||r.text.length};
  if(url)b.srcId='web:'+url;
  return b;
}

/* ---- загрузка по ссылке ---- */
/* Википедия и Викитека: MediaWiki API открыт для всех (origin=*), сама страница — нет */
function webWiki(u){const m=/^https?:\/\/([a-z\-]+)\.(?:m\.)?(wikipedia|wikisource)\.org\/wiki\/([^?#]+)/i.exec(u);
  return m?{lang:m[1],ws:m[2].toLowerCase()==='wikisource',host:m[1]+'.'+m[2].toLowerCase()+'.org',page:decodeURIComponent(m[3])}:null;}
async function webGetWiki(w,u){
  const api='https://'+w.host+'/w/api.php?action=parse&format=json&formatversion=2&origin=*&redirects=1&disableeditsection=1&prop=text%7Cdisplaytitle&page='+encodeURIComponent(w.page);
  const res=await fetch(api);if(!res.ok)throw new Error('Википедия ответила '+res.status);
  const j=await res.json();if(j.error)throw new Error(j.error.code==='missingtitle'?'такой страницы нет':j.error.info||'ошибка '+w.host);
  const title=webClean(new DOMParser().parseFromString(j.parse.displaytitle||j.parse.title,'text/html').body.textContent);
  const r=webHtmlToBook('<html lang="'+w.lang+'"><body>'+j.parse.text+'</body></html>',u,{title:title,root:'.mw-parser-output'});
  r.author=w.ws?(w.lang==='ru'?'Викитека':'Wikisource'):(w.lang==='ru'?'Википедия':'Wikipedia');r.lang=w.lang;
  if(w.ws)return r; /* в Викитеке примечания — часть текста */
  /* хвост «Примечания / Литература / Ссылки» — не чтение */
  const cut=(r.toc||[]).find(function(x){return /^(Примечания|Литература|Ссылки|Источники|См\. также|References|Notes|External links|See also|Further reading)$/i.test(x.t);});
  if(cut){r.text=r.text.slice(0,cut.off).replace(/\s+$/,'');r.toc=r.toc.filter(function(x){return x.off<cut.off;});if(r.toc.length<2)r.toc=undefined;}
  return r;
}
async function webGetDirect(u){
  let res;
  try{res=await fetch(u,{credentials:'omit',redirect:'follow'});}catch(e){const x=new Error('nocors');x.nocors=true;throw x;}
  if(!res.ok)throw new Error('сайт ответил '+res.status);
  const ct=(res.headers.get('content-type')||'').toLowerCase();
  if(/pdf|epub|fictionbook|zip/.test(ct)||/\.(pdf|epub|fb2|zip)$/i.test(new URL(res.url||u).pathname)){
    const blob=await res.blob(),nm=decodeURIComponent((new URL(res.url||u).pathname.split('/').pop())||'kniga');
    return {file:new File([blob],nm,{type:blob.type||ct})};}
  const body=await res.text();
  if(/^text\/plain/.test(ct))return {title:decodeURIComponent(new URL(u).pathname.split('/').pop()||webHost(u)),author:webHost(u),text:body.replace(/\r\n?/g,'\n').trim()};
  return webHtmlToBook(body,res.url||u);
}
/* Jina Reader отдаёт «Title: …\nURL Source: …\nMarkdown Content:\n<markdown>» — markdown в чистый текст, заголовки в оглавление */
async function webGetJina(u){
  let res;try{res=await fetch(WEB_JINA+u,{credentials:'omit'});}catch(e){throw new Error(navigator.onLine===false?'нет сети':'служба Jina Reader не ответила');}
  if(res.status===429)throw new Error('служба Jina Reader занята, попробуйте через минуту');
  if(!res.ok)throw new Error('служба Jina Reader не смогла открыть эту страницу (код '+res.status+')');
  const raw=await res.text();
  const tm=/^Title:\s*(.*)$/m.exec(raw),i=raw.indexOf('Markdown Content:');
  const md=i>=0?raw.slice(i+17):raw;
  return webMdToBook(md,tm?tm[1].trim():'',u);
}
function webMdToBook(md,title,u){
  const out=[],toc=[];let len=0,para=[];
  /* картинки и ссылки бывают вложенными: [![картинка](a)](b), [[1]](#cite) — снимаем в два прохода, сноски [1] убираем */
  const IMG=/!\[(?:[^\[\]]|\[[^\[\]]*\])*\]\((?:[^()]|\([^()]*\))*\)/g,LNK=/\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\((?:[^()]|\([^()]*\))*\)/g;
  const inl=function(s){for(let k=0;k<2;k++)s=s.replace(IMG,'').replace(LNK,'$1');return s.replace(/\[\d{1,3}\]|\[(?:прим|нет АИ|источник не указан)[^\]]*\]/g,'').replace(/<[^>]+>/g,'').replace(/(\*\*|__|`)/g,'').replace(/(^|\s)[*_](\S[^*_]*\S)[*_](?=\s|$|[.,;:!?])/g,'$1$2');};
  const push=function(t){t=webClean(t);if(!t)return;out.push(t);len+=t.length+2;};
  const flush=function(){if(para.length){push(para.join(' '));para=[];}};
  const lines=String(md).replace(/\r\n?/g,'\n').split('\n');
  for(let k=0;k<lines.length;k++){let s=lines[k];
    if(/^\s*$/.test(s)){flush();continue;}
    if(/^\s*(={3,}|-{3,}|\*{3,})\s*$/.test(s)){ /* setext: строка выше — заголовок */
      if(para.length&&/^=|^-/.test(s.trim())){const t=webClean(inl(para.join(' ')));para=[];if(t){toc.push({t:t.slice(0,80),off:len});push(t);}}else flush();continue;}
    if(/^\s*\|/.test(s)){flush();if(/^\s*\|[\s|:-]+\|\s*$/.test(s))continue; /* таблица: строка через « · », разделитель | --- | пропускаем */
      const t=s.trim().replace(/^\||\|$/g,'').split('|').map(function(x){return webClean(inl(x));}).filter(Boolean).join(' · ');if(t)push(t);continue;}
    const h=/^\s*#{1,6}\s+(.*?)\s*#*\s*$/.exec(s);
    if(h){flush();const t=webClean(inl(h[1]));if(t&&/[\p{L}\p{N}]/u.test(t)){toc.push({t:t.slice(0,80),off:len});push(t);}continue;}
    const li=/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(s);
    if(li){flush();const t=inl(li[1]);if(webClean(t))push('• '+t);continue;}
    s=inl(s.replace(/^\s*>\s?/,''));if(/^\s*https?:\/\/\S+\s*$/.test(s))continue;
    para.push(s);
  }
  flush();
  let text=out.join('\n\n');
  if(title&&text.indexOf(title)!==0){text=title+'\n\n'+text;toc.forEach(function(x){x.off+=title.length+2;});}
  if(toc.length&&toc[0].t===title)toc.shift();
  return {title:(title||webHost(u)).slice(0,200),author:webHost(u),text:text,toc:toc.length>1?toc:undefined};
}

/* ---- шторка «Страница сайта» ---- */
const WEB={busy:false,url:''};
function webSheet(o){
  o=o||{};
  el('bookSheetBody').innerHTML=
    '<div class="bk-head"><div class="cover webcov">'+rqIcon('compass',34)+'</div><div class="bk-ttl"><b>Страница сайта</b><div class="bk-sub">Читать сайт как книгу</div></div></div>'+
    '<div class="bk-note">Текст страницы ляжет на полку как книга. Чтение засчитывается как обычно: страницы, минуты, опыт и ежедневное задание.</div>'+
    '<div class="bk-h">Ссылка</div>'+
    '<input id="webUrl" class="searchinp" type="url" inputmode="url" autocomplete="off" placeholder="https://…" aria-label="Ссылка на страницу" value="'+esc(o.url||'')+'">'+
    '<button type="button" class="cta" id="webGo">'+rqIcon('download',18)+' Открыть как книгу</button>'+
    '<div id="webMsg" role="status"></div>'+
    '<div class="bk-h">Или вставьте текст</div>'+
    '<textarea id="webText" class="searchinp webtext" rows="5" maxlength="2000000" placeholder="Выделите текст на сайте, скопируйте и вставьте сюда" aria-label="Текст страницы">'+esc(o.text||'')+'</textarea>'+
    '<input id="webTitle" class="searchinp webtitle" type="text" autocomplete="off" placeholder="Название (необязательно)" aria-label="Название" value="'+esc(o.title||'')+'">'+
    '<button type="button" class="buy advwant" id="webTextGo">'+rqIcon('file-text',18)+' Сделать книгу из текста</button>'+
    '<div class="bk-h">Или откройте сохранённую страницу</div>'+
    '<div class="bk-note">В браузере на телефоне откройте меню и нажмите значок скачивания: страница сохранится файлом. На компьютере: Ctrl+S. Потом выберите этот файл здесь.</div>'+
    '<button type="button" class="buy advwant" id="webFile">'+rqIcon('folder',18)+' Выбрать файл страницы</button>';
  el('bookSheet').classList.remove('hidden');el('bookSheet').scrollTop=0;
  el('webGo').onclick=function(){webGo(el('webUrl').value,false);};
  el('webUrl').onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();webGo(el('webUrl').value,false);}};
  el('webTextGo').onclick=webFromText;
  el('webFile').onclick=function(){el('fileInp').click();};
  if(o.go&&o.url)webGo(o.url,false);
}
function webMsg(h){const m=el('webMsg');if(m)m.innerHTML=h;}
function webBusy(t){const b=el('webGo');if(!b)return;b.disabled=!!t;b.innerHTML=t?esc(t):rqIcon('download',18)+' Открыть как книгу';}
async function webGo(raw,viaJina){
  if(WEB.busy)return;
  const u=webNorm(raw);
  if(!u){webMsg('<div class="bk-note">Вставьте ссылку на страницу, например https://ru.wikipedia.org/wiki/Чехов</div>');return;}
  const own=webOnShelf(u);
  if(own){webMsg('<div class="bk-note">Эта страница уже на полке.</div><button type="button" class="buy advwant" id="webOpenOwn">'+rqIcon('book-open',18)+' Читать</button>');
    el('webOpenOwn').onclick=function(){el('bookSheet').classList.add('hidden');openBook(own.id);};return;}
  if(navigator.onLine===false){webMsg('<div class="bk-note">Нет сети. Страница скачается один раз, дальше читается без интернета.</div>');return;}
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне','info');return;}
  WEB.busy=true;WEB.url=u;webMsg('');webBusy(viaJina?'Открываю через Jina Reader…':'Загружаю страницу…');
  try{
    let r;const w=!viaJina&&webWiki(u);
    if(w)r=await webGetWiki(w,u);
    else if(viaJina)r=await webGetJina(u);
    else{
      try{r=await webGetDirect(u);}
      catch(e){if(e&&e.nocors){webNoCors(u);return;}throw e;}
      if(r.file){el('bookSheet').classList.add('hidden');await importBookFiles([r.file]);return;}
      if(!r.text||r.text.length<WEB_MIN){webNoCors(u,true);return;} /* страница собирается скриптами: в html пусто */
    }
    const b=webMakeBook(r,u);
    await rqAddBook(b);
    el('bookSheet').classList.add('hidden');
    try{renderLibrary();libFlashNew();}catch(e){}
    openBook(b.id);
  }catch(e){console.warn('[rq] web',e);webMsg('<div class="bk-note">Не получилось: '+esc(e&&e.message||e)+'</div>');}
  finally{WEB.busy=false;webBusy('');}
}
/* сайт не пустил приложение (или страница пустая без скриптов): спросить про Jina Reader, рядом остальные пути */
function webNoCors(u,empty){
  webMsg('<div class="bk-note">'+(empty?'На этой странице текст появляется только в браузере, приложение его не видит.':'Этот сайт не даёт приложению открыть страницу напрямую.')+
    ' Можно открыть её через Jina Reader: это бесплатная служба, которая сама откроет страницу и отдаст текст. Адрес страницы уйдёт этой службе.</div>'+
    '<button type="button" class="cta" id="webJina">'+rqIcon('download',18)+' Открыть через Jina Reader</button>'+
    '<div class="bk-note">Или вставьте текст страницы ниже, или сохраните страницу файлом.</div>');
  el('webJina').onclick=function(){webGo(u,true);};
}
async function webFromText(){
  const t=String(el('webText').value||'').replace(/\r\n?/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  if(t.length<WEB_MIN){flashMsg('Текста слишком мало для книги','info');return;}
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне','info');return;}
  const first=(t.split('\n')[0]||'').trim();
  const title=webClean(el('webTitle').value)||(first.length<=90?first:first.slice(0,60).replace(/\s+\S*$/,'')+'…');
  const u=webNorm(WEB.shareUrl||'');
  const b=webMakeBook({title:title,author:u?webHost(u):'Вставленный текст',text:t},'','',0);
  if(u&&!webOnShelf(u))b.srcId='web:'+u;
  b.fname=(u?webHost(u)+'-':'')+String(title).replace(/[^\p{L}\p{N}]+/gu,'-').slice(0,60)+'.txt';
  try{await rqAddBook(b);}catch(e){flashMsg('Не удалось добавить: '+(e&&e.message||e),'info');return;}
  WEB.shareUrl='';el('bookSheet').classList.add('hidden');
  try{renderLibrary();libFlashNew();}catch(e){}
  openBook(b.id);
}
/* «Поделиться → ReadQuest» ссылкой или выделенным текстом (sw.js кладёт {title,text,url}, library.js importSharedBooks зовёт сюда) */
function webFromShare(o){
  o=o||{};const text=String(o.text||'').trim(),m=/https?:\/\/\S+/.exec(text);
  const url=webNorm(o.url||(m?m[0]:''));
  const rest=m?text.replace(m[0],'').trim():text;
  try{show('library');}catch(e){}
  if(rest.length>=WEB_MIN){WEB.shareUrl=url;webSheet({text:rest,title:o.title||'',url:url});return;} /* поделились выделенным текстом */
  webSheet({url:url,go:!!url});
}
