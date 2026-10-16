'use strict';
/* 1в: ONE icon set — Lucide sprite <svg id="rqSprite"> in app.html (tools/gen-icons.py). Stroke = currentColor (CSS .ic). */
function rqIcon(n,sz){sz=sz||22;return '<svg class="ic" width="'+sz+'" height="'+sz+'" aria-hidden="true" focusable="false"><use href="#i-'+n+'"/></svg>';}
/* 1в: elements that can never be hidden by rq_set.uiHidden (stage 2). Settings screen and import check read THIS list. */
/* keys: btnBack, rTitle, btnTimer = element ids; dayRing = кольцо дня (#dayBar в читалке, #ringFg в библиотеке);
   readCounter = счётчик «N / 10 мин» (#focusCount); coinToasts = тосты монет (flashMsg kind:'game'). */
const UI_LOCKED=Object.freeze(['btnBack','rTitle','btnTimer','dayRing','readCounter','coinToasts']);
/** stage 1г (rq_set.uiHidden, default []): drop locked ids on load and import — one rule for the settings screen and the import check. */
function uiHiddenClean(h){return Array.isArray(h)?h.filter(function(k,i){return typeof k==='string'&&UI_LOCKED.indexOf(k)<0&&h.indexOf(k)===i;}):[];}

/* ================= MVP helpers ================= */
const REWARD_TIERS={small:100,mid:250,big:500};
const REWARD_TIER_LABELS={small:'Мелочь · 100',mid:'Приятное · 250',big:'Крупное · 500'};
const RQ_BUILD='20261016-1023'; /* replaced by build-dist.sh (visible in Настройки → Данные) */
function isMvp(){return SET.mvp!==false;}
/* MVP: daily goal 10 min, 12 s/page, 3 min/page cap are fixed in code (saved / imported values ignored). Outside MVP: v6 (S.goal / S.anti). */
const MVP_GOAL=10, MVP_ANTI={minSec:12,maxMin:3};
function goalMin(){return isMvp()?MVP_GOAL:(S.goal||10);}
function antiCfg(){return isMvp()?{minSec:MVP_ANTI.minSec,maxMin:MVP_ANTI.maxMin}:(S.anti||{minSec:12,maxMin:3});}
/** Boot/import only: a backup with settings.mvp=false must not disable MVP lock-downs.
 *  ?dev=1 can still flip MVP off in-session via #mvpTgl; the next reload forces it back on. */
function mvpForceOn(){
  if(SET.mvp!==false)return false;
  SET.mvp=true;return true;
}
/** MVP: overwrite persisted goal / anti / devMoney with the fixed values. true if S changed. */
function mvpEnforce(){
  if(!isMvp())return false;
  let ch=false;
  if(S.goal!==MVP_GOAL){S.goal=MVP_GOAL;ch=true;}
  if(!S.anti||typeof S.anti!=='object'){S.anti={minSec:12,maxMin:3,v:2};ch=true;}
  if(S.anti.minSec!==MVP_ANTI.minSec){S.anti.minSec=MVP_ANTI.minSec;ch=true;}
  if(S.anti.maxMin!==MVP_ANTI.maxMin){S.anti.maxMin=MVP_ANTI.maxMin;ch=true;}
  if(S.devMoney!==false){S.devMoney=false;ch=true;} /* field kept (contract: old fields are never deleted), ∞ money is gone */
  return ch;
}
/* ?dev=1 shows the MVP switch and «Тест-режим» (body.dev; .dev-only is hidden otherwise) */
const RQ_DEV=/[?&]dev=1(?:&|$)/.test(location.search);
document.body.classList.toggle('dev',RQ_DEV);
function applyMvpChrome(){
  document.body.classList.toggle('mvp', isMvp());
  const bn=el('botnav');
  if(bn){
    const onLib=!el('library').classList.contains('hidden');
    const onProf=!el('profile').classList.contains('hidden');
    const onRew=!!(el('rewardsSheet')&&el('rewardsSheet').classList.contains('open'));
    const onSet=!!(el('settings')&&!el('settings').classList.contains('hidden')); /* 14.10: settings is not a tab → nothing highlighted */
    if(el('bnLib'))el('bnLib').classList.toggle('on', !onRew&&!onSet&&(onLib||(!onProf&&isMvp())));
    if(el('bnProf'))el('bnProf').classList.toggle('on', !onRew&&!onSet&&onProf);
    if(el('bnRew'))el('bnRew').classList.toggle('on', onRew);
    bn.querySelectorAll('.botnav-btn[data-nav]').forEach(function(b){const id=b.dataset.nav;if(id==='library'||id==='rewards'||id==='profile')return;
      const scr={quests:'quests',notes:'quotes',vocab:'vocab',stats:'stats'}[id];b.classList.toggle('on',!onRew&&!!scr&&!!el(scr)&&!el(scr).classList.contains('hidden'));});
  }
  /* tiny avatar on library streak */
  const ava=el('streakAva');
  if(ava){
    if(isMvp()){
      ava.style.display='inline-flex';
      try{
        if(typeof isPencil==='function'&&isPencil())ava.innerHTML=rqIcon('user-round',18);
        else if(S.useChar!==false&&typeof avatarSvg==='function')ava.innerHTML=avatarSvg();
        else ava.textContent=S.avatar||'📖';
      }catch(e){ava.textContent='📖';}
    }else ava.style.display='none';
  }
}
function weekKey(d){
  if(window.__rqGame&&window.__rqGame.weekStartOf)return window.__rqGame.weekStartOf(d||today());
  const x=new Date((d||today())+'T12:00:00');
  const day=(x.getDay()+6)%7; // Mon=0
  const mon=new Date(x);mon.setDate(x.getDate()-day);
  const y=mon.getFullYear(),m=String(mon.getMonth()+1).padStart(2,'0'),dd=String(mon.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+dd;
}
/* ===== sessions[] = single source of truth for minutes / XP / daily / weekly =====
   SESS mirrors IDB sessions[] (loaded at boot, appended by closeReader). */
let SESS=[];
/* whole minutes of a local day — game-awards dayMinutes (Math.floor of the sum), the ONE rule for streak, «N / 10»,
   week, gold, quests. `live` = counted minutes of the running session (day bar), counted as one more row. */
function dayMin(key,live){const G=window.__rqGame;if(!G||!G.dayMinutes)return 0;return G.dayMinutes(live?SESS.concat([{date:key,minutes:live}]):SESS,key);}
function minTodaySess(){return dayMin(today());}
function daysInWeekAtGoal(minNeed,wk){
  const need=minNeed!=null?minNeed:goalMin();
  wk=wk||weekKey(today());
  const days=window.__rqGame?window.__rqGame.daysAtGoalInWeek(SESS,wk,need):[];
  return {count:days.length,days:days,need:need,week:wk};
}
/** Award every sessions[] row not yet in game.awardedSessionIds (idempotent):
    XP = 10 × (dayMinutes after − before) per row (game-awards xpForSession, stored as row.xp), and AUTO daily +30 / weekly +120 for the (local) days of exactly
    these rows (game.dailyPaidDays / game.weeklyPaidWeeks). No claim button. */
function awardPendingSessions(){
  if(!window.__rqGame)return {xp:0,byId:{},ids:[],gold:0,daily:[],weekly:[]};
  const G=window.__rqGame;
  const res=G.applySessionAwards(S,SESS); /* XP per row = 10 × whole-minute step of its day (xpForSession), stored as row.xp */
  const fresh=SESS.filter(function(r){return r&&res.ids.indexOf(r.id)>=0;});
  if(__rq&&__rq.setSessionXp)fresh.forEach(function(r){__rq.setSessionXp(r.id,r.xp).catch(function(e){console.warn('[rq] setSessionXp',e);});});
  const q=G.applyQuestAwards(S,SESS,fresh,{goal:goalMin()});
  res.gold=q.gold;res.daily=q.daily;res.weekly=q.weekly;
  if(res.ids.length||q.gold)save();
  return res;
}
function dailyPaid(day){return (S.dailyPaidDays||[]).indexOf(day||today())>=0;}
function weeklyPaid(wk){return (S.weeklyPaidWeeks||[]).indexOf(wk||weekKey(today()))>=0;}
function mvpDailyProg(day){const g=goalMin();return Math.min(1,dayMin(day||today())/g);}
/** ONE function for whole counted minutes of a day (summary, quests, reader counter «7 / 10 мин»). */
function dayMinFloor(day,live){return Math.floor(dayMin(day||today(),live));}
/** Streak threshold (Boss/Product): a day keeps the streak at ≥ 2 counted minutes. atRisk + hint use the same number. */
const STREAK_MIN=2;
function streakAtRisk(day){const k=day||today();const m=isMvp()?dayMin(k):(((S.hist||{})[k]||{}).min||0);return S.streak>0&&m<STREAK_MIN;}
function mvpDailyInfo(day,live){return dayMinFloor(day,live)+' / '+goalMin()+' мин';} /* floor: never «10 / 10» before the goal is met */
function mvpWeeklyProg(wk){const w=daysInWeekAtGoal(goalMin(),wk);return Math.min(1,w.count/4);}
function mvpWeeklyInfo(wk){const w=daysInWeekAtGoal(goalMin(),wk);return Math.min(4,w.count)+' / 4 дня';}
function renderMvpQuests(){
  /* Status only — daily/weekly gold is paid automatically on the session summary */
  const box=el('mvpQuestBox');if(!box)return;
  const dDone=dailyPaid(), dP=dDone?1:mvpDailyProg();
  const wDone=weeklyPaid(), wP=wDone?1:mvpWeeklyProg();
  box.innerHTML=
    '<div class="pcard mvp-quest" id="mvpDailyCard"><div class="row"><span style="font-size:14px"><span>Ежедневка +'+coinsP(30)+'</span></span><div class="spacer"></div>'+
      '<span class="chip" style="white-space:nowrap">'+(dDone?'✓ выполнено сегодня':mvpDailyInfo())+'</span>'+
    '</div><div class="pbar"><i style="width:'+Math.round(dP*100)+'%"></i></div></div>'+
    '<div class="pcard mvp-quest" id="mvpWeeklyCard"><div class="row"><span style="font-size:14px"><span>Неделя +'+coinsP(120)+'</span></span><div class="spacer"></div>'+
      '<span class="chip" style="white-space:nowrap">'+mvpWeeklyInfo()+'</span>'+
    '</div><div class="pbar"><i style="width:'+Math.round(wP*100)+'%"></i></div>'+
      '<div class="mvp-qsub">'+(wDone?'✓ неделя выполнена':('4 дня по '+goalMin()+' мин за пн–вс'))+'</div></div>';
}
function renderMvpProfile(){
  if(el('mvpGold')){el('mvpGold').textContent=goldDisp();const gl=el('mvpGoldLbl');if(gl)gl.textContent=coinsP(goldDisp()).replace(/^\S+ /,'');}
  if(el('mvpStreak'))el('mvpStreak').textContent=S.streak||0;
  if(el('mvpMinToday'))el('mvpMinToday').textContent=Math.floor(minTodaySess());
  renderMvpQuests();
}
function clearConfetti(){
  document.querySelectorAll('.confetti').forEach(function(n){try{n.remove();}catch(e){}});
}
function clearToasts(){
  document.querySelectorAll('.rq-toast').forEach(function(n){try{n.remove();}catch(e){}});
}
let rewTab='life';
function setRewardsTab(t){rewTab=t==='shop'?'shop':'life';
  if(rewTab!=='shop')try{closeShopDetail();}catch(e){}
  [['life','rewTabLife','rewPaneLife'],['shop','rewTabShop','rewPaneShop']].forEach(function(x){const on=x[0]===rewTab,b=el(x[1]),p=el(x[2]);
    if(b){b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false');}if(p)p.hidden=!on;});
  renderRewardsSheet();}
function openRewardsSheet(tab){
  if(tab)rewTab=tab==='shop'?'shop':'life';
  clearConfetti();clearToasts();
  setRewardsTab(rewTab);
  {const rs=el('rewardsSheet'),nh=(typeof rqNavH==='function'?rqNavH():0);rs.style.bottom=nh+'px';rs.scrollTop=0;el('rewardsScrim').style.bottom=nh+'px';} /* scrim stops above the bottom nav: tabs stay tappable */
  el('rewardsScrim').classList.remove('hidden');
  el('rewardsSheet').classList.add('open');
  applyMvpChrome(); /* bottom nav: «Награды» selected */
}
function closeRewardsSheet(){
  try{closeShopDetail();}catch(e){} /* примерка ends when the shop closes */
  el('rewardsSheet').classList.remove('open');
  el('rewardsScrim').classList.add('hidden');
  applyMvpChrome();
}
function ensureMvpRewards(){
  if(!S.rewards||!S.rewards.length){
    S.rewards=[
      {name:'Кофе',tier:'small',cost:100,bought:0},
      {name:'Серия сериала',tier:'small',cost:100,bought:0},
      {name:'',tier:'small',cost:100,bought:0,placeholder:true}
    ];
  }
  S.rewards.forEach(function(r){
    if(!r.tier)r.tier=(r.cost>=500?'big':(r.cost>=250?'mid':'small'));
    r.cost=REWARD_TIERS[r.tier]||100;
  });
  S.rewardPurchases=S.rewardPurchases||[];
}
function renderRewardsSheet(){
  ensureMvpRewards();
  if(el('rewBalance'))el('rewBalance').textContent=coinsP(S.gold); /* one balance for both tabs, text only */
  try{renderShopPane();}catch(e){console.warn('[rq] shop',e);}
  const box=el('rewSlots');if(!box)return;
  box.innerHTML=S.rewards.map(function(r,i){
    const label=r.name&&r.name.trim()?esc(r.name):(r.placeholder?'Назови награду…':'Без названия');
    const tiers=['small','mid','big'].map(function(t){
      return '<button type="button" class="'+(r.tier===t?'on':'')+'" onclick="setRewardTier('+i+',\''+t+'\')">'+REWARD_TIER_LABELS[t]+'</button>';
    }).join('');
    return '<div class="pcard" style="margin-bottom:10px">'+
      '<div class="row" style="gap:8px;align-items:center">'+
        '<input class="searchinp" style="flex:1;margin:0" value="'+esc(r.name||'')+'" placeholder="Название" onchange="renameRewardSlot('+i+',this.value)">'+
        '<button class="buy" '+(canAfford(r.cost)&&r.name&&r.name.trim()?'':'disabled')+' onclick="buyRewardTier('+i+')">'+coinsP(r.cost)+'</button>'+
      '</div>'+
      '<div class="tierseg">'+tiers+'</div>'+
      '<div class="row" style="font-size:12px;color:var(--muted)"><span>получено: '+(r.bought||0)+'</span><div class="spacer"></div>'+
        (S.rewards.length>1?'<button class="lnk danger" onclick="delRewardSlot('+i+')">удалить</button>':'')+
      '</div></div>';
  }).join('');
  const hist=el('rewHist');
  if(hist){
    const rows=(S.rewardPurchases||[]).slice().reverse().slice(0,12);
    hist.innerHTML=rows.length?rows.map(function(h){
      const when=h.at?localDay(h.at):''; /* stored ISO stamp, shown as the local day */
      return '<li>'+esc(when)+' · '+esc(h.title||'')+' −'+coinsP(h.price||0)+'</li>';
    }).join(''):'<li>Пока пусто — купите награду за монеты с квестов</li>';
  }
}
function setRewardTier(i,t){
  ensureMvpRewards();const r=S.rewards[i];if(!r||!REWARD_TIERS[t])return;
  r.tier=t;r.cost=REWARD_TIERS[t];save();renderRewardsSheet();
}
function renameRewardSlot(i,name){
  ensureMvpRewards();const r=S.rewards[i];if(!r)return;
  r.name=(name||'').trim().slice(0,60);r.placeholder=!r.name;save();renderRewardsSheet();
}
function delRewardSlot(i){
  ensureMvpRewards();if(S.rewards.length<=1)return;
  if(!confirm('Удалить слот?'))return;S.rewards.splice(i,1);save();renderRewardsSheet();
}
function buyRewardTier(i){
  ensureMvpRewards();const r=S.rewards[i];if(!r||!r.name||!r.name.trim()){flashMsg('Сначала назовите награду');return;}
  r.cost=REWARD_TIERS[r.tier]||r.cost;if(!canAfford(r.cost))return;
  spend(r.cost);r.bought=(r.bought||0)+1;
  S.rewardPurchases=S.rewardPurchases||[];
  S.rewardPurchases.push({id:'rp_'+Date.now()+'_'+i, title:r.name, price:r.cost, at:new Date().toISOString()});
  save();try{confettiReward();}catch(e){}flashMsg('🎉 «'+r.name+'» — ваша!');renderRewardsSheet();renderMvpProfile();
  if(!isMvp())renderShop();
}
function addRewardSlot(){
  ensureMvpRewards();
  if(S.rewards.length>=5){flashMsg('Максимум 5 слотов');return;}
  S.rewards.push({name:'',tier:'small',cost:100,bought:0,placeholder:true});save();renderRewardsSheet();
}

/* Collapsible option list (14.10): one 52px row «label · current value ⌄»; tap expands inline; picking an option applies it and collapses.
   Open state lives in memory only (RQ_EXP), nothing is written. valueFn reads the current value from the list itself. */
const RQ_EXP={};
function rqCollapse(boxId,label,valueFn,rowId,opt){
  const box=el(boxId);if(!box)return;rowId=rowId||(boxId+'X');box.dataset.xrow=rowId;let row=el(rowId);
  if(!row){row=document.createElement('button');row.type='button';row.id=rowId;row.className='xrow';row.setAttribute('aria-controls',boxId);
    box.parentNode.insertBefore(row,box);
    row.onclick=function(){RQ_EXP[boxId]=!RQ_EXP[boxId];rqCollapseSync(boxId);};
    box.addEventListener('click',function(e){if(e.target.closest('button')&&RQ_EXP[boxId]){RQ_EXP[boxId]=false;setTimeout(function(){rqCollapseSync(boxId);},0);}});
    row._label=label;row._val=valueFn;row._opt=opt||{};}
  rqCollapseSync(boxId);
}
function rqCollapseSync(boxId){const box=el(boxId),row=box&&el(box.dataset.xrow||boxId+'X');if(!box||!row)return;const open=!!RQ_EXP[boxId];
  let v='';try{v=row._val()||'';}catch(e){}
  const o=row._opt||{};let dot='';try{dot=o.dot?o.dot():'';}catch(e){}
  const ic=o.icon?rqIcon(o.icon,22):'';let sub='';try{sub=o.sub?o.sub():'';}catch(e){}
  let di='';try{di=o.dotIcon?o.dotIcon():'';}catch(e){}
  const dotH=dot?'<span class="xdot'+(di?' xdot-skin':'')+'" aria-hidden="true" style="background:'+dot+'">'+(di?rqIcon(di,14):'')+'</span>':'';
  const head=o.title?'<span class="xlab"><span class="xt">'+esc(o.title)+'</span>'+(sub?'<span class="xsub">'+esc(sub)+'</span>':'')+'</span>':'';
  const sample=o.sample?'<span class="xs" aria-hidden="true">'+esc(o.sample)+'</span>':'';
  /* layout (Интерфейс 14.10): [icon | sample] [title+sub | label] … [dot] value ⌄ */
  row.innerHTML=ic+sample+head+(row._label?'<span class="xl">'+esc(row._label)+'</span>':'')+(o.title?'':dotH)+'<span class="xv">'+esc(v)+'</span>'+(o.title?'':'')+rqIcon(open?'chevron-up':'chevron-down',20);
  if(o.title&&dot){row.querySelector('.xv').insertAdjacentHTML('beforebegin',dotH);}
  try{if(o.font){const ff=o.font();row.querySelector('.xv').style.fontFamily=ff;const xs=row.querySelector('.xs');if(xs)xs.style.fontFamily=ff;}}catch(e){}
  row.setAttribute('aria-expanded',open?'true':'false');box.hidden=!open;box.classList.add('xlist');}
