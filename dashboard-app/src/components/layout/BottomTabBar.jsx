import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, QrCode, ClipboardList, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { to: '/tables', icon: QrCode, label: 'Tables' },
  { to: '/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomTabBar() {
  return (
    // Mobile/Tablet fixed bottom tab bar (CSS-only responsive switch)
    <nav
      className="fixed left-0 right-0 bottom-0 z-40 flex lg:hidden items-center justify-between gap-1 px-2"
      style={{
        // Height gives comfortable tap targets; env(safe-area-inset-bottom) respected via padding
        height: '56px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
      aria-label="Primary navigation"
    >
      <div className="mx-auto w-full max-w-xl px-3">
        <div className="bg-white/6 backdrop-blur-xs rounded-xl shadow-lg flex items-center justify-between px-2 h-full border border-white/6">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors py-2 px-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2` +
                (isActive
                  ? ' text-[var(--color-primary-light,var(--color-primary))]'
                  : ' text-white/60 hover:text-white')
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      background: 'color-mix(in srgb, var(--color-primary) 18%, transparent)'
                    }
                  : undefined
              }
            >
              <Icon size={18} />
              <span className="truncate text-[11px]">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
