const CACHE_NAME = "teglieria-pwa-v2";
const OFFLINE_URL = "/offline";
const CORE_ASSETS = [
  "/",
  "/menu",
  "/servizi",
  "/privacy",
  "/cookie-policy",
  "/manifest.webmanifest",
  "/icons/LT_icon_tile.webp",
  OFFLINE_URL,
];

const isPublicNavigation = (pathname) => [
  "/",
  "/menu",
  "/servizi",
  "/privacy",
  "/cookie-policy",
  OFFLINE_URL,
].includes(pathname);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isNavigation = event.request.mode === "navigate";

  if (isNavigation) {
    // Le pagine con sessione non devono mai essere servite da una cache
    // offline: una pagina login cached può riaprire il redirect all'infinito
    // anche quando il login sul server è già riuscito.
    if (!isPublicNavigation(requestUrl.pathname)) {
      event.respondWith(
        fetch(event.request).catch(async () => {
          const offline = await caches.match(OFFLINE_URL);
          return offline || new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }),
      );
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // For same-origin static assets (files with extension) use cache first.
  // Skip Next.js prefetch/RSC requests and API routes — let them go to network normally.
  const isStaticAsset = /\.[a-z0-9]+$/i.test(requestUrl.pathname);
  if (requestUrl.origin === self.location.origin && isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const cloned = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
            }
            return response;
          })
          .catch(() => new Response("", { status: 503 }));
      })
    );
  }
});
