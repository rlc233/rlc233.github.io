// Service worker: solo recibe y muestra los avisos push.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  console.log('[sw] push recibido:', event.data ? event.data.text() : '(sin datos)');
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(d.title || 'Nueva selección', {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      tag: 'rlc233-' + Date.now(),   // cada aviso es independiente
      renotify: true,
      requireInteraction: true,      // se queda en pantalla hasta que lo cierres
      data: { url: d.url || './' },
    }).then(
      () => console.log('[sw] notificación mostrada'),
      (e) => console.error('[sw] error al mostrar la notificación:', e)
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});