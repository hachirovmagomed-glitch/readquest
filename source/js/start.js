'use strict';
/* ================= СТАРТ (ждёт bootStorage) ================= */

/* ================= MVP UI wiring ================= */
(function wireMvp(){
  function goLib(){closeRewardsSheet();renderLibrary();show('library');closeDrawer();}
  function goProf(){closeRewardsSheet();renderProfile();show('profile');closeDrawer();}
  if(el('bnLib'))el('bnLib').onclick=goLib;
  if(el('bnProf'))el('bnProf').onclick=goProf;
  if(el('btnOpenRewards'))el('btnOpenRewards').onclick=function(){openRewardsSheet();};
  if(el('rewardsClose'))el('rewardsClose').onclick=closeRewardsSheet;
  if(el('rewardsScrim'))el('rewardsScrim').onclick=closeRewardsSheet;
  if(el('btnAddRewardSlot'))el('btnAddRewardSlot').onclick=addRewardSlot;
  if(el('btnMvpSettings'))el('btnMvpSettings').onclick=function(){closeRewardsSheet();renderSettings();show('settings');};
  if(el('mvpTgl'))el('mvpTgl').onclick=function(){
    SET.mvp=!(SET.mvp!==false);saveSet();if(mvpEnforce())save();applyMvpChrome();renderSettings();
    if(isMvp()){renderLibrary();show('library');}else{renderLibrary();show('library');}
    flashMsg(isMvp()?'MVP включён (4 экрана)':'Полный UI v6');
  };
  if(el('focusTgl'))el('focusTgl').onclick=function(){
    SET.focusMode=!(SET.focusMode!==false);saveSet();renderSettings();
    flashMsg(isFocus()?'Фокус: RPG скрыт в читалке':'Фокус выключен');
  };
})();

window.__rqStart=async function(api, tracker){
  __rq=api; window.__rq=api; window.__tracker=tracker;
  __tracker=tracker;
  /* single writer: every tracker call that counts/writes is gated synchronously (a thawed, stolen-from
     window demotes itself on its first call instead of counting minutes B already finished) */
  ['begin','setCounting','pageTurned','pageShown','userActive','onPageChange','end'].forEach(function(m){
    var f=tracker[m]; if(typeof f!=='function')return;
    tracker[m]=function(){ if(window.__rqWriter&&!__rqWriter.mayWrite())return m==='end'?Promise.resolve(null):undefined; return f.apply(tracker,arguments); };
  });
  const flat=api.loadFlat?api.loadFlat():{};
  hydrateS(flat);
  if(api.loadSettings){try{SET=Object.assign({},SETDEF,api.loadSettings());}catch(e){}}
  if(mvpForceOn())saveSet(); /* import/load: settings.mvp=false → force true before lock-downs */
  if(mvpEnforce())save(); /* MVP: goal 10 / 12 s / 3 min / no ∞ money */
  /* Hydrate user book texts from IDB */
  const books=S.userBooks||[];
  for(let i=0;i<books.length;i++){
    const b=books[i];
    if(!b||b.type==='pdf'||b.text)continue;
    try{const t=await api.idb.getText(b.id);if(typeof t==='string')b.text=t;}catch(e){}
  }
  if(!S.grant40k){if(!isMvp()){S.gold=(S.gold||0)+40000;}S.grant40k=true;save();}
  /* sessions[] is the source of truth: recover a session left open by a killed tab, then award
     any row not yet in game.awardedSessionIds (idempotent across reloads / imports). */
  try{if(api.ensureSessionIds)await api.ensureSessionIds();}catch(e){console.warn('[rq] ensureSessionIds',e);} /* pre-UUID rows → legacy-… ids */
  const noLocks=!!(window.__rqWriter&&__rqWriter.noLocks);
  if(!noLocks){try{if(api.recoverDraft)await api.recoverDraft(api);}catch(e){console.warn('[rq] recoverDraft',e);}}
  try{SESS=api.listSessions?await api.listSessions({}):[];}catch(e){SESS=[];console.warn('[rq] listSessions',e);}
  /* old «Забрать» claims (incl. a UTC-day claim of today) → paid lists, once */
  if(window.__rqGame&&window.__rqGame.migrateClaimedToPaid(S,Date.now()))save();
  if(isMvp()&&!noLocks){const br=awardPendingSessions();__bootGold=br.gold||0;} /* recovered session: paid now, silently */
  if(noLocks){
    document.body.classList.add('rq-nolocks'); /* quiet line in the reader */
    if(!window.__rqNoLocksLogged&&api.logAnalyticsEvent){window.__rqNoLocksLogged=true;api.logAnalyticsEvent({type:'no_locks'}).catch(function(e){console.warn('[rq] no_locks',e);});}
  }
  if(el('buildVer'))el('buildVer').textContent=RQ_BUILD;
  applyAppTheme();applyScale();applyPixel();
  renderThemeSeg();applyMvpChrome();renderLibrary();show('library');startLang();
  console.info('[rq] booted schema', flat.schemaVersion||1, 'goal', S.goal);
  window.__rqReady=true;
  {const bt=el('rqBoot');if(bt)bt.classList.add('hidden');const fl=el('rqFail');
    if(fl&&!fl.classList.contains('hidden')){ /* late boot after the watchdog (e.g. IndexedDB answered at 5 s): continue by itself, fade 200 ms into the library */
      if(window.__rqDiag)__rqDiag.mark('late-recover',Math.round(performance.now()));
      fl.style.transition='opacity .2s ease';fl.style.pointerEvents='none';requestAnimationFrame(function(){fl.style.opacity='0';});
      setTimeout(function(){fl.classList.add('hidden');fl.style.opacity='';fl.style.transition='';fl.style.pointerEvents='';},220);
    }}
  if(window.__rqDiag){if(__rqDiag.res)__rqDiag.res('library');__rqDiag.mark('library');}
};
/* Stub: Создать героя → analytics event only (no AI / no network) */
document.addEventListener('click',function(ev){
  const t=ev.target&&ev.target.closest&&ev.target.closest('#btnHeroCreate');
  if(!t)return;
  ev.preventDefault();
  if(__rq&&__rq.logAnalyticsEvent){
    __rq.logAnalyticsEvent({type:'hero_create_tapped'}).catch(function(e){console.warn(e);});
  }else if(__rq&&__rq.logReadingEvent){
    /* fallback if analytics helper missing */
    __rq.logReadingEvent({bookId:'_ui', pageVisibleMs:0, type:'hero_create_tapped'}).catch(function(){});
  }
  flashMsg('Скоро ✨');
});
/* UI blocked until module boot calls __rqStart */
