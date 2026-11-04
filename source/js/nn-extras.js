'use strict';
/* ===== «Нейросети»: девять дополнений (29.10, Джессика: «Делай всё»). Data: S.aiPref (arch.md 29.10, aiPrefNorm in core-b.js).
   1 сводка сверху и «Проверить всё» · 2 подключение за минуту (страница ключа, вставка из буфера, сразу проверка) · 3 модели списком от сервиса ·
   4 как отвечает «Объясни» (длина, тон, язык) · 5 «Без спойлеров» · 6 расход за месяц и лимит в день · 7 голоса озвучки списком, голос говорит фразу ·
   8 перевод: место на телефоне и язык по умолчанию · 9 что уходит в сервис и «Стереть все ключи». Keys stay only on the phone (S.ai.key / S.tts.key). */
const NN_LANG={ru:'Отвечай по-русски.',en:'Answer in English.',book:'Отвечай на языке книги.'};
/* rough prices, USD: AI per 1M tokens (input and output mixed), neural voice per 1M characters; ~3 characters a token */
const NN_PRICE_AI={deepseek:0.7,openrouter:0.7,openai:0.4,anthropic:3,custom:0},NN_PRICE_TTS={openai:15,google:16,elevenlabs:0,custom:0};
const NN_LIM=[0,10,20,30,50,100,200];
const NN_CHK={ai:'',tts:'',tr:''};let nnChecking=false;
function aiPref(){if(!S.aiPref)S.aiPref=aiPrefNorm(null);return S.aiPref;}
function nnUse(){const u=aiPref().use,m=today().slice(0,7),d=today();if(u.m!==m){u.m=m;u.n=0;u.ch=0;u.tch=0;}if(u.d!==d){u.d=d;u.dn=0;}return u;}

/* ---------- 4 + 5: the prompts ---------- */
function aiSysExplain(){const p=aiPref();
  return 'Ты помощник в приложении для чтения книг. Человек выделил фрагмент текста и просит объяснить его. '+NN_LANG[p.lang]+' '+
    (p.tone==='expert'?'Объясняй как филолог: можно термины, приёмы автора, происхождение слова, но понятно. ':'Объясняй простым языком, как другу. ')+
    (p.len==='long'?'Подробно, 5–8 предложений. ':'Коротко, 2–4 предложения. ')+'Без вступлений. '+
    'Если выделено слово или выражение, объясни, что оно значит именно здесь. Если это имя, место, бог, обычай или историческое событие, коротко скажи, кто или что это. '+
    'Если это сложная фраза, перескажи её смысл проще. '+(p.spoil?'Не рассказывай, что будет дальше в книге, без спойлеров. ':'')+'Если не уверен, так и скажи.';
}
function aiChatStyle(){const p=aiPref();
  return NN_LANG[p.lang].replace(/\.$/,'')+', живо и по делу, '+(p.len==='long'?'подробно, до 8–10 предложений':'обычно 2–6 предложений')+'. '+(p.tone==='expert'?'Можно разбирать приёмы автора и термины. ':'');
}

/* ---------- 6: usage and the daily limit (every AI request of the app goes through aiViaKey) ---------- */
{const v0=aiViaKey;aiViaKey=async function(m,maxTok){
  const p=aiPref(),u=nnUse();
  if(p.lim&&u.dn>=p.lim)throw new Error('на сегодня лимит '+p.lim+' '+plural(p.lim,'запрос','запроса','запросов')+' к ИИ, его можно поменять в «Нейросетях»');
  const len=function(c){return typeof c==='string'?c.length:Array.isArray(c)?c.reduce(function(a,x){return a+(x&&typeof x.text==='string'?x.text.length:0);},0):0;};
  const inCh=String(m.system||'').length+len(m.user)+(m.messages||[]).reduce(function(a,x){return a+len(x&&x.content);},0);
  const out=await v0.apply(this,arguments);
  const w=nnUse();w.n++;w.dn++;w.ch+=inCh+String(out||'').length;save();
  return out;};}
{const f0=nttsFetch;nttsFetch=async function(text){const b=await f0.apply(this,arguments);const u=nnUse();u.tch+=String(text||'').length;save();return b;};}
function nnCost(ch,per,tok){if(!per)return '';const v=(tok?ch/3:ch)/1e6*per;return v<0.01?'меньше цента':'≈ $'+v.toFixed(v<1?2:1);}

/* ---------- 8: translation language ---------- */
{const t0=trTo;trTo=function(from){const t=aiPref().trTo;if(t&&t!==from)return t;return t0.apply(this,arguments);};}

/* ---------- 2: connect in a minute ---------- */
function nnKeyUrl(p){return (KEY_HOW[p]&&KEY_HOW[p].url)||'';}
async function nnPaste(kind){
  let t='';try{t=(await navigator.clipboard.readText()||'').trim();}catch(e){flashMsg('Телефон не дал прочитать буфер. Вставьте ключ в поле долгим нажатием');return;}
  if(!t||/\s/.test(t)||t.length<12){flashMsg('В буфере нет ключа. Скопируйте его на сайте сервиса');return;}
  if(kind==='ai'){S.ai.key=t;save();renderAiSet();renderNn();el('aiTest').click();}
  else{S.tts.key=t;save();renderTtsSet();renderNn();el('ttsTest').click();}
}
el('aiGetKey').onclick=function(){const u=nnKeyUrl(aiProv());if(u)window.open(u,'_blank','noopener');};
el('ttsGetKey').onclick=function(){const u=nnKeyUrl(TTS_PROV[S.tts.prov]?S.tts.prov:'system');if(u)window.open(u,'_blank','noopener');};
el('aiPaste').onclick=function(){nnPaste('ai');};el('ttsPaste').onclick=function(){nnPaste('tts');};
/* a key pasted into the field is checked at once */
el('aiKey').addEventListener('paste',function(){setTimeout(function(){if(aiOwnKey())el('aiTest').click();},300);});
el('ttsKey').addEventListener('paste',function(){setTimeout(function(){if(nttsOn())el('ttsTest').click();},300);});

/* ---------- 3: models from the service ---------- */
function nnChips(box,list,cur,pick){box.innerHTML='';list.forEach(function(o){const b=document.createElement('button');b.type='button';b.className='fchip'+(o[0]===cur?' on':'');
  b.setAttribute('role','radio');b.setAttribute('aria-checked',o[0]===cur?'true':'false');b.textContent=o[1];b.title=o[0];b.onclick=function(){pick(o[0]);};box.appendChild(b);});}
let nnModels=null;
el('aiModelsBtn').onclick=async function(){
  const box=el('aiModels'),r=el('aiTestRes');if(!box.hidden){box.hidden=true;return;}
  if(!aiOwnKey()){r.textContent=S.ai&&S.ai.key?'Укажите адрес API':'Сначала вставьте ключ';return;}
  if(navigator.onLine===false){r.textContent='Нужен интернет';return;}
  r.textContent='Спрашиваю у сервиса…';this.disabled=true;
  try{
    const p=aiProv(),h=p==='anthropic'?{'x-api-key':S.ai.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'}:{'Authorization':'Bearer '+S.ai.key};
    const res=await aiFetch(aiBase()+'/models',{headers:h});let d=null;try{d=await res.json();}catch(e){}
    if(res.status===401||res.status===403)throw new Error('сервис не принял ключ');if(!res.ok)throw new Error('сервис ответил '+res.status);
    let ids=((d&&d.data)||[]).map(function(x){return x&&(x.id||x.name);}).filter(function(x){return typeof x==='string'&&x;});
    if(p==='openai')ids=ids.filter(function(x){return /^(gpt|o\d|chatgpt)/.test(x)&&!/(audio|realtime|tts|transcribe|search|image|embedding|instruct)/.test(x);});
    ids=ids.sort().slice(0,80);if(!ids.length)throw new Error('сервис не прислал список');
    nnModels=ids;r.textContent=ids.length+' '+plural(ids.length,'модель','модели','моделей')+', нажмите нужную';nnModelsRender();box.hidden=false;
  }catch(e){r.textContent='Список не пришёл: '+((e&&e.message)||'ошибка')+'. Модель можно вписать руками';}
  finally{this.disabled=false;}
};
function nnModelsRender(){if(!nnModels)return;nnChips(el('aiModels'),nnModels.map(function(x){return [x,x];}),aiModel(),function(v){S.ai.model=v;save();renderAiSet();nnModelsRender();el('aiTestRes').textContent='Модель: '+v;});}

/* ---------- 7: voices from the service; a tapped voice says a phrase ---------- */
el('ttsVoicesBtn').onclick=async function(){
  const box=el('ttsVoices'),r=el('ttsTestRes'),p=TTS_PROV[S.tts.prov]?S.tts.prov:'system';if(!box.hidden){box.hidden=true;return;}
  let list=[];
  try{
    if(p==='openai')list=TTS_PROV.openai.voices.split(/,\s*/).map(function(v){return [v,v];});
    else{
      if(!nttsOn()){r.textContent=nttsCfg().key?'Укажите адрес API':'Сначала вставьте ключ';return;}
      if(p==='custom'){r.textContent='У этого сервиса голос вписывается руками';return;}
      r.textContent='Спрашиваю у сервиса…';this.disabled=true;
      if(p==='google'){const res=await aiFetch('https://texttospeech.googleapis.com/v1/voices?languageCode=ru-RU&key='+encodeURIComponent(S.tts.key));const d=await res.json().catch(function(){return null;});
        if(!res.ok)throw new Error(res.status===403||res.status===401?'сервис не принял ключ':'сервис ответил '+res.status);
        list=((d&&d.voices)||[]).map(function(v){return [v.name,v.name.replace(/^ru-RU-/,'')+(v.ssmlGender==='FEMALE'?' ж':v.ssmlGender==='MALE'?' м':'')];});}
      else if(p==='elevenlabs'){const res=await aiFetch('https://api.elevenlabs.io/v1/voices',{headers:{'xi-api-key':S.tts.key}});const d=await res.json().catch(function(){return null;});
        if(!res.ok)throw new Error(res.status===401||res.status===403?'сервис не принял ключ':'сервис ответил '+res.status);
        list=((d&&d.voices)||[]).map(function(v){return [v.voice_id,v.name];});}
    }
    if(!list.length)throw new Error('сервис не прислал голоса');
    r.textContent='Нажмите голос, он скажет фразу';
    const draw=function(){nnChips(box,list.slice(0,80),S.tts.voice||TTS_PROV[p].voice,function(v){S.tts.voice=v;save();renderTtsSet();draw();el('ttsTest').click();});};draw();box.hidden=false;
  }catch(e){r.textContent='Список не пришёл: '+((e&&e.message)||'ошибка');}
  finally{this.disabled=false;}
};

/* ---------- 1: summary and «Проверить всё» ---------- */
function nnStateAi(){if(!aiOwnKey())return ['no',S.ai&&S.ai.key?'Нет адреса API':'Нет ключа'];const n=AI_PROV[aiProv()].name.replace(/ \(.*\)$/,'');
  return NN_CHK.ai==='ok'?['ok',n+' · ключ работает']:NN_CHK.ai?['no',n+' · '+NN_CHK.ai]:['warn',n+' · ключ не проверен'];}
function nnStateTts(){const p=TTS_PROV[S.tts&&S.tts.prov]?S.tts.prov:'system';
  if(p==='system'){const n=typeof ttsVoices==='function'?ttsVoices().length:0;return n?['ok','Голос телефона']:['warn','Голос телефона · русского голоса нет'];}
  const n=p==='custom'?'Другой':TTS_PROV[p].name;if(!nttsOn())return ['no',n+' · нет ключа'];
  return NN_CHK.tts==='ok'?['ok',n+' · голос работает']:NN_CHK.tts?['no',n+' · '+NN_CHK.tts]:['warn',n+' · ключ не проверен'];}
function nnStateTr(){const n=typeof trHave==='number'?trHave:0;return n?['ok',n+' '+plural(n,'пакет','пакета','пакетов')+' на телефоне'+(NN_TR_MB?' · '+NN_TR_MB+' МБ':'')]:['warn','Пакетов нет · «Через ИИ» и Google в окне перевода'];}
function nnSumRender(){
  const box=el('nnSum');if(!box)return;
  const row=function(ic,t,s){return '<div class="setrow nnsrow">'+rqIcon(ic,22)+'<div class="lab">'+t+'<div class="sub">'+gsDotHtml(s[0])+esc(s[1])+'</div></div></div>';};
  box.innerHTML=row('sparkles','ИИ-помощник',nnStateAi())+row('volume-2','Озвучка',nnStateTts())+row('languages','Перевод',nnStateTr())+
    '<div class="row nncheck"><button class="ghostbtn" id="nnCheckAll"'+(nnChecking?' disabled':'')+'>'+rqIcon('circle-check',18)+'<span>'+(nnChecking?'Проверяю…':'Проверить всё')+'</span></button></div>';
  el('nnCheckAll').onclick=nnCheckAll;
}
async function nnCheckAll(){
  if(nnChecking)return;nnChecking=true;nnSumRender();
  const err=function(e){return (e&&e.message)||'ошибка';};
  if(aiOwnKey()){try{const t=await aiViaKey({system:'Отвечай одним словом.',user:'Скажи «готово».'},20);NN_CHK.ai=t?'ok':'пустой ответ';}catch(e){NN_CHK.ai=err(e);}}else NN_CHK.ai='';
  if(nttsOn()){try{await nttsFetch('Да.');NN_CHK.tts='ok';}catch(e){NN_CHK.tts=err(e);}}else NN_CHK.tts='';
  try{await renderTrSet();}catch(e){}
  nnChecking=false;nnRender();
}

/* ---------- 8: translation — space on the phone, the default language ---------- */
let NN_TR_MB=0;
{const r0=renderTrSet;renderTrSet=async function(){await r0.apply(this,arguments);
  let mb=0;document.querySelectorAll('#trList .tr-row .sub').forEach(function(s){const m=/^(\d+) МБ · на телефоне/.exec(s.textContent);if(m)mb+=+m[1];});NN_TR_MB=mb;nnTrRender();nnSumRender();};}
function nnTrRender(){
  const box=el('trMore');if(!box)return;const cur=aiPref().trTo;
  box.innerHTML='<div class="setrow setstack">'+rqIcon('languages',22)+'<div class="lab">Переводить на<div class="sub">Для текста на другом языке. Русский текст переводится на английский</div></div><div class="presets rxfull" id="nnTrTo" role="radiogroup" aria-label="Переводить на"></div></div>'+
    (NN_TR_MB?'<div class="aisub">На телефоне '+NN_TR_MB+' МБ. Ненужный пакет удаляется корзиной.</div>':'');
  nnChips(el('nnTrTo'),[['','Язык приложения']].concat(['ru','en','de','fr','es','it'].map(function(k){return [k,TR_LANGS[k]];})),cur,function(v){aiPref().trTo=v;save();nnTrRender();});
}

/* ---------- 4 + 5: how the AI answers ---------- */
function nnSeg(id,opts,cur,pick){const box=el(id);box.innerHTML='';opts.forEach(function(o){const b=document.createElement('button');b.type='button';b.textContent=o[1];b.className=o[0]===cur?'on':'';
  b.setAttribute('role','radio');b.setAttribute('aria-checked',o[0]===cur?'true':'false');b.onclick=function(){pick(o[0]);};box.appendChild(b);});}
function nnStyleRender(){
  const box=el('nnStyle');if(!box)return;const p=aiPref();
  if(!box.childNodes.length)box.innerHTML=
    '<div class="setrow setstack">'+rqIcon('align-left',22)+'<div class="lab">Длина ответа<div class="sub">Для «Объясни» и чата о книге</div></div><div class="seg rxfull" id="nnLen" role="radiogroup" aria-label="Длина ответа"></div></div>'+
    '<div class="setrow setstack">'+rqIcon('sparkles',22)+'<div class="lab">Как объяснять</div><div class="seg rxfull" id="nnTone" role="radiogroup" aria-label="Как объяснять"></div></div>'+
    '<div class="setrow setstack">'+rqIcon('languages',22)+'<div class="lab">Язык ответа</div><div class="seg rxfull" id="nnLang" role="radiogroup" aria-label="Язык ответа"></div></div>'+
    '<div class="setrow">'+rqIcon('shield',22)+'<div class="lab">Без спойлеров<div class="sub">ИИ видит текст только до текущей страницы и не рассказывает, что будет дальше</div></div><button class="ghostbtn sw" id="nnSpoil" role="switch">Вкл</button></div>';
  const set=function(k,v){aiPref()[k]=v;save();nnStyleRender();};
  nnSeg('nnLen',[['short','Коротко'],['long','Подробно']],p.len,function(v){set('len',v);});
  nnSeg('nnTone',[['simple','Простыми словами'],['expert','Как филолог']],p.tone,function(v){set('tone',v);});
  nnSeg('nnLang',[['ru','Русский'],['en','English'],['book','Язык книги']],p.lang,function(v){set('lang',v);});
  const sw=el('nnSpoil');sw.textContent=p.spoil?'Вкл':'Выкл';sw.setAttribute('aria-checked',p.spoil?'true':'false');sw.onclick=function(){set('spoil',!aiPref().spoil);};
}

/* ---------- 6: usage ---------- */
function nnUseRender(){
  const box=el('nnUse');if(!box)return;const p=aiPref(),u=nnUse(),pa=NN_PRICE_AI[aiProv()],tp=TTS_PROV[S.tts&&S.tts.prov]?S.tts.prov:'system',pt=NN_PRICE_TTS[tp];
  const ai=u.n+' '+plural(u.n,'запрос','запроса','запросов')+' · '+fmtInt(u.ch)+' '+plural(u.ch,'знак','знака','знаков')+(u.ch&&pa?' · '+nnCost(u.ch,pa,true):'');
  const tts=fmtInt(u.tch)+' '+plural(u.tch,'знак','знака','знаков')+(u.tch&&pt?' · '+nnCost(u.tch,pt,false):'');
  box.innerHTML=
    '<div class="setrow">'+rqIcon('sparkles',22)+'<div class="lab">ИИ в этом месяце<div class="sub" id="nnUseAi">'+esc(ai)+'</div></div></div>'+
    '<div class="setrow">'+rqIcon('volume-2',22)+'<div class="lab">Нейроозвучка в этом месяце<div class="sub" id="nnUseTts">'+esc(tp==='system'?'Голос телефона бесплатный':tts)+'</div></div></div>'+
    '<div class="setrow setrow-time">'+rqIcon('timer',22)+'<div class="lab">Лимит запросов к ИИ в день<div class="sub">Сегодня '+u.dn+(p.lim?' из '+p.lim:'')+'</div></div>'+
      '<span class="stepgrp"><button class="stepbtn" id="nnLimMinus" aria-label="Меньше">−</button><b class="gxv" id="nnLimV">'+(p.lim||'нет')+'</b><button class="stepbtn" id="nnLimPlus" aria-label="Больше">+</button></span></div>'+
    '<div class="aisub">Цена — примерная, по прайсу сервиса; точная — в кабинете сервиса. Там же можно поставить лимит трат в месяц.</div>'+
    '<div class="row"><button class="ghostbtn" id="nnUseReset">Обнулить счётчики</button></div>';
  const step=function(d){const i=Math.max(0,NN_LIM.indexOf(p.lim)<0?0:NN_LIM.indexOf(p.lim));const j=Math.max(0,Math.min(NN_LIM.length-1,i+d));p.lim=NN_LIM[j];save();nnUseRender();};
  el('nnLimMinus').onclick=function(){step(-1);};el('nnLimPlus').onclick=function(){step(1);};
  el('nnLimMinus').disabled=!p.lim;el('nnLimPlus').disabled=p.lim>=NN_LIM[NN_LIM.length-1];
  el('nnUseReset').onclick=function(){const w=nnUse();w.n=0;w.ch=0;w.tch=0;w.dn=0;save();nnUseRender();};
}

/* ---------- 9: privacy ---------- */
function nnPrivRender(){
  const box=el('nnPriv');if(!box||box.childNodes.length)return;
  box.innerHTML='<div class="nnpriv"><p><b>Что уходит в сервис, который вы выбрали:</b></p><ul>'+
    '<li>«Объясни» — выделенный фрагмент, предложение вокруг, название и автор книги.</li>'+
    '<li>Чат о книге — ваши вопросы и до 8000 знаков текста до текущей страницы.</li>'+
    '<li>Нейроозвучка — текст, который читается вслух.</li>'+
    '<li>Перевод пакетом — никуда, он работает на телефоне. «Через ИИ» и Google — выделенный фрагмент.</li></ul>'+
    '<p>Ключи хранятся только на этом телефоне, напрямую уходят в сервис и не попадают в резервную копию. Наших серверов посередине нет.</p></div>'+
    '<div class="row"><button class="ghostbtn" id="nnWipe">'+rqIcon('trash-2',18)+'<span>Стереть все ключи</span></button></div>';
  el('nnWipe').onclick=async function(){
    if(!await rqAsk({t:'Стереть все ключи?',p:'Ключи ИИ-помощника и нейроозвучки удалятся с этого телефона. Вернуть их можно, вставив заново.',ok:'Стереть',danger:true}))return;
    S.ai.key='';S.tts.key='';save();NN_CHK.ai='';NN_CHK.tts='';try{if(ttsOn||speaking)ttsStop();}catch(e){}renderAiSet();renderTtsSet();renderNn();flashMsg('Ключи стёрты');};
}

/* ---------- render ---------- */
function nnQuickRender(){
  const ap=aiProv(),au=nnKeyUrl(ap),tp=TTS_PROV[S.tts&&S.tts.prov]?S.tts.prov:'system',tu=nnKeyUrl(tp);
  el('aiGetKey').innerHTML=rqIcon('compass',18)+'<span>1. Получить ключ</span>';el('aiGetKey').hidden=!au;
  el('aiPaste').innerHTML=rqIcon('clipboard',18)+'<span>'+(au?'2. ':'')+'Вставить из буфера</span>';
  el('ttsGetKey').innerHTML=rqIcon('compass',18)+'<span>1. Получить ключ</span>';el('ttsGetKey').hidden=!tu;
  el('ttsPaste').innerHTML=rqIcon('clipboard',18)+'<span>'+(tu?'2. ':'')+'Вставить из буфера</span>';
  el('ttsVoicesBtn').hidden=tp==='custom';
}
function nnRender(){if(!el('nnSum'))return;nnSumRender();nnQuickRender();nnStyleRender();nnUseRender();nnPrivRender();nnTrRender();}
{const n0=renderNn;renderNn=function(){n0.apply(this,arguments);nnRender();};}
{const a0=renderAiSet;renderAiSet=function(){a0.apply(this,arguments);if(nnModels&&!el('aiModels').hidden)nnModelsRender();};}
/* a successful «Проверить ключ» / «Послушать» marks the summary too */
new MutationObserver(function(){const t=el('aiTestRes').textContent;if(/^Работает/.test(t))NN_CHK.ai='ok';else if(/^(Не работает|Сервис ответил пустотой)/.test(t))NN_CHK.ai='ключ не сработал';nnSumRender();}).observe(el('aiTestRes'),{childList:true,characterData:true,subtree:true});
new MutationObserver(function(){const t=el('ttsTestRes').textContent;if(/^Работает/.test(t))NN_CHK.tts='ok';nnSumRender();}).observe(el('ttsTestRes'),{childList:true,characterData:true,subtree:true});
nnRender();
