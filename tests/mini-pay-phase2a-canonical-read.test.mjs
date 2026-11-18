import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {miniAgreementHomePage,miniAgreementDetailView} from '../src/mini/miniAgreementHome.mjs';
import {miniMoneySnapshotProof} from '../src/mini/miniMoneySnapshotProof.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const first=read('src/mini/MiniFirstPartyKs001.tsx');
const list=read('src/mini/MiniMyAgreements.tsx');
const money=read('src/mini/MiniMoneySnapshot.tsx');

const summary={
 agreementId:'a1',currentAgreementVersionId:'v1',status:'ACTIVE',title:'Monthly LPG',
 currentActor:{roleCode:'PARTICIPANT',participantStatus:'JOINED'},
 attentionRequired:true, nextActions:[{actionCode:'REVIEW',reason:'Review renewed delivery terms',
 deadline:'2026-12-01T10:00:00+03:00'}],nextDeadline:'2026-12-01T10:00:00+03:00',
 proposedAmountMinor:'300000', currency:'KES'
};
const listReply={items:[summary],page:0,size:20,totalElements:1};

test('P2A begins with authenticated owner Agreement list, not browser amounts or new payment API',()=>{
 assert.ok(first.includes('startInPayments'));
 assert.ok(first.includes('paymentFocus={startInPayments&&!demo}'));
 assert.ok(first.includes('<MiniMyAgreements gateway={agreements}'));
 assert.ok(list.includes('gateway.currentUserAgreements(nextPage,20)'));
 assert.ok(list.includes('gateway.detail(item.id)'));
 assert.ok(list.includes('miniAgreementDetailView(result,item.id,item.versionId)'));
});
test('payment focus reads existing server Money evidence but never enables quotes or commands',()=>{
 assert.ok(list.includes('(liveMoneyStatus||paymentFocus)&&details.currentVersion'));
 assert.ok(list.includes('quoteReviewEnabled={!paymentFocus&&liveFeeQuotes}'));
 assert.ok(list.includes('paymentCommandsEnabled={!paymentFocus&&livePaymentCommands}'));
 assert.ok(list.includes('<MiniMoneySnapshot'));
 assert.ok(money.includes('money.read(agreementId)'));
 assert.ok(money.includes('payments.listIntents(agreementId,0,10)'));
 assert.ok(money.includes('miniMoneySnapshotProof'));
 assert.ok(list.includes('!paymentFocus&&liveQuotes&&<MiniQuoteBuyer'));
});
test('the Agreement list never treats proposed contract money or deadlines as payable balance',()=>{
 const page=miniAgreementHomePage(listReply,0);
 assert.ok(page);
 assert.equal(page.items.length,1);
 assert.equal(page.items[0].title,'Monthly LPG');
 assert.equal(page.items[0].attentionRequired,true);
 assert.equal(page.items[0].nextDeadline,'2026-12-01T10:00:00+03:00');
 assert.equal('proposedAmountMinor' in page.items[0],false);
 assert.equal('balance' in page.items[0],false);
 assert.ok(list.includes('an Agreement amount is not an unpaid balance'));
 assert.ok(list.includes('not necessarily payment'));
});
test('a changed Agreement version fails closed instead of showing stale Money evidence',()=>{
 const detail={overview:{agreementId:'a1',status:'ACTIVE',title:'Monthly LPG'},
 currentVersion:{versionId:'v2',versionNumber:2}, participants:[],milestones:[],terms:[],
 activity:[],versionHistory:[],money:{status:'UNKNOWN'}};
 assert.equal(miniAgreementDetailView(detail,'a1','v1'),null);
 assert.ok(miniAgreementDetailView({...detail,currentVersion:{versionId:'v1',versionNumber:1}},'a1','v1'));
 const snapshot={agreementId:'a1',currentVersionId:'v2',positions:[],fundingOptions:[],
 paymentReady:{state:'NOT_EVALUATED',ready:null},movement:{state:'UNAVAILABLE',amountMinor:null},
 releaseRequest:{participantCommandsPermitted:false,authorityGranted:false},
 feeQuoteRequestsPermitted:false};
 assert.equal(miniMoneySnapshotProof(snapshot,'a1','v1'),false);
 assert.equal(miniMoneySnapshotProof({...snapshot,currentVersionId:'v1'},'a1','v1'),true);
});
test('the pay-focused view retains safe missing-history and unknown-state language',()=>{
 assert.ok(list.includes('could not be verified'));
 assert.ok(money.includes('Do not retry an unknown attempt'));
 assert.ok(money.includes('No amount, route or payment status can be assumed'));
 assert.ok(first.includes('onBack={startInPayments?onBack:()=>setAgreementsOpen(false)}'));
});
