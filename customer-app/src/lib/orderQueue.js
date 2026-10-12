import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import toast from 'react-hot-toast';
import api from './api';
import { useNetworkStore, subscribeToReconnect } from '../store/networkStore';
import { useSessionStore } from '../store/sessionStore';
import { useCartStore } from '../store/cartStore';

const QUEUE_STORAGE_KEY = 'layoscan_order_write_queue';

/**
 * Reads the current write queue from IndexedDB.
 */
async function readQueueFromIDB() {
  try {
    const data = await get(QUEUE_STORAGE_KEY);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[OrderQueue] Failed to read from IndexedDB:', err);
    return [];
  }
}

/**
 * Writes the entire write queue array to IndexedDB.
 */
async function writeQueueToIDB(queue) {
  try {
    await set(QUEUE_STORAGE_KEY, queue);
  } catch (err) {
    console.error('[OrderQueue] Failed to write to IndexedDB:', err);
  }
}

export const useOrderQueueStore = create((setStore, getStore) => ({
  queue: [],
  isInitialized: false,
  isFlushing: false,

  /**
   * Initializes queue from IndexedDB on startup.
   */
  initQueue: async () => {
    const queue = await readQueueFromIDB();
    setStore({ queue, isInitialized: true });

    // If online on boot and queue has pending items, attempt flush
    if (queue.some((q) => q.status === 'pending') && useNetworkStore.getState().isOnline) {
      getStore().flushQueue();
    }
  },

  /**
   * Enqueue an order into IndexedDB.
   */
  enqueueOrder: async (payload, cartSnapshot = {}) => {
    const currentQueue = await readQueueFromIDB();
    const clientOrderId = payload.clientOrderId;

    const existingIdx = currentQueue.findIndex((q) => q.clientOrderId === clientOrderId);
    const orderRecord = {
      clientOrderId,
      payload,
      cartSnapshot: {
        items: cartSnapshot.items || [],
        subtotal: cartSnapshot.subtotal || 0,
        itemCount: (cartSnapshot.items || []).reduce((acc, it) => acc + (it.qty || 1), 0),
        restaurantName: cartSnapshot.restaurantName || '',
        tableName: cartSnapshot.tableName || '',
      },
      status: 'pending',
      createdAt: Date.now(),
      lastAttemptAt: null,
      retryCount: 0,
      conflict: null,
    };

    let updatedQueue;
    if (existingIdx >= 0) {
      updatedQueue = [...currentQueue];
      updatedQueue[existingIdx] = {
        ...updatedQueue[existingIdx],
        ...orderRecord,
      };
    } else {
      updatedQueue = [...currentQueue, orderRecord];
    }

    await writeQueueToIDB(updatedQueue);
    setStore({ queue: updatedQueue });
    return orderRecord;
  },

  /**
   * Remove an order by clientOrderId from IndexedDB.
   */
  removeOrder: async (clientOrderId) => {
    const currentQueue = await readQueueFromIDB();
    const updatedQueue = currentQueue.filter((q) => q.clientOrderId !== clientOrderId);
    await writeQueueToIDB(updatedQueue);
    setStore({ queue: updatedQueue });
  },

  /**
   * Dismiss/discard a conflicted order record.
   */
  dismissConflict: async (clientOrderId) => {
    await getStore().removeOrder(clientOrderId);
    toast('Conflict dismissed', { icon: 'ℹ️' });
  },

  /**
   * Resolve a conflict: restore remaining valid items back into the active cart
   * without the rejected/unavailable product, then discard the conflicted queue entry.
   */
  resolveConflictAndRestoreCart: async (clientOrderId) => {
    const { queue } = getStore();
    const target = queue.find((q) => q.clientOrderId === clientOrderId);
    if (!target) return;

    const unavailableProductId = target.conflict?.unavailableProductId;
    const cartItems = target.cartSnapshot?.items || target.payload?.items || [];

    // Filter out the unavailable product
    const validItems = cartItems.filter(
      (it) => String(it.productId) !== String(unavailableProductId)
    );

    // Restore to cartStore
    const cartStore = useCartStore.getState();
    cartStore.clearCart();
    validItems.forEach((it) => {
      cartStore.addItem(it);
    });

    // Remove the conflicted queue entry
    await getStore().removeOrder(clientOrderId);

    toast.success('Cart restored with unavailable items removed. You can modify and re-order.');
  },

  /**
   * Replays/flushes all pending orders across reconnect.
   * Replay is keyed on clientOrderId — the backend endpoint POST /api/orders/public
   * is idempotent and will return `{ reused: true, order }` if already processed.
   */
  flushQueue: async () => {
    if (getStore().isFlushing) return;

    // Verify actual connectivity via heartbeat before flushing
    const isOnline = await useNetworkStore.getState().checkConnection();
    if (!isOnline) {
      return;
    }

    setStore({ isFlushing: true });

    try {
      const queueSnapshot = await readQueueFromIDB();
      const pendingOrders = queueSnapshot.filter((q) => q.status === 'pending');

      if (pendingOrders.length === 0) {
        setStore({ isFlushing: false });
        return;
      }

      for (const order of pendingOrders) {
        // Mark as syncing in state
        let currentQueue = await readQueueFromIDB();
        currentQueue = currentQueue.map((q) =>
          q.clientOrderId === order.clientOrderId ? { ...q, status: 'syncing', lastAttemptAt: Date.now() } : q
        );
        await writeQueueToIDB(currentQueue);
        setStore({ queue: currentQueue });

        try {
          const res = await api.post('/orders/public', order.payload);
          const placedOrder = res.data?.order;

          // Order successfully placed (or recognized as already placed via idempotency)
          await getStore().removeOrder(order.clientOrderId);

          if (placedOrder?._id) {
            useSessionStore.getState().setActiveOrderId(placedOrder._id);
          }

          // If current cart is tied to this clientOrderId, clear it
          if (useCartStore.getState().clientOrderId === order.clientOrderId) {
            useCartStore.getState().clearCart();
          }

          if (res.data?.reused) {
            toast.success('Your order was previously confirmed by the kitchen!', {
              id: `queue-reused-${order.clientOrderId}`,
              duration: 5000,
            });
          } else {
            toast.success('Offline order sent to the kitchen!', {
              id: `queue-placed-${order.clientOrderId}`,
              duration: 5000,
            });
          }
        } catch (err) {
          const status = err.response?.status;
          const data = err.response?.data;
          const message = data?.message || err.message || '';

          // ── CONFLICT RULE: Item went unavailable while queued ─────────────────
          // Do NOT silently drop! Keep order in queue marked as 'conflict' and surface it.
          const isItemUnavailable =
            data?.code === 'ITEM_UNAVAILABLE' ||
            status === 409 ||
            message.toLowerCase().includes('unavailable') ||
            message.toLowerCase().includes('not found or unavailable');

          if (isItemUnavailable) {
            const conflictDetails = {
              code: data?.code || 'ITEM_UNAVAILABLE',
              unavailableProductId: data?.unavailableProductId || null,
              unavailableProductName: data?.unavailableProductName || 'Item',
              message: message || 'An item in your order is no longer available.',
              failedAt: Date.now(),
            };

            let qNow = await readQueueFromIDB();
            qNow = qNow.map((q) =>
              q.clientOrderId === order.clientOrderId
                ? { ...q, status: 'conflict', conflict: conflictDetails }
                : q
            );
            await writeQueueToIDB(qNow);
            setStore({ queue: qNow });

            toast.error(
              `Order conflict: ${conflictDetails.unavailableProductName} is unavailable.`,
              { id: `conflict-${order.clientOrderId}`, duration: 7000 }
            );
          } else if (!err.response || err.code === 'ERR_NETWORK' || status >= 500) {
            // Still offline or transient network drop: reset to pending
            let qNow = await readQueueFromIDB();
            qNow = qNow.map((q) =>
              q.clientOrderId === order.clientOrderId
                ? {
                    ...q,
                    status: 'pending',
                    retryCount: (q.retryCount || 0) + 1,
                    lastAttemptAt: Date.now(),
                  }
                : q
            );
            await writeQueueToIDB(qNow);
            setStore({ queue: qNow });
            // Stop processing further orders in this flush since network is unreachable
            break;
          } else {
            // Unrecoverable client error (e.g. 401 expired session)
            let qNow = await readQueueFromIDB();
            qNow = qNow.map((q) =>
              q.clientOrderId === order.clientOrderId
                ? {
                    ...q,
                    status: 'conflict',
                    conflict: {
                      code: data?.code || 'ORDER_REJECTED',
                      message: message || 'Order could not be processed.',
                      failedAt: Date.now(),
                    },
                  }
                : q
            );
            await writeQueueToIDB(qNow);
            setStore({ queue: qNow });
          }
        }
      }
    } finally {
      setStore({ isFlushing: false });
    }
  },
}));

// Automatic flush trigger when connectivity recovers
subscribeToReconnect(() => {
  useOrderQueueStore.getState().flushQueue();
});
