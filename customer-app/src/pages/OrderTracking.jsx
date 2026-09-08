import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import clsx from 'clsx';
import api from '../lib/api';
import socket from '../lib/socket';
import { applyBrandColor } from '../lib/theme';
import { useSessionStore } from '../store/sessionStore';
import logo from '../assets/logo.png';

const STEPS = [
  { key: 'placed',    label: 'Order placed',    desc: 'We received your order' },
  { key: 'accepted',  label: 'Accepted',         desc: 'Kitchen confirmed your order' },
  { key: 'preparing', label: 'Preparing',         desc: 'Your food is being prepared' },
  { key: 'ready',     label: 'Ready',             desc: 'Your order is ready' },
  { key: 'served',    label: 'Served',            desc: 'Enjoy your meal!' },
];

const STATUS_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));

function PoweredBy() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-4 opacity-25">
      <img src={logo} alt="" aria-hidden="true" className="w-4 h-4 rounded object-cover" loading="lazy" />
      <span className="text-[10px] text-ink-muted font-medium tracking-wide">Powered by LayoScan</span>
    </div>
  );
}

function StatusStep({ step, currentIndex, stepIndex }) {
  const isDone    = stepIndex < currentIndex;
  const isCurrent = stepIndex === currentIndex;

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500"
          style={
            isDone    ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)' } :
            isCurrent ? { background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', border: '2px solid var(--color-primary)' } :
                        {}
          }
        >
          {isDone ? (
            <CheckCircle2 size={18} style={{ color: 'var(--color-on-primary)' }} />
          ) : isCurrent ? (
            <Clock size={16} style={{ color: 'var(--color-primary)' }} />
          ) : (
            <Circle size={16} className="text-ink/25" strokeWidth={1.5} />
          )}
        </div>
        {stepIndex < STEPS.length - 1 && (
          <div
            className="w-0.5 flex-1 min-h-[24px] mt-1 transition-colors duration-500"
            style={{ background: isDone ? 'var(--color-primary)' : 'rgba(18,26,44,0.10)' }}
          />
        )}
      </div>
      <div className="pb-5 pt-1.5">
        <p
          className="font-display font-semibold text-base leading-tight transition-colors duration-300"
          style={isCurrent ? { color: 'var(--color-primary)' } : {}}
        >
          <span className={clsx(!isCurrent && (isDone ? 'text-ink' : 'text-ink/35'))}>
            {step.label}
          </span>
        </p>
        <p className={clsx(
          'text-xs mt-0.5',
          isCurrent ? 'text-ink-muted' : isDone ? 'text-ink/50' : 'text-ink/20'
        )}>
          {step.desc}
        </p>
      </div>
    </div>
  );
}

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate    = useNavigate();
  const qc          = useQueryClient();
  const joined      = useRef(false);
  const session     = useSessionStore();

  // Re-apply brand color on refresh
  useEffect(() => {
    if (session.restaurant?.brandColor) applyBrandColor(session.restaurant.brandColor);
  }, [session.restaurant?.brandColor]);

  // Dynamic title
  useEffect(() => {
    document.title = session.restaurant?.name
      ? `${session.restaurant.name} · Order`
      : 'LayoScan';
    return () => { document.title = 'LayoScan'; };
  }, [session.restaurant?.name]);

  // 5s polling fallback
  const { data, isLoading } = useQuery({
    queryKey: ['order-status', orderId],
    queryFn: () => api.get(`/orders/public/${orderId}/status`).then((r) => r.data),
    refetchInterval: 5_000,
    retry: 2,
  });

  const status        = data?.status        ?? 'placed';
  const paymentStatus = data?.paymentStatus ?? 'unpaid';
  const currentIndex  = STATUS_INDEX[status] ?? 0;
  const isCancelled   = status === 'cancelled';

  // Socket: join order room + listen for instant updates
  useEffect(() => {
    if (!orderId) return;

    socket.connect();

    const onConnect = () => {
      if (!joined.current) {
        socket.emit('join:order', { orderId });
        joined.current = true;
      }
    };

    const onReconnect = () => {
      socket.emit('join:order', { orderId });
      qc.invalidateQueries({ queryKey: ['order-status', orderId] });
    };

    const onOrderUpdated = (updatedOrder) => {
      if (updatedOrder._id !== orderId) return;
      qc.setQueryData(['order-status', orderId], {
        success:       true,
        status:        updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
      });
    };

    if (socket.connected) {
      socket.emit('join:order', { orderId });
      joined.current = true;
    }

    socket.on('connect',       onConnect);
    socket.on('reconnect',     onReconnect);
    socket.on('order:updated', onOrderUpdated);

    return () => {
      socket.off('connect',       onConnect);
      socket.off('reconnect',     onReconnect);
      socket.off('order:updated', onOrderUpdated);
      socket.disconnect();
      joined.current = false;
    };
  }, [orderId, qc]);

  return (
    <div className="min-h-screen bg-paper max-w-[560px] mx-auto flex flex-col">
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">
          Order tracking
        </p>
        <h1 className="font-display font-bold text-2xl text-ink">
          {isCancelled ? 'Order cancelled' : 'Hang tight!'}
        </h1>
        <p className="text-ink-muted text-sm mt-1">
          {isCancelled
            ? 'This order was cancelled. Please ask a staff member.'
            : "We'll update this as your order progresses."}
        </p>

        {!isCancelled && (
          <div
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-primary)' }} />
            Live updates enabled
          </div>
        )}
      </div>

      {/* Step tracker */}
      {!isCancelled && (
        <div className="px-6 flex-1" aria-label="Order status" role="status" aria-live="polite">
          {isLoading ? (
            <div className="space-y-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-ink/8 shrink-0" />
                  <div className="flex-1 pt-1 space-y-1.5">
                    <div className="h-4 bg-ink/8 rounded w-2/5" />
                    <div className="h-3 bg-ink/5 rounded w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            STEPS.map((step, idx) => (
              <StatusStep key={step.key} step={step} stepIndex={idx} currentIndex={currentIndex} />
            ))
          )}
        </div>
      )}

      {/* Payment status */}
      <div
        className="px-5 py-4 mx-4 mb-4 rounded-2xl border transition-colors duration-500"
        style={{
          backgroundColor: paymentStatus === 'paid' ? 'rgba(85,230,165,0.08)' : 'rgba(245,158,11,0.06)',
          borderColor:     paymentStatus === 'paid' ? 'rgba(85,230,165,0.3)'  : 'rgba(245,158,11,0.25)',
        }}
      >
        {paymentStatus === 'paid' ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-700">Paid ✓</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-amber">Unpaid — pay your server</p>
            <p className="text-xs text-amber/70 mt-0.5">
              Your server will bring your bill when you're ready.
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 space-y-3">
        <button
          onClick={() => navigate('/menu')}
          className="w-full py-4 rounded-2xl font-display font-bold text-base active:scale-[0.98] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            background:   'var(--color-primary)',
            color:        'var(--color-on-primary)',
            outlineColor: 'var(--color-primary)',
          }}
        >
          Order again
        </button>
        <button
          onClick={() => navigate('/menu')}
          className="w-full py-3 rounded-2xl border border-ink/15 font-semibold text-ink-muted text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: 'var(--color-primary)' }}
        >
          Back to menu
        </button>
      </div>

      {/* Powered by LayoScan */}
      <PoweredBy />
    </div>
  );
}
