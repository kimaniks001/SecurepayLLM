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

test('Home upload remains visible until source ingestion has a terminal result', () => {
  assert.match(agent, /setHome\(true\);[\s\S]{0,600}setHomePendingSource\(\{ file, kind, phase: 'reading' \}\)/);
  assert.match(agent, /data-home-source-status=\{homePendingSource\.phase\}/);
  assert.match(agent, /Reading…/);
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
