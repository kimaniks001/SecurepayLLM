import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
// UI Phase 1/4 -- Conversational Workbench + Capability Convergence. Pure-model tests plus static
// renders of the REAL production components.
const bundle = await build({ stdin: { contents: `
export * from './src/features/conversation/follow';
export * from './src/features/instruments/model';
export * from './src/features/instruments/verify';
export * from './src/features/instruments/controller';
export * from './src/features/workbench/projection';
export { UnderstoodWorkbench } from './src/features/workbench/UnderstoodWorkbench';
export { CalendarInstrument } from './src/features/instruments/ui/CalendarInstrument';
export { InstrumentPrompt } from './src/features/instruments/ui/InstrumentPrompt';
export { WhoInstrument } from './src/features/instruments/ui/WhoInstrument';
export * from './src/api/securepay/agent/ksformat';
export * from './src/api/securepay/agent/roles';
export * from './src/api/securepay/agent/instruments';
export * from './src/api/securepay/agent/adapters';
export * from './src/features/agent/controller';
export { ApiError } from './src/api/securepay/http';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic' });
const { createRequire } = await import('node:module');
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const api = module.exports;
const ent = (id, type, name, state = 'CONFIRMED', attributes = {}) => ({ id, type, name, state, confidence: 1, attributes });
const rel = (id, kind, subjectEntityId, qualifiers, state = 'CONFIRMED') => ({ id, kind, subjectEntityId, objectEntityId: null, qualifiers, state, confidence: 1 });
const ctx = (entities, relationships, version = 3) => api.tradeContextView({ conversationId: 'c', version, entities, relationships });

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

// ---------------------------------------------------------------- KS FORMAT + WHO
test('KS format: only the real platform shape (KS + 3-or-more digits, positive sequence) is recognised -- no legacy 9-digit shape, no zero-padding', () => {
  assert.equal(api.isValidKsNumber('KS003'), true);
  assert.equal(api.isValidKsNumber('KS000000003'), true); // 9 digits is still ALSO a valid platform number -- the legacy shape is retired, not "the other" format
  for (const bad of ['', 'KS', 'KS12', 'K003', 'KS000', '003']) assert.equal(api.isValidKsNumber(bad), false, bad);
  assert.equal(api.normalizeKs('ks 003'), 'KS003');
});
test('ADD PERSON: a bounded, multi-word name and a known role produce ADD_PARTICIPANT_CANDIDATE -- never a chat sentence', () => {
  const spec = { kind: 'who', origin: 'add', takenNames: [] };
  const body = api.structuredInputFor(spec, { kind: 'who', name: 'Ray Otieno', role: 'Seller', ks: '', participantType: 'PERSON' });
  assert.deepEqual(body, { type: 'ADD_PARTICIPANT_CANDIDATE', participantType: 'PERSON', name: 'Ray Otieno', roleFreeText: 'Seller' });
  assert.equal(api.canonicalRole('seller'), 'SELLER');
  assert.deepEqual(api.structuredInputFor(spec, { kind: 'who', name: 'Peter', role: 'contractor', ks: '', participantType: 'PERSON' }),
    { type: 'ADD_PARTICIPANT_CANDIDATE', participantType: 'PERSON', name: 'Peter', roleFreeText: 'contractor' }); // SERVICE_PROVIDER
});
test('ADD PERSON/ORGANIZATION: the person\'s own explicit choice decides participantType -- never hard-coded PERSON (Phase 4 review correction, Section 15A)', () => {
  const spec = { kind: 'who', origin: 'add', takenNames: [] };
  assert.deepEqual(api.structuredInputFor(spec, { kind: 'who', name: 'Maua Shoes', role: 'seller', ks: '', participantType: 'ORGANIZATION' }),
    { type: 'ADD_PARTICIPANT_CANDIDATE', participantType: 'ORGANIZATION', name: 'Maua Shoes', roleFreeText: 'seller' });
  assert.deepEqual(api.structuredInputFor(spec, { kind: 'who', name: 'Ray', role: 'seller', ks: '', participantType: 'PERSON' }),
    { type: 'ADD_PARTICIPANT_CANDIDATE', participantType: 'PERSON', name: 'Ray', roleFreeText: 'seller' });
});
test('ADD PERSON: only a real name and a real role produce a structured action; taken names and unknown roles produce nothing', () => {
  const spec = { kind: 'who', origin: 'add', takenNames: ['John'] };
  assert.equal(api.structuredInputFor(spec, { kind: 'who', name: 'john', role: 'buyer', ks: '' }), null); // already held: re-adding is a separate targetEntityId edit
  assert.equal(api.structuredInputFor(spec, { kind: 'who', name: 'Mary', role: 'service provider', ks: '' }), null); // backend would file it as OTHER
  assert.equal(api.structuredInputFor(spec, { kind: 'who', name: 'Mary', role: '', ks: '' }), null);
  assert.equal(api.structuredInputFor(spec, { kind: 'who', name: '', role: 'seller', ks: '' }), null);
  assert.equal(api.parsePersonName('John', ['john']).reason, 'taken');
  assert.equal(api.parsePersonName('x'.repeat(201)).reason, 'too-long');
});
test('ADD PERSON: an existing candidate with a targetEntityId produces ASSIGN_ROLE, never a second ADD -- and the name field is irrelevant to it', () => {
  const spec = { kind: 'who', origin: 'understood', targetEntityId: 'john-1', currentName: 'John' };
  assert.deepEqual(api.structuredInputFor(spec, { kind: 'who', name: '', role: 'buyer', ks: '' }), { type: 'ASSIGN_ROLE', targetEntityId: 'john-1', roleFreeText: 'buyer' });
});
test('ADD PERSON read-back: the SAME PERSON entity must hold the canonical ROLE; nothing weaker closes it', () => {
  const c = ctx([ent('j', 'PERSON', 'John', 'CONFIRMED'), ent('m', 'PERSON', 'Mary', 'CONFIRMED'), ent('p', 'PLACE', 'Anna')],
    [rel('r1', 'ROLE', 'j', { role: 'SELLER', descriptor: 'seller' }), rel('r2', 'ROLE', 'm', { role: 'BUYER' }), rel('r3', 'ROLE', 'p', { role: 'SELLER' })]);
  const spec = { kind: 'who', origin: 'add', takenNames: [] };
  const rec = (name, role) => api.isRecorded(spec, { kind: 'who', name, role, ks: '' }, c);
  assert.equal(rec('John', 'seller'), true);
  assert.equal(rec('John', 'buyer'), false);      // right person, wrong role (the buyer is Mary)
  assert.equal(rec('Mary', 'seller'), false);     // the seller role exists, but on another entity
  assert.equal(rec('Anna', 'seller'), false);     // a PLACE named Anna is not a person
  assert.equal(rec('Zed', 'seller'), false);      // not present
  const candidate = ctx([ent('j', 'PERSON', 'John', 'CANDIDATE')], [rel('r', 'ROLE', 'j', { role: 'SELLER' }, 'CANDIDATE')]);
  assert.equal(api.isRecorded(spec, { kind: 'who', name: 'John', role: 'seller', ks: '' }, candidate), true);
  assert.equal(api.isRecorded(spec, { kind: 'who', name: 'John', role: 'seller', ks: '' }, ctx([ent('j', 'PERSON', 'John')], [])), false);
});
test('ADD PERSON via ASSIGN_ROLE read-back: the targeted entity id itself must carry the canonical role', () => {
  const spec = { kind: 'who', origin: 'understood', targetEntityId: 'e1' };
  const withRole = ctx([ent('e1', 'PERSON', 'John', 'CANDIDATE')], [rel('r', 'ROLE', 'e1', { role: 'BUYER' }, 'CANDIDATE')]);
  assert.equal(api.isRecorded(spec, { kind: 'who', name: '', role: 'buyer', ks: '' }, withRole), true);
  assert.equal(api.isRecorded(spec, { kind: 'who', name: '', role: 'seller', ks: '' }, withRole), false);
});
test('KS route: PERSON_PICKER and KSNUMBER_PICKER both open the Who instrument -- KS resolution is real, never an unavailable note', () => {
  assert.deepEqual(api.agentComponentView({ type: 'KSNUMBER_PICKER', data: {} }), { type: 'INSTRUMENT_PROMPT', instrument: 'who', hints: {} });
  assert.deepEqual(api.agentComponentView({ type: 'PERSON_PICKER', data: { role: 'seller' } }), { type: 'INSTRUMENT_PROMPT', instrument: 'who', hints: { role: 'seller' } });
  const spec = api.specForPrompt({ type: 'INSTRUMENT_PROMPT', instrument: 'who', hints: { role: 'seller' } }, api.projectWorkbench(null)).spec;
  assert.equal(spec.kind, 'who'); assert.equal(spec.role, 'seller');
});
test('a still-CANDIDATE existing person/organization row is directly editable (role correction, and KS binding if unresolved); a CONFIRMED row is read-only', () => {
  const wb = api.projectWorkbench(ctx([ent('j', 'PERSON', 'John', 'CANDIDATE')], [rel('r', 'ROLE', 'j', { role: 'SELLER' }, 'CANDIDATE')]));
  assert.equal(wb.items[0].spec.kind, 'who'); assert.equal(wb.items[0].spec.targetEntityId, 'j'); assert.equal(wb.items[0].spec.currentName, 'John');
  const confirmedWb = api.projectWorkbench(ctx([ent('a', 'PERSON', 'Anna', 'CONFIRMED', { ksnumber: 'KS003' })], [rel('r', 'ROLE', 'a', { role: 'BUYER' })]));
  assert.equal(confirmedWb.items[0].spec, null);
  const add = wb.adds.find(a => a.key === 'who'); assert.deepEqual(add.spec.takenNames, ['John']);
});

test('roles: UI vocabulary maps to real backend canonical roles; "service provider" is NOT offered (backend would file it as OTHER)', () => {
  assert.equal(api.KNOWN_ROLES.includes('service provider'), false);
  assert.deepEqual([api.canonicalRole('contractor'), api.canonicalRole('supplier'), api.canonicalRole('Seller'), api.canonicalRole('service provider')], ['SERVICE_PROVIDER', 'SERVICE_PROVIDER', 'SELLER', null]);
  for (const w of api.KNOWN_ROLES) assert.notEqual(api.canonicalRole(w), 'OTHER');
});
const whoCtx = (over = {}) => ctx(
  [ent('john', 'PERSON', 'John', 'CANDIDATE'), ent('ks', 'PERSON', 'Anna', 'CONFIRMED', { ksnumber: 'KS003' }), ...(over.entities ?? [])],
  [rel('r1', 'ROLE', 'john', { role: 'SELLER', descriptor: 'seller' }, 'CANDIDATE'), rel('r2', 'ROLE', 'ks', { role: 'BUYER', descriptor: 'buyer' }), ...(over.relationships ?? [])]);
test('WHO read-back: KS + role must be on the SAME entity and the role must be the selected canonical role', () => {
  const who = (ks, role, entityName) => api.isWhoLinked(whoCtx(), { ks, role, entityName });
  assert.equal(who('KS003', 'buyer'), true);                       // correct KS + correct role, same entity
  assert.equal(who('KS003', 'seller'), false);                     // correct KS + wrong role (the KS holder is the BUYER; John is the seller)
  assert.equal(who('KS009', 'buyer'), false);                      // wrong KS + correct role elsewhere
  assert.equal(who('KS003', 'seller', 'John'), false);             // the same role on ANOTHER entity does not count for the KS entity
  assert.equal(who('KS003', 'buyer', 'John'), false);              // intended entity has no KS
  assert.equal(api.isWhoLinked(whoCtx(), { ks: '', role: 'seller' }), false);           // unresolved identity
  const linked = ctx([ent('j', 'PERSON', 'John', 'CANDIDATE', { ksnumber: 'KS003' })], [rel('r', 'ROLE', 'j', { role: 'SERVICE_PROVIDER', descriptor: 'contractor' }, 'CANDIDATE')]);
  assert.equal(api.isWhoLinked(linked, { ks: 'KS003', role: 'contractor', entityName: 'John' }), true);   // candidate state does not change linkage truth
  const confirmed = ctx([ent('j', 'PERSON', 'John', 'CONFIRMED', { ksnumber: 'KS003' })], [rel('r', 'ROLE', 'j', { role: 'SERVICE_PROVIDER' }, 'CONFIRMED')]);
  assert.equal(api.isWhoLinked(confirmed, { ks: 'KS003', role: 'supplier' }), true);
  const kinOnly = ctx([ent('j', 'PERSON', 'John', 'CONFIRMED', { ksnumber: 'KS003' })], []);
  assert.equal(api.isWhoLinked(kinOnly, { ks: 'KS003', role: 'seller' }), false);  // KS without any role relationship
  assert.equal(api.isWhoLinked(kinOnly, { ks: 'KS003', role: '' }), true);         // resolution alone (no role requested) is still proven
});

// ---------------------------------------------------------------- KS visibility & re-binding (Phase 4 final closeout, Sections 2/4)
test('WHO: a resolved identity visibly shows its KS Number in UNDERSTOOD, never an internal id -- "Maua Shoes / KS003 / Seller"', () => {
  const resolved = ctx([ent('e', 'ORGANIZATION', 'Maua Shoes', 'CANDIDATE', { ksnumber: 'KS003', identityResolved: 'true' })],
    [rel('r', 'ROLE', 'e', { role: 'SELLER' }, 'CANDIDATE')]);
  const wb = api.projectWorkbench(resolved);
  const row = wb.items.find(i => i.section === 'people');
  assert.equal(row.value, 'Maua Shoes');
  assert.deepEqual(row.details, ['KS003', 'Seller']);
  assert.doesNotMatch(JSON.stringify(row), /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i); // no internal UUID leaked into the row
});
test('WHO: a plain candidate with no verified identity shows no KS Number detail', () => {
  const plain = ctx([ent('j', 'PERSON', 'John', 'CANDIDATE')], [rel('r', 'ROLE', 'j', { role: 'SELLER' }, 'CANDIDATE')]);
  const row = api.projectWorkbench(plain).items.find(i => i.section === 'people');
  assert.deepEqual(row.details, ['Seller']);
});
test('WHO spec: identityResolved is carried through so the instrument can refuse to offer re-binding', () => {
  const resolved = ctx([ent('e', 'ORGANIZATION', 'Maua Shoes', 'CANDIDATE', { ksnumber: 'KS003', identityResolved: 'true' })], []);
  const row = api.projectWorkbench(resolved).items.find(i => i.section === 'people');
  assert.equal(row.spec.identityResolved, true);
  const unresolved = ctx([ent('j', 'PERSON', 'John', 'CANDIDATE')], []);
  const unresolvedRow = api.projectWorkbench(unresolved).items.find(i => i.section === 'people');
  assert.equal(unresolvedRow.spec.identityResolved, false);
});

// ---------------------------------------------------------------- MONEY (multi-currency)
test('amount: decimal strings only, comma/space tolerant, precision and zero rules', () => {
  assert.deepEqual(api.parseAmount('4,000'), { ok: true, value: '4000' });
  assert.deepEqual(api.parseAmount('4 000.50'), { ok: true, value: '4000.5' });
  for (const bad of ['1.234', '-5', '1e5', 'abc', '1.2.3', '9999999999999']) assert.equal(api.parseAmount(bad).ok, false, bad);
  assert.equal(api.parseAmount('0').reason, 'zero'); assert.equal(api.parseAmount('').reason, 'empty');
  assert.equal(api.formatMoney('9007199254740993', 'KES'), 'KES 9,007,199,254,740,993');
  assert.equal(api.sameAmount('4,000', '4000.00'), true);
  assert.equal(api.isCurrencyCode('KES'), true); assert.equal(api.isCurrencyCode('USD'), true);
  assert.equal(api.isCurrencyCode('kes'), false); assert.equal(api.isCurrencyCode('KE'), false); assert.equal(api.isCurrencyCode(''), false);
});
test('MONEY: any real currency code is accepted (Phase 4 removes the old KES-only assumption); a new amount with no target creates a context-wide SET_AMOUNT', () => {
  const spec = { kind: 'money', origin: 'add' };
  assert.deepEqual(api.structuredInputFor(spec, { kind: 'money', amount: '4000', currency: 'USD' }), { type: 'SET_AMOUNT', amount: '4000', currency: 'USD' });
  assert.deepEqual(api.structuredInputFor(spec, { kind: 'money', amount: '800', currency: 'EUR' }), { type: 'SET_AMOUNT', amount: '800', currency: 'EUR' });
  assert.equal(api.structuredInputFor(spec, { kind: 'money', amount: 'abc', currency: 'KES' }), null);
  assert.equal(api.structuredInputFor(spec, { kind: 'money', amount: '100', currency: 'kes' }), null); // must already be uppercase-shaped
});
test('MONEY: editing an existing UNDERSTOOD row targets that exact relationship id (SET_AMOUNT, targetRelationshipId)', () => {
  const spec = { kind: 'money', origin: 'understood', amount: '4000', currency: 'KES', targetRelationshipId: 'r1' };
  assert.deepEqual(api.structuredInputFor(spec, { kind: 'money', amount: '4,500', currency: 'KES' }), { type: 'SET_AMOUNT', targetRelationshipId: 'r1', amount: '4500', currency: 'KES' });
});
test('money read-back: amount AND currency must both match, for ANY currency', () => {
  const kes = ctx([ent('shoe', 'ITEM', 'shoe')], [rel('r', 'PAYMENT_CONDITION', 'shoe', { amount: '4000', currency: 'KES' })]);
  const usd = ctx([ent('shoe', 'ITEM', 'shoe')], [rel('r', 'PAYMENT_CONDITION', 'shoe', { amount: '4000', currency: 'USD' })]);
  const spec = { kind: 'money' };
  assert.equal(api.isRecorded(spec, { kind: 'money', amount: '4,000', currency: 'KES' }, kes), true);
  assert.equal(api.isRecorded(spec, { kind: 'money', amount: '5000', currency: 'KES' }, kes), false);
  assert.equal(api.isRecorded(spec, { kind: 'money', amount: '4000', currency: 'KES' }, usd), false);   // same amount, wrong currency
  assert.equal(api.isRecorded(spec, { kind: 'money', amount: '4000', currency: 'USD' }, usd), true);    // USD is now a real, recordable currency
});
test('money: only a plain amount+currency CANDIDATE row is directly editable; a row with extra qualifiers or already CONFIRMED stays read-only', () => {
  const plain = api.projectWorkbench(ctx([ent('shoe', 'ITEM', 'shoe')], [rel('r', 'PAYMENT_CONDITION', 'shoe', { amount: '4000', currency: 'USD' }, 'CANDIDATE')]));
  const row = plain.items.find(i => i.section === 'money');
  assert.equal(row.value, 'USD 4,000'); assert.equal(row.spec.kind, 'money'); assert.equal(row.spec.targetRelationshipId, 'r');
  const withExtras = api.projectWorkbench(ctx([ent('c', 'CONCEPT', 'contribution')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '20000', frequency: 'monthly' }, 'CANDIDATE')]));
  assert.equal(withExtras.items.find(i => i.section === 'money').spec, null);
  const confirmedRow = api.projectWorkbench(ctx([ent('shoe', 'ITEM', 'shoe')], [rel('r', 'PAYMENT_CONDITION', 'shoe', { amount: '4000', currency: 'KES' })]));
  assert.equal(confirmedRow.items.find(i => i.section === 'money').spec, null);
});
// KS001 Upgrade Phase 3 final money-convergence correction (item 8) -- the backend's own canonical
// "value concept" anchor (SecurePayAPI's CanonicalConceptResolver) is a hidden CONCEPT entity, exactly
// like the pre-existing "contribution" concept above; this proves a source-derived TOTAL anchored to it
// renders as its OWN distinct, correctly-adoptable money row -- never confused with, or merged into, a
// separate payment-stage (deposit/balance) row on a DIFFERENT subject, and the anchor entity itself never
// leaks as a visible row of its own. No frontend change was needed for the backend correction: this row
// rendering is purely a function of each relationship's OWN qualifiers, regardless of which entity its
// subject happens to be.
test('money: a canonical-concept-anchored total and separate payment-stage rows never merge or leak the anchor entity', () => {
  const wb = api.projectWorkbench(ctx(
    [ent('value-concept', 'CONCEPT', 'value', 'CANDIDATE', { _legacySlug: '_concept_value' }),
     ent('deposit-term', 'CONCEPT', 'Deposit', 'CANDIDATE'),
     ent('balance-term', 'CONCEPT', 'Balance', 'CANDIDATE')],
    [rel('total', 'PAYMENT_CONDITION', 'value-concept', { amount: '42000', currency: 'KES' }, 'CANDIDATE'),
     rel('deposit', 'PAYMENT_CONDITION', 'deposit-term', { amount: '21000', currency: 'KES', type: 'deposit' }, 'CANDIDATE'),
     rel('balance', 'PAYMENT_CONDITION', 'balance-term', { amount: '21000', currency: 'KES', type: 'balance' }, 'CANDIDATE')]));
  const moneyRows = wb.items.filter(i => i.section === 'money');
  assert.equal(moneyRows.length, 3); // three distinct rows, never collapsed into one
  const total = moneyRows.find(r => r.key === 'money:total');
  assert.equal(total.value, 'KES 42,000');
  assert.deepEqual(total.adopt, [{ id: 'total', targetKind: 'RELATIONSHIP' }]); // "Use this" targets the REAL relationship id
  assert.deepEqual(total.spec, { kind: 'money', origin: 'understood', amount: '42000', currency: 'KES', targetRelationshipId: 'total' });
  const deposit = moneyRows.find(r => r.key === 'money:deposit');
  assert.equal(deposit.value, 'KES 21,000'); assert.deepEqual(deposit.details, ['deposit']);
  const balance = moneyRows.find(r => r.key === 'money:balance');
  assert.equal(balance.value, 'KES 21,000'); assert.deepEqual(balance.details, ['balance']);
  // The hidden anchor entity itself never appears as its own row anywhere in the workbench.
  assert.ok(!wb.items.some(i => i.key === 'other:value-concept' || i.key === 'what:value-concept'));
});

// ---------------------------------------------------------------- DATE / TIME
test('calendar: no hard-coded year/month anywhere in the production date code', async () => {
  for (const f of ['src/features/instruments/model.ts', 'src/features/instruments/ui/CalendarInstrument.tsx']) {
    const src = await readFile(f, 'utf8');
    assert.doesNotMatch(src, /\b20[2-9]\d\b(?!-)/, `${f} must not embed a year`);
    assert.doesNotMatch(src, /October 2026|useState\(2026\)|useState\(9\)/);
  }
});
test('calendar: real month grids from an injected clock', () => {
  assert.equal(api.todayIso(new Date(2031, 1, 9)), '2031-02-09');
  const grid = api.monthGrid(2026, 8);
  assert.equal(grid[0][0], null); assert.equal(grid[0][1].iso, '2026-09-01'); assert.equal(grid.flat().filter(Boolean).length, 30);
  assert.equal(api.monthGrid(2028, 1).flat().filter(Boolean).length, 29);
});
test('calendar render: injected month, nothing pre-selected, and a real optional time field', () => {
  const html = api.renderToStaticMarkup(api.createElement(api.CalendarInstrument, { spec: { kind: 'when', origin: 'agent' }, draft: { kind: 'when', date: null, time: '' }, onChange() {}, disabled: false, today: '2031-02-09' }));
  assert.match(html, /February 2031/); assert.match(html, /Choose a day/);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 0);
  assert.match(html, /type="time"/);
});
test('time: a well-formed HH:mm is accepted; a malformed one blocks the structured action', () => {
  assert.equal(api.isValidTime('15:00'), true); assert.equal(api.isValidTime('9:00'), false); assert.equal(api.isValidTime('25:00'), false);
  const spec = { kind: 'when', origin: 'add' };
  assert.deepEqual(api.structuredInputFor(spec, { kind: 'when', date: '2026-09-25', time: '15:00' }), { type: 'SET_DATE', targetEntityId: undefined, isoDate: '2026-09-25', isoTime: '15:00' });
  assert.equal(api.structuredInputFor(spec, { kind: 'when', date: '2026-09-25', time: '3pm' }), null);
});
test('DATE structured action: a fresh date creates SET_DATE with no target; an existing DATE entity is corrected in place', () => {
  assert.deepEqual(api.structuredInputFor({ kind: 'when', origin: 'add' }, { kind: 'when', date: '2026-09-25', time: '' }), { type: 'SET_DATE', targetEntityId: undefined, isoDate: '2026-09-25', isoTime: undefined });
  assert.deepEqual(api.structuredInputFor({ kind: 'when', origin: 'understood', targetEntityId: 'd1' }, { kind: 'when', date: '2026-10-01', time: '' }), { type: 'SET_DATE', targetEntityId: 'd1', isoDate: '2026-10-01', isoTime: undefined });
  assert.equal(api.structuredInputFor({ kind: 'when', origin: 'add' }, { kind: 'when', date: null, time: '' }), null);
});
test('DATE read-back: a real DATE entity carrying the exact ISO date closes the instrument', () => {
  const one = ctx([ent('d', 'DATE', 'Friday', 'CANDIDATE', { date: '2026-09-25' })], []);
  const spec = { kind: 'when' };
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-09-25', time: '' }, one), true);
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-09-26', time: '' }, one), false);
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-09-25', time: '' }, ctx([], [])), false);
});
test('date: a real DATE entity is directly editable in UNDERSTOOD; a legacy CONDITION-relationship-based date fact stays read-only', () => {
  const dated = api.projectWorkbench(ctx([ent('d', 'DATE', '2026-09-25', 'CANDIDATE', { date: '2026-09-25' })], []));
  const row = dated.items.find(i => i.section === 'timingPlace');
  assert.equal(row.spec.kind, 'when'); assert.equal(row.spec.targetEntityId, 'd');
  const legacy = api.projectWorkbench(ctx([ent('c', 'CONCEPT', 'deadline')], [rel('r', 'CONDITION', 'c', { date: '2026-09-25' }, 'CANDIDATE')]));
  assert.equal(legacy.items.find(i => i.section === 'timingPlace').spec, null);
});
test('date: an instrument may not close merely because the date matches if a specific time was also selected -- exact readback (Phase 4 review correction, Section 14)', () => {
  const timed = ctx([ent('d', 'DATE', 'Friday', 'CANDIDATE', { date: '2026-09-25', time: '15:00' })], []);
  const spec = { kind: 'when' };
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-09-25', time: '15:00' }, timed), true);
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-09-25', time: '16:00' }, timed), false); // date matches, time doesn't
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-09-25', time: '' }, timed), true); // no time was selected -- date alone is enough
});
test('date: UNDERSTOOD shows a human-friendly date and 12-hour time, canonical values unchanged underneath (Phase 4 final closeout, Section 5)', () => {
  assert.equal(api.formatTime12h('15:00'), '3:00 PM');
  assert.equal(api.formatTime12h('00:05'), '12:05 AM');
  assert.equal(api.formatTime12h('12:00'), '12:00 PM');
  assert.equal(api.formatTime12h('09:30'), '9:30 AM');
  const timed = ctx([ent('d', 'DATE', 'Friday', 'CANDIDATE', { date: '2026-10-02', time: '15:00' })], []);
  const row = api.projectWorkbench(timed).items.find(i => i.section === 'timingPlace');
  assert.equal(row.value, 'Friday, 2 October 2026');
  assert.deepEqual(row.details, ['3:00 PM']);
  assert.equal(row.spec.currentDate, '2026-10-02'); assert.equal(row.spec.currentTime, '15:00'); // canonical values preserved for editing
});

// ---------------------------------------------------------------- DATE RANGE (Phase 4 review correction, Section 14/26 -- no longer an external blocker)
test('DATE RANGE structured action: a fresh range creates SET_DATE_RANGE with no target; start must not be after end', () => {
  const spec = { kind: 'when', origin: 'agent', mode: 'range' };
  assert.deepEqual(api.structuredInputFor(spec, { kind: 'when', date: '2026-10-02', endDate: '2026-10-05', time: '' }),
    { type: 'SET_DATE_RANGE', targetEntityId: undefined, isoStartDate: '2026-10-02', isoEndDate: '2026-10-05' });
  assert.equal(api.structuredInputFor(spec, { kind: 'when', date: '2026-10-05', endDate: '2026-10-02', time: '' }), null); // start after end
  assert.equal(api.structuredInputFor(spec, { kind: 'when', date: '2026-10-02', endDate: null, time: '' }), null); // end not chosen yet
});
test('DATE RANGE: an existing DATE_RANGE entity is corrected in place', () => {
  const spec = { kind: 'when', origin: 'understood', mode: 'range', targetEntityId: 'range-1' };
  assert.deepEqual(api.structuredInputFor(spec, { kind: 'when', date: '2026-10-03', endDate: '2026-10-06', time: '' }),
    { type: 'SET_DATE_RANGE', targetEntityId: 'range-1', isoStartDate: '2026-10-03', isoEndDate: '2026-10-06' });
});
test('DATE RANGE read-back: a real DATE_RANGE entity carrying the exact start/end dates closes the instrument', () => {
  const range = ctx([ent('r', 'DATE_RANGE', '2026-10-02 to 2026-10-05', 'CANDIDATE', { startDate: '2026-10-02', endDate: '2026-10-05' })], []);
  const spec = { kind: 'when', mode: 'range' };
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-10-02', endDate: '2026-10-05', time: '' }, range), true);
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-10-02', endDate: '2026-10-06', time: '' }, range), false);
});
test('DATE RANGE: a real DATE_RANGE entity is directly editable in UNDERSTOOD, shown as a real date range and never confused with a single DATE row', () => {
  const wb = api.projectWorkbench(ctx([ent('r', 'DATE_RANGE', 'x', 'CANDIDATE', { startDate: '2026-10-02', endDate: '2026-10-05' })], []));
  const row = wb.items.find(i => i.section === 'timingPlace');
  assert.equal(row.spec.kind, 'when'); assert.equal(row.spec.mode, 'range'); assert.equal(row.spec.targetEntityId, 'r');
  assert.equal(row.spec.currentDate, '2026-10-02'); assert.equal(row.spec.currentEndDate, '2026-10-05');
  assert.match(row.value, /2026/); // a real human-readable range label, not a raw id
});
test('DATE RANGE prompt: an Agent-proposed DATE_RANGE_PICKER always opens a fresh range selection via the SAME "when" instrument', () => {
  const resolved = api.specForPrompt({ type: 'INSTRUMENT_PROMPT', instrument: 'when', hints: { mode: 'range' } }, api.projectWorkbench(null));
  assert.equal(resolved.spec.kind, 'when'); assert.equal(resolved.spec.mode, 'range');
});

// ---------------------------------------------------------------- WHERE (bounded free text)
test('WHERE: bounded, free, multi-word place text is accepted -- never restricted to one capitalized word', () => {
  assert.deepEqual(api.parsePlace('kilimani'), { ok: true, value: 'kilimani' });
  assert.deepEqual(api.parsePlace('Two Rivers Mall, Nairobi'), { ok: true, value: 'Two Rivers Mall, Nairobi' });
  assert.deepEqual(api.parsePlace('12 Muthithi Road'), { ok: true, value: '12 Muthithi Road' });
  assert.equal(api.parsePlace('').reason, 'empty');
  assert.equal(api.parsePlace('x'.repeat(301)).reason, 'too-long');
  const spec = { kind: 'where', origin: 'add' };
  assert.deepEqual(api.structuredInputFor(spec, { kind: 'where', place: 'Westlands, Nairobi', latitude: null, longitude: null }),
    { type: 'SET_LOCATION', targetEntityId: undefined, placeText: 'Westlands, Nairobi', latitude: undefined, longitude: undefined });
});
test('WHERE: user-shared coordinates travel with the place text, exactly as reported -- never a SecurePay geocode claim', () => {
  const spec = { kind: 'where', origin: 'add' };
  const body = api.structuredInputFor(spec, { kind: 'where', place: 'Current location', latitude: -1.283, longitude: 36.817 });
  assert.deepEqual(body, { type: 'SET_LOCATION', targetEntityId: undefined, placeText: 'Current location', latitude: -1.283, longitude: 36.817 });
});
test('where read-back: exactly the selected place text', () => {
  const spec = { kind: 'where' };
  const one = ctx([ent('p', 'PLACE', 'Kilimani')], []);
  assert.equal(api.isRecorded(spec, { kind: 'where', place: 'Kilimani' }, one), true);
  assert.equal(api.isRecorded(spec, { kind: 'where', place: 'kilimani' }, one), true); // case-insensitive text match
  assert.equal(api.isRecorded(spec, { kind: 'where', place: 'Westlands' }, one), false);
  assert.equal(api.isRecorded(spec, { kind: 'where', place: 'Kilimani' }, ctx([], [])), false);
});
test('GPS-only: coordinates alone (no typed place text) are a legitimate submission -- never blocked and never a fabricated address (Phase 4 review correction, Section 10/27)', () => {
  const spec = { kind: 'where', origin: 'add' };
  const body = api.structuredInputFor(spec, { kind: 'where', place: '', latitude: -1.283, longitude: 36.817 });
  assert.deepEqual(body, { type: 'SET_LOCATION', targetEntityId: undefined, placeText: '', latitude: -1.283, longitude: 36.817 });
  // No coordinates AND no place text -- genuinely nothing to submit.
  assert.equal(api.structuredInputFor(spec, { kind: 'where', place: '', latitude: null, longitude: null }), null);
});
test('GPS-only read-back: the real PLACE entity SecurePay created carries the exact shared coordinates -- a generic "Shared location" label, never a fabricated address', () => {
  const shared = ctx([ent('p', 'PLACE', 'Shared location', 'CANDIDATE', { latitude: '-1.283', longitude: '36.817', coordinateSource: 'USER_SHARED' })], []);
  const spec = { kind: 'where' };
  assert.equal(api.isRecorded(spec, { kind: 'where', place: '', latitude: -1.283, longitude: 36.817 }, shared), true);
  assert.equal(api.isRecorded(spec, { kind: 'where', place: '', latitude: -1.3, longitude: 36.817 }, shared), false); // different coordinates
});
test('GPS + named place read-back: BOTH the exact place text AND the exact coordinates are required -- never close merely because the place text survived while GPS was lost (Phase 4 final closeout, Section 6)', () => {
  const both = ctx([ent('p', 'PLACE', 'Two Rivers Mall', 'CANDIDATE', { latitude: '-1.221', longitude: '36.878', coordinateSource: 'USER_SHARED' })], []);
  const spec = { kind: 'where' };
  const draft = { kind: 'where', place: 'Two Rivers Mall', latitude: -1.221, longitude: 36.878 };
  assert.equal(api.isRecorded(spec, draft, both), true);
  assert.equal(api.isRecorded(spec, { ...draft, latitude: -1.3 }, both), false); // right place, wrong coordinates
  const placeOnly = ctx([ent('p', 'PLACE', 'Two Rivers Mall', 'CANDIDATE')], []); // GPS never arrived
  assert.equal(api.isRecorded(spec, draft, placeOnly), false); // place text alone is not enough when GPS was also supplied
});
test('WHERE row: a quiet, truthful "GPS shared" indication accompanies a place carrying real user-shared coordinates -- no fake map or reverse geocode', () => {
  const withGps = api.projectWorkbench(ctx([ent('p', 'PLACE', 'Two Rivers Mall', 'CANDIDATE', { latitude: '-1.221', longitude: '36.878', coordinateSource: 'USER_SHARED' })], []));
  assert.deepEqual(withGps.items.find(i => i.section === 'timingPlace').details, ['GPS shared']);
  const withoutGps = api.projectWorkbench(ctx([ent('p', 'PLACE', 'Westlands', 'CANDIDATE')], []));
  assert.deepEqual(withoutGps.items.find(i => i.section === 'timingPlace').details, []);
});
test('where: an existing CANDIDATE place is directly editable in UNDERSTOOD (SET_LOCATION, targetEntityId)', () => {
  const placed = api.projectWorkbench(ctx([ent('w', 'PLACE', 'Westlands', 'CANDIDATE')], []));
  const row = placed.items.find(i => i.section === 'timingPlace');
  assert.equal(row.spec.kind, 'where'); assert.equal(row.spec.targetEntityId, 'w'); assert.equal(row.spec.currentPlace, 'Westlands');
});

// ---------------------------------------------------------------- WHAT: generic descriptive details
// Phase 4 review correction, Sections 5/12/13/25 -- "examples are not the API." The shoe/size=43 fixture
// below is a TEST FIXTURE, not SecurePay's ontology; the SAME generic mechanism is proven again on a
// completely unrelated domain (a painter's finish) with zero per-concept code, proving the capability is
// "an arbitrary trade entity may carry bounded descriptive detail," never "shoes have sizes."
test('WHAT: a generic descriptive detail (fixture: a shoe\'s own size) is projected as a human-readable row detail, never an empty details list', () => {
  const wb = api.projectWorkbench(ctx([ent('shoe', 'ITEM', 'shoe', 'CANDIDATE', { size: '43', color: 'black' })], []));
  const row = wb.items.find(i => i.section === 'what');
  assert.deepEqual(row.details.sort(), ['Color: black', 'Size: 43']);
});
test('WHAT: the generic detail editor edits ONLY the changed key, using CORRECT_ENTITY_DETAIL -- fixture: shoe size 43 -> 44', () => {
  const wb = api.projectWorkbench(ctx([ent('shoe', 'ITEM', 'shoe', 'CANDIDATE', { size: '43', color: 'black' })], []));
  const row = wb.items.find(i => i.section === 'what');
  assert.equal(row.spec.kind, 'detail'); assert.equal(row.spec.targetEntityId, 'shoe'); assert.equal(row.spec.entityName, 'shoe');
  const draft = api.emptyDraft(row.spec);
  assert.deepEqual(draft, { kind: 'detail', values: { size: '43', color: 'black' } });
  const changed = { ...draft, values: { ...draft.values, size: '44' } };
  assert.deepEqual(api.structuredInputFor(row.spec, changed), { type: 'CORRECT_ENTITY_DETAIL', targetEntityId: 'shoe', attributeChanges: { size: '44' } });
  assert.equal(api.structuredInputFor(row.spec, draft), null); // nothing changed -- nothing to submit
});
test('WHAT: the SAME generic mechanism works identically for a completely unrelated, non-retail domain -- fixture: a painter\'s finish, matte -> satin (Section 25, no painter-specific field)', () => {
  const wb = api.projectWorkbench(ctx([ent('painter', 'SERVICE', 'painter', 'CANDIDATE', { finish: 'matte' })], []));
  const row = wb.items.find(i => i.section === 'what');
  assert.deepEqual(row.details, ['Finish: matte']);
  const draft = api.emptyDraft(row.spec);
  const changed = { ...draft, values: { ...draft.values, finish: 'satin' } };
  assert.deepEqual(api.structuredInputFor(row.spec, changed), { type: 'CORRECT_ENTITY_DETAIL', targetEntityId: 'painter', attributeChanges: { finish: 'satin' } });
});
test('WHAT: a third, still-different domain (land area) proves there is no hidden "known concept" allowlist', () => {
  const wb = api.projectWorkbench(ctx([ent('land', 'ITEM', 'land parcel', 'CANDIDATE', { area: '1 acre' })], []));
  const row = wb.items.find(i => i.section === 'what');
  assert.deepEqual(row.details, ['Area: 1 acre']);
});
test('WHAT: reserved/identity/internal keys are never shown or offered as an ordinary descriptive detail', () => {
  const wb = api.projectWorkbench(ctx([ent('shoe', 'ITEM', 'shoe', 'CANDIDATE', { size: '43', ksnumber: 'KS999', status: 'x', _internal: 'y' })], []));
  const row = wb.items.find(i => i.section === 'what');
  assert.deepEqual(row.details, ['Size: 43']);
  assert.deepEqual(row.spec.fields.map(f => f.key), ['size']);
});
test('WHAT: a WHAT entity with no ordinary details yet has no detail editor (never invents a key to edit)', () => {
  const wb = api.projectWorkbench(ctx([ent('shoe', 'ITEM', 'shoe', 'CANDIDATE', {})], []));
  const row = wb.items.find(i => i.section === 'what');
  assert.equal(row.spec, null); assert.deepEqual(row.details, []);
});

// ---------------------------------------------------------------- AGENT COMPONENT BRIDGE
test('bridge: each safe model-proposable component parses; unsupported ones become honest UNAVAILABLE notes', () => {
  const kinds = { PERSON_PICKER: 'who', DATE_PICKER: 'when', AMOUNT_INPUT: 'money', LOCATION_PICKER: 'where', KSNUMBER_PICKER: 'who' };
  for (const [type, instrument] of Object.entries(kinds)) assert.deepEqual(api.agentComponentView({ type, data: {} }), { type: 'INSTRUMENT_PROMPT', instrument, hints: {} }, type);
  assert.deepEqual(api.agentComponentView({ type: 'PHOTO_UPLOAD', data: {} }), { type: 'UNAVAILABLE_INPUT', input: 'photo' });
  assert.deepEqual(api.agentComponentView({ type: 'DOCUMENT_UPLOAD', data: { anything: 'x' } }), { type: 'UNAVAILABLE_INPUT', input: 'document' });
  // DATE_RANGE_PICKER is now real (Phase 4 review correction, Section 14) -- it is no longer an
  // "external blocker": it opens the SAME "when" instrument, in range mode.
  assert.deepEqual(api.agentComponentView({ type: 'DATE_RANGE_PICKER', data: {} }), { type: 'INSTRUMENT_PROMPT', instrument: 'when', hints: { mode: 'range' } });
});
test('bridge: hints are optional and strictly validated; nothing else from the payload is trusted', () => {
  const v = api.agentComponentView({ type: 'AMOUNT_INPUT', data: { currency: 'kes', label: 'How much?', date: '2026-02-30', role: 'emperor', people: [{ name: 'Fabricated' }], url: 'https://evil' } });
  assert.deepEqual(v, { type: 'INSTRUMENT_PROMPT', instrument: 'money', hints: { label: 'How much?', currency: 'KES' } });
  assert.equal(JSON.stringify(v).includes('Fabricated'), false);
  assert.deepEqual(api.agentComponentView({ type: 'DATE_PICKER', data: { date: '2026-10-02', label: 'https://x.y' } }).hints, { date: '2026-10-02' });
  assert.deepEqual(api.agentComponentView({ type: 'PERSON_PICKER', data: { role: 'Seller' } }).hints, { role: 'seller' });
  assert.deepEqual(api.agentComponentView({ type: 'PERSON_PICKER', data: { role: 'service provider' } }).hints, {});
});
test('bridge: malformed and unknown components are ignored without throwing and the Agent message survives', () => {
  for (const c of [{ type: 'DATE_PICKER', data: null }, { type: 'DATE_PICKER', data: [] }, { type: 'DATE_PICKER' }, { type: 'FROM_THE_FUTURE', data: {} }, null]) assert.equal(api.agentComponentView(c), null);
  const view = api.agentResponseView({ protocolVersion: '1', message: 'Which Friday?', contextUpdates: [], components: [{ type: 'MESSAGE', data: { text: 'Which Friday?' } }, { type: 'DATE_PICKER', data: null }, { type: 'NEW_THING', data: {} }, { type: 'DATE_PICKER', data: {} }], contextualPanel: null, suggestedActions: [] });
  assert.equal(view.message.text, 'Which Friday?');
  assert.deepEqual(view.components.map(c => c.type), ['MESSAGE', 'INSTRUMENT_PROMPT']);
});
test('bridge: no fixture data reaches production instrument code; no invitation/Agreement/Money reachability', async () => {
  for (const f of ['src/api/securepay/agent/instruments.ts', 'src/features/instruments/ui/CalendarInstrument.tsx', 'src/features/instruments/ui/InstrumentPrompt.tsx', 'src/features/agent/AgentExperience.tsx']) {
    assert.doesNotMatch(await readFile(f, 'utf8'), /mockAgent|demoData|from '..\/..\/components\/(DatePicker|MapCard|LocationPicker|PhotoUpload|ConversationWorkspace|ContextPanel)'/, f);
  }
  for (const f of ['src/features/instruments/controller.ts', 'src/features/instruments/model.ts', 'src/features/instruments/verify.ts', 'src/features/workbench/projection.ts', 'src/features/instruments/ui/WhoInstrument.tsx', 'src/features/instruments/ui/InstrumentHost.tsx']) {
    assert.doesNotMatch(await readFile(f, 'utf8'), /issueInvitation|createHandoff|adoptHandoff|continueHandoff|confirmVersion|agreementGateway|api\.agreements|gateway\.join|paymentIntent|moneyGateway|fund\(|release\(/, f);
  }
});
test('instruments never send a fabricated chat sentence: no sendStatement/statementFor reachable from the structured-input path', async () => {
  for (const f of ['src/features/instruments/controller.ts', 'src/features/instruments/model.ts', 'src/features/instruments/ui/InstrumentHost.tsx']) {
    assert.doesNotMatch(await readFile(f, 'utf8'), /sendStatement|statementFor/, f);
  }
});

// ---------------------------------------------------------------- TRADE CONTEXT + WORKBENCH
test('trade context: a relationship with NO objectEntityId (backend non_null omits it) is accepted, not "unreadable"', () => {
  const view = ctx([ent('c1', 'CONCEPT', 'value')], [rel('r1', 'PAYMENT_CONDITION', 'c1', { amount: '4000', currency: 'KES' })]);
  assert.equal(view.relationships[0].objectEntityId, null);
  assert.throws(() => api.tradeContextView({ conversationId: 'c', version: 1, entities: [], relationships: [{ id: 'r', kind: 'ROLE', subjectEntityId: 'e', objectEntityId: 5, qualifiers: {}, state: 'CONFIRMED' }] }));
});
// KS001 Upgrade Phase 1 final integration fix -- bounded discovery interaction state, never a Trade
// Context attribute.
test('trade context: interactionState.discoveryInvitedEntityIds is parsed when present, and a legacy/absent/malformed field safely becomes an empty list, never an error', () => {
  const withState = api.tradeContextView({ conversationId: 'c', version: 1, entities: [], relationships: [], interactionState: { discoveryInvitedEntityIds: ['e1', 'e2'] } });
  assert.deepEqual(withState.interactionState.discoveryInvitedEntityIds, ['e1', 'e2']);
  const legacy = api.tradeContextView({ conversationId: 'c', version: 1, entities: [], relationships: [] });
  assert.deepEqual(legacy.interactionState.discoveryInvitedEntityIds, []);
  const malformed = api.tradeContextView({ conversationId: 'c', version: 1, entities: [], relationships: [], interactionState: { discoveryInvitedEntityIds: 'not-an-array' } });
  assert.deepEqual(malformed.interactionState.discoveryInvitedEntityIds, []);
});
const golden = () => ctx(
  [ent('s', 'SERVICE', 'House painting'), ent('john', 'PERSON', 'John', 'CANDIDATE'), ent('shoe', 'ITEM', 'shoe'), ent('d', 'DATE', '2026-09-25', 'CANDIDATE', { date: '2026-09-25' }), ent('k', 'PERSON', 'Anna', 'CONFIRMED', { ksnumber: 'KS003' })],
  [rel('r1', 'ROLE', 'john', { role: 'SELLER', descriptor: 'seller' }, 'CANDIDATE'), rel('r2', 'ROLE', 'k', { role: 'BUYER' }), rel('r3', 'PAYMENT_CONDITION', 'shoe', { amount: '20000', currency: 'KES' })]);
test('workbench: rows are exactly what the backend holds, with an instrument wherever a real, precise edit target exists', () => {
  const wb = api.projectWorkbench(golden());
  const by = key => wb.items.filter(i => i.key.startsWith(key));
  assert.equal(by('what:')[0].value, 'House painting'); assert.equal(by('what:')[0].spec, null);
  const who = by('who:'); assert.equal(who.length, 2);
  const john = who.find(i => i.value === 'John'); const anna = who.find(i => i.value === 'Anna');
  assert.equal(john.identityUnresolved, true); assert.deepEqual(john.details, ['Seller']); assert.equal(john.state, 'CANDIDATE');
  assert.equal(john.spec.kind, 'who'); assert.equal(john.spec.targetEntityId, 'john'); // a CANDIDATE person is directly editable
  assert.equal(anna.identityUnresolved, false); assert.equal(anna.state, 'CONFIRMED'); assert.equal(anna.spec, null); // CONFIRMED stays read-only
  // Human-friendly presentation (Phase 4 final closeout, Section 5); the canonical isoDate is unchanged underneath.
  assert.equal(by('when:')[0].value, 'Friday, 25 September 2026'); assert.equal(by('when:')[0].spec.kind, 'when'); // a real CANDIDATE DATE entity is directly editable
  assert.equal(by('money:')[0].value, 'KES 20,000'); assert.equal(by('money:')[0].spec, null); // already CONFIRMED
  // No PLACE in this fixture -- checked by key prefix, since TIMING & PLACE (KS001 Upgrade Phase 2 final
  // acceptance correction item 4) also holds the date row above and would otherwise be true.
  assert.equal(wb.items.some(i => i.key.startsWith('where:')), false);
  assert.deepEqual(wb.adds.map(a => a.key), ['who', 'where']);   // contextual possibilities: another person, a first place -- no date/amount (held)
});
test('workbench: not a five-field form -- empty has no rows; complex money stays conversational; non-money facts are shown', () => {
  const empty = api.projectWorkbench(null);
  assert.equal(empty.empty, true); assert.deepEqual(empty.adds.map(a => a.label), ['Person', 'Date', 'Place', 'Amount']);
  const plan = api.projectWorkbench(ctx([ent('c', 'CONCEPT', 'contribution'), ent('p', 'PERSON', 'Chama')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '20000', appliesTo: 'each member', frequency: 'monthly' }), rel('q', 'AUTHORITY_RULE', 'c', { rule: 'two of three sign', domain: 'DECISION_QUORUM' })]));
  const money = plan.items.find(i => i.section === 'money');
  assert.equal(money.spec, null); assert.deepEqual(money.details, ['each member', 'monthly']);
  // KS001 Upgrade Phase 2 final acceptance correction (item 4) -- AUTHORITY_RULE now maps to its own
  // AUTHORITY section (generic ontology mapping), never the "other" catch-all.
  assert.ok(plan.items.some(i => i.section === 'authority' && i.value === 'two of three sign'));
});
test('workbench: "being considered" stays a candidate and is shown as such', () => {
  const wb = api.projectWorkbench(ctx([ent('p', 'PERSON', 'Peter', 'CANDIDATE')], [rel('r', 'ROLE', 'p', { role: 'PROVIDER_CANDIDATE', status: 'CONSIDERED' }, 'CANDIDATE')]));
  const peter = wb.items[0];
  assert.deepEqual(peter.details, ['Being considered']); assert.equal(peter.state, 'CANDIDATE');
  assert.deepEqual(peter.adopt.map(a => a.targetKind).sort(), ['ENTITY', 'RELATIONSHIP']);
});

// ---------------------------------------------------------------- KS001 Upgrade Phase 2 final acceptance
// correction (item 4) -- the universal BUILD workbench taxonomy, proven with REAL relationship kinds
// (never a hardcoded domain fixture): ROLE/PARTICIPATION -> people, RESPONSIBILITY -> responsibilities,
// PAYMENT_CONDITION/MONEY -> money, DATE/date-shaped CONDITION/PLACE -> timing & place, non-date
// CONDITION/DELIVERY -> completion, AUTHORITY_RULE -> authority.
test('workbench: a RESPONSIBILITY relationship becomes its own responsibilities row, subject-prefixed, never duplicated inside the person\'s own PEOPLE row', () => {
  const wb = api.projectWorkbench(ctx(
    [ent('p', 'PERSON', 'Provider', 'CONFIRMED')],
    [rel('role', 'ROLE', 'p', { role: 'SERVICE_PROVIDER' }), rel('duty', 'RESPONSIBILITY', 'p', { action: 'carry out the work' }, 'CANDIDATE')]));
  const person = wb.items.find(i => i.section === 'people');
  assert.deepEqual(person.details, ['Service provider']); // no "will carry out the work" folded in here any more
  const responsibility = wb.items.find(i => i.section === 'responsibilities');
  assert.equal(responsibility.value, 'Provider: carry out the work');
  assert.equal(responsibility.state, 'CANDIDATE');
  assert.deepEqual(responsibility.adopt, [{ id: 'duty', targetKind: 'RELATIONSHIP' }]);
});
test('workbench: a confirmed RESPONSIBILITY carries no candidate adopt target; a candidate one does', () => {
  const confirmed = api.projectWorkbench(ctx([ent('p', 'PERSON', 'Provider')], [rel('duty', 'RESPONSIBILITY', 'p', { action: 'deliver the goods' })]));
  assert.deepEqual(confirmed.items.find(i => i.section === 'responsibilities').adopt, []);
  const candidate = api.projectWorkbench(ctx([ent('p', 'PERSON', 'Provider')], [rel('duty', 'RESPONSIBILITY', 'p', { action: 'deliver the goods' }, 'CANDIDATE')]));
  assert.deepEqual(candidate.items.find(i => i.section === 'responsibilities').adopt, [{ id: 'duty', targetKind: 'RELATIONSHIP' }]);
});
test('workbench: a PARTICIPATION relationship folds a participant into PEOPLE, even with no individual role qualifier', () => {
  const wb = api.projectWorkbench(ctx([ent('m', 'PERSON', 'Member', 'CONFIRMED')], [rel('part', 'PARTICIPATION', 'm', {})]));
  const row = wb.items.find(i => i.section === 'people');
  assert.equal(row.value, 'Member');
  assert.deepEqual(row.details, ['Participant']);
  assert.equal(row.state, 'CONFIRMED');
});
test('workbench: a non-date CONDITION and a DELIVERY relationship both fall under COMPLETION, never "Also understood"', () => {
  const wb = api.projectWorkbench(ctx([ent('c', 'CONCEPT', 'the deal')], [
    rel('c1', 'CONDITION', 'c', { requires: 'inspection' }, 'CANDIDATE'),
    rel('c2', 'DELIVERY', 'c', { destination: 'site office' }),
  ]));
  const completion = wb.items.filter(i => i.section === 'completion');
  assert.equal(completion.length, 2);
  assert.ok(completion.some(i => i.value.includes('inspection') && i.state === 'CANDIDATE'));
  assert.ok(completion.some(i => i.value.includes('site office') && i.state === 'CONFIRMED'));
  assert.equal(wb.items.some(i => i.section === 'other'), false);
});
test('workbench: an AUTHORITY_RULE relationship falls under AUTHORITY with its real state', () => {
  const wb = api.projectWorkbench(ctx([ent('c', 'CONCEPT', 'the deal')], [rel('a', 'AUTHORITY_RULE', 'c', { approves: 'payment release' }, 'CANDIDATE')]));
  const row = wb.items.find(i => i.section === 'authority');
  assert.ok(row.value.includes('payment release'));
  assert.equal(row.state, 'CANDIDATE');
  assert.deepEqual(row.adopt, [{ id: 'a', targetKind: 'RELATIONSHIP' }]);
});
test('workbench render: candidate RESPONSIBILITY/CONDITION/AUTHORITY_RULE rows render "Suggested"; confirmed ones do not', () => {
  const data = ctx(
    [ent('p', 'PERSON', 'Provider'), ent('c', 'CONCEPT', 'the deal')],
    [rel('duty', 'RESPONSIBILITY', 'p', { action: 'carry out the work' }, 'CANDIDATE'),
     rel('cond', 'CONDITION', 'c', { requires: 'inspection' }),
     rel('auth', 'AUTHORITY_RULE', 'c', { approves: 'payment release' }, 'CANDIDATE')]);
  const state = { conversationId: 'c', turns: [], busy: false, pending: null, error: null, context: { status: 'ready', data, error: null }, source: null, offerSelectionFailure: null };
  const html = api.renderToStaticMarkup(api.createElement(api.UnderstoodWorkbench, { state, controller: {}, activeSpec: null, onOpen() {} }));
  // Each assertion is scoped to its own section's slice of the markup, never a greedy cross-section
  // regex -- otherwise a LATER section's own "Suggested" could make an earlier, confirmed row look
  // wrongly labelled.
  const between = (from, to) => html.slice(html.indexOf(from), to ? html.indexOf(to) : undefined);
  const responsibilities = between('Responsibilities', 'Completion');
  assert.match(responsibilities, /carry out the work/); assert.match(responsibilities, /Suggested/);
  const completion = between('Completion', 'Authority');
  assert.match(completion, /inspection/); assert.doesNotMatch(completion, /Suggested/);
  const authority = between('Authority');
  assert.match(authority, /payment release/); assert.match(authority, /Suggested/);
});

// ---------------------------------------------------------------- KS001 Upgrade Phase 2 final acceptance
// correction (item 7) -- CHAMA and CONCERT acceptance scenarios, proving the UI visibly carries the real
// REPRESENTABLE structure via the restructured workbench, using only real relationship/entity kinds.
// Rotating payout order (CHAMA) and venue selection (CONCERT) are genuine open matters the current
// ontology has no safe generic slot for -- they are deliberately NOT fabricated here; a real
// implementation surfaces them as "still to decide" via the server-owned sufficiency projection, not as
// an invented workbench row (see the Known Limitations of this correction round).
test('CHAMA: people/participation, KES 300 monthly and confirmed/candidate state are all visible; payout order is never fabricated', () => {
  const data = ctx(
    [ent('m1', 'PERSON', 'Wanjiku', 'CONFIRMED'), ent('m2', 'PERSON', 'Otieno', 'CANDIDATE'), ent('c', 'CONCEPT', 'the chama contribution')],
    [rel('p1', 'PARTICIPATION', 'm1', {}), rel('p2', 'PARTICIPATION', 'm2', {}, 'CANDIDATE'),
     rel('money', 'PAYMENT_CONDITION', 'c', { amount: '300', currency: 'KES', appliesTo: 'each member', frequency: 'monthly' })]);
  const wb = api.projectWorkbench(data);
  const people = wb.items.filter(i => i.section === 'people');
  assert.ok(people.some(i => i.value === 'Wanjiku' && i.state === 'CONFIRMED'));
  assert.ok(people.some(i => i.value === 'Otieno' && i.state === 'CANDIDATE'));
  const money = wb.items.find(i => i.section === 'money');
  assert.equal(money.value, 'KES 300'); assert.deepEqual(money.details, ['each member', 'monthly']);
  // Genuine known limitation: no PAYOUT_ORDER-shaped relationship exists in the ontology, so nothing
  // claiming to be a payout order is ever invented here.
  assert.equal(JSON.stringify(wb).toLowerCase().includes('payout'), false);
});
test('CONCERT: concert, Brian, production responsibility, KES 600,000 and December are all visible under their real sections; venue is never fabricated', () => {
  const data = ctx(
    [ent('concert', 'SERVICE', 'Concert'), ent('brian', 'PERSON', 'Brian', 'CONFIRMED'),
     ent('d', 'DATE', 'December', 'CONFIRMED', { date: '2026-12-05' })],
    [rel('role', 'ROLE', 'brian', { role: 'ORGANIZER' }), rel('duty', 'RESPONSIBILITY', 'brian', { action: 'production' }),
     rel('money', 'PAYMENT_CONDITION', 'concert', { amount: '600000', currency: 'KES' })]);
  const wb = api.projectWorkbench(data);
  assert.ok(wb.items.some(i => i.section === 'what' && i.value === 'Concert'));
  const brian = wb.items.find(i => i.section === 'people' && i.value === 'Brian');
  assert.deepEqual(brian.details, ['Organizer']);
  const responsibility = wb.items.find(i => i.section === 'responsibilities');
  assert.equal(responsibility.value, 'Brian: production');
  const money = wb.items.find(i => i.section === 'money');
  assert.equal(money.value, 'KES 600,000');
  const timing = wb.items.find(i => i.section === 'timingPlace');
  assert.equal(timing.value, 'Saturday, 5 December 2026');
  // Genuine known limitation: no venue was submitted in this fixture, and none is fabricated.
  assert.equal(wb.items.some(i => i.key.startsWith('where:')), false);
});
test('workbench render: only actionable rows are buttons; candidates say "Suggested"; the word "Confirmed" is never used', () => {
  const state = { conversationId: 'c', turns: [], busy: false, pending: null, error: null, context: { status: 'ready', data: golden(), error: null }, source: null, offerSelectionFailure: null };
  const html = api.renderToStaticMarkup(api.createElement(api.UnderstoodWorkbench, { state, controller: {}, activeSpec: null, onOpen() {}, stillToSettle: ['Where the house is'] }));
  assert.match(html, /aria-label="People: John\. Change the person"/);
  assert.doesNotMatch(html, /aria-label="Money:/); assert.doesNotMatch(html, /aria-label="What:/);
  assert.match(html, /Friday, 25 September 2026/); assert.match(html, /Suggested/); assert.match(html, /KS Number not set/); assert.match(html, /Use this/);
  assert.doesNotMatch(html, /Confirmed/); assert.match(html, /Where the house is/); assert.match(html, /Not an Agreement/);
});
test('workbench render: an open instrument marks its row aria-expanded', () => {
  const state = { conversationId: 'c', turns: [], busy: false, pending: null, error: null, context: { status: 'ready', data: golden(), error: null }, source: null, offerSelectionFailure: null };
  const spec = api.projectWorkbench(golden()).items.find(i => i.section === 'timingPlace').spec;
  const html = api.renderToStaticMarkup(api.createElement(api.UnderstoodWorkbench, { state, controller: {}, activeSpec: spec, onOpen() {} }));
  assert.match(html, /aria-expanded="true"[^>]*aria-label="Timing/);
});
test('prompt render: a live prompt is one button; photo/document get an honest note, never a dead upload control', () => {
  const p = api.renderToStaticMarkup(api.createElement(api.InstrumentPrompt, { prompt: { type: 'INSTRUMENT_PROMPT', instrument: 'when', hints: {} }, onOpen() {} }));
  assert.match(p, /Choose a date/);
  const u = api.renderToStaticMarkup(api.createElement(api.InstrumentPrompt, { unavailable: 'photo' }));
  assert.doesNotMatch(u, /<button|<input/); assert.match(u, /can.t be added to SecurePay here yet/);
});
test('WhoInstrument render: "I have a KS Number" is offered for an unresolved candidate but withheld for an already-resolved one (Phase 4 final closeout, Section 4)', () => {
  const noop = () => {};
  const unresolvedSpec = { kind: 'who', origin: 'understood', targetEntityId: 'j', currentName: 'John', identityResolved: false };
  const unresolvedHtml = api.renderToStaticMarkup(api.createElement(api.WhoInstrument, {
    spec: unresolvedSpec, draft: { kind: 'who', name: '', role: 'seller', ks: '', participantType: 'PERSON' },
    onChange: noop, disabled: false, onSubmit: noop, onBackToConversation: noop, onFind: noop, resolvedKsIdentity: null,
  }));
  assert.match(unresolvedHtml, /I have a KS Number/);

  const resolvedSpec = { kind: 'who', origin: 'understood', targetEntityId: 'e', currentName: 'Maua Shoes', identityResolved: true };
  const resolvedHtml = api.renderToStaticMarkup(api.createElement(api.WhoInstrument, {
    spec: resolvedSpec, draft: { kind: 'who', name: '', role: 'seller', ks: '', participantType: 'ORGANIZATION' },
    onChange: noop, disabled: false, onSubmit: noop, onBackToConversation: noop, onFind: noop, resolvedKsIdentity: null,
  }));
  assert.doesNotMatch(resolvedHtml, /I have a KS Number/);
  assert.match(resolvedHtml, /already verified/);
});

// ---------------------------------------------------------------- INSTRUMENT LIFECYCLE
function fakeAgent({ result, ksResult } = {}) {
  const calls = [];
  const snapshot = { context: { status: 'idle', data: null, error: null } };
  return { calls, snapshot, agent: {
    getSnapshot: () => snapshot,
    submitStructuredInput: async body => { calls.push(['structured-input', body]); return result(); },
    selectKsIdentity: async body => { calls.push(['ks-identity', body]); return ksResult ? ksResult(body) : result(); },
    review: async () => { calls.push(['review']); },
  } };
}
const moneySpec = { kind: 'money', origin: 'understood', amount: '4000', currency: 'KES', targetRelationshipId: 'r1' };
test('instrument lifecycle: success closes ONLY after the backend shows the fact; the only call is one structured-input action', async () => {
  const good = ctx([ent('shoe', 'ITEM', 'shoe')], [rel('r1', 'PAYMENT_CONDITION', 'shoe', { amount: '5000', currency: 'KES' })]);
  const { agent, calls } = fakeAgent({ result: () => ({ ok: true, result: { status: 'APPLIED' }, context: good }) });
  const ic = api.createInstrumentController(agent, () => 'action-1');
  ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5,000', currency: 'KES' });
  await ic.submit();
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 'structured-input');
  assert.deepEqual(calls[0][1], { type: 'SET_AMOUNT', targetRelationshipId: 'r1', amount: '5000', currency: 'KES', expectedTradeContextVersion: 0, clientActionId: 'action-1' });
  assert.equal(ic.getSnapshot().active, null);
});
test('instrument lifecycle: sent-but-not-recorded stays open with the draft intact; it is never shown as success', async () => {
  const stale = ctx([ent('shoe', 'ITEM', 'shoe')], [rel('r1', 'PAYMENT_CONDITION', 'shoe', { amount: '4000', currency: 'KES' })]);
  const { agent } = fakeAgent({ result: () => ({ ok: true, result: { status: 'APPLIED' }, context: stale }) });
  const ic = api.createInstrumentController(agent, () => 'action-1');
  ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5000', currency: 'KES' });
  await ic.submit();
  const s = ic.getSnapshot();
  assert.equal(s.phase, 'unrecorded'); assert.equal(s.draft.amount, '5000'); assert.ok(s.active);
  const unreadable = fakeAgent({ result: () => ({ ok: true, result: { status: 'APPLIED' }, context: null }) });
  const ic2 = api.createInstrumentController(unreadable.agent, () => 'action-2');
  ic2.open(moneySpec); ic2.setDraft({ kind: 'money', amount: '5000', currency: 'KES' }); await ic2.submit();
  assert.equal(ic2.getSnapshot().phase, 'unrecorded');
});
test('instrument lifecycle: a stale version keeps the draft and stays "editing" (a normal concurrency outcome, never "failed")', async () => {
  const { agent, calls } = fakeAgent({ result: () => ({ ok: false, stale: true, error: 'refreshed', context: null }) });
  const ic = api.createInstrumentController(agent, () => 'action-1');
  ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5000', currency: 'KES' });
  await ic.submit();
  assert.equal(ic.getSnapshot().phase, 'editing'); assert.equal(ic.getSnapshot().error, 'refreshed'); assert.equal(ic.getSnapshot().draft.amount, '5000');
  await ic.submit(); // the SAME clientActionId is reused on the deliberate retry
  assert.equal(calls[0][1].clientActionId, calls[1][1].clientActionId);
});
test('clientActionId lifecycle (Phase 4 final closeout, Section 7): stale + unchanged resubmit keeps the SAME id; stale + an edited draft gets a NEW one', async () => {
  let n = 0;
  const idGen = () => `action-${++n}`;
  // stale -> unchanged retry -> same id.
  {
    const { agent, calls } = fakeAgent({ result: () => ({ ok: false, stale: true, error: 'refreshed', context: null }) });
    const ic = api.createInstrumentController(agent, idGen);
    ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5000', currency: 'KES' });
    await ic.submit();
    await ic.submit(); // no setDraft call in between -- an unchanged resubmit
    assert.equal(calls.length, 2);
    assert.equal(calls[0][1].clientActionId, calls[1][1].clientActionId);
  }
  // stale -> the person edits the draft before resubmitting -> a NEW id.
  {
    const { agent, calls } = fakeAgent({ result: () => ({ ok: false, stale: true, error: 'refreshed', context: null }) });
    const ic = api.createInstrumentController(agent, idGen);
    ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5000', currency: 'KES' });
    await ic.submit();
    ic.setDraft({ kind: 'money', amount: '6000', currency: 'KES' }); // a genuine edit after returning to editing
    await ic.submit();
    assert.equal(calls.length, 2);
    assert.notEqual(calls[0][1].clientActionId, calls[1][1].clientActionId);
  }
});
test('instrument lifecycle: an uncertain delivery freezes the choice; Retry reuses the SAME clientActionId; Close never rewrites history', async () => {
  let attempt = 0;
  const good = ctx([ent('shoe', 'ITEM', 'shoe')], [rel('r1', 'PAYMENT_CONDITION', 'shoe', { amount: '5000', currency: 'KES' })]);
  const { agent, calls } = fakeAgent({ result: () => { attempt += 1; return attempt === 1 ? { ok: false, stale: false, error: 'SecurePay could not confirm whether this step completed.' } : { ok: true, result: { status: 'APPLIED' }, context: good }; } });
  const ic = api.createInstrumentController(agent, () => 'action-1');
  ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5000', currency: 'KES' });
  await ic.submit();
  assert.equal(ic.getSnapshot().phase, 'failed'); assert.equal(ic.getSnapshot().draft.amount, '5000');
  ic.setDraft({ kind: 'money', amount: '9999', currency: 'KES' });          // a DIFFERENT action over an unresolved one: refused
  assert.equal(ic.getSnapshot().draft.amount, '5000');
  await ic.retry();
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1].clientActionId, calls[1][1].clientActionId);    // retry reuses the SAME clientActionId, never a fresh one
  assert.equal(ic.getSnapshot().active, null);
});
test('clientActionId lifecycle: a frozen failed/uncertain delivery keeps the SAME id across retry() -- proven with a real incrementing id generator', async () => {
  let n = 0; let attempt = 0;
  const good = ctx([ent('shoe', 'ITEM', 'shoe')], [rel('r1', 'PAYMENT_CONDITION', 'shoe', { amount: '5000', currency: 'KES' })]);
  const { agent, calls } = fakeAgent({ result: () => { attempt += 1; return attempt === 1 ? { ok: false, stale: false, error: 'uncertain' } : { ok: true, result: { status: 'APPLIED' }, context: good }; } });
  const ic = api.createInstrumentController(agent, () => `action-${++n}`);
  ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5000', currency: 'KES' });
  await ic.submit();
  assert.equal(ic.getSnapshot().phase, 'failed');
  ic.setDraft({ kind: 'money', amount: '9999', currency: 'KES' }); // blocked entirely while failed -- never reaches clientActionId reset
  await ic.retry();
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1].clientActionId, calls[1][1].clientActionId);
});
test('instrument lifecycle: "check what SecurePay understands" closes a failed delivery ONLY if the fact is proven; otherwise it stays retryable', async () => {
  const good = ctx([ent('shoe', 'ITEM', 'shoe')], [rel('r1', 'PAYMENT_CONDITION', 'shoe', { amount: '5000', currency: 'KES' })]);
  const staleCtx = ctx([ent('shoe', 'ITEM', 'shoe')], [rel('r1', 'PAYMENT_CONDITION', 'shoe', { amount: '4000', currency: 'KES' })]);
  for (const [data, closes] of [[good, true], [staleCtx, false]]) {
    const fa = fakeAgent({ result: () => ({ ok: false, stale: false, error: 'x' }) });
    const ic = api.createInstrumentController(fa.agent, () => 'action-1');
    ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5000', currency: 'KES' }); await ic.submit();
    fa.snapshot.context = { status: 'ready', data, error: null };
    await ic.recheck();
    assert.equal(ic.getSnapshot().active === null, closes);
    if (!closes) assert.equal(ic.getSnapshot().phase, 'failed');
  }
});
test('instrument lifecycle: state lives in the controller (survives a re-render/tab switch); re-opening keeps the draft; escape hatch never sends', () => {
  const { agent, calls } = fakeAgent({ result: () => ({ ok: true, result: { status: 'APPLIED' }, context: null }) });
  const ic = api.createInstrumentController(agent);
  ic.open({ kind: 'where', origin: 'add' }); ic.setDraft({ kind: 'where', place: 'Kilimani', latitude: null, longitude: null });
  ic.open({ kind: 'where', origin: 'agent' });                              // same fact, summoned again
  assert.equal(ic.getSnapshot().draft.place, 'Kilimani');
  ic.open({ kind: 'money', origin: 'add' });                                 // a different fact replaces it
  assert.equal(ic.getSnapshot().active.kind, 'money');
  ic.cancel(); assert.equal(ic.getSnapshot().active, null); assert.deepEqual(calls, []);
});
test('instrument lifecycle: a typed KS Number routes to selectKsIdentity, never submitStructuredInput -- and is never lost when the instrument is closed', async () => {
  const good = ctx([ent('e', 'ORGANIZATION', 'Maua Shoes', 'CANDIDATE', { ksnumber: 'KS003', identityResolved: 'true' })], [rel('r', 'ROLE', 'e', { role: 'SELLER' }, 'CANDIDATE')]);
  // Two explicit steps (Phase 4 final closeout, Section 3): a pure lookup (no expectedTradeContextVersion)
  // returns RESOLVED and associates NOTHING; only a second call carrying expectedTradeContextVersion
  // associates.
  const { agent, calls } = fakeAgent({ ksResult: body => body.expectedTradeContextVersion === undefined
    ? { ok: true, result: { status: 'RESOLVED', canonicalKsNumber: 'KS003', displayName: 'Maua Shoes', participantType: 'ORGANIZATION', entityId: null, entityCreated: null, roleApplied: null, tradeContextVersion: null }, context: null }
    : { ok: true, result: { status: 'ASSOCIATED', canonicalKsNumber: 'KS003', displayName: 'Maua Shoes', participantType: 'ORGANIZATION', entityId: 'e', entityCreated: true, roleApplied: true, tradeContextVersion: 1 }, context: good } });
  const spec = { kind: 'who', origin: 'add', takenNames: [] };
  const ic = api.createInstrumentController(agent, () => 'who-action-1');
  ic.open(spec); ic.setDraft({ kind: 'who', name: '', role: 'seller', ks: 'KS003' });
  await ic.submit();
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 'ks-identity');
  assert.deepEqual(calls[0][1], { ksNumber: 'KS003', expectedTradeContextVersion: undefined, clientActionId: 'who-action-1', role: 'seller', existingTradeEntityId: undefined });
  assert.equal(ic.getSnapshot().active !== null, true); // pure lookup never closes the instrument
  assert.deepEqual(ic.getSnapshot().resolvedKsIdentity, { canonicalKsNumber: 'KS003', displayName: 'Maua Shoes', participantType: 'ORGANIZATION' });
  // The SECOND explicit press actually associates.
  await ic.submit();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1][1], { ksNumber: 'KS003', expectedTradeContextVersion: 0, clientActionId: 'who-action-1', role: 'seller', existingTradeEntityId: undefined });
  assert.equal(ic.getSnapshot().active, null); // isWhoLinked proves it against the returned context
  // Cancelling with a typed-but-unsent KS keeps it parked for when the instrument reopens.
  const ic2 = api.createInstrumentController(agent);
  ic2.open(spec); ic2.setDraft({ kind: 'who', name: '', role: '', ks: 'KS009' }); ic2.cancel();
  assert.equal(ic2.getSnapshot().active, null);
  ic2.open(spec); assert.equal(ic2.getSnapshot().draft.ks, 'KS009');
});
test('instrument lifecycle: an ordinary KS lookup outcome (not found / not available / malformed) reopens for correction with a precise message, never a generic failure', async () => {
  const outcomes = [
    ['NOT_FOUND', 'doesn’t recognize'], ['NOT_AVAILABLE', 'can’t be used right now'],
    ['NOT_PARTICIPANT_ELIGIBLE', 'can’t be added as a trade participant'], ['MALFORMED_KS_NUMBER', 'doesn’t look like a KS Number'],
  ];
  for (const [status, phrase] of outcomes) {
    const { agent } = fakeAgent({ ksResult: () => ({ ok: true, result: { status }, context: null }) });
    const ic = api.createInstrumentController(agent, () => 'a');
    ic.open({ kind: 'who', origin: 'add', takenNames: [] }); ic.setDraft({ kind: 'who', name: '', role: 'seller', ks: 'KS999' });
    await ic.submit();
    const snap = ic.getSnapshot();
    assert.equal(snap.phase, 'editing', status); assert.match(snap.error, new RegExp(phrase), status);
  }
});

// ---------------------------------------------------------------- AGENT CONTROLLER
function agentSetup(over = {}) {
  const calls = []; let n = 0;
  const gateway = { createConversation: async () => ({ conversationId: 'c' }), submitTurn: async (id, body) => { calls.push(['turn', body]); return { message: 'ok', components: [], contextualPanel: null, contextUpdates: [], suggestedActions: [] }; },
    readContext: async () => ({ conversationId: 'c', version: 2, entities: [], relationships: [{ id: 'r', kind: 'PAYMENT_CONDITION', subjectEntityId: 'e', qualifiers: { amount: '5' }, state: 'CONFIRMED', confidence: 1 }] }),
    adoptFact: async () => ({}), submitAmount: async () => ({}), selectCommercialSource: async () => ({}),
    submitStructuredInput: async () => ({ status: 'APPLIED', affectedEntityId: 'e', entitiesApplied: 1, relationshipsApplied: 0, conflicts: [], tradeContextVersion: 2 }),
    selectKsIdentity: async () => ({ status: 'RESOLVED', canonicalKsNumber: 'KS003', displayName: 'Maua Shoes', participantType: 'ORGANIZATION', entityId: null, entityCreated: null, roleApplied: null, tradeContextVersion: null }),
    ...over };
  return { calls, controller: api.createAgentController(gateway, () => `id-${++n}`) };
}
test('agent controller: a statement is an ordinary turn (same endpoint, clientTurnId), returns the read-back context', async () => {
  const { controller, calls } = agentSetup();
  const result = await controller.sendStatement('The amount is KES 5.');
  assert.equal(result.ok, true); assert.equal(result.context.relationships[0].objectEntityId, null);
  assert.deepEqual(calls, [['turn', { message: 'The amount is KES 5.', clientTurnId: 'id-1' }]]);
  assert.equal(controller.getSnapshot().turns[0].sender, 'user');
});
test('agent controller: submitStructuredInput never appends a turn; refreshes context on success', async () => {
  const { controller } = agentSetup();
  const result = await controller.submitStructuredInput({ type: 'SET_LOCATION', placeText: 'Kilimani', expectedTradeContextVersion: 0, clientActionId: 'a1' });
  assert.equal(result.ok, true); assert.equal(result.result.status, 'APPLIED');
  assert.equal(controller.getSnapshot().turns.length, 0);
});
test('agent controller: submitStructuredInput surfaces a stale-version outcome distinctly, refreshing context but never as a generic failure', async () => {
  const { controller } = agentSetup({ submitStructuredInput: async () => { throw new api.ApiError('http', 'stale', 409, 'AGENT_STRUCTURED_INPUT_STALE_VERSION'); } });
  const result = await controller.submitStructuredInput({ type: 'SET_LOCATION', placeText: 'Kilimani', expectedTradeContextVersion: 0, clientActionId: 'a1' });
  assert.equal(result.ok, false); assert.equal(result.stale, true);
  assert.match(result.error, /understands has changed/);
});
// KS001 Upgrade Phase 1 review correction (item 2) -- REQUEST_DISCOVERY is now callable from
// SecurepayLLM, reusing the SAME submitStructuredInput machinery, never a fabricated chat sentence.
test('agent controller: requestDiscovery sends a REQUEST_DISCOVERY structured input for the exact target, using the current Trade Context version and a fresh clientActionId', async () => {
  const calls = [];
  const { controller } = agentSetup({
    readContext: async () => ({ conversationId: 'c', version: 7, entities: [], relationships: [] }),
    submitStructuredInput: async (id, body) => { calls.push(body); return { status: 'APPLIED', affectedEntityId: 'e1', entitiesApplied: 1, relationshipsApplied: 0, conflicts: [], tradeContextVersion: 8 }; },
  });
  // Establish a real conversation and read a real current Trade Context version first (mirrors how the
  // instruments controller's own currentVersion() reads state, never a caller-guessed number).
  await controller.sendStatement('I need my bathroom tiled.');
  const turnsBefore = controller.getSnapshot().turns.length;
  const result = await controller.requestDiscovery('e1');
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, 'REQUEST_DISCOVERY');
  assert.equal(calls[0].targetEntityId, 'e1');
  assert.equal(calls[0].expectedTradeContextVersion, 7);
  assert.ok(calls[0].clientActionId, 'a fresh clientActionId must be generated');
  // Never a fabricated chat turn -- the turn count is unchanged by requestDiscovery itself.
  assert.equal(controller.getSnapshot().turns.length, turnsBefore);
});
test('agent controller: requestDiscovery surfaces a stale-version outcome distinctly, exactly like submitStructuredInput', async () => {
  const { controller } = agentSetup({ submitStructuredInput: async () => { throw new api.ApiError('http', 'stale', 409, 'AGENT_STRUCTURED_INPUT_STALE_VERSION'); } });
  const result = await controller.requestDiscovery('e1');
  assert.equal(result.ok, false); assert.equal(result.stale, true);
  assert.match(result.error, /understands has changed/);
});
test('agent controller: requestDiscovery defaults to expectedTradeContextVersion 0 before any context has been read', async () => {
  const calls = [];
  const { controller } = agentSetup({ submitStructuredInput: async (id, body) => { calls.push(body); return { status: 'APPLIED', affectedEntityId: 'e1', entitiesApplied: 1, relationshipsApplied: 0, conflicts: [], tradeContextVersion: 1 }; } });
  await controller.requestDiscovery('e1');
  assert.equal(calls[0].expectedTradeContextVersion, 0);
});
// KS001 Upgrade Phase 1 final integration fix -- DISCOVERY OFFERED (a real, server-verified DISCOVERY_OFFER
// component this turn) is recorded as session-local state, deduplicated across turns, and is NEVER itself
// DISCOVERY INVITED -- only the persisted, server-owned interactionState (read back via readContext) is that.
test('agent controller: a DISCOVERY_OFFER component records the target as session-local "offered" state, deduplicated across turns, never as an invitation', async () => {
  const { controller } = agentSetup({
    submitTurn: async () => ({
      message: 'I can help you look for a tiler.', contextUpdates: [],
      components: [{ type: 'DISCOVERY_OFFER', data: { targetEntityId: 'e1' } }],
      contextualPanel: null, suggestedActions: [],
    }),
  });
  await controller.sendStatement('Do you know a tiler?');
  assert.deepEqual(controller.getSnapshot().offeredDiscoveryEntityIds, ['e1']);
  // A second turn offering the SAME entity again never duplicates it.
  await controller.sendStatement('Anyone?');
  assert.deepEqual(controller.getSnapshot().offeredDiscoveryEntityIds, ['e1']);
  // DISCOVERY OFFERED alone never becomes DISCOVERY INVITED -- the persisted, server-owned interaction
  // state (read back via the DEFAULT readContext fixture, unrelated to the offer) is untouched by it.
  assert.deepEqual(controller.getSnapshot().context.data.interactionState.discoveryInvitedEntityIds, []);
});
// KS001 Upgrade Phase 1 final integration fix, item F (reload/resume) -- a persisted discovery invitation
// is visible after re-reading the conversation/context, never dependent on transient frontend state (the
// offeredDiscoveryEntityIds list above is NOT what this proves -- interactionState, read back from the real
// server response, is).
test('agent controller: requestDiscovery success is reflected in the re-read context interactionState, proving it is persisted server state, not transient frontend state', async () => {
  const { controller } = agentSetup({
    readContext: async () => ({ conversationId: 'c', version: 2, entities: [], relationships: [], interactionState: { discoveryInvitedEntityIds: ['e1'] } }),
  });
  const result = await controller.requestDiscovery('e1');
  assert.equal(result.ok, true);
  assert.deepEqual(controller.getSnapshot().context.data.interactionState.discoveryInvitedEntityIds, ['e1']);
});
test('agent controller: selectKsIdentity performs a pure lookup with no context refresh when no expectedTradeContextVersion is supplied', async () => {
  const { controller, calls } = agentSetup();
  const result = await controller.selectKsIdentity({ ksNumber: 'KS003' });
  assert.equal(result.ok, true); assert.equal(result.result.status, 'RESOLVED');
});
// A backend that COMMITS a turn and then loses the response, deduplicating by clientTurnId like AgentConversationService.replayIfAlreadyProcessed.
function lossyServer({ lose = 1 } = {}) {
  const committed = new Map(); const log = []; let lost = 0;
  const reply = { message: 'ok', components: [], contextualPanel: null, contextUpdates: [], suggestedActions: [] };
  return { committed, log, gateway: {
    submitTurn: async (id, body) => {
      log.push(body.clientTurnId);
      if (!committed.has(body.clientTurnId)) committed.set(body.clientTurnId, body.message);   // the turn is applied ...
      if (lost < lose) { lost += 1; throw new api.ApiError('timeout', 'SecurePay request timed out'); } // ... but the response never arrives
      return reply;
    } } };
}
test('uncertain delivery: POST committed + response lost -> transcript kept, same clientTurnId retried, applied exactly once', async () => {
  const server = lossyServer();
  const { controller } = agentSetup({ ...server.gateway });
  const result = await controller.sendStatement('The place is in Kilimani.');
  assert.equal(result.ok, false);
  assert.match(result.error, /could not confirm whether this step completed/);          // not "failed": delivery is UNCERTAIN
  let snap = controller.getSnapshot();
  assert.equal(snap.turns.length, 1); assert.equal(snap.turns[0].text, 'The place is in Kilimani.'); // never erased
  assert.equal(snap.pending.body.clientTurnId, server.log[0]);
  await controller.retry();
  snap = controller.getSnapshot();
  assert.deepEqual(server.log, [server.log[0], server.log[0]]);                          // SAME identity both times
  assert.equal(server.committed.size, 1);                                                // committed once
  assert.equal(snap.pending, null); assert.equal(snap.turns.length, 2);                  // user turn + the (replayed) reply
});
test('uncertain delivery: a definite 4xx also keeps the transcript; ordinary send() behaves the same', async () => {
  const { controller } = agentSetup({ submitTurn: async () => { throw new api.ApiError('http', 'no', 409); } });
  await controller.send('hello');
  assert.equal(controller.getSnapshot().turns.length, 1); assert.ok(controller.getSnapshot().pending);
});
test('add-a-detail presentation: an empty context shows NO Person/Date/Place/Amount chips by default -- one quiet "Add a detail" control', () => {
  const state = { conversationId: null, turns: [], busy: false, pending: null, error: null, context: { status: 'idle', data: null, error: null }, source: null, offerSelectionFailure: null };
  const html = api.renderToStaticMarkup(api.createElement(api.UnderstoodWorkbench, { state, controller: {}, activeSpec: null, onOpen() {} }));
  assert.match(html, /Add a detail/); assert.match(html, /aria-expanded="false"/);
  for (const chip of ['Person', 'Date', 'Place', 'Amount']) assert.doesNotMatch(html, new RegExp(`>${chip}<`), chip);
  assert.doesNotMatch(html, /Start with|not set|required|missing/i);
});

test('agent gateway: production never calls the internal identity record endpoint directly; the real /identity-selections boundary is used instead', async () => {
  const { readdir } = await import('node:fs/promises');
  const walk = async dir => (await Promise.all((await readdir(dir, { withFileTypes: true })).map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))).flat();
  for (const f of (await walk('src')).filter(f => /\.(ts|tsx)$/.test(f) && !/mockAgent|demoData/.test(f))) {
    assert.doesNotMatch(await readFile(f, 'utf8'), /api\/v1\/identities|lookupKsIdentity|KsIdentityDto/, f);
  }
  const src = await readFile('src/api/securepay/agent/index.ts', 'utf8');
  assert.match(src, /external-facts\/date/); assert.match(src, /external-facts\/amount/);
  assert.match(src, /identity-selections/); assert.match(src, /structured-inputs/);
});
