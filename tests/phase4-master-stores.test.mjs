import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const store=read('src/features/living-workspace/StoreDemoExperience.tsx');
const gateway=read('src/features/living-workspace/StoresTool.tsx');
const workspace=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const assist=read('src/features/living-workspace/QuickSupportPanel.tsx');
const agentRelay=read('api/preview-agent.js');
const workRelay=read('api/preview-workspace.js');
test('Phase 4 retains existing Store and Quick Assist components',()=>{
 assert.match(gateway,/StoreDemoExperience onLocalProposal=\{onLocalProposal\}/);
 assert.match(workspace,/activeTool==='Stores'\?<StoresTool/);
 assert.match(workspace,/activeTool==='Quick Assist'\?<QuickSupportPanel/);
 assert.match(workspace,/LiveKs001Session controller=\{liveController!/);
 assert.match(workspace,/PreviewWorkBoard notes=\{activePreviewNotes\}/);
});
test('sample offers are considered, never accepted or financially executed',()=>{
 assert.match(store,/data-phase4-comparison/);
 assert.match(store,/Considering \{compared.length\} of 2 offers · not proposed or accepted/);
 assert.match(store,/Delivery price: Unknown unless explicitly included/);
 assert.match(store,/Illustrative prices are not current quotes/);
 assert.match(store,/Propose in My Work/);
 assert.match(store,/Seller, stock, price and delivery have not been confirmed/);
 assert.match(store,/Event chairs · sample A/);
 assert.match(store,/Event chairs · sample B/);
 assert.match(store,/Delivery cost is NOT specified/);
 assert.match(store,/delivery included subject to a destination and quantity quote/);
 assert.doesNotMatch(store,/window.location|localStorage|\bfetch\(|\baxios\./);
});
test('Plug and Master are support requests not identities, assignments or licences',()=>{
 assert.match(store,/Plug and Master assistance/);
 assert.match(store,/No person, availability, certification, rate or assignment is verified/);
 assert.match(store,/No person assigned/);
 assert.match(store,/private data consent and rate are still unconfirmed/);
 assert.match(store,/A suggestion is not an invitation or a booking/);
});
test('Quick Assist preserves honest provider handoff in existing work',()=>{
 assert.match(assist,/onFindStoreOffers/);
 assert.match(assist,/Do not invent availability, verified providers, prices or bookings/);
 assert.match(workspace,/Quick Assist request:/);
 assert.match(workspace,/No provider contacted or booking made/);
 assert.match(workspace,/addPreviewNote\(text\);closeTool\(\)/);
});
test('current Store offers remain cited and revalidated before KS001',()=>{
 assert.match(gateway,/const record=await gateways.stores.offer\(ownerKs,offerId\)/);
 assert.match(gateway,/Source Store KS Number:/);
 assert.match(gateway,/Do not order, reserve, contact the seller/);
 assert.match(gateway,/if\(record.canonicalKsNumber!==ownerKs/);
 assert.match(gateway,/price\(result.offer.priceMinor,result.offer.currency\)!==line.priceLabel/);
});
test('Community Saver Plug and private place safeguards remain',()=>{
 assert.match(store,/Plug must verify feasibility, evidence, consent/);
 assert.match(workspace,/mode==='work'/);
 assert.match(agentRelay,/Preview writes disabled until isolated staging is configured/);
 assert.match(workRelay,/Preview writes disabled until isolated staging is configured/);
});
