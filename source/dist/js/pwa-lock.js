/* ===== PWA: writer lock, takeover, SW, storage.persist ===== */
(function(){
  'use strict';
  var gate=window.__rqWriter, TAKEOVER_MS=2000, bc=null, waitRelease=null;
  try{bc=new BroadcastChannel(RQ_K.bc);}catch(e){}
  function themeRO(){try{var v=JSON.parse(localStorage.getItem(RQ_K.v1)||'{}');if(v.game&&v.game.appTheme)S.appTheme=v.game.appTheme;applyAppTheme();}catch(e){}} /* read-only: CSS vars only */
  function ov(on){if(on)themeRO();var o=document.getElementById('rqOther');if(o)o.classList.toggle('hidden',!on);if(on){var bt=document.getElementById('rqBoot');if(bt)bt.classList.add('hidden');}if(window.__rqDiag)__rqDiag.mark('other-window',on);}
  function spin(on){var b=document.getElementById('rqOtherBtn');if(!b)return;b.disabled=on;b.querySelector('.rq-spin').classList.toggle('hidden',!on);}
  /* overlay texts: 'new' = this window waits for the lock (default markup, tests check it verbatim);
     'old' = this window HAD the lock and lost it (handover / stolen / owner) */
  var TXT_NEW={h:'ReadQuest открыт в другом окне',p:'Чтобы прогресс не задвоился, читать можно только в одном окне',b:'Открыть здесь'};
  function ovText(mode,page){
    var t=TXT_NEW;
    if(mode==='old')t=page!=null?{h:'Книга открыта в другом окне',p:'Прогресс сохранён на странице '+page,b:'Вернуться сюда'}
                                 :{h:'ReadQuest открыт в другом окне',p:'Всё сохранено. Продолжайте в другом окне или вернитесь сюда',b:'Вернуться сюда'};
    var h=document.getElementById('rqOtherH'),pp=document.getElementById('rqOtherP'),l=document.getElementById('rqOtherL');
    if(h)h.textContent=t.h;if(pp)pp.textContent=t.p;if(l)l.textContent=t.b;
  }
  /* page label of what is SAVED for the open book (= where it reopens: NS_v1 progress ratio, farthest page) */
  function savedPage(){
    try{if(typeof R==='undefined'||!R.book)return null;var pc=R.pageCount||1,ratio=typeof rqPos==='function'?rqPos(R.book.id):(((S.progress||{})[R.book.id]||{}).ratio||0); /* where it reopens = current position */
      var n=Math.max(0,Math.min(pc-1,Math.round(ratio*(pc-1))));return R.mode==='pdf'&&typeof pdfLabel==='function'?pdfLabel(n):String(n+1);}catch(e){return null;}
  }
  /* lose writer role: from here on this window writes nothing; re-read storage for display, show the old-window screen.
     Page + time were already saved while this window was the writer (persistPage on every page change, session draft;
     handover: closeReader() wrote row + page before release) — after losing the lock nothing may be written. */
  gate.demote=function(why){
    if(gate.passive)return; gate.passive=true; gate.why=why;
    try{if(typeof __tracker!=='undefined'&&__tracker&&__tracker.cancel)Promise.resolve(__tracker.cancel()).catch(function(){});}catch(e){}
    try{if(typeof stopDayBar==='function')stopDayBar();if(typeof stopTimerTick==='function')stopTimerTick();if(typeof R!=='undefined')R.timerOn=false;}catch(e){} /* reading timer stopped, no XP */
    try{if(window.__rq&&__rq.loadFlat)hydrateS(__rq.loadFlat());}catch(e){}
    var page=gate.handoverPage!==undefined?gate.handoverPage:savedPage();gate.handoverPage=undefined;
    if(gate.release){var r=gate.release;gate.release=null;r();}
    if(gate.booted)ovText('old',page);
    spin(false);ov(true);
    if(window.__rqDiag)__rqDiag.mark('demote',[why,page]);
  };
  function hold(opts){
    return new Promise(function(res){
      navigator.locks.request(RQ_K.lock,opts,function(lock){
        if(!lock){res(false);return;}
        gate.passive=false;gate.setOwner();res(true);
        return new Promise(function(rel){gate.release=rel;});
      }).catch(function(e){ /* stolen (AbortError on the held lock) or aborted wait */
        if(e&&e.name==='AbortError'&&opts.signal&&opts.signal.aborted){res(false);return;}
        gate.demote('stolen');res(false);
      });
    });
  }
  function takeover(){
    spin(true);
    var ac=new AbortController();
    try{bc&&bc.postMessage({t:'takeover',from:gate.id});}catch(e){}
    return Promise.race([
      hold({signal:ac.signal}),
      new Promise(function(r){setTimeout(function(){r('timeout');},TAKEOVER_MS);})
    ]).then(function(x){
      if(x===true)return true;
      ac.abort(); /* holder frozen/unresponsive → steal */
      return hold({steal:true});
    });
  }
  window.__rqAcquire=async function(){
    if(!navigator.locks||!navigator.locks.request){gate.noLocks=true;window.__rqDiag&&__rqDiag.mark('acquire-nolocks');return true;} /* no single-writer guarantee → read + save page, but no sessions / XP / coins (see __rqStart) */
    gate.locks=true;
    var auto=false;try{auto=sessionStorage.getItem(RQ_K.takeover)==='1';sessionStorage.removeItem(RQ_K.takeover);}catch(e){}
    /* reload race: the previous document of THIS tab may still hold the lock for a moment → retry ~1 s before showing the overlay */
    var DG=window.__rqDiag||{mark:function(){}};
    if(!auto){for(var i=0;i<7;i++){var got=await hold({ifAvailable:true});DG.mark('acquire-try',[i,got]);if(got)return true;await new Promise(function(r){setTimeout(r,150);});}}
    gate.passive=true;
    if(!auto)ov(true);
    await new Promise(function(done){
      var b=document.getElementById('rqOtherBtn');
      var busy=false;var go=function(){if(busy)return;busy=true;b.disabled=true;/* one takeover per wait: no second steal */takeover().then(function(ok){busy=false;if(ok)done();else spin(false);});};
      waitGo=function(){if(busy||b.disabled)return;go();};
      if(auto){ov(true);go();}
    });
    waitGo=null;ov(false);return true;
  };
  /* «Открыть здесь» (waiting at boot) / «Вернуться сюда» (old window, already booted): ONE handler for both.
     Booted window → reload with the takeover flag → the fresh document runs the same takeover flow. */
  var waitGo=null;
  (function(){var b=document.getElementById('rqOtherBtn');if(!b)return;
    b.addEventListener('click',function(){
      if(b.disabled)return;
      if(gate.booted){b.disabled=true;spin(true);try{sessionStorage.setItem(RQ_K.takeover,'1');}catch(e){}location.reload();return;}
      if(waitGo)waitGo();
    });
  })();
  /* holder side: another window asks → end session cleanly, save, release, become passive */
  /* thaw (Page Lifecycle 'resume') / back to foreground: check ownership first thing */
  document.addEventListener('resume',function(){gate.mayWrite();},true);
  document.addEventListener('visibilitychange',function(){gate.mayWrite();},true);
  if(bc)bc.onmessage=async function(ev){
    var d=ev.data||{};
    /* test build «Сбросить тест» in another window: go passive at once (no write may resurrect the old state), reload */
    if(d.t==='reset'&&d.from!==gate.id){
      gate.passive=true;
      try{if(typeof __tracker!=='undefined'&&__tracker&&__tracker.cancel)__tracker.cancel();}catch(e){}
      if(!gate.vcReload){gate.vcReload=true;location.reload();}
      return;
    }
    if(d.t!=='takeover'||d.from===gate.id||gate.passive||!gate.release)return;
    if(!gate.mayWrite())return; /* already stolen (queued message seen after thaw): mayWrite() demoted us — do NOT close the reader / write */
    try{if(typeof R!=='undefined'&&R.book){persistPage();gate.handoverPage=savedPage();}else gate.handoverPage=null;}catch(e){}
    try{if(typeof R!=='undefined'&&R.book&&typeof closeReader==='function')await closeReader();}catch(e){console.warn('[rq] takeover close',e);}
    try{if(window.__rq&&__rq.saveFlat)await __rq.saveFlat(S);}catch(e){}
    gate.demote('handover');
  };
  window.__rqAfterBoot=function(api){
    gate.booted=true;
    if(gate.persistLogged)return; gate.persistLogged=true;
    if(navigator.storage&&navigator.storage.persist){
      navigator.storage.persist().then(function(g){
        if(gate.mayWrite()&&api.logAnalyticsEvent)return api.logAnalyticsEvent({type:'storage_persist',granted:!!g});
      }).catch(function(e){console.warn('[rq] persist',e);});
    }
  };
  if('serviceWorker' in navigator&&window.isSecureContext){
    window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(function(e){console.warn('[rq] sw',e);});});
  }
})();
