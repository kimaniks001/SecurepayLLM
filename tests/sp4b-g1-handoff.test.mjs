import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {sourceHandoff,destinationHandoff,destinationProof} from '../src/api/securepay/workspaceHandoff.mjs';
const now=()=>Date.parse('2026-11-27T10:00:00Z');
const expiresAt=new Date(now()+30000).toISOString();
const human={identityId:'12345678-1111-4222-8333-123456789012',ksNumber:'KS123'};
const other={identityId:'22345678-1111-4222-8333-123456789012',ksNumber:'KS456'};
const token=(a)=>({accessToken:a.repeat(32),refreshToken:(a==='a'?'b':'d').repeat(32),accessTokenExpiresAt:new Date(now()+60000).toISOString(),refreshTokenExpiresAt:new Date(now()+120000).toISOString()});
const origins=['https://staging.securepay.ke','https://test-sp4b.securepay.ke','https://test-living.securepay.ke'];
function session(initial){let generation=0,state=initial?{status:'signed-in',tokens:initial}:{status:'signed-out'};return {getSnapshot:()=>state,getAccountGeneration:()=>generation,clear(){generation++;state={status:'signed-out'}},setTokens(t){generation++;state={status:'signed-in',tokens:t}}};}
function setup({read=async()=>human,prepare=async()=>{},issue,redeem,verify=async()=>human,initialDestination,enabled=true,sourceOrigin=origins[0],destinationOrigin=origins[1]}={}){
 const s=session(token('a')),d=session(initialDestination),sourceWindow={},destinationWindow={};
 const fromSource=[],fromDestination=[];let issues=0,redemptions=0;
 const common={enabled,approvedOrigins:origins,now};
 const src=sourceHandoff({...common,localOrigin:sourceOrigin,peerOrigin:destinationOrigin,peer:destinationWindow,session:s,prepare,readIdentity:read,
  issue:async args=>{issues++;assert.equal(s.getSnapshot().status,'signed-out');assert.equal(args.accessToken,token('a').accessToken);return issue?issue(args):{ticket:'T'.repeat(32),expiresAt}},
  post:(peer,data,origin)=>fromSource.push({peer,data,origin})});
 const dst=destinationHandoff({...common,localOrigin:destinationOrigin,peerOrigin:sourceOrigin,peer:sourceWindow,session:d,
  redeem:async args=>{redemptions++;return redeem?redeem(args):token('c')},readIdentityWithToken:verify,post:(peer,data,origin)=>fromDestination.push({peer,data,origin})});
 return {s,d,src,dst,fromSource,fromDestination,issues:()=>issues,redemptions:()=>redemptions,
  ready:async()=>{await dst.begin(webcrypto);return {source:destinationWindow,origin:destinationOrigin,data:fromDestination[0].data}},
  ticket:()=>({source:sourceWindow,origin:sourceOrigin,data:fromSource[0].data})};
}
test('three product directions: exact peer, source retired, no credential messages, independently verified destination',async()=>{
 for(const [sourceOrigin,destinationOrigin] of [[origins[0],origins[1]],[origins[1],origins[2]],[origins[2],origins[0]]]){
  const x=setup({sourceOrigin,destinationOrigin});const ready=await x.ready();
  assert.equal(await x.src.receive(ready),true);assert.equal(x.s.getSnapshot().status,'signed-out');
  const message=x.fromSource[0];assert.equal(message.origin,destinationOrigin);assert.equal(JSON.stringify(message.data).includes(token('a').accessToken),false);assert.equal(JSON.stringify(message.data).includes(token('a').refreshToken),false);
  assert.equal(await x.dst.receive(x.ticket()),true);assert.equal(x.d.getSnapshot().tokens.accessToken,token('c').accessToken);
  assert.equal(await x.src.receive(ready),false);assert.equal(await x.dst.receive(x.ticket()),false);assert.equal(x.issues(),1);assert.equal(x.redemptions(),1);
 }
});
test('reject wrong origin, wrong window, malformed challenge, wrong nonce and extra properties',async()=>{
 const x=setup();const ready=await x.ready();
 assert.equal(await x.src.receive({...ready,origin:'https://evil.example'}),false);
 assert.equal(await x.src.receive({...ready,source:{}}),false);
 assert.equal(await x.src.receive({...ready,data:{...ready.data,challenge:'bad'}}),false);
 assert.equal(await x.src.receive({...ready,data:{...ready.data,accessToken:'injected'}}),false);
 assert.equal(x.issues(),0);await x.src.receive(ready);const t=x.ticket();
 assert.equal(await x.dst.receive({...t,origin:origins[2]}),false);assert.equal(await x.dst.receive({...t,source:{}}),false);
 assert.equal(await x.dst.receive({...t,data:{...t.data,nonce:'x'.repeat(43)}}),false);
 assert.equal(await x.dst.receive({...t,data:{...t.data,expiresAt:new Date(now()-1).toISOString()}}),false);
 assert.equal(x.redemptions(),0);assert.equal(await x.dst.receive(t),true);
});
test('existing destination account never silently overwritten',async()=>{const x=setup({initialDestination:token('a')});await assert.rejects(x.dst.begin(webcrypto));assert.equal(x.d.getSnapshot().tokens.accessToken,token('a').accessToken);});
test('identity mismatch never installs credentials',async()=>{const x=setup({verify:async()=>other});await x.src.receive(await x.ready());await assert.rejects(x.dst.receive(x.ticket()));assert.equal(x.d.getSnapshot().status,'signed-out');});
test('source issue unknown outcome stays detached; no retry',async()=>{const x=setup({issue:async()=>{throw Error('timeout')}});const r=await x.ready();await assert.rejects(x.src.receive(r));assert.equal(x.s.getSnapshot().status,'signed-out');assert.equal(await x.src.receive(r),false);assert.equal(x.issues(),1);});
test('destination signs in during redemption; new account is preserved',async()=>{let resolve;const x=setup({redeem:()=>new Promise(r=>{resolve=r})});await x.src.receive(await x.ready());const pending=x.dst.receive(x.ticket());x.d.setTokens(token('a'));resolve(token('c'));await assert.rejects(pending);assert.equal(x.d.getSnapshot().tokens.accessToken,token('a').accessToken);});
test('source account changes during identity check; original operation cannot clear new login',async()=>{let resolve;const x=setup({read:()=>new Promise(r=>{resolve=r})});const r=await x.ready();const pending=x.src.receive(r);await Promise.resolve();x.s.setTokens(token('c'));resolve(human);await assert.rejects(pending);assert.equal(x.s.getSnapshot().tokens.accessToken,token('c').accessToken);assert.equal(x.issues(),0);});
test('disabled feature, unapproved or production origin fail closed',()=>{assert.throws(()=>setup({enabled:false}));assert.throws(()=>setup({destinationOrigin:'https://securepay.ke'}));assert.throws(()=>setup({destinationOrigin:'https://test-business-other.securepay.ke'}));});
test('proof has independent 32-byte nonce and verifier and correct SHA-256',async()=>{const p=await destinationProof(webcrypto);assert.notEqual(p.nonce,p.verifier);assert.equal(p.challenge,Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(p.verifier))).toString('base64url'));});
test('workspace opened by account A cannot transfer a later account B',async()=>{const x=setup();x.s.setTokens(token('c'));const ready=await x.ready();assert.equal(await x.src.receive(ready),false);assert.equal(x.s.getSnapshot().tokens.accessToken,token('c').accessToken);assert.equal(x.issues(),0);});
