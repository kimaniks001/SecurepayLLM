import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const vision = await readFile('src/features/visionboard/VisionBoardExperience.tsx', 'utf8');
const store = await readFile('src/components/StoreHome.tsx', 'utf8');
const storeManage = await readFile('src/components/StoreManagementHome.tsx', 'utf8');
const agreement = await readFile('src/features/workspace/LivingAgreementOverview.tsx', 'utf8');
const agreementNext = await readFile('src/features/workspace/AgreementNextStep.tsx', 'utf8');
const progress = await readFile('src/features/execution/ProgressPanel.tsx', 'utf8');
const money = await readFile('src/features/money/MoneyExperience.tsx', 'utf8');
const moneyDash = await readFile('src/features/money/SimpleMoneyDashboard.tsx', 'utf8');
const runtime = await readFile('src/RuntimeApp.tsx', 'utf8');

test('Phase 5 keeps Agreement orchestration while removing the cross-domain module pathway from every ordinary surface', () => {
  assert.doesNotMatch(vision, /ExperiencePathway/);
  assert.doesNotMatch(store, /ExperiencePathway/);
  assert.match(agreement, /data-phase4-agreement-centre/);
  assert.doesNotMatch(agreement, /ExperiencePathway/);
  assert.doesNotMatch(money, /ExperiencePathway/);
  assert.match(vision, /Find what it needs/);
  assert.match(vision, /Make an Agreement/);
  assert.match(moneyDash, /What happens next/);
});

test('each surface exposes a practical next move rather than a static destination', () => {
  assert.match(vision, /What are you trying to move forward/);
  assert.match(storeManage, /What needs you/);
  assert.match(agreement, /AgreementNextStep/);
  assert.match(moneyDash, /What happens next/);
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

test('contextual KS001 remains available without becoming cross-domain authority', () => {
  assert.match(vision, /Ks001SurfaceGuide/);
  assert.match(store, /Ks001SurfaceGuide/);
  assert.match(agreement, /onAskKs001/);
  assert.match(agreement, /<AgreementNextStep/);
  assert.match(agreementNext, /onAskKs001/);
  assert.match(agreementNext, /Ask KS001/);
  assert.match(money, /Ks001SurfaceGuide/);
  assert.match(runtime, /Do not claim current financial authority/);
});

test('Community Saver remains blocked without the required Plug gate', () => {
  const combined = vision + progress + runtime;
  assert.doesNotMatch(combined, /proposeFromNeed\(/);
  assert.match(vision, /does not join a Community Saver/);
  assert.match(progress, /A Plug must verify fit, coordinate consent and practical feasibility before any Community Saver can proceed/);
});
