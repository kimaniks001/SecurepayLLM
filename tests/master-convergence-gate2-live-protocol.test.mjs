import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync,unlinkSync } from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {gate2LocalFixture,runGate2FirstTwoJourneys} from '../testing/master-convergence-gate2-ks001-live.mjs';

const one='11111111-2222-4333-8444-555555555555';
const two='22222222-2222-4333-8444-555555555555';
const src='33333333-2222-4333-8444-555555555555';
const tokenOne='A'.repeat(50),tokenTwo='B'.repeat(50);
const file=join(tmpdir(),'gate2-disposable-bill-'+randomUUID()+'.jpg');
writeFileSync(file,Buffer.alloc(300,1)); // only a synthetic transport fixture; NOT an actual photograph.
const base=()=>({
 baseUrl:'http://127.0.0.1:8080',uiSha:'a'.repeat(40),apiSha:'b'.repeat(40),
 billPath:file,billMime:'image/jpeg',billSeller:'Test Hardware Limited',billItems:['Cement'],billAmount:'8400',billCurrency:'KES',
});
const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'Content-Type':'application/json'},
});
test('Gate 2: transport cannot be pointed to staging, production, cloud URL or URL with secrets',()=>{
 for(const url of [
  'https://securepay.ke','https://127.0.0.1:8080','http://192.168.0.1:8080',
  'http://user:secret@127.0.0.1:8080',
  'http://127.0.0.1:8080/api/v1/','http://localhost:8080/?token=secret',
 ]){
  assert.throws(()=>gate2LocalFixture({...base(),baseUrl:url}),url);
 }
 assert.throws(()=>gate2LocalFixture({...base(),apiSha:'current'}),/SHAs/);
 assert.throws(()=>gate2LocalFixture({...base(),billPath:'./customer-invoice.jpg'}),/absolute/);
 assert.throws(()=>gate2LocalFixture({...base(),billMime:'application/pdf'}),/JPEG or PNG/);
});
function fakeApi({sourceState='READY',badFirst=false,wrongSource=false,reusedToken=false,wrongSeller=false}={}){
 const calls=[];
 let created=0;
 const transport=async(url,request)=>{
  const path=new URL(url).pathname;
  const method=request.method;
  calls.push({path,method,headers:request.headers});
  assert.equal(new URL(url).hostname,'127.0.0.1');
  if(path==='/api/agent/conversations'&&method==='POST'){
   created++;
   return json({conversationId:created===1?one:two,createdAt:new Date().toISOString(),contextVersion:0,
    conversationAccessSecret:created===1||reusedToken?tokenOne:tokenTwo,anonymousExpiresAt:new Date(Date.now()+3600_000).toISOString()},201);
  }
  if(path.startsWith('/api/agent/conversations/'+one+'/')&&
     request.headers['X-SecurePay-Conversation-Token']!==tokenOne)
     return json({error:'not found'},404);
  if(path.startsWith('/api/agent/conversations/'+two+'/')&&
     request.headers['X-SecurePay-Conversation-Token']!==tokenTwo)
     return json({error:'not found'},404);
  if(path===`/api/agent/conversations/${one}/turns`){
   const payload=JSON.parse(request.body);
   assert.match(payload.message,/trip to Nakuru/);
   assert.ok(payload.clientTurnId);
   return json({message:badFirst?"I couldn't save that correction. Try telling me again in a different way.":
    'We can plan a trip to Nakuru around your goals. What date do you want to travel?'});
  }
  if(path===`/api/agent/conversations/${one}/agreement-formation`)
   return json({conversationId:one,question:{ask:true,text:'When would you travel?'}});
  if(path===`/api/agent/conversations/${one}/context`)
   return json({conversationId:one,version:1,entities:[],relationships:[]});
  if(path===`/api/agent/conversations/${two}/sources/upload`){
   assert.equal(method,'POST');
   assert.equal(request.body.get('sourceKind'),'PHOTO');
   assert.ok(request.body.get('file'));
   return json({conversationId:wrongSource?one:two,sourceArtifactId:src,extractionStatus:sourceState,
    summary:wrongSeller?'Invoice from UNKNOWN, Cement, total KES 8400':
      'Invoice from Test Hardware Limited, Cement, total KES 8400',uncertainties:['delivery date unknown']},201);
  }
  if(path===`/api/agent/conversations/${two}/context`)
   return json({conversationId:two,version:4,entities:[{
     id:'id-1',name:wrongSeller?'UNKNOWN':'Test Hardware Limited',source:{sourceArtifactId:src,sourceKind:'PHOTO'},
     attributes:{amount:'KES 8400',items:'Cement'},
   }],relationships:[]});
  if(path===`/api/agent/conversations/${two}/agreement-formation`)
   return json({conversationId:two,version:4,reviewable:false,question:{ask:true,text:'When will delivery happen?'}});
  if(path===`/api/agent/conversations/${two}/fair-trade-examination`)
   return json({conversationId:two,tradeContextVersion:4,status:'PARTIAL_ADVISORY',
    principleCoverage:Array.from({length:12},(_,i)=>({principleNumber:i+1,state:'NOT_ASSESSED'}))});
  throw Error('Unexpected network operation '+method+' '+path);
 };
 return {transport,calls};
}
test('Gate 2: synthetic protocol validates two real-style conversations, anonymous possession, source grounding and fairness boundary',async()=>{
 const {transport,calls}=fakeApi();
 const result=await runGate2FirstTwoJourneys(base(),{fetchImpl:transport});
 assert.equal(result.result,'SYNTHETIC_PROTOCOL_PASS'); // injected adapter may never call itself live.
 assert.equal(result.executionMode,'INJECTED_TEST_TRANSPORT');
 assert.equal(result.journey2.unrelatedConversationDenied,true);
 assert.equal(result.journey1.nextQuestionPresent,true);
 assert.equal(result.journey2.sourceBackedCandidates,1);
 assert.equal(result.journey2.fairness,'PARTIAL_ADVISORY_ONLY');
 assert.equal(result.thirdPartyFunding,'NOT_ATTEMPTED');
 assert.equal(calls.filter(x=>x.path==='/api/agent/conversations').length,2);
 assert.equal(calls.some(x=>/money|fund|release|agreements\/.*\/invitations/i.test(x.path)),false);
});
test('Gate 2: refusal of source-read failure; an upload receipt is not a successful reading',async()=>{
 const {transport}=fakeApi({sourceState:'FAILED'});
 await assert.rejects(()=>runGate2FirstTwoJourneys(base(),{fetchImpl:transport}),/Source understanding was not confirmed/);
});
test('Gate 2: first-turn correction regression and wrong-conversation media receipt fail closed',async()=>{
 await assert.rejects(()=>runGate2FirstTwoJourneys(base(),{fetchImpl:fakeApi({badFirst:true}).transport}),/correction defect/);
 await assert.rejects(()=>runGate2FirstTwoJourneys(base(),{fetchImpl:fakeApi({wrongSource:true}).transport}),/conversation-bound/);
});
process.on('exit',()=>{try{unlinkSync(file);}catch{}});

test('Gate 2: distinct anonymous possession tokens are mandatory, not reused per tab',async()=>{
 const {transport}=fakeApi({reusedToken:true});
 await assert.rejects(
   ()=>runGate2FirstTwoJourneys(base(),{fetchImpl:transport}),
   /reused a previous anonymous possession secret/,
 );
});
test('Gate 2: the test may not fabricate a seller when the reader did not find one',async()=>{
 const {transport}=fakeApi({wrongSeller:true});
 await assert.rejects(
   ()=>runGate2FirstTwoJourneys(base(),{fetchImpl:transport}),
   /Expected test seller was not discoverable/,
 );
});
