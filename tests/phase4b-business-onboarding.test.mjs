import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';

// Phase 4B (ADR-0022, UR-219) -- customer Business onboarding and "acting as", against the REAL controller,
// gateway and BusinessExperience. The backend decides authority; these tests prove the client never
// manufactures it, never keeps it from memory, and never offers Business or Organization Join.
const bundle = await build({ stdin: { contents: `
export { createBusinessController, createErrorText, NOT_CONFIRMED, BUSINESS_NAME_MAX } from './src/features/business/controller';
export { BusinessExperience } from './src/features/business/BusinessExperience';
export { AccountExperience } from './src/features/account/AccountExperience';
export { createAccountController } from './src/features/account/controller';
export { createBusinessGateway } from './src/api/securepay/business';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl' } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const html = (component, props) => api.renderToStaticMarkup(api.createElement(component, props));
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ');
const strip = s => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const noop = () => {};

const OAK = { businessKsNumber: 'KS000000501', displayName: 'Keyman Oak', identityType: 'BUSINESS', relationship: 'ADMINISTRATOR', canActFor: true, since: '2026-09-27T09:00:00Z' };
const KAMAU = { ...OAK, businessKsNumber: 'KS000000502', displayName: 'Kamau Hardware' };
const org = ks => ({ organizationId: `org-${ks}`, businessKsNumber: ks, activatedAt: '2026-09-27T09:00:00Z' });
const httpError = (status, kind = 'http') => new api.ApiError(kind, `status ${status}`, status, `E${status}`);

function setup({ mine = [], representation, create } = {}) {
  const calls = [];
  let listed = mine;
  const gateway = {
    business: {
      mine: async () => { calls.push(['mine']); return listed; },
      representation: representation ?? (async ks => { calls.push(['representation', ks]); const hit = listed.find(b => b.businessKsNumber === ks); if (!hit) throw httpError(404); return hit; }),
      create: create ?? (async (name, key) => { calls.push(['create', name, key]); const made = { ...OAK, businessKsNumber: 'KS000000777', displayName: name }; listed = [...listed, made]; return made; }),
      get: async ks => { calls.push(['get', ks]); return org(ks); },
      members: async ks => { calls.push(['members', ks]); return [{ identityId: 'id-founder', status: 'ACTIVE' }]; },
      inviteMember: async () => {},
      removeMember: async () => {},
    },
    circle: { me: async () => ({ canonicalKsNumber: 'KS000000100', displayName: 'James Kimani' }) },
  };
  let n = 0;
  const controller = api.createBusinessController(gateway, () => `key-${++n}`);
  return { controller, calls, setListed: next => { listed = next; } };
}

// ------------------------------------------------------------------ 1. doorway with no Business
test('1. a person with no Business sees one Create a Business doorway and is acting as themself', async () => {
  const { controller } = setup();
  await controller.enter();
  const page = text(html(api.BusinessExperience, { controller, onNavigate: noop }));
  assert.match(page, /You are acting as/);
  assert.match(page, /James Kimani/);
  assert.match(page, /Acting as yourself — James Kimani/);
  assert.match(page, /You don’t act for any Business yet\./);
  assert.equal((page.match(/Create Business/g) ?? []).length, 1, 'exactly one create action');
  assert.match(page, /doesn’t verify it, open a bank account or enable payments/);
});

// ------------------------------------------------------------------ 2 + 3. real creation, list from backend
test('2/3. creation goes through the real API call with a stable key, and the new Business appears from the backend list', async () => {
  const { controller, calls } = setup();
  await controller.enter();
  controller.setCreateName('  Keyman   Oak ');
  await controller.createBusiness();
  const create = calls.find(c => c[0] === 'create');
  assert.deepEqual(create, ['create', 'Keyman Oak', 'key-1']);
  assert.deepEqual(calls.slice(calls.indexOf(create) + 1).map(c => c[0]), ['mine'], 'the list is re-read from the backend after creation, and nothing else is inferred')
  const state = controller.getSnapshot();
  assert.deepEqual(state.businesses.data.map(b => b.displayName), ['Keyman Oak']);
  assert.equal(state.acting.kind, 'self', 'creating never silently switches capacity');
  const page = text(html(api.BusinessExperience, { controller, onNavigate: noop }));
  assert.match(page, /Keyman Oak is ready — Business KS Number KS000000777 ?\. You can act for this Business\./);
  assert.match(page, /Act as Keyman Oak/);
});

test('an invalid name never reaches the API', async () => {
  const { controller, calls } = setup();
  controller.setCreateName(' K ');
  await controller.createBusiness();
  controller.setCreateName('x'.repeat(api.BUSINESS_NAME_MAX + 1));
  await controller.createBusiness();
  assert.equal(calls.filter(c => c[0] === 'create').length, 0);
  assert.match(controller.getSnapshot().create.error, /2 to 80 characters/);
});

// ------------------------------------------------------------------ 4. personal vs Business capacity
test('4. acting for a Business is shown clearly and semantically, with a way back to yourself', async () => {
  const { controller, calls } = setup({ mine: [OAK, KAMAU] });
  await controller.enter();
  await controller.actAsBusiness(OAK.businessKsNumber);
  assert.deepEqual(calls.filter(c => c[0] === 'representation'), [['representation', OAK.businessKsNumber]], 'the backend re-confirms before switching');
  const markup = html(api.BusinessExperience, { controller, onNavigate: noop });
  const page = text(markup);
  assert.match(page, /Acting as Keyman Oak/);
  assert.match(page, /You can act for this Business\. You’re its administrator\./);
  assert.match(page, /Business KS Number · KS000000501/);
  assert.match(page, /Switch back to yourself/);
  assert.match(page, /can’t move money or join The Trust Project yet/);
  assert.match(markup, /<fieldset[^>]*><legend[^>]*>You are acting as<\/legend>/);
  assert.match(markup, /role="status" aria-live="polite"[^>]*>Acting as Keyman Oak</);
  assert.equal((markup.match(/type="radio"/g) ?? []).length, 3, 'yourself + two Businesses');
  assert.equal((markup.match(/type="radio"[^>]*checked=""/g) ?? []).length, 1);

  controller.actAsSelf();
  assert.equal(controller.getSnapshot().acting.kind, 'self');
  assert.equal(controller.getSnapshot().organization.status, 'idle', 'nothing of the Business stays loaded');
});

// ------------------------------------------------------------------ 5. unauthorised Business cannot be selected
test('5. a Business the backend did not list, or refuses to confirm, can never become the acting capacity', async () => {
  const { controller, calls, setListed } = setup({ mine: [OAK] });
  await controller.enter();

  await controller.actAsBusiness('KS000000999'); // typed/tampered, never listed
  assert.equal(controller.getSnapshot().acting.kind, 'self');
  assert.equal(controller.getSnapshot().switchError, api.NOT_CONFIRMED);
  assert.equal(calls.filter(c => c[0] === 'representation').length, 0, 'an unlisted Business is never even asked about');

  setListed([]); // authority removed on the server after the list was read
  await controller.actAsBusiness(OAK.businessKsNumber);
  assert.equal(controller.getSnapshot().acting.kind, 'self');
  assert.equal(controller.getSnapshot().switchError, api.NOT_CONFIRMED);
  assert.deepEqual(controller.getSnapshot().businesses.data, [], 'the list is re-read and the stale entry disappears');
  assert.equal(calls.filter(c => c[0] === 'get').length, 0, 'no Business data is read without confirmation');
});

test('a refused confirmation (403, network) also leaves you as yourself', async () => {
  for (const failure of [httpError(403), httpError(0, 'network')]) {
    const { controller } = setup({ mine: [OAK], representation: async () => { throw failure; } });
    await controller.enter();
    await controller.actAsBusiness(OAK.businessKsNumber);
    assert.equal(controller.getSnapshot().acting.kind, 'self');
  }
});

test('a confirmation for a different Business than asked is never accepted', async () => {
  const { controller } = setup({ mine: [OAK], representation: async () => KAMAU });
  await controller.enter();
  await controller.actAsBusiness(OAK.businessKsNumber);
  assert.equal(controller.getSnapshot().acting.kind, 'self');
});

test('when the backend stops listing the current Business, the capacity drops back to yourself', async () => {
  const { controller, setListed } = setup({ mine: [OAK] });
  await controller.enter();
  await controller.actAsBusiness(OAK.businessKsNumber);
  assert.equal(controller.getSnapshot().acting.kind, 'business');
  setListed([]);
  await controller.loadMine();
  assert.equal(controller.getSnapshot().acting.kind, 'self');
});

// ------------------------------------------------------------------ 6. refresh reconstructs from backend truth
test('6. a fresh app (refresh) starts as yourself and rebuilds the Businesses from the backend only', async () => {
  const first = setup({ mine: [OAK] });
  await first.controller.enter();
  await first.controller.actAsBusiness(OAK.businessKsNumber);
  const fresh = setup({ mine: [OAK] });
  assert.equal(fresh.controller.getSnapshot().acting.kind, 'self');
  assert.equal(fresh.controller.getSnapshot().businesses.data, null, 'nothing is remembered locally');
  await fresh.controller.enter();
  assert.deepEqual(fresh.controller.getSnapshot().businesses.data, [OAK]);
  for (const file of ['src/features/business/controller.ts', 'src/features/business/BusinessExperience.tsx', 'src/api/securepay/business/index.ts']) {
    assert.doesNotMatch(strip(await readFile(file, 'utf8')), /localStorage|sessionStorage|indexedDB|location\.(hash|href|search)|URLSearchParams/, file);
  }
});

test('sign-out resets Businesses and capacity so nothing carries over to the next person', async () => {
  const { controller } = setup({ mine: [OAK] });
  await controller.enter();
  await controller.actAsBusiness(OAK.businessKsNumber);
  controller.reset();
  const state = controller.getSnapshot();
  assert.equal(state.acting.kind, 'self');
  assert.equal(state.businesses.data, null);
  assert.equal(state.self.data, null);
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /if \(sessionState\.status !== 'signed-in'\) \{ setOwnKsNumber\(null\); businessController\.reset\(\); return; \}/);
});

// ------------------------------------------------------------------ 7 + 8. no Business / Organization Join
test('7/8. no Business Trust Project Join and no Organization capacity or Join anywhere in the Business area', async () => {
  const { controller } = setup({ mine: [OAK] });
  await controller.enter();
  await controller.actAsBusiness(OAK.businessKsNumber);
  const markup = html(api.BusinessExperience, { controller, onNavigate: noop });
  const page = text(markup);
  // The only mention of The Trust Project is the honest "can't ... join The Trust Project yet".
  assert.match(page, /can’t move money or join The Trust Project yet/);
  for (const control of markup.match(/<(button|a)\b[^>]*>[\s\S]*?<\/\1>/g) ?? []) assert.doesNotMatch(text(control), /join|trust project/i, control);
  assert.doesNotMatch(page, /Organization KS|Act as .*Organization|Create an Organization/i);
  for (const file of ['src/features/business/controller.ts', 'src/features/business/BusinessExperience.tsx', 'src/api/securepay/business/index.ts']) {
    const src = strip(await readFile(file, 'utf8'));
    assert.doesNotMatch(src, /trust-project|community\/membership|membership\/join|TRUST_PROJECT|ORGANIZATION'|identityType: 'ORGANIZATION'/, file);
  }
  const dto = await readFile('src/api/securepay/business/index.ts', 'utf8');
  assert.match(dto, /identityType: 'BUSINESS';/);
});

// ------------------------------------------------------------------ 9. individual Join unchanged
test('9. Phase 4A individual Join files are untouched by Phase 4B', () => {
  const changed = execFileSync('git', ['diff', '--name-only', '85fc228434ea1ef6ea654395f63bc70bc4465e5d', '--', 'src/features/join', 'src/features/community', 'src/api/securepay/community', 'src/features/public/signInFlow.ts'], { encoding: 'utf8' }).trim();
  assert.equal(changed, '');
});

// ------------------------------------------------------------------ 10. failures never pretend success
test('10. 400/401/403/409 and uncertain failures each say what happened and never claim a Business exists', async () => {
  assert.match(api.createErrorText(httpError(400)), /name of 2 to 80 characters/);
  assert.match(api.createErrorText(httpError(401)), /session has ended/);
  assert.match(api.createErrorText(httpError(403)), /Only a personal KS Number can create a Business/);
  assert.match(api.createErrorText(httpError(409)), /already used for a different name/);
  assert.match(api.createErrorText(httpError(500)), /Trying again is safe and never creates a second Business/);
  assert.match(api.createErrorText(httpError(0, 'network')), /Trying again is safe/);
  assert.match(api.createErrorText(new Error('x')), /No Business was created\./);

  for (const status of [400, 401, 403, 409]) {
    const { controller } = setup({ create: async () => { throw httpError(status); } });
    controller.setCreateName('Keyman Oak');
    await controller.createBusiness();
    const state = controller.getSnapshot();
    assert.equal(state.create.created, null, `status ${status}`);
    assert.ok(state.create.error, `status ${status}`);
    const markup = html(api.BusinessExperience, { controller, onNavigate: noop });
    assert.match(markup, /role="alert"/);
    assert.match(markup, /aria-invalid="true" aria-describedby="[^"]+-error"/);
    assert.doesNotMatch(text(markup), /is ready/);
  }
});

test('an uncertain failure keeps the same key so a retry can never create twice; a definitive one does not', async () => {
  const keys = [];
  let fail = true;
  const { controller } = setup({ create: async (name, key) => { keys.push(key); if (fail) throw httpError(503); return { ...OAK, displayName: name }; } });
  controller.setCreateName('Keyman Oak');
  await controller.createBusiness();
  fail = false;
  await controller.createBusiness();
  assert.deepEqual(keys, ['key-1', 'key-1']);

  const definitive = [];
  const second = setup({ create: async (name, key) => { definitive.push(key); throw httpError(409); } });
  second.controller.setCreateName('Keyman Oak');
  await second.controller.createBusiness();
  await second.controller.createBusiness();
  assert.deepEqual(definitive, ['key-1', 'key-2']);

  const renamed = [];
  const third = setup({ create: async (name, key) => { renamed.push(key); throw httpError(0, 'timeout'); } });
  third.controller.setCreateName('First Name');
  await third.controller.createBusiness();
  third.controller.setCreateName('Second Name');
  await third.controller.createBusiness();
  assert.deepEqual(renamed, ['key-1', 'key-2'], 'a different name is a different request');
});

// ------------------------------------------------------------------ UR-227 live finding
test('the Business area never presents the Organization-scoped permission summary as the Business\'s authority', async () => {
  const { controller, calls } = setup({ mine: [OAK] });
  await controller.enter();
  await controller.actAsBusiness(OAK.businessKsNumber);
  // The live engine counts personal (org-less) roles inside the Organization, so that list would show personal
  // Agreement permissions as if they were the Business's. Only the confirmed relationship is stated.
  const page = text(html(api.BusinessExperience, { controller, onNavigate: noop }));
  assert.doesNotMatch(page, /What you can do here|agreement create|organization read/i);
  assert.match(page, /You can act for this Business\. You’re its administrator\./);
  assert.deepEqual([...new Set(calls.map(c => c[0]))].sort(), ['get', 'members', 'mine', 'representation']);
  for (const file of ['src/features/business/controller.ts', 'src/features/business/BusinessExperience.tsx']) {
    assert.doesNotMatch(strip(await readFile(file, 'utf8')), /authoritySummary|state\.authority/, file);
  }
});

// ------------------------------------------------------------------ gateway contract
test('the gateway sends only a name and the Idempotency-Key, and never nominates a type, role or organization', async () => {
  const requests = [];
  const gateway = api.createBusinessGateway({ request: async (path, options) => { requests.push([path, options]); return {}; } });
  await gateway.create('Keyman Oak', 'k-1');
  await gateway.mine();
  await gateway.representation('KS000000501');
  assert.deepEqual(requests[0], ['/api/v1/business', { method: 'POST', body: { displayName: 'Keyman Oak' }, auth: 'required', headers: { 'Idempotency-Key': 'k-1' } }]);
  assert.deepEqual(requests[1], ['/api/v1/business/mine', { auth: 'required' }]);
  assert.deepEqual(requests[2], ['/api/v1/business/KS000000501/representation', { auth: 'required' }]);
});

// ------------------------------------------------------------------ Account doorway + layout safety
test('Account offers one quiet doorway to the Business area and no typed Business KS lookup', async () => {
  const src = strip(await readFile('src/features/account/AccountExperience.tsx', 'utf8'));
  assert.match(src, />Your Businesses</);
  assert.match(src, /onClick=\{\(\) => onNavigate\('business'\)\}[^>]*>[\s\S]{0,120}Open your Businesses/);
  assert.doesNotMatch(src, /Business KS Number|checkBusiness|>Check</);
  assert.equal((src.match(/Create a Business/g) ?? []).length, 1, 'Account mentions creation once and does not duplicate the action');
  assert.doesNotMatch(src, /createBusiness\(/, 'the one creation action lives in the Business area');
});

test('long Business names and KS Numbers wrap instead of overflowing, and every control is at least 44px', async () => {
  const long = { ...OAK, displayName: 'The Extraordinarily Long Named Cooperative Timber And Hardware Supplies Of Nyeri Ltd' };
  const { controller } = setup({ mine: [long] });
  await controller.enter();
  await controller.actAsBusiness(long.businessKsNumber);
  const markup = html(api.BusinessExperience, { controller, onNavigate: noop });
  assert.match(markup, /class="block text-\[0\.85rem\] text-forest-800 break-words">The Extraordinarily Long/);
  assert.match(markup, /break-all">Business · KS000000501/);
  for (const control of markup.match(/<(button|label class="flex)[^>]*>/g) ?? []) assert.match(control, /min-h-11|h-11 w-11/, control);
  for (const input of markup.match(/<input(?![^>]*type="radio")[^>]*>/g) ?? []) assert.match(input, /min-h-11/, input);
});
