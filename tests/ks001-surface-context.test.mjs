import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const guide = await readFile('src/features/experience/Ks001SurfaceGuide.tsx', 'utf8');
const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
const vision = await readFile('src/features/visionboard/VisionBoardExperience.tsx', 'utf8');
const store = await readFile('src/features/store/StoreExperience.tsx', 'utf8');
const agreement = await readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8');

test('surface guide asks for real SecurePay help without exposing internal guardrail doctrine', () => {
  assert.match(guide, /real SecurePay capabilities/i);
  assert.match(guide, /Financial authority still comes from the Money screen/i);
  assert.match(guide, /SecurePay · Trust Project identity KS001/);
  assert.doesNotMatch(guide, /only suggest capabilities it can verify as real and relevant/i);
  assert.doesNotMatch(guide, /never create an Agreement, choose a supplier or move money/i);
});

test('Vision Store and Agreement all provide explicit user-triggered context to the same KS001 controller', () => {
  assert.match(vision, /what real SecurePay products, services or capabilities could help me next/i);
  assert.match(store, /what real SecurePay products, services or capabilities could help me/i);
  assert.match(agreement, /what real SecurePay products, services or capabilities could help next/i);
  assert.match(agent, /void controller\.send\(text\)/);
});

test('surface context remains an explicit request rather than hidden authority', () => {
  assert.doesNotMatch(agent, /auto.*send.*surface/i);
  assert.doesNotMatch(guide, /apply automatically|enable automatically|activate automatically/i);
});
