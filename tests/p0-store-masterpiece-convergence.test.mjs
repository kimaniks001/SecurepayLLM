import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const living = source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const store = source('src/features/store/StoreExperience.tsx');
const home = source('src/components/StoreHome.tsx');
const runtime = source('src/RuntimeApp.tsx');
const agent = source('src/features/agent/AgentExperience.tsx');
const intent = source('src/features/experience/entryIntent.ts');
const review = source('src/features/store/StoreMasterpieceLayoutReview.tsx');

test('P0: authenticated Store is mounted inside the ONE actual Living Workspace shell', () => {
  assert.match(living, /data-workspace-frozen-layout/);
  assert.match(living, /data-masterpiece-digital-store/);
  assert.match(living, /<StoreExperience \{\.\.\.storeIntegration\} embedded/);
  assert.match(living, /<LiveKs001Session controller=\{liveController!\}/);
  assert.match(living, /<LiveWorkResultPanel/);
  assert.match(living, /aria-label="Workspace tool rail"/);
  assert.match(living, /storeEverOpened/);
  assert.match(living, /aria-hidden=\{!storeOpen\}/);
});

test('P0: preview Store has an explicit route, reused Store component and NO fake backend', () => {
  assert.match(runtime, /(?:work\|vision\|circle\|community\|store)/);
  assert.match(living, /isStoreLayoutReviewRoute/);
  assert.match(living, /#\/preview\/living-workspace\/store/);
  assert.match(living, /<StoreMasterpieceLayoutReview/);
  assert.match(living, /!signedIn \|\| !storeIntegration/);
  assert.match(review, /<StoreHome/);
  assert.match(review, /embedded/);
  assert.match(review, /data-p0-layout-review-only/);
  assert.match(review, /no live Store backend/);
  assert.match(review, /Nothing was published, sent or changed/);
  assert.doesNotMatch(review, /createStoreGateway|fetch\(|createOffer\(/);
});

test('P0: opening or closing Store never navigates to a second application shell', () => {
  const start = living.indexOf("if (name === 'Stores' && !request && signedIn && storeIntegration)");
  const end = living.indexOf('setPhase4Journey(null);', start);
  assert.ok(start > 0 && end > start);
  const openAction = living.slice(start, end);
  assert.match(openAction, /setStoreOpen\(true\)/);
  assert.doesNotMatch(openAction, /window\.location\.(?:hash|assign|replace)/);
  assert.doesNotMatch(openAction, /storeKs001ConversationReturn/);
  assert.match(living, /storeReturnScreen\.current = screen/);
  assert.match(living, /closeEmbeddedStore\('chat'\)/);
  assert.match(living, /closeEmbeddedStore\('result'\)/);
});

test('P0: Store uses its existing full-feature controllers but no duplicate NavBar', () => {
  assert.match(store, /createStoreController\(gateway, trustedMediaOrigin\)/);
  assert.match(store, /if \(embedded\) \{/);
  assert.match(store, /data-store-embedded-body/);
  assert.match(store, /!embedded && <NavBar/);
  assert.match(store, /<StoreManagementHome/);
  assert.match(store, /<DigitalStoreSetup/);
  assert.match(store, /<StoreEnquiryInbox/);
  assert.match(store, /<StoreConnectionsHome/);
  assert.match(store, /<StoreCustomerConnections/);
  assert.match(store, /<OfferBuilderView/);
  assert.match(store, /<StoreProfileView/);
  assert.match(store, /<OfferToTradeHandoff/);
  assert.match(home, /embedded = false/);
  assert.match(home, /Find a real Store or offer/);
});

test('P0: canonical Store-to-KS001 source, new work and Agreement remain authoritative', () => {
  assert.match(living, /await beginNewWork\(workServices\(\)\)/);
  assert.match(living, /await liveController\.useOffer\(fact\)/);
  assert.match(living, /verified\.source\.sourceId!==fact\.sourceId/);
  assert.match(living, /verified\.enquiryContext\?\.enquiryId!==fact\.enquiryId/);
  assert.match(living, /readDraft\(current\.conversationId\?\?undefined\)/);
  assert.match(living, /writeDraft\(id,text\)/);
  assert.match(living, /LiveWorkResultPanel/);
  assert.match(living, /enquiryContext=\{liveState\?\.enquiryContext\?\?null\}/);
  assert.match(living, /returnToSavedWork\(workServices\(\),conversationId\)/);
});

test('P0: public Store links and direct branded shops remain separate from private KS001', () => {
  assert.match(runtime, /isAuthenticatedStoreWorkspaceEntry/);
  assert.match(runtime, /status === 'signed-in'/);
  assert.match(runtime, /onPreviewHost/);
  assert.match(runtime, /identityStagingReady/);
  assert.match(runtime, /storeIntegration=\{api/);
  assert.match(runtime, /<AgentExperience/);
  assert.match(store, /parseDigitalStoreAddressRoute/);
  assert.match(store, /publicDigitalAddress\(slug\)/);
  assert.match(store, /publicDigitalAddressForKs\(selectedSellerKs\)/);
});

test('P0: previously approved other-area source offers and Business KS are not lost', () => {
  assert.match(agent, /enterWorkspaceStoreOffer/);
  assert.match(agent, /storeWorkspaceOfferEntry\(canonicalKsNumber,offerId\)/);
  assert.match(intent, /consumeWorkspaceStoreOfferEntry/);
  assert.match(living, /initialOfferRoute=\{initialEmbeddedStoreOffer\}/);
  assert.match(store, /consumeFirstStoreOffer/);
  assert.match(intent, /consumeBusinessVisionEntry/);
  assert.match(agent, /visionBoardController\.loadForOwner\(externalBusinessVisionOwner\)/);
});

test('P0: refreshing an access token cannot erase a buyer\'s unfinished Store enquiry', () => {
  assert.match(store, /sessionEpoch\.status === 'signed-out'/);
  assert.doesNotMatch(store, /previousStoreSession\.current !== sessionEpoch/);
  assert.match(store, /previousSessionStatus\.current !== sessionEpoch\.status/);
  assert.match(store, /sessionEpoch=\{privateStoreSessionEpoch\.current\}/);
  assert.doesNotMatch(store, /sessionEpoch=\{sessionEpoch\}/);
});

test('P0: Day 4 New Work, Saved Work and mobile navigation are preserved', () => {
  assert.match(living, /data-day4-new-work/);
  assert.match(living, /data-day4-saved-work/);
  assert.match(living, /data-day4-mobile-agreement/);
  assert.match(living, /navigationLocked=\{workActionBusy\}/);
  assert.match(living, /openingComposerText/);
  assert.match(living, /beginNewWork\(workServices\(\)\)/);
  assert.match(living, /returnToSavedWork\(workServices\(\),conversationId\)/);
});

test('P0: modified TS/TSX modules must parse, complete typecheck/build still required', () => {
  const paths = [
    'src/RuntimeApp.tsx',
    'src/features/agent/AgentExperience.tsx',
    'src/features/experience/entryIntent.ts',
    'src/features/living-workspace/Phase1LivingWorkspacePreview.tsx',
    'src/features/store/StoreExperience.tsx',
    'src/components/StoreHome.tsx',
    'src/features/store/StoreMasterpieceLayoutReview.tsx',
  ];
  for (const path of paths) {
    const result = ts.transpileModule(source(path), {
      fileName:path, reportDiagnostics:true,
      compilerOptions:{ target:ts.ScriptTarget.ES2022,
        jsx:ts.JsxEmit.ReactJSX, module:ts.ModuleKind.ESNext },
    });
    const errors=(result.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
    assert.equal(errors.length,0,path+': '+errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join(' | '));
  }
});
