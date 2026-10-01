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
  const executableGateway = gateway.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(executableGateway, /railCode|amountMinor|currency|beneficiary|destinationReference|funding-quotes/);
});

test('movement is backend-owned and fail-closed', () => {
  assert.match(dto, /movement:\s*AgreementMoneyMovementSnapshot/);
  assert.match(dto, /state:\s*'READY' \| 'BLOCKED' \| 'UNAVAILABLE'/);
  assert.match(dto, /amountMinor:\s*number \| null/);
  assert.match(dto, /economics:\s*AgreementMoneyMovementEconomicsSnapshot \| null/);
  for (const field of ['recipientPrincipalMinor', 'securePayFeeMinor', 'providerRailChargeMinor', 'totalPayableMinor', 'feeBearer', 'railChargeBearer', 'pricingVersion']) {
    assert.match(dto, new RegExp(field));
  }
  assert.match(dto, /ready:\s*boolean \| null/);
  assert.match(dto, /NOT_EVALUATED/);
  assert.match(dto, /AMBIGUOUS/);
  assert.match(dto, /releaseRequest:\s*AgreementMoneyReleaseRequestSnapshot/);
  assert.match(dto, /authorityGranted:\s*boolean/);
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

test('snapshot UI shows financial truth; only the version-bound quote exception is enabled', () => {
  for (const term of ['Authorised maximum', 'Funded', 'Progressed', 'Returned', 'Remaining funded', 'Payment Ready', 'Release request authority', 'Funding routes and charges']) {
    assert.match(snapshotPanel, new RegExp(term));
  }
  for (const forbidden of ['paymentIntentGateway.createQuote(', 'createIntent(', '.initiate(', '.fund(', '.exercise(', '.release(']) {
    assert.ok(!snapshotPanel.includes(forbidden), forbidden);
  }
  assert.match(snapshotPanel, /snapshot\.feeQuoteRequestsPermitted/);
  assert.match(snapshotPanel, /createVersionBoundQuote/);
  assert.match(snapshotPanel, /snapshot\.currentVersionId/);
  assert.match(snapshotPanel, /quote\.feeBearer/);
  assert.match(snapshotPanel, /quote\.railChargeBearer/);
  assert.match(snapshotPanel, /quote\.pricingVersion/);
  assert.match(snapshotPanel, /Recipient principal/);
  assert.match(snapshotPanel, /SecurePay must receive/);
  assert.match(snapshotPanel, /Total payer out-of-pocket/);
  assert.match(snapshotPanel, /providerChargeMinor === null/);
  assert.match(snapshotPanel, /providerCostMinor === null/);
  assert.match(snapshotPanel, /Economic safety/);
  assert.match(snapshotPanel, /quote\.economicState/);
  assert.match(snapshotPanel, /quote\.economicReasonCode/);
  assert.match(snapshotPanel, /not execution-eligible/);
  assert.match(paymentIntentApi, /expectedAgreementVersionId/);
  assert.match(paymentIntentApi, /quoteReference/);
  assert.match(paymentIntentApi, /createIntent/);
  assert.match(snapshotPanel, /does not create or initiate a payment/);
  assert.match(snapshotPanel, /Can money move now\?/);
  assert.match(snapshotPanel, /snapshot\.movement\.state === 'READY'/);
  assert.match(snapshotPanel, /Exact amount that passed the current preflight/);
  assert.match(snapshotPanel, /Current commercial decomposition/);
  assert.match(snapshotPanel, /Expected recipient principal/);
  assert.match(snapshotPanel, /SecurePay fee bearer/);
  assert.match(snapshotPanel, /Pricing version/);
  assert.match(snapshotPanel, /not an instruction to move money/);
  assert.match(snapshotPanel, /No movable amount is asserted/);
  assert.match(snapshotPanel, /This check moves no money/);
});
