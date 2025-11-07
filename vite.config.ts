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
  },
  plugins: [
    react(),
  ],
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB
    target: 'esnext', // Modern browser support for better optimization
    minify: 'esbuild', // Use esbuild for faster builds and better compatibility
    rollupOptions: {
      output: {
        // Minimal chunking to avoid React conflicts
        manualChunks: undefined, // Disable manual chunking entirely
        // Safe chunk and asset naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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