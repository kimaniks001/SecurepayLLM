import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';

const script = readFileSync(new URL('../public/embed/storage-host-ks001.js',import.meta.url),'utf8');
const frame = readFileSync(new URL('../public/embed/storage-mini.html',import.meta.url),'utf8');

function loadHost(origin='https://storage-ke-owner-preview-james-8078.vercel.app') {
  const window = { location:{ origin } };
  runInNewContext(script, { window, URL });
  return window.SecurePayStorageHost;
}
const approved = {
  stagingApproved:true,
  ownerApproved:true,
  credentialIsolationApproved:true,
  siteId:'storage-ke-preview',
  approvedHostOrigin:'https://storage-ke-owner-preview-james-8078.vercel.app',
  frameOrigin:'https://staging.securepay.ke',
};

test('P0 Storage source script parses, does not auto-mount, and defaults to safe no-access', () => {
  assert.doesNotThrow(() => new Script(script));
  const storage=loadHost();
  assert.equal(storage.siteId,'storage-ke-preview');
  assert.equal(storage.protocol,'storage.ks001.mini.v1');
  assert.equal(storage.eligible({}),false);
  assert.equal(storage.mount({}),null);
});

test('P0 Storage adapter accepts only the verified owner preview with explicit independent flags', () => {
  const storage=loadHost();
  assert.equal(storage.eligible(approved),true);
  for(const key of ['stagingApproved','ownerApproved','credentialIsolationApproved']) {
    assert.equal(storage.eligible({...approved,[key]:false}),false,key);
  }
  assert.equal(storage.eligible({...approved,siteId:'shortstays-ke-preview'}),false);
  assert.equal(storage.eligible({...approved,approvedHostOrigin:'https://wrong.vercel.app'}),false);
  assert.equal(loadHost('https://other.vercel.app').eligible(approved),false);
  assert.equal(loadHost('https://storage-ke-owner-preview.vercel.app').eligible(approved),false);
});

test('P0 Storage credentials can only be hosted on approved SecurePay staging subdomain', () => {
  const storage=loadHost();
  assert.equal(storage.safeFrameOrigin('https://staging.securepay.ke'),'https://staging.securepay.ke');
  for(const url of ['https://www.securepay.ke','https://securepay.ke',
    'http://staging.securepay.ke','https://staging.securepay.ke.evil.com',
    'https://staging.securepay.ke/?x=1','https://attacker@staging.securepay.ke']) {
    assert.equal(storage.safeFrameOrigin(url),null,url);
    assert.equal(storage.eligible({...approved,frameOrigin:url}),false,url);
  }
});

test('P0 human-controlled prefill, not any stored inventory, price, custody or money action', () => {
  assert.match(script,/var TOPICS = Object\.freeze/);
  assert.match(script,/Find storage/);
  assert.match(script,/Offer space/);
  assert.match(script,/Collect my items/);
  assert.match(script,/Extend storage/);
  assert.match(script,/storage\.ks001\.prefill\.v1/);
  assert.match(script,/publicSpaceReference:null/);
  assert.match(script,/\.postMessage\(/);
  assert.match(script,/ev\.origin === frameOrigin/);
  assert.match(script,/ev\.source === frame\.contentWindow/);
  assert.match(script,/frame\.contentWindow\.postMessage/);
  assert.match(script,/No stored-item records, inventory/);
  assert.doesNotMatch(script,/localStorage|sessionStorage|accessToken|fundPayment\(/);
});

test('P0 iframe remains fully denied until exact owner approved origins and CSP configured', () => {
  const inline=frame.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
  assert.ok(inline);
  assert.doesNotThrow(()=>new Script(inline));
  assert.match(frame,/APPROVED_PARENTS=Object\.freeze\(\[\]\)/);
  assert.match(frame,/frame-ancestors/);
  assert.match(frame,/event\.source!==window\.parent/);
  assert.match(frame,/event\.origin!==parentOrigin/);
  assert.match(frame,/storage\.ks001\.prefill\.v1/);
  assert.match(frame,/capabilityCatalogueEnabled:true/);
  assert.match(frame,/assistant\.prefill\(data\.text\)/);
  assert.doesNotMatch(frame,/assistant\.send\(/);
  assert.doesNotMatch(frame,/localStorage|sessionStorage|paymentIntentId/);
});

test('P0 explicitly preserves iframe across an ordinary UI disclosure and close', () => {
  assert.match(script,/if \(!panel\.hidden && !frame\) render\(\)/);
  assert.match(script,/if \(sendButton\) sendButton\.disabled/);
  assert.match(script,/Closing the panel is non-destructive/);
  assert.doesNotMatch(script,/window\.open\(['"]about:blank/);
});
