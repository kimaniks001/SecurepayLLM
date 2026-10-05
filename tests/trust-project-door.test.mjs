import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `
      export { TrustProjectWelcome } from './src/features/trust/TrustProjectWelcome';
      export { parseTrustProjectDoor } from './src/features/trust/route';
      export { joinUrl } from './src/features/join/share';
      export { createElement } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl' },
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const noop = () => {};
const text = markup => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

test('Trust Project clean-path and hash aliases resolve without carrying authority', () => {
  assert.deepEqual(api.parseTrustProjectDoor('/trust', '', ''), { interest: null, source: 'path' });
  assert.deepEqual(api.parseTrustProjectDoor('/trust/', '?interest=master', ''), { interest: 'master', source: 'path' });
  assert.deepEqual(api.parseTrustProjectDoor('/', '', '#/trust?interest=plug'), { interest: 'plug', source: 'hash' });
  assert.deepEqual(api.parseTrustProjectDoor('/trust-project', '?interest=member', ''), { interest: 'member', source: 'path' });
  assert.equal(api.parseTrustProjectDoor('/', '', '#/join'), null);
  assert.equal(api.parseTrustProjectDoor('/money', '', ''), null);
});

test('Trust Project invitations now enter the welcome door, not SecurePay Home or Join directly', () => {
  assert.equal(api.joinUrl('https://securepay.ke', null), 'https://securepay.ke/trust');
  assert.equal(api.joinUrl('https://securepay.ke/', 'plug'), 'https://securepay.ke/trust?interest=plug');
});

test('the welcome door carries the agreed member proposition and a clear way back to SecurePay', () => {
  const markup = api.renderToStaticMarkup(api.createElement(api.TrustProjectWelcome, {
    interest: null,
    onJoin: noop,
    onGoSecurePay: noop,
  }));
  const out = text(markup);
  for (const phrase of [
    'A place to trade fairly, build your life, and belong.',
    'Come as you are. Bring what you know.',
    'Here, we trade fairly.',
    'Trade Fairly',
    'Build Your Life',
    'Belong Somewhere',
    'Find opportunities',
    'Build goals from trade',
    'Join real projects',
    'Learn and teach',
    'Travel with purpose',
    'Join us. Here we trade fairly.',
    'Looking for SecurePay? Go to SecurePay',
    'One SecurePay identity underneath.',
  ]) assert.ok(out.includes(phrase), phrase);
  assert.match(markup, /data-trust-project-door/);
  assert.match(out, /Read the 12 Principles/);
});

test('interest personalises only the invitation context', () => {
  const out = text(api.renderToStaticMarkup(api.createElement(api.TrustProjectWelcome, {
    interest: 'master',
    onJoin: noop,
    onGoSecurePay: noop,
  })));
  assert.match(out, /your experience could be useful to other people/i);
  assert.match(out, /Everyone joins as a Member/);
});

test('the doorway makes no hidden membership, money or guaranteed-outcome claim', async () => {
  const source = (await readFile('src/features/trust/TrustProjectWelcome.tsx', 'utf8')).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.doesNotMatch(source, /membership\.join|communityGateway|paymentIntent|ledger|releaseMoney|referral/i);
  const out = text(api.renderToStaticMarkup(api.createElement(api.TrustProjectWelcome, {
    interest: null,
    onJoin: noop,
    onGoSecurePay: noop,
  })));
  assert.doesNotMatch(out, /guaranteed income|guaranteed work|guaranteed return|trust score|verified trusted|passive income/i);
  assert.match(out, /no automatic membership/i);
});

test('RuntimeApp keeps SecurePay root intact and mounts Trust Project only on its explicit doorway route', async () => {
  const runtime = await readFile('src/RuntimeApp.tsx', 'utf8');
  assert.match(runtime, /useTrustProjectDoor/);
  assert.match(runtime, /if \(trustProjectDoor\)/);
  assert.match(runtime, /<TrustProjectWelcome/);
  assert.match(runtime, /window\.location\.hash = interest \? [^;]*#\/join\?interest=/);
  assert.match(runtime, /return api && agentGateway/);
});
