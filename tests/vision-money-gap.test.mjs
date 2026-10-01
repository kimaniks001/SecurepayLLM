import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync(new URL('../src/api/securepay/index.ts', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/money-snapshot/index.ts', import.meta.url), 'utf8');
const dto = fs.readFileSync(new URL('../src/api/securepay/money-snapshot/dto.ts', import.meta.url), 'utf8');

test('Vision Money Gap: snapshot is Agreement-scoped and read-only', () => {
  assert.match(gateway, /\/api\/v1\/agreements\/\$\{segment\(agreementId\)\}\/money-snapshot/);
  assert.doesNotMatch(gateway, /method:\s*['"]POST['"]|method:\s*['"]PUT['"]|method:\s*['"]PATCH['"]|method:\s*['"]DELETE['"]/);
});

test('snapshot quote selection never accepts client money authority', () => {
  assert.match(gateway, /read: \(agreementId: string, railCode\?: string\)/);
  assert.doesNotMatch(gateway, /amountMinor|currency|beneficiary|destinationReference/);
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
