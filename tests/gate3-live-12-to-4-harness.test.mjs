import test from 'node:test';
import assert from 'node:assert/strict';
import {checkGate3Fixture,certifyGate3} from '../testing/gate3-12-to-4-live.mjs';

const agreementId='11111111-2222-4333-8444-555555555555';
const ks=n=>'KS'+String(n).padStart(3,'0');
const applicants=Array.from({length:12},(_,i)=>({ksNumber:ks(i+20),token:'test-member-token-'+(i+20)}));
const fixture=()=>({
  baseUrl:'http://127.0.0.1:8080',organizerToken:'organizer-disposable-token',
  agreementId,roleCode:'CONTRIBUTOR',applicants,selectedKsNumbers:[ks(21),ks(24),ks(27),ks(30)],
});
test('Gate 3 real-harness safety: only local disposable endpoints and 13 separate identities',()=>{
  assert.throws(()=>checkGate3Fixture({...fixture(),baseUrl:'https://securepay.ke'}),/loopback/);
  assert.throws(()=>checkGate3Fixture({...fixture(),baseUrl:'https://127.0.0.1:8080'}),/loopback/);
  assert.throws(()=>checkGate3Fixture({...fixture(),applicants:applicants.slice(0,11)}),/Exactly 12/);
  assert.throws(()=>checkGate3Fixture({...fixture(),selectedKsNumbers:[ks(21),ks(21),ks(27),ks(30)]}),/four KS Numbers/);
  assert.throws(()=>checkGate3Fixture({...fixture(),applicants:applicants.map(a=>({...a,token:'identical-token'}))}),/distinct/);
});
test('Gate 3 real-harness protocol: 12 signals → 4 invitations → four independent joins and confirmations',async()=>{
  const visited=[];const helps=new Map();const invites=new Map();const joins=new Set();const confirms=new Set();
  const select=new Set(fixture().selectedKsNumbers);
  const byToken=new Map(applicants.map(a=>[a.token,a.ksNumber]));
  const uuid=n=>'aaaaaaaa-aaaa-4aaa-8aaa-'+String(n).padStart(12,'0');
  const version={id:uuid(100),versionNumber:1,contentHash:'sample hash'};
  const fakeFetch=async(url,req)=>{
    const path=new URL(url).pathname;
    const token=req.headers.Authorization.slice(7);
    const who=byToken.get(token);
    const body=req.body?JSON.parse(req.body):null;
    visited.push(req.method+' '+path);
    const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json'}});
    if(req.method==='GET'&&path==='/api/v1/agreements/'+agreementId)
      return reply({id:agreementId,status:'PROPOSED'});
    if(req.method==='POST'&&path==='/api/v1/community/objects')
      return reply({id:uuid(1),objectType:'OPPORTUNITY',circleId:null},201);
    if(req.method==='POST'&&path===`/api/v1/community/objects/${uuid(1)}/help`){
      helps.set(who,true);
      return reply({status:'ACTIVE',authorCanonicalKsNumber:who},201);
    }
    if(req.method==='GET'&&path===`/api/v1/community/objects/${uuid(1)}/help`)
      return reply([...helps.keys()].map(x=>({authorCanonicalKsNumber:x})));
    if(req.method==='POST'&&path===`/api/v1/agreements/${agreementId}/invitations`){
      const to=body.intendedKsNumber;
      assert.ok(select.has(to),'Only preselected candidates may receive invitations');
      const was=invites.has(to);
      if(!was)invites.set(to,uuid(200+selectIndex(to)));
      return reply({invitationId:invites.get(to),status:'ISSUED',targetKind:'KS_NUMBER',replayed:was},201);
    }
    if(req.method==='GET'&&path==='/api/v1/agreement-invitations/me')
      return reply({items:[...invites].filter(([to])=>to===who).map(([to,id])=>({invitationId:id,agreementId}))});
    const joinPath=path.match(/^\/api\/v1\/agreement-invitations\/me\/([^/]+)\/join$/);
    if(req.method==='POST'&&joinPath){
      const owns=[...invites].some(([to,id])=>to===who&&id===joinPath[1]);
      if(!owns)return reply({message:'Not found'},404);
      joins.add(who);
      return reply({agreementId,participantId:uuid(300+selectIndex(who)),
        joinedVersionId:version.id,confirmationRequired:true},201);
    }
    if(req.method==='GET'&&path===`/api/v1/agreements/${agreementId}/versions`)return reply([version]);
    if(req.method==='POST'&&path===`/api/v1/agreements/${agreementId}/versions/${version.id}/confirm`){
      assert.ok(joins.has(who));
      confirms.add(who);
      return reply({status:'CONFIRMED',confirmationCurrent:true},201);
    }
    if(req.method==='GET'&&path===`/api/v1/agreements/${agreementId}/invitations`)
      return reply([...invites.values()].map(invitationId=>({invitationId,status:joins.has([...invites].find(([,id])=>id===invitationId)[0])?'JOINED':'ISSUED'})));
    if(req.method==='GET'&&path===`/api/v1/agreements/${agreementId}/participants`)
      return reply([...confirms].map((to)=>({participantStatus:'CONFIRMED',identityKs:to})));
    throw new Error('Unexpected API call '+req.method+' '+path);
  };
  const selectIndex=number=>[...select].indexOf(number);
  const result=await certifyGate3(fixture(),{fetchImpl:fakeFetch});
  assert.equal(result.interested,12);
  assert.equal(result.selected,4);
  assert.equal(result.confirmed,4);
  assert.equal(result.unselected,8);
  assert.equal(helps.size,12);
  assert.equal(invites.size,4);
  assert.equal(joins.size,4);
  assert.equal(confirms.size,4);
  assert.equal(visited.filter(x=>x.endsWith('/invitations')&&x.startsWith('POST')).length,5,
    'Four invitations plus one idempotent retry');
  assert.equal(visited.some(x=>/money|payment|fund|ledger/i.test(x)),false);
});
