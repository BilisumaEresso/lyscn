import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCustomerNotificationStore = create(
  persist(
    (set, get) => ({
      soundEnabled: true,
      soundVolume: 0.3,
      pushPromptDismissed: false,
      pushPermission: typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission
        : 'default',

      // Current floating dynamic island alert (or null)
      activeAlert: null,

      // Recent notification history (up to 30 items)
      history: [],

      // Waiter call tracking
      assistanceState: null, // { active: boolean, type: string, status: string, timestamp: number }

      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setSoundVolume: (soundVolume) => set({ soundVolume }),
      setPushPromptDismissed: (pushPromptDismissed) => set({ pushPromptDismissed }),
      setPushPermission: (pushPermission) => set({ pushPermission }),

      triggerAlert: (alert) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newAlert = {
          id,
          timestamp: Date.now(),
          ...alert,
        };

        set((state) => ({
          activeAlert: newAlert,
          history: [newAlert, ...state.history.slice(0, 29)],
        }));
      },

      dismissAlert: (id) => {
        set((state) => {
          if (!id || state.activeAlert?.id === id) {
            return { activeAlert: null };
          }
          return {};
        });
      },

      setAssistanceState: (assistanceState) => set({ assistanceState }),

      clearAssistance: () => set({ assistanceState: null }),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'layoscan-customer-notifications',
      partialize: (state) => ({
        soundEnabled: state.soundEnabled,
        soundVolume: state.soundVolume,
        pushPromptDismissed: state.pushPromptDismissed,
        history: state.history,
      }),
    }
  )
);
