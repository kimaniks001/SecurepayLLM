import test from 'node:test';
import assert from 'node:assert/strict';
import { approvedSecurePayStagingOrigin, resolveGate3PreviewTarget,
  GATE3_VERCEL_PROJECT_ID, GATE3_CONFIRMATION,
  isGate3WorkspaceWriteAllowed } from '../api/preview-staging-policy.js';
import agentRelay from '../api/preview-agent.js';
import workspaceRelay from '../api/preview-workspace.js';

const good = {
  VERCEL_PROJECT_ID: GATE3_VERCEL_PROJECT_ID,
  SECUREPAY_STAGING_TEST_ONLY: GATE3_CONFIRMATION,
  SECUREPAY_STAGING_API_ORIGIN: 'https://ks001-staging-api.securepay.ke',
};

function response() {
  return {
    statusCode: 200, headers: {}, payload: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.payload = value; },
  };
}
function request(method, path, body, headers={}) {
  return {
    method, query: {path}, body,
    headers: {
      host:'securepay-test.vercel.app',
      origin:'https://securepay-test.vercel.app',
      'sec-fetch-site':'same-origin',
      ...headers
    }
  };
}
async function withConfiguredStaging(action) {
  const keys=Object.keys(good);
  const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  for (const [k,v] of Object.entries(good)) process.env[k]=v;
  try { return await action(); } finally {
    for (const k of keys) {
      if (old[k]===undefined) delete process.env[k];
      else process.env[k]=old[k];
    }
  }
}
async function withStubbedFetch(action) {
  const previous=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async (url, init)=>{
    calls.push({url:String(url), method:init?.method,headers:init?.headers,body:init?.body});
    return new Response('{"ok":true}', {status:200,headers:{'Content-Type':'application/json'}});
  };
  try { await action(calls); } finally { globalThis.fetch=previous; }
}

test('preview cannot silently switch away from read-only production',()=>{
  assert.deepEqual(resolveGate3PreviewTarget({}),{
    origin:'https://securepay.ke',writesEnabled:false
  });
  assert.equal(resolveGate3PreviewTarget({VERCEL_PROJECT_ID:GATE3_VERCEL_PROJECT_ID}),
    null,'Unconfigured staging project must NEVER read production');
  for(const invalid of [
    {...good,VERCEL_PROJECT_ID:'prj_another'},
    {...good,VERCEL_PROJECT_ID:undefined},
    {...good,SECUREPAY_STAGING_TEST_ONLY:'approved'},
    {...good,SECUREPAY_STAGING_TEST_ONLY:undefined},
    {...good,SECUREPAY_STAGING_API_ORIGIN:'https://securepay.ke'},
    {...good,SECUREPAY_STAGING_API_ORIGIN:'https://staging.securepay.ke.evil.com'},
    {...good,SECUREPAY_STAGING_API_ORIGIN:'https://ks001-staging-api.invalid'},
    {...good,SECUREPAY_STAGING_API_ORIGIN:'http://staging-api.securepay.ke'},
    {...good,SECUREPAY_STAGING_API_ORIGIN:'https://staging-api.securepay.ke/private'},
    {...good,SECUREPAY_STAGING_API_ORIGIN:'https://user:pass@staging-api.securepay.ke'},
    {...good,SECUREPAY_STAGING_API_ORIGIN:'https://staging-api.securepay.ke:8443'},
    {...good,SECUREPAY_STAGING_API_ORIGIN:'https://staging-api.securepay.ke?redirect=production'}
  ]) assert.equal(resolveGate3PreviewTarget(invalid),null);
  assert.equal(approvedSecurePayStagingOrigin('https://ks001-staging-api.securepay.ke'),
    'https://ks001-staging-api.securepay.ke');
  assert.deepEqual(resolveGate3PreviewTarget(good),{
    origin:'https://ks001-staging-api.securepay.ke',writesEnabled:true
  });
});
test('only authentication and resume can write via staging workspace',()=>{
  for(const path of [
    '/api/v1/auth/login','/api/v1/auth/complete','/api/v1/auth/refresh',
    '/api/v1/auth/mfa/resend','/api/agent/saved-builds/abcdefgh/resume'
  ]) assert.equal(isGate3WorkspaceWriteAllowed('POST',path),true);
  for(const path of [
    '/api/v1/payment-intents','/api/v1/store/me/offers',
    '/api/v1/vision-dreams','/api/v1/community/circles/abcdefgh/objects',
    '/api/v1/auth/signup/start','/api/v1/agreements'
  ]) assert.equal(isGate3WorkspaceWriteAllowed('POST',path),false);
  assert.equal(isGate3WorkspaceWriteAllowed('DELETE','/api/v1/vision-dreams/abcdefgh'),false);
  assert.equal(isGate3WorkspaceWriteAllowed('PATCH','/api/v1/vision-dreams/abcdefgh'),false);
});

test('staging relay forwards only test sign-in to fixed approved HTTPS API, not headers or arbitrary host',async()=>{
  await withConfiguredStaging(async()=>{
    await withStubbedFetch(async calls=>{
      const result=response();
      await workspaceRelay(request('POST','/api/v1/auth/login',{},{
        'content-type':'application/json',cookie:'prod-cookie=not-forwarded'
      }),result);
      assert.equal(result.statusCode,200);
      assert.equal(calls.length,1);
      assert.equal(calls[0].url,'https://ks001-staging-api.securepay.ke/api/v1/auth/login');
      assert.equal(calls[0].headers.cookie,undefined);

      const forbidden=response();
      await workspaceRelay(request('POST','/api/v1/store/me/offers',{},{
        'content-type':'application/json',authorization:'Bearer testtoken123456'
      }),forbidden);
      assert.equal(forbidden.statusCode,403);
      assert.match(forbidden.payload,/Staging write outside authentication/);
      assert.equal(calls.length,1,'Disallowed write must not reach any upstream');
    });
  });
});
test('staging KS001 allows only synthetic drafts, not invitations or source uploads',async()=>{
  await withConfiguredStaging(async()=>{
    await withStubbedFetch(async calls=>{
      const allowed=response();
      await agentRelay(request('POST','/api/agent/conversations'),allowed);
      assert.equal(allowed.statusCode,200);
      assert.equal(calls[0].url,'https://ks001-staging-api.securepay.ke/api/agent/conversations');
      for(const path of [
        '/api/agent/conversations/abcdefgh/identity-selections',
        '/api/agent/conversations/abcdefgh/sources/upload',
        '/api/agent/conversations/abcdefgh/sources/place',
        '/api/agent/conversations/abcdefgh/sources/ijklmnop/retry'
      ]) {
        const denied=response();
        await agentRelay(request('POST',path,{ksNumber:'KS123456'}),denied);
        assert.equal(denied.statusCode,403,path);
        assert.match(denied.payload,/Staging write outside draft/);
      }
      assert.equal(calls.length,1,'All disallowed writes must stay local');
    });
  });
});
test('misconfigured staging returns 503 before production fallback, even for GET',async()=>{
  const prev=process.env.SECUREPAY_STAGING_API_ORIGIN;
  process.env.SECUREPAY_STAGING_API_ORIGIN='https://securepay.ke';
  try {
    await withStubbedFetch(async calls=>{
      const r=response();
      await workspaceRelay(request('GET','/api/v1/me/agreements'),r);
      assert.equal(r.statusCode,503);
      assert.equal(calls.length,0);
    });
  } finally {
    if(prev===undefined)delete process.env.SECUREPAY_STAGING_API_ORIGIN;
    else process.env.SECUREPAY_STAGING_API_ORIGIN=prev;
  }
});
