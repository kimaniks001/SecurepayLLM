import test from 'node:test';
import assert from 'node:assert/strict';
import {studioRoute,matchesCommandReceipt} from '../src/features/collaborative-offers/studioTransport.mjs';
const id='aabbccdd-1234-1234-1234-aabbccddeeff',draft='aabbccdd-1234-1234-1234-aabbccddeeaa',invite='aabbccdd-1234-1234-1234-aabbccddeeab';
const p=(f)=>({id,fingerprint:JSON.stringify(f)});
const r=(kind,draftId,invitationId,revision,decision=null)=>({id,kind,draftId,invitationId,revision,decision,agreementAuthorized:false,paymentAuthorized:false});
const cases=[
 ['create receipt',()=>matchesCommandReceipt(r('CREATE',id,null,1),p(['create','Title','Purpose']))],
 ['revision receipt',()=>matchesCommandReceipt(r('REVISION',draft,null,3),p(['revision',draft,2,'T','P']))],
 ['invite receipt',()=>matchesCommandReceipt(r('INVITE',draft,id,3),p(['invite',draft,3,'KS002','scope','']))],
 ['contribute receipt',()=>matchesCommandReceipt(r('CONTRIBUTE',draft,invite,2),p(['contribute',invite,1,'terms']))],
 ['decision receipt',()=>matchesCommandReceipt(r('DECISION',draft,invite,2,'WITHDRAW'),p(['decision',invite,1,'WITHDRAW']))],
 ['wrong id',()=>!matchesCommandReceipt({...r('CREATE',id,null,1),id:invite},p(['create','T','P']))],
 ['wrong decision',()=>!matchesCommandReceipt(r('DECISION',draft,invite,2,'REVOKE'),p(['decision',invite,1,'WITHDRAW']))],
 ['wrong revision',()=>!matchesCommandReceipt(r('REVISION',draft,null,2),p(['revision',draft,2,'T','P']))],
 ['wrong invite',()=>!matchesCommandReceipt(r('CONTRIBUTE',draft,draft,2),p(['contribute',invite,1,'terms']))],
 ['no forged financial authority',()=>!matchesCommandReceipt({...r('CREATE',id,null,1),paymentAuthorized:true},p(['create','T','P']))],
 ['malformed pending',()=>!matchesCommandReceipt(r('CREATE',id,null,1),{id,fingerprint:'bad'})],
 ['missing receipt',()=>!matchesCommandReceipt(null,p(['create','T','P']))],
 ['personal exact receipt path',()=>studioRoute('GET','/api/v1/g4/me/studio/commands/'+id)],
 ['business exact receipt path',()=>studioRoute('GET','/api/v1/g4/business/KS002/studio/commands/'+id)],
 ['no receipt mutation',()=>!studioRoute('POST','/api/v1/g4/me/studio/commands/'+id,{})],
 ['no arbitrary receipt path',()=>!studioRoute('GET','/api/v1/g4/me/studio/commands/anything')]
];
for(const [name,fn] of cases)test(name,()=>assert.equal(fn(),true));
