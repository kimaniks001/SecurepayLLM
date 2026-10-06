import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync(new URL('../src/api/securepay/notifications/index.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/notifications/NotificationsExperience.tsx', import.meta.url), 'utf8');

test('notification parser recognizes current backend Circle Store and work navigation keys', () => {
  for (const key of ['OPEN_CIRCLE','OPEN_STORE','OPEN_MASTER_REQUEST','OPEN_PLUG_TASK']) {
    assert.match(api, new RegExp(key));
  }
});

test('Circle and Store notifications route to their real product surfaces without creating authority', () => {
  assert.match(experience, /OPEN_CIRCLE/);
  assert.match(experience, /Open Circle/);
  assert.match(experience, /onNavigate\('community'\)/);
  assert.match(experience, /OPEN_STORE/);
  assert.match(experience, /Open Store/);
  assert.match(experience, /onNavigate\('store'\)/);
  assert.doesNotMatch(experience, /resolve\(notification\.id/);
});
