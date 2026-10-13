import { useState, useEffect, useCallback } from 'react';

// Module-level singleton state so the beforeinstallprompt event is NEVER lost
// even if components mount after the event fired.
let globalDeferredPrompt = null;
const promptListeners = new Set();

function emitChange() {
  promptListeners.forEach((fn) => {
    try {
      fn();
    } catch (_) {}
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    emitChange();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    emitChange();
  });
}

function checkIsStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * Reusable hook to manage custom PWA install prompt UX.
 *
 * - Listens for `beforeinstallprompt`, captures and suppresses the default banner globally.
 * - Detects standalone display mode (already installed).
 * - Exposes `canInstall`, `isInstalled`, and `promptInstall()`.
 */
export function useInstallPrompt() {
  const [hasPrompt, setHasPrompt] = useState(() => globalDeferredPrompt !== null);
  const [isInstalled, setIsInstalled] = useState(checkIsStandalone);

  useEffect(() => {
    const handleUpdate = () => {
      setHasPrompt(globalDeferredPrompt !== null);
      setIsInstalled(checkIsStandalone());
    };

    promptListeners.add(handleUpdate);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      if (e.matches) {
        setIsInstalled(true);
        globalDeferredPrompt = null;
        emitChange();
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    return () => {
      promptListeners.delete(handleUpdate);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!globalDeferredPrompt) return false;
    try {
      const promptEvent = globalDeferredPrompt;
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        globalDeferredPrompt = null;
        emitChange();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Install prompt error:', err);
      return false;
    }
  }, []);

  const canInstall = !isInstalled && (hasPrompt || globalDeferredPrompt !== null);

  return { canInstall, isInstalled, promptInstall };
}

export default useInstallPrompt;

