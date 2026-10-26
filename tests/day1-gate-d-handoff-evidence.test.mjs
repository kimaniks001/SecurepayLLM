import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const reader=read('src/features/living-workspace/AgreementDiscovery.tsx');
const written=read('src/features/living-workspace/AgreementStatementEvidence.tsx');
const handoff=read('src/features/handoff/controller.ts');
const api=read('src/api/securepay/agreements/index.ts');
test('Gate D: review creates a backend-versioned handoff, not a frontend Agreement',()=>{
 assert.match(shell,/createHandoffController\(gateway\)/);
 assert.match(shell,/handoffController\.start\(liveConversationId,version\)/);
 assert.match(shell,/formationState\?\.data\?\.confirmable/);
 assert.match(shell,/setUpAvailable=\{!!signedIn && !!handoffController && !!handoffIdentity\}/);
 assert.match(shell,/<HandoffPanel handoff=\{handoffController\} identity=\{handoffIdentity\}/);
 assert.match(handoff,/gateway\.createHandoff\(conversationId, actionId/);
 assert.match(handoff,/gateway\.continueHandoff\(handoffId, snapshot\)/);
 assert.match(handoff,/phase: 'progress-uncertain'/);
 assert.doesNotMatch(shell,/mockAgreementId|localAgreementCreated/);
});
test('Gate D: established Agreements open by confirmed ID and re-authorize with the API',()=>{
 assert.match(shell,/onOpenAgreement=\{id=>\{setCreatedAgreementId\(id\)/);
 assert.match(shell,/openAgreementId=\{createdAgreementId\}/);
 assert.match(reader,/openAgreementId===requestedDetail/);
 assert.match(reader,/gateways\.agreements\.detail\(requestedDetail\)/);
 assert.match(reader,/onAgreementClosed\?\.\(\)/);
 assert.match(reader,/detail\.owner===identity/);
});
test('Gate D: statement evidence is version- and obligation-specific with a stable retry key',()=>{
 assert.match(written,/expectedAgreementVersionId:versionId/);
 assert.match(written,/expectedObligationVersion:current\.stateVersion/);
 assert.match(written,/idempotencyKey:crypto\.randomUUID\(\)/);
 assert.match(written,/evidenceType:'TEXT_STATEMENT'/);
 assert.match(written,/gateway\.submitEvidence\(agreementId,request\.obligationId/);
 assert.match(written,/setPending\(request\)/);
 assert.match(written,/void send\(pending\)/);
 assert.match(reader,/<AgreementStatementEvidence gateway=\{gateways\.agreements\} auth=\{gateways\.auth\}/);
 assert.match(api,/There is no upload or retrieval API/);
 assert.doesNotMatch(written,/URL\.createObjectURL|accept=['"]image|FormData|input type="file"/);
 assert.match(written,/has not completed the obligation or released Money/);
});
test('Gate D: modified TypeScript and TSX compiles syntactically',()=>{
 for(const [filename,source] of [['Phase1LivingWorkspacePreview.tsx',shell],['AgreementDiscovery.tsx',reader],['AgreementStatementEvidence.tsx',written]]){
  const result=ts.transpileModule(source,{fileName:filename,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  const errors=(result.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,filename+': '+errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join(', '));
 }
});
