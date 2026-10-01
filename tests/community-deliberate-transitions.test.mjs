import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/community/index.ts', import.meta.url), 'utf8');
const dto = fs.readFileSync(new URL('../src/api/securepay/community/dto.ts', import.meta.url), 'utf8');
const detail = fs.readFileSync(new URL('../src/components/CommunityObjectDetail.tsx', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');

test('Community transitions use the backend-owned deliberate transition boundary', () => {
  assert.match(gateway, /objectToVision/);
  assert.match(gateway, /projectToVision/);
  assert.match(gateway, /prepareObject/);
  assert.match(gateway, /prepareProject/);
  assert.match(dto, /CommunityTransitionIntentDto/);
});

test('Community object and project only navigate to Vision after backend transition succeeds', () => {
  assert.match(detail, /Add to Vision/);
  assert.match(experience, /transitions\.objectToVision/);
  assert.match(experience, /transitions\.projectToVision/);
  assert.match(experience, /\.then\(\(\) => onNavigate\('vision-board'\)\)/);
});
