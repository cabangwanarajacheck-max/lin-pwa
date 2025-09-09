// =============================
// ⚡ Lin Project Service Worker
// =============================

const CACHE_NAME = "lin-cache-v2"; // update versi kalau ada perubahan
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/style.css",
  "/chat.js",
  "/features.js",
  "/live2d.js",
  "/scenes.js",
  "/main.js",
  "/icon-192.png",
  "/icon-512.png"
];

// Install → cache asset statis
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE).catch(err => {
        console.warn("Cache addAll failed:", err);
      });
    })
  );
});

// Activate → hapus cache lama
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 🔹 Fetch → ambil dari cache dulu, kecuali models
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // 🚫 Jangan cache file model Live2D
  if (url.pathname.includes("/models/")) {
    event.respondWith(fetch(event.request));
    return; // stop di sini
  }

  // Default: cache-first
  event.respondWith(
    caches.match(event.request).then(res => {
      return res || fetch(event.request);
    })
  );
});

// 🔹 Push Notification
self.addEventListener("push", event => {
  const data = (event.data && event.data.json()) || {};
  self.registration.showNotification(data.title || "Lin Tsundere", {
    body: data.body || "Hei! Ada sesuatu nih!",
    icon: "icon-192.png"
  });
});
