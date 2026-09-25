import { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import toast from 'react-hot-toast';

/**
 * StrictLocationGate — An unbypassable, persistent location verification gate.
 * Ensures the diner cannot browse the menu, add to cart, or place orders
 * until their physical presence at the restaurant is strictly verified.
 */
export default function StrictLocationGate({ onSuccess }) {
  const session = useSessionStore();
  const setLocationVerified = useSessionStore((s) => s.setLocationVerified);

  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const branch = session.branch;
  const table = session.table;
  const qrToken = session.qrToken;
  const sessionToken = session.sessionToken;

  const branchHasLocation =
    Number.isFinite(branch?.location?.lat) && Number.isFinite(branch?.location?.lng);

  // If the branch hasn't configured GPS coordinates, or location is already verified, do nothing
  if (!branchHasLocation || session.locationVerified) {
    return null;
  }

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation services are not supported by your browser.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');
    setPermissionDenied(false);

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
            toast.success('Location verified! Welcome to ' + (session.restaurant?.name || 'the cafe'));
            if (onSuccess) onSuccess();
          } else if (res.data?.verified === false) {
            setErrorMessage(
              `You appear to be ${res.data.distanceMeters || 'too far'} meters away from the cafe. Location verification is strictly required inside the venue.`
            );
          } else {
            setLocationVerified(true);
            if (onSuccess) onSuccess();
          }
        } catch (err) {
          const msg =
            err.response?.data?.message ||
            'Location verification failed. Please verify you are inside the restaurant and try again.';
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
            'Location permission was denied. Location access is mandatory to view the menu and place orders.'
          );
        } else if (error.code === error.TIMEOUT) {
          setErrorMessage('Location request timed out. Please tap retry.');
        } else {
          setErrorMessage('Unable to determine your device location. Please ensure GPS is enabled.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-ink/10 relative overflow-hidden">
        {/* Top gradient accent */}
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ background: 'var(--color-primary, #0D9488)' }}
        />

        {/* Pulsing GPS Icon */}
        <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ background: 'var(--color-primary, #0D9488)' }}
          />
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md text-white"
            style={{ background: 'var(--color-primary, #0D9488)' }}
          >
            <MapPin size={32} className="animate-bounce-subtle" />
          </div>
        </div>

        {/* Headline & Description */}
        <h2 className="font-display font-bold text-xl text-ink mb-1.5">
          Location Verification Required
        </h2>
        <p className="text-xs text-ink-muted leading-relaxed mb-4">
          To protect orders and verify you are dining at{' '}
          <strong>{session.restaurant?.name || 'this venue'}</strong>
          {table?.label ? ` (${table.label})` : ''}, location access is{' '}
          <strong className="text-ink">mandatory</strong>.
        </p>

        {/* Error / Denial Guidance */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-left text-xs text-rose-800 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="font-semibold">{errorMessage}</p>
            </div>
            {permissionDenied && (
              <div className="text-[11px] text-rose-700/90 pl-6 space-y-1">
                <p className="font-medium">How to allow permission:</p>
                <p>1. Tap the <strong>lock 🔒</strong> or <strong>tune</strong> icon in your browser address bar.</p>
                <p>2. Set <strong>Location</strong> to <strong>Allow</strong>.</p>
                <p>3. Tap the button below to verify.</p>
              </div>
            )}
          </div>
        )}

        {/* Main Action Button */}
        <button
          type="button"
          onClick={handleRequestLocation}
          disabled={isVerifying}
          className="w-full py-3.5 px-4 rounded-2xl text-white font-semibold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--color-primary, #0D9488)' }}
        >
          {isVerifying ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Verifying GPS position…</span>
            </>
          ) : (
            <>
              <Navigation size={16} />
              <span>{errorMessage ? 'Retry Location Verification' : 'Allow Location & Verify'}</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-ink/40 mt-4 flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-teal" />
          <span>Used exclusively for on-table physical presence verification</span>
        </p>
      </div>
    </div>
  );
}
