import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../public/embed/myride-mini.html',import.meta.url),'utf8');
const inline = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];

test('P0 My Ride frame bootstrap parses and is disabled until exact host approval', () => {
  assert.ok(inline);
  assert.doesNotThrow(() => new Script(inline));
  assert.match(html,/APPROVED_PARENTS=Object\.freeze\(\[\]\)/);
  assert.match(html,/!APPROVED_PARENTS\.includes\(parentOrigin\)/);
  assert.match(html,/!secureStaging/);
  assert.match(html,/requestedSite!==SITE_ID/);
  assert.match(html,/window\.parent===window|window\.parent!==window/);
  assert.match(html,/frame-ancestors/);
});

test('P0 frame responds only to matching parent; typed draft is never automatically sent', () => {
  assert.match(html,/event\.source!==window\.parent/);
  assert.match(html,/event\.origin!==parentOrigin/);
  assert.match(html,/myride\.ks001\.hello\.v1/);
  assert.match(html,/securepay\.embed\.myride\.ready\.v1/);
  assert.match(html,/myride\.ks001\.prefill\.v1/);
  assert.match(html,/data\.product!==PROTOCOL/);
  assert.match(html,/assistant\.prefill\(data\.text\)/);
  assert.doesNotMatch(html,/assistant\.send\(/);
  assert.doesNotMatch(html,/localStorage|accessToken|paymentIntentId/);
});

test('P0 My Ride iframe uses the shared SecurePay guest SDK and descriptive-only onion', () => {
  assert.match(html,/\/embed\/securepay-guest-agent\.js/);
  assert.match(html,/\/embed\/securepay-embed\.js/);
  assert.match(html,/capabilityCatalogueEnabled:true/);
  assert.match(html,/siteId:SITE_ID/);
  assert.match(html,/getReturnContext:function/);
  assert.doesNotMatch(html,/iframe\.src=.*[?&]token=/);
});
