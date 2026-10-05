import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const experience = fs.readFileSync(new URL('../src/features/money/MoneyExperience.tsx', import.meta.url), 'utf8');
const simple = fs.readFileSync(new URL('../src/features/money/SimpleMoneyDashboard.tsx', import.meta.url), 'utf8');

test('Money defaults to the simple dashboard and keeps the detailed authority surfaces behind one disclosure', () => {
  assert.match(experience, /SimpleMoneyDashboard/);
  assert.match(experience, /More money details/);
  assert.match(experience, /<details/);
  assert.match(experience, /max-w-6xl/);
  assert.match(experience, /See the money state for an Agreement/);
});

test('the simple Money page keeps the four fair-trade financial enablers visible', () => {
  for (const label of ['Banks', 'SACCOs', 'MMFs', 'Insurance']) {
    assert.match(simple, new RegExp(`title="${label}"`));
  }
  assert.match(simple, /Funding and settlement/);
  assert.match(simple, /Community finance/);
  assert.match(simple, /Cash parking and liquidity/);
  assert.match(simple, /Protection for agreed risks/);
});

test('only real regulated-partner API data may claim a connected bank', () => {
  assert.match(simple, /financialPartners\.list\(\)/);
  assert.match(simple, /partner\.partnerType === 'BANK'/);
  assert.match(simple, /partner\.status === 'ACTIVE'/);
  assert.match(simple, /Connected:/);
});

test('SACCO, MMF and insurance cards are visible without fabricating live availability', () => {
  assert.match(simple, /live SACCO capability is not claimed here yet/);
  assert.match(simple, /live MMF capability is not claimed here yet/);
  assert.match(simple, /live insurance capability is not claimed here yet/);
  assert.doesNotMatch(simple, /title="SACCOs"[\s\S]{0,300}status="Available"/);
  assert.doesNotMatch(simple, /title="MMFs"[\s\S]{0,300}status="Available"/);
  assert.doesNotMatch(simple, /title="Insurance"[\s\S]{0,300}status="Available"/);
});

test('simple status and amount surfaces are read from existing backend-owned snapshots', () => {
  assert.match(simple, /snapshotGateway\.read\(selected\.agreementId\)/);
  assert.match(simple, /snapshot\.paymentReady/);
  assert.match(simple, /snapshot\.releaseRequest\.authorityGranted/);
  assert.match(simple, /snapshot\.fundingOptions/);
  assert.match(simple, /position\.fundedTotalMinor/);
  assert.match(simple, /singlePosition\.releasedTotalMinor/);
});

test('the simple page never introduces financial commands or hardcoded customer amounts', () => {
  assert.doesNotMatch(simple, /\.open\(|\.fund\(|\.exercise\(|\.release\(/);
  assert.doesNotMatch(simple, /KES\s+\d/);
  assert.doesNotMatch(simple, /Confirm funding/);
});
