import puppeteer from 'puppeteer-core';
const O=process.env.O, U=process.env.U, T=process.env.T;
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
for(const w of [360,390]){
const p=await (await br.createBrowserContext()).newPage();await p.setViewport({width:w,height:800,isMobile:true,hasTouch:true,deviceScaleFactor:2});p.on('pageerror',e=>console.log('E',e.message));
await p.goto(U);await p.waitForFunction(()=>window.__rqReady);
const s=ms=>new Promise(r=>setTimeout(r,ms));
await p.evaluate(()=>{navGo('quests');});await s(700);await p.screenshot({path:O+'quests-'+T+'-'+w+'.png'});
await p.close();}
await br.close();
