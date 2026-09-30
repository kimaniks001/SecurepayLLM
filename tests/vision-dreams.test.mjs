import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: [
    "export * from './src/features/visionboard/dreams/controller';",
    "export * from './src/features/visionboard/dreams/handoff';",
    "export { readDraft, writeDraft, clearComposerDrafts } from './src/features/conversation/drafts';",
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

test('a long Dream is never silently truncated into the 1,200-character KS001 composer', () => {
  const longThought = 'a'.repeat(1400);
  assert.throws(
    () => api.dreamContinuation(dream({ content: longThought })),
    /Choose up to 1,200 characters/,
  );
  assert.deepEqual(
    api.dreamContinuation(dream({ content: longThought }), 'Please help me explore this home idea.'),
    { conversationId: UUID, draftText: 'Please help me explore this home idea.' },
  );
  assert.throws(() => api.dreamContinuation(dream(), '  '), /Choose up to 1,200 characters/);
  assert.equal(api.MAX_KS001_DRAFT, 1200);
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
    create: async () => dream(),
    get: async () => dream({ version, title: version === 1 ? 'Old note' : 'Updated elsewhere' }),
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


test('refreshing an older selected Dream does not drop it when it falls outside the recent 30', async () => {
  let listing = 0;
  let selectedReads = 0;
  const controller = api.createVisionDreamController({
    mine: async () => ++listing === 1 ? [dream({ version: 1, title: 'Original thought' })] : [],
    get: async id => {
      assert.equal(id, OTHER);
      selectedReads++;
      return dream({ version: 3, title: 'Updated older thought' });
    },
    create: async () => dream(),
    update: async () => dream(),
  }, {
    resumableConversationId: () => null,
    forgetResumableConversation: () => {},
    createConversation: async () => ({ conversationId: UUID }),
  });
  await controller.load();
  controller.select(OTHER);
  await controller.load();
  assert.equal(selectedReads, 1);
  assert.equal(controller.getSnapshot().phase, 'ready');
  assert.equal(controller.getSnapshot().dreams.length, 0); // older than recent window
  assert.equal(controller.getSnapshot().selected.dreamId, OTHER);
  assert.equal(controller.getSnapshot().selected.version, 3);
  assert.equal(controller.getSnapshot().selected.title, 'Updated older thought');
});

test('refresh cannot silently switch to another Dream if an inconsistent response arrives', async () => {
  const controller = api.createVisionDreamController({
    mine: async () => [dream()],
    get: async () => dream({ dreamId: UUID }),
    create: async () => dream(),
    update: async () => dream(),
  }, {
    resumableConversationId: () => null,
    forgetResumableConversation: () => {},
    createConversation: async () => ({ conversationId: UUID }),
  });
  await controller.load();
  controller.select(OTHER);
  await controller.load();
  assert.equal(controller.getSnapshot().phase, 'error');
  assert.equal(controller.getSnapshot().selected.dreamId, OTHER);
  assert.equal(controller.getSnapshot().selected.version, 1);
});


test('Dream handoff verifies the SAME owned conversation, then only prefills the unsent composer', async () => {
  api.clearComposerDrafts();
  let resumes = 0;
  let state = { conversationId: null, busy: false, pending: null, context: { status: 'idle' } };
  const agent = {
    getSnapshot: () => state,
    resumeConversation: async id => {
      resumes++;
      state = { ...state, conversationId: id, context: { status: 'ready' } };
    },
  };
  const result = await api.prepareDreamHandoff(agent, { conversationId: UUID, draftText: '  Let me explore a small home  ' });
  assert.deepEqual(result, { ok: true });
  assert.equal(resumes, 1);
  assert.equal(api.readDraft(UUID), 'Let me explore a small home');
  assert.equal(api.readDraft(OTHER), '');
  api.clearComposerDrafts();
});

test('Dream handoff fails closed on an unauthorized/failed read and preserves existing unsent words', async () => {
  api.clearComposerDrafts();
  let state = { conversationId: OTHER, busy: false, pending: null, context: { status: 'idle' } };
  const agent = {
    getSnapshot: () => state,
    resumeConversation: async id => {
      state = { ...state, conversationId: id, context: { status: 'error' } };
    },
  };
  assert.equal((await api.prepareDreamHandoff(agent, {
    conversationId: UUID, draftText: 'Private note',
  })).ok, false);
  assert.equal(api.readDraft(UUID), '');
  api.writeDraft(UUID, 'Existing unsent message');
  const rejected = await api.prepareDreamHandoff(agent, { conversationId: UUID, draftText: 'Different private note' });
  assert.equal(rejected.ok, false);
  assert.match(rejected.error, /unsent KS001 message/);
  assert.equal(api.readDraft(UUID), 'Existing unsent message');
  api.clearComposerDrafts();
});

test('Dream handoff cannot run during another pending KS001 action or overfill its composer', async () => {
  api.clearComposerDrafts();
  let resumed = 0;
  const agent = {
    getSnapshot: () => ({ conversationId: null, busy: true, pending: null, context: { status: 'idle' } }),
    resumeConversation: async () => { resumed++; },
  };
  assert.equal((await api.prepareDreamHandoff(agent, { conversationId: UUID, draftText: 'Hello' })).ok, false);
  assert.equal((await api.prepareDreamHandoff(agent, { conversationId: UUID, draftText: 'a'.repeat(1201) })).ok, false);
  assert.equal(resumed, 0);
});
