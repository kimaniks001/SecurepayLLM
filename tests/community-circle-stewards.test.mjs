import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const dto = fs.readFileSync(new URL('../src/api/securepay/community/dto.ts', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/community/index.ts', import.meta.url), 'utf8');
const controller = fs.readFileSync(new URL('../src/features/community/controller.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');

test('Circle membership carries server-derived steward authority', () => {
  assert.match(dto, /isSteward: boolean/);
  assert.match(controller, /membership\.isOwner \|\| membership\.isSteward/);
});

test('steward management uses opaque Circle membership references', () => {
  assert.match(gateway, /stewards\/\$\{segment\(membershipId\)\}/);
  assert.match(dto, /membershipId: string/);
  assert.doesNotMatch(gateway, /identityId.*stewards/);
});

test('stewards may care for access while Circle close stays founder-only', () => {
  assert.match(experience, /const canSteward = isOwner \|\| isSteward/);
  assert.match(experience, /canSteward && circle\.membershipMode === 'INVITE_ONLY'/);
  assert.match(experience, /canSteward && circle\.membershipMode === 'REQUEST_TO_JOIN'/);
  assert.match(experience, /isOwner && \(/);
  assert.match(experience, /Close Circle/);
});

test('founder can appoint and revoke additional stewards from active members', () => {
  assert.match(experience, /Make steward/);
  assert.match(experience, /Remove steward/);
  assert.match(controller, /appointCircleSteward/);
  assert.match(controller, /removeCircleSteward/);
});
