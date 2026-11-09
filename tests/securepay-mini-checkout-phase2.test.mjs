import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import {
  MINI_CHECKOUT_PREVIEW_BRANCH,
  MINI_CHECKOUT_PREVIEW_TTL_MS,
  miniCheckoutPreviewConfig,
  miniCheckoutPreviewIssue,
  miniCheckoutPreviewResolve,
  handleMiniCheckoutPreview
} from '../api/mini-checkout-preview.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const env = Object.freeze({
  VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: MINI_CHECKOUT_PREVIEW_BRANCH,
  MINI_CHECKOUT_PREVIEW_SECRET: 'T'.repeat(60),
  VERCEL_URL: 'securepay-phase2-owner.vercel.app'
});
const now = Date.UTC(2026, 10, 9, 12, 0, 0);
const config = miniCheckoutPreviewConfig(env);
const request = (method, more = {}) => ({
  method,
  headers: { host: env.VERCEL_URL, origin: config.origin, 'content-type': 'application/json',
    ...more.headers },
  url: more.url || '/api/mini-checkout-preview',
  body: more.body,
});
function response() {
  return {
    statusCode: 200, headers: {}, output: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(raw) { this.output = JSON.parse(raw); }
  };
}
async function call(req, instant = now, envOverride = env) {
  const res = response();
  await handleMiniCheckoutPreview(req, res, envOverride, instant);
  return res;
}

test('strict Preview branch + deploy host + encrypted secret; production and missing secret fail closed', () => {
  assert.ok(config.key.byteLength === 32);
  assert.equal(config.origin, 'https://' + env.VERCEL_URL);
  for (const changes of [
    { VERCEL_ENV: 'production' },
    { VERCEL_GIT_COMMIT_REF: 'main' },
    { MINI_CHECKOUT_PREVIEW_SECRET: '' },
    { MINI_CHECKOUT_PREVIEW_SECRET: 'unsafe' },
    { VERCEL_URL: 'api.securepay.ke' },
  ]) assert.equal(miniCheckoutPreviewConfig({ ...env, ...changes }), null);
});
test('server issues two opaque expiring references and never accepts caller amount/merchant terms', async () => {
  for (const source of ['STORE','SHORTSTAYS']) {
    const issued = await call(request('POST', {body:{source}}));
    assert.equal(issued.statusCode, 201);
    assert.equal(issued.output.simulationOnly, true);
    assert.equal(issued.output.expiresAt, now + MINI_CHECKOUT_PREVIEW_TTL_MS);
    assert.match(issued.output.session, /^[\w-]+\.[\w-]+\.[\w-]+$/);
    assert.doesNotMatch(issued.output.session, /STORE-DEMO|STAY-DEMO|900000|180000/);
    const readOut = await call(request('GET', {
      url: '/api/mini-checkout-preview?session=' + encodeURIComponent(issued.output.session)
    }));
    assert.equal(readOut.statusCode, 200);
    assert.equal(readOut.output.record.source, source);
    assert.equal(readOut.output.simulationOnly, true);
    assert.equal(readOut.output.agreementAccepted, false);
    assert.equal(readOut.output.reservationHeld, false);
    assert.equal(readOut.output.financialAuthority, false);
    assert.equal(readOut.headers['cache-control'], 'no-store, max-age=0');
    assert.equal(readOut.headers['referrer-policy'], 'no-referrer');
    assert.equal(readOut.headers['access-control-allow-origin'], undefined);
    assert.equal(readOut.output.record.amountMinor, source === 'STORE' ? 180000 : 900000);
  }
  const forged = await call(request('POST', {
    body: { source:'STORE', amountMinor:1, merchant:'Imposter' }
  }));
  assert.equal(forged.statusCode, 400);
});

test('tamper, cross-deployment replay, expiry, stale source and malformed references fail closed', async () => {
  const token = miniCheckoutPreviewIssue('STORE', config.origin, config.key, now);
  assert.equal(miniCheckoutPreviewResolve(token, config.origin, config.key, now + 1000).record.id,
    'STORE-DEMO-01');
  assert.equal(miniCheckoutPreviewResolve(token, config.origin, config.key, now + MINI_CHECKOUT_PREVIEW_TTL_MS), null);
  assert.equal(miniCheckoutPreviewResolve(token, 'https://other.vercel.app', config.key, now), null);
  const changed = token.slice(0,-7) + (token.at(-7) === 'A' ? 'B':'A') + token.slice(-6);
  assert.equal(miniCheckoutPreviewResolve(changed, config.origin, config.key, now), null);
  assert.equal(miniCheckoutPreviewResolve(token, config.origin,
    miniCheckoutPreviewConfig({...env,MINI_CHECKOUT_PREVIEW_SECRET:'Z'.repeat(60)}).key, now), null);
  for(const tokenValue of ['', '..', 'x'.repeat(2000), 'STORE-DEMO-01', 'PAYMENT_SUCCESS']){
    assert.equal(miniCheckoutPreviewResolve(tokenValue, config.origin, config.key, now), null);
  }
  const expired = await call(request('GET', {url:'/api/mini-checkout-preview?session='+encodeURIComponent(token)}),
    now + MINI_CHECKOUT_PREVIEW_TTL_MS);
  assert.equal(expired.statusCode, 410);
});

test('strict host/origin/method/content-type and no accidental finance route on POST', async () => {
  assert.equal((await call(request('POST',{headers:{origin:'https://evil.test'},body:{source:'STORE'}}))).statusCode,403);
  assert.equal((await call(request('POST',{headers:{host:'other.vercel.app'},body:{source:'STORE'}}))).statusCode,403);
  assert.equal((await call(request('POST',{headers:{'content-type':'text/plain'},body:{source:'STORE'}}))).statusCode,415);
  assert.equal((await call(request('POST',{body:{source:'SACCO'}}))).statusCode,400);
  assert.equal((await call(request('POST',{body:{source:'STORE',purpose:'RELEASE'}}))).statusCode,400);
  assert.equal((await call(request('DELETE'))).statusCode,405);
  assert.equal((await call(request('POST',{body:{source:'STORE'}}),now,{...env,VERCEL_ENV:'production'})).statusCode,503);
  const malformed = await call(request('GET',{url:'/api/mini-checkout-preview?session=x&amount=100'}));
  assert.equal(malformed.statusCode,400);
  const raw = read('api/mini-checkout-preview.js');
  assert.doesNotMatch(raw,/createIntent\(|PaymentInitiationService|fundFromSelf\(|\.initiate\(|providerPayment/);
  assert.match(raw,/PREVIEW_NOT_CONFIGURED/);
});

test('client rejects fake money authority, wrong source, expired record and invalid server data', () => {
  const js = ts.transpileModule(read('src/mini/checkoutServerClient.ts'), {
    compilerOptions: {target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}
  }).outputText;
  const out = {};
  runInNewContext(js,{exports:out, Date, Number, Object, String});
  const reference = miniCheckoutPreviewResolve(
    miniCheckoutPreviewIssue('SHORTSTAYS',config.origin,config.key,Date.now()),
    config.origin,config.key,Date.now()
  );
  assert.ok(out.readMiniPreviewCheckout({...reference,simulationOnly:true}));
  for(const extra of [
    { financialAuthority:true }, { reservationHeld:true }, { agreementAccepted:true },
    { simulationOnly:false }, { expiresAt:1 },
    { record:{...reference.record,hostReturnPath:'/other.html'} },
    { record:{...reference.record,amountMinor:-1} },
  ]) assert.equal(out.readMiniPreviewCheckout({...reference,simulationOnly:true,...extra}),null);
});

test('same Mini entry accepts server checkout ref first; legacy local direct preview stays isolated', () => {
  const ui = read('src/mini/MiniExperience.tsx');
  assert.match(ui, /urlParams\?\.get\('checkoutSession'\)/);
  assert.match(ui, /checkoutSession \? <MiniServerCheckout/);
  assert.match(ui, /demoRequest \? \(demoRecord/);
  const view = read('src/mini/MiniServerCheckout.tsx');
  assert.match(view, /fetchMiniPreviewCheckout\(session, controller\.signal\)/);
  assert.match(view, /MiniHostedCheckoutDemo record=\{payload\.record\}/);
  assert.match(view, /sessionExpiresAt=\{payload\.expiresAt\}/);
  const hostView = read('src/mini/MiniHostedCheckoutDemo.tsx');
  assert.match(hostView,/if \(expired\) return <section/);
  assert.match(hostView,/No payment was made/);
});

test('both sample host Pay buttons use the server issuer and never browser-priced requests', () => {
  const handler = read('public/checkout-demo-server-host.js');
  for(const host of ['checkout-demo-store.html','checkout-demo-shortstays.html']){
    const html = read(host);
    assert.match(html,/src="\/checkout-demo-server-host\.js"/);
    assert.doesNotMatch(html,/src="\/checkout-demo-host\.js"/);
    assert.doesNotMatch(html,/href="\/mini\.html\?demoCheckout=/);
  }
  assert.match(handler,/fetch\('\/api\/mini-checkout-preview'/);
  assert.match(handler,/JSON\.stringify\(\{ source: hostSource \}\)/);
  assert.match(handler,/checkoutSession=/);
  assert.match(handler,/event\.origin !== window\.location\.origin/);
  assert.match(handler,/event\.source !== frame\.contentWindow/);
  assert.match(handler,/NOT PAID/);
  assert.doesNotMatch(handler,/fetch\([^]*amountMinor/);
});
