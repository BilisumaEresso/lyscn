import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

/**
 * Singleton Socket.io connection for the dashboard (staff).
 *
 * The token is read once at module load. If the page is refreshed after login
 * the token will be current. The socket is NOT auto-connected on import —
 * call socket.connect() when a component first mounts.
 *
 * The server uses the token to auto-join this socket to the correct restaurant
 * room (restaurant:<restaurantId>) — no client-side join event needed for staff.
 */
const SOCKET_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, ''); // strip trailing /api

function createSocket() {
  const { accessToken } = useAuthStore.getState();

  const s = io(SOCKET_URL, {
    autoConnect:      false,  // explicit connect() so components control lifecycle
    reconnection:     true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
    auth: accessToken ? { token: accessToken } : {},
  });

  return s;
}

const socket = createSocket();

// Keep socket credentials in sync whenever token refreshes
useAuthStore.subscribe((state) => {
  if (state.accessToken) {
    socket.auth = { token: state.accessToken };
  }
});

// Update auth payload on reconnection attempts
socket.io.on('reconnect_attempt', () => {
  const currentToken = useAuthStore.getState().accessToken;
  socket.auth = currentToken ? { token: currentToken } : {};
});

// Real-time account revocation (e.g. owner/manager removed this staff member)
socket.on('auth:revoked', (data) => {
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
});

// Dev-only connection state logging
if (import.meta.env.DEV) {
  socket.on('connect',         () => console.log('[socket:dashboard] connected', socket.id));
  socket.on('disconnect',      (r) => console.log('[socket:dashboard] disconnected', r));
  socket.on('connect_error',   (e) => console.log('[socket:dashboard] connect_error', e.message));
  socket.on('reconnect',       (n) => console.log('[socket:dashboard] reconnected after', n, 'attempts'));
}

export default socket;
