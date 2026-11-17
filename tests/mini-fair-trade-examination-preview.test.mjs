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
 assert.match(page,/not yet assessed/i);
 assert.match(page,/not been assessed by SecurePayAPI/);
 assert.match(page,/FAIR_TRADE_PREVIEW_TITLES/);
 assert.doesNotMatch(page,/fullyExamined\s*[:=]\s*true|fairnessPassed|paymentAuthorised|score:\s*100/);
});
test('The basket shows a three-line summary, deeper checks and principles ONLY on request',()=>{
 const page=read('src/mini/MiniFairTradeExaminationPreview.tsx');
 assert.match(page,/>Fair Trade check</);
 for(const label of ['Understood','Needs attention','Next'])assert.match(page,new RegExp('>'+label+'<'));
 for(const essential of ['Who','What','Where','When','Why','How']) assert.ok(page.includes("['"+essential+"',"));
   assert.match(page,new RegExp("\\\\['"+essential+"',"));
 assert.match(page,/mini-fair-inspection-panel/);
 assert.match(page,/const \[expanded,setExpanded\]=useState\(showcase\)/);
 assert.match(page,/const \[details,setDetails\]=useState\(false\)/);
 assert.match(page,/const \[showLenses,setShowLenses\]=useState\(false\)/);
 assert.match(page,/details&&<div className="spm-fair-compact-deep">/);
 assert.match(page,/showLenses&&<ol className="spm-fair-compact-lenses-list">/);
 assert.match(page,/Offer: \{firstRequest.source.offerId\}/);
 assert.match(page,/Published: \{firstRequest.source.offerUpdatedAt\}/);
 assert.doesNotMatch(page,/Behind your basket|What do we understand\?|What is worth clarifying\?/);
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
test('The examination is explanation only, not Money or seller authority',()=>{
 const page=read('src/mini/MiniFairTradeExaminationPreview.tsx');
 assert.doesNotMatch(page,/fetch\(|\.post\(|acceptAgreement|releaseFunds|paymentIntent/);
 assert.match(page,/This is a demonstration of the examination view/);
 assert.match(page,/firstRequest.source.offerId/);
 assert.match(page,/firstRequest.source.offerUpdatedAt/);
 const css=read('src/mini/mini.css');
 assert.match(css,/Compact Fair Trade check/);
 assert.match(css,/\.spm-fair-compact-row \{display:grid/);
 assert.match(css,/\.spm-fair-compact-lenses-list \{display:grid/);
});
