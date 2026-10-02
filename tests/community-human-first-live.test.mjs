import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const experience = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');
const home = fs.readFileSync(new URL('../src/components/CommunityHome.tsx', import.meta.url), 'utf8');

test('production Community LIVE has no agent/KS001 conversation entry', () => {
  const liveCall = experience.slice(experience.indexOf('<CommunityHome'), experience.indexOf('circlesEntryLabel=', experience.indexOf('<CommunityHome')));
  assert.doesNotMatch(liveCall, /onStartConversation/);
});

test('shared CommunityHome only renders agent affordances when explicitly supplied by a non-LIVE caller', () => {
  assert.match(home, /onStartConversation\?:/);
  assert.match(home, /\{onStartConversation && \(/);
});
