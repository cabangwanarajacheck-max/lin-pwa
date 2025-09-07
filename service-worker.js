const CACHE_NAME = "lin-cache-v1";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Pas install → cache file penting
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// Pas fetch → coba ambil dari cache dulu
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// Notifikasi push (biar bisa showNotification dari app)
self.addEventListener("push", event => {
  const data = (event.data && event.data.json()) || {};
  self.registration.showNotification(data.title || "Lin Tsundere", {
    body: data.body || "Hei! Ada sesuatu nih!",
    icon: "icon-192.png"
  });
});
