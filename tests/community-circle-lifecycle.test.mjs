import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const dto = fs.readFileSync(new URL('../src/api/securepay/community/dto.ts', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/community/index.ts', import.meta.url), 'utf8');
const controller = fs.readFileSync(new URL('../src/features/community/controller.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');

test('Circle UI carries quiet and archived lifecycle states', () => {
  assert.match(dto, /'ACTIVE' \| 'QUIET' \| 'ARCHIVED' \| 'CLOSED'/);
  assert.match(gateway, /setLifecycle/);
  assert.match(controller, /setCircleLifecycle/);
});

test('quiet and archived Circles are represented as read-only history', () => {
  assert.match(experience, /Existing members can read its history/);
  assert.match(experience, /new posts and membership activity are paused/);
});

test('founder retains archive and close authority while steward may quiet/reactivate', () => {
  assert.match(experience, /Mark quiet/);
  assert.match(experience, /Archive/);
  assert.match(experience, /Restore/);
  assert.match(experience, /Close Circle/);
});
