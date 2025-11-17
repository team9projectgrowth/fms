import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split node_modules into separate chunks
          if (id.includes('node_modules')) {
            // Split Supabase into its own chunk
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Split React and React DOM into their own chunk
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Split lucide-react icons into their own chunk
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // All other node_modules go into vendor chunk
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
