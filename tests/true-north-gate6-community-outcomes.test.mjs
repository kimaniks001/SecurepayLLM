import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const helper=src('src/features/living-workspace/projectOutcomeReport.ts');
const composer=src('src/features/living-workspace/ProjectOutcomeComposer.tsx');
const agreement=src('src/features/living-workspace/ActiveAgreementWorkspace.tsx');
const shell=src('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const hub=src('src/features/living-workspace/InlineCommunityHub.tsx');
const gateway=src('src/api/securepay/community/index.ts');
const js=ts.transpileModule(helper,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,
}}).outputText;
const {newPublicOutcome,outcomeChecks,publicOutcomeBody,projectIsPublic}=await import(
  'data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const agreementId='aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const project=(extra={})=>({
  id:'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbbb',circleId:null,agreementId,
  creatorIdentityId:'owner-1',status:'ACTIVE',title:'Rainwater tank project',
  purpose:'Restore water storage',locationLabel:'Ruiru',...extra,
});
const filled=(extra={})=>({
  ...newPublicOutcome(),projectId:project().id,
  title:'The rainwater tank is restored',
  workDone:'We repaired the damaged community water storage tank.',
  outcome:'The restored tank holds water, but gutters still need repair.',
  difficulties:'Rain interrupted two workdays.',
  lessons:'Check drainage before the next repairs.',
  nextOpportunity:'Neighbours may organise gutter repair.',
  costs:[{description:'Public materials category',amount:'1,234.50',stage:'INCURRED_REPORTED'},
         {description:'Delivery estimate',amount:'25.25',stage:'ESTIMATED'}],
  ...extra,
});

test('Gate 6: only public Community Projects can be selected and never an unrelated Agreement',()=>{
  assert.equal(projectIsPublic(project(),agreementId),true);
  assert.equal(projectIsPublic(project({agreementId:null}),agreementId),true);
  assert.equal(projectIsPublic(project({circleId:'private'}),agreementId),false);
  assert.equal(projectIsPublic(project({status:'DRAFT'}),agreementId),false);
  assert.equal(projectIsPublic(project({status:'CANCELLED'}),agreementId),false);
  assert.equal(projectIsPublic(project({agreementId:'somebody-else'}),agreementId),false);
  assert.ok(outcomeChecks(filled(),project({circleId:'private'}),agreementId).length);
});

test('Gate 6: every public account needs human-described work, outcome and a real source',()=>{
  assert.ok(outcomeChecks(newPublicOutcome(),null,agreementId).length>=3);
  assert.deepEqual(outcomeChecks(filled(),project(),agreementId),[]);
  assert.ok(outcomeChecks(filled({outcome:'Unclear'}),project(),agreementId).length);
});
test('Gate 6: accurately groups member-reported incurred and estimated costs, not float approximations',()=>{
  const text=publicOutcomeBody(filled());
  assert.match(text,/MEMBER-REPORTED PROJECT OUTCOME/);
  assert.match(text,/PUBLIC COST ACCOUNT — ALL FIGURES MEMBER-REPORTED/);
  assert.match(text,/Reported costs incurred subtotal \(member-reported\): KES 1,234\.50/);
  assert.match(text,/Estimated costs subtotal \(member-reported\): KES 25\.25/);
  assert.match(text,/not bank-settled expenses, certified wages/);
  assert.match(text,/proposal, not an awarded job/);
  assert.doesNotMatch(text,/aaaaaaa1-aaaa-4aaa|bbbbbbb2-bbbb-4bbb|KS001/);
});
test('Gate 6: cost formatting validates currency and rejects oversized/improper amounts',()=>{
  const badCost=amount=>filled({costs:[{description:'Materials',amount,stage:'INCURRED_REPORTED'}]});
  for(const amount of ['-3','1.999','10e3','Infinity','0','10000000000000'])
    assert.ok(outcomeChecks(badCost(amount),project(),agreementId).length,amount);
  assert.ok(outcomeChecks(filled({currency:'KE'}),project(),agreementId).length);
});
test('Gate 6: obvious private identifiers are blocked before publishing',()=>{
  for(const input of ['Call +254712345678','Person KS01234','me@example.com',
    'https://securepay.ke/agreements/secret']) {
    assert.ok(outcomeChecks(filled({lessons:input}),project(),agreementId).some(x=>/private/i.test(x)),input);
  }
});
test('Gate 6: public report never copies private Agreement or Money data; consent explicit',()=>{
  assert.match(composer,/contributionType:'PROJECT_OUTCOME'/);
  assert.match(composer,/originType:'COMMUNITY_PROJECT',originObjectId:selected!\.id/);
  assert.match(composer,/explicitSafeShare:true,idempotencyKey:key,media:\[\]/);
  assert.match(composer,/gateways\.community\.membership\.me\(\)/);
  assert.match(composer,/gateways\.community\.projects\.list\(50,0\)/);
  assert.match(composer,/if\(membership\.status!=='ACTIVE'\)/);
  assert.match(composer,/privateCheck/);
  assert.match(composer,/permission/);
  assert.match(composer,/Review exactly what Community will see/);
  assert.match(composer,/This Community Project is not verified as linked to this Agreement/);
  assert.doesNotMatch(composer,/originType:'AGREEMENT'|agreementId:payload|transfers\.send|releasePayment|issueReceipt|localStorage/);
});
test('Gate 6: uncertain publish freezes all inputs and repeats identical canonical intent',()=>{
  assert.match(composer,/publication\.state==='uncertain'&&publication\.body&&publication\.key/);
  assert.match(composer,/sameAttempt\?publication\.body!/);
  assert.match(composer,/setPublication\(\{state:'uncertain',key,body:payload,id:null\}\)/);
  assert.match(composer,/const locked=publication\.state==='publishing'\|\|publication\.state==='uncertain'/);
  assert.match(composer,/Inspect Community Live before retrying/);
});
test('Gate 6: authorised real Agreement leads back to Community Live through existing gate and timeline',()=>{
  assert.match(agreement,/<ProjectOutcomeComposer/);
  assert.match(shell,/onGoCommunity=\{\(\)=>\{setOpenedAgreementId\(null\);chooseMode\('community'\);\}\}/);
  assert.match(hub,/label="Member-reported project outcome · not independently cost-verified"/);
  assert.match(gateway,/contributions:\s*\{/);
  assert.match(gateway,/\/api\/v1\/community\/contributions/);
  assert.doesNotMatch(agreement,/submitContribution|publishCostAudit|transferMoney/);
});
