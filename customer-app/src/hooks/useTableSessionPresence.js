import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import toast from 'react-hot-toast';

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes inactivity timeout
const HEARTBEAT_INTERVAL_MS = 35 * 1000;    // 35s heartbeat ping
const LOCATION_CHECK_INTERVAL_MS = 60 * 1000; // 60s location check

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * useTableSessionPresence
 *
 * Manages customer table occupancy lifecycle:
 * 1. Frees table immediately if user is inactive for 5 minutes (no active orders).
 * 2. Frees table immediately if user closes or exits the tab (sendBeacon/keepalive fetch).
 * 3. Frees table if customer physically leaves the cafe radius.
 * 4. Detects offline state and alerts customer explicitly to reconnect to internet.
 * 5. Requires QR rescan on any suspicious or expired session token.
 */
export function useTableSessionPresence() {
  const session = useSessionStore();
  const clearSession = useSessionStore((s) => s.clearSession);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [rescanRequired, setRescanRequired] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const activeOrdersCountRef = useRef(0);
  const sessionRef = useRef(session);

  sessionRef.current = session;
  activeOrdersCountRef.current =
    (session.activeOrderId ? 1 : 0) + (session.orderHistory?.length || 0);

  const tableId = session.table?._id;
  const sessionToken = session.sessionToken;
  const branchLocation = session.branch?.location;
  const radiusMeters = session.branch?.location?.radiusMeters || 150;

  // ── 1. Fast release helper ───────────────────────────────────────────────────
  const releaseTableFast = (reason = 'user_exit') => {
    const curTableId = sessionRef.current.table?._id;
    const curToken = sessionRef.current.sessionToken;

    if (!curTableId || !curToken) return;
    if (activeOrdersCountRef.current > 0) return; // Do not release if meal orders exist

    const url = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/public/table/release-session`;
    const payload = JSON.stringify({
      tableId: curTableId,
      sessionToken: curToken,
      reason,
    });

    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Beacon errors ignored on teardown
    }
  };

  // ── 2. User Activity Tracker (Inactivity for 5 min) ──────────────────────────
  useEffect(() => {
    if (!tableId || !sessionToken) return;

    const onUserInteraction = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((evt) => window.addEventListener(evt, onUserInteraction, { passive: true }));

    // Check inactivity every 15s
    const inactivityTimer = setInterval(async () => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= INACTIVITY_LIMIT_MS) {
        if (activeOrdersCountRef.current === 0) {
          // No active orders: auto-free table after 5 minutes
          try {
            await api.post('/public/table/release-session', {
              tableId,
              sessionToken,
              reason: 'inactivity_5min',
            });
          } catch {}

          clearSession();
          toast(
            'Table freed due to 5 minutes of inactivity. Scan table QR code to resume ordering.',
            { icon: '🪑', duration: 6000 }
          );
        }
      }
    }, 15_000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, onUserInteraction));
      clearInterval(inactivityTimer);
    };
  }, [tableId, sessionToken, clearSession]);

  // ── 3. Heartbeat Ping to Keep Table Reserved (35s) ────────────────────────────
  useEffect(() => {
    if (!tableId || !sessionToken || isOffline) return;

    const heartbeat = async () => {
      try {
        const res = await api.post('/public/table/heartbeat', {
          tableId,
          sessionToken,
        });
        if (res.data?.code === 'RESCAN_REQUIRED') {
          setRescanRequired(true);
          clearSession();
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.data?.code === 'RESCAN_REQUIRED') {
          setRescanRequired(true);
          clearSession();
        }
      }
    };

    const timer = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [tableId, sessionToken, isOffline, clearSession]);

  // ── 4. Tab Close / Exit Trigger (pagehide, beforeunload) ──────────────────────
  useEffect(() => {
    if (!tableId || !sessionToken) return;

    const handleTabExit = () => {
      releaseTableFast('tab_closed');
    };

    window.addEventListener('pagehide', handleTabExit);
    window.addEventListener('beforeunload', handleTabExit);

    return () => {
      window.removeEventListener('pagehide', handleTabExit);
      window.removeEventListener('beforeunload', handleTabExit);
    };
  }, [tableId, sessionToken]);

  // ── 5. Check If User Left the Cafe with Location ─────────────────────────────
  useEffect(() => {
    if (!tableId || !sessionToken || !branchLocation?.lat || !branchLocation?.lng) return;

    const checkDistance = () => {
      if (!navigator.geolocation || !navigator.onLine) return;

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const dist = haversineMeters(
            branchLocation.lat,
            branchLocation.lng,
            coords.latitude,
            coords.longitude
          );

          // Buffer of 35 meters for indoor GPS drift
          const allowedRadius = radiusMeters + 35;

          if (dist > allowedRadius && activeOrdersCountRef.current === 0) {
            // User walked away from cafe without active orders
            try {
              await api.post('/public/table/release-session', {
                tableId,
                sessionToken,
                reason: 'left_cafe_location',
              });
            } catch {}

            clearSession();
            toast.error(
              `You appear to have left the cafe (${Math.round(dist)}m away). Your table has been released for other guests.`
            );
          }
        },
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
      );
    };

    const locTimer = setInterval(checkDistance, LOCATION_CHECK_INTERVAL_MS);
    return () => clearInterval(locTimer);
  }, [tableId, sessionToken, branchLocation, radiusMeters, clearSession]);

  // ── 6. Offline / Online Connectivity Detection ───────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Internet reconnected', { id: 'network-status' });
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.error('You went offline. Please check your internet connection.', {
        id: 'network-status',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOffline,
    rescanRequired,
    dismissRescan: () => setRescanRequired(false),
  };
}
