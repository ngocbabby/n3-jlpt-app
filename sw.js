const CACHE_NAME = 'n3-jlpt-v2-fast-renshu';

const URLS_TO_CACHE = [
  '/n3-jlpt-app/',
  '/n3-jlpt-app/index.html',
  '/n3-jlpt-app/fast-renshu.html',
  '/n3-jlpt-app/love-sprint.html',
  '/n3-jlpt-app/n3-grammarnew.html',
  '/n3-jlpt-app/vocab.html',
  '/n3-jlpt-app/kanji.html',
  '/n3-jlpt-app/n3-dokkai.html',
  '/n3-jlpt-app/reading.html',
  '/n3-jlpt-app/meo.html',
  '/n3-jlpt-app/hoc-nhanh.html',
  '/n3-jlpt-app/icon-192.png',
  '/n3-jlpt-app/icon-512.png',
  '/n3-jlpt-app/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(URLS_TO_CACHE.map(url => cache.add(url).catch(e => console.log('Cache miss:', url))))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // Home va Fast Renshu uu tien network de tranh hien ban cache cu.
  const pathname = url.pathname;
  const networkFirst = pathname.endsWith('/n3-jlpt-app/') || pathname.endsWith('/n3-jlpt-app/index.html') || pathname.endsWith('/n3-jlpt-app/fast-renshu.html');

  if (networkFirst) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match('/n3-jlpt-app/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/n3-jlpt-app/index.html'));
    })
  );
});
