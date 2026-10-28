import test from 'node:test';
import assert from 'node:assert/strict';
import {CURRENT_VERSION,examples,ensureLoopback,runFeeProbe}
 from '../testing/master-convergence-gate2-fee-probe.mjs';

test('Gate 2 pricing: fee probe rejects cloud, production, HTTPS, credentials, and URL paths',()=>{
 for(const s of [
  'https://securepay.ke','http://securepay.ke',
  'https://127.0.0.1:8080','http://192.168.1.10:8080',
  'http://user:pass@localhost:8080',
  'http://localhost:8080/test','http://localhost:8080/?key=x',
 ]){
  assert.throws(()=>ensureLoopback(s),/loopback|Invalid/);
 }
 assert.equal(ensureLoopback('http://127.0.0.1:8080'),'http://127.0.0.1:8080');
});
test('Gate 2 pricing: exact progressive fee examples survive through a read-only API contract',async()=>{
 let requests=0;
 const mock=async(url,options)=>{
  requests++;
  assert.equal(options.method,'GET');
  assert.equal(options.body,undefined);
  const value=Number(new URL(url).searchParams.get('qualifyingAmountMinor'));
  if(value===500000100)return new Response(JSON.stringify({error:'schedule not defined'}),{status:422});
  const e=examples.find(x=>x.minor===value);
  if(!e)throw Error('Unexpected fee amount');
  return new Response(JSON.stringify({
   qualifyingAmountMinor:e.minor,currency:'KES',
   band:e.band,platformFeeMinor:e.feeMinor,
   pricingVersion:CURRENT_VERSION,
  }),{status:200,headers:{'Content-Type':'application/json'}});
 };
 const r=await runFeeProbe('http://127.0.0.1:8080',{fetchImpl:mock});
 assert.equal(r.result,'SYNTHETIC_FEE_PROTOCOL_PASS');
 assert.equal(r.transport,'INJECTED_TEST_TRANSPORT');
 assert.equal(r.checked.length,6);
 assert.equal(requests,7);
 assert.equal(r.moneyExecution,'NOT_ATTEMPTED');
});
test('Gate 2 pricing: wrong cap, band, pricing version and above-ceiling success all fail closed',async()=>{
 for(const malformed of ['fee','band','version','above']){
  const mock=async(url)=>{
   const v=Number(new URL(url).searchParams.get('qualifyingAmountMinor'));
   if(v===500000100)return new Response(JSON.stringify({}),{status:malformed==='above'?200:400});
   const e=examples.find(x=>x.minor===v);
   const dto={qualifyingAmountMinor:e.minor,currency:'KES',band:e.band,
     platformFeeMinor:e.feeMinor,pricingVersion:CURRENT_VERSION};
   if(malformed==='fee')dto.platformFeeMinor+=2;
   if(malformed==='band')dto.band++;
   if(malformed==='version')dto.pricingVersion='old-plan';
   return new Response(JSON.stringify(dto),{status:200});
  };
  await assert.rejects(()=>runFeeProbe('http://127.0.0.1:8080',{fetchImpl:mock}),
    /pricing mismatch|above KES 5 million/i,malformed);
 }
});
