'use strict';
/* ================= КАЛЕНДАРЬ ================= */
let calY,calM,calSel=null;
function calKey(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
function renderCalendar(){
  rollDay();
  const now=new Date();
  if(calY===undefined){calY=now.getFullYear();calM=now.getMonth();}
  const MON=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  el('calTitle').textContent=MON[calM]+' '+calY;
  el('calDow').innerHTML=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=>'<div class="caldow">'+d+'</div>').join('');
  const first=new Date(calY,calM,1);
  const lead=(first.getDay()+6)%7;
  const dim=new Date(calY,calM+1,0).getDate();
  const tk=today();
  let cells='';
  for(let i=0;i<lead;i++)cells+='<div class="calcell empty"></div>';
  for(let d=1;d<=dim;d++){
    const k=calKey(calY,calM,d);
    const h=S.hist[k];
    const read=h&&((h.min||0)>=1||(h.pages||0)>=1);
    const goalMet=h&&(h.min||0)>=goalMin();
    const planned=!!S.planned[k];
    const cls=['calcell'];
    if(k===tk)cls.push('today');
    if(read)cls.push('read');
    if(planned&&!read)cls.push('planned');
    cells+='<button class="'+cls.join(' ')+'" onclick="calPick(\''+k+'\')">'+d+
      (planned?'<span class="pin">📌</span>':'')+
      (goalMet?'<span class="dot"></span>':'')+'</button>';
  }
  el('calGrid').innerHTML=cells;
  el('calNotifTgl').textContent=S.notif.on?'Вкл':'Выкл';
  el('calNotifTime').textContent=S.notif.time;
  const atRisk=streakAtRisk(tk); /* 1б: 2 min, same as the streak */
  const sm=monthSummary(calY,calM);
  el('calTop').innerHTML='<div class="pcard" style="margin-bottom:10px"><div class="row"><b style="font-size:16px">🔥 '+S.streak+' '+plural(S.streak,'день','дня','дней')+' подряд</b>'+
    (atRisk?'<div class="spacer"></div><span class="chip" style="background:rgba(255,184,76,.18);color:var(--accent2)">⚠️ серия под угрозой</span>':'')+'</div>'+
    '<div style="font-size:12px;color:var(--muted);margin-top:6px">За '+MON[calM]+': '+sm.days+' '+plural(sm.days,'день','дня','дней')+' · '+sm.mn+' мин · '+sm.pg+' стр'+(sm.bestD?' · лучший день: '+sm.bestD+' ('+sm.bestM+' мин)':'')+'</div></div>';
  el('calYear').innerHTML='<div style="font-size:12px;color:var(--muted);margin:14px 0 6px">Год чтения</div>'+yearHeatmap();
  calRenderDay(calSel||tk);
}
function calPick(k){
  calSel=k;
  if(k>=today()){if(S.planned[k])delete S.planned[k];else S.planned[k]=true;save();}
  renderCalendar();
}
function monthSummary(y,m){
  let mn=0,pg=0,days=0,bestD=0,bestM=0;
  const dim=new Date(y,m+1,0).getDate();
  for(let d=1;d<=dim;d++){
    const h=S.hist[calKey(y,m,d)];
    if(h&&((h.min||0)>=1||(h.pages||0)>=1)){days++;mn+=h.min||0;pg+=h.pages||0;if((h.min||0)>bestM){bestM=Math.round(h.min||0);bestD=d;}}
  }
  return {mn:Math.round(mn),pg:pg,days:days,bestD:bestD,bestM:bestM};
}
function yearHeatmap(){
  const d=new Date();d.setHours(0,0,0,0);
  const dow=(d.getDay()+6)%7;
  const weeks=53;
  const start=new Date(d);start.setDate(d.getDate()-dow-(weeks-1)*7);
  let html='<div class="yhwrap"><div class="yhgrid">';
  for(let w=0;w<weeks;w++){
    html+='<div class="yhcol">';
    for(let dd=0;dd<7;dd++){
      const cur=new Date(start);cur.setDate(start.getDate()+w*7+dd);
      const key=cur.getFullYear()+'-'+String(cur.getMonth()+1).padStart(2,'0')+'-'+String(cur.getDate()).padStart(2,'0');
      const m=(S.hist[key]&&S.hist[key].min)||0;
      const lvl=(cur>d)?'f':(m<=0?'0':m<10?'1':m<30?'2':m<60?'3':'4');
      html+='<i class="yh yh'+lvl+'" title="'+key+': '+Math.round(m)+' мин"></i>';
    }
    html+='</div>';
  }
  return html+'</div></div>';
}
function calRenderDay(k){
  const box=el('calDay');if(!box)return;
  const h=S.hist[k]||{min:0,pages:0,xp:0};
  const planned=!!S.planned[k];
  const future=k>=today();
  let books='';
  if(h.books){
    const list=Object.keys(h.books).map(id=>{const b=allBooks().find(x=>x.id===id);return '📖 '+(b?esc(b.title):'книга')+' · '+Math.round(h.books[id])+' мин';});
    if(list.length)books='<div style="font-size:12px;color:var(--muted);margin-top:6px">'+list.join('<br>')+'</div>';
  }
  box.innerHTML='<div class="pcard"><b>'+k+(k===today()?' · сегодня':'')+'</b>'+
    '<div style="font-size:13px;color:var(--muted);margin-top:6px">'+
    (((h.min||0)>=1||(h.pages||0)>=1)?'✅ Прочитано '+Math.round(h.min)+' мин · '+(h.pages||0)+' стр · +'+Math.round(h.xp||0)+' XP':'Чтения не было')+'</div>'+
    books+
    (future?'<div style="font-size:13px;margin-top:8px;color:'+(planned?'var(--accent2)':'var(--muted)')+'">'+(planned?'📌 Запланировано · цель '+goalMin()+' мин (нажмите ещё раз, чтобы снять)':'Нажмите на день, чтобы запланировать чтение')+'</div>':'')+
    '</div>';
}
el('calPrev').onclick=()=>{calM--;if(calM<0){calM=11;calY--;}renderCalendar();};
el('calNext').onclick=()=>{calM++;if(calM>11){calM=0;calY++;}renderCalendar();};
function notifTime(){return S.notif.time||'20:00';}
el('calNotifTgl').onclick=async()=>{
  if(!S.notif.on){
    if(!('Notification' in window)){alert('Этот браузер не поддерживает уведомления');return;}
    let perm=Notification.permission;
    if(perm!=='granted')perm=await Notification.requestPermission();
    if(perm!=='granted'){alert('Уведомления запрещены в настройках браузера');return;}
    S.notif.on=true;save();renderCalendar();
    try{new Notification('ReadQuest',{body:'Напоминания включены — позовём читать в '+notifTime()});}catch(e){}
    return;
  }
  S.notif.on=false;save();renderCalendar();
};
function adjNotif(delta){
  const p=notifTime().split(':');const h=+p[0],m=+p[1];
  const t=((h*60+m)+delta+1440)%1440;
  S.notif.time=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
  save();renderCalendar();
}
el('calNotifMinus').onclick=()=>adjNotif(-30);
el('calNotifPlus').onclick=()=>adjNotif(30);
let lastNotifDay=null;
setInterval(()=>{
  if(!S.notif||!S.notif.on||!('Notification' in window)||Notification.permission!=='granted')return;
  const now=new Date();
  const hm=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const tk=today();
  if(hm===notifTime()&&lastNotifDay!==tk){
    lastNotifDay=tk;
    const h=S.hist[tk];
    if(!h||(h.min||0)<1){try{new Notification('ReadQuest 📚',{body:'Время почитать! Не теряй свою серию 🔥'});}catch(e){}}
  }
},30000);

/* ============ КАСТОМНЫЕ КВЕСТЫ И ХАРАКТЕРИСТИКИ ============ */
const QUEST_METRICS={
  minutesToday:{label:'минут за сегодня',unit:'мин',val:()=>Math.round(S.minToday),period:()=>today()},
  minutesTotal:{label:'минут всего',unit:'мин',val:()=>Math.round(S.totalMin),period:()=>'once'},
  pagesTotal:{label:'страниц всего',unit:'стр',val:()=>S.totalPages,period:()=>'once'},
  booksFinished:{label:'книг дочитано',unit:'кн',val:()=>S.finished.length,period:()=>'once'},
  streak:{label:'дней серии подряд',unit:'дн',val:()=>S.streak,period:()=>'once'},
  daysThisMonth:{label:'дней чтения в месяце',unit:'дн',val:()=>monthDays(),period:()=>today().slice(0,7)},
  quotes:{label:'цитат собрано',unit:'шт',val:()=>Object.keys(S.quotes).reduce((a,k)=>a+(S.quotes[k]||[]).length,0),period:()=>'once'}
};
const METRIC_KEYS=Object.keys(QUEST_METRICS);
function customQuestObjs(){
  return (S.customQuests||[]).map(q=>{
    const M=QUEST_METRICS[q.metric]||QUEST_METRICS.minutesTotal;
    return {id:q.id,name:'🎯 '+q.name,reward:q.reward,custom:true,
      period:()=>q.metric+':'+M.period(),
      prog:()=>Math.min(1,M.val()/Math.max(1,q.target)),
      info:()=>M.val()+' / '+q.target+' '+M.unit};
  });
}
function allQuests(){return QUESTS.concat(customQuestObjs());}
function addCustomQuest(){if(isMvp()){flashMsg('Кастомные квесты выключены в MVP');return;}
  const name=prompt('Название квеста (например, «Марафон выходного дня»):');
  if(!name||!name.trim())return;
  let list='Что считать? Введите номер:\n';
  METRIC_KEYS.forEach((k,i)=>{list+=(i+1)+') '+QUEST_METRICS[k].label+'\n';});
  const mi=parseInt(prompt(list,'1'),10);
  if(!mi||mi<1||mi>METRIC_KEYS.length)return;
  const metric=METRIC_KEYS[mi-1];
  const target=parseInt(prompt('Цель (число '+QUEST_METRICS[metric].unit+'):','30'),10);
  if(!target||target<1)return;
  const reward=parseInt(prompt('Награда в '+S.cur.name+' '+curI()+':','100'),10);
  if(!reward||reward<1)return;
  S.customQuests.push({id:'cq'+Date.now(),name:name.trim().slice(0,60),metric:metric,target:target,reward:reward});
  save();renderQuests();
}
function editCustomQuest(id){
  const q=(S.customQuests||[]).find(x=>x.id===id);if(!q)return;
  const name=prompt('Название квеста:',q.name);if(name===null)return;
  if(name.trim())q.name=name.trim().slice(0,60);
  const target=parseInt(prompt('Цель ('+(QUEST_METRICS[q.metric]||{}).unit+'):',q.target),10);
  if(target&&target>0)q.target=target;
  const reward=parseInt(prompt('Награда в '+S.cur.name+':',q.reward),10);
  if(reward&&reward>0)q.reward=reward;
  save();renderQuests();
}
function delCustomQuest(id){
  if(!confirm('Удалить этот квест?'))return;
  S.customQuests=(S.customQuests||[]).filter(x=>x.id!==id);
  save();renderQuests();
}
function addStat(){
  const name=prompt('Название новой характеристики (например, «Эрудиция»):');
  if(!name||!name.trim())return;
  const n=name.trim().replace(/['"<>\\]/g,'').slice(0,24);
  if(!n)return;
  if(allStats().includes(n)){alert('Такая характеристика уже есть');return;}
  S.customStats.push(n);if(S.stats[n]===undefined)S.stats[n]=0;
  save();renderProfile();
}
function renStat(name){
  if(STATS_BASE.includes(name)){alert('Базовые характеристики переименовать нельзя — создайте свою.');return;}
  const nn=prompt('Новое название:',name);if(nn===null||!nn.trim())return;
  const v=nn.trim().replace(/['"<>\\]/g,'').slice(0,24);if(!v)return;
  const i=S.customStats.indexOf(name);if(i<0)return;
  S.customStats[i]=v;S.stats[v]=S.stats[name]||0;delete S.stats[name];
  Object.keys(S.bookStat).forEach(b=>{if(S.bookStat[b]===name)S.bookStat[b]=v;});
  save();renderProfile();
}
function delStat(name){
  if(STATS_BASE.includes(name)){alert('Базовую характеристику удалить нельзя.');return;}
  if(!confirm('Удалить характеристику «'+name+'»? Накопленные очки по ней пропадут.'))return;
  S.customStats=S.customStats.filter(x=>x!==name);delete S.stats[name];
  save();renderProfile();
}

/* ============ НАВЫКИ → ХАРАКТЕРИСТИКИ ============ */
function skillLevel(xp){return Math.floor(Math.sqrt((xp||0)/3))+1;}
function xpForLevel(L){return 3*(L-1)*(L-1);}
function allSkills(){return Object.keys(S.skills||{});}
function ensureSkill(name){if(S.skills[name]===undefined)S.skills[name]=0;if(!S.skillMeta[name])S.skillMeta[name]={links:{}};}
function maxSkillLevel(){return allSkills().reduce((m,k)=>Math.max(m,skillLevel(S.skills[k])),1);}
function maxCharLevel(){return allStats().reduce((m,k)=>Math.max(m,S.stats[k]||0),0);}
function addSkillXp(name,amt){
  amt=Math.round(amt||0);if(amt<=0)return;
  ensureSkill(name);
  const before=skillLevel(S.skills[name]);
  S.skills[name]+=amt;
  const after=skillLevel(S.skills[name]);
  if(after>before){
    let growth=0;for(let lv=before+1;lv<=after;lv++)growth+=lv; // выше уровень — больше прирост
    const links=(S.skillMeta[name]&&S.skillMeta[name].links)||{};
    Object.keys(links).forEach(ch=>{
      if(!allStats().includes(ch))return;
      const inc=Math.ceil(growth*links[ch]/100);
      if(inc>0)S.stats[ch]=(S.stats[ch]||0)+inc;
    });
  }
}
function skillLinksText(name){
  const links=(S.skillMeta[name]&&S.skillMeta[name].links)||{};
  const ks=Object.keys(links);
  return ks.length?ks.map(c=>esc(c)+' '+links[c]+'%').join(', '):'не привязан к характеристикам';
}
function renderSkillBox(){
  el('skillBox').innerHTML=allSkills().map(k=>{
    const pts=S.skills[k]||0;
    const lv2=skillLevel(pts);
    const lo2=xpForLevel(lv2),hi2=xpForLevel(lv2+1);
    return '<div class="statrow"><div class="row"><span>'+esc(k)+'</span><div class="spacer"></div>'+
      '<button style="color:var(--muted);font-size:13px;padding:0 6px" onclick="editSkillLinks(\''+esc(k)+'\')">✏</button>'+
      (DEFAULT_SKILLS.includes(k)?'':'<button class="x" onclick="delSkill(\''+esc(k)+'\')">✕</button>')+
      '<b>ур. '+lv2+'</b></div>'+
      '<div style="font-size:11px;color:var(--muted);margin:2px 0 4px">→ '+skillLinksText(k)+'</div>'+
      '<div class="pbar"><i style="width:'+Math.round((pts-lo2)/(hi2-lo2)*100)+'%"></i></div></div>';
  }).join('')+'<button class="miniadd" onclick="addSkill()">＋ Добавить навык</button>';
}
function addSkill(){
  const name=prompt('Название навыка (например, «Критическое мышление»):');
  if(!name||!name.trim())return;
  const n=name.trim().replace(/['"<>\\]/g,'').slice(0,28);if(!n)return;
  if(allSkills().includes(n)){alert('Такой навык уже есть');return;}
  const init=parseInt(prompt('Начальный уровень (если уже владеете навыком):','1'),10)||1;
  S.skills[n]=xpForLevel(Math.max(1,init));S.skillMeta[n]={links:{}};
  save();editSkillLinks(n,true);
}
function editSkillLinks(name,isNew){
  ensureSkill(name);
  const cur=S.skillMeta[name].links||{};
  const hint='Влияние навыка на характеристики.\nФормат: Характеристика=процент, через запятую.\nДоступные: '+allStats().join(', ')+'\nНапример: Интеллект=100, Воля=30';
  const def=Object.keys(cur).map(c=>c+'='+cur[c]).join(', ');
  const inp=prompt(hint,def);
  if(inp===null){if(isNew){save();renderProfile();}return;}
  const links={};
  inp.split(',').forEach(part=>{
    const m=part.split('=');
    if(m.length===2){
      const ch=m[0].trim();const pct=parseInt(m[1],10);
      if(allStats().includes(ch)&&pct>0)links[ch]=Math.min(100,pct);
    }
  });
  S.skillMeta[name].links=links;save();renderProfile();
}
function delSkill(name){
  if(DEFAULT_SKILLS.includes(name)){alert('Базовый навык удалить нельзя.');return;}
  if(!confirm('Удалить навык «'+name+'»?'))return;
  delete S.skills[name];delete S.skillMeta[name];save();renderProfile();
}

/* ============ ДОСТИЖЕНИЯ + МНОЖИТЕЛЬ XP ============ */
function goldAll(){return Math.round(S.goldAllTime||0);}
function skillsXpAll(){return allSkills().reduce((a,k)=>a+(S.skills[k]||0),0);}
const DEFAULT_ACH=[
 {id:'lvl3',name:'Подмастерье',desc:'Достичь 3 уровня',mult:0.02,ck:()=>level(S.xp)>=3,now:()=>level(S.xp)+'/3'},
 {id:'lvl5',name:'Бывалый',desc:'Достичь 5 уровня',mult:0.03,ck:()=>level(S.xp)>=5,now:()=>level(S.xp)+'/5'},
 {id:'lvl10',name:'Магистр',desc:'Достичь 10 уровня',mult:0.05,ck:()=>level(S.xp)>=10,now:()=>level(S.xp)+'/10'},
 {id:'xp1k',name:'Тысячник',desc:'1000 XP за всё время',mult:0.02,ck:()=>S.xp>=1000,now:()=>S.xp+'/1000'},
 {id:'xp5k',name:'Эрудит',desc:'5000 XP за всё время',mult:0.04,ck:()=>S.xp>=5000,now:()=>S.xp+'/5000'},
 {id:'goldA1k',name:'Запасливый',desc:'1000 валюты заработано всего',mult:0.02,ck:()=>goldAll()>=1000,now:()=>goldAll()+'/1000'},
 {id:'goldA5k',name:'Богач',desc:'5000 валюты заработано всего',mult:0.04,ck:()=>goldAll()>=5000,now:()=>goldAll()+'/5000'},
 {id:'sess10',name:'Постоянство',desc:'10 сессий чтения',mult:0.02,ck:()=>S.sessions>=10,now:()=>S.sessions+'/10'},
 {id:'sess50',name:'Книжный червь',desc:'50 сессий чтения',mult:0.04,ck:()=>S.sessions>=50,now:()=>S.sessions+'/50'},
 {id:'fin1',name:'Первая книга',desc:'Дочитать 1 книгу',mult:0.02,ck:()=>S.finished.length>=1,now:()=>S.finished.length+'/1'},
 {id:'fin5',name:'Книголюб',desc:'Дочитать 5 книг',mult:0.04,ck:()=>S.finished.length>=5,now:()=>S.finished.length+'/5'},
 {id:'sk5',name:'Мастер навыка',desc:'Навык до 5 уровня',mult:0.03,ck:()=>maxSkillLevel()>=5,now:()=>maxSkillLevel()+'/5'},
 {id:'char10',name:'Развитый ум',desc:'Характеристика до 10 уровня',mult:0.05,ck:()=>maxCharLevel()>=10,now:()=>maxCharLevel()+'/10'}
];
function isUnlocked(id){return S.achUnlocked.includes(id);}
function customAchDone(a){return a.conds.length>0&&a.conds.every(c=>condValue(c)>=c.target);}
function condValue(c){
  if(c.type==='skill')return skillLevel(S.skills[c.key]||0);
  if(c.type==='char')return S.stats[c.key]||0;
  const M=QUEST_METRICS[c.key];return M?M.val():0;
}
function condLabel(c){
  if(c.type==='skill')return 'Навык «'+c.key+'» ур. '+c.target;
  if(c.type==='char')return 'Характеристика «'+c.key+'» ур. '+c.target;
  const M=QUEST_METRICS[c.key];return (M?M.label:c.key)+' ≥ '+c.target;
}
function checkAchievements(){
  const nu=[];
  DEFAULT_ACH.forEach(a=>{
    if(!isUnlocked(a.id)&&a.ck()){
      S.achUnlocked.push(a.id);
      S.xpMult=Math.round(((S.xpMult||1)+a.mult)*100)/100;
      nu.push({title:a.name,prize:'множитель XP +'+Math.round(a.mult*100)+'%'});
    }
  });
  (S.customAch||[]).forEach(a=>{
    if(!isUnlocked(a.id)&&customAchDone(a)){
      S.achUnlocked.push(a.id);
      if(a.xp){S.xp+=a.xp;}
      if(a.gold){S.gold+=a.gold;S.goldAllTime=(S.goldAllTime||0)+a.gold;}
      nu.push({title:a.title,prize:[a.xp?'+'+a.xp+' XP':'',a.gold?'+'+a.gold+' '+curI():''].filter(Boolean).join(' · ')||(a.prize||'')});
    }
  });
  return nu;
}
let achTab='all';
function renderAchievements(){
  el('achMult').textContent='×'+(S.xpMult||1).toFixed(2);
  el('achTabAll').classList.toggle('on',achTab==='all');
  el('achTabGot').classList.toggle('on',achTab==='got');
  const def=DEFAULT_ACH.map(a=>{
    const got=isUnlocked(a.id);
    if(achTab==='got'&&!got)return '';
    return '<div class="achitem'+(got?' got':'')+'"'+(got?' onclick="badgeFromId(\''+a.id+'\')"':'')+'><div class="row"><b>'+(got?'🏅 ':'🔒 ')+esc(a.name)+'</b><div class="spacer"></div><span class="chip">+'+Math.round(a.mult*100)+'% XP</span></div>'+
      '<div class="achd">'+esc(a.desc)+(got?'':' · '+a.now())+'</div></div>';
  }).join('');
  const cus=(S.customAch||[]).map(a=>{
    const got=isUnlocked(a.id);
    if(achTab==='got'&&!got)return '';
    const prize=[a.xp?'+'+a.xp+' XP':'',a.gold?'+'+a.gold+' '+curI():''].filter(Boolean).join(' · ');
    const conds=a.conds.map(c=>{const ok=condValue(c)>=c.target;return '<div class="achd">'+(ok?'✅ ':'▫️ ')+esc(condLabel(c))+' ('+condValue(c)+')</div>';}).join('');
    return '<div class="achitem'+(got?' got':'')+'"'+(got?' onclick="badgeFromId(\''+a.id+'\')"':'')+'><div class="row"><b>'+(got?'🏅 ':'🎯 ')+esc(a.title)+'</b><div class="spacer"></div>'+
      (prize?'<span class="chip">'+prize+'</span>':'')+
      '<button style="color:var(--muted);font-size:12px;padding:0 4px" onclick="event.stopPropagation();editCustomAch(\''+a.id+'\')">изм.</button>'+
      '<button class="x" onclick="event.stopPropagation();delCustomAch(\''+a.id+'\')">✕</button></div>'+
      (a.desc?'<div class="achd">'+esc(a.desc)+'</div>':'')+conds+'</div>';
  }).join('');
  el('achBox').innerHTML='<h2 style="margin-top:4px">Системные</h2>'+(def||'<div class="pempty">—</div>')+
    '<h2>Свои</h2>'+(cus||'<div class="pempty">Пока нет своих достижений</div>')+
    '<button class="miniadd" onclick="addCustomAch()">＋ Добавить достижение</button>'+
    '<h2>🎖 Бейджи</h2><div class="badges">'+BADGES.map(function(b){var got=S.badges.includes(b.id);return '<div class="badge'+(got?'':' locked')+'"><div class="bi">'+b.icon+'</div><div class="bn">'+esc(b.name)+'</div><div class="bd">'+esc(b.desc)+'</div></div>';}).join('')+'</div>';
}
function pickCondType(){
  const i=parseInt(prompt('Тип условия:\n1) метрика чтения (минуты, книги, цитаты…)\n2) уровень навыка\n3) уровень характеристики','1'),10);
  return i===2?'skill':i===3?'char':'metric';
}
function buildCond(){
  const t=pickCondType();
  if(t==='skill'){
    const list=allSkills();const s=prompt('Навык:\n'+list.map((k,i)=>(i+1)+') '+k).join('\n'),'1');
    const k=list[(parseInt(s,10)||1)-1];if(!k)return null;
    const tg=parseInt(prompt('Нужный уровень навыка:','5'),10);if(!tg)return null;
    return {type:'skill',key:k,target:tg};
  }
  if(t==='char'){
    const list=allStats();const s=prompt('Характеристика:\n'+list.map((k,i)=>(i+1)+') '+k).join('\n'),'1');
    const k=list[(parseInt(s,10)||1)-1];if(!k)return null;
    const tg=parseInt(prompt('Нужный уровень характеристики:','10'),10);if(!tg)return null;
    return {type:'char',key:k,target:tg};
  }
  const s=prompt('Метрика:\n'+METRIC_KEYS.map((k,i)=>(i+1)+') '+QUEST_METRICS[k].label).join('\n'),'1');
  const k=METRIC_KEYS[(parseInt(s,10)||1)-1];if(!k)return null;
  const tg=parseInt(prompt('Цель ('+QUEST_METRICS[k].unit+'):','5'),10);if(!tg)return null;
  return {type:'metric',key:k,target:tg};
}
function addCustomAch(){
  const title=prompt('Название достижения:');if(!title||!title.trim())return;
  const xp=parseInt(prompt('Приз: сколько XP (0 — без):','0'),10)||0;
  const gold=parseInt(prompt('Приз: сколько '+S.cur.name+' (0 — без):','0'),10)||0;
  const c=buildCond();if(!c){alert('Нужно хотя бы одно условие');return;}
  const conds=[c];
  while(confirm('Добавить ещё одно условие? (все условия должны выполниться)')){
    const c2=buildCond();if(c2)conds.push(c2);else break;
  }
  S.customAch.push({id:'ca'+Date.now(),title:title.trim().slice(0,60),desc:'',xp:xp,gold:gold,conds:conds});
  save();renderAchievements();
}
function editCustomAch(id){
  const a=(S.customAch||[]).find(x=>x.id===id);if(!a)return;
  const title=prompt('Название достижения:',a.title);if(title===null)return;
  if(title.trim())a.title=title.trim().slice(0,60);
  const xp=prompt('Приз XP:',a.xp);if(xp!==null)a.xp=parseInt(xp,10)||0;
  const gold=prompt('Приз '+S.cur.name+':',a.gold);if(gold!==null)a.gold=parseInt(gold,10)||0;
  if(confirm('Пересоздать условия достижения?')){
    const c=buildCond();if(c){const conds=[c];while(confirm('Добавить ещё условие?')){const c2=buildCond();if(c2)conds.push(c2);else break;}a.conds=conds;}
  }
  save();renderAchievements();
}
function delCustomAch(id){
  if(!confirm('Удалить достижение?'))return;
  S.customAch=(S.customAch||[]).filter(x=>x.id!==id);
  const i=S.achUnlocked.indexOf(id);if(i>-1)S.achUnlocked.splice(i,1);
  save();renderAchievements();
}
el('achTabAll').onclick=()=>{achTab='all';renderAchievements();};
el('achTabGot').onclick=()=>{achTab='got';renderAchievements();};

/* ============ 3D-ЗНАЧОК ДОСТИЖЕНИЯ ============ */
let b3d={rotY:0,rotX:-8,auto:true,drag:null,raf:0};
function applyCoin(){const c=el('badgeCoin');if(c)c.style.transform='rotateX('+b3d.rotX+'deg) rotateY('+b3d.rotY+'deg)';}
function openBadge3D(icon,title,sub){
  el('badgeFace').textContent=icon||'🏅';el('badgeBack').textContent='⭐';
  el('badgeTitle').textContent=title||'';el('badgeSub').textContent=sub||'';
  el('badgeModal').classList.remove('hidden');
  b3d.rotY=0;b3d.rotX=-8;b3d.auto=true;b3d.drag=null;
  cancelAnimationFrame(b3d.raf);
  const spin=()=>{if(el('badgeModal').classList.contains('hidden'))return;if(b3d.auto)b3d.rotY+=0.8;applyCoin();b3d.raf=requestAnimationFrame(spin);};
  spin();
}
function closeBadge3D(){b3d.auto=false;cancelAnimationFrame(b3d.raf);el('badgeModal').classList.add('hidden');}
function badgeFromId(id){
  let a=DEFAULT_ACH.find(x=>x.id===id);
  if(a){openBadge3D('🏅',a.name,a.desc);return;}
  a=(S.customAch||[]).find(x=>x.id===id);
  if(a)openBadge3D('🏆',a.title,a.desc||'');
}
el('badgeClose').onclick=closeBadge3D;
el('badgeCoin').addEventListener('pointerdown',e=>{b3d.drag={x:e.clientX,y:e.clientY,ry:b3d.rotY,rx:b3d.rotX};b3d.auto=false;});
window.addEventListener('pointermove',e=>{if(!b3d.drag)return;b3d.rotY=b3d.drag.ry+(e.clientX-b3d.drag.x)*0.6;b3d.rotX=Math.max(-60,Math.min(60,b3d.drag.rx-(e.clientY-b3d.drag.y)*0.6));applyCoin();});
window.addEventListener('pointerup',()=>{b3d.drag=null;});

/* ============ ПРОФИЛЬ: настройка ============ */
function curStatuses(){return (S.statuses&&S.statuses.length)?S.statuses:[[1,'Новичок']];}
function setHeroName(){
  const n=prompt('Имя героя:',S.heroName||'Читатель');
  if(n===null)return;S.heroName=(n.trim()||'Читатель').slice(0,30);save();renderProfile();renderProfSetup();
}
function renderProfSetup(){
  const box=el('profSetupBox');if(!box)return;
  box.innerHTML=
    '<div class="setrow"><div class="lab">Имя героя<div class="sub">'+esc(S.heroName||'Читатель')+'</div></div><button class="ghostbtn" onclick="setHeroName()">Изменить</button></div>'+
    '<div class="setrow"><div class="lab">Аватар<div class="sub">меняется тапом по аватару в профиле</div></div><span style="font-size:26px">'+(S.avatar||'📖')+'</span></div>'+
    '<h2 style="margin-top:14px">Статусы по уровням</h2>'+
    '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">Звание героя меняется при достижении уровня. Если для уровня статуса нет — берётся ближайший снизу.</div>'+
    curStatuses().slice().sort((a,b)=>a[0]-b[0]).map(p=>
      '<div class="editrow"><span class="chip">ур. '+p[0]+'+</span><span class="grow">'+esc(p[1])+'</span>'+
      '<button style="color:var(--muted);font-size:13px;padding:0 6px" onclick="editStatus('+p[0]+')">✏</button>'+
      '<button class="x" onclick="delStatus('+p[0]+')">✕</button></div>'
    ).join('')+
    '<button class="miniadd" onclick="addStatus()">＋ Добавить статус</button>';
}
function addStatus(){
  const lv=parseInt(prompt('С какого уровня действует статус?','2'),10);if(!lv||lv<1)return;
  const nm=prompt('Название статуса:','Искатель');if(!nm||!nm.trim())return;
  S.statuses=curStatuses().filter(p=>p[0]!==lv);S.statuses.push([lv,nm.trim().slice(0,30)]);
  save();renderProfSetup();renderProfile();
}
function editStatus(lv){
  const p=curStatuses().find(x=>x[0]===lv);if(!p)return;
  const nm=prompt('Название статуса (ур. '+lv+'+):',p[1]);if(nm===null||!nm.trim())return;
  p[1]=nm.trim().slice(0,30);S.statuses=curStatuses();save();renderProfSetup();renderProfile();
}
function delStatus(lv){
  const list=curStatuses();if(list.length<=1){alert('Должен остаться хотя бы один статус');return;}
  S.statuses=list.filter(p=>p[0]!==lv);save();renderProfSetup();renderProfile();
}

/* ============ СТАТИСТИКА: счётчики ============ */
function statCountersHtml(){
  const cells=[
    ['📚 '+S.sessions,'сессий выполнено'],
    ['➕ '+(S.userBooks?S.userBooks.length:0),'книг добавлено'],
    ['✅ '+S.finished.length,'книг дочитано'],
    ['🪙 '+goldAll(),'валюты за всё время'],
    ['⭐ '+S.xp,'XP за всё время'],
    ['💪 '+skillsXpAll(),'XP по навыкам'],
    ['🏅 '+S.achUnlocked.length,'достижений'],
    ['✖️ '+(S.xpMult||1).toFixed(2),'множитель XP']
  ];
  return '<div class="kpis" style="grid-template-columns:repeat(2,1fr)">'+
    cells.map(c=>'<div class="kpi"><b style="font-size:17px">'+c[0]+'</b><span>'+c[1]+'</span></div>').join('')+'</div>';
}

/* ============ ВИРИНГ НОВЫХ ЭКРАНОВ ============ */
el('menuAch').onclick=openDrawer;
el('btnProfSetup').onclick=()=>{renderProfSetup();el('profSetup').classList.remove('hidden');};
el('profSetupClose').onclick=()=>el('profSetup').classList.add('hidden');

/* ============ ПИКСЕЛЬНЫЙ РЕЖИМ ============ */
const PIXEL_COST=400;
function ensurePixelFont(){
  if(document.getElementById('pixfont'))return;
  const l=document.createElement('link');l.id='pixfont';l.rel='stylesheet';
  l.href='https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap';
  document.head.appendChild(l);
}
function applyPixel(){
  if(S.pixelOn){ensurePixelFont();document.body.classList.add('pixel');}
  else document.body.classList.remove('pixel');
}
function pixelShopHtml(){
  return '<div class="shopitem"><div class="tprev" style="font-size:22px">🧙</div>'+
    '<div style="flex:1;min-width:0"><b>Пиксельный режим</b><div style="font-size:12px;color:var(--muted)">Игровой пиксельный скин «про волшебников» для всего приложения. Включается в Настройках.</div></div>'+
    (S.pixelOwned
      ?'<button class="buy owned" onclick="show(\'settings\');renderSettings();">'+(S.pixelOn?'Активен':'Куплено')+'</button>'
      :'<button class="buy" '+(canAfford(PIXEL_COST)?'':'disabled')+' onclick="buyPixel()">'+PIXEL_COST+' '+curI()+'</button>')+
    '</div>';
}
function buyPixel(){
  if(S.pixelOwned)return;
  if(!canAfford(PIXEL_COST)){alert('Не хватает '+S.cur.name+' (нужно '+PIXEL_COST+')');return;}
  spend(PIXEL_COST);S.pixelOwned=true;S.pixelOn=true;save();applyPixel();confetti();renderShop();
  alert('🧙 Пиксельный режим куплен и включён! Выключить можно в Настройках.');
}
function togglePixel(){
  if(!S.pixelOwned){if(confirm('Пиксельный режим покупается в Магазине за '+PIXEL_COST+' '+S.cur.name+'. Перейти в Магазин?')){renderShop();show('shop');}return;}
  S.pixelOn=!S.pixelOn;save();applyPixel();renderSettings();
  flashMsg(S.pixelOn?'🧙 Пиксельный режим включён':'Пиксельный режим выключен');
}
el('pixelTgl').onclick=togglePixel;

/* ============ ЯЗЫК / LANGUAGE (RU→EN) ============ */
const I18N={
 'Библиотека':'Library','Цитаты':'Quotes','Магазин':'Shop','Персонаж':'Character','Квесты':'Quests','Дневник':'Journal',
 'Статистика':'Statistics','Календарь':'Calendar','Достижения':'Achievements','Настройки':'Settings',
 'Свайп от левого края или ☰':'Swipe from left edge or ☰','прототип v6':'prototype v6',
 '🧙 Персонаж':'🧙 Character','📝 Цитаты':'📝 Quotes','🛍 Магазин':'🛍 Shop','⚙️ Настройки':'⚙️ Settings',
 '📈 Статистика':'📈 Statistics','📅 Календарь':'📅 Calendar','🏆 Достижения':'🏆 Achievements','🎯 Квесты':'🎯 Quests',
 'Моя полка':'My shelf','＋ Добавить':'＋ Add','🔍 Поиск по названию и автору':'🔍 Search by title and author',
 'Все':'All','📖 Читаю':'📖 Reading','📌 Хочу':'📌 Want','✅ Прочитано':'✅ Read','★ Избранное':'★ Favorites',
 'Ничего не найдено':'Nothing found','Скопировать все':'Copy all',
 '🧙 Персонаж':'🧙 Character',
 'Читатель':'Reader','✏️ Профиль':'✏️ Profile','Тап по аватару — сменить':'Tap avatar to change',
 'Цель дня':'Daily goal','Стрик засчитывается за любую сессию от 1 минуты.':'A streak counts for 2+ minutes of reading a day.','Стрик засчитывается, если за день прочитано от 2 минут.':'A streak counts for 2+ minutes of reading a day.',
 'Характеристики':'Characteristics','Навыки':'Skills','Трофейный зал':'Trophy hall','Бейджи':'Badges',
 'Сбросить весь прогресс':'Reset all progress','＋ Добавить характеристику':'＋ Add characteristic','＋ Добавить навык':'＋ Add skill',
 'минут всего':'minutes total','🔥 стрик':'🔥 streak','🪙 золото':'🪙 gold','золото':'gold',
 'Дочитайте первую книгу — здесь появится трофей 🏆':'Finish your first book — a trophy appears here 🏆',
 'Интеллект':'Intellect','Мудрость':'Wisdom','Харизма':'Charisma','Воображение':'Imagination','Воля':'Willpower',
 'Концентрация':'Concentration','Дисциплина':'Discipline','Аналитика':'Analysis','Скорочтение':'Speed reading','своя':'custom',
 'Выполняйте цели и забирайте награды. Создавайте свои квесты под любые читательские задачи.':'Complete goals and claim rewards. Create your own quests for any reading task.',
 '＋ Добавить свой квест':'＋ Add your quest','✅ получено':'✅ claimed','изм.':'edit','получено':'claimed',
 'Валюта':'Currency','Темы оформления':'Reader themes','Награды из реальной жизни':'Real-life rewards',
 '＋ Добавить свою награду':'＋ Add your reward','Применить':'Apply','Куплено':'Owned','Активен':'Active',
 '🧙 Особый режим':'🧙 Special mode','Пиксельный режим':'Pixel mode','тема читалки':'reader theme','удалить':'delete','отмена':'undo',
 'Как выглядит и называется ваша валюта — решаете вы.':'You decide how your currency looks and is named.',
 'Придумайте награду и назначьте цену. Золото зарабатывается только чтением — заслужите её честно.':'Invent a reward and set its price. Gold is earned only by reading — earn it honestly.',
 'Честное чтение':'Honest reading','Оформление приложения':'App appearance','Удобство':'Convenience',
 'Сложность книг':'Book difficulty','Данные':'Data','О приложении':'About','Язык · Language':'Language · Язык',
 'Мин. время на страницу':'Min. time per page','Макс. время на страницу':'Max. time per page',
 'Анимация перелистывания':'Page-turn animation','Не гасить экран при чтении':'Keep screen on','Вибрация при наградах':'Vibration on rewards',
 'Масштаб интерфейса':'Interface scale','Автоопределение сложности':'Auto difficulty','🧙 Пиксельный режим':'🧙 Pixel mode',
 'Экспорт прогресса':'Export progress','Импорт прогресса':'Import progress','Вернуть удалённые демо-книги':'Restore deleted demo books',
 'Сохранить':'Save','Загрузить':'Load','Вернуть':'Restore','Сброс':'Reset','Вкл':'On','Выкл':'Off','🛍 Купить':'🛍 Buy',
 'Оформление':'Appearance','Шрифт':'Font','Размер':'Size','Текст':'Text','Тема':'Theme','Цвета':'Colors','Навигация':'Navigation',
 'Интервал':'Spacing','Поля':'Margins','Буквы':'Letters','Выравн.':'Align','По ширине':'Justify','Влево':'Left','Переносы':'Hyphens','Отступ':'Indent',
 'Насыщ.':'Weight','Тонкий':'Thin','Обычный':'Normal','Жирный':'Bold','текст':'text','фон':'bg','сброс':'reset',
 'Кнопки ‹ ›':'Buttons ‹ ›','Тап по краям':'Tap edges','Инверсия':'Invert','Листать свайпом':'Swipe to flip',
 '🔤 Шрифт':'🔤 Font','📏 Размер':'📏 Size','📝 Текст':'📝 Text','🎨 Тема':'🎨 Theme','🌈 Цвета':'🌈 Colors','🧭 Навигация':'🧭 Navigation',
 'Главы':'Chapters','Закладки':'Bookmarks','Поиск':'Search','Обзор':'Overview',
 'Откройте книгу':'Open a book','У этой книги нет оглавления':'This book has no table of contents',
 'Полученные':'Unlocked','Системные':'System','Свои':'Custom','＋ Добавить достижение':'＋ Add achievement',
 'Пока нет своих достижений':'No custom achievements yet','Крутите пальцем или мышью 🔄':'Drag to rotate 🔄',
 'Напоминания':'Reminders','Напоминание о чтении':'Reading reminder','Время напоминания':'Reminder time','Чтения не было':'No reading',
 '📊 Прогресс':'📊 Progress','Прогресс':'Progress','Год чтения':'Reading year','⚠️ серия под угрозой':'⚠️ streak at risk',
 '🗄️ Полка':'🗄️ Shelf','Твои книги на полках. Новая книга прилетает на свободное место.':'Your books on shelves. New books fly into a free slot.',
 'Январь':'January','Февраль':'February','Март':'March','Апрель':'April','Май':'May','Июнь':'June',
 'Июль':'July','Август':'August','Сентябрь':'September','Октябрь':'October','Ноябрь':'November','Декабрь':'December',
 'Пн':'Mo','Вт':'Tu','Ср':'We','Чт':'Th','Пт':'Fr','Сб':'Sa','Вс':'Su',
 'Сессия завершена':'Session complete','страниц':'pages','минут':'minutes','характеристика':'characteristic','Продолжить':'Continue','золота':'gold',
 'страниц всего':'pages total','стр/час':'pg/hour','По книгам':'By book',
 'сессий выполнено':'sessions done','книг добавлено':'books added','книг дочитано':'books finished',
 'валюты за всё время':'currency all-time','XP за всё время':'XP all-time','XP по навыкам':'skills XP','достижений':'achievements','множитель XP':'XP multiplier'
};
const I18N_RE=[
 [/Цель дня: (\d+) мин/g,'Daily goal: $1 min'],
 [/Цель (\d+) мин/g,'Goal $1 min'],
 [/Сегодня: (\d+) мин/g,'Today: $1 min'],
 [/⭐ Ур\. (\d+)/g,'⭐ Lv. $1'],
 [/Уровень (\d+)/g,'Level $1'],
 [/ур\. (\d+)/g,'lv. $1'],
 [/🔥 (\d+) (?:дней|дня|день)/g,'🔥 $1 days'],
 [/Забрать \+(\d+)/g,'Claim +$1'],
 [/до уровня (\d+): ещё (\d+) XP/g,'to level $1: $2 XP more'],
 [/качает /g,'trains '],
 [/(\d+) мин\b/g,'$1 min'],
 [/(\d+) стр\b/g,'$1 pg'],
 [/Осталось (\d+)/g,'Left $1'],
 [/осталось /g,'left '],
 [/Прочитано (\d+)/g,'Read $1'],
 [/(\d+) (?:дней|дня|день) подряд/g,'$1 days in a row'],
 [/За (\d+) дн/g,'In $1 d']
];
function tStr(s){
  const k=s.trim();
  if(k&&I18N[k])return s.replace(k,I18N[k]);
  let out=s;
  for(let i=0;i<I18N_RE.length;i++)out=out.replace(I18N_RE[i][0],I18N_RE[i][1]);
  return out;
}
function inSkipZone(node){
  for(let a=node.parentNode;a;a=a.parentNode){
    if(a.id==='content'||a.id==='pdfText')return true;
    if(a.classList&&(a.classList.contains('qtext')||a.classList.contains('btitle')||a.classList.contains('bauthor')||a.classList.contains('stk')||a.classList.contains('rtitle')))return true;
  }
  return false;
}
let _i18nBusy=false,_i18nT=null;
function translateDOM(){
  if(S.lang!=='en')return;
  _i18nBusy=true;
  try{
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null);
    const arr=[];let n;while(n=w.nextNode())arr.push(n);
    arr.forEach(node=>{
      if(!node.nodeValue||!node.nodeValue.trim())return;
      if(inSkipZone(node))return;
      const tr=tStr(node.nodeValue);
      if(tr!==node.nodeValue)node.nodeValue=tr;
    });
    document.querySelectorAll('input[placeholder]').forEach(e=>{
      const v=e.getAttribute('placeholder');if(!v)return;const tr=tStr(v);if(tr!==v)e.setAttribute('placeholder',tr);
    });
  }catch(e){}
  _i18nBusy=false;
}
function startLang(){
  if(S.lang!=='en')return;
  translateDOM();
  if(window.MutationObserver){
    const obs=new MutationObserver(()=>{if(_i18nBusy)return;clearTimeout(_i18nT);_i18nT=setTimeout(translateDOM,60);});
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
}
function setLang(l){if(S.lang===l)return;S.lang=l;save();location.reload();}

/* ============ 3D-ПОЛКА ============ */
let shelfJustAdded=null;
function syncShelf(){
  S.shelfOrder=S.shelfOrder||[];
  const ids=(S.finished||[]).filter(id=>allBooks().some(b=>b.id===id)); // полка трофеев = прочитанные книги
  S.shelfOrder=S.shelfOrder.filter(id=>ids.indexOf(id)>=0);
  ids.forEach(id=>{if(S.shelfOrder.indexOf(id)<0)S.shelfOrder.push(id);});
}
function renderShelf(){
  syncShelf();
  const order=S.shelfOrder.slice();
  const per=6;
  const shelves=Math.max(3,Math.ceil(order.length/per));
  let html='';
  for(let s=0;s<shelves;s++){
    html+='<div class="shelfRow">';
    for(let slot=0;slot<per;slot++){
      const id=order[s*per+slot];
      const b=id?allBooks().find(x=>x.id===id):null;
      if(b){
        const fly=(id===shelfJustAdded)?' flyin':'';
        html+='<button class="shelfbook'+fly+'" title="'+esc(b.title)+'" onclick="shelfOpen(this,\''+id+'\')" oncontextmenu="event.preventDefault();bookInfo(\''+id+'\');return false;">'+coverHtml(b)+'</button>';
      }
    }
    html+='<div class="plank"></div></div>';
  }
  if(!order.length)html='<div class="shelfEmpty">🏆 Трофейная полка пуста.<br>Дочитайте книгу до конца — она встанет сюда как трофей.</div><div class="shelfRow"><div class="plank"></div></div><div class="shelfRow"><div class="plank"></div></div><div class="shelfRow"><div class="plank"></div></div>';
  el('shelfArea').innerHTML=html;
  shelfJustAdded=null;
}
function shelfOpen(elm,id){
  try{if(elm&&elm.classList){elm.classList.remove('flyin');elm.classList.add('opening');}}catch(e){}
  setTimeout(function(){openBook(id);},340);
}

