import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Mini Phase 1 is a separate HTML entry. The approved index.html / RuntimeApp
// remains unchanged; the fictional merchant host is a non-production UX surface.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        mini: fileURLToPath(new URL('./mini.html', import.meta.url)),
        miniHostPreview: fileURLToPath(new URL('./mini-host-preview.html', import.meta.url)),
        demoStore: fileURLToPath(new URL('./checkout-demo-store.html', import.meta.url)),
        demoShortStays: fileURLToPath(new URL('./checkout-demo-shortstays.html', import.meta.url)),
        storeOfferReview: fileURLToPath(new URL('./checkout-store-offer-preview.html', import.meta.url)),
      },
    },
  },
});
