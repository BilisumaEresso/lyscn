import { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, UtensilsCrossed, QrCode,
  ClipboardList, Settings, LogOut, X, Download, MapPin, Users
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import logo from '../../assets/logo.png';

export default function Sidebar({ isOpen, onClose }) {
  const { user, restaurant, logout } = useAuthStore();
  const { canInstall, promptInstall } = useInstallPrompt();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { to: '/',        icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/menu',    icon: UtensilsCrossed, label: 'Menu' },
    { to: '/tables',  icon: QrCode,          label: 'Tables' },
    { to: '/orders',  icon: ClipboardList,   label: 'Orders' },
    ...(user?.role === 'owner' || user?.role === 'manager'
      ? [{ to: '/staff', icon: Users, label: 'Staff' }]
      : []),
    { to: '/settings',icon: Settings,        label: 'Settings' },
  ];

  // Close mobile drawer on route change
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
    navigate('/login');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-ink text-white">
      {/* ── Logo lockup ─────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shrink-0 shadow-sm">
            <img src={logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
          </div>
          <span className="text-white font-display font-semibold text-[15px] tracking-tight leading-tight">
            LayoScan
          </span>
        </div>
        {/* Mobile Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-11 min-w-11 rounded-lg text-white/60 hover:text-white hover:bg-white/10 lg:hidden transition-colors flex items-center justify-center"
            aria-label="Close navigation drawer"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* ── Restaurant badge ────────────────────────────────────────── */}
      {restaurant && (
        <div className="px-5 py-3 border-b border-white/8">
          <p className="text-white/35 text-[10px] font-medium uppercase tracking-wider mb-0.5">
            Cafe
          </p>
          <p className="text-white/80 text-sm font-medium truncate">{restaurant.name}</p>
          {restaurant.contactInfo?.address && (
            <p className="text-white/45 text-[11px] mt-1 truncate flex items-center gap-1">
              <MapPin size={11} /> {restaurant.contactInfo.address}
            </p>
          )}
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5" aria-label="Main navigation">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => { if (onClose) onClose(); }}
            style={({ isActive }) =>
              isActive
                ? {
                    background: 'color-mix(in srgb, var(--color-primary) 18%, transparent)',
                    color: 'var(--color-primary-light, var(--color-primary))',
                  }
                : {}
            }
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-all duration-100 ${
                isActive
                  ? ''
                  : 'text-white/55 hover:text-white/90 hover:bg-white/6'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  className="shrink-0"
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User + logout ────────────────────────────────────────────── */}
      <div className="px-2.5 py-3 border-t border-white/8 mt-auto">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 22%, transparent)',
              color: 'var(--color-primary-light, var(--color-primary))',
            }}
          >
            <span className="text-[11px] font-bold">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-xs font-medium truncate leading-tight">
              {user?.name}
            </p>
            <p className="text-white/35 text-[10px] capitalize">{user?.role}</p>
          </div>
        </div>
        {canInstall && (
          <button
            onClick={promptInstall}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1
                       text-teal hover:bg-teal/10 transition-colors font-medium
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <Download size={15} strokeWidth={2} />
            Install app
          </button>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                     text-white/45 hover:text-danger hover:bg-danger/10 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <LogOut size={15} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (>= 1024px) */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-ink flex-col h-screen sticky top-0 border-r border-white/5">
        {navContent}
      </aside>

      {/* Mobile/Tablet Drawer Backdrop & Sliding Drawer (< 1024px) */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-ink/75 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-ink flex flex-col h-full shadow-2xl lg:hidden transform transition-transform duration-200 ease-out"
          >
            {navContent}
          </aside>
        </>
      )}
    </>
  );
}
