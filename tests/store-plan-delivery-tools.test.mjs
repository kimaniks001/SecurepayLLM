import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const buying=read('src/features/living-workspace/StoreBuyingPlan.tsx');
const time=read('src/features/living-workspace/DateTimeTool.tsx');
const sourceTray=read('src/features/living-workspace/UniversalSourceTray.tsx');
const mini=read('src/features/living-workspace/MiniContextInput.tsx');
const stores=read('src/features/living-workspace/StoresTool.tsx');

test('Store buying plan reuses local-only existing mini Places and Date & Time rather than adding a second controller',()=>{
  assert.match(buying,/data-store-plan-delivery-tools/);
  assert.match(buying,/<MiniContextInput kind="place"/);
  assert.match(buying,/<MiniContextInput kind="date"/);
  assert.match(buying,/<UniversalSourceTray tool="Places" area="Buying plan" isDemo=\{true\}/);
  assert.match(buying,/<DateTimeTool context="Store buying plan delivery" isLocalPreview/);
  assert.match(buying,/onChoose=\{async selected=>/);
  assert.match(buying,/compactTimingProposal\(selected\)/);
  assert.match(buying,/patch\('desiredDate',result.text\)/);
  assert.match(buying,/patch\('place',proposal.text\)/);
  assert.match(buying,/Proposed delivery or service timing:/);
  assert.match(buying,/Keep each seller and offer traceable/);
  assert.match(buying,/Money must follow accepted Agreements and provider checks/);
  assert.match(stores,/<StoreBuyingPlan/);
  assert.doesNotMatch(buying,/createAgreement|acceptAgreement|releaseFunds|fetch\s*\(|localStorage|sessionStorage/);
});
test('Explicit user-triggered GPS is optional, ephemeral, permission-bounded and never silently shared',()=>{
  assert.match(buying,/onClick=\{useCurrentGps\}/);
  assert.match(buying,/navigator.geolocation.getCurrentPosition\(/);
  assert.match(buying,/enableHighAccuracy:true,timeout:10000,maximumAge:0/);
  assert.match(buying,/Number.isFinite\(lat\)/);
  assert.match(buying,/Proposed GPS point \(unverified\)/);
  assert.match(buying,/latestDraft.current/);
  assert.match(buying,/not shared with Stores or saved to an Agreement/);
  assert.match(sourceTray,/No automatic GPS collection/);
});
test('The shared Places source supports map, Plus Code and entrance, without verified-GPS claims',()=>{
  assert.match(sourceTray,/Choose location source/);
  assert.match(sourceTray,/From map/);
  assert.match(sourceTray,/Place, address or Plus Code/);
  assert.match(sourceTray,/Delivery entrance/);
  assert.match(sourceTray,/onLocalProposal\?\.\(\{kind:'Places',text:summary\}\)/);
  assert.match(mini,/Address, entrance or Plus Code/);
});
test('Date picker has structured local proposal path; KS001 path remains unchanged',()=>{
  assert.match(time,/onChoose\?: \(draft:TimingDraft\)=>Promise<void>/);
  assert.match(time,/if\(onChoose\)await onChoose\(draft\); else await onPrepare!\(result.text\)/);
  assert.match(time,/Use timing in buying plan/);
  assert.match(time,/Start date/);
  assert.match(time,/End date/);
  assert.match(time,/After an event/);
  assert.match(time,/Time zone:/);
});
test('Proposed date/time formatting is validated, bounded and never an accepted obligation',async()=>{
  const standalone=time.slice(0,time.indexOf("const field =")).replace(/^import[^\n]*\n/gm,'');
  const js=ts.transpileModule(standalone,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const {compactTimingProposal}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  const base={
    mode:'on',purpose:'delivery',freePurpose:'',day:'2026-10-23',time:'15:45',
    until:'',untilTime:'',approximate:'',repeat:'month',weekday:'Friday',monthDay:'5',
    trigger:'',offsetDays:'2',context:'',timeZone:'Africa/Nairobi'
  };
  const on=compactTimingProposal(base);
  assert.equal(on.error,null);
  assert.match(on.text,/on 2026-10-23 at 15:45/);
  assert.match(on.text,/Africa\/Nairobi/);
  assert.match(on.text,/proposed, not agreed/);
  const range=compactTimingProposal({...base,mode:'between',until:'2026-10-25'});
  assert.equal(range.error,null);
  assert.match(range.text,/through 2026-10-25/);
  const conditional=compactTimingProposal({...base,mode:'after',trigger:'seller confirms stock'});
  assert.equal(conditional.error,null);
  assert.match(conditional.text,/after seller confirms stock is verified/);
  const invalid=compactTimingProposal({...base,day:'2026-02-31'});
  assert.match(invalid.error,/real calendar date/);
  const reversed=compactTimingProposal({...base,mode:'between',until:'2026-10-22'});
  assert.match(reversed.error,/end must not be before/);
});
test('Updated buying plan and shared tools remain valid TypeScript and TSX',()=>{
  for(const [file,body] of [['StoreBuyingPlan.tsx',buying],['DateTimeTool.tsx',time]]){
    const ast=ts.createSourceFile(file,body,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    assert.deepEqual(ast.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],file);
  }
});
