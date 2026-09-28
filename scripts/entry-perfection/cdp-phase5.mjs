// Entry Perfection Phase 5 -- real-browser Understanding & Evidence checks (headless Chrome via the DevTools Protocol).
//
// Classification: measurement tooling, local/sandbox only. Drives the REAL SecurepayLLM UI against a REAL local SecurePayAPI
// with the agent model provider `none` (no credential, UR-240). Source understanding therefore cannot run for real: E3 proves
// a real source fails calmly AND that the API now records WHY (the failure reason in the API log). E1/E2 exercise the new
// evidence rendering (conflicts with both sources, "SecurePay's reading", "Not included", human money roles) at desktop and
// 390px by substituting a server-shaped context response IN THE BROWSER ONLY -- the API producing that shape is proven by
// AgentPublicViewMapperEvidenceTest and EntryPerfectionPhase5IntegrationTest against real PostgreSQL.
//
//   node scripts/entry-perfection/cdp-phase5.mjs [--url http://localhost:5173/] [--api-log path]
// Output: build/entry-perfection/browser-phase5.json
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const URL_ = arg('--url', 'http://localhost:5173/');
const CHROME = arg('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const FIXTURES_TEXT = resolve(arg('--text-fixtures', '../SecurePayAPI/services/agreement/src/test/resources/entry-perfection'));
const FIXTURES_BIN = resolve(arg('--bin-fixtures', '../SecurePayAPI/services/agreement/build/entry-perfection/fixtures'));
const PORT = 9336;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = await mkdtemp(join(tmpdir(), 'ep5-chrome-'));
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



const API_LOG = arg('--api-log', '');
const results = [];
async function journey(id, fn) { try { await fn(); } catch (error) { results.push({ journey: id, harnessError: String(error.message || error).slice(0, 600) }); } }
const noHorizontalScroll = p => p.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1');
const firstTurn = async (p, text) => {
  await p.goto(URL_);
  await p.setText('textarea', text);
  await p.click('button[aria-label="Send"]');
  await p.waitFor(`/Your message is here/.test((document.querySelector('[role=log]')||{}).innerText||'')`, 20000);
};
const src = (name, locator, basis) => ({ sourceArtifactId: '00000000-0000-4000-8000-0000000000' + (name.length + 10), displayName: name, sourceKind: 'DOCUMENT', locator, removed: false, basis });
const contextBody = conversationId => ({
  conversationId, version: 9,
  entities: [
    { id: '11111111-1111-4111-8111-111111111111', type: 'SERVICE', name: 'Pump installation', state: 'CANDIDATE', confidence: 0.9, attributes: {}, source: src('minutes.pdf', 'p1', 'EXPLICIT') },
    { id: '22222222-2222-4222-8222-222222222222', type: 'ORGANIZATION', name: 'Maji Bora Drillers Ltd', state: 'CANDIDATE', confidence: 0.9, attributes: {}, source: src('minutes.pdf', 'p1', 'EXPLICIT') }],
  relationships: [
    { id: '33333333-3333-4333-8333-333333333331', kind: 'PAYMENT_CONDITION', subjectEntityId: '11111111-1111-4111-8111-111111111111', qualifiers: { amount: '180000', currency: 'KES', moneyRole: 'total' }, state: 'CANDIDATE', confidence: 0.9, source: src('minutes.pdf', 'p1', 'EXPLICIT') },
    { id: '33333333-3333-4333-8333-333333333332', kind: 'PAYMENT_CONDITION', subjectEntityId: '11111111-1111-4111-8111-111111111111', qualifiers: { amount: '175000', currency: 'KES', moneyRole: 'total' }, state: 'CANDIDATE', confidence: 0.9, source: src('quotation-rev2.pdf', 'p1', 'EXPLICIT') },
    { id: '33333333-3333-4333-8333-333333333333', kind: 'PAYMENT_CONDITION', subjectEntityId: '11111111-1111-4111-8111-111111111111', qualifiers: { amount: '60000', amountText: '60k', currency: 'KES', currencyBasis: 'inferred', moneyRole: 'deposit', when: 'on signing' }, state: 'CANDIDATE', confidence: 0.8, source: src('minutes.pdf', 'p2', 'INFERRED') },
    { id: '33333333-3333-4333-8333-333333333334', kind: 'RESPONSIBILITY', subjectEntityId: '22222222-2222-4222-8222-222222222222', qualifiers: { task: 'transport of the pump to site', excluded: 'true' }, state: 'CANDIDATE', confidence: 0.9, source: src('minutes.pdf', 'p3', 'EXPLICIT') }],
  interactionState: { discoveryInvitedEntityIds: [] },
  sufficiency: { state: 'REVIEWABLE_WITH_OPEN_ITEMS', canReview: true, canSave: true, canSet: false, mustResolve: [{ code: 'CONFLICTING_AMOUNTS', description: 'Two different active price figures exist for this trade.' }], stillToDecide: [], guidanceNotes: [] },
  conflicts: [{ concept: 'the price', sides: [
    { value: 'KES 180,000', factId: '33333333-3333-4333-8333-333333333331', state: 'CANDIDATE', source: src('minutes.pdf', 'p1', 'EXPLICIT') },
    { value: 'KES 175,000', factId: '33333333-3333-4333-8333-333333333332', state: 'CANDIDATE', source: src('quotation-rev2.pdf', 'p1', 'EXPLICIT') }] }],
});

for (const [id, width] of [['E1', 1280], ['E2', 390]]) {
  await journey(id, async () => {
    const p = await page(width, width < 600 ? 844 : 900);
    await firstTurn(p, 'Borehole pump for the committee');
    const stop = await p.intercept('*/context', (params, s) => {
      const conversationId = (params.request.url.match(/conversations\/([^/]+)\/context/) || [])[1] || 'c';
      s('Fetch.fulfillRequest', { requestId: params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify(contextBody(conversationId))).toString('base64') });
    });
    if (width < 600) await p.clickText('Understood');
    await p.waitFor(`!!document.querySelector('section[aria-label="What SecurePay understands"]')`, 8000);
    let shown = null;
    for (let attempt = 0; attempt < 4 && shown === null; attempt++) { // the panel may still be loading its first context
      await p.evaluate(`(() => { const b = [...document.querySelectorAll('section[aria-label="What SecurePay understands"] button')].find(x => /Refresh/.test(x.innerText) && !x.disabled); if (b) b.click(); return !!b; })()`);
      shown = await p.waitFor(`/Your details disagree/.test(document.body.innerText)`, 3000);
    }
    await stop();
    const panel = await p.evaluate(`(document.querySelector('section[aria-label="What SecurePay understands"]')||document.body).innerText`);
    results.push({ journey: id, title: `Evidence rendering (${width}px, context response substituted in-browser)`, conflictShown: shown !== null,
      conflictText: (panel.match(/Your details disagree[^\n]*/) || [null])[0],
      securePaysReadingShown: /SecurePay’s reading/.test(panel), notIncludedShown: /Not included for Maji Bora Drillers Ltd: transport/.test(panel),
      moneyRoleWords: ['Total price', 'Deposit', 'Currency assumed'].filter(w => panel.includes(w)),
      rawLeak: /INFERRED|currencyBasis|moneyRole|amountText|excluded|[0-9a-f]{8}-[0-9a-f]{4}-/.test(panel),
      noHorizontalScroll: await noHorizontalScroll(p) });
    await p.close();
  });
}

await journey('E3', async () => {
  const p = await page();
  await p.goto(URL_);
  await p.openPastePanel();
  await p.setText('textarea[placeholder^="Paste your plan"]', 'Minutes: Maji Bora to install the pump for KES 180,000; 60k on signing; transport disputed.');
  await p.clickText('Add to this conversation', '[role=dialog] button');
  await p.waitFor(`[...document.querySelectorAll('[role=alert]')].some(a => a.innerText.trim().length > 0)`, 20000);
  const alerts = await p.alerts();
  let reasonLogged = null;
  for (let i = 0; API_LOG && i < 30 && !reasonLogged; i++) { // the API log is written asynchronously
    const log = await readFile(API_LOG, 'utf8');
    reasonLogged = (log.match(/reason=UNDERSTANDING_FAILED:[A-Z_]+/g) || []).pop() ?? null;
    if (!reasonLogged) await sleep(200);
  }
  results.push({ journey: 'E3', title: 'A real source with no model credential: calm copy for the person, a precise reason in the log', alerts,
    customerSeesProviderJargon: alerts.some(a => /credential|anthropic|api key|provider|UNDERSTANDING_FAILED/i.test(a)), reasonLogged });
  await p.close();
});

await mkdir('build/entry-perfection', { recursive: true });
await writeFile('build/entry-perfection/browser-phase5.json', JSON.stringify({ url: URL_, generatedAt: new Date().toISOString(), results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
ws.close(); chrome.kill();
