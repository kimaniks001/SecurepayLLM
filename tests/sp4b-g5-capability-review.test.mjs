import test from 'node:test';
import assert from 'node:assert/strict';
import {g5Route,isFinalReview,isWindowChoice} from '../src/features/collaborative-offers/g5Transport.mjs';
import {studioRoute} from '../src/features/collaborative-offers/studioTransport.mjs';
const id='aabbccdd-1234-1234-1234-aabbccddee01',plan='aabbccdd-1234-1234-1234-aabbccddee02',snap='aabbccdd-1234-1234-1234-aabbccddee03',invite='aabbccdd-1234-1234-1234-aabbccddee04',proposal='aabbccdd-1234-1234-1234-aabbccddee05';
const base='/api/v1/g4/me/studio/',biz='/api/v1/g4/business/KS002/studio/';
const from='2026-12-05T08:00:00Z',to='2026-12-05T10:00:00Z',path=base+'coordination/'+plan+'/final-review';
const declaration={kind:'DECLARE_CAPABILITY',id,invitationId:invite,expectedSequence:0,capabilityKind:'SERVICE',deliverable:'Photography',place:'Venue',purpose:'Event memories',method:'Take and deliver photographs',basis:'Quoted fee pending exact terms',startsAt:from,endsAt:to,explicitlyConfirmed:true};
const decision={kind:'REVIEW_CAPABILITY',id,invitationId:invite,declarationId:proposal,decision:'CONFIRM',explicitlyConfirmed:true};
const choice={offerId:id,resourceId:invite,windowId:proposal,resourceReference:'VAN-01',startsAt:from,endsAt:to};
const reading={declarationId:id,proposalId:proposal,version:1,principleSetVersion:'v1',lenses:Array.from({length:12},(_,i)=>({number:i+1,title:'Canonical lens '+(i+1),state:'NOT_ASSESSED',explanation:''})),questions:['Who','What','Where','When','Why','How','Commercial basis'].map(name=>({name,evidence:'Declared evidence',state:'DECLARED'})),fullyExamined:false,hasMaterialConcern:false};
const capability={id,invitationId:invite,recipientKsNumber:'KS002',sequence:1,kind:'SERVICE',deliverable:declaration.deliverable,place:declaration.place,purpose:declaration.purpose,method:declaration.method,basis:declaration.basis,startsAt:from,endsAt:to,review:null,reviewedSuitability:false,declaredCoverageCurrent:true,fairTrade:reading};
const view={planId:plan,snapshotId:snap,capabilities:[capability],collectiveReading:null,blockers:['SUBSTANTIVE_FAIR_TRADE_EXAMINATION_REQUIRED'],collectiveReady:false,publicationAuthorized:false,agreementAuthorized:false,paymentAuthorized:false};
const collective={planId:plan,contextId:snap,declarationIds:[id],principleSetVersion:'v1',lenses:reading.lenses,fullyExamined:false,hasMaterialConcern:false};
const cases=[
 ['collective exact manifest',()=>isFinalReview({...view,collectiveReading:collective})],
 ['wrong manifest source',()=>!isFinalReview({...view,collectiveReading:{...collective,declarationIds:[proposal]}})],
 ['wrong collective plan',()=>!isFinalReview({...view,collectiveReading:{...collective,planId:snap}})],
 ['false collective completeness',()=>!isFinalReview({...view,collectiveReading:{...collective,fullyExamined:true}})],
 ['default off',()=>!studioRoute('GET',path)],
 ['explicit opt-in',()=>studioRoute('GET',path,undefined,true)],
 ['represented lookup',()=>g5Route('GET',biz+'coordination/'+plan+'/final-review')],
 ['scoped picker',()=>g5Route('GET',base+'readiness/'+snap+'/resource-choices')],
 ['represented picker',()=>g5Route('GET',biz+'readiness/'+snap+'/resource-choices')],
 ['no picker mutation',()=>!g5Route('POST',base+'readiness/'+snap+'/resource-choices',declaration)],
 ['no foreign owner query',()=>!g5Route('GET',base+'readiness/'+snap+'/resource-choices?owner=KS003')],
 ['valid service declaration',()=>g5Route('POST',path,declaration)],
 ['valid resource declaration',()=>g5Route('POST',path,{...declaration,capabilityKind:'RESOURCE'})],
 ['no implicit consent',()=>!g5Route('POST',path,{...declaration,explicitlyConfirmed:false})],
 ['no authority assertion',()=>!g5Route('POST',path,{...declaration,collectiveReady:true})],
 ['no client actor override',()=>!g5Route('POST',path,{...declaration,actorId:id})],
 ['no omitted method',()=>!g5Route('POST',path,{...declaration,method:''})],
 ['no unknown capability',()=>!g5Route('POST',path,{...declaration,capabilityKind:'VERIFIED'})],
 ['no reversed interval',()=>!g5Route('POST',path,{...declaration,endsAt:from})],
 ['no stale sequence beyond limit',()=>!g5Route('POST',path,{...declaration,expectedSequence:50})],
 ['exact review',()=>g5Route('POST',path,decision)],
 ['challenge',()=>g5Route('POST',path,{...decision,decision:'CHALLENGE'})],
 ['no substitute acceptance',()=>!g5Route('POST',path,{...decision,decision:'ACCEPT_AGREEMENT'})],
 ['picker readback',()=>isWindowChoice(choice)],
 ['no injected picker fields',()=>!isWindowChoice({...choice,ownerId:id})],
 ['invalid interval rejected',()=>!isWindowChoice({...choice,endsAt:from})],
 ['final review readback',()=>isFinalReview(view)],
 ['reject false readiness',()=>!isFinalReview({...view,collectiveReady:true})],
 ['reject publication authority',()=>!isFinalReview({...view,publicationAuthorized:true})],
 ['reject cleared blocker',()=>!isFinalReview({...view,blockers:['OTHER']})],
 ['reject duplicate roster entry',()=>!isFinalReview({...view,capabilities:[capability,capability]})],
 ['reject wrong declaration binding',()=>!isFinalReview({...view,capabilities:[{...capability,fairTrade:{...reading,declarationId:proposal}}]})],
 ['reject missing lens',()=>!isFinalReview({...view,capabilities:[{...capability,fairTrade:{...reading,lenses:reading.lenses.slice(1)}}]})],
 ['reject false full examination',()=>!isFinalReview({...view,capabilities:[{...capability,fairTrade:{...reading,fullyExamined:true}}]})],
 ['reject duplicate lens',()=>!isFinalReview({...view,capabilities:[{...capability,fairTrade:{...reading,lenses:Array(12).fill(reading.lenses[0])}}]})],
 ['reject false concern',()=>!isFinalReview({...view,capabilities:[{...capability,fairTrade:{...reading,hasMaterialConcern:true}}]})],
 ['reject wrong version',()=>!isFinalReview({...view,capabilities:[{...capability,fairTrade:{...reading,version:2}}]})],
 ['no money grant',()=>!isFinalReview({...view,paymentAuthorized:true})]
];
for(const [name,fn] of cases)test(name,()=>assert.equal(fn(),true));
