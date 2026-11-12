import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
const sdk=readFileSync(fileURLToPath(new URL('../public/embed/securepay-guest-agent.js',import.meta.url)),'utf8');
const mini=readFileSync(fileURLToPath(new URL('../src/mini/MiniGuestChat.tsx',import.meta.url)),'utf8');
const siteId='mini_owner_preview',key='securepay.embed.guest.v3:'+siteId;
const cid='00000000-0000-4000-8000-000000000011',secret='A'.repeat(43);
const api='https://staging.securepay.ke',expiry='2099-01-01T00:00:00.000Z';
const oldRecord=()=>({apiOrigin:api,conversationId:cid,secret,anonymousExpiresAt:expiry});
const manifest={schemaVersion:'securepay-embed-guest-v3',siteId,guestChatAvailable:true,
  enabledOperations:{ask:true},authenticatedOperationsAvailable:false};
function storage(seed) {
  const data=new Map(Object.entries(seed||{}));
  return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),
    removeItem:k=>data.delete(k),peek:k=>data.get(k)};
}
const json=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
function initSession(store,onRequest) {
  const window={sessionStorage:store,crypto:{randomUUID:()=>cid},
    fetch:async(url,init)=>{const route=new URL(url);
      if(route.pathname==='/api/v1/public/embed/installations/'+siteId)return json(manifest);
      return onRequest(route,init);},
    AbortController,setTimeout,clearTimeout};
  runInNewContext(sdk,{window,URL,console,AbortController,setTimeout,clearTimeout});
  return window.SecurePayGuestAgent.create({siteId,apiBaseUrl:api});
}
const saved=()=>storage({[key]:JSON.stringify(oldRecord())});
test('reload with history outage fails CLOSED and retains original conversation',async()=>{
  const store=saved();let sends=0;
  const client=initSession(store,async route=>{
    if(route.pathname.endsWith('/history'))return json({},503);
    if(route.pathname.endsWith('/turns')){sends++;return json({message:'not allowed'});}
    throw Error('Unexpected request: '+route.pathname);
  });
  const snap=await client.connect();
  assert.equal(snap.ready,false);assert.equal(snap.status,'continuity-unavailable');
  assert.equal(snap.conversationId,cid);assert.equal(snap.entries.length,0);
  assert.equal(snap.error.includes('could not be confirmed'),true);
  assert.equal(JSON.parse(store.peek(key)).conversationId,cid);
  await assert.rejects(()=>client.send('Continue my order'),/not ready/i);
  assert.equal(sends,0);
});
test('retry restores original history without creating a new conversation',async()=>{
  const store=saved();let missing=true;let created=0;
  const client=initSession(store,async route=>{
    if(route.pathname.endsWith('/history'))
      return missing?json({},503):json({entries:[{sender:'HUMAN',text:'I need 40 chairs'},
        {sender:'KS001',text:'When do you need delivery?'}]});
    if(route.pathname.endsWith('/conversations'))created++;
    throw Error('Unexpected request: '+route.pathname);
  });
  assert.equal((await client.connect()).ready,false);
  missing=false;
  const snap=await client.connect();
  assert.equal(snap.ready,true);assert.equal(snap.status,'ready');
  assert.equal(snap.conversationId,cid);assert.equal(snap.entries.length,2);
  assert.match(snap.entries[1].text,/delivery/);assert.equal(created,0);
});
test('server 404 cannot manufacture new chat and requires explicit reset',async()=>{
  const store=saved();let creates=0;
  const client=initSession(store,async route=>{
    if(route.pathname.endsWith('/history'))return json({},404);
    if(route.pathname.endsWith('/conversations'))creates++;
    return json({},404);
  });
  const snap=await client.connect();
  assert.equal(snap.status,'expired');assert.equal(snap.ready,false);
  assert.equal(snap.conversationId,cid);assert.ok(store.peek(key));
  await assert.rejects(()=>client.send('Hello'),/not ready/i);assert.equal(creates,0);
  const again=initSession(store,async route=>route.pathname.endsWith('/history')?json({},404):json(manifest));
  assert.equal((await again.connect()).status,'expired');
  const reset=again.reset();
  assert.equal(reset.ready,true);assert.equal(reset.conversationId,null);
  assert.equal(store.peek(key),undefined);
});
test('malformed history is not a successful empty chat',async()=>{
  const client=initSession(saved(),async route=>{
    if(route.pathname.endsWith('/history'))return json({entries:'not-array'});
    throw Error('unexpected');
  });
  const snap=await client.connect();
  assert.equal(snap.status,'continuity-unavailable');
  assert.equal(snap.ready,false);assert.equal(snap.conversationId,cid);
});
test('without prior conversation, manifest approval enables clean guest entry',async()=>{
  const client=initSession(storage(),async route=>{
    throw Error('No history request expected: '+route.pathname);
  });
  const snap=await client.connect();
  assert.equal(snap.ready,true);assert.equal(snap.conversationId,null);
});
test('failed prior history is visibly recoverable without UI redesign',()=>{
  assert.match(mini,/continuity-unavailable/);
  assert.match(mini,/previous conversation is temporarily unavailable/);
  assert.match(mini,/Recheck approved connection/);
  assert.match(mini,/status === 'expired'/);
  assert.match(mini,/Confirm: clear previous conversation/);
  assert.match(mini,/setStatus\(result.status\)/);
});
