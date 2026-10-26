import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const overlay=read('src/features/living-workspace/WorkspaceIdentityOverlay.tsx');
const runtime=read('src/RuntimeApp.tsx');
const signup=read('src/features/signup/controller.ts');
const welcome=read('src/features/join/SignupIssuedWelcome.tsx');
const preflight=read('scripts/day1-gate-d-certify.mjs');

test('Gate D: preview root and explicit identity deep-links retain the masterpiece',()=>{
 assert.match(runtime,/isCandidateWorkspaceEntry/);
 assert.match(runtime,/hash==='' \|\| hash==='#' \|\| hash==='#\/'/);
 assert.match(runtime,/sign-\(\?:in\|up\)/);
 assert.match(runtime,/if \(phase1Preview\) return <Phase1LivingWorkspacePreview/);
 assert.match(runtime,/identityStagingReady=\{identityStagingReady\}/);
 assert.match(shell,/data-workspace-shell/);
 assert.match(shell,/data-workspace-frozen-layout/);
 assert.match(shell,/data-gate-d-get-ks-number/);
 assert.match(shell,/data-gate-d-workspace-identity/);
 assert.doesNotMatch(shell,/window\.location\.hash='#\/sign-up'/);
});
test('Gate D: identity stays over mounted KS001/chat/tools/result',()=>{
 assert.match(shell,/<WorkspaceIdentityOverlay/);
 assert.match(shell,/<LiveKs001Session controller=\{liveController!\}/);
 assert.match(shell,/data-tool-rail/);
 assert.match(shell,/aria-label="Living result"/);
 assert.match(shell,/data-gate-d-no-loss-guest-proposals/);
 assert.match(shell,/prepareLocalNoteForKs001/);
 assert.match(shell,/if\(readDraft\(id\)\.trim\(\)\)throw/);
 assert.match(shell,/writeDraft\(id,text\)/);
 assert.match(overlay,/<SignupForm/);
 assert.match(overlay,/<SignInExperience/);
 assert.match(overlay,/<SignupIssuedWelcome/);
 assert.match(overlay,/onIssued=\{ksNumber=>\{setIssuedKsNumber\(ksNumber\);setStage\('welcome'\);\}\}/);
 assert.match(overlay,/onContinue=\{complete\}/);
 assert.doesNotMatch(overlay,/createSignupController|createIdentityController|session\.setTokens|new Agreement|acceptAgreement\(/);
 assert.match(signup,/issuedKsNumber: completed\.ksNumber/);
 assert.match(welcome,/data-gate-c-issued-number/);
});
test('Gate D: public preview does not collect identity credentials without isolated staging',()=>{
 assert.match(runtime,/host\.endsWith\('\.securepay\.ke'\)/);
 assert.match(runtime,/staging\|sandbox\|qa\|test/);
 assert.match(overlay,/identityStagingReady \? <SignInExperience/);
 assert.match(overlay,/data-gate-d-identity-staging-hold/);
 assert.match(overlay,/data-gate-d-signup-staging-hold/);
 assert.match(overlay,/identityStagingReady \? <SignInExperience/);
 assert.doesNotMatch(overlay,/localStorage|sessionStorage|new XMLHttpRequest/);
});
test('Gate D: source preflight refuses to label missing handoffs as certified',()=>{
 assert.match(preflight,/source\('D05'/);
 assert.match(preflight,/source\('D07'/);
 assert.match(preflight,/source\('D09'/);
 assert.match(preflight,/staging\('D12'/);
 assert.match(preflight,/staging\('D14'/);
 assert.match(preflight,/process\.exitCode=1/);
});
test('Gate D: changed source transpiles as valid TypeScript/TSX',()=>{
 for(const [p,src] of [['shell.tsx',shell],['overlay.tsx',overlay],['runtime.tsx',runtime]]){
  const result=ts.transpileModule(src,{fileName:p,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  const errs=(result.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errs.length,0,p+': '+errs.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join(', '));
 }
});
