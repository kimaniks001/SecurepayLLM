import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const experience = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
const controller = await readFile('src/features/community/controller.ts', 'utf8');
const gateway = await readFile('src/api/securepay/community/index.ts', 'utf8');
const dto = await readFile('src/api/securepay/community/dto.ts', 'utf8');
const objectDetail = await readFile('src/components/CommunityObjectDetail.tsx', 'utf8');
const circleBoard = await readFile('src/features/community/CircleBoard.tsx', 'utf8');

test('Community HOME and LIVE are distinct first-class surfaces', () => {
  assert.match(controller, /CommunityHomeTab = 'home' \| 'live'/);
  assert.match(controller, /communityTab: 'home'/);
  assert.match(experience, /value: 'home', label: 'HOME'/);
  assert.match(experience, /value: 'live', label: 'LIVE'/);
  assert.match(experience, /Community Home/);
  assert.match(experience, /LIVE stays separate for the wider Community/);
  assert.match(experience, /Open Community LIVE/);
});

test('Community HOME answers human questions using real loaded authority', () => {
  assert.match(experience, /What needs me/);
  assert.match(experience, /What I joined/);
  assert.match(experience, /Happening soon/);
  assert.match(experience, /What people are working on/);
  assert.match(experience, /serviceItems\.filter\(item => item\.status === 'OPEN'\)/);
  assert.match(experience, /state\.myCircles\.status === 'ready'/);
  assert.match(experience, /communityEvents\.filter\(event => event\.status === 'CONFIRMED'/);
  assert.match(experience, /communityProjects\.filter\(project => project\.status === 'ACTIVE'/);
});

test('service opportunities are deliberate and do not imply award or compensation', () => {
  assert.match(experience, /Compensation:<\/span> Not specified by this Community opportunity/);
  assert.match(experience, /Expressing interest does not award the work or create an Agreement/);
  assert.match(gateway, /serviceOpportunities:[\s\S]*volunteer:/);
  assert.doesNotMatch(experience, /You won|Awarded to you|Guaranteed work/);
});

test('Community projects keep materials and funding separate from volunteer participation', () => {
  assert.match(experience, /This is not a request for money or materials/);
  assert.match(experience, /Materials, equipment and funding are organised separately/);
  assert.match(experience, /Community participation is about people, skills, labour, knowledge and presence/);
});

test('Apprenticeship Projects remain real work with Master authority and no fabricated sponsorship', () => {
  assert.match(experience, /Apprenticeship Project/);
  assert.match(experience, /Only a currently designated Master can create this/);
  assert.match(experience, /SecurePay has recorded the supervising Master identity/);
  assert.match(experience, /No sponsorship is established here/);
  assert.match(dto, /sponsorshipReference: string \| null/);
});

test('Circle cards and detail lead with purpose and human membership language', () => {
  assert.match(experience, /circle\.purpose/);
  assert.match(experience, /Join Circle/);
  assert.match(experience, /Ask to join/);
  assert.match(experience, /This Circle is invite-only/);
  assert.match(experience, /Open — anyone may join/);
  assert.match(experience, /Request to join/);
  assert.match(experience, /Invite only/);
});

test('multiple stewards and lifecycle authority remain intact', () => {
  assert.match(dto, /CircleStewardView/);
  assert.match(gateway, /stewards:[\s\S]*list:[\s\S]*appoint:[\s\S]*remove:/);
  assert.match(gateway, /setLifecycle: \(circleId: string, status: 'ACTIVE' \| 'QUIET' \| 'ARCHIVED'\)/);
  assert.match(experience, /This Circle is quiet right now/);
  assert.match(experience, /This Circle is archived\. Past activity is still available/);
});

test('Circle-only KS001 remains explicit and scoped', () => {
  assert.match(experience, /KS001 in this Circle/);
  assert.match(experience, /Ask KS001 in this Circle/);
  assert.match(experience, /this Circle's shared context/);
  assert.match(experience, /private conversations stay separate/);
  assert.match(experience, /KS001 cannot post, RSVP, commit anyone, create an Agreement, or move money/);
});

test('Circle content is fetched only through Circle-scoped authority for active members', () => {
  assert.match(controller, /circleObjects: RemoteState<CommunityObjectResponse\[]>/);
  assert.match(controller, /private content is never requested/);
  assert.match(gateway, /circles:[\s\S]*objects:[\s\S]*list:/);
  assert.match(circleBoard, /Neither source grants Agreement\s*or Money authority/);
});

test('Community search and Circle discovery explicitly avoid ranking', () => {
  assert.match(experience, /never ranked, never a "recommended for you."/);
  const forbidden = /follower count|popularity score|leaderboard|engagement streak|trending score/i;
  assert.doesNotMatch(experience, forbidden);
  assert.doesNotMatch(controller, forbidden);
});

test('Community to Store and trade remain deliberate authority handoffs', () => {
  assert.match(objectDetail, /Store-owned offer|Store Offer|onViewOffer/);
  assert.match(experience, /prepareProject\(item\.id,'STORE'\)/);
  assert.match(experience, /Nothing has been booked or paid for/);
  assert.match(experience, /Nothing was created or committed yet/);
});

test('knowledge stays candidate-first and moderation stays available', () => {
  assert.match(gateway, /knowledge:[\s\S]*capture:[\s\S]*submit:/);
  assert.match(experience, /Knowledge review candidate/);
  assert.match(experience, /not approved SecurePay knowledge/);
  assert.match(gateway, /moderation:[\s\S]*report:/);
  assert.match(experience, /Report this Community post/);
});

test('Community Saver cannot bypass the required Plug layer', async () => {
  const saverGate = await readFile('tests/community-saver-plug-gate.test.mjs', 'utf8');
  assert.match(saverGate, /Plug/i);
  assert.doesNotMatch(experience, /autoApproveCommunitySaver|executeCommunitySaver|bypassPlug/);
});

test('mobile navigation and participation actions retain touch-sized controls', () => {
  assert.match(experience, /overflow-x-auto/);
  assert.match(experience, /min-h-11/);
  assert.match(experience, /aria-label="Community sections"/);
});
