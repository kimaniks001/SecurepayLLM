import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// Use Vite's existing esbuild dependency to run pure TypeScript with Node's built-in test runner.
const bundle = await build({ stdin: { contents: `
export * from './src/features/money/embedContract';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

function fakeWindow({ isTop = false, referrer = '', posted = [] } = {}) {
  const win = {
    document: { referrer },
    parent: { postMessage: (message, targetOrigin) => posted.push({ message, targetOrigin }) },
  };
  win.self = win;
  win.top = isTop ? win : {};
  return win;
}

test('Final Completion Phase 2, Section 4: a self-service session (empty allow-list) is never treated as embeddable', () => {
  const win = fakeWindow({ isTop: false, referrer: 'https://partner.example/checkout' });
  assert.equal(api.resolveEmbedOrigin([], win), null);
});

test('a top-level (non-framed) load is never treated as embedded, even with a registered allow-list', () => {
  const win = fakeWindow({ isTop: true, referrer: '' });
  assert.equal(api.resolveEmbedOrigin(['https://partner.example'], win), null);
});

test('an untrusted referrer origin is rejected even when the page is framed', () => {
  const win = fakeWindow({ isTop: false, referrer: 'https://attacker.example/steal' });
  assert.equal(api.resolveEmbedOrigin(['https://partner.example'], win), null);
});

test('a referrer origin matching the pre-registered allow-list is accepted', () => {
  const win = fakeWindow({ isTop: false, referrer: 'https://partner.example/checkout?x=1' });
  assert.equal(api.resolveEmbedOrigin(['https://other.example', 'https://partner.example'], win), 'https://partner.example');
});

test('notifyEmbedParent never posts without a verified origin -- no wildcard fallback', () => {
  const posted = [];
  const win = fakeWindow({ posted });
  api.notifyEmbedParent(null, { type: 'securepay:completed', sessionId: 's1' }, win);
  assert.deepEqual(posted, []);
});

test('notifyEmbedParent posts only to the exact verified origin', () => {
  const posted = [];
  const win = fakeWindow({ posted });
  api.notifyEmbedParent('https://partner.example', { type: 'securepay:completed', sessionId: 's1' }, win);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].targetOrigin, 'https://partner.example');
  assert.deepEqual(posted[0].message, { type: 'securepay:completed', sessionId: 's1' });
});
