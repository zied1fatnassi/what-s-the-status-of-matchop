import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'watch-src-explicitly',
      configureServer(server) {
        server.watcher.add(path.resolve(__dirname, 'src'))
      }
    }
  ],

  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',

    // Enable minification
    minify: 'esbuild',

    // CSS code splitting
    cssCodeSplit: true,

    // Inline assets smaller than 4kb
    assetsInlineLimit: 4096,

    // Generate source maps for debugging (disable in prod if needed)
    sourcemap: false,

    // Rollup options for chunking
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom'],
          // Router
          'vendor-router': ['react-router-dom'],
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          // i18n
          'vendor-i18n': ['i18next', 'react-i18next'],
          // Icons (large library)
          'vendor-icons': ['lucide-react'],
        },
        // Chunk file naming for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // Warn on large chunks
    chunkSizeWarningLimit: 500,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
  },

  // Server configuration for development
  server: {
    host: true,
    hmr: true,
    watch: {
      usePolling: true,
      interval: 300,
      ignored: (filePath) => {
        if (!filePath) return false
        const normalized = filePath.replace(/\\/g, '/')
        if (normalized.includes('/node_modules/')) return true
        if (normalized.includes('/.git/objects/')) return true
        if (normalized.includes('/.git/refs/')) return true
        if (normalized.includes('/dist/')) return true
        return false
      }
    },
    fs: {
      allow: [__dirname],
      deny: ['.env', '.env.*', '*.{crt,pem}'],
    },
  },
})
