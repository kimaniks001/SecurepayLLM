import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const shell=file('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const discovery=file('src/features/living-workspace/AgreementDiscovery.tsx');
const continuity=file('src/features/living-workspace/WorkspaceContinuityPanel.tsx');

test('live testing: My Agreements exists in the actual unchanged three-column workspace even during KS001 work',()=>{
 assert.match(shell,/aria-label="KS001 conversation"/);
 assert.match(shell,/aria-label="Living result"/);
 assert.match(shell,/data-workspace-frozen-layout/);
 assert.match(shell,/md:w-\[35%\] lg:max-w-\[460px\]/);
 assert.match(shell,/mode==='work' && workspaceGateways && <AgreementDiscovery/);
 assert.ok(shell.indexOf('<AgreementDiscovery')<shell.indexOf('mode===\'work\' && !openedAgreementId && liveWork?<LiveWorkResultPanel'),
   'Agreement entry is above the live result and not conditional on lack of conversation');
 assert.match(shell,/showEstablishedAgreements=\{false\}/);
 assert.match(continuity,/area==='work' && showEstablishedAgreements &&/);
});
test('live testing: idle, hover/focus or tap-to-peek, and explicit open are distinct, keyboard accessible states',()=>{
 for(const token of ['data-agreement-discovery','data-agreement-list','data-agreement-peek','data-agreement-full',
   'onMouseEnter','onFocus','onClick={()=>peek(a.agreementId)}','if(chosenId===id){if(onOpenInWorkspace)onOpenInWorkspace(id);else showFull(id);return;}',
   'aria-expanded','aria-pressed','role="dialog"','aria-modal="true"','aria-label="Close Agreement and return to KS001"'])
   assert.ok(discovery.includes(token),token);
 assert.match(discovery,/if\(event\.key==='Escape'\)/);
 assert.match(discovery,/returnFocus\.current\?\.focus\(\)/);
 assert.match(discovery,/if\(event\.key!=='Tab'\)return/);
 assert.match(discovery,/const requestedDetail=fullId \?\? chosenId/);
});
test('live testing: only current user backend Agreement reads, no made-up status or write authority',()=>{
 assert.match(discovery,/ensureFreshSession\(session,gateways\.auth\)/);
 assert.match(discovery,/currentUserAgreements\(0,20\)/);
 assert.match(discovery,/gateways\.agreements\.detail\(requestedDetail\)/);
 assert.match(discovery,/value\.overview\.agreementId!==requestedDetail/);
 assert.match(discovery,/session\.getSnapshot\(\)===identity/);
 assert.match(discovery,/index\.owner===identity/);
 assert.match(discovery,/detail\.owner===identity/);
 assert.match(discovery,/page\.totalElements/);
 assert.match(discovery,/Saved KS001 drafts are separate/);
 assert.doesNotMatch(discovery,/localStorage|sessionStorage|fetch\(|createAgentController|createFormationController|window\.location|acceptAgreement|releaseFunds|initiatePayment|send\(/);
});
test('live testing: full record uses detail DTO sections; reader remains non-mutating and dismissible',()=>{
 for(const tab of ['Overview','People','Terms','Milestones','Evidence','Money','History'])
   assert.match(discovery,new RegExp("'"+tab+"'"));
 for(const field of ['overview','participants','terms','milestones','documents','money','versionHistory','activity'])
   assert.match(discovery,new RegExp('verified\\.'+field));
 assert.match(discovery,/No funding, quotation, release or payment can be authorised from this reader/);
 assert.match(discovery,/No Agreement is changed/);
 assert.match(discovery,/setFullId\(null\)/);
 assert.match(discovery,/onClick=\{closeFull\}/);
});
