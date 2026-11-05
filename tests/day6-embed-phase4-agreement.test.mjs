import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL('../public/embed/securepay-guest-agent.js',import.meta.url),'utf8');
const site='varsityville-next-demo',base='https://staging.securepay.ke';
const cid='11111111-2222-4222-8222-333333333333';
const hid='22222222-3333-4333-8333-444444444444';
const token='t'.repeat(48);
function store() {
 const map=new Map();
 return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),snapshot:()=>[...map.entries()]};
}
function setup(handler,session){
 const host={sessionStorage:session,fetch:handler,crypto:{randomUUID:()=>hid},AbortController,setTimeout,clearTimeout};
 vm.runInNewContext(src,{window:host,URL,Date});
 return host.SecurePayGuestAgent.create({siteId:site,apiBaseUrl:base});
}
const ok=v=>({ok:true,json:async()=>v});
const manifest={schemaVersion:'securepay-embed-guest-v3',siteId:site,guestChatAvailable:true,authenticatedOperationsAvailable:false,enabledOperations:{ask:true}};
const created={conversationId:cid,conversationAccessSecret:token,anonymousExpiresAt:new Date(Date.now()+3600000).toISOString()};
const view={conversationId:cid,version:7,stage:'UNDERSTOOD',reviewable:true,confirmable:false,
 summary:'Resident needs a plumber to fix a leak',what:[{label:'Repair',value:'Fix leak'}],
 who:[{role:'Plumber',name:'Not agreed'}],money:[],when:[],
 responsibilities:[],conditions:[],notIncluded:[],openPoints:[{text:'Agree price'}],
 question:{ask:true,text:'What is the agreed price?'}};
function handler(log,prepare) {
 return async(url,options)=>{
  log.push({url,options});
  if(url.endsWith('/installations/'+site))return ok(manifest);
  if(url.endsWith('/conversations'))return ok(created);
  if(url.endsWith('/turns'))return ok({message:'I can help with this agreement.'});
  if(url.includes('/agreement-formation'))return ok(view);
  if(url.endsWith('/agreement-handoff'))return prepare(url,options);
  if(url.includes('/history?'))return ok({entries:[]});
  throw Error('Unexpected: '+url);
 };
}
async function begin(client){assert.equal((await client.connect()).ready,true);await client.send('Need a plumber');await client.reviewAgreement('Africa/Nairobi');}

test('read-only review is site-scoped, token-bound, and does not create a contract',async()=>{
 const log=[],s=store(),guest=setup(handler(log,async()=>{throw Error('Not expected');}),s);
 await begin(guest);
 const state=guest.snapshot();
 assert.equal(state.agreement.summary,view.summary);
 assert.equal(state.agreement.version,7);
 assert.equal(state.agreement.confirmable,false);
 assert.equal(state.agreement.openPoints[0].text,'Agree price');
 assert.equal(log.filter(x=>x.url.includes('agreement-formation')).length,1);
 const url=log.find(x=>x.url.includes('agreement-formation'));
 assert.equal(url.options.headers['X-SecurePay-Conversation-Token'],token);
 assert.ok(!log.some(x=>/\/agreements\/|securelinks|funding|\/api\/agent\/conversations/.test(x.url)));
});

test('review preparation uses canonical version and keeps exact request ID after refresh',async()=>{
 const log=[],s=store();let first=true;
 const net=handler(log,async()=>{if(first){first=false;throw Error('timeout ambiguous');}return ok({
  handoffId:hid,conversationId:cid,tradeContextVersion:7,status:'READY_FOR_REVIEW',
  mustResolve:[{description:'Agree price'}],stillToDecide:[]});});
 const guest=setup(net,s);await begin(guest);
 const uncertain=await guest.prepareAgreementReview();
 assert.equal(uncertain.reviewPending,true);
 assert.equal(uncertain.preparedReview,null);
 const afterRefresh=setup(net,s);await afterRefresh.connect();
 await afterRefresh.reviewAgreement('Africa/Nairobi');
 const prepared=await afterRefresh.prepareAgreementReview();
 assert.equal(prepared.reviewPending,false);
 assert.equal(prepared.preparedReview.handoffId,hid);
 assert.equal(prepared.preparedReview.tradeContextVersion,7);
 const requests=log.filter(x=>x.url.endsWith('/agreement-handoff'));
 assert.equal(requests.length,2);
 assert.equal(JSON.parse(requests[0].options.body).clientActionId,JSON.parse(requests[1].options.body).clientActionId);
 assert.equal(JSON.parse(requests[0].options.body).expectedTradeContextVersion,7);
 assert.equal(requests[0].options.headers['X-SecurePay-Conversation-Token'],token);
 assert.ok(!s.snapshot().some(([k])=>k.endsWith('.review-action')));
});

test('new KS001 turn invalidates the previous review and preparation',async()=>{
 const log=[],s=store(),guest=setup(handler(log,async()=>ok({
  handoffId:hid,conversationId:cid,tradeContextVersion:7,status:'PREPARED',mustResolve:[],stillToDecide:[]})),s);
 await begin(guest);
 assert.ok((await guest.prepareAgreementReview()).preparedReview);
 await guest.send('I have a new price');
 assert.equal(guest.snapshot().agreement,null);
 assert.equal(guest.snapshot().preparedReview,null);
});

test('guest cannot prepare an unreviewable arrangement',async()=>{
 const log=[],s=store();
 const net=async(url,o)=>{
   if(url.endsWith('/agreement-formation'))return ok({...view,reviewable:false,stage:'BUILD'});
   return handler(log,async()=>{throw Error('Unexpected prepare');})(url,o);
 };
 const guest=setup(net,s);await begin(guest);
 await assert.rejects(guest.prepareAgreementReview(),/needs more information/);
});
