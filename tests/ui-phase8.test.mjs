import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
// UI Phase 8 -- Agreement Money authority, funding, Payment Ready, release and settlement truth. Contracts were read in SecurePayAPI (read-only);
// the API is not run. Rendering is SSR (no effects), so effect-driven panel reads are asserted through source + pure mappers.
const bundle = await build({ stdin: { contents: `
export * from './src/features/money/amount';
export * from './src/features/money/attempt';
export * from './src/features/money/display';
export * from './src/features/money/handoff';
export { MONEY_AUTHENTICATED_METHODS } from './src/api/securepay/money-refresh';
export { MoneyDoorway } from './src/features/money/MoneyDoorway';
export { PaymentReadyPanel, FundingPanel, ActivityPanel, ReleasePanel } from './src/features/money/AgreementMoneyPanels';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const m = mod.exports;
const src = p => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const html = (c, p) => m.renderToStaticMarkup(m.createElement(c, p));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

test('convergence: the Agreement Money view is a doorway, not a third Money experience', async () => {
  const ws = await src('src/features/workspace/WorkspaceExperience.tsx');
  assert.doesNotMatch(ws, /<MoneyWorkspace/);
  assert.match(ws, /<MoneyDoorway/);
  const out = text(html(m.MoneyDoorway, { title: 'Kitchen renovation', versionLabel: 'version 2', canOpen: true, onOpen() {}, onBack() {} }));
  assert.match(out, /Kitchen renovation · version 2/);
  assert.match(out, /Open Money/);
  assert.doesNotMatch(out, /Fund|Pay now|Release/);
});

test('handoff is in memory, one non-secret route, and the context line is human', async () => {
  const handoff = await src('src/features/money/handoff.ts');
  assert.doesNotMatch(handoff, /localStorage|sessionStorage|URLSearchParams|\?agreement|history\.(push|replace)State/);
  assert.match(handoff, /window\.location\.hash = '#\/money'/);
  m.setMoneyHandoff({ agreementId: 'a-1', title: 'Kitchen renovation', versionLabel: 'version 2' });
  assert.equal(m.peekMoneyHandoff().agreementId, 'a-1');
  assert.equal(m.takeMoneyHandoff().agreementId, 'a-1');
  assert.equal(m.takeMoneyHandoff(), null);
  assert.equal(m.contextLine({ title: 'Kitchen renovation', versionLabel: 'version 2' }), 'Kitchen renovation · version 2');
  assert.equal(m.contextLine({ title: 'K', versionLabel: null }), 'K');
});

test('exact decimal parsing: rejects exponent, NaN, Infinity, negatives, excess precision and unsafe integers; never rounds', () => {
  const ok = s => m.parseMinorUnits(s);
  assert.deepEqual(ok('1500'), { ok: true, minor: 150000 });
  assert.deepEqual(ok('1500.5'), { ok: true, minor: 150050 });
  assert.deepEqual(ok('0.07'), { ok: true, minor: 7 });
  assert.deepEqual(ok('19.99'), { ok: true, minor: 1999 }); // Math.round(19.99*100) territory; exact here
  for (const bad of ['1e3', 'NaN', 'Infinity', '-5', '+5', '1,000', '1.', '.5', ' ', 'abc', '0x10']) assert.equal(ok(bad).ok, false, bad);
  assert.equal(ok('1.234').reason, 'too-precise');
  assert.equal(ok('0').reason, 'zero');
  assert.equal(ok('99999999999999999').ok, false);
  assert.equal(ok('999999999999999').reason, 'too-large');
  assert.equal(ok('9999999999999999').ok, false);
});

test('every Money amount that arrives as a string is parsed strictly, never coerced', () => {
  assert.equal(m.minorFromString('1500'), 1500);
  assert.equal(m.minorFromString('1e3'), null);
  assert.equal(m.minorFromString('-1'), null);
  assert.equal(m.minorFromString('9007199254740993'), null);
  assert.equal(m.minorFromString(null), null);
});

test('one logical attempt = one idempotency key; a different request gets a different key only after the first is settled', () => {
  let n = 0; const store = m.createAttemptStore(() => `k${++n}`);
  assert.equal(store.keyFor('a'), 'k1');
  assert.equal(store.keyFor('a'), 'k1'); // retry after uncertain outcome
  store.settle();
  assert.equal(store.keyFor('a'), 'k2'); // a new explicit attempt
});

test('gateways never mint keys: every Money mutation takes a caller-supplied Idempotency-Key', async () => {
  for (const f of ['money-authority', 'payment-intent', 'settlement-destinations', 'fx-application', 'business-fx-application', 'money-session']) {
    const s = await src(`src/api/securepay/${f}/index.ts`);
    assert.doesNotMatch(s, /freshIdempotencyKey|randomUUID/, f);
    assert.match(s, /Idempotency-Key|idempotencyKey: idempotencyKey/, f);
  }
});

test('drift guard: every authenticated Money gateway method is in MONEY_AUTHENTICATED_METHODS (and no others)', async () => {
  const dirs = { money: 'money', moneyAuthority: 'money-authority', paymentIntent: 'payment-intent', paymentRelease: 'payment-release', settlementDestinations: 'settlement-destinations',
    moneySession: 'money-session', moneyOperations: 'money-operations', currencyCapability: 'currency-capability', fxApplication: 'fx-application', regulatedAccounts: 'regulated-accounts',
    businessCurrencyCapability: 'business-currency-capability', businessFxApplication: 'business-fx-application', financialPartners: 'financial-partners' };
  assert.deepEqual(Object.keys(dirs).sort(), Object.keys(m.MONEY_AUTHENTICATED_METHODS).sort());
  for (const [key, dir] of Object.entries(dirs)) {
    const s = await src(`src/api/securepay/${dir}/index.ts`);
    const body = s.slice(s.indexOf('return {'));
    const declared = [...new Set([...body.matchAll(/^\s{4}(\w+): /gm)].map(x => x[1]))];
    assert.deepEqual([...declared].sort(), [...m.MONEY_AUTHENTICATED_METHODS[key]].sort(), `${key} gateway methods vs table`);
    assert.doesNotMatch(s, /auth: 'none'|auth: 'optional'/, `${key} has an unauthenticated method the table would wrongly refresh`);
  }
  const runtime = await src('src/RuntimeApp.tsx');
  for (const key of Object.keys(m.MONEY_AUTHENTICATED_METHODS)) assert.match(runtime, new RegExp(`MONEY_AUTHENTICATED_METHODS\\.${key}\\b`), `${key} must be wrapped from the table`);
});

test('no participant financial command is reachable from the UI (withheld until atomic + environment proven)', async () => {
  const exp = await src('src/features/money/MoneyExperience.tsx');
  const panels = await src('src/features/money/AgreementMoneyPanels.tsx');
  const hosted = await src('src/features/money/HostedMoneySessionExperience.tsx');
  for (const call of ['authorityGateway.open', 'authorityGateway.fund', 'authorityGateway.exercise', 'authorityGateway.release', 'createIntent', 'initiate(', 'createQuote', 'moneySession.create', 'sessionGateway.create', '.redeem(']) {
    for (const [name, code] of [['MoneyExperience', exp], ['Panels', panels], ['Hosted', hosted]]) assert.ok(!code.includes(call), `${name} must not call ${call}`);
  }
  const rel = await src('src/api/securepay/payment-release/index.ts');
  assert.doesNotMatch(rel, /method: 'POST'/);
  assert.doesNotMatch(exp + panels, /shareable link|Get a shareable/i);
});

test('production never infers an environment from hostname, DEV flag, rail or URL', async () => {
  for (const f of ['src/features/money/MoneyExperience.tsx', 'src/features/money/AgreementMoneyPanels.tsx', 'src/features/money/display.ts']) {
    const s = await src(f);
    assert.doesNotMatch(s, /import\.meta\.env|location\.hostname|localhost|sandbox/i, f);
  }
});

test('Payment Ready copy is bounded: known reasons are described, unknown fails closed, status is never "paid"', () => {
  assert.match(m.reasonWords('FUNDING_INSUFFICIENT'), /funded so far is less/);
  assert.equal(m.reasonWords('SOMETHING_NEW'), 'SecurePay has a money requirement this screen can’t describe yet.');
  assert.doesNotMatch(m.reasonWords('SOMETHING_NEW'), /SOMETHING_NEW/);
  assert.match(m.paymentReadyFacts('READY', true).text, /not a payment/);
  assert.equal(m.paymentReadyFacts('READY', false).ready, false); // status without the boolean is not ready
  assert.equal(m.paymentReadyFacts('WEIRD', true).ready, false);
});

test('intent statuses stay distinct: provider processing vs SecurePay reconciling; unknown fails closed', () => {
  assert.match(m.intentWords('PROVIDER_PENDING'), /provider is processing/);
  assert.match(m.intentWords('CONFIRMATION_PENDING'), /reconciling.*isn’t confirmed/);
  assert.notEqual(m.intentWords('PROVIDER_PENDING'), m.intentWords('CONFIRMATION_PENDING'));
  assert.match(m.intentWords('NEW_STATE'), /can’t describe yet/);
  assert.ok(m.IN_FLIGHT_INTENT.includes('CONFIRMATION_PENDING') && !m.IN_FLIGHT_INTENT.includes('FAILED'));
});

test('settlement truth: an execution record is never called Settled; instruction != reserved != executed', () => {
  assert.doesNotMatch(m.settlementPhaseWords('SETTLED'), /^Settled|is settled|has been settled/i);
  assert.match(m.settlementPhaseWords('SETTLED'), /execution/i);
  assert.match(m.settlementPhaseWords('INSTRUCTION_CREATED'), /Nothing has been reserved/);
  assert.match(m.settlementPhaseWords('RESERVED'), /Nothing has been sent/);
  assert.match(m.settlementPhaseWords('???'), /can’t describe yet/);
  const r = m.recordWords({ recordType: 'RELEASE_INSTRUCTION_CREATED', status: 'X', currency: 'KES', amountMinor: '1', occurredAt: '' });
  assert.match(r.detail, /isn’t reserved, sent or settled/);
});

test('release authority and funding authority copy are separate bounded vocabularies', () => {
  assert.match(m.releaseReasonWords('PAYMENT_READY_NOT_SATISFIED'), /Payment Ready isn’t satisfied/);
  assert.match(m.releaseReasonWords('X'), /can’t describe yet/);
  assert.match(m.fundingReasonWords('MULTIPLE_MONETARY_OBLIGATIONS_AMBIGUOUS'), /more than one payment obligation/);
  assert.match(m.fundingReasonWords('X'), /can’t describe yet/);
});

test('panels read independently and never fabricate zero/none: unknown is first-class', async () => {
  const s = await src('src/features/money/AgreementMoneyPanels.tsx');
  for (const line of ['Payment readiness couldn’t be loaded', 'Settlement status couldn’t be confirmed', 'Money activity couldn’t be loaded', 'Release authority couldn’t be loaded', 'Payments couldn’t be loaded', 'Funding authority couldn’t be loaded']) assert.ok(s.includes(line), line);
  // each panel has its own useRead; one failing read cannot blank another
  assert.ok((s.match(/useRead</g) ?? []).length >= 8);
  const gw = { status: () => new Promise(() => {}), records: () => new Promise(() => {}), fundingAuthority: () => new Promise(() => {}), listIntents: () => new Promise(() => {}), fundingOptions: () => new Promise(() => {}), releaseAuthority: () => new Promise(() => {}), instructions: () => new Promise(() => {}) };
  const out = text(html(m.PaymentReadyPanel, { gateway: gw, agreementId: 'a', agreedAmountMinor: '100', agreementCurrency: 'KES' }));
  assert.match(out, /Checking Payment Ready/);
  assert.doesNotMatch(out, /Payment Ready\b.*\b(ready|blocked)\b.*Checking/);
});

test('amount authority: agreed amount and Payment Ready evaluated amount are separate labelled sources; a mismatch is surfaced', async () => {
  const s = await src('src/features/money/AgreementMoneyPanels.tsx');
  assert.match(s, /Agreed amount:/);
  assert.match(s, /Evaluated for Payment Ready:/);
  assert.match(s, /mismatch/);
  assert.match(s, /nothing has been changed/);
});

test('Money vocabulary: Returned to funder(s) is not settlement; Progressed is not Settled; "Money activity" not "Transactions"', async () => {
  const exp = await src('src/features/money/MoneyExperience.tsx');
  const panels = await src('src/features/money/AgreementMoneyPanels.tsx');
  assert.match(exp, /Returning unused money is not a settlement/);
  assert.match(exp, /Progressed within SecurePay/);
  assert.match(panels, /title="Money activity"/);
  assert.doesNotMatch(exp + panels, /title="Transactions"|>Transactions</);
  assert.doesNotMatch(exp, /wallet|balance/i.source ? /wallet\b|available balance/i : /x/);
});

test('Money Home keeps per-currency aggregates without combining and without arithmetic', async () => {
  const exp = await src('src/features/money/MoneyExperience.tsx');
  assert.match(exp, /moneyByCurrency\.map/);
  assert.doesNotMatch(exp, /\.reduce\(/);
});

test('hosted Money: redeem is withheld and says nothing was progressed; no raw ids displayed', async () => {
  const h = await src('src/features/money/HostedMoneySessionExperience.tsx');
  assert.match(h, /Nothing has been progressed/);
  assert.doesNotMatch(h, /agreementId|obligationId|paymentIntentId/);
});

test('settlement-destination register/replace use stable keys per logical attempt, and no hardcoded currency', async () => {
  const exp = await src('src/features/money/MoneyExperience.tsx');
  assert.match(exp, /attempts\.main\.keyFor\(signature\)/);
  assert.match(exp, /Try the same request again/);
  assert.doesNotMatch(exp, /currency: 'KES'/);
});

test('no raw provider metadata dump or blind redirect exists anywhere in the Money layer', async () => {
  const files = (await readdir(new URL('../src/features/money/', import.meta.url))).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
  for (const f of files) {
    const s = await src(`src/features/money/${f}`);
    assert.doesNotMatch(s, /Object\.entries\(.*clientInstructionMetadata/, f);
    assert.doesNotMatch(s, /href=\{[^}]*redirectUrl/, f);
  }
});
