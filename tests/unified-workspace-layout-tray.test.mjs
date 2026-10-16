import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const agent=read('src/features/agent/AgentExperience.tsx');
const surface=read('src/features/conversation/ConversationSurface.tsx');
const tray=read('src/features/agent/WorkspaceToolTray.tsx');

test('actual KS001 messages live left; server-owned draft stays in separate work region',()=>{
  assert.match(agent,/const workspaceDetails = \(<div className="space-y-3">/);
  assert.match(agent,/status=\{workspaceEmpty \? workspaceDetails : undefined\}/);
  assert.match(agent,/workPane=\{!workspaceEmpty \? workspaceDetails : undefined\}/);
  assert.match(surface,/<section aria-label="KS001 conversation" data-workspace-chat/);
  assert.match(surface,/<aside aria-label="My Work — live Agreement" data-workspace-result/);
  assert.match(surface,/<div ref=\{content\}[\s\S]*?<div role="log"/);
  assert.match(surface,/<Composer disabled=\{disabled\}/);
  assert.match(surface,/aria-label="Workspace panels"/);
  assert.match(surface,/KS001 conversation/);
  assert.match(surface,/My Work/);
  assert.match(surface,/grid-cols-1 md:grid-cols-\[minmax\(0,0.41fr\)_minmax\(0,0.59fr\)\]/);
  assert.doesNotMatch(agent,/status=\{<div className="space-y-3">/, 'Do not insert the Agreement into the chat status anymore');
});

test('real composer uses rich tools rather than legacy SourceMenu picker',()=>{
  assert.match(agent,/<WorkspaceToolTray/);
  assert.doesNotMatch(agent,/<SourceMenu/);
  assert.match(agent,/onPhoto=\{file =>/);
  assert.match(agent,/onDocument=\{file =>/);
  assert.match(agent,/onPlace=\{\(\) => openDeclared\('place'\)\}/);
  assert.match(agent,/onDateTime=\{\(\) => setDateTimeOpen\(true\)\}/);
  assert.match(agent,/onStores=\{\(\) => navigateTo\('store'\)\}/);
  assert.match(agent,/onMoney=\{\(\) => navigateTo\('money'\)\}/);
  for(const label of ['Photos','Documents','Places','Date & Time','Quick Assist','Stores','People & Invitations','Money']) {
    assert.ok(tray.includes("name:'"+label+"'"),'Missing rich tool '+label);
  }
  assert.match(tray,/createPortal\(<>/,'tools overlay must escape the composer backdrop and mobile sticky header');
  assert.match(tray,/<QuickSupportPanel/);
  assert.match(tray,/<PeopleInvitationsTool/);
  assert.match(tray,/onPrepare:\(request:string\)=>Promise<void>/);
  assert.match(tray,/It never accepts an Agreement, invites someone or moves money/);
});
