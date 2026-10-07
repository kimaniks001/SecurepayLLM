import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const simple = await readFile('src/features/money/SimpleMoneyDashboard.tsx', 'utf8');
const moneyExperience = await readFile('src/features/money/MoneyExperience.tsx', 'utf8');
const handoff = await readFile('src/features/money/handoff.ts', 'utf8');

test('Money is answer-first before deeper architecture', () => {
  const position = simple.indexOf('Your money position');
  const movement = simple.indexOf('Can SecurePay move money now?');
  const architecture = simple.indexOf('Full money record');
  assert.ok(position > 0);
  assert.ok(movement > position);
  assert.ok(architecture > movement);
  assert.match(simple, /Where the money is now/);
  assert.match(simple, /Nothing needs you right now/);
});

test('movement state is human-readable and never leaks backend reason codes into the default answer', () => {
  assert.match(simple, /Can SecurePay move money now\?/);
  assert.match(simple, /Live money movement is not enabled for this Agreement yet/);
  assert.match(simple, /could not establish a reliable movement answer/);
  assert.doesNotMatch(simple, /titleCase\(snapshot\.movement\.reasonCode\)/);
});

test('money position never converts missing backend amounts into zero', () => {
  assert.match(simple, /funded == null \? 'Unavailable'/);
  assert.match(simple, /exercisedOrSettledMinor == null \? 'Unavailable'/);
  assert.match(simple, /remainingFundedMinor == null \? 'Unavailable'/);
  assert.match(simple, /releasedTotalMinor == null \? 'Unavailable'/);
  assert.doesNotMatch(simple, /position\.remainingFundedMinor \?\? 0/);
  assert.doesNotMatch(simple, /position\.releasedTotalMinor \?\? 0/);
});

test('Money Agreement selector is compact, searchable and paginated', () => {
  assert.match(simple, /AGREEMENTS_PER_PAGE = 12/);
  assert.match(simple, /currentUserAgreements\(agreementPage, AGREEMENTS_PER_PAGE\)/);
  assert.match(simple, /Search this page by title, person or amount/);
  assert.match(simple, /Page \{agreementPage \+ 1\} of \{agreementPageCount\}/);
  assert.match(simple, /Previous/);
  assert.match(simple, /Next/);
  assert.match(simple, /min-h-14 w-full items-center/);
});

test('Agreement handoff stays in-memory and preserves selected context', () => {
  assert.match(handoff, /in-memory only/i);
  assert.match(handoff, /window\.location\.hash = '#\/money'/);
  assert.match(simple, /if \(!handoff && agreementPage === 0 && !selected/);
  assert.match(simple, /resolveSelection\(agreementGateway,[\s\S]*handoff\)/);
});

test('charges stay easy to find while route architecture is progressive disclosure', () => {
  assert.match(simple, /Funding & charges/);
  assert.match(simple, /SecurePay charge/);
  assert.match(simple, /Rail\/provider/);
  assert.match(simple, /Total payable/);
  assert.match(simple, /<details className="rounded-3xl border border-forest-200 bg-white\/80" data-testid="agreement-money-flow">/);
});

test('deeper Money capability remains reachable', () => {
  for (const capability of [
    'MoneyPaymentSettlementJourney',
    'Can this Agreement be paid now?',
    'Has money been funded?',
    'Can money be released?',
    'Eligible funding routes',
    'Payment & settlement',
  ]) {
    assert.ok(simple.includes(capability), `missing Money capability: ${capability}`);
  }
  assert.match(moneyExperience, /Technical & administration record/);
  assert.match(moneyExperience, /CurrencyCapabilitySection/);
  assert.match(moneyExperience, /FxConversionSection/);
  assert.match(moneyExperience, /SettlementDestinationSection/);
  assert.match(moneyExperience, /FinancialPartnersSection/);
});

test('answer surface comes before general pathway and KS001 guide', () => {
  const dashboard = moneyExperience.indexOf('<SimpleMoneyDashboard');
  const ks001 = moneyExperience.indexOf('<Ks001SurfaceGuide');
  const pathway = moneyExperience.indexOf('<ExperiencePathway');
  assert.ok(dashboard > 0);
  assert.ok(ks001 > dashboard);
  assert.ok(pathway > dashboard);
});
