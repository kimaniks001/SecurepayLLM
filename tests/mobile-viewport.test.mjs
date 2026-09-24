import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

// KS001 Upgrade Phase 3 completion correction (item 11) -- 375px/320px mobile acceptance for the source-
// ingestion surfaces (Home intake row, Bring Plan, attach control, SourceCard, BUILD/UNDERSTOOD post-
// ingestion reachability). This repo has NO rendered-pixel-viewport/screenshot testing mechanism (no
// jsdom-with-layout, no headless browser) -- every existing "mobile" proof in this suite (see
// phase6-convergence.test.mjs's own Q1/Q2 tests) is a structural, source-level assertion against the exact
// responsive utility classes/attributes that determine real narrow-viewport behaviour (flex-wrap instead of
// a fixed row that would force horizontal scroll, min-w-0/truncate instead of an overflowing label, w-full
// instead of a fixed px width, min-h-11 real touch targets, capture="environment" for a camera-first photo
// flow, and no `hidden md:` gate hiding a control on mobile). This file follows that SAME established
// convention -- the best real mechanism already available in this repo -- rather than introduce new tooling
// (jsdom/Playwright) for a single completion-correction item. It does NOT claim a rendered-pixel screenshot
// was taken at 375/320px; it claims (and proves) that the exact CSS/markup properties a 375/320px viewport
// depends on are genuinely present in the production source.

test('Home intake row: the three source-intake entries wrap instead of forcing horizontal overflow at a narrow width', async () => {
  const contents = await readFile('src/components/SignedOutHome.tsx', 'utf8');
  const introIdx = contents.indexOf('onBringPlan || onPickDocument || onPickPhoto');
  assert.ok(introIdx > -1, 'expected the intake-mode entries block to exist');
  const block = contents.slice(introIdx, introIdx + 800);
  assert.match(block, /flex-wrap/, 'the intake row must wrap at a narrow width, never force horizontal scroll');
  assert.match(block, /justify-center/);
});

test('BringPlanPanel: the paste surface and its own action buttons are fluid width and real touch targets, never a fixed desktop-only size', async () => {
  const contents = await readFile('src/features/sources/ui/BringPlanPanel.tsx', 'utf8');
  const textareaIdx = contents.indexOf('<textarea');
  const textareaBlock = contents.slice(textareaIdx, contents.indexOf('/>', textareaIdx));
  assert.match(textareaBlock, /w-full/, 'the paste textarea must be fluid width, never a fixed px width');
  const inputIdx = contents.indexOf('<input', textareaIdx);
  const inputBlock = contents.slice(inputIdx, contents.indexOf('/>', inputIdx));
  assert.match(inputBlock, /w-full/, 'the optional label field must also be fluid width');
  // Both the Cancel and the real submit action must be real (>=44px) touch targets -- min-h-11 is this
  // repo's own established convention for that, used identically throughout UnderstoodWorkbench/instruments.
  const buttonSection = contents.slice(contents.indexOf('flex justify-end gap-2'));
  assert.match(buttonSection, /min-h-11.*Cancel/s);
  assert.match(buttonSection, /min-h-11.*Read into BUILD/s);
});

test('AttachSourceMenu: the attach control is never hidden behind a desktop-only breakpoint, and the photo picker uses a camera-first mobile flow', async () => {
  const contents = await readFile('src/features/sources/ui/AttachSourceMenu.tsx', 'utf8');
  const attachButtonIdx = contents.indexOf('aria-label="Attach a source"');
  const buttonStart = contents.lastIndexOf('<button', attachButtonIdx);
  const buttonBlock = contents.slice(buttonStart, contents.indexOf('>', attachButtonIdx));
  assert.doesNotMatch(buttonBlock, /hidden md:|md:hidden|lg:hidden|sm:hidden/,
    'the attach control must remain reachable on a mobile viewport, never gated behind a desktop-only class');
  assert.match(contents, /capture="environment"/, 'the photo picker must open the camera first on a mobile device, not only a file browser');
});

test('SourceCard: the title area truncates instead of overflowing horizontally at a narrow width', async () => {
  const contents = await readFile('src/features/sources/ui/SourceCard.tsx', 'utf8');
  const titleIdx = contents.indexOf('{title}');
  const spanStart = contents.lastIndexOf('<span', titleIdx);
  const spanBlock = contents.slice(spanStart, titleIdx);
  assert.match(spanBlock, /truncate/, 'a long source title must truncate, never force horizontal overflow');
  const rowIdx = contents.lastIndexOf('<div', spanStart);
  const rowBlock = contents.slice(rowIdx, spanStart);
  assert.match(rowBlock, /min-w-0/, 'the title row needs min-w-0 for truncate to actually take effect inside a flex row');
});

test('BUILD/UNDERSTOOD mobile tabs are never gated behind any source-ingestion condition -- they remain reachable before, during, and after a source is brought in', async () => {
  const contents = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  const start = contents.indexOf('md:hidden sticky top-0 z-10 bg-cream-50');
  const end = contents.indexOf('flex-1 flex overflow-hidden');
  assert.ok(start > -1 && end > start, 'expected to find the mobile sticky BUILD/UNDERSTOOD tab block');
  const tabBlock = contents.slice(start, end);
  assert.doesNotMatch(tabBlock, /sourcesState|bringPlanOpen|sourceController/,
    'the BUILD/UNDERSTOOD tabs must never depend on source-ingestion state -- they stay reachable regardless of what is happening with a source');
  assert.match(tabBlock, /setMobileTab\('build'\)/);
  assert.match(tabBlock, /openUnderstood/);
});
