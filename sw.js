const CACHE_NAME = 'truself-daily-v3';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './guide.html',
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
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});

// ===================== NOTIFICATIONS =====================
// Track scheduled timers so we can clear and reschedule
let scheduledTimers = [];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDERS') {
    scheduleReminders(event.data.times);
  }
});

function scheduleReminders(times) {
  // Clear any previously scheduled timers
  scheduledTimers.forEach((id) => clearTimeout(id));
  scheduledTimers = [];

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const messages = [
    'Time for your daily check-in!',
    'How are you doing today? Log your progress.',
    'Evening check-in time. How was your day?'
  ];

  times.forEach((time, index) => {
    const scheduled = new Date(`${today}T${time}:00`);
    const delay = scheduled.getTime() - now.getTime();

    if (delay > 0) {
      const timerId = setTimeout(() => {
        self.registration.showNotification('TruSelf Daily', {
          body: messages[index] || messages[0],
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          tag: `reminder-${time}`,
          renotify: true,
          data: { url: './' }
        });
      }, delay);
      scheduledTimers.push(timerId);
    }
  });
}

// Handle notification click: open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow('./index.html');
    })
  );
});
