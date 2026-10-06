import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const home = fs.readFileSync(new URL('../src/features/community/TrustProjectImpactHome.tsx', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/community/index.ts', import.meta.url), 'utf8');
const dto = fs.readFileSync(new URL('../src/api/securepay/community/dto.ts', import.meta.url), 'utf8');

test('Community LIVE is reframed as the Trust Project living impact surface', () => {
  assert.match(home, /Community is where the Project sees itself/);
  assert.match(home, /Real experiences, creation, criticism and learning/);
  assert.match(home, /Member-reported/);
  assert.match(home, /Platform-observed/);
  assert.match(home, /No causal impact claim/);
  assert.match(experience, /<TrustProjectImpactHome/);
});

test('criticism is first-class and meaningful interest is not popularity', () => {
  assert.match(home, /\['CRITICISM','Criticism'\]/);
  assert.match(home, /I want to learn this/);
  assert.match(home, /I can help/);
  assert.match(home, /This affected me too/);
  assert.doesNotMatch(home, /Like this|Follow this|leaderboard|popularity score/i);
  assert.match(dto, /'CRITICISM'/);
  assert.match(dto, /'LEARN' \| 'HELP'/);
});

test('revamped Community gateway consumes backend-owned contribution impact and pathway routes', () => {
  assert.match(gateway, /\/api\/v1\/community\/contributions/);
  assert.match(gateway, /\/api\/v1\/community\/impact/);
  assert.match(gateway, /\/api\/v1\/trust-project\/pathways\/discover/);
  assert.match(gateway, /knowledge-candidate/);
});

test('pathway discovery remains possibility not assignment', () => {
  assert.match(home, /Possible pathways come from current approved knowledge/);
  assert.match(home, /They do not assign you a role/);
});

test('Community story publishing is project-first and requires explicit safe-share', () => {
  assert.match(home, /originType:'COMMUNITY_PROJECT'/);
  assert.match(home, /originObjectId:storyProjectId/);
  assert.match(home, /explicitSafeShare:true/);
  assert.match(home, /safeShareConfirmed/);
  assert.match(home, /not to private Agreement or payment data/);
});
