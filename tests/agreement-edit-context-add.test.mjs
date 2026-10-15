import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const panel=source('src/features/living-workspace/LiveWorkResultPanel.tsx');
const workspace=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const tray=source('src/features/living-workspace/UniversalSourceTray.tsx');

test('Editing a draft fact has an obvious + Add that does not replace written correction',()=>{
  assert.match(panel,/onAddToFact: \(label:string\)=>void/);
  assert.match(panel,/editingFact===item\.label\?<form/);
  assert.match(panel,/onClick=\{\(\)=>onAddToFact\(item\.label\)\}/);
  assert.match(panel,/Add photo, document, place or KS Number to /);
  assert.match(panel,/Send correction/);
  assert.match(panel,/Your written correction stays here until you send it/);
});
test('Contextual Add offers photo, document and place; KS Number only for People',()=>{
  assert.match(workspace,/openFactSourcePicker\(label: string\)/);
  assert.match(workspace,/onAddToFact=\{openFactSourcePicker\}/);
  assert.match(workspace,/\['Photos','Documents','Places',\.\.\.\(supportingFact\.label==='People'\?\['People & Invitations'\]:\[\]\)\]/);
  assert.match(workspace,/name==='People & Invitations'\?'KS Number'/);
  assert.match(workspace,/Nothing changes the Agreement automatically/);
});
test('A new supporting source stays scoped to the originating conversation',()=>{
  assert.match(workspace,/setSupportingFact\(\{label,conversationId:liveConversationId\}\)/);
  assert.match(workspace,/supportingFact\?\.conversationId===liveConversationId/);
  assert.match(workspace,/source\.conversationId!==liveConversationId/);
  assert.match(workspace,/setSupportingFact\(null\)/);
});
test('Supporting material is only suggested to KS001, not silently accepted as a draft or identity',()=>{
  assert.match(workspace,/Please assess it as possible supporting material for that detail/);
  assert.match(workspace,/Do not silently change accepted terms, verify a party merely from a photo/);
  assert.match(workspace,/const factInstruction=supportingLabel/);
  assert.match(workspace,/await liveController\.send\('For source '\+source\.sourceArtifactId/);
  assert.match(tray,/Selected locally · Unverified/);
  assert.match(tray,/A processed source is not evidence accepted by an Agreement or Money authority/);
});
test('The base source and identity pathways are reused, not replaced by new backdoors',()=>{
  assert.match(workspace,/activeTool==='People & Invitations'\?<PeopleInvitationsTool/);
  assert.match(workspace,/<UniversalSourceTray agreementPlaces=/);
  assert.match(workspace,/onContinueTask=\{async\(source,task\)=>/);
  assert.doesNotMatch(panel,/selectKsIdentity|uploadSource|window\.location/);
});
