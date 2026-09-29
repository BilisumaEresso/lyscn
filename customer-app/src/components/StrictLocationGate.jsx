import { useState } from 'react';
import { MapPin, Navigation, AlertTriangle, ShieldCheck, RefreshCw, Compass } from 'lucide-react';
import api from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import toast from 'react-hot-toast';
import cafeLogoPlaceholder from '../assets/cafe_logo_placeholder.png';

/**
 * StrictLocationGate
 *
 * Enforces location restrictions based on branch settings:
 * - If locationStrictMode is OFF (toggle is not on):
 *     Customers can fully browse the menu without being blocked.
 *     However, ordering is blocked until location is verified.
 * - If locationStrictMode is ON (strict mode):
 *     Customers cannot do anything, cannot even view the menu, until
 *     location is strictly verified inside the cafe radius.
 * - Displays a warm, polite, and respectful verification dialog.
 */
export default function StrictLocationGate({ onSuccess, onBypass, isOrderingGate = false }) {
  const session = useSessionStore();
  const setLocationVerified = useSessionStore((s) => s.setLocationVerified);

  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState(null);

  const branch = session.branch;
  const restaurant = session.restaurant;
  const table = session.table;
  const qrToken = session.qrToken;
  const sessionToken = session.sessionToken;

  const branchHasLocation =
    Number.isFinite(branch?.location?.lat) && Number.isFinite(branch?.location?.lng);
  const isStrictMode = Boolean(branch?.locationStrictMode);

  // If no GPS configured or already verified, nothing to gate
  if (!branchHasLocation || session.locationVerified) {
    return null;
  }

  // If NOT in strict mode and this is not specifically the checkout/ordering gate,
  // allow the user to freely browse the menu!
  if (!isStrictMode && !isOrderingGate) {
    return null;
  }

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser or device.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');
    setPermissionDenied(false);
    setDistanceInfo(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await api.post(`/public/table/${qrToken}/verify-location`, {
            sessionToken,
            lat: coords.latitude,
            lng: coords.longitude,
          });

          if (res.data?.verified === true) {
            setLocationVerified(true);
            toast.success(`Welcome to ${restaurant?.name || 'the cafe'}! Location confirmed.`);
            if (onSuccess) onSuccess();
          } else if (res.data?.verified === false) {
            const meters = res.data.distanceMeters || Math.round(res.data.distance || 0);
            setDistanceInfo(meters);
            setErrorMessage(
              `You appear to be ${meters}m away from the cafe. Location verification is required on-site to place orders.`
            );
          } else {
            setLocationVerified(true);
            if (onSuccess) onSuccess();
          }
        } catch (err) {
          const msg =
            err.response?.data?.message ||
            'Location check could not verify your position. Please ensure you are inside the cafe and try again.';
          setErrorMessage(msg);
        } finally {
          setIsVerifying(false);
        }
      },
      (error) => {
        setIsVerifying(false);
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setErrorMessage(
            'Location permission was denied. Please allow location access in your browser to verify your table.'
          );
        } else if (error.code === error.TIMEOUT) {
          setErrorMessage('Location request timed out. Please tap retry.');
        } else {
          setErrorMessage('Unable to detect your device GPS location. Please ensure location services are turned on.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleBypassToMenu = () => {
    if (onBypass) {
      onBypass();
    } else {
      toast('Browsing menu in preview mode · Ordering is enabled when seated at the cafe.', {
        icon: '👀',
        duration: 4000,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl border border-ink/10 relative overflow-hidden">
        {/* Top brand accent */}
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ background: restaurant?.brandColor || 'var(--color-primary, #0D9488)' }}
        />

        {/* Cafe Logo / Welcome Avatar */}
        <div className="relative w-16 h-16 mx-auto mb-4 mt-1">
          <img
            src={restaurant?.logoUrl || cafeLogoPlaceholder}
            alt={restaurant?.name || 'Cafe'}
            className="w-16 h-16 rounded-2xl object-cover border border-ink/10 shadow-md bg-paper mx-auto"
            onError={(e) => { e.currentTarget.src = cafeLogoPlaceholder; }}
          />
          <div
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-white flex items-center justify-center shadow-sm"
            style={{ background: restaurant?.brandColor || 'var(--color-primary, #0D9488)' }}
          >
            <Compass size={13} />
          </div>
        </div>

        {/* Welcome Greeting */}
        <p className="text-xs uppercase tracking-wider font-semibold text-ink-muted mb-1">
          {restaurant?.name || 'Welcome'}
          {table?.label ? ` · ${table.label}` : ''}
        </p>
        <h2 className="font-display font-bold text-xl text-ink mb-2">
          {isOrderingGate ? 'Confirm presence to order' : 'Confirm your table presence'}
        </h2>
        <p className="text-xs text-ink-muted leading-relaxed mb-4 px-1">
          {isStrictMode
            ? `To ensure orders and service are delivered directly to your table, ${restaurant?.name || 'this cafe'} requires guests to verify their physical presence before accessing the menu.`
            : `To make sure our kitchen prepares and serves your dishes right to your table, please confirm you are dining with us today.`}
        </p>

        {/* Distance guidance if too far */}
        {distanceInfo && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>📍</span>
              <span>Distance: ~{distanceInfo} meters from cafe</span>
            </p>
            <p className="text-[11px] text-amber-800/80">
              Orders can only be prepared when you are seated at the cafe within {branch?.location?.radiusMeters || 150}m.
            </p>
          </div>
        )}

        {/* Error / Denial Guidance */}
        {errorMessage && !distanceInfo && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-left text-xs text-rose-800 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="font-semibold">{errorMessage}</p>
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

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleRequestLocation}
            disabled={isVerifying}
            className="w-full py-3.5 px-4 rounded-2xl text-white font-semibold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: restaurant?.brandColor || 'var(--color-primary, #0D9488)' }}
          >
            {isVerifying ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Checking your location…</span>
              </>
            ) : (
              <>
                <Navigation size={16} />
                <span>{errorMessage ? 'Retry Location Check' : 'Verify My Location'}</span>
              </>
            )}
          </button>

          {/* If NOT in strict mode: allow diner to explore the menu without ordering */}
          {!isStrictMode && (
            <button
              type="button"
              onClick={handleBypassToMenu}
              className="w-full py-3 px-4 rounded-2xl bg-ink/5 hover:bg-ink/10 text-ink font-semibold text-xs transition-colors"
            >
              Explore Menu First (Browse Only)
            </button>
          )}
        </div>

        {/* Privacy Note */}
        <p className="text-[11px] text-ink/50 mt-4 flex items-center justify-center gap-1.5">
          <ShieldCheck size={13} className="text-teal shrink-0" />
          <span>Used exclusively for on-table physical presence. Never shared.</span>
        </p>
      </div>
    </div>
  );
}
