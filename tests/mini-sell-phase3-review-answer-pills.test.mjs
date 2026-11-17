import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {miniSellerReviewAnswerPills} from '../src/mini/miniSellerReviewAnswerPills.mjs';

test('supplier copyright question uses short answer pills, not a text form',()=>{
 const p=miniSellerReviewAnswerPills('MORE_INFORMATION_REQUIRED','SUPPLIER_PERMISSION');
 assert.equal(p.question,'May you use this supplier photo?');
 assert.deepEqual(p.pills.map(x=>x.id),['documents','submitted','save','remove','help']);
 assert.equal(p.canPublish,false);
 assert.equal(p.canIssueIdentimark,false);
});
test('different reviewer question topics lead to relevant Mini tools',()=>{
 for(const [topic,expected] of [
  ['PHOTO_CLARITY','photos'],['OFFER_DETAILS','describe'],
  ['SELLER_AUTHORITY','documents'],['PHOTO_SOURCE','documents'],
  ['OTHER','documents'],['UNRECOGNISED','documents']
 ])assert.equal(miniSellerReviewAnswerPills('MORE_INFORMATION_REQUIRED',topic).pills[0].id,expected);
});
test('re-submission is awaiting a reviewer and rejection never looks like approval',()=>{
 const pending=miniSellerReviewAnswerPills('RESUBMITTED_FOR_REVIEW','SUPPLIER_PERMISSION');
 assert.equal(pending.canPublish,false);assert.equal(pending.canIssueIdentimark,false);
 const rejected=miniSellerReviewAnswerPills('REJECTED','SUPPLIER_PERMISSION');
 assert.ok(rejected.pills.some(x=>x.id==='remove'));
 assert.equal(rejected.canPublish,false);
 assert.equal(miniSellerReviewAnswerPills('PENDING_REVIEW','OTHER'),null);
});
test('Mini owner demo never sends local documents as certified evidence',()=>{
 const mini=readFileSync(new URL('../src/mini/MiniSellSomething.tsx',import.meta.url),'utf8');
 const gateway=readFileSync(new URL('../src/api/securepay/store/index.ts',import.meta.url),'utf8');
 const dto=readFileSync(new URL('../src/api/securepay/store/dto.ts',import.meta.url),'utf8');
 assert.match(mini,/miniSellerReviewAnswerPills/);
 assert.match(mini,/Example question only/);
 assert.ok(!mini.includes('respondMyImageReviewQuestion('));
 assert.ok(!mini.includes('respondBusinessImageReviewQuestion('));
 for(const method of ['myImageReviewQuestion','respondMyImageReviewQuestion',
                       'businessImageReviewQuestion','respondBusinessImageReviewQuestion'])
   assert.ok(gateway.includes(method+':'),method);
 assert.match(dto,/RESUBMITTED_FOR_REVIEW/);
 assert.match(dto,/EVIDENCE_ATTACHED/);
 assert.ok(!dto.includes("'APPROVED'"));
});
