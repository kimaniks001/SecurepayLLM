import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
const conversation = await readFile('src/features/conversation/ConversationSurface.tsx', 'utf8');
const bubbles = await readFile('src/components/MessageBubble.tsx', 'utf8');
const sourceMenu = await readFile('src/features/sources/ui/SourceMenu.tsx', 'utf8');

test('active chat has one obvious human focus: KS001 conversation', () => {
  assert.match(agent, />KS001</);
  assert.match(conversation, /aria-label="Conversation with KS001"/);
  assert.match(conversation, /max-w-4xl/);
  assert.match(conversation, /sp-life-canvas/);
});

test('structured understanding stays a distinct one-tap/adjacent surface, not mixed into chat', () => {
  assert.match(agent, /openUnderstood/);
  assert.match(agent, /Understood/);
  assert.match(agent, /data-understood-plane/);
  assert.match(agent, /What SecurePay understands/);
});

test('the person can clearly add something and send a message', () => {
  assert.match(sourceMenu, /aria-label="Add what you have"/);
  assert.match(conversation, /aria-label="Message KS001"/);
  assert.match(conversation, /aria-label="Send message"/);
});

test('KS001 conversation uses the shared material DNA instead of generic messenger bubbles', () => {
  assert.match(bubbles, /sp-section-warm/);
  assert.match(bubbles, /uppercase tracking-\[0\.16em\] text-forest-600/);
  assert.match(bubbles, /bg-white\/82/);
  assert.doesNotMatch(bubbles, /sender === 'agent'[\s\S]{0,700}bg-white border border-cream-200\/80/);
  assert.doesNotMatch(bubbles, /sender === 'user'[\s\S]{0,500}bg-forest-800 px-4 py-2\.5 text-cream-50/);
});

test('chat remains usable on mobile without losing BUILD / UNDERSTOOD navigation', () => {
  assert.match(agent, /md:hidden sticky top-0/);
  assert.match(agent, /backdrop-blur-md/);
  assert.match(agent, /setMobileTab\('build'\)/);
  assert.match(agent, /openUnderstood/);
  assert.match(conversation, /min-h-0/);
});

test('chat does not expose internal lifecycle jargon as primary navigation', () => {
  const primary = agent.slice(agent.indexOf('return <div className={\`h-dvh'), agent.length);
  assert.doesNotMatch(primary, />READY_FOR_SETTLEMENT</);
  assert.doesNotMatch(primary, />REQUEST_TO_JOIN</);
});

test('the visual convergence does not replace current authority or workbench behavior', () => {
  assert.match(agent, /bg-ks001-surface sp-life-canvas/);
  assert.match(agent, /NewWorkButton/);
  assert.match(agent, /UnderstoodWorkbench/);
  assert.match(agent, /AgreementShaping/);
});
