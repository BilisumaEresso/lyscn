import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Cart store — persisted to localStorage.
 * Prices are stored for display only; the server recomputes totals on order placement.
 */
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // [{ productId, name, unitPrice, qty, selectedModifiers, subtotal }]
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

      /** Add an item or increment qty if an identical selection already exists. */
      addItem: (item) => {
        const { items } = get();
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
          set({ items: updated, lastActiveAt: Date.now() });
        } else {
          set({
            items: [
              ...items,
              { ...item, qty: item.qty ?? 1, subtotal: item.unitPrice * (item.qty ?? 1) },
            ],
            lastActiveAt: Date.now(),
          });
        }
      },

      /** Set an item's qty directly; removes if qty reaches 0. */
      updateQty: (productId, modifierKey, qty) => {
        const { items } = get();
        if (qty <= 0) {
          set({
            items: items.filter((i) => !(i.productId === productId && i._modKey === modifierKey)),
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
        set({
          items: items.filter((_, i) => i !== index),
          lastActiveAt: Date.now(),
        });
      },

      clearCart: () => set({ items: [], lastActiveAt: Date.now() }),
    }),
    { name: 'layoscan-cart' }
  )
);

// ── Computed helpers (used as selectors) ──────────────────────────────────────
export const cartItemCount  = (state) => state.items.reduce((s, i) => s + i.qty, 0);
export const cartSubtotal   = (state) =>
  state.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
