// 05.11 Словари (Джессика: «давай словари»): js/dict.js, packs from main /dict/ (tools/gen-dict-packs.py), own StarDict / DSL.
// Needs the packs next to the build: dist/dict/ (python3 tools/gen-dict-packs.py dist/dict --ru … --wn … --web …).
// Run: RQ_URL=http://127.0.0.1:8767/readquest/test/ node dict.test.mjs
import puppeteer from 'puppeteer-core';
import zlib from 'node:zlib';
const BASE = process.env.RQ_URL || 'http://127.0.0.1:8767/readquest/test/';
const checks = []; const ok = (n, p, i) => { checks.push(!!p); console.log((p ? 'PASS ' : 'FAIL ') + n + (i !== undefined && !p ? ' — ' + JSON.stringify(i) : '')); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await browser.createBrowserContext()).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.__rqReady, { timeout: 20000 }); await sleep(400);
let r;

// 0 no dictionaries yet: the window says so and offers to download; the online links are there
r = await p.evaluate(async () => { await openBook('b1'); await new Promise(r => setTimeout(r, 700)); await dkShow('шинели', 200, 300);
  return { t: el('rmNote').textContent, get: !!el('dkGet'), links: [...el('rmNote').querySelectorAll('.dklinks a')].map(a => a.textContent) }; });
ok('0 no packs: «Словари ещё не скачаны» + «Скачать словари»; links Викисловарь / Грамота', /не скачаны/.test(r.t) && r.get && r.links.join() === 'Викисловарь,Грамота', r);
r = await p.evaluate(async () => { el('dkGet').click(); await new Promise(r => setTimeout(r, 600)); const x = el('rxXdict'), g = el('settings');
  const out = { sec: gsCur(), shown: !g.classList.contains('hidden'), card: !!x && x.offsetHeight > 0, open: !!el('dkList') }; return out; });
ok('0 «Скачать словари» opens «Общие настройки → Чтение» with the «Словари» card open', r.sec === 'read' && r.shown && r.card && r.open, r);

// 1 settings: the catalog, download all three
r = await p.evaluate(async () => { rmFnHide(); RX_EXP.dict = true; openGeneralSettings(true); await new Promise(r => setTimeout(r, 200)); rxRender(); await new Promise(r => setTimeout(r, 800));
  const rows = [...document.querySelectorAll('#dkList .dkrow')].map(x => x.querySelector('b').textContent);
  const cat = await dkCatalog(); for (const pk of cat) await dkInstall(pk); await new Promise(r => setTimeout(r, 300));
  return { rows, ms: (await dkMeta()).map(m => m.id), head: el('rxXdict').textContent, del: document.querySelectorAll('#dkList [data-dk="del"]').length }; });
ok('1 «Чтение → Словари»: Викисловарь, WordNet, Webster 1913; all three downloaded', JSON.stringify(r.rows) === JSON.stringify(['Русский Викисловарь', 'WordNet (Принстон)', 'Webster 1913']) && r.ms.length === 3 && r.del === 3 && /Викисловарь/.test(r.head), r);

// 2 lookups: a Russian form → its lemma; English plurals / verb forms; Webster
r = await p.evaluate(async () => { const t0 = performance.now(); const a = await dkLookup('шинели', 'ru'), b = await dkLookup('Городового', 'ru'), c = await dkLookup('runs', 'en'), d = await dkLookup('mosquitoes', 'en'), z = await dkLookup('qwxzv', 'ru');
  return { a: a.map(h => [h.m.id, h.head, h.via, h.text.slice(0, 60)]), b: b.map(h => [h.head, h.via]), c: c.map(h => [h.m.id, h.via]), d: d.map(h => [h.m.id, h.via]), z: z.length, ms: Math.round(performance.now() - t0) }; });
ok('2 «шинели» → «шинель» in the Russian Wiktionary, «Городового» → «городовой»', r.a.length >= 1 && r.a[0][0] === 'ru-wikt' && /шин/.test(r.a[0][1]) && r.a[0][2] === 'шинель' && r.b.length && r.b[0][1] === 'городовой', r);
ok('2 English: «runs» → «run», «mosquitoes» → «mosquito», in WordNet and Webster; an unknown word → nothing', r.c.some(x => x[0] === 'en-wordnet' && x[1] === 'run') && r.d.some(x => x[0] === 'en-webster1913') && r.z === 0, r);
r = await p.evaluate(async () => { const t0 = performance.now(); await dkLookup('надзирателем', 'ru'); return Math.round(performance.now() - t0); });
ok('2 a lookup is quick (< 1.5 s with the packs in the cache)', r < 1500, r);

// 3 where it opens: «Действия» → «Значение»; a double tap with «Значение слова»; «Полная статья» under a hard word
r = await p.evaluate(async () => { document.querySelectorAll('#settings').forEach(s => s.classList.add('hidden')); goPage(1, false); await new Promise(r => setTimeout(r, 100));
  const c = el('content'), at = c.textContent.indexOf('шинел'), T = rmNodes(), a = rmAt(T, at), z = rmAt(T, at + 7), s = getSelection(), rg = document.createRange(); rg.setStart(a.node, a.offset); rg.setEnd(z.node, z.offset); s.removeAllRanges(); s.addRange(rg);
  ssEl(); if (!el('ssMenu').onclick) stBind(); stMenu(true); const item = !!el('ssMenu').querySelector('[data-a="dict"]'); el('ssMenu').hidden = true; ST_ACT.dict(); await new Promise(r => setTimeout(r, 400));
  return { item, open: !el('rmNote').hidden, t: el('rmNote').textContent.slice(0, 200), sel: getSelection().isCollapsed }; });
ok('3 «Действия» → «Значение»: the window with «шинель» from the Wiktionary', r.item && r.open && /шинел/.test(r.t) && /Викисловарь/.test(r.t) && r.sel, r);
r = await p.evaluate(async () => { rmFnHide(); SET.rx.gest.dbl = 'dict'; goPage(1, false); const c = el('content'), T = rmNodes(), i = c.textContent.indexOf('городов', c.textContent.indexOf('шинел')), a = rmAt(T, i + 2);
  const rg = document.createRange(); rg.setStart(a.node, a.offset); rg.setEnd(a.node, a.offset + 1); const q = rg.getClientRects()[0]; goPage(selPageAt(q), false); await new Promise(r => setTimeout(r, 60));
  const q2 = rg.getClientRects()[0]; viewerTap(q2.left + 1, q2.top + q2.height / 2); await new Promise(r => setTimeout(r, 120)); viewerTap(q2.left + 1, q2.top + q2.height / 2); await new Promise(r => setTimeout(r, 600));
  const out = { open: !el('rmNote').hidden, t: el('rmNote').textContent.slice(0, 120) }; rmFnHide(); SET.rx.gest.dbl = 'off'; return out; });
ok('3 a double tap on a word (gesture «Значение слова») opens its entry', r.open && /городов/i.test(r.t), r);
r = await p.evaluate(async () => { rmS().hard = true; r2HardApply(); const h = [...CSS.highlights.get('rm-hard')].find(x => /^городов/i.test(x.toString())); goPage(selPageAt(h.getClientRects()[0]), false);
  const q = h.getClientRects()[0]; viewerTap(q.left + q.width / 2, q.top + q.height / 2); const full = !!el('dkFull'); if (full) el('dkFull').click(); await new Promise(r => setTimeout(r, 500));
  const t = el('rmNote').textContent; rmFnHide(); rmS().hard = false; r2HardApply(); return { full, t: t.slice(0, 120) }; });
ok('3 a hard word\'s short meaning → «Полная статья» → the dictionary entry', r.full && /Викисловарь/.test(r.t), r);

// 4 English links
r = await p.evaluate(async () => { await dkShow('running', 100, 200); const l = [...el('rmNote').querySelectorAll('.dklinks a')].map(a => [a.textContent, a.href]); const t = el('rmNote').textContent; rmFnHide(); return { l, t: t.slice(0, 160) }; });
ok('4 an English word: WordNet + Webster, links Cambridge / Oxford / Merriam-Webster', /WordNet/.test(r.t) && r.l.map(x => x[0]).join() === 'Cambridge,Oxford,Merriam-Webster' && /cambridge\.org\/dictionary\/english\/running/.test(r.l[0][1]), r);

// 5 own dictionaries: a StarDict with .dict.dz and .syn; a Lingvo DSL in UTF-16
const sd = (() => { const words = [['кот', 'домашнее животное, <b>мурлычет</b>'], ['пёс', 'собака']].sort((a, b) => Buffer.compare(Buffer.from(a[0]), Buffer.from(b[0])));
  let dict = Buffer.alloc(0); const idx = []; for (const [w, d] of words) { const b = Buffer.from(d); const e = Buffer.alloc(8); e.writeUInt32BE(dict.length, 0); e.writeUInt32BE(b.length, 4); idx.push(Buffer.concat([Buffer.from(w), Buffer.from([0]), e])); dict = Buffer.concat([dict, b]); }
  const syn = Buffer.concat([Buffer.from('котом'), Buffer.from([0]), (() => { const x = Buffer.alloc(4); x.writeUInt32BE(words.findIndex(w => w[0] === 'кот'), 0); return x; })()]);
  const idxB = Buffer.concat(idx); return { ifo: `StarDict's dict ifo file\nversion=2.4.2\nbookname=Тестовый\nwordcount=2\nsynwordcount=1\nidxfilesize=${idxB.length}\nsametypesequence=h\n`, idx: idxB, dz: zlib.gzipSync(dict), syn }; })();
const dsl = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('#NAME "Мой DSL"\n#INDEX_LANGUAGE "English"\n\nhello\n\t[m1][trn]привет[/trn][/m1]\n\t[ex]hello, world[/ex]\nworld\n\t[m1]мир[/m1]\n', 'utf16le')]);
r = await p.evaluate(async (s) => { const u = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  await dkImport([new File([s.ifo], 'test.ifo'), new File([u(s.idx)], 'test.idx'), new File([u(s.dz)], 'test.dict.dz'), new File([u(s.syn)], 'test.syn')]);
  await dkImport([new File([u(s.dsl)], 'my.dsl')]);
  const ms = await dkMeta(), a = await dkLookup('котом', 'ru'), b = await dkLookup('hello', 'en');
  return { ms: ms.filter(m => m.own).map(m => m.name + ':' + m.n), a: a.filter(h => h.m.own).map(h => [h.head, h.via, h.text]), b: b.filter(h => h.m.own).map(h => h.text) };
}, { ifo: sd.ifo, idx: sd.idx.toString('base64'), dz: sd.dz.toString('base64'), syn: sd.syn.toString('base64'), dsl: dsl.toString('base64') });
ok('5 own StarDict (.dict.dz + .syn): «котом» → «кот», html → text', r.ms.includes('Тестовый:2') && r.a.length === 1 && r.a[0][1] === 'кот' && /мурлычет/.test(r.a[0][2]) && !/<b>/.test(r.a[0][2]), r);
ok('5 own Lingvo DSL (UTF-16): «hello» → «привет», markup removed', r.ms.includes('Мой DSL:2') && r.b.length === 1 && /привет/.test(r.b[0]) && !/\[/.test(r.b[0]), r);

// 6 delete; the cache does not belong to the app's own caches
r = await p.evaluate(async () => { const id = (await dkMeta()).find(m => m.name === 'Мой DSL').id; const a0 = rqAsk; rqAsk = async () => true; await dkRemove(id); rqAsk = a0;
  return { left: (await dkMeta()).map(m => m.name), keys: (await caches.keys()).filter(k => /dict/.test(k)) }; });
ok('6 «Удалить» removes one dictionary; cache «rqdict» (the app\'s cleanup only deletes «rq-…»)', !r.left.includes('Мой DSL') && r.left.length === 4 && JSON.stringify(r.keys) === '["rqdict"]', r);
ok('no page errors', errs.length === 0, errs);
console.log('\nSUMMARY dict.test ' + checks.filter(Boolean).length + '/' + checks.length);
await browser.close();
process.exit(checks.every(Boolean) ? 0 : 1);
