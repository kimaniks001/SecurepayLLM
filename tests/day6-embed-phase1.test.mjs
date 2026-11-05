import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../public/embed/securepay-embed.js', import.meta.url), 'utf8');
test('phase1 embed is valid and does not call AI/auth/money', () => {
  const context = {window:{}};
  vm.runInNewContext(source, context);
  assert.equal(context.window.SecurePayEmbed.version,'0.1.0');
  assert.equal(typeof context.window.SecurePayEmbed.mount,'function');
  assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|postMessage\s*\(/);
  assert.match(source,/Powered by SecurePay/);
  assert.match(source,/No simulated AI replies/);
  assert.match(source,/https:\/\/securepay\.ke/);
});
