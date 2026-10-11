import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomTabBar from './BottomTabBar';
import NotificationCenter from './NotificationCenter';
import MandatoryInstallPrompt from './MandatoryInstallPrompt';
import { useAuthStore } from '../../store/authStore';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { applyBrandColor } from '../../lib/theme';
import logo from '../../assets/logo.png';

const PATH_LABELS = {
  '/': 'Dashboard',
  '/menu': 'Menu Catalog',
  '/tables': 'Tables & QR',
  '/orders': 'Orders Kanban',
  '/kds': 'Kitchen KDS',
  '/waiter': 'Floor Service',
  '/staff': 'Staff Management',
  '/analytics': 'Analytics',
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

  const mobileTitle = PATH_LABELS[location.pathname] || 'LayoScan';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-paper">
      {/* High-priority Frequent Mandatory Install Prompt */}
      <MandatoryInstallPrompt />

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
        {/* Mobile & Tablet Top Navbar (< 1024px) */}
        <header className="lg:hidden bg-ink text-white px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between sticky top-0 z-30 shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 min-h-11 min-w-11 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal flex items-center justify-center shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shrink-0 shadow-xs">
                <img src={logo} alt="" className="w-7 h-7 rounded-lg object-cover" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-sm tracking-tight truncate max-w-[130px] sm:max-w-[220px]">
                  {mobileTitle}
                </span>
                {restaurant?.name && (
                  <span className="text-[10px] text-white/50 truncate font-medium max-w-[130px] sm:max-w-[220px]">
                    {restaurant.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side: Notification Center */}
          <div className="flex items-center gap-2 shrink-0">
            <NotificationCenter />
          </div>
        </header>

        {/* Sidebar Component (Desktop persistent + Mobile drawer) */}
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Viewport */}
        <main className="relative flex-1 overflow-y-auto min-w-0 pb-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] lg:pb-0">
          {/* Desktop Top-Right Floating Notification Controls */}
          <div className="hidden lg:flex absolute top-3.5 right-6 z-30 items-center gap-2">
            <NotificationCenter />
          </div>

          <Outlet />
        </main>

        {/* Mobile/Tablet Bottom Tab Bar */}
        <BottomTabBar onOpenMore={() => setIsMobileMenuOpen(true)} />
      </div>
    </div>
  );
}
