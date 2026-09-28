import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Trust Community Phase 5 -- full convergence. These pin the convergence fixes found in the Phase 5 audit and live
// verification, against the REAL controllers and components: the approved hero copy, Organizations in the public
// belonging copy, the Store-reference open path, the Business invitation dead-end failing closed (UR-231), sign-out
// ending the conversation, "sign out everywhere" ending this session, and the 44px target floor.
const bundle = await build({ stdin: { contents: `
export { createInviteController } from './src/features/invitations/controller';
export { InvitePanel } from './src/features/invitations/InvitePanel';
export { createCommunityController } from './src/features/community/controller';
export { createAccountController } from './src/features/account/controller';
export { SignedOutHome, SecurePayHero } from './src/components/SignedOutHome';
export { OfferToTradeHandoff } from './src/components/OfferToTradeHandoff';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (c, p) => api.renderToStaticMarkup(api.createElement(c, p));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const strip = s => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

const HEADLINE = 'Tell SecurePay what you’re trying to make happen.';
const SUPPORTING = 'It helps you bring the people, plans and agreements together so everyone knows what happens next — and money can follow what was agreed.';

// ------------------------------------------------------------------ 1. hero copy (human decision, 2026-09-28)
test('1. the hero carries the approved Phase 5 copy; only the public variant says a KS Number is not needed', () => {
  const pub = text(html(api.SecurePayHero, { onStart() {}, variant: 'public' }));
  assert.ok(pub.includes(HEADLINE)); assert.ok(pub.includes(SUPPORTING));
  assert.match(pub, /Start without a KS Number\. Nothing becomes an agreement until you review and confirm it\./);
  const app = text(html(api.SignedOutHome, { onStart() {} }));
  assert.ok(app.includes(HEADLINE));
  assert.match(app, /Nothing becomes an agreement until you review and confirm it\./);
  assert.doesNotMatch(app, /Start without a KS Number/, 'a signed-in person already has a KS Number');
  for (const out of [pub, app]) assert.doesNotMatch(out, /Bring the plan\. Leave with an agreement\./);
});
test('2. the document title matches the hero', async () => {
  assert.match(await readFile('index.html', 'utf8'), /<title>SecurePay — Tell SecurePay what you’re trying to make happen<\/title>/);
});

// ------------------------------------------------------------------ 3. Organizations belong (ADR-0024)
test('3. public belonging copy names Organizations, and never makes a Business or Organization a Plug or Master', async () => {
  const home = await readFile('src/features/public/PublicHome.tsx', 'utf8');
  assert.match(home, /People, businesses and organizations can belong\. Each has its own KS Number for SecurePay and The Trust Project\./);
  assert.match(home, /Plugs and Masters are individual people\. Businesses and organizations belong as Members, and can work with Plugs and Masters\./);
  assert.match(await readFile('src/features/join/JoinExperience.tsx', 'utf8'), /People, businesses and organizations can belong\./);
  for (const file of ['src/features/community/CommunityExperience.tsx', 'src/components/TrustProjectSection.tsx']) {
    assert.match(await readFile(file, 'utf8'), /A community of people, businesses and organizations choosing to trade fairly/, file);
  }
});

// ------------------------------------------------------------------ 4. Store reference open
test('4. opening a Store offer shown in Community fetches nothing (it is a reference, not a Community object)', async () => {
  const calls = [];
  const recorder = name => new Proxy({}, { get: (_, key) => async (...args) => { calls.push([name, key, ...args]); throw new Error(`unexpected ${name}.${String(key)}`); } });
  const controller = api.createCommunityController(recorder('store'), recorder('community'), recorder('discovery'));
  await controller.openObject('store-offer:KS012:offer-1');
  assert.deepEqual(calls, []);
  const snap = controller.getSnapshot();
  assert.equal(snap.view, 'object'); assert.equal(snap.selectedObjectId, 'store-offer:KS012:offer-1');
});

// ------------------------------------------------------------------ 5/6. Business invitation dead-end (UR-231)
const PERSON = { identityId: 't-1', canonicalKsNumber: 'KS003', displayName: 'A SecurePay Identity', identityType: 'INDIVIDUAL' };
function inviteSetup(target) {
  const calls = []; let n = 0;
  const gateway = {
    propose: async id => ({ id, status: 'PROPOSED' }),
    invitations: async () => [],
    revokeInvitation: async () => ({}),
    issueInvitation: async (id, body) => { calls.push(['issue', id, body]); return { invitationId: 'inv-1', status: 'ISSUED', invitationToken: 'T', replayed: false }; },
    lookupInvitationTargetByKsNumber: async () => target,
  };
  const controller = api.createInviteController(gateway, 'agr-1', 'https://app.example', () => {}, () => `key-${++n}`);
  return { calls, controller };
}
test('5. a Business KS Number is never invitable from the UI: the check ends in "not-a-person" and issue sends nothing', async () => {
  const { calls, controller } = inviteSetup({ ...PERSON, canonicalKsNumber: 'KS012', displayName: 'Keyman Oak', identityType: 'BUSINESS' });
  controller.open(); controller.setRole('SERVICE_PROVIDER'); controller.setKs('KS012'); await controller.checkKs();
  assert.equal(controller.getSnapshot().ksPreview.status, 'not-a-person');
  await controller.issue();
  assert.deepEqual(calls, [], 'no invitation is issued to a Business');
});
test('6. a person is still invitable exactly as before', async () => {
  const { calls, controller } = inviteSetup(PERSON);
  controller.open(); controller.setRole('SERVICE_PROVIDER'); controller.setKs('KS003'); await controller.checkKs();
  assert.equal(controller.getSnapshot().ksPreview.status, 'found');
  await controller.issue();
  assert.equal(calls.length, 1);
});
test('7. the invite panel explains the Business dead-end plainly and says nothing was sent', () => {
  const target = { ...PERSON, canonicalKsNumber: 'KS012', displayName: 'Keyman Oak', identityType: 'BUSINESS' };
  const snapshot = { phase: 'form', roleCode: 'SERVICE_PROVIDER', targetMode: 'KS_NUMBER', ksNumber: 'KS012', ksPreview: { status: 'not-a-person', checked: 'KS012', target }, contactChannel: 'SMS', contactDestination: '', request: null, issued: null, error: null, list: { status: 'ready', items: [] }, proposing: false, proposeError: null, revokingId: null, revokeError: null };
  const noop = () => {};
  const controller = { subscribe: () => noop, getSnapshot: () => snapshot, loadList: noop, open: noop, issue: noop, reset: noop, propose: noop, revoke: noop, setKs: noop, checkKs: noop, setRole: noop, setTargetMode: noop, setContactChannel: noop, setContactDestination: noop };
  const out = text(html(api.InvitePanel, { controller, agreementStatus: 'PROPOSED', isCreator: true }));
  assert.match(out, /is a Business\. Businesses can’t take part in agreements on SecurePay yet/);
  assert.match(out, /Nothing was sent\./);
});

// ------------------------------------------------------------------ 8. sign out everywhere
function accountGateway(logoutAll) {
  const unused = async () => { throw new Error('not used'); };
  return { circle: { me: unused }, logoutAll, subscription: { myStatus: unused }, changePassword: unused };
}
test('8. "sign out everywhere" ends this session too, and only after the backend confirmed it', async () => {
  let ended = 0;
  const ok = api.createAccountController(accountGateway(async () => {}), () => {}, () => { ended += 1; });
  await ok.signOutEverywhere();
  assert.equal(ended, 1); assert.equal(ok.getSnapshot().logoutAllDone, true);
  let endedOnFailure = 0;
  const failing = api.createAccountController(accountGateway(async () => { throw new Error('offline'); }), () => {}, () => { endedOnFailure += 1; });
  await failing.signOutEverywhere();
  assert.equal(endedOnFailure, 0, 'a failed request must not pretend the session ended');
  assert.ok(failing.getSnapshot().logoutAllError);
});
test('9. the app wires "sign out everywhere" to clear the session and says so', async () => {
  const src = strip(await readFile('src/features/agent/AgentExperience.tsx', 'utf8'));
  assert.match(src, /createAccountController\([\s\S]*?\(\) => \{ session\.clear\(\); setNotice\('You’ve been signed out everywhere, including here\.'\); \}/);
});

// ------------------------------------------------------------------ 10. sign-out privacy
test('10. when a session ends, the signed-in conversation is replaced by a fresh one (never resumable by the next visitor)', async () => {
  const src = strip(await readFile('src/features/agent/AgentExperience.tsx', 'utf8'));
  assert.match(src, /wasSignedInRef/);
  assert.match(src, /if \(wasSignedInRef\.current && !nowSignedIn\) startNewConversation\(\);/);
});

// ------------------------------------------------------------------ 11. focus handoff + Join self name
test('11. starting from Home hands focus to the composer, and the Join page loads who you are', async () => {
  const src = strip(await readFile('src/features/agent/AgentExperience.tsx', 'utf8'));
  assert.match(src, /setComposerFocusKey\(key => key \+ 1\); void controller\.send\(startText\)/);
  assert.match(src, /if \(onJoinPage && signedIn\) void businessController\.enter\(\);/);
  assert.match(strip(await readFile('src/features/conversation/ConversationSurface.tsx', 'utf8')), /requestAnimationFrame/);
});

// ------------------------------------------------------------------ 12. store trade handoff truth
test('12. the Store trade handoff names who you would agree with and never claims a Business KS identity', async () => {
  assert.doesNotMatch(await readFile('src/offerTradeSnapshot.ts', 'utf8'), /Business KS identity — authoritative/);
  const src = await readFile('src/components/OfferToTradeHandoff.tsx', 'utf8');
  for (const line of ['Who you would agree with', 'Nothing is agreed yet.', 'Talk it through with KS001']) assert.ok(src.includes(line), line);
  assert.doesNotMatch(src, /≠/);
});

// ------------------------------------------------------------------ 13. 44px floor
test('13. shared buttons, hero chips and the composer meet the 44px target floor', async () => {
  assert.match(await readFile('src/components/dna/Button.tsx', 'utf8'), /inline-flex min-h-11 items-center/);
  assert.match(await readFile('src/components/SignedOutHome.tsx', 'utf8'), /inline-flex min-h-11 items-center text-\[0\.8rem\]/);
  const surface = await readFile('src/features/conversation/ConversationSurface.tsx', 'utf8');
  assert.match(surface, /w-11 h-11/); assert.match(surface, /minHeight: '44px'/);
  assert.match(await readFile('src/components/ConversationInput.tsx', 'utf8'), /minHeight: '44px'/);
});

// ------------------------------------------------------------------ 14. no doctrine notation in shipped copy
test('14. the doctrine "≠" notation never reaches runtime (non-fixture) components', async () => {
  for (const file of ['src/features/circle/CircleExperience.tsx', 'src/features/plug/PlugExperience.tsx', 'src/components/OfferBuilderView.tsx', 'src/components/TradeHelpPanel.tsx', 'src/components/OfferDetail.tsx', 'src/components/CommunityObjectDetail.tsx']) {
    const visible = strip(await readFile(file, 'utf8'));
    assert.doesNotMatch(visible, /≠/, file);
  }
});
