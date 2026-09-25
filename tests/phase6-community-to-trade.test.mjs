import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

// Phase 6 Slice 4 -- Community → Trade: "Use this" from a real Community object, through the SAME
// generic commercial-source selection the Store "Use this" already uses.
const bundle = await build({ stdin: { contents: `
export * as agentController from './src/features/agent/controller';
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

// ─── controller.ts (agent) -- useCommunitySource ─────────────────────────

test('useCommunitySource selects the real Community source, then seeds the object\'s own real opening words as the first turn', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => { calls.push('create-conversation'); return { conversationId: 'c1' }; },
    selectCommercialSource: async (id, body) => { calls.push(['selectCommercialSource', id, body]); return communitySelectionDto(); },
    submitTurn: async (id, body) => { calls.push(['submitTurn', id, body]); return { message: { text: 'Tell me more.' }, components: [], offeredDiscoveryEntityIds: [] }; },
    readContext: async id => { calls.push(['readContext', id]); return { conversationId: id, version: 1, entities: [], relationships: [] }; },
  };
  const controller = api.agentController.createAgentController(gateway);

  const result = await controller.useCommunitySource({
    sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900',
    openingMessage: 'Bathroom repair need. Need someone to repair my mother\'s bathroom.',
  });

  assert.equal(result.status, 'selected');
  assert.equal(result.amount, 'none');
  assert.equal(calls[0], 'create-conversation');
  assert.equal(calls[1][0], 'selectCommercialSource');
  assert.deepEqual(calls[1][2], { sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900', candidateParticipantKsNumber: undefined });
  assert.equal(calls[2][0], 'submitTurn');
  assert.equal(calls[2][2].message, 'Bathroom repair need. Need someone to repair my mother\'s bathroom.');
  assert.equal(controller.getSnapshot().source?.sourceTitle, 'Bathroom repair need');
  assert.equal(controller.getSnapshot().source?.sourceType, 'COMMUNITY_POST');
  assert.equal(controller.getSnapshot().turns[0].sender, 'user');
  assert.equal(controller.getSnapshot().turns[0].text, 'Bathroom repair need. Need someone to repair my mother\'s bathroom.');
});

test('useCommunitySource carries a candidateParticipantKsNumber through to the real selection call ("Start a trade with Peter")', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => ({ conversationId: 'c1' }),
    selectCommercialSource: async (id, body) => { calls.push(body); return communitySelectionDto({ originatingKsNumber: 'KS200' }); },
    submitTurn: async () => ({ message: { text: 'ok' }, components: [], offeredDiscoveryEntityIds: [] }),
    readContext: async id => ({ conversationId: id, version: 1, entities: [], relationships: [] }),
  };
  const controller = api.agentController.createAgentController(gateway);

  await controller.useCommunitySource({
    sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900', candidateParticipantKsNumber: 'KS200',
    openingMessage: 'Bathroom repair need.',
  });

  assert.equal(calls[0].candidateParticipantKsNumber, 'KS200');
  assert.equal(controller.getSnapshot().source?.originatingKsNumber, 'KS200');
});

test('a failed Community source selection is held (never silently seeds the opening turn), until an explicit retry or continue', async () => {
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
    submitTurn: async (id, body) => { calls.push(['submitTurn', body]); return { message: { text: 'ok' }, components: [], offeredDiscoveryEntityIds: [] }; },
    readContext: async id => ({ conversationId: id, version: 1, entities: [], relationships: [] }),
  };
  const controller = api.agentController.createAgentController(gateway);

  const failed = await controller.useCommunitySource({
    sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900', openingMessage: 'Bathroom repair need.',
  });
  assert.equal(failed.status, 'failed');
  assert.equal(controller.getSnapshot().turns.length, 0, 'the opening message must never be sent while the selection failed');
  assert.ok(controller.getSnapshot().communitySourceSelectionFailure);

  const retried = await controller.retryCommunitySourceSelection();
  assert.equal(retried.status, 'selected');
  assert.equal(controller.getSnapshot().communitySourceSelectionFailure, null);
  assert.equal(controller.getSnapshot().turns[0]?.text, 'Bathroom repair need.');
  assert.deepEqual(calls.filter(c => c === 'selectCommercialSource'), ['selectCommercialSource', 'selectCommercialSource']);
});

test('continuing without a Community source clears provenance but still seeds the person\'s own real opening words', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => ({ conversationId: 'c1' }),
    selectCommercialSource: async () => { throw new Error('no longer available'); },
    submitTurn: async (id, body) => { calls.push(['submitTurn', body]); return { message: { text: 'ok' }, components: [], offeredDiscoveryEntityIds: [] }; },
    readContext: async id => ({ conversationId: id, version: 1, entities: [], relationships: [] }),
  };
  const controller = api.agentController.createAgentController(gateway);
  await controller.useCommunitySource({
    sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900', openingMessage: 'Bathroom repair need.',
  });

  const outcome = await controller.continueCommunitySourceWithoutSource();

  assert.equal(outcome, 'continued');
  assert.equal(controller.getSnapshot().source, null);
  assert.equal(controller.getSnapshot().communitySourceSelectionFailure, null);
  assert.equal(controller.getSnapshot().turns[0]?.text, 'Bathroom repair need.');
});

test('a second "Use this" mid-conversation never re-seeds an opening turn (only a genuinely fresh conversation gets one)', async () => {
  const calls = [];
  const gateway = {
    createConversation: async () => ({ conversationId: 'c1' }),
    selectCommercialSource: async () => communitySelectionDto(),
    submitTurn: async (id, body) => { calls.push(body); return { message: { text: 'ok' }, components: [], offeredDiscoveryEntityIds: [] }; },
    readContext: async id => ({ conversationId: id, version: 1, entities: [], relationships: [] }),
  };
  const controller = api.agentController.createAgentController(gateway);
  await controller.useCommunitySource({ sourceType: 'COMMUNITY_POST', sourceId: 'obj-1', sourceOwnerKsNumber: 'KS900', openingMessage: 'First need.' });
  assert.equal(calls.length, 1);

  await controller.useCommunitySource({ sourceType: 'OPPORTUNITY', sourceId: 'obj-2', sourceOwnerKsNumber: 'KS901', openingMessage: 'Second opportunity.' });

  assert.equal(calls.length, 1, 'the conversation already has turns -- a second Use this never seeds a second opening message');
  assert.equal(controller.getSnapshot().source?.sourceId, 'obj-1', 'this stub always returns the same fixture selection either way');
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

test('the Community object detail "Use this"/"Start trade with helper" actions are real, never the old placeholder notice', async () => {
  const contents = await readFile('src/features/community/CommunityExperience.tsx', 'utf8');
  assert.match(contents, /onUseThis=\{\(\) => \{/);
  assert.match(contents, /communitySourceFactFor\(state\.selectedRealObject!\)/);
  assert.match(contents, /firstActiveHelper\?\.authorCanonicalKsNumber/);
  // The real object branch's own onToTrade is now the real handler (calls onUseThis with the
  // resolved candidate) -- the placeholder notice remains only on the UNRELATED Store-offer-
  // reference detail branch below it, which has its own separate real "Use this" via Store itself.
  assert.match(contents, /onToTrade=\{\(\) => \{\n\s+const fact = communitySourceFactFor\(state\.selectedRealObject!, firstActiveHelper\?\.authorCanonicalKsNumber \?\? undefined\);/);
});

test('the create-Circle-object "Use this" button is a real, additive prop on CommunityObjectDetail, never removed from the byte-identical fixture path', async () => {
  const contents = await readFile('src/components/CommunityObjectDetail.tsx', 'utf8');
  assert.match(contents, /onUseThis\?: \(\) => void/);
  assert.match(contents, /\{onUseThis && \(/);
});

test('never a second Agreement/handoff engine: Community source selection stays inside the existing gateway.selectCommercialSource call', async () => {
  const contents = await readFile('src/features/agent/controller.ts', 'utf8');
  assert.match(contents, /async function attemptCommunitySourceSelection/);
  assert.match(contents, /gateway\.selectCommercialSource\(conversationId, \{/);
  assert.doesNotMatch(contents, /gateway\.createHandoff\(/);
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
