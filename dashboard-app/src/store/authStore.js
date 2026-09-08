import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * LayoScan auth store
 * Holds the current session (user, restaurant, tokens).
 * Persisted to localStorage under the key 'layoscan-auth'.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      user:         null,
      restaurant:   null,
      accessToken:  null,
      refreshToken: null,

      /** Called after login or register — stores full session data. */
      setSession: ({ user, restaurant, accessToken, refreshToken }) =>
        set({ user, restaurant, accessToken, refreshToken }),

      /** Called by the restaurant settings form to refresh the local copy. */
      setRestaurant: (restaurant) => set({ restaurant }),

      /** Called after a silent token refresh in api.js. */
      updateAccessToken: (accessToken) => set({ accessToken }),

      /** Clears everything — triggers redirect to /login via PrivateRoute. */
      logout: () =>
        set({ user: null, restaurant: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'layoscan-auth' }
  )
);
