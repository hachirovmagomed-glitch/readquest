import puppeteer from 'puppeteer-core';
const O='/tmp/claude-0/-home-user-readquest/8875dfae-0152-5286-81a3-0f251c46276e/scratchpad/shots/';
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
for(const w of [360,390]){
const p=await (await br.createBrowserContext()).newPage();await p.setViewport({width:w,height:800,isMobile:true,hasTouch:true,deviceScaleFactor:2});p.on('pageerror',e=>console.log('E',e.message));
await p.goto('http://127.0.0.1:8767/readquest/test/');await p.waitForFunction(()=>window.__rqReady);
const s=ms=>new Promise(r=>setTimeout(r,ms));
await p.evaluate(()=>{S.gold=600;save();buy('skin-babochkovyi');wear('skin-babochkovyi');navGo('look');});await s(700);await p.screenshot({path:O+'v3-look-'+w+'.png'});
await p.evaluate(()=>{el('rewPaneShop').scrollIntoView({block:'start'});});await s(500);await p.screenshot({path:O+'v3-shop-'+w+'.png'});
await p.evaluate(()=>{openGeneralSettings(false);});await s(500);await p.screenshot({path:O+'v3-settings-'+w+'.png'});
await p.evaluate(()=>{openRewardsSheet();});await s(600);await p.screenshot({path:O+'v3-rewards-'+w+'.png'});
await p.close();}
await br.close();
