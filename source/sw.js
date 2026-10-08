/* ReadQuest service worker. NS, build number + precache list injected by build-dist.sh.
 * NS 'rq' = main app (scope /readquest/), 'rqt' = test build (scope /readquest/test/).
 * Update strategy: NO skipWaiting. A new SW installs (precaches its own NS-<build>) and waits;
 * it activates only when every window of the old build is closed, so an open old window keeps
 * getting ALL its files (incl. lazily loaded pdf.js) from its own cache — never mixed builds.
 * HTML is network-first, so the next open after all windows closed shows the new build. */
'use strict';
const NS = '__RQ_NS__';
const BUILD = '__RQ_BUILD__';
const CACHE = NS + '-' + BUILD;
const PRECACHE = __RQ_PRECACHE__;
const NAV_TIMEOUT_MS = 1500; /* navigation: network vs cache race */

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

self.addEventListener('fetch', function (e) {
  const req = e.request;
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
      fetch(req, { cache: 'no-cache' }).then(function (r) { clearTimeout(timer); finish(r); }, function () {
        clearTimeout(timer);
        fromCache().then(function (m) { finish(m || Response.error()); }, function () { finish(Response.error()); });
      });
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (m) { return m || fetch(req); });
  }));
});
