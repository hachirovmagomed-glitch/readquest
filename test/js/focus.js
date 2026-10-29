/* ===== 25.10 «Фокус» (Джессика: помодоро по желанию с бо́льшими наградами за дисциплину, тихий режим, фоновые звуки
   по скинам, серия фокуса, итог фокуса, вызовы недели, блокировка отвлечений «кроме экстренных вроде звонков», фокус-слова,
   карта фокуса). Only while focusOn() (core-a.js, test site). Settings: SET.fz (reader.js fzNorm, arch.md).

   Rounds count ONLY the tracker's counted reading (snapshot().sureMs: pause, background, fast flipping add nothing), so a
   round can never be filled by an open book. A completed round goes into the session row (tracker.setFocus → row.pomo), and
   game-awards.js trusts it only while Σ rounds ≤ the row's minutes. Leaving the app during a round: back within FZ_GRACE_MS —
   the round goes on (but is no longer «без выхода»); later — the round stops and may be continued ONCE (a call, something
   urgent), otherwise it starts again. Nothing here pays anything: rewards are derived from the rows (awardPendingSessions).
   No game toasts in the reader: the round shows only as a quiet chip / thin line; coins are named on the summary. ===== */
const FZ_GRACE_MS=60000;
const FZ_TICK_MS=1000;
/* own sounds of every skin (slot 1…3 of SET.fz.snd); all are synthesised (WebAudio), nothing is downloaded */
const FZ_SOUNDS={
  '':[['rain','Дождь'],['fire','Камин'],['lib','Библиотека']],
  pencil:[['glass','Дождь по стеклу'],['clock','Часы'],['studio','Мастерская']],
  ellada:[['sea','Море'],['cicada','Цикады'],['olive','Ветер в оливах']],
  babochkovyi:[['garden','Сад и птицы'],['brook','Ручей'],['meadow','Летний луг']],
  celestial:[['space','Космос'],['starwind','Звёздный ветер'],['chimes','Колокольчики']]
};
/* 25.10 вечером (Джессика: «Давай уберём эти вопросы в начале фокуса, они лишние»): the question is not asked any more */
const FZ_ASK_WORDS=false;
const FZ_WORDS=['Дочитать главу','Понять главную мысль','Отдохнуть с книгой','Найти цитаты'];
/* round state of the running session (reset when the session changes) */
const FZ={sid:null,phase:'idle',len:25,base:0,prog:0,done:[],run:0,best:0,clean:true,rescued:false,hiddenAt:0,restUntil:0,hold:false,fw:'',asked:false};
let fzTimer=null;

function fzOn(){return typeof focusOn==='function'&&focusOn();}
function fzSet(){return SET.fz||(SET.fz=fzNorm(null));}
function fzSkin(){return document.documentElement.dataset.skin||'';}
function fzSoundList(){return FZ_SOUNDS[fzSkin()]||FZ_SOUNDS[''];}
function fzSnap(){return (__tracker&&__tracker.isRunning&&__tracker.isRunning())?__tracker.snapshot():null;}
function fzSid(){return __tracker&&__tracker.sessionId?__tracker.sessionId():null;}
function fzPaused(){return typeof rqPaused==='function'&&!!rqPaused();} /* «Защитить награды»: floating pause button */
function fzMin(ms){return Math.floor((Number(ms)||0)/60000);}
function fzClock(ms){const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}

/** a new session (book opened / reopened) starts with no rounds */
function fzSync(){
  const sid=fzSid();
  if(sid===FZ.sid)return;
  Object.assign(FZ,{sid:sid,phase:'idle',base:0,prog:0,done:[],run:0,best:0,clean:true,rescued:false,hiddenAt:0,restUntil:0,hold:false,fw:'',asked:false});
  fzHideHold();
}
function fzPush(){if(__tracker&&__tracker.setFocus)__tracker.setFocus({pomo:FZ.done.slice(),pomoRun:FZ.best,fw:FZ.fw});}

function fzStartRound(){
  fzSync();const sn=fzSnap();if(!sn||!FZ.sid)return;
  FZ.phase='run';FZ.len=fzSet().len;FZ.base=sn.sureMs||0;FZ.prog=0;FZ.clean=document.visibilityState!=='hidden';FZ.rescued=false;FZ.hold=false;
  if(fzSet().quiet&&typeof setFocus==='function')setFocus(true);
  fzSound(true);fzArm();fzPaint();
}
function fzStop(){FZ.phase='idle';FZ.hold=false;fzHideHold();clearInterval(fzTimer);fzTimer=null;fzPaint();}
function fzSkipRest(){if(FZ.phase==='rest')fzStartRound();}
function fzArm(){clearInterval(fzTimer);fzTimer=setInterval(fzTick,FZ_TICK_MS);}

function fzTick(){
  if(!fzOn()){fzStop();return;}
  fzSync();
  if(!FZ.sid){fzStop();return;}
  if(FZ.phase==='run'&&!FZ.hold){
    const sn=fzSnap();if(!sn)return;
    FZ.prog=Math.max(0,(sn.sureMs||0)-FZ.base);
    if(FZ.prog>=FZ.len*60000){
      FZ.done.push(FZ.len);
      FZ.run=FZ.clean?FZ.run+1:0;FZ.best=Math.max(FZ.best,FZ.run);
      fzPush();fzChime();
      FZ.phase='rest';FZ.restUntil=Date.now()+fzSet().rest*60000;
    }
  }else if(FZ.phase==='rest'&&Date.now()>=FZ.restUntil){fzStartRound();return;}
  fzPaint();
}

/* --- leaving the app («блокировка отвлечений»: a browser cannot block other apps, so the round holds the line instead) --- */
document.addEventListener('visibilitychange',function(){
  if(!fzOn()||FZ.phase!=='run')return;
  if(document.visibilityState==='hidden'){
    FZ.hiddenAt=Date.now();FZ.clean=false;fzSound(false);
    if(fzSet().warn)fzNotify('Круг фокуса идёт','Вернись в течение минуты, и круг продолжится. Звонок или что-то срочное круг не сжигают: его можно будет продолжить.');
    return;
  }
  const gone=FZ.hiddenAt?Date.now()-FZ.hiddenAt:0;FZ.hiddenAt=0;fzSound(true);
  if(gone<=FZ_GRACE_MS)return;
  if(!FZ.rescued){FZ.hold=true;fzShowHold(gone);}
  else{fzRestartRound('Круг начат заново: приложение было свёрнуто');}
});
function fzNotify(title,body){
  try{
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    if(navigator.serviceWorker&&navigator.serviceWorker.ready)navigator.serviceWorker.ready.then(function(r){return r.showNotification(title,{body:body,tag:'rq-focus',silent:true});}).catch(function(){try{new Notification(title,{body:body,tag:'rq-focus'});}catch(e){}});
    else new Notification(title,{body:body,tag:'rq-focus'});
  }catch(e){}
}
function fzRestartRound(msg){const sn=fzSnap();FZ.base=sn?(sn.sureMs||0):0;FZ.prog=0;FZ.clean=true;FZ.rescued=false;FZ.hold=false;fzHideHold();fzPaint();if(msg)fzChipNote(msg);}
function fzShowHold(gone){
  const h=el('fzHold');if(!h)return;
  el('fzHoldT').textContent='Круг остановлен: приложение было свёрнуто '+Math.max(1,Math.round(gone/60000))+' мин.';
  h.classList.remove('hidden');
}
function fzHideHold(){const h=el('fzHold');if(h)h.classList.add('hidden');}

/* --- focus words: «зачем читаю сейчас» before the first round / focus of a session --- */
function fzAskWords(then){
  fzSync();
  if(!FZ_ASK_WORDS||!fzSet().words||FZ.asked||!FZ.sid){then();return;}
  const w=el('fzWords');if(!w){then();return;}
  FZ.asked=true;
  const inp=el('fzWordsIn');inp.value=FZ.fw||'';
  el('fzWordsChips').innerHTML=FZ_WORDS.map(function(t){return '<button type="button" class="fchip">'+esc(t)+'</button>';}).join('');
  el('fzWordsChips').querySelectorAll('button').forEach(function(b){b.onclick=function(){inp.value=b.textContent;};});
  const done=function(keep){FZ.fw=keep?String(inp.value||'').trim().slice(0,80):'';fzPush();w.classList.add('hidden');then();};
  el('fzWordsGo').onclick=function(){done(true);};
  el('fzWordsSkip').onclick=function(){done(false);};
  w.classList.remove('hidden');
}
/** the bottom-bar «Фокус» button: with pomodoro on it starts a round (words first), else plain focus mode as before */
function fzFocusButton(){
  if(!fzOn())return false;
  fzSync();
  const go=function(){if(fzSet().pomo&&FZ.phase==='idle')fzStartRound();fzSound(true);setFocus(true);};
  fzAskWords(go);return true;
}

/* --- the quiet chip / thin line --- */
let fzNoteT=null,fzNote='';
function fzChipNote(t){fzNote=t;clearTimeout(fzNoteT);fzNoteT=setTimeout(function(){fzNote='';fzPaint();},6000);fzPaint();}
function fzPaint(){
  const c=el('fzChip'),ln=el('fzLine'),r=el('reader');if(!c||!ln||!r)return;
  const on=fzOn()&&FZ.phase!=='idle';
  r.classList.toggle('fzrun',on);r.classList.toggle('fzquiet',on&&fzSet().quiet);
  if(!on){c.textContent='';ln.style.width='0';if(el('sheet')&&!el('sheet').classList.contains('hidden'))fzRenderTab(true);return;}
  const n=FZ.done.length+(FZ.phase==='run'?1:0);let t,p;
  if(FZ.phase==='rest'){t='Отдых '+fzClock(FZ.restUntil-Date.now());p=1;}
  else{t='Круг '+n+' · '+fzMin(FZ.prog)+' / '+FZ.len+' мин'+(FZ.hold?' · стоп':fzPaused()?' · пауза':'');p=Math.min(1,FZ.prog/(FZ.len*60000));}
  if(fzNote)t=fzNote;
  c.textContent=t;c.setAttribute('aria-label',t);
  ln.style.width=(p*100).toFixed(1)+'%';ln.classList.toggle('rest',FZ.phase==='rest');
  if(el('sheet')&&!el('sheet').classList.contains('hidden'))fzRenderTab(true);
}

/* ===== background sounds (WebAudio, synthesised: nothing to download, works offline) ===== */
let fzAC=null,fzBus=null,fzVoice=null,fzLoop=null;
function fzCtx(){
  if(fzAC)return fzAC;
  const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;
  try{fzAC=new A();fzBus=fzAC.createGain();fzBus.gain.value=0;fzBus.connect(fzAC.destination);}catch(e){fzAC=null;}
  return fzAC;
}
function fzNoise(kind){ /* 4 s looped buffer: white / pink / brown */
  const ac=fzAC,n=ac.sampleRate*4,b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);
  let l=0,b0=0,b1=0,b2=0;
  for(let i=0;i<n;i++){const w=Math.random()*2-1;
    if(kind==='brown'){l=(l+0.02*w)/1.02;d[i]=l*3.5;}
    else if(kind==='pink'){b0=0.997*b0+w*0.029591;b1=0.985*b1+w*0.032534;b2=0.95*b2+w*0.048056;d[i]=(b0+b1+b2+w*0.05)*0.9;}
    else d[i]=w*0.5;}
  const s=ac.createBufferSource();s.buffer=b;s.loop=true;return s;
}
function fzFilt(type,f,q){const x=fzAC.createBiquadFilter();x.type=type;x.frequency.value=f;if(q)x.Q.value=q;return x;}
function fzGain(v){const g=fzAC.createGain();g.gain.value=v;return g;}
/** a bed of filtered noise → out */
function fzBed(out,kind,type,f,g,q){const s=fzNoise(kind),x=fzFilt(type,f,q),a=fzGain(g);s.connect(x);x.connect(a);a.connect(out);s.start();return {s:s,f:x,g:a};}
/** short filtered-noise burst at time t (drops, crackles, rustle, scratch) */
function fzBurst(out,t,dur,type,f,peak,q){
  const ac=fzAC,n=Math.max(1,Math.floor(ac.sampleRate*dur)),b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);
  const s=ac.createBufferSource();s.buffer=b;const x=fzFilt(type,f,q||1),g=fzGain(peak);s.connect(x);x.connect(g);g.connect(out);s.start(t);
}
function fzTone(out,t,f,dur,peak,type,f2){
  const ac=fzAC,o=ac.createOscillator(),g=ac.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur*0.8);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+Math.min(0.02,dur/4));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(out);o.start(t);o.stop(t+dur+0.05);
}
const R_=function(a,b){return a+Math.random()*(b-a);};
/* each voice: build(out) → {stop(), step(t0,t1)} — step schedules the sparse events of the next second */
const FZ_VOICE={
  rain:function(o){const b=[fzBed(o,'pink','lowpass',5200,0.5),fzBed(o,'white','highpass',3000,0.05)];
    return {b:b,step:function(t){for(let i=0;i<14;i++)fzBurst(o,t+Math.random(),R_(0.01,0.03),'bandpass',R_(1500,5000),R_(0.03,0.09),2);}};},
  glass:function(o){const b=[fzBed(o,'pink','lowpass',3200,0.45)];
    return {b:b,step:function(t){for(let i=0;i<6;i++)fzBurst(o,t+Math.random(),R_(0.02,0.06),'bandpass',R_(900,2600),R_(0.06,0.18),4);}};},
  fire:function(o){const b=[fzBed(o,'brown','lowpass',600,0.6)];
    return {b:b,step:function(t){const n=Math.random()<0.5?2:5;for(let i=0;i<n;i++)fzBurst(o,t+Math.random(),R_(0.004,0.02),'highpass',R_(1800,4200),R_(0.1,0.35));}};},
  lib:function(o){const b=[fzBed(o,'brown','lowpass',320,0.35)];
    return {b:b,step:function(t){if(Math.random()<0.05)fzBurst(o,t+Math.random(),R_(0.25,0.5),'bandpass',R_(1800,3000),0.05,0.8);if(Math.random()<0.03)fzTone(o,t+Math.random(),R_(180,240),0.12,0.02,'triangle');}};},
  clock:function(o){const b=[fzBed(o,'brown','lowpass',260,0.25)];let k=0;
    return {b:b,step:function(t){fzTone(o,t,(k++%2)?2600:2200,0.035,0.08,'square');fzBurst(o,t,0.01,'highpass',3000,0.05);}};},
  studio:function(o){const b=[fzBed(o,'brown','lowpass',300,0.3)];
    return {b:b,step:function(t){if(Math.random()<0.35){const s=t+Math.random()*0.5,n=Math.floor(R_(2,6));for(let i=0;i<n;i++)fzBurst(o,s+i*R_(0.12,0.22),R_(0.08,0.16),'bandpass',R_(2800,4200),0.06,3);}}};},
  sea:function(o){const w=fzBed(o,'brown','lowpass',900,0.2),h=fzBed(o,'pink','bandpass',1800,0.05,0.6);let next=0;
    return {b:[w,h],step:function(t){if(t<next)return;const p=R_(7,11);next=t+p;
      [w.g.gain,h.g.gain].forEach(function(g,i){const top=i?0.18:0.9;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(top,t+p*0.45);g.linearRampToValueAtTime(i?0.03:0.18,t+p);});}};},
  cicada:function(o){const b=[fzBed(o,'pink','highpass',2000,0.04)];let next=0;
    return {b:b,step:function(t){if(t<next)return;const d=R_(3,6);next=t+d+R_(1,4);
      const ac=fzAC,os=ac.createOscillator(),am=ac.createOscillator(),ag=ac.createGain(),g=ac.createGain();
      os.frequency.value=R_(4200,5200);am.frequency.value=R_(35,55);ag.gain.value=0.5;am.connect(ag);ag.connect(g.gain);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.05,t+0.8);g.gain.linearRampToValueAtTime(0,t+d);
      os.connect(g);g.connect(o);os.start(t);am.start(t);os.stop(t+d+0.1);am.stop(t+d+0.1);}};},
  olive:function(o){const w=fzBed(o,'pink','bandpass',600,0.5,0.7);let next=0;
    return {b:[w],step:function(t){if(t<next)return;const p=R_(4,8);next=t+p;w.f.frequency.linearRampToValueAtTime(R_(350,1100),t+p);w.g.gain.linearRampToValueAtTime(R_(0.25,0.7),t+p);
      if(Math.random()<0.3)fzBurst(o,t+Math.random(),R_(0.3,0.6),'bandpass',R_(2500,4000),0.03,1);}};},
  garden:function(o){const b=[fzBed(o,'pink','lowpass',1200,0.12)];
    return {b:b,step:function(t){if(Math.random()<0.45){const s=t+Math.random()*0.6,n=Math.floor(R_(2,6)),f=R_(2400,4200);
      for(let i=0;i<n;i++)fzTone(o,s+i*R_(0.08,0.16),f*R_(0.85,1.15),R_(0.06,0.12),0.035,'sine',f*R_(1.2,1.6));}}};},
  brook:function(o){const b=[fzBed(o,'white','bandpass',900,0.2,1.5),fzBed(o,'white','bandpass',2100,0.1,2)];
    return {b:b,step:function(t){b.forEach(function(x){x.f.frequency.setTargetAtTime(R_(600,2600),t,0.15);x.g.gain.setTargetAtTime(R_(0.06,0.22),t,0.2);});
      for(let i=0;i<4;i++)fzTone(o,t+Math.random(),R_(500,1400),0.05,0.02,'sine',R_(1500,2500));}};},
  meadow:function(o){const b=[fzBed(o,'pink','lowpass',900,0.1)];const ac=fzAC,hum=ac.createOscillator(),hl=fzFilt('lowpass',500),hg=fzGain(0.012);
    hum.type='sawtooth';hum.frequency.value=210;hum.connect(hl);hl.connect(hg);hg.connect(o);hum.start();b.push({s:hum});
    return {b:b,step:function(t){for(let i=0;i<3;i++){const s=t+i*0.33;for(let k=0;k<3;k++)fzTone(o,s+k*0.045,R_(3900,4300),0.03,0.02,'sine');}}};},
  space:function(o){const ac=fzAC,b=[fzBed(o,'brown','lowpass',180,0.25)];
    [55,82.4,110.3].forEach(function(f,i){const os=ac.createOscillator(),g=fzGain(0.03),l=ac.createOscillator(),lg=fzGain(0.015);
      os.frequency.value=f;l.frequency.value=0.05+i*0.03;l.connect(lg);lg.connect(g.gain);os.connect(g);g.connect(o);os.start();l.start();b.push({s:os},{s:l});});
    return {b:b,step:function(){}};},
  starwind:function(o){const w=fzBed(o,'pink','bandpass',900,0.35,1.2),s=fzBed(o,'white','highpass',6000,0.02);let next=0;
    return {b:[w,s],step:function(t){if(t<next)return;const p=R_(5,9);next=t+p;w.f.frequency.linearRampToValueAtTime(R_(400,1600),t+p);
      if(Math.random()<0.4)fzTone(o,t+Math.random(),R_(1800,2600),1.5,0.008,'sine');}};},
  chimes:function(o){const b=[fzBed(o,'pink','lowpass',500,0.06)];const P=[523.3,587.3,659.3,784,880,1046.5];
    return {b:b,step:function(t){if(Math.random()<0.35){const f=P[Math.floor(Math.random()*P.length)];fzTone(o,t+Math.random(),f,R_(2.5,4),0.05,'sine');fzTone(o,t+Math.random(),f*2.01,2,0.012,'sine');}}};}
};
function fzSndId(){const s=fzSet().snd;if(!s)return null;const it=fzSoundList()[s-1];return it?it[0]:null;}
function fzReaderOpen(){const r=el('reader');return !!(r&&!r.classList.contains('hidden'));}
/** play the chosen sound of the worn skin while the reader is open and visible; on=false fades it out */
function fzSound(on){
  const id=fzOn()&&on&&fzReaderOpen()&&document.visibilityState!=='hidden'?fzSndId():null;
  if(fzVoice&&(!id||fzVoice.id!==id)){const v=fzVoice;fzVoice=null;clearInterval(fzLoop);fzLoop=null;
    if(fzAC){const t=fzAC.currentTime;fzBus.gain.cancelScheduledValues(t);fzBus.gain.setValueAtTime(fzBus.gain.value,t);fzBus.gain.linearRampToValueAtTime(0,t+0.6);}
    setTimeout(function(){try{v.out.disconnect();}catch(e){}v.b.forEach(function(x){try{x.s.stop();}catch(e){}});},700);}
  if(!id){return;}
  const ac=fzCtx();if(!ac)return;
  if(ac.state==='suspended')ac.resume().catch(function(){});
  const vol=fzSet().vol*0.8,t=ac.currentTime;
  fzBus.gain.cancelScheduledValues(t);fzBus.gain.setValueAtTime(fzBus.gain.value,t);fzBus.gain.linearRampToValueAtTime(vol,t+1.2);
  if(fzVoice)return;
  const out=fzGain(1);out.connect(fzBus);
  let v;try{v=FZ_VOICE[id](out);}catch(e){console.warn('[rq] focus sound',e);return;}
  fzVoice={id:id,out:out,b:v.b,step:v.step};
  let tNext=ac.currentTime+0.1;
  const pump=function(){if(!fzVoice)return;while(tNext<ac.currentTime+1.5){try{fzVoice.step(tNext);}catch(e){}tNext+=1;}};
  pump();fzLoop=setInterval(pump,500);
}
function fzVolume(){if(fzAC&&fzVoice){const t=fzAC.currentTime;fzBus.gain.cancelScheduledValues(t);fzBus.gain.setTargetAtTime(fzSet().vol*0.8,t,0.1);}}
/** soft bell at the end of a round (only when a sound is on: no sudden noise for those who read in silence) */
function fzChime(){if(!fzVoice||!fzAC)return;const t=fzAC.currentTime+0.05;fzTone(fzBus,t,880,2.5,0.12,'sine');fzTone(fzBus,t+0.25,1318.5,2.5,0.08,'sine');}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'){fzSound(false);if(fzAC&&fzAC.state==='running')setTimeout(function(){if(document.visibilityState==='hidden'&&fzAC)fzAC.suspend().catch(function(){});},800);}
  else if(fzReaderOpen())fzSound(true);});

/* ===== the «Фокус» tab ===== */
function fzSeg(id,vals,cur,lbl){return '<div class="rseg" id="'+id+'" role="group">'+vals.map(function(v,i){return '<button type="button" data-v="'+v+'"'+(v===cur?' class="on"':'')+'>'+esc(lbl?lbl[i]:String(v))+'</button>';}).join('')+'</div>';}
function fzSw(id,on,label,small){return '<div class="rrow"><span class="rl" id="'+id+'L">'+label+(small?'<small>'+small+'</small>':'')+'</span><button class="rsw" id="'+id+'" role="switch" aria-checked="'+(on?'true':'false')+'" aria-labelledby="'+id+'L"></button></div>';}
function fzRows(){return (typeof SESS!=='undefined'&&Array.isArray(SESS))?SESS:[];}
/** 12 weeks × 7 days, colour = minutes of completed rounds; a week with all three challenges done gets its badge */
function fzMapHtml(){
  const G=window.__rqGame,by=G.focusDays(fzRows()),t=today(),mon=G.weekStartOf(t);
  let h='<div class="fzmap" role="img" aria-label="Карта фокуса за 12 недель">';
  for(let w=11;w>=0;w--){
    const ws=addLocalDays(mon,-7*w),ch=G.focusChallenges(fzRows(),ws),all=ch.every(function(c){return c.done;});
    h+='<div class="fzwk'+(all?' badge':'')+'">';
    for(let d=0;d<7;d++){const k=addLocalDays(ws,d),m=by[k]||0,lv=k>t?-1:m>=90?4:m>=45?3:m>=25?2:m>0?1:0;
      h+='<i class="l'+lv+'" title="'+k+(m?': '+m+' мин фокуса':'')+'"></i>';}
    h+='<b>'+(all?rqIcon('trophy',12):'')+'</b></div>';
  }
  return h+'</div><div class="fzlegend"><span>меньше</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>больше</span></div>';
}
function fzStatusHtml(){
  if(FZ.phase==='idle')return '<button type="button" class="cta" id="fzGo">'+rqIcon('timer',18)+'<span>Начать круг '+fzSet().len+' мин</span></button>';
  const n=FZ.done.length;
  const st=FZ.phase==='rest'?('Круг '+n+' готов. Отдых '+fzClock(FZ.restUntil-Date.now())):('Круг '+(n+1)+': '+fzMin(FZ.prog)+' из '+FZ.len+' мин чтения'+(FZ.hold?' (остановлен)':fzPaused()?' (пауза)':''));
  return '<div class="fzstat"><b>'+esc(st)+'</b><span>Сегодня в этой книге: '+n+' '+plural(n,'круг','круга','кругов')+(FZ.best>1?' · подряд без выхода: '+FZ.best:'')+'</span></div>'+
    '<div class="fzbtns">'+(FZ.phase==='rest'?'<button type="button" class="ghostbtn" id="fzSkip">Пропустить отдых</button>':'')+'<button type="button" class="ghostbtn" id="fzEnd">Остановить круги</button></div>';
}
function fzRenderTab(statusOnly){
  const box=el('fzBox');if(!box)return;
  if(!fzOn()){box.innerHTML='';box.hidden=true;return;}
  box.hidden=false;
  if(statusOnly){const s=el('fzStatus');if(s&&s.dataset.k!==FZ.phase+FZ.done.length+fzMin(FZ.prog)+FZ.hold+Math.ceil((FZ.restUntil-Date.now())/1000)){s.innerHTML=fzStatusHtml();fzWireStatus();}return;}
  const f=fzSet(),G=window.__rqGame,rows=fzRows(),t=today();
  const streak=G.focusStreak(rows,t),todayR=rows.filter(function(r){return String(r.date).slice(0,10)===t;}).reduce(function(a,r){return a+G.rowPomo(r).length;},0)+FZ.done.length;
  const ch=G.focusChallenges(rows,G.weekStartOf(t)),snd=fzSoundList();
  box.innerHTML=
    '<div class="fzhead"><div><b>'+streak+'</b><span>'+plural(streak,'день','дня','дней')+' серии фокуса</span></div><div><b>'+todayR+'</b><span>'+plural(todayR,'круг','круга','кругов')+' сегодня</span></div></div>'+
    fzSw('fzPomo',f.pomo,'Помодоро','круги чтения с отдыхом; за полный круг +20% опыта и монеты (до '+G.POMO_DAY_CAP+' в день)')+
    (f.pomo?'<div class="rrow stack"><span class="rl">Круг чтения</span>'+fzSeg('fzLen',[15,25,45],f.len,['15 мин','25 мин','45 мин'])+
      '<div class="rnote">За полный круг: +'+G.POMO[15].coins+' / +'+G.POMO[25].coins+' / +'+G.POMO[45].coins+' монет. Считаются только засчитанные минуты: пауза и быстрое листание круг не двигают.</div></div>'+
      '<div class="rrow stack"><span class="rl">Отдых между кругами</span>'+fzSeg('fzRest',[3,5,10],f.rest,['3 мин','5 мин','10 мин'])+'</div>'+
      '<div class="rrow stack" id="fzStatus">'+fzStatusHtml()+'</div>':'')+
    fzSw('fzQuiet',f.quiet,'Тихий режим','с началом круга остаются только текст и тонкая линия круга')+
    '<div class="rrow stack"><span class="rl">Фоновые звуки<small>свой набор у каждого скина</small></span>'+fzSeg('fzSnd',[0,1,2,3],f.snd,['Выкл'].concat(snd.map(function(x){return x[1];})))+
      '<span class="rl rlv"><label for="fzVol">Громкость</label><span class="rv">'+Math.round(f.vol*100)+' %</span></span><input type="range" id="fzVol" min="5" max="100" step="5" value="'+Math.round(f.vol*100)+'"></div>'+
    fzSw('fzWarn',f.warn,'Не отвлекаться','при выходе во время круга напомнить, что он прервётся через минуту; после звонка круг можно продолжить')+
    '<div class="rrow stack"><span class="rl">Вызовы недели<small>за каждый +'+G.CHAL_COINS+' монет и значок</small></span><div class="fzchal">'+
      ch.map(function(c){return '<div class="'+(c.done?'done':'')+'"><span>'+(c.done?rqIcon('trophy',16):rqIcon('target',16))+esc(c.t)+'</span><em>'+c.have+' / '+c.goal+(c.unit?' '+c.unit:'')+'</em><div class="pbar"><i style="width:'+Math.round(c.have/c.goal*100)+'%"></i></div></div>';}).join('')+'</div></div>'+
    '<div class="rrow stack"><span class="rl">Карта фокуса<small>минуты полных кругов по дням</small></span>'+fzMapHtml()+'</div>';
  const sw=function(id,k,after){const b=el(id);if(b)b.onclick=function(){f[k]=!f[k];saveSet();fzRenderTab();if(after)after();};};
  sw('fzPomo','pomo',function(){if(!f.pomo)fzStop();});sw('fzQuiet','quiet',fzPaint);sw('fzWordsT','words');
  sw('fzWarn','warn',function(){if(f.warn&&'Notification' in window&&Notification.permission==='default')Notification.requestPermission().catch(function(){});});
  const seg=function(id,k,after){const s=el(id);if(s)s.querySelectorAll('button').forEach(function(b){b.onclick=function(){f[k]=Number(b.dataset.v);saveSet();fzRenderTab();if(after)after();};});};
  seg('fzLen','len',function(){if(FZ.phase==='run'&&FZ.prog<60000)FZ.len=f.len;fzPaint();});seg('fzRest','rest');seg('fzSnd','snd',function(){fzSound(true);});
  const v=el('fzVol');if(v){v.oninput=function(){f.vol=Number(v.value)/100;v.parentNode.querySelector('.rv').textContent=v.value+' %';fzVolume();};v.onchange=function(){saveSet();};}
  fzWireStatus();
}
function fzWireStatus(){
  const s=el('fzStatus');if(s)s.dataset.k=FZ.phase+FZ.done.length+fzMin(FZ.prog)+FZ.hold+Math.ceil((FZ.restUntil-Date.now())/1000);
  if(el('fzGo'))el('fzGo').onclick=function(){fzAskWords(function(){fzStartRound();el('sheet').classList.add('hidden');});};
  if(el('fzSkip'))el('fzSkip').onclick=fzSkipRest;
  if(el('fzEnd'))el('fzEnd').onclick=function(){fzStop();fzRenderTab();};
}

/* ===== «Итог фокуса» on the session summary ===== */
function fzSummaryHtml(row,qp){
  if(!fzOn()||!row)return '';
  const G=window.__rqGame,p=G.rowPomo(row),fw=row.fw||'';
  if(!p.length&&!fw)return '';
  const min=Math.floor(G.pomoMinutes(row)),pages=Number(row.pageTurns)||0,pace=pages?(Number(row.minutes)||0)/pages:0;
  const prev=fzRows().filter(function(r){return r!==row&&r.id!==row.id&&G.rowPomo(r).length&&(Number(r.pageTurns)||0)>0;}).sort(function(a,b){return G.startMs(a)-G.startMs(b);}).pop();
  let cmp='';
  if(prev&&pace>0){const pp=(Number(prev.minutes)||0)/prev.pageTurns,d=Math.round((pp-pace)/pp*100);cmp=Math.abs(d)<5?'темп как в прошлый раз':d>0?'на '+d+'% быстрее прошлого фокуса':'на '+(-d)+'% спокойнее прошлого фокуса';}
  const lines=[];
  if(p.length)lines.push(p.length+' '+plural(p.length,'круг','круга','кругов')+' · '+min+' мин чистого чтения'+(G.rowPomoRun(row)>1?' · '+G.rowPomoRun(row)+' подряд без выхода':''));
  if(pages)lines.push(pages+' стр. · '+(pace?pace.toFixed(1).replace('.',',')+' мин на страницу':'')+(cmp?' · '+cmp:''));
  const gold=[];
  if(qp&&qp.pomoGold>0)gold.push('+'+coinsP(qp.pomoGold)+' — круги фокуса');
  if(qp&&qp.chal&&qp.chal.length){const all=G.focusChallenges(fzRows(),G.weekStartOf(String(row.date).slice(0,10)));qp.chal.forEach(function(id){const c=all.filter(function(x){return x.id===id;})[0];gold.push('+'+coinsP(G.CHAL_COINS)+' — вызов недели «'+(c?c.t:id)+'»');});}
  return '<div class="fzsum">'+(fw?'<div class="fzfw">'+rqIcon('target',14)+'<span>Цель сессии: «'+esc(fw)+'»</span></div>':'')+
    lines.map(function(t){return '<div>'+rqIcon('timer',14)+'<span>'+esc(t)+'</span></div>';}).join('')+
    gold.map(function(t){return '<div class="g">'+rqIcon('coins',14)+'<span>'+esc(t)+'</span></div>';}).join('')+'</div>';
}

/* ===== wiring ===== */
el('fzHoldGo')&&(el('fzHoldGo').onclick=function(){FZ.rescued=true;FZ.hold=false;fzHideHold();fzPaint();});
el('fzHoldNew')&&(el('fzHoldNew').onclick=function(){fzRestartRound('');});
/** reader opened / closed (reader.js openBook, reader-ui.js closeReaderImpl) */
function fzOnOpen(){fzSync();fzPaint();if(fzOn())fzSound(true);}
function fzOnClose(){fzStop();fzSound(false);FZ.sid=null;}

/* ===== «Фокус и концентрация» in «Статистика» (Джессика 25.10: «результаты фокуса и концентрации можно добавить в статистику»).
   Everything from sessions[] (nothing stored): rounds, focus minutes and their share of all reading, streak (now / best),
   longest run without leaving, weekly challenges done, pace in focus vs without, focus minutes per day. ===== */
function fzStatsData(n){
  const G=window.__rqGame,rows=fzRows(),t=today(),from=addLocalDays(t,-(n-1));
  const inP=rows.filter(function(r){const d=String(r.date||'').slice(0,10);return d>=from&&d<=t;});
  let rounds=0,fmin=0,all=0,run=0,fp=[0,0],op=[0,0];
  inP.forEach(function(r){const p=G.rowPomo(r),m=Number(r.minutes)||0,pg=Number(r.pageTurns)||0;
    rounds+=p.length;fmin+=G.pomoMinutes(r);all+=m;run=Math.max(run,G.rowPomoRun(r));
    const acc=p.length?fp:op;if(pg>0){acc[0]+=m;acc[1]+=pg;}});
  const by=G.focusDays(rows),keys=Object.keys(by).sort();let best=0,cur=0,prev=null;
  keys.forEach(function(k){cur=(prev&&addLocalDays(prev,1)===k)?cur+1:1;best=Math.max(best,cur);prev=k;});
  let chal=0,wk=G.weekStartOf(from);
  while(wk<=t){chal+=G.focusChallenges(rows,wk).filter(function(c){return c.done;}).length;wk=addLocalDays(wk,7);}
  const days=[];for(let i=n-1;i>=0;i--){const d=addLocalDays(t,-i);days.push({d:d,v:{fz:by[d]||0}});}
  return {rounds:rounds,fmin:fmin,share:all>0?Math.round(Math.min(1,fmin/all)*100):0,streak:G.focusStreak(rows,t),best:best,run:run,chal:chal,
    paceF:fp[1]?fp[0]/fp[1]:0,paceO:op[1]?op[0]/op[1]:0,days:days};
}
function fzRenderStats(n){
  const box=el('fzStats');if(!box)return;
  if(!fzOn()){box.hidden=true;box.innerHTML='';return;}
  const s=fzStatsData(n||7),f1=function(x){return x.toFixed(1).replace('.',',');};
  box.hidden=false;
  const kpi=function(v,l){return '<div class="kpi"><b>'+v+'</b><span>'+l+'</span></div>';};
  box.innerHTML='<b style="font-size:13px">Фокус и концентрация</b>'+
    '<div class="kpis">'+kpi(s.rounds,plural(s.rounds,'круг','круга','кругов'))+kpi(Math.floor(s.fmin),'мин фокуса')+kpi(s.share+' %','чтения в фокусе')+'</div>'+
    '<div class="kpis">'+kpi(s.streak,plural(s.streak,'день серии','дня серии','дней серии'))+kpi(s.best,'лучшая серия')+kpi(s.run,'подряд без выхода')+'</div>'+
    '<div class="fzstl">'+rqIcon('trophy',16)+'<span>Вызовов недели выполнено: '+s.chal+'</span></div>'+
    (s.paceF&&s.paceO?'<div class="fzstl">'+rqIcon('timer',16)+'<span>В фокусе '+f1(s.paceF)+' мин на страницу, без фокуса '+f1(s.paceO)+'</span></div>':'')+
    '<div class="chart" id="chFocus"></div>'+
    (s.rounds?'':'<div class="pempty">Включи «Помодоро» во вкладке «Фокус» в читалке — здесь появятся круги</div>');
  if(typeof renderChart==='function')renderChart('chFocus',s.days,'fz','var(--rq-accent,var(--accent))');
}
