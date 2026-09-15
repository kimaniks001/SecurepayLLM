import { lazy, Suspense } from 'react';
import { runtimeMode } from './config/securepay';

// Vite removes the unreachable fixture import from production builds.
const FixtureApp = import.meta.env.DEV && import.meta.env.VITE_SECUREPAY_MODE === 'fixture'
  ? lazy(() => import('./App')) : null;

export default function RuntimeApp() {
  let mode;
  try { mode = runtimeMode(import.meta.env.VITE_SECUREPAY_MODE, import.meta.env.PROD); }
  catch { return <Unavailable />; }
  if (mode === 'fixture' && FixtureApp) {
    return <Suspense fallback={<p role="status">Loading preview…</p>}><FixtureApp /></Suspense>;
  }
  // Foundation PR only: later slices mount real gateway-backed journeys here.
  return <Unavailable />;
}
function Unavailable() {
  return <main className="min-h-screen bg-cream-50 text-forest-800 flex items-center justify-center p-6">
    <div role="status" className="max-w-md text-center">
      <h1 className="font-display text-2xl">SecurePay is unavailable</h1>
      <p className="mt-3 text-sand-600">Please try again later.</p>
    </div>
  </main>;
}
