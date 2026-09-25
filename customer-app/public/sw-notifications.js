// LayoScan Service Worker: Background Notification & Click Handler
// Handles background panel (tray) notifications like SMS alerts and navigates user on tap.

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If an open client matches or is already on the site, focus and navigate it
        for (const client of windowClients) {
          if ('focus' in client) {
            if ('navigate' in client && targetUrl) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // If no app window is currently open, open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
