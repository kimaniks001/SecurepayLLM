import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const helper=source('src/features/community/projectOpportunityIntent.ts');
const editor=source('src/features/community/ProjectOpportunityEditor.tsx');
const composer=source('src/components/CommunityCreatePanel.tsx');
const controller=source('src/features/community/controller.ts');
const experience=source('src/features/community/CommunityExperience.tsx');
const detail=source('src/components/CommunityObjectDetail.tsx');
const hub=source('src/features/living-workspace/InlineCommunityHub.tsx');
const shell=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const transpiled=ts.transpileModule(helper,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
}).outputText;
const {newProjectOpportunityIntent,missingProjectOpportunityFacts,projectOpportunityInvitation}=
  await import('data:text/javascript;base64,'+Buffer.from(transpiled).toString('base64'));

const filled=(overrides={})=>({
  ...newProjectOpportunityIntent(),
  purpose:'Restore a water tank',
  duties:'Clean site and move materials',
  peopleNeeded:'Four adults, induction offered',
  schedule:'Three days, 9:00–16:00',
  supervisor:'Named site supervisor',
  safety:'Safety induction and PPE supplied',
  compensation:'KES 1,200 per person per day, paid after approved work',
  joining:'Interested members apply; organiser selects four; each person then decides whether to accept',
  ...overrides,
});

test('Gate 3: incomplete paid work is not ready for public invitation',()=>{
  const missing=missingProjectOpportunityFacts(newProjectOpportunityIntent());
  assert.ok(missing.length>=7);
  assert.ok(missing.some(item=>/pay/i.test(item)));
  assert.ok(missing.some(item=>/safely/i.test(item)));
});

test('Gate 3: complete paid invitation states pay as proposed and funding as unconfirmed',()=>{
  const d=filled();
  assert.deepEqual(missingProjectOpportunityFacts(d),[]);
  const publicText=projectOpportunityInvitation(d);
  for(const fact of [d.purpose,d.duties,d.schedule,d.supervisor,d.safety,d.compensation])
    assert.ok(publicText.includes(fact));
  assert.match(publicText,/Funding: NOT CONFIRMED/);
  assert.match(publicText,/Expressing interest is not selection, acceptance, an Agreement/);
  assert.match(publicText,/12 Principles of Fair Trade/);
  assert.doesNotMatch(publicText,/funding verified|payment secured|worker accepted/i);
});

test('Gate 3: self-reported funds explicitly cannot be passed off as platform confirmation',()=>{
  const text=projectOpportunityInvitation(filled({funding:'ORGANISER_REPORTS_AVAILABLE'}));
  assert.match(text,/organiser reports funds available; SecurePay has NOT verified or reserved/);
});

test('Gate 3: voluntary cause never advertises wages or coerces labour',()=>{
  const d=filled({kind:'VOLUNTARY_CAUSE',compensation:''});
  assert.deepEqual(missingProjectOpportunityFacts(d),[]);
  const text=projectOpportunityInvitation(d);
  assert.match(text,/VOLUNTARY CAUSE/);
  assert.match(text,/Participation: voluntary/);
  assert.doesNotMatch(text,/Proposed compensation|organiser reports funds available/);
});

test('Gate 3: existing Community OPPORTUNITY post is the single invitation source',()=>{
  assert.match(composer,/<ProjectOpportunityEditor/);
  assert.match(composer,/objectType==='opportunity'&&!opportunityReady/);
  assert.match(editor,/onBodyChange\(projectOpportunityInvitation\(next\)\)/);
  assert.match(editor,/No applicant is selected/);
  assert.match(experience,/openProjectInvitationComposer\(\)/);
  assert.match(controller,/openProjectInvitationComposer\(\)/);
  assert.match(controller,/objectType: 'opportunity'/);
  assert.match(controller,/await community\.create\(/);
  assert.match(controller,/view:'object', draft:\{\.\.\.emptyDraft\}, selectedObjectId:created\.id/);
  assert.doesNotMatch(editor,/createAgreement|createSecureLink|paymentExecute|walletTransfer/);
});

test('Gate 3: owner selects EACH actual interested candidate, not a list of auto-accepted workers',()=>{
  assert.match(experience,/filter\(\(h: CommunityHelpResponseView\) => h\.status === 'ACTIVE'\)/);
  assert.match(experience,/communitySourceFactFor\(state\.selectedRealObject!, candidateKsNumber\)/);
  assert.match(detail,/Review with KS001: \{label\}/);
  assert.match(detail,/Examine this invitation with KS001/);
  assert.match(detail,/funding is never established by this Community post/);
});

test('Gate 3: project-head KS001 first step uses existing safe unsent-draft conversation',()=>{
  assert.match(hub,/onPlanWithKs001/);
  assert.match(hub,/planWithKs001/);
  assert.match(hub,/12 Principles of Fair Trade/);
  assert.match(hub,/Do not claim any applicant has accepted/);
  assert.match(shell,/onPlanWithKs001=\{continueCircleToWork\}/);
  assert.match(shell,/const continueCircleToWork = async/);
  assert.match(shell,/writeDraft\(created\.conversationId,text\)/);
  assert.match(shell,/await liveController\.resumeConversation\(created\.conversationId\)/);
  assert.doesNotMatch(hub,/selectCommercialSource\(|fundAgreement\(|startPayment\(/);
});
