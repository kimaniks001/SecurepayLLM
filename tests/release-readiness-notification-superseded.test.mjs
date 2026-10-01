import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `
export { actionFor, notificationSection } from './src/features/notifications/NotificationsExperience';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.png': 'dataurl' } });
const mod={exports:{}};
new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const {actionFor,notificationSection}=mod.exports;
const n=overrides=>({
 id:'n',category:'AGREEMENTS',eventKey:'k',priority:'HIGH',title:'t',body:'b',
 agreementId:'agr',bridgeId:null,actionKey:'REVIEW_AGREEMENT',createdAt:'2026-10-01T00:00:00Z',
 readAt:null,resolvedAt:null,resolutionAction:null,version:0,...overrides
});

test('superseded notification is historical and cannot keep an action button',()=>{
 const item=n({resolvedAt:'2026-10-01T01:00:00Z',resolutionAction:'SUPERSEDED'});
 assert.equal(actionFor(item,()=>{},()=>{}),null);
 assert.equal(notificationSection(item),'EARLIER');
});

test('ordinary resolved notification is also no longer actionable',()=>{
 const item=n({resolvedAt:'2026-10-01T01:00:00Z',resolutionAction:'APPROVED'});
 assert.equal(actionFor(item,()=>{},()=>{}),null);
});
