import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const institute = fs.readFileSync(new URL('../src/features/institute/InstituteExperience.tsx', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/institute/index.ts', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../src/components/NavBar.tsx', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
const agent = fs.readFileSync(new URL('../src/features/agent/AgentExperience.tsx', import.meta.url), 'utf8');

test('Institute is a first-class SecurePay destination rather than a training settings panel', () => {
  assert.match(nav, /label: 'Institute'/);
  assert.match(nav, /view: 'institute'/);
  assert.match(runtime, /instituteGateway/);
  assert.match(agent, /<InstituteExperience/);
});

test('Institute starts from the learner question and keeps source evidence visible', () => {
  assert.match(institute, /What do you want to learn, understand or become capable of\?/);
  assert.match(institute, /Build my learning path/);
  assert.match(institute, /Sources touching this question/);
  assert.match(institute, /The original sources remain underneath it/);
  assert.match(institute, /Not a fixed course catalogue/);
});

test('source classes remain distinguishable instead of becoming one AI truth', () => {
  assert.match(institute, /Governed knowledge/);
  assert.match(institute, /Community experience/);
  assert.match(institute, /Reported Project observation/);
  assert.match(institute, /Project-verified observation/);
  assert.match(institute, /Disputed Project observation/);
});

test('UI gateway uses public browse separately from authenticated AI learning', () => {
  assert.match(gateway, /\/api\/v1\/institute\/public\/search/);
  assert.match(gateway, /\/api\/v1\/institute\/learn/);
  assert.match(gateway, /auth: 'required'/);
});
