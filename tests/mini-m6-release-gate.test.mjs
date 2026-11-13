import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const vite=readFileSync('vite.config.ts','utf8');
const script=readFileSync('scripts/securepay-mini-release-audit.mjs','utf8');
const mini=readFileSync('src/mini/MiniExperience.tsx','utf8');
const first=readFileSync('src/mini/MiniFirstPartyKs001.tsx','utf8');
test('production Mini build excludes demo HTML and requires a sample-byte audit',()=>{
  assert.match(vite,/SECUREPAY_MINI_RELEASE_BUILD === '1'/);
  assert.match(vite,/releaseBuild \? \{\} : \{/);
  assert.match(script,/mini\.html/);
  assert.match(script,/DEMO-AGR-041/);
  assert.match(script,/mini-demo-amina/);
  assert.match(script,/SYNTHETIC DEMO ONLY/);
});
test('actual customer Mini never exposes owner funding simulation or query sandbox',()=>{
  assert.match(mini,/samplePreviewAllowed && !collectionReviewActive/);
  assert.match(mini,/const gate4Session = samplePreviewAllowed \?/);
  assert.match(mini,/const gate3Session = samplePreviewAllowed \?/);
  assert.match(mini,/const gate2Session = samplePreviewAllowed \?/);
  assert.match(mini,/const demoRequest = samplePreviewAllowed \?/);
  assert.match(first,/demo && moneyOwnerOpen/);
  assert.match(first,/livePaymentCommands=liveFeeQuotes &&/);
});
