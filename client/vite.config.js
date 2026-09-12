import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Dev-only convenience: the client calls /api/* on its own origin and Vite
    // forwards to Express, so there is no CORS dance while developing.
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Firebase is large and changes rarely; keeping it in its own chunk
        // means a UI tweak does not invalidate it in the browser cache.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth'],
          motion: ['framer-motion'],
          router: ['react-router-dom'],
        },
      },
    },
  },
});
