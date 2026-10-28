/**
 * TRUE NORTH GATE 3 — REAL, DISPOSABLE-API ACCEPTANCE TEST.
 *
 * Must run ONLY against a locally started disposable SecurePayAPI + database.
 * Does not create Accounts, use a mock service, call Money, release funds or
 * accept for a person. The twelve session tokens belong to twelve independently
 * pre-provisioned test identities. This is an executable API contract check,
 * not a claim of having already passed a real backend run.
 *
 * CLI:
 * GATE3_DISPOSABLE_ACK=YES \
 * GATE3_FIXTURE_PATH=/safe/path/fixture.json \
 * node testing/gate3-12-to-4-live.mjs
 *
 * fixture.json (NOT committed): {
 *   "baseUrl":"http://127.0.0.1:8080",
 *   "organizerToken":"<test token>", "agreementId":"<fresh, PROPOSED Agreement uuid>",
 *   "roleCode":"CONTRIBUTOR",
 *   "applicants":[{"ksNumber":"KS...", "token":"<test token>"}, ... exactly 12],
 *   "selectedKsNumbers":["KS...","KS...","KS...","KS..."]
 * }
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const YES='YES';
const uid=()=>crypto.randomUUID();
const must=(condition,reason)=>{if(!condition)throw new Error(reason);};
const norm=x=>String(x).trim().toUpperCase();

export function checkGate3Fixture(config) {
  must(config && typeof config==='object','Fixture is required');
  const url=new URL(config.baseUrl);
  must(url.protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(url.hostname),
    'Gate 3 certification may use loopback HTTP only; production/staging hosts refused');
  must(!url.username&&!url.password&&!url.search&&!url.hash,'No credentials or query parameters in test URL');
  must(config.organizerToken && typeof config.organizerToken==='string','Test organiser token missing');
  must(/^[0-9a-f-]{36}$/i.test(config.agreementId||''),'Fresh disposable Agreement id missing');
  must(/^[A-Za-z][A-Za-z0-9_-]{1,40}$/.test(config.roleCode||''),'Valid existing Agreement role code required');
  must(Array.isArray(config.applicants)&&config.applicants.length===12,'Exactly 12 independent applicants are required');
  const identities=config.applicants.map(a=>norm(a.ksNumber||''));
  must(identities.every(x=>x.startsWith('KS'))&&new Set(identities).size===12,'Twelve distinct canonical KS identities required');
  must(config.applicants.every(a=>a.token&&typeof a.token==='string'),'Each applicant needs their own test authentication');
  must(new Set([config.organizerToken,...config.applicants.map(a=>a.token)]).size===13,'All 13 test authentication tokens must be distinct');
  must(Array.isArray(config.selectedKsNumbers)&&config.selectedKsNumbers.length===4,'Explicitly select exactly four KS Numbers');
  const chosen=config.selectedKsNumbers.map(norm);
  must(new Set(chosen).size===4&&chosen.every(x=>identities.includes(x)),'Every selected worker must be one distinct applicant');
  return {...config,baseUrl:url.origin,selectedKsNumbers:chosen,applicants:config.applicants.map(a=>({...a,ksNumber:norm(a.ksNumber)}))};
}

export async function certifyGate3(apiFixture,{fetchImpl=fetch,trace=()=>{}}={}) {
  const f=checkGate3Fixture(apiFixture);
  const run=uid();
  const call=async(token,method,path,data=null,headers={})=>{
    const response=await fetchImpl(f.baseUrl+path,{
      method,headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{}),...headers},
      ...(data?{body:JSON.stringify(data)}:{}),
      redirect:'error',
      signal:AbortSignal.timeout(20000),
    });
    let out=null;try{out=await response.json();}catch{/* 204 or error body */}
    if(!response.ok)throw new Error(method+' '+path+' returned '+response.status+' '+(out?.message||out?.error||''));
    return out;
  };
  const negative=async(token,method,path,data=null)=>{
    const res=await fetchImpl(f.baseUrl+path,{method,
      headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},
      ...(data?{body:JSON.stringify(data)}:{}),redirect:'error',signal:AbortSignal.timeout(20000)});
    must([403,404].includes(res.status),
      'Wrong identity must be denied without leaking an invitation; got HTTP '+res.status);
  };
  // Fail closed BEFORE creating anything if the seeded agreement isn't safely PROPOSED.
  const agreement=await call(f.organizerToken,'GET','/api/v1/agreements/'+f.agreementId);
  must(agreement.id===f.agreementId,'Wrong Agreement loaded');
  must(agreement.status==='PROPOSED','Test Agreement must be fresh and PROPOSED');
  trace('Confirmed disposable proposed agreement');

  const invitation=await call(f.organizerToken,'POST','/api/v1/community/objects',{
    objectType:'OPPORTUNITY',title:'DISPOSABLE TEST — Water-tank restoration work',
    body:'Proposed work: site safety briefing, cleaning, 4 workers, proposed pay discussed separately with KS001. Funding NOT CONFIRMED. Interest is not selection or acceptance.',
    locationLabel:'Test fixture only',
  },{'Idempotency-Key':'gate3-post-'+run});
  must(invitation.id&&invitation.objectType==='OPPORTUNITY'&&invitation.circleId===null,
    'Canonical public Community opportunity not created');
  trace('One actual Community OPPORTUNITY created');
  for(const applicant of f.applicants) {
    const help=await call(applicant.token,'POST',
      '/api/v1/community/objects/'+invitation.id+'/help',null,
      {'Idempotency-Key':'gate3-help-'+run+'-'+applicant.ksNumber});
    must(help.status==='ACTIVE'&&norm(help.authorCanonicalKsNumber)===applicant.ksNumber,
      'Real I can help response was not recorded for '+applicant.ksNumber);
  }
  const interest=await call(f.organizerToken,'GET',
    '/api/v1/community/objects/'+invitation.id+'/help?limit=100&offset=0');
  must(Array.isArray(interest)&&interest.length===12,'Exactly twelve active interest responses required');
  must(new Set(interest.map(x=>norm(x.authorCanonicalKsNumber))).size===12,'Duplicate/incorrect applicants');
  trace('All twelve people independently expressed interest');

  const selected=new Map();
  for(const ks of f.selectedKsNumbers) {
    const issue=await call(f.organizerToken,'POST','/api/v1/agreements/'+f.agreementId+'/invitations',{
      idempotencyKey:'gate3-invite-'+run+'-'+ks,roleCode:f.roleCode,
      intendedKsNumber:ks,
    });
    must(issue.invitationId&&issue.status==='ISSUED'&&issue.targetKind==='KS_NUMBER',
      'Canonical Agreement invitation not issued to '+ks);
    selected.set(ks,issue.invitationId);
  }
  must(selected.size===4,'Only four candidates may be targeted');
  trace('Four and only four KS-targeted Agreement invitations issued');

  // Exactly-once retry: same id and no duplicate invitation.
  const first=f.selectedKsNumbers[0];
  const replay=await call(f.organizerToken,'POST','/api/v1/agreements/'+f.agreementId+'/invitations',{
    idempotencyKey:'gate3-invite-'+run+'-'+first,roleCode:f.roleCode,intendedKsNumber:first,
  });
  must(replay.replayed===true&&replay.invitationId===selected.get(first),
    'Identical invitation retry created an extra invitation');

  const byKs=new Map(f.applicants.map(a=>[a.ksNumber,a]));
  const unselected=f.applicants.filter(a=>!selected.has(a.ksNumber));
  for(const applicant of unselected){
    const inbox=await call(applicant.token,'GET','/api/v1/agreement-invitations/me?page=0&size=100');
    must(inbox.items?.every(i=>i.agreementId!==f.agreementId),
      'Unselected applicant has a forbidden Agreement invitation');
    await negative(applicant.token,'POST',
      '/api/v1/agreement-invitations/me/'+selected.get(first)+'/join',
      {idempotencyKey:'gate3-wrong-owner-'+run+'-'+applicant.ksNumber});
  }
  trace('All eight unselected applicants have no invitation/Join authority');

  const joined=[];
  for(const [ks,id] of selected){
    const applicant=byKs.get(ks);
    const inbox=await call(applicant.token,'GET','/api/v1/agreement-invitations/me?page=0&size=100');
    must(inbox.items?.some(i=>i.invitationId===id&&i.agreementId===f.agreementId),
      'Recipient inbox lacks its own targeted invitation');
    const join=await call(applicant.token,'POST',
      '/api/v1/agreement-invitations/me/'+id+'/join',
      {idempotencyKey:'gate3-join-'+run+'-'+ks});
    must(join.agreementId===f.agreementId&&join.participantId&&join.confirmationRequired===true,
      'Independent Join is not recorded as awaiting version confirmation');
    joined.push({ks,participantId:join.participantId,versionId:join.joinedVersionId});
  }
  must(new Set(joined.map(x=>x.participantId)).size===4,'Four unique participant identities required');
  trace('Four separate Join actions completed; not falsely labelled fully confirmed');

  const versions=await call(f.organizerToken,'GET','/api/v1/agreements/'+f.agreementId+'/versions');
  must(Array.isArray(versions)&&versions.length,'Versioned Agreement read failed');
  const current=versions.find(v=>v.id===joined[0].versionId);
  must(current&&current.contentHash&&Number.isInteger(current.versionNumber),
    'Joined version hash and number are required');
  must(joined.every(x=>x.versionId===current.id),'All four joined the same canonical version');
  for(const person of joined){
    const result=await call(byKs.get(person.ks).token,'POST',
      '/api/v1/agreements/'+f.agreementId+'/versions/'+current.id+'/confirm',{
        idempotencyKey:'gate3-confirm-'+run+'-'+person.ks,
        expectedVersionNumber:current.versionNumber,
        expectedContentHash:current.contentHash,
      });
    must(result.status==='CONFIRMED'&&result.confirmationCurrent===true,
      'Person failed to independently confirm the same current Agreement version');
  }
  trace('Four independently confirmed the same Agreement version');

  const invitations=await call(f.organizerToken,'GET','/api/v1/agreements/'+f.agreementId+'/invitations');
  must(Array.isArray(invitations)&&invitations.filter(x=>x.status==='JOINED').length===4,
    'Exactly four JOINED invitations required');
  const participants=await call(f.organizerToken,'GET','/api/v1/agreements/'+f.agreementId+'/participants');
  must(Array.isArray(participants)&&participants.filter(p=>p.participantStatus==='CONFIRMED').length===4,
    'Four confirmed participant rows required');
  trace('Final server-owned Agreement and invitation state checked. No Money action executed.');

  return {communityObjectId:invitation.id,agreementId:f.agreementId,interested:12,
    selected:4,joined:4,confirmed:4,unselected:8,
    funding:'NOT_CHECKED_OR_EXECUTED',trueNorth:'no inferred acceptance or payment'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.env.GATE3_DISPOSABLE_ACK!==YES)
    throw new Error('Set GATE3_DISPOSABLE_ACK=YES only for an isolated disposable test API');
  const file=process.env.GATE3_FIXTURE_PATH;
  must(file,'GATE3_FIXTURE_PATH required; never store test tokens in the repository');
  const fixture=JSON.parse(readFileSync(file,'utf8'));
  const evidence=await certifyGate3(fixture,{trace:s=>console.log('[Gate 3] '+s)});
  console.log(JSON.stringify({result:'PASS',...evidence},null,2));
}
