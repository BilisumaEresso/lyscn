import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChefHat, Coffee, Utensils, Clock, CheckCircle2, Flame,
  Volume2, VolumeX, Maximize2, Minimize2, AlertTriangle, MessageSquare, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import socket from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { playSound } from '../lib/soundEffects';

function getElapsedMinutes(date, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));
}

function formatElapsed(date, now = Date.now()) {
  const secs = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000));
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
}

export default function KDS() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [stationFilter, setStationFilter] = useState(user?.station || 'all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Ticker for timers
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch orders
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders-kds'],
    queryFn: () => api.get('/orders').then((r) => r.data),
    refetchInterval: 15_000,
  });

  const orders = data?.orders || [];

  // Filter orders for KDS: only 'accepted' and 'preparing'
  const activeKdsOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'accepted' || o.status === 'preparing');
  }, [orders]);

  // Real-time socket listener for incoming accepted orders
  useEffect(() => {
    const handleOrderUpdate = (updatedOrder) => {
      qc.invalidateQueries({ queryKey: ['orders-kds'] });
      qc.invalidateQueries({ queryKey: ['orders-kanban'] });

      if (updatedOrder.status === 'accepted' && soundEnabled) {
        playSound('notification');
        toast(`New order accepted for ${updatedOrder.tableId?.label || 'Table'}!`, {
          icon: '🍳',
        });
      }
    };

    socket.on('order:created', handleOrderUpdate);
    socket.on('order:updated', handleOrderUpdate);

    return () => {
      socket.off('order:created', handleOrderUpdate);
      socket.off('order:updated', handleOrderUpdate);
    };
  }, [qc, soundEnabled]);

  // Status advance mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['orders-kds'] });
      qc.invalidateQueries({ queryKey: ['orders-kanban'] });

      if (res.order.status === 'ready') {
        if (soundEnabled) playSound('success');
        toast.success(`Order ready for ${res.order.tableId?.label || 'Table'}! Assigned to floor waiter.`);
      } else {
        toast.success(`Order marked as ${res.order.status}`);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    },
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const acceptedOrders = activeKdsOrders.filter((o) => o.status === 'accepted');
  const preparingOrders = activeKdsOrders.filter((o) => o.status === 'preparing');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top KDS Control Header */}
      <header className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <ChefHat size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-lg text-white">Kitchen Display System</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {activeKdsOrders.length} active ticket{activeKdsOrders.length !== 1 ? 's' : ''} in queue
            </p>
          </div>
        </div>

        {/* Station Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          {[
            { id: 'all', label: 'All Orders', icon: Utensils },
            { id: 'kitchen', label: 'Food Station', icon: Flame },
            { id: 'bar', label: 'Barista & Drinks', icon: Coffee },
          ].map((st) => {
            const Icon = st.icon;
            const isActive = stationFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setStationFilter(st.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon size={14} />
                {st.label}
              </button>
            );
          })}
        </div>

        {/* Control Tools: Sound & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            className={`p-2 rounded-xl border transition-colors ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-amber-400'
                : 'bg-slate-800/50 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Mute Kitchen Chimes' : 'Enable Kitchen Chimes'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh Tickets"
          >
            <RefreshCw size={18} />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </header>

      {/* Main KDS Board: 2-stage prep flow */}
      <main className="flex-1 p-5 overflow-x-auto">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-slate-400">
            Loading kitchen queue…
          </div>
        ) : activeKdsOrders.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="font-display font-semibold text-lg text-slate-300">Kitchen Queue Clear</h2>
            <p className="text-sm text-slate-500 max-w-sm mt-1">
              All accepted orders have been prepared and dispatched to the floor team. New tickets will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeKdsOrders.map((order) => {
              const elapsedMins = getElapsedMinutes(order.createdAt, now);
              const isPreparing = order.status === 'preparing';

              // Visual Escalation by prep time
              let timerStyle = 'bg-slate-800 text-slate-300 border-slate-700';
              if (elapsedMins >= 15) {
                timerStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
              } else if (elapsedMins >= 8) {
                timerStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
              }

              return (
                <div
                  key={order._id}
                  className={`rounded-2xl border flex flex-col overflow-hidden transition-all shadow-md ${
                    isPreparing
                      ? 'bg-slate-900/90 border-teal-500/50 ring-1 ring-teal-500/30'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className={`px-4 py-3 border-b flex items-center justify-between ${
                      isPreparing
                        ? 'bg-teal-500/10 border-teal-500/30'
                        : 'bg-slate-800/60 border-slate-800'
                    }`}
                  >
                    <div>
                      <span className="font-display font-bold text-lg text-white">
                        {order.tableId?.label || 'Takeaway'}
                      </span>
                      {order.guestName && (
                        <p className="text-xs text-slate-400 font-medium">{order.guestName}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono border ${timerStyle}`}>
                        <Clock size={11} /> {formatElapsed(order.createdAt, now)}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
                        {order.status}
                      </p>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-96 divide-y divide-slate-800/60">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="pt-2 first:pt-0">
                        <div className="flex items-start gap-2.5">
                          <span className="font-mono font-bold text-base text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20 shrink-0">
                            {item.qty}×
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-white leading-snug">
                              {item.name}
                            </p>

                            {/* Ethiopian Dining Specifications */}
                            {item.selectedSpecs?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {item.selectedSpecs.map((spec, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30"
                                  >
                                    {spec.optionName}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Quick Tags (Fasting, Hot, etc.) */}
                            {item.quickTags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.quickTags.map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Preparation Notes */}
                            {item.itemNotes && (
                              <div className="mt-1.5 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-1">
                                <MessageSquare size={12} className="shrink-0 mt-0.5 text-amber-400" />
                                <span>"{item.itemNotes}"</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Big Touch Action Footer */}
                  <div className="p-3 bg-slate-950/60 border-t border-slate-800">
                    {order.status === 'accepted' ? (
                      <button
                        type="button"
                        onClick={() =>
                          statusMutation.mutate({ id: order._id, status: 'preparing' })
                        }
                        disabled={statusMutation.isPending}
                        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Flame size={18} />
                        Start Preparing
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          statusMutation.mutate({ id: order._id, status: 'ready' })
                        }
                        disabled={statusMutation.isPending}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        Ready for Pickup
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
