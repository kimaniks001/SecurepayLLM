import test from 'node:test';
import assert from 'node:assert/strict';
import {studioRoute,isCommandReceipt,validPage,isDraft} from '../src/features/collaborative-offers/studioTransport.mjs';
const id='aabbccdd-1234-1234-1234-aabbccddeeff',other='aabbccdd-1234-1234-1234-aabbccddeeaa';
const draft={id,organizerKsNumber:'KS001',title:'Test',purpose:'Test',createdAt:'2026-11-27T12:00:00Z',revision:1,agreementAuthorized:false,paymentAuthorized:false};
const receipt={id,kind:'CREATE',draftId:id,invitationId:null,revision:1,decision:null,agreementAuthorized:false,paymentAuthorized:false};
const cases=[
 ['personal older drafts',()=>studioRoute('GET','/api/v1/g4/me/studio/drafts/after/'+id)],
 ['business older drafts',()=>studioRoute('GET','/api/v1/g4/business/KS002/studio/drafts/after/'+id)],
 ['personal older inbox',()=>studioRoute('GET','/api/v1/g4/me/studio/inbox/after/'+id)],
 ['business older inbox',()=>studioRoute('GET','/api/v1/g4/business/KS002/studio/inbox/after/'+id)],
 ['no cursor mutation',()=>!studioRoute('POST','/api/v1/g4/me/studio/drafts/after/'+id,{})],
 ['invalid cursor',()=>!studioRoute('GET','/api/v1/g4/me/studio/inbox/after/not-a-uuid')],
 ['no cursor query injection',()=>!studioRoute('GET','/api/v1/g4/me/studio/drafts/after/'+id+'?x=1')],
 ['valid page',()=>validPage([draft],other,x=>x.id,isDraft)],
 ['end of list',()=>validPage([],id,x=>x.id,isDraft)],
 ['reject duplicate cursor',()=>!validPage([draft],id,x=>x.id,isDraft)],
 ['reject duplicate record',()=>!validPage([draft,draft],other,x=>x.id,isDraft)],
 ['reject oversized page',()=>!validPage(Array(51).fill(draft),other,x=>x.id,isDraft)],
 ['reject forged authority',()=>!validPage([{...draft,paymentAuthorized:true}],other,x=>x.id,isDraft)],
 ['restart receipt',()=>isCommandReceipt(receipt,id)],
 ['reject wrong reference',()=>!isCommandReceipt(receipt,other)],
 ['reject missing receipt',()=>!isCommandReceipt(null,id)],
 ['reject payment authority',()=>!isCommandReceipt({...receipt,paymentAuthorized:true},id)],
 ['reject commercial acceptance',()=>!isCommandReceipt({...receipt,kind:'DECISION',invitationId:other,decision:'ACCEPT_AGREEMENT'},id)],
 ['withdraw receipt',()=>isCommandReceipt({...receipt,kind:'DECISION',invitationId:other,revision:2,decision:'WITHDRAW'},id)],
 ['revision receipt',()=>isCommandReceipt({...receipt,kind:'REVISION',draftId:other,revision:2},id)]
];
for(const [name,fn] of cases)test(name,()=>assert.equal(fn(),true));
