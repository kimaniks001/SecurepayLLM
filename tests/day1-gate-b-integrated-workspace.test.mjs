import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const vision=read('src/features/living-workspace/VisionFinancialPossibilities.tsx');
const builder=read('src/features/visionboard/dreams/DreamBuilder.tsx');
const tool=read('src/features/living-workspace/UnifiedMoneyTool.tsx');
const rail=read('src/features/living-workspace/settlementRailFamily.ts');
const money=read('src/features/money/MoneyPaymentSettlementJourney.tsx');
const active=read('src/features/living-workspace/ActiveAgreementWorkspace.tsx');
const discovery=read('src/features/living-workspace/AgreementDiscovery.tsx');
const agreed=read('src/features/formation/AgreementReview.tsx');

test('Gate B: existing masterpiece shell hosts Dream and active Agreement; same KS001 chat is retained',()=>{
 assert.match(shell,/data-workspace-frozen-layout/);
 assert.match(shell,/data-tool-rail/);
 assert.match(shell,/data-gate-b-vision-inside-masterpiece/);
 assert.match(shell,/data-workspace-shell/);
 assert.match(shell,/<InlineVisionEditor key=\{editingDreamId\}/);
 assert.match(shell,/<ActiveAgreementWorkspace key=\{openedAgreementId\}/);
 assert.match(shell,/<LiveKs001Session controller=\{liveController!\}/);
 assert.match(shell,/onOpenInWorkspace=\{id=>/);
 assert.match(discovery,/onOpenInWorkspace\?onOpenInWorkspace\(current.agreementId\)/);
 assert.match(agreed,/setUpAvailable=?.*true/);
});

test('Gate B: My Work and Vision Money are distinct; no executable Vision rail',()=>{
 assert.match(shell,/context=\{mode==='vision'\?'vision':'work'\}/);
 assert.match(shell,/\['Photos','Documents','Places','Stores','Money'\]/);
 assert.match(tool,/if\(context==='vision'\)return <VisionFinancialPossibilities\/>/);
 assert.match(tool,/doors\.filter\(item=>item.id==='my'\)/);
 assert.match(vision,/No live rates, banks, MMFs, SACCO offerings/);
 assert.match(vision,/onAddToVision\?:\(note:string\)=>void/);
 assert.doesNotMatch(vision,/createPaymentIntent|initiatePayment|sendMoney|connectBank\(/);
 assert.match(builder,/onAddToVision=\{!dream\.locked/);
 assert.match(builder,/saveBoard\(dream\.dreamId/);
 assert.match(builder,/expectedRevision: revision/);
 assert.match(builder,/Adding a possibility edits this board only/);
});

test('Gate B: grouped rails preserve backend authority and never invent eligibility, fee or amount ceilings',()=>{
 const code=ts.transpileModule(rail,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};runInNewContext(code,{exports});
 const {settlementFamily:family,groupedSettlementOptions:group}=exports;
 assert.equal(family({railCode:'MPESA_STK',displayName:'M-PESA'}),'mobile');
 assert.equal(family({railCode:'PESALINK',displayName:'PesaLink'}),'bank');
 assert.equal(family({railCode:'BANK_TRANSFER',displayName:'Bank transfer'}),'bank');
 assert.equal(family({railCode:'UNLISTED_PROVIDER',displayName:'Other'}),'other');
 const options=[
   {railCode:'MPESA_STK',displayName:'M-PESA'},
   {railCode:'UNLISTED_PROVIDER',displayName:'Other'},
   {railCode:'PESALINK',displayName:'PesaLink'},
 ];
 assert.equal(group(options).map(x=>x.railCode).join(','),'PESALINK,MPESA_STK,UNLISTED_PROVIDER');
 assert.equal(options[0].railCode,'MPESA_STK','Source list remains untouched');
 assert.match(money,/visibleFundingOptions=groupedSettlementOptions\(/);
 assert.match(money,/data-gate-b-rail-family/);
 assert.match(money,/rail\.minimumAmountMinor/);
 assert.match(money,/rail\.maximumAmountMinor/);
 assert.match(money,/rail\.quoteAvailable/);
});

test('Gate B: task-first Agreement reads same identity and exact version; evidence not an upload',()=>{
 assert.match(active,/gateways\.agreements\.myNextActions\(agreementId\)/);
 assert.match(active,/gateways\.agreements\.detail\(agreementId\)/);
 assert.match(active,/gateways\.agreements\.obligations\(agreementId\)/);
 assert.match(active,/a\.currentAgreementVersionId===exact/);
 assert.match(active,/validEvidence/);
 assert.match(active,/expectedAgreementVersionId:attempt\.agreementVersionId/);
 assert.match(active,/expectedObligationVersion:attempt\.stateVersion/);
 assert.match(active,/evidenceType:'TEXT_STATEMENT'/);
 assert.match(active,/setUncertain\(true\)/);
 assert.match(active,/No photo submitted here/);
 assert.doesNotMatch(active,/uploadPhoto|uploadFile|uploadEvidence/);
 assert.match(shell,/writeDraft\(started\.conversationId/);
 assert.match(shell,/authorisedResumedConversation\(started\.conversationId/);
});
test('Gate B TSX additions transpile without syntax errors',()=>{
 const files=[
  'src/features/living-workspace/VisionFinancialPossibilities.tsx',
  'src/features/living-workspace/ActiveAgreementWorkspace.tsx',
  'src/features/living-workspace/Phase1LivingWorkspacePreview.tsx',
  'src/features/living-workspace/UnifiedMoneyTool.tsx',
  'src/features/visionboard/dreams/DreamBuilder.tsx',
  'src/features/money/MoneyPaymentSettlementJourney.tsx',
 ];
 for(const path of files){
  const result=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
  assert.equal((result.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,path);
 }
});
