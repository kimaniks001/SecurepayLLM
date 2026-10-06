import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const experience = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/community/index.ts', import.meta.url), 'utf8');

test('Community HOME exposes the five human-purpose surfaces', () => {
  const start = experience.indexOf('const tabs:');
  const end = experience.indexOf('];', start);
  const tabs = experience.slice(start, end);
  for (const label of ['LIVE','PROJECTS & ACTIVITIES','LEARN','CIRCLES','HAPPENING']) assert.match(tabs, new RegExp(label));
  assert.doesNotMatch(tabs, /Discover Circles/);
});

test('Circle discovery remains a deliberate action inside CIRCLES', () => {
  assert.match(experience, /Find Circles/);
  assert.match(experience, /showCommunityTab\('discover'\)/);
});

test('service and event actions are bounded interest and RSVP calls', () => {
  assert.match(gateway, /service-opportunities/);
  assert.match(gateway, /\/volunteer/);
  assert.match(gateway, /community\/events/);
  assert.match(gateway, /\/rsvp/);
  assert.doesNotMatch(gateway, /serviceOpportunities[\s\S]*createAgreement|events[\s\S]*moveMoney/);
});
