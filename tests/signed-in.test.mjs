import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

// Use Vite's existing esbuild dependency to run pure TypeScript with Node's built-in test runner.
const bundle = await build({ stdin: { contents: `
export * from './src/features/workspace/view';
export * from './src/features/workspace/controller';
export * from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const summary = (overrides = {}) => ({
  agreementId: 'agr-1', publicReference: 'AGR-1', title: 'Bathroom retiling', purpose: 'Retile the bathroom',
  status: 'PARTICIPANTS_JOINING', agreementType: 'SERVICE', proposedAmountMinor: '680000', currency: 'KES',
  createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-10T00:00:00Z',
  currentActor: { roleCode: 'CUSTOMER', participantStatus: 'CONFIRMED' },
  counterparty: { ksNumber: 'KS-2', displayName: 'Peter' },
  nextDeadline: null, attentionRequired: false, nextActions: [], currentAgreementVersionId: 'v-1',
  completion: { completed: false, status: 'IN_PROGRESS', reasonCodes: [], agreementVersionId: 'v-1', completedAt: null },
  ...overrides,
});
const action = (overrides = {}) => ({
  agreementId: 'agr-1', agreementReference: 'AGR-1', agreementTitle: 'Bathroom retiling',
  actionCode: 'FUND_AGREEMENT', category: 'FUND_AGREEMENT', reason: 'Funding is required to proceed', deadline: null,
  attentionClass: 'HIGH', ...overrides,
});
const hub = (overrides = {}) => ({
  needsMe: [], waitingOnOthers: [], takingShape: [], active: [], changedReviewRequired: [], completed: [], cancelled: [], expired: [],
  ...overrides,
});

test('backend Hub buckets are rendered without frontend reclassification', () => {
  const needsMeItem = summary({ agreementId: 'a1', status: 'PARTICIPANTS_JOINING' });
  const waitingItem = summary({ agreementId: 'a2', status: 'CONFIRMATION_PENDING' });
  const activeItem = summary({ agreementId: 'a3', status: 'PARTICIPANTS_JOINING' });
  const h = hub({ needsMe: [needsMeItem], waitingOnOthers: [waitingItem], active: [activeItem] });
  const list = api.hubAgreementSummaries(h);
  assert.deepEqual(list.map(a => a.status), ['waiting_for_me', 'waiting_for_other', 'active']);
});

test('CANCELLED/EXPIRED/completed are read straight off real fields, never a bucket guess', () => {
  assert.equal(api.boltAgreementStatus(summary({ status: 'CANCELLED' }), { kind: 'hub', bucket: 'active' }), 'cancelled');
  assert.equal(api.boltAgreementStatus(summary({ status: 'EXPIRED' }), { kind: 'hub', bucket: 'active' }), 'expired');
  assert.equal(api.boltAgreementStatus(summary({ completion: { completed: true, status: 'DONE', reasonCodes: [], agreementVersionId: 'v-1', completedAt: '2026-09-11T00:00:00Z' } }), { kind: 'hub', bucket: 'active' }), 'completed');
});

test('TAKING_SHAPE is never promoted to Agreement/ACTIVE by the frontend', () => {
  const takingShapeItem = summary({ agreementId: 'a1', status: 'DRAFT' });
  const list = api.hubAgreementSummaries(hub({ takingShape: [takingShapeItem] }));
  assert.equal(list[0].status, 'taking_shape');
  // Home-origin navigation never invents a richer bucket either — it only ever distinguishes the two
  // lists Home itself renders.
  assert.equal(api.boltAgreementStatus(takingShapeItem, { kind: 'home-attention' }), 'waiting_for_me');
  assert.equal(api.boltAgreementStatus(takingShapeItem, { kind: 'home-waiting' }), 'waiting_for_other');
});

test('signed-in Home renders real current-user actions and agreements only', () => {
  const items = api.attentionItemsView([action({ agreementId: 'a1' }), action({ agreementId: 'a2', actionCode: 'SUBMIT_EVIDENCE', reason: '' })]);
  assert.equal(items.length, 2);
  assert.equal(items[0].kind, 'agreement_action');
  assert.equal(items[0].detail, 'Funding is required to proceed');
  assert.equal(items[1].detail, 'Submit Evidence'); // humanized code used only when backend supplies no reason text
  assert.equal(items[1].agreementId, 'a2');

  const agreements = [summary({ agreementId: 'a1' }), summary({ agreementId: 'a2', completion: { completed: true, status: 'DONE', reasonCodes: [], agreementVersionId: 'v', completedAt: null } }), summary({ agreementId: 'a3', status: 'CANCELLED' })];
  const waiting = api.waitingItemsView(agreements, [action({ agreementId: 'a1' })]);
  // a1 has a real action (excluded from waiting), a2 is completed (excluded), a3 is cancelled (excluded).
  assert.deepEqual(waiting, []);
  const waiting2 = api.waitingItemsView([summary({ agreementId: 'a4' })], []);
  assert.equal(waiting2.length, 1);
  assert.equal(waiting2[0].agreementId, 'a4');
});

test('Agreement Detail is composed from the real backend detail projection; empty sections stay empty, not fabricated', () => {
  const dto = {
    overview: { agreementId: 'agr-1', publicReference: 'AGR-1', title: 'Bathroom retiling', purpose: 'Retile', description: 'Retile the bathroom', agreementType: 'SERVICE', status: 'PARTICIPANTS_JOINING', currency: 'KES', proposedAmountMinor: '680000', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-10T00:00:00Z', expiresAt: null },
    currentVersion: { versionId: 'v-1', versionNumber: 2, contentHash: 'hash', createdAt: '2026-09-05T00:00:00Z', amendmentReason: null, materialChange: false },
    participants: [{ participantId: 'p-1', roleCode: 'CUSTOMER', participantStatus: 'CONFIRMED', ksNumber: 'KS-1', displayName: 'James' }],
    milestones: [], terms: [], documents: [], activity: [],
    versionHistory: [{ versionId: 'v-1', versionNumber: 2, contentHash: 'hash', createdAt: '2026-09-05T00:00:00Z', amendmentReason: null, materialChange: false }],
    money: { status: 'NO_EVALUATION_YET', outstandingReasons: [], moneyRecordCount: 0 },
  };
  const confirmations = [{ participantId: 'p-1', identityId: 'i-1', roleCode: 'CUSTOMER', participantStatus: 'CONFIRMED', confirmedVersionId: 'v-1', confirmedVersionNumber: 2, currentVersionId: 'v-1', currentVersionNumber: 2, confirmationCurrent: true, reconfirmationRequired: false }];
  const view = api.agreementDetailView(dto, confirmations, 'active', { completed: false, completedAt: null });
  assert.equal(view.id, 'agr-1');
  assert.equal(view.version, 'v2');
  assert.deepEqual(view.documents, []);
  assert.deepEqual(view.conditions, []);
  assert.deepEqual(view.changes, []); // amendment diff is not a verified contract this slice
  assert.equal(view.versions[0].confirmedBy[0], 'James');
  assert.equal(view.versions[0].isCurrent, true);

  const progress = api.agreementProgressView(dto);
  assert.equal(progress.isSimple, true);
  assert.deepEqual(progress.milestones, []);
  assert.deepEqual(progress.actions, []);
});

test('unavailable/empty Detail sections never receive demo values — missing version/participants/milestones stay empty', () => {
  const dto = {
    overview: { agreementId: 'agr-2', publicReference: 'AGR-2', title: 'Untitled', purpose: '', description: '', agreementType: 'SERVICE', status: 'DRAFT', currency: 'KES', proposedAmountMinor: null, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', expiresAt: null },
    currentVersion: null, participants: [], milestones: [], terms: [], documents: [], activity: [], versionHistory: [],
    money: { status: 'NO_EVALUATION_YET', outstandingReasons: [], moneyRecordCount: 0 },
  };
  const view = api.agreementDetailView(dto, [], 'taking_shape', { completed: false, completedAt: null });
  assert.equal(view.version, '—');
  assert.deepEqual(view.people, []);
  assert.deepEqual(view.documents, []);
  assert.deepEqual(view.activity, []);
});

test('production build excludes fixture/demo sources and mockAgent from the signed-in workspace path', async () => {
  const result = await build({ entryPoints: ['src/RuntimeApp.tsx'], bundle: true, write: false, format: 'esm', external: ['react'], metafile: true, define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_SECUREPAY_MODE': '"real"' } });
  const paths = Object.keys(result.metafile.inputs);
  assert.equal(paths.some(path => /(?:mockAgent|moneyData|demoData|milestoneData|disputeData|src\/App\.tsx)/.test(path)), false);
  assert.equal(paths.some(path => /src\/features\/workspace\/(controller|view|WorkspaceExperience)\.tsx?$/.test(path)), true);
});

test('touched Home/Hub locked components retain byte-identical fixture markup against Bolt', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NeedsAttentionList } from './src/components/NeedsAttentionList';
import { WaitingOnOthersList } from './src/components/WaitingOnOthersList';
import { AgreementCard } from './src/components/AgreementCard';
const noop = () => {};
const attentionItems = [{ id:'x', kind:'agreement_changed', title:'t', detail:'d', actionLabel:'a', actionValue:'v', agreementId:'a1' }];
const waitingItems = [{ id:'y', title:'t', detail:'d', statusText:'s', agreementId:'a1' }];
const agreement = { id:'a1', title:'Bathroom retiling', counterparty:'Peter', counterpartyRole:'Provider', amount:'KES 1,000.00', completion:'—', status:'active', statusLabel:'Active', nextAction:'—', lastActivity:'14 Oct', lastActivityTime:'2:00 PM', version:'v1' };
export const markup = [
  React.createElement(NeedsAttentionList, { items: attentionItems, onOpenAgreement: noop }),
  React.createElement(WaitingOnOthersList, { items: waitingItems, onOpenAgreement: noop }),
  React.createElement(AgreementCard, { agreement, onOpen: noop }),
].map(renderToStaticMarkup);`;
  const touched = /src\/components\/(NeedsAttentionList|WaitingOnOthersList|AgreementCard)\.tsx$/;
  async function render(baseline) {
    const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', plugins: baseline ? [{ name: 'bolt', setup(builder) { builder.onLoad({ filter: touched }, args => ({ contents: execFileSync('git', ['show', `bolt-reference-pass11:${args.path.slice(process.cwd().length + 1)}`], { encoding: 'utf8' }), loader: 'tsx' })); } }] : [] });
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
    return mod.exports.markup;
  }
  // NeedsAttentionList uses a demo-only 'agreement_changed' kind here deliberately, so both the
  // pre-existing Bolt visual and the new real 'agreement_action' kind stay covered; this proves the
  // additive kind did not alter rendering for every kind that already existed in bolt-reference-pass11.
  assert.deepEqual(await render(false), await render(true));
});
