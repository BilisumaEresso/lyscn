import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_STORED_NOTIFICATIONS = 60;

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],
      soundEnabled: true,
      soundVolume: 0.7,
      desktopNotificationsEnabled: false,
      isDrawerOpen: false,

      // Per-event sound toggles
      eventSounds: {
        order_created: true,
        order_ready: true,
        order_cancelled: true,
        table_occupied: true,
        table_ready_to_clear: true,
        assistance: true,
      },

      setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),

      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),

      setSoundVolume: (soundVolume) => set({ soundVolume: Math.max(0, Math.min(1, soundVolume)) }),

      setEventSound: (eventType, enabled) =>
        set((state) => ({
          eventSounds: {
            ...state.eventSounds,
            [eventType]: enabled,
          },
        })),

      setDesktopNotificationsEnabled: (enabled) =>
        set({ desktopNotificationsEnabled: enabled }),

      addNotification: (notification) =>
        set((state) => {
          // Avoid duplicate notification with same id if already present
          if (notification.id && state.notifications.some((n) => n.id === notification.id)) {
            return state;
          }

          const newNotification = {
            id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            category: notification.category || 'orders', // 'orders' | 'tables' | 'assistance'
            type: notification.type || 'info',
            title: notification.title,
            message: notification.message || '',
            timestamp: notification.timestamp || new Date().toISOString(),
            read: false,
            data: notification.data || {},
          };

          const updated = [newNotification, ...state.notifications].slice(0, MAX_STORED_NOTIFICATIONS);
          return { notifications: updated };
        }),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () => set({ notifications: [] }),

      // Computed helper
      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'layoscan-notifications',
      partialize: (state) => ({
        notifications: state.notifications,
        soundEnabled: state.soundEnabled,
        soundVolume: state.soundVolume,
        desktopNotificationsEnabled: state.desktopNotificationsEnabled,
        eventSounds: state.eventSounds,
      }),
    }
  )
);
