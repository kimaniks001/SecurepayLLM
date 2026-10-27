import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../'+file, import.meta.url), 'utf8');
const chat = read('src/features/living-workspace/LiveKs001Session.tsx');
const intake = read('src/features/living-workspace/UniversalSourceTray.tsx');

test('True North: the next meaningful question remains in the latest KS001 reply', () => {
  assert.match(chat, /function Ks001Reply\(\{ text, nextQuestion \}/);
  assert.match(chat, /nextQuestion=\{turn\.id===lastTurn&&!state\.busy&&!state\.pending\?nextQuestion:null\}/);
  assert.match(chat, /className="mt-2 block font-semibold text-forest-900"/);
  assert.doesNotMatch(chat, /Next to clarify/);
  assert.match(chat, /const currentQuestion=question\?\.question \?\? nextQuestion \?\? ''/);
});

test('True North: the previously sent user text remains unchanged and old replies do not inherit a new question', () => {
  assert.match(chat, /turn\.sender==='user'\?turn\.text:/);
  assert.match(chat, /turn\.id===lastTurn/);
  assert.match(chat, /return <><span>\{text\.trimEnd\(\)\}<\/span>/);
});

test('True North: document failures and retries are not described as photographs', () => {
  assert.match(intake, /Retry reading this \{tool==='Photos'\?'photo':'document'\}/);
  assert.match(intake, /tool==='Photos'\?'Photo':'Document'/);
  assert.match(intake, /source\.extractionStatus==='FAILED'/);
  assert.match(intake, /The source is not understood/);
  assert.match(intake, /sourceArtifactId/);
  assert.match(intake, /Only after you press Send will SecurePay receive this file/);
});
