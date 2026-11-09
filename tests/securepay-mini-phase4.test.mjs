import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const modelSource = read('src/mini/miniFundingSimulator.ts');
const script = ts.transpileModule(modelSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
}).outputText;
const sim = {};
runInNewContext(script, { exports: sim, Object, BigInt, Number, Intl, String, Set });

const rails = sim.MINI_TEST_RAILS;
const transition = sim.miniFundingTestTransition;
const initial = () => ({ ...sim.INITIAL_MINI_FUNDING_TEST });
const act = (state, type, method) => transition(state, method ? {type,method} : {type});

test('three distinct, selectable rail families are present in the simulator', () => {
  assert.deepEqual([...rails].map(x => x.id), ['CHOICE_BANK','MPESA','PESALINK']);
  assert.deepEqual([...rails].map(x => x.name), ['Choice Bank','M-Pesa','PesaLink']);
  assert.ok(rails.every(x => x.detail.toLowerCase().includes('no ') || x.detail.toLowerCase().includes('not ')));
  assert.ok(rails.every(x => typeof x.swDetail === 'string' && x.swDetail.length > 18));
  assert.equal(sim.isMiniTestRail('SACCO'), false);
  assert.equal(sim.isMiniTestRail('CHOICE_BANK'), true);
});

test('draft values are not quotes or authenticated amounts, and invalid amount never initiates', () => {
  assert.equal(sim.miniTestAmount(''), null);
  assert.equal(sim.miniTestAmount('0'), null);
  assert.equal(sim.miniTestAmount('NaN'), null);
  assert.equal(sim.miniTestAmount('-50'), null);
  assert.equal(sim.miniTestAmount('1e3'), null);
  assert.equal(sim.miniTestAmount('12.345'), null);
  assert.equal(sim.miniTestAmount('9999999999999999'), null);
  assert.equal(sim.miniTestAmount('80').minor, 8000);
  assert.equal(sim.miniTestAmount('1,250.50').minor, 125050);
  assert.equal(sim.miniTestAmount('1,250.50').formatted, 'KSh 1,250.5');
});

test('each rail can separately exercise pending, unknown and simulated confirmation without creating a second payment', () => {
  for (const rail of rails) {
    let s=act(initial(),'SELECT_METHOD',rail.id);
    assert.equal(s.method,rail.id);
    s=act(s,'START_ATTEMPT');
    assert.equal(s.status,'AWAITING_FAKE_PROVIDER');
    assert.equal(s.attemptNumber,1);
    s=act(s,'SIMULATE_UNKNOWN');
    assert.equal(s.status,'SIMULATED_UNKNOWN');
    assert.equal(act(s,'START_ATTEMPT'),s,'retry blocked while provider result unknown');
    assert.equal(act(s,'SELECT_METHOD','MPESA'),s,'cannot switch rails during unknown result');
    s=act(s,'RESOLVE_PENDING');
    assert.equal(s.status,'AWAITING_FAKE_PROVIDER');
    s=act(s,'SIMULATE_CONFIRMED');
    assert.equal(s.status,'SIMULATED_CONFIRMED');
    assert.equal(act(s,'START_ATTEMPT'),s);
    assert.equal(act(s,'SIMULATE_FAILED'),s);
    assert.equal(act(s,'SELECT_METHOD','PESALINK'),s);
    const clean=act(s,'RESET');
    assert.equal(clean.method,null);
    assert.equal(clean.attemptNumber,0);
    assert.equal(clean.status,'SELECT_METHOD');
  }
});

test('terminal failed attempt is safe to retry as a newly counted fictional attempt or a changed rail', () => {
  let s=act(initial(),'SELECT_METHOD','MPESA');
  s=act(s,'START_ATTEMPT');
  s=act(s,'SIMULATE_FAILED');
  assert.equal(s.status,'SIMULATED_FAILED');
  s=act(s,'SELECT_METHOD','CHOICE_BANK');
  assert.equal(s.method,'CHOICE_BANK');
  s=act(s,'START_ATTEMPT');
  assert.equal(s.attemptNumber,2);
  assert.equal(s.status,'AWAITING_FAKE_PROVIDER');
  assert.equal(act(s,'START_ATTEMPT'),s,'no duplicate pending attempt');
  assert.equal(act(initial(),'START_ATTEMPT').status,'SELECT_METHOD');
});

test('never infer a real financial state or fee from a demo outcome', () => {
  assert.match(sim.miniFundingTestWords('SIMULATED_CONFIRMED').detail,/NO verified funding, safeguarded allocation or ledger entry/i);
  assert.match(sim.miniFundingTestWords('SIMULATED_UNKNOWN').detail,/never retry blindly/i);
  const model=modelSource;
  const ui=read('src/mini/MiniFundingPreview.tsx');
  assert.match(ui,/SIMULATION ONLY · No real money/);
  assert.match(ui,/SecurePay fee/);
  assert.match(ui,/Provider charge/);
  assert.match(ui,/Not quoted/);
  assert.match(ui,/Not an accepted Agreement/);
  assert.match(ui,/No STK prompt/);
  assert.match(ui,/provider reply/);
  assert.doesNotMatch(model+ui,/createPaymentIntentGateway|createQuote\(|createIntent\(|\.initiate\(|authorization:\s*bearer|fetch\(|postMessage\(/i);
  assert.doesNotMatch(model,/FUNDED_HELD|PAYMENT_READY|SETTLED/);
});

test('Mini funding choice starts only after the owner explicitly reviews a local trade', () => {
  const main=read('src/mini/MiniExperience.tsx');
  assert.match(main,/screen === 'review'/);
  assert.match(main,/onClick=\{\(\) => setScreen\('funding'\)\}/);
  assert.match(main,/screen === 'funding' && <MiniFundingPreview/);
  assert.match(main,/onBack=\{\(\) => setScreen\('review'\)\}/);
  assert.match(main,/Not sent\. Not an agreement\./);
  assert.doesNotMatch(main,/setScreen\('funding'\).*useEffect/);
});

test('a merchant input is a user-entered review, not a source of platform-authorised quote, ledger or provider methods', () => {
  const ui=read('src/mini/MiniFundingPreview.tsx');
  assert.match(ui,/draft\.description/);
  assert.match(ui,/miniTestAmount\(draft\.amount\)/);
  assert.match(ui,/disabled=\{!canStart\}/);
  assert.match(ui,/selected\.detail/);
  assert.match(ui,/not been verified/);
  assert.match(ui,/SecurePayAPI/);
  assert.doesNotMatch(ui,/TR-00[1-9]|charger|tomato|wedding|F01/);
});

test('main three-panel workspace is preserved and test controls stay inside simulator', () => {
  const vite=read('vite.config.ts'),entry=read('mini.html');
  const main=read('src/main.tsx'),simulator=read('src/mini/MiniFundingPreview.tsx');
  assert.match(vite,/main: fileURLToPath\(new URL\('\.\/index\.html'/);
  assert.match(vite,/mini: fileURLToPath\(new URL\('\.\/mini\.html'/);
  assert.match(main,/RuntimeApp\.tsx/);
  assert.match(entry,/src\/mini\/main\.tsx/);
  assert.match(simulator,/<details className="spm-demo-controls">/);
  assert.match(simulator,/role="radiogroup"/);
  assert.match(simulator,/role="radio" aria-checked=\{active\}/);
  assert.match(simulator,/disabled=\{!canSelect \|\| !amount\}/);
});
