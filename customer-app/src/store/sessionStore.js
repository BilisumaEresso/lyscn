import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

/**
 * Session store — holds the resolved table context (restaurant, branch, table).
 * Persisted to localStorage under 'layoscan-session'.
 */
export const useSessionStore = create(
  persist(
    (set, get) => ({
      qrToken:       null,
      sessionId:     null,
      sessionToken:  null,
      restaurant:    null,
      branch:        null,
      table:         null,
      guestName:     '',
      activeOrderId: null,
      orderHistory:  [],

      /**
       * Called by the /t/:qrToken page after a successful table resolution.
       * If freshSession is true (e.g. previous meal ended, no ongoing orders),
       * starts with a clean sessionId and empty order history.
       */
      setSession: ({ qrToken, restaurant, branch, table, sessionToken, freshSession = false }) => {
        const existing = get();
        const isSameTable = existing.qrToken === qrToken;

        const shouldStartFresh = freshSession || !isSameTable || !existing.sessionId;
        const sessionId = shouldStartFresh ? uuidv4() : existing.sessionId;

        set({
          qrToken,
          sessionId,
          sessionToken,
          restaurant,
          branch,
          table,
          activeOrderId: shouldStartFresh ? null : existing.activeOrderId,
          orderHistory:  shouldStartFresh ? [] : (existing.orderHistory || []),
        });
      },

      setGuestName: (guestName) => set({ guestName }),

      setActiveOrderId: (activeOrderId) =>
        set((state) => ({
          activeOrderId,
          orderHistory:
            activeOrderId && !state.orderHistory.includes(activeOrderId)
              ? [...state.orderHistory, activeOrderId]
              : state.orderHistory,
        })),

      /**
       * Starts a fresh session on the current table (for a new meal/order visit).
       * Clears past round history and generates a new sessionId.
       */
      startFreshSession: () =>
        set({
          sessionId:     uuidv4(),
          activeOrderId: null,
          orderHistory:  [],
        }),

      /**
       * Dismisses/removes a specific order round from the customer's history.
       */
      dismissRound: (orderId) =>
        set((state) => {
          const nextHistory = (state.orderHistory || []).filter((id) => id !== orderId);
          const nextActiveId =
            state.activeOrderId === orderId
              ? nextHistory[nextHistory.length - 1] || null
              : state.activeOrderId;
          return {
            orderHistory: nextHistory,
            activeOrderId: nextActiveId,
          };
        }),

      clearActiveOrder: () => set({ activeOrderId: null }),

      clearSession: () =>
        set({
          qrToken:       null,
          sessionId:     null,
          sessionToken:  null,
          restaurant:    null,
          branch:        null,
          table:         null,
          activeOrderId: null,
          orderHistory:  [],
        }),
    }),
    { name: 'layoscan-session' }
  )
);
