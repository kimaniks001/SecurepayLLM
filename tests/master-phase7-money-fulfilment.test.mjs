import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const bundle=await build({entryPoints:['src/features/living-workspace/moneyReviewTruth.ts'],bundle:true,
  write:false,platform:'node',format:'esm'});
const {verifyMoneyReviewSnapshot,readableMoneyReason}=await import('data:text/javascript;base64,'+
  Buffer.from(bundle.outputFiles[0].text).toString('base64'));

function backendSnapshot(overrides={}){
  return {
    agreementId:'agreement-one',currentVersionId:'version-7',
    positions:[{
      agreementId:'agreement-one',obligationId:'deliver-chairs',obligationTitle:'Deliver chairs',
      authorisedMaxAmountMinor:4500000,fundedTotalMinor:4500000,
      exercisedOrSettledMinor:0,releasedTotalMinor:0,remainingFundedMinor:4500000,
      currency:'KES',established:true,providerSettlementCertified:false,
    }],
    paymentReady:{state:'EVALUATED',ready:false,outstandingReasons:[
      {gateCode:'DELIVERY',reasonCode:'ACCEPTANCE_MISSING'},
    ]},
    fundingOptions:[{railCode:'M_PESA',displayName:'M-PESA',currency:'KES',quoteAvailable:true}],
    feeQuoteRequestsPermitted:false,
    releaseRequest:{authorityGranted:false,participantCommandsPermitted:false,reasonCode:'NOT_AUTHORISED'},
    movement:{state:'BLOCKED',reasonCode:'RELEASE_AUTHORITY_BLOCKED',amountMinor:null,
      currency:null,evaluationId:null,economics:null},
    ...overrides,
  };
}
test('correct Agreement/version can display individual backend positions, not authorise movement',()=>{
  const truth=verifyMoneyReviewSnapshot('agreement-one','version-7',backendSnapshot());
  assert.equal(truth.kind,'ready');
  assert.equal(truth.canMove,false);
  assert.equal(truth.canQuote,false);
  assert.equal(truth.snapshot.positions[0].fundedTotalMinor,4500000);
});
test('wrong Agreement ID or stale current version hides all amounts',()=>{
  for(const [id,v] of [['other-agreement','version-7'],['agreement-one','version-6']]){
    const value=verifyMoneyReviewSnapshot(id,v,backendSnapshot());
    assert.equal(value.kind,'unavailable');
    assert.equal('snapshot' in value,false);
  }
});
test('duplicate obligation, cross-agreement position and invalid money values fail closed',()=>{
  const base=backendSnapshot();
  for(const positions of [
    [...base.positions,base.positions[0]],
    [{...base.positions[0],agreementId:'somebody-else'}],
    [{...base.positions[0],fundedTotalMinor:-1}],
    [{...base.positions[0],releasedTotalMinor:1.25}],
    [{...base.positions[0],obligationId:null}],
  ]){
    const truth=verifyMoneyReviewSnapshot('agreement-one','version-7',backendSnapshot({positions}));
    assert.equal(truth.kind,'unavailable');
  }
});
test('backend READY without valid evaluation/economics cannot become movable in the UI',()=>{
  const ready={state:'READY',reasonCode:'NONE',amountMinor:4500000,currency:'KES',
    evaluationId:null,economics:null};
  const failed=verifyMoneyReviewSnapshot('agreement-one','version-7',backendSnapshot({movement:ready}));
  assert.equal(failed.kind,'ready');
  assert.equal(failed.canMove,false);
  const valid=verifyMoneyReviewSnapshot('agreement-one','version-7',backendSnapshot({
    movement:{...ready,evaluationId:'evaluation-7',economics:{pricingVersion:'policy-12'}},
  }));
  assert.equal(valid.canMove,true);
});
test('rail cards never grant quote permission and movement state is distinct',()=>{
  const q=verifyMoneyReviewSnapshot('agreement-one','version-7',backendSnapshot({
    feeQuoteRequestsPermitted:true,
    movement:{state:'BLOCKED',reasonCode:'ENVIRONMENT_DISABLED',amountMinor:null,currency:null,economics:null},
  }));
  assert.equal(q.canQuote,true);
  assert.equal(q.canMove,false);
  assert.match(readableMoneyReason('ENVIRONMENT_DISABLED'),/disabled/);
});
test('one controlled Money shelf, authoritative snapshot, seven labelled demonstrations, no provider operations',()=>{
  const tool=readFileSync('src/features/living-workspace/UnifiedMoneyTool.tsx','utf8');
  const experience=readFileSync('src/features/living-workspace/Phase7MoneyJourney.tsx','utf8');
  const workspace=readFileSync('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx','utf8');
  const gateway=readFileSync('src/api/securepay/money-snapshot/index.ts','utf8');
  assert.match(tool,/Phase7MoneyJourneyPreview/);
  assert.match(tool,/gateway=\{gateways\?\.moneySnapshot\}/);
  assert.match(tool,/Phase7MoneySnapshotReview/);
  for(const journey of ['Purchase','Delivery','Milestones','Chama','Community Saver','Dispute','Uncertain payment'])
    assert.match(experience,new RegExp("name:'"+journey+"'"));
  assert.match(experience,/Interactive sample only/);
  assert.match(experience,/No real Agreement, provider/);
  assert.match(experience,/gateway\.read\(agreement\.agreementId\)/);
  assert.doesNotMatch(experience,/\.initiate\(|createPaymentIntent\(|\.release\(|\.redeem\(|createVersionBoundQuote\(/);
  assert.match(workspace,/activeTool==='Money'\?<UnifiedMoneyTool/);
  assert.match(workspace,/openMoneyFor\(/);
  assert.match(gateway,/auth: 'required'/);
});
