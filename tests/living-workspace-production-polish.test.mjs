import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const workspace=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const persona=read('src/features/living-workspace/personas.ts');
const live=read('src/features/living-workspace/LiveKs001Session.tsx');
const agreement=read('src/features/living-workspace/LiveWorkResultPanel.tsx');

test('original masterpiece composition remains frozen',()=>{
  for(const label of ['My Work','Vision','Circle','Community'])
    assert.ok(workspace.includes("'"+label+"'"),'Missing original nav '+label);
  assert.match(workspace,/aria-label="KS001 conversation"/);
  assert.match(workspace,/aria-label="Living result"/);
  assert.match(workspace,/md:w-\[35%\] lg:max-w-\[460px\]/);
  assert.match(workspace,/aria-label="Mobile workspace panels"/);
  assert.match(workspace,/aria-label="Choose a tool"/);
  assert.match(workspace,/const tools = \[/);
  for(const name of ['Photos','Documents','Places','Date & Time','Quick Assist','Stores','People & Invitations','Money']) {
    assert.ok(workspace.includes("name: '"+name+"'"),'Missing tool '+name);
  }
  assert.match(workspace,/<LiveWorkResultPanel/);
  assert.match(workspace,/onCorrectFact=\{async \(label,previous,replacement\)=>/);
});
test('real KS001 Work is the default, with server-owned terms and safe failure',()=>{
  assert.match(workspace,/useState\(Boolean\(gateway\)\)/);
  assert.match(workspace,/createAgentController\(gateway/);
  assert.match(workspace,/createFormationController\(gateway\)/);
  assert.match(workspace,/formationController\.load\(liveConversationId\)/);
  assert.match(workspace,/<LiveKs001Session controller=\{liveController!\} opening=\{persona\.opening\}/);
  assert.doesNotMatch(workspace,/Try mock sign-in|Try real KS001 \(Work only\)|Return to demonstration|DEMO ACCOUNT/);
  assert.doesNotMatch(workspace,/Chair delivery|200 chairs for delivery/);
  assert.doesNotMatch(workspace,/setMessages\(/);
  assert.match(workspace,/Ask KS001 in My Work/);
  assert.match(workspace,/Nothing will be sent until the connection returns/);
  assert.match(live,/controller\.retry\(\)/);
  assert.match(live,/controller\.send\(next\)/);
  assert.match(agreement,/Display title for this view only · not saved to the Agreement/);
});
test('KS001 presents area-appropriate human guidance without claiming new model authority',()=>{
  for(const role of ['Agreement Maker','Dream Companion','Circle Facilitator','Community Guide'])
    assert.ok(persona.includes("'"+role+"'"),role);
  assert.match(persona,/UI guidance\. This is NOT a substitute/);
  assert.match(workspace,/\{areaLabels\[mode\]\} · \{persona\.label\}/);
  assert.match(workspace,/\{persona\.opening\}/);
  assert.match(workspace,/\{persona\.objective\}/);
  assert.match(workspace,/\{persona\.dataBoundary\}/);
});
