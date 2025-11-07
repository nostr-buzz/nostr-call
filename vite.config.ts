import path from "node:path";

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: '/nostr-call/',
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    // Ensure React is properly defined
    __DEV__: JSON.stringify(false),
  },
  plugins: [
    react(),
  ],
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB
    target: 'es2020', // Better compatibility
    minify: true, // Use default minification
    sourcemap: false, // Disable sourcemaps for production
    rollupOptions: {
      output: {
        // Completely disable manual chunking to avoid conflicts
        manualChunks: undefined,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    onConsoleLog(log) {
      return !log.includes("React Router Future Flag Warning");
    },
    env: {
      DEBUG_PRINT_LIMIT: '0', // Suppress DOM output that exceeds AI context windows
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      stream: 'readable-stream',
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer', 'readable-stream', 'process/browser'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
}));