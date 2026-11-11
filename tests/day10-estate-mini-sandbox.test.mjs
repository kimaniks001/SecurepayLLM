import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const mini = read('src/mini/MiniEstateBillSandbox.tsx');
const entry = read('src/mini/MiniExperience.tsx');
const config = JSON.parse(read('vercel.json'));

test('same original Mini dispatches to a nonfinancial Estate bill source', () => {
  assert.match(entry, /<MiniEstateBillSandbox language=\{lang\}\/>/);
  assert.match(entry, /urlParams\?\.get\('estateBillPreview'\) === '1'/);
  assert.match(mini, /<MiniFundingPreview/);
  assert.match(mini, /SIMULATION ONLY/);
  assert.match(mini, /No real transfer|No money|No payment/i);
  assert.doesNotMatch(mini, /fetch\(|axios\.|\.post\(/);
});
test('Mini validates Estate dev parent origin and invoice source fields', () => {
  assert.match(mini, /https:\/\/varsity-dev\.estate\.ke/);
  assert.doesNotMatch(mini, /'https:\/\/varsity\.estate\.ke'/);
  assert.match(mini, /event\.source !== window\.parent \|\| event\.origin !== origin/);
  assert.match(mini, /source !== 'ESTATE_BILL'/);
  assert.match(mini, /Number\.isSafeInteger\(b\.amountMinor\)/);
  assert.match(mini, /window\.parent\.postMessage/);
  assert.match(mini, /paymentVerified: false, amountVerified: false/);
});
test('frame-ancestors lets only the named test Estate embed this preview', () => {
  const csp = config.headers.find(h => h.source === '/mini.html')?.headers
    .find(h => h.key === 'Content-Security-Policy')?.value;
  assert.ok(csp?.includes('https://varsity-dev.estate.ke'));
  assert.ok(csp?.includes("'self'"));
  assert.ok(!csp?.includes(' https://varsity.estate.ke'));
});
