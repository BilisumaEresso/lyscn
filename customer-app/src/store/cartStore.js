import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cart store — persisted to localStorage.
 * Prices are stored for display only; the server recomputes totals on order placement.
 * clientOrderId is persisted with the cart so offline queuing and retries cannot double-charge.
 */
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // [{ productId, name, unitPrice, qty, selectedModifiers, subtotal }]
      clientOrderId: null,
      restaurantId: null,
      branchId:     null,
      tableId:      null,
      qrToken:      null,
      lastActiveAt: null, // Timestamp of last modification

      /**
       * Synchronizes cart with newly resolved QR session and enforces clearing rules:
       * 1. Cross-Restaurant Isolation: cleared if restaurant changed.
       * 2. Physical Table Change: cleared if table / qrToken changed.
       * 3. Session Expiry & Fresh Session: cleared if session is fresh or inactivity > 2 hours.
       * 4. In-Session Continuity: preserved if same table and restaurant within active window.
       */
      syncWithSession: ({ restaurantId, branchId, tableId, qrToken, freshSession = false }) => {
        const { items, restaurantId: prevRest, tableId: prevTable, qrToken: prevQr, lastActiveAt } = get();
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        const now = Date.now();
        const isExpired = lastActiveAt && (now - lastActiveAt > TWO_HOURS_MS);

        const isDifferentRestaurant = prevRest && restaurantId && String(prevRest) !== String(restaurantId);
        const isDifferentTable = (prevTable && tableId && String(prevTable) !== String(tableId)) ||
                                 (prevQr && qrToken && prevQr !== qrToken);
        const isStaleCart = !lastActiveAt && items.length > 0;

        const shouldClear =
          items.length > 0 &&
          (isDifferentRestaurant || isDifferentTable || freshSession || isExpired || isStaleCart);

        if (shouldClear) {
          set({
            items: [],
            clientOrderId: null,
            restaurantId: restaurantId || null,
            branchId:     branchId || null,
            tableId:      tableId || null,
            qrToken:      qrToken || null,
            lastActiveAt: now,
          });
        } else {
          set({
            restaurantId: restaurantId || prevRest || null,
            branchId:     branchId || get().branchId || null,
            tableId:      tableId || prevTable || null,
            qrToken:      qrToken || prevQr || null,
            lastActiveAt: now,
          });
        }
      },

      /** Get or initialize the persistent clientOrderId for the current cart state */
      getClientOrderId: () => {
        let { clientOrderId } = get();
        if (!clientOrderId) {
          clientOrderId = uuidv4();
          set({ clientOrderId });
        }
        return clientOrderId;
      },

      /** Set or reset the clientOrderId explicitly (e.g. after successful order) */
      resetClientOrderId: () => {
        const id = uuidv4();
        set({ clientOrderId: id });
        return id;
      },

      /** Add an item or increment qty if an identical selection already exists. */
      addItem: (item) => {
        const { items, clientOrderId } = get();
        const activeClientOrderId = clientOrderId || uuidv4();
        // Key: productId + sorted modifier selection + sorted specs + sorted tags + itemNotes
        const key = (it) =>
          it.productId +
          JSON.stringify(
            [...(it.selectedModifiers ?? [])].sort((a, b) =>
              `${a.groupName}${a.optionName}`.localeCompare(`${b.groupName}${b.optionName}`)
            )
          ) +
          JSON.stringify(
            [...(it.selectedSpecs ?? [])].sort((a, b) =>
              `${a.specName}${a.optionName}`.localeCompare(`${b.specName}${b.optionName}`)
            )
          ) +
          JSON.stringify([...(it.quickTags ?? [])].sort()) +
          (it.itemNotes ? it.itemNotes.trim() : '');

        const existing = items.findIndex((i) => key(i) === key(item));
        if (existing >= 0) {
          const updated = [...items];
          const newQty = updated[existing].qty + (item.qty ?? 1);
          updated[existing] = {
            ...updated[existing],
            qty:      newQty,
            subtotal: updated[existing].unitPrice * newQty,
          };
          set({ items: updated, clientOrderId: activeClientOrderId, lastActiveAt: Date.now() });
        } else {
          set({
            items: [
              ...items,
              { ...item, qty: item.qty ?? 1, subtotal: item.unitPrice * (item.qty ?? 1) },
            ],
            clientOrderId: activeClientOrderId,
            lastActiveAt: Date.now(),
          });
        }
      },

      /** Set an item's qty directly; removes if qty reaches 0. */
      updateQty: (productId, modifierKey, qty) => {
        const { items } = get();
        if (qty <= 0) {
          const remaining = items.filter((i) => !(i.productId === productId && i._modKey === modifierKey));
          set({
            items: remaining,
            clientOrderId: remaining.length === 0 ? null : get().clientOrderId,
            lastActiveAt: Date.now(),
          });
        } else {
          set({
            items: items.map((i) =>
              i.productId === productId && i._modKey === modifierKey
                ? { ...i, qty, subtotal: i.unitPrice * qty }
                : i
            ),
            lastActiveAt: Date.now(),
          });
        }
      },

      /** Remove by array index (safer since the same product can appear multiple times). */
      removeItem: (index) => {
        const { items } = get();
        const remaining = items.filter((_, i) => i !== index);
        set({
          items: remaining,
          clientOrderId: remaining.length === 0 ? null : get().clientOrderId,
          lastActiveAt: Date.now(),
        });
      },

      clearCart: () => set({ items: [], clientOrderId: null, lastActiveAt: Date.now() }),
    }),
    { name: 'layoscan-cart' }
  )
);

// ── Computed helpers (used as selectors) ──────────────────────────────────────
export const cartItemCount  = (state) => state.items.reduce((s, i) => s + i.qty, 0);
export const cartSubtotal   = (state) =>
  state.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
