import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const pay=read('src/mini/MiniPaySomeone.tsx');
const experience=read('src/mini/MiniExperience.tsx');
const firstParty=read('src/mini/MiniFirstPartyKs001.tsx');

test('Mini opens a dedicated Pay Someone or Something screen and keeps Buy and Sell intact',()=>{
  assert.ok(experience.includes("import { MiniPaySomeone }"));
  assert.ok(experience.includes("screen==='pay-home' && <MiniPaySomeone"));
  assert.ok(experience.includes("setScreen('pay-home')"));
  assert.ok(experience.includes('canOpenExisting={!!getMiniFirstPartyOrigin()}'));
  assert.ok(experience.includes("<MiniBuyStore"));
  assert.ok(experience.includes("<MiniSellSomething"));
});

test('real existing payment obligations are read using signed-in canonical agreement gateway',()=>{
  assert.ok(firstParty.includes('startInPayments'));
  assert.ok(firstParty.includes('openAgreements();'));
  assert.ok(firstParty.includes('setIdentityGoal(\'agreements\');setIdentityOpen(true)'));
  assert.ok(firstParty.includes('<MiniMyAgreements gateway={agreements}'));
  assert.ok(pay.includes('Only verified server records are shown'));
  assert.ok(pay.includes('disabled={!canOpenExisting}'));
});

test('new payment requires recipient KS identity, positive amount and stated purpose',()=>{
  assert.ok(pay.includes('validKs(ks)'));
  assert.ok(pay.includes('validAmount(amount)'));
  assert.ok(pay.includes('!purpose.trim()'));
  assert.ok(pay.includes("intent:'pay'"));
  assert.ok(pay.includes('counterparty:ks.trim().toUpperCase()'));
  assert.ok(pay.includes('Recipient must accept'));
  assert.ok(pay.includes('Not yet verified'));
});

test('group review preserves each individually accepted example; no automatic transfer occurs',()=>{
  assert.ok(pay.includes('i.status!==\'needs-check\''));
  assert.ok(pay.includes("setScreen('checkout')"));
  assert.ok(pay.includes('Each person keeps their own accepted agreement'));
  assert.ok(pay.includes('one person'));
  assert.ok(pay.includes('no money moved'));
  for(const forbidden of ['initiatePayment(', 'createPaymentIntent(', 'settlePayment(', 'window.location.href='])
    assert.equal(pay.includes(forbidden),false);
});

test('sample list and provider choices are preview-only and not live payment authority',()=>{
  assert.ok(pay.includes('preview&&<'));
  assert.ok(pay.includes("screen==='checkout'&&preview"));
  assert.ok(pay.includes('No requests or money are sent'));
  assert.ok(pay.includes('Nothing is invested or borrowed here'));
  assert.ok(experience.includes("isMiniExperiencePreviewHost(window.location.hostname)"));
  assert.ok(experience.includes("urlParams?.get('miniTradeDemo') === '1'"));
});
