import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const shop=read('src/mini/MiniStoreGallery.tsx');
const basket=read('src/mini/MiniBuyStore.tsx');
const photos=read('src/mini/MiniStoreVisuals.tsx');
const styles=read('src/mini/mini.css');
test('Mini remains a phone-first shop, not a second desktop Business application',()=>{
  assert.match(styles,/\.spm-clean \.spm-frame \{ max-width:390px/);
  assert.match(styles,/\.spm-shop-grid \{ display:grid; grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(shop,/Have a look around/);
  assert.match(shop,/Keep browsing this Store/);
  assert.match(shop,/MiniOfferPhoto offer=\{offer\}/);
  assert.match(shop,/cartCount>0&&<button/);
});
test('A customer sees basket count and chosen quantities while browsing',()=>{
  assert.match(shop,/cartQty\(offer.id\)>0/);
  assert.match(shop,/View your basket/);
  assert.match(shop,/Quantity/);
  assert.match(shop,/onAdd\(selected,qty\)/);
  assert.match(basket,/const itemCount=cart.reduce/);
  assert.match(basket,/changeQuantity\(line,line.quantity\+1\)/);
  assert.match(basket,/changeQuantity\(line,line.quantity-1\)/);
});
test('Basket checks offer freshness in the background; unnecessary check button is not the normal step',()=>{
  assert.match(basket,/useEffect\(\(\)=>\{/);
  assert.match(basket,/Promise\.all\(cart\.map\(line=>client\.offer/);
  assert.match(basket,/miniStoreOfferSnapshotFresh\(cart,fresh\)/);
  assert.match(basket,/ONE QUICK QUESTION/);
  assert.match(basket,/How would you like to receive your items/);
  assert.match(basket,/disabled=\{!ready\}/);
  assert.match(basket,/Ask KS001/);
  assert.match(basket,/onDiscuss\(cart\.map/);
});
test('Offer review, seller confirmation, regulated Money and living work remain separate stages',()=>{
  assert.match(basket,/NEXT · MAKE AN AGREEMENT/);
  assert.match(basket,/Your Agreement is organised\. Choose what you want to do next/);
  assert.match(basket,/preflight\.pendingProviderRequests\.length===0/);
  assert.match(basket,/'Send SecureLink'/);
  assert.match(basket,/allSampleAccepted/);
  assert.match(basket,/MiniSampleMoneyJourney/);
  assert.match(read('src/mini/MiniSampleMoneyJourney.tsx'),/Your purchase is in motion/);
  assert.match(basket,/sampleMoneyReady/);
  assert.doesNotMatch(basket,/fetch\(.*\/api\/v1\/payments\/start/s);
});
test('Sample storefronts contain a browsable range of offers, not two warehouse rows',async()=>{
  const result=await build({stdin:{contents:
    "export * from './src/mini/miniTradePlayground';export {copyDemo} from './src/mini/MiniBusinessDemoModel';",
    resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',write:false});
  const m=await import('data:text/javascript;base64,'+
    Buffer.from(result.outputFiles[0].text).toString('base64'));
  const api=m.createMiniTradingSampleStore(m.copyDemo());
  const hardware=await api.store('KS90001'),pumps=await api.store('KS90002');
  const care=await api.store('KS90003');
  const discover=await api.search({kind:'PRODUCT',limit:10});
  assert.ok(new Set(discover.map(x=>x.canonicalKsNumber)).size>=3,
    'The first mobile discovery must reveal different merchants');
  assert.ok(hardware.offers.length>=6,'hardware needs several browse-worthy goods');
  assert.ok(pumps.offers.length>=5,'pump shop needs a meaningful grid');
  assert.ok(care.offers.filter(x=>x.kind==='SERVICE').length>=4,'service shop needs a meaningful grid');
  assert.ok(hardware.offers.every(x=>x.id&&x.title&&x.updatedAt));
  assert.match(photos,/Illustrative/);
  assert.match(photos,/trustedMedia/);
});
