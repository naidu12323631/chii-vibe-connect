// milo service worker: push notifications + offline app shell.
//
// Caching strategy (all same-origin GETs only — Supabase calls always go to the
// network so data is never served stale):
//   * navigations      network-first, falling back to the cached shell offline
//   * /assets/*        cache-first; Vite fingerprints these, so they're immutable
//   * icons, manifest  stale-while-revalidate
// Bump CACHE_VERSION to retire old caches on the next activation.
const CACHE_VERSION = "milo-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const SHELL_URL = "/index.html";

const PRECACHE = [
  "/",
  SHELL_URL,
  "/manifest.webmanifest",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Individually, so one 404 can't fail the whole install.
      await Promise.all(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => {})),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

const isAsset = (url) => url.pathname.startsWith("/assets/");
const isStatic = (url) =>
  url.pathname.startsWith("/icons/") ||
  url.pathname === "/manifest.webmanifest" ||
  url.pathname === "/favicon.svg" ||
  url.pathname === "/apple-touch-icon.png" ||
  url.pathname.startsWith("/covers/");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Leave cross-origin traffic (Supabase, OpenStreetMap tiles, CDNs) alone.
  if (url.origin !== self.location.origin) return;

  // SPA navigations: try the network, fall back to the cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(SHELL_URL, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(SHELL_URL);
          return cached ?? new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(ASSET_CACHE);
          cache.put(request, fresh.clone()).catch(() => {});
        }
        return fresh;
      })(),
    );
    return;
  }

  if (isStatic(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const network = fetch(request)
          .then((fresh) => {
            if (fresh.ok) {
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, fresh.clone()).catch(() => {}));
            }
            return fresh;
          })
          .catch(() => cached);
        return cached ?? network;
      })(),
    );
  }
});

// Lets the page trigger an immediate update instead of waiting for a reload.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// ------------------------------------------------------------ push notifications
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "milo", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "milo";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    tag: data.tag,
    renotify: !!data.tag,
    data: { url: data.url || "/app" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of all) {
      try {
        const u = new URL(client.url);
        if (u.origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      } catch { /* noop */ }
    }
    await self.clients.openWindow(url);
  })());
});
