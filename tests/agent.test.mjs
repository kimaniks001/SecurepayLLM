import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
const bundle = await build({ stdin: { contents: `
export * from './src/features/agent/controller';
export * from './src/api/securepay';
export * from './src/api/securepay/http';
export * from './src/api/securepay/agent/adapters';
export * from './src/features/agent/TradeContext';
export * from './src/components/AgreementPreview';
export * from './src/components/AgentUnderstoodCard';
export * from './src/components/AgentAgreementsHomeCard';
export * from './src/components/UnderstoodTruthSections';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
// CJS lets React's server renderer use Node builtins without adding dependencies.
const { createRequire } = await import('node:module');
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const api = module.exports;
const response = { message: 'Let’s talk', components: [], contextualPanel: null, contextUpdates: [], suggestedActions: [] };
const context = (state = 'CANDIDATE') => ({ conversationId: 'c', version: 1, entities: [{ id: 'amount', type: 'AMOUNT', name: 'KES 100', state, attributes: { sourceKind: 'QUOTATION' } }], relationships: [] });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function setup(overrides = {}) {
  const calls = [];
  const gateway = {
    createConversation: async () => { calls.push('create'); return { conversationId: 'c' }; },
    submitTurn: async (id, body) => { calls.push(['turn', id, body]); return response; },
    readContext: async () => { calls.push('context'); return context(); },
    adoptFact: async (id, body) => { calls.push(['adopt', id, body]); return context('CONFIRMED'); },
    ...overrides,
  };
  let counter = 0;
  return { calls, controller: api.createAgentController(gateway, () => `id-${++counter}`) };
}
test('intent persists synchronously; conversation creation precedes first turn; rapid sends are serialized', async () => {
  const pending = deferred();
  const { controller, calls } = setup({ createConversation: () => pending.promise });
  const sending = controller.send('My bathroom needs tiles');
  assert.equal(controller.getSnapshot().turns[0].text, 'My bathroom needs tiles');
  assert.equal(controller.getSnapshot().conversationId, null);
  assert.deepEqual(calls, []);
  await controller.send('duplicate click');
  pending.resolve({ conversationId: 'c' });
  await sending;
  assert.equal(calls[0][0], 'turn');
  assert.equal(calls[0][1], 'c');
  assert.equal(controller.getSnapshot().turns.length, 2);
});
test('creation failure retains intent; explicit retry creates before submitting without another user bubble', async () => {
  let attempts = 0;
  const { controller, calls } = setup({ createConversation: async () => { if (++attempts === 1) throw new api.ApiError('network', 'offline'); return { conversationId: 'c' }; } });
  await controller.send('hello');
  const id = controller.getSnapshot().pending.body.clientTurnId;
  assert.equal(calls.length, 0);
  await controller.retry();
  assert.equal(calls[0][2].clientTurnId, id);
  assert.equal(controller.getSnapshot().turns.length, 2);
});
test('network, timeout, 404 and unavailable retain failed turns and reuse clientTurnId only on explicit retry', async () => {
  for (const error of [new api.ApiError('network', 'offline'), new api.ApiError('timeout', 'timeout'), new api.ApiError('http', 'missing', 404), new api.ApiError('http', 'unavailable', 503)]) {
    const bodies = [];
    const { controller } = setup({ submitTurn: async (_id, body) => { bodies.push(body); if (bodies.length === 1) throw error; return response; } });
    await controller.send('hello');
    assert.equal(bodies.length, 1);
    assert.equal(controller.getSnapshot().turns.length, 1);
    assert.ok(controller.getSnapshot().error);
    await controller.retry();
    assert.deepEqual(bodies[0], bodies[1]);
    assert.equal(controller.getSnapshot().turns.length, 2);
  }
});
test('explicit adoption makes one HTTP POST, refreshes context and renders backend-confirmed result', async () => {
  const calls = [];
  let adopted = false;
  const client = api.createSecurePayApi('https://api.example', () => null, async (url, init) => {
    calls.push({ url, method: init.method, body: init.body && JSON.parse(init.body) });
    if (url.endsWith('/facts/adopt')) adopted = true;
    const result = url.endsWith('/turns') ? response : url.endsWith('/conversations') ? { conversationId: 'c' } : context(adopted ? 'CONFIRMED' : 'CANDIDATE');
    return new Response(JSON.stringify(result));
  });
  const controller = api.createAgentController(client.agent);
  await controller.send('hello');
  assert.equal(calls.some(call => call.url.endsWith('/facts/adopt')), false);
  const adoption = controller.adopt('amount', 'ENTITY');
  await controller.adopt('amount', 'ENTITY');
  await adoption;
  const posts = calls.filter(call => call.url.endsWith('/facts/adopt'));
  assert.equal(posts.length, 1);
  assert.equal(posts[0].method, 'POST');
  assert.equal(posts[0].body.targetId, 'amount');
  assert.equal(calls.at(-1).url, 'https://api.example/api/agent/conversations/c/context');
  assert.equal(controller.getSnapshot().context.data.confirmed.length, 1);
  await controller.adopt('amount', 'ENTITY');
  assert.equal(calls.filter(call => call.url.endsWith('/facts/adopt')).length, 1);
  const before = calls.length;
  await controller.review();
  assert.equal(calls.length, before + 1);
  assert.ok(calls.at(-1).url.endsWith('/context'));
  assert.equal(calls.some(call => /handoff|auth|agreements/.test(call.url)), false);
});
test('failed context refresh never repeats successful adoption or claims current confirmation', async () => {
  let reads = 0;
  const { controller, calls } = setup({ readContext: async () => { if (++reads === 2) throw Error('offline'); return context(); } });
  await controller.send('hello');
  await controller.adopt('amount', 'ENTITY');
  assert.equal(controller.getSnapshot().pending, null);
  assert.equal(controller.getSnapshot().context.status, 'error');
  assert.equal(controller.getSnapshot().context.data, null);
  await controller.retry();
  await controller.review();
  assert.equal(calls.filter(call => call[0] === 'adopt').length, 1);
});
test('candidate and unknown context render distinct labels, provenance, and only candidate Use this', () => {
  for (const status of ['CANDIDATE', 'CONFIRMED', 'FUTURE']) {
    const { controller } = setup();
    const state = { ...controller.getSnapshot(), context: { status: 'ready', data: api.tradeContextView(context(status)) } };
    const html = api.renderToStaticMarkup(api.createElement(api.TradeContext, { state, controller, expanded: true, onToggle() {} }));
    assert.match(html, /QUOTATION/);
    assert.equal(html.includes('Use this'), status === 'CANDIDATE');
    // Final Phase 3 question-focused pass (Section 6): a conversation-confirmed Trade Context fact
    // must never carry the literal word "Confirmed" -- the whole TradeContext card is rendered
    // under the top-level STILL TO DECIDE section, and that label would visually contradict it by
    // implying promoted, canonical Agreement truth. "Known in this conversation" is used instead.
    assert.equal(html.includes('Known in this conversation'), status === 'CONFIRMED');
    assert.equal(html.includes('Confirmed'), false);
    if (status === 'FUTURE') assert.match(html, /Unknown state/);
  }
});
// Final Phase 4 Economy Turn 2 (Section 10) -- provenance, never authority: TradeContext must show
// where the conversation is currently proceeding from, without implying the source was accepted.
test('TradeContext shows real "Started from" source provenance when a commercial source was selected', () => {
  const { controller } = setup();
  const state = {
    ...controller.getSnapshot(),
    context: { status: 'idle', data: null, error: null },
    source: {
      sourceType: 'STORE_LISTING', sourceId: 'offer-1', sourceTitle: 'CCTV installation', sourceOwnerKsNumber: 'KS007',
      contextReference: '#/store/KS007/offer/offer-1', capturedPriceMinor: 8500000, capturedCurrency: 'KES',
      selectedAt: '2026-09-19T00:00:00Z',
    },
  };
  const html = api.renderToStaticMarkup(api.createElement(api.TradeContext, { state, controller, expanded: true, onToggle() {} }));
  assert.match(html, /Started from/);
  assert.match(html, /CCTV installation/);
  assert.match(html, /KS007/);
});
test('TradeContext shows no "Started from" line for an ordinary direct conversation with no selected source', () => {
  const { controller } = setup();
  const state = { ...controller.getSnapshot(), context: { status: 'idle', data: null, error: null } };
  const html = api.renderToStaticMarkup(api.createElement(api.TradeContext, { state, controller, expanded: true, onToggle() {} }));
  assert.doesNotMatch(html, /Started from/);
});
test('preview keeps backend prose and disclaimer; unknown rich types preserve top-level message', () => {
  const view = api.agentResponseView({ ...response, components: [{ type: 'FUTURE', data: {} }, { type: 'AGREEMENT_PREVIEW', data: { what: ['Tiling'], who: ['Peter (being considered)'], money: ['Candidate amount'], when: [], stillWorthSettling: ['Date'], disclaimer: 'Not an Agreement' } }] });
  assert.equal(view.message.text, response.message);
  assert.equal(view.components.length, 1);
  const html = api.renderToStaticMarkup(api.createElement(api.AgreementPreviewCard, { data: view.components[0] }));
  assert.match(html, /being considered/);
  assert.match(html, /Not an Agreement/);
});
// Final Phase 4 Economy pass (sections 8/9/10/42) -- the existing Agent market-discovery tools
// (search_securepay_providers/search_securepay_store_listings/get_price_context/
// get_provider_profile) already compose real PROVIDER_RESULTS/PROVIDER_PROFILE/PRICE_CONTEXT
// components server-side. These parse into the shared 'DISCOVERY' shape via discoveryView, which
// is the exact routing key AgentExperience.tsx uses to place real discovery results in UNDERSTOOD's
// FOUND ON SECUREPAY section instead of inline in BUILD -- this proves that routing key is produced
// correctly from a real backend shape, never fabricated by the frontend.
test('PROVIDER_RESULTS/PRICE_CONTEXT component data parses into the DISCOVERY shape that routes to FOUND ON SECUREPAY', () => {
  const providerResults = api.agentComponentView({
    type: 'PROVIDER_RESULTS',
    data: { kind: 'PROVIDERS', supported: true, providerCount: 1, providers: [{ providerRef: 'KS007', displayName: 'Kamau Hardware', serviceArea: 'Nyeri' }] },
  });
  assert.equal(providerResults.type, 'DISCOVERY');
  assert.match(providerResults.title, /People to consider/);

  const priceContext = api.agentComponentView({
    type: 'PRICE_CONTEXT',
    data: { category: 'roofing sheets', location: 'Nyeri', unit: 'listing', lowMinor: 50000, highMinor: 90000, medianMinor: 70000, currency: 'KES', sampleSize: 4, sourceType: 'LIVE_LISTINGS', asOf: '2026-09-20T08:00:00Z' },
  });
  assert.equal(priceContext.type, 'DISCOVERY');
  assert.equal(priceContext.title, 'Price context');
});
// Final Phase 3 completion pass, Section 8 -- the real, server-composed AGREEMENT_WORKSPACE/
// AGREEMENTS_HOME structured artifacts. The model decides whether asking the tool was useful; the
// server owns every fact. This proves the adapter parses real backend shapes correctly and never
// fabricates a value for a malformed/unexpected one (falls through, matching every other type).
test('AGREEMENT_WORKSPACE component parses real backend shape and renders evidence/milestones/money', () => {
  const workspace = {
    title: 'Villa roofing', status: 'PARTICIPANTS_JOINING', version: 3,
    milestones: [{ title: 'Roofing', effectiveState: 'WAITING', waitingReason: 'waiting on site inspection' }],
    moneyPositions: [{ currency: 'KES', fundedTotalMinor: 100000, exercisedOrSettledMinor: 40000, remainingFundedMinor: 60000 }],
    upcomingEvents: [{ title: 'Site visit', eventType: 'INSPECTION_SITE_VISIT', occursAt: '2026-09-20T00:00:00Z' }],
    tags: ['Home'],
    problems: [],
    evidence: [{ evidenceType: 'PHOTO', description: 'Roof after repair', contentType: 'image/jpeg', status: 'SUBMITTED', submittedAt: '2026-09-19T00:00:00Z' }],
    activity: [],
  };
  const view = api.agentComponentView({ type: 'AGREEMENT_WORKSPACE', data: workspace });
  assert.equal(view.type, 'AGREEMENT_WORKSPACE');
  const html = api.renderToStaticMarkup(api.createElement(api.AgentUnderstoodCard, { workspace: view.workspace }));
  assert.match(html, /waiting on site inspection/);
  assert.match(html, /KES 600\.00 still protected|600\.00/);
  assert.match(html, /Roof after repair/);
});
// Final Phase 3 question-focused pass, Section 5/8 -- the frontend must use the server-returned
// focus, never infer it from the question, and must never show an unrelated section even if it
// were somehow non-empty. Proves each named focus renders only its own section.
test('AGREEMENT_WORKSPACE focus=EVIDENCE renders only evidence, never unrelated Money/Calendar/Milestones', () => {
  const workspace = {
    focus: 'EVIDENCE', title: 'Villa roofing', status: 'PARTICIPANTS_JOINING', version: 3,
    milestones: [{ title: 'Roofing', effectiveState: 'WAITING', waitingReason: 'waiting on site inspection' }],
    moneyPositions: [{ currency: 'KES', fundedTotalMinor: 100000, exercisedOrSettledMinor: 40000, remainingFundedMinor: 60000 }],
    upcomingEvents: [{ title: 'Site visit', eventType: 'INSPECTION_SITE_VISIT', occursAt: '2026-09-20T00:00:00Z' }],
    tags: [], problems: [],
    evidence: [{ evidenceType: 'PHOTO', description: 'Roof after repair', contentType: 'image/jpeg', status: 'SUBMITTED', submittedAt: '2026-09-19T00:00:00Z' }],
    activity: [{ activityType: 'MILESTONE_COMPLETED', occurredAt: '2026-09-18T00:00:00Z' }],
  };
  const view = api.agentComponentView({ type: 'AGREEMENT_WORKSPACE', data: workspace });
  const html = api.renderToStaticMarkup(api.createElement(api.AgentUnderstoodCard, { workspace: view.workspace }));
  assert.match(html, /Roof after repair/);
  assert.doesNotMatch(html, /waiting on site inspection/);
  assert.doesNotMatch(html, /still protected/);
  assert.doesNotMatch(html, /Site visit/);
  assert.doesNotMatch(html, /milestone completed/);
});
test('AGREEMENT_WORKSPACE focus=CALENDAR renders only the upcoming event, never unrelated Evidence/Money', () => {
  const workspace = {
    focus: 'CALENDAR', title: 'Villa roofing', status: 'PARTICIPANTS_JOINING', version: 3,
    milestones: [{ title: 'Roofing', effectiveState: 'WAITING', waitingReason: 'waiting on site inspection' }],
    moneyPositions: [{ currency: 'KES', fundedTotalMinor: 100000, exercisedOrSettledMinor: 40000, remainingFundedMinor: 60000 }],
    upcomingEvents: [{ title: 'Site visit', eventType: 'INSPECTION_SITE_VISIT', occursAt: '2026-09-20T00:00:00Z' }],
    tags: [], problems: [],
    evidence: [{ evidenceType: 'PHOTO', description: 'Roof after repair', contentType: 'image/jpeg', status: 'SUBMITTED', submittedAt: '2026-09-19T00:00:00Z' }],
    activity: [],
  };
  const view = api.agentComponentView({ type: 'AGREEMENT_WORKSPACE', data: workspace });
  const html = api.renderToStaticMarkup(api.createElement(api.AgentUnderstoodCard, { workspace: view.workspace }));
  assert.match(html, /Site visit/);
  assert.doesNotMatch(html, /waiting on site inspection/);
  assert.doesNotMatch(html, /still protected/);
  assert.doesNotMatch(html, /Roof after repair/);
});
test('AGREEMENT_WORKSPACE focus=MONEY renders only Phase-2-backed Money, never unrelated Evidence/Calendar', () => {
  const workspace = {
    focus: 'MONEY', title: 'Villa roofing', status: 'PARTICIPANTS_JOINING', version: 3,
    milestones: [{ title: 'Roofing', effectiveState: 'WAITING', waitingReason: 'waiting on site inspection' }],
    moneyPositions: [{ currency: 'KES', fundedTotalMinor: 100000, exercisedOrSettledMinor: 40000, remainingFundedMinor: 60000 }],
    upcomingEvents: [{ title: 'Site visit', eventType: 'INSPECTION_SITE_VISIT', occursAt: '2026-09-20T00:00:00Z' }],
    tags: [], problems: [],
    evidence: [{ evidenceType: 'PHOTO', description: 'Roof after repair', contentType: 'image/jpeg', status: 'SUBMITTED', submittedAt: '2026-09-19T00:00:00Z' }],
    activity: [],
  };
  const view = api.agentComponentView({ type: 'AGREEMENT_WORKSPACE', data: workspace });
  const html = api.renderToStaticMarkup(api.createElement(api.AgentUnderstoodCard, { workspace: view.workspace }));
  assert.match(html, /still protected/);
  assert.doesNotMatch(html, /waiting on site inspection/);
  assert.doesNotMatch(html, /Site visit/);
  assert.doesNotMatch(html, /Roof after repair/);
});
test('AGREEMENT_WORKSPACE unrecognized/missing focus safely falls back to FULL rendering', () => {
  const workspace = {
    title: 'Villa roofing', status: 'PARTICIPANTS_JOINING', version: 3,
    milestones: [], moneyPositions: [{ currency: 'KES', fundedTotalMinor: 100000, exercisedOrSettledMinor: 40000, remainingFundedMinor: 60000 }],
    upcomingEvents: [], tags: [], problems: [], evidence: [], activity: [],
  };
  const view = api.agentComponentView({ type: 'AGREEMENT_WORKSPACE', data: workspace });
  assert.equal(view.workspace.focus, 'FULL');
  const html = api.renderToStaticMarkup(api.createElement(api.AgentUnderstoodCard, { workspace: view.workspace }));
  assert.match(html, /still protected/);
});
// Final Phase 3 focus-semantics pass -- OVERVIEW must render real overview truth (title/status/
// version), never a blank card, even though it carries no per-topic fact section.
test('AGREEMENT_WORKSPACE focus=OVERVIEW visibly renders title/status/version, never blank', () => {
  const workspace = {
    focus: 'OVERVIEW', title: 'Villa roofing', status: 'PARTICIPANTS_JOINING', version: 3,
    milestones: [{ title: 'Roofing', effectiveState: 'WAITING', waitingReason: 'waiting on site inspection' }],
    moneyPositions: [{ currency: 'KES', fundedTotalMinor: 100000, exercisedOrSettledMinor: 40000, remainingFundedMinor: 60000 }],
    upcomingEvents: [], tags: [], problems: [], evidence: [], activity: [],
  };
  const view = api.agentComponentView({ type: 'AGREEMENT_WORKSPACE', data: workspace });
  const html = api.renderToStaticMarkup(api.createElement(api.AgentUnderstoodCard, { workspace: view.workspace }));
  assert.match(html, /Villa roofing/);
  assert.match(html, /v3/);
  assert.doesNotMatch(html, /waiting on site inspection/);
  assert.doesNotMatch(html, /still protected/);
});
// Final Phase 3 focus-semantics pass (Section 4 correction) -- "Show me the milestones." must show
// EVERY milestone in its actual state, not only the ones currently WAITING.
test('AGREEMENT_WORKSPACE focus=MILESTONES renders READY/IN_PROGRESS/COMPLETED as well as WAITING', () => {
  const workspace = {
    focus: 'MILESTONES', title: 'Villa roofing', status: 'PARTICIPANTS_JOINING', version: 3,
    milestones: [
      { title: 'Foundation', effectiveState: 'COMPLETED', waitingReason: null },
      { title: 'Framing', effectiveState: 'IN_PROGRESS', waitingReason: null },
      { title: 'Roofing', effectiveState: 'WAITING', waitingReason: 'waiting on site inspection' },
      { title: 'Painting', effectiveState: 'READY', waitingReason: null },
    ],
    moneyPositions: [], upcomingEvents: [], tags: [], problems: [], evidence: [], activity: [],
  };
  const view = api.agentComponentView({ type: 'AGREEMENT_WORKSPACE', data: workspace });
  const html = api.renderToStaticMarkup(api.createElement(api.AgentUnderstoodCard, { workspace: view.workspace }));
  assert.match(html, /Foundation/);
  assert.match(html, /COMPLETED/);
  assert.match(html, /Framing/);
  assert.match(html, /IN_PROGRESS/);
  assert.match(html, /Roofing/);
  assert.match(html, /waiting on site inspection/);
  assert.match(html, /Painting/);
  assert.match(html, /READY/);
});
// Final Phase 3 focus-semantics pass (Section 2 correction) -- focus=ACTIVITY must render real
// activity, never fall back to a blank/FULL card.
test('AGREEMENT_WORKSPACE focus=ACTIVITY renders activity and no unrelated sections', () => {
  const workspace = {
    focus: 'ACTIVITY', title: 'Villa roofing', status: 'PARTICIPANTS_JOINING', version: 3,
    milestones: [{ title: 'Roofing', effectiveState: 'WAITING', waitingReason: 'waiting on site inspection' }],
    moneyPositions: [{ currency: 'KES', fundedTotalMinor: 100000, exercisedOrSettledMinor: 40000, remainingFundedMinor: 60000 }],
    upcomingEvents: [], tags: [], problems: [], evidence: [],
    activity: [{ activityType: 'MILESTONE_COMPLETED', occurredAt: '2026-09-18T00:00:00Z' }],
  };
  const view = api.agentComponentView({ type: 'AGREEMENT_WORKSPACE', data: workspace });
  const html = api.renderToStaticMarkup(api.createElement(api.AgentUnderstoodCard, { workspace: view.workspace }));
  assert.match(html, /milestone completed/);
  assert.doesNotMatch(html, /waiting on site inspection/);
  assert.doesNotMatch(html, /still protected/);
});
test('AGREEMENT_WORKSPACE component falls through (never fabricates) on a malformed shape', () => {
  const view = api.agentComponentView({ type: 'AGREEMENT_WORKSPACE', data: { title: 'Missing everything else' } });
  assert.equal(view, null);
});
test('AGREEMENTS_HOME component parses real backend shape and renders needs-attention/money', () => {
  const home = {
    needsAttention: [{ title: 'Roofing', status: 'ACTIVE', nextDeadline: '2026-09-20T00:00:00Z', tags: ['Home'] }],
    waitingOnOthers: [], problems: [], recentlyCompleted: [], upcoming: [], recentActivity: [],
    moneyByCurrency: [{ currency: 'KES', fundedTotalMinor: 100000, exercisedOrSettledMinor: 40000, releasedTotalMinor: 10000, remainingFundedMinor: 50000, positionCount: 2 }],
  };
  const view = api.agentComponentView({ type: 'AGREEMENTS_HOME', data: home });
  assert.equal(view.type, 'AGREEMENTS_HOME');
  const html = api.renderToStaticMarkup(api.createElement(api.AgentAgreementsHomeCard, { home: view.home }));
  assert.match(html, /Roofing/);
  assert.match(html, /500\.00 still protected/);
});
test('AGREEMENTS_HOME focus=NEEDS_ATTENTION renders only that section, never unrelated Money/Activity', () => {
  const home = {
    focus: 'NEEDS_ATTENTION',
    needsAttention: [{ title: 'Roofing', status: 'ACTIVE', nextDeadline: '2026-09-20T00:00:00Z', tags: ['Home'] }],
    waitingOnOthers: [], problems: [], recentlyCompleted: [], upcoming: [], recentActivity: [],
    moneyByCurrency: [{ currency: 'KES', fundedTotalMinor: 100000, exercisedOrSettledMinor: 40000, releasedTotalMinor: 10000, remainingFundedMinor: 50000, positionCount: 2 }],
  };
  const view = api.agentComponentView({ type: 'AGREEMENTS_HOME', data: home });
  const html = api.renderToStaticMarkup(api.createElement(api.AgentAgreementsHomeCard, { home: view.home }));
  assert.match(html, /Roofing/);
  assert.doesNotMatch(html, /still protected/);
});
test('AGREEMENTS_HOME focus=RECENT_ACTIVITY renders only recent activity, never unrelated Needs-you', () => {
  const home = {
    focus: 'RECENT_ACTIVITY',
    needsAttention: [{ title: 'Roofing', status: 'ACTIVE', nextDeadline: '2026-09-20T00:00:00Z', tags: ['Home'] }],
    waitingOnOthers: [], problems: [], recentlyCompleted: [], upcoming: [],
    recentActivity: [{ agreementTitle: 'Roofing', activityType: 'MILESTONE_COMPLETED', occurredAt: '2026-09-18T00:00:00Z' }],
    moneyByCurrency: [],
  };
  const view = api.agentComponentView({ type: 'AGREEMENTS_HOME', data: home });
  const html = api.renderToStaticMarkup(api.createElement(api.AgentAgreementsHomeCard, { home: view.home }));
  assert.match(html, /milestone completed/);
  assert.doesNotMatch(html, /Needs you/);
});
// Final Phase 3 focus-semantics pass (exact-tag correction) -- "show Agreements tagged Home" must
// render exactly the backend's already-narrowed Home-only result, never every tagged Agreement.
// The frontend never re-filters by tag itself; it renders whatever the backend's exact tagLabel
// match already returned.
test('AGREEMENTS_HOME focus=TAGGED renders exactly the backend-filtered Home tag result', () => {
  const home = {
    focus: 'TAGGED',
    needsAttention: [{ title: 'Roofing', status: 'ACTIVE', nextDeadline: '2026-09-20T00:00:00Z', tags: ['Home'] }],
    waitingOnOthers: [], problems: [],
    recentlyCompleted: [{ title: 'Fence repair', status: 'COMPLETED', nextDeadline: null, tags: ['Home'] }],
    upcoming: [], recentActivity: [], moneyByCurrency: [],
  };
  const view = api.agentComponentView({ type: 'AGREEMENTS_HOME', data: home });
  const html = api.renderToStaticMarkup(api.createElement(api.AgentAgreementsHomeCard, { home: view.home }));
  assert.match(html, /Roofing/);
  assert.match(html, /Fence repair/);
  assert.doesNotMatch(html, /Office lease/);
  assert.doesNotMatch(html, /Vacation plan/);
});
test('AGREEMENTS_HOME component falls through (never fabricates) on a malformed shape', () => {
  const view = api.agentComponentView({ type: 'AGREEMENTS_HOME', data: { needsAttention: 'not-an-array' } });
  assert.equal(view, null);
});
// Final Phase 3 completion pass, Section 7 -- UNDERSTOOD's locked truth vocabulary is visually
// explicit: CONFIRMED (canonical backend truth) vs STILL TO DECIDE (candidate/proposed) vs FOUND ON
// SECUREPAY (a real presentation seam reserved for Phase 4, never populated in Phase 3).
test('UnderstoodTruthSections renders the CONFIRMED / STILL TO DECIDE / FOUND ON SECUREPAY vocabulary', () => {
  const html = api.renderToStaticMarkup(api.createElement(api.UnderstoodTruthSections, {
    confirmed: api.createElement('div', null, 'real backend fact'),
    stillToDecide: api.createElement('div', null, 'candidate fact'),
  }));
  assert.match(html, /Confirmed/);
  assert.match(html, /Still to decide/);
  assert.match(html, /Found on SecurePay/);
  assert.match(html, /real backend fact/);
  assert.match(html, /candidate fact/);
  // Final Phase 4 Economy pass: when the caller supplies no foundOnSecurePay content (no discovery
  // component on the latest turn), the seam renders its own empty state rather than any Store/
  // Community data or disappearing.
  assert.match(html, /Nothing found yet/);
  assert.doesNotMatch(html, /Store|Community/i);
});
// Final Phase 4 Economy pass (sections 8/9/42): once the model has invoked a real market-discovery
// tool, UNDERSTOOD's FOUND ON SECUREPAY section must render that real result -- discovery truth,
// never promoted into CONFIRMED, and distinct from the empty-state text.
test('UnderstoodTruthSections renders real foundOnSecurePay discovery content when supplied', () => {
  const html = api.renderToStaticMarkup(api.createElement(api.UnderstoodTruthSections, {
    confirmed: null,
    stillToDecide: null,
    foundOnSecurePay: api.createElement('div', null, 'Kamau Hardware · KS007'),
  }));
  assert.match(html, /Found on SecurePay/);
  assert.match(html, /Kamau Hardware/);
  assert.doesNotMatch(html, /Nothing found yet/);
});
test('touched locked components retain byte-identical fixture markup against Bolt', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConversationWorkspace } from './src/components/ConversationWorkspace';
import { AgreementPreviewCard } from './src/components/AgreementPreview';
const understanding = Object.fromEntries(['job','scope','location','people','price','timing','materials'].map(key => [key, { label:key, value:'', state:'unknown' }]));
const noop = () => {};
export const markup = [
 React.createElement(ConversationWorkspace, { turns:[], understanding, isThinking:false, onSend:noop }),
 React.createElement(AgreementPreviewCard, { data:{ type:'AGREEMENT_PREVIEW', title:'Tiling', what:['Tile bathroom'], who:[{name:'Peter',role:'provider'}], money:{amount:'KES 100',note:'candidate'}, when:'Tomorrow', stillToSettle:['Scope'] } })
].map(renderToStaticMarkup);`;
  const touched = /src\/components\/(ConversationWorkspace|AgreementPreview)\.tsx$/;
  async function render(baseline) {
    const result = await build({ stdin:{ contents:entry, resolveDir:process.cwd() }, bundle:true, write:false, format:'cjs', platform:'node', jsx:'automatic', loader: { '.png': 'dataurl' }, plugins: baseline ? [{ name:'bolt', setup(builder) { builder.onLoad({filter:touched}, args => ({contents:execFileSync('git',['show',`bolt-reference-pass11:${args.path.slice(process.cwd().length + 1)}`],{encoding:'utf8'}), loader:'tsx'})); } }] : [] });
    const mod = {exports:{}};
    new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
    return mod.exports.markup;
  }
  assert.deepEqual(await render(false), await render(true));
});

// Phase 6 convergence -- ContextPanel's empty-state icon was a second, independently hand-drawn
// instance of the same generic circle+shoulders silhouette as the old AgentIcon (found by fresh
// archaeology; not previously called out in any phase doc). Now checked separately from the
// byte-identical set above, exactly like SignedOutHome/SignedInHome's own brand-mark tests below.
test('ContextPanel empty state retains byte-identical fixture markup against Bolt outside the canonical brand mark swap', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContextPanel } from './src/components/ContextPanel';
const understanding = Object.fromEntries(['job','scope','location','people','price','timing','materials'].map(key => [key, { label:key, value:'', state:'unknown' }]));
const noop = () => {};
export const markup = renderToStaticMarkup(React.createElement(ContextPanel, { lastRichResponses: [], understanding, selectedProviderId: null, onSelectProvider: noop, panelTitle: 'What SecurePay understands', panelMode: 'understanding' }));`;
  const touched = /src\/components\/ContextPanel\.tsx$/;
  async function render(baseline) {
    const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' }, plugins: baseline ? [{ name: 'bolt', setup(builder) { builder.onLoad({ filter: touched }, args => ({ contents: execFileSync('git', ['show', `bolt-reference-pass11:${args.path.slice(process.cwd().length + 1)}`], { encoding: 'utf8' }), loader: 'tsx' })); } }] : [] });
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
    return mod.exports.markup;
  }
  const current = await render(false);
  const baseline = await render(true);
  assert.notEqual(current, baseline, "expected the canonical brand mark swap to change ContextPanel's empty-state markup");
  assert.doesNotMatch(current, /M6 27c0-5\.5 4\.5-10 10-10s10 4\.5 10 10/);
  assert.match(baseline, /M6 27c0-5\.5 4\.5-10 10-10s10 4\.5 10 10/);
  assert.match(current, /<img[^>]*src="data:image\/png/);
  for (const text of ['As you talk, relevant people, prices, and details will appear here.']) {
    assert.ok(current.includes(text), `expected current markup to still include ${JSON.stringify(text)}`);
    assert.ok(baseline.includes(text), `expected Bolt baseline markup to still include ${JSON.stringify(text)}`);
  }
});

// SignedOutHome's canonical SecurePay brand mark (README.txt-approved: docs/CODEX_TASK_BRAND_VISUAL_CONSTITUTION.md)
// is an explicitly approved correction to the locked Bolt experience, so it is checked separately from
// the byte-identical set above: the old AgentIcon-as-logo glyph must be gone and the canonical asset
// must be in its place, while the surrounding input/example-prompts stay untouched. Phase 6 convergence
// additionally re-locks the headline/supporting-text copy itself (task doctrine: exact locked text,
// not a paraphrase) and adds the quiet Fair Trade affordance beneath the input.
test('SignedOutHome retains byte-identical fixture markup against Bolt outside the canonical brand mark swap and locked copy correction', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignedOutHome } from './src/components/SignedOutHome';
const noop = () => {};
export const markup = renderToStaticMarkup(React.createElement(SignedOutHome, { onStart: noop }));`;
  const touched = /src\/components\/SignedOutHome\.tsx$/;
  async function render(baseline) {
    const result = await build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' }, plugins: baseline ? [{ name: 'bolt', setup(builder) { builder.onLoad({ filter: touched }, args => ({ contents: execFileSync('git', ['show', `bolt-reference-pass11:${args.path.slice(process.cwd().length + 1)}`], { encoding: 'utf8' }), loader: 'tsx' })); } }] : [] });
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
    return mod.exports.markup;
  }
  const current = await render(false);
  const baseline = await render(true);
  assert.notEqual(current, baseline, 'expected the canonical brand mark swap and locked copy correction to change SignedOutHome markup');
  assert.doesNotMatch(current, /M6 27c0-5\.5 4\.5-10 10-10s10 4\.5 10 10/);
  assert.match(baseline, /M6 27c0-5\.5 4\.5-10 10-10s10 4\.5 10 10/);
  assert.match(current, /<img[^>]*alt="SecurePay by KEYMAN/);
  // The old paraphrased headline/supporting text must be gone from current, but is expected to
  // still exist in the untouched Bolt baseline (proving the diff is really the locked-copy fix).
  assert.ok(!current.includes('What are you trying to make happen?'), 'expected the old paraphrased headline to be replaced');
  assert.ok(baseline.includes('What are you trying to make happen?'), 'expected Bolt baseline to still have the old headline');
  assert.ok(current.includes('Tell SecurePay what you&#x27;re trying to make happen.'), 'expected the exact locked headline (React-escaped apostrophe in static markup)');
  assert.ok(current.includes('It helps you bring the people, plans and agreements together so everyone knows what happens next — and money can follow what was agreed.'), 'expected the exact locked supporting text');
  assert.ok(current.includes('Guided by the 12 principles of fair trade'), 'expected the quiet Fair Trade affordance beneath the input');
  assert.ok(!current.includes('Fair trader score') && !/\d+\/12/.test(current), 'must never grade the person with a fair trade score');
  for (const text of ['I need someone to tile my bathroom']) {
    assert.ok(current.includes(text), `expected current markup to still include ${JSON.stringify(text)}`);
    assert.ok(baseline.includes(text), `expected Bolt baseline markup to still include ${JSON.stringify(text)}`);
  }
});

test('retry wording is truthful for each pending operation: message, Use this, amount', () => {
  assert.equal(api.retryLabel({ kind: 'turn', body: { message: 'x' } }), 'Retry message');
  assert.equal(api.retryLabel({ kind: 'adopt', body: { targetId: 'a', targetKind: 'ENTITY' } }), 'Retry Use this');
  assert.equal(api.retryLabel({ kind: 'external-amount', body: { sourceKind: 'STORE_LISTING', amount: '1' } }), 'Retry amount');
  assert.equal(api.retryLabel(null), 'Retry message');
});

// KS001 Upgrade Phase 2 final acceptance correction (item 1) -- conversationHistoryView is the ONE place
// the raw /history response is validated; a malformed entry is dropped, never fabricated.
test('conversationHistoryView preserves order and drops a malformed entry rather than fabricating it', () => {
  const entries = api.conversationHistoryView({ entries: [
    { id: 'h1', sender: 'HUMAN', text: 'Hello', occurredAt: '2026-01-01T00:00:00Z' },
    { id: 'h2', sender: 'ROBOT', text: 'should be dropped -- unrecognised sender', occurredAt: '2026-01-01T00:00:01Z' },
    { id: 'h3', sender: 'KS001', text: 'Hi there', occurredAt: '2026-01-01T00:00:02Z' },
    { id: 'h4', sender: 'HUMAN', text: 42, occurredAt: '2026-01-01T00:00:03Z' },
  ] });
  assert.equal(entries.length, 2);
  assert.equal(entries[0].sender, 'HUMAN');
  assert.equal(entries[0].text, 'Hello');
  assert.equal(entries[1].sender, 'KS001');
  assert.equal(entries[1].text, 'Hi there');
});
test('conversationHistoryView returns an empty list, never throwing, on a missing/malformed response', () => {
  assert.deepEqual(api.conversationHistoryView(null), []);
  assert.deepEqual(api.conversationHistoryView({}), []);
  assert.deepEqual(api.conversationHistoryView({ entries: 'nope' }), []);
});
