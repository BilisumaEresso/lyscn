import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

const DISMISS_KEY = 'layoscan_staff_install_dismissed_until';

/**
 * InstallHeaderButton — Responsive quick-action button in the mobile and desktop headers.
 * Clicking it immediately triggers the browser's native 1-click install prompt.
 */
export function InstallHeaderButton({ isMobile = false }) {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  if (isInstalled) return null;

  const handleClick = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (accepted) {
        toast.success('LayoScan Staff App installed successfully!');
      }
    } else {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {isMobile ? (
        <button
          type="button"
          onClick={handleClick}
          className="p-2 min-h-10 min-w-10 rounded-xl bg-teal/15 text-teal hover:bg-teal/25 border border-teal/25 flex items-center justify-center transition-all active:scale-95 shrink-0"
          title="Install Staff App"
          aria-label="Install Staff App"
        >
          <Download size={17} className="stroke-[2.5]" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                     bg-teal/10 hover:bg-teal text-teal hover:text-ink
                     border border-teal/25 shadow-xs transition-all active:scale-95 shrink-0"
          title="Install LayoScan Staff App on this device"
        >
          <Download size={14} className="stroke-[2.5]" />
          <span>Install App</span>
        </button>
      )}

      {showIOSModal && (
        <InstallGuideModal isIOS={isIOS} onClose={() => setShowIOSModal(false)} />
      )}
    </>
  );
}

/**
 * MandatoryInstallPrompt — Non-blocking, responsive floating card that ensures
 * staff install the app for real-time sound alarms without pushing or distorting the layout.
 */
export default function MandatoryInstallPrompt() {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  useEffect(() => {
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    } catch (_) {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      // Dismiss the floating toast for 24 hours so staff aren't annoyed repeatedly
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    } catch (_) {}
  };

  const handleInstallClick = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (accepted) {
        toast.success('LayoScan Staff App installed!');
      }
    } else {
      setShowIOSModal(true);
    }
  };

  if (isInstalled || isDismissed) {
    return showIOSModal ? (
      <InstallGuideModal isIOS={isIOS} onClose={() => setShowIOSModal(false)} />
    ) : null;
  }

  return (
    <>
      {/* ── Responsive Floating Non-blocking Install Card ──────────────── */}
      <div
        className="fixed z-40 right-3 sm:right-6 bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] lg:bottom-6 max-w-sm w-[calc(100vw-1.5rem)] sm:w-84 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="bg-ink/95 backdrop-blur-md text-white border border-white/10 rounded-2xl p-3 sm:p-3.5 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal/20 text-teal flex items-center justify-center shrink-0 border border-teal/30">
              <Download size={16} className="stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white leading-tight">Install Staff App</p>
              <p className="text-[11px] text-white/60 leading-tight mt-0.5 truncate">
                Direct access & sound alarms
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-teal hover:bg-teal-light text-ink font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss for 24 hours"
              aria-label="Dismiss install card"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {showIOSModal && (
        <InstallGuideModal isIOS={isIOS} onClose={() => setShowIOSModal(false)} />
      )}
    </>
  );
}

function InstallGuideModal({ isIOS, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-gray-200 relative text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-teal/15 text-teal flex items-center justify-center mb-4">
          <Smartphone size={24} className="stroke-[2.2]" />
        </div>

        <h3 className="font-display font-bold text-base text-ink mb-1">
          Install LayoScan Staff App
        </h3>
        <p className="text-xs text-ink-muted leading-relaxed mb-4">
          Install as a standalone app to ensure loud audible chimes and instant access even with locked screens.
        </p>

        <div className="space-y-3 p-3.5 rounded-2xl text-xs mb-5 bg-paper-dark border border-ink/8 text-ink">
          {isIOS ? (
            <>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 bg-ink text-white">
                  1
                </span>
                <p>
                  Tap the <strong>Share</strong> button <span className="font-mono text-sm">⎋</span> at the bottom of Safari.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 bg-ink text-white">
                  2
                </span>
                <p>
                  Scroll down and tap <strong>Add to Home Screen</strong> <span className="font-mono text-sm">➕</span>.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 bg-ink text-white">
                  3
                </span>
                <p>
                  Tap <strong>Add</strong> in the top-right corner to finish.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 bg-ink text-white">
                  1
                </span>
                <p>
                  Tap your browser menu (<strong>three dots ⋮</strong> or address bar install icon).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 bg-ink text-white">
                  2
                </span>
                <p>
                  Select <strong>Install app</strong> or <strong>Add to Home Screen</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl font-bold text-xs bg-ink text-white hover:bg-ink/90 active:scale-98 transition-all"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
