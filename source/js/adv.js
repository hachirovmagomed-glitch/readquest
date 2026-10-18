'use strict';
/* ================= ПРИКЛЮЧЕНИЯ: бесплатные книги из открытых библиотек =================
   Джессика 18.10: a tab where anyone finds a free book, downloads it to the phone and reads it at once, without the story mode.
   Sources are a registry (ADV_SRC): each one searches its catalogue and turns one item into a book. Audio (LibriVox) can join
   later as kind:'audio'. Checked 18.10 from GitHub Actions (curl with Origin):
   - Викитека (ru.wikisource.org/w/api.php, origin=*): search and page text both send Access-Control-Allow-Origin: * → works from the phone.
     Only pages whose own categories carry a free licence (PD-…, CC-…, «Общественное достояние») can be downloaded.
   - Project Gutenberg: the OPDS catalogue (/ebooks/search.opds, /ebooks/N.opds) sends ACAO *, the book files (/cache/epub/…) do NOT.
     So the catalogue works; the file is fetched directly (in case that changes) and then through ADV_PROXY when one is set.
     Without a proxy the sheet offers the file itself: the browser saves it, «Добавить книгу» puts it on the shelf.
   Nothing here is stored except the downloaded book: rqAddBook() (same path as a file import) with two fields on the card,
   lang (already used by FB2 books) and srcId ('gutenberg:<n>' | 'wikisource:<page>'), arch.md 18.10. Browsing writes nothing. */
const ADV_PROXY=''; /* own CORS proxy for Gutenberg files, '' = none yet (needs Джессика's word: it is a server) */
const ADV_GUT='https://www.gutenberg.org';
const ADV_WS='https://ru.wikisource.org/w/api.php';
const ADV_WS_MAX=400; /* pages per book: «Война и мир» is ~370 chapter pages */
const ADV={src:'wikisource',q:'',lang:'ru',items:[],more:null,busy:false,err:'',seq:0,dl:false};
const ADV_LANGS=[['ru','Русские'],['en','English'],['de','Deutsch'],['fr','Français'],['','Все языки']];
const ADV_WS_HINTS=['Гомер','Шекспир','Данте','Сервантес','Диккенс','Гёте','Жюль Верн','Андерсен'];

function advOnShelf(sid){return (S.userBooks||[]).find(function(b){return b&&b.srcId===sid;})||null;}
async function advJson(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}
async function advXml(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return new DOMParser().parseFromString(await r.text(),'application/xml');}
function advNetErr(e){return navigator.onLine===false?'Нет сети. Каталог открывается только с интернетом, скачанные книги читаются без него':'Библиотека не ответила. Попробуйте ещё раз';}

/* ---------- Викитека ---------- */
/* «Гамлет (Шекспир; Кронеберг)» → title «Гамлет», author «Шекспир», translator «Кронеберг» */
function advWsName(page){const root=String(page).split('/')[0],m=root.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if(!m)return {t:root,a:'',tr:''};const p=m[2].split(';').map(function(s){return s.trim();});return {t:m[1],a:p[0]||'',tr:p[1]||''};}
function advWsFree(cats){return (cats||[]).some(function(c){const n=String(c&&c.category||c||'');return /^PD[-_]|^CC[-_]|^GFDL|Общественное_достояние|Свободн/i.test(n);});}
function advWsOld(sub){return /(^|\/|\(|\s)ДО(\)|\/|$|\s)/.test(sub);} /* «/ДО», «(ДО)» = pre-1918 spelling: the modern one is preferred */
const ADV_SRC={
  wikisource:{t:'Викитека',kind:'text',
    async search(q,more){
      const off=more||0;
      const d=await advJson(ADV_WS+'?action=query&format=json&formatversion=2&origin=*&list=search&srnamespace=0&srlimit=40&srsearch='+encodeURIComponent(q)+'&sroffset='+off);
      const seen={},out=[];
      ((d.query&&d.query.search)||[]).forEach(function(h){const root=String(h.title).split('/')[0];if(seen[root])return;seen[root]=1;
        const n=advWsName(root);out.push({sid:'wikisource:'+root,page:root,t:n.t,a:n.a,tr:n.tr,lang:'ru'});});
      return {items:out,more:d.continue&&d.continue.sroffset?d.continue.sroffset:null};},
    async info(it){
      const d=await advJson(ADV_WS+'?action=query&format=json&formatversion=2&origin=*&redirects=1&prop=categories|info&cllimit=max&titles='+encodeURIComponent(it.page));
      const p=(d.query&&d.query.pages||[])[0]||{};
      return {free:advWsFree(p.categories),size:p.length||0,missing:!!p.missing};},
    rows(it,inf){return [['Источник','Викитека'],['Автор',it.a||'не указан'],it.tr?['Перевод',it.tr]:null,['Язык','русский'],
      ['Права',inf.free?'Общественное достояние':'Викитека не отметила, что текст свободен']];},
    note(inf){return inf.free?'Книга бесплатная. Скачивается один раз и дальше читается без интернета. Минуты, опыт и серия считаются как у любой книги.':
      'Без отметки о свободной лицензии скачать нельзя: так мы не берём книги, на которые ещё действует авторское право.';},
    canGet(inf){return !!inf.free;},
    async get(it,prog){return advWsBook(it,prog);}},
  gutenberg:{t:'Гутенберг',kind:'text',
    async search(q,more){
      const qs=(q?q:'')+(ADV.lang?(q?' ':'')+'l.'+ADV.lang:'');
      const x=await advXml(more||(ADV_GUT+'/ebooks/search.opds/?sort_order=downloads&query='+encodeURIComponent(qs)));
      const out=[];
      Array.from(x.getElementsByTagName('entry')).forEach(function(e){
        const id=(e.getElementsByTagName('id')[0]||{}).textContent||'',m=id.match(/\/ebooks\/(\d+)\.opds/);if(!m)return;
        let t=((e.getElementsByTagName('title')[0]||{}).textContent||'').trim();
        if(ADV.lang)t=t.replace(/\s*\([A-Z][a-z]+\)$/,''); /* «Детство (Russian)»: the language is already the filter */
        const a=((e.getElementsByTagName('content')[0]||{}).textContent||'').trim().replace(/^(graf|count|sir|baron)\s+/i,''); /* «graf Leo Tolstoy» */
        out.push({sid:'gutenberg:'+m[1],n:m[1],t:t,a:a,lang:ADV.lang||'',cover:ADV_GUT+'/cache/epub/'+m[1]+'/pg'+m[1]+'.cover.small.jpg'});});
      const nx=Array.from(x.getElementsByTagName('link')).find(function(l){return l.getAttribute('rel')==='next';});
      return {items:out,more:nx?new URL(nx.getAttribute('href'),ADV_GUT).href:null};},
    async info(it){
      const x=await advXml(ADV_GUT+'/ebooks/'+it.n+'.opds');
      const e=x.getElementsByTagName('entry')[0];if(!e)return {missing:true};
      const ps=Array.from(e.getElementsByTagName('p')).map(function(p){return p.textContent.replace(/\s+/g,' ').trim();});
      const field=function(k){const p=ps.find(function(s){return s.indexOf(k+':')===0;});return p?p.slice(k.length+1).trim():'';};
      const lang=((e.getElementsByTagNameNS('http://purl.org/dc/terms/','language')[0]||{}).textContent||it.lang||'').trim();
      const an=((e.getElementsByTagName('author')[0]||{}).textContent||'').trim();
      const epub=Array.from(e.getElementsByTagName('link')).find(function(l){return l.getAttribute('type')==='application/epub+zip';});
      return {lang:lang,author:advGutAuthor(an)||it.a,downloads:field('Downloads'),rights:field('Rights'),summary:field('Summary').replace(/\s*\(This is an automatically generated summary\.\)$/,''),
        epub:epub?epub.getAttribute('href'):ADV_GUT+'/ebooks/'+it.n+'.epub.noimages',size:epub?Number(epub.getAttribute('length'))||0:0};},
    rows(it,inf){return [['Источник','Project Gutenberg'],['Автор',inf.author||it.a||'не указан'],['Язык',advLangName(inf.lang)],
      inf.downloads?['Скачиваний за месяц',inf.downloads]:null,['Права','Общественное достояние в США']];},
    note(inf){return 'Книга бесплатная. Скачивается один раз и дальше читается без интернета. Минуты, опыт и серия считаются как у любой книги.';},
    canGet(){return true;},
    async get(it,prog,inf){return advGutBook(it,prog,inf);}}
};
function advLangName(c){const m={ru:'русский',en:'английский',de:'немецкий',fr:'французский',es:'испанский',it:'итальянский',fi:'финский',nl:'нидерландский',pt:'португальский',la:'латынь',el:'греческий',zh:'китайский'};return m[c]||c||'не указан';}
function advGutAuthor(s){s=String(s||'').replace(/,?\s*\d{3,4}\??-\d{0,4}\??$/,'').trim();const p=s.split(/,\s*/).filter(function(x){return !/^(graf|count|sir|baron)$/i.test(x);});return p.length>=2?(p[1]+' '+p[0]):s;} /* «Austen, Jane» → «Jane Austen» */

/* page text: the header, licence, page numbers, notes and pictures go; paragraphs are blank-line separated (reader splits on \n\n) */
function advWsDoc(html){return new DOMParser().parseFromString('<div id="advroot">'+html+'</div>','text/html');}
function advWsText(doc){
  const root=doc.getElementById('advroot');
  root.querySelectorAll('.ws-noexport,#headertemplate,.headertemplate,.header_notes,.licenseContainer,.ws-license,.navbox,.metadata,.noprint,.mw-editsection,sup.reference,.reference,.references,.mw-references-wrap,.pagenum,.ws-pagenum,style,script,img,figure,.thumb,.mw-empty-elt,[style*="visibility:hidden"],[style*="display:none"]').forEach(function(n){n.remove();});
  return htmlToText(root.innerHTML);
}
function advWsSubs(doc,page){
  const pre=page+'/',out=[],seen={};
  doc.getElementById('advroot').querySelectorAll('a[title]').forEach(function(a){
    if(a.classList.contains('new')||a.closest('#headertemplate,.ws-noexport'))return;
    const t=a.getAttribute('title');if(t.indexOf(pre)!==0||seen[t])return;seen[t]=1;out.push(t);});
  const cur=out.filter(function(t){return !advWsOld(t.slice(pre.length));});
  return cur.length?cur:out;
}
async function advWsParse(page){
  const d=await advJson(ADV_WS+'?action=parse&format=json&formatversion=2&origin=*&redirects=1&prop=text|categories&page='+encodeURIComponent(page));
  if(d.error)throw new Error(d.error.info||d.error.code);
  return {html:d.parse.text||'',cats:d.parse.categories||[],title:d.parse.title||page};
}
/* a book is the page itself, or (when it links to its own subpages: volumes, chapters) the subpages in their order, depth ≤ 4 */
async function advWsBook(it,prog){
  const parts=[];let n=0;
  async function walk(page,depth,label){
    if(n>=ADV_WS_MAX)return;
    const p=await advWsParse(page);n++;prog('Скачиваю… '+n);
    const doc=advWsDoc(p.html),subs=depth<4?advWsSubs(doc,p.title):[];
    if(!subs.length){const t=advWsText(doc);if(t)parts.push({t:label,text:t});return;}
    for(const s of subs){if(n>=ADV_WS_MAX)break;await walk(s,depth+1,s.slice(it.page.length+1).split('/').filter(function(x){return !/^(ВТ|ДО)$|\((ВТ|ДО)\)$/.test(x);}).pop()||label);}
  }
  await walk(it.page,0,'');
  let text='';const toc=[];
  parts.forEach(function(p){if(parts.length>1&&p.t){toc.push({t:p.t.slice(0,80),off:text.length});if(p.text.indexOf(p.t)!==0)text+=p.t+'\n\n';}text+=p.text+'\n\n';});
  text=text.trim();
  if(text.length<200)throw new Error('на странице нет текста книги');
  return {title:it.t,author:it.a||'Викитека',text:text,toc:toc.length>1?toc:undefined,lang:'ru'};
}
async function advGutBook(it,prog,inf){
  const urls=[ADV_GUT+'/cache/epub/'+it.n+'/pg'+it.n+'.txt'];
  if(ADV_PROXY)urls.push(ADV_PROXY+encodeURIComponent(urls[0]));
  let txt='';
  for(const u of urls){try{prog('Скачиваю…');const r=await fetch(u,{cache:'no-store'});if(r.ok){txt=await r.text();break;}}catch(e){}}
  if(!txt){const e=new Error('nocors');e.nocors=true;throw e;}
  txt=txt.replace(/^﻿/,'').replace(/\r\n?/g,'\n');
  return {title:it.t,author:inf.author||it.a||'Project Gutenberg',text:txt,lang:inf.lang||it.lang||undefined};
}

/* ---------- экран ---------- */
function openAdv(){renderAdv();show('adv');if(!ADV.items.length&&!ADV.busy&&(ADV.src==='gutenberg'||ADV.q))advSearch();}
function renderAdv(){
  const src=ADV_SRC[ADV.src];
  const bar=el('advSrc');bar.innerHTML=Object.keys(ADV_SRC).map(function(k){return '<button type="button" class="fchip'+(k===ADV.src?' on':'')+'" data-src="'+k+'">'+esc(ADV_SRC[k].t)+'</button>';}).join('');
  bar.querySelectorAll('.fchip').forEach(function(b){b.onclick=function(){if(ADV.src===b.dataset.src)return;ADV.src=b.dataset.src;ADV.q='';ADV.seq++;ADV.busy=false;ADV.items=[];ADV.more=null;ADV.err='';renderAdv();if(ADV.src==='gutenberg'||ADV.q)advSearch();};});
  const lb=el('advLang');lb.hidden=ADV.src!=='gutenberg';
  lb.innerHTML=ADV_LANGS.map(function(l){return '<button type="button" class="fchip'+(l[0]===ADV.lang?' on':'')+'" data-l="'+l[0]+'">'+esc(l[1])+'</button>';}).join('');
  lb.querySelectorAll('.fchip').forEach(function(b){b.onclick=function(){ADV.lang=b.dataset.l;ADV.items=[];ADV.more=null;renderAdv();advSearch();};});
  const inp=el('advQ');if(document.activeElement!==inp)inp.value=ADV.q;
  inp.placeholder=ADV.src==='gutenberg'?'Название или автор, лучше латиницей':'Название или автор';
  advRenderList();
}
function advRenderList(){
  const box=el('advList');let h='';
  if(!ADV.items.length){
    if(ADV.busy)h='<div class="advempty">Ищу в библиотеке…</div>';
    else if(ADV.err)h='<div class="advempty">'+esc(ADV.err)+'</div>';
    else if(ADV.src==='wikisource'&&!ADV.q)h='<div class="advempty">Русская классика и переводы, свободные от авторского права. Попробуйте:</div><div class="chips advhints">'+
      ADV_WS_HINTS.map(function(s){return '<button type="button" class="fchip" data-q="'+esc(s)+'">'+esc(s)+'</button>';}).join('')+'</div>';
    else h='<div class="advempty">Ничего не нашлось. Попробуйте другое название или автора</div>';
  }else{
    h=ADV.items.map(function(it,i){const own=advOnShelf(it.sid);
      return '<button type="button" class="advrow" data-i="'+i+'"><span class="cover">'+advCover(it)+'</span><span class="advmeta"><b>'+esc(it.t)+'</b>'+
        '<span class="advauth">'+esc(it.a||'')+(it.tr?' · пер. '+esc(it.tr):'')+'</span>'+(own?'<span class="advown">'+rqIcon('check',14)+' На полке</span>':'')+'</span>'+rqIcon('chevron-right',18)+'</button>';}).join('');
    if(ADV.more)h+='<button type="button" class="buy advmore" id="advMore"'+(ADV.busy?' disabled':'')+'>'+(ADV.busy?'Загружаю…':'Показать ещё')+'</button>';
  }
  box.innerHTML=h;
  box.querySelectorAll('.advrow').forEach(function(b){b.onclick=function(){advOpen(ADV.items[+b.dataset.i]);};});
  box.querySelectorAll('.advhints .fchip').forEach(function(b){b.onclick=function(){ADV.q=b.dataset.q;el('advQ').value=ADV.q;advSearch();};});
  const mb=el('advMore');if(mb)mb.onclick=function(){advSearch(true);};
}
function advCover(it){const c=coverHtml({id:it.sid,title:it.t,author:it.a||''});
  return it.cover?'<img src="'+esc(it.cover)+'" alt="" loading="lazy" onerror="this.remove()">'+c:c;} /* real Gutenberg cover over the drawn one; no cover → the drawn one stays */
async function advSearch(more){
  const src=ADV_SRC[ADV.src],seq=++ADV.seq,q=ADV.q.trim();
  if(!more){ADV.items=[];ADV.more=null;}
  ADV.err='';
  if(!q&&ADV.src==='wikisource'){ADV.busy=false;advRenderList();return;}
  ADV.busy=true;advRenderList();
  try{const r=await src.search(q,more?ADV.more:null);if(seq!==ADV.seq)return;
    ADV.items=more?ADV.items.concat(r.items.filter(function(x){return !ADV.items.some(function(y){return y.sid===x.sid;});})):r.items;ADV.more=r.more;}
  catch(e){if(seq!==ADV.seq)return;console.warn('[rq] adv search',e);ADV.err=advNetErr(e);}
  ADV.busy=false;advRenderList();
}
let advT=0;
function advInput(){ADV.q=el('advQ').value;clearTimeout(advT);advT=setTimeout(function(){advSearch();},600);}

/* ---------- карточка книги ---------- */
let advCur=null;
async function advOpen(it){
  if(!it)return;advCur={it:it,inf:null};
  const src=ADV_SRC[it.sid.split(':')[0]];
  advSheet(it,src,null);el('bookSheet').classList.remove('hidden');
  let inf;try{inf=await src.info(it);}catch(e){console.warn('[rq] adv info',e);inf={err:advNetErr(e)};}
  if(!advCur||advCur.it!==it)return;advCur.inf=inf;
  if(!el('bookSheet').classList.contains('hidden'))advSheet(it,src,inf);
}
function advSheet(it,src,inf){
  const own=advOnShelf(it.sid),rows=inf&&!inf.err&&!inf.missing?src.rows(it,inf).filter(Boolean):[];
  let act='';
  if(own)act='<button type="button" class="cta" onclick="advRead()">Читать</button>';
  else if(!inf)act='<button type="button" class="cta" disabled>Загружаю…</button>';
  else if(inf.err||inf.missing)act='<div class="bk-note">'+esc(inf.err||'Такой книги в библиотеке больше нет')+'</div>';
  else if(inf.nocors)act='<div class="bk-note">Гутенберг пока не отдаёт файлы приложению напрямую. Скачайте файл в браузере, потом нажмите «Добавить книгу» в библиотеке и выберите его. Книга ляжет на полку, как любая другая.</div>'+
    '<a class="cta" href="'+esc(inf.epub)+'" target="_blank" rel="noopener">'+rqIcon('download',18)+' Скачать файл'+(inf.size?' · '+advSize(inf.size):'')+'</a>';
  else if(src.canGet(inf))act='<button type="button" class="cta" id="advGet" onclick="advGet()">'+rqIcon('download',18)+' Скачать на телефон и читать</button>';
  el('bookSheetBody').innerHTML=
    '<div class="bk-head"><div class="cover">'+advCover(it)+'</div><div class="bk-ttl"><b>'+esc(it.t)+'</b><div class="bk-sub">'+esc(it.a||'')+(it.tr?' · пер. '+esc(it.tr):'')+'</div></div></div>'+
    (inf&&inf.summary?'<div class="bk-note advsum" lang="en">'+esc(inf.summary)+'</div>':'')+
    (rows.length?'<div class="bk-h">О книге</div><div class="bk-list">'+rows.map(function(r){return '<div class="bk-row"><span class="bk-k">'+esc(r[0])+'</span><span class="bk-v">'+esc(r[1])+'</span></div>';}).join('')+'</div>':'')+
    (inf&&!inf.err&&!inf.missing&&!own&&!inf.nocors?'<div class="bk-note">'+esc(src.note(inf))+'</div>':'')+act;
}
function advSize(b){return b<1048576?Math.max(1,Math.round(b/1024))+' КБ':(b/1048576).toFixed(1).replace('.',',')+' МБ';}
function advRead(){const own=advCur&&advOnShelf(advCur.it.sid);if(!own)return;el('bookSheet').classList.add('hidden');openBook(own.id);}
async function advGet(){
  if(!advCur||!advCur.inf||ADV.dl)return;
  const it=advCur.it,inf=advCur.inf,src=ADV_SRC[it.sid.split(':')[0]];
  if(advOnShelf(it.sid)){advRead();return;}
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Книга открыта в другом окне','info');return;}
  ADV.dl=true;
  const btn=el('advGet'),prog=function(t){if(btn){btn.disabled=true;btn.textContent=t;}};
  try{
    let r;
    try{r=await src.get(it,prog,inf);}
    catch(e){
      if(e&&e.nocors){inf.nocors=true;if(advCur&&advCur.it===it)advSheet(it,src,inf);return;}
      console.warn('[rq] adv get',e);flashMsg(navigator.onLine===false?'Нет сети. Книга скачается один раз, дальше читается без интернета':'Не удалось скачать книгу: '+(e&&e.message||e),'info');
      if(advCur&&advCur.it===it)advSheet(it,src,inf);return;}
    const b={id:newBookId(),title:r.title,author:r.author,genre:src.t,stat:'Воображение',cover:'',text:r.text,toc:r.toc,lang:r.lang||undefined,srcId:it.sid,
      fname:it.sid.replace(/[^\p{L}\p{N}]+/gu,'-').slice(0,80)+'.txt',size:r.text.length};
    try{await rqAddBook(b);}catch(e){flashMsg('Не удалось добавить книгу: '+(e&&e.message||e),'info');if(advCur&&advCur.it===it)advSheet(it,src,inf);return;}
    el('bookSheet').classList.add('hidden');
    try{advRenderList();}catch(e){}
    openBook(b.id);
  }finally{ADV.dl=false;}
}
if(el('advQ')){el('advQ').addEventListener('input',advInput);el('advQ').addEventListener('keydown',function(e){if(e.key==='Enter'){clearTimeout(advT);ADV.q=el('advQ').value;advSearch();el('advQ').blur();}});}
