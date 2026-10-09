'use strict';
/* ================= ЦИТАТЫ ================= */
function renderQuotes(){
  const parts=[];
  allBooks().forEach(b=>{
    const qs=S.quotes[b.id]||[];if(!qs.length)return;
    parts.push('<h2>'+esc(b.title)+'</h2>');
    qs.forEach((q,i)=>{
      parts.push('<div class="qcard"><div class="qtext">«'+esc(q.text)+'»</div>'+
        (q.note?'<div class="qnote">📝 '+esc(q.note)+'</div>':'')+
        '<div class="qmeta"><span>'+q.date+'</span><div class="spacer"></div>'+
        '<button onclick="copyQuote(\''+b.id+'\','+i+')">копировать</button>'+
        '<button onclick="delQuote(\''+b.id+'\','+i+')">удалить</button></div></div>');
    });
  });
  el('quoteBox').innerHTML=parts.length?parts.join(''):
    '<div style="color:var(--muted);text-align:center;padding:50px 0">Выделите текст в книге пальцем или мышкой —<br>появится кнопка «🖍 Цитата».'+(isMvp()?'':'<br><br>Каждая цитата приносит +2 '+curI())+'</div>'; /* MVP: quotes give no coins → no promise */
}
function copyQuote(bid,i){
  const b=allBooks().find(x=>x.id===bid);const q=(S.quotes[bid]||[])[i];if(!b||!q)return;
  copyText('«'+q.text+'»'+(q.note?'\n📝 '+q.note:'')+'\n— '+b.title+', '+b.author);
}
function delQuote(bid,i){
  const qs=S.quotes[bid]||[];const rm=qs.splice(i,1)[0];
  if(rm){const h=S.hl[bid]||[];const j=h.indexOf(rm.text);if(j>-1)h.splice(j,1);}
  save();renderQuotes();
}
el('btnCopyAll').onclick=()=>{
  const parts=[];
  allBooks().forEach(b=>(S.quotes[b.id]||[]).forEach(q=>
    parts.push('«'+q.text+'»'+(q.note?' — '+q.note:'')+' ('+b.title+')')));
  if(parts.length){copyText(parts.join('\n\n'));alert('Скопировано цитат: '+parts.length);}
  else alert('Пока нет ни одной цитаты');
};

/* ================= МАГАЗИН ================= */
const SHOP_THEMES=[
 {id:'midnight',name:'Полночь',bg:'#0e1a2b',txt:'#a9c5e8',cost:120},
 {id:'kraft',name:'Крафт',bg:'#e8d9b5',txt:'#4a3b22',cost:120},
 {id:'forest',name:'Лес',bg:'#16241c',txt:'#b9d8c2',cost:150},
 {id:'lavender',name:'Лаванда',bg:'#f0eaff',txt:'#4a3b6b',cost:120},
 {id:'mint',name:'Мята',bg:'#eafff4',txt:'#1f4a38',cost:120},
 {id:'rose',name:'Роза',bg:'#2b0e1f',txt:'#e8a9c5',cost:150},
 {id:'ocean',name:'Океан',bg:'#0b2230',txt:'#9fd4e8',cost:150},
 {id:'coffee',name:'Кофе',bg:'#2a1f17',txt:'#d8c4a9',cost:150},
 {id:'matrix',name:'Матрица',bg:'#061206',txt:'#54d854',cost:200}
];
const CUR_ICONS=['🪙','💎','⭐','🍪','🔮','💰','🧿','🍀'];
function renderCur(){
  const box=el('curBox');box.innerHTML='';
  CUR_ICONS.forEach(ic=>{
    const b=document.createElement('button');
    b.className='curbtn'+(S.cur.icon===ic?' on':'');b.textContent=ic;
    b.onclick=()=>{S.cur={icon:ic,name:ic==='🪙'?'золото':'валюта'};save();renderShop();};
    box.appendChild(b);
  });
  const own=document.createElement('button');own.className='curbtn'+(CUR_ICONS.includes(S.cur.icon)?'':' on');
  own.textContent=CUR_ICONS.includes(S.cur.icon)?'＋':S.cur.icon;own.title='Своя валюта';
  own.onclick=()=>{
    const ic=prompt('Символ валюты (любой эмодзи):','🦄');if(!ic)return;
    const nm=prompt('Название валюты:','алмазики')||'валюта';
    S.cur={icon:ic.trim().slice(0,4),name:nm.trim().slice(0,20)};save();renderShop();
  };
  box.appendChild(own);
}
let shopLast='game';
function openShopTab(sub){
  if(sub!=='real')sub='game';
  shopLast=sub;
  if(el('shopGame'))el('shopGame').classList.toggle('hidden',sub!=='game');
  if(el('shopReal'))el('shopReal').classList.toggle('hidden',sub!=='real');
  document.querySelectorAll('.shtab').forEach(b=>b.classList.toggle('on',b.dataset.sub===sub));
}
function gearShopHtml(){
  return GEAR_CATS.map(function(cat){
    const items=SHOP_GEAR.filter(function(g){return catOf(g.slot)===cat[0];});
    if(!items.length)return '';
    return '<div class="gearsec-h">'+cat[1]+'</div>'+items.map(function(g){
      const owned=S.ownedGear.indexOf(g.id)>=0,on=S.equipped[g.slot]===g.id;
      return '<div class="shopitem"><div class="tprev gearprev">'+g.icon+'</div>'+
        '<div style="flex:1;min-width:0"><b>'+esc(g.name)+'</b><div style="font-size:12px;color:var(--muted)">'+esc(g.desc)+'</div></div>'+
        (owned?'<button class="buy owned" onclick="equipGear(\''+g.id+'\')">'+(on?'Снять':'Надеть')+'</button>'
              :'<button class="buy" '+(canAfford(g.cost)?'':'disabled')+' onclick="buyGear(\''+g.id+'\')">'+g.cost+' '+curI()+'</button>')+
        '</div>';
    }).join('');
  }).join('');
}
function renderShop(){
  renderCur();
  el('shopGold').textContent=curI()+' '+goldDisp();
  el('shopGear').innerHTML=gearShopHtml();
  el('shopPixel').innerHTML=pixelShopHtml();
  el('shopThemes').innerHTML=SHOP_THEMES.map(t=>{
    const owned=S.owned.includes(t.id);
    return '<div class="shopitem"><div class="tprev" style="background:'+t.bg+';color:'+t.txt+'">Aa</div>'+
      '<div style="flex:1;min-width:0"><b>'+t.name+'</b><div style="font-size:12px;color:var(--muted)">тема читалки</div></div>'+
      (owned
        ?'<button class="buy owned" onclick="useTheme(\''+t.id+'\')">Применить</button>'
        :'<button class="buy" '+(canAfford(t.cost)?'':'disabled')+' onclick="buyTheme(\''+t.id+'\')">'+t.cost+' '+curI()+'</button>')+
      '</div>';
  }).join('');
  renderRewards();
  openShopTab(shopLast);
}
function buyTheme(id){
  const t=SHOP_THEMES.find(x=>x.id===id);
  if(!t||S.owned.includes(id)||!canAfford(t.cost))return;
  spend(t.cost);S.owned.push(id);save();confetti();renderShop();
}
function useTheme(id){
  SET.theme=id;SET.cBg=null;SET.cTxt=null;saveSet();applySet();
  alert('Тема применена! Откройте любую книгу 📖');
}
function renderRewards(){
  el('shopRewards').innerHTML=S.rewards.map((r,i)=>({r:r,i:i}))
    .sort((a,b)=>(b.r.fav?1:0)-(a.r.fav?1:0))
    .map(function(o){
      const r=o.r,i=o.i;
      const infinite=(r.qty==null);
      const remain=infinite?'∞':Math.max(0,(r.qty||0)-(r.bought||0));
      const sold=!infinite&&remain<=0;
      const canBuy=canAfford(r.cost)&&!sold;
      return '<div class="shopitem"><div class="tprev">🎁</div>'+
        '<div style="flex:1;min-width:0"><b>'+(r.fav?'⭐ ':'')+esc(r.name)+'</b>'+
        '<div style="font-size:12px;color:var(--muted)">'+
          (infinite?'∞ · получено '+(r.bought||0):'осталось '+remain+' · получено '+(r.bought||0))+
          ' · <button class="lnk" onclick="toggleRewardFav('+i+')">'+(r.fav?'★':'☆')+'</button>'+
          ' · <button class="lnk" onclick="editReward('+i+')">изм.</button>'+
          (r.bought>0?' · <button class="lnk" onclick="undoRewardClaim('+i+')">отмена</button>':'')+
          ' · <button class="lnk danger" onclick="delReward('+i+')">удалить</button>'+
        '</div></div>'+
        '<button class="buy" '+(canBuy?'':'disabled')+' onclick="buyReward('+i+')">'+r.cost+' '+curI()+'</button></div>';
    }).join('');
}
function buyReward(i){
  const r=S.rewards[i];if(!r||!canAfford(r.cost))return;
  const infinite=(r.qty==null);
  if(!infinite&&((r.qty||0)-(r.bought||0))<=0){alert('Награда закончилась');return;}
  spend(r.cost);r.bought=(r.bought||0)+1;
  S.rewardPurchases=S.rewardPurchases||[];S.rewardPurchases.push({id:'rp_'+Date.now(),title:r.name,price:r.cost,at:new Date().toISOString()});
  save();confetti();renderShop();
  alert('🎉 Награда ваша: «'+r.name+'»! Вы заслужили её чтением.');
}
function undoRewardClaim(i){
  const r=S.rewards[i];if(!r||!(r.bought>0))return;
  if(!confirm('Отменить последнее получение «'+r.name+'» и вернуть '+r.cost+' '+curI()+'?'))return;
  r.bought--;S.gold+=r.cost;
  save();renderShop();
}
function toggleRewardFav(i){const r=S.rewards[i];if(!r)return;r.fav=!r.fav;save();renderShop();}
function editReward(i){
  const r=S.rewards[i];if(!r)return;
  const name=prompt('Название награды:',r.name);if(name===null)return;if(name.trim())r.name=name.trim().slice(0,60);
  const cost=parseInt(prompt('Цена в '+S.cur.name+':',r.cost),10);if(cost&&cost>0)r.cost=Math.min(999,cost);
  const q=prompt('Количество (пусто или 0 — бесконечно):',r.qty==null?'':r.qty);
  if(q!==null){const qn=parseInt(q,10);r.qty=(!qn||qn<=0)?null:qn;}
  save();renderShop();
}
function delReward(i){if(!confirm('Удалить награду?'))return;S.rewards.splice(i,1);save();renderShop();}
el('btnAddReward').onclick=()=>{
  const name=prompt('Название награды (например, «Эпизод сериала»):');if(!name||!name.trim())return;
  const cost=parseInt(prompt('Цена в '+S.cur.name+':','100'),10);
  if(!cost||cost<1)return;
  const q=parseInt(prompt('Количество (пусто/0 — бесконечно):','0'),10);
  S.rewards.push({name:name.trim().slice(0,60),cost:Math.min(999,cost),bought:0,qty:(!q||q<=0)?null:q,fav:false,item:null});
  save();renderShop();
};

/* ================= КВЕСТЫ ================= */
function distinctStats(){return allStats().filter(s=>(S.stats[s]||0)>0).length;}
const QUESTS=[
 {id:'daily30',name:'Прочитать 30 минут за день',reward:50,period:()=>today(),prog:()=>Math.min(1,S.minToday/30),info:()=>Math.round(S.minToday)+' / 30 мин'},
 {id:'genre3',name:'Качнуть 3 разные характеристики',reward:100,period:()=>'once',prog:()=>Math.min(1,distinctStats()/3),info:()=>distinctStats()+' / 3'},
 {id:'finish2',name:'Дочитать 2 книги',reward:200,period:()=>'once',prog:()=>Math.min(1,S.finished.length/2),info:()=>S.finished.length+' / 2'},
 {id:'streak7q',name:'Удержать стрик 7 дней',reward:150,period:()=>'once',prog:()=>Math.min(1,S.streak/7),info:()=>S.streak+' / 7'},
 {id:'chain1',name:'📖 Путь читателя I: дочитать книгу',reward:100,period:()=>'once',prog:()=>Math.min(1,S.finished.length/1),info:()=>S.finished.length+' / 1'},
 {id:'chain2',name:'📖 Путь читателя II: 3 книги',reward:250,period:()=>'once',prog:()=>Math.min(1,S.finished.length/3),info:()=>S.finished.length+' / 3',need:'chain1'},
 {id:'chain3',name:'📖 Путь читателя III: 5 книг',reward:500,period:()=>'once',prog:()=>Math.min(1,S.finished.length/5),info:()=>S.finished.length+' / 5',need:'chain2'},
 {id:'month10',name:'🏆 Сезонный: 10 дней чтения в этом месяце',reward:300,period:()=>today().slice(0,7),prog:()=>Math.min(1,monthDays()/10),info:()=>monthDays()+' / 10'}
];
function monthDays(){
  const m=today().slice(0,7);
  return Object.keys(S.hist).filter(d=>d.startsWith(m)&&(S.hist[d].min||0)>=1).length;
}
function renderQuests(){
  if(el('qstGold'))el('qstGold').textContent=curI()+' '+goldDisp();
  el('questBox').innerHTML=allQuests().map(q=>{
    const key=q.id+':'+q.period();
    const done=!!S.claimed[key];
    const locked=q.need&&!S.claimed[q.need+':once'];
    const p=locked?0:q.prog();
    const edit=q.custom?'<button style="color:var(--muted);text-decoration:underline;font-size:11px;padding:0 6px" onclick="editCustomQuest(\''+q.id+'\')">изм.</button><button class="x" onclick="delCustomQuest(\''+q.id+'\')">✕</button>':'';
    return '<div class="pcard quest'+(locked?' locked':'')+'"><div class="row"><span style="font-size:14px">'+q.name+'</span><div class="spacer"></div>'+
      (locked?'<span class="chip">🔒</span>'
        :done?'<span class="chip">✅ получено</span>'
        :p>=1?'<button class="buy" onclick="claimQuest(\''+q.id+'\')">Забрать +'+q.reward+' '+curI()+'</button>'
        :'<span class="chip">'+q.info()+'</span>')+
      edit+
      '</div><div class="pbar"><i style="width:'+Math.round(p*100)+'%"></i></div></div>';
  }).join('')+'<button class="miniadd" onclick="addCustomQuest()">＋ Добавить свой квест</button>';
}
function claimQuest(id){
  if(isMvp()){flashMsg('В MVP — только дневной/недельный квест в профиле');return;}
  const q=allQuests().find(x=>x.id===id);if(!q)return;
  const key=q.id+':'+q.period();
  if(S.claimed[key]||q.prog()<1)return;
  S.claimed[key]=true;S.gold+=q.reward;S.goldAllTime=(S.goldAllTime||0)+q.reward;save();confetti();renderQuests();
}

/* ================= PDF ================= */
function loadPdfJs(){
  return new Promise(function(res,rej){
    if(window.pdfjsLib)return res();
    const s=document.createElement('script');
    /* vendored with the build (vendor/pdfjs, pdf.js 3.11.174) — works offline / without a CDN */
    s.src='vendor/pdfjs/pdf.min.js';
    s.onload=function(){
      window.pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdfjs/pdf.worker.min.js';
      res();
    };
    s.onerror=function(){rej(new Error('не загрузился PDF-модуль (vendor/pdfjs)'));};
    document.head.appendChild(s);
  });
}
function idb(){
  /* Same DB as storage/idb.js (v3: files + sessions + events). Prefer __rq.idb when booted. */
  if(__rq&&__rq.idb&&__rq.idb.openDb)return __rq.idb.openDb();
  return new Promise(function(res,rej){
    const r=indexedDB.open(RQ_K.idb,3);
    r.onupgradeneeded=function(){
      const db=r.result;
      if(!db.objectStoreNames.contains('files'))db.createObjectStore('files');
      if(!db.objectStoreNames.contains('sessions')){
        const s=db.createObjectStore('sessions',{keyPath:'id',autoIncrement:true});
        s.createIndex('byDate','date',{unique:false});
        s.createIndex('byBookId','bookId',{unique:false});
      }
      if(!db.objectStoreNames.contains('events')){
        const e=db.createObjectStore('events',{keyPath:'id',autoIncrement:true});
        e.createIndex('byDate','date',{unique:false});
        e.createIndex('byBookId','bookId',{unique:false});
      }
    };
    r.onsuccess=function(){res(r.result);};
    r.onerror=function(){rej(r.error);};
  });
}
async function idbPut(k,v){
  if(__rq&&__rq.idb&&__rq.idb.put)return __rq.idb.put(k,v);
  const d=await idb();
  return new Promise(function(res,rej){
    const t=d.transaction('files','readwrite');
    t.objectStore('files').put(v,k);
    t.oncomplete=res;t.onerror=function(){rej(t.error);};
  });
}
async function idbGet(k){
  if(__rq&&__rq.idb&&__rq.idb.get)return __rq.idb.get(k);
  const d=await idb();
  return new Promise(function(res,rej){
    const g=d.transaction('files').objectStore('files').get(k);
    g.onsuccess=function(){res(g.result);};
    g.onerror=function(){rej(g.error);};
  });
}

/* ================= EPUB ================= */
function loadJSZip(){
  return new Promise(function(res,rej){
    if(window.JSZip)return res();
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload=function(){res();};
    s.onerror=function(){rej(new Error('нет сети для загрузки EPUB-модуля'));};
    document.head.appendChild(s);
  });
}
function decodeEntities(s){
  return s.replace(/&#(\d+);/g,(m,n)=>String.fromCharCode(+n))
    .replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
}
function htmlToText(s){
  s=s.replace(/<head[\s\S]*?<\/head>/gi,'')
     .replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'');
  s=s.replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi,'\n\n').replace(/<br[^>]*\/?>/gi,'\n');
  s=s.replace(/<[^>]+>/g,'');
  s=decodeEntities(s);
  return s.split(/\n+/).map(x=>x.trim()).filter(Boolean).join('\n\n');
}
async function parseEpub(file){
  await loadJSZip();
  const zip=await window.JSZip.loadAsync(file);
  const contFile=zip.file('META-INF/container.xml');
  if(!contFile)throw new Error('это не EPUB');
  const cont=await contFile.async('string');
  const opfPath=(cont.match(/full-path="([^"]+)"/)||[])[1];
  if(!opfPath)throw new Error('повреждённый EPUB');
  const opf=await zip.file(opfPath).async('string');
  const dir=opfPath.replace(/[^\/]*$/,'');
  const title=decodeEntities((opf.match(/<dc:title[^>]*>([^<]+)/)||[])[1]||file.name.replace(/\.epub$/i,''));
  const author=decodeEntities((opf.match(/<dc:creator[^>]*>([^<]+)/)||[])[1]||'EPUB');
  const man={};
  (opf.match(/<item\b[^>]*>/g)||[]).forEach(tag=>{
    const id=(tag.match(/\bid="([^"]+)"/)||[])[1];
    const href=(tag.match(/href="([^"]+)"/)||[])[1];
    if(id&&href)man[id]=href;
  });
  const spine=[];
  (opf.match(/<itemref\b[^>]*idref="([^"]+)"/g)||[]).forEach(s=>{
    spine.push(s.match(/idref="([^"]+)"/)[1]);
  });
  let text='';const toc=[];
  for(const id of spine){
    const href=man[id];if(!href)continue;
    const f=zip.file(dir+decodeURIComponent(href))||zip.file(dir+href);
    if(!f)continue;
    const xhtml=await f.async('string');
    const t=htmlToText(xhtml);
    if(t){
      const hm=xhtml.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
      const chTitle=(hm?htmlToText(hm[1]):t.slice(0,60)).slice(0,80);
      toc.push({t:chTitle||('Раздел '+(toc.length+1)),off:text.length});
      text+=t+'\n\n';
    }
  }
  if(!text.trim())throw new Error('не удалось извлечь текст');
  return {title:title,author:author,text:text.trim(),toc:toc};
}

async function idbDel(k){
  const d=await idb();
  return new Promise(function(res,rej){
    const t=d.transaction('files','readwrite');
    t.objectStore('files').delete(k);
    t.oncomplete=res;t.onerror=function(){rej(t.error);};
  });
}

/* ================= О КНИГЕ ================= */
function fmtSize(n){
  if(!n&&n!==0)return '—';
  if(n<1024)return n+' Б';
  if(n<1048576)return (n/1024).toFixed(1)+' КБ';
  return (n/1048576).toFixed(2)+' МБ';
}
function bookInfo(id){
  const b=allBooks().find(x=>x.id===id);if(!b)return;
  const builtin=!!BOOKS.find(x=>x.id===id);
  const p=Math.round((((S.progress[id]||{}).ratio)||0)*100);
  const size=fmtSize(b.size!=null?b.size:(b.text?b.text.length*2:null));
  const words=b.text?b.text.split(/\s+/).length:null;
  const place=builtin
    ?'Встроена в приложение (демо-книга)'
    :b.type==='pdf'
      ?'Импортирована: <b>'+esc(b.fname||'файл')+'</b><br>Копия хранится в базе браузера (IndexedDB) на этом устройстве'
      :'Импортирована: <b>'+esc(b.fname||'файл')+'</b><br>Хранится в памяти приложения (localStorage) на этом устройстве';
  el('bookSheetBody').innerHTML=
    '<div class="row"><div class="cover">'+coverHtml(b)+'</div><div style="flex:1;min-width:0"><b>'+esc(b.title)+'</b>'+
    '<div style="font-size:13px;color:var(--muted)">'+esc(b.author)+' · <span class="chip">'+esc(b.genre)+'</span></div></div></div>'+
    '<div class="binfo">'+
    'Формат: <b>'+(b.type==='pdf'?'PDF · '+(b.pages||'?')+' стр.':(b.genre==='EPUB'?'EPUB':'Текст'))+'</b><br>'+
    'Размер: <b>'+size+'</b>'+(words?' · слов: <b>'+words+'</b>':'')+'<br>'+
    'Расположение: '+place+'<br>'+
    'Прогресс: <b>'+(S.finished.includes(id)?'прочитано ✅':p+'%')+'</b> · цитат: <b>'+((S.quotes[id]||[]).length)+
    '</b> · закладок: <b>'+((S.marks[id]||[]).length)+'</b>'+
    '</div>'+
    '<div class="bset-row"><div class="bset-lab">⚔️ Сложность<span class="val" id="bsetDiffName">'+(S.bookDiff[id]>0?'':'авто · ')+DIFFS[diffOf(id)].n+' ×'+DIFFS[diffOf(id)].m+'</span></div>'+
    '<input type="range" class="bslider" id="bsetDiff" min="0" max="5" step="1" value="'+(S.bookDiff[id]||0)+'" oninput="onDiffSlide(\''+id+'\',this.value)">'+
    '<div style="font-size:11px;color:var(--muted)">0 — авто по объёму и жанру. Сложнее книга — больше опыта и валюты.</div></div>'+
    '<div class="bset-row"><div class="bset-lab">💰 Важность<span class="val" id="bsetImpVal">'+(S.bookImp[id]!=null?S.bookImp[id]:50)+'%</span></div>'+
    '<input type="range" class="bslider" id="bsetImp" min="0" max="100" step="10" value="'+(S.bookImp[id]!=null?S.bookImp[id]:50)+'" oninput="onImpSlide(\''+id+'\',this.value)">'+
    '<div style="font-size:11px;color:var(--muted)">Личная важность книги — повышает награду в валюте.</div></div>'+
    '<div class="bset-row"><div class="bset-lab">💪 Качает характеристику<span class="val">'+esc(statOf(b))+'</span></div>'+
    '<div class="chips" style="padding:4px 0">'+
    allStats().map(s2=>'<button class="fchip'+(statOf(b)===s2?' on':'')+'" onclick="setBookStat(\''+id+'\',\''+esc(s2)+'\')">'+esc(s2)+'</button>').join('')+
    '</div></div>'+
    '<div class="bset-reward" id="bsetReward">'+bookRewardPreview(b)+'</div>'+
    '<div class="bsheet-actions">'+
    '<button onclick="pickCover(\''+id+'\')">🖼 Обложка из файла</button>'+
    '<button onclick="emojiCover(\''+id+'\')">😀 Эмодзи-обложка</button>'+
    '<button onclick="toggleFav(\''+id+'\')">'+(S.favs.includes(id)?'★ В избранном':'☆ В избранное')+'</button>'+
    '<button onclick="toggleWant(\''+id+'\')">'+(S.status[id]==='want'?'📌 Убрать из «Хочу»':'📌 Хочу прочитать')+'</button>'+
    '<button onclick="shareBook(\''+id+'\')">📤 Поделиться</button>'+
    '<button class="danger" onclick="removeBook(\''+id+'\',false)">🗑 Убрать из приложения</button>'+
    (b.type==='pdf'?'<button class="danger" onclick="removeBook(\''+id+'\',true)">💥 Удалить файл с устройства</button>':'')+
    '</div>'+
    (b.type==='pdf'?'<div style="font-size:11px;color:var(--muted);margin-top:10px">«Удалить файл» стирает копию из хранилища браузера. Исходник в папке загрузок веб-приложение трогать не может — это появится в нативной версии.</div>':'');
  el('bookSheet').classList.remove('hidden');
}
el('bookSheetClose').onclick=()=>el('bookSheet').classList.add('hidden');
function toggleFav(id){
  const i=S.favs.indexOf(id);
  if(i>-1)S.favs.splice(i,1);else S.favs.push(id);
  save();bookInfo(id);renderLibrary();
}
function toggleWant(id){
  S.status[id]=S.status[id]==='want'?null:'want';
  save();bookInfo(id);renderLibrary();
}
function setDiff(id,v){
  if(v===0)delete S.bookDiff[id];else S.bookDiff[id]=v;
  save();bookInfo(id);renderLibrary();
}
function setBookStat(id,s2){S.bookStat[id]=s2;save();bookInfo(id);renderLibrary();}
function impMulOf(id){return 0.5+((S.bookImp[id]!=null?S.bookImp[id]:50)/100);}
function bookRewardPreview(b){
  const d=DIFFS[diffOf(b.id)];const im=impMulOf(b.id);
  const xpPage=Math.round(5*d.m),goldPage=Math.max(1,Math.round(2*d.m*im));
  return '<div class="rwd"><b>+'+xpPage+'</b><span>XP за страницу</span></div>'+
         '<div class="rwd"><b>+'+goldPage+'</b><span>'+curI()+' за страницу</span></div>'+
         '<div class="rwd"><b>×'+d.m+'</b><span>множитель сложности</span></div>';
}
function onDiffSlide(id,v){
  v=+v;if(v===0)delete S.bookDiff[id];else S.bookDiff[id]=v;save();
  const b=allBooks().find(x=>x.id===id);if(!b)return;
  el('bsetDiffName').textContent=(S.bookDiff[id]>0?'':'авто · ')+DIFFS[diffOf(id)].n+' ×'+DIFFS[diffOf(id)].m;
  el('bsetReward').innerHTML=bookRewardPreview(b);renderLibrary();
}
function onImpSlide(id,v){
  S.bookImp[id]=+v;save();
  const b=allBooks().find(x=>x.id===id);if(!b)return;
  el('bsetImpVal').textContent=(+v)+'%';
  el('bsetReward').innerHTML=bookRewardPreview(b);
}
let COVID=null;
function pickCover(id){COVID=id;el('covInp').click();}
el('covInp').onchange=e=>{
  const f=e.target.files[0];if(!f||!COVID)return;e.target.value='';
  const img=new Image();
  img.onload=()=>{
    const cv=document.createElement('canvas');cv.width=88;cv.height=116;
    const ctx=cv.getContext('2d');
    const s2=Math.max(88/img.width,116/img.height);
    ctx.drawImage(img,(88-img.width*s2)/2,(116-img.height*s2)/2,img.width*s2,img.height*s2);
    try{
      S.covers[COVID]=cv.toDataURL('image/jpeg',0.72);
      save();renderLibrary();bookInfo(COVID);
    }catch(e2){alert('Не удалось сохранить обложку: '+e2.message);}
  };
  img.onerror=()=>alert('Не удалось прочитать изображение');
  img.src=URL.createObjectURL(f);
};
function emojiCover(id){
  const e2=prompt('Эмодзи для обложки (пусто — вернуть стандартную):','📗');
  if(e2===null)return;
  if(!e2.trim())delete S.covers[id];
  else S.covers[id]=e2.trim().slice(0,4);
  save();renderLibrary();bookInfo(id);
}

/* --- ИИ-помощник --- */
el('spAI').onclick=()=>{
  const t=selText();if(!t)return;
  if(!S.ai||!S.ai.key){
    alert('Чтобы ✨ работал, вставьте API-ключ в Настройках → ИИ-помощник');
    return;
  }
  aiAsk('Объясни этот фрагмент из книги «'+((R.book||{}).title||'')+'» простым языком, 2–4 предложения, по-русски:\n\n«'+t.slice(0,800)+'»');
  if(window.getSelection)window.getSelection().removeAllRanges();
  el('selpop').classList.add('hidden');
};
async function aiAsk(promptTxt){
  el('aiBody').innerHTML='<div class="pempty">✨ Думаю...</div>';
  el('aiSheet').classList.remove('hidden');
  try{
    const resp=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.ai.key},
      body:JSON.stringify({model:S.ai.model||'gpt-4o-mini',messages:[{role:'user',content:promptTxt}],max_tokens:400})
    });
    const d=await resp.json();
    if(d.error)throw new Error(d.error.message||'ошибка API');
    el('aiBody').textContent=(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||'Пустой ответ';
  }catch(e2){
    el('aiBody').innerHTML='<div class="pempty">Не получилось: '+esc(e2.message)+'<br><br>Проверьте ключ, модель и интернет.</div>';
  }
}
el('aiSheetClose').onclick=()=>el('aiSheet').classList.add('hidden');
function shareBook(id){
  const b=allBooks().find(x=>x.id===id);if(!b)return;
  const p=Math.round((((S.progress[id]||{}).ratio)||0)*100);
  const txt='Читаю «'+b.title+'» ('+b.author+') в ReadQuest — прогресс '+p+'% 📚🔥';
  if(navigator.share){navigator.share({title:b.title,text:txt}).catch(function(){});}
  else{copyText(txt);alert('Текст для шаринга скопирован в буфер');}
}
async function removeBook(id,wipeFile){
  const b=allBooks().find(x=>x.id===id);if(!b)return;
  const builtin=!!BOOKS.find(x=>x.id===id);
  if(!confirm(wipeFile?'Удалить книгу и её файл из хранилища устройства?':'Убрать книгу из приложения? Прогресс по ней будет удалён.'))return;
  if(builtin){if(!S.hidden.includes(id))S.hidden.push(id);}
  else{S.userBooks=S.userBooks.filter(x=>x.id!==id);}
  delete S.progress[id];delete S.quotes[id];delete S.hl[id];delete S.stickers[id];delete S.marks[id];
  const fi=S.favs.indexOf(id);if(fi>-1)S.favs.splice(fi,1);
  if(wipeFile&&b.type==='pdf'){try{await idbDel('pdf:'+id);}catch(e){}}
  save();el('bookSheet').classList.add('hidden');renderLibrary();
  flashMsg(wipeFile?'💥 Книга и файл удалены':'🗑 Книга убрана из приложения');
}

/* ================= СТАТИСТИКА ================= */
let statPeriod=7;
function histDays(n){
  const out=[];
  for(let i=n-1;i>=0;i--){
    const d=addLocalDays(today(),-i);
    out.push({d:d,v:S.hist[d]||{min:0,pages:0,xp:0,gold:0}});
  }
  return out;
}
function renderChart(id,days,key,color){
  const mx=Math.max(1,...days.map(x=>x.v[key]||0));
  el(id).innerHTML=days.map((x,i)=>{
    const val=Math.round(x.v[key]||0);
    const showLbl=days.length<=7||i%5===0;
    return '<div class="bar" style="height:'+Math.max(2,Math.round((x.v[key]||0)/mx*100))+'%;background:'+color+'" title="'+x.d+': '+val+'">'+
      (days.length<=7&&val?'<span>'+val+'</span>':'')+
      (showLbl?'<i>'+x.d.slice(8)+'</i>':'')+'</div>';
  }).join('');
}
function renderAnaHours(){
  const box=el('anaHours');if(!box)return;const hh=S.hourHist||[];const max=Math.max(1,...hh);
  if(!hh.some(v=>v>0)){box.innerHTML='<div style="color:var(--muted);font-size:12px;margin-top:8px">Читайте — здесь появится ваше «время чтения» по часам.</div>';return;}
  let peak=0;for(let h=0;h<24;h++)if((hh[h]||0)>(hh[peak]||0))peak=h;
  let bars='';for(let h=0;h<24;h++){const v=hh[h]||0;bars+='<div class="hbar" title="'+h+':00 — '+Math.round(v)+' мин"><i style="height:'+(Math.round(v/max*46)+2)+'px;background:'+(h===peak?'var(--accent2)':'var(--accent)')+'"></i></div>';}
  box.innerHTML='<div class="hours">'+bars+'</div><div class="hoursax"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div><div style="font-size:12px;color:var(--muted);margin-top:6px">Чаще всего читаешь около <b>'+peak+':00</b></div>';
}
function genreMin(){const m={};allBooks().forEach(b=>{const s=S.bookStats[b.id];if(s&&s.min>0){const g=b.genre||'Без жанра';m[g]=(m[g]||0)+s.min;}});return m;}
function renderAnaGenre(){
  const box=el('anaGenre');if(!box)return;const m=genreMin();const arr=Object.keys(m).map(g=>[g,m[g]]).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!arr.length){box.innerHTML='<div style="color:var(--muted);font-size:12px;margin-top:8px">Пока нет данных по жанрам.</div>';return;}
  const max=arr[0][1];
  box.innerHTML=arr.map(x=>'<div class="gbar"><span class="gbl">'+esc(x[0])+'</span><div class="gbt"><i style="width:'+Math.round(x[1]/max*100)+'%"></i></div><span class="gbv">'+Math.round(x[1])+'м</span></div>').join('');
}
function renderAnaMonths(){
  const box=el('anaMonths');if(!box)return;const y=new Date().getFullYear();const cnt=new Array(12).fill(0);
  Object.keys(S.finishDates||{}).forEach(id=>{const d=S.finishDates[id];if(d&&d.slice(0,4)===String(y)){const mi=parseInt(d.slice(5,7),10)-1;if(mi>=0&&mi<12)cnt[mi]++;}});
  const max=Math.max(1,...cnt),names=['Я','Ф','М','А','М','И','И','А','С','О','Н','Д'],total=cnt.reduce((a,b)=>a+b,0);
  box.innerHTML='<div style="font-size:12px;color:var(--muted);margin:2px 0 6px">'+y+' · дочитано книг: <b>'+total+'</b></div><div class="months">'+cnt.map((v,i)=>'<div class="mbar" title="'+v+' книг"><i style="height:'+(Math.round(v/max*46)+2)+'px"></i><span>'+names[i]+'</span></div>').join('')+'</div>';
}
function renderYearReview(){
  const box=el('yearReview');if(!box)return;
  if(box._open){box._open=false;box.innerHTML='';return;}box._open=true;
  const y=new Date().getFullYear(),ys=String(y);let min=0,days=0;
  Object.keys(S.hist||{}).forEach(d=>{if(d.slice(0,4)===ys){const h=S.hist[d];min+=h.min||0;if((h.min||0)>=1)days++;}});
  const books=Object.keys(S.finishDates||{}).filter(id=>(S.finishDates[id]||'').slice(0,4)===ys).length;
  const gm=genreMin();let favG='—',fv=0;Object.keys(gm).forEach(g=>{if(gm[g]>fv){fv=gm[g];favG=g;}});
  const hh=S.hourHist||[];let peak=0;for(let h=0;h<24;h++)if((hh[h]||0)>(hh[peak]||0))peak=h;
  let topB='—',tv=0;allBooks().forEach(b=>{const s=S.bookStats[b.id];if(s&&s.min>tv){tv=s.min;topB=b.title;}});
  box.innerHTML='<div class="yreview"><div class="yr-h">🎉 Год в чтении · '+y+'</div><div class="yr-grid">'+
    '<div class="yr-cell"><b>'+Math.round(min)+'</b><span>минут</span></div>'+
    '<div class="yr-cell"><b>'+books+'</b><span>книг дочитано</span></div>'+
    '<div class="yr-cell"><b>'+days+'</b><span>дней с чтением</span></div>'+
    '<div class="yr-cell"><b>🔥 '+(S.streak||0)+'</b><span>стрик сейчас</span></div></div>'+
    '<div class="yr-line">📚 Любимый жанр: <b>'+esc(favG)+'</b></div>'+
    '<div class="yr-line">🕐 Любимое время: <b>'+peak+':00</b></div>'+
    '<div class="yr-line">🏆 Больше всего читал(а): <b>'+esc(topB)+'</b></div></div>';
}
if(el('btnYearReview'))el('btnYearReview').onclick=renderYearReview;
function renderStats(){
  const days=histDays(statPeriod);
  el('statCounters').innerHTML=statCountersHtml();
  el('stP7').classList.toggle('on',statPeriod===7);
  el('stP30').classList.toggle('on',statPeriod===30);
  el('stkMin').textContent=Math.round(S.totalMin);
  el('stkPages').textContent=S.totalPages;
  el('stkSpeed').textContent=S.totalMin>0?(S.totalPages/(S.totalMin/60)).toFixed(1):'0';
  el('chGoldLbl').textContent=curI()+' '+S.cur.name.charAt(0).toUpperCase()+S.cur.name.slice(1);
  renderChart('chMin',days,'min','var(--accent)');
  renderChart('chPages',days,'pages','var(--accent2)');
  renderChart('chXp',days,'xp','#7fd8e0');
  renderChart('chGold',days,'gold','#ffd54f');
  renderAnaHours();renderAnaGenre();renderAnaMonths();
  const rows=allBooks().map(b=>({b:b,s:S.bookStats[b.id]})).filter(x=>x.s&&(x.s.min>0.2||x.s.pages>0));
  el('bookStatBox').innerHTML=rows.length
    ?rows.sort((x,y)=>y.s.min-x.s.min).map(x=>{
      const pr=Math.round((((S.progress[x.b.id]||{}).ratio)||0)*100);
      return '<div class="shopitem"><div class="tprev">'+x.b.cover+'</div>'+
        '<div style="flex:1;min-width:0"><b style="font-size:14px">'+esc(x.b.title)+'</b>'+
        '<div style="font-size:12px;color:var(--muted)">⏱ '+Math.round(x.s.min)+' мин · 📄 '+x.s.pages+' стр · '+(S.finished.includes(x.b.id)?'✅ прочитано':pr+'%')+'</div>'+
        '<div class="pbar" style="margin-top:6px"><i style="width:'+pr+'%"></i></div></div></div>';
    }).join('')
    :'<div class="pempty">Почитайте — здесь появится разбивка по книгам</div>';
}
el('stP7').onclick=()=>{statPeriod=7;renderStats();};
el('stP30').onclick=()=>{statPeriod=30;renderStats();};

/* ================= FB2 ================= */
async function parseFb2(f){
  const buf=await f.arrayBuffer();
  let xml=new TextDecoder('utf-8').decode(buf);
  const encM=xml.slice(0,200).match(/encoding="([^"]+)"/i);
  if(encM&&!/utf-?8/i.test(encM[1])){
    try{xml=new TextDecoder(encM[1].toLowerCase()).decode(buf);}catch(e){}
  }
  const title=decodeEntities((xml.match(/<book-title>([^<]+)/)||[])[1]||f.name.replace(/\.fb2$/i,''));
  const fn=(xml.match(/<first-name>([^<]+)/)||[])[1]||'';
  const ln=(xml.match(/<last-name>([^<]+)/)||[])[1]||'';
  const author=decodeEntities((fn+' '+ln).trim())||'FB2';
  const bodyM=xml.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  if(!bodyM)throw new Error('не найден текст FB2');
  const toc=[];let text='';
  const parts=bodyM[1].split(/<section[^>]*>/);
  const src=parts.length>1?parts.slice(1):[bodyM[1]];
  src.forEach((sec,i)=>{
    const tm=sec.match(/<title>([\s\S]*?)<\/title>/);
    const t=htmlToText(sec);
    if(t){
      const chT=(tm?htmlToText(tm[1]).replace(/\n+/g,'. '):t.slice(0,60)).slice(0,80);
      toc.push({t:chT||('Глава '+(i+1)),off:text.length});
      text+=t+'\n\n';
    }
  });
  if(!text.trim())throw new Error('пустой FB2');
  return {title:title,author:author,text:text.trim(),toc:toc};
}

