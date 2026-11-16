import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

async function moduleFrom(entry) {
  const bundled = await build({
    stdin: { contents: `export * from './${entry}';`, resolveDir: process.cwd() },
    bundle: true, write: false, format: 'esm', platform: 'node',
  });
  return import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
}

test('B4 recognizes the user example without fabricating a cement deal', async () => {
  const p = await moduleFrom('src/features/notifications/archiveSearch.ts');
  const query = p.parseArchiveSearch('cement deal around 2016 with Tom Contractors');
  assert.equal(query.subject, 'cement');
  assert.equal(query.person, 'Tom Contractors');
  assert.equal(query.notificationQuery, 'cement');
  assert.equal(query.fromDate, '2015-01-01T00:00:00Z');
  assert.equal(query.toDate, '2018-01-01T00:00:00Z');
  assert.equal(query.explicitPerson, true);
  assert.equal(Object.hasOwn(query, 'agreementId'), false);
});

test('B4 distinguishes exact year, named party, and undated subject', async () => {
  const p = await moduleFrom('src/features/notifications/archiveSearch.ts');
  const exact = p.parseArchiveSearch('cement in 2016');
  assert.equal(exact.subject,'cement');
  assert.equal(exact.fromDate,'2016-01-01T00:00:00Z');
  assert.equal(exact.toDate,'2017-01-01T00:00:00Z');
  const merchant = p.parseArchiveSearch('with Tom Contractors');
  assert.equal(merchant.person,'Tom Contractors');
  const ordinary = p.parseArchiveSearch('solar floodlight');
  assert.equal(ordinary.subject,'solar floodlight');
  assert.equal(ordinary.fromDate,null);
  assert.throws(() => p.parseArchiveSearch('  '), /Describe/);
});

test('B4 agreement results de-duplicate exact canonical IDs and never invent empty matches', async () => {
  const p = await moduleFrom('src/features/notifications/archiveSearch.ts');
  assert.deepEqual(p.uniqueAgreements([[],[]]),[]);
  assert.deepEqual(p.uniqueAgreements([
    [{agreementId:'id-1',title:'cement'}],
    [{agreementId:'id-1',title:'fake duplicate'},{agreementId:'id-2',title:'another'}],
  ]),[{agreementId:'id-1',title:'cement'},{agreementId:'id-2',title:'another'}]);
});

test('B4 message API uses only authenticated sender and the original agreement ID', async () => {
  const { createAgreementMessagesGateway } = await moduleFrom('src/api/securepay/agreement-messages/index.ts');
  const calls = [];
  const api = createAgreementMessagesGateway({
    request: async (url, options) => {
      calls.push({url,options});
      return [];
    },
  });
  await api.thread('agreement-1',0,20);
  await api.search({query:'cement',page:0,size:20,fromDate:'2015-01-01T00:00:00Z'});
  await api.send('agreement-1','Please confirm delivery','c1f4bd75-74a1-4551-aeee-f4190d2b7d11');
  assert.match(calls[0].url, /^\/api\/v1\/agreements\/agreement-1\/messages\?/);
  assert.equal(calls[0].options.auth, 'required');
  assert.match(calls[1].url, /^\/api\/v1\/me\/agreement-messages\/search\?/);
  assert.equal(calls[1].options.auth, 'required');
  assert.equal(calls[2].options.method,'POST');
  assert.equal(calls[2].options.auth, 'required');
  assert.equal(calls[2].options.body.body,'Please confirm delivery');
  assert.equal(calls[2].options.body.clientMessageId,'c1f4bd75-74a1-4551-aeee-f4190d2b7d11');
  assert.equal('senderIdentityId' in calls[2].options.body,false);
  assert.equal('paymentReady' in calls[2].options.body,false);
});

test('B4 public notification and Agreement searches remain self-scoped', async () => {
  const notifications = await moduleFrom('src/api/securepay/notifications/index.ts');
  const agreements = await moduleFrom('src/api/securepay/agreements/index.ts');
  const calls = [];
  const http={request:async (url,opts)=>{calls.push({url,opts});return [];}};
  await notifications.createNotificationsGateway(http).search({query:'cement'});
  await agreements.createAgreementGateway(http).searchAgreements({person:'Tom Contractors',subject:'cement',page:0,size:20});
  assert.match(calls[0].url,/^\/api\/v1\/notifications\/me\/search\?/);
  assert.match(calls[1].url,/^\/api\/v1\/me\/agreements\/search\?/);
  assert.ok(calls.every(x=>x.opts.auth==='required'));
  assert.equal(calls[0].url.includes('recipientIdentityId'),false);
});

test('B4 Mini owns search, original records and conversation without independent Money authority', () => {
  const files = [
    'src/features/notifications/ArchiveSearchPanel.tsx',
    'src/features/notifications/AgreementThreadPanel.tsx',
    'src/features/notifications/NotificationsExperience.tsx',
    'src/RuntimeApp.tsx',
  ];
  const source = files.map(p=>readFileSync(p,'utf8'));
  assert.match(source[0],/Read original Inbox record/);
  assert.match(source[0],/Read original conversation/);
  assert.match(source[1],/clientMessageId|pending\.current|crypto\.randomUUID/);
  assert.match(source[2],/ArchiveSearchPanel/);
  assert.match(source[3],/location\.hash === '#\/inbox'/);
  assert.equal(source.join('\n').includes('initiatePayment('), false);
  assert.equal(source.join('\n').includes('issuePublicLocator('), false);
});
