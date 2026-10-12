import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "LayoScan",
        short_name: "LayoScan",
        description:
          "LayoScan — QR-based ordering for restaurants. Scan, browse, and order from your table.",
        theme_color: "#121A2C",
        background_color: "#F5F8F7",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,ico,json}"],
        importScripts: ["/sw-notifications.js"],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
