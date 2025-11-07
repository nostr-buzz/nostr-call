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
    minify: 'esbuild', // Use esbuild for faster builds
    rollupOptions: {
      output: {
        // More granular chunking strategy
        manualChunks: (id) => {
          // React ecosystem
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('react-router')) {
            return 'react-router';
          }
          
          // Radix UI components (split into smaller chunks)
          if (id.includes('@radix-ui')) {
            if (id.includes('dialog') || id.includes('popover') || id.includes('dropdown')) {
              return 'radix-overlays';
            }
            if (id.includes('form') || id.includes('input') || id.includes('select')) {
              return 'radix-forms';
            }
            return 'radix-ui';
          }
          
          // Nostr ecosystem
          if (id.includes('nostr-tools') || id.includes('@nostrify')) {
            return 'nostr-vendor';
          }
          
          // WebRTC
          if (id.includes('simple-peer') || id.includes('webrtc')) {
            return 'webrtc-vendor';
          }
          
          // Charts and visualization (heavy)
          if (id.includes('recharts') || id.includes('chart')) {
            return 'charts-vendor';
          }
          
          // Form handling
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
            return 'forms-vendor';
          }
          
          // State management
          if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
            return 'state-vendor';
          }
          
          // UI utilities and animations
          if (id.includes('lucide-react') || id.includes('cmdk') || id.includes('vaul')) {
            return 'ui-vendor';
          }
          
          // Date and time
          if (id.includes('date-fns') || id.includes('react-day-picker')) {
            return 'date-vendor';
          }
          
          // Wallet and crypto
          if (id.includes('@getalby') || id.includes('webln')) {
            return 'wallet-vendor';
          }
          
          // Utility libraries
          if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
            return 'utils-vendor';
          }
          
          // Node polyfills
          if (id.includes('buffer') || id.includes('process') || id.includes('readable-stream')) {
            return 'polyfills';
          }
          
          // Large component files
          if (id.includes('src/components')) {
            if (id.includes('ZapDialog') || id.includes('WalletModal')) {
              return 'payment-components';
            }
            if (id.includes('auth/') || id.includes('EditProfile')) {
              return 'auth-components';
            }
            if (id.includes('ui/sidebar') || id.includes('ui/chart')) {
              return 'heavy-ui';
            }
          }
          
          // Default chunking for node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
        // Optimize asset names
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
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
}));