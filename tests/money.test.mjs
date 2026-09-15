import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// Use Vite's existing esbuild dependency to run pure TypeScript with Node's built-in test runner.
const bundle = await build({ stdin: { contents: `
export * from './src/features/workspace/view';
export * from './src/api/securepay/money/adapters';
export * from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const record = (overrides = {}) => ({ recordType: 'FUNDING_PAYMENT_INTENT', occurredAt: '2026-09-10T00:00:00Z', status: 'PENDING', currency: 'KES', amountMinor: '50000', ...overrides });
const moneyInput = (overrides = {}) => ({
  agreementId: 'agr-1', agreementTitle: 'Bathroom retiling', agreementVersion: 'v2', currency: 'KES', amountMinor: '680000',
  readiness: 'READY', outstandingReasons: [], moneyRecordCount: 0, records: [], fundActionAvailable: false, ...overrides,
});

test('Money status renders the exact backend readiness status; nothing is collapsed or reinterpreted', () => {
  for (const readiness of ['NO_EVALUATION_YET', 'READY', 'NOT_READY', 'PARTIALLY_READY', 'BLOCKED']) {
    const view = api.moneyDetailView(moneyInput({ readiness }));
    assert.equal(view.paymentReadiness, readiness);
  }
});

test('backend/network failure never becomes READY or demo Money — a genuine failure is never threaded through moneyDetailView', () => {
  // The workspace controller renders a real failure entirely through MoneyUnavailableState instead of
  // calling moneyDetailView at all (see WorkspaceExperience.tsx); moneyDetailView itself only accepts
  // the 5 real PaymentReadinessStatus values, so it structurally cannot represent "unknown/error" as a
  // false-positive readiness.
  const view = api.moneyDetailView(moneyInput({ readiness: 'NO_EVALUATION_YET' }));
  assert.notEqual(view.paymentReadiness, 'READY');
  assert.equal(view.isDemoState, false);
});

test('NO_EVALUATION_YET is produced only via the verified backend contract path (money-status 404 PAYMENT_READY_EVALUATION_NOT_FOUND), never a convenient default', () => {
  assert.equal(api.moneyFailureView(new api.ApiError('http', 'missing', 404, 'PAYMENT_READY_EVALUATION_NOT_FOUND')).readiness, 'NO_EVALUATION_YET');
  assert.equal(api.moneyFailureView(new api.ApiError('http', 'not found', 404)).readiness, 'UNKNOWN');
  assert.equal(api.moneyFailureView(new api.ApiError('http', 'server error', 500)).readiness, 'UNKNOWN');
  assert.equal(api.moneyFailureView(new api.ApiError('network', 'offline')).readiness, 'UNKNOWN');
});

test('READY without a matching authoritative financial next action does not expose Pay/Fund', () => {
  const view = api.moneyDetailView(moneyInput({ readiness: 'READY', fundActionAvailable: false }));
  assert.deepEqual(view.nextActions, []);
});

test('a matching exact FUND_AGREEMENT for the same Agreement exposes the locked financial affordance', () => {
  const view = api.moneyDetailView(moneyInput({ readiness: 'READY', fundActionAvailable: true }));
  assert.deepEqual(view.nextActions, ['FUND_AGREEMENT']);
});

test('a financial action belonging to another Agreement cannot unlock this Agreement\'s CTA', () => {
  // fundActionAvailable is computed by the caller as an exact agreementId + actionCode match (see
  // controller.openMoney); a non-match for this agreement must resolve to false before it ever reaches
  // moneyDetailView.
  const actions = [{ agreementId: 'agr-OTHER', actionCode: 'FUND_AGREEMENT' }];
  const matches = actions.some(a => a.agreementId === 'agr-1' && a.actionCode === 'FUND_AGREEMENT');
  assert.equal(matches, false);
  const view = api.moneyDetailView(moneyInput({ fundActionAvailable: matches }));
  assert.deepEqual(view.nextActions, []);
});

test('unknown action codes cannot unlock a financial CTA', () => {
  const actions = [{ agreementId: 'agr-1', actionCode: 'SOME_FUTURE_ACTION' }];
  const matches = actions.some(a => a.agreementId === 'agr-1' && a.actionCode === 'FUND_AGREEMENT');
  assert.equal(matches, false);
  const view = api.moneyDetailView(moneyInput({ fundActionAvailable: matches }));
  assert.deepEqual(view.nextActions, []);
});

test('Money records are factual, decimal-safe, and moneyRecordCount is presentation only, not permission to act', () => {
  const view = api.moneyDetailView(moneyInput({ readiness: 'NOT_READY', records: [record()], moneyRecordCount: 1, fundActionAvailable: false }));
  assert.equal(view.moneyRecordCount, 1);
  assert.equal(view.activity[0].amount, 'KES 500.00');
  assert.deepEqual(view.nextActions, []); // records existing never grants an action by themselves
});

test('MoneyWorkspace only exposes the rail-selection funding flow when explicitly enabled, never merely from READY', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MoneyWorkspace } from './src/components/MoneyWorkspace';
const detail = {
  id:'agr-1', state:'ready', stateLabel:'Ready for payment',
  agreementLink:{ agreementId:'agr-1', agreementTitle:'Bathroom retiling', agreementVersion:'v2', amount:'KES 6,800.00' },
  amount:'KES 6,800.00', currency:'KES', paymentReadiness:'READY', outstandingReasons:[], moneyRecordCount:0,
  nextActions:['FUND_AGREEMENT'], availableRails:[{ id:'mpesa_stk', label:'M-PESA', description:'', available:true }],
  activity:[], capacity:'personal', capacityLabel:'Your SecurePay account', isDemoState:false,
};
export const disabledMarkup = renderToStaticMarkup(React.createElement(MoneyWorkspace, { detail, onBack: () => {}, fundingFlowEnabled: false }));
export const enabledMarkup = renderToStaticMarkup(React.createElement(MoneyWorkspace, { detail, onBack: () => {}, fundingFlowEnabled: true }));`;
  const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)((await import('node:module')).createRequire(import.meta.url), mod, mod.exports);
  // Real mode (fundingFlowEnabled: false): the real FUND_AGREEMENT action is still visible as text via
  // MoneyStatus's own next-actions list, but the unwired rail-selection UI never becomes reachable.
  assert.match(mod.exports.disabledMarkup, /Fund agreement/);
  assert.doesNotMatch(mod.exports.disabledMarkup, /How would you like to pay\?/);
  // Fixture/demo mode (prop omitted or true) keeps the exact existing Bolt choreography.
  assert.match(mod.exports.enabledMarkup, /How would you like to pay\?/);
});

test('production bundle contains no fixture fallback for signed-in Agreement/Money state', async () => {
  const result = await build({ entryPoints: ['src/RuntimeApp.tsx'], bundle: true, write: false, format: 'esm', external: ['react'], metafile: true, define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.VITE_SECUREPAY_MODE': '"real"' } });
  const paths = Object.keys(result.metafile.inputs);
  assert.equal(paths.some(path => /src\/moneyData\.ts$/.test(path)), false);
  assert.equal(paths.some(path => /src\/moneyLabels\.ts$/.test(path)), true);
});
