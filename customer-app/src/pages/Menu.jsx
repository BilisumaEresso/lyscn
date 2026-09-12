import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, Minus, Trash2, ImageOff, Info, MapPin } from 'lucide-react';
import clsx from 'clsx';
import api from '../lib/api';
import { applyBrandColor } from '../lib/theme';
import { useSessionStore } from '../store/sessionStore';
import { useCartStore, cartItemCount, cartSubtotal } from '../store/cartStore';
import logo from '../assets/logo.png';
import AssistanceButton from '../components/AssistanceButton';
import Currency, { formatBirr } from '../components/Currency';

// ── "Powered by LayoScan" mark ────────────────────────────────────────────────
function PoweredBy() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-5 opacity-30">
      <img src={logo} alt="" aria-hidden="true" className="w-4 h-4 rounded object-cover" loading="lazy" />
      <span className="text-[10px] text-ink-muted font-medium tracking-wide">
        Powered by LayoScan
      </span>
    </div>
  );
}

// ── Product detail bottom sheet ───────────────────────────────────────────────
function ProductSheet({ product, onClose }) {
  const addItem = useCartStore((s) => s.addItem);
  const [qty, setQty]         = useState(1);
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
  const unitPrice     = product.price + modifierExtra;
  const total         = unitPrice * qty;

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
      productId:         product._id,
      name:              product.name,
      unitPrice,
      qty,
      selectedModifiers: getSelectedOptions(),
      subtotal:          total,
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
            <div className="w-full h-40 flex items-center justify-center" style={{ background: 'var(--color-surface-wash)' }}>
              <ImageOff size={36} className="text-ink/20" strokeWidth={1.25} />
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

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ product, onOpen }) {
  const addItem    = useCartStore((s) => s.addItem);
  const hasRequired = (product.modifierGroups ?? []).some((g) => g.required);

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    addItem({
      productId:         product._id,
      name:              product.name,
      unitPrice:         product.price,
      qty:               1,
      selectedModifiers: [],
      subtotal:          product.price,
    });
    toast.success(`Added ${product.name}`);
  };

  return (
    <div
      onClick={() => onOpen(product)}
      role="button"
      tabIndex={0}
      aria-label={`View ${product.name}, ${formatBirr(product.price)}`}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(product)}
      className="bg-white rounded-2xl overflow-hidden border border-ink/6 cursor-pointer active:scale-[0.98] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ '--tw-outline-color': 'var(--color-primary)' }}
    >
      <div className="relative aspect-[4/3]" style={{ background: 'var(--color-surface-wash)' }}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff size={22} className="text-ink/20" strokeWidth={1.25} />
          </div>
        )}
        {/* Quick-add button */}
        {!hasRequired && (
          <button
            onClick={handleQuickAdd}
            aria-label={`Quick add ${product.name}`}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
            style={{
              background:   'var(--color-primary)',
              outlineColor: 'var(--color-primary)',
            }}
          >
            <Plus size={16} className="text-white" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className="p-3">
        <p className="font-semibold text-ink text-sm leading-tight mb-1 line-clamp-2">
          {product.name}
        </p>
        <p className="font-display font-bold text-ink text-base">
          <Currency value={product.price} />
        </p>
        {hasRequired && (
          <p className="text-xs text-ink-muted mt-1">Tap to customise</p>
        )}
      </div>
    </div>
  );
}

// ── Cart bar ──────────────────────────────────────────────────────────────────
function CartBar({ itemCount, subtotal, onTap }) {
  return (
    <div
      className="sticky-bottom px-4"
      style={{ animation: 'slide-up-spring 500ms cubic-bezier(0.34,1.56,0.64,1)' }}
    >
      <button
        onClick={onTap}
        aria-label={`View cart — ${itemCount} items, ${formatBirr(subtotal)}`}
        className="w-full rounded-2xl px-5 py-4 flex items-center justify-between shadow-xl active:scale-[0.98] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          background:   'var(--color-primary)',
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
  const navigate  = useNavigate();
  const session   = useSessionStore();
  const itemCount = useCartStore(cartItemCount);
  const subtotal  = useCartStore(cartSubtotal);

  const [activeCat, setActiveCat]       = useState(null);
  const [sheetProduct, setSheetProduct] = useState(null);
  const catRowRef = useRef(null);

  const { restaurant, branch, table } = session;
  const restaurantId = restaurant?._id;

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

  const { data, isLoading } = useQuery({
    queryKey: ['public-products', restaurantId],
    queryFn: () =>
      api.get('/products/public', { params: { restaurantId } }).then((r) => r.data),
    enabled: !!restaurantId,
    staleTime: 60_000,
  });

  const products = data?.products ?? [];

  // Build categories from populated products
  const categories = (() => {
    const seen = new Map();
    for (const p of products) {
      const cat = p.categoryId;
      if (cat && !seen.has(cat._id)) seen.set(cat._id, cat);
    }
    return [...seen.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  })();

  useEffect(() => {
    if (categories.length > 0 && !activeCat) {
      setActiveCat(categories[0]._id);
    }
  }, [categories, activeCat]);

  const visibleProducts = activeCat
    ? products.filter((p) => p.categoryId?._id === activeCat)
    : products;

  const handleCatClick = (catId) => {
    setActiveCat(catId);
    const el = document.getElementById(`cat-chip-${catId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  return (
    <div className="min-h-screen bg-paper max-w-[560px] mx-auto relative">
      {/* ── Header / Cover ─────────────────────────────────────────────── */}
      <div className="relative h-56 overflow-hidden">
        {restaurant?.coverUrl ? (
          <img
            src={restaurant.coverUrl}
            alt={`${restaurant.name} cover`}
            className="w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full gradient-cover-fallback" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent" />

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
          {restaurant?.logoUrl && (
            <img
              src={restaurant.logoUrl}
              alt={`${restaurant.name} logo`}
              className="w-12 h-12 rounded-2xl border-2 border-white/30 shadow-md object-cover shrink-0"
              loading="eager"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-display font-bold text-white text-xl leading-tight truncate">
                {restaurant?.name}
              </h1>
            </div>
            <p className="text-white/70 text-xs font-medium mt-0.5">
              {branch?.name} · {table?.label}
            </p>
            {(restaurant?.contactInfo?.address || branch?.address) && (
              <p className="text-white/65 text-xs mt-1 flex items-center gap-1 truncate">
                <MapPin size={11} /> {restaurant?.contactInfo?.address || branch.address}
              </p>
            )}
            {restaurant?.description && (
              <p className="text-white/80 text-xs mt-1 leading-snug line-clamp-2">
                {restaurant.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky category chip row ──────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b border-ink/6">
        <div
          ref={catRowRef}
          role="tablist"
          aria-label="Menu categories"
          className="flex items-center gap-2 px-4 py-3 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {categories.map((cat) => {
            const isActive = activeCat === cat._id;
            return (
              <button
                key={cat._id}
                id={`cat-chip-${cat._id}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleCatClick(cat._id)}
                className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={isActive ? {
                  background:   'var(--color-surface-wash)',
                  color:        'var(--color-primary-dark, var(--color-primary))',
                  outlineColor: 'var(--color-primary)',
                } : {
                  background: 'rgba(18,26,44,0.05)',
                  color:      '#5B6B7A',
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Product grid ─────────────────────────────────────────────── */}
      <div className="px-4 py-4" style={{ paddingBottom: itemCount > 0 ? '96px' : '8px' }}>
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
        ) : visibleProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ink-muted text-sm">No items in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3" role="list" aria-label="Menu items">
            {visibleProducts.map((p) => (
              <div key={p._id} role="listitem">
                <ProductCard product={p} onOpen={setSheetProduct} />
              </div>
            ))}
          </div>
        )}

        {/* Powered by LayoScan mark */}
        <PoweredBy />
      </div>

      {/* ── Cart bar ─────────────────────────────────────────────────── */}
      {itemCount > 0 && (
        <CartBar
          itemCount={itemCount}
          subtotal={subtotal}
          onTap={() => navigate('/checkout')}
        />
      )}

      {/* ── Product detail sheet ─────────────────────────────────────── */}
      {sheetProduct && (
        <ProductSheet
          product={sheetProduct}
          onClose={() => setSheetProduct(null)}
        />
      )}
    </div>
  );
}
