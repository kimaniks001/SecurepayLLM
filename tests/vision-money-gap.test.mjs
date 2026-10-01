import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync(new URL('../src/api/securepay/index.ts', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/money-snapshot/index.ts', import.meta.url), 'utf8');
const dto = fs.readFileSync(new URL('../src/api/securepay/money-snapshot/dto.ts', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/money/MoneyExperience.tsx', import.meta.url), 'utf8');
const snapshotPanel = fs.readFileSync(new URL('../src/features/money/MoneySnapshotPanel.tsx', import.meta.url), 'utf8');

test('Vision Money Gap: snapshot is Agreement-scoped and read-only', () => {
  assert.match(gateway, /\/api\/v1\/agreements\/\$\{segment\(agreementId\)\}\/money-snapshot/);
  assert.match(gateway, /read: \(agreementId: string\)/);
  assert.doesNotMatch(gateway, /method:\s*['"]POST['"]|method:\s*['"]PUT['"]|method:\s*['"]PATCH['"]|method:\s*['"]DELETE['"]/);
  assert.doesNotMatch(gateway, /railCode|amountMinor|currency|beneficiary|destinationReference|funding-quotes/);
});

test('movement stays fail-closed until backend preflight exists', () => {
  assert.match(dto, /movementAssessment:\s*'NOT_ASSESSED'/);
  assert.match(dto, /ready:\s*boolean \| null/);
  assert.match(dto, /NOT_EVALUATED/);
  assert.match(dto, /AMBIGUOUS/);
});

test('SecurePay API surface registers the money snapshot gateway', () => {
  assert.match(api, /createMoneySnapshotGateway/);
  assert.match(api, /moneySnapshot:\s*createMoneySnapshotGateway\(http\)/);
});

test('snapshot is session-refreshed and wired into the real Money route', () => {
  assert.match(runtime, /MONEY_AUTHENTICATED_METHODS\.moneySnapshot/);
  assert.match(runtime, /moneySnapshot: moneySnapshotGateway/);
  assert.match(experience, /<MoneySnapshotPanel/);
});

test('snapshot UI shows financial truth but keeps every financial command withheld', () => {
  for (const term of ['Authorised maximum', 'Funded', 'Progressed', 'Returned', 'Remaining funded', 'Payment Ready', 'Funding routes and charges']) {
    assert.match(snapshotPanel, new RegExp(term));
  }
  for (const forbidden of ['createQuote(', 'createIntent(', '.initiate(', '.fund(', '.exercise(', '.release(']) {
    assert.ok(!snapshotPanel.includes(forbidden), forbidden);
  }
  assert.match(snapshotPanel, /do not, by themselves, prove movement authority/);
  assert.match(snapshotPanel, /Exact charges stay withheld/);
});
