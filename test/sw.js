/* ReadQuest service worker. NS, build number + precache list injected by build-dist.sh.
 * NS 'rq' = main app (scope /readquest/), 'rqt' = test build (scope /readquest/test/).
 * Update strategy: NO skipWaiting. A new SW installs (precaches its own NS-<build>) and waits;
 * it activates only when every window of the old build is closed, so an open old window keeps
 * getting ALL its files (incl. lazily loaded pdf.js) from its own cache — never mixed builds.
 * HTML is network-first, so the next open after all windows closed shows the new build. */
'use strict';
const NS = 'rqt';
const BUILD = '20261029-1226';
const CACHE = NS + '-' + BUILD;
const PRECACHE = ["./","app.html","fonts/OFL.txt","fonts/babochkovyi-bellotatext-bold.woff2","fonts/babochkovyi-mulish-extrabold.woff2","fonts/babochkovyi-mulish-medium.woff2","fonts/babochkovyi-plexserif-regular.woff2","fonts/babochkovyi-plexserif-semibold.woff2","fonts/babochkovyi-poiretone.woff2","fonts/caveat.woff2","fonts/celestial-cormorant-bold.woff2","fonts/celestial-lora-regular.woff2","fonts/celestial-lora-semibold.woff2","fonts/celestial-manrope-bold.woff2","fonts/celestial-manrope-extrabold.woff2","fonts/celestial-manrope-medium.woff2","fonts/ellada-alegreyasans-bold.woff2","fonts/ellada-alegreyasans-medium.woff2","fonts/ellada-alegreyasanssc-extrabold.woff2","fonts/ellada-cormorantunicase-bold.woff2","fonts/nunito.woff2","fonts/reader-liberationserif-bold.woff2","fonts/reader-liberationserif-regular.woff2","game-awards.js?v=20261029-1226","hero/authors/andersen.webp","hero/authors/austen.webp","hero/authors/balzac.webp","hero/authors/belyaev.webp","hero/authors/blok.webp","hero/authors/bronte.webp","hero/authors/burns.webp","hero/authors/byron.webp","hero/authors/carroll.webp","hero/authors/cervantes.webp","hero/authors/chekhov.webp","hero/authors/cooper.webp","hero/authors/credits.json","hero/authors/dante.webp","hero/authors/defoe.webp","hero/authors/derzhavin.webp","hero/authors/dickens.webp","hero/authors/dostoevsky.webp","hero/authors/doyle.webp","hero/authors/dumas.webp","hero/authors/fet.webp","hero/authors/flaubert.webp","hero/authors/goethe.webp","hero/authors/gogol.webp","hero/authors/gorky.webp","hero/authors/griboyedov.webp","hero/authors/grimm.webp","hero/authors/heine.webp","hero/authors/homer.webp","hero/authors/hugo.webp","hero/authors/karamzin.webp","hero/authors/kipling.webp","hero/authors/krylov.webp","hero/authors/kuprin.webp","hero/authors/lermontov.webp","hero/authors/leskov.webp","hero/authors/lomonosov.webp","hero/authors/london.webp","hero/authors/maupassant.webp","hero/authors/mayakovsky.webp","hero/authors/moliere.webp","hero/authors/nekrasov.webp","hero/authors/ostrovsky.webp","hero/authors/petrarch.webp","hero/authors/plato.webp","hero/authors/poe.webp","hero/authors/pushkin.webp","hero/authors/saltykov.webp","hero/authors/schiller.webp","hero/authors/scott.webp","hero/authors/shakespeare.webp","hero/authors/stendhal.webp","hero/authors/stevenson.webp","hero/authors/swift.webp","hero/authors/tolstoy.webp","hero/authors/tsvetaeva.webp","hero/authors/turgenev.webp","hero/authors/twain.webp","hero/authors/tyutchev.webp","hero/authors/verne.webp","hero/authors/voltaire.webp","hero/authors/wells.webp","hero/authors/wilde.webp","hero/authors/yesenin.webp","hero/authors/zhukovsky.webp","hero/celestial/alkhimik.webp","hero/celestial/dress/base-af.webp","hero/celestial/dress/base-am.webp","hero/celestial/dress/base-tf.webp","hero/celestial/dress/base-tm.webp","hero/celestial/dress/cd-af-accessory.webp","hero/celestial/dress/cd-af-boots-t.webp","hero/celestial/dress/cd-af-boots.webp","hero/celestial/dress/cd-af-bottom-t.webp","hero/celestial/dress/cd-af-bottom.webp","hero/celestial/dress/cd-af-cape-b.webp","hero/celestial/dress/cd-af-cape-f.webp","hero/celestial/dress/cd-af-gloves-t.webp","hero/celestial/dress/cd-af-gloves.webp","hero/celestial/dress/cd-af-hand-t.webp","hero/celestial/dress/cd-af-hand.webp","hero/celestial/dress/cd-af-headwear.webp","hero/celestial/dress/cd-af-top-t.webp","hero/celestial/dress/cd-af-top.webp","hero/celestial/dress/cd-am-accessory-t.webp","hero/celestial/dress/cd-am-accessory.webp","hero/celestial/dress/cd-am-boots-t.webp","hero/celestial/dress/cd-am-boots.webp","hero/celestial/dress/cd-am-bottom.webp","hero/celestial/dress/cd-am-cape-b.webp","hero/celestial/dress/cd-am-cape-f-t.webp","hero/celestial/dress/cd-am-cape-f.webp","hero/celestial/dress/cd-am-gloves.webp","hero/celestial/dress/cd-am-hand-t.webp","hero/celestial/dress/cd-am-hand.webp","hero/celestial/dress/cd-am-headwear-t.webp","hero/celestial/dress/cd-am-headwear.webp","hero/celestial/dress/cd-am-top-t.webp","hero/celestial/dress/cd-am-top.webp","hero/celestial/dress/cd-tf-accessory.webp","hero/celestial/dress/cd-tf-boots.webp","hero/celestial/dress/cd-tf-bottom-t.webp","hero/celestial/dress/cd-tf-bottom.webp","hero/celestial/dress/cd-tf-cape-b-t.webp","hero/celestial/dress/cd-tf-cape-b.webp","hero/celestial/dress/cd-tf-cape-f-t.webp","hero/celestial/dress/cd-tf-cape-f.webp","hero/celestial/dress/cd-tf-gloves.webp","hero/celestial/dress/cd-tf-hand-t.webp","hero/celestial/dress/cd-tf-hand.webp","hero/celestial/dress/cd-tf-headwear.webp","hero/celestial/dress/cd-tf-top-t.webp","hero/celestial/dress/cd-tf-top.webp","hero/celestial/dress/cd-tm-accessory.webp","hero/celestial/dress/cd-tm-boots-t.webp","hero/celestial/dress/cd-tm-boots.webp","hero/celestial/dress/cd-tm-bottom.webp","hero/celestial/dress/cd-tm-cape-b.webp","hero/celestial/dress/cd-tm-cape-f.webp","hero/celestial/dress/cd-tm-gloves-t.webp","hero/celestial/dress/cd-tm-gloves.webp","hero/celestial/dress/cd-tm-hand-t.webp","hero/celestial/dress/cd-tm-hand.webp","hero/celestial/dress/cd-tm-headwear-t.webp","hero/celestial/dress/cd-tm-headwear.webp","hero/celestial/dress/cd-tm-top-t.webp","hero/celestial/dress/cd-tm-top.webp","hero/celestial/dress/cp-cat.webp","hero/celestial/dress/cp-dragon.webp","hero/celestial/dress/cp-fox.webp","hero/celestial/dress/cp-jelly.webp","hero/celestial/dress/cp-moth.webp","hero/celestial/dress/cp-owl.webp","hero/celestial/kartograf.webp","hero/celestial/kometa.webp","hero/celestial/lunnaya-zhritsa.webp","hero/celestial/perepletchik.webp","hero/celestial/sadovnik.webp","hero/celestial/solnechny-paladin.webp","hero/celestial/sonny-chtets.webp","hero/celestial/strazh-tishiny.webp","hero/celestial/tenevoy-chtets.webp","hero/celestial/zvezdny-bard.webp","hero/celestial/zvezdny-prints.webp","icons/icon-192.png","icons/icon-test-192.png","icons/icon-test-512.png","icons/icon-test-maskable-512.png","icons/icon-test-mono.svg","index.html","js/ach-core.js?v=20261029-1226","js/achievements.js?v=20261029-1226","js/adv.js?v=20261029-1226","js/book-find.js?v=20261029-1226","js/books-builtin.js?v=20261029-1226","js/content.js?v=20261029-1226","js/core-a.js?v=20261029-1226","js/core-b.js?v=20261029-1226","js/diary.js?v=20261029-1226","js/focus.js?v=20261029-1226","js/hero-celestial.js?v=20261029-1226","js/hero-pencil.js?v=20261029-1226","js/hero.js?v=20261029-1226","js/library.js?v=20261029-1226","js/ocr.js?v=20261029-1226","js/page-curl.js?v=20261029-1226","js/page-grid.js?v=20261029-1226","js/path.js?v=20261029-1226","js/pdf-scroll.js?v=20261029-1226","js/pdf.js?v=20261029-1226","js/pwa-lock.js?v=20261029-1226","js/quotes.js?v=20261029-1226","js/reader-ui.js?v=20261029-1226","js/reader.js?v=20261029-1226","js/rpg.js?v=20261029-1226","js/settings.js?v=20261029-1226","js/start.js?v=20261029-1226","js/translate.js?v=20261029-1226","js/v6-extras.js?v=20261029-1226","manifest.webmanifest","reader-session.js?v=20261029-1226","skins/skins.css?v=20261029-1226","storage/adapter.js?v=20261029-1226","storage/events.js?v=20261029-1226","storage/idb.js?v=20261029-1226","storage/index.js?v=20261029-1226","storage/migrate-v6.js?v=20261029-1226","storage/schema.js?v=20261029-1226","storage/sessions.js?v=20261029-1226","storage/state.js?v=20261029-1226","tokens.css?v=20261029-1226","vendor/jszip/jszip.min.js","vendor/pdfjs/pdf.min.js","vendor/pdfjs/pdf.worker.min.js","vendor/tesseract/tesseract.min.js","vendor/tesseract/worker.min.js"];
const NAV_TIMEOUT_MS = 1500; /* navigation: network vs cache race */
const APP_MARK = '<meta name="rq-app" content="readquest">'; /* in app.html <head>; a captive portal page won't have it */

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(PRECACHE.map(function (u) {
      return fetch(new Request(u, { cache: 'reload' })).then(function (r) {
        if (!r.ok) throw new Error('precache ' + u + ' ' + r.status);
        return c.put(u, r);
      });
    }));
  }));
});

self.addEventListener('activate', function (e) {
  /* only our own namespace: 'rq-' never matches 'rqt-' and vice versa; foreign caches untouched */
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf(NS + '-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); })); /* first install only: no older controller exists */
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.t === 'build' && e.ports && e.ports[0]) e.ports[0].postMessage({ ns: NS, build: BUILD, cache: CACHE });
});

function isBook(url) { return /\.(pdf|fb2|epub|txt|zip)$/i.test(url.pathname); }

/* «Поделиться → ReadQuest» (manifest share_target, Android): the system POSTs the files to ./share-target.
 * They go to the cache NS + '_share' (not NS + '-…', so activate never deletes it), one entry per file, name in X-RQ-Name;
 * then 303 to ./?share=1, where the app (importSharedBooks in js/library.js) adds them and empties the cache. */
const SHARE = NS + '_share';
function shareTarget(req) {
  return req.formData().then(function (fd) {
    const files = fd.getAll('books').filter(function (f) { return f && typeof f === 'object' && f.size > 0; });
    return caches.open(SHARE).then(function (c) {
      const t = Date.now();
      return Promise.all(files.map(function (f, i) {
        return c.put(new Request('share/' + t + '-' + i), new Response(f, { headers: { 'Content-Type': f.type || 'application/octet-stream', 'X-RQ-Name': encodeURIComponent(f.name || '') } }));
      }));
    });
  }).catch(function (err) { console.warn('[rq] share-target', err); })
    .then(function () { return Response.redirect(new URL('./?share=1', self.registration.scope).href, 303); });
}

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method === 'POST' && new URL(req.url).pathname === new URL('./share-target', self.registration.scope).pathname) { e.respondWith(shareTarget(req)); return; }
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          /* also excludes blob:, data: */
  const scope = new URL(self.registration.scope).pathname;
  if (url.pathname.indexOf(scope) !== 0) return;
  /* main SW: /readquest/test/ is a separate deployment with its own SW — never ours */
  if (NS === 'rq' && url.pathname.indexOf(scope + 'test/') === 0) return;
  if (isBook(url)) return;                                  /* books live in IndexedDB */
  if (req.mode === 'navigate') {
    /* network-first, bypass HTTP cache (Pages max-age=600). The network copy is NOT stored:
       the cache only ever holds this SW's own build, so offline = consistent old build.
       Race (Architect, stage 0): Wi-Fi without internet / captive portal = fetch neither answers nor fails →
       after NAV_TIMEOUT_MS serve this build from cache. The network request is NOT aborted (a late answer is
       just ignored); network fails fast → cache at once; no cached copy → keep waiting for the network. */
    const fromCache = function () {
      return caches.open(CACHE).then(function (c) {
        return c.match(req, { ignoreSearch: true }).then(function (m) { return m || c.match('./') || c.match('index.html'); });
      });
    };
    e.respondWith(new Promise(function (resolve) {
      let done = false;
      const finish = function (r) { if (!done && r) { done = true; resolve(r); } };
      const timer = setTimeout(function () { fromCache().then(finish, function () {}); }, NAV_TIMEOUT_MS);
      const cacheOr = function (r) { fromCache().then(function (m) { finish(m || r || Response.error()); }, function () { finish(r || Response.error()); }); };
      fetch(req, { cache: 'no-cache' }).then(function (r) {
        /* captive portal (Architect B1): accept only OUR page — ok, same origin, not a (manual-mode) redirect,
           and HTML carrying the app marker. Anything else → this build from cache (or the response if nothing cached). */
        let same = false; try { same = !r.url || new URL(r.url).origin === self.location.origin; } catch (x) {}
        if (!r.ok || r.type === 'opaqueredirect' || r.type === 'opaque' || !same) { clearTimeout(timer); cacheOr(r); return; }
        if (!/text\/html/i.test(r.headers.get('content-type') || '')) { clearTimeout(timer); finish(r); return; }
        r.clone().text().then(function (t) {
          clearTimeout(timer);
          if (t.indexOf(APP_MARK) >= 0) finish(r); else cacheOr(r);
        }, function () { clearTimeout(timer); cacheOr(r); });
      }, function () {
        clearTimeout(timer);
        cacheOr(null);
      });
    }));
    return;
  }
  /* 21.10 перевод: движок vendor/bergamot не в precache (5 МБ) — его кладёт в NS + '_tr' кнопка «Скачать пакет» (js/translate.js) */
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (m) {
      return m || caches.open(NS + '_tr').then(function (t) { return t.match(req); })
        .then(function (m2) { return m2 || caches.open(NS + '_ocr').then(function (t) { return t.match(req); }); }) /* 28.10 распознавание: движок и языки (js/ocr.js) */
        .then(function (m3) { return m3 || fetch(req); });
    });
  }));
});
