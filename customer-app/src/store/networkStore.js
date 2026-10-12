import { create } from 'zustand';

/**
 * Online / Offline Store with Heartbeat Verification.
 *
 * NOTE: Relying on `navigator.onLine` alone is insufficient because it only
 * reports local network link status (e.g. connected to a Wi-Fi router without
 * actual WAN/internet uplink, captive portals, or server downtime).
 *
 * This store combines `navigator.onLine` with active heartbeat checks to /api/health
 * to ensure true end-to-end server connectivity during network outages.
 */

const reconnectListeners = new Set();

export const subscribeToReconnect = (callback) => {
  reconnectListeners.add(callback);
  return () => reconnectListeners.delete(callback);
};

const notifyReconnectListeners = () => {
  reconnectListeners.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.error('[NetworkStore] Error in reconnect listener:', err);
    }
  });
};

export const useNetworkStore = create((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isServerReachable: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isChecking: false,
  lastCheckedAt: null,
  consecutiveFailures: 0,

  /**
   * Performs an explicit heartbeat check to /api/health with a short timeout.
   */
  checkConnection: async () => {
    // 1. Hardware/OS level offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({
        isOnline: false,
        isServerReachable: false,
        isChecking: false,
        lastCheckedAt: Date.now(),
      });
      return false;
    }

    set({ isChecking: true });

    const apiUrl = import.meta.env.VITE_API_URL || '';
    const healthUrl = `${apiUrl.replace(/\/$/, '')}/health?_t=${Date.now()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Server is healthy and DB is connected (200 OK)
      const healthy = response.ok;
      const wasOffline = !get().isOnline;

      if (healthy) {
        set({
          isOnline: true,
          isServerReachable: true,
          isChecking: false,
          lastCheckedAt: Date.now(),
          consecutiveFailures: 0,
        });

        if (wasOffline) {
          notifyReconnectListeners();
        }
        return true;
      } else {
        set((s) => ({
          isOnline: false,
          isServerReachable: false,
          isChecking: false,
          lastCheckedAt: Date.now(),
          consecutiveFailures: s.consecutiveFailures + 1,
        }));
        return false;
      }
    } catch {
      clearTimeout(timeoutId);
      set((s) => ({
        isOnline: false,
        isServerReachable: false,
        isChecking: false,
        lastCheckedAt: Date.now(),
        consecutiveFailures: s.consecutiveFailures + 1,
      }));
      return false;
    }
  },

  /** Immediately mark offline when a network request fails hard */
  reportNetworkFailure: () => {
    const wasOnline = get().isOnline;
    if (wasOnline) {
      set({ isOnline: false, isServerReachable: false, lastCheckedAt: Date.now() });
    }
  },

  /** Immediately mark online when a live request succeeds */
  reportNetworkSuccess: () => {
    const wasOffline = !get().isOnline;
    set({
      isOnline: true,
      isServerReachable: true,
      consecutiveFailures: 0,
      lastCheckedAt: Date.now(),
    });
    if (wasOffline) {
      notifyReconnectListeners();
    }
  },
}));

/**
 * Initializes global event listeners and interval-based heartbeat checks.
 * Call once on app startup.
 */
let isMonitorInitialized = false;

export const initNetworkMonitor = () => {
  if (typeof window === 'undefined' || isMonitorInitialized) return () => {};
  isMonitorInitialized = true;

  const store = useNetworkStore.getState();

  const handleOnline = () => {
    // navigator says online; verify with active heartbeat
    store.checkConnection();
  };

  const handleOffline = () => {
    // navigator says offline; definitely offline
    store.reportNetworkFailure();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      store.checkConnection();
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Initial verification on boot
  store.checkConnection();

  // Dynamic interval poller:
  // Ping more frequently when offline (every 5s) to detect recovery quickly,
  // and every 25s when healthy.
  let intervalId = null;

  const scheduleNextCheck = () => {
    if (intervalId) clearTimeout(intervalId);
    const delay = useNetworkStore.getState().isOnline ? 25000 : 5000;
    intervalId = setTimeout(async () => {
      await useNetworkStore.getState().checkConnection();
      scheduleNextCheck();
    }, delay);
  };

  scheduleNextCheck();

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (intervalId) clearTimeout(intervalId);
    isMonitorInitialized = false;
  };
};
