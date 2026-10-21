import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const bundleOf = async contents => {
  const result = await build({
    stdin: { contents, resolveDir: process.cwd() },
    bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic',
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  return mod.exports;
};

const api = await bundleOf(`
export { resolveConversationHumanNext, resolveWorkspaceHumanNext, chooseHumanNext } from './src/features/shell/humanNext';
`);

const formation = over => ({
  conversationId: 'c1', version: 1, digest: 'd', stage: 'BUILD', reviewable: false, confirmable: false,
  reviewBlockedReason: null, confirmationBlockedReason: null, summary: 'Bathroom tiling',
  what: [], who: [], money: [], when: [], responsibilities: [], conditions: [], notIncluded: [],
  origin: null, openPoints: [], question: null, readingSources: [], ...over,
});

test('conversation HumanNext uses the server-owned question before review or resume', () => {
  const next = api.resolveConversationHumanNext({
    conversationId: 'c1', title: 'Bathroom tiling', meaningfulWork: true, unsavedWork: true,
    formation: formation({ question: { id: 'q1', text: 'When should Peter be paid?', choices: [], blocksSetUp: true, alreadyAsked: false, openPointIds: [] } }),
  });
  assert.equal(next.source, 'formation-question');
  assert.equal(next.headline, 'When should Peter be paid?');
  assert.equal(next.primaryLabel, 'Answer');
});

test('conversation HumanNext exposes review only when the authoritative formation is reviewable', () => {
  const next = api.resolveConversationHumanNext({
    conversationId: 'c1', title: 'Bathroom tiling', meaningfulWork: true, unsavedWork: false,
    formation: formation({ stage: 'UNDERSTOOD', reviewable: true, openPoints: [] }),
  });
  assert.equal(next.source, 'formation-review');
  assert.equal(next.headline, 'Your agreement is ready to review.');
  assert.equal(next.primaryLabel, 'Review agreement');
});

test('conversation HumanNext does not fabricate work', () => {
  assert.equal(api.resolveConversationHumanNext({
    conversationId: null, title: 'Your conversation', meaningfulWork: false, unsavedWork: false, formation: null,
  }), null);
});

test('workspace HumanNext preserves authoritative priority: formal issue, invitation, then Agreement action', () => {
  const attention = [{ id: 'a1', kind: 'agreement_changed', title: 'Bathroom tiling', detail: 'Peter proposed a change.', actionLabel: 'Review', actionValue: 'x', agreementId: 'agr-1' }];
  const invitation = [{ invitationId: 'inv-1', actionable: true, inviterLine: 'Lucy invited you', agreementTitle: 'Chama', roleLine: 'Contributor', amountLine: null, expiryLine: null, statusNote: null }];
  const problem = [{ id: 'r1', title: 'Bathroom tiling', detail: 'Response due 14 Oct', stateLabel: 'Open', agreementId: 'agr-1' }];

  assert.equal(api.resolveWorkspaceHumanNext({ problems: problem, invitations: invitation, attentionItems: attention }).source, 'formal-review');
  assert.equal(api.resolveWorkspaceHumanNext({ problems: [], invitations: invitation, attentionItems: attention }).source, 'invitation');
  const changed = api.resolveWorkspaceHumanNext({ problems: [], invitations: [], attentionItems: attention });
  assert.equal(changed.source, 'agreement-next-action');
  assert.equal(changed.primaryLabel, 'Review change');
});

test('HumanNext selection is presentation ranking only and chooses the strongest real candidate', () => {
  const resume = api.resolveConversationHumanNext({
    conversationId: 'c1', title: 'Bathroom tiling', meaningfulWork: true, unsavedWork: true, formation: null,
  });
  const issue = api.resolveWorkspaceHumanNext({
    problems: [{ id: 'r1', title: 'Bathroom tiling', detail: '', stateLabel: 'Open', agreementId: 'agr-1' }],
    invitations: [], attentionItems: [],
  });
  assert.equal(api.chooseHumanNext(resume, issue).source, 'formal-review');
});

test('Continue is navigation rather than stale authority: workspace-backed cards are re-read before routing', async () => {
  const agent = await readFile('src/features/agent/AgentExperience.tsx', 'utf8');
  assert.match(agent, /const rereadWorkspaceHumanNext = async/);
  assert.match(agent, /Promise\.allSettled\(\[\s*agreementGateway\.hub\(\),\s*agreementGateway\.home\(\),\s*agreementGateway\.myInvitations\(0, 20\)/);
  assert.match(agent, /const workspaceBacked = candidate\.source === 'formal-review'/);
  assert.match(agent, /const fresh = chooseHumanNext\(freshWorkspace, conversationHumanNext\)/);
  assert.match(agent, /routeHumanNext\(fresh\)/);
  assert.match(agent, /That changed\. Here's what needs you now\./);
});

test('Phase 2 shell removes permanent module navigation and cognitive-mode tabs without deleting routes', async () => {
  const [nav, agent, workspace, home] = await Promise.all([
    readFile('src/components/NavBar.tsx', 'utf8'),
    readFile('src/features/agent/AgentExperience.tsx', 'utf8'),
    readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8'),
    readFile('src/components/SignedOutHome.tsx', 'utf8'),
  ]);
  assert.match(nav, /data-human-shell-nav/);
  assert.doesNotMatch(nav, /mobileNavItems|const navItems/);
  assert.match(home, /What would you like to/);
  assert.match(home, /<ConversationInput/);
  assert.match(home, /<SourceMenu/);
  assert.doesNotMatch(home, /publicMode && <section aria-label="Quick starts"/, 'the public entry remains one simple KS001 composer');
  assert.doesNotMatch(agent, /setMobileTab|data-understood-plane|Refresh what SecurePay understands/);
  assert.match(agent, /data-understood-details/);
  assert.match(agent, /resolveWorkspaceHumanNext/);
  assert.match(agent, /resolveConversationHumanNext/);
  assert.match(workspace, /goHome: \(\) => onLeave\(\)/);
  assert.match(agent, /view === 'agreements'/);
  assert.match(agent, /view === 'money'/);
  assert.match(agent, /view === 'store'/);
  assert.match(agent, /view === 'community'/);
  assert.match(agent, /view === 'vision-board'/);
});
