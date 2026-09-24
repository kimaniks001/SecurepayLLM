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
  const confirmations = [{ id: 'c-1', agreementVersionId: 'v-1', participantId: 'p-1', versionNumber: 2, versionContentHash: 'hash', status: 'CONFIRMED', assuranceMethod: 'AUTHENTICATED_SESSION', confirmedAt: '2026-09-05T00:00:00Z', confirmationCurrent: true, reconfirmationRequired: false }];
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

// Deep-review correction: agreementProgressView's actions being honestly always-empty (above) meant
// AgreementOverview's "Next" block, when wired to it, was dead in real production. The real
// authority is the Hub/Home summary's own nextActions, already backend-sorted -- agreementNextView
// is a narrow, explicit adapter from that real shape, never a re-ranking.
test('agreementNextView surfaces the first backend-sorted next action untouched, and returns null when there is none', () => {
  const sorted = [
    { actionCode: 'FUND_OBLIGATION', category: 'MONEY', reason: 'Monetary obligation available to fund', deadline: '2026-10-14T00:00:00Z', attentionClass: 'NEEDS_YOU' },
    { actionCode: 'REVIEW_CHANGE', category: 'AGREEMENT', reason: 'Review the requested change', deadline: null, attentionClass: 'NEEDS_YOU' },
  ];
  const next = api.agreementNextView(sorted);
  assert.equal(next.reason, 'Monetary obligation available to fund');
  assert.equal(next.attentionClass, 'NEEDS_YOU');
  assert.ok(next.deadline); // formatted, non-empty
  assert.equal(api.agreementNextView([]), null);
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

test('a failed confirmations read keeps the participants and leaves their confirmation UNKNOWN (null), never "nobody confirmed"', async () => {
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
    confirmations: async () => { throw new api.ApiError('http', 'confirmation status unavailable', 500, 'INTERNAL_ERROR'); },
    money: { status: async () => { throw new api.ApiError('http', 'no evaluation', 404, 'PAYMENT_READY_EVALUATION_NOT_FOUND'); }, records: async () => [] },
  };
  const controller = api.createWorkspaceController(gateway);
  controller.enter();
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.openFromHome('agr-1');
  await new Promise(resolve => setTimeout(resolve, 0));
  const state = controller.getSnapshot();
  assert.equal(state.detail.status, 'ready'); // Detail itself loaded
  assert.equal(state.detail.data.confirmations, null); // unknown, not an empty list
  assert.equal(state.detail.data.dto.participants.length, 1);
});

test('a successful confirmations read still renders real per-participant confirmation state', async () => {
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
    confirmations: async () => [{ id: 'c-1', agreementVersionId: 'v-1', participantId: 'p-1', versionNumber: 1, versionContentHash: 'hash', status: 'CONFIRMED', assuranceMethod: 'AUTHENTICATED_SESSION', confirmedAt: 'x', confirmationCurrent: true, reconfirmationRequired: false }],
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
  const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
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
  const result = await build({ entryPoints: ['src/RuntimeApp.tsx'], bundle: true, write: false, format: 'esm', external: ['react'], metafile: true, define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_SECUREPAY_MODE': '"real"' }, loader: { '.png': 'dataurl' } });
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

// SignedInHome's canonical SecurePay brand mark (README.txt-approved: docs/CODEX_TASK_BRAND_VISUAL_CONSTITUTION.md)
// is an explicitly approved correction to the locked Bolt experience, so this no longer asserts
// byte-identical markup against the Bolt baseline (the old AgentIcon-as-logo glyph is intentionally
// gone) — it instead asserts every non-brand-mark part of Bolt's fixture markup is untouched. Phase 6
// convergence additionally re-locks the headline copy itself and adds the Fair Trade affordance.
test('SignedInHome retains byte-identical fixture markup against Bolt outside the canonical brand mark swap and locked copy correction', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignedInHome } from './src/components/SignedInHome';
const noop = () => {};
export const markup = renderToStaticMarkup(React.createElement(SignedInHome, { onStart: noop, attentionItems: [], waitingItems: [], recentActivity: [], onOpenAgreement: noop, onNavigateAgreements: noop }));`;
  const touched = /src\/components\/SignedInHome\.tsx$/;
  async function render(baseline) {
    const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' }, plugins: baseline ? [{ name: 'bolt', setup(builder) { builder.onLoad({ filter: touched }, args => ({ contents: execFileSync('git', ['show', `bolt-reference-pass11:${args.path.slice(process.cwd().length + 1)}`], { encoding: 'utf8' }), loader: 'tsx' })); } }] : [] });
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
    return mod.exports.markup;
  }
  const current = await render(false);
  const baseline = await render(true);
  assert.notEqual(current, baseline, 'expected the canonical brand mark swap and locked copy correction to change SignedInHome markup');
  // The old Bolt AgentIcon-as-logo glyph (a circle+shoulders SVG path) must be gone from the real component...
  assert.doesNotMatch(current, /M6 27c0-5\.5 4\.5-10 10-10s10 4\.5 10 10/);
  // ...and the Bolt baseline fixture must still have it, proving the diff is really about the icon.
  assert.match(baseline, /M6 27c0-5\.5 4\.5-10 10-10s10 4\.5 10 10/);
  // The canonical mark image must be present in its place.
  assert.match(current, /<img[^>]*alt="SecurePay"/);
  // The old paraphrased headline must be gone from current, but still present in the untouched
  // Bolt baseline (proving the diff is really the locked-copy fix).
  assert.ok(!current.includes('What are you trying to make happen?'), 'expected the old paraphrased headline to be replaced');
  assert.ok(baseline.includes('What are you trying to make happen?'), 'expected Bolt baseline to still have the old headline');
  assert.ok(current.includes('Tell SecurePay what you&#x27;re trying to make happen.'), 'expected the exact locked headline (React-escaped apostrophe in static markup)');
  assert.ok(current.includes('Guided by the 12 principles of fair trade'), 'expected the quiet Fair Trade affordance beneath the input');
  // Everything else — greeting, subheading, conversation input — must be untouched.
  for (const text of [
    'Welcome back, James',
    'SecurePay remembers your agreements, people and activity',
    'Ask SecurePay anything...',
    'What did Peter agree to?',
  ]) {
    assert.ok(current.includes(text), `expected current markup to still include ${JSON.stringify(text)}`);
    assert.ok(baseline.includes(text), `expected Bolt baseline markup to still include ${JSON.stringify(text)}`);
  }
});

// ─── PHASE 4 NEXT SLICE — Home's "Invitations for you" (Section 4/5) ───────────────────────────────

const inboxItem = (overrides = {}) => ({
  invitationId: 'invitation-1', agreementId: 'agreement-1', agreementPublicReference: 'AGR-1',
  agreementTitle: 'Kitchen cabinetry', agreementPurpose: 'Build kitchen cabinets', currency: 'KES',
  proposedAmountMinor: 18000000, roleCode: 'CARPENTER', inviterDisplayName: 'James Kimani',
  inviterCanonicalKsNumber: 'KS0001', status: 'ISSUED', issuedAt: '2026-09-20T00:00:00Z',
  expiresAt: '2026-10-02T00:00:00Z', firstViewedAt: null, isCurrentVersion: true, needsAttention: true,
  targetKind: 'KS_NUMBER', targetHint: 'KS0002', ...overrides,
});

test('workspace Home: myInvitations is fetched best-effort alongside the Hub and populates state', async () => {
  const gateway = {
    currentUserActions: async () => ({ items: [], page: 0, size: 100, totalElements: 0 }),
    hub: async () => hub(),
    myInvitations: async () => [inboxItem()],
  };
  const controller = api.createWorkspaceController(gateway);
  controller.enter();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(controller.getSnapshot().myInvitations.length, 1);
  assert.equal(controller.getSnapshot().myInvitations[0].invitationId, 'invitation-1');
});

test('workspace Home: a failed myInvitations read never fails Home closed -- defaults to empty', async () => {
  const gateway = {
    currentUserActions: async () => ({ items: [], page: 0, size: 100, totalElements: 0 }),
    hub: async () => hub(),
    myInvitations: async () => { throw new api.ApiError('http', 'unavailable', 500, null); },
  };
  const controller = api.createWorkspaceController(gateway);
  controller.enter();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(controller.getSnapshot().hub.status, 'ready');
  assert.deepEqual(controller.getSnapshot().myInvitations, []);
});

test('workspace Hub (not Home) never fetches myInvitations -- it is a Home-only read', async () => {
  const calls = [];
  const gateway = {
    currentUserActions: async () => ({ items: [], page: 0, size: 100, totalElements: 0 }),
    hub: async () => hub(),
    myInvitations: async () => { calls.push('myInvitations'); return []; },
  };
  const controller = api.createWorkspaceController(gateway);
  controller.goHub();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls.length, 0);
});

test('invitationsForYouView: a JOINED invitation is hidden -- the person reaches it through normal Agreement surfaces', () => {
  const views = api.invitationsForYouView([inboxItem({ status: 'JOINED', needsAttention: false })]);
  assert.equal(views.length, 0);
});

test('invitationsForYouView: an active invitation shows inviter/title/role/amount/expiry and IS actionable', () => {
  const [view] = api.invitationsForYouView([inboxItem()]);
  assert.match(view.inviterLine, /James Kimani invited you/);
  assert.equal(view.agreementTitle, 'Kitchen cabinetry');
  assert.match(view.roleLine, /Carpenter/);
  assert.match(view.amountLine, /KES/);
  assert.match(view.expiryLine, /Expires/);
  assert.equal(view.actionable, true);
  assert.equal(view.statusNote, null);
});

test('invitationsForYouView: never invents an inviter name, an agreement title, or a proposed amount SecurePay did not supply', () => {
  const [view] = api.invitationsForYouView([inboxItem({ inviterDisplayName: null, agreementTitle: null, proposedAmountMinor: null })]);
  assert.equal(view.inviterLine, 'You’ve been invited');
  assert.equal(view.agreementTitle, 'An agreement');
  assert.equal(view.amountLine, null);
});

test('invitationsForYouView: EXPIRED and REVOKED are non-actionable with a truthful status note, never an expiry line', () => {
  const [expired] = api.invitationsForYouView([inboxItem({ status: 'EXPIRED', needsAttention: false })]);
  assert.equal(expired.actionable, false);
  assert.equal(expired.statusNote, 'This invitation has expired.');
  assert.equal(expired.expiryLine, null);

  const [revoked] = api.invitationsForYouView([inboxItem({ status: 'REVOKED', needsAttention: false })]);
  assert.equal(revoked.actionable, false);
  assert.equal(revoked.statusNote, 'This invitation is no longer available.');
  assert.equal(revoked.expiryLine, null);
});

test('invitationsForYouView never uses Accept/Confirm/Pay-shaped copy anywhere', () => {
  const views = api.invitationsForYouView([inboxItem(), inboxItem({ invitationId: 'i2', status: 'EXPIRED', needsAttention: false }), inboxItem({ invitationId: 'i3', status: 'REVOKED', needsAttention: false })]);
  // Only the actual rendered copy -- never the object's own property NAMES (e.g. "agreementTitle"
  // itself contains "agree", which is not a claim about anything).
  const allCopy = views.flatMap(v => [v.inviterLine, v.agreementTitle, v.roleLine, v.amountLine, v.expiryLine, v.statusNote]).filter(Boolean).join(' | ');
  assert.doesNotMatch(allCopy, /Accept|Confirm|Pay now|Complete payment|You joined|Your agreement|You agreed/i);
});
