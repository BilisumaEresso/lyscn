import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import {
  DollarSign, Clock, RefreshCw, Wifi, WifiOff,
  CheckCircle2, CreditCard, ChevronDown, ChevronUp,
  LayoutGrid, ListFilter, AlertTriangle, User, MessageSquare
} from 'lucide-react';
import clsx from 'clsx';
import api from '../lib/api';
import socket from '../lib/socket';

// ── Web Audio: soft two-tone beep (no external audio file) ────────────────────
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
    play(880, 0,    0.15);  // A5 tone
    play(1100, 0.18, 0.18); // C#6 tone
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Silent fallback
  }
}

// ── Time & Formatting Helpers ────────────────────────────────────────────────
function timeAgo(date, now = Date.now()) {
  const secs = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function getElapsedMinutes(date, now = Date.now()) {
  return Math.max(0, (now - new Date(date).getTime()) / 60000);
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

const STATUS_FLOW = ['placed', 'accepted', 'preparing', 'ready', 'served'];
const NEXT_STATUS = { placed: 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'served' };
const NEXT_LABEL  = { placed: 'Accept order →', accepted: 'Start preparing →', preparing: 'Mark ready →', ready: 'Mark served →' };

const STATUS_CONFIG = {
  placed: {
    label: 'Placed',
    accentColor: '#F59E0B',
    bgWash: 'bg-amber/4 border-amber/15',
    headerAccent: 'border-t-amber',
    badgeStyle: 'bg-amber-100/70 text-amber-800 border-amber-200',
  },
  accepted: {
    label: 'Accepted',
    accentColor: '#3B82F6',
    bgWash: 'bg-blue-50/60 border-blue-200/50',
    headerAccent: 'border-t-blue-500',
    badgeStyle: 'bg-blue-100/70 text-blue-800 border-blue-200',
  },
  preparing: {
    label: 'Preparing',
    accentColor: '#14B8A6',
    bgWash: 'bg-teal/4 border-teal/15',
    headerAccent: 'border-t-teal',
    badgeStyle: 'bg-teal-100/70 text-teal-800 border-teal-200',
  },
  ready: {
    label: 'Ready',
    accentColor: '#10B981',
    bgWash: 'bg-emerald-50/60 border-emerald-200/50',
    headerAccent: 'border-t-emerald-500',
    badgeStyle: 'bg-emerald-100/70 text-emerald-800 border-emerald-200',
  },
  served: {
    label: 'Served',
    accentColor: '#64748B',
    bgWash: 'bg-slate-50 border-slate-200/60',
    headerAccent: 'border-t-slate-400',
    badgeStyle: 'bg-slate-200/70 text-slate-700 border-slate-300',
  },
  cancelled: {
    label: 'Cancelled',
    accentColor: '#EF4444',
    bgWash: 'bg-red-50/50 border-red-200/50',
    headerAccent: 'border-t-danger',
    badgeStyle: 'bg-red-100 text-red-700 border-red-200',
  },
};

// ── Redesigned Order Card Component ──────────────────────────────────────────
function OrderCard({ order, highlighted, isShaking, now, index }) {
  const qc = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const nextStatus = NEXT_STATUS[order.status];
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
  const elapsedMins = getElapsedMinutes(order.createdAt, now);

  // Operational Time Escalation styling
  let elapsedBadgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
  if (elapsedMins >= 15) {
    elapsedBadgeStyle = 'bg-red-50 text-red-700 border-red-300 font-bold animate-pulse';
  } else if (elapsedMins >= 5) {
    elapsedBadgeStyle = 'bg-amber-50 text-amber-700 border-amber-300 font-semibold';
  }

  const statusMutation = useMutation({
    mutationFn: (status) =>
      api.patch(`/orders/${order._id}/status`, { status }).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['orders-kanban'], (old) => mergeOrder(old, data.order));
      toast.success(`${capitalize(data.order.status)} — ${order.tableId?.label ?? 'Table'}`);
    },
    onError: () => toast.error('Status update failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      api.patch(`/orders/${order._id}/status`, { status: 'cancelled' }).then((r) => r.data),
    onSuccess: () => {
      setConfirmingCancel(false);
      qc.setQueryData(['orders-kanban'], (old) => mergeOrder(old, { ...order, status: 'cancelled' }));
      toast.success(`Order cancelled — ${order.tableId?.label ?? 'Table'}`);
    },
    onError: () => toast.error('Cancel failed'),
  });

  const payMutation = useMutation({
    mutationFn: (paymentMethod) =>
      api.patch(`/orders/${order._id}/payment`, { paymentMethod }).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['orders-kanban'], (old) => mergeOrder(old, data.order));
      toast.success('Marked as paid');
    },
    onError: () => toast.error('Payment update failed'),
  });

  const itemSummary = order.items
    .slice(0, 2)
    .map((i) => `${i.qty}× ${i.name}`)
    .join(', ');
  const extraItemsCount = order.items.length - 2;

  return (
    <Draggable draggableId={order._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            'bg-white rounded-xl border border-ink/10 shadow-sm mb-3 overflow-hidden transition-all duration-200 relative group',
            snapshot.isDragging && 'shadow-2xl scale-[1.02] ring-2 ring-teal z-30 cursor-grabbing',
            highlighted && 'ring-2 ring-teal shadow-md animate-card-slide-in',
            isShaking && 'animate-shake'
          )}
        >
          {/* Left accent bar (4px vertical strip in status color) */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 transition-colors"
            style={{ backgroundColor: config.accentColor }}
          />

          {/* Card Header & Content (Tap to expand) */}
          <div
            onClick={() => setIsExpanded((v) => !v)}
            className="pl-4 pr-3.5 pt-3.5 pb-2.5 cursor-pointer hover:bg-ink/1 transition-colors"
          >
            {/* Top row: Table Label + Elapsed Time */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-display font-bold text-ink text-base tracking-tight truncate">
                  {order.tableId?.label ?? 'Takeaway'}
                </span>
                {order.guestName && (
                  <span className="text-xs text-ink-muted flex items-center gap-1 truncate">
                    <User size={10} /> {order.guestName}
                  </span>
                )}
              </div>

              {/* Elapsed Time Badge */}
              <span
                className={clsx(
                  'text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0',
                  elapsedBadgeStyle
                )}
                title={`Created: ${new Date(order.createdAt).toLocaleTimeString()}`}
              >
                <Clock size={10} />
                {timeAgo(order.createdAt, now)}
              </span>
            </div>

            {/* Summarized item line */}
            <p className="text-xs text-ink-muted mb-2.5 leading-snug line-clamp-2">
              {itemSummary}{extraItemsCount > 0 ? ` +${extraItemsCount} more` : ''}
            </p>

            {/* Total + Payment Status Pill */}
            <div className="flex items-center justify-between pt-1">
              <span className="font-display font-bold text-ink text-sm">
                ${order.totalAmount.toFixed(2)}
              </span>

              {/* Payment Pill */}
              <div
                className={clsx(
                  'text-xs px-2.5 py-0.5 rounded-full border font-medium flex items-center gap-1 transition-colors',
                  order.paymentStatus === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                )}
              >
                {order.paymentStatus === 'paid' ? (
                  <>
                    <CheckCircle2 size={11} className="text-emerald-600" />
                    <span>Paid</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={11} className="text-slate-500" />
                    <span>Unpaid</span>
                  </>
                )}
              </div>
            </div>

            {/* Expand Indicator Chevron */}
            <div className="flex justify-center -mb-1 mt-1 opacity-30 group-hover:opacity-70 transition-opacity">
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>

          {/* Expanded Detail Panel */}
          {isExpanded && (
            <div className="pl-4 pr-3.5 py-3 border-t border-ink/8 bg-paper/60 text-xs space-y-2.5 animate-fade-in">
              <div className="space-y-1.5">
                <p className="font-semibold text-ink uppercase tracking-wider text-[10px] text-ink-muted">
                  Order Items ({order.items.length})
                </p>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start text-ink">
                    <div>
                      <span className="font-medium text-ink">
                        {item.qty}× {item.name}
                      </span>
                      {item.selectedModifiers?.length > 0 && (
                        <div className="text-[11px] text-ink-muted pl-2 space-y-0.5">
                          {item.selectedModifiers.map((m, mIdx) => (
                            <p key={mIdx}>
                              • {m.groupName}: {m.optionName}{' '}
                              {m.priceDelta > 0 ? `(+$${m.priceDelta.toFixed(2)})` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-ink shrink-0">
                      ${(item.subtotal || item.unitPrice * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-800 text-[11px] flex items-start gap-1.5">
                  <MessageSquare size={12} className="shrink-0 mt-0.5" />
                  <span>{order.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Card Footer Actions */}
          <div className="px-3.5 pb-3 pt-2 bg-white flex flex-col gap-1.5 border-t border-ink/4">
            {/* Primary Status Advance Button */}
            {nextStatus && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  statusMutation.mutate(nextStatus);
                }}
                disabled={statusMutation.isPending}
                aria-label={`Advance order for ${order.tableId?.label ?? 'Table'} to ${capitalize(nextStatus)}`}
                className="w-full py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1"
                style={{ backgroundColor: config.accentColor }}
              >
                {statusMutation.isPending ? 'Updating…' : NEXT_LABEL[order.status]}
              </button>
            )}

            {/* Mark as Paid Action Buttons */}
            {order.paymentStatus === 'unpaid' && order.status !== 'cancelled' && (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); payMutation.mutate('cash'); }}
                  disabled={payMutation.isPending}
                  className="flex-1 py-1 rounded-md border border-ink/12 text-[11px] font-medium text-ink-muted hover:bg-ink/5 transition-colors flex items-center justify-center gap-1"
                >
                  <DollarSign size={11} /> Cash
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); payMutation.mutate('pos'); }}
                  disabled={payMutation.isPending}
                  className="flex-1 py-1 rounded-md border border-ink/12 text-[11px] font-medium text-ink-muted hover:bg-ink/5 transition-colors flex items-center justify-center gap-1"
                >
                  <DollarSign size={11} /> POS
                </button>
              </div>
            )}

            {/* Cancel Order Action */}
            {order.status !== 'served' && order.status !== 'cancelled' && (
              confirmingCancel ? (
                <div className="flex gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cancelMutation.mutate(); }}
                    disabled={cancelMutation.isPending}
                    className="flex-1 py-1 rounded-md bg-danger/10 text-danger text-[11px] font-semibold"
                  >
                    {cancelMutation.isPending ? 'Cancelling…' : 'Confirm cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmingCancel(false); }}
                    className="px-2.5 py-1 rounded-md bg-ink/6 text-[11px] text-ink-muted"
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmingCancel(true); }}
                  className="text-[10px] text-ink/30 hover:text-danger transition-colors py-0.5 text-center font-medium"
                >
                  Cancel order
                </button>
              )
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ── Column Component ──────────────────────────────────────────────────────────
function Column({ status, orders, highlightedId, shakingId, now }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.placed;

  return (
    <div
      className={clsx(
        'flex flex-col w-72 shrink-0 rounded-2xl border border-t-4 transition-all overflow-hidden',
        config.headerAccent,
        config.bgWash
      )}
    >
      {/* Column Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-ink/8 bg-white/50 backdrop-blur-xs">
        <span className="font-display font-semibold text-sm text-ink flex items-center gap-2">
          {config.label}
        </span>
        <span className={clsx('text-xs px-2.5 py-0.5 rounded-full border font-bold', config.badgeStyle)}>
          {orders.length}
        </span>
      </div>

      {/* Droppable Card Area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={clsx(
              'flex-1 overflow-y-auto p-3 transition-colors min-h-[400px]',
              snapshot.isDraggingOver && 'bg-teal/8 ring-2 ring-inset ring-teal/30'
            )}
            style={{ maxHeight: 'calc(100vh - 170px)' }}
          >
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-ink/30 border border-dashed border-ink/10 rounded-xl my-2">
                <p className="text-xs font-medium">No {config.label.toLowerCase()} orders</p>
              </div>
            ) : (
              orders.map((o, idx) => (
                <OrderCard
                  key={o._id}
                  order={o}
                  index={idx}
                  now={now}
                  highlighted={o._id === highlightedId}
                  isShaking={o._id === shakingId}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ── Merge Helper ─────────────────────────────────────────────────────────────
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
  return { ...currentData, orders: [updatedOrder, ...currentData.orders] };
}

// ── Main Orders Page ─────────────────────────────────────────────────────────
export default function Orders() {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'
  const [showCancelled, setShowCancelled] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [shakingId, setShakingId] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [now, setNow] = useState(Date.now());
  const highlightTimer = useRef(null);

  // Client-side timer for live elapsed time badges
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // ── Initial fetch + 30s fallback poll ─────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['orders-kanban'],
    queryFn: () => api.get('/orders').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const orders = data?.orders ?? [];

  // Status mutation for Drag-and-Drop & Buttons
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
    onSuccess: (responseData) => {
      qc.setQueryData(['orders-kanban'], (old) => mergeOrder(old, responseData.order));
      toast.success(`${capitalize(responseData.order.status)} — ${responseData.order.tableId?.label ?? 'Table'}`);
    },
    onError: () => toast.error('Status update failed'),
  });

  // ── Drag and Drop Handler ─────────────────────────────────────────────────
  const handleDragEnd = (result) => {
    const { draggableId, source, destination } = result;

    if (!destination) return;

    const sourceStatus = source.droppableId;
    const targetStatus = destination.droppableId;

    if (sourceStatus === targetStatus) return;

    // Validate Status Flow
    const expectedNext = NEXT_STATUS[sourceStatus];
    const isValidTransition =
      targetStatus === expectedNext ||
      targetStatus === 'served' ||
      targetStatus === 'cancelled';

    if (!isValidTransition) {
      // Shake card on invalid transition and snap back
      setShakingId(draggableId);
      setTimeout(() => setShakingId(null), 500);
      toast('Orders can only be advanced forward step-by-step.', { icon: 'ℹ️' });
      return;
    }

    // Execute valid transition
    const targetOrder = orders.find((o) => o._id === draggableId);
    if (targetOrder) {
      // Optimistic update
      qc.setQueryData(['orders-kanban'], (old) =>
        mergeOrder(old, { ...targetOrder, status: targetStatus })
      );
      updateStatusMutation.mutate({ id: draggableId, status: targetStatus });
    }
  };

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
    const onDisconnect = () => setSocketConnected(false);
    const onReconnect = () => qc.invalidateQueries({ queryKey: ['orders-kanban'] });

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

  // List view sorting (newest/aging first)
  const listOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-paper">
      {/* ── Header Bar ────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-ink/8 flex items-center justify-between shrink-0 bg-white shadow-2xs">
        <div>
          <h1 className="font-display font-bold text-xl text-ink">Live Orders</h1>
          <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1.5">
            {socketConnected ? (
              <>
                <Wifi size={11} className="text-teal" />
                Realtime Socket Active · 30s poll fallback
              </>
            ) : (
              <>
                <WifiOff size={11} className="text-amber" />
                Polling every 30s (socket offline)
              </>
            )}
          </p>
        </div>

        {/* Header Controls: View Density + Filters + Refresh */}
        <div className="flex items-center gap-3">
          {/* Board vs List Density Toggle */}
          <div className="flex bg-ink/5 p-0.5 rounded-xl border border-ink/8">
            <button
              onClick={() => setViewMode('board')}
              className={clsx(
                'px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all',
                viewMode === 'board'
                  ? 'bg-white text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              )}
            >
              <LayoutGrid size={13} /> Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all',
                viewMode === 'list'
                  ? 'bg-white text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              )}
            >
              <ListFilter size={13} /> List
            </button>
          </div>

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
            className="p-2 rounded-xl border border-ink/12 hover:bg-ink/5 transition-colors text-ink-muted hover:text-ink"
            title="Refresh Orders"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Main View Area ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {viewMode === 'board' ? (
          /* KANBAN BOARD WITH DRAG & DROP */
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 px-6 py-4 h-full" style={{ width: 'max-content' }}>
              {isLoading ? (
                STATUS_FLOW.filter((s) => s !== 'cancelled').map((s) => (
                  <div
                    key={s}
                    className="w-72 shrink-0 rounded-2xl bg-ink/4 animate-pulse"
                    style={{ height: 'calc(100vh - 120px)' }}
                  />
                ))
              ) : (
                columns.map((status) => (
                  <Column
                    key={status}
                    status={status}
                    orders={grouped[status] ?? []}
                    highlightedId={highlightedId}
                    shakingId={shakingId}
                    now={now}
                  />
                ))
              )}
            </div>
          </DragDropContext>
        ) : (
          /* DENSE LIST VIEW SORTED BY ELAPSED TIME */
          <div className="max-w-4xl mx-auto px-6 py-6 overflow-y-auto h-full space-y-3">
            {listOrders.length === 0 ? (
              <p className="text-center text-ink-muted text-sm py-12">No orders recorded yet.</p>
            ) : (
              listOrders.map((order) => {
                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
                const elapsedMins = getElapsedMinutes(order.createdAt, now);

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-xl border border-ink/10 p-4 shadow-xs flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-2 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: config.accentColor }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-ink text-base">
                            {order.tableId?.label ?? 'Table'}
                          </span>
                          <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-semibold', config.badgeStyle)}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted truncate mt-0.5">
                          {order.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-display font-bold text-ink text-sm">
                        ${order.totalAmount.toFixed(2)}
                      </span>
                      <span className="text-xs text-ink-muted font-medium flex items-center gap-1">
                        <Clock size={11} /> {timeAgo(order.createdAt, now)}
                      </span>
                      {NEXT_STATUS[order.status] && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: order._id, status: NEXT_STATUS[order.status] })}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs"
                          style={{ backgroundColor: config.accentColor }}
                        >
                          Advance →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
