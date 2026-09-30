import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Utensils, CheckCircle2, Clock, DollarSign, CreditCard,
  PhoneCall, AlertCircle, RefreshCw, Power, UserCheck, ShieldCheck, MapPin, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import socket from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import Currency, { formatBirr } from '../components/ui/Currency';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { playSound } from '../lib/soundEffects';

function timeAgo(date, now = Date.now()) {
  const secs = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ago`;
}

export default function WaiterView() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState('ready'); // 'ready' | 'tables' | 'calls'
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedTableForSettle, setSelectedTableForSettle] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('telebirr');
  const [now, setNow] = useState(Date.now());

  // Clock ticker for elapsed time
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch orders
  const { data: ordersData, refetch: refetchOrders } = useQuery({
    queryKey: ['orders-kanban'],
    queryFn: () => api.get('/orders').then((r) => r.data),
    refetchInterval: 15_000,
  });

  // Fetch assistance requests
  const { data: assistanceData } = useQuery({
    queryKey: ['assistance'],
    queryFn: () => api.get('/assistance').then((r) => r.data),
    refetchInterval: 15_000,
  });

  // Fetch tables
  const { data: tablesData } = useQuery({
    queryKey: ['tables'],
    queryFn: () => api.get('/tables').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const orders = ordersData?.orders || [];
  const assistance = assistanceData?.assistance || [];
  const tables = tablesData?.tables || [];

  // Real-time notifications for waiters
  useEffect(() => {
    const handleReady = (readyOrder) => {
      qc.invalidateQueries({ queryKey: ['orders-kanban'] });
      playSound('notification');
      toast(`Order for ${readyOrder.tableId?.label || 'Table'} is READY for pickup!`, {
        icon: '🔔',
        duration: 5000,
      });
    };

    socket.on('order:readyForPickup', handleReady);
    socket.on('order:assigned', handleReady);

    return () => {
      socket.off('order:readyForPickup', handleReady);
      socket.off('order:assigned', handleReady);
    };
  }, [qc]);

  // Mark Served Mutation
  const serveMutation = useMutation({
    mutationFn: (orderId) =>
      api.patch(`/orders/${orderId}/status`, { status: 'served' }).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['orders-kanban'] });
      playSound('success');
      toast.success(`Served to ${res.order.tableId?.label || 'Table'}!`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update order');
    },
  });

  // Claim Order Mutation
  const claimMutation = useMutation({
    mutationFn: (orderId) =>
      api.patch(`/orders/${orderId}/assign`, {}).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['orders-kanban'] });
      toast.success(`You claimed the order for ${res.order.tableId?.label || 'Table'}!`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to claim order');
    },
  });

  // Table Payment Settlement Mutation
  const settleMutation = useMutation({
    mutationFn: ({ tableId, paymentMethod }) =>
      api.patch(`/orders/table/${tableId}/payment`, { paymentMethod }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders-kanban'] });
      setSettleModalOpen(false);
      playSound('success');
      toast.success('Table bill settled successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to settle table bill');
    },
  });

  // Assistance status mutation
  const assistanceMutation = useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/assistance/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistance'] });
      toast.success('Assistance request updated');
    },
  });

  // Filter Ready Orders
  const readyOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'ready');
  }, [orders]);

  // Active Pending Assistance calls
  const pendingCalls = useMemo(() => {
    return assistance.filter((a) => a.status === 'pending' || a.status === 'acknowledged');
  }, [assistance]);

  // Table summary for billing
  const tablesWithOrders = useMemo(() => {
    return tables.map((t) => {
      const tableOrders = orders.filter(
        (o) => (o.tableId?._id || o.tableId) === t._id && o.status !== 'cancelled'
      );
      const unpaidOrders = tableOrders.filter((o) => o.paymentStatus === 'unpaid');
      const unpaidTotal = unpaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const isAssignedToCurrentWaiter = (user?.assignedTables || []).some(
        (at) => (at._id || at) === t._id
      );

      return {
        ...t,
        orderCount: tableOrders.length,
        unpaidCount: unpaidOrders.length,
        unpaidTotal,
        hasUnpaid: unpaidOrders.length > 0,
        isAssignedToCurrentWaiter,
      };
    });
  }, [tables, orders, user?.assignedTables]);

  const handleOpenSettle = (tableItem) => {
    setSelectedTableForSettle(tableItem);
    setSelectedPaymentMethod('telebirr');
    setSettleModalOpen(true);
  };

  const handleConfirmSettle = () => {
    if (!selectedTableForSettle) return;
    settleMutation.mutate({
      tableId: selectedTableForSettle._id,
      paymentMethod: selectedPaymentMethod,
    });
  };

  return (
    <div className="min-h-screen bg-paper pb-20">
      {/* Top Waiter Floor Header */}
      <header className="px-4 py-3.5 bg-ink text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shrink-0">
              <Utensils size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-base text-white truncate">
                Floor Service
              </h1>
              <p className="text-[11px] text-white/60 truncate">
                Signed in as <span className="text-white font-medium">{user?.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => refetchOrders()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 transition-colors"
              title="Refresh Floor Orders"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Waiter Navigation Tabs */}
        <div className="max-w-xl mx-auto grid grid-cols-3 gap-1.5 mt-3 bg-white/10 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('ready')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ready'
                ? 'bg-teal text-white shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <span>Ready</span>
            {readyOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-teal">
                {readyOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'tables'
                ? 'bg-teal text-white shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <span>Tables & Bills</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calls')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'calls'
                ? 'bg-teal text-white shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <span>Calls</span>
            {pendingCalls.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                {pendingCalls.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-xl mx-auto px-4 py-4 space-y-3.5">
        {/* TAB 1: READY FOR SERVICE */}
        {activeTab === 'ready' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-ink-muted px-1">
              <span>Ready for table delivery</span>
              <span>{readyOrders.length} tickets</span>
            </div>

            {readyOrders.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-ink/8 shadow-xs space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <p className="font-semibold text-ink text-sm">No Orders Waiting at Pass</p>
                <p className="text-xs text-ink-muted">
                  When the kitchen or barista marks an order ready, it will ring here for immediate table delivery.
                </p>
              </div>
            ) : (
              readyOrders.map((order) => {
                const isAssignedToMe = order.assignedWaiterId === user?.userId;
                return (
                  <div
                    key={order._id}
                    className={`bg-white rounded-2xl border p-4 shadow-sm space-y-3 transition-all ${
                      isAssignedToMe
                        ? 'border-teal ring-2 ring-teal/20'
                        : 'border-ink/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-lg text-ink">
                          {order.tableId?.label || 'Takeaway'}
                        </span>
                        {order.guestName && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-ink/5 text-ink-muted">
                            {order.guestName}
                          </span>
                        )}
                      </div>

                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200 flex items-center gap-1">
                        <Clock size={11} /> {timeAgo(order.createdAt, now)}
                      </span>
                    </div>

                    {/* Waiter assignment badge */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-ink/6">
                      <span className="text-ink-muted">Assigned Server:</span>
                      {order.assignedWaiterName ? (
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-md ${
                            isAssignedToMe
                              ? 'bg-teal/10 text-teal'
                              : 'bg-ink/6 text-ink'
                          }`}
                        >
                          {isAssignedToMe ? '★ Assigned to You' : order.assignedWaiterName}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">Unassigned (Open Claim)</span>
                      )}
                    </div>

                    {/* Order items summary */}
                    <div className="bg-paper rounded-xl p-3 space-y-1.5 text-xs divide-y divide-ink/6">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="pt-1.5 first:pt-0">
                          <div className="flex justify-between font-medium text-ink">
                            <span>
                              {it.qty}× {it.name}
                            </span>
                          </div>
                          {it.selectedSpecs?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {it.selectedSpecs.map((s, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold"
                                >
                                  {s.optionName}
                                </span>
                              ))}
                            </div>
                          )}
                          {it.itemNotes && (
                            <p className="text-[11px] text-amber-900 italic mt-0.5">
                              Note: "{it.itemNotes}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      {!isAssignedToMe && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => claimMutation.mutate(order._id)}
                          loading={claimMutation.isPending}
                          className="flex-1"
                        >
                          Claim Order
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => serveMutation.mutate(order._id)}
                        loading={serveMutation.isPending}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={16} />
                        Mark Served to Table
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE TABLES & BILL SETTLEMENT */}
        {activeTab === 'tables' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-ink-muted px-1">
              <span>Tables with unpaid rounds</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tablesWithOrders
                .filter((t) => t.hasUnpaid)
                .map((tableItem) => (
                  <div
                    key={tableItem._id}
                    className="bg-white rounded-2xl border border-ink/8 p-4 shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display font-bold text-lg text-ink">
                          {tableItem.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                          {tableItem.unpaidCount} unpaid round{tableItem.unpaidCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-xs text-ink-muted">
                        Total Due:{' '}
                        <Currency
                          value={tableItem.unpaidTotal}
                          className="font-bold text-ink text-sm"
                        />
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleOpenSettle(tableItem)}
                      className="w-full flex items-center justify-center gap-1.5 bg-teal hover:bg-teal/90 text-white"
                    >
                      <DollarSign size={15} />
                      Collect Bill & Settle
                    </Button>
                  </div>
                ))}
            </div>

            {tablesWithOrders.filter((t) => t.hasUnpaid).length === 0 && (
              <div className="p-8 text-center bg-white rounded-2xl border border-ink/8 shadow-xs space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <p className="font-semibold text-ink text-sm">All Table Bills Settled</p>
                <p className="text-xs text-ink-muted">No open unpaid orders at any table.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GUEST ASSISTANCE CALLS */}
        {activeTab === 'calls' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-ink-muted px-1">
              <span>Guest Table Calls</span>
              <span>{pendingCalls.length} requests</span>
            </div>

            {pendingCalls.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-ink/8 shadow-xs space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <p className="font-semibold text-ink text-sm">No Pending Assistance Calls</p>
                <p className="text-xs text-ink-muted">
                  Guests calling a waiter or requesting the bill will pop up here instantly.
                </p>
              </div>
            ) : (
              pendingCalls.map((item) => (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl border border-rose-200 p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-base text-ink">
                      {item.tableId?.label || 'Table'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200 animate-pulse">
                      {item.type === 'bill' ? 'Bill Requested' : 'Assistance Needed'}
                    </span>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-ink-muted bg-paper p-2 rounded-lg">
                      "{item.notes}"
                    </p>
                  )}

                  <div className="flex gap-2">
                    {item.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          assistanceMutation.mutate({ id: item._id, status: 'acknowledged' })
                        }
                        className="flex-1"
                      >
                        Acknowledge
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() =>
                        assistanceMutation.mutate({ id: item._id, status: 'resolved' })
                      }
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Resolve Call
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Settle Table Bill Modal */}
      {selectedTableForSettle && (
        <Modal
          open={settleModalOpen}
          onClose={() => setSettleModalOpen(false)}
          title={`Settle Bill — ${selectedTableForSettle.label}`}
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-teal/10 border border-teal/20 text-center space-y-1">
              <span className="text-xs text-ink-muted font-medium">Total Balance to Collect</span>
              <Currency
                value={selectedTableForSettle.unpaidTotal}
                className="font-display font-bold text-2xl text-ink block"
              />
              <span className="text-[11px] text-ink-muted block">
                Settles all {selectedTableForSettle.unpaidCount} unpaid rounds for this table
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Select Customer Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'telebirr', label: 'Telebirr', icon: Sparkles, color: 'text-blue-500' },
                  { id: 'cbebirr', label: 'CBE Birr', icon: Sparkles, color: 'text-purple-500' },
                  { id: 'cash', label: 'Cash Birr', icon: DollarSign, color: 'text-emerald-500' },
                  { id: 'pos', label: 'POS Card', icon: CreditCard, color: 'text-indigo-500' },
                ].map(({ id, label, icon: Icon, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(id)}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                      selectedPaymentMethod === id
                        ? 'border-teal bg-teal/10 text-teal font-semibold shadow-xs'
                        : 'border-ink/8 text-ink-muted hover:border-ink/20 hover:text-ink'
                    }`}
                  >
                    <Icon size={18} className={color} />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettleModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmSettle}
                loading={settleMutation.isPending}
                className="flex-1 bg-teal hover:bg-teal/90 text-white font-semibold"
              >
                Confirm Settle
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
