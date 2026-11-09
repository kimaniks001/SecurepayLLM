import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (name) => JSON.parse(readFileSync(new URL('./fixtures/securepay-mini/' + name, import.meta.url), 'utf8'));
const cohort = read('kenyan-trader-cohort.v1.json');
const ledger = read('cohort-runlog.v1.json');
const expectedFocus = Array.from({length: 10}, (_, i) => 'F' + String(i + 1).padStart(2, '0'));
const expectedBreadth = Array.from({length: 10}, (_, i) => 'B' + String(i + 11));
const expectedSafety = Array.from({length: 10}, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const unique = (values) => new Set(values).size === values.length;

test('stable fictional Mini cohort has 20 distinct continuing traders and three future checkpoints', () => {
  assert.equal(cohort.schemaVersion, 1);
  assert.equal(cohort.cohortId, ledger.cohortId);
  assert.equal(cohort.nature, 'fictional synthetic test population');
  assert.equal(cohort.productionUse, 'NEVER_SEED_OR_PERSONALISE_PRODUCT_RUNTIME');
  assert.equal(cohort.actors.length, 20);
  assert.ok(unique(cohort.actors.map(a => a.id)));
  const checkpoints = ['first_use', 'repeat_use', 'business_evolution'];
  for (const actor of cohort.actors) {
    assert.match(actor.id, /^TR-\d{3}$/);
    assert.equal(actor.fictional, true);
    assert.ok(actor.label && actor.tradeType && actor.context);
    assert.deepEqual(actor.progression.map(p => p.checkpoint), checkpoints);
    assert.ok(actor.progression.every(p => typeof p.anticipatedNeed === 'string' && p.anticipatedNeed.length >= 8));
    assert.ok(actor.scenarioIds.length > 0);
  }
});

test('the fixed source cohort covers 10 daily jobs and 10 broader jobs without item-specific code paths', () => {
  assert.equal(cohort.scenarios.length, 20);
  assert.deepEqual(cohort.scenarios.filter(s => s.tier === 'focus').map(s => s.id), expectedFocus);
  assert.deepEqual(cohort.scenarios.filter(s => s.tier === 'breadth').map(s => s.id), expectedBreadth);
  assert.ok(unique(cohort.scenarios.map(s => s.id)));
  const actors = new Map(cohort.actors.map(a => [a.id, a]));
  const tradeShapes = new Set();
  for (const scenario of cohort.scenarios) {
    assert.equal(scenario.status, 'NOT_TESTED');
    assert.ok(scenario.job.length > 20);
    assert.ok(scenario.surprise.length >= 10);
    assert.ok(scenario.capabilities.length >= 1);
    assert.ok(scenario.invariants.length >= 1);
    assert.ok(scenario.failureClass.length >= 4);
    assert.ok(scenario.actorIds.length >= 1);
    tradeShapes.add(scenario.tradeShape);
    for (const id of scenario.actorIds) {
      assert.ok(actors.has(id), scenario.id + ': unknown actor ' + id);
      assert.ok(actors.get(id).scenarioIds.includes(scenario.id), scenario.id + ': missing reverse actor reference');
    }
  }
  for (const actor of cohort.actors) for (const id of actor.scenarioIds) {
    const scenario = cohort.scenarios.find(s => s.id === id);
    assert.ok(scenario?.actorIds.includes(actor.id), actor.id + ' has broken link to ' + id);
  }
  assert.ok(tradeShapes.size >= 12, 'should cover more than a rehearsed few transaction shapes');
});

test('independent security cases remain test requirements; none is asserted as passed', () => {
  assert.deepEqual(cohort.safetyChecks.map(s => s.id), expectedSafety);
  assert.ok(cohort.safetyChecks.every(s => s.status === 'NOT_TESTED'));
  assert.ok(cohort.safetyChecks.every(s => s.invariant.length >= 12));
});

test('persistent run ledger begins empty; later results must be append-only and tied to known personas', () => {
  assert.equal(ledger.schemaVersion, 1);
  assert.equal(ledger.cohortId, cohort.cohortId);
  assert.ok(Array.isArray(ledger.runEntries));
  const knownActor = new Set(cohort.actors.map(a => a.id));
  const knownScenario = new Map(cohort.scenarios.map(s => [s.id, s]));
  const knownCheckpoints = new Set(cohort.actorProgressionCheckpoints);
  const allowedOutcome = new Set(ledger.allowedOutcomes);
  const runIds = [];
  for (const run of ledger.runEntries) {
    runIds.push(run.runId);
    assert.ok(knownActor.has(run.actorId));
    assert.ok(knownScenario.has(run.scenarioId));
    assert.ok(knownScenario.get(run.scenarioId).actorIds.includes(run.actorId));
    assert.ok(knownCheckpoints.has(run.checkpoint));
    assert.ok(allowedOutcome.has(run.outcome));
    assert.match(run.observedAt, /^\d{4}-\d{2}-\d{2}/);
    assert.ok(run.releaseRef && run.environment && run.evidenceRef);
    assert.ok(['STAGING', 'CONTROLLED_PILOT', 'PRODUCTION_AGGREGATE'].includes(run.environment));
    assert.ok(!('name' in run || 'phone' in run || 'ksNumber' in run || 'paymentReference' in run));
  }
  assert.ok(unique(runIds));
  if (ledger.runEntries.length === 0) assert.equal(ledger.status, 'EMPTY_NO_TESTS_EXECUTED');
});

test('test fixtures contain no literal KS Numbers, phones, email addresses or successful fake payment authority', () => {
  const json = JSON.stringify(cohort) + JSON.stringify(ledger);
  assert.doesNotMatch(json, /\bKS\d{3,}\b/);
  assert.doesNotMatch(json, /\b(?:07|01)\d{8}\b/);
  assert.doesNotMatch(json, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(json, /"status":"PASS"/);
});
