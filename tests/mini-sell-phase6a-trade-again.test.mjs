import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {miniSellerRecentTradeReferences,miniSellerReadTradeAgainTitle} from '../src/mini/miniSellerTradeAgain.mjs';
const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const summary=(id,status='COMPLETED')=>({
  agreementId:id,title:'Repair of water tank',status,currentAgreementVersionId:'version-'+id,
  counterparty:{displayName:'Previous client',ksNumber:'KS123'}
});
const detail=(id,status='COMPLETED')=>({
  overview:{agreementId:id,status,title:'Repair of water tank'},currentVersion:{versionId:'version-'+id}
});
test('repeat trading only offers bounded, unique completed personal Agreement references',()=>{
  const rows=[summary('a'),summary('a'),summary('b','ACTIVE'),summary('c'),...Array.from({length:20},(_,i)=>summary('x'+i))];
  assert.deepEqual(miniSellerRecentTradeReferences({items:rows}).map(x=>x.agreementId),
    ['a','c','x0','x1','x2','x3']);
  assert.deepEqual(miniSellerRecentTradeReferences({items:null}),[]);
});
test('fresh canonical version must match, no changed or ongoing Agreement is reused',()=>{
  assert.equal(miniSellerReadTradeAgainTitle(summary('a'),detail('a')),'Repair of water tank');
  assert.equal(miniSellerReadTradeAgainTitle(summary('a'),detail('b')),null);
  assert.equal(miniSellerReadTradeAgainTitle(summary('a'),detail('a','ACTIVE')),null);
  assert.equal(miniSellerReadTradeAgainTitle(summary('a','ACTIVE'),detail('a')),null);
  assert.equal(miniSellerReadTradeAgainTitle(summary('a'),{...detail('a'),currentVersion:{versionId:'stale'}}),null);
});
test('Trade again is deliberately a fresh seller offer, not copied commercial consent',()=>{
  const component=read('src/mini/MiniSellerTradeAgain.tsx');
  const parent=read('src/mini/MiniSellSomething.tsx');
  assert.ok(component.includes('gateway.currentUserAgreements(0,20)'));
  assert.ok(component.includes('gateway.detail(reference.agreementId)'));
  assert.ok(component.includes('onStart(title)'));
  assert.ok(parent.includes('startFreshFromPreviousTrade'));
  assert.ok(parent.includes('setRightToOffer(false)'));
  assert.ok(parent.includes('setStockStatement(\'\')'));
  assert.ok(parent.includes('setPrice(\'\')'));
  assert.ok(parent.includes('setPictures([])'));
  assert.ok(parent.includes('setPeople([])'));
  assert.ok(parent.includes('setTiming(\'\')'));
  assert.ok(parent.includes('<MiniSellerTradeAgain'));
  for(const forbidden of ['createAgreement(', 'connectToMoney(', 'issueInvitation(', 'selectPlan(', 'initiatePayment('])
    assert.equal(component.includes(forbidden),false);
});
