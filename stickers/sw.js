const VERSION = 'mks-1.0.0';
const CORE = ['./', 'index.html', 'app.css?v=2', 'app.js?v=2', 'manifest.webmanifest', 'fonts/ElMessiri-VF.ttf', 'img/mishkat.svg', 'icons/icon-192.png', 'stickers/library.json', 'stickers/packs-default.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VERSION).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {   // الملصقات تُخزَّن عند أول عرض لها
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { if (res.ok) { const c = res.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); } return res; }).catch(() => caches.match('index.html'))));
});
