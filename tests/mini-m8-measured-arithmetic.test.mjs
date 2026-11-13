import test from 'node:test';
import assert from 'node:assert/strict';
import {miniMeasuredArithmeticProof} from '../src/mini/miniMeasuredProof.mjs';
import {readFileSync} from 'node:fs';

const examples=[
  ['tractor 4 hours KES 20k', 'PER_HOUR',500000,0,400,600,'WORK_LOG',2000000,3000000],
  ['tractor 4.5 hours', 'PER_HOUR',500000,0,450,600,'WORK_LOG',2250000,3000000],
  ['tractor 0.01 hour', 'PER_HOUR',500000,0,1,600,'MUTUAL_MANUAL',5000,3000000],
  ['distance 50 km', 'PER_KM',5000,0,5000,10000,'ODOMETER',250000,500000],
  ['ride 400 fixed plus 50/km x 50', 'PER_KM_PLUS_FIXED',5000,40000,5000,10000,'ODOMETER',290000,540000],
  ['one tenth km', 'PER_KM_PLUS_FIXED',5000,40000,10,200,'GPS_ROUTE',40500,50000],
  ['short route', 'PER_KM',1,0,50,100,'GPS_ROUTE',1,1],
  ['half up to one minor unit', 'PER_HOUR',1,0,50,100,'WORK_LOG',1,1],
  ['small amount below half cent', 'PER_HOUR',1,0,49,100,'WORK_LOG',0,1],
  ['zero usage plus fixed trip', 'PER_KM_PLUS_FIXED',5000,40000,0,5000,'ODOMETER',40000,290000],
  ['zero usage no fixed', 'PER_HOUR',500000,0,0,600,'WORK_LOG',0,3000000],
  ['no maximum agreed', 'PER_KM',5000,0,5000,null,'MUTUAL_MANUAL',250000,null],
];
for(const [label,basis,rate,fixed,used,cap,method,total,maximum] of examples){
  test('M8 measured nonpayable: '+label,()=>{
    const req={rateBasis:basis,proposedRateMinorPerUnit:rate,
      proposedFixedMinor:fixed,reportedHundredths:used,
      proposedMaxHundredths:cap,measurementMethod:method};
    const variable=total-fixed;
    const reply={variableChargeMinor:variable,proposedTotalMinor:total,proposedMaximumMinor:maximum};
    assert.equal(miniMeasuredArithmeticProof(reply,req),true);
    assert.equal(miniMeasuredArithmeticProof({...reply,proposedTotalMinor:total+1},req),false);
    assert.equal(miniMeasuredArithmeticProof({...reply,variableChargeMinor:variable+1},req),false);
    if(maximum!==null)
      assert.equal(miniMeasuredArithmeticProof({...reply,proposedMaximumMinor:maximum+1},req),false);
  });
}
test('M8 rejects invalid rate, evidence, cap and unsafe arithmetic',()=>{
  const base={rateBasis:'PER_HOUR',proposedRateMinorPerUnit:500000,
    proposedFixedMinor:0,reportedHundredths:400,proposedMaxHundredths:600,
    measurementMethod:'WORK_LOG'};
  const valid={variableChargeMinor:2000000,proposedTotalMinor:2000000,proposedMaximumMinor:3000000};
  for(const changed of [
    {proposedRateMinorPerUnit:0},{proposedRateMinorPerUnit:-1},
    {proposedRateMinorPerUnit:1.5},{reportedHundredths:-1},
    {reportedHundredths:601},{proposedMaxHundredths:0},
    {proposedFixedMinor:5},{measurementMethod:'GPS_ROUTE'},
    {rateBasis:'PER_KM'},{proposedRateMinorPerUnit:Number.MAX_SAFE_INTEGER},
  ]) assert.equal(miniMeasuredArithmeticProof(valid,{...base,...changed}),false);
});
test('UI accepts only API-verified proposals, never Money authority',()=>{
  const api=readFileSync('src/api/securepay/measured-services/index.ts','utf8');
  const ui=readFileSync('src/mini/MiniMeasuredServicePreview.tsx','utf8');
  assert.match(api,/miniMeasuredArithmeticProof\(r,request\)/);
  assert.match(api,/r\.state==='PROPOSAL_ONLY'/);
  assert.match(api,/r\.paymentEnabled===false/);
  assert.match(ui,/measuredPreviewProof\(preview,agreementId,request\)/);
  assert.doesNotMatch(ui,/\.initiate\(|\.release\(/);
});
