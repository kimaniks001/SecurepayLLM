import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `
      export { AgreementQuickPreview } from './src/components/AgreementQuickPreview';
      export { createElement } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
});

const { createRequire } = await import('node:module');
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { AgreementQuickPreview, createElement, renderToStaticMarkup } = module.exports;

const base = {
  id: 'agr-kamau',
  title: 'Plumbing repair',
  purpose: 'Kitchen leak plumbing repair',
  attentionRequired: false,
  counterparty: 'Joseph Kamau',
  counterpartyRole: 'Provider',
  amount: 'KES 12,000',
  completion: '24 Oct 2026',
  status: 'active',
  statusLabel: 'Active',
  nextAction: 'Confirm revised delivery date',
  lastActivity: 'Kamau shared an update',
  lastActivityTime: 'Today',
  version: 'v2',
  location: 'Karen',
};

const render = (agreement) => renderToStaticMarkup(createElement(AgreementQuickPreview, {
  agreement,
  onClose() {},
  onOpenAgreement() {},
  onOpenMoney() {},
  onAskKS001() {},
}));

test('quick preview answers what, who, value, status and next without full Agreement detail', () => {
  const html = render(base);
  assert.match(html, /Agreement preview/);
  assert.match(html, /Plumbing repair/);
  assert.match(html, /Kitchen leak plumbing repair/);
  assert.match(html, /Joseph Kamau/);
  assert.match(html, /KES 12,000/);
  assert.match(html, /Active/);
  assert.match(html, /Confirm revised delivery date/);
  assert.match(html, /Money/);
  assert.match(html, /Ask SecurePay/);
  assert.match(html, /Open Agreement/);
});

test('attention rises only for Agreement states that genuinely need the participant', () => {
  const ordinary = render(base);
  assert.doesNotMatch(ordinary, /Needs your attention/);

  const needsMe = render({
    ...base,
    status: 'waiting_for_me',
    attentionRequired: true,
    statusLabel: 'Waiting for your confirmation',
    nextAction: 'Review current version',
  });
  assert.match(needsMe, /Needs your attention/);
  assert.match(needsMe, /Waiting for your confirmation/);
  assert.match(needsMe, />Review</);

  const lifecycleButNotAttention = render({
    ...base,
    status: 'change_requested',
    attentionRequired: false,
    statusLabel: 'Change recorded',
    nextAction: 'Waiting for Peter',
  });
  assert.doesNotMatch(lifecycleButNotAttention, /Needs your attention/);
  assert.doesNotMatch(lifecycleButNotAttention, />Needs you</);
  assert.match(lifecycleButNotAttention, />Changed</);
});

test('quiet Agreements get a calm next state instead of manufactured urgency', () => {
  const html = render({ ...base, status: 'completed', statusLabel: 'Completed', nextAction: '—' });
  assert.match(html, /Nothing needs you right now/);
  assert.doesNotMatch(html, /Needs your attention/);
});

test('Agreement Hub keeps browsing state mounted and opens preview before detail', async () => {
  const hub = await readFile('src/components/AgreementHub.tsx', 'utf8');
  assert.match(hub, /const \[search, setSearch\]/);
  assert.match(hub, /const \[filter, setFilter\]/);
  assert.match(hub, /const \[previewId, setPreviewId\]/);
  assert.match(hub, /onOpen=\{handleOpenPreview\}/);
  assert.match(hub, /<AgreementQuickPreview/);
  assert.match(hub, /previewTriggerRef/);
  assert.match(hub, /document\.activeElement/);
  assert.match(hub, /requestAnimationFrame/);
  const card = await readFile('src/components/AgreementCard.tsx', 'utf8');
  assert.doesNotMatch(card, /data-agreement-id/);
});

test('preview handoffs retain selected Agreement context for Money and KS001', async () => {
  const app = await readFile('src/App.tsx', 'utf8');
  assert.match(app, /handleOpenMoneyFromAgreementPreview/);
  assert.match(app, /setOpenAgreementId\(id\)/);
  assert.match(app, /moneyAgreementContextId/);
  assert.match(app, /moneyWithAgreementContext/);
  assert.match(app, /agreementId: agreement\.id/);
  assert.match(app, /handleAskKS001FromAgreementPreview/);
  assert.match(app, /You’re asking about \$\{agreement\.title\} with \$\{agreement\.counterparty\}/);
});


test('real signed-in Agreement Hub carries backend preview authority and canonical handoffs', async () => {
  const workspace = await readFile('src/features/workspace/WorkspaceExperience.tsx', 'utf8');
  const view = await readFile('src/features/workspace/view.ts', 'utf8');
  assert.match(workspace, /findInHub\(hubData, id\)/);
  assert.match(workspace, /onOpenMoney=\{openHubMoney\}/);
  assert.match(workspace, /onAskKS001=\{askHubKs001\}/);
  assert.match(workspace, /agentGateway\.switchAccessGrant\(conversationId, id\)/);
  assert.match(workspace, /openMoneyFor\(\{/);
  assert.match(view, /purpose: dto\.purpose \|\| undefined/);
  assert.match(view, /attentionRequired: dto\.attentionRequired/);
});

test('full Agreement capabilities remain present behind deliberate Open Agreement', async () => {
  const detail = await readFile('src/components/AgreementDetail.tsx', 'utf8');
  for (const label of ['Overview', 'Terms', 'People', 'Documents', 'Activity', 'Changes', 'Money', 'Progress', 'Calendar & tags', 'Support']) {
    assert.ok(detail.includes(label), `missing full Agreement capability: ${label}`);
  }
  const quick = await readFile('src/components/AgreementQuickPreview.tsx', 'utf8');
  assert.match(quick, /Open Agreement/);
  assert.doesNotMatch(quick, /rail selection|provider architecture|settlement detail|fee breakdown|payment history/i);
});

test('preview interaction has keyboard, close and touch affordances', async () => {
  const quick = await readFile('src/components/AgreementQuickPreview.tsx', 'utf8');
  assert.match(quick, /event\.key === 'Escape'/);
  assert.match(quick, /aria-modal="true"/);
  assert.match(quick, /aria-label="Close agreement preview"/);
  assert.match(quick, /min-h-11 min-w-11/);
  assert.match(quick, /min-h-12/);
});
