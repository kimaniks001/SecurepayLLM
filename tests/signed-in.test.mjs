import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

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
const nextAction = (overrides = {}) => ({ actionCode: 'FUND_AGREEMENT', category: 'FUND_AGREEMENT', reason: 'Funding is required to proceed', deadline: null, attentionClass: 'HIGH', ...overrides });
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
  // The only status origin left is the real backend bucket itself — there is no separate Home-derived
  // classification that could promote a DRAFT/taking-shape Agreement into something else.
  assert.equal(api.boltAgreementStatus(takingShapeItem, { kind: 'hub', bucket: 'takingShape' }), 'taking_shape');
});

// ─── Home must use backend Hub classification (regression for PR #7 review) ─────────────────────────

test('A. Home never reclassifies a DRAFT/TAKING_SHAPE Agreement into Needs you or Waiting on others', () => {
  const draft = summary({ agreementId: 'a1', status: 'DRAFT' });
  // Home's two lists only ever receive the changedReviewRequired/needsMe/waitingOnOthers bucket arrays
  // (see WorkspaceExperience.tsx); a taking-shape Agreement that is not in any of those cannot appear.
  assert.deepEqual(api.attentionItemsFromHub([], []), []);
  assert.deepEqual(api.waitingItemsFromHub([]), []);
  // Even if a caller mistakenly fed the takingShape bucket into the waiting list, nothing here
  // reclassifies it — it renders exactly the item given, but the real call site (WorkspaceExperience)
  // never feeds it takingShape at all, only the real waitingOnOthers bucket.
  const rendered = api.waitingItemsFromHub([draft]);
  assert.equal(rendered.length, 1); // proves this function trusts its input, not a reclassification bug
  assert.deepEqual(api.hubAgreementSummaries(hub({ takingShape: [draft] })).map(a => a.status), ['taking_shape']);
});

test('B. ACTIVE with no current-user action is never shown as "waiting on others" merely from action absence', () => {
  const activeNoAction = summary({ agreementId: 'a1', status: 'PARTICIPANTS_JOINING', nextActions: [] });
  // Home's waiting list is fed ONLY the backend's real waitingOnOthers bucket; an ACTIVE-bucket item is
  // never passed to it, so it can never surface there just because it happens to have no action.
  const activeBucketOnly = hub({ active: [activeNoAction] });
  assert.deepEqual(api.waitingItemsFromHub(activeBucketOnly.waitingOnOthers), []);
  assert.deepEqual(api.hubAgreementSummaries(activeBucketOnly).map(a => a.status), ['active']);
});

test('C. Waiting on others comes only from the real backend bucket, rendered as-is', () => {
  const item = summary({ agreementId: 'a1', status: 'CONFIRMATION_PENDING' });
  const items = api.waitingItemsFromHub([item]);
  assert.equal(items.length, 1);
  assert.equal(items[0].agreementId, 'a1');
  assert.equal(items[0].statusText, 'Confirmation Pending');
});

test('D. A passive wait action does not create a "Needs you" item', () => {
  const passiveOnly = summary({ agreementId: 'a1', nextActions: [nextAction({ actionCode: 'WAIT_FOR_DEPENDENCY' }), nextAction({ actionCode: 'WAIT_UNTIL_AVAILABLE' }), nextAction({ actionCode: 'NO_ACTION_REQUIRED' })] });
  assert.deepEqual(api.attentionItemsFromHub([], [passiveOnly]), []);
  const mixed = summary({ agreementId: 'a2', nextActions: [nextAction({ actionCode: 'WAIT_FOR_DEPENDENCY' }), nextAction({ actionCode: 'FUND_AGREEMENT' })] });
  const items = api.attentionItemsFromHub([], [mixed]);
  assert.equal(items.length, 1);
  assert.equal(items[0].actionValue, 'FUND_AGREEMENT');
});

// ─── CHANGED_REVIEW_REQUIRED must surface on Home Needs you, not disappear (regression for PR #7 review) ─

test('E1. RECONFIRM_AGREEMENT_VERSION / changed-review appears in Home Needs you, sourced from the real changedReviewRequired bucket', () => {
  const changed = summary({ agreementId: 'a1', title: 'Catering — Grace', status: 'CONFIRMATION_PENDING', nextActions: [nextAction({ actionCode: 'RECONFIRM_AGREEMENT_VERSION', reason: 'The agreement changed and needs your reconfirmation' })] });
  const items = api.attentionItemsFromHub([changed], []);
  assert.equal(items.length, 1);
  assert.equal(items[0].agreementId, 'a1');
  assert.equal(items[0].title, 'Catering — Grace');
  assert.equal(items[0].detail, 'The agreement changed and needs your reconfirmation');
  assert.equal(items[0].actionValue, 'RECONFIRM_AGREEMENT_VERSION');
});

test('E2. a changed-review item uses the distinct agreement_changed kind, not the generic agreement_action kind', () => {
  const changed = summary({ agreementId: 'a1', nextActions: [nextAction({ actionCode: 'RECONFIRM_AGREEMENT_VERSION', reason: 'Changed' })] });
  const needsMeItem = summary({ agreementId: 'a2', nextActions: [nextAction({ actionCode: 'FUND_AGREEMENT' })] });
  const items = api.attentionItemsFromHub([changed], [needsMeItem]);
  assert.equal(items.find(i => i.agreementId === 'a1').kind, 'agreement_changed');
  assert.equal(items.find(i => i.agreementId === 'a2').kind, 'agreement_action');
});

test('E3. a changed-review Agreement does not appear in Waiting on others', () => {
  const changed = summary({ agreementId: 'a1', status: 'CONFIRMATION_PENDING', nextActions: [nextAction({ actionCode: 'RECONFIRM_AGREEMENT_VERSION' })] });
  const h = hub({ changedReviewRequired: [changed] });
  // Waiting on others is sourced only from the real waitingOnOthers bucket — changedReviewRequired is
  // never fed into it, matching the mutually exclusive bucket the backend itself put this Agreement in.
  assert.deepEqual(api.waitingItemsFromHub(h.waitingOnOthers), []);
});

test('E4. opening a changed-review Home item resolves through the real Hub lookup and preserves change_requested into Agreement Detail', () => {
  const changed = summary({ agreementId: 'a1', status: 'CONFIRMATION_PENDING', nextActions: [nextAction({ actionCode: 'RECONFIRM_AGREEMENT_VERSION' })] });
  const h = hub({ changedReviewRequired: [changed] });
  const found = api.findInHub(h, 'a1');
  assert.ok(found);
  assert.deepEqual(found.origin, { kind: 'hub', bucket: 'changedReviewRequired' });
  assert.equal(api.boltAgreementStatus(found.summary, found.origin), 'change_requested');
});

test('F. changedReviewRequired takes priority and is never duplicated if the same Agreement is also (incorrectly) present in needsMe', () => {
  const overlapping = summary({ agreementId: 'a1', nextActions: [nextAction({ actionCode: 'RECONFIRM_AGREEMENT_VERSION', reason: 'Changed' }), nextAction({ actionCode: 'FUND_AGREEMENT' })] });
  const items = api.attentionItemsFromHub([overlapping], [overlapping]);
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'agreement_changed');
});

test('G. changedReviewRequired without a real RECONFIRM_AGREEMENT_VERSION action does not synthesize one and emits no actionable Home item', () => {
  // Bucket membership and the summary's own nextActions have drifted (malformed backend response) —
  // no RECONFIRM_AGREEMENT_VERSION action actually exists on this Agreement.
  const driftedNoAction = summary({ agreementId: 'a1', nextActions: [] });
  assert.deepEqual(api.attentionItemsFromHub([driftedNoAction], []), []);
  const driftedOtherAction = summary({ agreementId: 'a2', nextActions: [nextAction({ actionCode: 'SUBMIT_EVIDENCE', reason: 'Unrelated' })] });
  assert.deepEqual(api.attentionItemsFromHub([driftedOtherAction], []), []);
  // A normal, valid changedReviewRequired item (real RECONFIRM_AGREEMENT_VERSION present) is unaffected.
  const valid = summary({ agreementId: 'a3', nextActions: [nextAction({ actionCode: 'RECONFIRM_AGREEMENT_VERSION', reason: 'Changed' })] });
  const items = api.attentionItemsFromHub([driftedNoAction, driftedOtherAction, valid], []);
  assert.equal(items.length, 1);
  assert.equal(items[0].agreementId, 'a3');
  assert.equal(items[0].kind, 'agreement_changed');
});

test('H. malformed changedReviewRequired+needsMe overlap still resolves through findInHub as changedReviewRequired, preserving change_requested', () => {
  const overlapping = summary({ agreementId: 'a1', status: 'CONFIRMATION_PENDING', nextActions: [nextAction({ actionCode: 'RECONFIRM_AGREEMENT_VERSION', reason: 'Changed' }), nextAction({ actionCode: 'FUND_AGREEMENT' })] });
  const h = hub({ changedReviewRequired: [overlapping], needsMe: [overlapping] });
  const found = api.findInHub(h, 'a1');
  assert.ok(found);
  assert.equal(found.origin.bucket, 'changedReviewRequired');
  assert.equal(api.boltAgreementStatus(found.summary, found.origin), 'change_requested');
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

// ─── Confirmation-status must fail closed (regression for PR #7 review) ─────────────────────────────

test('a failed confirmation-status read fails Agreement Detail closed instead of rendering an empty-but-authoritative confirmation list', async () => {
  const detailDto = {
    overview: { agreementId: 'agr-1', publicReference: 'AGR-1', title: 'Bathroom retiling', purpose: 'Retile', description: '', agreementType: 'SERVICE', status: 'PARTICIPANTS_JOINING', currency: 'KES', proposedAmountMinor: '680000', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-10T00:00:00Z', expiresAt: null },
    currentVersion: { versionId: 'v-1', versionNumber: 1, contentHash: 'hash', createdAt: '2026-09-01T00:00:00Z', amendmentReason: null, materialChange: false },
    participants: [{ participantId: 'p-1', roleCode: 'CUSTOMER', participantStatus: 'CONFIRMED', ksNumber: 'KS-1', displayName: 'James' }],
    milestones: [], terms: [], documents: [], activity: [], versionHistory: [],
    money: { status: 'NO_EVALUATION_YET', outstandingReasons: [], moneyRecordCount: 0 },
  };
  const needsMeItem = summary({ agreementId: 'agr-1' });
  const gateway = {
    currentUserActions: async () => ({ items: [], page: 0, size: 100, totalElements: 0 }),
    hub: async () => hub({ needsMe: [needsMeItem] }),
    detail: async () => detailDto,
    confirmationStatus: async () => { throw new api.ApiError('http', 'confirmation status unavailable', 500, 'INTERNAL_ERROR'); },
    money: { status: async () => { throw new api.ApiError('http', 'no evaluation', 404, 'PAYMENT_READY_EVALUATION_NOT_FOUND'); }, records: async () => [] },
  };
  const controller = api.createWorkspaceController(gateway);
  controller.enter();
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.openFromHome('agr-1');
  await new Promise(resolve => setTimeout(resolve, 0));
  const state = controller.getSnapshot();
  assert.equal(state.detail.status, 'error');
  // The failure must never be silently swallowed into an empty confirmations array that then renders
  // as though every participant's confirmation state were authoritatively known.
  assert.notEqual(state.detail.status, 'ready');
});

test('a successful confirmation-status read still renders real per-participant confirmation state', async () => {
  const detailDto = {
    overview: { agreementId: 'agr-1', publicReference: 'AGR-1', title: 'Bathroom retiling', purpose: 'Retile', description: '', agreementType: 'SERVICE', status: 'PARTICIPANTS_JOINING', currency: 'KES', proposedAmountMinor: '680000', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-10T00:00:00Z', expiresAt: null },
    currentVersion: { versionId: 'v-1', versionNumber: 1, contentHash: 'hash', createdAt: '2026-09-01T00:00:00Z', amendmentReason: null, materialChange: false },
    participants: [{ participantId: 'p-1', roleCode: 'CUSTOMER', participantStatus: 'CONFIRMED', ksNumber: 'KS-1', displayName: 'James' }],
    milestones: [], terms: [], documents: [], activity: [], versionHistory: [],
    money: { status: 'NO_EVALUATION_YET', outstandingReasons: [], moneyRecordCount: 0 },
  };
  const needsMeItem = summary({ agreementId: 'agr-1' });
  const gateway = {
    currentUserActions: async () => ({ items: [], page: 0, size: 100, totalElements: 0 }),
    hub: async () => hub({ needsMe: [needsMeItem] }),
    detail: async () => detailDto,
    confirmationStatus: async () => [{ participantId: 'p-1', identityId: 'i-1', roleCode: 'CUSTOMER', participantStatus: 'CONFIRMED', confirmedVersionId: 'v-1', confirmedVersionNumber: 1, currentVersionId: 'v-1', currentVersionNumber: 1, confirmationCurrent: true, reconfirmationRequired: false }],
    money: { status: async () => { throw new api.ApiError('http', 'no evaluation', 404, 'PAYMENT_READY_EVALUATION_NOT_FOUND'); }, records: async () => [] },
  };
  const controller = api.createWorkspaceController(gateway);
  controller.enter();
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.openFromHome('agr-1');
  await new Promise(resolve => setTimeout(resolve, 0));
  const state = controller.getSnapshot();
  assert.equal(state.detail.status, 'ready');
  assert.equal(state.detail.data.confirmations[0].confirmationCurrent, true);
});

// ─── Detail's inline Money summary must not use stale cached Home actions (regression for PR #7) ────

test('Detail\'s inline Money summary never claims a financial next action from cached Home state', async () => {
  const source = await readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8');
  assert.doesNotMatch(source, /state\.home\b/);
  assert.match(source, /fundActionAvailable:\s*false/);
});

test('SignedInHome preserves the exact Bolt fixture greeting/subheading/prompts when props are omitted, and real mode never hardcodes a person name', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignedInHome } from './src/components/SignedInHome';
const noop = () => {};
export const fixtureMarkup = renderToStaticMarkup(React.createElement(SignedInHome, { onStart: noop, attentionItems: [], waitingItems: [], recentActivity: [], onOpenAgreement: noop, onNavigateAgreements: noop }));
export const realMarkup = renderToStaticMarkup(React.createElement(SignedInHome, { onStart: noop, attentionItems: [], waitingItems: [], recentActivity: [], onOpenAgreement: noop, onNavigateAgreements: noop, greeting: 'Welcome back', subheading: 'Ask anything, or start something new.', suggestedPrompts: ['Help me set up a new trade'] }));`;
  const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  assert.match(mod.exports.fixtureMarkup, /Welcome back, James/);
  assert.match(mod.exports.fixtureMarkup, /SecurePay remembers your agreements, people and activity/);
  assert.match(mod.exports.fixtureMarkup, /What did Peter agree to\?/);
  assert.doesNotMatch(mod.exports.realMarkup, /James/);
  assert.doesNotMatch(mod.exports.realMarkup, /remembers your agreements/);
  assert.doesNotMatch(mod.exports.realMarkup, /What did Peter agree to\?/);
  assert.match(mod.exports.realMarkup, /Welcome back</);
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

test('SignedInHome retains byte-identical fixture markup against Bolt when the new greeting/subheading/prompts props are omitted', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignedInHome } from './src/components/SignedInHome';
const noop = () => {};
export const markup = renderToStaticMarkup(React.createElement(SignedInHome, { onStart: noop, attentionItems: [], waitingItems: [], recentActivity: [], onOpenAgreement: noop, onNavigateAgreements: noop }));`;
  const touched = /src\/components\/SignedInHome\.tsx$/;
  async function render(baseline) {
    const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', plugins: baseline ? [{ name: 'bolt', setup(builder) { builder.onLoad({ filter: touched }, args => ({ contents: execFileSync('git', ['show', `bolt-reference-pass11:${args.path.slice(process.cwd().length + 1)}`], { encoding: 'utf8' }), loader: 'tsx' })); } }] : [] });
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
    return mod.exports.markup;
  }
  assert.deepEqual(await render(false), await render(true));
});
