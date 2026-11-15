import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const mini=read('src/mini/MiniExperience.tsx');
const css=read('src/mini/mini.css');
const vite=read('vite.config.ts');
const guest=read('src/mini/MiniGuestChat.tsx');

test('Mini default entry is an ordinary customer experience, not an M1–M5 demo launcher',()=>{
  assert.doesNotMatch(mini,/Explore the latest Mini build|Explore M1–M5|SYNTHETIC DEMO/);
  assert.doesNotMatch(mini,/Funding simulation|funding options \(simulation\)|samplePreviewOpen/);
  assert.doesNotMatch(mini,/<MiniFundingPreview|<MiniGate2Sandbox|<MiniHostedCheckoutDemo/);
  assert.match(mini,/<h1 className="spm-hero">\{t\.hello\}<\/h1>/);
  assert.match(mini,/<MiniBuyStore\b/);
  assert.match(mini,/begin\('sell'\)/);
  assert.match(mini,/begin\('pay'\)/);
  assert.match(mini,/onClick=\{beginCollection\}/);
  assert.match(mini,/<MiniProudlyKeMark/);
});

test('default Mini build excludes demo HTML pages; isolated dev must explicitly opt in',()=>{
  assert.match(vite,/process\.env\.SECUREPAY_MINI_RELEASE_BUILD !== '0'/);
  assert.match(vite,/\.\.\.\(releaseBuild \? \{\} : \{/);
  assert.match(vite,/mini: fileURLToPath/);
});

test('customer surface keeps signed first-party checkout and fails closed on unavailable KS001',()=>{
  assert.match(mini,/<MiniServerCheckout\b/);
  assert.match(mini,/<MiniRealStoreOffer\b/);
  assert.match(mini,/getMiniFirstPartyOrigin\(\)/);
  assert.match(guest,/A trusted KS001 connection has not been set up/);
  assert.doesNotMatch(mini,/@RestController|initiateOnce\(|releaseFunds\(/);
});

test('existing forest-ivory Mini and tiny Kenyan signoff remain, not a new redesign',()=>{
  assert.match(css,/\.spm-clean \.spm-head/);
  assert.match(css,/#285d41/);
  assert.match(css,/#fffdf8/);
  assert.match(css,/\.spm-clean \.spm-entrance \.spm-actions/);
  assert.match(css,/\.spm-proudly-footer/);
  assert.match(mini,/proudly\.ke/);
});

test('staging Money cannot be disguised as approved or collected',()=>{
  assert.match(mini,/Nothing is invited, accepted or paid from this draft/);
  assert.match(mini,/Not sent\. Not an agreement/);
  assert.doesNotMatch(mini,/<MiniFundingPreview/);
});
