import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const workspace = read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const people = read('src/features/living-workspace/PeopleInvitationsTool.tsx');
const check = read('src/features/living-workspace/LiveWorkResultPanel.tsx');

test('people and recorded roles flow into existing People & Invitations tool',()=>{
  assert.match(workspace,/map\(p=>\(\{name:p\.name,role:p\.role\}\)\)/);
  assert.match(people,/typeof person==='string'\?person:person\.name/);
  assert.match(people,/if\(proposedRole&&!role\.trim\(\)\)setRole\(proposedRole\)/);
  assert.match(people,/onPrepare\(message\)/);
  assert.match(people,/No invitation was sent/);
});

test('live SecurePay Check keeps People visible, proposed and actionable',()=>{
  assert.match(check,/aria-label="People and proposed roles"/);
  assert.match(check,/onClick=\{onOpenPeople\}/);
  assert.match(workspace,/onOpenPeople=\{\(\)=>openTool\('People & Invitations'\)\}/);
  assert.match(check,/Identity not linked · participation not accepted/);
  assert.match(check,/Identity linked · participation not accepted/);
  assert.match(check,/not mean the person has joined or agreed/);
});

test('the existing authorised agreement invite remains a separate ceremony',()=>{
  const invite=read('src/features/living-workspace/AgreementInviteInsideWorkspace.tsx');
  assert.match(invite,/ensureFreshSession/);
  assert.match(invite,/matched\?\.isCreator===true/);
  assert.match(invite,/Only the authorised creator can invite someone/);
});
