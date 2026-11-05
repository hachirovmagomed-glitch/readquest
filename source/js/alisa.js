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
/* 2. the Cheshire Cat (05.11, Джессика: «просто картинка, которая появляется и исчезает… пресно»): the whole cat on a branch, in parts.
   After 7 s of quiet in the library: the grin comes first, then the eyes, the head, the body and the tail, piece by piece to its tip;
   while it sits it blinks, swings its tail and the grin sways. A touch: «it vanished quite slowly, beginning with the end of the tail,
   and ending with the grin, which remained some time after the rest of it had gone». Night: the grin alone. Parts = .p with --on/--off delays. */
/* 05.11 Джессика: «можешь вообще убрать кота пока что» — off until she asks; the cat stays drawn, true brings it back */
const AL_CAT_ON=false;
const AL_CAT_MS=7000,AL_CAT_OFF_MS=4400;let alCatT=null,alCatOffT=null;
const AL_CAT_SVG='<svg viewBox="0 0 160 150" aria-hidden="true" focusable="false">'+
 '<g class="p al-branch" style="--on:2.1s;--off:1.2s"><path d="M160 97C120 95 70 99 22 104c-6 .6-10 2-12 4" class="al-wood"/><path d="M96 98c4-8 12-11 20-10-3 7-11 11-20 10zM40 103c-6-5-14-5-19-1 6 4 13 4 19 1z" class="al-leaf"/></g>'+
 '<g class="al-tailw"><g class="p" style="--on:2.7s;--off:.75s"><path d="M136 90c13 6 16 17 10 26" class="al-tl"/></g>'+
  '<g class="p" style="--on:3s;--off:.5s"><path d="M146 116c-6 8-4 16 4 18" class="al-tl"/></g>'+
  '<g class="p" style="--on:3.3s;--off:.25s"><path d="M150 134c6 1 8-4 5-7" class="al-tl"/></g>'+
  '<g class="p" style="--on:3.6s;--off:0s"><path d="M155 127c-2-2.6-6-1.6-5.4 1.6" class="al-tl al-tip"/></g></g>'+
 '<g class="p al-body" style="--on:2.1s;--off:1.2s"><path d="M66 70c18-10 52-10 68 2 8 6 8 18 0 22-16 6-50 6-70 2z" class="al-fur"/>'+
  '<path d="M84 64l3 10M98 62l1 11M112 64l-1 10M124 68l-3 9" class="al-st"/><path d="M70 92c-2 6-1 11 3 13M88 95c-1 6 0 10 4 12" class="al-ln"/></g>'+
 '<g class="p al-head" style="--on:1.5s;--off:1.7s"><g transform="translate(13 12) scale(.7)">'+
  '<path d="M18 58C16 36 30 24 60 24S104 36 102 58C100 80 84 92 60 92S20 80 18 58Z" class="al-fur"/>'+
  '<path d="M26 38L22 8 46 27M94 38l4-30-24 19" class="al-fur"/><path d="M28 30l-2-14 10 9M92 30l2-14-10 9" class="al-ln"/>'+
  '<path d="M48 25l2 9M60 24v10M72 25l-2 9M22 52l8 2M21 60h8M98 52l-8 2M99 60h-8" class="al-st"/>'+
  '<path d="M4 58l22 2M6 66l20-2M116 58l-22 2M114 66l-20-2" class="al-wh"/><path d="M57 58l3 3 3-3z" class="al-nose"/></g></g>'+
 '<g class="p al-eyes" style="--on:.9s;--off:2.1s"><g class="al-blink"><g transform="translate(13 12) scale(.7)">'+
  '<ellipse cx="44" cy="48" rx="8" ry="5.6" class="al-iris"/><ellipse cx="76" cy="48" rx="8" ry="5.6" class="al-iris"/><path d="M44 43v10M76 43v10" class="al-pupil"/></g></g></g>'+
 '<g class="p al-grin" style="--on:0s;--off:3.1s"><g class="al-sway"><g transform="translate(13 12) scale(.7)">'+
  '<path d="M26 62Q60 94 94 62Q60 78 26 62Z" class="al-mouth"/><path d="M34 67.5l1 5M42 71l.8 6M50 73l.5 6.4M60 74v6.6M70 73l-.5 6.4M78 71l-.8 6M86 67.5l-1 5" class="al-teeth"/></g></g></g>'+
 '</svg>';
function alCatEl(){const c=alLayer('alCat');if(!c.firstChild)c.innerHTML=AL_CAT_SVG;return c;}
/** the cat leaves: tail first, the grin last (instantly when the skin is off) */
function alCatHide(){clearTimeout(alCatT);alCatT=null;const c=document.getElementById('alCat');if(!c||!c.classList.contains('on'))return;
  c.classList.remove('on');if(!alOn()||alCalm()){c.classList.remove('off');return;}
  c.classList.add('off');clearTimeout(alCatOffT);alCatOffT=setTimeout(function(){c.classList.remove('off');},AL_CAT_OFF_MS);}
function alCatArm(){
  alCatHide();
  if(!alOn()||!AL_CAT_ON)return;const lib=document.getElementById('library');if(!lib||lib.classList.contains('hidden'))return;
  alCatT=setTimeout(function(){const l=document.getElementById('library');if(!alOn()||!l||l.classList.contains('hidden')||document.hidden)return;
    const c=alCatEl();clearTimeout(alCatOffT);c.classList.remove('off');void c.offsetWidth;c.classList.add('on');},AL_CAT_MS);
}
['pointerdown','keydown','wheel'].forEach(function(t){addEventListener(t,function(){if(alOn())alCatArm();},{passive:true,capture:true});});
document.addEventListener('scroll',function(){const c=document.getElementById('alCat');if(alOn()&&c&&c.classList.contains('on'))alCatArm();},{passive:true,capture:true});
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
