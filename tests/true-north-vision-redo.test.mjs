import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const workspace=file('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const vision=file('src/features/living-workspace/TrueNorthVision.tsx');
const math=file('src/features/living-workspace/visionNorthMath.ts');

test('Vision has a real conversation-first door with minimal optional tools',()=>{
  assert.match(workspace,/mode==='vision' && !editingDreamId && <TrueNorthVisionChat/);
  assert.match(workspace,/mode==='vision' && <TrueNorthVisionSummary/);
  assert.match(vision,/What are you imagining\?/);
  assert.match(vision,/id="vision-north-input"/);
  assert.match(vision,/onAdd\(name\)/);
  assert.match(vision,/Guided Vision preview · no live AI, no saved Dream/);
  assert.match(workspace,/\['Photos','Documents','Places'\]\.includes\(tool\.name\)/);
});

test('scenario calculator lives in chat and comparisons appear in the right summary',()=>{
  assert.match(vision,/data-vision-scenario-calculator/);
  assert.match(vision,/What if I borrowed part\?/);
  assert.match(vision,/What if I did it in phases\?/);
  assert.match(vision,/Keep savings scenario/);
  assert.match(vision,/data-true-north-vision-summary/);
  assert.match(vision,/scenarios\.map\(/);
  assert.match(math,/monthlyRepayment/);
  assert.match(math,/months/);
  assert.match(math,/clampVision/);
});

test('signed-in dreams reuse first-party authority and keep retry idempotency',()=>{
  assert.match(vision,/createVisionDreamController\(gateways\.dreams,gateways\.agent\)/);
  assert.match(vision,/createAgentController\(gateway/);
  assert.match(vision,/await dreams!\.start\(clean\)/);
  assert.match(vision,/await agent!\.resumeConversation\(record\.conversationId\)/);
  assert.match(vision,/await agent!\.send\(clean\)/);
  assert.match(vision,/await dreams!\.saveSummary\(dream\.title,body,dream\.version\)/);
  assert.match(vision,/agent\?\.retry\(\)/);
  assert.match(vision,/dreams\?\.reconcilePending\(\)/);
  assert.match(vision,/A KS001 conversation is not an Agreement or payment/);
  assert.match(vision,/not a financial quote/);
});

test('Vision does not replace existing board, community or My Work engine',()=>{
  assert.match(workspace,/InlineVisionEditor/);
  assert.match(workspace,/\bLiveKs001Session\b/);
  assert.match(workspace,/\bInlineCommunityHub\b/);
  assert.match(workspace,/\bAgreementReview\b/);
  assert.match(workspace,/\bWorkspaceContinuityPanel\b/);
  assert.match(vision,/Open saved Dream \/ review for My Work/);
  assert.doesNotMatch(vision,/localStorage|sessionStorage|fetch\(/);
});
