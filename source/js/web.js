/* ---------- «Страница сайта» (Джессика 13.11): читать сайт как книгу ----------
   Страница превращается в обычную книгу на полке (genre 'Сайт', srcId 'web:<адрес>'), дальше чтение считается как у любой книги:
   страницы, минуты, опыт, ежедневное задание, честное чтение. Своего сервера нет, поэтому текст попадает в приложение так:
   1) ссылка: Википедия через её API (открыт для всех), любой другой сайт напрямую, если он это разрешает (CORS);
      если не разрешает, приложение спрашивает и берёт текст через Jina Reader (r.jina.ai) — решение Джессики 13.11 «да, запасным путём»;
   2) вставленный текст (или «Поделиться» выделенным текстом из браузера);
   3) сохранённая страница: .html / .htm, .mhtml / .mht («Скачать» в Chrome на Android) через «+ → Выбрать файлы».
   Новых полей в хранилище нет: книга — обычная карточка rqAddBook, srcId уже есть (arch.md 13.11). */
const WEB_JINA='https://r.jina.ai/';
const WEB_MIN=200; /* меньше 200 знаков текста — это не статья, а меню или ошибка */
const WEB_DROP='script,style,noscript,template,iframe,object,embed,svg,canvas,video,audio,form,button,input,select,textarea,nav,header,footer,aside,'+
  '[role=navigation],[role=banner],[role=contentinfo],[role=complementary],[aria-hidden=true],[hidden],'+
  '.mw-editsection,.ws-noexport,#headertemplate,.headertemplate,.ws-summary,.reference,sup.reference,.mw-cite-backlink,.navbox,.vertical-navbox,.infobox,.metadata,.ambox,.hatnote,.mw-empty-elt,.noprint,.toc,#toc,.mw-jump-link,.sidebar,.mw-references-wrap,.reflist,.gallery,.magnify,.catlinks,'+
  '.share,.social,.comments,#comments,.related,.advert,.ads,.ad,.cookie,.breadcrumbs,.breadcrumb,.pagination,.subscribe,.newsletter';
const WEB_BLOCK=/^(P|H[1-6]|LI|BLOCKQUOTE|PRE|DD|DT|FIGURE|FIGCAPTION|TR|DIV|SECTION|ARTICLE|MAIN|UL|OL|DL|TABLE|TBODY|THEAD|HR|BR|CENTER|ADDRESS|DETAILS|SUMMARY)$/;

function webNorm(u){u=String(u||'').trim();if(!u)return '';if(!/^https?:\/\//i.test(u))u='https://'+u.replace(/^\/+/,'');
  try{const x=new URL(u);x.hash='';return x.href;}catch(e){return '';}}
function webHost(u){try{return new URL(u).hostname.replace(/^www\.|^m\./,'');}catch(e){return '';}}
function webOnShelf(u){return (S.userBooks||[]).find(function(b){return b&&b.srcId==='web:'+u;});}
function webClean(s){return String(s||'').replace(/[   ]/g,' ').replace(/[ \t\r\f\v]+/g,' ').replace(/ *\n */g,'\n').trim();}

/* ---- «раскладчик» (Джессика 13.11 вечер: «чтение неудобное… раскладывать текст с сайтов удобно, убирая лишнее») ----
   Любая страница (html сайта, html из файла, markdown от Jina Reader) сначала становится списком блоков:
     {k:'h',lvl,t} заголовок · {k:'p',t,ld} абзац · {k:'li',t,ld} пункт списка · {k:'q',t} цитата · {k:'pre',t} код · {k:'img',src} картинка · {k:'cap',t} подпись
   (ld — доля текста внутри ссылок). webTidy убирает лишнее (меню, счётчики над статьёй, «читайте также», комментарии), webBlocksToBook
   складывает книгу. В тексте книги вид абзаца хранит невидимый знак в его начале (как U+2063 у перевода, arch.md 13.11):
   U+2061 цитата, U+2062 подзаголовок, U+2064 подпись к картинке, U+2061U+2062 строка кода; «• » — пункт списка; «￼img:N» — картинка из IDB.
   Читалка (js/reader.js rqBodyHtml) рисует их классами rq-q / rq-h2 / rq-cap / rq-pre / rq-li. */
const WEB_Q='⁡',WEB_H2='⁢',WEB_CAP='⁤',WEB_PRE='⁡⁢';
const WEB_IMG_MAX=24,WEB_PAGES=10,WEB_PAGES_JINA=5;
/* 13.11 ночь (Джессика «делай все»): жирный/курсив, ссылки и сноски. Пока страница разбирается, они стоят в тексте блока служебными знаками
   (U+E004 вид+номер U+E005 … U+E006); в текст книги эти знаки НЕ попадают: webBlocksToBook снимает их и записывает места [начало, длина, вид, номер]
   в отдельную запись IDB «webx:<книга>» (arch.md 13.11). Вид: 1 жирный, 2 курсив, 3 ссылка (номер в l), 4 сноска (номер в n).
   Ещё два вида абзаца: U+2064U+2061 формула строкой, U+2064U+2062 строка таблицы (ячейки через табуляцию; третий знак U+2062 — шапка). */
const WEB_MO='\uE004',WEB_MM='\uE005',WEB_MC='\uE006';
const WEB_FM='\u2064\u2061',WEB_TR='\u2064\u2062',WEB_NOCELL='\u2060';
function webPlain(s){return String(s).replace(/\uE004[^\uE005]*\uE005|\uE006/g,'');}
function webMk(kind,idx,t){return WEB_MO+kind+(idx==null?'':idx)+WEB_MM+t+WEB_MC;}
/* формула TeX → строка обычными знаками: E=mc², √(x), a/b, греческие буквы */
const WEB_TEX={alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',varepsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',vartheta:'ϑ',iota:'ι',kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',upsilon:'υ',phi:'φ',varphi:'φ',chi:'χ',psi:'ψ',omega:'ω',
  Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',Phi:'Φ',Psi:'Ψ',Omega:'Ω',times:'×',cdot:'·',pm:'±',mp:'∓',leq:'≤',le:'≤',geq:'≥',ge:'≥',neq:'≠',ne:'≠',approx:'≈',equiv:'≡',sim:'∼',propto:'∝',infty:'∞',
  sum:'∑',prod:'∏',int:'∫',oint:'∮',partial:'∂',nabla:'∇',to:'→',rightarrow:'→',leftarrow:'←',Rightarrow:'⇒',Leftarrow:'⇐',leftrightarrow:'↔',Leftrightarrow:'⇔',mapsto:'↦','in':'∈',notin:'∉',subset:'⊂',subseteq:'⊆',supset:'⊃',cup:'∪',cap:'∩',
  forall:'∀',exists:'∃',neg:'¬',land:'∧',lor:'∨',wedge:'∧',vee:'∨',ldots:'…',cdots:'⋯',dots:'…',angle:'∠',circ:'∘',mid:'|',ell:'ℓ',hbar:'ℏ',emptyset:'∅',varnothing:'∅',div:'÷',ast:'∗',star:'⋆',bullet:'•',perp:'⊥',parallel:'∥',
  langle:'⟨',rangle:'⟩',lVert:'‖',rVert:'‖',Vert:'‖',lvert:'|',rvert:'|',vert:'|',lbrace:'{',rbrace:'}',ll:'≪',gg:'≫',cong:'≅',simeq:'≃',prime:'′',degree:'°',quad:' ',qquad:'  ',lim:'lim',sin:'sin',cos:'cos',tan:'tan',log:'log',ln:'ln',exp:'exp',max:'max',min:'min',det:'det',gcd:'gcd'};
const WEB_SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','−':'⁻','=':'⁼','(':'⁽',')':'⁾',n:'ⁿ',i:'ⁱ'};
const WEB_SUB={'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','−':'₋','=':'₌','(':'₍',')':'₎',a:'ₐ',e:'ₑ',o:'ₒ',x:'ₓ',i:'ᵢ',j:'ⱼ',k:'ₖ',n:'ₙ',m:'ₘ',t:'ₜ'};
function webTex(src){
  let s=String(src||'').replace(/^\s*\$\$?|\$\$?\s*$/g,'').replace(/\\begin\{[^}]*\}(\{[^}]*\})?|\\end\{[^}]*\}/g,' ').replace(/\\\\/g,'; ').replace(/&/g,' ').replace(/\s+([_^])/g,'$1');
  let i=0;
  const arg=function(){while(s[i]===' ')i++;
    if(s[i]==='{'){let d=0,j=i;for(;j<s.length;j++){if(s[j]==='\\'){j++;continue;}if(s[j]==='{')d++;else if(s[j]==='}'){d--;if(!d)break;}}const inner=s.slice(i+1,j);i=j+1;return webTex(inner);}
    if(s[i]==='\\'){const m=/^\\([a-zA-Z]+|.)/.exec(s.slice(i));i+=m[0].length;return cmd(m[1]);}
    return i<s.length?s[i++]:'';};
  const wrap=function(x){return /^(\p{N}+([.,]\p{N}+)?|[\p{L}∞]|)$/u.test(x)?x:'('+x+')';};
  const script=function(map,mark){const a=arg();let o='';for(const ch of a){if(!map[ch])return mark+(a.length>1?'('+a+')':a)+' ';o+=map[ch];}return o;};
  const cmd=function(n){
    if(n==='frac'||n==='dfrac'||n==='tfrac'||n==='cfrac'){const a=arg(),b=arg();return wrap(a)+'/'+wrap(b);}
    if(n==='binom'){const a=arg(),b=arg();return 'C('+a+', '+b+')';}
    if(n==='sqrt'){let k='';while(s[i]===' ')i++;if(s[i]==='['){const j=s.indexOf(']',i);k=s.slice(i+1,j);i=j+1;}const a=arg();return (k==='3'?'∛':k==='4'?'∜':k?'('+k+')√':'√')+wrap(a);}
    if(/^(text|textrm|textit|textbf|mathrm|mathbf|mathit|mathsf|mathtt|mathcal|boldsymbol|operatorname|mbox|hbox|bar|overline|underline|hat|widehat|tilde|widetilde|vec|dot|ddot|overrightarrow)$/.test(n)){const a=arg();return n==='vec'||n==='overrightarrow'?a+'⃗':n==='bar'||n==='overline'?a+'̅':n==='hat'||n==='widehat'?a+'̂':n==='tilde'||n==='widetilde'?a+'̃':n==='dot'?a+'̇':a;}
    if(n==='mathbb'){const a=arg();return ({R:'ℝ',N:'ℕ',Z:'ℤ',Q:'ℚ',C:'ℂ',P:'ℙ'})[a]||a;}
    if(/^(displaystyle|textstyle|scriptstyle|left|right|big|Big|bigg|Bigg|bigl|bigr|Bigl|Bigr|limits|nolimits|nonumber|hline|,|;|!|:| )$/.test(n))return /^[,;: ]$/.test(n)?' ':'';
    if(/^(color|label|tag)$/.test(n)){arg();return '';}
    if(WEB_TEX[n])return WEB_TEX[n];
    if(/^[{}%$#_&|]$/.test(n))return n==='|'?'‖':n;
    return n;};
  let out='';
  while(i<s.length){const ch=s[i];
    if(ch==='\\'){const m=/^\\([a-zA-Z]+|[\s\S])/.exec(s.slice(i));if(!m){i++;continue;}i+=m[0].length;const v=cmd(m[1]);out+=(/[a-zA-Z]$/.test(out)&&/^[a-zA-Z]{2,}$/.test(v)?' ':'')+v;if(/^[a-zA-Z]{2,}$/.test(v)&&/[a-zA-Z0-9]/.test(s[i]||''))out+=' ';}
    else if(ch==='^'){i++;out+=script(WEB_SUP,'^');}
    else if(ch==='_'){i++;out+=script(WEB_SUB,'_');}
    else if(ch==='{'){out+=arg();}
    else if(ch==='}'||ch==='~'){i++;if(ch==='~')out+=' ';}
    else{out+=ch;i++;}
  }
  return out.replace(/\s+/g,' ').replace(/ ?([=<>≤≥≠≈+→]) ?/g,' $1 ').replace(/\( /g,'(').replace(/ \)/g,')').replace(/\s+/g,' ').trim();
}
const WEB_JUNK=/^(skip to (main )?content|перейти к (основному )?(содержанию|контенту)|реклама|advertisement|поделиться|share( this)?|подписаться|subscribe|читать (далее|дальше|полностью)|read more|войти|sign in|log in|меню|menu|поиск|search|комментарии\s*\d*|\d+\s*комментари\S*|comments?\s*\d*|назад|вперёд|далее|previous|next|наверх|back to top|copy link|скопировать ссылку|\d+|[\d\s.,]+[kкKК]?)$/i;
const WEB_TAIL=/^(комментарии|читайте также|читать также|похожие (статьи|публикации|материалы|записи)|ещё по теме|еще по теме|по теме|материалы по теме|другие (статьи|материалы|новости)|рекомендуем|вам может понравиться|related( articles| posts| stories)?|more from|more on this|read (more|next)|you (may|might) also like|comments|leave a (reply|comment)|теги|tags|поделиться|share this|подпишитесь|подписка|newsletter|лучшие за сутки|публикации|информация|help improve|was this (page|article) helpful)(?![\p{L}])/iu;
function webImgOk(src,alt,w,h){
  if(!/^https?:\/\//i.test(src)||/\.svg(\?|$)/i.test(src))return false;
  if(/sprite|icon|logo|avatar|emoji|pixel|spacer|blank|tracking|counter|badge|button|userpic/i.test(src)||/^(avatar|logo|icon|аватар|логотип)/i.test(alt||''))return false;
  if((w&&w<160)||(h&&h<90))return false;return true;}
/* сноски: маленькая ссылка-цифра на место в этой же странице ([1], ¹) → текст сноски в acc.notes, в тексте остаётся знак; сам список сносок со страницы уходит */
function webNotesPrep(doc,acc){
  const drop=[];
  Array.from(doc.querySelectorAll('sup a[href^="#"],a.footnote-ref[href^="#"],a[role="doc-noteref"][href^="#"],a[href^="#fn"],a[href^="#footnote"],a[href^="#cite_note"]')).forEach(function(a){
    const lab=webClean(a.textContent);if(!lab||lab.length>6||!/^[\[(]?[\p{L}\p{N}*†‡]{1,4}[\])]?$/u.test(lab))return;
    let id='';try{id=decodeURIComponent(a.getAttribute('href').slice(1));}catch(e){id=a.getAttribute('href').slice(1);}
    const tg=id&&doc.getElementById(id);if(!tg||tg.contains(a))return;
    const box=tg.tagName==='LI'||tg.tagName==='P'||tg.tagName==='DIV'||tg.tagName==='DD'||tg.tagName==='ASIDE'?tg:(tg.closest('li,p,dd')||tg);
    const c=(box.querySelector('.reference-text')||box).cloneNode(true);
    c.querySelectorAll('.mw-cite-backlink,a.footnote-backref,a[role="doc-backlink"],a[href^="#cite_ref"],a[href^="#fnref"],style,script,sup.reference').forEach(function(x){x.remove();});
    const t=webClean(c.textContent).replace(/^[↑^↩\s]+|[↑↩︎\s]+$/g,'').replace(/^\[?\d{1,3}\]?[.)]?\s+/,'');
    if(t.length<3||t.length>3000)return;
    const sp=doc.createElement('span');sp.setAttribute('data-rqn',String(acc.notes.length));sp.textContent=/^\d+$/.test(lab)?'['+lab+']':lab;acc.notes.push(t);
    const host=a.closest('sup')||a;host.parentNode.replaceChild(sp,host);drop.push(box);});
  drop.forEach(function(x){if(x.parentNode)x.remove();});
}
/* MathML (Википедия с 2025 года отдаёт формулы только так, без TeX) → строка знаками */
function webMathml(n){
  const kids=function(x){return Array.from(x.children);},one=function(x){return x?webMathml(x):'';};
  const sup=function(t,mark){t=t.replace(/\s+/g,'');let o='';for(const ch of t){if(!WEB_SUP[ch])return mark+(t.length>1?'('+t+')':t);o+=WEB_SUP[ch];}return o;};
  const sub=function(t){t=t.replace(/\s+/g,'');let o='';for(const ch of t){if(!WEB_SUB[ch])return '_'+(t.length>1?'('+t+')':t);o+=WEB_SUB[ch];}return o;};
  const wrap=function(x){return /^(\p{N}+([.,]\p{N}+)?|[\p{L}∞]|)$/u.test(x)?x:'('+x+')';};
  const tag=(n.localName||n.tagName||'').toLowerCase(),c=kids(n);
  switch(tag){
    case 'annotation':case 'annotation-xml':case 'none':case 'mprescripts':return '';
    case 'semantics':return one(c[0]);
    case 'mi':case 'mn':case 'mtext':case 'ms':{const t=(n.textContent||'').replace(/⁡/g,'');const nx=n.nextElementSibling;return tag==='mi'&&t.length>1&&nx&&(/^m[in]$/.test(nx.localName)||(nx.localName==='mo'&&/^[\u2061\s]*$/.test(nx.textContent)))?t+' ':t;}
    case 'mo':{const t=(n.textContent||'').replace(/[⁡-⁤]/g,'');return /^[=<>≤≥≠≈+−\-→←⇒⇔∈×·±]$/.test(t)?' '+t.replace('-','−')+' ':/^[,;]$/.test(t)?t+' ':t;}
    case 'mspace':return ' ';
    case 'msup':return one(c[0])+sup(one(c[1]).trim(),'^');
    case 'msub':return one(c[0])+sub(one(c[1]).trim());
    case 'msubsup':return one(c[0])+sub(one(c[1]).trim())+sup(one(c[2]).trim(),'^');
    case 'munderover':return one(c[0])+sub(one(c[1]).trim())+sup(one(c[2]).trim(),'^');
    case 'munder':{const b=one(c[0]),u=one(c[1]).trim();return /^(lim|max|min|sup|inf|∑|∏|∫)/.test(b.trim())?b+sub(u):b;}
    case 'mover':{const b=one(c[0]),o=one(c[1]).trim();return o==='→'?b+'⃗':o==='¯'||o==='‾'||o==='―'?b+'̅':o==='^'||o==='ˆ'?b+'̂':o==='~'||o==='˜'?b+'̃':o==='˙'?b+'̇':b;}
    case 'mfrac':return wrap(one(c[0]).trim())+'/'+wrap(one(c[1]).trim());
    case 'msqrt':return '√'+wrap(c.map(webMathml).join('').trim());
    case 'mroot':{const k=one(c[1]).trim();return (k==='3'?'∛':k==='4'?'∜':'('+k+')√')+wrap(one(c[0]).trim());}
    case 'mfenced':return (n.getAttribute('open')||'(')+c.map(webMathml).join(n.getAttribute('separators')||', ')+(n.getAttribute('close')||')');
    case 'mtable':return c.map(webMathml).join('; ');
    case 'mtr':case 'mlabeledtr':return c.map(webMathml).join(' ');
    default:return c.length?c.map(webMathml).join(''):(n.textContent||'');
  }
}
function webMathTidy(t){return String(t).replace(/\s+/g,' ').replace(/\( /g,'(').replace(/ \)/g,')').replace(/ ([,.;])/g,'$1').trim();}
/* формулы (Википедия, MathJax, KaTeX): TeX из разметки → строка знаками; большая формула становится отдельным абзацем */
function webMathPrep(doc){
  Array.from(doc.querySelectorAll('.mwe-math-element,.mwe-math-element-block,.katex-display,.katex,.MathJax_Display,.MathJax,mjx-container,script[type^="math/tex"],math')).forEach(function(m){
    if(!m.isConnected||(m.parentElement&&m.parentElement.closest('.mwe-math-element,.katex-display,.katex,.MathJax_Display,.MathJax,mjx-container')))return;
    const an=m.matches('script')?m:m.querySelector('annotation[encoding*="tex" i],script[type^="math/tex"]'),im=m.querySelector('img[alt]');
    const mt=m.matches('math')?m:m.querySelector('math[alttext]');
    const tex=an?an.textContent:mt&&mt.getAttribute('alttext')?mt.getAttribute('alttext'):im?im.getAttribute('alt'):'';
    const mm0=mt||(m.matches('math')?m:m.querySelector('math'));
    const t=tex&&tex.trim()?webTex(tex):mm0?webMathTidy(webMathml(mm0)):'';if(!t)return;
    const mm=m.matches('math')?m:m.querySelector('math');
    const blk=/display|block/i.test(m.className||'')||/mwe-math-element-block|mwe-math-display/.test((m.parentElement&&m.parentElement.className)||'')||(m.parentElement&&m.parentElement.tagName==='DD'&&m.parentElement.textContent.trim()===m.textContent.trim())||/mode=display/.test(m.getAttribute('type')||'')||(mm&&mm.getAttribute('display')==='block')||m.getAttribute('display')==='true'||!!m.querySelector('.mwe-math-fallback-image-display');
    const sp=doc.createElement('span');sp.setAttribute('data-rqfm',blk?'b':'i');sp.textContent=t;m.parentNode.replaceChild(sp,m);});
  doc.querySelectorAll('.MathJax_Preview,.katex-html').forEach(function(x){x.remove();});
}
/* «статья на нескольких страницах»: ссылка «Далее / Next / rel=next» на ту же статью, только с другим номером страницы */
const WEB_NEXT=/^(далее|дальше|вперёд|вперед|следующая( страница| часть| глава)?|следующая стр\.?|след\.?( стр\.?)?|продолжение|next( page| part| chapter)?|older( posts)?|→|»|›|>|>>)$/i;
function webPagey(cur,nx){
  let a,b;try{a=new URL(cur);b=new URL(nx);}catch(e){return false;}
  if(a.hostname!==b.hostname||a.pathname+a.search===b.pathname+b.search)return false;
  const q=/(^|[?&])(page|p|pg|pn|paged|part|start|offset|str|PAGEN_\d+)=(\d+)/i;
  if(a.pathname.replace(/\/+$/,'')===b.pathname.replace(/\/+$/,'')){const m=q.exec(b.search),m0=q.exec(a.search);if(!m)return false;
    return /start|offset/i.test(m[2])?(!m0||+m[3]>+m0[3]):(+m[3]>=2&&+m[3]<=60&&(!m0||+m[3]===+m0[3]+1));}
  /* путь: отличается одним куском, и в нём номер на 1 больше (/p.1/ → /p.2/, /2/ → /3/), или у первой страницы номера нет (/statya → /statya/2, statya-2.html) */
  const A=a.pathname.replace(/\/+$/,'').split('/'),B=b.pathname.replace(/\/+$/,'').split('/');
  const num=function(x){const m=/^(.*?)(\d{1,2})(\.(?:s?html?|php|aspx?))?$/i.exec(x);return m?{pre:m[1],n:+m[2],ext:m[3]||''}:null;};
  const bare=function(x){return x.replace(/\.(?:s?html?|php|aspx?)$/i,'');};
  if(A.length===B.length){let d=-1;for(let i=0;i<A.length;i++)if(A[i]!==B[i]){if(d>=0)return false;d=i;}
    if(d<0)return false;const x=num(A[d]),y=num(B[d]);
    if(x&&y&&x.pre===y.pre&&y.n===x.n+1&&(x.pre===''?d===A.length-1:/[._\-]|page|part|p|str$/i.test(x.pre)))return true;
    return !x&&!!y&&y.n===2&&bare(A[d])===bare(y.pre).replace(/[._\-]?(page|part|p|str)?[._\-]?$/i,'');}
  if(B.length===A.length+1||B.length===A.length+2){for(let i=0;i<A.length;i++)if(A[i]!==B[i])return false;
    const rest=B.slice(A.length).join('/');return /^((page|part|p|str)\/)?2$/i.test(rest);}
  return false;
}
function webNextUrl(doc,url){
  const abs=function(v){try{const u=new URL(v,url);u.hash='';return u.href;}catch(e){return '';}};
  const c=[];doc.querySelectorAll('link[rel~="next"][href],a[rel~="next"][href]').forEach(function(a){c.push(a.getAttribute('href'));});
  doc.querySelectorAll('a[href]').forEach(function(a){const im=a.querySelector('img[alt]');
    if([a.textContent,a.getAttribute('aria-label'),a.getAttribute('title'),im&&im.getAttribute('alt')].some(function(v){const t=webClean(v||'').replace(/^[←→»«›‹<>\s]+(?=\S{2})|(?<=\S{2})[\s←→»«›‹<>]+$/g,'');return t&&t.length<=24&&WEB_NEXT.test(t);}))c.push(a.getAttribute('href'));});
  for(const h of c){const u=abs(h);if(u&&webPagey(url,u))return u;}
  return '';
}
function webHtmlBlocks(root,base,acc){
  acc=acc||{links:[],notes:[]};
  const B=[];let buf='',lk=0;
  const blk=function(kind,m,l,pre){const t=webPlain(m);const o={k:kind,t:(pre||'')+t,ld:t.length?Math.min(1,l/t.length):0};if(m!==t)o.m=(pre||'')+m;return o;};
  const emit=function(kind,t,l){const n=webPlain(t).length||1;t.split(/\n{2,}/).forEach(function(x){x=webClean(x);if(webPlain(x))B.push(blk(kind,x,l*webPlain(x).length/n));});};
  const flush=function(ctx){const raw=buf,l=lk;buf='';lk=0;if(!webClean(webPlain(raw)))return;
    let kind='p';if(ctx.q)kind='q';else if(ctx.li&&ctx.li.first){kind='li';ctx.li.first=false;raw.trim();}
    if(kind==='li')B.push(blk('li',webClean(raw).replace(/\n+/g,' '),l,ctx.li.n?ctx.li.n+'. ':'• '));else emit(kind,raw,l);};
  const abs=function(v){try{return new URL(v,base||undefined).href;}catch(e){return '';}};
  const walk=function(n,ctx){
    for(let c=n.firstChild;c;c=c.nextSibling){
      if(c.nodeType===3){const v=ctx.pre?c.nodeValue:c.nodeValue.replace(/\s+/g,' ');buf+=v;if(ctx.a)lk+=v.trim().length;continue;}
      if(c.nodeType!==1)continue;
      const tg=c.tagName;
      if(tg==='BR'){buf+='\n';continue;}
      if(tg==='IMG'){
        const ss=String(c.getAttribute('srcset')||c.getAttribute('data-srcset')||'').split(',').map(function(x){return x.trim().split(/\s+/)[0];}).filter(Boolean);
        const src=abs(c.getAttribute('data-src')||c.getAttribute('data-lazy-src')||c.getAttribute('data-original')||(ss.length?ss[ss.length-1]:'')||c.getAttribute('src')||'');
        if(webImgOk(src,c.getAttribute('alt'),+c.getAttribute('width')||0,+c.getAttribute('height')||0)){flush(ctx);B.push({k:'img',src:src});}
        continue;}
      if(c.hasAttribute('data-rqn')){buf+=webMk('n',c.getAttribute('data-rqn'),c.textContent);continue;}
      if(c.hasAttribute('data-rqfm')){if(c.getAttribute('data-rqfm')==='b'){flush(ctx);B.push({k:'fm',t:c.textContent});}else buf+=c.textContent;continue;}
      if(tg==='A'){const was=ctx.a;ctx.a=true;let ix=-1;const h=c.getAttribute('href')||'';
        if(!was&&!ctx.pre&&h&&h.charAt(0)!=='#'&&!/^(javascript|mailto|tel|data):/i.test(h)&&!/redlink=1/.test(h)&&!c.querySelector('img')&&webClean(c.textContent).length>1&&acc.links.length<3000){
          const u=abs(h);if(/^https?:\/\//i.test(u)){ix=acc.links.indexOf(u);if(ix<0){ix=acc.links.length;acc.links.push(u);}}}
        if(ix>=0)buf+=WEB_MO+'l'+ix+WEB_MM;walk(c,ctx);if(ix>=0)buf+=WEB_MC;ctx.a=was;continue;}
      if((tg==='B'||tg==='STRONG'||tg==='I'||tg==='EM')&&!ctx.pre){buf+=WEB_MO+(tg==='B'||tg==='STRONG'?'b':'i')+WEB_MM;walk(c,ctx);buf+=WEB_MC;continue;}
      if(tg==='TABLE'&&webTable(c,B,flush,ctx))continue;
      if(!WEB_BLOCK.test(tg)&&!/thumbcaption/.test(c.className||'')){walk(c,ctx);continue;}
      flush(ctx);
      if(/^H[1-6]$/.test(tg)){const t=webClean(c.textContent);if(t&&/[\p{L}\p{N}]/u.test(t))B.push({k:'h',lvl:+tg.charAt(1),t:t});continue;}
      if(tg==='FIGCAPTION'||/thumbcaption/.test(c.className||'')){const t=webClean(c.textContent);if(t)B.push({k:'cap',t:t});continue;}
      if(tg==='LI'){const ol=c.parentElement&&c.parentElement.tagName==='OL';
        const x={pre:ctx.pre,a:ctx.a,q:ctx.q,li:{first:true,n:ol?Array.prototype.indexOf.call(c.parentElement.children,c)+1:0}};walk(c,x);flush(x);continue;}
      if(tg==='TR'){const cells=Array.from(c.children).map(function(x){return webClean(x.textContent);}).filter(Boolean);
        if(cells.length){const t=cells.join(' · '),l=webClean(Array.from(c.querySelectorAll('a')).map(function(x){return x.textContent;}).join('')).length;B.push({k:'p',t:t,ld:Math.min(1,l/t.length)});}continue;}
      if(tg==='PRE'){const t=String(c.textContent||'').replace(/\r\n?/g,'\n').replace(/^\n+|\s+$/g,'');if(t.trim())B.push({k:'pre',t:t});continue;}
      if(tg==='BLOCKQUOTE'){const x={pre:ctx.pre,a:ctx.a,q:true,li:null};walk(c,x);flush(x);continue;}
      walk(c,ctx);flush(ctx);
    }
  };
  const ctx={pre:false,a:false,q:false,li:null};walk(root,ctx);flush(ctx);
  return B;
}
/* таблица с данными → строки {k:'tr',cells,hd,n}; таблица-вёрстка (одна колонка, вложенные таблицы, длинные тексты) разбирается как обычный текст */
function webTable(tb,B,flush,ctx){
  if(tb.querySelector('table'))return false;
  const trs=Array.from(tb.querySelectorAll('tr'));if(trs.length<2)return false;
  const rows=trs.map(function(tr){const cs=[];Array.from(tr.children).forEach(function(td){if(!/^T[DH]$/.test(td.tagName))return;
      cs.push({t:webClean(td.textContent).replace(/\n+/g,' '),th:td.tagName==='TH'});for(let k=1;k<Math.min(12,+td.getAttribute('colspan')||1);k++)cs.push({t:'',th:td.tagName==='TH'});});return cs;}).filter(function(r){return r.some(function(c){return c.t;});});
  const n=rows.reduce(function(m,r){return Math.max(m,r.length);},0);
  if(rows.length<2||n<2||n>12)return false;
  let sum=0,cnt=0,big=0;rows.forEach(function(r){r.forEach(function(c){if(c.t){sum+=c.t.length;cnt++;if(c.t.length>400)big++;}});});
  if(big||(cnt&&sum/cnt>160))return false;
  flush(ctx);
  const cap=tb.querySelector('caption');if(cap&&webClean(cap.textContent))B.push({k:'cap',t:webClean(cap.textContent)});
  const lk=webClean(Array.from(tb.querySelectorAll('a')).map(function(x){return x.textContent;}).join('')).length;
  rows.forEach(function(r,i){const cells=r.map(function(c){return c.t;});while(cells.length<n)cells.push('');
    B.push({k:'tr',cells:cells,n:n,hd:i===0&&(r.every(function(c){return c.th||!c.t;})||!!tb.querySelector('thead')),t:cells.filter(Boolean).join(' · '),ld:sum?Math.min(1,lk/sum):0});});
  return true;
}
/* уборка: что на странице не статья. trusted (Википедия, Викитека) — только повторы и пустое */
function webTidy(B,trusted){
  B=B.filter(function(x){return x.k==='img'||(x.t&&x.t.trim());});
  B=B.filter(function(x,i){const p=B[i-1];return !(p&&p.k===x.k&&p.k!=='img'&&p.t===x.t);});
  B.forEach(function(x){if(x.k==='h')x.t=x.t.replace(/^[▍▎▌█■□●○◆◇►▶▸•·#\s]+/,'')||x.t;}); /* «▍ Заголовок» на Хабре */
  const ends=function(L){ /* заголовок, под которым ничего не осталось; картинки и заголовки в самом конце */
    L=L.filter(function(x,i){const nx=L[i+1];return !(x.k==='h'&&(!nx||(nx.k==='h'&&nx.lvl<=x.lvl)));});
    while(L.length&&(L[L.length-1].k==='img'||L[L.length-1].k==='cap'||L[L.length-1].k==='h'))L.pop();return L;};
  if(trusted)return ends(ends(B));
  const isBody=function(x){return (x.k==='p'||x.k==='q')&&x.t.length>=140&&(x.ld||0)<0.3;};
  B=B.filter(function(x){return x.k==='img'||x.k==='pre'||x.k==='h'||x.k==='fm'||x.k==='tr'||!(WEB_JUNK.test(x.t)||(x.t.length<220&&/cookie|куки|файлы cookie/i.test(x.t)));});
  let first=B.findIndex(isBody),last=-1;for(let i=B.length-1;i>=0;i--)if(isBody(B[i])){last=i;break;}
  if(first<0)return B; /* стихи, короткие заметки, список заголовков: чистить нечего */
  /* хвост: «Комментарии», «Читайте также»… после середины статьи — до конца */
  for(let i=first+1;i<B.length;i++){const x=B[i];if(x.k==='h'&&i>=B.length*0.4&&WEB_TAIL.test(x.t)){B=B.slice(0,i);break;}
    if(x.k!=='h'&&i>last&&x.t&&x.t.length<60&&WEB_TAIL.test(x.t)){B=B.slice(0,i);break;}}
  /* пачки ссылок (меню, «похожие»): 3+ подряд коротких блоков-ссылок вне статьи, 6+ где угодно */
  const linky=function(x){return (x.k==='p'||x.k==='li')&&(x.ld||0)>0.75&&x.t.length<90;};
  const keep=B.map(function(){return true;});
  for(let i=0;i<B.length;){if(!linky(B[i])){i++;continue;}let j=i;while(j<B.length&&linky(B[j]))j++;
    const n=j-i,out=j<=first||i>last;if(n>=6||(n>=3&&out)||(out&&i>last))for(let k=i;k<j;k++)keep[k]=false;i=j;}
  /* над статьёй: счётчики, дата, «7 мин», имя автора — короткие строки без точки в конце */
  for(let i=0;i<first;i++){const x=B[i];if((x.k==='p'||x.k==='li'||x.k==='cap')&&x.t.length<60)keep[i]=false;}
  B=B.filter(function(x,i){return keep[i];});
  return ends(ends(B));
}
function webBlocksToBook(B,o){
  o=o||{};B=webTidy(B,o.trusted);
  let title=o.title||'';const h0=B.findIndex(function(x){return x.k==='h';}),b0=B.findIndex(function(x){return x.k!=='img'&&x.k!=='cap';});
  /* статья начинается с заголовка — он и есть название («Статья — Сайт» в <title>, <h1>Статья</h1>) */
  if(h0>=0&&h0===b0&&B[h0].t.length>3&&B[h0].t.length<=200&&(!o.titleFixed||B[h0].t===title)&&(B[h0].lvl===1||!title||title.indexOf(B[h0].t)>=0)){title=B[h0].t;B.splice(h0,1);}
  title=(title||o.site||'Страница').slice(0,200);
  const out=[],toc=[],imgs=[],f=[];let len=0;
  const KN={b:1,i:2,l:3,n:4};
  /* служебные знаки жирного/курсива/ссылок снимаются, их места уходят в f (смещения в тексте книги) */
  const push=function(t){
    if(t.indexOf(WEB_MO)>=0||t.indexOf(WEB_MC)>=0){let pl='';const st=[];
      const close=function(){const o=st.pop();if(o&&pl.length>o[1]&&pl.slice(o[1]).trim())f.push([len+o[1],pl.length-o[1],KN[o[0].charAt(0)]||1,o[0].length>1?+o[0].slice(1):0]);};
      for(let i=0;i<t.length;i++){const ch=t.charAt(i);
        if(ch===WEB_MO){const j=t.indexOf(WEB_MM,i);if(j<0)break;st.push([t.slice(i+1,j),pl.length]);i=j;}
        else if(ch===WEB_MC)close();else pl+=ch;}
      while(st.length)close();t=pl;}
    out.push(t);len+=t.length+2;};
  /* оглавление: верхний уровень заголовков; следующий тоже, если верхних меньше двух (или это Википедия) — остальные идут подзаголовками в тексте */
  const minLvl=B.reduce(function(m,x){return x.k==='h'?Math.min(m,x.lvl):m;},6),nTop=B.filter(function(x){return x.k==='h'&&x.lvl===minLvl;}).length;
  const tocLvl=o.trusted||nTop<2?minLvl+1:minLvl;
  B.forEach(function(x){
    if(x.k==='h'){if(x.lvl<=tocLvl){toc.push({t:x.t.slice(0,80),off:len});push(x.t);}else push(WEB_H2+x.t);}
    else if(x.k==='q')push(WEB_Q+(x.m||x.t));
    else if(x.k==='fm')push(WEB_FM+x.t);
    else if(x.k==='tr')push(WEB_TR+(x.hd?'\u2062':'')+x.cells.map(function(c){return c||WEB_NOCELL;}).join('\t'));
    else if(x.k==='cap')push(WEB_CAP+x.t);
    else if(x.k==='pre')push(x.t.split('\n').filter(function(l){return l.trim();}).map(function(l){return WEB_PRE+l.replace(/\t/g,'  ');}).join('\n'));
    else if(x.k==='img'){if(imgs.length<WEB_IMG_MAX&&imgs.indexOf(x.src)<0){push('￼img:'+imgs.length);imgs.push(x.src);}}
    else push(x.m||x.t);
  });
  f.sort(function(a,z){return a[0]-z[0]||z[1]-a[1];});
  return {title:title,author:o.site||'Сайт',text:out.join('\n\n'),toc:toc.length>1?toc:undefined,lang:o.lang||undefined,imgs:imgs,f:f,links:(o.acc&&o.acc.links)||[],notes:(o.acc&&o.acc.notes)||[]};
}
/* html (строка) → книга. Своя «Readability» на коротком поводке: <article>/<main> или блок, где больше всего текста в абзацах */
function webHtmlParse(html,url,opt,acc){
  opt=opt||{};acc=acc||{links:[],notes:[]};
  const doc=new DOMParser().parseFromString(String(html||''),'text/html');
  const meta=function(k){const m=doc.querySelector('meta[property="'+k+'"],meta[name="'+k+'"]');return m?webClean(m.getAttribute('content')):'';};
  let title=opt.title||meta('og:title')||webClean(doc.title)||'';
  const h1=doc.querySelector('h1');if(!title&&h1)title=webClean(h1.textContent);
  const site=meta('og:site_name')||webHost(url)||'Сайт';
  const lang=String(doc.documentElement.getAttribute('lang')||'').slice(0,2).toLowerCase();
  const next=opt.trusted?'':webNextUrl(doc,url);
  try{webNotesPrep(doc,acc);webMathPrep(doc);}catch(e){console.warn('[rq] web prep',e);}
  doc.querySelectorAll(WEB_DROP).forEach(function(n){n.remove();});
  let root=opt.root?doc.querySelector(opt.root):null;
  if(!root){
    const arts=Array.from(doc.querySelectorAll('article,main,[role=main],[itemprop=articleBody],.mw-parser-output,.post-content,.entry-content,.article-body,.article__text'));
    let best=null,bl=0;arts.forEach(function(a){const l=webClean(a.textContent).length;if(l>bl){bl=l;best=a;}});
    /* очки по абзацам: родителю весь текст абзаца, деду половину (как в Readability) */
    const sc=new Map();let top=null,tv=0;
    doc.querySelectorAll('p,pre,blockquote').forEach(function(p){const l=webClean(p.textContent).length;if(l<40)return;
      const a=p.parentElement,b=a&&a.parentElement;
      [[a,l],[b,l/2]].forEach(function(x){if(!x[0])return;const v=(sc.get(x[0])||0)+x[1];sc.set(x[0],v);if(v>tv){tv=v;top=x[0];}});});
    root=best&&(!top||bl>=tv*0.8)?best:(top||doc.body);
  }
  if(!root)root=doc.body||doc.documentElement;
  const B=webHtmlBlocks(root,url,acc);
  return {B:B,title:title,site:site,lang:lang,next:next,acc:acc};
}
function webHtmlToBook(html,url,opt,more){
  opt=opt||{};const P=webHtmlParse(html,url,opt);let B=P.B;
  /* продолжение статьи (страницы 2, 3…): блоки дописываются, повторы (шапка, название) уходят */
  (more||[]).forEach(function(h){const seen=new Set(B.filter(function(x){return x.t&&x.t.length>30;}).map(function(x){return x.t;}));
    const X=webTidy(webHtmlParse(h.html,h.url,opt,P.acc).B,false).filter(function(x){return !(x.k==='h'&&(x.lvl===1||x.t===P.title))&&!(x.t&&seen.has(x.t));});
    B=B.concat(X);});
  /* <title> «Статья — Сайт», а в тексте <h1>Статья</h1>: название — заголовок */
  const fh=B.find(function(x){return x.k==='h';});
  const r=webBlocksToBook(B,{title:P.title,titleFixed:!!opt.title&&!(fh&&fh.t===opt.title),site:P.site,lang:P.lang,trusted:!!opt.trusted,acc:P.acc});
  r.next=P.next;return r;
}

/* MHTML («Скачать страницу» в Chrome на Android): письмо из частей, берём первую text/html; quoted-printable или base64 */
function webBin(buf){const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return s;}
function webBytes(s){const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i)&255;return u;}
function webDecode(bytes,cs){try{return new TextDecoder(cs||'utf-8').decode(bytes);}catch(e){return new TextDecoder('utf-8').decode(bytes);}}
function webMhtml(bin){
  const head=bin.slice(0,4000),bm=/boundary="?([^";\r\n]+)"?/i.exec(head),loc=/Snapshot-Content-Location:\s*(\S+)/i.exec(head);
  const url=loc?loc[1]:'';
  if(!bm)throw new Error('файл страницы повреждён');
  const parts=bin.split('--'+bm[1]);
  for(const p of parts){
    const i=p.search(/\r?\n\r?\n/);if(i<0)continue;
    const h=p.slice(0,i);if(!/Content-Type:\s*text\/html/i.test(h))continue;
    let body=p.slice(i).replace(/^\r?\n\r?\n/,'');
    const enc=(/Content-Transfer-Encoding:\s*([\w-]+)/i.exec(h)||[])[1]||'',cs=(/charset="?([\w-]+)/i.exec(h)||[])[1]||'utf-8';
    let bytes;
    if(/quoted-printable/i.test(enc)){body=body.replace(/=\r?\n/g,'');bytes=webBytes(body.replace(/=([0-9A-F]{2})/gi,function(m,x){return String.fromCharCode(parseInt(x,16));}));}
    else if(/base64/i.test(enc))bytes=webBytes(atob(body.replace(/\s+/g,'')));
    else bytes=webBytes(body);
    return {html:webDecode(bytes,cs),url:url};
  }
  throw new Error('в файле нет страницы');
}
/* .html/.htm/.mhtml/.mht → книга (вызывается из importBookFile в library.js) */
async function webFileBook(f){
  const bin=webBin(await f.arrayBuffer());
  let html,url='';
  if(/\.mht(ml)?$/i.test(f.name)){const r=webMhtml(bin);html=r.html;url=r.url;}
  else{const cs=(/<meta[^>]+charset=["']?([\w-]+)/i.exec(bin.slice(0,4096))||[])[1]||'utf-8';html=webDecode(webBytes(bin),cs);
    const sv=/<!-- saved from url=\(\d+\)(\S+) -->/.exec(bin.slice(0,600))||/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i.exec(html.slice(0,20000));if(sv)url=sv[1];}
  const r=webHtmlToBook(html,url);
  if(!r.title||r.title===webHost(url))r.title=f.name.replace(/\.(html?|mht(ml)?)$/i,'');
  const b=webMakeBook(r,webNorm(url),f.name,f.size);
  await webStoreImgs(b.id,b.webImgs,b.text);
  await webxSave(b.id,b.webX);
  return b;
}
function webMakeBook(r,url,fname,size){
  /* название читалка сама пишет над текстом — в самом тексте его не повторяем */
  if(r.title&&r.text&&r.text.indexOf(r.title+'\n\n')===0){const d=r.title.length+2;r.text=r.text.slice(d);if(r.toc){r.toc=r.toc.map(function(x){return {t:x.t,off:Math.max(0,x.off-d)};});}
    if(r.f)r.f=r.f.map(function(x){return [x[0]-d,x[1],x[2],x[3]];}).filter(function(x){return x[0]>=0;});}
  if(!r.text||r.text.length<WEB_MIN)throw new Error('на странице почти нет текста');
  const b={id:newBookId(),title:r.title,author:r.author||'Сайт',genre:'Сайт',stat:'Воля',cover:'',text:r.text,toc:r.toc,lang:r.lang||undefined,
    fname:fname||((webHost(url)||'sait')+'-'+String(r.title).replace(/[^\p{L}\p{N}]+/gu,'-').slice(0,60)+'.txt'),size:size||r.text.length};
  if(url)b.srcId='web:'+url;
  Object.defineProperty(b,'webImgs',{value:r.imgs||[],enumerable:false}); /* не поле книги: только чтобы забрать картинки при добавлении */
  Object.defineProperty(b,'webX',{value:{v:1,len:r.text.length,f:(r.f||[]).filter(function(x){return x[0]+x[1]<=r.text.length;}),l:r.links||[],n:r.notes||[],im:r.imgs||[],pages:r.pages||1},enumerable:false,writable:true}); /* тоже не поле книги: запись IDB «webx:<книга>» */
  return b;
}

/* ---- загрузка по ссылке ---- */
/* Википедия и Викитека: MediaWiki API открыт для всех (origin=*), сама страница — нет */
function webWiki(u){const m=/^https?:\/\/([a-z\-]+)\.(?:m\.)?(wikipedia|wikisource)\.org\/wiki\/([^?#]+)/i.exec(u);
  return m?{lang:m[1],ws:m[2].toLowerCase()==='wikisource',host:m[1]+'.'+m[2].toLowerCase()+'.org',page:decodeURIComponent(m[3])}:null;}
async function webGetWiki(w,u){
  const api='https://'+w.host+'/w/api.php?action=parse&format=json&formatversion=2&origin=*&redirects=1&disableeditsection=1&prop=text%7Cdisplaytitle&page='+encodeURIComponent(w.page);
  const res=await fetch(api);if(!res.ok)throw new Error('Википедия ответила '+res.status);
  const j=await res.json();if(j.error)throw new Error(j.error.code==='missingtitle'?'такой страницы нет':j.error.info||'ошибка '+w.host);
  const title=webClean(new DOMParser().parseFromString(j.parse.displaytitle||j.parse.title,'text/html').body.textContent);
  const r=webHtmlToBook('<html lang="'+w.lang+'"><body>'+j.parse.text+'</body></html>',u,{title:title,root:'.mw-parser-output',trusted:true});
  r.author=w.ws?(w.lang==='ru'?'Викитека':'Wikisource'):(w.lang==='ru'?'Википедия':'Wikipedia');r.lang=w.lang;
  if(w.ws)return r; /* в Викитеке примечания — часть текста */
  /* хвост «Примечания / Литература / Ссылки» — не чтение */
  const cut=(r.toc||[]).find(function(x){return /^(Примечания|Литература|Ссылки|Источники|См\. также|References|Notes|External links|See also|Further reading)$/i.test(x.t);});
  if(cut){r.text=r.text.slice(0,cut.off).replace(/\s+$/,'');r.f=(r.f||[]).filter(function(x){return x[0]+x[1]<=r.text.length;});r.toc=r.toc.filter(function(x){return x.off<cut.off;});if(r.toc.length<2)r.toc=undefined;}
  return r;
}
async function webGetDirect(u){
  let res;
  try{res=await fetch(u,{credentials:'omit',redirect:'follow'});}catch(e){const x=new Error('nocors');x.nocors=true;throw x;}
  if(!res.ok)throw new Error('сайт ответил '+res.status);
  const ct=(res.headers.get('content-type')||'').toLowerCase();
  if(/pdf|epub|fictionbook|zip/.test(ct)||/\.(pdf|epub|fb2|zip)$/i.test(new URL(res.url||u).pathname)){
    const blob=await res.blob(),nm=decodeURIComponent((new URL(res.url||u).pathname.split('/').pop())||'kniga');
    return {file:new File([blob],nm,{type:blob.type||ct})};}
  const body=await res.text();
  if(/^text\/plain/.test(ct))return {title:decodeURIComponent(new URL(u).pathname.split('/').pop()||webHost(u)),author:webHost(u),text:body.replace(/\r\n?/g,'\n').trim()};
  const first=res.url||u,P0=webHtmlParse(body,first,{});
  const more=[];let nx=P0.next;const seen=[webNorm(first),webNorm(u)];
  while(nx&&more.length<WEB_PAGES-1&&seen.indexOf(webNorm(nx))<0){
    seen.push(webNorm(nx));webStep('Загружаю страницу '+(more.length+2)+'…');
    let h='';try{const r2=await fetch(nx,{credentials:'omit',redirect:'follow'});if(!r2.ok)break;h=await r2.text();}catch(e){break;}
    const P=webHtmlParse(h,nx,{});if(webTidy(P.B,false).filter(function(x){return x.t;}).map(function(x){return x.t;}).join('').length<WEB_MIN)break;
    more.push({html:h,url:nx});nx=P.next;}
  const r=webHtmlToBook(body,first,{},more);r.pages=more.length+1;return r;
}
/* Jina Reader отдаёт «Title: …\nURL Source: …\nMarkdown Content:\n<markdown>» — markdown в чистый текст, заголовки в оглавление */
async function webGetJina(u){
  let res;try{res=await fetch(WEB_JINA+u,{credentials:'omit'});}catch(e){throw new Error(navigator.onLine===false?'нет сети':'служба Jina Reader не ответила');}
  if(res.status===429)throw new Error('служба Jina Reader занята, попробуйте через минуту');
  if(!res.ok)throw new Error('служба Jina Reader не смогла открыть эту страницу (код '+res.status+')');
  const raw=await res.text();
  const tm=/^Title:\s*(.*)$/m.exec(raw),i=raw.indexOf('Markdown Content:');
  let md=i>=0?raw.slice(i+17):raw,pages=1;
  /* продолжение статьи: «[Далее](…?page=2)» — до WEB_PAGES_JINA страниц, каждая отдельным запросом к службе */
  const seen=[webNorm(u)];let cur=u,part=md;
  while(pages<WEB_PAGES_JINA){
    let nx='';part.replace(/\[([^\[\]]{0,24})\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]{0,40})")?\)/g,function(m,t,h,ti){
      const ok=[t,ti].some(function(v){v=webClean(webPlain(v||'')).replace(/^[←→»«›‹<>\s]+(?=\S{2})|(?<=\S{2})[\s←→»«›‹<>]+$/g,'');return v&&WEB_NEXT.test(v);});
      if(!nx&&ok&&webPagey(cur,h)&&seen.indexOf(webNorm(h))<0)nx=h;return m;});
    if(!nx)break;seen.push(webNorm(nx));webStep('Загружаю страницу '+(pages+1)+'…');
    let r2;try{r2=await fetch(WEB_JINA+nx,{credentials:'omit'});if(!r2.ok)break;}catch(e){break;}
    const raw2=await r2.text(),k=raw2.indexOf('Markdown Content:');part=k>=0?raw2.slice(k+17):raw2;if(webPlain(part).trim().length<WEB_MIN)break;
    md+='\n\n\uE00F\n\n'+part;cur=nx;pages++;}
  const r=webMdToBook(md,tm?tm[1].trim():'',u);r.pages=pages;return r;
}
function webMdBlocks(md,acc){
  const B=[];let para=[],q=false;
  /* картинки и ссылки бывают вложенными: [![картинка](a)](b), [[1]](#cite) — снимаем в два прохода, сноски [1] убираем */
  const IMG=/!\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\(((?:[^()\s]|\([^()]*\))*)[^)]*\)/g,LNK=/\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\(((?:[^()\s]|\([^()]*\))*)(?:\s[^)]*)?\)/g;
  /* rich: ссылки, жирный и курсив остаются служебными знаками (webMk); inl: голый текст */
  const rich=function(s){
    for(let k=0;k<2;k++)s=s.replace(IMG,'').replace(LNK,function(m,t,h){
      if(!webPlain(t).trim())return '';if(!/^https?:\/\//i.test(h)||t.indexOf(WEB_MO+'l')>=0||webPlain(t).trim().length<2||acc.links.length>=3000)return t;
      let ix=acc.links.indexOf(h);if(ix<0){ix=acc.links.length;acc.links.push(h);}return webMk('l',ix,t);});
    s=s.replace(/\[\d{1,3}\]|\[(?:прим|нет АИ|источник не указан)[^\]]*\]/g,'').replace(/<[^>]+>/g,'').replace(/`/g,'');
    s=s.replace(/(\*\*|__)(?=\S)([^*_]*?\S)\1/g,function(m,a,t){return webMk('b','',t);}).replace(/(\*\*|__)/g,'');
    return s.replace(/(^|[\s(«"„])([*_])(?=\S)([^*_]*?\S)\2(?=\s|$|[.,;:!?)»"“])/g,function(m,p,a,t){return p+webMk('i','',t);});};
  const inl=function(s){return webPlain(rich(s));};
  const ldOf=function(raw){let l=0;const s=raw.replace(IMG,'');s.replace(LNK,function(m,t){l+=webClean(inl(t)).length;return m;});const t=webClean(inl(raw));return t.length?Math.min(1,l/t.length):0;};
  const imgsOf=function(raw){raw.replace(IMG,function(m,alt,src){alt=String(alt).replace(/^Image \d+:?\s*/i,'');if(webImgOk(src,alt,0,0))B.push({k:'img',src:src});return m;});};
  const blk=function(kind,raw,pre){const m=webClean(rich(raw)),t=webPlain(m);if(!t.trim())return null;const o={k:kind,t:(pre||'')+t,ld:ldOf(raw)};if(m!==t)o.m=(pre||'')+m;return o;};
  const flush=function(){if(!para.length)return;const raw=para.join(' ');para=[];imgsOf(raw);const o=blk(q?'q':'p',raw);if(o)B.push(o);q=false;};
  const lines=String(md).replace(/\r\n?/g,'\n').split('\n');
  for(let k=0;k<lines.length;k++){let s=lines[k];
    if(/^\s*(```|~~~)/.test(s)){flush();const code=[];k++;while(k<lines.length&&!/^\s*(```|~~~)/.test(lines[k]))code.push(lines[k++]);if(code.join('').trim())B.push({k:'pre',t:code.join('\n')});continue;}
    if(/^\s*\$\$/.test(s)){flush();let t=s.replace(/^\s*\$\$/,'');while(!/\$\$\s*$/.test(t)&&k+1<lines.length&&t.length<2000)t+=' '+lines[++k];t=webTex(t.replace(/\$\$\s*$/,''));if(t)B.push({k:'fm',t:t});continue;}
    if(/^\s*$/.test(s)){flush();continue;}
    if(/^\s*(={3,}|-{3,}|\*{3,})\s*$/.test(s)){ /* setext: строка выше — заголовок */
      if(para.length&&/^=|^-/.test(s.trim())){const t=webClean(inl(para.join(' ')));para=[];if(t&&/[\p{L}\p{N}]/u.test(t))B.push({k:'h',lvl:s.trim().charAt(0)==='='?1:2,t:t});}else flush();continue;}
    if(/^\s*\|/.test(s)){flush(); /* таблица: строки подряд; «| --- |» после первой строки — у таблицы есть шапка */
      const rows=[];let hd=false,l=0,sum=0;
      for(;k<lines.length&&/^\s*\|/.test(lines[k]);k++){const x=lines[k];if(/^\s*\|[\s|:-]+\|?\s*$/.test(x)){if(rows.length===1)hd=true;continue;}
        const cells=x.trim().replace(/^\||\|$/g,'').split('|').map(function(c){return webClean(inl(c)).replace(/\n+/g,' ');});if(cells.some(Boolean)){rows.push(cells);l+=ldOf(x)*cells.join('').length;sum+=cells.join('').length;}}
      k--;
      const n=rows.reduce(function(m,r){return Math.max(m,r.length);},0),avg=sum/Math.max(1,rows.reduce(function(m,r){return m+r.filter(Boolean).length;},0));
      rows.forEach(function(r,i){while(r.length<n)r.push('');const t=r.filter(Boolean).join(' · ');
        if(rows.length>=2&&n>=2&&n<=12&&avg<=160)B.push({k:'tr',cells:r,n:n,hd:hd&&i===0,t:t,ld:sum?Math.min(1,l/sum):0});else B.push({k:'p',t:t,ld:sum?Math.min(1,l/sum):0});});
      continue;}
    const h=/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(s);
    if(h){flush();const t=webClean(inl(h[2]));imgsOf(h[2]);if(t&&/[\p{L}\p{N}]/u.test(t))B.push({k:'h',lvl:h[1].length,t:t});continue;}
    const li=/^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/.exec(s);
    if(li){flush();imgsOf(li[3]);const o=blk('li',li[3],li[2]?li[2]+'. ':'• ');if(o)B.push(o);continue;}
    if(/^\s*>/.test(s)){if(!para.length)q=true;s=s.replace(/^\s*>\s?/,'');if(!s.trim()){flush();continue;}}
    if(/^\s*https?:\/\/\S+\s*$/.test(inl(s)))continue;
    para.push(s);
  }
  flush();
  return B;
}
/* markdown от Jina Reader → книга; страницы продолжения разделены знаком U+E00F */
function webMdToBook(md,title,u){
  const acc={links:[],notes:[]},parts=String(md).split('');
  let B=webMdBlocks(parts[0],acc);
  parts.slice(1).forEach(function(pt){const seen=new Set(B.filter(function(x){return x.t&&x.t.length>30;}).map(function(x){return x.t;}));
    B=B.concat(webTidy(webMdBlocks(pt,acc),false).filter(function(x){return !(x.k==='h'&&(x.lvl===1||x.t===title))&&!(x.t&&seen.has(x.t));}));});
  const r=webBlocksToBook(B,{title:title,site:webHost(u),acc:acc});
  if(!r.title||r.title==='Страница')r.title=webHost(u);
  return r;
}
/* картинки статьи: забираем те, что сайт отдаёт приложению (CORS), в IDB «img:<книга>:<n>» — как у FB2 и EPUB; остальные абзацы-картинки читалка прячет */
async function webStoreImgs(id,imgs,text){
  if(typeof idbPut!=='function')return 0;let ok=0;
  for(let n=0;n<WEB_IMG_MAX;n++){try{await idbDel('img:'+id+':'+n);}catch(e){}}
  if(navigator.onLine===false)return 0;
  await Promise.all((imgs||[]).map(async function(src,n){
    if(text&&text.indexOf('￼img:'+n)<0)return;
    try{const ac=new AbortController(),tm=setTimeout(function(){ac.abort();},8000);
      const res=await fetch(src,{mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',signal:ac.signal});
      const blob=res.ok?await res.blob():null;clearTimeout(tm);
      if(!blob||!/^image\/(jpeg|png|webp|gif|avif)/.test(blob.type)||blob.size<2500||blob.size>2000000)return;
      await idbPut('img:'+id+':'+n,blob);ok++;}catch(e){}}));
  return ok;
}

/* ---- запись «webx:<книга>» в IDB: {v:1,len,f:[[начало,длина,вид,номер]],l:[ссылки],n:[сноски],im:[адреса картинок],pages,cut:[убранные куски]} ----
   Не поле книги и не часть сохранения (как картинки): без неё страница читается простым текстом, «Обновить с сайта» создаёт её заново. */
const WEBX={};
async function webxLoad(id){if(WEBX[id]!==undefined)return WEBX[id];let v=null;try{v=typeof idbGet==='function'?await idbGet('webx:'+id):null;}catch(e){}
  WEBX[id]=v&&typeof v==='object'&&Array.isArray(v.f)?v:null;return WEBX[id];}
async function webxSave(id,x){WEBX[id]=x||null;try{if(x)await idbPut('webx:'+id,x);else await idbDel('webx:'+id);}catch(e){console.warn('[rq] webx',e);}}
async function webxDel(id){delete WEBX[id];try{await idbDel('webx:'+id);}catch(e){}}
/* абзац страницы сайта → HTML с жирным, курсивом, ссылками и сносками (зовёт rqBodyHtml, js/reader.js). Запись не от этого текста → простой текст */
function webParaHtml(b,off,s){
  const x=WEBX[b.id];if(!x||!x.f.length||x.len!==(b.text||'').length)return esc(s);
  const end=off+s.length,f=x.f;let lo=0,hi=f.length;while(lo<hi){const m=(lo+hi)>>1;if(f[m][0]<off-4000)lo=m+1;else hi=m;}
  const R=[];for(let i=lo;i<f.length&&f[i][0]<end;i++){if(f[i][0]+f[i][1]>off)R.push(f[i]);}
  if(!R.length)return esc(s);
  const cut=[0,s.length];R.forEach(function(r){cut.push(Math.max(0,r[0]-off),Math.min(s.length,r[0]+r[1]-off));});
  const pts=Array.from(new Set(cut)).sort(function(a,z){return a-z;}),lon=webLinksOn();let h='';
  for(let i=0;i+1<pts.length;i++){const a=pts[i],z=pts[i+1];let t=esc(s.slice(a,z)),bd=false,it=false,l=-1,n=-1;
    R.forEach(function(r){if(r[0]-off<=a&&r[0]+r[1]-off>=z){if(r[2]===1)bd=true;else if(r[2]===2)it=true;else if(r[2]===3)l=r[3];else if(r[2]===4)n=r[3];}});
    if(it)t='<i>'+t+'</i>';if(bd)t='<b>'+t+'</b>';
    if(n>=0)t='<sup class="rq-wn" data-n="'+n+'">'+t+'</sup>';else if(l>=0&&lon)t='<span class="rq-wl" data-l="'+l+'">'+t+'</span>';
    h+=t;}
  return h;
}
/* картинка, которую сайт не дал сохранить: пока есть сеть, показываем её прямо с сайта; без сети — строка «Картинка: открыть на сайте» */
function webImgFallback(b,im){
  const x=WEBX[b.id],src=x&&x.im&&x.im[+im.dataset.img];if(!src)return null;
  const line=function(){const p=im.parentNode;if(!p)return;p.classList.remove('rq-img');p.classList.add('rq-wp','rq-noimg');p.setAttribute('data-src',src);p.textContent='Картинка не сохранилась: открыть на сайте';};
  if(navigator.onLine===false){line();return Promise.resolve();}
  return new Promise(function(res){let done=false;const fin=function(ok){if(done)return;done=true;clearTimeout(tm);if(!ok)line();res();};
    const tm=setTimeout(function(){im.onload=im.onerror=null;im.removeAttribute('src');fin(false);},7000);
    im.onload=function(){fin(im.naturalWidth>=40);};im.onerror=function(){fin(false);};
    im.referrerPolicy='no-referrer';im.src=src;});
}
/* нажатие в чтении: сноска — где угодно (как сноски в PDF); ссылка и строка картинки — в средней части экрана, по краям нажатие листает, как всегда */
function webPop(html,x,y){
  const d=el('rmNote');if(!d)return false;d.innerHTML=html;d.hidden=false;const H=innerHeight,h=d.offsetHeight;
  d.style.top=(y>H*0.55?Math.max(8,y-h-18):Math.min(H-h-8,y+22))+'px';
  const xb=el('rmNoteX');if(xb)xb.onclick=function(e){e.stopPropagation();rmFnHide();};return true;
}
function webHit(cx,cy,sel,pad){
  let t=document.elementFromPoint(cx,cy);t=t&&t.closest?t.closest(sel):null;if(t||!pad)return t;
  let best=null,bd=Infinity;document.querySelectorAll('#content '+sel).forEach(function(s){Array.from(s.getClientRects()).forEach(function(r){if(!r.width)return;
    const dx=Math.max(r.left-cx,0,cx-r.right),dy=Math.max(r.top-cy,0,cy-r.bottom),d=Math.hypot(dx,dy);if(d<=pad&&d<bd){bd=d;best=s;}});});
  return best;
}
function webTapAt(cx,cy){
  if(typeof R==='undefined'||!R||!R.book||R.mode!=='text'||!rqIsWebBook(R.book))return false;
  if((typeof SM!=='undefined'&&SM.on)||(typeof selText==='function'&&selText()))return false;
  const x=WEBX[R.book.id];
  const n=x&&webHit(cx,cy,'sup.rq-wn',10);
  if(n){const t=x.n[+n.dataset.n];if(!t)return false;
    return webPop('<div class="rmnh">'+rqIcon('notebook-pen',16)+'<b>Сноска '+esc(n.textContent.replace(/[\[\]]/g,''))+'</b><button type="button" class="closes" id="rmNoteX" aria-label="Закрыть">'+rqIcon('x',20)+'</button></div><div class="rmnb">'+esc(t)+'</div>',cx,cy);}
  const a=x&&webLinksOn()&&webHit(cx,cy,'span.rq-wl');
  if(a){const u=x.l[+a.dataset.l];if(!u)return false;
    let t=a.textContent;for(let s=a.nextElementSibling;s&&s.matches('span.rq-wl')&&s.dataset.l===a.dataset.l;s=s.nextElementSibling)t+=s.textContent;
    webLinkPop(u,t,cx,cy,false);return true;}
  /* строка вместо картинки занимает всю ширину: по краям экрана нажатие листает, как всегда */
  const r=el('viewer').getBoundingClientRect(),z=typeof tapZone==='function'?tapZone((cx-r.left)/r.width,(cy-r.top)/r.height):'c';
  if(z==='l'||z==='r'||z==='tl'||z==='tr')return false;
  const ni=webHit(cx,cy,'p.rq-noimg');
  if(ni){webLinkPop(ni.getAttribute('data-src'),'Картинка',cx,cy,true);return true;}
  return false;
}
/* «Ссылки в тексте» можно выключить (в Википедии ссылка почти в каждой строке): SET.webLinks===0 — без подчёркивания и без нажатий (arch.md 13.11) */
function webLinksOn(){return !(typeof SET!=='undefined'&&SET&&SET.webLinks===0);}
function webLinksSet(on){if(typeof SET==='undefined'||!SET)return;if(on)delete SET.webLinks;else SET.webLinks=0;if(typeof saveSet==='function')saveSet();}
function webLinksTgl(id){webLinksSet(!webLinksOn());try{bookInfo(id);}catch(e){}}
function webLinkPop(u,label,cx,cy,img){
  const own=!img&&webOnShelf(webNorm(u));
  webPop('<div class="rmnh">'+rqIcon(img?'image':'compass',16)+'<b>'+esc(img?'Картинка':'Ссылка')+'</b><button type="button" class="closes" id="rmNoteX" aria-label="Закрыть">'+rqIcon('x',20)+'</button></div>'+
    '<div class="rmnb weblp">'+(img?'':'<div class="weblpt">'+esc(String(label).slice(0,140))+'</div>')+'<div class="weblpu">'+esc(webHost(u)+decodeURI(new URL(u).pathname).slice(0,70))+'</div>'+
    (img?'':'<button type="button" class="cta" id="webLpAdd">'+rqIcon(own?'book-open':'plus',18)+(own?' Читать: уже на полке':' Добавить на полку')+'</button>')+
    '<a class="buy advwant" id="webLpOpen" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+rqIcon('compass',18)+' Открыть в браузере</a></div>',cx,cy);
  const ad=el('webLpAdd');
  if(ad)ad.onclick=function(e){e.stopPropagation();rmFnHide();
    if(own){openBook(own.id);return;}
    webSheet({url:u,go:true});};
  el('webLpOpen').onclick=function(e){e.stopPropagation();setTimeout(rmFnHide,50);};
}
if(typeof viewerTap==='function'){const t0=viewerTap;viewerTap=function(cx,cy){
  if(typeof RM!=='undefined'&&RM.fnClosedAt&&Date.now()-RM.fnClosedAt<350)return t0.apply(this,arguments);
  try{if(webTapAt(cx,cy))return;}catch(e){console.warn('[rq] web tap',e);}
  return t0.apply(this,arguments);};}

/* ---- «Убрать лишнее» и «Ссылки из статьи» (карточка страницы) ----
   Убранные абзацы вырезаются из текста книги (как «Обновить с сайта», текст пишется заново), их начала запоминаются в записи webx (cut),
   чтобы «Обновить с сайта» не вернуло их обратно. */
function webParas(text){const out=[];const re=/\n{2,}/g;let a=0,m;while((m=re.exec(text))){if(m.index>a)out.push({off:a,end:m.index+m[0].length,s:text.slice(a,m.index)});a=m.index+m[0].length;}
  if(a<text.length)out.push({off:a,end:text.length,s:text.slice(a)});return out;}
function webCutKey(s){return String(s).replace(/[\u2060-\u2064]/g,'').replace(/\s+/g,' ').trim().slice(0,80);}
/* вырезать абзацы, для которых drop(абзац) — правда; r = {text,toc,f}. Возвращает map(смещение) для переноса места чтения */
function webDropParas(r,drop){
  const ps=webParas(r.text),cuts=[];ps.forEach(function(p){if(drop(p))cuts.push([p.off,p.end]);});
  if(!cuts.length)return null;
  const map=function(o){let d=0;for(const c of cuts){if(o>=c[1])d+=c[1]-c[0];else if(o>=c[0])return -1;else break;}return o-d;};
  let t='',a=0;cuts.forEach(function(c){t+=r.text.slice(a,c[0]);a=c[1];});t+=r.text.slice(a);
  const trimmed=t.replace(/\s+$/,'');
  if(r.toc)r.toc=r.toc.map(function(x){const o=map(x.off);return o<0||o>=trimmed.length?null:{t:x.t,off:o};}).filter(Boolean);
  if(r.toc&&r.toc.length<2)r.toc=undefined;
  if(r.f)r.f=r.f.map(function(x){const o=map(x[0]);return o<0||o+x[1]>trimmed.length?null:[o,x[1],x[2],x[3]];}).filter(Boolean);
  r.text=trimmed;return map;
}
function webApplyCuts(r,cut){if(!cut||!cut.length)return;const set=new Set(cut);webDropParas(r,function(p){return set.has(webCutKey(p.s));});}
async function webBookText(b){let t=b.text;if(typeof t!=='string'||!t){try{t=await __rq.idb.getText(b.id);}catch(e){t='';}}return t||'';}
async function webCutSheet(id){
  const b=(S.userBooks||[]).find(function(x){return x&&x.id===id;});if(!b)return;
  const text=await webBookText(b),ps=webParas(text),toc=new Set((b.toc||[]).map(function(x){return x.off;}));
  const pick=new Set();
  el('bookSheetBody').innerHTML='<div class="bk-head"><div class="cover webcov">'+rqIcon('circle-minus',34)+'</div><div class="bk-ttl"><b>Убрать лишнее</b><div class="bk-sub">'+esc(b.title)+'</div></div></div>'+
    '<div class="bk-note">Нажмите на куски, которые не относятся к статье: остатки меню, реклама, подписи. Они уберутся из этой страницы насовсем и не вернутся после «Обновить с сайта».</div>'+
    '<div class="webcutl" id="webCutL">'+ps.map(function(p,i){const im=/^\uFFFCimg:(\d+)$/.exec(p.s),c0=p.s.charCodeAt(0),c1=p.s.charCodeAt(1);
      const kind=im?'Картинка '+(+im[1]+1):toc.has(p.off)||c0===0x2062?'Заголовок':c0===0x2064&&c1===0x2062?'Таблица':c0===0x2064&&c1===0x2061?'Формула':c0===0x2064?'Подпись':'';
      const t=im?'':webCutKey(p.s.replace(/\t/g,' · ')).slice(0,110)+(p.s.length>110?'…':'');
      return '<button type="button" class="webcut'+(toc.has(p.off)?' wch':'')+'" data-i="'+i+'" aria-pressed="false">'+(kind?'<span class="wck">'+kind+'</span>':'')+'<span class="wct">'+esc(t)+'</span></button>';}).join('')+'</div>'+
    '<button type="button" class="cta webcutgo" id="webCutGo" disabled>Отметьте лишние куски</button>'+
    '<button type="button" class="buy advwant" id="webCutBack">'+rqIcon('arrow-left',18)+' Назад к странице</button>';
  el('bookSheet').classList.remove('hidden');el('bookSheet').scrollTop=0;
  const go=el('webCutGo');
  el('webCutL').onclick=function(e){const bt=e.target.closest('.webcut');if(!bt)return;const i=+bt.dataset.i;if(pick.has(i))pick.delete(i);else pick.add(i);
    bt.classList.toggle('on',pick.has(i));bt.setAttribute('aria-pressed',pick.has(i));go.disabled=!pick.size;go.textContent=pick.size?'Убрать отмеченное: '+pick.size:'Отметьте лишние куски';};
  el('webCutBack').onclick=function(){bookInfo(id);};
  go.onclick=async function(){
    if(!pick.size||WEB.busy)return;
    if(typeof R!=='undefined'&&R&&R.book&&R.book.id===id){flashMsg('Закройте страницу, потом уберите лишнее','info');return;}
    if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне','info');return;}
    if(text.length-Array.from(pick).reduce(function(m,i){return m+ps[i].s.length;},0)<WEB_MIN){flashMsg('Так от страницы почти ничего не останется','info');return;}
    WEB.busy=true;go.disabled=true;
    try{
      const x=(await webxLoad(id))||{v:1,len:text.length,f:[],l:[],n:[],im:[],pages:1};
      const offs=new Set(Array.from(pick).map(function(i){return ps[i].off;})),keys=Array.from(pick).map(function(i){return webCutKey(ps[i].s);}).filter(function(k){return k.length>=3&&!/^\uFFFCimg/.test(k);});
      const r={text:text,toc:b.toc?b.toc.slice():undefined,f:x.len===text.length?x.f:[]};
      const map=webDropParas(r,function(p){return offs.has(p.off);});if(!map)return;
      const p=S.progress[id];
      if(p&&typeof p.pos==='number'){let o=Math.floor(p.pos*text.length),m=map(o);while(m<0&&o>0){o-=40;m=map(Math.max(0,o));}p.pos=Math.min(1,Math.max(0,(m<0?0:m)/Math.max(1,r.text.length)));if(!(p.ratio>=p.pos))p.ratio=p.pos;}
      b.text=r.text;b.toc=r.toc;b.size=r.text.length;
      await __rq.upsertUserBook(null,b,{text:r.text});
      x.f=r.f;x.len=r.text.length;x.cut=(x.cut||[]).concat(keys).slice(-400);await webxSave(id,x);
      save();try{renderLibrary();}catch(e){}
      flashMsg('Убрано: '+pick.size,'info');bookInfo(id);
    }catch(e){console.warn('[rq] web cut',e);flashMsg('Не получилось: '+(e&&e.message||e),'info');}
    finally{WEB.busy=false;}
  };
}
async function webLinksSheet(id){
  const b=(S.userBooks||[]).find(function(x){return x&&x.id===id;});if(!b)return;
  const x=await webxLoad(id),text=await webBookText(b),seen=new Set(),L=[];
  if(x&&x.len===text.length)x.f.forEach(function(r){if(r[2]!==3||seen.has(r[3])||!x.l[r[3]])return;seen.add(r[3]);L.push({u:x.l[r[3]],t:text.substr(r[0],r[1]).replace(/\s+/g,' ')});});
  el('bookSheetBody').innerHTML='<div class="bk-head"><div class="cover webcov">'+rqIcon('compass',34)+'</div><div class="bk-ttl"><b>Ссылки из статьи</b><div class="bk-sub">'+esc(b.title)+'</div></div></div>'+
    (L.length?'<div class="bk-note">Нажмите на ссылку, чтобы добавить эту страницу на полку.</div><div class="bk-list weblinks" id="webLinksL">'+L.slice(0,400).map(function(l,i){const own=webOnShelf(webNorm(l.u));
      return '<button type="button" class="bk-line" data-i="'+i+'">'+rqIcon(own?'check':'plus',20)+'<span><b>'+esc(l.t.slice(0,90))+'</b><small>'+esc(webHost(l.u))+(own?' · уже на полке':'')+'</small></span></button>';}).join('')+'</div>'
      :'<div class="bk-note">В этой странице ссылок не нашлось. Если страница добавлена давно, нажмите «Обновить с сайта»: ссылки появятся.</div>')+
    '<button type="button" class="buy advwant" id="webCutBack">'+rqIcon('arrow-left',18)+' Назад к странице</button>';
  el('bookSheet').classList.remove('hidden');el('bookSheet').scrollTop=0;
  el('webCutBack').onclick=function(){bookInfo(id);};
  if(el('webLinksL'))el('webLinksL').onclick=function(e){const bt=e.target.closest('.bk-line');if(!bt)return;const l=L[+bt.dataset.i],own=webOnShelf(webNorm(l.u));
    if(own){el('bookSheet').classList.add('hidden');openBook(own.id);return;}webSheet({url:l.u,go:true});};
}
/* сколько читать: по вашей скорости (js/read-extras.js учит её по листанию), пока не выучена — 1000 знаков в минуту */
function webMinutes(len){let cpm=1000,own=false;try{const s=rqRx().spd;if(s&&s.cpm){cpm=s.cpm;own=true;}}catch(e){}
  return {min:Math.max(1,Math.round(len/Math.max(200,cpm))),own:own};}

/* ---- шторка «Страница сайта» ----
   13.11 (Джессика «давай все»): одно поле — ссылка или текст, приложение само понимает что; перед добавлением ссылки — «Начало текста»
   и «Отмена»; про Jina Reader можно «Больше не спрашивать» (SET.webJina, arch.md 13.11) */
const WEB={busy:false,url:'',shareUrl:'',pend:null};
function webIsUrl(v){v=String(v||'').trim();if(!v||/\s/.test(v))return false;
  return /^https?:\/\/\S+$/i.test(v)||/^(www\.)?[\p{L}\p{N}-]+(\.[\p{L}\p{N}-]+)*\.[\p{L}]{2,}([\/?#:].*)?$/u.test(v);}
function webJinaOk(){return !!(typeof SET!=='undefined'&&SET&&SET.webJina);}
function webJinaSet(on){if(typeof SET==='undefined'||!SET)return;if(on)SET.webJina=1;else delete SET.webJina;if(typeof saveSet==='function')saveSet();}
function webSheet(o){
  o=o||{};WEB.pend=null;
  const v=o.text||o.url||'';
  el('bookSheetBody').innerHTML=
    '<div class="bk-head"><div class="cover webcov">'+rqIcon('compass',34)+'</div><div class="bk-ttl"><b>Страница сайта</b><div class="bk-sub">Читать сайт как книгу</div></div></div>'+
    '<div class="bk-note">Текст страницы ляжет на полку как книга. Чтение засчитывается как обычно: страницы, минуты, опыт, серия и ежедневное задание. В счёт дочитанных книг и ачивок за книги страницы сайтов не идут.</div>'+
    '<textarea id="webIn" class="searchinp webtext" rows="3" maxlength="2000000" autocomplete="off" placeholder="Вставьте ссылку на страницу или текст с сайта" aria-label="Ссылка или текст">'+esc(v)+'</textarea>'+
    '<input id="webTitle" class="searchinp webtitle" type="text" autocomplete="off" placeholder="Название (необязательно)" aria-label="Название" value="'+esc(o.title||'')+'" hidden>'+
    '<button type="button" class="cta" id="webGo"></button>'+
    '<div id="webMsg" role="status"></div>'+
    (webJinaOk()?'<div class="bk-note webjinaon">Закрытые сайты открываются через Jina Reader без вопроса. <button type="button" class="weblink" id="webJinaOff">Спрашивать снова</button></div>':'')+
    '<div class="bk-h">Или откройте сохранённую страницу</div>'+
    '<div class="bk-note">В браузере на телефоне откройте меню и нажмите значок скачивания: страница сохранится файлом. На компьютере: Ctrl+S. Потом выберите этот файл здесь.</div>'+
    '<button type="button" class="buy advwant" id="webFile">'+rqIcon('folder',18)+' Выбрать файл страницы</button>';
  el('bookSheet').classList.remove('hidden');el('bookSheet').scrollTop=0;
  el('webIn').oninput=webMode;
  el('webGo').onclick=function(){const x=String(el('webIn').value||'').trim();if(webIsUrl(x))webGo(x,false);else webFromText();};
  el('webFile').onclick=function(){el('fileInp').click();};
  if(el('webJinaOff'))el('webJinaOff').onclick=function(){webJinaSet(false);const n=document.querySelector('.webjinaon');if(n)n.remove();};
  webMode();
  if(o.go&&o.url)webGo(o.url,false);
}
/* поле само понимает, что в нём: ссылка → «Открыть ссылку», текст → «Сделать книгу из текста» и поле названия */
function webMode(){const inp=el('webIn'),b=el('webGo');if(!inp||!b||WEB.busy)return;
  const x=String(inp.value||'').trim(),url=webIsUrl(x);
  el('webTitle').hidden=!x||url;
  b.disabled=!x;
  b.innerHTML=!x?'Вставьте ссылку или текст':url?rqIcon('download',18)+' Открыть ссылку как книгу':rqIcon('file-text',18)+' Сделать книгу из текста';
  if(WEB.pend&&(!url||webNorm(x)!==WEB.pend.u)){WEB.pend=null;webMsg('');}}
function webStep(t){try{if(WEB.busy&&el('webGo')&&!el('bookSheet').classList.contains('hidden'))el('webGo').textContent=t;const sp=el('webRef')&&el('webRef').querySelector('span');if(WEB.busy&&sp)sp.textContent=t;}catch(e){}}
function webMsg(h){const m=el('webMsg');if(m)m.innerHTML=h;}
function webBusy(t){const b=el('webGo');if(!b)return;if(t){b.disabled=true;b.textContent=t;}else webMode();}
async function webFetchBook(u,viaJina){
  const w=!viaJina&&webWiki(u);
  if(w)return await webGetWiki(w,u);
  if(viaJina)return await webGetJina(u);
  let r;
  try{r=await webGetDirect(u);}catch(e){if(e&&e.nocors&&webJinaOk())return await webGetJina(u);throw e;}
  if(!r.file&&(!r.text||r.text.length<WEB_MIN)){if(webJinaOk())return await webGetJina(u);const x=new Error('empty');x.nocors=true;x.empty=true;throw x;} /* текст собирают скрипты: в html пусто */
  return r;
}
async function webGo(raw,viaJina){
  if(WEB.busy)return;
  const u=webNorm(raw);
  if(!u){webMsg('<div class="bk-note">Вставьте ссылку на страницу, например https://ru.wikipedia.org/wiki/Чехов</div>');return;}
  const own=webOnShelf(u);
  if(own){webMsg('<div class="bk-note">Эта страница уже на полке.</div><button type="button" class="buy advwant" id="webOpenOwn">'+rqIcon('book-open',18)+' Читать</button>');
    el('webOpenOwn').onclick=function(){el('bookSheet').classList.add('hidden');openBook(own.id);};return;}
  if(navigator.onLine===false){webMsg('<div class="bk-note">Нет сети. Страница скачается один раз, дальше читается без интернета.</div>');return;}
  WEB.busy=true;WEB.url=u;WEB.pend=null;webMsg('');webBusy(viaJina||(!webWiki(u)&&webJinaOk())?'Открываю страницу… бывает до 20 секунд':'Загружаю страницу…');
  try{
    let r;
    try{r=await webFetchBook(u,viaJina);}catch(e){if(e&&e.nocors){webNoCors(u,e.empty);return;}throw e;}
    if(r.file){el('bookSheet').classList.add('hidden');await importBookFiles([r.file]);return;}
    WEB.pend={b:webMakeBook(r,u),u:u};webPreview();
  }catch(e){console.warn('[rq] web',e);webMsg('<div class="bk-note">Не получилось: '+esc(e&&e.message||e)+'</div>');}
  finally{WEB.busy=false;webBusy('');}
}
/* «Начало текста» перед добавлением: видно, статья ли это или меню сайта; «Отмена» ничего не пишет */
function webWords(t){return (String(t).match(/[\p{L}\p{N}]+/gu)||[]).length;}
function webPreview(){
  const p=WEB.pend;if(!p)return;const b=p.b;
  const plain=b.text.replace(/\ufffcimg:\d+\n*/g,'').replace(/[\u2060-\u2064]/g,'').replace(/\t/g,' · ');const tm=webMinutes(plain.length),min=tm.min,pg=(b.webX&&b.webX.pages)||1;
  let head=plain.slice(0,600);if(plain.length>600)head=head.replace(/\s+\S*$/,'')+'…';
  webMsg('<div class="bk-h">Что получилось</div><div class="bk-row"><span class="bk-k">'+esc(b.title)+'</span><span class="bk-v">'+esc(b.author)+'</span></div>'+
    '<div class="bk-note" id="webTime">Около '+(typeof rxDur==='function'&&min>=60?rxDur(min):min+' '+plural(min,'минуты','минут','минут'))+' чтения'+(tm.own?' с вашей скоростью':'')+(pg>1?' · собрано страниц: '+pg:'')+(b.toc&&b.toc.length?' · '+b.toc.length+' '+plural(b.toc.length,'раздел','раздела','разделов'):'')+'</div>'+
    '<div class="bk-h">Начало текста</div><div class="bk-note advpre webpre">'+esc(head)+'</div>'+
    '<div class="bk-note">Если вместо статьи тут меню сайта, нажмите «Отмена» и вставьте нужный кусок текста в поле выше.</div>'+
    '<button type="button" class="cta" id="webAdd">'+rqIcon('book-open',18)+' На полку и читать</button>'+
    '<button type="button" class="buy advwant" id="webCancel">'+rqIcon('x',18)+' Отмена</button>');
  el('webAdd').onclick=webAddPend;
  el('webCancel').onclick=function(){WEB.pend=null;webMsg('');};
  try{el('webMsg').scrollIntoView({block:'start',behavior:'smooth'});}catch(e){}
}
async function webAddPend(){
  const p=WEB.pend;if(!p||WEB.busy)return;
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне','info');return;}
  if(webOnShelf(p.u)){webGo(p.u,false);return;}
  WEB.busy=true;
  {const ab=el('webAdd');if(ab){ab.disabled=true;ab.textContent=p.b.webImgs.length?'Забираю картинки…':'Добавляю…';}}
  try{await webStoreImgs(p.b.id,p.b.webImgs,p.b.text);}catch(e){}
  try{await rqAddBook(p.b);}catch(e){WEB.busy=false;flashMsg('Не удалось добавить: '+(e&&e.message||e),'info');return;}
  await webxSave(p.b.id,p.b.webX);
  WEB.busy=false;WEB.pend=null;
  el('bookSheet').classList.add('hidden');
  try{renderLibrary();libFlashNew();}catch(e){}
  openBook(p.b.id);
}
/* сайт не пустил приложение (или страница пустая без скриптов): спросить про Jina Reader, рядом остальные пути */
function webNoCors(u,empty){
  webMsg('<div class="bk-note">'+(empty?'На этой странице текст появляется только в браузере, приложение его не видит.':'Этот сайт не даёт приложению открыть страницу напрямую.')+
    ' Можно открыть её через Jina Reader: это бесплатная служба, которая сама откроет страницу и отдаст текст. Адрес страницы уйдёт этой службе.</div>'+
    '<label class="webchk"><input type="checkbox" id="webJinaAlways"><span>Больше не спрашивать, сразу открывать через Jina Reader</span></label>'+
    '<button type="button" class="cta" id="webJina">'+rqIcon('download',18)+' Открыть через Jina Reader</button>'+
    '<div class="bk-note">Или вставьте в поле выше сам текст страницы, или сохраните страницу файлом.</div>');
  el('webJina').onclick=function(){if(el('webJinaAlways').checked)webJinaSet(true);webGo(u,true);};
}
async function webFromText(){
  const t=String(el('webIn').value||'').replace(/\r\n?/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  if(t.length<WEB_MIN){flashMsg('Текста слишком мало для книги','info');return;}
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне','info');return;}
  const first=(t.split('\n')[0]||'').trim();
  const title=webClean(el('webTitle').value)||(first.length<=90?first:first.slice(0,60).replace(/\s+\S*$/,'')+'…');
  const u=webNorm(WEB.shareUrl||'');
  const b=webMakeBook({title:title,author:u?webHost(u):'Вставленный текст',text:t},'','',0);
  if(u&&!webOnShelf(u))b.srcId='web:'+u;
  b.fname=(u?webHost(u)+'-':'')+String(title).replace(/[^\p{L}\p{N}]+/gu,'-').slice(0,60)+'.txt';
  try{await rqAddBook(b);}catch(e){flashMsg('Не удалось добавить: '+(e&&e.message||e),'info');return;}
  WEB.shareUrl='';el('bookSheet').classList.add('hidden');
  try{renderLibrary();libFlashNew();}catch(e){}
  openBook(b.id);
}
/* «Поделиться → ReadQuest» ссылкой или выделенным текстом (sw.js кладёт {title,text,url}, library.js importSharedBooks зовёт сюда) */
function webFromShare(o){
  o=o||{};const text=String(o.text||'').trim(),m=/https?:\/\/\S+/.exec(text);
  const url=webNorm(o.url||(m?m[0]:''));
  const rest=m?text.replace(m[0],'').trim():text;
  try{show('library');}catch(e){}
  if(rest.length>=WEB_MIN){WEB.shareUrl=url;webSheet({text:rest,title:o.title||''});return;} /* поделились выделенным текстом */
  WEB.shareUrl='';webSheet({url:url,go:!!url});
}

/* ---- карточка книги: «Обновить с сайта», «Открыть на сайте» (js/content.js bookInfo) ----
   Обновление переписывает текст этой книги (единственное место, где текст книги пишется второй раз, arch.md 13.11).
   Место в тексте: кусок текста у старого pos ищется в новом тексте; не нашёлся — pos как был. ratio только растёт. */
function webUrlOf(b){const u=String(b&&b.srcId||'').replace(/^web:/,'');return /^https?:\/\//.test(u)?u:'';}
function webCardHtml(b){
  if(!rqIsWebBook(b))return '';const u=webUrlOf(b);if(!u)return '';
  return '<div class="bk-h">Сайт</div><div class="bk-list">'+
    '<button type="button" class="bk-line" id="webRef" onclick="webRefresh(\''+esc(b.id)+'\')">'+rqIcon('rotate-cw',20)+'<span>Обновить с сайта</span></button>'+
    '<button type="button" class="bk-line" id="webLinksBtn" onclick="webLinksSheet(\''+esc(b.id)+'\')">'+rqIcon('list',20)+'<span>Ссылки из статьи</span></button>'+
    '<button type="button" class="bk-line" id="webLinksTgl" role="switch" aria-checked="'+webLinksOn()+'" onclick="webLinksTgl(\''+esc(b.id)+'\')">'+rqIcon('underline',20)+'<span>Ссылки в тексте: '+(webLinksOn()?'нажимаются':'выключены')+'</span></button>'+
    '<button type="button" class="bk-line" id="webCutBtn" onclick="webCutSheet(\''+esc(b.id)+'\')">'+rqIcon('circle-minus',20)+'<span>Убрать лишнее</span></button>'+
    '<a class="bk-line" href="'+esc(u)+'" target="_blank" rel="noopener">'+rqIcon('compass',20)+'<span>Открыть на сайте</span></a>'+
    '</div><div class="bk-note" id="webRefMsg">Место в тексте сохранится. Если текст на сайте сильно поменялся, цитаты и выделения в этой странице могут сместиться.</div>';
}
function webRefMsg(h){const m=el('webRefMsg');if(m)m.innerHTML=h;}
async function webRefresh(id,viaJina){
  const b=(S.userBooks||[]).find(function(x){return x&&x.id===id;}),u=webUrlOf(b);
  if(!b||!u||WEB.busy)return;
  if(typeof R!=='undefined'&&R&&R.book&&R.book.id===id){flashMsg('Закройте страницу, потом обновите','info');return;}
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне','info');return;}
  if(navigator.onLine===false){flashMsg('Нет сети','info');return;}
  WEB.busy=true;const btn=el('webRef');if(btn){btn.disabled=true;btn.querySelector('span').textContent='Загружаю страницу…';}
  try{
    let r;
    try{r=await webFetchBook(u,viaJina);}
    catch(e){if(e&&e.nocors){
      webRefMsg('Этот сайт не даёт приложению открыть страницу напрямую. Можно открыть её через Jina Reader, адрес страницы уйдёт этой службе.'+
        '<label class="webchk"><input type="checkbox" id="webJinaAlways"><span>Больше не спрашивать</span></label>'+
        '<button type="button" class="buy advwant" id="webRefJina">'+rqIcon('rotate-cw',18)+' Обновить через Jina Reader</button>');
      el('webRefJina').onclick=function(){if(el('webJinaAlways').checked)webJinaSet(true);WEB.busy=false;webRefresh(id,true);};return;}
      throw e;}
    if(r.file)throw new Error('по ссылке теперь файл, а не страница');
    const ox=await webxLoad(id);if(ox&&ox.cut&&ox.cut.length)webApplyCuts(r,ox.cut);
    const nb=webMakeBook(r,u);if(ox&&ox.cut)nb.webX.cut=ox.cut;
    let old=b.text;if(typeof old!=='string'||!old){try{old=await __rq.idb.getText(id);}catch(e){old='';}}
    if(old===nb.text&&ox&&ox.len===nb.text.length){webRefMsg('На сайте ничего не изменилось.');return;}
    const p=S.progress[id];let pos=p&&typeof p.pos==='number'?p.pos:null;
    if(pos!==null&&old){const at=Math.floor(pos*old.length),snip=old.slice(at,at+80).trim();
      /* кусок может встречаться несколько раз — берём вхождение, ближайшее к тому же месту по доле текста */
      const want=pos*nb.text.length;let j=-1,best=Infinity;
      if(snip.length>=20)for(let k=nb.text.indexOf(snip);k>=0;k=nb.text.indexOf(snip,k+1)){const d=Math.abs(k-want);if(d<best){best=d;j=k;}}
      if(j>=0)pos=Math.min(1,Math.max(0,j/nb.text.length));}
    b.text=nb.text;b.toc=nb.toc;b.size=nb.text.length;
    await __rq.upsertUserBook(null,b,{text:nb.text});
    try{await webStoreImgs(id,nb.webImgs,nb.text);}catch(e){}
    await webxSave(id,nb.webX);
    if(p&&pos!==null){p.pos=pos;if(!(p.ratio>=pos))p.ratio=pos;}
    save();
    try{renderLibrary();}catch(e){}
    try{bookInfo(id);}catch(e){}
    flashMsg('Страница обновлена','info');
  }catch(e){console.warn('[rq] web refresh',e);webRefMsg('Не получилось: '+esc(e&&e.message||e));}
  finally{WEB.busy=false;const bt=el('webRef');if(bt){bt.disabled=false;const sp=bt.querySelector('span');if(sp)sp.textContent='Обновить с сайта';}}
}
