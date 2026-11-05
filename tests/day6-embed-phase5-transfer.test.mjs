import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../public/embed/securepay-guest-agent.js',import.meta.url),'utf8');
const site='varsityville-next-demo';
const cid='11111111-2222-4222-8222-333333333333';
const proof='b'.repeat(48),ticket='c'.repeat(43);
const base='https://staging.securepay.ke';
const stored=new Map();
const storage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)};
const manifest={schemaVersion:'securepay-embed-guest-v3',siteId:site,
  guestChatAvailable:true,authenticatedOperationsAvailable:false,enabledOperations:{ask:true}};
const created={conversationId:cid,conversationAccessSecret:proof,
  anonymousExpiresAt:new Date(Date.now()+3600000).toISOString()};
const reply={ticket,receiverOrigin:base,expiresAt:new Date(Date.now()+240000).toISOString()};
const good=data=>({ok:true,json:async()=>data});

function setup(fetcher){
 const host={sessionStorage:storage,crypto:{randomUUID:()=>cid},fetch:fetcher,
   AbortController,setTimeout,clearTimeout};
 vm.runInNewContext(source,{window:host,URL,Date});
 return host.SecurePayGuestAgent.create({siteId:site,apiBaseUrl:base});
}

test('estate guest proof + site association create one opaque transfer without payment or URL tokens',async()=>{
 stored.clear();
 const requests=[];
 const fetcher=async(url,opts)=>{
   requests.push({url,opts});
   if(url.endsWith('/installations/'+site))return good(manifest);
   if(url.endsWith('/conversations'))return good(created);
   if(url.endsWith('/turns'))return good({message:'What is the repair cost?'});
   if(url.endsWith('/transfers'))return good(reply);
   throw Error('Unknown endpoint: '+url);
 };
 const client=setup(fetcher);
 assert.equal((await client.connect()).ready,true);
 await client.send('A leaking sink');
 const transfer=await client.createWorkTransfer({returnReference:'SR-123456',purpose:'HOME'});
 assert.equal(transfer.ticket,ticket);
 assert.equal(transfer.guestToken,proof);
 assert.equal(transfer.conversationId,cid);
 assert.equal(transfer.receiverOrigin,base);
 const issue=requests.find(x=>x.url.endsWith('/transfers'));
 assert.equal(issue.opts.headers['X-SecurePay-Conversation-Token'],proof);
 assert.deepEqual(JSON.parse(issue.opts.body),{returnReference:'SR-123456',purpose:'HOME'});
 assert.equal(issue.opts.credentials,'omit');
 assert.ok(requests.every(x=>!x.url.includes(proof)&&!x.url.includes(ticket)));
 assert.equal(requests.filter(x=>x.url.endsWith('/turns')).length,1,
   'transfer never consumes a second sponsored AI turn');
 assert.ok(![...stored.values()].some(v=>v.includes(ticket)),
   'one-use transfer ticket is never put in sessionStorage');
});

test('wrong receiver origin cannot obtain the guest possession secret',async()=>{
 stored.clear();
 const client=setup(async(url)=>{
   if(url.endsWith('/installations/'+site))return good(manifest);
   if(url.endsWith('/conversations'))return good(created);
   if(url.endsWith('/turns'))return good({message:'Known response'});
   if(url.endsWith('/transfers'))return good({...reply,receiverOrigin:'https://evil.example'});
   throw Error('Unexpected');
 });
 await client.connect();await client.send('Repair question');
 await assert.rejects(()=>client.createWorkTransfer({purpose:'WORK'}),/Unapproved/);
});
