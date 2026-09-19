import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const masterController = await readFile('src/features/master/controller.ts', 'utf8');
const masterExperience = await readFile('src/features/master/MasterExperience.tsx', 'utf8');
const plugController = await readFile('src/features/plug/controller.ts', 'utf8');
const plugExperience = await readFile('src/features/plug/PlugExperience.tsx', 'utf8');
const agentExperience = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
const workspaceExperience = await readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8');

test('PR11 review closure: Master opinion re-reads authoritative request state', () => {
  assert.match(masterController, /await gateway\.submitOpinion\(requestId, body\)/);
  assert.match(masterController, /await gateway\.request\(requestId\)/);
  assert.doesNotMatch(masterController, /status:\s*['"]OPINION_SUBMITTED['"]/);
});

test('PR11 review closure: assigned Master requests are reachable by request reference', () => {
  assert.match(masterExperience, /requestLookupInput/);
  assert.match(masterExperience, /controller\.loadRequest\(requestId\)/);
  assert.match(masterExperience, /Open assigned request/);
});

test('PR11 review closure: Master create errors do not force navigation to request detail', () => {
  // The implementation was later refactored from a single "if (ok) setView(...)" line to an
  // early-return guard ("if (!ok) return;" ... "setView('request-detail')") so it could also
  // capture the newly-created request's own id for the lookup field on success -- the doctrine
  // this test protects (a failed submit never navigates to request-detail) is unchanged; only the
  // exact code shape asserting it needed updating.
  assert.match(masterExperience, /controller\.submitRequest\(\)\.then\(ok\s*=>\s*\{\s*if\s*\(!ok\)\s*return;[\s\S]*?setView\(['"]request-detail['"]\)/);
});

test('PR11 review closure: Plug market request retries retain one logical idempotency key', () => {
  assert.match(plugController, /pendingMarketRequest/);
  assert.match(plugController, /state\.request\.status === ['"]loading['"]/);
  assert.match(plugController, /pendingMarketRequest\.idempotencyKey/);
});

test('PR11 review closure: Plug relationship opens only after confirmed selection and errors are surfaced', () => {
  assert.match(plugExperience, /const selected = await controller\.confirmSelection\(requestId\)/);
  assert.match(plugExperience, /if \(selected\) await controller\.openRelationship\(requestId\)/);
  assert.match(plugExperience, /state\.selection\.status === ['"]error['"]/);
  assert.match(plugExperience, /state\.relationship\.status === ['"]error['"]/);
});

test('PR11 review closure: Agreement-scoped Plug help restores the exact Agreement through authoritative Hub state', () => {
  assert.match(agentExperience, /workspaceAgreementId/);
  assert.match(agentExperience, /returningAgreementId = view === ['"]agreement-detail['"] \? ecosystemAgreementId : null/);
  assert.match(agentExperience, /initialAgreementId=\{workspaceAgreementId\}/);
  assert.match(workspaceExperience, /initialAgreementId/);
  assert.match(workspaceExperience, /state\.hub\.status !== ['"]ready['"]/);
  assert.match(workspaceExperience, /controller\.openFromHome\(initialAgreementId\)/);
});
