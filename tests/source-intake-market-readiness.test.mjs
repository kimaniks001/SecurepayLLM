import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
const hero = await readFile('src/components/SignedOutHome.tsx', 'utf8');
const publicHome = await readFile('src/features/public/PublicHome.tsx', 'utf8');

test('canonical Home has one composer and one source menu, with no duplicate Start CTA', () => {
  assert.equal((hero.match(/<ConversationInput/g) ?? []).length, 1);
  assert.equal((hero.match(/<SourceMenu/g) ?? []).length, 1);
  assert.doesNotMatch(hero, /Start with KS001<\/span>/);
});

test('signed-in and signed-out Home both receive the same visible source lifecycle slot', () => {
  const occurrences = agent.match(/sourceStatusSlot=\{sourceStatusSlot\}/g) ?? [];
  assert.equal(occurrences.length, 2);
  assert.match(publicHome, /sourceStatusSlot=\{props\.sourceStatusSlot\}/);
});

test('Home selection remains local until explicit Add to KS001, then displays real transfer/reading status', () => {
  assert.match(agent, /setHomePendingSource\(\{ file, kind, phase: 'selected' \}\)/);
  assert.match(agent, /const commitHomeSource = \(\) => \{/);
  assert.match(agent, /sourceController\.addUpload\(pending\.kind, pending\.file\)/);
  assert.match(agent, /data-home-source-status=\{homePendingSource\.phase\}/);
  assert.match(agent, /<UploadStatusBar stage=\{sourcesState\.phase === 'checking' \? 'reading' : 'uploading'\}/);
  assert.match(agent, />Add to KS001<\/button>/);
  assert.match(agent, /Try again/);
  assert.match(agent, /Remove/);
  assert.doesNotMatch(agent, /const pickDocument = \(file: File\) => \{ requestFresh\(set => \{ setHome\(false\)/);
});

test('a signed-in Home action suppresses stale pre-sign-in continuity for newly-started work', () => {
  assert.match(agent, /if \(signedIn\) setContinuityDismissed\(true\);/);
});

test('Home source retry reuses the same source artifact when the server created one', () => {
  assert.match(agent, /pending\.sourceArtifactId && conversationId[\s\S]{0,180}sourceController\.retry/);
});
