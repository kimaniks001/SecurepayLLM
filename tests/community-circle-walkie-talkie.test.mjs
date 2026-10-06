import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const board = fs.readFileSync(new URL('../src/features/community/CircleBoard.tsx', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/community/index.ts', import.meta.url), 'utf8');

test('Circle walkie-talkie uses canonical coordination prompt endpoints', () => {
  assert.match(gateway, /coordination-prompts\/mine/);
  assert.match(gateway, /coordination-prompts\/\$\{segment\(promptId\)\}\/responses/);
  assert.match(board, /Needs a quick response/);
  assert.match(board, /gateway\.coordination\.create/);
  assert.match(board, /gateway\.coordination\.respond/);
});

test('quick-response choices are typed coordination only', () => {
  for (const label of ['Okay','On my way','Hold','Need details']) assert.ok(board.includes(label));
  assert.match(board, /never an Agreement milestone or Money/);
  assert.doesNotMatch(board, /agreementGateway|moneyGateway|releasePayment|acceptMilestone/);
});

test('external delivery channels converge on the same canonical response contract', () => {
  assert.match(gateway, /'IN_APP' \| 'WHATSAPP' \| 'SMS' \| 'EMAIL'/);
  assert.match(gateway, /body: \{ responseCode, channel \}/);
});
