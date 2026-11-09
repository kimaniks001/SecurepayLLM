import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';

const fromRoot = (path) => new URL('../' + path, import.meta.url);
const raw = (path) => readFileSync(fromRoot(path), 'utf8');
const fixture = JSON.parse(raw('tests/fixtures/securepay-mini/checkout-acceptance.v1.json'));
const cohort = JSON.parse(raw('tests/fixtures/securepay-mini/kenyan-trader-cohort.v1.json'));
const expected = Array.from({ length: 16 }, (_, i) => 'C' + String(i + 1).padStart(2, '0'));
const unique = values => new Set(values).size === values.length;

test('checkout Phase 0 extends the same permanent fictional trader cohort without invented outcomes', () => {
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(fixture.nature, 'synthetic-test-specification');
  assert.equal(fixture.cohortId, cohort.cohortId);
  assert.equal(fixture.productionUse, 'NEVER_SEED_AS_ACCOUNTS_OR_ENABLE_MONEY');
  assert.equal(fixture.status, 'NO_CHECKOUT_TESTS_EXECUTED');
  assert.equal(fixture.evidenceLog.state, 'EMPTY_NO_CHECKOUT_OBSERVATIONS');
  assert.deepEqual(fixture.evidenceLog.entries, []);
  assert.equal(cohort.actors.length, 20);
  assert.ok(cohort.actors.every(a => a.fictional && Array.isArray(a.scenarioIds)));
});

test('stable C01–C16 test classes cover independent actors, future checkpoints and integrity', () => {
  const known = new Set(cohort.actors.map(a => a.id));
  assert.deepEqual(fixture.scenarioFamilies.map(s => s.id), expected);
  assert.ok(unique(fixture.scenarioFamilies.map(s => s.id)));
  for (const s of fixture.scenarioFamilies) {
    assert.equal(s.status, 'NOT_TESTED', s.id);
    assert.ok(s.title.length > 12);
    assert.ok(s.criticalInvariant.length > 36);
    assert.ok(s.implementationGate);
    assert.ok(s.actorIds.length >= 1);
    assert.ok(s.actorIds.every(a => known.has(a)), s.id);
    assert.deepEqual(s.checkpoints, cohort.actorProgressionCheckpoints);
  }
});

test('Store and ShortStays first vertical slices are exactly defined with cross-cutting failure cases', () => {
  assert.deepEqual(fixture.verticalSlices.map(v => v.id), ['V-STORE', 'V-STAY']);
  const valid = new Set(fixture.scenarioFamilies.map(s => s.id));
  const relevant = new Set(['C07', 'C08', 'C09', 'C13']);
  for (const slice of fixture.verticalSlices) {
    assert.equal(slice.status, 'NOT_TESTED');
    assert.ok(slice.requirements.length >= 5);
    assert.ok(slice.scenarioIds.every(x => valid.has(x)));
    assert.ok([...relevant].every(x => slice.scenarioIds.includes(x)), slice.id);
    assert.ok(slice.actorIds.every(a => cohort.actors.some(c => c.id === a)));
  }
  assert.equal(fixture.verticalSlices[0].trigger, 'STORE_PAY');
  assert.equal(fixture.verticalSlices[1].trigger, 'SHORTSTAYS_BOOK_PAY');
});

test('funding, provider, release, return and simulation remain visibly separate concepts', () => {
  const separation = new Set(fixture.mandatorySeparations);
  for (const key of [
    'draft_vs_accepted_agreement',
    'host_order_vs_payment_intent',
    'provider_confirmation_vs_protected_money',
    'funding_vs_fulfilment',
    'release_authority_vs_settled',
    'simulated_vs_live_rails',
    'host_return_vs_signed_server_evidence',
  ]) assert.ok(separation.has(key));
  assert.equal(fixture.blockers.length, 5);
  assert.ok(fixture.blockers.every(b => b.status === 'OPEN'));
  assert.ok(fixture.blockers.some(b => b.title.includes('Money Session FUND')));
  const rendered = JSON.stringify(fixture);
  assert.doesNotMatch(rendered, /"status":\s*"PASS"/);
  assert.doesNotMatch(rendered, /"status":\s*"FUNDED"/);
  assert.doesNotMatch(rendered, /(?:07|01)\d{8}/);
});

test('roadmap treats hosted Money Sessions as an existing candidate, not a new payment authority', () => {
  const audit = raw('docs/SECUREPAY_MINI_PHASE0_CHECKOUT_FOUNDATION_AUDIT_20261109.md');
  const roadmap = raw('docs/SECUREPAY_MINI_CHECKOUT_FIRST_MASTER_PLAN_20261109.md');
  const contract = raw('docs/SECUREPAY_MINI_CHECKOUT_CONTRACT_V1_20261109.md');
  assert.match(audit, /DeveloperMoneySessionController/);
  assert.match(audit, /HostedMoneySessionService/);
  assert.match(audit, /PaymentIntent/);
  assert.match(audit, /No inspected source establishes that redeeming/i);
  assert.match(roadmap, /one checkout/i);
  assert.match(contract, /server/i);
  assert.match(contract, /fundingOptions/);
  assert.ok(existsSync(fromRoot('src/api/securepay/payment-intent/index.ts')));
  assert.ok(existsSync(fromRoot('src/api/securepay/money-snapshot/index.ts')));
});

test('Phase 0 does not fabricate money/identity runtime, new checkout endpoints or app-only source truth', () => {
  assert.match(raw('docs/SECUREPAY_MINI_PHASE0_CHECKOUT_FOUNDATION_AUDIT_20261109.md'), /NO-GO/);
  const payment = raw('src/api/securepay/payment-intent/index.ts');
  assert.match(payment, /fundingOptions/);
  assert.match(payment, /createVersionBoundQuote/);
  assert.match(payment, /createIntent/);
  assert.match(payment, /initiate/);
  const source = raw('src/api/securepay/store/index.ts');
  assert.match(source, /createStoreGateway/);
  assert.ok(fixture.verticalSlices.every(s => s.status === 'NOT_TESTED'));
});
