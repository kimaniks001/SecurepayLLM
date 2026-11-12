import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Contract test: mocked gateway to prove the frontend never swaps API replies,
// conversation IDs or canonical context after the fourth turn. NOT a live model
// certification; testing/ks001-12turn-staging.mjs exercises an isolated API.
const compiled = await build({
  stdin: {
    contents: "export { createAgentController } from './src/features/agent/controller';",
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, format: 'cjs', platform: 'node',
});
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(
  createRequire(import.meta.url), module, module.exports,
);
const { createAgentController } = module.exports;
const CONVERSATION = 'c-ks001-12-turns';

function apiContext(id, version) {
  return {
    conversationId: id, version,
    entities: [{
      id: 'goods-1', type: 'GOODS', name: '40 school chairs',
      state: 'CANDIDATE', confidence: 1,
      attributes: { quantity: '40', sourceKind: 'USER_STATEMENT' },
    }],
    relationships: [],
  };
}
function apiReply(n) {
  return {
    protocolVersion: '1.0',
    replyId: 'server-reply-' + n,
    message: 'KS001 API reply ' + n + ': I am still discussing the 40 school chairs. What else should we settle?',
    contextUpdates: [], components: [], contextualPanel: null, suggestedActions: [],
  };
}

test('12-turn conversation keeps one ID and renders each exact API reply, including turns 5–12', async () => {
  const calls = [];
  let count = 0;
  let contextVersion = 0;
  const gateway = {
    createConversation: async () => { calls.push('create'); return { conversationId: CONVERSATION }; },
    submitTurn: async (id, body) => {
      assert.equal(id, CONVERSATION);
      assert.match(body.message, /^Turn [0-9]+:/);
      assert.ok(body.clientTurnId);
      calls.push(['turn', id, body.clientTurnId]);
      ++count;
      contextVersion = count;
      return apiReply(count);
    },
    readContext: async id => {
      assert.equal(id, CONVERSATION);
      calls.push(['context', id]);
      return apiContext(id, contextVersion);
    },
  };
  let nextId = 0;
  const controller = createAgentController(gateway, () => 'test-client-turn-' + ++nextId);
  for (let i = 1; i <= 12; i++) {
    await controller.send('Turn ' + i + ': please continue the same school chairs agreement.');
    const state = controller.getSnapshot();
    assert.equal(state.conversationId, CONVERSATION);
    assert.equal(state.turns.length, i * 2);
    assert.equal(state.turns.at(-1).sender, 'agent');
    assert.equal(state.turns.at(-1).id, 'server-reply-' + i);
    assert.equal(state.turns.at(-1).response.message.text, apiReply(i).message);
    assert.equal(state.context.status, 'ready');
    assert.equal(state.context.data.conversationId, CONVERSATION);
    assert.equal(state.context.data.version, i);
    assert.equal(state.pending, null);
    assert.equal(state.error, null);
  }
  assert.equal(calls.filter(x => x === 'create').length, 1);
  assert.equal(new Set(calls.filter(x => Array.isArray(x) && x[0] === 'turn').map(x => x[2])).size, 12);
});

test('foreign conversation context is refused, never shown as verified understanding', async () => {
  const gateway = {
    createConversation: async () => ({ conversationId: CONVERSATION }),
    submitTurn: async () => apiReply(1),
    readContext: async () => apiContext('somebody-elses-conversation', 40),
  };
  const controller = createAgentController(gateway);
  await controller.send('I need chairs.');
  const state = controller.getSnapshot();
  assert.equal(state.conversationId, CONVERSATION);
  assert.equal(state.context.status, 'error');
  assert.equal(state.context.data, null);
  assert.match(state.context.error, /different conversation/i);
  assert.equal(state.pending, null, 'already-acknowledged reply is never sent twice');
});

test('resuming history blocks premature sends until the server read finishes', async () => {
  let finishHistory;
  const history = new Promise(resolve => { finishHistory = resolve; });
  const calls = [];
  const gateway = {
    createConversation: async () => { throw Error('must reuse resumed conversation'); },
    conversationHistory: async id => { calls.push(['history', id]); return history; },
    readContext: async id => { calls.push(['context', id]); return apiContext(id, 8); },
    submitTurn: async (id, body) => { calls.push(['turn', id, body]); return apiReply(9); },
  };
  const controller = createAgentController(gateway, () => 'turn-9');
  const resume = controller.resumeConversation(CONVERSATION);
  assert.equal(controller.getSnapshot().busy, true);
  await controller.send('Must not lose this while history is loading');
  assert.equal(calls.some(x => x[0] === 'turn'), false);
  finishHistory({ entries: [
    { id: 'h1', sender: 'HUMAN', text: 'I need school chairs', occurredAt: '2026-11-12T09:00:00Z' },
    { id: 'h2', sender: 'KS001', text: 'How many chairs?', occurredAt: '2026-11-12T09:01:00Z' },
  ] });
  await resume;
  assert.equal(controller.getSnapshot().busy, false);
  assert.equal(controller.getSnapshot().turns.length, 2);
  await controller.send('40 chairs');
  assert.equal(controller.getSnapshot().turns.length, 4);
  assert.equal(controller.getSnapshot().turns.at(-1).response.message.text, apiReply(9).message);
});

test('the chat speaks only the server reply, never an unsynchronised Formation question', () => {
  const live = readFileSync(new URL('../src/features/living-workspace/LiveKs001Session.tsx', import.meta.url), 'utf8');
  assert.match(live, /Ks001Reply text=\{turn\.response\.message\.text\}/);
  assert.match(live, /currentQuestion=question\?\.question \?\? ''/);
  assert.doesNotMatch(live, /humanNextQuestion/);
  assert.doesNotMatch(live, /Ks001Reply[^\n]*nextQuestion/);
});
