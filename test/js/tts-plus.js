/* ===== Озвучка+ (07.11, Джессика: «Еще можно улучшить озвучку…» → восемь идей → «Давай всё») =====
   1 Piper: живой нейроголос прямо в телефоне, бесплатно и без интернета (Ирина, Дмитрий, Денис, Руслан). Движок и голос скачиваются
     один раз по кнопке в «Нейросети → Озвучка» (onnxruntime-web и piper-wasm с jsDelivr, голоса с Hugging Face, MIT / GPL-данные espeak
     не лежат в репо — телефон берёт их сам) и лежат в кэше NS_piper; синтез идёт в отдельном потоке (Worker), страница не подвисает.
   2 Буква «ё» в частых словах и свой словарь произношения (SET.tp.dict: «написано → читать», «+» перед ударной гласной).
   3 Шторка и экран блокировки: ⏮ ⏭ двигают по предложениям, ⏪ ⏩ по абзацам; голос телефона держит тихий звук, чтобы читать с погасшим экраном.
   4 Назад / вперёд по предложению и абзацу (плашка над текстом, пока звучит книга), «Читать отсюда» по тапу на текст и в меню выделения.
   5 Паузы между абзацами и главами; номера сносок и страниц не читаются; сокращения целиком (т. е., XIX в., 1812 г.).
   6 Иностранные фразы — голосом своего языка, если он есть в телефоне.
   7 Нейроголос на ключе: до ~10 минут вперёд в пределах главы готовится заранее и хранится (NS_ttsc): без пауз на загрузку,
     а тот же кусок второй раз не оплачивается.
   8 «Произнести» в окне словаря и в меню выделения тем же голосом, что читает книгу.
   Всё оборачивает уже готовые ttsSay / ttsTextNext / ttsStop / ttsBtn / nttsFetch (js/reader-ui.js); прослушивание по-прежнему не чтение. */
const TP={gen:0,pos:-1,fresh:false,startAt:-1,stop:null,prep:new Map(),pre:{bid:'',upTo:0,run:false,q:[],seen:new Set()},sil:null,chip:null,chipT:0,fly:new Map()};
function tpS(){if(!SET.tp)SET.tp=rqTpNorm(null);return SET.tp;}
const TP_NS=(window.RQ_NS||'rq');

/* ---------- 2 + 5: текст перед голосом. Возвращает {s, m}: m[i] — место символа s[i] в исходном куске (чтобы листать за голосом) ---------- */
function tpRun(st,re,fn){
  re.lastIndex=0;let out='',m=[],last=0,x,hit=false;
  while((x=re.exec(st.s))){const a=x.index,z=a+x[0].length;if(z===a){re.lastIndex++;continue;}
    const r=fn(x,st.s,a,z);if(r==null)continue;hit=true;
    out+=st.s.slice(last,a);for(let i=last;i<a;i++)m.push(st.m[i]);
    out+=r;for(let i=0;i<r.length;i++)m.push(st.m[a]);last=z;}
  if(!hit)return st;
  out+=st.s.slice(last);for(let i=last;i<=st.s.length;i++)m.push(st.m[i]);
  return {s:out,m:m};
}
const TP_L='\\p{L}';
const TP_FN=[/\[\d{1,4}\]|\{\d{1,4}\}/g,/(?<=[\p{L}.,;:!?»”)])(?:\d{1,3}|\*{1,3})(?=[\s.,;:!?»”)\]—–-]|$)/gu,/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g];
const TP_PG=/(^|\n)[ \t]*(?:[-–—]\s*)?(?:стр\.\s*)?\d{1,4}(?:\s*[-–—])?[ \t]*(?=\n|$)/g; /* строка из одного номера страницы */
/* порядковые: 1…30, мужской род */
const TP_U=['','первый','второй','третий','четвёртый','пятый','шестой','седьмой','восьмой','девятый'];
const TP_T=['десятый','одиннадцатый','двенадцатый','тринадцатый','четырнадцатый','пятнадцатый','шестнадцатый','семнадцатый','восемнадцатый','девятнадцатый'];
function tpOrd(n,cs){ /* cs: nom gen dat ins pre fem */
  if(!(n>=1&&n<=30))return '';
  const w=n<10?TP_U[n]:n<20?TP_T[n-10]:n===20?'двадцатый':n===30?'тридцатый':'двадцать '+TP_U[n-20];
  const p=w.split(' '),l=p.pop();let r;
  if(l==='третий')r={nom:'третий',gen:'третьего',dat:'третьему',ins:'третьим',pre:'третьем',fem:'третья'}[cs];
  else{const st=l.slice(0,-2);r=st+({nom:l.slice(-2),gen:'ого',dat:'ому',ins:l.slice(-2)==='ой'?'ым':'ым',pre:'ом',fem:'ая'}[cs]);}
  return p.concat([r]).join(' ');
}
function tpRoman(s){const v={I:1,V:5,X:10,L:50,C:100};let n=0;s=String(s).toUpperCase();if(!/^(?:X{0,3})(?:IX|IV|V?I{0,3})$/.test(s)||!s)return 0;
  for(let i=0;i<s.length;i++){const a=v[s[i]],b=v[s[i+1]]||0;n+=a<b?-a:a;}return n;}
function tpCap(src,r){return /^\p{Lu}/u.test(src)?r.charAt(0).toUpperCase()+r.slice(1):r;}
/* после сокращения в конце предложения точку оставляем */
function tpDot(s,z){const t=s.slice(z).match(/^\s*(.)/);return !t||t[1]==='\n'||/\p{Lu}/u.test(t[1])?'.':'';}
const TP_ABBR=[['до\\s+н\\.\\s?э\\.','до нашей эры'],['н\\.\\s?э\\.','нашей эры'],['т\\.\\s?е\\.','то есть'],['т\\.\\s?д\\.','так далее'],['т\\.\\s?п\\.','тому подобное'],['т\\.\\s?к\\.','так как'],['т\\.\\s?н\\.','так называемый'],['т\\.\\s?ч\\.','том числе'],
  ['и\\s+др\\.','и другие'],['и\\s+пр\\.','и прочее'],['напр\\.','например'],['(?<!\\d\\s?)см\\.','смотри'],['ср\\.','сравни'],['г-жа','госпожа'],['г-на','господина'],['г-ну','господину'],['г-н','господин'],
  ['тыс\\.','тысяч'],['млн\\.?','миллионов'],['млрд\\.?','миллиардов'],['руб\\.','рублей'],['коп\\.','копеек'],['стр\\.','страница'],['им\\.','имени'],['ул\\.','улица'],['проф\\.','профессор'],
  ['акад\\.','академик'],['св\\.','святой'],['гл\\.','глава'],['прим\\.','примечание'],['пер\\.','перевод'],['ред\\.','редакция'],['изд\\.','издание']].map(function(x){return [new RegExp('(?<!\\p{L})'+x[0]+'(?!\\p{L})','giu'),x[1]];});
const TP_CASE={век:'nom',века:'gen',веке:'pre',веку:'dat',веком:'ins'};
function tpAbbr(st){
  /* века: «в XIX в.» → «в девятнадцатом веке», «XIX в.» → «девятнадцатый век», «XVIII–XIX вв.», «XIX века» */
  st=tpRun(st,/(?<!\p{L})(в|во|о|об)\s+([IVX]{1,6})\s*в\.(?!\p{L})/giu,function(x,s,a,z){const n=tpRoman(x[2]);return n?x[1]+' '+tpOrd(n,'pre')+' веке'+tpDot(s,z):null;});
  st=tpRun(st,/(?<!\p{L})([IVX]{1,6})\s*[–—-]\s*([IVX]{1,6})\s*вв\.(?!\p{L})/gu,function(x,s,a,z){const n=tpRoman(x[1]),k=tpRoman(x[2]);return n&&k?tpOrd(n,'nom')+' — '+tpOrd(k,'nom')+' века'+tpDot(s,z):null;});
  st=tpRun(st,/(?<!\p{L})([IVX]{1,6})\s*в\.(?!\p{L})/gu,function(x,s,a,z){const n=tpRoman(x[1]);return n?tpOrd(n,'nom')+' век'+tpDot(s,z):null;});
  st=tpRun(st,/(?<!\p{L})([IVX]{1,6})\s+(век|века|веке|веку|веком)(?!\p{L})/gu,function(x){const n=tpRoman(x[1]);return n?tpOrd(n,TP_CASE[x[2]])+' '+x[2]:null;});
  /* «Глава XII» → «Глава двенадцатая», «Том II» → «Том второй» */
  st=tpRun(st,/(?<!\p{L})(глава|часть|книга|том)\s+([IVX]{1,6})(?![\p{L}\d])/giu,function(x){const n=tpRoman(x[2]);if(!n)return null;return x[1]+' '+tpOrd(n,/^том$/i.test(x[1])?'nom':'fem');});
  /* годы: «в 1812 г.» → «в 1812 году», «1812 г.» → «1812 год», «в 1920-х гг.» не трогаем */
  st=tpRun(st,/(?<!\p{L})(в\s+)?(\d{3,4})\s*гг?\.(?!\p{L})/gu,function(x,s,a,z){const pl=/гг\./.test(x[0]);return (x[1]||'')+x[2]+' '+(x[1]?(pl?'годах':'году'):(pl?'годы':'год'))+tpDot(s,z);});
  TP_ABBR.forEach(function(r){st=tpRun(st,r[0],function(x,s,a,z){return tpCap(x[0],r[1])+(/\.$/.test(x[0])?tpDot(s,z):'');});});
  return st;
}
/* ё в частых словах, где без неё не бывает (неоднозначные «все/всё», «небо/нёбо» не трогаем) */
const TP_YO=('её ещё идёт идём идёте пришёл ушёл нашёл шёл вошёл подошёл прошёл зашёл перешёл отошёл нёс вёл вёз лёд мёд пёс ёж ёлка ёлки ёлку ёжик ребёнок ребёнка ребёнку ребёнком '+
  'зелёный зелёная зелёное зелёные зелёных зелёную тёмный тёмная тёмное тёмные тёмных тёмную тёплый тёплая тёплое тёплые тёплых лёгкий лёгкая лёгкое лёгкие лёгких лёгкую чёрный чёрная чёрное чёрные чёрных чёрную '+
  'жёлтый жёлтая жёлтое жёлтые жёлтых твёрдый твёрдо твёрдая мёртвый мёртвая мёртвые мёртвых учёный учёные учёного учёных звёзды звёзд звёздное звёздный слёзы слёз берёза берёзы берёзу костёр костра вперёд '+
  'четвёртый четвёртая четвёртого жёсткий жёстко щёки щёку лёг тётя тёти тётю тётей тётушка Пётр Фёдор Фёдора Фёдору Фёдоровна Фёдорович Семён Семёна Алёна Алёша Алёши Лёша Лёва Лёня Артём Артёма '+
  'счёт счёта отчёт расчёт учёт пчёлы пчёл чёлка шёпот шёпотом шёлк шёлковый жёны жён сёстры сестёр сёла озёра озёр вёсла объём подъём приём приёма приёмы встаёт даёт даёте поёт поёте пьёт пьёте льёт бьёт бьёте '+
  'живёт живёте ведёт ведёте несёт несёте везёт ждёт ждёте зовёт зовёте врёт берёт берёте плывёт растёт сдаётся встаём даём поём живём ведём несём ждём зовём берём плывём моё твоё своё нём трёх трём четырёх четырём '+
  'далёкий далёкая далёкое далёко ёлочка серьёзный серьёзно серьёзная серьёзные заём котёнок котёнка ружьё бельё жильё копьё питьё моём твоём своём чьё манёвр актёр актёры актёра шофёр шофёра режиссёр режиссёра '+
  'партнёр партнёра лётчик лётчика клён клёна пёстрый тёща свёкор свёкла сёмга бёдра осётр зёрна пелёнки расчёска причёска щёлк щёлкнул жёлудь ёмкость ещё').split(' ');
const TP_YOM=new Map();TP_YO.forEach(function(w){TP_YOM.set(w.toLowerCase().replace(/ё/g,'е'),w.toLowerCase());});
function tpYo(st){return tpRun(st,/[\p{L}]+/gu,function(x){const w=x[0];if(w.indexOf('е')<0&&w.indexOf('Е')<0)return null;const y=TP_YOM.get(w.toLowerCase());if(!y)return null;
  let r='';for(let i=0;i<w.length;i++){const c=w[i];r+=y[i]==='ё'&&(c==='е'||c==='Е')?(c==='Е'?'Ё':'ё'):c;}return r===w?null:r;});}
/* свой словарь: целые слова без учёта регистра; «+» перед гласной — ударение */
function tpStress(s){return String(s).replace(/\+([аеёиоуыэюяaeiouy])/gi,function(m,v){return v+'́';});}
let TP_DRE=null,TP_DKEY='';
function tpDict(st){
  const d=tpS().dict;if(!d.length)return st;const key=JSON.stringify(d);
  if(key!==TP_DKEY){TP_DKEY=key;const m=new Map();d.forEach(function(x){m.set(x[0].toLowerCase(),tpStress(x[1]));});
    const esc=function(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');};
    TP_DRE={m:m,re:new RegExp('(?<![\\p{L}\\p{N}])(?:'+d.map(function(x){return esc(x[0]);}).sort(function(a,b){return b.length-a.length;}).join('|')+')(?![\\p{L}\\p{N}])','giu')};}
  return tpRun(st,TP_DRE.re,function(x){const r=TP_DRE.m.get(x[0].toLowerCase());return r?tpCap(x[0],r):null;});
}
function tpClean(st){
  st=tpRun(st,/­/g,function(){return '';});
  TP_FN.forEach(function(re){st=tpRun(st,re,function(){return '';});});
  return tpRun(st,TP_PG,function(x){return x[1];});
}
function tpPrep(t){
  t=String(t||'');const c=tpS(),k=(c.clean?1:0)+(c.yo?2:0)+'|'+TP_DKEY.length+'|'+t;
  if(TP.prep.has(k))return TP.prep.get(k);
  const m=new Array(t.length+1);for(let i=0;i<=t.length;i++)m[i]=i;
  let st={s:t,m:m};
  if(c.clean)st=tpClean(st);
  st=tpDict(st);
  if(c.clean)st=tpAbbr(st);
  if(c.yo)st=tpYo(st);
  TP.prep.set(k,st);while(TP.prep.size>6)TP.prep.delete(TP.prep.keys().next().value);
  return st;
}

/* ---------- 6: иностранные фразы ---------- */
const TP_LAT=/[A-Za-zÀ-ÖØ-öø-ÿŒœ][A-Za-zÀ-ÖØ-öø-ÿŒœ'’]*(?:[ \t,;:!?.\-–—"«»“”„()]+[A-Za-zÀ-ÖØ-öø-ÿŒœ][A-Za-zÀ-ÖØ-öø-ÿŒœ'’]*)*/g;
const TP_LW={
  fr:/^(le|la|les|des|du|une|un|est|et|je|vous|nous|pas|que|qui|mon|ma|mes|ce|cette|avec|pour|dans|sur|mais|oui|non|bien|merci|monsieur|madame|c'est|n'est|j'ai|il|elle|au|aux|tout|très|mon|sont|suis|ou|comme|plus)$/,
  de:/^(der|die|das|und|ist|nicht|ich|sie|wir|ein|eine|mit|auf|für|zu|den|dem|des|von|aber|ja|nein|gut|herr|frau|mein|es|so|wie|was|noch|auch|sich|bin|hast|haben|wird)$/,
  it:/^(il|lo|gli|della|che|non|sono|per|una|questo|come|bene|signore|grazie|mio|mia|di|del|ma|anche|molto|io|tu|lui|lei|ciao|buona|sera)$/,
  es:/^(el|los|las|que|por|con|una|pero|señor|gracias|muy|sí|como|está|yo|usted|para|del|hola|buenos|días|bueno|nada|todo)$/,
  en:/^(the|and|is|are|was|were|you|i|of|to|in|it|that|he|she|we|they|not|have|has|be|my|your|what|with|for|this|on|at|do|yes|no|my|me|good|well|sir)$/
};
function tpGuess(run){
  const w=run.toLowerCase().match(/[a-zà-öø-ÿœ']+/g)||[],sc={fr:0,de:0,it:0,es:0,en:0};
  w.forEach(function(x){Object.keys(TP_LW).forEach(function(k){if(TP_LW[k].test(x))sc[k]+=2;});});
  if(/[äöüß]/i.test(run))sc.de+=3;if(/[ñ¿¡]/i.test(run))sc.es+=3;if(/[çœêâîôûëïÿ]|[a-z]'[aeiouyh]/i.test(run))sc.fr+=3;if(/[èéàù]/i.test(run)){sc.fr+=1;sc.it+=1;}if(/[ìò]/i.test(run))sc.it+=2;
  let best='en',bv=0;Object.keys(sc).forEach(function(k){if(sc[k]>bv){bv=sc[k];best=k;}});return best;
}
let TP_VC=null;
function tpVoiceFor(lang){
  if(!window.speechSynthesis)return null;let vs=[];try{vs=speechSynthesis.getVoices()||[];}catch(e){}
  if(!TP_VC||TP_VC.n!==vs.length)TP_VC={n:vs.length,m:{}};
  if(lang in TP_VC.m)return TP_VC.m[lang];
  const own=vs.filter(function(v){return String(v.lang||'').toLowerCase().replace('_','-').indexOf(lang)===0;});
  const pref={en:['en-gb','en-us'],fr:['fr-fr'],de:['de-de'],it:['it-it'],es:['es-es']}[lang]||[];
  own.sort(function(a,b){const ia=pref.indexOf(String(a.lang).toLowerCase()),ib=pref.indexOf(String(b.lang).toLowerCase());return (ia<0?9:ia)-(ib<0?9:ib)||(b.localService?1:0)-(a.localService?1:0);});
  return (TP_VC.m[lang]=own[0]||null);
}
function tpLangOn(){if(!tpS().lang||!window.speechSynthesis)return false;if(!nttsOn())return true;const p=nttsCfg().prov;return p==='piper'||p==='yandex'||p==='google';}
/** pieces of s[a,z): [{a,z,lang}] — lang '' = the book's voice */
function tpLangSplit(s,a,z){
  const out=[];if(!tpLangOn())return [{a:a,z:z,lang:''}];
  const part=s.slice(a,z),letters=(part.match(/\p{L}/gu)||[]).length;TP_LAT.lastIndex=0;let x,k=0;
  while((x=TP_LAT.exec(part))){let r=x[0].replace(/[\s,;:\-–—"«»“”„(]+$/,'');const ra=x.index,rz=ra+r.length;
    const lw=(r.match(/[A-Za-zÀ-ÖØ-öø-ÿŒœ]+/g)||[]),ln=lw.join('').length;
    if(lw.every(function(w){return /^[IVXLCDM]+$/.test(w);}))continue;
    const all=ln>=letters*0.9;if(!all&&!(lw.length>=2||ln>=8))continue;
    const lang=tpGuess(r);if(!tpVoiceFor(lang))continue;
    if(ra>k)out.push({a:a+k,z:a+ra,lang:''});out.push({a:a+ra,z:a+rz,lang:lang});k=rz;}
  if(!out.length)return [{a:a,z:z,lang:''}];
  if(k<part.length)out.push({a:a+k,z:z,lang:''});
  return out.filter(function(p){return /[\p{L}\p{N}]/u.test(s.slice(p.a,p.z));});
}
function tpSysSay(t,lang,onend,onstart,onpos){
  const v=tpVoiceFor(lang);let done=false,started=false;const fin=function(){if(done)return;done=true;onend();};
  try{const u=new SpeechSynthesisUtterance(t);u.lang=v?v.lang:lang;if(v)try{u.voice=v;}catch(e){}u.rate=rqRx().tts.rate;
    u.onstart=function(){started=true;onstart();};u.onboundary=function(e){if(!started){started=true;onstart();}if(typeof e.charIndex==='number')onpos(e.charIndex);};
    u.onend=fin;u.onerror=function(e){const k=e&&e.error;if(k==='interrupted'||k==='canceled')return;fin();};speechSynthesis.speak(u);}
  catch(e){setTimeout(fin,0);}
}

/* ---------- 5: куски с паузами между абзацами и главами ---------- */
const TP_GAP={off:[0,0],s:[200,700],m:[450,1200],l:[800,2000]};
const TP_HEAD=/^\s*(глава|часть|книга|том|chapter|part|пролог|эпилог|prologue|epilogue|[IVXLC]{1,7}\.?|\d{1,3}\.?)(?![\p{L}])/iu;
function tpPlan(s){
  const c=tpS(),g=TP_GAP[c.pause]||TP_GAP.m,rate=Math.max(0.5,rqRx().tts.rate),paras=[];
  if(c.pause==='off')paras.push({a:0,z:s.length,gap:0});
  else{let a=0;const re=/\n+/g;let x;while((x=re.exec(s))){const z=x.index+x[0].length;paras.push({a:a,z:z,gap:x[0].length>2||TP_HEAD.test(s.slice(z,z+40))?g[1]:g[0]});a=z;}
    if(a<s.length)paras.push({a:a,z:s.length,gap:0});}
  const out=[];
  paras.forEach(function(p){
    if(!/[\p{L}\p{N}]/u.test(s.slice(p.a,p.z))){const l=out[out.length-1];if(l)l.gap=Math.max(l.gap,Math.round(p.gap/rate));return;} /* «* * *» не читаем, только пауза */
    const parts=tpLangSplit(s,p.a,p.z);parts.forEach(function(q,i){out.push({a:q.a,z:q.z,lang:q.lang,gap:i===parts.length-1?Math.round(p.gap/rate):0});});});
  return out;
}
function tpFirst(t){const P=tpPrep(t),pl=tpPlan(P.s).find(function(x){return !x.lang;});return pl?P.s.slice(pl.a,pl.z):'';}
{const s0=ttsSay;ttsSay=function(t,onend,onstart,onpos,next){
  const g=TP.gen,P=tpPrep(t),plan=tpPlan(P.s);
  const live=function(){return g===TP.gen&&typeof ttsOn!=='undefined'&&ttsOn;};
  if(!plan.length){setTimeout(function(){if(!live())return;if(onstart)onstart();if(onend)onend();},30);return;}
  const nx=next?tpFirst(next):'',map=function(ci){return P.m[Math.max(0,Math.min(P.m.length-1,ci))];};
  let i=0;
  const step=function(){
    if(g!==TP.gen||(i>0&&!live()))return;if(i>=plan.length){if(onend)onend();return;} /* the first piece is said as before, even outside «Слушать» (a sample) */
    const sg=plan[i],first=i===0,txt=P.s.slice(sg.a,sg.z);
    const st=function(){if(!live())return;if(first){if(onstart)onstart();}else if(onpos)onpos(map(sg.a));};
    const ps=function(ci){if(live()&&onpos)onpos(map(sg.a+ci));};
    const en=function(){if(!live())return;i++;if(sg.gap)setTimeout(step,sg.gap);else step();};
    if(sg.lang)tpSysSay(txt,sg.lang,en,st,ps);
    else{const nn=plan.slice(i+1).find(function(x){return !x.lang;});s0(txt,en,st,ps,nn?P.s.slice(nn.a,nn.z):nx);}
  };
  step();
};}

/* ---------- 1: Piper ---------- */
const PIPER={ort:'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/',ph:'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize',
  hf:'https://huggingface.co/diffusionstudio/piper-voices/resolve/main/ru/ru_RU/',
  voices:{irina:'Ирина',dmitri:'Дмитрий',denis:'Денис',ruslan:'Руслан'},eng:30.2e6,voice:63.2e6};
const PIP={have:{},eng:false,w:null,wv:'',init:null,seq:0,cb:new Map(),busy:'',prog:'',urls:null};
const PIP_CACHE=TP_NS+'_piper';
function pipVoice(v){return PIPER.voices[v]?v:'irina';}
function pipEngFiles(){return [PIPER.ort+'ort.wasm.min.js',PIPER.ort+'ort-wasm-simd.wasm',PIPER.ph+'.js',PIPER.ph+'.wasm',PIPER.ph+'.data'];}
function pipVoiceFiles(v){const n='ru_RU-'+v+'-medium.onnx',b=PIPER.hf+v+'/medium/'+n;return [b,b+'.json'];}
function pipOk(){return typeof WebAssembly==='object'&&typeof Worker==='function'&&typeof caches==='object';}
async function pipScan(){
  if(!pipOk())return;try{const c=await caches.open(PIP_CACHE),keys=new Set((await c.keys()).map(function(r){return r.url;}));
    PIP.eng=pipEngFiles().every(function(u){return keys.has(u);});
    Object.keys(PIPER.voices).forEach(function(v){PIP.have[v]=PIP.eng&&pipVoiceFiles(v).every(function(u){return keys.has(u);});});}catch(e){}
  try{renderTtsSet();}catch(e){}
}
async function pipFetch(c,url,prog){
  const r=await fetch(url,{mode:'cors',credentials:'omit'});if(!r.ok)throw new Error('сервер ответил '+r.status);
  const total=+(r.headers.get('Content-Length')||0),rd=r.body&&r.body.getReader?r.body.getReader():null;let got=0;const parts=[];
  if(rd){for(;;){const x=await rd.read();if(x.done)break;parts.push(x.value);got+=x.value.length;if(prog)prog(got,total);}}else{parts.push(new Uint8Array(await r.arrayBuffer()));}
  const type=/\.wasm$/.test(url)?'application/wasm':/\.js$/.test(url)?'text/javascript':/\.json$/.test(url)?'application/json':'application/octet-stream';
  const b=new Blob(parts,{type:type});await c.put(url,new Response(b,{headers:{'Content-Type':type,'Content-Length':String(b.size)}}));return b;
}
/** скачать движок (если ещё нет) и голос v; prog(текст) */
async function pipDownload(v,prog){
  v=pipVoice(v);if(!pipOk())throw new Error('этот браузер не умеет нейроголос');if(navigator.onLine===false)throw new Error('нет интернета');
  const c=await caches.open(PIP_CACHE),keys=new Set((await c.keys()).map(function(r){return r.url;}));
  const need=pipEngFiles().concat(pipVoiceFiles(v)).filter(function(u){return !keys.has(u);});
  const est={};need.forEach(function(u){est[u]=/simd\.wasm$/.test(u)?10.6e6:/\.data$/.test(u)?18.1e6:/\.onnx$/.test(u)?63.2e6:/phonemize\.wasm$/.test(u)?0.64e6:0.15e6;});
  const all=need.reduce(function(s,u){return s+est[u];},0);let done=0;
  for(const u of need){await pipFetch(c,u,function(g,t){if(t)est[u]=t;if(prog)prog(done+g,Math.max(all,done+(t||est[u])));});done+=est[u];}
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
  PIP.eng=true;PIP.have[v]=true;
}
async function pipRemove(){try{await caches.delete(PIP_CACHE);}catch(e){}PIP.have={};PIP.eng=false;if(PIP.w){try{PIP.w.terminate();}catch(e){}}PIP.w=null;PIP.wv='';PIP.init=null;}
async function pipSize(){try{const c=await caches.open(PIP_CACHE);let n=0;for(const r of await c.keys()){const m=await c.match(r);n+=+(m.headers.get('Content-Length')||0);}return n;}catch(e){return 0;}}
/* поток синтеза: phonemize (espeak-ng) → onnx → PCM 16 бит */
const PIP_WORKER="let _o=null,_s=null,_c=null,_m=null,_out='',_ph=null,_k=1;"+
"self.onmessage=async function(e){const d=e.data;try{"+
" if(d.t==='init'){if(!self.ort)importScripts(d.ortJs);_o=self.ort;_o.env.wasm.numThreads=1;_o.env.wasm.proxy=false;_o.env.wasm.wasmPaths={'ort-wasm-simd.wasm':d.ortWasm,'ort-wasm.wasm':d.ortWasm};"+
"  if(!self.createPiperPhonemize)importScripts(d.phJs);_ph={wasm:d.phWasm,data:d.phData};_c=d.cfg;_s=await _o.InferenceSession.create(d.model,{executionProviders:['wasm']});postMessage({t:'ok',id:d.id});return;}"+
" if(d.t==='say'){_k=d.k||1;const pcm=await say(d.text);postMessage({t:'pcm',id:d.id,pcm:pcm,sr:_c.audio.sample_rate},[pcm.buffer]);}"+
"}catch(err){postMessage({t:'err',id:d.id,msg:String(err&&err.message||err)});}};"+
"async function mk(){return createPiperPhonemize({print:function(s){_out=s;},printErr:function(){},locateFile:function(u){return /\\.wasm$/.test(u)?_ph.wasm:/\\.data$/.test(u)?_ph.data:u;}});}"+
"async function ids(text,again){if(!_m)_m=await mk();_out='';let bad=false;try{_m.callMain(['-l',_c.espeak.voice,'--input',JSON.stringify([{text:text}]),'--espeak_data','/espeak-ng-data']);}catch(e){bad=true;}"+
" if(bad)_m=null;if(!_out){_m=null;if(!again)return ids(text,true);return [];}return JSON.parse(_out).phoneme_ids||[];}"+
"function split(t){t=t.trim();if(t.length<=400)return t?[t]:[];const s=t.match(/[^.!?…\\n]+[.!?…]*\\s*/g)||[t],r=[];let c='';s.forEach(function(x){if((c+x).length>400&&c){r.push(c);c='';}c+=x;if(c.length>400){r.push(c);c='';}});if(c.trim())r.push(c);return r;}"+
"async function say(text){const sr=_c.audio.sample_rate,pc=[];let n=0;for(const p of split(text)){const id=await ids(p);if(!id.length)continue;"+
" const f={input:new _o.Tensor('int64',BigInt64Array.from(id.map(BigInt)),[1,id.length]),input_lengths:new _o.Tensor('int64',BigInt64Array.from([BigInt(id.length)]),[1]),"+
" scales:new _o.Tensor('float32',Float32Array.from([_c.inference.noise_scale*_k,_c.inference.length_scale,_c.inference.noise_w*_k]),[3])};"+
" if(_c.speaker_id_map&&Object.keys(_c.speaker_id_map).length)f.sid=new _o.Tensor('int64',BigInt64Array.from([0n]),[1]);"+
" const r=await _s.run(f),a=r.output.data;pc.push(a);n+=a.length;const g=new Float32Array(Math.round(sr*0.06));pc.push(g);n+=g.length;}"+
" const o=new Int16Array(n);let k=0;pc.forEach(function(a){for(let i=0;i<a.length;i++){const v=a[i];o[k++]=v>=1?32767:v<=-1?-32768:(v*32767)|0;}});return o;}";
function pipWav(pcm,sr){const h=new DataView(new ArrayBuffer(44)),n=pcm.length*2;
  [[0,0x52494646],[8,0x57415645],[12,0x666d7420],[36,0x64617461]].forEach(function(x){h.setUint32(x[0],x[1],false);});
  h.setUint32(4,36+n,true);h.setUint32(16,16,true);h.setUint16(20,1,true);h.setUint16(22,1,true);h.setUint32(24,sr,true);h.setUint32(28,sr*2,true);h.setUint16(32,2,true);h.setUint16(34,16,true);h.setUint32(40,n,true);
  return new Blob([h.buffer,pcm.buffer],{type:'audio/wav'});}
function pipCall(msg,tr){return new Promise(function(res,rej){const id=++PIP.seq;msg.id=id;PIP.cb.set(id,[res,rej]);PIP.w.postMessage(msg,tr||[]);});}
async function pipStart(v){
  v=pipVoice(v);if(PIP.w&&PIP.wv===v&&PIP.init)return PIP.init;
  if(PIP.w){try{PIP.w.terminate();}catch(e){}PIP.cb.forEach(function(c){c[1](new Error('голос сменился'));});PIP.cb.clear();}
  PIP.wv=v;PIP.init=(async function(){
    if(!PIP.have[v])throw new Error('голос ещё не скачан: «Нейросети → Озвучка → Скачать»');
    const c=await caches.open(PIP_CACHE),get=async function(u){const m=await c.match(u);if(!m)throw new Error('файл голоса потерялся, скачайте ещё раз');return m.blob();};
    const f=pipEngFiles(),vf=pipVoiceFiles(v);
    if(!PIP.urls){PIP.urls={};for(const u of f){const b=await get(u);PIP.urls[u]=URL.createObjectURL(/\.wasm$/.test(u)?new Blob([b],{type:'application/wasm'}):b);}}
    const cfg=JSON.parse(await (await get(vf[1])).text()),model=await (await get(vf[0])).arrayBuffer();
    PIP.w=new Worker(URL.createObjectURL(new Blob([PIP_WORKER],{type:'text/javascript'})));
    PIP.w.onmessage=function(e){const d=e.data,cb=PIP.cb.get(d.id);if(!cb)return;PIP.cb.delete(d.id);if(d.t==='err')cb[1](new Error(d.msg));else cb[0](d);};
    PIP.w.onerror=function(e){PIP.cb.forEach(function(cb){cb[1](new Error('нейроголос не запустился'));});PIP.cb.clear();PIP.init=null;};
    await pipCall({t:'init',ortJs:PIP.urls[f[0]],ortWasm:PIP.urls[f[1]],phJs:PIP.urls[f[2]],phWasm:PIP.urls[f[3]],phData:PIP.urls[f[4]],cfg:cfg,model:model},[model]);
  })();
  PIP.init.catch(function(){PIP.init=null;});
  return PIP.init;
}
/** text → wav Blob голосом Piper */
async function pipSay(text,v){await pipStart(v);const d=await pipCall({t:'say',text:String(text),k:({calm:0.55,norm:1,live:1.35})[tpS().expr]||1});if(!d.pcm||!d.pcm.length)throw new Error('пустой звук');return pipWav(d.pcm,d.sr);}

/* Piper — ещё один сервис озвучки, вторым после «Телефона» */
(function(){const all=Object.assign({},TTS_PROV);Object.keys(TTS_PROV).forEach(function(k){delete TTS_PROV[k];});
  Object.keys(all).forEach(function(k){TTS_PROV[k]=all[k];if(k==='system')TTS_PROV.piper={name:'Нейроголос',voice:'irina',voices:'Ирина, Дмитрий, Денис, Руслан',tag:'бесплатно'};});})();
{const o0=nttsOn;nttsOn=function(){try{const t=S.tts||{};if(t.prov==='piper')return pipOk()&&!!PIP.have[pipVoice(t.voice)];}catch(e){return false;}return o0.apply(this,arguments);};}
{const c0=nttsCfg;nttsCfg=function(){if(TP.force)return Object.assign({},TP.force);const c=c0.apply(this,arguments);if(c.prov==='piper'){c.voice=pipVoice(c.voice);c.key='';}return c;};}

/* ---------- 7: что уже озвучено нейроголосом — хранится; глава вперёд ---------- */
const TPC_CACHE=TP_NS+'_ttsc',TPC_MAX=240;
function tpHash(s){let h1=0x811c9dc5,h2=0x01000193;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,16777619);h2=Math.imul(h2^c,2246822519)+i;}return (h1>>>0).toString(16)+(h2>>>0).toString(16);}
function tpCKey(c,t){const o=tpS();return './__tts/'+tpHash(c.prov+'|'+c.voice+'|'+c.base+'|'+(c.prov==='openai'||c.prov==='elevenlabs'||c.prov==='yandex'?o.expr+'|'+o.style+'|':'')+t)+'.a';}
async function tpCGet(k){try{const c=await caches.open(TPC_CACHE),m=await c.match(k);return m?await m.blob():null;}catch(e){return null;}}
async function tpCPut(k,b){try{const c=await caches.open(TPC_CACHE);await c.put(k,new Response(b,{headers:{'Content-Type':b.type||'audio/mpeg','Content-Length':String(b.size)}}));
  const ks=await c.keys();for(let i=0;i<ks.length-TPC_MAX;i++)await c.delete(ks[i]);}catch(e){}}
async function tpCSize(){try{const c=await caches.open(TPC_CACHE);let n=0,k=0;for(const r of await c.keys()){const m=await c.match(r);n+=+(m.headers.get('Content-Length')||0);k++;}return [n,k];}catch(e){return [0,0];}}
{const f0=nttsFetch;nttsFetch=function(text){
  const c=nttsCfg();
  if(c.prov==='piper')return pipSay(text,c.voice);
  if(!tpS().pre)return f0.apply(this,arguments);
  const k=tpCKey(c,String(text));if(TP.fly.has(k))return TP.fly.get(k);
  const self=this,args=arguments;
  const p=(async function(){const hit=await tpCGet(k);if(hit&&hit.size)return hit;
    TP.force=c;let q;try{q=f0.apply(self,args);}finally{TP.force=null;} /* the voice of this moment (roles change it for a breath) */
    const b=await q;tpCPut(k,b);return b;})();
  TP.fly.set(k,p);p.then(function(){TP.fly.delete(k);},function(){TP.fly.delete(k);});return p;};}
/* куски кончаются на конце абзаца: после «назад» абзацы те же, и сохранённая озвучка снова подходит */
{const c0=ttsChunkEnd;ttsChunkEnd=function(text,st){const e=c0.apply(this,arguments);if(e>=text.length)return e;const k=text.lastIndexOf('\n',e-1);return k>st+200?k+1:e;};}
/** the texts a chunk sends to the voice service, with the voice of each (roles) */
function tpTexts(chunk,cb){
  const P=tpPrep(chunk);tpPlan(P.s).forEach(function(sg){if(sg.lang)return;const t=P.s.slice(sg.a,sg.z);
    const ro=typeof r2Rm==='function'?r2Rm().roles:null;
    if(ro&&ro.on&&ro.v&&/[—–"“«]/.test(t)&&typeof r2Segs==='function'){const segs=r2Segs(t);if(segs.some(function(x){return x.d;})){segs.forEach(function(x){cb(t.slice(x.a,x.z),x.d?ro.v:null);});return;}}
    cb(t,null);});
}
function tpPreWant(){return tpS().pre&&typeof ttsOn!=='undefined'&&ttsOn&&nttsOn()&&nttsCfg().prov!=='piper'&&R.book&&R.mode==='text'&&navigator.onLine!==false;}
const TP_AHEAD=12000;
function tpPreFill(){
  if(!tpPreWant())return;const b=R.book,t=b.text||'',pos=R.ttsPos||0;
  if(TP.pre.bid!==b.id||TP.pre.upTo<pos||TP.pre.upTo>pos+TP_AHEAD*2){TP.pre.bid=b.id;TP.pre.upTo=pos;TP.pre.q=[];}
  const nx=(typeof tocOf==='function'?tocOf(b)||[]:[]).filter(function(x){return typeof x.off==='number'&&x.off>pos+40;}).sort(function(a,c){return a.off-c.off;})[0];
  const lim=Math.min(t.length,pos+TP_AHEAD,nx?nx.off:t.length);
  let st=TP.pre.upTo;if(st===pos&&st<t.length)st=ttsChunkEnd(t,st); /* the chunk now playing is fetched by the reader itself */
  const noImg=function(x){return x.replace(/￼img:\d+/g,function(m){return ' '.repeat(m.length);});};
  while(st<lim){const e=ttsChunkEnd(t,st);tpTexts(noImg(t.slice(st,e)),function(x,v){TP.pre.q.push([x,v]);});st=e;}
  TP.pre.upTo=Math.max(TP.pre.upTo,st);tpPreRun();
}
async function tpPreRun(){
  if(TP.pre.run)return;TP.pre.run=true;
  try{while(tpPreWant()&&TP.pre.q.length){const j=TP.pre.q.shift();let p;
      const go=function(){p=nttsFetch(j[0]);};if(j[1]&&typeof r2With==='function')r2With(j[1],go);else go();
      try{await p;}catch(e){break;}}}
  finally{TP.pre.run=false;}
}

/* ---------- 4: где сейчас голос; назад / вперёд; «Читать отсюда» ---------- */
{const p0=ttsPageAt;ttsPageAt=function(pos){TP.pos=pos;return p0.apply(this,arguments);};}
{const n0=ttsTextNext;ttsTextNext=function(){
  if(typeof ttsOn!=='undefined'&&ttsOn&&R.book&&R.mode==='text'&&TP.fresh){TP.fresh=false;const t=R.book.text||'';
    if(TP.startAt>=0)R.ttsPos=Math.min(t.length,TP.startAt);
    else if(TP.stop&&TP.stop.bid===R.book.id&&R.pageCount>1&&Math.round(TP.stop.pos/Math.max(1,t.length)*(R.pageCount-1))===R.page)R.ttsPos=tpSent(t,TP.stop.pos); /* продолжить с того же предложения */
    else{const a=tpSent(t,R.ttsPos||0);if((R.ttsPos||0)-a<=300)R.ttsPos=a;else{let k=R.ttsPos||0;while(k<t.length&&/[\p{L}\p{N}]/u.test(t[k]))k++;R.ttsPos=k;}} /* не с середины слова: с начала предложения */
    TP.startAt=-1;}
  const r=n0.apply(this,arguments);try{tpPreFill();}catch(e){}return r;};}
{const s0=ttsStop;ttsStop=function(){if(typeof ttsOn!=='undefined'&&ttsOn&&R.book&&R.mode==='text'&&TP.pos>=0)TP.stop={bid:R.book.id,pos:TP.pos};
  TP.gen++;TP.pre.q=[];return s0.apply(this,arguments);};}
function tpSent(t,p){let a=Math.max(0,Math.min(p,t.length));while(a>0&&!/[.!?…\n]/.test(t[a-1]))a--;while(a<t.length&&/[\s»”")\]]/.test(t[a]))a++;return a;}
function tpSentEnd(t,p){let i=Math.max(0,p);while(i<t.length&&!/[.!?…\n]/.test(t[i]))i++;while(i<t.length&&/[.!?…»”")\]\s]/.test(t[i]))i++;return i;}
function tpParaStart(t,p){const i=t.lastIndexOf('\n',Math.max(0,p-1));return i<0?0:i+1;}
function tpRestart(fn){
  TP.gen++;ttsOn=false;try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}nttsHalt();
  const g=TP.gen;setTimeout(function(){if(g!==TP.gen||!R.book)return;ttsOn=true;fn();},120);
}
function tpJump(pos){
  if(typeof ttsOn==='undefined'||!ttsOn||!R.book)return;
  if(R.mode==='pdf')return;const t=R.book.text||'';pos=Math.max(0,Math.min(t.length,pos));
  TP.pos=pos;TP.pre.upTo=0;
  if(rqRx().tts.follow&&R.pageCount>1){const np=Math.round(pos/Math.max(1,t.length)*(R.pageCount-1));if(np!==R.page){R.ttsAdv=true;try{goPage(np,false);}finally{R.ttsAdv=false;}}}
  tpRestart(function(){R.ttsPos=pos;ttsTextNext();});
}
function tpPdfStep(d){const n=R.page+d;if(n<0||n>=R.pageCount)return;tpRestart(function(){pdfGo(n,'tts');setTimeout(ttsPdfNext,120);});}
function tpCur(){return TP.pos>=0?TP.pos:(R.ttsPos||0);}
function tpBack(kind){
  if(typeof ttsOn==='undefined'||!ttsOn||!R.book)return;if(R.mode==='pdf'){tpPdfStep(-1);return;}
  const t=R.book.text||'',p=tpCur();let a;
  if(kind==='p'){a=tpParaStart(t,p);if(p-a<15)a=tpParaStart(t,Math.max(0,a-1));}
  else{a=tpSent(t,p);if(p-a<12)a=tpSent(t,Math.max(0,a-2));}
  tpJump(a);
}
function tpFwd(kind){
  if(typeof ttsOn==='undefined'||!ttsOn||!R.book)return;if(R.mode==='pdf'){tpPdfStep(1);return;}
  const t=R.book.text||'',p=tpCur();let z;
  if(kind==='p'){z=t.indexOf('\n',p);z=z<0?t.length:z;while(z<t.length&&/\s/.test(t[z]))z++;}
  else z=tpSentEnd(t,p+1);
  if(z>=t.length){flashMsg('Это конец книги');return;}
  tpJump(z);
}
/** a point in the shown text (DOM node + offset) → the sentence start in R.book.text */
function tpOffAt(node,off){
  if(!R.book||R.mode!=='text'||typeof rmNodes!=='function')return -1;
  const T=rmNodes(),i=rmOffOf(T,node,off);if(i<0)return -1;
  const all=T.a.map(function(x){return x.n.nodeValue;}).join('');let a=i;
  while(a>0&&!/[.!?…\n]/.test(all[a-1])&&i-a<400)a--;while(a<all.length&&/[\s»”")\]]/.test(all[a]))a++;
  const probe=all.slice(a,a+48).replace(/\s+$/,'');if(probe.length<3)return -1;
  const t=R.book.text||'',guess=Math.floor(a/Math.max(1,T.len)*t.length);let best=-1,from=Math.max(0,guess-9000);
  for(;;){const k=t.indexOf(probe,from);if(k<0||k>guess+9000)break;if(best<0||Math.abs(k-guess)<Math.abs(best-guess))best=k;from=k+1;}
  if(best<0){const short=probe.slice(0,24);from=Math.max(0,guess-9000);for(;;){const k=t.indexOf(short,from);if(k<0||k>guess+9000)break;if(best<0||Math.abs(k-guess)<Math.abs(best-guess))best=k;from=k+1;}}
  return best;
}
/** start (or move) reading at text offset pos */
function tpReadFrom(pos){
  if(pos<0||!R.book)return;
  if(typeof ttsOn!=='undefined'&&ttsOn){tpJump(pos);return;}
  TP.startAt=pos;el('btnTts').click();setTimeout(function(){if(!ttsOn)TP.startAt=-1;},1500);
}

/* the bar over the text while a book is read aloud */
function tpBarSync(){
  const b=el('tpBar');if(!b)return;const on=typeof ttsOn!=='undefined'&&ttsOn&&tpS().bar&&!!R.book&&!el('reader').classList.contains('hidden');
  b.hidden=!on;if(!on){tpRatePop(false);return;}b.classList.toggle('pdf',R.mode==='pdf');
  const rb=document.querySelector('#reader .rbot'),off=el('reader').classList.contains('barsoff')||!rb?0:rb.getBoundingClientRect().height;
  b.style.bottom='calc('+Math.round(off+10)+'px + '+(off?'0px':'env(safe-area-inset-bottom,0px)')+')';
  el('tpPP').innerHTML=rqIcon(speaking||ttsOn?'pause':'play',24);el('tpRate').textContent=tpRateTxt(rqRx().tts.rate);if(!on)tpRatePop(false);
}
(function(){
  const rd=el('reader');if(!rd)return;
  rd.insertAdjacentHTML('beforeend','<div id="tpBar" role="toolbar" aria-label="Озвучка: назад и вперёд" hidden>'+
    '<button type="button" id="tpPB" aria-label="Назад на абзац" title="Назад на абзац">'+rqIcon('chevrons-left',22)+'</button>'+
    '<button type="button" id="tpSB" aria-label="Назад на предложение" title="Назад на предложение">'+rqIcon('chevron-left',24)+'</button>'+
    '<button type="button" id="tpPP" aria-label="Остановить озвучку" title="Остановить озвучку"></button>'+
    '<button type="button" id="tpRate" aria-label="Скорость голоса" aria-haspopup="true" title="Скорость голоса"></button>'+
    '<button type="button" id="tpSF" aria-label="Вперёд на предложение" title="Вперёд на предложение">'+rqIcon('chevron-right',24)+'</button>'+
    '<button type="button" id="tpPF" aria-label="Вперёд на абзац" title="Вперёд на абзац">'+rqIcon('chevrons-right',22)+'</button></div>'+
    '<div id="tpRatePop" role="dialog" aria-label="Скорость голоса" hidden></div>'+
    '<button type="button" id="tpHere" hidden>'+rqIcon('play',16)+'<span>Читать отсюда</span></button>');
  const b=el('tpBar');['pointerdown','click','touchstart','touchend'].forEach(function(t){b.addEventListener(t,function(e){e.stopPropagation();});el('tpRatePop').addEventListener(t,function(e){e.stopPropagation();});el('tpHere').addEventListener(t,function(e){e.stopPropagation();});});
  el('tpPB').onclick=function(){tpBack('p');};el('tpSB').onclick=function(){tpBack('s');};el('tpSF').onclick=function(){tpFwd('s');};el('tpPF').onclick=function(){tpFwd('p');};
  el('tpPP').onclick=function(){if(ttsOn)ttsStop();};
  el('tpRate').onclick=function(){tpRatePop(el('tpRatePop').hidden);};
  el('tpHere').onclick=function(){const p=TP.chip;tpChip(null);if(p!=null&&p>=0)tpReadFrom(p);};
  new MutationObserver(tpBarSync).observe(rd,{attributes:true,attributeFilter:['class']});
  addEventListener('resize',tpBarSync);
})();
function tpChip(at){
  const c=el('tpHere');if(!c)return;clearTimeout(TP.chipT);
  if(!at){c.hidden=true;TP.chip=null;return;}
  TP.chip=at.pos;c.hidden=false;const w=c.offsetWidth||150;
  c.style.left=Math.round(Math.max(8,Math.min(innerWidth-w-8,at.x-w/2)))+'px';c.style.top=Math.round(Math.max(60,Math.min(innerHeight-120,at.y+18)))+'px';
  TP.chipT=setTimeout(function(){tpChip(null);},4000);
}
/* while the voice reads: a tap in the middle of the text offers «Читать отсюда» (the tap still does its own thing) */
{const v0=viewerTap;viewerTap=function(cx,cy){
  const r=v0.apply(this,arguments);
  try{if(typeof ttsOn!=='undefined'&&ttsOn&&R.mode==='text'&&!selText()){const vr=el('viewer').getBoundingClientRect(),z=tapZone((cx-vr.left)/vr.width,(cy-vr.top)/vr.height);
    if(z==='c'){const rg=document.caretRangeFromPoint&&document.caretRangeFromPoint(cx,cy);
      if(rg&&rg.startContainer&&rg.startContainer.nodeType===3&&el('content').contains(rg.startContainer)){const p=tpOffAt(rg.startContainer,rg.startOffset);if(p>=0)tpChip({pos:p,x:cx,y:cy});}}}}catch(e){}
  return r;};}

/* ---------- 3: шторка и экран блокировки ---------- */
function tpSilent(){ /* 2 s of near-silence: keeps the page «playing» so the phone does not stop the voice with the screen off */
  if(TP.sil)return TP.sil;const sr=8000,n=sr*2,v=new DataView(new ArrayBuffer(44+n*2));
  [[0,0x52494646],[8,0x57415645],[12,0x666d7420],[36,0x64617461]].forEach(function(x){v.setUint32(x[0],x[1],false);});
  v.setUint32(4,36+n*2,true);v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++)v.setInt16(44+i*2,(i&1)?1:-1,true);
  const a=new Audio(URL.createObjectURL(new Blob([v.buffer],{type:'audio/wav'})));a.loop=true;a.volume=0.01;a.setAttribute('aria-hidden','true');return (TP.sil=a);
}
{const b0=ttsBtn;ttsBtn=function(on){
  if(on){TP.fresh=true;TP.gen++;}
  b0.apply(this,arguments);
  try{if(on&&!nttsOn()){const p=tpSilent().play();if(p&&p.catch)p.catch(function(){});}else if(TP.sil)TP.sil.pause();}catch(e){}
  try{if('mediaSession' in navigator){const ms=navigator.mediaSession,h=function(a,f){try{ms.setActionHandler(a,on?f:null);}catch(e){}};
    h('previoustrack',function(){tpBack('s');});h('nexttrack',function(){tpFwd('s');});
    h('seekbackward',function(){tpBack('p');});h('seekforward',function(){tpFwd('p');});}}catch(e){}
  if(!on)tpChip(null);tpBarSync();};}

/* ---------- 8: «Произнести» тем же голосом ---------- */
let TP_SAY=null;
async function tpSpeak(text,lang){
  text=String(text||'').replace(/\s+/g,' ').trim().slice(0,600);if(!text)return;
  if(typeof ttsOn!=='undefined'&&ttsOn){flashMsg('Сейчас читается книга');return;}
  if(lang&&lang!=='ru'){const v=tpVoiceFor(lang);try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=v?v.lang:lang;if(v)try{u.voice=v;}catch(e){}u.rate=rqRx().tts.rate;speechSynthesis.speak(u);}catch(e){}return;}
  const said=tpPrep(text).s;
  if(nttsOn()){
    try{if(TP_SAY)TP_SAY.pause();const b=await nttsFetch(said);TP_SAY=new Audio(URL.createObjectURL(b));try{TP_SAY.playbackRate=rqRx().tts.rate;}catch(e){}await TP_SAY.play();return;}
    catch(e){if(e&&e.name==='NotAllowedError')return;flashMsg('Нейроголос не ответил: '+((e&&e.message)||'ошибка')+'. Говорит голос телефона',{ms:3500});}
  }
  if(!window.speechSynthesis){flashMsg('Озвучка не поддерживается этим браузером');return;}
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(said);u.lang='ru-RU';const vs=ttsVoices(),x=rqRx().tts;if(vs.length)try{u.voice=vs.find(function(v){return v.voiceURI===x.voice;})||vs[0];}catch(e){}u.rate=x.rate;speechSynthesis.speak(u);}catch(e){}
}
if(typeof dkSay==='function'){dkSay=function(w,lang){tpSpeak(typeof dkPlain==='function'?dkPlain(w):w,lang==='en'?'en':'ru');};}
/* в меню выделения: короткое — «Произнести», длинное — «Слушать отсюда» */
function tpSelSay(){
  const t=typeof stText==='function'?stText():'';if(!t)return;
  if(stWords(t)<=4||R.mode!=='text'){tpSpeak(t,/[А-Яа-яЁё]/.test(t)?'ru':tpGuess(t));return;}
  const s=window.getSelection();if(!s||!s.rangeCount)return;const rg=s.getRangeAt(0),p=tpOffAt(rg.startContainer,rg.startOffset);
  if(p<0){flashMsg('Не нашёл это место в тексте');return;}
  try{s.removeAllRanges();if(typeof selUi==='function')selUi();}catch(e){}
  tpReadFrom(p);
}
if(typeof ST_ACT!=='undefined'){ST_ACT.say=tpSelSay;
  const m0=stMenu;stMenu=function(on){m0.apply(this,arguments);if(!on)return;const m=el('ssMenu');if(!m||m.hidden||m.querySelector('[data-a="say"]'))return;
    const t=typeof stText==='function'?stText():'';if(!t)return;const short=stWords(t)<=4||R.mode!=='text';
    const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.dataset.a='say';b.innerHTML=rqIcon(short?'volume-2':'play',18)+'<span>'+(short?'Произнести':'Слушать отсюда')+'</span>';
    const after=m.querySelector('[data-a="word"]');if(after&&after.nextSibling)m.insertBefore(b,after.nextSibling);else m.insertBefore(b,m.firstChild);
    if(typeof stBranch==='function'){stBranch(m,el('ssMore'));const r=m.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight){b.remove();stBranch(m,el('ssMore'));}}};} /* doesn't fit (big look, small screen) — the list stays as it was */

/* ---------- настройки: «Нейросети → Озвучка» (Piper) ---------- */
(function(){
  const lg=el('ttsProvLegend');if(!lg)return;
  lg.textContent='«бесплатно» — голос телефона и нейроголос в телефоне; «рубли» — оплата российской картой.';
  lg.insertAdjacentHTML('afterend','<div id="tpPip" class="nnbox tppip" hidden><div class="aisub" id="tpPipT"></div><div class="row aitestrow"><button type="button" class="ghostbtn" id="tpPipGet"></button><button type="button" class="ghostbtn" id="tpPipDel" hidden>Удалить голоса</button></div><div class="presets nnlist" id="tpPipV" role="radiogroup" aria-label="Голос"></div></div>');
  el('tpPipGet').onclick=async function(){
    const v=pipVoice(S.tts.voice);if(PIP.busy)return;
    if(PIP.have[v]){el('ttsTest').click();return;}
    PIP.busy=v;PIP.prog='Готовлю…';tpPipRender();
    try{await pipDownload(v,function(g,t){PIP.prog='Скачиваю: '+Math.round(g/1e6)+' из '+Math.round(t/1e6)+' МБ';const x=el('tpPipT');if(x)x.textContent=PIP.prog;});
      PIP.busy='';tpPipRender();renderNn();el('ttsTest').click();}
    catch(e){PIP.busy='';tpPipRender();el('tpPipT').textContent='Не скачалось: '+((e&&e.message)||'ошибка')+'. Проверьте интернет и нажмите ещё раз';}
  };
  el('tpPipDel').onclick=async function(){const ok=await rqAsk({t:'Удалить нейроголоса?',p:'Освободится место на телефоне. Скачать снова можно в любой момент',ok:'Удалить'});if(!ok)return;
    if(ttsOn||speaking)ttsStop();await pipRemove();tpPipRender();renderNn();flashMsg('Нейроголоса удалены');};
})();
function tpPipRender(){
  const box=el('tpPip');if(!box)return;const on=S.tts&&S.tts.prov==='piper';box.hidden=!on;el('ttsCard').dataset.prov=(S.tts&&S.tts.prov)||'system';if(!on)return;
  const v=pipVoice(S.tts.voice),has=!!PIP.have[v],any=Object.keys(PIP.have).some(function(k){return PIP.have[k];});
  if(!pipOk()){el('tpPipT').textContent='Этот браузер не умеет нейроголос. Откройте приложение в Chrome или Safari поновее';el('tpPipGet').hidden=true;return;}
  el('tpPipGet').hidden=has&&!PIP.busy;el('tpPipGet').disabled=!!PIP.busy;
  el('tpPipT').textContent=PIP.busy?PIP.prog:has?'Голос «'+PIPER.voices[v]+'» в телефоне: читает без интернета и бесплатно':
    'Живой голос прямо в телефоне: без ключа, без интернета, бесплатно. Скачивается один раз: '+(PIP.eng?'голос ≈ 63 МБ':'≈ 93 МБ (движок и голос)')+'. Лучше по Wi-Fi';
  el('tpPipGet').innerHTML=rqIcon('download',18)+'<span>Скачать «'+PIPER.voices[v]+'»</span>';
  el('tpPipDel').hidden=!any||!!PIP.busy;
  const vb=el('tpPipV');vb.innerHTML='';
  Object.keys(PIPER.voices).forEach(function(k){const b=document.createElement('button');b.type='button';b.className='fchip'+(k===v?' on':'');b.setAttribute('role','radio');b.setAttribute('aria-checked',k===v?'true':'false');
    b.textContent=PIPER.voices[k]+(PIP.have[k]?' ✓':'');b.onclick=function(){if(PIP.busy)return;S.tts.voice=k;save();renderTtsSet();if(PIP.have[k])el('ttsTest').click();};vb.appendChild(b);});
}
{const r0=renderTtsSet;renderTtsSet=function(){r0.apply(this,arguments);try{tpPipRender();}catch(e){}};}
{const n0=renderNn;renderNn=function(){n0.apply(this,arguments);try{if(S.tts&&S.tts.prov==='piper'){const x=el('ttsHead').querySelector('.xv');if(x)x.textContent='Нейроголос'+(PIP.have[pipVoice(S.tts.voice)]?'':', не скачан');}}catch(e){}};}
if(typeof nnStateTts==='function'){const s0=nnStateTts;nnStateTts=function(){if(S.tts&&S.tts.prov==='piper'){const v=pipVoice(S.tts.voice);return PIP.have[v]?['ok','Нейроголос «'+PIPER.voices[v]+'» · в телефоне, бесплатно']:['warn','Нейроголос · не скачан'];}return s0.apply(this,arguments);};}
{const t=el('ttsTest');if(t){const c0=t.onclick;t.onclick=async function(){
  if(!(S.tts&&S.tts.prov==='piper'))return c0.apply(this,arguments);
  const r=el('ttsTestRes'),v=pipVoice(S.tts.voice);if(!PIP.have[v]){r.textContent='Сначала скачайте голос';return;}
  r.textContent=PIP.init?'Готовлю…':'Запускаю голос… (первый раз до полуминуты)';t.disabled=true;
  try{const b=await pipSay('Здравствуйте! Так будут звучать ваши книги.',v);if(ttsTestAudio)try{ttsTestAudio.pause();}catch(e){}
    ttsTestAudio=new Audio(URL.createObjectURL(b));try{ttsTestAudio.playbackRate=rqRx().tts.rate;}catch(e){}await ttsTestAudio.play();r.textContent='Работает, слушайте';}
  catch(e){r.textContent=e&&e.name==='NotAllowedError'?'Голос готов, нажмите ещё раз':'Не работает: '+((e&&e.message)||'ошибка');}
  finally{t.disabled=false;}};}}
if(typeof rxTtsTest==='function'){const x0=rxTtsTest;rxTtsTest=function(){if(!nttsOn())return x0.apply(this,arguments);tpSpeak('Так будет звучать книга. Можно сделать медленнее или быстрее.','ru');};
  const b=el('rxTtsTest');if(b)b.onclick=rxTtsTest;}

/* ---------- настройки: «Чтение → Чтение вслух» ---------- */
const TP_PAUSE=[['off','Нет'],['s','Короткие'],['m','Средние'],['l','Длинные']];
function tpRows(){return rxRow('','type','Буква «ё»','Сама ставит её в частых словах: ещё, её, идёт',rxSwHtml('tpYo'))+
  rxRow('tpDictRow','book-open','Как произносить слова','',' <button type="button" class="ghostbtn" id="tpDictBtn"></button>')+
  '<div id="tpDictBox" class="nnbox" hidden></div>'+
  rxRow('','timer','Паузы между абзацами','Между главами вдвое-втрое длиннее',rxSegHtml('tpPause','Паузы между абзацами'),'setstack')+
  rxRow('','file-text','Чисто, как диктор','Без номеров сносок и страниц; сокращения целиком: «т. е.», «XIX в.», «1812 г.»',rxSwHtml('tpClean'))+
  rxRow('tpLangRow','languages','Иностранные фразы — своим голосом','',rxSwHtml('tpLang'))+
  rxRow('tpPreRow','download','Глава заранее','Для нейроголоса на ключе: до 10 минут вперёд в пределах главы. Без пауз и без интернета, а тот же кусок второй раз не оплачивается',rxSwHtml('tpPre'))+
  rxRow('','chevrons-right','Кнопки «назад / вперёд»','Пока звучит книга: на предложение и на абзац. Тап по тексту — «Читать отсюда»',rxSwHtml('tpBarSw'));}
if(typeof rmRxTtsRows==='function'){const r0=rmRxTtsRows;rmRxTtsRows=function(){return r0.apply(this,arguments)+tpRows();};}
if(typeof rmRxWire==='function'){const w0=rmRxWire;rmRxWire=function(){w0.apply(this,arguments);
  const sw=function(id,fn){const b=el(id);if(b)b.onclick=function(){fn();saveSet();rxRender();};};
  sw('tpYo',function(){const c=tpS();c.yo=!c.yo;});sw('tpClean',function(){const c=tpS();c.clean=!c.clean;});
  sw('tpLang',function(){const c=tpS();c.lang=!c.lang;});sw('tpPre',function(){const c=tpS();c.pre=!c.pre;});
  sw('tpBarSw',function(){const c=tpS();c.bar=!c.bar;tpBarSync();});
  const d=el('tpDictBtn');if(d)d.onclick=function(){const bx=el('tpDictBox');bx.hidden=!bx.hidden;tpDictRender();};
  const p=el('tpPreRow');if(p)p.querySelector('.lab').insertAdjacentHTML('beforeend',' <button type="button" class="lnk" id="tpPreClr" hidden></button>');
  const c=el('tpPreClr');if(c)c.onclick=async function(e){e.stopPropagation();try{await caches.delete(TPC_CACHE);}catch(er){}flashMsg('Сохранённая озвучка удалена');rxRender();};};}
if(typeof rmRxRender==='function'){const x0=rmRxRender;rmRxRender=function(){x0.apply(this,arguments);if(!el('tpYo'))return;const c=tpS();
  rxSw('tpYo',c.yo);rxSw('tpClean',c.clean);rxSw('tpLang',c.lang);rxSw('tpPre',c.pre);rxSw('tpBarSw',c.bar);
  rxSeg('tpPause',TP_PAUSE,c.pause,function(v){tpS().pause=v;saveSet();rxRender();});
  el('tpDictBtn').textContent=c.dict.length?'Слова: '+c.dict.length:'Добавить';
  el('tpDictRowS').textContent=c.dict.length?c.dict.slice(0,3).map(function(x){return x[0]+' → '+x[1];}).join(', ')+(c.dict.length>3?'…':''):'Например, имя героя или слово с ударением: «з+амок»';
  const ls=['en','fr','de','it','es'].filter(tpVoiceFor),nm={en:'английский',fr:'французский',de:'немецкий',it:'итальянский',es:'испанский'};
  el('tpLangRowS').textContent=window.speechSynthesis?(ls.length?'Голоса в телефоне: '+ls.map(function(k){return nm[k];}).join(', '):'В телефоне нет голосов других языков — фразы прочтёт основной голос'):'Нужен голос телефона';
  tpCSize().then(function(r){const b=el('tpPreClr');if(!b)return;b.hidden=!r[1];b.textContent='Удалить сохранённое ('+(r[0]>=1e6?Math.round(r[0]/1e6)+' МБ':Math.max(1,Math.round(r[0]/1e3))+' КБ')+')';});
  if(!el('tpDictBox').hidden)tpDictRender();};}
function tpDictRender(){
  const bx=el('tpDictBox');if(!bx||bx.hidden)return;const d=tpS().dict;
  bx.innerHTML='<div class="aisub">Как написано в книге → как читать. Ударение — «+» перед гласной: з+амок, зам+ок.</div>'+
    d.map(function(x,i){return '<div class="setrow tpdw"><div class="lab">'+esc(x[0])+' → '+esc(x[1])+'</div><button type="button" class="ghostbtn" data-say="'+i+'" aria-label="Послушать">'+rqIcon('volume-2',16)+'</button><button type="button" class="ghostbtn" data-del="'+i+'" aria-label="Удалить">'+rqIcon('x',16)+'</button></div>';}).join('')+
    '<div class="row tpdadd"><input class="searchinp" id="tpDA" maxlength="60" placeholder="Написано" aria-label="Как написано"><input class="searchinp" id="tpDB" maxlength="80" placeholder="Читать как" aria-label="Как читать"><button type="button" class="ghostbtn" id="tpDAdd">Добавить</button></div>';
  bx.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){tpS().dict.splice(+b.dataset.del,1);saveSet();rxRender();};});
  bx.querySelectorAll('[data-say]').forEach(function(b){b.onclick=function(){const x=tpS().dict[+b.dataset.say];if(x)tpSpeak(x[0],'ru');};});
  el('tpDAdd').onclick=function(){const a=el('tpDA').value.trim().slice(0,60),b=el('tpDB').value.trim().slice(0,80);if(!a||!b){flashMsg('Заполните оба поля');return;}
    const c=tpS();if(c.dict.length>=300){flashMsg('Уже 300 слов');return;}c.dict=c.dict.filter(function(x){return x[0].toLowerCase()!==a.toLowerCase();}).concat([[a,b]]);saveSet();rxRender();tpSpeak(a,'ru');};
}
/* ===== 07.11 (Джессика: «Добавь возможность выбирать скорость и более тонкие настройки для кастомизации голоса под себя»; «голоса … без нейросети,
   но очень качественно … скачать») =====
   Скорость 0,5…3× шагом 0,05 — в «Чтение вслух» и кнопкой на плашке озвучки (меняется сразу, и у звучащего куска нейроголоса);
   высота и громкость (голос телефона: pitch/volume; нейроголос: громкость); выразительность (Piper: живость синтеза; OpenAI: манера,
   ElevenLabs: стабильность, Яндекс: эмоция); своя манера чтения словами (OpenAI); наборы «Аудиокнига», «Перед сном», «Быстро»;
   «Хорошие голоса для телефона»: RHVoice (Android, без нейросети) и улучшенные голоса Google / Apple. */
function tpRateTxt(v){return String(Math.round(v*100)/100).replace('.',',')+'×';}
function tpRateSet(v){const t=rxS().tts;t.rate=Math.round(Math.max(0.5,Math.min(3,v))*20)/20;saveSet();
  try{if(nttsAudio&&!nttsAudio.paused)nttsAudio.playbackRate=t.rate;}catch(e){}tpBarSync();try{rxRender();}catch(e){}if(!el('tpRatePop').hidden)tpRatePop(true);}
function tpRatePop(on){
  const box=el('tpRatePop');if(!box)return;if(!on){box.hidden=true;return;}
  const r=rqRx().tts.rate;
  box.innerHTML='<div class="tprp"><button type="button" class="stepbtn" data-d="-0.05" aria-label="Медленнее">'+rqIcon('minus',18)+'</button><b>'+tpRateTxt(r)+'</b><button type="button" class="stepbtn" data-d="0.05" aria-label="Быстрее">'+rqIcon('plus',18)+'</button></div>'+
    '<div class="tprc">'+[0.75,1,1.25,1.5,2,2.5].map(function(v){return '<button type="button" class="fchip'+(Math.abs(v-r)<0.01?' on':'')+'" data-v="'+v+'">'+tpRateTxt(v)+'</button>';}).join('')+'</div>';
  box.querySelectorAll('[data-d]').forEach(function(b){b.onclick=function(){tpRateSet(rqRx().tts.rate+(+b.dataset.d));};});
  box.querySelectorAll('[data-v]').forEach(function(b){b.onclick=function(){tpRateSet(+b.dataset.v);};});
  box.hidden=false;const bar=el('tpBar').getBoundingClientRect();box.style.bottom=Math.round(innerHeight-bar.top+8)+'px';
}
/** extra request fields of a voice service: how lively, how to read */
function tpVoiceOpts(p){const o=tpS(),e=o.expr;
  if(p==='openai'){const base={calm:'Читай по-русски спокойно, ровно и негромко, без нажима.',norm:'Читай по-русски спокойно и выразительно, как аудиокнигу.',live:'Читай по-русски живо и артистично, с интонациями героев, как актёр аудиокниги.'}[e];
    return {instructions:base+(o.style?' '+o.style:'')};}
  if(p==='elevenlabs')return {voice_settings:{stability:{calm:0.8,norm:0.5,live:0.28}[e],similarity_boost:0.75,style:{calm:0,norm:0.15,live:0.45}[e]}};
  if(p==='yandex')return e==='live'?{emotion:'good'}:{};
  return {};}
/* голос телефона: высота и громкость каждой фразы; звук нейроголоса: громкость */
if(window.speechSynthesis){try{const sp=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=function(u){try{const o=tpS();if(u&&u.pitch===1)u.pitch=o.pitch;if(u&&u.volume===1)u.volume=o.vol;}catch(e){}return sp(u);};}catch(e){}}
document.addEventListener('play',function(e){const a=e.target;if(a&&a!==TP.sil&&a.tagName==='AUDIO'&&(a===nttsAudio||a===TP_SAY||(typeof ttsTestAudio!=='undefined'&&a===ttsTestAudio)))try{a.volume=tpS().vol;}catch(er){}},true);
const TP_PRESETS=[['book','Аудиокнига',{rate:1,pitch:1,expr:'live',pause:'l'}],['sleep','Перед сном',{rate:0.85,pitch:0.95,expr:'calm',pause:'l'}],['fast','Быстро',{rate:1.6,pitch:1,expr:'norm',pause:'s'}],['def','Как было',{rate:1,pitch:1,expr:'norm',pause:'m'}]];
function tpPresetOn(x){const c=tpS(),r=rqRx().tts.rate;return Math.abs(r-x.rate)<0.01&&c.pitch===x.pitch&&c.expr===x.expr&&c.pause===x.pause;}
function tpPhoneHelp(){const ua=navigator.userAgent||'',ios=/iPhone|iPad|iPod|Macintosh/.test(ua)&&!/Android/.test(ua);
  return ios?'<div class="aisub">На iPhone: «Настройки → Универсальный доступ → Устный контент → Голоса → Русский» — скачайте «Милена (улучшенный)» или «Юрий (улучшенный)». Голос появится здесь в «Голос телефона».</div>':
    '<div class="aisub"><b>RHVoice</b> — бесплатные голоса без нейросети и без интернета: Александр, Анна, Елена, Ирина и другие. Установите приложение, откройте его и скачайте русские голоса, затем в Android: «Настройки → Специальные возможности → Синтез речи» выберите RHVoice. Голос появится здесь в «Голос телефона».</div>'+
    '<div class="row nnquick"><button type="button" class="ghostbtn" data-rhv="gp">'+rqIcon('download',18)+'<span>RHVoice в Google Play</span></button><button type="button" class="ghostbtn" data-rhv="fd">'+rqIcon('download',18)+'<span>RHVoice в F-Droid</span></button></div>'+
    '<div class="aisub"><b>Голоса Google</b> лучшего качества: «Настройки → Специальные возможности → Синтез речи → Google → ⚙ → Установить голосовые данные → Русский», там выберите голос и скачайте его.</div>';}
function tpPhoneWire(box){if(!box)return;box.querySelectorAll('[data-rhv]').forEach(function(b){b.onclick=function(){window.open(b.dataset.rhv==='gp'?'https://play.google.com/store/apps/details?id=com.github.olga_yakovleva.rhvoice.android':'https://f-droid.org/packages/com.github.olga_yakovleva.rhvoice.android/','_blank','noopener');};});}
function tpRows2(){return rxRow('','sparkles','Наборы голоса','Скорость, высота, выразительность и паузы разом','<div class="presets rxfull" id="tpPre2" role="radiogroup" aria-label="Наборы голоса"></div>','setstack')+
  rxRow('','timer','Скорость точнее','0,5…3×; на плашке озвучки — кнопка со скоростью','<span class="tprv"><input type="range" id="tpRateR" min="0.5" max="3" step="0.05" aria-label="Скорость голоса"><b id="tpRateV"></b></span>','setstack')+
  rxRow('tpPitchRow','move-vertical','Высота голоса','Для голоса телефона','<span class="tprv"><input type="range" id="tpPitchR" min="0.5" max="1.5" step="0.05" aria-label="Высота голоса"><b id="tpPitchV"></b></span>','setstack')+
  rxRow('','volume-2','Громкость голоса','Тише остальных звуков телефона, если нужно','<span class="tprv"><input type="range" id="tpVolR" min="0.2" max="1" step="0.05" aria-label="Громкость голоса"><b id="tpVolV"></b></span>','setstack')+
  rxRow('tpExprRow','flame','Выразительность','',rxSegHtml('tpExpr','Выразительность'),'setstack')+
  rxRow('tpStyleRow','pencil','Своя манера чтения','Для OpenAI: опишите словами, например «как сказочник, медленно и тепло»','<input class="searchinp" id="tpStyle" maxlength="200" placeholder="Как читать" aria-label="Своя манера чтения">','setstack')+
  rxRow('','download','Хорошие голоса для телефона','Скачать один раз, читают без интернета',' <button type="button" class="ghostbtn" id="tpPhoneBtn">Как скачать</button>')+
  '<div id="tpPhoneBox" class="nnbox" hidden></div>';}
{const r0=rmRxTtsRows;rmRxTtsRows=function(){return tpRows2()+r0.apply(this,arguments);};}
{const w0=rmRxWire;rmRxWire=function(){w0.apply(this,arguments);if(!el('tpRateR'))return;
  el('tpRateR').oninput=function(){el('tpRateV').textContent=tpRateTxt(+this.value);};el('tpRateR').onchange=function(){tpRateSet(+this.value);};
  el('tpPitchR').oninput=function(){el('tpPitchV').textContent=tpRateTxt(+this.value).replace('×','');};el('tpPitchR').onchange=function(){tpS().pitch=Math.round(+this.value*20)/20;saveSet();rxRender();};
  el('tpVolR').oninput=function(){el('tpVolV').textContent=Math.round(+this.value*100)+'%';};el('tpVolR').onchange=function(){tpS().vol=Math.round(+this.value*20)/20;saveSet();try{if(nttsAudio)nttsAudio.volume=tpS().vol;}catch(e){}rxRender();};
  el('tpStyle').onchange=function(){tpS().style=this.value.trim().slice(0,200);saveSet();};
  el('tpPhoneBtn').onclick=function(){const b=el('tpPhoneBox');b.hidden=!b.hidden;if(!b.hidden){b.innerHTML=tpPhoneHelp();tpPhoneWire(b);}};
  /* the old ± of «Скорость голоса»: 0,05 and up to 3× */
  const st=function(d){tpRateSet(rqRx().tts.rate+d);};el('rxRateMinus').onclick=function(){st(-0.05);};el('rxRatePlus').onclick=function(){st(0.05);};};}
{const x0=rmRxRender;rmRxRender=function(){x0.apply(this,arguments);if(!el('tpRateR'))return;const c=tpS(),t=rqRx().tts,pr=(S.tts&&S.tts.prov)||'system',sys=!nttsOn();
  el('tpRateR').value=t.rate;el('tpRateV').textContent=tpRateTxt(t.rate);el('rxRatePlus').disabled=t.rate>=3;
  el('tpPitchR').value=c.pitch;el('tpPitchV').textContent=tpRateTxt(c.pitch).replace('×','');el('tpPitchR').disabled=!sys;
  el('tpPitchRowS').textContent=sys?'Для голоса телефона':'Только у голоса телефона; сейчас читает «'+(TTS_PROV[pr]?TTS_PROV[pr].name:'')+'»';
  el('tpVolR').value=c.vol;el('tpVolV').textContent=Math.round(c.vol*100)+'%';
  rxSeg('tpExpr',[['calm','Спокойно'],['norm','Обычно'],['live','Живо']],c.expr,function(v){tpS().expr=v;saveSet();rxRender();});
  el('tpExprRowS').textContent=sys?'Для нейроголоса; голос телефона читает как умеет':pr==='piper'?'Нейроголос в телефоне: ровнее или живее':pr==='openai'?'OpenAI: манера чтения':pr==='elevenlabs'?'ElevenLabs: стабильность и стиль':pr==='yandex'?'Яндекс: «Живо» — доброжелательная интонация':'У этого сервиса не меняется';
  el('tpStyleRow').hidden=pr!=='openai';if(document.activeElement!==el('tpStyle'))el('tpStyle').value=c.style;
  rxChips('tpPre2',TP_PRESETS.map(function(x){return [x[0],x[1]];}),(TP_PRESETS.find(function(x){return x[0]!=='def'&&tpPresetOn(x[2]);})||[''])[0],function(k){const x=TP_PRESETS.find(function(q){return q[0]===k;})[2];
    const o=tpS();o.pitch=x.pitch;o.expr=x.expr;o.pause=x.pause;tpRateSet(x.rate);flashMsg('Голос: «'+TP_PRESETS.find(function(q){return q[0]===k;})[1]+'»',{kind:'info',icon:'volume-2'});});};}
/* «Нейросети → Озвучка», выбран «Телефон»: та же подсказка про хорошие голоса */
(function(){const lg=el('tpPip');if(!lg)return;lg.insertAdjacentHTML('afterend','<div id="tpPhoneNn" class="nnbox" hidden><div class="aisub"><b>Хорошие голоса для телефона</b></div><div id="tpPhoneNnB"></div></div>');})();
{const r0=renderTtsSet;renderTtsSet=function(){r0.apply(this,arguments);try{const b=el('tpPhoneNn');if(!b)return;const on=!S.tts||S.tts.prov==='system'||!TTS_PROV[S.tts.prov];b.hidden=!on;if(on&&!el('tpPhoneNnB').childNodes.length){el('tpPhoneNnB').innerHTML=tpPhoneHelp();tpPhoneWire(el('tpPhoneNnB'));}}catch(e){}};}
/* the «Чтение» card may already be built (js/dict.js rebuilds it after its hooks) — build again with ours */
(function(){const c=el('rxCard');if(c&&c.childNodes.length){c.innerHTML='';try{rxRender();}catch(e){console.warn('[rq] rx rebuild',e);}}})();
pipScan();
