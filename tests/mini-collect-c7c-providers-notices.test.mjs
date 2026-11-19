import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  C7_PROTECTIONS, describeC7Readiness, canC7ReadinessTriggerMoney,
} from '../src/features/mini-collect/c7ProviderReadiness.mjs';

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('C7C: absent bank evidence never enables collection, refunds or delivery',()=>{
  const r=describeC7Readiness();
  assert.equal(r.providerVerified,false);
  assert.equal(r.canCollect,false);
  assert.equal(r.canRefund,false);
  assert.equal(r.notificationsDelivered,false);
  assert.equal(canC7ReadinessTriggerMoney(),false);
  assert.ok(r.waiting.length>0);
});
test('C7C: provider certification alone cannot authorize a contributor debit',()=>{
  const r=describeC7Readiness({
    providerMandateCertified:true,payerAuthorityCertified:false,
    collectionCanExecute:false,refundCanExecute:false,
    contributionCallbacksCertified:false,notificationsCanClaimDelivery:false,
    pending:['Original signed payer consent is pending'],
  });
  assert.equal(r.providerVerified,true);
  assert.equal(r.canCollect,false);
  assert.equal(r.canRefund,false);
  assert.equal(r.notificationsDelivered,false);
  assert.equal(r.waiting[0],'Original signed payer consent is pending');
});
test('C7C: client claims of paid/refunded do not unlock Money controls',()=>{
  const r=describeC7Readiness({
    providerMandateCertified:true,payerAuthorityCertified:true,
    collectionCanExecute:true,refundCanExecute:true,
    contributionCallbacksCertified:true,notificationsCanClaimDelivery:true,
    pending:[],
  });
  assert.equal(r.canCollect,false);
  assert.equal(r.canRefund,false);
  assert.equal(r.notificationsDelivered,false);
});
test('C7E: concise humane protections preserve original source, returns and inbox',()=>{
  assert.deepEqual(C7_PROTECTIONS.map(x=>x.id),
    ['institution','agreement','payment','return','inbox']);
  assert.ok(C7_PROTECTIONS.every(x=>x.title && x.reason.length>40));
  const view=source('src/features/mini-collect/C7MyMoneyLifecycle.tsx');
  const prev=source('src/features/mini-collect/C4MyContributionStatus.tsx');
  assert.match(view,/C7_PROTECTIONS.slice\(0,allProtections\?undefined:2\)/);
  assert.match(view,/See all protections/);
  assert.match(view,/private SecurePay inbox/);
  assert.match(prev,/providerReadiness=\{providerReadiness\}/);
  assert.doesNotMatch(view,/sendPayment\(|connectToMoney\(|markAsPaid\(|executeRefund\(/);
});
