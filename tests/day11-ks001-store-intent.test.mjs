import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestedStoreSearchTerm} from '../src/features/living-workspace/suggestedStoreSearchTerm.mjs';

test('explicit buying question extracts product, not personal delivery context', () => {
  assert.equal(suggestedStoreSearchTerm('Where can I buy 40 bags of cement near Varsityville?'), 'cement');
  assert.equal(suggestedStoreSearchTerm('I want to buy 8 packets of milk in Kamakis'), 'milk');
  assert.equal(suggestedStoreSearchTerm('I am looking for fresh sukuma in Ruiru'), 'fresh sukuma');
  assert.equal(suggestedStoreSearchTerm('Buy a phone'), 'phone');
});

test('non-shopping, vague, private or overlong questions never produce a public Store search', () => {
  for(const value of [
    'Please explain my estate constitution',
    'How does the agreement work?',
    'Can a Master inspect construction?',
    'Where can I buy something?',
    'I want to buy help',
    'Where can I buy 400234999945',
    'Where can I buy account PIN',
    'Where can I buy from https://example.com',
    'Where can I buy ' + 'X'.repeat(1000)
  ]) assert.equal(suggestedStoreSearchTerm(value), null, value.slice(0,50));
});

test('search phrase is bounded and never carries a private location suffix', () => {
  const result=suggestedStoreSearchTerm('I need to buy a long durable sustainable reusable water storage tank for the garden near my home');
  assert.ok(result===null || result.length<=65);
  assert.equal(suggestedStoreSearchTerm('Where can I buy cement near 1 Lower Lakeview road?'), 'cement');
});
