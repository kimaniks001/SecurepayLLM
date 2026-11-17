import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

const compiled=await build({stdin:{
  contents:"export * from './src/mini/miniTradePlayground'; export {copyDemo} from './src/mini/MiniBusinessDemoModel';",
  resolveDir:process.cwd()},write:false,bundle:true,format:'esm',platform:'node'});
const {createMiniTradingSampleStore,copyDemo,miniTradeSampleSearches}=await import(
  'data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Owner Mini sample catalogue supplies several independent goods and service stores',async()=>{
  const api=createMiniTradingSampleStore(copyDemo());
  const goods=await api.search({kind:'PRODUCT',limit:10});
  const services=await api.search({kind:'SERVICE',limit:10});
  assert.ok(goods.length>=5);
  assert.ok(services.length>=5);
  assert.ok(new Set([...goods,...services].map(x=>x.canonicalKsNumber)).size>=5);
  assert.ok(goods.some(x=>/solar floodlight/i.test(x.offer.title)));
  assert.ok(goods.some(x=>/solar irrigation water pump/i.test(x.offer.title)));
  assert.ok(services.some(x=>/12 months/i.test(x.offer.title)));
  assert.ok(services.some(x=>/tractor hire/i.test(x.offer.title)));
  assert.ok(services.some(x=>x.offer.priceMinor===null));
  assert.ok(goods.every(x=>/Sample/.test(x.displayName)));
  assert.ok(services.every(x=>/Sample/.test(x.displayName)));
});
test('A Business Settings sample offer is visible in the same buyer StoreGateway',async()=>{
  const demo=copyDemo();
  const api=createMiniTradingSampleStore(demo);
  const before=(await api.search({kind:'PRODUCT',category:'cement',limit:10}))[0];
  assert.equal(before.offer.priceMinor,75000);
  assert.equal(before.canonicalKsNumber,'KS90001');
  const updated=copyDemo();
  updated.offers[1].price=900;
  updated.offers[1].version=2;
  const after=(await createMiniTradingSampleStore(updated).offer(before.canonicalKsNumber,before.offer.id)).offer;
  assert.equal(after.priceMinor,90000);
  assert.notEqual(after.updatedAt,before.offer.updatedAt);
  updated.offers[1].visible=false;
  assert.equal((await createMiniTradingSampleStore(updated).search({kind:'PRODUCT',category:'cement'})).length,0);
});
test('Exact sample offer reads preserve seller and unique source identity',async()=>{
  const api=createMiniTradingSampleStore(copyDemo());
  const matches=await api.search({kind:'SERVICE',category:'maintenance'});
  assert.ok(matches.length>=1);
  const m=matches.find(x=>x.offer.title==='Water pump maintenance · 12 months');
  assert.ok(m);
  const store=await api.store(m.canonicalKsNumber);
  const readBack=await api.offer(m.canonicalKsNumber,m.offer.id);
  assert.equal(readBack.offer.id,m.offer.id);
  assert.equal(store.offers.find(o=>o.id===m.offer.id)?.title,m.offer.title);
  await assert.rejects(()=>api.offer('KS90001',m.offer.id),/sample offer/);
});
test('Playground opt-in is restricted to isolated owner preview and cannot silently replace real Store API',()=>{
  const experience=read('src/mini/MiniExperience.tsx');
  const buy=read('src/mini/MiniBuyStore.tsx');
  const support=read('src/mini/MiniTradeSampleHelp.tsx');
  assert.match(experience,/get\('miniTradeDemo'\) === '1'/);
  assert.match(experience,/isMiniExperiencePreviewHost\(window.location.hostname\)/);
  assert.match(experience,/storeGateway=\{playground\?sampleStoreGateway:undefined\}/);
  assert.match(experience,/verifiedStoreAvailable=\{!playground/);
  assert.match(experience,/setScreen\('business-settings'\)/);
  assert.match(buy,/MiniSampleMoneyJourney/);
  assert.match(read('src/mini/MiniSampleMoneyJourney.tsx'),/Simulate provider confirmation/);
  assert.match(buy,/Fictional sample data/);
  assert.match(support,/not connected to live KS001/);
  assert.deepEqual(miniTradeSampleSearches.map(x=>x.label),[
    'Solar lighting','Pump','Cement','Maintenance','Delivery','Tractor hire']);
});
