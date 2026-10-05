import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const experience = fs.readFileSync(new URL('../src/features/visionboard/VisionBoardExperience.tsx', import.meta.url), 'utf8');
const controller = fs.readFileSync(new URL('../src/features/visionboard/controller.ts', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/visionboard/index.ts', import.meta.url), 'utf8');

test('ordinary Vision Board actions do not call the shadow economics API', () => {
  const combined = experience + controller + gateway;
  assert.doesNotMatch(combined, /vision-usage-economics/);
  assert.doesNotMatch(combined, /Usage Units?/);
  assert.doesNotMatch(combined, /units remaining/i);
  assert.doesNotMatch(combined, /top.?up/i);
  assert.doesNotMatch(combined, /insufficient.?credit/i);
});

test('manual board actions remain ordinary Vision Board CRUD, not AI calls', () => {
  assert.match(controller, /gateway\.create\(/);
  assert.match(controller, /gateway\.update\(/);
  assert.match(controller, /gateway\.lock\(/);
  assert.match(controller, /gateway\.unlock\(/);
  assert.match(controller, /gateway\.supersede\(/);
  assert.doesNotMatch(controller, /agent.*turn|model|provider|openai|anthropic/i);
});

test('member-facing Vision Board gateway exposes no billing or deduction route', () => {
  assert.match(gateway, /\/api\/v1\/vision-board\/items/);
  assert.doesNotMatch(gateway, /\/api\/v1\/internal\/vision-usage-economics/);
  assert.doesNotMatch(gateway, /deduct|billing|invoice.*usage|usage.*balance/i);
});

test('shadow metering adds no member cost warning or allowance counter', () => {
  assert.doesNotMatch(experience, /cost banner|allowance|Usage Point|Usage Unit|credit balance/i);
});
