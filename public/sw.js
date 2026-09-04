const CACHE_VERSION = "echonotes-shell-v2";
const RUNTIME_CACHE = "echonotes-runtime-v2";
const REQUIRED_SHELL = ["/app", "/manifest.webmanifest", "/echo8v-logo.png"];
const OPTIONAL_SHELL = ["/", "/favicon.ico", "/offline.html"];

async function fetchAndCache(cache, path) {
  const response = await fetch(path, { cache: "reload" });
  if (!response.ok) throw new Error(`Could not cache ${path}: ${response.status}`);
  await cache.put(path, response.clone());
  return response;
}

function assetsFromHtml(html) {
  return [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith("data:") && !value.startsWith("#"))
    .map((value) => new URL(value, self.location.origin))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.pathname + url.search);
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_VERSION);
  const appResponse = await fetchAndCache(cache, "/app");
  const html = await appResponse.text();

  await Promise.all(
    [...new Set(assetsFromHtml(html))].map((asset) => fetchAndCache(cache, asset)),
  );
  await Promise.all(REQUIRED_SHELL.slice(1).map((path) => fetchAndCache(cache, path)));
  await Promise.allSettled(OPTIONAL_SHELL.map((path) => fetchAndCache(cache, path)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([CACHE_VERSION, RUNTIME_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("echonotes-") && !keep.has(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_LOADED_APP") return;

  event.waitUntil((async () => {
    try {
      const cache = await caches.open(RUNTIME_CACHE);
      const urls = [...new Set(event.data.urls ?? [])]
        .map((value) => new URL(value, self.location.origin))
        .filter((url) => url.origin === self.location.origin)
        .map((url) => url.pathname + url.search);
      await Promise.all(urls.map((url) => fetchAndCache(cache, url)));
      event.ports[0]?.postMessage({ ready: true });
    } catch (error) {
      event.ports[0]?.postMessage({ ready: false, error: error.message });
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return await caches.match(request, { ignoreSearch: true }) || await caches.match("/app") || await caches.match("/offline.html") || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return Response.error();
    }
  })());
});
