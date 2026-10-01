import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/community/index.ts', import.meta.url), 'utf8');
const detail = fs.readFileSync(new URL('../src/components/CommunityObjectDetail.tsx', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');

test('Community moderation offers report and mute, not engagement reactions', () => {
  assert.match(gateway, /moderation:/);
  assert.match(detail, /Report/);
  assert.match(detail, /Mute member/);
  assert.doesNotMatch(detail, /Like this|Upvote|Downvote|Share count/);
});

test('report copy does not pretend report equals removal', () => {
  assert.match(experience, /does not automatically remove the post/);
});

test('mute refreshes server-filtered Community feed', () => {
  assert.match(experience, /moderation\.mute/);
  assert.match(experience, /refreshFeed/);
});
