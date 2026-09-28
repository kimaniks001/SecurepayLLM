import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Phase 4C (API ADR-0023, UR-218) -- the Trust Project page adapts to who the person acts as. For a Business it reads
// and changes THE BUSINESS's membership, names it everywhere, and joins only on SecurePay's say-so, re-checked each time.
const bundle = await build({ stdin: { contents: `
export { createJoinController } from './src/features/join/controller';
export { JoinExperience } from './src/features/join/JoinExperience';
export * from './src/features/join/copy';
export { createBusinessController } from './src/features/business/controller';
export { BusinessExperience } from './src/features/business/BusinessExperience';
export { createCommunityGateway } from './src/api/securepay/community';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (component, props) => api.renderToStaticMarkup(api.createElement(component, props));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const strip = s => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const noop = () => {};

const V1 = 'principles-v1:' + 'a'.repeat(64);
const V2 = 'principles-v1:' + 'b'.repeat(64);
const principles = Array.from({ length: 12 }, (_, i) => ({ number: i + 1, title: `Principle ${i + 1}`, text: `Text ${i + 1}` }));
const member = (status, extra = {}) => ({ status, invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: null, respondedAt: null, ...extra });
const httpError = (status, code) => new api.ApiError('http', `status ${status}`, status, code ?? `E${status}`);
const OAK = { kind: 'business', businessKsNumber: 'KS000000501', displayName: 'Keyman Oak' };
const KAMAU = { kind: 'business', businessKsNumber: 'KS000000502', displayName: 'Kamau Hardware' };

function community({ me = member(null), business = {}, joinBusiness, version = V1 } = {}) {
  const calls = [];
  let current = version;
  const gateway = {
    currentPrinciples: async () => { calls.push(['principles']); return { version: current, label: 'v1', principles }; },
    membership: {
      me: async () => { calls.push(['me']); return me; },
      join: async (v, key) => { calls.push(['join', v, key]); return member('ACTIVE', { origin: 'DIRECT_JOIN', principlesVersion: v }); },
      business: async ks => {
        calls.push(['business', ks]);
        const entry = business[ks];
        if (!entry) throw httpError(404, 'BUSINESS_NOT_FOUND');
        if (entry instanceof Error) throw entry;
        return { businessKsNumber: ks, businessDisplayName: null, canManage: entry.canManage, membership: entry.membership };
      },
      joinBusiness: joinBusiness ?? (async (ks, v, key) => {
        calls.push(['joinBusiness', ks, v, key]);
        return { businessKsNumber: ks, canManage: true, membership: member('ACTIVE', { origin: 'DIRECT_JOIN', principlesVersion: v }) };
      }),
    },
  };
  return { gateway, calls, setVersion: v => { current = v; } };
}

async function ready(target, options) {
  const env = community(options);
  let n = 0;
  const controller = api.createJoinController(env.gateway, async () => ({ kind: 'none' }), () => `key-${++n}`, target);
  await controller.loadPrinciples();
  await controller.loadMembership();
  return { ...env, controller };
}

const page = (props) => html(api.JoinExperience, {
  communityGateway: props.gateway, auth: {}, session: {}, signedIn: true, interest: null,
  continueConversation: async () => ({ kind: 'none' }), onExploreCommunity: noop, onReturnToConversation: noop, onHelp: noop, onDone: noop,
  ...props,
});

// ------------------------------------------------------------------ 1. personal state unchanged
test('1. acting as yourself, the page says so and the Phase 4A personal Join is exactly as before', async () => {
  const { controller, calls } = await ready({ kind: 'self' });
  assert.deepEqual(calls.filter(c => c[0] !== 'principles').map(c => c[0]), ['me']);
  controller.setAccepted(true);
  await controller.join();
  assert.deepEqual(calls.at(-1), ['join', V1, 'key-1']);
  assert.equal(calls.some(c => c[0] === 'business' || c[0] === 'joinBusiness'), false);
  const markup = page({ gateway: community().gateway, selfName: 'James Kimani' });
  assert.match(text(markup), /You are joining as James Kimani/);
});

// ------------------------------------------------------------------ 2-5. the Business target
test('2/3. acting for a Business reads THE BUSINESS membership and, when SecurePay allows, offers its Join', async () => {
  const { controller, calls } = await ready(OAK, { business: { [OAK.businessKsNumber]: { canManage: true, membership: member(null) } } });
  assert.deepEqual(calls.filter(c => c[0] !== 'principles'), [['business', OAK.businessKsNumber]]);
  assert.equal(controller.getSnapshot().canManage, true);
  assert.equal(controller.getSnapshot().membership.value.status, null);
});

test('4. the page names the Business in the identity line, the acceptance and the button -- never ambiguous with yourself', async () => {
  const env = community({ business: { [OAK.businessKsNumber]: { canManage: true, membership: member(null) } } });
  const props = { gateway: env.gateway, actingFor: { businessKsNumber: OAK.businessKsNumber, displayName: 'Keyman Oak' }, onSwitchToSelf: noop };
  // SSR renders the initial state; drive a real controller to the ready state through the same component contract.
  const markup = page(props);
  const t = text(markup);
  assert.match(t, /You are acting for Keyman Oak/);
  assert.match(t, /Business KS Number KS000000501/);
  assert.match(t, /Switch back to yourself/);
  assert.doesNotMatch(t, /You are joining as/);
  assert.match(markup, /data-join-identity="business"/);
  assert.equal(api.businessAcceptanceLabel('Keyman Oak'), 'I choose, for Keyman Oak, to join The Trust Project under these 12 Principles.');
  assert.equal(api.businessJoinButton('Keyman Oak'), 'Join for Keyman Oak');
  const src = await readFile('src/features/join/JoinExperience.tsx', 'utf8');
  assert.match(src, /aria-describedby=\{business \? `\$\{identityId\} \$\{identityId\}-ks` : identityId\}/, 'the Join button is described by who is joining (and the Business KS), never by other controls');
  assert.match(src, /\{businessName\} has not joined The Trust Project yet\./);
  assert.match(src, /You can join for this Business because you are authorized to act for it\./);
});

test('5. a successful Business Join changes only the Business membership, with the exact version and a stable key', async () => {
  const { controller, calls } = await ready(OAK, { business: { [OAK.businessKsNumber]: { canManage: true, membership: member(null) } } });
  controller.setAccepted(true);
  await controller.join();
  assert.deepEqual(calls.at(-1), ['joinBusiness', OAK.businessKsNumber, V1, 'key-1']);
  assert.equal(calls.some(c => c[0] === 'join' || c[0] === 'me'), false, 'never the personal membership');
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'joined');
  assert.equal(state.membership.value.status, 'ACTIVE');
  assert.deepEqual(state.continuation, { kind: 'none' }, 'conversation continuity belongs to the person, not the Business');
});

test('nothing joins without the explicit acceptance, even for a Business', async () => {
  const { controller, calls } = await ready(OAK, { business: { [OAK.businessKsNumber]: { canManage: true, membership: member(null) } } });
  await controller.join();
  assert.equal(calls.some(c => c[0] === 'joinBusiness'), false);
});

// ------------------------------------------------------------------ 6-7. independence
test('6/7. yourself and each Business are separate targets that read separate memberships', async () => {
  const opts = { me: member('ACTIVE'), business: {
    [OAK.businessKsNumber]: { canManage: true, membership: member(null) },
    [KAMAU.businessKsNumber]: { canManage: true, membership: member('ACTIVE') } } };
  const self = await ready({ kind: 'self' }, opts);
  const oak = await ready(OAK, opts);
  const kamau = await ready(KAMAU, opts);
  assert.equal(self.controller.getSnapshot().membership.value.status, 'ACTIVE');
  assert.equal(oak.controller.getSnapshot().membership.value.status, null);
  assert.equal(kamau.controller.getSnapshot().membership.value.status, 'ACTIVE');
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /key=\{signedIn \? `signed-in:\$\{actingForBusiness\?\.businessKsNumber \?\? 'self'\}` : 'signed-out'\}/,
    'a capacity change remounts the page, so one target never leaks into another');
});

// ------------------------------------------------------------------ 8. stale Principles
test('8. a stale version on the Business path re-reads the Principles, unticks, and never joins silently', async () => {
  const env = await ready(OAK, { business: { [OAK.businessKsNumber]: { canManage: true, membership: member(null) } },
    joinBusiness: async () => { throw httpError(409, 'TRUST_PROJECT_PRINCIPLES_VERSION_STALE'); } });
  env.setVersion(V2);
  env.controller.setAccepted(true);
  await env.controller.join();
  const state = env.controller.getSnapshot();
  assert.equal(state.staleNotice, true);
  assert.equal(state.accepted, false);
  assert.equal(state.principles.version, V2);
  assert.equal(state.phase, 'idle');
});

// ------------------------------------------------------------------ 9-10. authority
test('9. authority lost on read or on Join: nothing joins, the page says so, and the person can continue as themself', async () => {
  const gone = await ready(OAK, { business: {} });
  assert.equal(gone.controller.getSnapshot().authorityLost, true);
  gone.controller.setAccepted(true);
  await gone.controller.join();
  assert.equal(gone.calls.some(c => c[0] === 'joinBusiness'), false);

  const revokedMidway = await ready(OAK, { business: { [OAK.businessKsNumber]: { canManage: true, membership: member(null) } },
    joinBusiness: async () => { throw httpError(404, 'BUSINESS_NOT_FOUND'); } });
  revokedMidway.controller.setAccepted(true);
  await revokedMidway.controller.join();
  const s = revokedMidway.controller.getSnapshot();
  assert.equal(s.authorityLost, true);
  assert.equal(s.phase, 'idle');
  assert.equal(s.membership.value?.status ?? null, null);
  assert.equal(api.NO_LONGER_AUTHORISED, 'You no longer have authority to manage this Business.');
  const src = await readFile('src/features/join/JoinExperience.tsx', 'utf8');
  assert.match(src, /state\.authorityLost && \([\s\S]{0,200}role="alert"[\s\S]{0,200}\{NO_LONGER_AUTHORISED\}[\s\S]{0,300}Continue as yourself/);
});

test('10. representing without the membership authority, or tampering with the call, never produces a Join', async () => {
  const { controller, calls } = await ready(OAK, { business: { [OAK.businessKsNumber]: { canManage: false, membership: member(null) } } });
  controller.setAccepted(true);
  await controller.join();
  assert.equal(calls.some(c => c[0] === 'joinBusiness'), false, 'the client never overrides canManage');
  const src = strip(await readFile('src/features/join/JoinExperience.tsx', 'utf8'));
  assert.match(src, /but you can’t make its Trust Project decision\./);
  // The gateway sends only the Business KS in the path, the version and the key -- never a target identity.
  const requests = [];
  const gw = api.createCommunityGateway({ request: async (path, options) => { requests.push([path, options]); return {}; } });
  await gw.membership.joinBusiness('KS000000501', V1, 'k');
  await gw.membership.business('KS000000501');
  assert.deepEqual(requests[0], ['/api/v1/community/membership/business/KS000000501/join',
    { method: 'POST', body: { principlesVersion: V1 }, auth: 'required', headers: { 'Idempotency-Key': 'k' } }]);
  assert.deepEqual(requests[1], ['/api/v1/community/membership/business/KS000000501', { auth: 'required' }]);
});

// ------------------------------------------------------------------ 11-12. firewalls + reconstruction
test('11. there is no Organization Join or Organization capacity anywhere in the Join or Business UI', async () => {
  for (const file of ['src/features/join/JoinExperience.tsx', 'src/features/join/controller.ts', 'src/features/join/copy.ts',
    'src/features/business/BusinessExperience.tsx', 'src/features/business/controller.ts', 'src/api/securepay/community/index.ts']) {
    const src = strip(await readFile(file, 'utf8'));
    // The Business's RBAC Organization is backend plumbing (organizationId); what must never exist is an
    // Organization KS, an ORGANIZATION identity type, or any Join for an Organization.
    assert.doesNotMatch(src, /Organization KS|identityType: 'ORGANIZATION'|'ORGANIZATION'|join for (an |this |the )?organization|organization join/i, file);
  }
});

test('12. the Business target comes only from the capacity SecurePay confirmed, never from storage or the URL', async () => {
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /const actingForBusiness = businessState\.acting\.kind === 'business'/);
  for (const file of ['src/features/join/controller.ts', 'src/features/join/JoinExperience.tsx']) {
    assert.doesNotMatch(strip(await readFile(file, 'utf8')), /localStorage|sessionStorage|URLSearchParams|location\.(hash|href|search)/, file);
  }
  const route = await readFile('src/features/join/route.ts', 'utf8');
  assert.doesNotMatch(route, /business|ksNumber/i, 'the Join URL never names a Business');
});

// ------------------------------------------------------------------ Business area
function businessSetup({ trust } = {}) {
  const repr = { businessKsNumber: OAK.businessKsNumber, displayName: 'Keyman Oak', identityType: 'BUSINESS', relationship: 'ADMINISTRATOR', canActFor: true, since: '2026-09-28T09:00:00Z' };
  const gateway = {
    business: {
      mine: async () => [repr], representation: async () => repr,
      get: async ks => ({ organizationId: 'org', businessKsNumber: ks, activatedAt: '2026-09-28T09:00:00Z' }),
      members: async () => [], inviteMember: async () => {}, removeMember: async () => {}, create: async () => repr,
    },
    circle: { me: async () => ({ canonicalKsNumber: 'KS000000100', displayName: 'James Kimani' }) },
    trustProject: { business: async () => trust },
  };
  return api.createBusinessController(gateway);
}

test('the Business area shows the Business’s own membership and one doorway to review and join -- never a Join itself', async () => {
  const unjoined = businessSetup({ trust: { businessKsNumber: OAK.businessKsNumber, canManage: true, membership: member(null) } });
  await unjoined.enter();
  await unjoined.actAsBusiness(OAK.businessKsNumber);
  await new Promise(r => setTimeout(r, 0));
  let t = text(html(api.BusinessExperience, { controller: unjoined, onNavigate: noop, onOpenJoin: noop }));
  assert.match(t, /Keyman Oak has not joined The Trust Project yet\./);
  assert.match(t, /Review the 12 Principles and join for Keyman Oak/);

  const joined = businessSetup({ trust: { businessKsNumber: OAK.businessKsNumber, canManage: true, membership: member('ACTIVE') } });
  await joined.enter();
  await joined.actAsBusiness(OAK.businessKsNumber);
  await new Promise(r => setTimeout(r, 0));
  t = text(html(api.BusinessExperience, { controller: joined, onNavigate: noop, onOpenJoin: noop }));
  assert.match(t, /Keyman Oak is a Member of The Trust Project\./);
  assert.doesNotMatch(t, /Review the 12 Principles and join/);

  const cannot = businessSetup({ trust: { businessKsNumber: OAK.businessKsNumber, canManage: false, membership: member(null) } });
  await cannot.enter();
  await cannot.actAsBusiness(OAK.businessKsNumber);
  await new Promise(r => setTimeout(r, 0));
  t = text(html(api.BusinessExperience, { controller: cannot, onNavigate: noop, onOpenJoin: noop }));
  assert.match(t, /You can act for Keyman Oak, but you can’t make its Trust Project decision\./);
  assert.doesNotMatch(t, /Review the 12 Principles and join/);

  unjoined.actAsSelf();
  assert.equal(unjoined.getSnapshot().trustProject.status, 'idle', 'switching to yourself forgets the Business membership');
});

test('the acceptance label is a 44px target on both paths (live verification at 1440–320)', async () => {
  const source = strip(await readFile('src/features/join/JoinExperience.tsx', 'utf8'));
  const label = source.match(/<label htmlFor=\{acceptId\} className="([^"]*)"/);
  assert.ok(label, 'one acceptance label, shared by the personal and the Business Join');
  assert.match(label[1], /\bmin-h-\[44px\]/);
});
