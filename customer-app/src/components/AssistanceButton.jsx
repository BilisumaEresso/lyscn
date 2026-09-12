import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, HelpCircle, Phone, Receipt, X } from 'lucide-react';
import api from '../lib/api';
import { useSessionStore } from '../store/sessionStore';

export default function AssistanceButton({ dark = false }) {
  const { restaurant, branch, table } = useSessionStore();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState({});
  const requestMutation = useMutation({
    mutationFn: (type) =>
      api.post('/assistance/public', {
        restaurantId: restaurant?._id,
        branchId: branch?._id,
        tableId: table?._id,
        type,
      }).then((r) => r.data),
    onSuccess: (data, type) => {
      setSent((current) => ({ ...current, [type]: true }));
      toast.success(data.alreadyRequested ? 'Your request is already being handled.' : 'Staff have been notified.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not notify a server.'),
  });

  return (
    <>
      <button
      type="button"
      onClick={() => setOpen(true)}
      disabled={!table?._id}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm border ${
        dark
          ? 'bg-white/20 text-white border-white/20 hover:bg-white/30'
          : 'bg-white text-ink border-ink/10 hover:border-teal hover:text-teal'
      } disabled:opacity-50`}
      aria-label="Ask a server for help"
    >
      <HelpCircle size={13} />
      Need help?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 max-w-[520px] mx-auto rounded-2xl bg-white p-4 shadow-xl border border-ink/10 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-semibold text-sm text-ink">How can we help?</p>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-full text-ink-muted hover:bg-ink/5" aria-label="Close help">
                <X size={16} />
              </button>
            </div>
            {[
              ['call_staff', 'Call staff', 'Staff have been notified', Phone],
              ['request_bill', 'Request bill', 'Bill requested — someone will bring it shortly', Receipt],
            ].map(([type, label, confirmation, Icon]) => (
              <button
                key={type}
                type="button"
                disabled={sent[type] || requestMutation.isPending}
                onClick={() => requestMutation.mutate(type)}
                className="w-full flex items-center gap-3 px-3 py-3 mb-2 last:mb-0 rounded-xl border border-ink/10 text-left disabled:opacity-70"
              >
                <Icon size={18} style={{ color: 'var(--color-primary)' }} />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-ink">{sent[type] ? 'Request sent' : label}</span>
                  {sent[type] && <span className="block text-xs text-ink-muted mt-0.5">{confirmation}</span>}
                </span>
                {sent[type] && <Check size={16} className="text-emerald-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
