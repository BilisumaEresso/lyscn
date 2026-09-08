import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DollarSign, Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import clsx from 'clsx';
import api from '../lib/api';
import socket from '../lib/socket';
import Badge from '../components/ui/Badge';

// ── Web Audio: soft two-tone beep (no external file) ─────────────────────────
function playNewOrderBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const play = (freq, start, duration) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type      = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.05);
    };
    play(880, 0,    0.15); // A5 — first tone
    play(1100, 0.18, 0.18); // C#6 — second tone
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Web Audio not available (e.g. headless environment) — silent fallback
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60)  return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)  return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

const STATUS_FLOW = ['placed', 'accepted', 'preparing', 'ready', 'served'];
const NEXT_STATUS = { placed: 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'served' };
const NEXT_LABEL  = { placed: 'Accept', accepted: 'Start preparing', preparing: 'Mark ready', ready: 'Mark served' };
const COLUMN_COLOR = {
  placed:    'border-t-amber',
  accepted:  'border-t-blue-400',
  preparing: 'border-t-teal',
  ready:     'border-t-leaf',
  served:    'border-t-slate',
};
const COLUMN_BG = {
  placed:    'bg-amber/5',
  accepted:  'bg-blue-50',
  preparing: 'bg-teal/5',
  ready:     'bg-leaf/5',
  served:    'bg-slate/5',
};

// ── Order card ────────────────────────────────────────────────────────────────
function OrderCard({ order, highlighted }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const next = NEXT_STATUS[order.status];

  const statusMutation = useMutation({
    mutationFn: (status) =>
      api.patch(`/orders/${order._id}/status`, { status }).then((r) => r.data),
    onSuccess: (data) => {
      // Optimistic update via query cache — socket event will also arrive
      qc.setQueryData(['orders-kanban'], (old) => mergeOrder(old, data.order));
      toast.success(`${capitalize(data.order.status)} — ${order.tableId?.label}`);
    },
    onError: () => toast.error('Status update failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      api.patch(`/orders/${order._id}/status`, { status: 'cancelled' }).then((r) => r.data),
    onSuccess: () => {
      setConfirming(false);
      qc.setQueryData(['orders-kanban'], (old) => mergeOrder(old, { ...order, status: 'cancelled' }));
      toast.success(`Order cancelled — ${order.tableId?.label}`);
    },
    onError: () => toast.error('Cancel failed'),
  });

  const payMutation = useMutation({
    mutationFn: (method) =>
      api.patch(`/orders/${order._id}/payment`, { paymentMethod: method }).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['orders-kanban'], (old) => mergeOrder(old, data.order));
      toast.success('Marked as paid');
    },
    onError: () => toast.error('Payment update failed'),
  });

  const itemSummary = order.items
    .slice(0, 3)
    .map((i) => `${i.qty}× ${i.name}`)
    .join(', ');
  const hasMore = order.items.length > 3;

  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-ink/8 p-4 mb-3 transition-all duration-300',
        highlighted && 'ring-2 ring-teal shadow-md'
      )}
    >
      {/* Card header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-display font-bold text-ink text-base">
            {order.tableId?.label ?? '—'}
          </span>
          {order.guestName && (
            <span className="ml-2 text-xs text-ink-muted">({order.guestName})</span>
          )}
        </div>
        <span className="text-xs text-ink-muted flex items-center gap-1">
          <Clock size={10} />
          {timeAgo(order.createdAt)}
        </span>
      </div>

      {/* Items */}
      <p className="text-sm text-ink-muted mb-2 leading-relaxed">
        {itemSummary}{hasMore ? ` +${order.items.length - 3} more` : ''}
      </p>

      {/* Total + payment */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-bold text-ink">
          ${order.totalAmount.toFixed(2)}
        </span>
        <Badge
          status={order.paymentStatus}
          label={capitalize(order.paymentStatus)}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5">
        {/* Advance status */}
        {next && (
          <button
            onClick={() => statusMutation.mutate(next)}
            disabled={statusMutation.isPending}
            className="w-full py-2 rounded-lg bg-teal text-white text-sm font-semibold
                       hover:bg-teal/90 transition-colors disabled:opacity-50"
          >
            {statusMutation.isPending ? 'Updating…' : NEXT_LABEL[order.status]}
          </button>
        )}

        {/* Mark as paid */}
        {order.paymentStatus === 'unpaid' && order.status !== 'cancelled' && (
          <div className="flex gap-1">
            <button
              onClick={() => payMutation.mutate('cash')}
              disabled={payMutation.isPending}
              className="flex-1 py-1.5 rounded-lg border border-ink/12 text-xs font-medium
                         text-ink-muted hover:bg-ink/5 transition-colors flex items-center justify-center gap-1"
            >
              <DollarSign size={11} /> Cash
            </button>
            <button
              onClick={() => payMutation.mutate('pos')}
              disabled={payMutation.isPending}
              className="flex-1 py-1.5 rounded-lg border border-ink/12 text-xs font-medium
                         text-ink-muted hover:bg-ink/5 transition-colors flex items-center justify-center gap-1"
            >
              <DollarSign size={11} /> POS
            </button>
          </div>
        )}

        {/* Cancel */}
        {order.status !== 'served' && order.status !== 'cancelled' && (
          confirming ? (
            <div className="flex gap-1">
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex-1 py-1.5 rounded-lg bg-danger/10 text-danger text-xs font-semibold"
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Confirm cancel'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 rounded-lg bg-ink/6 text-xs text-ink-muted"
              >
                Keep
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="text-xs text-ink/30 hover:text-danger transition-colors py-1 text-center"
            >
              Cancel order
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
function Column({ status, orders, highlightedId }) {
  const label = capitalize(status);
  return (
    <div className={clsx('flex flex-col w-72 shrink-0 rounded-2xl border border-t-4 overflow-hidden', COLUMN_COLOR[status], COLUMN_BG[status])}>
      <div className="px-4 py-3 flex items-center justify-between border-b border-ink/6">
        <span className="font-display font-semibold text-sm text-ink">{label}</span>
        <span className="text-xs text-ink-muted bg-white/70 px-2 py-0.5 rounded-full border border-ink/8">
          {orders.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {orders.length === 0 ? (
          <p className="text-xs text-ink/25 text-center py-6">No {label.toLowerCase()} orders</p>
        ) : (
          orders.map((o) => (
            <OrderCard
              key={o._id}
              order={o}
              highlighted={o._id === highlightedId}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Merge helper: update or insert an order in the flat list ──────────────────
function mergeOrder(currentData, updatedOrder) {
  if (!currentData?.orders) return currentData;
  const exists = currentData.orders.find((o) => o._id === updatedOrder._id);
  if (exists) {
    return {
      ...currentData,
      orders: currentData.orders.map((o) =>
        o._id === updatedOrder._id ? { ...o, ...updatedOrder } : o
      ),
    };
  }
  // Prepend new order
  return { ...currentData, orders: [updatedOrder, ...currentData.orders] };
}

// ── Main Kanban Orders page ───────────────────────────────────────────────────
export default function Orders() {
  const qc = useQueryClient();
  const [showCancelled, setShowCancelled] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const highlightTimer = useRef(null);

  // ── Initial fetch + 30s fallback poll ─────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['orders-kanban'],
    queryFn: () => api.get('/orders').then((r) => r.data),
    refetchInterval: 30_000, // fallback poll — sockets drive live updates
  });

  const orders = data?.orders ?? [];

  // ── Group by status ────────────────────────────────────────────────────────
  const columns = STATUS_FLOW.filter((s) => s !== 'cancelled' || showCancelled);
  const grouped = Object.fromEntries(
    columns.map((s) => [s, orders.filter((o) => o.status === s)])
  );
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  // ── Highlight helper ───────────────────────────────────────────────────────
  const highlight = useCallback((orderId) => {
    clearTimeout(highlightTimer.current);
    setHighlightedId(orderId);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 3500);
  }, []);

  // ── Socket lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    socket.connect();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => {
      setSocketConnected(false);
      // Reconnect → refetch to resync
    };
    const onReconnect = () => {
      qc.invalidateQueries({ queryKey: ['orders-kanban'] });
    };

    const onOrderCreated = (order) => {
      qc.setQueryData(['orders-kanban'], (old) => mergeOrder(old, order));
      const label = order.tableId?.label ?? 'a table';
      toast.success(`New order — ${label}`, { duration: 5000, icon: '🔔' });
      playNewOrderBeep();
      highlight(order._id);
    };

    const onOrderUpdated = (order) => {
      qc.setQueryData(['orders-kanban'], (old) => mergeOrder(old, order));
      highlight(order._id);
    };

    socket.on('connect',       onConnect);
    socket.on('disconnect',    onDisconnect);
    socket.on('reconnect',     onReconnect);
    socket.on('order:created', onOrderCreated);
    socket.on('order:updated', onOrderUpdated);

    return () => {
      socket.off('connect',       onConnect);
      socket.off('disconnect',    onDisconnect);
      socket.off('reconnect',     onReconnect);
      socket.off('order:created', onOrderCreated);
      socket.off('order:updated', onOrderUpdated);
      socket.disconnect();
      clearTimeout(highlightTimer.current);
    };
  }, [qc, highlight]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-ink/8 flex items-center justify-between shrink-0 bg-paper">
        <div>
          <h1 className="font-display font-bold text-xl text-ink">Orders</h1>
          <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1.5">
            {socketConnected ? (
              <>
                <Wifi size={11} className="text-teal" />
                Live · 30s fallback poll active
              </>
            ) : (
              <>
                <WifiOff size={11} className="text-amber" />
                Polling every 30s (socket offline)
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCancelled((v) => !v)}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
              showCancelled
                ? 'border-danger/30 bg-danger/6 text-danger'
                : 'border-ink/12 text-ink-muted hover:bg-ink/5'
            )}
          >
            Cancelled ({cancelledCount})
          </button>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['orders-kanban'] })}
            className="p-2 rounded-xl border border-ink/12 hover:bg-ink/5 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className="text-ink-muted" />
          </button>
        </div>
      </div>

      {/* ── Kanban board ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 px-6 py-4 h-full" style={{ width: 'max-content' }}>
          {isLoading ? (
            // Skeleton columns
            STATUS_FLOW.filter((s) => s !== 'cancelled').map((s) => (
              <div key={s} className="w-72 shrink-0 rounded-2xl bg-ink/4 animate-pulse" style={{ height: 'calc(100vh - 120px)' }} />
            ))
          ) : (
            columns.map((status) => (
              <Column
                key={status}
                status={status}
                orders={grouped[status] ?? []}
                highlightedId={highlightedId}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
