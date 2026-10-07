import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const experience = fs.readFileSync(new URL('../src/features/money/MoneyExperience.tsx', import.meta.url), 'utf8');
const moneyHome = fs.readFileSync(new URL('../src/features/money/SimpleMoneyDashboard.tsx', import.meta.url), 'utf8');

test('Money lands on the agreement-led home and keeps the deeper authority record available', () => {
  assert.match(experience, /SimpleMoneyDashboard/);
  assert.match(experience, /Technical & administration record/);
  assert.match(experience, /<details/);
  assert.match(experience, /max-w-6xl/);
  assert.match(experience, /Choose an Agreement, see where its money stands/);
});

test('the Money home starts with Agreements, agreed purpose, amount and a money-specific next answer', () => {
  assert.match(moneyHome, /Your Agreements/);
  assert.match(moneyHome, /What was agreed/);
  assert.match(moneyHome, /agreement\.purpose/);
  assert.match(moneyHome, /agreement\.proposedAmountMinor/);
  assert.match(moneyHome, /find\(action => action\.actionCode === 'FUND_AGREEMENT'\)/);
  assert.doesNotMatch(moneyHome, /agreement\.nextActions\[0\]\.reason/);
  assert.match(moneyHome, /agreementGateway\.detail\(selected\.agreementId\)/);
  assert.match(moneyHome, /currentDetail\.terms\.slice\(0, 4\)/);
});

test('the mature Money home surfaces the core finance state without inventing authority', () => {
  assert.match(moneyHome, /Can this Agreement be paid now\?/);
  assert.match(moneyHome, /Has money been funded\?/);
  assert.match(moneyHome, /Can money be released\?/);
  assert.match(moneyHome, /Can SecurePay move money now\?/);
  assert.match(moneyHome, /snapshotGateway\.read\(selected\.agreementId\)/);
  assert.match(moneyHome, /snapshot\.paymentReady/);
  assert.match(moneyHome, /snapshot\.releaseRequest\.authorityGranted/);
  assert.match(moneyHome, /snapshot\.movement\.state/);
});

test('Agreement Money shows funded, progressed, remaining and returned per backend position', () => {
  assert.match(moneyHome, /position\.fundedTotalMinor/);
  assert.match(moneyHome, /position\.exercisedOrSettledMinor/);
  assert.match(moneyHome, /position\.remainingFundedMinor/);
  assert.match(moneyHome, /position\.releasedTotalMinor/);
  assert.doesNotMatch(moneyHome, /reduce\([^)]*fundedTotalMinor/);
});

test('funding routes and charges use backend snapshot economics only', () => {
  assert.match(moneyHome, /snapshot\.fundingOptions/);
  assert.match(moneyHome, /movement\.economics/);
  assert.match(moneyHome, /economics\.recipientPrincipalMinor/);
  assert.match(moneyHome, /economics\.securePayFeeMinor/);
  assert.match(moneyHome, /economics\.providerRailChargeMinor/);
  assert.match(moneyHome, /economics\.totalPayableMinor/);
});

test('the four fair-trade finance enablers remain visible', () => {
  for (const label of ['Banks', 'SACCOs', 'MMFs', 'Insurance']) {
    assert.match(moneyHome, new RegExp(`title="${label}"`));
  }
  assert.match(moneyHome, /Funding, payment rails and settlement/);
  assert.match(moneyHome, /Community finance and member support/);
  assert.match(moneyHome, /Liquidity and a place for waiting funds/);
  assert.match(moneyHome, /Protection for agreed risks/);
});

test('only real regulated-partner data may claim a connected bank', () => {
  assert.match(moneyHome, /financialPartners\.list\(\)/);
  assert.match(moneyHome, /partner\.partnerType === 'BANK'/);
  assert.match(moneyHome, /partner\.status === 'ACTIVE'/);
  assert.match(moneyHome, /Connected:/);
});

test('SACCO, MMF and insurance remain visible without fabricated live availability', () => {
  assert.match(moneyHome, /Live SACCO availability appears only when SecurePay can prove it/);
  assert.match(moneyHome, /Live MMF availability appears only when SecurePay can prove it/);
  assert.match(moneyHome, /Live cover appears only when SecurePay can prove it/);
  assert.doesNotMatch(moneyHome, /title="SACCOs"[\s\S]{0,350}status="Available"/);
  assert.doesNotMatch(moneyHome, /title="MMFs"[\s\S]{0,350}status="Available"/);
  assert.doesNotMatch(moneyHome, /title="Insurance"[\s\S]{0,350}status="Available"/);
});

test('the Money home does not introduce financial commands or hardcoded customer amounts', () => {
  assert.doesNotMatch(moneyHome, /\.open\(|\.fund\(|\.exercise\(|\.release\(/);
  assert.doesNotMatch(moneyHome, /KES\s+\d/);
  assert.doesNotMatch(moneyHome, /Confirm funding/);
});
