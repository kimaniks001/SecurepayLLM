import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const api = readFileSync(new URL('../src/api/securepay/store/index.ts',import.meta.url),'utf8');
const dto = readFileSync(new URL('../src/api/securepay/store/dto.ts',import.meta.url),'utf8');
const seller = readFileSync(new URL('../src/mini/MiniSellSomething.tsx',import.meta.url),'utf8');

test('private pending image-use contract is typed and never a verified Identimark',()=>{
  for(const field of ['conversationId','sourceArtifactId','expectedOfferUpdatedAt','origin','permissionToUse'])
    assert.match(dto,new RegExp(field));
  for(const status of ['PENDING_REVIEW','STALE_OFFER_REVIEW_REQUIRED',
    'SOURCE_CHANGED_REVIEW_REQUIRED','REVOKED',
    'MORE_INFORMATION_REQUIRED','ESCALATED','REJECTED'])
    assert.ok(dto.includes(status),status);
  assert.ok(!dto.includes("'VERIFIED'"));
  assert.ok(!dto.includes("'APPROVED'"));
  assert.match(dto,/NOT a public mediaRef or Identimark/);
});

test('both personal and represented Business Store photo-use routes are auth required and source-safe',()=>{
  assert.match(api,/const personalImageUses = \(offerId: string\) => \`\$\{offer\(offerId\)\}\/image-uses\`/);
  assert.match(api,/const businessImageUses = \(businessKsNumber: string, offerId: string\) => \`\$\{businessOffer\(businessKsNumber, offerId\)\}\/image-uses\`/);
  for(const action of ['registerMyImageUse','myImageUses','revokeMyImageUse',
    'registerBusinessImageUse','businessImageUses','revokeBusinessImageUse'])
    assert.ok(api.includes(action+':'),action);
  assert.match(api,/segment\(imageUseId\)/);
  assert.match(api,/auth: 'required'/);
  assert.match(api,/Phase 3 candidate API/);
});

test('seller demo does not pretend to activate an unshipped image endpoint or public verification',()=>{
  assert.ok(!seller.includes('registerMyImageUse('));
  assert.ok(!seller.includes('registerBusinessImageUse('));
  assert.ok(!seller.includes('StoreImageUseResponse'));
  assert.match(seller,/image registration pending/);
});


test('independent image review is typed as owner-private remediation, never a server approval',()=>{
  for(const outcome of ['MORE_INFORMATION_REQUIRED','ESCALATED','REJECTED'])
    assert.ok(dto.includes("'"+outcome+"'"),outcome);
  assert.ok(!dto.includes("'APPROVED'"));
  assert.ok(!dto.includes("'VERIFIED'"));
  assert.ok(!seller.includes('StoreImageIndependentReviewController'));
});
