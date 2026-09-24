import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import Currency from '../components/Currency';
import { Minus, Plus, Trash2, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import api from '../lib/api';
import { applyBrandColor } from '../lib/theme';
import { useSessionStore } from '../store/sessionStore';
import { useCartStore, cartItemCount, cartSubtotal } from '../store/cartStore';
import PoweredBy from '../components/PoweredBy';
import { getRestaurantLogo } from '../lib/branding';

export default function Checkout() {
  const navigate    = useNavigate();
  const session     = useSessionStore();
  const items       = useCartStore((s) => s.items);
  const removeItem  = useCartStore((s) => s.removeItem);
  const clearCart   = useCartStore((s) => s.clearCart);
  const itemCount   = useCartStore(cartItemCount);
  const subtotal    = useCartStore(cartSubtotal);

  const [guestName, setGuestName] = useState(session.guestName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoImgError, setLogoImgError] = useState(false);
  const clientOrderIdRef = useRef(uuidv4());

  const { restaurant, branch, table, sessionId, sessionToken } = session;

  useEffect(() => { setLogoImgError(false); }, [restaurant?.logoUrl]);

  // Re-apply brand color on refresh
  useEffect(() => {
    if (restaurant?.brandColor) applyBrandColor(restaurant.brandColor);
  }, [restaurant?.brandColor]);

  // Page title
  useEffect(() => {
    document.title = restaurant?.name ? `${restaurant.name} · Order` : 'LayoScan';
    return () => { document.title = 'LayoScan'; };
  }, [restaurant?.name]);

  const placeMutation = useMutation({
    mutationFn: (body) => api.post('/orders/public', body).then((r) => r.data),
    onSuccess: (data) => {
      clearCart();
      setIsSubmitting(false);
      if (guestName.trim()) {
        useSessionStore.getState().setGuestName(guestName.trim());
      }
      useSessionStore.getState().setActiveOrderId(data.order._id);
      navigate(`/order/${data.order._id}`, { replace: true });
    },
    onError: (err) => {
      setIsSubmitting(false);
      if (err.response?.status === 401 || err.response?.data?.message?.includes('session has expired')) {
        toast.error('Your session has ended — please scan the QR code again to continue ordering.');
        useSessionStore.getState().clearSession();
        navigate('/');
        return;
      }
      toast.error(err.response?.data?.message || 'Failed to place order — please try again.');
    },
  });

  const handlePlaceOrder = () => {
    if (items.length === 0 || isSubmitting || placeMutation.isPending) return;
    setIsSubmitting(true);

    const orderItems = items.map((item) => ({
      productId:         item.productId,
      qty:               item.qty,
      selectedModifiers: (item.selectedModifiers ?? []).map((m) => ({
        groupName:  m.groupName,
        optionName: m.optionName,
      })),
    }));

    placeMutation.mutate({
      restaurantId:  restaurant._id,
      branchId:      branch._id,
      tableId:       table._id,
      sessionId,
      sessionToken,
      clientOrderId: clientOrderIdRef.current,
      guestName:     guestName.trim() || null,
      items:         orderItems,
    });
  };

  const adjustQty = (idx, delta) => {
    const { items: its } = useCartStore.getState();
    const item = its[idx];
    if (!item) return;
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      removeItem(idx);
    } else {
      const updated = [...its];
      updated[idx] = { ...item, qty: newQty, subtotal: item.unitPrice * newQty };
      useCartStore.setState({ items: updated });
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-paper max-w-[560px] mx-auto flex flex-col items-center justify-center px-6 text-center">
        <p className="font-display font-bold text-2xl text-ink mb-2">Your cart is empty</p>
        <p className="text-ink-muted text-sm mb-6">Go back and add some items.</p>
        <button
          onClick={() => navigate('/menu')}
          className="px-6 py-3 rounded-2xl font-semibold text-white transition-colors"
          style={{ background: 'var(--color-primary)' }}
        >
          Browse menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper max-w-[560px] mx-auto pb-40">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b border-ink/6 px-4 py-3.5 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-9 h-9 rounded-xl bg-ink/6 flex items-center justify-center focus-visible:outline focus-visible:outline-2 shrink-0"
          style={{ outlineColor: 'var(--color-primary)' }}
        >
          <ChevronLeft size={20} className="text-ink" />
        </button>
        <img
          src={getRestaurantLogo(restaurant, logoImgError)}
          alt={restaurant?.name || 'Restaurant'}
          className="w-8 h-8 rounded-xl object-cover border border-ink/10 bg-white shrink-0 shadow-2xs"
          onError={() => setLogoImgError(true)}
        />
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-lg text-ink leading-tight truncate">
            {session.orderHistory?.length > 0 ? `Next round (#${session.orderHistory.length + 1})` : 'Your order'}
          </h1>
          <p className="text-[11px] text-ink-muted truncate">
            {restaurant?.name}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="text-xs px-2.5 py-1 rounded-full bg-ink/6 font-semibold text-ink">
            {table?.label}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Line items */}
        <div className="bg-white rounded-2xl border border-ink/6 overflow-hidden">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 px-4 py-4 border-b border-ink/4 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink text-sm">{item.name}</p>
                {item.selectedModifiers?.length > 0 && (
                  <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                    {item.selectedModifiers.map((m) => m.optionName).join(', ')}
                  </p>
                )}
                <p className="text-xs text-ink-muted mt-1"><Currency value={item.unitPrice} /> each</p>
              </div>

              {/* Qty stepper */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => adjustQty(idx, -1)}
                  aria-label={item.qty <= 1 ? `Remove ${item.name}` : `Decrease ${item.name} quantity`}
                  className="w-7 h-7 rounded-lg bg-ink/6 flex items-center justify-center focus-visible:outline focus-visible:outline-2"
                  style={{ outlineColor: 'var(--color-primary)' }}
                >
                  {item.qty <= 1 ? <Trash2 size={13} className="text-danger" /> : <Minus size={13} />}
                </button>
                <span aria-live="polite" className="font-display font-bold text-ink w-5 text-center">
                  {item.qty}
                </span>
                <button
                  onClick={() => adjustQty(idx, 1)}
                  aria-label={`Increase ${item.name} quantity`}
                  className="w-7 h-7 rounded-lg bg-ink/6 flex items-center justify-center focus-visible:outline focus-visible:outline-2"
                  style={{ outlineColor: 'var(--color-primary)' }}
                >
                  <Plus size={13} />
                </button>
              </div>

              <span className="font-bold text-ink text-sm shrink-0 min-w-[52px] text-right">
                <Currency value={item.unitPrice * item.qty} />
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between px-4 py-3 bg-ink/2">
            <span className="text-sm font-medium text-ink-muted">Subtotal (display only)</span>
            <Currency value={subtotal} className="font-display font-bold text-ink text-base" />
          </div>
          <p className="px-4 pb-3 text-[11px] text-ink/40">
            Final total confirmed by server after placing order.
          </p>
        </div>

        {/* Guest name */}
        <div className="bg-white rounded-2xl border border-ink/6 px-4 py-4">
          <label htmlFor="guestName" className="block text-sm font-semibold text-ink mb-1">
            What name should we call your order?
            <span className="ml-1 font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            id="guestName"
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="e.g. Alex"
            maxLength={40}
            className="w-full mt-2 px-4 py-3 rounded-xl border border-ink/12 text-sm bg-paper focus:outline-none"
            style={{ '--focus-color': 'var(--color-primary)' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)'; }}
            onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
          />
        </div>

        {/* Payment notice */}
        <div className="bg-amber/6 border border-amber/20 rounded-2xl px-4 py-3">
          <p className="text-sm text-amber font-medium">Pay your server after ordering</p>
          <p className="text-xs text-amber/80 mt-0.5">
            Online payment isn't available yet — your server will bring your bill.
          </p>
        </div>

        <PoweredBy />
      </div>

      {/* Sticky footer */}
      <div
        className="sticky-bottom px-4 bg-paper/95 backdrop-blur-sm border-t border-ink/6"
        style={{ paddingTop: '12px' }}
      >
        <button
          onClick={handlePlaceOrder}
          disabled={placeMutation.isPending || isSubmitting}
          className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center justify-center gap-2"
          style={{
            background:   (placeMutation.isPending || isSubmitting) ? 'rgba(18,26,44,0.25)' : 'var(--color-primary)',
            color:        'var(--color-on-primary)',
            outlineColor: 'var(--color-primary)',
          }}
        >
          {(placeMutation.isPending || isSubmitting)
            ? 'Placing order…'
            : session.orderHistory?.length > 0
              ? `Place round #${session.orderHistory.length + 1} · ${itemCount} item${itemCount !== 1 ? 's' : ''}`
              : `Place order · ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
