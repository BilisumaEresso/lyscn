import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import { applyBrandColor } from '../lib/theme';
import { saveVisitedRestaurant } from '../lib/visitedRestaurants';
import logo from '../assets/logo.png';

/**
 * QR entry point — resolves the table, applies restaurant brand theme,
 * stores session, then redirects to /menu.
 */
export default function Resolve() {
  const { qrToken } = useParams();
  const navigate    = useNavigate();
  const setSession  = useSessionStore((s) => s.setSession);
  const [locationBlocked, setLocationBlocked] = useState(false);

  const existingSessionToken = useSessionStore.getState().sessionToken;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['table-resolve', qrToken],
    queryFn: () =>
      api.get(`/public/table/${qrToken}`, {
        params: existingSessionToken ? { sessionToken: existingSessionToken } : undefined,
      }).then((r) => r.data),
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (data?.success) {
      // Apply per-restaurant brand color to CSS custom properties
      applyBrandColor(data.restaurant?.brandColor);

      // Save restaurant to visited list
      saveVisitedRestaurant({
        restaurant: data.restaurant,
        branch:     data.branch,
        qrToken,
      });

      const existing = useSessionStore.getState();
      const isSameTable = existing.qrToken === qrToken;
      const myActiveOrderId = existing.activeOrderId;

      // If user had an active order on this device for this table and it's still active, resume to order tracking
      const orderStillActive =
        isSameTable &&
        myActiveOrderId &&
        Array.isArray(data.activeOrders) &&
        data.activeOrders.some(
          (o) => o.id === myActiveOrderId && !['served', 'cancelled'].includes(o.status)
        );

      const destination = orderStillActive ? `/order/${myActiveOrderId}` : '/menu';

      // If there are no ongoing active orders, start a fresh session clean of past rounds
      setSession({
        qrToken,
        restaurant:   data.restaurant,
        branch:       data.branch,
        table:        data.table,
        sessionToken: data.sessionToken,
        freshSession: !orderStillActive,
      });

      const proceed = () => {
        navigate(destination, { replace: true });
      };

      if (data.locationCheckRequired && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async ({ coords }) => {
            try {
              await api.post(`/public/table/${qrToken}/verify-location`, {
                sessionToken: data.sessionToken,
                lat: coords.latitude,
                lng: coords.longitude,
              });
              proceed();
            } catch (error) {
              if (error.response?.status === 403) {
                setLocationBlocked(true);
                return;
              }
              proceed();
            }
          },
          () => {
            if (data.branch?.locationStrictMode) setLocationBlocked(true);
            else proceed();
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
        );
      } else if (data.locationCheckRequired && data.branch?.locationStrictMode) {
        setLocationBlocked(true);
      } else {
        proceed();
      }
    }
  }, [data, qrToken, setSession, navigate]);

  /* ── Error state ──────────────────────────────────────────────────── */
  if (locationBlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-paper">
        <h1 className="font-display font-bold text-2xl text-ink mb-3">Location access required</h1>
        <p className="text-ink-muted text-sm max-w-sm leading-relaxed">
          This restaurant only accepts orders while you are nearby. Enable location access and scan the QR code again.
        </p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 px-5 py-3 rounded-2xl text-white font-semibold" style={{ background: 'var(--color-primary)' }}>
          Try again
        </button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-paper">
        <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mb-6 shadow-lg overflow-hidden">
          <img src={logo} alt="LayoScan" className="w-16 h-16 object-cover" loading="eager" />
        </div>
        <h1 className="font-display font-bold text-2xl text-ink mb-3">
          Table not available
        </h1>
        <p className="text-ink-muted text-base max-w-xs leading-relaxed">
          This table isn't available right now — ask a staff member for help.
        </p>
      </div>
    );
  }

  /* ── Loading / resolving state (the scan moment) ─────────────────── */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-paper">
      <div className="relative mb-8">
        <div
          className="absolute inset-0 rounded-2xl opacity-20 scale-110 animate-pulse-slow"
          style={{ background: 'var(--color-primary)' }}
        />
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl overflow-hidden relative gradient-brand"
        >
          <img src={logo} alt="LayoScan" className="w-20 h-20 object-cover" loading="eager" />
        </div>
      </div>

      <p className="font-display font-semibold text-xl text-ink mb-2">
        Setting up your table…
      </p>
      <p className="text-ink-muted text-sm animate-pulse-slow">
        Scanning QR code
      </p>

      <div className="flex items-center gap-1.5 mt-6">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background:  'var(--color-primary)',
              animation:   `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
