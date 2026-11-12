import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const bundle=await build({stdin:{contents:[
  "export * from './src/mini/miniInteractiveDemo';",
  "export * from './src/mini/miniAgreementSlots.mjs';",
  "export * from './src/mini/miniAgreementHome.mjs';",
  "export * from './src/mini/miniSavedWorkFlow.mjs';",
  "export * from './src/api/securepay/agent/continuity';",
  "export * from './src/api/securepay/agent';",
  "export * from './src/api/securepay/agreements';",
  "export * from './src/features/recipient/controller';",
  "export * from './src/features/agent/controller';",
].join('\n'),resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const api=await import('data:text/javascript;base64,'+
  Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const chairs='00000000-0000-4000-8000-000000000041';
const agreementId='00000000-0000-4000-8000-000000000071';
const invitationId='00000000-0000-4000-8000-000000000073';
const versionId='00000000-0000-4000-8000-000000000072';
let actor='amina';
let http,agents,agreements;
function start(){
  api.miniDemoReset();
  actor='amina';
  http=api.createMiniDemoHttpClient(()=>api.miniDemoTokens(actor).accessToken);
  const access=api.createConversationAccessStore(null);
  api.miniDemoSeedAccess(access);
  agents=api.createAgentGateway(http,access);
  agreements=api.createAgreementGateway(http);
}
test('Preview host gate rejects official domains and all generic deployment hosts',()=>{
  assert.equal(api.isMiniExperiencePreviewHost('securepay.ke'),false);
  assert.equal(api.isMiniExperiencePreviewHost('staging.securepay.ke'),false);
  assert.equal(api.isMiniExperiencePreviewHost('securepay-llm.vercel.app'),false);
  assert.equal(api.isMiniExperiencePreviewHost('securepay-f2zgzngj2-james-8078.vercel.app'),true);
  assert.equal(api.isMiniExperiencePreviewHost('localhost'),true);
});
test('M1: opening demo uses canonical AgentController and restores 4 saved sample messages',async()=>{
  start();
  assert.equal(agents.resumableConversationId(),chairs);
  const ctrl=api.createAgentController(agents);
  await ctrl.resumeConversation(chairs);
  const snapshot=ctrl.getSnapshot();
  assert.equal(snapshot.context.status,'ready');
  assert.equal(snapshot.turns.length,4);
  assert.match(snapshot.turns[3].response.message.text,/25 remain/);
});
test('M1: sending a message uses the same AgentController, local synthetic reply, no duplicate on same turn id',async()=>{
  start();
  const ctrl=api.createAgentController(agents);
  await ctrl.resumeConversation(chairs);
  await ctrl.send('Who can deliver to Ruiru?');
  assert.equal(ctrl.getSnapshot().pending,null);
  assert.equal(ctrl.getSnapshot().turns.length,6);
  assert.match(ctrl.getSnapshot().turns[5].response.message.text,/Sample reply:/);
  const repeat=await agents.submitTurn(chairs,{message:'Who can deliver to Ruiru?',clientTurnId:'same-turn'});
  const second=await agents.submitTurn(chairs,{message:'Who can deliver to Ruiru?',clientTurnId:'same-turn'});
  assert.equal(repeat.replyId,second.replyId);
  const hist=await agents.conversationHistory(chairs);
  assert.equal(hist.entries.length,8);
});
test('M2: current mini Agreement component sees canonical what/who/money/when/duties',async()=>{
  start();
  const formed=await agents.readAgreementFormation(chairs,'Africa/Nairobi');
  const slots=api.miniAgreementSlots(formed);
  assert.ok(slots);
  assert.deepEqual(slots.sections.map(x=>x.id),
    ['purpose','people','money','dates','duties']);
  assert.equal(slots.unresolved.length,3);
  assert.equal(slots.accepted,false);
  assert.equal(slots.moneyMoved,false);
  assert.match(slots.sections.find(x=>x.id==='dates').items[0].value,/2 December/);
});
test('M3: Save/Continue calls real gateway functions over local fixture and resumes original dialogue',async()=>{
  start();
  const saved=await api.miniSaveServerBuild(agents,chairs);
  const list=await api.miniListServerBuilds(agents);
  assert.equal(list.length,1);
  assert.equal(list[0].conversationId,chairs);
  assert.equal(saved.savedBuildId,list[0].savedBuildId);
  const ctrl=api.createAgentController(agents);
  const resumed=await api.miniResumeServerBuild(agents,ctrl,saved.savedBuildId);
  assert.equal(resumed,chairs);
  assert.equal(ctrl.getSnapshot().turns.length,4);
});
test('M4: Amina has her actual actor-specific synthetic Agreement and next action',async()=>{
  start();
  const page=api.miniAgreementHomePage(await agreements.currentUserAgreements(0,20));
  assert.ok(page);
  assert.equal(page.items.length,1);
  assert.equal(page.items[0].attentionRequired,true);
  assert.match(page.items[0].actions[0].reason,/Njeri has not confirmed/);
  const details=api.miniAgreementDetailView(await agreements.detail(agreementId),
    agreementId,versionId);
  assert.equal(details.milestones.length,1);
  assert.equal(details.moneyStatus,'NOT_FUNDED');
  assert.equal(details.participants[1].status,'INVITED');
});
test('M3B: Njeri can review and join but only a second action records confirmation',async()=>{
  start();actor='njeri';
  const items=await agreements.myInvitations(0,20);
  assert.equal(items.items.length,1);
  assert.equal(items.items[0].invitationId,invitationId);
  const recipient=api.createRecipientController(agreements,
    {invitationId},()=> '00000000-0000-4000-8000-000000000092');
  await recipient.load();
  assert.equal(recipient.getSnapshot().phase,'invitation-ready');
  recipient.proceed(true);
  assert.equal(recipient.getSnapshot().phase,'join-prompt');
  await recipient.join();
  assert.equal(recipient.getSnapshot().phase,'version-ready');
  const pending=api.miniAgreementHomePage(await agreements.currentUserAgreements(0,20));
  assert.equal(pending.items[0].participantStatus,'JOINED_UNCONFIRMED');
  await recipient.confirm();
  assert.equal(recipient.getSnapshot().phase,'confirmed');
  const own=api.miniAgreementHomePage(await agreements.currentUserAgreements(0,20));
  assert.equal(own.items[0].participantStatus,'CONFIRMED');
});
test('Amina sees changed next action after a sample recipient confirms',async()=>{
  start();actor='njeri';
  const recipient=api.createRecipientController(agreements,{invitationId},
    ()=> '00000000-0000-4000-8000-000000000093');
  await recipient.load();recipient.proceed(true);await recipient.join();await recipient.confirm();
  actor='amina';
  const item=api.miniAgreementHomePage(await agreements.currentUserAgreements(0,20)).items[0];
  assert.equal(item.attentionRequired,false);
  assert.equal(item.statusCode,'ACTIVE');
});
test('Owner privacy: recipient cannot read the creator draft or invite another person',async()=>{
  start();actor='njeri';
  await assert.rejects(()=>agents.conversationHistory(chairs),/another account/);
  await assert.rejects(()=>agreements.issueInvitation(agreementId,{
    idempotencyKey:'test',roleCode:'SELLER',intendedKsNumber:'KS002'}),/creator/);
  await assert.rejects(()=>agreements.detail(agreementId),/participant/);
});
test('Synthetic-only adapter refuses all unknown or financial endpoints',async()=>{
  start();
  await assert.rejects(()=>http.request('/api/v1/payments/disburse',{
    method:'POST',auth:'required',body:{amount:100000}}),/not simulated/);
  await assert.rejects(()=>http.request('/api/v1/agreements/'+agreementId+'/release-funds',{
    method:'POST',auth:'required'}),/not simulated/);
  assert.doesNotMatch(read('src/mini/miniInteractiveDemo.ts'),/\bfetch\(/);
});
test('Approved Mini UI remains one shell; demo CTA is clear, gated and interactive',()=>{
  const mini=read('src/mini/MiniExperience.tsx');
  const first=read('src/mini/MiniFirstPartyKs001.tsx');
  assert.match(mini,/Explore M1–M4/);
  assert.match(mini,/isMiniExperiencePreviewHost\(window\.location\.hostname\)/);
  assert.match(mini,/samplePreviewOpen && samplePreviewAllowed/);
  assert.match(mini,/MiniFirstPartyKs001 apiOrigin="synthetic-local-only" demo/);
  assert.match(first,/createMiniDemoHttpClient/);
  assert.match(first,/createAgentGateway\(http,demoAccess\)/);
  assert.match(first,/MiniAgreementSlots formation=\{review\}/);
  assert.match(first,/MiniMyAgreements gateway=\{agreements\}/);
  assert.match(first,/MiniParticipantInvitations gateway=\{agreements\}/);
  assert.match(first,/MiniCreatorInvitations gateway=\{agreements\}/);
  assert.match(first,/SYNTHETIC DATA/);
  assert.match(first,/No requests reach SecurePayAPI/);
  assert.match(first,/changeDemoPersona/);
});
