import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/features/execution/ProgressPanel.tsx', 'utf8');

test('Agreement fulfilment starts only from responsible current non-money work', () => {
  assert.match(source, /mine && !monetary/);
  assert.match(source, /!\['COMPLETED', 'CANCELLED'\]\.includes\(o\.status\)/);
  assert.match(source, /Find what this work needs/);
  assert.match(source, /fromAgreementObligation/);
});

test('pooling remains proposal context and does not mutate the Agreement', () => {
  assert.match(source, /does not amend the Agreement or join a Community Saver/);
  assert.match(source, /governed coordination and consent/);
  assert.match(source, /Landed cost not established/);
  assert.match(source, /Open Store offer/);
  assert.doesNotMatch(source, /Amend Agreement automatically|Join pool now|Select supplier automatically/);
});
