import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const runtime = fs.readFileSync(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/api/securepay/subscription/index.ts', import.meta.url), 'utf8');
const dto = fs.readFileSync(new URL('../src/api/securepay/subscription/dto.ts', import.meta.url), 'utf8');
const adapters = fs.readFileSync(new URL('../src/api/securepay/subscription/adapters.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/activation/ActivationExperience.tsx', import.meta.url), 'utf8');
const home = fs.readFileSync(new URL('../src/components/SignedOutHome.tsx', import.meta.url), 'utf8');

const requiredEndpoints = [
  '/api/v1/subscriptions/me',
  '/api/v1/subscriptions/me/activation-agreement',
  '/api/v1/subscriptions/me/activation-agreement/confirm',
  '/api/v1/subscriptions/me/billing-cycles',
];

const requiredFundingEndpoints = [
  '/api/v1/subscriptions/me/activation-funding',
  '/api/v1/subscriptions/me/activation-funding/verification/prepare',
  '/api/v1/subscriptions/me/activation-funding/verification/initiate',
  '/api/v1/subscriptions/me/activation-funding/reserve/prepare',
  '/api/v1/subscriptions/me/activation-funding/reserve/establish',
];

test('activation uses the real Phase 14 subscription/Agreement endpoints', () => {
  for (const endpoint of requiredEndpoints) assert.match(api, new RegExp(endpoint.replaceAll('/', '\\/')));
  assert.match(api, /auth: 'required'/);
});

test('activation Agreement renders backend-authored canonical content and exact version evidence', () => {
  for (const field of ['agreementVersionId', 'contentHash', 'title', 'purpose', 'description', 'confirmed', 'confirmedAt']) {
    assert.match(dto, new RegExp(`\\b${field}\\b`));
    assert.match(experience, new RegExp(`agreement\\.${field}`));
  }
});

test('plan choice never hardcodes the activation-funding total in the frontend', () => {
  assert.doesNotMatch(experience, /KES\s+(400|500)\b/);
  assert.match(experience, /does not calculate those figures itself/);
});

test('confirmation is explicit and precedes billing preparation', () => {
  const confirm = experience.indexOf('confirmActivationAgreement');
  const billing = experience.indexOf('prepareCurrentBillingCycle');
  assert.ok(confirm >= 0 && billing > confirm);
  assert.match(experience, /Yes, this is what I agree to/);
  assert.match(experience, /!agreement\?\.confirmed/);
});

test('prepared billing on its own is never labeled as full activation completion', () => {
  // The subscription-only billing section itself must never claim completion.
  const billingSectionEnd = experience.indexOf('ActivationFundingSection');
  const billingSection = experience.slice(experience.indexOf('First subscription payment intent'), billingSectionEnd);
  assert.doesNotMatch(billingSection, /Activation is complete/i);
});

test('activation-funding orchestration uses the real Final Completion Phase 1 endpoints', () => {
  for (const endpoint of requiredFundingEndpoints) assert.match(api, new RegExp(endpoint.replaceAll('/', '\\/')));
});

test('activation-funding status and next action are read from the backend, never fabricated', () => {
  assert.match(dto, /financiallyEnabled/);
  assert.match(dto, /nextAction/);
  assert.match(experience, /funding\.financiallyEnabled/);
  assert.match(experience, /funding\.nextAction/);
  // The only place "Activation is complete" may render is behind the backend-owned
  // financiallyEnabled flag -- never unconditionally, never computed client-side.
  const completeIndex = experience.indexOf('Activation is complete');
  assert.ok(completeIndex > 0);
  const guardWindow = experience.slice(Math.max(0, completeIndex - 400), completeIndex);
  assert.match(guardWindow, /funding\.financiallyEnabled\s*\?/);
});

test('activation-funding client fails closed on any unrecognized backend enum value', () => {
  assert.match(adapters, /activationFundingStatusView/);
  assert.match(adapters, /unrecognized activation-funding next action/);
  assert.match(adapters, /unrecognized activation-funding component state/);
  // Defense in depth: the component itself also has a default branch, not just the adapter.
  assert.match(experience, /default:/);
  assert.match(experience, /unrecognized activation state/i);
});

test('activation-funding handles pending, failed, and destination-missing states honestly', () => {
  for (const nextAction of [
    'PAY_VERIFICATION_INTENT', 'PAY_RESERVE_INTENT', 'REGISTER_SETTLEMENT_DESTINATION', 'RETRY_FAILED_COMPONENT',
  ]) {
    assert.match(experience, new RegExp(`'${nextAction}'`));
  }
  // Never claims a payment as paid or a transfer as sent from this screen alone.
  assert.doesNotMatch(experience, /markAsPaid|assumePaid|Math\.random\(\)/);
});

test('unavailable next actions are explicit, truthful dead-end states, never a fabricated payment form', () => {
  // Programme-controller correction: these must not silently tell the user to "use your usual
  // SecurePay Money flow" or claim settlement-destination registration is "managed outside
  // Activation" with no real handoff -- neither surface exists yet in this app, so both must be
  // disclosed as genuine, explicit Phase-1 gaps.
  assert.doesNotMatch(experience, /use your usual SecurePay Money flow/i);
  assert.doesNotMatch(experience, /managed outside Activation/i);
  assert.match(experience, /does not yet provide an in-product way to (complete|register)/);
  assert.match(experience, /UnavailableActionState/);
  // No fabricated payment form: no local amount/card/phone input state for paying an intent.
  assert.doesNotMatch(experience, /useState.*[Cc]ardNumber|useState.*[Pp]honeNumber/);
});

test('a failed component is retried through its own real, attempt-scoped prepare action, never a generic refresh only', () => {
  assert.match(experience, /RetryFailedComponentPanel/);
  assert.match(experience, /failed\.componentType === 'ACTIVATION_VERIFICATION_RETURN'/);
  assert.match(experience, /'PREPARE_VERIFICATION_FUNDING'/);
  assert.match(experience, /failed\.componentType === 'ACTIVATION_REVIEW_RESERVE'/);
  assert.match(experience, /'PREPARE_RESERVE_FUNDING'/);
  // The subscription component's retry gap is disclosed honestly, not silently offered.
  assert.match(experience, /subscription billing-cycle mechanism/);
});

test('initiating the settlement-verification transfer always re-reads live status afterward', () => {
  const start = experience.indexOf("case 'INITIATE_VERIFICATION_TRANSFER'");
  const nextCase = experience.indexOf('case ', start + 1);
  const block = experience.slice(start, nextCase);
  assert.match(block, /initiateVerificationTransfer\(\)/);
  assert.match(block, /activationFundingStatus\(\)/);
});

test('failed authority reads do not expose empty-state mutation actions', () => {
  assert.match(experience, /authorityReadFailed/);
  assert.match(experience, /!authorityReadFailed\s*&&\s*!loading\s*&&\s*!subscription/);
  assert.match(experience, /subscription\s*&&\s*!agreement\s*&&\s*!loading\s*&&\s*!authorityReadFailed/);
});

test('activation has a real signed-out entry point and a first-class runtime route', () => {
  assert.match(home, /href="#\/activate"/);
  assert.match(runtime, /ActivationExperience/);
  assert.match(runtime, /useActivationRoute/);
  assert.match(runtime, /subscriptionGateway/);
});

test('activation never imports fixture financial truth', () => {
  for (const forbidden of ['demoData', 'moneyData', 'ecosystemData', 'mockAgent']) assert.doesNotMatch(experience, new RegExp(forbidden));
});
