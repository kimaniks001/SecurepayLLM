import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const home = await readFile('src/components/StoreHome.tsx', 'utf8');
const preview = await readFile('src/components/OfferQuickPreview.tsx', 'utf8');
const experience = await readFile('src/features/store/StoreExperience.tsx', 'utf8');
const management = await readFile('src/components/StoreManagementHome.tsx', 'utf8');
const controller = await readFile('src/features/store/controller.ts', 'utf8');
const view = await readFile('src/features/store/view.ts', 'utf8');
const adapters = await readFile('src/api/securepay/store/adapters.ts', 'utf8');
const gateway = await readFile('src/api/securepay/store/index.ts', 'utf8');

test('Store landing clearly distinguishes Find from My Store', () => {
  assert.match(home, /What are you looking for\?/);
  assert.match(home, /Store modes/);
  assert.match(home, />Find</);
  assert.match(home, /My Store/);
  assert.match(home, /See what people can find & what needs you/);
  assert.match(home, /Search a category or place/);
});

test('Store search stays truthful to current API filters', () => {
  assert.match(view, /category: trimmed/);
  assert.match(view, /location: trimmed/);
  assert.match(view, /PRODUCT.*SERVICE.*CAPACITY/s);
  assert.match(home, /real category and place filters/);
  assert.doesNotMatch(view, /fullText|semanticSearch|vectorSearch/);
});

test('first offer open is a human quick preview before full detail', () => {
  assert.match(experience, /OfferQuickPreview/);
  assert.match(experience, /showFullOffer/);
  assert.match(preview, /What does it cost\?/);
  assert.match(preview, /Is it available\?/);
  assert.match(preview, />Where\?</);
  assert.match(preview, /What can I do next\?/);
  assert.match(preview, /See full offer/);
  assert.match(preview, /Open Store/);
  assert.match(preview, /Ask KS001/);
});

test('previewing or choosing an offer never claims Agreement or payment authority', () => {
  assert.match(preview, /No Agreement or payment is created by previewing it/);
  assert.match(controller, /Explicit "Use this": local view switch only, no backend call and no Agreement\/Trade authority created/);
  assert.match(experience, /sourceId: load\.offer\.id/);
  assert.match(experience, /sourceOwnerKsNumber: load\.store\.id/);
  assert.doesNotMatch(preview, /Buy now|Pay now|Order placed|Agreement created/);
});

test('price availability and service area come from Store authority without fabrication', () => {
  assert.match(adapters, /if \(minor === null\) return \{ price: 'Price not listed'/);
  assert.match(adapters, /availabilityText\(view\.availabilityState\)/);
  assert.match(adapters, /serviceArea: locationLabel \?\? ''/);
  assert.match(preview, /Price not established|does not have an established price/);
  assert.match(preview, /Service area not established/);
  assert.doesNotMatch(preview, /KES 0/);
});

test('public Store verification is not fabricated', () => {
  assert.match(adapters, /verified: false, \/\/ no verification field in the backend Store contract; never claim true/);
  assert.doesNotMatch(preview, /Verified/);
});

test('My Store leads with public state attention and opportunities', () => {
  const people = management.indexOf('What people can find');
  const needs = management.indexOf('What needs you?');
  const opportunities = management.indexOf('What opportunities are here?');
  assert.ok(people > 0);
  assert.ok(needs > people);
  assert.ok(opportunities > needs);
  assert.match(management, /Nothing needs you right now/);
  assert.match(management, /No matching Store opportunities right now/);
  assert.match(management, /No demand is invented when none exists/);
});

test('Store opportunities and supply routes remain backend-grounded choices', () => {
  assert.match(gateway, /businessOpportunities/);
  assert.match(management, /MATCHABLE fulfilment demand/);
  assert.match(management, /Compare before you commit/);
  assert.match(management, /Landed cost not established/);
  assert.match(management, /not awarded work and not automatic supplier selection/);
  assert.doesNotMatch(management, /Selected supplier|Automatically accepted|Automatically pooled/);
});

test('Business Store representation is re-confirmed before management', () => {
  assert.match(experience, /businessGateway\.mine\(\)/);
  assert.match(experience, /businessGateway\.representation\(business\.businessKsNumber\)/);
  assert.match(experience, /confirmed\.canActFor/);
  assert.match(experience, /enterBusinessManagement/);
});

test('KS001 is contextual and cannot become Store authority', () => {
  assert.match(home, /Ask KS001 about what you need/);
  assert.match(management, /Ask KS001 about my Store/);
  assert.match(experience, /Do not create an Agreement, select the provider automatically, or move money/);
  assert.match(experience, /Only suggest things SecurePay can actually verify/);
});

test('Store has no fabricated commerce metrics', () => {
  const combined = home + management + preview;
  for (const pattern of [
    /Response rate/i,
    /(?:^|[>\s])Orders(?:[<\s:]|$)/i,
    /(?:^|[>\s])Revenue(?:[<\s:]|$)/i,
    /\b\d+\s+Customers\b/i,
    /\brating\b[:\s]/i,
    /review score/i,
  ]) {
    assert.doesNotMatch(combined, pattern);
  }
});

test('Community Saver execution is not introduced into Store', () => {
  const combined = experience + management + controller;
  assert.doesNotMatch(combined, /proposeFromNeed\(|autoPool|autoApprove|executeCommunitySaver/);
  assert.match(management, /Authority: \{mission\.authorityRequirement/);
});

test('mobile-first Store controls keep touch-sized actions and single-column Find results', () => {
  assert.match(home, /grid grid-cols-1 sm:grid-cols-2/);
  assert.match(home, /min-h-11/);
  assert.match(preview, /min-h-11/);
  assert.match(management, /min-h-11/);
});
