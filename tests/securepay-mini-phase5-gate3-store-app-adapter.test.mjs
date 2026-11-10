import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const raw=read('src/mini/phase5OwnerHostAppAdapter.ts');
const js=ts.transpileModule(raw,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext
}}).outputText;
const m=await import('data:text/javascript;base64,'+
  Buffer.from(js).toString('base64'));
test('real Store screen can offer only the registered fictional Store launch in owner preview',()=>{
  const target=m.phase5OwnerHostTestLink('STORE','phase5-gate3-owner-test');
  assert.equal(target,
    'https://securepay-e0dkcl10i-james-8078.vercel.app/phase5-store-host.html');
  const url=new URL(target);
  assert.equal(url.protocol,'https:');
  assert.equal(url.search,'');
  assert.equal(url.hash,'');
  assert.equal(m.phase5OwnerHostTestLink('STORE','true'),null);
  assert.equal(m.phase5OwnerHostTestLink('STORE',null),null);
  assert.equal(m.phase5OwnerHostTestLink('ESTATE','phase5-gate3-owner-test'),null);
  assert.equal(m.phase5OwnerHostTestLink('MY_RIDE','phase5-gate3-owner-test'),null);
  assert.equal(m.phase5OwnerHostTestLink('STORAGE','phase5-gate3-owner-test'),null);
});
test('Store app reuses ordinary StoreHome without overriding offer search or agreement actions',()=>{
  const page=read('src/features/store/StoreExperience.tsx');
  const home=read('src/components/StoreHome.tsx');
  assert.match(page,/<StoreHome/);
  assert.match(page,/ownerMiniTestUrl=\{phase5OwnerHostTestLink\('STORE',import\.meta\.env\.VITE_MINI_PHASE5_OWNER_APP_TEST\)\}/);
  assert.match(page,/onUseOffer\(\{/);
  assert.match(page,/sourceOwnerKsNumber/);
  assert.match(home,/data-phase5-store-host-app-link="owner-simulation-only"/);
  assert.match(home,/href=\{ownerMiniTestUrl\}/);
  assert.match(home,/target="_blank" rel="noopener noreferrer"/);
  assert.match(home,/No offer on this page is purchased/);
  assert.doesNotMatch(raw,/\.initiate\(|fetch\(|postMessage\(|paymentIntent|bookingCode|amountMinor/);
});
test('both host-specific URLs remain identical to existing registered Gate 2 preview',()=>{
  const source=read('api/mini-phase5-host-ticket.js');
  assert.match(source,/path:'\/phase5-store-host\.html'/);
  assert.match(source,/path:'\/phase5-shortstays-host\.html'/);
  assert.match(source,/ESTATE:Object\.freeze\(\{hostId:'ESTATE'.*enabled:false/);
  assert.match(source,/MY_RIDE:Object\.freeze\(\{hostId:'MY_RIDE'.*enabled:false/);
  assert.match(source,/STORAGE:Object\.freeze\(\{hostId:'STORAGE'.*enabled:false/);
  assert.equal(m.phase5OwnerHostTestLink('SHORTSTAYS','phase5-gate3-owner-test'),
    'https://securepay-e0dkcl10i-james-8078.vercel.app/phase5-shortstays-host.html');
});
