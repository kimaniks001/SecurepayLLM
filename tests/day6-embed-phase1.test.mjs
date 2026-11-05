import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const shell = readFileSync(new URL('../public/embed/securepay-embed.js', import.meta.url), 'utf8');
const client = readFileSync(new URL('../public/embed/securepay-guest-agent.js', import.meta.url), 'utf8');

test('portable embed keeps host isolation, no identity or money authority and explicit real guest-client dependency', () => {
  const context = {window:{}};
  vm.runInNewContext(shell,context);
  assert.equal(context.window.SecurePayEmbed.version,'0.2.0');
  assert.equal(typeof context.window.SecurePayEmbed.mount,'function');
  assert.doesNotMatch(shell,/fetch\s*\(|XMLHttpRequest|localStorage|postMessage\s*\(/);
  assert.match(shell,/attachShadow/);
  assert.match(shell,/Powered by SecurePay/);
  assert.match(shell,/Guest work can resume/);
  assert.match(shell,/SecurePayGuestAgent/);
  assert.match(client,/X-SecurePay-Conversation-Token/);
  assert.match(client,/sessionStorage/);
  assert.doesNotMatch(client,/localStorage|Authorization.*Bearer|\/api\/v1\/payments\//);
});
