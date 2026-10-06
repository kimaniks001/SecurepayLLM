import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const board = fs.readFileSync(new URL('../src/features/community/CircleBoard.tsx', import.meta.url), 'utf8');
const community = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');

test('Circle Board is a first-class Circle view backed by real Circle objects', () => {
  assert.match(community, /Circle Board/);
  assert.match(community, /<CircleBoard/);
  assert.match(community, /objects=\{objects\}/);
  assert.match(board, /CommunityObjectResponse/);
  assert.doesNotMatch(board, /localStorage|sessionStorage/);
});

test('Circle Board keeps coordination separate from Agreement authority', () => {
  assert.match(board, /do not accept an Agreement milestone, bind a member, or move money/);
  assert.doesNotMatch(board, /agreementGateway|moneyGateway|payment|release/);
});

test('Circle Board gives real work a small shared planning vocabulary', () => {
  for (const label of ['Checkpoints', 'Needs', 'Questions & decisions', 'Options', 'Notes']) {
    assert.ok(board.includes(label), `missing board lane: ${label}`);
  }
  assert.match(board, /WORK_STORY/);
  assert.match(board, /NEED/);
  assert.match(board, /QUESTION/);
  assert.match(board, /OPPORTUNITY/);
  assert.match(board, /DISCUSSION/);
});

test('Circle keeps conversation and board as two views of the same persisted items', () => {
  assert.match(community, /'conversation' \| 'board'/);
  assert.match(community, /Circle conversation/);
  assert.match(community, /onOpenObject=\{onOpenObject\}/);
});
