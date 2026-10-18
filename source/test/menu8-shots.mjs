import puppeteer from 'puppeteer-core';
/* 18.10: фильтры в «⋮» шапки библиотеки — до/после во всех скинах. U = сборка, T = метка (do/posle) */
const O=process.env.O, U=process.env.U||'http://127.0.0.1:8767/readquest/test/', T=process.env.T||'posle';
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
for(const W of [360,390]) for(const sk of ['default','ellada','babochkovyi','celestial','pencil']){
const p=await (await br.createBrowserContext()).newPage();await p.setViewport({width:W,height:800,isMobile:true,hasTouch:true,deviceScaleFactor:2});p.on('pageerror',e=>console.log('E',sk,e.message));
await p.goto(U);await p.waitForFunction(()=>window.__rqReady);
const s=ms=>new Promise(r=>setTimeout(r,ms));
await p.evaluate(sk=>{S.gold=230;save();if(sk!=='default'){S.gold=5000;buy('skin-'+sk);wear('skin-'+sk);S.gold=230;save();}navGo('library');
  S.shelves=[{id:'a',n:'Русская классика',b:[allBooks()[0].id]}];save();renderLibrary();},sk);await s(700);
await p.screenshot({path:O+T+'-'+sk+'-'+W+'.png'});
if(T==='posle'){
  await p.evaluate(()=>el('libSortBtn').click());await s(300);await p.screenshot({path:O+'menu-'+sk+'-'+W+'.png'});
  await p.evaluate(()=>document.querySelector('#libSortMenu [data-pane="f"]').click());await s(300);await p.screenshot({path:O+'filtr-'+sk+'-'+W+'.png'});
  await p.evaluate(()=>document.querySelector('#libSortMenu [data-f="reading"]').click());await s(400);await p.screenshot({path:O+'chitayu-'+sk+'-'+W+'.png'});
}
await p.close();}
await br.close();
