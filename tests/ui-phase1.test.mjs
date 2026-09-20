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

// ---------------------------------------------------------------- THE INSPECTED BACKEND CONTRACT
// A JS port of the RuleBasedAgreementInterpreter / LegacyFactTradeContextAdapter rules the instruments depend on,
// transcribed from SecurePayAPI @ 75a490bc (regexes verbatim). SecurePayAPI itself is NOT modified or run.
const B = (() => {
  const EXPLICIT_KES_AMOUNT = /\b(?:kes|kshs?|ksh|shs?)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(k|m|million|thousand)?\b/i;
  const AMOUNT_NOT_AMOUNT = /[0-9][0-9,]*(?:\.[0-9]{1,2})?\s*,?\s*not\s+(?:kes|kshs?|ksh|shs?)?\s*[0-9][0-9,]*(?:\.[0-9]{1,2})?/i;
  const EXPLICIT_CORRECTION = /\b(?:actually|correction|sorry|no,?|instead|change|make that|i meant|not .+ but|is not (?:a|an|the)\b|isn't (?:a|an|the)\b|are not (?:a|an|the)\b|aren't (?:a|an|the)\b|,\s*not (?:a|an|the)\b)\b/i;
  const NATURAL_DATE = /\b([0-9]{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-9]{4})\b/g;
  const PLACE_PREPOSITION = /\b(?:in|at)\s+([A-Z][a-z]{1,30})(?!['’]s)\b/g;
  const KS_NUMBER_TOKEN = /\bKS\s?([0-9]{9})\b/i;
  const NAME_IS_THE_ROLE = /\b([A-Z][a-z]{1,30})\s+is\s+the\s+([a-z]+)\b/g;
  const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
  const STOP = new Set(['I','The','This','That','My','Our','We','You','He','She','They','It','A','An','Is','Are','Was','Were','For','And','But','So','If','When','Then','There','Kes','Kshs','Ksh','Shs','Bob','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','January','February','March','April','May','June','July','August','September','October','November','December','Rent','Church','Chama','Securepay']);
  const maskRejected = text => { const m = AMOUNT_NOT_AMOUNT.exec(text); if (!m) return text; const rej = /not\s+(?:kes|kshs?|ksh|shs?)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i.exec(m[0]); const at = m.index + rej.index + rej[0].length - rej[1].length; return text.slice(0, at) + '#'.repeat(rej[1].length) + text.slice(at + rej[1].length); };
  return {
    /** facts one turn yields, keyed like the legacy adapter reads them */
    extract(text) {
      const facts = []; const correction = EXPLICIT_CORRECTION.test(text) || AMOUNT_NOT_AMOUNT.test(text);
      const scanned = maskRejected(text); const g = new RegExp(EXPLICIT_KES_AMOUNT.source, 'gi'); let last = null, m;
      while ((m = g.exec(scanned))) last = m[1].replace(/,/g, '');
      if (last && Number(last) > 0) { facts.push({ key: 'value.amount', value: String(Number(last)), correction }); facts.push({ key: 'value.currency', value: 'KES' }); }
      const lower = text.toLowerCase(); const d = new RegExp(NATURAL_DATE.source, 'g');
      while ((m = d.exec(text))) {
        const iso = `${m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
        const before = lower.slice(0, m.index).slice(-40);
        if (['starting', 'start on', 'begins on', 'begin on', 'beginning'].some(c => before.includes(c))) facts.push({ key: 'start.condition', value: `starting ${iso}` });
        else facts.push({ key: 'deadline.value', value: iso, confidence: ['by ', 'complete by', 'completed by', 'finish by', 'deadline'].some(c => before.includes(c)) ? 0.9 : 0.6 });
      }
      const p = new RegExp(PLACE_PREPOSITION.source, 'g');
      while ((m = p.exec(text))) if (!STOP.has(m[1])) facts.push({ key: 'entity.place', value: m[1], type: 'PLACE' });
      const r = new RegExp(NAME_IS_THE_ROLE.source, 'g');
      while ((m = r.exec(text))) facts.push({ key: 'entity.role', name: m[1], value: m[2] });
      const ks = KS_NUMBER_TOKEN.exec(text); if (ks) facts.push({ key: 'ks', value: `KS${ks[1]}` });
      return facts;
    },
    /** flat map: later facts overwrite earlier ones with the same key, exactly like `flat.put` in the adapter */
    flat: facts => Object.fromEntries(facts.map(f => [f.key, f.value])),
  };
})();
const stmt = (spec, draft, ctx) => api.statementFor(spec, draft, ctx);

// ---------------------------------------------------------------- KS FORMAT + WHO
test('KS format finding: platform accepts KS+3 digits, formation accepts only KS+9 digits -- a real KS such as KS003 cannot be linked', () => {
  assert.equal(api.PLATFORM_KS.test('KS003'), true); assert.equal(api.FORMATION_KS.test('KS003'), false);
  assert.deepEqual(B.extract('KS003 is the seller.').filter(f => f.key === 'ks'), []);           // the real token pattern does not see KS003
  assert.deepEqual(B.extract('KS000000003 is the seller.').filter(f => f.key === 'ks'), [{ key: 'ks', value: 'KS000000003' }]); // only a 9-digit token is read (and padding is forbidden)
  assert.equal(api.ksShape('ks 003'), 'platform-only'); assert.equal(api.ksShape('KS123456789'), 'formation-compatible');
  for (const bad of ['', 'KS', 'KS12', 'K003', 'KS000', '003']) assert.equal(api.ksShape(bad), 'malformed', bad);
});
test('ADD PERSON contract: "<Name> is the <role>." is read by the real grammar as a named person with that role -- and only that', () => {
  const sentence = stmt({ kind: 'who', origin: 'add', takenNames: [] }, { kind: 'who', name: 'john', role: 'Seller', ks: '' });
  assert.equal(sentence, 'John is the seller.');
  assert.deepEqual(B.extract(sentence), [{ key: 'entity.role', name: 'John', value: 'seller' }]);   // no ks fact, no place, no amount, no date
  assert.equal(api.canonicalRole('seller'), 'SELLER');
  assert.equal(stmt({ kind: 'who', origin: 'add' }, { kind: 'who', name: 'Peter', role: 'contractor', ks: '' }), 'Peter is the contractor.'); // SERVICE_PROVIDER
});
test('ADD PERSON: only what the grammar and RoleVocabulary can represent is accepted; taken names and unknown roles produce nothing', () => {
  const spec = { kind: 'who', origin: 'add', takenNames: ['John'] };
  assert.equal(stmt(spec, { kind: 'who', name: 'Mary Anne', role: 'seller', ks: '' }), null);       // one first name only
  assert.equal(stmt(spec, { kind: 'who', name: 'Friday', role: 'seller', ks: '' }), null);          // stoplisted word
  assert.equal(stmt(spec, { kind: 'who', name: 'john', role: 'buyer', ks: '' }), null);             // already held: re-roling is conversation
  assert.equal(stmt(spec, { kind: 'who', name: 'Mary', role: 'service provider', ks: '' }), null);   // backend would file it as OTHER
  assert.equal(stmt(spec, { kind: 'who', name: 'Mary', role: '', ks: '' }), null);
  assert.equal(api.parsePersonName('John', ['john']).reason, 'taken');
});
test('ADD PERSON claims no identity: a typed KS Number never enters the statement, is never sent, and is kept when the instrument is closed', () => {
  const spec = { kind: 'who', origin: 'add', takenNames: [] };
  assert.equal(stmt(spec, { kind: 'who', name: 'John', role: 'seller', ks: 'KS003' }), 'John is the seller.');
  assert.equal(stmt(spec, { kind: 'who', name: '', role: 'seller', ks: 'KS003' }), null);          // KS alone can never be sent
  const { agent, calls } = fakeAgent({ result: () => ({ ok: true, context: null }) });
  const ic = api.createInstrumentController(agent);
  ic.open(spec); ic.setDraft({ kind: 'who', name: '', role: '', ks: 'KS003' }); ic.cancel();
  assert.equal(ic.getSnapshot().active, null);
  ic.open(spec); assert.equal(ic.getSnapshot().draft.ks, 'KS003'); assert.deepEqual(calls, []);
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
test('KS route: the Agent KSNUMBER_PICKER is an honest note (no control); PERSON_PICKER opens Add person', () => {
  assert.deepEqual(api.agentComponentView({ type: 'KSNUMBER_PICKER', data: {} }), { type: 'UNAVAILABLE_INPUT', input: 'ks-number' });
  assert.deepEqual(api.agentComponentView({ type: 'PERSON_PICKER', data: { role: 'seller' } }), { type: 'INSTRUMENT_PROMPT', instrument: 'who', hints: { role: 'seller' } });
  const html = api.renderToStaticMarkup(api.createElement(api.InstrumentPrompt, { unavailable: 'ks-number' }));
  assert.doesNotMatch(html, /<button|<input/); assert.match(html, /can.t check a KS Number/);
  const spec = api.specForPrompt({ type: 'INSTRUMENT_PROMPT', instrument: 'who', hints: { role: 'seller' } }, api.projectWorkbench(null)).spec;
  assert.equal(spec.kind, 'who'); assert.equal(spec.role, 'seller');
});
test('existing people are read-only rows (re-roling cannot be proven safe); "Add" can still add another person', () => {
  const wb = api.projectWorkbench(ctx([ent('j', 'PERSON', 'John', 'CANDIDATE')], [rel('r', 'ROLE', 'j', { role: 'SELLER' }, 'CANDIDATE')]));
  assert.equal(wb.items[0].spec, null);
  const add = wb.adds.find(a => a.key === 'who'); assert.deepEqual(add.spec.takenNames, ['John']);
});

test('roles: UI vocabulary maps to real backend canonical roles; "service provider" is NOT offered (backend would file it as OTHER)', () => {
  assert.equal(api.KNOWN_ROLES.includes('service provider'), false);
  assert.deepEqual([api.canonicalRole('contractor'), api.canonicalRole('supplier'), api.canonicalRole('Seller'), api.canonicalRole('service provider')], ['SERVICE_PROVIDER', 'SERVICE_PROVIDER', 'SELLER', null]);
  for (const w of api.KNOWN_ROLES) assert.notEqual(api.canonicalRole(w), 'OTHER');
});
const whoCtx = (over = {}) => ctx(
  [ent('john', 'PERSON', 'John', 'CANDIDATE'), ent('ks', 'PERSON', 'Anna', 'CONFIRMED', { ksnumber: 'KS000000003' }), ...(over.entities ?? [])],
  [rel('r1', 'ROLE', 'john', { role: 'SELLER', descriptor: 'seller' }, 'CANDIDATE'), rel('r2', 'ROLE', 'ks', { role: 'BUYER', descriptor: 'buyer' }), ...(over.relationships ?? [])]);
test('WHO read-back: KS + role must be on the SAME entity and the role must be the selected canonical role', () => {
  const who = (ks, role, entityName) => api.isWhoLinked(whoCtx(), { ks, role, entityName });
  assert.equal(who('KS000000003', 'buyer'), true);                       // correct KS + correct role, same entity
  assert.equal(who('KS000000003', 'seller'), false);                     // correct KS + wrong role (the KS holder is the BUYER; John is the seller)
  assert.equal(who('KS000000009', 'buyer'), false);                      // wrong KS + correct role elsewhere
  assert.equal(who('KS000000003', 'seller', 'John'), false);             // the same role on ANOTHER entity does not count for the KS entity
  assert.equal(who('KS000000003', 'buyer', 'John'), false);              // intended entity has no KS
  assert.equal(api.isWhoLinked(whoCtx(), { ks: '', role: 'seller' }), false);           // unresolved identity
  assert.equal(api.isWhoLinked(whoCtx(), { ks: 'KS000000003', role: 'service provider' }), false); // unrecognised word: no canonical role to prove
  const linked = ctx([ent('j', 'PERSON', 'John', 'CANDIDATE', { ksnumber: 'KS000000003' })], [rel('r', 'ROLE', 'j', { role: 'SERVICE_PROVIDER', descriptor: 'contractor' }, 'CANDIDATE')]);
  assert.equal(api.isWhoLinked(linked, { ks: 'KS000000003', role: 'contractor', entityName: 'John' }), true);   // candidate state does not change linkage truth
  const confirmed = ctx([ent('j', 'PERSON', 'John', 'CONFIRMED', { ksnumber: 'KS000000003' })], [rel('r', 'ROLE', 'j', { role: 'SERVICE_PROVIDER' }, 'CONFIRMED')]);
  assert.equal(api.isWhoLinked(confirmed, { ks: 'KS000000003', role: 'supplier' }), true);
  const kinOnly = ctx([ent('j', 'PERSON', 'John', 'CONFIRMED', { ksnumber: 'KS000000003' })], []);
  assert.equal(api.isWhoLinked(kinOnly, { ks: 'KS000000003', role: 'seller' }), false);  // KS without any role relationship
});

// ---------------------------------------------------------------- MONEY (KES only)
test('amount: decimal strings only, comma/space tolerant, precision and zero rules', () => {
  assert.deepEqual(api.parseAmount('4,000'), { ok: true, value: '4000' });
  assert.deepEqual(api.parseAmount('4 000.50'), { ok: true, value: '4000.5' });
  for (const bad of ['1.234', '-5', '1e5', 'abc', '1.2.3', '9999999999999']) assert.equal(api.parseAmount(bad).ok, false, bad);
  assert.equal(api.parseAmount('0').reason, 'zero'); assert.equal(api.parseAmount('').reason, 'empty');
  assert.equal(api.formatMoney('9007199254740993', 'KES'), 'KES 9,007,199,254,740,993');
  assert.equal(api.sameAmount('4,000', '4000.00'), true);
});
test('contract: the interpreter files EVERY amount as KES -- so the UI is KES-only and a non-KES statement is never produced', () => {
  const usd = B.flat(B.extract('The amount is USD 4,000.'));
  assert.equal(usd['value.amount'], undefined);                            // "USD 4,000" is not even recognised as money by the KES pattern
  assert.equal(B.flat(B.extract('The amount is KES 4,000.'))['value.currency'], 'KES');
  const spec = { kind: 'money', origin: 'add' };
  assert.equal(stmt(spec, { kind: 'money', amount: '4000', currency: 'USD' }), null);
  assert.equal(stmt(spec, { kind: 'money', amount: 'abc', currency: 'KES' }), null);
});
test('contract: first amount and correction sentences yield exactly the intended amount (rejected figure masked, correction flagged)', () => {
  const first = stmt({ kind: 'money', origin: 'add' }, { kind: 'money', amount: '4,000', currency: 'KES' });
  assert.equal(first, 'The amount is KES 4,000.');
  assert.deepEqual(B.flat(B.extract(first)), { 'value.amount': '4000', 'value.currency': 'KES' });
  const fix = stmt({ kind: 'money', origin: 'understood', amount: '4000' }, { kind: 'money', amount: '5000', currency: 'KES' }, { previousAmount: '4000' });
  assert.equal(fix, 'Correction: the amount is KES 5,000, not KES 4,000.');
  const facts = B.extract(fix);
  assert.equal(facts.find(f => f.key === 'value.amount').value, '5000');   // NOT 4000
  assert.equal(facts.find(f => f.key === 'value.amount').correction, true); // so the backend supersedes rather than appends
  const same = stmt({ kind: 'money', origin: 'understood', amount: '4000' }, { kind: 'money', amount: '4000', currency: 'KES' }, { previousAmount: '4000' });
  assert.equal(same, 'The amount is KES 4,000.');
});
test('money read-back: amount AND currency must both match', () => {
  const kes = ctx([ent('c', 'CONCEPT', 'value')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '4000', currency: 'KES' })]);
  const usd = ctx([ent('c', 'CONCEPT', 'value')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '4000', currency: 'USD' })]);
  const spec = { kind: 'money' };
  assert.equal(api.isRecorded(spec, { kind: 'money', amount: '4,000', currency: 'KES' }, kes), true);
  assert.equal(api.isRecorded(spec, { kind: 'money', amount: '5000', currency: 'KES' }, kes), false);
  assert.equal(api.isRecorded(spec, { kind: 'money', amount: '4000', currency: 'KES' }, usd), false);   // same amount, wrong currency
  assert.equal(api.isRecorded(spec, { kind: 'money', amount: '4000', currency: 'USD' }, usd), false);   // USD can never be "recorded" by this path
  assert.equal(api.isRecorded(spec, { kind: 'money', amount: '4000', currency: 'KES' }, ctx([ent('c', 'CONCEPT', 'value')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '4000' })])), false); // currency absent
});
test('money: a non-KES existing amount is read-only (never offered for editing) and an Agent AMOUNT_INPUT gets an honest note', () => {
  const usd = api.projectWorkbench(ctx([ent('c', 'CONCEPT', 'value')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '4000', currency: 'USD' })]));
  const row = usd.items.find(i => i.section === 'money'); assert.equal(row.value, 'USD 4,000'); assert.equal(row.spec, null);
  assert.ok('note' in api.specForPrompt({ type: 'INSTRUMENT_PROMPT', instrument: 'money', hints: { currency: 'USD' } }, usd));
  assert.equal(usd.adds.some(a => a.key === 'money'), false);
});

// ---------------------------------------------------------------- DATE (one date, no time, no range)
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
test('calendar render: injected month, nothing pre-selected, NO time field and NO range mode', () => {
  const html = api.renderToStaticMarkup(api.createElement(api.CalendarInstrument, { spec: { kind: 'when', origin: 'agent' }, draft: { kind: 'when', date: null }, onChange() {}, disabled: false, today: '2031-02-09' }));
  assert.match(html, /February 2031/); assert.match(html, /Choose a day/);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 0);
  assert.doesNotMatch(html, /type="time"|Time \(optional\)/i);
});
test('contract: the single-date sentence is read by the real grammar as ONE ISO deadline; nothing else is extracted', () => {
  const sentence = stmt({ kind: 'when', origin: 'add' }, { kind: 'when', date: '2026-09-25' });
  assert.equal(sentence, 'The date is Friday, 25 September 2026.');
  assert.deepEqual(B.extract(sentence), [{ key: 'deadline.value', value: '2026-09-25', confidence: 0.6 }]);  // stored as an ISO CANDIDATE; adoption is the person's separate "Use this"
  assert.equal(stmt({ kind: 'when', origin: 'add' }, { kind: 'when', date: null }), null);
});
test('contract: a date RANGE cannot be represented -- start and end collapse into one `deadline.value` key -- so it is deferred, not faked', () => {
  const facts = B.extract('The dates are from Thursday, 1 October 2026 to Monday, 5 October 2026.');
  assert.equal(facts.filter(f => f.key === 'deadline.value').length, 2);
  assert.equal(B.flat(facts)['deadline.value'], '2026-10-05');            // the start date is gone
  const view = api.agentComponentView({ type: 'DATE_RANGE_PICKER', data: {} });
  assert.deepEqual(view, { type: 'UNAVAILABLE_INPUT', input: 'date-range' });
  const html = api.renderToStaticMarkup(api.createElement(api.InstrumentPrompt, { unavailable: 'date-range' }));
  assert.doesNotMatch(html, /<button|<input/); assert.match(html, /keeps one date/);
});
test('time: no structured formation time exists, so no time is offered, sent or "verified"', async () => {
  assert.equal(B.extract('The date is Friday, 25 September 2026 at 3:00 pm.').some(f => /time/i.test(f.key)), false); // parser drops it
  for (const f of ['src/features/instruments/model.ts', 'src/features/instruments/ui/CalendarInstrument.tsx', 'src/features/instruments/verify.ts']) assert.doesNotMatch(await readFile(f, 'utf8'), /friendlyTime|type="time"|time:/, f);
});
test('date read-back: exactly that ISO date must be the active deadline; a stale different one is a conflict, not success', () => {
  const one = ctx([ent('d', 'CONCEPT', 'deadline')], [rel('r', 'CONDITION', 'd', { date: '2026-09-25' }, 'CANDIDATE')]);
  const two = ctx([ent('d', 'CONCEPT', 'deadline')], [rel('r', 'CONDITION', 'd', { date: '2026-09-25' }, 'CANDIDATE'), rel('q', 'CONDITION', 'd', { date: '2026-10-01' }, 'CONFIRMED')]);
  const spec = { kind: 'when' };
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-09-25' }, one), true);
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-09-26' }, one), false);
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-09-25' }, two), false);
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-09-25' }, ctx([], [])), false);
  assert.equal(api.isRecorded(spec, { kind: 'when', date: '2026-09-25' }, ctx([ent('d', 'CONCEPT', 'start')], [rel('r', 'CONDITION', 'd', { startDate: '2026-09-25' })])), false); // "starting" is a different meaning
});
test('date: only a FIRST date is offered; a recorded date is shown read-only in words and changed through conversation', () => {
  const dated = api.projectWorkbench(ctx([ent('d', 'CONCEPT', 'deadline')], [rel('r', 'CONDITION', 'd', { date: '2026-09-25' }, 'CANDIDATE')]));
  const row = dated.items.find(i => i.section === 'when');
  assert.equal(row.value, 'Friday, 25 September 2026'); assert.equal(row.spec, null); assert.equal(dated.adds.some(a => a.key === 'when'), false);
  assert.ok('note' in api.specForPrompt({ type: 'INSTRUMENT_PROMPT', instrument: 'when', hints: {} }, dated));
  assert.ok('spec' in api.specForPrompt({ type: 'INSTRUMENT_PROMPT', instrument: 'when', hints: {} }, api.projectWorkbench(null)));
});

// ---------------------------------------------------------------- WHERE (real place grammar)
test('contract: "The location is Kilimani." is NOT read as a place by the real grammar; the emitted "in <Place>" sentence is', () => {
  assert.deepEqual(B.extract('The location is Kilimani.').filter(f => f.type === 'PLACE'), []);
  const sentence = stmt({ kind: 'where', origin: 'add' }, { kind: 'where', place: 'Kilimani' });
  assert.equal(sentence, 'The place is in Kilimani.');
  assert.deepEqual(B.extract(sentence).filter(f => f.type === 'PLACE'), [{ key: 'entity.place', value: 'Kilimani', type: 'PLACE' }]);
});
test('contract: place input is limited to what the grammar can read back (one capitalised word, not a stopword)', () => {
  assert.deepEqual(api.parsePlace('kilimani'), { ok: true, value: 'Kilimani' });
  assert.equal(api.parsePlace('Kilimani, Nairobi').ok, false);
  assert.equal(api.parsePlace('Kilimani Road').ok, false);
  assert.equal(api.parsePlace('Friday').reason, 'reserved'); assert.equal(api.parsePlace('Church').reason, 'reserved'); assert.equal(api.parsePlace('').reason, 'empty');
  assert.equal(stmt({ kind: 'where', origin: 'add' }, { kind: 'where', place: 'Kilimani, Nairobi' }), null);
  assert.equal(B.extract('The place is in Kilimani, Nairobi.').filter(f => f.type === 'PLACE').length, 1); // truncation the UI now prevents
});
test('where read-back: exactly the selected place; an older, different place still active is a conflict, never success', () => {
  const spec = { kind: 'where' };
  const one = ctx([ent('p', 'PLACE', 'Kilimani')], []);
  const both = ctx([ent('p', 'PLACE', 'Kilimani'), ent('w', 'PLACE', 'Westlands')], []);
  assert.equal(api.isRecorded(spec, { kind: 'where', place: 'Kilimani' }, one), true);
  assert.equal(api.isRecorded(spec, { kind: 'where', place: 'Kilimani' }, both), false);   // Westlands -> Kilimani cannot be superseded by formation
  assert.equal(api.isRecorded(spec, { kind: 'where', place: 'Kilimani' }, ctx([ent('p', 'PERSON', 'Kilimani')], [])), false); // became a PERSON: not a place
  assert.equal(api.isRecorded(spec, { kind: 'where', place: 'Kilimani' }, ctx([], [])), false);
});
test('where: only a FIRST place is offered; a recorded place is read-only and corrections go to conversation', () => {
  const placed = api.projectWorkbench(ctx([ent('w', 'PLACE', 'Westlands')], []));
  assert.equal(placed.items.find(i => i.section === 'where').spec, null); assert.equal(placed.adds.some(a => a.key === 'where'), false);
  assert.ok('note' in api.specForPrompt({ type: 'INSTRUMENT_PROMPT', instrument: 'where', hints: {} }, placed));
});

// ---------------------------------------------------------------- AGENT COMPONENT BRIDGE
test('bridge: each safe model-proposable component parses; unsupported ones become honest UNAVAILABLE notes', () => {
  const kinds = { PERSON_PICKER: 'who', DATE_PICKER: 'when', AMOUNT_INPUT: 'money', LOCATION_PICKER: 'where' };
  for (const [type, instrument] of Object.entries(kinds)) assert.deepEqual(api.agentComponentView({ type, data: {} }), { type: 'INSTRUMENT_PROMPT', instrument, hints: {} }, type);
  assert.deepEqual(api.agentComponentView({ type: 'PHOTO_UPLOAD', data: {} }), { type: 'UNAVAILABLE_INPUT', input: 'photo' });
  assert.deepEqual(api.agentComponentView({ type: 'DOCUMENT_UPLOAD', data: { anything: 'x' } }), { type: 'UNAVAILABLE_INPUT', input: 'document' });
  assert.deepEqual(api.agentComponentView({ type: 'DATE_RANGE_PICKER', data: {} }), { type: 'UNAVAILABLE_INPUT', input: 'date-range' });
  assert.deepEqual(api.agentComponentView({ type: 'KSNUMBER_PICKER', data: {} }), { type: 'UNAVAILABLE_INPUT', input: 'ks-number' });
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

// ---------------------------------------------------------------- TRADE CONTEXT + WORKBENCH
test('trade context: a relationship with NO objectEntityId (backend non_null omits it) is accepted, not "unreadable"', () => {
  const view = ctx([ent('c1', 'CONCEPT', 'value')], [rel('r1', 'PAYMENT_CONDITION', 'c1', { amount: '4000', currency: 'KES' })]);
  assert.equal(view.relationships[0].objectEntityId, null);
  assert.throws(() => api.tradeContextView({ conversationId: 'c', version: 1, entities: [], relationships: [{ id: 'r', kind: 'ROLE', subjectEntityId: 'e', objectEntityId: 5, qualifiers: {}, state: 'CONFIRMED' }] }));
});
const golden = () => ctx(
  [ent('s', 'SERVICE', 'House painting'), ent('john', 'PERSON', 'John', 'CANDIDATE'), ent('v', 'CONCEPT', 'value'), ent('d', 'CONCEPT', 'deadline'), ent('k', 'PERSON', 'Anna', 'CONFIRMED', { ksnumber: 'KS000000003' })],
  [rel('r1', 'ROLE', 'john', { role: 'SELLER', descriptor: 'seller' }, 'CANDIDATE'), rel('r2', 'ROLE', 'k', { role: 'BUYER' }), rel('r3', 'PAYMENT_CONDITION', 'v', { amount: '20000', currency: 'KES' }), rel('r4', 'CONDITION', 'd', { date: '2026-09-25' }, 'CANDIDATE')]);
test('workbench: rows are exactly what the backend holds, with an instrument ONLY where the result can be read back', () => {
  const wb = api.projectWorkbench(golden());
  const by = key => wb.items.filter(i => i.key.startsWith(key));
  assert.equal(by('what:')[0].value, 'House painting'); assert.equal(by('what:')[0].spec, null);
  const who = by('who:'); assert.equal(who.length, 2);
  const john = who.find(i => i.value === 'John'); const anna = who.find(i => i.value === 'Anna');
  assert.equal(john.identityUnresolved, true); assert.deepEqual(john.details, ['Seller']); assert.equal(john.state, 'CANDIDATE');
  assert.equal(john.spec, null);                 // an existing person is changed in conversation, never through a dead-end control
  assert.equal(anna.identityUnresolved, false); assert.equal(anna.state, 'CONFIRMED');
  assert.equal(by('when:')[0].value, 'Friday, 25 September 2026'); assert.equal(by('when:')[0].spec, null);
  assert.equal(by('money:')[0].value, 'KES 20,000'); assert.equal(by('money:')[0].spec.amount, '20000');
  assert.equal(wb.items.some(i => i.section === 'where'), false);
  assert.deepEqual(wb.adds.map(a => a.key), ['who', 'where']);   // contextual possibilities: another person, a first place -- no date/amount (held)
});
test('workbench: not a five-field form -- empty has no rows; complex money stays conversational; non-money facts are shown', () => {
  const empty = api.projectWorkbench(null);
  assert.equal(empty.empty, true); assert.deepEqual(empty.adds.map(a => a.label), ['Person', 'Date', 'Place', 'Amount']);
  const plan = api.projectWorkbench(ctx([ent('c', 'CONCEPT', 'contribution'), ent('p', 'PERSON', 'Chama')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '20000', appliesTo: 'each member', frequency: 'monthly' }), rel('q', 'AUTHORITY_RULE', 'c', { rule: 'two of three sign', domain: 'DECISION_QUORUM' })]));
  const money = plan.items.find(i => i.section === 'money');
  assert.equal(money.spec, null); assert.deepEqual(money.details, ['each member', 'monthly']);
  assert.ok(plan.items.some(i => i.section === 'other' && i.value === 'two of three sign'));
});
test('workbench: "being considered" stays a candidate and is shown as such', () => {
  const wb = api.projectWorkbench(ctx([ent('p', 'PERSON', 'Peter', 'CANDIDATE')], [rel('r', 'ROLE', 'p', { role: 'PROVIDER_CANDIDATE', status: 'CONSIDERED' }, 'CANDIDATE')]));
  const peter = wb.items[0];
  assert.deepEqual(peter.details, ['Being considered']); assert.equal(peter.state, 'CANDIDATE'); assert.equal(peter.spec, null);
  assert.deepEqual(peter.adopt.map(a => a.targetKind).sort(), ['ENTITY', 'RELATIONSHIP']);
});
test('workbench render: only actionable rows are buttons; candidates say "Suggested"; the word "Confirmed" is never used', () => {
  const state = { conversationId: 'c', turns: [], busy: false, pending: null, error: null, context: { status: 'ready', data: golden(), error: null }, source: null, offerSelectionFailure: null };
  const html = api.renderToStaticMarkup(api.createElement(api.UnderstoodWorkbench, { state, controller: {}, activeSpec: null, onOpen() {}, stillToSettle: ['Where the house is'] }));
  assert.match(html, /aria-label="Money: KES 20,000\. Change the amount"/); assert.doesNotMatch(html, /aria-label="Who:/);
  assert.doesNotMatch(html, /aria-label="When:/); assert.doesNotMatch(html, /aria-label="What:/);
  assert.match(html, /Friday, 25 September 2026/); assert.match(html, /Suggested/); assert.match(html, /KS Number not set/); assert.match(html, /Use this/);
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

// ---------------------------------------------------------------- INSTRUMENT LIFECYCLE
function fakeAgent({ result, retryOutcome } = {}) {
  const calls = [];
  const snapshot = { pending: null, error: null, context: { status: 'ready', data: null, error: null } };
  return { calls, snapshot, agent: {
    getSnapshot: () => snapshot,
    sendStatement: async text => { calls.push(['statement', text]); return result(); },
    retry: async () => { calls.push(['retry']); Object.assign(snapshot, retryOutcome()); },
    review: async () => { calls.push(['review']); },
  } };
}
const moneySpec = { kind: 'money', origin: 'understood', amount: '4000' };
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
test('instrument lifecycle: an uncertain delivery freezes the choice; Retry is the SAME turn; Close never rewrites history', async () => {
  const good = ctx([ent('c', 'CONCEPT', 'value')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '5000', currency: 'KES' })]);
  const fa = fakeAgent({ result: () => ({ ok: false, error: 'SecurePay could not confirm whether this step completed.' }), retryOutcome: () => ({ pending: null, error: null, context: { status: 'ready', data: good, error: null } }) });
  const ic = api.createInstrumentController(fa.agent);
  ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5000', currency: 'KES' });
  await ic.submit();
  assert.equal(ic.getSnapshot().phase, 'failed'); assert.equal(ic.getSnapshot().draft.amount, '5000');
  ic.setDraft({ kind: 'money', amount: '9999', currency: 'KES' });          // a DIFFERENT statement over an unresolved one: refused
  assert.equal(ic.getSnapshot().draft.amount, '5000');
  await ic.retry();
  assert.equal(fa.calls.filter(c => c[0] === 'statement').length, 1);      // retry is agent.retry (same clientTurnId), never a second statement
  assert.deepEqual(fa.calls.at(-1), ['retry']); assert.equal(ic.getSnapshot().active, null);
  const fb = fakeAgent({ result: () => ({ ok: false, error: 'down' }) });
  const ic2 = api.createInstrumentController(fb.agent);
  ic2.open(moneySpec); ic2.setDraft({ kind: 'money', amount: '5000', currency: 'KES' }); await ic2.submit();
  ic2.cancel();
  assert.equal(ic2.getSnapshot().active, null);
  assert.equal(fb.calls.some(c => c[0] === 'discard'), false);
});
test('instrument lifecycle: "check what SecurePay understands" closes a failed delivery ONLY if the fact is proven; otherwise it stays retryable', async () => {
  const good = ctx([ent('c', 'CONCEPT', 'value')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '5000', currency: 'KES' })]);
  const stale = ctx([ent('c', 'CONCEPT', 'value')], [rel('r', 'PAYMENT_CONDITION', 'c', { amount: '4000', currency: 'KES' })]);
  for (const [data, closes] of [[good, true], [stale, false]]) {
    const fa = fakeAgent({ result: () => ({ ok: false, error: 'x' }) });
    const ic = api.createInstrumentController(fa.agent);
    ic.open(moneySpec); ic.setDraft({ kind: 'money', amount: '5000', currency: 'KES' }); await ic.submit();
    fa.snapshot.context = { status: 'ready', data, error: null };
    await ic.recheck();
    assert.equal(ic.getSnapshot().active === null, closes);
    if (!closes) assert.equal(ic.getSnapshot().phase, 'failed');
  }
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
test('uncertain delivery: a DIFFERENT statement is not sent over an unresolved one; instrument Close does not erase the uncertain turn', async () => {
  const server = lossyServer();
  const { controller } = agentSetup({ ...server.gateway });
  const ic = api.createInstrumentController(controller);
  ic.open({ kind: 'where', origin: 'add' }); ic.setDraft({ kind: 'where', place: 'Kilimani' });
  await ic.submit();
  assert.equal(ic.getSnapshot().phase, 'failed');
  const blocked = await controller.sendStatement('The place is in Westlands.');
  assert.equal(blocked.ok, false); assert.equal(server.log.length, 1);                   // nothing new reached the server
  ic.cancel();
  assert.equal(ic.getSnapshot().active, null);
  assert.equal(controller.getSnapshot().turns.length, 1); assert.ok(controller.getSnapshot().pending);   // history and pending identity intact
  assert.equal(typeof controller.discardFailedTurn, 'undefined');                        // the unsafe capability no longer exists
  await controller.retry();
  assert.equal(server.committed.size, 1);
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

test('agent gateway: production never calls the identity record endpoint; external-fact paths remain for external evidence', async () => {
  const { readdir } = await import('node:fs/promises');
  const walk = async dir => (await Promise.all((await readdir(dir, { withFileTypes: true })).map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))).flat();
  for (const f of (await walk('src')).filter(f => /\.(ts|tsx)$/.test(f) && !/mockAgent|demoData/.test(f))) {
    assert.doesNotMatch(await readFile(f, 'utf8'), /api\/v1\/identities|lookupKsIdentity|KsIdentityDto/, f);
  }
  const src = await readFile('src/api/securepay/agent/index.ts', 'utf8');
  assert.match(src, /external-facts\/date/); assert.match(src, /external-facts\/amount/);
});
