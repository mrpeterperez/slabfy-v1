import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  plugins: [
    react({
      babel: isDev ? {
        plugins: [
          // 🔥 Inject data-source="file:line:col" into every JSX element in dev
          function injectDataSource({ types: t }: any) {
            return {
              visitor: {
                JSXOpeningElement(path: any, state: any) {
                  const { filename } = state.file.opts;
                  const { line, column } = path.node.loc?.start || {};
                  
                  if (!filename || !line) return;
                  
                  // Get relative path from project root
                  const relativePath = filename.replace(process.cwd() + '/', '');
                  
                  // Create data-source attribute with file:line:column
                  const sourceValue = `${relativePath}:${line}:${column}`;
                  
                  // Check if data-source already exists
                  const hasDataSource = path.node.attributes.some(
                    (attr: any) => attr.name?.name === 'data-source'
                  );
                  
                  if (!hasDataSource) {
                    path.node.attributes.push(
                      t.jsxAttribute(
                        t.jsxIdentifier('data-source'),
                        t.stringLiteral(sourceValue)
                      )
                    );
                  }
                }
              }
            };
          }
        ]
      } : undefined
    }),
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
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        sourcemap: true,
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
    host: true, // Listen on all network interfaces
    sourcemapIgnoreList: () => false,
  },
  css: {
    devSourcemap: true,
  },
  esbuild: {
    sourcemap: true,
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: true,
    minify: "esbuild",
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        sourcemap: true,
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("react")) return "vendor-react";
            if (id.includes("@tanstack")) return "vendor-query";
            if (id.includes("lightweight-charts")) return "charts";
            if (id.includes("lucide-react")) return "icons";
          }
        },
      },
    },
  },
});