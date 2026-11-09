import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const compiled = ts.transpileModule(read('src/mini/miniGuestConfig.ts').replaceAll('import.meta.env','({})'), {
  compilerOptions: {target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}
}).outputText;
const config={};
runInNewContext(compiled,{exports:config,URL,String});

test('public pilot config is site-scoped, staging-only and excludes production',()=>{
  const valid=config.validateMiniPilotConfig('securepay-mini-owner-preview','https://sandbox.securepay.ke');
  assert.equal(valid.apiBaseUrl,'https://sandbox.securepay.ke');
  for(const host of ['https://securepay.ke','https://api.securepay.ke',
    'https://securepay-123.vercel.app','http://sandbox.securepay.ke','https://evil.com',
    'https://sandbox.securepay.ke/private','https://sandbox.securepay.ke/?secret=1',
    'https://example.securepay.ke','https://sandbox.securepay.ke:8443']) {
    assert.equal(config.validateMiniPilotConfig('securepay-mini-owner-preview',host),null,host);
  }
  for(const site of ['', '../x','a','with spaces','a'.repeat(65)])
    assert.equal(config.validateMiniPilotConfig(site,'https://sandbox.securepay.ke'),null,site);
  assert.equal(config.getMiniPilotConfig(),null);
});

test('discussion requires explicit click, never passes party identity or token into message',()=>{
  const message=config.miniDiscussionPrompt('Two items','1,250','2','bags','Collection after inspection');
  assert.match(message,/Two items/);
  assert.match(message,/KSh 1,250/);
  assert.match(message,/Quantity 2 bags/);
  assert.ok(config.miniDiscussionPrompt('X'.repeat(2000),'','','','').length<=1200);
  assert.match(read('src/mini/MiniExperience.tsx'),/setDiscussDraft\(draft\); setScreen\('help'\)/);
  assert.doesNotMatch(read('src/mini/miniGuestConfig.ts'),/counterparty|guestToken|inviteSecret/);
});

test('Mini uses the existing SecurePay guest SDK, not a parallel model or new payment API',()=>{
  const html=read('mini.html'),sdk=read('public/embed/securepay-guest-agent.js');
  const chat=read('src/mini/MiniGuestChat.tsx');
  assert.match(html,/<script src="\/embed\/securepay-guest-agent\.js"><\/script>/);
  assert.match(sdk,/SecurePayGuestAgent = Object.freeze/);
  assert.match(sdk,/\/api\/v1\/public\/embed\/installations\//);
  assert.match(sdk,/reviewAgreement:reviewAgreement/);
  assert.match(sdk,/prepareAgreementReview:prepareAgreementReview/);
  assert.match(chat,/window\.SecurePayGuestAgent\.create\(config\)/);
  assert.match(chat,/client\.reviewAgreement\(tz\(\)\)/);
  assert.match(chat,/client\.prepareAgreementReview\(\)/);
  assert.doesNotMatch(chat,/fetch\(|Bearer |X-SecurePay-Conversation-Token|releaseFunds|issueSecureLink/);
  assert.doesNotMatch(chat,/Math\.random|mockAgent|fakeReply/);
});

test('unapproved guest site cannot open a KS001 conversation',async()=>{
  let requests=0;
  const fake={
    crypto:{randomUUID:()=> '00000000-0000-4000-a000-000000000001'},
    fetch:async()=>{
      requests++;
      return {ok:true,json:async()=>({schemaVersion:'securepay-embed-guest-v3',
        siteId:'securepay-mini-owner-preview',guestChatAvailable:false,
        enabledOperations:{ask:false},authenticatedOperationsAvailable:false})};
    }
  };
  runInNewContext(read('public/embed/securepay-guest-agent.js'),{
    window:fake,URL,Date,Number,Object,JSON,Error,encodeURIComponent
  });
  const client=fake.SecurePayGuestAgent.create({
    siteId:'securepay-mini-owner-preview',apiBaseUrl:'https://sandbox.securepay.ke'
  });
  const result=await client.connect();
  assert.equal(result.ready,false);
  assert.equal(result.status,'disabled');
  await assert.rejects(client.send('Try to force a request'));
  assert.equal(requests,1);
});

test('approved SDK uses backend-generated reply and version-locked Agreement review only',async()=>{
  const requests=[];
  const conversationId='00000000-0000-4000-a000-000000000003';
  const handoffId='00000000-0000-4000-a000-000000000004';
  const fake={
    crypto:{randomUUID:()=> '00000000-0000-4000-a000-000000000001'},
    fetch:async(url,args)=>{
      requests.push({url,args});
      let value;
      if(args.method==='GET'&&url.endsWith('/installations/securepay-mini-owner-preview'))
        value={schemaVersion:'securepay-embed-guest-v3',siteId:'securepay-mini-owner-preview',
          guestChatAvailable:true,enabledOperations:{ask:true},authenticatedOperationsAvailable:false};
      else if(args.method==='POST'&&url.endsWith('/conversations'))
        value={conversationId,conversationAccessSecret:'b'.repeat(48),
          anonymousExpiresAt:new Date(Date.now()+3600000).toISOString()};
      else if(args.method==='POST'&&url.endsWith('/turns'))
        value={message:'AUTHORITATIVE_BACKEND_KS001_REPLY'};
      else if(args.method==='GET'&&url.includes('/agreement-formation'))
        value={conversationId,version:7,stage:'NEEDS_REVIEW',
          summary:'AUTHORITATIVE_BACKEND_SUMMARY',openPoints:['Confirm handover conditions'],
          reviewable:true,confirmable:false};
      else if(args.method==='POST'&&url.endsWith('/agreement-handoff'))
        value={handoffId,conversationId,tradeContextVersion:7,status:'PREPARED',
          mustResolve:[],stillToDecide:['Buyer acceptance']};
      else throw Error('Unexpected request: '+url);
      return {ok:true,status:200,json:async()=>value};
    }
  };
  runInNewContext(read('public/embed/securepay-guest-agent.js'),{
    window:fake,URL,Date,Number,Object,JSON,Error,encodeURIComponent
  });
  const client=fake.SecurePayGuestAgent.create({
    siteId:'securepay-mini-owner-preview',apiBaseUrl:'https://sandbox.securepay.ke'
  });
  assert.equal((await client.connect()).ready,true);
  const reply=await client.send('I want to discuss an ordinary purchase');
  assert.equal(reply.entries[1].text,'AUTHORITATIVE_BACKEND_KS001_REPLY');
  const review=await client.reviewAgreement('Africa/Nairobi');
  assert.equal(review.agreement.version,7);
  assert.equal(review.agreement.summary,'AUTHORITATIVE_BACKEND_SUMMARY');
  const prepared=await client.prepareAgreementReview();
  assert.equal(prepared.preparedReview.tradeContextVersion,7);
  const urls=requests.map(x=>new URL(x.url).pathname);
  for(const route of ['/turns','/agreement-formation','/agreement-handoff'])
    assert.equal(urls.filter(x=>x.endsWith(route)).length,1,route);
  assert.equal(urls.some(x=>/sign|fund|payment|invite|release|settle/i.test(x)),false);
  for(const x of requests){assert.equal(x.args.credentials,'omit');assert.equal(x.args.redirect,'error');}
  const turn=requests.find(x=>x.url.endsWith('/turns'));
  assert.equal(turn.args.headers['X-SecurePay-Conversation-Token'],'b'.repeat(48));
  assert.equal(requests[0].args.headers['X-SecurePay-Conversation-Token'],undefined);
});

test('identity, invitation and actual settlement explicitly remain disabled in guest Mini',()=>{
  const ui=read('src/mini/MiniGuestChat.tsx');
  assert.match(ui,/KS001 is not connected in this preview/);
  assert.match(ui,/No participant has accepted yet/);
  assert.match(ui,/Not signed, not invited, not accepted and not funded/);
  assert.match(ui,/does not transfer this guest conversation automatically/);
  assert.match(ui,/A typed KS Number does not verify someone/);
  assert.match(read('src/main.tsx'),/RuntimeApp/);
});
