const CACHE_NAME = 'n3-jlpt-v1';

const URLS_TO_CACHE = [
  '/n3-jlpt-app/',
  '/n3-jlpt-app/index.html',
  '/n3-jlpt-app/n3-grammarnew.html',
  '/n3-jlpt-app/vocab.html',
  '/n3-jlpt-app/kanji.html',
  '/n3-jlpt-app/n3-dokkai.html',
  '/n3-jlpt-app/reading.html',
  '/n3-jlpt-app/meo.html',
  '/n3-jlpt-app/icon-192.png',
  '/n3-jlpt-app/icon-512.png',
  '/n3-jlpt-app/manifest.json'
];

// Cài đặt: cache tất cả trang
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        URLS_TO_CACHE.map(url => cache.add(url).catch(e => console.log('Cache miss:', url)))
      );
    })
  );
  self.skipWaiting();
});

// Xoá cache cũ
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache first, network fallback
self.addEventListener('fetch', event => {
  // Bỏ qua request không phải GET
  if (event.request.method !== 'GET') return;
  
  // Bỏ qua Google Fonts và external resources (vẫn cần mạng)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        return caches.match('/n3-jlpt-app/index.html');
      });
    })
  );
});
