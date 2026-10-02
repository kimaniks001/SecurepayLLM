import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const dto = fs.readFileSync(new URL('../src/api/securepay/community/dto.ts', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/community/index.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');

test('Community project next steps are prepared explicitly, never auto-created', () => {
  assert.match(gateway, /prepareProject/);
  assert.match(experience, /\['AGREEMENT','STORE','PLUG','MASTER'\] as const/);
  assert.match(experience, /transitions\.prepareProject\(item\.id,target\)/);
  assert.match(experience, /Nothing was created or committed yet/);
});

test('project lessons remain candidates until Knowledge governance approves them', () => {
  assert.match(dto, /CommunityKnowledgeCandidateDto/);
  assert.match(gateway, /knowledge-candidates/);
  assert.match(experience, /Knowledge review candidate/);
  assert.match(experience, /not approved SecurePay knowledge/);
  assert.match(experience, /not approved Knowledge Core truth yet/);
});
