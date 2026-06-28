import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  // Prevent Vite from obscuring Rust errors
  clearScreen: false,

  plugins: [react(), tailwindcss()],

  server: {
    host: host || "0.0.0.0",
    // Must match devUrl port in tauri.conf.json
    port: 19274,
    // Tauri expects a fixed port — fail if unavailable
    strictPort: true,
    allowedHosts: ["andrew.yeetdesigns.cc", "api.policeroleplay.community", "at.yeetdesigns.cc"],
    hmr: host
      ? { protocol: 'ws', host, port: 1421 }
      : undefined,
    watch: {
      // Don't trigger HMR on changes to the Rust source
      ignored: ['**/src-tauri/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    host: "0.0.0.0",
    port: 19274,
    allowedHosts: ["andrew.yeetdesigns.cc", "api.policeroleplay.community", "at.yeetdesigns.cc"],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Expose VITE_ and TAURI_ENV_* variables to the frontend
  envPrefix: ['VITE_', 'TAURI_ENV_*'],

  build: {
    // Tauri uses Chromium on Windows, WebKit on macOS/Linux
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // Don't minify debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    // Source maps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
