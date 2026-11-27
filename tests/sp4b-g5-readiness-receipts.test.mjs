import test from 'node:test';
import assert from 'node:assert/strict';
import {g5Route,isReadinessReceipt,matchesReadinessReceipt} from '../src/features/collaborative-offers/g5Transport.mjs';
const id='aabbccdd-1234-1234-1234-aabbccddee01',draft='aabbccdd-1234-1234-1234-aabbccddee02',snapshot='aabbccdd-1234-1234-1234-aabbccddee03',plan='aabbccdd-1234-1234-1234-aabbccddee04',invite='aabbccdd-1234-1234-1234-aabbccddee05';
const no={publicationAuthorized:false,agreementAuthorized:false,paymentAuthorized:false};
const receipt={id,kind:'DECLARE_CAPABILITY',draftId:draft,snapshotId:snapshot,planId:plan,invitationId:invite,sequence:2,decision:null,...no};
const pending={id,path:'coordination/'+plan+'/final-review',fingerprint:JSON.stringify({kind:'DECLARE_CAPABILITY',invitationId:invite,expectedSequence:1})};
const cases=[
 ['receipt route',()=>g5Route('GET','/api/v1/g4/me/studio/readiness-commands/'+id)],
 ['represented receipt',()=>g5Route('GET','/api/v1/g4/business/KS002/studio/readiness-commands/'+id)],
 ['no write receipt',()=>!g5Route('POST','/api/v1/g4/me/studio/readiness-commands/'+id,{id})],
 ['valid receipt',()=>isReadinessReceipt(receipt,id,draft)],
 ['wrong draft',()=>!isReadinessReceipt(receipt,id,plan)],
 ['wrong id',()=>!isReadinessReceipt(receipt,plan,draft)],
 ['no implied authority',()=>!isReadinessReceipt({...receipt,agreementAuthorized:true},id,draft)],
 ['matching command',()=>matchesReadinessReceipt(receipt,pending)],
 ['wrong sequence',()=>!matchesReadinessReceipt({...receipt,sequence:3},pending)],
 ['wrong kind',()=>!matchesReadinessReceipt({...receipt,kind:'SPECIFY_RESOURCE'},pending)],
 ['wrong plan',()=>!matchesReadinessReceipt({...receipt,planId:snapshot},pending)],
 ['wrong invitation',()=>!matchesReadinessReceipt({...receipt,invitationId:draft},pending)],
 ['malformed pending',()=>!matchesReadinessReceipt(receipt,{...pending,fingerprint:'bad'})],
 ['withdrawal bound',()=>isReadinessReceipt({...receipt,kind:'PLAN_DECISION',decision:'WITHDRAW'},id,draft)],
 ['no invalid sequence decision',()=>!isReadinessReceipt({...receipt,kind:'PLAN_DECISION',decision:'ACCEPT_PLAN'},id,draft)],
 ['no commercial acceptance',()=>!isReadinessReceipt({...receipt,kind:'REVIEW_CAPABILITY',decision:'ACCEPT_AGREEMENT'},id,draft)]
];
for(const [name,fn] of cases)test(name,()=>assert.equal(fn(),true));