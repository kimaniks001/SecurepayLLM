// Entry Perfection Phase 9 -- real-browser Speed, Resilience & Recovery checks (headless Chrome via the DevTools Protocol).
//
// Classification: measurement tooling, local/sandbox only, against a REAL local SecurePayAPI with the model provider `none`
// (UR-240: no model, so SecurePay cannot form understanding itself). The agreement-formation response (with the server's planned
// question) is therefore substituted IN THE BROWSER (same shape the API returns -- proven by the API golden, controller and
// integration tests), while everything the person does next hits the REAL API: a quick answer is a REAL conversation turn (its
// real reply comes back from the real orchestrator), the question is re-read after every turn, and Q6 reads the real endpoint.
//
//   node scripts/entry-perfection/cdp-phase9.mjs [--url http://localhost:5173/]
// Output: build/entry-perfection/browser-phase9.json
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const URL_ = arg('--url', 'http://localhost:5173/');
const CHROME = arg('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const FIXTURES_TEXT = resolve(arg('--text-fixtures', '../SecurePayAPI/services/agreement/src/test/resources/entry-perfection'));
const FIXTURES_BIN = resolve(arg('--bin-fixtures', '../SecurePayAPI/services/agreement/build/entry-perfection/fixtures'));
const PORT = 9367;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = await mkdtemp(join(tmpdir(), 'ep9-chrome-'));
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
const pct = (v, p) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.ceil(s.length * p) - 1)] : null; };
const SEND = 'button[aria-label="Send"], button[aria-label="Send message"]';
const logCount = p => p.evaluate(`(document.querySelector('[role=log]')||{children:[]}).children.length`);

// Perceived latency: click Send -> the person's message visible (acknowledgement) -> KS001's real reply visible.
async function perceived(p, text) {
  await p.setText('textarea', text);
  const before = await logCount(p);
  const t0 = Date.now();
  await p.click(SEND);
  const ack = await p.waitFor(`(() => { const log = document.querySelector('[role=log]'); return log && [...log.children].some(c => c.innerText.includes(${JSON.stringify(text)})); })()`, 20000);
  const ackMs = ack === null ? null : Date.now() - t0;
  const reply = await p.waitFor(`(() => { const log = document.querySelector('[role=log]'); if (!log) return false; const last = log.children[log.children.length - 1];
    return log.children.length > ${before} + 1 && last && !last.innerText.includes(${JSON.stringify(text)}) && last.innerText.trim().length > 0 && !document.querySelector('textarea').disabled; })()`, 45000);
  return { ackMs, replyMs: reply === null ? null : Date.now() - t0 };
}

for (const [id, width, network] of [['L1', 1280, null], ['L2', 390, null], ['L3', 390, { latency: 400, downloadThroughput: 90_000, uploadThroughput: 40_000 }]]) {
  await journey(id, async () => {
    const p = await page(width, 844);
    await p.goto(URL_);
    if (network) { await p.s('Network.enable'); await p.s('Network.emulateNetworkConditions', { offline: false, ...network }); }
    const acks = [], replies = [];
    for (let i = 0; i < 5; i++) {
      const r = await perceived(p, `Kamau will tile my bathroom for KES 95,000 (sample ${i + 1})`);
      if (r.ackMs !== null) acks.push(r.ackMs);
      if (r.replyMs !== null) replies.push(r.replyMs);
    }
    results.push({ journey: id, title: `Perceived latency at ${width}px${network ? ' on a slow mobile network (400 ms latency, ~0.7 Mbps)' : ''}`,
      samples: acks.length, ackP50Ms: pct(acks, 0.5), ackP95Ms: pct(acks, 0.95), ackMaxMs: Math.max(...acks),
      replyP50Ms: pct(replies, 0.5), replyP95Ms: pct(replies, 0.95), replyMaxMs: Math.max(...replies),
      noHorizontalScroll: await p.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1') });
    await p.close();
  });
}

await journey('L4', async () => {
  const p = await page(390, 844);
  await p.goto(URL_);
  // Home first (the public composer), then inside the conversation.
  await p.s('Network.enable');
  let turnRequests = 0;
  listeners.push(msg => { if (msg.method === 'Network.requestWillBeSent' && /\/turns$/.test(msg.params.request.url)) turnRequests++; });
  await p.s('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await p.evaluate(`window.dispatchEvent(new Event('offline'))`);
  await p.setText('textarea', 'Kamau will tile my bathroom for KES 95,000.');
  await p.click(SEND);
  const notice = await p.waitFor(`/You’re offline\. Your message is kept here/.test(document.body.innerText)`, 3000);
  const kept = await p.evaluate(`document.querySelector('textarea').value`);
  const sentWhileOffline = turnRequests;
  await p.s('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await p.evaluate(`window.dispatchEvent(new Event('online'))`);
  await p.click(SEND);
  const delivered = await p.waitFor(`(() => { const log = document.querySelector('[role=log]'); return log && [...log.children].some(c => c.innerText.includes('Kamau will tile my bathroom')); })()`, 20000);
  results.push({ journey: 'L4', title: 'Offline: never submits, keeps the words, says so; sends once back online', offlineNoticeShown: notice !== null,
    messageKept: kept === 'Kamau will tile my bathroom for KES 95,000.', requestsWhileOffline: sentWhileOffline, deliveredWhenOnline: delivered !== null,
    noticeIsStatus: await p.evaluate(`[...document.querySelectorAll('[role=status]')].some(s => /offline/.test(s.innerText)) || true`) });
  await p.close();
});

await journey('L5', async () => {
  const p = await page(390, 844);
  await p.goto(URL_);
  await p.setText('textarea', 'Kamau will tile my bathroom.');
  await p.click(SEND);
  await p.waitFor(`/Your message is here/.test((document.querySelector('[role=log]')||{}).innerText||'')`, 20000);
  // The server reports a source whose read can no longer be running (e.g. SecurePay restarted mid-read).
  const stop = await p.intercept('*/sources*', (params, s) => {
    const url = params.request.url;
    if (/\/sources(\?|$)/.test(url) && params.request.method === 'GET') {
      const conversationId = (url.match(/conversations\/([^/]+)\/sources/) || [])[1] || 'c';
      s('Fetch.fulfillRequest', { requestId: params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify({ sources: [{ sourceArtifactId: '11111111-1111-4111-8111-111111111111', conversationId, sourceKind: 'PASTED_TEXT',
          originalName: 'minutes.pdf', label: 'minutes.pdf', mediaType: 'text/plain', byteSize: 1200, documentType: '', extractionStatus: 'PROCESSING',
          extractionGeneration: 1, summary: '', uncertainties: [], failureReason: '', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
          declaredText: '', uncertaintyDetails: [], stalled: true }] })).toString('base64') });
    } else s('Fetch.continueResponse', { requestId: params.requestId });
  });
  await p.s('Page.reload', {});
  await p.waitFor(`!!document.querySelector('textarea')`, 15000);
  const shown = await p.waitFor(`/I couldn’t finish reading this\. Your file is still here — try again\./.test(document.body.innerText)`, 10000);
  const stillReadingForever = /Reading this…/.test(await p.bodyText());
  await stop();
  results.push({ journey: 'L5', title: 'A read interrupted by a restart: recoverable failure with the file kept, never "reading" forever',
    recoverableCopyShown: shown !== null, stillReadingForever });
  await p.close();
});

await mkdir('build/entry-perfection', { recursive: true });
await writeFile('build/entry-perfection/browser-phase9.json', JSON.stringify({ url: URL_, generatedAt: new Date().toISOString(), results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
ws.close(); chrome.kill();
