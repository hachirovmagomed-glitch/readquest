'use strict';
/* ================= ТЕМЫ ПРИЛОЖЕНИЯ ================= */
const APP_THEMES={
 teal:{name:'Бирюза',bg:'#0c2127',card:'#143039',card2:'#1d4250',txt:'#e8f1f2',muted:'#8fb0b5',bar:'#19454f',sheet:'#122b33',drawer:'#10333d'},
 dark:{name:'Графит',bg:'#0e1116',card:'#161b22',card2:'#222933',txt:'#e6e8eb',muted:'#8b949e',bar:'#212c38',sheet:'#161b22',drawer:'#12161d'},
 light:{name:'Светлая',bg:'#eef2f3',card:'#ffffff',card2:'#dde7e9',txt:'#1d2b30',muted:'#526c73',bar:'#19454f',sheet:'#ffffff',drawer:'#f5f8f9',focus:'#1f6f6b',danger:'#b3261e'},
 violet:{name:'Фиолет',bg:'#14101f',card:'#1d1730',card2:'#2a2145',txt:'#ece8f5',muted:'#9d93b8',bar:'#352a55',sheet:'#1a1429',drawer:'#171126'},
 forest:{name:'Лес',bg:'#0d1a12',card:'#14271b',card2:'#1e3b28',txt:'#e8f2ea',muted:'#8fb39a',bar:'#1d4a2e',sheet:'#122418',drawer:'#102016'},
 ocean:{name:'Океан',bg:'#08161f',card:'#0f2735',card2:'#173a4d',txt:'#dff1f7',muted:'#88b3c4',bar:'#114b63',sheet:'#0c1f2b',drawer:'#0a1a24'},
 rose:{name:'Закат',bg:'#1f0e16',card:'#321826',card2:'#48233a',txt:'#fae5ee',muted:'#c79bb0',bar:'#5a2740',sheet:'#291320',drawer:'#22101a'},
 amber:{name:'Янтарь',bg:'#1c1408',card:'#2e2210',card2:'#45341a',txt:'#f6ecd6',muted:'#c4ab83',bar:'#5a4320',sheet:'#251b0d',drawer:'#1f160a'},
 indigo:{name:'Индиго',bg:'#0c0f24',card:'#161a3a',card2:'#242a55',txt:'#e6e8fb',muted:'#9ba0d0',bar:'#2c3470',sheet:'#12152e',drawer:'#0e1126'},
 crimson:{name:'Багрянец',bg:'#1a0c0c',card:'#2c1414',card2:'#411d1d',txt:'#f7e3e3',muted:'#c89a9a',bar:'#5a2424',sheet:'#221010',drawer:'#1c0d0d'},
 amoled:{name:'AMOLED',bg:'#000000',card:'#0c0c0e',card2:'#1a1a1e',txt:'#e6e6ea',muted:'#8a8a92',bar:'#161618',sheet:'#0a0a0c',drawer:'#050505'}
};
function resolveAppTheme(){
  if(S.appTheme&&S.appTheme!=='auto')return S.appTheme;
  const h2=new Date().getHours();
  return (h2>=7&&h2<21)?'light':'dark';
}
/* audit 19.10 GL-11: a theme / skin switch lands in one frame — no transitions while the colours swap */
function rqThemeSwitchFrame(){const h=document.documentElement;h.classList.add('rq-tsw');requestAnimationFrame(function(){requestAnimationFrame(function(){h.classList.remove('rq-tsw');});});}
function applyAppTheme(){rqThemeSwitchFrame();setTimeout(function(){try{syncThemeColor();}catch(e){}},0);
  const t=APP_THEMES[resolveAppTheme()]||APP_THEMES.teal;
  const r=document.documentElement;
  r.style.setProperty('--bg',t.bg);r.style.setProperty('--card',t.card);
  r.style.setProperty('--card2',t.card2);r.style.setProperty('--txt',t.txt);
  r.style.setProperty('--muted',t.muted);r.style.setProperty('--bar',t.bar);
  r.style.setProperty('--sheet',t.sheet);r.style.setProperty('--drawer',t.drawer);
  r.style.setProperty('--focus-ring',t.focus||'#7fdbe4');r.style.setProperty('--danger',t.danger||'#ff8a80'); /* audit 19.10 GL-03 / GL-07: ≥3:1 ring, ≥4.5:1 danger text on this theme */
  /* boot-screen copy (plain string, read by the first <script>); write gate: only the lock holder writes it */
  const L=APP_THEMES.light,Dk=APP_THEMES.dark,v=S.appTheme==='auto'?['auto',L.bg,L.txt,L.muted,Dk.bg,Dk.txt,Dk.muted].join(' '):[t.bg,t.txt,t.muted].join(' ');
  try{if(localStorage.getItem(RQ_K.theme)!==v)localStorage.setItem(RQ_K.theme,v);}catch(e){}
}
/* «Размер интерфейса» removed (Маня 07.10 / 15.10): the UI adapts to the phone by itself. A stored S.ux.scale is kept but ignored. */
function applyScale(){document.body.style.zoom='';}
/* «Анимации» (S.ux.anim) — wave 2: off → html.rq-still (CSS kills animations/transitions); prefers-reduced-motion counts the same */
function rqStill(){try{if(S&&S.ux&&S.ux.anim===false)return true;return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(e){return false;}}
function applyMotion(){document.documentElement.classList.toggle('rq-still',!!(S&&S.ux&&S.ux.anim===false));}

/* ================= НАСТРОЙКИ ================= */
/** 1в: «Вкл/Выкл» buttons drawn as switches (.sw) — state mirrored to aria-checked, labels stay for screen readers / tests */
function rqSyncSwitches(){document.querySelectorAll('.sw').forEach(function(b){const t=(b.textContent||'').trim();b.setAttribute('aria-checked',/^(Вкл|On)/.test(t)?'true':'false');});}
/** «Общие настройки»: from the profile = a screen; from the reader = the same screen OVER the reader (session keeps running, back closes it) */
function generalOverReader(){const g=el('settings');return !!(g&&g.classList.contains('over')&&!g.classList.contains('hidden'));}
function openGeneralSettings(over){renderSettings();const g=el('settings');
  if(over){g.classList.add('over');g.classList.remove('hidden');navPush('settings');}else{g.classList.remove('over');show('settings');}}
function closeGeneralSettings(){const g=el('settings');g.classList.add('hidden');g.classList.remove('over');}
el('setBack').onclick=function(){if(generalOverReader()){closeGeneralSettings();if(navState()==='settings')try{history.back();}catch(e){}return;}show(isMvp()?'profile':'library');};
function renderSettings(){
  if(el('navCfgSub')&&typeof navGet==='function'){const k=navShown().length;el('navCfgSub').textContent=k+' '+plural(k,'вкладка','вкладки','вкладок');}
  if(el('mvpTgl'))el('mvpTgl').textContent=isMvp()?'Вкл':'Выкл';
  document.querySelectorAll('#focusSeg button').forEach(function(b){b.classList.toggle('on',b.dataset.f===SET.focus);});
  if(el('readCntTgl')){const b=el('readCntTgl');b.classList.toggle('on',!!SET.readCounter);b.setAttribute('aria-checked',SET.readCounter?'true':'false');}
  el('pixelTgl').textContent=S.pixelOwned?(S.pixelOn?'Вкл':'Выкл'):'Купить';
  el('pixelTgl').classList.toggle('mvp-hide', isMvp()&&!S.pixelOwned); /* MVP: hide «Купить»; owned → on/off stays */
  const ls=el('langSeg');ls.innerHTML='';
  [['ru','Русский'],['en','English']].forEach(o=>{
    const b=document.createElement('button');b.textContent=o[1];b.className=(S.lang===o[0]?'on':'');
    b.onclick=()=>setLang(o[0]);ls.appendChild(b);
  });
  const _a=antiCfg();
  el('antiMinVal').textContent=_a.minSec+' с';
  el('antiMaxVal').textContent=_a.maxMin+' мин';
  el('goalVal2').textContent=goalMin()+' мин';
  el('uxAnim').textContent=S.ux.anim!==false?'Вкл':'Выкл';
  el('uxWake').textContent=S.ux.wake?'Вкл':'Выкл';
  el('uxVibe').textContent=S.ux.vibe!==false?'Вкл':'Выкл';
  el('autoDiffTgl').textContent=S.autoDiff===false?'Выкл':'Вкл';
  el('aiKey').value=(S.ai&&S.ai.key)||'';
  el('aiModel').value=(S.ai&&S.ai.model)||'gpt-4o-mini';
  /* Джессика 16.10: «Тема» and «Скин» are two rows. Тема = the app palette (Авто + APP_THEMES), Скин = «Без скина», «Карандашный» and the bought
     shop skins. A worn skin paints the app with its own colours; the picked palette stays selected underneath and comes back when the skin is
     taken off. Picking a palette while a skin is on takes the skin off (reader theme back to sepia), same as before the split. */
  const mkTile=box=>(k,cap,on,draw,pick)=>{
    const w=document.createElement('span');w.className='apptile'+(on?' on':'');
    const b=document.createElement('button');b.className='appsw'+(on?' on':'');b.dataset.k=k;b.title=cap;b.setAttribute('aria-label',cap);b.setAttribute('aria-pressed',on?'true':'false');
    draw(b);b.onclick=pick;w.appendChild(b);w.onclick=function(e){if(!b.contains(e.target))b.click();}; /* whole 52px row is the target */
    const c=document.createElement('small');c.textContent=cap;w.appendChild(c);
    const ck=document.createElement('span');ck.className='chk';ck.setAttribute('aria-hidden','true');ck.innerHTML=rqIcon('check',20);w.appendChild(ck);
    box.appendChild(w);
  };
  const tb=el('appThemeBox');tb.innerHTML='';const tile=mkTile(tb);
  const sbx=el('appSkinBox');sbx.innerHTML='';const stile=mkTile(sbx);
  const leaveSkin=()=>{if(!activeTheme().skin)return;const from=skinOf(activeTheme());SET.theme='sepia';SET.cBg=null;SET.cTxt=null;saveSet();applySet();logSkinChange(from);};
  tile('auto','Авто',S.appTheme==='auto',b=>{b.innerHTML=rqIcon('sun-moon',18);},()=>{leaveSkin();S.appTheme='auto';save();applyAppTheme();renderSettings();});
  Object.keys(APP_THEMES).forEach(k=>{
    const t=APP_THEMES[k];
    tile(k,t.name,S.appTheme===k,b=>{b.style.background=t.bg;b.style.color=t.txt;b.textContent='Aa';},()=>{leaveSkin();S.appTheme=k;save();applyAppTheme();renderSettings();});
  });
  const sk=activeTheme().skin||'';
  const pickSkin=key=>()=>{if(sk===key){renderSettings();return;}const from=skinOf(activeTheme());SET.theme=skinWearKey(key);SET.cBg=null;SET.cTxt=null;rqSaveSetGated();applySet();logSkinChange(from);renderSettings();};
  stile('none','Без скина',!sk,b=>{b.innerHTML=rqIcon('circle-minus',18);},()=>{leaveSkin();renderSettings();});
  stile('pencil',THEMES.pencil.name,sk==='pencil',b=>{b.classList.add('appsw-pencil');b.style.background=THEMES.pencil.bg;b.style.color=THEMES.pencil.txt;b.innerHTML=rqIcon('pencil',18);},pickSkin('pencil'));
  /* bought shop skins with app styling: a tile each (Продукт 14.10: купленные — в списке) */
  Object.keys(SKIN_THEMES).filter(k=>!SKIN_THEMES[k].night&&skinTheme(k)).forEach(k=>{const t=SKIN_THEMES[k];
    stile(k,t.name,sk===k,b=>{b.classList.add('appsw-skin');b.style.background=t.bg;b.style.color=t.txt;b.innerHTML=rqIcon(t.icon,18);},pickSkin(k));});
  if(S.notif){el('calNotifTgl').textContent=S.notif.on?'Вкл':'Выкл';el('calNotifTime').textContent=S.notif.time;}
  rqSyncSwitches();
  rqCollapse('appThemeBox','',function(){const t=document.querySelector('#appThemeBox .apptile.on small');return t?t.textContent:'';},'appThemeX',{icon:'sun-moon',title:'Тема',sub:function(){return activeTheme().skin?'Сейчас цвета задаёт скин':S.appTheme==='auto'?'Авто: день с 7:00 до 21:00':'Всегда эта тема';},dot:function(){const b=document.querySelector('#appThemeBox .apptile.on .appsw');return b?getComputedStyle(b).backgroundColor:'';}});
  rqCollapse('appSkinBox','',function(){const t=document.querySelector('#appSkinBox .apptile.on small');return t?t.textContent:'';},'appSkinX',{icon:'palette',title:'Скин',sub:function(){return 'Свои и купленные';},dotIcon:function(){const t=activeTheme();return t.skin?(t.icon||'pencil'):'circle-minus';},dot:function(){const b=document.querySelector('#appSkinBox .apptile.on .appsw');return b?getComputedStyle(b).backgroundColor:'';}});
}
el('autoDiffTgl').onclick=()=>{S.autoDiff=S.autoDiff===false;save();renderSettings();renderLibrary();};
el('aiKey').oninput=e=>{S.ai.key=e.target.value.trim();save();};
el('aiModel').oninput=e=>{S.ai.model=e.target.value.trim()||'gpt-4o-mini';save();};
el('uxAnim').onclick=()=>{S.ux.anim=S.ux.anim===false;save();applyMotion();renderSettings();};
el('uxWake').onclick=()=>{S.ux.wake=!S.ux.wake;save();renderSettings();};
el('uxVibe').onclick=()=>{S.ux.vibe=S.ux.vibe===false;save();renderSettings();};
let wakeRef=null;
async function reqWake(){
  if(S.ux.wake&&navigator.wakeLock){try{wakeRef=await navigator.wakeLock.request('screen');}catch(e){}}
}
function relWake(){if(wakeRef){try{wakeRef.release();}catch(e){}wakeRef=null;}}
el('antiMinMinus').onclick=()=>{if(isMvp())return;S.anti.minSec=Math.max(4,S.anti.minSec-2);save();renderSettings();};
el('antiMinPlus').onclick=()=>{if(isMvp())return;S.anti.minSec=Math.min(90,S.anti.minSec+2);save();renderSettings();};
el('antiMaxMinus').onclick=()=>{if(isMvp())return;S.anti.maxMin=Math.max(1,S.anti.maxMin-1);save();renderSettings();};
el('antiMaxPlus').onclick=()=>{if(isMvp())return;S.anti.maxMin=Math.min(15,S.anti.maxMin+1);save();renderSettings();};
el('goalMinus2').onclick=()=>{if(isMvp())return;S.goal=Math.max(5,S.goal-5);save();renderSettings();};
el('goalPlus2').onclick=()=>{if(isMvp())return;S.goal=Math.min(120,S.goal+5);save();renderSettings();};
el('btnUnhide').onclick=()=>{S.hidden=[];save();renderLibrary();flashMsg('Демо-книги возвращены на полку');};
el('btnReset2').onclick=async()=>{
  if(!await rqAsk({t:'Сбросить весь прогресс?',p:'Минуты, опыт, монеты, стрик и награды обнулятся. Книги и настройки останутся. Отменить нельзя.',ok:'Сбросить',danger:true}))return;
  if(__rq&&__rq.clearAllLocal){__rq.clearAllLocal({settings:false,legacy:true});}
  try{localStorage.removeItem(RQ_K.v1);localStorage.removeItem(RQ_K.migrated);localStorage.removeItem(RQ_K.legacy);}catch(e){}
  location.reload();
};
el('btnExport').onclick=async ()=>{
  let payload;
  if(__rq&&__rq.exportBackup){
    payload=await __rq.exportBackup(null,SET,{includeTextBodies:false});
  }else{
    payload={format:'readquest-backup',schemaVersion:1,ns:window.RQ_NS||'rq',build:(RQ_BUILD.indexOf('__')===0?null:RQ_BUILD),readquest:Object.assign({},S,S.ai?{ai:Object.assign({},S.ai,{key:''})}:{}),settings:SET}; /* arch.md 2026-10-15: no API key in a backup */
  }
  const blob=new Blob([JSON.stringify(payload,null,1)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='readquest-backup.json';
  document.body.appendChild(a);a.click();a.remove();
  S.lastBackup=today();save();
  flashMsg('Резервная копия сохранена');
};
el('btnImport').onclick=()=>el('impInp').click();
el('impInp').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;e.target.value='';
  try{
    const d=JSON.parse(await f.text());
    if(__rq&&__rq.importBackup){
      await __rq.importBackup(d);
    }else{
      throw new Error('хранилище ещё не готово — обновите страницу');
    }
    /* Single-writer: do NOT write legacy `readquest` key */
    location.reload();
  }catch(err){rqAlert('Импорт не удался: '+err.message);}
};

/* ================= ТАЙМЕР ЧТЕНИЯ ================= */
let timerIv=null,nudgeT=0;
function fmtClock(sec){sec=Math.max(0,Math.floor(sec));const m=Math.floor(sec/60),s=sec%60;return m+':'+(s<10?'0':'')+s;}
function timerElapsed(){return (R.timerAccum||0)+(R.timerOn?(Date.now()-(R.timerOnAt||Date.now())):0);}
function updTimerBtn(){
  const b=el('btnTimer');if(!b)return;
  if(R.timerOn){b.classList.add('on');b.textContent=fmtClock(timerElapsed()/1000);}
  else{b.classList.remove('on');b.textContent=(R.timerAccum>0?'▶ '+fmtClock(timerElapsed()/1000):'▶');}
}
function startTimerTick(){stopTimerTick();timerIv=setInterval(updTimerBtn,1000);}
function stopTimerTick(){if(timerIv){clearInterval(timerIv);timerIv=null;}}
function resetTimer(){
  if(isMvp()){
    /* MVP test: no separate timer — opening a book starts counting (anti-cheat lives in the tracker).
       No ▶ button, no hints, no toasts. */
    R.timerOn=true;R.timerAccum=0;R.timerOnAt=Date.now();stopTimerTick();
    el('timerHint').classList.add('hidden');clearTimeout(R._hintT);
    return;
  }
  R.timerOn=false;R.timerAccum=0;R.timerOnAt=0;stopTimerTick();updTimerBtn();
  const h=el('timerHint');h.textContent='▶ Нажмите таймер вверху, чтобы засчитывать чтение и получать опыт';
  h.classList.remove('hidden');clearTimeout(R._hintT);R._hintT=setTimeout(()=>h.classList.add('hidden'),4500);
}
function toggleTimer(){
  if(!R.book||isMvp())return; /* MVP: counting can't be switched off */
  if(R.timerOn){
    R.timerAccum=timerElapsed();R.timerOn=false;stopTimerTick();if(__tracker)__tracker.setCounting(false);
    flashMsg('Таймер на паузе — опыт не начисляется');
  }else{
    R.timerOn=true;R.timerOnAt=Date.now();R.lastTurn=Date.now();startTimerTick();if(__tracker)__tracker.setCounting(true);
    el('timerHint').classList.add('hidden');
    flashMsg('▶ Таймер пошёл — чтение засчитывается',2000);
  }
  updTimerBtn();
}
function timerNudge(){
  if(isMvp())return;
  const now=Date.now();if(now-nudgeT<8000)return;nudgeT=now;
  const h=el('timerHint');h.textContent='Таймер выключен — листание не идёт в опыт. Включите его вверху';
  h.classList.remove('hidden');clearTimeout(R._hintT);R._hintT=setTimeout(()=>h.classList.add('hidden'),2800);
}
el('btnTimer').onclick=toggleTimer;


/* ===== «Нижняя панель» (Общие настройки → Управление): 1..5 вкладок, Библиотека несъёмная и первая; каждое изменение = navSave() (один saveSet через гейт) =====
   Порядок: кнопки «Выше» / «Ниже» (альтернатива перетаскиванию для тача и экранного диктора). */
function openNavCfg(){const p=el('navCfg');if(!p)return;renderNavCfg();p.hidden=false;}
function closeNavCfg(){const p=el('navCfg');if(p)p.hidden=true;try{renderSettings();}catch(e){}}
function navCfgMove(id,d){const n=navGet(),i=n.indexOf(id),j=i+d;if(i<1||j<1||j>=n.length)return;n[i]=n[j];n[j]=id;navSave(n);renderNavCfg();}
function navCfgDel(id){if(id==='library')return;const n=navGet().filter(function(x){return x!==id;});navSave(n);renderNavCfg();}
function navCfgAdd(id){const n=navGet();if(n.length>=NAV_MAX||n.indexOf(id)>=0)return;n.push(id);navSave(n);renderNavCfg();}
function renderNavCfg(){
  const p=el('navCfg');if(!p)return;const n=navShown(),full=navGet().length>=NAV_MAX;
  const ic=function(k,sz){return rqIcon(k,sz||22);};
  p.innerHTML='<div class="nch"><button type="button" class="menubtn" id="navCfgBack" aria-label="Назад">'+ic('arrow-left')+'</button><div><div class="ncp">Общие настройки · Управление</div><h2>Нижняя панель</h2></div></div>'+
    '<h4>Так будет выглядеть</h4><div class="navprev">'+n.map(function(id){const it=navItem(id);return '<span data-nav="'+id+'">'+ic(it.ic,20)+esc(it.s||it.t)+'</span>';}).join('')+'</div>'+
    '<h4 class="navcnt">В панели · '+n.length+' из '+NAV_MAX+'</h4><div class="navlist">'+
    n.map(function(id,i){const it=navItem(id);
      if(id==='library')return '<div class="navli" data-nav="library">'+ic(it.ic)+'<div class="nl">'+esc(it.t)+'<small>Главный экран</small></div><span class="navlock" aria-label="Нельзя убрать">'+ic('lock',18)+'</span></div>';
      return '<div class="navli" data-nav="'+id+'">'+ic(it.ic)+'<div class="nl">'+esc(it.t)+'</div>'+
        '<button type="button" class="navup" aria-label="Выше"'+(i<=1?' disabled':'')+' onclick="navCfgMove(\''+id+'\',-1)">'+ic('chevron-up',20)+'</button>'+
        '<button type="button" class="navdown" aria-label="Ниже"'+(i>=n.length-1?' disabled':'')+' onclick="navCfgMove(\''+id+'\',1)">'+ic('chevron-down',20)+'</button>'+
        '<button type="button" class="navdel" aria-label="Убрать" onclick="navCfgDel(\''+id+'\')">'+ic('circle-minus')+'</button></div>';}).join('')+'</div>'+
    (full?'<div class="navmax">'+ic('lock',14)+'Максимум 5 вкладок. Уберите одну, чтобы добавить другую.</div>':'<div class="navmax">Порядок — кнопками «Выше» и «Ниже».</div>')+
    '<h4>Можно добавить</h4><div class="navlist">'+
    NAV_CATALOG.filter(function(it){return navAvail(it.id)&&navGet().indexOf(it.id)<0;}).map(function(it){return '<div class="navli" data-nav="'+it.id+'">'+ic(it.ic)+'<div class="nl">'+esc(it.t)+'</div>'+
      '<button type="button" class="navadd" aria-label="Добавить"'+(full?' disabled':'')+' onclick="navCfgAdd(\''+it.id+'\')">'+ic('circle-plus')+'</button></div>';}).join('')+'</div>';
  el('navCfgBack').onclick=closeNavCfg;
}
if(el('btnNavCfg'))el('btnNavCfg').onclick=openNavCfg;
