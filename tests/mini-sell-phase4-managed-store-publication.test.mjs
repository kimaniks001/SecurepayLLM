import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {storeTextPublicationReview,storeTextPublicationFresh,storePublishedTextEditReview,storePublishedTextEditFresh}
  from '../src/features/store/storeTextPublicationPolicy.mjs';

const saved={id:'11111111-1111-4111-8111-111111111111',
  kind:'PRODUCT',title:'Dairy meal',description:'50 kg sealed bags',
  priceMinor:250000,quantityAvailable:null,availabilityState:'NEEDS_CONFIRMATION',
  published:false,mediaRefs:[],updatedAt:'2026-11-17T14:00:00Z'};
const draft={kind:'PRODUCT',title:'Dairy meal',description:'50 kg sealed bags',
  priceMinor:250000,quantityAvailable:null,availabilityState:'NEEDS_CONFIRMATION',
  published:false,mediaRefs:[]};

test('private seller draft passes local review and returns exact server revision',()=>{
  assert.deepEqual(storeTextPublicationReview(saved,draft),{
    ok:true,offerId:saved.id,expectedUpdatedAt:saved.updatedAt
  });
});
test('local price, description or title changes require a new private save',()=>{
  for(const field of ['title','description','priceMinor']){
    const changed={...draft,[field]:field==='priceMinor'?250001:draft[field]+' changed'};
    assert.deepEqual(storeTextPublicationReview(saved,changed),{
      ok:false,reason:'SAVE_AND_REVIEW_CURRENT_DRAFT'
    });
  }
});
test('private publication rejects media, quantity and asserted availability',()=>{
  for(const changed of [
    {...saved,mediaRefs:['https://example.com/photo.jpg']},
    {...saved,quantityAvailable:100},
    {...saved,availabilityState:'AVAILABLE'},
    {...saved,priceMinor:0}
  ]){
    const matching={...draft,...changed,updatedAt:undefined,id:undefined};
    assert.deepEqual(storeTextPublicationReview(saved===changed?saved:changed,matching),{
      ok:false,reason:'TEXT_ONLY_UNVERIFIED_AVAILABILITY_REQUIRED'
    });
  }
});
test('published offers must never reenter private draft publication path',()=>{
  assert.deepEqual(storeTextPublicationReview({...saved,published:true},
    {...draft,published:true}),{ok:false,reason:'REVIEW_PRIVATE_DRAFT_REQUIRED'});
});
test('server edit or CAS timestamp change requires a fresh review',()=>{
  for(const patch of [
    {updatedAt:'2026-11-17T14:00:01Z'}, {priceMinor:300000},
    {description:'Changed on another device'}, {published:true},
    {mediaRefs:['unexpected']},{quantityAvailable:2}
  ]){
    assert.deepEqual(storeTextPublicationFresh(saved,{...saved,...patch}),{
      ok:false,reason:'STORE_REVISION_CHANGED'
    });
  }
});
test('fresh unchanged server Store record preserves exact timestamp for CAS',()=>{
  assert.deepEqual(storeTextPublicationFresh(saved,{...saved}),{
    ok:true,expectedUpdatedAt:saved.updatedAt
  });
});
test('Store management UI separates private save from explicit text publication',()=>{
  const builder=fs.readFileSync(new URL('../src/components/OfferBuilderView.tsx',import.meta.url),'utf8');
  const controller=fs.readFileSync(new URL('../src/features/store/controller.ts',import.meta.url),'utf8');
  const experience=fs.readFileSync(new URL('../src/features/store/StoreExperience.tsx',import.meta.url),'utf8');
  const management=fs.readFileSync(new URL('../src/components/StoreManagementHome.tsx',import.meta.url),'utf8');
  const view=fs.readFileSync(new URL('../src/features/store/view.ts',import.meta.url),'utf8');
  assert.ok(view.includes("availabilityState: 'NEEDS_CONFIRMATION', published: false"));
  assert.ok(controller.includes('published: existing?.published === true ? state.draft.published : false'));
  assert.ok(controller.includes('async publishReviewedTextOffer()'));
  assert.ok(controller.includes('storeTextPublicationReview(selected, state.draft)'));
  assert.ok(controller.includes('storeTextPublicationFresh(selected, fresh)'));
  assert.ok(controller.includes('sellerConfirmsCurrentListing: true as const'));
  assert.ok(builder.includes('Review and publish text only'));
  assert.ok(builder.includes('Publish this text-only listing'));
  assert.ok(builder.includes('Keep private'));
  assert.equal(builder.includes('Publish immediately (visible in public Store search)'),false);
  assert.ok(experience.includes('onPublishReviewedText={() => void controller.publishReviewedTextOffer()}'));
  assert.ok(management.includes('Review draft'));
});

test('existing public text-only listing edits preserve publication and pass version gate',()=>{
  const current={...saved,published:true};
  const edits={...draft,published:true,title:'Dairy meal 50 kg',priceMinor:275000};
  assert.deepEqual(storePublishedTextEditReview(current,edits),{
    ok:true,offerId:saved.id,expectedUpdatedAt:saved.updatedAt
  });
});
test('existing published images, quantity or changed stock state cannot enter text edit route',()=>{
  const current={...saved,published:true};
  for(const [change,local] of [
    [{mediaRefs:['photo']},{}],
    [{quantityAvailable:500},{}],
    [{availabilityState:'AVAILABLE'},{}],
    [{},{mediaRefs:['photo']}],
    [{},{quantityAvailable:8}],
    [{},{availabilityState:'AVAILABLE'}],
    [{},{priceMinor:0}],
    [{},{kind:'CAPACITY'}]
  ]){
    assert.deepEqual(storePublishedTextEditReview({...current,...change},{
      ...draft,published:true,...local
    }),{ok:false,reason:'LEGACY_LISTING_REQUIRES_SEPARATE_EDIT'});
  }
});
test('Store controller routes safe public text revisions to CAS endpoints, not legacy PUT',()=>{
  const source=fs.readFileSync(new URL('../src/features/store/controller.ts',import.meta.url),'utf8');
  const gateway=fs.readFileSync(new URL('../src/api/securepay/store/index.ts',import.meta.url),'utf8');
  assert.ok(source.includes('storePublishedTextEditReview(existing, state.draft)'));
  assert.ok(source.includes('storePublishedTextEditFresh(existing, candidates[0])'));
  assert.ok(source.includes('updateMyPublishedTextOffer(existing.id, changed)'));
  assert.ok(source.includes('updateBusinessPublishedTextOffer(business.ksNumber, existing.id, changed)'));
  assert.ok(gateway.includes('/update-published-text'));
});

test('fresh published text is editable without misusing the private-draft check',()=>{
  const live={...saved,published:true};
  assert.deepEqual(storePublishedTextEditFresh(live,{...live}),{
    ok:true,expectedUpdatedAt:live.updatedAt
  });
  assert.deepEqual(storeTextPublicationFresh(live,{...live}),{
    ok:false,reason:'STORE_REVISION_CHANGED'
  });
});
test('live published edit rejects remote price, content or revision changes',()=>{
  const live={...saved,published:true};
  for(const diff of [
    {updatedAt:'2026-11-17T14:01:00Z'},
    {description:'Changed on another phone'},
    {priceMinor:300000},
    {published:false},
    {quantityAvailable:1},
    {mediaRefs:['unverified-image']}
  ]) {
    assert.deepEqual(storePublishedTextEditFresh(live,{...live,...diff}),{
      ok:false,reason:'PUBLISHED_STORE_REVISION_CHANGED'
    });
  }
});
