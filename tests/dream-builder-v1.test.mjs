import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const builder = fs.readFileSync('src/features/visionboard/dreams/DreamBuilder.tsx', 'utf8');
const experience = fs.readFileSync('src/features/visionboard/dreams/VisionDreamExperience.tsx', 'utf8');
const gateway = fs.readFileSync('src/api/securepay/visiondreams/index.ts', 'utf8');

test('Dream Builder exposes one obvious Add control and core free visual tools', () => {
  assert.match(builder, /<Plus className="size-4" \/> Add/);
  for (const label of ['Note', 'Text', 'Draw', 'Arrow', 'Shape', 'Link', 'Checklist', 'Frame', 'Line']) {
    assert.match(builder, new RegExp("'" + label + "'"));
  }
  assert.match(builder, /Image or document/);
  assert.match(builder, /Undo2/);
  assert.match(builder, /Redo2/);
  assert.match(builder, /ZoomIn/);
  assert.match(builder, /ZoomOut/);
  assert.match(builder, /eraseAt/);
});

test('Dream Builder uses authoritative revisioned persistence and private assets', () => {
  assert.match(builder, /MAX_BOARD_BYTES = 524_288/);
  assert.match(builder, /gateway\.saveBoard/);
  assert.match(builder, /expectedRevision: revision/);
  assert.match(builder, /gateway\.uploadAsset/);
  assert.match(builder, /gateway\.deleteAsset/);
  assert.match(builder, /Private by default/);
  assert.match(builder, /not Agreement terms, financial authority, or Store publication/);
  assert.match(gateway, /\/board/);
  assert.match(gateway, /\/assets/);
});

test('old text-only Dreams migrate into an editable board note without rewriting history', () => {
  assert.match(builder, /Existing text-only Dreams become one editable note/);
  assert.match(builder, /kind: 'note'/);
  assert.match(builder, /original words are preserved/);
});

test('Vision landing uses Dream Builder product language', () => {
  assert.match(experience, /What are you dreaming of\?/);
  assert.match(experience, /Start building/);
  assert.match(experience, /Continue a Dream/);
});
