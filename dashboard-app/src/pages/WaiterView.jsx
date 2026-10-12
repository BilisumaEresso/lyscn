import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Utensils, CheckCircle2, Clock, DollarSign, CreditCard,
  PhoneCall, AlertCircle, RefreshCw, Power, UserCheck, ShieldCheck, MapPin, Sparkles,
  QrCode, Copy, Check, Eye, ExternalLink, Building, Info, ChevronRight, Zap
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import socket from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import Currency, { formatBirr } from '../components/ui/Currency';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { playSound } from '../lib/soundEffects';
import { buildCbeDynamicQrPayload } from '../lib/cbeQrGenerator';
import { buildTelebirrDynamicQrPayload } from '../lib/telebirrQrGenerator';

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
  const [copiedKey, setCopiedKey] = useState(null);
  const [presentQrFullScreen, setPresentQrFullScreen] = useState(false);
  const [cbeQrMode, setCbeQrMode] = useState('dynamic'); // 'dynamic' | 'static'
  const [telebirrQrMode, setTelebirrQrMode] = useState('dynamic'); // 'dynamic' | 'static'
  const [verifiedWithEyes, setVerifiedWithEyes] = useState(false);
  const [txnRefInput, setTxnRefInput] = useState('');
  const [now, setNow] = useState(Date.now());

  // Clock ticker for elapsed time
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch restaurant details for active paymentAccounts
  const { data: restaurantData } = useQuery({
    queryKey: ['restaurant-me'],
    queryFn: () => api.get('/restaurants/me').then((r) => r.data),
    staleTime: 60_000,
  });

  const restaurant = restaurantData?.restaurant;
  const paymentAccounts = restaurant?.paymentAccounts || {};

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
      api
        .patch(`/assistance/${id}/${status === 'acknowledged' ? 'acknowledge' : 'resolve'}`)
        .then((r) => r.data),
    onSuccess: (data, { status }) => {
      qc.invalidateQueries({ queryKey: ['assistance'] });
      toast.success(
        status === 'acknowledged'
          ? 'Assistance call acknowledged'
          : 'Assistance call resolved'
      );
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update assistance request');
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
    // Auto-select first active bank or default to telebirr
    if (paymentAccounts.telebirr?.isActive && paymentAccounts.telebirr?.accountNumber) {
      setSelectedPaymentMethod('telebirr');
    } else if (paymentAccounts.cbeBirr?.isActive && paymentAccounts.cbeBirr?.accountNumber) {
      setSelectedPaymentMethod('cbebirr');
    } else if (paymentAccounts.awashBank?.isActive && paymentAccounts.awashBank?.accountNumber) {
      setSelectedPaymentMethod('awash');
    } else {
      setSelectedPaymentMethod('cash');
    }
    setVerifiedWithEyes(false);
    setTxnRefInput('');
    setPresentQrFullScreen(false);
    setCbeQrMode('dynamic');
    setTelebirrQrMode('dynamic');
    setSettleModalOpen(true);
  };

  const copyToClipboard = (text, key, label) => {
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedKey(key);
        toast.success(`Copied ${label}`);
        setTimeout(() => setCopiedKey(null), 2500);
      }).catch(() => {
        toast.success(`Copied ${label}`);
      });
    } else {
      toast.success(`Copied ${label}`);
    }
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
      <header className="px-4 py-2.5 sm:py-3 bg-ink text-white sticky top-0 z-10 shadow-sm border-b border-white/10 lg:pr-24">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl gradient-brand flex items-center justify-center shrink-0">
              <Utensils size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-sm sm:text-base text-white truncate">
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
              onClick={() => {
                refetchOrders();
                toast.success('Refreshing floor status…');
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 transition-colors flex items-center gap-1.5 text-xs"
              title="Refresh Floor Orders"
            >
              <RefreshCw size={15} />
              <span className="hidden sm:inline text-[11px]">Refresh</span>
            </button>
          </div>
        </div>

        {/* Waiter Navigation Tabs */}
        <div className="max-w-xl mx-auto grid grid-cols-3 gap-1.5 mt-2 sm:mt-2.5 bg-white/10 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('ready')}
            className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[36px] ${
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
            className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[36px] ${
              activeTab === 'tables'
                ? 'bg-teal text-white shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <span>Tables & Bills</span>
            {tablesWithOrders.filter((t) => t.hasUnpaid).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-ink">
                {tablesWithOrders.filter((t) => t.hasUnpaid).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calls')}
            className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[36px] ${
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
                  className={`bg-white rounded-2xl p-4 shadow-sm space-y-3 border transition-colors ${
                    item.status === 'acknowledged'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-base text-ink">
                      {item.tableId?.label || 'Table'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.status === 'acknowledged' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          Acknowledged
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                          item.status === 'acknowledged'
                            ? 'bg-ink/5 text-ink-muted border-ink/10'
                            : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                        }`}
                      >
                        {item.type === 'bill' || item.type === 'request_bill'
                          ? 'Bill Requested'
                          : 'Assistance Needed'}
                      </span>
                    </div>
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
                        disabled={assistanceMutation.isPending}
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
                      disabled={assistanceMutation.isPending}
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

      {/* Settle Table Bill Modal — Waiter Assisted Scan & Verify */}
      {selectedTableForSettle && (
        <Modal
          open={settleModalOpen}
          onClose={() => setSettleModalOpen(false)}
          title={`Settle Bill — ${selectedTableForSettle.label}`}
          size="md"
        >
          <div className="space-y-4">
            {/* Bill Summary Strip */}
            <div className="p-3.5 rounded-2xl bg-teal/10 border border-teal/20 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-ink-muted uppercase font-bold tracking-wider block">Total Due</span>
                <span className="text-xs text-ink-muted">
                  {selectedTableForSettle.unpaidCount} unpaid round{selectedTableForSettle.unpaidCount !== 1 ? 's' : ''}
                </span>
              </div>
              <Currency
                value={selectedTableForSettle.unpaidTotal}
                className="font-display font-bold text-2xl text-ink"
              />
            </div>

            {/* Payment Method Selector Tabs */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Payment Channel
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  {
                    id: 'telebirr',
                    label: 'Telebirr',
                    logo: '/banks_logo/telebirr.png',
                    fallback: 'TB',
                    bgColor: 'bg-blue-600',
                    isDigital: true,
                    isConfigured: Boolean(paymentAccounts.telebirr?.isActive && paymentAccounts.telebirr?.accountNumber),
                  },
                  {
                    id: 'cbebirr',
                    label: 'CBE Birr',
                    logo: '/banks_logo/CBE.png',
                    fallback: 'CBE',
                    bgColor: 'bg-purple-700',
                    isDigital: true,
                    isConfigured: Boolean(paymentAccounts.cbeBirr?.isActive && paymentAccounts.cbeBirr?.accountNumber),
                  },
                  {
                    id: 'awash',
                    label: 'Awash',
                    logo: '/banks_logo/awash.png',
                    fallback: 'AW',
                    bgColor: 'bg-blue-800',
                    isDigital: true,
                    isConfigured: Boolean(paymentAccounts.awashBank?.isActive && paymentAccounts.awashBank?.accountNumber),
                  },
                  {
                    id: 'cash',
                    label: 'Cash',
                    icon: DollarSign,
                    color: 'text-emerald-600',
                    isDigital: false,
                    isConfigured: true,
                  },
                  {
                    id: 'pos',
                    label: 'POS Card',
                    icon: CreditCard,
                    color: 'text-indigo-600',
                    isDigital: false,
                    isConfigured: true,
                  },
                  ...(paymentAccounts.otherBank?.isActive && (paymentAccounts.otherBank?.bankName || paymentAccounts.otherBank?.accountNumber) ? [{
                    id: 'other',
                    label: paymentAccounts.otherBank?.bankName || 'Other Bank',
                    fallback: (paymentAccounts.otherBank?.bankName || 'OB').slice(0, 2).toUpperCase(),
                    bgColor: 'bg-amber-600',
                    icon: Building,
                    color: 'text-amber-600',
                    isDigital: true,
                    isConfigured: Boolean(paymentAccounts.otherBank?.accountNumber),
                  }] : []),
                ].map((m) => {
                  const isSelected = selectedPaymentMethod === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedPaymentMethod(m.id);
                        setVerifiedWithEyes(false);
                      }}
                      className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all relative ${
                        isSelected
                          ? 'border-teal bg-teal/10 text-teal font-bold shadow-xs'
                          : 'border-ink/8 text-ink-muted hover:border-ink/20 hover:text-ink'
                      }`}
                    >
                      {m.logo ? (
                        <div className="w-6 h-6 rounded-lg bg-white p-0.5 border border-ink/10 flex items-center justify-center shrink-0 overflow-hidden">
                          <img
                            src={m.logo}
                            alt={m.label}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                          />
                          <span className={`w-full h-full rounded text-white font-bold text-[8px] items-center justify-center hidden ${m.bgColor}`}>
                            {m.fallback}
                          </span>
                        </div>
                      ) : (
                        <Icon size={18} className={m.color} />
                      )}
                      <span className="text-[10px] truncate max-w-full leading-tight">{m.label}</span>
                      {m.isDigital && !m.isConfigured && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1 right-1" title="Account number not set in settings" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── DIGITAL PAYMENT PRESENTATION PANEL (Telebirr, CBE, Awash, Other) ── */}
            {['telebirr', 'cbebirr', 'awash', 'other'].includes(selectedPaymentMethod) && (() => {
              const accountKey = selectedPaymentMethod === 'telebirr'
                ? 'telebirr'
                : selectedPaymentMethod === 'cbebirr'
                ? 'cbeBirr'
                : selectedPaymentMethod === 'awash'
                ? 'awashBank'
                : 'otherBank';
              const bankDetails = paymentAccounts[accountKey] || {};
              const bankName = selectedPaymentMethod === 'telebirr'
                ? 'Telebirr'
                : selectedPaymentMethod === 'cbebirr'
                ? 'Commercial Bank of Ethiopia'
                : selectedPaymentMethod === 'awash'
                ? 'Awash Bank'
                : (bankDetails.bankName || 'Other Bank Transfer');
              const bankLogo = selectedPaymentMethod === 'telebirr'
                ? '/banks_logo/telebirr.png'
                : selectedPaymentMethod === 'cbebirr'
                ? '/banks_logo/CBE.png'
                : selectedPaymentMethod === 'awash'
                ? '/banks_logo/awash.png'
                : null;

              const isConfigured = Boolean(bankDetails.isActive && bankDetails.accountNumber);
              const tableRefRemark = `Table ${selectedTableForSettle.label} Bill #${selectedTableForSettle._id ? String(selectedTableForSettle._id).slice(-4).toUpperCase() : ''}`;

              // Generate dynamic EMVCo CBE QR if CBE is selected
              const cbeDynamicPayload = isConfigured && selectedPaymentMethod === 'cbebirr'
                ? buildCbeDynamicQrPayload({
                    accountNumber: bankDetails.accountNumber,
                    accountName: bankDetails.accountName || restaurant?.name || 'LayoScan Merchant',
                    amount: selectedTableForSettle?.unpaidTotal,
                    reason: `Table ${selectedTableForSettle?.label}`,
                    city: 'Addis Ababa',
                  })
                : '';

              // Generate dynamic EMVCo CPV01 Telebirr QR if Telebirr is selected
              const telebirrDynamicPayload = isConfigured && selectedPaymentMethod === 'telebirr'
                ? buildTelebirrDynamicQrPayload({
                    phone: bankDetails.accountNumber,
                    amount: selectedTableForSettle?.unpaidTotal,
                  })
                : '';

              const isDynamicCbe = selectedPaymentMethod === 'cbebirr' && Boolean(cbeDynamicPayload);
              const showDynamicCbe = isDynamicCbe && (cbeQrMode === 'dynamic' || !bankDetails.qrCodeUrl);

              const isDynamicTelebirr = selectedPaymentMethod === 'telebirr' && Boolean(telebirrDynamicPayload);
              const showDynamicTelebirr = isDynamicTelebirr && (telebirrQrMode === 'dynamic' || !bankDetails.qrCodeUrl);

              const isAnyDynamic = showDynamicCbe || showDynamicTelebirr;
              const activeDynamicPayload = showDynamicCbe ? cbeDynamicPayload : telebirrDynamicPayload;
              const activeDynamicLogo = showDynamicCbe ? '/banks_logo/CBE.png' : '/banks_logo/telebirr.png';
              const activeDynamicBorder = showDynamicCbe ? 'border-purple-200/80' : 'border-blue-200/80';
              const activeDynamicBadgeBg = showDynamicCbe ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-blue-50 border-blue-200 text-blue-900';
              const activeDynamicIconColor = showDynamicCbe ? 'text-purple-600' : 'text-blue-600';
              const activeDynamicScanMsg = showDynamicCbe
                ? 'Hold phone towards guest to scan with CBE Mobile Banking / CBE Birr'
                : 'Hold phone towards guest to scan with Telebirr App';

              return (
                <div className="p-3.5 rounded-2xl bg-paper border border-ink/8 space-y-3 animate-fade-in">
                  {isConfigured ? (
                    <>
                      {/* Bank Identification Strip */}
                      <div className="flex items-center justify-between border-b border-ink/6 pb-2.5">
                        <div className="flex items-center gap-2">
                          <img src={bankLogo} alt={bankName} className="w-7 h-7 object-contain rounded-lg bg-white p-0.5 border border-ink/10 shadow-2xs" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-display font-bold text-xs text-ink leading-tight">{bankName}</p>
                              {selectedPaymentMethod === 'cbebirr' && isDynamicCbe && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                  <Zap size={9} className="text-purple-600 fill-purple-600" />
                                  <span>Dynamic</span>
                                </span>
                              )}
                              {selectedPaymentMethod === 'telebirr' && isDynamicTelebirr && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                  <Zap size={9} className="text-blue-600 fill-blue-600" />
                                  <span>Dynamic</span>
                                </span>
                              )}
                            </div>
                            {bankDetails.accountName && (
                              <p className="text-[11px] text-ink-muted leading-tight">{bankDetails.accountName}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Toggle between Dynamic and Static QR if merchant has uploaded an image */}
                          {isDynamicCbe && bankDetails.qrCodeUrl && (
                            <div className="flex items-center bg-ink/5 p-0.5 rounded-lg text-[10px] font-semibold">
                              <button
                                type="button"
                                onClick={() => setCbeQrMode('dynamic')}
                                className={`px-2 py-0.5 rounded transition-all ${
                                  showDynamicCbe ? 'bg-white shadow-2xs text-purple-700 font-bold' : 'text-ink-muted hover:text-ink'
                                }`}
                              >
                                Dynamic
                              </button>
                              <button
                                type="button"
                                onClick={() => setCbeQrMode('static')}
                                className={`px-2 py-0.5 rounded transition-all ${
                                  !showDynamicCbe ? 'bg-white shadow-2xs text-ink font-bold' : 'text-ink-muted hover:text-ink'
                                }`}
                              >
                                Static
                              </button>
                            </div>
                          )}

                          {isDynamicTelebirr && bankDetails.qrCodeUrl && (
                            <div className="flex items-center bg-ink/5 p-0.5 rounded-lg text-[10px] font-semibold">
                              <button
                                type="button"
                                onClick={() => setTelebirrQrMode('dynamic')}
                                className={`px-2 py-0.5 rounded transition-all ${
                                  showDynamicTelebirr ? 'bg-white shadow-2xs text-blue-700 font-bold' : 'text-ink-muted hover:text-ink'
                                }`}
                              >
                                Dynamic
                              </button>
                              <button
                                type="button"
                                onClick={() => setTelebirrQrMode('static')}
                                className={`px-2 py-0.5 rounded transition-all ${
                                  !showDynamicTelebirr ? 'bg-white shadow-2xs text-ink font-bold' : 'text-ink-muted hover:text-ink'
                                }`}
                              >
                                Static
                              </button>
                            </div>
                          )}

                          {(isAnyDynamic || bankDetails.qrCodeUrl) && (
                            <button
                              type="button"
                              onClick={() => setPresentQrFullScreen(!presentQrFullScreen)}
                              className="px-2 py-1 rounded-lg bg-white border border-ink/10 text-xs font-semibold text-ink flex items-center gap-1 hover:bg-ink/5 shadow-2xs"
                            >
                              <QrCode size={13} />
                              <span>{presentQrFullScreen ? 'Compact' : 'Expand QR'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Waiter Presentation Zone: QR Code for Diner to Scan from Waiter Screen */}
                      <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-ink/6 shadow-inner text-center">
                        {isAnyDynamic ? (
                          <div className={`transition-all duration-200 flex flex-col items-center ${presentQrFullScreen ? 'p-3 bg-white rounded-2xl shadow-lg border-2 border-primary' : ''}`}>
                            <div className={`p-2.5 bg-white rounded-xl border ${activeDynamicBorder} shadow-xs inline-block`}>
                              <QRCodeSVG
                                value={activeDynamicPayload}
                                size={presentQrFullScreen ? 230 : 150}
                                level="H"
                                includeMargin={true}
                                imageSettings={{
                                  src: activeDynamicLogo,
                                  height: presentQrFullScreen ? 32 : 24,
                                  width: presentQrFullScreen ? 32 : 24,
                                  excavate: true,
                                }}
                              />
                            </div>
                            <div className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${activeDynamicBadgeBg}`}>
                              <Sparkles size={12} className={`${activeDynamicIconColor} shrink-0`} />
                              <span>
                                Prefilled: <b>Br {Number(selectedTableForSettle.unpaidTotal || 0).toLocaleString()}</b>
                                {showDynamicCbe ? <> & <b>{tableRefRemark}</b></> : ''}
                              </span>
                            </div>
                            <p className="text-[11px] font-medium text-ink-muted mt-1">
                              {activeDynamicScanMsg}
                            </p>
                          </div>
                        ) : bankDetails.qrCodeUrl ? (
                          <div className={`transition-all duration-200 ${presentQrFullScreen ? 'p-3 bg-white rounded-2xl shadow-lg border-2 border-primary' : ''}`}>
                            <img
                              src={bankDetails.qrCodeUrl}
                              alt={`${bankName} QR`}
                              className={`object-contain rounded-lg mx-auto ${presentQrFullScreen ? 'w-56 h-56' : 'w-32 h-32'}`}
                            />
                            <p className="text-[11px] font-semibold text-primary mt-1.5 flex items-center justify-center gap-1">
                              <span>Hold phone towards guest to scan</span>
                            </p>
                          </div>
                        ) : (
                          <div className="py-2 space-y-1">
                            <span className="text-xs text-ink-muted">No QR image uploaded for {bankName}</span>
                            <p className="text-[11px] text-ink-muted">Guest can transfer directly to the account number below</p>
                          </div>
                        )}

                        {/* Account Number & 1-Tap Copy */}
                        <div className="mt-2.5 w-full flex items-center justify-between bg-paper p-2 rounded-xl border border-ink/6">
                          <div className="text-left min-w-0 pr-2">
                            <span className="text-[9px] uppercase tracking-wider text-ink-muted font-bold block">Account / Phone</span>
                            <span className="font-mono font-bold text-xs sm:text-sm text-ink truncate block">
                              {bankDetails.accountNumber}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(bankDetails.accountNumber, 'account', 'account number')}
                            className="px-2.5 py-1 rounded-lg bg-white border border-ink/12 text-xs font-semibold text-ink flex items-center gap-1 hover:bg-ink/5 shadow-2xs shrink-0"
                          >
                            {copiedKey === 'account' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            <span>{copiedKey === 'account' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Reference Helper */}
                      <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-ink/6">
                        <span className="text-ink-muted font-medium">Payment Remark: <b className="text-ink">{tableRefRemark}</b></span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(tableRefRemark, 'remark', 'remark')}
                          className="text-primary hover:underline font-semibold flex items-center gap-0.5"
                        >
                          {copiedKey === 'remark' ? <Check size={11} /> : <Copy size={11} />}
                          <span>Copy</span>
                        </button>
                      </div>

                      {/* ── Eye Verification Step Checklist ── */}
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-2">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={verifiedWithEyes}
                            onChange={(e) => setVerifiedWithEyes(e.target.checked)}
                            className="w-4 h-4 rounded text-teal focus:ring-teal mt-0.5 shrink-0"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-amber-950 flex items-center gap-1">
                              <Eye size={13} className="text-amber-700" />
                              <span>Verified with my own eyes</span>
                            </span>
                            <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                              I inspected the customer's phone transfer screen/SMS confirming <b><Currency value={selectedTableForSettle.unpaidTotal} /></b> was transferred to <b>{bankDetails.accountName || restaurant?.name}</b>.
                            </p>
                          </div>
                        </label>

                        {/* Optional Transaction reference code input */}
                        <div className="pt-1 border-t border-amber-200/60 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Optional: Enter TXN / SMS Ref code"
                            value={txnRefInput}
                            onChange={(e) => setTxnRefInput(e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-amber-300/80 bg-white placeholder-ink/30 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 text-center space-y-1.5">
                      <p className="text-xs font-semibold text-ink">No {bankName} Account Configured</p>
                      <p className="text-[11px] text-ink-muted">
                        The manager or owner has not set up the {bankName} account details in Settings.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── PHYSICAL CASH & POS CONFIRMATION PANEL ── */}
            {selectedPaymentMethod === 'cash' && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <DollarSign size={14} className="text-emerald-700" />
                  <span>Cash Payment Collection</span>
                </p>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  Please collect <b><Currency value={selectedTableForSettle.unpaidTotal} /></b> in cash and provide change if needed before marking settled.
                </p>
              </div>
            )}

            {selectedPaymentMethod === 'pos' && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 text-xs text-indigo-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CreditCard size={14} className="text-indigo-700" />
                  <span>POS Terminal Payment</span>
                </p>
                <p className="text-[11px] text-indigo-800 leading-snug">
                  Charge the customer's card on the physical terminal and verify the printed slip matches <b><Currency value={selectedTableForSettle.unpaidTotal} /></b>.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-ink/6">
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
                disabled={
                  ['telebirr', 'cbebirr', 'awash'].includes(selectedPaymentMethod) && !verifiedWithEyes
                }
                className="flex-1 bg-teal hover:bg-teal/90 text-white font-semibold disabled:opacity-40"
              >
                {['telebirr', 'cbebirr', 'awash'].includes(selectedPaymentMethod)
                  ? (verifiedWithEyes ? 'Confirm Verified & Settle' : 'Verify Screen First')
                  : 'Confirm Settle'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
