import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const model=read('src/features/living-workspace/workspacePurpose.ts');
const welcome=read('src/features/living-workspace/WorkspaceWelcome.tsx');
const guide=read('src/features/living-workspace/WorkspacePurposeGuide.tsx');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const money=read('src/features/living-workspace/UnifiedMoneyTool.tsx');
const runtime=read('src/RuntimeApp.tsx');
const compiled=ts.transpileModule(model,{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const {WORKSPACE_PURPOSES,workspacePurpose} = await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));

test('Gate 5B: four approved purposes remain human and distinct',()=>{
  assert.deepEqual(Object.keys(WORKSPACE_PURPOSES),['vision','circle','community','money']);
  for(const [key,value] of Object.entries(WORKSPACE_PURPOSES)){
    assert.equal(workspacePurpose(key),value);
    for(const prop of ['label','title','intro','belongs','boundary','next'])
      assert.ok(typeof value[prop]==='string'&&value[prop].length>(prop==='label'?2:prop==='title'?12:24),key+'.'+prop);
  }
  assert.match(WORKSPACE_PURPOSES.vision.title,/Imagine what could be possible/);
  assert.match(WORKSPACE_PURPOSES.circle.title,/Decide and work together/);
  assert.match(WORKSPACE_PURPOSES.community.title,/Meet people and find help/);
  assert.match(WORKSPACE_PURPOSES.money.intro,/Money should follow the agreement/);
});

test('Gate 5B: exact human authority distinctions survive source copy',()=>{
  assert.match(WORKSPACE_PURPOSES.vision.boundary,/Dream does not become an Agreement/);
  assert.match(WORKSPACE_PURPOSES.vision.boundary,/deliberately/);
  assert.match(WORKSPACE_PURPOSES.circle.boundary,/not a formal vote/);
  assert.match(WORKSPACE_PURPOSES.circle.boundary,/joining never means accepting/);
  assert.match(WORKSPACE_PURPOSES.community.boundary,/Circle-only/);
  assert.match(WORKSPACE_PURPOSES.money.boundary,/not a provider quote/);
  assert.match(WORKSPACE_PURPOSES.money.next,/separate Money preflight/);
});

test('Gate 5B: approved language appears in real welcome and existing right-hand panel',()=>{
  assert.match(welcome,/workspacePurpose\(area\)/);
  assert.match(welcome,/area==='work'\?null/);
  assert.match(welcome,/examples\[area\]\.map/);
  assert.match(guide,/data-approved-gate5b-purpose=\{area\}/);
  assert.match(guide,/workspacePurpose\(area\)/);
  assert.match(guide,/aria-label=\{guidance\.label\+' purpose and next step'\}/);
  assert.match(guide,/Important boundary/);
  assert.match(guide,/One useful next step/);
  assert.match(guide,/onClick=\{onContinueToWork\}/);
  assert.match(guide,/Opening My Work does not transfer, publish, approve or pay/);
  // Vision has its living summary; Circle retains the purpose guide; Community uses the contextual Check.
  assert.match(shell,/mode!=='work' && mode!=='vision' && mode!=='community' &&/);
  assert.match(shell,/<CommunityCheckPanel/);
  assert.match(shell,/mode==='vision' && <TrueNorthVisionSummary/);
  assert.match(shell,/data-workspace-frozen-layout/);
  assert.match(shell,/data-workspace-shell/);
  assert.match(shell,/aria-label="Living result"/);
});

test('Gate 5B: real gateways, records, Circle and money authority unchanged',()=>{
  for(const snippet of [
    '<LiveKs001Session','<LiveWorkResultPanel','<WorkspaceContinuityPanel',
    '<InlineCommunityHub','<InlineVisionEditor','<InlineCircleBoard',
    '<UnifiedMoneyTool','createFormationController(gateway)',
    "signedIn && workspaceGateways && mode!=='work' && mode!=='community'"
  ])assert.ok(shell.includes(snippet),snippet);
  assert.match(money,/data-testid="compact-money-tool"/);
  assert.match(money,/data-approved-gate5b-money-purpose/);
  assert.match(money,/workspacePurpose\('money'\)/);
  assert.match(money,/gateways\.agreements\.currentUserAgreements/);
  assert.match(money,/onOpenAgreementMoney/);
  assert.match(money,/onOpenMoney/);
  assert.doesNotMatch(model+guide,/fetch\s*\(|createAgentController|createFormationController|localStorage|sessionStorage|approvePayment|releaseFunds|createCircle|openMoneyFor/);
  assert.doesNotMatch(runtime,/feature\/gate5b-approved-four-spaces-integration/);
});

test('Gate 5B: there is no accidental second pseudo-KS001 conversation controller',()=>{
  assert.doesNotMatch(guide,/onAskKs001|sendTurn|send\(|createConversation/);
  assert.doesNotMatch(welcome,/createConversation|createAgentController|sendTurn/);
  assert.doesNotMatch(money,/createFormationController|createAgentController/);
  assert.match(shell,/window\.location\.hash='#\/preview\/living-workspace\/'\+next/);
});

test('Gate 5B: added TypeScript and TSX parse without errors',()=>{
  for(const [file,source,kind] of [
    ['workspacePurpose.ts',model,ts.ScriptKind.TS],
    ['WorkspacePurposeGuide.tsx',guide,ts.ScriptKind.TSX],
    ['WorkspaceWelcome.tsx',welcome,ts.ScriptKind.TSX],
    ['UnifiedMoneyTool.tsx',money,ts.ScriptKind.TSX],
    ['Phase1LivingWorkspacePreview.tsx',shell,ts.ScriptKind.TSX],
  ]){
    const syntax=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,kind);
    assert.deepEqual(syntax.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')),[],file);
  }
});
