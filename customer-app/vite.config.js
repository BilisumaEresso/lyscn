import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Customer app runs on the default port 5173
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
