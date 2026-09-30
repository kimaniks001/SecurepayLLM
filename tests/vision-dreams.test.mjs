import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: [
    "export * from './src/features/visionboard/dreams/controller';",
    "export * from './src/api/securepay/visiondreams';",
    "export * from './src/api/securepay/agent/continuity';",
    "export { ApiError } from './src/api/securepay/http';",
  ].join('\n'), resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', platform: 'node',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const UUID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ACCESS = {
  conversationId: UUID,
  secret: 'A'.repeat(43),
  anonymousExpiresAt: '2027-10-01T00:00:00Z',
};
const makeAccess = () => api.createConversationAccessStore(null, () => Date.parse('2026-09-30T00:00:00Z'));
const dream = (overrides = {}) => ({
  dreamId: OTHER, conversationId: UUID, visionItemId: 'item-1',
  title: 'Build mum a small house', content: 'I saw a lovely small house',
  locked: false, superseded: false, version: 1, createdAt: '2026-09-30T00:00:00Z',
  updatedAt: '2026-09-30T00:00:00Z', ...overrides,
});

test('new Dream gateway sends the correct temporary token in a header, never a URL/body', async () => {
  const access = makeAccess();
  access.remember(ACCESS);
  const calls = [];
  const gateway = api.createVisionDreamGateway({
    request: async (path, options) => { calls.push([path, options]); return dream(); },
  }, access);
  await gateway.create({ conversationId: UUID, title: 'Home', initialThought: 'A nice place' });
  const [path, options] = calls[0];
  assert.equal(path, '/api/v1/vision-dreams');
  assert.equal(options.headers['X-SecurePay-Conversation-Token'], ACCESS.secret);
  assert.deepEqual(options.body, { conversationId: UUID, title: 'Home', initialThought: 'A nice place' });
  assert.equal(access.current(), null);
});

test('Dream gateway never attaches another conversation secret to a requested ID', async () => {
  const access = makeAccess();
  access.remember(ACCESS);
  const calls = [];
  const gateway = api.createVisionDreamGateway({
    request: async (path, options) => { calls.push(options); return dream({ conversationId: OTHER }); },
  }, access);
  await gateway.create({ conversationId: OTHER, title: 'Another', initialThought: 'Other' });
  assert.equal(calls[0].headers, undefined);
  assert.equal(access.current().conversationId, UUID); // forget() did not clear the unrelated record
});

test('an uncertain/failed Dream POST never discards temporary possession', async () => {
  const access = makeAccess();
  access.remember(ACCESS);
  const gateway = api.createVisionDreamGateway({
    request: async () => { throw Error('offline'); },
  }, access);
  await assert.rejects(gateway.create({ conversationId: UUID, title: 'Home', initialThought: 'Note' }));
  assert.deepEqual(access.current(), ACCESS);
});

test('Dream continuation reopens the same conversation with a draft, never an invented turn', () => {
  assert.deepEqual(api.dreamContinuation(dream({ content: '  Build a small place for mum  ' })), {
    conversationId: UUID, draftText: 'Build a small place for mum',
  });
  assert.deepEqual(api.dreamContinuation(dream({ content: null })), {
    conversationId: UUID, draftText: 'Build mum a small house',
  });
});

test('the first line of a Dream stays the person’s words and is bounded', () => {
  assert.equal(api.dreamTitle('  Build mum a small home\nAnd compare roofs  '), 'Build mum a small home');
  assert.ok(api.dreamTitle('a'.repeat(300)).length <= 200);
});

test('creating a Dream captures one conversation and one private item without invoking model turns', async () => {
  const calls = [];
  const controller = api.createVisionDreamController({
    mine: async () => [],
    create: async body => { calls.push(['save', body]); return dream({ title: body.title, content: body.initialThought }); },
    get: async () => dream(), update: async () => dream(),
  }, {
    resumableConversationId: () => null,
    forgetResumableConversation: () => {},
    createConversation: async () => { calls.push(['conversation']); return { conversationId: UUID }; },
  });
  const result = await controller.start('I saw a lovely small house');
  assert.equal(result.conversationId, UUID);
  assert.deepEqual(calls.map(c => c[0]), ['conversation', 'save']);
  assert.equal(calls[1][1].title, 'I saw a lovely small house');
  assert.equal(controller.getSnapshot().pending, null);
});

test('retry after unknown outcome reuses the SAME conversation ID, with no duplicate create', async () => {
  let attempts = 0;
  let creates = 0;
  const controller = api.createVisionDreamController({
    mine: async () => [],
    create: async body => { attempts++; if (attempts === 1) throw Error('connection lost'); return dream({ conversationId: body.conversationId }); },
    get: async () => dream(), update: async () => dream(),
  }, {
    resumableConversationId: () => null,
    forgetResumableConversation: () => {},
    createConversation: async () => { creates++; return { conversationId: UUID }; },
  });
  assert.equal(await controller.start('An idea'), null);
  assert.equal(controller.getSnapshot().pending.conversationId, UUID);
  assert.equal((await controller.retry()).conversationId, UUID);
  assert.equal(creates, 1);
  assert.equal(attempts, 2);
});

test('never silently displaces an existing unrelated unsaved conversation in the same tab', async () => {
  let created = 0;
  const controller = api.createVisionDreamController({
    mine: async () => [], create: async () => { throw Error('must not be called'); },
    get: async () => dream(), update: async () => dream(),
  }, {
    resumableConversationId: () => OTHER,
    forgetResumableConversation: () => {},
    createConversation: async () => { created++; return { conversationId: UUID }; },
  });
  assert.equal(await controller.start('A house idea'), null);
  assert.equal(created, 0);
  assert.match(controller.getSnapshot().error, /another unsaved conversation/);
  controller.cancelPending();
  assert.equal(controller.getSnapshot().pending, null);
});

test('foreign/locked note cannot be overwritten by a local success illusion', async () => {
  let updates = 0;
  const controller = api.createVisionDreamController({
    mine: async () => [dream({ locked: true })],
    create: async () => dream(), get: async () => dream(),
    update: async () => { updates++; return dream(); },
  }, { resumableConversationId: () => null, forgetResumableConversation: () => {}, createConversation: async () => ({ conversationId: UUID }) });
  await controller.load();
  controller.select(OTHER);
  assert.equal(await controller.saveSummary('Changed', 'Changed', 1), false);
  assert.equal(updates, 0);
  assert.equal(controller.getSnapshot().selected.title, 'Build mum a small house');
});


test('lost response after server commit recovers by finding the SAME Dream conversation ID', async () => {
  let calls = 0;
  let forgotten = 0;
  let current = null;
  const agent = {
    resumableConversationId: () => current,
    forgetResumableConversation: () => { current = null; forgotten++; },
    createConversation: async () => { current = UUID; return { conversationId: UUID }; },
  };
  const controller = api.createVisionDreamController({
    mine: async () => [dream()],
    create: async () => { calls++; throw Error('connection lost after commit'); },
    get: async () => dream(), update: async () => dream(),
  }, agent);
  assert.equal(await controller.start('Build mum a home'), null);
  assert.equal(controller.getSnapshot().pending.conversationId, UUID);
  const recovered = await controller.reconcilePending();
  assert.equal(recovered.dreamId, OTHER);
  assert.equal(controller.getSnapshot().pending, null);
  assert.equal(forgotten, 1);
  assert.equal(calls, 1);
});

test('explicit abandonment forgets its OWN unsaved conversation and unlocks starting again', async () => {
  let current = null;
  const agent = {
    resumableConversationId: () => current,
    forgetResumableConversation: () => { current = null; },
    createConversation: async () => { current = UUID; return { conversationId: UUID }; },
  };
  const controller = api.createVisionDreamController({
    mine: async () => [],
    create: async () => { throw Error('offline'); },
    get: async () => dream(), update: async () => dream(),
  }, agent);
  await controller.start('A house');
  assert.equal(current, UUID);
  controller.abandonPending();
  assert.equal(current, null);
  assert.equal(controller.getSnapshot().pending, null);
});

test('superseded Library notes cannot be altered through a stale Dream UI', async () => {
  let calls = 0;
  const controller = api.createVisionDreamController({
    mine: async () => [dream({ superseded: true })],
    create: async () => dream(), get: async () => dream(),
    update: async () => { calls++; return dream(); },
  }, {
    resumableConversationId: () => null, forgetResumableConversation: () => {},
    createConversation: async () => ({ conversationId: UUID }),
  });
  await controller.load();
  controller.select(OTHER);
  assert.equal(await controller.saveSummary('Changed', 'Changed', 1), false);
  assert.equal(calls, 0);
});

test('rejected optimistic update retains original Dream and surfaces an error', async () => {
  const controller = api.createVisionDreamController({
    mine: async () => [dream()],
    create: async () => dream(), get: async () => dream(),
    update: async () => { throw new api.ApiError('http', 'stale version', 409, 'VISION_ITEM_CONFLICT'); },
  }, { resumableConversationId: () => null, forgetResumableConversation: () => {}, createConversation: async () => ({ conversationId: UUID }) });
  await controller.load();
  controller.select(OTHER);
  assert.equal(await controller.saveSummary('Changed', 'Changed', 1), false);
  assert.equal(controller.getSnapshot().selected.title, 'Build mum a small house');
  assert.equal(controller.getSnapshot().phase, 'ready'); // error message does not deadlock Save
  assert.match(controller.getSnapshot().error, /Dream changed elsewhere.*Refresh note/);
});

test('inconsistent successful Dream claim never discards matching temporary possession', async () => {
  const access = makeAccess();
  access.remember(ACCESS);
  const gateway = api.createVisionDreamGateway({
    request: async () => dream({ conversationId: OTHER }),
  }, access);
  await assert.rejects(
    gateway.create({ conversationId: UUID, title: 'A home', initialThought: 'Build a home' }),
    /different conversation/,
  );
  assert.deepEqual(access.current(), ACCESS);
});

test('an optimistic conflict permits refreshing an open note to its latest server version', async () => {
  let version = 1;
  let calls = 0;
  const controller = api.createVisionDreamController({
    mine: async () => [dream({ version, title: version === 1 ? 'Old note' : 'Updated elsewhere' })],
    create: async () => dream(), get: async () => dream(),
    update: async (_id, body) => {
      calls++;
      if (body.expectedVersion !== version) throw new api.ApiError('http', 'stale version', 409, 'VISION_ITEM_CONFLICT');
      return dream({ version: version + 1, title: body.title, content: body.content });
    },
  }, { resumableConversationId: () => null, forgetResumableConversation: () => {},
    createConversation: async () => ({ conversationId: UUID }) });
  await controller.load();
  controller.select(OTHER);
  version = 2; // an update was committed from another session
  assert.equal(await controller.saveSummary('My correction', 'A newer thought', 1), false);
  assert.equal(controller.getSnapshot().phase, 'ready');
  assert.equal(controller.getSnapshot().selected.version, 1);
  await controller.load();
  assert.equal(controller.getSnapshot().selected.version, 2);
  assert.equal(controller.getSnapshot().selected.title, 'Updated elsewhere');
  assert.equal(await controller.saveSummary('My correction', 'A newer thought', 2), true);
  assert.equal(controller.getSnapshot().selected.version, 3);
  assert.equal(calls, 2);
});

test('an uncertain Dream create cannot be hidden by another selection or list refresh', async () => {
  let listCalls = 0;
  const controller = api.createVisionDreamController({
    mine: async () => { listCalls++; return [dream()]; },
    create: async () => { throw Error('unknown outcome'); },
    get: async () => dream(), update: async () => dream(),
  }, {
    resumableConversationId: () => null, forgetResumableConversation: () => {},
    createConversation: async () => ({ conversationId: UUID }),
  });
  assert.equal(await controller.start('One important Dream'), null);
  assert.equal(controller.getSnapshot().pending.conversationId, UUID);
  controller.select(OTHER);
  await controller.load();
  assert.equal(controller.getSnapshot().selected, null);
  assert.equal(controller.getSnapshot().pending.conversationId, UUID);
  assert.equal(listCalls, 0); // only explicit reconciliation may read while the POST is uncertain
  assert.equal(controller.getSnapshot().phase, 'error');
});
