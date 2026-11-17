import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {miniSellerVisibilityFresh,miniSellerVisibilityReceipt}
  from '../src/mini/miniSellerVisibilityPolicy.mjs';

const item={id:'11111111-1111-4111-8111-111111111111',kind:'PRODUCT',
  title:'Animal feed',description:'50kg bags',published:true,
  priceMinor:250000,quantityAvailable:12,availabilityState:'AVAILABLE',
  mediaRefs:['private-old-photo'],updatedAt:'2026-11-17T19:00:00Z'};

test('seller can withdraw a previously published media or quantity-bearing offer safely',()=>{
  assert.deepEqual(miniSellerVisibilityFresh(item,{...item}),{
    ok:true,offerId:item.id,expectedUpdatedAt:item.updatedAt
  });
});
test('stale revisions and changed public listing details cannot be withdrawn blindly',()=>{
  const candidates=[
    {updatedAt:'2026-11-17T19:05:00Z'},
    {title:'Changed by staff'}, {description:'Changed'},
    {published:false},{priceMinor:290000},{quantityAvailable:9},
    {availabilityState:'LOW_AVAILABILITY'}, {mediaRefs:['other-image']},
    {id:'22222222-2222-4222-8222-222222222222'}
  ];
  for(const changed of candidates)
    assert.deepEqual(miniSellerVisibilityFresh(item,{...item,...changed}),{
      ok:false,reason:'REVIEW_CURRENT_PUBLIC_OFFER'
    });
});
test('receipt requires explicit backend verified private flag and matching ID',()=>{
  assert.deepEqual(miniSellerVisibilityReceipt({
    id:item.id,published:false,updatedAt:'2026-11-17T19:01:00Z'
  },item.id),{ok:true,updatedAt:'2026-11-17T19:01:00Z'});
  for(const invalid of [
    null,{id:item.id,published:true,updatedAt:'updated'},
    {id:'wrong',published:false,updatedAt:'updated'},
    {id:item.id,published:false,updatedAt:''}
  ])assert.deepEqual(miniSellerVisibilityReceipt(invalid,item.id),{
    ok:false,reason:'PRIVACY_RESULT_UNVERIFIED'
  });
});
test('Mini requires two human clicks and a fresh server authorization/read',()=>{
  const ui=fs.readFileSync(new URL('../src/mini/MiniSellerVisibilityControls.tsx',import.meta.url),'utf8');
  assert.ok(ui.includes('Make private'));
  assert.ok(ui.includes('Yes, make private'));
  assert.ok(ui.includes('Keep public'));
  assert.ok(ui.includes('businessGateway.representation(ks)'));
  assert.ok(ui.includes('storeGateway.businessOffers(ks)'));
  assert.ok(ui.includes('storeGateway.myOffers()'));
  assert.ok(ui.includes('miniSellerVisibilityFresh(selected,matching[0])'));
  assert.ok(ui.includes('sellerConfirmsHide:true'));
  assert.ok(ui.includes('miniSellerVisibilityReceipt(result,selected.id)'));
  assert.ok(ui.includes('await onRefresh()'));
  assert.ok(ui.includes('Check My Store before trying again'));
  assert.equal(ui.includes('updateBusinessOffer('),false);
});
test('real personal and Business Store APIs use required auth and never publish when hiding',()=>{
  const gateway=fs.readFileSync(new URL('../src/api/securepay/store/index.ts',import.meta.url),'utf8');
  assert.ok(gateway.includes('makeMyOfferPrivate:'));
  assert.ok(gateway.includes('makeBusinessOfferPrivate:'));
  assert.ok(gateway.includes('/make-private'));
  assert.ok(gateway.includes("method:'POST',body,auth:'required'"));
});
test('visibility is hidden in owner demo and unrelated community/eTIMS preferences stay untouched',()=>{
  const shell=fs.readFileSync(new URL('../src/mini/MiniFirstPartyKs001.tsx',import.meta.url),'utf8');
  const seller=fs.readFileSync(new URL('../src/mini/MiniSellerStore.tsx',import.meta.url),'utf8');
  const settings=fs.readFileSync(new URL('../src/mini/MiniSellerAccountSettings.tsx',import.meta.url),'utf8');
  assert.ok(shell.includes('visibilityEnabled={!demo&&signedIn}'));
  assert.ok(seller.includes('storeGateway={visibilityEnabled?storeGateway:undefined}'));
  assert.ok(settings.includes("representation==='personal'||representation==='verified'"));
  assert.ok(settings.includes('Community-directory opt-in'));
});
test('team read uses exact Business Organization and caller-scoped authority, never mutates roles',()=>{
  const team=fs.readFileSync(new URL('../src/mini/MiniSellerTeamAccess.tsx',import.meta.url),'utf8');
  assert.ok(team.includes('businessGateway.get(businessKsNumber)'));
  assert.ok(team.includes('authorizationGateway.authoritySummary(org.organizationId)'));
  assert.ok(team.includes('authority.organizationId!==org.organizationId'));
  assert.ok(team.includes('businessGateway.members(businessKsNumber)'));
  assert.ok(team.includes("allowed.has('ORGANIZATION_MANAGE_MEMBERS')"));
  assert.ok(team.includes("allowed.has('ORGANIZATION_ASSIGN_ROLES')"));
  for(const forbidden of ['inviteMember(', 'removeMember(', 'initiateRoleAssignment(',
    'approveProtectedAction(','executeRoleAssignment('])
    assert.equal(team.includes(forbidden),false,forbidden);
});

test('owner Business settings preview shows the feature without fake privacy mutations',()=>{
  const demo=fs.readFileSync(new URL('../src/mini/MiniBusinessSettings.tsx',import.meta.url),'utf8');
  assert.ok(demo.includes('data-mini-phase5b-visibility-example'));
  assert.ok(demo.includes('Make private'));
  assert.ok(demo.includes('No listing is hidden here'));
  assert.ok(demo.includes('disabled={!verifiedStoreAvailable}'));
  assert.ok(demo.includes('Organization membership and your own server permissions'));
});
