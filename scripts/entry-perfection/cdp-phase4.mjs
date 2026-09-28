// Entry Perfection Phase 4 -- real-browser KS001 character checks (headless Chrome via the DevTools Protocol, no deps).
//
// Classification: measurement tooling, local/sandbox only. Drives the REAL SecurepayLLM UI against a REAL local SecurePayAPI
// with the agent model provider `none` (no credential, UR-240). So this proves the SERVER-OWNED and UI-OWNED voice (provider
// fallback, source failure, reconciliation, authority/sign-in notices, pricing honesty, mobile layout) -- NOT a real model's
// character, which needs UR-240. The conversation possession secret never leaves the page.
//
//   node scripts/entry-perfection/cdp-phase4.mjs [--url http://localhost:5173/]
// Output: build/entry-perfection/browser-phase4.json
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const URL_ = arg('--url', 'http://localhost:5173/');
const CHROME = arg('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const FIXTURES_TEXT = resolve(arg('--text-fixtures', '../SecurePayAPI/services/agreement/src/test/resources/entry-perfection'));
const FIXTURES_BIN = resolve(arg('--bin-fixtures', '../SecurePayAPI/services/agreement/build/entry-perfection/fixtures'));
const PORT = 9335;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = await mkdtemp(join(tmpdir(), 'ep4-chrome-'));
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
const JARGON = /\b(trade context|BUILD|CANDIDATE|update_trade_context|get_activation_pricing|Exception|null|undefined|HTTP \d{3})\b/;
const ACK_ONLY = /^(ok(ay)?|sure|got it|noted|captured|understood|thanks)[.!]?$/i;
const lastReply = p => p.ks001Replies().then(r => r[r.length - 1] ?? '');
const noHorizontalScroll = p => p.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1');
const firstTurn = async (p, text) => {
  await p.goto(URL_);
  await p.setText('textarea', text);
  const t0 = Date.now();
  await p.click('button[aria-label="Send"]');
  await p.waitFor(`/Your message is here/.test((document.querySelector('[role=log]')||{}).innerText||'')`, 20000);
  return Date.now() - t0;
};
const character = text => ({ length: text.length, questions: (text.match(/\?/g) || []).length, ackOnly: ACK_ONLY.test(text.trim()), jargon: JARGON.test(text) });

// C1/C2 -- the Home message on desktop and at 390px: one calm, honest reply; no jargon; no empty acknowledgement.
for (const [id, width] of [['C1', 1280], ['C2', 390]]) {
  await journey(id, async () => {
    const p = await page(width, width < 600 ? 844 : 900);
    const ms = await firstTurn(p, 'I need my bathroom tiled in Kileleshwa, about 18 square metres, budget KES 40,000');
    const reply = await lastReply(p);
    results.push({ journey: id, title: `Home message (${width}px)`, msToReply: ms, reply, ...character(reply),
      noHorizontalScroll: await noHorizontalScroll(p), alerts: await p.alerts() });
    await p.close();
  });
}

// C3 -- a SecurePay pricing question with no model: never a guessed figure.
await journey('C3', async () => {
  const p = await page();
  await firstTurn(p, 'How much does SecurePay activation cost?');
  const reply = await lastReply(p);
  results.push({ journey: 'C3', title: 'SecurePay pricing question (provider none)', reply, ...character(reply), statesAFigure: /\d/.test(reply) });
  await p.close();
});

// C4 -- a failed source keeps the person moving: human copy, a next action, no server text.
await journey('C4', async () => {
  const p = await page();
  await p.goto(URL_);
  await p.openPastePanel();
  await p.setText('textarea[placeholder^="Paste your plan"]', 'Borehole committee minutes: Maji Bora Drillers to supply and install a pump for KES 180,000, deposit KES 90,000 on signing.');
  await p.clickText('Add to this conversation', '[role=dialog] button');
  await p.waitFor(`[...document.querySelectorAll('[role=alert]')].some(a => a.innerText.trim().length > 0)`, 20000);
  const alerts = await p.alerts();
  results.push({ journey: 'C4', title: 'Source that cannot be read (provider none)', alerts, jargon: alerts.some(a => JARGON.test(a)),
    nextActionOffered: alerts.some(a => /try again|Try again|paste|add it/i.test(a)) || /Try again/.test(await p.bodyText()) });
  await p.close();
});

// C5 -- a lost turn response: the reconciliation notice is calm, then the real reply appears once.
await journey('C5', async () => {
  const p = await page();
  await firstTurn(p, 'I need my bathroom tiled');
  let dropped = 0;
  const stop = await p.intercept('*/turns', (params, s) => {
    if (dropped++ === 0) s('Fetch.failRequest', { requestId: params.requestId, errorReason: 'ConnectionReset' });
    else s('Fetch.continueRequest', { requestId: params.requestId });
  });
  await p.setText('[data-ks001-composer]', 'It is in Kileleshwa');
  await p.click('button[aria-label="Send message"]');
  let notice = null;
  await p.waitFor(`/checking whether your message went through/.test(document.body.innerText)`, 5000);
  notice = (await p.bodyText()).match(/[^\n]*checking whether your message went through[^\n]*/)?.[0] ?? null;
  await p.waitFor(`(document.querySelector('[role=log]').innerText.match(/Your message is here/g) || []).length >= 2`, 20000);
  await stop();
  const log = await p.evaluate(`document.querySelector('[role=log]').innerText`);
  results.push({ journey: 'C5', title: 'Lost turn response', notice, noticeJargon: notice ? JARGON.test(notice) : null,
    messageShownOnce: (log.match(/It is in Kileleshwa/g) || []).length === 1, errorLeftOnScreen: /couldn’t confirm|still working/.test(await p.bodyText()) });
  await p.close();
});

// C6/C7 -- authority notices: a 403 and a 401 on a turn (server response substituted in the browser only).
for (const [id, status, code] of [['C6', 403, 'FORBIDDEN'], ['C7', 401, 'UNAUTHENTICATED']]) {
  await journey(id, async () => {
    const p = await page(390, 844);
    await firstTurn(p, 'I need my bathroom tiled');
    const stop = await p.intercept('*/turns', (params, s) => s('Fetch.fulfillRequest', { requestId: params.requestId, responseCode: status,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      body: Buffer.from(JSON.stringify({ code, message: 'org.springframework.security.access.AccessDeniedException: Access is denied' })).toString('base64') }));
    await p.setText('[data-ks001-composer]', 'Can you release the money to the fundi now?');
    await p.click('button[aria-label="Send message"]');
    await p.waitFor(`[...document.querySelectorAll('[role=alert]')].some(a => a.innerText.trim().length > 0)`, 10000);
    await stop();
    const alerts = await p.alerts();
    results.push({ journey: id, title: `Turn refused with ${status} (390px)`, alerts, rawServerTextShown: alerts.some(a => /springframework|AccessDenied/.test(a)),
      jargon: alerts.some(a => JARGON.test(a)), composerTextKept: await p.evaluate(`(document.querySelector('[data-ks001-composer]')||{}).value || ''`),
      messageVisibleOnScreen: /release the money to the fundi/.test(await p.bodyText()),
      retryOffered: /Retry message/.test(await p.bodyText()),
      noHorizontalScroll: await noHorizontalScroll(p) });
    await p.close();
  });
}

await mkdir('build/entry-perfection', { recursive: true });
await writeFile('build/entry-perfection/browser-phase4.json', JSON.stringify({ url: URL_, generatedAt: new Date().toISOString(), results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
ws.close(); chrome.kill();
