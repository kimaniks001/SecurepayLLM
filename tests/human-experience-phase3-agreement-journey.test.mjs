import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const bundleOf = async contents => {
  const result = await build({
    stdin: { contents, resolveDir: process.cwd() },
    bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic',
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  return mod.exports;
};

const reviewApi = await bundleOf(`
export { meansNoAgreementChange } from './src/features/formation/AgreementReview';
`);

test('Phase 3: natural approval language never enters correction mode', () => {
  for (const phrase of [
    'nothing',
    'nothing change',
    'nothing, everything is okay',
    'everything is okay',
    'everything is ok',
    'all good',
    'looks good',
  ]) {
    assert.equal(reviewApi.meansNoAgreementChange(phrase), true, phrase);
  }
  assert.equal(reviewApi.meansNoAgreementChange('make it KES 90,000 instead'), false);
  assert.equal(reviewApi.meansNoAgreementChange('actually start Wednesday'), false);
});

test('Phase 3: the Agreement itself appears while formation is still underway', async () => {
  const shaping = await readFile('src/features/formation/AgreementShaping.tsx', 'utf8');
  assert.match(shaping, /Your Agreement is taking shape/);
  assert.match(shaping, /data-phase3-agreement/);
  assert.match(shaping, /formation\.question/);
  assert.match(shaping, /<NextQuestion/);
  assert.match(shaping, /Nothing is agreed yet/);
  assert.doesNotMatch(shaping, /Here.?s what I understood/i);
});

test('Phase 3: one server-owned question remains the only formation question source', async () => {
  const shaping = await readFile('src/features/formation/AgreementShaping.tsx', 'utf8');
  const question = await readFile('src/features/formation/NextQuestion.tsx', 'utf8');
  assert.match(shaping, /formation\.question/);
  assert.match(question, /question\.text/);
  assert.match(question, /question\.choices/);
  assert.doesNotMatch(question, /question 1|question 2|question 3/i);
});

test('Phase 3: Review is a real printable Agreement and hides machinery by default', async () => {
  const review = await readFile('src/features/formation/AgreementReview.tsx', 'utf8');
  assert.match(review, /data-agreement-print/);
  assert.match(review, /Print Agreement/);
  assert.match(review, /SecurePay Agreement/);
  assert.match(review, /Not agreed yet/);
  assert.match(review, /Agreement details/);
  assert.match(review, /window\.print\(\)/);
  assert.match(review, /Keep this Agreement/);
  assert.match(review, /sign-in happens next and returns you to this same Agreement/);
});

test('Phase 3: creator invitation language keeps invitation separate from agreement', async () => {
  const invite = await readFile('src/features/invitations/InvitePanel.tsx', 'utf8');
  assert.match(invite, /Invite someone to agree/);
  assert.match(invite, /How should SecurePay send this Agreement/);
  assert.match(invite, /Creating it does not mean they have joined or agreed/);
  assert.match(invite, /Agreement invitation ready/);
  assert.match(invite, /Nothing has been sent automatically/);
});

test('Phase 3: counterpart enters through the Agreement, with identity delayed until needed', async () => {
  const review = await readFile('src/components/RecipientReview.tsx', 'utf8');
  const experience = await readFile('src/features/recipient/RecipientExperience.tsx', 'utf8');
  assert.match(review, /data-recipient-agreement-preview/);
  assert.match(review, /wants to agree this with you/);
  assert.match(review, /You have not joined or agreed to anything/);
  assert.match(experience, /state\.phase === 'invitation-ready'/);
  assert.match(experience, /state\.phase === 'identity-required'/);
  assert.match(experience, /Signing in only proves who you are/);
  assert.doesNotMatch(review, /Dashboard[A-Za-z]/, 'recipient review must not render a dashboard component');
});

test('Phase 3: proposed changes are suggestions, never silent Agreement mutation', async () => {
  const proposal = await readFile('src/features/amendments/AgreementChangeProposal.tsx', 'utf8');
  assert.match(proposal, /The current Agreement has not changed/);
  assert.match(proposal, /must agree before SecurePay can create a new version/);
  assert.match(proposal, /expectedAgreementVersionId/);
  assert.match(proposal, /idempotencyKey/);
  assert.match(proposal, /Check what happened/);
  assert.match(proposal, /Nothing was changed/);
});

test('Phase 3: agreed state and print remain human-facing while Money authority stays separate', async () => {
  const agreed = await readFile('src/components/AgreementEstablished.tsx', 'utf8');
  const print = await readFile('src/components/AgreementPrintRecord.tsx', 'utf8');
  assert.match(agreed, /Agreed|agreement/i);
  assert.doesNotMatch(agreed, /money.*ready|ready.*money/i);
  assert.match(print, /Agreement/i);
  assert.doesNotMatch(print, /JSON|stringify|digest|provider/i);
});

test('Phase 3: the Agreement journey remains inside the Phase 2 human shell', async () => {
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /<AgreementShaping/);
  assert.match(agent, /data-understood-details/);
  assert.doesNotMatch(agent, /data-understood-plane|setMobileTab/);
  assert.doesNotMatch(agent, /Refresh what SecurePay understands/);
});

test('Phase 3: print CSS keeps screen controls out of the printed Agreement', async () => {
  const css = await readFile('src/index.css', 'utf8');
  assert.match(css, /agreement-screen-only/);
  assert.match(css, /@media print/);
  assert.match(css, /data-agreement-print|sp-agreement-paper/);
});
