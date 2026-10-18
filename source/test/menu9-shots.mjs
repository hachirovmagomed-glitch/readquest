import puppeteer from 'puppeteer-core';
/* 18.10: монеты только в профиле и магазине — шапка библиотеки и левое меню во всех скинах */
const O=process.env.O, U='http://127.0.0.1:8767/readquest/test/';
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
for(const W of [360,390]) for(const sk of ['default','ellada','babochkovyi','celestial','pencil']){
const p=await (await br.createBrowserContext()).newPage();await p.setViewport({width:W,height:800,isMobile:true,hasTouch:true,deviceScaleFactor:2});p.on('pageerror',e=>console.log('E',sk,e.message));
await p.goto(U);await p.waitForFunction(()=>window.__rqReady);
const s=ms=>new Promise(r=>setTimeout(r,ms));
await p.evaluate(sk=>{if(sk!=='default'){S.gold=5000;buy('skin-'+sk);wear('skin-'+sk);}S.gold=230;save();navGo('library');renderLibrary();},sk);await s(700);
await p.screenshot({path:O+'lib-'+sk+'-'+W+'.png'});
await p.evaluate(()=>el('menuLib').click());await s(500);await p.screenshot({path:O+'drawer-'+sk+'-'+W+'.png'});
await p.close();}
await br.close();
