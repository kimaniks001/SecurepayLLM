import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const modelSource = read('src/mini/miniModel.ts');
const compiled = ts.transpileModule(modelSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
}).outputText;
const exported = {};
runInNewContext(compiled, { exports: exported, Number, Intl });
const {
  emptyMiniDraft, miniDraftIssue, miniReviewSummary,
  miniStorableDraft, miniRestoreDraft, formatMiniAmount
} = exported;

test('a regular sale and payment require a human-supplied description and amount', () => {
  for (const intent of ['sell', 'pay']) {
    const draft = emptyMiniDraft(intent);
    assert.equal(miniDraftIssue(draft), 'description');
    draft.description = 'A product or service with unspecified contents';
    assert.equal(miniDraftIssue(draft), 'amount');
    draft.amount = '1,240';
    assert.equal(miniDraftIssue(draft), null);
    assert.equal(miniReviewSummary(draft).amount, 'KSh 1,240');
  }
});

test('a contribution can leave amount open; bad or zero financial claims are rejected', () => {
  const draft = emptyMiniDraft('collect');
  draft.description = 'An agreed, clearly described collection purpose';
  assert.equal(miniDraftIssue(draft), null);
  assert.equal(miniReviewSummary(draft).amount, 'Contributor chooses amount');
  for (const amount of ['0', '-50', '12.345', '1e5', 'NaN', 'Infinity', '  ']) {
    draft.amount = amount;
    assert.equal(miniDraftIssue(draft), amount.trim() ? 'amount-format' : null, amount);
  }
  assert.equal(formatMiniAmount('12,500.50'), 'KSh 12,500.5');
});

test('every review remains an unissued local draft, regardless of parties and items', () => {
  for (const object of ['a single product', 'several bags by weight', 'a booked service', 'a group collection']) {
    const draft = { ...emptyMiniDraft('sell'), description: object, amount: '80', counterparty: 'Unverified participant' };
    assert.equal(miniDraftIssue(draft), null);
    assert.equal(miniReviewSummary(draft).status, 'LOCAL_DRAFT_NOT_ISSUED');
  }
});

test('explicit browser persistence strips counterparty and refuses malformed saved records', () => {
  const original = { ...emptyMiniDraft('sell'), description: 'Ordinary goods', amount: '250', counterparty: 'Sensitive private contact', note: 'Collect today' };
  const stored = miniStorableDraft(original);
  assert.equal('counterparty' in stored, false);
  const recovered = miniRestoreDraft(stored);
  assert.equal(recovered?.counterparty, '');
  assert.equal(recovered?.note, 'Collect today');
  assert.equal(miniRestoreDraft({ ...stored, intent: 'unknown' }), null);
  assert.equal(miniRestoreDraft({ ...stored, description: 'x'.repeat(401) }), null);
});

test('Phase 1 is a separate multi-page preview, never a replaced main application', () => {
  const config = read('vite.config.ts');
  const main = read('src/main.tsx');
  const html = read('mini.html');
  const app = read('src/mini/MiniExperience.tsx');
  const host = read('mini-host-preview.html');
  assert.match(config, /main: fileURLToPath\(new URL\('\.\/index\.html'/);
  assert.match(config, /mini: fileURLToPath\(new URL\('\.\/mini\.html'/);
  assert.match(html, /src\/mini\/main\.tsx/);
  assert.match(main, /RuntimeApp\.tsx/);
  assert.match(app, /No invitation, payment or fund release happens here/);
  assert.doesNotMatch(app, /createPaymentIntent|settleAndRelease|fetch\(|window\.postMessage|trade\.ksNumber\s*=/);
  assert.doesNotMatch(app, /kenyan-trader-cohort|F01|TR-001|tomato|charger/i);
  assert.match(host, /iframe[^>]+sandbox="allow-scripts allow-same-origin allow-forms/);
  assert.match(host, /src="\/mini\.html\?embedded=1"/);
  const csp = JSON.parse(read('vercel.json'));
  assert.ok(csp.headers.some(h => h.source === '/mini.html' &&
    h.headers.some(x => x.key === 'Content-Security-Policy' && x.value.includes("frame-ancestors 'self'"))));
});

test('Mini phase 1 does not expose merchant fixtures or a fake funded/success status', () => {
  const ui = read('src/mini/MiniExperience.tsx');
  const all = modelSource + ui;
  assert.doesNotMatch(all, /FUNDED_HELD|RELEASE_AUTHORISED|SETTLED|Payment Ready|fundedSuccessfully/);
  assert.match(ui, /not yet connected to this Mini/);
  assert.match(ui, /No invitation, payment or fund release happens here/);
});

test('Mini is a compact pocket window without shrinking essential touch targets', () => {
  const css = read('src/mini/mini.css');
  const host = read('mini-host-preview.html');
  assert.match(css, /max-width:366px; min-height:min\(565px/);
  assert.match(host, /width:min\(342px,calc\(100vw - 28px\)\);height:min\(510px/);
  assert.match(host, /height:min\(530px,78dvh\)/);
  assert.match(host, /min-height:44px;min-width:44px/);
  assert.match(css, /\.spm-lang, \.spm-icon-btn[^\n]*min-height:44px/);
  assert.match(css, /font-size:16px/);
  assert.match(host, /resize:both/);
  assert.match(host, /@media\(max-width:550px\)/);
});
