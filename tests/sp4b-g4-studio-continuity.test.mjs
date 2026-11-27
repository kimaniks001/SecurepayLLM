import test from 'node:test';
import assert from 'node:assert/strict';
import {studioOrigin,personalIdentity,represented,studioBusinesses,studioPath,studioClient} from '../src/features/collaborative-offers/studioSession.mjs';
import {isReceived,isDraft} from '../src/features/collaborative-offers/studioTransport.mjs';
const id='aabbccdd-1234-1234-1234-aabbccddeeff',inv='aabbccdd-1234-1234-1234-aabbccddeeaa',sub='aabbccdd-1234-1234-1234-aabbccddeeab';
const human={authenticatedIdentityId:id,authenticatedKsNumber:'KS001',profiles:[{authorityKind:'PERSONAL',actingIdentityId:id,actingKsNumber:'KS001'}]};
const rep={businessKsNumber:'KS002',identityType:'BUSINESS',relationship:'ADMINISTRATOR',canActFor:true,displayName:'Test'};
const personal={kind:'personal',identityId:id,personalKsNumber:'KS001',ksNumber:'KS001'};
const biz={...personal,kind:'business',ksNumber:'KS002'};
const no={agreementAuthorized:false,paymentAuthorized:false};
const draft={id,organizerKsNumber:'KS002',title:'Wedding',purpose:'Prepare',createdAt:'2026-11-27T12:00:00Z',revision:1,...no};
const received={draft,invitation:{id:inv,draftId:id,scope:'Catering',expiresAt:'2026-12-04T12:00:00Z',draftRevision:1,decisionSequence:1,status:'PREPARATION_ACCEPTED',replacesId:null,...no},contributions:[{id:sub,inviteId:inv,revision:1,terms:'Terms',submittedAt:'2026-11-27T12:00:00Z',...no}]};
const a='https://test-mini-g4.securepay.ke',b='https://test-living-g4.securepay.ke';
const checks=[
 ['mini exact',()=>studioOrigin('mini',a,a,'true')===a],
 ['living exact',()=>studioOrigin('living',b,b,'true')===b],
 ['no feature flag',()=>studioOrigin('mini',a,a,'false')===null],
 ['production denied',()=>studioOrigin('mini','https://securepay.ke','https://securepay.ke','true')===null],
 ['foreign origin denied',()=>studioOrigin('mini','https://evil.example','https://evil.example','true')===null],
 ['cross product origin denied',()=>studioOrigin('mini',b,b,'true')===null],
 ['origin path denied',()=>studioOrigin('mini',a+'/test',a+'/test','true')===null],
 ['identity verified',()=>personalIdentity(human)?.ksNumber==='KS001'],
 ['wrong acting identity',()=>personalIdentity({...human,profiles:[{...human.profiles[0],actingKsNumber:'KS003'}]})===null],
 ['duplicate profile denied',()=>personalIdentity({...human,profiles:[...human.profiles,...human.profiles]})===null],
 ['representation verified',()=>represented(rep,'KS002')],
 ['revoked representation',()=>!represented({...rep,canActFor:false},'KS002')],
 ['different business denied',()=>!represented(rep,'KS003')],
 ['duplicate business list denied',()=>studioBusinesses([rep,rep])===null],
 ['personal path',()=>studioPath(personal,'inbox')==='/api/v1/g4/me/studio/inbox'],
 ['represented path',()=>studioPath(biz,'inbox')==='/api/v1/g4/business/KS002/studio/inbox'],
 ['no arbitrary path',()=>studioPath(biz,'../payment')===null],
 ['no money route',()=>studioPath(biz,'payment','POST',{})===null],
 ['cannot create another identity draft',()=>studioPath(personal,'drafts','POST',{id,organizerKsNumber:'KS002',title:'A',purpose:'B'})===null],
 ['canonical record format',()=>isReceived(received)&&isDraft(draft)]
];
for(const [name,fn] of checks)test(name,()=>assert.equal(fn(),true));
function mock(origin,{revoke=false,swapAt='',identity=human,records=received}={}){
 let active=true;const calls=[];
 const c=studioClient({origin,token:'test-only',current:()=>active,fetcher:async(url,opts)=>{
  const path=url.slice(origin.length);calls.push({path,opts});
  if(path===swapAt)active=false;
  return {ok:true,json:async()=>path.endsWith('acting-context')?identity:path.endsWith('/representation')?{...rep,canActFor:!revoke}:path.endsWith('/mine')?[rep]:[records]};
 }});
 return {c,calls,stop:()=>{active=false}};
}
const scenarios=[
 ['same canonical record across two products',async()=>{const m=mock(a),l=mock(b);const x=await m.c.scoped(personal,'inbox'),y=await l.c.scoped(biz,'inbox');assert.equal(x[0].draft.id,y[0].draft.id);assert.equal(x[0].invitation.id,y[0].invitation.id);assert.equal(x[0].draft.revision,y[0].draft.revision);}],
 ['represented authority rechecked before each command',async()=>{const m=mock(b);await m.c.scoped(biz,'inbox');await m.c.scoped(biz,'inbox');assert.equal(m.calls.filter(c=>c.path.endsWith('/representation')).length,2);assert.equal(m.calls.filter(c=>c.path.endsWith('acting-context')).length,2);}],
 ['revocation blocks Studio command',async()=>{const m=mock(b,{revoke:true});await assert.rejects(()=>m.c.scoped(biz,'inbox'));assert.equal(m.calls.length,2);}],
 ['account change before command',async()=>{const m=mock(a,{swapAt:'/api/v1/participants/me/acting-context'});await assert.rejects(()=>m.c.scoped(personal,'inbox'));assert.equal(m.calls.length,1);}],
 ['account change after command rejects response',async()=>{const m=mock(a,{swapAt:'/api/v1/g4/me/studio/inbox'});await assert.rejects(()=>m.c.scoped(personal,'inbox'));assert.equal(m.calls.length,2);}],
 ['different identity rejected',async()=>{const m=mock(a,{identity:{...human,authenticatedKsNumber:'KS003',profiles:[{...human.profiles[0],actingKsNumber:'KS003'}]}});await assert.rejects(()=>m.c.scoped(personal,'inbox'));assert.equal(m.calls.length,1);}],
 ['scope closure blocks further calls',async()=>{const m=mock(a);m.stop();await assert.rejects(()=>m.c.scoped(personal,'inbox'));assert.equal(m.calls.length,0);}],
 ['no browser proxy key or redirect',async()=>{const m=mock(b);await m.c.scoped(biz,'inbox');for(const {opts} of m.calls){assert.equal(opts.redirect,'error');assert.equal(opts.credentials,'omit');assert.equal(opts.cache,'no-store');assert.equal(opts.referrerPolicy,'no-referrer');assert.equal(Object.keys(opts.headers).some(k=>k.includes('Proxy')),false);}}]
];
for(const [name,fn] of scenarios)test(name,fn);
