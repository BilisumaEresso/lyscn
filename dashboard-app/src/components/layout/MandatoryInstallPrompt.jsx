import { useState, useEffect } from 'react';
import { Download, AlertTriangle, X, Smartphone, ShieldCheck, ChevronRight, Bell, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { useNotificationStore } from '../../store/notificationStore';

/**
 * MandatoryInstallPrompt — Persistent, frequent PWA installation prompt & system permission enforcement for staff.
 * App installation and notification permissions are essential for staff to ensure background audio chimes,
 * prevent browser sleep throttling, and avoid missed customer orders.
 */
export default function MandatoryInstallPrompt() {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const [showUnblockGuidance, setShowUnblockGuidance] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'granted'
  );
  const [requestingNotif, setRequestingNotif] = useState(false);

  // Sync notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        useNotificationStore.getState().setDesktopNotificationsEnabled(true);
      }
    }
  }, []);

  // Detect iOS Safari where beforeinstallprompt does not exist
  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  // When snoozed, auto re-prompt after 90 seconds (frequent prompt as requested)
  const handleSnooze = (e) => {
    e.stopPropagation();
    setIsSnoozed(true);
    setTimeout(() => {
      setIsSnoozed(false);
    }, 90_000);
  };

  const handleInstallClick = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (!accepted) {
        // If user cancelled browser dialog, keep prompting
        setIsSnoozed(false);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowIOSModal(true);
    }
  };

  const handleRequestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'denied') {
      setShowUnblockGuidance((prev) => !prev);
      return;
    }

    setRequestingNotif(true);
    try {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
      if (res === 'granted') {
        useNotificationStore.getState().setDesktopNotificationsEnabled(true);
        toast.success('Staff notifications enabled! Order alerts are active.');
        try {
          new Notification('🔔 LayoScan Staff Alerts Active', {
            body: 'You will receive immediate alerts when new orders arrive.',
            icon: '/assets/logo.png',
          });
        } catch (_) {}
      } else if (res === 'denied') {
        setShowUnblockGuidance(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRequestingNotif(false);
    }
  };

  const showInstallBanner = !isInstalled && !isSnoozed;
  const showNotifBanner = notifPermission !== 'granted';

  if (!showInstallBanner && !showNotifBanner) return null;

  return (
    <>
      {/* ── Persistent Sticky Staff Installation Alert Banner ──────────────── */}
      {showInstallBanner && (
        <div
          className="px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs z-50 animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ background: '#121A2C', borderBottom: '2px solid #F59E0B' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245, 158, 11, 0.2)' }}
            >
              <AlertTriangle size={16} style={{ color: '#F59E0B' }} className="animate-pulse" />
            </div>
            <div className="min-w-0 text-left">
              <p className="font-bold leading-tight truncate sm:whitespace-normal" style={{ color: '#FFFFFF' }}>
                ⚠️ STAFF ACTION REQUIRED: Install LayoScan Staff App
              </p>
              <p className="text-[11px] leading-tight hidden sm:block" style={{ color: '#D1D5DB' }}>
                Browser tabs throttle sound alarms when hidden. Install as a standalone app to prevent missed orders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
              style={{ background: '#F59E0B', color: '#121A2C' }}
            >
              <Download size={14} style={{ color: '#121A2C' }} />
              <span style={{ color: '#121A2C', fontWeight: 'bold' }}>Install App Now</span>
            </button>

            <button
              type="button"
              onClick={handleSnooze}
              title="Remind me again in 90 seconds"
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
              style={{ color: '#9CA3AF' }}
              aria-label="Snooze install reminder"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Persistent Staff Notification Permission Banner ─────────────── */}
      {showNotifBanner && (
        <div
          className="px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs z-40 animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ background: '#991B1B', borderBottom: '1px solid rgba(0,0,0,0.2)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Bell size={16} className="animate-bounce" style={{ color: '#FFFFFF' }} />
            </div>
            <div className="min-w-0 text-left">
              <p className="font-bold leading-tight truncate sm:whitespace-normal" style={{ color: '#FFFFFF' }}>
                🔔 STAFF ALERT: System Notifications Are Disabled
              </p>
              <p className="text-[11px] leading-tight hidden sm:block" style={{ color: '#FEE2E2' }}>
                {notifPermission === 'denied'
                  ? 'Notifications are blocked in your browser. Unblock to receive alerts when running in background.'
                  : 'Enable notifications to receive instant audio and tray alerts for new orders & customer calls.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRequestNotification}
              disabled={requestingNotif}
              className="px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
              style={{ background: '#FFFFFF', color: '#991B1B' }}
            >
              {notifPermission === 'denied' ? (
                <>
                  <Lock size={13} style={{ color: '#991B1B' }} />
                  <span style={{ color: '#991B1B', fontWeight: 'bold' }}>How to Unblock 🔒</span>
                </>
              ) : (
                <>
                  <Bell size={13} style={{ color: '#991B1B' }} />
                  <span style={{ color: '#991B1B', fontWeight: 'bold' }}>
                    {requestingNotif ? 'Enabling…' : 'Enable Alerts Now'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Unblock Guidance Dialog ────────────────────────────────────── */}
      {showUnblockGuidance && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 relative text-left">
            <button
              onClick={() => setShowUnblockGuidance(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100"
              style={{ color: '#6B7280' }}
            >
              <X size={18} />
            </button>

            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#DC2626' }}
            >
              <Lock size={26} />
            </div>

            <h3 className="font-display font-bold text-base mb-1" style={{ color: '#121A2C' }}>
              Unblock Notifications
            </h3>
            <p className="text-xs leading-relaxed mb-4" style={{ color: '#4B5563' }}>
              Your browser is currently blocking notifications for LayoScan. Follow these quick steps to receive order alerts:
            </p>

            <div
              className="space-y-3 p-3.5 rounded-2xl text-xs mb-5"
              style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#1F2937' }}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0"
                  style={{ background: '#DC2626', color: '#FFFFFF' }}
                >
                  1
                </span>
                <p style={{ color: '#1F2937' }}>
                  Click the <strong style={{ color: '#111827' }}>lock 🔒</strong> or <strong style={{ color: '#111827' }}>tune / settings</strong> icon in your browser address bar (next to the website URL).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span
                  className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0"
                  style={{ background: '#DC2626', color: '#FFFFFF' }}
                >
                  2
                </span>
                <p style={{ color: '#1F2937' }}>
                  Find <strong style={{ color: '#111827' }}>Notifications</strong> and change it to <strong style={{ color: '#111827' }}>Allow</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span
                  className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0"
                  style={{ background: '#DC2626', color: '#FFFFFF' }}
                >
                  3
                </span>
                <p style={{ color: '#1F2937' }}>
                  Reload this page to apply changes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowUnblockGuidance(false);
                window.location.reload();
              }}
              className="w-full py-3 rounded-xl font-semibold text-xs active:scale-98 transition-all"
              style={{ background: '#121A2C', color: '#FFFFFF' }}
            >
              <span style={{ color: '#FFFFFF', fontWeight: '600' }}>Reload Page</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Guidance Modal for iOS & Desktop Browsers ─────────────────────── */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 relative text-left">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100"
              style={{ color: '#6B7280' }}
            >
              <X size={18} />
            </button>

            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#D97706' }}
            >
              <Smartphone size={26} />
            </div>

            <h3 className="font-display font-bold text-base mb-1" style={{ color: '#121A2C' }}>
              Install LayoScan Staff App
            </h3>
            <p className="text-xs leading-relaxed mb-4" style={{ color: '#4B5563' }}>
              Installing the app ensures real-time audible chimes and vibration alerts sound even when your screen is locked.
            </p>

            <div
              className="space-y-3 p-3.5 rounded-2xl text-xs mb-5"
              style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#1F2937' }}
            >
              {isIOS ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0"
                      style={{ background: '#121A2C', color: '#FFFFFF' }}
                    >
                      1
                    </span>
                    <p style={{ color: '#1F2937' }}>
                      Tap the <strong style={{ color: '#111827' }}>Share</strong> button <span className="font-mono text-sm">⎋</span> at the bottom of Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0"
                      style={{ background: '#121A2C', color: '#FFFFFF' }}
                    >
                      2
                    </span>
                    <p style={{ color: '#1F2937' }}>
                      Scroll down and tap <strong style={{ color: '#111827' }}>Add to Home Screen</strong> <span className="font-mono text-sm">➕</span>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0"
                      style={{ background: '#121A2C', color: '#FFFFFF' }}
                    >
                      3
                    </span>
                    <p style={{ color: '#1F2937' }}>
                      Tap <strong style={{ color: '#111827' }}>Add</strong> in the top-right corner to finish.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0"
                      style={{ background: '#121A2C', color: '#FFFFFF' }}
                    >
                      1
                    </span>
                    <p style={{ color: '#1F2937' }}>
                      Tap your browser's menu (<strong style={{ color: '#111827' }}>three dots ⋮</strong> or address bar install icon).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0"
                      style={{ background: '#121A2C', color: '#FFFFFF' }}
                    >
                      2
                    </span>
                    <p style={{ color: '#1F2937' }}>
                      Select <strong style={{ color: '#111827' }}>Install app</strong> or <strong style={{ color: '#111827' }}>Add to Home Screen</strong>.
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 rounded-xl font-semibold text-xs active:scale-98 transition-all"
              style={{ background: '#121A2C', color: '#FFFFFF' }}
            >
              <span style={{ color: '#FFFFFF', fontWeight: '600' }}>Got it, I will install now</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
