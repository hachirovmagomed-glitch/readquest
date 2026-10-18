import puppeteer from 'puppeteer-core';
const O=process.env.O, U=process.env.U, T=process.env.T;
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
for(const w of [360,390]) for(const sk of ['default','ellada','babochkovyi','celestial','pencil']){
const p=await (await br.createBrowserContext()).newPage();await p.setViewport({width:w,height:800,isMobile:true,hasTouch:true,deviceScaleFactor:2});p.on('pageerror',e=>console.log('E',e.message));
await p.goto(U);await p.waitForFunction(()=>window.__rqReady);
const s=ms=>new Promise(r=>setTimeout(r,ms));
await p.evaluate(sk=>{S.gold=5000;save();if(sk!=='default'){buy('skin-'+sk);wear('skin-'+sk);}navGo('library');},sk);await s(900);
await p.screenshot({path:O+'lib-'+T+'-'+sk+'-'+w+'.png'});
await p.evaluate(()=>{el('shelfH').scrollIntoView({block:'start'});});await s(400);await p.screenshot({path:O+'shelf-'+T+'-'+sk+'-'+w+'.png'});
await p.evaluate(()=>navGo('profile'));await s(600);await p.screenshot({path:O+'prof-'+T+'-'+sk+'-'+w+'.png'});
await p.close();}
await br.close();
