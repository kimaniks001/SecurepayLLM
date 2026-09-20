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
export * from './src/features/money/selection';
export * from './src/features/money/settlementDestination';
export { MONEY_AUTHENTICATED_METHODS } from './src/api/securepay/money-refresh';
export { MoneyDoorway } from './src/features/money/MoneyDoorway';
export { AgreementMoneyPositionCard } from './src/features/money/MoneyExperience';
export { PaymentReadyPanel, FundingPanel, ActivityPanel, ReleasePanel, SettlementRow } from './src/features/money/AgreementMoneyPanels';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl', '.svg': 'dataurl' } });
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
  m.setMoneyHandoff({ agreementId: 'a-1', title: 'Kitchen renovation', versionLabel: 'version 2', currentVersionId: 'v2' });
  assert.equal(m.peekMoneyHandoff().agreementId, 'a-1');
  assert.equal(m.takeMoneyHandoff().agreementId, 'a-1');
  assert.equal(m.takeMoneyHandoff(), null);
  assert.equal(m.contextLine({ title: 'Kitchen renovation', versionLabel: 'version 2' }), 'Kitchen renovation · version 2');
  assert.equal(m.contextLine({ title: 'K', versionLabel: null }), 'K');
});

test('handoff version race: the old label is shown only when the fresh current version matches; otherwise fresh title + calm notice', () => {
  const h = { agreementId: 'a', title: 'Kitchen (old title)', versionLabel: 'version 1', currentVersionId: 'v1' };
  assert.deepEqual(m.resolveHandoffContext(h, { title: 'Kitchen', currentAgreementVersionId: 'v1' }), { context: 'Kitchen (old title) · version 1', notice: null });
  const raced = m.resolveHandoffContext(h, { title: 'Kitchen renovation', currentAgreementVersionId: 'v2' });
  assert.equal(raced.context, 'Kitchen renovation');
  assert.doesNotMatch(raced.context, /version 1/);
  assert.equal(raced.notice, 'The Agreement changed after you opened Money. Money is showing the latest financial information SecurePay can read.');
  // can't establish either side: never transplant the label, and don't claim a change either
  for (const bad of [{ ...h, currentVersionId: null }]) { const r = m.resolveHandoffContext(bad, { title: 'T', currentAgreementVersionId: 'v2' }); assert.equal(r.context, 'T'); assert.equal(r.notice, null); }
  const r2 = m.resolveHandoffContext(h, { title: 'T', currentAgreementVersionId: undefined }); assert.equal(r2.context, 'T');
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

test('AttemptStore fails closed: an unresolved attempt is immutable; a different request cannot obtain a key; only settle() releases it', () => {
  let n = 0; const store = m.createAttemptStore(() => `k${++n}`);
  assert.deepEqual(store.keyFor('A'), { ok: true, key: 'k1' });
  assert.deepEqual(store.keyFor('A'), { ok: true, key: 'k1' }); // same request retried: exactly the original key
  const other = store.keyFor('B');
  assert.deepEqual(other, { ok: false, reason: 'different-request-while-unresolved' });
  assert.equal(n, 1); // no second key was ever minted
  assert.equal(store.pending.signature, 'A'); // A was NOT replaced
  assert.deepEqual(store.keyFor('A'), { ok: true, key: 'k1' }); // and is still retryable with the original key
  store.settle();
  assert.deepEqual(store.keyFor('B'), { ok: true, key: 'k2' }); // only after a definite outcome
});

test('every attempt-store caller refuses to send when keyFor is refused', async () => {
  for (const f of ['FxConversionSection', 'BusinessFxConversionSection']) {
    const s = await src(`src/features/money/${f}.tsx`);
    assert.match(s, /if \(!attempt\.ok\) \{ setError\(UNRESOLVED_ATTEMPT\)/, f);
  }
  const exp = await src('src/features/money/MoneyExperience.tsx');
  assert.match(await src('src/features/money/settlementDestination.ts'), /if \(!main\.ok \|\| !verify\.ok\) return \{ kind: 'refused' \}/);
});

test('while uncertain, EVERY request-defining control is frozen (personal FX, Business FX, settlement destination)', async () => {
  for (const f of ['FxConversionSection', 'BusinessFxConversionSection']) {
    const s = await src(`src/features/money/${f}.tsx`);
    assert.match(s, /<select value=\{sourceId\} disabled=\{uncertain\}/, f);
    assert.match(s, /<select value=\{targetId\} disabled=\{uncertain\}/, f);
    assert.match(s, /<button disabled=\{uncertain\} onClick=\{\(\) => setOperation\('SELL'\)\}/, f);
    assert.match(s, /<button disabled=\{uncertain\} onClick=\{\(\) => setOperation\('BUY'\)\}/, f);
    assert.match(s, /<input value=\{amount\} disabled=\{uncertain\}/, f);
    assert.match(s, /Try the same request again/, f);
  }
  const exp = await src('src/features/money/MoneyExperience.tsx');
  const form = exp.slice(exp.indexOf('function SettlementDestinationSection'));
  for (const control of ["setAccountKind('BANK')", "setAccountKind('MOBILE_MONEY')", 'value={bankCode}', 'value={currency}', 'value={accountNumber}', 'value={beneficiaryName}']) {
    const at = form.indexOf(control); assert.ok(at > 0, control);
    assert.match(form.slice(Math.max(0, at - 60), at + 10), /disabled=\{uncertain\}/, control);
  }
  // no normal Cancel path that abandons an unresolved attempt, and no reloading `current` (which flips register/replace)
  assert.match(form, /uncertain\s*\n?\s*\? <p[^>]*>This request is kept exactly as sent[\s\S]{0,120}: <Button variant="ghost" onClick=\{\(\) => setShowForm\(false\)\}>Cancel/);
  assert.match(form, /disabled=\{loading \|\| uncertain \|\| !currencyValid\}>Show my \{scope\} settlement destination/);
  assert.match(form, /if \(uncertain\) return; \/\/ the currency is part of the exact unresolved request/);
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
  for (const line of ['Payment readiness couldn’t be loaded', 'SETTLEMENT_UNCONFIRMED', 'Money activity couldn’t be loaded', 'Release authority couldn’t be loaded', 'Payments couldn’t be loaded', 'Funding authority couldn’t be loaded']) assert.ok(s.includes(line), line);
  // each panel has its own useRead; one failing read cannot blank another
  assert.ok((s.match(/useRead</g) ?? []).length >= 8);
  const gw = { status: () => new Promise(() => {}), records: () => new Promise(() => {}), fundingAuthority: () => new Promise(() => {}), listIntents: () => new Promise(() => {}), fundingOptions: () => new Promise(() => {}), releaseAuthority: () => new Promise(() => {}), instructions: () => new Promise(() => {}) };
  const out = text(html(m.PaymentReadyPanel, { gateway: gw, agreementId: 'a', agreedAmountMinor: '100', agreementCurrency: 'KES' }));
  assert.match(out, /Checking Payment Ready/);
  assert.doesNotMatch(out, /Payment Ready\b.*\b(ready|blocked)\b.*Checking/);
});

test('amount authority: agreed amount and Payment Ready evaluated amount are separate labelled sources; a mismatch is surfaced', async () => {
  const s = await src('src/features/money/AgreementMoneyPanels.tsx');
  assert.match(s, /Agreement summary amount:/);
  assert.doesNotMatch(s.replace(/\/\*[\s\S]*?\*\//g, ''), /Agreed amount|Current Agreement amount|Current agreed amount|agreed amount/i);
  assert.match(s, /Evaluated for Payment Ready:/);
  assert.match(s, /SecurePay is using the evaluated amount for this readiness result\. This screen does not reconcile the two\./);
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
  const mod = await src('src/features/money/settlementDestination.ts');
  assert.match(mod, /attempts\.main\.keyFor\(signature\)/);
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

test('providerSettlementCertified=true never produces settlement language for the progressed amount', () => {
  const position = { agreementId: 'a', obligationId: 'o', obligationTitle: 'Labour', obligationDescription: 'L', proposedCurrency: 'KES', proposedAmountMinor: 100000, established: true, reasonCode: null, currency: 'KES', authorisedMaxAmountMinor: 100000, fundedTotalMinor: 100000, exercisedOrSettledMinor: 50000, releasedTotalMinor: 0, remainingFundedMinor: 50000, closed: false, beneficiaryMaskedKsNumber: 'KS0**3' };
  for (const certified of [true, false]) {
    const out = text(html(m.AgreementMoneyPositionCard, { position: { ...position, providerSettlementCertified: certified }, loading: false, onRefresh() {}, history: null, historyUnknown: false, onLoadHistory() {} }));
    assert.match(out, /Progressed within SecurePay/);
    assert.doesNotMatch(out, /certified as settled|settlement confirmed|provider settled|bank settlement confirmed|\bsettled by\b/i);
    assert.doesNotMatch(out, /Progressed and certified/);
  }
});

test('release instructions are classified current vs earlier by Agreement version, with no raw ids shown', () => {
  const gw = { settlementStatus: () => new Promise(() => {}) };
  const mk = (version, sequence) => ({ instructionId: `instr-${sequence}-secret`, paymentReadyEvaluationId: 'ev', paymentReadyEvaluationSequence: 1, productType: 'X', agreementId: 'agr-secret', agreementVersion: version, scopeIdentifiers: [], recipientKsNumber: null, pricingSnapshotId: null, settlementDestinationId: null, settlementDestinationMaskedDisplay: '****1234', sequence, createdAt: '' });
  const current = html(m.SettlementRow, { gateway: gw, agreementId: 'agr', instruction: mk('ver-2-uuid', 2), currentVersionId: 'ver-2-uuid' });
  const earlier = html(m.SettlementRow, { gateway: gw, agreementId: 'agr', instruction: mk('ver-1-uuid', 1), currentVersionId: 'ver-2-uuid' });
  const unknown = html(m.SettlementRow, { gateway: gw, agreementId: 'agr', instruction: mk('ver-1-uuid', 1), currentVersionId: null });
  assert.match(text(current), /Current Agreement version/);
  assert.doesNotMatch(text(current), /Earlier/);
  assert.match(text(earlier), /Earlier Agreement version/);
  assert.match(text(earlier), /history, not the current release state/);
  assert.doesNotMatch(text(earlier), /Current Agreement version/);
  assert.match(text(unknown), /Release history/);
  assert.doesNotMatch(text(unknown), /Current Agreement version|Earlier Agreement version/);
  for (const h of [current, earlier, unknown]) assert.doesNotMatch(h, /ver-[12]-uuid|instr-|agr-secret/);
  assert.equal(m.instructionScope('v2', 'v2'), 'current');
  assert.equal(m.instructionScope('v1', 'v2'), 'earlier');
  assert.equal(m.instructionScope('v1', undefined), 'unknown');
});

test('the selected Agreement is re-read at selection time; the release scope never uses the cached picker list', async () => {
  const exp = await src('src/features/money/MoneyExperience.tsx');
  assert.match(exp, /setFreshVersionId\(versionId\)/);
  assert.match(exp, /currentVersionId=\{freshVersionId\}/);
  assert.doesNotMatch(exp, /currentVersionId=\{selectedAgreement\.currentAgreementVersionId\}/);
});

// ---- Exact Agreement read (not a page-1 search)
const agr = (id, versionId, title = 'Kitchen renovation') => ({ overview: { agreementId: id, title, currency: 'KES', proposedAmountMinor: '100000' }, currentVersion: versionId ? { versionId, versionNumber: 2 } : null });
const handoffOf = (id, versionId) => ({ agreementId: id, title: 'Kitchen renovation', versionLabel: 'version 1', currentVersionId: versionId });

test('an Agreement outside the first 20 /me/agreements results still opens: the exact Detail read establishes the current version', async () => {
  const calls = [];
  const gateway = { detail: async id => { calls.push(['detail', id]); return agr(id, 'v2'); }, currentUserAgreements: async () => { calls.push(['list']); return { items: Array.from({ length: 20 }, (_, i) => ({ agreementId: `other-${i}` })) }; } };
  const r = await m.resolveSelection(gateway, { agreementId: 'agr-21st', title: 'Kitchen renovation', currency: null, summaryAmountMinor: null }, handoffOf('agr-21st', 'v2'));
  assert.deepEqual(calls, [['detail', 'agr-21st']]); // the paginated list is never consulted
  assert.equal(r.versionId, 'v2');
  assert.equal(r.label, 'Kitchen renovation · version 1'); // source version matches the exact current version
  assert.equal(r.notice, null);
  assert.equal(r.chosen.currency, 'KES');
  assert.match(m.instructionScope('v2', r.versionId), /current/);
  assert.match(m.instructionScope('v1', r.versionId), /earlier/);
});

test('handoff: exact Detail shows a newer version -> old label dropped and the calm notice shown', async () => {
  const r = await m.resolveSelection({ detail: async id => agr(id, 'v3', 'Kitchen renovation') }, { agreementId: 'a', title: 'Kitchen renovation', currency: null, summaryAmountMinor: null }, handoffOf('a', 'v1'));
  assert.equal(r.label, 'Kitchen renovation');
  assert.equal(r.versionId, 'v3');
  assert.equal(r.notice, 'The Agreement changed after you opened Money. Money is showing the latest financial information SecurePay can read.');
});

test('exact Detail read failing never claims the Agreement is inaccessible and fails closed on version-dependent presentation', async () => {
  const r = await m.resolveSelection({ detail: async () => { throw new m.ApiError('network', 'x', null, null); } }, { agreementId: 'a', title: 'Kitchen renovation', currency: null, summaryAmountMinor: null }, handoffOf('a', 'v1'));
  assert.equal(r.versionId, null);
  assert.equal(r.label, 'Kitchen renovation'); // no version label
  assert.equal(r.notice, m.CONTEXT_UNREFRESHED);
  assert.doesNotMatch(r.notice, /find|inaccessible|not found|can’t see/i);
  assert.equal(m.instructionScope('v1', r.versionId), 'unknown'); // neutral release-history labelling
});

test('the Money Agreement selection never searches the paginated list to establish a version or existence', async () => {
  const exp = await src('src/features/money/MoneyExperience.tsx');
  assert.doesNotMatch(exp, /\.items\.find\(/);
  assert.doesNotMatch(exp, /couldn’t find that Agreement/);
  assert.match(exp, /resolveSelection\(agreementGateway/);
  assert.match(await src('src/features/money/selection.ts'), /gateway\.detail\(target\.agreementId\)/);
});

// ---- Settlement destination: one explicit currency for reads AND writes
const recorder = (over = {}) => { const calls = []; const dest = { destinationId: 'd', maskedDestinationDisplay: '****1', destinationStatus: 'ACTIVE', verificationStatus: 'VERIFIED' };
  return { calls, gateway: { current: async c => { calls.push(['current', c]); return dest; }, history: async c => { calls.push(['history', c]); return [dest]; },
    register: async (r, k) => { calls.push(['register', r.currency, k]); if (over.register) return over.register(); return dest; },
    replace: async (r, k, v) => { calls.push(['replace', r.currency, k, v]); if (over.replace) return over.replace(); return {}; } } }; };
const form = c => ({ accountKind: 'BANK', bankCode: '01', accountNumber: '123', beneficiaryName: 'W', currency: c });
const stores = () => { let n = 0; const mk = () => m.createAttemptStore(() => `k${++n}`); return { main: mk(), verification: mk() }; };

test('settlement destination reads are explicitly currency-scoped: KES -> KES, USD -> USD', async () => {
  const r = recorder();
  await m.readSettlementScope(r.gateway, 'kes'); await m.readSettlementScope(r.gateway, 'usd');
  assert.deepEqual(r.calls, [['current', 'KES'], ['history', 'KES'], ['current', 'USD'], ['history', 'USD']]);
});

test('a USD register success reloads USD (never silently KES)', async () => {
  const r = recorder(); const out = await m.submitDestination(r.gateway, stores(), 'register', form('usd'));
  assert.equal(out.kind, 'ok'); assert.equal(out.currency, 'USD');
  assert.deepEqual(r.calls.map(c => c.slice(0, 2)), [['register', 'USD'], ['current', 'USD'], ['history', 'USD']]);
  assert.ok(!r.calls.some(c => c[1] === 'KES'));
});

test('USD replace: replace key and verification key stay tied to that exact USD request, across an uncertain retry', async () => {
  const r = recorder({ replace: () => { throw new m.ApiError('network', 'x', null, null); } }); const s = stores();
  assert.equal((await m.submitDestination(r.gateway, s, 'replace', form('usd'))).kind, 'uncertain');
  assert.equal((await m.submitDestination(r.gateway, s, 'replace', form('usd'))).kind, 'uncertain');
  const sends = r.calls.filter(c => c[0] === 'replace');
  assert.deepEqual(sends[0], ['replace', 'USD', 'k1', 'k2']);
  assert.deepEqual(sends[1], sends[0]); // same currency, same request, same two keys
  // a different currency while unresolved is refused: nothing is sent
  assert.equal((await m.submitDestination(r.gateway, s, 'replace', form('kes'))).kind, 'refused');
  assert.equal(r.calls.filter(c => c[0] === 'replace').length, 2);
});

test('settlement destination: no silent current()/history() default call remains in production, and the currency control is one explicit context', async () => {
  const exp = await src('src/features/money/MoneyExperience.tsx');
  const mod = await src('src/features/money/settlementDestination.ts');
  for (const code of [exp, mod]) { assert.doesNotMatch(code, /\.current\(\)|\.history\(\)/); }
  const gw = await src('src/api/securepay/settlement-destinations/index.ts');
  assert.doesNotMatch(gw, /currency = 'KES'/); // no invisible transport default
  assert.match(exp, /aria-label="Settlement currency"/);
  assert.match(exp, /useState\('KES'\)/); // a visible default only
  assert.match(exp, /const changeCurrency[\s\S]{0,400}setCurrentRead\(null\); setHistoryRead\(null\); setVerification\(null\)/);
});

// ---- Settlement destination: current and history are independent reads
const D = (id, status = 'CLOSED') => ({ destinationId: id, maskedDestinationDisplay: `****${id}`, destinationStatus: status, verificationStatus: 'VERIFIED' });
const gw = ({ current, history, register, replace }) => ({ current: async () => { const r = await current(); return r; }, history: async () => history(), register: async () => register?.() ?? D('new', 'ACTIVE'), replace: async () => replace?.() ?? {} });
const e404 = () => new m.ApiError('http', 'no settlement destination', 404, null);
const e500 = () => new m.ApiError('http', 'boom', 500, null);
const fail = e => async () => { throw e(); };

test('current 404 + history with two entries: current absent, both historical rows preserved', async () => {
  const r = await m.readSettlementScope(gw({ current: fail(e404), history: async () => [D('a'), D('b')] }), 'usd');
  assert.deepEqual(r.current, { state: 'absent' });
  assert.equal(r.history.state, 'loaded'); assert.equal(r.history.items.length, 2);
});
test('current 404 + empty history: a legitimate no-current / no-history state', async () => {
  const r = await m.readSettlementScope(gw({ current: fail(e404), history: async () => [] }), 'USD');
  assert.deepEqual(r.current, { state: 'absent' }); assert.deepEqual(r.history, { state: 'loaded', items: [] });
});
test('current 500 + history succeeds: current is UNKNOWN (never absent), history preserved', async () => {
  const r = await m.readSettlementScope(gw({ current: fail(e500), history: async () => [D('a')] }), 'USD');
  assert.deepEqual(r.current, { state: 'unavailable' }); assert.equal(r.history.items.length, 1);
  const n = await m.readSettlementScope(gw({ current: fail(() => new m.ApiError('network', 'x', null, null)), history: async () => [] }), 'USD');
  assert.equal(n.current.state, 'unavailable');
});
test('current succeeds + history 500: current preserved, history unavailable', async () => {
  const r = await m.readSettlementScope(gw({ current: async () => D('cur', 'ACTIVE'), history: fail(e500) }), 'USD');
  assert.equal(r.current.state, 'found'); assert.equal(r.current.value.destinationId, 'cur');
  assert.deepEqual(r.history, { state: 'unavailable' });
});
test('both reads fail: both are unavailable independently', async () => {
  const r = await m.readSettlementScope(gw({ current: fail(e500), history: fail(e500) }), 'USD');
  assert.deepEqual([r.current.state, r.history.state], ['unavailable', 'unavailable']);
});
test('USD register success + current reload OK + history reload fails: the write stays a success and current stays visible', async () => {
  const out = await m.submitDestination(gw({ current: async () => D('new', 'ACTIVE'), history: fail(e500) }), stores(), 'register', form('usd'));
  assert.equal(out.kind, 'ok'); assert.equal(out.currency, 'USD');
  assert.equal(out.scope.current.state, 'found'); assert.deepEqual(out.scope.history, { state: 'unavailable' });
});
test('USD replace success + current reload fails + history OK: the write stays a success, history kept, current unavailable (not absent)', async () => {
  const out = await m.submitDestination(gw({ current: fail(e500), history: async () => [D('old'), D('new', 'ACTIVE')] }), stores(), 'replace', form('usd'));
  assert.equal(out.kind, 'ok');
  assert.deepEqual(out.scope.current, { state: 'unavailable' });
  assert.equal(out.scope.history.items.length, 2);
});
test('the UI renders each fact independently and offers register/replace only when the current state is known', async () => {
  const exp = await src('src/features/money/MoneyExperience.tsx');
  assert.match(exp, /No current \{scope\} settlement destination is registered\./);
  assert.match(exp, /Current settlement destination couldn’t be confirmed\./);
  assert.match(exp, /Settlement destination history couldn’t be loaded\./);
  assert.match(exp, /historyRead\?\.state === 'loaded' && historyRead\.items\.length > 0/);
  assert.match(exp, /currentRead\?\.state === 'found' \|\| currentRead\?\.state === 'absent'/);
  assert.doesNotMatch(exp, /setNotFound|notFound/);
  assert.doesNotMatch(await src('src/features/money/settlementDestination.ts'), /notFound/);
});
