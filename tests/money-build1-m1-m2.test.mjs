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

test('Agreement amount, purpose, counterparty and next action are backend-derived', () => {
  assert.match(money, /agreement\.purpose/);
  assert.match(money, /agreement\.proposedAmountMinor/);
  assert.match(money, /agreement\.counterparty/);
  assert.match(money, /agreement\.nextActions\[0\]/);
  assert.match(money, /agreementGateway\.detail\(selected\.agreementId\)/);
});

test('Payment Ready, release and movement are rendered from the Money snapshot', () => {
  assert.match(money, /snapshot\.paymentReady/);
  assert.match(money, /snapshot\.releaseRequest\.authorityGranted/);
  assert.match(money, /snapshot\.movement\.state/);
  assert.match(money, /Can money move\?/);
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

test('M-PESA is always understandable but only available from MPESA_STK', () => {
  assert.match(money, /M-PESA/);
  assert.match(money, /MPESA_STK/);
  assert.match(money, /snapshot\.fundingOptions\.find\(route => route\.railCode === railCode\)/);
  assert.match(money, /not currently available for this Agreement/);
});

test('PesaLink is always understandable but only available from PESALINK', () => {
  assert.match(money, /PesaLink/);
  assert.match(money, /PESALINK/);
  assert.match(money, /Bank-based funding into this Agreement where eligible/);
});

test('Choice Bank is presented as settlement infrastructure and only selected from movement evidence', () => {
  assert.match(money, /Choice Bank/);
  assert.match(money, /CHOICE_KS_ACCOUNT/);
  assert.match(money, /snapshot\?\.movement\.railCode === 'CHOICE_KS_ACCOUNT'/);
  assert.match(money, /bank-account and settlement role/);
  assert.match(money, /does not by itself make settlement executable/);
});

test('rail detail comes from backend funding options including quote capability', () => {
  assert.match(money, /route\.minimumAmountMinor/);
  assert.match(money, /route\.maximumAmountMinor/);
  assert.match(money, /route\.quoteAvailable/);
  assert.match(money, /Agreement-bound quote/);
  assert.match(money, /does not offer a quote step/);
});

test('the visual flow preserves Agreement to Fund to Agreement Money to Settle', () => {
  const agreement = money.indexOf('1 · Agreement');
  const fund = money.indexOf('2 · Fund');
  const agreementMoney = money.indexOf('3 · Agreement Money');
  const settle = money.indexOf('4 · Settle');
  assert.ok(agreement >= 0 && fund > agreement && agreementMoney > fund && settle > agreementMoney);
  assert.match(money, /Visible does not mean executable/);
});

test('money responsibility is shown only from backend movement economics payerRole', () => {
  assert.match(money, /economics\?\.payerRole/);
  assert.match(money, /Payer role/);
  assert.doesNotMatch(money, /currentActor.*payer/i);
});

test('empty and unavailable states never guess financial truth', () => {
  assert.match(money, /No Agreement Money has been funded yet/);
  assert.match(money, /does not currently list an eligible funding route/);
  assert.match(money, /could not complete the movement preflight/);
  assert.match(money, /No money state is being guessed/);
});

test('Build 1 introduces no money-moving frontend command', () => {
  assert.doesNotMatch(money, /\.fund\(/);
  assert.doesNotMatch(money, /\.release\(/);
  assert.doesNotMatch(money, /\.settle\(/);
  assert.doesNotMatch(money, /\.execute\(/);
  assert.doesNotMatch(money, /hardcoded.*eligible/i);
});
