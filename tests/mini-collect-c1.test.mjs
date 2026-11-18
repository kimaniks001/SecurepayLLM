import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const runtime = source('src/RuntimeApp.tsx');
const c1 = source('src/features/mini-collect/C1CollectExperience.tsx');

test('C1 opens only an explicit Mini Collect preview on preview or local hosts', () => {
  assert.match(runtime, /isMiniCollectC1PreviewRoute\(hash: string, hostname: string\)/);
  assert.match(runtime, /hostname\.endsWith\('\.vercel\.app'\)/);
  assert.match(runtime, /hostname === 'localhost'/);
  assert.match(runtime, /if \(miniCollectC1Preview\) return <C1CollectExperience \/>/);
  assert.match(runtime, /if \(phase1Preview\) return <Phase1LivingWorkspacePreview/);
  assert.ok(runtime.indexOf('if (miniCollectC1Preview)') < runtime.indexOf('if (phase1Preview)'));
  assert.doesNotMatch(runtime, /hash === '' &&.*miniCollect/i);
});

test('C1 offers six human purposes with no finance-first form', () => {
  for (const id of ["'buy'","'paid'","'regular'","'group'","'give'","'goal'"]) {
    assert.ok(c1.includes('id: ' + id), id);
  }
  for (const text of [
    'Buy something together',
    'Get paid for something',
    'Collect regularly',
    'Our group or merry-go-round',
    'Giving or fundraising',
    'Save towards a goal',
    'What are you collecting money for?',
  ]) assert.ok(c1.includes(text), text);
  assert.match(c1, /grid-cols-1 gap-3 sm:grid-cols-2/);
});

test('C1 asks only one contextual question via answer pills', () => {
  assert.match(c1, /selected\.options\.map\(option/);
  assert.match(c1, /aria-pressed=\{picked\}/);
  assert.match(c1, /disabled=\{!answer\}/);
  assert.match(c1, /role="group" aria-label=\{selected\.question\}/);
  assert.match(c1, /stage === 'review' && selected && selectedAnswer/);
  assert.doesNotMatch(c1, /<input|<textarea/);
});

test('C1 surfaces the opportunity and governance without manufacturing authority', () => {
  for (const text of [
    'Here\'s what becomes possible',
    'Before any money is collected',
    'A full collection does not authorize payment.',
    'A donation is not automatically refundable.',
    'Only an eligible regulated provider may hold or disburse funds.',
    'Never invest contributions without valid consent.',
    'Nothing is saved, agreed, sent, invested or paid.',
    'C1 never assumes they exist.',
  ]) assert.ok(c1.includes(text), text);
  assert.doesNotMatch(c1, /fetch\(|\.createCollection\(|\.initiatePayment\(|\.disburse\(/);
  assert.doesNotMatch(c1, /localStorage|sessionStorage|Math\.random/);
});
