import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync('src/features/living-workspace/InlineCircleBoard.tsx', 'utf8');
const original = readFileSync('src/features/community/CircleBoard.tsx', 'utf8');
const share = readFileSync('src/features/living-workspace/VisionCircleShare.tsx', 'utf8');
const builder = readFileSync('src/features/visionboard/dreams/DreamBuilder.tsx', 'utf8');

test('the existing Circle Board remains the only board renderer', () => {
  assert.match(panel, /<CircleBoard circleId=\{id\} gateway=\{gateways\.community\}/);
  assert.match(panel, /gateways\.community\.circles\.membership\(id\)/);
  assert.match(panel, /member\.status!=='ACTIVE' && !member\.isOwner/);
  for (const lane of ['CHECKPOINTS','NEEDS','DECISIONS','OPPORTUNITIES','NOTES']) {
    assert.match(original, new RegExp(lane));
  }
});

test('planning kinds reuse authoritative Community object types; nothing is a formal approval', () => {
  for (const kind of ['DISCUSSION','QUESTION','NEED','OPPORTUNITY','WORK_STORY']) {
    assert.match(panel, new RegExp("value:'" + kind + "'"));
  }
  assert.match(panel, /objects\.create\(id,draft\.kind,title,body,null,intent\)/);
  assert.match(panel, /saved\.circleId!==id \|\| saved\.objectType!==draft\.kind/);
  assert.match(panel, /not an approved group decision/);
  assert.match(panel, /setIntent\(freshKey\(\)\)/);
});

test('Vision creative tools and three exploration modes do not invent price or payment authority', () => {
  for (const text of ['Capture an idea','Explore options','Plan in detail']) assert.ok(builder.includes(text));
  assert.match(builder, /does not start paid intelligence or alter your saved Dream/);
  assert.match(builder, /onShareSelected &&/);
  assert.match(builder, /currentDirty \|\| !serverRevisionKnown\.current/);
});

test('share flow is a separate affirmative choice, not automatic when a note is selected', () => {
  assert.match(share, /checked=\{confirmed\}/);
  assert.match(share, /!confirmed \|\| !target/);
  assert.match(share, /publishSelectedVisionNote/);
  assert.match(share, /Your private board, photos, documents, other notes and Dream title stay private/);
});
