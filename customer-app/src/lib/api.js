import axios from 'axios';
import { useNetworkStore } from '../store/networkStore';

/**
 * Customer-app API client — no auth headers needed.
 * All endpoints used here are public (/api/public/*, /api/products/public, /api/orders/public).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
});

api.interceptors.response.use(
  (response) => {
    useNetworkStore.getState().reportNetworkSuccess();
    return response;
  },
  (error) => {
    // If request failed because of network disconnection or timeout
    if (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      useNetworkStore.getState().reportNetworkFailure();
    }
    return Promise.reject(error);
  }
);

export default api;
