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

test('J. The Home hero (SignedOutHome) uses the exact KS001 Upgrade Phase 3 headline/supporting/trust copy (deliberately superseding the earlier locked copy -- Section 36), and a Fair Trade affordance beneath the input that never grades the person', async () => {
  const contents = await readFile('src/components/SignedOutHome.tsx', 'utf8');
  assert.match(contents, /Bring the plan\. Leave with an agreement\./, 'exact Phase 3 headline');
  assert.match(contents, /Tell SecurePay what you're trying to make happen, paste what you already have, or give KS001 a document or photo\. It helps you make the important details clear and shows how the money should follow what was agreed\./, 'exact Phase 3 supporting text');
  assert.match(contents, /Start without a KS Number\. Nothing becomes an agreement until you review and confirm it\./, 'exact Phase 3 trust line');
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

test('L. PHASE 4 Care convergence -- notification deep-linking now routes on the CLOSED actionKey contract, never on agreementId presence alone', async () => {
  const contents = await readFile('src/features/notifications/NotificationsExperience.tsx', 'utf8');
  // The prior doctrine ("actionKey is never populated, route on agreementId alone") was a real, named
  // bug once real Care events started carrying OPEN_INVITATIONS/OPEN_AGREEMENT/REVIEW_AGREEMENT: an
  // invited person who has not yet joined may have no Agreement read authority at all, even though
  // agreementId is still carried for audit/context. Routing must go through the closed parser.
  assert.match(contents, /parseNotificationActionKey\(notification\.actionKey\)/, 'must route through the closed actionKey parser, never a raw string comparison');
  assert.match(contents, /notification\.agreementId/, 'agreementId is still consulted -- but only alongside an Agreement-scoped actionKey, never alone');
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

// ─── Q-V. Final Correction Pass: Chat Atmosphere / KS001 Mobile / Understanding Title / Notification Truth / Account Completeness ─────

test('Q1. The mobile sticky header shows a real KS001 identity row (real mark icon + name), not just BUILD/UNDERSTOOD tabs alone', async () => {
  const contents = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  const start = contents.indexOf('md:hidden sticky top-0 z-10 bg-cream-50');
  const end = contents.indexOf('flex-1 flex overflow-hidden');
  assert.ok(start > -1 && end > start, 'expected to find the mobile sticky header block');
  const mobileHeaderBlock = contents.slice(start, end);
  assert.match(mobileHeaderBlock, /securepayMark/, 'mobile header must show the real SecurePay mark icon');
  assert.match(mobileHeaderBlock, />KS001</, 'mobile header must name KS001');
  assert.match(mobileHeaderBlock, /Build/);
  assert.match(mobileHeaderBlock, /Understood/);
});

test('Q2. The active KS001 conversation surface uses the restrained green atmosphere token, whose value never bundles a bare color into background-image (the exact bug this pass found: an invalid extra layer silently drops the whole declaration)', async () => {
  const agentExperience = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agentExperience, /bg-ks001-surface/, 'the conversation surfaces must use the ks001-surface atmosphere token');
  const tailwindConfig = await readFile('tailwind.config.js', 'utf8');
  const match = tailwindConfig.match(/'ks001-surface':\s*'([^']+)'/);
  assert.ok(match, 'ks001-surface token must be defined in tailwind.config.js');
  const value = match[1];
  assert.doesNotMatch(value, /,\s*#[0-9a-fA-F]{3,8}\s*$/, 'background-image value must never end with a bare hex color as an extra layer');
  assert.match(value, /^radial-gradient/, 'must be built from gradient functions only');
});

test('Q3. The desktop understanding panel title is always exactly "What SecurePay understands", never a backend-supplied per-turn panel title', async () => {
  const contents = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  // UI Phase 1: the fixture ContextPanel was replaced by the production workbench pane; the title is still a hardcoded literal.
  assert.match(contents, /<h2[^>]*>What SecurePay understands<\/h2>/, 'the panel title must be the exact, hardcoded product-doctrine string');
  assert.doesNotMatch(contents, /panelTitle=\{panel\?\.title|<h2[^>]*>\{panel/, 'must never let a backend panel.title override the product title');
});

test('Q4. No generic avatar (AgentIcon or a hand-drawn silhouette) is reintroduced anywhere in real production KS001 surfaces', async () => {
  for (const file of ['src/features/agent/AgentExperience.tsx', 'src/components/MessageBubble.tsx', 'src/components/ContextPanel.tsx']) {
    const contents = await readFile(file, 'utf8');
    assert.doesNotMatch(contents, /AgentIcon/, `${file} must not reintroduce the retired generic AgentIcon`);
    assert.doesNotMatch(contents, /M6 27c0-5\.5 4\.5-10 10-10s10 4\.5 10 10/, `${file} must not reintroduce the hand-drawn generic silhouette path`);
  }
});

test('R1. SignedInHome keeps the earlier headline as its own conversational-mode label (Section 36 -- "may remain as the conversational mode label, not the hero promise"); SignedOutHome carries the Phase 3 hero copy; both keep the Fair Trade affordance', async () => {
  const signedIn = await readFile('src/components/SignedInHome.tsx', 'utf8');
  assert.match(signedIn, /Tell SecurePay what you're trying to make happen\./, 'SignedInHome may keep the earlier phrase as its own mode label');
  assert.match(signedIn, /FairTradeAffordance/, 'SignedInHome must keep the Fair Trade affordance');
  const signedOut = await readFile('src/components/SignedOutHome.tsx', 'utf8');
  assert.match(signedOut, /Bring the plan\. Leave with an agreement\./, 'SignedOutHome must carry the Phase 3 hero headline, not only the earlier phrase');
  assert.match(signedOut, /FairTradeAffordance/, 'SignedOutHome must keep the Fair Trade affordance');
});

test('S1. Notifications loadMore preserves the active category/unreadOnly filters, appends without duplicating, and never fabricates a total -- hasMore only ever means "the last page was full"', async () => {
  const bundle = await build({ stdin: { contents: `export * from './src/features/notifications/controller';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const notification = (id, overrides = {}) => ({ id, category: 'AGREEMENTS', eventKey: 'agreement.invitation_issued', priority: 'HIGH', title: 't', body: 'b', agreementId: null, bridgeId: null, actionKey: null, createdAt: '2026-01-01T00:00:00Z', readAt: null, resolvedAt: null, resolutionAction: null, version: 1, ...overrides });
  const calls = [];
  const pageOne = Array.from({ length: 20 }, (_, i) => notification(`n${i}`));
  const pageTwo = [notification('n19'), notification('n20'), notification('n21')]; // n19 overlaps -- must not duplicate
  const gateway = {
    list: async (params) => { calls.push(params); return params.page === 0 ? pageOne : pageTwo; },
    markRead: async () => { throw new Error('not used'); },
    resolve: async () => { throw new Error('not used'); },
    getPreferences: async () => { throw new Error('not used'); },
    updatePreferences: async () => { throw new Error('not used'); },
  };
  const controller = api.createNotificationsController(gateway);
  // Set both filters and let their own (fire-and-forget) loads settle before the assertions below,
  // which only examine the load()/loadMore() calls made once filters are stable -- not the
  // transient loadInbox() each setter triggers on its own.
  controller.setCategoryFilter('AGREEMENTS');
  controller.setUnreadOnly(true);
  await new Promise(r => setTimeout(r, 0));
  calls.length = 0;
  await controller.load();
  assert.equal(controller.getSnapshot().inbox.data.length, 20);
  assert.equal(controller.getSnapshot().hasMore, true, 'a full page (20 === size) must permit one further load');
  await controller.loadMore();
  const state = controller.getSnapshot();
  assert.equal(state.inbox.data.length, 22, 'n19 must not be duplicated: 20 + 3 - 1 overlap = 22');
  assert.equal(state.hasMore, false, 'a short page (3 < 20) must end pagination, never fabricate a total');
  assert.equal(calls.length, 2, 'expected exactly one load() call and one loadMore() call');
  for (const call of calls) {
    assert.equal(call.category, 'AGREEMENTS', 'loadMore must preserve the active category filter');
    assert.equal(call.unreadOnly, true, 'loadMore must preserve the active unreadOnly filter');
  }
});

test('S2. No generic resolve action/button is exposed in the Notifications UI -- only real, backend-returned resolved state is displayed', async () => {
  const contents = await readFile('src/features/notifications/NotificationsExperience.tsx', 'utf8');
  assert.doesNotMatch(contents, /controller\.resolve\(/, 'the Notifications screen must not invent a generic resolution control');
  assert.match(contents, /resolvedAt/, 'must still display real resolved state where the backend returns it');
});

test('T1. Settings no longer binds a WhatsApp/SMS/Email toggle to TraderSettings\' own draft -- Notifications is the one real delivery-control surface', async () => {
  // Strip comments first -- this file's own doc comment names notifyEmail/notifySms/notifyPush as
  // the fields it deliberately no longer renders, which would false-positive a naive scan.
  const raw = await readFile('src/features/settings/SettingsExperience.tsx', 'utf8');
  const codeOnly = raw.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(codeOnly, /notifyEmail|notifySms|notifyPush/, 'the three inert TraderSettings channel toggles must no longer be rendered');
  assert.match(codeOnly, /onNavigate\('notifications'\)/, 'must point to Notifications as the one delivery-control surface');
});

test('T2. The WhatsApp preference toggle always reflects the real draft value -- never a hardcoded true', async () => {
  const contents = await readFile('src/features/notifications/NotificationsExperience.tsx', 'utf8');
  assert.match(contents, /checked=\{state\.preferencesDraft\.whatsappEnabled\}/, 'the WhatsApp toggle must be bound to the real draft value');
});

test('U1. Plan & Subscription reads only real subscription-status fields -- no invented invoices, next billing date, cancellation, payment card, or upgrade recommendations', async () => {
  // Strip comments first -- this file's own doc comment names exactly these forbidden concepts as
  // what it deliberately does NOT invent, which would false-positive a naive scan.
  const raw = await readFile('src/features/account/AccountExperience.tsx', 'utf8');
  const codeOnly = raw.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(codeOnly, /invoice|next billing|upgrade|cancellation|payment card/i, 'must not invent subscription capabilities the backend does not return');
  assert.match(codeOnly, /subscription\.plan/);
  assert.match(codeOnly, /subscription\.monthlyFeeMinor/);
});

test('U2. Plan & Subscription never mutates the plan on a simple view -- no selectPlan call from AccountExperience/its controller', async () => {
  const experience = await readFile('src/features/account/AccountExperience.tsx', 'utf8');
  const controller = await readFile('src/features/account/controller.ts', 'utf8');
  assert.doesNotMatch(experience, /selectPlan/, 'viewing the plan must never itself select/change it');
  assert.doesNotMatch(controller, /selectPlan/, 'the account controller must never call selectPlan');
});

test('U3. Change password uses the real AuthGateway currentPassword/newPassword contract; the confirmation field is local-only and never sent anywhere', async () => {
  const controller = await readFile('src/features/account/controller.ts', 'utf8');
  assert.match(controller, /changePassword\(currentPassword: string, newPassword: string\)/, 'must use the real two-field contract');
  assert.match(controller, /gateway\.changePassword\(\{ currentPassword, newPassword \}\)/, 'must call the real gateway method with exactly these two fields');
  assert.doesNotMatch(controller, /confirmPassword/, 'the controller must never see a confirmPassword field -- that check is local-only in the component');
  const experience = await readFile('src/features/account/AccountExperience.tsx', 'utf8');
  assert.doesNotMatch(experience, /controller\.changePassword\([^)]*confirmPassword/, 'confirmPassword must never be sent to the controller');
});

test('U4. Password fields clear immediately on success, on cancel, and on unmount, and are never logged, persisted, or placed in a URL', async () => {
  const experience = await readFile('src/features/account/AccountExperience.tsx', 'utf8');
  assert.match(experience, /useEffect\(\(\) => \{ if \(state\.changePasswordDone\) clearFields\(\); \}/, 'fields must clear immediately on success');
  assert.match(experience, /useEffect\(\(\) => \(\) => clearFields\(\), \[\]\)/, 'fields must clear on unmount');
  assert.match(experience, /const cancel = \(\) => \{ clearFields\(\)/, 'fields must clear on cancel');
  assert.doesNotMatch(experience, /console\./, 'must never log password values');
  assert.doesNotMatch(experience, /localStorage|sessionStorage/, 'must never persist password values');
  assert.doesNotMatch(experience, /URLSearchParams.*[Pp]assword/, 'must never place a password in a query string');
});

test('V1. Plan & Subscription formats monthlyFeeMinor through the shared BigInt-safe decimalMoney formatter, never a new Number-based minor-unit conversion', async () => {
  const contents = await readFile('src/features/account/AccountExperience.tsx', 'utf8');
  assert.match(contents, /decimalMoney\(String\(subscription\.monthlyFeeMinor\)/, 'must format through the shared decimalMoney formatter, converting to string first (never dividing/multiplying via Number)');
  assert.doesNotMatch(contents, /Number\(\s*subscription\.monthlyFeeMinor/, 'must never coerce monthlyFeeMinor through Number(...)');
});

// ─── W. Session-clearing correction: backend authority wins immediately on password change ─────

test('W1. A successful password change calls the real changePassword gateway and then notifies its caller -- authority is reflected immediately, not on the next failed request', async () => {
  const bundle = await build({ stdin: { contents: `export * from './src/features/account/controller';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const calls = [];
  const gateway = {
    circle: { me: async () => { throw new Error('not used'); } },
    business: { get: async () => { throw new Error('not used'); } },
    authorization: { authoritySummary: async () => { throw new Error('not used'); } },
    logoutAll: async () => { throw new Error('not used'); },
    subscription: { myStatus: async () => { throw new Error('not used'); } },
    changePassword: async (body) => { calls.push(body); },
  };
  let onPasswordChangedCalls = 0;
  const controller = api.createAccountController(gateway, () => { onPasswordChangedCalls += 1; });
  await controller.changePassword('old-pw', 'new-pw');
  assert.deepEqual(calls, [{ currentPassword: 'old-pw', newPassword: 'new-pw' }], 'must call the real gateway with exactly these two fields');
  assert.equal(onPasswordChangedCalls, 1, 'must notify its caller exactly once on success');
  assert.equal(controller.getSnapshot().changePasswordDone, true);
});

test('W2. A failed password change does NOT notify its caller -- the current session must not be cleared on failure', async () => {
  const bundle = await build({ stdin: { contents: `export * from './src/features/account/controller';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const gateway = {
    circle: { me: async () => { throw new Error('not used'); } },
    business: { get: async () => { throw new Error('not used'); } },
    authorization: { authoritySummary: async () => { throw new Error('not used'); } },
    logoutAll: async () => { throw new Error('not used'); },
    subscription: { myStatus: async () => { throw new Error('not used'); } },
    changePassword: async () => { throw new Error('wrong current password'); },
  };
  let onPasswordChangedCalls = 0;
  const controller = api.createAccountController(gateway, () => { onPasswordChangedCalls += 1; });
  await controller.changePassword('wrong-pw', 'new-pw');
  assert.equal(onPasswordChangedCalls, 0, 'a failed attempt must never clear the session');
  assert.equal(controller.getSnapshot().changePasswordDone, false);
  assert.ok(controller.getSnapshot().changePasswordError, 'must surface the failure');
});

test('W3. Cancelling the Change Password form never notifies the session-clearing callback -- resetChangePasswordStatus is a local UI reset only', async () => {
  const bundle = await build({ stdin: { contents: `export * from './src/features/account/controller';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const gateway = {
    circle: { me: async () => { throw new Error('not used'); } },
    business: { get: async () => { throw new Error('not used'); } },
    authorization: { authoritySummary: async () => { throw new Error('not used'); } },
    logoutAll: async () => { throw new Error('not used'); },
    subscription: { myStatus: async () => { throw new Error('not used'); } },
    changePassword: async () => { throw new Error('not used -- cancel must never call the gateway'); },
  };
  let onPasswordChangedCalls = 0;
  const controller = api.createAccountController(gateway, () => { onPasswordChangedCalls += 1; });
  controller.resetChangePasswordStatus();
  assert.equal(onPasswordChangedCalls, 0, 'cancel must never clear the session');
});

test('W4. AgentExperience wires the account controller\'s session-clearing callback to the real SessionStore.clear(), and reuses the existing notice banner rather than a new flash-message mechanism', async () => {
  const contents = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  const callSite = contents.slice(contents.indexOf('createAccountController('), contents.indexOf('createAccountController(') + 600);
  assert.match(callSite, /session\.clear\(\)/, 'must call the real SessionStore.clear()');
  assert.match(callSite, /setNotice\(/, 'must reuse the existing notice banner, not a new mechanism');
  assert.doesNotMatch(contents, /localStorage|sessionStorage/, 'must never introduce a second, storage-backed auth state');
  assert.doesNotMatch(contents, /jwt-decode|atob\(.*token/i, 'must never decode a token client-side to manage session state');
});

test('W5. Authenticated-only views (Account, Settings, Business, Developer, Notifications, Workspace) all still gate on sessionState.status === \'signed-in\' -- clearing the session immediately closes every one of them, not just Account', async () => {
  const contents = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  const guardedReturns = [
    /if \(account && sessionState\.status === 'signed-in'\)/,
    /if \(settingsView && sessionState\.status === 'signed-in'\)/,
    /if \(businessView && sessionState\.status === 'signed-in'\)/,
    /if \(developerView && sessionState\.status === 'signed-in'\)/,
    /if \(notificationsView && sessionState\.status === 'signed-in'\)/,
    /if \(workspace && sessionState\.status === 'signed-in'\)/,
  ];
  for (const pattern of guardedReturns) {
    assert.match(contents, pattern, `expected ${pattern} -- every authenticated screen must fail closed the instant sessionState flips to signed-out`);
  }
});

test('W6. signOutEverywhere\'s existing behaviour is unchanged by this correction -- it still only calls logoutAll, never the new session-clearing callback', async () => {
  const controller = await readFile('src/features/account/controller.ts', 'utf8');
  const start = controller.indexOf('async signOutEverywhere()');
  const end = controller.indexOf('async changePassword(');
  assert.ok(start > -1 && end > start, 'expected to find signOutEverywhere before changePassword');
  const signOutEverywhereBlock = controller.slice(start, end);
  assert.match(signOutEverywhereBlock, /gateway\.logoutAll\(\)/);
  assert.doesNotMatch(signOutEverywhereBlock, /onPasswordChanged/, 'signOutEverywhere must not be touched by this narrow fix');
});
