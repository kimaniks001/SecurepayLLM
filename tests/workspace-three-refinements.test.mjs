import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const live=read('src/features/living-workspace/LiveKs001Session.tsx');
const summary=read('src/features/living-workspace/LiveWorkResultPanel.tsx');
const mini=read('src/features/living-workspace/MiniContextInput.tsx');
const welcome=read('src/features/living-workspace/WorkspaceWelcome.tsx');

test('masterpiece is still the original four-area split, with real tool implementations',()=>{
 for(const area of ['My Work','Vision','Circle','Community'])assert.ok(shell.includes("'"+area+"'"),area);
 assert.match(shell,/aria-label="KS001 conversation"/);
 assert.match(shell,/aria-label="Living result"/);
 assert.match(shell,/md:w-\[35%\] lg:max-w-\[460px\]/);
 for(const name of ['Photos','Documents','Places','Date & Time','Quick Assist','Stores','People & Invitations','Money'])
  assert.ok(shell.includes("name: '"+name+"'"),name);
 for(const control of ['<UniversalSourceTray','<DateTimeTool','<PeopleInvitationsTool','<StoresTool','<UnifiedMoneyTool','<QuickSupportPanel'])
  assert.ok(shell.includes(control),control);
 assert.doesNotMatch(shell,/<PublicHome|<SignedOutHome|<WorkspaceToolTray/);
});

test('desktop shelf occupies layout width, collapses, pins, and avoids browser storage',()=>{
 assert.match(shell,/aria-label="Workspace tool rail"/);
 assert.match(shell,/data-tool-shelf/);
 assert.match(shell,/xl:static/);
 assert.match(shell,/xl:w-\[290px\]/);
 assert.match(shell,/aria-pressed=\{shelfPinned\}/);
 assert.match(shell,/xl:hidden/);
 assert.match(shell,/contextTools\.filter\(t=>t\.group==='add'\)/);
 assert.match(shell,/contextTools\.filter\(t=>t\.group==='do'\)/);
 assert.doesNotMatch(shell,/localStorage|sessionStorage/);
});
test('Chat, Summary and Tools use one canonical conversation, with no accepted-terms mutation',()=>{
 assert.match(shell,/const \[liveController\] = useState\(\(\) => gateway \? createAgentController/);
 assert.match(shell,/createFormationController\(gateway\)/);
 assert.match(shell,/source\.conversationId!==liveConversationId/);
 assert.match(shell,/onAddToFact=\{openFactSourcePicker\}/);
 assert.match(shell,/formationController\.load\(liveConversationId\)/);
 assert.match(shell,/latest\.data\.version!==expectedVersion/);
 assert.match(shell,/Do not amend accepted terms silently/);
 assert.match(summary,/editingVersion !== formation\.version/);
 assert.match(summary,/<MiniContextInput/);
 assert.match(mini,/type=\{kind==='date'\?'date'/);
 assert.match(mini,/type=\{kind==='date'\?'date':kind==='time'\?'time':kind==='money'\?'number'/);
 assert.match(live,/data-ks001-mini-answer/);
 assert.match(live,/<MiniContextInput/);
 assert.match(live,/controller\.send\('For your question/);
 assert.doesNotMatch(shell,/setFormationState|acceptAgreement\(/);
});
test('area welcomes live inside the existing conversation and yield to real work',()=>{
 assert.match(live,/state\.turns\.length===0 && !state\.conversationId && !draft\.trim\(\) && <WorkspaceWelcome area="work"/);
 assert.match(shell,/<WorkspaceWelcome area=\{mode\}/);
 for(const key of ['work','vision','circle','community'])assert.ok(welcome.includes(key+':{title:'),key);
 assert.match(welcome,/data-workspace-welcome=\{area\}/);
 assert.match(welcome,/motion-reduce:transition-none/);
 assert.match(welcome,/Nothing becomes an Agreement until it has been reviewed and accepted/);
 assert.match(shell,/Personalised KS001 conversation in this space needs an authorised connection/);
 assert.doesNotMatch(live,/fake reply|mock turn/i);
});
