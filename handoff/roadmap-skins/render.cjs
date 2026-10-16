// node render.cjs out.png in.html ...  (pairs)
const { chromium } = require('playwright');
(async () => {
  const a = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (let i = 0; i < a.length; i += 2) {
    await p.goto('file://' + a[i + 1]);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
    await p.screenshot({ path: a[i], fullPage: true });
  }
  await b.close();
})();
