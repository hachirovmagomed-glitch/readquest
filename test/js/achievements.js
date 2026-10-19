'use strict';
/* ================= ДОСТИЖЕНИЯ v2: запись, экран, итог сессии (каталог и подсчёт — js/ach-core.js) =================
   Контракт: handoff/notes/arch.md «Достижения v2». Поля game: achDates {id: 'YYYY-MM-DD'} (только дописывается), achSeed
   {d, n} (первый проход по истории, тихо), achTitle / achFrame (выбор). Монет и множителя XP нет. Пишем одним save() через шлюз
   и только когда что-то добавилось: на загрузке и в конце сессии. Экран, вкладки, прокрутка — ноль записей.
   Флаг: только перечисленные пространства имён (сейчас тест `rqt`); корень и этап 5 — по отдельному слову. */
const RQ_ACH_V2_NS=['rqt'];
function achV2(){return RQ_ACH_V2_NS.indexOf(window.RQ_NS)>=0;}
function achDates(){return (S.achDates&&typeof S.achDates==='object'&&!Array.isArray(S.achDates))?S.achDates:{};}
function achInput(){
  const own={};(S.userBooks||[]).forEach(function(b){if(b)own[b.id]=1;});
  const books=BOOKS.concat(S.userBooks||[]).filter(Boolean).map(function(b){return {id:b.id,title:b.title,author:b.author,type:b.type,genre:b.genre,fname:b.fname,pages:b.pages,src:b.srcId?String(b.srcId).split(':')[0]:'',textLen:typeof b.text==='string'?b.text.length:0,own:!!own[b.id]};});
  return {sessions:(typeof SESS!=='undefined'&&SESS)||[],finished:S.finished||[],finishDates:S.finishDates||{},books:books,xp:S.xp,streak:S.streak,quotes:S.quotes||{},goal:10,streakMin:typeof STREAK_MIN!=='undefined'?STREAK_MIN:2};
}
/** открыто: записано в achDates, либо открыто старой версией (achUnlocked / бейдж с тем же или сопоставленным id) — никогда не отнимается */
function achLegacy(id){return (S.achUnlocked||[]).indexOf(id)>=0||(S.badges||[]).some(function(b){return RQAch.alias(b)===id;});}
function achEarned(id){return !!achDates()[id]||achLegacy(id);}
function achList(){return RQAch.CAT.filter(function(a){return !a.legacy||achEarned(a.id);});}
function achScore(){let p=0,n=0;achList().forEach(function(a){if(achEarned(a.id)){n++;p+=RQAch.points(a.tier);}});return {points:p,n:n,total:RQAch.CAT.filter(function(a){return !a.legacy;}).length};}
function achSecretsAll(){return RQAch.CAT.filter(function(a){return a.tier==='secret';}).every(function(a){return achEarned(a.id);});}
function achFrameOpen(f){return f.secrets?achSecretsAll():achScore().points>=f.points;}

/** Записать всё выполненное. Первый проход (achSeed пуст) — тихо, с итогом «За прошлое чтение открыто N».
    Возвращает новые достижения для итога сессии (уже открытые старой версией не объявляются). */
function achRun(){
  if(!achV2()||typeof RQAch==='undefined')return [];
  if(window.__rqWriter&&!__rqWriter.mayWrite())return []; /* passive window: never write */
  const ev=RQAch.evaluate(achInput()),day=today();
  if(!S.achDates||typeof S.achDates!=='object'||Array.isArray(S.achDates))S.achDates={};
  const fresh=[];
  RQAch.CAT.forEach(function(a){if(a.legacy||!ev[a.id]||!ev[a.id].done||S.achDates[a.id])return;const old=achLegacy(a.id);S.achDates[a.id]=day;fresh.push({a:a,old:old});});
  const seed=!S.achSeed;
  if(seed)S.achSeed={d:day,n:fresh.length};
  if(seed||fresh.length)save();
  if(seed)return [];
  return fresh.filter(function(x){return !x.old;}).map(function(x){return {id:x.a.id,name:x.a.name};});
}

/* ---- профиль: карточка, звание, рамка ---- */
function achProfile(){
  const card=el('achCard'),tl=el('pAchTitle'),af=el('avatarFrame');
  if(af)RQAch.FRAMES.forEach(function(f){af.classList.remove('achf-'+f.id);});
  if(!achV2()){if(card)card.classList.add('hidden');if(tl)tl.hidden=true;return;}
  const sc=achScore();
  if(card){card.classList.remove('hidden');
    el('achCardNum').textContent=sc.n+' из '+sc.total;
    el('achCardPts').textContent=sc.points+' '+plural(sc.points,'очко','очка','очков');}
  const t=achTitleOf(S.achTitle);
  if(tl){tl.textContent=t?t.title:'';tl.hidden=!t;}
  const f=RQAch.FRAMES.find(function(x){return x.id===S.achFrame;});
  if(af&&f&&achFrameOpen(f))af.classList.add('achf-'+f.id);
}
function achTitleOf(id){const a=id&&RQAch.CAT.find(function(x){return x.id===id&&x.title;});return a&&achEarned(a.id)?a:null;}
/** '' = без звания. Закрытое звание → false, ничего не пишется. */
function achSetTitle(id){
  if(id&&!achTitleOf(id))return false;
  if((S.achTitle||'')===(id||''))return true;
  S.achTitle=id||'';save();achProfile();if(achPageOpen())renderAchPage();return true;
}
function achSetFrame(id){
  const f=id&&RQAch.FRAMES.find(function(x){return x.id===id;});
  if(id&&(!f||!achFrameOpen(f)))return false;
  if((S.achFrame||'')===(id||''))return true;
  S.achFrame=id||'';save();achProfile();if(achPageOpen())renderAchPage();return true;
}

/* ---- экран «Достижения»: поверх профиля; ← / системный «назад» закрывают; раздел живёт только в памяти ---- */
let achSec='hours';
function achPageOpen(){const p=el('achPage');return !!(p&&!p.hidden);}
function openAchPage(){if(!achV2())return;const p=el('achPage');if(!p)return;renderAchPage();p.hidden=false;const b=el('achBody');if(b)b.scrollTop=0;navPush('ach');}
function closeAchPage(){const p=el('achPage');if(p)p.hidden=true;}
function achBack(){const was=achPageOpen();closeAchPage();if(was&&navState()==='ach')try{history.back();}catch(e){}}
window.addEventListener('popstate',function(e){const st=(e.state&&e.state.rq)||null;if(achPageOpen()&&st!=='ach')closeAchPage();});
function achDateText(d){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d||'');return m?(+m[3])+'.'+m[2]+'.'+m[1]:'';}
function achTierIcon(a,got){if(!got)return a.tier==='secret'?'lock':'circle';return a.tier==='gold'||a.tier==='legend'?'trophy':a.tier==='secret'?'sparkles':'medal';}
function renderAchPage(){
  const body=el('achBody');if(!body)return;
  const sc=achScore(),D=achDates(),ev=RQAch.evaluate(achInput()),seed=S.achSeed&&typeof S.achSeed==='object'?S.achSeed:null;
  const secs=RQAch.SECTIONS.slice();
  if(RQAch.CAT.some(function(a){return a.legacy&&achEarned(a.id);}))secs.push({id:'legacy',name:'Из прошлой версии',icon:'archive'});
  if(!secs.some(function(s){return s.id===achSec;}))achSec='hours';
  let h='<div class="achv-top pcard"><div class="achv-score"><b>'+sc.n+' из '+sc.total+'</b><span>'+sc.points+' '+plural(sc.points,'очко','очка','очков')+' коллекции</span></div>'+
    (seed&&seed.n>0?'<div class="achv-note">За прошлое чтение открыто '+seed.n+'</div>':'')+'</div>';
  const titles=RQAch.CAT.filter(function(a){return a.title&&achEarned(a.id);});
  h+='<div class="achv-lbl">Звание</div><div class="achv-chips">'+
    '<button type="button" class="achv-chip'+(achTitleOf(S.achTitle)?'':' on')+'" onclick="achSetTitle(\'\')">Без звания</button>'+
    titles.map(function(a){return '<button type="button" class="achv-chip'+(S.achTitle===a.id?' on':'')+'" onclick="achSetTitle(\''+a.id+'\')">'+esc(a.title)+'</button>';}).join('')+'</div>';
  if(!titles.length)h+='<div class="achv-hint">Звания открываются за верхние ступени разделов</div>';
  h+='<div class="achv-lbl">Рамка профиля</div><div class="achv-chips">'+
    '<button type="button" class="achv-chip'+(RQAch.FRAMES.some(function(f){return f.id===S.achFrame&&achFrameOpen(f);})?'':' on')+'" onclick="achSetFrame(\'\')">Без рамки</button>'+
    RQAch.FRAMES.filter(achFrameOpen).map(function(f){return '<button type="button" class="achv-chip'+(S.achFrame===f.id?' on':'')+'" onclick="achSetFrame(\''+f.id+'\')">'+esc(f.name)+'</button>';}).join('')+'</div>';
  /* закрытые рамки — одной строкой: ближайшая по очкам и «Тайная» */
  {const pts=sc.points,next=RQAch.FRAMES.find(function(f){return !f.secrets&&f.points>pts;}),sec=RQAch.FRAMES.find(function(f){return f.secrets&&!achFrameOpen(f);}),L=[];
    if(next)L.push('«'+next.name+'» за '+next.points+' '+plural(next.points,'очко','очка','очков'));if(sec)L.push('«'+sec.name+'» за все секретные');
    if(L.length)h+='<div class="achv-hint">'+rqIcon('lock',12)+' Следующая рамка: '+esc(L.join(', '))+'</div>';}
  h+='<div class="achv-chips achv-secs" role="tablist">'+secs.map(function(s){const all=RQAch.CAT.filter(function(a){return a.sec===s.id&&(!a.legacy||achEarned(a.id));}),got=all.filter(function(a){return achEarned(a.id);}).length;
    return '<button type="button" role="tab" data-sec="'+s.id+'" aria-selected="'+(s.id===achSec)+'" class="achv-chip'+(s.id===achSec?' on':'')+'" onclick="achSec=\''+s.id+'\';renderAchPage()">'+rqIcon(s.icon,14)+' '+esc(s.name)+' <small>'+got+'/'+all.length+'</small></button>';}).join('')+'</div>';
  const list=RQAch.CAT.filter(function(a){return a.sec===achSec&&(!a.legacy||achEarned(a.id));});
  h+='<div class="achv-list">'+list.map(function(a){
    const got=achEarned(a.id),hid=a.tier==='secret'&&!got,e=ev[a.id]||{cur:0,target:1};
    const prog=!got&&!hid&&e.target>1?'<div class="pbar"><i style="width:'+Math.round(Math.min(1,e.cur/e.target)*100)+'%"></i></div><div class="achv-sub">'+e.cur+' / '+e.target+'</div>':'';
    const when=got?(D[a.id]?'Получено '+achDateText(D[a.id]):'Получено раньше'):'';
    return '<div class="achv-tile'+(got?' got':'')+'"><span class="achv-ic">'+rqIcon(achTierIcon(a,got),22)+'</span><div class="achv-txt">'+
      '<div class="achv-name">'+(hid?'???':esc(a.name))+'</div>'+
      '<div class="achv-desc">'+esc(hid?a.hint:a.desc)+'</div>'+prog+
      '<div class="achv-sub">'+esc(RQAch.TIERS[a.tier]||'')+(RQAch.points(a.tier)?' · '+RQAch.points(a.tier)+' '+plural(RQAch.points(a.tier),'очко','очка','очков'):'')+(a.title&&!hid?' · звание «'+esc(a.title)+'»':'')+(when?' · '+when:'')+'</div>'+
      '</div></div>';}).join('')+'</div>';
  body.innerHTML=h;
}
