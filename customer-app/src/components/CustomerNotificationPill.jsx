import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Utensils,
  ChefHat,
  Flame,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Bell,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import clsx from 'clsx';
import { useCustomerNotificationStore } from '../store/customerNotificationStore';

const ICONS = {
  chef: ChefHat,
  flame: Flame,
  utensils: Utensils,
  check: CheckCircle2,
  alert: AlertCircle,
  receipt: Receipt,
  bell: Bell,
};

export default function CustomerNotificationPill() {
  const navigate = useNavigate();
  const { activeAlert, dismissAlert, soundEnabled, setSoundEnabled } = useCustomerNotificationStore();

  useEffect(() => {
    if (!activeAlert) return;

    // Auto-dismiss after 6.5 seconds
    const timer = setTimeout(() => {
      dismissAlert(activeAlert.id);
    }, 6500);

    return () => clearTimeout(timer);
  }, [activeAlert, dismissAlert]);

  if (!activeAlert) return null;

  const IconComponent = ICONS[activeAlert.icon] || Bell;

  const handleClick = () => {
    if (activeAlert.orderId) {
      navigate(`/order/${activeAlert.orderId}`);
    } else {
      navigate('/orders');
    }
    dismissAlert(activeAlert.id);
  };

  return (
    <div
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
      role="alert"
      aria-live="polite"
    >
      <div
        onClick={handleClick}
        className="cursor-pointer bg-ink/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-white/20 flex items-start gap-3 active:scale-[0.99] transition-transform group"
        style={{
          boxShadow: '0 12px 32px -4px rgba(18,26,44,0.35)',
        }}
      >
        {/* Animated Icon Avatar */}
        <div
          className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
            activeAlert.type === 'food_ready'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              : activeAlert.type === 'order_preparing'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
              : activeAlert.type === 'waiter_coming'
              ? 'bg-teal text-white shadow-lg shadow-teal/30'
              : 'bg-white/15 text-white'
          )}
        >
          <IconComponent size={20} className={activeAlert.type === 'food_ready' ? 'animate-bounce' : ''} />
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 pr-1">
          {/* SMS Notification Header */}
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-teal mb-0.5">
            <span>💬 LAYOSCAN ALERTS</span>
            <span className="text-white/40">·</span>
            <span className="text-white/60">NOW</span>
          </div>

          <div className="flex items-center gap-1.5 mb-0.5">
            {activeAlert.roundNumber && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-white/20 text-white shrink-0">
                Round {activeAlert.roundNumber}
              </span>
            )}
            <h4 className="font-display font-bold text-sm text-white truncate leading-tight">
              {activeAlert.title}
            </h4>
          </div>
          <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
            {activeAlert.message}
          </p>
          <span className="inline-block text-[11px] font-semibold text-teal hover:underline mt-1">
            Tap to view order status →
          </span>
        </div>

        {/* Action Buttons: Mute quick-toggle & Close */}
        <div className="flex flex-col items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => dismissAlert(activeAlert.id)}
            aria-label="Dismiss alert"
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            title={soundEnabled ? 'Sound is ON' : 'Sound is MUTED'}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} className="text-rose-400" />}
          </button>
        </div>
      </div>
    </div>
  );
}
