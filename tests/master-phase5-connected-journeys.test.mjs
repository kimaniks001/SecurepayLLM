import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const bundle=await build({entryPoints:['src/features/living-workspace/circleWorkAuthority.ts'],
  bundle:true,platform:'node',format:'esm',write:false});
const {verifyCircleWorkProposal}=await import('data:text/javascript;base64,'+
  Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const proposal={
  circleId:'circle-one',objectId:'note-one',
  title:'Review proposed water tank location',
  body:'Explore a water tank near the school; not approved.',
  kind:'QUESTION',
};
function fixture({membership='ACTIVE',steward=true,status='ACTIVE',objectStatus='ACTIVE',
  differentCircle=false,differentBody=false}={}){
  const calls=[];
  const community={circles:{
    get:async id=>{calls.push('circle');return{id,status,name:'Water Project Circle'};},
    membership:async()=>{calls.push('member');return{status:membership,isOwner:false,isSteward:steward};},
    objects:{list:async()=>{calls.push('objects');return [{
      id:proposal.objectId,circleId:differentCircle?'circle-other':'circle-one',
      title:proposal.title,body:differentBody?'Unapproved new text':proposal.body,
      objectType:'QUESTION',status:objectStatus,
    }];}},
  }};
  return {calls,community};
}
test('steward carries one provenance-labelled proposed question, never a vote or accepted Agreement',async()=>{
  const {community,calls}=fixture();
  const reviewed=await verifyCircleWorkProposal(proposal,community);
  assert.deepEqual(calls,['circle','member','objects']);
  assert.match(reviewed,/Water Project Circle/);
  assert.match(reviewed,/NOT a group decision, consent, accepted Agreement or funding authorisation/);
  assert.match(reviewed,/not approved/);
});
test('revoked Circle membership, lack of stewardship and stale source fail closed',async()=>{
  for(const options of [
    {membership:'REMOVED'}, {membership:'INVITED'}, {steward:false},
    {status:'QUIET'}, {differentCircle:true}, {differentBody:true}, {objectStatus:'REMOVED'},
  ]){
    const {community}=fixture(options);
    await assert.rejects(verifyCircleWorkProposal(proposal,community));
  }
});
test('long Circle material cannot overflow the KS001 reviewed-draft limit',async()=>{
  const long={...proposal,body:'x'.repeat(1300)};
  const {community}=fixture({differentBody:true});
  // Even a source that matched the long text must respect the composer bound.
  community.circles.objects.list=async()=>[{
    id:long.objectId,circleId:long.circleId,title:long.title,body:long.body,
    objectType:long.kind,status:'ACTIVE',
  }];
  await assert.rejects(verifyCircleWorkProposal(long,community),/too long/);
});
test('human workspace uses one canonical KS001 agent and no automatic send for either handoff',()=>{
 const src=readFileSync('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx','utf8');
 assert.match(src,/prepareDreamHandoff\(liveController,handoff\)/);
 assert.match(src,/writeDraft\(created\.conversationId,text\)/);
 assert.match(src,/authorisedResumedConversation\(created\.conversationId,opened\)/);
 assert.match(src,/onContinueToWork=\{continueCircleToWork\}/);
 assert.match(src,/onContinueToWork=\{continueVisionToWork\}/);
});
test('workspace uses existing Dream and Circle create contracts without inventing membership',()=>{
 const d=readFileSync('src/features/living-workspace/VisionCreatePanel.tsx','utf8');
 const c=readFileSync('src/features/living-workspace/CircleCreatePanel.tsx','utf8');
 const i=readFileSync('src/features/living-workspace/CircleInvitePanel.tsx','utf8');
 assert.match(d,/createVisionDreamController\(gateways\.dreams, gateways\.agent\)/);
 assert.match(d,/controller\.reconcilePending\(\)/);
 assert.match(c,/membership\.status!=='ACTIVE'/);
 assert.match(c,/gateways\.community\.circles\.create/);
 assert.match(i,/member\.isSteward\|\|member\.isOwner/);
 assert.match(i,/gateways\.community\.circles\.invite/);
});
test('Vision store option reads authoritative detailed offer and cannot claim booking or quote',()=>{
 const s=readFileSync('src/features/living-workspace/VisionStorePicker.tsx','utf8');
 const builder=readFileSync('src/features/visionboard/dreams/DreamBuilder.tsx','utf8');
 assert.match(s,/stores\.offer\(item\.canonicalKsNumber,item\.offer\.id\)/);
 assert.match(s,/Indicative listed price/);
 assert.match(s,/NOT an accepted quotation, order or Agreement/);
 assert.match(s,/onAdd\(proposal\)/);
 assert.match(builder,/storeGateway && exploration>1/);
 assert.match(builder,/Proposed milestone date/);
 assert.match(builder,/groupSelected/);
 assert.match(builder,/Ungroup \(keep items\)/);
});
