import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import {
  STORE_OFFER_PREVIEW_BRANCH, storePreviewConfig, verifyPublishedStoreOffer,
  fetchCurrentPublishedOffer, discoverStoreOffers,
  issueOfferReview, readOfferReview, handleOfferReview, STORE_OFFER_PREVIEW_TTL_MS
} from '../api/mini-store-offer-preview.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ks='KS1234', offer='12345678-1234-4123-8123-123456789abc';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:STORE_OFFER_PREVIEW_BRANCH,
  VERCEL_URL:'securepay-real-store-preview.vercel.app',
  VITE_SECUREPAY_API_BASE_URL:'https://api.sandbox.securepay.ke',
  MINI_STORE_OFFER_PREVIEW_SECRET:'K'.repeat(60)};
const config=storePreviewConfig(env);
const now=Date.UTC(2026,10,9,14,0,0);
const realOffer=Object.freeze({
  canonicalKsNumber:ks,displayName:'Published Trader',identityType:'PERSON',status:'ACTIVE',
  profile:{},offer:{id:offer,kind:'PRODUCT',title:'Cypress boards',description:'Boards from a verified Store listing',
    priceMinor:125050,currency:'KES',quantityAvailable:10,availabilityState:'AVAILABLE',
    availabilityConfirmedAt:null,mediaRefs:[],updatedAt:'2026-11-09T13:10:00Z'}
});
const json=(value,status=200)=>({ok:status>=200&&status<300,
  headers:{get:()=>null},text:async()=>JSON.stringify(value),status});
const fetcher=async(url,options)=>{
  assert.equal(options.method,'GET');
  assert.equal(options.credentials,'omit');
  assert.equal(options.redirect,'error');
  assert.equal(options.cache,'no-store');
  assert.match(url,/^https:\/\/api\.sandbox\.securepay\.ke\/api\/v1\/stores\//);
  if(url.includes('/search?'))return json([{
    canonicalKsNumber:ks,displayName:'Published Trader',offer:realOffer.offer
  }]);
  return json(realOffer);
};
function response(){
  return {statusCode:200,headers:{},data:null,
    setHeader(k,v){this.headers[k.toLowerCase()]=v},
    end(v){this.data=JSON.parse(v)}};
}
function req(method,body,url='/api/mini-store-offer-preview'){
  return {method,url,headers:{host:env.VERCEL_URL,origin:config.origin,
    'content-type':'application/json'},body};
}
async function call(request,fetchImpl=fetcher,at=now,settings=env){
  const res=response();
  await handleOfferReview(request,res,settings,at,fetchImpl);
  return res;
}

test('strict preview-only source and fixed backend origin, not production or arbitrary client URLs',()=>{
  assert.ok(config&&config.key.length===32);
  assert.equal(config.apiOrigin,'https://api.sandbox.securepay.ke');
  for(const changed of [
    {VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'main'},
    {MINI_STORE_OFFER_PREVIEW_SECRET:'abc'},
    {VITE_SECUREPAY_API_BASE_URL:'http://api.sandbox.securepay.ke'},
    {VITE_SECUREPAY_API_BASE_URL:'https://127.0.0.1'},
    {VITE_SECUREPAY_API_BASE_URL:'https://evil.example'},
    {VITE_SECUREPAY_API_BASE_URL:'https://api.sandbox.securepay.ke/path'},
    {VERCEL_URL:'example.com'}
  ])assert.equal(storePreviewConfig({...env,...changed}),null);
});

test('Store source validation requires real KS identity, exact offer ID, current availability, price and capacity',()=>{
  const result=verifyPublishedStoreOffer(realOffer,ks,offer,2);
  assert.ok(result);
  assert.equal(result.record.merchant,'Published Trader');
  assert.equal(result.record.amountMinor,250100);
  assert.equal(result.record.reviewOnly,true);
  assert.equal(result.record.offerUpdatedAt,'2026-11-09T13:10:00Z');
  assert.equal(result.record.reference,ks+' · '+offer);
  assert.match(result.record.terms,/Not a quotation or accepted Agreement/);
  for(const bad of [
    {...realOffer,status:'SUSPENDED'}, {...realOffer,canonicalKsNumber:'KS999'},
    {...realOffer,offer:{...realOffer.offer,priceMinor:0}},
    {...realOffer,offer:{...realOffer.offer,currency:'USD'}},
    {...realOffer,offer:{...realOffer.offer,availabilityState:'PAUSED'}},
    {...realOffer,offer:{...realOffer.offer,quantityAvailable:1}},
    {...realOffer,offer:{...realOffer.offer,priceMinor:null}},
    {...realOffer,offer:{...realOffer.offer,id:'not-a-uuid'}},
    {...realOffer,offer:{...realOffer.offer,updatedAt:'not-a-date'}},
  ])assert.equal(verifyPublishedStoreOffer(bad,ks,offer,2),null);
  assert.equal(verifyPublishedStoreOffer(realOffer,ks,offer,0),null);
  assert.equal(verifyPublishedStoreOffer(realOffer,ks,offer,21),null);
});

test('seller and buyer are not allowed to inject amount or recipient into a Store offer review request',async()=>{
  const body={sellerKsNumber:ks,offerId:offer,quantity:2};
  const created=await call(req('POST',body));
  assert.equal(created.statusCode,201);
  assert.equal(created.data.simulationOnly,true);
  assert.equal(created.data.orderCreated,false);
  assert.equal(created.data.paymentEnabled,false);
  assert.doesNotMatch(created.data.offerSession,/Cypress|KS1234|125050|Published Trader/);
  const result=await call(req('GET',null,'/api/mini-store-offer-preview?session='+encodeURIComponent(created.data.offerSession)));
  assert.equal(result.statusCode,200);
  assert.equal(result.data.record.amountMinor,250100);
  assert.equal(result.data.record.sellerKsNumber,ks);
  assert.equal(result.data.agreementAccepted,false);
  assert.equal(result.data.inventoryReserved,false);
  assert.equal(result.data.paymentEnabled,false);
  assert.equal(result.data.previewSource,'SECUREPAY_PUBLIC_STORE_OFFER');
  const fake=await call(req('POST',{...body,amountMinor:1}));
  assert.equal(fake.statusCode,400);
  const changedSeller=await call(req('POST',{...body,sellerKsNumber:'KS6789'}));
  assert.equal(changedSeller.statusCode,409);
});

test('recheck current Store source on GET, blocking edits, unpublished or unavailable offers',async()=>{
  const snapshot=verifyPublishedStoreOffer(realOffer,ks,offer,1);
  const token=issueOfferReview(snapshot,config,now);
  const checked=readOfferReview(token,config,now+1000);
  assert.equal(checked.ks,ks);
  assert.equal(checked.quantity,1);
  const changedPrice=async()=>json({...realOffer,offer:{...realOffer.offer,priceMinor:1}});
  const changed=await call(req('GET',null,'/api/mini-store-offer-preview?session='+token),changedPrice);
  assert.equal(changed.statusCode,409);
  const unpublished=await call(req('GET',null,'/api/mini-store-offer-preview?session='+token),
    async()=>json({},404));
  assert.equal(unpublished.statusCode,409);
  const expired=await call(req('GET',null,'/api/mini-store-offer-preview?session='+token),
    fetcher,now+STORE_OFFER_PREVIEW_TTL_MS);
  assert.equal(expired.statusCode,410);
  assert.equal(readOfferReview(token,{...config,origin:'https://other.vercel.app'},now),null);
  const changedToken=token.slice(0,-8)+(token.at(-8)==='A'?'B':'A')+token.slice(-7);
  assert.equal(readOfferReview(changedToken,config,now),null);
});

test('discover only sourced published Store offers; empty backend offers stay empty',async()=>{
  const list=await discoverStoreOffers(config.apiOrigin,fetcher);
  assert.equal(list.length,1);
  assert.equal(list[0].sellerKsNumber,ks);
  assert.equal(list[0].priceMinor,125050);
  const res=await call(req('GET',null,'/api/mini-store-offer-preview?discover=1'));
  assert.equal(res.statusCode,200);
  assert.equal(res.data.offers.length,1);
  assert.equal(res.data.checkoutEnabled,false);
  assert.deepEqual(await discoverStoreOffers(config.apiOrigin,async()=>json([])),[]);
  assert.deepEqual(await discoverStoreOffers(config.apiOrigin,async()=>json([
    {canonicalKsNumber:'KS9999',displayName:'False',offer:{...realOffer.offer,priceMinor:null}}
  ])),[]);
});

test('backend is strictly read-only and fails closed for untrusted hosts, methods and network errors',async()=>{
  assert.equal((await call(req('POST',{sellerKsNumber:ks,offerId:offer,quantity:1}),
    async()=>{throw Error('offline')})).statusCode,503);
  assert.equal((await call({...req('POST',{sellerKsNumber:ks,offerId:offer,quantity:1}),
    headers:{...req('POST').headers,origin:'https://attacker.example'}})).statusCode,403);
  assert.equal((await call(req('POST',{sellerKsNumber:ks,offerId:offer,quantity:1}),
    fetcher,now,{...env,VERCEL_ENV:'production'})).statusCode,503);
  assert.equal((await call(req('POST',{sellerKsNumber:ks,offerId:offer,quantity:1,purpose:'RELEASE'}))).statusCode,400);
  assert.equal((await call(req('PUT',null))).statusCode,405);
  const script=read('api/mini-store-offer-preview.js');
  assert.doesNotMatch(script,/createIntent\(|fundFromSelf\(|PaymentInitiationService|releaseFunds\(/);
  assert.match(script,/redirect:'error'/);
  assert.match(script,/no-store/);
});

test('client Mini mode accepts only read-only review, reuses existing funding simulator and optional KS001',()=>{
  const out={};
  const transpiled=ts.transpileModule(read('src/mini/realStoreOfferPreview.ts'),{
    compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}
  }).outputText;
  runInNewContext(transpiled,{exports:out,Number,Object,Date,Set});
  const raw={record:verifyPublishedStoreOffer(realOffer,ks,offer,1).record,
    expiresAt:Date.now()+300000,simulationOnly:true,
    previewSource:'SECUREPAY_PUBLIC_STORE_OFFER',
    orderCreated:false,agreementAccepted:false,inventoryReserved:false,paymentEnabled:false};
  assert.ok(out.validateStoreOfferReview(raw));
  for(const change of [
    {paymentEnabled:true},{orderCreated:true},{agreementAccepted:true},
    {inventoryReserved:true},{simulationOnly:false},{expiresAt:1},
    {record:{...raw.record,amountMinor:0}},
    {record:{...raw.record,source:'SHORTSTAYS'}}
  ])assert.equal(out.validateStoreOfferReview({...raw,...change}),null);
  const mini=read('src/mini/MiniExperience.tsx');
  const component=read('src/mini/MiniRealStoreOffer.tsx');
  assert.match(mini,/storeOfferSession/);
  assert.match(component,/<MiniFundingPreview/);
  assert.match(component,/<MiniGuestChat/);
  assert.match(component,/No order, accepted agreement, reserved stock or payment exists/);
  assert.match(component,/returnToStore/);
  assert.doesNotMatch(component,/createIntent\(|\.redeem\(|\.release\(|fetch\(/);
});

test('owner preview launcher shows only backend-sourced offers and never sends price or beneficiary',()=>{
  const html=read('checkout-store-offer-preview.html');
  const js=read('public/mini-store-offer-launcher.js');
  assert.match(html,/Published Store offers/);
  assert.match(html,/checkout-store-offer-preview/);
  assert.match(js,/fetch\('\/api\/mini-store-offer-preview\?discover=1'/);
  assert.match(js,/JSON\.stringify\(\{sellerKsNumber,offerId,quantity\}\)/);
  assert.match(js,/storeOfferSession=/);
  assert.match(js,/event\.source!==frame\.contentWindow/);
  assert.match(js,/event\.origin!==window\.location\.origin/);
  assert.doesNotMatch(js,/JSON\.stringify\(\{[^}]*amountMinor/);
  assert.match(js,/Nothing paid/);
});
