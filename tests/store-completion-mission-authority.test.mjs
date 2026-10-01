import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const dto = fs.readFileSync(new URL('../src/api/securepay/marketnetwork/dto.ts', import.meta.url), 'utf8');
const management = fs.readFileSync(new URL('../src/components/StoreManagementHome.tsx', import.meta.url), 'utf8');

test('mission UI carries explicit authority requirement', () => {
  assert.match(dto, /ORDINARY_PLUG/);
  assert.match(dto, /VERIFIED_PROFESSIONAL/);
  assert.match(dto, /MASTER_JUDGEMENT/);
  assert.match(dto, /authorityRequirement/);
  assert.match(management, /Authority:/);
});
