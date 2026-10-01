import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/visionboard/index.ts', import.meta.url), 'utf8');
const dto = fs.readFileSync(new URL('../src/api/securepay/visionboard/dto.ts', import.meta.url), 'utf8');

test('Community Saver is a Vision-level explicit consent setting', () => {
  assert.match(gateway, /communitySaver/);
  assert.match(gateway, /setCommunitySaver/);
  assert.match(gateway, /body: \{ enabled \}/);
  assert.match(dto, /enabled: boolean/);
  assert.doesNotMatch(gateway, /autoApprove|autoPool|publishVision/);
});
