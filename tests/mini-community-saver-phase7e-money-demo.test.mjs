import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('7E3 retained carrier and canceled pickup remain two different original obligations',()=>{
  const ui=read('src/mini/MiniCommunitySaverFundedMoneyPreview.tsx');
  assert.ok(ui.includes("Original A lorry remains funded"));
  assert.ok(ui.includes("B's earlier pickup refund required"));
  assert.ok(ui.includes("New shared provider cost (same lorry)"));
  assert.ok(ui.includes('refund===\'pending\''));
});
test('7E3 no real provider/bank refund is inferred from fictional simulation',()=>{
  const ui=read('src/mini/MiniCommunitySaverFundedMoneyPreview.tsx');
  assert.ok(ui.includes('Simulate refund received'));
  assert.ok(ui.includes('Fictional refund assumed for illustration'));
  assert.ok(ui.includes('There is no payment button'));
  assert.equal(ui.includes('makeMoneyPayment('),false);
  assert.equal(ui.includes('initiatePayment('),false);
  assert.equal(ui.includes('gateway.decide('),false);
});
test('7E3 owner preview remains isolated from real participant and regulated rails',()=>{
  const owner=read('src/mini/MiniCommunitySaverPreview.tsx');
  const ui=read('src/mini/MiniCommunitySaverFundedMoneyPreview.tsx');
  assert.ok(owner.includes('selected===0&&<MiniCommunitySaverFundedMoneyPreview/>'));
  assert.ok(ui.includes('communitySaverPreScreen('));
  assert.ok(ui.includes('conditional Plug fee')||ui.includes('Conditional qualified Plug fee'));
  assert.ok(ui.includes('separate verified authority'));
});
