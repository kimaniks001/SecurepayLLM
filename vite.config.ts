import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Mini is its own HTML entry; the approved Living Workspace remains unchanged.
// Customer-facing builds do NOT ship demo host pages by default.
// Only an explicitly isolated developer build may set
// SECUREPAY_MINI_RELEASE_BUILD=0 to include test/demo entry points.
// This build switch is NOT a payment authorisation or backend Money switch.
const releaseBuild = process.env.SECUREPAY_MINI_RELEASE_BUILD !== '0';
// Demo fixtures are NOT part of the default customer build. URL query parameters
// cannot turn them on. Only an explicit isolated engineering build can do that.
const ownerFixtureBuild = !releaseBuild && process.env.SECUREPAY_MINI_OWNER_FIXTURES === '1';
export default defineConfig({
  plugins: [
    react(),
    {
      name:'securepay-mini-customer-no-fixtures',
      enforce:'pre',
      resolveId(id:string) {
        if(!ownerFixtureBuild && /(?:^|[/\\])miniInteractiveDemo(?:\.ts)?$/.test(id)) {
          return fileURLToPath(new URL('./src/mini/miniNoDemo.ts', import.meta.url));
        }
        if(!ownerFixtureBuild && /(?:^|[/\\])MiniOwnerMoneyTest(?:\.tsx)?$/.test(id)) {
          return fileURLToPath(new URL('./src/mini/MiniOwnerMoneyDisabled.tsx', import.meta.url));
        }
        return null;
      },
    },
  ],
  define: {
    __SECUREPAY_MINI_OWNER_FIXTURES__: JSON.stringify(ownerFixtureBuild),
  },
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
        // Business Settings Preview is fictional, not the actual verified merchant settings.
        // Keep this HTML entry only in an explicit isolated engineering build.
        ...(releaseBuild ? {} : {
        businessSettings: fileURLToPath(new URL('./business-settings.html', import.meta.url)),
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
