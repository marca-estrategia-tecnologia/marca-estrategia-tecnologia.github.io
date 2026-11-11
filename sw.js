/* Service worker da Central e da Estação: abre sem internet as páginas já visitadas.
   Dados (contas, licenças, chamados) sempre vêm do servidor. */
var CACHE = "central-2";
var ARQUIVOS = ["./", "index.html", "estacao.html", "manifest.webmanifest", "img/icone-192.png", "img/icone-512.png", "img/anderson.webp"];
self.addEventListener("install", function(e){ e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ARQUIVOS); })); self.skipWaiting(); });
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); }));
  self.clients.claim();
});
self.addEventListener("fetch", function(e){
  var u = new URL(e.request.url);
  if(e.request.method !== "GET" || u.origin !== location.origin) return; // servidor e fontes: sempre pela rede
  e.respondWith(fetch(e.request).then(function(r){
    var copia = r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, copia); }); return r;
  }).catch(function(){ return caches.match(e.request).then(function(r){ return r || caches.match("estacao.html"); }); }));
});
