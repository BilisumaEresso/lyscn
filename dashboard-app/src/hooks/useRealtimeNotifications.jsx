import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import socket from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import {
  initAudioUnlock,
  playOrderChime,
  playAssistanceBeep,
  playFoodReadyFanfare,
  playTableOccupiedTone,
  playTableClearTone,
  playOrderCancelledTone,
} from '../lib/soundEffects';

/**
 * Global Real-Time Notification Coordinator
 * Single listener mounted at the AppShell level to ensure no events are dropped
 * regardless of which page the user is currently browsing.
 */
export function useRealtimeNotifications() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = user?.role || 'owner';

  const {
    soundEnabled,
    soundVolume,
    eventSounds,
    desktopNotificationsEnabled,
    addNotification,
  } = useNotificationStore();

  const prevTableStatusRef = useRef(new Map());

  // Unlock Web Audio on first user interaction
  useEffect(() => {
    initAudioUnlock();
  }, []);

  // Helper for background desktop notification
  const triggerDesktopNotification = (title, body, url = '/') => {
    if (
      desktopNotificationsEnabled &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      document.visibilityState === 'hidden'
    ) {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
        notif.onclick = () => {
          window.focus();
          navigate(url);
        };
      } catch {
        // Fallback silently if platform restricts Web Notifications
      }
    }
  };

  useEffect(() => {
    socket.connect();

    // ── 1. Order Placed ───────────────────────────────────────────────────────
    const handleOrderCreated = (order) => {
      // Invalidate relevant queries
      qc.invalidateQueries({ queryKey: ['orders-kanban'] });
      qc.invalidateQueries({ queryKey: ['orders-today'] });
      qc.invalidateQueries({ queryKey: ['orders-unpaid'] });

      const tableLabel = order.tableId?.label || 'Takeaway';
      const itemCount = order.items?.reduce((acc, i) => acc + (i.qty || 1), 0) || order.items?.length || 0;
      const totalAmount = order.totalAmount ? `${order.totalAmount} ETB` : '';
      const summary = `${itemCount} item${itemCount === 1 ? '' : 's'}${totalAmount ? ` • ${totalAmount}` : ''}`;

      // Notification entry
      addNotification({
        id: `order_created_${order._id}`,
        category: 'orders',
        type: 'order_created',
        title: `New Order — ${tableLabel}`,
        message: summary,
        data: { orderId: order._id, tableId: order.tableId?._id || order.tableId },
      });

      // Role filter for audio: kitchen, manager, owner, waiter
      if (soundEnabled && eventSounds.order_created) {
        playOrderChime(soundVolume);
      }

      // Visual Toast
      toast.custom(
        (t) => (
          <div
            className={`max-w-md w-full bg-white shadow-xl rounded-xl border border-amber-300 pointer-events-auto flex items-center justify-between p-3.5 transition-all ${
              t.visible ? 'animate-card-slide-in opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            style={{ borderLeftWidth: '5px', borderLeftColor: '#F59E0B' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">🔔</span>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-ink truncate">
                  New Order • {tableLabel}
                </p>
                <p className="text-xs text-ink-muted truncate">{summary}</p>
              </div>
            </div>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/orders');
              }}
              className="ml-3 shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              View
            </button>
          </div>
        ),
        { duration: 5500, id: `toast_order_${order._id}` }
      );

      triggerDesktopNotification(`New Order: ${tableLabel}`, summary, '/orders');
    };

    // ── 2. Order Updated (Status changes / cancellations) ─────────────────────
    const handleOrderUpdated = (order) => {
      qc.invalidateQueries({ queryKey: ['orders-kanban'] });
      qc.invalidateQueries({ queryKey: ['orders-today'] });
      qc.invalidateQueries({ queryKey: ['orders-unpaid'] });

      const tableLabel = order.tableId?.label || 'Takeaway';

      // Case A: Food ready for pickup
      if (order.status === 'ready') {
        addNotification({
          id: `order_ready_${order._id}`,
          category: 'orders',
          type: 'order_ready',
          title: `Food Ready — ${tableLabel}`,
          message: 'Order is ready for pickup & delivery to table.',
          data: { orderId: order._id, tableId: order.tableId?._id || order.tableId },
        });

        // Waiter, Manager, Owner care about pickup
        if (role !== 'kitchen' && soundEnabled && eventSounds.order_ready) {
          playFoodReadyFanfare(soundVolume);
        }

        toast.custom(
          (t) => (
            <div
              className={`max-w-md w-full bg-white shadow-xl rounded-xl border border-emerald-300 pointer-events-auto flex items-center justify-between p-3.5 transition-all ${
                t.visible ? 'animate-card-slide-in opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              style={{ borderLeftWidth: '5px', borderLeftColor: '#10B981' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl shrink-0">🍽️</span>
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-ink truncate">
                    Ready for Pickup • {tableLabel}
                  </p>
                  <p className="text-xs text-ink-muted truncate">Food is ready to serve</p>
                </div>
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate('/orders');
                }}
                className="ml-3 shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                View
              </button>
            </div>
          ),
          { duration: 5500, id: `toast_ready_${order._id}` }
        );

        triggerDesktopNotification(`Food Ready: ${tableLabel}`, 'Order is ready for delivery', '/orders');
      }

      // Case B: Order cancelled
      if (order.status === 'cancelled') {
        addNotification({
          id: `order_cancelled_${order._id}`,
          category: 'orders',
          type: 'order_cancelled',
          title: `Order Cancelled — ${tableLabel}`,
          message: 'An active order was cancelled.',
          data: { orderId: order._id },
        });

        if (soundEnabled && eventSounds.order_cancelled) {
          playOrderCancelledTone(soundVolume);
        }

        toast.error(`Order cancelled — ${tableLabel}`, { duration: 4000 });
      }
    };

    // ── 3. Table Updated (Occupied / Released) ─────────────────────────────────
    const handleTableUpdated = (table) => {
      qc.invalidateQueries({ queryKey: ['tables'] });

      const prevStatus = prevTableStatusRef.current.get(table._id);
      prevTableStatusRef.current.set(table._id, table.status);

      // Trigger occupancy alert when table transitions from available -> occupied
      if (table.status === 'occupied' && prevStatus !== 'occupied') {
        const tableLabel = table.label || 'Table';

        addNotification({
          id: `table_occupied_${table._id}_${Date.now()}`,
          category: 'tables',
          type: 'table_occupied',
          title: `Table Occupied — ${tableLabel}`,
          message: 'Guest scanned QR code and started a table session.',
          data: { tableId: table._id },
        });

        // Waiter, Manager, Owner
        if (role !== 'kitchen' && soundEnabled && eventSounds.table_occupied) {
          playTableOccupiedTone(soundVolume);
        }

        toast.custom(
          (t) => (
            <div
              className={`max-w-md w-full bg-white shadow-xl rounded-xl border border-blue-300 pointer-events-auto flex items-center justify-between p-3.5 transition-all ${
                t.visible ? 'animate-card-slide-in opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              style={{ borderLeftWidth: '5px', borderLeftColor: '#3B82F6' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl shrink-0">👋</span>
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm text-ink truncate">
                    {tableLabel} is now occupied
                  </p>
                  <p className="text-xs text-ink-muted truncate">Guest scanned QR code</p>
                </div>
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate('/tables');
                }}
                className="ml-3 shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Tables
              </button>
            </div>
          ),
          { duration: 4500, id: `toast_table_${table._id}` }
        );

        triggerDesktopNotification(`Table Occupied: ${tableLabel}`, 'Guest scanned QR code', '/tables');
      }
    };

    // ── 4. Table Ready to Clear ───────────────────────────────────────────────
    const handleReadyToClear = ({ tableId }) => {
      qc.invalidateQueries({ queryKey: ['tables'] });

      // Fetch or look up table label
      const tablesCache = qc.getQueryData(['tables']);
      const targetTable = tablesCache?.tables?.find((t) => String(t._id) === String(tableId));
      const tableLabel = targetTable?.label || 'Table';

      addNotification({
        id: `table_clear_${tableId}_${Date.now()}`,
        category: 'tables',
        type: 'table_ready_to_clear',
        title: `Ready to Clear — ${tableLabel}`,
        message: 'All dishes served and paid. Table is ready for bussing and reset.',
        data: { tableId },
      });

      if (role !== 'kitchen' && soundEnabled && eventSounds.table_ready_to_clear) {
        playTableClearTone(soundVolume);
      }

      toast.custom(
        (t) => (
          <div
            className={`max-w-md w-full bg-white shadow-xl rounded-xl border border-teal-300 pointer-events-auto flex items-center justify-between p-3.5 transition-all ${
              t.visible ? 'animate-card-slide-in opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            style={{ borderLeftWidth: '5px', borderLeftColor: '#14B8A6' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">✨</span>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-ink truncate">
                  Ready to Clear • {tableLabel}
                </p>
                <p className="text-xs text-ink-muted truncate">All orders served & paid</p>
              </div>
            </div>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/tables');
              }}
              className="ml-3 shrink-0 px-3 py-1.5 rounded-lg bg-teal hover:bg-teal-dark text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Clear
            </button>
          </div>
        ),
        { duration: 5500, id: `toast_clear_${tableId}` }
      );
    };

    // ── 5. Guest Assistance (Call Staff / Request Bill) ─────────────────────────
    const handleAssistanceCreated = (request) => {
      qc.invalidateQueries({ queryKey: ['assistance'] });

      const tableLabel = request.tableId?.label || 'Table';
      const isBill = request.type === 'request_bill';
      const title = isBill ? `Bill Requested — ${tableLabel}` : `Staff Called — ${tableLabel}`;
      const message = request.message || (isBill ? 'Guest is requesting the bill.' : 'Guest requested staff assistance.');

      addNotification({
        id: `assist_${request._id}`,
        category: 'assistance',
        type: isBill ? 'assistance_bill' : 'assistance_call',
        title,
        message,
        data: { assistanceId: request._id, tableId: request.tableId?._id || request.tableId },
      });

      if (role !== 'kitchen' && soundEnabled && eventSounds.assistance) {
        playAssistanceBeep(soundVolume);
      }

      toast.custom(
        (t) => (
          <div
            className={`max-w-md w-full bg-white shadow-xl rounded-xl border border-rose-300 pointer-events-auto flex items-center justify-between p-3.5 transition-all ${
              t.visible ? 'animate-card-slide-in opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            style={{ borderLeftWidth: '5px', borderLeftColor: '#EF4444' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">{isBill ? '💳' : '🛎️'}</span>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-ink truncate">{title}</p>
                <p className="text-xs text-ink-muted truncate">{message}</p>
              </div>
            </div>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                useNotificationStore.getState().setDrawerOpen(true);
              }}
              className="ml-3 shrink-0 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Respond
            </button>
          </div>
        ),
        { duration: 6000, id: `toast_assist_${request._id}` }
      );

      triggerDesktopNotification(title, message, '/tables');
    };

    const handleAssistanceUpdated = () => {
      qc.invalidateQueries({ queryKey: ['assistance'] });
    };

    // ── 6. Reconnection Catchup ───────────────────────────────────────────────
    const handleReconnect = () => {
      qc.invalidateQueries({ queryKey: ['orders-kanban'] });
      qc.invalidateQueries({ queryKey: ['orders-today'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['assistance'] });
    };

    socket.on('order:created', handleOrderCreated);
    socket.on('order:updated', handleOrderUpdated);
    socket.on('table:updated', handleTableUpdated);
    socket.on('table:readyToClear', handleReadyToClear);
    socket.on('assistance:created', handleAssistanceCreated);
    socket.on('assistance:updated', handleAssistanceUpdated);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('order:created', handleOrderCreated);
      socket.off('order:updated', handleOrderUpdated);
      socket.off('table:updated', handleTableUpdated);
      socket.off('table:readyToClear', handleReadyToClear);
      socket.off('assistance:created', handleAssistanceCreated);
      socket.off('assistance:updated', handleAssistanceUpdated);
      socket.off('reconnect', handleReconnect);
    };
  }, [qc, navigate, role, soundEnabled, soundVolume, eventSounds, desktopNotificationsEnabled, addNotification]);
}
