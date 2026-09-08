import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';
import { applyBrandColor } from '../../lib/theme';

export default function AppShell() {
  const { restaurant } = useAuthStore();

  useEffect(() => {
    if (restaurant?.brandColor) {
      applyBrandColor(restaurant.brandColor);
    }
  }, [restaurant?.brandColor]);

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
