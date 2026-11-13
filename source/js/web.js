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
  '.mw-editsection,.ws-noexport,#headertemplate,.headertemplate,.ws-summary,.reference,sup.reference,.mw-cite-backlink,.navbox,.vertical-navbox,.infobox,.metadata,.ambox,.hatnote,.mw-empty-elt,.noprint,.toc,#toc,.mw-jump-link,.sidebar,.mw-references-wrap,.reflist,.gallery,.magnify,.catlinks,'+
  '.share,.social,.comments,#comments,.related,.advert,.ads,.ad,.cookie,.breadcrumbs,.breadcrumb,.pagination,.subscribe,.newsletter';
const WEB_BLOCK=/^(P|H[1-6]|LI|BLOCKQUOTE|PRE|DD|DT|FIGURE|FIGCAPTION|TR|DIV|SECTION|ARTICLE|MAIN|UL|OL|DL|TABLE|TBODY|THEAD|HR|BR|CENTER|ADDRESS|DETAILS|SUMMARY)$/;

function webNorm(u){u=String(u||'').trim();if(!u)return '';if(!/^https?:\/\//i.test(u))u='https://'+u.replace(/^\/+/,'');
  try{const x=new URL(u);x.hash='';return x.href;}catch(e){return '';}}
function webHost(u){try{return new URL(u).hostname.replace(/^www\.|^m\./,'');}catch(e){return '';}}
function webOnShelf(u){return (S.userBooks||[]).find(function(b){return b&&b.srcId==='web:'+u;});}
function webClean(s){return String(s||'').replace(/[   ]/g,' ').replace(/[ \t\r\f\v]+/g,' ').replace(/ *\n */g,'\n').trim();}

/* ---- «раскладчик» (Джессика 13.11 вечер: «чтение неудобное… раскладывать текст с сайтов удобно, убирая лишнее») ----
   Любая страница (html сайта, html из файла, markdown от Jina Reader) сначала становится списком блоков:
     {k:'h',lvl,t} заголовок · {k:'p',t,ld} абзац · {k:'li',t,ld} пункт списка · {k:'q',t} цитата · {k:'pre',t} код · {k:'img',src} картинка · {k:'cap',t} подпись
   (ld — доля текста внутри ссылок). webTidy убирает лишнее (меню, счётчики над статьёй, «читайте также», комментарии), webBlocksToBook
   складывает книгу. В тексте книги вид абзаца хранит невидимый знак в его начале (как U+2063 у перевода, arch.md 13.11):
   U+2061 цитата, U+2062 подзаголовок, U+2064 подпись к картинке, U+2061U+2062 строка кода; «• » — пункт списка; «￼img:N» — картинка из IDB.
   Читалка (js/reader.js rqBodyHtml) рисует их классами rq-q / rq-h2 / rq-cap / rq-pre / rq-li. */
const WEB_Q='⁡',WEB_H2='⁢',WEB_CAP='⁤',WEB_PRE='⁡⁢';
const WEB_IMG_MAX=24;
const WEB_JUNK=/^(skip to (main )?content|перейти к (основному )?(содержанию|контенту)|реклама|advertisement|поделиться|share( this)?|подписаться|subscribe|читать (далее|дальше|полностью)|read more|войти|sign in|log in|меню|menu|поиск|search|комментарии\s*\d*|\d+\s*комментари\S*|comments?\s*\d*|назад|вперёд|далее|previous|next|наверх|back to top|copy link|скопировать ссылку|\d+|[\d\s.,]+[kкKК]?)$/i;
const WEB_TAIL=/^(комментарии|читайте также|читать также|похожие (статьи|публикации|материалы|записи)|ещё по теме|еще по теме|по теме|материалы по теме|другие (статьи|материалы|новости)|рекомендуем|вам может понравиться|related( articles| posts| stories)?|more from|more on this|read (more|next)|you (may|might) also like|comments|leave a (reply|comment)|теги|tags|поделиться|share this|подпишитесь|подписка|newsletter|лучшие за сутки|публикации|информация|help improve|was this (page|article) helpful)(?![\p{L}])/iu;
function webImgOk(src,alt,w,h){
  if(!/^https?:\/\//i.test(src)||/\.svg(\?|$)/i.test(src))return false;
  if(/sprite|icon|logo|avatar|emoji|pixel|spacer|blank|tracking|counter|badge|button|userpic/i.test(src)||/^(avatar|logo|icon|аватар|логотип)/i.test(alt||''))return false;
  if((w&&w<160)||(h&&h<90))return false;return true;}
function webHtmlBlocks(root,base){
  const B=[];let buf='',lk=0;
  const emit=function(kind,t,l){t.split(/\n{2,}/).forEach(function(x){x=webClean(x);if(x)B.push({k:kind,t:x,ld:t.length?Math.min(1,l/t.length):0});});};
  const flush=function(ctx){const raw=buf,l=lk;buf='';lk=0;if(!webClean(raw))return;
    let kind='p';if(ctx.q)kind='q';else if(ctx.li&&ctx.li.first){kind='li';ctx.li.first=false;raw.trim();}
    if(kind==='li'){const t=webClean(raw);B.push({k:'li',t:(ctx.li.n?ctx.li.n+'. ':'• ')+t,ld:t.length?Math.min(1,l/t.length):0});}else emit(kind,raw,l);};
  const abs=function(v){try{return new URL(v,base||undefined).href;}catch(e){return '';}};
  const walk=function(n,ctx){
    for(let c=n.firstChild;c;c=c.nextSibling){
      if(c.nodeType===3){const v=ctx.pre?c.nodeValue:c.nodeValue.replace(/\s+/g,' ');buf+=v;if(ctx.a)lk+=v.trim().length;continue;}
      if(c.nodeType!==1)continue;
      const tg=c.tagName;
      if(tg==='BR'){buf+='\n';continue;}
      if(tg==='IMG'){
        const ss=String(c.getAttribute('srcset')||c.getAttribute('data-srcset')||'').split(',').map(function(x){return x.trim().split(/\s+/)[0];}).filter(Boolean);
        const src=abs(c.getAttribute('data-src')||c.getAttribute('data-lazy-src')||c.getAttribute('data-original')||(ss.length?ss[ss.length-1]:'')||c.getAttribute('src')||'');
        if(webImgOk(src,c.getAttribute('alt'),+c.getAttribute('width')||0,+c.getAttribute('height')||0)){flush(ctx);B.push({k:'img',src:src});}
        continue;}
      if(tg==='A'){const was=ctx.a;ctx.a=true;walk(c,ctx);ctx.a=was;continue;}
      if(!WEB_BLOCK.test(tg)&&!/thumbcaption/.test(c.className||'')){walk(c,ctx);continue;}
      flush(ctx);
      if(/^H[1-6]$/.test(tg)){const t=webClean(c.textContent);if(t&&/[\p{L}\p{N}]/u.test(t))B.push({k:'h',lvl:+tg.charAt(1),t:t});continue;}
      if(tg==='FIGCAPTION'||/thumbcaption/.test(c.className||'')){const t=webClean(c.textContent);if(t)B.push({k:'cap',t:t});continue;}
      if(tg==='LI'){const ol=c.parentElement&&c.parentElement.tagName==='OL';
        const x={pre:ctx.pre,a:ctx.a,q:ctx.q,li:{first:true,n:ol?Array.prototype.indexOf.call(c.parentElement.children,c)+1:0}};walk(c,x);flush(x);continue;}
      if(tg==='TR'){const cells=Array.from(c.children).map(function(x){return webClean(x.textContent);}).filter(Boolean);
        if(cells.length){const t=cells.join(' · '),l=webClean(Array.from(c.querySelectorAll('a')).map(function(x){return x.textContent;}).join('')).length;B.push({k:'p',t:t,ld:Math.min(1,l/t.length)});}continue;}
      if(tg==='PRE'){const t=String(c.textContent||'').replace(/\r\n?/g,'\n').replace(/^\n+|\s+$/g,'');if(t.trim())B.push({k:'pre',t:t});continue;}
      if(tg==='BLOCKQUOTE'){const x={pre:ctx.pre,a:ctx.a,q:true,li:null};walk(c,x);flush(x);continue;}
      walk(c,ctx);flush(ctx);
    }
  };
  const ctx={pre:false,a:false,q:false,li:null};walk(root,ctx);flush(ctx);
  return B;
}
/* уборка: что на странице не статья. trusted (Википедия, Викитека) — только повторы и пустое */
function webTidy(B,trusted){
  B=B.filter(function(x){return x.k==='img'||(x.t&&x.t.trim());});
  B=B.filter(function(x,i){const p=B[i-1];return !(p&&p.k===x.k&&p.k!=='img'&&p.t===x.t);});
  B.forEach(function(x){if(x.k==='h')x.t=x.t.replace(/^[▍▎▌█■□●○◆◇►▶▸•·#\s]+/,'')||x.t;}); /* «▍ Заголовок» на Хабре */
  const ends=function(L){ /* заголовок, под которым ничего не осталось; картинки и заголовки в самом конце */
    L=L.filter(function(x,i){const nx=L[i+1];return !(x.k==='h'&&(!nx||(nx.k==='h'&&nx.lvl<=x.lvl)));});
    while(L.length&&(L[L.length-1].k==='img'||L[L.length-1].k==='cap'||L[L.length-1].k==='h'))L.pop();return L;};
  if(trusted)return ends(ends(B));
  const isBody=function(x){return (x.k==='p'||x.k==='q')&&x.t.length>=140&&(x.ld||0)<0.3;};
  B=B.filter(function(x){return x.k==='img'||x.k==='pre'||x.k==='h'||!(WEB_JUNK.test(x.t)||(x.t.length<220&&/cookie|куки|файлы cookie/i.test(x.t)));});
  let first=B.findIndex(isBody),last=-1;for(let i=B.length-1;i>=0;i--)if(isBody(B[i])){last=i;break;}
  if(first<0)return B; /* стихи, короткие заметки, список заголовков: чистить нечего */
  /* хвост: «Комментарии», «Читайте также»… после середины статьи — до конца */
  for(let i=first+1;i<B.length;i++){const x=B[i];if(x.k==='h'&&i>=B.length*0.4&&WEB_TAIL.test(x.t)){B=B.slice(0,i);break;}
    if(x.k!=='h'&&i>last&&x.t&&x.t.length<60&&WEB_TAIL.test(x.t)){B=B.slice(0,i);break;}}
  /* пачки ссылок (меню, «похожие»): 3+ подряд коротких блоков-ссылок вне статьи, 6+ где угодно */
  const linky=function(x){return (x.k==='p'||x.k==='li')&&(x.ld||0)>0.75&&x.t.length<90;};
  const keep=B.map(function(){return true;});
  for(let i=0;i<B.length;){if(!linky(B[i])){i++;continue;}let j=i;while(j<B.length&&linky(B[j]))j++;
    const n=j-i,out=j<=first||i>last;if(n>=6||(n>=3&&out)||(out&&i>last))for(let k=i;k<j;k++)keep[k]=false;i=j;}
  /* над статьёй: счётчики, дата, «7 мин», имя автора — короткие строки без точки в конце */
  for(let i=0;i<first;i++){const x=B[i];if((x.k==='p'||x.k==='li'||x.k==='cap')&&x.t.length<60)keep[i]=false;}
  B=B.filter(function(x,i){return keep[i];});
  return ends(ends(B));
}
function webBlocksToBook(B,o){
  o=o||{};B=webTidy(B,o.trusted);
  let title=o.title||'';const h0=B.findIndex(function(x){return x.k==='h';}),b0=B.findIndex(function(x){return x.k!=='img'&&x.k!=='cap';});
  /* статья начинается с заголовка — он и есть название («Статья — Сайт» в <title>, <h1>Статья</h1>) */
  if(h0>=0&&h0===b0&&B[h0].t.length>3&&B[h0].t.length<=200&&(!o.titleFixed||B[h0].t===title)&&(B[h0].lvl===1||!title||title.indexOf(B[h0].t)>=0)){title=B[h0].t;B.splice(h0,1);}
  title=(title||o.site||'Страница').slice(0,200);
  const out=[],toc=[],imgs=[];let len=0;
  const push=function(t){out.push(t);len+=t.length+2;};
  /* оглавление: верхний уровень заголовков; следующий тоже, если верхних меньше двух (или это Википедия) — остальные идут подзаголовками в тексте */
  const minLvl=B.reduce(function(m,x){return x.k==='h'?Math.min(m,x.lvl):m;},6),nTop=B.filter(function(x){return x.k==='h'&&x.lvl===minLvl;}).length;
  const tocLvl=o.trusted||nTop<2?minLvl+1:minLvl;
  B.forEach(function(x){
    if(x.k==='h'){if(x.lvl<=tocLvl){toc.push({t:x.t.slice(0,80),off:len});push(x.t);}else push(WEB_H2+x.t);}
    else if(x.k==='q')push(WEB_Q+x.t);
    else if(x.k==='cap')push(WEB_CAP+x.t);
    else if(x.k==='pre')push(x.t.split('\n').filter(function(l){return l.trim();}).map(function(l){return WEB_PRE+l.replace(/\t/g,'  ');}).join('\n'));
    else if(x.k==='img'){if(imgs.length<WEB_IMG_MAX&&imgs.indexOf(x.src)<0){push('￼img:'+imgs.length);imgs.push(x.src);}}
    else push(x.t);
  });
  return {title:title,author:o.site||'Сайт',text:out.join('\n\n'),toc:toc.length>1?toc:undefined,lang:o.lang||undefined,imgs:imgs};
}
/* html (строка) → книга. Своя «Readability» на коротком поводке: <article>/<main> или блок, где больше всего текста в абзацах */
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
  const B=webHtmlBlocks(root,url);
  /* <title> «Статья — Сайт», а в тексте <h1>Статья</h1>: название — заголовок */
  const fh=B.find(function(x){return x.k==='h';});
  return webBlocksToBook(B,{title:title,titleFixed:!!opt.title&&!(fh&&fh.t===opt.title),site:site,lang:lang,trusted:!!opt.trusted});
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
  const b=webMakeBook(r,webNorm(url),f.name,f.size);
  await webStoreImgs(b.id,b.webImgs,b.text);
  return b;
}
function webMakeBook(r,url,fname,size){
  /* название читалка сама пишет над текстом — в самом тексте его не повторяем */
  if(r.title&&r.text&&r.text.indexOf(r.title+'\n\n')===0){const d=r.title.length+2;r.text=r.text.slice(d);if(r.toc){r.toc=r.toc.map(function(x){return {t:x.t,off:Math.max(0,x.off-d)};});}}
  if(!r.text||r.text.length<WEB_MIN)throw new Error('на странице почти нет текста');
  const b={id:newBookId(),title:r.title,author:r.author||'Сайт',genre:'Сайт',stat:'Воля',cover:'',text:r.text,toc:r.toc,lang:r.lang||undefined,
    fname:fname||((webHost(url)||'sait')+'-'+String(r.title).replace(/[^\p{L}\p{N}]+/gu,'-').slice(0,60)+'.txt'),size:size||r.text.length};
  if(url)b.srcId='web:'+url;
  Object.defineProperty(b,'webImgs',{value:r.imgs||[],enumerable:false}); /* не поле книги: только чтобы забрать картинки при добавлении */
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
  const r=webHtmlToBook('<html lang="'+w.lang+'"><body>'+j.parse.text+'</body></html>',u,{title:title,root:'.mw-parser-output',trusted:true});
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
  const B=[];let para=[],q=false;
  /* картинки и ссылки бывают вложенными: [![картинка](a)](b), [[1]](#cite) — снимаем в два прохода, сноски [1] убираем */
  const IMG=/!\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\(((?:[^()\s]|\([^()]*\))*)[^)]*\)/g,LNK=/\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\((?:[^()]|\([^()]*\))*\)/g;
  const inl=function(s){for(let k=0;k<2;k++)s=s.replace(IMG,'').replace(LNK,'$1');return s.replace(/\[\d{1,3}\]|\[(?:прим|нет АИ|источник не указан)[^\]]*\]/g,'').replace(/<[^>]+>/g,'').replace(/(\*\*|__|`)/g,'').replace(/(^|\s)[*_](\S[^*_]*\S)[*_](?=\s|$|[.,;:!?])/g,'$1$2');};
  const ldOf=function(raw){let l=0;const s=raw.replace(IMG,'');s.replace(LNK,function(m,t){l+=webClean(inl(t)).length;return m;});const t=webClean(inl(raw));return t.length?Math.min(1,l/t.length):0;};
  const imgsOf=function(raw){raw.replace(IMG,function(m,alt,src){alt=String(alt).replace(/^Image \d+:?\s*/i,'');if(webImgOk(src,alt,0,0))B.push({k:'img',src:src});return m;});};
  const flush=function(){if(!para.length)return;const raw=para.join(' ');para=[];const t=webClean(inl(raw));imgsOf(raw);if(t)B.push({k:q?'q':'p',t:t,ld:ldOf(raw)});q=false;};
  const lines=String(md).replace(/\r\n?/g,'\n').split('\n');
  for(let k=0;k<lines.length;k++){let s=lines[k];
    if(/^\s*(```|~~~)/.test(s)){flush();const code=[];k++;while(k<lines.length&&!/^\s*(```|~~~)/.test(lines[k]))code.push(lines[k++]);if(code.join('').trim())B.push({k:'pre',t:code.join('\n')});continue;}
    if(/^\s*$/.test(s)){flush();continue;}
    if(/^\s*(={3,}|-{3,}|\*{3,})\s*$/.test(s)){ /* setext: строка выше — заголовок */
      if(para.length&&/^=|^-/.test(s.trim())){const t=webClean(inl(para.join(' ')));para=[];if(t&&/[\p{L}\p{N}]/u.test(t))B.push({k:'h',lvl:s.trim().charAt(0)==='='?1:2,t:t});}else flush();continue;}
    if(/^\s*\|/.test(s)){flush();if(/^\s*\|[\s|:-]+\|\s*$/.test(s))continue; /* таблица: строка через « · », разделитель | --- | пропускаем */
      const t=s.trim().replace(/^\||\|$/g,'').split('|').map(function(x){return webClean(inl(x));}).filter(Boolean).join(' · ');if(t)B.push({k:'p',t:t,ld:ldOf(s)});continue;}
    const h=/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(s);
    if(h){flush();const t=webClean(inl(h[2]));imgsOf(h[2]);if(t&&/[\p{L}\p{N}]/u.test(t))B.push({k:'h',lvl:h[1].length,t:t});continue;}
    const li=/^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/.exec(s);
    if(li){flush();const t=webClean(inl(li[3]));imgsOf(li[3]);if(t)B.push({k:'li',t:(li[2]?li[2]+'. ':'• ')+t,ld:ldOf(li[3])});continue;}
    if(/^\s*>/.test(s)){if(!para.length)q=true;s=s.replace(/^\s*>\s?/,'');if(!s.trim()){flush();continue;}}
    if(/^\s*https?:\/\/\S+\s*$/.test(inl(s)))continue;
    para.push(s);
  }
  flush();
  const r=webBlocksToBook(B,{title:title,site:webHost(u)});
  if(!r.title||r.title==='Страница')r.title=webHost(u);
  return r;
}
/* картинки статьи: забираем те, что сайт отдаёт приложению (CORS), в IDB «img:<книга>:<n>» — как у FB2 и EPUB; остальные абзацы-картинки читалка прячет */
async function webStoreImgs(id,imgs,text){
  if(typeof idbPut!=='function')return 0;let ok=0;
  for(let n=0;n<WEB_IMG_MAX;n++){try{await idbDel('img:'+id+':'+n);}catch(e){}}
  if(navigator.onLine===false)return 0;
  await Promise.all((imgs||[]).map(async function(src,n){
    if(text&&text.indexOf('￼img:'+n)<0)return;
    try{const ac=new AbortController(),tm=setTimeout(function(){ac.abort();},8000);
      const res=await fetch(src,{mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',signal:ac.signal});
      const blob=res.ok?await res.blob():null;clearTimeout(tm);
      if(!blob||!/^image\/(jpeg|png|webp|gif|avif)/.test(blob.type)||blob.size<2500||blob.size>2000000)return;
      await idbPut('img:'+id+':'+n,blob);ok++;}catch(e){}}));
  return ok;
}

/* ---- шторка «Страница сайта» ----
   13.11 (Джессика «давай все»): одно поле — ссылка или текст, приложение само понимает что; перед добавлением ссылки — «Начало текста»
   и «Отмена»; про Jina Reader можно «Больше не спрашивать» (SET.webJina, arch.md 13.11) */
const WEB={busy:false,url:'',shareUrl:'',pend:null};
function webIsUrl(v){v=String(v||'').trim();if(!v||/\s/.test(v))return false;
  return /^https?:\/\/\S+$/i.test(v)||/^(www\.)?[\p{L}\p{N}-]+(\.[\p{L}\p{N}-]+)*\.[\p{L}]{2,}([\/?#:].*)?$/u.test(v);}
function webJinaOk(){return !!(typeof SET!=='undefined'&&SET&&SET.webJina);}
function webJinaSet(on){if(typeof SET==='undefined'||!SET)return;if(on)SET.webJina=1;else delete SET.webJina;if(typeof saveSet==='function')saveSet();}
function webSheet(o){
  o=o||{};WEB.pend=null;
  const v=o.text||o.url||'';
  el('bookSheetBody').innerHTML=
    '<div class="bk-head"><div class="cover webcov">'+rqIcon('compass',34)+'</div><div class="bk-ttl"><b>Страница сайта</b><div class="bk-sub">Читать сайт как книгу</div></div></div>'+
    '<div class="bk-note">Текст страницы ляжет на полку как книга. Чтение засчитывается как обычно: страницы, минуты, опыт, серия и ежедневное задание. В счёт дочитанных книг и ачивок за книги страницы сайтов не идут.</div>'+
    '<textarea id="webIn" class="searchinp webtext" rows="3" maxlength="2000000" autocomplete="off" placeholder="Вставьте ссылку на страницу или текст с сайта" aria-label="Ссылка или текст">'+esc(v)+'</textarea>'+
    '<input id="webTitle" class="searchinp webtitle" type="text" autocomplete="off" placeholder="Название (необязательно)" aria-label="Название" value="'+esc(o.title||'')+'" hidden>'+
    '<button type="button" class="cta" id="webGo"></button>'+
    '<div id="webMsg" role="status"></div>'+
    (webJinaOk()?'<div class="bk-note webjinaon">Закрытые сайты открываются через Jina Reader без вопроса. <button type="button" class="weblink" id="webJinaOff">Спрашивать снова</button></div>':'')+
    '<div class="bk-h">Или откройте сохранённую страницу</div>'+
    '<div class="bk-note">В браузере на телефоне откройте меню и нажмите значок скачивания: страница сохранится файлом. На компьютере: Ctrl+S. Потом выберите этот файл здесь.</div>'+
    '<button type="button" class="buy advwant" id="webFile">'+rqIcon('folder',18)+' Выбрать файл страницы</button>';
  el('bookSheet').classList.remove('hidden');el('bookSheet').scrollTop=0;
  el('webIn').oninput=webMode;
  el('webGo').onclick=function(){const x=String(el('webIn').value||'').trim();if(webIsUrl(x))webGo(x,false);else webFromText();};
  el('webFile').onclick=function(){el('fileInp').click();};
  if(el('webJinaOff'))el('webJinaOff').onclick=function(){webJinaSet(false);const n=document.querySelector('.webjinaon');if(n)n.remove();};
  webMode();
  if(o.go&&o.url)webGo(o.url,false);
}
/* поле само понимает, что в нём: ссылка → «Открыть ссылку», текст → «Сделать книгу из текста» и поле названия */
function webMode(){const inp=el('webIn'),b=el('webGo');if(!inp||!b||WEB.busy)return;
  const x=String(inp.value||'').trim(),url=webIsUrl(x);
  el('webTitle').hidden=!x||url;
  b.disabled=!x;
  b.innerHTML=!x?'Вставьте ссылку или текст':url?rqIcon('download',18)+' Открыть ссылку как книгу':rqIcon('file-text',18)+' Сделать книгу из текста';
  if(WEB.pend&&(!url||webNorm(x)!==WEB.pend.u)){WEB.pend=null;webMsg('');}}
function webMsg(h){const m=el('webMsg');if(m)m.innerHTML=h;}
function webBusy(t){const b=el('webGo');if(!b)return;if(t){b.disabled=true;b.textContent=t;}else webMode();}
async function webFetchBook(u,viaJina){
  const w=!viaJina&&webWiki(u);
  if(w)return await webGetWiki(w,u);
  if(viaJina)return await webGetJina(u);
  let r;
  try{r=await webGetDirect(u);}catch(e){if(e&&e.nocors&&webJinaOk())return await webGetJina(u);throw e;}
  if(!r.file&&(!r.text||r.text.length<WEB_MIN)){if(webJinaOk())return await webGetJina(u);const x=new Error('empty');x.nocors=true;x.empty=true;throw x;} /* текст собирают скрипты: в html пусто */
  return r;
}
async function webGo(raw,viaJina){
  if(WEB.busy)return;
  const u=webNorm(raw);
  if(!u){webMsg('<div class="bk-note">Вставьте ссылку на страницу, например https://ru.wikipedia.org/wiki/Чехов</div>');return;}
  const own=webOnShelf(u);
  if(own){webMsg('<div class="bk-note">Эта страница уже на полке.</div><button type="button" class="buy advwant" id="webOpenOwn">'+rqIcon('book-open',18)+' Читать</button>');
    el('webOpenOwn').onclick=function(){el('bookSheet').classList.add('hidden');openBook(own.id);};return;}
  if(navigator.onLine===false){webMsg('<div class="bk-note">Нет сети. Страница скачается один раз, дальше читается без интернета.</div>');return;}
  WEB.busy=true;WEB.url=u;WEB.pend=null;webMsg('');webBusy(viaJina||(!webWiki(u)&&webJinaOk())?'Открываю страницу… бывает до 20 секунд':'Загружаю страницу…');
  try{
    let r;
    try{r=await webFetchBook(u,viaJina);}catch(e){if(e&&e.nocors){webNoCors(u,e.empty);return;}throw e;}
    if(r.file){el('bookSheet').classList.add('hidden');await importBookFiles([r.file]);return;}
    WEB.pend={b:webMakeBook(r,u),u:u};webPreview();
  }catch(e){console.warn('[rq] web',e);webMsg('<div class="bk-note">Не получилось: '+esc(e&&e.message||e)+'</div>');}
  finally{WEB.busy=false;webBusy('');}
}
/* «Начало текста» перед добавлением: видно, статья ли это или меню сайта; «Отмена» ничего не пишет */
function webWords(t){return (String(t).match(/[\p{L}\p{N}]+/gu)||[]).length;}
function webPreview(){
  const p=WEB.pend;if(!p)return;const b=p.b,w=webWords(b.text),min=Math.max(1,Math.round(w/180));
  const plain=b.text.replace(/\ufffcimg:\d+\n*/g,'').replace(/[\u2061\u2062\u2064]/g,'');
  let head=plain.slice(0,600);if(plain.length>600)head=head.replace(/\s+\S*$/,'')+'…';
  webMsg('<div class="bk-h">Что получилось</div><div class="bk-row"><span class="bk-k">'+esc(b.title)+'</span><span class="bk-v">'+esc(b.author)+'</span></div>'+
    '<div class="bk-note">Около '+min+' '+plural(min,'минуты','минут','минут')+' чтения'+(b.toc&&b.toc.length?' · '+b.toc.length+' '+plural(b.toc.length,'раздел','раздела','разделов'):'')+'</div>'+
    '<div class="bk-h">Начало текста</div><div class="bk-note advpre webpre">'+esc(head)+'</div>'+
    '<div class="bk-note">Если вместо статьи тут меню сайта, нажмите «Отмена» и вставьте нужный кусок текста в поле выше.</div>'+
    '<button type="button" class="cta" id="webAdd">'+rqIcon('book-open',18)+' На полку и читать</button>'+
    '<button type="button" class="buy advwant" id="webCancel">'+rqIcon('x',18)+' Отмена</button>');
  el('webAdd').onclick=webAddPend;
  el('webCancel').onclick=function(){WEB.pend=null;webMsg('');};
  try{el('webMsg').scrollIntoView({block:'start',behavior:'smooth'});}catch(e){}
}
async function webAddPend(){
  const p=WEB.pend;if(!p||WEB.busy)return;
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне','info');return;}
  if(webOnShelf(p.u)){webGo(p.u,false);return;}
  WEB.busy=true;
  {const ab=el('webAdd');if(ab){ab.disabled=true;ab.textContent=p.b.webImgs.length?'Забираю картинки…':'Добавляю…';}}
  try{await webStoreImgs(p.b.id,p.b.webImgs,p.b.text);}catch(e){}
  try{await rqAddBook(p.b);}catch(e){WEB.busy=false;flashMsg('Не удалось добавить: '+(e&&e.message||e),'info');return;}
  WEB.busy=false;WEB.pend=null;
  el('bookSheet').classList.add('hidden');
  try{renderLibrary();libFlashNew();}catch(e){}
  openBook(p.b.id);
}
/* сайт не пустил приложение (или страница пустая без скриптов): спросить про Jina Reader, рядом остальные пути */
function webNoCors(u,empty){
  webMsg('<div class="bk-note">'+(empty?'На этой странице текст появляется только в браузере, приложение его не видит.':'Этот сайт не даёт приложению открыть страницу напрямую.')+
    ' Можно открыть её через Jina Reader: это бесплатная служба, которая сама откроет страницу и отдаст текст. Адрес страницы уйдёт этой службе.</div>'+
    '<label class="webchk"><input type="checkbox" id="webJinaAlways"><span>Больше не спрашивать, сразу открывать через Jina Reader</span></label>'+
    '<button type="button" class="cta" id="webJina">'+rqIcon('download',18)+' Открыть через Jina Reader</button>'+
    '<div class="bk-note">Или вставьте в поле выше сам текст страницы, или сохраните страницу файлом.</div>');
  el('webJina').onclick=function(){if(el('webJinaAlways').checked)webJinaSet(true);webGo(u,true);};
}
async function webFromText(){
  const t=String(el('webIn').value||'').replace(/\r\n?/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
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
  if(rest.length>=WEB_MIN){WEB.shareUrl=url;webSheet({text:rest,title:o.title||''});return;} /* поделились выделенным текстом */
  WEB.shareUrl='';webSheet({url:url,go:!!url});
}

/* ---- карточка книги: «Обновить с сайта», «Открыть на сайте» (js/content.js bookInfo) ----
   Обновление переписывает текст этой книги (единственное место, где текст книги пишется второй раз, arch.md 13.11).
   Место в тексте: кусок текста у старого pos ищется в новом тексте; не нашёлся — pos как был. ratio только растёт. */
function webUrlOf(b){const u=String(b&&b.srcId||'').replace(/^web:/,'');return /^https?:\/\//.test(u)?u:'';}
function webCardHtml(b){
  if(!rqIsWebBook(b))return '';const u=webUrlOf(b);if(!u)return '';
  return '<div class="bk-h">Сайт</div><div class="bk-list">'+
    '<button type="button" class="bk-line" id="webRef" onclick="webRefresh(\''+esc(b.id)+'\')">'+rqIcon('rotate-cw',20)+'<span>Обновить с сайта</span></button>'+
    '<a class="bk-line" href="'+esc(u)+'" target="_blank" rel="noopener">'+rqIcon('compass',20)+'<span>Открыть на сайте</span></a>'+
    '</div><div class="bk-note" id="webRefMsg">Место в тексте сохранится. Если текст на сайте сильно поменялся, цитаты и выделения в этой странице могут сместиться.</div>';
}
function webRefMsg(h){const m=el('webRefMsg');if(m)m.innerHTML=h;}
async function webRefresh(id,viaJina){
  const b=(S.userBooks||[]).find(function(x){return x&&x.id===id;}),u=webUrlOf(b);
  if(!b||!u||WEB.busy)return;
  if(typeof R!=='undefined'&&R&&R.book&&R.book.id===id){flashMsg('Закройте страницу, потом обновите','info');return;}
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне','info');return;}
  if(navigator.onLine===false){flashMsg('Нет сети','info');return;}
  WEB.busy=true;const btn=el('webRef');if(btn){btn.disabled=true;btn.querySelector('span').textContent='Загружаю страницу…';}
  try{
    let r;
    try{r=await webFetchBook(u,viaJina);}
    catch(e){if(e&&e.nocors){
      webRefMsg('Этот сайт не даёт приложению открыть страницу напрямую. Можно открыть её через Jina Reader, адрес страницы уйдёт этой службе.'+
        '<label class="webchk"><input type="checkbox" id="webJinaAlways"><span>Больше не спрашивать</span></label>'+
        '<button type="button" class="buy advwant" id="webRefJina">'+rqIcon('rotate-cw',18)+' Обновить через Jina Reader</button>');
      el('webRefJina').onclick=function(){if(el('webJinaAlways').checked)webJinaSet(true);WEB.busy=false;webRefresh(id,true);};return;}
      throw e;}
    if(r.file)throw new Error('по ссылке теперь файл, а не страница');
    const nb=webMakeBook(r,u);
    let old=b.text;if(typeof old!=='string'||!old){try{old=await __rq.idb.getText(id);}catch(e){old='';}}
    if(old===nb.text){webRefMsg('На сайте ничего не изменилось.');return;}
    const p=S.progress[id];let pos=p&&typeof p.pos==='number'?p.pos:null;
    if(pos!==null&&old){const at=Math.floor(pos*old.length),snip=old.slice(at,at+80).trim();
      /* кусок может встречаться несколько раз — берём вхождение, ближайшее к тому же месту по доле текста */
      const want=pos*nb.text.length;let j=-1,best=Infinity;
      if(snip.length>=20)for(let k=nb.text.indexOf(snip);k>=0;k=nb.text.indexOf(snip,k+1)){const d=Math.abs(k-want);if(d<best){best=d;j=k;}}
      if(j>=0)pos=Math.min(1,Math.max(0,j/nb.text.length));}
    b.text=nb.text;b.toc=nb.toc;b.size=nb.text.length;
    await __rq.upsertUserBook(null,b,{text:nb.text});
    try{await webStoreImgs(id,nb.webImgs,nb.text);}catch(e){}
    if(p&&pos!==null){p.pos=pos;if(!(p.ratio>=pos))p.ratio=pos;}
    save();
    try{renderLibrary();}catch(e){}
    try{bookInfo(id);}catch(e){}
    flashMsg('Страница обновлена','info');
  }catch(e){console.warn('[rq] web refresh',e);webRefMsg('Не получилось: '+esc(e&&e.message||e));}
  finally{WEB.busy=false;const bt=el('webRef');if(bt){bt.disabled=false;const sp=bt.querySelector('span');if(sp)sp.textContent='Обновить с сайта';}}
}
