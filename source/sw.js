/* ReadQuest service worker. Build number + precache list injected by build-dist.sh. */
'use strict';
const BUILD = '__RQ_BUILD__';
const CACHE = 'rq-' + BUILD;
const PRECACHE = __RQ_PRECACHE__;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(PRECACHE.map(function (u) {
      return fetch(new Request(u, { cache: 'reload' })).then(function (r) {
        if (!r.ok) throw new Error('precache ' + u + ' ' + r.status);
        return c.put(u, r);
      });
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('rq-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function isBook(url) { return /\.(pdf|fb2|epub|txt|zip)$/i.test(url.pathname); }

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          /* also excludes blob:, data: */
  const scope = new URL(self.registration.scope);
  if (url.pathname.indexOf(scope.pathname) !== 0) return;   /* only /readquest/ */
  if (isBook(url)) return;                                  /* books live in IndexedDB */
  if (req.mode === 'navigate') {
    /* network-first, bypass HTTP cache (Pages max-age=600) so a new build is seen on next open */
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(function (r) {
      if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(url.pathname.endsWith('/') ? './' : req, cp); }); }
      return r;
    }).catch(function () {
      return caches.open(CACHE).then(function (c) {
        return c.match(req, { ignoreSearch: true }).then(function (m) { return m || c.match('./') || c.match('index.html'); });
      });
    }));
    return;
  }
  /* static: cache-first from the versioned cache only (never another rq- build) */
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (m) { return m || fetch(req); });
  }));
});
