import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
const conversation = await readFile('src/features/conversation/ConversationSurface.tsx', 'utf8');
const bubbles = await readFile('src/components/MessageBubble.tsx', 'utf8');
const sourceMenu = await readFile('src/features/sources/ui/SourceMenu.tsx', 'utf8');

test('first-time chat has one obvious human focus: KS001 conversation', () => {
  assert.match(agent, /KS001/);
  assert.match(agent, /helping you make this clear/);
  assert.match(conversation, /aria-label="Conversation with KS001"/);
  assert.match(conversation, /max-w-4xl/);
  assert.match(conversation, /sp-life-canvas/);
});

test('structured understanding is one tap away instead of permanently competing with chat', () => {
  assert.match(agent, /desktopUnderstoodOpen/);
  assert.match(agent, /What SecurePay understands/);
  assert.match(agent, /aria-expanded=\{desktopUnderstoodOpen\}/);
  assert.match(agent, /desktopUnderstoodOpen \? 'md:flex' : 'md:hidden'/);
  assert.match(agent, /A working summary — not the Agreement yet/);
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

test('chat remains usable on mobile without a permanent desktop side panel', () => {
  assert.match(agent, /md:hidden sticky top-0/);
  assert.match(agent, /backdrop-blur-md/);
  assert.match(agent, /Build/);
  assert.match(agent, /Understood/);
  assert.match(conversation, /min-h-0/);
});

test('chat does not expose internal lifecycle jargon as primary navigation', () => {
  const primary = agent.slice(agent.indexOf('return <div className={`h-dvh'), agent.length);
  assert.doesNotMatch(primary, />READY_FOR_SETTLEMENT</);
  assert.doesNotMatch(primary, />REQUEST_TO_JOIN</);
});

test('chat presents one obvious next action and hides maintenance utilities', () => {
  assert.match(agent, /data-human-next-step/);
  assert.match(agent, /bg-forest-700/);
  assert.match(agent, /More options/);
  assert.match(agent, /Refresh understanding/);
  const nextStepBlock = agent.slice(agent.indexOf('data-human-next-step'), agent.indexOf('{bringPlanOpen'));
  assert.ok(nextStepBlock.indexOf('Review agreement') < nextStepBlock.indexOf('More options'));
});
