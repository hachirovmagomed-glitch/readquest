import puppeteer from 'puppeteer-core';
const O=process.env.O, U=process.env.U||'http://127.0.0.1:8767/readquest/test/', W=+(process.env.W||360);
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
for(const sk of ['default','ellada','babochkovyi','celestial','pencil']){
const p=await (await br.createBrowserContext()).newPage();await p.setViewport({width:W,height:800,isMobile:true,hasTouch:true,deviceScaleFactor:2});p.on('pageerror',e=>console.log('E',sk,e.message));
await p.goto(U);await p.waitForFunction(()=>window.__rqReady);
const s=ms=>new Promise(r=>setTimeout(r,ms));
await p.evaluate(sk=>{S.gold=5000;save();if(sk!=='default'){buy('skin-'+sk);wear('skin-'+sk);}navGo('library');},sk);await s(800);
for(const v of ['grid','covers','short','full']){await p.evaluate(v=>{libViewPick(v);el('shelfH').scrollIntoView({block:'start'});},v);await s(400);await p.screenshot({path:O+'view-'+v+'-'+sk+'-'+W+'.png'});}
await p.evaluate(()=>{el('libSortBtn').click();});await s(300);await p.screenshot({path:O+'menu-'+sk+'-'+W+'.png'});
await p.close();}
await br.close();
