import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    host: true, // Allow external connections
    proxy: {
      '/auth': {
        target: process.env.VITE_API_URL || 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react'],
        },
      },
    },
  },
  define: {
    // Ensure environment variables are available at build time
    __API_BASE_URL__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3002'),
  },
});