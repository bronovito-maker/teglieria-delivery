const CACHE_NAME = "teglieria-pwa-v5-consent";
const OFFLINE_URL = "/offline";
// No personalized HTML, menu snapshots or consent-dependent CSP in the cache.
const CORE_ASSETS = ["/manifest.webmanifest", "/icons/LT_icon_tile.webp", OFFLINE_URL];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith("teglieria-pwa-") && key !== CACHE_NAME)
    .map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || /^\/(api|media|admin|account|rider|stato-ordine|sandbox)(\/|$)/.test(url.pathname)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(async () =>
      await caches.match(OFFLINE_URL) || new Response("Offline", {
        status: 503, headers: {"Content-Type": "text/plain; charset=utf-8"}
      })));
    return;
  }
  const asset = /^(\/_next\/static\/|\/icons\/|\/images\/)/.test(url.pathname) || url.pathname === "/manifest.webmanifest";
  if (asset) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => new Response("", { status: 503 }))));
});
