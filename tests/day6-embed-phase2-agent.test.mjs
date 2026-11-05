import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../public/embed/securepay-guest-agent.js', import.meta.url), 'utf8');
const site = 'varsityville-next-demo';
const origin = 'https://staging.securepay.ke';
const uuid = '12345678-1234-4234-8234-123456789012';
const secret = 'a'.repeat(48);
function makeStorage() {
  const values = new Map();
  return {
    getItem:key=>values.get(key)??null,
    setItem:(key,value)=>values.set(key,value),
    removeItem:key=>values.delete(key),
    dump:()=>[...values.values()]
  };
}
function setup(fetcher, storage=makeStorage()) {
  const fakeWindow = {
    fetch:fetcher,
    sessionStorage:storage,
    crypto:{randomUUID:()=> 'abcdef01-1111-4111-8111-111111111111'},
    AbortController,
    setTimeout, clearTimeout
  };
  const ctx = vm.createContext({window:fakeWindow, URL, Date});
  vm.runInContext(source,ctx);
  return fakeWindow.SecurePayGuestAgent.create({siteId:site,apiBaseUrl:origin});
}
const good = v => ({ok:true,json:async()=>v});
const manifest = {schemaVersion:'securepay-embed-guest-v2',siteId:site,
  guestChatAvailable:true,authenticatedOperationsAvailable:false,enabledOperations:{ask:true}};
const created = {conversationId:uuid,conversationAccessSecret:secret,
  anonymousExpiresAt:new Date(Date.now()+3600000).toISOString()};

test('real backend flow retains possession token and retries same clientTurnId without duplicate create', async () => {
  const seen=[];
  let turnAttempts=0;
  const storage=makeStorage();
  const client=setup(async (url,options)=>{
    seen.push({url,options});
    if(url.endsWith('/installations/'+site))return good(manifest);
    if(url.endsWith('/api/agent/conversations'))return good(created);
    if(url.endsWith('/turns')) {
      turnAttempts++;
      if(turnAttempts===1) throw Error('network uncertain');
      return good({message:'KS001 genuine API reply'});
    }
    throw Error('Unexpected '+url);
  },storage);
  assert.equal((await client.connect()).ready,true);
  const uncertain=await client.send('I need an electrician','Africa/Nairobi');
  assert.equal(uncertain.pending.message,'I need an electrician');
  assert.equal(uncertain.entries.length,0);
  const confirmed=await client.retry();
  assert.deepEqual(confirmed.entries.map(e=>e.sender),['HUMAN','KS001']);
  assert.equal(confirmed.entries[1].text,'KS001 genuine API reply');
  const attempts=seen.filter(x=>x.url.endsWith('/turns'));
  assert.equal(attempts.length,2);
  assert.equal(JSON.parse(attempts[0].options.body).clientTurnId,JSON.parse(attempts[1].options.body).clientTurnId);
  assert.equal(attempts[0].options.headers['X-SecurePay-Conversation-Token'],secret);
  assert.equal(attempts[0].options.credentials,'omit');
  assert.equal(seen.filter(x=>x.url.endsWith('/api/agent/conversations')).length,1);
  assert.equal(storage.dump().length,1);
  assert.ok(!storage.dump()[0].includes('I need an electrician'));
});

test('same-tab reload resumes server history, never re-invents AI responses',async()=>{
  const storage=makeStorage();
  let historyReads=0;
  const api=async(url,options)=>{
    if(url.endsWith('/installations/'+site))return good(manifest);
    if(url.endsWith('/api/agent/conversations'))return good(created);
    if(url.endsWith('/turns'))return good({message:'Backend says yes.'});
    if(url.includes('/history?limit=20')){
      historyReads++;
      assert.equal(options.headers['X-SecurePay-Conversation-Token'],secret);
      return good({entries:[
        {id:'1',sender:'HUMAN',text:'How can I request a plumber?'},
        {id:'2',sender:'KS001',text:'Contact the trader and agree on scope.'}
      ]});
    }
    throw Error('Unknown endpoint');
  };
  const first=setup(api,storage);await first.connect();await first.send('A fresh request');
  const second=setup(api,storage);const resumed=await second.connect();
  assert.equal(resumed.conversationId,uuid);
  assert.equal(historyReads,1);
  assert.deepEqual(resumed.entries.map(e=>e.text),[
    'How can I request a plumber?','Contact the trader and agree on scope.'
  ]);
});

test('off-by-default guest pilot fails closed without any conversation or AI call',async()=>{
  const calls=[];
  const client=setup(async(url,options)=>{
    calls.push({url,options});
    return good({...manifest,guestChatAvailable:false,enabledOperations:{ask:false}});
  });
  const state=await client.connect();
  assert.equal(state.ready,false);
  assert.equal(state.status,'disabled');
  await assert.rejects(()=>client.send('Test'),/not ready/);
  assert.equal(calls.length,1);
});

test('unconfigured client cannot call network',async()=>{
  let calls=0;
  const fakeWindow={fetch:async()=>{calls++}};
  vm.runInNewContext(source,{window:fakeWindow,URL,Date});
  const client=fakeWindow.SecurePayGuestAgent.create({siteId:site});
  assert.equal((await client.connect()).status,'unconfigured');
  assert.equal(calls,0);
});

test('rejects unrelated API domains even when a host supplies them',()=>{
  const win={};
  vm.runInNewContext(source,{window:win,URL,Date});
  assert.throws(()=>win.SecurePayGuestAgent.create({siteId:site,apiBaseUrl:'https://unrelated.example'}),/verified SecurePay/);
});
