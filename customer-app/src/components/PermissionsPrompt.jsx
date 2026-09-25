import { useState, useEffect } from 'react';
import { Bell, Volume2, VolumeX, ShieldAlert, CheckCircle2, Lock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomerNotificationStore } from '../store/customerNotificationStore';
import { playFoodReady } from '../lib/customerSoundEffects';

/**
 * PermissionsPrompt — Assertive, high-priority permission prompts for:
 * 1. System Notifications (lock screen & notification panel alerts)
 * 2. Sound & Audio Chimes (Web Audio API unlock & verification)
 */
export default function PermissionsPrompt({ variant = 'tracking' }) {
  const {
    pushPermission,
    setPushPermission,
    soundEnabled,
    setSoundEnabled,
    soundVolume,
  } = useCustomerNotificationStore();

  const [currentPermission, setCurrentPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );
  const [requesting, setRequesting] = useState(false);
  const [audioTested, setAudioTested] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setCurrentPermission(Notification.permission);
      setPushPermission(Notification.permission);
    }
  }, [setPushPermission]);

  // Request browser Notification permission
  const handleRequestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('System notifications are not supported on this browser.');
      return;
    }

    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setCurrentPermission(result);
      setPushPermission(result);

      if (result === 'granted') {
        toast.success('System notifications enabled! You will get food alerts on your lock screen.');
        // Test notification
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification('🔔 Notifications Active!', {
              body: 'You will receive instant alerts here when your dishes are ready.',
              icon: '/assets/logo.png',
              badge: '/assets/logo.png',
              tag: 'layoscan-test',
              vibrate: [200, 100, 200],
            });
          }).catch(() => {
            new Notification('🔔 Notifications Active!', {
              body: 'You will receive instant alerts here when your dishes are ready.',
              icon: '/assets/logo.png',
            });
          });
        }
      } else if (result === 'denied') {
        toast.error('Notifications were blocked. Please allow them in your browser settings.');
      }
    } catch (err) {
      toast.error('Could not request notification permission.');
    } finally {
      setRequesting(false);
    }
  };

  const handleTestAudio = () => {
    setSoundEnabled(true);
    playFoodReady(soundVolume);
    setAudioTested(true);
    toast.success('Audible food ready chime verified!');
  };

  const isGranted = currentPermission === 'granted';
  const isDenied = currentPermission === 'denied';

  // If already granted, don't show the big warning (or show a compact active badge)
  if (isGranted) {
    return null;
  }

  return (
    <div className="mx-4 my-2.5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 p-4 shadow-sm text-left animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
          <Bell size={20} className="animate-bounce-subtle" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white">
              Action Required
            </span>
            <span className="text-xs font-bold text-amber-900">Food Ready Alerts</span>
          </div>
          <h3 className="font-display font-bold text-sm text-ink leading-tight">
            Enable Notifications for Live Meal Alerts
          </h3>
          <p className="text-xs text-ink-muted mt-1 leading-relaxed">
            Without notification permission, your device cannot alert you when your food is ready if you lock your screen or switch to another app.
          </p>
        </div>
      </div>

      {isDenied ? (
        /* Guidance when permission was previously blocked */
        <div className="mt-3 p-3 rounded-2xl bg-white border border-amber-300/80 text-xs text-ink space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-800 font-bold">
            <AlertTriangle size={14} className="text-amber-600" />
            <span>Notifications are currently blocked by your browser</span>
          </div>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            1. Tap the <strong>lock 🔒</strong> or <strong>settings</strong> icon in your browser's address bar.
          </p>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            2. Change <strong>Notifications</strong> to <strong>Allow</strong>.
          </p>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            3. Tap the button below to confirm.
          </p>
          <button
            type="button"
            onClick={handleRequestNotifications}
            disabled={requesting}
            className="w-full mt-2 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 size={14} />
            <span>Check Notification Status</span>
          </button>
        </div>
      ) : (
        /* Action buttons to allow notifications */
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleRequestNotifications}
            disabled={requesting}
            className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            style={{ background: 'var(--color-primary, #0D9488)' }}
          >
            <Bell size={15} />
            <span>{requesting ? 'Requesting…' : 'Allow Lock Screen Alerts'}</span>
          </button>

          <button
            type="button"
            onClick={handleTestAudio}
            title="Test audio chime"
            className="py-3 px-3.5 rounded-xl border border-ink/10 bg-white hover:bg-ink/5 text-ink font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Volume2 size={15} className="text-teal" />
            <span>{audioTested ? 'Chime Active ✓' : 'Test Sound'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
