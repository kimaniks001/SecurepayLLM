import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const bundleOf = async contents => {
  const result = await build({ stdin: { contents, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
  const mod = { exports: {} };
  new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
  return mod.exports;
};
const api=await bundleOf("export { resolveAgreementNext } from './src/features/workspace/AgreementNextStep'; export { resolveWorkspaceHumanNext } from './src/features/shell/humanNext';");
const base={actionsKnown:true,nextActions:[],completion:{completed:false,completedAt:null,completedMilestones:0,totalMilestones:1,completedObligations:0,totalObligations:1},nextDate:null,amountLabel:'KES 95,000'};
const action=(actionCode,reason='')=>({actionCode,category:'DO',reason,deadline:null,attentionClass:'ACTION_REQUIRED'});

test('Phase 4: agreed/idle never becomes Money ready without an authoritative action',()=>{
  const next=api.resolveAgreementNext(base);
  assert.equal(next.state,'IDLE'); assert.equal(next.destination,undefined);
  assert.doesNotMatch(next.headline,/fund|pay|release/i);
});

test('Phase 4: FUND_AGREEMENT is the only tested funding signal and opens Money',()=>{
  const next=api.resolveAgreementNext({...base,nextActions:[action('FUND_AGREEMENT','Funding is available')]});
  assert.equal(next.destination,'money'); assert.equal(next.actionLabel,'See payment options'); assert.match(next.headline,/KES 95,000/);
});

test('Phase 4: waiting has no fake primary action',()=>{
  const next=api.resolveAgreementNext({...base,nextActions:[action('WAIT_FOR_DEPENDENCY','Waiting for Peter to finish his part')]});
  assert.equal(next.state,'WAITING'); assert.equal(next.actionLabel,undefined); assert.equal(next.destination,undefined);
});

test('Phase 4: evidence review routes to inspection and explicitly does not release money',()=>{
  const next=api.resolveAgreementNext({...base,nextActions:[action('REVIEW_EVIDENCE','Peter submitted evidence')]});
  assert.equal(next.destination,'progress'); assert.equal(next.actionLabel,'Inspect the work'); assert.match(next.detail,/does not.*release money/i);
});

test('Phase 4: a failed authoritative next-action read remains UNKNOWN, never empty/idle',()=>{
  const next=api.resolveAgreementNext({...base,actionsKnown:false});
  assert.equal(next.state,'UNKNOWN'); assert.match(next.detail,/No Agreement or Money action has been assumed/);
});

test('Phase 4: completion does not itself manufacture a Money action',()=>{
  const next=api.resolveAgreementNext({...base,completion:{...base.completion,completed:true,completedAt:'2026-10-12T10:00:00Z'}});
  assert.equal(next.state,'DONE'); assert.equal(next.destination,undefined);
});

test('Phase 4: proposed changes route to Changes from Home Continue',()=>{
  const next=api.resolveWorkspaceHumanNext({problems:[],invitations:[],attentionItems:[{id:'a',kind:'agreement_changed',title:'Bathroom tiling',detail:'Peter suggested a change',actionLabel:'Review',actionValue:'REVIEW_AMENDMENT',agreementId:'agr'}]});
  assert.equal(next.destination.kind,'agreement'); assert.equal(next.destination.actionCode,'REVIEW_AMENDMENT'); assert.equal(next.primaryLabel,'Review change');
});

test('Phase 4: funding from Home Continue routes straight to Money, not generic Agreement detail',()=>{
  const next=api.resolveWorkspaceHumanNext({problems:[],invitations:[],attentionItems:[{id:'a',kind:'next_action',title:'Bathroom tiling',detail:'Funding is available',actionLabel:'Continue',actionValue:'FUND_AGREEMENT',agreementId:'agr'}]});
  assert.equal(next.destination.kind,'money'); assert.equal(next.primaryLabel,'See payment options');
});

test('Phase 4: the Agreement overview is not a super-dashboard',async()=>{
  const overview=await readFile('src/features/workspace/LivingAgreementOverview.tsx','utf8');
  assert.match(overview,/data-phase4-agreement-centre/); assert.match(overview,/AgreementNextStep/); assert.match(overview,/data-agreement-details/);
  assert.doesNotMatch(overview,/ExperiencePathway|Ks001SurfaceGuide/);
});

test('Phase 4: Store demand starts from an exact Agreement obligation',async()=>{
  const progress=await readFile('src/features/execution/ProgressPanel.tsx','utf8');
  assert.match(progress,/fromAgreementObligation/); assert.match(progress,/Find what this work needs/);
  assert.match(progress,/need remains tied to this Agreement obligation/);
  assert.match(progress,/onOpenStoreOffer/);
  assert.match(progress,/fulfilmentGateway\.fromAgreementObligation/);
});

test('Phase 4: Community Saver cannot be automated here and a Plug is explicitly required',async()=>{
  const progress=await readFile('src/features/execution/ProgressPanel.tsx','utf8');
  assert.match(progress,/data-community-saver-plug-guard/);
  assert.match(progress,/A Plug must verify fit, coordinate consent and practical feasibility before any Community Saver can proceed/);
  assert.match(progress,/SecurePay has not combined this Agreement with anyone else/);
  assert.doesNotMatch(progress,/sharedFulfilment.*propose|proposeShared/i);
});

test('Phase 4: multiple Agreements are grouped calmly by Needs you, Waiting and Upcoming',async()=>{
  const home=await readFile('src/features/shell/AgreementAttentionSummary.tsx','utf8');
  assert.match(home,/>Needs you</); assert.match(home,/>Waiting</); assert.match(home,/>Upcoming</);
  assert.doesNotMatch(home,/KPI|progress-track|Need you.*\d/);
});

test('Phase 4: Continue routes authoritative Agreement actions to exact sections',async()=>{
  const agent=await readFile('src/features/agent/AgentExperience.tsx','utf8');
  assert.match(agent,/setDetailTabHint\(\{ agreementId: destination\.agreementId, tab: 'changes' \}\)/);
  assert.match(agent,/setDetailTabHint\(\{ agreementId: destination\.agreementId, tab: 'progress' \}\)/);
  assert.match(agent,/openMoneyFor\(\{ agreementId: destination\.agreementId/);
});

test('Phase 4: notification routing remains backend actionKey-driven, never agreementId-driven guesswork',async()=>{
  const notifications=await readFile('src/features/notifications/NotificationsExperience.tsx','utf8');
  assert.match(notifications,/parseNotificationActionKey/);
  assert.match(notifications,/if \(actionKey === 'REVIEW_AGREEMENT' && agreementId\)/);
  assert.match(notifications,/const actionKey = parseNotificationActionKey\(notification\.actionKey\)/);
  assert.match(notifications,/if \(actionKey === 'OPEN_AGREEMENT' && agreementId\)/);
});

test('Phase 4: advanced machinery remains behind Agreement details',async()=>{
  const overview=await readFile('src/features/workspace/LivingAgreementOverview.tsx','utf8');
  assert.match(overview,/<details[^>]*data-agreement-details/); assert.match(overview,/Changes & history/);
});

test('Phase 4: there is no frontend assumption that COMPLETED means RELEASE',async()=>{
  const next=await readFile('src/features/workspace/AgreementNextStep.tsx','utf8');
  assert.doesNotMatch(next,/completed.*release|completion.*release|COMPLETED.*release/i);
  assert.doesNotMatch(next,/RELEASE_PAYMENT|RELEASE_MONEY/);
});
