import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const has = path => existsSync(new URL('../' + path, import.meta.url));

test('Day 11 uses one source of Agreement Commerce language', () => {
  const c = read('src/features/agreement-commerce/experienceContract.ts');
  const store = read('src/components/StoreManagementHome.tsx');
  const mini = has('src/mini/MiniRealStoreOffer.tsx') ? read('src/mini/MiniRealStoreOffer.tsx') : null;
  const ks = read('src/features/experience/Ks001SurfaceGuide.tsx');
  assert.match(c, /Agree · Deliver · Grow/);
  assert.match(store, /CommunitySaverConsentPreview/);
  if (has('src/features/store/StoreMasterpieceLayoutReview.tsx')) assert.match(read('src/features/store/StoreMasterpieceLayoutReview.tsx'), /CommunitySaverConsentPreview/);
  if (mini) assert.match(mini, /COMMERCE_EXPERIENCE\.sourceOnly/);
  else assert.match(c, /sourceOnly: 'Published offer only/);
  assert.match(ks, /COMMERCE_EXPERIENCE\.assistant/);
});

test('Day 11 Community Saver is default private and never pretends to publish', () => {
  const c = read('src/features/agreement-commerce/experienceContract.ts');
  const p = read('src/features/agreement-commerce/CommunitySaverConsentPreview.tsx');
  assert.match(c, /!input\.participates \|\| !input\.categoryApproved/);
  assert.match(c, /input\.derivedFromPrivateAgreement && !input\.agreementSpecificPermission/);
  assert.match(c, /input\.myReceipts === true && input\.theirReceipts === true/);
  assert.match(p, /Experience preview only\. Nothing is saved, advertised, matched or shared/);
  assert.match(p, /categoryApproved: false/g);
  assert.match(p, /agreementSpecificPermission: false/);
  assert.doesNotMatch(p, /fetch\(|postMessage\(|localStorage|sessionStorage/);
});

test('Day 11 does not replace the approved three-panel Store or compact Mini', () => {
  assert.match(read('src/features/store/StoreExperience.tsx'), /export function StoreExperience/);
  if (has('src/mini/MiniExperience.tsx')) assert.match(read('src/mini/MiniExperience.tsx'), /export function MiniExperience/);
  else assert.match(read('src/features/store/StoreExperience.tsx'), /StoreExperience/);
});
