'use strict';
/* ===== Словари (05.11, Джессика: «давай словари», «можно скачать ещё и словари из топовых университетов мира»).
   Offline packs from main /dict/ (tools/gen-dict-packs.py): Русский Викисловарь (CC BY-SA, all word forms), WordNet (Princeton), Webster 1913
   (public domain). A pack = one file <id>.rqd: a JSON header line + gzip chunks of sorted lines (format in the tool). It is kept whole in
   Cache Storage (DK_CACHE) and read by slices: a lookup = binary search in the header → one chunk unzipped → binary search in its lines.
   Own dictionaries: StarDict (.ifo .idx .dict/.dict.dz [.syn]) or Lingvo DSL (.dsl / .dsl.dz) are turned into the same container on the phone.
   Where: «Действия» of a selection → «Значение», a double tap (SET.rx.gest.dbl = 'dict'), «Полная статья» under a hard word;
   online links (Cambridge, Oxford, Merriam-Webster, Викисловарь, Грамота) open the site. Nothing goes to S / the export: packs live in the cache. */
const DK_BASE=window.RQ_DICT_BASE||new URL((window.RQ_NS==='rqt'?'../':'./')+'dict/',location.href).href;
const DK_CACHE='rqdict' /* not «rq-…»: the main SW deletes old «rq-» caches */,DK_META=DK_BASE+'installed.json';
const DK={meta:null,heads:{},blobs:{},chunks:new Map(),cat:null,busy:'',prog:'',xy:null};
function dkNorm(w){return String(w||'').replace(/[́̀]/g,'').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();}
async function dkC(){return caches.open(DK_CACHE);}
async function dkMeta(){if(DK.meta)return DK.meta;try{const r=await (await dkC()).match(DK_META);DK.meta=r?await r.json():[];}catch(e){DK.meta=[];}if(!Array.isArray(DK.meta))DK.meta=[];return DK.meta;}
async function dkMetaSave(){await (await dkC()).put(DK_META,new Response(JSON.stringify(DK.meta),{headers:{'Content-Type':'application/json'}}));}
async function dkGunzip(blob){return await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text();}
/** the pack's header + its body blob (read once per session) */
async function dkOpen(m){
  if(DK.blobs[m.id])return DK.blobs[m.id];
  const r=await (await dkC()).match(m.url);if(!r)throw new Error('словарь не скачан');const b=await r.blob();
  let n=-1,from=0,txt='';const dec=new TextDecoder();
  while(n<0&&from<b.size){const part=new Uint8Array(await b.slice(from,from+262144).arrayBuffer());const i=part.indexOf(10);
    if(i>=0){txt+=dec.decode(part.slice(0,i));n=from+i;}else{txt+=dec.decode(part,{stream:true});from+=part.length;}}
  if(n<0)throw new Error('файл словаря испорчен');
  const h=JSON.parse(txt);DK.heads[m.id]=h;DK.blobs[m.id]={b:b,base:n+1};return DK.blobs[m.id];
}
async function dkChunk(m,sec,i){
  const k=m.id+'|'+sec+'|'+i;if(DK.chunks.has(k)){const v=DK.chunks.get(k);DK.chunks.delete(k);DK.chunks.set(k,v);return v;}
  const o=await dkOpen(m),c=DK.heads[m.id][sec][i],L=(await dkGunzip(o.b.slice(o.base+c[1],o.base+c[1]+c[2]))).split('\n');
  DK.chunks.set(k,L);while(DK.chunks.size>24)DK.chunks.delete(DK.chunks.keys().next().value);return L;
}
function dkKey(l){const t=l.indexOf('\t');return t<0?l:l.slice(0,t);}
async function dkFind(m,sec,k){
  await dkOpen(m);const a=DK.heads[m.id][sec];if(!a||!a.length)return null;
  let lo=0,hi=a.length-1,i=-1;while(lo<=hi){const md=(lo+hi)>>1;if(a[md][0]<=k){i=md;lo=md+1;}else hi=md-1;}if(i<0)return null;
  const L=await dkChunk(m,sec,i);lo=0;hi=L.length-1;
  while(lo<=hi){const md=(lo+hi)>>1,x=dkKey(L[md]);if(x===k)return L[md];if(x<k)lo=md+1;else hi=md-1;}return null;
}
/** English: WordNet's own rules for plurals and verb forms (no exception lists) */
function dkMorphyEn(w){const R=[['ies','y'],['sses','ss'],['ses','s'],['xes','x'],['zes','z'],['ches','ch'],['shes','sh'],['men','man'],['s',''],['es','e'],['es',''],['ed','e'],['ed',''],['ing','e'],['ing',''],['er',''],['est',''],['er','e'],['est','e'],['ied','y'],["'s",'']],o=[];
  R.forEach(function(r){if(w.length>r[0].length+1&&w.slice(-r[0].length)===r[0])o.push(w.slice(0,-r[0].length)+r[1]);});
  if(/(.)\1(ed|ing)$/.test(w))o.push(w.replace(/(.)\1(ed|ing)$/,'$1'));return o;}
function dkLemmas(f,line){return line.slice(line.indexOf('\t')+1).split('|').map(function(x){const n=+x[0];return f.slice(0,n)+x.slice(1);});}
/** all hits for a word: [{m, head, text, via}] — one per pack, packs of the book's language first */
async function dkLookup(word,lang){
  const w=dkNorm(word).replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu,'');if(!w)return [];
  const ms=(await dkMeta()).slice().sort(function(a,b){return (a.lang===lang?0:1)-(b.lang===lang?0:1);}),out=[];
  for(const m of ms){try{
    let line=await dkFind(m,'d',w),via='';
    if(!line){const f=await dkFind(m,'f',w);if(f)for(const l of dkLemmas(w,f)){line=await dkFind(m,'d',l);if(line){via=l;break;}}}
    if(!line&&m.lang==='en')for(const l of dkMorphyEn(w)){line=await dkFind(m,'d',l);if(line){via=l;break;}}
    if(line){const p=line.split('\t');out.push({m:m,head:p[1]||p[0],text:(p.slice(2).join('\t')||'').replace(/\\n/g,'\n'),via:via});}
  }catch(e){console.warn('[rq] dict',m.id,e);}}
  return out;
}
function dkLang(w){return /[а-яё]/i.test(w)?'ru':/[a-z]/i.test(w)?'en':'';}
function dkLinks(w,lang){const e=encodeURIComponent(w.toLowerCase());
  return (lang==='en'?[['Cambridge','https://dictionary.cambridge.org/dictionary/english/'+e],['Oxford','https://www.oxfordlearnersdictionaries.com/search/english/?q='+e],['Merriam-Webster','https://www.merriam-webster.com/dictionary/'+e]]
    :[['Викисловарь','https://ru.wiktionary.org/wiki/'+e],['Грамота','https://gramota.ru/poisk?query='+e]]);}
function dkBody(t){return t.split('\n').map(function(l){const s=l.trim();if(!s)return '';
  if(/^◆/.test(s))return '<p class="dkex">'+esc(s.replace(/^◆\s*/,''))+'</p>';if(/^•/.test(s))return '<p class="dksn">'+esc(s.replace(/^•\s*/,''))+'</p>';return '<p>'+esc(s)+'</p>';}).join('');}
/** the window with the entry, on top of the page */
async function dkShow(word,x,y){
  word=String(word||'').replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu,'').trim();if(!word)return;
  const lang=dkLang(word)||((R&&R.book&&R.book.lang)||'ru').slice(0,2),ms=await dkMeta(),hits=ms.length?await dkLookup(word,lang):[];
  const links='<div class="dklinks">'+dkLinks(word,lang).map(function(l){return '<a href="'+esc(l[1])+'" target="_blank" rel="noopener">'+esc(l[0])+'</a>';}).join('')+
    (typeof aiOn==='function'?'<button type="button" class="ghostbtn" id="dkAi">'+rqIcon('sparkles',16)+' Объясни</button>':'')+'</div>';
  let html;
  if(!ms.length)html='<p>Словари ещё не скачаны.</p><button type="button" class="ghostbtn" id="dkGet">'+rqIcon('download',16)+' Скачать словари</button>';
  else if(!hits.length)html='<p>В скачанных словарях этого слова нет.</p>';
  else html=hits.map(function(h){return '<section class="dkhit"><div class="dkh"><b>'+esc(h.head)+'</b><small>'+esc(h.m.name)+(h.via?' · форма слова «'+esc(h.via)+'»':'')+'</small></div>'+dkBody(h.text)+'</section>';}).join('');
  r2Note('book-marked',word,'<div class="dkbox">'+html+'</div>'+links,x==null?innerWidth/2:x,y==null?innerHeight*0.3:y);
  const n=el('rmNote');n.classList.add('dknote');
  if(el('dkGet'))el('dkGet').onclick=function(){rmFnHide();dkOpenSettings();};
  if(el('dkAi'))el('dkAi').onclick=function(){rmFnHide();if(!aiOn()){aiNoKey();return;}aiExplain({text:word,ctx:'',title:((R&&R.book)||{}).title||'',author:bookAuthor((R&&R.book)||{})||''});};
}
new MutationObserver(function(){const n=el('rmNote');if(n&&n.hidden)n.classList.remove('dknote');}).observe(el('rmNote'),{attributes:true,attributeFilter:['hidden']});
function dkOpenSettings(){try{if(typeof RX_EXP==='object')RX_EXP.dict=true;openGeneralSettings(true);setTimeout(function(){if(typeof gsOpen==='function')try{gsOpen('read',{noPush:true});}catch(e){}if(typeof rxRender==='function')rxRender();setTimeout(function(){const x=el('rxXdict');if(x)x.scrollIntoView({block:'start'});},200);},150);}catch(e){}}

/* ---------- catalog, download, delete ---------- */
async function dkCatalog(){if(DK.cat)return DK.cat;const r=await fetch(DK_BASE+'index.json',{cache:'no-cache'});if(!r.ok)throw new Error('каталог словарей недоступен');DK.cat=(await r.json()).packs||[];return DK.cat;}
async function dkInstall(p){
  if(DK.busy)return;DK.busy=p.id;DK.prog='0 %';dkRender();
  try{const url=DK_BASE+p.file,r=await fetch(url,{cache:'no-cache'});if(!r.ok||!r.body)throw new Error('файл не скачался ('+r.status+')');
    const tot=+r.headers.get('content-length')||p.size||0,rd=r.body.getReader(),parts=[];let got=0,last=0;
    for(;;){const c=await rd.read();if(c.done)break;parts.push(c.value);got+=c.value.length;if(tot&&Date.now()-last>300){last=Date.now();DK.prog=Math.min(99,Math.round(got/tot*100))+' %';dkRender();}}
    const blob=new Blob(parts);await (await dkC()).put(url,new Response(blob,{headers:{'Content-Type':'application/octet-stream'}}));
    const ms=await dkMeta();DK.meta=ms.filter(function(x){return x.id!==p.id;}).concat([{id:p.id,name:p.name,lang:p.lang,lic:p.lic,src:p.src,n:p.n,size:blob.size,url:url}]);
    await dkMetaSave();delete DK.blobs[p.id];flashMsg('Словарь «'+p.name+'» скачан',{kind:'info',icon:'check'});
  }catch(e){flashMsg('Не получилось скачать словарь: '+(e&&e.message||e));}
  finally{DK.busy='';DK.prog='';dkRender();}
}
async function dkRemove(id){
  const m=(await dkMeta()).find(function(x){return x.id===id;});if(!m)return;
  if(!await rqAsk({t:'Удалить словарь «'+m.name+'»?',p:'Его можно будет скачать или загрузить снова.',ok:'Удалить',danger:true}))return;
  try{await (await dkC()).delete(m.url);}catch(e){}DK.meta=DK.meta.filter(function(x){return x.id!==id;});await dkMetaSave();
  delete DK.blobs[id];delete DK.heads[id];[...DK.chunks.keys()].forEach(function(k){if(k.indexOf(id+'|')===0)DK.chunks.delete(k);});dkRender();
}

/* ---------- own dictionaries: StarDict / Lingvo DSL → the same container ---------- */
function dkHtmlText(s){if(!/[<&]/.test(s))return s;const d=new DOMParser().parseFromString('<div>'+s.replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|div|li)>/gi,'\n$&')+'</div>','text/html');return (d.body.textContent||'').replace(/\n{3,}/g,'\n\n').trim();}
async function dkBytes(f){const b=/\.dz$|\.gz$/i.test(f.name)?await new Response(f.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():await f.arrayBuffer();return new Uint8Array(b);}
async function dkStarDict(files){
  const by=function(re){return files.find(function(f){return re.test(f.name);});};
  const ifo=by(/\.ifo$/i),idx=by(/\.idx(\.gz)?$/i),dict=by(/\.dict(\.dz)?$/i),syn=by(/\.syn(\.dz)?$/i);
  if(!ifo||!idx||!dict)throw new Error('для StarDict нужны три файла: .ifo, .idx и .dict (или .dict.dz)');
  const info={};(await ifo.text()).split(/\r?\n/).forEach(function(l){const i=l.indexOf('=');if(i>0)info[l.slice(0,i).trim()]=l.slice(i+1).trim();});
  const I=await dkBytes(idx),D=await dkBytes(dict),dec=new TextDecoder(),b64=info.idxoffsetbits==='64',seq=info.sametypesequence||'',words=[];
  const dv=new DataView(I.buffer,I.byteOffset,I.byteLength);let i=0;
  while(i<I.length){let j=I.indexOf(0,i);if(j<0)break;const w=dec.decode(I.subarray(i,j));let off,sz;
    if(b64){off=dv.getUint32(j+1)*4294967296+dv.getUint32(j+5);sz=dv.getUint32(j+9);i=j+13;}else{off=dv.getUint32(j+1);sz=dv.getUint32(j+5);i=j+9;}
    let raw=D.subarray(off,off+sz),t;
    if(seq)t=dec.decode(raw);else{const parts=[];let k=0;while(k<raw.length){const ty=String.fromCharCode(raw[k]);const z=raw.indexOf(0,k+1);const e=z<0?raw.length:z;if(/[a-z]/.test(ty))parts.push(dec.decode(raw.subarray(k+1,e)));k=e+1;}t=parts.join('\n');}
    words.push([w,/[hgx]/.test(seq||'h')?dkHtmlText(t):t]);}
  const forms=[];if(syn){const S=await dkBytes(syn),sv=new DataView(S.buffer,S.byteOffset,S.byteLength);let k=0;
    while(k<S.length){const j=S.indexOf(0,k);if(j<0)break;forms.push([dec.decode(S.subarray(k,j)),sv.getUint32(j+1)]);k=j+5;}}
  return {name:info.bookname||ifo.name.replace(/\.ifo$/i,''),lang:'',words:words,syn:forms};
}
async function dkDsl(f){
  const u=await dkBytes(f);let t;
  if(u[0]===0xff&&u[1]===0xfe)t=new TextDecoder('utf-16le').decode(u);else if(u[0]===0xfe&&u[1]===0xff)t=new TextDecoder('utf-16be').decode(u);
  else{t=new TextDecoder('utf-8').decode(u);if(/\u0000/.test(t.slice(0,200)))t=new TextDecoder('utf-16le').decode(u);}
  const L=t.replace(/^﻿/,'').split(/\r?\n/),words=[];let name=f.name.replace(/\.dsl(\.dz)?$/i,''),heads=[],body=[];
  const flush=function(){if(heads.length&&body.length){const tx=body.join('\n');heads.forEach(function(h){words.push([h,tx]);});}heads=[];body=[];};
  const clean=function(s){return s.replace(/\{\{[^}]*\}\}/g,'').replace(/\[\/?(m\d?|b|i|u|c[^\]]*|p|ex|com|trn|!trs|\*|s|url|ref[^\]]*|lang[^\]]*|sup|sub|'|t)\]/g,'').replace(/\\([\[\]{}~@\\])/g,'$1').replace(/<<|>>/g,'').trim();};
  for(const l of L){if(/^#/.test(l)){const m=/^#NAME\s+"?([^"]+)"?/.exec(l);if(m)name=m[1];continue;}
    if(!l.trim())continue;
    if(/^[ \t]/.test(l)){body.push(clean(l));continue;}
    if(body.length)flush();heads.push(clean(l).replace(/\{[^}]*\}/g,'').replace(/\(([^)]*)\)/g,'$1'));}
  flush();return {name:name,lang:'',words:words,syn:[]};
}
async function dkBuild(src,id){
  const defs=new Map();src.words.forEach(function(x){const k=dkNorm(x[0]);if(!k||k.length>60)return;const t=String(x[1]||'').trim().slice(0,4000);if(!t)return;
    const o=defs.get(k);if(o)o[1]=(o[1]+'\n'+t).slice(0,6000);else defs.set(k,[x[0],t]);});
  const forms=new Map();src.syn.forEach(function(s){const f=dkNorm(s[0]),w=src.words[s[1]],l=w?dkNorm(w[0]):'';if(!f||!l||f===l||!defs.has(l))return;const o=forms.get(f)||new Set();o.add(l);forms.set(f,o);});
  const enc=function(f,l){let n=0;while(n<Math.min(f.length,l.length,9)&&f[n]===l[n])n++;return n+l.slice(n);};
  const cmp=function(a,b){return a<b?-1:a>b?1:0;};
  const lines=function(keys,fn){const res=[];let buf=[],sz=0,first=null;keys.forEach(function(k){if(first===null)first=k;const s=fn(k);buf.push(s);sz+=s.length*2;if(sz>=49152){res.push([first,buf.join('\n')]);buf=[];sz=0;first=null;}});if(buf.length)res.push([first,buf.join('\n')]);return res;};
  const dl=lines([...defs.keys()].sort(cmp),function(k){const v=defs.get(k);return k+'\t'+v[0].replace(/\t/g,' ')+'\t'+v[1].replace(/\t/g,' ').replace(/\n/g,'\\n');});
  const fl=lines([...forms.keys()].sort(cmp),function(f){return f+'\t'+[...forms.get(f)].map(function(l){return enc(f,l);}).join('|');});
  const gz=async function(s){return new Uint8Array(await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());};
  const blobs=[],D=[],F=[];let off=0;
  for(const [tgt,lst] of [[D,dl],[F,fl]])for(const c of lst){const z=await gz(c[1]);tgt.push([c[0],off,z.length]);blobs.push(z);off+=z.length;}
  const lang=(function(){let c=0,l=0;src.words.slice(0,400).forEach(function(w){if(/[а-яё]/i.test(w[0]))c++;else if(/[a-z]/i.test(w[0]))l++;});return c>=l?'ru':'en';})();
  const head={v:1,id:id,name:src.name.slice(0,60),lang:lang,lic:'свой файл',src:'',n:defs.size,nf:forms.size,d:D,f:F};
  return {blob:new Blob([JSON.stringify(head)+'\n'].concat(blobs)),head:head};
}
async function dkImport(files){
  files=[...files];if(!files.length)return;if(DK.busy)return;DK.busy='own';DK.prog='читаю файлы';dkRender();
  try{const dsl=files.find(function(f){return /\.dsl(\.dz)?$/i.test(f.name);});
    const src=dsl?await dkDsl(dsl):await dkStarDict(files);if(!src.words.length)throw new Error('в файле не нашлось слов');
    DK.prog='собираю словарь: '+fmtInt(src.words.length)+' слов';dkRender();
    const id='own-'+Date.now().toString(36),b=await dkBuild(src,id),url=DK_BASE+'own/'+id+'.rqd';
    await (await dkC()).put(url,new Response(b.blob,{headers:{'Content-Type':'application/octet-stream'}}));
    DK.meta=(await dkMeta()).concat([{id:id,name:b.head.name,lang:b.head.lang,lic:'свой файл',src:'',n:b.head.n,size:b.blob.size,url:url,own:true}]);await dkMetaSave();
    flashMsg('Словарь «'+b.head.name+'» добавлен: '+fmtInt(b.head.n)+' слов',{kind:'info',icon:'check'});
  }catch(e){flashMsg('Не получилось: '+(e&&e.message||e),{ms:5000});}
  finally{DK.busy='';DK.prog='';dkRender();}
}

/* ---------- where it opens ---------- */
{const m0=stMenu;stMenu=function(on){m0.apply(this,arguments);const m=el('ssMenu');if(!on||!m||m.hidden||!R.book)return;
  const t=stText();if(!t||t.length>60||stWords(t)>3)return;
  const who=m.querySelector('[data-a="who"]'),h='<button type="button" role="menuitem" data-a="dict">'+rqIcon('book-marked',18)+'<span>Значение</span></button>';
  if(who)who.insertAdjacentHTML('afterend',h);else m.insertAdjacentHTML('afterbegin',h);stBranch(m,el('ssMore'));};}
ST_ACT.dict=function(){const t=stText(),s=window.getSelection(),r=s&&s.rangeCount?s.getRangeAt(0).getBoundingClientRect():null;selDone();dkShow(t,r?r.left+r.width/2:null,r?r.bottom:null);};
RX_DBL.push(['dict','Значение слова']);
{const v0=viewerTap;viewerTap=function(cx,cy){DK.xy=[cx,cy];return v0.apply(this,arguments);};}
{const d0=rxDbl;rxDbl=function(a){if(a!=='dict')return d0.apply(this,arguments);const p=DK.xy;if(!p||R.mode!=='text')return;const w=r2WordAt(p[0],p[1]);if(w&&w.w)dkShow(w.w,p[0],p[1]);};}
/* a hard word's short meaning gets «Полная статья» */
{const n0=r2Note;r2Note=function(icon,title,html,x,y){n0.apply(this,arguments);if(icon!=='book-open'||!/словаря старинных слов/.test(html))return;
  const b=el('rmNote').querySelector('.rmnb');if(b){b.insertAdjacentHTML('beforeend','<button type="button" class="ghostbtn dkfull" id="dkFull">'+rqIcon('book-marked',16)+' Полная статья</button>');el('dkFull').onclick=function(e){e.stopPropagation();dkShow(title,x,y);};}};}

/* ---------- «Общие настройки → Чтение → Словари» ---------- */
{const c0=rmRxCards;rmRxCards=function(){return c0.apply(this,arguments)+rxCardHtml('dict','book-marked','Словари',
  '<div class="aisub">Значение слова без интернета: выделите слово → «Действия» → «Значение», или дважды тапните по слову (в «Жестах» выберите «Значение слова»). Словари хранятся на телефоне.</div>'+
  '<div id="dkList" class="dklist"></div>'+
  rxRow('','folder','Свой словарь из файла','StarDict (.ifo, .idx, .dict или .dict.dz, можно .syn) или Lingvo DSL (.dsl, .dsl.dz). Выберите все файлы словаря сразу','<button type="button" class="ghostbtn" id="dkOwnGo">Выбрать</button><input type="file" id="dkOwnIn" multiple hidden>','setstack')+
  '<div class="aisub">Оксфорд, Кембридж и Merriam-Webster платные, их нельзя скачать: в окне слова есть ссылки на их сайты.</div>');};}
{const w0=rmRxWire;rmRxWire=function(){w0.apply(this,arguments);const g=el('dkOwnGo'),i=el('dkOwnIn');if(g)g.onclick=function(){i.click();};if(i)i.onchange=function(){const f=this.files;dkImport(f).finally(function(){i.value='';});};};}
{const r0=rmRxRender;rmRxRender=function(x){r0.apply(this,arguments);dkRender();};}
function dkSize(b){return b>=1048576?(Math.round(b/104857.6)/10).toString().replace('.',',')+' МБ':Math.max(1,Math.round(b/1024))+' КБ';}
async function dkRender(){
  const box=el('dkList');if(!box)return;const ms=await dkMeta();
  try{rxHead('dict',ms.length?ms.map(function(m){return m.name;}).join(', '):'Не скачаны');}catch(e){}
  if(!RX_EXP.dict)return;
  let cat=null,err='';try{cat=await dkCatalog();}catch(e){err=e&&e.message||'нет связи';}
  const have=function(id){return ms.some(function(m){return m.id===id;});},row=function(id,name,about,meta,btn){return '<div class="dkrow" data-id="'+esc(id)+'"><span class="dkrl"><b>'+esc(name)+'</b><small>'+esc(about)+'</small><small class="dkm">'+esc(meta)+'</small></span>'+btn+'</div>';};
  let h='';
  (cat||[]).forEach(function(p){const on=have(p.id),busy=DK.busy===p.id;
    h+=row(p.id,p.name,p.about||'',fmtInt(p.n)+' слов · '+dkSize(p.size)+' · '+p.lic,busy?'<span class="dkprog">'+esc(DK.prog)+'</span>':on?'<button type="button" class="ghostbtn" data-dk="del">Удалить</button>':'<button type="button" class="ghostbtn" data-dk="get"'+(DK.busy?' disabled':'')+'>Скачать</button>');});
  ms.filter(function(m){return !(cat||[]).some(function(p){return p.id===m.id;});}).forEach(function(m){h+=row(m.id,m.name,m.own?'свой словарь из файла':'',fmtInt(m.n||0)+' слов · '+dkSize(m.size||0),'<button type="button" class="ghostbtn" data-dk="del">Удалить</button>');});
  if(DK.busy==='own')h+='<div class="dkrow"><span class="dkrl"><b>Свой словарь</b><small class="dkprog">'+esc(DK.prog)+'</small></span></div>';
  if(!cat)h+='<div class="aisub">Список словарей не загрузился'+(err?' ('+esc(err)+')':'')+'. Нужен интернет, чтобы скачать; скачанные работают и без него.</div>';
  box.innerHTML=h;
  box.querySelectorAll('[data-dk]').forEach(function(b){b.onclick=function(){const id=b.closest('.dkrow').dataset.id;if(b.dataset.dk==='del')dkRemove(id);else{const p=(cat||[]).find(function(x){return x.id===id;});if(p)dkInstall(p);}};});
}
(function(){const c=el('rxCard');if(c&&c.childNodes.length){c.innerHTML='';try{rxRender();}catch(e){console.warn('[rq] rx rebuild',e);}}})();
