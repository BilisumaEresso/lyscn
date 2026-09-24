import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Star,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Plus,
  Utensils,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../lib/api';
import socket from '../lib/socket';
import { applyBrandColor } from '../lib/theme';
import { useSessionStore } from '../store/sessionStore';
import AssistanceButton from '../components/AssistanceButton';
import Currency, { formatBirr } from '../components/Currency';
import PoweredBy from '../components/PoweredBy';
import { getRestaurantLogo } from '../lib/branding';
import toast from 'react-hot-toast';

const STEPS = [
  { key: 'placed',    label: 'Order placed',    desc: 'We received your order' },
  { key: 'accepted',  label: 'Accepted',         desc: 'Kitchen confirmed your order' },
  { key: 'preparing', label: 'Preparing',         desc: 'Your food is being prepared' },
  { key: 'ready',     label: 'Ready',             desc: 'Your order is ready' },
  { key: 'served',    label: 'Served',            desc: 'Enjoy your meal!' },
];

const STATUS_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));

function StatusStep({ step, currentIndex, stepIndex, isServedRound }) {
  const isDone = isServedRound ? true : stepIndex < currentIndex;
  const isCurrent = isServedRound ? false : stepIndex === currentIndex;

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500"
          style={
            isDone
              ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)' }
              : isCurrent
              ? {
                  background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                  border: '2px solid var(--color-primary)',
                }
              : {}
          }
        >
          {isDone ? (
            <CheckCircle2 size={16} style={{ color: 'var(--color-on-primary)' }} />
          ) : isCurrent ? (
            <Clock size={15} style={{ color: 'var(--color-primary)' }} />
          ) : (
            <Circle size={15} className="text-ink/25" strokeWidth={1.5} />
          )}
        </div>
        {stepIndex < STEPS.length - 1 && (
          <div
            className="w-0.5 flex-1 min-h-[22px] mt-1 transition-colors duration-500"
            style={{
              background: isDone
                ? 'var(--color-primary)'
                : 'rgba(18,26,44,0.10)',
            }}
          />
        )}
      </div>
      <div className="pb-4 pt-1">
        <p
          className="font-display font-semibold text-sm leading-tight transition-colors duration-300"
          style={isCurrent || isDone ? { color: 'var(--color-primary)' } : {}}
        >
          <span className={clsx(!isCurrent && (isDone ? 'text-ink font-semibold' : 'text-ink/35'))}>
            {step.label}
          </span>
        </p>
        <p
          className={clsx(
            'text-xs mt-0.5',
            isCurrent ? 'text-ink-muted' : isDone ? 'text-ink/60' : 'text-ink/20'
          )}
        >
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
  const joinedRooms = useRef(new Set());
  const session     = useSessionStore();

  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [slideDirection, setSlideDirection] = useState('none'); // 'left' | 'right' | 'none'
  const [logoImgError, setLogoImgError] = useState(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => { setLogoImgError(false); }, [session.restaurant?.logoUrl]);

  // Re-apply brand color on refresh
  useEffect(() => {
    if (session.restaurant?.brandColor) applyBrandColor(session.restaurant.brandColor);
  }, [session.restaurant?.brandColor]);

  // Dynamic title
  useEffect(() => {
    document.title = session.restaurant?.name
      ? `${session.restaurant.name} · Orders`
      : 'LayoScan';
    return () => { document.title = 'LayoScan'; };
  }, [session.restaurant?.name]);

  // ── Fetch multi-round table orders ──────────────────────────────────────────
  const { data: tableData, isLoading } = useQuery({
    queryKey: ['table-orders', session.sessionToken, session.sessionId],
    queryFn: () =>
      api.get('/orders/public/table/orders', {
        params: {
          sessionToken: session.sessionToken,
          sessionId: session.sessionId,
          orderIds: session.orderHistory?.join(','),
        },
      }).then((r) => r.data),
    refetchInterval: 5_000,
    retry: 2,
    enabled: !!session.sessionToken,
  });

  const rounds = tableData?.rounds ?? [];
  const summary = tableData?.summary ?? {};

  // Preserve user-selected round or initialize safely
  useEffect(() => {
    if (!rounds || rounds.length === 0) return;

    setSelectedRoundId((prev) => {
      // If user has already selected a valid round present in current rounds, keep it!
      if (prev && rounds.some((r) => r.id === prev)) {
        return prev;
      }
      // If URL has an orderId that exists, select it on first load
      if (orderId && rounds.some((r) => r.id === orderId)) {
        return orderId;
      }
      // Default to latest round
      return rounds[rounds.length - 1].id;
    });
  }, [rounds, orderId]);

  // Active round object
  const currentRound = useMemo(() => {
    if (rounds.length === 0) return null;
    return rounds.find((r) => r.id === selectedRoundId) || rounds[rounds.length - 1];
  }, [rounds, selectedRoundId]);

  const activeStatus = currentRound?.status ?? 'placed';
  const paymentStatus = currentRound?.paymentStatus || (summary.allPaid ? 'paid' : 'unpaid');
  const currentIndex = STATUS_INDEX[activeStatus] ?? 0;
  const isCancelled = activeStatus === 'cancelled';
  const isServedRound = activeStatus === 'served';
  const feedbackSubmitted = Number(currentRound?.rating) > 0;

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: () =>
      api.patch(`/orders/public/${currentRound?.id}/feedback`, {
        rating: feedbackRating,
        feedback: feedbackText.trim() || null,
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['table-orders', session.sessionToken, session.sessionId] });
      toast.success('Thanks for your feedback!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not save feedback.'),
  });

  // ── Switch round handler with smooth auto-scroll ─────────────────────────────
  const handleSelectRound = (roundId, dir = 'none') => {
    setSlideDirection(dir);
    setSelectedRoundId(roundId);
    const el = document.getElementById(`round-tab-${roundId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  // ── Touch swiping between rounds ───────────────────────────────────────────
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (!rounds || rounds.length <= 1) return;

    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Minimum horizontal swipe distance of 45px, horizontal dominating vertical scroll
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      const currentIdx = rounds.findIndex((r) => r.id === currentRound?.id);
      if (currentIdx === -1) return;

      if (diffX < 0 && currentIdx < rounds.length - 1) {
        // Swiped left -> Next round
        handleSelectRound(rounds[currentIdx + 1].id, 'left');
      } else if (diffX > 0 && currentIdx > 0) {
        // Swiped right -> Previous round
        handleSelectRound(rounds[currentIdx - 1].id, 'right');
      }
    }
  };

  // ── Socket synchronization for all table rounds ─────────────────────────────
  useEffect(() => {
    if (!session.sessionToken) return;

    socket.connect();

    const joinAllRounds = () => {
      rounds.forEach((r) => {
        if (!joinedRooms.current.has(r.id)) {
          socket.emit('join:order', { orderId: r.id, sessionToken: session.sessionToken });
          joinedRooms.current.add(r.id);
        }
      });
    };

    joinAllRounds();

    const onOrderUpdated = () => {
      qc.invalidateQueries({ queryKey: ['table-orders', session.sessionToken, session.sessionId] });
    };

    socket.on('connect', joinAllRounds);
    socket.on('reconnect', joinAllRounds);
    socket.on('order:updated', onOrderUpdated);

    return () => {
      socket.off('connect', joinAllRounds);
      socket.off('reconnect', joinAllRounds);
      socket.off('order:updated', onOrderUpdated);
      socket.disconnect();
      joinedRooms.current.clear();
    };
  }, [rounds, qc, session.sessionToken, session.sessionId]);

  return (
    <div className="min-h-screen bg-paper max-w-[560px] mx-auto flex flex-col">
      {/* ── Top App Bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-ink/6 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/menu')}
            aria-label="Back to menu"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-ink/6 hover:bg-ink/10 text-xs font-semibold text-ink transition-colors focus-visible:outline focus-visible:outline-2 shrink-0"
            style={{ outlineColor: 'var(--color-primary)' }}
          >
            <ChevronLeft size={16} />
            <span>Menu</span>
          </button>
          <img
            src={getRestaurantLogo(session.restaurant, logoImgError)}
            alt={session.restaurant?.name || 'Restaurant'}
            className="w-7 h-7 rounded-lg object-cover border border-ink/10 bg-white shrink-0 shadow-2xs"
            onError={() => setLogoImgError(true)}
          />
          <span className="text-xs font-semibold text-ink truncate max-w-[130px]">
            {session.restaurant?.name}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs px-2.5 py-1 rounded-full bg-ink/6 font-semibold text-ink">
            {tableData?.table?.label ?? session.table?.label ?? 'Table'}
          </span>
          <AssistanceButton />
        </div>
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl text-ink leading-tight">
              {isCancelled
                ? 'Order cancelled'
                : summary.allServed
                ? 'All rounds served! 🎉'
                : 'Table Orders'}
            </h1>
            <p className="text-ink-muted text-xs mt-0.5">
              {isCancelled
                ? 'This round was cancelled. Please ask staff.'
                : 'Track each round placed at your table.'}
            </p>
          </div>

          {!isCancelled && (
            <div
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
              }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-primary)' }} />
              Live
            </div>
          )}
        </div>
      </div>

      {/* ── Multi-Round Selector (When multiple rounds exist) ─────────── */}
      {rounds.length > 0 && (
        <div className="px-4 py-2">
          <div className="text-xs font-semibold text-ink-muted mb-2 px-1 flex items-center justify-between">
            <span className="font-display font-bold text-ink">
              Rounds ({rounds.length})
            </span>
            {rounds.length > 1 && (
              <span className="text-[11px] text-ink-muted flex items-center gap-1">
                <span>👈 Swipe between rounds 👉</span>
              </span>
            )}
          </div>

          <div
            className="flex items-center gap-2.5 overflow-x-auto pb-1.5"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {rounds.map((round) => {
              const isSelected = round.id === currentRound?.id;
              const isServed = round.status === 'served';
              const isPrep = ['accepted', 'preparing', 'ready'].includes(round.status);

              return (
                <button
                  key={round.id}
                  id={`round-tab-${round.id}`}
                  onClick={() => handleSelectRound(round.id)}
                  aria-label={`Select Round ${round.roundNumber}, status: ${round.status}`}
                  className={clsx(
                    'shrink-0 px-4 py-2.5 rounded-2xl border transition-all text-left flex items-center gap-2.5',
                    isSelected
                      ? 'shadow-lg scale-[1.02]'
                      : 'bg-white border-ink/8 hover:border-ink/20 opacity-75'
                  )}
                  style={
                    isSelected
                      ? {
                          background: 'linear-gradient(135deg, #121A2C 0%, #1E293B 100%)',
                          color: '#FFFFFF',
                          borderColor: '#121A2C',
                        }
                      : {}
                  }
                >
                  <div
                    className={clsx(
                      'w-2.5 h-2.5 rounded-full shrink-0',
                      isServed
                        ? 'bg-emerald-400'
                        : isPrep
                        ? 'bg-amber animate-pulse'
                        : 'bg-leaf'
                    )}
                  />
                  <div>
                    <p className="font-display font-bold text-xs leading-none">
                      Round {round.roundNumber}
                    </p>
                    <p
                      className={clsx(
                        'text-[10px] capitalize mt-1 font-medium',
                        isSelected ? 'text-white/80' : 'text-ink-muted'
                      )}
                    >
                      {round.status} · {formatBirr(round.totalAmount)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Round Details (Touch Gesture Swipable) ────────────────────── */}
      <div
        className="flex-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          key={currentRound?.id}
          className={clsx(
            slideDirection === 'left' && 'anim-slide-left',
            slideDirection === 'right' && 'anim-slide-right'
          )}
        >
          {/* ── Status Step Tracker for Selected Round ───────────────────── */}
          {!isCancelled && currentRound && (
            <div className="px-5 py-4 mx-4 my-2 rounded-3xl bg-white border border-ink/8 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-ink/6">
                <span className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                  <span>Round #{currentRound.roundNumber} Status</span>
                  {currentRound.guestName && (
                    <span className="text-xs font-normal text-ink-muted">
                      ({currentRound.guestName})
                    </span>
                  )}
                </span>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-bold capitalize border"
                  style={
                    isServedRound
                      ? {
                          background: 'rgba(85,230,165,0.18)',
                          color: '#0F8077',
                          borderColor: 'rgba(85,230,165,0.4)',
                        }
                      : {
                          background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                          color: 'var(--color-primary)',
                          borderColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)',
                        }
                  }
                >
                  {currentRound.status === 'served' ? 'Served ✓' : currentRound.status}
                </span>
              </div>

              <div aria-label="Order status" role="status" aria-live="polite">
                {STEPS.map((step, idx) => (
                  <StatusStep
                    key={step.key}
                    step={step}
                    stepIndex={idx}
                    currentIndex={currentIndex}
                    isServedRound={isServedRound}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Itemized List for Selected Round ─────────────────────────── */}
          {currentRound && currentRound.items?.length > 0 && (
            <div className="mx-4 my-2 rounded-3xl bg-white border border-ink/8 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-ink/2 border-b border-ink/6 flex items-center justify-between">
                <span className="font-display font-semibold text-xs text-ink flex items-center gap-1.5">
                  <Receipt size={14} className="text-ink-muted" />
                  <span>Round #{currentRound.roundNumber} Items</span>
                </span>
                <span className="text-xs text-ink-muted">
                  {currentRound.createdAt
                    ? new Date(currentRound.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>

              <div className="divide-y divide-ink/4 px-4">
                {currentRound.items.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-start justify-between gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink leading-tight">
                        <span className="text-primary font-bold mr-1.5">{item.qty}×</span>
                        {item.name}
                      </p>
                      {item.selectedModifiers?.length > 0 && (
                        <p className="text-xs text-ink-muted mt-0.5">
                          {item.selectedModifiers.map((m) => m.optionName).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="font-display font-bold text-ink shrink-0">
                      <Currency value={item.price * item.qty} />
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2.5 bg-ink/2 border-t border-ink/6 flex items-center justify-between text-xs">
                <span className="font-semibold text-ink-muted">Round Subtotal</span>
                <span className="font-display font-bold text-ink text-sm">
                  <Currency value={currentRound.totalAmount} />
                </span>
              </div>
            </div>
          )}

          {/* ── Feedback for Served Round ─────────────────────────────────── */}
          {activeStatus === 'served' && !feedbackSubmitted && !feedbackDismissed && (
            <div className="mx-4 my-2 rounded-3xl border border-ink/8 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display font-semibold text-sm text-ink">
                  How was Round #{currentRound?.roundNumber}?
                </p>
                <button
                  type="button"
                  onClick={() => setFeedbackDismissed(true)}
                  className="text-xs text-ink-muted hover:text-ink"
                >
                  Skip
                </button>
              </div>
              <div className="flex gap-2 mt-2.5" role="radiogroup" aria-label="Rate this round">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFeedbackRating(value)}
                    aria-label={`${value} stars`}
                    className="p-1 rounded-lg hover:scale-110 transition-transform"
                  >
                    <Star
                      size={26}
                      fill={value <= feedbackRating ? 'var(--color-primary)' : 'transparent'}
                      style={{
                        color: value <= feedbackRating ? 'var(--color-primary)' : 'rgba(18,26,44,0.25)',
                      }}
                    />
                  </button>
                ))}
              </div>
              <textarea
                id="order-feedback-input"
                name="orderFeedback"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Tell us what you loved (optional)"
                className="w-full mt-2.5 px-3 py-2 rounded-xl border border-ink/12 bg-paper text-xs resize-none focus:outline-none"
              />
              <button
                type="button"
                onClick={() => feedbackMutation.mutate()}
                disabled={!feedbackRating || feedbackMutation.isPending}
                className="w-full mt-2.5 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-40"
                style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
              >
                {feedbackMutation.isPending ? 'Sending…' : 'Submit feedback'}
              </button>
            </div>
          )}

          {activeStatus === 'served' && feedbackSubmitted && (
            <div className="mx-4 my-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700 flex items-center gap-2">
              <Sparkles size={15} />
              <span>Thanks for rating Round #{currentRound?.roundNumber} ({currentRound.rating}/5)!</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Table Bill & Payment Summary Card ─────────────────────────── */}
      <div className="mx-4 my-2 rounded-3xl bg-white border border-ink/8 shadow-xs p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-base text-ink">
              Table Total
            </h3>
            <p className="text-xs text-ink-muted">
              {rounds.length} round{rounds.length !== 1 ? 's' : ''} combined
            </p>
          </div>
          <span className="font-display font-bold text-xl text-ink">
            <Currency value={summary.totalAmount || currentRound?.totalAmount || 0} />
          </span>
        </div>

        {/* Payment status badge */}
        <div
          className="p-3 rounded-2xl border flex items-center justify-between text-xs"
          style={{
            backgroundColor:
              paymentStatus === 'paid'
                ? 'rgba(85,230,165,0.08)'
                : 'rgba(245,158,11,0.08)',
            borderColor:
              paymentStatus === 'paid'
                ? 'rgba(85,230,165,0.35)'
                : 'rgba(245,158,11,0.3)',
          }}
        >
          <div className="flex items-center gap-2">
            {paymentStatus === 'paid' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <Clock size={16} className="text-amber shrink-0" />
            )}
            <div>
              <p
                className={clsx(
                  'font-bold',
                  paymentStatus === 'paid'
                    ? 'text-emerald-700'
                    : 'text-amber'
                )}
              >
                {paymentStatus === 'paid'
                  ? 'Paid in full ✓'
                  : 'Unpaid — pay your server'}
              </p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                {paymentStatus === 'paid'
                  ? 'Receipt confirmed by staff'
                  : 'Your server will bring the bill when you are ready.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Buttons: Next Round / Back to Menu ──────────────────── */}
      <div className="px-4 pt-4 pb-2 space-y-2.5">
        <button
          onClick={() => navigate('/menu')}
          className="w-full py-4 rounded-2xl font-display font-bold text-base active:scale-[0.98] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center justify-center gap-2 shadow-lg"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            outlineColor: 'var(--color-primary)',
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>+ Order Next Round / Add Items</span>
        </button>

        <button
          onClick={() => navigate('/menu')}
          className="w-full py-3 rounded-2xl border border-ink/12 font-semibold text-ink-muted text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 hover:bg-ink/3 transition-colors flex items-center justify-center gap-2"
          style={{ outlineColor: 'var(--color-primary)' }}
        >
          <Utensils size={15} />
          <span>Browse full menu</span>
        </button>
      </div>

      {/* ── High-visibility Powered by LayoScan ──────────────────────── */}
      <PoweredBy />
    </div>
  );
}
