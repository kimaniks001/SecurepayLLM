import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const src = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const buyer = src('src/features/store/StoreCustomerConnections.tsx');
const home = src('src/features/store/StoreConnectionsHome.tsx');
const store = src('src/features/store/StoreExperience.tsx');
const controller = src('src/features/agent/controller.ts');
const gateway = src('src/api/securepay/agent/index.ts');
const dto = src('src/api/securepay/agent/dto.ts');
const agent = src('src/features/agent/AgentExperience.tsx');
const review = src('src/features/store/StoreEnquiryCheck.tsx');
const runtime = src('src/RuntimeApp.tsx');

test('Gate 3: buyer explicitly opens recorded, non-declined enquiry with canonical Store identifiers', () => {
  assert.match(buyer, /onContinueWithKs001\(confirmed\)/);
  assert.match(buyer, /confirmed.status !== 'DECLINED'/);
  assert.match(home, /onContinueWithKs001\(enquiry\)/);
  assert.match(home, /enquiry.status !== 'DECLINED'/);
  assert.match(store, /enquiryId: enquiry.id/);
  assert.match(store, /sourceId: enquiry.offerId/);
  assert.match(store, /sourceOwnerKsNumber: enquiry.sellerKsNumber/);
  assert.doesNotMatch(store, /amount:\s*enquiry.offeredPriceMinorSnapshot/);
});

test('Gate 3: ONLY canonical authenticated source selection binds the buyer enquiry', () => {
  assert.match(controller, /sourceType: 'STORE_LISTING'/);
  assert.match(controller, /await gateway.selectCommercialSource\(conversationId/);
  assert.match(controller, /await gateway.bindStoreEnquiryContext!\(conversationId, fact.enquiryId\)/);
  assert.match(controller, /linked.enquiryId !== fact.enquiryId/);
  assert.match(controller, /sourceSelectionActionId: actionId/);
  assert.match(controller, /return attemptOfferSelection\(failure.fact, failure.actionId\)/);
  assert.match(controller, /await continueAfterSourceSelection\(actionId!\)/);
  assert.match(controller, /return \{ status: 'selected', source: selection, amount: 'none' \}/);
  assert.match(gateway, /bindStoreEnquiryContext:.*\(id: string, enquiryId: string\)/);
  assert.match(gateway, /method: 'POST', body: \{ enquiryId \}, auth: 'required'/);
  assert.match(runtime, /'bindStoreEnquiryContext', 'readStoreEnquiryContext'/);
  assert.match(dto, /interface SelectedStoreEnquiryContextDto/);
});

test('Gate 3: resumed conversation re-reads server-owned source and buyer enquiry', () => {
  assert.match(controller, /await gateway.currentCommercialSource\(conversationId\)/);
  assert.match(controller, /await gateway.readStoreEnquiryContext\(conversationId\)/);
  assert.match(controller, /detail.offerId === selected.sourceId/);
  assert.match(controller, /detail.sellerKsNumber === selected.sourceOwnerKsNumber/);
  assert.match(controller, /enquiryContext: null/);
  assert.match(gateway, /currentCommercialSource:/);
});

test('Gate 3: the SecurePay Check is proposal-only and keeps existing Agreement authority', () => {
  assert.match(agent, /<StoreEnquiryCheck context=\{state.enquiryContext\}/);
  assert.match(agent, /<SourceReference source=\{\{/);
  assert.match(review, /proposed, not agreed/);
  assert.match(review, /Nothing is agreed, booked or funded|No stock or money is committed/);
  assert.doesNotMatch(review, /Payment successful|Agreement established|Seller accepted/);
  assert.match(controller, /if \(fact.enquiryId\)/);
});

test('Gate 3: updated TS modules parse (full typecheck and staging remain mandatory)', () => {
  for (const path of [
    'src/features/agent/controller.ts',
    'src/features/agent/AgentExperience.tsx',
    'src/features/store/StoreExperience.tsx',
    'src/features/store/StoreConnectionsHome.tsx',
    'src/features/store/StoreCustomerConnections.tsx',
    'src/features/store/StoreEnquiryCheck.tsx',
    'src/features/discovery/ui/SourceReference.tsx',
    'src/api/securepay/agent/index.ts',
    'src/api/securepay/agent/dto.ts',
    'src/RuntimeApp.tsx',
  ]) {
    const code = src(path);
    const result = ts.transpileModule(code, {
      fileName: path, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext },
    });
    const errors = (result.diagnostics ?? []).filter(x => x.category === ts.DiagnosticCategory.Error);
    assert.equal(errors.length, 0, path + ': ' + errors.map(x => ts.flattenDiagnosticMessageText(x.messageText, ' ')).join(' | '));
  }
});
