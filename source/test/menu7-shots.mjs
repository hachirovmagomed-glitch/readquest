import puppeteer from 'puppeteer-core';
const O=process.env.O, U='http://127.0.0.1:8767/readquest/test/';
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
for(const W of [360,390]) for(const sk of ['default','ellada','babochkovyi','celestial','pencil']){
const p=await (await br.createBrowserContext()).newPage();await p.setViewport({width:W,height:800,isMobile:true,hasTouch:true,deviceScaleFactor:2});p.on('pageerror',e=>console.log('E',sk,e.message));
await p.goto(U);await p.waitForFunction(()=>window.__rqReady);
const s=ms=>new Promise(r=>setTimeout(r,ms));
await p.evaluate(sk=>{S.gold=5000;save();if(sk!=='default'){buy('skin-'+sk);wear('skin-'+sk);}navGo('library');
  S.shelves=[{id:'a',n:'Русская классика',b:[allBooks()[0].id]},{id:'b',n:'Саморазвитие',b:[allBooks()[2].id,allBooks()[0].id]}];save();LIB.f='sh:b';renderLibrary();
  el('libChips').scrollLeft=260;el('shelfH').scrollIntoView({block:'center'});},sk);await s(700);
await p.screenshot({path:O+'polka-'+sk+'-'+W+'.png'});
await p.evaluate(()=>bookInfo(allBooks()[0].id));await s(600);
await p.evaluate(()=>{const h=[...document.querySelectorAll('.bk-h')].find(x=>/полки/i.test(x.textContent));h&&h.scrollIntoView({block:'center'});});await s(300);
await p.screenshot({path:O+'info-'+sk+'-'+W+'.png'});
await p.close();}
await br.close();
