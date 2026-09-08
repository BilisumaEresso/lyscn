import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dashboard app runs on port 5174
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
});
