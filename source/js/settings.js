'use strict';
/* ================= ТЕМЫ ПРИЛОЖЕНИЯ ================= */
const APP_THEMES={
 teal:{name:'Бирюза',bg:'#0c2127',card:'#143039',card2:'#1d4250',txt:'#e8f1f2',muted:'#8fb0b5',bar:'#19454f',sheet:'#122b33',drawer:'#10333d'},
 dark:{name:'Графит',bg:'#0e1116',card:'#161b22',card2:'#222933',txt:'#e6e8eb',muted:'#8b949e',bar:'#212c38',sheet:'#161b22',drawer:'#12161d'},
 light:{name:'Светлая',bg:'#eef2f3',card:'#ffffff',card2:'#dde7e9',txt:'#1d2b30',muted:'#526c73',bar:'#19454f',sheet:'#ffffff',drawer:'#f5f8f9'},
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
function applyAppTheme(){
  const t=APP_THEMES[resolveAppTheme()]||APP_THEMES.teal;
  const r=document.documentElement;
  r.style.setProperty('--bg',t.bg);r.style.setProperty('--card',t.card);
  r.style.setProperty('--card2',t.card2);r.style.setProperty('--txt',t.txt);
  r.style.setProperty('--muted',t.muted);r.style.setProperty('--bar',t.bar);
  r.style.setProperty('--sheet',t.sheet);r.style.setProperty('--drawer',t.drawer);
  /* boot-screen copy (plain string, read by the first <script>); write gate: only the lock holder writes it */
  const L=APP_THEMES.light,Dk=APP_THEMES.dark,v=S.appTheme==='auto'?['auto',L.bg,L.txt,L.muted,Dk.bg,Dk.txt,Dk.muted].join(' '):[t.bg,t.txt,t.muted].join(' ');
  try{if(localStorage.getItem(RQ_K.theme)!==v)localStorage.setItem(RQ_K.theme,v);}catch(e){}
}
function applyScale(){document.body.style.zoom=(S.ux.scale||100)/100;}

/* ================= НАСТРОЙКИ ================= */
function renderSettings(){
  if(el('mvpTgl'))el('mvpTgl').textContent=isMvp()?'Вкл':'Выкл';
  document.querySelectorAll('#focusSeg button').forEach(function(b){b.classList.toggle('on',b.dataset.f===SET.focus);});
  if(el('readCntTgl'))el('readCntTgl').textContent=SET.readCounter?'Вкл':'Выкл';
  el('pixelTgl').textContent=S.pixelOwned?(S.pixelOn?'Вкл':'Выкл'):'🛍 Купить';
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
  el('uxScaleVal').textContent=(S.ux.scale||100)+'%';
  el('autoDiffTgl').textContent=S.autoDiff===false?'Выкл':'Вкл';
  if(el('devMoneyTgl'))el('devMoneyTgl').textContent=S.devMoney?'Вкл ∞':'Выкл';
  el('aiKey').value=(S.ai&&S.ai.key)||'';
  el('aiModel').value=(S.ai&&S.ai.model)||'gpt-4o-mini';
  const tb=el('appThemeBox');tb.innerHTML='';
  const auto=document.createElement('button');
  auto.className='appsw'+(S.appTheme==='auto'?' on':'');
  auto.textContent='🌗';auto.title='Авто: день/ночь';
  auto.onclick=()=>{S.appTheme='auto';save();applyAppTheme();renderSettings();};
  tb.appendChild(auto);
  Object.keys(APP_THEMES).forEach(k=>{
    const t=APP_THEMES[k];
    const b=document.createElement('button');
    b.className='appsw'+(S.appTheme===k?' on':'');
    b.style.background=t.bg;b.style.color=t.txt;b.textContent='Aa';b.title=t.name;
    b.onclick=()=>{S.appTheme=k;save();applyAppTheme();renderSettings();};
    tb.appendChild(b);
  });
}
el('autoDiffTgl').onclick=()=>{S.autoDiff=S.autoDiff===false;save();renderSettings();renderLibrary();};
el('devMoneyTgl').onclick=()=>{S.devMoney=!S.devMoney;save();renderSettings();renderLibrary();flashMsg(S.devMoney?'∞ Бесконечная валюта включена':'Тест-валюта выключена');};
el('aiKey').oninput=e=>{S.ai.key=e.target.value.trim();save();};
el('aiModel').oninput=e=>{S.ai.model=e.target.value.trim()||'gpt-4o-mini';save();};
el('uxAnim').onclick=()=>{S.ux.anim=S.ux.anim===false;save();renderSettings();};
el('uxWake').onclick=()=>{S.ux.wake=!S.ux.wake;save();renderSettings();};
el('uxVibe').onclick=()=>{S.ux.vibe=S.ux.vibe===false;save();renderSettings();};
el('uxScaleMinus').onclick=()=>{S.ux.scale=Math.max(80,(S.ux.scale||100)-10);save();applyScale();renderSettings();};
el('uxScalePlus').onclick=()=>{S.ux.scale=Math.min(130,(S.ux.scale||100)+10);save();applyScale();renderSettings();};
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
el('btnReset2').onclick=()=>{
  if(!confirm('Точно сбросить весь прогресс?'))return;
  if(__rq&&__rq.clearAllLocal){__rq.clearAllLocal({settings:false,legacy:true});}
  try{localStorage.removeItem(RQ_K.v1);localStorage.removeItem(RQ_K.migrated);localStorage.removeItem(RQ_K.legacy);}catch(e){}
  location.reload();
};
el('btnExport').onclick=async ()=>{
  let payload;
  if(__rq&&__rq.exportBackup){
    payload=await __rq.exportBackup(null,SET,{includeTextBodies:false});
  }else{
    payload={format:'readquest-backup',schemaVersion:1,ns:window.RQ_NS||'rq',build:(RQ_BUILD.indexOf('__')===0?null:RQ_BUILD),readquest:S,settings:SET};
  }
  const blob=new Blob([JSON.stringify(payload,null,1)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='readquest-backup.json';
  document.body.appendChild(a);a.click();a.remove();
  S.lastBackup=today();save();
  flashMsg('💾 Резервная копия сохранена');
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
  }catch(err){alert('Импорт не удался: '+err.message);}
};

/* ================= ТАЙМЕР ЧТЕНИЯ ================= */
let timerIv=null,nudgeT=0;
function fmtClock(sec){sec=Math.max(0,Math.floor(sec));const m=Math.floor(sec/60),s=sec%60;return m+':'+(s<10?'0':'')+s;}
function timerElapsed(){return (R.timerAccum||0)+(R.timerOn?(Date.now()-(R.timerOnAt||Date.now())):0);}
function updTimerBtn(){
  const b=el('btnTimer');if(!b)return;
  if(R.timerOn){b.classList.add('on');b.textContent='⏸ '+fmtClock(timerElapsed()/1000);}
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
    flashMsg('⏸ Таймер на паузе — опыт не начисляется');
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
  const h=el('timerHint');h.textContent='⏸ Таймер выключен — листание не идёт в опыт. Нажмите ▶ вверху';
  h.classList.remove('hidden');clearTimeout(R._hintT);R._hintT=setTimeout(()=>h.classList.add('hidden'),2800);
}
el('btnTimer').onclick=toggleTimer;

