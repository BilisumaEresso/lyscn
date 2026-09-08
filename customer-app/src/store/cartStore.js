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

      /** Add an item or increment qty if an identical selection already exists. */
      addItem: (item) => {
        const { items } = get();
        // Key: productId + sorted modifier selection — ensures identical configs merge
        const key = (it) =>
          it.productId +
          JSON.stringify(
            [...(it.selectedModifiers ?? [])].sort((a, b) =>
              `${a.groupName}${a.optionName}`.localeCompare(`${b.groupName}${b.optionName}`)
            )
          );

        const existing = items.findIndex((i) => key(i) === key(item));
        if (existing >= 0) {
          const updated = [...items];
          updated[existing] = {
            ...updated[existing],
            qty:      updated[existing].qty + (item.qty ?? 1),
            subtotal: updated[existing].unitPrice * (updated[existing].qty + (item.qty ?? 1)),
          };
          set({ items: updated });
        } else {
          set({
            items: [
              ...items,
              { ...item, qty: item.qty ?? 1, subtotal: item.unitPrice * (item.qty ?? 1) },
            ],
          });
        }
      },

      /** Set an item's qty directly; removes if qty reaches 0. */
      updateQty: (productId, modifierKey, qty) => {
        const { items } = get();
        if (qty <= 0) {
          set({ items: items.filter((i) => !(i.productId === productId && i._modKey === modifierKey)) });
        } else {
          set({
            items: items.map((i) =>
              i.productId === productId && i._modKey === modifierKey
                ? { ...i, qty, subtotal: i.unitPrice * qty }
                : i
            ),
          });
        }
      },

      /** Remove by array index (safer since the same product can appear multiple times). */
      removeItem: (index) => {
        const { items } = get();
        set({ items: items.filter((_, i) => i !== index) });
      },

      clearCart: () => set({ items: [] }),
    }),
    { name: 'layoscan-cart' }
  )
);

// ── Computed helpers (used as selectors) ──────────────────────────────────────
export const cartItemCount  = (state) => state.items.reduce((s, i) => s + i.qty, 0);
export const cartSubtotal   = (state) =>
  state.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
