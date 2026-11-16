import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

async function moduleFrom(path) {
  const b=await build({
    stdin:{ contents:`export * from './${path}';`,resolveDir:process.cwd() },
    bundle:true,write:false,platform:'node',format:'esm',
  });
  return import(`data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`);
}

test('B5 all three original read authorities are self-scoped; no second Shortstays Inbox', async () => {
  const m=await moduleFrom('src/api/securepay/agreement-messages/index.ts');
  const n=await moduleFrom('src/api/securepay/notifications/index.ts');
  const a=await moduleFrom('src/api/securepay/agreements/index.ts');
  const calls=[];
  const http={request:async(url,options={})=>{calls.push({url,options});return [];}};
  const conv=m.createAgreementMessagesGateway(http);
  const inbox=n.createNotificationsGateway(http);
  const agreements=a.createAgreementGateway(http);
  await conv.thread('abc-123',0,20);
  await conv.search({query:'cement',page:0,size:20});
  await inbox.search({query:'cement',page:0,size:20});
  await agreements.searchAgreements({subject:'cement',person:'Tom Contractors',page:0,size:20});
  await conv.send('abc-123','Can we confirm the delivery?','10bb0454-5d4c-40a2-807f-38f48fe674cd');
  assert.deepEqual(calls.map(x=>x.url.split('?')[0]),[
    '/api/v1/agreements/abc-123/messages',
    '/api/v1/me/agreement-messages/search',
    '/api/v1/notifications/me/search',
    '/api/v1/me/agreements/search',
    '/api/v1/agreements/abc-123/messages',
  ]);
  assert.ok(calls.every(x=>x.options.auth==='required'));
  assert.equal(calls[4].options.method,'POST');
  assert.deepEqual(Object.keys(calls[4].options.body).sort(),['body','clientMessageId']);
  assert.ok(calls.every(x=>!x.url.includes('recipientIdentityId=')));
  assert.ok(calls.every(x=>!x.url.includes('/money/')));
});

test('B5 fresh UI sessions cannot carry credential tokens across KSNumber identities', async () => {
  const s=await moduleFrom('src/api/securepay/session.ts');
  const session=s.createSessionStore();
  let state=session.getSnapshot();
  const changes=[];
  session.subscribe(()=>changes.push(session.getSnapshot()));
  const dummy=(value)=>({accessToken:value,refreshToken:'placeholder',accessTokenExpiresAt:'2100-01-01T00:00:00Z'});
  session.setTokens(dummy('token-A'));
  assert.equal(session.getAccessToken(),'token-A');
  session.clear();
  assert.equal(session.getAccessToken(),null);
  session.setTokens(dummy('token-B'));
  assert.equal(session.getAccessToken(),'token-B');
  assert.equal(changes.length,3);
  assert.notStrictEqual(changes[0],changes[2]);
  assert.notStrictEqual(state,changes[2]);
});

test('B5 historical query is a date/party filter, never fabricated 2016 evidence', async () => {
  const a=await moduleFrom('src/features/notifications/archiveSearch.ts');
  const plan=a.parseArchiveSearch('cement deal around 2016 with Tom Contractors');
  assert.deepEqual([plan.person,plan.subject],['Tom Contractors','cement']);
  assert.equal(plan.fromDate,'2015-01-01T00:00:00Z');
  assert.equal(plan.toDate,'2018-01-01T00:00:00Z');
  assert.equal('results' in plan,false);
  assert.equal('agreementId' in plan,false);
});

test('B5 stable indexed search paging does not repeat overlapping notifications', () => {
  const source=readFileSync('src/features/notifications/ArchiveSearchPanel.tsx','utf8');
  assert.match(source,/nextNotificationPage/);
  assert.match(source,/setNextNotificationPage\(value => value \+ 1\)/);
  assert.match(source,/nextConversationPage/);
  assert.match(source,/setNextConversationPage\(value => value \+ 1\)/);
  assert.match(source,/session\.getSnapshot\(\) !== identity/);
  assert.doesNotMatch(source,/Math\.floor\(results\.notifications\.length/);
  assert.match(source,/Read original conversation/);
  assert.match(source,/Open original Agreement/);
  assert.match(source,/Read original Inbox record/);
});

test('B5 surfaces only canonical original communication, not financial instructions', () => {
  const src=readFileSync('src/features/notifications/AgreementThreadPanel.tsx','utf8');
  assert.match(src,/crypto\.randomUUID/);
  assert.match(src,/pending\.current/);
  assert.match(src,/gateway\.thread/);
  assert.match(src,/gateway\.send/);
  assert.doesNotMatch(src,/initiatePayment\(|issuePublicLocator\(|authoriseFundRelease/);
  const route=readFileSync('src/RuntimeApp.tsx','utf8');
  assert.match(route,/#\/inbox/);
});
