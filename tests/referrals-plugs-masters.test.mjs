import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

// Use Vite's existing esbuild dependency to run pure TypeScript with Node's built-in test runner.
const bundle = await build({ stdin: { contents: `
export * as masterController from './src/features/master/controller';
export * as masterAdapters from './src/api/securepay/master/adapters';
export * as masterGatewayModule from './src/api/securepay/master';
export * as plugController from './src/features/plug/controller';
export * as marketNetworkAdapters from './src/api/securepay/marketnetwork/adapters';
export * as marketNetworkGatewayModule from './src/api/securepay/marketnetwork';
export * as referralController from './src/features/referral/controller';
export * as referralAdapters from './src/api/securepay/referral/adapters';
export * as referralGatewayModule from './src/api/securepay/referral';
export * as agreementAdapters from './src/api/securepay/agreements/adapters';
export * as agreementGatewayModule from './src/api/securepay/agreements';
export * as http from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

// ─── Fixtures (verified shapes: SecurePayAPI feat/securepay-phase11-referrals-plugs-masters @ 978437f3) ──

const masterProfileResponse = (overrides = {}) => ({
  identityId: 'id-master-1', designationStatus: 'ACTIVE', expertiseDomains: ['structural engineering'],
  serviceArea: 'Nairobi', availabilityStatus: 'AVAILABLE', pricingBasis: 'From KES 15,000',
  qualificationRefs: ['BSc Civil Engineering'], accreditationRefs: ['EBK registration ref ABC'],
  inspectionCapable: true, businessIdentityId: null, designatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});
const masterRequestResponse = (overrides = {}) => ({
  id: 'req-1', requestingIdentityId: 'id-requester-1', masterIdentityId: 'id-master-1',
  sourceContext: 'GENERAL_ADVICE', agreementId: null, agreementVersionId: null, milestoneId: null,
  obligationId: null, question: 'Is this sound?', scope: 'Inspect the wall', evidenceRefs: [],
  siteVisitRequired: false, currency: null, quotedCostMinor: null, status: 'REQUESTED', createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});
const masterOpinionResponse = (overrides = {}) => ({
  id: 'op-1', requestId: 'req-1', masterIdentityId: 'id-master-1', agreementId: null, agreementVersionId: null,
  question: 'Is this sound?', scope: 'Inspect the wall', reviewedEvidenceRefs: [], siteVisitDetails: null,
  observations: 'Looks fine', opinionText: 'The wall is structurally sound.', limitations: 'Visual only',
  previousOpinionId: null, createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});
const customerMarketRequestResponse = (overrides = {}) => ({
  requestId: 'mkt-req-1', requestType: 'GENERAL_SECUREPAY_HELP', status: 'OPEN', offerId: null, title: null,
  summary: null, requiredProgramCode: null, interestedCount: 0, createdAt: '2026-01-01T00:00:00Z', cancelledAt: null,
  ...overrides,
});
const interestedCandidateResponse = (overrides = {}) => ({ candidateRef: 'cand-1', interestedAt: '2026-01-01T00:00:00Z', ...overrides });
const customerPlugRelationshipResponse = (overrides = {}) => ({
  relationshipRef: 'rel-1', requestId: 'mkt-req-1', requestType: 'GENERAL_SECUREPAY_HELP', status: 'ACTIVE',
  openedAt: '2026-01-01T00:00:00Z', contactExchangeAvailable: false,
  ...overrides,
});
const agreementPlugAttributionResponse = (overrides = {}) => ({
  attributionRef: 'attr-1', agreementId: 'agr-1', relationshipRef: 'rel-1', plugKsNumber: 'KS-900',
  attributedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});
const keyContractReferralResponse = (overrides = {}) => ({
  agreementId: 'agr-1', state: 'NO_INTRODUCTION', plugKsNumber: null, introducedAt: null,
  platformFeeMinor: null, rewardAmountMinor: null, currency: null, shareRuleVersion: null,
  rewardEarned: false, rewardPaid: false, qualifiedAt: null,
  ...overrides,
});
const referralRelationshipResponse = (overrides = {}) => ({
  relationshipId: 'refrel-1', referredKsNumber: 'KS-500', status: 'PENDING', createdAt: '2026-01-01T00:00:00Z',
  activatedAt: null, qualifiedAt: null, rewardAmountMinor: null, rewardCurrency: null, pricingVersion: null,
  referralRuleVersion: null, qualificationExplanation: null, settlementEvidenceReference: null,
  ...overrides,
});
const referralHistoryResponse = (overrides = {}) => ({
  referralCode: 'ABC123', totalReferred: 1, activatedOrLaterCount: 0, relationships: [referralRelationshipResponse()],
  ...overrides,
});

function fakeHttp() {
  const calls = [];
  return { calls, http: { request: async (path, options = {}) => { calls.push({ path, method: options.method ?? 'GET', auth: options.auth, headers: options.headers }); return {}; } } };
}
function throwingApiError(status, message = 'failure') {
  return new api.http.ApiError('http', message, status);
}

const FEATURE_FILES = [
  'src/features/master/controller.ts', 'src/features/master/MasterExperience.tsx',
  'src/features/plug/controller.ts', 'src/features/plug/PlugExperience.tsx',
  'src/features/referral/controller.ts', 'src/features/referral/ReferralExperience.tsx',
  'src/features/ecosystem/EcosystemExperience.tsx',
  'src/api/securepay/master/dto.ts', 'src/api/securepay/master/adapters.ts', 'src/api/securepay/master/index.ts',
  'src/api/securepay/marketnetwork/dto.ts', 'src/api/securepay/marketnetwork/adapters.ts', 'src/api/securepay/marketnetwork/index.ts',
  'src/api/securepay/referral/dto.ts', 'src/api/securepay/referral/adapters.ts', 'src/api/securepay/referral/index.ts',
];

// ─── A. Production bundle exclusion ─────────────────────────

test('A. Real production RuntimeApp path does not import ecosystemData.ts', async () => {
  const result = await build({ entryPoints: ['src/RuntimeApp.tsx'], bundle: true, write: false, format: 'esm', external: ['react'], metafile: true, define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_SECUREPAY_MODE': '"real"' }, loader: { '.png': 'dataurl' } });
  const paths = Object.keys(result.metafile.inputs);
  assert.equal(paths.some(path => /src\/ecosystemData\.ts$/.test(path)), false);
  assert.equal(paths.some(path => /src\/App\.tsx$/.test(path)), false);
  assert.ok(paths.some(path => /features\/master\/controller\.ts$/.test(path)));
  assert.ok(paths.some(path => /features\/plug\/controller\.ts$/.test(path)));
  assert.ok(paths.some(path => /features\/referral\/controller\.ts$/.test(path)));
  assert.ok(paths.some(path => /api\/securepay\/master\/index\.ts$/.test(path)));
});

test('P. No feature/api file for Referrals/Plugs/Masters imports ecosystemData.ts', async () => {
  for (const file of FEATURE_FILES) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /from ['"].*ecosystemData['"]/, `${file} must not import ecosystemData.ts`);
  }
});

// ─── B. API failures never fall back to demo data ─────────────────────────

test('B1. Master profile lookup failure leaves the controller in a closed error state, never demo data', async () => {
  const controller = api.masterController.createMasterController({ profile: async () => { throw throwingApiError(500); } });
  await controller.lookupProfile('id-1');
  assert.equal(controller.getSnapshot().profile.status, 'error');
});

test('B2. Plug candidates load failure leaves the controller in a closed error state, never demo data', async () => {
  const controller = api.plugController.createPlugController({ createRequest: async () => customerMarketRequestResponse(), candidates: async () => { throw throwingApiError(500); }, selectCandidate: async () => ({}), openRelationship: async () => ({}), relationshipLifecycle: async () => ({}), attribution: { attributePlug: async () => ({}), plugAttribution: async () => ({}), referralStatus: async () => ({}) } });
  await controller.loadCandidates('mkt-req-1');
  assert.equal(controller.getSnapshot().candidates.status, 'error');
});

test('B3. Referral history load failure leaves the controller in a closed error state, never demo data', async () => {
  const controller = api.referralController.createReferralController({ myCode: async () => { throw throwingApiError(500); }, myHistory: async () => { throw throwingApiError(500); }, redeem: async () => ({}) });
  await controller.load();
  assert.equal(controller.getSnapshot().history.status, 'error');
  assert.equal(controller.getSnapshot().code.status, 'error');
});

// ─── C. Auth-required endpoints ─────────────────────────

test('C1. Every Master mutation endpoint uses auth:required', async () => {
  const { http, calls } = fakeHttp();
  const gateway = api.masterGatewayModule.createMasterGateway(http);
  await gateway.designateSelf({ expertiseDomains: ['x'], inspectionCapable: false });
  await gateway.createRequest({ masterIdentityId: 'm', sourceContext: 'GENERAL_ADVICE', question: 'q', scope: 's', siteVisitRequired: false });
  await gateway.proposeCost('req-1', { currency: 'KES', quotedCostMinor: 0 });
  await gateway.accept('req-1');
  await gateway.decline('req-1');
  await gateway.submitOpinion('req-1', { opinionText: 'x' });
  assert.ok(calls.every(c => c.auth === 'required'), JSON.stringify(calls));
  assert.equal(calls.length, 6);
});

test('C2. Every customer market-network endpoint uses auth:required', async () => {
  const { http, calls } = fakeHttp();
  const gateway = api.marketNetworkGatewayModule.createMarketNetworkGateway(http);
  await gateway.createRequest('GENERAL_SECUREPAY_HELP', 'idem-1');
  await gateway.myRequests();
  await gateway.cancelRequest('req-1');
  await gateway.candidates('req-1');
  await gateway.selection('req-1');
  await gateway.selectCandidate('req-1', 'cand-1');
  await gateway.relationship('req-1');
  await gateway.openRelationship('req-1');
  await gateway.relationshipLifecycle('rel-1');
  assert.ok(calls.every(c => c.auth === 'required'), JSON.stringify(calls));
  assert.equal(calls.length, 9);
});

test('C3. Every R11A referral endpoint uses auth:required', async () => {
  const { http, calls } = fakeHttp();
  const gateway = api.referralGatewayModule.createReferralGateway(http);
  await gateway.myCode();
  await gateway.redeem('CODE1');
  await gateway.myHistory();
  await gateway.myLifetimeShare();
  assert.ok(calls.every(c => c.auth === 'required'), JSON.stringify(calls));
  assert.equal(calls.length, 4);
});

test('C4. Agreement Plug attribution/referral-status endpoints use auth:required', async () => {
  const { http, calls } = fakeHttp();
  const gateway = api.agreementGatewayModule.createAgreementGateway(http);
  await gateway.attributePlug('agr-1', 'rel-1');
  await gateway.plugAttribution('agr-1');
  await gateway.referralStatus('agr-1');
  assert.ok(calls.every(c => c.auth === 'required'), JSON.stringify(calls));
});

test('C5. Customer market-network request creation sends an Idempotency-Key header, not a body field', async () => {
  const { http, calls } = fakeHttp();
  const gateway = api.marketNetworkGatewayModule.createMarketNetworkGateway(http);
  await gateway.createRequest('GENERAL_SECUREPAY_HELP', 'idem-key-1');
  assert.equal(calls[0].headers['Idempotency-Key'], 'idem-key-1');
});

// ─── D. Genuinely public endpoints stay public ─────────────────────────

test('D. GET /master/{identityId}/profile and GET /master/requests/{id} use auth:none, matching the verified controller (no actorProvider call in either method)', async () => {
  const { http, calls } = fakeHttp();
  const gateway = api.masterGatewayModule.createMasterGateway(http);
  await gateway.profile('id-1');
  await gateway.request('req-1');
  assert.equal(calls[0].auth, 'none');
  assert.equal(calls[1].auth, 'none');
});

// ─── E. Unknown Master status enums fail closed ─────────────────────────

test('E1. An unrecognized Master designationStatus fails the whole profile read closed', () => {
  assert.throws(() => api.masterAdapters.masterProfileView(masterProfileResponse({ designationStatus: 'ENLIGHTENED' })), /unrecognized Master designation status/);
});
test('E2. An unrecognized Master availabilityStatus fails the whole profile read closed', () => {
  assert.throws(() => api.masterAdapters.masterProfileView(masterProfileResponse({ availabilityStatus: 'ENLIGHTENED' })), /unrecognized Master availability status/);
});
test('E3. An unrecognized Master request sourceContext fails the whole request read closed', () => {
  assert.throws(() => api.masterAdapters.masterRequestView(masterRequestResponse({ sourceContext: 'DISPUTE' })), /unrecognized Master request source context/);
});
test('E4. An unrecognized Master request status fails the whole request read closed', () => {
  assert.throws(() => api.masterAdapters.masterRequestView(masterRequestResponse({ status: 'RESOLVED' })), /unrecognized Master request status/);
});

// ─── F. Unknown referral/evaluation states fail closed ─────────────────────────

test('F1. An unrecognized KeyContract referral evaluation state fails the whole read closed', () => {
  assert.throws(() => api.agreementAdapters.agreementKeyContractReferralView(keyContractReferralResponse({ state: 'MAYBE' })), /unrecognized referral evaluation state/);
});
test('F2. An unrecognized R11A referral relationship status fails the whole read closed', () => {
  assert.throws(() => api.referralAdapters.referralRelationshipView(referralRelationshipResponse({ status: 'MAYBE' })), /unrecognized referral relationship status/);
});
test('F3. An unrecognized customer market request type/status fails closed', () => {
  assert.throws(() => api.marketNetworkAdapters.customerMarketRequestView(customerMarketRequestResponse({ requestType: 'MYSTERY' })), /unrecognized customer market request type/);
  assert.throws(() => api.marketNetworkAdapters.customerMarketRequestView(customerMarketRequestResponse({ status: 'MYSTERY' })), /unrecognized customer market request status/);
});
test('F4. An unrecognized customer/Plug relationship status fails closed', () => {
  assert.throws(() => api.marketNetworkAdapters.customerPlugRelationshipView(customerPlugRelationshipResponse({ status: 'REVOKED' })), /unrecognized customer\/Plug relationship status/);
});

// ─── G/H. Referral reward amount/currency truthfulness ─────────────────────────

test('G1. KeyContract reward renders only when both amount and currency are present from the backend', () => {
  const withBoth = api.agreementAdapters.agreementKeyContractReferralView(keyContractReferralResponse({ state: 'QUALIFIED', rewardAmountMinor: '500', currency: 'KES' }));
  assert.deepEqual(withBoth.reward, { platformFeeMinor: null, amountMinor: '500', currency: 'KES', shareRuleVersion: null });
  const amountOnly = api.agreementAdapters.agreementKeyContractReferralView(keyContractReferralResponse({ state: 'CANDIDATE', rewardAmountMinor: '500', currency: null }));
  assert.equal(amountOnly.reward, null);
});
test('G2. R11A referral relationship reward renders only when both amount and currency are present', () => {
  const withBoth = api.referralAdapters.referralRelationshipView(referralRelationshipResponse({ rewardAmountMinor: 100, rewardCurrency: 'KES' }));
  assert.deepEqual(withBoth.reward, { amountMinor: 100, currency: 'KES' });
  const currencyOnly = api.referralAdapters.referralRelationshipView(referralRelationshipResponse({ rewardAmountMinor: null, rewardCurrency: 'KES' }));
  assert.equal(currencyOnly.reward, null);
});
test('G3. rewardPaid is carried through exactly as the backend supplied it, never inferred', () => {
  const view = api.agreementAdapters.agreementKeyContractReferralView(keyContractReferralResponse({ rewardPaid: false }));
  assert.equal(view.rewardPaid, false);
});

test('H. No referral/Plug surface ever offers a Pay/Release/Withdraw/Send-Money action from the referral reward', async () => {
  // Task section 5: never provide Pay/Release/Withdraw/Send Money actions from the referral surface.
  // Doctrine copy is allowed (and expected) to *name* wallet/settlement-balance/Payment Ready while denying
  // them (see ReferralExperience.tsx/CircleExperience.tsx's own "≠ wallet balance" sentences) — what must
  // never exist is an actual affordance to move money from this surface.
  const forbiddenAction = /onClick=\{[^}]*(pay|release|withdraw|sendMoney)/i;
  for (const file of ['src/features/referral/ReferralExperience.tsx', 'src/features/plug/PlugExperience.tsx']) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbiddenAction, `${file} must never wire a Pay/Release/Withdraw/Send-Money action`);
    assert.doesNotMatch(contents, />\s*(Pay|Release|Withdraw|Send Money)\s*</i, `${file} must never label a button Pay/Release/Withdraw/Send Money`);
  }
});

// ─── I. No referral surface imports Money payment/release/settlement actions ─────────────────────────

test('I. No Referral/Plug/Master feature file imports the Money gateway', async () => {
  for (const file of FEATURE_FILES) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /from ['"].*\/money['"]/, `${file} must not import the Money gateway`);
  }
});

// ─── J/K/L/M. Plug attribution doctrine ─────────────────────────

test('J. Opening a relationship never itself attributes a Plug to an agreement — attribution is a separate explicit call', async () => {
  let attributeCalled = false;
  const controller = api.plugController.createPlugController({
    createRequest: async () => customerMarketRequestResponse(), candidates: async () => [interestedCandidateResponse()],
    selectCandidate: async () => ({ selectionRef: 's', requestId: 'mkt-req-1', candidateRef: 'cand-1', selectedAt: 'now' }),
    openRelationship: async () => customerPlugRelationshipResponse(), relationshipLifecycle: async () => ({}),
    attribution: { attributePlug: async () => { attributeCalled = true; return agreementPlugAttributionResponse(); }, plugAttribution: async () => agreementPlugAttributionResponse(), referralStatus: async () => keyContractReferralResponse() },
  });
  // openRelationship is guarded on a confirmed selection (real doctrine: you cannot open a
  // relationship with a candidate you haven't actually selected) -- this test previously omitted
  // that setup step entirely, so the guard silently no-opped it and the assertions below passed for
  // the wrong reason (relationship.status never left 'idle'). Fixed to exercise the real sequence.
  controller.selectCandidateRef('cand-1');
  await controller.confirmSelection('mkt-req-1');
  await controller.openRelationship('mkt-req-1');
  assert.equal(controller.getSnapshot().relationship.status, 'ready');
  assert.equal(attributeCalled, false);
});

test('K. attributeToAgreement submits exactly the real relationshipRef obtained from openRelationship, never a fabricated identifier', async () => {
  let receivedRef = null;
  const controller = api.plugController.createPlugController({
    createRequest: async () => customerMarketRequestResponse(), candidates: async () => [], selectCandidate: async () => ({}),
    openRelationship: async () => customerPlugRelationshipResponse({ relationshipRef: 'real-rel-ref-42' }), relationshipLifecycle: async () => ({}),
    attribution: { attributePlug: async (_agreementId, relationshipRef) => { receivedRef = relationshipRef; return agreementPlugAttributionResponse({ relationshipRef }); }, plugAttribution: async () => agreementPlugAttributionResponse(), referralStatus: async () => keyContractReferralResponse() },
  });
  // See J's own comment: openRelationship is guarded on a confirmed selection.
  controller.selectCandidateRef('cand-1');
  await controller.confirmSelection('mkt-req-1');
  await controller.openRelationship('mkt-req-1');
  const relationshipRef = controller.getSnapshot().relationship.data.relationshipRef;
  await controller.attributeToAgreement('agr-1', relationshipRef);
  assert.equal(receivedRef, 'real-rel-ref-42');
  assert.equal(controller.getSnapshot().existingAttribution.data.relationshipRef, 'real-rel-ref-42');
});

test('L. A failed attribution never updates local UI as if it succeeded', async () => {
  const controller = api.plugController.createPlugController({
    createRequest: async () => customerMarketRequestResponse(), candidates: async () => [], selectCandidate: async () => ({}),
    openRelationship: async () => customerPlugRelationshipResponse(), relationshipLifecycle: async () => ({}),
    attribution: { attributePlug: async () => { throw throwingApiError(404); }, plugAttribution: async () => { throw throwingApiError(404); }, referralStatus: async () => keyContractReferralResponse() },
  });
  await controller.loadExistingAttribution('agr-1');
  assert.equal(controller.getSnapshot().existingAttribution.status, 'empty');
  await controller.attributeToAgreement('agr-1', 'rel-1');
  assert.equal(controller.getSnapshot().existingAttribution.status, 'empty', 'a failed attribution must not flip existingAttribution to ready');
  assert.ok(controller.getSnapshot().attributionError);
});

test('M. A backend attribution CONFLICT (409) remains fail-closed and leaves existing attribution state untouched', async () => {
  const controller = api.plugController.createPlugController({
    createRequest: async () => customerMarketRequestResponse(), candidates: async () => [], selectCandidate: async () => ({}),
    openRelationship: async () => customerPlugRelationshipResponse(), relationshipLifecycle: async () => ({}),
    attribution: { attributePlug: async () => { throw throwingApiError(409, 'already attributed'); }, plugAttribution: async () => agreementPlugAttributionResponse({ plugKsNumber: 'KS-OTHER' }), referralStatus: async () => keyContractReferralResponse() },
  });
  await controller.loadExistingAttribution('agr-1');
  await controller.attributeToAgreement('agr-1', 'rel-attempted');
  assert.equal(controller.getSnapshot().existingAttribution.data.plugKsNumber, 'KS-OTHER', 'the real, pre-existing attribution must remain exactly as read');
  assert.match(controller.getSnapshot().attributionError, /already been attributed/);
});

// ─── N/O. Plug is never Agreement party, provider, guarantor or certified expert ─────────────────────────

test('N. No Plug/market-network feature file calls Agreement join/confirm authority', async () => {
  for (const file of ['src/features/plug/controller.ts', 'src/features/plug/PlugExperience.tsx']) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /\.join\(|\.confirmVersion\(/, `${file} must never call Agreement join/confirm authority`);
  }
});

test('O. No Plug/Master surface renders "guarantor", "certified provider", or "SecurePay verified" as a claim', async () => {
  const forbidden = /guarantor|certified provider|securepay verified/i;
  for (const file of ['src/features/plug/PlugExperience.tsx', 'src/features/master/MasterExperience.tsx', 'src/components/PlugProfileCard.tsx', 'src/components/MasterProfileCard.tsx']) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbidden, `${file} must never claim guarantor/certified-provider/verified status`);
  }
});

// ─── Q/R/S. Master designation/profile truthfulness ─────────────────────────

test('Q. masterProfileView exposes exactly the real backend fields', () => {
  const view = api.masterAdapters.masterProfileView(masterProfileResponse());
  assert.deepEqual(Object.keys(view).sort(), [
    'accreditationRefs', 'availabilityStatus', 'businessIdentityId', 'designatedAt', 'designationStatus',
    'expertiseDomains', 'identityId', 'inspectionCapable', 'pricingBasis', 'qualificationRefs', 'serviceArea',
  ].sort());
});

test('R. MasterExperience never renders "licensed", "SecurePay verified expert", or "certified" as a claim about a Master', async () => {
  const contents = await readFile('src/features/master/MasterExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /\blicensed\b|securepay verified expert|\bcertified\b/i);
});

test('S. Qualification/accreditation references pass through verbatim, never rewritten', () => {
  const view = api.masterAdapters.masterProfileView(masterProfileResponse({ qualificationRefs: ['EBK registration ref ABC'], accreditationRefs: ['Board X ref 123'] }));
  assert.deepEqual(view.qualificationRefs, ['EBK registration ref ABC']);
  assert.deepEqual(view.accreditationRefs, ['Board X ref 123']);
});

// ─── T/U/V. Master request creation is explicit and exact ─────────────────────────

test('T. Looking up a Master profile never itself creates a Master request', async () => {
  let createCalled = false;
  const controller = api.masterController.createMasterController({ profile: async () => masterProfileResponse(), createRequest: async () => { createCalled = true; return masterRequestResponse(); }, request: async () => masterRequestResponse(), proposeCost: async () => masterRequestResponse(), accept: async () => masterRequestResponse(), decline: async () => masterRequestResponse(), submitOpinion: async () => masterOpinionResponse() });
  await controller.lookupProfile('id-master-1');
  assert.equal(controller.getSnapshot().profile.status, 'ready');
  assert.equal(createCalled, false);
});

test('U. submitRequest sends exactly the reviewed question/scope/evidence/source-context/site-visit fields', async () => {
  let received = null;
  const controller = api.masterController.createMasterController({ profile: async () => masterProfileResponse(), createRequest: async (body) => { received = body; return masterRequestResponse(); }, request: async () => masterRequestResponse(), proposeCost: async () => masterRequestResponse(), accept: async () => masterRequestResponse(), decline: async () => masterRequestResponse(), submitOpinion: async () => masterOpinionResponse() });
  controller.setDraft({ masterIdentityId: 'id-master-1', sourceContext: 'PRE_TRADE_INSPECTION', question: 'Is the roof sound?', scope: 'Roof only', evidenceRefs: 'photo1\nphoto2', siteVisitRequired: true, agreementId: 'agr-9' });
  await controller.submitRequest();
  assert.equal(received.masterIdentityId, 'id-master-1');
  assert.equal(received.sourceContext, 'PRE_TRADE_INSPECTION');
  assert.equal(received.question, 'Is the roof sound?');
  assert.equal(received.scope, 'Roof only');
  assert.deepEqual(received.evidenceRefs, ['photo1', 'photo2']);
  assert.equal(received.siteVisitRequired, true);
  assert.equal(received.agreementId, 'agr-9');
});

test('V. CreateMasterRequestRequest (the client-supplied body) has no requesting-identity field — the backend derives it from the session, never a client value', async () => {
  const contents = await readFile('src/api/securepay/master/dto.ts', 'utf8');
  const interfaceBlock = contents.slice(contents.indexOf('export interface CreateMasterRequestRequest'), contents.indexOf('export interface ProposeMasterRequestCostRequest'));
  assert.doesNotMatch(interfaceBlock, /requestingIdentityId/);
  const controllerSrc = await readFile('src/features/master/controller.ts', 'utf8');
  assert.doesNotMatch(controllerSrc, /atob\(|jwt|decodeToken|jwtDecode/i);
});

// ─── W/X/Y. Master cost/decline doctrine ─────────────────────────

test('W. Master request view renders currency/quotedCostMinor exactly as returned, never defaulting a currency', () => {
  const noCost = api.masterAdapters.masterRequestView(masterRequestResponse({ currency: null, quotedCostMinor: null }));
  assert.equal(noCost.currency, null);
  assert.equal(noCost.quotedCostMinor, null);
  const withCost = api.masterAdapters.masterRequestView(masterRequestResponse({ currency: 'USD', quotedCostMinor: '150000' }));
  assert.equal(withCost.currency, 'USD');
  assert.equal(withCost.quotedCostMinor, '150000');
});

test('X. Accepting a Master cost never calls a Money/payment/release API — the gateway type has no such method', async () => {
  const contents = await readFile('src/features/master/controller.ts', 'utf8');
  assert.doesNotMatch(contents, /moneyGateway|MoneyGateway|paymentIntent|releaseFunds/i);
});

test('Y. Master decline sends exactly one POST to the decline endpoint with no client-side role/state pre-check', async () => {
  const { http, calls } = fakeHttp();
  const gateway = api.masterGatewayModule.createMasterGateway(http);
  await gateway.decline('req-1');
  assert.equal(calls.length, 1);
  assert.match(calls[0].path, /\/requests\/req-1\/decline$/);
  assert.equal(calls[0].method, 'POST');
});

// ─── Z/AA. Master opinion doctrine ─────────────────────────

test('Z. submitOpinion sends exactly the reviewed evidence/site-visit/observations/opinion/limitations fields', async () => {
  let received = null;
  const controller = api.masterController.createMasterController({ profile: async () => masterProfileResponse(), createRequest: async () => masterRequestResponse(), request: async () => masterRequestResponse({ status: 'ACCEPTED' }), proposeCost: async () => masterRequestResponse(), accept: async () => masterRequestResponse(), decline: async () => masterRequestResponse(), submitOpinion: async (_id, body) => { received = body; return masterOpinionResponse(); } });
  controller.setOpinionDraft({ reviewedEvidenceRefs: 'ev1\nev2', siteVisitDetails: 'Visited 2026-01-05', observations: 'All good', opinionText: 'Sound.', limitations: 'Visual only' });
  await controller.submitOpinion('req-1');
  assert.deepEqual(received.reviewedEvidenceRefs, ['ev1', 'ev2']);
  assert.equal(received.siteVisitDetails, 'Visited 2026-01-05');
  assert.equal(received.observations, 'All good');
  assert.equal(received.opinionText, 'Sound.');
  assert.equal(received.limitations, 'Visual only');
});

test('AA. Master opinion submission creates no Agreement confirmation/completion/release side effect — the gateway type has no such method', async () => {
  const contents = await readFile('src/features/master/controller.ts', 'utf8');
  assert.doesNotMatch(contents, /confirmVersion|completeMilestone|releaseFunds/i);
});

// ─── AB. MASTER_OPINION provenance stays inside the existing Agent adoption engine ─────────────────────────

test('AB. No new fact-submission or "master-opinion adopt" endpoint was invented — MASTER_OPINION remains an existing SourceKind value only', async () => {
  for (const file of FEATURE_FILES) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /master-opinion\/adopt|submitMasterOpinionFact|masterOpinionAdopt/i, `${file} must not invent a MASTER_OPINION-specific submission path`);
  }
  const agentDto = await readFile('src/api/securepay/agent/dto.ts', 'utf8');
  assert.match(agentDto, /MASTER_OPINION/, 'the existing SourceKind union already carries MASTER_OPINION — reused, not reinvented');
});

// ─── AC/AD/AE. Appointment/dispute boundaries ─────────────────────────

test('AC. No fake appointment/scheduling state is created from siteVisitRequired', async () => {
  const forbidden = /appointmentStatus|appointment (confirmed|scheduled)|scheduled visit/i;
  for (const file of ['src/features/master/controller.ts', 'src/features/master/MasterExperience.tsx']) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbidden, `${file} must not simulate an appointment lifecycle`);
  }
});

test('AD. The general Master gateway never references a dispute-scoped endpoint', async () => {
  const contents = await readFile('src/api/securepay/master/index.ts', 'utf8');
  assert.doesNotMatch(contents, /dispute/i);
});

test('AE. No new Referrals/Plugs/Masters source file imports or calls into DisputeMasterEscalation', async () => {
  // Doctrine comments are expected to *name* DisputeMasterEscalation while explaining the separation (see
  // master/controller.ts's own header comment) — what must never exist is an actual import/call into it.
  for (const file of FEATURE_FILES) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /from ['"].*DisputeMaster/i, `${file} must not import a DisputeMaster* module`);
    assert.doesNotMatch(contents, /DisputeMasterEscalation\s*\(/, `${file} must not call into DisputeMasterEscalation`);
  }
});

// ─── AF. Authenticated ecosystem state clears on sign-out / different sign-in ─────────────────────────

test('AF1. Master controller resetSession clears request/opinion/draft but keeps the (public) profile', async () => {
  const controller = api.masterController.createMasterController({ profile: async () => masterProfileResponse(), createRequest: async () => masterRequestResponse(), request: async () => masterRequestResponse(), proposeCost: async () => masterRequestResponse(), accept: async () => masterRequestResponse(), decline: async () => masterRequestResponse(), submitOpinion: async () => masterOpinionResponse() });
  await controller.lookupProfile('id-master-1');
  controller.setDraft({ question: 'secret question' });
  await controller.submitRequest().catch(() => {});
  controller.resetSession();
  assert.equal(controller.getSnapshot().profile.status, 'ready', 'the public profile read is not identity-sensitive and may stay');
  assert.equal(controller.getSnapshot().draft.question, '');
  assert.equal(controller.getSnapshot().request.status, 'idle');
});

test('AF2. Plug controller reset clears candidates/relationship/attribution state', async () => {
  const controller = api.plugController.createPlugController({ createRequest: async () => customerMarketRequestResponse(), candidates: async () => [interestedCandidateResponse()], selectCandidate: async () => ({}), openRelationship: async () => customerPlugRelationshipResponse(), relationshipLifecycle: async () => ({}), attribution: { attributePlug: async () => agreementPlugAttributionResponse(), plugAttribution: async () => agreementPlugAttributionResponse(), referralStatus: async () => keyContractReferralResponse() } });
  // See J's own comment: openRelationship is guarded on a confirmed selection.
  controller.selectCandidateRef('cand-1');
  await controller.confirmSelection('mkt-req-1');
  await controller.openRelationship('mkt-req-1');
  assert.equal(controller.getSnapshot().relationship.status, 'ready');
  controller.reset();
  assert.equal(controller.getSnapshot().relationship.status, 'idle');
  assert.equal(controller.getSnapshot().existingAttribution.status, 'idle');
});

test('AF3. PlugExperience resets the controller when the session leaves signed-in', async () => {
  const contents = await readFile('src/features/plug/PlugExperience.tsx', 'utf8');
  assert.match(contents, /sessionState\.status !== 'signed-in'\) \{ controller\.reset\(\); return; \}/);
});

test('AF4. MasterExperience resets session-scoped state when the session leaves signed-in', async () => {
  const contents = await readFile('src/features/master/MasterExperience.tsx', 'utf8');
  assert.match(contents, /sessionState\.status !== 'signed-in'\) \{[\s\S]*?controller\.resetSession\(\)/);
});

test('AF5. ReferralExperience reloads on sign-in and resets on sign-out, mirroring the Circle pattern', async () => {
  const contents = await readFile('src/features/referral/ReferralExperience.tsx', 'utf8');
  assert.match(contents, /sessionState\.status === 'signed-in'\) void controller\.load\(\);\s*\n\s*else controller\.reset\(\);/);
});

// ─── AG. Stale response race safety ─────────────────────────

test('AG. Master profile lookup: a stale slower response never overwrites a newer ready result', async () => {
  function deferred() { let resolve; const promise = new Promise(res => { resolve = res; }); return { promise, resolve }; }
  const defFirst = deferred();
  let callIndex = 0;
  const controller = api.masterController.createMasterController({
    profile: async (identityId) => {
      callIndex += 1;
      if (callIndex === 1) { await defFirst.promise; return masterProfileResponse({ identityId: 'stale-id' }); }
      return masterProfileResponse({ identityId });
    },
    createRequest: async () => masterRequestResponse(), request: async () => masterRequestResponse(), proposeCost: async () => masterRequestResponse(), accept: async () => masterRequestResponse(), decline: async () => masterRequestResponse(), submitOpinion: async () => masterOpinionResponse(),
  });
  const first = controller.lookupProfile('id-stale');
  const second = controller.lookupProfile('id-fresh');
  await second;
  assert.equal(controller.getSnapshot().profile.data.identityId, 'id-fresh');
  defFirst.resolve();
  await first;
  assert.equal(controller.getSnapshot().profile.data.identityId, 'id-fresh', 'the stale first response must not overwrite the newer ready result');
});

// ─── AH. Fixture Bolt components remain preserved ─────────────────────────

test('AH1. TradeHelpPanel renders byte-identical fixture markup when onReferrals is omitted', async () => {
  const script = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TradeHelpPanel } from './src/components/TradeHelpPanel';
const noop = () => {};
export const markup = renderToStaticMarkup(React.createElement(TradeHelpPanel, { onBack: noop, onPlugs: noop, onMasters: noop, onSolutions: noop, onPartners: noop, onAskAgent: noop }));
`;
  const result = await build({ stdin: { contents: script, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  assert.doesNotMatch(mod.exports.markup, /disabled=""/);
  assert.match(mod.exports.markup, /Referral history/);
});

test('AH2. Bolt Master/Plug/Referral fixture components are never imported by any new real feature file', async () => {
  for (const file of FEATURE_FILES) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /from ['"].*\/(MasterProfileCard|MasterRequestView|MasterOpinionView|PlugProfileCard|ReferralHistoryView)['"]/, `${file} must not import Bolt's fixture-only ecosystem components`);
  }
});

test('AH3. Bolt fixture components stay untouched: they still import only from ../types, never from a real gateway/controller', async () => {
  for (const file of ['src/components/MasterProfileCard.tsx', 'src/components/MasterRequestView.tsx', 'src/components/MasterOpinionView.tsx', 'src/components/PlugProfileCard.tsx', 'src/components/ReferralHistoryView.tsx']) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /from ['"]\.\.\/api\/securepay/, `${file} must remain a pure fixture-facing component`);
    assert.doesNotMatch(contents, /from ['"]\.\.\/features\//, `${file} must remain a pure fixture-facing component`);
  }
});

// ─── AI. No client-side ranking/recommendation score ─────────────────────────

test('AI. No Referrals/Plugs/Masters source file computes a rank/rating/reputation/medal/follower/like/success-rate/"best"/"top" field', async () => {
  const forbidden = /\brank(ing)?\b|\brating\b|\breputation\b|\bmedal\b|\bfollower\b|\blike[sd]?\b|success.?rate|\bbest master\b|\btop plug\b/i;
  for (const file of FEATURE_FILES) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbidden, `${file} must not compute a ranking/recommendation score`);
  }
});

// ─── AJ. All existing Golden Spine A-G suites remain green ─────────────────────────

test('AJ. All prior Golden Spine test suites remain green', async () => {
  const files = ['foundation', 'agent', 'handoff', 'recipient', 'signed-in', 'money', 'store', 'community-circles'].map(name => `tests/${name}.test.mjs`);
  const result = spawnSync(process.execPath, ['--test', ...files], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
