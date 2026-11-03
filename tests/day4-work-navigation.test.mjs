import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: "export * from './src/features/living-workspace/workNavigation'; export {createAgentController} from './src/features/agent/controller';", resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', platform: 'node',
});
const navigation = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const shell = readFileSync(new URL('../src/features/living-workspace/Phase1LivingWorkspacePreview.tsx', import.meta.url), 'utf8');

function setup({ id = 'c1', draft = '', failSave = false, rejectNewRead = false } = {}) {
  const calls = [];
  let state = { conversationId: id, busy: false, pending: null, turns: [], context: { status: 'ready', data: {} } };
  const services = {
    gateway: {
      saveBuild: async conversationId => {
        calls.push(['save', conversationId]);
        if (failSave) throw new Error('Save denied');
        return { savedBuildId: 's-' + conversationId, conversationId };
      },
      createConversation: async () => { calls.push(['create']); return { conversationId: 'c2' }; },
    },
    controller: {
      getSnapshot: () => state,
      withNavigationLock: async operation => {
        state = {...state, busy:true};
        try { return await operation(services.controller.resumeConversation); }
        finally {state={...state,busy:false};}
      },
      resumeConversation: async conversationId => {
        calls.push(['resume', conversationId]);
        state = { ...state, conversationId, context: rejectNewRead && conversationId === 'c2'
          ? { status: 'error', data: null } : { status: 'ready', data: {} } };
      },
    },
    ensureIdentity: async () => { calls.push(['identity']); },
    unsentDraft: () => draft,
  };
  return { services, calls, snapshot: () => state, setState: next => { state = next; } };
}

test('Day 4: new work saves the previous exact conversation before creating another', async () => {
  const { services, calls, snapshot } = setup();
  const result = await navigation.beginNewWork(services);
  assert.equal(result.conversationId, 'c2');
  assert.equal(result.previousSaved, true);
  assert.equal(snapshot().conversationId, 'c2');
  assert.ok(calls.findIndex(c => c[0] === 'save') < calls.findIndex(c => c[0] === 'create'));
});

test('Day 4: failed save never creates another conversation or drops the old one', async () => {
  const { services, calls, snapshot } = setup({ failSave: true });
  await assert.rejects(() => navigation.beginNewWork(services), /Save denied/);
  assert.equal(snapshot().conversationId, 'c1');
  assert.ok(!calls.some(c => c[0] === 'create'));
});

test('Day 4: unsent composer text blocks switching without a silent data loss', async () => {
  const { services, calls } = setup({ draft: 'A message I have not sent' });
  await assert.rejects(() => navigation.beginNewWork(services), /not sent/);
  assert.deepEqual(calls, []);
});

test('Day 4: active or unresolved KS001 turns cannot be switched', async () => {
  const { services, calls, snapshot, setState } = setup();
  setState({ ...snapshot(), pending: { kind: 'turn' } });
  await assert.rejects(() => navigation.beginNewWork(services), /Finish or retry/);
  assert.deepEqual(calls, []);
});

test('Day 4: another saved conversation resumes its own identity and preserves the old one', async () => {
  const { services, calls, snapshot } = setup();
  await navigation.returnToSavedWork(services, 'saved-c3');
  assert.equal(snapshot().conversationId, 'saved-c3');
  assert.ok(calls.findIndex(c => c[0] === 'save') < calls.findIndex(c => c[0] === 'resume'));
});

test('Day 4: switching to current conversation does not save or clone it', async () => {
  const { services, calls } = setup();
  await navigation.returnToSavedWork(services, 'c1');
  assert.deepEqual(calls, []);
});

test('Day 4: failed context authorization is not reported as a successful new workspace', async () => {
  const { services, calls, snapshot } = setup({ rejectNewRead: true });
  await assert.rejects(() => navigation.beginNewWork(services), /could not verify access/);
  assert.equal(snapshot().conversationId, 'c1');
  assert.deepEqual(calls.filter(c => c[0] === 'resume').map(c => c[1]), ['c2', 'c1']);
});

test('Day 4: Living Workspace retains the approved master shell and exposes accessible mobile and saved-work navigation', () => {
  assert.match(shell, /data-workspace-frozen-layout/);
  assert.match(shell, /data-day4-new-work/);
  assert.match(shell, /data-day4-saved-work/);
  assert.match(shell, /data-day4-mobile-agreement/);
  assert.match(shell, /data-day4-saved-work-list/);
  assert.match(shell, /mode==='work'\?'Agreement'/);
  assert.match(shell, /onResume=\{continueSavedConversation\}/);
});

const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {resolve,promise};};

test('Opening unsent text blocks new and saved work before a conversation ID exists',async()=>{
  for(const action of [s=>navigation.beginNewWork(s),s=>navigation.returnToSavedWork(s,'saved')]){
    const x=setup({id:null,draft:'Do not lose this opening message'});
    await assert.rejects(()=>action(x.services),/not sent/);
    assert.deepEqual(x.calls,[]);assert.equal(x.snapshot().conversationId,null);assert.equal(x.snapshot().busy,false);
  }
});

test('Real controller blocks turns and second navigation throughout save, create, history and context',async()=>{
  const save=deferred(),create=deferred(),history=deferred(),context=deferred();
  const calls=[];let gate=false;
  const gateway={
    createConversation:async()=>{calls.push('create');return create.promise;},
    saveBuild:async id=>{calls.push('save');await save.promise;return {conversationId:id,savedBuildId:'s1'};},
    conversationHistory:async id=>{if(gate){calls.push('history');await history.promise;}return {entries:[]};},
    readContext:async id=>{if(gate){calls.push('context');await context.promise;}return {conversationId:id,version:1,entities:[],relationships:[]};},
    submitTurn:async()=>{calls.push('UNEXPECTED TURN');return {message:'bad'};},
  };
  const controller=navigation.createAgentController(gateway,()=> 'turn-id');
  await controller.resumeConversation('old');gate=true;
  const services={gateway,controller,ensureIdentity:async()=>{},unsentDraft:()=>''};
  const task=navigation.beginNewWork(services);
  const tick=()=>new Promise(r=>setImmediate(r));
  const blocked=async()=>{
    assert.equal(controller.getSnapshot().busy,true);
    await controller.send('Must not send while changing work');
    await assert.rejects(()=>navigation.beginNewWork(services),/Finish or retry/);
    assert.ok(!calls.includes('UNEXPECTED TURN'));
  };
  await tick();assert.ok(calls.includes('save'));await blocked();save.resolve();
  await tick();assert.ok(calls.includes('create'));await blocked();create.resolve({conversationId:'new'});
  await tick();assert.ok(calls.includes('history'));await blocked();history.resolve();
  await tick();assert.ok(calls.includes('context'));await blocked();context.resolve();
  await task;assert.equal(controller.getSnapshot().busy,false);assert.equal(controller.getSnapshot().conversationId,'new');
});

test('Failed navigation releases the real controller lock for recovery',async()=>{
  const gateway={conversationHistory:async()=>({entries:[]}),readContext:async id=>({conversationId:id,version:1,entities:[],relationships:[]}),saveBuild:async()=>{throw Error('Save unavailable');}};
  const controller=navigation.createAgentController(gateway);
  await controller.resumeConversation('old');
  await assert.rejects(()=>navigation.beginNewWork({gateway,controller,ensureIdentity:async()=>{},unsentDraft:()=>''}),/Save unavailable/);
  assert.equal(controller.getSnapshot().busy,false);assert.equal(controller.getSnapshot().conversationId,'old');
});
