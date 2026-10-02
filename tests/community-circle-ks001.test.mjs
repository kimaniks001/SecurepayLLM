import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const agentGateway = fs.readFileSync(new URL('../src/api/securepay/agent/index.ts', import.meta.url), 'utf8');
const community = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');
const agent = fs.readFileSync(new URL('../src/features/agent/AgentExperience.tsx', import.meta.url), 'utf8');

test('Circle KS001 is an explicit authenticated Circle-only action', () => {
  assert.match(agentGateway, /createCircleConversation/);
  assert.match(agentGateway, /community\/circles\/\$\{segment\(circleId\)\}\/ks001\/conversations/);
  assert.match(agentGateway, /auth: 'required'/);
  assert.match(community, /Ask KS001/);
  assert.match(community, /cannot post, RSVP, commit anyone, create an Agreement, or move money/);
});

test('Circle invocation resumes the same real Agent conversation transport', () => {
  assert.match(agent, /gateway\.createCircleConversation\(circleId\)/);
  assert.match(agent, /controller\.resumeConversation\(created\.conversationId\)/);
});

test('general Community LIVE still has no KS001 button', () => {
  const liveStart = community.indexOf('<CommunityHome');
  const liveEnd = community.indexOf('circlesEntryLabel=', liveStart);
  assert.ok(liveStart >= 0 && liveEnd > liveStart);
  assert.doesNotMatch(community.slice(liveStart, liveEnd), /Ask KS001|onInvokeKs001/);
});
