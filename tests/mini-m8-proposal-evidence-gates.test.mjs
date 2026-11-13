import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const measured=readFileSync('src/mini/MiniMeasuredServicePreview.tsx','utf8');
const schedule=readFileSync('src/mini/MiniQuoteSchedulePreview.tsx','utf8');
const core=readFileSync('src/api/securepay/measured-services/index.ts','utf8');
const scheduleContract=readFileSync('src/api/securepay/store-quotations/index.ts','utf8');

for(const [name,source] of [['measured',measured],['schedule',schedule]]){
  test(name+' invalidates an in-flight proposal when inputs change',()=>{
    assert.match(source,/const revision=useRef\(0\)/);
    assert.match(source,/revision\.current\+\+;setResult\(null\)/);
    assert.match(source,/const requestedRevision=\+\+revision\.current/);
    assert.match(source,/if\(revision\.current===requestedRevision\)setResult\(/);
    assert.match(source,/if\(revision\.current===requestedRevision\)[\s\S]*?setError\(/);
  });
}
test('measured estimate explains each unverified human and provider gate',()=>{
  assert.match(measured,/data-m8="measured-evidence-steps"/);
  assert.match(measured,/Both people confirm the rate/);
  assert.match(measured,/Record time or distance evidence/);
  assert.match(measured,/independently reviews the actual measured work/);
  assert.match(measured,/separately checks payment authority/);
  assert.match(measured,/estimate proves none of these checks/);
  assert.match(core,/r\.tariffAgreed===false/);
  assert.match(core,/r\.usageVerified===false/);
  assert.match(core,/r\.supplierApproved===false/);
  assert.match(core,/r\.paymentEnabled===false/);
  assert.doesNotMatch(measured,/\.initiate\(|\.release\(/);
});
test('milestone preview never implies buyer/seller consent or provider funding',()=>{
  assert.match(schedule,/data-m8="schedule-consent-steps"/);
  assert.match(schedule,/Buyer and seller separately confirm/);
  assert.match(schedule,/Verify the milestone evidence/);
  assert.match(schedule,/No deposit has been requested or funded here/);
  assert.match(scheduleContract,/result\.sellerScheduleApproved !== false/);
  assert.match(scheduleContract,/result\.paymentEnabled !== false/);
  assert.doesNotMatch(schedule,/\.initiate\(|\.release\(/);
});
