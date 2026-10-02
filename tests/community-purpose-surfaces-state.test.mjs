import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const experience = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');

test('purpose surfaces own real loaded state rather than undeclared placeholders', () => {
  assert.match(experience, /useState<CommunityServiceOpportunityDto\[\]>/);
  assert.match(experience, /useState<CommunityEventDto\[\]>/);
  assert.match(experience, /useState<CommunityProjectDto\[\]>/);
  assert.match(experience, /useState<ApprenticeshipProjectDto\[\]>/);
  assert.match(experience, /communityGateway\.serviceOpportunities\.list\(\)/);
  assert.match(experience, /communityGateway\.events\.list\(\)/);
  assert.match(experience, /communityGateway\.projects\.list\(\)/);
  assert.match(experience, /communityGateway\.apprenticeships\.list\(\)/);
});

test('purpose loading has an explicit error state', () => {
  assert.match(experience, /purposeError/);
  assert.match(experience, /role="alert"/);
});
