import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

// Phase 6 Slice 4 -- Community → Trade: "Use this" from a real Community object, through the SAME
// generic commercial-source selection the Store "Use this" already uses.
const bundle = await build({ stdin: { contents: `
export * as agentController from './src/features/agent/controller';
export * as agentGatewayModule from './src/api/securepay/agent';
export * as agreementsGatewayModule from './src/api/securepay/agreements';
export * as http from './src/api/securepay/http';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;

function communitySelectionDto(overrides = {}) {
  return {
    sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceTitle: 'Bathroom repair need', sourceOwnerKsNumber: 'KS900',
    contextReference: '#/community/objects/obj-1', capturedPriceMinor: null, capturedCurrency: null,
    originatingKsNumber: null, selectedAt: '2026-09-25T00:00:00Z', ...overrides,
  };
}
function agentResponseFixture(text) {
  return {
    protocolVersion: '1', message: text, contextUpdates: [], components: [],
    contextualPanel: null, suggestedActions: [],
  };
}

// ─── controller.ts (agent) -- useCommunitySource (final pre-merge correction) ─────────────────────────

test('useCommunitySource selects the real Community source, then lets KS001 compose a reply via the dedicated continuation endpoint -- never a fabricated human turn', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => { calls.push('create-conversation'); return { conversationId: 'c1' }; },
    selectCommercialSource: async (id, body) => { calls.push(['selectCommercialSource', id, body]); return communitySelectionDto(); },
    continueAfterSourceSelection: async id => { calls.push(['continueAfterSourceSelection', id]); return agentResponseFixture("You're starting from a bathroom repair need. What would you like to help with?"); },
    readContext: async id => { calls.push(['readContext', id]); return { conversationId: id, version: 1, entities: [], relationships: [] }; },
    submitTurn: async () => { throw new Error('must never be called -- source text is never submitted as a human turn'); },
  };
  const controller = api.agentController.createAgentController(gateway);

  const result = await controller.useCommunitySource({ sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900' });

  assert.equal(result.status, 'selected');
  assert.equal(result.amount, 'none');
  assert.equal(calls[0], 'create-conversation');
  assert.equal(calls[1][0], 'selectCommercialSource');
  assert.deepEqual(calls[1][2], { sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900', candidateParticipantKsNumber: undefined });
  assert.equal(calls[2][0], 'continueAfterSourceSelection');
  assert.equal(controller.getSnapshot().source?.sourceTitle, 'Bathroom repair need');
  assert.equal(controller.getSnapshot().source?.sourceType, 'COMMUNITY_POST');
  // NEVER a "user" turn -- only KS001's own composed reply appears in the transcript.
  assert.equal(controller.getSnapshot().turns.length, 1);
  assert.equal(controller.getSnapshot().turns[0].sender, 'agent');
  assert.equal(controller.getSnapshot().turns[0].response.message.text, "You're starting from a bathroom repair need. What would you like to help with?");
});

test('useCommunitySource never submits the Community object\'s title/body as a conversational turn, even without a candidate', async () => {
  const submitTurnCalls = [];
  const gateway = {
    createConversation: async () => ({ conversationId: 'c1' }),
    selectCommercialSource: async () => communitySelectionDto(),
    continueAfterSourceSelection: async () => agentResponseFixture('ok'),
    readContext: async id => ({ conversationId: id, version: 1, entities: [], relationships: [] }),
    submitTurn: async (id, body) => { submitTurnCalls.push(body); return agentResponseFixture('ok'); },
  };
  const controller = api.agentController.createAgentController(gateway);

  await controller.useCommunitySource({ sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900' });

  assert.equal(submitTurnCalls.length, 0);
  assert.ok(!controller.getSnapshot().turns.some(t => t.sender === 'user'));
});

test('useCommunitySource carries a candidateParticipantKsNumber through to the real selection call ("Start a trade with Peter") -- the EXPLICIT KS Number of the clicked responder, never inferred', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => ({ conversationId: 'c1' }),
    selectCommercialSource: async (id, body) => { calls.push(body); return communitySelectionDto({ originatingKsNumber: 'KS200' }); },
    continueAfterSourceSelection: async () => agentResponseFixture('ok'),
    readContext: async id => ({ conversationId: id, version: 1, entities: [], relationships: [] }),
  };
  const controller = api.agentController.createAgentController(gateway);

  await controller.useCommunitySource({
    sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900', candidateParticipantKsNumber: 'KS200',
  });

  assert.equal(calls[0].candidateParticipantKsNumber, 'KS200');
  assert.equal(controller.getSnapshot().source?.originatingKsNumber, 'KS200');
});

test('a failed Community source selection is held (never calls the continuation, never a human turn), until an explicit retry or continue', async () => {
  const calls = [];
  let attempt = 0;
  const gateway = {
    createConversation: async () => ({ conversationId: 'c1' }),
    selectCommercialSource: async () => {
      attempt += 1;
      calls.push('selectCommercialSource');
      if (attempt === 1) throw new Error('no longer available');
      return communitySelectionDto();
    },
    continueAfterSourceSelection: async () => { calls.push('continueAfterSourceSelection'); return agentResponseFixture('ok'); },
    readContext: async id => ({ conversationId: id, version: 1, entities: [], relationships: [] }),
  };
  const controller = api.agentController.createAgentController(gateway);

  const failed = await controller.useCommunitySource({ sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900' });
  assert.equal(failed.status, 'failed');
  assert.equal(controller.getSnapshot().turns.length, 0, 'nothing is recorded while the selection failed');
  assert.ok(controller.getSnapshot().communitySourceSelectionFailure);
  assert.ok(!calls.includes('continueAfterSourceSelection'), 'the continuation must never run while a selection failure is outstanding');

  const retried = await controller.retryCommunitySourceSelection();
  assert.equal(retried.status, 'selected');
  assert.equal(controller.getSnapshot().communitySourceSelectionFailure, null);
  assert.equal(controller.getSnapshot().turns.length, 1);
  assert.equal(controller.getSnapshot().turns[0].sender, 'agent');
  assert.deepEqual(calls, ['selectCommercialSource', 'selectCommercialSource', 'continueAfterSourceSelection']);
});

test('continuing without a Community source clears provenance and auto-submits NOTHING -- the person speaks to KS001 normally from here', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => ({ conversationId: 'c1' }),
    selectCommercialSource: async () => { throw new Error('no longer available'); },
    continueAfterSourceSelection: async () => { calls.push('continueAfterSourceSelection'); return agentResponseFixture('ok'); },
    submitTurn: async (id, body) => { calls.push(['submitTurn', body]); return agentResponseFixture('ok'); },
    readContext: async id => ({ conversationId: id, version: 1, entities: [], relationships: [] }),
  };
  const controller = api.agentController.createAgentController(gateway);
  await controller.useCommunitySource({ sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900' });

  const outcome = await controller.continueCommunitySourceWithoutSource();

  assert.equal(outcome, 'continued');
  assert.equal(controller.getSnapshot().source, null);
  assert.equal(controller.getSnapshot().communitySourceSelectionFailure, null);
  // Nothing was ever submitted -- no turn, no continuation call, no fabricated Community text.
  assert.equal(controller.getSnapshot().turns.length, 0);
  assert.equal(calls.length, 0);
});

test('a second "Use this" mid-conversation calls the continuation again -- a bounded, non-mutating reply is safe to compose more than once', async () => {
  const continuationCalls = [];
  const gateway = {
    createConversation: async () => ({ conversationId: 'c1' }),
    selectCommercialSource: async () => communitySelectionDto(),
    continueAfterSourceSelection: async () => { continuationCalls.push(1); return agentResponseFixture('ok'); },
    readContext: async id => ({ conversationId: id, version: 1, entities: [], relationships: [] }),
  };
  const controller = api.agentController.createAgentController(gateway);
  await controller.useCommunitySource({ sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900' });
  assert.equal(continuationCalls.length, 1);

  await controller.useCommunitySource({ sourceType: 'OPPORTUNITY', sourceId: 'obj-2', sourceOwnerKsNumber: 'KS901' });

  assert.equal(continuationCalls.length, 2);
  assert.equal(controller.getSnapshot().turns.length, 2);
  assert.ok(controller.getSnapshot().turns.every(t => t.sender === 'agent'), 'still never a fabricated human turn');
});

test('a failed continuation call is best-effort -- the source stays selected and no error is thrown', async () => {
  const gateway = {
    createConversation: async () => ({ conversationId: 'c1' }),
    selectCommercialSource: async () => communitySelectionDto(),
    continueAfterSourceSelection: async () => { throw new Error('network blip'); },
    readContext: async id => ({ conversationId: id, version: 1, entities: [], relationships: [] }),
  };
  const controller = api.agentController.createAgentController(gateway);

  const result = await controller.useCommunitySource({ sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900' });

  assert.equal(result.status, 'selected');
  assert.equal(controller.getSnapshot().source?.sourceId, 'obj-1');
  assert.equal(controller.getSnapshot().turns.length, 0);
});

// ─── api/securepay/agent -- the new continuation gateway route ─────────────────────────

test('gateway: agent.continueAfterSourceSelection hits POST .../commercial-source/continue', async () => {
  const calls = [];
  const http = { request: async (path, options = {}) => { calls.push({ path, method: options.method, auth: options.auth }); return agentResponseFixture('ok'); } };
  const gateway = api.agentGatewayModule.createAgentGateway(http);

  await gateway.continueAfterSourceSelection('c1');

  assert.equal(calls[0].path, '/api/agent/conversations/c1/commercial-source/continue');
  assert.equal(calls[0].method, 'POST');
});

// ─── api/securepay/agreements -- the participant-safe source-provenance gateway route ─────────────────────────

test('gateway: agreements.source hits GET /api/v1/agreements/{id}/source, authenticated', async () => {
  const calls = [];
  const http = { request: async (path, options = {}) => { calls.push({ path, auth: options.auth }); return { present: false, sourceType: null, sourceTitle: null, contextLabel: null, capturedAt: null, available: true }; } };
  const gateway = api.agreementsGatewayModule.createAgreementGateway(http);
  await gateway.source('ag-1');
  assert.equal(calls[0].path, '/api/v1/agreements/ag-1/source');
  assert.equal(calls[0].auth, 'required');
});

// ─── Doctrine-style source checks: the real UI actually wires these, never a placeholder notice ─────────────────────────

test('the Community object detail "Use this" action is real, and responder selection is EXPLICIT -- never array/first-active order', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /onUseThis=\{\(\) => \{/);
  assert.match(contents, /communitySourceFactFor\(state\.selectedRealObject!\)/);
  // The correction removed the "first ACTIVE helper wins" shortcut entirely.
  assert.doesNotMatch(contents, /firstActiveHelper/);
  assert.doesNotMatch(contents, /find\(\(h: CommunityHelpResponseView\) => h\.status === 'ACTIVE'\)/);
  // Every real ACTIVE responder is listed distinctly, and the candidate passed to the backend is
  // exactly the KS Number of the button the person clicked.
  assert.match(contents, /activeHelpResponders/);
  assert.match(contents, /onStartTradeWithResponder=\{candidateKsNumber => \{/);
  assert.match(contents, /communitySourceFactFor\(state\.selectedRealObject!, candidateKsNumber\)/);
});

test('CommunityObjectDetail renders every ACTIVE responder distinctly with their own "Start a trade with X" button, never one generic "Start trade with helper" action', async () => {
  const contents = await readFile('src/components/CommunityObjectDetail.tsx', 'utf8');
  assert.match(contents, /onUseThis\?: \(\) => void/);
  assert.match(contents, /\{onUseThis && \(/);
  assert.match(contents, /activeHelpResponders\?:/);
  assert.match(contents, /onStartTradeWithResponder\?:/);
  assert.match(contents, /People who can help/);
  assert.match(contents, /Start a trade with \{label\}/);
  // The old single generic action's actual button text is gone (a doctrine comment above may still
  // name it in prose, explaining what this replaced -- that is documentation, not UI).
  assert.doesNotMatch(contents, />\s*Start trade with helper\s*</);
});

test('never a second Agreement/handoff engine, and never the ordinary turn endpoint: Community source selection stays inside selectCommercialSource + the dedicated continuation', async () => {
  const contents = await readFile('src/features/agent/controller.ts', 'utf8');
  assert.match(contents, /async function attemptCommunitySourceSelection/);
  assert.match(contents, /gateway\.selectCommercialSource\(conversationId, \{/);
  assert.match(contents, /async function continueAfterSourceSelection/);
  assert.match(contents, /gateway\.continueAfterSourceSelection\(state\.conversationId\)/);
  assert.doesNotMatch(contents, /gateway\.createHandoff\(/);
  // The correction removed the old fake-human-turn-seeding mechanism entirely.
  assert.doesNotMatch(contents, /seedOpeningTurnIfFirst/);
  assert.doesNotMatch(contents, /update\(\{ turns: \[\.\.\.state\.turns, \{ id: clientTurnId, sender: 'user', text: openingMessage/);
});

test('the corrected CommunitySourceFact type carries no openingMessage -- Community source text is never framed as something to submit as a human turn', async () => {
  const contents = await readFile('src/features/agent/controller.ts', 'utf8');
  const typeStart = contents.indexOf('export type CommunitySourceFact = {');
  const typeEnd = contents.indexOf('};', typeStart);
  const typeBody = contents.slice(typeStart, typeEnd);
  assert.doesNotMatch(typeBody, /openingMessage/);
});

test('Trade Taking Shape shows the real selected source (Store or Community) via the existing SourceReference component', async () => {
  const contents = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(contents, /import \{ SourceFailureNote, SourceReference \} from '\.\.\/discovery\/ui\/SourceReference';/);
  assert.match(contents, /\{state\.source && !state\.offerSelectionFailure && !state\.communitySourceSelectionFailure && \(/);
});

test('Agreement Detail shows the persisted, participant-safe source provenance via a best-effort read', async () => {
  const controllerSource = await readFile('src/features/workspace/controller.ts', 'utf8');
  assert.match(controllerSource, /sourceProvenance: AgreementSourceProvenanceResponse \| null/);
  assert.match(controllerSource, /bestEffort<AgreementSourceProvenanceResponse \| null>\(\(\) => gateway\.source\(agreementId\), null\)/);

  const experienceSource = await readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8');
  assert.match(experienceSource, /sourceProvenance\?\.present/);
  assert.match(experienceSource, /Source is no longer available in Community\./);
});
