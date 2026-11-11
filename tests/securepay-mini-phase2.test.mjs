import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const load = path => {
  const js = ts.transpileModule(read(path), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const out = {};
  runInNewContext(js, { exports: out, Number, Intl, Set });
  return out;
};
const captures = load('src/mini/miniCapture.ts');
const draftModel = load('src/mini/miniModel.ts');

test('only bounded plain text is actually read; PDF/Word remain unverified local references', () => {
  const { miniDocumentStatus: status } = captures;
  assert.equal(status('offer.txt', 128), 'readable-text');
  assert.equal(status('notes.MD', 100), 'readable-text');
  assert.equal(status('invoice.csv', 200), 'readable-text');
  assert.equal(status('quote.pdf', 1_000_000), 'attachment-only');
  assert.equal(status('contract.DOCX', 1_000_000), 'attachment-only');
  assert.equal(status('invoice.txt', 257 * 1024), 'too-large');
  assert.equal(status('file.pdf', 11 * 1024 * 1024), 'too-large');
  assert.equal(status('script.html', 128), 'unsupported');
  assert.equal(status('unknown.zip', 128), 'unsupported');
  assert.equal(status('.hidden', 0), 'unsupported');
});

test('user-reviewed document/dictation snippets are bounded and retain no control characters', () => {
  const { miniCaptureText: clean, miniMergeUserDescription: merge } = captures;
  assert.equal(clean('  good\n  quality   material \t for pickup  '), 'good quality material for pickup');
  assert.equal(clean('Text\u0000\u0007\u007f next'), 'Text next');
  assert.equal(clean('Y'.repeat(500)).length, 400);
  assert.equal(merge('', '3 kg   of items'), '3 kg of items');
  assert.equal(merge('Stock item', ' 20 pieces '), 'Stock item — 20 pieces');
  assert.ok(merge('X'.repeat(360), 'Y'.repeat(360)).length <= 400);
});

test('barcode is reference only: bounded printable code, never a verified product or price', () => {
  const { miniBarcodeValue: code } = captures;
  assert.equal(code('  5012345678900 '), '5012345678900');
  assert.equal(code('ABCD-001'), 'ABCD-001');
  for (const raw of ['', '  ', '12', 'a'.repeat(97), 'A\nB123', '\u0000ABCD'])
    assert.equal(code(raw), null);
  const tray = read('src/mini/MiniCaptureTools.tsx');
  assert.match(tray, /barcode alone does not verify the item/i);
  assert.doesNotMatch(tray, /lookupProduct|searchPrice|verifyStock|fetch\(/);
});

test('quantity is optional but an explicit quantity must be a positive bounded number', () => {
  const { emptyMiniDraft, miniDraftIssue, miniReviewSummary } = draftModel;
  const draft = { ...emptyMiniDraft('sell'), description: 'Ordinary goods', amount: '1,250' };
  assert.equal(miniDraftIssue(draft), null);
  draft.quantity = '3';
  draft.unit = 'bags';
  assert.equal(miniDraftIssue(draft), null);
  assert.equal(miniReviewSummary(draft).quantity, '3');
  assert.equal(miniReviewSummary(draft).unit, 'bags');
  for (const invalid of ['-2', '0', 'abc', '2e3', '1.2345', '99999999']) {
    draft.quantity = invalid;
    assert.equal(miniDraftIssue(draft), 'quantity', invalid);
  }
  for (const valid of ['1', '0.5', '12.25', '9999999']) {
    draft.quantity = valid;
    assert.equal(miniDraftIssue(draft), null, valid);
  }
});

test('explicit local save never persists source files, audio or counterparty identity', () => {
  const { emptyMiniDraft, miniStorableDraft, miniRestoreDraft } = draftModel;
  const draft = { ...emptyMiniDraft('sell'), description: 'Offer', amount: '320', quantity: '2', unit: 'items', counterparty: 'Do not persist buyer' };
  const safe = miniStorableDraft(draft);
  assert.deepEqual(Object.keys(safe).sort(), ['amount', 'description', 'intent', 'note', 'quantity', 'unit']);
  assert.equal(miniRestoreDraft(safe)?.counterparty, '');
  assert.equal(miniRestoreDraft(safe)?.quantity, '2');
  assert.equal(miniRestoreDraft({ ...safe, quantity: 'x'.repeat(20) }), null);
});

test('the pocket Mini shows opt-in sources without expanding default landing or claiming live data', () => {
  const ui = read('src/mini/MiniExperience.tsx');
  const tray = read('src/mini/MiniCaptureTools.tsx');
  assert.match(ui, /<MiniCaptureTools language=\{lang\}/);
  assert.match(ui, /<details className="spm-extra">/);
  assert.match(tray, /More ways to add details/);
  assert.match(tray, /'document' \| 'voice' \| 'barcode' \| 'store'/);
  assert.match(tray, /not extracted in this preview/i);
  assert.match(tray, /browser.s speech provider may process your voice/i);
  assert.match(tray, /No live Store lookup/i);
  assert.doesNotMatch(ui + tray, /window\.postMessage|createPaymentIntent|confirmPayment|settleAndRelease|fetch\(/);
});

test('existing full SecurePay and authority APIs remain unchanged in the Phase 2 source surface', () => {
  const config = read('vite.config.ts');
  const main = read('src/main.tsx');
  const html = read('mini.html');
  const apiRefs = read('src/mini/MiniCaptureTools.tsx');
  assert.match(config, /mini: fileURLToPath/);
  assert.match(main, /RuntimeApp\.tsx/);
  assert.match(html, /src\/mini\/main\.tsx/);
  assert.doesNotMatch(apiRefs, /createSecurePayApi|moneyGateway|ledger|bankGateway|Authorization:/);
});

test('same-origin owner frame loads Vite modules and exposes a visible failure fallback', () => {
  const host = read('mini-host-preview.html');
  const vercel = JSON.parse(read('vercel.json'));
  assert.match(host, /id="mini-frame"[^>]*sandbox="allow-scripts allow-same-origin/);
  assert.match(host, /src="\/mini\.html\?embedded=1"/);
  assert.match(host, /id="mini-load-fallback"/);
  assert.match(host, /querySelector\('\.spm-root'\)/);
  assert.match(host, /mini could not open inside this window/i);
  assert.match(host, /same-origin sample/i);
  const miniFramePolicy = vercel.headers.find(rule => rule.source === '/mini.html')
    ?.headers.find(h => h.key === 'Content-Security-Policy')?.value;
  assert.ok(miniFramePolicy?.startsWith("frame-ancestors 'self'"));
  // Day 10 is an explicitly isolated branch for the named Estate development site.
  assert.ok(miniFramePolicy?.includes(' https://varsity-dev.estate.ke'));
  assert.ok(!miniFramePolicy?.includes(' https://varsity.estate.ke'));
  assert.ok(!miniFramePolicy?.includes(' https://securepay.ke'));
  assert.ok(!miniFramePolicy?.includes(' *'));
  assert.doesNotMatch(host, /src="https?:\/\//);
});
