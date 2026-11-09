#!/usr/bin/env node
// SecurePay Mini research scorecard; never sends data or invokes live services.
// This reporter reads source-controlled fictional test cases and de-identified outcome records.
import { readFileSync } from 'node:fs';

const root = new URL('../tests/fixtures/securepay-mini/', import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, root), 'utf8'));
const cohort = load('kenyan-trader-cohort.v1.json');
const log = load('cohort-runlog.v1.json');
const stageLabels = { first_use: 'First use', repeat_use: 'Repeat use', business_evolution: 'Evolving needs' };
const latestFor = (actorId, checkpoint) => log.runEntries
  .filter(r => r.actorId === actorId && r.checkpoint === checkpoint)
  .sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.runId.localeCompare(b.runId))
  .at(-1);

const rows = cohort.actors.map(actor => {
  const cols = cohort.actorProgressionCheckpoints.map(checkpoint => {
    const entry = latestFor(actor.id, checkpoint);
    return entry ? entry.outcome + ' (' + entry.releaseRef + ')' : 'NOT_TESTED';
  });
  return { id: actor.id, trader: actor.label, scenarios: actor.scenarioIds.length, firstUse: cols[0], repeat: cols[1], evolving: cols[2] };
});

console.log('SecurePay Mini — continuing trader cohort');
console.log('Source cohort: ' + cohort.cohortId);
console.log('Fictional traders/buyers: ' + cohort.actors.length + ' | Scenarios: ' + cohort.scenarios.length + ' | Safety cases: ' + cohort.safetyChecks.length);
console.log('Actual recorded observations: ' + log.runEntries.length + '\n');
console.table(rows);
if (log.runEntries.length === 0) {
  console.log('No observed test results. The populated cohort is a test specification, not evidence that Mini works.');
} else {
  const summaries = ['PASS','FAIL','BLOCKED','NOT_TESTED','DESIGN_GAP'].map(result => ({
    result,
    observations: log.runEntries.filter(r => r.outcome === result).length
  }));
  console.table(summaries);
}
console.log('Interpret observations against their exact build, environment and evidence reference. A simulated/staging PASS never certifies live money.');
