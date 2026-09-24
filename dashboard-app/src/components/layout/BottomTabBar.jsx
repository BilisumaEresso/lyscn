import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, UtensilsCrossed, QrCode, ClipboardList, Settings } from 'lucide-react';
import api from '../../lib/api';

export default function BottomTabBar() {
  const { data: ordersData } = useQuery({
    queryKey: ['orders-kanban'],
    queryFn: () => api.get('/orders').then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: assistanceData } = useQuery({
    queryKey: ['assistance'],
    queryFn: () => api.get('/assistance').then((r) => r.data),
    staleTime: 30_000,
  });

  const placedOrdersCount = ordersData?.orders?.filter((o) => o.status === 'placed').length || 0;
  const pendingAssistanceCount = assistanceData?.assistance?.filter(
    (a) => a.status === 'pending' || a.status === 'acknowledged'
  ).length || 0;

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
    { to: '/tables', icon: QrCode, label: 'Tables', badge: pendingAssistanceCount },
    { to: '/orders', icon: ClipboardList, label: 'Orders', badge: placedOrdersCount },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-40 flex lg:hidden items-center justify-between gap-1 px-2"
      style={{
        height: '56px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Primary mobile navigation"
    >
      <div className="mx-auto w-full max-w-xl px-2">
        <div className="bg-ink/90 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-between px-2 h-12 border border-white/10">
          {navItems.map(({ to, icon: Icon, label, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors py-1 px-1 rounded-xl focus:outline-none ` +
                (isActive
                  ? ' text-[var(--color-primary-light,var(--color-primary))] font-semibold'
                  : ' text-white/60 hover:text-white')
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      background: 'color-mix(in srgb, var(--color-primary) 18%, transparent)',
                    }
                  : undefined
              }
            >
              <div className="relative">
                <Icon size={17} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] rounded-full bg-danger text-white text-[8px] font-bold flex items-center justify-center px-0.5 shadow-xs">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="truncate text-[10px]">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
