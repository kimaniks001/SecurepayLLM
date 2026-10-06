import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const runtime = await readFile('src/RuntimeApp.tsx', 'utf8');
const vision = await readFile('src/features/visionboard/VisionBoardExperience.tsx', 'utf8');
const progress = await readFile('src/features/execution/ProgressPanel.tsx', 'utf8');

test('poolable demand does not expose an ungated Community Saver command', () => {
  assert.doesNotMatch(runtime, /proposeFromNeed\(/);
  assert.doesNotMatch(vision, /proposeFromNeed\(/);
  assert.doesNotMatch(progress, /proposeFromNeed\(/);
  assert.match(vision, /does not join a Community Saver/);
  assert.match(progress, /does not amend the Agreement or join a Community Saver/);
});
