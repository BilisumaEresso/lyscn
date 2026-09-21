import axios from 'axios';

// ── Configured axios instance ─────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ── Request interceptor: attach Bearer token ──────────────────────────────────
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('layoscan-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    }
  } catch (_) {
    // storage read failure — proceed without token
  }
  return config;
});

// ── Response interceptor: silent token refresh on 401 ────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const stored = localStorage.getItem('layoscan-auth');
        const { state } = JSON.parse(stored || '{}');
        const refreshToken = state?.refreshToken;

        if (!refreshToken) throw new Error('No refresh token available.');

        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refreshToken }
        );

        const newToken = data.accessToken;

        // Patch the persisted Zustand store in localStorage
        const authRaw = JSON.parse(localStorage.getItem('layoscan-auth') || '{}');
        if (authRaw.state) {
          authRaw.state.accessToken = newToken;
          localStorage.setItem('layoscan-auth', JSON.stringify(authRaw));
        }

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('layoscan-auth');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
