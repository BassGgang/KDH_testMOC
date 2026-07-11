// Service Worker for Karate Scoring & Analytics
// Strategy:
//   - Navigation requests: network-only. Authenticated HTML must not survive
//     sign-out in a shared cache.
//   - Static assets (/_next/, /icon*): cache-first.
//   - API requests: network-only (data must never be served stale by SW —
//     IndexedDB + outbox handles offline state authoritatively).
//
// Bump CACHE_VERSION to invalidate the cache after deploys.

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `karate-static-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-maskable.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache API responses or the service worker itself.
  if (url.pathname.startsWith('/api/') || url.pathname.endsWith('/sw.js')) {
    return;
  }

  // Static assets: cache-first.
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/icon')) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Never cache authenticated HTML. IndexedDB remains authoritative for an
  // already-open offline scoring screen.
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return cached ?? Response.error();
  }
}
