import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, UtensilsCrossed, QrCode,
  ClipboardList, Settings, LogOut, X, Download, MapPin, Users,
  ChefHat, Utensils, BarChart2, PanelLeftClose, PanelLeftOpen, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import api from '../../lib/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import logo from '../../assets/logo.png';

export default function Sidebar({ isOpen, onClose }) {
  const { user, restaurant, logout } = useAuthStore();
  const { canInstall, promptInstall } = useInstallPrompt();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('layoscan_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Persist collapsed state
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('layoscan_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Fetch orders and assistance for ambient badges
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

  // Build categorized nav items based on role
  const getNavSections = () => {
    if (role === 'kitchen') {
      return [
        {
          title: 'Kitchen',
          items: [
            {
              to: '/kds',
              icon: ChefHat,
              label: 'Kitchen KDS',
              badge: acceptedOrdersCount,
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            },
            { to: '/orders', icon: ClipboardList, label: 'Order History' },
          ],
        },
      ];
    }
    if (role === 'waiter') {
      return [
        {
          title: 'Floor Service',
          items: [
            {
              to: '/waiter',
              icon: Utensils,
              label: 'Floor Service',
              badge: readyOrdersCount,
              badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            },
            {
              to: '/tables',
              icon: QrCode,
              label: 'Tables & QR',
              badge: pendingAssistanceCount,
              badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
            },
            { to: '/orders', icon: ClipboardList, label: 'Order History' },
          ],
        },
      ];
    }
    if (role === 'coordinator') {
      return [
        {
          title: 'Live Service',
          items: [
            { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
            {
              to: '/orders',
              icon: ClipboardList,
              label: 'Orders',
              badge: placedOrdersCount,
              badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            },
            {
              to: '/tables',
              icon: QrCode,
              label: 'Tables',
              badge: pendingAssistanceCount,
              badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
            },
            { to: '/kds', icon: ChefHat, label: 'Kitchen KDS' },
            { to: '/waiter', icon: Utensils, label: 'Floor Service' },
          ],
        },
        {
          title: 'System',
          items: [
            { to: '/settings', icon: Settings, label: 'Settings' },
          ],
        },
      ];
    }
    // owner or manager
    return [
      {
        title: 'Live Service',
        items: [
          { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
          {
            to: '/orders',
            icon: ClipboardList,
            label: 'Orders',
            badge: placedOrdersCount,
            badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          },
          {
            to: '/tables',
            icon: QrCode,
            label: 'Tables & QR',
            badge: pendingAssistanceCount,
            badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          },
          { to: '/kds', icon: ChefHat, label: 'Kitchen KDS' },
          { to: '/waiter', icon: Utensils, label: 'Floor Service' },
        ],
      },
      {
        title: 'Management',
        items: [
          { to: '/menu', icon: UtensilsCrossed, label: 'Menu Catalog' },
          { to: '/staff', icon: Users, label: 'Staff Team' },
          { to: '/analytics', icon: BarChart2, label: 'Analytics' },
        ],
      },
      {
        title: 'Preferences',
        items: [
          { to: '/billing', icon: CreditCard, label: 'Billing & Plan' },
          { to: '/settings', icon: Settings, label: 'Settings' },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  // Close mobile drawer on route change
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose && !showLogoutModal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showLogoutModal]);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        // Invalidate refresh token on server
        await api.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
      if (onClose) onClose();
      logout();
      navigate('/login');
      toast.success('Signed out successfully.');
    }
  };

  // Helper to render navigation items
  const renderNavContent = (collapsed = false) => (
    <div className="flex flex-col h-full bg-ink text-white select-none">
      {/* ── Header / Logo lockup ─────────────────────────────────────────────── */}
      <div className={`px-4 py-4 border-b border-white/8 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shrink-0 shadow-sm">
            <img src={logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-white font-display font-semibold text-[15px] tracking-tight leading-tight">
                LayoScan
              </span>
              <span className="text-[10px] text-white/40 font-mono tracking-wider">
                STAFF SUITE
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle (only in persistent desktop sidebar) */}
        {!onClose && (
          <button
            type="button"
            onClick={toggleCollapse}
            className={`p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors hidden lg:flex items-center justify-center ${
              collapsed ? 'mt-2' : ''
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}

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

      {/* ── Restaurant Info Card ────────────────────────────────────────── */}
      {restaurant && !collapsed && (
        <div className="px-4 py-3 border-b border-white/8 bg-white/2">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">
              Venue
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-white/70 capitalize">
              {role}
            </span>
          </div>
          <p className="text-white font-medium text-xs mt-1 truncate">{restaurant.name}</p>
          {restaurant.contactInfo?.address && (
            <p className="text-white/40 text-[11px] mt-0.5 truncate flex items-center gap-1">
              <MapPin size={10} className="shrink-0 text-white/30" />
              {restaurant.contactInfo.address}
            </p>
          )}
        </div>
      )}

      {/* ── Navigation List ──────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4" aria-label="Main navigation">
        {navSections.map((section, idx) => (
          <div key={section.title || idx} className="space-y-0.5">
            {!collapsed && navSections.length > 1 && (
              <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
                {section.title}
              </p>
            )}
            {collapsed && idx > 0 && (
              <div className="border-t border-white/8 my-2" />
            )}

            {section.items.map(({ to, icon: Icon, label, end, badge, badgeColor }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={collapsed ? label : undefined}
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
                  `group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 ${
                    collapsed
                      ? 'justify-center py-2.5 px-0'
                      : 'gap-3 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'font-semibold shadow-2xs'
                      : 'text-white/60 hover:text-white hover:bg-white/6'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active accent pill on left border */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[var(--color-primary,#14B8A6)]" />
                    )}

                    <div className="relative shrink-0 flex items-center justify-center">
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2.25 : 1.75}
                        className="transition-transform duration-150 group-hover:scale-105"
                      />
                      {/* Compact dot badge in collapsed mode */}
                      {collapsed && badge > 0 && (
                        <span
                          className={`absolute -top-1 -right-1.5 w-2 h-2 rounded-full border border-ink ${
                            badgeColor?.includes('rose') ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'
                          }`}
                        />
                      )}
                    </div>

                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{label}</span>
                        {badge > 0 && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                              badgeColor || 'bg-white/10 text-white border-white/20'
                            }`}
                          >
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── User Footer & Sign out ────────────────────────────────────────────── */}
      <div className="p-2 border-t border-white/8 mt-auto bg-white/2">
        {!collapsed ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
                style={{
                  background: 'color-mix(in srgb, var(--color-primary) 22%, transparent)',
                  color: 'var(--color-primary-light, var(--color-primary))',
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/90 text-xs font-semibold truncate leading-tight">
                  {user?.name || user?.email || 'Staff Member'}
                </p>
                <p className="text-white/40 text-[10px] capitalize leading-none mt-0.5">
                  {user?.role || 'Staff'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="p-1.5 rounded-lg text-white/40 hover:text-danger hover:bg-danger/10 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>

            {canInstall && (
              <button
                onClick={promptInstall}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs
                           text-teal hover:bg-teal/10 transition-colors font-medium"
              >
                <Download size={14} strokeWidth={2} />
                Install Web App
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 22%, transparent)',
                color: 'var(--color-primary-light, var(--color-primary))',
              }}
              title={`${user?.name || ''} (${user?.role || ''})`}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="p-2 rounded-lg text-white/40 hover:text-danger hover:bg-danger/10 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (>= 1024px) with smooth collapse transition */}
      <aside
        className={`hidden lg:flex shrink-0 bg-ink flex-col h-full border-r border-white/5 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-18' : 'w-60'
        }`}
      >
        {renderNavContent(isCollapsed)}
      </aside>

      {/* Mobile/Tablet Drawer Backdrop & Sliding Drawer (< 1024px) with real CSS transitions */}
      <div
        className={`fixed inset-0 bg-ink/75 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-ink flex flex-col h-full shadow-2xl lg:hidden transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Custom Confirmation Modal for Sign Out */}
      <Modal
        open={showLogoutModal}
        onClose={() => !isLoggingOut && setShowLogoutModal(false)}
        title="Sign Out"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center shrink-0">
              <LogOut size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                Are you sure you want to sign out?
              </p>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                You are currently signed in as{' '}
                <span className="font-semibold text-ink">{user?.name || user?.email}</span> (
                <span className="capitalize">{user?.role}</span>) for{' '}
                <span className="font-semibold text-ink">{restaurant?.name || 'your venue'}</span>.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-ink/3 border border-ink/8 text-xs text-ink-muted leading-relaxed">
            Signing out will end your current session. You will need your login credentials to access the kitchen, floor, and dashboard again.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoggingOut}
              onClick={() => setShowLogoutModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isLoggingOut}
              onClick={handleConfirmLogout}
              className="bg-danger hover:bg-danger/90 text-white"
            >
              {isLoggingOut ? 'Signing out…' : 'Yes, sign out'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
