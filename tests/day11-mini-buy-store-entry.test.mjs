import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {storePreviewConfig, STORE_OFFER_DAY11_BUY_BRANCH} from '../api/mini-store-offer-preview.js';

const read = p => readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const mini=read('src/mini/MiniExperience.tsx');
const buy=read('src/mini/MiniBuyStore.tsx');
const preview=read('api/preview-workspace.js');

test('Buy is an additional Mini entrance; sell/pay/collect and the approved shell persist',()=>{
  assert.match(mini,/buy: 'Buy something'/);
  assert.match(mini,/buyHint: 'Find goods, visit a Store and agree'/);
  assert.match(mini,/MiniBuyStore/);
  assert.match(mini,/hidden=\{screen !== 'buy'\}/);
  for (const old of ["begin('sell')","begin('pay')","begin('collect')",'MiniFundingPreview']) {
    assert.ok(mini.includes(old),old);
  }
  assert.match(mini,/spm-canonical-mark/);
});

test('Store reads reuse the public Store source and approved server relay',()=>{
  assert.match(buy,/createStoreGateway\(createHttpClient/);
  assert.match(buy,/\/api\/preview-workspace\?path=/);
  assert.match(buy,/Store read is outside the approved public API/);
  assert.match(buy,/found\.status === 'ACTIVE'/);
  assert.match(preview,/pathname === '\/api\/v1\/stores\/search'/);
  assert.match(buy,/method: 'GET'/);
  assert.match(buy,/credentials: 'same-origin'/);
});

test('Store selections require a source re-read and cannot become an accepted Agreement or pay directly',()=>{
  assert.match(buy,/Promise\.all\(cart\.map\(line => stores\.offer/);
  assert.match(buy,/offer\.updatedAt !== line\.offerUpdatedAt/);
  assert.match(buy,/offer\.priceMinor !== line\.priceMinor/);
  assert.match(buy,/Seller confirmation and a canonical Agreement are still required/);
  assert.match(buy,/No signed Agreement, stock reservation or payment/);
  assert.doesNotMatch(buy,/markPaid|releaseFunds|createAgreement|signedAgreement|createPaymentIntent/);
});

test('New preview branch may only use pre-existing gated review capability',()=>{
  assert.equal(STORE_OFFER_DAY11_BUY_BRANCH,'feat/day11-mini-buy-live-store-entry-20261112');
  const env={VERCEL_ENV:'preview',
    VERCEL_GIT_COMMIT_REF:STORE_OFFER_DAY11_BUY_BRANCH,
    MINI_STORE_OFFER_PREVIEW_SECRET:'x'.repeat(50),
    VERCEL_URL:'securepay-day11-owner.vercel.app',
    VITE_SECUREPAY_API_BASE_URL:'https://staging.securepay.ke/'};
  const allowed=storePreviewConfig(env);
  assert.ok(allowed);
  assert.equal(allowed.apiOrigin,'https://staging.securepay.ke');
  assert.equal(storePreviewConfig({...env,VERCEL_ENV:'production'}),null);
  assert.equal(storePreviewConfig({...env,MINI_STORE_OFFER_PREVIEW_SECRET:''}),null);
  assert.equal(storePreviewConfig({...env,VITE_SECUREPAY_API_BASE_URL:'https://example.com/'}),null);
});
