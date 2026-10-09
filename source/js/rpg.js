'use strict';
/* ================= ПРОФИЛЬ ================= */
const PHASES=[[1,'Новичок'],[3,'Читатель'],[5,'Книжный странник'],[8,'Магистр'],[12,'Архимаг чтения']];
function phaseName(lv){const st=curStatuses().slice().sort((a,b)=>a[0]-b[0]);let n=st[0]?st[0][1]:'Новичок';st.forEach(p=>{if(lv>=p[0])n=p[1];});return n;}
const AVA=['🧙','🦸','🤓','📖','🦉','🐉','🦊','🐺','👸','🥷','🤖','😼'];
/* ====== Персонаж-аватар (слоёный SVG, адаптивный к пиксель-режиму) ====== */
const SKINS=['#f2c89b','#e7b07e','#c68642','#8d5524','#ffd9b3','#a9745b'];
const HAIRC=['#33271d','#6b4423','#b07a2e','#e6c34a','#b23b2e','#6c4ab6','#2e3a59','#d7d7d7'];
const HAIR_STYLES=['Короткие','Ёжик','Каре','Длинные','Хвост','Пучок','Лысый'];
function charDefaults(){S.char=S.char||{};const c=S.char;if(c.gender==null)c.gender='n';if(c.skin==null)c.skin=0;if(c.hair==null)c.hair=1;if(c.hairColor==null)c.hairColor=0;return c;}
function outfitColor(){const g=(S.char&&S.char.gender)||'n';if(S.equipped&&S.equipped.body==='armor')return '#9aa6b2';return g==='m'?'#3f6fb0':(g==='f'?'#9b59b6':'#2bb3a3');}
function shade(hex,d){let c=String(hex).replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');const n=parseInt(c,16);const r=Math.max(0,Math.min(255,((n>>16)&255)+d)),g=Math.max(0,Math.min(255,((n>>8)&255)+d)),b=Math.max(0,Math.min(255,(n&255)+d));return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}
function star(cx,cy,s,fill){return '<path d="M'+cx+' '+(cy-s)+' L'+(cx+s*0.28)+' '+(cy-s*0.28)+' L'+(cx+s)+' '+cy+' L'+(cx+s*0.28)+' '+(cy+s*0.28)+' L'+cx+' '+(cy+s)+' L'+(cx-s*0.28)+' '+(cy+s*0.28)+' L'+(cx-s)+' '+cy+' L'+(cx-s*0.28)+' '+(cy-s*0.28)+' Z" fill="'+fill+'"/>';}
function hairLayers(style,hc,hi,ol){
  if(style===6)return ['',''];
  const base='<path d="M21 24 Q20 9 36 9 Q52 9 51 24 Q49 16 43 13 Q46 18 44 22 Q40 14 36 14 Q32 14 28 22 Q26 18 29 13 Q23 16 21 24 Z" fill="'+hc+'" '+ol+'/>';
  const hl='<path d="M29 13 Q34 10 40 13 Q35 12 29 16 Z" fill="'+hi+'" opacity=".75"/>';
  let back='',front=base+hl;
  if(style===1)front+='<path d="M24 13 L27 5 L31 12 L36 4 L41 12 L45 5 L48 13 Z" fill="'+hc+'" '+ol+'/>';
  if(style===2)front+='<path d="M21 22 L21 34 Q24 36 26 34 L26 22 Z" fill="'+hc+'" '+ol+'/><path d="M51 22 L51 34 Q48 36 46 34 L46 22 Z" fill="'+hc+'" '+ol+'/>';
  if(style===3)back+='<path d="M21 18 Q19 41 25 58 L47 58 Q53 41 51 18 Z" fill="'+hc+'" '+ol+'/>';
  if(style===4)back+='<path d="M49 16 Q60 24 55 45 Q52 47 49 45 Q53 30 47 20 Z" fill="'+hc+'" '+ol+'/>';
  if(style===5)front+='<circle cx="36" cy="7" r="5" fill="'+hc+'" '+ol+'/>';
  return [back,front];
}
function heart(cx,cy,sz,fill){return '<path d="M'+cx+' '+(cy+sz*0.85)+' C'+(cx-sz*1.3)+' '+(cy-sz*0.1)+' '+(cx-sz*0.55)+' '+(cy-sz*1.05)+' '+cx+' '+(cy-sz*0.25)+' C'+(cx+sz*0.55)+' '+(cy-sz*1.05)+' '+(cx+sz*1.3)+' '+(cy-sz*0.1)+' '+cx+' '+(cy+sz*0.85)+' Z" fill="'+fill+'"/>';}
const BG_BOOKCOLS=['#b23b2e','#c98b2e','#2e7d6b','#3b6b9e','#6c4ab6','#9e3b6b','#3d9442','#b07a2e'];
function bgScene(bg,px){
  if(!bg)return '';
  const rr=px?0:11;let inner='';
  if(bg==='library'){
    inner='<rect width="72" height="78" fill="#7a5230"/>';
    const row=function(y){let r='';for(let i=0;i<11;i++){const h=11+((i*37)%9);r+='<rect x="'+(2+i*6.4)+'" y="'+(y-h)+'" width="5.4" height="'+h+'" fill="'+BG_BOOKCOLS[(i+y)%8]+'"/>';}return r;};
    inner+=row(26)+'<rect y="26" width="72" height="3.5" fill="#5a3d22"/>'+row(52)+'<rect y="52" width="72" height="3.5" fill="#5a3d22"/><rect y="74" width="72" height="4" fill="#4e3420"/>';
  }else if(bg==='forest'){
    inner='<rect width="72" height="78" fill="#bfe6f5"/><circle cx="58" cy="13" r="6" fill="#ffe27a"/><rect y="54" width="72" height="24" fill="#5aa55a"/>'+
      '<path d="M12 56 L19 34 L26 56 Z" fill="#2f7d44"/><rect x="17" y="55" width="4" height="6" fill="#6b4a2a"/>'+
      '<path d="M46 58 L54 32 L62 58 Z" fill="#2f7d44"/><rect x="52" y="57" width="4" height="6" fill="#6b4a2a"/>';
  }else if(bg==='night'){
    inner='<rect width="72" height="78" fill="#1b2350"/><rect y="48" width="72" height="30" fill="#2a3570"/><circle cx="54" cy="16" r="7" fill="#f2ecc9"/><circle cx="51" cy="14" r="2" fill="#dcd6b0"/>'+star(14,14,2.2,'#fff')+star(26,24,1.5,'#fff')+star(40,12,1.7,'#fff')+star(64,34,1.5,'#fff');
  }else if(bg==='sunset'){
    inner='<rect width="72" height="78" fill="#ff9a5a"/><rect width="72" height="44" fill="#ff7a8a"/><rect width="72" height="22" fill="#7a4a9e"/><circle cx="36" cy="42" r="11" fill="#ffd166"/><rect y="60" width="72" height="18" fill="#3a2b4a"/>';
  }else if(bg==='castle'){
    inner='<rect width="72" height="78" fill="#9fd0e8"/><rect y="28" width="72" height="50" fill="#8a8f99"/><rect y="24" width="8" height="6" fill="#8a8f99"/><rect x="16" y="24" width="8" height="6" fill="#8a8f99"/><rect x="32" y="24" width="8" height="6" fill="#8a8f99"/><rect x="48" y="24" width="8" height="6" fill="#8a8f99"/><rect x="64" y="24" width="8" height="6" fill="#8a8f99"/>'+
      '<path d="M0 40 L72 40 M0 54 L72 54 M0 68 L72 68 M18 28 L18 78 M36 28 L36 78 M54 28 L54 78" stroke="#767b85" stroke-width="1"/>';
  }
  return '<defs><clipPath id="avclip"><rect width="72" height="78" rx="'+rr+'"/></clipPath></defs><g clip-path="url(#avclip)">'+inner+'</g>';
}
function pixelSvg(c){
  // Майнкрафт-стиль: голова 8x8, торс 8x8, руки/ноги по 4px. viewBox -4 0 24 24 (квадрат, заполняет рамку)
  const eq=S.equipped||{};
  const skin=SKINS[c.skin%SKINS.length],hair=HAIRC[c.hairColor%HAIRC.length];
  let outfit=outfitColor();const armor=eq.body==='armor';
  if(armor)outfit='#aeb8c4';else if(eq.body==='robe')outfit='#6c4ab6';else if(eq.body==='vest')outfit='#3d8a5a';
  const ssh=shade(skin,-20),nsh=shade(skin,-34),osh=shade(outfit,-24),hh=shade(hair,46);
  let pants='#3a4a8a',boot='#26262e';
  if(eq.feet==='boots')boot='#6b3f1d';else if(eq.feet==='ironboots')boot='#9aa6b2';else if(eq.feet==='sneakers')boot='#eceff3';
  const r=function(x,y,w,h,f){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+f+'"/>';};
  const EC='#6a6ab5';const fem=c.gender==='f',male=c.gender==='m';const aw=fem?3:4,alx=4-aw;let s='';
  const bg=eq.bg;
  if(bg==='library'){s+=r(-5,-3,28,28,'#6b4626');for(let i=0;i<15;i++){s+=r(-5+i*2,-2,2,7,BG_BOOKCOLS[i%8])+r(-5+i*2,8,2,7,BG_BOOKCOLS[(i+3)%8])+r(-5+i*2,18,2,7,BG_BOOKCOLS[(i+5)%8]);}s+=r(-5,5,28,2,'#4e3420')+r(-5,15,28,2,'#4e3420')+r(-5,23,28,2,'#3d2918');}
  else if(bg==='forest'){s+=r(-5,-3,28,28,'#aee0f5')+r(-5,-3,28,7,'#c7ebff')+r(15,-1,4,4,'#ffe27a')+r(-5,17,28,8,'#5aa55a')+r(-5,21,28,4,'#4a8a45');[[-3,17],[8,15],[17,18]].forEach(function(t){var x=t[0],y=t[1];s+=r(x+1,y+4,2,4,'#6b4a2a')+r(x-1,y+1,6,2,'#2f7d44')+r(x,y-2,4,3,'#3a9450')+r(x+1,y-5,2,3,'#3a9450');});}
  else if(bg==='night'){s+=r(-5,-3,28,28,'#141a3e')+r(-5,12,28,13,'#22305e')+r(-5,20,28,5,'#2e3f6e')+r(14,1,4,4,'#f2ecc9')+r(14,1,1,1,'#141a3e')+r(16,3,1,1,'#141a3e');[[-3,4],[3,1],[9,5],[18,2],[1,14],[16,15],[20,8],[-2,19]].forEach(function(p){s+=r(p[0],p[1],1,1,'#fff');});}
  else if(bg==='sunset'){s+=r(-5,-3,28,28,'#ffb56b')+r(-5,-3,28,10,'#ff8a7a')+r(-5,-3,28,5,'#9a5aa8')+r(5,8,7,6,'#ffd166')+r(-5,18,28,7,'#3a2b4a')+r(-5,18,28,1,'#5a4060');}
  else if(bg==='castle'){s+=r(-5,-3,28,28,'#9fd0e8')+r(-5,8,28,17,'#8a8f99')+r(-5,7,3,1,'#9aa0aa')+r(1,7,3,1,'#9aa0aa')+r(7,7,3,1,'#9aa0aa')+r(13,7,3,1,'#9aa0aa')+r(19,7,3,1,'#9aa0aa')+r(-5,13,28,1,'#767b85')+r(-5,19,28,1,'#767b85')+r(2,8,1,17,'#767b85')+r(9,8,1,17,'#767b85')+r(16,8,1,17,'#767b85')+r(6,15,4,4,'#3a3f4a');}
  // питомцы
  if(eq.pet==='cat')s+=r(-4,20,4,4,'#9b9b9b')+r(-4,18,3,2,'#9b9b9b')+r(-4,17,1,1,'#9b9b9b')+r(-2,17,1,1,'#9b9b9b')+r(-4,18,1,1,'#2dbd6e')+r(-2,18,1,1,'#2dbd6e')+r(0,21,1,3,'#9b9b9b');
  else if(eq.pet==='owl')s+=r(-4,19,4,5,'#8a6b4a')+r(-4,20,1,2,'#fff')+r(-1,20,1,2,'#fff')+r(-4,20,1,1,'#1a1a1a')+r(-1,20,1,1,'#1a1a1a')+r(-3,22,2,1,'#e6a23c')+r(-4,18,1,1,'#8a6b4a')+r(-1,18,1,1,'#8a6b4a');
  else if(eq.pet==='dragon')s+=r(-4,20,4,4,'#4caf50')+r(-4,18,2,2,'#4caf50')+r(-4,18,1,1,'#1a1a1a')+r(0,19,1,3,'#3d9442')+r(-2,17,1,1,'#3d9442');
  // аура
  if(eq.aura==='fire'){[[-4,12],[-3,17],[17,12],[18,8],[-4,5]].forEach(function(p){s+=r(p[0],p[1],1,1,'#ff7a18');});}
  else if(eq.aura==='stars'){[[-4,2],[18,3],[17,18],[-3,19],[19,11]].forEach(function(p){s+=r(p[0],p[1],1,1,'#fff');});}
  else if(eq.aura==='hearts'){[[-4,4],[18,6],[17,16],[-3,15]].forEach(function(p){s+=r(p[0],p[1],1,1,'#ff7aa2');});}
  // плащ
  if(eq.body==='cape')s+=r(3,8,1,12,'#b23b2e')+r(12,8,1,12,'#b23b2e')+r(4,16,8,4,'#b23b2e')+r(4,19,8,1,'#8e2c22');
  // руки (у девушки тоньше: 3px)
  s+=r(alx,8,aw,6,outfit)+r(alx,14,aw,2,skin)+r(12,8,aw,6,outfit)+r(12,14,aw,2,skin);
  if(armor)s+=r(alx,8,aw,1,'#c6cdd6')+r(12,8,aw,1,'#c6cdd6');
  // ноги + обувь
  s+=r(4,16,4,8,pants)+r(8,16,4,8,pants)+r(7,17,1,7,shade(pants,-22))+r(4,22,4,2,boot)+r(8,22,4,2,boot);
  // торс
  s+=r(4,8,8,8,outfit)+r(4,14,8,2,osh);
  if(armor)s+=r(4,8,8,1,'#c6cdd6')+r(5,9,1,5,'#c6cdd6')+r(10,9,1,5,'#c6cdd6')+r(7,9,2,1,'#c6cdd6');
  if(eq.body==='robe')s+=r(4,16,8,7,'#6c4ab6')+r(7,8,1,15,'#f1c40f');
  if(eq.body==='vest')s+=r(7,8,2,8,shade(outfit,-18));
  // голова + лицо
  s+=r(4,0,8,8,skin)+r(4,2,8,1,ssh);
  if(male)s+=r(4,7,8,1,ssh);
  s+=r(5,4,1,2,'#fff')+r(6,4,1,2,EC)+r(9,4,1,2,EC)+r(10,4,1,2,'#fff');
  if(male)s+=r(5,3,2,1,shade(hair,-8))+r(9,3,2,1,shade(hair,-8));
  if(fem)s+=r(4,4,1,1,'#2e2733')+r(11,4,1,1,'#2e2733');
  s+=r(7,5,2,1,nsh);
  s+=fem?r(6,6,4,1,'#c4646e'):r(6,6,4,1,'#7a4a3a');
  if(fem)s+=r(4,5,1,1,'#ff9aa2')+r(11,5,1,1,'#ff9aa2');
  // волосы
  if(c.hair!==6){
    s+=r(4,0,8,2,hair)+r(4,2,1,1,hair)+r(11,2,1,1,hair)+r(5,0,2,1,hh);
    if(fem)s+=r(4,2,1,6,hair)+r(11,2,1,6,hair);
    if(c.hair===2)s+=r(4,2,1,4,hair)+r(11,2,1,4,hair);
    else if(c.hair===3)s+=r(4,2,1,9,hair)+r(11,2,1,9,hair)+r(3,3,1,7,hair)+r(12,3,1,7,hair);
    else if(c.hair===4)s+=r(11,2,3,6,hair);
    else if(c.hair===5)s+=r(6,0,4,1,hh);
    else if(c.hair===1)s+=r(4,0,1,1,hh)+r(7,0,1,1,hh)+r(10,0,1,1,hh);
  }
  if(eq.face==='glasses')s+=r(5,4,1,2,'#bfe3ff')+r(6,4,1,2,EC)+r(9,4,1,2,EC)+r(10,4,1,2,'#bfe3ff')+r(7,4,2,1,'#2e2733')+r(4,4,1,1,'#2e2733')+r(11,4,1,1,'#2e2733');
  // головной убор
  if(eq.head==='hat')s+=r(4,3,8,1,'#4a3296')+r(5,2,6,1,'#5b3fb0')+r(6,1,4,1,'#5b3fb0')+r(7,-1,2,2,'#5b3fb0')+r(7,1,1,1,'#ffe27a');
  else if(eq.head==='crown')s+=r(4,1,8,1,'#f1c40f')+r(4,0,1,1,'#f1c40f')+r(7,-1,2,2,'#f1c40f')+r(11,0,1,1,'#f1c40f')+r(7,1,2,1,'#e74c3c');
  else if(eq.head==='helm')s+=r(3,0,10,4,'#9aa6b2')+r(7,4,2,3,'#8995a2')+r(3,3,10,1,'#7f8a96')+r(3,1,1,2,'#c2cad4');
  else if(eq.head==='cap')s+=r(4,0,8,2,'#3b6b9e')+r(11,2,4,1,'#2f5680')+r(5,0,3,1,'#5a8ec0');
  else if(eq.head==='circlet')s+=r(4,2,8,1,'#f1c40f')+r(7,2,2,1,'#3b8de0');
  // оружие — в правой руке (рукоять у кисти, лезвие вверх)
  if(eq.weapon==='sword')s+=r(13,3,2,9,'#dfe6ee')+r(13,3,1,9,'#f2f6fb')+r(12,12,4,1,'#caa23a')+r(13,13,2,3,'#6b3f1d')+r(13,16,2,1,'#caa23a');
  else if(eq.weapon==='staff')s+=r(13,4,2,12,'#7a4f24')+r(12,1,4,3,'#7ad0ff')+r(13,1,2,1,'#c8efff');
  else if(eq.weapon==='bow')s+=r(14,3,2,1,'#6b3f1d')+r(15,4,1,8,'#6b3f1d')+r(14,12,2,1,'#6b3f1d')+r(14,3,1,10,'#e8e8e8')+r(10,9,5,1,'#8a5a2a')+r(9,8,1,1,'#9aa6b2')+r(9,10,1,1,'#9aa6b2');
  return '<svg viewBox="-5 -3 28 28" width="100%" height="100%" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>';
}
function avatarSvg(px){
  const c=charDefaults();if(px==null)px=!!S.pixelOn;
  if(px)return pixelSvg(c);
  const skin=SKINS[c.skin%SKINS.length],hc=HAIRC[c.hairColor%HAIRC.length];
  const eq=S.equipped||{};const armor=eq.body==='armor';
  let outfit=outfitColor();if(armor)outfit='#aeb8c4';else if(eq.body==='robe')outfit='#6c4ab6';else if(eq.body==='vest')outfit='#3d8a5a';
  const sks=shade(skin,-26),ofd=shade(outfit,-32),hi=shade(hc,48);
  const ol='stroke="#2e2733" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" fill-opacity="1"',ol1='stroke="#2e2733" stroke-width="1"';
  const RX=function(v){return px?0:v;};const sr=px?'crispEdges':'geometricPrecision';
  const hairsv=hairLayers(c.hair,hc,hi,ol);
  let s=bgScene(eq.bg,px);
  s+='<ellipse cx="36" cy="75" rx="18" ry="3" fill="#000" opacity=".16"/>';
  if(eq.aura==='fire')s+='<circle cx="36" cy="34" r="33" fill="#ff7a18" opacity=".15"/><circle cx="36" cy="34" r="23" fill="#ffb648" opacity=".16"/>';
  if(eq.aura==='stars')s+='<circle cx="36" cy="34" r="33" fill="#9fd0ff" opacity=".13"/>'+star(13,15,3,'#ffe27a')+star(58,20,2.4,'#ffe27a')+star(56,47,2,'#ffe27a');
  if(eq.aura==='hearts')s+=heart(14,20,4,'#ff7aa2')+heart(58,26,3.4,'#ff9ab4')+heart(55,52,3,'#ff7aa2');
  if(eq.pet==='cat')s+='<ellipse cx="13" cy="66" rx="8" ry="7" fill="#9b9b9b" '+ol+'/><path d="M7 60 L9 54 L13 60 Z" fill="#9b9b9b" '+ol+'/><path d="M19 60 L17 54 L13 60 Z" fill="#9b9b9b" '+ol+'/><path d="M21 68 Q26 66 25 60" fill="none" '+ol+'/><circle cx="10" cy="65" r="1.3" fill="#1a1a1a"/><circle cx="16" cy="65" r="1.3" fill="#1a1a1a"/>';
  else if(eq.pet==='owl')s+='<ellipse cx="13" cy="65" rx="8" ry="8" fill="#8a6b4a" '+ol+'/><circle cx="10" cy="62" r="3" fill="#fff" '+ol1+'/><circle cx="16" cy="62" r="3" fill="#fff" '+ol1+'/><circle cx="10" cy="62" r="1.3" fill="#1a1a1a"/><circle cx="16" cy="62" r="1.3" fill="#1a1a1a"/><path d="M11 65 L15 65 L13 68 Z" fill="#e6a23c" '+ol1+'/>';
  else if(eq.pet==='dragon')s+='<ellipse cx="13" cy="66" rx="8" ry="7" fill="#4caf50" '+ol+'/><path d="M8 60 L5 55 L11 59 Z" fill="#4caf50" '+ol+'/><path d="M20 62 Q27 60 24 67 Z" fill="#3d9442" '+ol1+'/><circle cx="11" cy="65" r="1.3" fill="#1a1a1a"/>';
  s+=hairsv[0];
  if(eq.body==='cape')s+='<path d="M27 41 L45 41 L53 66 Q36 61 19 66 Z" fill="#b23b2e" '+ol+'/><path d="M36 41 L36 62" stroke="#8e2c22" stroke-width="1" opacity=".6"/>';
  s+='<rect x="30" y="56" width="5.5" height="13" rx="'+RX(2.5)+'" fill="#3a3f4a" '+ol+'/><rect x="36.5" y="56" width="5.5" height="13" rx="'+RX(2.5)+'" fill="#3a3f4a" '+ol+'/>';
  let shoeF='#26282f';if(eq.feet==='boots')shoeF='#6b3f1d';else if(eq.feet==='ironboots')shoeF='#9aa6b2';else if(eq.feet==='sneakers')shoeF='#eceff3';
  if(eq.feet&&eq.feet!=='sneakers'){
    s+='<rect x="29.4" y="58" width="6.8" height="12" rx="'+RX(2)+'" fill="'+shoeF+'" '+ol1+'/><rect x="36.3" y="58" width="6.8" height="12" rx="'+RX(2)+'" fill="'+shoeF+'" '+ol1+'/>';
    s+='<ellipse cx="31" cy="71" rx="4.6" ry="2.6" fill="'+shade(shoeF,-28)+'" '+ol1+'/><ellipse cx="41" cy="71" rx="4.6" ry="2.6" fill="'+shade(shoeF,-28)+'" '+ol1+'/>';
    if(eq.feet==='ironboots')s+='<path d="M29.6 63 L36 63 M36.5 63 L42.9 63" stroke="#7f8a96" stroke-width="1"/>';
  }else{
    s+='<ellipse cx="31" cy="70" rx="4.2" ry="2.6" fill="'+shoeF+'" '+ol1+'/><ellipse cx="41" cy="70" rx="4.2" ry="2.6" fill="'+shoeF+'" '+ol1+'/>';
    if(eq.feet==='sneakers')s+='<path d="M27 71 L35 71 M37 71 L45 71" stroke="#c7ccd4" stroke-width="1.2"/>';
  }
  s+='<path d="M27 40 Q23 41 23 47 L22 60 Q22 63 25 63 L47 63 Q50 63 50 60 L49 47 Q49 41 45 40 Z" fill="'+outfit+'" '+ol+'/>';
  s+='<path d="M23 57 L49 57 L49.5 60 Q49.5 63 46 63 L26 63 Q22.5 63 22.5 60 Z" fill="'+ofd+'" opacity=".5"/>';
  s+='<rect x="23" y="53" width="26" height="3.2" fill="'+ofd+'" '+ol1+'/>';
  s+='<path d="M31 40 Q36 47 41 40" fill="'+ofd+'" '+ol1+'/>';
  if(eq.body==='robe')s+='<path d="M36 41 L36 62" stroke="#f1c40f" stroke-width="1.3" opacity=".9"/><circle cx="36" cy="44" r="1" fill="#f1c40f"/>';
  if(armor)s+='<ellipse cx="25" cy="43" rx="5.5" ry="4.2" fill="#c6cdd6" '+ol+'/><ellipse cx="47" cy="43" rx="5.5" ry="4.2" fill="#c6cdd6" '+ol+'/><path d="M31 45 L41 45" stroke="#8a93a0" stroke-width="1"/>';
  s+='<path d="M27 42 Q20 44 21 54 Q21 57 25 56 L28 48 Z" fill="'+outfit+'" '+ol+'/><path d="M45 42 Q52 44 51 54 Q51 57 47 56 L44 48 Z" fill="'+outfit+'" '+ol+'/>';
  s+='<circle cx="23" cy="56" r="3.2" fill="'+skin+'" '+ol1+'/><circle cx="49" cy="56" r="3.2" fill="'+skin+'" '+ol1+'/>';
  s+='<rect x="32.5" y="35" width="7" height="6" fill="'+skin+'"/><rect x="32.5" y="39" width="7" height="2" fill="'+sks+'" opacity=".5"/>';
  s+='<rect x="21" y="9" width="30" height="29" rx="'+RX(13)+'" fill="'+skin+'" '+ol+'/>';
  s+='<ellipse cx="21" cy="25" rx="2.6" ry="3.2" fill="'+skin+'" '+ol1+'/><ellipse cx="51" cy="25" rx="2.6" ry="3.2" fill="'+skin+'" '+ol1+'/>';
  s+='<path d="M44 12 Q51 18 49 30 Q47 35 42 37 Q48 28 45 16 Z" fill="'+sks+'" opacity=".26"/>';
  s+='<ellipse cx="30" cy="24" rx="3.1" ry="4" fill="#fff" '+ol1+'/><ellipse cx="42" cy="24" rx="3.1" ry="4" fill="#fff" '+ol1+'/>';
  s+='<circle cx="30.4" cy="24.6" r="2.3" fill="#5b3a22"/><circle cx="42.4" cy="24.6" r="2.3" fill="#5b3a22"/>';
  s+='<circle cx="30.4" cy="24.6" r="1.1" fill="#1a1a1a"/><circle cx="42.4" cy="24.6" r="1.1" fill="#1a1a1a"/>';
  s+='<circle cx="29.4" cy="23.4" r=".8" fill="#fff"/><circle cx="41.4" cy="23.4" r=".8" fill="#fff"/>';
  s+='<path d="M27 18.5 Q30 17 33 18.6" stroke="'+shade(hc,-12)+'" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M39 18.6 Q42 17 45 18.5" stroke="'+shade(hc,-12)+'" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
  s+='<path d="M32 31 Q36 35 40 31" stroke="#9b4b3f" stroke-width="1.7" fill="none" stroke-linecap="round"/>';
  const bl=c.gender==='f'?'.5':'.3';
  s+='<ellipse cx="27" cy="29" rx="2.4" ry="1.5" fill="#ff9aa2" opacity="'+bl+'"/><ellipse cx="45" cy="29" rx="2.4" ry="1.5" fill="#ff9aa2" opacity="'+bl+'"/>';
  if(eq.face==='glasses')s+='<circle cx="30" cy="24" r="4" fill="#bfe3ff" fill-opacity=".35" '+ol1+'/><circle cx="42" cy="24" r="4" fill="#bfe3ff" fill-opacity=".35" '+ol1+'/><path d="M34 24 L38 24" stroke="#2e2733" stroke-width="1.2"/><path d="M26 22.5 L23 21.5 M46 22.5 L49 21.5" stroke="#2e2733" stroke-width="1.2"/>';
  s+=hairsv[1];
  if(eq.head==='hat')s+='<ellipse cx="36" cy="15" rx="16" ry="3.6" fill="#4a3296" '+ol+'/><path d="M26 15 Q30 1 36 0 Q41 5 46 15 Z" fill="#5b3fb0" '+ol+'/><path d="M28 12 L44 12 L43 15 L29 15 Z" fill="#3a2580"/>'+star(34,7,2.2,'#ffe27a');
  else if(eq.head==='crown')s+='<path d="M24 15 L24 8 L29 12 L33 4 L36 11 L39 4 L43 12 L48 8 L48 15 Z" fill="#f1c40f" '+ol+'/><rect x="24" y="14" width="24" height="3" fill="#d4a90a" '+ol1+'/><circle cx="33" cy="13" r="1.3" fill="#e74c3c"/><circle cx="39" cy="13" r="1.3" fill="#3b8de0"/>';
  else if(eq.head==='helm')s+='<path d="M21 23 Q21 7 36 7 Q51 7 51 23 L51 25 L21 25 Z" fill="#9aa6b2" '+ol+'/><rect x="34" y="23" width="4" height="14" fill="#8995a2" '+ol1+'/><path d="M21 18 L51 18" stroke="#7f8a96" stroke-width="1"/>';
  else if(eq.head==='cap')s+='<path d="M21 17 Q21 8 36 8 Q51 8 51 17 Z" fill="#3b6b9e" '+ol+'/><path d="M34 17 Q45 14 52 18 L52 20 Q45 16 34 19 Z" fill="#2f5680" '+ol1+'/><circle cx="36" cy="10" r="1.5" fill="#2f5680"/>';
  else if(eq.head==='circlet')s+='<path d="M21 15 Q36 20 51 15" fill="none" stroke="#f1c40f" stroke-width="2.4" stroke-linecap="round"/><path d="M33 15.5 L36 11.5 L39 15.5 Z" fill="#f1c40f" '+ol1+'/><circle cx="36" cy="15" r="1.5" fill="#3b8de0" '+ol1+'/>';
  if(eq.weapon==='sword')s+='<path d="M52 18 L54 21 L53.4 45 L50.6 45 L50 21 Z" fill="#dfe6ee" '+ol+'/><path d="M52 18 L52 45 L50.6 45 L50 21 Z" fill="#b9c2cc" opacity=".7"/><rect x="47" y="45" width="10" height="2.8" rx="1" fill="#caa23a" '+ol1+'/><rect x="50.8" y="47" width="2.4" height="6" fill="#6b3f1d" '+ol1+'/><circle cx="52" cy="54" r="1.6" fill="#caa23a" '+ol1+'/>';
  else if(eq.weapon==='staff')s+='<rect x="50.8" y="22" width="2.6" height="32" rx="1" fill="#7a4f24" '+ol+'/><circle cx="52" cy="18" r="4.6" fill="#7ad0ff" '+ol+'/><circle cx="50.6" cy="16.6" r="1.4" fill="#dff4ff"/>'+star(52,18,2,'#fff');
  else if(eq.weapon==='bow')s+='<path d="M52 16 Q62 33 52 50" fill="none" stroke="#6b3f1d" stroke-width="2.6" stroke-linecap="round"/><path d="M52 16 L52 50" stroke="#d8d8d8" stroke-width=".8"/><path d="M52 33 L43 33" stroke="#8a5a2a" stroke-width="1.4"/><path d="M43 33 L46 31 M43 33 L46 35" stroke="#8a5a2a" stroke-width="1"/>';
  return '<svg viewBox="0 0 72 78" width="100%" height="100%" shape-rendering="'+sr+'" xmlns="http://www.w3.org/2000/svg">'+s+'</svg>';
}
function setChar(key,val){charDefaults();S.char[key]=val;S.useChar=true;save();el('avatar').innerHTML=avatarSvg();if(el('gearLayer'))el('gearLayer').innerHTML='';renderCharPanel();}
function renderCharPanel(){
  charDefaults();const p=el('avaPal');p.className='charpanel';
  const sw=function(arr,sel,key){return arr.map(function(col,i){return '<button class="swatch'+(sel===i?' on':'')+'" style="background:'+col+'" onclick="setChar(\''+key+'\','+i+')"></button>';}).join('');};
  let h='';
  h+='<div class="crow"><span class="clab">Пол</span><div class="cbtns">'+[['m','♂'],['f','♀'],['n','⚧']].map(function(g){return '<button class="cbtn'+(S.char.gender===g[0]?' on':'')+'" onclick="setChar(\'gender\',\''+g[0]+'\')">'+g[1]+'</button>';}).join('')+'</div></div>';
  h+='<div class="crow"><span class="clab">Кожа</span><div class="cbtns">'+sw(SKINS,S.char.skin,'skin')+'</div></div>';
  h+='<div class="crow"><span class="clab">Причёска</span><div class="cbtns">'+HAIR_STYLES.map(function(nm,i){return '<button class="cbtn'+(S.char.hair===i?' on':'')+'" title="'+nm+'" onclick="setChar(\'hair\','+i+')">'+(i+1)+'</button>';}).join('')+'</div></div>';
  h+='<div class="crow"><span class="clab">Волосы</span><div class="cbtns">'+sw(HAIRC,S.char.hairColor,'hairColor')+'</div></div>';
  h+='<div class="crow"><span class="clab"></span><button class="lnk" onclick="useEmojiAvatar()">Использовать эмодзи вместо персонажа</button></div>';
  p.innerHTML=h;p.classList.remove('hidden');
}
function useEmojiAvatar(){S.useChar=false;save();openEmojiPal();}
function openEmojiPal(){
  const p=el('avaPal');p.className='emojigrid';p.innerHTML='';
  AVA.forEach(function(a2){const b=document.createElement('button');b.textContent=a2;b.onclick=function(){S.avatar=a2;S.useChar=false;save();p.classList.add('hidden');renderProfile();};p.appendChild(b);});
  const own=document.createElement('button');own.className='own';own.textContent='＋ любой свой эмодзи…';
  own.onclick=function(){const e2=prompt('Любой эмодзи:',S.avatar||'🧙');if(e2){S.avatar=e2.trim().slice(0,4);S.useChar=false;save();renderProfile();}p.classList.add('hidden');};
  p.appendChild(own);
  const back=document.createElement('button');back.className='own';back.textContent='↩ Вернуть персонажа';back.onclick=function(){S.useChar=true;save();p.classList.add('hidden');renderProfile();};p.appendChild(back);
  p.classList.remove('hidden');
}
el('avatar').onclick=()=>{
  const p=el('avaPal');
  if(!p.classList.contains('hidden')){p.classList.add('hidden');return;}
  if(S.useChar===false)openEmojiPal();else renderCharPanel();
};
/* ===== Босс чтения ===== */
const BOSSES=[{n:'Дракон Прокрастинации',e:'🐉'},{n:'Демон Лени',e:'👹'},{n:'Змей Скуки',e:'🐍'},{n:'Призрак Откладывания',e:'👻'},{n:'Кракен Отвлечения',e:'🦑'},{n:'Голем Усталости',e:'🗿'},{n:'Тень Сомнений',e:'🌑'}];
function bossMax(n){return 200+(n-1)*150;}
function bossInfo(n){const b=BOSSES[(n-1)%BOSSES.length];return {name:b.n,emoji:b.e};}
function ensureBoss(){if(!S.boss||!S.boss.n)S.boss={n:1,hp:bossMax(1)};return S.boss;}
function dealBossDamage(min,pages,finished){
  const bo=ensureBoss();const dmg=Math.round((min*10+pages*2+(finished?150:0))*talVal('boss'));if(dmg<=0)return;
  bo.hp-=dmg;
  if(bo.hp<=0){const cur=bo.n,rew=isMvp()?0:(80+cur*40),xpr=isMvp()?0:(40+cur*20);if(!isMvp()){S.gold+=rew;S.goldAllTime=(S.goldAllTime||0)+rew;S.xp+=xpr;}bo.n=cur+1;bo.hp=bossMax(bo.n);
    try{confetti();}catch(e){}try{flashMsg('⚔️ Повержен «'+bossInfo(cur).name+'»! +'+rew+' '+curI()+', +'+xpr+' XP');}catch(e){}}
}
/* ===== Ежедневный бонус ===== */
function dailyReward(){return Math.round((20+Math.min(10,S.streak||0)*10)*talVal('daily'));}
function claimDaily(){if(isMvp()){flashMsg('В MVP золото начисляется само: ежедневка +30 и неделя +120');return;}if(S.dailyClaim===today())return;const rew=dailyReward();S.gold+=rew;S.goldAllTime=(S.goldAllTime||0)+rew;S.dailyClaim=today();save();try{confetti();}catch(e){}flashMsg('🎁 +'+rew+' '+curI()+'! Возвращайся завтра');renderLibrary();}
/* ===== Стадии питомца ===== */
const PET_STAGES=[['Малыш',0],['Подросток',60],['Взрослый',180],['Легендарный',420]];
function petStage(){const px=S.petXp||0;let st=0;for(let i=0;i<PET_STAGES.length;i++)if(px>=PET_STAGES[i][1])st=i;return st;}
/* ===== Дерево талантов ===== */
const TALENTS=[
 {id:'k1',br:'mind',name:'Любознательность',icon:'🧠',desc:'+10% XP за чтение',eff:{xp:0.10}},
 {id:'k2',br:'mind',name:'Глубокое чтение',icon:'📖',desc:'ещё +15% XP',need:['k1'],eff:{xp:0.15}},
 {id:'k3',br:'mind',name:'Полимат',icon:'🦉',desc:'+25% XP и +50% к росту характеристик',need:['k2'],eff:{xp:0.25,stat:0.5}},
 {id:'g1',br:'gold',name:'Бережливость',icon:'🪙',desc:'+15% золота',eff:{gold:0.15}},
 {id:'g2',br:'gold',name:'Щедрая муза',icon:'🎁',desc:'+50% к ежедневному бонусу',need:['g1'],eff:{daily:0.5}},
 {id:'g3',br:'gold',name:'Золотая жила',icon:'💰',desc:'ещё +30% золота',need:['g2'],eff:{gold:0.30}},
 {id:'h1',br:'hero',name:'Меткий удар',icon:'⚔️',desc:'+25% урона боссу',eff:{boss:0.25}},
 {id:'h2',br:'hero',name:'Стойкость',icon:'🛡️',desc:'здоровье убывает вдвое медленнее',need:['h1'],eff:{decay:0.5}},
 {id:'h3',br:'hero',name:'Берсерк',icon:'🔥',desc:'+50% урона боссу',need:['h2'],eff:{boss:0.5}}
];
const TAL_BRANCHES=[['mind','🧠 Знание'],['gold','💰 Богатство'],['hero','⚔️ Герой']];
function talUnlocked(id){return !!(S.talents&&S.talents[id]);}
function talVal(key){let s=1;for(let i=0;i<TALENTS.length;i++){const t=TALENTS[i];if(talUnlocked(t.id)&&t.eff&&t.eff[key])s+=t.eff[key];}return s;}
function talentDecay(){let m=1;for(let i=0;i<TALENTS.length;i++){const t=TALENTS[i];if(talUnlocked(t.id)&&t.eff&&t.eff.decay)m*=t.eff.decay;}return m;}
function talPoints(){const earned=level(S.xp),spent=TALENTS.filter(t=>talUnlocked(t.id)).length;return {earned:earned,spent:spent,avail:Math.max(0,earned-spent)};}
function unlockTalent(id){const t=TALENTS.find(x=>x.id===id);if(!t||talUnlocked(id))return;if(talPoints().avail<=0){flashMsg('Нужны очки таланта — повышай уровень чтением');return;}if((t.need||[]).some(n=>!talUnlocked(n)))return;S.talents=S.talents||{};S.talents[id]=true;save();try{confetti();}catch(e){}flashMsg('🌳 Талант открыт: '+t.name);renderProfile();}
function renderTalents(){
  const box=el('talentTree');if(!box)return;const pts=talPoints();
  if(el('talPts'))el('talPts').textContent='· очков: '+pts.avail;
  box.innerHTML='<div class="taltree">'+TAL_BRANCHES.map(function(br){
    return '<div class="talbranch"><div class="talbr-h">'+br[1]+'</div>'+TALENTS.filter(function(t){return t.br===br[0];}).map(function(t){
      const on=talUnlocked(t.id),can=!on&&pts.avail>0&&(t.need||[]).every(talUnlocked),cls=on?'on':(can?'can':'lock');
      return '<button class="talnode '+cls+'" '+(can?'onclick="unlockTalent(\''+t.id+'\')"':'disabled')+'><span class="ti">'+t.icon+'</span><b>'+esc(t.name)+'</b><span class="td">'+esc(t.desc)+'</span><span class="ts">'+(on?'✅ открыт':(can?'🔓 открыть':'🔒'))+'</span></button>';
    }).join('')+'</div>';
  }).join('')+'</div>';
}
function renderProfile(){
  rollDay();
  const lv=level(S.xp);const[lo,hi]=lvlBounds(lv);
  if(S.useChar===false){el('avatar').textContent=S.avatar||(lv>=10?'🧙':lv>=5?'🦸':lv>=3?'🤓':'📖');if(el('gearLayer'))el('gearLayer').innerHTML=gearLayerHtml();}
  else{el('avatar').innerHTML=avatarSvg();if(el('gearLayer'))el('gearLayer').innerHTML='';}
  el('pName').textContent=S.heroName||'Читатель';
  el('pLvl').textContent='Уровень '+lv+' · '+phaseName(lv);
  const xpPct=Math.round((S.xp-lo)/(hi-lo)*100);
  el('xpFill').style.width=xpPct+'%';
  if(el('xpTxt2'))el('xpTxt2').textContent=xpPct+'%';
  el('xpTxt').textContent=S.xp+' XP · до уровня '+(lv+1)+': ещё '+(hi-S.xp)+' XP';
  // здоровье героя
  const hp=(S.hp==null?S.hpMax:S.hp),hpPct=Math.round(hp/S.hpMax*100);
  const hf=el('hpFill');if(hf){hf.style.width=hpPct+'%';hf.style.background=hpPct<=25?'#e0445b':(hpPct<=55?'#e6a23c':'#4cd97b');}
  if(el('hpTxt'))el('hpTxt').textContent=hp+' / '+S.hpMax;
  const af=el('avatarFrame');if(af)af.className='avatarframe'+((S.useChar!==false&&S.equipped&&S.equipped.bg)?(' bg-'+S.equipped.bg):'')+(hpPct<=35?' weak':'');
  if(el('hpHint'))el('hpHint').textContent=hpPct<=0?'😵 Герой обессилел! Откройте книгу, чтобы он ожил.':(hpPct<=35?'🥀 Герой слабеет без чтения — пора почитать.':(hpPct>=100?'💪 Герой полон сил!':'❤️ Читайте каждый день, иначе герой теряет здоровье.'));
  el('kStreak').textContent=S.streak;
  el('kGold').textContent=goldDisp();
  el('kGoldLbl').textContent=curI()+' '+S.cur.name;
  el('kMin').textContent=Math.round(S.totalMin);
  if(el('bossCard')){const bo=ensureBoss(),bi=bossInfo(bo.n),bmax=bossMax(bo.n),bp=Math.max(0,Math.min(100,Math.round(bo.hp/bmax*100)));
    el('bossCard').innerHTML='<div class="row" style="align-items:center;gap:12px"><div class="bossmob">'+bi.emoji+'</div><div style="flex:1;min-width:0"><div style="font-size:11px;color:var(--muted)">⚔️ БОСС ЧТЕНИЯ · #'+bo.n+'</div><b>'+esc(bi.name)+'</b><div class="statbar" style="margin-top:6px"><i style="width:'+bp+'%;background:#e0445b"></i></div><div style="font-size:11px;color:var(--muted);margin-top:3px">'+Math.max(0,Math.ceil(bo.hp))+' / '+bmax+' HP · читай, чтобы наносить урон</div></div></div>';}
  if(el('petCard')){const pid=S.equipped&&S.equipped.pet;if(pid){const g=gearById(pid),px=S.petXp||0,st=petStage(),nx=PET_STAGES[st+1];
    el('petCard').innerHTML='<div class="pcard" style="margin-top:10px"><div class="row" style="align-items:center"><span style="font-size:24px">'+(g?g.icon:'🐾')+'</span><div style="flex:1;min-width:0;margin-left:8px"><b>'+(g?esc(g.name):'Питомец')+'</b> · '+PET_STAGES[st][0]+'<div style="font-size:11px;color:var(--muted)">'+(nx?('до «'+nx[0]+'»: ещё '+Math.ceil(nx[1]-px)+' мин чтения'):'максимальная стадия! 🌟')+'</div></div></div></div>';}else el('petCard').innerHTML='';}
  const stList=allStats();
  const maxS=Math.max(20,...stList.map(s=>S.stats[s]||0));
  el('statBox').innerHTML=stList.map(s=>{
    const v=S.stats[s]||0;
    const custom=!STATS_BASE.includes(s);
    return '<div class="statrow"><div class="row"><span>'+esc(s)+(custom?' <span style="font-size:10px;color:var(--muted)">своя</span>':'')+'</span><div class="spacer"></div>'+
      (custom?'<button style="color:var(--muted);font-size:13px;padding:0 6px" onclick="renStat(\''+esc(s)+'\')">✏</button><button class="x" onclick="delStat(\''+esc(s)+'\')">✕</button>':'')+
      '<b>'+v+'</b></div>'+
    '<div class="pbar"><i style="width:'+Math.round(v/maxS*100)+'%;background:'+(v?'var(--accent2)':'var(--card2)')+'"></i></div></div>';
  }).join('')+'<button class="miniadd" onclick="addStat()">＋ Добавить характеристику</button>';
  renderTalents();
  renderEquip();
  renderMvpProfile();
  applyMvpChrome();
}
el('goalMinus').onclick=()=>{if(isMvp())return;S.goal=Math.max(5,S.goal-5);save();renderLibrary();};
el('goalPlus').onclick=()=>{if(isMvp())return;S.goal=Math.min(120,S.goal+5);save();renderLibrary();};
el('btnReset').onclick=()=>{
  if(!confirm('Точно сбросить весь прогресс?'))return;
  if(__rq&&__rq.clearAllLocal){__rq.clearAllLocal({settings:false,legacy:true});}
  try{localStorage.removeItem(RQ_K.v1);localStorage.removeItem(RQ_K.migrated);localStorage.removeItem(RQ_K.legacy);}catch(e){}
  location.reload();
};

