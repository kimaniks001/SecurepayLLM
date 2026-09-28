import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';

// Public Experience Convergence Phase 4 -- Join, identity-only signup and human invitations (ADR-0021).
const bundle = await build({ stdin: { contents: `
export { createJoinController, membershipKind } from './src/features/join/controller';
export { toMembershipUiState } from './src/features/community/controller';
export { createSignInFlow, authLegFor } from './src/features/public/signInFlow';
export { createWorkspaceController, workspaceEntryFor } from './src/features/workspace/controller';
export { WorkspaceExperience } from './src/features/workspace/WorkspaceExperience';
export { SecureAuthCard } from './src/components/SecureAuth';
export { ConversationInput } from './src/components/ConversationInput';
export { FairTradeAffordance, FairTradePrinciplesPanel } from './src/components/FairTradePrinciples';
export { NavBar } from './src/components/NavBar';
export { navigateWorkspace, WORKSPACE_UNAVAILABLE_NOTICE } from './src/features/workspace/navigation';
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
  // Locked Phase 2 wording (not the over-broad "earns nothing"): SecurePay has separate backend-authoritative
  // commercial referral economics, so only RECRUITING MEMBERS earns nothing AUTOMATICALLY.
  assert.match(text(out), /Sharing only sends a link\. They choose whether to join, and everyone joins as a Member\. An invitation is not a referral, and recruiting members earns nothing automatically\./);
  assert.doesNotMatch(text(out), /invitation[^.]*earns nothing(?! automatically)/i);
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

test('represented Joins only through their own targets, no Plug/Master grant and no referral anywhere in the Phase 4 UI', async () => {
  // Phase 4C (ADR-0023) and 4D (ADR-0024) add Business and Organization Join ONLY as their own represented targets,
  // through their own gateway calls. The public and personal paths never name a represented identity.
  for (const file of ['src/features/join/JoinExperience.tsx', 'src/features/join/controller.ts', 'src/features/join/share.ts', 'src/features/join/ShareInvitation.tsx', 'src/features/join/route.ts', 'src/features/public/PublicHome.tsx', 'src/features/public/PublicNav.tsx', 'src/components/TrustProjectSection.tsx']) {
    const src = (await readFile(file, 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(src, /trust-project\/join|business\/[^'"`]*join|organization\/[^'"`]*join/i, file);
    assert.doesNotMatch(src, /'ORGANIZATION'/, file);
    assert.doesNotMatch(src, /marketNetwork|plug\/entry|master\/me\/designate|referral\.|lifetime/i, file);
    if (!file.startsWith('src/features/join/controller') && !file.startsWith('src/features/join/JoinExperience')) {
      assert.doesNotMatch(src, /joinBusiness|joinOrganization/, file);
    }
  }
  // The personal Join never carries a target.
  assert.match(await readFile('src/features/join/controller.ts', 'utf8'), /: await community\.membership\.join\(version, attemptKey\);/);
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
  assert.deepEqual(api.toMembershipUiState({ status: 'SOMETHING_NEW' }), { kind: 'unknown' }, 'an unrecognised status is never inferred as a non-member');
  assert.equal(api.toMembershipUiState({ status: 'ACTIVE' }).kind, 'active');
  assert.equal(api.membershipKind(wire), 'none');
});

// ------------------------------------------------------------------ Phase 4 final correction pass
// Correction 1 -- Sign in → "Get one" → signup keeps the SAME in-memory origin + intent.
function fakeLocation(start = '') {
  const history = [start];
  return { history, get: () => history[history.length - 1], set: h => history.push(h) };
}
async function completeGenericSignup(tokens) {
  const auth = {
    signupStart: async () => ({ signupChallengeToken: 't', maskedDestination: '07••••' }),
    signupResend: async () => {},
    signupVerify: async () => ({ ksNumber: 'KS901', accessToken: 'a', refreshToken: 'r' }),
  };
  const c = api.createSignupController(auth, { setTokens: t => tokens.push(t) }, 'GENERIC');
  c.setDisplayName('Wanjiru'); c.setDestination('0700000001'); c.setPassword('long-enough-password');
  await c.start(); c.setOtp('123456'); await c.verify();
  assert.equal(c.getSnapshot().phase, 'completed');
}
// Mirrors AgentExperience's return effect exactly: signed in while either identity leg shows → close → navigate.
function returnAfterAuthentication(flow, signedIn, navigateTo) {
  if (!signedIn || !flow.leg()) return;
  const intent = flow.close();
  if (intent) navigateTo(intent);
}

for (const [intent, start] of [['agreements', ''], ['projects', ''], ['account', ''], ['money', '#/'], [null, '']]) {
  test(`requestSignIn(${intent}) → Get one → signup → signed in → ${intent ?? 'where they were'} (intent held in memory only)`, async () => {
    const loc = fakeLocation(start);
    const flow = api.createSignInFlow(loc);
    const navigated = [];
    flow.open(intent);                        // requestSignIn(intent) / public Sign in
    assert.equal(flow.leg(), 'sign-in');
    flow.toSignUp();                          // SignInExperience onGetKsNumber
    assert.equal(flow.leg(), 'sign-up');
    flow.sync();                              // the hashchange to #/sign-up must not forget the journey
    assert.equal(flow.intent(), intent);
    const tokens = [];
    await completeGenericSignup(tokens);      // the REAL generic signup controller → session established
    assert.equal(tokens.length, 1);
    returnAfterAuthentication(flow, true, v => navigated.push(v));
    assert.deepEqual(navigated, intent ? [intent] : []);
    assert.equal(loc.get(), start, 'returned to where they came from');
    for (const h of loc.history) assert.doesNotMatch(h, /agreements|projects|account|money|return|intent/i, `no intent in the URL: ${h}`);
    flow.sync();
    assert.equal(flow.intent(), null, 'the journey is over and nothing is remembered');
  });
}

test('Get one → Back (cancel) → Sign in keeps the original destination; a successful sign-in still goes there', () => {
  const loc = fakeLocation('');
  const flow = api.createSignInFlow(loc);
  const navigated = [];
  flow.open('agreements'); flow.toSignUp(); flow.sync();
  flow.toSignIn();                            // SignUpExperience onCancel
  flow.sync();
  assert.equal(flow.leg(), 'sign-in');
  assert.equal(flow.intent(), 'agreements');
  returnAfterAuthentication(flow, true, v => navigated.push(v));
  assert.deepEqual(navigated, ['agreements']);
});

test('Get one → “I have a KS Number” → Sign in keeps the original destination', () => {
  const loc = fakeLocation('');
  const flow = api.createSignInFlow(loc);
  const navigated = [];
  flow.open('projects'); flow.toSignUp(); flow.toSignIn(); flow.toSignUp(); flow.toSignIn();
  assert.equal(flow.intent(), 'projects');
  returnAfterAuthentication(flow, true, v => navigated.push(v));
  assert.deepEqual(navigated, ['projects']);
});

test('leaving both identity legs forgets the journey; a later direct #/sign-up never inherits a stale intent', () => {
  const loc = fakeLocation('');
  const flow = api.createSignInFlow(loc);
  flow.open('agreements');
  loc.set('#/store'); flow.sync();           // walked away
  loc.set('#/sign-up'); flow.sync();
  const navigated = [];
  returnAfterAuthentication(flow, true, v => navigated.push(v));
  assert.deepEqual(navigated, []);
  assert.equal(api.authLegFor('#/sign-in'), 'sign-in');
  assert.equal(api.authLegFor('#/sign-up'), 'sign-up');
  assert.equal(api.authLegFor('#/join'), null, 'Join is never part of the Sign in journey');
});

test('AgentExperience wires the generic signup through the ONE Sign in route; Join keeps its own continuation', async () => {
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /onGetKsNumber=\{\(\) => \{ signInRoute\.toSignUp\(\); \}\}/);
  assert.match(agent, /if \(signInRoute\.signingUp && !signedIn\)[\s\S]*?<SignUpExperience[\s\S]*?onSignIn=\{\(\) => \{ signInRoute\.toSignIn\(\); \}\}\s*onCancel=\{\(\) => \{ signInRoute\.toSignIn\(\); \}\}/);
  assert.match(agent, /if \(!signedIn \|\| !\(signInRoute\.active \|\| signInRoute\.signingUp\)\) return;\s*const intent = signInRoute\.close\(\);\s*if \(intent\) navigateTo\(intent\);/);
  assert.doesNotMatch(agent, /SIGN_UP_HASH|useSignUpRoute|signUpRoute/);
  const route = await readFile('src/features/join/route.ts', 'utf8');
  assert.doesNotMatch(route, /useSignUpRoute/);
  const flow = (await readFile('src/features/public/signInFlow.ts', 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.doesNotMatch(flow, /localStorage|sessionStorage|URLSearchParams|\?return|encodeURIComponent/);
  // Join's inline signup stays inside #/join and never touches the Sign in journey.
  const join = await readFile('src/features/join/JoinExperience.tsx', 'utf8');
  assert.doesNotMatch(join, /signInRoute|signInFlow|toSignUp/);
});

// Correction 2 -- UNKNOWN membership is never a known non-member.
test('TrustProjectSection: UNKNOWN (no fact) offers no Join and makes no membership claim; KNOWN NONE offers Join', () => {
  for (const membership of [null, undefined]) {
    const out = section({ membership });
    assert.doesNotMatch(out, /Join The Trust Project|Review invitation|Invite someone|Invite them|not a member|Trust Project member ·/, String(membership));
    assert.match(out, /Read the 12 Principles/);
    assert.match(out, /Stores/);
  }
  assert.match(section({ membership: { status: null, canonicalKsNumber: 'KS1' } }), /Join The Trust Project/);
  assert.match(section({ membership: { status: 'DECLINED', canonicalKsNumber: 'KS1' } }), /Join The Trust Project/);
  assert.match(section({ membership: { status: 'INVITED', canonicalKsNumber: 'KS1' } }), /Review invitation/);
  assert.match(section({ membership: { status: 'ACTIVE', canonicalKsNumber: 'KS1' } }), /Explore Community[\s\S]*Invite someone/);
  assert.doesNotMatch(section({ membership: { status: 'REVOKED', canonicalKsNumber: 'KS1' } }), /Join The Trust Project/);
});

test('a failed /membership/me read reaches TrustProjectSection as UNKNOWN, never as a known non-member', async () => {
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  // success: an absent status is a KNOWN non-member (null); failure: undefined (unknown).
  assert.match(agent, /\.then\(m => \{ if \(!cancelled\) setTrustMembershipStatus\(m\.status \?\? null\); \}\)\.catch\(\(\) => \{ if \(!cancelled\) setTrustMembershipStatus\(undefined\); \}\)/);
  // unknown is passed on as NO fact (null), on both signed-in Homes.
  assert.equal((agent.match(/trustMembershipStatus !== undefined \? \{ status: trustMembershipStatus, canonicalKsNumber: ownKsNumber \} : null/g) ?? []).length, 2);
  // …and a NO-fact section renders no Join (proved above); the equivalent render of the failure path:
  let status = 'pending';
  await Promise.reject(new Error('503')).then(() => { status = null; }).catch(() => { status = undefined; });
  const membership = status !== undefined ? { status, canonicalKsNumber: 'KS1' } : null;
  assert.doesNotMatch(section({ membership }), /Join The Trust Project/);
});

// Correction 3 -- the locked invitation / referral wording on both Phase 4 invitation surfaces.
test('Phase 4 invitation surfaces use the locked Phase 2 sentence, never a blanket “earns nothing”', async () => {
  const LOCKED = /An invitation is not a referral, and recruiting members earns nothing automatically\./;
  const strip = src => src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  const share = strip(await readFile('src/features/join/ShareInvitation.tsx', 'utf8'));
  const community = strip(await readFile('src/features/community/CommunityExperience.tsx', 'utf8'));
  assert.match(share, LOCKED);
  assert.match(community, /Invite someone you believe would add something useful to a community that chooses to trade fairly\. An invitation is not a referral, and recruiting members earns nothing automatically\./);
  for (const src of [share, community]) {
    assert.doesNotMatch(src, /invitation[^.]*earns nothing(?! automatically)/i);
    assert.doesNotMatch(src, /(invites|introductions|inviting people) earn(s)? nothing/i);
  }
});

test('Community: a FAILED membership read is UNKNOWN -- a restrained line, no “not a member” and no Join', async () => {
  const community = await readFile('src/features/community/controller.ts', 'utf8');
  // the non-auth failure path of loadMembership
  assert.match(community, /update\(\{ membership: \{ kind: 'unknown' \}, notice: errorText\(apiError\) \}\);/);
  assert.doesNotMatch(community, /update\(\{ membership: \{ kind: 'none' \}, notice/);
  const view = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  const block = view.slice(view.indexOf("membership.kind === 'unknown' && ("), view.indexOf("membership.kind === 'none' && ("));
  assert.match(block, /SecurePay couldn’t check your Trust Project membership just now\./);
  assert.doesNotMatch(block, /Join|not a member|onJoin/);
});

// ------------------------------------------------------------------ Phase 4 final navigation + auth control correction
// Issue 1 -- `agreements` is a real Workspace entry: the Agreements Hub, not Signed-in Home.
const wsSummary = (over = {}) => ({ agreementId: 'agr-1', publicReference: 'AGR-1', title: 'Roof repair', purpose: '', status: 'PROPOSED', agreementType: 'SERVICE', proposedAmountMinor: null, currency: 'KES', createdAt: 'x', updatedAt: 'x', currentActor: { roleCode: 'PROPOSER', participantStatus: 'CREATOR' }, counterparty: null, nextDeadline: null, attentionRequired: false, nextActions: [], currentAgreementVersionId: 'v1', completion: { completed: false, status: 'X', reasonCodes: [], agreementVersionId: 'v1', completedAt: null }, ...over });
const wsHub = items => ({ needsMe: items, waitingOnOthers: [], takingShape: [], active: [], changedReviewRequired: [], completed: [], cancelled: [], expired: [] });
const wsTick = () => new Promise(r => setTimeout(r, 0));
function wsGateway(calls = []) {
  return {
    hub: async () => { calls.push('hub'); return wsHub([wsSummary()]); },
    home: async () => { calls.push('home'); return { problems: [], recentActivity: [], moneyByCurrency: [] }; },
    myCalendar: async () => [], myInvitations: async () => ({ items: [] }),
    detail: async () => { throw new Error('not needed'); }, confirmations: async () => [], confirmationStatus: async () => [], people: async () => null,
    milestoneEffectiveStates: async () => null, calendarEvents: async () => [], calendarConflicts: async () => [], tagsForAgreement: async () => [], source: async () => null,
    currentUserActions: async () => ({ items: [], page: 0, size: 100, totalElements: 0 }),
    money: { status: async () => { throw new Error('x'); }, records: async () => [] },
  };
}
// Renders the REAL WorkspaceExperience at the entry a destination maps to (what is visible at mount).
const renderWorkspace = entry => text(html(api.WorkspaceExperience, { gateway: wsGateway(), initialView: entry, onLeave: noop }));
const HUB_VISIBLE = /Loading your agreements…/;          // the Agreements Hub branch
const HOME_VISIBLE = /Loading your SecurePay agreements…/; // the Signed-in Home branch

test("navigateTo('signed-in') enters Workspace HOME and navigateTo('agreements') enters the Agreements HUB -- explicitly different", () => {
  assert.equal(api.workspaceEntryFor('signed-in'), 'home');
  assert.equal(api.workspaceEntryFor('agreements'), 'hub');
  assert.equal(api.workspaceEntryFor('money'), 'home');
  assert.equal(api.workspaceEntryFor('agreement-detail'), 'home', 'a specific Agreement uses initialAgreementId, never the Hub entry');
  const home = renderWorkspace(api.workspaceEntryFor('signed-in'));
  assert.match(home, HOME_VISIBLE); assert.doesNotMatch(home, HUB_VISIBLE);
  const hub = renderWorkspace(api.workspaceEntryFor('agreements'));
  assert.match(hub, HUB_VISIBLE); assert.doesNotMatch(hub, HOME_VISIBLE);
  assert.match(text(html(api.WorkspaceExperience, { gateway: wsGateway(), onLeave: noop })), HOME_VISIBLE, 'the default entry stays Home');
});

test('the Hub entry loads the Hub (not Home) and is one-shot: Home, Hub, Detail and Back all work afterwards', async () => {
  const calls = [];
  const c = api.createWorkspaceController(wsGateway(calls), 'hub');
  assert.equal(c.getSnapshot().view, 'hub');
  c.enter(); await wsTick(); await wsTick();
  assert.equal(c.getSnapshot().view, 'hub');
  assert.equal(c.getSnapshot().hub.status, 'ready');
  assert.deepEqual(calls.filter(x => x === 'home'), [], 'Home extras are not loaded for a Hub entry');
  c.enter(); await wsTick();                               // a second enter never re-forces anything
  c.goHome(); await wsTick(); await wsTick();
  assert.equal(c.getSnapshot().view, 'home');
  c.goHub(); await wsTick(); await wsTick();
  assert.equal(c.getSnapshot().view, 'hub');
  c.openFromHub('agr-1'); await wsTick();
  assert.equal(c.getSnapshot().view, 'detail');
  c.backToHub?.(); await wsTick(); await wsTick();
  assert.equal(c.getSnapshot().view, 'hub');
});

test('initialAgreementId restoration is unchanged: a Home entry still opens the real Agreement Detail', async () => {
  const c = api.createWorkspaceController(wsGateway(), 'home');
  c.enter(); await wsTick(); await wsTick();
  assert.equal(c.getSnapshot().view, 'home');
  c.openFromHome('agr-1'); await wsTick();
  assert.equal(c.getSnapshot().view, 'detail');
  assert.equal(c.getSnapshot().selectedAgreementId, 'agr-1');
  const ws = await readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8');
  assert.match(ws, /if \(restorationConsumed\.current \|\| !initialAgreementId \|\| state\.hub\.status !== 'ready'\) return;/);
  assert.match(ws, /const \[controller\] = useState\(\(\) => createWorkspaceController\(gateway, initialView\)\);/, 'entry read once, at mount');
});

for (const [name, path] of [
  ['Sign in', flow => { /* credentials + OTP on #/sign-in */ }],
  ['Get one → signup', flow => { flow.toSignUp(); flow.sync(); }],
  ['Get one → Back → Sign in', flow => { flow.toSignUp(); flow.sync(); flow.toSignIn(); flow.sync(); }],
]) {
  test(`signed-out Agreements → ${name} → authenticated → the Agreements HUB is what renders`, async () => {
    const flow = api.createSignInFlow(fakeLocation(''));
    flow.open('agreements');                                // requestSignIn('agreements')
    path(flow);
    if (name.includes('signup')) await completeGenericSignup([]);
    let rendered = null;
    // AgentExperience: close() -> navigateTo(intent) -> setWorkspaceEntry(workspaceEntryFor(view)) -> <WorkspaceExperience initialView>
    returnAfterAuthentication(flow, true, view => { rendered = renderWorkspace(api.workspaceEntryFor(view)); });
    assert.ok(rendered, 'navigateTo ran');
    assert.match(rendered, HUB_VISIBLE);
    assert.doesNotMatch(rendered, HOME_VISIBLE);
  });
}

test('AgentExperience: every App-level Workspace entry sets an explicit entry; Store/Community/Account → Agreements reach the Hub', async () => {
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  // the ONE workspace branch of navigateTo (used by NavBar from Store, Community, Account, Help and the sign-in return)
  assert.match(agent, /if \(sessionState\.status === 'signed-in'\) \{\s*setWorkspaceAgreementId\(returningAgreementId\);\s*setWorkspaceEntry\(workspaceEntryFor\(view\)\);\s*setWorkspace\(true\);/);
  assert.match(agent, /initialAgreementId=\{workspaceAgreementId\}\s*initialView=\{workspaceEntry\}/);
  // specific-Agreement openings keep the Home entry + initialAgreementId (never the Hub, never inferred from a null id)
  assert.equal((agent.match(/setWorkspaceAgreementId\(agreementId\);\s*setWorkspaceEntry\('home'\);\s*setWorkspace\(true\);/g) ?? []).length, 2);
  // Store / Community / Account leave the Workspace, so re-entering mounts it fresh on its entry view
  assert.match(agent, /if \(view === 'store'\) \{ setWorkspace\(false\);/);
  assert.match(agent, /if \(view === 'community'\) \{ setWorkspace\(false\);/);
  assert.doesNotMatch(agent, /setTimeout\([^)]*goHub|querySelector\([^)]*Agreements/);
});

// Issue 2 -- the real SecureAuth <input> is the 44px target.
test('SecureAuth: every text, password and OTP input is itself >= 44px (min-h-11), with no wrapper vertical padding', async () => {
  const data = { type: 'SECURE_AUTH', title: 'Sign in', reason: 'r', identityKsn: null, primaryLabel: 'Go', primaryValue: 'go', secondaryLabel: 'Back', secondaryValue: 'back',
    identityName: '', fields: [{ type: 'text', label: 'KS Number', placeholder: 'KS-000000' }, { type: 'text', label: 'Your name', placeholder: '' }, { type: 'password', label: 'Password', placeholder: '' }, { type: 'otp', label: 'One-time code', placeholder: '' }] };
  const out = html(api.SecureAuthCard, { data, onChoice: noop, values: ['', '', '', ''], onFieldChange: noop });
  const inputs = out.match(/<input[^>]*>/g) ?? [];
  assert.equal(inputs.length, 4);
  for (const input of inputs) {
    assert.match(input, /class="[^"]*\bmin-h-11\b/, input);
    assert.match(input, /class="[^"]*\bmin-w-0\b/, 'can shrink at 320px instead of overflowing');
  }
  // OTP keyboard and autocomplete unchanged
  assert.match(inputs[3], /inputMode="numeric"/); assert.match(inputs[3], /autoComplete="one-time-code"/);
  assert.match(inputs[2], /type="password"/); assert.match(inputs[2], /autoComplete="current-password"/);
  // the icon/border wrapper no longer adds vertical padding (no 64-70px giant fields)
  const wrappers = out.match(/<div class="mt-1 flex items-center[^"]*"/g) ?? [];
  assert.equal(wrappers.length, 4);
  for (const w of wrappers) assert.doesNotMatch(w, /\bpy-\d/);
  // min-h-11 really is 44px: Tailwind's default spacing (2.75rem at 16px root) is not overridden
  const tw = await readFile('tailwind.config.js', 'utf8').catch(() => readFile('tailwind.config.ts', 'utf8'));
  assert.doesNotMatch(tw, /minHeight\s*:|spacing\s*:\s*\{/, 'default spacing scale (min-h-11 = 2.75rem = 44px)');
});

// ------------------------------------------------------------------ Phase 4 final UI polish (UR-223)
const cls = el => (el.match(/class="([^"]*)"/) ?? [, ''])[1].split(/\s+/);
test('KS001 Send is a 44×44 target (h-11 w-11), with its hover/active scale guarded for reduced motion', () => {
  const out = html(api.ConversationInput, { onSend: noop });
  const send = out.match(/<button[^>]*aria-label="Send"[^>]*>/)[0];
  for (const c of ['h-11', 'w-11', 'motion-reduce:hover:scale-100', 'motion-reduce:active:scale-100']) assert.ok(cls(send).includes(c), c);
  assert.ok(!cls(send).includes('h-9') && !cls(send).includes('w-9'));
  // the textarea carries the vertical padding so the composer keeps its height and the text stays centred
  assert.ok(cls(out.match(/<textarea[^>]*>/)[0]).includes('py-2.5'));
});

test('the Fair Trade affordance keeps its quiet underline and is a 44px target; the panel Close is 44×44', () => {
  const link = html(api.FairTradeAffordance, { onOpen: noop }).match(/<button[^>]*>/)[0];
  for (const c of ['inline-flex', 'min-h-11', 'items-center', 'underline']) assert.ok(cls(link).includes(c), c);
  assert.ok(!cls(link).some(c => /^(bg-|border|shadow|px-[3-9])/.test(c)), 'not a pill, card or heavy button');
  const panel = html(api.FairTradePrinciplesPanel, { onClose: noop });
  const close = panel.match(/<button[^>]*aria-label="Close"[^>]*>/)[0];
  for (const c of ['inline-flex', 'h-11', 'w-11', 'shrink-0', 'items-center', 'justify-center']) assert.ok(cls(close).includes(c), c);
  assert.match(panel, /<svg[^>]*class="[^"]*\bw-5 h-5\b/, 'the X itself stays small');
});

test('signed-in NavBar: mark-only brand at md, wordmark from lg; every desktop control is >= 44px; Notifications 44×44', () => {
  const out = html(api.NavBar, { view: 'signed-in', onNavigate: noop });
  const desktop = out.slice(0, out.indexOf('<nav', 5));
  const brand = desktop.match(/<button[^>]*aria-label="SecurePay"[^>]*>/)[0];
  assert.ok(cls(brand).includes('min-h-11') && cls(brand).includes('shrink-0'));
  const imgs = desktop.match(/<img[^>]*>/g);
  assert.equal(imgs.length, 2);
  assert.ok(!cls(imgs[0]).includes('hidden'), 'the mark is always visible');
  assert.ok(cls(imgs[1]).includes('hidden') && cls(imgs[1]).includes('lg:block'), 'the wordmark returns at lg');
  const items = desktop.match(/<button(?![^>]*aria-label)[^>]*>/g);
  assert.equal(items.length, 6);
  for (const b of items) assert.ok(cls(b).includes('min-h-11'), b);
  const bell = desktop.match(/<button[^>]*aria-label="Notifications"[^>]*>/)[0];
  for (const c of ['h-11', 'w-11', 'inline-flex', 'items-center', 'justify-center']) assert.ok(cls(bell).includes(c), c);
  for (const label of ['Home', 'Agreements', 'Money', 'Store', 'Community', 'Account']) assert.match(desktop, new RegExp(`>${label}</button>`), `${label} is never hidden or abbreviated`);
});

test('PublicNav is untouched by the UR-223 polish', () => {
  const now = execFileSync('git', ['diff', '533f259faafc2884395454c61009f67d536015b7', '--', 'src/features/public/PublicNav.tsx'], { encoding: 'utf8' });
  assert.equal(now, '');
});

test('signed-in mobile bottom nav: every item is 44px high and shares the width (all seven fit at 320px); same labels, icons and order', () => {
  const out = html(api.NavBar, { view: 'signed-in', onNavigate: noop });
  const mobile = out.slice(out.indexOf('<nav', 5));
  assert.match(mobile, /<nav class="[^"]*\bmd:hidden fixed bottom-0\b[^"]*\bpx-1\b/);
  const buttons = mobile.match(/<button[^>]*>/g);
  assert.equal(buttons.length, 7);
  for (const b of buttons) for (const c of ['flex-auto', 'min-h-11', 'justify-center']) assert.ok(cls(b).includes(c), `${c} in ${b}`);
  assert.deepEqual([...mobile.matchAll(/<span[^>]*>([^<]+)<\/span>/g)].map(m => m[1]), ['Home', 'Agreements', 'Money', 'Store', 'Community', 'Account', 'Notifications'], 'no label hidden or abbreviated');
});

// ------------------------------------------------------------------ Phase 4A final Workspace navigation closure
function workspaceNavHarness(controller) {
  const calls = []; const notices = [];
  const cb = name => () => calls.push(name);
  const nav = {
    goHome: () => { calls.push('goHome'); controller.goHome(); }, goHub: () => { calls.push('goHub'); controller.goHub(); },
    setNotice: n => notices.push(n),
    onOpenStore: cb('store'), onOpenCommunity: cb('community'), onOpenProjects: cb('projects'), onOpenVisionBoard: cb('vision-board'),
    onOpenAccount: cb('account'), onOpenNotifications: cb('notifications'),
  };
  return { calls, notices, nav };
}
async function workspaceAt(where) {
  const c = api.createWorkspaceController(wsGateway(), where === 'home' ? 'home' : 'hub');
  c.enter(); await wsTick(); await wsTick();
  if (where === 'detail') { c.openFromHub('agr-1'); await wsTick(); }
  assert.equal(c.getSnapshot().view, where);
  return c;
}

for (const where of ['home', 'hub', 'detail']) {
  test(`Workspace ${where.toUpperCase()}: Account, Notifications, Store, Community, Projects and Vision Board each open their real destination exactly once -- never the unavailable notice`, async () => {
    for (const dest of ['account', 'notifications', 'store', 'community', 'projects', 'vision-board']) {
      const c = await workspaceAt(where);
      const h = workspaceNavHarness(c);
      api.navigateWorkspace(dest, h.nav);
      assert.deepEqual(h.calls, [dest], `${where} -> ${dest}`);
      assert.ok(!h.notices.includes(api.WORKSPACE_UNAVAILABLE_NOTICE), `${where} -> ${dest} must not say unavailable`);
      assert.equal(c.getSnapshot().view, where, 'the Workspace state is left untouched; the top-level router takes over');
    }
  });
}

test('Workspace Home/Agreements stay internal; Money keeps its contextual notice; an unwired or unknown destination still fails closed', async () => {
  const c = await workspaceAt('hub');
  let h = workspaceNavHarness(c);
  api.navigateWorkspace('signed-in', h.nav); await wsTick(); await wsTick();
  assert.deepEqual(h.calls, ['goHome']); assert.equal(c.getSnapshot().view, 'home');
  h = workspaceNavHarness(c);
  api.navigateWorkspace('agreements', h.nav); await wsTick(); await wsTick();
  assert.deepEqual(h.calls, ['goHub']); assert.equal(c.getSnapshot().view, 'hub');
  h = workspaceNavHarness(c);
  api.navigateWorkspace('money', h.nav);
  assert.deepEqual(h.calls, []); assert.deepEqual(h.notices, [null, 'Open Money from a specific agreement to view it.']);
  for (const dest of ['dispute', 'agreement-builder']) {
    h = workspaceNavHarness(c);
    api.navigateWorkspace(dest, h.nav);
    assert.deepEqual(h.calls, []); assert.equal(h.notices.at(-1), api.WORKSPACE_UNAVAILABLE_NOTICE, dest);
  }
  // not wired (e.g. an embedding without the callback) -> fail closed, never a silent no-op
  h = workspaceNavHarness(c); delete h.nav.onOpenAccount;
  api.navigateWorkspace('account', h.nav);
  assert.equal(h.notices.at(-1), api.WORKSPACE_UNAVAILABLE_NOTICE);
});

// The REAL WorkspaceExperience seam: its NavBar is handed a router that reaches the new callbacks.
const seam = await build({ stdin: { contents: `
export { WorkspaceExperience } from './src/features/workspace/WorkspaceExperience';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
export const captured = globalThis.__capturedNav = [];
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl' },
  plugins: [{ name: 'spy-navbar', setup(b) { b.onLoad({ filter: /src\/components\/NavBar\.tsx$/ }, () => ({ loader: 'tsx', contents: 'export function NavBar(props) { globalThis.__capturedNav.push(props); return null; }' })); } }] });
const seamMod = { exports: {} };
new Function('require', 'module', 'exports', seam.outputFiles[0].text)(createRequire(import.meta.url), seamMod, seamMod.exports);

for (const entry of ['home', 'hub']) {
  test(`the real WorkspaceExperience (${entry}) wires its shared NavBar to onOpenAccount / onOpenNotifications`, () => {
    const W = seamMod.exports;
    const called = [];
    W.captured.length = 0;
    W.renderToStaticMarkup(W.createElement(W.WorkspaceExperience, {
      gateway: wsGateway(), initialView: entry, onLeave: noop,
      onOpenStore: () => called.push('store'), onOpenCommunity: () => called.push('community'),
      onOpenAccount: () => called.push('account'), onOpenNotifications: () => called.push('notifications'),
    }));
    const navProps = W.captured.at(-1);
    assert.equal(navProps.view, entry === 'hub' ? 'agreements' : 'signed-in', 'active nav: Home on Home, Agreements on the Hub');
    for (const dest of ['account', 'notifications', 'store', 'community']) navProps.onNavigate(dest);
    assert.deepEqual(called, ['account', 'notifications', 'store', 'community']);
  });
}

test('AgentExperience wires the Workspace callbacks to the EXISTING Account / Notifications destination states', async () => {
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /<WorkspaceExperience[\s\S]*?onOpenAccount=\{\(\) => navigateTo\('account'\)\}\s*onOpenNotifications=\{\(\) => navigateTo\('notifications'\)\}/);
  // navigateTo('account' | 'notifications') leaves the Workspace and sets the real view state…
  assert.match(agent, /if \(view === 'account' \|\| view === 'settings'[\s\S]*?setWorkspace\(false\);[\s\S]*?if \(view === 'account'\) setAccount\(true\);/);
  assert.match(agent, /if \(view === 'notifications'\) \{[\s\S]*?setWorkspace\(false\);[\s\S]*?setNotificationsView\(true\);/);
  // …which renders the real experiences
  assert.match(agent, /if \(account && sessionState\.status === 'signed-in'\) \{\s*return <AccountExperience/);
  assert.match(agent, /if \(notificationsView && sessionState\.status === 'signed-in'\) \{\s*return <NotificationsExperience[^>]*onOpenAgreement=\{openAgreementFromNotification\}/);
});

test('the Account area highlights Account (not Home) in the shared NavBar; NavBar active-state doctrine itself is unchanged', async () => {
  for (const [file, view] of [['account/AccountExperience', 'account'], ['settings/SettingsExperience', 'settings'], ['business/BusinessExperience', 'business'], ['developer/DeveloperExperience', 'developer']]) {
    const src = await readFile(`src/features/${file}.tsx`, 'utf8');
    assert.match(src, new RegExp(`<NavBar view="${view}" onNavigate=\\{onNavigate\\} />`), file);
    assert.doesNotMatch(src, /<NavBar view="signed-in"/, file);
  }
  for (const view of ['account', 'settings', 'business', 'developer']) {
    const desktop = html(api.NavBar, { view, onNavigate: noop });
    const active = [...desktop.slice(0, desktop.indexOf('<nav', 5)).matchAll(/<button[^>]*class="([^"]*)"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]*)<\/button>/g)]
      .filter(m => /text-forest-700 bg-forest-50/.test(m[1])).map(m => m[2]);
    assert.deepEqual(active, ['Account'], view);
  }
});
