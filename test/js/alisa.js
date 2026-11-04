'use strict';
/* 04.11 «Страна чудес» v2 (Джессика: «надо как-то сильнее его уникализировать» → «давай реализуем»): живые мелочи скина alisa.
   Only while html[data-skin=alisa]; nothing is stored (no S, no SET, no localStorage); never on the book page; no motion with
   prefers-reduced-motion (then: no fall, no rabbit, the cat just appears). Art = CSS variables from tools/gen-al-decor.py.
   1 падение в нору при открытии книги · 2 Чеширский кот после тишины в библиотеке (ночью только улыбка) · 3 Белый Кролик,
   когда цель дня выполнена (раз в день за запуск) · 9 мышиный хвост: подсказка пустого списка цитат свёрнута хвостом */
function alOn(){return document.documentElement.dataset.skin==='alisa';}
function alCalm(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
function alNight(){return document.documentElement.dataset.theme==='night';}
function alLayer(id){let d=document.getElementById(id);if(!d){d=document.createElement('div');d.id=id;d.setAttribute('aria-hidden','true');document.body.appendChild(d);}return d;}

/* 1. falling down the rabbit hole: the wall of shelves slides up past the screen while the book opens */
function alFall(){
  if(!alOn()||alCalm())return;
  const d=alLayer('alFall');d.classList.remove('on');void d.offsetWidth;d.classList.add('on');
  clearTimeout(alFall._t);alFall._t=setTimeout(function(){d.classList.remove('on');},1100);
}
/* 2. the Cheshire Cat: after 7 s without a touch on the library the grin shows in the corner, then the head (night: the grin only) */
const AL_CAT_MS=7000;let alCatT=null;
function alCatHide(){clearTimeout(alCatT);alCatT=null;const c=document.getElementById('alCat');if(c)c.classList.remove('on');}
function alCatArm(){
  alCatHide();
  if(!alOn())return;const lib=document.getElementById('library');if(!lib||lib.classList.contains('hidden'))return;
  alCatT=setTimeout(function(){const l=document.getElementById('library');if(!alOn()||!l||l.classList.contains('hidden')||document.hidden)return;
    alLayer('alCat').classList.add('on');},AL_CAT_MS);
}
['pointerdown','keydown','wheel'].forEach(function(t){addEventListener(t,function(){if(alOn())alCatArm();},{passive:true,capture:true});});
document.addEventListener('scroll',function(){if(alOn()&&document.getElementById('alCat')&&document.getElementById('alCat').classList.contains('on'))alCatArm();},{passive:true,capture:true});
/* 3. the White Rabbit runs across the bottom once a day (per app run) when today's goal is met — library or profile, never the reader */
let alRabbitDay='';
function alGoalMet(){try{const m=typeof isMvp==='function'&&isMvp()?minTodaySess():S.minToday,g=typeof goalMin==='function'?goalMin():S.goal;return g>0&&m>=g;}catch(e){return false;}}
function alRabbit(force){
  if(!alOn()||alCalm())return false;const day=new Date().toDateString();
  if(!force&&(alRabbitDay===day||!alGoalMet()))return false;
  alRabbitDay=day;const r=alLayer('alRabbit');r.classList.remove('on');void r.offsetWidth;r.classList.add('on');
  clearTimeout(alRabbit._t);alRabbit._t=setTimeout(function(){r.classList.remove('on');},3200);return true;
}
/* 9. «Mouse's Tale»: the empty-quotes hint, its words running down a curling tail and getting smaller */
function alTail(){
  const box=document.getElementById('quoteBox');if(!box)return;
  const h=box.querySelector('.emptyhint:not(.al-tailed)');
  if(!h||!alOn()||/Ничего не нашлось/.test(h.textContent))return;
  const words=h.textContent.replace(/\s+/g,' ').trim().split(' ');
  const path='M24 16C150 10 200 40 170 70S40 90 60 128S190 140 180 176S80 200 110 222';
  let sz=17,t='';words.forEach(function(w,i){t+='<tspan font-size="'+Math.max(7,Math.round(sz))+'">'+esc(w)+' </tspan>';sz-=0.65;});
  h.classList.add('al-tailed');
  const svg='<svg class="al-tail" viewBox="0 0 220 236" aria-hidden="true" focusable="false"><defs><path id="alTailP" d="'+path+'"/></defs>'+
    '<text><textPath href="#alTailP">'+t+'</textPath></text></svg>';
  h.insertAdjacentHTML('beforeend',svg);
}
function alTailWatch(){const box=document.getElementById('quoteBox');if(!box||alTailWatch._o)return;
  alTailWatch._o=new MutationObserver(function(){if(alOn())alTail();});alTailWatch._o.observe(box,{childList:true});}

/* hooks: wrap the global show() / openBook() (classic-script globals, called by name everywhere) */
(function(){
  if(typeof show==='function'){const s0=show;show=function(id){const r=s0.apply(this,arguments);
    try{if(id==='library')alCatArm();else alCatHide();if(id==='library'||id==='profile')setTimeout(function(){alRabbit(false);},500);if(id==='quotes'||id==='stats')alTail();}catch(e){}return r;};}
  if(typeof openBook==='function'){const o0=openBook;openBook=function(){try{alCatHide();alFall();}catch(e){}return o0.apply(this,arguments);};}
  alTailWatch();
})();
