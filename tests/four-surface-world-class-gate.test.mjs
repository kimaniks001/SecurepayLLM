import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const vision = await readFile('src/features/visionboard/VisionBoardExperience.tsx', 'utf8');
const store = await readFile('src/components/StoreHome.tsx', 'utf8');
const storeManage = await readFile('src/components/StoreManagementHome.tsx', 'utf8');
const agreement = await readFile('src/features/workspace/LivingAgreementOverview.tsx', 'utf8');
const progress = await readFile('src/features/execution/ProgressPanel.tsx', 'utf8');
const money = await readFile('src/features/money/MoneyExperience.tsx', 'utf8');
const moneyDash = await readFile('src/features/money/SimpleMoneyDashboard.tsx', 'utf8');
const runtime = await readFile('src/RuntimeApp.tsx', 'utf8');

test('all four operating surfaces share one visible journey language', () => {
  assert.match(vision, /ExperiencePathway active="vision"/);
  assert.match(store, /ExperiencePathway active="store"/);
  assert.match(agreement, /ExperiencePathway active="agreement"/);
  assert.match(money, /ExperiencePathway active="money"/);
});

test('each surface exposes a practical next move rather than a static destination', () => {
  assert.match(vision, /What are you trying to move forward/);
  assert.match(storeManage, /What needs you/);
  assert.match(agreement, /What needs you next/);
  assert.match(moneyDash, /Next step/);
});

test('cross-surface dead ends have explicit recovery', () => {
  assert.match(vision, /Browse Store anyway/);
  assert.match(progress, /Browse Store anyway/);
  assert.match(store, /Tell KS001 what you need/);
  assert.match(moneyDash, /Start in Vision/);
  assert.match(moneyDash, /Open Agreements/);
  assert.match(moneyDash, /Open this Agreement/);
});

test('Money can return to the exact Agreement without making financial claims', () => {
  assert.match(runtime, /storeAgreementEntry\(agreementId\)/);
  assert.match(moneyDash, /onOpenAgreement\(selected\.agreementId\)/);
  assert.doesNotMatch(moneyDash, /money is safe to move automatically|release automatically|fund automatically/i);
});

test('contextual KS001 exists across all four surfaces without becoming authority', () => {
  assert.match(vision, /Ks001SurfaceGuide/);
  assert.match(store, /Ks001SurfaceGuide/);
  assert.match(agreement, /Ks001SurfaceGuide/);
  assert.match(money, /Ks001SurfaceGuide/);
  assert.match(runtime, /Do not claim current financial authority/);
});

test('Community Saver remains blocked without the required Plug gate', () => {
  const combined = vision + progress + runtime;
  assert.doesNotMatch(combined, /proposeFromNeed\(/);
  assert.match(vision, /does not join a Community Saver/);
  assert.match(progress, /does not amend the Agreement or join a Community Saver/);
});
