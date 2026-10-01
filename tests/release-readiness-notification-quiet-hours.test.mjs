import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/notifications/index.ts', import.meta.url), 'utf8');
const controller = fs.readFileSync(new URL('../src/features/notifications/controller.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/notifications/NotificationsExperience.tsx', import.meta.url), 'utf8');

test('quiet hours are a real self-scoped notification preference', () => {
  assert.match(gateway, /getQuietHours/);
  assert.match(gateway, /updateQuietHours/);
  assert.match(gateway, /\/notifications\/me\/quiet-hours/);
  assert.match(controller, /quietHoursDraft/);
  assert.match(controller, /gateway\.updateQuietHours\(quietDraft\)/);
});

test('UI says exactly what quiet hours can and cannot defer', () => {
  assert.match(experience, /Hold non-critical external interruptions/);
  assert.match(experience, /In-app records still appear immediately/);
  assert.match(experience, /Critical and Security/);
});
