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
  const setSession          = useSessionStore((s) => s.setSession);
  const setLocationVerified = useSessionStore((s) => s.setLocationVerified);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [locationError, setLocationError]     = useState('');
  const [isVerifyingLoc, setIsVerifyingLoc]   = useState(false);
  const [confirmMigrate, setConfirmMigrate]   = useState(false);

  const existing = useSessionStore.getState();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['table-resolve', qrToken, confirmMigrate],
    queryFn: () =>
      api.get(`/public/table/${qrToken}`, {
        params: {
          sessionToken:         existing.sessionToken || undefined,
          previousTableId:      existing.table?._id && existing.qrToken !== qrToken ? existing.table._id : undefined,
          previousSessionToken: existing.sessionToken && existing.qrToken !== qrToken ? existing.sessionToken : undefined,
          migrateTable:         confirmMigrate ? 'true' : undefined,
        },
      }).then((r) => r.data),
    retry: false,
    staleTime: 0,
  });

  const requestGeolocation = (sessionTokenToVerify, onVerified) => {
    if (!navigator.geolocation) {
      setLocationBlocked(true);
      setLocationError('Geolocation services are not supported by your browser.');
      return;
    }

    setIsVerifyingLoc(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await api.post(`/public/table/${qrToken}/verify-location`, {
            sessionToken: sessionTokenToVerify,
            lat: coords.latitude,
            lng: coords.longitude,
          });

          if (res.data?.verified === true || res.data?.verified === null) {
            setLocationVerified(true);
            setLocationBlocked(false);
            if (onVerified) onVerified();
          } else {
            setLocationBlocked(true);
            setLocationError(
              `You appear to be ${res.data?.distanceMeters || 'too far'} meters away from the cafe. Location access inside the restaurant is mandatory.`
            );
          }
        } catch (error) {
          setLocationBlocked(true);
          setLocationError(
            error.response?.data?.message || 'Could not verify that you are at the cafe. Please try again.'
          );
        } finally {
          setIsVerifyingLoc(false);
        }
      },
      (error) => {
        setIsVerifyingLoc(false);
        setLocationBlocked(true);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            'Location permission was denied. Location access is mandatory to view the menu and place orders.'
          );
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out. Please tap retry.');
        } else {
          setLocationError('Unable to detect your device location. Please ensure GPS is turned on.');
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (data?.success && !data?.tableSwitchPrompt) {
      // Apply per-restaurant brand color to CSS custom properties
      applyBrandColor(data.restaurant?.brandColor);

      // Save restaurant to visited list
      saveVisitedRestaurant({
        restaurant: data.restaurant,
        branch:     data.branch,
        qrToken,
      });

      const currentStore = useSessionStore.getState();
      const isSameTable = currentStore.qrToken === qrToken;
      const myActiveOrderId = currentStore.activeOrderId;

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

      const hasConfiguredGps =
        Number.isFinite(data.branch?.location?.lat) && Number.isFinite(data.branch?.location?.lng);

      if (hasConfiguredGps && data.table?.sessionLocationVerified !== true) {
        requestGeolocation(data.sessionToken, proceed);
      } else {
        proceed();
      }
    }
  }, [data, qrToken, setSession, navigate]);

  /* ── Interactive Location Blocked / Re-prompt State ──────────────── */
  if (locationBlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-paper animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mb-5 shadow-sm">
          <span className="text-3xl">📍</span>
        </div>
        <h1 className="font-display font-bold text-2xl text-ink mb-2">Location access required</h1>
        <p className="text-ink-muted text-xs sm:text-sm max-w-sm leading-relaxed mb-4">
          To ensure orders are only placed from inside the restaurant, location permission is{' '}
          <strong className="text-ink">strictly mandatory</strong>.
        </p>

        {locationError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left text-xs text-rose-800 max-w-sm w-full space-y-1.5">
            <p className="font-semibold">{locationError}</p>
            <p className="text-[11px] text-rose-700/80">
              Please enable location in your browser settings (tap 🔒 lock icon in the address bar) and tap below.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => requestGeolocation(data?.sessionToken || existing.sessionToken, () => navigate('/menu', { replace: true }))}
          disabled={isVerifyingLoc}
          className="w-full max-w-xs py-3.5 px-6 rounded-2xl text-white font-semibold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--color-primary, #0D9488)' }}
        >
          {isVerifyingLoc ? 'Detecting GPS location…' : 'Allow Location & Verify'}
        </button>
      </div>
    );
  }

  /* ── Table Switch Migration Prompt ───────────────────────────────── */
  if (data?.tableSwitchPrompt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-paper animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5 shadow-sm">
          <span className="text-3xl">🪑</span>
        </div>
        <h1 className="font-display font-bold text-2xl text-ink mb-2">Move to {data.newTable?.label}?</h1>
        <p className="text-ink-muted text-sm max-w-sm leading-relaxed mb-6">
          You currently have <strong>{data.activeOrdersCount} active order(s)</strong> at{' '}
          <strong>{data.previousTable?.label}</strong>. Would you like to move your order to{' '}
          <strong>{data.newTable?.label}</strong>?
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={() => setConfirmMigrate(true)}
            className="w-full py-3.5 px-6 rounded-2xl text-white font-semibold text-sm shadow-md active:scale-95 transition-all"
            style={{ background: 'var(--color-primary, #0D9488)' }}
          >
            Move Orders to {data.newTable?.label}
          </button>
          <button
            type="button"
            onClick={() => {
              // Return to previous table
              navigate(existing.activeOrderId ? `/order/${existing.activeOrderId}` : '/menu', { replace: true });
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-ink/6 hover:bg-ink/10 text-ink font-semibold text-sm transition-colors"
          >
            Stay at {data.previousTable?.label}
          </button>
        </div>
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
