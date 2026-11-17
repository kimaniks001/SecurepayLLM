import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {miniSellerPreparedOffer,miniSellerSafeDraft,miniSellerRestoreDraft} from '../src/mini/miniSellerPreparedOffer.mjs';

const product={
  title:'20 bags of dairy meal',category:'Agriculture',priceType:'fixed',price:'2,500',
  quantity:'20',unit:'bag',description:'Sealed 50 kg dairy meal.',
  descriptionReviewed:true,availability:'Limited stock — buyer must confirm',
  rightToOffer:true,rightType:'Owner',placeType:'Pickup',
  place:'Kamakis, Ruiru',privateMeeting:'My private home address',
  timing:'Proposed pickup timing on 2026-11-30',
  people:[{name:'Example customer',role:'Buyer'}],
  photos:[{name:'local-photo.jpg',source:'supplier',supplierPermission:true}],
  documents:[{name:'supplier-terms.pdf',purpose:'Supplier authorisation'}]
};
test('Phase 2 maps a seller-declared product to an unpublished, canonical-shaped Store candidate',()=>{
  const p=miniSellerPreparedOffer(product);
  assert.equal(p.ok,true);assert.equal(p.storeCandidate.kind,'PRODUCT');
  assert.equal(p.storeCandidate.priceMinor,250000);assert.equal(p.storeCandidate.published,false);
  assert.equal(p.storeCandidate.availabilityState,'NEEDS_CONFIRMATION');
  assert.equal(p.storeCandidate.quantityAvailable,null);
  assert.deepEqual(p.storeCandidate.mediaRefs,[]);
  assert.equal(p.summary.totalMinor,5_000_000);
  assert.equal(p.summary.moneyText,'KSh 2,500 / bag');
  assert.equal(p.offerTerms.fulfilment.placeLabel,'Kamakis, Ruiru');
  assert.equal(p.offerTerms.authorityDeclaration,'Owner');
  assert.equal(p.offerTerms.localPhotos[0].status,'LOCAL_UNVERIFIED');
  assert.equal(p.offerTerms.localDocuments[0].status,'FILENAME_ONLY_NOT_UPLOADED');
  assert.equal(p.offerTerms.proposedPeople[0].status,'NOT_INVITED_OR_VERIFIED');
  assert.equal(p.boundary.canonical,false);
  assert.equal(p.boundary.moneyAuthorized,false);
  assert.equal(JSON.stringify(p).includes('My private home address'),false);
});
test('Phase 2 supports product, service and capacity without inventing stock or rates',()=>{
  for(const [category,kind] of [['Goods','PRODUCT'],['Services','SERVICE'],['Capacity','CAPACITY']]){
    const p=miniSellerPreparedOffer({...product,category,priceType:'quote',price:'',quantity:'',unit:kind==='CAPACITY'?'hour':'job'});
    assert.equal(p.ok,true);assert.equal(p.storeCandidate.kind,kind);
    assert.equal(p.storeCandidate.priceMinor,null);
    assert.equal(p.summary.totalMinor,null);
    assert.equal(p.storeCandidate.quantityAvailable,null);
    assert.equal(p.offerTerms.pricing.mode,'QUOTE_REQUIRED');
  }
});
test('reject malformed amounts and quantities; a total is only a transparent proposed calculation',()=>{
  for(const price of ['0','-50','NaN','2,500.555','1e8','10000000000000']){
    assert.equal(miniSellerPreparedOffer({...product,price}).ok,false,price);
  }
  for(const quantity of ['0','-2','twenty','5e4','1000001']){
    assert.equal(miniSellerPreparedOffer({...product,quantity}).ok,false,quantity);
  }
  const fractional=miniSellerPreparedOffer({...product,price:'150',quantity:'1.5',unit:'kg'});
  assert.equal(fractional.ok,true);assert.equal(fractional.summary.totalMinor,null);
});
test('only approved seller description crosses into a Store candidate',()=>{
  const no=miniSellerPreparedOffer({...product,descriptionReviewed:false});
  assert.equal(no.storeCandidate.description,null);
  assert.equal(no.summary.descriptionApproved,false);
  const yes=miniSellerPreparedOffer(product);
  assert.equal(yes.storeCandidate.description,'Sealed 50 kg dairy meal.');
});
test('local resume excludes third-party identities, filenames, private meeting instructions, source proofs and approval',()=>{
  const raw=miniSellerSafeDraft({...product,stockStatement:product.availability,
    photos:product.photos,documents:product.documents,people:product.people,
    privateMeeting:product.privateMeeting,apiToken:'secret',descriptionReviewed:true});
  assert.equal(raw.version,2);assert.equal(raw.localOnly,true);
  const json=JSON.stringify(raw);
  for(const secret of ['My private home address','Example customer','local-photo.jpg','supplier-terms.pdf','secret'])
    assert.equal(json.includes(secret),false,secret);
  assert.equal(miniSellerRestoreDraft(raw).title,'20 bags of dairy meal');
  assert.equal(miniSellerRestoreDraft({version:7,title:'oops'}),null);
});
test('seller component uses preparation module, keeps independent seller exits and never publishes via client',()=>{
  const c=readFileSync(new URL('../src/mini/MiniSellSomething.tsx',import.meta.url),'utf8');
  assert.match(c,/miniSellerPreparedOffer/);
  assert.match(c,/miniSellerSafeDraft/);
  assert.match(c,/miniSellerRestoreDraft/);
  assert.match(c,/data-mini-seller-offer-packet/);
  assert.match(c,/onClick=\{\(\)=>finish\('share'\)\}/);
  assert.match(c,/onClick=\{\(\)=>finish\('store'\)\}/);
  assert.match(c,/onClick=\{\(\)=>finish\('save'\)\}/);
  assert.ok(!c.includes('storeGateway.createOffer('));
  assert.ok(!c.includes('storeGateway.createBusinessOffer('));
});

test('material seller fields are not silently clipped before Agreement preparation',()=>{
  for(const [field,max] of [['title',240],['description',2000],
    ['condition',300],['specifications',800],['included',300],
    ['purpose',300],['limitations',600],['warranty',600],
    ['place',300],['timing',600]]){
    const p=miniSellerPreparedOffer({...product,[field]:'X'.repeat(max+1)});
    assert.equal(p.ok,false,field);
    assert.match(p.error,/too long/);
  }
});
test('unreviewed but nonempty description remains visibly pending on the offer terms',()=>{
  const p=miniSellerPreparedOffer({...product,descriptionReviewed:false});
  assert.equal(p.ok,true);
  assert.equal(p.offerTerms.descriptionRequiresReview,true);
  assert.equal(p.storeCandidate.description,null);
  assert.equal(miniSellerPreparedOffer({...product,description:'',descriptionReviewed:false})
    .offerTerms.descriptionRequiresReview,false);
});
