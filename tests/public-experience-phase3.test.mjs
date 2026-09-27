import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

// Public Experience Convergence Phase 3 -- secure anonymous continuity (Slice 3A) and universal source
// intake (Slice 3B), proven against the real gateway, the real HTTP client and the real continuity store.
const bundle = await build({ stdin: { contents: `
export * from './src/api/securepay/agent/continuity';
export { createAgentGateway } from './src/api/securepay/agent';
export { createHttpClient, ApiError } from './src/api/securepay/http';
export { createSourceController, sourceIngestionErrorText } from './src/features/sources/controller';
export { declaredSourceProblem, sourceKindNote, sourceStatusText } from './src/features/sources/presentation';
export { handoffView } from './src/api/securepay/agent/adapters';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const CONVERSATION = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b';
const OTHER = '11111111-2222-4333-8444-555555555555';
const SECRET = 'q'.repeat(43);
const FUTURE = '2999-01-01T00:00:00Z';

/** A Storage double: what a real tab's sessionStorage does, per instance. */
function memoryStorage() {
  const map = new Map();
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    keys: () => [...map.keys()],
    raw: key => map.get(key),
  };
}

function harness({ respond } = {}) {
  const storage = memoryStorage();
  const store = api.createConversationAccessStore(storage);
  const requests = [];
  const fetcher = async (url, init) => {
    requests.push({ url, method: init.method, headers: Object.fromEntries(init.headers.entries()) });
    const reply = respond?.(url, init) ?? { status: 200, body: {} };
    return new Response(reply.body === undefined ? '' : JSON.stringify(reply.body), { status: reply.status });
  };
  const http = api.createHttpClient('https://api.example', () => null, fetcher);
  return { storage, store, requests, gateway: api.createAgentGateway(http, store) };
}

const created = () => ({ status: 201, body: { conversationId: CONVERSATION, createdAt: '2026-09-27T09:00:00Z', contextVersion: 0, conversationAccessSecret: SECRET, anonymousExpiresAt: FUTURE } });

// ------------------------------------------------------------------ continuity store
test('the continuity record lives under ONE versioned sessionStorage key and survives a same-tab reload', () => {
  const storage = memoryStorage();
  api.createConversationAccessStore(storage).remember({ conversationId: CONVERSATION, secret: SECRET, anonymousExpiresAt: FUTURE });
  assert.deepEqual(storage.keys(), ['securepay.agent.anonymous.v1']);
  assert.equal(api.ANONYMOUS_CONVERSATION_KEY, 'securepay.agent.anonymous.v1');
  // "Reload": a brand-new store over the SAME tab storage finds it again.
  assert.deepEqual(api.createConversationAccessStore(storage).current(), { conversationId: CONVERSATION, secret: SECRET, anonymousExpiresAt: FUTURE });
});

test('a new tab (its own sessionStorage) has no access at all', () => {
  const tabA = memoryStorage();
  api.createConversationAccessStore(tabA).remember({ conversationId: CONVERSATION, secret: SECRET, anonymousExpiresAt: FUTURE });
  assert.equal(api.createConversationAccessStore(memoryStorage()).current(), null);
});

test('an expired, malformed or tampered record is discarded, never trusted', () => {
  const storage = memoryStorage();
  const store = api.createConversationAccessStore(storage, () => Date.parse('2026-09-27T10:00:00Z'));
  storage.setItem(api.ANONYMOUS_CONVERSATION_KEY, JSON.stringify({ conversationId: CONVERSATION, secret: SECRET, anonymousExpiresAt: '2026-09-27T09:59:59Z' }));
  assert.equal(store.current(), null);
  assert.equal(storage.raw(api.ANONYMOUS_CONVERSATION_KEY), undefined, 'expired record removed');
  for (const bad of ['not json', JSON.stringify({ conversationId: '../x', secret: SECRET, anonymousExpiresAt: FUTURE }), JSON.stringify({ conversationId: CONVERSATION, secret: 'short', anonymousExpiresAt: FUTURE })]) {
    storage.setItem(api.ANONYMOUS_CONVERSATION_KEY, bad);
    assert.equal(store.current(), null, bad);
  }
});

test('without sessionStorage the record lives in memory for this page only', () => {
  const store = api.createConversationAccessStore(null);
  store.remember({ conversationId: CONVERSATION, secret: SECRET, anonymousExpiresAt: FUTURE });
  assert.equal(store.current()?.conversationId, CONVERSATION);
  assert.equal(api.createConversationAccessStore(null).current(), null);
});

test('forget(id) clears only that conversation\'s record', () => {
  const store = api.createConversationAccessStore(memoryStorage());
  store.remember({ conversationId: CONVERSATION, secret: SECRET, anonymousExpiresAt: FUTURE });
  store.forget(OTHER);
  assert.equal(store.current()?.conversationId, CONVERSATION);
  store.forget(CONVERSATION);
  assert.equal(store.current(), null);
});

// ------------------------------------------------------------------ gateway
test('create keeps the secret out of the returned conversation and remembers it for this tab only', async () => {
  const { gateway, store, requests } = harness({ respond: created });
  const conversation = await gateway.createConversation();
  assert.deepEqual(Object.keys(conversation).sort(), ['contextVersion', 'conversationId', 'createdAt']);
  assert.equal(JSON.stringify(conversation).includes(SECRET), false);
  assert.equal(store.current()?.secret, SECRET);
  assert.equal(requests[0].headers.authorization, undefined, 'create never sends a session token');
  assert.equal(gateway.resumableConversationId(), CONVERSATION);
});

test('the token travels only in the header, only to its own conversation and its handoffs, never in a URL', async () => {
  const { gateway, requests } = harness({ respond: url => (url.endsWith('/api/agent/conversations') ? created() : { status: 200, body: { sources: [] } }) });
  await gateway.createConversation();
  await gateway.readContext(CONVERSATION);
  await gateway.listSources(CONVERSATION);
  await gateway.readContext(OTHER);
  await gateway.readHandoff('h-1');
  await gateway.listSavedBuilds().catch(() => {});
  const byUrl = Object.fromEntries(requests.map(r => [r.url, r.headers['x-securepay-conversation-token']]));
  assert.equal(byUrl[`https://api.example/api/agent/conversations/${CONVERSATION}/context`], SECRET);
  assert.equal(byUrl[`https://api.example/api/agent/conversations/${CONVERSATION}/sources`], SECRET);
  assert.equal(byUrl[`https://api.example/api/agent/conversations/${OTHER}/context`], undefined, 'never sent to another conversation');
  assert.equal(byUrl['https://api.example/api/agent/agreement-handoffs/h-1'], SECRET);
  for (const request of requests) assert.equal(request.url.includes(SECRET), false, request.url);
});

test('the server\'s non-leaking 404 forgets the record; other errors keep it', async () => {
  let status = 503;
  const { gateway, store } = harness({ respond: url => (url.endsWith('/api/agent/conversations') ? created() : { status, body: { code: status === 404 ? 'AGENT_CONVERSATION_NOT_FOUND' : 'X', message: 'm' } }) });
  await gateway.createConversation();
  await assert.rejects(gateway.readContext(CONVERSATION));
  assert.equal(store.current()?.conversationId, CONVERSATION, 'an outage never loses continuity');
  status = 404;
  await assert.rejects(gateway.readContext(CONVERSATION));
  assert.equal(store.current(), null);
});

test('a claim (save, or adopting a handoff) forgets the record: the server retired the token', async () => {
  for (const claim of ['save', 'adopt']) {
    const { gateway, store } = harness({ respond: url => (url.endsWith('/api/agent/conversations') ? created() : { status: 200, body: { conversationId: CONVERSATION, savedBuildId: 's1', handoffId: 'h1' } }) });
    const client = api.createAgentGateway(api.createHttpClient('https://api.example', () => 'session-token', async (url) => new Response(JSON.stringify(url.endsWith('/api/agent/conversations') ? created().body : { conversationId: CONVERSATION, savedBuildId: 's1', handoffId: 'h1' }), { status: 200 })), store);
    await gateway.createConversation();
    if (claim === 'save') await client.saveBuild(CONVERSATION); else await client.adoptHandoff('h1');
    assert.equal(store.current(), null, claim);
  }
});

test('"Start new conversation" can deliberately leave the previous anonymous conversation behind', async () => {
  const { gateway, store } = harness({ respond: created });
  await gateway.createConversation();
  gateway.forgetResumableConversation();
  assert.equal(store.current(), null);
});

// ------------------------------------------------------------------ Link / Place
test('link and place are sent as declared text to their own endpoints, with the token', async () => {
  const { gateway, requests } = harness({ respond: url => (url.endsWith('/api/agent/conversations') ? created() : { status: 201, body: {} }) });
  await gateway.createConversation();
  await gateway.createLinkSource(CONVERSATION, { url: 'https://supplier.example/q', label: 'Quote' });
  await gateway.createPlaceSource(CONVERSATION, { text: 'Westlands, Nairobi' });
  assert.match(requests[1].url, /\/sources\/link$/);
  assert.match(requests[2].url, /\/sources\/place$/);
  assert.equal(requests[1].headers['x-securepay-conversation-token'], SECRET);
});

test('the source controller adds a link and a place into the SAME conversation and refreshes it', async () => {
  const calls = [];
  let ingested = 0;
  const artifact = kind => ({ sourceArtifactId: `s-${kind}`, conversationId: CONVERSATION, sourceKind: kind, originalName: '', label: '', mediaType: 'text/plain', byteSize: 10, documentType: '', extractionStatus: 'RECEIVED', extractionGeneration: 0, summary: '', uncertainties: [], failureReason: '', createdAt: 'x', updatedAt: 'x', declaredText: kind === 'LINK' ? 'https://a.example' : 'Kisumu' });
  const controller = api.createSourceController({
    createLinkSource: async (id, body) => { calls.push(['link', id, body]); return artifact('LINK'); },
    createPlaceSource: async (id, body) => { calls.push(['place', id, body]); return artifact('PLACE'); },
    createPastedTextSource: async () => artifact('PASTED_TEXT'), uploadSource: async () => artifact('DOCUMENT'),
    listSources: async () => ({ sources: [] }), getSource: async () => artifact('LINK'), retrySource: async () => artifact('LINK'), removeSource: async () => artifact('LINK'),
  }, async () => CONVERSATION, { onSourceIngested: () => { ingested++; } });
  const link = await controller.addLink('  https://a.example  ', ' Price list ');
  const place = await controller.addPlace(' Kisumu ');
  assert.equal(link.ok && link.source.declaredText, 'https://a.example');
  assert.equal(place.ok && place.source.sourceKind, 'PLACE');
  assert.deepEqual(calls, [['link', CONVERSATION, { url: 'https://a.example', label: 'Price list' }], ['place', CONVERSATION, { text: 'Kisumu' }]]);
  assert.equal(ingested, 2);
  assert.equal(controller.getSnapshot().sources.length, 2);
});

test('limits and unavailable kinds are said plainly', () => {
  assert.match(api.sourceIngestionErrorText(new api.ApiError('http', 'Too many requests', 429, 'RATE_LIMIT_EXCEEDED')), /short pause/);
  assert.match(api.sourceIngestionErrorText(new api.ApiError('http', 'x', 422, 'AGENT_SOURCE_CAPABILITY_UNAVAILABLE')), /isn.t available yet/);
  assert.match(api.sourceIngestionErrorText(new api.ApiError('http', 'x', 404, 'AGENT_CONVERSATION_NOT_FOUND')), /no longer available here/);
  assert.equal(api.sourceIngestionErrorText(new api.ApiError('http', 'x', 503)),
    'SecurePay received this, but couldn’t read it right now. Nothing from it has been added to this conversation.');
});

test('the declared-text hints mirror the server rules without replacing them', () => {
  assert.equal(api.declaredSourceProblem('link', 'https://ok.example/x'), null);
  assert.match(api.declaredSourceProblem('link', 'javascript:alert(1)'), /http:\/\/ or https:\/\//);
  assert.match(api.declaredSourceProblem('link', 'www.example.com'), /http/);
  assert.equal(api.declaredSourceProblem('place', 'Westlands'), null);
  assert.equal(api.declaredSourceProblem('place', ''), null);
});

// ------------------------------------------------------------------ source-level boundaries
test('SourceMenu offers every Phase 3 kind once, with Voice note only behind an explicit handler', async () => {
  const menu = await readFile('src/features/sources/ui/SourceMenu.tsx', 'utf8');
  for (const label of ['Paste a plan', 'Document', 'Spreadsheet', 'Photo', 'Camera', 'Link', 'Place', 'Voice note']) {
    assert.match(menu, new RegExp(`label: '${label}'`), label);
  }
  assert.match(menu, /if \(actions\.onPickVoiceNote\) items\.push/);
  const app = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.doesNotMatch(app, /onPickVoiceNote/, 'nothing wires Voice note: no approved transcription provider exists');
  assert.equal((app.match(/<SourceMenu\b/g) ?? []).length, 1, 'the conversation composer uses the shared menu');
  const hero = await readFile('src/components/SignedOutHome.tsx', 'utf8');
  assert.equal((hero.match(/<SourceMenu\b/g) ?? []).length, 1, 'both Homes use the shared menu through SecurePayHero');
});

test('no location, fetch or speaker capability exists anywhere in the intake UI', async () => {
  for (const file of ['src/features/sources/ui/SourceMenu.tsx', 'src/features/sources/ui/DeclaredSourcePanel.tsx', 'src/features/sources/ui/SourceCard.tsx', 'src/features/sources/controller.ts', 'src/features/sources/presentation.ts']) {
    const src = await readFile(file, 'utf8');
    assert.doesNotMatch(src, /navigator\.geolocation|getCurrentPosition|latitude|longitude|exif/i, file);
    assert.doesNotMatch(src, /fetch\(|new URL\(|<a\s|href=/, file);
    assert.doesNotMatch(src, /speaker|diariz/i, file);
  }
});

test('the conversation token is never put in localStorage, a URL or a query string', async () => {
  const continuity = await readFile('src/api/securepay/agent/continuity.ts', 'utf8');
  assert.doesNotMatch(continuity, /localStorage|location\.|history\.|URLSearchParams|document\.cookie/);
  const gateway = await readFile('src/api/securepay/agent/index.ts', 'utf8');
  assert.doesNotMatch(gateway, /\?token=|conversationAccessSecret\}|secret=/);
  assert.match(gateway, /\[CONVERSATION_TOKEN_HEADER\]: record\.secret/);
});

test('Phase 3 introduces no Phase 4 surface: no Join route, no invitation links, no referral', async () => {
  for (const file of ['src/features/sources/ui/SourceMenu.tsx', 'src/features/sources/ui/DeclaredSourcePanel.tsx', 'src/api/securepay/agent/continuity.ts', 'src/api/securepay/agent/index.ts', 'src/components/SignedOutHome.tsx', 'src/features/public/PublicHome.tsx']) {
    const src = await readFile(file, 'utf8');
    assert.doesNotMatch(src, /#\/join|membership\/join|invite-link|referral/i, file);
  }
});

// ------------------------------------------------------------------ Phase 3 final hardening: secret lifecycle
const handoffBody = (claimed, status) => ({ handoffId: 'h-1', conversationId: CONVERSATION, status, agreementCandidateSummary: { title: 'Tiling', description: '', amountMinor: null, currency: null, participants: [], responsibilities: [], conditions: [] }, reviewedSource: null, mustResolve: [], stillToDecide: [], guidanceNotes: [], tradeContextVersion: 3, candidateDigest: 'd', expiresAt: FUTURE, progressedAgreementId: null, ...(claimed === undefined ? {} : { conversationClaimed: claimed }) });

function lifecycle(handoffReply) {
  const storage = memoryStorage();
  const store = api.createConversationAccessStore(storage);
  const requests = [];
  const http = api.createHttpClient('https://api.example', () => null, async (url, init) => {
    requests.push({ url, headers: Object.fromEntries(init.headers.entries()) });
    const reply = url.endsWith('/api/agent/conversations') ? created() : handoffReply(url);
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  });
  return { storage, store, requests, gateway: api.createAgentGateway(http, store) };
}

test('signed-out createHandoff never claims, so the anonymous record is kept (and a reload still resumes)', async () => {
  const { gateway, store, storage } = lifecycle(() => ({ status: 201, body: handoffBody(false, 'IDENTITY_REQUIRED') }));
  await gateway.createConversation();
  await gateway.createHandoff(CONVERSATION, 'continue-1');
  assert.equal(store.current()?.conversationId, CONVERSATION);
  // Same-tab reload: a fresh store over the same tab storage still finds it.
  assert.equal(api.createConversationAccessStore(storage).current()?.conversationId, CONVERSATION);
});

test('an older server that omits the claim signal is treated as NOT claimed (the token is kept)', async () => {
  const { gateway, store } = lifecycle(() => ({ status: 201, body: handoffBody(undefined, 'READY_FOR_REVIEW') }));
  await gateway.createConversation();
  await gateway.createHandoff(CONVERSATION);
  assert.equal(store.current()?.conversationId, CONVERSATION, 'never guessed from status or local session state');
});

test('a signed-in createHandoff that the server reports as claimed drops the secret immediately', async () => {
  const { gateway, store, storage } = lifecycle(() => ({ status: 201, body: handoffBody(true, 'READY_FOR_REVIEW') }));
  await gateway.createConversation();
  await gateway.createHandoff(CONVERSATION, 'continue-2');
  assert.equal(store.current(), null);
  assert.equal(storage.raw(api.ANONYMOUS_CONVERSATION_KEY), undefined, 'no plaintext left in sessionStorage');
  // A reload now has nothing to resume from the retired secret -- the owner continues via their session.
  assert.equal(gateway.resumableConversationId(), null);
});

test('a failed createHandoff keeps the record: an attempt alone never clears it', async () => {
  for (const status of [404, 500, 409]) {
    const { gateway, store } = lifecycle(() => ({ status, body: { code: status === 404 ? 'OTHER_NOT_FOUND' : 'X', message: 'm' } }));
    await gateway.createConversation();
    await assert.rejects(gateway.createHandoff(CONVERSATION));
    assert.equal(store.current()?.conversationId, CONVERSATION, String(status));
  }
});

test('save and explicit adopt still clear the record after success, and only after success', async () => {
  for (const claim of ['save', 'adopt']) {
    let ok = false;
    const { store } = lifecycle(() => ({ status: 200, body: {} }));
    const http = api.createHttpClient('https://api.example', () => 'session', async (url) => {
      if (url.endsWith('/api/agent/conversations')) return new Response(JSON.stringify(created().body), { status: 201 });
      return ok ? new Response(JSON.stringify({ conversationId: CONVERSATION, savedBuildId: 's', handoffId: 'h-1' }), { status: 200 })
        : new Response(JSON.stringify({ code: 'X', message: 'm' }), { status: 500 });
    });
    const gateway = api.createAgentGateway(http, store);
    await gateway.createConversation();
    await assert.rejects(claim === 'save' ? gateway.saveBuild(CONVERSATION) : gateway.adoptHandoff('h-1'));
    assert.equal(store.current()?.conversationId, CONVERSATION, `${claim}: failure keeps it`);
    ok = true;
    await (claim === 'save' ? gateway.saveBuild(CONVERSATION) : gateway.adoptHandoff('h-1'));
    assert.equal(store.current(), null, `${claim}: success clears it`);
  }
});

test('the possession secret never reaches React-visible handoff state or a request URL', async () => {
  const { gateway, requests } = lifecycle(() => ({ status: 201, body: handoffBody(false, 'IDENTITY_REQUIRED') }));
  await gateway.createConversation();
  const handoff = await gateway.createHandoff(CONVERSATION);
  assert.equal(JSON.stringify(api.handoffView(handoff)).includes(SECRET), false);
  for (const request of requests) assert.equal(request.url.includes(SECRET), false);
  const gatewaySource = await readFile('src/api/securepay/agent/index.ts', 'utf8');
  const continuitySource = await readFile('src/api/securepay/agent/continuity.ts', 'utf8');
  assert.doesNotMatch(gatewaySource + continuitySource, /console\./);
});
