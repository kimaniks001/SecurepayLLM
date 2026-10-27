import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const source = file => readFileSync(new URL('../'+file, import.meta.url), 'utf8');
const bundle = await build({
  stdin: { contents: `
export { UploadStatusBar } from './src/features/sources/ui/UploadStatusBar';
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server';`,
    resolveDir: process.cwd() },
  bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic',
});
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const ui = module.exports;

test('media transfer displays a real indeterminate progress bar without invented percentages', () => {
  const html = ui.renderToStaticMarkup(ui.createElement(ui.UploadStatusBar,
    { stage: 'uploading', fileName: 'terms.pdf' }));
  assert.match(html, /Uploading to SecurePay/);
  assert.match(html, /<progress[^>]*aria-label="File upload in progress"/);
  assert.doesNotMatch(html, /value="/);
  assert.doesNotMatch(html, /[0-9]+%/);
});
test('receipt starts a distinct reading status and never implies that understanding succeeded', () => {
  const html = ui.renderToStaticMarkup(ui.createElement(ui.UploadStatusBar,
    { stage: 'reading', fileName: 'delivery.jpg' }));
  assert.match(html, /Upload received/);
  assert.match(html, /File reading in progress/);
  assert.match(html, /not the same as understanding/);
});
test('Vision has a separate saving status that does not claim KS001 read the file', () => {
  const html = ui.renderToStaticMarkup(ui.createElement(ui.UploadStatusBar,
    { stage: 'saving', fileName: 'vision.pdf' }));
  assert.match(html, /Saving this file to your Vision/);
  assert.match(html, /has not yet been read by KS001/);
});
test('Home, chat and Tool Shelf require Add to KS001 before file transmission', () => {
  const home = source('src/features/agent/AgentExperience.tsx');
  const tray = source('src/features/living-workspace/UniversalSourceTray.tsx');
  assert.match(home, /setHomePendingSource\(\{ file, kind, phase: 'selected' \}\)/);
  assert.match(home, /const commitHomeSource = \(\) =>/);
  assert.match(home, /data-source-awaiting-add/);
  assert.match(home, /Add to KS001/);
  assert.match(tray, /onClick=\{\(\)=>void uploadToKs001\(\)\}/);
  assert.match(tray, /Add \{tool==='Photos'\?'photo':'document'\} to KS001/);
  assert.match(tray, /Check reading status/);
});
