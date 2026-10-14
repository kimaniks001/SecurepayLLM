import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=source('src/RuntimeApp.tsx');
const shell=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const personas=source('src/features/living-workspace/personas.ts');
const agreement=source('src/features/living-workspace/LivingAgreementPanel.tsx');
const vision=source('src/features/living-workspace/LivingVisionPanel.tsx');
const circle=source('src/features/living-workspace/LivingCirclePanel.tsx');
const community=source('src/features/living-workspace/LivingCommunityPanel.tsx');
const support=source('src/features/living-workspace/QuickSupportPanel.tsx');
test('Phase 7: preview is isolated from production entry',()=>{
 assert.match(app,/if \(phase1Preview\) return <Phase1LivingWorkspacePreview\s*\/>/);
 assert.match(app,/#\\?\/preview\\/living-workspace/);
});
test('Phase 7: four scoped working postures exist',()=>{
 for(const name of ['Agreement Maker','Dream Companion','Circle Facilitator','Community Guide']) assert.ok(personas.includes(name),name);
 for(const mode of ['work','vision','circle','community']) assert.ok(shell.includes(`'${mode}'`),mode);
});
test('Phase 7: tools are contextual, Quick Support is universal',()=>{
 assert.match(shell,/toolsOpen &&/);
 assert.match(shell,/activeTool==='Quick Support'/);
 for(const service of ['Short Stays','My Ride','Quick Documents']) assert.ok(support.includes(service));
});
test('Phase 7: Agreement review does not imply accepted terms or authority',()=>{
 assert.match(agreement,/ready = false/);
 assert.match(agreement,/disabled=\{!ready\}/);
 assert.ok(agreement.includes('proposed'));
 assert.ok(agreement.includes('source'));
});
test('Phase 7: Vision cooldown never locks My Work',()=>{
 assert.match(vision,/My Work and free Agreement drafting remain available/);
 assert.match(vision,/No payment is taken or allowance consumed/);
});
test('Phase 7: Circle support is not formal approval',()=>{
 assert.match(circle,/Support is not a vote of formal approval/);
 assert.match(circle,/No formal Circle decisions have been recorded/);
});
test('Phase 7: Circle-only content cannot leak to LIVE',()=>{
 assert.match(community,/Circle-only content must never appear in LIVE/);
});
test('Phase 7: payment and booking claims are explicitly limited',()=>{
 assert.match(shell,/No money, invitation, approval, booking or Agreement authority is active/);
 assert.match(support,/cannot search live provider availability, dispatch transport, reserve accommodation or make payment/);
});
test('Phase 7: Quick Documents distinguish requests, offers and receipts',()=>{
 for(const statement of ['not proof of payment','does not prove payment','not an accepted Agreement'])assert.ok(support.includes(statement));
});
