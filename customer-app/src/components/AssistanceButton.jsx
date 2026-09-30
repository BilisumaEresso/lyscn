import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Check,
  HelpCircle,
  Phone,
  Receipt,
  X,
  UserCheck,
  Clock,
  Loader2,
} from 'lucide-react';
import api from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import { useCustomerNotificationStore } from '../store/customerNotificationStore';

export default function AssistanceButton({
  dark = false,
  variant = 'button',
  className = '',
}) {
  const { restaurant, branch, table } = useSessionStore();
  const { assistanceState, setAssistanceState } = useCustomerNotificationStore();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState({});

  const isAcknowledged = assistanceState?.status === 'acknowledged';

  // Prevent background scroll and support ESC key when modal is open
  useEffect(() => {
    if (!open) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const requestMutation = useMutation({
    mutationFn: (type) =>
      api
        .post('/assistance/public', {
          restaurantId: restaurant?._id,
          branchId: branch?._id,
          tableId: table?._id,
          type,
        })
        .then((r) => r.data),
    onSuccess: (data, type) => {
      setSent((current) => ({ ...current, [type]: true }));
      setAssistanceState({
        active: true,
        type,
        status: data.assistance?.status || 'pending',
        timestamp: Date.now(),
      });
      toast.success(
        data.alreadyRequested
          ? 'Your request is already being handled.'
          : 'Staff have been notified.'
      );
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || 'Could not notify a server.'),
  });

  const renderModal = () => {
    if (!open) return null;

    return createPortal(
      <div className="layoscan-assistance-portal">
        {/* Dim Backdrop (z-[80] ensures it dims cart bar & order round FABs cleanly) */}
        <div
          className="fixed inset-0 z-[80] bg-ink/60 backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />

        {/* Modal Dialog Container: centered with generous breathing space */}
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 pointer-events-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistance-modal-title"
        >
          <div
            className="pointer-events-auto w-full max-w-[480px] rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-ink/10 max-h-[calc(100dvh-3rem)] overflow-y-auto flex flex-col transition-all duration-300"
            style={{ animation: 'fade-in 200ms ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor:
                      'var(--color-surface-wash, rgba(20,184,166,0.1))',
                  }}
                >
                  <HelpCircle
                    size={22}
                    style={{ color: 'var(--color-primary, #14B8A6)' }}
                  />
                </div>
                <div>
                  <h2
                    id="assistance-modal-title"
                    className="font-display font-bold text-base text-ink leading-tight"
                  >
                    Need Staff Assistance?
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {table?.label ? `Table ${table.label}` : 'At your table'} ·{' '}
                    {branch?.name ||
                      restaurant?.name ||
                      'Staff notified instantly'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-ink/5 hover:bg-ink/10 flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
                aria-label="Close help modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Acknowledged Banner */}
            {isAcknowledged && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                  <UserCheck size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-emerald-950 text-sm">
                    A waiter is heading over!
                  </p>
                  <p className="text-emerald-700 text-xs mt-0.5">
                    Staff acknowledged your call for{' '}
                    {table?.label ? `Table ${table.label}` : 'your table'}.
                  </p>
                </div>
              </div>
            )}

            {/* Pending Acknowledgment Banner */}
            {!isAcknowledged &&
              (sent['call_staff'] ||
                sent['request_bill'] ||
                assistanceState?.active) && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                  <Clock size={16} className="text-amber-600 shrink-0" />
                  <span className="flex-1">
                    Request sent! Waiting for staff to acknowledge…
                  </span>
                </div>
              )}

            {/* Action Option Buttons */}
            <div className="space-y-3 mb-4">
              {[
                {
                  type: 'call_staff',
                  label: 'Call staff to table',
                  desc: 'Need napkins, water, condiments, or have a question?',
                  confirm:
                    'Staff have been notified and will be right with you',
                  Icon: Phone,
                },
                {
                  type: 'request_bill',
                  label: 'Request bill & payment',
                  desc: 'Ready to pay? A server will bring your check to the table',
                  confirm: 'Bill requested — staff will bring it shortly',
                  Icon: Receipt,
                },
              ].map(({ type, label, desc, confirm, Icon }) => {
                const isTypeAcknowledged =
                  isAcknowledged && assistanceState?.type === type;
                const hasSent =
                  sent[type] ||
                  (assistanceState?.active && assistanceState?.type === type);
                const isPending =
                  requestMutation.isPending &&
                  requestMutation.variables === type;

                return (
                  <button
                    key={type}
                    type="button"
                    disabled={hasSent || requestMutation.isPending || !table?._id}
                    onClick={() => requestMutation.mutate(type)}
                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                      isTypeAcknowledged
                        ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-400/20'
                        : hasSent
                        ? 'bg-ink/5 border-ink/10 opacity-90'
                        : 'bg-white hover:bg-ink/[0.02] border-ink/10 hover:border-teal shadow-xs'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isTypeAcknowledged
                          ? 'bg-emerald-500 text-white'
                          : hasSent
                          ? 'bg-ink/10 text-ink'
                          : ''
                      }`}
                      style={
                        !isTypeAcknowledged && !hasSent
                          ? {
                              backgroundColor:
                                'var(--color-surface-wash, rgba(20,184,166,0.1))',
                              color: 'var(--color-primary, #14B8A6)',
                            }
                          : {}
                      }
                    >
                      {isPending ? (
                        <Loader2 size={18} className="animate-spin text-teal" />
                      ) : (
                        <Icon size={18} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-sm text-ink">
                          {isTypeAcknowledged
                            ? '🏃‍♂️ Staff is on the way!'
                            : hasSent
                            ? 'Request Sent'
                            : label}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5 leading-snug">
                        {isTypeAcknowledged
                          ? 'Staff acknowledged your request'
                          : hasSent
                          ? confirm
                          : desc}
                      </p>
                    </div>
                    {hasSent && (
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isTypeAcknowledged
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        <Check size={14} strokeWidth={2.5} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal footer info */}
            <div className="pt-2.5 border-t border-ink/6 flex items-center justify-between text-[11px] text-ink-muted">
              <span>Alerts servers on their handheld devices</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-semibold text-primary hover:underline px-1 py-0.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Card variant (for footer or in-line trigger)
  if (variant === 'card') {
    return (
      <>
        <div
          className={`p-4 rounded-2xl bg-white border border-ink/8 shadow-xs flex items-center justify-between gap-3 ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor:
                  'var(--color-surface-wash, rgba(20,184,166,0.1))',
              }}
            >
              <HelpCircle
                size={20}
                style={{ color: 'var(--color-primary, #14B8A6)' }}
              />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-sm text-ink truncate">
                {isAcknowledged
                  ? 'Waiter is on the way!'
                  : 'Need help at your table?'}
              </p>
              <p className="text-xs text-ink-muted truncate">
                {isAcknowledged
                  ? 'Staff heading to your table'
                  : 'Call staff or request bill directly'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!table?._id}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all shadow-xs ${
              isAcknowledged
                ? 'bg-emerald-500 text-white animate-pulse'
                : 'bg-ink text-white hover:bg-ink/90 active:scale-95'
            } disabled:opacity-50`}
          >
            {isAcknowledged ? 'Staff Coming' : 'Ask Server'}
          </button>
        </div>
        {renderModal()}
      </>
    );
  }

  // Default button variant
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!table?._id}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm border ${
          isAcknowledged
            ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse'
            : dark
            ? 'bg-white/20 text-white border-white/20 hover:bg-white/30'
            : 'bg-white text-ink border-ink/10 hover:border-teal hover:text-teal'
        } disabled:opacity-50 ${className}`}
        aria-label="Ask a server for help"
      >
        {isAcknowledged ? (
          <>
            <UserCheck size={13} className="text-white" />
            <span>Waiter coming!</span>
          </>
        ) : (
          <>
            <HelpCircle size={13} />
            <span>Need help?</span>
          </>
        )}
      </button>

      {renderModal()}
    </>
  );
}
