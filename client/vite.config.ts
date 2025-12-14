import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import rollupNodePolyFill from 'rollup-plugin-polyfill-node';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { global: 'globalThis' },
  server: {
    host: '0.0.0.0',  // Allow access from other devices on network
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5005',  // Backend server
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying:', req.method, req.url, '→', options.target + req.url);
          });
        }
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5005',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  },
  resolve: {
    alias: {
      // Provide browser implementations for Node core modules used by third-party libs
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer',
      process: 'process/browser',
    },
  },
  optimizeDeps: {
    // Ensure these modules are pre-bundled by Vite so browser polyfills are picked up
    include: ['buffer', 'process', 'crypto-browserify', 'stream-browserify'],
    esbuildOptions: {
      // Node.js global to globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    rollupOptions: {
      plugins: [rollupNodePolyFill()],
    },
  },
});