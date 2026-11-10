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
        gate2Store: fileURLToPath(new URL('./checkout-gate2-store.html', import.meta.url)),
        gate2Stays: fileURLToPath(new URL('./checkout-gate2-shortstays.html', import.meta.url)),
        gate3Store: fileURLToPath(new URL('./checkout-gate3-store.html', import.meta.url)),
        gate3Stays: fileURLToPath(new URL('./checkout-gate3-shortstays.html', import.meta.url)),
        gate4Store: fileURLToPath(new URL('./checkout-gate4-store.html', import.meta.url)),
        gate4Stays: fileURLToPath(new URL('./checkout-gate4-shortstays.html', import.meta.url)),
        phase5HostDirectory: fileURLToPath(new URL('./phase5-hosts.html', import.meta.url)),
        phase5StoreHost: fileURLToPath(new URL('./phase5-store-host.html', import.meta.url)),
        phase5ShortStaysHost: fileURLToPath(new URL('./phase5-shortstays-host.html', import.meta.url)),
        phase5ExpansionReadiness: fileURLToPath(new URL('./phase5-gate4-expansion.html', import.meta.url)),
      },
    },
  },
});
