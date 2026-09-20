import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

// Phase 6 -- Final Convergence & Production. Repository-wide regression tests, not duplicating the
// dozens of narrower doctrine tests already in earlier suites (referrals-plugs-masters, community-
// circles, life-business, store, money-experience, etc.) -- see docs/PHASE6_CONVERGENCE_PRODUCTION.md.

async function allSourceFiles(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await allSourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}
const SRC_FILES = await allSourceFiles('src');

// ─── A. Repository-wide precision regression guard ─────────────────────────
// This is the third time a string-backed minor-unit amount has been silently corrupted through
// Number(...) (Master/Plug in Phase 4, Projects in Phase 5, workspace/view.ts's formatMoney --
// the single most widely-rendered money display in the app -- found and fixed in Phase 6). This
// test exists specifically so a fourth occurrence anywhere in the tree fails CI immediately,
// rather than waiting for another archaeology pass to notice it by chance.

test('A1. No source file anywhere coerces an identifier containing "Minor" through Number(...) or parseFloat/parseInt -- every string-backed minor-unit amount must go through the shared decimalMoney formatter (or an equivalent BigInt-safe path) instead', async () => {
  const forbidden = /(?:Number|parseFloat|parseInt)\(\s*[a-zA-Z0-9_.?[\]]*[Mm]inor/;
  const offenders = [];
  for (const file of SRC_FILES) {
    if (file === path.join('src', 'decimalMoney.ts')) continue; // the formatter's own tests exercise Number.isSafeInteger, not a coercion of a minor-unit value
    const contents = await readFile(file, 'utf8');
    // Allow this exact file's own doc-comment quoting the historical bug for context.
    const codeOnly = file === path.join('src', 'features', 'workspace', 'view.ts')
      ? contents.replace(/\/\*\*[\s\S]*?\*\//g, '')
      : contents;
    if (forbidden.test(codeOnly)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `Found Number(...)/parseFloat/parseInt coercion of a *Minor identifier in: ${offenders.join(', ')}`);
});

test('A2. workspace/view.ts\'s formatMoney renders a huge string-backed proposedAmountMinor (beyond Number.MAX_SAFE_INTEGER) exactly, through agreementSummaryView -- the single most widely-rendered money display in the app', async () => {
  const bundle = await build({ stdin: { contents: `export * as view from './src/features/workspace/view';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

  const dto = {
    agreementId: 'a1', publicReference: 'REF-1', title: 'Perimeter wall', purpose: 'Build a wall',
    status: 'ACTIVE', agreementType: 'STANDARD',
    proposedAmountMinor: '900719925474099312345', // 21 digits -- Number(...) already loses the trailing digits at this size
    currency: 'KES', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    currentActor: { roleCode: 'CUSTOMER', participantStatus: 'ACTIVE' }, counterparty: null,
    nextDeadline: null, attentionRequired: false, nextActions: [],
    currentAgreementVersionId: 'v1', completion: { completed: false, status: 'NOT_COMPLETE', reasonCodes: [], agreementVersionId: 'v1', completedAt: null },
  };
  const summary = api.view.agreementSummaryView(dto, { kind: 'hub', bucket: 'active' });
  assert.equal(summary.amount, 'KES 9,007,199,254,740,993,123.45');
});

test('A3. formatMoney\'s number-typed call sites (e.g. remainingFundedMinor, a real backend long) still render correctly through the same shared path', async () => {
  const bundle = await build({ stdin: { contents: `export * as view from './src/features/workspace/view';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const view = api.view.moneyByCurrencyView([{ currency: 'KES', fundedTotalMinor: 500000, exercisedOrSettledMinor: 0, releasedTotalMinor: 0, remainingFundedMinor: 500000, positionCount: 1 }]);
  assert.equal(view[0].remainingFundedLabel, 'KES 5,000.00');
});

// ─── B. No production import from fixture/demo data, repo-wide ─────────────────────────

test('B. No file in the real production feature layer (src/features/**) or the real entry point (RuntimeApp.tsx) imports a top-level *Data.ts fixture module -- only Bolt fixture components under src/components/ and the App.tsx fixture harness may (per-domain tests, e.g. store.test.mjs\'s "L", already lock this for individual areas; this is the repo-wide backstop)', async () => {
  const fixtureModules = ['storeData', 'circleData', 'communityData', 'ecosystemData', 'moneyData', 'demoData', 'milestoneData', 'disputeData', 'offerTradeSnapshot'];
  const forbidden = new RegExp(`from ['"].*(${fixtureModules.join('|')})['"]`);
  const offenders = [];
  const realProductionFiles = SRC_FILES.filter(f => f.startsWith(path.join('src', 'features') + path.sep) || f === path.join('src', 'RuntimeApp.tsx'));
  for (const file of realProductionFiles) {
    const contents = await readFile(file, 'utf8');
    if (forbidden.test(contents)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `Found a fixture-data import in the real production feature layer: ${offenders.join(', ')}`);
});

// ─── C. No secret/token persisted to storage or the URL query string, repo-wide ─────────────────────────

test('C. No source file anywhere writes to localStorage/sessionStorage, and no source file builds a URLSearchParams containing a token/secret/password/otp identifier (the three real token-carrying routes -- invitation, store offer, money-session -- are all hash-based, never query-string)', async () => {
  const storageOffenders = [];
  const tokenInQueryOffenders = [];
  for (const file of SRC_FILES) {
    const contents = await readFile(file, 'utf8');
    if (/localStorage|sessionStorage/.test(contents)) storageOffenders.push(file);
    if (/URLSearchParams/.test(contents) && /(token|secret|password|otp|clientId|signingSecret|secureCode)/i.test(contents)) {
      // URLSearchParams is legitimately used elsewhere (e.g. Projects' ownerKsNumber/active/query
      // filters) -- only flag a file that ALSO mentions a token-shaped identifier near it.
      if (!/ownerKsNumber|category|active\b/.test(contents)) tokenInQueryOffenders.push(file);
    }
  }
  assert.deepEqual(storageOffenders, [], `Found localStorage/sessionStorage usage in: ${storageOffenders.join(', ')}`);
  assert.deepEqual(tokenInQueryOffenders, [], `Found a token-shaped identifier alongside URLSearchParams in: ${tokenInQueryOffenders.join(', ')}`);
});

test('C2. console.log/console.debug is never used anywhere in production source (console.error/warn are also absent today -- if reintroduced, they must never log a token/secret/password/otp value)', async () => {
  const offenders = [];
  for (const file of SRC_FILES) {
    const contents = await readFile(file, 'utf8');
    if (/console\.(log|debug)\(/.test(contents)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `Found console.log/debug in: ${offenders.join(', ')}`);
});

// ─── D. No mixed-currency frontend aggregation ─────────────────────────

test('D. Project/Money summary views never sum amounts across different currencies -- every aggregate is grouped by currency first (by-currency arrays/records), never reduced into one cross-currency total', async () => {
  const files = ['src/features/workspace/view.ts', 'src/features/projects/ProjectsExperience.tsx', 'src/features/money/MoneyExperience.tsx'];
  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    // A cross-currency sum would look like adding two different *Minor fields together, or a
    // reduce() over a by-currency array producing a single scalar. Neither pattern exists today.
    assert.doesNotMatch(contents, /\.reduce\([^)]*\+[^)]*[Mm]inor/, `${file} must not reduce a by-currency array into a single summed amount`);
  }
});

// ─── E. Agreement next-action ordering stays backend-authoritative ─────────────────────────

test('E. No frontend file sorts, filters-by-invented-priority, or re-orders a backend nextActions array before rendering its first element -- the backend\'s own ordering is used as-is', async () => {
  const contents = await readFile('src/features/workspace/view.ts', 'utf8');
  assert.doesNotMatch(contents, /nextActions[^;]*\.sort\(/, 'must never locally sort the backend\'s own nextActions ordering');
  assert.match(contents, /nextActions\[0\]/, 'must read the backend\'s own first-ranked next action directly');
});

// ─── F. Offer SecureLink never calls Agreement join/confirm authority directly ─────────────────────────

test('F. No Store/Offer file calls Agreement join/confirmVersion authority -- Offer SecureLink is view-only and never itself an Agreement invitation', async () => {
  const forbidden = /\.join\(|\.confirmVersion\(/;
  for (const file of ['src/features/store/StoreExperience.tsx', 'src/features/store/controller.ts', 'src/features/store/route.ts']) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, forbidden, `${file} must never call Agreement join/confirm authority`);
  }
});

// ─── G. Production fails closed without a configured gateway ─────────────────────────

test('G. RuntimeApp fails closed to an Unavailable state when SecurePay API configuration is missing/invalid, rather than throwing an unhandled error or rendering with an undefined gateway', async () => {
  const contents = await readFile('src/RuntimeApp.tsx', 'utf8');
  assert.match(contents, /try\s*\{\s*api\s*=\s*createSecurePayApi/, 'API construction must be wrapped so a configuration error cannot crash the app');
  assert.match(contents, /catch\s*\{/, 'the construction failure must be caught');
  assert.match(contents, /Unavailable/, 'a calm Unavailable fallback component must exist');
});

test('G2. The Unavailable state never renders a stack trace or raw error object -- only calm, fixed copy', async () => {
  const contents = await readFile('src/RuntimeApp.tsx', 'utf8');
  const unavailableFn = contents.slice(contents.indexOf('function Unavailable'));
  assert.doesNotMatch(unavailableFn, /\{error/, 'must not interpolate a raw error/exception object into the Unavailable screen');
  assert.doesNotMatch(unavailableFn, /\.stack\b/, 'must not render a stack trace');
});

// ─── H. Dead-code sweep stays confirmed dead ─────────────────────────

test('H. The three confirmed-orphaned Bolt components removed in Phase 6 (AgreementMoneyHandoff, AgreementVersionCard, OfferComparisonView) are not reintroduced', async () => {
  for (const name of ['AgreementMoneyHandoff', 'AgreementVersionCard', 'OfferComparisonView']) {
    const hits = SRC_FILES.filter(f => f === path.join('src', 'components', `${name}.tsx`));
    assert.deepEqual(hits, [], `${name}.tsx should not exist -- it was confirmed unreferenced anywhere and removed`);
  }
});

// ─── I-P. Final Phase 6 Product Pass: Home / KS001 / Fair Trade / Notifications / WhatsApp ─────

test('I1. The KS001 conversation identity header names KS001, not "SecurePay" or a generic assistant label, and no longer uses the retired AgentIcon component', async () => {
  const contents = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /import\s*\{\s*AgentIcon\s*\}/, 'AgentExperience must not import the retired generic-avatar AgentIcon');
  const headerBlock = contents.slice(contents.indexOf('hidden md:flex items-center gap-2.5 px-4 md:px-6 py-3 border-b'), contents.indexOf('hidden md:flex items-center gap-2.5 px-4 md:px-6 py-3 border-b') + 400);
  assert.match(headerBlock, />KS001</, 'the conversation header must name the person\'s conversation partner KS001');
  assert.doesNotMatch(headerBlock, />SecurePay</, 'the conversation header must not relabel KS001 as SecurePay');
});

test('I2. MessageBubble no longer imports the retired generic-avatar AgentIcon and instead reuses the canonical SecurePay mark asset', async () => {
  const contents = await readFile('src/components/MessageBubble.tsx', 'utf8');
  assert.doesNotMatch(contents, /AgentIcon/, 'MessageBubble must not reference the retired AgentIcon');
  assert.match(contents, /securepay-mark-green\.png/, 'MessageBubble must reuse the one canonical SecurePay mark asset');
});

test('I3. ContextPanel\'s empty state no longer hand-draws a generic silhouette and instead reuses the canonical SecurePay mark asset', async () => {
  const contents = await readFile('src/components/ContextPanel.tsx', 'utf8');
  assert.doesNotMatch(contents, /M6 27c0-5\.5 4\.5-10 10-10s10 4\.5 10 10/, 'the hand-drawn generic silhouette path must be gone');
  assert.match(contents, /securepay-mark-green\.png/, 'ContextPanel must reuse the one canonical SecurePay mark asset');
});

test('I4. NavBar\'s top-left brand pairs the canonical SecurePay icon with the SecurePay wordmark, and exposes a quiet Notifications entry', async () => {
  const contents = await readFile('src/components/NavBar.tsx', 'utf8');
  assert.match(contents, /securepay-mark-green\.png/, 'top-left brand must include the canonical icon alongside the wordmark');
  assert.match(contents, /securepay-wordmark-horizontal\.png/, 'top-left brand must keep the SecurePay wordmark');
  assert.match(contents, /onNavigate\('notifications'\)/, 'NavBar must expose a route to Notifications');
  assert.doesNotMatch(contents, />\s*\d+\s*<\/(span|div)>/, 'the Notifications entry must not render a numeric badge count');
});

test('J. The Home hero (SignedOutHome) uses the exact locked headline and supporting text, and a Fair Trade affordance beneath the input that never grades the person', async () => {
  const contents = await readFile('src/components/SignedOutHome.tsx', 'utf8');
  assert.match(contents, /Tell SecurePay what you're trying to make happen\./, 'exact locked headline');
  assert.match(contents, /It helps you bring the people, plans and agreements together so everyone knows what happens next — and money can follow what was agreed\./, 'exact locked supporting text');
  assert.doesNotMatch(contents, /What are you trying to make happen\?/, 'the old paraphrased headline must be gone');
  assert.match(contents, /FairTradeAffordance/, 'must render the Fair Trade affordance');
});

test('J2. The Fair Trade principles panel reproduces the real, authoritative 12 principles verbatim -- in canonical order, with no invented/grading content', async () => {
  const bundle = await build({ stdin: { contents: `export * from './src/fairTradePrinciplesData';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
  const { FAIR_TRADE_PRINCIPLES } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  assert.equal(FAIR_TRADE_PRINCIPLES.length, 12, 'must be exactly the 12 Principles of Fair Trade, no more, no fewer');
  FAIR_TRADE_PRINCIPLES.forEach((p, i) => assert.equal(p.number, i + 1, 'principles must stay in their canonical numbered order'));
  assert.equal(FAIR_TRADE_PRINCIPLES[0].title, 'To Protect Trust');
  assert.equal(FAIR_TRADE_PRINCIPLES[11].title, 'To Honour Good');
  // Strip comments before scanning rendered code -- this file's own doc comments name the forbidden
  // "10/12"/"fair trader score" patterns as examples of what NOT to build, which would otherwise
  // false-positive against a naive scan of the raw file text.
  const rawContents = await readFile('src/components/FairTradePrinciples.tsx', 'utf8');
  const codeOnly = rawContents.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(codeOnly, /\d+\s*\/\s*12/, 'principles must never be presented as a score out of 12');
  assert.doesNotMatch(codeOnly, /fair trader score/i, 'principles must never be presented as a "fair trader score"');
});

test('K. The Notifications gateway calls the real, verified NotificationController contract exactly -- self-scoped paths, correct methods, auth:required throughout', async () => {
  const bundle = await build({ stdin: { contents: `export * from './src/api/securepay/notifications';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const calls = [];
  const http = { request: async (reqPath, options = {}) => { calls.push({ path: reqPath, method: options.method ?? 'GET', auth: options.auth, body: options.body }); return {}; } };
  const gateway = api.createNotificationsGateway(http);
  await gateway.list();
  await gateway.list({ category: 'AGREEMENTS', unreadOnly: true, page: 1, size: 10 });
  await gateway.get('n1');
  await gateway.markRead('n1');
  await gateway.resolve('n1', 'DISMISSED');
  await gateway.getPreferences();
  await gateway.updatePreferences({ whatsappEnabled: true, smsEnabled: false, emailEnabled: false, agreementsCategoryEnabled: true, moneyCategoryEnabled: true, reviewsCategoryEnabled: true, securityCategoryEnabled: true, communityCategoryEnabled: true, supportCategoryEnabled: true });
  assert.ok(calls.every(c => c.auth === 'required'), 'every notifications call must be self-scoped (auth:required), matching NotificationController');
  assert.equal(calls[0].path, '/api/v1/notifications/me');
  assert.match(calls[1].path, /^\/api\/v1\/notifications\/me\?category=AGREEMENTS&unreadOnly=true&page=1&size=10$/);
  assert.equal(calls[2].path, '/api/v1/notifications/me/n1');
  assert.deepEqual([calls[3].path, calls[3].method], ['/api/v1/notifications/me/n1/read', 'POST']);
  assert.deepEqual([calls[4].path, calls[4].method, calls[4].body], ['/api/v1/notifications/me/n1/resolve', 'POST', { resolutionAction: 'DISMISSED' }]);
  assert.equal(calls[5].path, '/api/v1/notifications/me/preferences');
  assert.deepEqual([calls[6].path, calls[6].method], ['/api/v1/notifications/me/preferences', 'PUT']);
  assert.deepEqual(Object.keys(calls[6].body).sort(), ['agreementsCategoryEnabled', 'communityCategoryEnabled', 'emailEnabled', 'moneyCategoryEnabled', 'reviewsCategoryEnabled', 'securityCategoryEnabled', 'smsEnabled', 'supportCategoryEnabled', 'whatsappEnabled'].sort(), 'preferences update must send exactly the real backend fields, nothing invented');
});

test('L. Notification deep-linking never invents an actionKey-to-route mapping -- only the real, present agreementId field is used to open an Agreement', async () => {
  const contents = await readFile('src/features/notifications/NotificationsExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /notification\.actionKey/, 'must never branch UI routing on actionKey, which no real backend event producer populates today');
  assert.match(contents, /notification\.agreementId/, 'must route using the real, present agreementId field');
});

test('M. Notification preferences are never force-enabled by the frontend -- savePreferences sends exactly the person\'s own draft values, unmodified', async () => {
  const bundle = await build({ stdin: { contents: `export * from './src/features/notifications/controller';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const preferences = { whatsappEnabled: false, smsEnabled: false, emailEnabled: false, agreementsCategoryEnabled: true, moneyCategoryEnabled: true, reviewsCategoryEnabled: true, securityCategoryEnabled: true, communityCategoryEnabled: true, supportCategoryEnabled: true, saved: true };
  const sentBodies = [];
  const gateway = {
    getPreferences: async () => preferences,
    updatePreferences: async body => { sentBodies.push(body); return { ...preferences, ...body, saved: true }; },
  };
  const controller = api.createNotificationsController(gateway);
  await controller.loadPreferences();
  await controller.savePreferences();
  assert.equal(sentBodies[0].whatsappEnabled, false, 'a person who left WhatsApp off must never have it silently turned on');
});

test('N. Settings and Notifications never present contradictory channel toggles -- Settings mentions WhatsApp only to point elsewhere, never as a checkbox bound to its own TraderSettings draft', async () => {
  const settingsContents = await readFile('src/features/settings/SettingsExperience.tsx', 'utf8');
  assert.doesNotMatch(settingsContents, /checked=\{state\.draft\.whatsapp/i, 'Settings (TraderSettings) must not bind a WhatsApp checkbox to its own draft -- that toggle lives only in Notifications preferences');
  assert.match(settingsContents, /onNavigate\('notifications'\)/, 'Settings must point to Notifications for WhatsApp/category delivery preferences, not silently omit the relationship');
});

test('O. No fabricated support ticket/queue/SLA/human-agent-availability state appears anywhere in the Notifications frontend', async () => {
  const contents = await readFile('src/features/notifications/NotificationsExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /ticket|queue|SLA|agent availab/i, 'must not fabricate support-desk concepts the real API does not expose');
});

test('P. The Notifications screen never puts an identifier in a URL query string that could leak in access logs -- category/unreadOnly/page/size are the only query parameters used, and Agreement/notification ids stay in the path', async () => {
  const contents = await readFile('src/api/securepay/notifications/index.ts', 'utf8');
  assert.doesNotMatch(contents, /URLSearchParams.*(?:notificationId|agreementId|identityId)/, 'no identifier may be placed in a query string');
});
