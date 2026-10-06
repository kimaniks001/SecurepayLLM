import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const controller = fs.readFileSync(new URL('../src/features/community/controller.ts', import.meta.url), 'utf8');
const community = fs.readFileSync(new URL('../src/features/community/CommunityExperience.tsx', import.meta.url), 'utf8');
const agentGateway = fs.readFileSync(new URL('../src/api/securepay/agent/index.ts', import.meta.url), 'utf8');

test('Circle conversation has a real persisted quick-message path', () => {
  assert.match(community, /Message the Circle/);
  assert.match(community, /onSendMessage/);
  assert.match(controller, /submitCircleMessage/);
  assert.match(controller, /community\.circles\.objects\.create/);
  assert.match(controller, /'DISCUSSION'/);
  assert.doesNotMatch(controller, /localStorage|sessionStorage/);
});

test('quick Circle messages preserve coordination-only authority', () => {
  assert.match(community, /A Circle message is coordination, not an Agreement decision/);
  assert.doesNotMatch(controller.slice(controller.indexOf('async submitCircleMessage'), controller.indexOf('openCircleComposer')), /agreementGateway|moneyGateway|payment|release/);
});

test('KS001 enters through the authenticated Circle-bound conversation contract', () => {
  assert.match(agentGateway, /createCircleConversation/);
  assert.match(agentGateway, /community\/circles\/\$\{segment\(circleId\)\}\/ks001\/conversations/);
  assert.match(agentGateway, /auth: 'required'/);
  assert.match(community, /shared context/);
  assert.match(community, /private conversations stay separate/);
});
