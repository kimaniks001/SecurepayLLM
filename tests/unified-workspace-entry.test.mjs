import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const require = createRequire(import.meta.url);
const ts=require('typescript');
const hero=read('src/components/SignedOutHome.tsx');
const publicEntry=read('src/features/public/PublicHome.tsx');
const app=read('src/features/agent/AgentExperience.tsx');
const runtime=read('src/RuntimeApp.tsx');
const preview=read('src/features/living-workspace/previewAgentGateway.ts');
const sourceMenu=read('src/features/sources/ui/SourceMenu.tsx');

test('one welcoming KS001 entry object is shared by guests and members',()=>{
  assert.match(hero,/data-unified-workspace-entry/);
  assert.match(hero,/data-workspace-identity=\{publicMode \? 'visitor' : 'member'\}/);
  assert.match(hero,/Welcome\. You can start with a question/);
  assert.match(hero,/Welcome back\. Your work and your next step/);
  assert.match(hero,/What would you like to/);
  assert.equal((hero.match(/<ConversationInput/g)||[]).length,1,'one input, not two calls to action');
  assert.ok(hero.indexOf('data-return-to-work')<hero.indexOf('<ConversationInput'),'existing work must come before start');
  assert.match(hero,/Nothing becomes an agreement until you review and confirm it/);
  assert.match(hero,/Only reviewed, confirmed terms can become an agreement/);
  assert.match(hero,/aria-label="Continue your work"/);
  assert.match(hero,/onAddDateTime=\{onAddDateTime\}/);
  assert.match(hero,/placement="above"/,'On the at-rest workspace, + tools must open above the composer');
  assert.match(hero,/data-workspace-at-rest/);
  assert.match(hero,/relative z-20 isolate overflow-visible/,'Welcome artwork must not clip the + menu');
  assert.ok(sourceMenu.includes('max-h-[min(65dvh,28rem)] overflow-y-auto'), 'Add list must scroll on a phone');
});

test('real SecurePay entry is one conversation work plane, never Home versus chat',()=>{
  const idle=read('src/features/agent/WorkspaceAtRest.tsx');
  assert.match(app,/data-unified-workspace/);
  assert.match(app,/data-workspace-state=\{workspaceEmpty \? 'rest' : 'working'\}/);
  assert.match(app,/workspaceEmpty && <WorkspaceAtRest/);
  assert.match(app,/<ConversationSurface/);
  assert.match(app,/onSend=\{text => workspaceEmpty \? startFromHome\(text\) : submitInput\(text\)\}/);
  assert.match(app,/<AgreementShaping /);
  assert.match(app,/status=\{workspaceEmpty \? workspaceDetails : undefined\}/);
  assert.match(app,/workPane=\{!workspaceEmpty \? workspaceDetails : undefined\}/);
  assert.doesNotMatch(app,/<PublicHome|<SignedOutHome/);
  assert.doesNotMatch(app,/View this Agreement alongside KS001|openCurrentLivingWorkspace/);
  assert.match(idle,/data-workspace-sheet/);
  assert.match(idle,/data-workspace-identity=\{signedIn \? 'member' : 'visitor'\}/);
  assert.doesNotMatch(idle,/<ConversationInput|<Composer|<textarea/);
  assert.match(app,/onAddDateTime=\{\(\) => setDateTimeOpen\(true\)\}/);
  assert.match(runtime,/previewAgentGateway \?\? api\.agent/);
  assert.match(runtime,/if \(phase1Preview\) return <Phase1LivingWorkspacePreview/);
  assert.match(runtime,/return api && agentGateway[\s\S]*?<AgentExperience/);
});

test('only conversation calls are routed through Vercel, other API authority stays unchanged', async()=>{
  const js=ts.transpileModule(preview,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const calls=[];
  const fakeFetch=async (input,init)=>{calls.push({input:String(input),init});return {ok:true};};
  const mod={exports:{}};
  vm.runInNewContext(js,{
    module:mod,exports:mod.exports,
    URL,Headers,File,FormData,Uint8Array,btoa,Buffer,fetch:fakeFetch,
    require:name=>{
      if(name==='../../api/securepay/agent')return {createAgentGateway: client=>client};
      if(name==='../../api/securepay/http')return {createHttpClient:(_base,_getToken,wrapped)=>({send:wrapped})};
      throw new Error('unexpected dependency '+name);
    }
  },{timeout:1000});
  const gateway=mod.exports.createPreviewAgentGateway('https://securepay.ke',()=>null);
  const original='https://securepay.ke/api/v1/agreements/ab23';
  await gateway.send(original,{method:'GET'});
  assert.equal(calls[0].input,original,'non-conversation API must keep its own transport');
  assert.equal(calls[0].init.method,'GET');
  const conversation='https://securepay.ke/api/agent/conversations';
  await gateway.send(conversation,{method:'POST'});
  assert.match(calls[1].input,/^\/api\/preview-agent\?path=/);
  assert.equal(new URL(calls[1].input,'https://example.vercel.app').searchParams.get('path'),'/api/agent/conversations');
  assert.equal(calls[1].init.credentials,'same-origin');
  await assert.rejects(()=>gateway.send('https://untrusted.example/api/agent/conversations',{method:'POST'}),/Unexpected SecurePay API origin/);
  assert.throws(()=>mod.exports.createPreviewAgentGateway('https://untrusted.example',()=>null),/approved SecurePay API origin/);
  assert.equal(calls.length,2,'no extra network requests from test');
});
