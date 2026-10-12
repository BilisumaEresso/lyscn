import { create } from 'zustand';

/**
 * Online / Offline Store with Heartbeat Verification for Dashboard.
 * Combines navigator.onLine with /api/health checks.
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
      console.error('[Dashboard NetworkStore] Error in reconnect listener:', err);
    }
  });
};

export const useNetworkStore = create((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isServerReachable: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isChecking: false,
  lastCheckedAt: null,
  consecutiveFailures: 0,

  checkConnection: async () => {
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

  reportNetworkFailure: () => {
    const wasOnline = get().isOnline;
    if (wasOnline) {
      set({ isOnline: false, isServerReachable: false, lastCheckedAt: Date.now() });
    }
  },

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

let isMonitorInitialized = false;

export const initNetworkMonitor = () => {
  if (typeof window === 'undefined' || isMonitorInitialized) return () => {};
  isMonitorInitialized = true;

  const store = useNetworkStore.getState();

  const handleOnline = () => store.checkConnection();
  const handleOffline = () => store.reportNetworkFailure();
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      store.checkConnection();
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  store.checkConnection();

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
