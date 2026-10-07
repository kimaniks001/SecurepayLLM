import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

test('conversation promotes the backend formation into one living Agreement surface', async () => {
  const shaping = await readFile('src/features/formation/AgreementShaping.tsx', 'utf8');
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');

  assert.match(shaping, /Your agreement is forming/);
  assert.match(shaping, /Nothing is agreed yet/);
  assert.match(shaping, /Still taking shape/);
  assert.match(shaping, /formation\.stage !== 'NOTHING_YET'/);
  assert.match(shaping, /formation\.summary/);
  assert.match(shaping, /formation\.who/);
  assert.match(shaping, /formation\.money/);
  assert.match(shaping, /formation\.when/);
  assert.match(shaping, /formation\.responsibilities/);
  assert.match(shaping, /changes\.join/);
  assert.match(agent, /changes=\{formationState\.changes\}/);
  assert.match(shaping, /nextStep\(formation\)/);
});

test('Review is a readable printable draft but never pretends the Agreement is already agreed', async () => {
  const review = await readFile('src/features/formation/AgreementReview.tsx', 'utf8');

  assert.match(review, /data-agreement-print/);
  assert.match(review, /Print draft/);
  assert.match(review, /Draft for review · not agreed/);
  assert.match(review, /Printing it does not set up the Agreement, confirm a participant, or move money/);
  assert.match(review, /Set this up securely/);
  assert.match(review, /Nothing is agreed until you set it up/);
  assert.match(review, /formation\.openPoints/);
  assert.match(review, /formation\.responsibilities/);
  assert.match(review, /formation\.notIncluded/);
});

test('current Agreement detail prints from backend Agreement record rather than reconstructed chat text', async () => {
  const printRecord = await readFile('src/components/AgreementPrintRecord.tsx', 'utf8');
  const detail = await readFile('src/components/AgreementDetail.tsx', 'utf8');
  const workspace = await readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8');

  assert.match(printRecord, /AgreementDetailResponse/);
  assert.match(printRecord, /detail\.overview\.publicReference/);
  assert.match(printRecord, /detail\.currentVersion/);
  assert.match(printRecord, /detail\.participants/);
  assert.match(printRecord, /detail\.terms/);
  assert.match(printRecord, /detail\.milestones/);
  assert.match(printRecord, /does not create or change a confirmation/);
  assert.match(detail, /Print agreement/);
  assert.match(detail, /<AgreementPrintRecord detail=\{printRecord\}/);
  assert.match(workspace, /printRecord=\{dto\}/);
});

test('A4 print treatment isolates the Agreement and removes interaction controls', async () => {
  const css = await readFile('src/index.css', 'utf8');

  assert.match(css, /@media print/);
  assert.match(css, /size: A4/);
  assert.match(css, /\[data-agreement-print\]/);
  assert.match(css, /\.agreement-screen-only/);
  assert.match(css, /visibility: hidden !important/);
  assert.match(css, /break-inside: avoid/);
});
