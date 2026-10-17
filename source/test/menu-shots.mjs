// Shots for «Внешний вид» in the drawer + merged «Статистика и заметки». Run: RQ_OUT=<dir> RQ_TAG=do|posle node menu-shots.mjs
import puppeteer from 'puppeteer-core';
const B=process.env.RQ_URL||'http://127.0.0.1:8767/readquest/test/', O=(process.env.RQ_OUT||'/tmp/')+'/', T=process.env.RQ_TAG||'x', s=ms=>new Promise(r=>setTimeout(r,ms));
const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
for(const w of [360,390]){
  const p=await (await br.createBrowserContext()).newPage();await p.setViewport({width:w,height:800,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  p.on('pageerror',e=>console.log('PAGEERROR',e.message));
  await p.goto(B,{waitUntil:'load'});await p.waitForFunction(()=>window.__rqReady,{timeout:20000});await s(600);
  const shot=async n=>{await s(600);await p.screenshot({path:O+T+'-'+n+'-'+w+'.png'});};
  await p.evaluate(()=>{S.gold=600;S.xp=1220;S.heroName='Читатель';save();buy('skin-ellada');wear('skin-ellada');const b0=allBooks()[0];S.quotes[b0.id]=[{text:'Гнев, богиня, воспой Ахиллеса, Пелеева сына',note:'Начало',date:'17.10.2026'}];save();show('library');openDrawer();});await shot('menu');
  await p.evaluate(()=>{navGo(typeof NAV_CATALOG!=='undefined'&&NAV_CATALOG.find(x=>x.id==='look')?'look':'settings');});await shot('look');
  await p.evaluate(()=>{navGo('stats');});await shot('stats');
  await p.evaluate(()=>{const t=document.querySelector('#stats .progtab[data-sub="quotes"]');if(t)t.click();else navGo('notes');});await shot('notes');
  await p.evaluate(()=>{openGeneralSettings(false);});await shot('settings');
  await p.close();
}
await br.close();
