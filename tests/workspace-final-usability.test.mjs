import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL('../'+name, import.meta.url), 'utf8');
const shell = read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const guide = read('src/features/living-workspace/WorkspacePurposeGuide.tsx');
const model = read('src/features/living-workspace/workspacePurpose.ts');
const browser = read('tests/gate5b-approved-browser.mjs');

test('final usability: a narrow phone can navigate all four places without widening the page', () => {
  assert.match(shell,/aria-label="Workspace experience"/);
  assert.match(shell,/sp-brand-nav flex w-full min-w-0 max-w-full overflow-x-auto/);
  assert.match(shell,/min-h-11 shrink-0 rounded-lg px-3/);
  for(const label of ['My Work','Vision','Circle','Community'])assert.ok(shell.includes("'"+label+"'"),label);
  assert.match(browser,/\['small-phone',320,700\]/);
  assert.match(browser,/Horizontal overflow at/);
});
test('final usability: summary tab truthfully names the current area, not always My Work', () => {
  assert.match(shell,/mode==='work'\?'Your Work':mode==='community'\?'Community Check':'About '\+areaLabels\[mode\]/);
  assert.match(browser,/area==='community'\?'Community Check':'About '\+label/);
  assert.match(guide,/onClick=\{onContinueToWork\}/);
  assert.match(guide,/Opening My Work does not transfer, publish, approve or pay/);
});
test('final usability: mobile tool drawer remains escapable and has no second Agreement engine', () => {
  assert.match(shell,/window\.addEventListener\('keydown',onEscape\)/);
  assert.match(browser,/await page\.keyboard\.press\('Escape'\)/);
  assert.match(browser,/Escape closes contextual tools/);
  assert.match(shell,/createFormationController\(gateway\)/);
  assert.match(shell,/createAgentController\(gateway/);
  assert.doesNotMatch(guide+model,/createAgentController|createFormationController|fetch\(|localStorage|releaseFunds/);
});
