import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const institute = fs.readFileSync(new URL('../src/features/institute/InstituteExperience.tsx', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/institute/index.ts', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../src/components/NavBar.tsx', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
const agent = fs.readFileSync(new URL('../src/features/agent/AgentExperience.tsx', import.meta.url), 'utf8');

test('Institute is a first-class SecurePay destination rather than a training settings panel', () => {
  assert.match(nav, /label: 'Institute'/);
  assert.match(nav, /view: 'institute'/);
  assert.match(runtime, /instituteGateway/);
  assert.match(agent, /<InstituteExperience/);
});

test('Institute starts from the learner question and keeps source evidence visible', () => {
  assert.match(institute, /What do you want to learn, understand or become capable of\?/);
  assert.match(institute, /Build my learning path/);
  assert.match(institute, /Sources touching this question/);
  assert.match(institute, /The original sources remain underneath it/);
  assert.match(institute, /Not a fixed course catalogue/);
});

test('source classes remain distinguishable instead of becoming one AI truth', () => {
  assert.match(institute, /Governed knowledge/);
  assert.match(institute, /Community experience/);
  assert.match(institute, /Reported Project observation/);
  assert.match(institute, /Project-verified observation/);
  assert.match(institute, /Disputed Project observation/);
});

test('UI gateway uses public browse separately from authenticated AI learning', () => {
  assert.match(gateway, /\/api\/v1\/institute\/public\/search/);
  assert.match(gateway, /\/api\/v1\/institute\/learn/);
  assert.match(gateway, /auth: 'required'/);
});


const teach = fs.readFileSync(new URL('../src/features/institute/InstituteTeachStudio.tsx', import.meta.url), 'utf8');
const myLearning = fs.readFileSync(new URL('../src/features/institute/InstituteMyLearning.tsx', import.meta.url), 'utf8');
const masterSupport = fs.readFileSync(new URL('../src/features/institute/InstituteMasterSupport.tsx', import.meta.url), 'utf8');
const liveLearning = fs.readFileSync(new URL('../src/features/institute/InstituteLiveLearning.tsx', import.meta.url), 'utf8');
const sessionStudio = fs.readFileSync(new URL('../src/features/institute/InstituteSessionStudio.tsx', import.meta.url), 'utf8');

test('Institute has Learn, My Learning, Teach and Master Support as one SecurePay workspace', () => {
  for (const label of ['Learn', 'My Learning', 'Teach', 'Master Support']) assert.match(institute, new RegExp(label));
  assert.match(institute, /<InstituteMyLearning/);
  assert.match(institute, /<InstituteTeachStudio/);
  assert.match(institute, /<InstituteMasterSupport/);
});

test('learning completion is evidence-aware rather than attendance-as-qualification', () => {
  assert.match(myLearning, /Evidence submitted for review/);
  assert.match(myLearning, /does not silently turn attendance into capability/);
  assert.match(gateway, /completeLearningStep/);
  assert.match(gateway, /submitLearningEvidence/);
  assert.match(gateway, /completeParticipation/);
});

test('Master support states bounded responsibility and still requires an Agreement', () => {
  assert.match(masterSupport, /responsibility begins only through an Agreement/);
  assert.match(masterSupport, /not insurance or blanket liability cover/);
  assert.match(gateway, /master-backing\/public/);
  assert.match(gateway, /publishMasterBacking/);
});

test('live knowledge supports talks podcasts workshops mentoring and paid Store packaging', () => {
  assert.match(liveLearning, /Talks, workshops, podcasts and sessions/);
  assert.match(sessionStudio, /Live podcast/);
  assert.match(sessionStudio, /Workshop/);
  assert.match(sessionStudio, /Mentoring/);
  assert.match(sessionStudio, /Publish Store offer \+ schedule session/);
  assert.match(gateway, /sessions\/paid-package/);
});

test('teaching can propose learning for governed review without self-approving truth', () => {
  assert.match(teach, /InstituteKnowledgeProposal/);
  assert.match(gateway, /knowledge-candidates/);
});

test('Skills Institute is the product-facing name', () => {
  assert.doesNotMatch(institute, /Keyman Skills Institute/);
  assert.match(institute, /Skills Institute/);
});


const communityProjectLearning = fs.readFileSync(new URL('../src/features/community/CommunityProjectLearningPanel.tsx', import.meta.url), 'utf8');
const communityExperience = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');

test('Community Projects leave granular learning records for future dreamers', () => {
  for (const label of ['Cost','Material','Time','Waste / disposal','Safety','Logistics','Decision','Problem / issue','Correction','Outcome','Maintenance','Environment','Skill / capability']) {
    assert.ok(communityProjectLearning.includes(label), label);
  }
  assert.match(communityProjectLearning, /Reported observations remain distinguishable from Project-verified facts/);
  assert.match(communityProjectLearning, /Evidence reference/);
  assert.match(communityExperience, /<CommunityProjectLearningPanel/);
  assert.match(gateway, /recordProjectObservation/);
  assert.match(gateway, /reviewProjectObservation/);
});
