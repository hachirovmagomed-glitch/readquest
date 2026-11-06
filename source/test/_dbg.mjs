import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const sl = (ms) => new Promise(r => setTimeout(r, ms));
await p.goto('http://127.0.0.1:8767/readquest/test/'); await p.waitForFunction(() => window.__rqReady); await sl(400);
await p.evaluate(() => { SET.flip = Object.assign({}, flipGet(), { mode: 'page' }); rqSaveSetGated(); });
await (await p.$('#fileInp')).uploadFile(process.argv[2] || '/workspace/rqtest/pdf/b-nolabels-40.pdf'); await sl(2500);
await p.evaluate(async () => { const f = allBooks().find(x => x.type === 'pdf'); openBook(f.id); await new Promise(r => setTimeout(r, 3500)); });
console.log(JSON.stringify(await p.evaluate(() => {
  const out = [];
  for (const sp of [...document.querySelectorAll('#pdfText span')].filter(s => s.textContent.trim().length > 12).slice(2, 6)) {
  const rg = document.createRange(); rg.selectNodeContents(sp); const r = rg.getClientRects()[0];
  const cv = document.querySelector('#pdfWrap canvas'), cr = cv.getBoundingClientRect(), k = cv.width / cr.width, ctx = cv.getContext('2d');
  const x0 = Math.round((r.left - cr.left) * k), x1 = Math.round((r.right - cr.left) * k); let s = '';
  for (let y = r.top - 6; y < r.bottom + 6; y += 0.5) { const yy = Math.round((y - cr.top) * k); const d = ctx.getImageData(x0, yy, x1 - x0, 1).data; let dark = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 400) dark++; s += dark > 2 ? '#' : '.'; }
  out.push({ fs: parseFloat(sp.style.fontSize), top: r.top, h: r.height, scan: s }); }
  return out;
})));
await b.close();
