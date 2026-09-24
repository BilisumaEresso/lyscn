import { useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useCustomerNotificationStore } from '../store/customerNotificationStore';

export default function PushNotificationPrompt() {
  const {
    pushPermission,
    setPushPermission,
    pushPromptDismissed,
    setPushPromptDismissed,
  } = useCustomerNotificationStore();

  const [requesting, setRequesting] = useState(false);

  // Only display if supported, in default state, and user hasn't dismissed it
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;
  if (!isSupported || pushPermission !== 'default' || pushPromptDismissed) {
    return null;
  }

  const handleEnable = async () => {
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPushPermission(result);
      if (result === 'granted') {
        new Notification('🔔 Notifications Enabled!', {
          body: 'You will receive an alert as soon as your food is ready.',
          icon: '/assets/logo.png',
        });
      }
    } catch (err) {
      console.debug('Notification permission error:', err);
    } finally {
      setRequesting(false);
      setPushPromptDismissed(true);
    }
  };

  const handleDismiss = () => {
    setPushPromptDismissed(true);
  };

  return (
    <div className="bg-gradient-to-r from-teal/15 via-teal/10 to-transparent border border-teal/30 rounded-2xl p-3.5 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal text-white flex items-center justify-center shrink-0 shadow-sm">
          <Bell size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-display font-bold text-sm text-ink leading-tight">
            Get an alert when food is ready
          </h4>
          <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
            We'll notify you even if your phone is locked or you're using another app.
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              type="button"
              disabled={requesting}
              onClick={handleEnable}
              className="px-3.5 py-1.5 rounded-xl bg-teal text-white text-xs font-semibold shadow-sm hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
            >
              {requesting ? (
                'Enabling...'
              ) : (
                <>
                  <Check size={14} />
                  Enable Alerts
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification prompt"
          className="text-ink-muted hover:text-ink p-1 rounded-lg"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
