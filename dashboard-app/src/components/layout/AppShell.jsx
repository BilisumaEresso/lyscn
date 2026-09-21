import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Menu, Volume2, X, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';
import { applyBrandColor } from '../../lib/theme';
import api from '../../lib/api';
import socket from '../../lib/socket';
import logo from '../../assets/logo.png';

const PATH_LABELS = {
  '/': 'Dashboard',
  '/menu': 'Menu',
  '/tables': 'Tables',
  '/orders': 'Orders',
  '/settings': 'Settings',
};

function playAssistanceBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 600);
  } catch {
    // Browsers may block audio until the dashboard has received a user gesture.
  }
}

function AssistanceBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const { data } = useQuery({
    queryKey: ['assistance'],
    queryFn: () => api.get('/assistance').then((r) => r.data),
    refetchInterval: 15_000,
  });
  const requests = data?.assistance ?? [];
  const activeRequests = requests.filter((request) =>
    request.status === 'pending' || request.status === 'acknowledged'
  );
  const pendingCount = activeRequests.length;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/assistance/${id}/${status === 'acknowledged' ? 'acknowledge' : 'resolve'}`).then((r) => r.data),
    onSuccess: ({ assistance }) => {
      qc.setQueryData(['assistance'], (old) => ({
        ...old,
        assistance: (old?.assistance ?? []).map((item) =>
          item._id === assistance._id ? assistance : item
        ),
      }));
    },
    onError: () => toast.error('Could not update assistance request.'),
  });

  useEffect(() => {
    socket.connect();
    const onCreated = (request) => {
      qc.setQueryData(['assistance'], (old) => {
        const existing = old?.assistance ?? [];
        if (existing.some((item) => item._id === request._id)) return old;
        return { ...(old || {}), assistance: [request, ...existing] };
      });
      playAssistanceBeep();
      toast('A table needs assistance.', { icon: '🔔' });
    };
    const onUpdated = (request) => {
      qc.setQueryData(['assistance'], (old) => ({
        ...old,
        assistance: (old?.assistance ?? []).map((item) =>
          item._id === request._id ? request : item
        ),
      }));
    };
    socket.on('assistance:created', onCreated);
    socket.on('assistance:updated', onUpdated);
    return () => {
      socket.off('assistance:created', onCreated);
      socket.off('assistance:updated', onUpdated);
    };
  }, [qc]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (open && panelRef.current && !panelRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={panelRef} className="absolute top-2 right-2 z-40 lg:top-3 lg:right-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative w-9 h-9 rounded-lg bg-white border border-ink/10 shadow-sm flex items-center justify-center text-ink-muted hover:text-ink hover:border-teal transition-colors"
        aria-label={`Assistance requests${pendingCount ? ` (${pendingCount} pending)` : ''}`}
      >
        <Bell size={16} />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center px-0.5">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] z-50 max-h-[70dvh] rounded-2xl bg-white border border-ink/10 shadow-xl overflow-hidden lg:absolute lg:inset-x-auto lg:bottom-auto lg:right-0 lg:mt-2 lg:w-80 lg:max-h-none">
          <div className="px-4 py-3 border-b border-ink/8 flex items-center justify-between">
            <div>
              <p className="font-display font-semibold text-sm text-ink">Assistance requests</p>
              <p className="text-[11px] text-ink-muted flex items-center gap-1">
                <Volume2 size={11} /> Live alerts enabled
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 min-w-11 p-2 text-ink-muted hover:text-ink" aria-label="Close assistance requests">
              <X size={15} />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {activeRequests.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">No tables need assistance.</p>
            ) : activeRequests.map((request) => (
              <div key={request._id} className="px-4 py-3 border-b border-ink/6 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-ink">
                      {request.tableId?.label ?? 'Table'}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {request.type === 'call_staff' ? 'Call staff' : 'Request bill'}
                    </p>
                  </div>
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                    request.status === 'pending'
                      ? 'bg-amber/10 text-amber'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {request.status}
                  </span>
                </div>
                {request.message && <p className="text-xs text-ink-muted mt-2">{request.message}</p>}
                <div className="flex justify-end gap-2 mt-2">
                  {request.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate({ id: request._id, status: 'acknowledged' })}
                      className="min-h-11 px-2 text-xs font-semibold text-teal hover:underline"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => statusMutation.mutate({ id: request._id, status: 'resolved' })}
                    className="min-h-11 px-2 text-xs font-semibold text-ink-muted hover:text-ink flex items-center gap-1"
                  >
                    <Check size={12} /> Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const { restaurant } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (restaurant?.brandColor) {
      applyBrandColor(restaurant.brandColor);
    }
  }, [restaurant?.brandColor]);

  // Auto-close mobile menu when navigating routes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const mobileTitle = PATH_LABELS[location.pathname] || '';

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-paper">
      {/* Mobile & Tablet Top Navbar (< 1024px) - simplified: menu button + page title */}
      <header className="lg:hidden bg-ink text-white px-4 py-3 border-b border-white/10 flex items-center justify-between sticky top-0 z-30 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shrink-0">
              <img src={logo} alt="" className="w-7 h-7 rounded-lg object-cover" />
            </div>
            <span className="font-display font-semibold text-base tracking-tight truncate max-w-[220px]">
              {mobileTitle || 'LayoScan'}
            </span>
          </div>
        </div>

        {/* Keep restaurant name small if present */}
        {restaurant?.name && (
          <div className="max-w-[160px] truncate text-right">
            <span className="block text-xs text-white/70 font-medium truncate px-2 py-0.5 rounded-full bg-white/10">
              {restaurant.name}
            </span>
            {restaurant.contactInfo?.address && (
              <span className="flex items-center justify-end gap-1 text-[10px] text-white/50 mt-1 truncate">
                <MapPin size={10} /> {restaurant.contactInfo.address}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Sidebar Component (Desktop persistent + Mobile drawer) */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Viewport */}
      <main className="relative flex-1 overflow-y-auto min-w-0 pb-16 lg:pb-0">
        <AssistanceBell />
        <Outlet />
      </main>
    </div>
  );
}
