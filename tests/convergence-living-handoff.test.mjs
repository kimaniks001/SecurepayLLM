import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const src = path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const entry=src('src/features/experience/entryIntent.ts');
const agent=src('src/features/agent/AgentExperience.tsx');
const preview=src('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const runtime=src('src/RuntimeApp.tsx');
const ks001=src('src/features/living-workspace/LiveKs001Session.tsx');

async function entryModule() {
  const code=await build({stdin:{contents:"export * from './src/features/experience/entryIntent';",resolveDir:process.cwd()},
    bundle:true,write:false,format:'cjs',platform:'node'});
  const m={exports:{}};
  new Function('require','module','exports',code.outputFiles[0].text)(createRequire(import.meta.url),m,m.exports);
  return m.exports;
}

test('one-shot handoffs preserve exact opaque conversation ID and consume at most once',async()=>{
 const e=await entryModule();
 assert.throws(()=>e.storeLivingWorkspaceEntry('  '),/conversation is required/);
 assert.throws(()=>e.storeKs001ConversationReturn('  '),/conversation is required/);
 e.storeLivingWorkspaceEntry(' conv-a ');
 assert.equal(e.consumeLivingWorkspaceEntry(),'conv-a');
 assert.equal(e.consumeLivingWorkspaceEntry(),null);
 e.storeKs001ConversationReturn(' conv-b ');
 assert.equal(e.consumeKs001ConversationReturn(),'conv-b');
 assert.equal(e.consumeKs001ConversationReturn(),null);
 assert.equal(e.consumeWorkspaceMoneyReturn(),null);
});
test('KS001 offers a deliberate handoff only for a settled signed-in server conversation',()=>{
 assert.match(agent,/signedIn && state\.conversationId && <div[^>]*data-convergence-work-entry/);
 assert.match(agent,/if \(!signedIn \|\| !state\.conversationId \|\| state\.busy \|\| state\.pending/);
 assert.match(agent,/sourcesState\.phase === 'submitting' \|\| sourcesState\.phase === 'checking'/);
 assert.match(agent,/Send or copy any unfinished message first/);
 assert.match(agent,/storeLivingWorkspaceEntry\(state\.conversationId\)/);
 assert.match(agent,/window\.location\.hash = '#\/preview\/living-workspace\/work'/);
});
test('Entering and leaving resumes exact server conversation with a fresh controller; rejection is not success',()=>{
 assert.match(preview,/const fromKs001=consumeLivingWorkspaceEntry\(\)/);
 assert.match(preview,/const conversationId=moneyHint \? moneyHint\.conversationId : fromKs001/);
 assert.match(preview,/if\(!signedIn \|\| !liveController\)/);
 assert.match(preview,/liveController\.resumeConversation\(conversationId\)\.then/);
 assert.match(preview,/storeKs001ConversationReturn\(snapshot\.conversationId\)/);
 assert.match(agent,/const \[externalReturnConversationId\] = useState\(\(\) => consumeKs001ConversationReturn\(\)\)/);
 assert.match(agent,/if \(!signedIn\) \{/);
 assert.match(agent,/controller\.resumeConversation\(externalReturnConversationId\)/);
 assert.match(agent,/Use Saved Work; nothing was changed/);
 assert.match(preview,/No Agreement was changed/);
 assert.match(preview,/authorisedResumedConversation\(conversationId,current\)/);
 assert.match(agent,/authorisedResumedConversation\(externalReturnConversationId,current\)/);
});
test('a resolved read promise is NOT access when the server context was refused',async()=>{
 const e=await entryModule(),can=e.authorisedResumedConversation;
 const valid={conversationId:'same-id',context:{status:'ready',data:{version:0,entities:[]}}};
 assert.equal(can('same-id',valid),true,'empty authorised Trade Context is valid');
 for(const denied of [
   {conversationId:'same-id',context:{status:'error',data:null}},
   {conversationId:'same-id',context:{status:'loading',data:{version:2}}},
   {conversationId:'same-id',context:{status:'ready',data:null}},
   {conversationId:'wrong-id',context:{status:'ready',data:{version:2}}},
   {conversationId:null,context:{status:'ready',data:{version:2}}}
 ]) assert.equal(can('same-id',denied),false,'do not accept failed, stale, null or wrong-ID context');
 assert.match(agent,/\.catch\(\(\) => \{ if \(active\)/);
 assert.match(preview,/setLiveStarted\(false\)/);
 assert.match(preview,/setLiveWork\(false\)/);
});
test('A handoff is a hint, never a persistent identifier or backend mutation',()=>{
 for(const s of [entry,agent,preview]) assert.doesNotMatch(s,/encodeURIComponent\(externalReturnConversationId\)|localStorage\.setItem\(['"]workspace/);
 assert.doesNotMatch(entry,/window\.location\.hash|fetch\(/);
 assert.ok(runtime.includes('if (phase1Preview) {'));
 assert.ok(runtime.includes('conceptReview={gate5BReview}'));
 assert.ok(runtime.includes('gateway={gate5BReview?undefined:previewAgentGateway}'));
 assert.match(preview,/if\(!mayLeaveDream\(\)\)return false/);
});

test('KS001 question emphasis detects a genuine last question without rewriting it',async()=>{
 const {outputFiles}=await build({
   stdin:{contents:"export {lastQuestion} from './src/features/living-workspace/LiveKs001Session';",resolveDir:process.cwd()},
   bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',
 });
 const m={exports:{}};
 new Function('require','module','exports',outputFiles[0].text)(createRequire(import.meta.url),m,m.exports);
 const last=m.exports.lastQuestion;
 assert.deepEqual(last('I can help. Where should the chairs be delivered?'),
   {before:'I can help. ',question:'Where should the chairs be delivered?'});
 assert.deepEqual(last('Terms found.\nWhat must we confirm?'),
   {before:'Terms found.\n',question:'What must we confirm?'});
 assert.deepEqual(last('When would you like delivery?'),{before:'',question:'When would you like delivery?'});
 assert.equal(last('We have a draft. No question yet.'),null);
 assert.equal(last('We have a draft? Here is my recommendation.'),null);
 assert.match(ks001,/const result=lastQuestion\(text\)/);
 assert.match(ks001,/<strong className="font-semibold text-forest-900">\{result.question\}<\/strong>/);
});
