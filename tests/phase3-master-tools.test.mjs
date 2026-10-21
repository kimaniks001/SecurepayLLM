import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const sources=read('src/features/living-workspace/UniversalSourceTray.tsx');
const people=read('src/features/living-workspace/PeopleInvitationsTool.tsx');
const dates=read('src/features/living-workspace/DateTimeTool.tsx');
const board=read('src/features/living-workspace/PreviewWorkNotes.tsx');
const relayA=read('api/preview-agent.js');
const relayB=read('api/preview-workspace.js');
test('Five useful tools stay on the existing eight-entry Shelf, with original three-part layout',()=>{
 for(const t of ['People & Invitations','Photos','Documents','Places','Date & Time','Stores','Quick Assist','Money'])
   assert.ok(shell.includes("name: '"+t+"'"),t);
 for(const preserved of ['data-workspace-frozen-layout','aria-label="Workspace tool rail"','aria-label="KS001 conversation"','aria-label="Living result"','xl:w-[290px]','md:w-[35%]','Pin tool shelf','Unpin tool shelf'])
   assert.ok(shell.includes(preserved),preserved);
 assert.match(shell,/createAgentController\(gateway/);
 assert.match(shell,/createFormationController\(gateway\)/);
 assert.doesNotMatch(shell,/setMessages\(/);
});
test('Local People entry cannot verify a guessed KS identity or send invitations',()=>{
 assert.match(people,/localPreview&&?return|if\(localPreview\)return/);
 assert.match(people,/KS identity not verified/);
 assert.match(people,/Participation not accepted/);
 assert.match(people,/No invitation was sent/);
 assert.match(shell,/onCheckKs=\{gateway&&!uiOnlyPreview/);
 assert.match(shell,/onLocalProposal=\{uiOnlyPreview\?text/);
});
test('Photographs use real thumbnail data, local provenance, and never require GPS',()=>{
 assert.match(sources,/reader\.readAsDataURL\(file\)/);
 assert.match(sources,/image\/jpeg','image\/png/);
 assert.match(sources,/pending\.thumbnail/);
 assert.match(sources,/onLocalProposal\?\.\(/);
 assert.doesNotMatch(sources,/GPS metadata required|must have GPS|navigator\.geolocation\.getCurrentPosition/);
 assert.match(board,/View selected photo/);
});
test('Documents label selection distinct from processing, with safe text-only snippet',()=>{
 assert.match(sources,/file\.type==='text\/plain'\|\|file\.type==='text\/csv'/);
 assert.match(sources,/No document extraction has taken place/);
 assert.match(sources,/sourceIngestionErrorText/);
 assert.match(board,/Read selected text/);
 assert.match(board,/not uploaded or examined/);
});
test('Places distinguish purpose, entrance and unauthorised sharing',()=>{
 assert.match(sources,/Pickup or destination/);
 assert.match(sources,/Delivery entrance/);
 assert.match(sources,/onLocalProposal\?\.\(\{kind:'Places'/);
 assert.match(sources,/Not saved or shared/);
 assert.match(sources,/mapSelection/);
 assert.match(sources,/No automatic GPS collection/);
});
test('Date & Time preserves local timezone and proposal authority',()=>{
 for(const text of ['Today','Tomorrow','Choose date','Add a time','More timing options'])assert.ok(dates.includes(text),text);
 assert.match(dates,/current\.setDate\(current\.getDate\(\)\+days\)/);
 assert.match(dates,/Device time zone:/);
 assert.match(dates,/not yet an agreed contractual commitment/);
 assert.match(dates,/not agreed or saved/i);
 assert.doesNotMatch(dates,/Date\.parse\(draft\.day\)|toISOString\(\)\.slice\(0,10\)/);
});
test('Tool proposals return to the same local Check and keep editable correction; no preview write',()=>{
 assert.match(shell,/setPreviewNotes\(notes=>\[\.\.\.notes/);
 assert.match(shell,/exampleId:phase2ExampleId/);
 assert.match(shell,/onLocalProposal=\{uiOnlyPreview\?addPreviewSource:undefined\}/);
 assert.match(shell,/closeTool\(\);\s*focusPreviewComposer\(\);/);
 assert.match(board,/onUpdate\(note\.id,draft\.trim\(\)\)/);
 assert.match(board,/onRemove\(note\.id\)/);
 assert.match(relayA,/Preview writes disabled until isolated staging is configured/);
 assert.match(relayB,/Preview writes disabled until isolated staging is configured/);
});
