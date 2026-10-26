import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const active=read('src/features/living-workspace/AgreementDiscovery.tsx');
const activeWork=read('src/features/living-workspace/ActiveAgreementWorkspace.tsx');
const statement=read('src/features/living-workspace/AgreementStatementEvidence.tsx');
const api=read('src/api/securepay/agreements/index.ts');
const preflight=read('scripts/day1-gate-d-certify.mjs');

test('D09 written evidence belongs to a real current Agreement obligation; no fabricated acceptance',()=>{
 assert.match(activeWork,/data-gate-b-active-agreement/);
 assert.match(activeWork,/myNextActions\(agreementId\)/);
 assert.match(active,/<AgreementStatementEvidence/);
 assert.match(statement,/data-gate-d-authorised-statement-evidence/);
 assert.match(statement,/gateway\.obligations\(agreementId\)/);
 assert.match(statement,/o\.agreementVersionId===versionId/);
 assert.match(statement,/expectedAgreementVersionId:versionId/);
 assert.match(statement,/expectedObligationVersion:current\.stateVersion/);
 assert.match(statement,/idempotencyKey:crypto\.randomUUID\(\)/);
 assert.match(statement,/evidenceType:'TEXT_STATEMENT'/);
 assert.match(statement,/Retry exact submission/);
 assert.match(statement,/gateway\.obligationEvidence\(agreementId,request\.obligationId\)/);
 assert.match(statement,/data-gate-d-statement-evidence-status/);
 assert.match(statement,/item\.reviewState/);
 assert.doesNotMatch(statement,/releaseMoney|authoriseRelease|completeObligation\(/);
});

test('D16 private media requires approved staging and cannot impersonate canonical Agreement evidence',()=>{
 assert.match(api,/submitVerifiedMediaEvidence:/);
 assert.match(active,/mediaStagingReady && gateways\?\.media/);
 assert.match(active,/<AgreementMediaEvidence gateway=\{gateways\.media\}/);
 assert.match(preflight,/source\('D16'/);
 assert.match(preflight,/SecurePayAPI issue #345/);
 assert.match(preflight,/staging\('D16-S'/);
 assert.doesNotMatch(active,/releaseMoney\(|authoriseRelease\(/);
 assert.doesNotMatch(statement,/fetch\(.+multipart|FormData\(|readAsDataURL/);
});
test('D09 and D16 code transpile as valid TSX',()=>{
 for(const [file,src] of [['AgreementDiscovery.tsx',active],['AgreementStatementEvidence.tsx',statement]]){
 const d=ts.transpileModule(src,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
 const errs=(d.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
 assert.equal(errs.length,0,file+': '+errs.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join(', '));
 }
});
