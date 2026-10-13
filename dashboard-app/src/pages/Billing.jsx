import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Receipt,
  QrCode,
  Lock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../lib/api';
import Currency, { formatBirr } from '../components/ui/Currency';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

export default function Billing() {
  const qc = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payMethod, setPayMethod] = useState('telebirr');
  const [refNumber, setRefNumber] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // Fetch subscription
  const { data: subData, isLoading: subLoading, refetch: refetchSub } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: () => api.get('/billing/subscription').then((r) => r.data),
    staleTime: 30_000,
  });

  // Fetch invoices
  const { data: invData, isLoading: invLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: () => api.get('/billing/invoices').then((r) => r.data),
    staleTime: 30_000,
  });

  // Payment mutation
  const payMutation = useMutation({
    mutationFn: ({ invoiceId, payload }) =>
      api.post(`/billing/invoices/${invoiceId}/pay`, payload).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message || 'Payment confirmed and subscription activated!');
      setIsPayModalOpen(false);
      setRefNumber('');
      setPayNotes('');
      qc.invalidateQueries({ queryKey: ['billing-subscription'] });
      qc.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to submit payment confirmation.');
    },
  });

  // Plan switch mutation
  const planMutation = useMutation({
    mutationFn: (plan) => api.post('/billing/plan', { plan }).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message || 'Plan updated!');
      qc.invalidateQueries({ queryKey: ['billing-subscription'] });
      qc.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to change plan.');
    },
  });

  // Reminder mutation
  const reminderMutation = useMutation({
    mutationFn: (invoiceId) =>
      api.post('/billing/reminder', { invoiceId, channel: 'whatsapp' }).then((r) => r.data),
    onSuccess: (data) => {
      toast.success('Reminder logged! Opening WhatsApp…');
      if (data.whatsappLink) {
        window.open(data.whatsappLink, '_blank', 'noopener,noreferrer');
      }
      qc.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to dispatch reminder.');
    },
  });

  const handleOpenPay = (inv) => {
    setSelectedInvoice(inv);
    setRefNumber('');
    setPayNotes('');
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = (e) => {
    e.preventDefault();
    if (!refNumber.trim()) {
      toast.error('Please enter your transaction reference number.');
      return;
    }
    payMutation.mutate({
      invoiceId: selectedInvoice._id,
      payload: {
        paymentMethod: payMethod,
        paymentReference: refNumber.trim(),
        paymentNotes: payNotes.trim(),
      },
    });
  };

  if (subLoading || invLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingIndicator />
      </div>
    );
  }

  const sub = subData?.subscription || {};
  const invoices = invData?.invoices || [];
  const daysRemaining = subData?.daysRemaining ?? 0;
  const graceDaysRemaining = subData?.graceDaysRemaining ?? 0;
  const isGrace = subData?.isGracePeriodActive;
  const isReadOnly = subData?.isReadOnly;
  const isTrial = subData?.isTrialActive;
  const usage = subData?.usageMetrics || {};

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Subscription & Billing
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Manage your LayoScan restaurant plan, ETB invoices, and payment confirmations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSub();
              refetchInvoices();
              toast.success('Refreshed billing status');
            }}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Status Banner (Grace Period, Trial, or Read-Only) ──────────────── */}
      {isGrace && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-900 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-950">
                Grace Period Active: {graceDaysRemaining} Days Remaining
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-amber-800">
                Your monthly Pro invoice is pending, but your live restaurant service is{' '}
                <strong>100% operational</strong> mid-shift. Please confirm payment via Telebirr or CBE Birr
                to prevent read-only mode after the grace period ends.
              </p>
            </div>
            {invoices.length > 0 && invoices[0].status !== 'paid' && (
              <Button
                size="sm"
                className="bg-amber-600 text-white hover:bg-amber-700"
                onClick={() => handleOpenPay(invoices[0])}
              >
                Pay Now
              </Button>
            )}
          </div>
        </div>
      )}

      {isReadOnly && (
        <div className="rounded-2xl border-2 border-rose-500 bg-rose-50 p-4 text-rose-900 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="flex-1">
              <h3 className="font-bold text-rose-950">
                Account in Read-Only Mode
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-rose-800">
                Diners can still view and order, but menu edits, staff additions, and data exports are
                paused. Settle your pending ETB invoice to resume instant configuration access.
              </p>
            </div>
            {invoices.length > 0 && invoices[0].status !== 'paid' && (
              <Button
                size="sm"
                className="bg-rose-600 text-white hover:bg-rose-700"
                onClick={() => handleOpenPay(invoices[0])}
              >
                Settle Invoice
              </Button>
            )}
          </div>
        </div>
      )}

      {isTrial && !isGrace && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4 text-teal-900 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-teal-600" />
              <div>
                <p className="text-sm font-bold text-teal-950">
                  Pro Free Trial Active — {daysRemaining} days left
                </p>
                <p className="text-xs text-teal-800">
                  You have full access to analytics, multi-branch, and staff management with zero charge.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white">
              Trialing
            </span>
          </div>
        </div>
      )}

      {/* ── Active Plan Overview Card ─────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-ink/8 bg-white p-6 shadow-xs md:col-span-2">
          <div className="flex items-center justify-between border-b border-ink/6 pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Current Plan
              </span>
              <h2 className="font-display text-2xl font-bold capitalize text-ink">
                LayoScan {sub.plan || 'Pro'}
              </h2>
            </div>
            <div className="text-right">
              <span className="font-display text-2xl font-bold text-ink">
                {formatBirr(sub.priceETB || 1500)}
              </span>
              <span className="text-xs text-ink-muted"> / month</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-paper p-3 border border-ink/5">
              <span className="text-xs text-ink-muted">Status</span>
              <p className="font-bold capitalize text-ink mt-0.5">{sub.status}</p>
            </div>
            <div className="rounded-2xl bg-paper p-3 border border-ink/5">
              <span className="text-xs text-ink-muted">Branch Limit</span>
              <p className="font-bold text-ink mt-0.5">{sub.branchLimit || 1} Branches</p>
            </div>
            <div className="rounded-2xl bg-paper p-3 border border-ink/5">
              <span className="text-xs text-ink-muted">Billing Cycle</span>
              <p className="font-bold capitalize text-ink mt-0.5">{sub.billingCycle || 'Monthly'}</p>
            </div>
          </div>

          {/* Value Proof Telemetry */}
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Conversion ROI Telemetry</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Activity tracked on this venue proving LayoScan value:
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-ink-muted text-[11px]">Orders Processed</span>
                <p className="text-base font-bold text-ink">{usage.order_placed?.count || 0}</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-ink-muted text-[11px]">QR Table Scans</span>
                <p className="text-base font-bold text-ink">{usage.qr_scanned?.count || 0}</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-ink-muted text-[11px]">Staff Added</span>
                <p className="text-base font-bold text-ink">{usage.staff_added?.count || 0}</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-ink-muted text-[11px]">Analytics Views</span>
                <p className="text-base font-bold text-ink">{usage.analytics_viewed?.count || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Ethiopian Payment Details Box ──────────────────────────────── */}
        <div className="rounded-3xl border border-ink/8 bg-gradient-to-br from-white to-paper p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span>ETB Payment Details</span>
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Pay via Telebirr SuperApp or Commercial Bank of Ethiopia (CBE):
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl border border-ink/8 bg-white p-3">
                <span className="font-semibold text-ink">Telebirr Merchant / Phone:</span>
                <p className="mt-0.5 font-mono text-sm font-bold text-primary">0911 00 22 33</p>
                <span className="text-[10px] text-ink-muted">Account: Layo Technologies PLC</span>
              </div>

              <div className="rounded-xl border border-ink/8 bg-white p-3">
                <span className="font-semibold text-ink">CBE Account:</span>
                <p className="mt-0.5 font-mono text-sm font-bold text-ink">1000 4455 6677 88</p>
                <span className="text-[10px] text-ink-muted">Commercial Bank of Ethiopia</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-ink/6 text-[11px] text-ink-muted flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Instant activation upon submitting your transaction reference.</span>
          </div>
        </div>
      </div>

      {/* ── Plan Comparison & Switcher ────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-ink">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Starter Plan */}
          <div
            className={clsx(
              'rounded-3xl border p-5 transition-all flex flex-col justify-between',
              sub.plan === 'starter'
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-ink/8 bg-white hover:border-ink/20'
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink text-base">Starter (Free Core)</h3>
                {sub.plan === 'starter' && (
                  <span className="rounded-full bg-primary text-white text-[10px] font-bold px-2 py-0.5">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Keep selling offline & online with 1 branch and essential QR ordering.
              </p>
              <div className="my-4">
                <span className="font-display text-2xl font-bold text-ink">0 ETB</span>
                <span className="text-xs text-ink-muted"> / forever</span>
              </div>
              <ul className="space-y-2 text-xs text-ink-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>1 Single Branch</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Offline write queue & sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Kitchen KDS & wait staff view</span>
                </li>
                <li className="flex items-center gap-2 text-ink/40">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>No Analytics or CSV exports</span>
                </li>
              </ul>
            </div>
            {sub.plan !== 'starter' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-6 w-full"
                onClick={() => planMutation.mutate('starter')}
                disabled={planMutation.isPending}
              >
                Downgrade to Starter
              </Button>
            )}
          </div>

          {/* Pro Plan */}
          <div
            className={clsx(
              'rounded-3xl border p-5 transition-all flex flex-col justify-between relative',
              sub.plan === 'pro'
                ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm'
                : 'border-ink/8 bg-white hover:border-ink/20'
            )}
          >
            <div className="absolute -top-3 right-5 bg-gradient-to-r from-amber-500 to-primary text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
              Most Popular
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink text-base">Pro Plan</h3>
                {sub.plan === 'pro' && (
                  <span className="rounded-full bg-primary text-white text-[10px] font-bold px-2 py-0.5">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Full analytics, multi-branch management, staff RBAC, and data exports.
              </p>
              <div className="my-4">
                <span className="font-display text-2xl font-bold text-ink">500 ETB</span>
                <span className="text-xs text-ink-muted"> / month</span>
              </div>
              <ul className="space-y-2 text-xs text-ink">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Up to 5 Branches</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Advanced Sales & Hourly Analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>CSV data exports (Orders, Staff, Revenue)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Full Staff Team & PIN login</span>
                </li>
              </ul>
            </div>
            {sub.plan !== 'pro' && (
              <Button
                variant="primary"
                size="sm"
                className="mt-6 w-full"
                onClick={() => planMutation.mutate('pro')}
                disabled={planMutation.isPending}
              >
                Upgrade to Pro
              </Button>
            )}
          </div>

          {/* Enterprise Plan */}
          <div
            className={clsx(
              'rounded-3xl border p-5 transition-all flex flex-col justify-between',
              sub.plan === 'enterprise'
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-ink/8 bg-white hover:border-ink/20'
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink text-base">Enterprise</h3>
                {sub.plan === 'enterprise' && (
                  <span className="rounded-full bg-primary text-white text-[10px] font-bold px-2 py-0.5">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Large restaurant chains, dedicated support SLA, and unlimited branches.
              </p>
              <div className="my-4">
                <span className="font-display text-2xl font-bold text-ink">2,000 ETB</span>
                <span className="text-xs text-ink-muted"> / month</span>
              </div>
              <ul className="space-y-2 text-xs text-ink-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Unlimited branches & tables</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Custom branding & domain support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Dedicated phone & on-site support</span>
                </li>
              </ul>
            </div>
            {sub.plan !== 'enterprise' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-6 w-full"
                onClick={() => planMutation.mutate('enterprise')}
                disabled={planMutation.isPending}
              >
                Contact for Enterprise
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Invoices Table ────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-ink/8 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <span>ETB Invoices & Receipts</span>
          </h2>
        </div>

        {invoices.length === 0 ? (
          <p className="text-sm text-ink-muted py-6 text-center">No invoices issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink/8 text-ink-muted uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Invoice #</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Payment Ref</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3 font-mono font-medium text-ink">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 font-bold text-ink">{formatBirr(inv.amountETB)}</td>
                    <td className="py-3 px-3 text-ink-muted">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize',
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'past_due'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-ink-muted">
                      {inv.paymentReference || '—'}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      {inv.status !== 'paid' ? (
                        <Button size="xs" variant="primary" onClick={() => handleOpenPay(inv)}>
                          Confirm Payment
                        </Button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700">✓ Settled</span>
                      )}
                      <Button
                        size="xs"
                        variant="outline"
                        title="Open WhatsApp Reminder link"
                        onClick={() => reminderMutation.mutate(inv._id)}
                        disabled={reminderMutation.isPending}
                      >
                        <Send className="h-3 w-3 mr-1 text-emerald-600" />
                        <span>WhatsApp</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Payment Confirmation Modal ────────────────────────────────────── */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Confirm Payment for ${selectedInvoice?.invoiceNumber || 'Invoice'}`}
      >
        <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
          <p className="text-ink-muted">
            Once you transfer{' '}
            <strong className="text-ink">{formatBirr(selectedInvoice?.amountETB || 1500)}</strong> via
            Telebirr or CBE Birr, enter the transaction ID below for verification:
          </p>

          <div>
            <label className="block font-semibold text-ink mb-1">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayMethod('telebirr')}
                className={clsx(
                  'p-2.5 rounded-xl border text-left font-medium transition cursor-pointer',
                  payMethod === 'telebirr'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-ink/10 bg-white text-ink hover:bg-slate-50'
                )}
              >
                Telebirr
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('cbe_birr')}
                className={clsx(
                  'p-2.5 rounded-xl border text-left font-medium transition cursor-pointer',
                  payMethod === 'cbe_birr'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-ink/10 bg-white text-ink hover:bg-slate-50'
                )}
              >
                CBE Birr / Bank Transfer
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1">
              Transaction Reference Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. TB123456789 or CBE-987654"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              className="w-full rounded-xl border border-ink/15 p-2.5 font-mono text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Any additional notes or payer name"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="w-full rounded-xl border border-ink/15 p-2.5 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={payMutation.isPending}>
              {payMutation.isPending ? 'Confirming…' : 'Submit & Activate'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
