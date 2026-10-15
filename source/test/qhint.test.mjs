// Quests hint follows RQ_MVP_QUEST_PAYOUTS: MVP + payouts off → «Цели для чтения. Создавайте свои под любые задачи»; constant patched to true → old text.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node qhint.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; let lift = false;
const p = await (await browser.createBrowserContext()).newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.setCacheEnabled(false); await p.setRequestInterception(true); await p.setBypassServiceWorker(true);
p.on('request', async r => { if (lift && /\/js\/content\.js(\?|$)/.test(r.url())) { const t = await (await fetch(r.url())).text(); r.respond({ status: 200, contentType: 'application/javascript', body: t.replace(/const RQ_MVP_QUEST_PAYOUTS\s*=\s*false/, 'const RQ_MVP_QUEST_PAYOUTS=true') }); } else r.continue(); });
const hint = async () => { await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
  return p.evaluate(() => { navGo('quests'); return { mvp: isMvp(), t: [...el('quests').querySelectorAll('div')].filter(d => d.childElementCount === 0).map(d => d.textContent).join('|') }; }); };
const a = await hint(); lift = true; const b = await hint();
ok('MVP, payouts off: «Цели для чтения. Создавайте свои под любые задачи», no «забирайте награды»', a.mvp && /Цели для чтения\. Создавайте свои под любые задачи/.test(a.t) && !/забирайте награды/.test(a.t), a.t.slice(0, 200));
ok('RQ_MVP_QUEST_PAYOUTS=true: old hint back', /забирайте награды/.test(b.t), b.t.slice(0, 200));
ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY qhint.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
