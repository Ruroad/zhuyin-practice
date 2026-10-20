// 離線快取。新增檔案時，記得加進 FILES，並把 VERSION 加一。
const VERSION = 'v3';
const CACHE = `linlin-${VERSION}`;
const FILES = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/audio.js',
  'js/data.js',
  'js/store.js',
  'js/linlin.js',
  'js/recordings.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'audio/syl-ba1.mp3',
  'audio/syl-ba4.mp3',
  'audio/syl-bo1.mp3',
  'audio/syl-bo2.mp3',
  'audio/syl-fa1.mp3',
  'audio/syl-fa3.mp3',
  'audio/syl-ma1.mp3',
  'audio/syl-ma2.mp3',
  'audio/syl-ma3.mp3',
  'audio/syl-ma4.mp3',
  'audio/syl-mo1.mp3',
  'audio/syl-mo2.mp3',
  'audio/syl-pa2.mp3',
  'audio/syl-pa4.mp3',
  'audio/syl-po1.mp3',
  'audio/syl-po2.mp3',
  'audio/syl-po4.mp3',
  'audio/sym-a.mp3',
  'audio/sym-b.mp3',
  'audio/sym-e.mp3',
  'audio/sym-m.mp3',
  'audio/sym-o.mp3',
  'audio/sym-p.mp3',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 有網路時先抓最新版（順便更新快取），沒網路才用快取
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
