import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useSessionStore } from '../store/sessionStore';
import { applyBrandColor } from '../lib/theme';
import logo from '../assets/logo.png';

/**
 * QR entry point — resolves the table, applies restaurant brand theme,
 * stores session, then redirects to /menu.
 */
export default function Resolve() {
  const { qrToken } = useParams();
  const navigate    = useNavigate();
  const setSession  = useSessionStore((s) => s.setSession);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['table-resolve', qrToken],
    queryFn: () => api.get(`/public/table/${qrToken}`).then((r) => r.data),
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (data?.success) {
      // Apply per-restaurant brand color to CSS custom properties
      applyBrandColor(data.restaurant?.brandColor);

      setSession({
        qrToken,
        restaurant: data.restaurant,
        branch:     data.branch,
        table:      data.table,
      });
      navigate('/menu', { replace: true });
    }
  }, [data, qrToken, setSession, navigate]);

  /* ── Error state ──────────────────────────────────────────────────── */
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
