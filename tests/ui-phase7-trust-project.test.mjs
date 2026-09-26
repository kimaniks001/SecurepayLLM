import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
// Phase 7 Slice 5B -- The Trust Project convergence. The section explains the community and shared
// capabilities around SecurePay, BELOW the KS001 Home; it is never a separate product surface.
const bundle = await build({ stdin: { contents: `
export { TrustProjectSection } from './src/components/TrustProjectSection';
export { membershipLine } from './src/components/trustProject';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const noop = () => {};
const render = (props = {}) => text(api.renderToStaticMarkup(api.createElement(api.TrustProjectSection, { onExploreCommunity: noop, onOpenStores: noop, ...props })));
const strip = src => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const full = render();

// ------------------------------------------------------------ placement: KS001 first, no separate surface
test('the section renders AFTER the untouched KS001 Home, inside the same Home branch', async () => {
  const src = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  const home = src.indexOf('<SignedOutHome'), section = src.indexOf('<TrustProjectSection');
  assert.ok(home > 0 && section > home, 'TrustProjectSection must come after SignedOutHome');
  assert.ok(src.lastIndexOf('showHome ?', section) > 0 && src.indexOf('</div> : <>', home) > section, 'it must live in the Home branch only');
  const hero = await readFile('src/components/SignedOutHome.tsx', 'utf8');
  assert.match(hero, /Bring the plan\. Leave with an agreement\./);
  assert.doesNotMatch(hero, /Trust Project/, 'the KS001 hero itself is not changed or pushed down by Trust Project copy');
});
test('no Trust Project nav item, tab, route, view or page exists', async () => {
  const nav = await readFile('src/components/NavBar.tsx', 'utf8');
  assert.doesNotMatch(nav, /Trust Project|trust-project/i);
  const types = await readFile('src/types.ts', 'utf8');
  assert.doesNotMatch(types.match(/export type AppView[\s\S]*?;/)[0], /trust/i);
  const runtime = await readFile('src/RuntimeApp.tsx', 'utf8');
  assert.doesNotMatch(runtime, /trust-project|TrustProject/i);
});

// ------------------------------------------------------------ the proposition
test('it explains the three shared assets, why join, and participation, in that restrained order', () => {
  const order = ['The Trust Project', 'Shared fair-trade technologies, systems and people.', 'Technologies', 'Systems', 'People', 'Why join', 'How people take part', 'Members belong. Plugs connect. Masters know.'];
  let at = -1; for (const s of order) { const i = full.indexOf(s, at + 1); assert.ok(i > at, `"${s}" out of order or missing`); at = i; }
  assert.match(full, /Tools that make fair trade practical\./);
  assert.match(full, /Shared principles and ways of working that make fair trade repeatable\./);
  assert.match(full, /People bringing skills, knowledge, needs and opportunities\./);
  assert.match(full, /You stay independent: your own business, prices, customers and choices/);
  assert.match(full, /Use what helps you\. Contribute what you know\./);
  assert.match(full, /Money should follow the agreement\./);
});
test('Member / Plug / Master are capacities, not ranks, and none carries agreement, dispute or money authority', () => {
  assert.match(full, /A quiet member is a complete member — nobody has to invite anyone, teach, or take on another role/);
  assert.match(full, /Inviting someone to join is not an introduction and earns nothing/);
  assert.match(full, /qualifies under SecurePay’s existing referral rules/);
  assert.match(full, /Being a Master does not decide agreements, disputes or money/);
  assert.match(full, /paid teaching, mentoring or professional work is agreed separately/);
  assert.match(full, /one person can be both a Plug and a Master\. They are not ranks\./);
});
test('membership is belonging, never certification; a Store is not an endorsement', () => {
  assert.match(full, /Belonging is not a certificate that someone is trustworthy/);
  assert.match(full, /A Store is not an endorsement/);
  assert.match(full, /It can start empty — nothing is published until you publish it/);
});
test('the Skills Institute is named but NOT presented as available (locked Phase 11D capability truth)', () => {
  assert.match(full, /The Skills Institute, for structured training and practice, is not open yet\./);
  assert.match(full, /members can learn, test and adapt together/);
  assert.doesNotMatch(full, /enrol|course catalogue|our courses|earn a certificate|certified|practice lab|book a mentor/i);
});
test('forbidden claims and language never appear', () => {
  for (const bad of [/guarantee/i, /\belite\b/i, /exclusive/i, /trusted (people|member)/i, /verified trusted/i, /protected from/i, /future-proof/i, /join and earn/i, /recruit/i, /passive income/i, /downline/i, /escrow/i, /custody/i, /\bfrozen\b/i, /trust score/i, /reputation/i, /\bbank\b/i, /survive/i, /AI will/i, /community-approved/i, /TP-\d/]) {
    assert.doesNotMatch(full, bad, String(bad));
  }
});
test('one primary doorway (Explore Community) and few, real secondary links', () => {
  const src = strip(api.renderToStaticMarkup(api.createElement(api.TrustProjectSection, { onExploreCommunity: noop, onOpenStores: noop })));
  const buttons = src.match(/<button/g) ?? [];
  assert.ok(buttons.length <= 3, `too many actions: ${buttons.length}`);
  assert.match(full, /Explore Community/); assert.match(full, /Read the 12 Principles/); assert.match(full, /Stores/);
});
test('the 12 Principles are reused from the canonical source, never rewritten', async () => {
  const src = await readFile('src/components/TrustProjectSection.tsx', 'utf8');
  assert.match(src, /import \{ FairTradePrinciplesPanel \} from '\.\/FairTradePrinciples'/);
  assert.doesNotMatch(strip(src), /Principle \d|FAIR_TRADE_PRINCIPLES\s*=/);
});
test('the origin story is short and about problem → principles → technology → community', () => {
  assert.match(full, /How this started/);
  for (const s of [/memory, scattered messages and goodwill/, /practical principles of fair trade/, /SecurePay was built/, /people also need one another/, /community around those shared technologies, systems and people/]) assert.match(full, s);
  assert.doesNotMatch(full, /founder|wire/i);
});

// ------------------------------------------------------------ membership identity = KS Number
test('"Trust Project member · KS…" only for an ACTIVE member whose canonical KS Number is known; no second number', () => {
  assert.equal(api.membershipLine({ status: 'ACTIVE', canonicalKsNumber: 'KS123' }), 'Trust Project member · KS123');
  for (const f of [null, { status: 'ACTIVE', canonicalKsNumber: null }, { status: 'INVITED', canonicalKsNumber: 'KS123' }, { status: 'REVOKED', canonicalKsNumber: 'KS123' }, { status: 'DECLINED', canonicalKsNumber: 'KS1' }, { status: null, canonicalKsNumber: 'KS1' }]) {
    assert.equal(api.membershipLine(f), null, JSON.stringify(f));
  }
  assert.match(render({ compact: true, membership: { status: 'ACTIVE', canonicalKsNumber: 'KS123' } }), /Trust Project member · KS123/);
  assert.doesNotMatch(render({ membership: { status: 'REVOKED', canonicalKsNumber: 'KS123' } }), /Trust Project member ·/);
  assert.match(render({ compact: true, membership: { status: 'INVITED', canonicalKsNumber: 'KS9' } }), /You’ve been invited to The Trust Project\. You can accept or decline in Community\./);
});
test('the Home reads membership from the existing self-scoped record and the KS Number from /circle/me; stale identity is cleared on sign-out', async () => {
  const src = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(src, /communityGateway\.membership\.me\(\)/);
  assert.match(src, /circleGateway\.me\(\)\.then\(profile => \{ if \(!cancelled\) setOwnKsNumber\(profile\.canonicalKsNumber\)/);
  assert.match(src, /if \(sessionState\.status !== 'signed-in'\) \{ setOwnKsNumber\(null\); return; \}/);
  assert.match(src, /membership=\{sessionState\.status === 'signed-in' && trustMembershipStatus !== undefined/);
  assert.doesNotMatch(await readFile('src/components/trustProject.ts', 'utf8'), /membershipNumber|memberNumber|TP-/);
});
test('signed-in people get a smaller doorway with the full explanation one tap away', () => {
  const compact = render({ compact: true });
  assert.match(compact, /Shared fair-trade technologies, systems and people\./); assert.match(compact, /What The Trust Project is/);
  assert.doesNotMatch(compact, /How people take part|Why join/);
  assert.match(compact, /Explore Community/);
});

test('the real signed-in Home (Workspace) keeps its own headline and adds only the compact doorway BELOW it; its Community nav now works', async () => {
  const home = await readFile('src/components/SignedInHome.tsx', 'utf8');
  assert.match(home, /Tell SecurePay what you're trying to make happen\./);
  assert.ok(home.indexOf('View all agreements') < home.indexOf('{belowHome}'), 'the doorway sits below the person\'s own Home');
  assert.doesNotMatch(strip(home), /Trust Project/, 'SignedInHome itself carries no Trust Project copy');
  const ws = await readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8');
  assert.match(ws, /belowHome=\{onOpenCommunity && onOpenStore\s*\? <div className="mt-16"><TrustProjectSection compact membership=\{trustProjectMembership\}/);
  assert.match(ws, /else if \(view === 'community' && onOpenCommunity\) onOpenCommunity\(\);/);
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /onOpenCommunity=\{\(\) => navigateTo\('community'\)\}/);
  assert.match(agent, /if \(community\) return; \/\/ re-read on leaving Community/);
});

// ------------------------------------------------------------ invitation + scope
test('the invitation now says why to accept, and keeps its independence protections', async () => {
  const src = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(src, /Joining gives you access to shared fair-trade technologies, systems and people while you remain independent\./);
  assert.match(src, /Joining does not create any commercial obligation, and does not make you party to anyone else's Agreement\./);
});
test('the section owns no mutation, money or authority code', async () => {
  const src = strip(await readFile('src/components/TrustProjectSection.tsx', 'utf8'));
  assert.doesNotMatch(src, /gateway|fetch\(|http\.|accept\(|invite\(|payment|ledger|release/i);
});
