import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REQUIRED_CHECKS, evaluateStoreGate5 } from '../scripts/day5-stores-gate5-certify.mjs';

const TEMPLATE = JSON.parse(readFileSync(
  new URL('../testing/day5-stores-gate5-evidence.json', import.meta.url), 'utf8'));
const UI = '1234567890abcdef1234567890abcdef12345678';
const API = 'abcdef1234567890abcdef1234567890abcdef12';
const NOW = new Date('2026-11-03T13:30:00.000Z');

function syntheticPassingFixture() {
  // A unit-test fixture validating evaluator logic, NEVER an assertion that
  // the real Gate 5 staging/device journeys happened.
  return {
    schemaVersion: 1,
    candidate: { uiSha: UI, apiSha: API, stagingUrl: 'https://staging.securepay.ke/' },
    safety: {
      isolatedDatabase: true, productionUnchanged: true,
      financialExecutionDisabled: true, rollbackAvailable: true,
      productionCredentialsNotReused: true,
    },
    checks: Object.fromEntries(REQUIRED_CHECKS.map((key, i) => [key, {
      status: 'PASS',
      evidenceRef: 'https://evidence.invalid/unit-test-only/' + i,
      observedAt: '2026-11-03T13:00:00Z', uiSha: UI, apiSha: API,
    }])),
  };
}

test('actual tracked manifest is deliberately NO_GO, with no invented successful evidence', () => {
  const result = evaluateStoreGate5(TEMPLATE, { uiSha: UI, apiSha: API }, NOW);
  assert.equal(result.decision, 'NO_GO');
  assert.equal(result.releaseApproved, false);
  assert.equal(result.checksPassed, 0);
  assert.equal(result.checksRequired, REQUIRED_CHECKS.length);
  assert.ok(REQUIRED_CHECKS.includes('gate4.locked_phone_delivery'));
  assert.ok(REQUIRED_CHECKS.includes('gate4.business_representative_delivery'));
});

test('synthetic all-PASS evaluator fixture still requires explicit OWNER review, never releases', () => {
  const result = evaluateStoreGate5(syntheticPassingFixture(), { uiSha: UI, apiSha: API }, NOW);
  assert.equal(result.decision, 'OWNER_REVIEW_REQUIRED');
  assert.equal(result.releaseApproved, false);
  assert.equal(result.blockers.length, 0);
  assert.equal(result.checksPassed, 29);
});

test('wrong commit SHA, production URL, financial rails or non-isolated data fail closed', () => {
  const fake = syntheticPassingFixture();
  fake.candidate.stagingUrl = 'https://securepay.ke/';
  fake.safety.financialExecutionDisabled = false;
  fake.safety.isolatedDatabase = false;
  const result = evaluateStoreGate5(fake, { uiSha: UI, apiSha: 'f'.repeat(40) }, NOW);
  assert.equal(result.decision, 'NO_GO');
  assert.ok(result.blockers.some(x => x.includes('stagingUrl')));
  assert.ok(result.blockers.some(x => x.includes('financialExecutionDisabled')));
  assert.ok(result.blockers.some(x => x.includes('isolatedDatabase')));
  assert.ok(result.blockers.some(x => x.includes('apiSha')));
});

test('missing locked-phone proof or Business representative proof must block full Gate 4', () => {
  const fake = syntheticPassingFixture();
  fake.checks['gate4.locked_phone_delivery'].status = 'NOT_RUN';
  fake.checks['gate4.business_representative_delivery'].status = 'NOT_RUN';
  const result = evaluateStoreGate5(fake, { uiSha: UI, apiSha: API }, NOW);
  assert.equal(result.decision, 'NO_GO');
  assert.ok(result.blockers.some(x => x.includes('locked_phone_delivery')));
  assert.ok(result.blockers.some(x => x.includes('business_representative_delivery')));
});

test('reused or stale cross-commit evidence does not pass', () => {
  const fake = syntheticPassingFixture();
  fake.checks['gate3.source_and_offer_provenance'].apiSha = 'f'.repeat(40);
  fake.checks['gate5.ios_android_browser'].observedAt = '2026-10-01T09:00:00Z';
  const result = evaluateStoreGate5(fake, { uiSha: UI, apiSha: API }, NOW);
  assert.equal(result.decision, 'NO_GO');
  assert.ok(result.blockers.some(x => x.includes('source_and_offer_provenance')));
  assert.ok(result.blockers.some(x => x.includes('ios_android_browser')));
});

test('Day 4 continuity and Gate 3 Store source remain simultaneously wired in masterpiece', () => {
  const src = readFileSync(new URL(
    '../src/features/living-workspace/Phase1LivingWorkspacePreview.tsx', import.meta.url), 'utf8');
  assert.ok(src.includes('beginNewWork(workServices())'));
  assert.ok(src.includes('returnToSavedWork(workServices(),conversationId)'));
  assert.ok(src.includes('data-day4-new-work'));
  assert.ok(src.includes('data-day4-saved-work'));
  assert.ok(src.includes('navigationLocked={workActionBusy}'));
  assert.ok(src.includes('enquiryContext={liveState?.enquiryContext??null}'));
});

test('switching to a saved Store enquiry first preserves current KS001 conversation', () => {
  const agent = readFileSync(new URL(
    '../src/features/agent/AgentExperience.tsx', import.meta.url), 'utf8');
  const handlerStart = agent.indexOf('onResumeSavedWork={conversationId =>');
  const handlerEnd = agent.indexOf('onUseOffer={fact =>', handlerStart);
  assert.ok(handlerStart > 0 && handlerEnd > handlerStart);
  const handler = agent.slice(handlerStart, handlerEnd);
  assert.ok(handler.includes('readDraft(state.conversationId ?? undefined)'));
  assert.ok(handler.includes('const saved = await gateway.saveBuild(previousId)'));
  assert.ok(handler.includes('saved.conversationId !== previousId'));
  assert.ok(handler.indexOf('await gateway.saveBuild(previousId)')
    < handler.indexOf('storeLivingWorkspaceEntry(conversationId)'));
  assert.ok(handler.includes('Your current work remains here'));
});

test('reply precondition checked at backend atomically and carried by UI', () => {
  const apiNote = readFileSync(new URL(
    '../docs/operations/DAY5_GATE5_CERTIFICATION.md', import.meta.url), 'utf8');
  const ui = readFileSync(new URL(
    '../src/features/store/StoreEnquiryInbox.tsx', import.meta.url), 'utf8');
  assert.ok(ui.includes('expectedDraftVersion: latest.version'));
  assert.ok(apiNote.includes('FOR UPDATE'));
  assert.ok(apiNote.includes('expectedDraftVersion'));
});
