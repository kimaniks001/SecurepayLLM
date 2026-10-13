import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [home, menu, agent, sources, question, place, messages] = await Promise.all([
  'src/components/SignedOutHome.tsx',
  'src/features/sources/ui/SourceMenu.tsx',
  'src/features/agent/AgentExperience.tsx',
  'src/features/sources/ui/SourceCard.tsx',
  'src/features/formation/NextQuestion.tsx',
  'src/features/sources/ui/DeclaredSourcePanel.tsx',
  'src/components/MessageBubble.tsx',
].map(read));

test('5F: the human invitation is consistent', () => {
  assert.match(home, /What would you like to get done/);
  assert.match(messages, /data-ks001-next-question/);
  assert.match(agent, /data-ks001-quick-answers/);
});

test('5F: photo leads the Home add menu and has visible review controls', () => {
  assert.ok(menu.indexOf("key: 'photo'") < menu.indexOf("key: 'plan'"));
  assert.match(sources, /previewUrl/);
  assert.match(sources, /View full photograph/);
  for (const word of ['Yes, that’s right', 'Correct it', 'Just keep photo', 'Organise bill or receipt']) assert.ok(sources.includes(word));
});

test('5F: Places have only human-facing options', () => {
  assert.match(place, />Places<\/button>/);
  assert.match(place, />My location<\/button>/);
  assert.doesNotMatch(place, />Plus Code<\/button>/);
  assert.doesNotMatch(place, />Coordinates<\/button>/);
  assert.match(place, /data-securepay-place/);
});

test('5F: unfinished material does not compete with Agreement review', () => {
  assert.match(agent, /!showMeetingSchedule && !showPlaceStep && !showMaterialStep/);
  assert.match(agent, /source\.extractionStatus === 'PROCESSING'/);
  assert.match(agent, /data-source-to-agreement|onReviewAgreement=/);
});

test('5F: corrections do not silently select a fact', () => {
  assert.match(question, /setExplainInstead\(true\)/);
  assert.match(question, /Nothing has been chosen/);
  assert.match(sources, /does not accept a delivery, prove completion or authorise payment/);
});

test('5F: sensitive-language surface exists, but remains a presentation check', () => {
  assert.match(agent, /isSensitiveHumanSituation/);
  assert.match(agent, /Where would you like everyone to gather/);
});
