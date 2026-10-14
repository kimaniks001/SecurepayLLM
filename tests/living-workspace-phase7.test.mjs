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
 assert.ok(app.includes('if (phase1Preview) return <Phase1LivingWorkspacePreview gateway={previewAgentGateway} />'));
 assert.ok(app.includes('living-workspace'));
});
test('Phase 7: four scoped working postures exist',()=>{
 for(const name of ['Agreement Maker','Dream Companion','Circle Facilitator','Community Guide']) assert.ok(personas.includes(name),name);
 for(const mode of ['work','vision','circle','community']) assert.ok(shell.includes(`'${mode}'`),mode);
});
test('Phase 7: tools are contextual, Quick Support is universal',()=>{
 assert.match(shell,/toolsOpen &&/);
 assert.match(shell,/activeTool==='Quick Support'/);
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
 assert.match(shell,/No money, invitation, approval, booking or Agreement authority is active/);
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
