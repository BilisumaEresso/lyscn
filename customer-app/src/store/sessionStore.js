import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

/**
 * Session store — holds the resolved table context (restaurant, branch, table).
 * One sessionId per qrToken visit; persisted to localStorage so a page
 * refresh within the same visit keeps the same session identity.
 *
 * The session is keyed by qrToken so multiple tabs/tokens stay independent.
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
       * Generates a new sessionId only if the qrToken has changed (new visit).
       */
      setSession: ({ qrToken, restaurant, branch, table, sessionToken }) => {
        const existing = get();
        const isSameTable = existing.qrToken === qrToken;
        const sessionId =
          isSameTable && existing.sessionId
            ? existing.sessionId   // same visit — reuse existing session
            : uuidv4();            // new token / first visit — fresh session

        set({
          qrToken,
          sessionId,
          sessionToken,
          restaurant,
          branch,
          table,
          // Retain guestName & activeOrderId if staying at the same table
          activeOrderId: isSameTable ? existing.activeOrderId : null,
          orderHistory:  isSameTable ? (existing.orderHistory || []) : [],
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
