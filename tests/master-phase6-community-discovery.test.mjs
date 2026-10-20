import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const out=await build({
  entryPoints:['src/features/living-workspace/communityDiscovery.ts'],
  platform:'node',bundle:true,format:'esm',write:false,
});
const api=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
const hub=readFileSync('src/features/living-workspace/InlineCommunityHub.tsx','utf8');
const preview=readFileSync('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx','utf8');
const experience=readFileSync('src/features/community/CommunityExperience.tsx','utf8');

test('LIVE excludes private Circle material and removed posts even if a combined gateway responds with both',()=>{
  const rows=[
    {id:'private',circleId:'secret-circle',status:'ACTIVE'},
    {id:'deleted',circleId:null,status:'REMOVED'},
    {id:'public',circleId:null,status:'ACTIVE'},
  ];
  assert.deepEqual(api.communityLiveOnly(rows).map(r=>r.id),['public']);
});
test('Projects, activities, apprenticeships and events exclude Circle-only rows and nonparticipating states',()=>{
  const sample=[
    {id:'one',circleId:null,status:'ACTIVE'},
    {id:'two',circleId:'private-circle',status:'ACTIVE'},
    {id:'three',circleId:null,status:'CANCELLED'},
    {id:'four',circleId:null,status:'COMPLETED'},
  ];
  assert.deepEqual(api.communityVisibleProjects(sample).map(r=>r.id),['one','four']);
  assert.deepEqual(api.communityApprenticeships(sample).map(r=>r.id),['one']);
  assert.deepEqual(api.communityOpenOpportunities([...sample,{id:'open',circleId:null,status:'OPEN'}]).map(r=>r.id),['open']);
  assert.deepEqual(api.communityPublicEvents([...sample,{id:'event',circleId:null,status:'CONFIRMED'}]).map(r=>r.id),['event']);
});
test('Circles require PUBLIC discovery and ACTIVE lifecycle; private invitations stay separate',()=>{
  const circles=[
    {id:'private',visibility:'PRIVATE',status:'ACTIVE'},
    {id:'quiet',visibility:'PUBLIC',status:'QUIET'},
    {id:'public',visibility:'PUBLIC',status:'ACTIVE'},
  ];
  assert.deepEqual(api.discoverableCircles(circles).map(c=>c.id),['public']);
  const invites=[{circleId:'private',circleName:'Private project'},{circleId:'',circleName:''}];
  assert.deepEqual(api.invitedCircleCards(invites),[invites[0]]);
});
test('Discovery is factual, not a popularity score or profile inference',()=>{
  assert.equal(api.matchesCommunityText('water','Water project','Kisumu'),true);
  assert.equal(api.matchesCommunityText('plumbing','Water project','Kisumu'),false);
  assert.equal(api.matchesCommunityText('','Anything'),true);
  assert.doesNotMatch(hub,/leaderboard|reputation score|trending score|autoEnroll/i);
});
test('No membership implies no member-content API queries and a real Join pathway',()=>{
  assert.match(hub,/membership\.value\?\.status==='ACTIVE'/);
  assert.match(hub,/if\(!active \|\| !gateways\)return;/);
  assert.match(hub,/gateways\.community\.membership\.me\(\)/);
  assert.match(hub,/window\.location\.hash='#\/join'/);
  assert.match(hub,/membership\.value\?\.status==='REVOKED'/);
  assert.doesNotMatch(hub,/membership\.join\(|membership\.accept\(|membership\.invite\(/);
});
test('All Community spaces reuse existing API instead of synthetic cards',()=>{
  for(const path of [
    'gateway.community.feed','gateway.community.projects.list',
    'gateway.community.serviceOpportunities.list','gateway.community.events.list',
    'gateway.community.apprenticeships.list','gateway.community.circles.discover',
  ])assert.match(hub,new RegExp(path.replaceAll('.','\\.').replace('gateway','gateways')));
  assert.match(hub,/gateways\.community\.circles\.myInvitations/);
  assert.doesNotMatch(hub,/mockFeed|fakeMembers|localStorage\.setItem/);
});
test('Personal invitations route through canonical Community controller, not a second join engine',()=>{
  assert.match(hub,/onOpenCircle\?:\(circleId:string\)=>void/);
  assert.match(preview,/storeCircleEntry\(circleId\)/);
  assert.match(preview,/window\.location\.hash='#\/community'/);
  assert.match(experience,/Circle detail/);
});
test('Capability, knowledge and moderation actions remain in the approved Community with no simulated grants',()=>{
  assert.match(hub,/Open Community participation/);
  assert.match(hub,/Training does not automatically grant certification/);
  assert.match(hub,/Unreviewed contributions never become official KS001 knowledge/);
  assert.match(experience,/Report this Community post/);
  assert.doesNotMatch(hub,/automatically authorise|guaranteed work|funds reserved|membership confirmed by sign-in/i);
});
test('Approved Living Workspace and Agreement architecture remains in place',()=>{
  assert.match(preview,/data-workspace-frozen-layout/);
  assert.match(preview,/LiveKs001Session controller=\{liveController!\}/);
  assert.match(preview,/LiveWorkResultPanel/);
  assert.match(preview,/InlineCommunityHub gateways=\{workspaceGateways\}/);
});

test('selected LIVE stories use an ID-only, real-authority detail and conversation handoff',()=>{
  const entry=readFileSync('src/features/experience/entryIntent.ts','utf8');
  const agent=readFileSync('src/features/agent/AgentExperience.tsx','utf8');
  assert.match(hub,/onOpenObject\?:\(objectId:string\)=>void/);
  assert.match(hub,/actionLabel="Read & respond"/);
  assert.match(preview,/storeCommunityObjectEntry\(objectId\)/);
  assert.match(entry,/pendingCommunityObjectId/);
  assert.match(entry,/consumeCommunityObjectEntry/);
  assert.match(agent,/initialObjectId=\{externalCommunityObjectId\}/);
  assert.match(experience,/controller\.openObject\(objectId\)/);
  // A hint conveys no body, author, member role, or Agreement permission.
  assert.doesNotMatch(entry,/pendingCommunityObjectBody|pendingCommunityObjectAuthor/);
});
