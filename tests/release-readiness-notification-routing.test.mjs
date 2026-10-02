import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const experience=fs.readFileSync(new URL('../src/features/notifications/NotificationsExperience.tsx', import.meta.url),'utf8');

test('Agreement notification navigation accepts the generic authority-safe reference',()=>{
  assert.match(experience,/actionObjectReference/);
  assert.match(experience,/startsWith\('agreement:'\)/);
  assert.match(experience,/agreementIdFromNotification/);
});

test('generic notification reference is parsed narrowly rather than used as an arbitrary route',()=>{
  assert.match(experience,/\^\[0-9a-f\]/);
  assert.doesNotMatch(experience,/window\.location.*actionObjectReference/);
});
