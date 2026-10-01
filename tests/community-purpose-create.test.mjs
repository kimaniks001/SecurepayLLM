import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/community/index.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');

test('purpose surfaces create through existing backend authorities', () => {
  assert.match(gateway, /events:[\s\S]*create:/);
  assert.match(gateway, /serviceOpportunities:[\s\S]*create:/);
  assert.match(gateway, /projects:[\s\S]*create:/);
  assert.match(gateway, /apprenticeships:[\s\S]*create:/);
});

test('service participation remains interest until explicitly shaped as a project', () => {
  assert.match(experience, /I'm interested/);
  assert.match(experience, /Shape as project/);
  assert.match(experience, /sourceServiceOpportunityId: item\.id/);
});

test('apprenticeship creation tells the person that Master authority is checked server-side', () => {
  assert.match(experience, /Only a currently designated Master can create this/);
  assert.match(experience, /communityGateway\.apprenticeships\.create/);
});

test('event creation keeps RSVP non-contractual', () => {
  assert.match(experience, /RSVP is a plan, not a contractual commitment/);
  assert.match(experience, /communityGateway\.events\.create/);
});
