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
  overview: { title: 'Retile bathroom', purpose: 'A safe, usable bathroom', description: 'Supply and install tiles.' },
  currentVersion: { versionNumber: 3 },
  milestones: [{ milestoneId: 'delivery', title: 'Deliver tiles', dueAt: null }, { milestoneId: 'install', title: 'Install tiles', dueAt: null }],
  documents: [],
};
const render = (overrides = {}) => renderToStaticMarkup(React.createElement(LivingAgreementOverview, {
  detail, effectiveStates: null, completion: null,
  onProgress() {}, onPeople() {}, onDocuments() {}, onChanges() {}, onMoney() {}, ...overrides,
}));

test('unknown projections stay unavailable even when a milestone has a stored completed status', () => {
  const html = render({ detail: { ...detail, milestones: [{ ...detail.milestones[0], status: 'COMPLETED' }] } });
  assert.match(html, /Live status unavailable/);
  assert.match(html, /Completion status unavailable/);
  assert.doesNotMatch(html, /Agreement completed/);
});

test('milestones use live authority and name dependency only from the supplied projection', () => {
  const html = render({ effectiveStates: [{ milestoneId: 'delivery', state: 'COMPLETED', reason: null }, { milestoneId: 'install', state: 'WAITING', reason: 'waiting on milestone(s): 11111111-1111-1111-1111-111111111111' }] });
  assert.match(html, /Completed/);
  assert.match(html, /Waiting/);
  assert.match(html, /Waiting on another milestone/);
  assert.doesNotMatch(html, /11111111/);
});

test('arrival reveals purpose and exact version with routes to existing authority controls', () => {
  const html = render();
  assert.match(html, /A safe, usable bathroom/);
  assert.match(html, /Current version 3/);
  assert.match(html, /Open work, conditions &amp; evidence/);
  assert.match(html, /Agreement Money/);
  assert.doesNotMatch(html, /Fund now|Release now|Confirm completion/);
});

test('whole Agreement completion requires its projection, never the milestone count', () => {
  assert.match(render({ completion: { completed: true, status: 'COMPLETED', completedAt: null, reasonCodes: [] } }), /Agreement completed/);
  assert.match(render({ completion: { completed: false, status: 'UNSUPPORTED', completedAt: null, reasonCodes: [] } }), /doesn’t evaluate completion/);
});


test('authoritative participant next actions are visible without inventing permissions', () => {
  const html = render({ nextActions: [{ actionCode: 'SUBMIT_EVIDENCE', category: 'WORK', reason: 'Upload delivery evidence', deadline: '2026-10-10T00:00:00Z', attentionClass: 'ACTION_REQUIRED' }] });
  assert.match(html, /What needs you next/);
  assert.match(html, /Upload delivery evidence/);
  assert.match(html, /ACTION REQUIRED/i);
  assert.match(html, /(?:10 Oct 2026|Oct 10, 2026)/);
  assert.doesNotMatch(html, /Submit evidence now|Approve|Release money/);
});
