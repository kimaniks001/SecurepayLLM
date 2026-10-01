import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import fs from 'node:fs';

const bundle = await build({ stdin: { contents: `
export { notificationSection } from './src/features/notifications/NotificationsExperience';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod = { exports: {} };
new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const { notificationSection } = mod.exports;

const n = overrides => ({
  id:'n',category:'AGREEMENTS',eventKey:'k',priority:'NORMAL',title:'t',body:'b',
  agreementId:null,bridgeId:null,actionKey:null,createdAt:'2026-10-01T00:00:00Z',
  readAt:null,resolvedAt:null,resolutionAction:null,version:0,...overrides,
});

test('actionable unresolved work goes to NEEDS YOU regardless of category', () => {
  assert.equal(notificationSection(n({category:'COMMUNITY',actionKey:'OPEN_INVITATIONS'})), 'NEEDS_YOU');
});
test('non-actionable Community activity goes to COMMUNITY', () => {
  assert.equal(notificationSection(n({category:'COMMUNITY'})), 'COMMUNITY');
});
test('unread meaningful non-community changes go to UPDATES', () => {
  assert.equal(notificationSection(n({category:'MONEY'})), 'UPDATES');
});
test('read or resolved history goes to EARLIER', () => {
  assert.equal(notificationSection(n({readAt:'2026-10-01T01:00:00Z'})), 'EARLIER');
  assert.equal(notificationSection(n({resolvedAt:'2026-10-01T01:00:00Z',actionKey:'OPEN_AGREEMENT'})), 'EARLIER');
});

const experience = fs.readFileSync(new URL('../src/features/notifications/NotificationsExperience.tsx', import.meta.url), 'utf8');
const controller = fs.readFileSync(new URL('../src/features/notifications/controller.ts', import.meta.url), 'utf8');
assert.match(experience, /NEEDS YOU/);
assert.match(experience, /UPDATES/);
assert.match(experience, /COMMUNITY/);
assert.match(experience, /EARLIER/);
assert.match(experience, /Security and identity-risk updates cannot be silenced/);
assert.doesNotMatch(experience, /<Toggle label="Security"/);
assert.match(controller, /securityCategoryEnabled: true/);
