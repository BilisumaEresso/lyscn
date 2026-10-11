import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, UtensilsCrossed, QrCode, ClipboardList,
  ChefHat, Utensils, MoreHorizontal
} from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function BottomTabBar({ onOpenMore }) {
  const { user } = useAuthStore();

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
  const acceptedOrdersCount = ordersData?.orders?.filter((o) => o.status === 'accepted' || o.status === 'preparing').length || 0;
  const readyOrdersCount = ordersData?.orders?.filter((o) => o.status === 'ready').length || 0;
  const pendingAssistanceCount = assistanceData?.assistance?.filter(
    (a) => a.status === 'pending' || a.status === 'acknowledged'
  ).length || 0;

  const role = user?.role || 'owner';
  let navItems = [];

  if (role === 'kitchen') {
    navItems = [
      {
        to: '/kds',
        icon: ChefHat,
        label: 'Kitchen KDS',
        badge: acceptedOrdersCount,
        badgeColor: 'bg-amber-500 text-ink',
      },
      { to: '/orders', icon: ClipboardList, label: 'Order History' },
    ];
  } else if (role === 'waiter') {
    navItems = [
      {
        to: '/waiter',
        icon: Utensils,
        label: 'Floor',
        badge: readyOrdersCount,
        badgeColor: 'bg-emerald-500 text-white',
      },
      {
        to: '/tables',
        icon: QrCode,
        label: 'Tables',
        badge: pendingAssistanceCount,
        badgeColor: 'bg-rose-500 text-white animate-pulse',
      },
      { to: '/orders', icon: ClipboardList, label: 'Orders' },
    ];
  } else if (role === 'coordinator') {
    navItems = [
      { to: '/', icon: LayoutDashboard, label: 'Desk', end: true },
      {
        to: '/orders',
        icon: ClipboardList,
        label: 'Orders',
        badge: placedOrdersCount,
        badgeColor: 'bg-amber-500 text-ink',
      },
      {
        to: '/tables',
        icon: QrCode,
        label: 'Tables',
        badge: pendingAssistanceCount,
        badgeColor: 'bg-rose-500 text-white animate-pulse',
      },
      { to: '/kds', icon: ChefHat, label: 'KDS' },
      { to: '/waiter', icon: Utensils, label: 'Floor' },
    ];
  } else {
    // owner or manager: 4 primary quick-action tabs + 1 "More" action
    navItems = [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
      {
        to: '/orders',
        icon: ClipboardList,
        label: 'Orders',
        badge: placedOrdersCount,
        badgeColor: 'bg-amber-500 text-ink',
      },
      {
        to: '/tables',
        icon: QrCode,
        label: 'Tables',
        badge: pendingAssistanceCount,
        badgeColor: 'bg-rose-500 text-white animate-pulse',
      },
      { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
      {
        isAction: true,
        icon: MoreHorizontal,
        label: 'More',
        action: onOpenMore,
      },
    ];
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex lg:hidden items-center justify-center pointer-events-none px-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-1"
      aria-label="Primary mobile navigation"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-md">
        <div className="bg-ink/95 backdrop-blur-xl rounded-2xl shadow-2xl flex items-center justify-between px-1.5 py-1 border border-white/12 min-h-[52px]">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.isAction) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] text-[10px] font-medium text-white/70 hover:text-white transition-colors py-1 px-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                  aria-label="Open more menu options"
                >
                  <Icon size={18} strokeWidth={1.75} />
                  <span className="truncate text-[10px]">{item.label}</span>
                </button>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] text-[10px] font-medium transition-all py-1 px-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ` +
                  (isActive
                    ? ' text-[var(--color-primary-light,var(--color-primary))] font-semibold shadow-xs'
                    : ' text-white/60 hover:text-white')
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
                      }
                    : undefined
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative flex items-center justify-center">
                      <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
                      {item.badge > 0 && (
                        <span
                          className={`absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full text-[8px] font-bold flex items-center justify-center px-1 shadow-xs ${
                            item.badgeColor || 'bg-danger text-white'
                          }`}
                        >
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </div>
                    <span className="truncate text-[10px] leading-tight mt-0.5">
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
