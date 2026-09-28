// Entry Perfection Phase 1 -- real-browser entry baseline (headless Chrome via the DevTools Protocol, no extra deps).
//
// Classification: measurement tooling, local/sandbox only. Drives the REAL SecurepayLLM UI (vite, real mode) against
// a REAL local SecurePayAPI, and records what a person actually sees and when. Every browser context is isolated
// (fresh sessionStorage), so each journey starts as a brand-new anonymous visitor. No credential is used or printed.
//
//   node scripts/entry-perfection/cdp-baseline.mjs [--url http://localhost:5173/] [--chrome "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
//
// Output: build/entry-perfection/browser-baseline.json
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const URL_ = arg('--url', 'http://localhost:5173/');
const CHROME = arg('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const FIXTURES_TEXT = resolve(arg('--text-fixtures', '../SecurePayAPI/services/agreement/src/test/resources/entry-perfection'));
const FIXTURES_BIN = resolve(arg('--bin-fixtures', '../SecurePayAPI/services/agreement/build/entry-perfection/fixtures'));
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = await mkdtemp(join(tmpdir(), 'ep1-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
let version;
for (let i = 0; i < 50 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(200); } }
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let nextId = 0; const pending = new Map(); const listeners = [];
ws.addEventListener('message', event => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) { const { resolve: ok, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : ok(msg.result); }
  else listeners.forEach(l => l(msg));
});
const send = (method, params = {}, sessionId) => new Promise((ok, reject) => { const id = ++nextId; pending.set(id, { resolve: ok, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });

async function page(width = 1280, height = 900) {
  const { browserContextId } = await send('Target.createBrowserContext');
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (method, params) => send(method, params, sessionId);
  await s('Page.enable'); await s('Runtime.enable'); await s('DOM.enable'); await s('Network.enable');
  await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  const evaluate = async expression => {
    const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const goto = async url => { await s('Page.navigate', { url }); await waitFor('document.readyState === "complete" && !!document.querySelector("textarea")', 15000); };
  const waitFor = async (expression, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) { if (await evaluate(`!!(${expression})`)) return Date.now() - start; await sleep(25); }
    return null;
  };
  // A page-side timeline: when each visible milestone first appears (ms since mark()).
  const mark = () => evaluate(`(() => {
    window.__t0 = performance.now(); window.__events = {};
    const seen = (name, ok) => { if (ok && !(name in window.__events)) window.__events[name] = Math.round(performance.now() - window.__t0); };
    const check = () => {
      const log = document.querySelector('[role=log]');
      const text = document.body.innerText;
      seen('conversationVisible', !!log);
      seen('thinkingVisible', !!document.querySelector('[aria-label="KS001 is thinking"]'));
      seen('ks001ReplyVisible', !!log && /Got it|pulled|I've|I’ve|already been processed|couldn/.test(log.innerText));
      seen('sourceCardVisible', /Try again|Read —|Partly read|Reading this/.test(text));
      seen('reviewBlockedHintVisible', /Review isn’t ready yet/.test(text));
      seen('errorVisible', /could not confirm|couldn’t|could not/.test(text));
    };
    new MutationObserver(check).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    check();
  })()`);
  const events = () => evaluate('window.__events');
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
  const visibleText = selector => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); return el ? el.innerText.trim() : null; })()`);
  const inViewport = pattern => evaluate(`(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) { const n = walker.currentNode; if (new RegExp(${JSON.stringify(pattern)}).test(n.textContent)) {
      const r = n.parentElement.getBoundingClientRect(); const style = getComputedStyle(n.parentElement);
      return { found: true, inViewport: r.top >= 0 && r.bottom <= innerHeight && r.width > 0, displayed: style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 }; } }
    return { found: false };
  })()`);
  return { s, evaluate, goto, waitFor, mark, events, setText, clickText, click, setFile, visibleText, inViewport, close: () => send('Target.disposeBrowserContext', { browserContextId }) };
}

const results = [];
const fixture = name => readFile(join(FIXTURES_TEXT, name), 'utf8');

// ---------------------------------------------------------------- B1: one-sentence complete deal from the public Home
{
  const p = await page();
  await p.goto(URL_);
  await p.mark();
  await p.setText('textarea', (await fixture('complete-single-message.txt')).trim());
  await p.click('button[aria-label="Send"]');
  await p.waitFor('window.__events.ks001ReplyVisible !== undefined', 15000);
  await sleep(600);
  results.push({
    journey: 'B1', title: 'Public Home: one complete sentence (provider none)', width: 1280, timeline: await p.events(),
    conversationText: await p.visibleText('[role=log]'),
    reviewButtonEnabled: await p.evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => /^Review this/.test(b.innerText.trim())); return b ? !b.disabled : null; })()`),
    reviewHint: await p.evaluate(`(document.body.innerText.match(/Review isn’t ready yet:[^\\n]*/) || [null])[0]`),
  });
  await p.close();
}

// ---------------------------------------------------------------- B2: Bring your plan (paste minutes) from the public Home
{
  const p = await page();
  await p.goto(URL_);
  const opened = await p.clickText('Add what you have');
  await sleep(200);
  const menuItems = await p.evaluate(`[...document.querySelectorAll('[role=menuitem]')].map(m => m.innerText.trim())`);
  const pasteItem = menuItems.find(m => /paste|plan/i.test(m));
  await p.clickText(pasteItem ?? 'plan');
  await p.waitFor('document.querySelector(\'[role=dialog][aria-label="Bring your plan"]\')', 5000);
  await p.mark();
  await p.setText('textarea[placeholder^="Paste your plan"]', await fixture('minutes-clean.txt'));
  const submitLabel = 'Add to this conversation';
  await p.clickText(submitLabel, '[role=dialog] button');
  await p.waitFor('window.__events.sourceCardVisible !== undefined', 15000);
  await sleep(1500);
  results.push({
    journey: 'B2', title: 'Public Home: Bring your plan -> paste clean minutes (provider none)', width: 1280, menuOpened: opened, menuItems, submitLabel,
    timeline: await p.events(),
    panelStillOpen: await p.evaluate(`!!document.querySelector('[role=dialog][aria-label="Bring your plan"]')`),
    sourceCardText: await p.evaluate(`(() => { const t = document.body.innerText; const i = t.search(/Try again|Read —|Partly read/); return i < 0 ? null : t.slice(Math.max(0, i - 220), i + 20); })()`),
    conversationText: await p.visibleText('[role=log]'),
  });
  await p.close();
}

// ---------------------------------------------------------------- B3/B4: upload a PDF from the Home, desktop and 390px
for (const [journey, width] of [['B3', 1280], ['B4', 390]]) {
  const p = await page(width, width < 600 ? 844 : 900);
  await p.goto(URL_);
  await p.mark();
  await p.setFile('input[type=file][accept*="pdf"]', join(FIXTURES_BIN, 'minutes-clean.pdf'));
  await p.waitFor('window.__events.sourceCardVisible !== undefined', 15000);
  await sleep(1200);
  results.push({
    journey, title: `Upload minutes PDF from the Home (provider none), ${width}px`, width, timeline: await p.events(),
    failureCard: await p.inViewport('couldn.t read it right now'),
    tabs: await p.evaluate(`[...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(t => /^(Build|Understood|Conversation)$/i.test(t))`),
    conversationText: await p.visibleText('[role=log]'),
  });
  await p.close();
}

// ---------------------------------------------------------------- B5: lost turn response (backend committed; the response never arrives)
{
  const p = await page();
  await p.goto(URL_);
  await p.setText('textarea', 'I need my bathroom tiled');
  await p.click('button[aria-label="Send"]');
  await p.waitFor('window.__events === undefined || true');
  await p.waitFor(`/Got it/.test((document.querySelector('[role=log]')||{}).innerText||'')`, 15000);
  // Intercept the NEXT turn response after the server produced it, and drop it -- exactly a lost response.
  await p.s('Fetch.enable', { patterns: [{ urlPattern: '*/turns', requestStage: 'Response' }] });
  let dropped = 0;
  const onPaused = msg => { if (msg.method === 'Fetch.requestPaused' && dropped === 0) { dropped++; p.s('Fetch.failRequest', { requestId: msg.params.requestId, errorReason: 'ConnectionReset' }); } };
  listeners.push(onPaused);
  await p.mark();
  await p.setText('[data-ks001-composer]', 'It is in Kileleshwa, about 18 square metres');
  await p.click('button[aria-label="Send message"]');
  await p.waitFor('window.__events.errorVisible !== undefined', 15000);
  await sleep(300);
  const afterLoss = {
    visibleError: await p.evaluate(`(document.body.innerText.match(/SecurePay could not confirm[^\\n]*/) || [null])[0]`),
    retryButtons: await p.evaluate(`[...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(t => /retry/i.test(t))`),
    composerDisabled: await p.evaluate(`(() => { const t = document.querySelector('[data-ks001-composer]'); return t ? t.disabled : null; })()`),
  };
  // The person keeps typing: is the new message accepted?
  await p.setText('[data-ks001-composer]', 'Also the kitchen splashback');
  const sendEnabled = await p.evaluate(`!document.querySelector('button[aria-label="Send message"]').disabled`);
  await p.click('button[aria-label="Send message"]');
  await sleep(500);
  const secondShown = await p.evaluate(`/kitchen splashback/.test(document.querySelector('[role=log]').innerText)`);
  listeners.splice(listeners.indexOf(onPaused), 1);
  await p.s('Fetch.disable');
  const retried = await p.clickText('Retry');
  await sleep(1200);
  results.push({
    journey: 'B5', title: 'Lost turn response after the backend committed it (H4, real browser)', width: 1280, timeline: await p.events(),
    ...afterLoss, sendButtonEnabledWhilePending: sendEnabled, laterMessageShownInTranscript: secondShown, retryClicked: retried,
    conversationTextAfterRetry: await p.visibleText('[role=log]'),
  });
  await p.close();
}

await mkdir('build/entry-perfection', { recursive: true });
await writeFile('build/entry-perfection/browser-baseline.json', JSON.stringify({ url: URL_, generatedAt: new Date().toISOString(), results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
ws.close(); chrome.kill();
