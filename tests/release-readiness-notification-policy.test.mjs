import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/notifications/index.ts', import.meta.url), 'utf8');
const controller = fs.readFileSync(new URL('../src/features/notifications/controller.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/notifications/NotificationsExperience.tsx', import.meta.url), 'utf8');

test('release policy uses grouped preferences and quiet hours', () => {
  assert.match(gateway, /agreementsMoneyMode/);
  assert.match(gateway, /storePlugMasterMode/);
  assert.match(gateway, /communityMode/);
  assert.match(gateway, /opportunitiesMode/);
  assert.match(gateway, /quietHoursEnabled/);
  assert.match(controller, /getPolicyPreferences/);
  assert.match(controller, /updatePolicyPreferences/);
});

test('Security is protected in the experience and has no off toggle', () => {
  assert.match(experience, /Security/);
  assert.match(experience, /Ordinary preferences cannot turn off/);
  assert.doesNotMatch(experience, /securityCategoryEnabled/);
});

test('channel copy describes fallback rather than broadcast', () => {
  assert.match(experience, /fallback happens only after the preferred channel does not deliver/);
  assert.match(experience, /SMS fallback/);
});
