/**
 * Gate 3 — REAL PROVIDER-BOUND KS001 intelligence acceptance (not a demo).
 *
 * Only a disposable loopback API and an explicit environment ACK are allowed.
 * Native fetch + real API/provider is REQUIRED to produce a LIVE_API_PASS result.
 * Tests 3 fresh conversations with canonical Context, Formation and 12-lens
 * examination after a real turn. Tests continuation in the SAME conversations.
 * Does not make invitations, Agreements, charges, payouts or transfers.
 *
 * GATE3_DISPOSABLE_ACK=YES GATE3_API_URL=http://127.0.0.1:8080 \
 * GATE3_UI_SHA=<40hex> GATE3_API_SHA=<40hex> \
 *   node testing/master-convergence-gate3-ks001-live.mjs
 */
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const sha=/^[a-f\d]{40}$/i;
export const scenarios=Object.freeze([
  {
   id:'new_intention',initial:'I want to plan a trip to Nakuru',
   followup:'I want to go next Saturday. Please help me work out the next steps.',
   mustIncludeBefore:['nakuru'],missingKinds:['date','transport','budget','purpose','accommodation'],
  },
  {
   id:'unpriced_goods',initial:'I have four chairs available. I want to work out a fair agreement to supply them.',
   followup:'These are to be sold for KES 2,000 each, and the buyer has not been identified yet.',
   mustIncludeBefore:['chair'],missingKinds:['price','payment','buyer','sold','gifted','delivered'],
  },
  {
   id:'project_paid_opportunity',initial:'I have a community rainwater tank project and need four people to help restore it. We have not agreed on pay, hours or safety conditions.',
   followup:'I propose to pay KES 800 per person per day for two days. The workers have not agreed yet and safety and completion evidence still need discussion.',
   mustIncludeBefore:['tank','project','work'],missingKinds:['paid','voluntary','rate','hours','safety','completion','agreement'],
  },
]);
export function localApi(raw){
 let u;try{u=new URL(raw);}catch{throw Error('Valid isolated local API URL required');}
 if(u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)
    ||u.pathname!=='/'||u.search||u.hash||u.username||u.password)
   throw Error('Only an uncredentialed loopback HTTP origin may be tested');
 return u.origin;
}
function assert(condition,message){if(!condition)throw Error(message);}
const messageOf=(x)=>String(x?.message??'').trim();
function hasMaterialQuestion(reply,formation,examination){
 const texts=[messageOf(reply),String(formation?.question?.text??''),
   String(examination?.advisoryQuestion??'')].filter(Boolean);
 return texts.some(t=>t.includes('?'))&&texts.some(t=>t.length>=25);
}
async function apiRequest(base,method,path,token,body,fetchImpl){
 const headers={'Accept':'application/json'};
 if(token)headers['X-SecurePay-Conversation-Token']=token;
 if(body)headers['Content-Type']='application/json';
 const res=await fetchImpl(base+path,{
  method,headers,body:body?JSON.stringify(body):undefined,
  redirect:'error',signal:AbortSignal.timeout(45_000),
 });
 let payload;try{payload=await res.json();}catch{payload=null;}
 if(!res.ok)throw Error(method+' '+path+' failed HTTP '+res.status+'; no live intelligence certified');
 assert(payload&&typeof payload==='object','Invalid JSON receipt from '+path);
 return payload;
}
async function readSnapshot(base,id,token,fetchImpl){
 const at='/api/agent/conversations/'+id;
 const req=(path)=>apiRequest(base,'GET',at+path,token,null,fetchImpl);
 const context=await req('/context');
 const formation=await req('/agreement-formation');
 const fair=await req('/fair-trade-examination');
 assert(context.conversationId===id&&formation.conversationId===id&&fair.conversationId===id,
   'Foreign conversation data returned');
 assert(Number.isInteger(context.version)&&fair.tradeContextVersion===context.version,
   'Fair Trade advice is stale or for a different Trade Context version');
 assert(fair.status==='PARTIAL_ADVISORY'&&fair.fullyExamined===false,
   'An incomplete intention was treated as a Fair Trade certificate');
 const p=fair.principleCoverage;
 assert(Array.isArray(p)&&p.length===12,'Canonical 12-lens coverage missing');
 assert(new Set(p.map(z=>z.principleNumber)).size===12 &&
   p.every(z=>z.principleNumber>=1&&z.principleNumber<=12 &&
     ['NOT_ASSESSED','NOT_APPLICABLE','NO_MATERIAL_CONCERN_OBSERVED','NEEDS_CLARIFICATION','MATERIAL_CONCERN'].includes(z.state)),
   'Fair Trade states or numbers are invalid');
 assert(!p.every(z=>z.state==='NO_MATERIAL_CONCERN_OBSERVED'),
   'Twelve unexplained positive principle assessments were returned');
 return {context,formation,fair};
}
export async function runGate3Intelligence({
 baseUrl,uiSha,apiSha,fetchImpl=fetch,scenariosToRun=scenarios,
}){
 const base=localApi(baseUrl);
 assert(sha.test(uiSha)&&sha.test(apiSha),'Exact candidate SHAs required');
 const seenTokens=new Set(),outcomes=[];
 for(const scenario of scenariosToRun){
  const created=await apiRequest(base,'POST','/api/agent/conversations',null,null,fetchImpl);
  const id=created.conversationId,token=created.conversationAccessSecret;
  assert(/^[0-9a-f-]{36}$/i.test(id||'')&&typeof token==='string'&&token.length>=43,
    'Fresh disposable conversation identity or token missing');
  assert(!seenTokens.has(token),'Conversation possession secret reused');
  seenTokens.add(token);
  const at='/api/agent/conversations/'+id;
  const turn=async(msg)=>{
   const result=await apiRequest(base,'POST',at+'/turns',token,{
      message:msg,clientTurnId:randomUUID(),clientTimeZone:'Africa/Nairobi',
    },fetchImpl);
   assert(messageOf(result).length>=25,'KS001 returned empty or unhelpful text');
   assert(!/couldn.t save that correction|try telling me again in a different way/i.test(result.message),
     'Original first-intention correction failure returned');
   return result;
  };
  const initial=await turn(scenario.initial);
  const before=await readSnapshot(base,id,token,fetchImpl);
  assert(before.context.version>0,'First turn did not capture any canonical understanding');
  assert(hasMaterialQuestion(initial,before.formation,before.fair),
    'KS001 stopped instead of asking a material next question');
  const words=[messageOf(initial).toLowerCase(),JSON.stringify(before.context).toLowerCase()].join(' ');
  assert(scenario.mustIncludeBefore.some(word=>words.includes(word)),
    'The human intention has not been understood in canonical Context');
  const continued=await turn(scenario.followup);
  const after=await readSnapshot(base,id,token,fetchImpl);
  assert(after.context.version>=before.context.version,
    'Continued conversation lost or replaced current understanding');
  assert(hasMaterialQuestion(continued,after.formation,after.fair),
    'KS001 conversation stopped after a material follow-up');
  assert(after.context.version>before.context.version,
    'New material information did not update Trade Context on follow-up');
  // Context is isolated. A visit with someone else's bearer token must not succeed.
  if(seenTokens.size>1){
   const foreignToken=[...seenTokens][0];
   const denied=await fetchImpl(base+at+'/context',{
    method:'GET',headers:{'Accept':'application/json',
      'X-SecurePay-Conversation-Token':foreignToken},redirect:'error',
    signal:AbortSignal.timeout(15_000),
   });
   assert([401,403,404].includes(denied.status),'Another conversation can read private Context');
  }
  outcomes.push({id:scenario.id,conversationIsolated:true,
    initialVersion:before.context.version,continuedVersion:after.context.version,
    initialQuestion:true,continuedQuestion:true,
    principleCount:after.fair.principleCoverage.length,
    notQualified:true,moneyExecution:'NOT_ATTEMPTED'});
 }
 return {result:fetchImpl===fetch?'LIVE_PROVIDER_API_PASS':'SYNTHETIC_PROTOCOL_PASS',
  execution:fetchImpl===fetch?'NATIVE_LOOPBACK_HTTP':'INJECTED_TEST_TRANSPORT',
  uiSha,apiSha,conversations:outcomes,moneyExecution:'NOT_ATTEMPTED',
  warning:'A successful provider and partial Fair Trade reading does not certify participant acceptance, source reading, funds or all Gate 2 journeys.'};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 if(process.env.GATE3_DISPOSABLE_ACK!=='YES')throw Error('Set GATE3_DISPOSABLE_ACK=YES only on disposable local API');
 const result=await runGate3Intelligence({
  baseUrl:process.env.GATE3_API_URL,uiSha:process.env.GATE3_UI_SHA,apiSha:process.env.GATE3_API_SHA,
 });
 console.log(JSON.stringify(result,null,2));
}
