const CACHE_NAME = "plodnee-pwa-v1";
const SHELL_ASSETS = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      if (request.mode === "navigate") {
        try {
          const networkResp = await fetch(request);
          const copy = networkResp.clone();
          cache.put("/index.html", copy);
          return networkResp;
        } catch (err) {
          const cached = await cache.match("/index.html");
          if (cached) return cached;
          return new Response("<h1>offline</h1>", { status: 503, headers: { "Content-Type": "text/html" } });
        }
      }
      const cachedResp = await cache.match(request);
      if (cachedResp) return cachedResp;
      const networkResp = await fetch(request);
      if (networkResp && networkResp.ok) {
        const copy = networkResp.clone();
        cache.put(request, copy);
      }
      return networkResp;
    })()
  );
});
