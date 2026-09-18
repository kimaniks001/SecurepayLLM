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
    assert.equal(html.includes('Confirmed'), status === 'CONFIRMED');
    if (status === 'FUTURE') assert.match(html, /Unknown state/);
  }
});
test('preview keeps backend prose and disclaimer; unknown rich types preserve top-level message', () => {
  const view = api.agentResponseView({ ...response, components: [{ type: 'FUTURE', data: {} }, { type: 'AGREEMENT_PREVIEW', data: { what: ['Tiling'], who: ['Peter (being considered)'], money: ['Candidate amount'], when: [], stillWorthSettling: ['Date'], disclaimer: 'Not an Agreement' } }] });
  assert.equal(view.message.text, response.message);
  assert.equal(view.components.length, 1);
  const html = api.renderToStaticMarkup(api.createElement(api.AgreementPreviewCard, { data: view.components[0] }));
  assert.match(html, /being considered/);
  assert.match(html, /Not an Agreement/);
});
// Final Phase 3 completion pass, Section 8 -- the real, server-composed AGREEMENT_WORKSPACE/
// AGREEMENTS_HOME structured artifacts. The model decides whether asking the tool was useful; the
// server owns every fact. This proves the adapter parses real backend shapes correctly and never
// fabricates a value for a malformed/unexpected one (falls through, matching every other type).
test('AGREEMENT_WORKSPACE component parses real backend shape and renders evidence/milestones/money', () => {
  const workspace = {
    title: 'Villa roofing', status: 'PARTICIPANTS_JOINING',
    milestones: [{ title: 'Roofing', effectiveState: 'WAITING', waitingReason: 'waiting on site inspection' }],
    moneyPositions: [{ currency: 'KES', fundedTotalMinor: 100000, exercisedOrSettledMinor: 40000, remainingFundedMinor: 60000 }],
    upcomingEvents: [{ title: 'Site visit', eventType: 'INSPECTION_SITE_VISIT', occursAt: '2026-09-20T00:00:00Z' }],
    tags: ['Home'],
    problems: [],
    evidence: [{ evidenceType: 'PHOTO', description: 'Roof after repair', contentType: 'image/jpeg', status: 'SUBMITTED', submittedAt: '2026-09-19T00:00:00Z' }],
  };
  const view = api.agentComponentView({ type: 'AGREEMENT_WORKSPACE', data: workspace });
  assert.equal(view.type, 'AGREEMENT_WORKSPACE');
  const html = api.renderToStaticMarkup(api.createElement(api.AgentUnderstoodCard, { workspace: view.workspace }));
  assert.match(html, /waiting on site inspection/);
  assert.match(html, /KES 600\.00 still protected|600\.00/);
  assert.match(html, /Roof after repair/);
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
  // Phase 4 discovery is never implemented here -- the seam exists, but carries no Store/Community data.
  assert.doesNotMatch(html, /Store|Community/i);
});
test('touched locked components retain byte-identical fixture markup against Bolt', async () => {
  const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConversationWorkspace } from './src/components/ConversationWorkspace';
import { ContextPanel } from './src/components/ContextPanel';
import { AgreementPreviewCard } from './src/components/AgreementPreview';
const understanding = Object.fromEntries(['job','scope','location','people','price','timing','materials'].map(key => [key, { label:key, value:'', state:'unknown' }]));
const noop = () => {};
export const markup = [
 React.createElement(ConversationWorkspace, { turns:[], understanding, isThinking:false, onSend:noop }),
 React.createElement(ContextPanel, { lastRichResponses:[], understanding, selectedProviderId:null, onSelectProvider:noop, panelTitle:'Understanding', panelMode:'understanding' }),
 React.createElement(AgreementPreviewCard, { data:{ type:'AGREEMENT_PREVIEW', title:'Tiling', what:['Tile bathroom'], who:[{name:'Peter',role:'provider'}], money:{amount:'KES 100',note:'candidate'}, when:'Tomorrow', stillToSettle:['Scope'] } })
].map(renderToStaticMarkup);`;
  const touched = /src\/components\/(ConversationWorkspace|ContextPanel|AgreementPreview)\.tsx$/;
  async function render(baseline) {
    const result = await build({ stdin:{ contents:entry, resolveDir:process.cwd() }, bundle:true, write:false, format:'cjs', platform:'node', jsx:'automatic', plugins: baseline ? [{ name:'bolt', setup(builder) { builder.onLoad({filter:touched}, args => ({contents:execFileSync('git',['show',`bolt-reference-pass11:${args.path.slice(process.cwd().length + 1)}`],{encoding:'utf8'}), loader:'tsx'})); } }] : [] });
    const mod = {exports:{}};
    new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
    return mod.exports.markup;
  }
  assert.deepEqual(await render(false), await render(true));
});

// SignedOutHome's canonical SecurePay brand mark (README.txt-approved: docs/CODEX_TASK_BRAND_VISUAL_CONSTITUTION.md)
// is an explicitly approved correction to the locked Bolt experience, so it is checked separately from
// the byte-identical set above: the old AgentIcon-as-logo glyph must be gone and the canonical asset
// must be in its place, while the surrounding headline/subheading/input/example-prompts stay untouched.
test('SignedOutHome retains byte-identical fixture markup against Bolt outside the canonical brand mark swap', async () => {
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
  assert.notEqual(current, baseline, 'expected the canonical brand mark swap to change SignedOutHome markup');
  assert.doesNotMatch(current, /M6 27c0-5\.5 4\.5-10 10-10s10 4\.5 10 10/);
  assert.match(baseline, /M6 27c0-5\.5 4\.5-10 10-10s10 4\.5 10 10/);
  assert.match(current, /<img[^>]*alt="SecurePay by KEYMAN/);
  for (const text of [
    'What are you trying to make happen?',
    'Tell SecurePay what you need',
    'I need someone to tile my bathroom',
  ]) {
    assert.ok(current.includes(text), `expected current markup to still include ${JSON.stringify(text)}`);
    assert.ok(baseline.includes(text), `expected Bolt baseline markup to still include ${JSON.stringify(text)}`);
  }
});
