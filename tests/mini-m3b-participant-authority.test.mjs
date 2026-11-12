import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const b=await build({stdin:{contents:[
  "export * from './src/features/recipient/controller';",
  "export * from './src/features/invitations/controller';",
  "export * from './src/features/invitation-inbox/controller';",
  "export * from './src/api/securepay/http';",
].join('\n'),resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const api=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const invitationId=uuid(30),agreementId=uuid(41),versionId=uuid(42);
const now='2026-11-12T12:00:00Z',future='2099-12-31T00:00:00Z';
const preview=()=>({
  publicReference:'AGR-001',title:'40 chairs for Varsityville',purpose:'Chairs delivered in Ruiru',
  intendedRole:'SELLER',currency:'KES',proposedAmountMinor:400000,
  invitationExpiresAt:future,proposalVersionNumber:2,isCurrentVersion:true,
  inviterDisplayName:'Amina',inviterCanonicalKsNumber:'KS001',
  notice:'Review only',targetKind:'KS_NUMBER',targetHint:'KS002',
});
const joined=()=>({agreementId,publicReference:'AGR-001',participantId:uuid(43),
  role:'SELLER',participantStatus:'JOINED_UNCONFIRMED',joinedVersionId:versionId,
  joinedVersionNumber:2,confirmationRequired:true,joinedAt:now,notice:'Joined, not agreed'});
const version=()=>({id:versionId,versionNumber:2,
  snapshot:{title:'40 chairs for Varsityville',purpose:'Chairs delivered in Ruiru',
    currency:'KES',proposed_amount_minor:400000},
  contentHash:'real-hash-2',parentVersionId:null,amendmentReason:null,
  materialChange:false,versionStatus:'CURRENT',createdAt:now});
const confirmation=()=>({id:uuid(44),agreementVersionId:versionId,
  participantId:uuid(43),versionNumber:2,versionContentHash:'real-hash-2',
  status:'CONFIRMED',assuranceMethod:'AUTHENTICATED_SESSION',
  confirmedAt:now,confirmationCurrent:true,reconfirmationRequired:false});
function recipient(overrides={}){
  const calls=[];let key=0;
  const g={
    viewMyInvitation:async(id)=>{calls.push(['view',id]);return preview();},
    joinMyInvitation:async(id,requestId)=>{calls.push(['join',id,requestId]);return joined();},
    versions:async(id)=>{calls.push(['versions',id]);return [version()];},
    version:async(id,v)=>{calls.push(['version',id,v]);return version();},
    participants:async(id)=>{calls.push(['participants',id]);return [];},
    confirmVersion:async(id,v,body)=>{calls.push(['confirm',id,v,body]);return confirmation();},
    ...overrides,
  };
  return {calls,controller:api.createRecipientController(g,{invitationId},()=> 'recipient-key-'+(++key))};
}
test('M3B inbox is scoped to authenticated caller and only reads invitations',async()=>{
  const calls=[];
  const c=api.createInvitationInboxController({myInvitations:async(page,size)=>{
    calls.push([page,size]);
    return {items:[{invitationId,agreementId,agreementTitle:'40 chairs',roleCode:'SELLER',
      status:'ISSUED',isCurrentVersion:true,needsAttention:true}],
      totalElements:1,page:0,size:20};
  }});
  await c.load();
  assert.deepEqual(calls,[[0,20]]);
  assert.equal(c.getSnapshot().status,'ready');
  assert.equal(c.getSnapshot().items.length,1);
});
test('M3B invitation read alone never calls Join or Agree',async()=>{
  const {controller,calls}=recipient();
  await controller.load();
  assert.equal(controller.getSnapshot().phase,'invitation-ready');
  assert.deepEqual(calls,[['view',invitationId]]);
});
test('M3B Join is separate from read, confirmation is separate from Join',async()=>{
  const {controller,calls}=recipient();
  await controller.load();controller.proceed(true);
  assert.equal(controller.getSnapshot().phase,'join-prompt');
  assert.equal(calls.filter(x=>x[0]==='join').length,0);
  await controller.join();
  assert.equal(controller.getSnapshot().phase,'version-ready');
  assert.equal(calls.filter(x=>x[0]==='confirm').length,0);
  assert.equal(controller.getSnapshot().version.contentHash,'real-hash-2');
  await controller.confirm();
  assert.equal(controller.getSnapshot().phase,'confirmed');
  assert.equal(calls.filter(x=>x[0]==='join').length,1);
  assert.equal(calls.filter(x=>x[0]==='confirm').length,1);
  const body=calls.find(x=>x[0]==='confirm')[3];
  assert.equal(body.expectedVersionNumber,2);
  assert.equal(body.expectedContentHash,'real-hash-2');
});
test('M3B wrong identity is forbidden and never becomes a participant',async()=>{
  const {controller,calls}=recipient({joinMyInvitation:async()=>{
    throw new api.ApiError('http','Forbidden',403);
  }});
  await controller.load();controller.proceed(true);await controller.join();
  assert.equal(controller.getSnapshot().phase,'identity-required');
  assert.equal(controller.getSnapshot().join,null);
  assert.equal(calls.some(x=>x[0]==='confirm'),false);
});
test('M3B uncertain Join reuses the identical idempotency key',async()=>{
  const calls=[];let first=true;
  const {controller}=recipient({joinMyInvitation:async(id,key)=>{
    calls.push(key);
    if(first){first=false;throw new api.ApiError('timeout','Timeout');}
    return joined();
  }});
  await controller.load();controller.proceed(true);await controller.join();
  assert.equal(controller.getSnapshot().phase,'join-uncertain');
  await controller.join();
  assert.deepEqual(calls,['recipient-key-1','recipient-key-1']);
  assert.equal(controller.getSnapshot().phase,'version-ready');
});
test('M3B an ambiguous or stale version never gets auto-confirmed',async()=>{
  const calls=[];
  const {controller}=recipient({
    versions:async()=>[{...version(),versionStatus:'SUPERSEDED'}],
    version:async()=>({...version(),versionStatus:'SUPERSEDED'}),
    confirmVersion:async()=>{calls.push('confirm');return confirmation();}
  });
  await controller.load();controller.proceed(true);await controller.join();
  assert.notEqual(controller.getSnapshot().phase,'version-ready');
  await controller.confirm();
  assert.deepEqual(calls,[]);
});
test('M3B creator cannot issue a KS invite until SecurePay verifies the target',async()=>{
  let issued=0,checked=0;
  const c=api.createInviteController({
    propose:async()=>({id:agreementId,status:'PROPOSED'}),
    invitations:async()=>[],
    revokeInvitation:async()=>({}),
    lookupInvitationTargetByKsNumber:async(id,ks)=>{
      checked++;assert.equal(ks,'KS002');
      return {identityId:uuid(55),displayName:'Njeri',canonicalKsNumber:'KS002'};
    },
    issueInvitation:async()=>{issued++;return {invitationId,status:'ISSUED',
      invitationToken:'one-time',replayed:false,targetKind:'KS_NUMBER',targetHint:'KS002'};},
  },agreementId,'https://staging.securepay.ke',()=>{},()=> 'invite-key');
  c.open();c.setRole(api.INVITE_ROLES[0].code);c.setKs('KS002');
  await c.issue();
  assert.equal(issued,0);
  await c.checkKs();assert.equal(checked,1);
  assert.equal(c.getSnapshot().ksPreview.status,'found');
  await c.issue();
  assert.equal(issued,1);
  assert.equal(c.getSnapshot().phase,'issued');
  assert.ok(c.getSnapshot().issued.link.includes('/#/invitation/'));
});
test('M3B changing the KSNumber invalidates earlier preview and blocks invitation',async()=>{
  let issued=0;
  const c=api.createInviteController({
    propose:async()=>({id:agreementId,status:'PROPOSED'}),invitations:async()=>[],
    revokeInvitation:async()=>({}),lookupInvitationTargetByKsNumber:async()=>({
      identityId:uuid(55),displayName:'Njeri',canonicalKsNumber:'KS002'}),
    issueInvitation:async()=>{issued++;return {invitationId,status:'ISSUED',
      invitationToken:'x',replayed:false,targetKind:'KS_NUMBER',targetHint:'KS003'};},
  },agreementId,'https://staging.securepay.ke');
  c.open();c.setRole(api.INVITE_ROLES[0].code);c.setKs('KS002');
  await c.checkKs();
  c.setKs('KS003');
  await c.issue();
  assert.equal(issued,0);
  assert.equal(c.getSnapshot().ksPreview.status,'idle');
});
test('M3B invitation never claims acceptance, and Invite stays on server-owned Agreement',()=>{
  const creator=read('src/mini/MiniCreatorInvitations.tsx');
  const recipientUI=read('src/mini/MiniParticipantInvitations.tsx');
  const root=read('src/mini/MiniFirstPartyKs001.tsx');
  assert.match(creator,/createInviteController/);
  assert.match(creator,/currentUserAgreements\(0,20\)/);
  assert.match(creator,/controller\.checkKs\(\)/);
  assert.match(creator,/controller\.issue\(\)/);
  assert.match(recipientUI,/createRecipientController/);
  assert.match(recipientUI,/recipient\.proceed\(true\)/);
  assert.match(recipientUI,/recipient\.join\(\)/);
  assert.match(recipientUI,/recipient\.confirm\(\)/);
  assert.match(recipientUI,/No change request has been sent/);
  assert.match(root,/createSessionStore/);
  assert.match(root,/getMiniFirstPartyOrigin|first-party/);
  assert.doesNotMatch(creator+recipientUI,/releaseFunds|createPaymentIntent|autoConfirm|autoJoin|setRole\(\'CREATOR\'\)/);
});
test('M3B source ensures sign-in alone is never a Join or confirmation',()=>{
  const recipientUI=read('src/mini/MiniParticipantInvitations.tsx');
  assert.doesNotMatch(recipientUI,/useEffect\([^\n]*recipient\.join/);
  assert.doesNotMatch(recipientUI,/useEffect\([^\n]*recipient\.confirm/);
  assert.match(recipientUI,/Signing in does not join or confirm the Agreement/);
  assert.match(recipientUI,/No money has moved/);
});
