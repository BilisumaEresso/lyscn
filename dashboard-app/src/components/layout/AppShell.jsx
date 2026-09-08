import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';
import { applyBrandColor } from '../../lib/theme';
import logo from '../../assets/logo.png';

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

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-paper">
      {/* Mobile & Tablet Top Navbar (< 1024px) */}
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
            <span className="font-display font-bold text-base tracking-tight">LayoScan</span>
          </div>
        </div>

        {restaurant?.name && (
          <span className="text-xs text-white/70 font-medium truncate max-w-[140px] px-2 py-0.5 rounded-full bg-white/10">
            {restaurant.name}
          </span>
        )}
      </header>

      {/* Sidebar Component (Desktop persistent + Mobile drawer) */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
