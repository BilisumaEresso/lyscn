import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Clock, Star } from 'lucide-react';
import clsx from 'clsx';
import api from '../lib/api';
import socket from '../lib/socket';
import { applyBrandColor } from '../lib/theme';
import { useSessionStore } from '../store/sessionStore';
import logo from '../assets/logo.png';
import AssistanceButton from '../components/AssistanceButton';
import toast from 'react-hot-toast';

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
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);

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
    queryFn: () => api.get(`/orders/public/${orderId}/status`, {
      params: { sessionToken: session.sessionToken },
    }).then((r) => r.data),
    refetchInterval: 5_000,
    retry: 2,
    enabled: !!session.sessionToken,
  });

  const status        = data?.status        ?? 'placed';
  const paymentStatus = data?.paymentStatus ?? 'unpaid';
  const currentIndex  = STATUS_INDEX[status] ?? 0;
  const isCancelled   = status === 'cancelled';
  const feedbackSubmitted = Number(data?.rating) > 0;

  const feedbackMutation = useMutation({
    mutationFn: () => api.patch(`/orders/public/${orderId}/feedback`, {
      rating: feedbackRating,
      feedback: feedbackText.trim() || null,
    }).then((r) => r.data),
    onSuccess: (result) => {
      qc.setQueryData(['order-status', orderId], (old) => ({
        ...old,
        rating: result.rating,
        feedback: result.feedback,
      }));
      toast.success('Thanks for your feedback!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not save feedback.'),
  });

  // Socket: join order room + listen for instant updates
  useEffect(() => {
    if (!orderId) return;

    socket.connect();

    const onConnect = () => {
      if (!joined.current) {
        socket.emit('join:order', { orderId, sessionToken: session.sessionToken });
        joined.current = true;
      }
    };

    const onReconnect = () => {
      socket.emit('join:order', { orderId, sessionToken: session.sessionToken });
      qc.invalidateQueries({ queryKey: ['order-status', orderId] });
    };

    const onOrderUpdated = (updatedOrder) => {
      if (updatedOrder._id !== orderId) return;
      qc.setQueryData(['order-status', orderId], {
        success:       true,
        status:        updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        rating:        updatedOrder.rating,
        feedback:      updatedOrder.feedback,
      });
    };

    if (socket.connected) {
      socket.emit('join:order', { orderId, sessionToken: session.sessionToken });
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
  }, [orderId, qc, session.sessionToken]);

  return (
    <div className="min-h-screen bg-paper max-w-[560px] mx-auto flex flex-col">
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-ink/6 font-semibold text-ink">
            {session.table?.label ?? 'Table'}
          </span>
          {(data?.guestName || session.guestName) && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
              }}
            >
              Guest: {data?.guestName || session.guestName}
            </span>
          )}
        </div>
        <h1 className="font-display font-bold text-2xl text-ink">
          {isCancelled ? 'Order cancelled' : 'Hang tight!'}
        </h1>
        <p className="text-ink-muted text-sm mt-1">
          {isCancelled
            ? 'This order was cancelled. Please ask a staff member.'
            : "We'll update this as your order progresses."}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <AssistanceButton />
          {status === 'served' && <span className="text-xs text-ink-muted">How was your visit?</span>}
        </div>

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

      {/* Feedback prompt */}
      {status === 'served' && !feedbackSubmitted && !feedbackDismissed && (
        <div className="mx-4 mb-4 rounded-2xl border border-ink/8 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display font-semibold text-base text-ink">How was your order?</p>
            <button
              type="button"
              onClick={() => setFeedbackDismissed(true)}
              className="text-xs text-ink-muted hover:text-ink"
            >
              No thanks
            </button>
          </div>
          <div className="flex gap-1.5 mt-3" role="radiogroup" aria-label={`Order rating${feedbackRating ? `, ${feedbackRating} of 5 selected` : ''}`}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFeedbackRating(value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    setFeedbackRating(Math.min(5, value + 1));
                  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    setFeedbackRating(Math.max(1, value - 1));
                  } else if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault();
                    setFeedbackRating(value);
                  }
                }}
                aria-label={`${value} star${value !== 1 ? 's' : ''}`}
                aria-checked={feedbackRating === value}
                role="radio"
                className="min-h-11 min-w-11 p-2 rounded-lg"
              >
                <Star
                  size={26}
                  fill={value <= feedbackRating ? 'var(--color-primary)' : 'transparent'}
                  style={{ color: value <= feedbackRating ? 'var(--color-primary)' : 'rgba(18,26,44,0.25)' }}
                />
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Tell us more (optional)"
            className="w-full mt-3 px-3 py-2.5 rounded-xl border border-ink/12 bg-paper text-sm resize-none focus:outline-none"
          />
          <button
            type="button"
            onClick={() => feedbackMutation.mutate()}
            disabled={!feedbackRating || feedbackMutation.isPending}
            className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {feedbackMutation.isPending ? 'Sending…' : 'Send feedback'}
          </button>
        </div>
      )}
      {status === 'served' && feedbackSubmitted && (
        <div className="mx-4 mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          Thanks for rating your order {data.rating}/5!
        </div>
      )}

      <div className="px-4 pb-4 space-y-3">
        <button
          onClick={() => navigate('/menu')}
          className="w-full py-4 rounded-2xl font-display font-bold text-base active:scale-[0.98] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center justify-center gap-2"
          style={{
            background:   'var(--color-primary)',
            color:        'var(--color-on-primary)',
            outlineColor: 'var(--color-primary)',
          }}
        >
          <span>+ Order more items / Next round</span>
        </button>
        <button
          onClick={() => navigate('/menu')}
          className="w-full py-3 rounded-2xl border border-ink/15 font-semibold text-ink-muted text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 hover:bg-ink/3 transition-colors"
          style={{ outlineColor: 'var(--color-primary)' }}
        >
          Browse full menu
        </button>
      </div>

      {/* Powered by LayoScan */}
      <PoweredBy />
    </div>
  );
}
