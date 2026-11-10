/**
 * Run checkout Phase 0 fixture validation plus existing Mini cohort/phase 1–4 gates.
 * Vercel limits vercel.json buildCommand to 256 characters; keep this file
 * and the checks rather than silently dropping tests.
 */
import { spawnSync } from 'node:child_process';

const suites = [
  'tests/securepay-mini-trader-cohort.test.mjs',
  'tests/securepay-mini-checkout-phase0.test.mjs',
  'tests/securepay-mini-checkout-phase1.test.mjs',
  'tests/securepay-mini-checkout-phase2.test.mjs',
  'tests/securepay-mini-checkout-launcher-auth.test.mjs',
  'tests/securepay-mini-checkout-phase3-store-offer.test.mjs',
  'tests/securepay-mini-phase3-offline-sandbox.test.mjs',
  'tests/securepay-mini-phase3-gate2.test.mjs',
  'tests/securepay-mini-phase3-gate3.test.mjs',
  'tests/securepay-mini-phase3-gate4.test.mjs',
  'tests/securepay-mini-phase3-real-store-authority.test.mjs',
  'tests/securepay-mini-phase4-resilience.test.mjs',
  'tests/securepay-mini-phase4-authority-compatibility.test.mjs',
  'tests/securepay-mini-phase4-source-handoff.test.mjs',
  'tests/securepay-mini-checkout-brand-link.test.mjs',
  'tests/securepay-mini-phase4-full-journey-offline.test.mjs',
  'tests/securepay-mini-phase4-integrated-milestones.test.mjs',
  'tests/securepay-mini-phase4-add-payment-method.test.mjs',
  'tests/securepay-mini-phase1.test.mjs',
  'tests/securepay-mini-phase2.test.mjs',
  'tests/securepay-mini-phase3.test.mjs',
  'tests/securepay-mini-phase4.test.mjs',
];
for (const filename of suites) {
  console.log('\n== SecurePay Mini focused suite: ' + filename + ' ==');
  const run = spawnSync(process.execPath, ['--test', filename], { stdio: 'inherit' });
  if (run.error || run.status !== 0) {
    console.error('Mini verification failed at ' + filename, run.error || run.signal || run.status);
    process.exit(1);
  }
}
console.log('\n== SecurePay frontend TypeScript verification ==');
const ts = spawnSync('npm', ['run', 'typecheck'], { stdio:'inherit' });
if (ts.error || ts.status !== 0) {
  console.error('TypeScript verification failed', ts.error || ts.signal || ts.status);
  process.exit(1);
}
console.log('\nFocused Mini checks and TypeScript passed; proceeding to Vite build.');
