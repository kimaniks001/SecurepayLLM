import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const shell=file('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const stores=file('src/features/living-workspace/StoresTool.tsx');
const samples=file('src/features/living-workspace/StoreDemoExperience.tsx');
const assist=file('src/features/living-workspace/QuickSupportPanel.tsx');
const check=file('src/features/living-workspace/PreviewWorkNotes.tsx');
const relayAgent=file('api/preview-agent.js');
const relayWorkspace=file('api/preview-workspace.js');

test('approved three-panel shell and original authoritative controllers stay intact',()=>{
 assert.match(shell,/LiveKs001Session controller=\{liveController/);
 assert.match(shell,/LiveWorkResultPanel/);
 assert.match(shell,/PreviewWorkBoard notes=\{activePreviewNotes\}/);
 assert.match(shell,/createAgentController\(gateway/);
 assert.match(shell,/createFormationController\(gateway\)/);
 assert.match(shell,/onLocalProposal=\{uiOnlyPreview&&mode==='work'/);
 assert.match(shell,/data-phase4-journeys/);
 assert.doesNotMatch(shell,/createSecondAgentController|new AgreementEngine/);
});
test('sample Store proposals and considered items never accept an offer or start Money',()=>{
 assert.match(samples,/SAMPLE · NOT A REAL STORE/);
 assert.match(samples,/Viewed is not considered\. Considered is not proposed/);
 assert.match(samples,/toggleConsider/);
 assert.match(samples,/data-phase4-comparison/);
 assert.match(samples,/Stock, identity, final location, quantity, delivery cost and seller consent remain unverified/);
 assert.match(samples,/Nothing is accepted by browsing/);
 assert.match(samples,/Transport cost NOT stated/);
 assert.match(samples,/Sample KES 250 per chair/);
 assert.match(samples,/Sample KES 210 per chair/);
 assert.doesNotMatch(samples,/gateway\.money|createAgreement\(|capturePayment\(/);
});
test('real Store pathway continues to validate offer source before KS001',()=>{
 assert.match(stores,/gateways\.stores\.search/);
 assert.match(stores,/gateways\.stores\.offer\(ownerKs,offerId\)/);
 assert.match(stores,/record\.canonicalKsNumber!==ownerKs/);
 assert.match(stores,/record\.offer\.id!==offerId/);
 assert.match(stores,/Keep the source reference with this work/);
 assert.match(stores,/onLocalProposal=\{onLocalProposal\}/);
});
test('Plugs, Masters and Community Saver are proposals, not appointments or entitlements',()=>{
 assert.match(samples,/Ask for a Plug/);
 assert.match(samples,/Ask for a Master/);
 assert.match(samples,/No person, rate, location, qualification or availability is verified/);
 assert.match(samples,/no private records shared or engagement confirmed/);
 assert.match(samples,/a Plug must verify feasibility, evidence, consent/);
 assert.match(samples,/No Community Saver or payout is created/);
});
test('Quick Assist supports existing stays and rides without provider booking',()=>{
 assert.match(assist,/Short Stays/);
 assert.match(assist,/My Ride/);
 assert.match(assist,/onLocalProposal/);
 assert.match(assist,/No provider contacted, ride dispatched, room reserved/);
 assert.match(assist,/Live booking\/dispatch integrations are not connected/);
 assert.match(assist,/No booking or payment is made/);
});
test('geography is not disclosed or inferred and proposed work remains correctable',()=>{
 assert.match(assist,/Location shared with no one/);
 assert.match(samples,/Location not confirmed/);
 assert.match(check,/Store offer\|Buying plan\|Assistance\|Quick Assist/);
 assert.match(check,/Edit preview note/);
 assert.match(check,/Remove preview note/);
});
test('Vercel preview relays retain production-write protections',()=>{
 assert.match(relayAgent,/Preview writes disabled until isolated staging is configured/);
 assert.match(relayWorkspace,/Preview writes disabled until isolated staging is configured/);
 assert.match(shell,/const uiOnlyPreview=/);
 assert.match(shell,/addPreviewNote\(text\);closeTool\(\)/);
});
