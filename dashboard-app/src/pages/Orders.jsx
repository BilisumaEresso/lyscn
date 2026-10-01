import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import Currency, { formatBirr } from '../components/ui/Currency';
import {
  DollarSign, Clock, RefreshCw, Wifi, WifiOff,
  CheckCircle2, CreditCard, ChevronDown, ChevronUp,
  LayoutGrid, ListFilter, AlertTriangle, User, MessageSquare, Star, MapPin
} from 'lucide-react';
import clsx from 'clsx';
import api from '../lib/api';
import socket from '../lib/socket';

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

function isLongUnpaid(order, now = Date.now()) {
  if (!order || order.paymentStatus !== 'unpaid' || order.status === 'cancelled') return false;
  const elapsed = getElapsedMinutes(order.createdAt, now);
  // Served and unpaid for 15+ minutes, or any order unpaid for 30+ minutes
  return (order.status === 'served' && elapsed >= 15) || elapsed >= 30;
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
    btnBg: 'bg-amber-500 hover:bg-amber-600',
  },
  accepted: {
    label: 'Accepted',
    accentColor: '#3B82F6',
    bgWash: 'bg-blue-50/60 border-blue-200/50',
    headerAccent: 'border-t-blue-500',
    badgeStyle: 'bg-blue-100/70 text-blue-800 border-blue-200',
    btnBg: 'bg-blue-600 hover:bg-blue-700',
  },
  preparing: {
    label: 'Preparing',
    accentColor: '#14B8A6',
    bgWash: 'bg-teal/4 border-teal/15',
    headerAccent: 'border-t-teal',
    badgeStyle: 'bg-teal-100/70 text-teal-800 border-teal-200',
    btnBg: 'bg-teal-600 hover:bg-teal-700',
  },
  ready: {
    label: 'Ready',
    accentColor: '#10B981',
    bgWash: 'bg-emerald-50/60 border-emerald-200/50',
    headerAccent: 'border-t-emerald-500',
    badgeStyle: 'bg-emerald-100/70 text-emerald-800 border-emerald-200',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700',
  },
  served: {
    label: 'Served',
    accentColor: '#64748B',
    bgWash: 'bg-slate-50 border-slate-200/60',
    headerAccent: 'border-t-slate-400',
    badgeStyle: 'bg-slate-200/70 text-slate-700 border-slate-300',
    btnBg: 'bg-slate-700 hover:bg-slate-800',
  },
  cancelled: {
    label: 'Cancelled',
    accentColor: '#EF4444',
    bgWash: 'bg-red-50/50 border-red-200/50',
    headerAccent: 'border-t-danger',
    badgeStyle: 'bg-red-100 text-red-700 border-red-200',
    btnBg: 'bg-red-600 hover:bg-red-700',
  },
};

function RatingBadge({ rating }) {
  if (!rating) return null;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 font-semibold flex items-center gap-1">
      <Star size={11} fill="currentColor" /> {rating}/5
    </span>
  );
}

// ── Redesigned Order Card Component ──────────────────────────────────────────
function OrderCard({ order, highlighted, isShaking, now, index, tableOrderCount = 1 }) {
  const qc = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const nextStatus = NEXT_STATUS[order.status];
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
  const elapsedMins = getElapsedMinutes(order.createdAt, now);
  const longUnpaid = isLongUnpaid(order, now);

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
      qc.invalidateQueries({ queryKey: ['orders-kanban'] });
      qc.invalidateQueries({ queryKey: ['orders-unpaid'] });
      toast.success(
        tableOrderCount > 1
          ? `All rounds marked as paid for ${order.tableId?.label ?? 'Table'}`
          : 'Marked as paid'
      );
    },
    onError: () => toast.error('Payment update failed'),
  });

  const itemSummary = order.items
    .slice(0, 2)
    .map((i) => {
      const specText = (i.selectedSpecs || []).map((s) => s.optionName).join(' · ');
      return `${i.qty}× ${i.name}${specText ? ` (${specText})` : ''}`;
    })
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
            {/* Top row: Table Label + Multi-order badge + Guest + Elapsed Time */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="font-display font-bold text-ink text-base tracking-tight truncate">
                  {order.tableId?.label ?? 'Takeaway'}
                </span>
                {order.tableId?.sessionLocationVerified === false && (
                  <span title="Location unverified for this order" className="text-ink-muted">
                    <MapPin size={12} />
                  </span>
                )}
                {tableOrderCount > 1 && (
                  <span
                    title={`${tableOrderCount} active orders at this table`}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200 shrink-0"
                  >
                    {tableOrderCount} orders
                  </span>
                )}
                {order.guestName && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-teal/8 text-teal font-medium flex items-center gap-1 shrink-0">
                    <User size={10} /> {order.guestName}
                  </span>
                )}
                {order.assignedWaiterName && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 shrink-0">
                    Server: {order.assignedWaiterName}
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
              <Currency value={order.totalAmount} className="font-display font-bold text-ink text-sm" />

              {/* Payment Pill & Alerts */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {longUnpaid && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-300 flex items-center gap-1 animate-pulse shrink-0">
                    <AlertTriangle size={10} className="text-rose-600" /> Long Unpaid
                  </span>
                )}
                {order.status === 'served' && <RatingBadge rating={order.rating} />}
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
                  <div key={i} className="flex justify-between items-start text-ink py-1 border-b border-ink/4 last:border-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-ink">
                          {item.qty}× {item.name}
                        </span>
                        {item.selectedSpecs?.map((spec, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                          >
                            {spec.optionName}
                          </span>
                        ))}
                      </div>

                      {item.selectedModifiers?.length > 0 && (
                        <div className="text-[11px] text-ink-muted pl-2 space-y-0.5">
                          {item.selectedModifiers.map((m, mIdx) => (
                            <p key={mIdx}>
                              • {m.groupName}: {m.optionName}{' '}
                              {m.priceDelta > 0 ? `(+${formatBirr(m.priceDelta)})` : ''}
                            </p>
                          ))}
                        </div>
                      )}

                      {item.quickTags?.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pl-1">
                          {item.quickTags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.itemNotes && (
                        <p className="text-[11px] text-amber-900 italic bg-amber-50/80 rounded px-1.5 py-0.5 border border-amber-200/60 inline-block">
                          Note: "{item.itemNotes}"
                        </p>
                      )}
                    </div>
                    <span className="font-medium text-ink shrink-0 pl-2">
                      <Currency value={item.subtotal || item.unitPrice * item.qty} />
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
            {/* Primary Status Advance Button or Served -> Paid Action */}
            {nextStatus ? (
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
            ) : order.status === 'served' && order.paymentStatus === 'unpaid' ? (
              /* Next step after Served: direct prominent Paid buttons */
              <div className="flex flex-col gap-1">
                {tableOrderCount > 1 && (
                  <p className="text-[10px] text-amber-800 font-semibold bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200 text-center">
                    Settles all {tableOrderCount} rounds for this table at once
                  </p>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); payMutation.mutate('telebirr'); }}
                    disabled={payMutation.isPending}
                    className="py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center justify-center gap-1"
                  >
                    Telebirr
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); payMutation.mutate('cbebirr'); }}
                    disabled={payMutation.isPending}
                    className="py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-xs flex items-center justify-center gap-1"
                  >
                    CBE Birr
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); payMutation.mutate('cash'); }}
                    disabled={payMutation.isPending}
                    className="py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center justify-center gap-1"
                  >
                    <DollarSign size={13} /> {tableOrderCount > 1 ? 'All (Cash)' : 'Cash'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); payMutation.mutate('pos'); }}
                    disabled={payMutation.isPending}
                    className="py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-xs flex items-center justify-center gap-1"
                  >
                    <CreditCard size={13} /> {tableOrderCount > 1 ? 'All (POS)' : 'POS'}
                  </button>
                </div>
              </div>
            ) : order.paymentStatus === 'paid' ? (
              <div className="py-1 text-center text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1">
                <CheckCircle2 size={13} /> Paid ({order.paymentMethod?.toUpperCase() || 'PAID'})
              </div>
            ) : null}

            {/* Quick payment options for other in-progress statuses if unpaid */}
            {order.status !== 'served' && order.paymentStatus === 'unpaid' && order.status !== 'cancelled' && (
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
                  <CreditCard size={11} /> POS
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

// ── Column Component ──────────────────────────────────────────
function Column({ status, orders, highlightedId, shakingId, now, activeOrdersPerTable }) {
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
                  tableOrderCount={activeOrdersPerTable?.[o.tableId?._id] || 1}
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

// ── Mobile-Optimized Order List Card Component ──────────────────────────────
function OrderListCard({
  order,
  now,
  highlighted,
  tableOrderCount = 1,
  onAdvanceStatus,
  onPayOrder,
  onCancelOrder,
  isAdvancePending,
  isPayPending,
  isCancelPending,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
  const nextStatus = NEXT_STATUS[order.status];
  const elapsedMins = getElapsedMinutes(order.createdAt, now);
  const longUnpaid = isLongUnpaid(order, now);

  // Operational Time Escalation styling
  let elapsedBadgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  if (elapsedMins >= 15) {
    elapsedBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-300 font-bold animate-pulse';
  } else if (elapsedMins >= 5) {
    elapsedBadgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
  }

  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border border-ink/10 shadow-xs overflow-hidden transition-all duration-200 relative',
        highlighted && 'ring-2 ring-teal shadow-md',
        longUnpaid && 'border-rose-300 ring-1 ring-rose-200'
      )}
    >
      {/* Top 3px status line */}
      <div className="h-1 w-full" style={{ backgroundColor: config.accentColor }} />

      <div className="p-3.5 sm:p-4 space-y-3">
        {/* Tier 1: Table Badge + Multi-Round Badge + Elapsed Time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-display font-extrabold text-ink bg-ink/5 px-2.5 py-1 rounded-xl text-sm sm:text-base border border-ink/8 tracking-tight shrink-0 flex items-center gap-1.5">
              {order.tableId?.label ?? 'Takeaway'}
              {order.tableId?.sessionLocationVerified === false && (
                <span title="Location unverified">
                  <MapPin size={12} className="text-amber-500" />
                </span>
              )}
            </span>

            {tableOrderCount > 1 && (
              <span
                title={`${tableOrderCount} active orders at this table`}
                className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold shrink-0"
              >
                {tableOrderCount} orders
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={clsx(
                'text-xs px-2.5 py-0.5 rounded-full border flex items-center gap-1',
                elapsedBadgeStyle
              )}
              title={`Created: ${new Date(order.createdAt).toLocaleTimeString()}`}
            >
              <Clock size={11} />
              {timeAgo(order.createdAt, now)}
            </span>

            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="p-1 rounded-lg hover:bg-ink/5 text-ink-muted hover:text-ink transition-colors"
              aria-label={isExpanded ? 'Collapse order details' : 'Expand order details'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Tier 2: Customer Name, Assigned Server & Status Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap min-w-0 text-ink-muted">
            {order.guestName && (
              <span className="font-medium text-ink flex items-center gap-1 shrink-0">
                <User size={12} className="text-teal" /> {order.guestName}
              </span>
            )}
            {order.assignedWaiterName && (
              <span className="shrink-0 text-ink-muted">
                · Server: <strong className="text-ink">{order.assignedWaiterName}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {longUnpaid && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-300 flex items-center gap-1 animate-pulse">
                <AlertTriangle size={11} className="text-rose-600" /> Long Unpaid
              </span>
            )}
            <span className={clsx('text-xs px-2.5 py-0.5 rounded-full border font-semibold', config.badgeStyle)}>
              {config.label}
            </span>
            {order.status === 'served' && <RatingBadge rating={order.rating} />}
          </div>
        </div>

        {/* Tier 3: Items Breakdown */}
        {isExpanded ? (
          <div className="bg-paper/70 rounded-xl p-3 border border-ink/8 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink-muted pb-1 border-b border-ink/6">
              <span>Order Items ({order.items.length})</span>
              <span>Price</span>
            </div>

            <div className="space-y-2 divide-y divide-ink/5">
              {order.items.map((item, i) => (
                <div key={i} className="pt-2 first:pt-0 flex justify-between items-start gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-ink text-xs">
                        {item.qty}× {item.name}
                      </span>

                      {/* Ethiopian Specifications Badges */}
                      {item.selectedSpecs?.map((spec, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300 font-bold"
                          title={spec.specName}
                        >
                          {spec.optionName}
                        </span>
                      ))}
                    </div>

                    {/* Modifiers */}
                    {item.selectedModifiers?.length > 0 && (
                      <div className="text-[11px] text-ink-muted pl-2 space-y-0.5">
                        {item.selectedModifiers.map((m, mIdx) => (
                          <p key={mIdx}>
                            • {m.groupName}: {m.optionName}{' '}
                            {m.priceDelta > 0 ? `(+${formatBirr(m.priceDelta)})` : ''}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Quick Tags */}
                    {item.quickTags?.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pl-1">
                        {item.quickTags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Item Notes */}
                    {item.itemNotes && (
                      <p className="text-[11px] text-amber-900 italic bg-amber-50/90 rounded-md px-2 py-0.5 border border-amber-200 inline-block">
                        Note: "{item.itemNotes}"
                      </p>
                    )}
                  </div>

                  <span className="font-semibold text-ink shrink-0 text-xs">
                    <Currency value={item.subtotal || item.unitPrice * item.qty} />
                  </span>
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-900 text-xs flex items-start gap-1.5 mt-2">
                <MessageSquare size={13} className="shrink-0 mt-0.5 text-amber-700" />
                <span>Order Note: "{order.notes}"</span>
              </div>
            )}
          </div>
        ) : (
          /* Collapsed items preview (readable, clean) */
          <div
            onClick={() => setIsExpanded(true)}
            className="cursor-pointer bg-paper/50 hover:bg-paper rounded-xl p-2.5 border border-ink/6 flex items-center justify-between text-xs text-ink-muted transition-colors"
          >
            <span className="truncate pr-2">
              {order.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
            </span>
            <span className="text-teal font-semibold shrink-0 text-[11px]">
              Details ({order.items.length}) ↓
            </span>
          </div>
        )}

        {/* Tier 4: Total & Thumb-Friendly Action Bar */}
        <div className="pt-2 border-t border-ink/8 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ink-muted font-medium">Order Total</span>
              <div
                className={clsx(
                  'text-[11px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1',
                  order.paymentStatus === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                )}
              >
                {order.paymentStatus === 'paid' ? (
                  <>
                    <CheckCircle2 size={11} className="text-emerald-600" /> Paid ({order.paymentMethod?.toUpperCase() || 'PAID'})
                  </>
                ) : (
                  <>
                    <CreditCard size={11} className="text-slate-500" /> Unpaid
                  </>
                )}
              </div>
            </div>

            <Currency value={order.totalAmount} className="font-display font-bold text-ink text-base sm:text-lg" />
          </div>

          {/* Contextual Action Buttons */}
          {nextStatus ? (
            <button
              type="button"
              onClick={() => onAdvanceStatus(order._id, nextStatus)}
              disabled={isAdvancePending}
              className={clsx(
                'w-full h-11 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]',
                config.btnBg
              )}
            >
              <span>{NEXT_LABEL[order.status]}</span>
            </button>
          ) : order.status === 'served' && order.paymentStatus === 'unpaid' ? (
            <div className="space-y-1.5">
              {tableOrderCount > 1 && (
                <p className="text-[11px] text-amber-800 font-semibold bg-amber-50 rounded-lg px-2 py-1 border border-amber-200 text-center">
                  Settles all {tableOrderCount} rounds for {order.tableId?.label ?? 'Table'}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onPayOrder(order._id, 'cash')}
                  disabled={isPayPending}
                  className="h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <DollarSign size={14} />
                  <span>{tableOrderCount > 1 ? `Pay All Cash` : `Paid (Cash)`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPayOrder(order._id, 'pos')}
                  disabled={isPayPending}
                  className="h-11 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <CreditCard size={14} />
                  <span>{tableOrderCount > 1 ? `Pay All POS` : `Paid (POS)`}</span>
                </button>
              </div>
            </div>
          ) : order.status === 'served' && order.paymentStatus === 'paid' ? (
            <div className="w-full py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-center text-xs font-semibold text-slate-600 flex items-center justify-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Order Completed & Settled</span>
            </div>
          ) : null}

          {/* Cancel Option */}
          {order.status !== 'served' && order.status !== 'cancelled' && (
            confirmingCancel ? (
              <div className="flex gap-2 pt-1 animate-fade-in">
                <button
                  type="button"
                  onClick={() => {
                    onCancelOrder(order._id);
                    setConfirmingCancel(false);
                  }}
                  disabled={isCancelPending}
                  className="flex-1 py-1.5 rounded-lg bg-danger/10 text-danger text-xs font-bold hover:bg-danger/15 transition-colors"
                >
                  {isCancelPending ? 'Cancelling…' : 'Confirm Cancel Order'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  className="px-3 py-1.5 rounded-lg bg-ink/6 text-xs text-ink-muted hover:bg-ink/10 transition-colors"
                >
                  Keep Order
                </button>
              </div>
            ) : (
              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(true)}
                  className="text-[11px] text-ink/40 hover:text-danger font-medium transition-colors"
                >
                  Cancel this order
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Orders Page ─────────────────────────────────────────────────────────
export default function Orders() {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState('list'); // 'board' or 'list'
  const [showCancelled, setShowCancelled] = useState(false);
  const [activeFilter, setActiveFilter] = useState('active'); // 'active' | 'unpaid' | 'served' | 'all'
  const [expandedSections, setExpandedSections] = useState(() => ({
    placed: true,
    accepted: true,
    preparing: true,
    ready: true,
    served: true,
  }));
  const listContainerRef = useRef(null);

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

  const activeOrdersCount = useMemo(() => {
    return orders.filter((o) => ['placed', 'accepted', 'preparing', 'ready'].includes(o.status)).length;
  }, [orders]);

  const unpaidOrdersCount = useMemo(() => {
    return orders.filter((o) => o.paymentStatus === 'unpaid' && o.status !== 'cancelled').length;
  }, [orders]);

  const longUnpaidOrders = useMemo(() => {
    return orders.filter((o) => isLongUnpaid(o, now));
  }, [orders, now]);

  const activeOrdersPerTable = useMemo(() => {
    const counts = {};
    for (const o of orders) {
      if (o.status !== 'served' && o.status !== 'cancelled' && o.tableId?._id) {
        counts[o.tableId._id] = (counts[o.tableId._id] || 0) + 1;
      }
    }
    return counts;
  }, [orders]);

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

  // Page-level payment mutation for List view & Quick actions
  const payOrderMutation = useMutation({
    mutationFn: ({ id, paymentMethod }) =>
      api.patch(`/orders/${id}/payment`, { paymentMethod }).then((r) => r.data),
    onSuccess: (responseData) => {
      qc.invalidateQueries({ queryKey: ['orders-kanban'] });
      qc.invalidateQueries({ queryKey: ['orders-unpaid'] });
      toast.success(`Marked all rounds paid (${responseData.order.paymentMethod?.toUpperCase() || 'PAID'}) — ${responseData.order.tableId?.label ?? 'Table'}`);
    },
    onError: () => toast.error('Payment update failed'),
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
      clearTimeout(highlightTimer.current);
    };
  }, [qc, highlight]);

  // Refs for status sections to support scrolling from chips
  const sectionRefs = {
    placed: useRef(null),
    accepted: useRef(null),
    preparing: useRef(null),
    ready: useRef(null),
    served: useRef(null),
  };

  const scrollToSection = (status) => {
    if (!sectionRefs[status] || !sectionRefs[status].current) return;
    sectionRefs[status].current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const el = sectionRefs[status].current;
    el.classList.add('ring-2', 'ring-teal');
    setTimeout(() => el.classList.remove('ring-2', 'ring-teal'), 900);
  };

  const toggleSection = (status) => {
    setExpandedSections((s) => ({ ...s, [status]: !s[status] }));
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-paper">
      {/* ── Header Bar ────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-3 lg:pt-14 pb-3 border-b border-ink/8 flex items-center justify-between shrink-0 bg-white shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-lg sm:text-xl text-ink">Live Orders</h1>
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              )}
              title={socketConnected ? 'Realtime Socket Active' : 'Polling fallback active'}
            />
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            {socketConnected ? 'Realtime feed active' : 'Polling every 30s'}
          </p>
        </div>

        {/* Header Controls: View Toggle (List/Board) + Cancelled + Refresh */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Board vs List toggle — always accessible, no floating FAB needed */}
          <div className="flex bg-ink/5 p-0.5 rounded-xl border border-ink/8">
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all',
                viewMode === 'list'
                  ? 'bg-white text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              )}
              title="List View"
            >
              <ListFilter size={13} />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={clsx(
                'px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all',
                viewMode === 'board'
                  ? 'bg-white text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              )}
              title="Board View"
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Board</span>
            </button>
          </div>

          <button
            onClick={() => setShowCancelled((v) => !v)}
            className={clsx(
              'text-xs px-2.5 py-1.5 rounded-xl border font-medium transition-colors',
              showCancelled
                ? 'border-danger/30 bg-danger/10 text-danger font-semibold'
                : 'border-ink/12 text-ink-muted hover:bg-ink/5'
            )}
            title="Toggle Cancelled Orders"
          >
            <span>Cancelled ({cancelledCount})</span>
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

      {/* Top Alert Banner for Long Unpaid Orders */}
      {longUnpaidOrders.length > 0 && activeFilter !== 'unpaid' && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-rose-800 text-xs font-medium shrink-0 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={15} className="text-rose-600 shrink-0 animate-pulse" />
            <span className="truncate">
              <strong>{longUnpaidOrders.length} {longUnpaidOrders.length === 1 ? 'order has' : 'orders have'} been unpaid for 15+ mins:</strong>{' '}
              {longUnpaidOrders.map((o) => o.tableId?.label || 'Table').slice(0, 4).join(', ')}
            </span>
          </div>
          <button
            onClick={() => {
              setViewMode('list');
              setActiveFilter('unpaid');
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shrink-0"
          >
            Settle ({longUnpaidOrders.length})
          </button>
        </div>
      )}

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
                    activeOrdersPerTable={activeOrdersPerTable}
                  />
                ))
              )}
            </div>
          </DragDropContext>
        ) : (
          /* LIST VIEW: Mobile-first responsive order feed */
          <div ref={listContainerRef} className="max-w-2xl mx-auto px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto h-full space-y-4 pb-28">
            {/* Segmented Filter Control */}
            <div className="flex bg-ink/5 p-1 rounded-2xl border border-ink/8 gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveFilter('active')}
                className={clsx(
                  'flex-1 min-w-[85px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5',
                  activeFilter === 'active'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-white/50'
                )}
              >
                <span>⚡ Active</span>
                <span className={clsx('text-[10px] px-1.5 py-0.2 rounded-full font-bold', activeFilter === 'active' ? 'bg-white/20 text-white' : 'bg-ink/10 text-ink')}>
                  {activeOrdersCount}
                </span>
              </button>

              <button
                onClick={() => setActiveFilter('unpaid')}
                className={clsx(
                  'flex-1 min-w-[85px] py-2 px-2.5 rounded-xl text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5',
                  activeFilter === 'unpaid'
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : unpaidOrdersCount > 0
                      ? 'text-rose-700 bg-rose-50/80 hover:bg-rose-100/80 font-semibold'
                      : 'text-ink-muted hover:text-ink hover:bg-white/50'
                )}
              >
                <span>⏳ Unpaid</span>
                {unpaidOrdersCount > 0 && (
                  <span className={clsx('text-[10px] px-1.5 py-0.2 rounded-full font-bold', activeFilter === 'unpaid' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-800')}>
                    {unpaidOrdersCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveFilter('served')}
                className={clsx(
                  'flex-1 min-w-[85px] py-2 px-2.5 rounded-xl text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5',
                  activeFilter === 'served'
                    ? 'bg-slate-800 text-white shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink hover:bg-white/50'
                )}
              >
                <span>✅ Served</span>
                <span className={clsx('text-[10px] px-1.5 py-0.2 rounded-full font-bold', activeFilter === 'served' ? 'bg-white/20 text-white' : 'bg-ink/10 text-ink')}>
                  {(grouped['served'] || []).length}
                </span>
              </button>

              <button
                onClick={() => setActiveFilter('all')}
                className={clsx(
                  'flex-1 min-w-[65px] py-2 px-2 rounded-xl text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5',
                  activeFilter === 'all'
                    ? 'bg-white text-ink shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink hover:bg-white/50'
                )}
              >
                <span>All</span>
                <span className={clsx('text-[10px] px-1.5 py-0.2 rounded-full font-bold', activeFilter === 'all' ? 'bg-ink/10 text-ink' : 'bg-ink/10 text-ink')}>
                  {orders.filter(o => o.status !== 'cancelled' || showCancelled).length}
                </span>
              </button>
            </div>

            {/* Quick jump sub-chips for Active orders */}
            {activeFilter === 'active' && activeOrdersCount > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
                <span className="text-[11px] text-ink-muted shrink-0 font-medium">Jump to:</span>
                {['placed', 'accepted', 'preparing', 'ready'].map((st) => {
                  const count = (grouped[st] || []).length;
                  if (count === 0) return null;
                  const cfg = STATUS_CONFIG[st];
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => scrollToSection(st)}
                      className="px-2.5 py-1 rounded-full bg-white border border-ink/10 text-ink text-xs font-medium hover:bg-ink/5 shrink-0 flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.accentColor }} />
                      <span>{cfg.label}</span>
                      <span className="text-[11px] text-ink-muted font-bold">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* View Content: Active Tab Empty State */}
            {activeFilter === 'active' && activeOrdersCount === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-white rounded-2xl border border-ink/8 p-6 shadow-2xs">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-ink">All Orders Served!</h3>
                  <p className="text-xs text-ink-muted mt-1">There are no active orders waiting in the queue.</p>
                </div>
                {(grouped['served'] || []).length > 0 && (
                  <button
                    onClick={() => setActiveFilter('served')}
                    className="text-xs font-semibold text-teal hover:underline pt-1"
                  >
                    View {(grouped['served'] || []).length} Served Orders →
                  </button>
                )}
              </div>
            )}

            {/* View Content: Unpaid Tab */}
            {activeFilter === 'unpaid' && (
              unpaidOrdersCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 bg-white rounded-2xl border border-ink/8 p-6 shadow-2xs">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="font-display font-bold text-sm text-ink">All Bills Settled</h3>
                  <p className="text-xs text-ink-muted">No pending unpaid orders found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-ink-muted px-1">
                    <span className="font-semibold text-ink">Orders Pending Payment ({unpaidOrdersCount})</span>
                    <span>Oldest first</span>
                  </div>
                  {orders
                    .filter((o) => o.paymentStatus === 'unpaid' && o.status !== 'cancelled')
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map((order) => (
                      <OrderListCard
                        key={order._id}
                        order={order}
                        now={now}
                        highlighted={order._id === highlightedId}
                        tableOrderCount={activeOrdersPerTable[order.tableId?._id] || 1}
                        onAdvanceStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
                        onPayOrder={(id, paymentMethod) => payOrderMutation.mutate({ id, paymentMethod })}
                        onCancelOrder={(id) => updateStatusMutation.mutate({ id, status: 'cancelled' })}
                        isAdvancePending={updateStatusMutation.isPending}
                        isPayPending={payOrderMutation.isPending}
                        isCancelPending={updateStatusMutation.isPending}
                      />
                    ))}
                </div>
              )
            )}

            {/* View Content: Served Tab */}
            {activeFilter === 'served' && (
              (grouped['served'] || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 bg-white rounded-2xl border border-ink/8 p-6 shadow-2xs">
                  <p className="text-xs text-ink-muted">No served orders recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-ink-muted px-1">
                    <span className="font-semibold text-ink">Completed Orders ({(grouped['served'] || []).length})</span>
                    <span>Newest first</span>
                  </div>
                  {(grouped['served'] || []).map((order) => (
                    <OrderListCard
                      key={order._id}
                      order={order}
                      now={now}
                      highlighted={order._id === highlightedId}
                      tableOrderCount={activeOrdersPerTable[order.tableId?._id] || 1}
                      onAdvanceStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
                      onPayOrder={(id, paymentMethod) => payOrderMutation.mutate({ id, paymentMethod })}
                      onCancelOrder={(id) => updateStatusMutation.mutate({ id, status: 'cancelled' })}
                      isAdvancePending={updateStatusMutation.isPending}
                      isPayPending={payOrderMutation.isPending}
                      isCancelPending={updateStatusMutation.isPending}
                    />
                  ))}
                </div>
              )
            )}

            {/* View Content: Active (Grouped) or All Tab */}
            {(activeFilter === 'active' || activeFilter === 'all') && (
              (activeFilter === 'active' ? ['placed', 'accepted', 'preparing', 'ready'] : ['placed', 'accepted', 'preparing', 'ready', 'served', ...(showCancelled ? ['cancelled'] : [])]).map((status) => {
                const sectionOrders = grouped[status] || [];
                if (sectionOrders.length === 0) return null;
                const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.placed;
                const isExpanded = expandedSections[status] !== false;

                return (
                  <section key={status} ref={sectionRefs[status]} className="space-y-2.5" aria-labelledby={`section-${status}`}>
                    <header id={`section-${status}`} className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.accentColor }} />
                        <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
                          {cfg.label}
                        </h2>
                        <span className="text-xs text-ink-muted font-semibold">({sectionOrders.length})</span>
                      </div>
                      {status === 'served' && (
                        <button
                          type="button"
                          onClick={() => toggleSection(status)}
                          className="text-xs text-ink-muted hover:text-ink px-2.5 py-0.5 rounded-full border border-ink/10 bg-white"
                        >
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </button>
                      )}
                    </header>

                    {isExpanded && (
                      <div className="space-y-3">
                        {sectionOrders.map((order) => (
                          <OrderListCard
                            key={order._id}
                            order={order}
                            now={now}
                            highlighted={order._id === highlightedId}
                            tableOrderCount={activeOrdersPerTable[order.tableId?._id] || 1}
                            onAdvanceStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
                            onPayOrder={(id, paymentMethod) => payOrderMutation.mutate({ id, paymentMethod })}
                            onCancelOrder={(id) => updateStatusMutation.mutate({ id, status: 'cancelled' })}
                            isAdvancePending={updateStatusMutation.isPending}
                            isPayPending={payOrderMutation.isPending}
                            isCancelPending={updateStatusMutation.isPending}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })
            )}

            {orders.length === 0 && (
              <p className="text-center text-ink-muted text-sm py-12">No orders recorded yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
