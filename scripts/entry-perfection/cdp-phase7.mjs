// Entry Perfection Phase 7 -- real-browser Question Intelligence checks (headless Chrome via the DevTools Protocol).
//
// Classification: measurement tooling, local/sandbox only, against a REAL local SecurePayAPI with the model provider `none`
// (UR-240: no model, so SecurePay cannot form understanding itself). The agreement-formation response (with the server's planned
// question) is therefore substituted IN THE BROWSER (same shape the API returns -- proven by the API golden, controller and
// integration tests), while everything the person does next hits the REAL API: a quick answer is a REAL conversation turn (its
// real reply comes back from the real orchestrator), the question is re-read after every turn, and Q6 reads the real endpoint.
//
//   node scripts/entry-perfection/cdp-phase7.mjs [--url http://localhost:5173/]
// Output: build/entry-perfection/browser-phase7.json
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const URL_ = arg('--url', 'http://localhost:5173/');
const CHROME = arg('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const FIXTURES_TEXT = resolve(arg('--text-fixtures', '../SecurePayAPI/services/agreement/src/test/resources/entry-perfection'));
const FIXTURES_BIN = resolve(arg('--bin-fixtures', '../SecurePayAPI/services/agreement/build/entry-perfection/fixtures'));
const PORT = 9347;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = await mkdtemp(join(tmpdir(), 'ep7-chrome-'));
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
const QUESTION = { ask: true, id: 'q:7f3a', text: 'minutes.pdf says KES 180,000 and quotation.pdf says KES 175,000. Which total should we use?',
  choices: ['KES 180,000', 'KES 175,000'], openPointIds: ['conflict:1'], blocksSetUp: true, alreadyAsked: false, reason: 'CONFIRMATION_BLOCKER' };
const formation = (conversationId, version, { question = QUESTION, checked = false } = {}) => ({
  conversationId, version, digest: 'd' + version, stage: 'UNDERSTOOD', reviewable: true, confirmable: false,
  reviewBlockedReason: null, confirmationBlockedReason: 'This needs sorting out first: the price needs checking.',
  summary: 'Supply and install a 1.5 HP submersible pump, by Maji Bora Drillers Ltd: KES 90,000 deposit on signing.',
  what: [{ key: 'what:pump', label: 'Work', value: 'Supply and install a 1.5 HP submersible pump', basis: 'STATED', needsChecking: false, evidence: [ev('minutes.pdf', '1')] }],
  who: [{ key: 'who:maji', name: 'Maji Bora Drillers Ltd', role: 'Provider', identity: 'DESCRIBED', describedAs: 'as named in minutes.pdf', evidence: [] }],
  money: [
    { key: 'money:total', label: 'Total price', value: 'KES 180,000', basis: 'STATED', needsChecking: true, evidence: [ev('minutes.pdf', '1')] },
    { key: 'money:total:2', label: 'Total price', value: 'KES 175,000', basis: 'STATED', needsChecking: true, evidence: [ev('quotation.pdf', 'table')] },
    { key: 'money:deposit', label: 'Deposit', value: 'KES 90,000', detail: 'on signing', basis: 'STATED', needsChecking: false, evidence: [ev('minutes.pdf', '1')] }],
  when: [], responsibilities: [], conditions: [], notIncluded: [], origin: null,
  openPoints: [
    { id: 'conflict:1', kind: 'CONFLICT', effect: 'BLOCKS_CONFIRMATION', text: 'The price needs checking: KES 180,000 appears in minutes.pdf; KES 175,000 appears in quotation.pdf.',
      sides: [{ value: 'KES 180,000', from: 'minutes.pdf' }, { value: 'KES 175,000', from: 'quotation.pdf' }], checkable: false, checked: false, topic: 'MONEY', state: 'UNRESOLVED' },
    { id: 'source:x:1:t', kind: 'AMBIGUOUS', effect: 'NEEDS_CHECKING', text: 'Transport responsibility is unclear.', sides: [], checkable: true, checked,
      sourceName: 'minutes.pdf', topic: 'RESPONSIBILITY', state: checked ? 'ACKNOWLEDGED' : 'UNRESOLVED', acknowledgedAtVersion: checked ? version : null }],
  question,
});
const serve = (p, versionOf, options = {}) => {
  p.formationReads = 0;
  return p.intercept('*/agreement-formation*', (params, s) => {
    const url = params.request.url;
    const conversationId = (url.match(/conversations\/([^/]+)\/agreement-formation/) || [])[1] || 'c';
    if (/\/check/.test(url)) p.checkedOnce = true; else p.formationReads++;
    s('Fetch.fulfillRequest', { requestId: params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      body: Buffer.from(JSON.stringify(formation(conversationId, versionOf(), { ...options, checked: !!p.checkedOnce }))).toString('base64') });
  });
};
const refresh = p => p.evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => /Refresh what we have/.test(x.innerText)); if (b) b.click(); })()`);
const CARD = '[aria-labelledby="agreement-shaping-title"]';

for (const [id, width, height] of [['Q1', 1280, 900], ['Q2', 390, 844], ['Q3', 320, 700], ['Q4', 768, 1024]]) {
  await journey(id, async () => {
    const p = await page(width, height);
    await firstTurn(p, 'The pump job from the minutes and the quotation');
    const version = await realVersion(p);
    const stop = await serve(p, () => version);
    await refresh(p);
    const questionShown = await p.waitFor(`/Which total should we use\\?/.test((document.querySelector('${CARD}')||{}).innerText||'')`, 8000);
    const card = await p.evaluate(`document.querySelector('${CARD}').innerText`);
    const agreementBeforeQuestion = card.indexOf('Your agreement is taking shape') >= 0 && card.indexOf('Your agreement is taking shape') < card.indexOf('Which total');
    const reviewStillVisible = await p.evaluate(`(() => { const b = [...document.querySelectorAll('${CARD} button')].find(x => /Review this/.test(x.innerText)); return !!b && !b.disabled; })()`);
    await p.evaluate(`document.querySelector('${CARD} [role=group]').scrollIntoView({ block: 'nearest' })`);
    const questionInViewport = await p.evaluate(`(() => { const r = document.querySelector('${CARD} [aria-live]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; })()`);
    const quickAnswers = await p.evaluate(`[...document.querySelectorAll('${CARD} [role=group] button')].map(b => ({ text: b.innerText.trim(), height: Math.round(b.getBoundingClientRect().height) }))`);
    const ariaLive = await p.evaluate(`!!document.querySelector('${CARD} [aria-live=polite]')`);
    const noScroll = await noHorizontalScroll(p);
    // A quick answer is a REAL turn: capture the request body and wait for the real reply.
    let turnBody = null;
    const turnListener = msg => { if (msg.method === 'Network.requestWillBeSent' && /\/turns$/.test(msg.params.request.url) && msg.params.request.method === 'POST') turnBody = msg.params.request.postData; };
    listeners.push(turnListener);
    await p.s('Network.enable');
    const readsBefore = p.formationReads;
    const repliesBefore = (await p.ks001Replies()).length;
    await p.clickText('KES 175,000', `${CARD} [role=group] button`);
    // KS001's real reply: the last log entry is no longer the person's own words, and the composer is usable again.
    const replied = await p.waitFor(`(() => { const log = document.querySelector('[role=log]'); if (!log || log.children.length <= ${repliesBefore}) return false;
      const last = log.children[log.children.length - 1].innerText.trim(); const box = document.querySelector('textarea');
      return last && last !== 'KES 175,000' && box && !box.disabled; })()`, 30000);
    await p.waitFor(`false`, 2000);
    const readsAfter = p.formationReads;
    const replies = await p.ks001Replies();
    listeners.splice(listeners.indexOf(turnListener), 1);
    await stop();
    results.push({ journey: id, title: `Question under the agreement at ${width}px`, questionShown: questionShown !== null, agreementBeforeQuestion,
      reviewThisStillVisible: reviewStillVisible, questionInViewport, quickAnswers, quickAnswersUnder44px: quickAnswers.filter(q => q.height < 44).map(q => q.text),
      ariaLivePolite: ariaLive, noHorizontalScroll: noScroll,
      quickAnswerSentAsRealTurn: turnBody ? JSON.parse(turnBody).message : null, realReplyArrived: replied !== null,
      lastRealReply: replies[replies.length - 1]?.slice(0, 300) ?? null, questionReReadAfterTurn: readsAfter > readsBefore });
    await p.close();
  });
}

await journey('Q5', async () => {
  const p = await page(390, 844);
  await firstTurn(p, 'The pump job from the minutes and the quotation');
  const version = await realVersion(p);
  const stop = await serve(p, () => version);
  await refresh(p);
  await p.waitFor(`!!document.querySelector('${CARD} [role=group]')`, 8000);
  // keyboard only: focus "I don't know yet" and press Enter
  await p.evaluate(`[...document.querySelectorAll('${CARD} [role=group] button')].find(b => /know yet/.test(b.innerText)).focus()`);
  const focused = await p.evaluate(`document.activeElement.innerText.trim()`);
  let turnBody = null;
  const turnListener = msg => { if (msg.method === 'Network.requestWillBeSent' && /\/turns$/.test(msg.params.request.url) && msg.params.request.method === 'POST') turnBody = msg.params.request.postData; };
  listeners.push(turnListener);
  await p.s('Network.enable');
  await p.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await p.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await p.waitFor(`false`, 2500);
  listeners.splice(listeners.indexOf(turnListener), 1);
  await stop();
  results.push({ journey: 'Q5', title: 'Keyboard-only quick answer ("I don\'t know yet")', focusedControl: focused,
    sent: turnBody ? JSON.parse(turnBody).message : null });
  await p.close();
});

await journey('Q6', async () => {
  const p = await page();
  await firstTurn(p, 'Just looking around');
  const real = await p.evaluate(`(async () => {
    const rec = JSON.parse(sessionStorage.getItem('securepay.agent.anonymous.v1'));
    const r = await fetch('/api/agent/conversations/' + rec.conversationId + '/agreement-formation', { headers: { 'X-SecurePay-Conversation-Token': rec.secret, Accept: 'application/json' } });
    const body = await r.json();
    return { status: r.status, cache: r.headers.get('cache-control'), stage: body.stage, question: body.question };
  })()`);
  results.push({ journey: 'Q6', title: 'Real endpoint carries the server-planned question (no substitution)', ...real });
  await p.close();
});

await journey('Q7', async () => {
  const p = await page(390, 844);
  await firstTurn(p, 'The pump job from the minutes and the quotation');
  const version = await realVersion(p);
  const stop = await serve(p, () => version, { question: { ask: false, reason: 'REVIEW_READY' } });
  await refresh(p);
  await p.waitFor(`/Your agreement is taking shape/.test(document.body.innerText)`, 8000);
  const card = await p.evaluate(`document.querySelector('${CARD}').innerText`);
  await stop();
  results.push({ journey: 'Q7', title: 'No question planned -> no question card, Review this only', questionCardShown: /One point|One thing to settle/.test(card),
    reviewThis: /Review this/.test(card) });
  await p.close();
});

await journey('Q8', async () => {
  const p = await page();
  await firstTurn(p, 'The pump job from the minutes and the quotation');
  const version = await realVersion(p);
  const stop = await serve(p, () => version);
  await refresh(p);
  await p.waitFor(`/Your agreement is taking shape/.test(document.body.innerText)`, 8000);
  await p.clickText('Review this', `${CARD} button`);
  await p.waitFor(`!!document.getElementById('agreement-review-title')`, 5000);
  await p.clickText('Mark as checked');
  const shown = await p.waitFor(`/Checked by you — still open/.test(document.body.innerText)`, 5000);
  const review = await p.evaluate(`document.querySelector('section[aria-labelledby="agreement-review-title"]').innerText`);
  await stop();
  results.push({ journey: 'Q8', title: 'Checked is not resolved: Review shows it still open', checkedStillOpenShown: shown !== null,
    conflictStillBlocking: /This needs sorting out first/.test(review), rawLeak: /ACKNOWLEDGED|UNRESOLVED|conflict:1|source:x/.test(review) });
  await p.close();
});

await mkdir('build/entry-perfection', { recursive: true });
await writeFile('build/entry-perfection/browser-phase7.json', JSON.stringify({ url: URL_, generatedAt: new Date().toISOString(), results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
ws.close(); chrome.kill();
