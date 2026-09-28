import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Entry Perfection Phase 3 -- Knowledge & Truth (UI side): KS001 gets the person's device time zone with each turn so
// relative dates ("tomorrow", "this Friday") resolve correctly; when the device can't say, nothing is assumed.
const bundle = await build({ stdin: { contents: `export { createAgentController, deviceTimeZone } from './src/features/agent/controller';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node' });
const mod = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const api = mod.exports;
const gateway = bodies => ({
  createConversation: async () => ({ conversationId: 'c' }),
  submitTurn: async (_id, body) => { bodies.push(body); return { message: 'OK', replyId: 'r' }; },
  readContext: async () => ({ conversationId: 'c', version: 0, entities: [], relationships: [] }),
  conversationHistory: async () => ({ entries: [] }),
});

test('each turn carries the device-reported IANA time zone when known', async () => {
  const bodies = [];
  const controller = api.createAgentController(gateway(bodies), () => 'id', { sleep: async () => {}, timeZone: () => 'Africa/Nairobi' });
  await controller.send('Start Tuesday');
  assert.equal(bodies[0].clientTimeZone, 'Africa/Nairobi');
  assert.equal(bodies[0].clientTurnId, 'id');
});

test('no zone is invented when the device cannot report one', async () => {
  const bodies = [];
  const controller = api.createAgentController(gateway(bodies), () => 'id', { sleep: async () => {}, timeZone: () => undefined });
  await controller.send('Start Tuesday');
  assert.equal('clientTimeZone' in bodies[0], false);
});

test('the app passes the real device zone, read from Intl (never a hardcoded Kenya default)', async () => {
  const src = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.equal((src.match(/createAgentController\(gateway, undefined, \{ timeZone: deviceTimeZone \}\)/g) ?? []).length, 2);
  const controller = await readFile('src/features/agent/controller.ts', 'utf8');
  assert.match(controller, /Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone/);
  assert.doesNotMatch(controller, /Africa\/Nairobi|EAT|\+03:00/);
  const zone = api.deviceTimeZone();
  assert.ok(zone === undefined || (typeof zone === 'string' && zone.length > 0));
});
