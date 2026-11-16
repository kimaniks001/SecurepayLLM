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


test('Shortstays adapter calls the common Store API without adding holiday-specific payment logic', async () => {
  const shortstaysBundle = await build({
    stdin: { contents: "export * from './src/integrations/business-connect/shortstays';", resolveDir: process.cwd() },
    bundle: true, write: false, format: 'esm', platform: 'node',
  });
  const { createShortstaysBusinessConnect } = await import(
    `data:text/javascript;base64,${Buffer.from(shortstaysBundle.outputFiles[0].text).toString('base64')}`
  );
  const searches = [];
  const bridge = createShortstaysBusinessConnect({
    search: async q => { searches.push(q); return [result()]; },
    offer: async () => detail(),
  });
  const listings = await bridge.findCandidateListingsForGuest({ category:'solar', area:'Naivasha' });
  assert.equal(listings.status,'ready');
  assert.deepEqual(searches,[{kind:'PRODUCT',category:'solar',location:'Naivasha',limit:10}]);
  const inspected = await bridge.inspectMerchantOffer('KS-101','floodlight-1');
  const selection = bridge.useThisOffer(inspected,true);
  assert.equal(selection.sourceOwnerKsNumber,'KS-101');
  assert.equal('agreement' in selection,false);
});
