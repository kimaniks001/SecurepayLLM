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

test('Home intake: the one shared "+" menu is centred and its popover never exceeds a narrow viewport', async () => {
  // Public Experience Convergence Phase 3 -- the three intake buttons became ONE SourceMenu trigger, so
  // there is no row left to wrap; what must hold at 320/375px is that the opened menu fits the screen.
  const contents = await readFile('src/components/SignedOutHome.tsx', 'utf8');
  // User-Ready Beta Gate 1 (EP-CERT-009) -- the "+" is now INSIDE the universal composer (no separate row to centre).
  const introIdx = contents.indexOf('leading={hasIntake ?');
  assert.ok(introIdx > -1, 'expected the intake "+" to live inside the composer');
  const block = contents.slice(introIdx, introIdx + 400);
  assert.match(block, /<SourceMenu/);
  assert.match(block, /variant="composer"/);
  const menu = await readFile('src/features/sources/ui/SourceMenu.tsx', 'utf8');
  assert.match(menu, /role="menu"[\s\S]{0,300}max-w-\[calc\(100vw-2rem\)\]/, 'the popover must never be wider than the viewport minus its gutter');
  assert.match(menu, /min-h-11 flex items-center/, 'every menu item is a real 44px touch target');
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
  assert.match(buttonSection, /min-h-11.*Add to this conversation/s);
});

test('SourceMenu: the "+" control is never hidden behind a desktop-only breakpoint, and Camera uses a camera-first mobile flow', async () => {
  const contents = await readFile('src/features/sources/ui/SourceMenu.tsx', 'utf8');
  const attachButtonIdx = contents.indexOf('"Add what you have"');
  const buttonStart = contents.lastIndexOf('<button', attachButtonIdx);
  const buttonBlock = contents.slice(buttonStart, contents.indexOf('>', attachButtonIdx));
  const triggerClasses = contents.slice(contents.indexOf('const triggerClass'), contents.indexOf('const onFile'));
  assert.doesNotMatch(triggerClasses, /hidden md:|md:hidden|lg:hidden|sm:hidden/);
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
