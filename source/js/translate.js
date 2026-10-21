/* --- Перевод выделенного (21.10, Джессика: «чтобы читателю не приходилось бегать между прогой и переводчиком») ---
   Кнопка «文A» на плашке выделения переводит прямо в читалке, на телефоне, без интернета. Движок — Firefox Translations
   (Bergamot, vendor/bergamot, MPL-2.0), пакеты языков — модели Mozilla (tools/gen-tr-models.py кладёт их в main /tr/).
   Пакет скачивается один раз по кнопке в Cache Storage RQ_NS+'_tr' (не RQ_NS+'-…': смена сборки его не стирает),
   оттуда же движок без сети (sw.js). Текст никуда не уходит. Ничего не пишет в S и в экспорт: что скачано — видно по кэшу.
   Ни опыта, ни монет. Запасные пути: свой ключ ИИ (content.js aiViaKey) и Google Переводчик в браузере. */
const TR_LANGS={en:'Английский',de:'Немецкий',fr:'Французский',es:'Испанский',it:'Итальянский',ru:'Русский'};
const TR_GEN={en:'английского',de:'немецкого',fr:'французского',es:'испанского',it:'итальянского',ru:'русского'};
const TR_CACHE=(window.RQ_NS||'rq')+'_tr';
/* пакеты лежат один раз на весь сайт: /readquest/tr/ (и для корня, и для /test/) */
const TR_BASE=window.RQ_TR_BASE||new URL((window.RQ_NS==='rqt'?'../':'./')+'tr/',location.href).href;
const TR_ENGINE=['vendor/bergamot/translator.js','vendor/bergamot/worker/translator-worker.js','vendor/bergamot/worker/bergamot-translator-worker.js','vendor/bergamot/worker/bergamot-translator-worker.wasm'];
const TR_ENGINE_MB=2; /* wasm 5 МБ, по сети сжат примерно до 2 */
let trReg=null,trEng=null,trCur=null,trSeq=0,trDl=null,trPick=false,trHave=0;
const TR_MEM={};
function trUrl(p){return new URL(p,document.baseURI).href;}
async function trRegistry(){
  if(trReg)return trReg;
  const c=await caches.open(TR_CACHE);const u=TR_BASE+'index.json';
  let r=null;try{r=await fetch(u,{cache:'no-cache'});if(!r.ok)r=null;}catch(e){}
  if(r){try{await c.put(u,r.clone());}catch(e){}}else r=await c.match(u);
  if(!r)throw new Error('нет связи');
  trReg=await r.json();return trReg;
}
/* какие направления нужны: прямое (enru) или через английский (de → en → ru) */
function trPath(reg,from,to){
  const P=reg.pairs||{};
  if(P[from+to])return [from+to];
  if(from!=='en'&&to!=='en'&&P[from+'en']&&P['en'+to])return [from+'en','en'+to];
  return null;
}
function trFiles(reg,path){const out=[];path.forEach(k=>{const f=reg.pairs[k].files;Object.keys(f).forEach(p=>out.push(f[p]));});return out;}
async function trCached(urls){const c=await caches.open(TR_CACHE);for(const u of urls){if(!await c.match(u))return false;}return true;}
async function trState(from,to){ /* {path, have, mb} — have: всё уже на телефоне */
  const reg=await trRegistry();const path=trPath(reg,from,to);if(!path)return {path:null};
  const c=await caches.open(TR_CACHE);let need=0;
  for(const f of trFiles(reg,path)){if(!await c.match(TR_BASE+f.name))need+=f.size||0;}
  const eng=await trCached(TR_ENGINE.map(trUrl));
  return {path,have:!need&&eng,mb:Math.max(1,Math.round(need/1048576)+(eng?0:TR_ENGINE_MB))};
}
async function trSha(buf){const h=await crypto.subtle.digest('SHA-256',buf);return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');}
/* скачивание пакета: движок (если ещё нет) + файлы направлений; прогресс в onp(доля 0..1) */
async function trDownload(path,onp,signal){
  const reg=await trRegistry();const c=await caches.open(TR_CACHE);
  const jobs=[];
  for(const u of TR_ENGINE.map(trUrl))if(!await c.match(u))jobs.push({u,size:u.endsWith('.wasm')?TR_ENGINE_MB*1048576:30000});
  for(const f of trFiles(reg,path))if(!await c.match(TR_BASE+f.name))jobs.push({u:TR_BASE+f.name,size:f.size||1,sha:f.sha256});
  const total=jobs.reduce((a,j)=>a+j.size,0)||1;let done=0;
  for(const j of jobs){
    const r=await fetch(j.u,{cache:'no-cache',signal});
    if(!r.ok)throw new Error('сервер ответил '+r.status);
    const rd=r.body.getReader(),parts=[];let got=0;
    for(;;){const x=await rd.read();if(x.done)break;parts.push(x.value);got+=x.value.length;onp(Math.min(1,(done+Math.min(got,j.size))/total));}
    const blob=new Blob(parts);
    if(j.sha&&await trSha(await blob.arrayBuffer())!==j.sha)throw new Error('файл пришёл с ошибкой, попробуйте ещё раз');
    await c.put(j.u,new Response(blob,{headers:{'Content-Type':r.headers.get('Content-Type')||'application/octet-stream'}}));
    done+=j.size;onp(Math.min(1,done/total));
  }
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
}
async function trGunzip(resp){
  return await new Response(resp.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
async function trEngine(){
  if(trEng)return trEng;
  trEng=(async()=>{
    const m=await import(trUrl(TR_ENGINE[0]));
    class Backing extends m.TranslatorBacking{
      async loadModelRegistery(){const r=await trRegistry();return Object.keys(r.pairs).map(k=>({from:k.slice(0,2),to:k.slice(2,4),files:r.pairs[k].files}));}
      async fetch(name){const c=await caches.open(TR_CACHE);const r=await c.match(TR_BASE+name);if(!r)throw new Error('пакет не скачан');return /\.gz$/.test(name)?trGunzip(r):r.arrayBuffer();}
    }
    const bk=new Backing({pivotLanguage:'en',downloadTimeout:0}); /* options go to the worker: no functions in them */
    bk.onerror=e=>{console.warn('[rq] translate',String(e&&e.stack||e));trEng=null;if(trCur)trRender(trCur,'err','Не получилось перевести: '+(e&&e.message||'ошибка')+'.');};
    return new m.LatencyOptimisedTranslator({},bk);
  })();
  trEng.catch(()=>{trEng=null;});
  return trEng;
}
/* язык выделенного: кириллица → ru; латиница → язык книги, если он из наших, иначе по частым словам */
const TR_SW={en:/\b(the|and|of|to|is|was|that|with|for|his|her|you|not|have|which|i|my|me|he|she|it|in|on|at|but|or|would|this|be|by|a)\b/g,de:/\b(der|die|das|und|ist|nicht|ich|zu|den|mit|sich|ein|eine|auf|dem|war)\b/g,
  fr:/\b(le|les|et|est|des|une|que|qui|dans|pas|du|il|elle|je|au|avec)\b/g,es:/\b(el|los|las|y|es|que|del|una|en|no|por|con|se|su|como)\b/g,
  it:/\b(il|gli|e|è|che|di|del|della|una|non|per|con|si|lo|sono|nel)\b/g};
function trDetect(t){
  const cy=(t.match(/[Ѐ-ӿ]/g)||[]).length,la=(t.match(/[A-Za-zÀ-ɏ]/g)||[]).length;
  if(cy>=la)return 'ru';
  const bl=String((R.book&&typeof bookLang==='function'&&bookLang(R.book))||'').slice(0,2).toLowerCase();
  const s=t.toLowerCase();let best='',bs=0;
  Object.keys(TR_SW).forEach(k=>{let n=(s.match(TR_SW[k])||[]).length;
    if(k==='de')n+=2*(s.match(/[äöüß]/g)||[]).length;if(k==='es')n+=2*(s.match(/[ñ¿¡]/g)||[]).length;if(k==='fr')n+=2*(s.match(/[çœêâû]/g)||[]).length;
    if(n>bs){bs=n;best=k;}});
  if(bs>=2)return best;
  return TR_LANGS[bl]&&bl!=='ru'?bl:'en';
}
function trTo(from){return from==='ru'?'en':(S.lang==='en'?'en':'ru');}
function trPair(q){return TR_LANGS[q.from]+' → '+TR_LANGS[q.to];}
el('spDict').onclick=()=>{
  const t=selText();if(!t)return;
  const text=t.replace(/\s+/g,' ').trim().slice(0,1500),from=trDetect(text);
  const q={text,ctx:typeof selCtx==='function'?selCtx(t.trim()):'',from,to:trTo(from),title:((R.book||{}).title||'').slice(0,200)};
  if(q.to===q.from)q.to=from==='en'?'ru':'en';
  selDone(); /* also closes a tapped quote's bar */
  trPick=false;trOpen(q);
};
el('trSheetClose').onclick=()=>{el('trSheet').classList.add('hidden');trSeq++;};
function trHead(q){
  const opts=Object.keys(TR_LANGS).filter(k=>k!==q.to||k==='ru');
  return '<div class="ai-q">«'+esc(q.text.length>160?q.text.slice(0,160)+'…':q.text)+'»</div>'+
    '<button type="button" class="tr-pair" id="trPairB" aria-expanded="'+(trPick?'true':'false')+'">'+esc(trPair(q))+rqIcon(trPick?'chevron-up':'chevron-down',16)+'</button>'+
    (trPick?'<div class="chips tr-langs" role="radiogroup" aria-label="Язык текста">'+opts.map(k=>'<button type="button" class="fchip'+(k===q.from?' on':'')+'" role="radio" aria-checked="'+(k===q.from)+'" data-l="'+k+'">с '+TR_GEN[k]+'</button>').join('')+'</div>':'');
}
function trWire(q){
  if(el('trPairB'))el('trPairB').onclick=()=>{trPick=!trPick;trOpen(q);};
  document.querySelectorAll('#trBody .tr-langs .fchip').forEach(b=>b.onclick=()=>{const f=b.dataset.l;trPick=false;
    const nq=Object.assign({},q,{from:f,to:trTo(f)});if(nq.to===f)nq.to=f==='en'?'ru':'en';trOpen(nq);});
  if(el('trAi'))el('trAi').onclick=()=>trViaAi(q);
  if(el('trWeb'))el('trWeb').onclick=()=>window.open('https://translate.google.com/?sl='+q.from+'&tl='+q.to+'&text='+encodeURIComponent(q.text.slice(0,1500)),'_blank','noopener');
}
function trAlt(q,ai){ /* запасные пути под основным */
  return '<div class="tr-alt">'+(ai&&typeof aiOn==='function'&&aiOn()?'<button type="button" class="ghostbtn" id="trAi">'+rqIcon('sparkles',16)+' Через ИИ</button>':'')+
    '<button type="button" class="ghostbtn" id="trWeb">'+rqIcon('languages',16)+' Google Переводчик</button></div>';
}
function trRender(q,state,x){
  if(trCur!==q)return;
  let h=trHead(q);
  if(state==='need')h+='<div class="tr-need">'+rqIcon('download',22)+'<div><b>Пакет «'+esc(trPair(q))+'»</b><span>'+x.mb+' МБ, скачивается один раз. Дальше переводит прямо на телефоне, без интернета.</span></div></div>'+
    '<button type="button" class="btn tr-dl" id="trDlB">'+rqIcon('download',18)+' Скачать '+x.mb+' МБ</button>'+trAlt(q,true);
  else if(state==='dl')h+='<div class="tr-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(x*100)+'"><i style="width:'+Math.round(x*100)+'%"></i></div>'+
    '<div class="ai-a ai-wait" role="status">Скачиваю пакет… '+Math.round(x*100)+'%</div><button type="button" class="ghostbtn" id="trDlStop">Отменить</button>';
  else if(state==='wait')h+='<div class="ai-a ai-wait" role="status">Перевожу…</div>';
  else if(state==='none')h+='<div class="ai-a">Для языка «'+esc(TR_LANGS[q.from])+'» пакета пока нет.</div>'+trAlt(q,true);
  else if(state==='err')h+='<div class="ai-a" role="alert">'+esc(x)+'</div><button type="button" class="ghostbtn" id="trRetry">'+rqIcon('rotate-cw',16)+' Ещё раз</button>'+trAlt(q,true);
  else{
    const word=q.text.length<=60&&R.book;
    h+='<div class="ai-a tr-out" lang="'+q.to+'">'+esc(x.text)+'</div>'+
      '<div class="tr-acts">'+(word?'<button type="button" class="ghostbtn" id="trToVocab">'+rqIcon('book-open',16)+' В словарь</button>':'')+
      '<button type="button" class="ghostbtn" id="trCopy">'+rqIcon('copy',16)+' Копировать</button></div>'+
      '<div class="ai-note">'+(x.ai?'Перевод ИИ, может ошибаться':'Переведено на телефоне, без интернета')+'</div>'+(x.ai?'':trAlt(q,true));
  }
  el('trBody').innerHTML=h;trWire(q);
  if(el('trDlB'))el('trDlB').onclick=()=>trGet(q,x.path);
  if(el('trDlStop'))el('trDlStop').onclick=()=>{if(trDl)trDl.abort();};
  if(el('trRetry'))el('trRetry').onclick=()=>trOpen(q);
  if(el('trCopy'))el('trCopy').onclick=()=>{copyText(x.text);flashMsg('Перевод скопирован');};
  if(el('trToVocab'))el('trToVocab').onclick=()=>trToVocab(q,x.text);
}
async function trOpen(q){
  trCur=q;const my=++trSeq;
  el('trSheet').classList.remove('hidden');
  const k=q.from+q.to+'\n'+q.text;
  if(TR_MEM[k]){trRender(q,'ok',TR_MEM[k]);return;}
  if(q.from===q.to){trRender(q,'ok',{text:q.text});return;}
  trRender(q,'wait');
  let st;
  try{st=await trState(q.from,q.to);}catch(e){if(my===trSeq)trRender(q,'err',navigator.onLine===false?'Пакеты перевода ещё не скачаны, а интернета нет. Подключитесь к сети, чтобы скачать пакет.':'Не получилось узнать, какие пакеты есть: '+(e&&e.message||'ошибка')+'.');return;}
  if(my!==trSeq)return;
  if(!st.path){trRender(q,'none');return;}
  if(!st.have){trRender(q,'need',st);return;}
  trRun(q,my);
}
async function trRun(q,my){
  trRender(q,'wait');
  try{
    const t=await trEngine();
    const r=await t.translate({from:q.from,to:q.to,text:q.text,html:false});
    const out={text:String(r.target.text||'').trim()};
    TR_MEM[q.from+q.to+'\n'+q.text]=out;
    if(my===trSeq)trRender(q,'ok',out);
  }catch(e){
    if(e&&/Superseded|Cancelled/.test(e.name||e.constructor&&e.constructor.name||''))return;
    if(my===trSeq)trRender(q,'err','Не получилось перевести'+(e&&e.message?': '+e.message:'')+'.');
  }
}
async function trGet(q,path){
  if(navigator.onLine===false){trRender(q,'err','Нужен интернет, чтобы скачать пакет.');return;}
  const my=++trSeq;trDl=typeof AbortController==='function'?new AbortController():null;
  trRender(q,'dl',0);
  let last=0;
  try{await trDownload(path,p=>{if(my===trSeq&&(p-last>=0.01||p===1)){last=p;trRender(q,'dl',p);}},trDl&&trDl.signal);}
  catch(e){trDl=null;if(my===trSeq)trRender(q,'err',e&&e.name==='AbortError'?'Скачивание отменено.':'Пакет не скачался: '+(e&&e.message||'ошибка')+'.');renderTrSet();return;}
  trDl=null;renderTrSet();
  if(my===trSeq)trRun(q,my);
}
async function trViaAi(q){
  const my=++trSeq;trRender(q,'wait');
  try{
    const out=await aiViaKey({system:'Ты переводчик в приложении для чтения книг. Переведи фрагмент на '+TR_LANGS[q.to].toLowerCase()+' язык точно и естественно. Ответь только переводом, без пояснений.',
      user:(q.title?'Книга: «'+q.title+'»\n':'')+'Фрагмент: «'+q.text+'»'+(q.ctx&&q.ctx!==q.text?'\nПредложение вокруг: «'+q.ctx+'»':'')},800);
    if(my===trSeq)trRender(q,'ok',{text:out.replace(/^«|»$/g,''),ai:true});
  }catch(e){if(my===trSeq)trRender(q,'err','ИИ не ответил: '+(e&&e.message||'ошибка')+'.');}
}
function trToVocab(q,tr){
  const word=q.text.trim().slice(0,60);if(!word)return;
  S.vocab=S.vocab||[];
  const v=S.vocab.find(x=>x.w.toLowerCase()===word.toLowerCase());
  if(v){v.ex=String(tr).slice(0,600);save();flashMsg('Перевод добавлен к «'+word+'»');}
  else{S.vocab.push({w:word,ctx:(q.ctx||'').slice(0,160),book:q.title,date:today(),box:0,ex:String(tr).slice(0,600)});save();flashMsg('«'+word+'» — в словарь');}
  el('trSheet').classList.add('hidden');
}
/* Настройки → Нейросети → «Перевод»: какие пакеты на телефоне, скачать или удалить */
async function renderTrSet(){
  const box=el('trList');if(!box)return;
  let reg;try{reg=await trRegistry();}catch(e){box.innerHTML='<div class="aisub">Список пакетов появится, когда будет интернет.</div>';trRow(0);return;}
  const c=await caches.open(TR_CACHE);const rows=[];let have=0;
  for(const k of Object.keys(reg.pairs)){
    const f=trFiles(reg,[k]);let ok=true,sz=0;for(const x of f){sz+=x.size||0;if(!await c.match(TR_BASE+x.name))ok=false;}
    if(ok)have++;rows.push({k,ok,mb:Math.max(1,Math.round(sz/1048576))});
  }
  box.innerHTML=rows.map(r=>'<div class="setrow tr-row"><div class="lab">'+esc(TR_LANGS[r.k.slice(0,2)]+' → '+TR_LANGS[r.k.slice(2,4)])+'<div class="sub">'+r.mb+' МБ'+(r.ok?' · на телефоне':'')+'</div></div>'+
    (r.ok?'<button type="button" class="ghostbtn" data-del="'+r.k+'" aria-label="Удалить пакет">'+rqIcon('trash-2',18)+'</button>'
         :'<button type="button" class="ghostbtn" data-get="'+r.k+'" aria-label="Скачать пакет">'+rqIcon('download',18)+'</button>')+'</div>').join('');
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{const k=b.dataset.del;
    for(const x of trFiles(reg,[k]))await c.delete(TR_BASE+x.name);
    if(trEng){try{(await trEng).delete();}catch(e){}trEng=null;}
    Object.keys(TR_MEM).forEach(m=>{if(m.slice(0,4)===k)delete TR_MEM[m];});renderTrSet();});
  box.querySelectorAll('[data-get]').forEach(b=>b.onclick=async()=>{b.disabled=true;b.innerHTML='0%';
    try{await trDownload([b.dataset.get],p=>{b.textContent=Math.round(p*100)+'%';});}catch(e){flashMsg('Пакет не скачался');}
    renderTrSet();});
  trRow(have);
}
function trRow(have){trHave=have;if(typeof nnRow==='function'&&el('trX'))nnRow('trX','languages','Перевод','Пакеты языков на телефоне',have?have+' '+plural(have,'пакет','пакета','пакетов'):'Нет пакетов',NN_EXP.tr);}
