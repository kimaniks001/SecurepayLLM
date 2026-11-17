import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {miniSellerLocalExactImageDigest} from '../src/mini/miniSellerLocalExactImageDigest.mjs';

const file=bytes=>({size:bytes.byteLength,arrayBuffer:async()=>bytes.slice().buffer});
test('same local bytes produce identical SHA-256 fingerprints regardless of filename',async()=>{
  const a=file(Uint8Array.from([1,2,3,4])), b=file(Uint8Array.from([1,2,3,4]));
  const c=file(Uint8Array.from([1,2,3,5]));
  const x=await miniSellerLocalExactImageDigest(a,webcrypto.subtle);
  const y=await miniSellerLocalExactImageDigest(b,webcrypto.subtle);
  const z=await miniSellerLocalExactImageDigest(c,webcrypto.subtle);
  assert.match(x,/^[0-9a-f]{64}$/);assert.equal(x,y);assert.notEqual(x,z);
});
test('unavailable web cryptography or invalid files are not given false image integrity labels',async()=>{
  assert.equal(await miniSellerLocalExactImageDigest(null,webcrypto.subtle),null);
  assert.equal(await miniSellerLocalExactImageDigest({size:0,arrayBuffer:async()=>new ArrayBuffer(0)},webcrypto.subtle),null);
  assert.equal(await miniSellerLocalExactImageDigest(file(Uint8Array.of(1)),null),null);
});
test('phase 3 local exact match does not create a server image mark or mediaRef',()=>{
  const c=readFileSync(new URL('../src/mini/MiniSellSomething.tsx',import.meta.url),'utf8');
  assert.match(c,/miniSellerLocalExactImageDigest/);
  assert.match(c,/This exact photo is already in your offer/);
  assert.match(c,/image registration pending/);
  assert.ok(!c.includes('registerIdentimark('));
});
