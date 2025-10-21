import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      srcDir: "src",
      filename: "sw.ts",
      manifest: {
        name: "SlabFy",
        short_name: "SlabFy",
        start_url: "/",
        display: "standalone",
        background_color: "#0b0b0b",
        theme_color: "#0b0b0b",
        icons: [],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"]
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  server: {
    sourcemapIgnoreList: () => false, // Show all source files in DevTools
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: true, // 🗺️ Generate source maps for debugging
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('@tanstack')) return 'vendor-query';
            if (id.includes('lightweight-charts')) return 'charts';
            if (id.includes('lucide-react')) return 'icons';
          }
          return undefined;
        },
      },
    },
  },
});
