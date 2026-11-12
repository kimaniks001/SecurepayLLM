import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {miniAgreementHomePage,miniAgreementDetailView,miniAgreementStatus} from '../src/mini/miniAgreementHome.mjs';
const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const me={roleCode:'BUYER',participantStatus:'CONFIRMED'};
const agreement=(n=1,overrides={})=>({
  agreementId:uuid(n),publicReference:'AGR-'+n,
  title:'Ruiru 40 chairs',purpose:'40 chairs with delivery',status:'INVITATION_PENDING',
  agreementType:'GOODS',proposedAmountMinor:'400000',currency:'KES',
  createdAt:'2026-11-12T08:00:00Z',updatedAt:'2026-11-12T08:20:00Z',
  currentActor:me,counterparty:null,nextDeadline:'2026-12-02T08:00:00Z',
  attentionRequired:true,
  nextActions:[{actionCode:'REVIEW_VERSION',category:'REVIEW',reason:'Review version 2',
    deadline:'2026-12-02T08:00:00Z',attentionClass:'NEEDS_ACTION'}],
  currentAgreementVersionId:uuid(600+n),
  completion:{completed:false,status:'UNFINISHED',reasonCodes:[],agreementVersionId:uuid(600+n),completedAt:null},
  ...overrides
});
const page=(items=[agreement()],offset=0,overrides={})=>({
  items,page:offset,size:20,totalElements:items.length,...overrides
});
const detail=(overrides={})=>({
  overview:{
    agreementId:uuid(1),publicReference:'AGR-1',title:'Ruiru 40 chairs',
    purpose:'40 chairs with delivery',description:'Delivery agreed separately',
    agreementType:'GOODS',status:'INVITATION_PENDING',currency:'KES',proposedAmountMinor:'400000',
    createdAt:'2026-11-12T08:00:00Z',updatedAt:'2026-11-12T08:20:00Z',expiresAt:null
  },
  currentVersion:{versionId:uuid(601),versionNumber:2,contentHash:'hash-2',
    createdAt:'2026-11-12T08:00:00Z',amendmentReason:null,materialChange:false},
  participants:[{participantId:uuid(2),roleCode:'BUYER',participantStatus:'CONFIRMED',
    ksNumber:'KS001-SENSITIVE',displayName:'Amina'},
    {participantId:uuid(3),roleCode:'SELLER',participantStatus:'JOINED_UNCONFIRMED',
     ksNumber:'KS002-SENSITIVE',displayName:'Njeri'}],
  milestones:[{milestoneId:uuid(5),title:'Deliver chairs',description:'Delivery to Ruiru',
    sequenceOrder:1,availableFrom:null,dueAt:'2026-12-02T08:00:00Z',
    status:'PENDING',obligationIds:[uuid(6)]}],
  terms:[{obligationId:uuid(6),title:'Confirm number and delivery',
    description:'40 chairs; 15 currently available',obligationType:'DELIVERY',
    status:'PENDING',currency:'KES',amountMinor:400000,sequenceOrder:1}],
  documents:[],activity:[],versionHistory:[],
  money:{status:'NOT_FUNDED',outstandingReasons:[{gateCode:'CHOICE',reasonCode:'NO_RAIL'}],
    moneyRecordCount:0},
  ...overrides
});
test('M4: list consists only of server-owned existing Agreements; drafts remain separate',()=>{
  const view=miniAgreementHomePage(page());
  assert.ok(view);
  assert.equal(view.items[0].id,uuid(1));
  assert.equal(view.items[0].statusText,'Invitations pending');
  assert.equal(view.items[0].actions[0].reason,'Review version 2');
  assert.equal(view.items[0].role,'BUYER');
  assert.equal(Object.hasOwn(view.items[0],'savedBuildId'),false);
  assert.equal(Object.hasOwn(view.items[0],'invitationToken'),false);
});
test('M4: attention is exactly server supplied, not guessed from status or date',()=>{
  const view=miniAgreementHomePage(page([
    agreement(1,{attentionRequired:false, nextActions:[]}),
    agreement(2,{status:'COMPLETED',attentionRequired:true})
  ]));
  assert.equal(view.items[0].attentionRequired,false);
  assert.equal(view.items[1].attentionRequired,true);
});
test('M4: unknown statuses never get called ACTIVE',()=>{
  assert.equal(miniAgreementStatus('UNRECOGNISED'),'Status needs checking');
  assert.equal(miniAgreementStatus('ACTIVE'),'Active');
  assert.equal(miniAgreementStatus('DRAFT'),'Draft Agreement');
});
test('M4: invalid owner actor, missing version, absent next action and duplicate IDs fail closed',()=>{
  for(const record of [
    agreement(1,{currentActor:null}),
    agreement(1,{currentAgreementVersionId:''}),
    agreement(1,{nextActions:undefined}),
    agreement(1,{nextActions:[{reason:'test'}]}),
    agreement(1,{attentionRequired:'yes'}),
  ])assert.equal(miniAgreementHomePage(page([record])),null);
  assert.equal(miniAgreementHomePage(page([agreement(),agreement()])),null);
});
test('M4: invalid pagination and over-sized response fail closed',()=>{
  assert.equal(miniAgreementHomePage(page([],0,{page:1}),0),null);
  assert.equal(miniAgreementHomePage(page([],0,{totalElements:-1})),null);
  assert.equal(miniAgreementHomePage(page([],0,{size:0})),null);
  assert.equal(miniAgreementHomePage(page([],0,{size:100})),null);
  assert.equal(miniAgreementHomePage(page(new Array(21).fill(agreement()))),null);
});
test('M4: valid second page is page-bound and indicates more only when backend reports',()=>{
  const result=miniAgreementHomePage(page([agreement(21)],1,{totalElements:55}),1);
  assert.ok(result);assert.equal(result.page,1);assert.equal(result.hasMore,true);
  assert.equal(miniAgreementHomePage(page([agreement(21)],1,{totalElements:55}),0),null);
});
test('M4: detail is pinned to original Agreement ID and current version; stale fails closed',()=>{
  const original=miniAgreementDetailView(detail(),uuid(1),uuid(601));
  assert.ok(original);assert.equal(original.currentVersion.number,2);
  assert.equal(miniAgreementDetailView(detail(),uuid(2),uuid(601)),null);
  assert.equal(miniAgreementDetailView(detail(),uuid(1),uuid(602)),null);
  assert.equal(miniAgreementDetailView(detail({currentVersion:null}),uuid(1),uuid(601)),null);
});
test('M4: participant statuses come from API but other KS numbers are not projected',()=>{
  const original=miniAgreementDetailView(detail(),uuid(1),uuid(601));
  assert.deepEqual(original.participants.map(p=>p.status),['CONFIRMED','JOINED_UNCONFIRMED']);
  assert.equal(JSON.stringify(original).includes('KS002-SENSITIVE'),false);
  assert.equal(JSON.stringify(original).includes('KS001-SENSITIVE'),false);
});
test('M4: milestones and responsibilities stay separate from Money',()=>{
  const original=miniAgreementDetailView(detail(),uuid(1),uuid(601));
  assert.equal(original.milestones[0].title,'Deliver chairs');
  assert.equal(original.terms[0].description,'40 chairs; 15 currently available');
  assert.equal(original.moneyStatus,'NOT_FUNDED');
  assert.equal(Object.hasOwn(original,'paid'),false);
  assert.equal(Object.hasOwn(original,'releaseFunds'),false);
});
test('M4: malformed detail missing required backing records is rejected',()=>{
  for(const broken of [{...detail(),money:null},{...detail(),terms:null},
    {...detail(),participants:[{roleCode:'SELLER'}]}, 
    {...detail(),milestones:[{title:'Delivery',status:'PENDING'}]},
    {...detail(),overview:{...detail().overview,status:''}}])
    assert.equal(miniAgreementDetailView(broken,uuid(1),uuid(601)),null);
});
test('M4: Mini reads canonical own Agreements only; never creates or mutates from the summary',()=>{
  const root=read('src/mini/MiniFirstPartyKs001.tsx');
  const ui=read('src/mini/MiniMyAgreements.tsx');
  const gateway=read('src/api/securepay/agreements/index.ts');
  assert.match(root,/My Agreements/);assert.match(root,/MiniMyAgreements/);
  assert.match(root,/ensureFreshSession\(session,auth\)/);
  assert.match(ui,/gateway\.currentUserAgreements\(nextPage,20\)/);
  assert.match(ui,/gateway\.detail\(item\.id\)/);
  assert.match(ui,/miniAgreementDetailView\(result,item\.id,item\.versionId\)/);
  assert.match(gateway,/currentUserAgreements:.*auth: 'required'/);
  assert.match(gateway,/detail:.*auth: 'required'/);
  assert.doesNotMatch(ui,/createAgreement\(|issueInvitation\(|acceptAgreement\(|releaseFunds\(|startPayment\(|paymentIntent\(/);
});
test('M4: explicit distinctions are retained across Mini history and Agreement',()=>{
  const ui=read('src/mini/MiniMyAgreements.tsx');
  assert.match(ui,/Unfinished conversations remain under My saved work/);
  assert.match(ui,/This does not prove that the Agreement has no outstanding work/);
  assert.match(ui,/does not verify a provider payment or release funds/);
  assert.match(ui,/Nothing has been changed/);
  assert.match(ui,/onReauthenticate/);
});
