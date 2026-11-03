import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const src = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const seller = src('src/features/store/StoreEnquiryInbox.tsx');
const buyer = src('src/features/store/StoreConnectionsHome.tsx');
const store = src('src/features/store/StoreExperience.tsx');
const agent = src('src/features/agent/AgentExperience.tsx');
const gateway = src('src/api/securepay/store/index.ts');
const runtime = src('src/RuntimeApp.tsx');
const action = src('src/features/notifications/NotificationsExperience.tsx');
const route = src('src/features/store/route.ts');
const management = src('src/components/StoreManagementHome.tsx');

test('Gate 4: real Store alerts navigate through the closed canonical OPEN_STORE action', () => {
  assert.ok(action.includes("actionKey === 'OPEN_STORE'"));
  assert.ok(action.includes("store.enquiry.received:"));
  assert.ok(action.includes("store.enquiry.responded:"));
  assert.ok(action.includes("/trader"));
  assert.ok(action.includes("/buyer"));
  assert.ok(action.includes("onNavigate('store')"));
  assert.ok(route.includes("parseStoreEnquiryRoute"));
  assert.ok(runtime.includes("store\\/enquiry\\/"));
  assert.ok(store.includes("openManageChooser()"));
  assert.ok(store.includes("focusedEnquiryId="));
});

test('Gate 4: no browser timer or alert is represented as actual push delivery', () => {
  assert.ok(buyer.includes("visibilitychange"));
  assert.ok(buyer.includes("clearInterval"));
  assert.ok(seller.includes("visibilitychange"));
  assert.ok(seller.includes("clearInterval"));
  assert.ok(seller.includes("External delivery is not guaranteed"));
  assert.ok(seller.includes("sessionEpoch"));
  assert.ok(seller.includes("businessScopeRef.current"));
  assert.ok(buyer.includes("sessionEpochRef.current"));
});

test('Gate 4: reply draft belongs to seller and optimistic revision must be confirmed', () => {
  assert.ok(seller.includes("gateway.businessEnquiryDraft"));
  assert.ok(seller.includes("gateway.personalEnquiryDraft"));
  assert.ok(seller.includes("gateway.saveBusinessEnquiryDraft"));
  assert.ok(seller.includes("gateway.savePersonalEnquiryDraft"));
  assert.ok(seller.includes("expectedVersion: versions[item.id]"));
  assert.ok(seller.includes("versions[item.id] !== latest.version"));
  assert.ok(seller.includes("Draft was NOT confirmed saved"));
  assert.ok(seller.includes("Reply draft saved privately"));
  assert.ok(seller.includes("Reply"));
  assert.ok(seller.includes("Decline"));
  for (const method of ['personalEnquiryDraft','savePersonalEnquiryDraft',
    'businessEnquiryDraft','saveBusinessEnquiryDraft']) {
    assert.ok(gateway.includes(method));
    assert.ok(runtime.includes("'"+method+"'"));
  }
});

test('Gate 4: work is saved BEFORE showing recovery elsewhere, never created from a pointer', () => {
  const save = agent.indexOf('await gateway.saveBuild(selected.conversationId)');
  const navigate = agent.indexOf("window.location.hash = '#/preview/living-workspace/work'", save);
  assert.ok(save > 0 && navigate > save, 'save must complete before mobile navigation');
  assert.ok(agent.includes('storeLivingWorkspaceEntry(selected.conversationId)'));
  assert.ok(agent.includes('onResumeSavedWork={conversationId =>'));
  assert.ok(agent.includes("readDraft(state.conversationId)"));
  assert.ok(buyer.includes('gateway.savedWorkForEnquiry(enquiryId)'));
  assert.ok(buyer.includes('saved.enquiryId !== enquiryId'));
  assert.ok(buyer.includes('onResumeSavedWork(saved.conversationId)'));
  assert.ok(gateway.includes("savedWorkForEnquiry:"));
  assert.ok(gateway.includes("auth: 'required'"));
  assert.ok(runtime.includes("'savedWorkForEnquiry'"));
});

test('Gate 4: Agreement progress stays the existing lifecycle, not a Store acceptance', () => {
  assert.ok(store.includes("onNavigate('agreements')"));
  assert.ok(store.includes("A reply is only a reply"));
  assert.ok(management.includes("agreementProgress"));
  assert.ok(seller.includes("This does not accept an Agreement"));
  assert.ok(agent.includes('storeLivingWorkspaceEntry'));
});

test('Gate 4: modified TS/TSX modules transpile syntactically (full typecheck and device tests remain mandatory)', () => {
  const paths = [
    'src/api/securepay/store/dto.ts', 'src/api/securepay/store/index.ts',
    'src/features/store/StoreEnquiryInbox.tsx',
    'src/features/store/StoreConnectionsHome.tsx',
    'src/features/store/StoreExperience.tsx',
    'src/features/store/route.ts',
    'src/features/notifications/NotificationsExperience.tsx',
    'src/features/agent/AgentExperience.tsx',
    'src/components/StoreManagementHome.tsx',
    'src/RuntimeApp.tsx',
  ];
  for (const path of paths) {
    const result = ts.transpileModule(src(path), {
      fileName: path, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext },
    });
    const errors = (result.diagnostics ?? []).filter(x => x.category === ts.DiagnosticCategory.Error);
    assert.equal(errors.length, 0, path + ': ' +
      errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, ' ')).join(' | '));
  }
});
