import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const impact = fs.readFileSync(new URL('../src/features/community/TrustProjectImpactHome.tsx', import.meta.url), 'utf8');

test('new Community stories are project-first rather than free-floating', () => {
  assert.match(impact, /Tell the story of a Project/);
  assert.match(impact, /No free-floating posts/);
  assert.match(impact, /originType:'COMMUNITY_PROJECT'/);
  assert.match(impact, /originObjectId:storyProjectId/);
  assert.match(impact, /Choose the Project this story belongs to/);
});

test('Community story composer does not bind private Agreement or payment data', () => {
  assert.match(impact, /not to private Agreement or payment data/);
});
