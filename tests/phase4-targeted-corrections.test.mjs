import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const viewer=file('src/features/living-workspace/StorePhotoViewer.tsx');
const stores=file('src/features/living-workspace/StoresTool.tsx');
const plan=file('src/features/living-workspace/StoreBuyingPlan.tsx');
const demo=file('src/features/living-workspace/StoreDemoExperience.tsx');
const help=file('src/features/living-workspace/StoreHumanHelp.tsx');
const preview=file('api/preview-agent.js');
test('all sample and authorised Store imagery uses accessible viewer without inventing real photographs',()=>{
 assert.match(demo,/StorePhoto/);
 assert.match(stores,/StorePhoto/);
 assert.match(viewer,/aria-modal="true"/);
 for(const s of ['Close photo preview','Previous photo','Next photo','Zoom in','Zoom out','Escape','onTouchMove','No authorised photo available'])assert.ok(viewer.includes(s),s);
 assert.match(demo,/image:''/);
 assert.doesNotMatch(demo,/image:photo\('photo-1598300056393-4aac492f4344'\)/);
 assert.match(stores,/https:\/\/securepay\.ke/);
});
test('coordination requires two distinct Stores; single-Store prompt is safely normalised',()=>{
 assert.match(plan,/distinctStoreCount/);
 assert.match(plan,/new Set\(lines\.map\(x=>x\.storeKsNumber\|\|x\.storeName\)\)/);
 assert.match(plan,/const crossStore=shops>=2/);
 assert.match(plan,/!crossStore\?/);
 assert.match(plan,/coordination=stores\.size>=2\?draft\.coordination:'separate'/);
 assert.match(plan,/onDraft\(\{\.\.\.draft,coordination:'separate'\}\)/);
});
test('Saver is not a membership entitlement, and requires actual evidence, Plugs and separate consent',()=>{
 for(const s of ['I want to explore this Saver opportunity','Membership never implies Saver consent','Ordinary cost baseline','Coordinated costs','Plug compensation','Net benefit to buyer, sellers and Plug','Benefit allocation','Each seller: pending','Plug: not appointed or consented'])assert.ok(plan.includes(s),s);
 assert.doesNotMatch(plan,/Saver approved|Saver active|Savings paid|All consented/);
 assert.match(demo,/Plug must verify feasibility/);
});
test('provider capacities are separate from private Store relationships and no fake human matches are presented',()=>{
 for(const s of ['Delivery','Pickup','Stock inspection','Delivery inspection','Logistics','Coordination','Sourcing','Store onboarding','Technical consultation','Project review','Disputes','Mentoring','Construction','Costing'])assert.ok(help.includes(s),s);
 for(const s of ['My Plugs','My Masters','Private relationship tag','not the provider\'s published skills','no identity lookup or backend saving','No provider matches'])assert.ok(help.includes(s),s);
 assert.doesNotMatch(help,/qualified:true|certified:true|available:true|fakeMaster|fakePlug/);
 assert.match(stores,/<StoreHumanHelp owner\/>/);
});
test('authoritative gateways and production-write guard remain in place',()=>{
 assert.match(stores,/gateways\.stores\.offer/);
 assert.match(stores,/record\.canonicalKsNumber!==ownerKs/);
 assert.match(stores,/stock|availability/i);
 assert.match(preview,/Preview writes disabled until isolated staging is configured/);
});
