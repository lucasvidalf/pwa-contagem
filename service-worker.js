const CACHE_NAME = "estoque-cache-v1";
const urlsToCache = [
  "/", // raiz
  "/index.html",
  "/style.css",
  "/script.js",
  "/logo-192.png", // substitua pelos arquivos reais do seu sistema
  "https://script.google.com/macros/s/AKfycbxMXlGfKgoImTIsxtOZ4Uy451gQ9LqTVn2uknqfLL-BB6lcywsN93C1FKByAJ2idIQM2A/exec", // exemplo de fonte externa, se usar
];

// Instala e adiciona ao cache os arquivos definidos
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativa e limpa caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Intercepta fetchs e responde com cache se possível
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(res => {
      return res || fetch(event.request);
    })
  );
});
