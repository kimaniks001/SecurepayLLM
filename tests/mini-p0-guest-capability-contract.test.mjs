import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const SCRIPT = readFileSync(new URL('../public/embed/securepay-guest-agent.js', import.meta.url), 'utf8');
const CHAT_ID = '10000000-0000-4000-8000-000000000001';
const SECRET = 'A'.repeat(43);
const API = 'https://sandbox.securepay.ke';
const SITE = 'shortstays-ke-preview';
const route = '/api/v1/public/embed/installations/' + SITE;

function setup({ badCatalogue = false, noCatalogueRoute = false } = {}) {
  const requests = [];
  const memory = new Map();
  const window = {
    sessionStorage: {
      getItem(k) { return memory.get(k) ?? null; },
      setItem(k, v) { memory.set(k, v); },
      removeItem(k) { memory.delete(k); },
    },
    crypto: { randomUUID: () => '10000000-0000-4000-8000-000000000002' },
    AbortController,
    setTimeout, clearTimeout,
    fetch: async (url, options = {}) => {
      const u = new URL(url);
      requests.push({ url: u.pathname, ...options });
      const ok = data => ({ ok: true, status: 200, json: async () => data });
      if (u.pathname === route) return ok({
        schemaVersion: 'securepay-embed-guest-v3',
        siteId: SITE, guestChatAvailable: true,
        authenticatedOperationsAvailable: false,
        enabledOperations: { ask: true },
      });
      if (u.pathname === route + '/conversations') return ok({
        conversationId: CHAT_ID, conversationAccessSecret: SECRET,
        anonymousExpiresAt: '2099-01-01T00:00:00Z',
      });
      if (u.pathname === route + '/conversations/' + CHAT_ID + '/turns') return ok({
        message: 'KS001 can help prepare an agreement. What are the terms?',
      });
      if (u.pathname === route + '/conversations/' + CHAT_ID + '/capabilities') {
        if (noCatalogueRoute) return { ok: false, status: 404 };
        return ok(badCatalogue ? {
          authority: 'MAY_PAY', interactionMode: 'FORMATION',
          registryVersion: 'bad', capabilities: [],
        } : {
          authority: 'DESCRIPTIVE_ONLY_NO_ACTION_AUTHORITY',
          registryVersion: 'code-owned capability registry v3',
          interactionMode: 'FORMATION',
          capabilities: [{
            code: 'AGREEMENT_FORMATION',
            implementationState: 'IMPLEMENTED',
            exposure: 'INITIATE_EXPLICIT_USER_FLOW',
            actorEligibility: 'NOT_REQUIRED',
            humanBenefit: 'Shape the details of the agreement',
            limitations: [],
          }],
        });
      }
      throw new Error('Unexpected request: ' + u.pathname);
    },
  };
  runInNewContext(SCRIPT, { window, URL, AbortController, setTimeout, clearTimeout });
  return { agent: window.SecurePayGuestAgent.create({ siteId: SITE, apiBaseUrl: API }), requests };
}

test('P0 guest capability route requires a real current site-bound conversation', async () => {
  const { agent, requests } = setup();
  await agent.connect();
  await assert.rejects(agent.readCapabilities(), /authorised KS001 conversation/);
  await agent.send('I need an agreement', 'Africa/Nairobi');
  const data = await agent.readCapabilities();
  assert.deepEqual([...data.capabilities.map(x => x.code)], ['AGREEMENT_FORMATION']);
  assert.equal(data.capabilities[0].exposure, 'INITIATE_EXPLICIT_USER_FLOW');
  assert.equal(data.capabilities[0].benefit, 'Shape the details of the agreement');
  const call = requests.find(r => r.url.endsWith('/capabilities'));
  assert.equal(call.method, 'GET');
  assert.equal(call.headers['X-SecurePay-Conversation-Token'], SECRET);
  assert.equal(call.credentials, 'omit');
  assert.equal(call.cache, 'no-store');
});

test('P0 guest rejects forged financial authority and missing backend catalogue', async () => {
  for (const variant of [{ badCatalogue: true }, { noCatalogueRoute: true }]) {
    const { agent } = setup(variant);
    await agent.connect();
    await agent.send('I need an agreement');
    await assert.rejects(agent.readCapabilities());
  }
});

test('P0 Shortstays remains a SecurePay-origin staging-only iframe', () => {
  const html = readFileSync(new URL('../public/embed/shortstays-mini.html', import.meta.url), 'utf8');
  assert.match(html, /capabilityCatalogueEnabled:true/);
  assert.match(html, /APPROVED_PARENTS/);
  assert.match(html, /SecurePayGuestAgent/);
  assert.match(html, /assistant\.prefill\(value\)/);
  assert.doesNotMatch(html, /localStorage/);
});
