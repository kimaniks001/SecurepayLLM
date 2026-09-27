import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Public Experience Convergence Phase 4 -- Join, identity-only signup and human invitations (ADR-0021).
const bundle = await build({ stdin: { contents: `
export { createJoinController, membershipKind } from './src/features/join/controller';
export { toMembershipUiState } from './src/features/community/controller';
export { JoinExperience } from './src/features/join/JoinExperience';
export { SignUpExperience } from './src/features/join/SignUpExperience';
export { ShareInvitation } from './src/features/join/ShareInvitation';
export * from './src/features/join/share';
export * from './src/features/join/copy';
export { parseJoinRoute, isSignUpHash } from './src/features/join/route';
export { createSignupController, signupErrorText } from './src/features/signup/controller';
export { signupView } from './src/features/signup/view';
export { SignInExperience } from './src/features/public/SignInExperience';
export { PublicNav } from './src/features/public/PublicNav';
export { PublicHome } from './src/features/public/PublicHome';
export { TrustProjectSection } from './src/components/TrustProjectSection';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (component, props) => api.renderToStaticMarkup(api.createElement(component, props));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const noop = () => {};
const V1 = 'principles-v1:' + 'a'.repeat(64);
const principles = Array.from({ length: 12 }, (_, i) => ({ number: i + 1, title: `Principle ${i + 1}`, text: `Text ${i + 1}` }));
const member = (status, extra = {}) => ({ status, invitedByCanonicalKsNumber: null, invitedByDisplayName: null, invitedAt: null, respondedAt: null, ...extra });

function joinSetup({ me = member(null), join, current } = {}) {
  const calls = [];
  const gateway = {
    currentPrinciples: current ?? (async () => ({ version: V1, label: 'v1', principles })),
    membership: {
      me: async () => me,
      join: join ?? (async (version, key) => { calls.push(['join', version, key]); return member('ACTIVE', { origin: 'DIRECT_JOIN', principlesVersion: version, joinedAt: '2026-09-27T09:00:00Z' }); }),
    },
  };
  return { gateway, calls };
}

// ------------------------------------------------------------------ Join controller
test('Join never happens without the explicit acceptance control, and sends the exact displayed version', async () => {
  const { gateway, calls } = joinSetup();
  const c = api.createJoinController(gateway, async () => ({ kind: 'none' }), () => 'key-1');
  await c.loadPrinciples();
  await c.loadMembership();
  await c.join();
  assert.equal(calls.length, 0, 'opening the page, signing in or loading is never acceptance');
  c.setAccepted(true);
  await c.join();
  assert.deepEqual(calls, [['join', V1, 'key-1']]);
  assert.equal(c.getSnapshot().phase, 'joined');
});

test('a stale Principles version re-fetches, clears acceptance and asks again; nothing is joined silently', async () => {
  let version = V1;
  const { gateway } = joinSetup({
    current: async () => ({ version, label: 'v1', principles }),
    join: async () => { throw new api.ApiError('http', 'changed', 409, 'TRUST_PROJECT_PRINCIPLES_VERSION_STALE'); },
  });
  const c = api.createJoinController(gateway);
  await c.loadPrinciples(); await c.loadMembership();
  c.setAccepted(true);
  version = 'principles-v2:' + 'b'.repeat(64);
  await c.join();
  const s = c.getSnapshot();
  assert.equal(s.phase, 'idle');
  assert.equal(s.accepted, false);
  assert.equal(s.staleNotice, true);
  assert.equal(s.principles.version, version, 'the NEW version is displayed for a fresh explicit choice');
});

test('an uncertain outcome keeps the same Idempotency-Key for the retry, so it can never join twice', async () => {
  const keys = [];
  let fail = true;
  const { gateway } = joinSetup({ join: async (v, key) => { keys.push(key); if (fail) { fail = false; throw new api.ApiError('network', 'down'); } return member('ACTIVE'); } });
  let n = 0;
  const c = api.createJoinController(gateway, async () => ({ kind: 'none' }), () => `key-${++n}`);
  await c.loadPrinciples(); await c.loadMembership();
  c.setAccepted(true);
  await c.join();
  assert.match(c.getSnapshot().error, /trying again is safe/);
  await c.join();
  assert.deepEqual(keys, ['key-1', 'key-1']);
});

test('REVOKED and ACTIVE never call Join; the refusal is one calm, non-disclosing sentence', async () => {
  for (const status of ['ACTIVE', 'REVOKED']) {
    const { gateway, calls } = joinSetup({ me: member(status) });
    const c = api.createJoinController(gateway);
    await c.loadPrinciples(); await c.loadMembership();
    c.setAccepted(true);
    await c.join();
    assert.equal(calls.length, 0, status);
  }
  const { gateway } = joinSetup({ join: async () => { throw new api.ApiError('http', 'x', 409, 'TRUST_PROJECT_MEMBERSHIP_NOT_AVAILABLE'); } });
  const c = api.createJoinController(gateway);
  await c.loadPrinciples(); await c.loadMembership();
  c.setAccepted(true);
  await c.join();
  assert.equal(c.getSnapshot().error, 'Joining isn’t available for this KS Number. If you think this is a mistake, use Help & Support.');
});

test('conversation continuity runs only after membership, and its failure never undoes membership', async () => {
  for (const [outcome, expected] of [[async () => ({ kind: 'claimed', conversationId: 'c-1' }), 'claimed'], [async () => ({ kind: 'failed' }), 'failed'], [async () => { throw new Error('boom'); }, 'failed'], [async () => ({ kind: 'none' }), 'none']]) {
    const order = [];
    const { gateway } = joinSetup({ join: async () => { order.push('join'); return member('ACTIVE'); } });
    const c = api.createJoinController(gateway, async () => { order.push('claim'); return outcome(); });
    await c.loadPrinciples(); await c.loadMembership();
    c.setAccepted(true);
    await c.join();
    assert.deepEqual(order, ['join', 'claim']);
    assert.equal(c.getSnapshot().phase, 'joined');
    assert.equal(c.getSnapshot().membership.value.status, 'ACTIVE');
    assert.equal(c.getSnapshot().continuation.kind, expected);
  }
});

test('the claim is never attempted when Join fails', async () => {
  let claimed = false;
  const { gateway } = joinSetup({ join: async () => { throw new api.ApiError('http', 'x', 400, 'X'); } });
  const c = api.createJoinController(gateway, async () => { claimed = true; return { kind: 'claimed', conversationId: 'c' }; });
  await c.loadPrinciples(); await c.loadMembership();
  c.setAccepted(true);
  await c.join();
  assert.equal(claimed, false);
});

test('membershipKind maps the server status without inventing one', () => {
  assert.equal(api.membershipKind(null), 'none');
  assert.equal(api.membershipKind(member(null)), 'none');
  for (const [s, k] of [['INVITED', 'invited'], ['ACTIVE', 'active'], ['DECLINED', 'declined'], ['REVOKED', 'revoked']]) assert.equal(api.membershipKind(member(s)), k);
});

// ------------------------------------------------------------------ Join page
const joinPage = (props = {}) => html(api.JoinExperience, {
  communityGateway: joinSetup().gateway, auth: {}, session: { setTokens: noop }, signedIn: false, interest: null,
  continueConversation: async () => ({ kind: 'none' }), onExploreCommunity: noop, onReturnToConversation: noop, onHelp: noop, onDone: noop, ...props,
});

test('signed out, the Join page explains membership, what it is not, and offers identity first -- never a Join button', () => {
  const out = text(joinPage());
  assert.match(out, /Join The Trust Project/);
  assert.match(out, /People and businesses can belong\. One KS Number for SecurePay and The Trust Project\./);
  assert.match(out, /The Trust Project is powered by SecurePay, and your KS Number is your identity across both\./);
  for (const line of api.JOIN_IS_NOT) assert.ok(out.includes(line), line);
  assert.match(out, /You never have to invite, teach or sell\./);
  assert.match(out, /Get my KS Number/);
  assert.match(out, /I already have a KS Number/);
  assert.doesNotMatch(out, new RegExp(api.ACCEPTANCE_LABEL.replace(/[.]/g, '\\.')));
  assert.match(joinPage(), /<h1[^>]*>Join The Trust Project<\/h1>/);
});

test('a shared interest changes explanatory copy only; unknown values are ignored', () => {
  const plug = text(joinPage({ interest: 'plug' }));
  assert.ok(plug.includes(api.INTEREST_CONTEXT.plug));
  assert.match(plug, /Everyone joins as a Member/);
  assert.equal(api.parseJoinInterest('MASTER'), 'master');
  for (const bad of ['admin', 'plug;x', '', null, undefined, 'referral']) assert.equal(api.parseJoinInterest(bad), null, String(bad));
});

test('the Join route accepts only #/join with an optional presentation interest', () => {
  assert.deepEqual(api.parseJoinRoute('#/join'), { interest: null });
  assert.deepEqual(api.parseJoinRoute('#/join?interest=plug'), { interest: 'plug' });
  assert.deepEqual(api.parseJoinRoute('#/join?interest=evil'), { interest: null });
  assert.equal(api.parseJoinRoute('#/joinus'), null);
  assert.equal(api.parseJoinRoute('#/sign-in'), null);
  assert.equal(api.isSignUpHash('#/sign-up'), true);
  assert.equal(api.isSignUpHash('#/sign-upx'), false);
});

test('the Join page source keeps the explicit acceptance control separate and never offers signup when signed in', async () => {
  const src = await readFile('src/features/join/JoinExperience.tsx', 'utf8');
  assert.match(src, /type="checkbox"/);
  assert.match(src, /disabled=\{!state\.accepted/);
  assert.match(src, /\{!signedIn && identityPath === 'signup'/);
  assert.doesNotMatch(src, /(?<!!)signedIn && identityPath === 'signup'/, 'signup is only ever offered while signed out');
  const controller = await readFile('src/features/join/controller.ts', 'utf8');
  assert.doesNotMatch(controller, /interest/i, 'the interest never reaches the Join command');
});

// ------------------------------------------------------------------ generic signup
test('generic signup says it creates an identity only, with context-aware and non-enumerating errors', () => {
  const state = { phase: 'form', busy: false, displayName: '', channelType: 'SMS', destination: '', password: '', otp: '', challengeToken: null, maskedDestination: null, error: null };
  assert.equal(api.signupView(state, 'GENERIC').reason, 'This creates your SecurePay identity. It does not join The Trust Project or any Agreement.');
  assert.match(api.signupView(state).reason, /does not join or confirm this Agreement/, 'Agreement-invitation wording is unchanged');
  assert.equal(api.signupErrorText(new api.ApiError('http', 'x', 400), 'GENERIC'), 'That didn’t work. Your SecurePay identity has not been created.');
  assert.equal(api.signupErrorText(new api.ApiError('network', 'x'), 'GENERIC'), 'SecurePay couldn’t send or check that code right now. Your SecurePay identity has not been created.');
  assert.match(api.signupErrorText(new api.ApiError('http', 'x', 400), 'TRUST_PROJECT_JOIN'), /haven’t joined The Trust Project/);
  assert.match(api.signupErrorText(new api.ApiError('http', 'x', 400)), /Your invitation is still available/);
  for (const ctx of ['GENERIC', 'TRUST_PROJECT_JOIN', 'AGREEMENT_INVITATION']) {
    assert.doesNotMatch(api.signupErrorText(new api.ApiError('http', 'x', 400), ctx), /already|registered|exists/i, ctx);
  }
});

test('signup completion signs in but never joins anything', async () => {
  const tokens = [];
  const auth = {
    signupStart: async () => ({ signupChallengeToken: 't', maskedDestination: '07••••' }),
    signupResend: async () => {},
    signupVerify: async () => ({ ksNumber: 'KS900', accessToken: 'a', refreshToken: 'r' }),
  };
  const c = api.createSignupController(auth, { setTokens: t => tokens.push(t) }, 'GENERIC');
  c.setDisplayName('Amina'); c.setDestination('0700000000'); c.setPassword('long-enough-password');
  await c.start(); c.setOtp('123456'); await c.verify();
  assert.equal(c.getSnapshot().phase, 'completed');
  assert.equal(tokens.length, 1);
  const src = (await readFile('src/features/signup/controller.ts', 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.doesNotMatch(src, /membership|\.join\(|communityGateway/);
});

test('the generic signup page renders the identity-only statement', () => {
  const out = text(html(api.SignUpExperience, { auth: {}, session: { setTokens: noop }, onSignIn: noop, onCancel: noop }));
  assert.match(out, /Get your KS Number/);
  assert.match(out, /This creates your SecurePay identity\. It does not join The Trust Project or any Agreement\./);
});

test('Sign in offers “Don’t have a KS Number? Get one” immediately below the sign-in card', () => {
  const out = html(api.SignInExperience, { auth: {}, session: { setTokens: noop }, onSignedIn: noop, onCancel: noop, onRecover: noop, onGetKsNumber: noop });
  assert.match(text(out), /Don’t have a KS Number\? Get one/);
  assert.ok(out.indexOf('data-get-ks-number') > out.indexOf('Sign in with your KS Number'));
  assert.ok(out.indexOf('data-get-ks-number') < out.indexOf('Trouble signing in'));
});

// ------------------------------------------------------------------ public navigation and Home
const actions = { home: noop, signIn: noop, join: noop, section: noop, skipToKs001: noop };
test('PublicNav: Sign in is secondary and Join is primary, on desktop and mobile', () => {
  const nav = html(api.PublicNav, { actions });
  assert.match(nav, /Sign in<\/button>/);
  assert.match(nav, /data-public-join-cta[^>]*class="[^"]*bg-forest-600[^"]*"[^>]*>Join<\/button>/);
  assert.ok(nav.indexOf('>Sign in<') < nav.indexOf('>Join<'));
  assert.doesNotMatch(nav, /hidden md:[^"]*"[^>]*data-public-join-cta|data-public-join-cta[^>]*md:hidden/);
});

test('the public Home Join chapter is live, truthful and offers no Business or Organization Join', () => {
  const home = text(html(api.PublicHome, { onStart: noop, onBringPlan: noop, onPickDocument: noop, onPickPhoto: noop, onFocusComposer: noop, onBrowseStores: noop, onSignIn: noop, onRecover: noop, onHelp: noop, onSection: noop, onJoin: noop }));
  assert.match(home, /Join The Trust Project/);
  assert.match(home, /People and businesses can belong\. One KS Number for SecurePay and The Trust Project\./);
  assert.match(home, /You never have to invite, teach or sell\./);
  assert.match(home, /Joining doesn’t turn on payments, fees, bank accounts or subscriptions\./);
  assert.match(home, /I already have a KS Number/);
  assert.match(home, /Bring the plan\. Leave with an agreement\./);
  assert.doesNotMatch(home, /Join (as|for) (a |an |your )?(Business|Organi[sz]ation)|coming soon|opens soon/i);
});

// ------------------------------------------------------------------ Trust Project section + share
const section = props => text(html(api.TrustProjectSection, { onExploreCommunity: noop, onOpenStores: noop, onJoin: noop, ...props }));
test('TrustProjectSection actions follow membership: Join / Review invitation / Explore + Invite / nothing for REVOKED', () => {
  assert.match(section({ membership: { status: null, canonicalKsNumber: 'KS1' } }), /Join The Trust Project/);
  assert.match(section({ membership: { status: 'DECLINED', canonicalKsNumber: 'KS1' } }), /Join The Trust Project/);
  assert.match(section({ membership: { status: 'INVITED', canonicalKsNumber: 'KS1' } }), /Review invitation/);
  const active = section({ membership: { status: 'ACTIVE', canonicalKsNumber: 'KS1' } });
  assert.match(active, /Explore Community/);
  assert.match(active, /Invite someone/);
  assert.doesNotMatch(active, /Join The Trust Project/);
  const revoked = section({ membership: { status: 'REVOKED', canonicalKsNumber: 'KS1' } });
  assert.doesNotMatch(revoked, /Join The Trust Project|Review invitation|Invite them/);
});

test('ACTIVE members see the three contextual prompts, each with Invite them', () => {
  const active = section({ membership: { status: 'ACTIVE', canonicalKsNumber: 'KS1' } });
  for (const key of ['member', 'plug', 'master']) assert.ok(active.includes(api.SHARE_PROMPT[key]), key);
  assert.equal((active.match(/Invite them/g) ?? []).length, 3);
  assert.doesNotMatch(section({ membership: { status: null, canonicalKsNumber: 'KS1' } }), /Invite them/);
});

test('share copy is human: no income, work, rank or recruitment promises; the link carries only the interest', () => {
  for (const key of ['member', 'plug', 'master']) {
    const message = api.SHARE_MESSAGE[key];
    assert.doesNotMatch(message, /earn|income|paid|money|reward|referral|downline|recruit|guarantee|you are a (plug|master)/i, key);
    const url = api.joinUrl('https://securepay.example/', key);
    assert.equal(url, `https://securepay.example/#/join?interest=${key}`);
  }
  assert.equal(api.joinUrl('https://securepay.example', null), 'https://securepay.example/#/join');
  const wa = api.whatsAppShareUrl(api.shareText('plug', 'https://securepay.example/#/join?interest=plug'));
  assert.match(wa, /^https:\/\/wa\.me\/\?text=/);
  assert.ok(decodeURIComponent(wa.split('text=')[1]).endsWith('https://securepay.example/#/join?interest=plug'));
});

test('the share sheet offers WhatsApp and Copy link, and states that sharing grants nothing', () => {
  const out = html(api.ShareInvitation, { interest: 'master', onClose: noop, origin: 'https://securepay.example' });
  assert.match(out, /href="https:\/\/wa\.me\/\?text=[^"]*interest%3Dmaster"/);
  assert.match(out, /rel="noopener noreferrer"/);
  assert.match(text(out), /Copy link/);
  assert.match(text(out), /An invitation is not a referral and earns nothing\./);
  assert.match(out, /role="status"/);
});

// ------------------------------------------------------------------ boundaries
test('Community: the invitation-only copy is gone; Join and the two invitation choices exist; one-tap accept is gone', async () => {
  const src = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.doesNotMatch(src, /invitation-based/);
  assert.match(src, /You’re not a member of The Trust Project yet\./);
  assert.match(src, /Sign in or join The Trust Project to take part in Community\./);
  assert.match(src, /They already have a KS Number/);
  assert.match(src, /Share an invitation/);
  assert.doesNotMatch(await readFile('src/features/community/controller.ts', 'utf8'), /membership\.accept\(/);
});

test('an Agreement invitation stays separate: only a quiet optional doorway after confirmation', async () => {
  const src = await readFile('src/features/recipient/RecipientExperience.tsx', 'utf8');
  assert.match(src, /You can also join The Trust Project\./);
  assert.doesNotMatch(src, /membership\.join|membership\.accept|communityGateway/);
});

test('no Business or Organization Join, no Plug/Master grant and no referral anywhere in the Phase 4 UI', async () => {
  for (const file of ['src/features/join/JoinExperience.tsx', 'src/features/join/controller.ts', 'src/features/join/share.ts', 'src/features/join/ShareInvitation.tsx', 'src/features/join/route.ts', 'src/features/public/PublicHome.tsx', 'src/features/public/PublicNav.tsx', 'src/components/TrustProjectSection.tsx']) {
    const src = (await readFile(file, 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(src, /trust-project\/join|business\/[^'"`]*join|organization.*join|ORGANIZATION/i, file);
    assert.doesNotMatch(src, /marketNetwork|plug\/entry|master\/me\/designate|referral\.|lifetime/i, file);
  }
  const business = await readFile('src/features/business/BusinessExperience.tsx', 'utf8');
  assert.doesNotMatch(business, /Join The Trust Project/);
});

test('the conversation token never enters a Join URL; continuity claims through the Phase 3 gateway only', async () => {
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /gateway\.resumableConversationId\?\.\(\)/);
  assert.match(agent, /await gateway\.saveBuild\(conversationId\)/);
  for (const file of ['src/features/join/route.ts', 'src/features/join/share.ts']) {
    const code = (await readFile(file, 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(code, /conversation|secret|X-SecurePay/i, file);
  }
});

test('a non-member whose status is OMITTED on the wire (backend non_null inclusion) reaches the Community gate, never a crash', () => {
  // Found live in Journey L: `/membership/me` for a non-member is `{}`-shaped (no `status` key at all).
  const wire = JSON.parse(JSON.stringify({ status: null, invitedByCanonicalKsNumber: null }, (k, v) => (v === null ? undefined : v)));
  assert.equal('status' in wire, false);
  assert.deepEqual(api.toMembershipUiState(wire), { kind: 'none' });
  assert.deepEqual(api.toMembershipUiState({}), { kind: 'none' });
  assert.deepEqual(api.toMembershipUiState(undefined), { kind: 'none' });
  assert.deepEqual(api.toMembershipUiState({ status: 'SOMETHING_NEW' }), { kind: 'none' });
  assert.equal(api.toMembershipUiState({ status: 'ACTIVE' }).kind, 'active');
  assert.equal(api.membershipKind(wire), 'none');
});
