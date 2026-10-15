// RQ_MVP_ACH_PAYOUTS (js/v6-extras.js, false): in MVP achievements pay nothing (custom XP/coins, standard XP multiplier) and show no rewards;
// stored rewards are never erased (byte-identical after gate + export/import + reload); lifting the gate (constant patched to true) restores display.
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node achgate.test.mjs
import puppeteer from 'puppeteer-core';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' — ' + JSON.stringify(i).slice(0, 600) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const errs = []; let lift = false; const dialogs = [];
const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
p.on('pageerror', e => errs.push(e.message));
p.on('dialog', d => { dialogs.push(d.message()); if (d.type() === 'prompt') d.accept(/Название/.test(d.message()) ? 'Тест' : (d.defaultValue() || '1')); else if (d.type() === 'confirm') d.dismiss(); else d.accept(); });
await p.setCacheEnabled(false); await p.setRequestInterception(true); await p.setBypassServiceWorker(true);
p.on('request', async r => { const u = r.url();
  if (lift && /\/js\/v6-extras\.js(\?|$)/.test(u)) { const t = await (await fetch(u)).text(); r.respond({ status: 200, contentType: 'application/javascript', body: t.replace(/const RQ_MVP_ACH_PAYOUTS\s*=\s*false/, 'const RQ_MVP_ACH_PAYOUTS=true').replace(/const RQ_MVP_QUEST_PAYOUTS\s*=\s*false/, 'const RQ_MVP_QUEST_PAYOUTS=true') }); }
  else r.continue(); });
const load = async () => { await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(500); };
const STORED = () => p.evaluate(() => { const v = JSON.parse(localStorage.getItem(RQ_K.v1)); const g = v.game || v; return JSON.stringify({ customAch: g.customAch, xpMult: g.xpMult }); });
const ui = () => p.evaluate(() => { renderAchievements(); const box = el('achBox').innerHTML; navGo('quests'); const hint = [...el('quests').querySelectorAll('div')].map(d => d.childElementCount === 0 ? d.textContent : '').join('|');
  return { pct: /\+\d+% XP/.test(box), prize: /\+\d+ XP|\+\d+ монет/.test(box), mult: !el('achMult').parentNode.hidden, hintNew: /Цели для чтения\. Создавайте свои под любые задачи/.test(hint), hintOld: /забирайте награды/.test(hint) }; });
await load();
// setup: all standard achievements unlocked, xpMult 1.5, a custom achievement that is already done with 500 XP / 300 coins
await p.evaluate(async () => { S.achUnlocked = DEFAULT_ACH.map(a => a.id); S.xpMult = 1.5; S.customAch = [{ id: 'caT', title: 'Тест', desc: '', xp: 500, gold: 300, conds: [{ type: 'metric', key: METRIC_KEYS[0], target: 0 }] }]; save(); await new Promise(r => setTimeout(r, 300)); });
const orig = await STORED();
const has = await p.evaluate(() => typeof RQ_MVP_ACH_PAYOUTS !== 'undefined' ? RQ_MVP_ACH_PAYOUTS : 'missing');
// 1. payout: one minute → exactly 10 XP, custom achievement unlocks without paying
const pay = await p.evaluate(async () => { const x0 = S.xp, g0 = S.gold; SESS.push({ id: 'ag-' + Date.now(), date: today(), bookId: 'x', minutes: 1, pageTurns: 2, startedAt: Date.now() - 61000 });
  awardPendingSessions(); const nu = checkAchievements(); save(); await new Promise(r => setTimeout(r, 300));
  return { dxp: S.xp - x0, dgold: S.gold - g0, unlocked: isUnlocked('caT'), prizes: nu.map(n => n.prize) }; });
ok('1a MVP: 1 minute with achievements unlocked (×1.5) → exactly +10 XP; custom achievement unlocks, pays 0 XP / 0 coins, no prize text', has === false && pay.dxp === 10 && pay.dgold === 0 && pay.unlocked && pay.prizes.every(x => !x), { has, pay });
const leak = await p.evaluate(async () => { const e = await __rq.exportBackup(null, SET, { includeTextBodies: false }); return /RQ_MVP_ACH_PAYOUTS|achPayouts/i.test(JSON.stringify(e) + localStorage.getItem(RQ_K.v1) + localStorage.getItem(RQ_K.set)); });
ok('1b constant never in NS / NS_set / export', !leak, leak);
// 2. UI under the gate
const u = await ui();
ok('2a MVP: no «+N% XP» on standard cards, no reward line on custom cards, no XP multiplier chip', !u.pct && !u.prize && !u.mult, u);
dialogs.length = 0; await p.evaluate(() => addCustomAch()); await sleep(300);
ok('2b MVP: create form does not ask for XP or Монеты', dialogs.length > 0 && !dialogs.some(m => /XP|монет/i.test(m)), dialogs);
// stored rewards byte-identical after gate + export/import + reload
const after = await p.evaluate(async () => { S.customAch = S.customAch.filter(a => a.id === 'caT'); save(); await new Promise(r => setTimeout(r, 300));
  const e = await __rq.exportBackup(null, SET, { includeTextBodies: false }); await __rq.importBackup(e); return true; });
await load(); const stored = await STORED();
ok('1c stored rewards byte-identical after gate, export/import and reload', stored === orig, { orig, stored });
// lift the gate
lift = true; await load(); const L = await ui(); dialogs.length = 0; await p.evaluate(() => addCustomAch()); await sleep(300);
ok('4 gate lifted: «+N% XP», reward line, multiplier and XP/Монеты prompts are back', L.pct && L.prize && L.mult && dialogs.some(m => /XP/.test(m)) && dialogs.some(m => /монет/.test(m)), { L, dialogs });
ok('no page errors', errs.length === 0, errs);
const n = checks.filter(Boolean).length; console.log(`SUMMARY achgate.test ${n}/${checks.length}`);
await browser.close(); process.exit(n === checks.length ? 0 : 1);
