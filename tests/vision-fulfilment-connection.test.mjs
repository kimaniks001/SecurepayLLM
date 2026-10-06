import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/features/visionboard/VisionBoardExperience.tsx', 'utf8');

test('Vision derives fulfilment only after explicit type privacy and pooling choices', () => {
  assert.match(source, /Need type/);
  assert.match(source, /Private — only use for my search/);
  assert.match(source, /Matchable — eligible Stores may see safe demand/);
  assert.match(source, /Allow pooling when compatible/);
  assert.match(source, /does not join a Community Saver or another person’s agreement/);
  assert.match(source, /gateway\.fromVision/);
});

test('Vision shows backend supply routes without fabricating landed cost', () => {
  assert.match(source, /gateway\.routes\(created\.id\)/);
  assert.match(source, /Landed cost not established/);
  assert.match(source, /Open Store offer/);
  assert.doesNotMatch(source, /Automatically choose|Join saver now|Create Agreement now/);
});
