import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const picker = read('src/features/living-workspace/DateTimeTool.tsx');
const workspace = read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const sourceMenu = read('src/features/sources/ui/SourceMenu.tsx');
const signedHome = read('src/components/SignedOutHome.tsx');
const home = read('src/components/SignedInHome.tsx');
const ks = read('src/features/agent/AgentExperience.tsx');
const agreement = read('src/features/living-workspace/LiveWorkResultPanel.tsx');
const money = read('src/features/living-workspace/UnifiedMoneyTool.tsx');
const calendar = read('src/components/DatePicker.tsx');

// Execute the REAL TypeScript proposal builder in an isolated, zero-network JS context.
// React and the icon library are stubbed; no component is mounted, and no API is contacted.
const transformed = ts.transpileModule(picker, {
  compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022}
}).outputText;
const runtime = {exports: {}};
vm.runInNewContext(transformed, {
  module: runtime, exports: runtime.exports,
  require: name => name === 'react' ? {useState() { throw Error('UI not mounted'); }} :
    name === 'react/jsx-runtime' ? {jsx() {}, jsxs() {}} :
    name === 'lucide-react' ? {CalendarDays() {}, CheckCircle2() {}} : (()=>{throw Error('unexpected module '+name);})()
}, {timeout: 1000});
const propose = runtime.exports.buildTimingProposal;
const draft = overrides => ({
  mode:'on', purpose:'delivery', freePurpose:'', day:'2026-10-24', time:'10:00',
  until:'', untilTime:'', approximate:'', repeat:'month', weekday:'Friday',
  monthDay:'5', trigger:'', offsetDays:'2', context:'', timeZone:'Africa/Nairobi', ...overrides
});
test('single delivery proposal is a reviewed local time, not a contractual date',()=>{
  const result = propose(draft());
  assert.equal(result.error, null);
  assert.match(result.text, /delivery.*2026-10-24 at 10:00/);
  assert.match(result.text, /Africa\/Nairobi/);
  assert.match(result.text, /not yet an agreed contractual commitment/);
  assert.match(result.text, /Do not assume acceptance/);
});
test('impossible dates, reverse ranges and reverse same-day times cannot be sent',()=>{
  assert.match(propose(draft({day:'2026-02-30'})).error,/real calendar/);
  assert.match(propose(draft({day:'2026-13-10'})).error,/real calendar/);
  assert.match(propose(draft({mode:'between',day:'2026-10-24',until:'2026-10-20'})).error,/end must not/);
  assert.match(propose(draft({mode:'between',day:'2026-10-24',until:'2026-10-24',time:'17:00',untilTime:'08:00'})).error,/end must not/);
});
test('repeated chama contribution is a proposed recurrence with explicit missing rules',()=>{
  const result=propose(draft({mode:'every',purpose:'contribution',repeat:'month',monthDay:'5',time:''}));
  assert.equal(result.error,null);
  assert.match(result.text,/day 5 of every month/);
  assert.match(result.text,/holidays and missed occurrences remain to be agreed/);
  const thirtyFirst=propose(draft({mode:'every',monthDay:'31'}));
  assert.match(thirtyFirst.text,/months without that day/);
  assert.match(propose(draft({mode:'every',monthDay:'0'})).error,/day of the month/);
});
test('inspection-triggered payment is event dependent, not secretly assigned a fixed date',()=>{
  const result=propose(draft({mode:'after',purpose:'other',freePurpose:'final instalment',trigger:'client inspection and acceptance',offsetDays:'2'}));
  assert.equal(result.error,null);
  assert.match(result.text,/after client inspection and acceptance is verified/);
  assert.match(result.text,/no fixed date exists/);
  assert.doesNotMatch(result.text,/2026-10-24/);
  assert.match(propose(draft({mode:'after',trigger:''})).error,/event/);
});
test('typed human uncertainty remains unresolved, not auto interpreted',()=>{
  const result=propose(draft({day:'',time:'',approximate:'next Friday morning'}));
  assert.equal(result.error,null);
  assert.match(result.text,/approximately next Friday morning \(unresolved, confirm interpretation\)/);
});
test('workspace + Add provides eight tools, including Edit context and backend handoff',()=>{
  assert.match(workspace,/name: 'Date & Time'/);
  assert.equal((workspace.match(/\{ name: '[^']+', icon:/g)||[]).length,8);
  assert.match(workspace,/\['Photos','Documents','Places','Date & Time'/);
  assert.match(workspace,/onPrepare=\{mode==='work'/);
  assert.match(workspace,/await liveController.send\(message\)/);
  assert.match(workspace,/result\.pending|outcome\.pending/);
  assert.match(agreement,/Your draft remains here/);
  assert.match(agreement,/<MiniContextInput/);
});
test('canonical Home/KS001 + is one source menu and the picker is actually wired',()=>{
  assert.match(sourceMenu,/key: 'date-time', label: 'Date & Time'/);
  assert.match(signedHome,/onAddDateTime=\{onAddDateTime\}/);
  assert.match(ks,/onAddDateTime=\{\(\) => setDateTimeOpen\(true\)\}/);
  assert.match(ks,/data-phase3-canonical-date-picker/);
  assert.match(ks,/await target.controller.send\(proposal\)/);
  assert.match(ks,/result\.pending \|\| result\.error/);
});
test('one starting input, visible Agreement status and truthful Money labels',()=>{
  assert.doesNotMatch(home,/Start with KS001<\/span>/);
  assert.match(home,/data-optional-quick-starts/);
  const readiness = read('src/features/living-workspace/workspaceReadinessTruth.ts');
  assert.match(agreement,/workspaceReadinessIndicators/);
  assert.match(readiness,/Acceptance not shown/);
  assert.match(readiness,/Not authorised here/);
  assert.match(money,/Review funding/);
  assert.doesNotMatch(money,/Pay this Agreement/);
  assert.match(calendar,/new Date\(\)\.getMonth\(\)/);
  assert.doesNotMatch(calendar,/useState\(9\); \/\/ October 2026/);
});
