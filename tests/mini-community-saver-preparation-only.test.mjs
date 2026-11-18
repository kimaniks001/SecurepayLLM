import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('non-Money preparation is explicit, private and GET-only',()=>{
  const gate=read('src/api/securepay/community-saver-preparation/index.ts');
  assert.ok(gate.includes("auth:'required'"));
  assert.ok(gate.includes('PREPARATION_ONLY_MONEY_DEFERRED'));
  assert.ok(gate.includes("moneyDeferred:true"));
  assert.ok(gate.includes("anyMoneyAuthorized:false"));
  assert.ok(gate.includes("realizedSavingVerified:false"));
  assert.equal(gate.includes("method:'POST'"),false);
  assert.equal(gate.includes('createProposal('),false);
  assert.equal(gate.includes('initiatePayment('),false);
});
test('Mini only enables non-Money review on isolated real-account staging',()=>{
  const app=read('src/mini/MiniFirstPartyKs001.tsx');
  assert.ok(app.includes("const liveCommunitySaverPreparation=!demo &&"));
  assert.ok(app.includes("import.meta.env.VITE_SECUREPAY_MINI_PHASE7_PREPARE_ONLY==='enabled'"));
  assert.ok(app.includes('communitySaverPreparation={liveCommunitySaverPreparation}'));
  assert.ok(app.includes('communitySaverPreparationGateway={liveCommunitySaverPreparation?'));
});
test('Own priced item remains the only preparation entry point',()=>{
  const agreements=read('src/mini/MiniMyAgreements.tsx');
  assert.ok(agreements.includes("t.obligationType==='MONETARY'"));
  assert.ok(agreements.includes("t.currency==='KES'"));
  assert.ok(agreements.includes("details.currentVersion.id"));
  assert.ok(agreements.includes('<MiniCommunitySaverPreparation'));
});
test('No savings claimed without provider and opted-in compatible match',()=>{
  const ui=read('src/mini/MiniCommunitySaverPreparation.tsx');
  assert.ok(ui.includes('HYPOTHETICAL_SAVING_FOR_REVIEW'));
  assert.ok(ui.includes('result.providerSourceVerified'));
  assert.ok(ui.includes('otherTraderDetailsReleased!==false'));
  assert.ok(ui.includes('realPlugInvitationSent!==false'));
  assert.ok(ui.includes('anyMoneyAuthorized!==false'));
  assert.ok(ui.includes('No realized saving, other trader details, Plug assignment, Agreement change or payment was created.'));
  assert.equal(ui.includes('connectToMoney('),false);
  assert.equal(ui.includes('gateway.decide('),false);
});
