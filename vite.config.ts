import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Mini is its own HTML entry; the approved Living Workspace remains unchanged.
// Certified release builds omit demonstration host pages entirely.
// This setting affects build outputs, never backend Money authority.
const releaseBuild = process.env.SECUREPAY_MINI_RELEASE_BUILD === '1';
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
        ...(releaseBuild ? {} : {
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
        }),
      },
    },
  },
});
