import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WifiOff, Navigation, AlertTriangle, ShieldCheck, Compass, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import { applyBrandColor } from '../lib/theme';
import { saveVisitedRestaurant } from '../lib/visitedRestaurants';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import MenuSplashLoader from '../components/MenuSplashLoader';
import logo from '../assets/logo.png';
import cafeLogoPlaceholder from '../assets/cafe_logo_placeholder.png';
import toast from 'react-hot-toast';

/**
 * QR entry point — resolves the table, applies restaurant brand theme,
 * checks offline connectivity, handles nearby location requirements,
 * stores session, then redirects to /menu.
 */
export default function Resolve() {
  const { qrToken } = useParams();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const setSession          = useSessionStore((s) => s.setSession);
  const setLocationVerified = useSessionStore((s) => s.setLocationVerified);

  const [isOffline, setIsOffline]             = useState(!navigator.onLine);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [locationError, setLocationError]     = useState('');
  const [distanceInfo, setDistanceInfo]       = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isVerifyingLoc, setIsVerifyingLoc]   = useState(false);
  const [confirmMigrate, setConfirmMigrate]   = useState(false);
  const [splashPhase, setSplashPhase]         = useState('scanning'); // 'scanning' | 'connected' | 'loading-menu' | 'ready'

  const existing = useSessionStore.getState();

  // Listen to network changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      refetch();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    enabled: !isOffline,
  });

  const requestGeolocation = (sessionTokenToVerify, branchInfo, onVerified, onBypass) => {
    if (!navigator.geolocation) {
      if (branchInfo?.locationStrictMode) {
        setLocationBlocked(true);
        setLocationError('Geolocation services are not supported by your browser or device.');
      } else {
        setLocationVerified(false);
        if (onBypass) onBypass();
      }
      return;
    }

    setIsVerifyingLoc(true);
    setLocationError('');
    setPermissionDenied(false);
    setDistanceInfo(null);

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
            const meters = res.data?.distanceMeters || Math.round(res.data?.distance || 0);
            setDistanceInfo(meters);

            if (branchInfo?.locationStrictMode) {
              // Strict mode: block user from entering menu
              setLocationBlocked(true);
              setLocationError(
                `You appear to be ${meters}m away from the cafe. Location access inside the restaurant is required to view the menu.`
              );
            } else {
              // Non-strict mode: allow them to view menu in browsing mode!
              setLocationVerified(false);
              setLocationBlocked(false);
              toast('Browsing menu in preview mode · Ordering requires verifying location at the cafe.', {
                icon: '👀',
                duration: 4500,
              });
              if (onBypass) onBypass();
            }
          }
        } catch (error) {
          if (branchInfo?.locationStrictMode) {
            setLocationBlocked(true);
            setLocationError(
              error.response?.data?.message || 'Could not verify that you are at the cafe. Please try again.'
            );
          } else {
            setLocationVerified(false);
            setLocationBlocked(false);
            if (onBypass) onBypass();
          }
        } finally {
          setIsVerifyingLoc(false);
        }
      },
      (error) => {
        setIsVerifyingLoc(false);
        if (branchInfo?.locationStrictMode) {
          setLocationBlocked(true);
          if (error.code === error.PERMISSION_DENIED) {
            setPermissionDenied(true);
            setLocationError('Location permission was denied. Location access is required to view the menu.');
          } else if (error.code === error.TIMEOUT) {
            setLocationError('Location request timed out. Please tap retry.');
          } else {
            setLocationError('Unable to detect your device GPS location. Please ensure location is enabled.');
          }
        } else {
          // Non-strict mode: bypass blocker to menu
          setLocationVerified(false);
          setLocationBlocked(false);
          toast('Browsing menu in preview mode · Ordering requires verifying location at the cafe.', {
            icon: '👀',
            duration: 4500,
          });
          if (onBypass) onBypass();
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (data?.success && !data?.tableSwitchPrompt) {
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

      const orderStillActive =
        isSameTable &&
        myActiveOrderId &&
        Array.isArray(data.activeOrders) &&
        data.activeOrders.some(
          (o) => o.id === myActiveOrderId && !['served', 'cancelled'].includes(o.status)
        );

      const destination = orderStillActive ? `/order/${myActiveOrderId}` : '/menu';

      // Prefetch public products into React Query cache for zero-delay menu transition
      if (data.restaurant?._id) {
        queryClient.prefetchQuery({
          queryKey: ['public-products', data.restaurant._id],
          queryFn: () =>
            api.get('/products/public', { params: { restaurantId: data.restaurant._id } }).then((r) => r.data),
          staleTime: 60_000,
        });
      }

      setSession({
        qrToken,
        restaurant:   data.restaurant,
        branch:       data.branch,
        table:        data.table,
        sessionToken: data.sessionToken,
        freshSession: !orderStillActive,
      });

      const proceed = () => {
        setSplashPhase('ready');
        setTimeout(() => {
          navigate(destination, { replace: true });
        }, 400);
      };

      const hasConfiguredGps =
        Number.isFinite(data.branch?.location?.lat) && Number.isFinite(data.branch?.location?.lng);
      const isStrict = Boolean(data.branch?.locationStrictMode);

      // Advance through splash story: Connected (Step 2) -> Loading Menu (Step 3) -> Ready (Step 4 & 5)
      setSplashPhase('connected');

      const timer1 = setTimeout(() => {
        setSplashPhase('loading-menu');

        const timer2 = setTimeout(() => {
          if (hasConfiguredGps && data.table?.sessionLocationVerified !== true) {
            if (isStrict) {
              requestGeolocation(data.sessionToken, data.branch, proceed, null);
            } else {
              requestGeolocation(data.sessionToken, data.branch, proceed, proceed);
            }
          } else {
            proceed();
          }
        }, 700);

        return () => clearTimeout(timer2);
      }, 600);

      return () => clearTimeout(timer1);
    }
  }, [data, qrToken, setSession, navigate, queryClient]);

  /* ── 1. Explicit Offline Notification Screen ─────────────────────── */
  if (isOffline) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-paper animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5 shadow-sm">
          <WifiOff size={32} />
        </div>
        <h1 className="font-display font-bold text-2xl text-ink mb-2">You're currently offline</h1>
        <p className="text-ink-muted text-sm max-w-sm leading-relaxed mb-6">
          Please connect to the internet (Wi-Fi or cellular mobile data) to view the menu and connect to your table.
        </p>

        <button
          type="button"
          onClick={() => {
            if (navigator.onLine) {
              setIsOffline(false);
              refetch();
            } else {
              toast.error('Still offline. Please check your internet connection.');
            }
          }}
          className="w-full max-w-xs py-3.5 px-6 rounded-2xl text-white font-semibold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
          style={{ background: 'var(--color-primary, #0D9488)' }}
        >
          <RefreshCw size={16} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  /* ── 2. Respectful Location Blocker / Verification State ─────────── */
  if (locationBlocked) {
    const isStrict = Boolean(data?.branch?.locationStrictMode);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-paper animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-xl border border-ink/10 relative overflow-hidden">
          {/* Top brand accent */}
          <div
            className="absolute top-0 left-0 right-0 h-2"
            style={{ background: data?.restaurant?.brandColor || 'var(--color-primary, #0D9488)' }}
          />

          <div className="relative w-16 h-16 mx-auto mb-4 mt-1">
            <img
              src={data?.restaurant?.logoUrl || cafeLogoPlaceholder}
              alt={data?.restaurant?.name || 'Cafe'}
              className="w-16 h-16 rounded-2xl object-cover border border-ink/10 shadow-md bg-paper mx-auto"
              onError={(e) => { e.currentTarget.src = cafeLogoPlaceholder; }}
            />
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-white flex items-center justify-center shadow-sm"
              style={{ background: data?.restaurant?.brandColor || 'var(--color-primary, #0D9488)' }}
            >
              <Compass size={13} />
            </div>
          </div>

          <p className="text-xs uppercase tracking-wider font-semibold text-ink-muted mb-1">
            {data?.restaurant?.name || 'Welcome'}
            {data?.table?.label ? ` · ${data.table.label}` : ''}
          </p>
          <h2 className="font-display font-bold text-xl text-ink mb-2">
            Confirm your table presence
          </h2>
          <p className="text-xs text-ink-muted leading-relaxed mb-4">
            {isStrict
              ? `To ensure orders and service are prepared directly for your table, ${data?.restaurant?.name || 'this cafe'} requires guests to verify their location inside the cafe.`
              : `To prepare and deliver your orders directly to your table, we check that you're seated with us.`}
          </p>

          {distanceInfo && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <span>📍</span>
                <span>Distance: ~{distanceInfo} meters away</span>
              </p>
              <p className="text-[11px] text-amber-800/80">
                You must be inside the venue to order.
              </p>
            </div>
          )}

          {locationError && !distanceInfo && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-left text-xs text-rose-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                <p className="font-semibold">{locationError}</p>
              </div>
              {permissionDenied && (
                <div className="text-[11px] text-rose-700/90 pl-6 space-y-1">
                  <p className="font-medium">How to allow location:</p>
                  <p>1. Tap the <strong>lock 🔒</strong> icon in your browser's address bar.</p>
                  <p>2. Set <strong>Location</strong> to <strong>Allow</strong>.</p>
                  <p>3. Tap the button below to verify.</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() =>
                requestGeolocation(
                  data?.sessionToken || existing.sessionToken,
                  data?.branch,
                  () => navigate('/menu', { replace: true }),
                  () => navigate('/menu', { replace: true })
                )
              }
              disabled={isVerifyingLoc}
              className="w-full py-3.5 px-4 rounded-2xl text-white font-semibold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: data?.restaurant?.brandColor || 'var(--color-primary, #0D9488)' }}
            >
              {isVerifyingLoc ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Checking GPS location…</span>
                </>
              ) : (
                <>
                  <Navigation size={16} />
                  <span>Allow Location & Verify</span>
                </>
              )}
            </button>

            {/* If NOT strict mode: allow diner to explore the menu */}
            {!isStrict && (
              <button
                type="button"
                onClick={() => {
                  setLocationVerified(false);
                  navigate('/menu', { replace: true });
                }}
                className="w-full py-3 px-4 rounded-2xl bg-ink/5 hover:bg-ink/10 text-ink font-semibold text-xs transition-colors"
              >
                Explore Menu First (Browse Only)
              </button>
            )}
          </div>

          <p className="text-[11px] text-ink/50 mt-4 flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} className="text-teal shrink-0" />
            <span>Used only to confirm you're at the cafe. Never tracked.</span>
          </p>
        </div>
      </div>
    );
  }

  /* ── 3. Table Switch Migration Prompt ────────────────────────────── */
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
            style={{ background: data?.restaurant?.brandColor || 'var(--color-primary, #0D9488)' }}
          >
            Move Orders to {data.newTable?.label}
          </button>
          <button
            type="button"
            onClick={() => {
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
      <MenuSplashLoader
        phase="error"
        errorMessage="This table isn't available right now — please ask a staff member or try scanning again."
        onRetry={refetch}
      />
    );
  }

  /* ── 4. Loading / Resolving State ────────────────────────────────── */
  return (
    <MenuSplashLoader
      phase={splashPhase}
      restaurant={data?.restaurant}
      table={data?.table}
      onRetry={refetch}
    />
  );
}
