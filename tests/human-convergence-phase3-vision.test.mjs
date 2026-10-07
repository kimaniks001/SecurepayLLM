import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const dreamHome = await readFile('src/features/visionboard/dreams/VisionDreamHome.tsx', 'utf8');
const dreamExperience = await readFile('src/features/visionboard/dreams/VisionDreamExperience.tsx', 'utf8');
const board = await readFile('src/features/visionboard/VisionBoardExperience.tsx', 'utf8');
const boardController = await readFile('src/features/visionboard/controller.ts', 'utf8');
const dreamController = await readFile('src/features/visionboard/dreams/controller.ts', 'utf8');
const boardDto = await readFile('src/api/securepay/visionboard/dto.ts', 'utf8');

test('Vision home is Dream-first, private and lightweight', () => {
  assert.match(dreamHome, /Your private thinking space/);
  assert.match(dreamHome, /Think freely\. Keep what matters\./);
  assert.match(dreamHome, /Add a thought/);
  assert.match(dreamHome, /Search & organise/);
  assert.match(dreamHome, /view="vision-board"/);
  assert.match(dreamExperience, /What's on your mind\?/);
  assert.match(dreamExperience, /Private by default/);
  assert.match(dreamExperience, /Nothing here becomes a Project, Agreement, Store request or Money instruction/);
});

test('starting and failed Dream saves preserve the existing safe controller semantics', () => {
  assert.match(dreamController, /pending: \{ conversationId: null, thought: clean \}/);
  assert.match(dreamController, /Do not clear a token or create a second conversation after an uncertain POST outcome/);
  assert.match(dreamController, /retry: \(\) => savePending\(\)/);
  assert.match(dreamController, /reconcilePending/);
  assert.match(dreamExperience, /Retry saving this Dream/);
  assert.match(dreamExperience, /Check if it saved/);
});

test('Vision Library leads with search and one Add affordance', () => {
  const root = board.slice(board.lastIndexOf('return <div className="sp-life-canvas min-h-dvh">'));
  assert.match(root, /Vision Library · private/);
  assert.match(root, /Search ideas, plans, references…/);
  assert.match(root, /setShowLandingAdd/);
  assert.match(root, /<Plus className="h-4 w-4" \/> Add/);
  assert.match(root, /Thought or idea/);
  assert.match(root, /Plan/);
  assert.match(root, /Reference or link/);
  assert.match(root, /Quotation reference/);
  assert.match(root, /Vision search results/);
  assert.match(root, /controller\.search\(searchInput\.trim\(\)\)/);
});

test('the Library front door does not lead with Store or Agreement commitment actions', () => {
  const root = board.slice(board.lastIndexOf('return <div className="sp-life-canvas min-h-dvh">'));
  assert.doesNotMatch(root, /Start from your Vision/);
  assert.doesNotMatch(root, /onNavigate\('store'\)/);
  assert.doesNotMatch(root, /onNavigate\('agreements'\)/);
  assert.match(root, /Where this can go next/);
});

test('KS001, documents and fulfilment are contextual rather than dominant', () => {
  assert.match(board, /Ask KS001 about this idea/);
  assert.match(board, /Find real Store options for this need/);
  assert.match(board, /Prepare a quotation, invoice or receipt/);
  assert.match(board, /Ask KS001 to help organise this/);
  assert.match(board, /<details/);
  assert.match(board, /do not turn the idea into a commitment/i);
});

test('Vision remains private owner-scoped memory and not Agreement or Money authority', () => {
  assert.match(boardDto, /private KS operating memory/i);
  assert.match(boardDto, /never shared/);
  assert.match(boardDto, /grants no Agreement, Money/);
  assert.doesNotMatch(boardDto, /participantId|memberId|invitee/);
  assert.match(board, /Saved here means private Vision memory/);
  assert.match(board, /does not create a Project, Agreement, Store request or payment authority/);
});

test('Store discovery remains an explicit derivation with privacy and pooling choices', () => {
  assert.match(board, /Need type/);
  assert.match(board, /Private — only use for my search/);
  assert.match(board, /Matchable — eligible Stores may see safe demand/);
  assert.match(board, /Allow pooling when compatible/);
  assert.match(board, /gateway\.fromVision/);
  assert.match(board, /Find real options/);
  assert.doesNotMatch(board, /Automatically choose|Create Agreement now|Join saver now/);
});

test('locking, superseding and search remain backend-owned capabilities', () => {
  assert.match(boardController, /gateway\.lock/);
  assert.match(boardController, /gateway\.unlock/);
  assert.match(boardController, /gateway\.supersede/);
  assert.match(boardController, /gateway\.items\(ownerKsNumber \?\? undefined, shelf \?\? undefined, query\)/);
  assert.match(board, /Keep this version, start a new one/);
  assert.match(board, /Version \{selectedItem\.version\}/);
});

test('current Vision API does not pretend to support native attachments', () => {
  assert.match(boardDto, /VisionItemTypeCode/);
  assert.doesNotMatch(boardDto, /fileUrl|attachmentId|imageUrl|uploadToken/);
  assert.match(board, /Reference or link/);
});

test('mobile library layout is intentionally single-column first', () => {
  assert.match(board, /grid grid-cols-1 gap-3 sm:grid-cols-2/);
  assert.match(board, /min-h-11/);
  assert.match(dreamHome, /min-h-dvh/);
});
