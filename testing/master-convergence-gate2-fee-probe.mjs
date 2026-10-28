/**
 * Gate 2 — deterministic, READ-ONLY commercial pricing acceptance.
 *
 * GATE2_DISPOSABLE_ACK=YES GATE2_API_URL=http://127.0.0.1:8080 \
 *   node testing/master-convergence-gate2-fee-probe.mjs
 *
 * Loopback-only. GET /api/v1/pricing/platform-fee only.
 * No billing intent, bank, activation, settlement or fee acceptance occurs.
 * Tests actual API endpoint shape and policy version independently of UI maths.
 * A synthetic fetch adapter can test the script, but is NOT live API evidence.
 */
import {pathToFileURL} from 'node:url';
export const CURRENT_VERSION='phase31-v1.1-phase14-progressive';
export const examples=Object.freeze([
 {kes:20_000,minor:2_000_000,feeMinor:2_000,band:1},
 {kes:20_001,minor:2_000_100,feeMinor:2_001,band:2},
 {kes:100_000,minor:10_000_000,feeMinor:82_000,band:2},
 {kes:218_000,minor:21_800_000,feeMinor:200_000,band:2},
 {kes:1_000_000,minor:100_000_000,feeMinor:200_000,band:2},
 {kes:5_000_000,minor:500_000_000,feeMinor:1_000_000,band:3},
]);
export function ensureLoopback(base){
 let u;
 try {u=new URL(base);}catch{throw Error('Invalid isolated pricing API URL');}
 if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)
    ||u.pathname!=='/'||u.search||u.hash||u.username||u.password)
    throw Error('Pricing probe permits only an uncredentialed loopback HTTP origin');
 return u.origin;
}
const readJson=async(res)=>{
 try {return await res.json();}catch{throw Error('Pricing response was not JSON');}
};
export async function runFeeProbe(base,{fetchImpl=fetch}={}){
 const origin=ensureLoopback(base);
 const output=[];
 for(const x of examples){
   const response=await fetchImpl(origin+'/api/v1/pricing/platform-fee?qualifyingAmountMinor='+x.minor,{
     method:'GET',redirect:'error',signal:AbortSignal.timeout(25_000),headers:{'Accept':'application/json'},
   });
   if(response.status!==200)throw Error('Pricing API HTTP '+response.status+' for KES '+x.kes);
   const dto=await readJson(response);
   if(dto.qualifyingAmountMinor!==x.minor||dto.currency!=='KES'
      ||dto.platformFeeMinor!==x.feeMinor||dto.band!==x.band||dto.pricingVersion!==CURRENT_VERSION)
     throw Error('Authoritative pricing mismatch at KES '+x.kes+
       ': expected '+x.feeMinor+' minor units and band '+x.band+' in '+CURRENT_VERSION);
   output.push({amountKes:x.kes,feeKes:dto.platformFeeMinor/100,band:dto.band,version:dto.pricingVersion});
 }
 const outOfSchedule=await fetchImpl(origin+
   '/api/v1/pricing/platform-fee?qualifyingAmountMinor=500000100',{
     method:'GET',redirect:'error',signal:AbortSignal.timeout(25_000),headers:{'Accept':'application/json'},
   });
 if(outOfSchedule.status<400||outOfSchedule.status>=500)
   throw Error('Amount above KES 5 million must be refused with a controlled 4xx policy error');
 return {
   result:fetchImpl===fetch?'READ_ONLY_API_PROBE_PASS':'SYNTHETIC_FEE_PROTOCOL_PASS',
   transport:fetchImpl===fetch?'NATIVE_LOOPBACK_HTTP':'INJECTED_TEST_TRANSPORT',
   checked:output,aboveScheduleRefused:true,moneyExecution:'NOT_ATTEMPTED',
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.env.GATE2_DISPOSABLE_ACK!=='YES')throw Error('GATE2_DISPOSABLE_ACK=YES required');
 const r=await runFeeProbe(process.env.GATE2_API_URL);
 console.log(JSON.stringify(r,null,2));
}
