// Entry Perfection Phase 2 -- real-browser Input Perfection checks (headless Chrome via the DevTools Protocol, no deps).
//
// Classification: measurement tooling, local/sandbox only. Drives the REAL SecurepayLLM UI against a REAL local
// SecurePayAPI. With the agent model provider `none` (no credential, UR-240) every source ends FAILED at understanding,
// so these journeys prove the failure / retry / reconciliation / concurrency state machine end to end; the READY ->
// Review path is proven against real PostgreSQL by EntryPerfectionPhase2IntegrationTest. The conversation possession
// secret is read in-page only to query the API; it is never printed or written.
//
//   node scripts/entry-perfection/cdp-phase2.mjs [--url http://localhost:5173/]
// Output: build/entry-perfection/browser-phase2.json
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const URL_ = arg('--url', 'http://localhost:5173/');
const CHROME = arg('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const FIXTURES_TEXT = resolve(arg('--text-fixtures', '../SecurePayAPI/services/agreement/src/test/resources/entry-perfection'));
const FIXTURES_BIN = resolve(arg('--bin-fixtures', '../SecurePayAPI/services/agreement/build/entry-perfection/fixtures'));
const PORT = 9334;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = await mkdtemp(join(tmpdir(), 'ep2-chrome-'));
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
const fixture = name => readFile(join(FIXTURES_TEXT, name), 'utf8');
const minutes = await fixture('minutes-clean.txt');

// ---------------------------------------------------------------- P1/P8: failed paste keeps the text, desktop and 390px
for (const [journey, width] of [['P1', 1280], ['P8', 390]]) {
  const p = await page(width, width < 600 ? 844 : 900);
  await p.goto(URL_);
  await p.openPastePanel();
  await p.setText('textarea[placeholder^="Paste your plan"]', minutes);
  const t0 = Date.now();
  await p.clickText('Add to this conversation', '[role=dialog] button');
  await p.waitFor(`[...document.querySelectorAll('[role=alert]')].some(a => a.innerText.trim().length > 0)`, 15000);
  const ms = Date.now() - t0;
  const panelOpen = await p.evaluate(`!!document.querySelector('[role=dialog][aria-label="Bring your plan"]')`);
  const kept = await p.evaluate(`(() => { const t = document.querySelector('textarea[placeholder^="Paste your plan"]'); return t ? t.value.length : 0; })()`);
  const alertInViewport = await p.evaluate(`(() => { const a = [...document.querySelectorAll('[role=alert]')].find(x => x.innerText.trim()); if (!a) return false; const r = a.getBoundingClientRect(); a.scrollIntoView({ block: 'nearest' }); return r.width > 0; })()`);
  results.push({ journey, title: `Failed paste from the Home keeps the text and says why (${width}px)`, msToVisibleOutcome: ms,
    panelStillOpen: panelOpen, pastedCharsStillInPanel: kept, pastedCharsSent: minutes.trim().length, alerts: await p.alerts(), alertRendered: alertInViewport,
    sourceCardLabel: (await p.bodyText()).match(/Pasted (text|plan)/)?.[0] ?? null, canonical: await p.apiSources() });
  if (journey === 'P1') {
    // ---------------------------------------------------------- P2: Try again on the card re-reads (next generation)
    const before = await p.apiSources();
    await p.clickText('Try again');
    await sleep(1500);
    const afterRetry = await p.apiSources();
    // ---------------------------------------------------------- P3: sending the same text again re-reads it too
    await p.clickText('Add to this conversation', '[role=dialog] button');
    await sleep(1500);
    const afterResend = await p.apiSources();
    results.push({ journey: 'P2-P3', title: 'Try again, then re-send of the same failed text: genuinely re-read, never duplicated',
      generations: { before: before?.[0]?.generation, afterTryAgain: afterRetry?.[0]?.generation, afterResend: afterResend?.[0]?.generation },
      artifactCount: afterResend?.length, alerts: await p.alerts() });
  }
  await p.close();
}

// ---------------------------------------------------------------- P4: damaged / mismatched file -> human copy
await journey('P4', async () => {
  const p = await page();
  await p.goto(URL_);
  await p.setFile('input[type=file][accept*="pdf"]', join(FIXTURES_BIN, 'minutes-corrupted.pdf'));
  await p.waitFor(`[...document.querySelectorAll('[role=alert]')].some(a => a.innerText.trim().length > 0)`, 15000);
  const alerts = await p.alerts();
  results.push({ journey: 'P4', title: 'Damaged PDF upload', alerts, rawServerTextShown: alerts.some(a => /declared type|application\/pdf|Exception/i.test(a)) });
  await p.close();
});

// ---------------------------------------------------------------- P5: lost turn response is reconciled automatically
await journey('P5', async () => {
  const p = await page();
  await p.goto(URL_);
  await p.setText('textarea', 'I need my bathroom tiled');
  await p.click('button[aria-label="Send"]');
  await p.waitFor(`/Got it/.test((document.querySelector('[role=log]')||{}).innerText||'')`);
  let dropped = 0;
  const stop = await p.intercept('*/turns', (params, s) => {
    if (dropped++ === 0) s('Fetch.failRequest', { requestId: params.requestId, errorReason: 'ConnectionReset' }); // server committed; response lost
    else s('Fetch.continueRequest', { requestId: params.requestId });
  });
  const t0 = Date.now();
  await p.setText('[data-ks001-composer]', 'It is in Kileleshwa, about 18 square metres');
  await p.click('button[aria-label="Send message"]');
  const sawChecking = await p.waitFor(`/checking whether your message went through/.test(document.body.innerText)`, 5000);
  await p.waitFor(`(document.querySelector('[role=log]').innerText.match(/Got it/g) || []).length >= 2`, 20000);
  const ms = Date.now() - t0;
  await sleep(300);
  await stop();
  const log = await p.evaluate(`document.querySelector('[role=log]').innerText`);
  results.push({ journey: 'P5', title: 'Turn response lost after the server committed it', droppedResponses: 1, sawCheckingState: sawChecking !== null,
    msToRealReply: ms, alreadyProcessedShown: /already been processed/.test(log), errorLeftOnScreen: /could not confirm|still working/.test(await p.bodyText()),
    kilelshwaMessageCount: (log.match(/It is in Kileleshwa/g) || []).length, gotItCount: (log.match(/Got it/g) || []).length });
  await p.close();
});

// ---------------------------------------------------------------- P6: a turn while a source is still being read
await journey('P6', async () => {
  const p = await page();
  await p.goto(URL_);
  await p.setText('textarea', 'Borehole pump replacement');
  await p.click('button[aria-label="Send"]');
  await p.waitFor(`/Got it/.test((document.querySelector('[role=log]')||{}).innerText||'')`);
  let held = null;
  const stop = await p.intercept('*/sources/pasted-text', params => { held = params.requestId; });
  await p.openPastePanel();
  await p.setText('textarea[placeholder^="Paste your plan"]', minutes);
  await p.clickText('Add to this conversation', '[role=dialog] button');
  await p.waitFor('true', 300);
  await p.setText('[data-ks001-composer]', 'The committee meets on Saturday');
  const sendEnabled = await p.evaluate(`!document.querySelector('button[aria-label="Send message"]').disabled`);
  await p.click('button[aria-label="Send message"]');
  await p.waitFor(`(document.querySelector('[role=log]').innerText.match(/Got it/g) || []).length >= 2`, 15000);
  const turnAnsweredWhileSourceHeld = held !== null;
  await p.s('Fetch.continueRequest', { requestId: held });
  await p.waitFor(`[...document.querySelectorAll('[role=alert]')].some(a => a.innerText.trim().length > 0)`, 15000);
  await stop();
  const log = await p.evaluate(`document.querySelector('[role=log]').innerText`);
  results.push({ journey: 'P6', title: 'A message sent while a source is still being read', sendEnabledWhileSourceReading: sendEnabled,
    turnAnsweredWhileSourceHeld, sourceOutcome: await p.alerts(), gotItCount: (log.match(/Got it/g) || []).length, canonical: await p.apiSources() });
  await p.close();
});

// ---------------------------------------------------------------- P7: a source while a turn is still running
await journey('P7', async () => {
  const p = await page();
  await p.goto(URL_);
  await p.setText('textarea', 'Borehole pump replacement');
  await p.click('button[aria-label="Send"]');
  await p.waitFor(`/Got it/.test((document.querySelector('[role=log]')||{}).innerText||'')`);
  let heldTurn = null;
  const stop = await p.intercept('*/turns', params => { heldTurn = params.requestId; });
  await p.setText('[data-ks001-composer]', 'Also the tank');
  await p.click('button[aria-label="Send message"]');
  await p.waitFor('true', 300);
  const addSourceEnabled = await p.evaluate(`(() => { const b = document.querySelector('button[aria-label="Add a source"]'); return b ? !b.disabled : null; })()`);
  results.push({ journey: 'P7', title: 'Adding a source while KS001 is still answering', addSourceEnabledWhileTurnRunning: addSourceEnabled,
    note: 'The intake is disabled while a turn runs (state.busy) -- the person cannot start a racing source write from this UI; the backend race itself is covered by the harness (J25).' });
  if (heldTurn) await p.s('Fetch.continueRequest', { requestId: heldTurn });
  await p.waitFor(`(document.querySelector('[role=log]').innerText.match(/Got it/g) || []).length >= 2`, 15000);
  await stop();
  await p.close();
});

await mkdir('build/entry-perfection', { recursive: true });
await writeFile('build/entry-perfection/browser-phase2.json', JSON.stringify({ url: URL_, generatedAt: new Date().toISOString(), results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
ws.close(); chrome.kill();
