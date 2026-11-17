import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {miniBasketQuietPreflight} from '../src/mini/miniBasketQuietFairTrade.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const titles=[
 'To Protect Trust','To Safeguard Buyers & Sellers','To Build Long-Term Relationships',
 'To Protect the Reputation of Every Store','To Strengthen the Marketplace',
 'To Honour Our Commitments','To Prevent Exploitation','To Encourage Healthy Competition',
 'To Uphold the Law','To Empower Growth','To Protect Community Goodwill','To Honour Good'
];
test('The owner-visible examination names all 12 exactly as canonical API snapshot, but never passes them',()=>{
 const page=read('src/mini/MiniFairTradeExaminationPreview.tsx');
 const names=[...page.matchAll(/^ '(To [^']+)'[,]?$/gm)].map(match=>match[1]);
 assert.deepEqual(names,titles);
 assert.match(page,/Not yet assessed/);
 assert.match(page,/not been assessed by SecurePayAPI/);
 assert.match(page,/FAIR_TRADE_PREVIEW_TITLES/);
 assert.doesNotMatch(page,/fullyExamined\s*[:=]\s*true|fairnessPassed|paymentAuthorised|score:\s*100/);
});
test('The optional inspection unfolds WWWWWH, material provider concerns and principle lenses',()=>{
 const page=read('src/mini/MiniFairTradeExaminationPreview.tsx');
 assert.match(page,/See the Fair Trade check/);
 assert.match(page,/What do we understand\?/);
 assert.match(page,/What is worth clarifying\?/);
 assert.match(page,/What happens next\?/);
 assert.match(page,/Who/);assert.match(page,/What/);assert.match(page,/Where/);
 assert.match(page,/When/);assert.match(page,/Why/);assert.match(page,/How/);
 assert.match(page,/mini-fair-inspection-panel/);
 assert.match(page,/setExpanded\(v=>!v\)/);
 assert.match(page,/setShowLenses\(v=>!v\)/);
 assert.match(page,/sourceVersion:request.source.offerUpdatedAt/);
});
test('An unknown offer is not shown as a Fair Trade approval',()=>{
 const assessment=miniBasketQuietPreflight([],{sourceFresh:true});
 assert.equal(assessment.canonicalExamination.status,'NOT_ASSESSED');
 assert.equal(assessment.canonicalExamination.fullyExamined,false);
 assert.equal(assessment.canonicalExamination.moneyReady,false);
 assert.equal(assessment.wwwwWh.what.source,'UNCONFIRMED');
});
test('Real Mini keeps examination hidden until requested, owner preview opens it by default',()=>{
 const buy=read('src/mini/MiniBuyStore.tsx');
 const app=read('src/mini/MiniExperience.tsx');
 assert.match(buy,/playground&&<MiniFairTradeExaminationPreview/);
 assert.match(buy,/showcase=\{fairTradeShowcase\}/);
 assert.match(buy,/showcaseSeeded\.current/);
 assert.match(buy,/client\.store\('KS90002'\),client\.store\('KS90003'\)/);
 assert.match(buy,/Water pump maintenance · 12 months/);
 assert.match(buy,/setView\('plan'\)/);
 assert.match(app,/isMiniExperiencePreviewHost\(window\.location\.hostname\)/);
 assert.match(app,/get\('fairTradePreview'\)==='1'/);
 assert.match(app,/get\('miniTradeDemo'\)==='1'/);
 assert.match(app,/fairTradeShowcase=\{fairTradeShowcase\}/);
});
test('The examination does not add payment, agreement-authority or extra seller commands',()=>{
 const page=read('src/mini/MiniFairTradeExaminationPreview.tsx');
 assert.doesNotMatch(page,/fetch\(|\.post\(|acceptAgreement|releaseFunds|paymentIntent/);
 assert.match(page,/This is a demonstration of the examination view/);
 assert.match(page,/source:request.source.offerId/);
 assert.match(page,/sourceVersion:request.source.offerUpdatedAt/);
});
