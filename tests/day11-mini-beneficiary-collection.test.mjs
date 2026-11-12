import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  startCollectInterview, collectQuestion, answerCollectInterview,
  collectionReview, proposedCollectionDraft,
} from '../src/mini/miniCollectInterview.mjs';

const read = path => readFileSync(fileURLToPath(new URL('../'+path,import.meta.url)),'utf8');
const ui=read('src/mini/MiniExperience.tsx');
const convo=read('src/mini/MiniCollectConversation.tsx');
const advance=(source,...answers)=>answers.reduce((s,a)=>answerCollectInterview(s,a),source);

test('mother case: actual branching conversation addresses purpose, consent, receiving funds, authority and updates',()=>{
  let s=startCollectInterview('I want to collect money for my mother');
  assert.equal(s.stage,'purpose');
  assert.equal(s.turns[0].answer,'My mother');
  assert.match(collectQuestion(s).text,/contributions help pay for/i);
  s=answerCollectInterview(s,'medical');
  assert.equal(s.stage,'consent');
  assert.match(collectQuestion(s).text,/your mother know.*agree/i);
  s=answerCollectInterview(s,'yes');
  assert.equal(s.stage,'recipient');
  s=answerCollectInterview(s,'collector');
  assert.equal(s.stage,'recipientAuthority');
  assert.match(collectQuestion(s).text,/authorised.*receive or manage/i);
  s=advance(s,'yes','target','25000','updates','purpose');
  assert.equal(s.stage,'review');
  const review=collectionReview(s);
  assert.equal(review.beneficiary,'My mother');
  assert.equal(review.purpose,'Hospital or treatment bills');
  assert.equal(review.target,'KSh 25,000');
  assert.equal(review.publishable,false);
  assert.equal(review.paid,false);
  assert.equal(review.agreementAccepted,false);
  assert.match(review.checks.join(' '),/verify the beneficiary/i);
  assert.match(review.checks.join(' '),/receive and manage/i);
  const draft=proposedCollectionDraft(s);
  assert.equal(draft.description,'Hospital or treatment bills');
  assert.equal(draft.amount,'25000');
  assert.match(draft.note,/LOCAL PROPOSAL ONLY/);
});

test('no consent and no receiving authority remain blockers and never create a collection',()=>{
  const s=advance(startCollectInterview('collect on behalf of my mother'),
    'living','pending','collector','pending','open','undecided','moreLater');
  assert.equal(s.stage,'review');
  const result=collectionReview(s);
  assert.ok(result.checks.some(check=>/permission is still needed/i.test(check)));
  assert.ok(result.checks.some(check=>/authority to receive or manage/i.test(check)));
  assert.ok(result.checks.some(check=>/spending updates/i.test(check)));
  assert.equal(result.publishable,false);
});

test('cannot give consent routes to a lawful-authority check rather than fabricated consent',()=>{
  const s=advance(startCollectInterview('for my mother'), 'rent','unable','beneficiary','open','updates','purpose');
  assert.equal(s.stage,'review');
  assert.match(collectionReview(s).consent,/lawful authority needs review/i);
  assert.ok(collectionReview(s).checks.some(x=>/permission is still needed/i.test(x)));
});

test('unrelated collection for self does not require someone else to consent',()=>{
  let s=startCollectInterview();
  assert.equal(s.stage,'beneficiary');
  s=advance(s,'self','rent');
  assert.equal(s.stage,'recipient');
  s=advance(s,'beneficiary','open','receipts','purpose');
  const review=collectionReview(s);
  assert.equal(s.stage,'review');
  assert.match(review.consent,/Not applicable/);
  assert.ok(!review.checks.some(x=>/beneficiary.*permission is still needed/i.test(x)));
});

test('no target is required and contributor-chosen amounts are not invented',()=>{
  const s=advance(startCollectInterview('for my mother'),
    'living','yes','provider','open','receipts','purpose');
  assert.equal(s.stage,'review');
  assert.match(collectionReview(s).target,/Contributors choose/);
  assert.equal(proposedCollectionDraft(s).amount,'');
});

test('unreasonable amount, unsupported answer and identifiers are rejected',()=>{
  let s=advance(startCollectInterview('for my mother'),'living','yes','collector','yes','target');
  assert.equal(s.stage,'targetAmount');
  for(const amount of ['-100','0','1e5','001','1.234']) {
    const attempt=answerCollectInterview(s,amount);
    assert.equal(attempt.stage,'targetAmount',amount);
    assert.ok(attempt.lastError,amount);
  }
  const error=answerCollectInterview(startCollectInterview(),'my mother ID 123456789');
  assert.equal(error.stage,'beneficiary');
  assert.ok(error.lastError);
});

test('ordinary Mini collect payment remains baseline; mother intent is the optional contextual path',()=>{
  assert.match(ui,/beginCollection =/);
  assert.match(ui,/begin\('collect'\)/);
  assert.match(ui,/startSupportedCollection\(opening\)/);
  assert.match(ui,/Collecting for your mother or someone else\?/);
  assert.match(ui,/collectionReviewActive/);
  assert.match(ui,/\{!collectionReviewActive && <button[^]*?setScreen\('funding'\)/);
});

test('the guided interview is not a covert fundraising bot or a payment engine',()=>{
  assert.match(convo,/Not connected to live KS001/);
  assert.match(convo,/No public collection or payment/);
  assert.match(convo,/collectionReview/);
  assert.match(convo,/Prepare local draft for review/);
  for(const forbidden of [/createPaymentIntent\(/,/releaseFunds\(/,/issueSecureLink\(/,/createAgreement\(/,/postContribution\(/])
    assert.doesNotMatch(convo,forbidden);
});
