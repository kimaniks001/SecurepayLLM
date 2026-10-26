import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = file => readFileSync(new URL('../'+file, import.meta.url), 'utf8');
const feature = source('src/features/living-workspace/AgreementMediaEvidence.tsx');
const discovery = source('src/features/living-workspace/AgreementDiscovery.tsx');
const workspace = source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const gateway = source('src/api/securepay/agreements/index.ts');
const http = source('src/api/securepay/http/index.ts');
const preflight = source('scripts/day1-gate-d-certify.mjs');

test('private media is added inside the approved Living Agreement, not a new page', () => {
  assert.match(discovery, /<AgreementMediaEvidence/);
  assert.match(discovery, /mediaStagingReady/);
  assert.match(workspace, /identityStagingReady && import\.meta\.env\.VITE_SECUREPAY_MEDIA_EVIDENCE_STAGING_ENABLED === 'true'/);
  assert.match(feature, /data-gate-d-real-obligation-media-upload/);
  assert.match(feature, /gateway\.obligations\(agreementId\)/);
  assert.match(feature, /o\.agreementId === agreementId && o\.agreementVersionId === versionId/);
});

test('uploads actual file bytes with two explicit authenticated authoritative stages', () => {
  assert.match(gateway, /form\.append\('file', file, file\.name\)/);
  assert.match(gateway, /headers: \{ 'Idempotency-Key': idempotencyKey \}/);
  assert.match(gateway, /submitVerifiedMediaEvidence:/);
  assert.match(feature, /response\.status !== 'VERIFIED_UPLOAD_ONLY'/);
  assert.match(feature, /response\.agreementEvidenceSubmitted !== false/);
  assert.match(feature, /gateway\.submitVerifiedMediaEvidence/);
  assert.match(feature, /caption: progress\.caption/);
  assert.match(feature, /expectedObligationVersion: progress\.obligationVersion/);
  assert.match(feature, /crypto\.randomUUID\(\), submitKey: crypto\.randomUUID\(\)/);
  assert.match(feature, /setPending\(progress\)/);
  assert.match(http, /options\.body instanceof FormData/);
  assert.match(http, /responseKind === 'blob'/);
  assert.doesNotMatch(feature, /releaseMoney|authoriseRelease|completeObligation\(/);
});

test('reviewer is shown real read-back and review states but cannot assume acceptance', () => {
  assert.match(feature, /readVerifiedMedia\(agreementId, obligationId, item\.id\)/);
  assert.match(feature, /item\.reviewState/);
  assert.match(feature, /awaits review/);
  assert.match(preflight, /source\('D16'/);
  assert.match(preflight, /SecurePayAPI issue #345/);
});

test('new media UI and gateway transpile without TS syntax errors', () => {
  for (const [file, code] of [['AgreementMediaEvidence.tsx', feature],['Gateway.ts', gateway],['Http.ts',http]]) {
    const out = ts.transpileModule(code, { fileName: file, reportDiagnostics: true,
      compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX} });
    assert.equal(out.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length ?? 0, 0, file);
  }
});
