import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import rollupNodePolyFill from 'rollup-plugin-polyfill-node';
import fs from 'fs';
import path from 'path';

// Check for HTTPS certificates
const certPath = path.resolve(__dirname, '../certs/server.crt');
const keyPath = path.resolve(__dirname, '../certs/server.key');

let httpsConfig = undefined;
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsConfig = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  console.log('🔒 HTTPS certificates found, enabling HTTPS');
} else {
  console.log('⚠️  HTTPS certificates not found. Run "node generate-certs.js" to generate them.');
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { global: 'globalThis' },
  server: {
    host: '0.0.0.0',  // Allow access from other devices on network
    port: 5173,
    https: httpsConfig,
    proxy: {
      '/api': {
        target: httpsConfig ? 'https://127.0.0.1:5005' : 'http://127.0.0.1:5005',
        changeOrigin: true,
        secure: !httpsConfig, // Only allow insecure connections if no HTTPS
      },
      '/socket.io': {
        target: httpsConfig ? 'https://127.0.0.1:5005' : 'http://127.0.0.1:5005',
        changeOrigin: true,
        secure: !httpsConfig, // Only allow insecure connections if no HTTPS
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