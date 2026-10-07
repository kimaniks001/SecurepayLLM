import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const money = fs.readFileSync(new URL('../src/features/money/SimpleMoneyDashboard.tsx', import.meta.url), 'utf8');

test('Build 1 remains Agreement-first and never leads with a wallet balance', () => {
  assert.match(money, /Money follows the agreement/);
  assert.match(money, /Your Agreements/);
  assert.match(money, /What was agreed/);
  assert.doesNotMatch(money, /Wallet balance/);
  assert.doesNotMatch(money, /Available balance/);
});

test('Agreement amount, purpose, counterparty and financial next action are backend-derived', () => {
  assert.match(money, /agreement\.purpose/);
  assert.match(money, /agreement\.proposedAmountMinor/);
  assert.match(money, /agreement\.counterparty/);
  assert.match(money, /agreement\.nextActions\.find\(action => action\.actionCode === 'FUND_AGREEMENT'\)/);
  assert.doesNotMatch(money, /agreement\.nextActions\[0\]\.reason/);
  assert.match(money, /agreementGateway\.detail\(selected\.agreementId\)/);
});

test('Payment Ready, release and movement are rendered from the Money snapshot', () => {
  assert.match(money, /snapshot\.paymentReady/);
  assert.match(money, /snapshot\.releaseRequest\.authorityGranted/);
  assert.match(money, /snapshot\.movement\.state/);
  assert.match(money, /Can SecurePay move money now\?/);
  assert.doesNotMatch(money, /paymentReady\s*=\s*funded/);
});

test('Agreement Money positions expose the authoritative five money fields', () => {
  assert.match(money, /position\.authorisedMaxAmountMinor/);
  assert.match(money, /position\.fundedTotalMinor/);
  assert.match(money, /position\.exercisedOrSettledMinor/);
  assert.match(money, /position\.releasedTotalMinor/);
  assert.match(money, /position\.remainingFundedMinor/);
  assert.doesNotMatch(money, /reduce\([^)]*fundedTotalMinor/);
});

test('only backend-returned funding routes are presented as eligible payment methods', () => {
  assert.match(money, /const fundingRoutes = currentSnapshot\?\.fundingOptions \?\? \[\]/);
  assert.match(money, /fundingRoutes\.map\(route => <FundingOptionCard/);
  assert.match(money, /No payment method is available for this Agreement yet/);
  assert.doesNotMatch(money, /fundingRailState\(/);
});

test('bank support is claimed only from the regulated-partner projection', () => {
  assert.match(money, /financialPartners\.list\(\)/);
  assert.match(money, /partner\.partnerType === 'BANK'/);
  assert.match(money, /partner\.status === 'ACTIVE'/);
  assert.match(money, /Connected:/);
});

test('rail detail comes from backend funding options including quote capability', () => {
  assert.match(money, /route\.minimumAmountMinor/);
  assert.match(money, /route\.maximumAmountMinor/);
  assert.match(money, /route\.quoteAvailable/);
  assert.match(money, /Agreement-bound quote/);
  assert.match(money, /does not offer a quote step/);
});

test('the visual flow preserves Agreement to Fund to Agreement Money to Settle', () => {
  const agreement = money.indexOf('1 · Agree');
  const fund = money.indexOf('2 · Fund');
  const agreementMoney = money.indexOf('3 · Protect');
  const settle = money.indexOf('4 · Release');
  assert.ok(agreement >= 0 && fund > agreement && agreementMoney > fund && settle > agreementMoney);
  assert.match(money, /follow only when their own authority is available/);
});

test('money responsibility is shown only from backend movement economics payerRole', () => {
  assert.match(money, /economics\?\.payerRole/);
  assert.match(money, /Who pays/);
  assert.doesNotMatch(money, /currentActor.*payer/i);
});

test('empty and unavailable states never guess financial truth', () => {
  assert.match(money, /No money is recorded as funded for this Agreement yet/);
  assert.match(money, /No payment method is available for this Agreement yet/);
  assert.match(money, /could not establish a reliable movement answer/);
  assert.match(money, /No money state is being guessed/);
});

test('Build 1 introduces no money-moving frontend command', () => {
  assert.doesNotMatch(money, /\.fund\(/);
  assert.doesNotMatch(money, /\.release\(/);
  assert.doesNotMatch(money, /\.settle\(/);
  assert.doesNotMatch(money, /\.execute\(/);
  assert.doesNotMatch(money, /hardcoded.*eligible/i);
});
