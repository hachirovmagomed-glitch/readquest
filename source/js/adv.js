'use strict';
/* ================= ПРИКЛЮЧЕНИЯ: бесплатные книги из открытых библиотек =================
   Джессика 18.10: a tab where anyone finds a free book, downloads it to the phone and reads it at once, without the story mode.
   Sources are a registry (ADV_SRC): each one searches its catalogue and turns one item into a book. Audio (LibriVox) can join
   later as kind:'audio'. Checked 18.10 from GitHub Actions (curl with Origin):
   - Викитека (ru.wikisource.org/w/api.php, origin=*): search and page text both send Access-Control-Allow-Origin: * → works from the phone.
     Pages Wikisource marks as a rights problem cannot be downloaded; lists of editions open as a list to pick from.
   - Project Gutenberg: the OPDS catalogue (/ebooks/search.opds, /ebooks/N.opds) sends ACAO *, the book files (/cache/epub/…) do NOT.
     So the catalogue works; the file is fetched directly (in case that changes) and then through ADV_PROXY when one is set.
     Without a proxy the sheet offers the file itself: the browser saves it, «Добавить книгу» puts it on the shelf.
   Nothing here is stored except the downloaded book: rqAddBook() (same path as a file import) with two fields on the card,
   lang (already used by FB2 books) and srcId ('gutenberg:<n>' | 'wikisource:<page>'), arch.md 18.10. Browsing writes nothing. */
const ADV_PROXY=''; /* own CORS proxy for Gutenberg files, '' = none yet (needs Джессика's word: it is a server) */
const ADV_GUT='https://www.gutenberg.org';
const ADV_WS='https://ru.wikisource.org/w/api.php';
const ADV_WS_MAX=800; /* pages per book: «Война и мир» is ~370 chapter pages */
const ADV={src:'wikisource',q:'',lang:'ru',items:[],more:null,busy:false,err:'',seq:0,dl:false,set:null,alt:'',sseq:0};
const ADV_LANGS=[['ru','Русские'],['en','English'],['de','Deutsch'],['fr','Français'],['','Все языки']];
const ADV_WS_HINTS=['Гомер','Шекспир','Данте','Сервантес','Диккенс','Гёте','Жюль Верн','Андерсен'];
/* Джессика 18.10: ready collections on the first screen, one tap to a book. Wikisource titles checked live (GitHub Actions, 18.10) */
const ADV_SETS=[
  {id:'school',t:'Школьная программа',ic:'notebook',pages:['Евгений Онегин (Пушкин)','Капитанская дочка (Пушкин)','Герой нашего времени (Лермонтов)','Горе от ума (Грибоедов)','Ревизор (Гоголь)','Мёртвые души (Гоголь)','Тарас Бульба (Гоголь)','Недоросль (Фонвизин)','Бедная Лиза (Карамзин)','Гроза (Островский)','Отцы и дети (Тургенев)','Обломов (Гончаров)','Преступление и наказание (Достоевский)','Война и мир (Толстой)','Анна Каренина (Толстой)','Вишнёвый сад (Чехов)']},
  {id:'antiq',t:'Античность',ic:'amphora',pages:['Илиада (Гомер)','Одиссея (Гомер)','Басни Эзопа','История (Геродот; Мищенко)','Эдип царь (Софокл)','Антигона (Софокл)','Медея (Еврипид)','Энеида (Вергилий)','Метаморфозы (Овидий)','Сравнительные жизнеописания (Плутарх; Алексеев)']},
  {id:'quest',t:'Приключения и фантастика',ic:'compass',pages:['Робинзон Крузо (Дефо; Шишмарёва)','Путешествия Гулливера (Свифт)','Айвенго (Скотт)','Последний из могикан (Купер)','Три мушкетёра (Дюма)','Граф Монте-Кристо (Дюма)','Дети капитана Гранта (Верн; Бекетова)','Двадцать тысяч лье под водой (Верн)','Остров сокровищ (Стивенсон)','Машина времени (Уэллс)','Война миров (Уэллс)','Затерянный мир (Дойль; 1912)','Аэлита (Толстой)','Человек-амфибия (Беляев)']},
  {id:'tales',t:'Сказки',ic:'castle',pages:['Сказка о царе Салтане (Пушкин)','Сказка о рыбаке и рыбке (Пушкин)','Сказка о мёртвой царевне и о семи богатырях (Пушкин)','Конёк-горбунок (Ершов)','Стрекоза и Муравей (Крылов)','Чёрная курица, или Подземные жители (Погорельский)','Городок в табакерке (Одоевский)','Аленький цветочек (Аксаков)','Огниво (Андерсен; Ганзен)','Русалочка (Андерсен; Ганзен)','Гадкий утёнок (Андерсен; Ганзен)','Снежная королева (Андерсен; Ганзен)']},
  {id:'short',t:'Короткое на вечер',ic:'clock',pages:['Станционный смотритель (Пушкин)','Пиковая дама (Пушкин)','Шинель (Гоголь)','Нос (Гоголь)','Муму (Тургенев)','Бежин луг (Тургенев)','Ася (Тургенев)','Белые ночи (Достоевский)','После бала (Толстой)','Кавказский пленник (Толстой)','Каштанка (Чехов)','Хамелеон (Чехов)','Толстый и тонкий (Чехов)','Человек в футляре (Чехов)','Дама с собачкой (Чехов)']},
  {id:'gut',t:'Популярное на Гутенберге',ic:'flame',src:'gutenberg'}];
/* authors for the suggestions under the search field; the Latin spelling is how Gutenberg writes them */
const ADV_AUTHORS=[['Пушкин','Pushkin'],['Лермонтов','Lermontov'],['Гоголь','Gogol'],['Тургенев','Turgenev'],['Достоевский','Dostoyevsky'],['Толстой','Tolstoy'],
  ['Чехов','Chekhov'],['Гончаров','Goncharov'],['Островский','Ostrovsky'],['Грибоедов','Griboyedov'],['Крылов','Krylov'],['Карамзин','Karamzin'],['Горький','Gorky'],['Куприн','Kuprin'],['Бунин','Bunin'],
  ['Гомер','Homer'],['Софокл','Sophocles'],['Эсхил','Aeschylus'],['Еврипид','Euripides'],['Аристофан','Aristophanes'],['Платон','Plato'],['Вергилий','Virgil'],['Овидий','Ovid'],
  ['Данте','Dante'],['Шекспир','Shakespeare'],['Сервантес','Cervantes'],['Гёте','Goethe'],['Шиллер','Schiller'],['Байрон','Byron'],['Диккенс','Dickens'],['Остин','Austen'],['Бронте','Bronte'],
  ['Жюль Верн','Verne'],['Дюма','Dumas'],['Гюго','Hugo'],['Бальзак','Balzac'],['Флобер','Flaubert'],['Мопассан','Maupassant'],['Стендаль','Stendhal'],['Вольтер','Voltaire'],
  ['Марк Твен','Twain'],['Эдгар По','Poe'],['Джек Лондон','London'],['Купер','Cooper'],['Конан Дойл','Doyle'],['Стивенсон','Stevenson'],['Киплинг','Kipling'],['Уайльд','Wilde'],
  ['Свифт','Swift'],['Дефо','Defoe'],['Вальтер Скотт','Scott'],['Уэллс','Wells'],['Кэрролл','Carroll'],['Андерсен','Andersen'],['Братья Гримм','Grimm'],['Эзоп','Aesop']];

function advOnShelf(sid){return (S.userBooks||[]).find(function(b){return b&&b.srcId===sid;})||null;}
/* Wikisource answers 429 when a long book is fetched page by page: wait and retry instead of failing the whole download */
async function advJson(url){
  for(let i=0;;i++){const r=await fetch(url,{cache:'no-store'});
    if(r.ok)return r.json();
    if((r.status===429||r.status===503)&&i<4){await new Promise(function(f){setTimeout(f,(+r.headers.get('Retry-After')||0)*1000||800*(i+1)*(i+1));});continue;}
    throw new Error('HTTP '+r.status);}}
async function advXml(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return new DOMParser().parseFromString(await r.text(),'application/xml');}
function advNetErr(e){return navigator.onLine===false?'Нет сети. Каталог открывается только с интернетом, скачанные книги читаются без него':'Библиотека не ответила. Попробуйте ещё раз';}

/* «gecrby» typed with the English layout → «пушкин»; Cyrillic for Gutenberg → its Latin spelling («Достоевский» → «Dostoyevsky») */
const ADV_KB_EN="qwertyuiop[]asdfghjkl;'zxcvbnm,.`",ADV_KB_RU='йцукенгшщзхъфывапролджэячсмитьбюё';
function advLayout(s){return String(s).toLowerCase().replace(/./g,function(c){const i=ADV_KB_EN.indexOf(c);return i<0?c:ADV_KB_RU[i];});}
function advIsLayout(s){return /[a-z]/i.test(s)&&!/[а-яё]/i.test(s)&&advLayout(s)!==s.toLowerCase()&&/^[a-z\s\[\];',.`]+$/i.test(s);}
const ADV_TR={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
function advLatin(s){
  const low=String(s).trim().toLowerCase(),a=ADV_AUTHORS.find(function(x){return x[0].toLowerCase()===low;});if(a)return a[1];
  return low.split(/\s+/).map(function(w){const k=ADV_AUTHORS.find(function(x){return x[0].toLowerCase()===w;});if(k)return k[1];
    return w.replace(/[а-яё]/g,function(c){return ADV_TR[c];}).replace(/iy$/,'y');}).join(' ');}
function advAuthorHits(q){const l=q.toLowerCase(),r=advLayout(q);
  return ADV_AUTHORS.filter(function(x){const ru=x[0].toLowerCase(),la=x[1].toLowerCase();
    return [l,r].some(function(v){return v.length>=2&&(ru.indexOf(v)===0||ru.split(' ').pop().indexOf(v)===0||la.indexOf(v)===0);});}).slice(0,3);}
/* reading time before the download: ~2400 bytes of Russian UTF-8 a minute (as js/path.js), ~1300 Russian letters, ~1500 Latin ones */
function advMins(n,perMin){return Math.max(1,Math.round(n/perMin));}
function advTime(m){
  if(m<60){if(m>10)m=Math.round(m/5)*5;return 'около '+m+' '+(m%10===1&&m%100!==11?'минуты':'минут');}
  const h=Math.round(m/60);return 'около '+h+' '+(h%10===1&&h%100!==11?'часа':'часов');}
function advParts(n){const k=n%10,c=n%100;return n+' '+(k===1&&c!==11?'часть':k>=2&&k<=4&&(c<12||c>14)?'части':'частей');}
function advPreview(t){t=String(t).replace(/\s+/g,' ').trim();if(t.length<=420)return t;const c=t.slice(0,420),i=c.lastIndexOf(' ');return (i>300?c.slice(0,i):c)+'…';}

/* ---------- Викитека ---------- */
/* «Гамлет (Шекспир; Кронеберг)» → title «Гамлет», author «Шекспир», translator «Кронеберг» */
function advWsName(page){const root=String(page).split('/')[0],m=root.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if(!m)return {t:root,a:'',tr:''};const p=m[2].split(';').map(function(s){return s.trim();});return {t:m[1],a:p[0]||'',tr:p[1]||''};}
/* categories come as {title:'Категория:PD-old-70'} from action=query and as {category:'PD-old-70'} from action=parse */
function advWsCat(c){return String(c&&(c.title||c.category)||c||'').replace(/^Категория:/,'').replace(/_/g,' ');}
function advWsFree(cats){return (cats||[]).some(function(c){return /^PD[- ]|^CC[- ]|^GFDL|Общественное достояние|Свободн/i.test(advWsCat(c));});}
/* Wikisource keeps only free texts and marks the doubtful ones; many old poems carry no licence template at all */
function advWsBad(cats){return (cats||[]).some(function(c){return /нарушени|копивио|copyvio|к удалению|удаляем|несвобод|не свобод|авторск/i.test(advWsCat(c));});}
/* a list of editions or translations, a disambiguation page, a service list, an author page: not a book, the reader picks one of its links */
function advWsList(cats,props){return !!(props&&props.disambiguation!==undefined)||(cats||[]).some(function(c){return /^Списки |Служебные списки|Неоднозначн|Многозначн|^Авторы|^Персоналии/i.test(advWsCat(c));});}
function advWsItem(page){const n=advWsName(page);return {sid:'wikisource:'+page,page:page,t:n.t,a:n.a,tr:n.tr,lang:'ru'};}
function advWsOld(sub){return /(^|\/|\(|\s)ДО(\)|\/|$|\s)/.test(sub);} /* «/ДО», «(ДО)» = pre-1918 spelling: the modern one is preferred */
const ADV_SRC={
  wikisource:{t:'Викитека',kind:'text',
    async search(q,more){
      const off=more||0;
      const d=await advJson(ADV_WS+'?action=query&format=json&formatversion=2&origin=*&list=search&srnamespace=0&srlimit=40&srsearch='+encodeURIComponent(q)+'&sroffset='+off);
      const seen={},out=[];
      ((d.query&&d.query.search)||[]).forEach(function(h){const root=String(h.title).split('/')[0];if(seen[root])return;
        if(root!==h.title&&root.indexOf('(')<0)return; /* «ЭСБЕ/Гомер», «РБС/…»: an article of an encyclopedia or journal, not a book */
        seen[root]=1;
        out.push(advWsItem(root));});
      return {items:out,more:d.continue&&d.continue.sroffset?d.continue.sroffset:null};},
    async info(it){
      const d=await advJson(ADV_WS+'?action=query&format=json&formatversion=2&origin=*&redirects=1&prop=categories|info|pageprops&ppprop=disambiguation&cllimit=max&titles='+encodeURIComponent(it.page));
      const p=(d.query&&d.query.pages||[])[0]||{};
      if(p.missing)return {missing:true};
      const lic=advWsFree(p.categories),bad=advWsBad(p.categories);
      if(advWsList(p.categories,p.pageprops))return {list:await advWsLinks(p.title||it.page)};
      const peek=await advWsPeek(p.title||it.page).catch(function(e){console.warn('[rq] adv peek',e);return {};});
      return Object.assign({free:lic||!bad,lic:lic,size:p.length||0},peek);},
    rows(it,inf){return [['Источник','Викитека'],['Автор',it.a||'не указан'],it.tr?['Перевод',it.tr]:null,['Язык','русский'],
      inf.mins||inf.parts?['Объём',[inf.parts?advParts(inf.parts):'',inf.mins?advTime(inf.mins)+' чтения':''].filter(Boolean).join(' · ')]:null,
      ['Права',inf.lic?'Общественное достояние':inf.free?'Свободный текст Викитеки':'Викитека отметила, что права на текст под вопросом']];},
    note(inf){return inf.free?'Книга бесплатная. Скачивается один раз и дальше читается без интернета. Минуты, опыт и серия считаются как у любой книги.':
      'Скачать нельзя: так мы не берём книги, на которые ещё может действовать авторское право.';},
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
      const links=Array.from(e.getElementsByTagName('link')),epub=links.find(function(l){return l.getAttribute('type')==='application/epub+zip';});
      /* the catalogue gives no text size, only the files' sizes: the plain text is taken as ~1.3 × the no-images EPUB (a rough estimate) */
      const ep=links.find(function(l){return l.getAttribute('type')==='application/epub+zip'&&/\.noimages$/.test(l.getAttribute('href')||'')&&+l.getAttribute('length');});
      return {lang:lang,author:advGutAuthor(an)||it.a,downloads:field('Downloads'),rights:field('Rights'),summary:field('Summary').replace(/\s*\(This is an automatically generated summary\.\)$/,''),
        epub:epub?epub.getAttribute('href'):ADV_GUT+'/ebooks/'+it.n+'.epub.noimages',size:epub?Number(epub.getAttribute('length'))||0:0,
        mins:ep?advMins(+ep.getAttribute('length')*1.3,lang==='ru'?2400:1500):0};},
    rows(it,inf){return [['Источник','Project Gutenberg'],['Автор',inf.author||it.a||'не указан'],['Язык',advLangName(inf.lang)],
      inf.mins?['Объём',advTime(inf.mins)+' чтения']:null,inf.downloads?['Скачиваний за месяц',inf.downloads]:null,['Права','Общественное достояние в США']];},
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
/* the card's peek and the download that follows ask for the same pages: keep the last ones */
const advWsCache=new Map();
function advWsParse(page){
  if(advWsCache.has(page))return advWsCache.get(page);
  const pr=advWsParseNet(page);advWsCache.set(page,pr);pr.catch(function(){advWsCache.delete(page);});
  if(advWsCache.size>40)advWsCache.delete(advWsCache.keys().next().value);
  return pr;
}
/* the card shows the length and the opening lines: the page itself, or for a book in parts its first part times the number of parts */
async function advWsPeek(page){
  const p=await advWsParse(page),doc=advWsDoc(p.html),subs=advWsSubs(doc,p.title);
  if(!subs.length){const t=advWsText(doc);return t.length<200?{}:{mins:advMins(t.length,1300),preview:advPreview(t)};}
  const f=await advWsParse(subs[0]),d2=advWsDoc(f.html);
  if(advWsSubs(d2,f.title).length)return {parts:subs.length};
  const t=advWsText(d2);return {parts:subs.length,mins:advMins(t.length*subs.length,1300),preview:advPreview(t)};
}
async function advWsParseNet(page){
  const d=await advJson(ADV_WS+'?action=parse&format=json&formatversion=2&origin=*&redirects=1&prop=text|categories&page='+encodeURIComponent(page));
  if(d.error)throw new Error(d.error.info||d.error.code);
  return {html:d.parse.text||'',cats:d.parse.categories||[],title:d.parse.title||page};
}
/* the texts a list page links to, in page order: «Евгений Онегин (Пушкин)» → its editions, «Шекспир» → the works */
async function advWsLinks(page){
  const p=await advWsParse(page),doc=advWsDoc(p.html),out=[],seen={};
  doc.getElementById('advroot').querySelectorAll('a[title]').forEach(function(a){
    if(out.length>=60||a.classList.contains('new')||a.closest('#headertemplate,.ws-noexport,.navbox'))return;
    const href=a.getAttribute('href')||'',t=a.getAttribute('title');
    if(href.indexOf('/wiki/')!==0||/^[^:]+:/.test(t)&&!/^[^:]+: /.test(t)||t===p.title||seen[t])return;
    seen[t]=1;out.push(Object.assign(advWsItem(t),{ed:t.indexOf('/')>0?t.slice(t.indexOf('/')+1):''}));});
  return out;
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
function advSwitch(k){ADV.src=k;ADV.q='';ADV.seq++;ADV.busy=false;ADV.items=[];ADV.more=null;ADV.err='';ADV.set=null;ADV.alt='';advSugHide();renderAdv();if(ADV.src==='gutenberg')advSearch();}
function renderAdv(){
  const src=ADV_SRC[ADV.src];
  const bar=el('advSrc');bar.innerHTML=Object.keys(ADV_SRC).map(function(k){return '<button type="button" class="fchip'+(k===ADV.src?' on':'')+'" data-src="'+k+'">'+esc(ADV_SRC[k].t)+'</button>';}).join('');
  bar.querySelectorAll('.fchip').forEach(function(b){b.onclick=function(){if(ADV.src===b.dataset.src)return;advSwitch(b.dataset.src);};});
  const lb=el('advLang');lb.hidden=ADV.src!=='gutenberg';
  lb.innerHTML=ADV_LANGS.map(function(l){return '<button type="button" class="fchip'+(l[0]===ADV.lang?' on':'')+'" data-l="'+l[0]+'">'+esc(l[1])+'</button>';}).join('');
  lb.querySelectorAll('.fchip').forEach(function(b){b.onclick=function(){ADV.lang=b.dataset.l;ADV.items=[];ADV.more=null;renderAdv();advSearch();};});
  const inp=el('advQ');if(document.activeElement!==inp)inp.value=ADV.q;
  inp.placeholder=ADV.src==='gutenberg'?'Название или автор, лучше латиницей':'Название или автор';
  advRenderList();
}
function advRenderList(){
  const box=el('advList');let h='';const set=ADV.set&&ADV_SETS.find(function(x){return x.id===ADV.set;});
  if(set)h='<button type="button" class="advback" id="advBack">'+rqIcon('chevron-left',18)+' Все подборки</button><h2 class="advseth">'+esc(set.t)+'</h2>';
  else if(ADV.alt&&ADV.items.length)h='<div class="advalt">Показано по запросу «'+esc(ADV.alt)+'»</div>';
  if(!ADV.items.length){
    if(ADV.busy)h+='<div class="advempty">Ищу в библиотеке…</div>';
    else if(ADV.err)h+='<div class="advempty">'+esc(ADV.err)+'</div>';
    else if(ADV.src==='wikisource'&&!ADV.q)h+='<div class="advsets">'+ADV_SETS.map(function(x){
        return '<button type="button" class="advset" data-set="'+x.id+'">'+rqIcon(x.ic,22)+'<b>'+esc(x.t)+'</b><span>'+(x.pages?x.pages.length+' '+advBooks(x.pages.length):'мировая классика')+'</span></button>';}).join('')+'</div>'+
      '<div class="bk-h advauth-h">Авторы</div><div class="chips advhints">'+
      ADV_WS_HINTS.map(function(s){return '<button type="button" class="fchip" data-q="'+esc(s)+'">'+esc(s)+'</button>';}).join('')+'</div>';
    else h+='<div class="advempty">Ничего не нашлось. Попробуйте другое название или автора</div>';
  }else{
    h+=ADV.items.map(function(it,i){const own=advOnShelf(it.sid);
      return '<button type="button" class="advrow" data-i="'+i+'"><span class="cover">'+advCover(it)+'</span><span class="advmeta"><b>'+esc(it.t)+'</b>'+
        '<span class="advauth">'+esc(it.a||'')+(it.tr?' · пер. '+esc(it.tr):'')+'</span>'+(own?'<span class="advown">'+rqIcon('check',14)+' На полке</span>':'')+'</span>'+rqIcon('chevron-right',18)+'</button>';}).join('');
    if(ADV.more)h+='<button type="button" class="buy advmore" id="advMore"'+(ADV.busy?' disabled':'')+'>'+(ADV.busy?'Загружаю…':'Показать ещё')+'</button>';
  }
  box.innerHTML=h;
  box.querySelectorAll('.advrow').forEach(function(b){b.onclick=function(){advOpen(ADV.items[+b.dataset.i]);};});
  box.querySelectorAll('.advhints .fchip').forEach(function(b){b.onclick=function(){ADV.q=b.dataset.q;el('advQ').value=ADV.q;advSearch();};});
  box.querySelectorAll('.advset').forEach(function(b){b.onclick=function(){advSet(b.dataset.set);};});
  const bb=el('advBack');if(bb)bb.onclick=function(){ADV.set=null;ADV.items=[];advRenderList();};
  const mb=el('advMore');if(mb)mb.onclick=function(){advSearch(true);};
}
function advBooks(n){const k=n%10,c=n%100;return k===1&&c!==11?'книга':k>=2&&k<=4&&(c<12||c>14)?'книги':'книг';}
/* a collection is a fixed list: no search request, the cards ask the library when opened */
function advSet(id){const x=ADV_SETS.find(function(s){return s.id===id;});if(!x)return;
  if(x.src){advSwitch(x.src);return;}
  ADV.seq++;ADV.busy=false;ADV.err='';ADV.alt='';ADV.more=null;ADV.set=id;ADV.items=x.pages.map(advWsItem);advRenderList();
  const sc=el('adv');if(sc&&sc.scrollTo)sc.scrollTo(0,0);}
function advCover(it){const c=coverHtml({id:it.sid,title:it.t,author:it.a||''});
  return it.cover?'<img src="'+esc(it.cover)+'" alt="" loading="lazy" onerror="this.remove()">'+c:c;} /* real Gutenberg cover over the drawn one; no cover → the drawn one stays */
async function advSearch(more){
  const src=ADV_SRC[ADV.src],seq=++ADV.seq,q=ADV.q.trim();
  if(!more){ADV.items=[];ADV.more=null;ADV.alt='';}
  ADV.err='';ADV.set=null;
  if(!q&&ADV.src==='wikisource'){ADV.busy=false;advRenderList();return;}
  ADV.busy=true;advRenderList();
  try{let r=await src.search(q,more?ADV.more:null);if(seq!==ADV.seq)return;
    /* nothing found: the query was typed with the other layout, or in Cyrillic for an English catalogue */
    const alt=more?'':ADV.src==='wikisource'?(advIsLayout(q)?advLayout(q):''):(/[а-яё]/i.test(q)?advLatin(q):'');
    if(!r.items.length&&alt&&alt!==q){r=await src.search(alt,null);if(seq!==ADV.seq)return;ADV.alt=alt;}
    ADV.items=more?ADV.items.concat(r.items.filter(function(x){return !ADV.items.some(function(y){return y.sid===x.sid;});})):r.items;ADV.more=r.more;}
  catch(e){if(seq!==ADV.seq)return;console.warn('[rq] adv search',e);ADV.err=advNetErr(e);}
  ADV.busy=false;advRenderList();
}
let advT=0;
let advST=0;
function advInput(){ADV.q=el('advQ').value;clearTimeout(advT);clearTimeout(advST);advST=setTimeout(advSuggest,250);advT=setTimeout(function(){advSearch();},700);}
function advSugHide(){ADV.sseq++;clearTimeout(advST);const b=el('advSug');if(b){b.hidden=true;b.innerHTML='';}}
/* under the field while typing: matching authors, and on Wikisource the titles its own search box would offer */
async function advSuggest(){
  const q=ADV.q.trim(),seq=++ADV.sseq,box=el('advSug');if(!box)return;
  if(q.length<2){advSugHide();return;}
  const au=advAuthorHits(q);let ts=[];
  if(ADV.src==='wikisource'){
    const os=async function(v){const d=await advJson(ADV_WS+'?action=opensearch&format=json&origin=*&namespace=0&limit=10&search='+encodeURIComponent(v));return (d&&d[1])||[];};
    try{ts=await os(q);if(!ts.length&&advIsLayout(q))ts=await os(advLayout(q));}catch(e){ts=[];}
    const seen={};ts=ts.map(function(t){return String(t);}).filter(function(t){const r=t.split('/')[0];if(seen[r]||(r!==t&&r.indexOf('(')<0))return false;seen[r]=1;return true;})
      .map(function(t){return t.split('/')[0];}).slice(0,6);
  }
  if(seq!==ADV.sseq||ADV.q.trim()!==q)return;
  if(!au.length&&!ts.length){advSugHide();return;}
  box.innerHTML=au.map(function(a,i){return '<button type="button" class="advsugrow" data-a="'+i+'">'+rqIcon('user-round',18)+'<span><b>'+esc(ADV.src==='gutenberg'?a[1]:a[0])+'</b>'+(ADV.src==='gutenberg'?' <i>'+esc(a[0])+'</i>':'')+'</span></button>';}).join('')+
    ts.map(function(t,i){const n=advWsName(t);return '<button type="button" class="advsugrow" data-t="'+i+'">'+rqIcon('book-open',18)+'<span><b>'+esc(n.t)+'</b>'+(n.a?' <i>'+esc(n.a+(n.tr?' · пер. '+n.tr:''))+'</i>':'')+'</span></button>';}).join('');
  box.hidden=false;
  box.querySelectorAll('.advsugrow').forEach(function(b){b.onclick=function(){
    if(b.dataset.a!==undefined){const a=au[+b.dataset.a];ADV.q=ADV.src==='gutenberg'?a[1]:a[0];el('advQ').value=ADV.q;clearTimeout(advT);advSugHide();advSearch();}
    else{advSugHide();clearTimeout(advT);advOpen(advWsItem(ts[+b.dataset.t]));}};});
}

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
  if(inf&&inf.list){advListSheet(it,inf.list);return;}
  const own=advOnShelf(it.sid),rows=inf&&!inf.err&&!inf.missing?src.rows(it,inf).filter(Boolean):[];
  let act='';
  if(own)act='<button type="button" class="cta" onclick="advRead()">Читать</button>';
  else if(!inf)act='<button type="button" class="cta" disabled>Загружаю…</button>';
  else if(inf.err||inf.missing)act='<div class="bk-note">'+esc(inf.err||'Такой книги в библиотеке больше нет')+'</div>';
  else if(inf.nocors)act='<div class="bk-note">Гутенберг пока не отдаёт файлы приложению напрямую. Скачайте файл в браузере, потом нажмите «Добавить книгу» в библиотеке и выберите его. Книга ляжет на полку, как любая другая.</div>'+
    '<a class="cta" href="'+esc(inf.epub)+'" target="_blank" rel="noopener">'+rqIcon('download',18)+' Скачать файл'+(inf.size?' · '+advSize(inf.size):'')+'</a>';
  else if(src.canGet(inf))act='<button type="button" class="cta" id="advGet" onclick="advGet()">'+rqIcon('download',18)+' Скачать на телефон и читать</button>';
  el('bookSheetBody').innerHTML=
    '<div class="bk-head"><div class="cover">'+advCover(it)+'</div><div class="bk-ttl"><b>'+esc(it.t+(it.ed?' · '+it.ed:''))+'</b><div class="bk-sub">'+esc(it.a||'')+(it.tr?' · пер. '+esc(it.tr):'')+'</div></div></div>'+
    (inf&&inf.summary?'<div class="bk-note advsum" lang="en">'+esc(inf.summary)+'</div>':'')+
    (rows.length?'<div class="bk-h">О книге</div><div class="bk-list">'+rows.map(function(r){return '<div class="bk-row"><span class="bk-k">'+esc(r[0])+'</span><span class="bk-v">'+esc(r[1])+'</span></div>';}).join('')+'</div>':'')+
    (inf&&inf.preview?'<div class="bk-h">Начало</div><div class="bk-note advpre">'+esc(inf.preview)+'</div>':'')+
    (inf&&!inf.err&&!inf.missing&&!own&&!inf.nocors?'<div class="bk-note">'+esc(src.note(inf))+'</div>':'')+act;
}
function advListSheet(it,list){
  el('bookSheetBody').innerHTML=
    '<div class="bk-head"><div class="cover">'+advCover(it)+'</div><div class="bk-ttl"><b>'+esc(it.t)+'</b><div class="bk-sub">'+esc(it.a||'')+'</div></div></div>'+
    (list.length?'<div class="bk-note">Здесь несколько изданий или произведений. Выберите нужное.</div><div class="advlist">'+list.map(function(x,i){
      return '<button type="button" class="advrow" data-i="'+i+'"><span class="advmeta"><b>'+esc(x.t+(x.ed?' · '+x.ed:''))+'</b>'+(x.a||x.tr?'<span class="advauth">'+esc(x.a+(x.tr?' · пер. '+x.tr:''))+'</span>':'')+'</span>'+rqIcon('chevron-right',18)+'</button>';}).join('')+'</div>'
    :'<div class="bk-note">На этой странице нет ссылок на тексты. Попробуйте уточнить поиск.</div>');
  el('bookSheetBody').querySelectorAll('.advrow').forEach(function(b){b.onclick=function(){advOpen(list[+b.dataset.i]);};});
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
if(el('advQ')){el('advQ').addEventListener('input',advInput);el('advQ').addEventListener('keydown',function(e){if(e.key==='Enter'){clearTimeout(advT);ADV.q=el('advQ').value;advSugHide();advSearch();el('advQ').blur();}else if(e.key==='Escape')advSugHide();});}
