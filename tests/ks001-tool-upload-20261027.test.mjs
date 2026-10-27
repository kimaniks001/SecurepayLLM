import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const tray=read('src/features/living-workspace/UniversalSourceTray.tsx');
const workspace=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const sources=read('src/features/sources/controller.ts');
const gateway=read('src/api/securepay/agent/index.ts');
const client=read('src/api/securepay/http/index.ts');

test('My Work accepts canonical source-service file bounds; Vision has a separate bound',()=>{
  assert.match(tray,/MAX_DOCUMENT_BYTES=15\*1024\*1024/);
  assert.match(tray,/MAX_PHOTO_BYTES=10\*1024\*1024/);
  assert.match(tray,/MAX_TEXT_PREVIEW_BYTES=2_000_000/);
  assert.match(tray,/MAX_VISION_ASSET_BYTES=2_097_152/);
  assert.match(tray,/file.size>maxBytes/);
});

test('a new file cannot inherit a prior successful server source or fake addition',()=>{
  assert.match(tray,/setPending\(null\).*pendingFile.current=null;setServerSource\(null\)/);
  assert.match(tray,/setUploadState\('idle'\).*setServerSource\(null\)/);
  assert.doesNotMatch(tray,/>\+ Add \{tool==='Photos'\?'photo':'document'\}<\/button>/);
  assert.match(tray,/>\+ Send another \{tool==='Photos'\?'photo':'document'\}<\/button>/);
  assert.match(tray,/gateway\.uploadSource\(targetConversationId,tool==='Photos'\?'PHOTO':'DOCUMENT',file\)/);
});

test('My Work keeps multipart upload genuine and handles 413 limits honestly',()=>{
  assert.match(gateway,/new FormData\(\)/);
  assert.match(gateway,/form.append\('file', file, file.name\)/);
  assert.match(client,/isFormData \? \(options.body as FormData\)/);
  assert.match(sources,/error.status === 413/);
});

test('Vision asset saving uses its own permissioned store, not My Work source authority',()=>{
  assert.match(tray,/Save \{tool==='Photos'\?'photo':'document'\} to Vision/);
  assert.match(tray,/dreamsGateway\.uploadAsset\(/);
  assert.match(tray,/visionConversationGateway\.createConversation\(\)/);
  assert.match(workspace,/visionConversationGateway=\{mode==='vision'&&signedIn&&!mockSignedIn\?gateway:undefined\}/);
  assert.match(workspace,/onEnsureConversation=\{async\(\)=>\{/);
});

test('failed files show file-specific retry, no invented understanding',()=>{
  assert.match(tray,/serverSource\.failureReason/);
  assert.match(tray,/Retry reading this \{tool==='Photos'\?'photo':'document'\}/);
  assert.match(tray,/serverSource.extractionStatus==='FAILED'/);
});
