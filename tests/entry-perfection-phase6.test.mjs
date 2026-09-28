import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Entry Perfection Phase 6 -- Agreement Formation (UI half): the agreement takes priority once it is understood, Review shows
// what SecurePay thinks is being agreed in human language, open points are calm and actionable, evidence is one tap away,
// corrections show as updates, and "Set this up securely" is pinned to the version the person reviewed.
const bundle = await build({ stdin: { contents: `
export { agreementFormationView, whatChanged } from './src/features/formation/view';
export { createFormationController } from './src/features/formation/controller';
export { AgreementShaping } from './src/features/formation/AgreementShaping';
export { AgreementReview } from './src/features/formation/AgreementReview';
export { createHandoffController } from './src/features/handoff/controller';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (c, p) => api.renderToStaticMarkup(api.createElement(c, p));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ');

const ev = (name, locator = 'p1') => ({ sourceArtifactId: `s-${name}`, sourceName: name, locator, removed: false });
const dto = (over = {}) => ({
  conversationId: 'c', version: 9, digest: 'd9', stage: 'UNDERSTOOD', reviewable: true, confirmable: false,
  reviewBlockedReason: null, confirmationBlockedReason: 'This needs sorting out first: the price needs checking.',
  summary: 'Supply and install a pump, by Maji Bora Drillers Ltd: KES 90,000 deposit on signing.',
  what: [{ key: 'what:pump', label: 'Work', value: 'Supply and install a pump', basis: 'STATED', needsChecking: false, evidence: [ev('minutes.pdf')] }],
  who: [{ key: 'who:maji', name: 'Maji Bora Drillers Ltd', role: 'Provider', identity: 'DESCRIBED', describedAs: 'as named in minutes.pdf', evidence: [] },
    { key: 'who:x', name: 'Somebody', role: null, identity: 'VERIFIED', ksNumber: 'KS000077', evidence: [] }],
  money: [
    { key: 'money:total', label: 'Total price', value: 'KES 180,000', basis: 'STATED', needsChecking: true, evidence: [ev('minutes.pdf'), ev('quotation.pdf', 'table')] },
    { key: 'money:deposit', label: 'Deposit', value: 'KES 60,000', detail: 'on signing', basis: 'INFERRED', needsChecking: false, evidence: [ev('minutes.pdf', 'p2')] },
    { key: 'money:balance', label: 'Balance', value: 'KES 175,000', basis: 'YOURS', needsChecking: false, evidence: [], history: 'quotation.pdf originally said KES 180,000; you changed it.' }],
  when: [{ key: 'when:completion', label: 'Finish by', value: 'Saturday 31 October 2026', detail: 'you said “end of month”', basis: 'YOURS', needsChecking: false, evidence: [] }],
  responsibilities: [{ party: 'Maji Bora Drillers Ltd', duties: [{ key: 'duty:maji:install', label: 'Does', value: 'supply and install the pump', basis: 'STATED', needsChecking: false, evidence: [ev('minutes.pdf')] }] }],
  conditions: [], notIncluded: [{ key: 'excluded:tiles', label: 'Not included for Maji Bora Drillers Ltd', value: 'tank stand', detail: "you'll provide this yourself", basis: 'STATED', needsChecking: false, evidence: [] }],
  origin: null,
  openPoints: [
    { id: 'conflict:1', kind: 'CONFLICT', effect: 'BLOCKS_CONFIRMATION', text: 'The price needs checking: KES 180,000 appears in minutes.pdf; KES 175,000 appears in quotation.pdf.', sides: [{ value: 'KES 180,000', from: 'minutes.pdf' }], checkable: true, checked: false },
    { id: 'source:a', kind: 'AMBIGUOUS', effect: 'NEEDS_CHECKING', text: 'Transport responsibility is unclear.', sides: [], checkable: true, checked: false, sourceName: 'minutes.pdf' }],
  ...over,
});
const review = (formation, extra = {}) => text(html(api.AgreementReview, { formation, changes: [], busy: false, checking: null, error: null,
  onBack() {}, onCheck() {}, onCorrect() {}, onSetUp() {}, onAcknowledgeChanges() {}, setUp: null, ...extra }));

test('the adapter keeps the server\'s words, never a verified identity it was not given, and a conflict is never checkable', () => {
  const f = api.agreementFormationView(dto());
  assert.equal(f.reviewable, true);
  assert.equal(f.openPoints[0].blocksConfirmation, true);
  assert.equal(f.openPoints[0].checkable, false, 'a conflict is resolved by correcting the details, not by ticking it');
  assert.equal(f.who[0].ksNumber, null);
  assert.equal(f.who[1].ksNumber, 'KS000077');
  assert.equal(api.agreementFormationView({ ...dto(), stage: 'SOMETHING_NEW' }).reviewable, false);
  assert.equal(api.agreementFormationView(null), null);
});

test('the agreement leads once understood -- and never for an exploration or a vague intention', () => {
  const card = text(html(api.AgreementShaping, { formation: api.agreementFormationView(dto()), onReview() {} }));
  assert.match(card, /Your agreement is taking shape/);
  assert.match(card, /Review this/);
  assert.match(card, /2 points to check · nothing is agreed yet/);
  assert.equal(html(api.AgreementShaping, { formation: api.agreementFormationView(dto({ stage: 'BUILD', reviewable: false })), onReview() {} }), '');
  assert.equal(html(api.AgreementShaping, { formation: null, onReview() {} }), '');
});

test('Review answers "what are we agreeing?" in human language, with calm open points and money in its roles', () => {
  const out = review(api.agreementFormationView(dto()));
  assert.match(out, /Review this agreement/);
  assert.match(out, /Nothing is agreed until you set it up/);
  assert.match(out, /Needs checking The price needs checking: KES 180,000 appears in minutes\.pdf; KES 175,000 appears in quotation\.pdf\./);
  assert.match(out, /Tell KS001 which is right below/);
  assert.match(out, /Transport responsibility is unclear\. Mark as checked/);
  assert.match(out, /Total price KES 180,000/);
  assert.match(out, /Deposit KES 60,000 · on signing/);
  assert.match(out, /SecurePay’s reading/);
  assert.match(out, /Balance KES 175,000 quotation\.pdf originally said KES 180,000; you changed it\./);
  assert.match(out, /Maji Bora Drillers Ltd will Responsibility supply and install the pump/); // the label is screen-reader only
  assert.doesNotMatch(out, / will Does /);
  assert.match(out, /Not included Not included for Maji Bora Drillers Ltd tank stand · you'll provide this yourself/);
  assert.match(out, /Maji Bora Drillers Ltd · Provider as named in minutes\.pdf · not yet linked to a SecurePay identity/);
  // Phase 8 restatement: verified is "linked", and never implies the party has joined or agreed.
  assert.match(out, /KS000077 · linked to a verified SecurePay identity · hasn’t joined yet/);
  assert.doesNotMatch(out, /CANDIDATE|CONFIRMED|moneyRole|currencyBasis|INFERRED|YOURS|BLOCKS_CONFIRMATION|conflict:1|s-minutes/);
});

test('evidence is one tap away, not on the page: collapsed, with the first source and a count', () => {
  const markup = html(api.AgreementReview, { formation: api.agreementFormationView(dto()), changes: [], busy: false, checking: null, error: null,
    onBack() {}, onCheck() {}, onCorrect() {}, onSetUp() {}, onAcknowledgeChanges() {}, setUp: null });
  assert.match(markup, /<details[^>]*><summary[^>]*>From minutes\.pdf · p1 \(\+1 more\)<\/summary>/);
  assert.doesNotMatch(markup, /<details[^>]* open/);
});

test('Set this up securely is disabled with the reason while something blocks it, and pinned to the version shown', () => {
  const blocked = review(api.agreementFormationView(dto()));
  assert.match(blocked, /Set this up securely This needs sorting out first: the price needs checking\./);
  let setUpWith = null;
  const ready = api.agreementFormationView(dto({ confirmable: true, confirmationBlockedReason: null, openPoints: [] }));
  const markup = html(api.AgreementReview, { formation: ready, changes: [], busy: false, checking: null, error: null,
    onBack() {}, onCheck() {}, onCorrect() {}, onSetUp(v) { setUpWith = v; }, onAcknowledgeChanges() {}, setUp: null });
  assert.doesNotMatch(markup, /disabled=""[^>]*>Set this up securely/);
  assert.match(text(markup), /You’ll sign in if you haven’t already\. Nothing is agreed until you set it up\./);
  assert.equal(setUpWith, null);
});

test('a correction shows as a calm update of the term, not an audit log', () => {
  const before = api.agreementFormationView(dto());
  const after = api.agreementFormationView(dto({ version: 10, money: [{ ...dto().money[0], value: 'KES 185,000', needsChecking: false }, dto().money[1], dto().money[2]] }));
  assert.deepEqual(api.whatChanged(before, after), ['Total price is now KES 185,000']);
  assert.deepEqual(api.whatChanged(before, before), []);
  const out = review(after, { changes: ['Total price is now KES 185,000'] });
  assert.match(out, /Updated: Total price is now KES 185,000\. OK/);
});

test('the formation controller reads the server, checks a point, and reports what changed between versions', async () => {
  let version = 9;
  const calls = [];
  const gateway = {
    async readAgreementFormation(id, zone) { calls.push(['read', id, typeof zone]); return dto({ version, money: version === 9 ? dto().money : [{ ...dto().money[0], value: 'KES 185,000' }, dto().money[1], dto().money[2]] }); },
    async checkOpenPoint(id, point) { calls.push(['check', id, point]); return dto({ openPoints: [{ ...dto().openPoints[1], checked: true }] }); },
  };
  const c = api.createFormationController(gateway);
  await c.load('c');
  assert.equal(c.getSnapshot().data.version, 9);
  version = 10;
  await c.load('c');
  assert.deepEqual(c.getSnapshot().changes, ['Total price is now KES 185,000']);
  await c.check('c', 'source:a');
  assert.equal(c.getSnapshot().data.openPoints[0].checked, true);
  assert.deepEqual(calls.map(x => x[0]), ['read', 'read', 'check']);
});

test('setting it up sends the reviewed version, so a changed agreement is never silently set', async () => {
  const sent = [];
  const handoff = api.createHandoffController({ async createHandoff(id, actionId, version) { sent.push(version); throw Object.assign(new Error('changed'), { status: 409 }); } });
  await handoff.start('c', 9);
  assert.deepEqual(sent, [9]);
  assert.equal(handoff.getSnapshot().phase, 'error');
});

test('the agent screen opens Review without signing in, and the old "Use this first" gate is gone', async () => {
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  // Phase 7 restatement: the card now also carries the planned question's quick answers (see entry-perfection-phase7.test.mjs).
  assert.match(agent, /<AgreementShaping formation=\{formationState\.data\} onReview=\{\(\) => setReviewOpen\(true\)\}/);
  assert.match(agent, /onSetUp=\{version => \{ if \(state\.conversationId\) void handoffController\.start\(state\.conversationId, version\); \}\}/);
  assert.doesNotMatch(agent, /Confirm it above with “Use this” first/);
  const panel = await readFile('src/features/handoff/HandoffPanel.tsx', 'utf8');
  assert.match(panel, /This is ready to set securely\. Sign in to continue\./);
});
