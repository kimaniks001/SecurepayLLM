import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Phase 4D (API ADR-0024, UR-220) -- Organization KS onboarding, "acting for" an Organization, and its own Trust Project
// Join, against the REAL controllers, gateways and components. An Organization is its own identity: never a Business,
// never a login, never nominated by the client. SecurePay decides every capacity and every Join.
const bundle = await build({ stdin: { contents: `
export { createBusinessController, organizationCreateErrorText, ORGANIZATION_NOT_CONFIRMED } from './src/features/business/controller';
export { BusinessExperience } from './src/features/business/BusinessExperience';
export { createJoinController } from './src/features/join/controller';
export { JoinExperience } from './src/features/join/JoinExperience';
export { createOrganizationGateway } from './src/api/securepay/organization';
export { createCommunityGateway } from './src/api/securepay/community';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (component, props) => api.renderToStaticMarkup(api.createElement(component, props));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const strip = s => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const noop = () => {};

const V1 = 'principles-v1:' + 'a'.repeat(64);
const V2 = 'principles-v1:' + 'b'.repeat(64);
const principles = Array.from({ length: 12 }, (_, i) => ({ number: i + 1, title: `Principle ${i + 1}`, text: `Text ${i + 1}` }));
const member = (status, extra = {}) => ({ status, invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: null, respondedAt: null, ...extra });
const httpError = (status, kind = 'http', code) => new api.ApiError(kind, `status ${status}`, status, code ?? `E${status}`);

const OAK = { businessKsNumber: 'KS000000501', displayName: 'Keyman Oak', identityType: 'BUSINESS', relationship: 'ADMINISTRATOR', canActFor: true, since: '2026-09-28T09:00:00Z' };
const VARSITY = { organizationKsNumber: 'KS000000045', displayName: 'Varsityville Residents Association', identityType: 'ORGANIZATION', relationship: 'ADMINISTRATOR', canActFor: true, since: '2026-09-28T09:00:00Z' };
const UMOJA = { ...VARSITY, organizationKsNumber: 'KS000000046', displayName: 'Umoja Welfare Group' };

function setup({ businesses = [], organizations = [], representation, create, trust = {} } = {}) {
  const calls = [];
  let listed = organizations;
  const gateway = {
    business: {
      mine: async () => { calls.push(['business.mine']); return businesses; },
      representation: async ks => { calls.push(['business.representation', ks]); const hit = businesses.find(b => b.businessKsNumber === ks); if (!hit) throw httpError(404); return hit; },
      create: async () => { throw new Error('no business creation in these tests'); },
      get: async ks => ({ organizationId: `rbac-${ks}`, businessKsNumber: ks, activatedAt: '2026-09-28T09:00:00Z' }),
      members: async () => [],
      inviteMember: async () => {},
      removeMember: async () => {},
    },
    organization: {
      mine: async () => { calls.push(['organization.mine']); return listed; },
      representation: representation ?? (async ks => { calls.push(['organization.representation', ks]); const hit = listed.find(o => o.organizationKsNumber === ks); if (!hit) throw httpError(404); return hit; }),
      create: create ?? (async (name, key) => { calls.push(['organization.create', name, key]); const made = { ...VARSITY, organizationKsNumber: 'KS000000777', displayName: name }; listed = [...listed, made]; return made; }),
    },
    trustProject: {
      business: async ks => { calls.push(['trust.business', ks]); return { businessKsNumber: ks, canManage: true, membership: member(null) }; },
      organization: async ks => {
        calls.push(['trust.organization', ks]);
        const entry = trust[ks];
        if (entry instanceof Error) throw entry;
        return { organizationKsNumber: ks, canManage: entry?.canManage ?? true, membership: entry?.membership ?? member(null) };
      },
    },
    circle: { me: async () => ({ canonicalKsNumber: 'KS000000100', displayName: 'James Kimani' }) },
  };
  let n = 0;
  const controller = api.createBusinessController(gateway, () => `bkey-${++n}`, () => `okey-${++n}`);
  return { controller, calls, setListed: next => { listed = next; } };
}

function community({ me = member(null), organization = {}, joinOrganization, version = V1 } = {}) {
  const calls = [];
  let current = version;
  const gateway = {
    currentPrinciples: async () => { calls.push(['principles']); return { version: current, label: 'v1', principles }; },
    membership: {
      me: async () => { calls.push(['me']); return me; },
      join: async (v, key) => { calls.push(['join', v, key]); return member('ACTIVE', { origin: 'DIRECT_JOIN', principlesVersion: v }); },
      business: async ks => { calls.push(['business', ks]); throw httpError(404, 'http', 'BUSINESS_NOT_FOUND'); },
      joinBusiness: async ks => { calls.push(['joinBusiness', ks]); throw httpError(404, 'http', 'BUSINESS_NOT_FOUND'); },
      organization: async ks => {
        calls.push(['organization', ks]);
        const entry = organization[ks];
        if (!entry) throw httpError(404, 'http', 'ORGANIZATION_NOT_FOUND');
        if (entry instanceof Error) throw entry;
        return { organizationKsNumber: ks, canManage: entry.canManage, membership: entry.membership };
      },
      joinOrganization: joinOrganization ?? (async (ks, v, key) => {
        calls.push(['joinOrganization', ks, v, key]);
        if (v !== current) throw httpError(409, 'http', 'TRUST_PROJECT_PRINCIPLES_VERSION_STALE');
        return { organizationKsNumber: ks, canManage: true, membership: member('ACTIVE', { origin: 'DIRECT_JOIN', principlesVersion: v }) };
      }),
    },
  };
  return { gateway, calls, setVersion: v => { current = v; } };
}

const ORG_TARGET = { kind: 'organization', organizationKsNumber: VARSITY.organizationKsNumber, displayName: VARSITY.displayName };

async function ready(target, options) {
  const env = community(options);
  let n = 0;
  const controller = api.createJoinController(env.gateway, async () => ({ kind: 'none' }), () => `key-${++n}`, target);
  await controller.loadPrinciples();
  await controller.loadMembership();
  return { ...env, controller };
}

const joinPage = props => html(api.JoinExperience, {
  communityGateway: props.gateway, auth: {}, session: {}, signedIn: true, interest: null,
  continueConversation: async () => ({ kind: 'none' }), onExploreCommunity: noop, onReturnToConversation: noop, onHelp: noop, onDone: noop,
  ...props,
});

// ------------------------------------------------------------------ 1. doorway
test('1. a person with nothing to represent sees one Create an Organization doorway, separate from Business', async () => {
  const { controller } = setup();
  await controller.enter();
  const page = text(html(api.BusinessExperience, { controller, onNavigate: noop }));
  assert.equal((page.match(/Create Organization/g) ?? []).length, 1, 'exactly one create action');
  assert.match(page, /Create an Organization/);
  assert.match(page, /isn’t a business — like a residents association, church, school, welfare group or chama/);
  assert.match(page, /doesn’t register or verify it, open a bank account or enable payments/);
  assert.match(page, /Acting as yourself — James Kimani/);
});

// ------------------------------------------------------------------ 2/3. real creation, list from backend
test('2/3. creation goes through the real call with a stable key, and the Organization appears from the backend list', async () => {
  const { controller, calls } = setup();
  await controller.enter();
  controller.setOrganizationCreateName('  Varsityville   Residents Association ');
  await controller.createOrganization();
  const create = calls.find(c => c[0] === 'organization.create');
  assert.equal(create[1], 'Varsityville Residents Association');
  assert.match(create[2], /^okey-/);
  assert.deepEqual(calls.slice(calls.indexOf(create) + 1).map(c => c[0]), ['organization.mine'], 'the list is re-read from the backend');
  const state = controller.getSnapshot();
  assert.equal(state.organizations.data.length, 1);
  assert.equal(state.acting.kind, 'self', 'creating never switches capacity by itself');
  const page = text(html(api.BusinessExperience, { controller, onNavigate: noop }));
  assert.match(page, /Varsityville Residents Association now has its own KS Number — Organization KS Number KS000000777 ?\. You can act for this Organization\./);
});

test('an uncertain creation keeps its key so a retry can never create a second Organization; a new name gets a new key', async () => {
  let attempts = 0;
  const keys = [];
  const { controller } = setup({ create: async (name, key) => { keys.push(key); attempts += 1; if (attempts === 1) throw httpError(0, 'network'); return { ...VARSITY, displayName: name }; } });
  await controller.enter();
  controller.setOrganizationCreateName('Varsityville Residents Association');
  await controller.createOrganization();
  assert.match(controller.getSnapshot().organizationCreate.error, /never creates a second Organization/);
  await controller.createOrganization();
  assert.equal(keys[0], keys[1]);
  controller.setOrganizationCreateName('Another Association');
  await controller.createOrganization();
  assert.notEqual(keys[2], keys[1]);
  assert.match(api.organizationCreateErrorText(httpError(409)), /already used for a different name/);
  assert.match(api.organizationCreateErrorText(httpError(403)), /Only a personal KS Number can create an Organization/);
});

// ------------------------------------------------------------------ 4. distinct identities
test('4. self, Business and Organization are visibly and accessibly distinct in one choice', async () => {
  const { controller } = setup({ businesses: [OAK], organizations: [VARSITY] });
  await controller.enter();
  const markup = html(api.BusinessExperience, { controller, onNavigate: noop });
  const radios = markup.match(/<label[^>]*>[\s\S]*?<\/label>/g).filter(l => /type="radio"/.test(l)).map(text);
  assert.equal(radios.length, 3);
  assert.match(radios[0], /James Kimani Yourself · KS000000100/);
  assert.match(radios[1], /Keyman Oak Business · KS000000501/);
  assert.match(radios[2], /Varsityville Residents Association Organization · KS000000045/);
  assert.match(markup, /<fieldset[\s\S]*<legend[^>]*>You are acting as<\/legend>/);
});

// ------------------------------------------------------------------ 5. confirmation before switching
test('5. switching to an Organization happens only after SecurePay confirms it now', async () => {
  const { controller, calls } = setup({ organizations: [VARSITY], trust: { [VARSITY.organizationKsNumber]: { canManage: true, membership: member(null) } } });
  await controller.enter();
  await controller.actAsOrganization(VARSITY.organizationKsNumber);
  assert.deepEqual(calls.filter(c => c[0].startsWith('organization.representation') || c[0] === 'trust.organization'),
    [['organization.representation', VARSITY.organizationKsNumber], ['trust.organization', VARSITY.organizationKsNumber]]);
  assert.equal(controller.getSnapshot().acting.kind, 'organization');
  const markup = html(api.BusinessExperience, { controller, onNavigate: noop, onOpenJoin: noop });
  const page = text(markup);
  assert.match(page, /You are acting for Varsityville Residents Association, Organization KS Number KS000000045/);
  assert.match(page, /Organization KS Number · KS000000045/);
  assert.match(page, /You can act for this Organization\. You’re its administrator\./);
  assert.match(markup, /role="status" aria-live="polite"[^>]*>You are acting for Varsityville Residents Association, Organization KS Number KS000000045</);
  // No Business member management is offered for an Organization.
  assert.doesNotMatch(page, /Invite a member|Role management|Business KS Number/);
  assert.equal(calls.some(c => c[0].startsWith('business.representation')), false);
});

test('a refused or unlisted Organization confirmation leaves the person acting as themself', async () => {
  const { controller } = setup({ organizations: [VARSITY], representation: async () => { throw httpError(404); } });
  await controller.enter();
  await controller.actAsOrganization(VARSITY.organizationKsNumber);
  assert.equal(controller.getSnapshot().acting.kind, 'self');
  assert.equal(controller.getSnapshot().switchError, api.ORGANIZATION_NOT_CONFIRMED);
  // A Business KS or anything typed is never a selectable Organization.
  await controller.actAsOrganization(OAK.businessKsNumber);
  assert.equal(controller.getSnapshot().acting.kind, 'self');
  // A mismatched answer is not a confirmation.
  const mismatched = setup({ organizations: [VARSITY], representation: async () => ({ ...VARSITY, identityType: 'BUSINESS' }) });
  await mismatched.controller.enter();
  await mismatched.controller.actAsOrganization(VARSITY.organizationKsNumber);
  assert.equal(mismatched.controller.getSnapshot().acting.kind, 'self');
});

// ------------------------------------------------------------------ 6/7. refresh + sign-out
test('6/7. a capacity the backend stops listing is dropped on refresh, and sign-out forgets everything', async () => {
  const env = setup({ organizations: [VARSITY] });
  await env.controller.enter();
  await env.controller.actAsOrganization(VARSITY.organizationKsNumber);
  assert.equal(env.controller.getSnapshot().acting.kind, 'organization');
  env.setListed([]);
  await env.controller.loadMine();
  assert.equal(env.controller.getSnapshot().acting.kind, 'self');
  await env.controller.enter();
  env.controller.reset();
  const state = env.controller.getSnapshot();
  assert.equal(state.acting.kind, 'self');
  assert.equal(state.organizations.status, 'idle');
  assert.equal(state.organizationCreate.name, '');
});

// ------------------------------------------------------------------ 8. no arbitrary Organization KS
test('8. an Organization can only be chosen from the backend list: no typed KS, storage or URL nomination', async () => {
  for (const file of ['src/features/business/controller.ts', 'src/features/business/BusinessExperience.tsx', 'src/api/securepay/organization/index.ts', 'src/features/join/JoinExperience.tsx']) {
    const src = strip(await readFile(file, 'utf8'));
    assert.doesNotMatch(src, /localStorage|sessionStorage|location\.(hash|search)|URLSearchParams/, file);
  }
  const experience = strip(await readFile('src/features/business/BusinessExperience.tsx', 'utf8'));
  assert.doesNotMatch(experience, /Organization KS Number"|placeholder="KS|Their Organization/);
});

// ------------------------------------------------------------------ 9/10. its own Trust Project state and Join
test('9. acting for an Organization reads THE ORGANIZATION’s membership through its own call', async () => {
  const { controller, calls } = await ready(ORG_TARGET, { organization: { [VARSITY.organizationKsNumber]: { canManage: true, membership: member(null) } } });
  assert.deepEqual(calls.filter(c => c[0] !== 'principles'), [['organization', VARSITY.organizationKsNumber]]);
  assert.equal(controller.getSnapshot().canManage, true);
  controller.setAccepted(true);
  await controller.join();
  assert.deepEqual(calls.at(-1), ['joinOrganization', VARSITY.organizationKsNumber, V1, 'key-1']);
  assert.equal(controller.getSnapshot().phase, 'joined');
  assert.equal(calls.some(c => ['me', 'join', 'business', 'joinBusiness'].includes(c[0])), false, 'never the person’s or a Business’s membership');
  assert.equal(controller.getSnapshot().continuation.kind, 'none', 'conversation continuity stays personal');
});

test('10. the Join names the Organization in the identity line, the acceptance and the button', async () => {
  const env = community({ organization: { [VARSITY.organizationKsNumber]: { canManage: true, membership: member(null) } } });
  const markup = joinPage({ gateway: env.gateway, actingForOrganization: { organizationKsNumber: VARSITY.organizationKsNumber, displayName: VARSITY.displayName }, onSwitchToSelf: noop });
  const t = text(markup);
  assert.match(t, /You are acting for Varsityville Residents Association/);
  assert.match(t, /Organization KS Number KS000000045/);
  assert.doesNotMatch(t, /Business KS Number|You are joining as/);
  assert.match(markup, /data-join-identity="organization"/);
  const src = await readFile('src/features/join/JoinExperience.tsx', 'utf8');
  assert.match(src, /target\.kind === 'organization'\n\s*\? \{ ksNumber: target\.organizationKsNumber, displayName: target\.displayName, kindLabel: 'Organization' as const \}/);
  assert.match(src, /You can join for this \{business\.kindLabel\} because you are authorized to act for it\./);
  assert.match(src, /aria-describedby=\{business \? `\$\{identityId\} \$\{identityId\}-ks` : identityId\}/);
});

test('the Business area shows the Organization’s own membership and one doorway -- never a Join itself', async () => {
  const joined = setup({ organizations: [VARSITY], trust: { [VARSITY.organizationKsNumber]: { canManage: true, membership: member('ACTIVE') } } });
  await joined.controller.enter();
  await joined.controller.actAsOrganization(VARSITY.organizationKsNumber);
  let markup = html(api.BusinessExperience, { controller: joined.controller, onNavigate: noop, onOpenJoin: noop });
  assert.match(text(markup), /Varsityville Residents Association is a Member of The Trust Project\./);
  assert.match(markup, /data-organization-trust-project="ACTIVE"/);

  const unjoined = setup({ organizations: [VARSITY], trust: { [VARSITY.organizationKsNumber]: { canManage: true, membership: member(null) } } });
  await unjoined.controller.enter();
  await unjoined.controller.actAsOrganization(VARSITY.organizationKsNumber);
  markup = html(api.BusinessExperience, { controller: unjoined.controller, onNavigate: noop, onOpenJoin: noop });
  assert.match(text(markup), /Varsityville Residents Association has not joined The Trust Project yet\./);
  assert.match(text(markup), /Review the 12 Principles and join for Varsityville Residents Association/);
  for (const control of markup.match(/<(button|a)\b[^>]*>[\s\S]*?<\/\1>/g) ?? []) assert.doesNotMatch(text(control), /^\s*join\b/i, control);
});

// ------------------------------------------------------------------ 11. Business and personal unchanged
test('11. two Organizations, a Business and yourself each keep their own separate membership', async () => {
  const opts = { me: member('ACTIVE'), organization: {
    [VARSITY.organizationKsNumber]: { canManage: true, membership: member(null) },
    [UMOJA.organizationKsNumber]: { canManage: true, membership: member('ACTIVE') } } };
  const self = await ready({ kind: 'self' }, opts);
  const varsity = await ready(ORG_TARGET, opts);
  const umoja = await ready({ kind: 'organization', organizationKsNumber: UMOJA.organizationKsNumber, displayName: UMOJA.displayName }, opts);
  assert.equal(self.controller.getSnapshot().membership.value.status, 'ACTIVE');
  assert.equal(varsity.controller.getSnapshot().membership.value.status, null);
  assert.equal(umoja.controller.getSnapshot().membership.value.status, 'ACTIVE');
  assert.deepEqual(self.calls.filter(c => c[0] !== 'principles').map(c => c[0]), ['me']);
  // The personal Join still never carries a target.
  const controller = strip(await readFile('src/features/join/controller.ts', 'utf8'));
  assert.match(controller, /: await community\.membership\.join\(version, attemptKey\);/);
});

test('a stale Principles version on the Organization path re-reads, unticks and never joins silently', async () => {
  const { controller, calls, setVersion } = await ready(ORG_TARGET, { organization: { [VARSITY.organizationKsNumber]: { canManage: true, membership: member(null) } } });
  setVersion(V2);
  controller.setAccepted(true);
  await controller.join();
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'idle');
  assert.equal(state.accepted, false);
  assert.equal(state.staleNotice, true);
  assert.equal(calls.filter(c => c[0] === 'joinOrganization').length, 1);
});

// ------------------------------------------------------------------ 12. revocation
test('12. authority lost on read or on Join: nothing joins, the page says so, the person continues as themself', async () => {
  const lostOnRead = await ready(ORG_TARGET, { organization: {} });
  assert.equal(lostOnRead.controller.getSnapshot().authorityLost, true);
  lostOnRead.controller.setAccepted(true);
  await lostOnRead.controller.join();
  assert.equal(lostOnRead.calls.some(c => c[0] === 'joinOrganization'), false);

  const lostOnJoin = await ready(ORG_TARGET, {
    organization: { [VARSITY.organizationKsNumber]: { canManage: true, membership: member(null) } },
    joinOrganization: async () => { throw httpError(404, 'http', 'ORGANIZATION_NOT_FOUND'); },
  });
  lostOnJoin.controller.setAccepted(true);
  await lostOnJoin.controller.join();
  const state = lostOnJoin.controller.getSnapshot();
  assert.equal(state.authorityLost, true);
  assert.equal(state.phase, 'idle');

  const cannot = await ready(ORG_TARGET, { organization: { [VARSITY.organizationKsNumber]: { canManage: false, membership: member(null) } } });
  cannot.controller.setAccepted(true);
  await cannot.controller.join();
  assert.equal(cannot.calls.some(c => c[0] === 'joinOrganization'), false, 'representation without the membership authority never joins');
});

// ------------------------------------------------------------------ 13/14. no Organization login, no money
test('13/14. there is no Organization login and nothing implies registration, verification or money', async () => {
  for (const file of ['src/features/business/BusinessExperience.tsx', 'src/features/business/controller.ts', 'src/api/securepay/organization/index.ts']) {
    const src = strip(await readFile(file, 'utf8'));
    assert.doesNotMatch(src, /\bsignIn\b|\bpassword\b|\botp\b|\bcredential|\blog in as\b|\bsign in as\b/i, file);
    assert.doesNotMatch(src, /\bwallet|virtual account|M-PESA|\bpayout|\bwithdraw|\bcollections?\b|Payment Ready|\bledger/i, file);
  }
  const { controller } = setup({ organizations: [VARSITY] });
  await controller.enter();
  await controller.actAsOrganization(VARSITY.organizationKsNumber);
  const page = text(html(api.BusinessExperience, { controller, onNavigate: noop }));
  assert.match(page, /An Organization on SecurePay isn’t legally verified or registered, and it can’t move money\./);
  assert.doesNotMatch(page, /\bverified Organization|registered with|bank account is ready/i);
});

test('the Organization gateway calls exactly the approved endpoints and never exposes an RBAC id', async () => {
  const calls = [];
  const http = { request: async (path, options = {}) => { calls.push([path, options.method ?? 'GET', options.headers?.['Idempotency-Key'] ?? null]); return {}; } };
  const organization = api.createOrganizationGateway(http);
  await organization.create('Varsityville Residents Association', 'k-1');
  await organization.mine();
  await organization.representation('KS000000045');
  const community = api.createCommunityGateway(http);
  await community.membership.organization('KS000000045');
  await community.membership.joinOrganization('KS000000045', V1, 'j-1');
  assert.deepEqual(calls, [
    ['/api/v1/organization', 'POST', 'k-1'],
    ['/api/v1/organization/mine', 'GET', null],
    ['/api/v1/organization/KS000000045/representation', 'GET', null],
    ['/api/v1/community/membership/organization/KS000000045', 'GET', null],
    ['/api/v1/community/membership/organization/KS000000045/join', 'POST', 'j-1'],
  ]);
  const dto = strip(await readFile('src/api/securepay/organization/index.ts', 'utf8'));
  assert.doesNotMatch(dto, /organizationId|rbac|role|permission/i);
});

test('the acting-as group stays focusable while SecurePay confirms a switch (busy, never disabled)', async () => {
  let release;
  const { controller } = setup({ organizations: [VARSITY], representation: () => new Promise(r => { release = () => r(VARSITY); }) });
  await controller.enter();
  const pending = controller.actAsOrganization(VARSITY.organizationKsNumber);
  const markup = html(api.BusinessExperience, { controller, onNavigate: noop });
  assert.match(markup, /<fieldset[^>]*aria-busy="true"/);
  assert.doesNotMatch(markup, /<fieldset[^>]*disabled/);
  assert.match(text(markup), /Checking with SecurePay…/);
  // A second switch while busy is ignored by the controller, never queued.
  await controller.actAsOrganization(VARSITY.organizationKsNumber);
  release();
  await pending;
  assert.equal(controller.getSnapshot().acting.kind, 'organization');
});

test('authority lost for an Organization is announced as an Organization, never as a Business', async () => {
  const env = community({ organization: {} });
  const bundleSrc = await readFile('src/features/join/copy.ts', 'utf8');
  assert.match(bundleSrc, /NO_LONGER_AUTHORISED_ORGANIZATION = 'You no longer have authority to manage this Organization\.'/);
  const lost = await ready(ORG_TARGET, { organization: {} });
  assert.equal(lost.controller.getSnapshot().authorityLost, true);
  const src = await readFile('src/features/join/JoinExperience.tsx', 'utf8');
  assert.match(src, /business\?\.kindLabel === 'Organization' \? NO_LONGER_AUTHORISED_ORGANIZATION : NO_LONGER_AUTHORISED/);
  assert.ok(env);
});
