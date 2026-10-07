import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const detail = await readFile('src/components/AgreementDetail.tsx', 'utf8');
const overview = await readFile('src/features/workspace/LivingAgreementOverview.tsx', 'utf8');
const view = await readFile('src/features/workspace/view.ts', 'utf8');
const money = await readFile('src/features/money/SimpleMoneyDashboard.tsx', 'utf8');
const moneyExperience = await readFile('src/features/money/MoneyExperience.tsx', 'utf8');
const guide = await readFile('src/features/experience/Ks001SurfaceGuide.tsx', 'utf8');
const workspace = await readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8');

test('Agreement desktop has four primary doors and keeps the full authority record behind one deliberate doorway', () => {
  assert.match(detail, /const primaryTabs[\s\S]*Overview[\s\S]*People[\s\S]*Money[\s\S]*Activity/);
  assert.match(detail, /const fullRecordTabs[\s\S]*Terms[\s\S]*Documents[\s\S]*Changes[\s\S]*Progress[\s\S]*Calendar & tags[\s\S]*Support/);
  assert.match(detail, /Full record/);
});

test('real Agreement Overview owns one story instead of stacking the old overview and the living projection', () => {
  assert.match(detail, /overviewPanel \? overviewPanel\(openSection\) : <AgreementOverview/);
  assert.match(overview, /At a glance/);
  assert.match(overview, /What happens next/);
  assert.match(overview, /Where we are/);
  assert.match(overview, /Next date/);
});

test('Agreement Money is a compact handoff, not a second Money application', () => {
  assert.match(detail, /function AgreementMoneySummary/);
  assert.match(detail, /See Money/);
  assert.match(detail, /re-checks current funding, release and movement authority/);
  assert.doesNotMatch(detail, /import \{ MoneyAgreementContext \}/);
  assert.doesNotMatch(detail, /import \{ MoneyStatus \}/);
});

test('Money next-step copy is money-specific and never promotes the first generic Agreement action', () => {
  assert.match(money, /find\(action => action\.actionCode === 'FUND_AGREEMENT'\)/);
  assert.doesNotMatch(money, /nextActions\[0\]\.reason/);
  assert.match(money, /A release can be requested/);
  assert.match(money, /This Agreement can be funded/);
  assert.match(money, /Funding is due, but no payment route is available yet/);
});

test('raw movement reason codes are translated before customer presentation', () => {
  assert.match(money, /ENVIRONMENT_DISABLED: 'Live money movement is not enabled for this Agreement yet.'/);
  assert.doesNotMatch(money, /titleCase\(snapshot\.movement\.reasonCode\)/);
});

test('advanced Money is one full record and legacy administration is explicitly technical', () => {
  assert.equal((money.match(/data-testid="agreement-money-flow"/g) ?? []).length, 1);
  assert.match(money, /Full money record/);
  assert.match(money, /Payment routes, charges, release & settlement/);
  assert.match(moneyExperience, /Technical & administration record/);
});

test('SecurePay is the visible guide and KS001 is shown only as SecurePay identity on these surfaces', () => {
  assert.match(guide, /SecurePay · Trust Project identity KS001/);
  assert.match(guide, /Ask SecurePay about this Agreement/);
  assert.doesNotMatch(guide, /KS001 should only suggest/);
});

test('Changes are prefetched so opening the record need not flash a first-load empty state', () => {
  assert.match(workspace, /warm the read-only Changes projection/);
  assert.match(workspace, /void amendments\.loadOverview\(\)/);
});

test('Agreement next-action wording is centralized around backend action codes', () => {
  assert.match(view, /export function humanNextActionReason/);
  assert.match(view, /FUND_AGREEMENT: 'Fund this Agreement'/);
  assert.match(view, /REVIEW_AMENDMENT: 'Review the proposed change'/);
  assert.match(view, /RECONFIRM_AGREEMENT_VERSION: 'Review and confirm the latest Agreement version'/);
});
