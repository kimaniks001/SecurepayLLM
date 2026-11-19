import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(
  new URL('../src/features/mini-collect/C4MyContributionStatus.tsx', import.meta.url), 'utf8');
const c3d = readFileSync(
  new URL('../src/features/mini-collect/C3DClosingPreview.tsx', import.meta.url), 'utf8');

test('contributor can follow C3D closing plan to personal contribution status', () => {
  assert.match(c3d, /See how contributors check their own money/);
  assert.match(c3d, /C4MyContributionStatus onBack=/);
  assert.match(page, /onClick=\{onBack\}/);
});

test('without an actual authenticated collection Mini never invents people or funds', () => {
  assert.match(page, /No personal contribution is connected here/);
  assert.match(page, /We haven.t received or verified any payments here/);
  assert.match(page, /records\?: MyContributionRecords/);
  assert.doesNotMatch(page, /fetch\(|axios|localStorage|sessionStorage|Math\.random/);
});

test('only certified source is called verified, not pending or ledger-only status', () => {
  assert.match(page, /POSTED_AWAITING_PROVIDER_CERTIFICATION/);
  assert.match(page, /VERIFIED_FUNDING/);
  assert.match(page, /c\.state === 'VERIFIED_FUNDING' && c\.verifiedFundedAmountMinor !== null/);
});

test('missing entitlement remains unknown, never becomes zero or settled', () => {
  assert.match(page, /Not yet determined\. This does not mean KSh 0 is owed/);
  assert.match(page, /CALCULATED_NOT_AUTHORIZED/);
  assert.match(page, /not an issued refund or money received/);
  assert.match(page, /We only mark money returned when the provider and ledger independently prove it/);
  assert.doesNotMatch(page, /setPaymentReady|initiateRefund|\.refund\(/);
});
