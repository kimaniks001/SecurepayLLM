import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
// UI Phase 1 -- Conversational Workbench. Pure-model tests plus static renders of the REAL production components.
const bundle = await build({ stdin: { contents: `
export * from './src/features/conversation/follow';
export * from './src/features/instruments/model';
export * from './src/features/instruments/verify';
export * from './src/features/instruments/controller';
export * from './src/features/workbench/projection';
export { UnderstoodWorkbench } from './src/features/workbench/UnderstoodWorkbench';
export { CalendarInstrument } from './src/features/instruments/ui/CalendarInstrument';
export { InstrumentPrompt } from './src/features/instruments/ui/InstrumentPrompt';
export * from './src/api/securepay/agent/ksidentity';
export * from './src/api/securepay/agent/instruments';
export * from './src/api/securepay/agent/adapters';
export * from './src/features/agent/controller';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
const { createRequire } = await import('node:module');
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const api = module.exports;
const ent = (id, type, name, state = 'CONFIRMED', attributes = {}) => ({ id, type, name, state, confidence: 1, attributes });
const rel = (id, kind, subjectEntityId, qualifiers, state = 'CONFIRMED') => ({ id, kind, subjectEntityId, objectEntityId: null, qualifiers, state, confidence: 1 });
const ctx = (entities, relationships) => api.tradeContextView({ conversationId: 'c', version: 3, entities, relationships });

// ---------------------------------------------------------------- AUTO FOLLOW
test('follow: sending always re-engages following; a reply while following keeps it', () => {
  let s = api.followReducer({ following: false, unread: true }, { type: 'sent' });
  assert.deepEqual(s, { following: true, unread: false });
  assert.deepEqual(api.followReducer(s, { type: 'reply' }), s);
});
test('follow: deliberately scrolling up releases following; a reply then raises "New reply" instead of moving the reader', () => {
  const up = { scrollTop: 100, clientHeight: 500, scrollHeight: 1500 };
  let s = api.followReducer(api.initialFollow, { type: 'scrolled', metrics: up });
  assert.equal(s.following, false);
  s = api.followReducer(s, { type: 'reply' });
  assert.deepEqual(s, { following: false, unread: true });
  assert.deepEqual(api.followReducer(s, { type: 'jump' }), { following: true, unread: false });
});
test('follow: hysteresis -- small drift near the bottom does not release; only returning near the bottom re-engages and clears unread', () => {
  const drift = { scrollTop: 1000 - 40, clientHeight: 500, scrollHeight: 1500 }; // 40px from bottom
  assert.equal(api.followReducer(api.initialFollow, { type: 'scrolled', metrics: drift }).following, true);
  const reading = { scrollTop: 1000 - 300, clientHeight: 500, scrollHeight: 1500 };
  let s = api.followReducer(api.initialFollow, { type: 'scrolled', metrics: reading });
  s = api.followReducer(s, { type: 'reply' });
  const between = { scrollTop: 1000 - 80, clientHeight: 500, scrollHeight: 1500 }; // released, not yet within STICK_PX
  assert.equal(api.followReducer(s, { type: 'scrolled', metrics: between }).following, false);
  const back = { scrollTop: 1000 - 10, clientHeight: 500, scrollHeight: 1500 };
  assert.deepEqual(api.followReducer(s, { type: 'scrolled', metrics: back }), { following: true, unread: false });
});
test('follow: a short reply scrolls to the bottom; a reply taller than the viewport starts at its first line', () => {
  const m = { clientHeight: 500, scrollHeight: 2000 };
  assert.deepEqual(api.replyScrollTop({ top: 1800, height: 150 }, m), { top: 1500, pinnedToReplyStart: false });
  const long = api.replyScrollTop({ top: 900, height: 1100 }, m);
  assert.equal(long.pinnedToReplyStart, true);
  assert.equal(long.top, 888);
});
test('follow: ConversationSurface uses refs, layout effects and a ResizeObserver -- no timeouts', async () => {
  const src = await readFile('src/features/conversation/ConversationSurface.tsx', 'utf8');
  assert.doesNotMatch(src, /setTimeout|setInterval/);
  assert.match(src, /useLayoutEffect/); assert.match(src, /ResizeObserver/); assert.match(src, /New reply/);
  assert.match(src, /aria-live="polite"/);
});

// ---------------------------------------------------------------- AMOUNT
test('amount: decimal strings only, comma/space tolerant, precision and zero rules', () => {
  assert.deepEqual(api.parseAmount('4,000'), { ok: true, value: '4000' });
  assert.deepEqual(api.parseAmount('4 000.50'), { ok: true, value: '4000.5' });
  assert.deepEqual(api.parseAmount('0004000.00'), { ok: true, value: '4000' });
  for (const bad of ['1.234', '-5', '1e5', 'abc', '1.2.3', '9999999999999']) assert.equal(api.parseAmount(bad).ok, false, bad);
  assert.equal(api.parseAmount('0').reason, 'zero'); assert.equal(api.parseAmount('').reason, 'empty');
  assert.equal(api.groupAmount('1234567.5'), '1,234,567.50');
  assert.equal(api.formatMoney('9007199254740993', 'KES'), 'KES 9,007,199,254,740,993'); // beyond Number.MAX_SAFE_INTEGER -- never a float
  assert.equal(api.sameAmount('4,000', '4000.00'), true);
});
test('amount: a correction names the previous amount so the backend applies its own correction rule; a first amount does not', () => {
  const spec = { kind: 'money', origin: 'understood', amount: '4000', currency: 'KES' };
  assert.equal(api.statementFor(spec, { kind: 'money', amount: '5,000', currency: 'KES' }, { previousAmount: '4000', previousCurrency: 'KES' }), 'Correction: the amount is KES 5,000, not KES 4,000.');
  assert.equal(api.statementFor({ kind: 'money', origin: 'add' }, { kind: 'money', amount: '5000', currency: 'KES' }), 'The amount is KES 5,000.');
  assert.equal(api.statementFor({ kind: 'money', origin: 'add' }, { kind: 'money', amount: 'abc', currency: 'KES' }), null);
});

// ---------------------------------------------------------------- DATE
test('calendar: no hard-coded year/month anywhere in the production date code', async () => {
  for (const f of ['src/features/instruments/model.ts', 'src/features/instruments/ui/CalendarInstrument.tsx']) {
    const src = await readFile(f, 'utf8');
    assert.doesNotMatch(src, /\b20[2-9]\d\b(?!-)/, `${f} must not embed a year`);
    assert.doesNotMatch(src, /October 2026|useState\(2026\)|useState\(9\)/);
  }
});
test('calendar: real month grids from injected clock; ambiguous weekday detection; date reading', () => {
  assert.equal(api.todayIso(new Date(2031, 1, 9)), '2031-02-09');
  const grid = api.monthGrid(2026, 8); // September 2026 starts on a Tuesday
  assert.equal(grid[0][0], null); assert.equal(grid[0][1].iso, '2026-09-01');
  assert.equal(grid.flat().filter(Boolean).length, 30);
  assert.equal(api.monthGrid(2028, 1).flat().filter(Boolean).length, 29); // leap year
  assert.equal(api.ambiguousWeekday('Friday'), 5); assert.equal(api.ambiguousWeekday('next friday'), 5);
  assert.equal(api.ambiguousWeekday('Friday, 25 September 2026'), null); assert.equal(api.ambiguousWeekday('25 September'), null);
  assert.equal(api.readDateText('25 September 2026', '2026-01-01'), '2026-09-25');
  assert.equal(api.readDateText('Friday', '2026-09-20'), null);
});
test('calendar: renders the injected month with the real weekday candidates marked, and no silent selection', () => {
  const html = api.renderToStaticMarkup(api.createElement(api.CalendarInstrument, { spec: { kind: 'when', origin: 'agent', currentText: 'Friday' }, draft: { kind: 'when', date: null, time: '' }, onChange() {}, disabled: false, today: '2031-02-09' }));
  assert.match(html, /February 2031/); assert.match(html, /Fridays are marked/); assert.match(html, /Choose a day/);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 0);
  assert.equal((html.match(/, a Friday"/g) ?? []).length, 4);
});
test('date statements: a specific date, an optional time, a range; a bare-weekday predecessor is not quoted as a correction', () => {
  const when = { kind: 'when', origin: 'agent' };
  assert.equal(api.statementFor(when, { kind: 'when', date: '2026-09-25', time: '15:00' }), 'The date is Friday, 25 September 2026 at 3:00 pm.');
  assert.equal(api.statementFor({ ...when, currentText: 'Friday' }, { kind: 'when', date: '2026-09-25', time: '' }, { previousDateText: 'Friday' }), 'The date is Friday, 25 September 2026.');
  assert.equal(api.statementFor(when, { kind: 'when', date: '2026-09-25', time: '' }, { previousDateText: '1 September 2026' }), 'Correction: the date is Friday, 25 September 2026, not 1 September 2026.');
  assert.equal(api.statementFor({ kind: 'when-range', origin: 'agent' }, { kind: 'when-range', start: '2026-10-01', end: '2026-10-05' }), 'The dates are from Thursday, 1 October 2026 to Monday, 5 October 2026.');
  assert.equal(api.statementFor(when, { kind: 'when', date: null, time: '' }), null);
});

// ---------------------------------------------------------------- KS FINDER
test('ks: normalises like the backend parser; malformed never leaves the browser', () => {
  assert.deepEqual(api.normalizeKsNumber(' ks 003 '), { ok: true, value: 'KS003' });
  assert.deepEqual(api.normalizeKsNumber('KS1234'), { ok: true, value: 'KS1234' });
  for (const bad of ['', 'KS', 'KS12', 'K003', 'KS000', 'KS00A', '003']) assert.equal(api.normalizeKsNumber(bad).ok, false, bad);
});
test('ks: only the participant-safe projection survives; internal id/sequence/timestamps are dropped; inactive is not usable', () => {
  const wire = { identityId: 'uuid', canonicalKsNumber: 'KS003', sequenceNumber: 3, identityType: 'INDIVIDUAL', status: 'ACTIVE', displayName: ' Wanjiru ', createdAt: 'x', updatedAt: 'y' };
  const view = api.ksIdentityView(wire, 'KS003');
  assert.deepEqual(view, { ksNumber: 'KS003', displayName: 'Wanjiru', kind: 'INDIVIDUAL', active: true });
  assert.equal(JSON.stringify(view).includes('uuid'), false);
  assert.equal(api.ksIdentityView({ ...wire, status: 'SUSPENDED' }, 'KS003').active, false);
  assert.equal(api.ksIdentityView({ ...wire, identityType: 'SYSTEM' }, 'KS003').kind, null);
  assert.equal(api.ksIdentityView({ ...wire, canonicalKsNumber: 'KS004' }, 'KS003'), null); // response for a different number is never shown
});
test('ks: a KS Number implies no role -- a statement needs BOTH a resolved KS and a role the person chose', () => {
  const spec = { kind: 'who', origin: 'add' };
  assert.equal(api.statementFor(spec, { kind: 'who', ks: 'KS003', role: '' }), null);
  assert.equal(api.statementFor(spec, { kind: 'who', ks: '', role: 'seller' }), null);
  assert.equal(api.statementFor(spec, { kind: 'who', ks: 'KS003', role: 'seller' }), 'KS003 is the seller.');
  assert.equal(api.statementFor({ kind: 'who', origin: 'understood', entityName: 'John' }, { kind: 'who', ks: 'KS003', role: 'seller' }), 'KS003 is John, a seller in this.');
});
test('ks: no invitation/agreement/join/confirm/money call is reachable from any instrument or workbench source', async () => {
  for (const f of ['src/features/instruments/controller.ts', 'src/features/instruments/model.ts', 'src/features/workbench/projection.ts', 'src/features/instruments/ui/WhoInstrument.tsx', 'src/features/instruments/ui/InstrumentHost.tsx']) {
    const src = await readFile(f, 'utf8');
    assert.doesNotMatch(src, /issueInvitation|createHandoff|adoptHandoff|continueHandoff|confirmVersion|agreementGateway|api\.agreements|gateway\.join|paymentIntent|moneyGateway|fund\(|release\(/, f);
  }
});

// ---------------------------------------------------------------- AGENT COMPONENT BRIDGE
test('bridge: each safe model-proposable component parses to ONE instrument prompt', () => {
  const kinds = { PERSON_PICKER: 'who', KSNUMBER_PICKER: 'who', DATE_PICKER: 'when', DATE_RANGE_PICKER: 'when-range', AMOUNT_INPUT: 'money', LOCATION_PICKER: 'where' };
  for (const [type, instrument] of Object.entries(kinds)) assert.deepEqual(api.agentComponentView({ type, data: {} }), { type: 'INSTRUMENT_PROMPT', instrument, hints: {} }, type);
  assert.deepEqual(api.agentComponentView({ type: 'PHOTO_UPLOAD', data: {} }), { type: 'UNAVAILABLE_INPUT', input: 'photo' });
  assert.deepEqual(api.agentComponentView({ type: 'DOCUMENT_UPLOAD', data: { anything: 'x' } }), { type: 'UNAVAILABLE_INPUT', input: 'document' });
});
test('bridge: hints are optional and strictly validated; nothing else from the payload is trusted', () => {
  const v = api.agentComponentView({ type: 'AMOUNT_INPUT', data: { currency: 'kes', label: 'How much?', date: '2026-02-30', role: 'emperor', people: [{ name: 'Fabricated' }], url: 'https://evil' } });
  assert.deepEqual(v, { type: 'INSTRUMENT_PROMPT', instrument: 'money', hints: { label: 'How much?', currency: 'KES' } });
  assert.equal(JSON.stringify(v).includes('Fabricated'), false);
  assert.deepEqual(api.agentComponentView({ type: 'DATE_PICKER', data: { date: '2026-10-02', label: 'https://x.y' } }).hints, { date: '2026-10-02' });
  assert.deepEqual(api.agentComponentView({ type: 'KSNUMBER_PICKER', data: { role: 'Seller' } }).hints, { role: 'seller' });
});
test('bridge: malformed and unknown components are ignored without throwing and the Agent message survives', () => {
  for (const c of [{ type: 'DATE_PICKER', data: null }, { type: 'DATE_PICKER', data: [] }, { type: 'DATE_PICKER' }, { type: 'FROM_THE_FUTURE', data: {} }, null]) assert.equal(api.agentComponentView(c), null);
  const view = api.agentResponseView({ protocolVersion: '1', message: 'Which Friday?', contextUpdates: [], components: [{ type: 'MESSAGE', data: { text: 'Which Friday?' } }, { type: 'DATE_PICKER', data: null }, { type: 'NEW_THING', data: {} }, { type: 'DATE_PICKER', data: {} }], contextualPanel: null, suggestedActions: [] });
  assert.equal(view.message.text, 'Which Friday?');
  assert.deepEqual(view.components.map(c => c.type), ['MESSAGE', 'INSTRUMENT_PROMPT']);
});
test('bridge: no fixture data (Bolt DatePicker constants, fabricated people) reaches production instrument code', async () => {
  for (const f of ['src/api/securepay/agent/instruments.ts', 'src/features/instruments/ui/CalendarInstrument.tsx', 'src/features/instruments/ui/InstrumentPrompt.tsx', 'src/features/agent/AgentExperience.tsx']) {
    const src = await readFile(f, 'utf8');
    assert.doesNotMatch(src, /mockAgent|demoData|from '..\/..\/components\/(DatePicker|MapCard|LocationPicker|PhotoUpload|ConversationWorkspace|ContextPanel)'/, f);
  }
});

// ---------------------------------------------------------------- TRADE CONTEXT + WORKBENCH
test('trade context: a relationship with NO objectEntityId (backend non_null omits it) is accepted, not "unreadable"', () => {
  const view = ctx([ent('c1', 'CONCEPT', 'value')], [rel('r1', 'PAYMENT_CONDITION', 'c1', { amount: '4000', currency: 'KES' })]);
  assert.equal(view.relationships[0].objectEntityId, null);
  assert.throws(() => api.tradeContextView({ conversationId: 'c', version: 1, entities: [], relationships: [{ id: 'r', kind: 'ROLE', subjectEntityId: 'e', objectEntityId: 5, qualifiers: {}, state: 'CONFIRMED' }] }));
});
const golden = () => ctx(
  [ent('s', 'SERVICE', 'House painting'), ent('john', 'PERSON', 'John', 'CANDIDATE'), ent('v', 'CONCEPT', 'value'), ent('d', 'CONCEPT', 'deadline'), ent('k', 'PERSON', 'KS003', 'CONFIRMED', { ksnumber: 'KS003' })],
  [rel('r1', 'ROLE', 'john', { role: 'SELLER', descriptor: 'seller' }, 'CANDIDATE'), rel('r2', 'ROLE', 'k', { role: 'BUYER' }), rel('r3', 'PAYMENT_CONDITION', 'v', { amount: '20000', currency: 'KES' }), rel('r4', 'CONDITION', 'd', { date: 'Friday' })]);
test('workbench: rows are exactly what the backend holds, each with the right instrument; nothing fabricated', () => {
  const wb = api.projectWorkbench(golden());
  const by = key => wb.items.filter(i => i.key.startsWith(key));
  assert.equal(by('what:')[0].value, 'House painting'); assert.equal(by('what:')[0].spec, null);
  const who = by('who:');
  assert.equal(who.length, 2);
  const john = who.find(i => i.value === 'John'); const ks = who.find(i => i.value === 'KS003');
  assert.equal(john.identityUnresolved, true); assert.deepEqual(john.details, ['Seller']); assert.equal(john.state, 'CANDIDATE');
  assert.equal(john.spec.entityName, 'John'); assert.equal(john.spec.role, 'seller');
  assert.equal(ks.identityUnresolved, false); assert.equal(ks.state, 'CONFIRMED'); assert.equal(ks.spec.entityName, undefined);
  assert.equal(by('when:')[0].value, 'Friday'); assert.equal(by('when:')[0].spec.kind, 'when');
  assert.equal(by('money:')[0].value, 'KES 20,000'); assert.equal(by('money:')[0].spec.amount, '20000');
  assert.equal(wb.items.some(i => i.section === 'where'), false);            // never an invented "Where: not set"
  assert.deepEqual(wb.adds.map(a => a.key), ['where']);                       // only what could really be added
  assert.equal(wb.items.some(i => /deadline|value/.test(i.value) && i.section === 'other'), false); // internal concept entities never surface
});
test('workbench: not a five-field form -- an empty context has no rows; complex money stays conversational; non-money facts are shown', () => {
  const empty = api.projectWorkbench(null);
  assert.equal(empty.empty, true); assert.deepEqual(empty.adds.map(a => a.key), ['who', 'when', 'where', 'money']);
  const plan = api.projectWorkbench(ctx([ent('c', 'CONCEPT', 'contribution'), ent('p', 'PERSON', 'Chama')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '20000', appliesTo: 'each member', frequency: 'monthly' }), rel('q', 'AUTHORITY_RULE', 'c', { rule: 'two of three sign', domain: 'DECISION_QUORUM' })]));
  const money = plan.items.find(i => i.section === 'money');
  assert.equal(money.spec, null); assert.deepEqual(money.details, ['each member', 'monthly']);
  assert.ok(plan.items.some(i => i.section === 'other' && i.value === 'two of three sign'));
});
test('workbench: "being considered" is shown as such and stays a candidate; state is passed through, never derived', () => {
  const wb = api.projectWorkbench(ctx([ent('p', 'PERSON', 'Peter', 'CANDIDATE')], [rel('r', 'ROLE', 'p', { role: 'PROVIDER_CANDIDATE', status: 'CONSIDERED' }, 'CANDIDATE')]));
  const peter = wb.items[0];
  assert.deepEqual(peter.details, ['Being considered']); assert.equal(peter.state, 'CANDIDATE'); assert.equal(peter.spec.role, undefined);
  assert.deepEqual(peter.adopt.map(a => a.targetKind).sort(), ['ENTITY', 'RELATIONSHIP']);
});
test('workbench: an Agent prompt opens the same instrument seeded from what is understood ("Which Friday?")', () => {
  const wb = api.projectWorkbench(golden());
  const spec = api.specForPrompt({ type: 'INSTRUMENT_PROMPT', instrument: 'when', hints: {} }, wb);
  assert.equal(spec.currentText, 'Friday');
  assert.equal(api.specForPrompt({ type: 'INSTRUMENT_PROMPT', instrument: 'who', hints: {} }, wb).entityName, 'John');
  assert.equal(api.specForPrompt({ type: 'INSTRUMENT_PROMPT', instrument: 'money', hints: {} }, api.projectWorkbench(null)).amount, undefined);
});
test('workbench render: actionable rows are buttons; read-only rows are not; candidates say "Suggested"; the word "Confirmed" is never used', () => {
  const state = { conversationId: 'c', turns: [], busy: false, pending: null, error: null, context: { status: 'ready', data: golden(), error: null }, source: null, offerSelectionFailure: null };
  const html = api.renderToStaticMarkup(api.createElement(api.UnderstoodWorkbench, { state, controller: {}, activeSpec: null, onOpen() {}, stillToSettle: ['Where the house is'] }));
  assert.match(html, /aria-label="When: Friday\. Change the date"/); assert.match(html, /aria-label="Money: KES 20,000\. Change the amount"/);
  assert.doesNotMatch(html, /aria-label="What: House painting/);
  assert.match(html, /Suggested/); assert.match(html, /KS Number not set/); assert.match(html, /Use this/);
  assert.doesNotMatch(html, /Confirmed/); assert.match(html, /Where the house is/); assert.match(html, /Not an Agreement/);
});
test('workbench render: an open instrument marks its row aria-expanded', () => {
  const state = { conversationId: 'c', turns: [], busy: false, pending: null, error: null, context: { status: 'ready', data: golden(), error: null }, source: null, offerSelectionFailure: null };
  const spec = api.projectWorkbench(golden()).items.find(i => i.section === 'money').spec;
  const html = api.renderToStaticMarkup(api.createElement(api.UnderstoodWorkbench, { state, controller: {}, activeSpec: spec, onOpen() {} }));
  assert.match(html, /aria-expanded="true"[^>]*aria-label="Money/);
});
test('prompt render: a live prompt is one button; photo/document get an honest note, never a dead upload control', () => {
  const p = api.renderToStaticMarkup(api.createElement(api.InstrumentPrompt, { prompt: { type: 'INSTRUMENT_PROMPT', instrument: 'when', hints: {} }, onOpen() {} }));
  assert.match(p, /Choose a date/);
  const u = api.renderToStaticMarkup(api.createElement(api.InstrumentPrompt, { unavailable: 'photo' }));
  assert.doesNotMatch(u, /<button|<input/); assert.match(u, /can.t be added to SecurePay here yet/);
});

// ---------------------------------------------------------------- VERIFY + INSTRUMENT LIFECYCLE
test('verify: an instrument only counts as recorded when Trade Context really shows it', () => {
  const c = golden();
  assert.equal(api.isRecorded({ kind: 'money' }, { kind: 'money', amount: '20,000', currency: 'KES' }, c), true);
  assert.equal(api.isRecorded({ kind: 'money' }, { kind: 'money', amount: '5000', currency: 'KES' }, c), false);
  assert.equal(api.isRecorded({ kind: 'who' }, { kind: 'who', ks: 'KS003', role: 'seller' }, c), true);
  assert.equal(api.isRecorded({ kind: 'who' }, { kind: 'who', ks: 'KS009', role: 'seller' }, c), false);
  const dated = ctx([ent('d', 'CONCEPT', 'deadline')], [rel('r', 'CONDITION', 'd', { date: 'Friday, 25 September 2026' })]);
  assert.equal(api.isRecorded({ kind: 'when' }, { kind: 'when', date: '2026-09-25', time: '' }, dated), true);
  assert.equal(api.isRecorded({ kind: 'when' }, { kind: 'when', date: '2026-09-26', time: '' }, dated), false);
  assert.equal(api.isRecorded({ kind: 'where' }, { kind: 'where', place: 'Kilimani' }, ctx([ent('p', 'PLACE', 'Kilimani, Nairobi')], [])), true);
});
function fakeAgent({ result, retryOutcome } = {}) {
  const calls = [];
  const snapshot = { pending: null, error: null, context: { status: 'ready', data: null, error: null } };
  return { calls, snapshot, agent: {
    getSnapshot: () => snapshot,
    sendStatement: async text => { calls.push(['statement', text]); return result(); },
    retry: async () => { calls.push(['retry']); Object.assign(snapshot, retryOutcome()); },
    discardFailedTurn: () => calls.push(['discard']),
    review: async () => { calls.push(['review']); },
  } };
}
const moneySpec = { kind: 'money', origin: 'understood', amount: '4000', currency: 'KES' };
test('instrument lifecycle: success closes ONLY after the backend shows the fact; the only call made is one statement', async () => {
  const good = ctx([ent('c', 'CONCEPT', 'value')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '5000', currency: 'KES' })]);
  const { agent, calls } = fakeAgent({ result: () => ({ ok: true, context: good }) });
  const ic = api.createInstrumentController(agent);
  ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5,000', currency: 'KES' });
  await ic.submit();
  assert.deepEqual(calls, [['statement', 'Correction: the amount is KES 5,000, not KES 4,000.']]);
  assert.equal(ic.getSnapshot().active, null);
});
test('instrument lifecycle: sent-but-not-recorded stays open with the draft intact; it is never shown as success', async () => {
  const stale = ctx([ent('c', 'CONCEPT', 'value')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '4000', currency: 'KES' })]);
  const { agent } = fakeAgent({ result: () => ({ ok: true, context: stale }) });
  const ic = api.createInstrumentController(agent);
  ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5000', currency: 'KES' });
  await ic.submit();
  const s = ic.getSnapshot();
  assert.equal(s.phase, 'unrecorded'); assert.equal(s.draft.amount, '5000'); assert.ok(s.active);
  const unreadable = fakeAgent({ result: () => ({ ok: true, context: null }) });
  const ic2 = api.createInstrumentController(unreadable.agent);
  ic2.open(moneySpec); ic2.setDraft({ kind: 'money', amount: '5000', currency: 'KES' }); await ic2.submit();
  assert.equal(ic2.getSnapshot().phase, 'unrecorded');
});
test('instrument lifecycle: backend failure preserves the choice; Retry re-sends the SAME turn; Cancel withdraws the unsent turn', async () => {
  const good = ctx([ent('c', 'CONCEPT', 'value')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '5000', currency: 'KES' })]);
  const fa = fakeAgent({ result: () => ({ ok: false, error: 'SecurePay is unavailable' }), retryOutcome: () => ({ pending: null, error: null, context: { status: 'ready', data: good, error: null } }) });
  const ic = api.createInstrumentController(fa.agent);
  ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5000', currency: 'KES' });
  await ic.submit();
  assert.equal(ic.getSnapshot().phase, 'failed'); assert.equal(ic.getSnapshot().draft.amount, '5000');
  await ic.retry();
  assert.equal(fa.calls.filter(c => c[0] === 'statement').length, 1);      // retry is agent.retry, not a second statement
  assert.deepEqual(fa.calls.at(-1), ['retry']); assert.equal(ic.getSnapshot().active, null);
  const fb = fakeAgent({ result: () => ({ ok: false, error: 'down' }) });
  const ic2 = api.createInstrumentController(fb.agent);
  ic2.open(moneySpec); ic2.setDraft({ kind: 'money', amount: '5000', currency: 'KES' }); await ic2.submit();
  ic2.cancel();
  assert.deepEqual(fb.calls.at(-1), ['discard']); assert.equal(ic2.getSnapshot().active, null);
});
test('instrument lifecycle: state lives in the controller (survives a re-render/tab switch); re-opening keeps the draft; escape hatch never sends', () => {
  const { agent, calls } = fakeAgent({ result: () => ({ ok: true, context: null }) });
  const ic = api.createInstrumentController(agent);
  ic.open({ kind: 'where', origin: 'add' }); ic.setDraft({ kind: 'where', place: 'Kilimani' });
  ic.open({ kind: 'where', origin: 'agent' });                              // same fact, summoned again
  assert.equal(ic.getSnapshot().draft.place, 'Kilimani');
  ic.open({ kind: 'money', origin: 'add' });                                 // a different fact replaces it
  assert.equal(ic.getSnapshot().active.kind, 'money');
  ic.cancel(); assert.equal(ic.getSnapshot().active, null); assert.deepEqual(calls, []);
});

// ---------------------------------------------------------------- AGENT CONTROLLER
function agentSetup(over = {}) {
  const calls = []; let n = 0;
  const gateway = { createConversation: async () => ({ conversationId: 'c' }), submitTurn: async (id, body) => { calls.push(['turn', body]); return { message: 'ok', components: [], contextualPanel: null, contextUpdates: [], suggestedActions: [] }; },
    readContext: async () => ({ conversationId: 'c', version: 2, entities: [], relationships: [{ id: 'r', kind: 'PAYMENT_CONDITION', subjectEntityId: 'e', qualifiers: { amount: '5' }, state: 'CONFIRMED', confidence: 1 }] }),
    adoptFact: async () => ({}), submitAmount: async () => ({}), selectCommercialSource: async () => ({}), ...over };
  return { calls, controller: api.createAgentController(gateway, () => `id-${++n}`) };
}
test('agent controller: a statement is an ordinary turn (same endpoint, clientTurnId), returns the read-back context', async () => {
  const { controller, calls } = agentSetup();
  const result = await controller.sendStatement('The amount is KES 5.');
  assert.equal(result.ok, true); assert.equal(result.context.relationships[0].objectEntityId, null);
  assert.deepEqual(calls, [['turn', { message: 'The amount is KES 5.', clientTurnId: 'id-1' }]]);
  assert.equal(controller.getSnapshot().turns[0].sender, 'user');
});
test('agent controller: a FAILED turn keeps the last-known understanding and can be discarded without touching answered history', async () => {
  let fail = false;
  const { controller } = agentSetup({ submitTurn: async () => { if (fail) throw new Error('offline'); return { message: 'ok', components: [], contextualPanel: null, contextUpdates: [], suggestedActions: [] }; } });
  await controller.send('hello');
  const before = controller.getSnapshot().context.data;
  assert.ok(before);
  fail = true;
  const failed = await controller.sendStatement('The location is Kilimani.');
  assert.equal(failed.ok, false);
  assert.equal(controller.getSnapshot().context.data, before);            // not blanked
  assert.equal(controller.getSnapshot().turns.length, 3);
  controller.discardFailedTurn();
  assert.equal(controller.getSnapshot().turns.length, 2); assert.equal(controller.getSnapshot().pending, null);
  controller.discardFailedTurn();                                          // nothing pending: never removes answered history
  assert.equal(controller.getSnapshot().turns.length, 2);
});
test('agent gateway: KS lookup uses the strict canonical path with optional auth; date/amount external-fact paths remain for external evidence', async () => {
  const src = await readFile('src/api/securepay/agent/index.ts', 'utf8');
  assert.match(src, /lookupKsIdentity: .*\/api\/v1\/identities\/by-ksnumber\/\$\{segment\(canonicalKsNumber\)\}.*auth: 'optional'/);
  assert.match(src, /external-facts\/date/); assert.match(src, /external-facts\/amount/);
});
