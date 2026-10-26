import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const vision=read('src/features/living-workspace/VisionFinancialPossibilities.tsx');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const chooser=read('src/features/living-workspace/MoneyRailCeremony.tsx');
const money=read('src/features/living-workspace/UnifiedMoneyTool.tsx');
const agreement=read('src/features/living-workspace/AgreementDiscovery.tsx');
test('Vision financial possibilities remain in the existing three-column shell',()=>{
 assert.match(shell,/data-workspace-shell/);
 assert.match(shell,/data-workspace-frozen-layout/);
 assert.match(shell,/<VisionFinancialPossibilities\/>/);
 assert.match(shell,/mode==='vision' && <VisionFinancialPossibilities/);
 assert.match(vision,/data-gate-b-vision-money/);
 assert.match(vision,/Money Market Funds/);
 assert.match(vision,/SACCOs/);
 assert.match(vision,/Insurance/);
 assert.match(vision,/no product quote|No product quote/i);
 assert.doesNotMatch(vision,/window\.location|paymentIntent|createAgreement|acceptAgreement|onSaveDream/);
});
test('My Work rails remain provider-returned and grouped by real type, never invented provider',()=>{
 assert.match(chooser,/sample\?examples:options/);
 assert.match(chooser,/Bank settlement rails/);
 assert.match(chooser,/Mobile money rails/);
 assert.match(chooser,/Other returned payment routes/);
 assert.match(chooser,/railFamily\(rail\.displayName,rail\.railCode\)/);
 assert.match(chooser,/disabled=\{!selected\.quoteAvailable\}/);
 assert.match(chooser,/No quotation available for this rail/);
 assert.match(money,/currentUserAgreements/);
 assert.match(money,/Phase7MoneySnapshotReview/);
});
test('Gate B additions transpile as TSX without errors',()=>{
 for(const [path,source] of [['Vision',vision],['Workspace',shell],['Rails',chooser]]){
  const out=ts.transpileModule(source,{fileName:path+'.tsx',reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal(out.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length??0,0,path);
 }
});

test('Active Agreement leads with backend-owned attention and returns to the same KS001 shell',()=>{
 assert.match(agreement,/data-gate-b-active-attention/);
 assert.match(agreement,/current\?\.nextActions/);
 assert.match(agreement,/current\.nextActions\.slice\(0,4\)/);
 assert.match(agreement,/Return to KS001 for help/);
 assert.match(agreement,/onClick=\{closeFull\}/);
 assert.match(agreement,/setTab\('Evidence'\)/);
 assert.match(agreement,/setTab\('Milestones'\)/);
 assert.match(agreement,/setTab\('Money'\)/);
 assert.doesNotMatch(agreement,/createPaymentIntent|payNow|acceptAgreement/);
});
