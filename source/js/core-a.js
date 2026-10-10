'use strict';

/* ================= MVP helpers ================= */
const REWARD_TIERS={small:100,mid:250,big:500};
const REWARD_TIER_LABELS={small:'Мелочь · 100',mid:'Приятное · 250',big:'Крупное · 500'};
const RQ_BUILD='__RQ_BUILD__'; /* replaced by build-dist.sh (visible in Настройки → Данные) */
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
  if(S.devMoney!==false){S.devMoney=false;ch=true;}
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
    if(el('bnLib'))el('bnLib').classList.toggle('on', onLib||(!onProf&&isMvp()));
    if(el('bnProf'))el('bnProf').classList.toggle('on', onProf);
  }
  /* tiny avatar on library streak */
  const ava=el('streakAva');
  if(ava){
    if(isMvp()){
      ava.style.display='inline-flex';
      try{
        if(S.useChar!==false&&typeof avatarSvg==='function')ava.innerHTML=avatarSvg();
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
    '<div class="pcard mvp-quest" id="mvpDailyCard"><div class="row"><span style="font-size:14px">Ежедневка +30 🪙</span><div class="spacer"></div>'+
      '<span class="chip" style="white-space:nowrap">'+(dDone?'✓ выполнено сегодня':mvpDailyInfo())+'</span>'+
    '</div><div class="pbar"><i style="width:'+Math.round(dP*100)+'%"></i></div></div>'+
    '<div class="pcard mvp-quest" id="mvpWeeklyCard"><div class="row"><span style="font-size:14px">Неделя +120 🪙</span><div class="spacer"></div>'+
      '<span class="chip" style="white-space:nowrap">'+mvpWeeklyInfo()+'</span>'+
    '</div><div class="pbar"><i style="width:'+Math.round(wP*100)+'%"></i></div>'+
      '<div class="mvp-qsub">'+(wDone?'✓ неделя выполнена':('4 дня по '+goalMin()+' мин за пн–вс'))+'</div></div>';
}
function renderMvpProfile(){
  if(el('mvpGold'))el('mvpGold').textContent=goldDisp();
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
function openRewardsSheet(){
  clearConfetti();clearToasts();
  renderRewardsSheet();
  el('rewardsScrim').classList.remove('hidden');
  el('rewardsSheet').classList.add('open');
}
function closeRewardsSheet(){
  el('rewardsSheet').classList.remove('open');
  el('rewardsScrim').classList.add('hidden');
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
  if(el('rewGoldChip'))el('rewGoldChip').textContent=curI()+' '+goldDisp();
  const box=el('rewSlots');if(!box)return;
  box.innerHTML=S.rewards.map(function(r,i){
    const label=r.name&&r.name.trim()?esc(r.name):(r.placeholder?'Назови награду…':'Без названия');
    const tiers=['small','mid','big'].map(function(t){
      return '<button type="button" class="'+(r.tier===t?'on':'')+'" onclick="setRewardTier('+i+',\''+t+'\')">'+REWARD_TIER_LABELS[t]+'</button>';
    }).join('');
    return '<div class="pcard" style="margin-bottom:10px">'+
      '<div class="row" style="gap:8px;align-items:center">'+
        '<input class="searchinp" style="flex:1;margin:0" value="'+esc(r.name||'')+'" placeholder="Название" onchange="renameRewardSlot('+i+',this.value)">'+
        '<button class="buy" '+(canAfford(r.cost)&&r.name&&r.name.trim()?'':'disabled')+' onclick="buyRewardTier('+i+')">'+r.cost+' 🪙</button>'+
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
      return '<li>'+esc(when)+' · '+esc(h.title||'')+' −'+(h.price||0)+' 🪙</li>';
    }).join(''):'<li>Пока пусто — купите награду за золото с квестов</li>';
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

