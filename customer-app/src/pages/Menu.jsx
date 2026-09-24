import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Info,
  MapPin,
  Search,
  X,
  Sparkles,
  ChevronRight,
  Clock,
  UtensilsCrossed,
  SlidersHorizontal,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../lib/api';
import { applyBrandColor } from '../lib/theme';
import { useSessionStore } from '../store/sessionStore';
import { useCartStore, cartItemCount, cartSubtotal } from '../store/cartStore';
import AssistanceButton from '../components/AssistanceButton';
import Currency, { formatBirr } from '../components/Currency';
import CulinaryPlaceholder from '../components/menu/CulinaryPlaceholder';
import PoweredBy from '../components/PoweredBy';
import { getRestaurantLogo, getRestaurantCover } from '../lib/branding';

// ── Product detail bottom sheet ───────────────────────────────────────────────
function ProductSheet({ product, categoryName, onClose }) {
  const addItem = useCartStore((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState({});

  if (!product) return null;
  const groups = product.modifierGroups ?? [];

  const getSelectedOptions = () => {
    const mods = [];
    for (const g of groups) {
      const sel = selected[g.name] ?? [];
      for (const optName of sel) {
        const opt = g.options.find((o) => o.name === optName);
        if (opt) mods.push({ groupName: g.name, optionName: opt.name, priceDelta: opt.priceDelta });
      }
    }
    return mods;
  };

  const modifierExtra = getSelectedOptions().reduce((s, m) => s + m.priceDelta, 0);
  const unitPrice = product.price + modifierExtra;
  const total = unitPrice * qty;

  const allRequiredMet = groups
    .filter((g) => g.required)
    .every((g) => (selected[g.name]?.length ?? 0) > 0);

  const handleSelect = (groupName, optionName, maxSelect) => {
    setSelected((prev) => {
      const current = prev[groupName] ?? [];
      if (maxSelect === 1) {
        return { ...prev, [groupName]: current.includes(optionName) ? [] : [optionName] };
      } else {
        if (current.includes(optionName)) {
          return { ...prev, [groupName]: current.filter((n) => n !== optionName) };
        } else if (current.length < maxSelect) {
          return { ...prev, [groupName]: [...current, optionName] };
        }
        return prev;
      }
    });
  };

  const handleAdd = () => {
    addItem({
      productId: product._id,
      name: product.name,
      unitPrice,
      qty,
      selectedModifiers: getSelectedOptions(),
      subtotal: total,
    });
    toast.success(`Added ${qty}× ${product.name}`);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-ink/50 z-40"
        onClick={onClose}
        style={{ animation: 'fade-in 200ms ease-out' }}
        role="dialog"
        aria-modal="true"
        aria-label={`Product details for ${product.name}`}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 max-w-[560px] mx-auto bg-white rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh', animation: 'slide-up 280ms ease-out' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-ink/15" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close product details"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-ink/8 flex items-center justify-center text-ink-muted hover:bg-ink/15 transition-colors focus-visible:outline focus-visible:outline-2"
          style={{ '--tw-outline-color': 'var(--color-primary)' }}
        >
          ×
        </button>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 pb-32">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-52 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-48 relative overflow-hidden">
              <CulinaryPlaceholder
                name={product.name}
                categoryName={categoryName}
                size="lg"
              />
            </div>
          )}

          <div className="px-5 pt-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="font-display font-bold text-xl text-ink leading-tight flex-1">
                {product.name}
              </h2>
              <span className="font-display font-bold text-xl text-ink shrink-0">
                <Currency value={product.price} />
              </span>
            </div>
            {product.description && (
              <p className="text-ink-muted text-sm leading-relaxed mb-5">
                {product.description}
              </p>
            )}

            {/* Modifier groups */}
            {groups.map((group) => {
              const isSingle = group.maxSelect === 1;
              const selForGroup = selected[group.name] ?? [];
              return (
                <div key={group.name} className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display font-semibold text-base text-ink">{group.name}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={group.required ? {
                        background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                        color: 'var(--color-primary-dark, #0F8077)',
                      } : { background: 'rgba(18,26,44,0.06)', color: '#5B6B7A' }}
                    >
                      {group.required
                        ? isSingle ? 'Choose one' : `Required · up to ${group.maxSelect}`
                        : isSingle ? 'Optional' : `Optional · up to ${group.maxSelect}`}
                    </span>
                  </div>
                  <div className="space-y-2" role={isSingle ? 'radiogroup' : 'group'} aria-label={group.name}>
                    {group.options.map((opt) => {
                      const isChecked = selForGroup.includes(opt.name);
                      return (
                        <button
                          key={opt.name}
                          type="button"
                          role={isSingle ? 'radio' : 'checkbox'}
                          aria-checked={isChecked}
                          onClick={() => handleSelect(group.name, opt.name, group.maxSelect)}
                          className={clsx(
                            'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left',
                            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
                          )}
                          style={isChecked ? {
                            borderColor: 'var(--color-primary)',
                            background:  'color-mix(in srgb, var(--color-primary) 5%, transparent)',
                          } : {}}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={clsx(
                                'shrink-0 w-4 h-4 transition-colors flex items-center justify-center',
                                isSingle ? 'rounded-full border-2' : 'rounded border-2',
                              )}
                              style={isChecked ? {
                                borderColor:     'var(--color-primary)',
                                backgroundColor: 'var(--color-primary)',
                              } : { borderColor: 'rgba(18,26,44,0.3)' }}
                            >
                              {isChecked && (
                                <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
                                  <path d="M3 8l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span className={clsx('text-sm font-medium', isChecked ? 'text-ink' : 'text-ink-muted')}>
                              {opt.name}
                            </span>
                          </div>
                          {opt.priceDelta !== 0 && (
                            <span className="text-sm text-ink-muted">+<Currency value={opt.priceDelta} /></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky footer */}
        <div
          className="absolute bottom-0 inset-x-0 bg-white border-t border-ink/8 px-5 py-4 flex items-center gap-3"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          {/* Qty stepper */}
          <div className="flex items-center gap-3 bg-ink/5 rounded-xl px-3 py-2">
            <button
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white shadow-sm text-ink"
            >
              <Minus size={14} />
            </button>
            <span aria-live="polite" className="font-display font-semibold text-lg text-ink w-5 text-center">
              {qty}
            </span>
            <button
              aria-label="Increase quantity"
              onClick={() => setQty((q) => q + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white shadow-sm text-ink"
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={!allRequiredMet}
            className="flex-1 py-3.5 rounded-2xl font-display font-semibold text-base transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={allRequiredMet ? {
              background: 'var(--color-primary)',
              color:      'var(--color-on-primary)',
              outlineColor: 'var(--color-primary)',
            } : { background: 'rgba(18,26,44,0.15)', color: '#5B6B7A' }}
          >
            {allRequiredMet
              ? `Add to order · ${formatBirr(total)}`
              : 'Make your selections'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Product Card with In-Card Stepper ─────────────────────────────────────────
function ProductCard({ product, categoryName, onOpen }) {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);

  const hasRequired = (product.modifierGroups ?? []).some((g) => g.required);

  // Cart item check (for standard items without modifiers)
  const cartItemIndex = items.findIndex(
    (i) => i.productId === product._id && (!i.selectedModifiers || i.selectedModifiers.length === 0)
  );
  const cartItem = cartItemIndex >= 0 ? items[cartItemIndex] : null;
  const inCartQty = cartItem?.qty || 0;

  // Total quantity in cart across any modifier configurations
  const totalItemQty = items
    .filter((i) => i.productId === product._id)
    .reduce((sum, i) => sum + i.qty, 0);

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    addItem({
      productId: product._id,
      name: product.name,
      unitPrice: product.price,
      qty: 1,
      selectedModifiers: [],
      subtotal: product.price,
    });
    toast.success(`Added ${product.name}`);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (!cartItem) return;
    if (inCartQty <= 1) {
      removeItem(cartItemIndex);
      toast(`Removed ${product.name}`, { icon: '🗑️' });
    } else {
      const updated = [...items];
      updated[cartItemIndex] = {
        ...cartItem,
        qty: inCartQty - 1,
        subtotal: cartItem.unitPrice * (inCartQty - 1),
      };
      useCartStore.setState({ items: updated });
    }
  };

  return (
    <div
      onClick={() => onOpen(product)}
      role="button"
      tabIndex={0}
      aria-label={`View ${product.name}, ${formatBirr(product.price)}`}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(product)}
      className="bg-white rounded-2xl overflow-hidden border border-ink/8 shadow-xs cursor-pointer active:scale-[0.98] transition-all hover:shadow-md flex flex-col justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ '--tw-outline-color': 'var(--color-primary)' }}
    >
      <div>
        <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'var(--color-surface-wash)' }}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <CulinaryPlaceholder
              name={product.name}
              categoryName={categoryName}
              size="md"
            />
          )}

          {/* Quick-add button or In-Card Stepper */}
          {!hasRequired ? (
            inCartQty > 0 ? (
              <div
                className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-ink/10 flex items-center p-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleDecrement}
                  aria-label={`Decrease ${product.name}`}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-ink hover:bg-ink/5 active:scale-90 transition-transform"
                >
                  <Minus size={13} strokeWidth={2.5} />
                </button>
                <span className="font-display font-bold text-xs text-ink min-w-[20px] text-center px-0.5">
                  {inCartQty}
                </span>
                <button
                  onClick={handleQuickAdd}
                  aria-label={`Increase ${product.name}`}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-sm"
                  style={{ background: 'var(--color-primary)' }}
                >
                  <Plus size={13} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleQuickAdd}
                aria-label={`Quick add ${product.name}`}
                className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{
                  background: 'var(--color-primary)',
                  outlineColor: 'var(--color-primary)',
                }}
              >
                <Plus size={16} className="text-white" strokeWidth={2.5} />
              </button>
            )
          ) : (
            totalItemQty > 0 && (
              <div
                className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-sm"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                }}
              >
                {totalItemQty} in cart
              </div>
            )
          )}
        </div>

        <div className="p-3">
          <p className="font-semibold text-ink text-sm leading-tight mb-1 line-clamp-2">
            {product.name}
          </p>
          {product.description && (
            <p className="text-xs text-ink-muted line-clamp-1 mb-1.5">
              {product.description}
            </p>
          )}
        </div>
      </div>

      <div className="px-3 pb-3 pt-0 flex items-center justify-between">
        <p className="font-display font-bold text-ink text-base">
          <Currency value={product.price} />
        </p>
        {hasRequired && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              color: 'var(--color-primary-dark, #0F8077)',
            }}
          >
            Options
          </span>
        )}
      </div>
    </div>
  );
}

// ── Horizontal Recommended / Popular Carousel ────────────────────────────────
function PopularCarousel({ products, onOpen }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="pt-2 pb-4">
      <div className="px-4 mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={16} className="text-amber" />
          <h2 className="font-display font-bold text-base text-ink tracking-tight">
            Popular & Chef's Picks
          </h2>
        </div>
        <span className="text-[11px] font-medium text-ink-muted">
          Table favorites
        </span>
      </div>

      <div
        className="flex gap-3 px-4 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {products.map((product) => (
          <div
            key={product._id}
            onClick={() => onOpen(product)}
            role="button"
            tabIndex={0}
            aria-label={`View popular item ${product.name}`}
            className="w-40 shrink-0 bg-white rounded-2xl border border-ink/8 shadow-xs overflow-hidden cursor-pointer active:scale-[0.98] transition-all hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'var(--color-surface-wash)' }}>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <CulinaryPlaceholder
                    name={product.name}
                    categoryName="Popular"
                    size="sm"
                  />
                )}
                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber text-white shadow-xs flex items-center gap-0.5">
                  ★ Popular
                </span>
              </div>
              <div className="p-2.5">
                <p className="font-semibold text-ink text-xs line-clamp-1 leading-snug">
                  {product.name}
                </p>
                <p className="font-display font-bold text-ink text-sm mt-0.5">
                  <Currency value={product.price} />
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Floating Action Button: Go to Table Orders ────────────────────────────────
function TableOrdersFAB({ tableOrders, onClick, hasCart }) {
  if (!tableOrders || !tableOrders.rounds || tableOrders.rounds.length === 0) return null;

  const roundCount = tableOrders.rounds.length;
  const activeCount = tableOrders.summary?.activeCount ?? 0;
  const latestRound = tableOrders.rounds[tableOrders.rounds.length - 1];
  const totalAmount = tableOrders.summary?.totalAmount ?? 0;
  const isAllServed = tableOrders.summary?.allServed;
  const isReady = latestRound?.status === 'ready';
  const isPreparing = latestRound?.status === 'preparing';
  const isAccepted = latestRound?.status === 'accepted';

  let statusText = isAllServed ? 'All Served' : latestRound?.status;
  if (isReady) statusText = 'Ready! Waiter delivering 🍽️';
  else if (isPreparing) statusText = 'Cooking in Kitchen 🍳';
  else if (isAccepted) statusText = 'Kitchen accepted ✓';

  return (
    <div
      className={clsx(
        'fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[528px] z-30 transition-all duration-300',
        hasCart ? 'bottom-24' : 'bottom-6'
      )}
      style={{ animation: 'slide-up-spring 400ms ease-out' }}
    >
      <button
        onClick={onClick}
        aria-label={`View table orders, ${roundCount} rounds`}
        className={clsx(
          'w-full rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-2xl active:scale-[0.98] transition-all text-white border',
          isReady ? 'border-emerald-400/40 ring-2 ring-emerald-400/30' : 'border-white/15'
        )}
        style={{
          background: isReady
            ? 'linear-gradient(135deg, #064E3B 0%, #0D9488 100%)'
            : 'linear-gradient(135deg, #121A2C 0%, #1E293B 100%)',
          boxShadow: isReady ? '0 12px 32px -4px rgba(16, 185, 129, 0.45)' : undefined,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div
              className={clsx(
                'w-3 h-3 rounded-full',
                isReady
                  ? 'bg-emerald-300 animate-bounce'
                  : !isAllServed
                  ? 'bg-leaf animate-pulse'
                  : 'bg-emerald-400'
              )}
            />
            {(!isAllServed || isReady) && (
              <span
                className={clsx(
                  'absolute w-5 h-5 rounded-full animate-ping',
                  isReady ? 'bg-emerald-400/50' : 'bg-leaf/30'
                )}
              />
            )}
          </div>
          <div className="text-left">
            <p className="font-display font-bold text-sm leading-tight flex items-center gap-1.5">
              <span>{roundCount === 1 ? 'Round 1' : `Table Orders (${roundCount} Rounds)`}</span>
              <span
                className={clsx(
                  'text-[11px] font-medium',
                  isReady ? 'text-emerald-200 font-bold' : 'text-white/70'
                )}
              >
                · {statusText}
              </span>
            </p>
            <p className="text-[11px] text-white/60 mt-0.5">
              Total: {formatBirr(totalAmount)} · Tap to view details
            </p>
          </div>
        </div>

        <div
          className={clsx(
            'flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors',
            isReady ? 'bg-white text-emerald-950 font-bold' : 'bg-white/10 text-white'
          )}
        >
          <span>Track</span>
          <ChevronRight size={14} />
        </div>
      </button>
    </div>
  );
}

// ── Cart bar ──────────────────────────────────────────────────────────────────
function CartBar({ itemCount, subtotal, onTap }) {
  return (
    <div
      className="sticky-bottom px-4 z-40"
      style={{ animation: 'slide-up-spring 500ms cubic-bezier(0.34,1.56,0.64,1)' }}
    >
      <button
        onClick={onTap}
        aria-label={`View cart — ${itemCount} items, ${formatBirr(subtotal)}`}
        className="w-full rounded-2xl px-5 py-4 flex items-center justify-between shadow-xl active:scale-[0.98] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          background: 'var(--color-primary)',
          outlineColor: 'var(--color-primary)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <ShoppingCart size={16} style={{ color: 'var(--color-on-primary)' }} />
          </div>
          <span className="font-display font-bold text-base" style={{ color: 'var(--color-on-primary)' }}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="font-display font-bold text-base" style={{ color: 'var(--color-on-primary)' }}>
          <Currency value={subtotal} /> →
        </span>
      </button>
    </div>
  );
}

// ── Main Menu page ────────────────────────────────────────────────────────────
export default function Menu() {
  const navigate = useNavigate();
  const session = useSessionStore();
  const itemCount = useCartStore(cartItemCount);
  const subtotal = useCartStore(cartSubtotal);

  const [activeCat, setActiveCat] = useState(null);
  const [sheetProduct, setSheetProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [slideDirection, setSlideDirection] = useState('none'); // 'left' | 'right' | 'none'
  const [coverImgError, setCoverImgError] = useState(false);
  const [logoImgError, setLogoImgError] = useState(false);

  const catRowRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const { restaurant, branch, table } = session;
  const restaurantId = restaurant?._id;

  useEffect(() => { setCoverImgError(false); }, [restaurant?.coverUrl]);
  useEffect(() => { setLogoImgError(false); }, [restaurant?.logoUrl]);

  // Re-apply brand color in case session was restored from localStorage
  useEffect(() => {
    if (restaurant?.brandColor) {
      applyBrandColor(restaurant.brandColor);
    }
  }, [restaurant?.brandColor]);

  // Dynamic page title
  useEffect(() => {
    document.title = restaurant?.name ? `${restaurant.name} · Order` : 'LayoScan';
    return () => { document.title = 'LayoScan'; };
  }, [restaurant?.name]);

  // Keep restaurant branding/metadata updated
  const { data: tableData } = useQuery({
    queryKey: ['table-resolve', session.qrToken],
    queryFn: () => api.get(`/public/table/${session.qrToken}`).then((r) => r.data),
    enabled: !!session.qrToken,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (tableData?.restaurant) {
      session.setSession({
        qrToken: session.qrToken,
        restaurant: tableData.restaurant,
        branch: tableData.branch || session.branch,
        table: tableData.table || session.table,
        sessionToken: tableData.sessionToken || session.sessionToken,
      });
    }
  }, [tableData]);

  // Fetch public products
  const { data, isLoading } = useQuery({
    queryKey: ['public-products', restaurantId],
    queryFn: () =>
      api.get('/products/public', { params: { restaurantId } }).then((r) => r.data),
    enabled: !!restaurantId,
    staleTime: 60_000,
  });

  // Query table orders for active rounds & floating action button
  const { data: tableOrders } = useQuery({
    queryKey: ['table-orders', session.sessionToken],
    queryFn: () =>
      api.get('/orders/public/table/orders', {
        params: { sessionToken: session.sessionToken },
      }).then((r) => r.data),
    enabled: !!session.sessionToken,
    refetchInterval: 8_000,
  });

  const products = data?.products ?? [];

  // Build categories from populated products
  const categories = useMemo(() => {
    const seen = new Map();
    for (const p of products) {
      const cat = p.categoryId;
      if (cat && !seen.has(cat._id)) seen.set(cat._id, cat);
    }
    return [...seen.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products]);

  // Popular / Recommended items
  const popularProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const withImages = products.filter((p) => p.imageUrl);
    if (withImages.length >= 3) return withImages.slice(0, 8);
    return products.slice(0, 6);
  }, [products]);

  useEffect(() => {
    if (categories.length > 0 && !activeCat) {
      setActiveCat(categories[0]._id);
    }
  }, [categories, activeCat]);

  // Filtered products: if searching, search all products; otherwise filter by active category
  const filteredProducts = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.categoryId?.name && p.categoryId.name.toLowerCase().includes(q))
      );
    }
    return activeCat
      ? products.filter((p) => p.categoryId?._id === activeCat)
      : products;
  }, [products, activeCat, searchQuery]);

  const handleCatClick = (catId, direction = 'none') => {
    setSlideDirection(direction);
    setActiveCat(catId);
    const el = document.getElementById(`cat-chip-${catId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  // ── Swipe gestures between categories ───────────────────────────────────────
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (categories.length <= 1 || searchQuery.trim()) return;

    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Minimum horizontal swipe distance of 45px, with horizontal movement dominating vertical scroll
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      const currentIndex = categories.findIndex((c) => c._id === activeCat);
      if (currentIndex === -1) return;

      if (diffX < 0 && currentIndex < categories.length - 1) {
        // Swiped left -> Next category
        handleCatClick(categories[currentIndex + 1]._id, 'left');
      } else if (diffX > 0 && currentIndex > 0) {
        // Swiped right -> Previous category
        handleCatClick(categories[currentIndex - 1]._id, 'right');
      }
    }
  };

  return (
    <div className="min-h-screen bg-paper max-w-[560px] mx-auto relative flex flex-col">
      {/* ── Header / Cover ─────────────────────────────────────────────── */}
      <div className="relative h-56 overflow-hidden shrink-0">
        <img
          src={getRestaurantCover(restaurant, coverImgError)}
          alt={`${restaurant?.name || 'Restaurant'} cover`}
          className="w-full h-full object-cover"
          loading="eager"
          onError={() => setCoverImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/60 to-transparent" />

        {/* Top-right customer actions */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <AssistanceButton dark />
          <button
            onClick={() => navigate('/about')}
            className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold hover:bg-white/30 transition-all flex items-center gap-1.5 shadow-sm border border-white/20"
          >
            <Info size={13} />
            <span>About</span>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 flex items-end gap-3">
          <img
            src={getRestaurantLogo(restaurant, logoImgError)}
            alt={`${restaurant?.name || 'Restaurant'} logo`}
            className="w-14 h-14 rounded-2xl border-2 border-white/40 shadow-lg object-cover shrink-0 bg-white"
            loading="eager"
            onError={() => setLogoImgError(true)}
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-white text-xl leading-tight truncate drop-shadow-sm">
              {restaurant?.name}
            </h1>
            <p className="text-white/85 text-xs font-semibold mt-0.5">
              {branch?.name} · <span className="underline decoration-leaf underline-offset-2">{table?.label}</span>
            </p>
            {(restaurant?.contactInfo?.address || branch?.address) && (
              <p className="text-white/70 text-xs mt-1 flex items-center gap-1 truncate">
                <MapPin size={11} /> {restaurant?.contactInfo?.address || branch.address}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar ───────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-1 bg-paper">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3.5 text-ink-muted pointer-events-none" />
          <input
            id="menu-search-input"
            name="menuSearch"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coffee, dishes, drinks…"
            autoComplete="off"
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white border border-ink/8 text-sm placeholder:text-ink-muted/70 focus:outline-none focus:border-primary shadow-xs transition-all"
            style={{ '--tw-border-opacity': '1' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 w-5 h-5 rounded-full bg-ink/10 flex items-center justify-center text-ink-muted hover:text-ink"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Popular & Chef's Picks section (when not searching) ───────── */}
      {!searchQuery && popularProducts.length > 0 && (
        <PopularCarousel
          products={popularProducts}
          onOpen={setSheetProduct}
        />
      )}

      {/* ── Sticky category chip row (hidden when searching) ─────────── */}
      {!searchQuery && (
        <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-ink/6 shadow-xs">
          <div
            ref={catRowRef}
            role="tablist"
            aria-label="Menu categories"
            className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {categories.map((cat) => {
              const isActive = activeCat === cat._id;
              const count = products.filter((p) => p.categoryId?._id === cat._id).length;
              return (
                <button
                  key={cat._id}
                  id={`cat-chip-${cat._id}`}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleCatClick(cat._id)}
                  className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center gap-1.5"
                  style={isActive ? {
                    background:   'var(--color-surface-wash)',
                    color:        'var(--color-primary-dark, var(--color-primary))',
                    outlineColor: 'var(--color-primary)',
                    boxShadow:    '0 1px 3px rgba(0,0,0,0.05)',
                  } : {
                    background: 'rgba(18,26,44,0.05)',
                    color:      '#5B6B7A',
                  }}
                >
                  <span>{cat.name}</span>
                  {count > 0 && (
                    <span
                      className="text-[11px] font-normal px-1.5 py-0.2 rounded-full"
                      style={isActive ? {
                        background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                        color: 'var(--color-primary-dark, #0F8077)'
                      } : {
                        background: 'rgba(18,26,44,0.08)',
                        color: '#718096'
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Product grid with Touch Gesture Swipe ─────────────────────── */}
      <div
        className="px-4 py-3 flex-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          paddingBottom: itemCount > 0 ? '110px' : tableOrders?.rounds?.length > 0 ? '90px' : '30px',
        }}
      >
        {searchQuery && (
          <div className="flex items-center justify-between mb-3 text-xs text-ink-muted">
            <span>
              {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} found
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-primary underline"
            >
              Clear search
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-ink/6 animate-pulse">
                <div className="aspect-[4/3] bg-ink/6" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-ink/6 rounded w-3/4" />
                  <div className="h-4 bg-ink/6 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <UtensilsCrossed size={36} className="mx-auto text-ink/20 mb-3" />
            <p className="font-display font-semibold text-ink text-base">
              {searchQuery ? 'No matching items found' : 'No items in this category yet'}
            </p>
            <p className="text-ink-muted text-xs mt-1">
              {searchQuery ? 'Try checking for typos or searching a different term.' : 'Please select another category above.'}
            </p>
          </div>
        ) : (
          <div
            key={activeCat + (searchQuery ? '-search' : '')}
            className={clsx(
              'grid grid-cols-2 gap-3',
              slideDirection === 'left' && 'anim-slide-left',
              slideDirection === 'right' && 'anim-slide-right'
            )}
            role="list"
            aria-label="Menu items"
          >
            {filteredProducts.map((p) => (
              <div key={p._id} role="listitem">
                <ProductCard
                  product={p}
                  categoryName={categories.find((c) => c._id === p.categoryId?._id)?.name || ''}
                  onOpen={setSheetProduct}
                />
              </div>
            ))}
          </div>
        )}

        {/* High-visibility Powered by LayoScan */}
        <PoweredBy />
      </div>

      {/* ── Floating Action Button: Go to Table Orders ────────────────── */}
      <TableOrdersFAB
        tableOrders={tableOrders}
        hasCart={itemCount > 0}
        onClick={() => {
          const latest = tableOrders?.rounds?.[tableOrders.rounds.length - 1];
          navigate(latest ? `/order/${latest.id}` : '/orders');
        }}
      />

      {/* ── Sticky Cart Bar ───────────────────────────────────────────── */}
      {itemCount > 0 && (
        <CartBar
          itemCount={itemCount}
          subtotal={subtotal}
          onTap={() => navigate('/checkout')}
        />
      )}

      {/* ── Product detail modal sheet ────────────────────────────────── */}
      {sheetProduct && (
        <ProductSheet
          product={sheetProduct}
          categoryName={categories.find((c) => c._id === sheetProduct.categoryId?._id)?.name || ''}
          onClose={() => setSheetProduct(null)}
        />
      )}
    </div>
  );
}
