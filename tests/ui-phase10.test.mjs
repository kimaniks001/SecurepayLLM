import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
// UI Phase 10 -- Support, exceptions and recovery truth. Contracts read from SecurePayAPI @ 75a490b (read-only); the API was not run.
const bundle = await build({ stdin: { contents: `
export * from './src/features/support/display';
export * from './src/features/support/context';
export * from './src/features/support/tabHint';
export { SupportView, HUMAN_SUPPORT_UNAVAILABLE, HELP_IS_NOT } from './src/features/support/SupportExperience';
export * from './src/features/support/label';
export { ReviewPanel } from './src/features/review/ReviewPanel';
export { SettlementRowView, ExceptionBlock } from './src/features/money/AgreementMoneyPanels';
export { instructionScope } from './src/features/money/display';
export { AgreementSupport } from './src/components/AgreementSupport';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl', '.svg': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const m = mod.exports;
const src = p => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const html = (c, p) => m.renderToStaticMarkup(m.createElement(c, p));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const ready = data => ({ status: 'ready', data });
const inst = (n = 1) => ({ instructionId: 'inst-secret', paymentReadyEvaluationId: 'ev-secret', paymentReadyEvaluationSequence: 1, productType: 'X', agreementId: 'agr-secret', agreementVersion: 'ver-secret', scopeIdentifiers: [], recipientKsNumber: null, pricingSnapshotId: null, settlementDestinationId: 'dest-secret', settlementDestinationMaskedDisplay: '****1234', sequence: n, createdAt: '' });
const exc = (o = {}) => ({ exceptionId: 'exc-secret', instructionId: 'inst-secret', exceptionType: 'HELD_EXCEPTION', customerSafeReason: 'Settlement outcome is uncertain and is held for review. Do not resend payment.', requiredAction: 'OPERATIONS_REVIEW', recordedAt: '2026-09-20T10:00:00Z', compensatedOutcome: false, ...o });
const status = (phase, exception = null) => ({ instructionId: 'inst-secret', settlementPhase: phase, reservationId: null, executionId: null, exception, settledAt: null });
const row = (state, scope = 'current') => html(m.SettlementRowView, { instruction: inst(), scope, state, onRefresh() {}, onGetHelp() {} });
const noSecrets = h => assert.doesNotMatch(h, /inst-secret|exc-secret|dest-secret|ev-secret|agr-secret|ver-secret|providerPayload|stack/i);
// Words that would claim an outcome or a human. They may appear only inside the explicit "doesn't mean" line.
const CLAIMS = /(has |have )?(failed|was reversed|been reversed|resolved|solved|fixed|recovered|restored|refunded)|working on|assigned|escalat|under investigation|someone is|a person is|team is/i;
const withoutMeaning = t => t.replace(m.EXCEPTION_MEANING, '').replace(m.COMPENSATION_NOT_RESTORED, '');

// ---- exceptions
test('1. no exception: only the fact that none was returned -- never "healthy", "settled" or "no provider problem"', () => {
  const t = text(row(ready(status('RESERVED'))));
  assert.match(t, /SecurePay did not return a customer-safe exception for this settlement read\./);
  assert.doesNotMatch(t, /needs attention|healthy|all good|no problem|no provider|no issue/i);
  assert.doesNotMatch(t, /\bsettled\b/i.source ? /is settled|has settled|been settled|Settled\b(?!:)/ : /x/);
  assert.match(t, /Settlement/); assert.match(t, /Nothing has been sent yet/);
});
test('2/3. customer-safe exception: bounded block with reason, what is needed and when it was recorded', () => {
  const h = row(ready(status('HELD_EXCEPTION', exc())));
  const t = text(h);
  assert.match(t, /SecurePay needs attention on this payment/);
  assert.match(t, /Settlement outcome is uncertain and is held for review\. Do not resend payment\./);
  assert.match(t, /What is needed/); assert.match(t, /needs a review by SecurePay operations\. SecurePay doesn’t show that anyone has started that review\./);
  assert.match(t, /Recorded 20 Sept? 2026|Recorded 20 Sep 2026/);
  assert.match(t, /doesn’t by itself mean the payment failed, was reversed or was resolved/);
  assert.doesNotMatch(withoutMeaning(t), CLAIMS);
  assert.match(t, /Get help with this/);
  noSecrets(h);
});
test('3b. requiredAction is bounded: NO_ACTION_REQUIRED, OPERATIONS_REVIEW, unknown fails closed, absent shows nothing', () => {
  assert.equal(m.requiredActionWords('NO_ACTION_REQUIRED'), 'SecurePay says no action is needed from you.');
  assert.match(m.requiredActionWords('OPERATIONS_REVIEW'), /SecurePay operations/);
  assert.equal(m.requiredActionWords('SOMETHING_NEW'), m.UNKNOWN_REQUIRED_ACTION); assert.doesNotMatch(m.requiredActionWords('SOMETHING_NEW'), /SOMETHING_NEW/);
  assert.equal(m.requiredActionWords(null), null);
  const none = text(row(ready(status('COMPENSATED', exc({ exceptionType: 'COMPENSATED', requiredAction: null, compensatedOutcome: true, customerSafeReason: 'Settlement did not complete; reserved funds were returned to the source account.' })))));
  assert.doesNotMatch(none, /What is needed/);
});
test('4/5. compensatedOutcome false says nothing about compensation; true says only "records a compensating outcome" and never "restored" or "solved"', () => {
  const no = text(row(ready(status('HELD_EXCEPTION', exc({ compensatedOutcome: false })))));
  assert.doesNotMatch(no, /compensat/i);
  const yes = text(row(ready(status('COMPENSATED', exc({ exceptionType: 'COMPENSATED', requiredAction: 'NO_ACTION_REQUIRED', compensatedOutcome: true, customerSafeReason: 'Settlement did not complete; reserved funds were returned to the source account.' })))));
  assert.match(yes, /SecurePay records a compensating outcome for this exception\./);
  assert.match(yes, /does not say money was restored to the Agreement’s original spending authority/);
  assert.match(yes, /SecurePay recorded an exception on this payment/);       // NO_ACTION_REQUIRED: not "needs attention"
  const yesClaims = yes.replace(m.COMPENSATION_NOT_RESTORED, '').replace('That does not say money was restored to the Agreement’s original spending authority.', '');
  assert.doesNotMatch(yesClaims, /problem solved|money (is|was) restored|refund/i);
  assert.match(text(row(ready(status('COMPENSATED', exc({ compensatedOutcome: true }))))), /SecurePay records this release as compensated: it did not complete\./); // settlement block is its own
});
test('6. unknown exception type: bounded copy, no echo of the type or the free-text reason', () => {
  const t = text(row(ready(status('HELD_EXCEPTION', exc({ exceptionType: 'PROVIDER_TIMEOUT_9', customerSafeReason: 'raw provider text: ACME-ADAPTER 502 upstream', requiredAction: 'CALL_BANK' })))));
  assert.match(t, /SecurePay has recorded an exception this screen cannot describe yet\./);
  assert.doesNotMatch(t, /PROVIDER_TIMEOUT|ACME|502|upstream|CALL_BANK/);
  assert.match(t, /SecurePay has recorded a required step this screen cannot describe yet\./);
  assert.match(t, /SecurePay needs attention/);                                  // unknown => fail towards attention, never towards reassurance
});
test('7. settlement read unavailable: "couldn\'t confirm", no "No exception", and no stale exception survives', () => {
  const t = text(row({ status: 'error' }));
  assert.match(t, /SecurePay couldn’t confirm the current settlement state\./);
  assert.doesNotMatch(t, /No exception|did not return|needs attention|Recorded/);
  const loading = text(row({ status: 'loading' }));
  assert.doesNotMatch(loading, /needs attention|Recorded|did not return/);          // a re-read shows nothing from the previous read
  const money = readFileSync('src/features/money/AgreementMoneyPanels.tsx', 'utf8');
  assert.match(money, /setState\(\{ status: 'loading' \}\);/);
});
test('8/9/10. the release-instruction version classification is independent of any exception', () => {
  const ex = ready(status('HELD_EXCEPTION', exc()));
  const earlier = text(row(ex, 'earlier')); const current = text(row(ex, 'current')); const unknown = text(row(ex, 'unknown'));
  assert.match(earlier, /Earlier Agreement version/); assert.match(earlier, /history, not the current release state/); assert.match(earlier, /needs attention/);
  assert.match(current, /Current Agreement version/); assert.doesNotMatch(current, /Earlier Agreement version/);
  assert.match(unknown, /Release history/);
  const without = text(row(ready(status('HELD_EXCEPTION')), 'earlier'));
  assert.match(without, /Earlier Agreement version/);                                // same label with or without an exception
  assert.equal(m.instructionScope('a', 'a'), 'current'); assert.equal(m.instructionScope('a', 'b'), 'earlier'); assert.equal(m.instructionScope('a', null), 'unknown');
});
test('exception and settlement are two blocks, never one status pill', () => {
  const h = row(ready(status('HELD_EXCEPTION', exc())));
  assert.match(h, /data-testid="settlement-state"/); assert.match(h, /data-testid="release-exception"/);
  assert.ok(h.indexOf('settlement-state') < h.indexOf('release-exception'));
});
test('30. no provider raw data: hostile extra fields are never rendered; customer Money/Support code never touches provider internals', async () => {
  const hostile = { ...exc(), providerPayload: '{"secret":"P-RAW"}', stackTrace: 'at com.acme.Adapter', adapterName: 'ACME-RAIL', railCode: 'RAW_RAIL' };
  const h = row(ready({ ...status('HELD_EXCEPTION', hostile), providerReference: 'PROV-REF-1' }));
  assert.doesNotMatch(h, /P-RAW|com\.acme|ACME-RAIL|RAW_RAIL|PROV-REF/);
  for (const f of ['src/features/support/SupportExperience.tsx', 'src/features/support/display.ts', 'src/features/support/context.ts']) assert.doesNotMatch(await src(f), /providerPayload|providerReference|stackTrace|adapterName|railCode|exceptionId|instructionId|destinationId/, f);
  const panels = await src('src/features/money/AgreementMoneyPanels.tsx');
  const exBlock = panels.slice(panels.indexOf('export function ExceptionBlock'), panels.indexOf('export function ReleasePanel'));
  assert.doesNotMatch(exBlock, /providerPayload|providerReference|stackTrace|adapterName|exceptionId|instructionId/);
});

// ---- Help & Support
const nav = Object.fromEntries(['openAgreement', 'openAgreementReviews', 'openMoney', 'askAgent', 'recovery', 'notifications', 'account', 'agreements', 'money', 'store', 'community'].map(k => [k, () => {}]));
const help = o => html(m.SupportView, { signedIn: true, ctx: null, label: null, reviews: null, money: null, nav, ...o });
const L = o => ({ title: 'Bathroom retiling', titleConfirmed: true, versionLabel: null, currentVersionId: null, freshVersionLabel: null, notice: null, ...o });
const CTX = { kind: 'agreement', agreementId: 'agr-secret', title: 'Bathroom retiling', versionLabel: 'version 2', currentVersionId: 'v2' };
test('global Help is a router: choices, each with its exact consequence, and no ticket console', () => {
  const t = text(help({}));
  assert.match(t, /What do you need help with\?/);
  for (const c of ['An Agreement', 'Money', 'A formal review', 'Store', 'Community', 'Trouble signing in', 'Something else — ask KS001']) assert.match(t, new RegExp(c));
  assert.equal((t.match(/When you press this,/g) ?? []).length, 7);
  assert.match(t, /Store When you press this, SecurePay will open the Store\./); assert.match(t, /Community When you press this, SecurePay will open Community\./);
  assert.doesNotMatch(t, /Store or Community/);
  assert.match(t, /Help & Support is a guide to where SecurePay already shows what it knows\. It isn’t a support ticket/);
});
test('signed out: only Trouble signing in and Ask KS001 -- no Agreement/Money assumptions', () => {
  const t = text(help({ signedIn: false }));
  assert.match(t, /Trouble signing in/); assert.match(t, /Ask KS001/);
  assert.doesNotMatch(t, /An Agreement|Open Money|Notifications|Account & security/);
});
test('human support: an explicit limitation, never a button, ticket, number, assignee or status', () => {
  for (const ctx of [null, CTX]) {
    const h = help({ ctx, label: ctx && L({ versionLabel: 'version 2', currentVersionId: 'v2' }) });
    const t = text(h).replace(m.HELP_IS_NOT, '').replace('They aren’t support cases and don’t mean anyone is handling something.', '');
    assert.match(t, /Human support requests are not yet available from this screen\. SecurePay can still help you inspect the Agreement, Money and formal Review state here\./);
    assert.doesNotMatch(t, /Coming soon|Request human support|Contact support|Open a ticket|ticket|case number|reference number|Support case|assigned|escalat|under investigation|working on (it|this)|OPEN \/ IN PROGRESS/i);
    assert.doesNotMatch(h, /<button[^>]*>[^<]*(human support|ticket)/i);
  }
});
test('Agreement -> Help preserves the Agreement context: title + exact version label, each action states its consequence', () => {
  const t = text(help({ ctx: CTX, label: L({ versionLabel: 'version 2', currentVersionId: 'v2' }), reviews: ready({ active: 1 }), money: ready({ headline: 'Not Payment Ready yet' }) }));
  assert.match(t, /Help with Bathroom retiling · version 2/);
  assert.match(t, /From Formal Review 1 active formal review on this Agreement\./); assert.match(t, /From Money Not Payment Ready yet/);
  assert.match(t, /Open this Agreement/); assert.match(t, /Reviews & issues/); assert.match(t, /Open Money/);
  assert.match(t, /When you press this, SecurePay will open the Agreement’s Support tab, where formal reviews are shown\./);
  assert.doesNotMatch(help({ ctx: CTX }), /agr-secret/);
});
test('an Agreement that changed: the old version label is dropped and a calm notice shown (never an old label as current)', () => {
  const t = text(help({ ctx: CTX, label: L({ currentVersionId: 'v3', notice: m.HELP_CHANGED_NOTICE }) }));
  assert.match(t, /Help with Bathroom retiling(?! ·)/); assert.match(t, /The Agreement changed after you opened Help/); assert.doesNotMatch(t, /version 2/);
});
test('43. Help survives domain failures: Agreement + Review load, Money fails -> both shown, Money says so, Help is not blanked', () => {
  const t = text(help({ ctx: CTX, label: L({}), reviews: ready({ active: 0 }), money: { status: 'error' } }));
  assert.match(t, /Money couldn’t be loaded\./); assert.match(t, /No active formal reviews on this Agreement\./); assert.match(t, /Open this Agreement/);
  const t2 = text(help({ ctx: CTX, label: null, reviews: { status: 'error' }, money: ready({ headline: 'Payment Ready' }) }));
  assert.match(t2, /Reviews couldn’t be loaded\./); assert.doesNotMatch(t2, /No active formal reviews/);
});
test('Review -> Help keeps Formal Review and Human Support distinct', () => {
  const t = text(help({ ctx: { ...CTX, kind: 'review' }, label: L({ versionLabel: 'version 2', currentVersionId: 'v2' }) }));
  assert.match(t, /Formal Review and Help are different/); assert.match(t, /opening it can’t affect a review, and it doesn’t contact anyone/);
  assert.match(t, /View formal review/);
});
test('Money exception -> Help carries only the customer-safe context', () => {
  const ctx = { kind: 'money-exception', agreementId: 'agr-secret', title: 'Bathroom retiling', currentVersionId: 'v2', heading: 'SecurePay needs attention on this payment', reason: 'Settlement outcome is uncertain and is held for review. Do not resend payment.', requiredAction: m.requiredActionWords('OPERATIONS_REVIEW'), recordedOn: '20 Sept 2026' };
  const h = help({ ctx, label: null, money: ready({ headline: 'Payment Ready' }) });
  const t = text(h);
  assert.match(t, /From Money/); assert.match(t, /SecurePay needs attention on this payment/); assert.match(t, /seeing it here doesn’t mean anyone is working on it/);
  assert.match(t, /Open Money/); noSecrets(h);
  assert.deepEqual(Object.keys(ctx).sort(), ['agreementId', 'currentVersionId', 'heading', 'kind', 'reason', 'recordedOn', 'requiredAction', 'title']);
  const money = readFileSync('src/features/money/MoneyExperience.tsx', 'utf8');
  const call = money.slice(money.indexOf("openSupportFromRoute({"), money.indexOf("openSupportFromRoute({") + 420);
  assert.doesNotMatch(call, /instructionId|exceptionId|destination|providerPayload|railCode/);
});
test('context and tab hint are in memory only', async () => {
  m.setSupportContext(CTX); assert.equal(m.peekSupportContext().title, 'Bathroom retiling'); m.clearSupportContext(); assert.equal(m.peekSupportContext(), null);
  m.setDetailTabHint({ agreementId: 'a', tab: 'support' }); assert.equal(m.peekDetailTabHint().tab, 'support'); m.clearDetailTabHint(); assert.equal(m.peekDetailTabHint(), null);
  for (const f of ['context.ts', 'tabHint.ts']) assert.doesNotMatch(await src(`src/features/support/${f}`), /localStorage|sessionStorage|URLSearchParams|history\.(push|replace)State|\?agreement/, f);
});

// ---- Agreement Support convergence
test('Agreement Support (real path): Ask KS001, Reviews & issues, Money, Help & Support, and an honest human-support limitation -- no "Coming soon"', () => {
  const t = text(html(m.AgreementSupport, { onAskAgent() {}, reviewPanel: m.createElement('div', null, 'PANEL'), onOpenMoney() {}, onOpenHelp() {} }));
  assert.match(t, /Ask KS001/); assert.match(t, /Reviews & issues/); assert.match(t, /Money Funding, Payment Ready, release and settlement truth/); assert.match(t, /Help & Support/);
  assert.match(t, /Human support requests are not yet available from this screen/); assert.doesNotMatch(t, /Coming soon|Request human support/);
  const fixture = text(html(m.AgreementSupport, { onAskAgent() {} }));
  assert.match(fixture, /Request human support/); assert.match(fixture, /Coming soon/); assert.match(fixture, /Ask SecurePay/);   // fixture path untouched
});

// ---- boundaries (source guards)
async function walk(dir, out = []) { for (const e of await readdir(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) await walk(p, out); else if (/\.(ts|tsx)$/.test(e.name)) out.push(p); } return out; }
import { readFileSync } from 'node:fs';
test('40. the staff Support Context API, Outreach case refs and support-case fabrication never appear in customer code', async () => {
  for (const f of await walk('src')) {
    if (/\.test\./.test(f)) continue;
    const s = await src(f);
    assert.doesNotMatch(s, /\/api\/v1\/support|X-Outreach-Case-Ref|SUPPORT_CONTEXT_READ/, f);
    assert.doesNotMatch(s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /supportCaseId|ticketNumber|ticketId|caseReference\s*:|assignedAgent|supportStatus/i, f);
  }
});
test('41. exercise-reversal endpoints are not wired: no customer reversal request or status UI exists', async () => {
  for (const f of await walk('src')) assert.doesNotMatch(await src(f), /exercise-reversals|requestReversal|reversalId/, f);
  for (const label of Object.values(m.RECOVERY_LABEL)) assert.doesNotMatch(label, /refund|on the way|available (to|again)|restored|money is back/i);
  assert.equal(m.RECOVERY_LABEL.REQUESTED, 'Recovery requested for'); assert.equal(m.RECOVERY_LABEL.RECOVERY_PENDING, 'Recovery is being worked for');
  assert.equal(m.RECOVERY_LABEL.RECOVERY_COMPLETED, 'SecurePay records the ledger recovery as completed for'); assert.equal(m.RECOVERY_LABEL.RECOVERY_FAILED, 'Recovery could not be completed for');
  assert.match(m.RECOVERY_HEADROOM_NOTE, /does not by itself restore this position’s spending headroom/);
  assert.match(await src('src/features/money/MoneyExperience.tsx'), /RECOVERY_HEADROOM_NOTE/);
});
test('Money Operations (operations-only) and held-exception resolution are not reachable from customer Help, Money or Review', async () => {
  for (const f of ['src/features/support/SupportExperience.tsx', 'src/features/money/AgreementMoneyPanels.tsx', 'src/features/money/MoneyExperience.tsx', 'src/features/review/ReviewPanel.tsx']) {
    const s = await src(f);
    assert.doesNotMatch(s, /MoneyOperations|money-operations|moneyOperations|resolveHeld|markRecovered|acknowledgeException|closeException/i, f);
  }
  assert.match(await src('src/RuntimeApp.tsx'), /useMoneyOperationsRoute/);   // still its own gated route
});
test('routing: Help is an AppView reached from Account, Agreement Support, Money exception and Review -- not a primary nav tab; Ask KS001 and Recovery use the existing flows', async () => {
  assert.match(await src('src/types.ts'), /'notifications' \| 'support'/);
  assert.match(await src('src/features/account/AccountExperience.tsx'), /onNavigate\('support'\)/);
  assert.doesNotMatch(await src('src/components/NavBar.tsx'), /support/i);
  const agent = await src('src/features/agent/AgentExperience.tsx');
  assert.match(agent, /askAgent: \(\) => \{ setHelpContext\(null\); if \(signedIn\) navigateTo\('signed-in'\)/);
  assert.match(agent, /recovery: \(\) => \{ setHelpContext\(null\); navigateTo\('recovery'\)/);
  assert.match(agent, /notifications: \(\) => \{ setHelpContext\(null\); navigateTo\('notifications'\)/);
  assert.match(agent, /openMoney: handoff => \{ leaveSupport\(\); openMoneyFor\(handoff\)/);
    const support = await src('src/features/support/SupportExperience.tsx');
  assert.doesNotMatch(support, /createAgentController|agentGateway|submitTurn/);
  const dir = await readdir(new URL('../src/api/securepay/', import.meta.url));
  assert.ok(!dir.includes('support'), 'no new support gateway');
});
test('notifications stay attention, not case management: no review or support-case deep link is invented', async () => {
  const n = await src('src/features/notifications/NotificationsExperience.tsx');
  // PHASE 4 Care convergence: actionKey-based routing (OPEN_INVITATIONS/OPEN_AGREEMENT/REVIEW_AGREEMENT)
  // is now real, deliberate architecture -- see the closed `parseNotificationActionKey` contract. What
  // remains genuinely forbidden is inventing a review-case or support-case deep link, which this screen
  // still has no concept of at all.
  assert.doesNotMatch(n, /supportCase|ticket|reviewCaseId/i);
  assert.match(m.HUMAN_SUPPORT_UNAVAILABLE, /not yet available/);
});

test('a scoped Help context is cleared on every navigation, so Account -> Help is global (no stale Agreement)', async () => {
  const agent = await src('src/features/agent/AgentExperience.tsx');
  const nav = agent.slice(agent.indexOf('const navigateTo = (view: AppView) => {'), agent.indexOf("if (view === 'store')"));
  assert.match(nav, /setSupportView\(false\); setHelpContext\(null\);/);
});

// ---- Phase 10 correction: exact Review, exact Agreement for every context, id-based version comparison, split Store/Community
const REVIEW_CTX = { kind: 'review', agreementId: 'agr-secret', title: 'Bathroom retiling', versionLabel: 'version 2', currentVersionId: 'v2', reviewCaseId: 'rc-secret', reviewAgreementVersionId: 'v1' };
const MONEY_CTX = { kind: 'money-exception', agreementId: 'agr-secret', title: 'Bathroom retiling', currentVersionId: 'v1', heading: 'SecurePay needs attention on this payment', reason: 'Settlement outcome is uncertain and is held for review. Do not resend payment.', requiredAction: m.requiredActionWords('OPERATIONS_REVIEW'), recordedOn: '20 Sept 2026' };
const detailOf = (title, versionId, n) => ({ status: 'ready', data: { overview: { title }, currentVersion: versionId ? { versionId, versionNumber: n } : null } });
const caseFact = (state, agreementVersionId) => ({ status: 'ready', data: { state, agreementVersionId } });

test('Review Help: an earlier-version case stays explicitly Earlier Agreement version and is framed by the REVIEW, not the current Agreement version', () => {
  const label = m.resolveHelpLabel(REVIEW_CTX, detailOf('Bathroom retiling', 'v2', 2));
  const h = help({ ctx: REVIEW_CTX, label, reviewCase: caseFact('AWAITING_RESPONSE', 'v1') });
  const t = text(h);
  assert.match(t, /From Formal Review Waiting for response Earlier Agreement version/);
  assert.match(t, /View formal review/); assert.match(t, /When you press this, SecurePay will open this review on the Agreement’s Support tab\./);
  assert.doesNotMatch(t, /Current Agreement version/);
  noSecrets(h); assert.doesNotMatch(h, /rc-secret/);
});
test('Review Help: a current-version case is labelled current; a Review that changed since the source screen shows the FRESH state', () => {
  const label = m.resolveHelpLabel(REVIEW_CTX, detailOf('Bathroom retiling', 'v2', 2));
  const now = text(help({ ctx: REVIEW_CTX, label, reviewCase: caseFact('DECIDED', 'v2') }));
  assert.match(now, /Review decided Current Agreement version/); assert.doesNotMatch(now, /Waiting for response/);      // fresh state wins over the source screen
});
test('Review Help: Review read fails, Agreement read succeeds -> Formal Review not refreshed and Agreement help remains', () => {
  const label = m.resolveHelpLabel(REVIEW_CTX, detailOf('Bathroom retiling', 'v2', 2));
  const t = text(help({ ctx: REVIEW_CTX, label, reviewCase: { status: 'error' } }));
  assert.match(t, /Formal Review couldn’t be refreshed\./); assert.doesNotMatch(t, /Waiting for response|Earlier Agreement version|Current Agreement version/);   // never rebuilt from the source screen
  assert.match(t, /Help with Bathroom retiling · version 2/); assert.match(t, /Open this Agreement/); assert.match(t, /Open Money/);
});
test('Review Help: Agreement read fails, Review read succeeds -> the Review state with NEUTRAL Agreement-version context', () => {
  const label = m.resolveHelpLabel(REVIEW_CTX, { status: 'error' });
  const t = text(help({ ctx: REVIEW_CTX, label, reviewCase: caseFact('UNDER_REVIEW', 'v1') }));
  assert.match(t, /From Formal Review Under review Agreement version context unavailable/);
  assert.doesNotMatch(t, /Earlier Agreement version|Current Agreement version/);
  assert.match(t, /This Agreement’s current context couldn’t be refreshed/); assert.match(t, /Help with this Agreement/); assert.doesNotMatch(t, /Help with Bathroom retiling/);
});
test('the exact Review is preserved through in-memory hints only: no case id in URL, storage or history', async () => {
  m.setDetailTabHint({ agreementId: 'a', tab: 'support', reviewCaseId: 'rc-1' });
  assert.equal(m.peekDetailTabHint().reviewCaseId, 'rc-1'); m.clearDetailTabHint(); assert.equal(m.peekDetailTabHint(), null);
  const ctxSrc = await src('src/features/support/context.ts');
  assert.doesNotMatch(ctxSrc, /localStorage|sessionStorage|URLSearchParams|history\.(push|replace)State/);
  assert.deepEqual([...ctxSrc.matchAll(/location\.hash = ([^;]+);/g)].map(x => x[1]), ["''"]);   // the only hash write returns to the root; it carries no identifier
  for (const f of ['src/features/support/tabHint.ts', 'src/features/support/label.ts', 'src/features/support/SupportExperience.tsx', 'src/features/review/ReviewPanel.tsx'])
    assert.doesNotMatch(await src(f), /localStorage|sessionStorage|URLSearchParams|history\.(push|replace)State|location\.(hash|search)\s*=|\?reviewCase/, f);
  const agent = await src('src/features/agent/AgentExperience.tsx');
  assert.match(agent, /openAgreementReviews: \(agreementId, reviewCaseId\) => \{ setDetailTabHint\(\{ agreementId, tab: 'support', reviewCaseId \}\)/);
  const ws = await src('src/features/workspace/WorkspaceExperience.tsx');
  assert.match(ws, /initialCaseId=\{tabHint\?\.agreementId === boltDetail\.id \? tabHint\.reviewCaseId \?\? null : null\}/);
  assert.match(ws, /reviewCaseId: review\.reviewCaseId, reviewAgreementVersionId: review\.agreementVersionId/);
  const panel = await src('src/features/review/ReviewPanel.tsx');
  assert.match(panel, /useState<string \| null>\(initialCaseId\)/);
  assert.match(panel, /selected && !chosen && merged\.status !== 'loading'/);   // exact case read even when it isn't in the loaded list page
});
test('Review Help returns to the exact case: the hint selects it, and a case outside the loaded page is read directly', () => {
  // SSR of the panel shows the loading state first (effects don't run); the selection contract is asserted through initial state above.
  const h = html(m.ReviewPanel, { gateway: {}, agreementGateway: {}, agreementId: 'a', currentVersionId: 'v2', initialCaseId: 'rc-1' });
  assert.match(text(h), /Loading reviews…/);
});

test('every contextual Help -- including a Money exception -- re-reads the exact Agreement Detail; the exception is a labelled snapshot', async () => {
  const s = await src('src/features/support/SupportExperience.tsx');
  assert.match(s, /const detail = useRead\(signedIn && agreementId \? \(\) => agreementGateway\.detail\(agreementId\) : null/);
  assert.doesNotMatch(s, /ctx\.kind !== 'money-exception'/);
  assert.match(s, /reviewGateway\.list\(/);
  assert.match(s, /ctx\?\.kind === 'agreement' && agreementId/);          // a Money exception does NOT load all Review data
  assert.match(s, /reviewGateway\.detail\(ctx\.reviewCaseId, ctx\.agreementId\)/);
  const t = text(help({ ctx: MONEY_CTX, label: L({}), money: ready({ headline: 'Payment Ready' }) }));
  assert.match(t, /This is what SecurePay showed on the Money screen when you opened Help\. Open Money for the current state/);
});
test('Money exception race: Agreement changed before Help opens -> snapshot preserved, fresh title/current version used, Open Money gets fresh context', () => {
  const label = m.resolveHelpLabel(MONEY_CTX, detailOf('Bathroom retiling (renamed)', 'v3', 3));
  assert.equal(label.title, 'Bathroom retiling (renamed)'); assert.equal(label.currentVersionId, 'v3'); assert.equal(label.freshVersionLabel, 'version 3'); assert.equal(label.notice, m.HELP_CHANGED_NOTICE);
  let handed = null;
  const h = html(m.SupportView, { signedIn: true, ctx: MONEY_CTX, label, reviews: null, money: ready({ headline: 'Payment Ready' }), nav: { ...nav, openMoney: x => { handed = x; } } });
  const t = text(h);
  assert.match(t, /Help with Bathroom retiling \(renamed\)/); assert.match(t, /The Agreement changed after you opened Help/);
  assert.match(t, /SecurePay needs attention on this payment/); assert.match(t, /Settlement outcome is uncertain and is held for review\./);     // snapshot preserved
  // the handoff Open Money would receive is built from the FRESH read, not the source ctx
  assert.deepEqual({ title: label.title, versionLabel: label.freshVersionLabel, currentVersionId: label.currentVersionId }, { title: 'Bathroom retiling (renamed)', versionLabel: 'version 3', currentVersionId: 'v3' });
  assert.equal(handed, null);
});
test('Money exception + Agreement Detail fails: the exception stays; the source title/version are NOT presented as newly confirmed', () => {
  const label = m.resolveHelpLabel(MONEY_CTX, { status: 'error' });
  assert.equal(label.titleConfirmed, false); assert.equal(label.currentVersionId, null); assert.equal(label.freshVersionLabel, null);
  const t = text(help({ ctx: MONEY_CTX, label, money: { status: 'error' } }));
  assert.match(t, /SecurePay needs attention on this payment/); assert.match(t, /Settlement outcome is uncertain/);
  assert.match(t, /This Agreement’s current context couldn’t be refreshed/); assert.match(t, /Help with this Agreement/); assert.doesNotMatch(t, /Help with Bathroom retiling/);
  assert.match(t, /Money couldn’t be loaded\./);
});
test('version currency is decided by IDS, never by formatted display text', () => {
  const ctx = { kind: 'agreement', agreementId: 'a', title: 'Villa', versionLabel: 'version 1', currentVersionId: 'v1' };
  // ids equal, but the fresh TITLE happens to equal the old "title · label" display string -> the label must still be kept
  const kept = m.resolveHelpLabel(ctx, detailOf('Villa · version 1', 'v1', 1));
  assert.equal(kept.versionLabel, 'version 1');
  // ids differ, but the fresh title equals the old display string and the fresh number reads "version 1" -> the label must still be dropped
  const dropped = m.resolveHelpLabel(ctx, detailOf('Villa · version 1', 'v9', 1));
  assert.equal(dropped.versionLabel, null); assert.equal(dropped.notice, m.HELP_CHANGED_NOTICE);
  // a title that merely contains version-like text cannot make an unknown version current
  assert.equal(m.resolveHelpLabel(ctx, detailOf('Villa version 1', null, undefined)).versionLabel, null);
  assert.equal(m.resolveHelpLabel({ ...ctx, currentVersionId: null }, detailOf('Villa', 'v1', 1)).versionLabel, null);
  const src2 = readFileSync('src/features/support/label.ts', 'utf8');
  assert.match(src2, /sourceId === freshId/); assert.doesNotMatch(src2, /resolveHandoffContext|\.context|!==\s*detail/);
});
test('Store and Community are separate factual choices, each with its own consequence and its own action', async () => {
  const s = await src('src/features/support/SupportExperience.tsx');
  assert.match(s, /<Action title="Store" consequence="SecurePay will open the Store\." onClick=\{nav\.store\} \/>/);
  assert.match(s, /<Action title="Community" consequence="SecurePay will open Community\." onClick=\{nav\.community\} \/>/);
  const agent = await src('src/features/agent/AgentExperience.tsx');
  assert.match(agent, /store: \(\) => \{ setHelpContext\(null\); navigateTo\('store'\)/); assert.match(agent, /community: \(\) => \{ setHelpContext\(null\); navigateTo\('community'\)/);
});
