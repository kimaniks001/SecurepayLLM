import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Entry Perfection Phase 8 -- Context, Identity & Authority (UI half): a described party is never shown as verified, a verified one
// is never shown as having agreed, the set-up is always "as yourself" (and says so when the person acts for a business elsewhere),
// an authority refusal keeps the work, and signing out leaves the conversation behind.
const bundle = await build({ stdin: { contents: `
export { agreementFormationView } from './src/features/formation/view';
export { AgreementReview } from './src/features/formation/AgreementReview';
export { createHandoffController, SET_UP_NOT_ALLOWED_TEXT } from './src/features/handoff/controller';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ');

const dto = (over = {}) => ({
  conversationId: 'c', version: 3, digest: 'd3', stage: 'UNDERSTOOD', reviewable: true, confirmable: true,
  reviewBlockedReason: null, confirmationBlockedReason: null, summary: 'Retile the bathroom, by Kamau: KES 95,000 total.',
  what: [{ key: 'what:tile', label: 'Work', value: 'Retile the bathroom', basis: 'STATED', needsChecking: false, evidence: [] }],
  who: [
    { key: 'who:kamau', name: 'Kamau', role: 'Provider', identity: 'DESCRIBED', describedAs: 'as you described', evidence: [], link: 'NOT_LINKED', participation: 'NOT_JOINED' },
    { key: 'who:wanjiru', name: 'Wanjiru Kamau', role: null, identity: 'VERIFIED', ksNumber: 'KS000123', evidence: [], link: 'LINKED', participation: 'NOT_JOINED' },
    { key: 'who:fake', name: 'Mallory', role: null, identity: 'DESCRIBED', ksNumber: 'KS000666', evidence: [] }],
  money: [], when: [], responsibilities: [], conditions: [], notIncluded: [],
  origin: { type: 'STORE', title: 'Solar water heater', offeredBy: 'KS000321', priceNow: 'KES 85,000', priceChanged: false },
  openPoints: [], question: { ask: false }, ...over,
});
const review = extra => text(api.renderToStaticMarkup(api.createElement(api.AgreementReview, { formation: api.agreementFormationView(dto()), changes: [],
  busy: false, checking: null, error: null, onBack() {}, onCheck() {}, onCorrect() {}, onSetUp() {}, onAcknowledgeChanges() {}, setUp: null, ...extra })));

test('described is never shown as verified; verified is never shown as having agreed; nobody else has agreed', () => {
  const out = review();
  assert.match(out, /Kamau · Provider as you described · not yet linked to a SecurePay identity/);
  assert.match(out, /KS000123 · linked to a verified SecurePay identity · hasn’t joined yet/);
  assert.match(out, /Nobody else has joined or agreed yet\. You can link or invite them after you set this up\./);
  assert.doesNotMatch(out, /KS000666/, 'a KS Number on a party the server did not verify is never shown');
  assert.match(out, /offered by KS000321 \(not a participant yet\)/);
  assert.doesNotMatch(out, /agreed to|has accepted|has confirmed/);
  const f = api.agreementFormationView(dto());
  assert.deepEqual(f.who.map(p => p.linked), [false, true, false]);
});

test('the set-up is always as yourself -- and says so plainly when the person acts for a business elsewhere', () => {
  assert.match(review({ settingUpAs: { signedIn: true, actingFor: null } }), /You’ll set this up as yourself\./);
  const business = review({ settingUpAs: { signedIn: true, actingFor: 'ABC Contractors Ltd' } });
  assert.match(business, /You’ll set this up as yourself, not as ABC Contractors Ltd — setting up an agreement for a business or organization from a conversation isn’t available yet\./);
  assert.doesNotMatch(review(), /set this up as yourself/, 'nothing is said about capacity while signed out');
});

test('an authority refusal at set-up keeps the work and says so calmly -- never "403"', async () => {
  const handoff = api.createHandoffController({ async createHandoff() { throw new api.ApiError('http', 'forbidden', 403, 'FORBIDDEN'); } });
  await handoff.start('c', 3);
  const snap = handoff.getSnapshot();
  assert.equal(snap.phase, 'error');
  assert.equal(snap.error, api.SET_UP_NOT_ALLOWED_TEXT);
  assert.doesNotMatch(snap.error, /403|forbidden/i);
});

test('signing out leaves the conversation behind for the next person on this device', async () => {
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /if \(was === 'signed-in' && sessionState\.status === 'signed-out'\) startNewConversation\(\);/);
  assert.match(agent, /gateway\.forgetResumableConversation\?\.\(\);/);
  assert.match(agent, /settingUpAs=\{signedIn \? \{ signedIn: true, actingFor: actingForBusiness\?\.displayName \?\? actingForOrganization\?\.displayName \?\? null \} : undefined\}/);
});
