import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const storeExperience = fs.readFileSync(new URL('../src/features/store/StoreExperience.tsx', import.meta.url), 'utf8');
const storeController = fs.readFileSync(new URL('../src/features/store/controller.ts', import.meta.url), 'utf8');
const management = fs.readFileSync(new URL('../src/components/StoreManagementHome.tsx', import.meta.url), 'utf8');
const agent = fs.readFileSync(new URL('../src/features/agent/AgentExperience.tsx', import.meta.url), 'utf8');

test('Store management reuses backend-confirmed Business representation', () => {
  assert.match(storeExperience, /businessGateway\.mine\(\)/);
  assert.match(storeExperience, /businessGateway\.representation\(business\.businessKsNumber\)/);
  assert.match(storeExperience, /controller\.enterBusinessManagement/);
});

test('Business Store writes use represented Business endpoints after selection', () => {
  assert.match(storeController, /gateway\.businessProfile/);
  assert.match(storeController, /gateway\.businessOffers/);
  assert.match(storeController, /gateway\.createBusinessOffer/);
  assert.match(storeController, /gateway\.updateBusinessOffer/);
  assert.match(storeController, /gateway\.confirmBusinessOfferAvailability/);
});

test('Store Vision does not invent a second planning engine', () => {
  assert.match(management, /Store Vision/);
  assert.match(management, /Demand matching appears only when SecurePay has real fulfilment needs/);
  assert.match(agent, /visionBoardController\.loadForOwner\(businessKsNumber\)/);
  assert.match(agent, /onOpenBusinessVision/);
});

test('Money cockpit handoff uses the existing Money route', () => {
  assert.match(management, /Open SecurePay Money for authoritative financial truth/);
  assert.match(storeExperience, /onNavigate\('money'\)/);
});
