import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Regression guard: a successful first page is not a complete ledger history.
// A pending intent may be on page 2+, so payment commands must fail closed.
const source=readFileSync('src/mini/MiniMoneySnapshot.tsx','utf8');

test('Money submission cannot unlock from a partial payment-intent page',()=>{
  assert.match(source,/payments\.listIntents\(agreementId,0,10\)/);
  assert.match(source,/miniMoneyIntentListProof\(historyReply\.value\)&&\s*historyReply\.value\.totalElements===historyReply\.value\.items\.length/);
  assert.match(source,/else\{setHistory\(\[\]\);setHistoryState\('error'\);\}/);
  assert.match(source,/paymentCommandsEnabled&&quote&&quote\.economicState==='READY'&&\s*historyState==='ready'/);
});
