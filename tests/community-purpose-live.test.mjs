import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const home = fs.readFileSync(new URL('../src/components/CommunityHome.tsx', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');

test('Community LIVE uses purpose-first human copy', () => {
  assert.match(home, /Community LIVE/);
  assert.match(home, /Belong\. Serve\. Learn\./);
  assert.match(home, /where can people help/);
});

test('production LIVE does not blend Store offers into Community objects', () => {
  assert.match(experience, /const objects = realObjects/);
  assert.doesNotMatch(experience, /const objects = \[\.\.\.realObjects, \.\.\.storeObjects\]/);
});

test('production LIVE uses the dedicated cross-domain search surface rather than inline Store search', () => {
  const liveCall = experience.slice(experience.indexOf('<CommunityHome'), experience.indexOf('circlesEntryLabel=', experience.indexOf('<CommunityHome')));
  assert.match(liveCall, /showSearch=\{false\}/);
  assert.doesNotMatch(liveCall, /storeSearchStatus=/);
});
