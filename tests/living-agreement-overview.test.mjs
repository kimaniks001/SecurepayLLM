import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const bundle = await build({ entryPoints: ['src/features/workspace/LivingAgreementOverview.tsx'], bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', external: ['react', 'react/jsx-runtime'] });
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { LivingAgreementOverview } = module.exports;
const detail = {
  overview: { title: 'Retile bathroom', purpose: 'A safe, usable bathroom', description: 'Supply and install tiles.', proposedAmountMinor: '9500000', currency: 'KES' },
  currentVersion: { versionNumber: 3 },
  milestones: [{ milestoneId: 'delivery', title: 'Deliver tiles', dueAt: null }, { milestoneId: 'install', title: 'Install tiles', dueAt: null }],
  documents: [],
  participants: [{ participantId: 'p1' }, { participantId: 'p2' }],
};
const render = (overrides = {}) => renderToStaticMarkup(React.createElement(LivingAgreementOverview, {
  detail, effectiveStates: null, completion: null, events: [],
  onProgress() {}, onPeople() {}, onDocuments() {}, onChanges() {}, onMoney() {}, ...overrides,
}));

test('Overview owns one concise Agreement story instead of replaying every tab', () => {
  const html = render();
  assert.match(html, /At a glance/);
  assert.match(html, /A safe, usable bathroom/);
  assert.match(html, /KES/);
  assert.match(html, /95,000/);
  assert.match(html, /2 participants/);
  assert.match(html, /Version/);
  assert.match(html, />3</);
  assert.match(html, /Nothing is asking for your action right now/);
  assert.doesNotMatch(html, /Live status unavailable/);
  assert.doesNotMatch(html, /Deliver tiles[\s\S]*Install tiles/);
});

test('authoritative participant actions are translated from action code into human wording', () => {
  const html = render({ nextActions: [{ actionCode: 'SUBMIT_EVIDENCE', category: 'WORK', reason: 'evidence required for obligation', deadline: '2026-10-10T00:00:00Z', attentionClass: 'ACTION_REQUIRED' }] });
  assert.match(html, /What happens next/);
  assert.match(html, /Add evidence for the work/);
  assert.doesNotMatch(html, /evidence required for obligation/);
  assert.match(html, /(?:10 Oct 2026|Oct 10, 2026)/);
});

test('the next Agreement date is promoted onto Overview instead of being buried in Calendar', () => {
  const html = render({ events: [{ id: 'e1', title: 'Toyota Car expires', dateLabel: '4 Nov 2026', timeLabel: '', eventTypeLabel: 'Expiry', isDerived: true, cancelled: false, sourceReference: null }] });
  assert.match(html, /Next date/);
  assert.match(html, /Toyota Car expires/);
  assert.match(html, /4 Nov 2026/);
});

test('whole Agreement completion still comes only from its authoritative completion projection', () => {
  assert.match(render({ completion: { completed: true, status: 'COMPLETED', completedAt: null, reasonCodes: [] } }), /Agreement completed/);
  assert.match(render({ completion: { completed: false, status: 'UNSUPPORTED', completedAt: null, reasonCodes: [] } }), /doesn’t evaluate completion/);
});

test('Overview routes to deeper authority without duplicating it', () => {
  const html = render();
  assert.match(html, /People/);
  assert.match(html, /Money/);
  assert.match(html, /Work &amp; evidence/);
  assert.match(html, /More from this Agreement/);
  assert.match(html, /Documents/);
  assert.match(html, /Versions &amp; changes/);
  assert.doesNotMatch(html, /Fund now|Release now|Confirm completion/);
});
