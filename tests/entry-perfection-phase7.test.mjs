import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Entry Perfection Phase 7 -- Question Intelligence (UI half): the agreement stays primary and the ONE question SecurePay needs
// sits under it; quick answers only when the evidence bounds them; "I don't know" / "Decide later" are always valid; a checked
// point is shown as still open (checked is not resolved); the question is re-read after every turn.
const bundle = await build({ stdin: { contents: `
export { agreementFormationView } from './src/features/formation/view';
export { AgreementShaping } from './src/features/formation/AgreementShaping';
export { AgreementReview } from './src/features/formation/AgreementReview';
export { NextQuestion } from './src/features/formation/NextQuestion';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (c, p) => api.renderToStaticMarkup(api.createElement(c, p));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ');

const dto = (over = {}) => ({
  conversationId: 'c', version: 4, digest: 'd4', stage: 'UNDERSTOOD', reviewable: true, confirmable: false,
  reviewBlockedReason: null, confirmationBlockedReason: 'This needs sorting out first: the price needs checking.',
  summary: 'Supply and install a pump, by Maji Bora Drillers Ltd.',
  what: [{ key: 'what:pump', label: 'Work', value: 'Supply and install a pump', basis: 'STATED', needsChecking: false, evidence: [] }],
  who: [], money: [], when: [], responsibilities: [], conditions: [], notIncluded: [], origin: null,
  openPoints: [{ id: 'conflict:1', kind: 'CONFLICT', effect: 'BLOCKS_CONFIRMATION', text: 'The price needs checking: KES 180,000 appears in minutes.pdf; KES 175,000 appears in quotation.pdf.',
    sides: [{ value: 'KES 180,000', from: 'minutes.pdf' }, { value: 'KES 175,000', from: 'quotation.pdf' }], checkable: false, checked: false, topic: 'MONEY', state: 'UNRESOLVED' }],
  question: { ask: true, id: 'q:abc', text: 'minutes.pdf says KES 180,000 and quotation.pdf says KES 175,000. Which total should we use?',
    choices: ['KES 180,000', 'KES 175,000'], openPointIds: ['conflict:1'], blocksSetUp: true, alreadyAsked: false, reason: 'CONFIRMATION_BLOCKER' },
  ...over,
});

test('the adapter keeps only a real, planned question -- ask=false (the common case) is no question at all', () => {
  const f = api.agreementFormationView(dto());
  assert.deepEqual(f.question, { id: 'q:abc', text: 'minutes.pdf says KES 180,000 and quotation.pdf says KES 175,000. Which total should we use?',
    choices: ['KES 180,000', 'KES 175,000'], blocksSetUp: true, alreadyAsked: false });
  assert.equal(api.agreementFormationView(dto({ question: { ask: false, reason: 'REVIEW_READY' } })).question, null);
  assert.equal(api.agreementFormationView(dto({ question: { ask: true, id: 'q:x', text: '  ' } })).question, null);
  assert.equal(api.agreementFormationView(dto({ question: undefined })).question, null);
  const many = api.agreementFormationView(dto({ question: { ...dto().question, choices: ['a', 'b', 'c', 'd', 42, ''] } }));
  assert.deepEqual(many.question.choices, ['a', 'b', 'c'], 'at most three bounded choices, never a form');
});

test('the agreement leads and the one question sits under it, with bounded quick answers plus "I don\'t know" and "Decide later"', () => {
  const answers = [];
  const markup = html(api.AgreementShaping, { formation: api.agreementFormationView(dto()), onReview() {}, onAnswer: t => answers.push(t), answering: false });
  const out = text(markup);
  assert.ok(out.indexOf('Your agreement is taking shape') < out.indexOf('Which total should we use?'), 'agreement first, question second');
  assert.match(out, /Review this/);
  assert.match(out, /One thing to settle before it can be set up/);
  assert.match(out, /KES 180,000 KES 175,000 I don’t know yet Decide later/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /role="group" aria-label="Quick answers"/);
  for (const button of markup.match(/<button[^>]*>/g)) assert.match(button, /min-h-1[12]/, 'every control meets the touch target');
});

test('no question -> no question card; a not-yet-reviewable agreement shows nothing here (the chat carries it)', () => {
  const none = text(html(api.AgreementShaping, { formation: api.agreementFormationView(dto({ question: { ask: false } })), onReview() {}, onAnswer() {} }));
  assert.doesNotMatch(none, /One point|One thing to settle/);
  assert.match(none, /Review this/);
  assert.equal(html(api.NextQuestion, { question: null, disabled: false, onAnswer() {} }), '');
  assert.equal(html(api.AgreementShaping, { formation: api.agreementFormationView(dto({ stage: 'BUILD', reviewable: false })), onReview() {}, onAnswer() {} }), '');
});

test('a material (non-blocking) question says so calmly; quick answers disable while a turn is running', () => {
  const q = { id: 'q:t', text: 'plan isn\'t clear here: transport of the food is not clear. Who is responsible for it?', choices: [], blocksSetUp: false, alreadyAsked: true };
  const markup = html(api.NextQuestion, { question: q, disabled: true, onAnswer() {} });
  assert.match(text(markup), /One point is still unclear/);
  assert.equal((markup.match(/disabled=""/g) || []).length, 2);
});

test('Review keeps checked distinct from resolved: a checked point is shown as still open', () => {
  const f = api.agreementFormationView(dto({ openPoints: [{ id: 'source:x', kind: 'AMBIGUOUS', effect: 'NEEDS_CHECKING', text: 'Transport responsibility is unclear.',
    sides: [], checkable: true, checked: true, state: 'ACKNOWLEDGED', acknowledgedAtVersion: 4 }], question: { ask: false } }));
  const out = text(html(api.AgreementReview, { formation: f, changes: [], busy: false, checking: null, error: null, onBack() {}, onCheck() {},
    onCorrect() {}, onSetUp() {}, onAcknowledgeChanges() {}, setUp: null }));
  assert.match(out, /Checked by you — still open: Transport responsibility is unclear\./);
});

test('the agent screen answers through the ordinary conversation and re-reads the question after every completed turn', async () => {
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /onAnswer=\{text => void controller\.send\(text\)\} answering=\{state\.busy \|\| !!state\.pending\}/);
  assert.match(agent, /if \(state\.conversationId && lastTurnId && !state\.busy && !state\.pending\) void formationController\.load\(state\.conversationId\);/);
});
