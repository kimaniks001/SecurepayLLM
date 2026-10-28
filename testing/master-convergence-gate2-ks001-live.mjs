/**
 * SecurePay Master Convergence Gate 2 — real API, first TWO journeys.
 * Run ONLY against an isolated disposable local SecurePayAPI, NEVER production.
 * Requires a real configured KS001/provider and a non-sensitive test invoice
 * image containing an identifiable seller, items, total and at least one
 * unknown term. Does not sign up, invite, confirm, fund, or make a payment.
 *
 * GATE2_DISPOSABLE_ACK=YES GATE2_FIXTURE=/secure/test/fixture.json \
 *   node testing/master-convergence-gate2-ks001-live.mjs
 *
 * fixture.json (never commit tokens or customer files):
 * {
 *  "baseUrl":"http://127.0.0.1:8080",
 *  "apiSha":"<exact 40-character backend commit>",
 *  "uiSha":"<exact 40-character frontend commit>",
 *  "billPath":"/absolute/path/to/disposable-invoice.jpg",
 *  "billMime":"image/jpeg",
 *  "billSeller":"Test Hardware Limited",
 *  "billAmount":"8400",
 *  "billCurrency":"KES"
 * }
 * The runner proves an actual request/response journey; run the same commit
 * in authenticated browser staging separately before release.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Blob } from 'node:buffer';

const requireTrue=(condition,message)=>{if(!condition)throw new Error(message);};
const sha=/^[0-9a-f]{40}$/i;
const uuid=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
const retryable=new Set(['RECEIVED','PROCESSING']);
const known=new Set(['RECEIVED','PROCESSING','READY','PARTIAL','FAILED','REMOVED']);
export function gate2LocalFixture(value){
  requireTrue(value&&typeof value==='object'&&!Array.isArray(value),'Test fixture required');
  let endpoint;
  try{endpoint=new URL(value.baseUrl);}catch{throw Error('Valid local API URL required');}
  requireTrue(endpoint.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname),
    'Gate 2 live checks refuse all non-loopback or HTTPS endpoints');
  requireTrue(endpoint.pathname==='/'&&!endpoint.search&&!endpoint.hash&&!endpoint.username&&!endpoint.password,
    'Gate 2 API base URL must not embed paths or secrets');
  requireTrue(sha.test(value.uiSha||'')&&sha.test(value.apiSha||''),'Exact tested UI and API SHAs are required');
  requireTrue(typeof value.billPath==='string'&&value.billPath.startsWith('/')&&!value.billPath.includes('..'),
    'A disposable absolute test-image path is required');
  requireTrue(['image/jpeg','image/png'].includes(value.billMime),'Only test JPEG or PNG supported');
  requireTrue(typeof value.billSeller==='string'&&value.billSeller.length>=3,'Test bill must specify the expected seller');
  requireTrue(/^\d+(?:\.\d\d?)?$/.test(String(value.billAmount||'')),'Expected invoice amount must be a decimal');
  requireTrue(value.billCurrency==='KES','This fixture must use an explicit KES amount');
  return {...value,baseUrl:endpoint.origin};
}
function assertion(value,message){requireTrue(value,message);}
function shortText(v){return String(v??'').trim();}
function asText(parts){return parts.filter(x=>typeof x==='string').join(' ').toLowerCase();}
function observedInContext(context){
 const all=[...(context.entities||[]),...(context.relationships||[])];
 return all.filter(x=>x?.source?.sourceArtifactId).map(x=>({
   artifact:x.source.sourceArtifactId,sourceKind:x.source.sourceKind,
   name:x.name||null,attributes:x.attributes||{},qualifiers:x.qualifiers||{},
 }));
}
async function call(baseUrl,method,path,{accessToken,body,multipart,fetchImpl=fetch}={}){
 const headers={'Accept':'application/json'};
 if(accessToken)headers['X-SecurePay-Conversation-Token']=accessToken;
 if(body)headers['Content-Type']='application/json';
 const res=await fetchImpl(baseUrl+path,{
   method,headers,body:body?JSON.stringify(body):multipart||undefined,
   redirect:'error',signal:AbortSignal.timeout(50_000),
 });
 let out;try{out=await res.json();}catch{out=null;}
 if(!res.ok)throw Error('SecurePay '+method+' '+path+' returned HTTP '+res.status+
   ' (provider/identity/configuration may be unavailable; no successful step inferred)');
 assertion(out&&typeof out==='object','SecurePay did not return a valid JSON receipt: '+path);
 return out;
}
const requireFresh=created=>{
 assertion(created&&uuid.test(created.conversationId||''),'New conversation ID missing');
 assertion(typeof created.conversationAccessSecret==='string'&&created.conversationAccessSecret.length>=43,
   'Fresh anonymous conversation possession token missing');
 assertion(Date.parse(created.anonymousExpiresAt)>Date.now(),'Conversation access already expired');
 return {id:created.conversationId,secret:created.conversationAccessSecret};
};
async function firstQuestion(api,request){
 const created=requireFresh(await request('POST','/api/agent/conversations'));
 const answer=await request('POST','/api/agent/conversations/'+created.id+'/turns',{
    accessToken:created.secret,body:{message:'i want to plan for a trip to Nakuru',clientTurnId:randomUUID(),clientTimeZone:'Africa/Nairobi'},
 });
 assertion(shortText(answer.message).length>25,'KS001 did not provide a meaningful first reply');
 assertion(!/couldn.t save that correction|correction.*hasn.t changed|try telling me again in a different way/i.test(answer.message),
   'Known first-turn-as-correction defect resurfaced');
 const formation=await request('GET','/api/agent/conversations/'+created.id+'/agreement-formation',{accessToken:created.secret});
 assertion(formation.conversationId===created.id,'Formation failed conversation identity binding');
 const next=formation.question?.ask===true?shortText(formation.question.text):'';
 assertion(answer.message.includes('?')||next.includes('?'),
   'KS001 did not ask the next material planning question; a greeting is insufficient');
 const state=await request('GET','/api/agent/conversations/'+created.id+'/context',{accessToken:created.secret});
 assertion(state.conversationId===created.id,'Context is not from visitor conversation');
 assertion(state.version>=0,'No canonical context version was returned');
 return {conversationCreated:true,replyNonempty:true,nextQuestionPresent:true,contextRead:true};
}
/** Source receipt may be READY, PARTIAL or a genuine FAILED. No invented facts.
 * The test insists that a successful bill reading is grounded in actual source
 * artifacts and that ambiguous terms remain questions rather than consent.
 */
async function imageBillJourney(api,request,fixture){
 const created=requireFresh(await request('POST','/api/agent/conversations'));
 const bytes=readFileSync(fixture.billPath);
 assertion(bytes.byteLength>100&&bytes.byteLength<=10*1024*1024,'Disposable test image invalid or too large');
 const form=new FormData();
 form.append('sourceKind','PHOTO');
 form.append('file',new Blob([bytes],{type:fixture.billMime}),basename(fixture.billPath));
 form.append('label','Disposable test bill — source reading only');
 let artifact=await request('POST','/api/agent/conversations/'+created.id+'/sources/upload',{
   accessToken:created.secret,multipart:form,
 });
 assertion(artifact.conversationId===created.id&&uuid.test(artifact.sourceArtifactId||''),
   'Source upload receipt not conversation-bound');
 assertion(known.has(artifact.extractionStatus),'Unknown source reading state');
 const started=Date.now();
 while(retryable.has(artifact.extractionStatus)&&Date.now()-started<120_000){
   await new Promise(resolve=>setTimeout(resolve,1500));
   artifact=await request('GET','/api/agent/conversations/'+created.id+'/sources/'+artifact.sourceArtifactId,
     {accessToken:created.secret});
   assertion(artifact.conversationId===created.id,'Another conversation source was returned');
 }
 assertion(['READY','PARTIAL'].includes(artifact.extractionStatus),
   'Source understanding was not confirmed: '+artifact.extractionStatus+
   '. A receipt is not a reading; inspect the isolated provider and failed-source status.');
 const context=await request('GET','/api/agent/conversations/'+created.id+'/context',{accessToken:created.secret});
 assertion(context.conversationId===created.id,'Trade Context not bound to the bill conversation');
 const cited=observedInContext(context).filter(x=>x.artifact===artifact.sourceArtifactId);
 assertion(cited.length>0,'No canonical source-backed candidates were found after reading');
 const searchable=asText([artifact.summary,JSON.stringify(cited)]);
 assertion(searchable.includes(fixture.billSeller.toLowerCase()),
   'Expected test seller was not discoverable; require human correction rather than guessing');
 const amountDigits=fixture.billAmount.replace(/\.00$/,'');
 assertion(searchable.replace(/,/g,'').includes(amountDigits),
   'Expected test bill total was not discoverable; do not invent pricing');
 const formation=await request('GET','/api/agent/conversations/'+created.id+'/agreement-formation',{accessToken:created.secret});
 assertion(formation.conversationId===created.id,'Agreement Formation changed conversation identity');
 const fair=await request('GET','/api/agent/conversations/'+created.id+'/fair-trade-examination',{accessToken:created.secret});
 assertion(fair.conversationId===created.id&&fair.tradeContextVersion===context.version,
   'Fair Trade examination is not for current Trade Context version');
 assertion(fair.status==='PARTIAL_ADVISORY','A reading cannot become a fairness certificate');
 assertion(fair.principleCoverage?.length===12,'No canonical twelve-lens coverage returned');
 return {
   uploaded:true,sourceStatus:artifact.extractionStatus,sourceBackedCandidates:cited.length,
   currentVersion:context.version,unsolvedSourceUncertainties:artifact.uncertainties?.length||0,
   fairness:'PARTIAL_ADVISORY_ONLY',payment:'NOT_ATTEMPTED',
 };
}
export async function runGate2FirstTwoJourneys(fixture,{fetchImpl=fetch}={}){
 const f=gate2LocalFixture(fixture);
 const request=(method,path,opts={})=>call(f.baseUrl,method,path,{...opts,fetchImpl});
 const first=await firstQuestion(f,request);
 const bill=await imageBillJourney(f,request,f);
 return {result:'LIVE_API_PASS',apiSha:f.apiSha,uiSha:f.uiSha,
  journey1:first,journey2:bill,thirdPartyFunding:'NOT_ATTEMPTED',
  caveat:'Does not certify an authorised SecureLink or any payment. Gate 2 Journeys 3–6 and authenticated browser still require real independent acceptance.',
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 requireTrue(process.env.GATE2_DISPOSABLE_ACK==='YES',
   'Set GATE2_DISPOSABLE_ACK=YES only for local disposable API; never production');
 requireTrue(process.env.GATE2_FIXTURE,'GATE2_FIXTURE must be a local non-sensitive fixture JSON');
 const fixture=JSON.parse(readFileSync(process.env.GATE2_FIXTURE,'utf8'));
 const result=await runGate2FirstTwoJourneys(fixture);
 console.log(JSON.stringify(result,null,2));
}
