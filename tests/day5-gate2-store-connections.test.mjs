import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const src = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const gateway = src('src/api/securepay/store/index.ts');
const dto = src('src/api/securepay/store/dto.ts');
const runtime = src('src/RuntimeApp.tsx');
const store = src('src/features/store/StoreExperience.tsx');
const home = src('src/features/store/StoreConnectionsHome.tsx');
const buyer = src('src/features/store/StoreCustomerConnections.tsx');
const inbox = src('src/features/store/StoreEnquiryInbox.tsx');

test('Gate 2: buyer and merchant operations are authenticated, public discovery is not', () => {
  for (const name of [
    'myFavourites','saveFavourite','removeFavourite','createStoreEnquiry',
    'myCustomerEnquiries','myStoreEnquiries','businessStoreEnquiries',
    'respondStoreEnquiry','respondBusinessStoreEnquiry',
  ]) {
    assert.match(gateway, new RegExp(name + '.*auth: \\'required\\''));
    assert.match(runtime, new RegExp('\\b' + name + '\\b'));
  }
  assert.match(gateway, /publicDigitalAddressForKs:.*auth: 'none'/);
  assert.match(dto, /clientRequestId: string/);
});

test('Gate 2: a trader receives an invitation to create THEIR Store, not an unrelated Home', () => {
  assert.match(home, /Add my favourite/);
  assert.match(home, /#\/store\/open/);
  assert.match(home, /YOUR digital Store/);
  assert.match(home, /Copy invitation/);
  assert.match(home, /wa.me\/\?text=/);
  assert.match(home, /nothing has been sent/i);
  assert.match(runtime, /window.location.hash === '#\/store\/open'/);
  assert.match(store, /controller.openBuilder\(null\)/);
});

test('Gate 2: saving favourites and Store enquiries uses real backend authority', () => {
  assert.match(buyer, /gateway\.myFavourites\(\)/);
  assert.match(buyer, /gateway\.saveFavourite\(sellerKs\)/);
  assert.match(buyer, /gateway\.removeFavourite\(sellerKs\)/);
  assert.match(buyer, /gateway\.createStoreEnquiry\(/);
  assert.match(buyer, /clientRequestId: key/);
  assert.match(buyer, /e\.clientRequestId === draft\.clientRequestId/);
  assert.match(buyer, /onRequestSignIn\(\)/);
  assert.doesNotMatch(buyer, /orderCreated|paymentReady|reserveStock/);
});

test('Gate 2: seller inbox shows real statuses, replies and explicit declines', () => {
  assert.match(inbox, /gateway\.myStoreEnquiries\(\)/);
  assert.match(inbox, /gateway\.businessStoreEnquiries\(businessKs\)/);
  assert.match(inbox, /respondBusinessStoreEnquiry/);
  assert.match(inbox, /respondStoreEnquiry/);
  assert.match(inbox, /'DECLINED'/);
  assert.match(inbox, /'REPLIED'/);
  assert.match(inbox, /No customer enquiries have reached this Store yet/);
  assert.doesNotMatch(inbox, /Notification sent|Order confirmed|Payment successful/);
});

test('Gate 2: session changes invalidate private inbox and customer projections', () => {
  for (const code of [buyer, inbox, home]) assert.match(code, /sessionEpoch/);
  assert.match(store, /useSyncExternalStore\(session\.subscribe, session\.getSnapshot\)/);
  assert.match(store, /setCustomerDraft\(emptyStoreCustomerDraft\)/);
  assert.match(store, /<StoreConnectionsHome/);
  assert.match(store, /<StoreCustomerConnections/);
  assert.match(store, /<StoreEnquiryInbox/);
});

test('Gate 2: modified TS and TSX files transpile without syntax errors', () => {
  for (const file of [
    'src/features/store/StoreConnectionsHome.tsx',
    'src/features/store/StoreCustomerConnections.tsx',
    'src/features/store/StoreEnquiryInbox.tsx',
    'src/features/store/StoreExperience.tsx',
    'src/components/StoreHome.tsx',
    'src/components/StoreProfileView.tsx',
    'src/components/StoreManagementHome.tsx',
    'src/RuntimeApp.tsx',
    'src/api/securepay/store/index.ts',
    'src/api/securepay/store/dto.ts',
  ]) {
    const code = src(file);
    const results = ts.transpileModule(code, {
      fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext },
    });
    const errors = (results.diagnostics ?? []).filter(x => x.category === ts.DiagnosticCategory.Error);
    assert.equal(errors.length, 0, file + ': ' + errors.map(x => ts.flattenDiagnosticMessageText(x.messageText, ' ')).join(' | '));
  }
});
