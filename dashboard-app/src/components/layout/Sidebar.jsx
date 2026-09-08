import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UtensilsCrossed, QrCode,
  ClipboardList, Settings, LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/logo.png';

const NAV_ITEMS = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/menu',    icon: UtensilsCrossed, label: 'Menu' },
  { to: '/tables',  icon: QrCode,          label: 'Tables' },
  { to: '/orders',  icon: ClipboardList,   label: 'Orders' },
  { to: '/settings',icon: Settings,        label: 'Settings' },
];

export default function Sidebar() {
  const { user, restaurant, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-60 shrink-0 bg-ink flex flex-col h-screen sticky top-0">
      {/* ── Logo lockup ─────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shrink-0 shadow-sm">
            <img src={logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
          </div>
          <span className="text-white font-display font-semibold text-[15px] tracking-tight leading-tight">
            LayoScan
          </span>
        </div>
      </div>

      {/* ── Restaurant badge ────────────────────────────────────────── */}
      {restaurant && (
        <div className="px-5 py-3 border-b border-white/8">
          <p className="text-white/35 text-[10px] font-medium uppercase tracking-wider mb-0.5">
            Restaurant
          </p>
          <p className="text-white/80 text-sm font-medium truncate">{restaurant.name}</p>
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
      <div className="px-2.5 py-3 border-t border-white/8">
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
    </aside>
  );
}
