import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const builder = fs.readFileSync('src/features/visionboard/dreams/DreamBuilder.tsx', 'utf8');
const experience = fs.readFileSync('src/features/visionboard/dreams/VisionDreamExperience.tsx', 'utf8');

test('Dream Builder exposes one obvious Add control and core free visual tools', () => {
  assert.match(builder, /> Add</);
  for (const label of ['Note', 'Text', 'Draw', 'Arrow', 'Shape', 'Checklist', 'Frame', 'Line']) {
    assert.match(builder, new RegExp("'" + label + "'"));
  }
  assert.match(builder, /Undo2/);
  assert.match(builder, /Redo2/);
  assert.match(builder, /ZoomIn/);
  assert.match(builder, /ZoomOut/);
});

test('Dream Builder is honest about current persistence and asset boundary', () => {
  assert.match(builder, /MAX_PERSISTED_CONTENT = 4000/);
  assert.match(builder, /persistent Vision asset storage/);
  assert.match(builder, /Private by default/);
  assert.match(builder, /not Agreement terms, financial authority, or Store publication/);
});

test('old text-only Dreams migrate into an editable board note without rewriting the backend first', () => {
  assert.match(builder, /Old text-only Dreams migrate honestly into one editable text note/);
  assert.match(builder, /kind: 'note'/);
});

test('Vision landing uses Dream Builder product language', () => {
  assert.match(experience, /What are you dreaming of\?/);
  assert.match(experience, /Start building/);
  assert.match(experience, /Continue a Dream/);
});
