import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const transport = source('src/features/living-workspace/previewWorkspaceGateways.ts');
const screen = source('src/features/living-workspace/AgreementDiscovery.tsx');
const relay = source('api/preview-workspace.js');

test('Gate D media does not tunnel private bytes through the existing JSON-only Vercel proxy', () => {
  assert.match(relay, /JSON request required/);
  assert.match(relay, /MAX_REQUEST_BYTES = 16 \* 1024/);
  assert.match(transport, /createStagingEvidenceGateway/);
  assert.match(transport, /createHttpClient\(origin, getAccessToken, stagingFetch\)/);
  assert.match(transport, /return fetch\(url.href, \{ \.\.\.init, credentials: 'omit'/);
  assert.match(screen, /<AgreementMediaEvidence gateway=\{gateways\.media\}/);
  assert.doesNotMatch(screen, /<AgreementMediaEvidence gateway=\{gateways\.agreements\}/);
});

test('staging media transport is strict, production denied, and evidence feature is opt-in', () => {
  assert.match(transport, /if \(origin === 'https:\/\/securepay\.ke'\) return null/);
  assert.match(transport, /url\.origin === origin/);
  assert.match(transport, /permittedGet\.test\(url\.pathname\)/);
  assert.match(transport, /permittedPost\.test\(url\.pathname\)/);
  assert.match(transport, /url\.search === ''/);
  assert.match(transport, /createAgreementGateway\(createHttpClient\(origin, getAccessToken, stagingFetch\)\)/);
  assert.match(screen, /mediaStagingReady && gateways\?\.media/);
  assert.match(screen, /Private media needs the isolated, verified API staging integration first/);
});

test('staging media TypeScript module transpiles cleanly', () => {
  const converted = ts.transpileModule(transport, {
    fileName: 'previewWorkspaceGateways.ts',
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  const errors = converted.diagnostics?.filter(x => x.category === ts.DiagnosticCategory.Error) || [];
  assert.equal(errors.length, 0, errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, ' ')).join(', '));
});
