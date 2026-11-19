import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COLLECTION_TYPE_PROFILES, CADENCE_OPTIONS, collectionTypesFor,
  newCollectionTypeSelection, chooseCollectionType, chooseCollectionCadence,
  assessCollectionTypeSelection, canExecuteTypeSelection,
} from '../src/features/mini-collect/collectionTypes.mjs';
import {
  newGovernanceDraft, withGovernanceAnswer, assessGovernanceDraft,
} from '../src/features/mini-collect/governanceDraft.mjs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('C5A: every existing Mini purpose has real-world type-specific paths', () => {
  const kinds = ['buy', 'paid', 'regular', 'group', 'give', 'goal'];
  for (const kind of kinds) {
    const types = collectionTypesFor(kind);
    assert.ok(types.length >= 1, kind);
    for (const type of types) {
      assert.equal(type.kind, kind);
      assert.ok(type.title.length > 2);
      assert.ok(type.checks.length >= 3);
      assert.ok(type.cadences.length >= 1);
      assert.ok(type.cadences.every(c => CADENCE_OPTIONS.some(o => o.id === c)));
    }
  }
  assert.equal(new Set(COLLECTION_TYPE_PROFILES.map(t => t.id)).size, COLLECTION_TYPE_PROFILES.length);
  assert.deepEqual(collectionTypesFor('unknown'), []);
});

test('C5A: a collection type cannot be mixed across unrelated purposes', () => {
  let selection = newCollectionTypeSelection('paid');
  assert.deepEqual(assessCollectionTypeSelection(selection).missing, ['Choose the type of collection']);
  assert.throws(() => chooseCollectionType(selection, 'chama-cycle'), /match its purpose/);
  selection = chooseCollectionType(selection, 'school-fees');
  assert.equal(selection.cadence, null);
  assert.equal(assessCollectionTypeSelection(selection).draftComplete, false);
  assert.throws(() => chooseCollectionCadence(selection, 'monthly'), /not permitted/);
  selection = chooseCollectionCadence(selection, 'school-term');
  assert.equal(assessCollectionTypeSelection(selection).draftComplete, true);
  assert.equal(assessCollectionTypeSelection(selection).paymentAuthorized, false);
  assert.equal(assessCollectionTypeSelection(selection).recurringDebitAuthorized, false);
  assert.equal(assessCollectionTypeSelection(selection).refundAuthorized, false);
  assert.equal(canExecuteTypeSelection(), false);
});

test('C5A: changing type clears a prior cadence and cannot silently renew', () => {
  const initial = newCollectionTypeSelection('paid');
  const school = chooseCollectionCadence(chooseCollectionType(initial, 'school-fees'), 'school-term');
  const goods = chooseCollectionType(school, 'thrift-item');
  assert.equal(goods.cadence, null);
  assert.throws(() => chooseCollectionCadence(goods, 'school-term'), /not permitted/);
  assert.equal(assessCollectionTypeSelection(goods).draftComplete, false);
  assert.equal(chooseCollectionCadence(goods, 'instalments').cadence, 'instalments');
});

test('C5A: profiles distinguish voluntary gifts from debts and conditional obligations', () => {
  for (const profile of collectionTypesFor('give')) {
    assert.equal(profile.obligation, 'voluntary', profile.id);
  }
  assert.equal(COLLECTION_TYPE_PROFILES.find(p => p.id === 'school-fees').obligation, 'amount-due');
  assert.equal(COLLECTION_TYPE_PROFILES.find(p => p.id === 'school-transport').obligation, 'conditional');
  assert.equal(COLLECTION_TYPE_PROFILES.find(p => p.id === 'chama-cycle').obligation, 'group-rule');
  assert.match(COLLECTION_TYPE_PROFILES.find(p => p.id === 'thrift-item').checks.join(' '), /each buyer/);
  assert.match(COLLECTION_TYPE_PROFILES.find(p => p.id === 'estate-dues').checks.join(' '), /month/);
});

test('C5A: choice enters C2 review without claiming canonical governance or money', () => {
  const typeSelection = chooseCollectionCadence(
    chooseCollectionType(newCollectionTypeSelection('regular'), 'estate-dues'), 'monthly');
  const d = newGovernanceDraft('regular', typeSelection);
  assert.equal(d.collectionTypeId, 'estate-dues');
  assert.equal(d.collectionCadence, 'monthly');
  assert.equal(d.capacity, null);
  assert.equal(assessGovernanceDraft(d, '2026-11-19').activationAllowed, false);
  assert.throws(() => withGovernanceAnswer(d, 'collectionCadence', 'one-time'), /Invalid governance answer/);
  assert.throws(() => withGovernanceAnswer(d, 'collectionTypeId', 'chama-cycle'), /Invalid governance answer/);
  assert.throws(() => newGovernanceDraft('group', typeSelection), /must match/);
  assert.throws(() => newGovernanceDraft('regular', { ...typeSelection, typeId: 'chama-cycle' }), /must match/);
});

test('C5A: flows remain in Mini and visibly prohibit automatic Money and synthetic outcomes', () => {
  const c1 = source('src/features/mini-collect/C1CollectExperience.tsx');
  const c2 = source('src/features/mini-collect/C2GovernanceExperience.tsx');
  const c5 = source('src/features/mini-collect/C5CollectionTypes.tsx');
  assert.match(c1, /C5CollectionTypes kind=\{selected\.id\}/);
  assert.match(c1, /C2GovernanceExperience kind=\{selected\.id\} collectionTypeSelection=\{collectionType\}/);
  assert.match(c2, /newGovernanceDraft\(kind, collectionTypeSelection\)/);
  assert.match(c2, /Choosing a frequency does not authorize automatic debits/);
  assert.match(c5, /No automatic debit, extension or new debt is authorized here/);
  assert.match(c5, /onContinue\(selection\)/);
  assert.doesNotMatch(c5, /(?:fetch\s*\(|connectToMoney|markAsPaid|executePayment|refundInstructed\s*:\s*true)/);
});
