import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const home = await readFile('src/components/SignedOutHome.tsx', 'utf8');
const publicHome = await readFile('src/features/public/PublicHome.tsx', 'utf8');
const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
const sourceMenu = await readFile('src/features/sources/ui/SourceMenu.tsx', 'utf8');

test('signed-in and public Home share the same KS001 hero', () => {
  assert.match(agent, /<SignedOutHome/);
  assert.match(publicHome, /<SecurePayHero/);
  assert.match(home, /What do you want to make/);
  assert.match(home, /sp-real-word/);
  assert.doesNotMatch(home, /Start with KS001/, 'composer is the single Home start action');
});

test('Home uses one KS001 composer with the source plus menu', () => {
  assert.match(home, /<ConversationInput/);
  assert.match(home, /leading=\{hasIntake \? \(/);
  assert.match(home, /<SourceMenu/);
  assert.match(sourceMenu, /aria-label="Add what you have"/);
  assert.match(sourceMenu, /<Plus/);
});

test('the plus menu exposes only wired source types', () => {
  for (const label of ['Paste a plan', 'Document', 'Spreadsheet', 'Photo', 'Camera', 'Link', 'Place']) {
    assert.match(sourceMenu, new RegExp(label));
  }
  assert.match(sourceMenu, /if \(actions\.onPickVoiceNote\)/);
});

test('Home preserves the signed-in quick starts', () => {
  for (const label of ['Plan', 'Compare', 'Prepare Agreement', 'Find People']) {
    assert.match(home, new RegExp("label: '" + label + "'"));
  }
});

test('public users can still start before signing in', () => {
  assert.match(home, /Start without a KS Number/);
  assert.match(home, /Nothing becomes an agreement until you review and confirm it/);
});