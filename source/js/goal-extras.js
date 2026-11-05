'use strict';
/* ===== «Цель и напоминание»: то, что работает в браузере (29.10, Джессика: «добавим то, что можем добавить», остальное — в приложении).
   Неделя (7 дней и «N из 4 дней» до недельной награды), цель на год (S.yearGoal), «дочитать к дате» (S.bookGoals, минут в день по своей
   скорости SET.rx.spd), файл для календаря телефона (.ics). arch.md 29.10. Coins only as before (weekly +120 is paid by the economy, not here). */
const GX_DAYS=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],GX_BYDAY=['MO','TU','WE','TH','FR','SA','SU'];
function gxAdd(d,n){const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');}
function gxDaysTo(d){return Math.round((new Date(d+'T12:00:00')-new Date(today()+'T12:00:00'))/864e5);}
function gxDate(d){try{return new Date(d+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'});}catch(e){return d;}}

/* ---------- Неделя ---------- */
function gxWeekRender(){
  const box=el('gxWeek');if(!box)return;
  const mon=weekKey(today()),need=goalMin(),t=today();let h='<div class="gxweek" role="list">';
  for(let i=0;i<7;i++){const d=gxAdd(mon,i),m=Math.floor(dayMin(d)),st=m>=need?'ok':d>t?'fut':m>0?'part':d===t?'now':'miss';
    const lab=GX_DAYS[i]+', '+(st==='fut'?'ещё впереди':m+' мин'+(st==='ok'?', цель есть':''));
    h+='<div class="gxday '+st+(d===t?' today':'')+'" role="listitem" aria-label="'+lab+'"><b>'+GX_DAYS[i]+'</b><i aria-hidden="true">'+(st==='ok'?rqIcon('check',16):'')+'</i><small>'+(st==='fut'?'':m)+'</small></div>';}
  const w=daysInWeekAtGoal(need),n=Math.min(7,w.count);let s;
  if(isMvp()){s=weeklyPaid()?'Недельная награда получена: +120 монет':n>=4?'Четыре дня с целью: +120 монет придут с ближайшим чтением':'Ещё '+(4-n)+' '+plural(4-n,'день','дня','дней')+' с целью '+need+' мин — и +120 монет за неделю';}
  else s='Дней с целью на этой неделе: '+n+' из 7';
  box.innerHTML=h+'</div><div class="gxwsub" id="gxWeekSub">'+esc(s)+'</div>';
}

/* ---------- Цель на год ---------- */
function gxYear(){return new Date().getFullYear();}
function gxYearDone(y){const fd=S.finishDates||{},fin=S.finished||[];return fin.filter(function(id){return String(fd[id]||'').slice(0,4)===String(y);}).length;}
function gxYearSet(n){S.yearGoal=n?{y:gxYear(),n:Math.max(1,Math.min(365,n))}:null;save();gxRender();}
function gxYearHtml(){
  const y=gxYear(),g=S.yearGoal&&S.yearGoal.y===y?S.yearGoal:null;
  if(!g)return '<div class="setrow" id="gxYearRow">'+rqIcon('calendar',22)+'<div class="lab">Цель на год<div class="sub">Сколько книг прочитать в '+y+' году</div></div><button class="ghostbtn" id="gxYearOn">Поставить</button></div>';
  const done=gxYearDone(y),start=new Date(y,0,1),end=new Date(y+1,0,1),f=(Date.now()-start)/(end-start),plan=Math.floor(g.n*f+1e-9),left=Math.max(0,g.n-done);
  const pace=done>=g.n?'Цель выполнена':done>=plan?'Идёте по графику':'Отстаёте от графика на '+(plan-done)+' '+plural(plan-done,'книгу','книги','книг');
  const mo=12-new Date().getMonth(),pm=left?' · '+(Math.ceil(left/mo*10)/10).toString().replace('.',',')+' в месяц':'';
  return '<div class="setrow setstack" id="gxYearRow">'+rqIcon('calendar',22)+'<div class="lab">Цель на '+y+' год<div class="sub" id="gxYearSub">Прочитано '+done+' из '+g.n+' · '+pace+pm+'</div></div>'+
    '<span class="stepgrp"><button class="stepbtn" id="gxYearMinus" aria-label="На книгу меньше">−</button><b class="gxv" id="gxYearN">'+g.n+'</b><button class="stepbtn" id="gxYearPlus" aria-label="На книгу больше">+</button></span>'+
    '<div class="gxbar rxfull" aria-hidden="true"><i style="width:'+Math.min(100,Math.round(done/g.n*100))+'%"></i><u style="left:'+Math.min(100,Math.round(f*100))+'%"></u></div>'+
    '<button class="ghostbtn gxoff" id="gxYearOff">Убрать цель</button></div>';
}

/* ---------- Дочитать к дате ---------- */
const GX_LEFT={}; /* book id → minutes left, filled when the text is read from the phone */
function gxLeftMin(b){
  if(b.type==='pdf'||b.text)return rxBookLeft(b,rqPos(b.id));
  if(GX_LEFT[b.id]==null&&typeof __rq!=='undefined'&&__rq&&__rq.idb){GX_LEFT[b.id]=-1;__rq.idb.getText(b.id).then(function(t){if(typeof t==='string'&&!b.text){b.text=t;gxRender();}}).catch(function(){});}
  return null;
}
function gxGoalText(b,d){
  const n=gxDaysTo(d);if(S.finished.includes(b.id))return 'Дочитана';
  if(n<0)return 'Срок прошёл '+gxDate(d);
  const m=gxLeftMin(b),per=m==null?null:Math.max(1,Math.ceil(m/(n+1)));
  return 'К '+gxDate(d)+(per==null?'':' · ≈ '+per+' мин в день');
}
function gxBookGoalSet(id,d){S.bookGoals=Object.assign({},S.bookGoals);if(d)S.bookGoals[id]=d;else delete S.bookGoals[id];save();gxRender();}
function gxPickDate(cur,cb){
  const i=document.createElement('input');i.type='date';i.min=today();i.value=cur||gxAdd(today(),14);i.className='gxpick';i.setAttribute('aria-label','Дочитать к дате');
  document.body.appendChild(i);const done=function(){setTimeout(function(){i.remove();},0);};
  i.onchange=function(){if(/^\d{4}-\d\d-\d\d$/.test(i.value)&&i.value>=today())cb(i.value);done();};i.onblur=done;
  try{if(i.showPicker)i.showPicker();else{i.focus();i.click();}}catch(e){i.focus();i.click();}
}
function gxBooksHtml(){
  const gs=S.bookGoals||{},bs=allBooks(),rows=Object.keys(gs).map(function(id){return {b:bs.find(function(x){return x.id===id;}),d:gs[id]};}).filter(function(x){return x.b;})
    .sort(function(a,b){return a.d<b.d?-1:1;});
  let h=rows.map(function(x){return '<div class="setrow gxbk" data-id="'+esc(x.b.id)+'">'+rqIcon('book-marked',22)+'<div class="lab">'+esc(x.b.title)+'<div class="sub">'+esc(gxGoalText(x.b,x.d))+'</div></div>'+
    '<button class="ghostbtn" data-a="date">Срок</button><button class="ghostbtn" data-a="off" aria-label="Убрать цель">'+rqIcon('trash-2',18)+'</button></div>';}).join('');
  const lr=navReadBook(),can=lr&&!gs[lr];
  h+='<div class="setrow" id="gxBookAdd">'+rqIcon('target',22)+'<div class="lab">Дочитать книгу к дате<div class="sub">'+(can?'Например, «'+esc((bs.find(function(x){return x.id===lr;})||{}).title||'')+'». Другую книгу — из её карточки в библиотеке':'Поставить можно в карточке книги в библиотеке')+'</div></div>'+(can?'<button class="ghostbtn" id="gxBookNew">Поставить</button>':'')+'</div>';
  return h;
}

/* ---------- section ---------- */
function gxRender(){
  gxWeekRender();
  const big=el('gxBig');if(!big)return;
  big.innerHTML=gxYearHtml()+gxBooksHtml();
  const on=function(id,fn){const b=el(id);if(b)b.onclick=fn;};
  on('gxYearOn',function(){gxYearSet(12);});on('gxYearOff',function(){gxYearSet(0);});
  on('gxYearMinus',function(){gxYearSet(S.yearGoal.n-1);});on('gxYearPlus',function(){gxYearSet(S.yearGoal.n+1);});
  on('gxBookNew',function(){const id=navReadBook();if(id)gxPickDate(null,function(d){gxBookGoalSet(id,d);flashMsg('Цель поставлена');});});
  big.querySelectorAll('.gxbk').forEach(function(r){const id=r.dataset.id;
    r.querySelector('[data-a="date"]').onclick=function(){gxPickDate(S.bookGoals[id],function(d){gxBookGoalSet(id,d);});};
    r.querySelector('[data-a="off"]').onclick=function(){gxBookGoalSet(id,null);};});
}
{const g0=gsRenderGoal;gsRenderGoal=function(){g0.apply(this,arguments);gxRender();};}

/* ---------- book card: «Дочитать к …» ---------- */
{const b0=bookInfo;bookInfo=function(id){
  const r=b0.apply(this,arguments);const b=allBooks().find(function(x){return x.id===id;}),box=document.querySelector('#bookSheetBody .bk-dy');
  if(!b||!box||S.finished.includes(id))return r;
  const d=(S.bookGoals||{})[id],t=d?gxGoalText(b,d):'Дочитать к дате';
  box.insertAdjacentHTML('beforeend','<button type="button" class="bk-line" id="gxBkGoal">'+rqIcon('target',20)+'<span>'+esc(t)+'</span></button>');
  el('gxBkGoal').onclick=function(){gxPickDate(d,function(v){gxBookGoalSet(id,v);bookInfo(id);flashMsg('Цель: дочитать к '+gxDate(v));});};
  return r;};}

/* ---------- календарь телефона ---------- */
function gxIcs(){
  const n=S.notif||{},tm=/^\d\d:\d\d$/.test(n.time)?n.time:'20:00',days=Array.isArray(n.days)&&n.days.length===7?n.days:[1,1,1,1,1,1,1];
  const by=GX_BYDAY.filter(function(x,i){return days[i]!==false;});const now=new Date(),p=function(v){return String(v).padStart(2,'0');};
  const stamp=now.getUTCFullYear()+p(now.getUTCMonth()+1)+p(now.getUTCDate())+'T'+p(now.getUTCHours())+p(now.getUTCMinutes())+p(now.getUTCSeconds())+'Z';
  const st=today().replace(/-/g,'')+'T'+tm.replace(':','')+'00',url=location.origin+location.pathname;
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ReadQuest//RU','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:readquest-chtenie-'+(window.RQ_NS||'rq')+'@readquest',
    'DTSTAMP:'+stamp,'DTSTART:'+st,'DURATION:PT'+goalMin()+'M','RRULE:FREQ=WEEKLY;BYDAY='+(by.length?by:GX_BYDAY).join(','),
    'SUMMARY:Почитать '+goalMin()+' минут','DESCRIPTION:Цель дня в ReadQuest. '+url,'URL:'+url,
    'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Время почитать','TRIGGER:PT0M','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n')+'\r\n';
}
el('gxCal').onclick=function(){
  try{const u=URL.createObjectURL(new Blob([gxIcs()],{type:'text/calendar'})),a=document.createElement('a');a.href=u;a.download='readquest-chtenie.ics';document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(u);},4000);
    flashMsg('Файл сохранён. Откройте его — телефон предложит добавить в календарь',{ms:5000});}catch(e){flashMsg('Не получилось сохранить файл');}
};
