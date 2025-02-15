import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@microsoft/teams-js', '@fluentui/react-components'],
        },
      },
    },
  },
  server: {
    port: 3000,
    https: true, // Required for Teams
  },
});