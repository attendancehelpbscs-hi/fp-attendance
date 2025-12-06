import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import rollupNodePolyFill from 'rollup-plugin-polyfill-node';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { global: 'globalThis' },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
    },
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
