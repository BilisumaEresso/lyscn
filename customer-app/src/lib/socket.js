import { io } from 'socket.io-client';

/**
 * Singleton Socket.io connection for the customer app.
 * No auth token — customers connect anonymously.
 *
 * autoConnect: false — the OrderTracking page connects on mount
 * and disconnects on unmount.
 */
const SOCKET_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

const socket = io(SOCKET_URL, {
  autoConnect:       false,
  reconnection:      true,
  reconnectionDelay: 2000,
  reconnectionAttempts: Infinity,
});

if (import.meta.env.DEV) {
  socket.on('connect',        () => console.log('[socket:customer] connected', socket.id));
  socket.on('disconnect',     (r) => console.log('[socket:customer] disconnected', r));
  socket.on('connect_error',  (e) => console.log('[socket:customer] connect_error', e.message));
  socket.on('reconnect',      (n) => console.log('[socket:customer] reconnected after', n, 'attempts'));
}

export default socket;
