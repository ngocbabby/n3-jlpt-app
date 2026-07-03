const CACHE_NAME = 'n3-jlpt-v13-fast-renshu-overrides';

const URLS_TO_CACHE = [
  '/n3-jlpt-app/',
  '/n3-jlpt-app/index.html',
  '/n3-jlpt-app/fast-renshu.html',
  '/n3-jlpt-app/fast-renshu-v13.html',
  '/n3-jlpt-app/fast-renshu-safe.html',
  '/n3-jlpt-app/vocab.html',
  '/n3-jlpt-app/kanji.html',
  '/n3-jlpt-app/hoc-nhanh.html',
  '/n3-jlpt-app/fast-renshu-ov01.json',
  '/n3-jlpt-app/fast-renshu-ov02a.json',
  '/n3-jlpt-app/fast-renshu-ov02b.json',
  '/n3-jlpt-app/fast-renshu-ov03.json',
  '/n3-jlpt-app/fast-renshu-ov04a.json',
  '/n3-jlpt-app/fast-renshu-ov04b.json',
  '/n3-jlpt-app/fast-renshu-ov05.json',
  '/n3-jlpt-app/fast-renshu-ov06.json',
  '/n3-jlpt-app/fast-renshu-ov07.json',
  '/n3-jlpt-app/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.allSettled(URLS_TO_CACHE.map(url => cache.add(url).catch(e => console.log('Cache miss:', url))))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  const p = url.pathname;
  const fresh = p.endsWith('/n3-jlpt-app/') || p.endsWith('/n3-jlpt-app/index.html') || p.endsWith('/n3-jlpt-app/fast-renshu.html') || p.endsWith('/n3-jlpt-app/fast-renshu-v13.html') || p.endsWith('/n3-jlpt-app/fast-renshu-safe.html') || p.endsWith('/n3-jlpt-app/sw.js');
  if (fresh) {
    event.respondWith(fetch(event.request, {cache:'reload'}).then(r => { if (r && r.status === 200) { const c = r.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, c)); } return r; }).catch(() => caches.match(event.request).then(c => c || caches.match('/n3-jlpt-app/index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(r => { if (r && r.status === 200 && r.type !== 'opaque') { const c = r.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, c)); } return r; }).catch(() => caches.match('/n3-jlpt-app/index.html'))));
});
