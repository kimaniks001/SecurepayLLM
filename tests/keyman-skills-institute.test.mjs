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


test('AI indexing enriches tags without replacing the source material', () => {
  assert.match(teach, /Suggest tags with AI/);
  assert.match(teach, /without changing your original material/);
  assert.match(gateway, /aiIndexAsset/);
  assert.match(gateway, /\/ai-index/);
});


const projectsExperience = fs.readFileSync(new URL('../src/features/projects/ProjectsExperience.tsx', import.meta.url), 'utf8');

test('Projects can open one reusable Institute Knowledge Space', () => {
  assert.match(gateway, /mySpaces/);
  assert.match(gateway, /project-spaces\/community/);
  assert.match(gateway, /project-spaces\/securepay/);
  assert.match(teach, /Your Knowledge Spaces/);
  assert.match(teach, /Return to knowledge you are building personally, as a verified Master, or from a real Project/);
  assert.match(communityProjectLearning, /Create Project Knowledge Space/);
  assert.match(projectsExperience, /Create Project Knowledge Space/);
  assert.match(projectsExperience, /Private\/Internal only/);
});


const publicInstitute = fs.readFileSync(new URL('../src/features/institute/PublicInstituteExperience.tsx', import.meta.url), 'utf8');
const publicNav = fs.readFileSync(new URL('../src/features/public/PublicNav.tsx', import.meta.url), 'utf8');

test('Project learning preserves granular structured context for future dreamers', () => {
  const panel = fs.readFileSync(new URL('../src/features/community/CommunityProjectLearningPanel.tsx', import.meta.url), 'utf8');
  assert.match(panel, /project_stage/);
  assert.match(panel, /source_supplier/);
  assert.match(panel, /disposal_method/);
  assert.match(panel, /destination/);
  assert.match(panel, /Quoted/);
  assert.match(panel, /Actual \/ happened/);
  assert.match(gateway, /attributes\?: Record<string, string>/);
});

test('public Institute is useful before sign-in and keeps personal AI learning authenticated', () => {
  assert.doesNotMatch(publicNav, />Institute</); // signed-out nav stays intentionally minimal; public Institute is reached through the public experience doorway.
  assert.match(publicInstitute, /Learn from what people have actually done/);
  assert.match(publicInstitute, /Search knowledge/);
  assert.match(publicInstitute, /Public programmes/);
  assert.match(publicInstitute, /Talks, workshops, podcasts and sessions/);
  assert.match(publicInstitute, /Build a personal learning path/);
  assert.match(publicInstitute, /Sign in is only needed for personalised learning, participation and teaching/);
  assert.match(gateway, /publicSearch/);
  assert.match(gateway, /publicPrograms/);
  assert.match(gateway, /publicSessions/);
  assert.match(gateway, /learn[\s\S]*auth: 'required'/);
});
