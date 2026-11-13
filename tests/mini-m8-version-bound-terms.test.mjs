import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {miniMeasuredTermsPacket} from '../src/mini/miniMeasuredTermsPacket.mjs';
const base={
  agreementId:'agreement-123',agreementVersionId:'version-456',
  agreementVersionHash:'a'.repeat(64),
  state:'PROPOSAL_ONLY',tariffAgreed:false,usageVerified:false,
  supplierApproved:false,executable:false,paymentEnabled:false,
  rateBasis:'PER_HOUR',currency:'KES',measurementMethod:'WORK_LOG',
  proposedRateMinorPerUnit:500000,proposedFixedMinor:0,
  reportedHundredths:400,proposedMaxHundredths:600,
  variableChargeMinor:2000000,proposedTotalMinor:2000000,
  proposedMaximumMinor:3000000,
};
test('tractor terms are version-bound, explicitly unapproved and nonpayable',()=>{
  const t=miniMeasuredTermsPacket(base);
  assert.match(t,/Based on version: version-456/);
  assert.match(t,/Version content hash: a{64}/);
  assert.match(t,/KES 5000\.00 per hour/);
  assert.match(t,/Estimated charge \(not due\): KES 20000\.00/);
  assert.match(t,/NO approved tariff\. NO verified usage\. NO payment instruction/);
});
test('transport with fixed fee is a proposed estimate, not a payout',()=>{
  const t=miniMeasuredTermsPacket({...base,rateBasis:'PER_KM_PLUS_FIXED',
    measurementMethod:'ODOMETER',proposedRateMinorPerUnit:5000,
    proposedFixedMinor:40000,reportedHundredths:5000,
    proposedMaxHundredths:10000,variableChargeMinor:250000,
    proposedTotalMinor:290000,proposedMaximumMinor:540000});
  assert.match(t,/KES 50\.00 per km/);
  assert.match(t,/Proposed fixed trip charge: KES 400\.00/);
  assert.match(t,/Estimated charge \(not due\): KES 2900\.00/);
  assert.match(t,/Estimated maximum \(not due\): KES 5400\.00/);
});
test('no terms packet for a payable, verified or unbound result',()=>{
  for(const changed of [{paymentEnabled:true},{executable:true},{tariffAgreed:true},
    {usageVerified:true},{supplierApproved:true},{state:'READY'},
    {agreementVersionHash:'no-hash'},{proposedTotalMinor:-1}])
    assert.equal(miniMeasuredTermsPacket({...base,...changed}),null);
});
test('Mini packet is a copied proposal only, no new Agreement or Money command',()=>{
  const ui=readFileSync('src/mini/MiniMeasuredServicePreview.tsx','utf8');
  assert.match(ui,/miniMeasuredTermsPacket\(result\)/);
  assert.match(ui,/Not recorded or agreed/);
  assert.match(ui,/navigator\.clipboard\.writeText\(packet\)/);
  assert.doesNotMatch(ui,/\.proposeAmendment\(|\.confirmVersion\(|\.initiate\(|\.release\(/);
});
