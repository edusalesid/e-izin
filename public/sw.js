// Service Worker for E-Izin Santri SMAIT Ihsanul Fikri PWA
const CACHE_NAME = 'e-izin-pwa-v7';

const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/icon.svg',
  '/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API calls, webpack-hmr, and dev updates from caching completely
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  // Navigation requests and Next.js static assets/chunks: ALWAYS NETWORK-FIRST
  // This guarantees updates to the app appear immediately without stale bundle issues
  if (
    event.request.mode === 'navigate' ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request) || caches.match('/');
        })
    );
    return;
  }

  // Static shell assets (images, icons, manifest): Cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// PWA Notification click interaction
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// PWA Push Notification handler (Web Push Protocol / Server Push)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: event.data.text() };
    }
  }

  const title = data.title || 'E-Izin Santri';
  const tag = data.tag || data.data?.tag || undefined;
  const options = {
    body: data.body || 'Ada pembaruan status izin santri.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon-32.png',
    tag,
    renotify: Boolean(tag),
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      tag,
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Siarkan pesan ke tab/aplikasi yang sedang aktif agar data langsung auto-refresh seketika
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          client.postMessage({
            type: 'REALTIME_DATA_UPDATE',
            payload: data,
          });
        }
      }),
    ])
  );
});
