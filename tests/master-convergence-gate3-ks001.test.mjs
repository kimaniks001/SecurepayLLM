import test from 'node:test';
import assert from 'node:assert/strict';
import {localApi,runGate3Intelligence,scenarios} from '../testing/master-convergence-gate3-ks001-live.mjs';
const UI='a'.repeat(40),API='b'.repeat(40);
const pad=n=>String(n).padStart(12,'0');
const ids=Array.from({length:3},(_,i)=>'00000000-0000-4000-8000-'+pad(i+1));
const tokens=Array.from({length:3},(_,i)=>String.fromCharCode(65+i).repeat(50));
const goodFair=(id,version)=>({
  conversationId:id,tradeContextVersion:version,status:'PARTIAL_ADVISORY',
  fullyExamined:false,advisoryQuestion:'What else should be agreed before this could be fair?',
  principleCoverage:Array.from({length:12},(_,i)=>({
   principleNumber:i+1,state:i===1?'NEEDS_CLARIFICATION':'NOT_ASSESSED',
  })),
});
function adapter({blankReply=false,staleFair=false,allPositive=false,noContinuation=false,
                 foreignReadsAllowed=false,reusedToken=false}={}){
 let created=0;
 const count=new Map();
 const fetchImpl=async(url,request)=>{
  const path=new URL(url).pathname;
  if(path==='/api/agent/conversations'){
   assert.equal(request.method,'POST');
   const id=ids[created],token=reusedToken?tokens[0]:tokens[created];
   created++;
   return new Response(JSON.stringify({
    conversationId:id,conversationAccessSecret:token,
    anonymousExpiresAt:new Date(Date.now()+600000).toISOString(),
   }),{status:201});
  }
  const match=path.match(/^\/api\/agent\/conversations\/([^/]+)\/(.*)$/);
  assert.ok(match,'Unexpected path '+path);
  const i=ids.indexOf(match[1]),action=match[2];
  assert.ok(i>=0);
  if(request.headers['X-SecurePay-Conversation-Token']!==tokens[i]&&!foreignReadsAllowed)
   return new Response(JSON.stringify({error:'not accessible'}),{status:404});
  if(action==='turns'){
   assert.equal(request.method,'POST');
   const body=JSON.parse(request.body);
   assert.ok(body.clientTurnId);
   const next=(count.get(i)||0)+1;
   count.set(i,next);
   return new Response(JSON.stringify({
    message:blankReply?'':next===1
      ?'I understand your intention. What agreement details should we establish next?'
      :'I have kept the context. Who needs to agree to the next material condition?',
   }),{status:200});
  }
  const version=(noContinuation?1:count.get(i)||0);
  if(action==='context')return new Response(JSON.stringify({
   conversationId:ids[i],version,entities:[{name:i===0?'Nakuru':i===1?'chairs':'rainwater tank'}],
   relationships:[],
  }),{status:200});
  if(action==='agreement-formation')return new Response(JSON.stringify({
   conversationId:ids[i],version,question:{ask:true,text:'Which date or role needs agreement?'},
  }),{status:200});
  if(action==='fair-trade-examination')return new Response(JSON.stringify({
   ...goodFair(ids[i],staleFair?version+1:version),
   principleCoverage:allPositive?goodFair(ids[i],version).principleCoverage
     .map(x=>({...x,state:'NO_MATERIAL_CONCERN_OBSERVED'})):goodFair(ids[i],version).principleCoverage,
  }),{status:200});
  throw Error('Unexpected action '+action);
 };
 return fetchImpl;
}
test('Gate 3: explicit loopback address and exact source commits are mandatory',()=>{
 for(const s of ['https://securepay.ke','http://securepay.ke','http://10.1.2.3:8080',
  'https://localhost:8080','http://foo:bar@localhost:8080',
  'http://127.0.0.1:8080/api']){
  assert.throws(()=>localApi(s),/loopback|Valid isolated/);
 }
 assert.equal(localApi('http://127.0.0.1:8080'),'http://127.0.0.1:8080');
});
test('Gate 3: three intact provider-protocol journeys remain synthetic when using injected fetch',async()=>{
 const result=await runGate3Intelligence({baseUrl:'http://127.0.0.1:8080',
  uiSha:UI,apiSha:API,fetchImpl:adapter()});
 assert.equal(result.result,'SYNTHETIC_PROTOCOL_PASS');
 assert.equal(result.execution,'INJECTED_TEST_TRANSPORT');
 assert.equal(result.conversations.length,3);
 assert.equal(result.conversations.every(x=>x.initialVersion===1&&x.continuedVersion===2),true);
 assert.equal(result.conversations.every(x=>x.principleCount===12&&x.notQualified),true);
 assert.equal(result.moneyExecution,'NOT_ATTEMPTED');
});
test('Gate 3: reused anonymous secret or permission to read another conversation fails',async()=>{
 for(const opts of [{reusedToken:true},{foreignReadsAllowed:true}])
  await assert.rejects(()=>runGate3Intelligence({baseUrl:'http://127.0.0.1:8080',
    uiSha:UI,apiSha:API,fetchImpl:adapter(opts)}),
    /reused|Another conversation can read/,JSON.stringify(opts));
});
test('Gate 3: stale Fair Trade or invented twelve positive assessments fails',async()=>{
 for(const opts of [{staleFair:true},{allPositive:true}])
  await assert.rejects(()=>runGate3Intelligence({baseUrl:'http://127.0.0.1:8080',
    uiSha:UI,apiSha:API,fetchImpl:adapter(opts)}),
    /stale|Twelve unexplained positive/,JSON.stringify(opts));
});
test('Gate 3: model blank or dead follow-up never passes certification',async()=>{
 for(const opts of [{blankReply:true},{noContinuation:true}])
  await assert.rejects(()=>runGate3Intelligence({baseUrl:'http://127.0.0.1:8080',
    uiSha:UI,apiSha:API,fetchImpl:adapter(opts)}),
    /empty or unhelpful|New material information/,JSON.stringify(opts));
});
test('Gate 3: scenarios include new intention, goods commercial basis, and work pay/safety',()=>{
 assert.deepEqual(scenarios.map(x=>x.id),[
  'new_intention','unpriced_goods','project_paid_opportunity']);
 for(const x of scenarios)assert.ok(x.initial.length>20&&x.followup.length>35);
});
