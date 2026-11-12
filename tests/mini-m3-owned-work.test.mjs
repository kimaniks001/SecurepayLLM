import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  miniSaveServerBuild,miniListServerBuilds,miniResumeServerBuild
} from '../src/mini/miniSavedWorkFlow.mjs';
import {
  miniOwnedBuildList,miniOwnedResumeConfirmed
} from '../src/mini/miniOwnedWork.mjs';
const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const id='00000000-0000-4000-8000-000000000077';
const buildId='00000000-0000-4000-8000-000000000088';
const otherId='00000000-0000-4000-8000-000000000099';
const build=()=>({
  savedBuildId:buildId,conversationId:id,title:'Chairs for Varsityville',
  sufficiencyState:'NEEDS_INFORMATION',openMatterCount:2,
  savedAt:'2026-11-12T09:00:00Z',buildUpdatedAt:'2026-11-12T09:20:00Z',
});
const entries=[
  {id:'h001',sender:'HUMAN',text:'I need 40 chairs',occurredAt:'2026-11-12T09:00:00Z'},
  {id:'h002',sender:'KS001',text:'When should they be delivered?',occurredAt:'2026-11-12T09:01:00Z'},
];
function session(){
  let snapshot={conversationId:null,turns:[],pending:null,error:null,context:{status:'idle'}};
  let resumes=0;
  return {
    controller:{
      async resumeConversation(cid,history){
        resumes++;
        snapshot={conversationId:cid,pending:null,error:null,context:{status:'ready'},
          turns:history.entries.map(e=>e.sender==='HUMAN'?
            {id:e.id,sender:'user',text:e.text}:
            {id:e.id,sender:'agent',response:{message:{type:'MESSAGE',text:e.text}}})};
      },
      getSnapshot:()=>snapshot,
    },
    resumed:()=>resumes,
  };
}
test('M3: saving stores the ORIGINAL server conversation reference, not a local Agreement',async()=>{
  let submitted;
  const result=await miniSaveServerBuild({
    saveBuild:async cid=>{submitted=cid;return build();}
  },id);
  assert.equal(submitted,id);
  assert.deepEqual(result,{savedBuildId:buildId,conversationId:id});
  assert.equal(Object.hasOwn(result,'accepted'),false);
});
test('M3: save cannot claim success for different conversation/invalid server identity',async()=>{
  const mismatched={...build(),conversationId:otherId};
  await assert.rejects(()=>miniSaveServerBuild({saveBuild:async()=>mismatched},id),/did not confirm/);
  await assert.rejects(()=>miniSaveServerBuild({saveBuild:async()=>({})},id),/did not confirm/);
  await assert.rejects(()=>miniSaveServerBuild({},''),/No conversation/);
});
test('M3: save propagates backend refusal and never manufactures success',async()=>{
  await assert.rejects(()=>miniSaveServerBuild({
    saveBuild:async()=>{throw Object.assign(Error('Not permitted'),{status:403});}
  },id),/Not permitted/);
});
test('M3: My saved work lists ONLY server supplied owner records, limit 20',async()=>{
  const records=await miniListServerBuilds({
    listSavedBuilds:async(limit,offset)=>{assert.equal(limit,20);assert.equal(offset,0);return [build()];}
  });
  assert.equal(records.length,1);
  assert.equal(records[0].conversationId,id);
  assert.equal(records[0].title,'Chairs for Varsityville');
  assert.equal(records[0].openMatterCount,2);
});
test('M3: malformed/duplicated/cross-id entries never become owner work',async()=>{
  assert.equal(miniOwnedBuildList([build(),build()]),null);
  assert.equal(miniOwnedBuildList([{...build(),savedBuildId:'not-a-uuid'}]),null);
  assert.equal(miniOwnedBuildList([{...build(),title:undefined}]),null);
  assert.equal(miniOwnedBuildList(new Array(21).fill(build())),null);
  await assert.rejects(()=>miniListServerBuilds({listSavedBuilds:async()=>({entries:[build()]})}),
    /did not confirm/);
});
test('M3: another person's private saved build remains inaccessible (server-denied)',async()=>{
  const gateway={listSavedBuilds:async()=>{throw Object.assign(Error('Access refused'),{status:403});}};
  await assert.rejects(()=>miniListServerBuilds(gateway),/Access refused/);
});
test('M3: successful Resume restores SAME conversation ID, ordered history and ready context',async()=>{
  let resumedId=null,historyId=null,created=0;
  const owner=session();
  const gateway={
    resumeSavedBuild:async sid=>{resumedId=sid;return build();},
    conversationHistory:async cid=>{historyId=cid;return {entries};},
    createConversation:async()=>{created++;throw Error('Must not clone');},
  };
  const result=await miniResumeServerBuild(gateway,owner.controller,buildId);
  assert.equal(result,id);
  assert.equal(resumedId,buildId);assert.equal(historyId,id);
  assert.equal(owner.resumed(),1);assert.equal(created,0);
  assert.equal(owner.controller.getSnapshot().turns.length,2);
});
test('M3: mismatched saved-work authority prevents any history read',async()=>{
  let historyReads=0;const owner=session();
  await assert.rejects(()=>miniResumeServerBuild({
    resumeSavedBuild:async()=>({...build(),savedBuildId:otherId}),
    conversationHistory:async()=>{historyReads++;return {entries};},
  },owner.controller,buildId),/original conversation/);
  assert.equal(historyReads,0);assert.equal(owner.resumed(),0);
  assert.equal(miniOwnedResumeConfirmed({...build(),conversationId:'unverified'},buildId),null);
});
test('M3: history error or transcript substitution cannot silently finish Resume',async()=>{
  const owner=session();
  await assert.rejects(()=>miniResumeServerBuild({
    resumeSavedBuild:async()=>build(),
    conversationHistory:async()=>{throw Error('History offline');}
  },owner.controller,buildId),/History offline/);
  assert.equal(owner.resumed(),0);
  const forged=session();
  forged.controller.resumeConversation=async(cid,history)=>{
    // Pretend downstream controller adopted another conversation; the exact
    // server history proof must reject it.
    forged.controller.getSnapshot=()=>({conversationId:otherId,turns:[],pending:null,error:null,context:{status:'ready'}});
  };
  await assert.rejects(()=>miniResumeServerBuild({
    resumeSavedBuild:async()=>build(),
    conversationHistory:async()=>({entries}),
  },forged.controller,buildId),/do not match/);
});
test('M3: Mini uses canonical in-memory identity, OTP, auth-only Save/List/Resume endpoints',()=>{
  const mini=read('src/mini/MiniFirstPartyKs001.tsx');
  const signIn=read('src/mini/MiniIdentityStep.tsx');
  const gateway=read('src/api/securepay/agent/index.ts');
  const session=read('src/api/securepay/session.ts');
  assert.match(mini,/createSessionStore/);
  assert.match(mini,/createHttpClient\(apiOrigin,session\.getAccessToken\)/);
  assert.match(mini,/ensureFreshSession\(session,auth\)/);
  assert.match(mini,/miniSaveServerBuild/);
  assert.match(mini,/miniListServerBuilds/);
  assert.match(mini,/miniResumeServerBuild/);
  assert.match(signIn,/createIdentityController\(auth,session\)/);
  assert.match(signIn,/one-time-code/);
  assert.match(gateway,/auth: 'required'/);
  assert.match(session,/Tokens live only in memory for this tab/);
  assert.doesNotMatch(signIn+mini,/localStorage\.setItem|paymentIntent|releaseFunds|acceptAgreement\(/);
});
test('M3: user-visible saved state is not passed off as agreed, shared or funded',()=>{
  const mini=read('src/mini/MiniFirstPartyKs001.tsx');
  const signIn=read('src/mini/MiniIdentityStep.tsx');
  assert.match(mini,/unfinished Agreement, not accepted or funded/);
  assert.match(mini,/Saving does not accept an Agreement/);
  assert.match(signIn,/does not accept an Agreement or move money/);
  assert.match(mini,/session\.clear\(\)/);
});
