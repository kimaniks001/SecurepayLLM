import test from 'node:test';
import assert from 'node:assert/strict';
import {g5Route} from '../src/features/collaborative-offers/g5Transport.mjs';
const id='aabbccdd-1234-1234-1234-aabbccddee01',plan='aabbccdd-1234-1234-1234-aabbccddee02',invite='aabbccdd-1234-1234-1234-aabbccddee03';
const path='/api/v1/g4/me/studio/coordination/'+plan+'/final-review',dep='/api/v1/g4/me/studio/coordination/'+plan+'/examination';
const body={kind:'DECLARE_CAPABILITY',id,invitationId:invite,expectedSequence:0,capabilityKind:'SERVICE',deliverable:'Photography',place:'Venue',purpose:'Event records',method:'Take photographs',basis:'Proposed fee',startsAt:'2026-12-05T08:00:00Z',endsAt:'2026-12-05T10:00:00Z',explicitlyConfirmed:true};
const fixed={mode:'FIXED',unit:'offer',quantity:1,unitMinor:250000,currency:'KES'};
const unit={...fixed,mode:'UNIT',unit:'hour',quantity:3};
const report={kind:'REPORT_DEPENDENCY',id,ordinal:1,expectedSequence:0,evidence:'Access arranged before arrival'};
const cases=[
 ['legacy unresolved pricing',()=>g5Route('POST',path,body)],
 ['explicit unresolved pricing',()=>g5Route('POST',path,{...body,pricing:null})],
 ['fixed proposed price',()=>g5Route('POST',path,{...body,pricing:fixed})],
 ['unit proposed price',()=>g5Route('POST',path,{...body,pricing:unit})],
 ['quoted price',()=>g5Route('POST',path,{...body,pricing:{...unit,mode:'QUOTED'}})],
 ['unpriced quotation',()=>g5Route('POST',path,{...body,pricing:{...unit,mode:'QUOTE_REQUEST',unitMinor:null}})],
 ['unpriced quote cannot assert amount',()=>!g5Route('POST',path,{...body,pricing:{...unit,mode:'QUOTE_REQUEST'}})],
 ['fixed quantity exact',()=>!g5Route('POST',path,{...body,pricing:{...fixed,quantity:2}})],
 ['unit cannot use offer',()=>!g5Route('POST',path,{...body,pricing:{...unit,unit:'offer'}})],
 ['monthly not silently flattened',()=>!g5Route('POST',path,{...body,pricing:{...unit,unit:'month'}})],
 ['no zero compensation inference',()=>!g5Route('POST',path,{...body,pricing:{...fixed,unitMinor:0}})],
 ['no fractional minor unit',()=>!g5Route('POST',path,{...body,pricing:{...fixed,unitMinor:1.25}})],
 ['no unsupported currency',()=>!g5Route('POST',path,{...body,pricing:{...fixed,currency:'USD'}})],
 ['total bounded',()=>!g5Route('POST',path,{...body,pricing:{...unit,unitMinor:9999999999999}})],
 ['no client payer authority',()=>!g5Route('POST',path,{...body,pricing:{...fixed,payerId:invite}})],
 ['no hidden payment command',()=>!g5Route('POST',path,{...body,pricing:fixed,paymentAuthorized:true})],
 ['prospective arrangement',()=>g5Route('POST',dep,{...report,evidenceKind:'PROSPECTIVE'})],
 ['reported fulfilment',()=>g5Route('POST',dep,{...report,evidenceKind:'FULFILLED'})],
 ['legacy report supported',()=>g5Route('POST',dep,report)],
 ['no synthetic verification',()=>!g5Route('POST',dep,{...report,evidenceKind:'VERIFIED'})],
 ['no unrelated flag',()=>!g5Route('POST',dep,{...report,evidenceKind:'PROSPECTIVE',fulfilled:true})]
];
for(const [name,fn] of cases)test(name,()=>assert.equal(fn(),true));
