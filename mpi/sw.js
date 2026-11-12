/* MPI — service worker: permite instalar na área de trabalho e abrir a tela mesmo com internet instável.
   Os dados (banco) sempre vêm do servidor, nunca do cache. */
const CACHE = 'mpi-v4';
const BASE = ['./', 'index.html', 'baixar.html', 'guia.html', 'manifest.webmanifest', 'img/icone-192.png', 'img/icone-512.png', 'img/logo-innovar-branca.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('mpi-') && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('config.json')) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
