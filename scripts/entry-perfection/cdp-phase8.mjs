// Entry Perfection Phase 8 -- real-browser Context, Identity & Authority checks (headless Chrome via the DevTools Protocol).
//
// Classification: measurement tooling, local/sandbox only, against a REAL local SecurePayAPI with the model provider `none`
// (UR-240: no model, so SecurePay cannot form understanding itself). The agreement-formation response (with the server's planned
// question) is therefore substituted IN THE BROWSER (same shape the API returns -- proven by the API golden, controller and
// integration tests), while everything the person does next hits the REAL API: a quick answer is a REAL conversation turn (its
// real reply comes back from the real orchestrator), the question is re-read after every turn, and Q6 reads the real endpoint.
//
//   node scripts/entry-perfection/cdp-phase8.mjs [--url http://localhost:5173/]
// Output: build/entry-perfection/browser-phase8.json
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const URL_ = arg('--url', 'http://localhost:5173/');
const CHROME = arg('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const FIXTURES_TEXT = resolve(arg('--text-fixtures', '../SecurePayAPI/services/agreement/src/test/resources/entry-perfection'));
const FIXTURES_BIN = resolve(arg('--bin-fixtures', '../SecurePayAPI/services/agreement/build/entry-perfection/fixtures'));
const PORT = 9357;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = await mkdtemp(join(tmpdir(), 'ep8-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
let version;
for (let i = 0; i < 50 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(200); } }
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let nextId = 0; const pending = new Map(); const listeners = [];
ws.addEventListener('message', event => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) { const { ok, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : ok(msg.result); }
  else listeners.forEach(l => l(msg));
});
const send = (method, params = {}, sessionId) => new Promise((ok, reject) => { const id = ++nextId; pending.set(id, { ok, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });

async function page(width = 1280, height = 900) {
  const { browserContextId } = await send('Target.createBrowserContext');
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (method, params) => send(method, params, sessionId);
  await s('Page.enable'); await s('Runtime.enable'); await s('DOM.enable');
  await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  const evaluate = async expression => {
    const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const waitFor = async (expression, timeout = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) { if (await evaluate(`!!(${expression})`)) return Date.now() - start; await sleep(40); }
    return null;
  };
  const goto = async url => { await s('Page.navigate', { url }); await waitFor('document.readyState === "complete" && !!document.querySelector("textarea")'); };
  const setText = (selector, value) => evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    const setter = Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true;
  })()`);
  const clickText = (text, scope = 'button, [role=menuitem]') => evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(scope)})].find(b => b.innerText.trim().toLowerCase().includes(${JSON.stringify(text.toLowerCase())}) && !b.disabled);
    if (!el) return false; el.click(); return true;
  })()`);
  const click = selector => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el || el.disabled) return false; el.click(); return true; })()`);
  const setFile = async (selector, path) => {
    const { root } = await s('DOM.getDocument');
    const { nodeId } = await s('DOM.querySelector', { nodeId: root.nodeId, selector });
    await s('DOM.setFileInputFiles', { nodeId, files: [path] });
  };
  const bodyText = () => evaluate('document.body.innerText');
  const alerts = () => evaluate(`[...document.querySelectorAll('[role=alert]')].map(a => a.innerText.trim()).filter(Boolean)`);
  const statuses = () => evaluate(`[...document.querySelectorAll('[role=status]')].map(a => a.innerText.trim()).filter(Boolean)`);
  const ks001Replies = () => evaluate(`(() => { const log = document.querySelector('[role=log]'); if (!log) return []; return [...log.children].map(c => c.innerText.trim()).filter(Boolean); })()`);
  // Reads the canonical source list with the tab's own possession secret; the secret never leaves the page.
  const apiSources = () => evaluate(`(async () => {
    const raw = sessionStorage.getItem('securepay.agent.anonymous.v1'); if (!raw) return null;
    const rec = JSON.parse(raw);
    const r = await fetch('/api/agent/conversations/' + rec.conversationId + '/sources', { headers: { 'X-SecurePay-Conversation-Token': rec.secret, Accept: 'application/json' } });
    const body = await r.json();
    return body.sources.map(x => ({ status: x.extractionStatus, generation: x.extractionGeneration, kind: x.sourceKind }));
  })()`);
  const intercept = async (urlPattern, onPaused) => {
    await s('Fetch.enable', { patterns: [{ urlPattern, requestStage: 'Response' }] });
    const listener = msg => { if (msg.method === 'Fetch.requestPaused' && msg.sessionId === sessionId) onPaused(msg.params, s); };
    listeners.push(listener);
    return async () => { listeners.splice(listeners.indexOf(listener), 1); await s('Fetch.disable'); };
  };
  const openPastePanel = async () => {
    for (const opener of ['text:Add what you have', 'sel:button[aria-label="Add a source"]']) {
      const opened = opener.startsWith('text:') ? await clickText(opener.slice(5), 'button') : await click(opener.slice(4));
      if (!opened) continue;
      await sleep(200);
      if (await clickText('Paste a plan', '[role=menuitem], [role=menu] button')
          && await waitFor('document.querySelector(\'[role=dialog][aria-label="Bring your plan"]\')', 3000) !== null) return true;
    }
    throw new Error('could not open Bring your plan; buttons: ' + JSON.stringify(await evaluate(`[...document.querySelectorAll('button')].map(b => (b.getAttribute('aria-label') || b.innerText).trim()).filter(Boolean).slice(0, 40)`)));
  };
  return { s, evaluate, waitFor, goto, setText, clickText, click, setFile, bodyText, alerts, statuses, ks001Replies, apiSources, intercept, openPastePanel, close: () => send('Target.disposeBrowserContext', { browserContextId }) };
}



const results = [];
async function journey(id, fn) { try { await fn(); } catch (error) { results.push({ journey: id, harnessError: String(error.message || error).slice(0, 600) }); } }
const noHorizontalScroll = p => p.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1');
const firstTurn = async (p, text) => {
  await p.goto(URL_);
  await p.setText('textarea', text);
  await p.click('button[aria-label="Send"]');
  await p.waitFor(`/Your message is here/.test((document.querySelector('[role=log]')||{}).innerText||'')`, 20000);
};
const realVersion = p => p.evaluate(`(async () => {
  const rec = JSON.parse(sessionStorage.getItem('securepay.agent.anonymous.v1'));
  const r = await fetch('/api/agent/conversations/' + rec.conversationId + '/context', { headers: { 'X-SecurePay-Conversation-Token': rec.secret, Accept: 'application/json' } });
  return (await r.json()).version;
})()`);
const formation = (conversationId, version) => ({
  conversationId, version, digest: 'd' + version, stage: 'UNDERSTOOD', reviewable: true, confirmable: true,
  reviewBlockedReason: null, confirmationBlockedReason: null, summary: 'Retile the bathroom, by Kamau: KES 95,000 total.',
  what: [{ key: 'what:tile', label: 'Work', value: 'Retile the bathroom', basis: 'STATED', needsChecking: false, evidence: [] }],
  who: [{ key: 'who:kamau', name: 'Kamau', role: 'Provider', identity: 'DESCRIBED', describedAs: 'as you described', evidence: [], link: 'NOT_LINKED', participation: 'NOT_JOINED' },
    { key: 'who:njoroge', name: 'Kamau Njoroge', role: null, identity: 'VERIFIED', ksNumber: 'KS000123', evidence: [], link: 'LINKED', participation: 'NOT_JOINED' }],
  money: [{ key: 'money:total', label: 'Total price', value: 'KES 95,000', basis: 'YOURS', needsChecking: false, evidence: [] }],
  when: [], responsibilities: [], conditions: [], notIncluded: [],
  origin: { type: 'STORE', title: 'Bathroom tiling package', offeredBy: 'KS000321', priceNow: 'KES 95,000', priceChanged: false },
  openPoints: [], question: { ask: false, reason: 'REVIEW_READY' },
});
const serve = (p, versionOf) => p.intercept('*/agreement-formation*', (params, s) => {
  const conversationId = (params.request.url.match(/conversations\/([^/]+)\/agreement-formation/) || [])[1] || 'c';
  s('Fetch.fulfillRequest', { requestId: params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    body: Buffer.from(JSON.stringify(formation(conversationId, versionOf()))).toString('base64') });
});
const refresh = p => p.evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => /Refresh what we have/.test(x.innerText)); if (b) b.click(); })()`);
const CARD = '[aria-labelledby="agreement-shaping-title"]';
const REVIEW = 'section[aria-labelledby="agreement-review-title"]';

for (const [id, width, height] of [['P1', 1280, 900], ['P2', 390, 844], ['P3', 320, 700], ['P4', 768, 1024]]) {
  await journey(id, async () => {
    const p = await page(width, height);
    await firstTurn(p, 'Kamau will tile my bathroom for KES 95,000.');
    const version = await realVersion(p);
    const stop = await serve(p, () => version);
    await refresh(p);
    await p.waitFor(`/Your agreement is taking shape/.test(document.body.innerText)`, 8000);
    const noSignInYet = !/Sign in to continue/.test(await p.bodyText());
    await p.evaluate(`document.querySelector('${CARD} button').focus()`);
    await p.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await p.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    const opened = await p.waitFor(`!!document.getElementById('agreement-review-title')`, 5000);
    const review = await p.evaluate(`document.querySelector('${REVIEW}').innerText`);
    await stop();
    results.push({ journey: id, title: `Described vs verified parties in Review at ${width}px (signed out)`,
      reviewOpenedByKeyboardWithoutSignIn: opened !== null && noSignInYet,
      describedShownAsNotLinked: /Kamau · Provider[\s\S]*not yet linked to a SecurePay identity/.test(review),
      verifiedShownAsNotJoined: /KS000123 · linked to a verified SecurePay identity · hasn’t joined yet/.test(review),
      nobodyElseAgreedShown: /Nobody else has joined or agreed yet/.test(review),
      storeSellerNotParticipant: /offered by KS000321 \(not a participant yet\)/.test(review),
      askedForKsNumber: /KS Number\?|phone number\?/i.test(await p.bodyText()),
      identityJargon: /DESCRIBED|NOT_LINKED|NOT_JOINED|VERIFIED|ANONYMOUS/.test(review),
      noHorizontalScroll: await noHorizontalScroll(p) });
    await p.close();
  });
}

await journey('P5', async () => {
  const p = await page(390, 844);
  await firstTurn(p, 'Kamau will tile my bathroom for KES 95,000.');
  const version = await realVersion(p);
  // One interception for both: the substituted formation, and a set-up refused by authority (as a live 403 would be).
  const stop = await p.intercept('*', (params, s) => {
    const url = params.request.url;
    if (/agreement-formation/.test(url)) {
      const conversationId = (url.match(/conversations\/([^/]+)\/agreement-formation/) || [])[1] || 'c';
      s('Fetch.fulfillRequest', { requestId: params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify(formation(conversationId, version))).toString('base64') });
    } else if (/agreement-handoff$/.test(url) && params.request.method === 'POST') {
      s('Fetch.fulfillRequest', { requestId: params.requestId, responseCode: 403, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } })).toString('base64') });
    } else {
      s('Fetch.continueResponse', { requestId: params.requestId });
    }
  });
  const stopHandoff = async () => {};
  await refresh(p);
  await p.waitFor(`/Your agreement is taking shape/.test(document.body.innerText)`, 8000);
  await p.clickText('Review this', `${CARD} button`);
  await p.waitFor(`!!document.getElementById('agreement-review-title')`, 5000);
  await p.clickText('Set this up securely');
  const shown = await p.waitFor(`/current permissions/.test(document.body.innerText)`, 8000);
  const body = await p.bodyText();
  await stopHandoff(); await stop();
  results.push({ journey: 'P5', title: 'Authority refused at set-up keeps the agreement', calmMessageShown: shown !== null,
    agreementStillThere: /Review this agreement/.test(body) && /Retile the bathroom/.test(body), rawStatusShown: /403|Forbidden|Access denied/.test(body),
    alertAnnounced: await p.evaluate(`[...document.querySelectorAll('[role=alert]')].some(a => /current permissions/.test(a.innerText))`) });
  await p.close();
});

await mkdir('build/entry-perfection', { recursive: true });
await writeFile('build/entry-perfection/browser-phase8.json', JSON.stringify({ url: URL_, generatedAt: new Date().toISOString(), results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
ws.close(); chrome.kill();
