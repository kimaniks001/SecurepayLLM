import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['src/api/securepay/agreement-messages/index.ts'],
  platform: 'node', format: 'esm', bundle: true, write: false,
});
const api = await import('data:text/javascript;base64,' +
  Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('H2 uses B4 canonical authenticated messages, not a new chat or KS001 transcript', async () => {
  const requests = [];
  const gateway = api.createAgreementMessagesGateway({
    request: async (path, options) => {
      requests.push({ path, options });
      return [];
    },
  });
  await gateway.thread('agreement-1');
  await gateway.send('agreement-1', 'I will send the photos tomorrow.', 'uuid-for-retry');
  assert.match(requests[0].path, /^\/api\/v1\/agreements\/agreement-1\/messages\?/);
  assert.equal(requests[0].options.auth, 'required');
  assert.equal(requests[1].path, '/api/v1/agreements/agreement-1/messages');
  assert.equal(requests[1].options.auth, 'required');
  assert.equal(requests[1].options.method, 'POST');
  assert.deepEqual(requests[1].options.body, {
    body: 'I will send the photos tomorrow.', clientMessageId: 'uuid-for-retry',
  });
});

test('Real Mini Living Agreement exposes Conversation with canonical API only', async () => {
  const [detail, workspace, agent, runtime, apiSource, panel] = await Promise.all([
    readFile('src/components/AgreementDetail.tsx', 'utf8'),
    readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8'),
    readFile('src/features/agent/AgentExperience.tsx', 'utf8'),
    readFile('src/RuntimeApp.tsx', 'utf8'),
    readFile('src/api/securepay/index.ts', 'utf8'),
    readFile('src/features/human-layer/AgreementConversationPanel.tsx', 'utf8'),
  ]);
  assert.match(detail, /conversationPanel/);
  assert.match(detail, /Conversation/);
  assert.match(detail, /primaryTabs\.filter\(t => t\.value !== 'conversation' \|\| !!conversationPanel\)/);
  assert.match(workspace, /<AgreementConversationPanel key=\{boltDetail\.id\} agreementId=\{boltDetail\.id\}/);
  assert.match(agent, /messagesGateway=\{agreementMessagesGateway\}/);
  assert.match(runtime, /withSessionRefresh\(api\.agreementMessages, \['thread', 'send'\]/);
  assert.match(apiSource, /agreementMessages: createAgreementMessagesGateway\(http\)/);
  assert.match(panel, /Messages are saved in SecurePay/);
  assert.doesNotMatch(panel, /onOpenAgreement|onClose|fakeMessage|demoMessages/);
});

test('Original Agreement conversation does not claim Money authority or amend terms', async () => {
  const panel = await readFile('src/features/human-layer/AgreementConversationPanel.tsx', 'utf8');
  assert.match(panel, /They do not change agreed terms or authorize payment/);
  assert.match(panel, /pending\.current/);
  assert.match(panel, /crypto\.randomUUID\(\)/);
  assert.match(panel, /result\.some\(x => x\.agreementId !== agreementId\)/);
  assert.doesNotMatch(panel, /authorisePayment|payNow|approveAgreement/);
});
