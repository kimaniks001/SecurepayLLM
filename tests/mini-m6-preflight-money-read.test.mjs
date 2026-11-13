import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const panel=readFileSync('src/mini/MiniMoneySnapshot.tsx','utf8');
const flow=readFileSync('src/mini/MiniMoneyPaymentFlow.tsx','utf8');

test('financial commands re-read canonical Agreement Money before both POST steps',()=>{
  assert.match(panel,/verifyMoney=\{async\(\)=>\{/);
  assert.match(panel,/const current=await money\.read\(agreementId\)/);
  assert.match(panel,/miniMoneySnapshotProof\(current,agreementId,versionId\)/);
  assert.match(panel,/current\.feeQuoteRequestsPermitted/);
  assert.match(panel,/option\.railCode===quote\.railCode/);
  assert.match(panel,/option\.currency===quote\.currency&&option\.quoteAvailable/);
  assert.match(panel,/catch \{ return false; \}/);
  assert.equal((flow.match(/if\(!\(await verifyMoney\(\)\)\)/g)||[]).length,2);
  assert.match(flow,/if\(!\(await verifyMoney\(\)\)\)[\s\S]*?payments\.fundingAuthority\(agreementId\)/);
  assert.match(flow,/if\(!\(await verifyMoney\(\)\)\)[\s\S]*?payments\.get\(intent\.paymentIntentId\)/);
  assert.doesNotMatch(panel,/\.release\(/);
});
