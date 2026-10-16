import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=source('src/RuntimeApp.tsx');
const shell=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const personas=source('src/features/living-workspace/personas.ts');
const agreement=source('src/features/living-workspace/LivingAgreementPanel.tsx');
const vision=source('src/features/living-workspace/LivingVisionPanel.tsx');
const circle=source('src/features/living-workspace/LivingCirclePanel.tsx');
const community=source('src/features/living-workspace/LivingCommunityPanel.tsx');
const support=source('src/features/living-workspace/QuickSupportPanel.tsx');
test('Phase 7: preview is isolated from production entry',()=>{
 assert.ok(app.includes('if (phase1Preview) return <Phase1LivingWorkspacePreview gateway={previewAgentGateway} workspaceGateways={previewWorkspaceGateways} session={session} />'));
 assert.ok(app.includes('living-workspace'));
});
test('Phase 7: four scoped working postures exist',()=>{
 for(const name of ['Agreement Maker','Dream Companion','Circle Facilitator','Community Guide']) assert.ok(personas.includes(name),name);
 for(const mode of ['work','vision','circle','community']) assert.ok(shell.includes(`'${mode}'`),mode);
});
test('Phase 7: tools are contextual, Quick Assist is universal',()=>{
 assert.match(shell,/toolsOpen &&/);
 assert.match(shell,/activeTool==='Quick Assist'/);
 for(const service of ['Short Stays','My Ride','Quick Documents']) assert.ok(support.includes(service));
});
test('Phase 7: Agreement review does not imply accepted terms or authority',()=>{
 assert.match(agreement,/ready = false/);
 assert.match(agreement,/disabled=\{!ready\}/);
 assert.ok(agreement.includes('proposed'));
 assert.ok(agreement.includes('source'));
});
test('Phase 7: Vision cooldown never locks My Work',()=>{
 assert.match(vision,/My Work and free Agreement drafting remain available/);
 assert.match(vision,/No payment is taken or allowance consumed/);
});
test('Phase 7: Circle support is not formal approval',()=>{
 assert.match(circle,/Support is not a vote of formal approval/);
 assert.match(circle,/No formal Circle decisions have been recorded/);
});
test('Phase 7: Circle-only content cannot leak to LIVE',()=>{
 assert.match(community,/Circle-only content must never appear in LIVE/);
});
test('Phase 7: payment and booking claims are explicitly limited',()=>{
 assert.match(shell,/bookings, invitations and money require their own authorisation/);
 assert.match(support,/cannot search live provider availability, dispatch transport, reserve accommodation or make payment/);
});
test('Phase 7: Quick Documents distinguish requests, offers and receipts',()=>{
 for(const statement of ['not proof of payment','does not prove payment','not an accepted Agreement'])assert.ok(support.includes(statement));
});

test('Phase 7: live Work bridge uses canonical conversation authority without fabricated persona messages',()=>{
 const live=source('src/features/living-workspace/LiveKs001Session.tsx');
 assert.match(shell,/createAgentController\(gateway/);
 assert.match(live,/controller\.send\(next\)/);
 assert.match(live,/controller\.retry\(\)/);
 assert.doesNotMatch(live,/state\\.context\\.data\\.entities/);
 assert.doesNotMatch(live,/What SecurePay currently understands/);
 assert.ok(!live.includes('Dream Companion'));
 assert.match(shell,/liveStarted && gateway/);
 assert.match(shell,/setLiveStarted\(true\)/);
 assert.match(app,/gateway=\{previewAgentGateway\}/);
});

test('Phase 7: preview relay never becomes a generic cross-origin API gateway', async()=>{
 const handler=(await import('../api/preview-agent.js')).default;
 const invoke=async ({method='GET',path='/api/agent/conversations/example123/context',origin='https://securepay-demo.vercel.app',host='securepay-demo.vercel.app',headers={}}={})=>{
   const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;}};
   await handler({method,query:{path},headers:{host,origin,...headers},body:undefined},res);
   return res;
 };
 assert.equal((await invoke({origin:'https://attacker.example'})).statusCode,403);
 assert.equal((await invoke({path:'/api/money'})).statusCode,403);
 assert.equal((await invoke({method:'DELETE'})).statusCode,405);
 assert.equal((await invoke({host:'securepay.ke',origin:'https://securepay.ke'})).statusCode,403);
 assert.equal((await invoke({path:'https://other.example/api/agent/conversations'})).statusCode,403);
 let observed=null;
 const previous=globalThis.fetch;
 try {
   globalThis.fetch=async (url,init)=>{ observed={url:String(url),init}; return new Response('{"conversationId":"example123"}',{status:200,headers:{'content-type':'application/json'}}); };
   const result=await invoke({method:'POST',path:'/api/agent/conversations',headers:{cookie:'vercel-sso-cookie',authorization:'Bearer sample', 'x-securepay-conversation-token':'scoped-token'}});
   assert.equal(result.statusCode,200);
   assert.equal(observed.url,'https://securepay.ke/api/agent/conversations');
   assert.equal(observed.init.headers.Authorization,'Bearer sample');
   assert.equal(observed.init.headers['X-SecurePay-Conversation-Token'],'scoped-token');
   assert.ok(!Object.keys(observed.init.headers).some(k=>k.toLowerCase()==='cookie'));
   assert.ok(!Object.keys(observed.init.headers).some(k=>k.toLowerCase()==='origin'));
 } finally {globalThis.fetch=previous;}
});
test('Phase 7: preview browser uses same-origin relay rather than production CORS',()=>{
 const gateway=source('src/features/living-workspace/previewAgentGateway.ts');
 assert.match(gateway,/api\/preview-agent\?path=/);
 assert.match(gateway,/credentials: 'same-origin'/);
 assert.match(app,/gateway=\{previewAgentGateway\}/);
});

test('Phase 7: My Work and KS001 share one canonical conversation and formation',()=>{
 const result=source('src/features/living-workspace/LiveWorkResultPanel.tsx');
 const ctrl=source('src/features/formation/controller.ts');
 assert.match(shell,/createFormationController\(gateway\)/);
 assert.match(shell,/liveConversationId=|conversationId=\{liveConversationId\}/);
 assert.match(shell,/formationController\.load\(liveConversationId\)/);
 assert.match(shell,/LiveKs001Session controller=\{liveController!\}/);
 assert.ok(!result.includes('200 chairs') && !result.includes('chair delivery'));
 assert.match(result,/formation\.what/);
 assert.match(result,/formation\.who/);
 assert.match(result,/formation\.money/);
 assert.match(result,/formation\.when/);
 assert.match(result,/formation\.openPoints/);
 assert.match(result,/formation\.question/);
 assert.match(result,/needsChecking/);
 assert.match(result,/conversationId === conversationId/);
 assert.match(ctrl,/agreementFormationView\(await gateway\.readAgreementFormation/);
});
test('Phase 7: preview relay permits only the canonical Agreement Formation read and limited timezone', async()=>{
 const handler=(await import('../api/preview-agent.js')).default;
 const invoke=async(method,path)=>{
   const res={statusCode:200,setHeader(){},end(body){this.body=body;}};
   await handler({method,query:{path},headers:{host:'securepay-demo.vercel.app',origin:'https://securepay-demo.vercel.app'}},res);
   return res.statusCode;
 };
 assert.equal(await invoke('POST','/api/agent/conversations/example123/agreement-formation'),403);
 assert.equal(await invoke('GET','/api/agent/conversations/example123/agreement-formation?admin=true'),400);
 assert.equal(await invoke('GET','/api/agent/conversations/example123/agreement-formation?timeZone=bad%0Avalue'),400);
 assert.equal(await invoke('GET','/api/agent/conversations/example123/context?timeZone=Africa%2FNairobi'),400);
});

test('Phase 7: Agreement lives only on the right, never duplicated beneath KS001 messages',()=>{
 const chat=source('src/features/living-workspace/LiveKs001Session.tsx');
 const result=source('src/features/living-workspace/LiveWorkResultPanel.tsx');
 assert.doesNotMatch(chat,/<details/);
 assert.doesNotMatch(chat,/Live Agreement|Agreement Formation|What SecurePay currently understands/);
 assert.match(chat,/state\.turns\.map/);
 assert.match(result,/data-live-formation/);
 assert.match(shell,/LiveWorkResultPanel/);
});

test('Phase 7: chat and My Work expose one backend truth, not a local five-question checklist',()=>{
 const result=source('src/features/living-workspace/LiveWorkResultPanel.tsx');
 assert.doesNotMatch(result,/practicalQuestions|prepareQuestionForKs001|questionIndex|Other detail/);
 assert.doesNotMatch(result,/onDiscuss/);
 assert.match(result,/formation\.question\.text/);
 assert.match(result,/Draft review available · not qualified/);
 assert.match(result,/Draft review is not Fair Trade qualification/);
 assert.match(result,/Money readiness/);
 assert.match(result,/Agreement payer/);
 assert.match(result,/Agreed conditions/);
 assert.match(result,/Payee verified in Money/);
 assert.match(result,/The person receiving the item is not automatically the payee/);
 assert.doesNotMatch(result,/ready for money/i);
 assert.equal(result.split('formation.question.text').length-1,1);
 assert.doesNotMatch(shell,/liveController\.send\(question\)/);
});

test('Phase 7: Fair Trade examination is read only through canonical scoped access and cannot outrun Agreement version',()=>{
 const gateway=source('src/api/securepay/agent/index.ts');
 const result=source('src/features/living-workspace/LiveWorkResultPanel.tsx');
 const relay=source('api/preview-agent.js');
 assert.match(gateway,/readFairTradeExamination:/);
 assert.match(gateway,/fair-trade-examination/);
 assert.match(gateway,/auth: 'optional'/);
 assert.match(shell,/gateway\.readFairTradeExamination\(liveConversationId,zone\)/);
 assert.match(shell,/reading\.conversationId !== liveConversationId/);
 assert.match(shell,/reading\.tradeContextVersion !== liveFormationVersion/);
 assert.match(result,/examination\.data\.tradeContextVersion === formation\.version/);
 assert.match(result,/Partial examination · not qualified/);
 assert.match(result,/formation\.question && fairTrade\.advisoryQuestion/);
 assert.match(relay,/fair-trade-examination/);
 assert.doesNotMatch(result,/Fair Trade Approved|Certified by SecurePay/);
});

test('Structural workspace: real private records use the existing SecurePay session and authorised gateways',()=>{
 const continuity=source('src/features/living-workspace/WorkspaceContinuityPanel.tsx');
 const adapter=source('src/features/living-workspace/previewWorkspaceGateways.ts');
 const runtime=source('src/RuntimeApp.tsx');
 assert.match(continuity,/ensureFreshSession\(session,gateways\.auth\)/);
 assert.match(continuity,/session\.getSnapshot\(\)\.status!==\x27signed-in\x27/);
 assert.match(continuity,/gateways\.agent\.listSavedBuilds\(20,0\)/);
 assert.match(continuity,/gateways\.dreams\.mine\(\)/);
 assert.match(continuity,/gateways\.community\.circles\.mine\(20,0\)/);
 assert.match(continuity,/gateways\.community\.membership\.me\(\)/);
 assert.match(continuity,/m\.status===\x27ACTIVE\x27/);
 assert.match(continuity,/post\.circleId===null/);
 assert.match(continuity,/resumeSavedBuild\(item\.savedBuildId\)/);
 assert.match(continuity,/savedRecord\.conversationId!==item\.conversationId/);
 assert.match(shell,/liveController\.resumeConversation\(conversationId\)/);
 assert.match(runtime,/workspaceGateways=\{previewWorkspaceGateways\} session=\{session\}/);
 assert.match(adapter,/createAuthGateway\(http\)/);
 assert.match(adapter,/createAgentGateway\(http\)/);
 assert.match(adapter,/createVisionDreamGateway\(http\)/);
 assert.match(adapter,/createCommunityGateway\(http\)/);
 assert.doesNotMatch(continuity,/\b(?:localStorage|sessionStorage)\.(?:getItem|setItem)|setMembership\(|setMemberRole\(/);
});
test('Structural workspace: routes preserve chosen mode and have one sign-in session',()=>{
 const runtime=source('src/RuntimeApp.tsx');
 assert.match(runtime,/living-workspace\(\?:\\\/\(\?:work\|vision\|circle\|community\)\)/);
 assert.match(shell,/location\.hash=\x27#\/preview\/living-workspace\/\x27\+next/);
 assert.match(shell,/SignInExperience/);
 assert.match(shell,/session=\{session\}/);
});
test('Structural workspace: preview relay rejects untrusted origins, other peoples private routes and unsigned access',async()=>{
 const handler=(await import('../api/preview-workspace.js')).default;
 const call=async({method='GET',path='/api/agent/saved-builds?limit=20',host='securepay-test.vercel.app',origin='https://securepay-test.vercel.app',auth=null,body,headers={}}={})=>{
   const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(b){this.body=b;}};
   await handler({method,query:{path},headers:{host,origin,...headers,...(auth?{authorization:auth}:{})},body},res);
   return res;
 };
 assert.equal((await call({origin:'https://another.example'})).statusCode,403);
 assert.equal((await call({host:'securepay.ke',origin:'https://securepay.ke'})).statusCode,403);
 assert.equal((await call({path:'/api/v1/community/circles/private-id-123/posts',auth:'Bearer abcdefghijklmnop'})).statusCode,403);
 assert.equal((await call({path:'/api/agent/conversations/secret/context',auth:'Bearer abcdefghijklmnop'})).statusCode,403);
 assert.equal((await call()).statusCode,401);
 assert.equal((await call({method:'POST',path:'/api/v1/community/membership/join',auth:'Bearer abcdefghijklmnop'})).statusCode,403);
 assert.equal((await call({path:'/api/agent/saved-builds?limit=500',auth:'Bearer abcdefghijklmnop'})).statusCode,403);
 const oldFetch=globalThis.fetch;
 try{
   let observed;
   globalThis.fetch=async(url,opts)=>{observed={url:String(url),opts};return new Response('[]',{status:200});};
   const r=await call({auth:'Bearer abcdefghijklmnop',headers:{cookie:'VercelProtection=secret'}});
   assert.equal(r.statusCode,200);
   assert.equal(observed.url,'https://securepay.ke/api/agent/saved-builds?limit=20');
   assert.equal(observed.opts.headers.Authorization,'Bearer abcdefghijklmnop');
   assert.ok(!Object.keys(observed.opts.headers).some(k=>k.toLowerCase()==='cookie'));
   const resumed=await call({method:'POST',path:'/api/agent/saved-builds/12345678/resume',auth:'Bearer abcdefghijklmnop'});
   assert.equal(resumed.statusCode,200);
   assert.equal(observed.opts.body,undefined);
 }finally{globalThis.fetch=oldFetch;}
});

test('Structural S2: Dream, Circle and Agreement IDs enter only canonical experiences',()=>{
 const bridge=source('src/features/experience/entryIntent.ts');
 const work=source('src/features/living-workspace/WorkspaceContinuityPanel.tsx');
 const router=source('src/features/agent/AgentExperience.tsx');
 const dream=source('src/features/visionboard/dreams/controller.ts');
 const dreamScreen=source('src/features/visionboard/dreams/VisionDreamExperience.tsx');
 const community=source('src/features/community/CommunityExperience.tsx');
 assert.match(work,/gateways\.agreements\.currentUserAgreements\(0,20\)/);
 assert.match(work,/storeAgreementEntry\(id\)/);
 assert.match(work,/storeDreamEntry\(id\)/);
 assert.match(work,/storeCircleEntry\(id\)/);
 assert.match(bridge,/pendingDreamId = clean/);
 assert.match(bridge,/pendingCircleId = clean/);
 assert.match(bridge,/consumeDreamEntry\(\)/);
 assert.match(bridge,/consumeCircleEntry\(\)/);
 assert.match(router,/consumeDreamEntry\(\)/);
 assert.match(router,/consumeCircleEntry\(\)/);
 assert.match(router,/initialDreamId=\{externalDreamId\}/);
 assert.match(router,/initialCircleId=\{externalCircleId\}/);
 assert.match(dream,/async openOwnedById\(dreamId: string\)/);
 assert.match(dream,/dreams\.get\(dreamId\)/);
 assert.match(dream,/dream\.dreamId !== dreamId/);
 assert.match(dreamScreen,/controller\.openOwnedById\(id\)/);
 assert.match(community,/controller\.openCircle\(circleId\)/);
 assert.doesNotMatch(bridge,/localStorage|sessionStorage|document\.cookie/);
});
test('Structural S2: preview Agreement list is person-scoped and not a generic ID reader',async()=>{
 const handler=(await import('../api/preview-workspace.js')).default;
 const call=async(method,path,auth=null)=>{
   const res={statusCode:200,setHeader(){},end(v){this.body=v;}};
   await handler({method,query:{path},headers:{host:'securepay-ci.vercel.app',origin:'https://securepay-ci.vercel.app',...(auth?{authorization:auth}:{})}},res);
   return res;
 };
 const auth='Bearer abcdefghijklmnop';
 assert.equal((await call('GET','/api/v1/me/agreements?page=0&size=20')).statusCode,401);
 assert.equal((await call('POST','/api/v1/me/agreements?page=0&size=20',auth)).statusCode,403);
 assert.equal((await call('GET','/api/v1/me/agreements?page=0&size=999',auth)).statusCode,403);
 assert.equal((await call('GET','/api/v1/me/agreements?page=0&size=20&ownerId=other',auth)).statusCode,403);
 assert.equal((await call('GET','/api/v1/me/agreements?page=0&page=1&size=20',auth)).statusCode,403);
 assert.equal((await call('GET','/api/v1/agreements/123/detail',auth)).statusCode,403);
 const prior=globalThis.fetch;
 try{
   let target='';
   globalThis.fetch=async url=>{target=String(url);return new Response(JSON.stringify({items:[],page:0,size:20,totalElements:0}),{status:200});};
   assert.equal((await call('GET','/api/v1/me/agreements?page=0&size=20',auth)).statusCode,200);
   assert.equal(target,'https://securepay.ke/api/v1/me/agreements?page=0&size=20');
 }finally{globalThis.fetch=prior;}
});

test('Structural S2: explicit inspection reads exact server IDs and never assumes authority',()=>{
 const panel=source('src/features/living-workspace/SelectedWorkspaceRecord.tsx');
 const continuity=source('src/features/living-workspace/WorkspaceContinuityPanel.tsx');
 assert.match(panel,/ensureFreshSession\(session,gateways\.auth\)/);
 assert.match(panel,/gateways\.agreements\.detail\(id\)/);
 assert.match(panel,/result\.overview\.agreementId!==id/);
 assert.match(panel,/gateways\.dreams\.get\(id\)/);
 assert.match(panel,/dream\.dreamId!==id/);
 assert.match(panel,/gateways\.community\.circles\.get\(id\)/);
 assert.match(panel,/circle\.id!==id/);
 assert.match(panel,/read.only summary/i);
 assert.match(continuity,/SelectedWorkspaceRecord/);
 assert.match(continuity,/Inspect record/);
 assert.doesNotMatch(panel,/localStorage|sessionStorage|setRole|joinCircle\(/);
});
test('Structural S2: only bounded, authenticated ID detail GETs can pass preview relay',async()=>{
 const handler=(await import('../api/preview-workspace.js')).default;
 const call=async(method,path,authorization)=>{
  const res={statusCode:200,setHeader(){},end(body){this.body=body;}};
  await handler({method,query:{path},headers:{host:'securepay-test.vercel.app',origin:'https://securepay-test.vercel.app',...(authorization?{authorization}:{})}},res);
  return res.statusCode;
 };
 const auth='Bearer abcdefghijklmnop';
 for(const p of [
  '/api/v1/vision-dreams/12345678',
  '/api/v1/community/circles/12345678',
  '/api/v1/agreements/12345678/detail',
 ]){
  assert.equal(await call('GET',p),401);
  assert.equal(await call('POST',p,auth),403);
  assert.equal(await call('GET',p+'?admin=true',auth),403);
 }
 // S3 authorises these scoped owner/member reads; no anonymous disclosure.
 for(const p of ['/api/v1/vision-dreams/12345678/assets','/api/v1/community/circles/12345678/objects?limit=30&offset=0'])
  assert.equal(await call('GET',p),401);
 for(const p of ['/api/v1/community/circles/12345678/objects?admin=true','/api/v1/agreements/12345678/release'])
  assert.equal(await call('GET',p,auth),403);
 const original=globalThis.fetch;
 try{
   let lastPath='';
   globalThis.fetch=async url=>{lastPath=String(url);return new Response('{}',{status:200});};
   assert.equal(await call('GET','/api/v1/vision-dreams/12345678',auth),200);
   assert.equal(lastPath,'https://securepay.ke/api/v1/vision-dreams/12345678');
 }finally{globalThis.fetch=original;}
});

test('Production workspace cannot pretend to sign in or process mock KS001 replies',()=>{
 const demo=source('src/features/living-workspace/MockWorkspacePanel.tsx');
 assert.match(shell,/const mockSignedIn = false/);
 assert.match(shell,/useState\(Boolean\(gateway\)\)/);
 assert.match(shell,/createAgentController\(gateway/);
 assert.doesNotMatch(shell,/Try mock sign-in|Exit demo|DEMO ACCOUNT · NO REAL ACCESS|setMockSignedIn\(true\)/);
 assert.doesNotMatch(shell,/setMessages\(/);
 assert.doesNotMatch(shell,/<MockWorkspacePanel/);
 assert.match(shell,/bookings, invitations and money require their own authorisation/);
 assert.doesNotMatch(demo,/createSessionStore|setTokens\(|refreshToken|accessToken|fetch\(|axios|localStorage|sessionStorage|setMembership|setRole/);
});
test('Authentication mock: only real sign-in can set real SessionStore tokens',()=>{
 const sessions=source('src/api/securepay/session.ts');
 const realLogin=source('src/features/public/SignInExperience.tsx');
 assert.match(realLogin,/createIdentityController\(auth, session\)/);
 assert.match(sessions,/setTokens: \(tokens: SessionTokens\)/);
 assert.doesNotMatch(shell,/session\.setTokens\(|session\.clear\(|getAccessToken\(\)/);
 assert.doesNotMatch(source('src/features/living-workspace/MockWorkspacePanel.tsx'),/gateway(?:s)?\.(?:agent|auth|dreams|agreements|community)|session\.setTokens|session\.getAccessToken|identity\.set/);
});

test('Structural S3: native Dream Builder and Circle Board never run in mock identity',()=>{
 const dream=source('src/features/living-workspace/InlineVisionEditor.tsx');
 const circle=source('src/features/living-workspace/InlineCircleBoard.tsx');
 const canvas=source('src/features/visionboard/dreams/DreamBuilder.tsx');
 assert.match(shell,/signedIn && !mockSignedIn && workspaceGateways && mode==='vision'/);
 assert.match(shell,/signedIn && !mockSignedIn && workspaceGateways && mode==='circle'/);
 assert.match(shell,/InlineVisionEditor/);
 assert.match(shell,/InlineCircleBoard/);
 assert.match(shell,/if\(!mayLeaveDream\(\)\)return/);
 assert.match(dream,/createVisionDreamController\(gateways\.dreams,gateways\.agent\)/);
 assert.match(dream,/controller\.openOwnedById\(id\)/);
 assert.match(dream,/state\.selected\?\.dreamId===id/);
 assert.match(dream,/<DreamBuilder/);
 assert.match(canvas,/gateway\.saveBoard\(dream\.dreamId/);
 assert.match(canvas,/expectedRevision: revision/);
 assert.match(canvas,/onUnsavedChange/);
 assert.match(canvas,/beforeunload/);
 assert.match(circle,/gateways\.community\.circles\.membership\(id\)/);
 assert.match(circle,/member\.status!=='ACTIVE' && !member\.isOwner/);
 assert.match(circle,/rows\.some\(item=>item\.circleId!==id\)/);
 assert.match(circle,/<CircleBoard/);
 assert.match(circle,/gateways\.community\.circles\.objects\.create/);
 assert.match(circle,/setIntent\(freshKey\(\)\)/);
 assert.doesNotMatch(source('src/features/living-workspace/MockWorkspacePanel.tsx'),/InlineVisionEditor|InlineCircleBoard|gateways\.dreams|gateways\.community/);
});
test('Structural S3: preview relay confines authenticated Dream edits and Circle writes',async()=>{
 const handler=(await import('../api/preview-workspace.js')).default;
 const call=async(method,path,opts={})=>{
  const res={statusCode:200,setHeader(){},end(body){this.body=body;}};
  await handler({method,query:{path},headers:{host:'securepay-test.vercel.app',origin:'https://securepay-test.vercel.app',
      ...(opts.token?{authorization:'Bearer abcdefghijklmnop'}:{}),
      ...(opts.key?{'idempotency-key':opts.key}:{}),
      ...(opts.body?{'content-type':'application/json'}:{})},
    body:opts.body},res);
  return res.statusCode;
 };
 const circle='/api/v1/community/circles/12345678';
 const dream='/api/v1/vision-dreams/12345678';
 assert.equal(await call('GET',circle+'/membership'),401);
 assert.equal(await call('GET',circle+'/coordination-prompts/mine'),401);
 assert.equal(await call('PUT',dream+'/board',{body:{expectedRevision:0}}),401);
 assert.equal(await call('PATCH',dream,{body:{title:'Revised'}}),401);
 assert.equal(await call('POST',circle+'/objects',{token:true,body:{title:'Demo'}}),400);
 assert.equal(await call('POST',circle+'/coordination-prompts',{token:true,key:'invalid space',body:{promptText:'test'}}),400);
 for(const [method,path] of [
    ['POST',circle+'/members/123/approve'],['POST',circle+'/invitations'],
    ['POST','/api/v1/agreements/12345678/release'],['PUT',circle+'/lifecycle'],
    ['PATCH','/api/v1/vision-dreams/12345678/board']]){
    assert.equal(await call(method,path,{token:true,body:{title:'test'}}),403);
 }
 assert.equal(await call('GET',circle+'/objects?limit=30&offset=0&actor=another',{token:true}),403);
 const original=globalThis.fetch;
 try{
   let seen={};
   globalThis.fetch=async(url,init)=>{seen={url:String(url),headers:init.headers,body:init.body};return new Response('{}',{status:200});};
   assert.equal(await call('GET',dream+'/board',{token:true}),200);
   assert.equal(seen.url,'https://securepay.ke'+dream+'/board');
   assert.equal(await call('PUT',dream+'/board',{token:true,body:{schemaVersion:1,expectedRevision:0,documentJson:'{}'}}),200);
   assert.equal(await call('POST',circle+'/objects',{token:true,key:'intent-12345678',body:{title:'Circle note',body:'Hello',objectType:'DISCUSSION'}}),200);
   assert.equal(seen.headers['Idempotency-Key'],'intent-12345678');
 }finally{globalThis.fetch=original;}
});

test('Structural S3: demo account can try local Vision/Circle tools without live authority',()=>{
 const demo=source('src/features/living-workspace/MockWorkspacePanel.tsx');
 const vision=source('src/features/living-workspace/LivingVisionPanel.tsx');
 const circle=source('src/features/living-workspace/LivingCirclePanel.tsx');
 assert.match(demo,/data-mock-vision-tools/);
 assert.match(demo,/<LivingVisionPanel\/>/);
 assert.match(demo,/data-mock-circle-tools/);
 assert.match(demo,/<LivingCirclePanel\/>/);
 assert.match(demo,/never saved/);
 assert.doesNotMatch(vision,/fetch\(|http\.request|gateway\.|session\./);
 assert.doesNotMatch(circle,/fetch\(|http\.request|gateway\.|session\./);
});
test('Structural S3: unavailable Dream board revision cannot silently be overwritten',()=>{
 const board=source('src/features/visionboard/dreams/DreamBuilder.tsx');
 assert.match(board,/serverRevisionKnown\.current = false/);
 assert.match(board,/serverRevisionKnown\.current = true/);
 assert.match(board,/if\(!serverRevisionKnown\.current\)/);
 assert.match(board,/Do not save over an unknown version/);
 assert.match(board,/expectedRevision: revision/);
});

test('Structural S4: real Community exposes only ACTIVE-member, Circle-free records',()=>{
 const hub=source('src/features/living-workspace/InlineCommunityHub.tsx');
 const app=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
 const demo=source('src/features/living-workspace/MockWorkspacePanel.tsx');
 assert.match(app,/signedIn && workspaceGateways && mode==='community'/);
 assert.match(app,/<InlineCommunityHub/);
 assert.match(hub,/gateways\.community\.membership\.me\(\)/);
 assert.match(hub,/membership\.data\?\.status==='ACTIVE'/);
 assert.match(hub,/if\(!active \|\| page==='learning'\)return/);
 assert.match(hub,/rows\.filter\(row=>row\.circleId===null\)/);
 assert.match(hub,/gateways\.community\.projects\.list\(20,0\)/);
 assert.match(hub,/gateways\.community\.serviceOpportunities\.list\(20,0\)/);
 assert.match(hub,/gateways\.community\.events\.list\(20,0\)/);
 assert.match(hub,/No participation recorded/);
 assert.match(demo,/data-mock-community-tools/);
 assert.match(demo,/<LivingCommunityPanel\/>/);
 assert.doesNotMatch(demo,/gateways\.community\.|fetch\(/);
});
test('Structural S5: photo intake stays local in demo and sends through the canonical API on explicit action',()=>{
 const app=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
 const intake=source('src/features/living-workspace/UniversalSourceTray.tsx');
 assert.match(app,/useState(?:<[^>]+>)?\('Photos'\)/);
 assert.ok(app.indexOf("{ name: 'Photos'")<app.indexOf("{ name: 'Documents'"));
 assert.ok(app.includes('onEnsureConversation='));
 assert.ok(intake.includes('data-universal-source-tray'));
 assert.ok(intake.includes('reader.readAsDataURL(file)'));
 assert.ok(intake.includes('Selected locally · Unverified'));
 assert.ok(intake.includes('Earlier photos and local previews'));
 assert.ok(intake.includes('const MAX_BYTES=2_000_000'));
 assert.ok(intake.includes('seq.current++'));
 assert.ok(intake.includes("gateway.uploadSource(targetConversationId,tool==='Photos'?'PHOTO':'DOCUMENT'"));
 assert.ok(intake.includes('isDemo'));
 assert.ok(intake.includes('onContinueTask'));
 assert.ok(!intake.includes('session.setTokens') && !intake.includes('localStorage') && !intake.includes('sessionStorage'));
});
test('Structural S4: member Community discovery relay is bounded and separately membership-gated',async()=>{
 const handler=(await import('../api/preview-workspace.js')).default;
 const request=async(path,token=false)=>{
  const response={statusCode:200,setHeader(){},end(body){this.body=body;}};
  await handler({method:'GET',query:{path},headers:{host:'securepay-test.vercel.app',origin:'https://securepay-test.vercel.app',...(token?{authorization:'Bearer abcdefghijklmnop'}:{})}},response);
  return response.statusCode;
 };
 const route='/api/v1/community/projects?limit=20&offset=0';
 assert.equal(await request(route),401);
 assert.equal(await request('/api/v1/community/projects?limit=99&offset=0',true),403);
 assert.equal(await request('/api/v1/community/events?limit=20&offset=0&circleId=private',true),403);
 assert.equal(await request('/api/v1/community/apprenticeship-projects?limit=20&offset=0',true),403);
 const before=globalThis.fetch;
 try{
  let calls=[];
  globalThis.fetch=async(url)=>{calls.push(String(url));return new Response(JSON.stringify({status:'INVITED'}),{status:200});};
  assert.equal(await request(route,true),403);
  assert.equal(calls.length,1);
  assert.match(calls[0],/membership\/me$/);
  calls=[];
  globalThis.fetch=async(url)=>{
    calls.push(String(url));
    return new Response(String(url).endsWith('/membership/me')?JSON.stringify({status:'ACTIVE'}):'[]',{status:200});
  };
  assert.equal(await request(route,true),200);
  assert.equal(calls.length,2);
  assert.equal(calls[1],'https://securepay.ke'+route);
 }finally{globalThis.fetch=before;}
});


test('Living Store: buyer sees real public offers, seller stays private, community stays membership-gated',()=>{
 const ui=source('src/features/living-workspace/StoresTool.tsx');
 const gateways=source('src/features/living-workspace/previewWorkspaceGateways.ts');
 const shell=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
 const relay=source('api/preview-workspace.js');
 for(const term of ['gateways.stores.search','gateways.stores.store','gateways.stores.myProfile','gateways.stores.myOffers',
  'gateways.stores.createOffer','published:false','gateways.agreements.currentUserActions','gateways.community.membership.me()',
  'gateways.community.projects.list','gateways.community.serviceOpportunities.list']) assert.ok(ui.includes(term),term);
 assert.match(ui,/m.status!=='ACTIVE'/);
 assert.match(ui,/A Plug must/);
 assert.match(ui,/url.origin==='https:\/\/securepay.ke'/);
 assert.match(gateways,/stores: createStoreGateway\(http\)/);
 assert.match(shell,/gateways=\{workspaceGateways\} signedIn=\{signedIn&&!mockSignedIn\}/);
 assert.match(relay,/publicStoreRead/);
});
test('Living Store: preview relay allows bounded public browsing but no unauthorised seller access',async()=>{
 const handler=(await import('../api/preview-workspace.js')).default;
 const call=async(method,path,token,body)=>{
  const res={statusCode:200,setHeader(){},end(content){this.body=content;}};
  await handler({method,query:{path},headers:{host:'securepay-test.vercel.app',origin:'https://securepay-test.vercel.app',
    ...(token?{authorization:'Bearer abcdefghijklmnop'}:{}),
    ...(body?{'content-type':'application/json'}:{})},body},res);
  return res;
 };
 const old=globalThis.fetch;let forwarded;
 try{
  globalThis.fetch=async (url,options)=>{
   forwarded={url:String(url),options};
   return new Response('[]',{status:200,headers:{'Content-Type':'application/json'}});
  };
  assert.equal((await call('GET','/api/v1/stores/search?kind=PRODUCT&limit=10')).statusCode,200);
  assert.equal(forwarded.url,'https://securepay.ke/api/v1/stores/search?kind=PRODUCT&limit=10');
  assert.equal(forwarded.options.headers.Authorization,undefined);
  assert.equal((await call('GET','/api/v1/stores/KS123')).statusCode,200);
  assert.equal((await call('GET','/api/v1/stores/search?kind=PRODUCT&limit=500')).statusCode,403);
  assert.equal((await call('GET','/api/v1/stores/search?kind=PRODUCT&admin=true')).statusCode,403);
  assert.equal((await call('GET','/api/v1/store/me/offers')).statusCode,401);
  assert.equal((await call('POST','/api/v1/store/me/offers',null,{title:'Test'})).statusCode,401);
  assert.equal((await call('POST','/api/v1/store/me/offers','yes',{title:'Draft offer',kind:'SERVICE',published:false})).statusCode,200);
  assert.equal(forwarded.options.headers.Authorization,'Bearer abcdefghijklmnop');
  assert.equal((await call('POST','/api/v1/stores/KS123')).statusCode,403);
  assert.equal((await call('GET','/api/v1/store/me/offers?owner=another','yes')).statusCode,403);
 }finally{globalThis.fetch=old;}
});

test('Living Store: every public product, service and capacity offer has a source-verified Take to KS001 action',async()=>{
 const ui=source('src/features/living-workspace/StoresTool.tsx');
 const handler=(await import('../api/preview-workspace.js')).default;
 assert.match(ui,/gateways\.stores\.offer\(ownerKs,offerId\)/);
 assert.match(ui,/record\.canonicalKsNumber!==ownerKs\|\|record\.offer\.id!==offerId/);
 assert.match(ui,/Do not order, reserve, contact the seller, commit Agreement terms or move money/);
 assert.match(ui,/await onContinue\(information\)/);
 assert.equal((ui.match(/Take to KS001/g)||[]).length,2);
 assert.match(ui,/result\.canonicalKsNumber,result\.offer\.id/);
 assert.match(ui,/currentOffer\.canonicalKsNumber,offer\.id/);
 const response=async(method,path)=>{
  const res={statusCode:200,setHeader(){},end(body){this.body=body;}};
  await handler({method,query:{path},headers:{host:'securepay-test.vercel.app',origin:'https://securepay-test.vercel.app'}},res);
  return res;
 };
 const orig=globalThis.fetch;let path='';
 try{
  globalThis.fetch=async (url)=>{path=String(url);return new Response('{}',{status:200});};
  const valid='/api/v1/stores/KS123/offers/offer12345678';
  assert.equal((await response('GET',valid)).statusCode,200);
  assert.equal(path,'https://securepay.ke'+valid);
  assert.equal((await response('GET',valid+'?includePrivate=true')).statusCode,403);
  assert.equal((await response('POST',valid)).statusCode,403);
  assert.equal((await response('GET','/api/v1/stores/KS123/offers/private')).statusCode,403);
 }finally{globalThis.fetch=orig;}
});


test('Living Store sample catalogue is visibly fictional, photograph-led, and never writes real Store or Agreement records',()=>{
 const live=source('src/features/living-workspace/StoresTool.tsx');
 const demo=source('src/features/living-workspace/StoreDemoExperience.tsx');
 assert.match(live,/const \[showSamples,setShowSamples\]=useState\(!initialServiceQuery\)/);
 assert.match(live,/showSamples\?<StoreDemoExperience\/>/);
 assert.match(live,/if\(showSamples\|\|!gateways\|\|!signedIn\|\|area!=='seller'\)return/);
 assert.match(live,/if\(showSamples\|\|!gateways\|\|!signedIn\|\|area!=='community'\)return/);
 assert.match(demo,/SAMPLE · NOT A REAL STORE/);
 for(const name of ['Jenga Interiors','Mavuno Building Supplies','Kijiji Woodworks','Karibu Delivery Crew'])assert.ok(demo.includes(name));
 for(const term of ['Take to KS001','Completed work','Seller','Buyer','Together','Prepare quote','Calendar & balance','Community Saver','KS001 · Practice conversation'])assert.ok(demo.includes(term),term);
 assert.match(demo,/No Community Saver or payout is created by this example/);
 assert.doesNotMatch(demo,/gateway\.|gateways\.|fetch\(|onContinue\(|localStorage|sessionStorage|createAgreement|createOffer/);
});


test('Stores buyer: summary-side editing keeps many shops in one proposal without claiming seller acceptance',()=>{
 const board=source('src/features/living-workspace/StoreBuyingPlan.tsx');
 const live=source('src/features/living-workspace/StoresTool.tsx');
 const demo=source('src/features/living-workspace/StoreDemoExperience.tsx');
 const shell=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
 for(const term of ['storeName','storeKsNumber','offerId','quantity','specification','desiredDate','coordination',
  'combined','community','addStoreBuyingLine','storeBuyingPrompt','seller','Plug','separate','MY BUYING PLAN · NOT AN ORDER'])assert.ok(board.includes(term),term);
 assert.match(board,/independently accepted supplier obligations/);
 assert.match(board,/Money must follow accepted Agreements/);
 assert.match(board,/addStoreBuyingLine\(previous:StoreBuyingLine\[\]/);
 assert.match(board,/onLines\(lines\.map/);
 assert.match(board,/one clear overall commitment/);
 assert.match(live,/gateways\.stores\.offer\(ownerKs,offerId\)/);
 assert.match(live,/Promise\.all\(planLines\.map/);
 assert.match(live,/result\.offer\.title!==line\.title/);
 assert.match(live,/storeBuyingPrompt\(planLines,planDraft\)/);
 assert.match(live,/Add to buying plan/);
 assert.match(live,/Take to KS001/);
 assert.match(demo,/addStoreBuyingLine\(current/);
 assert.match(demo,/sample lines=\{buyingLines\}/);
 assert.match(demo,/setBuyingActive\(true\)/);
 assert.match(shell,/toolSelected/);
  assert.match(shell,/activeTool==='Stores'/);
});

test('Compact Money: one small tool, four human choices, Agreement-first and no financial claims',()=>{
 const shell=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
 const tool=source('src/features/living-workspace/UnifiedMoneyTool.tsx');
 const personas=source('src/features/living-workspace/personas.ts');
 assert.match(shell,/name: 'Money', icon: Wallet/);
 assert.doesNotMatch(shell,/name: 'Financial Institutions'/);
 assert.match(shell,/activeTool==='Money'\?<UnifiedMoneyTool/);
  assert.match(shell,/data-tool-shelf/);
  assert.match(shell,/activeTool==='Stores'/);
 assert.doesNotMatch(shell,/activeTool==='Stores'\|\|activeTool==='Money'/);
 assert.match(personas,/tool:'Money'/);
 for(const token of ['My Money','Borrow','Invest','Protect','My Agreements','Next:',
   'Review Agreement','Review funding','See all Money & financial details','Try sample',
   'No actual Agreement or payment','Proposed','Explore with KS001']){
  assert.ok(tool.includes(token),token);
 }
 assert.doesNotMatch(tool,/Pay this Agreement/);
 assert.match(tool,/const shown=agreements.items.slice\(0,3\)/);
 assert.doesNotMatch(tool,/setShowMore|Show more Agreements/);
 assert.match(tool,/gateways\.agreements\.currentUserAgreements\(0,12\)/);
 assert.match(tool,/useState\(!signedIn\)/);
 assert.match(tool,/if\(sample\|\|!signedIn\|\|!gateways\)return/);
 assert.match(tool,/onReviewAgreement\(selectedAgreement\.agreementId\)/);
 assert.match(tool,/onOpenAgreementMoney\(selectedAgreement\)/);
 assert.doesNotMatch(tool,/gateways\.financialPartners\.list\(|gateways\.moneySnapshot\.read\(|<MoneyRailCeremony|<PartnerList/);
 assert.doesNotMatch(tool,/createVersionBoundQuote|paymentIntentGateway\.initiate/);
 assert.ok(tool.length<15000,'Tool must remain genuinely compact');
});
test('Unified Money: preview financial reads require authentication; writes, extra queries and unrelated institutions are rejected',async()=>{
 const handler=(await import('../api/preview-workspace.js')).default;
 const call=async(method,path,token=false)=>{
  const res={statusCode:200,setHeader(){},end(content){this.body=content;}};
  await handler({method,query:{path},headers:{host:'securepay-test.vercel.app',origin:'https://securepay-test.vercel.app',
    ...(token?{authorization:'Bearer abcdefghijklmnop'}:{})}},res);
  return res;
 };
 const partner='/api/v1/regulated-accounts/partners';
 const snapshot='/api/v1/agreements/agreement1234567890/money-snapshot';
 const previous=globalThis.fetch;
 try{
  let requests=[];
  globalThis.fetch=async(url,init)=>{requests.push({url:String(url),headers:init.headers});return new Response('{}',{status:200});};
  assert.equal((await call('GET',partner)).statusCode,401);
  assert.equal((await call('GET',snapshot)).statusCode,401);
  assert.equal((await call('POST',partner,true)).statusCode,403);
  assert.equal((await call('GET',partner+'?admin=true',true)).statusCode,403);
  assert.equal((await call('GET',snapshot+'?version=old',true)).statusCode,403);
  assert.equal((await call('GET','/api/v1/financial-services/institutions',true)).statusCode,403);
  assert.equal((await call('GET',partner,true)).statusCode,200);
  assert.equal((await call('GET',snapshot,true)).statusCode,200);
  assert.deepEqual(requests.map(request=>request.url),['https://securepay.ke'+partner,'https://securepay.ke'+snapshot]);
  assert.equal(requests[0].headers.Authorization,'Bearer abcdefghijklmnop');
 }finally{globalThis.fetch=previous;}
});

test('Compact Money: Agreement actions lead into canonical review and separate provider ceremony',()=>{
 const tool=source('src/features/living-workspace/UnifiedMoneyTool.tsx');
 const shell=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
 const handoff=source('src/features/money/handoff.ts');
 const canonical=source('src/features/money/MoneyPaymentSettlementJourney.tsx');
 for(const token of ['humanAgreementStatus','selectedAgreement?.nextActions',
 'My Agreements','onReviewAgreement','onOpenAgreementMoney'])
  assert.ok(tool.includes(token),token);
 assert.match(shell,/onOpenAgreementMoney=\{\(agreement,railCode\)=>/);
 assert.match(shell,/openMoneyFor\(\{agreementId:agreement.agreementId/);
 assert.match(shell,/storeAgreementEntry\(agreementId\)/);
 assert.match(handoff,/export function peekMoneyRailPreference/);
 assert.match(canonical,/peekMoneyRailPreference\(\)/);
 assert.match(canonical,/createVersionBoundQuote\(agreementId, rail.railCode, currentVersionId\)/);
 for(const token of ['Who will handle this transaction?','Compare ',
  'Institutional responsibility:', 'Not yet verified', 'See confirmed cost & terms'])
  assert.ok(canonical.includes(token),token);
 assert.doesNotMatch(tool,/Who will handle this transaction\?|MoneyRailCeremony|quoteSelection/);
});
test('Money safety: real Agreements first, unresolved payment attempts cannot restart rail choice',()=>{
 const tool=source('src/features/living-workspace/UnifiedMoneyTool.tsx');
 const payment=source('src/features/money/MoneyPaymentSettlementJourney.tsx');
 assert.match(tool,/useState\(!signedIn\)/);
 assert.match(tool,/setSample\(false\)/);
 assert.match(tool,/setSelected\(previous=>items.some/);
 assert.match(tool,/shown\.map\(item=>/);
 assert.match(tool,/Proposed/);
 assert.match(payment,/routeSwitchLocked = createdIntent !== null \|\| intents.state !== 'ready'/);
 assert.match(payment,/IN_FLIGHT\.includes\(intent.status\)/);
 assert.match(payment,/disabled=\{routeSwitchLocked \|\| quoteBusy!==null\}/);
 assert.match(payment,/disabled=\{quoteBusy!==null \|\| !snapshot\?\.feeQuoteRequestsPermitted \|\| routeSwitchLocked\}/);
 assert.doesNotMatch(tool,/createVersionBoundQuote|paymentIntentGateway\.initiate/);
});
