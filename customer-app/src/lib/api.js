import axios from 'axios';

/**
 * Customer-app API client — no auth headers needed.
 * All endpoints used here are public (/api/public/*, /api/products/public, /api/orders/public).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

export default api;
