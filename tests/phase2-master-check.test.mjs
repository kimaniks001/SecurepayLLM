import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const preview=read('src/features/living-workspace/PreviewWorkNotes.tsx');
const examples=read('src/features/living-workspace/phase2Examples.ts');
const live=read('src/features/living-workspace/LiveWorkResultPanel.tsx');
const relay=read('api/preview-agent.js');
test('five Phase 2 journeys are explicitly synthetic with material questions',()=>{
  for(const id of ['delivery','chama','service','project','store'])
    assert.match(examples,new RegExp("id:'"+id+"'"));
  for(const sample of ['KES 400','KES 2,000','professional service','construction project','Store'])
    assert.ok(examples.includes(sample),sample);
  assert.match(examples,/never KS001 analysis or backend readiness/);
  assert.doesNotMatch(examples,/principleTitle|principleSetVersion|Fair Trade score|verified identity|stock available/i);
});
test('one human-facing board and one live authoritative conversation',()=>{
  assert.match(shell,/createAgentController\(gateway/);
  assert.match(shell,/createFormationController\(gateway\)/);
  assert.match(shell,/LiveKs001Session controller=\{liveController/);
  assert.match(shell,/mode==='work' && uiOnlyPreview \? <PreviewWorkBoard/);
  assert.match(shell,/onCorrectFact=\{async/);
  assert.match(shell,/latest\.data\.version!==expectedVersion/);
  assert.match(preview,/SecurePay Check/);
  assert.match(preview,/What deserves attention/);
  assert.match(preview,/One useful next step/);
});
test('canonical server examination is partial, version-bound, and never scored or cleared',()=>{
  assert.match(shell,/reading\.tradeContextVersion !== liveFormationVersion/);
  assert.match(shell,/reading\.status !== 'PARTIAL_ADVISORY'/);
  assert.match(live,/fairTrade\.principleSetVersion/);
  assert.match(live,/fairTrade\.findings\.map/);
  assert.match(live,/Fair Trade/);
  assert.match(live,/A partial examination is never a clearance/);
  assert.doesNotMatch(live,/Check complete\. You may proceed\./);
  assert.doesNotMatch(preview,/Check complete\. You may proceed\./);
});
test('distinct action readiness never equates inspection, invitation, acceptance and money',()=>{
  for(const area of ['Continue building','Review the draft','Invite or share','Request acceptance','Connect Money','Proceed with work'])
    assert.ok(live.includes(area),area);
  assert.match(live,/Requires accepted terms, permissions and real Money readiness/);
  assert.match(preview,/Requires actual permissions and an explicit invitation/);
  assert.match(preview,/Not authorised in this preview/);
  assert.match(preview,/No principle has been evaluated/);
});
test('demonstration is in-memory and production write safeguards remain intact',()=>{
  assert.match(preview,/KS001 isn't responding and nothing is saved as an Agreement/);
  assert.doesNotMatch(preview,/fetch\(|axios|createAgentController|localStorage|sessionStorage|agreementId/);
  assert.match(shell,/setPreviewNotes\(/);
  assert.match(relay,/UPSTREAM = 'https:\/\/securepay\.ke'/);
  assert.match(relay,/Preview writes disabled until isolated staging is configured/);
});
