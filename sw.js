/**
 * BeaPop K-Beauty — Service Worker (M79)
 *
 * Cache strategy:
 *   SHELL_CACHE    → Cache-First  : HTML shell, CSS, JS, fonts
 *   API_CACHE      → Network-First: product catalog API responses (stale-while-revalidate)
 *   OFFLINE_QUEUE  → IndexedDB    : POST /api/orders queued when offline, synced on reconnect
 */

const SHELL_VERSION = 'v4';
const SHELL_CACHE   = `beapop-shell-${SHELL_VERSION}`;
const API_CACHE     = `beapop-api-${SHELL_VERSION}`;
const OFFLINE_PAGE  = './offline.html';
const API_ORIGIN    = 'https://beapop-api.beapop.workers.dev';

// Pages and assets that must be available offline
const SHELL_ASSETS = [
  './',
  './index.html',
  './catalog.html',
  './cart.html',
  './order-form.html',
  './account.html',
  './tracking.html',
  './offline.html',
  './manifest.json',
  './styles.css',
  './auth.js',
  './chat-widget.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap',
];

// API paths whose GET responses are safe to cache (product catalog, inventory)
const CACHEABLE_API_PATHS = [
  '/api/inventory',
  '/api/health',
];

// ── Install ───────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      // addAll fails atomically; use individual adds so one missing asset
      // doesn't abort the whole install.
      return Promise.allSettled(
        SHELL_ASSETS.map((url) =>
          cache.add(url).catch((err) =>
            /* Failed to cache */
          )
        )
      );
    })
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== SHELL_CACHE && n !== API_CACHE)
          .map((n) => {
            return caches.delete(n);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ① Offline order queue: intercept POST /api/orders when offline
  if (
    request.method === 'POST' &&
    url.origin === API_ORIGIN &&
    url.pathname === '/api/orders'
  ) {
    event.respondWith(handleOfflineOrder(request));
    return;
  }

  // ② Cacheable API GET responses (inventory / health)
  if (
    request.method === 'GET' &&
    url.origin === API_ORIGIN &&
    CACHEABLE_API_PATHS.some((p) => url.pathname.startsWith(p))
  ) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // ③ Skip non-GET and cross-origin requests (CDN fonts handled by addAll)
  if (request.method !== 'GET') return;

  // ④ Same-origin assets → Cache-First with network fallback
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstWithNetwork(request));
    return;
  }

  // ⑤ Google Fonts → Cache-First
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirstWithNetwork(request));
    return;
  }
});

// ── Background Sync ───────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-orders') {
    event.waitUntil(flushPendingOrders());
  }
});

// ── Message (manual sync trigger from page) ───────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_ORDERS') {
    flushPendingOrders().then((count) => {
      event.source?.postMessage({ type: 'SYNC_DONE', synced: count });
    });
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Strategy helpers ──────────────────────────────────────────

/**
 * Cache-First: serve from cache; on miss fetch network and cache the response.
 * Falls back to offline.html for HTML navigation requests.
 */
async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkRes = await fetch(request);
    if (networkRes.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch {
    // Navigation fallback
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match(OFFLINE_PAGE);
    }
    return new Response('', { status: 503 });
  }
}

/**
 * Network-First: try network; on failure serve from cache.
 * Used for API catalog responses so data stays relatively fresh.
 */
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkRes = await fetch(request);
    if (networkRes.ok) {
      cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Offline order queue (IndexedDB) ──────────────────────────

const DB_NAME    = 'beapop-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-orders';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function dbAdd(db, payload) {
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(STORE_NAME, 'readwrite');
    const req  = tx.objectStore(STORE_NAME).add({ payload, queuedAt: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function dbGetAll(db) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function dbDelete(db, id) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Intercept POST /api/orders.
 * If network succeeds → pass through. If offline → queue in IndexedDB and
 * return a synthetic 202 response so the page knows the order was accepted.
 */
async function handleOfflineOrder(request) {
  // Clone body before attempting network (body can only be read once)
  const bodyText = await request.clone().text();

  try {
    const networkRes = await fetch(request);
    return networkRes;
  } catch {
    // Offline — queue locally
    try {
      const db = await openDB();
      await dbAdd(db, {
        url:     `${API_ORIGIN}/api/orders`,
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    bodyText,
      });

      // Register background sync (best-effort, not all browsers support it)
      self.registration.sync?.register('sync-pending-orders').catch(() => {});

      // Notify all open tabs
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((c) =>
        c.postMessage({ type: 'ORDER_QUEUED', message: 'Đơn hàng đã được lưu offline. Sẽ gửi khi có mạng.' })
      );

      return new Response(
        JSON.stringify({ queued: true, message: 'Đơn hàng đã lưu offline, sẽ gửi khi có mạng.' }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (dbErr) {
      /* Failed to queue order */
      return new Response(
        JSON.stringify({ error: 'offline', message: 'Không có mạng, vui lòng thử lại.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}

/**
 * Flush pending orders from IndexedDB to the API.
 * Called on background sync or manual trigger.
 * Returns count of successfully synced orders.
 */
async function flushPendingOrders() {
  let synced = 0;
  try {
    const db      = await openDB();
    const pending = await dbGetAll(db);

    for (const item of pending) {
      try {
        const res = await fetch(item.payload.url, {
          method:  item.payload.method,
          headers: item.payload.headers,
          body:    item.payload.body,
        });
        if (res.ok || res.status === 201) {
          await dbDelete(db, item.id);
          synced++;
        }
      } catch {
        // Still offline — leave in queue, try again next sync
        break;
      }
    }

    if (synced > 0) {
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((c) =>
        c.postMessage({ type: 'ORDERS_SYNCED', synced, message: `${synced} đơn hàng đã được gửi thành công!` })
      );
    }
  } catch (err) {
    /* flushPendingOrders error */
  }
  return synced;
}
