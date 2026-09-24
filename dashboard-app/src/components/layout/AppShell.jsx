import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, MapPin } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomTabBar from './BottomTabBar';
import NotificationCenter from './NotificationCenter';
import { useAuthStore } from '../../store/authStore';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { applyBrandColor } from '../../lib/theme';
import logo from '../../assets/logo.png';

const PATH_LABELS = {
  '/': 'Dashboard',
  '/menu': 'Menu',
  '/tables': 'Tables',
  '/orders': 'Orders',
  '/staff': 'Staff',
  '/settings': 'Settings',
};

export default function AppShell() {
  const { restaurant } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Initialize global real-time notifications coordinator
  useRealtimeNotifications();

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
      {/* Mobile & Tablet Top Navbar (< 1024px) */}
      <header className="lg:hidden bg-ink text-white px-4 py-2.5 border-b border-white/10 flex items-center justify-between sticky top-0 z-30 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shrink-0">
              <img src={logo} alt="" className="w-7 h-7 rounded-lg object-cover" />
            </div>
            <span className="font-display font-semibold text-sm tracking-tight truncate max-w-[140px] sm:max-w-[200px]">
              {mobileTitle || 'LayoScan'}
            </span>
          </div>
        </div>

        {/* Right side: Notification Center + Restaurant indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationCenter />
          {restaurant?.name && (
            <div className="hidden sm:block max-w-[130px] truncate text-right">
              <span className="block text-[11px] text-white/70 font-medium truncate px-2 py-0.5 rounded-full bg-white/10">
                {restaurant.name}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Sidebar Component (Desktop persistent + Mobile drawer) */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Viewport */}
      <main className="relative flex-1 overflow-y-auto min-w-0 pb-16 lg:pb-0">
        {/* Desktop Top-Right Floating Notification Controls */}
        <div className="hidden lg:flex absolute top-3.5 right-6 z-40 items-center gap-2">
          <NotificationCenter />
        </div>

        <Outlet />
      </main>

      {/* Mobile/Tablet Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  );
}
