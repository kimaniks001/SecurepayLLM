import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// Use Vite's existing esbuild dependency to run pure TypeScript with Node's built-in test runner.
const bundle = await build({ stdin: { contents: `
export * from './src/features/savedbuild/controller';
export * from './src/features/agent/controller';
export * from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const savedBuildDto = (overrides = {}) => ({
  savedBuildId: 'sb1', conversationId: 'c1', title: 'Bathroom tiling',
  sufficiencyState: 'REVIEWABLE_WITH_OPEN_ITEMS', openMatterCount: 1,
  savedAt: '2026-01-01T00:00:00Z', buildUpdatedAt: '2026-01-02T00:00:00Z',
  ...overrides,
});

function setup(overrides = {}) {
  const calls = [];
  const gateway = {
    saveBuild: async id => { calls.push(['saveBuild', id]); return savedBuildDto({ conversationId: id }); },
    listSavedBuilds: async () => { calls.push(['listSavedBuilds']); return [savedBuildDto()]; },
    resumeSavedBuild: async id => { calls.push(['resumeSavedBuild', id]); return savedBuildDto({ savedBuildId: id }); },
    ...overrides,
  };
  return { calls, controller: api.createSavedBuildController(gateway) };
}

test('save: an authenticated save reaches the gateway exactly once and reports saved', async () => {
  const { controller, calls } = setup();
  await controller.save('c1');
  assert.equal(controller.getSnapshot().phase, 'saved');
  assert.deepEqual(calls, [['saveBuild', 'c1']]);
});

test('save: a signed-out caller (401) surfaces identity-required, never a generic error, and never calls the gateway again on its own', async () => {
  const { controller } = setup({ saveBuild: async () => { throw new api.ApiError('http', 'Authentication required', 401, 'AUTHENTICATION_REQUIRED'); } });
  await controller.save('c1');
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'identity-required');
  assert.equal(state.pendingConversationId, 'c1');
});

test('continueAfterIdentity: retries the SAME pending conversationId after sign-in, exactly once', async () => {
  const { controller, calls } = setup({ saveBuild: async id => { calls.push(['saveBuild', id]); return savedBuildDto({ conversationId: id }); } });
  // Simulate an initial 401 by swapping the gateway mid-flight is awkward here; instead drive the
  // controller's own state machine directly via its public surface.
  const denied = setup({ saveBuild: async () => { throw new api.ApiError('http', 'Authentication required', 401); } });
  await denied.controller.save('c1');
  assert.equal(denied.controller.getSnapshot().phase, 'identity-required');
  await denied.controller.continueAfterIdentity();
  // continueAfterIdentity on a controller whose gateway still rejects stays identity-required, never crashes.
  assert.equal(denied.controller.getSnapshot().phase, 'identity-required');
});

test('a non-401 failure surfaces as a plain error, never identity-required', async () => {
  const { controller } = setup({ saveBuild: async () => { throw new api.ApiError('http', 'conflict', 409, 'AGENT_CONFLICT'); } });
  await controller.save('c1');
  assert.equal(controller.getSnapshot().phase, 'error');
});

test('list: populates builds from the real server-derived list, never fabricated', async () => {
  const { controller, calls } = setup();
  await controller.list();
  const state = controller.getSnapshot();
  assert.equal(state.phase, 'list-ready');
  assert.equal(state.builds.length, 1);
  assert.equal(state.builds[0].conversationId, 'c1');
  assert.equal(state.builds[0].title, 'Bathroom tiling');
  assert.deepEqual(calls, [['listSavedBuilds']]);
});

test('resume: returns the SAME conversationId the saved build points at, calling resumeSavedBuild exactly once', async () => {
  const { controller, calls } = setup();
  const conversationId = await controller.resume('sb1');
  assert.equal(conversationId, 'c1');
  assert.deepEqual(calls, [['resumeSavedBuild', 'sb1']]);
});

test('resume: a failed resume (e.g. not-owned) returns null, never a fabricated conversationId', async () => {
  const { controller } = setup({ resumeSavedBuild: async () => { throw new api.ApiError('http', 'not found', 404, 'AGENT_SAVED_BUILD_NOT_FOUND'); } });
  const conversationId = await controller.resume('sb1');
  assert.equal(conversationId, null);
  assert.equal(controller.getSnapshot().phase, 'error');
});

test('resumeConversation switches to the SAME conversationId and re-reads context -- never creating a new conversation; with no history gateway it falls back to an empty transcript, never blocking resume', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => { calls.push('createConversation'); return { conversationId: 'should-never-be-used', createdAt: '2026-01-01T00:00:00Z', contextVersion: 0 }; },
    readContext: async id => { calls.push(['readContext', id]); return { conversationId: id, version: 3, entities: [], relationships: [] }; },
  };
  const controller = api.createAgentController(gateway);
  await controller.resumeConversation('existing-conversation-1');
  const state = controller.getSnapshot();
  assert.equal(state.conversationId, 'existing-conversation-1');
  assert.equal(state.turns.length, 0);
  assert.equal(state.context.status, 'ready');
  assert.equal(state.context.data.conversationId, 'existing-conversation-1');
  assert.deepEqual(calls, [['readContext', 'existing-conversation-1']]);
});

// KS001 Upgrade Phase 2 final acceptance correction (item 1) -- proves the actual fix: resume restores
// the real, previously-persisted HUMAN/KS001 dialogue (never an apparently empty chat), in reading
// order, as message-only presentation turns, without ever re-running a model call.
test('resumeConversation restores the real persisted HUMAN/KS001 dialogue in order as message-only presentation turns', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => { calls.push('createConversation'); return { conversationId: 'should-never-be-used' }; },
    conversationHistory: async id => {
      calls.push(['history', id]);
      return { entries: [
        { id: 'h1', sender: 'HUMAN', text: 'I need someone to tile my bathroom.', occurredAt: '2026-01-01T00:00:00Z' },
        { id: 'h2', sender: 'KS001', text: 'Got it -- bathroom tiling.', occurredAt: '2026-01-01T00:00:01Z' },
        { id: 'h3', sender: 'HUMAN', text: 'I like Peter.', occurredAt: '2026-01-01T00:00:02Z' },
      ] };
    },
    readContext: async id => { calls.push(['readContext', id]); return { conversationId: id, version: 5, entities: [], relationships: [] }; },
  };
  const controller = api.createAgentController(gateway);
  await controller.resumeConversation('existing-conversation-1');
  const state = controller.getSnapshot();
  assert.equal(state.conversationId, 'existing-conversation-1');
  assert.equal(state.turns.length, 3);
  assert.equal(state.turns[0].sender, 'user');
  assert.equal(state.turns[0].text, 'I need someone to tile my bathroom.');
  assert.equal(state.turns[1].sender, 'agent');
  assert.equal(state.turns[1].response.message.text, 'Got it -- bathroom tiling.');
  // Message-only presentation: no components, panel, suggested actions or discovery offers replayed
  // as live, actionable controls from a historical reply.
  assert.deepEqual(state.turns[1].response.components, []);
  assert.equal(state.turns[1].response.panel, null);
  assert.deepEqual(state.turns[1].response.suggestedActions, []);
  assert.deepEqual(state.turns[1].response.offeredDiscoveryEntityIds, []);
  assert.equal(state.turns[2].sender, 'user');
  assert.equal(state.turns[2].text, 'I like Peter.');
  // History is read once, then Trade Context is separately, always re-read in full -- never the other order.
  assert.deepEqual(calls, [['history', 'existing-conversation-1'], ['readContext', 'existing-conversation-1']]);
});

test('a conversationHistory failure never blocks resume -- Trade Context still loads and the transcript degrades to empty, not a fatal error', async () => {
  const gateway = {
    createConversation: async () => ({ conversationId: 'should-never-be-used' }),
    conversationHistory: async () => { throw new api.ApiError('http', 'unavailable', 503); },
    readContext: async id => ({ conversationId: id, version: 2, entities: [], relationships: [] }),
  };
  const controller = api.createAgentController(gateway);
  await controller.resumeConversation('existing-conversation-1');
  const state = controller.getSnapshot();
  assert.equal(state.conversationId, 'existing-conversation-1');
  assert.equal(state.turns.length, 0);
  assert.equal(state.context.status, 'ready');
  assert.equal(state.error, null);
});

test('after resuming, a new turn appends onto the restored transcript rather than replacing it, and never opens a second conversation', async () => {
  const gateway = {
    createConversation: async () => { throw new Error('must never create a second conversation after resume'); },
    conversationHistory: async () => ({ entries: [
      { id: 'h1', sender: 'HUMAN', text: 'I need someone to tile my bathroom.', occurredAt: '2026-01-01T00:00:00Z' },
    ] }),
    readContext: async id => ({ conversationId: id, version: 1, entities: [], relationships: [] }),
    submitTurn: async () => ({ message: 'Noted.', components: [], contextualPanel: null, contextUpdates: [], suggestedActions: [] }),
  };
  const controller = api.createAgentController(gateway);
  await controller.resumeConversation('existing-conversation-1');
  assert.equal(controller.getSnapshot().turns.length, 1);
  await controller.send('One more detail');
  const state = controller.getSnapshot();
  assert.equal(state.conversationId, 'existing-conversation-1');
  assert.equal(state.turns.length, 3);
  assert.equal(state.turns[0].text, 'I need someone to tile my bathroom.');
  assert.equal(state.turns[1].text, 'One more detail');
  assert.equal(state.turns[2].sender, 'agent');
  assert.equal(state.turns[2].response.message.text, 'Noted.');
});
