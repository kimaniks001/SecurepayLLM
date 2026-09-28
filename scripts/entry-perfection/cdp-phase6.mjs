// Entry Perfection Phase 6 -- real-browser Agreement Formation checks (headless Chrome via the DevTools Protocol).
//
// Classification: measurement tooling, local/sandbox only, against a REAL local SecurePayAPI with the model provider `none`
// (UR-240: no model, so SecurePay cannot form understanding itself). The emerging-agreement response is therefore substituted
// IN THE BROWSER (same shape the API returns, proven by AgentAgreementFormationControllerTest / integration tests), while
// everything the person does next hits the REAL API: "Set this up securely" -> real handoff creation carrying the reviewed
// version -> the real sign-in boundary; a stale version -> the real 409. R6 reads the real anonymous endpoint directly.
//
//   node scripts/entry-perfection/cdp-phase6.mjs [--url http://localhost:5173/]
// Output: build/entry-perfection/browser-phase6.json
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const URL_ = arg('--url', 'http://localhost:5173/');
const CHROME = arg('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const FIXTURES_TEXT = resolve(arg('--text-fixtures', '../SecurePayAPI/services/agreement/src/test/resources/entry-perfection'));
const FIXTURES_BIN = resolve(arg('--bin-fixtures', '../SecurePayAPI/services/agreement/build/entry-perfection/fixtures'));
const PORT = 9337;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = await mkdtemp(join(tmpdir(), 'ep6-chrome-'));
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
const ev = (name, locator) => ({ sourceArtifactId: '00000000-0000-4000-8000-00000000000' + name.length, sourceName: name, locator, removed: false });
const formation = (conversationId, version, checked, confirmable) => ({
  conversationId, version, digest: 'd' + version, stage: 'UNDERSTOOD', reviewable: true, confirmable,
  reviewBlockedReason: null, confirmationBlockedReason: confirmable ? null : 'Check the open point first.',
  summary: 'Install 14 aluminium windows, by Kamau: KES 186,000 total, KES 74,400 deposit before work starts, balance KES 111,600 after installation; finish by Sunday 18 October 2026.',
  what: [{ key: 'what:windows', label: 'Work', value: 'Install 14 aluminium windows', basis: 'STATED', needsChecking: false, evidence: [ev('quotation.pdf', 'p1'), ev('minutes.pdf', '2')] }],
  who: [{ key: 'who:kamau', name: 'Kamau', role: 'Provider', identity: 'DESCRIBED', describedAs: 'as named in quotation.pdf', evidence: [] }],
  money: [
    { key: 'money:total', label: 'Total price', value: 'KES 186,000', basis: 'STATED', needsChecking: false, evidence: [ev('quotation.pdf', 'p1'), ev('minutes.pdf', '2')] },
    { key: 'money:deposit', label: 'Deposit', value: 'KES 74,400', detail: 'before work starts', basis: 'INFERRED', needsChecking: false, evidence: [ev('quotation.pdf', 'p1')] },
    { key: 'money:balance', label: 'Balance', value: 'KES 111,600', detail: 'after installation', basis: 'STATED', needsChecking: false, evidence: [ev('quotation.pdf', 'p1')] }],
  when: [{ key: 'when:completion', label: 'Finish by', value: 'Sunday 18 October 2026', basis: 'STATED', needsChecking: false, evidence: [ev('quotation.pdf', 'p1')] }],
  responsibilities: [{ party: 'Kamau', duties: [{ key: 'duty:kamau:install', label: 'Does', value: 'supply and install the windows', basis: 'STATED', needsChecking: false, evidence: [] }] }],
  conditions: [], notIncluded: [{ key: 'excluded:paint', label: 'Not included for Kamau', value: 'painting', basis: 'STATED', needsChecking: false, evidence: [] }],
  origin: null,
  openPoints: [{ id: 'source:x:1:abc', kind: 'AMBIGUOUS', effect: 'NEEDS_CHECKING', text: 'Whether transport of the windows is included isn’t clear.', sides: [], checkable: true, checked, sourceName: 'quotation.pdf' }],
});
const serve = (p, versionOf) => p.intercept('*/agreement-formation*', (params, s) => {
  const url = params.request.url;
  const conversationId = (url.match(/conversations\/([^/]+)\/agreement-formation/) || [])[1] || 'c';
  const checked = /\/check/.test(url) || p.checkedOnce;
  if (/\/check/.test(url)) p.checkedOnce = true;
  s('Fetch.fulfillRequest', { requestId: params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    body: Buffer.from(JSON.stringify(formation(conversationId, versionOf(), checked, checked))).toString('base64') });
});

for (const [id, width, height] of [['R1', 1280, 900], ['R2', 390, 844], ['R3', 320, 700], ['R4', 768, 1024]]) {
  await journey(id, async () => {
    const p = await page(width, height);
    await firstTurn(p, 'I need 14 aluminium windows installed');
    const version = await realVersion(p);
    const stop = await serve(p, () => version);
    await p.evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => /Refresh what we have/.test(x.innerText)); if (b) b.click(); })()`);
    const cardShown = await p.waitFor(`/Your agreement is taking shape/.test(document.body.innerText)`, 8000);
    const cardAboveTranscript = await p.evaluate(`(() => { const c = document.querySelector('[aria-labelledby="agreement-shaping-title"]'); if (!c) return null; const r = c.getBoundingClientRect(); return r.top < window.innerHeight; })()`);
    // keyboard: focus the card's Review this and press Enter
    await p.evaluate(`document.querySelector('[aria-labelledby="agreement-shaping-title"] button').focus()`);
    await p.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await p.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    const reviewShown = await p.waitFor(`!!document.getElementById('agreement-review-title')`, 5000);
    const focusOnHeading = await p.evaluate(`document.activeElement && document.activeElement.id === 'agreement-review-title'`);
    const review = await p.evaluate(`document.querySelector('section[aria-labelledby="agreement-review-title"]').innerText`);
    const evidenceCollapsed = await p.evaluate(`[...document.querySelectorAll('section[aria-labelledby="agreement-review-title"] details')].every(d => !d.open)`);
    const smallTargets = await p.evaluate(`[...document.querySelectorAll('section[aria-labelledby="agreement-review-title"] button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.innerText.trim())`);
    const headings = await p.evaluate(`[...document.querySelectorAll('section[aria-labelledby="agreement-review-title"] h2, section[aria-labelledby="agreement-review-title"] h3')].map(h => h.tagName + ':' + h.innerText.trim())`);
    const setUpDisabledBeforeCheck = await p.evaluate(`[...document.querySelectorAll('button')].find(b => /Set this up securely/.test(b.innerText)).disabled`);
    await p.clickText('Mark as checked');
    await p.waitFor(`/Checked by you/.test(document.body.innerText)`, 5000);
    const setUpEnabledAfterCheck = await p.evaluate(`![...document.querySelectorAll('button')].find(b => /Set this up securely/.test(b.innerText)).disabled`);
    let createBody = null;
    const handoffListener = msg => { if (msg.method === 'Network.requestWillBeSent' && /agreement-handoff$/.test(msg.params.request.url)) createBody = msg.params.request.postData; };
    listeners.push(handoffListener);
    await p.s('Network.enable');
    await p.clickText('Set this up securely');
    const signInShown = await p.waitFor(`/This is ready to set securely\\. Sign in to continue\\./.test(document.body.innerText)`, 10000);
    await stop();
    results.push({ journey: id, title: `Agreement formation at ${width}px`, cardShown: cardShown !== null, cardVisibleWithoutScrolling: cardAboveTranscript,
      reviewOpenedByKeyboard: reviewShown !== null, focusOnReviewHeading: focusOnHeading, headings,
      reviewHasTerms: ['Total price', 'KES 186,000', 'Deposit', 'before work starts', 'Finish by', 'Not included', 'SecurePay’s reading', 'as named in quotation.pdf'].filter(t => !review.includes(t)),
      openPointShown: review.includes('Whether transport of the windows is included'), evidenceCollapsed, buttonsUnder44px: smallTargets,
      setUpDisabledBeforeCheck, setUpEnabledAfterCheck, realHandoffCreateBody: createBody, realSignInBoundaryShown: signInShown !== null,
      rawLeak: /CANDIDATE|INFERRED|NEEDS_CHECKING|moneyRole|source:x/.test(review), noHorizontalScroll: await noHorizontalScroll(p) });
    await p.close();
  });
}

await journey('R5', async () => {
  const p = await page();
  await firstTurn(p, 'I need 14 aluminium windows installed');
  const version = await realVersion(p);
  const stop = await serve(p, () => version - 1); // the person reviewed an older version
  await p.evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => /Refresh what we have/.test(x.innerText)); if (b) b.click(); })()`);
  await p.waitFor(`/Your agreement is taking shape/.test(document.body.innerText)`, 8000);
  await p.clickText('Review this', '[aria-labelledby="agreement-shaping-title"] button');
  await p.waitFor(`!!document.getElementById('agreement-review-title')`, 5000);
  await p.clickText('Mark as checked');
  await p.waitFor(`/Checked by you/.test(document.body.innerText)`, 5000);
  await p.clickText('Set this up securely');
  await p.waitFor(`/changed|sign in to continue/i.test((document.querySelector('section[aria-labelledby="agreement-review-title"]')||document.body).innerText.split('Set this up securely').slice(1).join(' '))`, 10000);
  const alerts = [await p.evaluate(`(document.querySelector('section[aria-labelledby="agreement-review-title"]')||document.body).innerText.split('Set this up securely').slice(1).join(' ').trim().slice(0, 400)`)];
  await stop();
  results.push({ journey: 'R5', title: 'Setting up a version that is no longer current (real API 409)', alerts,
    signInShown: /Sign in to continue/.test(await p.bodyText()), noServerText: !alerts.some(a => /AGREEMENT_CHANGED|409|Exception/.test(a)) });
  await p.close();
});

await journey('R6', async () => {
  const p = await page();
  await firstTurn(p, 'Just looking around');
  const real = await p.evaluate(`(async () => {
    const rec = JSON.parse(sessionStorage.getItem('securepay.agent.anonymous.v1'));
    const withToken = await fetch('/api/agent/conversations/' + rec.conversationId + '/agreement-formation', { headers: { 'X-SecurePay-Conversation-Token': rec.secret, Accept: 'application/json' } });
    const body = await withToken.json();
    const without = await fetch('/api/agent/conversations/' + rec.conversationId + '/agreement-formation', { headers: { Accept: 'application/json' } });
    const check = await fetch('/api/agent/conversations/' + rec.conversationId + '/agreement-formation/open-points/nope/check', { method: 'POST', headers: { 'X-SecurePay-Conversation-Token': rec.secret } });
    return { status: withToken.status, cache: withToken.headers.get('cache-control'), stage: body.stage, reviewable: body.reviewable, withoutTokenStatus: without.status, bogusCheckStatus: check.status };
  })()`);
  results.push({ journey: 'R6', title: 'Real anonymous agreement-formation endpoint (no substitution)', ...real });
  await p.close();
});

await journey('R7', async () => {
  const p = await page();
  await firstTurn(p, 'I need 14 aluminium windows installed');
  const version = await realVersion(p);
  const stop = await serve(p, () => version);
  await p.evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => /Refresh what we have/.test(x.innerText)); if (b) b.click(); })()`);
  await p.waitFor(`/Your agreement is taking shape/.test(document.body.innerText)`, 8000);
  await p.s('Page.reload', {});
  const back = await p.waitFor(`/Your agreement is taking shape/.test(document.body.innerText)`, 15000);
  await stop();
  results.push({ journey: 'R7', title: 'Reload keeps the conversation and the emerging agreement', agreementBackAfterReload: back !== null,
    conversationKept: /I need 14 aluminium windows installed/.test(await p.bodyText()) });
  await p.close();
});

await mkdir('build/entry-perfection', { recursive: true });
await writeFile('build/entry-perfection/browser-phase6.json', JSON.stringify({ url: URL_, generatedAt: new Date().toISOString(), results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
ws.close(); chrome.kill();
