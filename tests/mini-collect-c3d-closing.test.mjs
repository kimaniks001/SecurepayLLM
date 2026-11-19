import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const c3c = readFileSync(
  new URL('../src/features/mini-collect/C3ProviderComparison.tsx', import.meta.url), 'utf8');
const c3d = readFileSync(
  new URL('../src/features/mini-collect/C3DClosingPreview.tsx', import.meta.url), 'utf8');
const prev = readFileSync(
  new URL('../src/features/mini-collect/C3ProviderPossibilities.tsx', import.meta.url), 'utf8');

test('C3D follows C3C provider comparison but never invents a bank', () => {
  assert.match(prev, /C3ProviderComparison draft=\{draft\}/);
  assert.match(c3c, /Explore what happens when this collection closes/);
  assert.match(c3c, /C3DClosingPreview draft=\{draft\}/);
  assert.match(c3d, /Illustrative C3D planning only/);
  assert.doesNotMatch(c3d, /fetch\(|axios|localStorage|sessionStorage|\.pay\(|\.refund\(/);
});

test('C3D has approachable answer pills for finite human resolution deadlines', () => {
  for (const phrase of ['Within 1 day','Within 3 days','Within 7 days',
    'By day 8','By day 10','By day 14','By day 15','By day 21',
    'By day 30','aria-pressed','Review how contributors are protected',
    'Adjust the deadlines','Back to providers']) {
    assert.ok(c3d.includes(phrase), phrase);
  }
});

test('C3D preserves the agreed C2 failure and payout rules without silent editing', () => {
  assert.match(c3d, /failureOptions\(draft\.kind\)/);
  assert.match(c3d, /draft\.failureRule/);
  assert.match(c3d, /draft\.payoutRule/);
  assert.match(c3d, /No organizer can quietly change it here/);
  assert.match(c3d, /provider must reconcile the payment to its rightful source/);
});

test('C3D never promises automatic refunds, money custody or contractual consent', () => {
  for (const phrase of ['deadline by itself cannot refund anyone',
    'verified provider must support the full collection and resolution period',
    'All affected participants must accept material terms in the Agreement',
    'No provider selected, proposal submitted, Agreement changed',
    'return fails']) {
    assert.ok(c3d.toLowerCase().includes(phrase.toLowerCase()), phrase);
  }
});
