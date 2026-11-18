import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {miniAgreementDetailView} from '../src/mini/miniAgreementHome.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const agreementId='9e1a0040-5f61-42b0-a8f2-3d315f333333';
const versionId='7426a444-2741-4a7c-b9d3-a2f402111111';
const itemId='3418f933-1421-40ba-ab7b-dae672222222';
const detail=()=>({
  overview:{agreementId,status:'CONFIRMATION_PENDING',title:'Nyeri transport'},
  currentVersion:{versionId,versionNumber:2},
  participants:[],milestones:[],
  terms:[{obligationId:itemId,title:'Transport boards',description:'To Nyeri',
    obligationType:'MONETARY',currency:'KES',amountMinor:400000,status:'PENDING'}],
  activity:[],versionHistory:[],money:{status:'NO_EVALUATION_YET'}
});
test('Phase 7B shows only authoritative item-level amount, not whole Agreement amount',()=>{
  const item=miniAgreementDetailView(detail(),agreementId,versionId);
  assert.equal(item.terms[0].id,itemId);
  assert.equal(item.terms[0].amountMinor,400000);
  assert.equal(item.terms[0].currency,'KES');
  assert.equal(item.terms[0].obligationType,'MONETARY');
});
test('Phase 7B never reads stale Agreement detail as a current eligible item',()=>{
  assert.equal(miniAgreementDetailView(detail(),agreementId,'other-version'),null);
  const dto=detail();
  dto.terms[0].amountMinor=NaN;
  assert.equal(miniAgreementDetailView(dto,agreementId,versionId).terms[0].amountMinor,null);
});
test('Phase 7B gateway sends only IDs and requires session authentication',()=>{
  const source=read('src/api/securepay/community-saver-own-item/index.ts');
  assert.ok(source.includes("auth:'required'"));
  assert.ok(source.includes('expectedAgreementVersionId'));
  assert.equal(source.includes('baselineMinor:'),true); // response DTO only
  assert.equal(source.includes('method:\'POST\''),false);
  assert.equal(source.includes('createAgreement('),false);
  assert.equal(source.includes('initiatePayment('),false);
});
test('Phase 7B live source check is disabled by default and demo cannot bypass it',()=>{
  const shell=read('src/mini/MiniFirstPartyKs001.tsx');
  const ui=read('src/mini/MiniMyAgreements.tsx');
  const checker=read('src/mini/MiniCommunitySaverItemCheck.tsx');
  assert.ok(shell.includes("!demo &&\n    import.meta.env.VITE_SECUREPAY_MINI_PHASE7_PRIVATE_ITEMS==='enabled'"));
  assert.ok(shell.includes('communitySaverGateway={liveCommunitySaverItems?communitySaverItemsGateway:undefined}'));
  assert.ok(ui.includes("t.obligationType==='MONETARY'&&t.currency==='KES'"));
  assert.ok(checker.includes("reply.agreementVersionId!==versionId"));
  assert.ok(checker.includes("reply.baselineMinor!==baselineMinor"));
  assert.ok(checker.includes("reply.matchingState!=='BLOCKED'"));
  assert.ok(checker.includes('No offer, other trader details, Plug assignment or payment was created.'));
});
