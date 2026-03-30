const CACHE_NAME = 'truself-daily-v1';
const ASSETS = [
  './',
  './index.html',
  './config.json',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg'
];

// Install: cache all app assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET and cross-origin requests (except logo)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful same-origin responses
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});

// Notification scheduling (Phase 2)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDERS') {
    scheduleReminders(event.data.times);
  }
});

function scheduleReminders(times) {
  // Clear any existing scheduled notifications
  // Re-schedule for today's remaining times
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  times.forEach((time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const scheduled = new Date(`${today}T${time}:00`);
    const delay = scheduled.getTime() - now.getTime();

    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification('TruSelf Daily', {
          body: 'Time for your daily check-in! 🌿',
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          tag: `reminder-${time}`,
          renotify: true
        });
      }, delay);
    }
  });
}
