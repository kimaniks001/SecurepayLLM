import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const truth=src('src/features/living-workspace/executionTruth.ts');
const work=src('src/features/living-workspace/AgreementWorkProgress.tsx');
const media=src('src/features/living-workspace/AgreementMediaEvidenceTool.tsx');
const agreement=src('src/features/living-workspace/ActiveAgreementWorkspace.tsx');
const circle=src('src/features/living-workspace/InlineCircleBoard.tsx');
const shell=src('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const gateway=src('src/features/living-workspace/previewWorkspaceGateways.ts');
const js=ts.transpileModule(truth,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,
}}).outputText;
const {describeExecutionTruth,describeMoneyTruth}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));

test('Gate 5: completion is a separate authorised action; no evidence status implies completion',()=>{
  assert.match(describeExecutionTruth(null).title,/not verified/i);
  assert.match(describeExecutionTruth({eligible:true,currentStatus:'IN_PROGRESS',unmetRequirements:[],
    satisfiedRequirements:['evidence-approved'],evidenceIds:['x'],explanationCodes:[]}).detail,/not yet a completed obligation/i);
  assert.match(describeExecutionTruth({eligible:false,currentStatus:'OPEN',unmetRequirements:['BENEFICIARY_REVIEW'],
    satisfiedRequirements:[],evidenceIds:['x'],explanationCodes:[]}).title,/remain open/i);
});
test('Gate 5: Money movement is never inferred from PaymentReady alone',()=>{
  const snapshot={
    paymentReady:{state:'EVALUATED',ready:true},
    movement:{state:'BLOCKED',reasonCode:'NO_AUTHORITY'},
    releaseRequest:{authorityGranted:false},
  };
  assert.match(describeMoneyTruth(null).title,/has not been checked/i);
  assert.match(describeMoneyTruth({...snapshot,paymentReady:{state:'NOT_EVALUATED',ready:null}}).title,/not confirmed/i);
  assert.match(describeMoneyTruth(snapshot).title,/movement not authorised/i);
  assert.match(describeMoneyTruth({...snapshot,movement:{state:'READY'}}).detail,/separate authorised/i);
});
test('Gate 5: only exact Agreement and current-version obligations can display detailed evidence',()=>{
  assert.match(work,/item\.agreementId===agreementId && item\.agreementVersionId===versionId/);
  assert.match(work,/gateways\.agreements\.obligationEvidence\(agreementId,focused\.id\)/);
  assert.match(work,/gateways\.agreements\.obligationCompletionStatus\(agreementId,focused\.id\)/);
  assert.match(work,/item\.obligationId!==focused\.id/);
  assert.match(work,/session\.getSnapshot\(\)\.status!=='signed-in'/);
  assert.match(work,/Circle checkpoints coordinate people, but they cannot change these records/);
  assert.doesNotMatch(work,/completeObligation\(|reviewEvidence\(|releaseMoney\(/);
});
test('Gate 5: private Circle work stays coordination-only and opens personal My Work',()=>{
  assert.match(circle,/gateways\.community\.circles\.membership\(id\)/);
  assert.match(circle,/scope\.member\.isOwner/);
  assert.match(circle,/data-gate5-circle-execution/);
  assert.match(circle,/onOpenMyWork/);
  assert.match(circle,/The Circle does not disclose anyone else’s private Agreement/);
  assert.match(shell,/onOpenMyWork=\{\(\)=>\{setWorkingCircleId\(null\);chooseMode\('work'\);\}\}/);
  assert.doesNotMatch(circle,/gateways\.agreements\.detail|fundAgreement|approveEvidence|executeMoney/);
});
test('Gate 5: verified upload is NOT evidence until explicit second authorised command',()=>{
  assert.match(media,/media\.uploadVerifiedMedia\(/);
  assert.match(media,/result\.status!=='VERIFIED_UPLOAD_ONLY'/);
  assert.match(media,/result\.agreementEvidenceSubmitted!==false/);
  assert.match(media,/phase==='uploaded'/);
  assert.match(media,/media\.submitVerifiedMediaEvidence\(/);
  assert.match(media,/Retry same upload/);
  assert.match(media,/Retry same evidence submission/);
  assert.match(media,/receiptId:receipt\.receiptId,idempotencyKey:submitKey/);
  assert.match(media,/expectedAgreementVersionId:versionId,expectedObligationVersion:obligation\.stateVersion/);
  assert.match(media,/No obligation or Money has been completed/);
  assert.doesNotMatch(media,/window\.location|localStorage|autoApprove|releaseMoney|completeObligation/);
});
test('Gate 5: actual media transport is isolated to approved staging and explicit Agreement context',()=>{
  assert.match(gateway,/if \(origin === 'https:\/\/securepay\.ke'\) return null/);
  assert.match(gateway,/allowed = url\.origin === origin/);
  assert.match(gateway,/evidence-media\|verified-media-evidence/);
  assert.match(agreement,/gateways\.media&&/);
  assert.match(agreement,/<AgreementMediaEvidenceTool/);
  assert.match(agreement,/<AgreementWorkProgress/);
  assert.match(agreement,/describeMoneyTruth\(moneySnapshot\)/);
  assert.match(agreement,/moneySnapshot\.releaseRequest\.authorityGranted/);
  assert.match(agreement,/The rail choice is a preference/);
});
