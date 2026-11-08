import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const workspace=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const tray=read('src/features/living-workspace/UniversalSourceTray.tsx');
const runtime=read('src/RuntimeApp.tsx');

test('live Store cart is bound to the current work, rather than a workspace-global list',()=>{
  assert.match(workspace,/const storeScope=mode==='work' \? 'work:'\+\(liveConversationId\?\?'unsaved'\) : 'area:'\+mode/);
  assert.match(workspace,/const \[storeSelectionsByScope,setStoreSelectionsByScope\]/);
  assert.match(workspace,/const storeSelected=storeSelectionsByScope\[storeScope\]\?\?\[\]/);
  assert.match(workspace,/setStoreSelectionsByScope\(previous=>/);
  assert.match(workspace,/delete next\['work:unsaved'\]/);
  assert.doesNotMatch(workspace,/const \[storeSelected,setStoreSelected\]=useState<SelectionItem\[\]>\(\[\]\)/);
  assert.match(workspace,/previousStoreOwnerSignedIn\.current && !signedIn\)setStoreSelectionsByScope\(\{\}\)/);
});

test('original Store presentation and explicit KS001 handoff stay untouched',()=>{
  assert.match(workspace,/<CompactStoreBrowser/);
  assert.match(workspace,/<StoreExperience \{\.\.\.storeIntegration\}/);
  assert.match(workspace,/const discussCompactStoreCart=async/);
  assert.match(workspace,/selectionToKs001\(storeSelected,'agreement'\)/);
  assert.match(workspace,/await prepareEmbeddedStoreQuestion\(message\)/);
  assert.match(workspace,/onSelectionChange=\{setStoreSelected\}/);
  assert.match(workspace,/data-workspace-frozen-layout/);
});

test('source tray invalidates pending files and stale reads on a work switch',()=>{
  assert.match(tray,/const priorScope=useRef\(\{area,tool,isDemo,conversationId\}\)/);
  assert.match(tray,/previous\.conversationId!=null && previous\.conversationId!==conversationId/);
  assert.match(tray,/seq\.current\+\+/);
  assert.match(tray,/pendingFile\.current=null/);
  assert.match(tray,/setPending\(null\)/);
  assert.match(tray,/setServerSource\(null\)/);
  assert.match(tray,/const sequence=seq\.current;\s*setUploadState\('reading'\)/);
  assert.match(tray,/if\(seq\.current!==sequence\)return/);
});

test('real media label and declared place/entrance travel through the actual API call',()=>{
  assert.match(tray,/gateway\.uploadSource\(targetConversationId,tool==='Photos'\?'PHOTO':'DOCUMENT',file,caption\.trim\(\)\|\|undefined\)/);
  assert.match(tray,/const proposedPlace=placePurpose\+': '\+value/);
  assert.match(tray,/Entrance: '\+entrance\.trim\(\)/);
  assert.match(tray,/gateway\.createPlaceSource\(id,\{text:proposedPlace\}\)/);
  assert.match(tray,/area==='work'&&uploadState==='idle'/);
  assert.match(tray,/['"]Received by SecurePay · not yet understood['"]/);
});

test('the live route remains on a non-Vercel isolated staging host, not the sample-only UI',()=>{
  assert.match(runtime,/const onPreviewHost = typeof window !== 'undefined' && window\.location\.hostname\.endsWith\('\.vercel\.app'\)/);
  assert.match(runtime,/gateway=\{onPreviewHost \? previewAgentGateway : agentGateway\}/);
  assert.match(runtime,/if \(phase1Preview\) return <Phase1LivingWorkspacePreview/);
  assert.match(runtime,/return <HumanJourneysExperience \/>/);
});
