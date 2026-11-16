import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// Focused doctrine tests for the headless connector: no mock authority, no
// implicit agreement or payment; use the existing Store API only.
const bundle = await build({
  stdin: {
    contents: "export * from './src/integrations/business-connect/index';",
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, format: 'esm', platform: 'node',
});
const bc = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const offer = (o = {}) => ({
  id: 'floodlight-1', kind: 'PRODUCT', title: 'Solar floodlight',
  description: 'Outdoor light', priceMinor: 350000, currency: 'KES',
  quantityAvailable: 2, availabilityState: 'AVAILABLE',
  availabilityConfirmedAt: '2026-11-16T10:00:00Z',
  mediaRefs: [], updatedAt: '2026-11-16T10:00:00Z', ...o,
});
const result = (o = {}) => ({
  canonicalKsNumber: 'KS-101', displayName: 'Kamakis Electricals',
  locationLabel: 'Naivasha', offer: offer(), ...o,
});
const detail = (o = {}) => ({
  canonicalKsNumber: 'KS-101', displayName: 'Kamakis Electricals',
  identityType: 'BUSINESS', status: 'ACTIVE',
  profile: {
    tagline: null, about: null, locationLabel: 'Naivasha',
    heroHeadline: null, storefrontPreset: 'MERCHANT',
    storefrontTheme: 'FOREST', updatedAt: '2026-11-16T10:00:00Z',
  },
  offer: offer(), ...o,
});

test('Shortstays discovers only backed Store offers with real API filters', async () => {
  const calls = [];
  const gateway = {
    search: async params => { calls.push(params); return [result()]; },
    offer: async () => { throw Error('not called'); },
  };
  const out = await bc.createBusinessConnect(gateway).discover({
    surface: 'SHORTSTAYS', kind: 'PRODUCT',
    category: 'solar', location: 'Naivasha', limit: 5,
  });
  assert.deepEqual(calls, [{ kind: 'PRODUCT', category: 'solar', location: 'Naivasha', limit: 5 }]);
  assert.equal(out.status, 'ready');
  assert.equal(out.results[0].sellerKsNumber, 'KS-101');
  assert.equal(out.results[0].requiresFreshConfirmation, true);
  assert.equal(out.results[0].offerTitle, 'Solar floodlight');
  assert.equal('verifiedDelivery' in out.results[0], false);
});

test('Native apps and external sites share one headless contract', () => {
  for (const surface of ['ESTATE','SHORTSTAYS','MY_RIDE','STORAGE','MINI','LIVING_WORKSPACE','EXTERNAL_SITE']) {
    assert.equal(bc.storeSearchForNeed({ surface, kind:'PRODUCT', category:'electrical' }).kind,'PRODUCT');
  }
});

test('Search never becomes a random broad, unbounded or invented match', () => {
  assert.throws(() => bc.storeSearchForNeed({ surface:'SHORTSTAYS', kind:'PRODUCT' }), /category or location/);
  assert.throws(() => bc.storeSearchForNeed({ surface:'SHORTSTAYS', kind:'PRODUCT', category:'solar', limit:100 }), /limit/);
  assert.throws(() => bc.storeSearchForNeed({ surface:'SHORTSTAYS', kind:'PRODUCT', category:'x'.repeat(121) }), /120/);
});

test('API failure produces no demo merchants and no green availability', async () => {
  const connector = bc.createBusinessConnect({
    search: async () => { throw new Error('down'); },
    offer: async () => { throw new Error('down'); },
  });
  const found = await connector.discover({surface:'SHORTSTAYS',kind:'PRODUCT',category:'solar'});
  assert.deepEqual(found.results, []);
  assert.equal(found.status, 'unavailable');
  const checked = await connector.inspect('KS-101','floodlight-1');
  assert.equal(checked.status, 'not_eligible');
});

test('An inactive merchant, changed offer ID, or unavailable item cannot be adopted', async () => {
  for (const returned of [
    detail({ status: 'INACTIVE' }),
    detail({ offer: offer({ id:'different' }) }),
    detail({ offer: offer({ availabilityState: 'UNAVAILABLE' }) }),
  ]) {
    const connector = bc.createBusinessConnect({
      search: async () => [], offer: async () => returned,
    });
    const inspected = await connector.inspect('KS-101','floodlight-1');
    assert.equal(inspected.status, 'not_eligible');
    assert.throws(() => bc.selectListedOffer(inspected,true), /current inspected offer/);
  }
});

test('Offer selection requires explicit customer choice and is source-only, never an agreement', async () => {
  const connector = bc.createBusinessConnect({
    search: async () => [], offer: async () => detail(),
  });
  const inspected = await connector.inspect('KS-101','floodlight-1');
  assert.equal(inspected.status, 'listed');
  assert.throws(() => bc.selectListedOffer(inspected,false), /explicit customer selection/);
  const source = bc.selectListedOffer(inspected,true);
  assert.equal(source.sourceType, 'STORE_LISTING');
  assert.equal(source.sourceId, 'floodlight-1');
  assert.equal(source.sourceOwnerKsNumber, 'KS-101');
  for (const forbidden of ['agreementId','secureLink','paymentReady','pay','funds','priceMinor']) {
    assert.equal(Object.hasOwn(source, forbidden), false);
  }
});



test('B1: a public store alone does not grant Shortstays publication', async () => {
  const b = await build({
    stdin: { contents: "export * from './src/integrations/business-connect/shortstays';", resolveDir: process.cwd() },
    bundle:true, write:false, format:'esm',platform:'node',
  });
  const { createShortstaysBusinessConnect } = await import(
    `data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`
  );
  const searches = [];
  const store = {
    search: async q => { searches.push(q); return [result()]; },
    offer: async () => detail(),
  };
  const denyNetwork = createShortstaysBusinessConnect(store, {
    evaluate: async () => ({
      sellerKsNumber:'KS-101',offerId:'floodlight-1',
      targetSurface:'SHORTSTAYS',status:'NOT_PUBLISHED',
      publicationVersion:1,validUntil:'2099-01-01T00:00:00Z',
    }),
  });
  const noMatches = await denyNetwork.findCandidateListingsForGuest({category:'solar',area:'Naivasha'});
  assert.equal(noMatches.status,'ready');
  assert.equal(noMatches.results.length,0);
  assert.equal(noMatches.filteredCount,1);
  assert.deepEqual(searches,[{kind:'PRODUCT',category:'solar',location:'Naivasha',limit:10}]);
  await assert.rejects(() => denyNetwork.useThisOffer('KS-101','floodlight-1',true), /not available/);
});

test('B1: only fresh matching server approval permits a Shortstays offer to be selected', async () => {
  const b = await build({
    stdin: { contents: "export * from './src/integrations/business-connect/governed';", resolveDir: process.cwd() },
    bundle:true, write:false, format:'esm',platform:'node',
  });
  const { createGovernedBusinessConnect } = await import(
    `data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`
  );
  let decisions = 0;
  let allowed = true;
  const store = {search:async () => [result()],offer:async () => detail()};
  const authority = {evaluate:async inp => {
    decisions++;
    return {...inp, status:allowed?'ELIGIBLE':'NOT_PUBLISHED', publicationVersion:3,validUntil:'2026-11-16T20:00:00Z'};
  }};
  const connector = createGovernedBusinessConnect(store,authority,()=>Date.parse('2026-11-16T17:00:00Z'));
  const found = await connector.discover({surface:'SHORTSTAYS',kind:'PRODUCT',category:'solar'});
  assert.equal(found.results.length,1);
  await assert.rejects(() => connector.select('KS-101','floodlight-1','SHORTSTAYS',false), /Customer selection/);
  const choice = await connector.select('KS-101','floodlight-1','SHORTSTAYS',true);
  assert.equal(choice.sourceType,'STORE_LISTING');
  assert.equal(choice.sourceOwnerKsNumber,'KS-101');
  assert.equal(Object.hasOwn(choice,'agreementId'),false);
  allowed=false; // Merchant withdraws cross-app permission.
  await assert.rejects(() => connector.select('KS-101','floodlight-1','SHORTSTAYS',true),/not available/);
  assert.ok(decisions>=3);
});

test('B1: wrong surface, identity, expired permission and lookup failures all fail closed', async () => {
  const b = await build({
    stdin: { contents: "export * from './src/integrations/business-connect/governed';", resolveDir: process.cwd() },
    bundle:true, write:false,format:'esm',platform:'node',
  });
  const { createGovernedBusinessConnect } = await import(
    `data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`
  );
  const store={search:async()=>[result()],offer:async()=>detail()};
  const baseline={sellerKsNumber:'KS-101',offerId:'floodlight-1',targetSurface:'SHORTSTAYS',
    status:'ELIGIBLE',publicationVersion:1,validUntil:'2026-11-17T00:00:00Z'};
  for(const altered of [
    {...baseline,sellerKsNumber:'KS-999'},
    {...baseline,targetSurface:'ESTATE'},
    {...baseline,validUntil:'2026-11-15T00:00:00Z'},
    {...baseline,publicationVersion:0},
  ]) {
    const guarded=createGovernedBusinessConnect(store,{evaluate:async()=>altered},()=>Date.parse('2026-11-16T17:00:00Z'));
    const found=await guarded.discover({surface:'SHORTSTAYS',kind:'PRODUCT',category:'solar'});
    assert.deepEqual(found.results,[]);
  }
  const broken=createGovernedBusinessConnect(store,{evaluate:async()=>{throw Error('network offline')}});
  const found=await broken.discover({surface:'SHORTSTAYS',kind:'PRODUCT',category:'solar'});
  assert.deepEqual(found.results,[]);
});

test('B1 knowledge: merchant teaching drafts are private until backend review', async () => {
  const bundle=await build({
    stdin:{contents:"export * from './src/integrations/business-connect/knowledge';",resolveDir:process.cwd()},
    bundle:true,write:false,format:'esm',platform:'node',
  });
  const know=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const drafted=know.prepareBusinessKnowledgeDraft({
    businessKsNumber:'KS-101',topic:'DELIVERY',origin:'MERCHANT_ENTRY',
    content:'  Confirm same-day delivery with the merchant.  ',
  });
  assert.equal(drafted.audience,'MERCHANT_PRIVATE');
  assert.equal(drafted.content,'Confirm same-day delivery with the merchant.');
  assert.equal(Object.hasOwn(drafted,'status'),false);
  assert.throws(()=>know.prepareBusinessKnowledgeDraft({
    businessKsNumber:'INVALID',topic:'FAQ',origin:'MERCHANT_ENTRY',content:'Hello',
  }),/Business KSNumber/);
});

test('B1 knowledge: no cross-store leakage, unapproved drafts, private policy or stale facts', async () => {
  const bundle=await build({
    stdin:{contents:"export * from './src/integrations/business-connect/knowledge';",resolveDir:process.cwd()},
    bundle:true,write:false,format:'esm',platform:'node',
  });
  const know=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const shared={businessKsNumber:'KS-101',topic:'DELIVERY',audience:'CUSTOMER_VISIBLE',
    origin:'MERCHANT_ENTRY',content:'Deliver to approved areas',sourceReference:'catalogue-3',
    recordId:'know-1',status:'APPROVED',approvedByIdentityId:'owner-1',
    approvedAt:'2026-11-16T10:00:00Z',currentUntil:'2026-11-17T00:00:00Z',version:2};
  const records=[
    shared,
    {...shared,recordId:'other',businessKsNumber:'KS-999'},
    {...shared,recordId:'draft',status:'DRAFT'},
    {...shared,recordId:'expired',currentUntil:'2026-11-15T00:00:00Z'},
    {...shared,recordId:'not-reviewed',approvedByIdentityId:null},
    {...shared,recordId:'private',audience:'MERCHANT_PRIVATE',content:'Supplier cost price'},
    {...shared,recordId:'internal',audience:'ASSISTANT_INSTRUCTION',content:'Ask before promising delivery'},
  ];
  const ctx=know.storeGuideKnowledgeContext('KS-101',records,Date.parse('2026-11-16T17:00:00Z'));
  assert.deepEqual(ctx.customerFacts.map(x=>x.recordId),['know-1']);
  assert.deepEqual(ctx.privateInstructions.map(x=>x.recordId),['internal']);
  assert.equal(JSON.stringify(ctx).includes('Supplier cost price'),false);
  assert.equal(JSON.stringify(ctx).includes('KS-999'),false);
});
