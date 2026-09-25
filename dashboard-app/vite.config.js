import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "LayoScan Dashboard",
        short_name: "LayoScan Dashboard",
        description:
          "LayoScan Dashboard — manage your restaurant menus, tables, and orders in real time.",
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
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MiB to support high-res print template assets
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,ico,json}"],
        // Keep API runtime caching intentionally light: order/table/menu data must never be served stale.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api/") ||
              url.pathname.includes("/api/"),
            handler: "NetworkFirst",
            options: {
              networkTimeoutSeconds: 5,
              cacheName: "layoscan-dashboard-api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5174,
  },
});
